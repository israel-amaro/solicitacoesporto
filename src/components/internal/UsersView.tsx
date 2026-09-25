import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  PlusCircle,
  Lock,
  Edit,
  ShieldAlert,
  AlertCircle
} from 'lucide-react';
import { Button, Card, Badge, Input, Sidebar } from '../ui';
import { cn } from '../../lib/utils';
import { Role, Department, UserProfile, AppModule, AVAILABLE_MODULES } from '../../types';

interface UsersViewProps {
  view: string;
  setView: (view: any) => void;
  user: UserProfile | null;
  token: string | null;
  usersList: UserProfile[];
  showAddUsersForm: boolean;
  setShowAddUsersForm: (show: boolean) => void;
  handleAddUser: (e: React.FormEvent<HTMLFormElement>) => void;
  deleteUser: (id: string) => void;
  showMessage: (type: 'success' | 'error', text: string) => void;
  setShowPasswordModal: (show: boolean) => void;
  handleLogout: () => void;
}

function getDefaultModulesForRole(role: Role): AppModule[] {
  switch (role) {
    case 'supervisor':
      return ['compras_solicitar', 'supervisao', 'chamados'];
    case 'comprador':
      return ['compras_atender'];
    case 'admin':
      return ['chamados', 'compras_solicitar', 'compras_atender', 'emprestimos', 'supervisao', 'agendamento', 'painel_aulas', 'users'];
    case 'gestor':
      return ['chamados', 'compras_solicitar', 'compras_atender', 'emprestimos', 'supervisao', 'agendamento', 'painel_aulas'];
    case 'tecnico':
    case 'assistente':
    case 'estagiario':
    case 'analista':
    default:
      return ['chamados', 'emprestimos', 'agendamento'];
  }
}

export const UsersView: React.FC<UsersViewProps> = ({
  view,
  setView,
  user,
  token,
  usersList,
  showAddUsersForm,
  setShowAddUsersForm,
  handleAddUser,
  deleteUser,
  showMessage,
  setShowPasswordModal,
  handleLogout,
}) => {
  const [resetUser, setResetUser] = React.useState<UserProfile | null>(null);
  const [newPassword, setNewPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [resetLoading, setResetLoading] = React.useState(false);

  // Edit user state
  const [editUser, setEditUser] = React.useState<UserProfile | null>(null);
  const [editForm, setEditForm] = React.useState({
    name: '',
    email: '',
    role: 'tecnico' as Role,
    unit: 'PORTO',
    departments: [] as Department[],
    allowed_modules: [] as AppModule[],
    password: ''
  });
  const [editLoading, setEditLoading] = React.useState(false);

  // Create user state
  const [createRole, setCreateRole] = React.useState<Role>('tecnico');
  const [createDepartments, setCreateDepartments] = React.useState<Department[]>([]);
  const [createAllowedModules, setCreateAllowedModules] = React.useState<AppModule[]>(['chamados', 'emprestimos', 'agendamento']);

  const handleCreateRoleChange = (newRole: Role) => {
    setCreateRole(newRole);
    if (newRole === 'supervisor' || newRole === 'comprador') {
      if (!createDepartments.includes('Compras')) {
        setCreateDepartments([...createDepartments, 'Compras']);
      }
    }
    setCreateAllowedModules(getDefaultModulesForRole(newRole));
  };

  const toggleCreateDepartment = (dept: Department) => {
    if (createDepartments.includes(dept)) {
      setCreateDepartments(createDepartments.filter(d => d !== dept));
    } else {
      setCreateDepartments([...createDepartments, dept]);
    }
  };

  const toggleCreateModule = (modId: AppModule) => {
    if (createAllowedModules.includes(modId)) {
      setCreateAllowedModules(createAllowedModules.filter(m => m !== modId));
    } else {
      setCreateAllowedModules([...createAllowedModules, modId]);
    }
  };

  const openEditModal = (u: UserProfile) => {
    setEditUser(u);
    const userModules = (u.allowed_modules && u.allowed_modules.length > 0)
      ? u.allowed_modules
      : getDefaultModulesForRole(u.role);

    setEditForm({
      name: u.name,
      email: u.email,
      role: u.role,
      unit: u.unit || 'PORTO',
      departments: u.departments || [],
      allowed_modules: userModules,
      password: ''
    });
  };

  const handleEditRoleChange = (newRole: Role) => {
    setEditForm(prev => {
      let updatedDepts = [...prev.departments];
      if (newRole === 'supervisor' || newRole === 'comprador') {
        if (!updatedDepts.includes('Compras')) {
          updatedDepts.push('Compras');
        }
      }
      return { 
        ...prev, 
        role: newRole, 
        departments: updatedDepts,
        allowed_modules: getDefaultModulesForRole(newRole)
      };
    });
  };

  const toggleEditDepartment = (dept: Department) => {
    setEditForm(prev => {
      const exists = prev.departments.includes(dept);
      return {
        ...prev,
        departments: exists ? prev.departments.filter(d => d !== dept) : [...prev.departments, dept]
      };
    });
  };

  const toggleEditModule = (modId: AppModule) => {
    setEditForm(prev => {
      const exists = prev.allowed_modules.includes(modId);
      return {
        ...prev,
        allowed_modules: exists 
          ? prev.allowed_modules.filter(m => m !== modId) 
          : [...prev.allowed_modules, modId]
      };
    });
  };

  const handleSaveEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editUser) return;
    setEditLoading(true);
    try {
      const payload: any = {
        name: editForm.name,
        email: editForm.email,
        role: editForm.role,
        unit: editForm.unit,
        departments: editForm.departments,
        allowed_modules: editForm.allowed_modules
      };
      if (editForm.password && editForm.password.length >= 4) {
        payload.password = editForm.password;
      }

      const res = await fetch(`/api/users/${editUser.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (res.ok) {
        showMessage('success', 'Usuário e permissões de abas atualizados com sucesso!');
        setEditUser(null);
        window.location.reload();
      } else {
        showMessage('error', data.error || 'Erro ao atualizar usuário');
      }
    } catch {
      showMessage('error', 'Erro ao conectar ao servidor');
    } finally {
      setEditLoading(false);
    }
  };

  const handleAdminResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetUser) return;
    if (newPassword.length < 4) {
      showMessage('error', 'A senha deve ter pelo menos 4 caracteres');
      return;
    }
    if (newPassword !== confirmPassword) {
      showMessage('error', 'As senhas não coincidem');
      return;
    }

    setResetLoading(true);
    try {
      const res = await fetch(`/api/users/${resetUser.id}/reset-password`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ newPassword })
      });

      const data = await res.json();
      if (res.ok) {
        showMessage('success', data.message || `Senha de ${resetUser.name} redefinida com sucesso!`);
        setResetUser(null);
        setNewPassword('');
        setConfirmPassword('');
      } else {
        showMessage('error', data.error || 'Erro ao redefinir senha');
      }
    } catch {
      showMessage('error', 'Erro ao conectar ao servidor');
    } finally {
      setResetLoading(false);
    }
  };

  const allDepartments: Department[] = ['TI', 'Manutenção', 'Limpeza', 'Supervisão', 'Compras'];

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
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-10">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Gestão de Usuários & Perfis</h1>
            <p className="text-slate-500">Cadastre usuários, defina perfis (Supervisor, Comprador, Técnico) e configure o acesso a cada aba do sistema.</p>
          </div>
          <Button onClick={() => {
            setCreateRole('tecnico');
            setCreateDepartments([]);
            setCreateAllowedModules(['chamados', 'emprestimos', 'agendamento']);
            setShowAddUsersForm(true);
          }} className="bg-blue-600 hover:bg-blue-700 text-white font-bold"><PlusCircle className="w-4 h-4" /> Novo Usuário</Button>
        </header>

        <div className="grid gap-4">
          {Array.isArray(usersList) && usersList.map(u => {
            const userEffectiveModules = (u.allowed_modules && u.allowed_modules.length > 0)
              ? u.allowed_modules
              : getDefaultModulesForRole(u.role);

            return (
              <Card key={u.id} className="p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 hover:shadow-md transition-shadow">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-blue-100 text-blue-700 rounded-2xl flex items-center justify-center font-black text-lg shrink-0">
                    {u.name ? u.name[0].toUpperCase() : '?'}
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-bold text-slate-900 text-base">{u.name}</p>
                      <Badge className={
                        u.role === 'admin' ? 'bg-purple-100 text-purple-700 font-bold' : 
                        u.role === 'comprador' ? 'bg-green-100 text-green-700 font-bold' : 
                        u.role === 'supervisor' ? 'bg-indigo-100 text-indigo-700 font-bold' : 
                        'bg-blue-100 text-blue-700 font-bold'
                      }>
                        {u.role}
                      </Badge>
                      {u.unit && <Badge className="bg-slate-100 text-slate-700">{u.unit}</Badge>}
                    </div>
                    <p className="text-sm text-slate-500 font-medium">{u.email}</p>

                    {/* Setores */}
                    {u.departments && u.departments.length > 0 && (
                      <div className="flex items-center gap-1.5 pt-1 flex-wrap">
                        <span className="text-xs font-semibold text-slate-400">Setores:</span>
                        {u.departments.map(d => (
                          <span key={d} className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-bold uppercase border border-slate-200">
                            {d}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Abas e Módulos com Acesso */}
                    <div className="flex items-center gap-1.5 pt-1.5 flex-wrap">
                      <span className="text-xs font-semibold text-slate-400">Abas Liberadas:</span>
                      {AVAILABLE_MODULES.map(m => {
                        const hasAccess = userEffectiveModules.includes(m.id);
                        if (!hasAccess && u.role !== 'admin') return null;
                        return (
                          <span 
                            key={m.id} 
                            className={cn(
                              "text-[10px] px-2 py-0.5 rounded-md font-bold flex items-center gap-1 border",
                              m.id === 'compras_solicitar' ? "bg-indigo-50 text-indigo-700 border-indigo-200" :
                              m.id === 'compras_atender' ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                              m.id === 'compras' ? "bg-green-50 text-green-700 border-green-200" :
                              m.id === 'supervisao' ? "bg-purple-50 text-purple-700 border-purple-200" :
                              m.id === 'emprestimos' ? "bg-orange-50 text-orange-700 border-orange-200" :
                              m.id === 'users' ? "bg-red-50 text-red-700 border-red-200" :
                              "bg-blue-50 text-blue-700 border-blue-200"
                            )}
                          >
                            {m.id === 'compras_solicitar' ? 'Compras (Solicitante)' :
                             m.id === 'compras_atender' ? 'Compras (Comprador/Aprovação)' :
                             m.label}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 sm:gap-3 flex-wrap self-end lg:self-center">
                  {user?.role === 'admin' && (
                    <>
                      <Button
                        variant="outline"
                        onClick={() => openEditModal(u)}
                        className="text-blue-700 border-blue-200 hover:bg-blue-50 text-xs px-3.5 py-2 h-auto font-bold flex items-center gap-1.5 rounded-xl shadow-none"
                      >
                        <Edit className="w-3.5 h-3.5" /> Editar Abas & Perfil
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setResetUser(u);
                          setNewPassword('');
                          setConfirmPassword('');
                        }}
                        className="text-amber-700 border-amber-200 hover:bg-amber-50 hover:text-amber-800 text-xs px-3.5 py-2 h-auto font-bold flex items-center gap-1.5 rounded-xl shadow-none"
                      >
                        <Lock className="w-3.5 h-3.5" /> Redefinir Senha
                      </Button>
                    </>
                  )}

                  {u.email !== 'admin' && (
                    <Button variant="ghost" onClick={() => deleteUser(u.id)} className="text-red-500 hover:bg-red-50 text-xs px-3 py-2 h-auto rounded-xl">
                      Excluir
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>

        {/* Modal Editar Usuário e Permissões de Abas */}
        <AnimatePresence>
          {editUser && (
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 z-50 overflow-y-auto">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="max-w-xl w-full my-8"
              >
                <Card className="p-6 sm:p-8 space-y-6 max-h-[90vh] overflow-y-auto rounded-3xl shadow-2xl">
                  <div className="flex items-center gap-3 text-slate-900 border-b border-slate-100 pb-4">
                    <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl border border-blue-100">
                      <Edit className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold">Editar Usuário & Permissões</h3>
                      <p className="text-sm text-slate-500 font-medium">{editUser.name} ({editUser.email})</p>
                    </div>
                  </div>

                  <form onSubmit={handleSaveEditUser} className="space-y-5">
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-sm font-bold text-slate-700 ml-1">Nome Completo</label>
                        <Input
                          value={editForm.name}
                          onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                          required
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-sm font-bold text-slate-700 ml-1">Email / Usuário</label>
                        <Input
                          value={editForm.email}
                          onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-sm font-bold text-slate-700 ml-1">Nova Senha (opcional)</label>
                      <Input
                        type="password"
                        placeholder="Deixe em branco para manter a senha atual"
                        value={editForm.password}
                        onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                      />
                    </div>

                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-sm font-bold text-slate-700 ml-1">Perfil de Acesso</label>
                        <select
                          value={editForm.role}
                          onChange={(e) => handleEditRoleChange(e.target.value as Role)}
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 outline-none font-semibold text-slate-800 focus:bg-white focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all"
                        >
                          <option value="supervisor">Supervisor (Solicita Compras)</option>
                          <option value="comprador">Comprador (Atende Pedidos de Compra)</option>
                          <option value="tecnico">Técnico (Atendimento de Chamados)</option>
                          <option value="gestor">Gestor / Coordenador</option>
                          <option value="admin">Administrador Geral</option>
                          <option value="assistente">Assistente</option>
                          <option value="estagiario">Estagiário</option>
                          <option value="analista">Analista</option>
                        </select>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-sm font-bold text-slate-700 ml-1">Unidade</label>
                        <select
                          value={editForm.unit}
                          onChange={(e) => setEditForm({ ...editForm, unit: e.target.value })}
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 outline-none font-semibold text-slate-800 focus:bg-white focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all"
                        >
                          <option value="PORTO">Porto</option>
                        </select>
                      </div>
                    </div>

                    {/* Setores */}
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-slate-700 ml-1">Setores Vinculados</label>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {allDepartments.map(dept => (
                          <label key={dept} className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer hover:bg-slate-100 transition-colors">
                            <input
                              type="checkbox"
                              checked={editForm.departments.includes(dept)}
                              onChange={() => toggleEditDepartment(dept)}
                              className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="text-xs font-bold text-slate-800">{dept}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Abas e Módulos de Visualização e Acesso */}
                    <div className="space-y-3 pt-2 border-t border-slate-100">
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-bold text-slate-800 ml-1">
                          Abas e Módulos Liberados no Painel
                        </label>
                        <span className="text-xs text-blue-600 font-semibold">Controle detalhado de acessos</span>
                      </div>

                      {/* Banner de Segregação de Funções */}
                      <div className="p-3.5 bg-amber-50/90 border border-amber-200 rounded-2xl flex items-start gap-2.5 text-xs text-amber-900">
                        <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                        <div className="space-y-1">
                          <p className="font-bold text-amber-950">
                            Regra de Segregação de Funções (Compliance)
                          </p>
                          <p className="text-amber-800 text-[11px] leading-relaxed">
                            A pessoa que <strong>solicita a compra</strong> (Supervisor / Solicitante) <strong>não pode ser a mesma</strong> que atende o pedido, cota Fluig e aprova (Comprador). O solicitante apenas cria e acompanha o histórico.
                          </p>
                        </div>
                      </div>

                      {/* Alerta de Conflito caso ambos sejam marcados */}
                      {editForm.allowed_modules.includes('compras_solicitar') && editForm.allowed_modules.includes('compras_atender') && editForm.role !== 'admin' && (
                        <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-2.5 text-xs text-rose-800 font-semibold">
                          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                          <span>Atenção: Este usuário está com permissão tanto para <strong>Solicitar</strong> quanto para <strong>Atender/Aprovar Compras</strong>. Recomendamos separar essas funções.</span>
                        </div>
                      )}

                      <div className="grid gap-2.5">
                        {AVAILABLE_MODULES.map(m => {
                          const checked = editForm.allowed_modules.includes(m.id);
                          return (
                            <label 
                              key={m.id} 
                              className={cn(
                                "flex items-start gap-3 p-3.5 rounded-2xl border transition-all cursor-pointer",
                                checked ? "bg-blue-50/80 border-blue-300 shadow-sm" : "bg-white border-slate-200 hover:bg-slate-50",
                                m.id === 'compras_solicitar' && checked && "bg-indigo-50/80 border-indigo-300",
                                m.id === 'compras_atender' && checked && "bg-emerald-50/80 border-emerald-300"
                              )}
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => toggleEditModule(m.id)}
                                className="w-4 h-4 mt-1 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                              />
                              <div className="space-y-1 flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <p className={cn("text-xs font-bold", checked ? "text-slate-900" : "text-slate-700")}>
                                    {m.label}
                                  </p>
                                  {m.badge && (
                                    <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-md border", m.badgeColor || "bg-slate-100 text-slate-700")}>
                                      {m.badge}
                                    </span>
                                  )}
                                </div>
                                <p className="text-[11px] text-slate-500 leading-snug">
                                  {m.description}
                                </p>
                                {m.warning && checked && (
                                  <p className="text-[10px] font-bold text-amber-700 bg-amber-100/60 px-2 py-1 rounded-lg mt-1 inline-block">
                                    ⚠️ {m.warning}
                                  </p>
                                )}
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    </div>

                    <div className="flex gap-3 pt-4 border-t border-slate-100">
                      <Button
                        type="button"
                        variant="secondary"
                        className="flex-1 rounded-xl"
                        onClick={() => setEditUser(null)}
                        disabled={editLoading}
                      >
                        Cancelar
                      </Button>
                      <Button
                        type="submit"
                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md"
                        disabled={editLoading}
                      >
                        {editLoading ? 'Salvando...' : 'Salvar Alterações'}
                      </Button>
                    </div>
                  </form>
                </Card>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Modal Redefinir Senha do Usuário pelo Admin */}
        <AnimatePresence>
          {resetUser && (
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-6 z-50">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="max-w-md w-full"
              >
                <Card className="p-8 space-y-6 rounded-3xl shadow-2xl">
                  <div className="flex items-center gap-3 text-slate-900">
                    <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl border border-amber-100">
                      <Lock className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold">Redefinir Senha</h3>
                      <p className="text-sm text-slate-500">Usuário: <span className="font-semibold text-slate-700">{resetUser.name}</span> ({resetUser.email})</p>
                    </div>
                  </div>

                  <form onSubmit={handleAdminResetPassword} className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-sm font-semibold text-slate-700 ml-1">Nova Senha para o Usuário</label>
                      <Input
                        type="password"
                        placeholder="Digite a nova senha"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-semibold text-slate-700 ml-1">Confirmar Nova Senha</label>
                      <Input
                        type="password"
                        placeholder="Confirme a nova senha"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                      />
                    </div>

                    <div className="flex gap-3 pt-4">
                      <Button
                        type="button"
                        variant="secondary"
                        className="flex-1 rounded-xl"
                        onClick={() => {
                          setResetUser(null);
                          setNewPassword('');
                          setConfirmPassword('');
                        }}
                        disabled={resetLoading}
                      >
                        Cancelar
                      </Button>
                      <Button
                        type="submit"
                        className="flex-1 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl"
                        disabled={resetLoading}
                      >
                        {resetLoading ? 'Salvando...' : 'Redefinir'}
                      </Button>
                    </div>
                  </form>
                </Card>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Modal Novo Usuário */}
        <AnimatePresence>
          {showAddUsersForm && (
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 z-50 overflow-y-auto">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="max-w-xl w-full my-8"
              >
                <Card className="p-6 sm:p-8 space-y-6 max-h-[90vh] overflow-y-auto rounded-3xl shadow-2xl">
                  <div className="flex items-center gap-3 text-slate-900 border-b border-slate-100 pb-4">
                    <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl border border-blue-100">
                      <PlusCircle className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold">Novo Usuário</h3>
                      <p className="text-sm text-slate-500">Cadastre um novo usuário e personalize suas abas liberadas.</p>
                    </div>
                  </div>

                  <form onSubmit={handleAddUser} className="space-y-4">
                    <div className="grid sm:grid-cols-2 gap-4">
                      <Input label="Nome Completo" name="name" required />
                      <Input label="Email / Usuário" name="email" required />
                    </div>
                    <Input label="Senha" name="password" type="password" required />

                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-sm font-bold text-slate-700 ml-1">Perfil</label>
                        <select
                          name="role"
                          value={createRole}
                          onChange={(e) => handleCreateRoleChange(e.target.value as Role)}
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 outline-none font-semibold text-slate-800 focus:bg-white focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all"
                        >
                          <option value="supervisor">Supervisor (Solicita Compras)</option>
                          <option value="comprador">Comprador (Atende Pedidos de Compra)</option>
                          <option value="tecnico">Técnico (Atendimento de Chamados)</option>
                          <option value="gestor">Gestor / Coordenador</option>
                          <option value="admin">Administrador Geral</option>
                          <option value="assistente">Assistente</option>
                          <option value="estagiario">Estagiário</option>
                          <option value="analista">Analista</option>
                        </select>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-sm font-bold text-slate-700 ml-1">Unidade</label>
                        <select name="unit" className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 outline-none font-semibold text-slate-800 focus:bg-white focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all">
                          <option value="PORTO">Porto</option>
                        </select>
                      </div>
                    </div>

                    {/* Setores */}
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-slate-700 ml-1">Setores Vinculados</label>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {allDepartments.map(dept => (
                          <label key={dept} className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer hover:bg-slate-100 transition-colors">
                            <input
                              type="checkbox"
                              name="departments"
                              value={dept}
                              checked={createDepartments.includes(dept)}
                              onChange={() => toggleCreateDepartment(dept)}
                              className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="text-xs font-bold text-slate-800">{dept}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Abas e Módulos Permitidos */}
                    <div className="space-y-3 pt-2 border-t border-slate-100">
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-bold text-slate-800 ml-1">
                          Abas e Módulos Liberados no Painel
                        </label>
                        <span className="text-xs text-blue-600 font-semibold">Controle detalhado de acessos</span>
                      </div>

                      {/* Banner de Segregação de Funções */}
                      <div className="p-3.5 bg-amber-50/90 border border-amber-200 rounded-2xl flex items-start gap-2.5 text-xs text-amber-900">
                        <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                        <div className="space-y-1">
                          <p className="font-bold text-amber-950">
                            Regra de Segregação de Funções (Compliance)
                          </p>
                          <p className="text-amber-800 text-[11px] leading-relaxed">
                            A pessoa que <strong>solicita a compra</strong> (Supervisor / Solicitante) <strong>não pode ser a mesma</strong> que atende o pedido, cota Fluig e aprova (Comprador). O solicitante apenas cria e acompanha o histórico.
                          </p>
                        </div>
                      </div>

                      {/* Alerta de Conflito caso ambos sejam marcados */}
                      {createAllowedModules.includes('compras_solicitar') && createAllowedModules.includes('compras_atender') && createRole !== 'admin' && (
                        <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-2.5 text-xs text-rose-800 font-semibold">
                          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                          <span>Atenção: Você selecionou tanto 'Solicitar Compras' quanto 'Atender/Aprovar Compras'. Em conformidade, esses papéis devem ser atribuídos a pessoas distintas.</span>
                        </div>
                      )}

                      <div className="grid gap-2.5">
                        {AVAILABLE_MODULES.map(m => {
                          const checked = createAllowedModules.includes(m.id);
                          return (
                            <label 
                              key={m.id} 
                              className={cn(
                                "flex items-start gap-3 p-3.5 rounded-2xl border transition-all cursor-pointer",
                                checked ? "bg-blue-50/80 border-blue-300 shadow-sm" : "bg-white border-slate-200 hover:bg-slate-50",
                                m.id === 'compras_solicitar' && checked && "bg-indigo-50/80 border-indigo-300",
                                m.id === 'compras_atender' && checked && "bg-emerald-50/80 border-emerald-300"
                              )}
                            >
                              <input
                                type="checkbox"
                                name="allowed_modules"
                                value={m.id}
                                checked={checked}
                                onChange={() => toggleCreateModule(m.id)}
                                className="w-4 h-4 mt-1 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                              />
                              <div className="space-y-1 flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <p className={cn("text-xs font-bold", checked ? "text-slate-900" : "text-slate-700")}>
                                    {m.label}
                                  </p>
                                  {m.badge && (
                                    <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-md border", m.badgeColor || "bg-slate-100 text-slate-700")}>
                                      {m.badge}
                                    </span>
                                  )}
                                </div>
                                <p className="text-[11px] text-slate-500 leading-snug">
                                  {m.description}
                                </p>
                                {m.warning && checked && (
                                  <p className="text-[10px] font-bold text-amber-700 bg-amber-100/60 px-2 py-1 rounded-lg mt-1 inline-block">
                                    ⚠️ {m.warning}
                                  </p>
                                )}
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    </div>

                    <div className="flex gap-3 pt-4 border-t border-slate-100">
                      <Button type="button" variant="secondary" className="flex-1 rounded-xl" onClick={() => setShowAddUsersForm(false)}>Cancelar</Button>
                      <Button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md">Criar Usuário</Button>
                    </div>
                  </form>
                </Card>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
};
