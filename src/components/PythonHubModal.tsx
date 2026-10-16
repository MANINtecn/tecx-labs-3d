import React, { useState, useEffect } from 'react';
import {
  Terminal,
  X,
  Copy,
  Download,
  Check,
  Server,
  Cloud,
  Cpu,
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
  gpuInfo,
}) => {
  const [activeTab, setActiveTab] = useState<'connect' | 'colab' | 'app' | 'requirements'>('connect');
  const [copied, setCopied] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  const [filesContent, setFilesContent] = useState<{
    app: string;
    requirements: string;
    colab: string;
  }>({
    app: 'Carregando app.py...',
    requirements: 'Carregando requirements.txt...',
    colab: 'Carregando instruções do Colab...',
  });

  useEffect(() => {
    if (!isOpen) return;

    // Carregar arquivos via API local do server.ts
    const loadFile = async (name: string, key: 'app' | 'requirements' | 'colab') => {
      try {
        const res = await fetch(`/api/files/content/${name}`);
        if (res.ok) {
          const data = await res.json();
          setFilesContent((prev) => ({ ...prev, [key]: data.content }));
        }
      } catch (e) {
        console.warn(`Erro ao carregar ${name}:`, e);
      }
    };

    loadFile('app.py', 'app');
    loadFile('requirements.txt', 'requirements');
    loadFile('run_colab.py', 'colab');
  }, [isOpen]);

  if (!isOpen) return null;

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const ok = await onTestConnection();
      if (ok) {
        setTestResult('Conexão realizada com sucesso! TripoSR na GPU T4 ativo e pronto.');
      } else {
        setTestResult('Não foi possível conectar ao servidor. Verifique se o túnel Cloudflare e o notebook do Colab estão ativos.');
      }
    } catch {
      setTestResult('Erro ao tentar conectar à URL informada.');
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-sm select-none">
      <div className="bg-[#0b0f19] border border-cyan-800/50 rounded-2xl w-full max-w-4xl h-[85vh] shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-[#0f172a]">
          <div className="flex items-center gap-2.5">
            <Terminal className="w-5 h-5 text-cyan-400" />
            <div>
              <h3 className="font-bold text-slate-100 text-sm tracking-wide font-['Chakra_Petch',sans-serif]">
                CENTRO DE DEPLOY & BACKEND NEURAL TRIPOSR
              </h3>
              <p className="text-[11px] text-slate-400 font-mono">
                TECX SoftHouse — Conexão com Google Colab (GPU T4) ou Servidor Local
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Barra de Abas */}
        <div className="flex items-center gap-2 px-5 py-2.5 bg-slate-950 border-b border-slate-800 overflow-x-auto">
          <button
            onClick={() => setActiveTab('connect')}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'connect'
                ? 'bg-cyan-600 text-white font-bold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Server className="w-3.5 h-3.5 text-cyan-300" />
            <span>1. Conectar Servidor (Cloudflare)</span>
          </button>

          <button
            onClick={() => setActiveTab('colab')}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'colab'
                ? 'bg-cyan-600 text-white font-bold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Cloud className="w-3.5 h-3.5 text-amber-400" />
            <span>2. Script Google Colab (GPU T4)</span>
          </button>

          <button
            onClick={() => setActiveTab('app')}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'app'
                ? 'bg-cyan-600 text-white font-bold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <span>app.py (FastAPI)</span>
          </button>

          <button
            onClick={() => setActiveTab('requirements')}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'requirements'
                ? 'bg-cyan-600 text-white font-bold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <span>requirements.txt</span>
          </button>
        </div>

        {/* Conteúdo da Aba */}
        <div className="flex-1 overflow-y-auto p-5 bg-[#090d16]">
          {activeTab === 'connect' && (
            <div className="space-y-4 text-xs text-slate-300 max-w-xl mx-auto py-3">
              {/* Card de Status Atual */}
              <div
                className={`p-4 rounded-xl border flex items-center justify-between ${
                  isBackendConnected
                    ? 'bg-emerald-950/40 border-emerald-500/60'
                    : 'bg-amber-950/30 border-amber-600/40'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      isBackendConnected ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
                    }`}
                  >
                    {isBackendConnected ? <CheckCircle2 className="w-6 h-6" /> : <AlertCircle className="w-6 h-6" />}
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-white font-['Chakra_Petch',sans-serif]">
                      {isBackendConnected ? 'Servidor TripoSR GPU Conectado' : 'Aguardando Conexão do Servidor'}
                    </h4>
                    <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                      {isBackendConnected ? gpuInfo || 'GPU Tesla T4 Online' : 'Insira o link gerado pelo Cloudflare abaixo'}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span
                    className={`px-2.5 py-1 rounded-full text-[10px] font-mono font-bold ${
                      isBackendConnected
                        ? 'bg-emerald-500/30 text-emerald-300 border border-emerald-500/60'
                        : 'bg-amber-500/30 text-amber-300 border border-amber-500/60'
                    }`}
                  >
                    {isBackendConnected ? 'ONLINE' : 'DESCONECTADO'}
                  </span>
                </div>
              </div>

              {/* Formulário de URL */}
              <div className="p-4 bg-slate-900/60 rounded-xl border border-slate-800 space-y-3">
                <div>
                  <label className="font-bold text-slate-100 text-xs block mb-1">
                    URL do Túnel Cloudflare (ou Servidor Local)
                  </label>
                  <p className="text-slate-400 text-[11px] mb-2 leading-relaxed">
                    Copie a URL terminada em <code className="text-cyan-300">.trycloudflare.com</code> gerada na saída da célula do Google Colab:
                  </p>
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={backendUrl}
                    onChange={(e) => onUpdateBackendUrl(e.target.value)}
                    placeholder="https://exemplo-random.trycloudflare.com"
                    className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2.5 text-xs font-mono text-cyan-300 focus:outline-none focus:border-cyan-500"
                  />
                  <button
                    onClick={handleTest}
                    disabled={testing || !backendUrl.trim()}
                    className="px-4 py-2.5 bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 disabled:opacity-40 text-white rounded-lg text-xs font-mono font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0"
                  >
                    {testing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Cpu className="w-3.5 h-3.5" />}
                    <span>Testar Conexão</span>
                  </button>
                </div>

                {testResult && (
                  <div
                    className={`p-3 rounded-lg text-xs font-mono border ${
                      isBackendConnected
                        ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-300'
                        : 'bg-red-950/40 border-red-500/50 text-red-300'
                    }`}
                  >
                    {testResult}
                  </div>
                )}
              </div>

              {/* Guia Rápido */}
              <div className="p-3.5 bg-cyan-950/20 border border-cyan-900/40 rounded-xl text-[11px] text-slate-300 font-mono space-y-1">
                <p className="font-bold text-cyan-300">Como funciona o pipeline real:</p>
                <p className="text-slate-400">
                  1. O TECX LABS 3D envia sua imagem 2D diretamente para a GPU T4 no Colab.
                </p>
                <p className="text-slate-400">
                  2. O TripoSR executa a remoção de fundo e a inferência neural 360° em tensores.
                </p>
                <p className="text-slate-400">
                  3. O arquivo GLB 3D completo é transmitido de volta e renderizado no Three.js.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'colab' && (
            <div className="space-y-4 text-xs text-slate-300">
              <div className="p-4 rounded-xl bg-gradient-to-r from-amber-950/30 to-slate-900 border border-amber-800/40 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 text-amber-300 font-bold font-['Chakra_Petch',sans-serif] text-sm">
                    <Cloud className="w-4 h-4" />
                    <span>GOOGLE COLAB — SERVIDOR TRIPOSR GPU T4 EM 1 CÉLULA</span>
                  </div>
                  <p className="mt-1 text-slate-300 text-xs">
                    Script pronto para Colab (Python 3.12, PyTorch 2.x, GPU T4) com túnel Cloudflare seguro.
                  </p>
                </div>
                <button
                  onClick={() => copyToClipboard(filesContent.colab, 'colab')}
                  className="px-4 py-2 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white font-mono font-bold rounded-lg text-xs transition-all cursor-pointer flex items-center gap-1.5 shadow-lg shrink-0"
                >
                  {copied === 'colab' ? <Check className="w-4 h-4 text-white" /> : <Copy className="w-4 h-4" />}
                  <span>{copied === 'colab' ? 'Código Copiado!' : 'Copiar Script Completo'}</span>
                </button>
              </div>

              <div className="space-y-3 font-mono">
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                  <p className="text-cyan-400 font-bold mb-1">Passo 1: Acessar Google Colab</p>
                  <p className="text-slate-400">
                    Abra{' '}
                    <a
                      href="https://colab.research.google.com"
                      target="_blank"
                      rel="noreferrer"
                      className="text-cyan-300 underline inline-flex items-center gap-1"
                    >
                      colab.research.google.com <ExternalLink className="w-3 h-3" />
                    </a>{' '}
                    e crie um novo notebook.
                  </p>
                </div>

                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                  <p className="text-cyan-400 font-bold mb-1">Passo 2: Ativar Aceleração por GPU</p>
                  <p className="text-slate-400">
                    Menu superior: <strong>Ambiente de Execução</strong> → <strong>Alterar tipo de ambiente de execução</strong> → Selecione <strong>T4 GPU</strong>.
                  </p>
                </div>

                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-cyan-400 font-bold">Passo 3: Colar e Rodar a Célula</p>
                  </div>
                  <pre className="p-3 rounded-lg bg-black text-[11px] text-cyan-300/90 overflow-x-auto max-h-[420px]">
                    {filesContent.colab}
                  </pre>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'app' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-slate-100 text-xs font-mono">
                    app.py — Servidor FastAPI com TripoSR na GPU
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    Para execução em máquina local com placa de vídeo NVIDIA (mínimo 6GB VRAM).
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => copyToClipboard(filesContent.app, 'app')}
                    className="flex items-center gap-1 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-mono transition-colors cursor-pointer"
                  >
                    {copied === 'app' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied === 'app' ? 'Copiado!' : 'Copiar'}</span>
                  </button>
                  <a
                    href="/api/files/download/app.py"
                    download="app.py"
                    className="flex items-center gap-1 px-3 py-1.5 bg-cyan-700 hover:bg-cyan-600 text-white rounded-lg text-xs font-mono transition-colors cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Baixar app.py</span>
                  </a>
                </div>
              </div>
              <pre className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-[11px] font-mono text-cyan-300/90 overflow-x-auto max-h-[500px]">
                {filesContent.app}
              </pre>
            </div>
          )}

          {activeTab === 'requirements' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-slate-100 text-xs font-mono">
                    requirements.txt — Dependências Python (PyTorch, Trimesh, TripoSR)
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    Execute <code className="text-cyan-400">pip install -r requirements.txt</code>
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => copyToClipboard(filesContent.requirements, 'req')}
                    className="flex items-center gap-1 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-mono transition-colors cursor-pointer"
                  >
                    {copied === 'req' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied === 'req' ? 'Copiado!' : 'Copiar'}</span>
                  </button>
                  <a
                    href="/api/files/download/requirements.txt"
                    download="requirements.txt"
                    className="flex items-center gap-1 px-3 py-1.5 bg-cyan-700 hover:bg-cyan-600 text-white rounded-lg text-xs font-mono transition-colors cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Baixar requirements.txt</span>
                  </a>
                </div>
              </div>
              <pre className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-[11px] font-mono text-cyan-300/90 overflow-x-auto max-h-[500px]">
                {filesContent.requirements}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
