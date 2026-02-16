
import React from 'react';
import { 
  LayoutDashboard, 
  ClipboardCheck, 
  History, 
  LogOut, 
  Building2,
  Menu,
  X,
  ShieldAlert
} from 'lucide-react';
import { User } from '../types';

export const UnitaLogo = ({ className = "h-10", light = false }) => (
  <div className={`flex flex-col ${className} justify-center select-none`}>
    <div className="flex items-baseline leading-none">
      <span className={`${light ? 'text-white' : 'text-black'} font-[900] text-4xl tracking-tighter flex items-center relative`} style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>
        unıt
        <span className="relative inline-block">
          a
          <div className="absolute -top-1.5 -right-0.5 w-3.5 h-3.5 bg-[#F05A22] transform -skew-x-12 rotate-[15deg] shadow-sm"></div>
        </span>
      </span>
    </div>
    <div className={`${light ? 'text-white/80' : 'text-black/70'} text-[8px] font-black tracking-[0.55em] mt-1 ml-0.5 uppercase`}>
      ENGENHARIA
    </div>
  </div>
);

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
    { id: 'dashboard', label: 'Painel Geral', icon: LayoutDashboard, roles: ['admin', 'auditor', 'diretoria', 'obra'] },
    { id: 'new-audit', label: 'Nova Inspeção', icon: ClipboardCheck, roles: ['admin', 'auditor'] },
    { id: 'obras', label: 'Canteiros / Obras', icon: Building2, roles: ['admin', 'auditor', 'diretoria'] },
    { id: 'history', label: 'Base de Dados', icon: History, roles: ['admin', 'auditor', 'diretoria'] },
    { id: 'access', label: 'Gestão de Acessos', icon: ShieldAlert, roles: ['admin'] },
  ];

  const allowedMenuItems = menuItems.filter(item => item.roles.includes(user.perfil));

  const handleNav = (id: string) => {
    onPageChange(id);
    setMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      {/* Mobile Header */}
      <div className="md:hidden bg-white text-slate-900 p-6 flex justify-between items-center sticky top-0 z-50 border-b-4 border-[#F05A22] shadow-sm">
        <UnitaLogo className="scale-75 origin-left" />
        <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="p-3 bg-slate-100 rounded-2xl border-2 border-slate-200">
          {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Sidebar */}
      <aside className={`
        fixed md:sticky top-0 inset-y-0 left-0 z-[150]
        w-72 bg-white text-slate-900 transform transition-transform duration-300 ease-in-out
        ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} 
        md:translate-x-0 flex flex-col h-screen border-r-4 border-slate-900
      `}>
        <div className="p-10 hidden md:block border-b-4 border-slate-100">
          <UnitaLogo className="h-12" />
        </div>

        <nav className="flex-1 mt-8 px-6 space-y-4 overflow-y-auto">
          {allowedMenuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleNav(item.id)}
              className={`
                w-full flex items-center gap-4 px-6 py-5 rounded-[1.5rem] transition-all font-black uppercase text-xs tracking-widest border-2
                ${currentPage === item.id 
                  ? 'bg-slate-900 text-white border-slate-900 shadow-[6px_6px_0px_0px_rgba(240,90,34,1)] translate-x-1' 
                  : 'text-slate-500 bg-white border-transparent hover:bg-slate-50 hover:text-slate-900 hover:border-slate-200'}
              `}
            >
              <item.icon size={22} className={currentPage === item.id ? 'text-[#F05A22]' : 'text-slate-400'} />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-8 bg-slate-50 border-t-4 border-slate-100">
          <div className="flex items-center gap-4 mb-8 px-2">
            <div className="w-14 h-14 rounded-2xl bg-[#F05A22] flex items-center justify-center font-black text-white shadow-lg border-2 border-slate-900">
              {user.nome.charAt(0)}
            </div>
            <div className="flex flex-col overflow-hidden">
              <span className="text-sm font-black truncate text-slate-900 uppercase tracking-tight">{user.nome}</span>
              <span className="text-[10px] text-[#F05A22] font-black uppercase tracking-widest leading-none">{user.perfil}</span>
            </div>
          </div>
          <button 
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-3 px-6 py-4 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-2xl transition-all font-black uppercase text-[10px] tracking-widest border-2 border-slate-200"
          >
            <LogOut size={18} />
            Deslogar
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-x-hidden print:bg-white">
        <div className="p-6 md:p-12 max-w-7xl mx-auto print:p-0">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;
