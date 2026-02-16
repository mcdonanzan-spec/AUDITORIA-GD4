
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
  Users2
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
  const handlePrint = () => {
    // Disparo direto e limpo
    window.print();
  };

  const coverage = React.useMemo(() => {
    const total = audit.equipe_campo || 1;
    const entrevistados = audit.entrevistas?.length || 0;
    return Math.round((entrevistados / total) * 100);
  }, [audit]);

  const isMetodologyValid = coverage >= 10;

  return (
    <div className="printable-area max-w-4xl mx-auto space-y-8 pb-24 animate-in fade-in duration-500">
      
      {/* HEADER DA WEB (ESCONDIDO NO PRINT) */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 print-hidden">
        <div>
          <button onClick={onClose} className="flex items-center gap-1 text-xs font-black text-slate-500 uppercase tracking-widest hover:text-[#F05A22] mb-2">
            <ArrowLeft size={14} /> Voltar ao Dashboard
          </button>
          <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Relatório de Governança</h1>
          <p className="text-slate-600 font-bold uppercase text-[10px] tracking-widest">Unità Engenharia S.A. - AuditRisk v2.5</p>
        </div>
        <div className="flex gap-3">
          <button 
            type="button"
            onClick={handlePrint} 
            className="flex items-center gap-2 bg-[#F05A22] text-white px-8 py-5 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-900 transition-all border-4 border-slate-900 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] active:translate-y-1 active:shadow-none"
          >
            <Download size={20} /> Gerar PDF / Imprimir
          </button>
        </div>
      </header>

      {/* CABEÇALHO DO DOCUMENTO (APARECE SÓ NO PRINT/PDF) */}
      <div className="hidden print:flex justify-between items-center border-b-8 border-slate-900 pb-8 mb-10">
        <UnitaLogo className="scale-125 origin-left" />
        <div className="text-right">
          <h2 className="text-3xl font-black uppercase tracking-tighter leading-none">Relatório de Auditoria</h2>
          <p className="font-black uppercase text-[12px] text-slate-500 tracking-widest mt-1">Gestão de Conformidade e Risco</p>
          <div className="mt-4 space-y-1 text-xs font-black uppercase">
             <p>Obra: <span className="text-slate-900">{audit.obra_id}</span></p>
             <p>Emitido em: <span className="text-slate-900">{new Date(audit.created_at).toLocaleString('pt-BR')}</span></p>
          </div>
        </div>
      </div>

      {/* Amostragem e Status */}
      <div className="grid grid-cols-2 gap-4 print:gap-6">
        <div className="bg-slate-50 p-6 rounded-[2rem] border-4 border-slate-900 flex items-center gap-5 print:bg-white print:border-slate-300">
           <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center border-2 border-slate-200">
              <Users2 className="text-[#F05A22]" size={32} />
           </div>
           <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Equipe Auditada</p>
              <p className="text-xl font-black text-slate-900 uppercase tracking-tighter">{audit.entrevistas?.length || 0} Colaboradores</p>
           </div>
        </div>
        <div className={`p-6 rounded-[2rem] border-4 border-slate-900 flex items-center gap-5 print:bg-white print:border-slate-300 ${isMetodologyValid ? 'bg-emerald-50' : 'bg-rose-50'}`}>
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

      {/* Scores e Risco Jurídico */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 print:grid-cols-3 print:gap-6">
        <div className="bg-white p-8 rounded-[2.5rem] border-4 border-slate-900 shadow-[8px_8px_0px_0px_rgba(15,23,42,1)] flex flex-col items-center justify-center text-center space-y-4 print:shadow-none print:border-slate-300">
          <div className="text-4xl font-black text-slate-900 tracking-tighter">{report.indiceGeral}%</div>
          <span className={`px-5 py-2 rounded-xl text-xs font-black uppercase tracking-widest border-2 ${report.classificacao === 'REGULAR' ? 'bg-emerald-50 text-emerald-800 border-emerald-600' : 'bg-rose-50 text-rose-800 border-rose-600'}`}>
            {report.classificacao}
          </span>
        </div>

        <div className="md:col-span-2 bg-slate-900 text-white p-10 rounded-[2.5rem] border-4 border-slate-900 shadow-[8px_8px_0px_0px_rgba(240,90,34,1)] print:bg-white print:text-slate-900 print:shadow-none print:border-slate-300 print:p-6">
          <div className="space-y-4">
            <div className="flex items-center gap-4 text-[#F05A22]">
              <ShieldAlert size={32} />
              <h3 className="font-black text-xl uppercase tracking-tighter">Matriz de Risco: {report.riscoJuridico}</h3>
            </div>
            <p className="text-sm text-slate-300 font-black uppercase leading-tight print:text-slate-700">{report.impactoJuridico}</p>
          </div>
        </div>
      </div>

      {/* Checklist Detalhado */}
      <div className="bg-white p-8 rounded-[2.5rem] border-4 border-slate-900 shadow-[8px_8px_0px_0px_rgba(15,23,42,1)] space-y-6 print:shadow-none print:border-none print:p-0">
        <h3 className="text-xl font-black text-slate-900 flex items-center gap-3 uppercase tracking-tighter print:text-lg">
          <ListCheck className="text-[#F05A22] print-hidden" size={28} />
          Evidências Técnicas (Checklist de Campo)
        </h3>
        <div className="grid grid-cols-1 gap-2">
           {QUESTIONS.map(q => {
             const r = audit.respostas.find(res => res.pergunta_id === q.id);
             if (!r) return null;
             return (
               <div key={q.id} className="print-break-inside-avoid flex items-start gap-4 p-4 bg-slate-50 rounded-2xl border-2 border-slate-100 print:bg-white print:border-slate-100 print:p-3">
                  <div className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center font-black text-[10px] text-white border-2 border-slate-900 ${r.resposta === 'sim' ? 'bg-emerald-500' : r.resposta === 'nao' ? 'bg-rose-500' : 'bg-amber-500'}`}>
                    {r.resposta.toUpperCase()}
                  </div>
                  <div className="flex-1 space-y-1">
                     <p className="text-[11px] font-black text-slate-900 uppercase tracking-tight leading-tight">{q.texto}</p>
                     {r.observacao && <p className="text-[10px] text-rose-600 font-black uppercase">⚠️ OBS: {r.observacao}</p>}
                     {r.fotos && r.fotos.length > 0 && (
                       <div className="flex gap-2 pt-2">
                          {r.fotos.map((f, i) => <img key={i} src={f} className="w-16 h-16 rounded-lg border-2 border-slate-300 object-cover print:w-24 print:h-24" />)}
                       </div>
                     )}
                  </div>
               </div>
             )
           })}
        </div>
      </div>

      {/* Amostragem Detalhada */}
      <div className="bg-white p-8 rounded-[2.5rem] border-4 border-slate-900 shadow-[8px_8px_0px_0px_rgba(15,23,42,1)] space-y-6 print:shadow-none print:border-none print:p-0 print:pt-10">
        <h3 className="text-xl font-black text-slate-900 flex items-center gap-3 uppercase tracking-tighter print:text-lg">
          <UserCheck className="text-[#F05A22] print-hidden" size={28} />
          Detalhamento das Entrevistas Comportamentais
        </h3>
        <div className="space-y-4">
           {audit.entrevistas?.map((ent, idx) => (
             <div key={ent.id} className="print-break-inside-avoid border-2 border-slate-100 rounded-3xl overflow-hidden print:border-slate-300">
                <div className="bg-slate-900 text-white p-4 flex justify-between items-center print:bg-slate-50 print:text-slate-900">
                   <div className="flex items-center gap-4">
                      <span className="w-8 h-8 bg-[#F05A22] rounded-lg flex items-center justify-center font-black text-xs print:bg-slate-900 print:text-white">{idx + 1}</span>
                      <div className="flex flex-col">
                        <span className="text-[10px] font-black uppercase text-[#F05A22] print:text-slate-500">Colaborador</span>
                        <span className="text-xs font-black uppercase tracking-tight">{ent.funcao || 'NÃO INFORMADA'}</span>
                      </div>
                   </div>
                   <div className="flex items-center gap-2 text-right">
                      <Building2 size={14} className="text-[#F05A22]" />
                      <span className="text-[10px] font-black uppercase tracking-widest">{ent.empresa || 'NÃO INFORMADA'}</span>
                   </div>
                </div>
                <div className="p-4 grid grid-cols-2 gap-2 bg-slate-50 print:bg-white print:grid-cols-2">
                   {ent.respostas.map(r => (
                     <div key={r.pergunta_id} className="flex justify-between items-center bg-white p-2 rounded-xl border border-slate-200 print:border-slate-100">
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

      {/* Conclusão Técnica e Assinaturas */}
      <section className="print-break-inside-avoid bg-slate-900 p-10 rounded-[2.5rem] border-4 border-slate-900 text-white space-y-4 print:bg-white print:text-slate-900 print:p-8 print:border-slate-900 print:shadow-none print:mt-12">
        <h3 className="text-xl font-black flex items-center gap-3 uppercase tracking-tighter print:text-xl">
          <FileText className="text-[#F05A22]" size={32} />
          Parecer Técnico Unità
        </h3>
        <p className="text-lg leading-relaxed font-black italic border-l-8 border-[#F05A22] pl-8 py-2 print:text-sm print:border-slate-900">
          "{report.conclusaoExecutiva}"
        </p>
        
        {/* ESPAÇO DE ASSINATURA NO PDF */}
        <div className="hidden print:block pt-24">
           <div className="grid grid-cols-2 gap-20">
              <div className="border-t-4 border-slate-900 pt-4 text-center">
                 <p className="text-[12px] font-black uppercase tracking-widest">Auditor Unità Responsável</p>
                 <p className="text-[9px] font-bold text-slate-400 mt-1 uppercase">Validado Digitalmente</p>
              </div>
              <div className="border-t-4 border-slate-900 pt-4 text-center">
                 <p className="text-[12px] font-black uppercase tracking-widest">Responsável pela Obra</p>
                 <p className="text-[9px] font-bold text-slate-400 mt-1 uppercase">Protocolo de Conformidade</p>
              </div>
           </div>
        </div>
      </section>
    </div>
  );
};

export default AuditResult;
