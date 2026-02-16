
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
    if (score >= 85) return { bg: 'bg-emerald-600', light: 'bg-emerald-50', border: 'border-emerald-700', text: 'text-emerald-700', icon: <ShieldCheck className="text-emerald-500" size={24} /> };
    if (score >= 70) return { bg: 'bg-amber-500', light: 'bg-amber-50', border: 'border-amber-600', text: 'text-amber-700', icon: <AlertOctagon className="text-amber-500" size={24} /> };
    return { bg: 'bg-rose-600', light: 'bg-rose-50', border: 'border-rose-700', text: 'text-rose-700', icon: <ShieldAlert className="text-rose-500" size={24} /> };
  };

  const statusStyle = getStatusColors(report.indiceGeral);

  const handleGeneratePDF = async () => {
    if (isGenerating) return;
    setIsGenerating(true);

    try {
      const original = document.getElementById('relatorio-conteudo-pdf');
      if (!original) throw new Error("Conteúdo não renderizado.");

      // 1. Criar Sandbox para Impressão (Resolve o erro de página em branco)
      const sandbox = original.cloneNode(true) as HTMLElement;
      sandbox.style.position = 'fixed';
      sandbox.style.left = '-9999px';
      sandbox.style.top = '0';
      sandbox.style.width = '800px'; // Largura A4 estável
      sandbox.style.height = 'auto';
      sandbox.style.padding = '40px';
      sandbox.style.backgroundColor = 'white';
      sandbox.style.opacity = '1';
      sandbox.style.visibility = 'visible';
      
      // Remover animações do clone que causam PDF em branco
      sandbox.classList.remove('animate-in', 'fade-in', 'duration-500');
      
      document.body.appendChild(sandbox);

      // 2. Garantir que todas as imagens estão prontas
      const images = Array.from(sandbox.getElementsByTagName('img'));
      await Promise.all(images.map(img => {
        if (img.complete) return Promise.resolve();
        return new Promise(resolve => { img.onload = resolve; img.onerror = resolve; });
      }));

      // Aguardar estabilização do DOM
      await new Promise(r => setTimeout(r, 500));

      const opt = {
        margin: [10, 10, 10, 10],
        filename: `Unita_Audit_${audit.obra_id}_${Date.now()}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { 
          scale: 2, 
          useCORS: true, 
          letterRendering: true,
          backgroundColor: '#FFFFFF',
          scrollY: 0
        },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
      };

      // @ts-ignore
      await html2pdf().set(opt).from(sandbox).save();
      
      document.body.removeChild(sandbox);
    } catch (error) {
      console.error(error);
      alert("Erro ao gerar PDF. Tente novamente.");
    } finally {
      setIsGenerating(false);
    }
  };

  const coverage = Math.round(((audit.entrevistas?.length || 0) / (audit.equipe_campo || 1)) * 100);

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-24 animate-in fade-in duration-500">
      <header className="flex justify-between items-center print-hidden">
        <div>
          <button onClick={onClose} className="flex items-center gap-1 text-xs font-black text-slate-500 uppercase tracking-widest hover:text-[#F05A22] mb-2">
            <ArrowLeft size={14} /> Painel de Controle
          </button>
          <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Resultado Técnico</h1>
        </div>
        <button 
          onClick={handleGeneratePDF}
          disabled={isGenerating}
          className="bg-[#F05A22] text-white px-8 py-4 rounded-2xl font-black text-sm uppercase tracking-widest flex items-center gap-3 border-4 border-slate-900 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:bg-slate-900 transition-all disabled:opacity-50"
        >
          {isGenerating ? <Loader2 className="animate-spin" size={20} /> : <Download size={20} />}
          Gerar PDF Oficial
        </button>
      </header>

      {/* Relatório Real que será capturado */}
      <div id="relatorio-conteudo-pdf" className="bg-white p-1 md:p-4 space-y-12 text-slate-900">
        
        <div className="flex justify-between items-start border-b-8 border-slate-900 pb-10">
          <UnitaLogo className="scale-125 origin-left" />
          <div className="text-right">
            <h2 className="text-2xl font-black uppercase text-slate-900">Relatório de Conformidade</h2>
            <div className="mt-4 text-[11px] font-black uppercase text-slate-500 border-l-4 border-[#F05A22] pl-4 text-left">
              <p>Canteiro: {audit.obra_id}</p>
              <p>Data: {new Date(audit.created_at).toLocaleDateString('pt-BR')}</p>
              <p>Efetivo: {audit.equipe_campo} p. | Amostra: {coverage}%</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-slate-50 p-6 rounded-[2rem] border-2 border-slate-200 text-center">
             <Users className="text-[#F05A22] mx-auto mb-2" size={24} />
             <p className="text-[10px] font-black text-slate-400 uppercase">Total Campo</p>
             <p className="text-2xl font-black">{audit.equipe_campo}</p>
          </div>
          <div className="bg-slate-50 p-6 rounded-[2rem] border-2 border-slate-200 text-center">
             <UserCheck className="text-emerald-500 mx-auto mb-2" size={24} />
             <p className="text-[10px] font-black text-slate-400 uppercase">Auditados</p>
             <p className="text-2xl font-black">{audit.entrevistas?.length}</p>
          </div>
          <div className={`${statusStyle.bg} p-6 rounded-[2rem] border-2 ${statusStyle.border} text-center text-white`}>
             <p className="text-[10px] font-black opacity-80 uppercase">Score</p>
             <p className="text-3xl font-black">{report.indiceGeral}%</p>
          </div>
          <div className={`${statusStyle.bg} p-6 rounded-[2rem] border-2 ${statusStyle.border} text-center text-white`}>
             <p className="text-[10px] font-black opacity-80 uppercase">Risco</p>
             <p className="text-xl font-black">{report.riscoJuridico}</p>
          </div>
        </div>

        <div className="bg-white rounded-[2.5rem] border-4 border-slate-900 overflow-hidden shadow-[10px_10px_0px_0px_rgba(15,23,42,1)]">
           <div className="bg-slate-900 p-6 flex items-center justify-between text-white">
              <h3 className="font-black uppercase text-xs tracking-widest">Passivo Jurídico Projetado</h3>
              <Coins size={24} className="text-[#F05A22]" />
           </div>
           <div className="p-10 flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="text-center md:text-left">
                 <p className="text-5xl font-black text-slate-900 tracking-tighter">{formatCurrency(report.exposicaoFinanceira)}</p>
                 <p className="text-[10px] font-black text-slate-400 uppercase mt-2">Estimativa de Exposição Trabalhista</p>
              </div>
              <div className="bg-slate-50 p-6 rounded-2xl border-2 border-slate-200 w-full max-w-xs">
                 <p className="text-[10px] font-black uppercase text-slate-500">Impacto Direto</p>
                 <p className="text-xs font-bold text-slate-900 italic">"{report.impactoJuridico}"</p>
              </div>
           </div>
           
           <div className="px-10 pb-10">
              <div className="bg-slate-50 rounded-3xl p-6 border-2 border-slate-100">
                <h4 className="text-[10px] font-black uppercase text-slate-900 mb-4">Memória de Cálculo</h4>
                <div className="space-y-3">
                  {report.detalhamentoCalculo?.map((calc, i) => (
                    <div key={i} className="flex justify-between items-start border-b border-slate-200 pb-2 last:border-0">
                      <div>
                        <p className="text-[11px] font-black text-slate-900 uppercase">{calc.item}</p>
                        <p className="text-[9px] text-slate-500 font-bold">{calc.baseLegal}</p>
                      </div>
                      <span className="text-xs font-black text-rose-600">{formatCurrency(calc.valor)}</span>
                    </div>
                  ))}
                </div>
              </div>
           </div>
        </div>

        <div className="space-y-6">
          <h3 className="text-xl font-black text-slate-900 border-l-8 border-[#F05A22] pl-4 uppercase">Evidências de Campo</h3>
          <div className="grid grid-cols-1 gap-3">
            {audit.respostas.filter(r => r.resposta !== 'sim' && r.resposta !== 'n_a').map((r, i) => (
              <div key={i} className="bg-rose-50 p-4 rounded-2xl border-2 border-rose-100 flex gap-4">
                 <AlertOctagon className="text-rose-600 shrink-0" size={20} />
                 <div>
                    <p className="text-[11px] font-black text-slate-900 uppercase">{QUESTIONS.find(q => q.id === r.pergunta_id)?.texto}</p>
                    <p className="text-[10px] font-bold text-rose-700 mt-1 uppercase italic">Desvio: {r.observacao}</p>
                    {r.fotos && r.fotos.length > 0 && (
                      <div className="flex gap-2 mt-2">
                        {r.fotos.map((f, fi) => <img key={fi} src={f} className="w-16 h-16 rounded-lg object-cover border-2 border-white" />)}
                      </div>
                    )}
                 </div>
              </div>
            ))}
          </div>
        </div>

        <section className="bg-slate-900 text-white p-10 rounded-[3rem] space-y-8">
          <h3 className="text-2xl font-black uppercase tracking-tighter">Conclusão Executiva</h3>
          <p className="text-lg italic font-medium leading-relaxed border-l-4 border-[#F05A22] pl-6">"{report.conclusaoExecutiva}"</p>
          <div className="pt-20 grid grid-cols-2 gap-20">
             <div className="text-center border-t border-white/20 pt-4">
                <p className="text-[10px] font-black uppercase tracking-widest">Auditoria Corporativa</p>
             </div>
             <div className="text-center border-t border-white/20 pt-4">
                <p className="text-[10px] font-black uppercase tracking-widest">Gestão de Unidade</p>
             </div>
          </div>
        </section>

        <p className="text-center text-[8px] font-black text-slate-300 uppercase tracking-[0.5em] pt-10">Confidencial Unità Engenharia S.A.</p>
      </div>
    </div>
  );
};

export default AuditResult;
