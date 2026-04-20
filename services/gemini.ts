
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

  const prompt = `ATUE COMO CONSULTOR SÊNIOR DE RISCO JURÍDICO. 
  DADOS: ${JSON.stringify(cleanPayload)}
  MISSÃO: Gerar relatório técnico de governança em JSON.
  
  FORMATO JSON OBRIGATÓRIO:
  {
    "indiceGeral": number,
    "classificacao": "REGULAR" | "ATENÇÃO" | "CRÍTICA",
    "riscoJuridico": "BAIXO" | "MÉDIO" | "ALTO" | "CRÍTICO",
    "exposicaoFinanceira": number,
    "detalhamentoCalculo": [{"item": string, "valor": number, "baseLegal": string, "logica": string}],
    "naoConformidades": [string],
    "impactoJuridico": string,
    "recomendacoes": [string],
    "conclusaoExecutiva": string
  }`;

  // Estratégia de Fetch Direto (Sem SDK para evitar 404s fantasmas)
  const models = ["gemini-1.5-flash", "gemini-1.5-pro"];
  let lastError = "";

  for (const model of models) {
    try {
      console.log(`Tentando conexão direta com modelo: ${model}`);
      
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
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
        console.warn(`Erro no modelo ${model}: ${lastError}`);
        continue;
      }

      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) continue;

      const parsed = robustJsonParse(text);
      return parsed as AIAnalysisResult;

    } catch (err: any) {
      lastError = err.message;
      continue;
    }
  }

  throw new Error(`Conexão com IA falhou. Último erro: ${lastError}. DICA: Verifique se sua chave de API está ativa no Google AI Studio.`);
};
