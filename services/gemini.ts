
import { GoogleGenAI, Type } from "@google/genai";
import { AIAnalysisResult } from "../types";

export const generateAuditReport = async (auditData: any): Promise<AIAnalysisResult> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const prompt = `Você é um sistema de Inteligência de Risco Jurídico e Financeiro da Unità Engenharia S.A.
  Sua tarefa é converter desvios de conformidade em uma estimativa de Passivo Financeiro Potencial.
  
  DADOS DA AUDITORIA:
  ${JSON.stringify(auditData, null, 2)}
  
  METODOLOGIA DE CÁLCULO FINANCEIRO (BASE LEGAL BRASILEIRA):
  1. TRABALHADOR SEM REGISTRO/Pendente: Risco de R$ 60.000,00 por ocorrência (Vínculo + Multas eSocial + FGTS).
  2. FALHA EM CONTROLE DE ACESSO: Multa NR-28 (I3) - Estimar R$ 5.000,00 por dia de irregularidade detectada.
  3. BENEFÍCIOS NÃO PAGOS (Entrevistas): Risco de Ação Coletiva e Multas sindicais. Estimar R$ 3.000,00 por colaborador afetado.
  4. SUBCONTRATAÇÃO IRREGULAR: Risco de responsabilidade solidária integral. Estimar 40% do valor total da folha da terceirizada (Mínimo R$ 100k).
  5. DOCUMENTAÇÃO GRD VENCIDA: Risco de interdição parcial ou multa administrativa (R$ 15k a R$ 40k).
  
  REGRAS:
  - Ignore itens marcados como N/A.
  - Se a classificação for REGULAR e não houver desvios graves, a exposição pode ser R$ 0,00.
  - Seja realista, mas enfatize o risco para a diretoria.
  
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
