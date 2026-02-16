
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
  ShieldCheck,
  AlertOctagon,
  ListCheck,
  Building2,
  UserCheck
} from 'lucide-react';
import { Audit, AIAnalysisResult } from '../types';
import { QUESTIONS, INTERVIEW_QUESTIONS, BLOCKS } from '../constants';

interface AuditResultProps {
  audit: Audit;
  report: AIAnalysisResult;
  onClose: () => void;
}

const AuditResult: React.FC<AuditResultProps> = ({ audit, report, onClose }) => {
  const handlePrint = () => {
    // Garante que o CSS de impressão seja aplicado limpando seleções se houver
    window.print();
  };

  const coverage = React.useMemo(() => {
    const total = audit.equipe_campo || 1;
    const entrevistados = audit.entrevistas?.length || 0;
    return Math.round((entrevistados / total) * 100);
  }, [audit]);

  const isMetodologyValid = coverage >= 10;

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-24 animate-in fade-in duration-500 print:p-0 print:space-y-4">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
        <div>
          <button onClick={onClose} className="flex items-center gap-1 text-xs font-black text-slate-500 uppercase tracking-widest hover:text-[#F05A22] mb-2">
            <ArrowLeft size={14} /> Voltar ao Dashboard
          </button>
          <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Relatório de Governança</h1>
          <p className="text-slate-600 font-bold uppercase text-[10px] tracking-widest">Unità Engenharia S.A. - AuditRisk v2.5</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={handlePrint} 
            className="flex items-center gap-2 bg-[#F05A22] text-white px-6 py-4 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-slate-900 transition-all border-4 border-slate-900 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] active:translate-y-1 active:shadow-none"
          >
            <Download size={18} /> Gerar PDF / Imprimir
          </button>
        </div>
      </header>

      {/* Identificação da Obra (Print only) */}
      <div className="hidden print:block border-b-4 border-slate-900 pb-4 mb-4">
        <h2 className="text-2xl font-black uppercase">Relatório Técnico de Governança - Unità Engenharia</h2>
        <div className="grid grid-cols-2 gap-4 mt-2">
          <p className="font-bold uppercase text-xs">Obra: {audit.obra_id}</p>
          <p className="font-bold uppercase text-xs text-right">Data: {new Date(audit.created_at).toLocaleDateString('pt-BR')}</p>
        </div>
      </div>

      {/* Amostragem Highlights */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 print:grid-cols-2">
        <div className="bg-slate-50 p-6 rounded-[2rem] border-4 border-slate-900 flex items-center gap-5">
           <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center border-2 border-slate-200">
              <Users2 className="text-[#F05A22]" size={32} />
           </div>
           <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Equipe Auditada</p>
              <p className="text-xl font-black text-slate-900 uppercase tracking-tighter">{audit.entrevistas?.length || 0} Colaboradores</p>
           </div>
        </div>
        <div className={`p-6 rounded-[2rem] border-4 border-slate-900 flex items-center gap-5 ${isMetodologyValid ? 'bg-emerald-50' : 'bg-rose-50'}`}>
           <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border-2 ${isMetodologyValid ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'}`}>
              {isMetodologyValid ? <ShieldCheck size={32} /> : <AlertOctagon size={32} />}
           </div>
           <div>
              <p className={`text-[10px] font-black uppercase tracking-widest ${isMetodologyValid ? 'text-emerald-600' : 'text-rose-600'}`}>
                {isMetodologyValid ? 'Metodologia Validada' : 'Amostragem Crítica'}
              </p>
              <p className={`text-xl font-black uppercase tracking-tighter ${isMetodologyValid ? 'text-emerald-900' : 'text-rose-900'}`}>Cobertura: {coverage}%</p>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 print:grid-cols-3">
        {/* Scoring Card */}
        <div className="bg-white p-8 rounded-[2.5rem] border-4 border-slate-900 shadow-[8px_8px_0px_0px_rgba(15,23,42,1)] flex flex-col items-center justify-center text-center space-y-4">
          <div className="text-4xl font-black text-slate-900 tracking-tighter">{report.indiceGeral}%</div>
          <span className={`px-5 py-2 rounded-xl text-xs font-black uppercase tracking-widest border-2 ${report.classificacao === 'REGULAR' ? 'bg-emerald-50 text-emerald-800 border-emerald-600' : 'bg-rose-50 text-rose-800 border-rose-600'}`}>
            {report.classificacao}
          </span>
        </div>

        {/* Risk Card */}
        <div className="md:col-span-2 bg-slate-900 text-white p-10 rounded-[2.5rem] border-4 border-slate-900 shadow-[8px_8px_0px_0px_rgba(240,90,34,1)]">
          <div className="space-y-4">
            <div className="flex items-center gap-4 text-[#F05A22]">
              <ShieldAlert size={32} />
              <h3 className="font-black text-xl uppercase tracking-tighter">Matriz de Risco: {report.riscoJuridico}</h3>
            </div>
            <p className="text-sm text-slate-300 font-black uppercase leading-tight">{report.impactoJuridico}</p>
          </div>
        </div>
      </div>

      {/* CHECKLIST DETALHADO DAS PERGUNTAS */}
      <div className="bg-white p-8 rounded-[2.5rem] border-4 border-slate-900 shadow-[8px_8px_0px_0px_rgba(15,23,42,1)] space-y-6 print:shadow-none print:p-4">
        <h3 className="text-xl font-black text-slate-900 flex items-center gap-3 uppercase tracking-tighter">
          <ListCheck className="text-[#F05A22]" size={28} />
          Evidências de Auditoria (Checklist Completo)
        </h3>
        <div className="grid grid-cols-1 gap-3">
           {QUESTIONS.map(q => {
             const r = audit.respostas.find(res => res.pergunta_id === q.id);
             if (!r) return null;
             return (
               <div key={q.id} className="flex items-start gap-4 p-4 bg-slate-50 rounded-2xl border-2 border-slate-100 print:bg-white print:break-inside-avoid">
                  <div className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs text-white border-2 border-slate-900 ${r.resposta === 'sim' ? 'bg-emerald-500' : r.resposta === 'nao' ? 'bg-rose-500' : 'bg-amber-500'}`}>
                    {r.resposta.toUpperCase()}
                  </div>
                  <div className="flex-1 space-y-1">
                     <p className="text-xs font-black text-slate-900 uppercase tracking-tight leading-tight">{q.texto}</p>
                     {r.observacao && <p className="text-[10px] text-rose-600 font-black uppercase">⚠️ OBS: {r.observacao}</p>}
                     {r.fotos && r.fotos.length > 0 && (
                       <div className="flex gap-2 pt-2">
                          {r.fotos.map((f, i) => <img key={i} src={f} className="w-16 h-16 rounded-lg border-2 border-slate-300 object-cover" />)}
                       </div>
                     )}
                  </div>
               </div>
             )
           })}
        </div>
      </div>

      {/* DETALHAMENTO DA AMOSTRAGEM (ENTREVISTAS) */}
      <div className="bg-white p-8 rounded-[2.5rem] border-4 border-slate-900 shadow-[8px_8px_0px_0px_rgba(15,23,42,1)] space-y-6 print:shadow-none print:p-4">
        <h3 className="text-xl font-black text-slate-900 flex items-center gap-3 uppercase tracking-tighter">
          <UserCheck className="text-[#F05A22]" size={28} />
          Detalhamento das Entrevistas (Amostragem)
        </h3>
        <div className="space-y-4">
           {audit.entrevistas?.map((ent, idx) => (
             <div key={ent.id} className="border-2 border-slate-100 rounded-3xl overflow-hidden print:break-inside-avoid">
                <div className="bg-slate-900 text-white p-4 flex justify-between items-center">
                   <div className="flex items-center gap-4">
                      <span className="w-8 h-8 bg-[#F05A22] rounded-lg flex items-center justify-center font-black text-xs">{idx + 1}</span>
                      <div className="flex flex-col">
                        <span className="text-[10px] font-black uppercase text-[#F05A22]">Colaborador</span>
                        <span className="text-xs font-black uppercase tracking-tight">{ent.funcao || 'NÃO INFORMADO'}</span>
                      </div>
                   </div>
                   <div className="flex items-center gap-2 text-right">
                      <Building2 size={14} className="text-[#F05A22]" />
                      <span className="text-[10px] font-black uppercase tracking-widest">{ent.empresa || 'NÃO INFORMADO'}</span>
                   </div>
                </div>
                <div className="p-4 grid grid-cols-2 gap-4 bg-slate-50">
                   {ent.respostas.map(r => (
                     <div key={r.pergunta_id} className="flex justify-between items-center bg-white p-3 rounded-xl border border-slate-200">
                        <span className="text-[9px] font-black text-slate-500 uppercase flex-1 pr-2">
                           {INTERVIEW_QUESTIONS.find(iq => iq.id === r.pergunta_id)?.texto}
                        </span>
                        <span className={`text-[10px] font-black uppercase px-2 py-1 rounded-md ${r.resposta === 'sim' ? 'text-emerald-600 bg-emerald-50' : 'text-rose-600 bg-rose-50'}`}>
                           {r.resposta}
                        </span>
                     </div>
                   ))}
                </div>
             </div>
           ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 print:grid-cols-2">
        <section className="space-y-6">
          <h3 className="text-xl font-black text-slate-900 flex items-center gap-3 uppercase tracking-tighter">
            <AlertTriangle className="text-rose-600" size={28} />
            Não Conformidades Graves
          </h3>
          <div className="space-y-3">
            {report.naoConformidades.map((item, idx) => (
              <div key={idx} className="bg-white p-5 rounded-2xl border-4 border-slate-100 border-l-rose-600 flex items-start gap-4">
                <p className="text-xs text-slate-900 font-black uppercase tracking-tight">{item}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-6">
          <h3 className="text-xl font-black text-slate-900 flex items-center gap-3 uppercase tracking-tighter">
            <ShieldCheck className="text-emerald-600" size={28} />
            Plano de Ação Recomendado
          </h3>
          <div className="space-y-3">
            {report.recomendacoes.map((item, idx) => (
              <div key={idx} className="bg-white p-5 rounded-2xl border-4 border-slate-100 border-l-emerald-600 flex items-start gap-4">
                <p className="text-xs text-slate-900 font-black uppercase tracking-tight">{item}</p>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="bg-slate-900 p-10 rounded-[2.5rem] border-4 border-slate-900 text-white space-y-4 print:bg-white print:text-slate-900 print:p-4 print:border-slate-200">
        <h3 className="text-xl font-black flex items-center gap-3 uppercase tracking-tighter">
          <FileText className="text-[#F05A22]" size={32} />
          Parecer Técnico / Conclusão Executiva
        </h3>
        <p className="text-lg leading-relaxed font-black italic border-l-8 border-[#F05A22] pl-8 py-2 print:text-sm">
          "{report.conclusaoExecutiva}"
        </p>
      </section>
    </div>
  );
};

export default AuditResult;
