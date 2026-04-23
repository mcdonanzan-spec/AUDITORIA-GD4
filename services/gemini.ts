
import { AIAnalysisResult } from "../types";

// v4.0.0 - Multi-Provider: Gemini (Google) + Groq (Llama) com fallback automático

const robustJsonParse = (text: string): any => {
  const cleaned = text
    .replace(/```json\n?/g, '')
    .replace(/```\n?/g, '')
    .trim();
  try {
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start === -1 || end === -1) throw new Error("JSON não encontrado");
    return JSON.parse(cleaned.substring(start, end + 1));
  } catch (e) {
    console.error("[AI] Falha no parse JSON:", e, "\nTexto:", text.substring(0, 500));
    throw new Error("IA não retornou um JSON válido.");
  }
};

// ── Leitura de variáveis de ambiente ──────────────────────────────────────────
const readEnv = (key: string): string => {
  try { const v = (import.meta.env as any)[key]; if (v) return v; } catch (_) {}
  try { const v = (process as any).env?.[key]; if (v) return v; } catch (_) {}
  return "";
};

const parseKeys = (raw: string): string[] =>
  String(raw).replace(/["'`]/g, "").split(/[,\s]+/).map(k => k.trim()).filter(k => k.length > 10);

const getGeminiKeys = (): string[] => parseKeys(readEnv("VITE_GEMINI_API_KEY") || readEnv("GEMINI_API_KEY"));
const getGroqKeys   = (): string[] => parseKeys(readEnv("VITE_GROQ_API_KEY")   || readEnv("GROQ_API_KEY"));

// ── Providers ─────────────────────────────────────────────────────────────────

interface Provider {
  name: string;
  call: (prompt: string) => Promise<string>; // retorna o texto da resposta
}

const buildGeminiProvider = (apiKey: string, keyIdx: number, total: number): Provider => ({
  name: `Gemini [chave ${keyIdx + 1}/${total}]`,
  call: async (prompt: string) => {
    const endpoints = [
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent",
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent",
      "https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent",
    ];

    let lastMsg = "";
    for (const endpoint of endpoints) {
      const model = endpoint.split('/models/')[1]?.split(':')[0] ?? "?";
      const res = await fetch(`${endpoint}?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.2, maxOutputTokens: 2048, responseMimeType: "application/json" }
        })
      });
      const json = await res.json();
      if (!res.ok) {
        const msg = json?.error?.message || `HTTP ${res.status}`;
        const lower = msg.toLowerCase();
        if (res.status === 429 || lower.includes("quota") || lower.includes("rate limit")) {
          throw new Error("QUOTA");
        }
        if (res.status === 404 || lower.includes("not found") || lower.includes("not supported")) {
          lastMsg = `${model}: não disponível`;
          continue;
        }
        throw new Error(msg);
      }
      const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) return text;
      lastMsg = `${model}: resposta vazia`;
    }
    throw new Error(lastMsg || "Todos os endpoints Gemini falharam");
  }
});

const buildGroqProvider = (apiKey: string, keyIdx: number, total: number): Provider => ({
  name: `Groq/Llama [chave ${keyIdx + 1}/${total}]`,
  call: async (prompt: string) => {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "llama-3.1-70b-versatile",
        messages: [
          {
            role: "system",
            content: "Você é um auditor forense especialista em Direito do Trabalho na construção civil brasileira. Responda APENAS com JSON válido, sem markdown, sem texto antes ou depois."
          },
          { role: "user", content: prompt }
        ],
        temperature: 0.2,
        max_tokens: 2048,
        response_format: { type: "json_object" }
      })
    });
    const json = await res.json();
    if (!res.ok) {
      const msg = json?.error?.message || `HTTP ${res.status}`;
      const lower = msg.toLowerCase();
      if (res.status === 429 || lower.includes("quota") || lower.includes("rate limit") || lower.includes("rate_limit")) {
        throw new Error("QUOTA");
      }
      throw new Error(msg);
    }
    const text = json.choices?.[0]?.message?.content;
    if (!text) throw new Error("Groq: resposta vazia");
    return text;
  }
});

// ── Exportação principal ───────────────────────────────────────────────────────

export const generateAuditReport = async (auditData: any): Promise<AIAnalysisResult> => {

  // ── Construção do prompt ──
  const falhas = auditData.respostas_check
    ?.filter((r: any) => r.resposta === 'nao' || r.resposta === 'parcial')
    ?.map((r: any) => `• ${r.pergunta}: ${r.resposta.toUpperCase()} — Obs: ${r.obs || 'nenhuma'}`)
    .join('\n') || "Nenhuma falha crítica.";

  const divergencias = auditData.entrevistas
    ?.map((e: any) => {
      const f = e.respostas?.filter((r: any) => r.resposta === 'nao');
      if (!f?.length) return null;
      return `• ${e.funcao} (${e.empresa}): NÃO tem → ${f.map((x: any) => x.pergunta).join(', ')}`;
    })
    .filter(Boolean).join('\n') || "Sem divergências.";

  const prompt = `OBRA: ${auditData.obra}
EFETIVO: ${auditData.amostragem?.total_efetivo || '?'} trabalhadores

FALHAS NO CHECKLIST:
${falhas}

DIVERGÊNCIAS NAS ENTREVISTAS:
${divergencias}

REGRAS OBRIGATÓRIAS:
- Calcule riscos financeiros reais baseados no efetivo DESTA obra e nas falhas específicas encontradas
- Cite CLT (arts. 9, 74, 467, 477), Súmulas TST 331, NR-18 quando aplicável
- Quarteirização irregular ou ausência registro de ponto: indiceGeral DEVE SER <= 50
- Use dados reais da obra — PROIBIDO texto genérico

RETORNE APENAS O JSON:
{"indiceGeral":0,"classificacao":"REGULAR","riscoJuridico":"BAIXO","exposicaoFinanceira":0,"detalhamentoCalculo":[{"item":"","valor":0,"baseLegal":"","logica":""}],"naoConformidades":[""],"impactoJuridico":"","recomendacoes":[""],"conclusaoExecutiva":""}`;

  // ── Construção do pool de providers ──
  const geminiKeys = getGeminiKeys();
  const groqKeys   = getGroqKeys();

  const providers: Provider[] = [
    ...geminiKeys.map((k, i) => buildGeminiProvider(k, i, geminiKeys.length)),
    ...groqKeys.map((k, i) => buildGroqProvider(k, i, groqKeys.length)),
  ];

  if (providers.length === 0) {
    throw new Error(
      "Nenhuma chave de API configurada. Configure VITE_GEMINI_API_KEY ou VITE_GROQ_API_KEY na Vercel."
    );
  }

  const errors: string[] = [];

  for (const provider of providers) {
    try {
      console.log(`[AI] Tentando: ${provider.name}`);
      const text = await provider.call(prompt);
      const result = robustJsonParse(text);
      console.log(`[AI] ✅ Sucesso: ${provider.name}`);
      return result;
    } catch (err: any) {
      const msg = err.message || "erro desconhecido";
      if (msg === "QUOTA") {
        console.warn(`[AI] Cota esgotada: ${provider.name}. Tentando próximo...`);
        errors.push(`${provider.name}: cota esgotada`);
        continue; // tenta próximo provider
      }
      console.warn(`[AI] Falhou: ${provider.name} — ${msg}`);
      errors.push(`${provider.name}: ${msg}`);
      continue;
    }
  }

  // Todos falharam — define mensagem de erro adequada
  const allQuota = errors.every(e => e.includes("cota esgotada"));
  console.error("[AI] Todos os providers falharam:", errors);

  if (allQuota) throw new Error("LIMITE_ATINGIDO");
  throw new Error(`Falha na análise de IA: ${errors.join(' | ')}`);
};
