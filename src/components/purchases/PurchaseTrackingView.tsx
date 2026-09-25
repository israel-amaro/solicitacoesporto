import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ShoppingCart,
  PlusCircle,
  AlertCircle,
  ArrowLeft,
  Search,
  RefreshCw,
  User,
  Calendar,
  UserCheck,
  Mail,
  Upload
} from 'lucide-react';
import { Button, Card } from '../ui';
import { cn } from '../../lib/utils';
import { PurchaseOrder, hasModuleAccess } from '../../types';
import { PurchasesProps, STATUS_CONFIG } from './PurchasesTypes';
import { BuyerCsvModal } from './BuyerCsvModal';
import { PurchaseDetailModal } from './PurchaseDetailModal';

export const PurchaseTrackingView: React.FC<PurchasesProps> = ({
  user,
  token,
  onNavigate,
  showMessage
}) => {
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<PurchaseOrder | null>(null);

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('todos');
  const [testingEmail, setTestingEmail] = useState(false);
  const [showCsvModal, setShowCsvModal] = useState(false);

  const canAttend = hasModuleAccess(user, 'compras_atender');
  const canRequest = hasModuleAccess(user, 'compras_solicitar');

  const handleTestEmail = async () => {
    setTestingEmail(true);
    try {
      const res = await fetch('/api/purchases/test-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({})
      });
      const data = await res.json();
      if (res.ok) {
        showMessage('success', data.message || 'E-mail de teste enviado com sucesso!');
      } else {
        showMessage('error', data.error || 'Erro ao enviar e-mail de teste');
      }
    } catch {
      showMessage('error', 'Erro ao conectar com o servidor para teste de e-mail');
    } finally {
      setTestingEmail(false);
    }
  };

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/purchases', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setOrders(Array.isArray(data) ? data : []);
      }
    } catch {
      showMessage('error', 'Erro ao carregar lista de compras');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const filteredOrders = orders.filter((order) => {
    const matchesStatus = statusFilter === 'todos' || order.status === statusFilter;
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      !searchTerm ||
      order.curso.toLowerCase().includes(term) ||
      order.turma.toLowerCase().includes(term) ||
      order.requester_name.toLowerCase().includes(term) ||
      (order.fluig_number && order.fluig_number.toLowerCase().includes(term)) ||
      String(order.numeric_id || '').includes(term) ||
      order.items.some(i => i.item_name.toLowerCase().includes(term));

    return matchesStatus && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Bar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20 px-6 py-4">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              onClick={() => onNavigate(hasModuleAccess(user, 'compras') ? '/compras' : (user ? '/dashboard' : '/'))}
              className="text-slate-600 hover:text-slate-900 -ml-2"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-green-600" /> Acompanhamento de Compras
              </h1>
              <p className="text-xs text-slate-500">
                {canAttend ? 'Visão do Comprador — Atendimento, Cotação Fluig e Gestão de Pedidos' : 'Visão do Solicitante — Acompanhe o histórico e andamento das suas solicitações'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {(canAttend || user?.role === 'admin') && (
              <>
                <Button
                  variant="outline"
                  onClick={() => setShowCsvModal(true)}
                  className="text-xs font-bold py-2 px-3.5 h-auto text-blue-800 border-blue-300 bg-blue-50/70 hover:bg-blue-100 flex items-center gap-1.5 shadow-sm"
                >
                  <Upload className="w-3.5 h-3.5 text-blue-600" />
                  Upload CSV (Itens SENAI)
                </Button>

                <Button
                  variant="outline"
                  onClick={handleTestEmail}
                  disabled={testingEmail}
                  className="text-xs font-bold py-2 px-3 h-auto text-green-800 border-green-300 hover:bg-green-50"
                >
                  <Mail className={cn("w-3.5 h-3.5", testingEmail && "animate-pulse")} />
                  {testingEmail ? 'Testando...' : 'Testar E-mails Compradores'}
                </Button>
              </>
            )}

            <Button
              variant="secondary"
              onClick={fetchOrders}
              className="text-xs font-bold py-2 px-3 h-auto"
            >
              <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} /> Atualizar
            </Button>

            {canRequest && (
              <Button
                onClick={() => onNavigate('/compras/novo')}
                className="text-xs font-bold py-2 px-3.5 h-auto bg-green-600 hover:bg-green-700 text-white"
              >
                <PlusCircle className="w-3.5 h-3.5" /> Novo Pedido
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-8 space-y-6">
        {/* Filters and Search Bar */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          <div className="md:col-span-7 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por curso, turma, solicitante, item ou Fluig..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-11 pr-4 py-3 rounded-2xl border border-slate-200 bg-white text-sm outline-none focus:ring-2 focus:ring-green-500 shadow-sm"
            />
          </div>

          <div className="md:col-span-5 flex gap-2 overflow-x-auto pb-1 md:pb-0">
            {['todos', 'pendente', 'em_andamento', 'concluido'].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={cn(
                  "px-4 py-2.5 rounded-2xl text-xs font-bold uppercase transition-all whitespace-nowrap border shadow-sm",
                  statusFilter === st
                    ? "bg-slate-900 text-white border-slate-900"
                    : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                )}
              >
                {st === 'todos' ? 'Todos' : STATUS_CONFIG[st]?.label || st}
              </button>
            ))}
          </div>
        </div>

        {/* Orders List */}
        {loading ? (
          <div className="text-center py-20">
            <RefreshCw className="w-8 h-8 text-green-600 animate-spin mx-auto mb-3" />
            <p className="text-sm font-semibold text-slate-500">Carregando pedidos de compra...</p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <Card className="p-12 text-center space-y-4 max-w-md mx-auto">
            <div className="w-14 h-14 bg-slate-100 text-slate-400 rounded-2xl flex items-center justify-center mx-auto">
              <ShoppingCart className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-slate-800">Nenhum pedido encontrado</h3>
              <p className="text-xs text-slate-500">
                Não há pedidos correspondentes aos filtros aplicados.
              </p>
            </div>
            {canRequest && (
              <Button onClick={() => onNavigate('/compras/novo')} className="text-xs py-2 bg-green-600 hover:bg-green-700">
                <PlusCircle className="w-4 h-4" /> Criar Primeiro Pedido
              </Button>
            )}
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredOrders.map((order) => {
              const statusCfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.pendente;
              return (
                <motion.div
                  key={order.id}
                  whileHover={{ y: -2 }}
                  onClick={() => setSelectedOrder(order)}
                  className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm hover:shadow-lg transition-all cursor-pointer flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-black text-slate-900 text-sm tracking-tight">
                        Pedido #{order.numeric_id || order.id.substring(0, 6)}
                      </span>
                      <span
                        className={cn(
                          "px-2.5 py-1 rounded-full text-[11px] font-black uppercase tracking-wider border",
                          statusCfg.bg,
                          statusCfg.text,
                          statusCfg.border
                        )}
                      >
                        {statusCfg.label}
                      </span>
                    </div>

                    <div>
                      <h3 className="font-bold text-slate-900 text-base line-clamp-1">{order.curso}</h3>
                      <p className="text-xs text-slate-500 font-medium">Turma: {order.turma}</p>
                    </div>

                    <div className="bg-slate-50 p-3 rounded-2xl space-y-2 border border-slate-100">
                      <div className="flex items-center justify-between gap-2 flex-wrap text-xs font-bold text-slate-700">
                        <span>{order.items.length} {order.items.length === 1 ? 'item' : 'itens'}</span>
                        <div className="flex items-center gap-1.5">
                          {order.fluig_number && (
                            <span className="text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded text-[10px] font-bold">
                              Fluig: {order.fluig_number}
                            </span>
                          )}
                          {!order.buyer_id ? (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-amber-100 text-amber-800 border border-amber-200 inline-flex items-center gap-1">
                              <AlertCircle className="w-3 h-3" /> Aguardando Comprador
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-green-100 text-green-800 border border-green-200 inline-flex items-center gap-1">
                              <UserCheck className="w-3 h-3 text-green-700" /> {order.buyer_name}
                            </span>
                          )}
                        </div>
                      </div>
                      <p className="text-xs text-slate-500 truncate">
                        {order.items.map(i => `${i.quantity}x ${i.item_name}`).join(', ')}
                      </p>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
                    <div className="flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5" />
                      <span className="font-medium truncate max-w-[120px]">{order.requester_name}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{new Date(order.created_at).toLocaleDateString('pt-BR')}</span>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </main>

      {/* Modais: Detalhes do Pedido e Upload de CSV */}
      <AnimatePresence>
        {selectedOrder && (
          <PurchaseDetailModal
            order={selectedOrder}
            user={user}
            token={token}
            onClose={() => setSelectedOrder(null)}
            onUpdated={(updated) => {
              setSelectedOrder(updated);
              fetchOrders();
            }}
            showMessage={showMessage}
          />
        )}
        {showCsvModal && (
          <BuyerCsvModal
            user={user}
            token={token}
            onClose={() => setShowCsvModal(false)}
            showMessage={showMessage}
          />
        )}
      </AnimatePresence>
    </div>
  );
};
