
import { AIAnalysisResult } from "../types";

// v2.0.0 - Pool de Chaves + Modelos Atuais (Gemini 2.0)
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

export const generateAuditReport = async (auditData: any): Promise<AIAnalysisResult> => {
  const rawKeys = import.meta.env.VITE_GEMINI_API_KEY || 
                  import.meta.env.GEMINI_API_KEY || "";
  
  // Sanitiza e separa as chaves (suporta vírgula ou espaço como separador)
  const apiKeys: string[] = rawKeys
    .replace(/["']/g, "")
    .split(/[,\s]+/)
    .map((k: string) => k.trim())
    .filter((k: string) => k.length > 20);
  
  if (apiKeys.length === 0) {
    throw new Error("A chave da API do Gemini não foi configurada no ambiente.");
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
  
  ESTRUTURA DO JSON (OBRIGATÓRIO, sem texto extra, apenas JSON):
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

  // Modelos ATUAIS do Google Gemini (2025) - ordenados por velocidade e disponibilidade
  // Referência: https://ai.google.dev/gemini-api/docs/models
  const modelEndpoints: Array<{ model: string; version: string }> = [
    { model: "gemini-2.0-flash",      version: "v1beta" },
    { model: "gemini-2.0-flash",      version: "v1"     },
    { model: "gemini-2.0-flash-lite", version: "v1beta" },
    { model: "gemini-1.5-flash",      version: "v1beta" },
    { model: "gemini-1.5-flash",      version: "v1"     },
    { model: "gemini-2.0-flash-exp",  version: "v1beta" },
  ];

  let lastError = "";
  const maxKeyAttempts = apiKeys.length;

  for (let keyAttempt = 0; keyAttempt < maxKeyAttempts; keyAttempt++) {
    const apiKey = apiKeys[currentKeyIndex % apiKeys.length];
    let quotaHit = false;

    for (const { model, version } of modelEndpoints) {
      try {
        console.log(`[Gemini] Tentando: ${model} via ${version} | Chave #${currentKeyIndex % apiKeys.length}`);
        
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

          // Limite de cota → rotaciona chave imediatamente
          if (response.status === 429 || errorMsg.includes("quota") || errorMsg.includes("rate limit")) {
            console.warn(`[Gemini] Cota atingida na chave #${currentKeyIndex % apiKeys.length}. Rotacionando...`);
            currentKeyIndex++;
            quotaHit = true;
            break; // Sai do loop de endpoints e tenta a próxima chave
          }

          // Modelo não encontrado ou não suportado → tenta o próximo endpoint
          if (response.status === 404 || errorMsg.includes("not found") || errorMsg.includes("not supported")) {
            console.warn(`[Gemini] ${model} (${version}) não disponível. Tentando próximo...`);
            lastError = data.error?.message || `${model} não encontrado`;
            continue;
          }

          // Outros erros → registra e continua
          lastError = data.error?.message || response.statusText;
          continue;
        }

        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!text) {
          lastError = "IA não retornou texto válido.";
          continue;
        }

        console.log(`[Gemini] Sucesso com ${model} (${version})`);
        return robustJsonParse(text);

      } catch (err: any) {
        lastError = err.message || "Erro de rede.";
        continue;
      }
    }

    if (!quotaHit) break; // Se saiu do loop sem ser por cota, não tenta outra chave
  }

  // Define a mensagem de erro final para o frontend
  if (lastError.toLowerCase().includes("quota") || lastError.includes("LIMITE_ATINGIDO")) {
    throw new Error("LIMITE_ATINGIDO");
  }
  throw new Error(lastError || "Todos os modelos de IA falharam. Tente novamente mais tarde.");
};
