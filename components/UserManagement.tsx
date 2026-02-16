
import React from 'react';
import { User, Obra, UserRole } from '../types';
import { 
  Users as UsersIcon, 
  ShieldCheck, 
  ChevronRight, 
  X, 
  CheckCircle2, 
  Building2, 
  Lock, 
  Globe,
  Loader2,
  LayoutDashboard
} from 'lucide-react';
import { getUsers, updateUser } from '../services/mockDb';

interface UserManagementProps {
  obras: Obra[];
  onNavigate: (page: string) => void;
}

const UserManagement: React.FC<UserManagementProps> = ({ obras, onNavigate }) => {
  const [users, setUsers] = React.useState<User[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [editingUser, setEditingUser] = React.useState<User | null>(null);

  React.useEffect(() => {
    getUsers().then(u => {
      setUsers(u);
      setLoading(false);
    });
  }, []);

  const handleToggleObra = (obraId: string) => {
    if (!editingUser) return;
    const currentIds = editingUser.obra_ids || [];
    const nextIds = currentIds.includes(obraId) 
      ? currentIds.filter(id => id !== obraId)
      : [...currentIds, obraId];
    
    setEditingUser({ ...editingUser, obra_ids: nextIds });
  };

  const handleSave = async () => {
    if (!editingUser) return;
    setLoading(true);
    await updateUser(editingUser);
    setUsers(prev => prev.map(u => u.id === editingUser.id ? editingUser : u));
    setEditingUser(null);
    setLoading(false);
  };

  if (loading && users.length === 0) {
    return <div className="flex justify-center p-20"><Loader2 className="animate-spin text-[#F05A22]" size={48} /></div>;
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row md:items-start justify-between gap-6">
        <div>
          <button 
            onClick={() => onNavigate('dashboard')}
            className="flex items-center gap-2 px-4 py-2 bg-white border-2 border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-[#F05A22] transition-all mb-4"
          >
            <LayoutDashboard size={14} />
            Voltar ao Dashboard
          </button>
          <h2 className="text-4xl font-black text-slate-900 uppercase tracking-tighter">Gestão de Acessos</h2>
          <p className="text-slate-500 font-black text-xs uppercase tracking-widest mt-1">Configuração de Permissões e Vínculos</p>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-6">
        {users.map(user => {
          const isGlobal = ['admin', 'auditor', 'diretoria'].includes(user.perfil);
          return (
            <div key={user.id} className="bg-white p-8 rounded-[2.5rem] border-4 border-slate-900 shadow-[8px_8px_0px_0px_rgba(15,23,42,1)] flex items-center justify-between group hover:translate-x-1 transition-all">
              <div className="flex items-center gap-6">
                <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-300 border-4 border-slate-100 group-hover:border-[#F05A22] transition-all">
                  <UsersIcon size={32} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">{user.nome}</h3>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{user.email}</span>
                    <span className="w-1 h-1 bg-slate-200 rounded-full"></span>
                    <span className="text-[10px] font-black text-[#F05A22] uppercase tracking-widest">{user.perfil}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-10">
                <div className="text-right">
                  <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Escopo de Visão</p>
                  {isGlobal ? (
                    <div className="flex items-center gap-2 text-emerald-600 font-black text-xs uppercase">
                      <Globe size={14} /> Acesso Global
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-[#F05A22] font-black text-xs uppercase">
                      <Building2 size={14} /> {user.obra_ids?.length || 0} Unidades
                    </div>
                  )}
                </div>
                
                {!isGlobal && (
                  <button 
                    onClick={() => setEditingUser(user)}
                    className="bg-slate-900 text-white px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-[#F05A22] transition-all shadow-[4px_4px_0px_0px_rgba(240,90,34,1)]"
                  >
                    Gerenciar Vínculos
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal de Vínculos */}
      {editingUser && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl overflow-hidden border-4 border-slate-900 animate-in zoom-in-95">
            <div className="p-10 border-b-4 border-slate-50 flex justify-between items-center bg-slate-50">
              <div>
                <h3 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Vínculos de Unidade</h3>
                <p className="text-[#F05A22] font-black text-xs uppercase tracking-widest">{editingUser.nome}</p>
              </div>
              <button onClick={() => setEditingUser(null)} className="text-slate-300 hover:text-rose-600 transition-colors">
                <X size={32} />
              </button>
            </div>
            
            <div className="p-10 max-h-[50vh] overflow-y-auto space-y-3">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 block">Selecione os Canteiros Autorizados</label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {obras.map(obra => {
                  const isChecked = editingUser.obra_ids?.includes(obra.id);
                  return (
                    <button 
                      key={obra.id}
                      onClick={() => handleToggleObra(obra.id)}
                      className={`
                        p-6 rounded-2xl border-4 text-left flex items-center justify-between transition-all
                        ${isChecked ? 'bg-slate-900 text-white border-slate-900 shadow-[4px_4px_0px_0px_rgba(240,90,34,1)]' : 'bg-slate-50 border-slate-100 text-slate-500'}
                      `}
                    >
                      <div>
                        <p className="font-black uppercase text-xs tracking-tight">{obra.nome}</p>
                        <p className="text-[9px] opacity-60 uppercase">{obra.regional}</p>
                      </div>
                      {isChecked && <CheckCircle2 size={20} className="text-[#F05A22]" />}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="p-10 bg-slate-50 border-t-4 border-slate-100 flex gap-4">
              <button onClick={() => setEditingUser(null)} className="flex-1 py-5 rounded-2xl font-black uppercase text-xs text-slate-500 border-2 border-slate-200 hover:bg-white transition-all">Cancelar</button>
              <button 
                onClick={handleSave}
                className="flex-[2] bg-[#F05A22] text-white py-5 rounded-2xl font-black uppercase text-xs tracking-widest shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] border-4 border-slate-900 active:translate-y-1 active:shadow-none transition-all"
              >
                Salvar Alterações
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
