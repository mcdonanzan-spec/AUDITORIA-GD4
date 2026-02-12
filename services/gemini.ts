
import { GoogleGenAI, Type } from "@google/genai";
import { AIAnalysisResult } from "../types";

export const generateAuditReport = async (auditData: any): Promise<AIAnalysisResult> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const prompt = `Você é um sistema de governança e compliance de alto nível da Unità Engenharia S.A., especializado em gestão de terceiros e mão de obra própria (GRD).
  Sua função é analisar uma auditoria de campo e determinar o risco jurídico e operacional.
  
  Dados da Auditoria:
  ${JSON.stringify(auditData, null, 2)}
  
  CRITÉRIOS DE ANÁLISE MANDATÓRIOS (REGRAS DE NEGÓCIO):
  1. GOVERNANÇA GRD (BLOCO F): 
     - Item 01 (Terceiros): Se houver falha na qualificação, risco ALTO.
     - Item 02 (Próprios): A manutenção da documentação da mão de obra própria é CRÍTICA. Se houver falha na atualização de documentos contratuais ou de segurança (NRs/ASO) de funcionários da Unità, o risco Jurídico deve ser ALTO/CRÍTICO, pois isso gera exposição direta e passivos imediatos.
  2. AMOSTRAGEM COMPORTAMENTAL (BLOCO G): Contradições sobre pagamentos ou benefícios indicam fraude documental sistêmica. Eleve o risco para CRÍTICO se irregularidades forem relatadas por colaboradores.
  3. DIVERGÊNCIA DE EFETIVO (BLOCO B): Diferença positiva de pessoas em campo vs GD4 indica trabalho informal/irregular.
  
  ESTRUTURA DE RESPOSTA (JSON):
  - indiceGeral: Cálculo ponderado (0-100).
  - classificacao: REGULAR, ATENÇÃO ou CRÍTICA.
  - riscoJuridico: BAIXO, MÉDIO, ALTO ou CRÍTICO.
  - naoConformidades: Lista de desvios detectados.
  - impactoJuridico: Descrição técnica do passivo potencial (ex: multa do MTE, interdição, passivo trabalhista).
  - recomendacoes: Ações corretivas imediatas.
  - conclusaoExecutiva: Texto formal direcionado à diretoria da Unità Engenharia.
  
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
