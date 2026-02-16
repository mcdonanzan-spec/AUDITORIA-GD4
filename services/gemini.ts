
import { GoogleGenAI, Type } from "@google/genai";
import { AIAnalysisResult } from "../types";

export const generateAuditReport = async (auditData: any): Promise<AIAnalysisResult> => {
  // Inicialização imediata para garantir o uso da chave mais recente
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  // Prompt otimizado para velocidade e precisão técnica
  const prompt = `Você é o Motor de Inteligência de Risco da Unità Engenharia. 
  Analise os dados desta auditoria e gere uma matriz de risco financeiro e jurídico.
  
  CONTEXTO OPERACIONAL:
  Obra: ${auditData.obra}
  Efetivo Real em Campo: ${auditData.amostragem.total_efetivo} pessoas.
  Amostra Auditada: ${auditData.amostragem.entrevistados} pessoas.
  Divergência GD4: ${auditData.amostragem.divergencia} colaboradores.
  Quarteirização Irregular: ${auditData.amostragem.quarteirizacao_irregular ? 'SIM' : 'NÃO'}.

  DADOS BRUTOS:
  ${JSON.stringify(auditData.respostas_detalhadas)}

  LOGICA DE CÁLCULO (PROJETAR AMOSTRA PARA O TOTAL):
  - Trabalhador s/ Registro: R$ 60.000,00/pessoa (Multa Art. 47 CLT + Verbas).
  - Falha de Ponto/Acesso: R$ 5.000,00/incidência (NR-28).
  - Benefícios (VT/VR): R$ 3.000,00/colaborador com desvio (Projetar % de falha da amostra para o efetivo total).
  - Quarteirização: R$ 100.000,00 (Súmula 331 TST).

  SAÍDA OBRIGATÓRIA:
  Retorne um JSON seguindo exatamente a estrutura definida no schema. 
  No "detalhamentoCalculo", explique a matemática (Ex: "2 colaboradores x R$ 60.000") e cite a base legal (CLT, NR, Súmula).`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview', // Upgrade para tarefas complexas de lógica e matemática
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

    const text = response.text;
    if (!text) throw new Error("Resposta vazia da IA");

    // Limpeza de possíveis artefatos de texto fora do JSON
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const cleanedJson = jsonMatch ? jsonMatch[0] : text;
    
    return JSON.parse(cleanedJson) as AIAnalysisResult;
  } catch (error) {
    console.error("Erro crítico na análise IA:", error);
    // Fallback amigável em caso de timeout ou erro de rede
    throw new Error("A IA demorou mais do que o esperado para processar os cálculos jurídicos. Por favor, tente novamente.");
  }
};
