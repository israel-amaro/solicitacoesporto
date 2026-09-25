import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft,
  Search,
  CheckCircle2,
  Clock,
  Package,
  KeyRound,
  Undo2,
  XCircle,
  ChevronRight
} from 'lucide-react';
import { Button, Card, Badge, Input } from '../ui';
import { cn } from '../../lib/utils';
import { UNIT_LOCATIONS } from '../../constants';
import { Loan } from '../../types';

interface LoanRequestViewProps {
  setView: (view: any) => void;
  showMessage: (type: 'success' | 'error', text: string) => void;
  setCreatedLoanId: (id: string | null) => void;
}

type ReleaseStep = 'pin' | 'sign' | 'checklist';
type HubMode = 'hub' | 'request' | 'tracking';

export const LoanRequestView = ({ setView, showMessage, setCreatedLoanId }: LoanRequestViewProps) => {
  const [mode, setMode] = useState<HubMode>('hub');
  const [loading, setLoading] = useState(false);

  // Tracking states
  const [registrationSearch, setRegistrationSearch] = useState('');
  const [searchedRegistration, setSearchedRegistration] = useState('');
  const [userLoans, setUserLoans] = useState<Loan[]>([]);
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  // Release modal state
  const [showReleaseModal, setShowReleaseModal] = useState(false);
  const [releaseStep, setReleaseStep] = useState<ReleaseStep>('pin');
  const [releasePin, setReleasePin] = useState('');
  const [releaseName, setReleaseName] = useState('');
  const [releaseReg, setReleaseReg] = useState('');
  const [releaseEmail, setReleaseEmail] = useState('');
  const [releaseChecklist, setReleaseChecklist] = useState('');
  const [releaseLoading, setReleaseLoading] = useState(false);

  // Return modal state
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [returnPin, setReturnPin] = useState('');
  const [returnChecklist, setReturnChecklist] = useState('');
  const [returnCondition, setReturnCondition] = useState<'sim' | 'nao'>('sim');
  const [returnProblem, setReturnProblem] = useState('');
  const [returnLoading, setReturnLoading] = useState(false);

  const handleRequestSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    const payload = Object.fromEntries(formData.entries());
    const registrationUsed = payload.registration as string;

    try {
      const res = await fetch('/api/loans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao solicitar empréstimo');
      
      showMessage('success', 'Solicitação de empréstimo enviada com sucesso!');
      setCreatedLoanId(data.id);
      
      // Auto transition to tracking mode with the used registration
      setRegistrationSearch(registrationUsed);
      setSearchedRegistration(registrationUsed);
      await fetchLoansByRegistration(registrationUsed);
      setMode('tracking');
    } catch (e: any) {
      showMessage('error', e.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchLoansByRegistration = async (reg: string) => {
    setIsSearching(true);
    try {
      const res = await fetch(`/api/loans/registration/${encodeURIComponent(reg)}`);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Erro ao buscar empréstimos');
      }
      const data = await res.json();
      setUserLoans(data);
      setSelectedLoan(null);
    } catch (e: any) {
      showMessage('error', e.message);
    } finally {
      setIsSearching(false);
    }
  };

  const refreshSelectedLoanDetail = async (loanId: string) => {
    try {
      const res = await fetch(`/api/loans/track/${encodeURIComponent(loanId)}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedLoan(data);
        setUserLoans(prev => prev.map(l => l.id === loanId ? data : l));
      }
    } catch (e) {
      console.error("Error refreshing loan detail:", e);
    }
  };

  useEffect(() => {
    if (!selectedLoan || (selectedLoan.status !== 'pendente' && selectedLoan.status !== 'autorizado')) return;
    const interval = setInterval(() => refreshSelectedLoanDetail(selectedLoan.id), 15000);
    return () => clearInterval(interval);
  }, [selectedLoan?.status, selectedLoan?.id]);

  const handleRelease = async () => {
    if (!selectedLoan) return;
    setReleaseLoading(true);
    try {
      const res = await fetch(`/api/loans/${selectedLoan.id}/release`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pin: releasePin,
          signature_name: releaseName,
          signature_registration: releaseReg,
          signature_email: releaseEmail,
          checklist_initial: releaseChecklist
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      showMessage('success', 'Equipamento retirado com sucesso!');
      setShowReleaseModal(false);
      setReleaseStep('pin');
      setReleasePin(''); setReleaseName(''); setReleaseReg(''); setReleaseEmail(''); setReleaseChecklist('');
      refreshSelectedLoanDetail(selectedLoan.id);
    } catch (e: any) {
      showMessage('error', e.message);
    } finally {
      setReleaseLoading(false);
    }
  };

  const handleReturn = async () => {
    if (!selectedLoan) return;
    setReturnLoading(true);
    try {
      const res = await fetch(`/api/loans/${selectedLoan.id}/return`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pin: returnPin,
          checklist_return: returnChecklist,
          return_condition: returnCondition,
          return_problem: returnProblem
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      showMessage('success', 'Devolução registrada com sucesso!');
      setShowReturnModal(false);
      setReturnPin(''); setReturnChecklist(''); setReturnCondition('sim'); setReturnProblem('');
      refreshSelectedLoanDetail(selectedLoan.id);
    } catch (e: any) {
      showMessage('error', e.message);
    } finally {
      setReturnLoading(false);
    }
  };

  const statusLabel: Record<string, string> = {
    pendente: 'Aguardando Aprovação',
    autorizado: 'Aprovado — Pronto para Retirada',
    em_uso: 'Em Uso',
    concluido: 'Concluído',
    recusado: 'Recusado',
    liberado: 'Liberado'
  };

  const statusColor: Record<string, string> = {
    pendente: 'bg-amber-100 text-amber-700',
    autorizado: 'bg-blue-100 text-blue-700',
    em_uso: 'bg-purple-100 text-purple-700',
    concluido: 'bg-emerald-100 text-emerald-700',
    recusado: 'bg-red-100 text-red-700',
    liberado: 'bg-teal-100 text-teal-700'
  };

  const stepKeys: ReleaseStep[] = ['pin', 'sign', 'checklist'];

  return (
    <div className="min-h-screen bg-slate-50 p-6 flex flex-col items-center justify-center">
      <div className="w-full max-w-2xl space-y-6">
        <Button
          variant="ghost"
          onClick={() => {
            if (selectedLoan) {
              setSelectedLoan(null);
            } else if (mode !== 'hub') {
              setMode('hub');
              setUserLoans([]);
              setRegistrationSearch('');
            } else {
              setView('home');
            }
          }}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4" /> {selectedLoan ? 'Voltar para Lista' : (mode !== 'hub' ? 'Voltar para Menu' : 'Voltar para Início')}
        </Button>

        {mode === 'hub' && (
          <div className="space-y-8 max-w-xl mx-auto text-center">
            <div className="space-y-3">
              <div className="w-16 h-16 bg-orange-100 text-orange-600 rounded-3xl flex items-center justify-center mx-auto mb-2">
                <Package className="w-8 h-8" />
              </div>
              <h2 className="text-3xl font-black text-slate-900 tracking-tight">Empréstimos de Equipamentos</h2>
              <p className="text-slate-500 font-medium">Selecione o que deseja fazer abaixo para prosseguir.</p>
            </div>

            <div className="grid sm:grid-cols-2 gap-6 pt-4">
              <button
                onClick={() => setMode('request')}
                className="p-6 bg-white border border-slate-100 hover:border-orange-500 hover:shadow-xl hover:-translate-y-1 rounded-3xl shadow-sm text-center flex flex-col items-center justify-center gap-4 transition-all group"
              >
                <div className="w-12 h-12 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Package className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-slate-900">Solicitar Empréstimo</h3>
                  <p className="text-xs text-slate-400 mt-1">Peça um notebook, projetor ou outro dispositivo.</p>
                </div>
              </button>

              <button
                onClick={() => setMode('tracking')}
                className="p-6 bg-white border border-slate-100 hover:border-blue-500 hover:shadow-xl hover:-translate-y-1 rounded-3xl shadow-sm text-center flex flex-col items-center justify-center gap-4 transition-all group"
              >
                <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Search className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-slate-900">Acompanhar Empréstimo</h3>
                  <p className="text-xs text-slate-400 mt-1">Consulte status, retire ou devolva com sua matrícula.</p>
                </div>
              </button>
            </div>
          </div>
        )}

        {mode === 'request' && (
          <Card className="p-8 space-y-8">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-orange-100 text-orange-600 rounded-2xl flex items-center justify-center">
                  <Package className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">Solicitar Equipamento</h2>
                  <p className="text-sm text-slate-500">Envie o formulário para aprovação da gestão.</p>
                </div>
              </div>
            </div>

            <form onSubmit={handleRequestSubmit} className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <Input label="Nome Completo" name="requester_name" required />
                <Input label="Matrícula" name="registration" required />
              </div>
              <div className="grid md:grid-cols-2 gap-6">
                <Input label="E-mail" name="email" type="email" required />
                <Input label="Telefone" name="phone" required />
              </div>
              <Input label="Equipamento Desejado" name="equipment" required placeholder="Ex: Notebook Dell, Projetor..." />
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-700 ml-1">Local de Uso</label>
                <select name="location" required className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:ring-4 focus:ring-orange-100 focus:border-orange-500 outline-none transition-all">
                  <option value="">Selecione o local...</option>
                  {(UNIT_LOCATIONS['PORTO'] || []).map(loc => (
                    <option key={loc} value={loc}>{loc}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-700 ml-1">Motivo do Empréstimo</label>
                <textarea name="reason" required rows={4} className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:ring-4 focus:ring-orange-100 focus:border-orange-500 outline-none transition-all" placeholder="Descreva o motivo..." />
              </div>
              <Button type="submit" disabled={loading} className="w-full h-14 text-lg bg-orange-600 hover:bg-orange-700">
                {loading ? 'Enviando...' : 'Enviar Solicitação'}
              </Button>
            </form>
          </Card>
        )}

        {mode === 'tracking' && !selectedLoan && (
          <div className="space-y-6">
            <Card className="p-8 max-w-md mx-auto space-y-6">
              <div className="text-center space-y-2">
                <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-2">
                  <Search className="w-8 h-8" />
                </div>
                <h2 className="text-2xl font-bold text-slate-900">Acompanhar Empréstimos</h2>
                <p className="text-slate-500 text-sm">Digite sua matrícula para listar seus empréstimos ativos e históricos.</p>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (registrationSearch.trim()) {
                    setSearchedRegistration(registrationSearch.trim());
                    fetchLoansByRegistration(registrationSearch.trim());
                  }
                }}
                className="space-y-4"
              >
                <input
                  type="text" value={registrationSearch} onChange={(e) => setRegistrationSearch(e.target.value)}
                  placeholder="Digite sua matrícula" required
                  className="w-full px-4 py-3 h-12 rounded-xl border border-slate-200 bg-white focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all text-center font-bold text-slate-800"
                />
                <Button type="submit" disabled={isSearching} className="w-full h-12 bg-blue-600 hover:bg-blue-700">
                  {isSearching ? 'Buscando...' : 'Consultar'}
                </Button>
              </form>
            </Card>

            {searchedRegistration && !isSearching && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                <h3 className="text-lg font-bold text-slate-700">Empréstimos vinculados à matrícula: <span className="text-blue-600">{searchedRegistration}</span></h3>
                {userLoans.length === 0 ? (
                  <Card className="p-8 text-center text-slate-400 font-medium">
                    Nenhum empréstimo encontrado para esta matrícula.
                  </Card>
                ) : (
                  <div className="grid gap-4">
                    {userLoans.map(loan => (
                      <button
                        key={loan.id}
                        onClick={() => setSelectedLoan(loan)}
                        className="w-full text-left p-5 bg-white border border-slate-100 hover:border-blue-500 rounded-2xl shadow-sm hover:shadow-md transition-all flex justify-between items-center group"
                      >
                        <div className="space-y-1">
                          <h4 className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors">{loan.equipment}</h4>
                          <p className="text-xs text-slate-500">Solicitado em: {new Date(loan.created_at).toLocaleDateString('pt-BR')} às {new Date(loan.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
                          <p className="text-xs text-slate-400">Local: {loan.location}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge className={cn('text-xs px-3 py-1', statusColor[loan.status] || 'bg-slate-100 text-slate-700')}>
                            {statusLabel[loan.status] || loan.status}
                          </Badge>
                          <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </motion.div>
            )}
          </div>
        )}

        {mode === 'tracking' && selectedLoan && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="p-8 space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-100">
                <div>
                  <h3 className="text-2xl font-bold text-slate-900">{selectedLoan.equipment}</h3>
                  <p className="text-slate-500 text-sm mt-1">ID do Empréstimo: <span className="font-mono font-bold text-slate-700 select-all">{selectedLoan.id}</span></p>
                </div>
                <Badge className={cn('text-sm px-4 py-2', statusColor[selectedLoan.status] || 'bg-slate-100 text-slate-700')}>
                  {statusLabel[selectedLoan.status] || selectedLoan.status}
                </Badge>
              </div>

              {selectedLoan.status === 'pendente' && (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3 text-amber-800">
                  <Clock className="w-5 h-5 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold">Aguardando aprovação do gestor</p>
                    <p className="text-xs mt-1">Essa tela atualiza automaticamente a cada 15 segundos assim que houver alteração.</p>
                  </div>
                </div>
              )}

              {selectedLoan.status === 'recusado' && (
                <div className="p-5 bg-red-50 border border-red-200 rounded-2xl space-y-3">
                  <div className="flex items-center gap-2 text-red-700">
                    <XCircle className="w-6 h-6" />
                    <h4 className="font-bold text-lg">Solicitação Recusada</h4>
                  </div>
                  <div className="bg-white border border-red-100 rounded-xl p-4">
                    <p className="text-sm font-bold text-red-400 uppercase tracking-wider mb-1">Motivo informado pelo gestor</p>
                    <p className="text-red-800 font-medium">"{selectedLoan.rejection_reason}"</p>
                  </div>
                  {selectedLoan.rejected_by && (
                    <p className="text-xs text-red-500">Recusado por <strong>{selectedLoan.rejected_by}</strong> em {selectedLoan.rejected_at ? new Date(selectedLoan.rejected_at).toLocaleString('pt-BR') : '—'}</p>
                  )}
                </div>
              )}

              {selectedLoan.status === 'autorizado' && (
                <div className="space-y-4">
                  <div className="p-5 bg-blue-50 border border-blue-200 rounded-2xl space-y-4">
                    <div className="flex items-center gap-2 text-blue-700">
                      <CheckCircle2 className="w-6 h-6" />
                      <h4 className="font-bold text-lg">Aprovado — Pronto para Retirada</h4>
                    </div>
                    <div className="p-4 bg-white border border-blue-100 rounded-xl text-sm text-blue-800">
                      <p>Sua solicitação foi aprovada. Por razões de segurança, utilize o **PIN de 4 dígitos** enviado ao seu e-mail (ou informado pelo gestor) para liberar o equipamento no botão abaixo.</p>
                    </div>
                    {selectedLoan.terms && (
                      <div className="bg-white border border-blue-100 rounded-xl p-4">
                        <p className="text-xs font-bold text-blue-400 uppercase tracking-wider mb-2">Termos e Acordo</p>
                        <p className="text-sm text-slate-700 whitespace-pre-wrap">{selectedLoan.terms}</p>
                      </div>
                    )}
                  </div>

                  <Button onClick={() => { setShowReleaseModal(true); setReleaseStep('pin'); }} className="w-full h-12 bg-blue-600 hover:bg-blue-700">
                    <KeyRound className="w-5 h-5" /> Retirar Equipamento (Liberar)
                  </Button>
                </div>
              )}

              {selectedLoan.status === 'em_uso' && (
                <div className="space-y-4">
                  <div className="p-4 bg-purple-50 border border-purple-200 rounded-2xl space-y-2">
                    <p className="text-sm font-bold text-purple-400 uppercase tracking-wider">Equipamento em Seu Uso</p>
                    {selectedLoan.signature_name && <p className="text-slate-700 text-sm">Retirado por: <strong>{selectedLoan.signature_name}</strong></p>}
                    {selectedLoan.released_at && <p className="text-slate-500 text-xs">Retirado em: {new Date(selectedLoan.released_at).toLocaleString('pt-BR')}</p>}
                    {selectedLoan.checklist_initial && (
                      <div className="mt-3 bg-white border border-purple-100 rounded-xl p-3">
                        <p className="text-xs font-bold text-purple-400 uppercase tracking-wider mb-1">Checklist de Retirada</p>
                        <p className="text-sm text-slate-700 whitespace-pre-wrap">{selectedLoan.checklist_initial}</p>
                      </div>
                    )}
                  </div>
                  <Button onClick={() => setShowReturnModal(true)} variant="secondary" className="w-full h-12 border-purple-200 text-purple-700 hover:bg-purple-50">
                    <Undo2 className="w-5 h-5" /> Devolver Equipamento
                  </Button>
                </div>
              )}

              {selectedLoan.status === 'concluido' && (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl space-y-3">
                  <div className="flex items-center gap-2 text-emerald-700">
                    <CheckCircle2 className="w-5 h-5" />
                    <h4 className="font-bold">Devolução Concluída com Sucesso</h4>
                  </div>
                  {selectedLoan.return_condition && (
                    <p className="text-sm text-slate-700">Estado de devolução: <strong>{selectedLoan.return_condition === 'sim' ? 'Perfeito estado' : 'Com problemas'}</strong></p>
                  )}
                  {selectedLoan.return_problem && <p className="text-sm text-red-600">Descrição do Problema: {selectedLoan.return_problem}</p>}
                  {selectedLoan.checklist_return && (
                    <div className="bg-white border border-emerald-100 rounded-xl p-3">
                      <p className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-1">Checklist de Devolução</p>
                      <p className="text-sm text-slate-700 whitespace-pre-wrap">{selectedLoan.checklist_return}</p>
                    </div>
                  )}
                </div>
              )}

              {selectedLoan.logs && selectedLoan.logs.length > 0 && (
                <div>
                  <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Histórico</h4>
                  <div className="space-y-3">
                    {selectedLoan.logs.map((log, idx) => (
                      <div key={idx} className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                        <div className="w-8 h-8 bg-slate-200 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
                          <Clock className="w-4 h-4 text-slate-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-bold text-slate-900 text-sm">{log.action}</span>
                            <span className="text-xs text-slate-400 shrink-0">
                              {new Date(log.timestamp).toLocaleString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5">{log.user}</p>
                          {log.details && <p className="text-xs text-slate-600 mt-1 italic line-clamp-2">"{log.details}"</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Card>
          </motion.div>
        )}
      </div>

      {/* Release Modal */}
      <AnimatePresence>
        {showReleaseModal && selectedLoan && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="max-w-lg w-full my-4">
              <Card className="p-8 space-y-6">
                <div className="flex items-center gap-2 mb-2">
                  {stepKeys.map((s, i) => (
                    <React.Fragment key={s}>
                      <div className={cn(
                        'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all',
                        releaseStep === s ? 'bg-blue-600 text-white' :
                        stepKeys.indexOf(releaseStep) > i ? 'bg-emerald-500 text-white' :
                        'bg-slate-100 text-slate-400'
                      )}>{i + 1}</div>
                      {i < 2 && <div className="flex-1 h-0.5 bg-slate-100" />}
                    </React.Fragment>
                  ))}
                </div>

                {releaseStep === 'pin' && (
                  <div className="space-y-4">
                    <h3 className="text-2xl font-bold text-slate-900">Confirmar PIN</h3>
                    <p className="text-slate-500">Digite o PIN de 4 dígitos gerado na aprovação.</p>
                    <input
                      type="text" inputMode="numeric" maxLength={4}
                      value={releasePin} onChange={(e) => setReleasePin(e.target.value.replace(/\D/g, ''))}
                      placeholder="0000"
                      className="w-full text-center font-mono text-3xl tracking-widest px-4 py-4 rounded-xl border-2 border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition-all"
                    />
                    <div className="flex gap-3">
                      <Button variant="secondary" className="flex-1" onClick={() => setShowReleaseModal(false)}>Cancelar</Button>
                      <Button className="flex-1" disabled={releasePin.length !== 4} onClick={() => setReleaseStep('sign')}>Continuar</Button>
                    </div>
                  </div>
                )}

                {releaseStep === 'sign' && (
                  <div className="space-y-4">
                    <h3 className="text-2xl font-bold text-slate-900">Assinar Termo</h3>
                    {selectedLoan.terms && (
                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 max-h-40 overflow-y-auto">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Termos do Empréstimo</p>
                        <p className="text-sm text-slate-700 whitespace-pre-wrap">{selectedLoan.terms}</p>
                      </div>
                    )}
                    <div className="space-y-3">
                      <Input label="Nome Completo (Assinatura)" value={releaseName} onChange={(e: any) => setReleaseName(e.target.value)} required />
                      <Input label="Matrícula" value={releaseReg} onChange={(e: any) => setReleaseReg(e.target.value)} required />
                      <Input label="E-mail" type="email" value={releaseEmail} onChange={(e: any) => setReleaseEmail(e.target.value)} required />
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-sm text-slate-600">
                        <span className="font-semibold">Data/Hora da assinatura: </span>{new Date().toLocaleString('pt-BR')}
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <Button variant="secondary" className="flex-1" onClick={() => setReleaseStep('pin')}>Voltar</Button>
                      <Button className="flex-1" disabled={!releaseName || !releaseReg || !releaseEmail} onClick={() => setReleaseStep('checklist')}>Continuar</Button>
                    </div>
                  </div>
                )}

                {releaseStep === 'checklist' && (
                  <div className="space-y-4">
                    <h3 className="text-2xl font-bold text-slate-900">Checklist de Retirada</h3>
                    <p className="text-slate-500">Confirme as condições físicas do equipamento ao retirar.</p>
                    <div className="space-y-1.5">
                      <label className="text-sm font-semibold text-slate-700 ml-1">Estado do equipamento na retirada</label>
                      <textarea rows={5} value={releaseChecklist} onChange={(e) => setReleaseChecklist(e.target.value)}
                        placeholder="Ex: Carregador presente, tela sem riscos, sem marcas de queda..."
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all"
                      />
                    </div>
                    <div className="flex gap-3">
                      <Button variant="secondary" className="flex-1" onClick={() => setReleaseStep('sign')}>Voltar</Button>
                      <Button className="flex-1 bg-emerald-600 hover:bg-emerald-700" disabled={!releaseChecklist || releaseLoading} onClick={handleRelease}>
                        {releaseLoading ? 'Confirmando...' : 'Confirmar Retirada'}
                      </Button>
                    </div>
                  </div>
                )}
              </Card>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Return Modal */}
      <AnimatePresence>
        {showReturnModal && selectedLoan && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="max-w-lg w-full my-4">
              <Card className="p-8 space-y-6">
                <h3 className="text-2xl font-bold text-slate-900">Devolver Equipamento</h3>

                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-slate-700 ml-1">PIN do Empréstimo</label>
                  <input
                    type="text" inputMode="numeric" maxLength={4}
                    value={returnPin} onChange={(e) => setReturnPin(e.target.value.replace(/\D/g, ''))}
                    placeholder="0000"
                    className="w-full text-center font-mono text-3xl tracking-widest px-4 py-4 rounded-xl border-2 border-slate-200 focus:border-purple-500 focus:ring-4 focus:ring-purple-100 outline-none transition-all"
                  />
                </div>

                <div>
                  <p className="text-sm font-semibold text-slate-700 mb-3 ml-1">O equipamento está em bom estado?</p>
                  <div className="flex gap-3">
                    <button onClick={() => setReturnCondition('sim')} className={cn('flex-1 py-3 rounded-xl border-2 font-bold transition-all', returnCondition === 'sim' ? 'bg-emerald-50 border-emerald-500 text-emerald-700' : 'border-slate-100 text-slate-400')}>SIM</button>
                    <button onClick={() => setReturnCondition('nao')} className={cn('flex-1 py-3 rounded-xl border-2 font-bold transition-all', returnCondition === 'nao' ? 'bg-red-50 border-red-500 text-red-700' : 'border-slate-100 text-slate-400')}>NÃO</button>
                  </div>
                  {returnCondition === 'nao' && (
                    <div className="mt-3 space-y-1.5">
                      <label className="text-sm font-semibold text-slate-700 ml-1">Descreva o problema</label>
                      <textarea rows={3} value={returnProblem} onChange={(e) => setReturnProblem(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 outline-none focus:ring-2 focus:ring-red-100"
                      />
                    </div>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-slate-700 ml-1">Checklist de Devolução</label>
                  <textarea rows={4} value={returnChecklist} onChange={(e) => setReturnChecklist(e.target.value)}
                    placeholder="Descreva o estado do equipamento ao devolver..."
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-4 focus:ring-purple-100 focus:border-purple-500 outline-none transition-all"
                  />
                </div>

                <div className="flex gap-3">
                  <Button variant="secondary" className="flex-1" onClick={() => setShowReturnModal(false)}>Cancelar</Button>
                  <Button
                    className="flex-1 bg-purple-600 hover:bg-purple-700"
                    disabled={returnPin.length !== 4 || !returnChecklist || (returnCondition === 'nao' && !returnProblem) || returnLoading}
                    onClick={handleReturn}
                  >
                    {returnLoading ? 'Registrando...' : 'Confirmar Devolução'}
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
