
import { Question } from './types';

export const QUESTIONS: Question[] = [
  // BLOCO A - PORTARIA E ACESSO
  { id: 'a0', bloco: 'A', texto: 'O controle de acesso na portaria (catraca/guarita) está operacional?', peso: 30, requiresPhotos: true, minPhotos: 3 },
  { id: 'a1', bloco: 'A', texto: 'Todas as liberações de catraca são feitas pelo sistema (sem intervenção manual)?', peso: 25 },
  { id: 'a2', bloco: 'A', texto: 'Todos os trabalhadores terceiros possuem biometria facial cadastrada no sistema?', peso: 20 },
  
  // BLOCO B - GESTÃO DE EFETIVO
  { id: 'b1', bloco: 'B', texto: 'O número de trabalhadores no campo está alinhado ao registrado no GD4 (diferença menor que 5%)?', peso: 20 },
  { id: 'b4', bloco: 'B', texto: 'Existem trabalhadores com status "Pendente" ou "Bloqueado" atuando na obra?', peso: 50, inverted: true },
  
  // BLOCO E - TÉCNICO DE CAMPO
  { id: 'e1', bloco: 'E', texto: 'O ponto dos empreiteiros é registrado diretamente na obra (in loco)?', peso: 40, requiresPhotos: true, minPhotos: 2 },

  // BLOCO F - GOVERNANÇA GRD (ITENS 01 E 02)
  { id: 'f_h1', bloco: 'F', texto: 'Todas as empresas na obra possuem Termo de Qualificação válido (Item 01 GRD)?', peso: 25 },
  { id: 'f_h2', bloco: 'F', texto: 'A documentação da mão de obra própria está atualizada no sistema (Item 02 GRD)?', peso: 30 },
  { id: 'f_h3', bloco: 'F', texto: 'As certidões negativas das contratadas (CND, CRF, CNDT) estão válidas no sistema?', peso: 20 },
  { id: 'f_h4', bloco: 'F', texto: 'Os certificados de treinamentos obrigatórios (NRs) dos funcionários próprios estão válidos no GD4?', peso: 25 },

  // BLOCO H - DIAGNÓSTICO DE QUARTEIRIZAÇÃO (PÓS-AMOSTRAGEM)
  { id: 'h1', bloco: 'H', texto: 'Toda quarteirização detectada possui contrato autorizado no GD4?', peso: 50, requiresPhotos: true, minPhotos: 1 },
];

export const INTERVIEW_QUESTIONS: Question[] = [
  { id: 'g1', bloco: 'G', texto: 'Recebeu vale-transporte e vale-refeição integralmente e na data correta?', peso: 15 },
  { id: 'g2', bloco: 'G', texto: 'O valor depositado na conta bancária corresponde ao holerite assinado?', peso: 15 },

  { id: 'g4', bloco: 'G', texto: 'Realizou treinamento de integração de segurança antes de iniciar as atividades?', peso: 10 },
  { id: 'g5', bloco: 'G', texto: 'Está usando uniforme padrão com logomarca visível e em boas condições?', peso: 25 },
  { id: 'g6', bloco: 'G', texto: 'A logomarca no uniforme corresponde à empresa contratante informada?', peso: 25 },
];

export const BLOCKS = {
  A: 'Portaria e Acesso',
  B: 'Gestão de Efetivo',
  E: 'Técnico de Campo',
  F: 'Governança GRD (01 e 02)',
  G: 'Amostragem Operacional',
  H: 'Diagnóstico de Quarteirização'
};
