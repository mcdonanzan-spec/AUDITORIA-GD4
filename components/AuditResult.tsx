
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
  Loader2
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

  const handleGeneratePDF = async () => {
    setIsGenerating(true);
    
    // O elemento que queremos converter
    const element = document.getElementById('relatorio-tecnico-unita');
    
    if (!element) {
      alert("Erro ao localizar conteúdo do relatório.");
      setIsGenerating(false);
      return;
    }

    // Configurações do PDF
    const opt = {
      margin: [10, 10, 10, 10], // Margens em mm
      filename: `Relatorio_Unita_${audit.obra_id}_${new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { 
        scale: 2, // Aumenta a resolução
        useCORS: true, 
        letterRendering: true,
        backgroundColor: '#FFFFFF'
      },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    try {
      // @ts-ignore - html2pdf vem do script no index.html
      await html2pdf().set(opt).from(element).save();
    } catch (error) {
      console.error("Erro ao gerar PDF:", error);
      alert("Falha ao gerar o documento. Tente novamente ou use o atalho Ctrl+P.");
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
      
      {/* HEADER DA WEB (INTERFACE DO USUÁRIO) */}
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

      {/* 
          CONTAINER DO RELATÓRIO (O QUE VAI PARA O PDF) 
          Usamos padding interno alto para o canvas não cortar bordas
      */}
      <div id="relatorio-tecnico-unita" className="bg-white p-2 md:p-4 space-y-10">
        
        {/* CABEÇALHO DO DOCUMENTO NO PDF */}
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

        {/* Blocos de Resumo */}
        <div className="grid grid-cols-2 gap-6">
          <div className="bg-slate-50 p-6 rounded-[2rem] border-4 border-slate-900 flex items-center gap-5">
             <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center border-2 border-slate-200">
                <Users2 className="text-[#F05A22]" size={32} />
             </div>
             <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Pessoas Auditadas</p>
                <p className="text-xl font-black text-slate-900 uppercase tracking-tighter">{audit.entrevistas?.length || 0} Colaboradores</p>
             </div>
          </div>
          <div className={`p-6 rounded-[2rem] border-4 border-slate-900 flex items-center gap-5 ${isMetodologyValid ? 'bg-emerald-50' : 'bg-rose-50'}`}>
             <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border-2 ${isMetodologyValid ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'}`}>
                {isMetodologyValid ? <ShieldCheck size={32} /> : <AlertOctagon size={32} />}
             </div>
             <div>
                <p className={`text-[10px] font-black uppercase tracking-widest leading-none mb-1 ${isMetodologyValid ? 'text-emerald-600' : 'text-rose-600'}`}>
                  Metodologia Unità
                </p>
                <p className={`text-xl font-black uppercase tracking-tighter ${isMetodologyValid ? 'text-emerald-900' : 'text-rose-900'}`}>Amostragem: {coverage}%</p>
             </div>
          </div>
        </div>

        {/* Scoring de Risco */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-8 rounded-[2.5rem] border-4 border-slate-900 shadow-md flex flex-col items-center justify-center text-center space-y-4">
            <div className="text-4xl font-black text-slate-900 tracking-tighter">{report.indiceGeral}%</div>
            <span className={`px-5 py-2 rounded-xl text-xs font-black uppercase tracking-widest border-2 ${report.classificacao === 'REGULAR' ? 'bg-emerald-50 text-emerald-800 border-emerald-600' : 'bg-rose-50 text-rose-800 border-rose-600'}`}>
              STATUS: {report.classificacao}
            </span>
          </div>

          <div className="md:col-span-2 bg-slate-900 text-white p-10 rounded-[2.5rem] border-4 border-slate-900">
            <div className="space-y-4">
              <div className="flex items-center gap-4 text-[#F05A22]">
                <ShieldAlert size={32} />
                <h3 className="font-black text-xl uppercase tracking-tighter">Risco Jurídico: {report.riscoJuridico}</h3>
              </div>
              <p className="text-sm text-slate-300 font-black uppercase leading-tight">{report.impactoJuridico}</p>
            </div>
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

        {/* Entrevistas Detalhadas */}
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

        {/* Parecer Final e Assinaturas */}
        <section className="bg-white p-10 rounded-[2.5rem] border-4 border-slate-900 text-slate-900 space-y-6 break-inside-avoid mt-12">
          <div className="flex items-center gap-3">
            <FileText className="text-[#F05A22]" size={32} />
            <h3 className="text-2xl font-black uppercase tracking-tighter">Conclusão Executiva</h3>
          </div>
          <p className="text-lg leading-relaxed font-black italic border-l-8 border-slate-900 pl-8 py-4 bg-slate-50">
            "{report.conclusaoExecutiva}"
          </p>
          
          <div className="pt-24">
             <div className="grid grid-cols-2 gap-20">
                <div className="border-t-4 border-slate-900 pt-4 text-center">
                   <p className="text-[12px] font-black uppercase tracking-widest">Auditor Unità S.A.</p>
                   <p className="text-[9px] font-bold text-slate-400 mt-1 uppercase tracking-tighter">Responsável pela Coleta</p>
                </div>
                <div className="border-t-4 border-slate-900 pt-4 text-center">
                   <p className="text-[12px] font-black uppercase tracking-widest">Responsável pela Obra</p>
                   <p className="text-[9px] font-bold text-slate-400 mt-1 uppercase tracking-tighter">Ciente do Resultado</p>
                </div>
             </div>
          </div>
        </section>

        {/* Rodapé do PDF */}
        <div className="pt-10 text-center text-[9px] font-black text-slate-300 uppercase tracking-[0.4em]">
           UNITA ENGENHARIA S.A. - SISTEMA AUDITRISK v2.5
        </div>
      </div>
    </div>
  );
};

export default AuditResult;
