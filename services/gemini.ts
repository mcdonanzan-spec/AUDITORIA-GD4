
import { GoogleGenAI, Type } from "@google/genai";
import { AIAnalysisResult } from "../types";

export const generateAuditReport = async (auditData: any): Promise<AIAnalysisResult> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const prompt = `Você é um sistema de avaliação de risco jurídico e operacional em obras de construção civil. Analise os seguintes dados e gere um scoring e relatório executivo.
  
  Dados da Auditoria:
  ${JSON.stringify(auditData, null, 2)}
  
  Regras de Negócio:
  1. Falha em controle de acesso = risco mínimo MÉDIO.
  2. Colaborador irregular identificado = risco mínimo ALTO.
  3. Subcontratação irregular = risco CRÍTICO.
  4. Documento mensal pendente = risco mínimo MÉDIO.
  5. Liberação manual paralela à catraca = risco ALTO automático.
  6. Desvio de função com exposição a NR = risco ALTO.
  7. Se houver ocorrência grave, priorizar análise qualitativa acima da média numérica.`;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          indiceGeral: { type: Type.NUMBER },
          classificacao: { type: Type.STRING },
          riscoJuridico: { type: Type.STRING },
          naoConformidades: { 
            type: Type.ARRAY, 
            items: { type: Type.STRING } 
          },
          impactoJuridico: { type: Type.STRING },
          recomendacoes: { 
            type: Type.ARRAY, 
            items: { type: Type.STRING } 
          },
          conclusaoExecutiva: { type: Type.STRING }
        },
        required: [
          "indiceGeral", "classificacao", "riscoJuridico", 
          "naoConformidades", "impactoJuridico", 
          "recomendacoes", "conclusaoExecutiva"
        ]
      }
    }
  });

  const text = response.text || "{}";
  return JSON.parse(text) as AIAnalysisResult;
};
