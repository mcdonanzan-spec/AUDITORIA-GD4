
import { GoogleGenAI, Type } from "@google/genai";
import { AIAnalysisResult } from "../types";

export const generateAuditReport = async (auditData: any): Promise<AIAnalysisResult> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const prompt = `Você é um sistema de Inteligência de Risco Jurídico e Financeiro da Unità Engenharia S.A.
  Sua tarefa é converter desvios de conformidade em uma estimativa de Passivo Financeiro Potencial e classificação de status.
  
  DADOS DA AUDITORIA:
  ${JSON.stringify(auditData, null, 2)}
  
  O cálculo deve projetar as falhas encontradas na amostra para o efetivo total de ${auditData.amostragem.total_efetivo || 'pessoas informadas'}.
  
  METODOLOGIA DE CÁLCULO E BASE LEGAL:
  1. TRABALHADOR PENDENTE/SEM REGISTRO: R$ 60.000,00 (Multa Art. 47 CLT + Passivo de verbas rescisórias).
  2. FALHA ACESSO/CATRACA: R$ 5.000,00/dia (NR-28 - Fiscalização e Penalidades).
  3. BENEFÍCIOS (VT/VR): R$ 3.000,00 por colaborador afetado (Projeção estatística da amostra para o total).
  4. QUARTEIRIZAÇÃO IRREGULAR: Mínimo R$ 100.000,00 (Risco de reconhecimento de vínculo direto - Súmula 331 TST).
  5. DOCUMENTAÇÃO GRD: R$ 15.000,00 a R$ 40.000,00 (Autuações administrativas e multas sindicais).
  
  ESTRUTURA DE RESPOSTA (JSON):
  - indiceGeral: número.
  - classificacao: REGULAR, ATENÇÃO, CRÍTICA.
  - riscoJuridico: BAIXO, MÉDIO, ALTO, CRÍTICO.
  - exposicaoFinanceira: soma total.
  - detalhamentoCalculo: [ { item, valor, baseLegal, logica } ]
  - naoConformidades: [ strings ]
  - impactoJuridico: string
  - recomendacoes: [ strings ]
  - conclusaoExecutiva: string
  
  Retorne APENAS o JSON.`;

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

  const text = response.text || "{}";
  return JSON.parse(text) as AIAnalysisResult;
};
