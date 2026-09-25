import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  Upload,
  X,
  AlertTriangle,
  RefreshCw,
  Info,
  Calendar,
  Check,
  Search,
  FileText
} from 'lucide-react';
import { Button } from '../ui';
import { cn } from '../../lib/utils';
import { UserProfile, SenaiItem, SenaiItemsMeta } from '../../types';

export interface BuyerCsvModalProps {
  user: UserProfile | null;
  token: string | null;
  onClose: () => void;
  showMessage: (type: 'success' | 'error', text: string) => void;
  onItemsUpdated?: () => void;
}

export const BuyerCsvModal: React.FC<BuyerCsvModalProps> = ({
  user,
  token,
  onClose,
  showMessage,
  onItemsUpdated
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [senaiItems, setSenaiItems] = useState<SenaiItem[]>([]);
  const [meta, setMeta] = useState<SenaiItemsMeta>({});
  const [loadingItems, setLoadingItems] = useState(true);
  const [searchFilter, setSearchFilter] = useState('');

  // Mode and Conflict states
  const [uploadMode, setUploadMode] = useState<'replace' | 'merge'>('replace');
  const [conflictsData, setConflictsData] = useState<{
    conflicts: any[];
    newItemsCount: number;
    totalCsvItems: number;
  } | null>(null);

  const fetchCurrentItems = async () => {
    setLoadingItems(true);
    try {
      const res = await fetch('/api/purchases/items');
      const data = await res.json();
      if (data && Array.isArray(data.items)) {
        setSenaiItems(data.items);
        setMeta(data.meta || {});
      } else if (Array.isArray(data)) {
        setSenaiItems(data);
      }
    } catch {
      // ignore
    } finally {
      setLoadingItems(false);
    }
  };

  useEffect(() => {
    fetchCurrentItems();
  }, []);

  const executeUpload = async (mode: 'replace' | 'merge', resolveConflicts: 'check' | 'overwrite' | 'ignore' = 'check') => {
    if (!file) {
      showMessage('error', 'Selecione um arquivo CSV para fazer o upload');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('mode', mode);
      formData.append('resolveConflicts', resolveConflicts);

      const res = await fetch('/api/purchases/upload-items', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const data = await res.json();

      if (res.ok && data.hasConflicts) {
        setConflictsData({
          conflicts: data.conflicts || [],
          newItemsCount: data.newItemsCount || 0,
          totalCsvItems: data.totalCsvItems || 0
        });
        setUploading(false);
        return;
      }

      if (res.ok && data.success) {
        showMessage('success', data.message || `${data.count} itens do SENAI importados com sucesso!`);
        fetchCurrentItems();
        if (onItemsUpdated) onItemsUpdated();
        setFile(null);
        setConflictsData(null);
      } else {
        showMessage('error', data.error || 'Erro ao processar arquivo CSV');
      }
    } catch {
      showMessage('error', 'Erro ao conectar ao servidor para enviar o CSV');
    } finally {
      setUploading(false);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    executeUpload(uploadMode, 'check');
  };

  const filteredItems = senaiItems.filter(item => {
    if (!searchFilter.trim()) return true;
    const term = searchFilter.toLowerCase();
    return (
      (item.full_name && item.full_name.toLowerCase().includes(term)) ||
      (item.codigo && item.codigo.toLowerCase().includes(term)) ||
      (item.descricao && item.descricao.toLowerCase().includes(term)) ||
      (item.fornecedor && item.fornecedor.toLowerCase().includes(term))
    );
  });

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-3xl max-w-2xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden border border-slate-100"
      >
        {/* Header */}
        <div className="p-6 bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20">
              <Upload className="w-5 h-5 text-blue-300" />
            </div>
            <div>
              <h3 className="text-lg font-bold">Gestão de Itens Disponíveis (SENAI)</h3>
              <p className="text-xs text-blue-200">
                Upload de CSV com catálogo de itens vigentes para solicitações
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Conflict Warning Screen */}
          {conflictsData ? (
            <div className="space-y-5">
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3">
                <AlertTriangle className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-xs text-amber-950 space-y-1">
                  <p className="font-bold text-sm">
                    {conflictsData.conflicts.length} Conflito(s) Encontrado(s) na Base
                  </p>
                  <p>
                    O sistema identificou itens no CSV enviado que já possuem cadastro ativo ou código idêntico no banco de dados.
                  </p>
                  <p className="text-slate-600 font-medium pt-1">
                    Itens novos inéditos: <span className="font-bold text-slate-800">{conflictsData.newItemsCount}</span> | Conflitos: <span className="font-bold text-amber-800">{conflictsData.conflicts.length}</span>
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Lista de Conflitos para Decisão
                </h4>
                <div className="max-h-56 overflow-y-auto border border-slate-200 rounded-2xl divide-y divide-slate-100 bg-slate-50/50 p-2">
                  {conflictsData.conflicts.map((conf, idx) => (
                    <div key={idx} className="p-3 text-xs space-y-1 bg-white rounded-xl mb-2 border border-slate-100 shadow-sm">
                      <div className="flex items-center justify-between font-bold text-slate-800">
                        <span>Código / Item: {conf.codigo || 'Sem código'}</span>
                        <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-[10px] rounded-md uppercase">
                          Conflito
                        </span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-[11px]">
                        <div className="p-2 bg-red-50/60 rounded-lg border border-red-100">
                          <p className="font-bold text-red-900">Atual no Sistema:</p>
                          <p className="text-slate-700 truncate">{conf.existing?.full_name}</p>
                          <p className="text-slate-500">{conf.existing?.fornecedor ? `Fornecedor: ${conf.existing.fornecedor}` : ''}</p>
                        </div>
                        <div className="p-2 bg-blue-50/60 rounded-lg border border-blue-100">
                          <p className="font-bold text-blue-900">Novo no CSV:</p>
                          <p className="text-slate-700 truncate">{conf.incoming?.full_name}</p>
                          <p className="text-slate-500">{conf.incoming?.fornecedor ? `Fornecedor: ${conf.incoming.fornecedor}` : ''}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row gap-3">
                <Button
                  onClick={() => executeUpload('merge', 'overwrite')}
                  disabled={uploading}
                  className="bg-amber-600 hover:bg-amber-700 text-white font-bold py-3 text-xs rounded-xl flex-1"
                >
                  <RefreshCw className={cn("w-4 h-4 mr-1.5", uploading && "animate-spin")} />
                  Substituir Conflitos e Salvar
                </Button>
                <Button
                  onClick={() => executeUpload('merge', 'ignore')}
                  disabled={uploading}
                  className="bg-slate-800 hover:bg-slate-900 text-white font-bold py-3 text-xs rounded-xl flex-1"
                >
                  Ignorar Conflitos e Manter Atuais
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setConflictsData(null)}
                  disabled={uploading}
                  className="text-xs font-bold py-3 px-4 rounded-xl"
                >
                  Voltar
                </Button>
              </div>
            </div>
          ) : (
            <>
              {/* Info Notice */}
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-2xl flex items-start gap-3">
                <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                <div className="text-xs text-blue-900 space-y-1">
                  <p className="font-bold">Filtro de Entidade: Exclusivo SENAI</p>
                  <p>
                    O sistema processa o arquivo CSV e armazena <strong>apenas os itens do SENAI</strong> (coluna ENTIDADE indicando SENAI). Demais linhas são ignoradas.
                  </p>
                </div>
              </div>

              {/* Current Status Card */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-green-100 text-green-700 flex items-center justify-center font-bold text-lg">
                    {meta.totalSenaiItems || senaiItems.length}
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-500">Itens do SENAI Cadastrados</p>
                    <p className="text-sm font-bold text-slate-800">
                      {senaiItems.length} itens ativos
                    </p>
                  </div>
                </div>

                <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-500">Última Atualização</p>
                    <p className="text-xs font-bold text-slate-800">
                      {meta.last_updated
                        ? new Date(meta.last_updated).toLocaleString('pt-BR')
                        : 'Base padrão carregada'}
                    </p>
                    {meta.updatedBy && (
                      <p className="text-[11px] text-slate-500">Por: {meta.updatedBy}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Upload Mode Selector */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                  Modo de Importação
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setUploadMode('replace')}
                    className={cn(
                      "p-3.5 rounded-2xl border text-left transition-all flex flex-col justify-between",
                      uploadMode === 'replace'
                        ? "border-red-500 bg-red-50/50 ring-2 ring-red-500/20"
                        : "border-slate-200 bg-white hover:border-slate-300"
                    )}
                  >
                    <div className="flex items-center justify-between font-bold text-xs text-slate-900 mb-1">
                      <span>🔴 Substituir Base Atual</span>
                      {uploadMode === 'replace' && <Check className="w-4 h-4 text-red-600" />}
                    </div>
                    <p className="text-[11px] text-slate-500 leading-snug">
                      Zera o cadastro existente e importa todos os itens do CSV do zero.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setUploadMode('merge')}
                    className={cn(
                      "p-3.5 rounded-2xl border text-left transition-all flex flex-col justify-between",
                      uploadMode === 'merge'
                        ? "border-green-600 bg-green-50/50 ring-2 ring-green-600/20"
                        : "border-slate-200 bg-white hover:border-slate-300"
                    )}
                  >
                    <div className="flex items-center justify-between font-bold text-xs text-slate-900 mb-1">
                      <span>🟢 Adicionar e Mesclar</span>
                      {uploadMode === 'merge' && <Check className="w-4 h-4 text-green-600" />}
                    </div>
                    <p className="text-[11px] text-slate-500 leading-snug">
                      Mantém os itens atuais e adiciona os novos itens do CSV.
                    </p>
                  </button>
                </div>
              </div>

              {/* Form Upload */}
              <form onSubmit={handleFormSubmit} className="space-y-3 pt-2">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                  Enviar Arquivo CSV (.csv)
                </label>
                <div className="flex flex-col sm:flex-row gap-3">
                  <input
                    type="file"
                    accept=".csv"
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                    className="block w-full text-xs text-slate-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 border border-slate-200 rounded-xl cursor-pointer"
                  />
                  <Button
                    type="submit"
                    disabled={!file || uploading}
                    className={cn(
                      "font-bold py-2.5 px-5 text-xs rounded-xl shrink-0 text-white",
                      uploadMode === 'replace' ? "bg-red-600 hover:bg-red-700" : "bg-green-600 hover:bg-green-700"
                    )}
                  >
                    <Upload className={cn("w-4 h-4 mr-1.5", uploading && "animate-spin")} />
                    {uploading ? 'Processando...' : uploadMode === 'replace' ? 'Zerar e Subir Nova Base' : 'Adicionar Novos Itens'}
                  </Button>
                </div>
                {file && (
                  <p className="text-xs text-slate-500">
                    Arquivo selecionado: <span className="font-semibold text-slate-800">{file.name}</span> ({(file.size / 1024).toFixed(1)} KB)
                  </p>
                )}
              </form>

              {/* Current Registered Items Preview */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-blue-600" /> Itens Disponíveis SENAI ({filteredItems.length})
                  </h4>
                </div>

                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Buscar por código, descrição ou fornecedor..."
                    value={searchFilter}
                    onChange={(e) => setSearchFilter(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="max-h-56 overflow-y-auto border border-slate-200 rounded-2xl divide-y divide-slate-100 bg-slate-50/50">
                  {loadingItems ? (
                    <div className="p-8 text-center text-xs text-slate-400">
                      Carregando catálogo de itens...
                    </div>
                  ) : filteredItems.length === 0 ? (
                    <div className="p-8 text-center text-xs text-slate-400">
                      Nenhum item do SENAI encontrado.
                    </div>
                  ) : (
                    filteredItems.map((item, idx) => (
                      <div key={idx} className="p-3 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-slate-100/80 transition-colors">
                        <div>
                          <p className="font-bold text-slate-800">{item.full_name}</p>
                          <p className="text-[11px] text-slate-500">
                            {item.fornecedor ? `Fornecedor: ${item.fornecedor}` : ''} {item.contrato ? `| Contrato: ${item.contrato}` : ''}
                          </p>
                        </div>
                        <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-[10px] font-bold rounded-md uppercase shrink-0 border border-blue-100 self-start sm:self-auto">
                          {item.entidade || 'SENAI'}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
          <Button variant="secondary" onClick={onClose} className="text-xs font-bold px-5">
            Fechar
          </Button>
        </div>
      </motion.div>
    </div>
  );
};
