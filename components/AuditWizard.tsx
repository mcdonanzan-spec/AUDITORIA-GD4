
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
  const [subcontratacao, setSubcontratacao] = React.useState<boolean | null>(null);

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
      return equipeCampo !== '' && equipeGd4 !== '' && subcontratacao !== null;
    }
    return currentBlockQuestions.every(q => respostas.find(r => r.pergunta_id === q.id));
  };

  const handleSubmit = async () => {
    setStep('processing');
    setLoading(true);

    try {
      // Cálculo de scores
      const blockScores = blockKeys.reduce((acc, b) => {
        const qIds = QUESTIONS.filter(q => q.bloco === b).map(q => q.id);
        const bResps = respostas.filter(r => qIds.includes(r.pergunta_id));
        
        let totalScore = 0;
        if (b === 'B') {
           const divergencia = Math.abs(Number(equipeCampo) - Number(equipeGd4));
           const scoreEquipe = divergencia === 0 ? 100 : divergencia < 5 ? 50 : 0;
           const scoreSub = subcontratacao === false ? 100 : 0;
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
          subcontratacao_irregular: subcontratacao
        },
        ocorrencias_graves: ocorrencias.split('\n').filter(s => s.trim()),
        observacoes_gerais: "Auditoria de Compliance e Governança Digital de Terceiros."
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
        subcontratacao_identificada: subcontratacao || false,
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
          <h2 className="text-2xl font-bold text-slate-900 text-center">Configuração da Auditoria GD4</h2>
          <p className="text-slate-600 text-center text-sm font-medium">Mitigação de risco jurídico e controle de terceiros.</p>
        </header>

        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-300 space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block">Selecione a Unidade</label>
            <div className="relative">
              <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
              <select 
                className="w-full bg-slate-50 border border-slate-300 rounded-2xl pl-12 pr-4 py-4 appearance-none focus:ring-2 focus:ring-emerald-500 focus:outline-none transition-all font-bold text-slate-900"
                value={selectedObra}
                onChange={(e) => setSelectedObra(e.target.value)}
              >
                <option value="">Escolha uma obra ativa...</option>
                {obras.map(o => <option key={o.id} value={o.id}>{o.nome}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block">Tipo</label>
              <select 
                className="w-full bg-slate-50 border border-slate-300 rounded-2xl px-4 py-4 focus:ring-2 focus:ring-emerald-500 focus:outline-none transition-all font-bold text-slate-900"
                value={auditType}
                onChange={(e) => setAuditType(e.target.value as any)}
              >
                <option value="mensal">Mensal Regular</option>
                <option value="extraordinaria">Extraordinária</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block">Auditor</label>
              <div className="bg-slate-50 border border-slate-300 rounded-2xl px-4 py-4 text-slate-900 flex items-center gap-2 font-bold">
                <UserIcon size={18} className="text-slate-500" />
                {currentUser.nome}
              </div>
            </div>
          </div>

          <button
            disabled={!selectedObra}
            onClick={() => setStep('questions')}
            className="w-full bg-slate-900 text-white py-5 rounded-2xl font-bold hover:bg-slate-800 disabled:opacity-50 transition-all flex items-center justify-center gap-2 shadow-xl"
          >
            Iniciar Auditoria de Governança
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
          <div className="w-24 h-24 border-8 border-slate-200 border-t-emerald-600 rounded-full animate-spin"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <ShieldCheck className="text-emerald-600" size={32} />
          </div>
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-slate-900">Cruzamento de Dados GD4</h2>
          <p className="text-slate-600 font-bold max-w-sm mx-auto uppercase text-xs tracking-widest">Calculando Scoring de Risco Jurídico...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in slide-in-from-right duration-500">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-slate-900 text-white rounded-2xl flex items-center justify-center font-bold text-xl shadow-lg">
            {currentBlockKey}
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">{BLOCKS[currentBlockKey]}</h2>
            <div className="flex gap-1 mt-1">
              {blockKeys.map((_, idx) => (
                <div 
                  key={idx} 
                  className={`h-1.5 w-8 rounded-full transition-all ${idx <= currentBlockIdx ? 'bg-emerald-500' : 'bg-slate-300'}`}
                />
              ))}
            </div>
          </div>
        </div>
        <div className="text-right">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Etapa {currentBlockIdx + 1} de {blockKeys.length}</span>
          <p className="text-sm font-black text-slate-900">{obras.find(o => o.id === selectedObra)?.nome}</p>
        </div>
      </div>

      <div className="space-y-4">
        {currentBlockKey === 'B' ? (
          <div className="space-y-6">
            <div className="bg-white p-8 rounded-3xl border border-slate-300 shadow-sm space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-widest flex items-center gap-2">
                    <Users size={14} /> Efetivo em Campo (Contagem Real)
                  </label>
                  <input 
                    type="number" 
                    className="w-full bg-slate-50 border border-slate-300 rounded-2xl px-5 py-4 focus:ring-2 focus:ring-emerald-500 focus:outline-none font-bold text-2xl text-slate-900"
                    placeholder="0"
                    value={equipeCampo}
                    onChange={e => setEquipeCampo(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-widest flex items-center gap-2">
                    <Database size={14} /> Efetivo no GD4 (Sistema)
                  </label>
                  <input 
                    type="number" 
                    className="w-full bg-slate-50 border border-slate-300 rounded-2xl px-5 py-4 focus:ring-2 focus:ring-emerald-500 focus:outline-none font-bold text-2xl text-slate-900"
                    placeholder="0"
                    value={equipeGd4}
                    onChange={e => setEquipeGd4(e.target.value)}
                  />
                </div>
              </div>

              {equipeCampo && equipeGd4 && (
                <div className={`p-4 rounded-2xl border flex items-center justify-between ${Number(equipeCampo) !== Number(equipeGd4) ? 'bg-rose-50 border-rose-300 text-rose-900' : 'bg-emerald-50 border-emerald-300 text-emerald-900'}`}>
                   <div className="flex items-center gap-3">
                     <AlertCircle size={20} />
                     <span className="text-sm font-black uppercase">Divergência de Equipe:</span>
                   </div>
                   <span className="text-3xl font-black">{Math.abs(Number(equipeCampo) - Number(equipeGd4))}</span>
                </div>
              )}

              <div className="space-y-4">
                <label className="text-xs font-bold text-slate-600 uppercase tracking-widest block">Evidência de Quarteirização Irregular?</label>
                <div className="flex gap-4">
                  {[true, false].map((val) => (
                    <button
                      key={val ? 'sim' : 'nao'}
                      onClick={() => setSubcontratacao(val)}
                      className={`
                        flex-1 py-4 rounded-2xl font-bold text-sm uppercase transition-all border-2
                        ${subcontratacao === val 
                          ? (val ? 'bg-rose-700 text-white border-rose-800 shadow-lg' : 'bg-emerald-700 text-white border-emerald-800 shadow-lg')
                          : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}
                      `}
                    >
                      {val ? 'Sim (Alerta Crítico)' : 'Não'}
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
              <div key={q.id} className="bg-white p-6 rounded-3xl border border-slate-300 shadow-sm space-y-4 transition-all hover:border-emerald-500 border-2">
                <div className="flex items-start justify-between gap-4">
                  <p className="text-slate-900 font-black leading-relaxed text-base">{q.texto}</p>
                </div>
                
                <div className="flex flex-wrap gap-2">
                  {(['sim', 'parcial', 'nao'] as ResponseValue[]).map((val) => (
                    <button
                      key={val}
                      onClick={() => handleResponseChange(q.id, val)}
                      className={`
                        px-8 py-3 rounded-xl font-black text-xs uppercase tracking-wider transition-all border-2
                        ${resp?.resposta === val 
                          ? (val === 'sim' ? 'bg-emerald-700 text-white border-emerald-800' : val === 'parcial' ? 'bg-amber-600 text-white border-amber-700' : 'bg-rose-700 text-white border-rose-800')
                          : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'}
                      `}
                    >
                      {val}
                    </button>
                  ))}
                </div>

                {needsObs && (
                  <div className="animate-in slide-in-from-top-2 duration-300">
                    <label className="text-[10px] font-black text-rose-700 uppercase tracking-widest mb-2 block">
                      Observação Obrigatória (Descrição da Não Conformidade)
                    </label>
                    <textarea
                      value={resp.observacao || ''}
                      onChange={(e) => handleObsChange(q.id, e.target.value)}
                      placeholder="Descreva o desvio de compliance ou pendência GD4..."
                      className="w-full bg-rose-50 border-2 border-rose-200 rounded-2xl p-4 text-sm font-bold text-slate-900 focus:ring-2 focus:ring-rose-500 focus:outline-none min-h-[120px]"
                    />
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {currentBlockIdx === blockKeys.length - 1 && (
        <div className="bg-amber-50 border-2 border-amber-300 p-8 rounded-3xl space-y-4 shadow-sm">
          <div className="flex items-center gap-2 text-amber-900">
            <AlertTriangle size={24} />
            <h3 className="font-black text-lg uppercase tracking-tight">Ocorrências Graves / Risco Imediato</h3>
          </div>
          <p className="text-sm text-amber-800 font-bold">Relate situações de risco jurídico crítico que requerem ação imediata da Diretoria.</p>
          <textarea
            value={ocorrencias}
            onChange={(e) => setOcorrencias(e.target.value)}
            className="w-full bg-white border-2 border-amber-300 rounded-2xl p-4 text-sm font-bold text-slate-900 focus:ring-2 focus:ring-amber-500 focus:outline-none min-h-[150px]"
            placeholder="Ex: Identificado colaborador sem registro ou empresa bloqueada no sistema..."
          />
        </div>
      )}

      <footer className="flex justify-between items-center py-8">
        <button
          onClick={() => {
            if (currentBlockIdx === 0) setStep('setup');
            else setCurrentBlockIdx(prev => prev - 1);
          }}
          className="flex items-center gap-2 font-black text-slate-600 hover:text-slate-900 transition-colors uppercase text-xs tracking-widest"
        >
          <ChevronLeft size={20} />
          Voltar
        </button>

        {currentBlockIdx === blockKeys.length - 1 ? (
          <button
            disabled={!isBlockComplete()}
            onClick={handleSubmit}
            className="bg-emerald-700 text-white px-12 py-5 rounded-2xl font-black hover:bg-emerald-800 disabled:opacity-50 transition-all shadow-xl shadow-emerald-900/20 uppercase tracking-widest text-xs border-2 border-emerald-900"
          >
            Gerar Scoring e Report IA
          </button>
        ) : (
          <button
            disabled={!isBlockComplete()}
            onClick={() => setCurrentBlockIdx(prev => prev + 1)}
            className="bg-slate-900 text-white px-12 py-5 rounded-2xl font-black hover:bg-slate-800 disabled:opacity-50 transition-all flex items-center gap-2 shadow-xl border-2 border-slate-700"
          >
            Próximo Bloco
            <ChevronRight size={20} />
          </button>
        )}
      </footer>
    </div>
  );
};

export default AuditWizard;
