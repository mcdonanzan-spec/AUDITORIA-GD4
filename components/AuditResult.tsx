
import React from 'react';
import { 
  ShieldAlert, 
  FileText, 
  ArrowLeft,
  Download,
  ShieldCheck,
  AlertOctagon,
  ListCheck,
  Building2,
  UserCheck,
  Users2,
  Loader2,
  Coins,
  TrendingDown,
  Users,
  Info,
  Database,
  ArrowRightLeft,
  Scale,
  Gavel,
  Calculator
} from 'lucide-react';
import { Audit, AIAnalysisResult } from '../types';
import { QUESTIONS, INTERVIEW_QUESTIONS } from '../constants';
import { UnitaLogo } from './Layout';

interface AuditResultProps {
  audit: Audit;
  report: AIAnalysisResult;
  onClose: () => void;
}

const AuditResult: React.FC<AuditResultProps> = ({ audit, report, onClose }) => {
  const [isGenerating, setIsGenerating] = React.useState(false);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const getStatusColors = (score: number) => {
    if (score >= 85) return {
      bg: 'bg-emerald-600',
      light: 'bg-emerald-50',
      border: 'border-emerald-700',
      text: 'text-emerald-700',
      icon: <ShieldCheck className="text-emerald-500" size={24} />
    };
    if (score >= 70) return {
      bg: 'bg-amber-500',
      light: 'bg-amber-50',
      border: 'border-amber-600',
      text: 'text-amber-700',
      icon: <AlertOctagon className="text-amber-500" size={24} />
    };
    return {
      bg: 'bg-rose-600',
      light: 'bg-rose-50',
      border: 'border-rose-700',
      text: 'text-rose-700',
      icon: <ShieldAlert className="text-rose-500" size={24} />
    };
  };

  const statusStyle = getStatusColors(report.indiceGeral);

  const handleGeneratePDF = async () => {
    if (isGenerating) return;
    setIsGenerating(true);

    try {
      // 1. Localizar o elemento
      const element = document.getElementById('relatorio-tecnico-unita');
      if (!element) throw new Error("Elemento não encontrado");

      // 2. Garantir que todas as imagens estão carregadas antes de iniciar
      const images = Array.from(element.getElementsByTagName('img'));
      await Promise.all(images.map(img => {
        if (img.complete) return Promise.resolve();
        return new Promise(resolve => {
          img.onload = resolve;
          img.onerror = resolve;
        });
      }));

      // 3. Aguardar renderização final das fontes e estilos
      await new Promise(resolve => setTimeout(resolve, 1000));

      // 4. Configuração otimizada para evitar páginas em branco
      const opt = {
        margin: [10, 10, 10, 10],
        filename: `Unita_Relatorio_${audit.obra_id}_${Date.now()}.pdf`,
        image: { type: 'jpeg', quality: 1.0 },
        html2canvas: { 
          scale: 2, 
          useCORS: true, 
          logging: false,
          letterRendering: true,
          allowTaint: true,
          backgroundColor: '#FFFFFF',
          // Importante: garante que capture do topo
          scrollY: -window.scrollY,
          windowWidth: document.documentElement.offsetWidth,
        },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
      };

      // 5. Executar geração
      // @ts-ignore
      await html2pdf().set(opt).from(element).save();

    } catch (error) {
      console.error("Erro na geração do PDF:", error);
      alert("Houve um erro técnico na geração do arquivo. Por favor, tente novamente.");
    } finally {
      setIsGenerating(false);
    }
  };

  const coverage = React.useMemo(() => {
    const total = audit.equipe_campo || 1;
    const entrevistados = audit.entrevistas?.length || 0;
    return Math.round((entrevistados / total) * 100);
  }, [audit]);

  const isMetodologyValid = coverage >= 10;
  const divergenciaEfetivo = Math.abs((audit.equipe_campo || 0) - (audit.equipe_gd4 || 0));

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-24 animate-in fade-in duration-500">
      
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 print-hidden">
        <div>
          <button onClick={onClose} className="flex items-center gap-1 text-xs font-black text-slate-500 uppercase tracking-widest hover:text-[#F05A22] mb-2">
            <ArrowLeft size={14} /> Voltar ao Dashboard
          </button>
          <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Conclusão da Inspeção</h1>
          <p className="text-slate-600 font-bold uppercase text-[10px] tracking-widest">Protocolo Unità Engenharia S.A.</p>
        </div>
        <div className="flex gap-3">
          <button 
            type="button"
            disabled={isGenerating}
            onClick={handleGeneratePDF} 
            className="flex items-center gap-3 bg-[#F05A22] text-white px-8 py-5 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-slate-900 transition-all border-4 border-slate-900 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] active:translate-y-1 active:shadow-none disabled:opacity-70 disabled:cursor-wait"
          >
            {isGenerating ? (
              <>
                <Loader2 className="animate-spin" size={20} />
                Gerando Documento...
              </>
            ) : (
              <>
                <Download size={20} />
                Baixar Relatório Oficial (PDF)
              </>
            )}
          </button>
        </div>
      </header>

      {/* Container Principal do Relatório - Classes explícitas de visibilidade e cor */}
      <div 
        id="relatorio-tecnico-unita" 
        className="bg-white p-8 md:p-12 space-y-12 text-slate-900 border-x-2 border-slate-100 min-h-[1000px] visible opacity-100"
        style={{ backgroundColor: '#FFFFFF', color: '#0f172a' }}
      >
        
        {/* CABEÇALHO DO RELATÓRIO PDF */}
        <div className="flex justify-between items-start border-b-8 border-slate-900 pb-10 mb-10 break-inside-avoid bg-white">
          <UnitaLogo className="scale-125 origin-left" />
          <div className="text-right">
            <h2 className="text-3xl font-black uppercase tracking-tighter leading-none text-slate-900">Relatório de Conformidade</h2>
            <p className="font-black uppercase text-[12px] text-slate-500 tracking-widest mt-1">Governança Digital de Terceiros e Riscos</p>
            
            <div className="mt-6 grid grid-cols-2 gap-x-12 gap-y-2 text-[11px] font-black uppercase text-slate-500 text-left border-l-4 border-slate-100 pl-6">
               <div>
                  <p>Canteiro: <span className="text-slate-900">{audit.obra_id}</span></p>
                  <p>Protocolo: <span className="text-slate-900">AR-{audit.id.split('-')[1]}</span></p>
                  <p>Data/Hora: <span className="text-slate-900">{new Date(audit.created_at).toLocaleString('pt-BR')}</span></p>
               </div>
               <div className="border-l-2 border-slate-100 pl-6">
                  <p>Efetivo em Campo: <span className="text-[#F05A22]">{audit.equipe_campo || 0} Pessoas</span></p>
                  <p>Amostragem Real: <span className="text-[#F05A22]">{coverage}% do Efetivo</span></p>
                  <p>Metodologia: <span className={isMetodologyValid ? 'text-emerald-600' : 'text-rose-600'}>{isMetodologyValid ? 'VALIDADA' : 'INSUFICIENTE'}</span></p>
               </div>
            </div>
          </div>
        </div>

        {/* INDICADORES PRINCIPAIS */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 break-inside-avoid bg-white">
          <div className="bg-slate-50 p-6 rounded-[2rem] border-2 border-slate-200 flex flex-col items-center text-center relative overflow-hidden group">
             <Users className="text-[#F05A22] mb-2" size={24} />
             <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Efetivo Total</p>
             <p className="text-2xl font-black text-slate-900">{audit.equipe_campo || 0}</p>
          </div>
          <div className="bg-slate-50 p-6 rounded-[2rem] border-2 border-slate-200 flex flex-col items-center text-center relative overflow-hidden group">
             <UserCheck className="text-emerald-500 mb-2" size={24} />
             <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Auditados In Loco</p>
             <p className="text-2xl font-black text-slate-900">{audit.entrevistas?.length || 0}</p>
          </div>
          
          <div className={`${statusStyle.bg} p-6 rounded-[2rem] border-2 ${statusStyle.border} flex flex-col items-center text-center shadow-lg text-white group relative`}>
             <p className="text-[8px] font-black opacity-80 uppercase tracking-widest mb-1">Score Conformidade</p>
             <p className="text-3xl font-black leading-none mb-2">{report.indiceGeral}%</p>
          </div>

          <div className={`${statusStyle.bg} p-6 rounded-[2rem] border-2 ${statusStyle.border} flex flex-col items-center text-center shadow-lg text-white group relative`}>
             <p className="text-[8px] font-black opacity-80 uppercase tracking-widest mb-1">Status Final</p>
             <p className="text-lg font-black uppercase leading-none mb-2">{report.classificacao}</p>
          </div>
        </div>

        {/* ANÁLISE DE EFETIVO */}
        <div className="space-y-6 break-inside-avoid bg-white">
          <h3 className="text-xl font-black text-slate-900 flex items-center gap-3 uppercase tracking-tighter border-l-8 border-slate-900 pl-4">
            Análise de Efetivo e Quarteirização
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="col-span-1 md:col-span-2 bg-slate-50 rounded-[2rem] border-4 border-slate-900 p-8 flex items-center justify-between shadow-[8px_8px_0px_0px_rgba(240,90,34,1)]">
               <div className="space-y-6 w-full">
                  <div className="flex items-center justify-between pb-4 border-b-2 border-slate-200">
                     <div className="flex items-center gap-3">
                        <Users className="text-[#F05A22]" size={20} />
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Efetivo Real (Campo)</span>
                     </div>
                     <span className="text-2xl font-black text-slate-900">{audit.equipe_campo}</span>
                  </div>
                  <div className="flex items-center justify-between pb-4 border-b-2 border-slate-200">
                     <div className="flex items-center gap-3">
                        <Database className="text-slate-900" size={20} />
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Efetivo no GD4 (Sistêmico)</span>
                     </div>
                     <span className="text-2xl font-black text-slate-900">{audit.equipe_gd4}</span>
                  </div>
                  <div className={`flex items-center justify-between pt-2 ${divergenciaEfetivo > 0 ? 'text-rose-600 font-bold' : 'text-emerald-600 font-bold'}`}>
                     <div className="flex items-center gap-3">
                        <ArrowRightLeft size={20} />
                        <span className="text-[10px] font-black uppercase tracking-widest">Divergência Detectada</span>
                     </div>
                     <span className="text-2xl font-black">{divergenciaEfetivo} {divergenciaEfetivo === 1 ? 'Pessoa' : 'Pessoas'}</span>
                  </div>
               </div>
            </div>

            <div className={`rounded-[2rem] border-4 p-8 flex flex-col items-center justify-center text-center gap-4 shadow-[8px_8px_0px_0px_rgba(15,23,42,1)] ${audit.subcontratacao_identificada ? 'bg-rose-50 border-rose-600' : 'bg-emerald-50 border-emerald-600'}`}>
               <Scale size={40} className={audit.subcontratacao_identificada ? 'text-rose-600' : 'text-emerald-600'} />
               <div>
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Quarteirização</p>
                  <p className={`text-sm font-black uppercase ${audit.subcontratacao_identificada ? 'text-rose-900' : 'text-emerald-900'}`}>
                     {audit.subcontratacao_identificada ? 'Irregularidade Identificada' : 'Totalmente Regularizada'}
                  </p>
               </div>
            </div>
          </div>
        </div>

        {/* EXPOSIÇÃO FINANCEIRA COM DETALHAMENTO DE CÁLCULO */}
        <div className="space-y-6 break-inside-avoid bg-white">
          <div className="bg-white rounded-[2.5rem] border-4 border-slate-900 overflow-hidden shadow-[12px_12px_0px_0px_rgba(15,23,42,1)]">
             <div className="bg-slate-900 p-6 flex items-center justify-between">
                <div className="flex items-center gap-4">
                   <div className="w-12 h-12 bg-[#F05A22] rounded-xl flex items-center justify-center text-white border-2 border-white/20">
                      <Coins size={28} />
                   </div>
                   <div>
                      <h3 className="text-white font-black uppercase text-xs tracking-widest">Exposição Financeira Potencial</h3>
                      <p className="text-[#F05A22] font-black text-[10px] uppercase tracking-tighter">Cálculo de Risco Projetado sobre Efetivo Total ({audit.equipe_campo} p.)</p>
                   </div>
                </div>
                <TrendingDown className={report.exposicaoFinanceira > 0 ? 'text-rose-500' : 'text-emerald-500'} size={32} />
             </div>
             <div className="p-10 flex flex-col md:flex-row items-center justify-between gap-8 border-b-2 border-slate-100 bg-white">
                <div className="text-center md:text-left">
                   <p className="text-6xl font-black text-slate-900 tracking-tighter">
                     {formatCurrency(report.exposicaoFinanceira)}
                   </p>
                   <p className="text-xs font-black text-slate-400 uppercase tracking-widest mt-2">Passivo Trabalhista e Previdenciário Estimado</p>
                </div>
                <div className="flex-1 max-w-sm">
                   <div className={`p-6 rounded-2xl border-2 flex items-center gap-4 ${statusStyle.light} ${statusStyle.border}`}>
                      <div className="shrink-0">{statusStyle.icon}</div>
                      <div>
                         <p className={`text-[10px] font-black uppercase ${statusStyle.text}`}>Matriz de Risco</p>
                         <p className={`text-xl font-black uppercase ${statusStyle.text}`}>{report.riscoJuridico}</p>
                      </div>
                   </div>
                </div>
             </div>
             
             <div className="px-10 pb-10 pt-10 bg-white">
                <div className="bg-slate-50 border-2 border-slate-100 rounded-3xl p-6 space-y-4 break-inside-avoid">
                   <div className="flex items-center gap-2 mb-2">
                      <Calculator size={18} className="text-[#F05A22]" />
                      <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Memória de Cálculo e Base Legal</h4>
                   </div>
                   <div className="space-y-3">
                      {report.detalhamentoCalculo?.map((calc, i) => (
                        <div key={i} className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-slate-200 pb-3 last:border-0 last:pb-0 break-inside-avoid">
                           <div className="flex-1">
                              <p className="text-[11px] font-black text-slate-900 uppercase leading-tight">{calc.item}</p>
                              <div className="flex items-center gap-2 mt-1">
                                 <Gavel size={10} className="text-slate-400" />
                                 <p className="text-[9px] font-bold text-slate-500 uppercase">{calc.baseLegal}</p>
                              </div>
                              <p className="text-[9px] text-slate-400 font-medium italic mt-1">{calc.logica}</p>
                           </div>
                           <div className="text-right">
                              <span className="text-xs font-black text-rose-600">{formatCurrency(calc.valor)}</span>
                           </div>
                        </div>
                      ))}
                   </div>
                </div>
             </div>
          </div>
        </div>

        {/* EVIDÊNCIAS DE CHECKLIST */}
        <div className="space-y-6 break-inside-avoid bg-white">
          <h3 className="text-xl font-black text-slate-900 flex items-center gap-3 uppercase tracking-tighter border-l-8 border-[#F05A22] pl-4">
            Evidências do Checklist (Campo)
          </h3>
          <div className="grid grid-cols-1 gap-4">
             {QUESTIONS.map(q => {
               const r = audit.respostas.find(res => res.pergunta_id === q.id);
               if (!r) return null;
               return (
                 <div key={q.id} className="flex items-start gap-4 p-5 bg-slate-50 rounded-2xl border border-slate-200 break-inside-avoid shadow-sm">
                    <div className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center font-black text-[12px] text-white border-2 border-slate-900 shadow-sm ${r.resposta === 'sim' ? 'bg-emerald-500' : r.resposta === 'nao' ? 'bg-rose-500' : 'bg-amber-500'}`}>
                      {r.resposta.toUpperCase()}
                    </div>
                    <div className="flex-1 space-y-2">
                       <p className="text-[13px] font-black text-slate-900 uppercase tracking-tight leading-tight">{q.texto}</p>
                       {r.observacao && <p className="text-[11px] text-rose-600 font-black uppercase bg-white p-2 border border-rose-100 rounded-lg">⚠️ OBS: {r.observacao}</p>}
                       {r.fotos && r.fotos.length > 0 && (
                         <div className="flex gap-3 pt-2">
                            {r.fotos.map((f, i) => <img key={i} src={f} className="w-24 h-24 rounded-xl border-2 border-slate-300 object-cover shadow-sm" />)}
                         </div>
                       )}
                    </div>
                 </div>
               )
             })}
          </div>
        </div>

        {/* AMOSTRAGEM DE ENTREVISTAS */}
        <div className="space-y-6 break-inside-avoid bg-white">
          <h3 className="text-xl font-black text-slate-900 flex items-center gap-3 uppercase tracking-tighter border-l-8 border-[#F05A22] pl-4">
            Detalhamento da Amostragem ({audit.entrevistas?.length} Colaboradores)
          </h3>
          <div className="space-y-4">
             {audit.entrevistas?.map((ent, idx) => (
               <div key={ent.id} className="border-4 border-slate-100 rounded-[2.5rem] overflow-hidden break-inside-avoid shadow-sm bg-white">
                  <div className="bg-slate-900 p-5 flex justify-between items-center text-white">
                     <div className="flex items-center gap-4">
                        <span className="w-10 h-10 bg-[#F05A22] text-white rounded-xl flex items-center justify-center font-black text-sm border-2 border-white/20">{idx + 1}</span>
                        <div className="flex flex-col">
                          <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Função Auditada</span>
                          <span className="text-sm font-black uppercase tracking-tight text-white">{ent.funcao || 'NÃO INFORMADA'}</span>
                        </div>
                     </div>
                     <div className="flex items-center gap-2 text-right">
                        <Building2 size={16} className="text-[#F05A22]" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-100">{ent.empresa || 'NÃO INFORMADA'}</span>
                     </div>
                  </div>
                  <div className="p-6 grid grid-cols-2 gap-4 bg-white">
                     {ent.respostas.map(r => (
                       <div key={r.pergunta_id} className="flex justify-between items-center bg-slate-50 p-3 rounded-2xl border border-slate-200">
                          <span className="text-[10px] font-black text-slate-600 uppercase flex-1 pr-3 leading-tight">
                             {INTERVIEW_QUESTIONS.find(iq => iq.id === r.pergunta_id)?.texto}
                          </span>
                          <span className={`text-[10px] font-black uppercase px-3 py-1.5 rounded-xl border ${r.resposta === 'sim' ? 'text-emerald-700 bg-emerald-50 border-emerald-200' : r.resposta === 'parcial' ? 'text-amber-700 bg-amber-50 border-amber-200' : 'text-rose-700 bg-rose-50 border-rose-200'}`}>
                             {r.resposta}
                          </span>
                       </div>
                     ))}
                  </div>
               </div>
             ))}
          </div>
        </div>

        {/* CONCLUSÃO E ASSINATURAS */}
        <section className="bg-white p-12 rounded-[3rem] border-8 border-slate-900 text-slate-900 space-y-10 break-inside-avoid mt-16 relative overflow-hidden shadow-2xl bg-white">
          <div className="flex items-center gap-3">
            <FileText className="text-[#F05A22]" size={40} />
            <h3 className="text-3xl font-black uppercase tracking-tighter text-slate-900">Conclusão Executiva</h3>
          </div>
          <p className="text-xl leading-relaxed font-black italic border-l-[12px] border-[#F05A22] pl-10 py-6 bg-slate-50 rounded-r-2xl">
            "{report.conclusaoExecutiva}"
          </p>
          
          <div className="pt-24 space-y-20">
             <div className="grid grid-cols-2 gap-20">
                <div className="flex flex-col items-center">
                   <div className="w-full h-24 border-b-4 border-slate-200 flex items-center justify-center mb-6 relative">
                      <span className="text-[11px] text-slate-200 font-bold uppercase tracking-[0.5em] absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 select-none pointer-events-none text-center px-4">
                         Autenticação Digital Unità
                      </span>
                   </div>
                   <p className="text-[14px] font-black uppercase tracking-widest text-slate-900">Departamento de Auditoria</p>
                   <p className="text-[10px] font-bold text-slate-400 mt-2 uppercase tracking-tighter italic">Responsável Governança</p>
                </div>
                <div className="flex flex-col items-center">
                   <div className="w-full h-24 border-b-4 border-slate-200 flex items-center justify-center mb-6 relative">
                      <span className="text-[11px] text-slate-200 font-bold uppercase tracking-[0.5em] absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 select-none pointer-events-none text-center px-4">
                         Visto Engenheiro Residente
                      </span>
                   </div>
                   <p className="text-[14px] font-black uppercase tracking-widest text-slate-900">Responsável pela Unidade</p>
                   <p className="text-[10px] font-bold text-slate-400 mt-2 uppercase tracking-tighter italic">Ciente do Risco Consolidado</p>
                </div>
             </div>

             <div className="pt-10 border-t-2 border-slate-100 flex justify-between items-center text-slate-400">
                <div className="flex flex-col text-[10px] font-black uppercase tracking-widest">
                   <span>ID PROTOCOLO: {audit.id.toUpperCase()}</span>
                </div>
                <div className="text-right flex flex-col items-end">
                   <span className="text-[9px] font-black uppercase tracking-widest">Tecnologia AuditRisk Unità Engenharia S.A.</span>
                   <span className="text-[12px] font-black text-[#F05A22] uppercase tracking-tighter">Conformidade Operacional v2.5</span>
                </div>
             </div>
          </div>
        </section>

        <div className="pt-16 pb-10 text-center text-[10px] font-black text-slate-200 uppercase tracking-[0.6em] break-inside-avoid bg-white">
           DOCUMENTO CONFIDENCIAL - USO INTERNO EXCLUSIVO
        </div>
      </div>
    </div>
  );
};

export default AuditResult;
