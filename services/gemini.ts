
import { AIAnalysisResult } from "../types";

// v2.1.0 - Leitura de chaves à prova de falhas (process.env + import.meta.env)
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

// Indexador global para rodízio de chaves entre chamadas na mesma sessão
let currentKeyIndex = 0;

/**
 * Lê as chaves de API do ambiente, suportando múltiplos caminhos de leitura.
 * Compatível com Vite local (import.meta.env) e Vercel produção (process.env via define).
 */
const getApiKeys = (): string[] => {
  // Tenta todos os caminhos possíveis de onde a chave pode estar
  const rawKeys =
    (typeof process !== 'undefined' && process.env?.VITE_GEMINI_API_KEY) ||
    (typeof process !== 'undefined' && process.env?.GEMINI_API_KEY) ||
    (typeof process !== 'undefined' && process.env?.API_KEY) ||
    import.meta.env?.VITE_GEMINI_API_KEY ||
    import.meta.env?.GEMINI_API_KEY ||
    "";

  // Sanitiza e separa as chaves (suporta vírgula ou espaço como separador)
  const keys = String(rawKeys)
    .replace(/["'`]/g, "")
    .split(/[,\s]+/)
    .map((k) => k.trim())
    .filter((k) => k.length > 20);

  console.log(`[Gemini] ${keys.length} chave(s) de API encontrada(s).`);
  return keys;
};

export const generateAuditReport = async (auditData: any): Promise<AIAnalysisResult> => {
  const apiKeys = getApiKeys();

  if (apiKeys.length === 0) {
    throw new Error(
      "A chave da API do Gemini não foi encontrada. " +
      "Configure a variável VITE_GEMINI_API_KEY nas Configurações da Vercel."
    );
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
  1. MEMÓRIA DE CÁLCULO: Para cada desvio, calcule o risco real. Use valores de mercado (settlements).
  2. BASE LEGAL: Cite CLT, Artigos (9, 2, 3, 74, 467, 477), Súmulas do TST (331) e Jurisprudência dos TRTs.
  3. SENSIBILIDADE DO SCORE: Se houver "Quarteirização Irregular" ou "Falta de registro de ponto", o indiceGeral NÃO pode ser acima de 50%.
  4. INTERPRETAÇÃO: Analise o contexto das observações e extraia riscos jurídicos implícitos.
  
  ESTRUTURA DO JSON (OBRIGATÓRIO, responda APENAS com o JSON, sem texto antes ou depois):
  {
    "indiceGeral": number,
    "classificacao": "REGULAR" | "ATENÇÃO" | "CRÍTICA",
    "riscoJuridico": "BAIXO" | "MÉDIO" | "ALTO" | "CRÍTICO",
    "exposicaoFinanceira": number,
    "detalhamentoCalculo": [{ "item": string, "valor": number, "baseLegal": string, "logica": string }],
    "naoConformidades": [string],
    "impactoJuridico": string,
    "recomendacoes": [string],
    "conclusaoExecutiva": string
  }`;

  // Modelos ATUAIS (Google Gemini, 2025) - ordenados por velocidade e disponibilidade
  const modelEndpoints: Array<{ model: string; version: string }> = [
    { model: "gemini-2.0-flash",       version: "v1beta" },
    { model: "gemini-2.0-flash",       version: "v1"     },
    { model: "gemini-2.0-flash-lite",  version: "v1beta" },
    { model: "gemini-1.5-flash",       version: "v1beta" },
    { model: "gemini-1.5-flash",       version: "v1"     },
    { model: "gemini-2.0-flash-exp",   version: "v1beta" },
  ];

  let lastError = "";
  const maxKeyAttempts = apiKeys.length;

  for (let keyAttempt = 0; keyAttempt < maxKeyAttempts; keyAttempt++) {
    const apiKey = apiKeys[currentKeyIndex % apiKeys.length];
    let quotaRotated = false;

    for (const { model, version } of modelEndpoints) {
      try {
        console.log(`[Gemini] ${model} (${version}) | Chave #${currentKeyIndex % apiKeys.length}`);

        const url = `https://generativelanguage.googleapis.com/${version}/models/${model}:generateContent?key=${apiKey}`;
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.1, maxOutputTokens: 2000 }
          })
        });

        const data = await response.json();

        if (!response.ok) {
          const errorMsg = (data.error?.message || "").toLowerCase();

          // Cota esgotada → rotaciona para próxima chave
          if (response.status === 429 || errorMsg.includes("quota") || errorMsg.includes("rate limit")) {
            console.warn(`[Gemini] Cota atingida na chave #${currentKeyIndex % apiKeys.length}. Rotacionando...`);
            currentKeyIndex++;
            quotaRotated = true;
            break;
          }

          // Modelo não encontrado → tenta o próximo endpoint
          if (response.status === 404 || errorMsg.includes("not found") || errorMsg.includes("not supported")) {
            lastError = data.error?.message || `${model} (${version}) indisponível`;
            continue;
          }

          lastError = data.error?.message || response.statusText;
          continue;
        }

        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!text) {
          lastError = "IA retornou resposta vazia.";
          continue;
        }

        console.log(`[Gemini] ✅ Sucesso com ${model} (${version})`);
        return robustJsonParse(text);

      } catch (err: any) {
        lastError = err.message || "Erro de rede";
        continue;
      }
    }

    if (!quotaRotated) break;
  }

  if (lastError.toLowerCase().includes("quota") || lastError.includes("LIMITE_ATINGIDO")) {
    throw new Error("LIMITE_ATINGIDO");
  }
  throw new Error(lastError || "Todos os modelos de IA falharam. Tente novamente mais tarde.");
};
