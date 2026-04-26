
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

  // ── Construção do prompt definitivo v5.2 ──
  const prompt = `VOCÊ É UM AUDITOR TÉCNICO SÊNIOR DE CONFORMIDADE TRABALHISTA. Você gera relatórios TÉCNICO-FACTUAIS — não pareceres jurídicos. Seu relatório mapeia o que foi encontrado em campo e qual risco isso representa. O jurídico humano fará a análise legal formal.

=== REGRAS ABSOLUTAS ===
1. NUNCA calcule multas administrativas do MTE.
2. NUNCA use "alguns", "vários", "muitos". Use números exatos.
3. NUNCA use a palavra "solidária" em "responsabilidade solidária". A Súmula 331, IV, TST define responsabilidade SUBSIDIÁRIA (o tomador só paga se a terceirizada não pagar). Escrever "solidária" é erro jurídico grave.
4. NUNCA classifique como "Risco Criminal" sem evidência documental de dolo (fraude intencional). Divergência de efetivo e ponto fora da obra são infrações trabalhistas, não crimes.
5. PROJEÇÃO HONESTA: Se amostra < 3 trabalhadores, usar: "Amostra insuficiente para projeção estatística. Recomenda-se verificação com todo o efetivo."
6. SEMPRE numerar ações de mitigação com prazo e responsável.

=== REGRA DE OURO — CITAÇÕES LEGAIS ===
Este relatório é TÉCNICO, não jurídico. Siga rigorosamente:

LISTA DE CITAÇÕES APROVADAS (única fonte permitida):
✅ Súmula 331, IV, TST → responsabilidade SUBSIDIÁRIA do tomador (nunca solidária)
✅ Súmula 331, V, TST → exige culpa in vigilando para a subsidiária
✅ Súmula 338, III, TST → inversão do ônus do ponto (APENAS para empregados com >20 funcionários, NUNCA para empreiteiros)
✅ NR-18 → condições de trabalho na construção civil (alojamento, acesso, higiene, treinamentos)
✅ Lei 7.418/1985 → vale-transporte (use esta, NUNCA CLT Art. 458 para VT)
✅ CLT Art. 3º → definição de empregado / reconhecimento de vínculo
✅ CLT Art. 443/444 → fraude ao contrato de trabalho / pejotização
✅ Portaria MTE 671/2021 → registro eletrônico de ponto / eSocial

PROIBIDO citar: CLT Art. 7º (qualquer inciso), Art. 9º, Art. 2º, Art. 74, Art. 154, Art. 458 ou qualquer outro artigo fora da lista acima.

SE NÃO TIVER NA LISTA APROVADA: terminar o campo riscoTrabalhista com a frase exata: "— Análise jurídica específica: a ser verificada pelo jurídico responsável."

=== DISTINÇÕES CRÍTICAS ===
🔒 CATRACA = Controle de acesso patrimonial (NR-18). Risco = intrusos, trabalhadores fantasmas. NÃO registra jornada. NUNCA citar Súmula 338 para catraca.
⏰ PONTO = CLT/Portaria 671. APENAS para empregados. NUNCA aplicar a empreiteiros.
🎤 ENTREVISTAS IN LOCO = Evidência primária. Analise por PERGUNTA (agregado), nunca por trabalhador individual.
👷 EMPREITEIRO ≠ EMPREGADO: risco é pejotização (CLT Art. 443/444), não multa de ponto.
🔗 CRUZAMENTO: Se checklist registrar bloqueados/pendentes atuando na obra E houver divergência de efetivo, analisar na MESMA vulnerabilidade como causa-efeito.


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

REGRAS DE QUALIDADE DESCRITIVA:
- "oQueFoiEncontrado": descrever O QUÊ ESPECIFICAMENTE foi encontrado. Não "documentos vencidos" — mas "Certificados de NR-35 de 3 trabalhadores vencidos desde [data]". Não "falta de VT" — mas "Trabalhador declarou não receber VT e VR nos últimos [período]".
- "fragilidadeDocumental": nomear OS DOCUMENTOS ESPECÍFICOS ausentes/vencidos e explicar por que a falta DESTE documento é problema (ex: "Sem comprovante de pagamento de VT, a empresa não consegue provar que cumpriu a obrigação em eventual ação de cobrança").
- "mitigacao": ações ESPECÍFICAS com documentos e sistemas nomeados. Não "atualizar o GD4" — mas "(1) Inserir no GD4 os [nome dos documentos] dos trabalhadores identificados em campo, prazo 24h, responsável: DP". Não "comprovar pagamento" — mas "(1) Reunir holerites e extratos dos últimos 3 meses, confrontar com declaração do trabalhador, prazo 24h, responsável: Financeiro/DP".
- "exposicao": NUNCA usar apenas "Ambas". Usar: "Construtora (tomadora dos serviços) + Terceirizada (empregadora direta)" ou "Construtora (responsável pelo canteiro)" ou "Terceirizada (empregadora direta)".
- "riscoTrabalhista": iniciar com "Tipo: [Trabalhista / Segurança do Trabalho / Compliance / Administrativo]" e "Área a acionar: [Jurídico / RH-DP / Segurança do Trabalho / TI-Sistemas / Financeiro]". Depois descrever o risco em linguagem clara e acessível para o gestor.

REGRA ESPECIAL — PONTO DE EMPREITEIROS:
Se o checklist indicar que empreiteiros não registram ponto diretamente na obra, o risco NÃO é "falta de registro de ponto CLT". Empreiteiro não tem vínculo CLT e não deve bater ponto como empregado. O risco real é: se a empresa controla o ponto do empreiteiro como se fosse empregado, isso configura SUBORDINAÇÃO e pode levar ao reconhecimento de vínculo empregatício (pejotização). A mitigação CORRETA é formalizar contrato de empreitada autônoma, NÃO implementar registro de ponto CLT para empreiteiros.

REGRA ESPECIAL — ITENS N/A (LACUNAS):
Items N/A NÃO são riscos operacionais — são LIMITAÇÕES METODOLÓGICAS. Se houver itens N/A, gerar UMA card com:
- gravidade: "MÉDIA"
- tipoRisco: "Limitação Metodológica"
- nome: "ITENS NÃO AVALIADOS NESTA AUDITORIA"
- oQueFoiEncontrado: listar objetivamente os itens que não foram auditados
- riscoTrabalhista: "Tipo: Compliance | Área a acionar: Auditoria Interna. Itens não avaliados não significam conformidade — significam que o risco é desconhecido. Sem verificação, a empresa não pode afirmar que está em conformidade com esses requisitos."
- mitigacao: agendamento de auditoria complementar focada nos itens pendentes

Gere UMA vulnerabilidade por:
- Cada item do checklist com resposta NÃO ou PARCIAL
- Cada PERGUNTA da entrevista com pelo menos 1 resposta NÃO
- Divergência de efetivo ≥ 1 pessoa (cruzar com bloqueados/pendentes se houver)
- Se houver itens N/A: UMA card de "ITENS NÃO AVALIADOS" (MÉDIA, Limitação Metodológica)

Gravidade das vulnerabilidades de entrevista:
- Direito fundamental (VT, salário, alojamento, treinamento) → CRÍTICA
- Uniforme/logomarca → MÉDIA

RETORNE APENAS JSON VÁLIDO sem markdown:
{
  "scoreConformidade": <0-100>,
  "status": "CRÍTICO" | "ALTO" | "MÉDIO" | "BAIXO",
  "resumoVulnerabilidades": ["<texto curto de cada vulnerabilidade>"],
  "vulnerabilidades": [
    {
      "nome": "<TÍTULO EM MAIÚSCULAS>",
      "gravidade": "CRÍTICA" | "ALTA" | "MÉDIA" | "BAIXA",
      "exposicao": "<Construtora (tomadora) | Terceirizada (empregadora direta) | Construtora (tomadora) + Terceirizada (empregadora direta)>",
      "tipoRisco": "<Trabalhista | Segurança do Trabalho | Compliance | Administrativo | Limitação Metodológica>",
      "areaAcionar": "<Jurídico | RH / DP | Segurança do Trabalho | TI / Sistemas | Financeiro | Auditoria Interna>",
      "oQueFoiEncontrado": "<Fato ESPECÍFICO com números e nomes. Entrevista: 'DECLARAÇÃO IN LOCO: X de Y trabalhadores (Z%) declararam [fato específico]'>",
      "fragilidadeDocumental": "<Nome ESPECÍFICO dos documentos ausentes/vencidos e por que a ausência prejudica a empresa em caso de questionamento>",
      "riscoTrabalhista": "<Iniciar com 'Tipo: [categoria] | Área a acionar: [área]'. Descrever o que pode acontecer em linguagem clara para o gestor. Se base legal da lista aprovada se aplicar, citar. Caso contrário, terminar com '— Análise jurídica específica: a ser verificada pelo jurídico responsável.'>",
      "mitigacao": "<(1) Ação ESPECÍFICA com documentos nomeados - Prazo - Responsável. (2) Ação...>"
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
