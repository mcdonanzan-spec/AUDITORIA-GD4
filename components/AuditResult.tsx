
import React from 'react';
import { 
  CheckCircle2, 
  AlertTriangle, 
  ShieldAlert, 
  FileText, 
  ArrowLeft,
  Download,
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import { Audit, AIAnalysisResult } from '../types';

interface AuditResultProps {
  audit: Audit;
  report: AIAnalysisResult;
  onClose: () => void;
}

const AuditResult: React.FC<AuditResultProps> = ({ audit, report, onClose }) => {
  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <button 
            onClick={onClose}
            className="flex items-center gap-1 text-xs font-bold text-slate-500 uppercase tracking-widest hover:text-emerald-600 mb-2"
          >
            <ArrowLeft size={14} />
            Voltar ao Dashboard
          </button>
          <h1 className="text-3xl font-bold text-slate-900">Resultado da Auditoria</h1>
          <p className="text-slate-600 font-medium">Relatório técnico de risco gerado por IA.</p>
        </div>
        <div className="flex gap-2">
          <button className="flex items-center gap-2 bg-slate-200 text-slate-800 px-4 py-2 rounded-lg font-bold text-sm hover:bg-slate-300 transition-all border border-slate-300">
            <Download size={18} />
            Baixar PDF
          </button>
          <button className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20">
            <ExternalLink size={18} />
            Compartilhar
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Scoring Card */}
        <div className="bg-white p-8 rounded-2xl border border-slate-300 shadow-sm flex flex-col items-center justify-center text-center space-y-4">
          <div className="relative">
            <svg className="w-32 h-32 transform -rotate-90">
              <circle
                cx="64"
                cy="64"
                r="58"
                stroke="currentColor"
                strokeWidth="12"
                fill="transparent"
                className="text-slate-100"
              />
              <circle
                cx="64"
                cy="64"
                r="58"
                stroke="currentColor"
                strokeWidth="12"
                fill="transparent"
                strokeDasharray={364.4}
                strokeDashoffset={364.4 - (364.4 * report.indiceGeral) / 100}
                className={`${report.indiceGeral > 75 ? 'text-emerald-500' : report.indiceGeral > 50 ? 'text-amber-500' : 'text-rose-500'} transition-all duration-1000 ease-out`}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-bold text-slate-900">{report.indiceGeral}%</span>
              <span className="text-[10px] font-bold text-slate-500 uppercase">Score Geral</span>
            </div>
          </div>
          <div>
            <span className={`
              px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest
              ${report.classificacao === 'REGULAR' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-rose-100 text-rose-800 border border-rose-200'}
            `}>
              {report.classificacao}
            </span>
          </div>
        </div>

        {/* Risk Card */}
        <div className="md:col-span-2 bg-slate-900 text-white p-8 rounded-2xl shadow-xl flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <ShieldAlert className="text-rose-400" />
              <h3 className="font-bold text-lg uppercase tracking-tight">Risco Jurídico de Terceiros</h3>
            </div>
            <p className="text-slate-200 text-sm leading-relaxed font-medium">
              Nível de exposição <span className="text-rose-400 font-black underline">{report.riscoJuridico}</span>. 
              A análise detectou fragilidades em processos que podem gerar responsabilidade solidária/subsidiária.
            </p>
            <div className="bg-white/10 p-4 rounded-xl border border-white/20">
              <p className="text-xs font-bold text-emerald-400 uppercase tracking-widest mb-2">Impacto Potencial</p>
              <p className="text-sm text-white font-medium">{report.impactoJuridico}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Non Conformities - TEXTO MAIS ESCURO (slate-900) */}
        <section className="space-y-4">
          <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <AlertTriangle className="text-rose-600" size={24} />
            Não Conformidades Críticas
          </h3>
          <div className="space-y-3">
            {report.naoConformidades.map((item, idx) => (
              <div key={idx} className="bg-white p-4 rounded-xl border-l-4 border-l-rose-600 border border-slate-300 shadow-sm flex items-start gap-3">
                <span className="bg-rose-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 shadow-sm">{idx + 1}</span>
                <p className="text-sm text-slate-900 font-bold leading-relaxed">{item}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Recommendations - TEXTO MAIS ESCURO (slate-900) */}
        <section className="space-y-4">
          <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <CheckCircle2 className="text-emerald-600" size={24} />
            Plano de Ação (GD4)
          </h3>
          <div className="space-y-3">
            {report.recomendacoes.map((item, idx) => (
              <div key={idx} className="bg-white p-4 rounded-xl border-l-4 border-l-emerald-600 border border-slate-300 shadow-sm flex items-start gap-3">
                <ChevronRight className="text-emerald-600 shrink-0" />
                <p className="text-sm text-slate-900 font-bold leading-relaxed">{item}</p>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="bg-white p-8 rounded-2xl border border-slate-300 shadow-sm space-y-4">
        <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <FileText className="text-blue-600" size={24} />
          Conclusão Executiva para Diretoria
        </h3>
        <p className="text-slate-900 text-base leading-relaxed font-bold italic border-l-4 border-emerald-500 pl-6 bg-slate-50 py-4">
          "{report.conclusaoExecutiva}"
        </p>
      </section>
    </div>
  );
};

export default AuditResult;
