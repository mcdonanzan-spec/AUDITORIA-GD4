
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
  AlertTriangle
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
    return currentBlockQuestions.every(q => respostas.find(r => r.pergunta_id === q.id));
  };

  const handleSubmit = async () => {
    setStep('processing');
    setLoading(true);

    try {
      // Prepare data for Gemini
      const blockScores = blockKeys.reduce((acc, b) => {
        const qIds = QUESTIONS.filter(q => q.bloco === b).map(q => q.id);
        const bResps = respostas.filter(r => qIds.includes(r.pergunta_id));
        const totalScore = bResps.reduce((sum, r) => {
          const score = r.resposta === 'sim' ? 100 : r.resposta === 'parcial' ? 50 : 0;
          return sum + score;
        }, 0);
        acc[BLOCKS[b].toLowerCase().replace(/ /g, '_')] = Math.round(totalScore / qIds.length);
        return acc;
      }, {} as any);

      const auditPayload = {
        obra: obras.find(o => o.id === selectedObra)?.nome || '',
        data: new Date().toISOString(),
        auditor: currentUser.nome,
        blocos: blockScores,
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
        created_at: new Date().toISOString()
      };

      onAuditComplete(newAudit, result);
    } catch (err) {
      console.error(err);
      setStep('questions');
      alert("Erro ao processar auditoria. Verifique a chave de API.");
    } finally {
      setLoading(false);
    }
  };

  if (step === 'setup') {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <header>
          <h2 className="text-2xl font-bold text-slate-800">Iniciar Nova Auditoria</h2>
          <p className="text-slate-500">Defina os parâmetros iniciais para começar a coleta em campo.</p>
        </header>

        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700 block">Selecione a Obra</label>
            <div className="relative">
              <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <select 
                className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-10 pr-4 py-3 appearance-none focus:ring-2 focus:ring-emerald-500 focus:outline-none transition-all"
                value={selectedObra}
                onChange={(e) => setSelectedObra(e.target.value)}
              >
                <option value="">Selecione...</option>
                {obras.map(o => <option key={o.id} value={o.id}>{o.nome} ({o.regional})</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 block">Tipo</label>
              <select 
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 focus:ring-2 focus:ring-emerald-500 focus:outline-none transition-all"
                value={auditType}
                onChange={(e) => setAuditType(e.target.value as any)}
              >
                <option value="mensal">Mensal</option>
                <option value="extraordinaria">Extraordinária</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 block">Data da Auditoria</label>
              <div className="bg-slate-100 border border-slate-200 rounded-lg px-4 py-3 text-slate-500 flex items-center gap-2">
                <Calendar size={18} />
                {new Date().toLocaleDateString('pt-BR')}
              </div>
            </div>
          </div>

          <button
            disabled={!selectedObra}
            onClick={() => setStep('questions')}
            className="w-full bg-emerald-600 text-white py-4 rounded-xl font-bold hover:bg-emerald-700 disabled:opacity-50 transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20"
          >
            Começar Auditoria Estruturada
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
          <Loader2 className="animate-spin text-emerald-500" size={64} />
          <div className="absolute inset-0 flex items-center justify-center">
            <CheckCircle2 className="text-emerald-500/20" size={32} />
          </div>
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-slate-800">Processando Inteligência de Risco</h2>
          <p className="text-slate-500 max-w-md">O Gemini está analisando as conformidades, calculando o scoring jurídico e gerando seu relatório executivo...</p>
        </div>
        <div className="flex gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-bounce"></span>
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-bounce [animation-delay:-0.15s]"></span>
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-bounce [animation-delay:-0.3s]"></span>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">
            {currentBlockIdx + 1}. {BLOCKS[currentBlockKey]}
          </h2>
          <div className="flex gap-1 mt-2">
            {blockKeys.map((_, idx) => (
              <div 
                key={idx} 
                className={`h-1.5 w-12 rounded-full transition-all ${idx <= currentBlockIdx ? 'bg-emerald-500' : 'bg-slate-200'}`}
              />
            ))}
          </div>
        </div>
        <div className="text-right">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Progresso</span>
          <p className="text-lg font-bold text-slate-800">{Math.round(((currentBlockIdx + 1) / blockKeys.length) * 100)}%</p>
        </div>
      </div>

      <div className="space-y-4">
        {currentBlockQuestions.map((q) => {
          const resp = respostas.find(r => r.pergunta_id === q.id);
          const needsObs = resp && resp.resposta !== 'sim';
          
          return (
            <div key={q.id} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
              <p className="text-slate-800 font-medium">{q.texto}</p>
              
              <div className="flex flex-wrap gap-2">
                {(['sim', 'parcial', 'nao'] as ResponseValue[]).map((val) => (
                  <button
                    key={val}
                    onClick={() => handleResponseChange(q.id, val)}
                    className={`
                      px-6 py-2 rounded-lg font-bold text-sm uppercase transition-all
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
                <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                  <label className="text-[10px] font-bold text-rose-500 uppercase tracking-widest mb-2 block">
                    Observação Obrigatória (Risco Identificado)
                  </label>
                  <textarea
                    value={resp.observacao || ''}
                    onChange={(e) => handleObsChange(q.id, e.target.value)}
                    placeholder="Descreva a irregularidade ou plano de ação imediato..."
                    className="w-full bg-rose-50 border border-rose-100 rounded-lg p-3 text-sm focus:ring-1 focus:ring-rose-400 focus:outline-none min-h-[80px]"
                  />
                </div>
              )}

              <div className="flex justify-end">
                <button className="flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-emerald-600 transition-colors uppercase tracking-wider">
                  <Camera size={14} />
                  Anexar Evidência
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Ocorrencias Graves (Only on last block) */}
      {currentBlockIdx === blockKeys.length - 1 && (
        <div className="bg-amber-50 border border-amber-200 p-6 rounded-xl space-y-3">
          <div className="flex items-center gap-2 text-amber-800">
            <AlertTriangle size={20} />
            <h3 className="font-bold">Ocorrências Graves ou Pontuais</h3>
          </div>
          <p className="text-sm text-amber-700">Descreva situações que exigem análise imediata da diretoria (ex: acidente, interdição).</p>
          <textarea
            value={ocorrencias}
            onChange={(e) => setOcorrencias(e.target.value)}
            className="w-full bg-white border border-amber-200 rounded-lg p-3 text-sm focus:ring-1 focus:ring-amber-400 focus:outline-none min-h-[100px]"
            placeholder="Ex: Identificado colaborador de terceiro sem registro..."
          />
        </div>
      )}

      <footer className="flex justify-between items-center py-6">
        <button
          onClick={() => {
            if (currentBlockIdx === 0) setStep('setup');
            else setCurrentBlockIdx(prev => prev - 1);
          }}
          className="flex items-center gap-2 font-bold text-slate-400 hover:text-slate-800 transition-colors"
        >
          <ChevronLeft size={20} />
          Voltar
        </button>

        {currentBlockIdx === blockKeys.length - 1 ? (
          <button
            disabled={!isBlockComplete()}
            onClick={handleSubmit}
            className="bg-slate-900 text-white px-10 py-4 rounded-xl font-bold hover:bg-slate-800 disabled:opacity-50 transition-all shadow-xl"
          >
            Finalizar e Gerar Report IA
          </button>
        ) : (
          <button
            disabled={!isBlockComplete()}
            onClick={() => setCurrentBlockIdx(prev => prev + 1)}
            className="bg-emerald-600 text-white px-10 py-4 rounded-xl font-bold hover:bg-emerald-700 disabled:opacity-50 transition-all flex items-center gap-2 shadow-lg shadow-emerald-600/20"
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
