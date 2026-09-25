import React from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Timer,
  User,
  Phone,
  Mail,
  MessageSquare,
  FileText,
  Hash,
  Monitor
} from 'lucide-react';
import { Button, Card, Badge } from '../ui';
import { cn, STATUS_COLORS, STATUS_LABELS, PRIORITY_COLORS, PRIORITY_LABELS, formatDuration, SLA_MS, formatSLA } from '../../lib/utils';
import { Ticket, Priority, Status } from '../../types';

interface TicketDetailViewProps {
  selectedTicket: Ticket | null;
  token: string | null;
  setView: (view: any) => void;
  calculateActiveTime: (ticket: Ticket) => number;
  updateStatus: (id: string, status: Status) => void;
  updatePriority: (id: string, priority: Priority) => void;
  assignToMe: (id: string) => void;
  addComment: (e: React.FormEvent<HTMLFormElement>) => void;
}

export const TicketDetailView: React.FC<TicketDetailViewProps> = ({
  selectedTicket,
  token,
  setView,
  calculateActiveTime,
  updateStatus,
  updatePriority,
  assignToMe,
  addComment,
}) => {
  if (!selectedTicket) return null;

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <main className="flex-1 p-6 md:p-10 max-w-5xl mx-auto">
        <Button variant="ghost" onClick={() => setView('dashboard')} className="mb-6">
          <ArrowLeft className="w-4 h-4" /> Voltar para Fila
        </Button>

        <div className="grid md:grid-cols-3 gap-8">
          <div className="md:col-span-2 space-y-6">
            <Card className="p-8">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center font-bold text-xl">
                    #{selectedTicket.numeric_id || selectedTicket.id}
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-slate-900">{selectedTicket.equipment}</h2>
                    <div className="flex items-center gap-2">
                      <p className="text-slate-500">{selectedTicket.unit} - {selectedTicket.location}</p>
                      <span className="text-slate-300">•</span>
                      <Badge className={cn("border", PRIORITY_COLORS[selectedTicket.priority])}>
                        {PRIORITY_LABELS[selectedTicket.priority]}
                      </Badge>
                      <Badge className="bg-slate-100 text-slate-600 border-slate-200">
                        {selectedTicket.category || 'TI'}
                      </Badge>
                    </div>
                  </div>
                </div>
                <Badge className={cn("text-white px-4 py-1.5 text-xs", STATUS_COLORS[selectedTicket.status])}>
                  {STATUS_LABELS[selectedTicket.status]}
                </Badge>
              </div>

              <div className="space-y-6">
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                    {['Limpeza', 'Supervisão'].includes(selectedTicket.category!) ? 'Motivo da Solicitação' : 'Descrição do Problema'}
                  </h4>
                  <p className="text-slate-700 leading-relaxed">
                    {['Limpeza', 'Supervisão'].includes(selectedTicket.category!) ? selectedTicket.reason : selectedTicket.description}
                  </p>
                </div>

                {selectedTicket.urgent_explanation && (
                  <div className="p-4 bg-red-50 rounded-2xl border border-red-100">
                    <h4 className="text-xs font-bold text-red-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4" /> Explicação da Urgência
                    </h4>
                    <p className="text-red-700 leading-relaxed italic">{selectedTicket.urgent_explanation}</p>
                  </div>
                )}

                {selectedTicket.evidenceUrls && selectedTicket.evidenceUrls.length > 0 && (
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Evidências Anexadas</h4>
                    <div className="flex flex-wrap gap-4">
                      {selectedTicket.evidenceUrls.map((url, index) => {
                        const proxyUrl = `/api/files?url=${encodeURIComponent(url)}&token=${token}`;
                        return (
                          <a
                            key={index}
                            href={proxyUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors text-sm font-medium text-blue-600"
                          >
                            <FileText className="w-4 h-4" />
                            Anexo {index + 1}
                          </a>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 border border-slate-100 rounded-2xl">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Solicitante</h4>
                    <div className="space-y-1">
                      <p className="font-bold text-slate-900 flex items-center gap-2"><User className="w-4 h-4 text-slate-400" /> {selectedTicket.requester_name}</p>
                      {selectedTicket.registration && (
                        <p className="text-sm text-slate-500 flex items-center gap-2"><Hash className="w-4 h-4 text-slate-400" /> Matrícula: {selectedTicket.registration}</p>
                      )}
                      {selectedTicket.email && (
                        <p className="text-sm text-slate-500 flex items-center gap-2"><Mail className="w-4 h-4 text-slate-400" /> {selectedTicket.email}</p>
                      )}
                      <p className="text-sm text-slate-500 flex items-center gap-2"><Phone className="w-4 h-4 text-slate-400" /> {selectedTicket.phone}</p>
                    </div>
                  </div>
                  <div className="p-4 border border-slate-100 rounded-2xl">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Atendimento</h4>
                    <div className="space-y-1">
                      <p className="font-bold text-slate-900 flex items-center gap-2">
                        <Monitor className="w-4 h-4 text-slate-400" />
                        {selectedTicket.technician_name || 'Não atribuído'}
                      </p>
                      <p className="text-sm text-slate-500 flex items-center gap-2">
                        <Timer className="w-4 h-4 text-slate-400" />
                        Tempo: {formatDuration(selectedTicket.total_time_ms)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            {/* Comments Section */}
            <Card className="p-8 space-y-6">
              <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-blue-500" /> Histórico e Comentários
              </h3>
              <div className="space-y-4 max-h-[400px] overflow-auto pr-2">
                {selectedTicket.comments?.map((comment) => (
                  <div key={comment.id} className={cn(
                    "p-4 rounded-2xl",
                    comment.author_role === 'admin' ? "bg-blue-50 border border-blue-100 ml-8" : "bg-slate-50 border border-slate-100 mr-8"
                  )}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-sm text-slate-900">{comment.author_name}</span>
                      <span className="text-[10px] font-bold text-slate-400 uppercase">{new Date(comment.created_at).toLocaleString()}</span>
                    </div>
                    <p className="text-sm text-slate-700">{comment.message}</p>
                  </div>
                ))}
                {(!selectedTicket.comments || selectedTicket.comments.length === 0) && (
                  <p className="text-center py-10 text-slate-400 italic">Nenhum comentário ainda.</p>
                )}
              </div>
              <form onSubmit={addComment} className="flex gap-2 pt-4 border-t border-slate-100">
                <input
                  name="message"
                  required
                  placeholder="Escreva um comentário ou atualização..."
                  className="flex-1 px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white outline-none transition-all"
                />
                <Button type="submit">Enviar</Button>
              </form>
            </Card>
          </div>

          {/* Actions Sidebar */}
          <div className="space-y-6">
            <Card className="p-6 space-y-6">
              <h3 className="font-bold text-slate-900 uppercase text-xs tracking-widest">Ações Rápidas</h3>
              <div className="space-y-3">
                {!selectedTicket.assigned_technician_id ? (
                  <Button onClick={() => assignToMe(selectedTicket.id)} className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 shadow-emerald-100">
                    <CheckCircle2 className="w-5 h-5" /> Assumir este Chamado
                  </Button>
                ) : (
                  <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl flex items-center gap-3">
                    <User className="w-5 h-5 text-blue-600" />
                    <div>
                      <p className="text-xs font-bold text-blue-400 uppercase">Atribuído a</p>
                      <p className="font-bold text-blue-900">{selectedTicket.technician_name}</p>
                    </div>
                  </div>
                )}

                <div className="pt-4 border-t border-slate-100 space-y-3">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Prioridade</p>
                  <div className="grid grid-cols-3 gap-2">
                    {(['baixo', 'medio', 'urgente'] as Priority[]).map(p => (
                      <button
                        key={p}
                        onClick={() => updatePriority(selectedTicket.id, p)}
                        className={cn(
                          "px-2 py-1.5 rounded-lg text-[10px] font-bold uppercase border transition-all",
                          selectedTicket.priority === p ? PRIORITY_COLORS[p] : "bg-white text-slate-400 border-slate-100"
                        )}
                      >
                        {PRIORITY_LABELS[p]}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 space-y-3">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Alterar Status</p>
                  <div className="grid gap-2">
                    <Button
                      variant="secondary"
                      onClick={() => updateStatus(selectedTicket.id, 'em_atendimento')}
                      className={cn("justify-start", selectedTicket.status === 'em_atendimento' && "bg-blue-50 border-blue-200 text-blue-600")}
                    >
                      <div className="w-2 h-2 rounded-full bg-blue-500" /> Em Atendimento
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => updateStatus(selectedTicket.id, 'pendente')}
                      className={cn("justify-start", selectedTicket.status === 'pendente' && "bg-amber-50 border-amber-200 text-amber-600")}
                    >
                      <div className="w-2 h-2 rounded-full bg-amber-500" /> Pendente
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => updateStatus(selectedTicket.id, 'concluido')}
                      className="justify-start hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-200"
                    >
                      <div className="w-2 h-2 rounded-full bg-emerald-500" /> Concluir Chamado
                    </Button>
                  </div>
                </div>
              </div>
            </Card>

            <Card className={cn(
              "p-6 text-white transition-colors duration-500",
              calculateActiveTime(selectedTicket) > SLA_MS ? "bg-red-600" : "bg-blue-600"
            )}>
              <div className="flex items-center gap-3 mb-4">
                <Timer className="w-6 h-6" />
                <h3 className="font-bold text-lg">Tempo de SLA</h3>
              </div>
              <p className="text-3xl font-black tracking-tighter mb-1">
                {formatSLA(calculateActiveTime(selectedTicket))}
              </p>
              <p className={cn(
                "text-xs font-medium",
                calculateActiveTime(selectedTicket) > SLA_MS ? "text-red-100" : "text-blue-200"
              )}>
                {calculateActiveTime(selectedTicket) > SLA_MS ? "SLA Excedido" : "Tempo restante para atendimento"}
              </p>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};
