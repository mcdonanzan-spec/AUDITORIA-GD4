
import { AIAnalysisResult } from "../types";

// ============================================================
// v3.0.0 - Implementação estável com fallback total
// ============================================================

const robustJsonParse = (text: string): any => {
  // Tenta extrair JSON mesmo que haja texto ao redor (markdown code fences, etc.)
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

export const generateAuditReport = async (auditData: any): Promise<AIAnalysisResult> => {
  
  // ---- LEITURA DA CHAVE DE API ----
  // Estratégia multi-fonte para funcionar em qualquer ambiente
  // (Vite dev, Vercel preview, Vercel production)
  let rawKey = "";
  
  try {
    // import.meta.env é a fonte primária para variáveis VITE_ no Vite
    rawKey = import.meta.env.VITE_GEMINI_API_KEY || "";
  } catch(_) { /* não disponível */ }
  
  if (!rawKey) {
    try {
      // process.env é injetado pelo bloco define do vite.config.ts
      rawKey = (process as any).env?.VITE_GEMINI_API_KEY || 
               (process as any).env?.GEMINI_API_KEY || 
               (process as any).env?.API_KEY || "";
    } catch(_) { /* não disponível */ }
  }
  
  const apiKeys = rawKey
    .replace(/["'`]/g, "")
    .split(/[,\s]+/)
    .map((k: string) => k.trim())
    .filter((k: string) => k.length > 10);

  console.log(`[Gemini] Chaves encontradas: ${apiKeys.length}`);
  
  if (apiKeys.length === 0) {
    throw new Error(
      "CHAVE_AUSENTE: A variável VITE_GEMINI_API_KEY não foi encontrada. " +
      "Acesse Vercel > Settings > Environment Variables e configure a chave."
    );
  }

  // ---- CONSTRUÇÃO DO PROMPT ----
  const falhasCriticas = auditData.respostas_check
    ?.filter((r: any) => r.resposta === 'nao' || r.resposta === 'parcial')
    ?.map((r: any) => `• ${r.pergunta}: ${r.resposta.toUpperCase()} (Obs: ${r.obs || 'nenhuma'})`)
    .join('\n') || "Nenhuma falha crítica registrada.";

  const divergencias = auditData.entrevistas
    ?.map((e: any) => {
      const falhas = e.respostas?.filter((r: any) => r.resposta === 'nao');
      if (!falhas?.length) return null;
      return `• ${e.funcao} (${e.empresa}): NÃO tem → ${falhas.map((f: any) => f.pergunta).join(', ')}`;
    })
    .filter(Boolean)
    .join('\n') || "Sem divergências nas entrevistas.";

  const prompt = `Você é um auditor forense sênior especializado em Direito do Trabalho na construção civil brasileira.

OBRA AUDITADA: ${auditData.obra}
EFETIVO: ${auditData.amostragem?.total_efetivo || 'não informado'} trabalhadores

FALHAS NO CHECKLIST:
${falhasCriticas}

DIVERGÊNCIAS NAS ENTREVISTAS:
${divergencias}

INSTRUÇÕES:
- Calcule riscos financeiros reais baseados no efetivo e nas falhas específicas
- Cite CLT (arts. 9, 74, 467, 477), Súmulas TST 331, NR-18 quando aplicável
- Se houver quarteirização irregular ou ausência de registro de ponto: indiceGeral <= 50
- Seja específico e forense, não use textos genéricos

RETORNE APENAS O JSON (sem markdown, sem texto antes ou depois):
{"indiceGeral":number,"classificacao":"REGULAR"|"ATENÇÃO"|"CRÍTICA","riscoJuridico":"BAIXO"|"MÉDIO"|"ALTO"|"CRÍTICO","exposicaoFinanceira":number,"detalhamentoCalculo":[{"item":string,"valor":number,"baseLegal":string,"logica":string}],"naoConformidades":[string],"impactoJuridico":string,"recomendacoes":[string],"conclusaoExecutiva":string}`;

  // ---- LISTA DE ENDPOINTS (modelos gratuitos disponíveis em 2025) ----
  const endpoints = [
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent",
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent",
    "https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent",
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent",
  ];

  const errors: string[] = [];

  // ---- LOOP PRINCIPAL: tenta cada chave × cada endpoint ----
  for (let ki = 0; ki < apiKeys.length; ki++) {
    const key = apiKeys[ki];
    
    for (const endpoint of endpoints) {
      const modelName = endpoint.split('/models/')[1]?.split(':')[0] ?? endpoint;
      
      try {
        const url = `${endpoint}?key=${key}`;
        console.log(`[Gemini] Tentando: ${modelName} | Chave ${ki + 1}/${apiKeys.length}`);
        
        const res = await fetch(url, {
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
          const msg = json?.error?.message || res.statusText;
          const lowerMsg = msg.toLowerCase();
          
          // Erros de cota → tenta próxima chave, não próximo modelo
          if (res.status === 429 || lowerMsg.includes("quota") || lowerMsg.includes("rate limit")) {
            errors.push(`Chave ${ki+1} - Cota esgotada`);
            break; // Sai do loop de endpoints e tenta próxima chave
          }
          
          // Modelo não existe → tenta próximo endpoint
          if (res.status === 404 || lowerMsg.includes("not found") || lowerMsg.includes("not supported")) {
            errors.push(`${modelName}: não disponível`);
            continue;
          }

          // Chave inválida → tenta próxima chave
          if (res.status === 400 || res.status === 401 || res.status === 403 || lowerMsg.includes("api key")) {
            errors.push(`Chave ${ki+1}: inválida (${res.status})`);
            break;
          }

          errors.push(`${modelName}: ${msg}`);
          continue;
        }

        // Sucesso!
        const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!text) {
          errors.push(`${modelName}: resposta vazia`);
          continue;
        }

        console.log(`[Gemini] ✅ Sucesso: ${modelName} com chave ${ki + 1}`);
        return robustJsonParse(text);

      } catch (networkErr: any) {
        errors.push(`${modelName}: erro de rede - ${networkErr.message}`);
        continue;
      }
    }
  }

  // ---- Montagem do erro final para diagnóstico ----
  const isQuotaError = errors.some(e => e.includes("Cota") || e.includes("quota"));
  const isKeyError = errors.some(e => e.includes("inválida"));
  
  console.error("[Gemini] Todos endpoints falharam:", errors);
  
  if (isQuotaError) throw new Error("LIMITE_ATINGIDO");
  if (isKeyError) throw new Error(`Chave de API inválida. Verifique a variável VITE_GEMINI_API_KEY na Vercel. Erros: ${errors.join(' | ')}`);
  throw new Error(`Falha ao conectar com a IA. Erros: ${errors.join(' | ')}`);
};
