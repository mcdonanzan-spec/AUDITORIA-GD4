
import { Question } from './types';

export const QUESTIONS: Question[] = [
  // BLOCO A - Controle de Acesso (GD4)
  { id: 'a1', bloco: 'A', texto: 'O bloqueio automático por pendência documental no GD4 está operando sem liberações manuais na catraca?', peso: 25 },
  { id: 'a2', bloco: 'A', texto: 'A identificação biométrica/facial é utilizada obrigatoriamente por 100% dos terceiros?', peso: 15 },
  
  // BLOCO B - Conformidade de Equipe
  { id: 'b3', bloco: 'B', texto: 'O efetivo em campo é integralmente composto por funcionários com RE validado no GD4?', peso: 20 },
  { id: 'b4', bloco: 'B', texto: 'A obra está livre de trabalhadores com status "pendente" circulando em frentes de serviço?', peso: 30 },
  
  // BLOCO C - Gestão de Subcontratação
  { id: 'c1', bloco: 'C', texto: 'Toda subcontratação (quarteirização) possui contrato assinado digitalmente e autorizado no GD4?', peso: 30 },
  
  // BLOCO D - Identificação e Postura
  { id: 'd1', bloco: 'D', texto: 'Todos os colaboradores utilizam uniforme padrão com logomarca visível e em bom estado?', peso: 15 },
  { id: 'd2', bloco: 'D', texto: 'A logomarca no uniforme coincide com a Razão Social cadastrada no sistema (Prevenção de Vínculo)?', peso: 10 },
  
  // BLOCO E - Auditoria Técnica de Campo
  { id: 'e1', bloco: 'E', texto: 'O controle de ponto em campo está sendo preenchido em tempo real (Sem horário britânico)?', peso: 25 },
  { id: 'e2', bloco: 'E', texto: 'Os EPIs utilizados (C.A.) coincidem com o registrado na Ficha de EPI?', peso: 15 },

  // BLOCO F - Validação por Entrevista (Base GRD)
  { id: 'f1', bloco: 'F', texto: 'Entrevista: Colaborador confirma recebimento integral de Benefícios (VT/VR) sem descontos indevidos?', peso: 20 },
  { id: 'f2', bloco: 'F', texto: 'Entrevista: Valor recebido em conta coincide com o Holerite assinado (Inexistência de "Caixa 2")?', peso: 25 },
  { id: 'f3', bloco: 'F', texto: 'Entrevista: Condições de Alojamento/Refeitório são dignas e compatíveis com a norma?', peso: 15 },
  { id: 'f4', bloco: 'F', texto: 'Entrevista: Colaborador confirma ter passado por treinamento de segurança (Integração)?', peso: 10 },
];

export const BLOCKS = {
  A: 'Acesso (GD4)',
  B: 'Efetivo',
  C: 'Subcontratação',
  D: 'Identificação',
  E: 'Técnico Campo',
  F: 'Entrevistas (Validação)'
};
