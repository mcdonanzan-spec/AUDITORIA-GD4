
import React from 'react';
import { 
  Building2, 
  User as UserIcon, 
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Users,
  Database,
  MessageSquareQuote,
  Plus,
  Trash2,
  UserCheck
} from 'lucide-react';
import { Obra, Question, ResponseValue, AuditResponse, Audit, AIAnalysisResult, EntrevistaAmostral } from '../types';
import { QUESTIONS, INTERVIEW_QUESTIONS, BLOCKS } from '../constants';
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
  const [entrevistas, setEntrevistas] = React.useState<EntrevistaAmostral[]>([]);
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

  const handleObsChange = (questionId: string, val: string) => {
    setRespostas(prev => prev.map(r => r.pergunta_id === questionId ? { ...r, observacao: val } : r));
  };

  const addEntrevistado = () => {
    const novo: EntrevistaAmostral = {
      id: `ent-${Date.now()}`,
      funcao: '',
      respostas: INTERVIEW_QUESTIONS.map(q => ({ pergunta_id: q.id, resposta: 'sim' }))
    };
    setEntrevistas(prev => [...prev, novo]);
  };

  const removeEntrevistado = (id: string) => {
    setEntrevistas(prev => prev.filter(e => e.id !== id));
  };

  const updateEntrevista = (entId: string, qId: string, val: ResponseValue) => {
    setEntrevistas(prev => prev.map(e => {
      if (e.id === entId) {
        return {
          ...e,
          respostas: e.respostas.map(r => r.pergunta_id === qId ? { ...r, resposta: val } : r)
        };
      }
      return e;
    }));
  };

  const isBlockComplete = () => {
    if (currentBlockKey === 'B') {
      return equipeCampo !== '' && equipeGd4 !== '' && subcontratacaoRegular !== null;
    }
    if (currentBlockKey === 'G') {
      return entrevistas.length > 0 && entrevistas.every(e => e.funcao !== '');
    }
    return currentBlockQuestions.every(q => respostas.find(r => r.pergunta_id === q.id));
  };

  const coveragePercent = React.useMemo(() => {
    const total = Number(equipeCampo) || 1;
    return Math.round((entrevistas.length / total) * 100);
  }, [entrevistas.length, equipeCampo]);

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
        } else if (b === 'G') {
           const totalResps = entrevistas.flatMap(e => e.respostas);
           totalScore = totalResps.reduce((sum, r) => {
             const s = r.resposta === 'sim' ? 100 : r.resposta === 'parcial' ? 50 : 0;
             return sum + s;
           }, 0) / (totalResps.length || 1);
        } else {
           totalScore = bResps.reduce((sum, r) => {
            const score = r.resposta === 'sim' ? 100 : r.resposta === 'parcial' ? 50 : 0;
            return sum + score;
          }, 0) / (qIds.length || 1);
        }
        
        acc[BLOCKS[b as keyof typeof BLOCKS].toLowerCase().replace(/ /g, '_')] = Math.round(totalScore);
        return acc;
      }, {} as any);

      const auditPayload = {
        obra: obras.find(o => o.id === selectedObra)?.nome || '',
        data: new Date().toISOString(),
        auditor: currentUser.nome,
        blocos: blockScores,
        amostragem: {
          entrevistados: entrevistas.length,
          cobertura: `${coveragePercent}%`,
          detalhes: entrevistas
        },
        equipe: {
          campo: Number(equipeCampo),
          gd4: Number(equipeGd4),
          subcontratacao_regular: subcontratacaoRegular
        },
        ocorrencias_graves: ocorrencias.split('\n').filter(s => s.trim()),
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
        entrevistas,
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
          <p className="text-[#F05A22] font-black text-xs uppercase tracking-[0.2em] mt-2">Protocolo Unità Engenharia</p>
        </header>

        <div className="bg-white p-8 rounded-[2.5rem] shadow-[12px_12px_0px_0px_rgba(15,23,42,1)] border-4 border-slate-900 space-y-8">
          <div className="space-y-3">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Local da Inspeção</label>
            <div className="relative">
              <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-[#F05A22]" size={24} />
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
                <UserIcon size={20} className="text-[#F05A22]" />
                {currentUser.nome}
              </div>
            </div>
          </div>

          <button
            disabled={!selectedObra}
            onClick={() => setStep('questions')}
            className="w-full bg-[#F05A22] text-white py-6 rounded-2xl font-black text-lg hover:bg-slate-900 disabled:opacity-50 transition-all flex items-center justify-center gap-3 shadow-[0_8px_0_0_rgb(0,0,0)] border-4 border-slate-900 active:translate-y-1 active:shadow-none"
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
          <div className="w-32 h-32 border-[12px] border-slate-200 border-t-[#F05A22] rounded-full animate-spin"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <ShieldCheck className="text-[#F05A22]" size={56} />
          </div>
        </div>
        <div className="space-y-3">
          <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Sincronizando com GD4</h2>
          <p className="text-slate-600 font-black text-sm uppercase tracking-widest">Calculando Scoring Unità...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in slide-in-from-right duration-500 pb-20">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div className="w-16 h-16 bg-slate-900 text-white rounded-[1.25rem] flex items-center justify-center font-black text-3xl shadow-xl border-4 border-[#F05A22]">
            {currentBlockKey}
          </div>
          <div>
            <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter leading-none">{BLOCKS[currentBlockKey as keyof typeof BLOCKS]}</h2>
            <div className="flex gap-2 mt-3">
              {blockKeys.map((_, idx) => (
                <div 
                  key={idx} 
                  className={`h-3 w-10 rounded-full transition-all border-2 border-slate-900 ${idx <= currentBlockIdx ? 'bg-[#F05A22]' : 'bg-slate-200'}`}
                />
              ))}
            </div>
          </div>
        </div>
        
        {currentBlockKey === 'G' && (
          <div className="flex items-center gap-4 bg-white px-6 py-3 rounded-2xl border-4 border-slate-900 shadow-sm">
             <div className="flex flex-col items-end">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Cobertura Real</span>
                <span className={`text-xl font-black ${coveragePercent < 10 ? 'text-rose-600' : 'text-emerald-600'}`}>{coveragePercent}% do efetivo</span>
             </div>
             <UserCheck size={32} className="text-[#F05A22]" />
          </div>
        )}
      </div>

      <div className="space-y-6">
        {currentBlockKey === 'B' ? (
          <div className="bg-white p-8 rounded-[2.5rem] border-4 border-slate-900 shadow-[8px_8px_0px_0px_rgba(15,23,42,1)] space-y-10">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                  <Users size={16} className="text-[#F05A22]" /> Efetivo Real (Campo)
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
                  <Database size={16} className="text-[#F05A22]" /> Efetivo GD4 (Sistema)
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
        ) : currentBlockKey === 'G' ? (
          <div className="space-y-8">
            <div className="flex justify-between items-center bg-slate-900 p-6 rounded-3xl border-4 border-slate-900 shadow-xl">
               <div className="flex items-center gap-4 text-white">
                  <MessageSquareQuote size={32} className="text-[#F05A22]" />
                  <div>
                    <h4 className="font-black uppercase text-sm">Console de Amostragem</h4>
                    <p className="text-xs text-slate-400 font-bold uppercase">Entreviste trabalhadores para validar a documentação da GRD.</p>
                  </div>
               </div>
               <button 
                onClick={addEntrevistado}
                className="bg-[#F05A22] text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2 hover:bg-white hover:text-slate-900 transition-all border-2 border-transparent hover:border-slate-900"
               >
                 <Plus size={18} />
                 Adicionar Entrevistado
               </button>
            </div>

            <div className="space-y-6">
              {entrevistas.map((ent, entIdx) => (
                <div key={ent.id} className="bg-white rounded-[2.5rem] border-4 border-slate-900 shadow-[8px_8px_0px_0px_rgba(15,23,42,1)] overflow-hidden animate-in zoom-in-95">
                   <div className="bg-slate-50 p-6 border-b-4 border-slate-900 flex justify-between items-center">
                      <div className="flex items-center gap-4">
                         <div className="w-10 h-10 bg-slate-900 text-white rounded-xl flex items-center justify-center font-black">
                            {entIdx + 1}
                         </div>
                         <input 
                            placeholder="Qual a função deste colaborador?"
                            className="bg-transparent border-b-2 border-slate-300 focus:border-[#F05A22] focus:outline-none font-black text-slate-900 uppercase text-sm px-2 py-1"
                            value={ent.funcao}
                            onChange={(e) => {
                               const val = e.target.value;
                               setEntrevistas(prev => prev.map(item => item.id === ent.id ? {...item, funcao: val} : item));
                            }}
                         />
                      </div>
                      <button 
                        onClick={() => removeEntrevistado(ent.id)}
                        className="p-3 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                      >
                        <Trash2 size={20} />
                      </button>
                   </div>
                   <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
                      {INTERVIEW_QUESTIONS.map(q => {
                        const r = ent.respostas.find(item => item.pergunta_id === q.id);
                        return (
                          <div key={q.id} className="space-y-4">
                             <p className="text-xs font-black text-slate-600 uppercase tracking-tight leading-tight min-h-[32px]">{q.texto}</p>
                             <div className="flex gap-2">
                                {(['sim', 'parcial', 'nao'] as ResponseValue[]).map(v => (
                                  <button
                                    key={v}
                                    onClick={() => updateEntrevista(ent.id, q.id, v)}
                                    className={`
                                      flex-1 py-3 rounded-xl font-black text-[10px] uppercase transition-all border-2
                                      ${r?.resposta === v 
                                        ? (v === 'sim' ? 'bg-emerald-600 text-white border-slate-900' : v === 'parcial' ? 'bg-amber-500 text-white border-slate-900' : 'bg-rose-600 text-white border-slate-900')
                                        : 'bg-slate-50 text-slate-400 border-slate-200'}
                                    `}
                                  >
                                    {v}
                                  </button>
                                ))}
                             </div>
                          </div>
                        );
                      })}
                   </div>
                </div>
              ))}
              
              {entrevistas.length === 0 && (
                <div className="py-20 text-center border-4 border-dashed border-slate-300 rounded-[2.5rem] bg-slate-50">
                   <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto text-slate-300 border-4 border-slate-100 mb-4">
                      <Users size={40} />
                   </div>
                   <p className="text-slate-400 font-black uppercase text-sm tracking-widest">Nenhum entrevistado adicionado.<br/>Mínimo de 1 para prosseguir.</p>
                </div>
              )}
            </div>
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
            className="bg-slate-900 text-white px-16 py-7 rounded-2xl font-black text-xl hover:bg-[#F05A22] disabled:opacity-50 transition-all shadow-[0_10px_0_0_rgb(0,0,0)] border-4 border-slate-900 active:translate-y-2 active:shadow-none uppercase tracking-widest"
          >
            FINALIZAR AUDITORIA
          </button>
        ) : (
          <button
            disabled={!isBlockComplete()}
            onClick={() => setCurrentBlockIdx(prev => prev + 1)}
            className="bg-[#F05A22] text-white px-16 py-7 rounded-2xl font-black text-xl hover:bg-slate-900 disabled:opacity-50 transition-all flex items-center gap-3 shadow-[0_10px_0_0_rgb(154,52,18)] border-4 border-slate-900 active:translate-y-2 active:shadow-none uppercase tracking-widest"
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
