
import { GoogleGenAI, Type } from "@google/genai";
import { AIAnalysisResult } from "../types";

export const generateAuditReport = async (auditData: any): Promise<AIAnalysisResult> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const prompt = `Analise os riscos desta auditoria da Unità Engenharia.
  DADOS: ${JSON.stringify(auditData)}
  
  REGRAS DE CÁLCULO (Projetar amostra para o total de ${auditData.amostragem.total_efetivo} pessoas):
  - Multa CLT Art 47: R$ 60.000 por irregular.
  - NR-28 (Acesso): R$ 5.000 por falha.
  - Súmula 331 TST: R$ 100.000 fixo se houver quarteirização irregular.
  
  Gere um JSON com: indiceGeral(0-100), classificacao, riscoJuridico, exposicaoFinanceira(número), detalhamentoCalculo(item, valor, baseLegal, logica), naoConformidades(array), impactoJuridico, recomendacoes(array), conclusaoExecutiva.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            indiceGeral: { type: Type.NUMBER },
            classificacao: { type: Type.STRING },
            riscoJuridico: { type: Type.STRING },
            exposicaoFinanceira: { type: Type.NUMBER },
            detalhamentoCalculo: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  item: { type: Type.STRING },
                  valor: { type: Type.NUMBER },
                  baseLegal: { type: Type.STRING },
                  logica: { type: Type.STRING }
                }
              }
            },
            naoConformidades: { type: Type.ARRAY, items: { type: Type.STRING } },
            impactoJuridico: { type: Type.STRING },
            recomendacoes: { type: Type.ARRAY, items: { type: Type.STRING } },
            conclusaoExecutiva: { type: Type.STRING }
          },
          required: ["indiceGeral", "classificacao", "riscoJuridico", "exposicaoFinanceira", "detalhamentoCalculo", "naoConformidades", "impactoJuridico", "recomendacoes", "conclusaoExecutiva"]
        }
      }
    });

    const text = response.text?.trim() || "{}";
    return JSON.parse(text) as AIAnalysisResult;
  } catch (error) {
    console.error("Erro na IA:", error);
    throw new Error("Erro de comunicação com o motor de risco.");
  }
};
