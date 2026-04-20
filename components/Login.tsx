
// v1.0.1 - Atualização de logs de erro e fluxo de acesso
import React from 'react';
import { Mail, Lock, Loader2, ShieldCheck, ChevronRight, User as UserIcon, Send, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { UnitaLogo } from './Layout';
import { UserRole, User } from '../types';
import { getUsers, createUserRequest, getUserByEmail } from '../services/supabase';

interface LoginProps {
  onLogin: (user: User) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [email, setEmail] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [view, setView] = React.useState<'initial' | 'request' | 'pending'>('initial');
  const [requestName, setRequestName] = React.useState('');
  const [requestProfile, setRequestProfile] = React.useState<UserRole>('obra');
  const [error, setError] = React.useState<string | null>(null);

  const handleInitialSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setLoading(true);
    setError(null);
    try {
      const normalizedEmail = email.toLowerCase().trim();
      console.log('Verificando acesso para:', normalizedEmail);
      const existingUser = await getUserByEmail(normalizedEmail);

      setTimeout(() => {
        setLoading(false);
        if (existingUser) {
          console.log('Usuário encontrado:', existingUser.status);
          if (existingUser.status === 'pendente') {
            setView('pending');
          } else {
            onLogin(existingUser);
          }
        } else {
          console.log('Usuário não encontrado, redirecionando para solicitação.');
          setView('request');
        }
      }, 500);
    } catch (err: any) {
      console.error('Erro ao conectar ao banco de dados:', err);
      setError(`Erro ao conectar ao banco de dados: ${err.message || 'Erro desconhecido'}`);
      setLoading(false);
    }
  };

  const handleRequestAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    // Check if Supabase is configured
    if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
      setError('Erro de Configuração: As chaves do Supabase não foram encontradas. Verifique as Environment Variables.');
      return;
    }

    setLoading(true);
    console.log('Iniciando solicitação de acesso para:', email);
    
    // Safety timeout to prevent infinite loading
    const timeoutId = setTimeout(() => {
      setLoading(false);
      setError('A conexão com o banco de dados expirou (Timeout). Verifique sua conexão ou se o banco está ativo.');
    }, 12000);

    try {
      const normalizedEmail = email.toLowerCase().trim();
      
      console.log('Verificando se usuário já existe...');
      const existingUser = await getUserByEmail(normalizedEmail);
      if (existingUser) {
        clearTimeout(timeoutId);
        console.warn('Usuário já existe:', normalizedEmail);
        setError('Este e-mail já possui uma solicitação ou cadastro ativo.');
        setLoading(false);
        return;
      }

      const userData = {
        nome: requestName.trim().toUpperCase(),
        email: normalizedEmail,
        perfil: requestProfile,
        status: 'pendente' as const,
        obra_ids: []
      };

      console.log('Enviando dados para o Supabase:', userData);
      await createUserRequest(userData);
      
      clearTimeout(timeoutId);
      console.log('Solicitação enviada com sucesso!');
      setLoading(false);
      setView('pending');
    } catch (err: any) {
      clearTimeout(timeoutId);
      console.error('Erro ao processar solicitação:', err);
      const errorMsg = err.message || 'Erro desconhecido';
      
      if (errorMsg.includes('PGRST301') || errorMsg.includes('JWT')) {
        setError('Erro de Permissão (RLS): O banco de dados recusou a gravação. Verifique as políticas de segurança.');
      } else {
        setError(`Erro ao solicitar acesso: ${errorMsg}`);
      }
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-1/3 h-full bg-slate-900 -skew-x-12 translate-x-1/2 z-0"></div>
      
      <div className="max-w-4xl w-full grid grid-cols-1 lg:grid-cols-2 bg-white rounded-[3rem] shadow-[24px_24px_0px_0px_rgba(15,23,42,1)] border-4 border-slate-900 z-10 overflow-hidden animate-in zoom-in-95 duration-500">
        
        {/* Branding */}
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

        {/* Form Column */}
        <div className="p-12 lg:p-16 bg-slate-50 flex flex-col justify-center min-h-[500px]">
          
          {error && (
            <div className="mb-6 p-4 bg-rose-50 border-2 border-rose-200 rounded-2xl animate-in slide-in-from-top-2 duration-300">
              <p className="text-rose-600 font-black text-[10px] uppercase leading-tight">{error}</p>
              <button onClick={() => setError(null)} className="mt-2 text-rose-400 font-black text-[9px] uppercase hover:text-rose-600">Dispensar</button>
            </div>
          )}

          {view === 'initial' && (
            <form onSubmit={handleInitialSubmit} className="space-y-8 animate-in slide-in-from-right-4">
              <div className="space-y-2">
                <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Portal Unità</h2>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Insira seu e-mail corporativo</p>
              </div>

              <div className="space-y-4">
                <div className="relative">
                  <Mail className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
                  <input 
                    type="email"
                    required
                    placeholder="exemplo@unitaengenharia.com.br"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-14 pr-6 py-5 bg-white border-4 border-slate-100 rounded-2xl focus:border-slate-900 focus:outline-none font-black text-slate-900 transition-all"
                  />
                </div>
                <button 
                  disabled={loading}
                  className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-[#F05A22] transition-all flex items-center justify-center gap-2 border-4 border-slate-900"
                >
                  {loading ? <Loader2 className="animate-spin" /> : <>Acessar Plataforma <ChevronRight size={18} /></>}
                </button>
              </div>

              <div className="pt-4 p-4 bg-white rounded-2xl border-2 border-slate-100">
                 <p className="text-[9px] font-black text-slate-400 uppercase leading-relaxed text-center">
                   Novos colaboradores terão o acesso analisado pelo departamento de Compliance.
                 </p>
              </div>
            </form>
          )}

          {view === 'request' && (
            <form onSubmit={handleRequestAccess} className="space-y-8 animate-in slide-in-from-right-4">
              <button onClick={() => setView('initial')} className="flex items-center gap-2 text-[10px] font-black uppercase text-slate-400 hover:text-slate-900 transition-colors">
                <ArrowLeft size={14} /> Voltar
              </button>
              <div className="space-y-2">
                <h2 className="text-2xl font-black text-[#F05A22] uppercase tracking-tight">Primeiro Acesso</h2>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Solicitar aprovação para {email}</p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Seu Nome Completo</label>
                  <input 
                    type="text"
                    required
                    value={requestName}
                    onChange={(e) => setRequestName(e.target.value)}
                    className="w-full px-6 py-4 bg-white border-4 border-slate-100 rounded-2xl focus:border-slate-900 focus:outline-none font-black text-slate-900 uppercase"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Seu Perfil Principal</label>
                  <select 
                    value={requestProfile}
                    onChange={(e) => setRequestProfile(e.target.value as UserRole)}
                    className="w-full px-6 py-4 bg-white border-4 border-slate-100 rounded-2xl focus:border-slate-900 focus:outline-none font-black text-slate-900"
                  >
                    <option value="obra">ENGENHEIRO DE OBRA</option>
                    <option value="auditor">AUDITOR / COMPLIANCE</option>
                    <option value="diretoria">DIRETORIA EXECUTIVA</option>
                  </select>
                </div>
                <button 
                  disabled={loading}
                  className="w-full bg-[#F05A22] text-white py-5 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-slate-900 transition-all flex items-center justify-center gap-2 border-4 border-slate-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
                >
                  {loading ? <Loader2 className="animate-spin" /> : <>Solicitar Vínculo <Send size={18} /></>}
                </button>
              </div>
            </form>
          )}

          {view === 'pending' && (
            <div className="space-y-8 animate-in zoom-in-95 text-center">
              <div className="w-24 h-24 bg-emerald-50 rounded-[2rem] border-4 border-emerald-500 flex items-center justify-center mx-auto text-emerald-500 shadow-xl shadow-emerald-500/10">
                 <CheckCircle2 size={48} />
              </div>
              <div className="space-y-4">
                <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Solicitação Enviada!</h2>
                <div className="p-6 bg-white rounded-3xl border-2 border-slate-100 space-y-3">
                  <p className="text-xs font-black text-slate-600 uppercase leading-relaxed">
                    O administrador de Compliance recebeu seu pedido. 
                  </p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">
                    Assim que seu perfil e obras forem vinculados, você terá acesso total à plataforma AuditRisk.
                  </p>
                </div>
              </div>
              <button onClick={() => setView('initial')} className="text-[10px] font-black uppercase text-[#F05A22] hover:underline">Tentar outro e-mail</button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default Login;
