
import React from 'react';
import Layout from './components/Layout';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import AuditWizard from './components/AuditWizard';
import AuditResult from './components/AuditResult';
import AuditHistory from './components/AuditHistory';
import ObrasManagement from './components/ObrasManagement';
import UserManagement from './components/UserManagement';
import UserGuide from './components/UserGuide';
import { User, Audit, Obra, AIAnalysisResult, UserRole } from './types';
import { getAudits, getObras, saveAudit, getUsers } from './services/supabase';

const App: React.FC = () => {
  const [user, setUser] = React.useState<User | null>(null);
  const [currentPage, setCurrentPage] = React.useState('dashboard');
  const [audits, setAudits] = React.useState<Audit[]>([]);
  const [obras, setObras] = React.useState<Obra[]>([]);
  const [viewingAudit, setViewingAudit] = React.useState<{ audit: Audit; report: AIAnalysisResult } | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [configError, setConfigError] = React.useState(false);

  const fetchData = async () => {
    if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
      setConfigError(true);
      setLoading(false);
      return;
    }
    try {
      const [fetchedAudits, fetchedObras] = await Promise.all([
        getAudits(),
        getObras()
      ]);
      
      // Hidratamos as auditorias com os dados salvos no JSON do relatório
      const hydratedAudits = fetchedAudits.map(audit => {
        if (audit.relatorio_ia) {
          try {
            const reportData = JSON.parse(audit.relatorio_ia);
            return {
              ...audit,
              respostas: audit.respostas || reportData.respostas_raw || [],
              entrevistas: audit.entrevistas || reportData.entrevistas_raw || [],
              equipe_campo: audit.equipe_campo || reportData.equipe_campo_raw || 0,
              equipe_gd4: audit.equipe_gd4 || reportData.equipe_gd4_raw || 0,
              subcontratacao_identificada: audit.subcontratacao_identificada || reportData.subcontratacao_identificada_raw || false,
              classificacao: audit.classificacao || reportData.classificacao_raw || reportData.classificacao || 'N/A',
            };
          } catch (e) {
            return audit;
          }
        }
        return audit;
      });

      setAudits(hydratedAudits);
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

  const handleAuditComplete = (audit: Audit, report: AIAnalysisResult) => {
    setAudits(prev => [audit, ...prev]);
    setViewingAudit({ audit, report });
    setCurrentPage('result');
  };

  const handleViewAudit = (audit: Audit) => {
    // Se o relatório já estiver salvo na auditoria, usamos ele
    // Caso contrário, criamos um resumo básico dos dados salvos
    const report: AIAnalysisResult = audit.relatorio_ia ? JSON.parse(audit.relatorio_ia) : {
      indiceGeral: audit.indice_geral || 0,
      classificacao: audit.classificacao || 'N/A',
      riscoJuridico: audit.risco_juridico || 'N/A',
      exposicaoFinanceira: 0,
      naoConformidades: ["Relatório detalhado não disponível para esta auditoria histórica."],
      impactoJuridico: "Análise baseada nos registros de conformidade salvos.",
      recomendacoes: ["Revisar os dados de campo no histórico."],
      conclusaoExecutiva: "Esta auditoria foi realizada antes da implementação do motor de IA ou o relatório não foi processado.",
      detalhamentoCalculo: []
    };
    setViewingAudit({ audit, report });
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

  if (configError) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-8 text-center">
        <div className="bg-white p-8 rounded-2xl shadow-xl border border-red-100 max-w-md">
          <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Configuração Incompleta</h2>
          <p className="text-slate-600 mb-6">
            As chaves do Supabase não foram encontradas nas variáveis de ambiente.
          </p>
          <div className="bg-slate-50 p-4 rounded-lg text-left text-sm font-mono text-slate-700 mb-6">
            VITE_SUPABASE_URL<br/>
            VITE_SUPABASE_ANON_KEY
          </div>
          <p className="text-xs text-slate-400">
            Configure estas variáveis no painel da Vercel (Settings &gt; Environment Variables) e faça um novo deploy.
          </p>
        </div>
      </div>
    );
  }

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
      case 'guide':
        return <UserGuide onNavigate={setCurrentPage} />;
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
