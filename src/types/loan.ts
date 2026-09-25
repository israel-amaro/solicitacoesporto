export interface Loan {
  id: string;
  requester_name: string;
  registration: string;
  email: string;
  phone: string;
  equipment: string;
  location: string;
  reason: string;
  status: 'pendente' | 'autorizado' | 'liberado' | 'em_uso' | 'concluido' | 'recusado';

  // Autorização
  terms?: string;
  pin?: string;
  authorized_by?: string;
  authorized_at?: string;

  // Reprovação
  rejected_by?: string;
  rejected_at?: string;
  rejection_reason?: string;

  // Assinatura / liberação
  signature_name?: string;
  signature_registration?: string;
  signature_email?: string;
  signature_date?: string;   // ISO, timestamp do servidor
  released_at?: string;

  // Checklists
  checklist_initial?: string;
  checklist_initial_at?: string;
  checklist_return?: string;
  checklist_return_at?: string;

  // Devolução
  return_condition?: 'sim' | 'nao';
  return_problem?: string;
  completed_by?: string;
  completed_at?: string;
  completed_via?: 'pin' | 'gestor_manual';

  created_at: string;
  logs: { action: string; user: string; timestamp: string; details?: string }[];
}
