import React, { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Button, Card, Badge, Input } from '../ui';
import { uploadFile } from '../../lib/storage';
import { UNIT_LOCATIONS } from '../../constants';
import { Priority, Category } from '../../types';

interface OpenTicketViewProps {
  selectedUnit: string;
  setSelectedUnit: (unit: string) => void;
  selectedCategory: Category | null;
  setView: (view: any) => void;
  showMessage: (type: 'success' | 'error', text: string) => void;
  loading: boolean;
  setLoading: (loading: boolean) => void;
  setCreatedTicketId: (id: string | null) => void;
}

export const OpenTicketView = ({
  selectedUnit,
  setSelectedUnit,
  selectedCategory,
  setView,
  showMessage,
  loading,
  setLoading,
  setCreatedTicketId
}: OpenTicketViewProps) => {
  const [ticketPriority, setTicketPriority] = useState<Priority>('baixo');
  const [evidenceFiles, setEvidenceFiles] = useState<File[]>([]);

  const handleOpenTicket = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);

    try {
      let evidenceUrls: string[] = [];
      let evidencePaths: string[] = [];

      if (evidenceFiles.length > 0) {
        for (const file of evidenceFiles) {
          const { url, path } = await uploadFile(file);
          evidenceUrls.push(url);
          evidencePaths.push(path);
        }
      }

      const payload: any = {
        ...Object.fromEntries(formData.entries()),
        category: selectedCategory,
        evidenceUrls,
        evidencePaths
      };

      if (payload.unit) {
        setSelectedUnit(payload.unit as string);
      }

      const res = await fetch('/api/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const contentType = res.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        const text = await res.text();
        console.error("Non-JSON response:", text);
        throw new Error(`Erro do servidor: ${text.substring(0, 50)}...`);
      }

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Erro desconhecido no servidor');
      }

      showMessage('success', `Chamado #${data.numeric_id || data.id} aberto com sucesso!`);
      setCreatedTicketId(data.numeric_id || data.id);
      setEvidenceFiles([]);
      setView('ticket-success');
    } catch (e: any) {
      showMessage('error', e.message || 'Erro ao abrir chamado');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        <Button variant="ghost" onClick={() => setView('home')} className="mb-4">
          <ArrowLeft className="w-4 h-4" /> Voltar para Início
        </Button>

        <Card className="p-8 space-y-8">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h2 className="text-3xl font-bold text-slate-900">Nova Solicitação</h2>
              <div className="flex gap-2 animate-fade-in">
                <Badge className="bg-blue-600 text-white px-4 py-1.5">{selectedUnit || 'PORTO'}</Badge>
                <Badge className="bg-slate-600 text-white px-4 py-1.5">{selectedCategory}</Badge>
              </div>
            </div>
            <p className="text-slate-500">Preencha os detalhes abaixo para que possamos ajudar.</p>
          </div>

          <form onSubmit={handleOpenTicket} className="space-y-6">
            <input type="hidden" name="unit" value={selectedUnit || 'PORTO'} />

            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700 ml-1">Ambiente</label>
              <select
                name="location"
                required
                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all"
              >
                <option value="">Selecione o Ambiente...</option>
                {(UNIT_LOCATIONS[selectedUnit || 'PORTO'] || []).map((loc) => (
                  <option key={loc} value={loc}>{loc}</option>
                ))}
              </select>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <Input label="Nome Completo" name="requester_name" required />
              <Input label="Matrícula" name="registration" required />
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              <Input label="Telefone" name="phone" required />
              <Input label="Email Corporativo" name="email" type="email" required />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700 ml-1">Prioridade</label>
              <select
                name="priority"
                required
                value={ticketPriority}
                onChange={(e: any) => setTicketPriority(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all"
              >
                <option value="baixo">Baixo</option>
                <option value="medio">Médio</option>
                <option value="urgente">Urgente</option>
              </select>
            </div>

            {ticketPriority === 'urgente' && (
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-700 ml-1">Explicação da Urgência</label>
                <textarea
                  name="urgent_explanation"
                  required
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all"
                  placeholder="Por que esta solicitação é urgente?"
                />
              </div>
            )}

            {(selectedCategory === 'TI' || selectedCategory === 'Manutenção') && (
              <>
                <Input label="Equipamento/Item" name="equipment" required />
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-slate-700 ml-1">Descrição do Problema</label>
                  <textarea name="description" required rows={4} className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all" />
                </div>
              </>
            )}

            {['Limpeza', 'Supervisão'].includes(selectedCategory!) && (
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-700 ml-1">Motivo da Solicitação</label>
                <textarea name="reason" required rows={4} className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all" />
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700 ml-1">Evidências (Opcional)</label>
              <input
                type="file"
                multiple
                onChange={(e) => {
                  if (e.target.files) setEvidenceFiles(Array.from(e.target.files));
                }}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all"
                accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
              />
              <p className="text-xs text-slate-500 ml-1">Você pode selecionar múltiplos arquivos (imagens, PDFs, documentos).</p>
              {evidenceFiles.length > 0 && (
                <div className="mt-2 text-sm text-slate-700">
                  {evidenceFiles.length} arquivo(s) selecionado(s).
                </div>
              )}
            </div>

            <Button type="submit" disabled={loading} className="w-full h-14 text-lg">
              {loading ? 'Enviando...' : 'Enviar Solicitação'}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
};
