
import { Obra, Audit, User } from '../types';

let MOCK_OBRAS: Obra[] = [
  { id: '1', nome: 'Residencial Aurora', regional: 'Sul', engenheiro_responsavel: 'Carlos Silva', status: 'ativa', created_at: '2023-01-10T00:00:00Z' },
  { id: '2', nome: 'Complexo Empresarial Alpha', regional: 'Sudeste', engenheiro_responsavel: 'Ana Pereira', status: 'ativa', created_at: '2023-02-15T00:00:00Z' },
  { id: '3', nome: 'Hospital Central', regional: 'Norte', engenheiro_responsavel: 'Marcos Souza', status: 'suspensa', created_at: '2023-03-20T00:00:00Z' },
  { id: '4', nome: 'Condomínio Vista Mar', regional: 'Litoral', engenheiro_responsavel: 'Juliana Lima', status: 'ativa', created_at: '2023-04-05T00:00:00Z' },
  { id: '5', nome: 'Torre Horizonte', regional: 'Sudeste', engenheiro_responsavel: 'Roberto Dias', status: 'ativa', created_at: '2023-05-12T00:00:00Z' },
  { id: '6', nome: 'Parque Industrial Oeste', regional: 'Oeste', engenheiro_responsavel: 'Fernanda Costa', status: 'ativa', created_at: '2023-06-18T00:00:00Z' },
];

let MOCK_USERS: User[] = [
  { id: 'u1', nome: 'Admin Master', email: 'admin@unitaengenharia.com.br', perfil: 'admin', status: 'ativo' },
  { id: 'u2', nome: 'Auditor Senior', email: 'auditor@unitaengenharia.com.br', perfil: 'auditor', status: 'ativo' },
  { id: 'u3', nome: 'Diretoria Regional', email: 'diretoria@unitaengenharia.com.br', perfil: 'diretoria', status: 'ativo' },
  { id: 'u4', nome: 'Eng. Ricardo', email: 'obra@unitaengenharia.com.br', perfil: 'obra', status: 'ativo', obra_ids: ['1', '4', '5'] },
  { id: 'u5', nome: 'mcdonanzan', email: 'mcdonanzan@gmail.com', perfil: 'admin', status: 'ativo' },
];

let MOCK_AUDITS: Audit[] = [
  {
    id: 'aud-1',
    obra_id: '1',
    auditor_id: 'u2',
    data: '2024-03-10',
    tipo: 'mensal',
    indice_geral: 92,
    classificacao: 'EXCELENTE',
    risco_juridico: 'BAIXO',
    respostas: [],
    created_at: '2024-03-10T10:00:00Z'
  },
  {
    id: 'aud-2',
    obra_id: '2',
    auditor_id: 'u2',
    data: '2024-03-12',
    tipo: 'mensal',
    indice_geral: 68,
    classificacao: 'CRÍTICO',
    risco_juridico: 'ALTO',
    respostas: [],
    created_at: '2024-03-12T14:30:00Z'
  },
  {
    id: 'aud-3',
    obra_id: '4',
    auditor_id: 'u2',
    data: '2024-03-14',
    tipo: 'extraordinaria',
    indice_geral: 78,
    classificacao: 'REGULAR',
    risco_juridico: 'MEDIO',
    respostas: [],
    created_at: '2024-03-14T09:15:00Z'
  },
  {
    id: 'aud-4',
    obra_id: '5',
    auditor_id: 'u2',
    data: '2024-03-15',
    tipo: 'mensal',
    indice_geral: 88,
    classificacao: 'BOM',
    risco_juridico: 'BAIXO',
    respostas: [],
    created_at: '2024-03-15T11:00:00Z'
  },
  {
    id: 'aud-5',
    obra_id: '6',
    auditor_id: 'u2',
    data: '2024-03-16',
    tipo: 'mensal',
    indice_geral: 45,
    classificacao: 'CRÍTICO',
    risco_juridico: 'MUITO ALTO',
    respostas: [],
    created_at: '2024-03-16T16:00:00Z'
  }
];

export const getObras = async (): Promise<Obra[]> => {
  return new Promise((resolve) => setTimeout(() => resolve([...MOCK_OBRAS]), 100));
};

export const addObra = async (obra: Obra): Promise<Obra> => {
  MOCK_OBRAS = [obra, ...MOCK_OBRAS];
  return obra;
};

export const getAudits = async (): Promise<Audit[]> => {
  return new Promise((resolve) => setTimeout(() => resolve([...MOCK_AUDITS]), 100));
};

export const saveAudit = async (audit: Audit): Promise<Audit> => {
  MOCK_AUDITS = [audit, ...MOCK_AUDITS];
  return audit;
};

export const getUsers = async (): Promise<User[]> => {
  return new Promise((resolve) => setTimeout(() => resolve([...MOCK_USERS]), 100));
};

export const createUserRequest = async (user: User): Promise<User> => {
  MOCK_USERS = [...MOCK_USERS, user];
  return user;
};

export const updateUser = async (user: User): Promise<User> => {
  MOCK_USERS = MOCK_USERS.map(u => u.id === user.id ? user : u);
  return user;
};

export const deleteUser = async (userId: string): Promise<void> => {
  MOCK_USERS = MOCK_USERS.filter(u => u.id !== userId);
};
