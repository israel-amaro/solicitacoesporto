import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertCircle, Clock, XCircle, CheckCircle2 } from 'lucide-react';
import { Button, Card, Badge, Sidebar } from '../ui';
import { cn } from '../../lib/utils';
import { Loan, UserProfile } from '../../types';

interface LoansDashboardViewProps {
  view: string;
  setView: (view: any) => void;
  user: UserProfile | null;
  token: string | null;
  loans: Loan[];
  selectedLoan: Loan | null;
  setSelectedLoan: (loan: Loan | null) => void;
  loanTab: 'ativos' | 'concluidos';
  setLoanTab: (tab: 'ativos' | 'concluidos') => void;
  authTerms: string;
  setAuthTerms: (terms: string) => void;
  showAuthModal: boolean;
  setShowAuthModal: (show: boolean) => void;
  showCompleteModal: boolean;
  setShowCompleteModal: (show: boolean) => void;
  returnCondition: 'sim' | 'nao';
  setReturnCondition: (cond: 'sim' | 'nao') => void;
  returnProblem: string;
  setReturnProblem: (problem: string) => void;
  showMessage: (type: 'success' | 'error', text: string) => void;
  fetchLoans: () => void;
  setShowPasswordModal: (show: boolean) => void;
  handleLogout: () => void;
}

export const LoansDashboardView = ({
  view,
  setView,
  user,
  token,
  loans,
  selectedLoan,
  setSelectedLoan,
  loanTab,
  setLoanTab,
  authTerms,
  setAuthTerms,
  showAuthModal,
  setShowAuthModal,
  showCompleteModal,
  setShowCompleteModal,
  returnCondition,
  setReturnCondition,
  returnProblem,
  setReturnProblem,
  showMessage,
  fetchLoans,
  setShowPasswordModal,
  handleLogout,
}: LoansDashboardViewProps) => {
  // Reject modal state
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectLoading, setRejectLoading] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [completeLoading, setCompleteLoading] = useState(false);

  const handleAuthorize = async () => {
    if (!selectedLoan) return;
    setAuthLoading(true);
    try {
      const res = await fetch(`/api/loans/${selectedLoan.id}/authorize`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ terms: authTerms })
      });
      const data = await res.json();
      if (res.ok) {
        showMessage('success', `Empréstimo autorizado! PIN: ${data.pin}`);
        setShowAuthModal(false);
        setAuthTerms('');
        fetchLoans();
      } else {
        throw new Error(data.error || 'Erro ao autorizar');
      }
    } catch (e: any) {
      showMessage('error', e.message || 'Erro ao autorizar.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleReject = async () => {
    if (!selectedLoan || !rejectReason.trim()) return;
    setRejectLoading(true);
    try {
      const res = await fetch(`/api/loans/${selectedLoan.id}/reject`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ reason: rejectReason })
      });
      const data = await res.json();
      if (res.ok) {
        showMessage('success', 'Empréstimo reprovado com sucesso!');
        setShowRejectModal(false);
        setRejectReason('');
        fetchLoans();
      } else {
        throw new Error(data.error || 'Erro ao reprovar');
      }
    } catch (e: any) {
      showMessage('error', e.message || 'Erro ao reprovar.');
    } finally {
      setRejectLoading(false);
    }
  };

  const handleComplete = async () => {
    if (!selectedLoan) return;
    setCompleteLoading(true);
    try {
      const res = await fetch(`/api/loans/${selectedLoan.id}/complete`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ return_condition: returnCondition, return_problem: returnProblem })
      });
      const data = await res.json();
      if (res.ok) {
        showMessage('success', 'Empréstimo encerrado manualmente pelo gestor!');
        setShowCompleteModal(false);
        setReturnCondition('sim');
        setReturnProblem('');
        fetchLoans();
      } else {
        throw new Error(data.error || 'Erro ao concluir');
      }
    } catch (e: any) {
      showMessage('error', e.message || 'Erro ao concluir.');
    } finally {
      setCompleteLoading(false);
    }
  };

  const filteredLoans = loans.filter(l => {
    const isFinished = l.status === 'concluido' || l.status === 'recusado';
    return loanTab === 'ativos' ? !isFinished : isFinished;
  });

  const isOverdue = (l: Loan) => {
    const isFinished = l.status === 'concluido' || l.status === 'recusado';
    if (isFinished) return false;
    return (Date.now() - new Date(l.created_at).getTime()) > 86400000;
  };

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
        <header className="flex items-center justify-between mb-10">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Gestão de Empréstimos</h1>
            <p className="text-slate-500">Autorize solicitações, reprove e gerencie histórico.</p>
          </div>
          <div className="flex bg-white p-1 rounded-xl border border-slate-200">
            <button
              onClick={() => setLoanTab('ativos')}
              className={cn("px-4 py-2 rounded-lg text-sm font-bold transition-all", loanTab === 'ativos' ? "bg-blue-600 text-white" : "text-slate-500")}
            >
              Ativos ({loans.filter(l => l.status !== 'concluido' && l.status !== 'recusado').length})
            </button>
            <button
              onClick={() => setLoanTab('concluidos')}
              className={cn("px-4 py-2 rounded-lg text-sm font-bold transition-all", loanTab === 'concluidos' ? "bg-blue-600 text-white" : "text-slate-500")}
            >
              Concluídos/Recusados ({loans.filter(l => l.status === 'concluido' || l.status === 'recusado').length})
            </button>
          </div>
        </header>

        {loanTab === 'ativos' && loans.some(isOverdue) && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-4 text-red-700 shadow-sm"
          >
            <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center text-red-600">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-bold">Atenção: Empréstimos Atrasados</h4>
              <p className="text-sm opacity-90">Existem empréstimos ativos há mais de 24 horas que ainda não foram concluídos.</p>
            </div>
          </motion.div>
        )}

        <div className="grid gap-6">
          {filteredLoans.length === 0 ? (
            <div className="text-center py-12 text-slate-400 font-medium">Nenhum empréstimo encontrado.</div>
          ) : (
            filteredLoans.map(loan => {
              const overdue = isOverdue(loan);
              return (
                <Card key={loan.id} className={cn("p-6 transition-all border border-slate-100 shadow-sm", overdue && "border-red-500 bg-red-50/10 shadow-lg shadow-red-100/30")}>
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-xl font-bold text-slate-900">{loan.equipment}</h3>
                        {overdue && (
                          <Badge className="bg-red-600 text-white animate-pulse">
                            <AlertCircle className="w-3 h-3 mr-1" /> ATRASADO (+24h)
                          </Badge>
                        )}
                      </div>
                      <p className="text-slate-500">Solicitante: {loan.requester_name} ({loan.registration})</p>
                      <p className="text-slate-400 text-xs mt-0.5">Contato: {loan.email} | {loan.phone}</p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <Badge className={
                        loan.status === 'pendente' ? 'bg-amber-100 text-amber-700' :
                        loan.status === 'autorizado' ? 'bg-blue-100 text-blue-700' :
                        loan.status === 'em_uso' ? 'bg-purple-100 text-purple-700' :
                        loan.status === 'concluido' ? 'bg-emerald-100 text-emerald-700' :
                        loan.status === 'recusado' ? 'bg-red-100 text-red-700' :
                        'bg-slate-100 text-slate-700'
                      }>
                        {loan.status === 'em_uso' ? 'EM USO' : loan.status.toUpperCase()}
                      </Badge>
                      {loan.pin && (loan.status === 'autorizado' || loan.status === 'em_uso') && (
                        <div className="bg-blue-600 text-white px-3 py-1 rounded-lg font-mono font-bold text-lg shadow-lg shadow-blue-200">
                          PIN: {loan.pin}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="grid md:grid-cols-3 gap-4 text-sm text-slate-600 mb-6 bg-slate-50 p-4 rounded-xl">
                    <p><strong>Local:</strong> {loan.location}</p>
                    <p><strong>Motivo:</strong> {loan.reason}</p>
                    <p><strong>Solicitado em:</strong> {new Date(loan.created_at).toLocaleString()}</p>
                  </div>

                  {loan.status === 'recusado' && (
                    <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl space-y-1">
                      <p className="text-sm text-red-800 font-bold uppercase tracking-wider text-xs">Motivo da Reprovação</p>
                      <p className="text-sm text-red-700 font-medium">"{loan.rejection_reason}"</p>
                      <p className="text-xs text-red-500 mt-1">Reprovado por: {loan.rejected_by} em {loan.rejected_at ? new Date(loan.rejected_at).toLocaleString() : '—'}</p>
                    </div>
                  )}

                  {(loan.checklist_initial || loan.checklist_return) && (
                    <div className="mt-4 grid md:grid-cols-2 gap-4 border-t border-slate-100 pt-4 text-sm">
                      {loan.checklist_initial && (
                        <div className="bg-purple-50/50 border border-purple-100 rounded-xl p-3">
                          <p className="font-bold text-purple-800 text-xs uppercase tracking-wider mb-1">Checklist de Retirada</p>
                          <p className="text-slate-700 font-medium">"{loan.checklist_initial}"</p>
                          {loan.signature_name && (
                            <p className="text-xs text-purple-600 mt-1">Assinado por: {loan.signature_name} ({loan.signature_email})</p>
                          )}
                        </div>
                      )}
                      {loan.checklist_return && (
                        <div className={cn("rounded-xl p-3 border", loan.return_condition === 'sim' ? "bg-emerald-50/50 border-emerald-100" : "bg-red-50/50 border-red-100")}>
                          <p className={cn("font-bold text-xs uppercase tracking-wider mb-1", loan.return_condition === 'sim' ? "text-emerald-800" : "text-red-800")}>Checklist de Devolução</p>
                          <p className="text-slate-700 font-medium">"{loan.checklist_return}"</p>
                          {loan.return_condition === 'nao' && loan.return_problem && (
                            <p className="text-red-600 font-bold text-xs mt-1">Problema relatado: {loan.return_problem}</p>
                          )}
                          <p className="text-xs text-slate-500 mt-1">
                            Retornado via: {loan.completed_via === 'pin' ? 'PIN do Solicitante' : 'Encerramento Manual'} por {loan.completed_by} em {loan.completed_at ? new Date(loan.completed_at).toLocaleString() : '—'}
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {loanTab === 'concluidos' && loan.logs && loan.logs.length > 0 && (
                    <div className="mt-6 border-t border-slate-100 pt-6">
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Histórico / Timeline de Auditoria</h4>
                      <div className="space-y-3">
                        {loan.logs.map((log, idx) => (
                          <div key={idx} className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                            <div className="w-8 h-8 bg-slate-200 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
                              {log.action.includes('Reprovado') ? (
                                <XCircle className="w-4 h-4 text-red-500" />
                              ) : log.action.includes('Concluído') || log.action.includes('Liberado') ? (
                                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                              ) : (
                                <Clock className="w-4 h-4 text-slate-500" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-bold text-slate-900 text-sm">{log.action}</span>
                                <span className="text-xs text-slate-400 shrink-0">{new Date(log.timestamp).toLocaleString()}</span>
                              </div>
                              <p className="text-xs text-slate-500 mt-0.5">{log.user}</p>
                              {log.details && <p className="text-xs text-slate-600 mt-1 italic">"{log.details}"</p>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {loanTab === 'ativos' && (
                    <div className="flex gap-3 pt-4 border-t border-slate-100 mt-4">
                      {loan.status === 'pendente' && (
                        <>
                          <Button onClick={() => { setSelectedLoan(loan); setShowAuthModal(true); }}>
                            Autorizar Empréstimo
                          </Button>
                          <Button variant="danger" className="bg-red-50 text-red-700 hover:bg-red-100 border border-red-200" onClick={() => { setSelectedLoan(loan); setShowRejectModal(true); }}>
                            Reprovar
                          </Button>
                        </>
                      )}
                      {(loan.status === 'liberado' || loan.status === 'autorizado' || loan.status === 'em_uso') && user?.role === 'admin' && (
                        <Button variant="secondary" onClick={() => { setSelectedLoan(loan); setShowCompleteModal(true); }}>
                          Encerrar Manualmente (Admin)
                        </Button>
                      )}
                    </div>
                  )}
                </Card>
              );
            })
          )}
        </div>
      </main>

      {/* Auth Modal */}
      <AnimatePresence>
        {showAuthModal && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-6 z-50">
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="max-w-md w-full">
              <Card className="p-8 space-y-6">
                <h3 className="text-2xl font-bold text-slate-900">Autorizar Empréstimo</h3>
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-slate-700 ml-1">Termos do Empréstimo (Obrigatório)</label>
                  <textarea
                    required
                    rows={4}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 outline-none focus:ring-2 focus:ring-blue-100"
                    value={authTerms}
                    onChange={e => setAuthTerms(e.target.value)}
                    placeholder="Descreva as condições e responsabilidades..."
                  />
                </div>
                <div className="flex gap-3">
                  <Button variant="secondary" className="flex-1" onClick={() => setShowAuthModal(false)}>Cancelar</Button>
                  <Button className="flex-1" disabled={!authTerms || authLoading} onClick={handleAuthorize}>
                    {authLoading ? 'Autorizando...' : 'Autorizar'}
                  </Button>
                </div>
              </Card>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Reject Modal */}
      <AnimatePresence>
        {showRejectModal && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-6 z-50">
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="max-w-md w-full">
              <Card className="p-8 space-y-6 border border-red-100">
                <h3 className="text-2xl font-bold text-slate-900 flex items-center gap-2 text-red-700">
                  <AlertCircle className="w-6 h-6" /> Reprovar Empréstimo
                </h3>
                <p className="text-sm text-slate-500">Forneça o motivo para a reprovação. O solicitante poderá consultar esse motivo no acompanhamento.</p>
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-slate-700 ml-1">Motivo (Obrigatório)</label>
                  <textarea
                    required
                    rows={3}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 outline-none focus:ring-2 focus:ring-red-100"
                    value={rejectReason}
                    onChange={e => setRejectReason(e.target.value)}
                    placeholder="Ex: Equipamento indisponível ou manutenção pendente..."
                  />
                </div>
                <div className="flex gap-3">
                  <Button variant="secondary" className="flex-1" onClick={() => setShowRejectModal(false)}>Cancelar</Button>
                  <Button className="flex-1 bg-red-600 hover:bg-red-700 text-white" disabled={!rejectReason.trim() || rejectLoading} onClick={handleReject}>
                    {rejectLoading ? 'Reprovando...' : 'Confirmar Reprovação'}
                  </Button>
                </div>
              </Card>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Complete Modal */}
      <AnimatePresence>
        {showCompleteModal && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-6 z-50">
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="max-w-md w-full">
              <Card className="p-8 space-y-6">
                <h3 className="text-2xl font-bold text-slate-900 text-amber-600 flex items-center gap-2">
                  <AlertCircle className="w-6 h-6 animate-bounce" /> Encerramento Manual
                </h3>
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 space-y-1.5">
                  <p className="font-bold">Atenção Admin:</p>
                  <p>O fluxo recomendado de devolução é realizado **pelo próprio solicitante** na página de consulta pública utilizando o PIN de 4 dígitos dele, registrando o checklist e assinatura.</p>
                  <p>Use esta opção manual apenas se o solicitante esqueceu/perdeu o PIN ou abandonou o equipamento.</p>
                </div>

                <p className="text-slate-600 text-sm font-semibold">O equipamento foi devolvido no mesmo estado que foi entregue?</p>
                <div className="flex gap-4">
                  <button
                    onClick={() => setReturnCondition('sim')}
                    className={cn("flex-1 py-3 rounded-xl border-2 font-bold transition-all", returnCondition === 'sim' ? "bg-emerald-50 border-emerald-500 text-emerald-700" : "border-slate-100 text-slate-400")}
                  >
                    SIM
                  </button>
                  <button
                    onClick={() => setReturnCondition('nao')}
                    className={cn("flex-1 py-3 rounded-xl border-2 font-bold transition-all", returnCondition === 'nao' ? "bg-red-50 border-red-500 text-red-700" : "border-slate-100 text-slate-400")}
                  >
                    NÃO
                  </button>
                </div>
                {returnCondition === 'nao' && (
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-slate-700 ml-1">Descreva o problema</label>
                    <textarea
                      required
                      rows={3}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 outline-none"
                      value={returnProblem}
                      onChange={e => setReturnProblem(e.target.value)}
                    />
                  </div>
                )}
                <div className="flex gap-3">
                  <Button variant="secondary" className="flex-1" onClick={() => setShowCompleteModal(false)}>Cancelar</Button>
                  <Button className="flex-1 bg-amber-600 hover:bg-amber-700 text-white" disabled={completeLoading} onClick={handleComplete}>
                    {completeLoading ? 'Encerrando...' : 'Confirmar Encerramento'}
                  </Button>
                </div>
              </Card>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
