
import { Question } from './types';

export const QUESTIONS: Question[] = [
  // BLOCO A - Controle de Acesso (GD4)
  { id: 'a1', bloco: 'A', texto: 'O bloqueio automático por pendência documental no GD4 está operando sem liberações manuais na catraca?', peso: 25 },
  { id: 'a2', bloco: 'A', texto: 'A identificação biométrica/facial é utilizada obrigatoriamente por 100% dos terceiros?', peso: 15 },
  { id: 'a3', bloco: 'A', texto: 'O controle de acessos eventuais possui registro fotográfico e justificativa no sistema?', peso: 10 },
  
  // BLOCO B - Conformidade de Equipe
  { id: 'b3', bloco: 'B', texto: 'O efetivo em campo é integralmente composto por funcionários com RE validado no GD4?', peso: 20 },
  { id: 'b4', bloco: 'B', texto: 'A obra está livre de trabalhadores com status "pendente" ou "em integração" circulando em frentes de serviço?', peso: 30 },
  
  // BLOCO C - Gestão de Subcontratação (GRD Item 2.1)
  { id: 'c1', bloco: 'C', texto: 'Toda subcontratação (quarteirização) possui contrato assinado digitalmente e autorizado no GD4?', peso: 30 },
  { id: 'c2', bloco: 'C', texto: 'As empresas terceiras em atividade possuem contrato de prestação de serviços dentro da vigência jurídica?', peso: 20 },
  
  // BLOCO D - Identificação e Postura (Unità Branding)
  { id: 'd1', bloco: 'D', texto: 'Todos os colaboradores utilizam uniforme padrão com logomarca visível e em bom estado?', peso: 15 },
  { id: 'd2', bloco: 'D', texto: 'A logomarca no uniforme coincide com a Razão Social cadastrada no sistema (Prevenção de Vínculo)?', peso: 10 },
  
  // BLOCO E - Auditoria de Vínculo e GRD (Itens 2.7 e 3.5)
  { id: 'e1', bloco: 'E', texto: 'O controle de ponto em campo está sendo preenchido em tempo real, evitando o "horário britânico" proibido na GRD?', peso: 25 },
  { id: 'e2', bloco: 'E', texto: 'Os EPIs utilizados em campo (C.A.) coincidem exatamente com o registrado na Ficha de EPI (NR 06)?', peso: 15 },
  { id: 'e3', bloco: 'E', texto: 'O colaborador demonstra conhecimento prático dos riscos informados em sua Ordem de Serviço (OSST)?', peso: 10 },
];

export const BLOCKS = {
  A: 'Controle de Acesso (GD4)',
  B: 'Conformidade de Equipe',
  C: 'Gestão de Subcontratação',
  D: 'Identificação e Postura',
  E: 'Auditoria Técnica de Campo'
};
