
import React from 'react';
import { Obra, Audit } from '../types';
import { Building2, Plus, Search, MapPin, User as UserIcon, X, Loader2, ChevronRight, History } from 'lucide-react';
import { addObra } from '../services/mockDb';

interface ObrasManagementProps {
  obras: Obra[];
  audits: Audit[];
  onObraAdded: (obra: Obra) => void;
  onSelectAudit: (audit: Audit) => void;
}

const ObrasManagement: React.FC<ObrasManagementProps> = ({ obras, audits, onObraAdded, onSelectAudit }) => {
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [selectedObraId, setSelectedObraId] = React.useState<string | null>(null);

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
  const obraAudits = selectedObraId ? audits.filter(a => a.obra_id === selectedObraId) : [];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Gestão de Unidades</h2>
          <p className="text-slate-600 font-black text-sm uppercase tracking-widest">Monitoramento de Canteiros Unità</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-orange-600 text-white px-8 py-4 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-orange-700 transition-all shadow-xl shadow-orange-900/20 flex items-center justify-center gap-2 border-4 border-orange-800"
        >
          <Plus size={20} />
          Novo Canteiro
        </button>
      </header>

      <div className="bg-white p-6 rounded-3xl border-2 border-slate-300 shadow-sm">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Pesquisar Unidade..." 
            className="w-full pl-12 pr-6 py-4 bg-slate-50 border-2 border-slate-200 rounded-2xl focus:ring-4 focus:ring-orange-500/20 focus:outline-none font-black text-slate-900"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {filtered.map(obra => (
          <div key={obra.id} className="bg-white p-8 rounded-[2rem] border-4 border-slate-900 shadow-[8px_8px_0px_0px_rgba(15,23,42,1)] hover:shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] hover:translate-x-1 hover:translate-y-1 transition-all group flex flex-col h-full">
            <div className="flex justify-between items-start mb-6">
              <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400 group-hover:bg-orange-600 group-hover:text-white transition-all shadow-inner border-2 border-slate-200 group-hover:border-orange-800">
                <Building2 size={32} />
              </div>
              <span className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border-2 ${obra.status === 'ativa' ? 'bg-emerald-50 text-emerald-700 border-emerald-600' : 'bg-slate-50 text-slate-500 border-slate-400'}`}>
                {obra.status}
              </span>
            </div>
            
            <h3 className="font-black text-2xl text-slate-900 mb-6 uppercase tracking-tight leading-tight">{obra.nome}</h3>
            
            <div className="space-y-4 flex-1">
              <div className="flex items-center gap-4 text-sm font-black text-slate-600 uppercase tracking-tight">
                <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-orange-600">
                  <MapPin size={16} />
                </div>
                <span>Regional: {obra.regional}</span>
              </div>
              <div className="flex items-center gap-4 text-sm font-black text-slate-600 uppercase tracking-tight">
                <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-orange-600">
                  <UserIcon size={16} />
                </div>
                <span>Eng: {obra.engenheiro_responsavel}</span>
              </div>
            </div>
            
            <div className="mt-8 pt-8 border-t-2 border-slate-100 flex flex-col gap-4">
              <div className="flex justify-between items-center">
                <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest">
                  Base: {new Date(obra.created_at).toLocaleDateString('pt-BR')}
                </span>
                <button 
                  onClick={() => setSelectedObraId(obra.id)}
                  className="bg-slate-900 text-white px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-orange-600 transition-all flex items-center gap-2"
                >
                  Ver Detalhes
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Drawer/Modal para Auditorias da Obra */}
      {selectedObraId && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-4xl rounded-[2.5rem] shadow-2xl overflow-hidden border-4 border-slate-900 animate-in slide-in-from-bottom-10">
            <div className="p-8 border-b-4 border-slate-900 flex justify-between items-center bg-slate-50">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-orange-600 rounded-2xl flex items-center justify-center text-white">
                  <History size={24} />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Histórico da Unidade</h3>
                  <p className="text-slate-500 font-black text-xs uppercase tracking-widest">{obras.find(o => o.id === selectedObraId)?.nome}</p>
                </div>
              </div>
              <button onClick={() => setSelectedObraId(null)} className="p-3 bg-white border-2 border-slate-200 rounded-2xl text-slate-400 hover:text-rose-600 hover:border-rose-600 transition-all shadow-sm">
                <X size={24} />
              </button>
            </div>
            <div className="p-8 max-h-[60vh] overflow-y-auto space-y-4">
              {obraAudits.length === 0 ? (
                <div className="py-20 text-center space-y-4">
                  <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-300">
                    <History size={40} />
                  </div>
                  <p className="text-slate-400 font-black uppercase text-sm tracking-widest">Nenhuma auditoria realizada nesta obra.</p>
                </div>
              ) : (
                obraAudits.map(audit => (
                  <div 
                    key={audit.id} 
                    onClick={() => {
                      onSelectAudit(audit);
                      setSelectedObraId(null);
                    }}
                    className="flex items-center justify-between p-6 bg-slate-50 rounded-3xl border-2 border-slate-200 hover:border-orange-500 hover:bg-white transition-all group cursor-pointer"
                  >
                    <div className="flex items-center gap-6">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">DATA</span>
                        <span className="text-sm font-black text-slate-900">{new Date(audit.created_at).toLocaleDateString('pt-BR')}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">SCORE</span>
                        <span className={`text-lg font-black ${audit.indice_geral! > 75 ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {audit.indice_geral}%
                        </span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">RISCO</span>
                        <span className="text-[10px] font-black uppercase px-2 py-0.5 border border-slate-300 rounded-lg">{audit.risco_juridico}</span>
                      </div>
                    </div>
                    <button className="bg-white p-3 rounded-2xl shadow-sm text-slate-300 group-hover:text-orange-600 group-hover:bg-orange-50 transition-all border-2 border-slate-100 group-hover:border-orange-200">
                      <ChevronRight size={20} />
                    </button>
                  </div>
                ))
              )}
            </div>
            <div className="p-8 bg-slate-100 border-t-2 border-slate-200 flex justify-end">
              <button 
                onClick={() => setSelectedObraId(null)}
                className="bg-slate-900 text-white px-8 py-4 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-slate-800 transition-all"
              >
                Fechar Visualização
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Cadastro */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden border-4 border-slate-900 animate-in zoom-in-95 duration-300">
            <div className="p-8 border-b-2 border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Novo Canteiro Unità</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-rose-600 transition-colors">
                <X size={28} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Nome da Obra</label>
                <input 
                  required
                  type="text" 
                  className="w-full bg-slate-50 border-2 border-slate-200 rounded-2xl px-6 py-4 focus:ring-4 focus:ring-orange-500/20 focus:border-orange-500 focus:outline-none font-black text-slate-900"
                  value={newObra.nome}
                  onChange={e => setNewObra({...newObra, nome: e.target.value})}
                  placeholder="Ex: Edifício Horizonte"
                />
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Regional</label>
                  <input 
                    required
                    type="text" 
                    className="w-full bg-slate-50 border-2 border-slate-200 rounded-2xl px-6 py-4 focus:ring-4 focus:ring-orange-500/20 focus:border-orange-500 focus:outline-none font-black text-slate-900"
                    value={newObra.regional}
                    onChange={e => setNewObra({...newObra, regional: e.target.value})}
                    placeholder="Ex: Sul"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Status Operacional</label>
                  <select 
                    className="w-full bg-slate-50 border-2 border-slate-200 rounded-2xl px-6 py-4 focus:ring-4 focus:ring-orange-500/20 focus:border-orange-500 focus:outline-none font-black text-slate-900 appearance-none"
                    value={newObra.status}
                    onChange={e => setNewObra({...newObra, status: e.target.value as any})}
                  >
                    <option value="ativa">ATIVA</option>
                    <option value="suspensa">SUSPENSA</option>
                  </select>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Engenheiro Responsável</label>
                <input 
                  required
                  type="text" 
                  className="w-full bg-slate-50 border-2 border-slate-200 rounded-2xl px-6 py-4 focus:ring-4 focus:ring-orange-500/20 focus:border-orange-500 focus:outline-none font-black text-slate-900"
                  value={newObra.engenheiro_responsavel}
                  onChange={e => setNewObra({...newObra, engenheiro_responsavel: e.target.value})}
                  placeholder="Nome Completo"
                />
              </div>
              <div className="pt-6">
                <button 
                  disabled={loading}
                  className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black uppercase text-sm tracking-widest hover:bg-orange-600 shadow-2xl transition-all flex justify-center items-center gap-2 border-b-4 border-black"
                >
                  {loading ? <Loader2 className="animate-spin" size={24} /> : 'Confirmar Cadastro'}
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
