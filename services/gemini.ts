
import { GoogleGenAI, Type } from "@google/genai";
import { AIAnalysisResult } from "../types";

export const generateAuditReport = async (auditData: any): Promise<AIAnalysisResult> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const prompt = `ATUE COMO UM SISTEMA DE AUDITORIA DE CONFORMIDADE JURÍDICA EM OBRAS.
  DADOS DA AUDITORIA: ${JSON.stringify(auditData)}
  
  SUA TAREFA:
  1. Calcular o Índice Geral (0-100) baseado no peso dos blocos.
  2. Projetar Exposição Financeira (Passivo Trabalhista) baseado em CLT Art 47 (R$ 60k por irregular) e Súmula 331 TST (R$ 100k fixo para quarteirização).
  3. Identificar riscos imediatos.

  SAÍDA OBRIGATÓRIA EM JSON:
  - indiceGeral: número
  - classificacao: REGULAR, ATENÇÃO ou CRÍTICA
  - riscoJuridico: BAIXO, MÉDIO, ALTO ou CRÍTICO
  - exposicaoFinanceira: número total projetado
  - detalhamentoCalculo: array de objetos {item, valor, baseLegal, logica}
  - naoConformidades: array de strings
  - impactoJuridico: texto técnico curto
  - recomendacoes: array de strings técnicas
  - conclusaoExecutiva: parágrafo formal para a diretoria.`;

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
    throw new Error("Falha ao processar análise de risco.");
  }
};
