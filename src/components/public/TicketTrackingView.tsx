import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  ArrowLeft,
  Search,
  Clock,
  MapPin,
  User,
  Monitor,
  Briefcase
} from 'lucide-react';
import { Button, Card, Badge } from '../ui';
import { STATUS_COLORS, STATUS_LABELS } from '../../lib/utils';
import { Ticket, Status } from '../../types';

interface TicketTrackingViewProps {
  createdTicketId: string | null;
  setCreatedTicketId: (id: string | null) => void;
  setView: (view: string) => void;
  showMessage: (type: 'success' | 'error', text: string) => void;
}

export const TicketTrackingView = ({ createdTicketId, setCreatedTicketId, setView, showMessage }: TicketTrackingViewProps) => {
  const [searchTerm, setSearchTerm] = useState(createdTicketId ? String(createdTicketId) : '');
  const [trackedTicket, setTrackedTicket] = useState<Ticket | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchTrackedTicket = async (id: string) => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/tickets/track/${encodeURIComponent(id)}`);
      if (!res.ok) {
        if (res.status === 404) throw new Error('Chamado não encontrado. Verifique o número digitado.');
        throw new Error('Erro ao buscar o chamado');
      }
      const data = await res.json();
      setTrackedTicket(data);
    } catch (e: any) {
      showMessage('error', e.message || 'Erro ao carregar chamado');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (createdTicketId) fetchTrackedTicket(createdTicketId);
  }, [createdTicketId]);

  return (
    <div className="min-h-screen bg-slate-50 p-6 flex flex-col items-center justify-center">
      <div className="w-full max-w-5xl space-y-6">
        <Button variant="ghost" onClick={() => {
          if (trackedTicket) {
            setTrackedTicket(null);
            setCreatedTicketId(null);
            setSearchTerm('');
          } else {
            setView('home');
          }
        }} className="mb-4">
          <ArrowLeft className="w-4 h-4" /> {trackedTicket ? 'Voltar para Consulta' : 'Voltar para Início'}
        </Button>

        {!trackedTicket ? (
          <Card className="p-8 max-w-md mx-auto space-y-6">
            <div className="text-center space-y-2">
              <div className="w-16 h-16 bg-teal-100 text-teal-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Search className="w-8 h-8" />
              </div>
              <h2 className="text-3xl font-bold text-slate-900 animate-fade-in">Acompanhar Chamado</h2>
              <p className="text-slate-500">Digite o número do seu chamado para acompanhar seu status em tempo real.</p>
            </div>

            <form onSubmit={(e) => {
              e.preventDefault();
              if (searchTerm.trim()) fetchTrackedTicket(searchTerm.trim());
            }} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-700 ml-1">Número do Chamado</label>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Ex: 123"
                  required
                  className="w-full px-4 py-3 h-12 rounded-xl border border-slate-200 bg-white focus:ring-4 focus:ring-teal-100 focus:border-teal-500 outline-none transition-all text-center font-bold text-lg"
                />
              </div>
              <Button
                type="submit"
                disabled={isLoading}
                className="w-full h-12 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold transition-all"
              >
                {isLoading ? 'Buscando...' : 'Buscar Chamado'}
              </Button>
            </form>
          </Card>
        ) : (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="p-8 space-y-8">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-100">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-2xl font-bold text-slate-900">
                      Chamado #{trackedTicket.numeric_id || trackedTicket.id}
                    </h3>
                    <Badge className={STATUS_COLORS[trackedTicket.status]}>
                      {STATUS_LABELS[trackedTicket.status]}
                    </Badge>
                  </div>
                  <p className="text-slate-500 flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Aberto em {new Date(trackedTicket.created_at).toLocaleString('pt-BR')}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div>
                    <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">Detalhes</h4>
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-slate-700">
                        <User className="w-4 h-4 text-slate-400" />
                        <span className="font-medium">Solicitante: {trackedTicket.requester_name}</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-700">
                        <MapPin className="w-4 h-4 text-slate-400" />
                        <span className="font-medium">{trackedTicket.unit}</span>
                        {trackedTicket.location && <span className="text-slate-500">- {trackedTicket.location}</span>}
                      </div>
                      <div className="flex items-center gap-2 text-slate-700">
                        <Briefcase className="w-4 h-4 text-slate-400" />
                        <span className="font-medium">{trackedTicket.category}</span>
                      </div>
                      {trackedTicket.equipment && (
                        <div className="flex items-center gap-2 text-slate-700">
                          <Monitor className="w-4 h-4 text-slate-400" />
                          <span className="font-medium">{trackedTicket.equipment}</span>
                        </div>
                      )}
                      {trackedTicket.technician_name && (
                        <div className="flex items-center gap-2 text-slate-700">
                          <User className="w-4 h-4 text-slate-400" />
                          <span className="font-medium">Técnico: {trackedTicket.technician_name}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">
                      {['Limpeza', 'Supervisão'].includes(trackedTicket.category!) ? 'Motivo da Solicitação' : 'Descrição'}
                    </h4>
                    <p className="text-slate-700 bg-slate-50 p-4 rounded-2xl border border-slate-100 whitespace-pre-wrap">
                      {['Limpeza', 'Supervisão'].includes(trackedTicket.category!) ? trackedTicket.reason : trackedTicket.description}
                    </p>
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Histórico</h4>
                  <div className="space-y-4 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 before:to-transparent">
                    {(trackedTicket as any).history?.map((log: any, index: number) => (
                      <div key={index} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                        <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-white bg-blue-100 text-blue-600 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                          <Clock className="w-4 h-4" />
                        </div>
                        <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-bold text-slate-900">{STATUS_LABELS[log.status as Status] || log.status}</span>
                            <span className="text-xs font-medium text-slate-400">
                              {new Date(log.changed_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <p className="text-sm text-slate-600">{log.changed_by_name}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>
        )}
      </div>
    </div>
  );
};
