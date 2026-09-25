import { Category } from "./user";

export type Status = 'aberto' | 'pendente' | 'em_atendimento' | 'concluido' | 'recusado';
export type Priority = 'baixo' | 'medio' | 'urgente';

export interface Comment {
  id: string;
  author_name: string;
  author_role: string;
  message: string;
  created_at: string;
}

export interface Ticket {
  id: string;
  numeric_id?: number;
  unit?: 'PORTO';
  requester_name: string;
  email?: string;
  phone: string;
  location?: string;
  equipment?: string;
  category?: Category;
  description?: string;
  priority: Priority;
  urgent_explanation?: string;
  status: Status;
  technician_name?: string;
  assigned_technician_id?: string;
  created_at: string;
  completed_at?: string;
  total_time_ms: number;
  last_status_change_at: string;
  comments?: Comment[];
  evidenceUrls?: string[];
  evidencePaths?: string[];
  registration?: string;
  reason?: string;
}
