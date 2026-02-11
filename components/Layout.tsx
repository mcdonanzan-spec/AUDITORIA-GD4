
import React from 'react';
import { 
  LayoutDashboard, 
  ClipboardCheck, 
  History, 
  LogOut, 
  Building2,
  ShieldCheck,
  Menu,
  X,
  PlusCircle
} from 'lucide-react';
import { User } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  user: User;
  onLogout: () => void;
  currentPage: string;
  onPageChange: (page: string) => void;
}

const Layout: React.FC<LayoutProps> = ({ children, user, onLogout, currentPage, onPageChange }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['admin', 'auditor', 'diretoria', 'obra'] },
    { id: 'new-audit', label: 'Nova Auditoria', icon: ClipboardCheck, roles: ['admin', 'auditor'] },
    { id: 'obras', label: 'Gestão de Obras', icon: Building2, roles: ['admin', 'auditor'] },
    { id: 'history', label: 'Histórico', icon: History, roles: ['admin', 'auditor', 'diretoria'] },
  ];

  const allowedMenuItems = menuItems.filter(item => item.roles.includes(user.perfil));

  const handleNav = (id: string) => {
    onPageChange(id);
    setMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      {/* Mobile Header */}
      <div className="md:hidden bg-slate-900 text-white p-4 flex justify-between items-center sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <ShieldCheck className="text-emerald-400" size={24} />
          <span className="font-bold tracking-tight">AuditRisk</span>
        </div>
        <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
          {mobileMenuOpen ? <X /> : <Menu />}
        </button>
      </div>

      {/* Sidebar */}
      <aside className={`
        fixed md:sticky top-0 inset-y-0 left-0 z-40
        w-64 bg-slate-900 text-white transform transition-transform duration-300 ease-in-out
        ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} 
        md:translate-x-0 flex flex-col h-screen
      `}>
        <div className="p-6 hidden md:flex items-center gap-3">
          <ShieldCheck className="text-emerald-400" size={32} />
          <div className="flex flex-col">
            <span className="font-bold text-lg tracking-tight leading-none">AuditRisk</span>
            <span className="text-[10px] text-slate-400 uppercase tracking-widest mt-1">Governança Digital</span>
          </div>
        </div>

        <nav className="flex-1 mt-6 px-4 space-y-1">
          {allowedMenuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleNav(item.id)}
              className={`
                w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all
                ${currentPage === item.id 
                  ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/20' 
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'}
              `}
            >
              <item.icon size={20} />
              <span className="font-medium text-sm">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-800">
          <div className="flex items-center gap-3 mb-4 px-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center font-bold text-white shadow-inner">
              {user.nome.charAt(0)}
            </div>
            <div className="flex flex-col overflow-hidden">
              <span className="text-sm font-semibold truncate">{user.nome}</span>
              <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">{user.perfil}</span>
            </div>
          </div>
          <button 
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-4 py-2 text-slate-400 hover:text-rose-400 hover:bg-rose-400/10 rounded-lg transition-colors"
          >
            <LogOut size={18} />
            <span className="text-sm">Sair do Sistema</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-x-hidden">
        <div className="p-4 md:p-8 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;
