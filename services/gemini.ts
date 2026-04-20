
import { GoogleGenerativeAI, SchemaType, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";
import { AIAnalysisResult } from "../types";

interface AIExecutionConfig {
  modelName: string;
  apiVersion: 'v1' | 'v1beta';
  useSchema: boolean;
}

const sanitizeDataForAI = (data: any) => {
  // Otimização extrema: Enviamos apenas o que a IA precisa para julgar riscos
  return {
    obra: data.obra_nome,
    tipo: data.tipo_servico,
    resumo_check: data.respostas_check?.map((r: any) => ({
      item: r.item_nome,
      status: r.conforme ? 'CONFORME' : 'NÃO CONFORME',
      obs: r.observacao,
      fotos: r.fotos_urls?.length || 0
    })) || []
  };
};

const robustJsonParse = (text: string): any => {
  try {
    const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
    const start = cleanText.indexOf('{');
    const end = cleanText.lastIndexOf('}');
    if (start !== -1 && end !== -1) {
      return JSON.parse(cleanText.substring(start, end + 1));
    }
    return JSON.parse(cleanText);
  } catch (e) {
    throw new Error(`Falha ao processar dados da IA: ${text.substring(0, 100)}...`);
  }
};

export const generateAuditReport = async (auditData: any): Promise<AIAnalysisResult> => {
  const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY || import.meta.env.VITE_GEMINI_API_KEY;
  
  if (!apiKey) {
    throw new Error("Chave de API (GEMINI_API_KEY) não configurada na Vercel.");
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const cleanPayload = sanitizeDataForAI(auditData);

  const prompt = `ATUE COMO UM CONSULTOR SÊNIOR DE RISCO JURÍDICO DA UNITA ENGENHARIA.
  ANALISE OS DADOS: ${JSON.stringify(cleanPayload)}
  
  MISSÃO: Gerar relatório técnico de governança.
  REGRAS: 
  - Calcule Exposição Financeira total.
  - Liste 4 itens detalhados de cálculo (CLT, NRs, Multas, Benefícios).
  - A soma do detalhamento deve bater com o total.
  
  FORMATO JSON OBRIGATÓRIO:
  {
    "indiceGeral": 0-100,
    "classificacao": "REGULAR"|"ATENÇÃO"|"CRÍTICA",
    "riscoJuridico": "BAIXO"|"MÉDIO"|"ALTO"|"CRÍTICO",
    "exposicaoFinanceira": number,
    "detalhamentoCalculo": [{"item": string, "valor": number, "baseLegal": string, "logica": string}],
    "naoConformidades": [string],
    "impactoJuridico": string,
    "recomendacoes": [string],
    "conclusaoExecutiva": string
  }`;

  const strategies: AIExecutionConfig[] = [
    { modelName: "gemini-1.5-flash", apiVersion: "v1", useSchema: true },
    { modelName: "gemini-1.5-flash", apiVersion: "v1beta", useSchema: true },
    { modelName: "gemini-2.0-flash", apiVersion: "v1beta", useSchema: true },
    { modelName: "gemini-1.5-flash", apiVersion: "v1", useSchema: false }
  ];

  let lastError = "";

  for (const strategy of strategies) {
    try {
      const config: any = { 
        model: strategy.modelName,
        // Desativamos filtros de segurança para evitar falsos positivos com terminologia de "Risco"
        safetySettings: [
          { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
          { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
          { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
          { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
        ]
      };

      const generationConfig: any = { 
        responseMimeType: "application/json",
        temperature: 0.2
      };

      if (strategy.useSchema) {
        generationConfig.responseSchema = {
          type: SchemaType.OBJECT,
          properties: {
            indiceGeral: { type: SchemaType.NUMBER },
            classificacao: { type: SchemaType.STRING },
            riscoJuridico: { type: SchemaType.STRING },
            exposicaoFinanceira: { type: SchemaType.NUMBER },
            detalhamentoCalculo: {
              type: SchemaType.ARRAY,
              items: {
                type: SchemaType.OBJECT,
                properties: {
                  item: { type: SchemaType.STRING },
                  valor: { type: SchemaType.NUMBER },
                  baseLegal: { type: SchemaType.STRING },
                  logica: { type: SchemaType.STRING }
                },
                required: ["item", "valor", "baseLegal", "logica"]
              }
            },
            naoConformidades: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
            impactoJuridico: { type: SchemaType.STRING },
            recomendacoes: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
            conclusaoExecutiva: { type: SchemaType.STRING }
          },
          required: ["indiceGeral", "classificacao", "riscoJuridico", "exposicaoFinanceira", "detalhamentoCalculo", "naoConformidades", "impactoJuridico", "recomendacoes", "conclusaoExecutiva"]
        };
      }

      const model = genAI.getGenerativeModel(config, { apiVersion: strategy.apiVersion });
      const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig
      });

      if (!result.response) throw new Error("Sem resposta do modelo");

      const text = result.response.text();
      const parsed = robustJsonParse(text);

      const soma = parsed.detalhamentoCalculo?.reduce((acc: number, curr: any) => acc + (curr.valor || 0), 0) || 0;
      if (soma !== parsed.exposicaoFinanceira && soma > 0) {
        parsed.exposicaoFinanceira = soma;
      }

      return parsed as AIAnalysisResult;

    } catch (err: any) {
      lastError = err.message || "Erro desconhecido";
      console.warn(`Falha ${strategy.modelName}: ${lastError}`);
      
      if (lastError.includes("429") || lastError.includes("quota")) {
        await new Promise(r => setTimeout(r, 2000));
      }
      continue;
    }
  }

  throw new Error(`IA Indisponível. Motivo: ${lastError}`);
};
