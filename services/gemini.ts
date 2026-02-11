
import { GoogleGenAI, Type } from "@google/genai";
import { AIAnalysisResult } from "../types";

export const generateAuditReport = async (auditData: any): Promise<AIAnalysisResult> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const prompt = `Você é um sistema de governança e compliance de alto nível da Unità Engenharia.
  Sua função é analisar uma auditoria de campo em canteiro de obras e determinar o risco jurídico e operacional.
  
  Dados da Auditoria:
  ${JSON.stringify(auditData, null, 2)}
  
  CRITÉRIOS DE ANÁLISE (IMPORTANTE):
  1. BLOCOS TÉCNICOS: Avalie a conformidade sistêmica (GD4).
  2. BLOCO DE ENTREVISTAS (BLOCO F): Se houver contradição na fala do colaborador sobre PAGAMENTOS, BENEFÍCIOS ou ALOJAMENTO, o risco Jurídico deve ser elevado para ALTO ou CRÍTICO imediatamente, mesmo que o scoring numérico seja alto. Isso indica fraude documental.
  3. DIVERGÊNCIA DE EFETIVO: Se o número em campo for maior que no GD4, há risco de trabalho informal.
  
  REGRAS DE CLASSIFICAÇÃO:
  - REGULAR: Score > 80% e nenhuma contradição em entrevista.
  - ATENÇÃO: Score 60-80% ou inconsistências leves em entrevistas.
  - CRÍTICA: Score < 60% ou contradição grave em pagamentos/alojamento.
  
  Gere um relatório estruturado em JSON para a diretoria da Unità Engenharia.`;

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
