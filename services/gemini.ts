
import { GoogleGenAI, Type } from "@google/genai";
import { AIAnalysisResult } from "../types";

export const generateAuditReport = async (auditData: any): Promise<AIAnalysisResult> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  // Usando gemini-3-pro-preview para tarefas complexas de auditoria e cálculo
  const prompt = `ATUE COMO UM SISTEMA DE AUDITORIA DE CONFORMIDADE JURÍDICA E OPERACIONAL EM OBRAS.
  DADOS DA AUDITORIA RECEBIDOS: ${JSON.stringify(auditData)}
  
  SUA TAREFA:
  1. Analise os desvios e calcule o Índice Geral (0-100).
  2. Projete a Exposição Financeira (Passivo Trabalhista) baseada em CLT e Súmulas do TST.
  3. Identifique riscos críticos imediatos.

  RETORNE APENAS UM JSON VÁLIDO COM:
  - indiceGeral: (número 0-100)
  - classificacao: (REGULAR, ATENÇÃO ou CRÍTICA)
  - riscoJuridico: (BAIXO, MÉDIO, ALTO ou CRÍTICO)
  - exposicaoFinanceira: (número total projetado em Reais)
  - detalhamentoCalculo: (array de {item, valor, baseLegal, logica})
  - naoConformidades: (array de strings)
  - impactoJuridico: (texto curto sobre o risco legal)
  - recomendacoes: (array de strings)
  - conclusaoExecutiva: (parágrafo técnico para diretoria)`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
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

    const text = response.text?.trim();
    if (!text) throw new Error("Resposta vazia da IA");
    
    return JSON.parse(text) as AIAnalysisResult;
  } catch (error) {
    console.error("Erro na IA:", error);
    // Fallback básico em caso de erro crítico para não travar o app
    return {
      indiceGeral: 0,
      classificacao: "ERRO DE ANÁLISE",
      riscoJuridico: "INDETERMINADO",
      exposicaoFinanceira: 0,
      detalhamentoCalculo: [],
      naoConformidades: ["Não foi possível processar a análise automática."],
      impactoJuridico: "Falha na conexão com o motor de IA.",
      recomendacoes: ["Verifique a conexão e tente novamente."],
      conclusaoExecutiva: "Erro técnico ao gerar o relatório consolidado."
    };
  }
};
