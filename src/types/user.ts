export type Role = 'admin' | 'tecnico' | 'assistente' | 'estagiario' | 'gestor' | 'analista' | 'supervisor' | 'comprador';
export type Department = 'TI' | 'Manutenção' | 'Limpeza' | 'Supervisão' | 'Compras';
export type Category = 'TI' | 'Manutenção' | 'Limpeza' | 'Supervisão' | 'Compras';

export type AppModule = 
  | 'chamados'            // Dashboard Geral de Chamados (TI, Manutenção, Limpeza)
  | 'compras_solicitar'   // Apenas Solicitar Compras & Acompanhar Histórico/Andamento (Supervisor/Solicitante)
  | 'compras_atender'     // Atendimento, Cotação Fluig & Aprovação de Compras (Comprador)
  | 'compras'             // Aba Geral de Compras (Compatibilidade)
  | 'emprestimos'         // Empréstimos de Equipamentos
  | 'supervisao'          // Supervisão
  | 'agendamento'         // Agendamento de Ambientes
  | 'painel_aulas'        // Painel de Aulas
  | 'users';              // Gestão de Usuários (Admin)

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: Role;
  unit?: string;
  departments?: Department[];
  allowed_modules?: AppModule[];
}

export interface AvailableModuleOption {
  id: AppModule;
  label: string;
  description: string;
  badge?: string;
  badgeColor?: string;
  warning?: string;
}

export const AVAILABLE_MODULES: AvailableModuleOption[] = [
  { 
    id: 'chamados', 
    label: 'Dashboard de Chamados', 
    description: 'Visualizar e atender chamados de TI, Manutenção e Limpeza' 
  },
  { 
    id: 'compras_solicitar', 
    label: 'Solicitar Compras & Acompanhamento (Supervisor / Solicitante)', 
    description: 'Permite criar novos pedidos de compras para turmas/cursos e acompanhar histórico, status e solicitar andamento. NÃO permite alterar status, cotar Fluig ou aprovar pedidos.',
    badge: 'Apenas Solicitação & Acompanhamento',
    badgeColor: 'bg-indigo-100 text-indigo-800 border-indigo-200'
  },
  { 
    id: 'compras_atender', 
    label: 'Atendimento, Cotação Fluig & Aprovação de Compras (Comprador)', 
    description: 'Permite ao setor de compras atender pedidos, vincular número do Fluig, alterar status de entrega, aprovar e enviar informativos. (ATENÇÃO: Segregação de Funções - Quem solicita NÃO deve ter essa permissão).',
    badge: 'Atendimento & Aprovação (Comprador)',
    badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    warning: 'Por conformidade (Segregação de Funções), o solicitante não pode aprovar ou atender a própria compra.'
  },
  { 
    id: 'emprestimos', 
    label: 'Empréstimos de Equipamentos', 
    description: 'Autorizar, liberar e receber devoluções de equipamentos de TI' 
  },
  { 
    id: 'supervisao', 
    label: 'Supervisão', 
    description: 'Gestão e chamados do setor de supervisão escolar' 
  },
  { 
    id: 'agendamento', 
    label: 'Agendamento de Ambientes', 
    description: 'Consulta e agendamento de salas, auditório e laboratórios' 
  },
  { 
    id: 'painel_aulas', 
    label: 'Painel de Aulas', 
    description: 'Visualização da grade de aulas e ambientes em tempo real' 
  },
  { 
    id: 'users', 
    label: 'Gestão de Usuários & Perfis', 
    description: 'Cadastrar novos usuários, redefinir senhas e gerenciar permissões de abas' 
  },
];

export function hasModuleAccess(user: UserProfile | null | undefined, module: AppModule): boolean {
  if (!user) return false;
  if (user.role === 'admin') return true;

  if (Array.isArray(user.allowed_modules) && user.allowed_modules.length > 0) {
    if (user.allowed_modules.includes(module)) return true;

    if (module === 'compras') {
      return user.allowed_modules.includes('compras_solicitar') ||
             user.allowed_modules.includes('compras_atender') ||
             user.allowed_modules.includes('compras');
    }

    if (user.allowed_modules.includes('compras')) {
      if (module === 'compras_solicitar' && user.role !== 'comprador') return true;
      if (module === 'compras_atender' && user.role === 'comprador') return true;
    }

    return false;
  }

  if (module === 'users') {
    return false;
  }
  if (module === 'compras_solicitar') {
    return user.role === 'supervisor' || user.role === 'gestor';
  }
  if (module === 'compras_atender') {
    return user.role === 'comprador' || (user.departments?.includes('Compras') ?? false);
  }
  if (module === 'compras') {
    return user.role === 'comprador' || user.role === 'supervisor' || user.role === 'gestor' || (user.departments?.includes('Compras') ?? false);
  }
  if (module === 'emprestimos') {
    return (user.departments?.includes('TI') ?? false) || user.role === 'gestor';
  }
  if (module === 'supervisao') {
    return user.role === 'supervisor' || (user.departments?.includes('Supervisão') ?? false);
  }
  if (module === 'chamados') {
    return user.role !== 'comprador';
  }
  if (module === 'agendamento' || module === 'painel_aulas') {
    return true;
  }
  return false;
}
