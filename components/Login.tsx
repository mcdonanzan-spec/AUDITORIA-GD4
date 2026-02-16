
import React from 'react';
import { Mail, Lock, Loader2, ShieldCheck, ChevronRight, User as UserIcon } from 'lucide-react';
import { UnitaLogo } from './Layout';
import { UserRole } from '../types';

interface LoginProps {
  onLogin: (email: string, role: UserRole) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [email, setEmail] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [showDirectAccess, setShowDirectAccess] = React.useState(true);

  const handleProfileLogin = (role: UserRole) => {
    setLoading(true);
    const mockEmail = `${role}@unita.eng.br`;
    setTimeout(() => {
      onLogin(mockEmail, role);
    }, 1000);
  };

  const profiles = [
    { role: 'auditor' as UserRole, label: 'Auditores / Compliance', desc: 'Realizar inspeções e gerar laudos' },
    { role: 'diretoria' as UserRole, label: 'Diretoria Executiva', desc: 'Visão macro e exposição financeira' },
    { role: 'obra' as UserRole, label: 'Engenheiro de Obra', desc: 'Acompanhar status e planos de ação' },
    { role: 'admin' as UserRole, label: 'Administrador', desc: 'Gestão de usuários e canteiros' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Elementos decorativos de fundo */}
      <div className="absolute top-0 right-0 w-1/3 h-full bg-slate-900 -skew-x-12 translate-x-1/2 z-0"></div>
      
      <div className="max-w-4xl w-full grid grid-cols-1 lg:grid-cols-2 bg-white rounded-[3rem] shadow-[24px_24px_0px_0px_rgba(15,23,42,1)] border-4 border-slate-900 z-10 overflow-hidden animate-in zoom-in-95 duration-500">
        
        {/* Coluna de Branding */}
        <div className="p-12 lg:p-16 flex flex-col justify-between bg-white border-r-4 border-slate-900">
          <div className="space-y-8">
            <UnitaLogo className="h-16" />
            <div className="space-y-4">
              <h1 className="text-5xl font-black text-slate-900 tracking-tighter uppercase leading-none">
                Audit<span className="text-[#F05A22]">Risk</span>
              </h1>
              <div className="h-2 w-20 bg-[#F05A22] rounded-full"></div>
              <p className="text-slate-500 font-bold text-xs uppercase tracking-[0.2em] leading-relaxed">
                Plataforma de Governança Digital<br/>e Controle de Terceiros.
              </p>
            </div>
          </div>
          
          <div className="pt-12">
            <div className="flex items-center gap-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">
              <ShieldCheck className="text-emerald-500" size={18} />
              Ambiente Seguro Unità Engenharia
            </div>
          </div>
        </div>

        {/* Coluna de Acesso */}
        <div className="p-12 lg:p-16 bg-slate-50 flex flex-col justify-center">
          <div className="space-y-8">
            <div className="space-y-2">
              <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">Portal de Acesso</h2>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Selecione seu perfil corporativo</p>
            </div>

            <div className="space-y-4">
              {profiles.map((p) => (
                <button
                  key={p.role}
                  disabled={loading}
                  onClick={() => handleProfileLogin(p.role)}
                  className="w-full group flex items-center justify-between p-6 bg-white border-4 border-slate-100 rounded-2xl hover:border-slate-900 hover:shadow-[6px_6px_0px_0px_rgba(240,90,34,1)] transition-all text-left disabled:opacity-50"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center text-slate-300 group-hover:bg-[#F05A22] group-hover:text-white transition-all border-2 border-transparent group-hover:border-slate-900">
                      <UserIcon size={24} />
                    </div>
                    <div>
                      <p className="font-black text-slate-900 uppercase text-xs tracking-tight">{p.label}</p>
                      <p className="text-[9px] font-bold text-slate-400 uppercase">{p.desc}</p>
                    </div>
                  </div>
                  <ChevronRight size={20} className="text-slate-200 group-hover:text-slate-900 group-hover:translate-x-1 transition-all" />
                </button>
              ))}
            </div>

            <div className="pt-4 text-center">
              <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest leading-relaxed">
                Uso restrito. Acesso monitorado por IP e CPF.<br/>
                Tecnologia Unità S.A. © 2026
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
