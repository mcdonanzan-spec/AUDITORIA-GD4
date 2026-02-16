
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
  UserCheck, 
  AlertCircle, 
  LayoutDashboard,
  Camera,
  Briefcase,
  AlertOctagon
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

  const coveragePercent = React.useMemo(() => {
    const total = Number(equipeCampo) || 1;
    return Math.round((entrevistas.length / total) * 100);
  }, [entrevistas.length, equipeCampo]);

  const targetMet = coveragePercent >= 10;

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
      return targetMet && entrevistas.length > 0 && entrevistas.every(e => e.funcao.trim() !== '' && e.empresa.trim() !== '');
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
      // Otimização: Não enviamos as fotos (base64) para a IA para reduzir latência e custos de tokens
      const auditPayload = {
        obra: obras.find(o => o.id === selectedObra)?.nome || '',
        data: new Date().toISOString(),
        amostragem: {
          total_efetivo: Number(equipeCampo),
          divergencia: Math.abs(Number(equipeCampo) - Number(equipeGd4)),
          quarteirizacao_irregular: !subcontratacaoRegular,
          entrevistados: entrevistas.length
        },
        respostas_detalhadas: respostas.map(r => ({
           id: r.pergunta_id,
           resposta: r.resposta,
           obs: r.observacao
        })),
        entrevistas_resumo: entrevistas.map(e => ({
           cargo: e.funcao,
           empresa: e.empresa,
           falhas: e.respostas.filter(r => r.resposta !== 'sim' && r.resposta !== 'n_a').length
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
        equipe_campo: Number(equipeCampo),
        equipe_gd4: Number(equipeGd4),
        subcontratacao_identificada: !subcontratacaoRegular,
        created_at: new Date().toISOString()
      };

      onAuditComplete(newAudit, result);
    } catch (err: any) {
      console.error(err);
      setStep('questions');
      alert(err.message || "Falha técnica ao consolidar relatório. Verifique sua conexão ou tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  if (step === 'setup') {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <header className="flex flex-col items-center">
          <button 
            onClick={() => onNavigate('dashboard')}
            className="flex items-center gap-2 px-6 py-2 bg-white border-2 border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-[#F05A22] transition-all mb-6"
          >
            <LayoutDashboard size={14} />
            Voltar ao Dashboard
          </button>
          <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Início de Auditoria</h2>
          <p className="text-[#F05A22] font-black text-xs uppercase tracking-[0.2em] mt-2">Protocolo de Governança Unità</p>
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
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Auditor</label>
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
          <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Consolidando Matriz de Risco</h2>
          <p className="text-slate-600 font-black text-sm uppercase tracking-widest">A IA Unità está realizando as projeções jurídicas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in slide-in-from-right duration-500 pb-20">
      <input 
        type="file" 
        accept="image/*" 
        capture="environment" 
        className="hidden" 
        ref={fileInputRef} 
        onChange={handleFileChange}
      />
      
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
          <div className={`flex items-center gap-4 px-6 py-3 rounded-2xl border-4 border-slate-900 shadow-sm transition-all ${targetMet ? 'bg-emerald-50' : 'bg-rose-50 animate-pulse'}`}>
             <div className="flex flex-col items-end">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Cobertura Real</span>
                <span className={`text-xl font-black ${targetMet ? 'text-emerald-600' : 'text-rose-600'}`}>{coveragePercent}% do efetivo</span>
                {!targetMet && <span className="text-[8px] font-black uppercase text-rose-500">Mínimo 10% exigido</span>}
             </div>
             {targetMet ? <UserCheck size={32} className="text-emerald-500" /> : <AlertOctagon size={32} className="text-rose-600" />}
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
                  <Database size={16} className="text-[#F05A22]" /> Efetivo no GD4 (Sistema)
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
                    <h4 className="font-black uppercase text-sm">Entrevistas de Campo</h4>
                    <p className="text-xs text-slate-400 font-bold uppercase">Valide a realidade do canteiro com os trabalhadores.</p>
                  </div>
               </div>
               <button 
                onClick={addEntrevistado}
                className="bg-[#F05A22] text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2 hover:bg-white hover:text-slate-900 transition-all border-2 border-transparent hover:border-slate-900"
               >
                 <Plus size={18} />
                 Adicionar Colaborador
               </button>
            </div>

            <div className="space-y-6">
              {entrevistas.map((ent, entIdx) => (
                <div key={ent.id} className="bg-white rounded-[2.5rem] border-4 border-slate-900 shadow-[8px_8px_0px_0px_rgba(15,23,42,1)] overflow-hidden animate-in zoom-in-95">
                   <div className="bg-slate-50 p-6 border-b-4 border-slate-900 flex justify-between items-center gap-4">
                      <div className="flex items-center gap-4 flex-1">
                         <div className="w-10 h-10 bg-slate-900 text-white rounded-xl flex items-center justify-center font-black">
                            {entIdx + 1}
                         </div>
                         <div className="grid grid-cols-2 gap-4 flex-1">
                            <div className="relative">
                               <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                               <input 
                                  placeholder="Cargo/Função"
                                  className="w-full bg-white border-2 border-slate-200 rounded-xl pl-10 pr-4 py-3 font-black text-slate-900 uppercase text-xs"
                                  value={ent.funcao}
                                  onChange={(e) => setEntrevistas(prev => prev.map(item => item.id === ent.id ? {...item, funcao: e.target.value} : item))}
                               />
                            </div>
                            <div className="relative">
                               <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                               <input 
                                  placeholder="Nome da Empresa"
                                  className="w-full bg-white border-2 border-slate-200 rounded-xl pl-10 pr-4 py-3 font-black text-slate-900 uppercase text-xs"
                                  value={ent.empresa}
                                  onChange={(e) => setEntrevistas(prev => prev.map(item => item.id === ent.id ? {...item, empresa: e.target.value} : item))}
                               />
                            </div>
                         </div>
                      </div>
                      <button onClick={() => removeEntrevistado(ent.id)} className="p-3 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all">
                        <Trash2 size={20} />
                      </button>
                   </div>
                   <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
                      {INTERVIEW_QUESTIONS.map(q => {
                        const r = ent.respostas.find(item => item.pergunta_id === q.id);
                        return (
                          <div key={q.id} className="space-y-4">
                             <p className="text-xs font-black text-slate-600 uppercase tracking-tight leading-tight">{q.texto}</p>
                             <div className="flex gap-2">
                                {(['sim', 'parcial', 'nao', 'n_a'] as ResponseValue[]).map(v => (
                                  <button
                                    key={v}
                                    onClick={() => updateEntrevista(ent.id, q.id, v)}
                                    className={`
                                      flex-1 py-3 rounded-xl font-black text-[10px] uppercase transition-all border-2
                                      ${r?.resposta === v 
                                        ? (v === 'sim' ? 'bg-emerald-600 text-white border-slate-900' : v === 'parcial' ? 'bg-amber-500 text-white border-slate-900' : v === 'nao' ? 'bg-rose-600 text-white border-slate-900' : 'bg-slate-500 text-white border-slate-900')
                                        : 'bg-slate-50 text-slate-400 border-slate-200'}
                                    `}
                                  >
                                    {v === 'n_a' ? 'N/A' : v}
                                  </button>
                                ))}
                             </div>
                          </div>
                        );
                      })}
                   </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          currentBlockQuestions.map((q) => {
            const resp = respostas.find(r => r.pergunta_id === q.id);
            const needsObs = resp && resp.resposta !== 'sim' && resp.resposta !== 'n_a';
            const obsIsMissing = needsObs && (!resp.observacao || resp.observacao.trim().length < 5);
            const minReq = q.minPhotos || 3;
            
            return (
              <div key={q.id} className="bg-white p-8 rounded-[2rem] border-4 border-slate-900 shadow-[8px_8px_0px_0px_rgba(15,23,42,1)] space-y-6 transition-all hover:-translate-y-1">
                <p className="text-slate-900 font-black leading-tight text-2xl">{q.texto}</p>
                
                <div className="flex flex-wrap gap-3">
                  {(['sim', 'parcial', 'nao', 'n_a'] as ResponseValue[]).map((val) => (
                    <button
                      key={val}
                      onClick={() => handleResponseChange(q.id, val)}
                      className={`
                        flex-1 py-5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all border-4
                        ${resp?.resposta === val 
                          ? (val === 'sim' ? 'bg-emerald-600 text-white border-slate-900 shadow-[0_5px_0_0_rgb(6,95,70)]' : 
                             val === 'parcial' ? 'bg-amber-500 text-white border-slate-900 shadow-[0_5px_0_0_rgb(180,83,9)]' : 
                             val === 'nao' ? 'bg-rose-600 text-white border-slate-900 shadow-[0_5px_0_0_rgb(159,18,57)]' :
                             'bg-slate-400 text-white border-slate-900 shadow-[0_5px_0_0_rgb(100,116,139)]')
                          : 'bg-slate-50 text-slate-400 border-slate-200 hover:bg-slate-100'}
                      `}
                    >
                      {val === 'n_a' ? 'N/A' : val}
                    </button>
                  ))}
                </div>

                {q.requiresPhotos && (
                  <div className={`bg-slate-50 p-6 rounded-2xl border-4 space-y-4 transition-all ${((resp?.fotos?.length || 0) < minReq) ? 'border-rose-400' : 'border-slate-900'}`}>
                    <div className="flex justify-between items-center">
                      <p className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                         <Camera size={16} className="text-[#F05A22]" /> 
                         Evidência Fotográfica (Mínimo {minReq} {minReq === 1 ? 'Foto' : 'Fotos'})
                      </p>
                      <span className={`text-xs font-black ${(resp?.fotos?.length || 0) < minReq ? 'text-rose-600 animate-pulse' : 'text-emerald-600'}`}>
                        {resp?.fotos?.length || 0}/{minReq}
                      </span>
                    </div>
                    <div className="flex gap-4 overflow-x-auto pb-2">
                       {(resp?.fotos || []).map((f, i) => (
                         <div key={i} className="w-24 h-24 rounded-xl border-4 border-slate-900 overflow-hidden shadow-sm shrink-0">
                            <img src={f} className="w-full h-full object-cover" />
                         </div>
                       ))}
                       {(resp?.fotos?.length || 0) < 5 && (
                         <button 
                           onClick={() => triggerCamera(q.id)}
                           className="w-24 h-24 rounded-xl border-4 border-dashed border-slate-300 flex flex-col items-center justify-center text-slate-400 hover:text-[#F05A22] hover:border-[#F05A22] transition-all bg-white shrink-0"
                         >
                           <Camera size={24} />
                           <span className="text-[10px] font-black uppercase">FOTO</span>
                         </button>
                       )}
                    </div>
                  </div>
                )}

                {needsObs && (
                  <div className="animate-in slide-in-from-top-3 duration-300 space-y-2">
                    <label className={`text-[10px] font-black uppercase tracking-widest ${obsIsMissing ? 'text-rose-600' : 'text-slate-400'}`}>
                       Justificativa Obrigatória {obsIsMissing && '(Favor detalhar o desvio)'}
                    </label>
                    <textarea
                      value={resp.observacao || ''}
                      onChange={(e) => handleObsChange(q.id, e.target.value)}
                      placeholder="Descreva o desvio técnico ou observação relevante encontrada no campo..."
                      className={`w-full border-4 rounded-2xl p-5 text-lg font-black text-slate-900 focus:ring-4 focus:outline-none min-h-[120px] transition-all
                        ${obsIsMissing ? 'bg-rose-50 border-rose-300 focus:ring-rose-500/20' : 'bg-slate-50 border-slate-100 focus:border-slate-900 focus:ring-slate-500/10'}`}
                    />
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      <footer className="flex justify-between items-center py-16">
        <button onClick={() => currentBlockIdx === 0 ? setStep('setup') : setCurrentBlockIdx(prev => prev - 1)} className="flex items-center gap-2 font-black text-slate-900 hover:text-orange-600 uppercase text-sm tracking-widest group">
          <ChevronLeft size={28} className="group-hover:-translate-x-1 transition-transform" />
          Voltar
        </button>

        <button
          disabled={!isBlockComplete()}
          onClick={() => currentBlockIdx === blockKeys.length - 1 ? handleSubmit() : setCurrentBlockIdx(prev => prev + 1)}
          className={`
            px-16 py-7 rounded-2xl font-black text-xl transition-all shadow-[0_10px_0_0_rgb(0,0,0)] border-4 border-slate-900 active:translate-y-2 active:shadow-none uppercase tracking-widest
            ${!isBlockComplete() ? 'opacity-50 cursor-not-allowed bg-slate-200 text-slate-400 shadow-none translate-y-2' : 
              currentBlockIdx === blockKeys.length - 1 ? 'bg-slate-900 text-white hover:bg-[#F05A22]' : 'bg-[#F05A22] text-white hover:bg-slate-900'}
          `}
        >
          {currentBlockIdx === blockKeys.length - 1 ? 'FINALIZAR RELATÓRIO' : 'PRÓXIMA ETAPA'}
        </button>
      </footer>
    </div>
  );
};

export default AuditWizard;
