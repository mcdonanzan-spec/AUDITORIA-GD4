
import React from 'react';
import Layout from './components/Layout';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import AuditWizard from './components/AuditWizard';
import AuditResult from './components/AuditResult';
import AuditHistory from './components/AuditHistory';
import { User, Audit, Obra, AIAnalysisResult } from './types';
import { getAudits, getObras, saveAudit } from './services/mockDb';

const App: React.FC = () => {
  const [user, setUser] = React.useState<User | null>(null);
  const [currentPage, setCurrentPage] = React.useState('dashboard');
  const [audits, setAudits] = React.useState<Audit[]>([]);
  const [obras, setObras] = React.useState<Obra[]>([]);
  const [lastResult, setLastResult] = React.useState<{ audit: Audit; report: AIAnalysisResult } | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const init = async () => {
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
    init();
  }, []);

  const handleLogin = (email: string) => {
    setUser({
      id: 'user-1',
      nome: 'Ricardo Auditor Senior',
      email: email,
      perfil: 'admin'
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

  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-slate-500 font-medium">Carregando governança...</p>
        </div>
      </div>
    );
  }

  const renderContent = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard audits={audits} obras={obras} />;
      case 'new-audit':
        return <AuditWizard obras={obras} currentUser={user} onAuditComplete={handleAuditComplete} />;
      case 'result':
        return lastResult ? (
          <AuditResult 
            audit={lastResult.audit} 
            report={lastResult.report} 
            onClose={() => setCurrentPage('dashboard')} 
          />
        ) : <Dashboard audits={audits} obras={obras} />;
      case 'history':
        return <AuditHistory audits={audits} obras={obras} />;
      default:
        return <Dashboard audits={audits} obras={obras} />;
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
