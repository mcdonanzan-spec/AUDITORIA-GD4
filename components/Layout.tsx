
import React from 'react';
import { 
  LayoutDashboard, 
  ClipboardCheck, 
  History, 
  LogOut, 
  Building2,
  ShieldCheck,
  Menu,
  X
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
    { id: 'obras', label: 'Gestão de Unidades', icon: Building2, roles: ['admin', 'auditor'] },
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
      <div className="md:hidden bg-white text-slate-900 p-4 flex justify-between items-center sticky top-0 z-50 border-b-4 border-orange-500">
        <div className="flex items-center gap-2">
          <img src="https://media.licdn.com/dms/image/v2/C4D0BAQG0xY-vG-vG-A/company-logo_200_200/company-logo_200_200/0/1630571618367/unit_engenharia_logo?e=2147483647&v=beta&t=4Y6l9B7x8z5P0m1_z4Y6l9B7x8z5P0m1_z" alt="Unità" className="h-10" />
          <span className="font-black uppercase tracking-tighter text-slate-900">AuditRisk</span>
        </div>
        <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
          {mobileMenuOpen ? <X /> : <Menu />}
        </button>
      </div>

      {/* Sidebar */}
      <aside className={`
        fixed md:sticky top-0 inset-y-0 left-0 z-40
        w-72 bg-slate-900 text-white transform transition-transform duration-300 ease-in-out
        ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} 
        md:translate-x-0 flex flex-col h-screen border-r-4 border-orange-600
      `}>
        <div className="p-8 hidden md:block">
          <img 
            src="https://media.licdn.com/dms/image/v2/C4D0BAQG0xY-vG-vG-A/company-logo_200_200/company-logo_200_200/0/1630571618367/unit_engenharia_logo?e=2147483647&v=beta&t=4Y6l9B7x8z5P0m1_z4Y6l9B7x8z5P0m1_z" 
            alt="Unità Engenharia" 
            className="h-16 mb-4 filter brightness-0 invert" 
          />
          <div className="flex flex-col border-l-4 border-orange-500 pl-4 mt-6">
            <span className="font-black text-2xl tracking-tighter leading-none uppercase">AuditRisk</span>
            <span className="text-[10px] text-orange-400 font-black uppercase tracking-[0.2em] mt-2">Governança Unità</span>
          </div>
        </div>

        <nav className="flex-1 mt-6 px-6 space-y-2">
          {allowedMenuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleNav(item.id)}
              className={`
                w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all font-black uppercase text-xs tracking-widest
                ${currentPage === item.id 
                  ? 'bg-orange-600 text-white shadow-xl shadow-orange-900/40 translate-x-2' 
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'}
              `}
            >
              <item.icon size={20} className={currentPage === item.id ? 'text-white' : 'text-orange-500'} />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-6 bg-slate-950">
          <div className="flex items-center gap-4 mb-6 px-2">
            <div className="w-12 h-12 rounded-2xl bg-orange-600 flex items-center justify-center font-black text-white shadow-lg border-2 border-orange-400">
              {user.nome.charAt(0)}
            </div>
            <div className="flex flex-col overflow-hidden">
              <span className="text-sm font-black truncate text-white uppercase tracking-tight">{user.nome}</span>
              <span className="text-[10px] text-orange-500 font-black uppercase tracking-widest">{user.perfil}</span>
            </div>
          </div>
          <button 
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-5 py-3 text-slate-400 hover:text-white hover:bg-rose-600/20 rounded-xl transition-all font-black uppercase text-[10px] tracking-widest border border-slate-800"
          >
            <LogOut size={16} />
            Desconectar
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-x-hidden">
        <div className="p-6 md:p-12 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;
