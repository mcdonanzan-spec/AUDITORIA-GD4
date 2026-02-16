
import React from 'react';
import { 
  Building2, 
  User as UserIcon, 
  ChevronLeft, 
  ChevronRight, 
  ShieldCheck, 
  Users, 
  Database, 
  Plus, 
  Trash2, 
  UserCheck, 
  LayoutDashboard,
  Camera,
  AlertOctagon,
  Info,
  Loader2,
  Target,
  AlertCircle
} from 'lucide-react';
import { Obra, Question, ResponseValue, AuditResponse, Audit, AIAnalysisResult, EntrevistaAmostral } from '../types';
import { QUESTIONS, INTERVIEW_QUESTIONS, BLOCKS } from '../constants';
import { generateAuditReport } from '../services/gemini';

interface AuditWizardProps {
  obras: Obra[];
  currentUser: any;
  onAuditComplete: (audit: Audit, report: AIAnalysisResult) => void;
  onNavigate: (page: string) => void;
}

const AuditWizard: React.FC<AuditWizardProps> = ({ obras, currentUser, onAuditComplete, onNavigate }) => {
  const [step, setStep] = React.useState<'setup' | 'questions' | 'processing'>('setup');
  const [currentBlockIdx, setCurrentBlockIdx] = React.useState(0);
  const [loading, setLoading] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [activePhotoQuestionId, setActivePhotoQuestionId] = React.useState<string | null>(null);
  
  const [selectedObra, setSelectedObra] = React.useState<string>('');
  const [auditType, setAuditType] = React.useState<'mensal' | 'extraordinaria'>('mensal');
  
  const [equipeCampo, setEquipeCampo] = React.useState<string>('');
  const [equipeGd4, setEquipeGd4] = React.useState<string>('');
  const [subcontratacaoRegular, setSubcontratacaoRegular] = React.useState<boolean | null>(null);

  const [respostas, setRespostas] = React.useState<AuditResponse[]>([]);
  const [entrevistas, setEntrevistas] = React.useState<EntrevistaAmostral[]>([]);

  const blockKeys = Object.keys(BLOCKS) as Array<keyof typeof BLOCKS>;
  const currentBlockKey = blockKeys[currentBlockIdx];
  const currentBlockQuestions = QUESTIONS.filter(q => q.bloco === currentBlockKey);

  // Lógica de Amostragem (Meta 10%)
  const totalEfetivo = Number(equipeCampo) || 0;
  const targetCount = Math.ceil(totalEfetivo * 0.1);
  const coveragePercent = totalEfetivo > 0 ? Math.round((entrevistas.length / totalEfetivo) * 100) : 0;
  const targetMet = totalEfetivo > 0 ? (entrevistas.length >= targetCount) : false;
  const remainingInterviews = Math.max(0, targetCount - entrevistas.length);

  const handleResponseChange = (questionId: string, val: ResponseValue) => {
    setRespostas(prev => {
      const existing = prev.find(r => r.pergunta_id === questionId);
      if (existing) {
        return prev.map(r => r.pergunta_id === questionId ? { ...r, resposta: val } : r);
      }
      return [...prev, { pergunta_id: questionId, resposta: val, fotos: [] }];
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && activePhotoQuestionId) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setRespostas(prev => prev.map(r => {
          if (r.pergunta_id === activePhotoQuestionId) {
            const currentFotos = r.fotos || [];
            return { ...r, fotos: [...currentFotos, base64String] };
          }
          return r;
        }));
        setActivePhotoQuestionId(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const triggerCamera = (questionId: string) => {
    setActivePhotoQuestionId(questionId);
    fileInputRef.current?.click();
  };

  const handleObsChange = (questionId: string, val: string) => {
    setRespostas(prev => prev.map(r => r.pergunta_id === questionId ? { ...r, observacao: val } : r));
  };

  const addEntrevistado = () => {
    const novo: EntrevistaAmostral = {
      id: `ent-${Date.now()}`,
      funcao: '',
      empresa: '',
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
      // Requisito obrigatório de atingir 10% do efetivo
      return totalEfetivo > 0 && targetMet && entrevistas.every(e => e.funcao.trim() !== '' && e.empresa.trim() !== '');
    }

    return currentBlockQuestions.every(q => {
      const r = respostas.find(resp => resp.pergunta_id === q.id);
      if (!r) return false;
      const needsObs = r.resposta !== 'sim' && r.resposta !== 'n_a';
      if (needsObs && (!r.observacao || r.observacao.trim().length < 5)) return false;
      if (q.requiresPhotos) {
        const minReq = q.minPhotos || 3;
        if ((r.fotos?.length || 0) < minReq) return false;
      }
      return true;
    });
  };

  const handleSubmit = async () => {
    setStep('processing');
    setLoading(true);

    try {
      const auditPayload = {
        obra: obras.find(o => o.id === selectedObra)?.nome || '',
        amostragem: {
          total_efetivo: totalEfetivo,
          efetivo_gd4: Number(equipeGd4),
          quarteirizacao_irregular: !subcontratacaoRegular,
          entrevistados: entrevistas.length,
          cobertura: `${coveragePercent}%`,
          meta_atingida: targetMet
        },
        respostas_check: respostas.map(r => ({
           pergunta: QUESTIONS.find(q => q.id === r.pergunta_id)?.texto,
           resposta: r.resposta,
           obs: r.observacao || ''
        })),
        entrevistas: entrevistas.map(e => ({
           funcao: e.funcao,
           empresa: e.empresa,
           erros: e.respostas.filter(r => r.resposta !== 'sim').length
        }))
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
        equipe_campo: totalEfetivo,
        equipe_gd4: Number(equipeGd4),
        subcontratacao_identificada: !subcontratacaoRegular,
        created_at: new Date().toISOString()
      };

      onAuditComplete(newAudit, result);
    } catch (err) {
      console.error(err);
      setStep('questions');
      alert("Erro na análise. Verifique sua conexão ou créditos da API.");
    } finally {
      setLoading(false);
    }
  };

  const getButtonStyles = (val: ResponseValue, active: boolean) => {
    if (!active) return 'bg-white text-slate-400 border-slate-200';
    switch (val) {
      case 'sim': return 'bg-emerald-500 text-white border-slate-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]';
      case 'parcial': return 'bg-amber-500 text-white border-slate-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]';
      case 'nao': return 'bg-rose-500 text-white border-slate-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]';
      case 'n_a': return 'bg-slate-400 text-white border-slate-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]';
      default: return 'bg-white text-slate-400 border-slate-200';
    }
  };

  if (step === 'setup') {
    return (
      <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in duration-500">
        <header className="flex flex-col items-center">
          <button 
            onClick={() => onNavigate('dashboard')}
            className="flex items-center gap-2 px-6 py-2 bg-white border-2 border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-[#F05A22] transition-all mb-6"
          >
            <LayoutDashboard size={14} />
            Voltar ao Dashboard
          </button>
          <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Início de Auditoria</h2>
        </header>

        <div className="bg-white p-8 rounded-[2.5rem] shadow-[12px_12px_0px_0px_rgba(15,23,42,1)] border-4 border-slate-900 space-y-8">
          <div className="space-y-3">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Unidade Monitorada</label>
            <div className="relative">
              <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-[#F05A22]" size={24} />
              <select 
                className="w-full bg-slate-50 border-4 border-slate-900 rounded-2xl pl-12 pr-4 py-5 font-black text-lg text-slate-900 appearance-none focus:outline-none"
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
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Tipo</label>
              <select 
                className="w-full bg-slate-50 border-4 border-slate-900 rounded-2xl px-5 py-5 font-black text-slate-900 appearance-none focus:outline-none"
                value={auditType}
                onChange={(e) => setAuditType(e.target.value as any)}
              >
                <option value="mensal">MENSAL</option>
                <option value="extraordinaria">EXTRA</option>
              </select>
            </div>
            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Auditor</label>
              <div className="w-full bg-slate-100 border-4 border-slate-900 rounded-2xl px-5 py-5 font-black text-slate-900 flex items-center gap-2">
                <UserIcon size={18} className="text-[#F05A22]" />
                {currentUser.nome}
              </div>
            </div>
          </div>

          <button
            disabled={!selectedObra}
            onClick={() => setStep('questions')}
            className="w-full bg-[#F05A22] text-white py-6 rounded-2xl font-black text-lg hover:bg-slate-900 disabled:opacity-50 transition-all border-4 border-slate-900 shadow-[0_8px_0_0_rgb(0,0,0)] active:translate-y-1 active:shadow-none"
          >
            CONFIRMAR ENTRADA EM CAMPO
          </button>
        </div>
      </div>
    );
  }

  if (step === 'processing') {
    return (
      <div className="min-h-[500px] flex flex-col items-center justify-center text-center space-y-6">
        <Loader2 className="animate-spin text-[#F05A22]" size={64} />
        <h2 className="text-2xl font-black text-slate-900 uppercase">Gerando Inteligência de Risco...</h2>
        <p className="text-slate-500 font-bold uppercase text-xs tracking-widest">Aguarde a análise do motor Gemini</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-20 animate-in fade-in duration-500">
      <input type="file" accept="image/*" capture="environment" className="hidden" ref={fileInputRef} onChange={handleFileChange} />
      
      <div className="flex items-center gap-6">
        <div className="w-16 h-16 bg-slate-900 text-white rounded-[1.25rem] flex items-center justify-center font-black text-3xl border-4 border-[#F05A22] shadow-xl">{currentBlockKey}</div>
        <div>
           <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">{BLOCKS[currentBlockKey as keyof typeof BLOCKS]}</h2>
           <div className="flex gap-2 mt-2">
             {blockKeys.map((_, i) => (
               <div key={i} className={`h-2 w-8 rounded-full border-2 border-slate-900 ${i <= currentBlockIdx ? 'bg-[#F05A22]' : 'bg-slate-200'}`} />
             ))}
           </div>
        </div>
      </div>

      <div className="space-y-6">
        {currentBlockKey === 'B' ? (
          <div className="bg-white p-8 rounded-[2.5rem] border-4 border-slate-900 shadow-[8px_8px_0px_0px_rgba(15,23,42,1)] space-y-10">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-500 uppercase">Efetivo Real em Campo</label>
                <input type="number" className="w-full bg-slate-50 border-4 border-slate-900 rounded-2xl px-6 py-5 font-black text-4xl text-slate-900 placeholder-slate-300 focus:outline-none" value={equipeCampo} onChange={e => setEquipeCampo(e.target.value)} />
              </div>
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-500 uppercase">Efetivo no GD4</label>
                <input type="number" className="w-full bg-slate-50 border-4 border-slate-900 rounded-2xl px-6 py-5 font-black text-4xl text-slate-900 placeholder-slate-300 focus:outline-none" value={equipeGd4} onChange={e => setEquipeGd4(e.target.value)} />
              </div>
            </div>
            <div className="space-y-4">
              <p className="text-xs font-black uppercase text-slate-500">Subcontratação Identificada?</p>
              <div className="flex gap-4">
                <button onClick={() => setSubcontratacaoRegular(true)} className={`flex-1 py-6 rounded-2xl font-black border-4 transition-all ${subcontratacaoRegular === true ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-400 border-slate-200'}`}>SIM</button>
                <button onClick={() => setSubcontratacaoRegular(false)} className={`flex-1 py-6 rounded-2xl font-black border-4 transition-all ${subcontratacaoRegular === false ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-400 border-slate-200'}`}>NÃO</button>
              </div>
            </div>
          </div>
        ) : currentBlockKey === 'G' ? (
          <div className="space-y-6">
            {/* NOVO: Informativo de Meta de 10% */}
            <div className={`p-8 rounded-[2rem] border-4 border-slate-900 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] flex flex-col md:flex-row items-center justify-between gap-6 transition-all ${targetMet ? 'bg-emerald-50' : 'bg-amber-50'}`}>
              <div className="flex items-center gap-5">
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center border-4 border-slate-900 shadow-sm ${targetMet ? 'bg-emerald-500 text-white' : 'bg-amber-500 text-white'}`}>
                   {targetMet ? <ShieldCheck size={32} /> : <Target size={32} />}
                </div>
                <div>
                  <h4 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Status da Amostragem</h4>
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Exigência Unità: Mínimo 10% do Efetivo</p>
                </div>
              </div>
              <div className="flex items-center gap-10">
                <div className="text-center">
                  <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Cobertura</p>
                  <p className={`text-4xl font-black ${targetMet ? 'text-emerald-600' : 'text-amber-600'}`}>{coveragePercent}%</p>
                </div>
                <div className="h-12 w-1 bg-slate-200 hidden md:block"></div>
                <div className="text-right">
                  {targetMet ? (
                    <p className="text-emerald-600 font-black text-xs uppercase flex items-center gap-2"><UserCheck size={18} /> Meta Atingida</p>
                  ) : (
                    <div className="space-y-1">
                      <p className="text-rose-600 font-black text-xs uppercase flex items-center gap-2"><AlertCircle size={18} /> Meta Pendente</p>
                      <p className="text-slate-500 font-bold text-[10px] uppercase">Faltam <span className="text-slate-900">{remainingInterviews}</span> entrevistas</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center bg-slate-900 p-6 rounded-3xl text-white border-4 border-slate-900 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
               <span className="font-black uppercase text-xs tracking-widest">Checklist Amostral ({entrevistas.length})</span>
               <button onClick={addEntrevistado} className="bg-[#F05A22] px-6 py-3 rounded-2xl font-black text-xs uppercase flex items-center gap-2 border-2 border-slate-900 hover:bg-slate-900 transition-colors"><Plus size={18} /> Add Colaborador</button>
            </div>

            {entrevistas.map((ent, idx) => (
              <div key={ent.id} className="bg-white p-8 rounded-[2.5rem] border-4 border-slate-900 space-y-6 shadow-[8px_8px_0px_0px_rgba(15,23,42,1)]">
                 <div className="flex gap-4">
                    <input placeholder="FUNÇÃO" className="flex-1 bg-slate-50 border-4 border-slate-900 rounded-xl px-4 py-3 font-black text-slate-900 uppercase placeholder-slate-300 focus:outline-none" value={ent.funcao} onChange={e => setEntrevistas(ev => ev.map(it => it.id === ent.id ? {...it, funcao: e.target.value} : it))} />
                    <input placeholder="EMPRESA" className="flex-1 bg-slate-50 border-4 border-slate-900 rounded-xl px-4 py-3 font-black text-slate-900 uppercase placeholder-slate-300 focus:outline-none" value={ent.empresa} onChange={e => setEntrevistas(ev => ev.map(it => it.id === ent.id ? {...it, empresa: e.target.value} : it))} />
                    <button onClick={() => removeEntrevistado(ent.id)} className="text-rose-600 p-2 hover:bg-rose-50 rounded-xl transition-all"><Trash2 size={24} /></button>
                 </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {INTERVIEW_QUESTIONS.map(q => (
                      <div key={q.id} className="space-y-2">
                         <p className="text-[10px] font-black uppercase text-slate-500">{q.texto}</p>
                         <div className="flex gap-2">
                           {['sim', 'nao'].map(v => (
                             <button key={v} onClick={() => updateEntrevista(ent.id, q.id, v as any)} className={`flex-1 py-3 rounded-xl font-black text-[10px] border-4 transition-all ${ent.respostas.find(r => r.pergunta_id === q.id)?.resposta === v ? (v === 'sim' ? 'bg-emerald-500 text-white border-slate-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]' : 'bg-rose-500 text-white border-slate-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]') : 'bg-white text-slate-400 border-slate-100'}`}>{v.toUpperCase()}</button>
                           ))}
                         </div>
                      </div>
                    ))}
                 </div>
              </div>
            ))}
          </div>
        ) : (
          currentBlockQuestions.map((q) => {
            const resp = respostas.find(r => r.pergunta_id === q.id);
            const needsObs = resp && resp.resposta !== 'sim' && resp.resposta !== 'n_a';
            const numPhotos = resp?.fotos?.length || 0;
            const minReq = q.minPhotos || 3;
            const photoStatus = q.requiresPhotos ? (numPhotos >= minReq ? 'complete' : 'pending') : 'none';

            return (
              <div key={q.id} className="bg-white p-8 rounded-[2rem] border-4 border-slate-900 shadow-[8px_8px_0px_0px_rgba(15,23,42,1)] space-y-6">
                <p className="text-slate-900 font-black text-xl uppercase leading-tight tracking-tight">{q.texto}</p>
                <div className="flex gap-2">
                  {(['sim', 'parcial', 'nao', 'n_a'] as ResponseValue[]).map((val) => (
                    <button key={val} onClick={() => handleResponseChange(q.id, val)} className={`flex-1 py-5 rounded-2xl font-black text-[10px] border-4 transition-all ${getButtonStyles(val, resp?.resposta === val)}`}>{val.replace('_', ' ').toUpperCase()}</button>
                  ))}
                </div>
                
                {q.requiresPhotos && (
                  <div className={`p-5 border-4 rounded-2xl space-y-4 ${photoStatus === 'complete' ? 'bg-emerald-50 border-emerald-500' : 'bg-slate-50 border-slate-900'}`}>
                    <div className="flex justify-between items-center text-[10px] font-black uppercase">
                       <span className="flex items-center gap-2"><Info size={14} className="text-[#F05A22]" /> Necessário {minReq} fotos de evidência</span>
                       <span className={`px-3 py-1 rounded-full border-2 border-slate-900 ${photoStatus === 'complete' ? 'bg-emerald-500 text-white' : 'bg-slate-900 text-white'}`}>{numPhotos} / {minReq}</span>
                    </div>
                    <div className="flex gap-3 overflow-x-auto pb-2">
                       {resp?.fotos?.map((f, i) => (
                         <div key={i} className="relative shrink-0">
                           <img src={f} className="w-20 h-20 rounded-xl border-4 border-slate-900 object-cover" />
                           <button onClick={() => setRespostas(prev => prev.map(r => r.pergunta_id === q.id ? {...r, fotos: r.fotos?.filter((_, idx) => idx !== i)} : r))} className="absolute -top-2 -right-2 bg-rose-600 text-white p-1 rounded-full border-2 border-slate-900 shadow-md"><Trash2 size={12} /></button>
                         </div>
                       ))}
                       <button onClick={() => triggerCamera(q.id)} className="w-20 h-20 bg-white border-4 border-dashed border-slate-300 rounded-xl flex items-center justify-center text-slate-400 hover:text-[#F05A22] hover:border-[#F05A22] transition-colors"><Camera size={32} /></button>
                    </div>
                  </div>
                )}

                {needsObs && (
                  <textarea 
                    className="w-full border-4 border-slate-900 rounded-2xl p-5 font-black text-slate-900 bg-rose-50 placeholder-rose-300 focus:outline-none" 
                    placeholder="JUSTIFIQUE O DESVIO IDENTIFICADO (OBRIGATÓRIO)..." 
                    value={resp.observacao || ''} 
                    onChange={e => handleObsChange(q.id, e.target.value)} 
                  />
                )}
              </div>
            );
          })
        )}
      </div>

      <footer className="flex justify-between py-10">
        <button onClick={() => currentBlockIdx === 0 ? setStep('setup') : setCurrentBlockIdx(prev => prev - 1)} className="font-black uppercase text-xs hover:text-[#F05A22] flex items-center gap-2"><ChevronLeft size={18} /> Anterior</button>
        <button disabled={!isBlockComplete()} onClick={() => currentBlockIdx === blockKeys.length - 1 ? handleSubmit() : setCurrentBlockIdx(prev => prev + 1)} className="bg-[#F05A22] text-white px-12 py-5 rounded-2xl font-black text-sm border-4 border-slate-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] disabled:opacity-50 hover:bg-slate-900 transition-all active:translate-y-1 active:shadow-none">PRÓXIMO BLOCO <ChevronRight className="inline" size={18} /></button>
      </footer>
    </div>
  );
};

export default AuditWizard;
