
import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import { AIAnalysisResult } from "../types";

// Tipagem interna para controle de tentativas
interface AIExecutionConfig {
  modelName: string;
  apiVersion: 'v1' | 'v1beta';
  useSchema: boolean;
}

const sanitizeDataForAI = (data: any) => {
  return {
    ...data,
    respostas_check: data.respostas_check?.map((r: any) => {
      const { fotos, ...rest } = r;
      return {
        ...rest,
        quantidade_evidencias: fotos ? fotos.length : 0
      };
    })
  };
};

// Parser robusto que tenta extrair JSON mesmo que a IA retorne texto extra ou blocos de código
const robustJsonParse = (text: string): any => {
  try {
    const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
    // Busca o primeiro '{' e o último '}' para isolar o objeto JSON
    const start = cleanText.indexOf('{');
    const end = cleanText.lastIndexOf('}');
    if (start !== -1 && end !== -1) {
      return JSON.parse(cleanText.substring(start, end + 1));
    }
    return JSON.parse(cleanText);
  } catch (e) {
    console.error("Falha no parser robusto:", e, "Texto original:", text);
    throw new Error("Não foi possível processar os dados da IA.");
  }
};

export const generateAuditReport = async (auditData: any): Promise<AIAnalysisResult> => {
  const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY || import.meta.env.VITE_GEMINI_API_KEY;
  
  if (!apiKey) {
    throw new Error("Configuração de IA incompleta (Chave ausente).");
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const cleanPayload = sanitizeDataForAI(auditData);

  const prompt = `ATUE COMO UM CONSULTOR SÊNIOR DE RISCO JURÍDICO E COMPLIANCE DA UNITA ENGENHARIA.
  DADOS DA AUDITORIA: ${JSON.stringify(cleanPayload)}
  
  SUA MISSÃO É GERAR UM RELATÓRIO DE GOVERNANÇA TÉCNICO E ARITMETICAMENTE PRECISO.
  
  DIRETRIZES FINANCEIRAS (CRÍTICO):
  1. Calcule a Exposição Financeira Total (Passivo Estimado).
  2. VOCÊ DEVE LISTAR O DETALHAMENTO DE PELO MENOS 4 ITENS QUE COMPÕEM ESSE VALOR.
  3. A SOMA DOS VALORES ('valor') DENTRO DE 'detalhamentoCalculo' DEVE SER EXATAMENTE IGUAL AO 'exposicaoFinanceira'.
  
  FORMATO DE RETORNO (JSON OBRIGATÓRIO):
  {
    "indiceGeral": number (0-100),
    "classificacao": "REGULAR" | "ATENÇÃO" | "CRÍTICA",
    "riscoJuridico": "BAIXO" | "MÉDIO" | "ALTO" | "CRÍTICO",
    "exposicaoFinanceira": number,
    "detalhamentoCalculo": [{"item": string, "valor": number, "baseLegal": string, "logica": string}],
    "naoConformidades": [string],
    "impactoJuridico": string,
    "recomendacoes": [string],
    "conclusaoExecutiva": string
  }`;

  // Estratégia de Fallback em ordem de prioridade
  const strategies: AIExecutionConfig[] = [
    { modelName: "gemini-1.5-flash", apiVersion: "v1", useSchema: true },     // 1. Estável com Schema
    { modelName: "gemini-1.5-flash", apiVersion: "v1beta", useSchema: true }, // 2. Beta com Schema
    { modelName: "gemini-2.0-flash", apiVersion: "v1beta", useSchema: true }, // 3. 2.0 (Novo/Experimental)
    { modelName: "gemini-1.5-flash", apiVersion: "v1", useSchema: false },    // 4. Estável sem Schema (Texto puro)
    { modelName: "gemini-1.5-pro", apiVersion: "v1", useSchema: false }       // 5. Pro como último recurso
  ];

  for (const strategy of strategies) {
    try {
      console.log(`Tentando IA: ${strategy.modelName} (${strategy.apiVersion}) - Schema: ${strategy.useSchema ? 'Sim' : 'Não'}`);
      
      const config: any = { model: strategy.modelName };
      const generationConfig: any = { responseMimeType: "application/json" };

      // Só incluímos o Schema se a estratégia permitir
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

      const text = result.response.text();
      const parsed = robustJsonParse(text);

      // Validação básica da soma
      const soma = parsed.detalhamentoCalculo?.reduce((acc: number, curr: any) => acc + (curr.valor || 0), 0) || 0;
      if (soma !== parsed.exposicaoFinanceira && soma > 0) {
        parsed.exposicaoFinanceira = soma;
      }

      console.log(`Sucesso com ${strategy.modelName}!`);
      return parsed as AIAnalysisResult;

    } catch (err: any) {
      const errorMsg = err.message || "";
      console.warn(`Falha na estratégia ${strategy.modelName}:`, errorMsg.substring(0, 100));
      
      // Se for erro de cota (429), esperamos um pouco antes de tentar a próxima estratégia
      if (errorMsg.includes("429") || errorMsg.includes("quota")) {
        console.warn("Aguardando cota (Backoff)...");
        await new Promise(r => setTimeout(r, 2000));
      }
      
      // Continua para a próxima estratégia no loop
      continue;
    }
  }

  throw new Error("Todas as estratégias de IA falharam. Por favor, tente novamente em instantes.");
};
