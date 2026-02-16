
import { GoogleGenAI, Type } from "@google/genai";
import { AIAnalysisResult } from "../types";

/**
 * SANITIZAÇÃO SÊNIOR:
 * Removemos strings base64 pesadas antes de enviar para a IA.
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
  
  const cleanPayload = sanitizeDataForAI(auditData);

  const prompt = `ATUE COMO UM ESPECIALISTA EM RISCO JURÍDICO E COMPLIANCE DA UNITA ENGENHARIA.
  ANALISE ESTES DADOS DE AUDITORIA: ${JSON.stringify(cleanPayload)}
  
  SUA MISSÃO:
  1. Calcule o Score de Conformidade (0-100%).
  2. Identifique o Risco Jurídico (BAIXO, MÉDIO, ALTO, CRÍTICO).
  3. Estime a Exposição Financeira Total considerando CLT e NRs.
  4. Crie uma "Memória de Cálculo" detalhada com pelo menos 4 itens (ex: Falta de Registro, Verbas Rescisórias, Benefícios, Multas NRs).
  
  RETORNE APENAS JSON:
  - indiceGeral: number
  - classificacao: REGULAR, ATENÇÃO ou CRÍTICA
  - riscoJuridico: BAIXO, MÉDIO, ALTO ou CRÍTICO
  - exposicaoFinanceira: number
  - detalhamentoCalculo: array de {item, valor, baseLegal, logica}
  - naoConformidades: array de strings
  - impactoJuridico: string
  - recomendacoes: array de strings
  - conclusaoExecutiva: string (máximo 3 linhas, tom de diretoria)`;

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
      detalhamentoCalculo: [
        { item: "Falha de Processamento", valor: 0, baseLegal: "Timeout", logica: "Dados pesados ou instabilidade de rede" }
      ],
      naoConformidades: ["Ocorreu uma falha no processamento qualitativo."],
      impactoJuridico: "Análise interrompida.",
      recomendacoes: ["Tente gerar novamente sem exceder o limite de fotos."],
      conclusaoExecutiva: "Sistema temporariamente indisponível para análise qualitativa completa."
    };
  }
};
