import { useEffect } from 'react';
import { ArrowLeft, Briefcase, ExternalLink } from 'lucide-react';
import { Button, Card } from '../ui';
import { PAINEL_AULAS_URL } from '../../constants';

export const PainelAulasView = ({ onBack }: { onBack: () => void }) => {
  const url = PAINEL_AULAS_URL;
  useEffect(() => {
    if (url) {
      window.location.href = url;
    }
  }, [url]);

  return (
    <div className="min-h-screen bg-slate-50 p-6 flex flex-col items-center justify-center">
      <Card className="max-w-md w-full p-8 text-center space-y-6">
        <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto">
          <Briefcase className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-slate-900">Painel de Aulas</h2>
          <p className="text-slate-500 text-sm">
            {url ? "Redirecionando para o painel de aulas..." : "O link para o painel de aulas será configurado em breve."}
          </p>
        </div>
        {url ? (
          <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center w-full h-12 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all gap-2">
            Acessar Painel <ExternalLink className="w-4 h-4" />
          </a>
        ) : (
          <Button variant="secondary" onClick={onBack} className="w-full h-12">
            <ArrowLeft className="w-4 h-4" /> Voltar ao Início
          </Button>
        )}
      </Card>
    </div>
  );
};
