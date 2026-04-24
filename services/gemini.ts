
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
    // Modelos disponíveis no Groq (2025) - em ordem de qualidade/disponibilidade
    const groqModels = [
      "llama-3.3-70b-versatile",
      "llama-3.1-70b-versatile",
      "llama3-70b-8192",
      "mixtral-8x7b-32768",
      "llama-3.1-8b-instant",
    ];

    let lastError = "";
    for (const model of groqModels) {
      try {
        const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model,
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
          if (res.status === 429 || lower.includes("quota") || lower.includes("rate_limit") || lower.includes("rate limit")) {
            throw new Error("QUOTA");
          }
          // Modelo não encontrado → tenta próximo
          if (res.status === 404 || lower.includes("does not exist") || lower.includes("decommissioned")) {
            console.warn(`[Groq] Modelo ${model} indisponível, tentando próximo...`);
            lastError = `${model}: indisponível`;
            continue;
          }
          throw new Error(msg);
        }

        const text = json.choices?.[0]?.message?.content;
        if (!text) { lastError = `${model}: resposta vazia`; continue; }

        console.log(`[Groq] ✅ Sucesso com modelo: ${model}`);
        return text;

      } catch (err: any) {
        if (err.message === "QUOTA") throw err; // propaga para o pool externo
        lastError = err.message;
        continue;
      }
    }
    throw new Error(lastError || "Todos os modelos Groq falharam");
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

  const prompt = `🎯 PROMPT DE CALIBRAÇÃO — Auditoria Trabalhista e Entrevistas IN LOCO (Amostragem)
Você é um auditor fiscal especialista em conformidade trabalhista e segurança do trabalho na construção civil.
Sua função é gerar relatórios com memória de cálculo juridicamente fundamentada, citando bases legais reais, itens de normas existentes e valores de multas conforme a Portaria MTE nº 1.131/2025 e normas atualizadas. NUNCA invente itens ou valores.

OBRA AUDITADA: ${auditData.obra}
TOTAL DE TRABALHADORES (EFETIVO DA OBRA): ${auditData.amostragem?.total_efetivo || 'desconhecido'}

======= INFRAÇÕES E VESTÍGIOS ENCONTRADOS EM CAMPO =======
${falhas}

======= DEPOIMENTOS DAS ENTREVISTAS IN LOCO (Amostragem equivalente a 10% do efetivo) =======
${divergencias}
(Atenção: como as entrevistas são uma amostragem de 10%, cada falha encontrada aqui DEVE ser multiplicada por 10 para estimar o passivo do efetivo total da obra).

======= REGRAS OBRIGATÓRIAS DE CÁLCULO E FUNDAMENTAÇÃO =======
1. HIERARQUIA DE EVIDÊNCIAS: Entrevistas IN LOCO têm PESO MÁXIMO (confissão de irregularidade). Se um trabalhador disse "não" a direitos, não minimize. Projete a falha para o efetivo correspondente.
2. BASE LEGAL - Verificação Rígida:
   - VT NÃO PAGO/ATRASADO: Lei 7.418/85 + Dec. 95.247/87. Multa: R$ 176,03 por trabalhador. Risco: Restituição + Multa art. 467 CLT + Dano Moral.
   - DEPÓSITO ≠ HOLERITE (Diferença Salarial): CLT Art. 458 e Art. 129. Multa: R$ 3.101,73 por empregado (Anexo I). Risco: Reflexos FGTS, 13º, Férias + Art. 467.
   - ALOJAMENTO/REFEITÓRIO: NR-18 (18.5) + NR-24 + CLT Art. 458. Multa: Anexo IV (R$ 693,11 a R$ 6.935,56). Risco: Dano Moral por insalubridade.
   - SEM TREINAMENTO: NR-18 (18.31) + CLT Art. 154. Multa: Anexo IV (R$ 693,11 a R$ 6.935,56).
   - UNIFORME INADEQUADO/DIVERGENTE: CLT Art. 2 + Súmula 331 TST (se constatar Pejotização/Ocultação). Multa: R$ 3.101,73 por empregado não registrado (Anexo I). Risco: Vínculo + Verbas rescisórias + FGTS.
   - NR-18 / GENERALIDADES: A norma possui os itens 18.1 a 18.35. APLIQUE APENAS ITENS EXISTENTES. NÃO USE 18.2.2, 18.4.1. NÃO use a Súmula 331 para erro de ponto e a CLT Art. 74 se aplica a ponto para >20 funcionários, não aplique pra Controle de Acesso/Catraca.
3. CÁLCULO DO PASSIVO: 
   - No 'detalhamentoCalculo', separe CADA UMA das respostas negativas (se houver divergências). Multiplique o passivo da amostragem (entrevista) pelo fator x10 (projetando para o total da obra).
   - Discrimine o valor Administrativo MTE (conforme Portaria 1.131/2025) do valor Judicial/Trabalhista (Risco/Reclamatórias).
4. CATEGORIZAÇÃO: 
   - CRÍTICO para VT, Holerite falso, Alojamento inadequado, Pejotização, Falta de Treinamento. ALTO para Uniforme Inadequado.
   - As notas (indiceGeral) afundam para <= 50 se detectado Pejotização, Falta de VT ou Holerite falso.

RETORNE APENAS O JSON (SEM markdown, SEM texto fora das chaves) respeitando estritamente:
{"indiceGeral": <nota 0 a 100>,"classificacao":"REGULAR"|"ATENÇÃO"|"CRÍTICA","riscoJuridico":"BAIXO"|"MÉDIO"|"ALTO"|"CRÍTICO","exposicaoFinanceira": <soma consolidada (multas e passivo estim)>,"detalhamentoCalculo":[{"item":"<Nome da infração EXATA + Efetivo Projetado>","valor": <passivo adm e judicial somado>,"baseLegal":"<Base Legal Correta, sem alucinação>","logica":"<Fórmula do cálculo demonstrando valor unitário * efetivo prejudicado e os reflexos MTE e Judicial>"}],"naoConformidades":["<Listar infrações do checklist E das entrevistas in-loco>"],"impactoJuridico":"<análise da Ocultação de Vínculo, Alojamentos ou passivos diretos>","recomendacoes":["<ações de mitigação imediatas>"],"conclusaoExecutiva":"<parecer do perito>"}
`;

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
