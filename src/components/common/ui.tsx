import React from 'react';
import { cn } from '../../lib/utils';
import { 
  LayoutDashboard, 
  Users, 
  Lock, 
  LogOut, 
  Briefcase, 
  ShoppingCart,
  Calendar,
  CalendarRange
} from 'lucide-react';
import { UserProfile, hasModuleAccess } from '../../types';

// ---- Button ----
export const Button = ({ className, variant = 'primary', ...props }: any) => {
  const variants: any = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-200',
    secondary: 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50',
    outline: 'bg-transparent border-2 border-blue-600 text-blue-600 hover:bg-blue-50',
    ghost: 'bg-transparent text-slate-500 hover:bg-slate-100',
    danger: 'bg-red-500 text-white hover:bg-red-600',
  };
  return (
    <button
      className={cn(
        'px-4 py-2 rounded-xl font-medium transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2',
        variants[variant],
        className
      )}
      {...props}
    />
  );
};

// ---- Input ----
export const Input = ({ label, error, ...props }: any) => (
  <div className="space-y-1.5 w-full">
    {label && <label className="text-sm font-semibold text-slate-700 ml-1">{label}</label>}
    <input
      className={cn(
        "w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all",
        error && "border-red-500 focus:ring-red-100"
      )}
      {...props}
    />
    {error && <p className="text-xs text-red-500 mt-1 ml-1">{error}</p>}
  </div>
);

// ---- Card ----
export const Card = ({ children, className, ...props }: any) => (
  <div
    className={cn("bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden", className)}
    {...props}
  >
    {children}
  </div>
);

// ---- Badge ----
export const Badge = ({ children, className }: any) => (
  <span className={cn("px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider", className)}>
    {children}
  </span>
);

// ---- Sidebar ----
interface SidebarProps {
  view: string;
  setView: (view: any) => void;
  user: UserProfile | null;
  setShowPasswordModal: (show: boolean) => void;
  handleLogout: () => void;
}

export const Sidebar = ({ view, setView, user, setShowPasswordModal, handleLogout }: SidebarProps) => (
  <aside className="w-64 bg-white border-r border-slate-200 hidden md:flex flex-col p-6 space-y-8">
    <div className="space-y-4">
      <div className="flex flex-col items-center justify-center">
        <img
          src="https://lh3.googleusercontent.com/d/1x_2FRXCBA5T2PDG7JjDx6me8RboCVaj0"
          alt="Logo 2"
          className="w-32 h-auto object-contain"
          referrerPolicy="no-referrer"
        />
      </div>
    </div>

    <nav className="flex-1 space-y-2">
      {hasModuleAccess(user, 'chamados') && (
        <button
          onClick={() => setView('dashboard')}
          className={cn(
            "w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors",
            view === 'dashboard' ? "bg-blue-50 text-blue-600 font-semibold" : "text-slate-600 hover:bg-slate-50"
          )}
        >
          <LayoutDashboard className="w-5 h-5" /> Dashboard
        </button>
      )}

      {hasModuleAccess(user, 'compras') && (
        <button
          onClick={() => setView('compras')}
          className={cn(
            "w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors",
            view?.startsWith('compras') ? "bg-green-50 text-green-700 font-semibold" : "text-slate-600 hover:bg-slate-50"
          )}
        >
          <ShoppingCart className="w-5 h-5" /> Compras
        </button>
      )}

      {hasModuleAccess(user, 'emprestimos') && (
        <button
          onClick={() => setView('loans-dashboard')}
          className={cn(
            "w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors",
            view === 'loans-dashboard' ? "bg-blue-50 text-blue-600 font-semibold" : "text-slate-600 hover:bg-slate-50"
          )}
        >
          <Briefcase className="w-5 h-5" /> Empréstimos
        </button>
      )}

      {hasModuleAccess(user, 'agendamento') && (
        <button
          onClick={() => setView('agendamento-de-ambiente')}
          className={cn(
            "w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors",
            view === 'agendamento-de-ambiente' ? "bg-blue-50 text-blue-600 font-semibold" : "text-slate-600 hover:bg-slate-50"
          )}
        >
          <Calendar className="w-5 h-5" /> Agendamento
        </button>
      )}

      {hasModuleAccess(user, 'painel_aulas') && (
        <button
          onClick={() => setView('painel-de-aulas')}
          className={cn(
            "w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors",
            view === 'painel-de-aulas' ? "bg-blue-50 text-blue-600 font-semibold" : "text-slate-600 hover:bg-slate-50"
          )}
        >
          <CalendarRange className="w-5 h-5" /> Painel de Aulas
        </button>
      )}

      {hasModuleAccess(user, 'users') && (
        <button
          onClick={() => setView('users')}
          className={cn(
            "w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors",
            view === 'users' ? "bg-blue-50 text-blue-600 font-semibold" : "text-slate-600 hover:bg-slate-50"
          )}
        >
          <Users className="w-5 h-5" /> Usuários
        </button>
      )}

      <button
        onClick={() => setShowPasswordModal(true)}
        className="w-full flex items-center gap-3 px-4 py-3 text-slate-600 hover:bg-slate-50 rounded-xl font-medium transition-colors"
      >
        <Lock className="w-5 h-5" /> Alterar Senha
      </button>
    </nav>

    <div className="pt-6 border-t border-slate-100">
      <div className="px-4 py-3 bg-slate-50 rounded-xl mb-4">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Logado como</p>
        <p className="font-bold text-slate-900 truncate">{user?.name}</p>
        <Badge className={
          user?.role === 'admin' ? 'bg-purple-100 text-purple-700 mt-1' :
          user?.role === 'supervisor' ? 'bg-indigo-100 text-indigo-700 mt-1' :
          user?.role === 'comprador' ? 'bg-green-100 text-green-700 mt-1' :
          'bg-blue-100 text-blue-700 mt-1'
        }>
          {user?.role}
        </Badge>
      </div>
      <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 text-red-500 hover:bg-red-50 rounded-xl font-medium transition-colors">
        <LogOut className="w-5 h-5" /> Sair
      </button>
    </div>
  </aside>
);
