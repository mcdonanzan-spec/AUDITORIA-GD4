
import React from 'react';
import Layout from './components/Layout';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import AuditWizard from './components/AuditWizard';
import AuditResult from './components/AuditResult';
import AuditHistory from './components/AuditHistory';
import ObrasManagement from './components/ObrasManagement';
import { User, Audit, Obra, AIAnalysisResult } from './types';
import { getAudits, getObras, saveAudit } from './services/mockDb';

const App: React.FC = () => {
  const [user, setUser] = React.useState<User | null>(null);
  const [currentPage, setCurrentPage] = React.useState('dashboard');
  const [audits, setAudits] = React.useState<Audit[]>([]);
  const [obras, setObras] = React.useState<Obra[]>([]);
  const [lastResult, setLastResult] = React.useState<{ audit: Audit; report: AIAnalysisResult } | null>(null);
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

  const handleLogin = (email: string) => {
    // Mock de perfis conforme solicitado
    let perfil: any = 'auditor';
    if (email.includes('admin')) perfil = 'admin';
    if (email.includes('diretoria')) perfil = 'diretoria';
    if (email.includes('obra')) perfil = 'obra';

    setUser({
      id: 'user-' + Date.now(),
      nome: email.split('@')[0].toUpperCase(),
      email: email,
      perfil: perfil
    });
  };

  const handleLogout = () => {
    setUser(null);
    setCurrentPage('dashboard');
  };

  const handleAuditComplete = async (audit: Audit, report: AIAnalysisResult) => {
    const saved = await saveAudit(audit);
    setAudits(prev => [saved, ...prev]);
    setLastResult({ audit: saved, report });
    setCurrentPage('result');
  };

  const handleObraAdded = (obra: Obra) => {
    setObras(prev => [obra, ...prev]);
  };

  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center">
        <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-slate-500 font-bold uppercase tracking-widest text-xs">Iniciando Governança...</p>
      </div>
    );
  }

  const renderContent = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard audits={audits} obras={obras} onNavigate={setCurrentPage} />;
      case 'new-audit':
        return <AuditWizard obras={obras} currentUser={user} onAuditComplete={handleAuditComplete} />;
      case 'obras':
        return <ObrasManagement obras={obras} onObraAdded={handleObraAdded} />;
      case 'result':
        return lastResult ? (
          <AuditResult 
            audit={lastResult.audit} 
            report={lastResult.report} 
            onClose={() => setCurrentPage('dashboard')} 
          />
        ) : <Dashboard audits={audits} obras={obras} onNavigate={setCurrentPage} />;
      case 'history':
        return <AuditHistory audits={audits} obras={obras} />;
      default:
        return <Dashboard audits={audits} obras={obras} onNavigate={setCurrentPage} />;
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
