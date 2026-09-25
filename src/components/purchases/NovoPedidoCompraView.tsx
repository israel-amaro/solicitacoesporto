import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ShoppingCart,
  PlusCircle,
  ArrowLeft,
  FileText,
  Camera,
  Trash2,
  Plus,
  GraduationCap,
  Users2,
  X
} from 'lucide-react';
import { Button, Card, Badge, Input } from '../ui';
import { PurchaseItem, SenaiItem, hasModuleAccess } from '../../types';
import { PurchasesProps } from './PurchasesTypes';

export const NovoPedidoCompraView: React.FC<PurchasesProps> = ({
  user,
  token,
  onNavigate,
  showMessage
}) => {
  const [curso, setCurso] = useState('');
  const [turma, setTurma] = useState('');
  const [items, setItems] = useState<PurchaseItem[]>([
    { item_name: '', quantity: 1, reason: '' }
  ]);

  // Expandable New Item Request (Múltiplos itens fora do catálogo)
  interface CustomNewItemRow {
    description: string;
    quantity: number;
    reason: string;
    photoUrl: string;
    uploadingPhoto?: boolean;
  }

  const [showNewItemSection, setShowNewItemSection] = useState(false);
  const [customNewItems, setCustomNewItems] = useState<CustomNewItemRow[]>([
    { description: '', quantity: 1, reason: '', photoUrl: '' }
  ]);

  // Available pre-registered items and reasons (from SENAI CSV / DB)
  const [availableSenaiItems, setAvailableSenaiItems] = useState<SenaiItem[]>([]);
  const [availableItems, setAvailableItems] = useState<string[]>([]);
  const [availableReasons, setAvailableReasons] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    // Fetch pre-registered SENAI items and reasons
    fetch('/api/purchases/items')
      .then(res => res.json())
      .then(data => {
        if (data && Array.isArray(data.items)) {
          setAvailableSenaiItems(data.items);
          setAvailableItems(data.items.map((i: SenaiItem) => i.full_name || i.descricao));
        } else if (Array.isArray(data)) {
          if (data.length > 0 && typeof data[0] === 'object') {
            setAvailableSenaiItems(data);
            setAvailableItems(data.map((i: any) => i.full_name || i.descricao));
          } else {
            setAvailableItems(data);
          }
        }
      })
      .catch(() => {});

    fetch('/api/purchases/reasons')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          setAvailableReasons(data);
        }
      })
      .catch(() => {});
  }, []);

  const handleAddItemRow = () => {
    setItems([...items, { item_name: '', quantity: 1, reason: '' }]);
  };

  const handleRemoveItemRow = (index: number) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: keyof PurchaseItem, value: any) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };
    setItems(updated);
  };

  // Funções para gerenciamento de Múltiplos Itens Fora do Catálogo
  const handleAddCustomNewItemRow = () => {
    setCustomNewItems([
      ...customNewItems,
      { description: '', quantity: 1, reason: '', photoUrl: '' }
    ]);
  };

  const handleRemoveCustomNewItemRow = (index: number) => {
    if (customNewItems.length <= 1) {
      setCustomNewItems([{ description: '', quantity: 1, reason: '', photoUrl: '' }]);
      setShowNewItemSection(false);
      return;
    }
    setCustomNewItems(customNewItems.filter((_, i) => i !== index));
  };

  const handleCustomNewItemChange = (index: number, field: keyof CustomNewItemRow, value: any) => {
    const updated = [...customNewItems];
    updated[index] = { ...updated[index], [field]: value };
    setCustomNewItems(updated);
  };

  const handleCustomItemPhotoUpload = async (index: number, file: File) => {
    if (!file) return;

    const updated = [...customNewItems];
    updated[index] = { ...updated[index], uploadingPhoto: true };
    setCustomNewItems(updated);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const data = await res.json();
      if (res.ok && data.url) {
        const done = [...customNewItems];
        done[index] = { ...done[index], photoUrl: data.url, uploadingPhoto: false };
        setCustomNewItems(done);
        showMessage('success', 'Anexo/Foto adicionado com sucesso!');
      } else {
        showMessage('error', data.error || 'Erro ao enviar foto');
        const err = [...customNewItems];
        err[index] = { ...err[index], uploadingPhoto: false };
        setCustomNewItems(err);
      }
    } catch {
      showMessage('error', 'Erro ao fazer upload da foto');
      const err = [...customNewItems];
      err[index] = { ...err[index], uploadingPhoto: false };
      setCustomNewItems(err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!curso.trim()) {
      showMessage('error', 'Por favor, informe o nome do curso');
      return;
    }
    if (!turma.trim()) {
      showMessage('error', 'Por favor, informe o código/nome da turma');
      return;
    }

    // Filter valid items from main list
    const validItems = items.filter(it => it.item_name.trim().length > 0);
    
    // If user filled in new item section, include all valid custom items
    if (showNewItemSection) {
      for (const cItem of customNewItems) {
        if (cItem.description.trim()) {
          validItems.push({
            item_name: `[Item Fora do Catálogo] ${cItem.description.trim()}`,
            quantity: cItem.quantity || 1,
            reason: cItem.reason.trim() || 'Material fora do catálogo solicitado',
            is_new_item: true,
            new_item_description: cItem.description.trim(),
            new_item_photo_url: cItem.photoUrl || undefined
          });
        }
      }
    }

    if (validItems.length === 0) {
      showMessage('error', 'Por favor, adicione pelo menos um item ao pedido');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/purchases', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          curso: curso.trim(),
          turma: turma.trim(),
          items: validItems
        })
      });

      const data = await res.json();
      if (res.ok) {
        showMessage('success', `Pedido #${data.numeric_id || data.id} registrado com sucesso!`);
        onNavigate('/compras/acompanhamento');
      } else {
        showMessage('error', data.error || 'Erro ao enviar pedido');
      }
    } catch {
      showMessage('error', 'Erro de comunicação com o servidor');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4 md:px-8">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => onNavigate(hasModuleAccess(user, 'compras') ? '/compras' : (user ? '/dashboard' : '/'))}
            className="text-slate-600 hover:text-slate-900 rounded-xl"
          >
            <ArrowLeft className="w-4 h-4 mr-1.5" /> Voltar
          </Button>
          <Badge className="bg-green-100 text-green-800 border-green-200">
            Novo Pedido de Compra
          </Badge>
        </div>

        <Card className="p-6 md:p-8 space-y-8 bg-white border border-slate-200/80 shadow-sm">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-green-600 text-white flex items-center justify-center">
                <ShoppingCart className="w-5 h-5" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900">Realizar Pedido de Compra</h2>
            </div>
            <p className="text-slate-500 text-sm">
              Preencha os dados da turma e adicione todos os itens necessários para a solicitação.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Informações Gerais */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
                  <GraduationCap className="w-4 h-4 text-green-600" /> Curso
                </label>
                <Input
                  placeholder="Ex: Eletrotécnica, Mecânica, Informática..."
                  value={curso}
                  onChange={(e: any) => setCurso(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
                  <Users2 className="w-4 h-4 text-green-600" /> Turma
                </label>
                <Input
                  placeholder="Ex: ELE-2026-1, MEC-NOITE-02..."
                  value={turma}
                  onChange={(e: any) => setTurma(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Lista Dinâmica de Itens */}
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <label className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-green-600" /> Itens Solicitados
                </label>
                <span className="text-xs text-slate-400 font-medium">
                  {items.length} {items.length === 1 ? 'item' : 'itens'} adicionado(s)
                </span>
              </div>

              <div className="space-y-3">
                {items.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200/80 space-y-3 relative group"
                  >
                    <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-wider">
                      <span>Item #{idx + 1}</span>
                      {items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveItemRow(idx)}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1 rounded-lg transition-colors flex items-center gap-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Remover
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                      <div className="sm:col-span-6 space-y-1">
                        <label className="text-xs font-semibold text-slate-600">Descrição do Item</label>
                        {availableItems.length > 0 ? (
                          <>
                            <input
                              list={`items-list-${idx}`}
                              value={item.item_name}
                              onChange={(e) => handleItemChange(idx, 'item_name', e.target.value)}
                              placeholder="Selecione ou digite o nome do item..."
                              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:ring-2 focus:ring-green-500"
                              required
                            />
                            <datalist id={`items-list-${idx}`}>
                              {availableItems.map((opt, i) => (
                                <option key={i} value={opt} />
                              ))}
                            </datalist>
                          </>
                        ) : (
                          <input
                            type="text"
                            value={item.item_name}
                            onChange={(e) => handleItemChange(idx, 'item_name', e.target.value)}
                            placeholder="Ex: Alicate de corte, Multímetro..."
                            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:ring-2 focus:ring-green-500"
                            required
                          />
                        )}
                      </div>

                      <div className="sm:col-span-2 space-y-1">
                        <label className="text-xs font-semibold text-slate-600">Qtd.</label>
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => handleItemChange(idx, 'quantity', parseInt(e.target.value) || 1)}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:ring-2 focus:ring-green-500 text-center font-bold"
                          required
                        />
                      </div>

                      <div className="sm:col-span-4 space-y-1">
                        <label className="text-xs font-semibold text-slate-600">Motivo</label>
                        {availableReasons.length > 0 ? (
                          <>
                            <input
                              list={`reasons-list-${idx}`}
                              value={item.reason}
                              onChange={(e) => handleItemChange(idx, 'reason', e.target.value)}
                              placeholder="Motivo do pedido..."
                              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:ring-2 focus:ring-green-500"
                            />
                            <datalist id={`reasons-list-${idx}`}>
                              {availableReasons.map((r, i) => (
                                <option key={i} value={r} />
                              ))}
                            </datalist>
                          </>
                        ) : (
                          <input
                            type="text"
                            value={item.reason}
                            onChange={(e) => handleItemChange(idx, 'reason', e.target.value)}
                            placeholder="Ex: Aula prática módulo 2..."
                            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:ring-2 focus:ring-green-500"
                          />
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <Button
                type="button"
                variant="secondary"
                onClick={handleAddItemRow}
                className="w-full py-3 border-dashed border-2 border-slate-200 text-slate-600 hover:text-green-700 hover:border-green-300 hover:bg-green-50/50 rounded-2xl flex items-center justify-center gap-2 font-bold transition-all"
              >
                <Plus className="w-4 h-4" /> Adicionar Outro Item
              </Button>
            </div>

            {/* Seção Item Não Encontrado (Solicitar Inclusão de Novo Item) */}
            <div className="pt-2">
              <div
                onClick={() => {
                  const nextState = !showNewItemSection;
                  setShowNewItemSection(nextState);
                  if (nextState && customNewItems.length === 0) {
                    setCustomNewItems([{ description: '', quantity: 1, reason: '', photoUrl: '' }]);
                  }
                }}
                className="flex items-center gap-3.5 p-4 bg-slate-50 border border-slate-200/90 rounded-2xl cursor-pointer hover:bg-slate-100/70 transition-all shadow-sm group"
              >
                <input
                  type="checkbox"
                  checked={showNewItemSection}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setShowNewItemSection(checked);
                    if (checked && customNewItems.length === 0) {
                      setCustomNewItems([{ description: '', quantity: 1, reason: '', photoUrl: '' }]);
                    }
                  }}
                  className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer shrink-0"
                />
                <div className="space-y-0.5">
                  <p className="font-bold text-slate-900 text-sm flex items-center gap-2">
                    <PlusCircle className="w-4 h-4 text-blue-600 group-hover:scale-110 transition-transform" />
                    Material ou Insumo Fora do Catálogo? Solicitar Inclusão de Novos Itens
                  </p>
                  <p className="text-xs text-slate-500 leading-snug">
                    Marque esta opção para informar especificações técnicas, foto ou ficha de itens que não constam na lista do SENAI.
                  </p>
                </div>
              </div>

              <AnimatePresence>
                {showNewItemSection && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="mt-3 p-5 bg-white border border-slate-200 rounded-2xl space-y-5 shadow-sm">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                        <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                          <FileText className="w-4 h-4 text-blue-600" /> Solicitação de Itens Fora do Catálogo ({customNewItems.length})
                        </h4>
                        <span className="text-[11px] text-slate-400 font-medium">
                          Preencha com o máximo de detalhes
                        </span>
                      </div>

                      <div className="space-y-4">
                        {customNewItems.map((cItem, idx) => (
                          <div key={idx} className="p-4 bg-slate-50/90 border border-slate-200/80 rounded-2xl space-y-3 relative">
                            <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider">
                              <span>Novo Item #{idx + 1}</span>
                              {customNewItems.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => handleRemoveCustomNewItemRow(idx)}
                                  className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1 rounded-lg transition-colors flex items-center gap-1"
                                >
                                  <Trash2 className="w-3.5 h-3.5" /> Remover Item
                                </button>
                              )}
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                              <div className="sm:col-span-6 space-y-1">
                                <label className="text-xs font-semibold text-slate-700">
                                  Descrição Detalhada / Especificação Técnica *
                                </label>
                                <textarea
                                  rows={2}
                                  value={cItem.description}
                                  onChange={(e) => handleCustomNewItemChange(idx, 'description', e.target.value)}
                                  placeholder="Ex: Chave fim de curso mini gangora com 2 terminais, marca Siemens ou similar..."
                                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                                  required
                                />
                              </div>

                              <div className="sm:col-span-2 space-y-1">
                                <label className="text-xs font-semibold text-slate-700">Qtd. *</label>
                                <input
                                  type="number"
                                  min="1"
                                  value={cItem.quantity}
                                  onChange={(e) => handleCustomNewItemChange(idx, 'quantity', parseInt(e.target.value) || 1)}
                                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:ring-2 focus:ring-blue-500 text-center font-bold"
                                  required
                                />
                              </div>

                              <div className="sm:col-span-4 space-y-1">
                                <label className="text-xs font-semibold text-slate-700">Motivo da Necessidade</label>
                                {availableReasons.length > 0 ? (
                                  <>
                                    <input
                                      list={`c-reasons-list-${idx}`}
                                      value={cItem.reason}
                                      onChange={(e) => handleCustomNewItemChange(idx, 'reason', e.target.value)}
                                      placeholder="Motivo da solicitação..."
                                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                    <datalist id={`c-reasons-list-${idx}`}>
                                      {availableReasons.map((r, i) => (
                                        <option key={i} value={r} />
                                      ))}
                                    </datalist>
                                  </>
                                ) : (
                                  <input
                                    type="text"
                                    value={cItem.reason}
                                    onChange={(e) => handleCustomNewItemChange(idx, 'reason', e.target.value)}
                                    placeholder="Ex: Aula prática laboratório..."
                                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:ring-2 focus:ring-blue-500"
                                  />
                                )}
                              </div>
                            </div>

                            {/* Photo / Attachment Upload for Custom Item */}
                            <div className="space-y-1.5 pt-1">
                              <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                                <Camera className="w-3.5 h-3.5 text-blue-600" /> Foto / Ficha Técnica (Opcional)
                              </label>

                              {cItem.photoUrl ? (
                                <div className="relative inline-block border border-slate-200 rounded-2xl overflow-hidden group">
                                  <img
                                    src={cItem.photoUrl}
                                    alt={`Foto do novo item #${idx + 1}`}
                                    className="w-40 h-28 object-cover rounded-2xl"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => handleCustomNewItemChange(idx, 'photoUrl', '')}
                                    className="absolute top-2 right-2 p-1.5 bg-black/60 hover:bg-red-600 text-white rounded-xl transition-colors"
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                </div>
                              ) : (
                                <label className="flex items-center justify-center gap-2 p-3 border border-dashed border-slate-300 hover:border-blue-500 hover:bg-blue-50/40 rounded-xl cursor-pointer transition-all text-xs font-semibold text-slate-600">
                                  <Camera className="w-4 h-4 text-slate-400" />
                                  <span>
                                    {cItem.uploadingPhoto ? 'Enviando anexo...' : 'Anexar Foto / Ficha Técnica'}
                                  </span>
                                  <input
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => {
                                      const file = e.target.files?.[0];
                                      if (file) handleCustomItemPhotoUpload(idx, file);
                                    }}
                                    className="hidden"
                                    disabled={cItem.uploadingPhoto}
                                  />
                                </label>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>

                      <Button
                        type="button"
                        variant="secondary"
                        onClick={handleAddCustomNewItemRow}
                        className="w-full py-2.5 border-dashed border border-slate-300 text-slate-700 hover:text-blue-700 hover:border-blue-400 hover:bg-blue-50/50 rounded-xl flex items-center justify-center gap-2 text-xs font-bold transition-all"
                      >
                        <Plus className="w-4 h-4 text-blue-600" /> Solicitar Outro Item Fora do Catálogo
                      </Button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Actions */}
            <div className="flex gap-4 pt-4 border-t border-slate-100">
              <Button
                type="button"
                variant="secondary"
                onClick={() => onNavigate('/compras')}
                className="flex-1 py-3.5"
                disabled={submitting}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="flex-1 py-3.5 bg-green-600 hover:bg-green-700 text-white font-bold shadow-lg shadow-green-200"
                disabled={submitting}
              >
                {submitting ? 'Enviando Pedido...' : 'Enviar Pedido de Compra'}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
};
