
import React from 'react';
import { 
  CheckCircle2, 
  AlertTriangle, 
  ShieldAlert, 
  FileText, 
  ArrowLeft,
  Download,
  Share2,
  ChevronRight,
  Users2,
  Fingerprint
} from 'lucide-react';
import { Audit, AIAnalysisResult } from '../types';

interface AuditResultProps {
  audit: Audit;
  report: AIAnalysisResult;
  onClose: () => void;
}

const AuditResult: React.FC<AuditResultProps> = ({ audit, report, onClose }) => {
  const handlePrint = () => {
    window.print();
  };

  const handleShare = async () => {
    const shareData = {
      title: `Auditoria Unità - ${audit.classificacao}`,
      text: `Relatório de Conformidade: Score ${report.indiceGeral}% - Risco ${report.riscoJuridico}`,
      url: window.location.href
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(`${shareData.title}\n${shareData.text}`);
        alert('Resumo copiado para a área de transferência!');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const coverage = React.useMemo(() => {
    const total = audit.equipe_campo || 1;
    const entrevistados = audit.entrevistas?.length || 0;
    return Math.round((entrevistados / total) * 100);
  }, [audit]);

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12 animate-in fade-in duration-500 print:p-0">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
        <div>
          <button 
            onClick={onClose}
            className="flex items-center gap-1 text-xs font-black text-slate-500 uppercase tracking-widest hover:text-[#F05A22] mb-2"
          >
            <ArrowLeft size={14} />
            Voltar ao Dashboard
          </button>
          <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Relatório Unità</h1>
          <p className="text-slate-600 font-bold uppercase text-[10px] tracking-widest">Protocolo de Inteligência AuditRisk</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={handlePrint}
            className="flex items-center gap-2 bg-white text-slate-900 px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-slate-50 transition-all border-4 border-slate-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-y-1"
          >
            <Download size={18} />
            Gerar PDF
          </button>
          <button 
            onClick={handleShare}
            className="flex items-center gap-2 bg-[#F05A22] text-white px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-slate-900 transition-all border-4 border-slate-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-y-1"
          >
            <Share2 size={18} />
            Compartilhar
          </button>
        </div>
      </header>

      {/* Amostragem Highlights */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 print:grid-cols-2">
        <div className="bg-slate-50 p-6 rounded-[2rem] border-4 border-slate-900 flex items-center gap-5">
           <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center border-2 border-slate-200 shadow-inner">
              <Users2 className="text-[#F05A22]" size={32} />
           </div>
           <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Amostragem Realizada</p>
              <p className="text-xl font-black text-slate-900 uppercase tracking-tighter">
                {audit.entrevistas?.length || 0} Colaboradores Ouvidos
              </p>
           </div>
        </div>
        <div className="bg-slate-50 p-6 rounded-[2rem] border-4 border-slate-900 flex items-center gap-5">
           <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center border-2 border-slate-200 shadow-inner">
              <Fingerprint className="text-[#F05A22]" size={32} />
           </div>
           <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Cobertura Estatística</p>
              <p className={`text-xl font-black uppercase tracking-tighter ${coverage < 10 ? 'text-rose-600' : 'text-emerald-600'}`}>
                {coverage}% do Efetivo de Campo
              </p>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 print:grid-cols-3">
        {/* Scoring Card */}
        <div className="bg-white p-8 rounded-[2.5rem] border-4 border-slate-900 shadow-[8px_8px_0px_0px_rgba(15,23,42,1)] flex flex-col items-center justify-center text-center space-y-4">
          <div className="relative">
            <svg className="w-32 h-32 transform -rotate-90">
              <circle
                cx="64"
                cy="64"
                r="54"
                stroke="currentColor"
                strokeWidth="12"
                fill="transparent"
                className="text-slate-100"
              />
              <circle
                cx="64"
                cy="64"
                r="54"
                stroke="currentColor"
                strokeWidth="12"
                fill="transparent"
                strokeDasharray={339.2}
                strokeDashoffset={339.2 - (339.2 * report.indiceGeral) / 100}
                className={`${report.indiceGeral > 75 ? 'text-emerald-500' : report.indiceGeral > 50 ? 'text-[#F05A22]' : 'text-rose-600'} transition-all duration-1000 ease-out`}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-black text-slate-900 tracking-tighter">{report.indiceGeral}%</span>
              <span className="text-[10px] font-black text-slate-400 uppercase">Score Unità</span>
            </div>
          </div>
          <div>
            <span className={`
              px-5 py-2 rounded-xl text-xs font-black uppercase tracking-widest border-2
              ${report.classificacao === 'REGULAR' ? 'bg-emerald-50 text-emerald-800 border-emerald-600' : 'bg-rose-50 text-rose-800 border-rose-600'}
            `}>
              {report.classificacao}
            </span>
          </div>
        </div>

        {/* Risk Card */}
        <div className="md:col-span-2 bg-slate-900 text-white p-10 rounded-[2.5rem] border-4 border-slate-900 shadow-[8px_8px_0px_0px_rgba(240,90,34,1)] flex flex-col justify-between">
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <ShieldAlert className="text-[#F05A22]" size={32} />
              <h3 className="font-black text-xl uppercase tracking-tighter">Matriz de Risco Jurídico</h3>
            </div>
            <p className="text-slate-300 text-sm leading-relaxed font-bold uppercase tracking-wide">
              Nível de exposição <span className="text-[#F05A22] font-black underline decoration-4 underline-offset-4">{report.riscoJuridico}</span>. 
            </p>
            <div className="bg-white/5 p-6 rounded-2xl border-2 border-white/10">
              <p className="text-[10px] font-black text-[#F05A22] uppercase tracking-[0.2em] mb-2">Impacto Potencial Identificado</p>
              <p className="text-sm text-white font-black uppercase tracking-tight leading-tight">{report.impactoJuridico}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 print:grid-cols-2">
        <section className="space-y-6">
          <h3 className="text-xl font-black text-slate-900 flex items-center gap-3 uppercase tracking-tighter">
            <AlertTriangle className="text-rose-600" size={28} />
            Não Conformidades
          </h3>
          <div className="space-y-3">
            {report.naoConformidades.map((item, idx) => (
              <div key={idx} className="bg-white p-5 rounded-2xl border-4 border-slate-100 border-l-rose-600 shadow-sm flex items-start gap-4">
                <span className="bg-rose-600 text-white w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black shrink-0 shadow-lg">{idx + 1}</span>
                <p className="text-sm text-slate-900 font-black uppercase tracking-tight leading-snug">{item}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-6">
          <h3 className="text-xl font-black text-slate-900 flex items-center gap-3 uppercase tracking-tighter">
            <CheckCircle2 className="text-emerald-600" size={28} />
            Plano de Ação Sugerido
          </h3>
          <div className="space-y-3">
            {report.recomendacoes.map((item, idx) => (
              <div key={idx} className="bg-white p-5 rounded-2xl border-4 border-slate-100 border-l-emerald-600 shadow-sm flex items-start gap-4">
                <ChevronRight className="text-emerald-600 shrink-0 mt-1" />
                <p className="text-sm text-slate-900 font-black uppercase tracking-tight leading-snug">{item}</p>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="bg-slate-900 p-10 rounded-[2.5rem] border-4 border-slate-900 shadow-[8px_8px_0px_0px_rgba(240,90,34,1)] space-y-6">
        <h3 className="text-xl font-black text-white flex items-center gap-3 uppercase tracking-tighter">
          <FileText className="text-[#F05A22]" size={32} />
          Conclusão Executiva
        </h3>
        <p className="text-white text-lg leading-relaxed font-black italic border-l-8 border-[#F05A22] pl-8 py-2">
          "{report.conclusaoExecutiva}"
        </p>
      </section>

      {/* Hidden element for specific print layout if needed */}
      <div className="hidden print:block text-[10px] text-slate-400 font-black uppercase tracking-widest text-center pt-20">
        Relatório Gerado por AuditRisk - Unità Engenharia S.A.
      </div>
    </div>
  );
};

export default AuditResult;
