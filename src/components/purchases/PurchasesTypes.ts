import { UserProfile } from '../../types';

export interface PurchasesProps {
  user: UserProfile | null;
  token: string | null;
  onNavigate: (path: string) => void;
  showMessage: (type: 'success' | 'error', text: string) => void;
}

export const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; border: string }> = {
  pendente: {
    label: 'Pendente',
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-amber-200'
  },
  ciente: {
    label: 'Ciente',
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    border: 'border-blue-200'
  },
  em_andamento: {
    label: 'Em Andamento',
    bg: 'bg-indigo-50',
    text: 'text-indigo-700',
    border: 'border-indigo-200'
  },
  concluido: {
    label: 'Concluído',
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-200'
  },
  cancelado: {
    label: 'Cancelado',
    bg: 'bg-rose-50',
    text: 'text-rose-700',
    border: 'border-rose-200'
  }
};
