
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

======= REGRAS DE ANÁLISE DE RISCO EXECUTIVO E MATEMÁTICA FORENSE (OBRIGATÓRIAS) =======
Você DEVE processar CADA falha do Checklist e CADA resposta "não" das Entrevistas IN LOCO sem omitir NADA.
A matemática DEVE ser rigorosa. Nunca faça "valor x 10" e no resultado coloque um número aleatório. A SOMA de todos os itens deve bater perfeitamente com o total do relatório.

1. REGRA DE MULTIPLICAÇÃO (COMO APLICAR O FATOR DE INFRAÇÃO):
   - INFRAÇÃO DA OBRA (Catraca falha, Falta de Documentação PGR/PCMSO, CND vencida): Multiplique por 1 (INFRAÇÃO ÚNICA). A multa MTE máxima é R$ 6.935,56 para a obra inteira, não por trabalhador.
   - INFRAÇÃO POR EMPREGADO (Falta de VT, Diferença Salarial, Alojamento inadequado): Multiplique pela DIFERENÇA DE EFETIVO (Trabalhadores invisíveis no sistema vs campo) OU pelo número de entrevistados projetado para o tamanho da equipe.
   - RISCO DE PEJOTIZAÇÃO (Ponto Empreiteiros): Não calcule por efetivo total, e sim pelo risco estimado de vínculo focado nas terceiras.

2. MAPEAMENTO CORRETO DAS INFRAÇÕES:
   - Catraca/Acesso Falho: Infração da Obra (x1). Base é NR-18 Art. 7º + CLT 154-200. Multa = Anexo IV (R$ 6.935,56). Passivo = Indenização eventual.
   - Ponto de Empreiteiro (In Loco): "RISCO DE PEJOTIZAÇÃO". Multa Administrativa = R$ 0,00. Passivo Judicial = Vínculo e Rescisões TST.
   - Pendentes/Bloqueados atuando: Empregado não registrado (CLT Art. 47). Multa = R$ 3.101,73 x Número de bloqueados/diferença de efetivo. Passivo = Vínculo.
   - Documentação Vencida: Infração da Obra (x1). Se SST (PGR, PCMSO) = NR-01 + Anexo IV (Multa R$ 6.935,56). Se CND/CNDT = Multa Zero, mas gera Súmula 331 TST (Retenção de Pagamento).

3. ENTREVISTAS IN LOCO (DIREITOS INDIVIDUAIS - Multiplique corretamente):
   - Falta de VT/VR: Lei 7.418/85. Multa: R$ 176,03 × Quantidade de Trabalhadores Prejudicados (Amostra x 10 ou Diferença de Efetivo). Passivo Judicial: VT Retroativo + Multa Art. 467 CLT.
   - Depósito ≠ Holerite (Diferença Salarial): CLT Art. 458 e 129. Se abaixo do mínimo = R$ 3.101,73 × quantidade de prejudicados. Passivo: Diferenças Salariais + Dano Moral.
   - Alojamento Inadequado: Direito individual de uso. NR-18 18.5 + NR-24. Multa Admin: Anexo IV (R$ 6.935,56 × usuários do alojamento). Passivo: Dano Moral por pessoa.

4. ESTRUTURA DO JSON E CHECKLIST DE VALIDAÇÃO MATEMÁTICA:
   - Para cada item, o array 'detalhamentoCalculo' DEVE mostrar: (a) Multa MTE e (b) Passivo Judicial Estimado (baseado no TST).
   - O campo 'valor' de cada item é a soma matemática real de (a + b).
   - O campo 'exposicaoFinanceira' tem que ser EXATAMENTE A SOMA dos valores gerados no array.
   - Você NÃO pode inventar totais no cabeçalho diferentes do detalhamento.
   - 'conclusaoExecutiva': Foque direto no Risco Subsidiário (Súmula 331) reportando onde a Margem Financeira da obra será engolida por ações trabalhistas geradas por terceirizadas ou controle cego.

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
