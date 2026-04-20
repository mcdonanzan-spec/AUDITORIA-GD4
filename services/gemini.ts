
import { GoogleGenAI, Type, ThinkingLevel } from "@google/genai";
import { AIAnalysisResult } from "../types";

const sanitizeDataForAI = (data: any) => {
  // Evita o deep clone via JSON.stringify que processaria todas as fotos em base64
  return {
    ...data,
    respostas_check: data.respostas_check?.map((r: any) => {
      const { fotos, ...rest } = r;
      return {
        ...rest,
        quantidade_evidencias: fotos ? fotos.length : 0
      };
    })
  };
};

export const generateAuditReport = async (auditData: any): Promise<AIAnalysisResult> => {
  const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
  
  if (!apiKey) {
    console.error("GEMINI_API_KEY não encontrada no ambiente.");
    throw new Error("Configuração de IA incompleta. Verifique a chave de API.");
  }

  const ai = new GoogleGenAI({ apiKey });
  
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

  const executeWithRetry = async (attempt: number = 1): Promise<any> => {
    try {
      // Timeout de 60 segundos para evitar que a UI fique travada indefinidamente
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error("Timeout na análise da IA")), 60000)
      );

      const aiPromise = ai.models.generateContent({
        model: 'gemini-1.5-flash',
        contents: prompt,
        config: {
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
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

      return await Promise.race([aiPromise, timeoutPromise]);
    } catch (error: any) {
      // Se for erro 503 (UNAVAILABLE) e tivermos tentativas, esperamos um pouco e tentamos de novo
      if (attempt < 3 && (error.status === 'UNAVAILABLE' || error.message?.includes('503') || error.message?.includes('high demand'))) {
        console.warn(`IA sobrecarregada (503). Tentativa ${attempt} de 3. Aguardando...`);
        await new Promise(resolve => setTimeout(resolve, 2000 * attempt)); // Exponential backoff
        return executeWithRetry(attempt + 1);
      }
      throw error;
    }
  };

  try {
    const response = await executeWithRetry();
    
    console.log("Resposta bruta da IA:", response);

    const text = response.text?.trim();
    if (!text) {
      console.error("Resposta da IA está vazia ou indefinida.");
      throw new Error("A IA não retornou dados. Tente novamente.");
    }
    
    try {
      // Remove possíveis blocos de código se a IA os incluiu por engano
      const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(jsonStr);

      // Validação extra: Se a IA falhou na aritmética, forçamos o total a ser a soma dos itens
      const somaItens = parsed.detalhamentoCalculo?.reduce((acc: number, curr: any) => acc + (curr.valor || 0), 0) || 0;
      if (somaItens !== parsed.exposicaoFinanceira && somaItens > 0) {
        parsed.exposicaoFinanceira = somaItens;
      }

      return parsed as AIAnalysisResult;
    } catch (parseErr) {
      console.error("Erro ao processar JSON da IA:", parseErr, "Texto recebido:", text);
      throw new Error("Falha ao processar o relatório gerado. Tente novamente.");
    }
  } catch (error: any) {
    console.error("Erro Crítico na IA:", error);
    throw error;
  }
};
