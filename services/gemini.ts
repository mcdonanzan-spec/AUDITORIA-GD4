
import { GoogleGenAI, Type } from "@google/genai";
import { AIAnalysisResult } from "../types";

export const generateAuditReport = async (auditData: any): Promise<AIAnalysisResult> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const prompt = `Você é um sistema de Inteligência de Risco Jurídico e Financeiro da Unità Engenharia S.A.
  Sua tarefa é converter desvios de conformidade em uma estimativa de Passivo Financeiro Potencial e classificação de status.
  
  DADOS DA AUDITORIA:
  ${JSON.stringify(auditData, null, 2)}
  
  METODOLOGIA DE CLASSIFICAÇÃO (STATUS):
  1. REGULAR: Índice Geral >= 85%.
  2. ATENÇÃO: Índice Geral entre 70% e 84%.
  3. CRÍTICA: Índice Geral < 70%.
  
  METODOLOGIA DE CÁLCULO FINANCEIRO (BASE LEGAL BRASILEIRA):
  1. TRABALHADOR SEM REGISTRO/Pendente: Risco de R$ 60.000,00 por ocorrência.
  2. FALHA EM CONTROLE DE ACESSO: Multa NR-28 - Estimar R$ 5.000,00 por dia de irregularidade.
  3. BENEFÍCIOS NÃO PAGOS (Entrevistas): Estimar R$ 3.000,00 por colaborador afetado.
  4. SUBCONTRATAÇÃO IRREGULAR: Estimar 40% do valor total da folha da terceirizada (Mínimo R$ 100k).
  5. DOCUMENTAÇÃO GRD VENCIDA: Risco de multa administrativa (R$ 15k a R$ 40k).
  
  REGRAS:
  - Se houver OCORRÊNCIA GRAVE (ex: subcontratação irregular ou falta de registro), o status deve ser no mínimo ATENÇÃO, independente da média numérica.
  
  ESTRUTURA DE RESPOSTA (JSON):
  - indiceGeral: 0-100.
  - classificacao: REGULAR, ATENÇÃO, CRÍTICA.
  - riscoJuridico: BAIXO, MÉDIO, ALTO, CRÍTICO.
  - exposicaoFinanceira: Valor numérico total estimado em Reais (BRL).
  - naoConformidades: Lista de desvios.
  - impactoJuridico: Descrição técnica focada em passivo.
  - recomendacoes: Ações para mitigar o prejuízo financeiro.
  - conclusaoExecutiva: Linguagem para C-Level (Diretoria).
  
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
          "indiceGeral", "classificacao", "riscoJuridico", "exposicaoFinanceira",
          "naoConformidades", "impactoJuridico", 
          "recomendacoes", "conclusaoExecutiva"
        ]
      }
    }
  });

  const text = response.text || "{}";
  return JSON.parse(text) as AIAnalysisResult;
};
