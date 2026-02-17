
import { Question } from './types';

export const QUESTIONS: Question[] = [
  // BLOCO A - PORTARIA E ACESSO
  { id: 'a0', bloco: 'A', texto: 'A estrutura física e sistemas da portaria estão aptos ao controle (Catraca/Guarita)?', peso: 30, requiresPhotos: true, minPhotos: 3 },
  { id: 'a1', bloco: 'A', texto: 'As catracas operam sem liberações manuais (Acesso 100% sistêmico)?', peso: 25 },
  { id: 'a2', bloco: 'A', texto: 'Todos os terceiros estão com a biometria facial cadastrada?', peso: 20 },
  
  // BLOCO B - GESTÃO DE EFETIVO
  { id: 'b3', bloco: 'B', texto: 'O efetivo em campo é integralmente composto por funcionários com RE validado no GD4?', peso: 20 },
  { id: 'b4', bloco: 'B', texto: 'A obra está livre de trabalhadores com status "pendente" circulando em frentes de serviço?', peso: 30 },
  
  // BLOCO C - SUBCONTRATAÇÃO
  { id: 'c1', bloco: 'C', texto: 'Toda subcontratação (quarteirização) possui contrato assinado digitalmente e autorizado no GD4?', peso: 30 },
  
  // BLOCO E - TÉCNICO DE CAMPO
  { id: 'e1', bloco: 'E', texto: 'O controle de ponto dos empreiteiros é feito IN Loco na Obra?', peso: 40, requiresPhotos: true, minPhotos: 2 },

  // BLOCO F - GOVERNANÇA GRD (ITENS 01 E 02)
  { id: 'f_h1', bloco: 'F', texto: 'Todas as empresas presentes possuem Termo de Qualificação válido (Item 01 GRD)?', peso: 25 },
  { id: 'f_h2', bloco: 'F', texto: 'A manutenção da documentação da MÃO DE OBRA PRÓPRIA está atualizada no sistema (Item 02 GRD)?', peso: 30 },
  { id: 'f_h3', bloco: 'F', texto: 'As certidões negativas (CND, CRF, CNDT) das contratadas estão dentro da validade no sistema?', peso: 20 },
  { id: 'f_h4', bloco: 'F', texto: 'Os treinamentos obrigatórios (NRs) dos funcionários próprios estão com certificados válidos no GD4?', peso: 25 },
];

export const INTERVIEW_QUESTIONS: Question[] = [
  { id: 'g1', bloco: 'G', texto: 'Recebimento integral de Benefícios (VT/VR) na data certa?', peso: 15 },
  { id: 'g2', bloco: 'G', texto: 'Valor recebido em conta coincide com o Holerite assinado?', peso: 15 },
  { id: 'g3', bloco: 'G', texto: 'Condições de Alojamento e Refeitório são dignas?', peso: 10 },
  { id: 'g4', bloco: 'G', texto: 'Passou por treinamento de segurança (Integração) antes de iniciar?', peso: 10 },
  { id: 'g5', bloco: 'G', texto: 'Utiliza uniforme padrão com logomarca visível e em bom estado?', peso: 25 },
  { id: 'g6', bloco: 'G', texto: 'A logomarca no uniforme coincide com a Razão Social da empresa informada?', peso: 25 },
];

export const BLOCKS = {
  A: 'Portaria e Acesso',
  B: 'Gestão de Efetivo',
  C: 'Subcontratação',
  E: 'Técnico de Campo',
  F: 'Governança GRD (01 e 02)',
  G: 'Amostragem Operacional'
};
