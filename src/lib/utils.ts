import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const STATUS_COLORS = {
  aberto: "bg-emerald-500",
  pendente: "bg-amber-500",
  em_atendimento: "bg-blue-500",
  concluido: "bg-slate-400",
};

export const STATUS_LABELS = {
  aberto: "Aberto",
  pendente: "Pendente",
  em_atendimento: "Em Atendimento",
  concluido: "Concluído",
};

export const PRIORITY_COLORS = {
  baixo: "bg-slate-100 text-slate-600 border-slate-200",
  medio: "bg-amber-100 text-amber-700 border-amber-200",
  urgente: "bg-red-100 text-red-700 border-red-200",
};

export const PRIORITY_LABELS = {
  baixo: "Baixo",
  medio: "Médio",
  urgente: "Urgente",
};

export const SLA_MS = 48 * 60 * 60 * 1000;

export function formatDuration(ms: number) {
  if (ms < 0) ms = 0;
  const seconds = Math.floor((ms / 1000) % 60);
  const minutes = Math.floor((ms / (1000 * 60)) % 60);
  const hours = Math.floor(ms / (1000 * 60 * 60));

  const parts = [];
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (seconds > 0 || parts.length === 0) parts.push(`${seconds}s`);
  
  return parts.join(" ");
}

export function formatSLA(activeTimeMs: number) {
  const remaining = SLA_MS - activeTimeMs;
  if (remaining <= 0) return "SLA Expirado";
  return formatDuration(remaining);
}
