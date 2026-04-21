
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
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY || 
                 import.meta.env.GEMINI_API_KEY ||
                 (window as any).process?.env?.VITE_GEMINI_API_KEY || 
                 (window as any).process?.env?.GEMINI_API_KEY;
  
  if (!apiKey || apiKey === 'undefined') {
    throw new Error("A chave da API do Gemini não foi encontrada.");
  }

  const itensComFalha = auditData.respostas_check
    ?.filter((r: any) => r.resposta === 'nao' || r.resposta === 'parcial')
    ?.map((r: any) => `- ITEM: ${r.pergunta}\n  STATUS: ${r.resposta.toUpperCase()}\n  OBSERVAÇÃO: ${r.obs}`)
    .join('\n') || "Nenhum desvio crítico encontrado nos itens de checklist.";

  const resumoEntrevistas = auditData.entrevistas
    ?.map((e: any) => `- ${e.funcao} (${e.empresa}): ${e.respostas.filter((r: any) => r.resposta === 'nao').length} divergências encontradas entre depoimento e documentação.`)
    .join('\n') || "Sem divergências críticas nas entrevistas amostrais.";

  const prompt = `ATUE COMO UM CONSULTOR JURÍDICO TRABALHISTA SÊNIOR E AUDITOR FORENSE.
  
  DADOS DO CANTEIRO:
  OBRA: ${auditData.obra}
  EFETIVO TOTAL EM CAMPO: ${auditData.amostragem?.total_efetivo}
  QUARTEIRIZAÇÃO IRREGULAR (SUB-SUBCONTRATAÇÃO): ${auditData.amostragem?.quarteirizacao_irregular ? 'IDENTIFICADA (ALTÍSSIMO RISCO)' : 'NÃO DETECTADA'}
  
  EVIDÊNCIAS DE CAMPO:
  ${itensComFalha}
  
  CONFLITOS EM ENTREVISTAS:
  ${resumoEntrevistas}
  
  MISSÃO: Realizar análise de RISCO JURÍDICO TRABALHISTA e PROJETAR PASSIVO FINANCEIRO OCULTO.
  
  DIRETRIZES JURÍDICAS OBRIGATÓRIAS:
  1. CLT E FRAUDE: Interprete falhas de controle (catracas, registros) como indícios de fraude à legislação tributária e trabalhista (Art. 9º da CLT).
  2. VÍNCULO E SUBORDINAÇÃO: Avalie o risco de reconhecimento de vínculo direto com a Unità (Art. 2º e 3º da CLT).
  3. RESPONSABILIDADE: Fundamente o risco na Súmula 331 do TST. Fale sobre Responsabilidade Subsidiária e Solidária.
  4. JURISPRUDÊNCIA: Cite acórdãos dos TRTs e decisões do TST sobre quarteirização ilícita e precarização do trabalho.
  5. CÁLCULO DE PASSIVO: Não calcule apenas MULTAS. Calcule o PASSIVO PROJETADO (FGTS, Multa 40%, 13º, Férias + 1/3, Reflexos em DSR e possíveis Indenizações por Danos Morais Coletivos).
  6. BASE LEGAL: Use CLT (Arts 9, 74, 467, 477, 818), Súmulas do TST e Normas Regulamentadoras apenas como suporte operacional.
  
  REGRAS DE CÁLCULO:
  - Considere o Efetivo Total (${auditData.amostragem?.total_efetivo}) na projeção do risco, pois uma falha sistêmica afeta a todos.
  
  FORMATO JSON OBRIGATÓRIO:
  {
    "indiceGeral": number (0-100),
    "classificacao": "REGULAR" | "ATENÇÃO" | "CRÍTICA",
    "riscoJuridico": "BAIXO" | "MÉDIO" | "ALTO" | "CRÍTICO",
    "exposicaoFinanceira": number,
    "detalhamentoCalculo": [
      {
        "item": "Ex: Risco de Vínculo Empregatício ou Fraude na Terceirização",
        "valor": number,
        "baseLegal": "Citar Artigo da CLT, Súmula do TST e Jurisprudência dos TRTs",
        "logica": "Explicação jurídica técnica (ex: Incidência da Súmula 331 TST combinada com Art. 9 CLT)"
      }
    ],
    "naoConformidades": [string],
    "impactoJuridico": "Análise profunda sobre o passivo judicial projetado na Justiça do Trabalho",
    "recomendacoes": ["Medidas preventivas urgentes"],
    "conclusaoExecutiva": "Resumo executivo de alto nível sobre a saúde jurídica da obra"
  }`;

  let models: string[] = ["gemini-1.5-pro", "gemini-1.5-flash", "gemini-2.0-flash"];
  
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
            generationConfig: { temperature: 0.1, maxOutputTokens: 3072 }
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
  throw new Error(`Erro na IA: ${lastError}`);
};
