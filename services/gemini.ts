import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
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
  const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY || import.meta.env.VITE_GEMINI_API_KEY;
  
  if (!apiKey) {
    console.error("GEMINI_API_KEY não encontrada no ambiente.");
    throw new Error("Configuração de IA incompleta. Verifique a chave de API nas configurações da Vercel.");
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  
  // Usamos o modelo mais estável e rápido disponível na v1
  const model = genAI.getGenerativeModel(
    { model: "gemini-1.5-flash" },
    { apiVersion: "v1" }
  );

  // Configuramos as opções de geração separadamente para maior clareza
  const generationConfig = {
    responseMimeType: "application/json",
    responseSchema: {
      type: SchemaType.OBJECT,
      properties: {
        indiceGeral: { type: SchemaType.NUMBER },
        classificacao: { type: SchemaType.STRING },
        riscoJuridico: { type: SchemaType.STRING },
        exposicaoFinanceira: { type: SchemaType.NUMBER },
        detalhamentoCalculo: {
          type: SchemaType.ARRAY,
          items: {
            type: SchemaType.OBJECT,
            properties: {
              item: { type: SchemaType.STRING },
              valor: { type: SchemaType.NUMBER },
              baseLegal: { type: SchemaType.STRING },
              logica: { type: SchemaType.STRING }
            },
            required: ["item", "valor", "baseLegal", "logica"]
          }
        },
        naoConformidades: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
        impactoJuridico: { type: SchemaType.STRING },
        recomendacoes: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
        conclusaoExecutiva: { type: SchemaType.STRING }
      },
      required: ["indiceGeral", "classificacao", "riscoJuridico", "exposicaoFinanceira", "detalhamentoCalculo", "naoConformidades", "impactoJuridico", "recomendacoes", "conclusaoExecutiva"]
    }
  };

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
  
  RETORNE APENAS O JSON ESTRUTURADO CONFORME O SCHEMA FORNECIDO.`;

  const executeWithRetry = async (attempt: number = 1): Promise<any> => {
    try {
      const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig
      });
      const response = await result.response;
      return response.text();
    } catch (error: any) {
      if (attempt < 3 && (error.status === 'UNAVAILABLE' || error.message?.includes('503') || error.message?.includes('429'))) {
        console.warn(`IA sob carga ou cota excedida. Tentativa ${attempt} de 3...`);
        await new Promise(resolve => setTimeout(resolve, 3000 * attempt));
        return executeWithRetry(attempt + 1);
      }
      throw error;
    }
  };

  try {
    const text = await executeWithRetry();
    console.log("Resposta recebida da IA.");

    try {
      // O SDK estável já pode retornar JSON puro se configurado, mas garantimos o parse
      const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(jsonStr);

      const somaItens = parsed.detalhamentoCalculo?.reduce((acc: number, curr: any) => acc + (curr.valor || 0), 0) || 0;
      if (somaItens !== parsed.exposicaoFinanceira && somaItens > 0) {
        parsed.exposicaoFinanceira = somaItens;
      }

      return parsed as AIAnalysisResult;
    } catch (parseErr) {
      console.error("Erro ao converter relatório para JSON:", parseErr);
      throw new Error("O formato do relatório gerado é inválido. Tente novamente.");
    }
  } catch (error: any) {
    console.error("Erro na comunicação com o Gemini:", error);
    throw error;
  }
};
