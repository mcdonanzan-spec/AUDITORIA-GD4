
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
  TrendingDown
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
    setIsGenerating(true);
    const element = document.getElementById('relatorio-tecnico-unita');
    if (!element) {
      alert("Erro ao localizar conteúdo do relatório.");
      setIsGenerating(false);
      return;
    }
    const opt = {
      margin: [10, 10, 10, 10],
      filename: `Relatorio_Unita_${audit.obra_id}_${new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, letterRendering: true, backgroundColor: '#FFFFFF' },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };
    try {
      // @ts-ignore
      await html2pdf().set(opt).from(element).save();
    } catch (error) {
      console.error("Erro ao gerar PDF:", error);
      alert("Falha ao gerar o documento.");
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

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-24 animate-in fade-in duration-500">
      
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
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

      <div id="relatorio-tecnico-unita" className="bg-white p-2 md:p-4 space-y-10">
        
        <div className="flex justify-between items-center border-b-8 border-slate-900 pb-10 mb-10">
          <UnitaLogo className="scale-125 origin-left" />
          <div className="text-right">
            <h2 className="text-3xl font-black uppercase tracking-tighter leading-none text-slate-900">Relatório de Conformidade</h2>
            <p className="font-black uppercase text-[12px] text-slate-500 tracking-widest mt-1">Governança Digital de Terceiros e Riscos</p>
            <div className="mt-4 space-y-1 text-[11px] font-black uppercase text-slate-600">
               <p>Canteiro: <span className="text-slate-900">{audit.obra_id}</span></p>
               <p>Protocolo: <span className="text-slate-900">AR-{audit.id.split('-')[1]}</span></p>
               <p>Data/Hora: <span className="text-slate-900">{new Date(audit.created_at).toLocaleString('pt-BR')}</span></p>
            </div>
          </div>
        </div>

        {/* INDICADORES PRINCIPAIS */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-slate-50 p-5 rounded-[1.5rem] border-2 border-slate-200 flex flex-col items-center text-center">
             <Users2 className="text-[#F05A22] mb-2" size={24} />
             <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Efetivo</p>
             <p className="text-lg font-black text-slate-900">{audit.entrevistas?.length || 0}</p>
          </div>
          <div className="bg-slate-50 p-5 rounded-[1.5rem] border-2 border-slate-200 flex flex-col items-center text-center">
             <ShieldCheck className="text-emerald-500 mb-2" size={24} />
             <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Amostragem</p>
             <p className="text-lg font-black text-slate-900">{coverage}%</p>
          </div>
          <div className="bg-slate-900 p-5 rounded-[1.5rem] border-2 border-slate-900 flex flex-col items-center text-center">
             <p className="text-[8px] font-black text-[#F05A22] uppercase tracking-widest mb-1">Score Geral</p>
             <p className="text-2xl font-black text-white">{report.indiceGeral}%</p>
          </div>
          <div className={`p-5 rounded-[1.5rem] border-2 flex flex-col items-center text-center ${report.classificacao === 'CRÍTICA' ? 'bg-rose-600 border-rose-700 text-white' : 'bg-emerald-600 border-emerald-700 text-white'}`}>
             <p className="text-[8px] font-black opacity-80 uppercase tracking-widest mb-1">Status</p>
             <p className="text-sm font-black uppercase">{report.classificacao}</p>
          </div>
        </div>

        {/* CARD DE EXPOSIÇÃO FINANCEIRA - NOVO DESTAQUE */}
        <div className="bg-white rounded-[2.5rem] border-4 border-slate-900 overflow-hidden shadow-[12px_12px_0px_0px_rgba(240,90,34,1)]">
           <div className="bg-slate-900 p-6 flex items-center justify-between">
              <div className="flex items-center gap-4">
                 <div className="w-12 h-12 bg-[#F05A22] rounded-xl flex items-center justify-center text-white border-2 border-white/20">
                    <Coins size={28} />
                 </div>
                 <div>
                    <h3 className="text-white font-black uppercase text-xs tracking-widest">Exposição Financeira Potencial</h3>
                    <p className="text-[#F05A22] font-black text-[10px] uppercase tracking-tighter">Estimativa baseada em NR-28 e Jurisprudência TST</p>
                 </div>
              </div>
              <TrendingDown className={report.exposicaoFinanceira > 0 ? 'text-rose-500' : 'text-emerald-500'} size={32} />
           </div>
           <div className="p-10 flex flex-col md:flex-row items-center justify-between gap-8">
              <div className="text-center md:text-left">
                 <p className="text-6xl font-black text-slate-900 tracking-tighter">
                   {formatCurrency(report.exposicaoFinanceira)}
                 </p>
                 <p className="text-xs font-black text-slate-400 uppercase tracking-widest mt-2">Passivo Trabalhista e Previdenciário Projetado</p>
              </div>
              <div className="flex-1 max-w-sm">
                 <div className={`p-6 rounded-2xl border-2 flex items-center gap-4 ${report.riscoJuridico === 'CRÍTICO' || report.riscoJuridico === 'ALTO' ? 'bg-rose-50 border-rose-200' : 'bg-emerald-50 border-emerald-200'}`}>
                    <ShieldAlert className={report.riscoJuridico === 'CRÍTICO' || report.riscoJuridico === 'ALTO' ? 'text-rose-600' : 'text-emerald-600'} size={40} />
                    <div>
                       <p className="text-[10px] font-black text-slate-500 uppercase">Matriz de Risco</p>
                       <p className={`text-xl font-black uppercase ${report.riscoJuridico === 'CRÍTICO' || report.riscoJuridico === 'ALTO' ? 'text-rose-900' : 'text-emerald-900'}`}>{report.riscoJuridico}</p>
                    </div>
                 </div>
              </div>
           </div>
           <div className="px-10 pb-10">
              <p className="text-xs text-slate-500 font-bold leading-relaxed border-t-2 border-slate-100 pt-6 italic">
                Atenção: Este valor representa uma projeção técnica baseada em amostragem. O montante final pode variar conforme o volume total de colaboradores e frentes de serviço ativas. 
                <span className="text-slate-900 ml-1">Recomenda-se saneamento imediato das não conformidades citadas abaixo.</span>
              </p>
           </div>
        </div>

        {/* Itens de Verificação */}
        <div className="space-y-6">
          <h3 className="text-xl font-black text-slate-900 flex items-center gap-3 uppercase tracking-tighter border-l-8 border-[#F05A22] pl-4">
            Evidências do Checklist (Campo)
          </h3>
          <div className="grid grid-cols-1 gap-2">
             {QUESTIONS.map(q => {
               const r = audit.respostas.find(res => res.pergunta_id === q.id);
               if (!r) return null;
               return (
                 <div key={q.id} className="flex items-start gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-200 break-inside-avoid">
                    <div className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center font-black text-[10px] text-white border-2 border-slate-900 ${r.resposta === 'sim' ? 'bg-emerald-500' : r.resposta === 'nao' ? 'bg-rose-500' : 'bg-amber-500'}`}>
                      {r.resposta.toUpperCase()}
                    </div>
                    <div className="flex-1 space-y-1">
                       <p className="text-[11px] font-black text-slate-900 uppercase tracking-tight leading-tight">{q.texto}</p>
                       {r.observacao && <p className="text-[10px] text-rose-600 font-black uppercase">⚠️ OBS: {r.observacao}</p>}
                       {r.fotos && r.fotos.length > 0 && (
                         <div className="flex gap-2 pt-2">
                            {r.fotos.map((f, i) => <img key={i} src={f} className="w-20 h-20 rounded-lg border-2 border-slate-300 object-cover" />)}
                         </div>
                       )}
                    </div>
                 </div>
               )
             })}
          </div>
        </div>

        {/* Amostragem de Entrevistas */}
        <div className="space-y-6">
          <h3 className="text-xl font-black text-slate-900 flex items-center gap-3 uppercase tracking-tighter border-l-8 border-[#F05A22] pl-4">
            Amostragem de Entrevistas Comportamentais
          </h3>
          <div className="space-y-4">
             {audit.entrevistas?.map((ent, idx) => (
               <div key={ent.id} className="border-2 border-slate-200 rounded-3xl overflow-hidden break-inside-avoid">
                  <div className="bg-slate-100 p-4 flex justify-between items-center">
                     <div className="flex items-center gap-4">
                        <span className="w-8 h-8 bg-slate-900 text-white rounded-lg flex items-center justify-center font-black text-xs">{idx + 1}</span>
                        <div className="flex flex-col">
                          <span className="text-[10px] font-black uppercase text-slate-500">Colaborador</span>
                          <span className="text-xs font-black uppercase tracking-tight text-slate-900">{ent.funcao || 'NÃO INFORMADA'}</span>
                        </div>
                     </div>
                     <div className="flex items-center gap-2 text-right">
                        <Building2 size={14} className="text-[#F05A22]" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-900">{ent.empresa || 'NÃO INFORMADA'}</span>
                     </div>
                  </div>
                  <div className="p-4 grid grid-cols-2 gap-2 bg-white">
                     {ent.respostas.map(r => (
                       <div key={r.pergunta_id} className="flex justify-between items-center bg-slate-50 p-2 rounded-xl border border-slate-100">
                          <span className="text-[9px] font-black text-slate-500 uppercase flex-1 pr-2 leading-none">
                             {INTERVIEW_QUESTIONS.find(iq => iq.id === r.pergunta_id)?.texto}
                          </span>
                          <span className={`text-[9px] font-black uppercase px-2 py-1 rounded-md ${r.resposta === 'sim' ? 'text-emerald-600 bg-emerald-50' : 'text-rose-600 bg-rose-50'}`}>
                             {r.resposta}
                          </span>
                       </div>
                     ))}
                  </div>
               </div>
             ))}
          </div>
        </div>

        {/* Parecer Final e Área de Assinatura */}
        <section className="bg-white p-10 rounded-[2.5rem] border-4 border-slate-900 text-slate-900 space-y-8 break-inside-avoid mt-12 relative overflow-hidden">
          <div className="flex items-center gap-3">
            <FileText className="text-[#F05A22]" size={32} />
            <h3 className="text-2xl font-black uppercase tracking-tighter">Conclusão Executiva</h3>
          </div>
          <p className="text-lg leading-relaxed font-black italic border-l-8 border-slate-900 pl-8 py-4 bg-slate-50">
            "{report.conclusaoExecutiva}"
          </p>
          
          <div className="pt-20 space-y-16">
             <div className="grid grid-cols-2 gap-16">
                <div className="flex flex-col items-center">
                   <div className="w-full h-24 border-b-2 border-slate-300 flex items-center justify-center mb-4 relative">
                      <span className="text-[10px] text-slate-300 font-bold uppercase tracking-[0.4em] absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 select-none pointer-events-none text-center px-4">
                         Espaço para assinatura digital (Gov.br / ICP-Brasil)
                      </span>
                   </div>
                   <p className="text-[12px] font-black uppercase tracking-widest text-slate-900">Auditor Unità S.A.</p>
                   <p className="text-[9px] font-bold text-slate-400 mt-1 uppercase tracking-tighter italic">Responsável pela Coleta</p>
                </div>
                <div className="flex flex-col items-center">
                   <div className="w-full h-24 border-b-2 border-slate-300 flex items-center justify-center mb-4 relative">
                      <span className="text-[10px] text-slate-300 font-bold uppercase tracking-[0.4em] absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 select-none pointer-events-none text-center px-4">
                         Espaço para assinatura digital (Gov.br / ICP-Brasil)
                      </span>
                   </div>
                   <p className="text-[12px] font-black uppercase tracking-widest text-slate-900">Responsável pela Unidade</p>
                   <p className="text-[9px] font-bold text-slate-400 mt-1 uppercase tracking-tighter italic">Ciente do Risco Financeiro</p>
                </div>
             </div>

             <div className="pt-8 border-t border-slate-100 flex justify-between items-center text-slate-400">
                <div className="flex flex-col text-[8px] font-black uppercase tracking-widest">
                   <span>ID RELATÓRIO: {audit.id.toUpperCase()}</span>
                </div>
                <div className="text-right flex flex-col items-end">
                   <span className="text-[8px] font-black uppercase tracking-widest">Tecnologia AuditRisk v2.5</span>
                   <span className="text-[10px] font-black text-[#F05A22] uppercase tracking-tighter">Unità Engenharia S.A.</span>
                </div>
             </div>
          </div>
        </section>

        <div className="pt-10 text-center text-[9px] font-black text-slate-300 uppercase tracking-[0.4em]">
           DOCUMENTO CONFIDENCIAL - USO INTERNO
        </div>
      </div>
    </div>
  );
};

export default AuditResult;
