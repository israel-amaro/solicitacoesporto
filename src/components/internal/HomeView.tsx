import React from 'react';
import { motion } from 'motion/react';
import {
  Search,
  Monitor,
  Cpu,
  Wrench,
  Brush,
  Briefcase,
  Calendar,
  Link2,
  LogIn
} from 'lucide-react';
import { Button } from '../ui';
import { cn } from '../../lib/utils';
import { UserProfile } from '../../types';
import { AGENDAMENTO_AMBIENTES_URL, PAINEL_AULAS_URL } from '../../constants';

interface HomeViewProps {
  onNavigate: (path: string) => void;
  user?: UserProfile | null;
  onLogout?: () => void;
}

export const HomeView: React.FC<HomeViewProps> = ({ onNavigate, user, onLogout }) => {
  const buttons: Array<{
    id: string;
    route?: string;
    href?: string;
    target?: string;
    label: string;
    icon: any;
    color: string;
  }> = [
    { id: 'ti', route: '/ti', label: 'TI', icon: Cpu, color: 'bg-blue-600' },
    { id: 'limpeza', route: '/limpeza', label: 'Limpeza', icon: Brush, color: 'bg-emerald-600' },
    { id: 'manutencao', route: '/manutencao', label: 'Manutenção', icon: Wrench, color: 'bg-amber-600' },
    { id: 'supervisao', route: '/supervisao', label: 'Supervisão', icon: Briefcase, color: 'bg-violet-600' },
    { id: 'emprestimos', route: '/emprestimos', label: 'Empréstimos', icon: Monitor, color: 'bg-orange-600' },
    { id: 'agendamento', href: AGENDAMENTO_AMBIENTES_URL, target: '_blank', label: 'Agendamento Ambientes', icon: Calendar, color: 'bg-slate-700' },
    { id: 'painel', href: PAINEL_AULAS_URL, target: '_blank', label: 'Painel de Aulas', icon: Briefcase, color: 'bg-indigo-600' },
    { id: 'acompanhamento', route: '/acompanhamento', label: 'Acompanhamento de Chamados', icon: Search, color: 'bg-teal-600' },
    { id: 'links-uteis', route: '/links-uteis', label: 'Links Úteis', icon: Link2, color: 'bg-rose-600' },
  ];

  const cardClass = "group relative bg-white p-4 sm:p-5 lg:p-4 lg:px-1 xl:px-4 rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl hover:border-blue-500 hover:-translate-y-1 transition-all flex flex-col items-center justify-center gap-4 text-center overflow-hidden h-full w-full cursor-pointer";

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-blue-100/50 rounded-full blur-3xl" />
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-emerald-100/50 rounded-full blur-3xl" />
      </div>

      {/* Se o usuário estiver conectado, exibir banner de acesso rápido no topo */}
      {user && (
        <div className="fixed top-4 right-4 sm:top-6 sm:right-6 z-50 flex items-center gap-2 bg-white/90 backdrop-blur-md border border-slate-200/80 px-4 py-2 rounded-2xl shadow-lg">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <div className="text-left hidden sm:block">
            <p className="text-xs font-bold text-slate-800 leading-tight">{user.name}</p>
            <p className="text-[10px] text-slate-500 uppercase tracking-wider">{user.role}</p>
          </div>
          <Button
            onClick={() => onNavigate('/dashboard')}
            className="text-xs py-1.5 px-3 bg-blue-600 hover:bg-blue-700 font-bold ml-1 rounded-xl"
          >
            Meu Painel
          </Button>
          {onLogout && (
            <Button
              onClick={onLogout}
              variant="ghost"
              className="text-xs py-1.5 px-2.5 text-slate-500 hover:text-red-600 rounded-xl"
            >
              Sair
            </Button>
          )}
        </div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-5xl w-full text-center space-y-12 relative z-10"
      >
        <div className="space-y-8">
          <div className="flex items-center justify-center">
            <img
              src="https://lh3.googleusercontent.com/d/1x_2FRXCBA5T2PDG7JjDx6me8RboCVaj0"
              alt="Logo 2"
              className="h-16 md:h-24 object-contain"
              referrerPolicy="no-referrer"
            />
          </div>
          <div className="space-y-2">
            <h1 className="text-4xl font-black text-slate-900 tracking-tight">Solicitações Porto</h1>
            <p className="text-slate-500 text-lg font-medium">Selecione o serviço desejado para iniciar sua solicitação</p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6 xl:gap-6 max-w-4xl mx-auto">
          {buttons.map((btn) => {
            const content = (
              <>
                <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-lg transition-transform group-hover:scale-110", btn.color)}>
                  <btn.icon className="w-7 h-7" />
                </div>
                <span className={cn(
                  "font-bold text-slate-700 uppercase text-center w-full block break-normal leading-tight whitespace-normal",
                  btn.label.length > 12
                    ? "text-[9px] sm:text-[10px] md:text-[9px] xl:text-[10px] tracking-tighter"
                    : btn.label.length > 8
                      ? "text-[10px] sm:text-[11px] md:text-[10px] xl:text-xs tracking-tight"
                      : "text-xs tracking-wider"
                )}>
                  {btn.label}
                </span>
              </>
            );

            if (btn.href) {
              return (
                <a
                  key={btn.id}
                  href={btn.href}
                  target={btn.target || "_blank"}
                  rel="noopener noreferrer"
                  className={cardClass}
                >
                  {content}
                </a>
              );
            }

            return (
              <button key={btn.id} onClick={() => onNavigate(btn.route!)} className={cardClass}>
                {content}
              </button>
            );
          })}
        </div>

        {/* Botão de Acesso ao Sistema Interno */}
        <div className="pt-8 border-t border-slate-200 flex justify-center">
          {user ? (
            <Button
              onClick={() => onNavigate('/dashboard')}
              variant="secondary"
              className="h-12 border-blue-200 text-blue-700 bg-blue-50/80 hover:bg-blue-100 rounded-xl px-6 font-bold shadow-sm"
            >
              <Briefcase className="w-5 h-5" />
              Acessar Painel Interno ({user.name})
            </Button>
          ) : (
            <Button
              onClick={() => onNavigate('/login')}
              variant="ghost"
              className="h-12 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-xl px-6"
            >
              <LogIn className="w-5 h-5" />
              Entrar no Sistema Interno
            </Button>
          )}
        </div>
      </motion.div>
    </div>
  );
};
