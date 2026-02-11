
import { GoogleGenAI, Type } from "@google/genai";
import { AIAnalysisResult } from "../types";

export const generateAuditReport = async (auditData: any): Promise<AIAnalysisResult> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const prompt = `Você é um sistema de governança e compliance de alto nível da Unità Engenharia.
  Sua função é analisar uma auditoria de campo em canteiro de obras e determinar o risco jurídico e operacional baseado em fatos sistêmicos e comportamentais.
  
  Dados da Auditoria:
  ${JSON.stringify(auditData, null, 2)}
  
  CRITÉRIOS DE ANÁLISE (IMPORTANTE):
  1. BLOCO G (GESTÃO DOCUMENTAL GD4): Analise o volume de pendências (A Analisar vs Pendentes de Envio). Se houver alto volume comparado ao efetivo, classifique como NEGLIGÊNCIA ADMINISTRATIVA.
  2. BLOCO F (ENTREVISTAS): Contradições sobre PAGAMENTOS ou BENEFÍCIOS elevam o Risco Jurídico para CRÍTICO imediatamente.
  3. DIVERGÊNCIA DE EFETIVO: Diferença campo vs sistema indica trabalho informal e risco de passivo trabalhista.
  
  REGRAS DE CLASSIFICAÇÃO:
  - REGULAR: Score > 80% e pendências documentais baixas (<10% do efetivo).
  - ATENÇÃO: Score 60-80% ou pendências documentais acumuladas.
  - CRÍTICA: Score < 60% ou negligência grave no GD4 ou contradições em entrevistas.
  
  Gere um relatório estruturado em JSON para a diretoria executiva.`;

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
