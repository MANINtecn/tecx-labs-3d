import React, { useState, useEffect } from 'react';
import {
  Terminal,
  X,
  Copy,
  Check,
  Server,
  Cloud,
  ExternalLink,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

interface PythonHubModalProps {
  isOpen: boolean;
  onClose: () => void;
  backendUrl: string;
  onUpdateBackendUrl: (url: string) => void;
  isBackendConnected: boolean;
  onTestConnection: () => Promise<boolean>;
  gpuInfo?: string;
}

export const PythonHubModal: React.FC<PythonHubModalProps> = ({
  isOpen,
  onClose,
  backendUrl,
  onUpdateBackendUrl,
  isBackendConnected,
  onTestConnection,
}) => {
  const [copied, setCopied] = useState<boolean>(false);
  const [testing, setTesting] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [colabScript, setColabScript] = useState<string>('Carregando script do servidor...');
  const [localInputUrl, setLocalInputUrl] = useState<string>(backendUrl);

  useEffect(() => {
    setLocalInputUrl(backendUrl);
  }, [backendUrl]);

  useEffect(() => {
    if (!isOpen) return;

    const loadScript = async () => {
      try {
        const res = await fetch('/api/files/content/run_colab.py');
        if (res.ok) {
          const data = await res.json();
          const match = data.content.match(/COLAB_COMPLETE_SCRIPT\s*=\s*'''([\s\S]*?)'''/);
          if (match && match[1]) {
            setColabScript(match[1].trim());
          } else {
            setColabScript(data.content);
          }
        }
      } catch (e) {
        console.warn('Erro ao carregar script do servidor:', e);
      }
    };

    loadScript();
  }, [isOpen]);

  if (!isOpen) return null;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(colabScript);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleTest = async () => {
    if (!localInputUrl.trim()) {
      setTestResult('Por favor, informe a URL do túnel do servidor.');
      return;
    }
    setTesting(true);
    setTestResult(null);
    try {
      onUpdateBackendUrl(localInputUrl.trim());
      const ok = await onTestConnection();
      if (ok) {
        setTestResult('Servidor Neural Conectado com sucesso! Motor 3D pronto para renderizar.');
      } else {
        setTestResult('Não foi possível conectar. Verifique se o script está rodando e a URL está ativa.');
      }
    } catch {
      setTestResult('Erro ao conectar ao servidor.');
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md select-none animate-in fade-in duration-200">
      <div className="bg-[#0b0f19] border border-slate-800 rounded-2xl w-full max-w-3xl max-h-[90vh] shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800/80 bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-950/60 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
              <Server className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white tracking-wide">
                SERVIDOR NEURAL TECX CORE
              </h2>
              <p className="text-[11px] text-slate-400">
                Gerenciador de conexão com o cluster de processamento 3D
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Conteúdo */}
        <div className="p-6 space-y-6 overflow-y-auto">
          {/* Campo de Conexão com a URL */}
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-white flex items-center gap-1.5">
                <Cloud className="w-4 h-4 text-cyan-400" />
                <span>URL de Conexão do Servidor Seguro</span>
              </label>
              <span
                className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                  isBackendConnected
                    ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-300'
                    : 'bg-amber-950/60 border-amber-500/50 text-amber-300'
                }`}
              >
                {isBackendConnected ? 'Servidor Conectado' : 'Servidor Desconectado'}
              </span>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={localInputUrl}
                onChange={(e) => setLocalInputUrl(e.target.value)}
                placeholder="https://sua-url-aqui.trycloudflare.com"
                className="flex-1 bg-black/60 border border-slate-700 rounded-xl px-3.5 py-2 text-xs font-mono text-cyan-300 placeholder:text-slate-600 focus:outline-none focus:border-cyan-400"
              />
              <button
                onClick={handleTest}
                disabled={testing}
                className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 shrink-0 shadow-md shadow-cyan-500/20 cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${testing ? 'animate-spin' : ''}`} />
                <span>{testing ? 'Testando...' : 'Conectar'}</span>
              </button>
            </div>

            {testResult && (
              <p
                className={`text-xs flex items-center gap-1.5 pt-1 ${
                  isBackendConnected ? 'text-emerald-400' : 'text-amber-400'
                }`}
              >
                {isBackendConnected ? (
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                ) : (
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                )}
                <span>{testResult}</span>
              </p>
            )}
          </div>

          {/* Script do Servidor */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-300">
                Script do Cluster Neural (Execução Única)
              </h3>
              <div className="flex items-center gap-2">
                <a
                  href="https://colab.research.google.com"
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300 underline font-medium"
                >
                  <span>Abrir Console</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
                <button
                  onClick={copyToClipboard}
                  className="flex items-center gap-1.5 px-3 py-1 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-bold transition-all shadow cursor-pointer"
                >
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copiado!' : 'Copiar Script'}</span>
                </button>
              </div>
            </div>

            <div className="relative rounded-xl border border-slate-800 bg-black/80 p-3 max-h-60 overflow-y-auto font-mono text-[11px] text-slate-300 leading-relaxed">
              <pre className="whitespace-pre-wrap">{colabScript}</pre>
            </div>
            <p className="text-[11px] text-slate-400">
              💡 Execute o script acima no seu console remoto. Quando a URL do túnel for exibida, cole no campo acima e confirme a conexão.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
