import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  ShoppingCart,
  CheckCircle2,
  AlertCircle,
  Send,
  Bell,
  BellOff,
  Trash2,
  ExternalLink,
  MessageSquare,
  User,
  Layers,
  X,
  Info,
  UserCheck
} from 'lucide-react';
import { Button, Card, Input } from '../ui';
import { cn } from '../../lib/utils';
import { UserProfile, PurchaseOrder, hasModuleAccess } from '../../types';
import { STATUS_CONFIG } from './PurchasesTypes';

export interface DetailModalProps {
  order: PurchaseOrder;
  user: UserProfile | null;
  token: string | null;
  onClose: () => void;
  onUpdated: (updated: PurchaseOrder) => void;
  showMessage: (type: 'success' | 'error', text: string) => void;
}

export const PurchaseDetailModal: React.FC<DetailModalProps> = ({
  order,
  user,
  token,
  onClose,
  onUpdated,
  showMessage
}) => {
  const [fluigNumber, setFluigNumber] = useState(order.fluig_number || '');
  const [savingFluig, setSavingFluig] = useState(false);

  const [message, setMessage] = useState('');
  const [sendingUpdate, setSendingUpdate] = useState(false);
  const [requestingProgress, setRequestingProgress] = useState(false);
  const [togglingEmail, setTogglingEmail] = useState(false);
  const [claimingOrder, setClaimingOrder] = useState(false);

  const canAttend = hasModuleAccess(user, 'compras_atender');
  const canRequest = hasModuleAccess(user, 'compras_solicitar');

  const statusCfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.pendente;

  const handleClaimOrder = async () => {
    setClaimingOrder(true);
    try {
      const res = await fetch(`/api/purchases/${order.id}/assign`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({})
      });

      const data = await res.json();
      if (res.ok) {
        showMessage('success', 'Você assumiu a responsabilidade por este pedido!');
        if (data.order) {
          onUpdated(data.order);
        }
      } else {
        showMessage('error', data.error || 'Erro ao assumir pedido');
      }
    } catch {
      showMessage('error', 'Erro ao conectar ao servidor');
    } finally {
      setClaimingOrder(false);
    }
  };

  const handleUpdateStatus = async (newStatus: string) => {
    try {
      const res = await fetch(`/api/purchases/${order.id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });

      const data = await res.json();
      if (res.ok) {
        showMessage('success', `Status alterado para ${newStatus.toUpperCase()}`);
        onUpdated({ ...order, status: newStatus as any });
      } else {
        showMessage('error', data.error || 'Erro ao atualizar status');
      }
    } catch {
      showMessage('error', 'Erro ao conectar ao servidor');
    }
  };

  const handleSaveFluig = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingFluig(true);
    try {
      const res = await fetch(`/api/purchases/${order.id}/update`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ fluig_number: fluigNumber })
      });

      if (res.ok) {
        showMessage('success', 'Número do Fluig salvo com sucesso!');
        onUpdated({ ...order, fluig_number: fluigNumber });
      } else {
        showMessage('error', 'Erro ao salvar número do Fluig');
      }
    } catch {
      showMessage('error', 'Erro ao comunicar com o servidor');
    } finally {
      setSavingFluig(false);
    }
  };

  const handleSendInformativo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    setSendingUpdate(true);
    try {
      const res = await fetch(`/api/purchases/${order.id}/update`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          message: message.trim(),
          fluig_number: fluigNumber || undefined
        })
      });

      if (res.ok) {
        showMessage('success', 'Atualização enviada por e-mail ao solicitante!');
        setMessage('');
        // Refresh order data
        const getRes = await fetch(`/api/purchases/${order.id}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (getRes.ok) {
          const fresh = await getRes.json();
          onUpdated(fresh);
        }
      } else {
        showMessage('error', 'Erro ao enviar informativo');
      }
    } catch {
      showMessage('error', 'Erro ao conectar ao servidor');
    } finally {
      setSendingUpdate(false);
    }
  };

  const handleRequestProgress = async () => {
    setRequestingProgress(true);
    try {
      const res = await fetch(`/api/purchases/${order.id}/request-update`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (res.ok) {
        showMessage('success', 'Solicitação de andamento enviada aos compradores!');
        const getRes = await fetch(`/api/purchases/${order.id}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (getRes.ok) {
          const fresh = await getRes.json();
          onUpdated(fresh);
        }
      } else {
        showMessage('error', 'Erro ao solicitar andamento');
      }
    } catch {
      showMessage('error', 'Erro ao conectar ao servidor');
    } finally {
      setRequestingProgress(false);
    }
  };

  const handleToggleEmailPause = async () => {
    setTogglingEmail(true);
    try {
      const res = await fetch(`/api/purchases/${order.id}/pause-emails`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (res.ok) {
        showMessage('success', data.email_paused ? 'Envio de e-mails pausado para este pedido' : 'Envio de e-mails reativado');
        onUpdated({ ...order, email_paused: data.email_paused });
      }
    } catch {
      showMessage('error', 'Erro ao alterar configuração de e-mail');
    } finally {
      setTogglingEmail(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 md:p-6 z-50 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="max-w-3xl w-full my-auto"
      >
        <Card className="p-6 md:p-8 space-y-6 max-h-[90vh] overflow-y-auto bg-white rounded-3xl border border-slate-200 shadow-2xl">
          {/* Header */}
          <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Pedido #{order.numeric_id || order.id}
                </span>
                <span
                  className={cn(
                    "px-2.5 py-0.5 rounded-full text-xs font-bold uppercase border",
                    statusCfg.bg,
                    statusCfg.text,
                    statusCfg.border
                  )}
                >
                  {statusCfg.label}
                </span>
              </div>
              <h2 className="text-2xl font-black text-slate-900">{order.curso}</h2>
              <p className="text-sm text-slate-600 font-medium">Turma: {order.turma}</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Info Solicitante e Comprador */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100 text-xs">
            <div className="space-y-1">
              <p className="font-bold text-slate-400 uppercase tracking-wider">Solicitante</p>
              <p className="font-bold text-slate-800 text-sm">{order.requester_name}</p>
              <p className="text-slate-500">{order.requester_email} • {order.requester_role}</p>
            </div>
            <div className="space-y-1">
              <p className="font-bold text-slate-400 uppercase tracking-wider">Comprador Responsável</p>
              <p className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                {order.buyer_name ? (
                  <>
                    <UserCheck className="w-4 h-4 text-green-600" />
                    <span>{order.buyer_name}</span>
                  </>
                ) : (
                  <span className="text-amber-700 font-semibold bg-amber-100/80 px-2 py-0.5 rounded-md">
                    Ainda não atribuído (notificando todos)
                  </span>
                )}
              </p>
              <p className="text-slate-500">
                Criado em: {new Date(order.created_at).toLocaleString('pt-BR')}
              </p>
            </div>
          </div>

          {/* Itens do Pedido */}
          <div className="space-y-3">
            <h3 className="font-bold text-slate-900 text-sm uppercase tracking-wider flex items-center gap-2">
              <Layers className="w-4 h-4 text-green-600" /> Itens do Pedido
            </h3>
            <div className="space-y-2">
              {order.items.map((item, idx) => (
                <div
                  key={idx}
                  className="p-3.5 bg-white border border-slate-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900">{idx + 1}. {item.item_name}</span>
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md font-bold text-xs">
                        &times; {item.quantity}
                      </span>
                      {item.is_new_item && (
                        <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded-md font-bold text-[10px] uppercase">
                          Novo Item
                        </span>
                      )}
                    </div>
                    {item.reason && (
                      <p className="text-xs text-slate-500">
                        <span className="font-semibold text-slate-600">Motivo:</span> {item.reason}
                      </p>
                    )}
                    {item.new_item_description && (
                      <p className="text-xs text-amber-800 bg-amber-50/70 p-2 rounded-xl border border-amber-200">
                        {item.new_item_description}
                      </p>
                    )}
                  </div>

                  {item.new_item_photo_url && (
                    <a
                      href={item.new_item_photo_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-xl font-bold text-xs transition-colors shrink-0"
                    >
                      <ExternalLink className="w-3.5 h-3.5" /> Ver Foto
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Seção do Comprador: Status, Fluig e Ações */}
          {canAttend && (
            <div className="p-5 bg-green-50/50 border border-green-200 rounded-2xl space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h4 className="font-bold text-green-900 text-sm uppercase tracking-wider flex items-center gap-1.5">
                  <ShoppingCart className="w-4 h-4 text-green-700" /> Painel do Comprador (Atendimento & Aprovação)
                </h4>
                <button
                  type="button"
                  onClick={handleToggleEmailPause}
                  disabled={togglingEmail}
                  className="inline-flex items-center gap-1 text-xs font-bold text-slate-600 hover:text-slate-900 bg-white px-2.5 py-1.5 rounded-xl border border-slate-200 shadow-sm"
                >
                  {order.email_paused ? (
                    <>
                      <BellOff className="w-3.5 h-3.5 text-red-500" /> E-mails Pausados (Reativar)
                    </>
                  ) : (
                    <>
                      <Bell className="w-3.5 h-3.5 text-green-600" /> E-mails Ativos (Pausar)
                    </>
                  )}
                </button>
              </div>

              {/* Atribuição de Comprador Banner */}
              {!order.buyer_id ? (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-amber-900">Pedido aguardando comprador responsável</p>
                      <p className="text-xs text-amber-700">Todos os compradores estão sendo notificados por e-mail até que alguém assuma o atendimento deste pedido.</p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    onClick={handleClaimOrder}
                    disabled={claimingOrder}
                    className="text-xs py-2 px-4 bg-amber-600 hover:bg-amber-700 text-white font-bold shrink-0 shadow-sm"
                  >
                    <UserCheck className="w-4 h-4" /> {claimingOrder ? 'Assumindo...' : 'Assumir Pedido'}
                  </Button>
                </div>
              ) : (
                <div className="p-3 bg-white/90 border border-green-200 rounded-xl flex items-center justify-between flex-wrap gap-2 text-xs">
                  <div className="flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-green-600" />
                    <span className="text-slate-700 font-medium">
                      Comprador responsável: <strong className="text-slate-900">{order.buyer_name}</strong>
                    </span>
                  </div>
                  {user?.id !== order.buyer_id && (
                    <button
                      type="button"
                      onClick={handleClaimOrder}
                      disabled={claimingOrder}
                      className="text-[11px] text-green-700 hover:underline font-bold"
                    >
                      {claimingOrder ? 'Transferindo...' : 'Transferir responsabilidade para mim'}
                    </button>
                  )}
                </div>
              )}

              {/* Status Actions */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase">Alterar Status do Pedido</label>
                <div className="flex flex-wrap gap-2">
                  {order.status === 'pendente' && (
                    <Button
                      type="button"
                      onClick={() => handleUpdateStatus('ciente')}
                      className="text-xs py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white font-bold"
                    >
                      Marcar como Ciente
                    </Button>
                  )}
                  {order.status !== 'em_andamento' && order.status !== 'concluido' && (
                    <Button
                      type="button"
                      onClick={() => handleUpdateStatus('em_andamento')}
                      className="text-xs py-2 px-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
                    >
                      Marcar como Em Andamento
                    </Button>
                  )}
                  {order.status !== 'concluido' && (
                    <Button
                      type="button"
                      onClick={() => handleUpdateStatus('concluido')}
                      className="text-xs py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                    >
                      Concluir Pedido
                    </Button>
                  )}
                  {order.status !== 'cancelado' && (
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => handleUpdateStatus('cancelado')}
                      className="text-xs py-2 px-3 text-red-600 hover:bg-red-50 font-bold"
                    >
                      Cancelar Pedido
                    </Button>
                  )}
                </div>
              </div>

              {/* Fluig Form */}
              <form onSubmit={handleSaveFluig} className="flex gap-2 items-center pt-2 border-t border-green-100">
                <div className="flex-1">
                  <Input
                    placeholder="Número do Fluig (Ex: 123456)"
                    value={fluigNumber}
                    onChange={(e: any) => setFluigNumber(e.target.value)}
                  />
                </div>
                <Button
                  type="submit"
                  variant="secondary"
                  disabled={savingFluig}
                  className="font-bold text-xs py-3"
                >
                  {savingFluig ? 'Salvando...' : 'Salvar Fluig'}
                </Button>
              </form>

              {/* Enviar Informativo */}
              <form onSubmit={handleSendInformativo} className="space-y-2 pt-2 border-t border-green-100">
                <label className="text-xs font-bold text-slate-700 uppercase">Enviar Atualização ao Solicitante</label>
                <textarea
                  rows={2}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Ex: Cotação aprovada, aguardando faturamento do fornecedor..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs outline-none focus:ring-2 focus:ring-green-500 resize-none"
                />
                <div className="flex justify-end">
                  <Button
                    type="submit"
                    disabled={sendingUpdate || !message.trim()}
                    className="text-xs py-2 px-4 bg-green-700 hover:bg-green-800 text-white font-bold"
                  >
                    <Send className="w-3.5 h-3.5" /> Enviar Informativo por E-mail
                  </Button>
                </div>
              </form>
            </div>
          )}

          {/* Ação e Informação do Solicitante: Apenas Leitura e Solicitação de Posição */}
          {!canAttend && (
            <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-2xl space-y-3">
              <div className="flex items-start gap-2.5">
                <Info className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-bold text-indigo-950">
                    Acompanhamento do Pedido (Visão do Solicitante)
                  </p>
                  <p className="text-[11px] text-indigo-800 leading-relaxed mt-0.5">
                    Você pode acompanhar o andamento, itens e histórico. Por diretriz de segregação de funções, a cotação, inserção de Fluig e aprovação são executados exclusivamente pelo setor de compras.
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-indigo-100">
                <span className="text-xs text-indigo-900 font-medium">Precisa de uma posição atualizada deste pedido?</span>
                <Button
                  type="button"
                  onClick={handleRequestProgress}
                  disabled={requestingProgress}
                  className="text-xs py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold shrink-0"
                >
                  <Send className="w-3.5 h-3.5" /> {requestingProgress ? 'Enviando...' : 'Solicitar Posição aos Compradores'}
                </Button>
              </div>
            </div>
          )}

          {/* Timeline de Atualizações */}
          <div className="space-y-3 pt-2">
            <h3 className="font-bold text-slate-900 text-sm uppercase tracking-wider flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-slate-500" /> Histórico de Atualizações
            </h3>

            {order.updates && order.updates.length > 0 ? (
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {order.updates.map((upd) => (
                  <div
                    key={upd.id}
                    className="p-3 bg-slate-50 rounded-2xl border border-slate-100 text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between text-slate-500">
                      <span className="font-bold text-slate-800">
                        {upd.author_name} ({upd.author_role})
                      </span>
                      <span>{new Date(upd.created_at).toLocaleString('pt-BR')}</span>
                    </div>
                    <p className="text-slate-700 whitespace-pre-wrap">{upd.message}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic">Nenhuma atualização registrada ainda.</p>
            )}
          </div>

          {/* Close */}
          <div className="pt-2 border-t border-slate-100 flex justify-end">
            <Button variant="secondary" onClick={onClose} className="px-6">
              Fechar
            </Button>
          </div>
        </Card>
      </motion.div>
    </div>
  );
};
