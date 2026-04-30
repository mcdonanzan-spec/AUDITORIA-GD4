
export type UserRole = 'admin' | 'auditor' | 'diretoria' | 'obra';
export type UserStatus = 'ativo' | 'pendente' | 'bloqueado';

export interface User {
  id: string;
  nome: string;
  email: string;
  perfil: UserRole;
  status: UserStatus;
  obra_ids?: string[];
}

export interface Obra {
  id: string;
  nome: string;
  regional: string;
  engenheiro_responsavel: string;
  engenheiro_id?: string;
  status: 'ativa' | 'concluida' | 'suspensa';
  created_at: string;
}

export type AuditType = 'mensal' | 'extraordinaria';

export interface Question {
  id: string;
  bloco: 'A' | 'B' | 'E' | 'F' | 'G' | 'H';
  texto: string;
  peso: number;
  requiresPhotos?: boolean;
  minPhotos?: number;
  inverted?: boolean;
}

export type ResponseValue = 'sim' | 'parcial' | 'nao' | 'n_a';

export interface AuditResponse {
  pergunta_id: string;
  resposta: ResponseValue;
  observacao?: string;
  fotos?: string[];
}

export interface EntrevistaAmostral {
  id: string;
  funcao: string;
  empresa: string;
  respostas: {
    pergunta_id: string;
    resposta: ResponseValue;
    comentario?: string;
  }[];
}

export interface Signature {
  userId: string;
  nome: string;
  data: string;
}

export interface Audit {
  id: string;
  obra_id: string;
  auditor_id: string;
  tipo: AuditType;
  indice_geral?: number;
  classificacao?: string;
  risco_juridico?: string;
  respostas?: AuditResponse[];
  entrevistas?: EntrevistaAmostral[];
  equipe_campo?: number;
  equipe_gd4?: number;
  subcontratacao_identificada?: boolean;
  relatorio_ia?: string;
  created_at: string;
  assinatura_auditor?: Signature;
  assinatura_engenheiro?: Signature;
}

// ── Vulnerabilidade (card individual no relatório) ─────────────────────────────
export interface Vulnerabilidade {
  nome: string;
  gravidade: 'CRÍTICA' | 'ALTA' | 'MÉDIA' | 'BAIXA';
  exposicao: string;
  tipoRisco?: string;   // ex: 'Trabalhista' | 'Segurança do Trabalho' | 'Compliance' | 'Limitação Metodológica'
  areaAcionar?: string; // ex: 'Jurídico' | 'RH / DP' | 'Segurança do Trabalho' | 'TI / Sistemas' | 'Financeiro'
  oQueFoiEncontrado: string;
  fragilidadeDocumental: string;
  riscoTrabalhista: string;
  mitigacao: string;
}

// ── Seção agregada de Entrevistas IN LOCO ────────────────────────────────────
export interface NaoConformidadePorPergunta {
  pergunta: string;
  totalNao: number;
  percentualNao: number;
  gravidade: 'CRÍTICA' | 'ALTA' | 'MÉDIA' | 'BAIXA';
  analiseJuridica: string;
}

export interface SecaoEntrevistasInLoco {
  totalEntrevistados: number;
  percentualDoEfetivo: number;
  alertaJuridico: string;
  agregacaoPorPergunta: NaoConformidadePorPergunta[];
  projecaoConservadora: string;
}

// ── Conclusão Executiva estruturada ──────────────────────────────────────────
export interface AcaoComPrazo {
  acao: string;
  prazo: string;
}

export interface ConclusaoExecutiva {
  resumoNumerico: string;
  destaquEntrevistas: string;
  principaisAmeacas: string[];
  acoesPrioritarias: AcaoComPrazo[];
  acoesSecundarias: AcaoComPrazo[];
}

// ── Resultado completo da IA ──────────────────────────────────────────────────
export interface AIAnalysisResult {
  scoreConformidade: number;
  status: string;
  resumoVulnerabilidades: string[];
  vulnerabilidades: Vulnerabilidade[];
  analiseEfetivo: string;
  secaoEntrevistasInLoco: SecaoEntrevistasInLoco;
  conclusaoExecutiva: ConclusaoExecutiva;
  detalhamentoCalculo: string[];
}
