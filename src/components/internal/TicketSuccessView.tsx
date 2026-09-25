import React from 'react';
import { motion } from 'motion/react';
import { CheckCircle2 } from 'lucide-react';
import { Button, Badge } from '../ui';
import { Category } from '../../types';

interface TicketSuccessViewProps {
  createdTicketId: string | null;
  selectedUnit: string;
  selectedCategory: Category | null;
  setView: (view: any) => void;
  setSelectedCategory: (cat: Category | null) => void;
  setCreatedTicketId: (id: string | null) => void;
}

export const TicketSuccessView: React.FC<TicketSuccessViewProps> = ({
  createdTicketId,
  selectedUnit,
  selectedCategory,
  setView,
  setSelectedCategory,
  setCreatedTicketId,
}) => (
  <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="max-w-md w-full bg-white p-10 rounded-3xl shadow-xl border border-slate-100 space-y-8"
    >
      <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
        <CheckCircle2 className="w-10 h-10" />
      </div>

      <div className="space-y-4">
        <h2 className="text-3xl font-bold text-slate-900">Solicitação Enviada!</h2>
        {createdTicketId && (
          <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 text-center">
            <p className="text-sm text-blue-600 font-medium mb-1">Número do seu chamado</p>
            <p className="text-3xl font-black text-blue-700">#{createdTicketId}</p>
            <p className="text-xs text-blue-500 mt-2">Guarde este número para acompanhar sua solicitação</p>
          </div>
        )}
        <div className="flex justify-center gap-2">
          <Badge className="bg-blue-50 text-blue-600 border-blue-100">{selectedUnit}</Badge>
          <Badge className="bg-slate-50 text-slate-600 border-slate-100">{selectedCategory}</Badge>
        </div>
        <div className="space-y-2 text-slate-600">
          <p className="font-medium">Tempo de reposta para a solicitação é de 2h.</p>
          <p className="text-sm">Para resolução do Problema o tempo é de 24 a 48 hrs a depender da complexidade.</p>
        </div>
      </div>

      <div className="space-y-3">
        <Button
          onClick={() => setView('ticket-tracking')}
          className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all"
        >
          Acompanhar Chamado
        </Button>
        <Button
          onClick={() => {
            setSelectedCategory(null);
            setCreatedTicketId(null);
            setView('home');
          }}
          variant="outline"
          className="w-full h-12 rounded-xl font-bold transition-all"
        >
          Sair
        </Button>
      </div>
    </motion.div>
  </div>
);
