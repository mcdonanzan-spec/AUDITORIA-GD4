
import React from 'react';
import { Obra } from '../types';
import { Building2, Plus, Search, MapPin, User as UserIcon, PlusCircle, X, Loader2 } from 'lucide-react';
import { addObra } from '../services/mockDb';

interface ObrasManagementProps {
  obras: Obra[];
  onObraAdded: (obra: Obra) => void;
}

const ObrasManagement: React.FC<ObrasManagementProps> = ({ obras, onObraAdded }) => {
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [searchTerm, setSearchTerm] = React.useState('');

  const [newObra, setNewObra] = React.useState({
    nome: '',
    regional: '',
    engenheiro_responsavel: '',
    status: 'ativa' as const
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const obra: Obra = {
      ...newObra,
      id: `obra-${Date.now()}`,
      created_at: new Date().toISOString()
    };
    await addObra(obra);
    onObraAdded(obra);
    setLoading(false);
    setIsModalOpen(false);
    setNewObra({ nome: '', regional: '', engenheiro_responsavel: '', status: 'ativa' });
  };

  const filtered = obras.filter(o => o.nome.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Gestão de Unidades (Obras)</h2>
          <p className="text-slate-500 text-sm">Controle de unidades monitoradas pela governança.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-emerald-600 text-white px-6 py-3 rounded-xl font-bold text-sm hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2"
        >
          <Plus size={20} />
          Cadastrar Nova Obra
        </button>
      </header>

      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Pesquisar por nome da obra..." 
            className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map(obra => (
          <div key={obra.id} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-emerald-200 transition-all group">
            <div className="flex justify-between items-start mb-4">
              <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 group-hover:bg-emerald-50 group-hover:text-emerald-600 transition-colors">
                <Building2 size={24} />
              </div>
              <span className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest ${obra.status === 'ativa' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                {obra.status}
              </span>
            </div>
            <h3 className="font-bold text-lg text-slate-800 mb-4">{obra.nome}</h3>
            
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-sm text-slate-500">
                <MapPin size={16} />
                <span>Regional: {obra.regional}</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-slate-500">
                <UserIcon size={16} />
                <span>Eng: {obra.engenheiro_responsavel}</span>
              </div>
            </div>
            
            <div className="mt-6 pt-6 border-t border-slate-50 flex justify-between items-center">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                Desde: {new Date(obra.created_at).toLocaleDateString('pt-BR')}
              </span>
              <button className="text-emerald-600 font-bold text-sm hover:underline">Ver Detalhes</button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal de Cadastro */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-xl font-bold text-slate-800">Novo Cadastro de Obra</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Nome da Obra</label>
                <input 
                  required
                  type="text" 
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  value={newObra.nome}
                  onChange={e => setNewObra({...newObra, nome: e.target.value})}
                  placeholder="Ex: Edifício Horizonte"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Regional</label>
                  <input 
                    required
                    type="text" 
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    value={newObra.regional}
                    onChange={e => setNewObra({...newObra, regional: e.target.value})}
                    placeholder="Ex: Sul"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Status</label>
                  <select 
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    value={newObra.status}
                    onChange={e => setNewObra({...newObra, status: e.target.value as any})}
                  >
                    <option value="ativa">Ativa</option>
                    <option value="suspensa">Suspensa</option>
                  </select>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Engenheiro Responsável</label>
                <input 
                  required
                  type="text" 
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  value={newObra.engenheiro_responsavel}
                  onChange={e => setNewObra({...newObra, engenheiro_responsavel: e.target.value})}
                  placeholder="Nome do Engenheiro"
                />
              </div>
              <div className="pt-4">
                <button 
                  disabled={loading}
                  className="w-full bg-slate-900 text-white py-4 rounded-2xl font-bold hover:bg-slate-800 shadow-xl transition-all flex justify-center items-center gap-2"
                >
                  {loading ? <Loader2 className="animate-spin" size={20} /> : 'Salvar Cadastro'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ObrasManagement;
