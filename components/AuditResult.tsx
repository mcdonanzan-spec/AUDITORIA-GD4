
import React from 'react';
import { 
  ArrowLeft,
  Download,
  ShieldCheck,
  Users,
  Loader2,
  Scale,
  AlertTriangle,
  CheckCircle2,
  FileText,
  UserCheck,
  Building2,
  Clock
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

  const handleGeneratePDF = async () => {
    if (isGenerating) return;
    setIsGenerating(true);
    const element = document.getElementById('relatorio-unita-premium');
    if (!element) return;

    const opt = {
      margin: [0, 0, 0, 0],
      filename: `RELATORIO_UNITA_${audit.id}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, letterRendering: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    try {
      // @ts-ignore
      await html2pdf().set(opt).from(element).save();
    } catch (err) {
      console.error(err);
    } finally {
      setIsGenerating(false);
    }
  };

  const divergencia = Math.abs((audit.equipe_campo || 0) - (audit.equipe_gd4 || 0));

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-20">
      <header className="flex justify-between items-center print:hidden">
        <button onClick={onClose} className="flex items-center gap-2 font-black text-[10px] text-slate-500 uppercase tracking-widest hover:text-[#F05A22]">
          <ArrowLeft size={14} /> Voltar ao Painel
        </button>
        <button 
          onClick={handleGeneratePDF}
          disabled={isGenerating}
          className="bg-[#F05A22] text-white px-8 py-4 rounded-2xl font-black text-xs uppercase border-4 border-slate-900 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] flex items-center gap-3 transition-all active:translate-y-1 active:shadow-none"
        >
          {isGenerating ? <Loader2 className="animate-spin" /> : <Download size={18} />}
          Exportar Relatório PDF
        </button>
      </header>

      {/* DOCUMENTO PDF START */}
      <div id="relatorio-unita-premium" className="bg-white min-h-[297mm] text-slate-900 font-sans p-10 space-y-8 shadow-2xl border-t-[12px] border-slate-900">
        
        {/* HEADER PADRÃO PREMIUM */}
        <div className="flex justify-between items-start border-b-4 border-slate-100 pb-8">
          <UnitaLogo className="scale-125 origin-left" />
          <div className="text-right space-y-1">
            <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Relatório de Conformidade</h1>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Governança Digital de Terceiros e Riscos</p>
          </div>
        </div>

        {/* METADADOS DA AUDITORIA */}
        <div className="grid grid-cols-2 gap-10 text-[10px] font-bold uppercase tracking-tight text-slate-500">
          <div className="space-y-2">
            <p>Canteiro: <span className="text-slate-900">{audit.obra_id}</span></p>
            <p>Protocolo: <span className="text-slate-900">AR-{audit.id.split('-')[1]}</span></p>
            <p>Data/Hora: <span className="text-slate-900">{new Date(audit.created_at).toLocaleString('pt-BR')}</span></p>
          </div>
          <div className="space-y-2 text-right">
            <p>Efetivo em Campo: <span className="text-slate-900">{audit.equipe_campo} Pessoas</span></p>
            <p>Amostragem Real: <span className="text-[#F05A22]">{audit.entrevistas?.length || 0} ({Math.round(((audit.entrevistas?.length || 0)/(audit.equipe_campo || 1))*100)}% do Efetivo)</span></p>
            <p>Metodologia: <span className="text-emerald-600">VALIDADA</span></p>
          </div>
        </div>

        {/* BLOCOS DE STATUS SUPERIOR */}
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-slate-50 border-2 border-slate-100 p-6 rounded-[2rem] text-center space-y-1">
            <Users className="mx-auto text-slate-300" size={24} />
            <p className="text-[8px] font-black text-slate-400 uppercase">Efetivo Total</p>
            <p className="text-2xl font-black">{audit.equipe_campo}</p>
          </div>
          <div className="bg-slate-50 border-2 border-slate-100 p-6 rounded-[2rem] text-center space-y-1">
            <UserCheck className="mx-auto text-slate-300" size={24} />
            <p className="text-[8px] font-black text-slate-400 uppercase">Auditados in Loco</p>
            <p className="text-2xl font-black">{audit.entrevistas?.length}</p>
          </div>
          <div className="bg-amber-500 text-white p-6 rounded-[2rem] text-center space-y-1 shadow-lg shadow-amber-200">
            <p className="text-[8px] font-black opacity-80 uppercase">Score Conformidade</p>
            <p className="text-3xl font-black">{report.indiceGeral}%</p>
          </div>
          <div className="bg-[#F05A22] text-white p-6 rounded-[2rem] text-center space-y-1 shadow-lg shadow-orange-200">
            <p className="text-[8px] font-black opacity-80 uppercase">Status Final</p>
            <p className="text-xl font-black uppercase tracking-tighter">{report.classificacao}</p>
          </div>
        </div>

        {/* ANÁLISE DE EFETIVO */}
        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-2 border-4 border-slate-900 p-8 rounded-[2.5rem] space-y-6">
            <h3 className="text-xs font-black uppercase flex items-center gap-2 border-b-2 border-slate-100 pb-4"><Users size={16} className="text-[#F05A22]" /> Análise de Efetivo e Quarteirização</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-black text-slate-400 uppercase">Efetivo Real (Campo)</span>
                <span className="text-lg font-black">{audit.equipe_campo}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-black text-slate-400 uppercase">Efetivo no GD4 (Sistêmico)</span>
                <span className="text-lg font-black">{audit.equipe_gd4}</span>
              </div>
              <div className="flex justify-between items-center pt-4 border-t-2 border-dashed border-slate-200">
                <span className="text-[10px] font-black text-rose-600 uppercase">Divergência Detectada</span>
                <span className="text-lg font-black text-rose-600">{divergencia} Pessoas</span>
              </div>
            </div>
          </div>
          <div className="border-4 border-emerald-500 bg-emerald-50 p-8 rounded-[2.5rem] flex flex-col items-center justify-center text-center space-y-4">
            <Scale size={48} className="text-emerald-500" />
            <div>
              <p className="text-[8px] font-black text-emerald-800 uppercase tracking-widest">Quarteirização</p>
              <p className="text-xs font-black text-emerald-900 uppercase">Totalmente Regularizada</p>
            </div>
          </div>
        </div>

        {/* EXPOSIÇÃO FINANCEIRA POTENCIAL */}
        <div className="bg-slate-900 rounded-[3rem] p-10 text-white space-y-8">
          <div className="flex justify-between items-center border-b border-slate-700 pb-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-[#F05A22] rounded-2xl"><Scale size={24} /></div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-[#F05A22]">Exposição Financeira Potencial</p>
                <p className="text-[8px] opacity-50 uppercase">Cálculo de risco projetado sobre efetivo total</p>
              </div>
            </div>
            <div className="bg-white text-slate-900 px-6 py-3 rounded-2xl flex items-center gap-3">
              <AlertTriangle size={20} className="text-amber-500" />
              <div className="text-right">
                <p className="text-[8px] font-black uppercase opacity-50 leading-none">Matriz de Risco</p>
                <p className="text-sm font-black uppercase leading-none">{report.riscoJuridico}</p>
              </div>
            </div>
          </div>

          <div className="flex items-baseline gap-4">
            <h2 className="text-6xl font-black tracking-tighter">{formatCurrency(report.exposicaoFinanceira)}</h2>
            <p className="text-[10px] font-bold text-slate-500 uppercase">Passivo Trabalhista e Previdenciário Estimado</p>
          </div>

          {/* MEMÓRIA DE CÁLCULO */}
          <div className="space-y-4 bg-slate-800/50 p-6 rounded-3xl border border-slate-700">
             <p className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2"><FileText size={14} className="text-slate-500" /> Memória de Cálculo e Base Legal</p>
             <div className="space-y-4">
               {report.detalhamentoCalculo.map((item, idx) => (
                 <div key={idx} className="flex justify-between items-start text-xs border-b border-slate-700 pb-3 last:border-0">
                    <div className="space-y-1">
                      <p className="font-black uppercase">{item.item}</p>
                      <p className="text-[9px] opacity-60 flex items-center gap-1 leading-tight"><Scale size={10} /> {item.baseLegal} - {item.logica}</p>
                    </div>
                    <p className="font-black text-[#F05A22]">{formatCurrency(item.valor)}</p>
                 </div>
               ))}
             </div>
          </div>
        </div>

        {/* EVIDÊNCIAS DO CHECKLIST */}
        <div className="space-y-6">
          <h3 className="text-xl font-black uppercase border-l-8 border-[#F05A22] pl-4 tracking-tighter">Evidências do Checklist (Campo)</h3>
          <div className="space-y-3">
            {audit.respostas.map((r, i) => {
              const q = QUESTIONS.find(qi => qi.id === r.pergunta_id);
              if (!q) return null;
              return (
                <div key={i} className="flex items-center gap-4 bg-slate-50 p-4 rounded-3xl border border-slate-100">
                   <div className={`w-14 h-14 rounded-2xl flex flex-col items-center justify-center font-black text-[10px] border-2 shadow-sm ${r.resposta === 'sim' ? 'bg-emerald-500 text-white border-slate-900' : 'bg-amber-500 text-white border-slate-900'}`}>
                     <span>{r.resposta.toUpperCase()}</span>
                   </div>
                   <div className="flex-1 space-y-1">
                     <p className="text-[10px] font-black uppercase leading-tight">{q.texto}</p>
                     {r.observacao && <p className="text-[9px] font-bold text-rose-600 uppercase italic leading-none">⚠️ OBS: {r.observacao}</p>}
                   </div>
                   {r.fotos && r.fotos.length > 0 && (
                     <div className="flex gap-1">
                       {r.fotos.slice(0, 3).map((f, fi) => <img key={fi} src={f} className="w-12 h-12 rounded-lg border-2 border-white shadow-sm object-cover" />)}
                     </div>
                   )}
                </div>
              );
            })}
          </div>
        </div>

        {/* DETALHAMENTO AMOSTRAGEM */}
        <div className="space-y-6 break-before-page">
           <h3 className="text-xl font-black uppercase border-l-8 border-[#F05A22] pl-4 tracking-tighter">Detalhamento da Amostragem ({audit.entrevistas?.length} Colaboradores)</h3>
           <div className="grid grid-cols-1 gap-4">
             {audit.entrevistas?.map((ent, idx) => (
               <div key={idx} className="bg-slate-50 rounded-[2.5rem] p-6 border border-slate-200">
                  <div className="flex justify-between items-center mb-6">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-slate-900 text-white rounded-full flex items-center justify-center font-black">{idx + 1}</div>
                      <div>
                        <p className="text-[8px] font-black text-slate-400 uppercase leading-none">Função Auditada</p>
                        <p className="text-sm font-black uppercase">{ent.funcao}</p>
                      </div>
                    </div>
                    <div className="text-right">
                       <p className="text-[10px] font-black uppercase text-[#F05A22]"><Building2 className="inline mr-1" size={14} /> {ent.empresa}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                     {ent.respostas.map((er, ei) => (
                       <div key={ei} className="bg-white p-3 rounded-2xl flex justify-between items-center border border-slate-100 shadow-sm">
                          <span className="text-[8px] font-black text-slate-500 uppercase leading-tight">{INTERVIEW_QUESTIONS.find(iq => iq.id === er.pergunta_id)?.texto}</span>
                          <span className={`text-[10px] font-black uppercase px-2 py-1 rounded-lg ${er.resposta === 'sim' ? 'text-emerald-600' : 'text-rose-600 bg-rose-50'}`}>{er.resposta}</span>
                       </div>
                     ))}
                  </div>
               </div>
             ))}
           </div>
        </div>

        {/* CONCLUSÃO EXECUTIVA */}
        <div className="border-[6px] border-slate-900 rounded-[3rem] p-10 space-y-10 mt-12 bg-white relative">
           <div className="flex items-center gap-4 border-b-2 border-slate-100 pb-6">
              <FileText className="text-[#F05A22]" size={32} />
              <h3 className="text-2xl font-black uppercase tracking-tighter">Conclusão Executiva</h3>
           </div>
           <p className="text-lg font-bold italic text-slate-800 leading-relaxed text-center px-10">"{report.conclusaoExecutiva}"</p>
           
           <div className="grid grid-cols-2 gap-20 pt-10">
              <div className="text-center space-y-2">
                 <div className="h-px bg-slate-300 w-full mb-4"></div>
                 <p className="text-[8px] font-black uppercase tracking-[0.3em] text-slate-400">Assinatura Digital Auditrisk</p>
                 <p className="text-[10px] font-black uppercase">Auditor Unità S.A.</p>
                 <p className="text-[8px] text-slate-400">Responsável pela Coleta</p>
              </div>
              <div className="text-center space-y-2">
                 <div className="h-px bg-slate-300 w-full mb-4"></div>
                 <p className="text-[8px] font-black uppercase tracking-[0.3em] text-slate-400">Assinatura Responsável Obra</p>
                 <p className="text-[10px] font-black uppercase">Engenheiro da Unidade</p>
                 <p className="text-[8px] text-slate-400">Ciente do Risco de {audit.equipe_campo} P.</p>
              </div>
           </div>

           <div className="flex justify-between items-center text-[8px] font-black text-slate-300 uppercase tracking-widest pt-8">
              <span>ID Relatório: {audit.id}</span>
              <div className="text-right">
                <p>Tecnologia Auditrisk v2.5</p>
                <p className="text-[#F05A22]">Unità Engenharia S.A.</p>
              </div>
           </div>
        </div>

        <div className="text-center text-[9px] font-black text-slate-200 uppercase tracking-[0.6em] pt-10">
           Documento Confidencial - Uso Interno
        </div>
      </div>
    </div>
  );
};

export default AuditResult;
