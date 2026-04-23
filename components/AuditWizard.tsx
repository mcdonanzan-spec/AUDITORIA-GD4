
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
  AlertCircle,
  FileSearch
} from 'lucide-react';
import { Obra, Question, ResponseValue, AuditResponse, Audit, AIAnalysisResult, EntrevistaAmostral } from '../types';
import { QUESTIONS, INTERVIEW_QUESTIONS, BLOCKS } from '../constants';
import { generateAuditReport } from '../services/gemini';
import { saveAudit, uploadImage } from '../services/supabase';

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
  const [error, setError] = React.useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [activePhotoQuestionId, setActivePhotoQuestionId] = React.useState<string | null>(null);
  
  const [selectedObra, setSelectedObra] = React.useState<string>('');
  const [auditType, setAuditType] = React.useState<'mensal' | 'extraordinaria'>('mensal');
  
  const [showClearConfirm, setShowClearConfirm] = React.useState(false);
  const [showClearAllConfirm, setShowClearAllConfirm] = React.useState(false);
  const [showRestartConfirm, setShowRestartConfirm] = React.useState(false);

  const [equipeCampo, setEquipeCampo] = React.useState<string>('');
  const [equipeGd4, setEquipeGd4] = React.useState<string>('');
  const [subcontratacaoRegular, setSubcontratacaoRegular] = React.useState<boolean | 'n_a' | null>(null);

  const [respostas, setRespostas] = React.useState<AuditResponse[]>([]);
  const [entrevistas, setEntrevistas] = React.useState<EntrevistaAmostral[]>([]);

  // PERSISTÊNCIA DE RASCUNHO
  const isLoaded = React.useRef(false);

  React.useEffect(() => {
    // Reset state when obra changes to avoid cross-contamination
    isLoaded.current = false;
    setRespostas([]);
    setEntrevistas([]);
    setEquipeCampo('');
    setEquipeGd4('');
    setSubcontratacaoRegular(null);
    setCurrentBlockIdx(0);
    setError(null);

    if (selectedObra) {
      const draft = localStorage.getItem(`audit_draft_${selectedObra}`);
      if (draft) {
        try {
          const parsed = JSON.parse(draft);
          if (parsed.respostas) setRespostas(parsed.respostas);
          if (parsed.entrevistas) setEntrevistas(parsed.entrevistas);
          if (parsed.equipeCampo) setEquipeCampo(parsed.equipeCampo);
          if (parsed.equipeGd4) setEquipeGd4(parsed.equipeGd4);
          if (parsed.subcontratacaoRegular !== undefined) setSubcontratacaoRegular(parsed.subcontratacaoRegular);
          if (parsed.currentBlockIdx !== undefined) setCurrentBlockIdx(parsed.currentBlockIdx);
          console.log(`Rascunho carregado para a obra: ${selectedObra}`);
        } catch (err) {
          console.error("Erro ao carregar rascunho:", err);
        }
      }
      
      // Permitir salvamento após um pequeno delay para garantir que o estado foi atualizado
      setTimeout(() => {
        isLoaded.current = true;
      }, 150);
    }
  }, [selectedObra]);

  React.useEffect(() => {
    // Só salva se o carregamento inicial terminou e temos uma obra selecionada
    if (isLoaded.current && selectedObra) {
      const hasData = respostas.length > 0 || entrevistas.length > 0 || equipeCampo || equipeGd4 || currentBlockIdx > 0;
      
      if (hasData) {
        try {
          localStorage.setItem(`audit_draft_${selectedObra}`, JSON.stringify({
            respostas,
            entrevistas,
            equipeCampo,
            equipeGd4,
            subcontratacaoRegular,
            currentBlockIdx,
            timestamp: Date.now()
          }));
        } catch (err) {
          console.warn("Falha ao salvar rascunho (provavelmente limite de armazenamento):", err);
        }
      }
    }
  }, [respostas, entrevistas, selectedObra, equipeCampo, equipeGd4, subcontratacaoRegular, currentBlockIdx]);

  const clearDraft = () => {
    if (selectedObra) localStorage.removeItem(`audit_draft_${selectedObra}`);
    setRespostas([]);
    setEntrevistas([]);
    setEquipeCampo('');
    setEquipeGd4('');
    setSubcontratacaoRegular(null);
    setCurrentBlockIdx(0);
  };

  const blockKeys = Object.keys(BLOCKS) as Array<keyof typeof BLOCKS>;
  const currentBlockKey = blockKeys[currentBlockIdx];
  const currentBlockQuestions = QUESTIONS.filter(q => q.bloco === currentBlockKey);

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

  const compressImage = (base64Str: string): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = base64Str;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 800;
        const MAX_HEIGHT = 600;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.7)); // Comprime para JPEG com 70% de qualidade
      };
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && activePhotoQuestionId) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = reader.result as string;
        const compressed = await compressImage(base64String);
        
        setRespostas(prev => prev.map(r => {
          if (r.pergunta_id === activePhotoQuestionId) {
            const currentFotos = r.fotos || [];
            return { ...r, fotos: [...currentFotos, compressed] };
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
      const basicFields = equipeCampo !== '' && equipeGd4 !== '';
      const questionsFilled = currentBlockQuestions.every(q => {
        const r = respostas.find(resp => resp.pergunta_id === q.id);
        if (!r) return false;
        const isNonCompliant = q.inverted ? r.resposta === 'sim' : (r.resposta !== 'sim' && r.resposta !== 'n_a');
        if (isNonCompliant && (!r.observacao || r.observacao.trim().length < 5)) return false;
        return true;
      });
      return basicFields && questionsFilled;
    }
    
    if (currentBlockKey === 'G') {
      return totalEfetivo > 0 && targetMet && entrevistas.every(e => e.funcao.trim() !== '' && e.empresa.trim() !== '');
    }

    if (currentBlockKey === 'H') {
      if (subcontratacaoRegular === null) return false;
      if (subcontratacaoRegular === 'n_a') return true;
      
      const hResp = respostas.find(r => r.pergunta_id === 'h1');
      if (!hResp) return false;
      if (hResp.resposta === 'n_a') return true;
      const needsObs = hResp.resposta === 'nao';
      if (needsObs && (!hResp.observacao || hResp.observacao.trim().length < 5)) return false;
      if ((hResp.fotos?.length || 0) < 1) return false;
      return true;
    }

    return currentBlockQuestions.every(q => {
      const r = respostas.find(resp => resp.pergunta_id === q.id);
      if (!r) return false;
      const isNonCompliant = q.inverted ? r.resposta === 'sim' : (r.resposta !== 'sim' && r.resposta !== 'n_a');
      if (isNonCompliant && (!r.observacao || r.observacao.trim().length < 5)) return false;
      if (q.requiresPhotos) {
        const minReq = q.minPhotos || 3;
        if ((r.fotos?.length || 0) < minReq) return false;
      }
      return true;
    });
  };


  const handleSubmit = async () => {
    setError(null);
    setStep('processing');
    setLoading(true);

    try {
      // 1. UPLOAD DAS IMAGENS PARA O STORAGE
      console.log('Iniciando upload de evidências para o Storage...');
      const respostasComUrls = await Promise.all(respostas.map(async (r) => {
        if (!r.fotos || r.fotos.length === 0) return r;
        
        const urls = await Promise.all(r.fotos.map(async (base64, idx) => {
          // Se já for uma URL (caso de rascunhos que já foram processados parcialmente), não sobe de novo
          if (base64.startsWith('http')) return base64;
          
          const fileName = `${Date.now()}_${r.pergunta_id}_${idx}.jpg`;
          const path = `${selectedObra}/${fileName}`;
          return await uploadImage(base64, path);
        }));
        
        return { ...r, fotos: urls };
      }));

      // 2. PREPARAR PAYLOAD PARA IA (SEM AS FOTOS PARA ECONOMIZAR TOKEN)
      const auditPayload = {
        obra: obras.find(o => o.id === selectedObra)?.nome || '',
        amostragem: {
          total_efetivo: totalEfetivo,
          efetivo_gd4: Number(equipeGd4),
          quarteirizacao_irregular: subcontratacaoRegular === false,
          entrevistados: entrevistas.length,
          cobertura: `${coveragePercent}%`,
        },
        respostas_check: respostasComUrls.map(r => ({
           pergunta: QUESTIONS.find(q => q.id === r.pergunta_id)?.texto,
           resposta: r.resposta,
           obs: r.observacao || ''
        })),
        entrevistas: entrevistas.map(e => ({
           funcao: e.funcao,
           empresa: e.empresa,
           respostas: e.respostas.map(er => ({
             pergunta: INTERVIEW_QUESTIONS.find(iq => iq.id === er.pergunta_id)?.texto,
             resposta: er.resposta
           }))
        }))
      };

      // 3. GERAR RELATÓRIO PELA IA
      const result = await generateAuditReport(auditPayload);

      // 4. SALVAR NO SUPABASE COM AS URLs DAS FOTOS
      // Mapeamento de texto para número (Evita erro 22P02 do Supabase)
      const mapRiscoToNumber = (text: string): number => {
        const t = String(text).toUpperCase();
        if (t.includes('CRÍTICO') || t.includes('CRITICO')) return 4;
        if (t.includes('ALTO') || t.includes('ATENÇÃO') || t.includes('ATENCAO')) return 3;
        if (t.includes('MÉDIO') || t.includes('MEDIO') || t.includes('REGULAR')) return 2;
        return 1; // Baixo
      };

      const auditData = {
        obra_id: selectedObra,
        auditor_id: currentUser.id,
        tipo: auditType,
        indice_geral: Number(result.indiceGeral) || 0,
        risco_juridico: mapRiscoToNumber(result.riscoJuridico),
        classificacao: mapRiscoToNumber(result.classificacao),
        equipe_campo: Number(totalEfetivo) || 0,
        equipe_gd4: Number(equipeGd4) || 0,
        subcontratacao_identificada: subcontratacaoRegular === false,
        relatorio_ia: JSON.stringify({
          ...result,
          entrevistas_raw: entrevistas,
          respostas_raw: respostasComUrls,
          equipe_campo_raw: totalEfetivo,
          equipe_gd4_raw: Number(equipeGd4),
          subcontratacao_identificada_raw: subcontratacaoRegular === false,
          classificacao_raw: result.classificacao
        }),
        created_at: new Date().toISOString()
      };

      const savedAudit = await saveAudit(auditData as any);
      
      const hydratedAudit = {
        ...savedAudit,
        classificacao: result.classificacao,
        respostas: respostasComUrls,
        entrevistas,
        equipe_campo: totalEfetivo,
        equipe_gd4: Number(equipeGd4),
        subcontratacao_identificada: subcontratacaoRegular === false
      };

      clearDraft();
      onAuditComplete(hydratedAudit, result);
    } catch (err: any) {
      console.error("Erro no processamento da auditoria:", err);
      setStep('questions');
      
      let errorMessage = "Falha no processamento. Tente novamente.";
      
      if (err.message === "LIMITE_ATINGIDO") {
        errorMessage = "O motor de análise atingiu o limite temporário de processamento. Por favor, aguarde cerca de 30 a 60 segundos e tente enviar novamente.";
      } else if (err.message?.includes("Configuração da API Key") || err.message?.includes("API_KEY")) {
        errorMessage = "A chave da API do Gemini não foi configurada corretamente. Entre em contato com o administrador.";
      } else if (err.message?.includes("503") || err.message?.includes("UNAVAILABLE") || err.message?.includes("high demand")) {
        errorMessage = "O serviço de IA está temporariamente sobrecarregado devido à alta demanda. Por favor, aguarde alguns segundos e tente enviar novamente.";
      } else if (err.message?.includes("Timeout")) {
        errorMessage = "A análise da IA demorou muito para responder. Tente novamente com menos fotos ou observações mais curtas.";
      } else if (err.message?.includes("row size limit") || err.message?.includes("Payload Too Large") || err.status === 413) {
        errorMessage = "O relatório é muito grande para ser salvo. Tente reduzir o número de fotos ou o tamanho das observações.";
      } else if (err.message) {
        errorMessage = err.message.substring(0, 300);
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const getButtonStyles = (val: ResponseValue, active: boolean, inverted?: boolean) => {
    if (!active) return 'bg-white text-slate-400 border-slate-200';
    
    // Se a pergunta for invertida, trocamos as cores de SIM e NAO
    let effectiveVal = val;
    if (inverted) {
      if (val === 'sim') effectiveVal = 'nao';
      else if (val === 'nao') effectiveVal = 'sim';
    }

    switch (effectiveVal) {
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
            {localStorage.getItem(`audit_draft_${selectedObra}`) ? 'CONTINUAR RASCUNHO' : 'CONFIRMAR ENTRADA EM CAMPO'}
          </button>

          {selectedObra && localStorage.getItem(`audit_draft_${selectedObra}`) && (
            <div className="space-y-3">
              {!showClearConfirm ? (
                <button
                  onClick={() => setShowClearConfirm(true)}
                  className="w-full text-rose-600 font-black text-xs uppercase tracking-widest hover:underline"
                >
                  Apagar Rascunho desta Obra
                </button>
              ) : (
                <div className="flex flex-col items-center gap-2 p-4 bg-rose-50 border-2 border-rose-200 rounded-2xl animate-in fade-in zoom-in duration-200">
                  <p className="text-[10px] font-black text-rose-600 uppercase">Tem certeza? Isso apagará o progresso desta obra.</p>
                  <div className="flex gap-4 w-full">
                    <button 
                      onClick={() => {
                        clearDraft();
                        setShowClearConfirm(false);
                        window.location.reload();
                      }}
                      className="flex-1 bg-rose-600 text-white py-2 rounded-lg font-black text-[10px] uppercase"
                    >
                      Sim, Apagar
                    </button>
                    <button 
                      onClick={() => setShowClearConfirm(false)}
                      className="flex-1 bg-slate-200 text-slate-600 py-2 rounded-lg font-black text-[10px] uppercase"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="pt-4">
            {!showClearAllConfirm ? (
              <button
                onClick={() => setShowClearAllConfirm(true)}
                className="w-full text-slate-400 font-black text-[10px] uppercase tracking-widest hover:text-slate-600"
              >
                Limpar Todos os Rascunhos do Sistema
              </button>
            ) : (
              <div className="flex flex-col items-center gap-2 p-4 bg-slate-100 border-2 border-slate-200 rounded-2xl animate-in fade-in zoom-in duration-200">
                <p className="text-[9px] font-black text-slate-600 uppercase text-center">Apagar TODOS os rascunhos de todas as obras?</p>
                <div className="flex gap-4 w-full">
                  <button 
                    onClick={() => {
                      Object.keys(localStorage).forEach(key => {
                        if (key.startsWith('audit_draft_')) {
                          localStorage.removeItem(key);
                        }
                      });
                      clearDraft();
                      setShowClearAllConfirm(false);
                      window.location.reload();
                    }}
                    className="flex-1 bg-slate-900 text-white py-2 rounded-lg font-black text-[9px] uppercase"
                  >
                    Sim, Limpar Tudo
                  </button>
                  <button 
                    onClick={() => setShowClearAllConfirm(false)}
                    className="flex-1 bg-white text-slate-400 py-2 rounded-lg font-black text-[9px] uppercase border border-slate-200"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (step === 'processing') {
    return (
      <div className="min-h-[500px] flex flex-col items-center justify-center text-center p-6 space-y-8 animate-in fade-in duration-500">
        <div className="relative">
          <div className="absolute inset-0 bg-[#F05A22] blur-3xl opacity-20 animate-pulse" />
          <Loader2 className="animate-spin text-[#F05A22] relative z-10" size={80} />
        </div>
        <div className="space-y-4 max-w-md">
          <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter leading-none">Análise de Risco em Tempo Real...</h2>
          <p className="text-slate-500 font-bold uppercase text-xs tracking-widest leading-relaxed">O motor de Governança Unità está processando seus dados e gerando o relatório estratégico.</p>
        </div>
        
        <div className="pt-8 flex flex-col items-center gap-4">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Isso pode levar até 60 segundos</p>
          <button 
            onClick={() => {
              setLoading(false);
              setStep('questions');
            }}
            className="text-slate-400 font-black text-xs uppercase tracking-widest hover:text-rose-600 transition-colors border-b-2 border-transparent hover:border-rose-600 pb-1"
          >
            Cancelar Processamento
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-20 animate-in fade-in duration-500">
      <input type="file" accept="image/*" capture="environment" className="hidden" ref={fileInputRef} onChange={handleFileChange} />
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-6">
          <div className="w-16 h-16 bg-slate-900 text-white rounded-[1.25rem] flex-shrink-0 flex items-center justify-center font-black text-3xl border-4 border-[#F05A22] shadow-xl">{currentBlockKey}</div>
          <div className="min-w-0">
             <h2 className="text-xl md:text-2xl font-black text-slate-900 uppercase tracking-tighter leading-tight break-words">{BLOCKS[currentBlockKey as keyof typeof BLOCKS]}</h2>
             <div className="flex gap-2 mt-2">
               {blockKeys.map((_, i) => (
                 <div key={i} className={`h-1.5 w-6 md:w-8 rounded-full border-2 border-slate-900 ${i <= currentBlockIdx ? 'bg-[#F05A22]' : 'bg-slate-200'}`} />
               ))}
             </div>
          </div>
        </div>
        <div className="bg-slate-900 px-6 py-3 rounded-2xl border-4 border-[#F05A22] shadow-lg self-start md:self-center">
          <p className="text-[10px] font-black text-[#F05A22] uppercase tracking-[0.2em] mb-1">Unidade em Auditoria</p>
          <p className="text-white font-black uppercase tracking-tight truncate max-w-[200px] md:max-w-xs text-sm">
            {obras.find(o => o.id === selectedObra)?.nome || 'Não Selecionada'}
          </p>
        </div>
      </div>

      {error && (
        <div className="bg-rose-50 border-4 border-rose-500 p-6 rounded-2xl flex flex-col md:flex-row items-center gap-4 animate-in slide-in-from-top duration-300">
          <div className="flex items-center gap-4 flex-1">
            <AlertOctagon className="text-rose-500 shrink-0" size={32} />
            <div className="flex-1">
              <p className="text-rose-900 font-black uppercase text-sm">Erro no Processamento</p>
              <p className="text-rose-700 text-xs font-bold">{error}</p>
            </div>
          </div>
          <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
            {error === "O motor de análise atingiu o limite temporário de processamento. Por favor, aguarde cerca de 30 a 60 segundos e tente enviar novamente." && (
               <button 
                onClick={() => handleSubmit()} 
                className="flex-1 md:flex-none bg-[#F05A22] text-white px-6 py-2 rounded-xl font-black text-[10px] uppercase border-2 border-slate-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-slate-900 transition-all"
              >
                Tentar Novamente Agora
              </button>
            )}
            <button 
              onClick={() => {
                setError(null);
                setStep('questions');
              }} 
              className="flex-1 md:flex-none bg-slate-100 text-slate-700 px-6 py-2 rounded-xl font-black text-[10px] uppercase border-2 border-slate-200 hover:border-slate-900 transition-all"
            >
              Voltar e Revisar Dados
            </button>
            <button 
              onClick={() => {
                const confirmClear = window.confirm("Isso apagará o progresso atual. Tem certeza?");
                if (confirmClear) {
                  clearDraft();
                  setError(null);
                  setStep('setup');
                }
              }} 
              className="flex-1 md:flex-none text-rose-400 hover:text-rose-600 font-black text-[10px] uppercase"
            >
              Reiniciar Tudo
            </button>
          </div>
        </div>
      )}

      <div className="space-y-6">
        {currentBlockKey === 'B' ? (
          <div className="bg-white p-6 md:p-10 rounded-[2rem] md:rounded-[3rem] border-4 border-slate-900 shadow-[12px_12px_0px_0px_rgba(15,23,42,1)] space-y-8 md:space-y-12">
            <div className="flex items-center gap-4 mb-2">
               <div className="p-3 bg-slate-100 rounded-2xl border-2 border-slate-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                 <Users className="text-[#F05A22]" size={28} />
               </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              <div className="space-y-4">
                <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest block">Efetivo Real em Campo</label>
                <div className="relative group">
                  <input 
                    type="number" 
                    className="w-full bg-white border-4 border-slate-900 rounded-[1.5rem] px-8 py-6 font-black text-3xl md:text-5xl text-slate-900 placeholder-slate-200 focus:outline-none transition-all focus:shadow-[6px_6px_0px_0px_rgba(240,90,34,1)]" 
                    value={equipeCampo} 
                    onChange={e => setEquipeCampo(e.target.value)} 
                  />
                </div>
              </div>
              <div className="space-y-4">
                <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest block">Efetivo no GD4</label>
                <div className="relative group">
                  <input 
                    type="number" 
                    className="w-full bg-white border-4 border-slate-900 rounded-[1.5rem] px-8 py-6 font-black text-3xl md:text-5xl text-slate-900 placeholder-slate-200 focus:outline-none transition-all focus:shadow-[6px_6px_0px_0px_rgba(240,90,34,1)]" 
                    value={equipeGd4} 
                    onChange={e => setEquipeGd4(e.target.value)} 
                  />
                </div>
              </div>
            </div>

            <div className="space-y-10 pt-4">
              {currentBlockQuestions.map((q) => {
                 const resp = respostas.find(r => r.pergunta_id === q.id);
                 return (
                   <div key={q.id} className="space-y-6 pt-10 border-t-2 border-slate-100">
                     <p className="text-slate-900 font-black text-xl uppercase leading-tight tracking-tight max-w-3xl">{q.texto}</p>
                     <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                       {(['sim', 'parcial', 'nao', 'n_a'] as ResponseValue[]).map((val) => (
                         <button 
                           key={val} 
                           onClick={() => handleResponseChange(q.id, val)} 
                           className={`py-5 rounded-2xl font-black text-[11px] border-4 transition-all uppercase tracking-widest ${getButtonStyles(val, resp?.resposta === val, q.inverted)}`}
                         >
                           {val === 'n_a' ? 'N A' : val.toUpperCase()}
                         </button>
                       ))}
                     </div>

                     {resp && (
                        (q.inverted ? resp.resposta === 'sim' : (resp.resposta !== 'sim' && resp.resposta !== 'n_a'))
                      ) && (
                        <textarea 
                          className="w-full border-4 border-slate-900 rounded-2xl p-5 font-black text-slate-900 bg-rose-50 placeholder-rose-300 focus:outline-none" 
                          placeholder="JUSTIFIQUE O DESVIO IDENTIFICADO (OBRIGATÓRIO)..." 
                          value={resp.observacao || ''} 
                          onChange={e => handleObsChange(q.id, e.target.value)} 
                        />
                      )}
                   </div>
                 );
              })}
            </div>
          </div>
        ) : currentBlockKey === 'G' ? (
          <div className="space-y-6">
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
               <span className="font-black uppercase text-xs tracking-widest">Coleta de Vestígios em Campo ({entrevistas.length})</span>
               <button onClick={addEntrevistado} className="bg-[#F05A22] px-6 py-3 rounded-2xl font-black text-xs uppercase flex items-center gap-2 border-2 border-slate-900 hover:bg-slate-900 transition-colors"><Plus size={18} /> Add Colaborador</button>
            </div>

            {entrevistas.map((ent, idx) => (
              <div key={ent.id} className="bg-white p-8 rounded-[2.5rem] border-4 border-slate-900 space-y-6 shadow-[8px_8px_0px_0px_rgba(15,23,42,1)]">
                 <div className="flex flex-col md:flex-row gap-4">
                    <input placeholder="FUNÇÃO" className="flex-1 bg-slate-50 border-4 border-slate-900 rounded-xl px-4 py-3 font-black text-slate-900 uppercase placeholder-slate-300 focus:outline-none" value={ent.funcao} onChange={e => setEntrevistas(ev => ev.map(it => it.id === ent.id ? {...it, funcao: e.target.value} : it))} />
                    <input placeholder="EMPRESA" className="flex-1 bg-slate-50 border-4 border-slate-900 rounded-xl px-4 py-3 font-black text-slate-900 uppercase placeholder-slate-300 focus:outline-none" value={ent.empresa} onChange={e => setEntrevistas(ev => ev.map(it => it.id === ent.id ? {...it, empresa: e.target.value} : it))} />
                    <button onClick={() => removeEntrevistado(ent.id)} className="text-rose-600 p-2 hover:bg-rose-50 rounded-xl transition-all self-end md:self-center"><Trash2 size={24} /></button>
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
        ) : currentBlockKey === 'H' ? (
           <div className="space-y-8">
             <div className="bg-[#0F172A] text-white p-6 md:p-10 rounded-[2rem] md:rounded-[3rem] border-4 border-slate-900 shadow-[12px_12px_0px_0px_rgba(240,90,34,1)]">
                <div className="flex items-center gap-6 mb-10 border-b border-slate-800 pb-8">
                   <div className="p-5 bg-[#F05A22] rounded-[1.5rem] border-2 border-slate-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                     <FileSearch size={36} className="text-white" />
                   </div>
                   <div>
                      <h3 className="text-3xl font-black uppercase tracking-tighter leading-none mb-1">Diagnóstico Final de Quarteirização</h3>
                      <p className="text-[11px] font-black uppercase text-[#F05A22] tracking-[0.3em]">Cotejo: Amostragem vs Governança GD4</p>
                   </div>
                </div>
                
                <div className="space-y-12">
                  <p className="text-sm font-bold uppercase text-slate-400 leading-relaxed italic border-l-4 border-[#F05A22] pl-6">
                    "Baseado nos vestígios colhidos na amostragem (uniformes, empresas citadas e benefícios), informe se toda a cadeia de subcontratação está formalizada."
                  </p>
                  
                  <div className="space-y-6">
                    <p className="text-xs font-black uppercase text-white tracking-widest">Veredito do Auditor:</p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <button 
                        onClick={() => setSubcontratacaoRegular(true)} 
                        className={`py-8 rounded-[1.5rem] font-black text-lg border-4 transition-all tracking-tighter ${subcontratacaoRegular === true ? 'bg-[#F05A22] text-white border-slate-900 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]' : 'bg-slate-800/50 text-slate-500 border-slate-800 hover:border-slate-600'}`}
                      >
                        TUDO REGULARIZADO
                      </button>
                      <button 
                        onClick={() => setSubcontratacaoRegular(false)} 
                        className={`py-8 rounded-[1.5rem] font-black text-lg border-4 transition-all tracking-tighter ${subcontratacaoRegular === false ? 'bg-rose-600 text-white border-slate-900 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]' : 'bg-slate-800/50 text-slate-500 border-slate-800 hover:border-slate-600'}`}
                      >
                        QUARTEIRIZAÇÃO IRREGULAR
                      </button>
                      <button 
                        onClick={() => {
                          setSubcontratacaoRegular('n_a');
                          handleResponseChange('h1', 'n_a');
                        }} 
                        className={`py-8 rounded-[1.5rem] font-black text-lg border-4 transition-all tracking-tighter ${subcontratacaoRegular === 'n_a' ? 'bg-slate-500 text-white border-slate-900 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]' : 'bg-slate-800/50 text-slate-500 border-slate-800 hover:border-slate-600'}`}
                      >
                        NÃO SE APLICA
                      </button>
                    </div>
                  </div>

                  {currentBlockQuestions.map((q) => {
                    const resp = respostas.find(r => r.pergunta_id === q.id);
                    return (
                      <div key={q.id} className="space-y-8 bg-slate-800/30 p-10 rounded-[2.5rem] border-2 border-slate-800">
                        <p className="text-white font-black text-xl uppercase leading-tight tracking-tight">{q.texto}</p>
                        <div className="grid grid-cols-3 gap-4">
                          {(['sim', 'nao', 'n_a'] as ResponseValue[]).map((val) => (
                            <button 
                              key={val} 
                              onClick={() => handleResponseChange(q.id, val)} 
                              className={`py-6 rounded-2xl font-black text-xs border-4 transition-all tracking-widest ${getButtonStyles(val, resp?.resposta === val, q.inverted)}`}
                            >
                              {val === 'n_a' ? 'N A' : val.toUpperCase()}
                            </button>
                          ))}
                        </div>
                        
                        <div className="p-8 border-4 rounded-[2rem] space-y-6 bg-[#0F172A] border-slate-800">
                          <div className="flex justify-between items-center">
                             <span className="flex items-center gap-3 text-[11px] font-black uppercase text-slate-400 tracking-widest">
                               <Camera size={18} className="text-[#F05A22]" /> Foto do Vestígio (Obrigatório)
                             </span>
                             <span className={`px-4 py-1.5 rounded-full border-2 border-slate-900 bg-[#F05A22] text-white font-black text-xs`}>
                               {resp?.fotos?.length || 0} / 1
                             </span>
                          </div>
                          
                          <div className="flex gap-4 overflow-x-auto pb-2">
                             {resp?.fotos?.map((f, i) => (
                               <div key={i} className="relative shrink-0">
                                 <img src={f} className="w-28 h-28 rounded-2xl border-4 border-slate-900 object-cover" />
                                 <button 
                                   onClick={() => setRespostas(prev => prev.map(r => r.pergunta_id === q.id ? {...r, fotos: r.fotos?.filter((_, idx) => idx !== i)} : r))} 
                                   className="absolute -top-3 -right-3 bg-rose-600 text-white p-2 rounded-full border-2 border-slate-900 shadow-xl hover:scale-110 transition-transform"
                                 >
                                   <Trash2 size={14} />
                                 </button>
                               </div>
                             ))}
                             <button 
                               onClick={() => triggerCamera(q.id)} 
                               className="w-28 h-28 bg-slate-800/50 border-4 border-dashed border-slate-700 rounded-2xl flex items-center justify-center text-slate-600 hover:text-[#F05A22] hover:border-[#F05A22] transition-all group"
                             >
                               <Camera size={40} className="group-hover:scale-110 transition-transform" />
                             </button>
                          </div>
                        </div>

                        {(resp?.resposta === 'nao') && (
                          <textarea 
                            className="w-full border-4 border-slate-900 rounded-[1.5rem] p-6 font-black text-slate-900 bg-rose-50 placeholder-rose-300 focus:outline-none focus:ring-4 ring-rose-200 transition-all" 
                            placeholder="DESCREVA O VESTÍGIO ENCONTRADO (Ex: Uniforme da Empresa X mas colaborador diz trabalhar para Y)..." 
                            value={resp.observacao || ''} 
                            onChange={e => handleObsChange(q.id, e.target.value)} 
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
             </div>
           </div>
        ) : (
          currentBlockQuestions.map((q) => {
            const resp = respostas.find(r => r.pergunta_id === q.id);
            const needsObs = resp && resp.resposta !== 'sim' && resp.resposta !== 'n_a';
            const numPhotos = resp?.fotos?.length || 0;
            const minReq = q.minPhotos || 3;
            const photoStatus = q.requiresPhotos ? (numPhotos >= minReq ? 'complete' : 'pending') : 'none';

            return (
              <div key={q.id} className="bg-white p-6 md:p-8 rounded-[1.5rem] md:rounded-[2rem] border-4 border-slate-900 shadow-[8px_8px_0px_0px_rgba(15,23,42,1)] space-y-6">
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

      <footer className="flex justify-between items-center py-10">
        <div className="flex gap-6 items-center">
          <button onClick={() => currentBlockIdx === 0 ? setStep('setup') : setCurrentBlockIdx(prev => prev - 1)} className="font-black uppercase text-xs hover:text-[#F05A22] flex items-center gap-2"><ChevronLeft size={18} /> Anterior</button>
          
          {!showRestartConfirm ? (
            <button 
              onClick={() => setShowRestartConfirm(true)}
              className="text-rose-400 hover:text-rose-600 font-black uppercase text-[10px] tracking-widest"
            >
              Reiniciar
            </button>
          ) : (
            <div className="flex gap-2 items-center bg-rose-50 px-3 py-1 rounded-lg border border-rose-100">
              <span className="text-[8px] font-black text-rose-400 uppercase">Limpar?</span>
              <button onClick={() => { clearDraft(); setStep('setup'); setShowRestartConfirm(false); }} className="text-rose-600 font-black text-[9px] uppercase">Sim</button>
              <button onClick={() => setShowRestartConfirm(false)} className="text-slate-400 font-black text-[9px] uppercase">Não</button>
            </div>
          )}
        </div>
        <button disabled={!isBlockComplete()} onClick={() => currentBlockIdx === blockKeys.length - 1 ? handleSubmit() : setCurrentBlockIdx(prev => prev + 1)} className="bg-[#F05A22] text-white px-12 py-5 rounded-2xl font-black text-sm border-4 border-slate-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] disabled:opacity-50 hover:bg-slate-900 transition-all active:translate-y-1 active:shadow-none">{currentBlockIdx === blockKeys.length - 1 ? 'FINALIZAR E ANALISAR' : 'PRÓXIMO BLOCO'} <ChevronRight className="inline" size={18} /></button>
      </footer>
    </div>
  );
};

export default AuditWizard;
