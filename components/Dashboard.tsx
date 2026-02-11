
import React from 'react';
import { 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle2, 
  Building2,
  Calendar,
  ChevronRight,
  ShieldCheck,
  ArrowUpRight
} from 'lucide-react';
import { Audit, Obra } from '../types';
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
  onNavigate: (page: string) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ audits, obras, onNavigate }) => {
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
    <div className="space-y-6 animate-in fade-in duration-500">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Painel de Governança</h1>
          <p className="text-slate-500 text-sm">Visão consolidada do risco operacional e jurídico.</p>
        </div>
        <button 
          onClick={() => onNavigate('new-audit')}
          className="bg-emerald-600 text-white px-4 py-2 rounded-xl font-bold text-sm hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20 flex items-center gap-2"
        >
          <CheckCircle2 size={18} />
          Nova Auditoria
        </button>
      </header>

      {/* Stats Grid - Todos Clicáveis */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          label="Índice Médio Geral" 
          value={`${avgScore}%`} 
          icon={<TrendingUp className="text-emerald-500" />} 
          color="bg-emerald-50"
          onClick={() => onNavigate('history')}
        />
        <StatCard 
          label="Obras Ativas" 
          value={obras.filter(o => o.status === 'ativa').length} 
          icon={<Building2 className="text-blue-500" />} 
          color="bg-blue-50"
          onClick={() => onNavigate('obras')}
        />
        <StatCard 
          label="Alertas Críticos" 
          value={criticalAudits} 
          icon={<AlertTriangle className="text-rose-500" />} 
          color="bg-rose-50"
          onClick={() => onNavigate('history')}
        />
        <StatCard 
          label="Auditorias (Total)" 
          value={audits.length} 
          icon={<Calendar className="text-amber-500" />} 
          color="bg-amber-50"
          onClick={() => onNavigate('history')}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Gráfico Column */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <h3 className="text-lg font-bold text-slate-800 mb-6">Ranking de Conformidade</h3>
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                  <YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                  <Tooltip 
                    cursor={{fill: '#f8fafc'}} 
                    contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}}
                  />
                  <Bar dataKey="score" radius={[6, 6, 0, 0]} barSize={40}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.score < 50 ? '#f43f5e' : entry.score < 80 ? '#f59e0b' : '#10b981'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-800">Monitoramento por Unidade</h3>
              <button 
                onClick={() => onNavigate('obras')}
                className="text-emerald-600 text-sm font-bold hover:bg-emerald-50 px-3 py-1 rounded-lg transition-colors"
              >
                Gerenciar Obras
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  <tr>
                    <th className="px-6 py-4">Obra / Regional</th>
                    <th className="px-6 py-4">Índice Atual</th>
                    <th className="px-6 py-4">Risco Jurídico</th>
                    <th className="px-6 py-4 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {obras.slice(0, 5).map(obra => {
                    const audit = audits.find(a => a.obra_id === obra.id);
                    return (
                      <tr 
                        key={obra.id} 
                        onClick={() => onNavigate('history')}
                        className="group cursor-pointer hover:bg-slate-50 transition-colors"
                      >
                        <td className="px-6 py-4">
                          <div className="font-bold text-slate-800 group-hover:text-emerald-600 transition-colors">{obra.nome}</div>
                          <div className="text-xs text-slate-400 font-medium">{obra.regional}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex-1 max-w-[100px] h-2 bg-slate-100 rounded-full overflow-hidden">
                              <div 
                                className={`h-full transition-all duration-1000 ${audit?.indice_geral! > 75 ? 'bg-emerald-500' : audit?.indice_geral! > 50 ? 'bg-amber-500' : 'bg-rose-500'}`} 
                                style={{ width: `${audit?.indice_geral || 0}%` }}
                              />
                            </div>
                            <span className="text-sm font-bold text-slate-700">{audit?.indice_geral || 0}%</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`
                            px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider
                            ${audit?.risco_juridico === 'BAIXO' ? 'bg-emerald-100 text-emerald-700' : 
                              audit?.risco_juridico === 'ALTO' || audit?.risco_juridico === 'CRÍTICO' ? 'bg-rose-100 text-rose-700' : 
                              'bg-amber-100 text-amber-700'}
                          `}>
                            {audit?.risco_juridico || 'PENDENTE'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-slate-100 text-slate-400 group-hover:bg-emerald-600 group-hover:text-white transition-all">
                            <ArrowUpRight size={16} />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Sidebar Insights */}
        <div className="space-y-6">
          <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-xl relative overflow-hidden group cursor-pointer" onClick={() => onNavigate('new-audit')}>
            <div className="relative z-10 space-y-3">
              <div className="w-10 h-10 bg-emerald-500/20 rounded-xl flex items-center justify-center border border-emerald-500/30">
                <ShieldCheck className="text-emerald-400" />
              </div>
              <h4 className="text-emerald-400 font-bold uppercase text-[10px] tracking-widest">Alerta de Governança</h4>
              <p className="text-sm leading-relaxed text-slate-300 font-medium">
                Sua taxa de conformidade em Segurança (Bloco C) caiu 12% nos últimos 30 dias.
              </p>
              <div className="pt-2 flex items-center gap-1 text-xs font-bold text-emerald-400">
                Agendar Auditoria <ChevronRight size={14} />
              </div>
            </div>
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 blur-3xl -mr-16 -mt-16 rounded-full group-hover:bg-emerald-500/20 transition-all"></div>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-6">Últimas Atividades</h3>
            <div className="space-y-6">
              {latestAudits.map(audit => {
                const obra = obras.find(o => o.id === audit.obra_id);
                return (
                  <div key={audit.id} className="flex gap-4 relative">
                    <div className="flex flex-col items-center">
                      <div className={`w-3 h-3 rounded-full shrink-0 z-10 ${audit.classificacao === 'CRÍTICA' ? 'bg-rose-500 ring-4 ring-rose-50' : 'bg-emerald-500 ring-4 ring-emerald-50'}`}></div>
                      <div className="w-0.5 h-full bg-slate-100 absolute top-3"></div>
                    </div>
                    <div className="pb-2">
                      <p className="text-sm font-bold text-slate-800 leading-tight">
                        {obra?.nome}
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        {audit.tipo === 'mensal' ? 'Check Mensal' : 'Auditoria Extraordinária'}
                      </p>
                      <p className="text-[10px] text-slate-400 mt-1 font-bold">{new Date(audit.created_at).toLocaleDateString('pt-BR')}</p>
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

const StatCard: React.FC<{ label: string; value: string | number; icon: React.ReactNode; color: string; onClick?: () => void }> = ({ label, value, icon, color, onClick }) => (
  <div 
    onClick={onClick}
    className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center justify-between cursor-pointer hover:shadow-md hover:border-emerald-200 transition-all group"
  >
    <div>
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 group-hover:text-emerald-600 transition-colors">{label}</p>
      <p className="text-2xl font-bold text-slate-800">{value}</p>
    </div>
    <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110 ${color}`}>
      {icon}
    </div>
  </div>
);

export default Dashboard;
