
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

  // Captura detalhada de falhas para a IA
  const falhasCriticas = auditData.respostas_check
    ?.filter((r: any) => r.resposta === 'nao' || r.resposta === 'parcial')
    ?.map((r: any) => `QUESTÃO: ${r.pergunta}\nRESPOSTA: ${r.resposta.toUpperCase()}\nOBSERVAÇÃO DO AUDITOR: ${r.obs}`)
    .join('\n\n') || "Nenhum desvio crítico encontrado.";

  const divergenciasEntrevistas = auditData.entrevistas
    ?.map((e: any) => {
      const erros = e.respostas.filter((r: any) => r.resposta === 'nao');
      if (erros.length === 0) return null;
      return `COLABORADOR (${e.funcao} - ${e.empresa}): Afirmou NÃO receber ou NÃO ter ${erros.map((er: any) => er.pergunta).join(', ')}`;
    })
    .filter(Boolean)
    .join('\n') || "Nenhuma divergência grave nas entrevistas.";

  const prompt = `VOCÊ É UM AUDITOR FORENSE ESPECIALISTA EM DIREITO DO TRABALHO NA CONSTRUÇÃO CIVIL.
  
  DADOS REAIS DA OBRA ${auditData.obra}:
  - EFETIVO TOTAL: ${auditData.amostragem?.total_efetivo} pessoas.
  - FALHAS DETECTADAS NO CHECKLIST:
  ${falhasCriticas}
  
  - DIVERGÊNCIAS NAS ENTREVISTAS:
  ${divergenciasEntrevistas}
  
  SUA MISSÃO: Realizar uma análise técnica individualizada de cada falha acima. NÃO USE TEXTOS GENÉRICOS OU EXEMPLOS.
  
  REGRAS DE OURO:
  1. MEMÓRIA DE CÁLCULO: Para cada desvio, calcule o risco real. Ex: Falta de registro de ponto para 100 pessoas não custa R$ 50,00. Custa milhares (R$ 50.000+). Use valores de mercado (settlements).
  2. BASE LEGAL: Cite CLT, Artigos (9, 2, 3, 74, 467, 477), Súmulas do TST (331) e Jurisprudência dos TRTs.
  3. SENSIBILIDADE DO SCORE: Se houver "Quarteirização Irregular" ou "Falta de registro de ponto", o indiceGeral NÃO pode ser acima de 50%.
  4. INTERPRETAÇÃO: Se o auditor disse "porteiro libera com a facial", interprete como falha de controle de jornada e segurança orgânica, aumentando o risco de vínculo.
  
  ESTRUTURA DO JSON (OBRIGATÓRIO):
  {
    "indiceGeral": number (deve refletir a realidade dos erros),
    "classificacao": "REGULAR" | "ATENÇÃO" | "CRÍTICA",
    "riscoJuridico": "BAIXO" | "MÉDIO" | "ALTO" | "CRÍTICO",
    "exposicaoFinanceira": number (TOTAL DO RISTO PROJETADO),
    "detalhamentoCalculo": [
      {
        "item": "NOME DO RISCO ESPECÍFICO (Baseado na falha real)",
        "valor": number (VALOR REAL EM REAIS),
        "baseLegal": "ARTIGO / LEI / SÚMULA / ACÓRDÃO",
        "logica": "POR QUE este valor? Explique a conta jurídica (ex: reflexos de horas extras sobre o efetivo total)"
      }
    ],
    "naoConformidades": [string],
    "impactoJuridico": "Análise técnica fundamentada nos fatos encontrados de falha na portaria e entrevistas",
    "recomendacoes": [string],
    "conclusaoExecutiva": "Análise estratégica para a diretoria sobre a segurança jurídica da unidade"
  }`;

  let models: string[] = ["gemini-1.5-pro", "gemini-1.5-flash", "gemini-2.0-flash"];

  let lastError = "";
  for (const model of models) {
    try {
      for (const apiVer of ['v1beta', 'v1']) {
        const response = await fetch(`https://generativelanguage.googleapis.com/${apiVer}/models/${model}:generateContent?key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.1, maxOutputTokens: 3000 }
          })
        });

        const data = await response.json();
        if (!response.ok) {
          const errorMsg = data.error?.message || "";
          if (errorMsg.toLowerCase().includes("quota") || response.status === 429) {
            lastError = "LIMITE_ATINGIDO"; // Flag para o frontend
            continue;
          }
          lastError = errorMsg || response.statusText;
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
  throw new Error(lastError);
};
