
import { GoogleGenAI, Type } from "@google/genai";
import { AIAnalysisResult } from "../types";

/**
 * SANITIZAÇÃO SÊNIOR:
 * Removemos strings base64 pesadas antes de enviar para a IA.
 * A IA precisa da lógica (texto/números), não dos bytes das imagens.
 */
const sanitizeDataForAI = (data: any) => {
  const cleanData = JSON.parse(JSON.stringify(data));
  
  if (cleanData.respostas_check) {
    cleanData.respostas_check = cleanData.respostas_check.map((r: any) => {
      const { fotos, ...rest } = r;
      return {
        ...rest,
        quantidade_evidencias: fotos ? fotos.length : 0
      };
    });
  }
  return cleanData;
};

export const generateAuditReport = async (auditData: any): Promise<AIAnalysisResult> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  // Limpa os dados para garantir que o payload seja leve (< 50kb em vez de 10mb+)
  const cleanPayload = sanitizeDataForAI(auditData);

  const prompt = `ATUE COMO UM SISTEMA DE AUDITORIA DE CONFORMIDADE JURÍDICA E OPERACIONAL (UNITA ENGENHARIA).
  DADOS HIGIENIZADOS DA AUDITORIA: ${JSON.stringify(cleanPayload)}
  
  SUA TAREFA:
  1. Analise os desvios baseando-se nas observações e respostas.
  2. Calcule o Índice Geral (0-100).
  3. Estime a Exposição Financeira (Passivo Trabalhista) baseada em CLT e NRs.
  4. Gere recomendações estratégicas.

  RETORNE APENAS JSON VÁLIDO:
  - indiceGeral: number
  - classificacao: REGULAR, ATENÇÃO ou CRÍTICA
  - riscoJuridico: BAIXO, MÉDIO, ALTO ou CRÍTICO
  - exposicaoFinanceira: number (valor em Reais)
  - detalhamentoCalculo: array de {item, valor, baseLegal, logica}
  - naoConformidades: array de strings
  - impactoJuridico: string
  - recomendacoes: array de strings
  - conclusaoExecutiva: string (tom executivo para diretoria)`;

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
    console.error("Erro Crítico na IA:", error);
    return {
      indiceGeral: 0,
      classificacao: "ERRO TÉCNICO",
      riscoJuridico: "INDETERMINADO",
      exposicaoFinanceira: 0,
      detalhamentoCalculo: [],
      naoConformidades: ["Ocorreu uma falha no processamento da IA devido ao tamanho dos dados ou conexão."],
      impactoJuridico: "Análise interrompida.",
      recomendacoes: ["Tente gerar o relatório novamente ou reduza o número de fotos."],
      conclusaoExecutiva: "Sistema temporariamente indisponível para análise qualitativa."
    };
  }
};
