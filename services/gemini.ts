
import { AIAnalysisResult } from "../types";

const sanitizeDataForAI = (data: any) => {
  return {
    obra: data.obra_nome,
    tipo: data.tipo_servico,
    resumo_check: data.respostas_check?.map((r: any) => ({
      item: r.item_nome,
      status: r.conforme ? 'CONFORME' : 'NÃO CONFORME',
      obs: r.observacao
    })) || []
  };
};

const robustJsonParse = (text: string): any => {
  try {
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start === -1 || end === -1) throw new Error("JSON não encontrado");
    return JSON.parse(text.substring(start, end + 1));
  } catch (e) {
    console.error("Erro no parser:", e, "Texto:", text);
    throw new Error("IA não retornou dados válidos.");
  }
};

export const generateAuditReport = async (auditData: any): Promise<AIAnalysisResult> => {
  // Diagnóstico e Captura de Chave de API (Tolerância Máxima)
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY || 
                 import.meta.env.GEMINI_API_KEY ||
                 (window as any).process?.env?.VITE_GEMINI_API_KEY || 
                 (window as any).process?.env?.GEMINI_API_KEY;
  
  if (!apiKey || apiKey === 'undefined') {
    console.error("ERRO: Nenhuma chave de API detectada pelo sistema.");
    throw new Error("A chave da API do Gemini não foi encontrada. Certifique-se de que a variável de ambiente VITE_GEMINI_API_KEY está configurada na Vercel e que você fez um novo deploy.");
  }

  console.log(`DEBUG: Chave detectada (Inicia com: ${apiKey.substring(0, 4)}... Tamanho: ${apiKey.length})`);

  const cleanPayload = sanitizeDataForAI(auditData);

  const prompt = `ATUE COMO UM AUDITOR FISAL DO TRABALHO E ESPECIALISTA EM DIREITO DO TRABALHO (TRTs/TST).
  
  CONTEXTO: Auditoria de quarteirização em canteiro de obras da Unità Engenharia.
  DADOS COLETADOS EM CAMPO: ${JSON.stringify(cleanPayload)}
  
  MISSÃO: Gerar um relatório técnico de exposição financeira baseado exclusivamente na legislação trabalhista brasileira.
  
  DIRETRIZES DE ANÁLISE:
  1. BASE LEGAL: Foque em CLT, Normas Regulamentadoras (NR-18, NR-35, NR-06 etc.), Súmula 331 do TST e jurisprudência consolidada dos TRTs.
  2. FOCO NO RISCO: Vínculo empregatício irregular, falta de EPIs, ausência de treinamentos obrigatórios, subcontratação ilícita (quarteirização) e verbas não pagas (FGTS, DSR, Horas Extras, Adicionais).
  3. PROIBIDO: Não mencione LGPD, Propriedade Intelectual ou crimes cibernéticos. O foco é 100% OPERACIONAL E TRABALHISTA.
  
  RETORNE APENAS UM JSON COM ESTA ESTRUTURA:
  {
    "indiceGeral": number (0-100),
    "classificacao": "REGULAR" | "ATENÇÃO" | "CRÍTICA",
    "riscoJuridico": "BAIXO" | "MÉDIO" | "ALTO" | "CRÍTICO",
    "exposicaoFinanceira": number (Soma total do passivo estimado),
    "detalhamentoCalculo": [
      {
        "item": "Ex: Vínculo Empregatício Irregular ou NR-18 (EPIs)", 
        "valor": number, 
        "baseLegal": "Citar Artigo da CLT, NR ou Súmula do TST", 
        "logica": "Explicação técnica fundamentada na jurisprudência dos TRTs"
      }
    ],
    "naoConformidades": [string],
    "impactoJuridico": "Análise sobre responsabilidade subsidiária/solidária",
    "recomendacoes": ["Ações imediatas para mitigação de risco"],
    "conclusaoExecutiva": "Resumo estratégico para a diretoria"
  }`;

  // Estratégia de Auto-Descoberta de Modelos (Expert Discovery)
  let models: string[] = ["gemini-1.5-flash", "gemini-1.5-pro", "gemini-2.0-flash"];
  
  try {
    console.log("DEBUG: Consultando modelos disponíveis para esta chave...");
    const listResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    if (listResponse.ok) {
      const listData = await listResponse.json();
      const availableModels = listData.models
        ?.filter((m: any) => m.supportedGenerationMethods.includes("generateContent"))
        ?.map((m: any) => m.name.split('/').pop()) || [];
      
      if (availableModels.length > 0) {
        console.log("DEBUG: Modelos encontrados no seu projeto:", availableModels);
        // Colocamos os modelos encontrados no topo da lista de prioridade
        models = [...new Set([...availableModels, ...models])];
      }
    }
  } catch (e) {
    console.warn("DEBUG: Falha ao listar modelos, usando lista padrão.");
  }

  let lastError = "";

  for (const model of models) {
    try {
      console.log(`Tentando conexão direta com modelo: ${model}`);
      
      // Tentamos v1 e v1beta para máxima compatibilidade
      for (const apiVer of ['v1beta', 'v1']) {
        const response = await fetch(`https://generativelanguage.googleapis.com/${apiVer}/models/${model}:generateContent?key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.1,
              topK: 1,
              topP: 1,
              maxOutputTokens: 2048,
            }
          })
        });

        const data = await response.json();

        if (!response.ok) {
          lastError = data.error?.message || response.statusText;
          continue;
        }

        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!text) continue;

        const parsed = robustJsonParse(text);
        return parsed as AIAnalysisResult;
      }

    } catch (err: any) {
      lastError = err.message;
      continue;
    }
  }

  throw new Error(`Conexão com IA falhou. Último erro: ${lastError}. DICA: Verifique se sua chave de API está ativa no Google AI Studio.`);
};
