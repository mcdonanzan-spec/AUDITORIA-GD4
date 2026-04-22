
import { AIAnalysisResult } from "../types";

// v1.0.3 - Implementação de Pool de Chaves e Otimização de Performance
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

// Indexador global para persistir entre chamadas na mesma sessão
let currentKeyIndex = 0;

export const generateAuditReport = async (auditData: any): Promise<AIAnalysisResult> => {
  const rawKeys = import.meta.env.VITE_GEMINI_API_KEY || 
                  import.meta.env.GEMINI_API_KEY || "";
  
  // Limpa e separa as chaves por vírgula ou espaço, removendo aspas residuais
  const apiKeys = rawKeys
    .replace(/["']/g, "")
    .split(/[, ]+/)
    .map((k: string) => k.trim())
    .filter((k: string) => k.length > 10);
  
  if (apiKeys.length === 0) {
    throw new Error("A chave da API do Gemini não foi encontrada no ambiente.");
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
  
  ESTRUTURA DO JSON (OBRIGATÓRIO):
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

  // Lista otimizada de modelos (Flash é mais resiliente à cota)
  const models = ["gemini-1.5-flash", "gemini-2.0-flash", "gemini-1.5-pro"];
  const maxKeyAttempts = apiKeys.length;
  
  let lastError = "";

  // Loop de tentativa por chave
  for (let keyAttempt = 0; keyAttempt < maxKeyAttempts; keyAttempt++) {
    const apiKey = apiKeys[currentKeyIndex % apiKeys.length];
    
    // Tenta cada modelo com a chave atual
    for (const model of models) {
      for (const apiVer of ['v1', 'v1beta']) {
        try {
          console.log(`Tentando IA: Modelo ${model} (${apiVer}) com Chave Index ${currentKeyIndex % apiKeys.length}`);
          
          const response = await fetch(`https://generativelanguage.googleapis.com/${apiVer}/models/${model}:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: { temperature: 0.1, maxOutputTokens: 2000 }
            })
          });

          const data = await response.json();
          
          if (!response.ok) {
            const errorMsg = data.error?.message || "";
            
            // Se for erro de NotFound (404), pula e tenta próxima versão da API (v1beta/v1)
            if (response.status === 404) {
              lastError = errorMsg || "Modelo não encontrado (404)";
              continue;
            }

            // Se for erro de cota (429), pula para a PRÓXIMA CHAVE e interrompe os modelos para esta chave
            if (response.status === 429 || errorMsg.toLowerCase().includes("quota")) {
              console.warn(`Chave ${currentKeyIndex % apiKeys.length} atingiu o limite. Rotacionando...`);
              currentKeyIndex++; // Rotaciona globalmente
              break; // Sai do loop apiVer
            }
            
            lastError = errorMsg || response.statusText;
            continue; // Tenta outro modelo com a mesma chave (ex: erro 500)
          }

          const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (!text) continue;
          
          return robustJsonParse(text);

        } catch (err: any) {
          lastError = err.message;
          continue;
        }
      }
      // Se tiver rotacionado de chave no bloco acima por Cota (Break), precisamos quebrar esse loop de modelo também
      if (lastError === "LIMITE_ATINGIDO" || lastError.toLowerCase().includes("quota")) {
         break;
      }
    }
  }

  throw new Error(lastError === "LIMITE_ATINGIDO" || lastError.includes("quota") ? "LIMITE_ATINGIDO" : lastError);
};
