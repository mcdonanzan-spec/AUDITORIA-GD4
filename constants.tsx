
import { Question } from './types';

export const QUESTIONS: Question[] = [
  // BLOCO A - Controle de Acesso (GD4)
  { id: 'a1', bloco: 'A', texto: 'Bloqueio automático por pendência documental no GD4 está operando sem liberações manuais?', peso: 25 },
  { id: 'a2', bloco: 'A', texto: 'Identificação facial/biométrica utilizada por 100% dos terceiros?', peso: 15 },
  { id: 'a3', bloco: 'A', texto: 'Controle de "esquecimento de cartão/biometria" possui registro fotográfico e justificativa no sistema?', peso: 10 },
  
  // BLOCO B - Conformidade de Equipe
  // (Lógica numérica tratada no Wizard, perguntas adicionais abaixo)
  { id: 'b3', bloco: 'B', texto: 'Relação de funcionários em campo bate com o RE (Registro de Empregados) validado no GD4?', peso: 20 },
  { id: 'b4', bloco: 'B', texto: 'Ausência de trabalhadores em "status pendente" ou "em integração" circulando na obra?', peso: 30 },
  
  // BLOCO C - Gestão de Subcontratação
  { id: 'c1', bloco: 'C', texto: 'Identificada "quarteirização" (sub da sub) não autorizada ou sem contrato no GD4?', peso: 30 },
  { id: 'c2', bloco: 'C', texto: 'Empresas terceiras possuem contrato de prestação de serviços ativo e dentro da vigência?', peso: 20 },
  
  // BLOCO D - Postura e Identificação
  { id: 'd1', bloco: 'D', texto: 'Todos os colaboradores portam crachá com QR Code de consulta rápida ao status GD4?', peso: 15 },
  { id: 'd2', bloco: 'D', texto: 'Uniforme e identificação da empresa em campo coincidem com a contratada original?', peso: 10 },
  
  // BLOCO E - Auditoria de Vínculo e Medição
  { id: 'e1', bloco: 'E', texto: 'Documentação mensal (GFIP/FGTS) da empresa está 100% atualizada no sistema?', peso: 25 },
  { id: 'e2', bloco: 'E', texto: 'Verificada compatibilidade entre função exercida em campo e o CBO registrado no GD4?', peso: 15 },
];

export const BLOCKS = {
  A: 'Controle de Acesso (GD4)',
  B: 'Conformidade de Equipe',
  C: 'Gestão de Subcontratação',
  D: 'Identificação e Postura',
  E: 'Auditoria de Vínculo'
};
