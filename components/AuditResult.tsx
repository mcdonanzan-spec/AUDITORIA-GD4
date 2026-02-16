
import React from 'react';
import { 
  ShieldAlert, 
  FileText, 
  ArrowLeft,
  Download,
  ShieldCheck,
  AlertOctagon,
  UserCheck,
  Users,
  Loader2,
  Coins,
  TrendingDown,
  Calculator,
  Gavel
} from 'lucide-react';
import { Audit, AIAnalysisResult } from '../types';
import { QUESTIONS } from '../constants';
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
    if (!element) {
      alert("Erro ao localizar conteúdo.");
      setIsGenerating(false);
      return;
    }

    const opt = {
      margin: [10, 5, 10, 5],
      filename: `RELATORIO_UNITA_${audit.obra_id}_${new Date().getTime()}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { 
        scale: 2, 
        useCORS: true, 
        logging: false,
        backgroundColor: '#FFFFFF',
        onclone: (clonedDoc: Document) => {
          // FORÇA VISIBILIDADE TOTAL: Remove Tailwind classes que podem estar com opacity-0 durante a geração
          const clone = clonedDoc.getElementById('relatorio-unita-premium');
          if (clone) {
            clone.style.opacity = '1';
            clone.style.visibility = 'visible';
            clone.style.display = 'block';
            
            const allElements = clone.querySelectorAll('*');
            allElements.forEach((el: any) => {
              el.style.opacity = '1';
              el.style.visibility = 'visible';
              el.style.animation = 'none';
              el.style.transition = 'none';
              el.classList.remove('animate-in', 'fade-in', 'duration-500', 'translate-y-4');
            });
          }
        }
      },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    try {
      // Pequeno delay para garantir que o DOM clonado estabilizou
      await new Promise(r => setTimeout(r, 500));
      // @ts-ignore
      await html2pdf().set(opt).from(element).save();
    } catch (err) {
      console.error(err);
      alert("Falha técnica ao gerar o PDF. Verifique se o script html2pdf está carregado.");
    } finally {
      setIsGenerating(false);
    }
  };

  const statusStyle = report.indiceGeral >= 85 ? 'bg-emerald-600' : report.indiceGeral >= 70 ? 'bg-amber-500' : 'bg-rose-600';

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-32">
      <header className="flex flex-col md:flex-row justify-between items-center gap-4 print-hidden">
        <div>
          <button onClick={onClose} className="text-[10px] font-black text-slate-500 uppercase flex items-center gap-1 hover:text-[#F05A22] transition-colors"><ArrowLeft size={14} /> Voltar ao Painel</button>
          <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Relatório de Governança</h1>
        </div>
        <button 
          onClick={handleGeneratePDF}
          disabled={isGenerating}
          className="bg-[#F05A22] text-white px-10 py-5 rounded-2xl font-black text-sm border-4 border-slate-900 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] disabled:opacity-50 flex items-center gap-3 active:translate-y-1 active:shadow-none transition-all"
        >
          {isGenerating ? <Loader2 className="animate-spin" size={20} /> : <Download size={20} />}
          EXPORTAR RELATÓRIO PDF
        </button>
      </header>

      <div id="relatorio-unita-premium" className="bg-white p-10 space-y-12 text-slate-900 border-x-4 border-slate-50 opacity-100 visible shadow-xl">
        <div className="flex justify-between border-b-8 border-slate-900 pb-10">
          <UnitaLogo className="scale-110 origin-left" />
          <div className="text-right">
            <h2 className="text-2xl font-black uppercase text-slate-900 leading-none">Análise de Risco Digital</h2>
            <p className="text-[10px] font-black uppercase text-slate-500 mt-2">Protocolo Unità: AR-{audit.id.split('-')[1]}</p>
            <p className="text-[10px] font-black uppercase text-slate-900 mt-1">Data: {new Date(audit.created_at).toLocaleDateString('pt-BR')}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-slate-50 p-6 rounded-[2rem] border-4 border-slate-900 text-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Índice Geral</p>
             <p className="text-4xl font-black text-slate-900">{report.indiceGeral}%</p>
          </div>
          <div className={`${statusStyle} p-6 rounded-[2rem] border-4 border-slate-900 text-center text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]`}>
             <p className="text-[10px] font-black opacity-80 uppercase tracking-widest">Risco Jurídico</p>
             <p className="text-xl font-black uppercase tracking-tighter">{report.riscoJuridico}</p>
          </div>
          <div className="bg-slate-900 p-6 rounded-[2rem] border-4 border-slate-900 text-center text-white col-span-2 shadow-[4px_4px_0px_0px_rgba(240,90,34,1)]">
             <p className="text-[10px] font-black opacity-50 uppercase tracking-widest">Exposição Financeira Estimada</p>
             <p className="text-3xl font-black text-[#F05A22] tracking-tighter">{formatCurrency(report.exposicaoFinanceira)}</p>
          </div>
        </div>

        <div className="space-y-6 bg-slate-50 p-8 rounded-[2.5rem] border-4 border-slate-100">
           <h3 className="text-xl font-black uppercase border-l-8 border-[#F05A22] pl-4 tracking-tighter">Conclusão Técnica Executiva</h3>
           <p className="text-lg font-bold italic leading-relaxed text-slate-800">"{report.conclusaoExecutiva}"</p>
        </div>

        <div className="space-y-6">
          <h3 className="text-xl font-black uppercase border-l-8 border-rose-600 pl-4 tracking-tighter">Desvios Identificados (Não Conformidades)</h3>
          <div className="space-y-4">
             {audit.respostas.filter(r => r.resposta !== 'sim' && r.resposta !== 'n_a').map((r, i) => (
               <div key={i} className="p-8 bg-rose-50 border-4 border-rose-200 rounded-[2.5rem] flex items-start gap-6 shadow-sm">
                  <div className="w-12 h-12 shrink-0 bg-rose-600 text-white rounded-2xl flex items-center justify-center font-black text-2xl border-2 border-slate-900">!</div>
                  <div className="space-y-3">
                     <p className="font-black text-slate-900 uppercase text-sm tracking-tight leading-tight">{QUESTIONS.find(q => q.id === r.pergunta_id)?.texto}</p>
                     <div className="bg-white p-4 rounded-xl border-2 border-rose-100 font-bold text-slate-700 text-xs italic uppercase">
                        Evidência: {r.observacao}
                     </div>
                     {r.fotos && r.fotos.length > 0 && (
                        <div className="flex gap-3 mt-4 overflow-hidden">
                           {r.fotos.slice(0, 4).map((f, fi) => <img key={fi} src={f} className="w-24 h-24 rounded-2xl border-4 border-white shadow-lg object-cover" />)}
                        </div>
                     )}
                  </div>
               </div>
             ))}
          </div>
        </div>

        <div className="pt-24 border-t-8 border-slate-900 grid grid-cols-2 gap-20">
           <div className="text-center space-y-4">
              <div className="h-px bg-slate-400 w-full"></div>
              <p className="text-[10px] font-black uppercase text-slate-400 tracking-[0.4em]">Auditor Responsável</p>
              <p className="text-xs font-black uppercase text-slate-900">Unità Engenharia S.A.</p>
           </div>
           <div className="text-center space-y-4">
              <div className="h-px bg-slate-400 w-full"></div>
              <p className="text-[10px] font-black uppercase text-slate-400 tracking-[0.4em]">Gerência de Obra</p>
              <p className="text-xs font-black uppercase text-slate-900">Engenharia de Produção</p>
           </div>
        </div>

        <div className="pt-10 text-center text-[9px] font-black text-slate-300 uppercase tracking-[0.5em]">
           DOCUMENTO CONFIDENCIAL - PROPRIEDADE UNITA S.A.
        </div>
      </div>
    </div>
  );
};

export default AuditResult;
