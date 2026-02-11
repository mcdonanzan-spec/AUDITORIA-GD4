
import React from 'react';
import { Audit, Obra } from '../types';
import { Search, Filter, Calendar, Building2, ChevronRight } from 'lucide-react';

interface AuditHistoryProps {
  audits: Audit[];
  obras: Obra[];
}

const AuditHistory: React.FC<AuditHistoryProps> = ({ audits, obras }) => {
  const [searchTerm, setSearchTerm] = React.useState('');

  const filteredAudits = audits.filter(a => {
    const obra = obras.find(o => o.id === a.obra_id);
    return obra?.nome.toLowerCase().includes(searchTerm.toLowerCase()) || 
           a.tipo.toLowerCase().includes(searchTerm.toLowerCase());
  });

  return (
    <div className="space-y-6">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Histórico de Auditorias</h2>
          <p className="text-slate-500">Acompanhe a evolução do compliance em suas obras.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Buscar por obra ou tipo..." 
              className="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none w-64"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button className="bg-white border border-slate-200 p-2 rounded-lg text-slate-500 hover:bg-slate-50">
            <Filter size={20} />
          </button>
        </div>
      </header>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 text-xs font-bold text-slate-500 uppercase tracking-widest">
            <tr>
              <th className="px-6 py-4">Data</th>
              <th className="px-6 py-4">Obra</th>
              <th className="px-6 py-4">Tipo</th>
              <th className="px-6 py-4">Score</th>
              <th className="px-6 py-4">Status Risco</th>
              <th className="px-6 py-4 text-right">Ação</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredAudits.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                  Nenhuma auditoria encontrada com os filtros atuais.
                </td>
              </tr>
            ) : (
              filteredAudits.map(audit => {
                const obra = obras.find(o => o.id === audit.obra_id);
                return (
                  <tr key={audit.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <Calendar size={14} className="text-slate-400" />
                        {new Date(audit.created_at).toLocaleDateString('pt-BR')}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Building2 size={16} className="text-slate-400" />
                        <span className="font-semibold text-slate-800">{obra?.nome}</span>
                      </div>
                      <span className="text-[10px] text-slate-400 uppercase tracking-widest">{obra?.regional}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-slate-600 capitalize">{audit.tipo}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-bold ${audit.indice_geral! > 75 ? 'text-emerald-600' : audit.indice_geral! > 50 ? 'text-amber-600' : 'text-rose-600'}`}>
                          {audit.indice_geral}%
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`
                        px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider
                        ${audit.risco_juridico === 'BAIXO' ? 'bg-emerald-100 text-emerald-700' : 
                          audit.risco_juridico === 'ALTO' || audit.risco_juridico === 'CRÍTICO' ? 'bg-rose-100 text-rose-700' : 
                          'bg-amber-100 text-amber-700'}
                      `}>
                        {audit.risco_juridico}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button className="text-slate-300 group-hover:text-emerald-600 transition-colors">
                        <ChevronRight size={20} />
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
  );
};

export default AuditHistory;
