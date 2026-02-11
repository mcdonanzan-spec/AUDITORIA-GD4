
import React from 'react';
import { 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle2, 
  Building2,
  Calendar,
  ChevronRight,
  TrendingDown
} from 'lucide-react';
import { Audit, Obra, AIRanking } from '../types';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell
} from 'recharts';

interface DashboardProps {
  audits: Audit[];
  obras: Obra[];
}

const Dashboard: React.FC<DashboardProps> = ({ audits, obras }) => {
  const latestAudits = [...audits].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 5);
  
  const avgScore = audits.length > 0 
    ? Math.round(audits.reduce((acc, a) => acc + (a.indice_geral || 0), 0) / audits.length) 
    : 0;

  const criticalAudits = audits.filter(a => a.classificacao === 'CRÍTICA').length;

  const chartData = obras.map(o => {
    const obraAudits = audits.filter(a => a.obra_id === o.id);
    const lastAudit = obraAudits.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
    return {
      name: o.nome,
      score: lastAudit?.indice_geral || 0
    };
  }).filter(d => d.score > 0);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-slate-800">Painel de Governança</h1>
        <p className="text-slate-500">Visão consolidada do risco operacional e jurídico.</p>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          label="Índice Médio Geral" 
          value={`${avgScore}%`} 
          icon={<TrendingUp className="text-emerald-500" />} 
          color="bg-emerald-50"
        />
        <StatCard 
          label="Obras Monitoradas" 
          value={obras.length} 
          icon={<Building2 className="text-blue-500" />} 
          color="bg-blue-50"
        />
        <StatCard 
          label="Alertas Críticos" 
          value={criticalAudits} 
          icon={<AlertTriangle className="text-rose-500" />} 
          color="bg-rose-50"
        />
        <StatCard 
          label="Auditorias (Mês)" 
          value={audits.length} 
          icon={<Calendar className="text-amber-500" />} 
          color="bg-amber-50"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart Column */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h3 className="text-lg font-semibold text-slate-800 mb-6">Performance por Obra (Última Auditoria)</h3>
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" />
                  <YAxis domain={[0, 100]} />
                  <Tooltip />
                  <Bar dataKey="score" radius={[4, 4, 0, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.score < 50 ? '#f43f5e' : entry.score < 80 ? '#f59e0b' : '#10b981'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 overflow-x-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-slate-800">Ranking das Obras</h3>
              <button className="text-emerald-600 text-sm font-medium hover:underline">Ver completo</button>
            </div>
            <table className="w-full text-left">
              <thead>
                <tr className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  <th className="pb-4 pr-4">Obra</th>
                  <th className="pb-4 px-4">Índice</th>
                  <th className="pb-4 px-4">Risco Jurídico</th>
                  <th className="pb-4 pl-4 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {obras.slice(0, 5).map(obra => {
                  const audit = audits.find(a => a.obra_id === obra.id);
                  return (
                    <tr key={obra.id} className="group hover:bg-slate-50 transition-colors">
                      <td className="py-4 pr-4">
                        <div className="font-medium text-slate-800">{obra.nome}</div>
                        <div className="text-xs text-slate-500">{obra.regional}</div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div 
                              className={`h-full ${audit?.indice_geral! > 70 ? 'bg-emerald-500' : 'bg-rose-500'}`} 
                              style={{ width: `${audit?.indice_geral || 0}%` }}
                            />
                          </div>
                          <span className="text-sm font-bold">{audit?.indice_geral || 0}%</span>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <span className={`
                          px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider
                          ${audit?.risco_juridico === 'BAIXO' ? 'bg-emerald-100 text-emerald-700' : 
                            audit?.risco_juridico === 'ALTO' || audit?.risco_juridico === 'CRÍTICO' ? 'bg-rose-100 text-rose-700' : 
                            'bg-amber-100 text-amber-700'}
                        `}>
                          {audit?.risco_juridico || 'PENDENTE'}
                        </span>
                      </td>
                      <td className="py-4 pl-4 text-right">
                        <button className="text-slate-400 group-hover:text-emerald-600 transition-colors">
                          <ChevronRight size={20} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Sidebar Alerts */}
        <div className="space-y-6">
          <div className="bg-slate-900 text-white p-6 rounded-xl shadow-lg relative overflow-hidden">
            <div className="relative z-10">
              <h4 className="text-emerald-400 font-bold uppercase text-[10px] tracking-widest mb-2">Insight de IA</h4>
              <p className="text-sm leading-relaxed text-slate-300">
                Detectamos uma queda de 15% na conformidade de equipe no setor Sul. Recomendamos auditoria extraordinária imediata.
              </p>
            </div>
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 blur-3xl -mr-16 -mt-16 rounded-full"></div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-4">Últimas Atividades</h3>
            <div className="space-y-4">
              {latestAudits.map(audit => {
                const obra = obras.find(o => o.id === audit.obra_id);
                return (
                  <div key={audit.id} className="flex gap-4">
                    <div className={`mt-1 w-2 h-2 rounded-full shrink-0 ${audit.classificacao === 'CRÍTICA' ? 'bg-rose-500' : 'bg-emerald-500'}`}></div>
                    <div>
                      <p className="text-sm font-medium text-slate-800">
                        {audit.tipo === 'mensal' ? 'Auditoria Mensal' : 'Auditoria Extraordinária'} - {obra?.nome}
                      </p>
                      <p className="text-xs text-slate-400">{new Date(audit.created_at).toLocaleDateString('pt-BR')}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const StatCard: React.FC<{ label: string; value: string | number; icon: React.ReactNode; color: string }> = ({ label, value, icon, color }) => (
  <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex items-center justify-between">
    <div>
      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">{label}</p>
      <p className="text-2xl font-bold text-slate-800">{value}</p>
    </div>
    <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${color}`}>
      {icon}
    </div>
  </div>
);

export default Dashboard;
