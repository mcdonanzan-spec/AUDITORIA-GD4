
import React from 'react';
import { 
  ShieldAlert, 
  FileText, 
  ArrowLeft,
  Download,
  ShieldCheck,
  AlertOctagon,
  Building2,
  UserCheck,
  Users,
  Loader2,
  Coins,
  TrendingDown,
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
          // CORREÇÃO CRÍTICA: Força visibilidade total no documento clonado
          const report = clonedDoc.getElementById('relatorio-unita-premium');
          if (report) {
            report.style.opacity = '1';
            report.style.visibility = 'visible';
            report.style.display = 'block';
            // Remove classes de animação que podem causar transparência
            const animatedElements = report.querySelectorAll('.animate-in, .fade-in');
            animatedElements.forEach((el: any) => {
              el.classList.remove('animate-in', 'fade-in', 'duration-500');
              el.style.opacity = '1';
            });
          }
        }
      },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
    };

    try {
      // @ts-ignore
      await html2pdf().set(opt).from(element).save();
    } catch (err) {
      console.error(err);
      alert("Falha ao gerar PDF.");
    } finally {
      setIsGenerating(false);
    }
  };

  const coverage = Math.round(((audit.entrevistas?.length || 0) / (audit.equipe_campo || 1)) * 100);

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-32 animate-in fade-in duration-500">
      
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 print-hidden">
        <div>
          <button onClick={onClose} className="flex items-center gap-1 text-xs font-black text-slate-500 uppercase tracking-widest hover:text-[#F05A22] mb-2">
            <ArrowLeft size={14} /> Voltar ao Painel
          </button>
          <h1 className="text-4xl font-black text-slate-900 uppercase tracking-tighter">Relatório Consolidado</h1>
          <p className="text-slate-500 font-bold uppercase text-[10px] tracking-widest">Inteligência de Risco Unità S.A.</p>
        </div>
        <button 
          onClick={handleGeneratePDF}
          disabled={isGenerating}
          className="bg-[#F05A22] text-white px-10 py-5 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-slate-900 transition-all border-4 border-slate-900 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] flex items-center gap-3 active:translate-y-1 active:shadow-none disabled:opacity-50"
        >
          {isGenerating ? <Loader2 className="animate-spin" size={20} /> : <Download size={20} />}
          Baixar Documento PDF
        </button>
      </header>

      {/* ÁREA DO RELATÓRIO COM ESTÉTICA PREMIUM */}
      <div id="relatorio-unita-premium" className="bg-white p-4 md:p-10 space-y-12 text-slate-900 border-x-4 border-slate-50">
        
        {/* HEADER PDF */}
        <div className="flex justify-between items-start border-b-8 border-slate-900 pb-10 mb-10 bg-white">
          <UnitaLogo className="scale-125 origin-left" />
          <div className="text-right">
            <h2 className="text-3xl font-black uppercase tracking-tighter leading-none text-slate-900">Protocolo de Conformidade</h2>
            <div className="mt-6 grid grid-cols-2 gap-x-8 text-[11px] font-black uppercase text-slate-500 text-left border-l-4 border-slate-900 pl-6">
               <div>
                  <p>Unidade: <span className="text-slate-900">{audit.obra_id}</span></p>
                  <p>ID Auditoria: <span className="text-slate-900">{audit.id.split('-')[1]}</span></p>
               </div>
               <div className="border-l-2 border-slate-100 pl-6">
                  <p>Data: <span className="text-slate-900">{new Date(audit.created_at).toLocaleDateString('pt-BR')}</span></p>
                  <p>Amostragem: <span className="text-[#F05A22]">{coverage}% do Efetivo</span></p>
               </div>
            </div>
          </div>
        </div>

        {/* INDICADORES DE IMPACTO */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 bg-white">
          <div className="bg-slate-50 p-6 rounded-[2rem] border-4 border-slate-900 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] text-center">
             <Users className="text-[#F05A22] mx-auto mb-2" size={28} />
             <p className="text-[10px] font-black text-slate-400 uppercase">Efetivo Total</p>
             <p className="text-3xl font-black">{audit.equipe_campo}</p>
          </div>
          <div className="bg-slate-50 p-6 rounded-[2rem] border-4 border-slate-900 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] text-center">
             <UserCheck className="text-emerald-500 mx-auto mb-2" size={28} />
             <p className="text-[10px] font-black text-slate-400 uppercase">Auditados</p>
             <p className="text-3xl font-black">{audit.entrevistas?.length}</p>
          </div>
          <div className={`${statusStyle.bg} p-6 rounded-[2rem] border-4 border-slate-900 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] text-center text-white`}>
             <p className="text-[10px] font-black opacity-80 uppercase">Scoring</p>
             <p className="text-4xl font-black">{report.indiceGeral}%</p>
          </div>
          <div className={`${statusStyle.bg} p-6 rounded-[2rem] border-4 border-slate-900 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] text-center text-white`}>
             <p className="text-[10px] font-black opacity-80 uppercase">Risco Jurídico</p>
             <p className="text-xl font-black uppercase tracking-tighter">{report.riscoJuridico}</p>
          </div>
        </div>

        {/* EXPOSIÇÃO FINANCEIRA - CARD BRUTALISTA */}
        <div className="bg-white rounded-[3rem] border-8 border-slate-900 overflow-hidden shadow-[12px_12px_0px_0px_rgba(240,90,34,1)]">
           <div className="bg-slate-900 p-8 flex items-center justify-between">
              <div className="flex items-center gap-4">
                 <div className="w-14 h-14 bg-[#F05A22] rounded-2xl flex items-center justify-center text-white border-2 border-white/20">
                    <Coins size={32} />
                 </div>
                 <div>
                    <h3 className="text-white font-black uppercase text-sm tracking-widest">Exposição Financeira Estimada</h3>
                    <p className="text-[#F05A22] font-black text-[10px] uppercase">Cálculo projetado sobre o passivo latente</p>
                 </div>
              </div>
              <TrendingDown className="text-rose-500" size={40} />
           </div>
           
           <div className="p-12 flex flex-col md:flex-row items-center justify-between gap-10 bg-white">
              <div className="text-center md:text-left">
                 <p className="text-7xl font-black text-slate-900 tracking-tighter">
                   {formatCurrency(report.exposicaoFinanceira)}
                 </p>
                 <p className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mt-2">Passivo Trabalhista e Previdenciário</p>
              </div>
              <div className="flex-1 max-w-sm">
                 <div className="p-8 rounded-3xl border-4 border-slate-900 bg-slate-50 space-y-3">
                    <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Impacto em Compliance</p>
                    <p className="text-sm font-bold text-slate-900 leading-relaxed italic">"{report.impactoJuridico}"</p>
                 </div>
              </div>
           </div>

           <div className="px-12 pb-12 bg-white">
              <div className="bg-slate-50 border-4 border-slate-100 rounded-[2rem] p-8 space-y-4">
                 <h4 className="text-xs font-black text-slate-900 uppercase flex items-center gap-3">
                    <Calculator size={20} className="text-[#F05A22]" /> Memória de Cálculo e Base Legal
                 </h4>
                 <div className="grid grid-cols-1 gap-4 mt-6">
                    {report.detalhamentoCalculo?.map((calc, i) => (
                      <div key={i} className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b-2 border-slate-200 pb-4 last:border-0 last:pb-0">
                         <div className="flex-1">
                            <p className="text-[12px] font-black text-slate-900 uppercase">{calc.item}</p>
                            <div className="flex items-center gap-2 mt-1">
                               <Gavel size={12} className="text-slate-400" />
                               <p className="text-[10px] font-bold text-slate-500 uppercase">{calc.baseLegal}</p>
                            </div>
                         </div>
                         <div className="text-right">
                            <span className="text-lg font-black text-rose-600">{formatCurrency(calc.valor)}</span>
                         </div>
                      </div>
                    ))}
                 </div>
              </div>
           </div>
        </div>

        {/* EVIDÊNCIAS E NÃO CONFORMIDADES */}
        <div className="space-y-8 bg-white">
          <h3 className="text-2xl font-black text-slate-900 flex items-center gap-4 uppercase tracking-tighter border-l-8 border-[#F05A22] pl-6">
            Não Conformidades Identificadas
          </h3>
          <div className="grid grid-cols-1 gap-4">
             {audit.respostas.filter(r => r.resposta !== 'sim' && r.resposta !== 'n_a').map((r, i) => (
               <div key={i} className="flex items-start gap-6 p-6 bg-rose-50 rounded-3xl border-4 border-rose-200 shadow-sm">
                  <div className="shrink-0 w-12 h-12 bg-rose-600 text-white rounded-2xl flex items-center justify-center font-black border-4 border-slate-900">
                    !
                  </div>
                  <div className="flex-1 space-y-3">
                     <p className="text-[14px] font-black text-slate-900 uppercase tracking-tight">
                       {QUESTIONS.find(q => q.id === r.pergunta_id)?.texto}
                     </p>
                     <p className="text-xs font-bold text-rose-800 bg-white/50 p-4 rounded-xl border border-rose-200 uppercase">
                       <span className="text-rose-600 mr-2">DESVIO:</span> {r.observacao}
                     </p>
                     {r.fotos && r.fotos.length > 0 && (
                       <div className="flex gap-4 pt-2">
                          {r.fotos.map((f, fi) => (
                            <img key={fi} src={f} className="w-24 h-24 rounded-2xl border-4 border-white object-cover shadow-md" />
                          ))}
                       </div>
                     )}
                  </div>
               </div>
             ))}
          </div>
        </div>

        {/* CONCLUSÃO E ASSINATURA */}
        <section className="bg-slate-900 text-white p-12 rounded-[3.5rem] border-8 border-slate-900 shadow-[15px_15px_0px_0px_rgba(240,90,34,1)] relative overflow-hidden">
          <div className="relative z-10 space-y-10">
            <div className="flex items-center gap-4">
               <FileText className="text-[#F05A22]" size={48} />
               <h3 className="text-4xl font-black uppercase tracking-tighter">Conclusão Executiva</h3>
            </div>
            
            <p className="text-2xl leading-relaxed font-black italic border-l-8 border-[#F05A22] pl-10 py-4">
              "{report.conclusaoExecutiva}"
            </p>

            <div className="pt-24 grid grid-cols-2 gap-20">
               <div className="flex flex-col items-center">
                  <div className="w-full h-px bg-white/20 mb-6"></div>
                  <p className="text-[12px] font-black uppercase tracking-widest text-[#F05A22]">Auditor Unità S.A.</p>
                  <p className="text-[10px] text-white/50 uppercase font-bold mt-2">Protocolo de Governança</p>
               </div>
               <div className="flex flex-col items-center">
                  <div className="w-full h-px bg-white/20 mb-6"></div>
                  <p className="text-[12px] font-black uppercase tracking-widest text-white">Engenharia Residente</p>
                  <p className="text-[10px] text-white/50 uppercase font-bold mt-2">Ciente dos Riscos</p>
               </div>
            </div>
          </div>
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#F05A22]/10 blur-[100px] rounded-full"></div>
        </section>

        <div className="pt-10 text-center text-[10px] font-black text-slate-300 uppercase tracking-[0.6em]">
           DOCUMENTO CONFIDENCIAL - USO INTERNO EXCLUSIVO
        </div>
      </div>
    </div>
  );
};

export default AuditResult;
