
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
import { motion } from 'motion/react';
import { Audit, AIAnalysisResult, User, Obra } from '../types';
import { QUESTIONS, INTERVIEW_QUESTIONS } from '../constants';
import { UnitaLogo } from './Layout';
import { signAudit } from '../services/supabase';

interface AuditResultProps {
  audit: Audit;
  report: AIAnalysisResult;
  obra?: Obra;
  onClose: () => void;
  currentUser: User;
  onRefresh: () => void;
}

const AuditResult: React.FC<AuditResultProps> = ({ audit, report, obra, onClose, currentUser, onRefresh }) => {
  const [isSigning, setIsSigning] = React.useState(false);

  const obraName = obra?.nome || audit.obra_id;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const handleGeneratePDF = () => {
    // Validação de Assinaturas Obrigatórias
    if (!audit.assinatura_auditor || !audit.assinatura_engenheiro) {
      alert('⚠️ BLOQUEIO DE SEGURANÇA: O relatório só pode ser exportado após as duas assinaturas digitais (Auditor e Engenheiro).');
      return;
    }

    // O usuário relatou que o Ctrl+P gera o melhor resultado.
    // Disparar a impressão nativa que é a forma mais fiel de gerar o PDF no navegador.
    window.print();
  };

  const handleSign = async (type: 'auditor' | 'engenheiro') => {
    if (isSigning) return;
    
    const confirmMsg = type === 'auditor' 
      ? 'Deseja assinar digitalmente este relatório como Auditor?' 
      : 'Deseja assinar digitalmente este relatório como Engenheiro Responsável?';
      
    if (!window.confirm(confirmMsg)) return;

    setIsSigning(true);
    try {
      const signature = {
        user_id: currentUser.id,
        user_nome: currentUser.nome,
        perfil: currentUser.perfil,
        data: new Date().toISOString()
      };
      
      await signAudit(audit.id, signature, type);
      onRefresh();
      alert('Relatório assinado com sucesso!');
    } catch (err: any) {
      console.error('Erro ao assinar:', err);
      alert(`Erro ao assinar: ${err.message || 'Erro desconhecido'}`);
    } finally {
      setIsSigning(false);
    }
  };

  const canSignAuditor = (currentUser.perfil === 'auditor' || currentUser.perfil === 'admin') && !audit.assinatura_auditor;
  const canSignEngineer = (currentUser.id === obra?.engenheiro_id || currentUser.perfil === 'admin') && !audit.assinatura_engenheiro;

  const divergencia = Math.abs((audit.equipe_campo || 0) - (audit.equipe_gd4 || 0));

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-5xl mx-auto space-y-6 pb-20"
    >
      <header className="flex justify-between items-center print:hidden">
        <button onClick={onClose} className="flex items-center gap-2 font-black text-[10px] text-slate-500 uppercase tracking-widest hover:text-[#F05A22]">
          <ArrowLeft size={14} /> Voltar ao Painel
        </button>
        <div className="flex items-center gap-4">
          {(!audit.assinatura_auditor || !audit.assinatura_engenheiro) && (
            <div className="bg-amber-50 border-2 border-amber-200 px-4 py-2 rounded-xl flex items-center gap-2 text-amber-700 animate-pulse">
              <AlertTriangle size={16} />
              <span className="text-[10px] font-black uppercase tracking-tighter">Assinaturas Pendentes para Exportação</span>
            </div>
          )}
          <button 
            onClick={handleGeneratePDF}
            className={`${(!audit.assinatura_auditor || !audit.assinatura_engenheiro) ? 'bg-slate-300 cursor-not-allowed' : 'bg-[#F05A22]'} text-white px-8 py-4 rounded-2xl font-black text-xs uppercase border-4 border-slate-900 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] flex items-center gap-3 transition-all active:translate-y-1 active:shadow-none`}
          >
            <Download size={18} />
            Gerar Relatório (PDF)
          </button>
        </div>
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
            <p>Canteiro: <span className="text-slate-900">{obraName}</span></p>
            <p>Protocolo: <span className="text-slate-900">AR-{audit.id.substring(0, 5).toUpperCase()}</span></p>
            <p>Data/Hora: <span className="text-slate-900">{new Date(audit.created_at).toLocaleString('pt-BR')}</span></p>
          </div>
          <div className="space-y-2 text-right">
            <p>Efetivo em Campo: <span className="text-slate-900">{audit.equipe_campo} Pessoas</span></p>
            <p>Amostragem Real: <span className="text-[#F05A22]">{audit.entrevistas?.length || 0} ({Math.round(((audit.entrevistas?.length || 0)/(audit.equipe_campo || 1))*100)}% do Efetivo)</span></p>
            <p>Metodologia: <span className="text-emerald-600">VALIDADA</span></p>
          </div>
        </div>

        {/* BLOCOS DE STATUS SUPERIOR */}
        <div className="grid grid-cols-4 gap-4 break-inside-avoid">
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
            <p className="text-3xl font-black">{report.scoreConformidade}%</p>
          </div>
          <div className="bg-[#F05A22] text-white p-6 rounded-[2rem] text-center space-y-1 shadow-lg shadow-orange-200">
            <p className="text-[8px] font-black opacity-80 uppercase">Status Final</p>
            <p className="text-xl font-black uppercase tracking-tighter">{report.status}</p>
          </div>
        </div>

        {/* ANÁLISE DE EFETIVO */}
        <div className="grid grid-cols-3 gap-6 break-inside-avoid">
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
          <div className={`border-4 ${audit.subcontratacao_identificada ? 'border-rose-500 bg-rose-50' : 'border-emerald-500 bg-emerald-50'} p-8 rounded-[2.5rem] flex flex-col items-center justify-center text-center space-y-4`}>
            <Scale size={48} className={audit.subcontratacao_identificada ? 'text-rose-500' : 'text-emerald-500'} />
            <div>
              <p className={`text-[8px] font-black uppercase tracking-widest ${audit.subcontratacao_identificada ? 'text-rose-800' : 'text-emerald-800'}`}>Quarteirização</p>
              <p className={`text-xs font-black uppercase ${audit.subcontratacao_identificada ? 'text-rose-900' : 'text-emerald-900'}`}>
                {audit.subcontratacao_identificada ? 'Irregular Identificada' : 'Regularizada'}
              </p>
            </div>
          </div>
        </div>

        {/* MAPEAMENTO DE VULNERABILIDADES (CARDS QUALITATIVOS) */}
        <div className="space-y-6">
          <div className="flex items-center gap-4 border-b-4 border-slate-900 pb-4">
            <ShieldCheck className="text-[#F05A22]" size={36} />
            <h2 className="text-3xl font-black tracking-tighter uppercase">Mapeamento de Vulnerabilidades Trabalhistas</h2>
          </div>

          <div className="grid grid-cols-1 gap-8">
            {report.vulnerabilidades?.map((vuln, idx) => {
                const isLimitacao = vuln.tipoRisco === 'Limitação Metodológica' || vuln.nome?.includes('NÃO AVALIADOS');
                return (
              <div key={idx} className={`border-l-8 rounded-r-[2rem] p-8 shadow-sm break-inside-avoid ${
                isLimitacao
                  ? 'border-slate-400 bg-slate-50'
                  : vuln.gravidade === 'CRÍTICA' ? 'border-rose-600 bg-slate-50'
                  : vuln.gravidade === 'ALTA' ? 'border-orange-500 bg-slate-50'
                  : vuln.gravidade === 'MÉDIA' ? 'border-amber-500 bg-slate-50'
                  : 'border-emerald-500 bg-slate-50'
              }`}>
                 <div className="flex justify-between items-start mb-4">
                   <div className="space-y-2">
                     {isLimitacao ? (
                       <span className="text-[10px] font-black uppercase px-3 py-1.5 rounded-full bg-slate-500 text-white tracking-widest">PENDENTE — VERIFICAÇÃO</span>
                     ) : (
                       <span className={`text-[10px] font-black uppercase px-3 py-1.5 rounded-full text-white tracking-widest ${vuln.gravidade === 'CRÍTICA' ? 'bg-rose-600' : vuln.gravidade === 'ALTA' ? 'bg-orange-500' : vuln.gravidade === 'MÉDIA' ? 'bg-amber-500' : 'bg-emerald-500'}`}>
                         {({'CRÍTICA':'CRÍTICO','ALTA':'ALTO','MÉDIA':'MÉDIO','BAIXA':'BAIXO'} as Record<string,string>)[vuln.gravidade] || vuln.gravidade} — RISCO
                       </span>
                     )}
                     <div className="flex flex-wrap gap-2 pt-1">
                       {vuln.tipoRisco && <span className="text-[9px] font-black uppercase px-2 py-1 rounded-lg bg-slate-200 text-slate-700 tracking-wide">{vuln.tipoRisco}</span>}
                       {vuln.areaAcionar && <span className="text-[9px] font-black uppercase px-2 py-1 rounded-lg bg-blue-100 text-blue-800 tracking-wide">📍 {vuln.areaAcionar}</span>}
                     </div>
                     <h3 className="text-xl font-black uppercase mt-2 mb-1">{vuln.nome}</h3>
                     <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{vuln.exposicao}</p>
                   </div>
                 </div>

                 <div className="grid grid-cols-2 gap-6 mt-6">
                    <div className="space-y-2 bg-white p-4 rounded-2xl border border-slate-200">
                      <p className="text-[10px] font-black text-[#F05A22] uppercase tracking-widest flex items-center gap-2"><CheckCircle2 size={12}/> O que foi Encontrado?</p>
                      <p className="text-xs font-bold text-slate-700 leading-relaxed">{vuln.oQueFoiEncontrado}</p>
                    </div>
                    <div className="space-y-2 bg-white p-4 rounded-2xl border border-slate-200">
                      <p className="text-[10px] font-black text-rose-600 uppercase tracking-widest flex items-center gap-2"><FileText size={12}/> Fragilidade Documental</p>
                      <p className="text-xs font-bold text-slate-700 leading-relaxed">{vuln.fragilidadeDocumental}</p>
                    </div>
                 </div>

                 <div className="bg-slate-900 text-white rounded-2xl p-6 mt-6 space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><Scale size={14}/> Risco Identificado</p>
                      <span className="text-[8px] font-black uppercase bg-amber-500 text-white px-2 py-1 rounded-full tracking-wider">⚖️ Análise jurídica pendente</span>
                    </div>
                    <p className="text-sm font-bold text-slate-100 leading-relaxed">{vuln.riscoTrabalhista}</p>
                 </div>

                 <div className="bg-emerald-50 text-emerald-900 rounded-2xl p-6 mt-6 border border-emerald-200">
                    <p className="text-[10px] font-black uppercase tracking-widest mb-2 flex items-center gap-2 text-emerald-700"><CheckCircle2 size={14}/> Mitigação Recomendada</p>
                    <p className="text-xs font-bold">{vuln.mitigacao}</p>
                 </div>
              </div>
                );
              })}
          </div>
        </div>

        {/* SEÇÃO ESPECIAL: ENTREVISTAS IN LOCO */}
        {report.secaoEntrevistasInLoco && report.secaoEntrevistasInLoco.totalEntrevistados > 0 && (
          <div className="rounded-[2rem] border-4 border-amber-400 overflow-hidden break-inside-avoid">
            <div className="bg-amber-500 px-8 py-5 flex items-center gap-4">
              <span className="text-3xl">🎤</span>
              <div>
                <h3 className="text-white font-black uppercase tracking-tighter text-lg leading-none">Entrevistas IN LOCO — Análise Estatística</h3>
                <p className="text-amber-100 text-[9px] font-black uppercase tracking-widest mt-1">
                  {report.secaoEntrevistasInLoco.totalEntrevistados} trabalhadores entrevistados ({report.secaoEntrevistasInLoco.percentualDoEfetivo}% do efetivo)
                </p>
              </div>
            </div>
            <div className="bg-amber-50 p-8 space-y-5">
              <div className="bg-white border-2 border-amber-300 rounded-2xl p-5">
                <p className="text-[9px] font-black text-amber-700 uppercase tracking-widest mb-2">⚠️ ALERTA JURÍDICO</p>
                <p className="text-xs font-bold text-slate-700 leading-relaxed">{report.secaoEntrevistasInLoco.alertaJuridico}</p>
              </div>
              <div className="space-y-3">
                {report.secaoEntrevistasInLoco.agregacaoPorPergunta?.map((item, i) => (
                  <div key={i} className={`bg-white rounded-2xl p-5 border-l-4 ${item.totalNao > 0 ? (item.gravidade === 'CRÍTICA' ? 'border-rose-500' : item.gravidade === 'ALTA' ? 'border-orange-500' : 'border-amber-400') : 'border-emerald-400'}`}>
                    <div className="flex justify-between items-start gap-4 mb-2">
                      <p className="text-[10px] font-black text-slate-700 uppercase leading-tight flex-1">{item.pergunta}</p>
                      <div className="flex items-center gap-2 shrink-0">
                        {item.totalNao > 0 && (
                          <span className={`text-[9px] font-black uppercase px-2 py-1 rounded-full text-white ${item.gravidade === 'CRÍTICA' ? 'bg-rose-600' : item.gravidade === 'ALTA' ? 'bg-orange-500' : 'bg-amber-500'}`}>{item.gravidade}</span>
                        )}
                        <span className={`text-[10px] font-black ${item.totalNao > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>{item.totalNao} NÃO ({item.percentualNao}%)</span>
                      </div>
                    </div>
                    {item.totalNao > 0 && <p className="text-[10px] font-bold text-slate-500 leading-relaxed border-t border-slate-100 pt-2">{item.analiseJuridica}</p>}
                  </div>
                ))}
              </div>
              <div className="bg-amber-100 border-2 border-amber-300 rounded-2xl p-5">
                <p className="text-[9px] font-black text-amber-800 uppercase tracking-widest mb-2">📊 PROJEÇÃO CONSERVADORA</p>
                <p className="text-xs font-bold text-amber-900 leading-relaxed">{report.secaoEntrevistasInLoco.projecaoConservadora}</p>
              </div>
            </div>
          </div>
        )}

        {/* EVIDÊNCIAS DO CHECKLIST */}
        <div className="space-y-6 break-inside-avoid">
          <h3 className="text-xl font-black uppercase border-l-8 border-[#F05A22] pl-4 tracking-tighter">Evidências do Checklist (Campo)</h3>
          <div className="space-y-3">
            {audit.respostas?.map((r, i) => {
              const q = QUESTIONS.find(qi => qi.id === r.pergunta_id);
              if (!q) return null;
              return (
                <div key={i} className="flex items-center gap-4 bg-slate-50 p-4 rounded-3xl border border-slate-100">
                   <div className={`w-14 h-14 rounded-2xl flex flex-col items-center justify-center font-black text-[10px] border-2 shadow-sm ${(q.inverted ? r.resposta === 'nao' : r.resposta === 'sim') ? 'bg-emerald-500 text-white border-slate-900' : 'bg-amber-500 text-white border-slate-900'}`}>
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
        <div className="space-y-6 break-before-page pt-10">
           <h3 className="text-xl font-black uppercase border-l-8 border-[#F05A22] pl-4 tracking-tighter">Detalhamento da Amostragem ({audit.entrevistas?.length} Colaboradores)</h3>
           <div className="grid grid-cols-1 gap-4">
             {audit.entrevistas?.map((ent, idx) => (
               <div key={idx} className="bg-slate-50 rounded-[2.5rem] p-6 border border-slate-200 break-inside-avoid">
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
        <div className="border-[6px] border-slate-900 rounded-[3rem] p-10 space-y-10 mt-12 bg-white relative break-inside-avoid">
           <div className="flex items-center gap-4 border-b-2 border-slate-100 pb-6">
              <FileText className="text-[#F05A22]" size={32} />
              <h3 className="text-2xl font-black uppercase tracking-tighter">Conclusão Executiva</h3>
           </div>
           {(() => {
             const c = report.conclusaoExecutiva as any;
             if (!c || typeof c === 'string') {
               return <p className="text-lg font-bold italic text-slate-800 leading-relaxed text-center px-10">"{c}"</p>;
             }
             return (
               <div className="space-y-6">
                 <p className="text-xl font-black text-slate-900 leading-relaxed text-center px-4">{c.resumoNumerico}</p>
                 {c.destaquEntrevistas && (
                   <p className="text-sm font-bold text-amber-700 text-center leading-relaxed border-y border-amber-100 py-4">{c.destaquEntrevistas}</p>
                 )}
                 {c.principaisAmeacas?.length > 0 && (
                   <div className="space-y-2">
                     <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">⚠️ Principais Ameaças</p>
                     {c.principaisAmeacas.map((a: string, i: number) => (
                       <div key={i} className="bg-rose-50 border border-rose-200 rounded-xl p-4">
                         <p className="text-xs font-bold text-rose-800 leading-relaxed">{a}</p>
                       </div>
                     ))}
                   </div>
                 )}
                 {c.acoesPrioritarias?.length > 0 && (
                   <div className="space-y-2">
                     <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">🔴 Ações Prioritárias</p>
                     {c.acoesPrioritarias.map((a: any, i: number) => (
                       <div key={i} className="flex items-start gap-3">
                         <span className="text-rose-600 font-black text-base mt-0.5">□</span>
                         <p className="text-xs font-bold text-slate-800 flex-1">{a.acao} <span className="text-rose-600 font-black">— Prazo: {a.prazo}</span></p>
                       </div>
                     ))}
                   </div>
                 )}
                 {c.acoesSecundarias?.length > 0 && (
                   <div className="space-y-2">
                     <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">🟡 Ações Secundárias</p>
                     {c.acoesSecundarias.map((a: any, i: number) => (
                       <div key={i} className="flex items-start gap-3">
                         <span className="text-amber-500 font-black text-base mt-0.5">□</span>
                         <p className="text-xs font-bold text-slate-700 flex-1">{a.acao} <span className="text-amber-600 font-black">— Prazo: {a.prazo}</span></p>
                       </div>
                     ))}
                   </div>
                 )}
               </div>
             );
           })()}

           <div className="grid grid-cols-2 gap-20 pt-10">
              <div className="text-center space-y-2">
                  {audit.assinatura_auditor ? (
                    <div className="font-black text-[#F05A22] text-xs uppercase italic border-b-2 border-slate-900 pb-2 mb-2">
                      {audit.assinatura_auditor.user_nome}
                      <p className="text-[8px] font-normal text-slate-500 not-italic">Assinado em {new Date(audit.assinatura_auditor.data).toLocaleString('pt-BR')}</p>
                    </div>
                  ) : (
                    <div className="h-px bg-slate-300 w-full mb-4"></div>
                  )}
                  <p className="text-[8px] font-black uppercase tracking-[0.3em] text-slate-400">Assinatura Digital Auditrisk</p>
                  <p className="text-[10px] font-black uppercase">Auditor Unità S.A.</p>
                  <p className="text-[8px] text-slate-400">Responsável pela Coleta</p>
                  
                  {canSignAuditor && (
                    <button 
                      data-html2canvas-ignore
                      disabled={isSigning}
                      onClick={() => handleSign('auditor')}
                      className="print:hidden mt-4 bg-slate-900 text-white px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-[#F05A22] transition-all shadow-[4px_4px_0px_0px_rgba(240,90,34,1)] flex items-center justify-center gap-2 mx-auto"
                    >
                      {isSigning ? <Loader2 className="animate-spin" size={14} /> : <UserCheck size={14} />}
                      Assinar Relatório
                    </button>
                  )}
              </div>
              <div className="text-center space-y-2">
                  {audit.assinatura_engenheiro ? (
                    <div className="font-black text-[#F05A22] text-xs uppercase italic border-b-2 border-slate-900 pb-2 mb-2">
                      {audit.assinatura_engenheiro.user_nome}
                      <p className="text-[8px] font-normal text-slate-500 not-italic">Assinado em {new Date(audit.assinatura_engenheiro.data).toLocaleString('pt-BR')}</p>
                    </div>
                  ) : (
                    <div className="h-px bg-slate-300 w-full mb-4"></div>
                  )}
                  <p className="text-[8px] font-black uppercase tracking-[0.3em] text-slate-400">Assinatura Responsável Obra</p>
                  <p className="text-[10px] font-black uppercase">{obra?.engenheiro_responsavel || 'Engenheiro da Unidade'}</p>
                  <p className="text-[8px] text-slate-400">Responsável Técnico</p>

                  {canSignEngineer ? (
                    <button 
                      data-html2canvas-ignore
                      disabled={isSigning}
                      onClick={() => handleSign('engenheiro')}
                      className="print:hidden mt-4 bg-slate-900 text-white px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-[#F05A22] transition-all shadow-[4px_4px_0px_0px_rgba(240,90,34,1)] flex items-center justify-center gap-2 mx-auto"
                    >
                      {isSigning ? <Loader2 className="animate-spin" size={14} /> : <UserCheck size={14} />}
                      Assinar Relatório
                    </button>
                  ) : !audit.assinatura_engenheiro && (
                    <div className="print:hidden mt-4 p-3 bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl text-[8px] font-black uppercase text-slate-400 tracking-widest">
                      Aguardando assinatura do responsável
                    </div>
                  )}
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

        <div className="text-center text-[9px] font-black text-slate-200 uppercase tracking-[0.6em] pt-10 space-y-2">
           <p>Documento Confidencial — Uso Interno</p>
           <p className="text-[8px] font-bold text-slate-300 normal-case tracking-normal max-w-2xl mx-auto leading-relaxed">
             ⚠️ Este relatório de auditoria é de caráter informativo e não substitui parecer jurídico. As vulnerabilidades identificadas requerem análise por profissional habilitado antes de qualquer decisão legal ou rescisão contratual.
           </p>
        </div>
      </div>
    </motion.div>
  );
};

export default AuditResult;
