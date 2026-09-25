import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Search,
  CheckCircle2,
  Timer,
  Clock,
  MapPin,
  User,
  ChevronRight
} from 'lucide-react';
import { Card, Badge, Sidebar } from '../ui';
import { cn, STATUS_COLORS, STATUS_LABELS, PRIORITY_COLORS, PRIORITY_LABELS, SLA_MS, formatSLA } from '../../lib/utils';
import { Ticket, Priority, Status, Category, UserProfile } from '../../types';

interface DashboardViewProps {
  view: string;
  setView: (view: any) => void;
  user: UserProfile | null;
  token: string | null;
  tickets: Ticket[];
  selectedUnit: string;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  filterPriority: Priority | 'all';
  setFilterPriority: (p: Priority | 'all') => void;
  filterStatus: Status | 'all';
  setFilterStatus: (s: Status | 'all') => void;
  filterCategory: Category | 'all';
  setFilterCategory: (c: Category | 'all') => void;
  calculateActiveTime: (ticket: Ticket) => number;
  handleTicketClick: (ticket: Ticket) => void;
  setShowPasswordModal: (show: boolean) => void;
  handleLogout: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  view,
  setView,
  user,
  tickets,
  selectedUnit,
  searchTerm,
  setSearchTerm,
  filterPriority,
  setFilterPriority,
  filterStatus,
  setFilterStatus,
  filterCategory,
  setFilterCategory,
  calculateActiveTime,
  handleTicketClick,
  setShowPasswordModal,
  handleLogout,
}) => {
  const filteredTickets = tickets.filter(t => {
    const matchesSearch =
      (t.equipment?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (t.reason?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (t.requester_name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (t.numeric_id?.toString() || t.id?.toString() || '').includes(searchTerm);

    const matchesPriority = filterPriority === 'all' || t.priority === filterPriority;
    const matchesStatus = filterStatus === 'all' ? t.status !== 'concluido' : t.status === filterStatus;
    const matchesUnit =
      t.unit === selectedUnit ||
      t.department === selectedUnit ||
      !t.unit; // chamados sem unidade definida sempre aparecem


    const matchesCategory =
      filterCategory === 'all'
        ? (user?.role === 'admin' || user?.role === 'gestor'
            ? true
            : user?.departments?.includes(t.category as any))
        : t.category === filterCategory;

    return matchesSearch && matchesPriority && matchesStatus && matchesUnit && matchesCategory;
  });

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <Sidebar
        view={view}
        setView={setView}
        user={user}
        setShowPasswordModal={setShowPasswordModal}
        handleLogout={handleLogout}
      />

      <main className="flex-1 p-6 md:p-10 overflow-auto">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Fila de Chamados - {selectedUnit}</h1>
            <p className="text-slate-500">Gerencie as solicitações em aberto e pendentes.</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="bg-white border border-slate-200 rounded-xl px-4 py-2 flex items-center gap-2 focus-within:ring-2 focus-within:ring-blue-100 transition-all">
              <Search className="w-4 h-4 text-slate-400" />
              <input
                placeholder="Buscar chamado..."
                className="outline-none text-sm bg-transparent w-full md:w-64"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </header>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div className="flex bg-white p-1 rounded-2xl border border-slate-200 overflow-x-auto">
            {user?.role === 'admin' || user?.role === 'gestor' ? (
              (['all', 'TI', 'Manutenção', 'Limpeza', 'Supervisão'] as const).map((cat) => (
                <button
                  key={cat}
                  onClick={() => setFilterCategory(cat as any)}
                  className={cn(
                    "px-4 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap",
                    filterCategory === cat
                      ? "bg-blue-600 text-white shadow-lg shadow-blue-200"
                      : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
                  )}
                >
                  {cat === 'all' ? 'Todos' : cat}
                </button>
              ))
            ) : (
              <div className="flex gap-1">
                {user?.departments?.map(dept => (
                  <button
                    key={dept}
                    onClick={() => setFilterCategory(dept as any)}
                    className={cn(
                      "px-6 py-2.5 rounded-xl text-sm font-bold transition-all",
                      filterCategory === dept
                        ? "bg-blue-600 text-white shadow-lg shadow-blue-200"
                        : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
                    )}
                  >
                    {dept}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <select
              className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100"
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value as any)}
            >
              <option value="all">Todas Prioridades</option>
              <option value="baixo">Baixo</option>
              <option value="medio">Médio</option>
              <option value="urgente">Urgente</option>
            </select>
            <select
              className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
            >
              <option value="all">Ativos (Não Concluídos)</option>
              <option value="aberto">Abertos</option>
              <option value="pendente">Pendentes</option>
              <option value="em_atendimento">Em Atendimento</option>
              <option value="concluido">Concluídos</option>
            </select>
          </div>
        </div>

        <div className="grid gap-4">
          <AnimatePresence mode="popLayout">
            {filteredTickets.map((ticket) => {
              const activeTime = calculateActiveTime(ticket);
              const isOverdue = activeTime > SLA_MS && ticket.status !== 'concluido';

              return (
                <motion.div
                  key={ticket.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                >
                  <Card
                    className={cn(
                      "hover:border-blue-300 hover:shadow-md transition-all cursor-pointer group border-slate-200",
                      isOverdue && "bg-red-50 border-red-300 ring-1 ring-red-200"
                    )}
                    onClick={() => handleTicketClick(ticket)}
                  >
                    <div className="p-5 flex flex-col md:flex-row md:items-center gap-6">
                      <div className="flex items-center gap-4 min-w-[120px]">
                        <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center font-bold text-slate-600 border border-slate-100">
                          #{ticket.numeric_id || ticket.id}
                        </div>
                        <div className={cn("w-3 h-3 rounded-full", STATUS_COLORS[ticket.status])} />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-1">
                          <h3 className="font-bold text-slate-900 truncate text-lg">{ticket.equipment || ticket.reason?.substring(0, 30)}</h3>
                          <Badge className={cn("border", PRIORITY_COLORS[ticket.priority])}>
                            {PRIORITY_LABELS[ticket.priority]}
                          </Badge>
                          <Badge className="bg-slate-100 text-slate-600 border-slate-200 text-[10px] h-5">
                            {ticket.category || 'TI'}
                          </Badge>
                        </div>
                        <div className="flex flex-wrap gap-y-2 gap-x-4">
                          <span className="flex items-center gap-1.5 text-sm text-slate-500">
                            <User className="w-3.5 h-3.5" /> {ticket.requester_name}
                          </span>
                          <span className="flex items-center gap-1.5 text-sm text-slate-500">
                            <MapPin className="w-3.5 h-3.5" /> {ticket.location}
                          </span>
                          <span className="flex items-center gap-1.5 text-sm text-slate-500">
                            <Clock className="w-3.5 h-3.5" /> {new Date(ticket.created_at).toLocaleDateString()}
                          </span>
                          <span className={cn("flex items-center gap-1.5 text-sm font-bold", isOverdue ? "text-red-600" : "text-blue-600")}>
                            <Timer className="w-3.5 h-3.5" /> {formatSLA(activeTime)}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-6">
                        <div className="text-right hidden sm:block">
                          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Status</p>
                          <p className={cn("font-bold",
                            ticket.status === 'aberto' ? 'text-emerald-600' :
                            ticket.status === 'pendente' ? 'text-amber-600' :
                            'text-blue-600'
                          )}>
                            {STATUS_LABELS[ticket.status]}
                          </p>
                        </div>
                        <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-blue-500 transition-colors" />
                      </div>
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {filteredTickets.length === 0 && (
            <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-slate-200">
              <CheckCircle2 className="w-12 h-12 text-slate-200 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-slate-400">Tudo limpo por aqui!</h3>
              <p className="text-slate-400">Não há chamados pendentes no momento.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};
