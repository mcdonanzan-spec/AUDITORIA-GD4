
import { Question } from './types';

export const QUESTIONS: Question[] = [
  // BLOCO A - Controle de Acesso
  { id: 'a1', bloco: 'A', texto: 'Catracas em pleno funcionamento e leitura biométrica ativa?', peso: 20 },
  { id: 'a2', bloco: 'A', texto: 'Controle de visitantes com identificação fotográfica?', peso: 15 },
  { id: 'a3', bloco: 'A', texto: 'Ausência de liberação manual (bypass) não documentada?', peso: 25 },
  
  // BLOCO B - Conformidade de Equipe
  { id: 'b1', bloco: 'B', texto: 'Efetivo em campo condizente com registros no GD4?', peso: 20 },
  { id: 'b2', bloco: 'B', texto: 'Ausência de subcontratação irregular identificada?', peso: 30 },
  
  // BLOCO C - Segurança
  { id: 'c1', bloco: 'C', texto: 'Uso obrigatório de EPIs específicos para a atividade?', peso: 20 },
  { id: 'c2', bloco: 'C', texto: 'EPCs instalados e em conformidade técnica?', peso: 20 },
  
  // BLOCO D - Postura da Obra
  { id: 'd1', bloco: 'D', texto: 'Canteiro organizado e sinalizado corretamente?', peso: 10 },
  { id: 'd2', bloco: 'D', texto: 'Equipe demonstra conhecimento dos protocolos de risco?', peso: 15 },
  
  // BLOCO E - Documentação
  { id: 'e1', bloco: 'E', texto: 'Fichas de entrega de EPI atualizadas no local?', peso: 15 },
  { id: 'e2', bloco: 'E', texto: 'Certificados de treinamento (NRs) disponíveis?', peso: 15 },
];

export const BLOCKS = {
  A: 'Controle de Acesso',
  B: 'Conformidade de Equipe',
  C: 'Segurança',
  D: 'Postura da Obra',
  E: 'Documentação em Campo'
};
