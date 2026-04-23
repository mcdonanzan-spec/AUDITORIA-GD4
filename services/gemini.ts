
import { AIAnalysisResult } from "../types";

// v3.1.0 - Pool de Chaves com Backoff Inteligente
// Suporta N chaves via VITE_GEMINI_API_KEY separadas por vírgula

const robustJsonParse = (text: string): any => {
  const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  try {
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start === -1 || end === -1) throw new Error("JSON não encontrado na resposta da IA");
    return JSON.parse(cleaned.substring(start, end + 1));
  } catch (e) {
    console.error("[Gemini] Falha no parse:", e, "\nTexto recebido:", text.substring(0, 500));
    throw new Error("IA não retornou um JSON válido.");
  }
};

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Lê as chaves da variável de ambiente, suportando múltiplas separadas por vírgula
const getApiKeys = (): string[] => {
  let raw = "";
  try { raw = import.meta.env.VITE_GEMINI_API_KEY || ""; } catch (_) {}
  if (!raw) {
    try {
      raw = (process as any).env?.VITE_GEMINI_API_KEY ||
            (process as any).env?.GEMINI_API_KEY ||
            (process as any).env?.API_KEY || "";
    } catch (_) {}
  }
  const keys = String(raw)
    .replace(/["'`]/g, "")
    .split(/[,\s]+/)
    .map((k: string) => k.trim())
    .filter((k: string) => k.length > 10);
  console.log(`[Gemini] ${keys.length} chave(s) carregada(s).`);
  return keys;
};

// Endpoints em ordem de prioridade (modelos gratuitos e estáveis em 2025)
const ENDPOINTS = [
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent",
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent",
  "https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent",
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent",
];

export const generateAuditReport = async (auditData: any): Promise<AIAnalysisResult> => {
  const apiKeys = getApiKeys();

  if (apiKeys.length === 0) {
    throw new Error(
      "Chave da API não configurada. Acesse Vercel > Settings > Environment Variables " +
      "e configure VITE_GEMINI_API_KEY com suas chaves separadas por vírgula."
    );
  }

  // ----- MONTAGEM DO PROMPT -----
  const falhasCriticas = auditData.respostas_check
    ?.filter((r: any) => r.resposta === 'nao' || r.resposta === 'parcial')
    ?.map((r: any) => `• ${r.pergunta}: ${r.resposta.toUpperCase()} - Obs: ${r.obs || 'nenhuma'}`)
    .join('\n') || "Nenhuma falha crítica.";

  const divergencias = auditData.entrevistas
    ?.map((e: any) => {
      const falhas = e.respostas?.filter((r: any) => r.resposta === 'nao');
      if (!falhas?.length) return null;
      return `• ${e.funcao} (${e.empresa}): NÃO tem → ${falhas.map((f: any) => f.pergunta).join(', ')}`;
    })
    .filter(Boolean)
    .join('\n') || "Sem divergências.";

  const prompt = `Você é um auditor forense sênior especializado em Direito do Trabalho na construção civil brasileira.

OBRA: ${auditData.obra}
EFETIVO: ${auditData.amostragem?.total_efetivo || '?'} trabalhadores

FALHAS NO CHECKLIST:
${falhasCriticas}

DIVERGÊNCIAS NAS ENTREVISTAS:
${divergencias}

REGRAS:
- Calcule riscos financeiros reais baseados no efetivo e nas falhas específicas encontradas
- Cite CLT (arts. 9, 74, 467, 477), Súmulas TST 331, NR-18 quando aplicável
- Quarteirização irregular ou ausência de registro de ponto: indiceGeral OBRIGATORIAMENTE <= 50
- Seja forense e específico — use os dados reais da obra, não texto genérico

RETORNE SOMENTE O JSON (sem markdown, sem texto extra):
{"indiceGeral":85,"classificacao":"REGULAR","riscoJuridico":"MÉDIO","exposicaoFinanceira":150000,"detalhamentoCalculo":[{"item":"Exemplo","valor":50000,"baseLegal":"CLT Art. 74","logica":"Explicação"}],"naoConformidades":["item1"],"impactoJuridico":"análise","recomendacoes":["ação1"],"conclusaoExecutiva":"resumo"}`;

  // ----- LOOP PRINCIPAL: tenta cada chave × cada endpoint -----
  const errors: string[] = [];

  for (let ki = 0; ki < apiKeys.length; ki++) {
    const key = apiKeys[ki];
    let quotaHit = false;

    for (const endpoint of ENDPOINTS) {
      const modelName = endpoint.split('/models/')[1]?.split(':')[0] ?? "unknown";

      try {
        console.log(`[Gemini] ${modelName} | Chave ${ki + 1}/${apiKeys.length}`);

        const res = await fetch(`${endpoint}?key=${key}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.2,
              maxOutputTokens: 2048,
              responseMimeType: "application/json"
            }
          })
        });

        const json = await res.json();

        if (!res.ok) {
          const msg = json?.error?.message || res.statusText || `HTTP ${res.status}`;
          const lower = msg.toLowerCase();

          if (res.status === 429 || lower.includes("quota") || lower.includes("rate limit")) {
            errors.push(`Chave ${ki + 1}: cota esgotada`);
            quotaHit = true;
            // Aguarda 2s antes de tentar próxima chave
            await sleep(2000);
            break;
          }

          if (res.status === 404 || lower.includes("not found") || lower.includes("not supported")) {
            // Modelo não disponível neste endpoint — tenta o próximo silenciosamente
            continue;
          }

          if (res.status === 400 || res.status === 401 || res.status === 403 || lower.includes("api key") || lower.includes("invalid")) {
            errors.push(`Chave ${ki + 1}: inválida (HTTP ${res.status})`);
            break;
          }

          errors.push(`${modelName}: ${msg}`);
          continue;
        }

        const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!text) {
          errors.push(`${modelName}: resposta vazia`);
          continue;
        }

        console.log(`[Gemini] ✅ Sucesso: ${modelName} | Chave ${ki + 1}`);
        return robustJsonParse(text);

      } catch (netErr: any) {
        errors.push(`${modelName}: ${netErr.message}`);
        continue;
      }
    }

    if (!quotaHit) {
      // Se não estourou cota, significa que a chave é inválida ou todos os modelos falharam
      // Não tenta as próximas chaves com o mesmo erro
      break;
    }
  }

  // ----- Diagnóstico do erro final -----
  console.error("[Gemini] Falhou em todos os endpoints:", errors);

  const hasQuota = errors.some(e => e.includes("cota"));
  const hasInvalid = errors.some(e => e.includes("inválida"));

  if (hasQuota) throw new Error("LIMITE_ATINGIDO");
  if (hasInvalid) throw new Error(
    `Chave de API inválida. Gere novas chaves em aistudio.google.com e atualize a variável VITE_GEMINI_API_KEY na Vercel. [${errors.join(' | ')}]`
  );

  throw new Error(`Falha na conexão com a IA: ${errors.join(' | ')}`);
};
