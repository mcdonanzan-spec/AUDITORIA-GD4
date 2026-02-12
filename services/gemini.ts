
import { GoogleGenAI, Type } from "@google/genai";
import { AIAnalysisResult } from "../types";

export const generateAuditReport = async (auditData: any): Promise<AIAnalysisResult> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const prompt = `Você é um sistema de governança e compliance de alto nível da Unità Engenharia S.A., especializado em gestão de terceiros e mão de obra própria (GRD).
  Sua função é analisar uma auditoria de campo e determinar o risco jurídico e operacional.
  
  Dados da Auditoria:
  ${JSON.stringify(auditData, null, 2)}
  
  CRITÉRIOS DE ANÁLISE MANDATÓRIOS (REGRAS DE NEGÓCIO):
  1. ITENS "N/A" (NÃO SE APLICA): Se uma pergunta foi marcada como "n_a", ela deve ser totalmente ignorada na análise de risco. Não penalize a obra por atividades que não existem no local (ex: se não houver quarteirização).
  2. GOVERNANÇA GRD (BLOCO F) - FASE DE TRANSIÇÃO:
     - O Item 01 (Termo de Qualificação) é um processo novo na Unità. Se houver respostas "Parcial" ou "Nao", verifique se há uma justificativa de implantação. Não classifique como "Risco Crítico" imediatamente se for claramente um caso de transição. Em vez disso, sugira um "Cronograma de Saneamento Documental".
     - Item 02 (Próprios): Continua sendo CRÍTICO. A documentação interna deve estar em dia.
  3. AMOSTRAGEM COMPORTAMENTAL (BLOCO G): Contradições sobre pagamentos ou benefícios indicam fraude documental sistêmica.
  4. DIVERGÊNCIA DE EFETIVO (BLOCO B): Diferença positiva de pessoas em campo vs GD4 indica trabalho informal.
  
  ESTRUTURA DE RESPOSTA (JSON):
  - indiceGeral: Cálculo ponderado (0-100) ignorando os itens N/A.
  - classificacao: REGULAR, ATENÇÃO ou CRÍTICA.
  - riscoJuridico: BAIXO, MÉDIO, ALTO ou CRÍTICO.
  - naoConformidades: Lista de desvios detectados (ignore os N/A).
  - impactoJuridico: Descrição técnica do passivo potencial.
  - recomendacoes: Ações corretivas imediatas e cronogramas de transição para processos novos.
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
