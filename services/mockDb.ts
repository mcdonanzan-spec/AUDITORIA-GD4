
import { Obra, Audit, User } from '../types';

let MOCK_OBRAS: Obra[] = [
  { id: '1', nome: 'Residencial Aurora', regional: 'Sul', engenheiro_responsavel: 'Carlos Silva', status: 'ativa', created_at: '2023-01-10T00:00:00Z' },
  { id: '2', nome: 'Complexo Empresarial Alpha', regional: 'Sudeste', engenheiro_responsavel: 'Ana Pereira', status: 'ativa', created_at: '2023-02-15T00:00:00Z' },
  { id: '3', nome: 'Hospital Central', regional: 'Norte', engenheiro_responsavel: 'Marcos Souza', status: 'suspensa', created_at: '2023-03-20T00:00:00Z' },
  { id: '4', nome: 'Condomínio Vista Mar', regional: 'Litoral', engenheiro_responsavel: 'Juliana Lima', status: 'ativa', created_at: '2023-04-05T00:00:00Z' },
];

let MOCK_USERS: User[] = [
  { id: 'u1', nome: 'Admin Master', email: 'admin@unita.eng.br', perfil: 'admin' },
  { id: 'u2', nome: 'Auditor Senior', email: 'auditor@unita.eng.br', perfil: 'auditor' },
  { id: 'u3', nome: 'Diretoria Regional', email: 'diretoria@unita.eng.br', perfil: 'diretoria' },
  { id: 'u4', nome: 'Eng. Ricardo', email: 'obra@unita.eng.br', perfil: 'obra', obra_ids: ['1', '4'] },
];

let MOCK_AUDITS: Audit[] = [
  {
    id: 'aud-1',
    obra_id: '1',
    auditor_id: 'u2',
    data: '2023-10-20',
    tipo: 'mensal',
    indice_geral: 85,
    classificacao: 'REGULAR',
    risco_juridico: 'BAIXO',
    respostas: [],
    created_at: '2023-10-20T10:00:00Z'
  },
  {
    id: 'aud-2',
    obra_id: '2',
    auditor_id: 'u2',
    data: '2023-10-22',
    tipo: 'extraordinaria',
    indice_geral: 45,
    classificacao: 'CRÍTICA',
    risco_juridico: 'ALTO',
    respostas: [],
    created_at: '2023-10-22T14:30:00Z'
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

export const updateUser = async (user: User): Promise<User> => {
  MOCK_USERS = MOCK_USERS.map(u => u.id === user.id ? user : u);
  return user;
};
