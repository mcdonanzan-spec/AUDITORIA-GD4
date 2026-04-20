
import { AIAnalysisResult } from "../types";

const robustJsonParse = (text: string): any => {
  try {
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start === -1 || end === -1) throw new Error("JSON não encontrado");
    return JSON.parse(text.substring(start, end + 1));
  } catch (e) {
    console.error("Erro no parser:", e, "Texto:", text);
    throw new Error("IA não retornou dados válidos.");
  }
};

export const generateAuditReport = async (auditData: any): Promise<AIAnalysisResult> => {
  // Diagnóstico e Captura de Chave de API (Tolerância Máxima)
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY || 
                 import.meta.env.GEMINI_API_KEY ||
                 (window as any).process?.env?.VITE_GEMINI_API_KEY || 
                 (window as any).process?.env?.GEMINI_API_KEY;
  
  if (!apiKey || apiKey === 'undefined') {
    throw new Error("A chave da API do Gemini não foi encontrada. Certifique-se de que a variável de ambiente VITE_GEMINI_API_KEY está configurada na Vercel.");
  }

  // PREPARAÇÃO DE DADOS RICOS (Foco em Não Conformidades)
  const itensComFalha = auditData.respostas_check
    ?.filter((r: any) => r.resposta === 'nao' || r.resposta === 'parcial')
    ?.map((r: any) => `- ITEM: ${r.pergunta}\n  STATUS: ${r.resposta.toUpperCase()}\n  OBSERVAÇÃO: ${r.obs}`)
    .join('\n') || "Nenhum desvio crítico identificado.";

  const resumoEntrevistas = auditData.entrevistas
    ?.map((e: any) => `- ${e.funcao} (${e.empresa}): ${e.respostas.filter((r: any) => r.resposta === 'nao').length} divergências`)
    .join('\n') || "Nenhuma divergência nas entrevistas.";

  const prompt = `ATUE COMO UM AUDITOR TÉCNICO E JURÍDICO DA UNITA ENGENHARIA.
  
  DADOS REAIS DA AUDITORIA HOJE:
  OBRA: ${auditData.obra}
  EFETIVO TOTAL: ${auditData.amostragem?.total_efetivo}
  QUARTEIRIZAÇÃO IRREGULAR IDENTIFICADA? ${auditData.amostragem?.quarteirizacao_irregular ? 'SIM' : 'NÃO'}
  
  DESVIOS ENCONTRADOS (ITENS NÃO CONFORMES):
  ${itensComFalha}
  
  RESUMO DAS ENTREVISTAS:
  ${resumoEntrevistas}
  
  MISSÃO: Interprete os DESVIOS acima e gere uma MEMÓRIA DE CÁLCULO DE RISCO FINANCEIRO.
  
  REGRAS DE OURO:
  1. Para cada DESVIO encontrado, procure a multa correspondente na CLT ou nas NRs (ex: NR-18, NR-35).
  2. Calcule o valor da multa considerando o número de funcionários expostos e a gravidade (Súmula 331 TST / Normas do MTE).
  3. Seja específico: cite o Artigo, a NR e a Jurisprudência do TRT que fundamenta o risco.
  4. NÃO gere textos genéricos. Se o usuário marcou "Não Conforme" em um item de EPI, fale especificamente de NR-06.
  
  FORMATO JSON OBRIGATÓRIO:
  {
    "indiceGeral": number (0-100),
    "classificacao": "REGULAR" | "ATENÇÃO" | "CRÍTICA",
    "riscoJuridico": "BAIXO" | "MÉDIO" | "ALTO" | "CRÍTICO",
    "exposicaoFinanceira": number,
    "detalhamentoCalculo": [
      {
        "item": "Título do Risco",
        "valor": number,
        "baseLegal": "Artigo/NR/Súmula específica",
        "logica": "Por que este valor? (ex: Multa de R$ X por funcionário conforme NR-Y)"
      }
    ],
    "naoConformidades": [string],
    "impactoJuridico": "Análise técnica fundamentada",
    "recomendacoes": [string],
    "conclusaoExecutiva": "Resumo estratégico"
  }`;

  // Estratégia de Auto-Descoberta de Modelos
  let models: string[] = ["gemini-1.5-flash", "gemini-1.5-pro"];
  
  try {
    const listResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    if (listResponse.ok) {
      const listData = await listResponse.json();
      const availableModels = listData.models
        ?.filter((m: any) => m.supportedGenerationMethods.includes("generateContent"))
        ?.map((m: any) => m.name.split('/').pop()) || [];
      if (availableModels.length > 0) models = [...new Set([...availableModels, ...models])];
    }
  } catch (e) {}

  let lastError = "";
  for (const model of models) {
    try {
      for (const apiVer of ['v1beta', 'v1']) {
        const response = await fetch(`https://generativelanguage.googleapis.com/${apiVer}/models/${model}:generateContent?key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.1, maxOutputTokens: 2048 }
          })
        });

        const data = await response.json();
        if (!response.ok) {
          lastError = data.error?.message || response.statusText;
          continue;
        }

        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!text) continue;

        return robustJsonParse(text);
      }
    } catch (err: any) {
      lastError = err.message;
      continue;
    }
  }

  throw new Error(`Falha na IA: ${lastError}`);
};
