
import React from 'react';
import { Mail, Lock, Loader2, ShieldCheck } from 'lucide-react';
import { UnitaLogo } from './Layout';

interface LoginProps {
  onLogin: (email: string) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [email, setEmail] = React.useState('diretoria@unita.eng.br');
  const [password, setPassword] = React.useState('********');
  const [loading, setLoading] = React.useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      onLogin(email);
    }, 1200);
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Decorative Element */}
      <div className="absolute top-0 right-0 w-1/2 h-full bg-slate-900 -skew-x-12 translate-x-1/4 z-0 hidden lg:block"></div>
      
      <div className="max-w-md w-full space-y-10 bg-white p-10 md:p-14 rounded-[3rem] shadow-[20px_20px_0px_0px_rgba(15,23,42,1)] border-4 border-slate-900 z-10 animate-in zoom-in-95 duration-500">
        <div className="text-center space-y-8">
          <div className="flex justify-center scale-125 mb-4">
            <UnitaLogo className="h-16" />
          </div>
          <div className="space-y-2">
            <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase">AuditRisk</h1>
            <div className="h-1.5 w-20 bg-[#F05A22] mx-auto rounded-full"></div>
            <p className="text-slate-500 font-black text-[10px] uppercase tracking-[0.3em] mt-4">Sistema de Governança Digital</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="space-y-6">
            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">E-mail Corporativo</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
                <input 
                  type="email" 
                  required
                  className="w-full bg-slate-50 border-4 border-slate-100 rounded-2xl pl-12 pr-4 py-5 focus:border-slate-900 focus:outline-none transition-all font-black text-slate-900"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Senha de Acesso</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
                <input 
                  type="password" 
                  required
                  className="w-full bg-slate-50 border-4 border-slate-100 rounded-2xl pl-12 pr-4 py-5 focus:border-slate-900 focus:outline-none transition-all font-black text-slate-900"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>
          </div>

          <button 
            type="submit"
            disabled={loading}
            className="w-full bg-slate-900 text-white py-6 rounded-2xl font-black text-sm uppercase tracking-[0.2em] hover:bg-[#F05A22] transition-all flex items-center justify-center gap-3 shadow-[0_8px_0_0_rgb(0,0,0)] active:translate-y-1 active:shadow-none border-4 border-slate-900"
          >
            {loading ? <Loader2 className="animate-spin" size={24} /> : (
              <>
                Entrar no Sistema
                <ShieldCheck size={20} />
              </>
            )}
          </button>
        </form>

        <p className="text-center text-[9px] font-black text-slate-400 uppercase tracking-widest leading-relaxed">
          Acesso restrito Unità Engenharia S.A.<br/>
          Tecnologia AuditRisk v2.5
        </p>
      </div>
    </div>
  );
};

export default Login;
