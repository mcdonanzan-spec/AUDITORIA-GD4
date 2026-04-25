
import { AIAnalysisResult } from "../types";

// v5.0.0 — Prompt Profissional Definitivo: Auditor Forense Sênior de Riscos Trabalhistas

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

// ── Leitura de variáveis de ambiente ─────────────────────────────────────────
const readEnv = (key: string): string => {
  try { const v = (import.meta.env as any)[key]; if (v) return v; } catch (_) {}
  try { const v = (process as any).env?.[key]; if (v) return v; } catch (_) {}
  return "";
};

const parseKeys = (raw: string): string[] =>
  String(raw).replace(/[\"'`]/g, "").split(/[,\s]+/).map(k => k.trim()).filter(k => k.length > 10);

const getGeminiKeys = (): string[] => parseKeys(readEnv("VITE_GEMINI_API_KEY") || readEnv("GEMINI_API_KEY"));
const getGroqKeys   = (): string[] => parseKeys(readEnv("VITE_GROQ_API_KEY")   || readEnv("GROQ_API_KEY"));

// ── Providers ─────────────────────────────────────────────────────────────────

interface Provider {
  name: string;
  call: (prompt: string) => Promise<string>;
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
          generationConfig: { temperature: 0.2, maxOutputTokens: 4096, responseMimeType: "application/json" }
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
                content: "Você é um auditor forense sênior especialista em Direito do Trabalho e Governança de Terceiros na construção civil brasileira. Responda APENAS com JSON válido, sem markdown, sem texto antes ou depois."
              },
              { role: "user", content: prompt }
            ],
            temperature: 0.2,
            max_tokens: 4096,
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
        if (err.message === "QUOTA") throw err;
        lastError = err.message;
        continue;
      }
    }
    throw new Error(lastError || "Todos os modelos Groq falharam");
  }
});

// ── Exportação principal ──────────────────────────────────────────────────────

export const generateAuditReport = async (auditData: any): Promise<AIAnalysisResult> => {

  // ── Pré-processamento: falhas do checklist (NÃO e PARCIAL) ──
  const falhas = auditData.respostas_check
    ?.filter((r: any) => r.resposta === 'nao' || r.resposta === 'parcial')
    ?.map((r: any) => `• ${r.pergunta}: ${r.resposta.toUpperCase()}${r.obs ? ` — Obs: ${r.obs}` : ''}`)
    .join('\n') || "Nenhuma falha identificada no checklist.";

  // ── Pré-processamento: itens N/A (lacunas de auditoria) ──
  const itensNaoAvaliados = auditData.respostas_check
    ?.filter((r: any) => r.resposta === 'n_a')
    ?.map((r: any) => `• ${r.pergunta}`)
    .join('\n') || null;

  // ── Pré-processamento: agregação estatística das entrevistas por pergunta ──
  const totalEntrevistados: number = auditData.entrevistas?.length || 0;
  const efetivoCampo: number = auditData.amostragem?.total_efetivo || 0;
  const percentualAmostra: number = efetivoCampo > 0 ? Math.round((totalEntrevistados / efetivoCampo) * 100) : 0;

  // Obtém lista única de perguntas a partir da primeira entrevista
  const perguntasUnicas: string[] = (auditData.entrevistas?.[0]?.respostas || [])
    .map((r: any) => r.pergunta)
    .filter(Boolean);

  // Agrega respostas por pergunta
  const agregacaoEntrevistas = perguntasUnicas.map((pergunta: string) => {
    const totalNao = (auditData.entrevistas || []).filter((e: any) =>
      e.respostas?.find((r: any) => r.pergunta === pergunta && r.resposta === 'nao')
    ).length;
    const percentNao = totalEntrevistados > 0 ? Math.round((totalNao / totalEntrevistados) * 100) : 0;
    const alerta = totalNao > 0 ? ' ⚠️ NÃO CONFORMIDADE' : ' ✅ Conforme';
    return `• "${pergunta}": ${totalEntrevistados - totalNao} SIM / ${totalNao} NÃO (${percentNao}%${alerta})`;
  }).join('\n');

  const resumoEntrevistas = totalEntrevistados === 0
    ? "Nenhuma entrevista IN LOCO registrada."
    : `${totalEntrevistados} trabalhadores entrevistados (${percentualAmostra}% do efetivo de ${efetivoCampo}):\n${agregacaoEntrevistas}`;

  // ── Construção do prompt definitivo ──
  const prompt = `VOCÊ É UM AUDITOR SÊNIOR ESPECIALISTA EM RISCOS TRABALHISTAS, SEGURANÇA DO TRABALHO E GOVERNANÇA DE TERCEIROS. Sua função é gerar relatórios técnicos que MAPEIAM VULNERABILIDADES, EXPÕEM FRAGILIDADES DOCUMENTAIS e DEMONSTRAM RISCOS EM AÇÕES TRABALHISTAS.

=== REGRAS ABSOLUTAS (violação invalida o relatório) ===
1. NUNCA calcule multas administrativas do MTE. O foco é "como um advogado usará essa falha em juízo".
2. NUNCA use "alguns", "vários", "muitos". Use SEMPRE números exatos.
3. NUNCA use "Reclamatória Trabalhista" como única descrição de risco. Explique: qual ação, como a prova é usada, base legal, resultado provável, quem responde.
4. SEMPRE citar artigo/súmula/lei com número exato (ex: "CLT Art. 458, §1º" não "segundo a CLT").
5. SEMPRE numerar ações de mitigação com prazo e responsável.
6. NUNCA classifique algo como "Risco Criminal" sem que haja evidência clara de dolo (intenção fraudulenta documentada). Divergência de efetivo e ponto fora da obra são infrações trabalhistas/administrativas, NÃO crimes. Use "Risco de Responsabilidade Subsidiária" (Súmula 331, IV, TST) em vez de risco criminal quando não há evidência de fraude intencional.
7. PROJEÇÃO ESTATÍSTICA HONESTA: Se a amostra tiver menos de 3 trabalhadores entrevistados, NÃO use linguagem de cálculo estatístico. Use: "Dado o tamanho reduzido da amostra (N=[X]), não é possível fazer projeção estatística confiável. Recomenda-se verificação imediata com todos os [N_total] trabalhadores da obra."

=== DISTINÇÕES CRÍTICAS ===
🔒 CATRACA = Controle de acesso patrimonial (NR-18.7). Risco = intrusos, trabalhadores fantasmas, furtos. NÃO registra jornada. NUNCA aplicar Súmula 338 TST para catraca.
⏰ RELÓGIO DE PONTO = Registro de jornada (CLT Art. 74). Aplica-se APENAS a EMPREGADOS com >20 funcionários. Ponto manual gera inversão do ônus (Súmula 338, III, TST). NUNCA aplicar CLT Art. 74 a empreiteiros.
🎤 ENTREVISTAS IN LOCO = Evidência primária de peso máximo. Analise por PERGUNTA (estatística agregada), nunca por trabalhador individualmente.
👷 EMPREITEIRO ≠ EMPREGADO: empreiteiro não tem vínculo CLT. Risco é pejotização/reclassificação (Súmula 331, I, TST), não multa de ponto.
🔗 CRUZAMENTO OBRIGATÓRIO: Se o checklist registrar trabalhadores com status 'BLOQUEADO' ou 'PENDENTE' atuando na obra E houver divergência entre efetivo de campo e GD4, esses dois fatos devem ser analisados NA MESMA VULNERABILIDADE como causa e efeito — a liberação manual da catraca é o mecanismo que permite o acesso irregular.

=== DADOS DA AUDITORIA ===
OBRA: ${auditData.obra}
Efetivo real em campo: ${efetivoCampo} pessoas
Efetivo no sistema GD4: ${auditData.amostragem?.efetivo_gd4 || 0} pessoas
Divergência: ${Math.abs(efetivoCampo - (auditData.amostragem?.efetivo_gd4 || 0))} pessoa(s)

=== FALHAS DO CHECKLIST DE CAMPO ===
${falhas}

=== ITENS NÃO AVALIADOS (N/A) — LACUNAS DE AUDITORIA ===
${itensNaoAvaliados ? itensNaoAvaliados : "Nenhum item marcado como N/A."}

=== RESUMO ESTATÍSTICO DAS ENTREVISTAS IN LOCO ===
${resumoEntrevistas}

=== INSTRUÇÃO PARA GERAÇÃO DAS VULNERABILIDADES ===
Gere UMA vulnerabilidade por:
- Cada item do checklist com resposta NÃO ou PARCIAL
- Cada PERGUNTA da entrevista com pelo menos 1 resposta NÃO (nunca por trabalhador individual)
- Divergência de efetivo ≥ 1 pessoa
- Quarteirização irregular identificada
- Se houver itens N/A: gerar UMA vulnerabilidade de "LACUNA DE AUDITORIA" com gravidade ALTA, explicando que itens não avaliados não significam conformidade — significam risco não quantificado. Liste os itens N/A e recomende auditoria complementar imediata.

Gravidade das vulnerabilidades de entrevista:
- Direito fundamental (VT, salário, alojamento, treinamento) → CRÍTICA (mesmo que 1 trabalhador)
- Uniforme/logomarca divergente → MÉDIA

No campo "oQueFoiEncontrado" de vulnerabilidades de entrevista, SEMPRE iniciar com:
"DECLARAÇÃO IN LOCO: X de Y trabalhadores (Z%) declararam..."

RETORNE APENAS JSON VÁLIDO sem markdown:
{
  "scoreConformidade": <0-100, inversamente proporcional à quantidade e gravidade das falhas>,
  "status": "CRÍTICO" | "ALTO" | "MÉDIO" | "BAIXO",
  "resumoVulnerabilidades": ["<texto curto de cada vulnerabilidade>"],
  "vulnerabilidades": [
    {
      "nome": "<TÍTULO EM MAIÚSCULAS>",
      "gravidade": "CRÍTICA" | "ALTA" | "MÉDIA" | "BAIXA",
      "exposicao": "<Construtora | Terceirizada | Ambas>",
      "oQueFoiEncontrado": "<Fato objetivo com números. Entrevista: iniciar com DECLARAÇÃO IN LOCO: X de Y (Z%) declararam...>",
      "fragilidadeDocumental": "<Documento ESPECÍFICO faltante ou inconsistente, data se houver, por que prejudica a defesa em juízo>",
      "riscoTrabalhista": "<1.Qual ação pode ser ajuizada. 2.Como a falha vira prova. 3.Base legal exata (art/súmula/lei). 4.Resultado provável. 5.Quem responde (direto e solidário)>",
      "mitigacao": "<(1) Ação - Prazo - Responsável - Norma. (2) Ação - Prazo...>"
    }
  ],
  "analiseEfetivo": "<Análise objetiva da divergência campo vs GD4 com implicações jurídicas e base legal>",
  "secaoEntrevistasInLoco": {
    "totalEntrevistados": <número>,
    "percentualDoEfetivo": <número>,
    "alertaJuridico": "<Texto sobre o peso probatório máximo das declarações IN LOCO em ação trabalhista>",
    "agregacaoPorPergunta": [
      {
        "pergunta": "<texto da pergunta>",
        "totalNao": <número>,
        "percentualNao": <número>,
        "gravidade": "CRÍTICA" | "ALTA" | "MÉDIA" | "BAIXA",
        "analiseJuridica": "<impacto jurídico desta pergunta com base legal exata>"
      }
    ],
    "projecaoConservadora": "<REGRA: Se totalEntrevistados < 3: usar 'Dado o tamanho reduzido da amostra (N=[X] trabalhadores), não é possível fazer projeção estatística confiável. Recomenda-se verificação imediata com todos os [efetivo_total] trabalhadores da obra.' Se totalEntrevistados >= 3: usar 'X de Y entrevistados (Z%) declararam [problema]. Projetando essa proporção para o efetivo total de [N] trabalhadores, estima-se que até [N_projetado] trabalhadores possam estar na mesma situação. Recomenda-se verificação imediata com todo o efetivo.'>"
  },
  "conclusaoExecutiva": {
    "resumoNumerico": "<A obra apresenta X vulnerabilidades: A CRÍTICAS, B ALTAS, C MÉDIAS, D BAIXAS.>",
    "destaquEntrevistas": "<X de Y trabalhadores entrevistados (Z%) declararam não conformidade em [temas críticos]. Essas declarações têm peso probatório máximo em juízo.>",
    "principaisAmeacas": [
      "RISCO CRIMINAL: <descrição com base legal>",
      "RISCO DE RESPONSABILIDADE SOLIDÁRIA: <descrição com Súmula 331 TST>",
      "RISCO DE AÇÕES EM MASSA: <descrição com projeção>"
    ],
    "acoesPrioritarias": [
      {"acao": "<texto da ação>", "prazo": "<ex: 24h | 48h | 7 dias>"}
    ],
    "acoesSecundarias": [
      {"acao": "<texto da ação>", "prazo": "<ex: 15 dias | 30 dias>"}
    ]
  }
}`;

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
        continue;
      }
      console.warn(`[AI] Falhou: ${provider.name} — ${msg}`);
      errors.push(`${provider.name}: ${msg}`);
      continue;
    }
  }

  const allQuota = errors.every(e => e.includes("cota esgotada"));
  console.error("[AI] Todos os providers falharam:", errors);

  if (allQuota) throw new Error("LIMITE_ATINGIDO");
  throw new Error(`Falha na análise de IA: ${errors.join(' | ')}`);
};
