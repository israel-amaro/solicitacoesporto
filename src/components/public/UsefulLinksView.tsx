import { useState } from 'react';
import { ArrowLeft, Search, ExternalLink } from 'lucide-react';
import { Button, Card } from '../ui';
import { cn } from '../../lib/utils';
import { USEFUL_LINKS } from '../../constants';

const LINK_CATEGORIES = ['Todos', 'Acadêmico', 'Corporativo', 'Capacitação', 'Materiais', 'Avaliação', 'Comunicação'];

export const UsefulLinksView = ({ setView }: { setView: (v: any) => void }) => {
  const [search, setSearch] = useState('');
  const [selectedCat, setSelectedCat] = useState<string>('Todos');

  const filtered = USEFUL_LINKS.filter(link => {
    const matchesSearch =
      link.title.toLowerCase().includes(search.toLowerCase()) ||
      (link.desc || '').toLowerCase().includes(search.toLowerCase()) ||
      link.user.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = selectedCat === 'Todos' || link.category === selectedCat;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-10 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-rose-100/30 rounded-full blur-3xl" />
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-blue-100/30 rounded-full blur-3xl" />
      </div>

      <div className="max-w-6xl mx-auto space-y-8 relative z-10">
        <Button variant="ghost" onClick={() => setView('home')} className="h-10 hover:bg-slate-200 rounded-xl px-4 text-slate-600">
          <ArrowLeft className="w-4 h-4 mr-2" /> Voltar ao Início
        </Button>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1">
            <h2 className="text-4xl font-black text-slate-900 tracking-tight">Links Úteis</h2>
            <p className="text-slate-500 text-lg font-medium">Sistemas institucionais, ferramentas operacionais e materiais de apoio.</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl px-4 py-3 flex items-center gap-2 focus-within:ring-2 focus-within:ring-rose-100 transition-all shadow-sm">
            <Search className="w-5 h-5 text-slate-400" />
            <input
              placeholder="Buscar portal ou função..."
              className="outline-none text-sm bg-transparent w-full sm:w-64"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
          {LINK_CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCat(cat)}
              className={cn(
                "px-5 py-2.5 rounded-2xl text-xs font-bold transition-all whitespace-nowrap border",
                selectedCat === cat
                  ? "bg-rose-600 text-white shadow-lg shadow-rose-200 border-rose-600"
                  : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
              )}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((link, idx) => (
            <Card key={idx} className="p-6 flex flex-col justify-between hover:shadow-2xl hover:border-rose-400 hover:-translate-y-1 transition-all border border-slate-200 bg-white group rounded-3xl h-full">
              <div className="space-y-4">
                <div className="flex justify-between items-start gap-4">
                  <span className={cn(
                    "text-[9px] uppercase font-black tracking-wider px-3 py-1 rounded-full border border-solid",
                    link.category === 'Acadêmico' ? 'bg-blue-50 text-blue-700 border-blue-100' :
                    link.category === 'Corporativo' ? 'bg-purple-50 text-purple-700 border-purple-100' :
                    link.category === 'Capacitação' ? 'bg-orange-50 text-orange-700 border-orange-100' :
                    link.category === 'Materiais' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                    link.category === 'Avaliação' ? 'bg-amber-50 text-amber-700 border-amber-100' :
                    'bg-slate-100 text-slate-700 border-slate-200'
                  )}>
                    {link.category}
                  </span>
                  <span className="text-[9px] text-slate-500 font-bold bg-slate-50 px-2.5 py-1 rounded-xl border border-slate-100 shrink-0">
                    Login: {link.user}
                  </span>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-800 group-hover:text-rose-600 transition-colors leading-snug">{link.title}</h3>
                  <p className="text-sm text-slate-500 mt-2 leading-relaxed font-medium">{link.desc}</p>
                </div>
              </div>

              <div className="pt-6 mt-4 border-t border-slate-100 flex items-center justify-between gap-4">
                <span className="text-xs text-slate-400 font-semibold">Credencial: <strong className="text-slate-600">{link.user.split(',')[0]}</strong></span>
                {link.url ? (
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-slate-900 hover:bg-rose-600 text-white rounded-2xl text-xs font-bold transition-all shadow-md group-hover:shadow-rose-100"
                  >
                    Acessar <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                ) : (
                  <span className="text-xs font-bold text-slate-400 bg-slate-100 px-3 py-2 rounded-xl border border-slate-200">
                    Rede Interna
                  </span>
                )}
              </div>
            </Card>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-16 bg-white border border-dashed border-slate-300 rounded-3xl">
            <Search className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-slate-700">Nenhum link encontrado</h3>
            <p className="text-slate-400 text-sm mt-1 font-medium">Tente buscar por termos diferentes ou selecione outra categoria.</p>
          </div>
        )}
      </div>
    </div>
  );
};
