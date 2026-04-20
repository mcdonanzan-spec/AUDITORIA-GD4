
import React from 'react';
import { Audit, Obra } from '../types';
import { Search, Filter, Calendar, Building2, ChevronRight, FileSearch, LayoutDashboard } from 'lucide-react';

interface AuditHistoryProps {
  audits: Audit[];
  obras: Obra[];
  onSelectAudit: (audit: Audit) => void;
  onNavigate: (page: string) => void;
}

const AuditHistory: React.FC<AuditHistoryProps> = ({ audits, obras, onSelectAudit, onNavigate }) => {
  const [searchTerm, setSearchTerm] = React.useState('');

  const filteredAudits = audits.filter(a => {
    const obra = obras.find(o => o.id === a.obra_id);
    return obra?.nome.toLowerCase().includes(searchTerm.toLowerCase()) || 
           a.tipo.toLowerCase().includes(searchTerm.toLowerCase());
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div>
          <button 
            onClick={() => onNavigate('dashboard')}
            className="flex items-center gap-2 px-4 py-2 bg-white border-2 border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-[#F05A22] hover:border-[#F05A22] transition-all mb-4"
          >
            <LayoutDashboard size={14} />
            Voltar ao Dashboard
          </button>
          <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Histórico de Governança</h2>
          <p className="text-slate-600 font-black text-sm uppercase tracking-widest">Base de Dados de Risco Unità Engenharia</p>
        </div>
        <div className="flex items-center gap-3 self-end md:self-auto">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Localizar Auditoria..." 
              className="pl-12 pr-6 py-3 bg-white border-2 border-slate-300 rounded-2xl focus:ring-4 focus:ring-orange-500/20 focus:border-orange-500 focus:outline-none w-72 font-black text-slate-900"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button className="bg-white border-2 border-slate-300 p-3 rounded-2xl text-slate-500 hover:bg-slate-50 hover:border-orange-500 transition-all">
            <Filter size={20} />
          </button>
        </div>
      </header>

      <div className="bg-white rounded-3xl border-4 border-slate-900 shadow-[8px_8px_0px_0px_rgba(15,23,42,1)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-900 text-[10px] font-black text-slate-400 uppercase tracking-widest">
              <tr>
                <th className="px-8 py-6">Data de Campo</th>
                <th className="px-8 py-6">Unidade Monitorada</th>
                <th className="px-8 py-6">Modalidade</th>
                <th className="px-8 py-6">Scoring (%)</th>
                <th className="px-8 py-6">Exposição Jurídica</th>
                <th className="px-8 py-6 text-right">Relatório IA</th>
              </tr>
            </thead>
            <tbody className="divide-y-2 divide-slate-200">
              {filteredAudits.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-8 py-20 text-center text-slate-400 font-black uppercase text-xs tracking-widest">
                    Nenhum registro encontrado na base de dados.
                  </td>
                </tr>
              ) : (
                filteredAudits.map(audit => {
                  const obra = obras.find(o => o.id === audit.obra_id);
                  return (
                    <tr 
                      key={audit.id} 
                      onClick={() => onSelectAudit(audit)}
                      className="hover:bg-slate-50 transition-all group cursor-pointer"
                    >
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-3 text-sm font-black text-slate-900">
                          <Calendar size={16} className="text-orange-600" />
                          {new Date(audit.created_at).toLocaleDateString('pt-BR')}
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-3">
                          <Building2 size={20} className="text-slate-400 group-hover:text-orange-600 transition-colors" />
                          <div className="flex flex-col">
                            <span className="font-black text-slate-900 uppercase tracking-tight">{obra?.nome}</span>
                            <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest">{obra?.regional}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <span className="text-xs font-black text-slate-600 uppercase tracking-widest border-2 border-slate-200 px-3 py-1 rounded-lg">
                          {audit.tipo}
                        </span>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-3">
                          <span className={`text-lg font-black ${audit.indice_geral! > 75 ? 'text-emerald-600' : audit.indice_geral! > 50 ? 'text-amber-600' : 'text-rose-600'}`}>
                            {audit.indice_geral}%
                          </span>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <span className={`
                          px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border-2
                          ${audit.risco_juridico === 'BAIXO' ? 'bg-emerald-50 text-emerald-700 border-emerald-600' : 
                            audit.risco_juridico === 'ALTO' || audit.risco_juridico === 'CRÍTICO' ? 'bg-rose-50 text-rose-700 border-rose-600' : 
                            'bg-amber-50 text-amber-700 border-amber-600'}
                        `}>
                          {audit.risco_juridico}
                        </span>
                      </td>
                      <td className="px-8 py-6 text-right">
                        <button className="bg-slate-100 text-slate-400 p-2 rounded-xl group-hover:bg-orange-600 group-hover:text-white transition-all shadow-sm border-2 border-transparent group-hover:border-orange-900">
                          <FileSearch size={22} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AuditHistory;
