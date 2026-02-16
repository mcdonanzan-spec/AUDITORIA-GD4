
import { GoogleGenAI, Type } from "@google/genai";
import { AIAnalysisResult } from "../types";

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

  const prompt = `ATUE COMO UM CONSULTOR SÊNIOR DE RISCO JURÍDICO E COMPLIANCE DA UNITA ENGENHARIA.
  DADOS DA AUDITORIA: ${JSON.stringify(cleanPayload)}
  
  SUA MISSÃO É GERAR UM RELATÓRIO DE GOVERNANÇA TÉCNICO E ARITMETICAMENTE PRECISO.
  
  DIRETRIZES FINANCEIRAS (CRÍTICO):
  1. Calcule a Exposição Financeira Total (Passivo Estimado).
  2. VOCÊ DEVE LISTAR O DETALHAMENTO DE PELO MENOS 4 ITENS QUE COMPÕEM ESSE VALOR.
  3. A SOMA DOS VALORES ('valor') DENTRO DE 'detalhamentoCalculo' DEVE SER EXATAMENTE IGUAL AO 'exposicaoFinanceira'.
  4. CATEGORIAS PARA O DETALHAMENTO:
     - Falta de Registro / CLT Art. 47 (Calcular sobre divergência de efetivo).
     - Adicionais de Risco (Insalubridade/Periculosidade) não identificados.
     - Multas NRs (NR-18, NR-35, NR-06) baseadas nos desvios de campo.
     - Passivo de Benefícios (VT/VR) e Reflexos (FGTS/INSS).
  
  RETORNE APENAS JSON NO SEGUINTE FORMATO:
  - indiceGeral: number (0-100)
  - classificacao: REGULAR, ATENÇÃO ou CRÍTICA
  - riscoJuridico: BAIXO, MÉDIO, ALTO ou CRÍTICO
  - exposicaoFinanceira: number (TOTAL GERAL)
  - detalhamentoCalculo: array de {item: string, valor: number, baseLegal: string, logica: string}
  - naoConformidades: array de strings
  - impactoJuridico: string
  - recomendacoes: array de strings
  - conclusaoExecutiva: string (tom executivo, curto e direto)`;

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
                },
                required: ["item", "valor", "baseLegal", "logica"]
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
    
    const parsed = JSON.parse(text);

    // Validação extra: Se a IA falhou na aritmética, forçamos o total a ser a soma dos itens
    const somaItens = parsed.detalhamentoCalculo.reduce((acc: number, curr: any) => acc + curr.valor, 0);
    if (somaItens !== parsed.exposicaoFinanceira && somaItens > 0) {
      parsed.exposicaoFinanceira = somaItens;
    }

    return parsed as AIAnalysisResult;
  } catch (error) {
    console.error("Erro Crítico na IA:", error);
    return {
      indiceGeral: 0,
      classificacao: "ERRO TÉCNICO",
      riscoJuridico: "INDETERMINADO",
      exposicaoFinanceira: 0,
      detalhamentoCalculo: [
        { item: "Erro de Processamento", valor: 0, baseLegal: "-", logica: "Ocorreu um erro ao calcular o passivo." }
      ],
      naoConformidades: ["Erro na análise quantitativa."],
      impactoJuridico: "Análise interrompida.",
      recomendacoes: ["Recalcule a auditoria."],
      conclusaoExecutiva: "Sistema temporariamente indisponível para análise financeira."
    };
  }
};
