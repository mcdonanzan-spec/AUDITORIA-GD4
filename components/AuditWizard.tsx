
import React from 'react';
import { 
  Building2, 
  Calendar, 
  User as UserIcon, 
  CheckCircle2, 
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Camera,
  Loader2,
  AlertTriangle,
  Users,
  Database,
  ShieldCheck
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
  
  // Setup State
  const [selectedObra, setSelectedObra] = React.useState<string>('');
  const [auditType, setAuditType] = React.useState<'mensal' | 'extraordinaria'>('mensal');
  
  // Custom Block B State
  const [equipeCampo, setEquipeCampo] = React.useState<string>('');
  const [equipeGd4, setEquipeGd4] = React.useState<string>('');
  const [subcontratacaoRegular, setSubcontratacaoRegular] = React.useState<boolean | null>(null);

  // Responses State
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
        observacoes_gerais: "Auditoria focada em Identificação de Terceiros e Governança de Subcontratação."
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
        <header>
          <h2 className="text-2xl font-black text-slate-900 text-center uppercase tracking-tight">Nova Auditoria GD4</h2>
          <p className="text-slate-700 text-center text-sm font-black">Mitigação de risco e controle de terceiros.</p>
        </header>

        <div className="bg-white p-8 rounded-3xl shadow-sm border-2 border-slate-400 space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-black text-slate-800 uppercase tracking-widest block">Selecione a Unidade</label>
            <div className="relative">
              <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
              <select 
                className="w-full bg-slate-50 border-2 border-slate-300 rounded-2xl pl-12 pr-4 py-4 appearance-none focus:ring-2 focus:ring-emerald-500 focus:outline-none transition-all font-black text-slate-900"
                value={selectedObra}
                onChange={(e) => setSelectedObra(e.target.value)}
              >
                <option value="">Escolha uma obra...</option>
                {obras.map(o => <option key={o.id} value={o.id}>{o.nome}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-800 uppercase tracking-widest block">Tipo</label>
              <select 
                className="w-full bg-slate-50 border-2 border-slate-300 rounded-2xl px-4 py-4 focus:ring-2 focus:ring-emerald-500 focus:outline-none transition-all font-black text-slate-900"
                value={auditType}
                onChange={(e) => setAuditType(e.target.value as any)}
              >
                <option value="mensal">Mensal</option>
                <option value="extraordinaria">Extraordinária</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-800 uppercase tracking-widest block">Auditor</label>
              <div className="bg-slate-50 border-2 border-slate-300 rounded-2xl px-4 py-4 text-slate-900 flex items-center gap-2 font-black">
                <UserIcon size={18} className="text-slate-600" />
                {currentUser.nome}
              </div>
            </div>
          </div>

          <button
            disabled={!selectedObra}
            onClick={() => setStep('questions')}
            className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black hover:bg-slate-800 disabled:opacity-50 transition-all flex items-center justify-center gap-2 shadow-xl border-2 border-slate-700"
          >
            INICIAR VERIFICAÇÃO TÉCNICA
            <ChevronRight size={20} />
          </button>
        </div>
      </div>
    );
  }

  if (step === 'processing') {
    return (
      <div className="min-h-[400px] flex flex-col items-center justify-center text-center space-y-6">
        <div className="relative">
          <div className="w-24 h-24 border-8 border-slate-300 border-t-emerald-600 rounded-full animate-spin"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <ShieldCheck className="text-emerald-600" size={40} />
          </div>
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-black text-slate-900 uppercase">Processando Scoring GD4</h2>
          <p className="text-slate-700 font-black max-w-sm mx-auto uppercase text-xs tracking-widest">Calculando Riscos Jurídicos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in slide-in-from-right duration-500">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-slate-900 text-white rounded-2xl flex items-center justify-center font-black text-2xl shadow-lg border-2 border-slate-700">
            {currentBlockKey}
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">{BLOCKS[currentBlockKey]}</h2>
            <div className="flex gap-1.5 mt-2">
              {blockKeys.map((_, idx) => (
                <div 
                  key={idx} 
                  className={`h-2.5 w-12 rounded-full transition-all ${idx <= currentBlockIdx ? 'bg-emerald-600 shadow-[0_0_10px_rgba(5,150,105,0.4)]' : 'bg-slate-300'}`}
                />
              ))}
            </div>
          </div>
        </div>
        <div className="text-right">
          <span className="text-[11px] font-black text-slate-700 uppercase tracking-widest bg-slate-200 px-2 py-1 rounded">Etapa {currentBlockIdx + 1} de {blockKeys.length}</span>
          <p className="text-base font-black text-slate-900 mt-2">{obras.find(o => o.id === selectedObra)?.nome}</p>
        </div>
      </div>

      <div className="space-y-4">
        {currentBlockKey === 'B' ? (
          <div className="space-y-6">
            <div className="bg-white p-8 rounded-3xl border-2 border-slate-400 shadow-sm space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                    <Users size={16} /> Efetivo em Campo (Real)
                  </label>
                  <input 
                    type="number" 
                    className="w-full bg-slate-50 border-2 border-slate-300 rounded-2xl px-5 py-4 focus:ring-2 focus:ring-emerald-500 focus:outline-none font-black text-3xl text-slate-900"
                    placeholder="0"
                    value={equipeCampo}
                    onChange={e => setEquipeCampo(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                    <Database size={16} /> Efetivo no GD4 (Sistema)
                  </label>
                  <input 
                    type="number" 
                    className="w-full bg-slate-50 border-2 border-slate-300 rounded-2xl px-5 py-4 focus:ring-2 focus:ring-emerald-500 focus:outline-none font-black text-3xl text-slate-900"
                    placeholder="0"
                    value={equipeGd4}
                    onChange={e => setEquipeGd4(e.target.value)}
                  />
                </div>
              </div>

              {equipeCampo && equipeGd4 && (
                <div className={`p-6 rounded-2xl border-4 flex items-center justify-between ${Number(equipeCampo) !== Number(equipeGd4) ? 'bg-rose-50 border-rose-600 text-rose-950' : 'bg-emerald-50 border-emerald-600 text-emerald-950'}`}>
                   <div className="flex items-center gap-4">
                     <AlertCircle size={32} />
                     <span className="text-lg font-black uppercase tracking-tight">Divergência Detectada:</span>
                   </div>
                   <span className="text-5xl font-black">{Math.abs(Number(equipeCampo) - Number(equipeGd4))}</span>
                </div>
              )}

              <div className="space-y-4">
                <label className="text-xs font-black text-slate-800 uppercase tracking-widest block">Toda subcontratação em campo está autorizada?</label>
                <div className="flex gap-4">
                  {[true, false].map((val) => (
                    <button
                      key={val ? 'sim' : 'nao'}
                      onClick={() => setSubcontratacaoRegular(val)}
                      className={`
                        flex-1 py-6 rounded-2xl font-black text-sm uppercase transition-all border-4
                        ${subcontratacaoRegular === val 
                          ? (val ? 'bg-emerald-700 text-white border-emerald-900 shadow-xl' : 'bg-rose-700 text-white border-rose-900 shadow-xl')
                          : 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200'}
                      `}
                    >
                      {val ? 'SIM (CONFORME)' : 'NÃO (IRREGULAR)'}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : (
          currentBlockQuestions.map((q) => {
            const resp = respostas.find(r => r.pergunta_id === q.id);
            const needsObs = resp && resp.resposta !== 'sim';
            
            return (
              <div key={q.id} className="bg-white p-7 rounded-3xl border-2 border-slate-400 shadow-sm space-y-5 transition-all hover:border-slate-600">
                <div className="flex items-start justify-between gap-4">
                  <p className="text-slate-900 font-black leading-tight text-xl">{q.texto}</p>
                </div>
                
                <div className="flex flex-wrap gap-4">
                  {(['sim', 'parcial', 'nao'] as ResponseValue[]).map((val) => (
                    <button
                      key={val}
                      onClick={() => handleResponseChange(q.id, val)}
                      className={`
                        px-12 py-5 rounded-xl font-black text-xs uppercase tracking-widest transition-all border-4
                        ${resp?.resposta === val 
                          ? (val === 'sim' ? 'bg-emerald-700 text-white border-emerald-900 shadow-md' : val === 'parcial' ? 'bg-amber-600 text-white border-amber-800 shadow-md' : 'bg-rose-700 text-white border-rose-800 shadow-md')
                          : 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200'}
                      `}
                    >
                      {val}
                    </button>
                  ))}
                </div>

                {needsObs && (
                  <div className="animate-in slide-in-from-top-3 duration-300">
                    <label className="text-xs font-black text-rose-900 uppercase tracking-widest mb-2 block">
                      Descrição da Não Conformidade (Obrigatório)
                    </label>
                    <textarea
                      value={resp.observacao || ''}
                      onChange={(e) => handleObsChange(q.id, e.target.value)}
                      placeholder="Relate aqui o desvio de empresa ou falta de uniforme..."
                      className="w-full bg-rose-50 border-2 border-rose-400 rounded-2xl p-5 text-lg font-black text-slate-900 focus:ring-2 focus:ring-rose-600 focus:outline-none min-h-[140px]"
                    />
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {currentBlockIdx === blockKeys.length - 1 && (
        <div className="bg-amber-50 border-4 border-amber-500 p-8 rounded-3xl space-y-4 shadow-md">
          <div className="flex items-center gap-4 text-amber-950">
            <AlertTriangle size={36} className="text-amber-600" />
            <h3 className="font-black text-2xl uppercase tracking-tighter">Eventos de Risco Solidário Crítico</h3>
          </div>
          <p className="text-base text-amber-950 font-black">Identificou algum colaborador operando totalmente à revelia do GD4 (sem integração/biometria)?</p>
          <textarea
            value={ocorrencias}
            onChange={(e) => setOcorrencias(e.target.value)}
            className="w-full bg-white border-4 border-amber-500 rounded-2xl p-5 text-lg font-black text-slate-900 focus:ring-4 focus:ring-amber-600 focus:outline-none min-h-[180px]"
            placeholder="Ex: Identificado colaborador de empresa X prestando serviço para empresa Y sem registro..."
          />
        </div>
      )}

      <footer className="flex justify-between items-center py-12">
        <button
          onClick={() => {
            if (currentBlockIdx === 0) setStep('setup');
            else setCurrentBlockIdx(prev => prev - 1);
          }}
          className="flex items-center gap-2 font-black text-slate-800 hover:text-black transition-colors uppercase text-xs tracking-widest"
        >
          <ChevronLeft size={24} />
          Bloco Anterior
        </button>

        {currentBlockIdx === blockKeys.length - 1 ? (
          <button
            disabled={!isBlockComplete()}
            onClick={handleSubmit}
            className="bg-emerald-800 text-white px-16 py-7 rounded-2xl font-black hover:bg-emerald-950 disabled:opacity-50 transition-all shadow-2xl uppercase tracking-widest text-base border-4 border-emerald-950"
          >
            PROCESSAR RESULTADO FINAL
          </button>
        ) : (
          <button
            disabled={!isBlockComplete()}
            onClick={() => setCurrentBlockIdx(prev => prev + 1)}
            className="bg-slate-900 text-white px-16 py-7 rounded-2xl font-black hover:bg-black disabled:opacity-50 transition-all flex items-center gap-2 shadow-2xl border-4 border-slate-800"
          >
            PRÓXIMO BLOCO
            <ChevronRight size={28} />
          </button>
        )}
      </footer>
    </div>
  );
};

export default AuditWizard;
