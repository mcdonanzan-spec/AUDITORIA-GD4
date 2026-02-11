
import React from 'react';
import { 
  Building2, 
  User as UserIcon, 
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Users,
  Database,
  AlertTriangle,
  MessageSquareQuote,
  CheckCircle2,
  XCircle,
  HelpCircle
} from 'lucide-react';
import { Obra, Question, ResponseValue, AuditResponse, Audit, AIAnalysisResult } from '../types';
import { QUESTIONS, BLOCKS } from '../constants';
import { generateAuditReport } from '../services/gemini';

interface AuditWizardProps {
  obras: Obra[];
  currentUser: any;
  onAuditComplete: (audit: Audit, report: AIAnalysisResult) => void;
}

const AuditWizard: React.FC<AuditWizardProps> = ({ obras, currentUser, onAuditComplete }) => {
  const [step, setStep] = React.useState<'setup' | 'questions' | 'processing'>('setup');
  const [currentBlockIdx, setCurrentBlockIdx] = React.useState(0);
  const [loading, setLoading] = React.useState(false);
  
  const [selectedObra, setSelectedObra] = React.useState<string>('');
  const [auditType, setAuditType] = React.useState<'mensal' | 'extraordinaria'>('mensal');
  
  const [equipeCampo, setEquipeCampo] = React.useState<string>('');
  const [equipeGd4, setEquipeGd4] = React.useState<string>('');
  const [subcontratacaoRegular, setSubcontratacaoRegular] = React.useState<boolean | null>(null);

  const [respostas, setRespostas] = React.useState<AuditResponse[]>([]);
  const [ocorrencias, setOcorrencias] = React.useState<string>('');

  const blockKeys = Object.keys(BLOCKS) as Array<keyof typeof BLOCKS>;
  const currentBlockKey = blockKeys[currentBlockIdx];
  const currentBlockQuestions = QUESTIONS.filter(q => q.bloco === currentBlockKey);

  const handleResponseChange = (questionId: string, val: ResponseValue) => {
    setRespostas(prev => {
      const existing = prev.find(r => r.pergunta_id === questionId);
      if (existing) {
        return prev.map(r => r.pergunta_id === questionId ? { ...r, resposta: val } : r);
      }
      return [...prev, { pergunta_id: questionId, resposta: val }];
    });
  };

  const handleObsChange = (questionId: string, text: string) => {
    setRespostas(prev => prev.map(r => r.pergunta_id === questionId ? { ...r, observacao: text } : r));
  };

  const isBlockComplete = () => {
    if (currentBlockKey === 'B') {
      return equipeCampo !== '' && equipeGd4 !== '' && subcontratacaoRegular !== null;
    }
    return currentBlockQuestions.every(q => respostas.find(r => r.pergunta_id === q.id));
  };

  const handleSubmit = async () => {
    setStep('processing');
    setLoading(true);

    try {
      const blockScores = blockKeys.reduce((acc, b) => {
        const qIds = QUESTIONS.filter(q => q.bloco === b).map(q => q.id);
        const bResps = respostas.filter(r => qIds.includes(r.pergunta_id));
        
        let totalScore = 0;
        if (b === 'B') {
           const divergencia = Math.abs(Number(equipeCampo) - Number(equipeGd4));
           const scoreEquipe = divergencia === 0 ? 100 : divergencia < 5 ? 50 : 0;
           const scoreSub = subcontratacaoRegular === true ? 100 : 0;
           totalScore = (scoreEquipe + scoreSub) / 2;
        } else {
           totalScore = bResps.reduce((sum, r) => {
            const score = r.resposta === 'sim' ? 100 : r.resposta === 'parcial' ? 50 : 0;
            return sum + score;
          }, 0) / (qIds.length || 1);
        }
        
        acc[BLOCKS[b].toLowerCase().replace(/ /g, '_')] = Math.round(totalScore);
        return acc;
      }, {} as any);

      const auditPayload = {
        obra: obras.find(o => o.id === selectedObra)?.nome || '',
        data: new Date().toISOString(),
        auditor: currentUser.nome,
        blocos: blockScores,
        equipe: {
          campo: Number(equipeCampo),
          gd4: Number(equipeGd4),
          divergencia: Number(equipeCampo) - Number(equipeGd4),
          subcontratacao_regular: subcontratacaoRegular
        },
        ocorrencias_graves: ocorrencias.split('\n').filter(s => s.trim()),
        observacoes_gerais: "Foco em Auditoria de Entrevistas Amostrais e Conformidade GRD Unità."
      };

      const result = await generateAuditReport(auditPayload);

      const newAudit: Audit = {
        id: `aud-${Date.now()}`,
        obra_id: selectedObra,
        auditor_id: currentUser.id,
        data: new Date().toISOString().split('T')[0],
        tipo: auditType,
        indice_geral: result.indiceGeral,
        classificacao: result.classificacao,
        risco_juridico: result.riscoJuridico,
        respostas,
        equipe_campo: Number(equipeCampo),
        equipe_gd4: Number(equipeGd4),
        subcontratacao_identificada: !subcontratacaoRegular,
        created_at: new Date().toISOString()
      };

      onAuditComplete(newAudit, result);
    } catch (err) {
      console.error(err);
      setStep('questions');
      alert("Erro ao processar auditoria.");
    } finally {
      setLoading(false);
    }
  };

  if (step === 'setup') {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <header className="text-center">
          <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Início de Inspeção</h2>
          <p className="text-orange-600 font-black text-xs uppercase tracking-[0.2em] mt-2">Protocolo Unità Engenharia</p>
        </header>

        <div className="bg-white p-8 rounded-[2.5rem] shadow-[12px_12px_0px_0px_rgba(15,23,42,1)] border-4 border-slate-900 space-y-8">
          <div className="space-y-3">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Local da Inspeção</label>
            <div className="relative">
              <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-orange-600" size={24} />
              <select 
                className="w-full bg-slate-50 border-4 border-slate-900 rounded-2xl pl-12 pr-4 py-5 appearance-none focus:ring-4 focus:ring-orange-500/20 focus:outline-none transition-all font-black text-lg text-slate-900"
                value={selectedObra}
                onChange={(e) => setSelectedObra(e.target.value)}
              >
                <option value="">Selecione o Canteiro...</option>
                {obras.map(o => <option key={o.id} value={o.id}>{o.nome}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Modalidade</label>
              <select 
                className="w-full bg-slate-50 border-4 border-slate-900 rounded-2xl px-5 py-5 focus:ring-4 focus:ring-orange-500/20 focus:outline-none transition-all font-black text-slate-900 appearance-none"
                value={auditType}
                onChange={(e) => setAuditType(e.target.value as any)}
              >
                <option value="mensal">CHECK MENSAL</option>
                <option value="extraordinaria">EXTRAORDINÁRIA</option>
              </select>
            </div>
            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Inspetor Responsável</label>
              <div className="bg-slate-50 border-4 border-slate-900 rounded-2xl px-5 py-5 text-slate-900 flex items-center gap-3 font-black">
                <UserIcon size={20} className="text-orange-600" />
                {currentUser.nome}
              </div>
            </div>
          </div>

          <button
            disabled={!selectedObra}
            onClick={() => setStep('questions')}
            className="w-full bg-orange-600 text-white py-6 rounded-2xl font-black text-lg hover:bg-orange-700 disabled:opacity-50 transition-all flex items-center justify-center gap-3 shadow-[0_8px_0_0_rgb(154,52,18)] border-4 border-slate-900 active:translate-y-1 active:shadow-none"
          >
            CONFIRMAR ENTRADA EM CAMPO
            <ChevronRight size={24} />
          </button>
        </div>
      </div>
    );
  }

  if (step === 'processing') {
    return (
      <div className="min-h-[500px] flex flex-col items-center justify-center text-center space-y-8 animate-pulse">
        <div className="relative">
          <div className="w-32 h-32 border-[12px] border-slate-200 border-t-orange-600 rounded-full animate-spin"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <ShieldCheck className="text-orange-600" size={56} />
          </div>
        </div>
        <div className="space-y-3">
          <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Sincronizando com GD4</h2>
          <p className="text-slate-600 font-black text-sm uppercase tracking-widest">Validando evidências e calculando scoring Unità...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in slide-in-from-right duration-500 pb-20">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div className="w-16 h-16 bg-slate-900 text-white rounded-[1.25rem] flex items-center justify-center font-black text-3xl shadow-xl border-4 border-orange-600">
            {currentBlockKey}
          </div>
          <div>
            <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter leading-none">{BLOCKS[currentBlockKey]}</h2>
            <div className="flex gap-2 mt-3">
              {blockKeys.map((_, idx) => (
                <div 
                  key={idx} 
                  className={`h-3 w-10 rounded-full transition-all border-2 border-slate-900 ${idx <= currentBlockIdx ? 'bg-orange-600' : 'bg-slate-200'}`}
                />
              ))}
            </div>
          </div>
        </div>
        <div className="text-right hidden sm:block">
          <span className="text-[10px] font-black text-white bg-slate-900 px-3 py-1.5 rounded-full uppercase tracking-widest">Etapa {currentBlockIdx + 1} de {blockKeys.length}</span>
          <p className="text-lg font-black text-slate-900 mt-2 uppercase">{obras.find(o => o.id === selectedObra)?.nome}</p>
        </div>
      </div>

      <div className="space-y-6">
        {currentBlockKey === 'B' ? (
          <div className="bg-white p-8 rounded-[2.5rem] border-4 border-slate-900 shadow-[8px_8px_0px_0px_rgba(15,23,42,1)] space-y-10">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                  <Users size={16} className="text-orange-600" /> Efetivo Real (Campo)
                </label>
                <input 
                  type="number" 
                  className="w-full bg-slate-50 border-4 border-slate-900 rounded-2xl px-6 py-5 focus:ring-4 focus:ring-orange-500/20 focus:outline-none font-black text-4xl text-slate-900"
                  placeholder="0"
                  value={equipeCampo}
                  onChange={e => setEquipeCampo(e.target.value)}
                />
              </div>
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                  <Database size={16} className="text-orange-600" /> Efetivo GD4 (Sistema)
                </label>
                <input 
                  type="number" 
                  className="w-full bg-slate-50 border-4 border-slate-900 rounded-2xl px-6 py-5 focus:ring-4 focus:ring-orange-500/20 focus:outline-none font-black text-4xl text-slate-900"
                  placeholder="0"
                  value={equipeGd4}
                  onChange={e => setEquipeGd4(e.target.value)}
                />
              </div>
            </div>

            {equipeCampo && equipeGd4 && Number(equipeCampo) !== Number(equipeGd4) && (
              <div className="bg-rose-50 border-4 border-rose-600 p-6 rounded-2xl flex items-center justify-between shadow-lg">
                 <div className="flex items-center gap-4 text-rose-950">
                   <AlertCircle size={40} className="text-rose-600" />
                   <span className="text-xl font-black uppercase leading-tight">Divergência Crítica de Efetivo!</span>
                 </div>
                 <span className="text-5xl font-black text-rose-600">{Math.abs(Number(equipeCampo) - Number(equipeGd4))}</span>
              </div>
            )}

            <div className="space-y-4">
              <label className="text-sm font-black text-slate-900 uppercase tracking-tight block">Toda subcontratação em campo está autorizada pela Unità?</label>
              <div className="flex gap-4">
                {[true, false].map((val) => (
                  <button
                    key={val ? 'sim' : 'nao'}
                    onClick={() => setSubcontratacaoRegular(val)}
                    className={`
                      flex-1 py-6 rounded-2xl font-black text-sm uppercase transition-all border-4
                      ${subcontratacaoRegular === val 
                        ? (val ? 'bg-emerald-600 text-white border-slate-900 shadow-[0_6px_0_0_rgb(6,95,70)]' : 'bg-rose-600 text-white border-slate-900 shadow-[0_6px_0_0_rgb(159,18,57)]')
                        : 'bg-slate-50 text-slate-400 border-slate-300 hover:bg-slate-100'}
                    `}
                  >
                    {val ? 'SIM (CONFORME)' : 'NÃO (IRREGULAR)'}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : currentBlockKey === 'F' ? (
          // NOVO DESIGN PARA ENTREVISTAS (BLOCO F)
          <div className="space-y-6">
            <div className="bg-orange-50 border-4 border-orange-600 p-6 rounded-3xl flex items-start gap-4 shadow-sm">
               <MessageSquareQuote size={32} className="text-orange-600 shrink-0" />
               <div>
                  <h4 className="font-black text-orange-950 uppercase text-lg">Validação Comportamental</h4>
                  <p className="text-orange-900 text-sm font-bold">Realize entrevistas rápidas com colaboradores de diferentes frentes para validar a veracidade dos documentos da GRD.</p>
               </div>
            </div>
            {currentBlockQuestions.map((q) => {
               const resp = respostas.find(r => r.pergunta_id === q.id);
               return (
                 <div key={q.id} className="bg-white p-8 rounded-[2rem] border-4 border-slate-900 shadow-[8px_8px_0px_0px_rgba(15,23,42,1)] space-y-6">
                    <p className="text-slate-900 font-black text-xl leading-tight border-l-8 border-orange-600 pl-4">{q.texto}</p>
                    <div className="grid grid-cols-3 gap-4">
                       <button 
                          onClick={() => handleResponseChange(q.id, 'sim')}
                          className={`flex flex-col items-center gap-2 py-5 rounded-2xl border-4 transition-all ${resp?.resposta === 'sim' ? 'bg-emerald-600 text-white border-slate-900 shadow-[0_5px_0_0_rgb(6,95,70)]' : 'bg-slate-50 text-slate-400 border-slate-200'}`}
                       >
                          <CheckCircle2 size={32} />
                          <span className="text-[10px] font-black uppercase">Validado</span>
                       </button>
                       <button 
                          onClick={() => handleResponseChange(q.id, 'parcial')}
                          className={`flex flex-col items-center gap-2 py-5 rounded-2xl border-4 transition-all ${resp?.resposta === 'parcial' ? 'bg-amber-500 text-white border-slate-900 shadow-[0_5px_0_0_rgb(180,83,9)]' : 'bg-slate-50 text-slate-400 border-slate-200'}`}
                       >
                          <HelpCircle size={32} />
                          <span className="text-[10px] font-black uppercase">Inconsistente</span>
                       </button>
                       <button 
                          onClick={() => handleResponseChange(q.id, 'nao')}
                          className={`flex flex-col items-center gap-2 py-5 rounded-2xl border-4 transition-all ${resp?.resposta === 'nao' ? 'bg-rose-600 text-white border-slate-900 shadow-[0_5px_0_0_rgb(159,18,57)]' : 'bg-slate-50 text-slate-400 border-slate-200'}`}
                       >
                          <XCircle size={32} />
                          <span className="text-[10px] font-black uppercase">Contradição</span>
                       </button>
                    </div>
                    {resp && resp.resposta !== 'sim' && (
                       <textarea
                         value={resp.observacao || ''}
                         onChange={(e) => handleObsChange(q.id, e.target.value)}
                         placeholder="Descreva a inconsistência relatada pelo colaborador..."
                         className="w-full bg-rose-50 border-4 border-rose-200 rounded-2xl p-5 text-lg font-black text-slate-900 focus:ring-4 focus:ring-rose-600/20 focus:outline-none min-h-[120px]"
                       />
                    )}
                 </div>
               );
            })}
          </div>
        ) : (
          currentBlockQuestions.map((q) => {
            const resp = respostas.find(r => r.pergunta_id === q.id);
            const needsObs = resp && resp.resposta !== 'sim';
            
            return (
              <div key={q.id} className="bg-white p-8 rounded-[2rem] border-4 border-slate-900 shadow-[8px_8px_0px_0px_rgba(15,23,42,1)] space-y-6 transition-all hover:-translate-y-1">
                <p className="text-slate-900 font-black leading-tight text-2xl">{q.texto}</p>
                
                <div className="flex flex-wrap gap-3">
                  {(['sim', 'parcial', 'nao'] as ResponseValue[]).map((val) => (
                    <button
                      key={val}
                      onClick={() => handleResponseChange(q.id, val)}
                      className={`
                        flex-1 py-5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all border-4
                        ${resp?.resposta === val 
                          ? (val === 'sim' ? 'bg-emerald-600 text-white border-slate-900 shadow-[0_5px_0_0_rgb(6,95,70)]' : val === 'parcial' ? 'bg-amber-500 text-white border-slate-900 shadow-[0_5px_0_0_rgb(180,83,9)]' : 'bg-rose-600 text-white border-slate-900 shadow-[0_5px_0_0_rgb(159,18,57)]')
                          : 'bg-slate-50 text-slate-400 border-slate-200 hover:bg-slate-100'}
                      `}
                    >
                      {val}
                    </button>
                  ))}
                </div>

                {needsObs && (
                  <div className="animate-in slide-in-from-top-3 duration-300">
                    <label className="text-[10px] font-black text-rose-700 uppercase tracking-widest mb-2 block">Evidência / Observação Crítica</label>
                    <textarea
                      value={resp.observacao || ''}
                      onChange={(e) => handleObsChange(q.id, e.target.value)}
                      placeholder="Relate o desvio técnico encontrado..."
                      className="w-full bg-rose-50 border-4 border-rose-200 rounded-2xl p-5 text-lg font-black text-slate-900 focus:ring-4 focus:ring-rose-600/20 focus:outline-none min-h-[120px]"
                    />
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {currentBlockIdx === blockKeys.length - 1 && (
        <div className="bg-amber-50 border-4 border-amber-600 p-10 rounded-[2.5rem] space-y-6 shadow-xl">
          <div className="flex items-center gap-5 text-amber-950">
            <AlertTriangle size={48} className="text-amber-600" />
            <h3 className="font-black text-3xl uppercase tracking-tighter">Observações de Diretoria</h3>
          </div>
          <p className="text-lg text-amber-950 font-black leading-tight">Algum evento grave detectado que exija intervenção imediata da Unità?</p>
          <textarea
            value={ocorrencias}
            onChange={(e) => setOcorrencias(e.target.value)}
            className="w-full bg-white border-4 border-slate-900 rounded-2xl p-6 text-xl font-black text-slate-900 focus:ring-4 focus:ring-orange-600/20 focus:outline-none min-h-[220px]"
            placeholder="Ex: Identificado trabalho em altura sem treinamento ou alojamento com fiação exposta..."
          />
        </div>
      )}

      <footer className="flex justify-between items-center py-16">
        <button
          onClick={() => {
            if (currentBlockIdx === 0) setStep('setup');
            else setCurrentBlockIdx(prev => prev - 1);
          }}
          className="flex items-center gap-2 font-black text-slate-900 hover:text-orange-600 transition-colors uppercase text-sm tracking-widest group"
        >
          <ChevronLeft size={28} className="group-hover:-translate-x-1 transition-transform" />
          Etapa Anterior
        </button>

        {currentBlockIdx === blockKeys.length - 1 ? (
          <button
            disabled={!isBlockComplete()}
            onClick={handleSubmit}
            className="bg-slate-900 text-white px-16 py-7 rounded-2xl font-black text-xl hover:bg-orange-600 disabled:opacity-50 transition-all shadow-[0_10px_0_0_rgb(0,0,0)] border-4 border-slate-900 active:translate-y-2 active:shadow-none uppercase tracking-widest"
          >
            FINALIZAR AUDITORIA
          </button>
        ) : (
          <button
            disabled={!isBlockComplete()}
            onClick={() => setCurrentBlockIdx(prev => prev + 1)}
            className="bg-orange-600 text-white px-16 py-7 rounded-2xl font-black text-xl hover:bg-slate-900 disabled:opacity-50 transition-all flex items-center gap-3 shadow-[0_10px_0_0_rgb(154,52,18)] border-4 border-slate-900 active:translate-y-2 active:shadow-none uppercase tracking-widest"
          >
            PRÓXIMA ETAPA
            <ChevronRight size={32} />
          </button>
        )}
      </footer>
    </div>
  );
};

export default AuditWizard;
