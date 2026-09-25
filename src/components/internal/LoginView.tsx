import React from 'react';
import { Button, Card, Input } from '../ui';

interface LoginViewProps {
  setView: (view: any) => void;
  handleLogin: (e: React.FormEvent<HTMLFormElement>) => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ setView, handleLogin }) => (
  <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
    <Card className="max-w-md w-full p-8 space-y-8">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold text-slate-900">Acesso Restrito</h2>
        <p className="text-slate-500">Entre com suas credenciais de técnico ou admin.</p>
      </div>
      <form onSubmit={handleLogin} className="space-y-6">
        <Input label="Usuário / Email" name="email" required />
        <Input label="Senha" name="password" type="password" required />
        <Button type="submit" className="w-full h-12">Entrar</Button>
        <Button type="button" variant="ghost" onClick={() => setView('home')} className="w-full">Voltar</Button>
      </form>
    </Card>
  </div>
);
