
import React from 'react';
import Layout from './components/Layout';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import AuditWizard from './components/AuditWizard';
import AuditResult from './components/AuditResult';
import AuditHistory from './components/AuditHistory';
import ObrasManagement from './components/ObrasManagement';
import UserManagement from './components/UserManagement';
import { User, Audit, Obra, AIAnalysisResult, UserRole } from './types';
import { getAudits, getObras, saveAudit, getUsers } from './services/mockDb';

const App: React.FC = () => {
  const [user, setUser] = React.useState<User | null>(null);
  const [currentPage, setCurrentPage] = React.useState('dashboard');
  const [audits, setAudits] = React.useState<Audit[]>([]);
  const [obras, setObras] = React.useState<Obra[]>([]);
  const [viewingAudit, setViewingAudit] = React.useState<{ audit: Audit; report: AIAnalysisResult } | null>(null);
  const [loading, setLoading] = React.useState(true);

  const fetchData = async () => {
    try {
      const [fetchedAudits, fetchedObras] = await Promise.all([
        getAudits(),
        getObras()
      ]);
      setAudits(fetchedAudits);
      setObras(fetchedObras);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchData();
  }, []);

  const handleLogin = (authenticatedUser: User) => {
    setUser(authenticatedUser);
  };

  const handleLogout = () => {
    setUser(null);
    setCurrentPage('dashboard');
    setViewingAudit(null);
  };

  const handleAuditComplete = async (audit: Audit, report: AIAnalysisResult) => {
    const saved = await saveAudit(audit);
    setAudits(prev => [saved, ...prev]);
    setViewingAudit({ audit: saved, report });
    setCurrentPage('result');
  };

  const handleViewAudit = (audit: Audit) => {
    const mockReport: AIAnalysisResult = {
      indiceGeral: audit.indice_geral || 0,
      classificacao: audit.classificacao || 'N/A',
      riscoJuridico: audit.risco_juridico || 'N/A',
      exposicaoFinanceira: 0,
      naoConformidades: ["Histórico de auditoria carregado."],
      impactoJuridico: "Análise histórica consolidada.",
      recomendacoes: ["Revisar pontos críticos da última medição."],
      conclusaoExecutiva: "Esta é uma visualização de histórico. Os detalhes completos estão arquivados no GD4.",
      detalhamentoCalculo: []
    };
    setViewingAudit({ audit, report: mockReport });
    setCurrentPage('result');
  };

  const handleObraAdded = (obra: Obra) => {
    setObras(prev => [obra, ...prev]);
  };

  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  // LÓGICA DE FILTRAGEM DE SEGURANÇA POR ESCOPO
  const isGlobal = ['admin', 'auditor', 'diretoria'].includes(user.perfil);
  
  const filteredObras = isGlobal 
    ? obras 
    : obras.filter(o => user.obra_ids?.includes(o.id));

  const filteredAudits = isGlobal
    ? audits
    : audits.filter(a => user.obra_ids?.includes(a.obra_id));

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center">
        <div className="w-12 h-12 border-4 border-[#F05A22] border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-slate-500 font-bold uppercase tracking-widest text-xs">Sincronizando Escopo de Acesso...</p>
      </div>
    );
  }

  const renderContent = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard audits={filteredAudits} obras={filteredObras} onNavigate={setCurrentPage} user={user} />;
      case 'new-audit':
        return <AuditWizard obras={filteredObras} currentUser={user} onAuditComplete={handleAuditComplete} onNavigate={setCurrentPage} />;
      case 'obras':
        return <ObrasManagement obras={filteredObras} audits={filteredAudits} onObraAdded={handleObraAdded} onSelectAudit={handleViewAudit} onNavigate={setCurrentPage} />;
      case 'result':
        return viewingAudit ? (
          <AuditResult 
            audit={viewingAudit.audit} 
            report={viewingAudit.report} 
            obraName={obras.find(o => o.id === viewingAudit.audit.obra_id)?.nome || viewingAudit.audit.obra_id}
            onClose={() => setCurrentPage('dashboard')} 
          />
        ) : <Dashboard audits={filteredAudits} obras={filteredObras} onNavigate={setCurrentPage} user={user} />;
      case 'history':
        return <AuditHistory audits={filteredAudits} obras={filteredObras} onSelectAudit={handleViewAudit} onNavigate={setCurrentPage} />;
      case 'access':
        return <UserManagement obras={obras} onNavigate={setCurrentPage} />;
      default:
        return <Dashboard audits={filteredAudits} obras={filteredObras} onNavigate={setCurrentPage} user={user} />;
    }
  };

  return (
    <Layout 
      user={user} 
      onLogout={handleLogout} 
      currentPage={currentPage} 
      onPageChange={setCurrentPage}
    >
      {renderContent()}
    </Layout>
  );
};

export default App;
