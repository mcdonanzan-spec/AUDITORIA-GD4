
import React from 'react';
import { ShieldCheck, Mail, Lock, Loader2 } from 'lucide-react';

interface LoginProps {
  onLogin: (email: string) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [email, setEmail] = React.useState('admin@auditrisk.com.br');
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
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8 bg-white p-8 md:p-12 rounded-3xl shadow-2xl animate-in zoom-in-95 duration-500">
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center">
              <ShieldCheck className="text-emerald-600" size={36} />
            </div>
          </div>
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">AuditRisk</h1>
            <p className="text-slate-500 text-sm mt-2">Plataforma de Governança e Compliance</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">E-mail Corporativo</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                <input 
                  type="email" 
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-3 focus:ring-2 focus:ring-emerald-500 focus:outline-none transition-all"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Senha</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                <input 
                  type="password" 
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-3 focus:ring-2 focus:ring-emerald-500 focus:outline-none transition-all"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <input type="checkbox" id="remember" className="rounded text-emerald-600 focus:ring-emerald-500" defaultChecked />
              <label htmlFor="remember" className="text-sm text-slate-500">Lembrar acesso</label>
            </div>
            <button type="button" className="text-sm font-bold text-emerald-600 hover:text-emerald-700">Esqueci a senha</button>
          </div>

          <button 
            type="submit"
            disabled={loading}
            className="w-full bg-slate-900 text-white py-4 rounded-xl font-bold hover:bg-slate-800 transition-all flex items-center justify-center gap-2 shadow-lg disabled:opacity-70"
          >
            {loading ? <Loader2 className="animate-spin" size={20} /> : 'Acessar Plataforma'}
          </button>
        </form>

        <p className="text-center text-xs text-slate-400">
          Uso restrito a colaboradores autorizados.<br/>
          © 2024 AuditRisk Technology.
        </p>
      </div>
    </div>
  );
};

export default Login;
