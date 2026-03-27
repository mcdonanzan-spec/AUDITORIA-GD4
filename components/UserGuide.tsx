
import React from 'react';
import { 
  BookOpen, 
  CheckCircle2, 
  Building2, 
  ShieldAlert, 
  BrainCircuit, 
  FileText,
  Users,
  LayoutDashboard,
  ChevronRight,
  ArrowRight
} from 'lucide-react';

interface UserGuideProps {
  onNavigate: (page: string) => void;
}

const UserGuide: React.FC<UserGuideProps> = ({ onNavigate }) => {
  const steps = [
    {
      title: "1. Gestão de Obras",
      description: "O primeiro passo é cadastrar os canteiros ou unidades que serão auditados. Sem obras cadastradas, não é possível iniciar uma inspeção.",
      icon: <Building2 className="text-blue-500" />,
      action: "Ir para Obras",
      page: "obras"
    },
    {
      title: "2. Nova Inspeção",
      description: "Selecione uma obra e preencha o checklist de conformidade. O sistema exige evidências fotográficas em itens críticos para garantir a validade jurídica.",
      icon: <CheckCircle2 className="text-emerald-500" />,
      action: "Iniciar Auditoria",
      page: "new-audit"
    },
    {
      title: "3. Análise por IA",
      description: "Após o envio, nosso motor de IA processa os dados, calcula o passivo financeiro estimado e gera um relatório de risco jurídico detalhado.",
      icon: <BrainCircuit className="text-purple-500" />,
      action: "Ver Dashboard",
      page: "dashboard"
    },
    {
      title: "4. Gestão de Acessos",
      description: "Como Administrador, você pode aprovar novos usuários e definir se eles têm visão Global ou se podem ver apenas obras específicas.",
      icon: <Users className="text-[#F05A22]" />,
      action: "Gerenciar Acessos",
      page: "access"
    }
  ];

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <header className="text-center space-y-4">
        <div className="inline-flex items-center gap-3 px-6 py-2 bg-slate-900 text-white rounded-full text-[10px] font-black uppercase tracking-[0.2em]">
          <BookOpen size={14} className="text-[#F05A22]" />
          Manual de Operação
        </div>
        <h2 className="text-5xl font-black text-slate-900 uppercase tracking-tighter">Como o AuditRisk Funciona</h2>
        <p className="text-slate-500 font-black text-sm uppercase tracking-widest max-w-2xl mx-auto">
          Siga o fluxo de governança para garantir a conformidade total dos seus canteiros.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {steps.map((step, idx) => (
          <div key={idx} className="bg-white p-10 rounded-[3rem] border-4 border-slate-900 shadow-[12px_12px_0px_0px_rgba(15,23,42,1)] flex flex-col justify-between group hover:-translate-y-1 transition-all">
            <div className="space-y-6">
              <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center border-4 border-slate-100 group-hover:border-[#F05A22] transition-all">
                {React.cloneElement(step.icon as React.ReactElement, { size: 32 })}
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight">{step.title}</h3>
                <p className="text-slate-500 font-medium text-sm leading-relaxed">{step.description}</p>
              </div>
            </div>
            
            <button 
              onClick={() => onNavigate(step.page)}
              className="mt-8 flex items-center gap-2 text-[#F05A22] font-black text-xs uppercase tracking-widest hover:gap-4 transition-all"
            >
              {step.action}
              <ArrowRight size={16} />
            </button>
          </div>
        ))}
      </div>

      <div className="bg-slate-900 rounded-[3rem] p-12 text-white overflow-hidden relative">
        <div className="relative z-10 space-y-6 max-w-xl">
          <div className="flex items-center gap-3 text-[#F05A22]">
            <ShieldAlert size={24} />
            <span className="font-black uppercase text-xs tracking-widest">Aviso de Segurança</span>
          </div>
          <h3 className="text-3xl font-black uppercase tracking-tight">Segurança de Dados e Risco</h3>
          <p className="text-slate-400 text-sm leading-relaxed">
            Todas as informações inseridas são criptografadas e armazenadas no Supabase. 
            O relatório gerado pela IA serve como base consultiva para tomada de decisão da diretoria, 
            não substituindo a análise jurídica final de um advogado especializado.
          </p>
          <button 
            onClick={() => onNavigate('dashboard')}
            className="bg-[#F05A22] text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-[6px_6px_0px_0px_rgba(255,255,255,0.2)] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all"
          >
            Entendido, ir ao Dashboard
          </button>
        </div>
        
        {/* Decorative element */}
        <div className="absolute top-0 right-0 w-1/3 h-full bg-gradient-to-l from-[#F05A22]/20 to-transparent pointer-events-none"></div>
        <BrainCircuit size={300} className="absolute -bottom-20 -right-20 text-white/5 pointer-events-none" />
      </div>
    </div>
  );
};

export default UserGuide;
