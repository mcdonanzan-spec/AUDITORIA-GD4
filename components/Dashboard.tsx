
import React from 'react';
import { 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle2, 
  Building2,
  Calendar,
  ChevronRight,
  ShieldCheck,
  ArrowUpRight,
  Target,
  Filter,
  Search,
  ArrowDownRight
} from 'lucide-react';
import { Audit, Obra, User } from '../types';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell,
  LineChart,
  Line,
  AreaChart,
  Area
} from 'recharts';

interface DashboardProps {
  audits: Audit[];
  obras: Obra[];
  onNavigate: (page: string) => void;
  user: User;
}

const Dashboard: React.FC<DashboardProps> = ({ audits, obras, onNavigate, user }) => {
  const [selectedObraId, setSelectedObraId] = React.useState<string>('all');
  const [dateRange, setDateRange] = React.useState({
    start: new Date(new Date().setMonth(new Date().getMonth() - 6)).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });

  const isObraProfile = user.perfil === 'obra';
  
  // Filter audits based on selection
  const filteredAudits = audits.filter(audit => {
    const matchesObra = selectedObraId === 'all' || audit.obra_id === selectedObraId;
    const auditDate = new Date(audit.created_at).toISOString().split('T')[0];
    const matchesDate = auditDate >= dateRange.start && auditDate <= dateRange.end;
    return matchesObra && matchesDate;
  });

  const latestAudits = [...filteredAudits].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 5);
  
  const avgScore = filteredAudits.length > 0 
    ? Math.round(filteredAudits.reduce((acc, a) => acc + (a.indice_geral || 0), 0) / filteredAudits.length) 
    : 0;

  const criticalAudits = filteredAudits.filter(a => a.classificacao === 'CRÍTICA').length;

  // Data for Bar Chart (Latest per Obra)
  const barChartData = obras
    .filter(o => selectedObraId === 'all' || o.id === selectedObraId)
    .map(o => {
      const obraAudits = audits.filter(a => a.obra_id === o.id);
      const lastAudit = obraAudits.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
      return {
        name: o.nome,
        score: lastAudit?.indice_geral || 0
      };
    }).filter(d => d.score > 0);

  // Data for Evolution Chart
  const evolutionData = [...filteredAudits]
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    .map(a => ({
      date: new Date(a.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
      fullDate: new Date(a.created_at).toLocaleDateString('pt-BR'),
      score: a.indice_geral || 0,
      obra: obras.find(o => o.id === a.obra_id)?.nome || 'N/A'
    }));

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-slate-900 uppercase tracking-tighter">
            {isObraProfile ? `Gestão Multicanteiro` : `Painel Executivo Unità`}
          </h1>
          <p className="text-slate-500 font-bold uppercase text-[10px] tracking-[0.2em] mt-1">
            {isObraProfile ? `${obras.length} Unidades Sob sua Responsabilidade` : 'Monitoramento de Risco e Governança Global'}
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          {(user.perfil === 'admin' || user.perfil === 'auditor') && (
            <button 
              onClick={() => onNavigate('new-audit')}
              className="bg-[#F05A22] text-white px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-900 transition-all shadow-xl shadow-[#F05A22]/20 flex items-center gap-3 border-4 border-slate-900"
            >
              <CheckCircle2 size={16} />
              Nova Auditoria
            </button>
          )}
        </div>
      </header>

      {/* Filters Section */}
      <div className="bg-white p-6 rounded-[2rem] border-4 border-slate-900 shadow-[6px_6px_0px_0px_rgba(15,23,42,1)] flex flex-wrap items-end gap-6">
        <div className="flex-1 min-w-[200px] space-y-2">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <Building2 size={12} className="text-[#F05A22]" /> Filtrar por Unidade
          </label>
          <select 
            value={selectedObraId}
            onChange={(e) => setSelectedObraId(e.target.value)}
            className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl px-4 py-3 font-black text-xs text-slate-900 focus:outline-none focus:border-[#F05A22] transition-colors"
          >
            <option value="all">TODAS AS UNIDADES</option>
            {obras.map(o => (
              <option key={o.id} value={o.id}>{o.nome}</option>
            ))}
          </select>
        </div>

        <div className="flex-1 min-w-[300px] space-y-2">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <Calendar size={12} className="text-[#F05A22]" /> Período de Análise
          </label>
          <div className="flex items-center gap-3">
            <input 
              type="date" 
              value={dateRange.start}
              onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
              className="flex-1 bg-slate-50 border-2 border-slate-200 rounded-xl px-4 py-3 font-black text-xs text-slate-900 focus:outline-none focus:border-[#F05A22] transition-colors"
            />
            <span className="font-black text-slate-300">ATÉ</span>
            <input 
              type="date" 
              value={dateRange.end}
              onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
              className="flex-1 bg-slate-50 border-2 border-slate-200 rounded-xl px-4 py-3 font-black text-xs text-slate-900 focus:outline-none focus:border-[#F05A22] transition-colors"
            />
          </div>
        </div>

        <button 
          onClick={() => {
            setSelectedObraId('all');
            setDateRange({
              start: new Date(new Date().setMonth(new Date().getMonth() - 6)).toISOString().split('T')[0],
              end: new Date().toISOString().split('T')[0]
            });
          }}
          className="px-6 py-3 bg-slate-100 text-slate-400 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 hover:text-slate-600 transition-all"
        >
          Limpar
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          label={isObraProfile ? "Score Médio" : "Índice Médio Geral"} 
          value={`${avgScore}%`} 
          icon={<TrendingUp className="text-[#F05A22]" />} 
          color="bg-orange-50"
          onClick={() => onNavigate('history')}
        />
        <StatCard 
          label={isObraProfile ? "Efetivo Total" : "Canteiros Ativos"} 
          value={isObraProfile ? audits.reduce((acc, a) => acc + (a.equipe_campo || 0), 0) : obras.filter(o => o.status === 'ativa').length} 
          icon={<Building2 className="text-slate-900" />} 
          color="bg-slate-100"
          onClick={() => onNavigate(isObraProfile ? 'history' : 'obras')}
        />
        <StatCard 
          label="Alertas Críticos" 
          value={criticalAudits} 
          icon={<AlertTriangle className={criticalAudits > 0 ? "text-rose-600" : "text-emerald-600"} />} 
          color={criticalAudits > 0 ? "bg-rose-50" : "bg-emerald-50"}
          onClick={() => onNavigate('history')}
        />
        <StatCard 
          label="Total Auditorias" 
          value={audits.length} 
          icon={<Calendar className="text-slate-900" />} 
          color="bg-slate-50"
          onClick={() => onNavigate('history')}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-8 rounded-[2.5rem] border-4 border-slate-900 shadow-[8px_8px_0px_0px_rgba(15,23,42,1)]">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Evolução da Conformidade</h3>
            <div className="flex items-center gap-2 text-[10px] font-black text-emerald-500 bg-emerald-50 px-3 py-1 rounded-lg">
              <TrendingUp size={14} />
              Histórico Temporal
            </div>
          </div>
          <div className="h-80 w-full">
            {evolutionData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={evolutionData}>
                  <defs>
                    <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#F05A22" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#F05A22" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="date" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fill: '#0f172a', fontSize: 10, fontWeight: 900}} 
                  />
                  <YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 700}} />
                  <Tooltip 
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-slate-900 text-white p-4 rounded-2xl border-2 border-[#F05A22] shadow-xl">
                            <p className="text-[10px] font-black text-[#F05A22] uppercase mb-1">{data.fullDate}</p>
                            <p className="text-sm font-black uppercase mb-1">{data.obra}</p>
                            <p className="text-2xl font-black">{data.score}%</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="score" 
                    stroke="#F05A22" 
                    strokeWidth={4}
                    fillOpacity={1} 
                    fill="url(#colorScore)" 
                    activeDot={{ r: 8, stroke: '#0f172a', strokeWidth: 4, fill: '#F05A22' }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-300 space-y-4">
                <Search size={48} />
                <p className="font-black uppercase text-xs">Nenhum dado no período selecionado</p>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] border-4 border-slate-900 shadow-[8px_8px_0px_0px_rgba(15,23,42,1)]">
          <h3 className="text-xl font-black text-slate-900 mb-8 uppercase tracking-tight">Conformidade por Unidade</h3>
          <div className="h-80 w-full">
            {barChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barChartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#0f172a', fontSize: 10, fontWeight: 900}} />
                  <YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 700}} />
                  <Tooltip 
                    cursor={{fill: '#f8fafc'}} 
                    contentStyle={{borderRadius: '16px', border: '4px solid #0f172a', fontWeight: '900', textTransform: 'uppercase'}}
                  />
                  <Bar dataKey="score" radius={[8, 8, 0, 0]} barSize={45}>
                    {barChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.score < 50 ? '#e11d48' : entry.score < 80 ? '#F05A22' : '#10b981'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-300 space-y-4">
                <Search size={48} />
                <p className="font-black uppercase text-xs">Nenhum dado disponível</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">

          <div className="bg-white rounded-[2.5rem] border-4 border-slate-900 shadow-[8px_8px_0px_0px_rgba(15,23,42,1)] overflow-hidden">
            <div className="p-8 border-b-4 border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Monitoramento em Tempo Real</h3>
              <button 
                onClick={() => onNavigate('obras')}
                className="text-white bg-slate-900 text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-xl hover:bg-[#F05A22] transition-colors"
              >
                Gerenciar
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-white text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  <tr>
                    <th className="px-8 py-5">Canteiro / Unidade</th>
                    <th className="px-8 py-5">Conformidade</th>
                    <th className="px-8 py-5">Risco GD4</th>
                    <th className="px-8 py-5 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y-2 divide-slate-100">
                  {obras.slice(0, 5).map(obra => {
                    const audit = audits.find(a => a.obra_id === obra.id);
                    return (
                      <tr 
                        key={obra.id} 
                        onClick={() => onNavigate('history')}
                        className="group cursor-pointer hover:bg-slate-50 transition-colors"
                      >
                        <td className="px-8 py-6">
                          <div className="font-black text-slate-900 group-hover:text-[#F05A22] transition-colors uppercase tracking-tight">{obra.nome}</div>
                          <div className="text-[10px] text-slate-400 font-black uppercase tracking-widest">{obra.regional}</div>
                        </td>
                        <td className="px-8 py-6">
                          <div className="flex items-center gap-4">
                            <div className="flex-1 w-24 h-3 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                              <div 
                                className={`h-full transition-all duration-1000 ${audit?.indice_geral! > 75 ? 'bg-emerald-500' : audit?.indice_geral! > 50 ? 'bg-[#F05A22]' : 'bg-rose-600'}`} 
                                style={{ width: `${audit?.indice_geral || 0}%` }}
                              />
                            </div>
                            <span className="text-sm font-black text-slate-900">{audit?.indice_geral || 0}%</span>
                          </div>
                        </td>
                        <td className="px-8 py-6">
                          <span className={`
                            px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border-2
                            ${audit?.risco_juridico === 'BAIXO' ? 'bg-emerald-50 text-emerald-700 border-emerald-600' : 
                              audit?.risco_juridico === 'ALTO' || audit?.risco_juridico === 'CRÍTICO' ? 'bg-rose-50 text-rose-700 border-rose-600' : 
                              'bg-orange-50 text-[#F05A22] border-[#F05A22]'}
                          `}>
                            {audit?.risco_juridico || 'PENDENTE'}
                          </span>
                        </td>
                        <td className="px-8 py-6 text-right">
                          <div className="inline-flex items-center justify-center w-10 h-10 rounded-2xl bg-slate-100 text-slate-400 group-hover:bg-[#F05A22] group-hover:text-white transition-all shadow-sm">
                            <ArrowUpRight size={18} />
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

        <div className="space-y-8">
          <div className="bg-slate-900 text-white p-10 rounded-[2.5rem] border-4 border-slate-900 shadow-[8px_8px_0px_0px_rgba(240,90,34,1)] relative overflow-hidden group">
            <div className="relative z-10 space-y-6">
              <div className="w-14 h-14 bg-[#F05A22]/20 rounded-2xl flex items-center justify-center border-2 border-[#F05A22]/40">
                <ShieldCheck className="text-[#F05A22]" size={32} />
              </div>
              <div className="space-y-2">
                <h4 className="text-[#F05A22] font-black uppercase text-[10px] tracking-widest">Governança Unità</h4>
                <p className="text-lg leading-tight text-white font-black uppercase">
                  {isObraProfile 
                    ? `Você tem ${obras.length} obras vinculadas. Mantenha o compliance atualizado no GD4.`
                    : audits.filter(a => a.classificacao === 'CRÍTICA').length > 0 
                      ? `${audits.filter(a => a.classificacao === 'CRÍTICA').length} unidades com alertas críticos detectados.`
                      : "Todas as unidades monitoradas estão dentro dos parâmetros de conformidade."}
                </p>
              </div>
              <button onClick={() => onNavigate('history')} className="pt-4 flex items-center gap-2 text-xs font-black text-[#F05A22] uppercase tracking-widest hover:underline">
                Análise Detalhada <ChevronRight size={18} />
              </button>
            </div>
            <div className="absolute top-0 right-0 w-40 h-40 bg-[#F05A22]/10 blur-3xl -mr-16 -mt-16 rounded-full group-hover:bg-[#F05A22]/20 transition-all"></div>
          </div>

          <div className="bg-white p-8 rounded-[2.5rem] border-4 border-slate-900 shadow-[8px_8px_0px_0px_rgba(15,23,42,1)]">
            <h3 className="text-sm font-black text-slate-400 uppercase tracking-[0.2em] mb-8">Últimas Atividades</h3>
            <div className="space-y-8">
              {latestAudits.map(audit => {
                const obra = obras.find(o => o.id === audit.obra_id);
                return (
                  <div key={audit.id} className="flex gap-6 relative group">
                    <div className="flex flex-col items-center">
                      <div className={`w-4 h-4 rounded-full shrink-0 z-10 border-2 border-white ring-4 ${audit.classificacao === 'CRÍTICA' ? 'bg-rose-600 ring-rose-100' : 'bg-emerald-500 ring-emerald-100'}`}></div>
                      <div className="w-1 h-full bg-slate-100 absolute top-4"></div>
                    </div>
                    <div className="pb-4">
                      <p className="text-sm font-black text-slate-900 uppercase tracking-tight group-hover:text-[#F05A22] transition-colors">
                        {obra?.nome}
                      </p>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">
                        Score: {audit.indice_geral}% | {audit.tipo}
                      </p>
                      <p className="text-[10px] font-black text-slate-900 bg-slate-100 px-2 py-1 rounded-lg inline-block mt-3">{new Date(audit.created_at).toLocaleDateString('pt-BR')}</p>
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
    className="bg-white p-8 rounded-[2rem] border-4 border-slate-900 shadow-[6px_6px_0px_0px_rgba(15,23,42,1)] flex items-center justify-between cursor-pointer hover:translate-y-[-4px] hover:shadow-[10px_10px_0px_0px_rgba(15,23,42,1)] transition-all group"
  >
    <div>
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 group-hover:text-[#F05A22] transition-colors">{label}</p>
      <p className="text-4xl font-black text-slate-900 tracking-tighter">{value}</p>
    </div>
    <div className={`w-16 h-16 rounded-[1.25rem] flex items-center justify-center transition-all border-2 border-slate-100 group-hover:border-[#F05A22] ${color}`}>
      {React.cloneElement(icon as React.ReactElement, { size: 32 })}
    </div>
  </div>
);

export default Dashboard;
