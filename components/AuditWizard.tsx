
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
           // Lógica especial para o Bloco B conforme solicitado
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
        observacoes_gerais: "Auditoria gerada via plataforma AuditRisk."
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
          <h2 className="text-2xl font-bold text-slate-800 text-center">Configuração da Auditoria</h2>
          <p className="text-slate-500 text-center text-sm">Inicie o fluxo técnico de verificação estruturada.</p>
        </header>

        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200 space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block">Selecione a Unidade</label>
            <div className="relative">
              <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
              <select 
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-12 pr-4 py-4 appearance-none focus:ring-2 focus:ring-emerald-500 focus:outline-none transition-all font-medium text-slate-700"
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
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block">Tipo</label>
              <select 
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-4 focus:ring-2 focus:ring-emerald-500 focus:outline-none transition-all font-medium text-slate-700"
                value={auditType}
                onChange={(e) => setAuditType(e.target.value as any)}
              >
                <option value="mensal">Mensal Regular</option>
                <option value="extraordinaria">Extraordinária</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block">Auditor</label>
              <div className="bg-slate-50 border border-slate-200 rounded-2xl px-4 py-4 text-slate-600 flex items-center gap-2 font-medium">
                <UserIcon size={18} className="text-slate-400" />
                {currentUser.nome}
              </div>
            </div>
          </div>

          <button
            disabled={!selectedObra}
            onClick={() => setStep('questions')}
            className="w-full bg-slate-900 text-white py-5 rounded-2xl font-bold hover:bg-slate-800 disabled:opacity-50 transition-all flex items-center justify-center gap-2 shadow-xl"
          >
            Iniciar Fluxo Técnico
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
          <div className="w-24 h-24 border-8 border-emerald-100 border-t-emerald-600 rounded-full animate-spin"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            {/* Added missing ShieldCheck import from lucide-react */}
            <ShieldCheck className="text-emerald-600/20" size={32} />
          </div>
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-slate-800">Scoring por Inteligência Artificial</h2>
          <p className="text-slate-500 max-w-sm mx-auto">Analisando divergências de equipe, acessos e evidências de segurança para classificar o risco jurídico.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in slide-in-from-right duration-500">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-600 text-white rounded-2xl flex items-center justify-center font-bold text-xl shadow-lg">
            {currentBlockKey}
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800">{BLOCKS[currentBlockKey]}</h2>
            <div className="flex gap-1 mt-1">
              {blockKeys.map((_, idx) => (
                <div 
                  key={idx} 
                  className={`h-1 w-8 rounded-full transition-all ${idx <= currentBlockIdx ? 'bg-emerald-500' : 'bg-slate-200'}`}
                />
              ))}
            </div>
          </div>
        </div>
        <div className="text-right">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Etapa {currentBlockIdx + 1} de {blockKeys.length}</span>
          <p className="text-xs font-bold text-slate-400">{obras.find(o => o.id === selectedObra)?.nome}</p>
        </div>
      </div>

      <div className="space-y-4">
        {/* Lógica Especial do Bloco B conforme requisitado */}
        {currentBlockKey === 'B' ? (
          <div className="space-y-6">
            <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                    <Users size={14} /> Nº Equipe em Campo
                  </label>
                  <input 
                    type="number" 
                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 focus:ring-2 focus:ring-emerald-500 focus:outline-none font-bold text-lg"
                    placeholder="0"
                    value={equipeCampo}
                    onChange={e => setEquipeCampo(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                    <Database size={14} /> Nº Equipe no GD4
                  </label>
                  <input 
                    type="number" 
                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 focus:ring-2 focus:ring-emerald-500 focus:outline-none font-bold text-lg"
                    placeholder="0"
                    value={equipeGd4}
                    onChange={e => setEquipeGd4(e.target.value)}
                  />
                </div>
              </div>

              {equipeCampo && equipeGd4 && (
                <div className={`p-4 rounded-2xl border flex items-center justify-between ${Number(equipeCampo) !== Number(equipeGd4) ? 'bg-rose-50 border-rose-100 text-rose-700' : 'bg-emerald-50 border-emerald-100 text-emerald-700'}`}>
                   <div className="flex items-center gap-3">
                     <AlertCircle size={20} />
                     <span className="text-sm font-bold uppercase">Divergência de Efetivo:</span>
                   </div>
                   <span className="text-xl font-bold">{Math.abs(Number(equipeCampo) - Number(equipeGd4))}</span>
                </div>
              )}

              <div className="space-y-4">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block">Subcontratação Identificada?</label>
                <div className="flex gap-4">
                  {[true, false].map((val) => (
                    <button
                      key={val ? 'sim' : 'nao'}
                      onClick={() => setSubcontratacao(val)}
                      className={`
                        flex-1 py-4 rounded-2xl font-bold text-sm uppercase transition-all border
                        ${subcontratacao === val 
                          ? (val ? 'bg-rose-600 text-white border-rose-600 shadow-lg shadow-rose-200' : 'bg-emerald-600 text-white border-emerald-600 shadow-lg shadow-emerald-200')
                          : 'bg-white text-slate-400 border-slate-200 hover:bg-slate-50'}
                      `}
                    >
                      {val ? 'Sim (Irregular)' : 'Não'}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Perguntas Regulares Blocos A, C, D, E */
          currentBlockQuestions.map((q) => {
            const resp = respostas.find(r => r.pergunta_id === q.id);
            const needsObs = resp && resp.resposta !== 'sim';
            
            return (
              <div key={q.id} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4 transition-all hover:border-emerald-200">
                <div className="flex items-start justify-between gap-4">
                  <p className="text-slate-800 font-bold leading-relaxed">{q.texto}</p>
                </div>
                
                <div className="flex flex-wrap gap-2">
                  {(['sim', 'parcial', 'nao'] as ResponseValue[]).map((val) => (
                    <button
                      key={val}
                      onClick={() => handleResponseChange(q.id, val)}
                      className={`
                        px-8 py-3 rounded-xl font-bold text-[11px] uppercase tracking-wider transition-all
                        ${resp?.resposta === val 
                          ? (val === 'sim' ? 'bg-emerald-600 text-white' : val === 'parcial' ? 'bg-amber-500 text-white' : 'bg-rose-600 text-white')
                          : 'bg-slate-50 text-slate-400 border border-slate-100 hover:bg-slate-100'}
                      `}
                    >
                      {val}
                    </button>
                  ))}
                </div>

                {needsObs && (
                  <div className="animate-in slide-in-from-top-2 duration-300">
                    <label className="text-[10px] font-extrabold text-rose-500 uppercase tracking-widest mb-2 block">
                      Observação de Não Conformidade
                    </label>
                    <textarea
                      value={resp.observacao || ''}
                      onChange={(e) => handleObsChange(q.id, e.target.value)}
                      placeholder="Descreva a irregularidade conforme fluxo de compliance..."
                      className="w-full bg-rose-50/50 border border-rose-100 rounded-2xl p-4 text-sm focus:ring-1 focus:ring-rose-400 focus:outline-none min-h-[100px]"
                    />
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {currentBlockIdx === blockKeys.length - 1 && (
        <div className="bg-amber-50 border border-amber-100 p-8 rounded-3xl space-y-4 shadow-sm">
          <div className="flex items-center gap-2 text-amber-700">
            <AlertTriangle size={24} />
            <h3 className="font-bold text-lg">Eventos Graves / Ocorrências</h3>
          </div>
          <p className="text-sm text-amber-600 font-medium">Situações extraordinárias que afetam o risco jurídico imediato (ex: interdição, acidente).</p>
          <textarea
            value={ocorrencias}
            onChange={(e) => setOcorrencias(e.target.value)}
            className="w-full bg-white border border-amber-200 rounded-2xl p-4 text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none min-h-[120px]"
            placeholder="Relate aqui ocorrências pontuais..."
          />
        </div>
      )}

      <footer className="flex justify-between items-center py-8">
        <button
          onClick={() => {
            if (currentBlockIdx === 0) setStep('setup');
            else setCurrentBlockIdx(prev => prev - 1);
          }}
          className="flex items-center gap-2 font-bold text-slate-400 hover:text-slate-800 transition-colors"
        >
          <ChevronLeft size={20} />
          Bloco Anterior
        </button>

        {currentBlockIdx === blockKeys.length - 1 ? (
          <button
            disabled={!isBlockComplete()}
            onClick={handleSubmit}
            className="bg-emerald-600 text-white px-12 py-5 rounded-2xl font-extrabold hover:bg-emerald-700 disabled:opacity-50 transition-all shadow-xl shadow-emerald-600/20 uppercase tracking-widest text-xs"
          >
            Finalizar e Gerar Report IA
          </button>
        ) : (
          <button
            disabled={!isBlockComplete()}
            onClick={() => setCurrentBlockIdx(prev => prev + 1)}
            className="bg-slate-900 text-white px-12 py-5 rounded-2xl font-bold hover:bg-slate-800 disabled:opacity-50 transition-all flex items-center gap-2 shadow-xl"
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
