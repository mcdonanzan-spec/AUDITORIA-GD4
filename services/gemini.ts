
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";
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
    // Remove qualquer texto antes do primeiro '{' e depois do último '}'
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    
    if (start === -1 || end === -1) {
      throw new Error("JSON não encontrado na resposta");
    }

    const jsonStr = text.substring(start, end + 1);
    return JSON.parse(jsonStr);
  } catch (e) {
    console.error("Erro no parser:", e, "Texto:", text);
    throw new Error("A IA não retornou um formato de relatório válido.");
  }
};

export const generateAuditReport = async (auditData: any): Promise<AIAnalysisResult> => {
  const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY || import.meta.env.VITE_GEMINI_API_KEY;
  
  if (!apiKey) {
    throw new Error("Configuração: Chave GEMINI_API_KEY não encontrada.");
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const cleanPayload = sanitizeDataForAI(auditData);

  const prompt = `ATUE COMO CONSULTOR SÊNIOR DE RISCO JURÍDICO. 
  DADOS: ${JSON.stringify(cleanPayload)}
  
  MISSÃO: Gerar relatório técnico de governança.
  
  REGRAS FINANCEIRAS:
  - Exposição Financeira total = soma do detalhamento.
  - Detalhe 4 itens (CLT, NRs, Multas, Benefícios).
  
  RETORNE APENAS UM OBJETO JSON NO FORMATO ABAIXO (MUITO IMPORTANTE):
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

  // Lista de modelos para tentar em ordem de prioridade
  const modelNames = ["gemini-1.5-flash", "gemini-2.0-flash", "gemini-1.5-pro"];
  let lastError = "";

  for (const modelName of modelNames) {
    try {
      // Tentamos primeiro na v1beta (mais moderna) e depois na v1 (estável)
      for (const apiVer of ['v1beta', 'v1']) {
        try {
          const model = genAI.getGenerativeModel({ 
            model: modelName,
            safetySettings: [
              { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
              { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
              { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
              { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
            ]
          }, { apiVersion: apiVer as any });

          const result = await model.generateContent(prompt);
          const text = result.response.text();
          
          if (!text) continue;

          const parsed = robustJsonParse(text);

          // Validação aritmética
          const soma = parsed.detalhamentoCalculo?.reduce((acc: number, curr: any) => acc + (curr.valor || 0), 0) || 0;
          if (soma !== parsed.exposicaoFinanceira && soma > 0) {
            parsed.exposicaoFinanceira = soma;
          }

          return parsed as AIAnalysisResult;

        } catch (innerErr: any) {
          lastError = innerErr.message || "Erro de conexão";
          if (lastError.includes("429")) {
             await new Promise(r => setTimeout(r, 2000));
          }
          continue;
        }
      }
    } catch (outerErr) {
      continue;
    }
  }

  throw new Error(`Falha crítica na IA: ${lastError}. Tente novamente.`);
};
