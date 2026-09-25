export const TICKET_STATUS_COLORS: Record<string, string> = {
  aberto: "bg-emerald-500 text-white",
  pendente: "bg-amber-500 text-white",
  em_atendimento: "bg-blue-500 text-white",
  concluido: "bg-slate-400 text-white",
  recusado: "bg-red-500 text-white"
};

export const TICKET_STATUS_LABELS: Record<string, string> = {
  aberto: "Aberto",
  pendente: "Pendente",
  em_atendimento: "Em Atendimento",
  concluido: "Concluído",
  recusado: "Recusado"
};

export const PURCHASE_STATUS_COLORS: Record<string, string> = {
  pendente: "bg-amber-100 text-amber-800 border-amber-200",
  ciente: "bg-blue-100 text-blue-800 border-blue-200",
  em_andamento: "bg-indigo-100 text-indigo-800 border-indigo-200",
  concluido: "bg-emerald-100 text-emerald-800 border-emerald-200",
  cancelado: "bg-red-100 text-red-800 border-red-200"
};

export const PURCHASE_STATUS_LABELS: Record<string, string> = {
  pendente: "Pendente",
  ciente: "Ciente / Visualizado",
  em_andamento: "Em Andamento (Fluig/Cotação)",
  concluido: "Concluído / Entregue",
  cancelado: "Cancelado"
};

export const LOAN_STATUS_COLORS: Record<string, string> = {
  pendente_autorizacao: "bg-amber-100 text-amber-800 border-amber-200",
  autorizado: "bg-blue-100 text-blue-800 border-blue-200",
  em_uso: "bg-indigo-100 text-indigo-800 border-indigo-200",
  devolvido: "bg-purple-100 text-purple-800 border-purple-200",
  finalizado: "bg-emerald-100 text-emerald-800 border-emerald-200",
  reprovado: "bg-red-100 text-red-800 border-red-200"
};

export const LOAN_STATUS_LABELS: Record<string, string> = {
  pendente_autorizacao: "Pendente Autorização",
  autorizado: "Autorizado (Aguardando PIN)",
  em_uso: "Em Uso",
  devolvido: "Devolvido (Aguardando Conferência)",
  finalizado: "Finalizado",
  reprovado: "Reprovado"
};
