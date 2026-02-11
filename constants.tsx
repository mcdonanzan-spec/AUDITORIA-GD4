
import { Question } from './types';

export const QUESTIONS: Question[] = [
  // BLOCO A - Controle de Acesso (GD4)
  { id: 'a1', bloco: 'A', texto: 'O bloqueio automático por pendência documental no GD4 está operando sem liberações manuais na catraca?', peso: 25 },
  { id: 'a2', bloco: 'A', texto: 'A identificação biométrica/facial é utilizada obrigatoriamente por 100% dos terceiros?', peso: 15 },
  { id: 'a3', bloco: 'A', texto: 'O controle de acessos eventuais (esquecimento/visitante) possui registro fotográfico e justificativa sistêmica?', peso: 10 },
  
  // BLOCO B - Conformidade de Equipe
  { id: 'b3', bloco: 'B', texto: 'O efetivo em campo é integralmente composto por funcionários com RE (Registro de Empregados) validado no GD4?', peso: 20 },
  { id: 'b4', bloco: 'B', texto: 'A obra está livre de trabalhadores com status "pendente" ou "em integração" circulando nas frentes de serviço?', peso: 30 },
  
  // BLOCO C - Gestão de Subcontratação
  { id: 'c1', bloco: 'C', texto: 'Toda subcontratação em campo (quarteirização) possui autorização prévia e contrato ativo devidamente registrado no GD4?', peso: 30 },
  { id: 'c2', bloco: 'C', texto: 'As empresas terceiras em atividade possuem contrato de prestação de serviços dentro da vigência jurídica?', peso: 20 },
  
  // BLOCO D - Identificação e Postura
  { id: 'd1', bloco: 'D', texto: 'Todos os colaboradores em campo utilizam uniforme padrão com a logomarca visível da empresa contratada?', peso: 15 },
  { id: 'd2', bloco: 'D', texto: 'A empresa identificada no uniforme do colaborador coincide exatamente com a Razão Social cadastrada no sistema GD4?', peso: 10 },
  
  // BLOCO E - Auditoria de Vínculo
  { id: 'e1', bloco: 'E', texto: 'A documentação mensal obrigatória (GFIP/FGTS/Folha) está 100% atualizada e aprovada no GD4?', peso: 25 },
  { id: 'e2', bloco: 'E', texto: 'A função exercida em campo pelo colaborador é compatível com o CBO registrado no sistema?', peso: 15 },
];

export const BLOCKS = {
  A: 'Controle de Acesso (GD4)',
  B: 'Conformidade de Equipe',
  C: 'Gestão de Subcontratação',
  D: 'Identificação e Postura',
  E: 'Auditoria de Vínculo'
};
