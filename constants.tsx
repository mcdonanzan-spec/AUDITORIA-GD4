
import { Question } from './types';

export const QUESTIONS: Question[] = [
  { id: 'a1', bloco: 'A', texto: 'O bloqueio automático por pendência documental no GD4 está operando sem liberações manuais na catraca?', peso: 25 },
  { id: 'a2', bloco: 'A', texto: 'A identificação biométrica/facial é utilizada obrigatoriamente por 100% dos terceiros?', peso: 15 },
  
  { id: 'b3', bloco: 'B', texto: 'O efetivo em campo é integralmente composto por funcionários com RE validado no GD4?', peso: 20 },
  { id: 'b4', bloco: 'B', texto: 'A obra está livre de trabalhadores com status "pendente" circulando em frentes de serviço?', peso: 30 },
  
  { id: 'c1', bloco: 'C', texto: 'Toda subcontratação (quarteirização) possui contrato assinado digitalmente e autorizado no GD4?', peso: 30 },
  
  { id: 'd1', bloco: 'D', texto: 'Todos os colaboradores utilizam uniforme padrão com logomarca visível e em bom estado?', peso: 15 },
  { id: 'd2', bloco: 'D', texto: 'A logomarca no uniforme coincide com a Razão Social cadastrada no sistema?', peso: 10 },
  
  { id: 'e1', bloco: 'E', texto: 'O controle de ponto em campo está sendo preenchido em tempo real (Sem horário britânico)?', peso: 25 },
  { id: 'e2', bloco: 'E', texto: 'Os EPIs utilizados (C.A.) coincidem com o registrado na Ficha de EPI?', peso: 15 },

  // BLOCO F - GOVERNANÇA GRD (ITENS 01 E 02)
  { id: 'f_h1', bloco: 'F', texto: 'Todas as empresas presentes possuem Termo de Qualificação/Habilitação Jurídica válido (Item 01 GRD)?', peso: 25 },
  { id: 'f_h2', bloco: 'F', texto: 'A manutenção da documentação contratual e de segurança da MÃO DE OBRA PRÓPRIA está atualizada no sistema (Item 02 GRD)?', peso: 30 },
  { id: 'f_h3', bloco: 'F', texto: 'As certidões negativas (CND, CRF, CNDT) das contratadas estão dentro da validade no sistema?', peso: 20 },
  { id: 'f_h4', bloco: 'F', texto: 'Os treinamentos obrigatórios (NRs) dos funcionários próprios estão com certificados válidos e inseridos no GD4?', peso: 25 },
];

export const INTERVIEW_QUESTIONS: Question[] = [
  { id: 'g1', bloco: 'G', texto: 'Recebimento integral de Benefícios (VT/VR) na data certa?', peso: 20 },
  { id: 'g2', bloco: 'G', texto: 'Valor recebido em conta coincide com o Holerite assinado?', peso: 25 },
  { id: 'g3', bloco: 'G', texto: 'Condições de Alojamento e Refeitório são dignas?', peso: 15 },
  { id: 'g4', bloco: 'G', texto: 'Passou por treinamento de segurança (Integração) antes de iniciar?', peso: 10 },
];

export const BLOCKS = {
  A: 'Acesso (GD4)',
  B: 'Efetivo',
  C: 'Subcontratação',
  D: 'Identificação',
  E: 'Técnico Campo',
  F: 'Governança GRD (Itens 01 e 02)',
  G: 'Amostragem Comportamental'
};
