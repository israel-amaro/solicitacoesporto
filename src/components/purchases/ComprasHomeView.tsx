import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ShoppingCart,
  PlusCircle,
  Clock,
  ChevronRight,
  ArrowLeft,
  FileText,
  Info,
  ShieldAlert,
  Upload
} from 'lucide-react';
import { Button, Card } from '../ui';
import { cn } from '../../lib/utils';
import { hasModuleAccess } from '../../types';
import { PurchasesProps } from './PurchasesTypes';
import { BuyerCsvModal } from './BuyerCsvModal';

export const ComprasHomeView: React.FC<PurchasesProps> = ({
  user,
  token,
  onNavigate,
  showMessage
}) => {
  const canRequest = hasModuleAccess(user, 'compras_solicitar');
  const canAttend = hasModuleAccess(user, 'compras_atender');
  const [showCsvModal, setShowCsvModal] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-green-100/50 rounded-full blur-3xl" />
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-emerald-100/50 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-4xl w-full text-center space-y-8 relative z-10"
      >
        {/* Header */}
        <div className="space-y-4">
          <div className="flex items-center justify-center">
            <img
              src="https://lh3.googleusercontent.com/d/1x_2FRXCBA5T2PDG7JjDx6me8RboCVaj0"
              alt="Logo SENAI Porto"
              className="h-16 md:h-20 object-contain"
              referrerPolicy="no-referrer"
            />
          </div>
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-bold uppercase tracking-wider mb-1">
              <ShoppingCart className="w-3.5 h-3.5" /> Módulo de Compras
            </div>
            <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">
              Gestão e Solicitação de Compras
            </h1>
            <p className="text-slate-500 text-sm md:text-base max-w-xl mx-auto">
              Realize novos pedidos para cursos e turmas ou acompanhe o status dos pedidos em atendimento.
            </p>
          </div>
        </div>

        {/* Informative Banner on Segregation of Duties */}
        {user && (
          <div className="max-w-2xl mx-auto space-y-3">
            {canRequest && !canAttend ? (
              <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-2xl flex items-start gap-3 text-left">
                <div className="p-2 bg-indigo-100 text-indigo-700 rounded-xl mt-0.5 shrink-0">
                  <FileText className="w-4 h-4" />
                </div>
                <div className="text-xs text-indigo-950 space-y-0.5">
                  <p className="font-bold text-sm">Perfil: Solicitante (Supervisor / Docente)</p>
                  <p className="text-indigo-800 leading-relaxed">
                    Você possui permissão para <strong>solicitar novos pedidos de compra</strong> e <strong>acompanhar o histórico e andamento</strong>. O atendimento, cotação e aprovação são executados exclusivamente pelo setor de compras.
                  </p>
                </div>
              </div>
            ) : canAttend || user.role === 'admin' ? (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between gap-3 text-left">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-emerald-100 text-emerald-700 rounded-xl mt-0.5 shrink-0">
                    <ShoppingCart className="w-4 h-4" />
                  </div>
                  <div className="text-xs text-emerald-950 space-y-0.5">
                    <p className="font-bold text-sm">Perfil: Comprador / Administrador</p>
                    <p className="text-emerald-800 leading-relaxed">
                      Você pode atender pedidos, gerenciar a cotação e fazer o <strong>upload da planilha de itens do SENAI (CSV)</strong>.
                    </p>
                  </div>
                </div>
                <Button
                  onClick={() => setShowCsvModal(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-2 px-3.5 shrink-0 rounded-xl flex items-center gap-1.5 shadow-sm"
                >
                  <Upload className="w-4 h-4" /> Upload CSV
                </Button>
              </div>
            ) : (
              <div className="p-3.5 bg-slate-100/90 border border-slate-200 rounded-2xl flex items-center justify-between text-xs text-slate-700 text-left">
                <span className="font-semibold">Acesso Administrativo Completo aos submódulos de compras</span>
                <span className="text-[10px] bg-slate-200 px-2 py-0.5 rounded-md font-bold text-slate-800 uppercase">Admin / Gestor</span>
              </div>
            )}
          </div>
        )}

        {/* Action Cards */}
        {!user ? (
          <Card className="p-8 max-w-md mx-auto text-center space-y-4">
            <div className="w-14 h-14 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center mx-auto">
              <Info className="w-7 h-7" />
            </div>
            <h3 className="text-xl font-bold text-slate-900">Acesso Restrito</h3>
            <p className="text-slate-500 text-sm">
              O módulo de compras é de uso interno para Supervisores, Compradores e Administradores. Faça login para continuar.
            </p>
            <div className="pt-2 flex flex-col gap-2">
              <Button onClick={() => onNavigate('/login')} className="w-full">
                Fazer Login
              </Button>
              <Button variant="ghost" onClick={() => onNavigate('/')} className="w-full">
                Voltar à Página Inicial
              </Button>
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">
            {/* Card 1: Realizar Pedido (Apenas Solicitante/Supervisor/Admin) */}
            {canRequest ? (
              <motion.button
                whileHover={{ scale: 1.02, translateY: -4 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => onNavigate('/compras/novo')}
                className="group relative bg-white p-8 rounded-3xl border border-slate-200/80 shadow-sm hover:shadow-xl transition-all flex flex-col items-center justify-between text-center overflow-hidden min-h-[260px] text-left cursor-pointer"
              >
                <div className="w-full flex flex-col items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-green-600 text-white flex items-center justify-center shadow-lg shadow-green-200 group-hover:scale-110 transition-transform">
                    <PlusCircle className="w-8 h-8" />
                  </div>
                  <div className="space-y-1 text-center">
                    <h2 className="text-xl font-bold text-slate-900">Realizar Pedido de Compra</h2>
                    <p className="text-sm text-slate-500">
                      Cadastre itens necessários para seus cursos, turmas e projetos pedagógicos.
                    </p>
                  </div>
                </div>
                <div className="mt-4 flex items-center text-green-700 font-bold text-sm gap-1">
                  <span>Criar Novo Pedido</span>
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </motion.button>
            ) : (
              <div className="bg-slate-100/70 p-8 rounded-3xl border border-slate-200 flex flex-col items-center justify-center text-center space-y-3 min-h-[260px] opacity-75">
                <div className="w-12 h-12 rounded-2xl bg-slate-200 text-slate-400 flex items-center justify-center">
                  <ShieldAlert className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <p className="font-bold text-slate-700 text-sm">Abertura de Pedidos Desabilitada</p>
                  <p className="text-xs text-slate-500 max-w-xs">
                    Pelo princípio de segregação de funções, compradores não abrem solicitações diretamente.
                  </p>
                </div>
              </div>
            )}

            {/* Card 2: Acompanhar Compras / Atendimento */}
            <motion.button
              whileHover={{ scale: 1.02, translateY: -4 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onNavigate('/compras/acompanhamento')}
              className="group relative bg-white p-8 rounded-3xl border border-slate-200/80 shadow-sm hover:shadow-xl transition-all flex flex-col items-center justify-between text-center overflow-hidden min-h-[260px] text-left cursor-pointer"
            >
              <div className="w-full flex flex-col items-center gap-4">
                <div className={cn(
                  "w-16 h-16 rounded-2xl text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform",
                  canAttend ? "bg-emerald-600 shadow-emerald-200" : "bg-indigo-600 shadow-indigo-200"
                )}>
                  {canAttend ? <ShoppingCart className="w-8 h-8" /> : <Clock className="w-8 h-8" />}
                </div>
                <div className="space-y-1 text-center">
                  <h2 className="text-xl font-bold text-slate-900">
                    Acompanhamento de Compra
                  </h2>
                  <p className="text-sm text-slate-500">
                    {canAttend
                      ? 'Atenda solicitações, defina número de Fluig, altere status e emita comunicados.'
                      : 'Consulte o andamento, histórico de atualizações e solicite posição aos compradores.'}
                  </p>
                </div>
              </div>
              <div className={cn("mt-4 flex items-center font-bold text-sm gap-1", canAttend ? "text-emerald-700" : "text-indigo-700")}>
                <span>{canAttend ? 'Acessar Acompanhamento de Compra' : 'Ver Meus Pedidos'}</span>
                <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </motion.button>
          </div>
        )}

        {/* Back Link */}
        <div className="pt-4">
          <Button
            variant="ghost"
            onClick={() => onNavigate(user ? '/dashboard' : '/')}
            className="text-slate-500 hover:text-slate-900 rounded-xl"
          >
            <ArrowLeft className="w-4 h-4 mr-1" /> {user ? 'Voltar ao Painel Interno' : 'Voltar ao Menu Principal'}
          </Button>
        </div>
      </motion.div>

      {/* Modal Upload CSV de Itens */}
      <AnimatePresence>
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
