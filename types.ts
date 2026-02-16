
export type UserRole = 'admin' | 'auditor' | 'diretoria' | 'obra';

export interface User {
  id: string;
  nome: string;
  email: string;
  perfil: UserRole;
  obra_id?: string;
}

export interface Obra {
  id: string;
  nome: string;
  regional: string;
  engenheiro_responsavel: string;
  status: 'ativa' | 'concluida' | 'suspensa';
  created_at: string;
}

export type AuditType = 'mensal' | 'extraordinaria';

export interface Question {
  id: string;
  bloco: 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G';
  texto: string;
  peso: number;
  requiresPhotos?: boolean;
}

export type ResponseValue = 'sim' | 'parcial' | 'nao' | 'n_a';

export interface AuditResponse {
  pergunta_id: string;
  resposta: ResponseValue;
  observacao?: string;
  fotos?: string[]; // Suporte a múltiplas fotos
}

export interface EntrevistaAmostral {
  id: string;
  funcao: string;
  empresa: string; // Novo campo empresa
  respostas: {
    pergunta_id: string;
    resposta: ResponseValue;
    comentario?: string;
  }[];
}

export interface Audit {
  id: string;
  obra_id: string;
  auditor_id: string;
  data: string;
  tipo: AuditType;
  indice_geral?: number;
  classificacao?: string;
  risco_juridico?: string;
  respostas: AuditResponse[];
  entrevistas?: EntrevistaAmostral[];
  equipe_campo?: number;
  equipe_gd4?: number;
  subcontratacao_identificada?: boolean;
  relatorio_ia?: string;
  created_at: string;
}

export interface AIAnalysisResult {
  indiceGeral: number;
  classificacao: string;
  riscoJuridico: string;
  naoConformidades: string[];
  impactoJuridico: string;
  recomendacoes: string[];
  conclusaoExecutiva: string;
}
