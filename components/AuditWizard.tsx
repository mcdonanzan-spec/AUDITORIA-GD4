
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
      // OTIMIZAÇÃO CRÍTICA: Não enviar as fotos em base64 para a IA.
      // A IA não precisa ver as fotos para calcular o risco jurídico baseado nos dados de texto.
      // Isso reduz o payload em 95%.
      const auditPayload = {
        obra: obras.find(o => o.id === selectedObra)?.nome || '',
        amostragem: {
          total_efetivo: Number(equipeCampo),
          efetivo_gd4: Number(equipeGd4),
          quarteirizacao_irregular: !subcontratacaoRegular,
          entrevistados: entrevistas.length,
          cobertura: `${coveragePercent}%`
        },
        desvios_identificados: respostas
          .filter(r => r.resposta !== 'sim' && r.resposta !== 'n_a')
          .map(r => ({
             pergunta: QUESTIONS.find(q => q.id === r.pergunta_id)?.texto,
             status: r.resposta,
             observacao: r.observacao
          })),
        entrevistas_resumo: entrevistas.map(e => ({
           funcao: e.funcao,
           erros: e.respostas.filter(r => r.resposta !== 'sim' && r.resposta !== 'n_a').length
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
    } catch (err) {
      console.error(err);
      setStep('questions');
      alert("Falha técnica ao processar relatório. Tente novamente.");
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
          <p className="text-slate-600 font-black text-sm uppercase tracking-widest">Processando Checklist Unità...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-20">
      <input type="file" accept="image/*" capture="environment" className="hidden" ref={fileInputRef} onChange={handleFileChange} />
      
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div className="w-16 h-16 bg-slate-900 text-white rounded-[1.25rem] flex items-center justify-center font-black text-3xl shadow-xl border-4 border-[#F05A22]">{currentBlockKey}</div>
          <div>
            <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter leading-none">{BLOCKS[currentBlockKey as keyof typeof BLOCKS]}</h2>
            <div className="flex gap-2 mt-3">
              {blockKeys.map((_, idx) => (
                <div key={idx} className={`h-3 w-10 rounded-full transition-all border-2 border-slate-900 ${idx <= currentBlockIdx ? 'bg-[#F05A22]' : 'bg-slate-200'}`} />
              ))}
            </div>
          </div>
        </div>
        {currentBlockKey === 'G' && (
          <div className={`flex items-center gap-4 px-6 py-3 rounded-2xl border-4 border-slate-900 shadow-sm ${targetMet ? 'bg-emerald-50' : 'bg-rose-50 animate-pulse'}`}>
             <div className="flex flex-col items-end">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Cobertura Real</span>
                <span className={`text-xl font-black ${targetMet ? 'text-emerald-600' : 'text-rose-600'}`}>{coveragePercent}%</span>
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
                <label className="text-[10px] font-black text-slate-500 uppercase flex items-center gap-2"><Users size={16} /> Efetivo Real</label>
                <input type="number" className="w-full bg-slate-50 border-4 border-slate-900 rounded-2xl px-6 py-5 font-black text-4xl" value={equipeCampo} onChange={e => setEquipeCampo(e.target.value)} />
              </div>
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-500 uppercase flex items-center gap-2"><Database size={16} /> Efetivo GD4</label>
                <input type="number" className="w-full bg-slate-50 border-4 border-slate-900 rounded-2xl px-6 py-5 font-black text-4xl" value={equipeGd4} onChange={e => setEquipeGd4(e.target.value)} />
              </div>
            </div>
            <div className="space-y-4">
              <label className="text-sm font-black uppercase">Quarteirização Autorizada?</label>
              <div className="flex gap-4">
                {[true, false].map((val) => (
                  <button key={val ? 's' : 'n'} onClick={() => setSubcontratacaoRegular(val)} className={`flex-1 py-6 rounded-2xl font-black border-4 transition-all ${subcontratacaoRegular === val ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-400 border-slate-200'}`}>{val ? 'SIM' : 'NÃO'}</button>
                ))}
              </div>
            </div>
          </div>
        ) : currentBlockKey === 'G' ? (
          <div className="space-y-8">
            <div className="flex justify-between items-center bg-slate-900 p-6 rounded-3xl text-white">
               <h4 className="font-black uppercase text-sm">Amostragem Operacional</h4>
               <button onClick={addEntrevistado} className="bg-[#F05A22] px-6 py-3 rounded-2xl font-black text-xs uppercase flex items-center gap-2"><Plus size={18} /> Add Colaborador</button>
            </div>
            {entrevistas.map((ent, idx) => (
              <div key={ent.id} className="bg-white rounded-[2.5rem] border-4 border-slate-900 overflow-hidden">
                 <div className="bg-slate-50 p-6 border-b-4 border-slate-900 flex justify-between items-center">
                    <div className="flex gap-4 flex-1">
                      <input placeholder="Função" className="bg-white border-2 border-slate-200 rounded-xl px-4 py-2 font-black text-xs flex-1 uppercase" value={ent.funcao} onChange={e => setEntrevistas(ev => ev.map(it => it.id === ent.id ? {...it, funcao: e.target.value} : it))} />
                      <input placeholder="Empresa" className="bg-white border-2 border-slate-200 rounded-xl px-4 py-2 font-black text-xs flex-1 uppercase" value={ent.empresa} onChange={e => setEntrevistas(ev => ev.map(it => it.id === ent.id ? {...it, empresa: e.target.value} : it))} />
                    </div>
                    <button onClick={() => removeEntrevistado(ent.id)} className="p-3 text-rose-600"><Trash2 size={20} /></button>
                 </div>
                 <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                    {INTERVIEW_QUESTIONS.map(q => (
                      <div key={q.id} className="space-y-2">
                         <p className="text-[10px] font-black uppercase text-slate-500">{q.texto}</p>
                         <div className="flex gap-2">
                           {['sim', 'nao'].map(v => (
                             <button key={v} onClick={() => updateEntrevista(ent.id, q.id, v as any)} className={`flex-1 py-2 rounded-xl font-black text-[10px] uppercase border-2 ${ent.respostas.find(r => r.pergunta_id === q.id)?.resposta === v ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-400 border-slate-200'}`}>{v}</button>
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
            return (
              <div key={q.id} className="bg-white p-8 rounded-[2rem] border-4 border-slate-900 shadow-[8px_8px_0px_0px_rgba(15,23,42,1)] space-y-6">
                <p className="text-slate-900 font-black text-xl uppercase tracking-tight leading-tight">{q.texto}</p>
                <div className="flex gap-3">
                  {(['sim', 'parcial', 'nao', 'n_a'] as ResponseValue[]).map((val) => (
                    <button key={val} onClick={() => handleResponseChange(q.id, val)} className={`flex-1 py-4 rounded-2xl font-black text-[10px] uppercase border-4 transition-all ${resp?.resposta === val ? 'bg-slate-900 text-white border-slate-900' : 'bg-slate-50 text-slate-400 border-slate-200'}`}>{val}</button>
                  ))}
                </div>
                {q.requiresPhotos && (
                  <div className="bg-slate-50 p-4 rounded-2xl border-4 border-slate-900 flex gap-4 overflow-x-auto">
                    {resp?.fotos?.map((f, i) => <img key={i} src={f} className="w-16 h-16 rounded-xl object-cover border-2 border-slate-900" />)}
                    <button onClick={() => triggerCamera(q.id)} className="w-16 h-16 rounded-xl border-4 border-dashed border-slate-300 flex items-center justify-center text-slate-400 hover:border-[#F05A22] hover:text-[#F05A22]"><Camera size={24} /></button>
                  </div>
                )}
                {needsObs && (
                  <textarea placeholder="Justifique o desvio..." className="w-full border-4 border-slate-900 rounded-2xl p-4 font-black bg-rose-50" value={resp.observacao || ''} onChange={e => handleObsChange(q.id, e.target.value)} />
                )}
              </div>
            );
          })
        )}
      </div>

      <footer className="flex justify-between items-center py-10">
        <button onClick={() => currentBlockIdx === 0 ? setStep('setup') : setCurrentBlockIdx(prev => prev - 1)} className="font-black uppercase text-xs tracking-widest flex items-center gap-2 hover:text-[#F05A22]"><ChevronLeft /> Voltar</button>
        <button disabled={!isBlockComplete()} onClick={() => currentBlockIdx === blockKeys.length - 1 ? handleSubmit() : setCurrentBlockIdx(prev => prev + 1)} className="bg-[#F05A22] text-white px-16 py-6 rounded-2xl font-black text-sm uppercase tracking-widest border-4 border-slate-900 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] disabled:opacity-50">Próxima Etapa <ChevronRight className="inline" /></button>
      </footer>
    </div>
  );
};

export default AuditWizard;
