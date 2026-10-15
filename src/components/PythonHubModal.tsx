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
} from 'lucide-react';

interface PythonHubModalProps {
  isOpen: boolean;
  onClose: () => void;
  backendUrl: string;
  onUpdateBackendUrl: (url: string) => void;
  isBackendConnected: boolean;
  onTestConnection: () => Promise<boolean>;
}

export const PythonHubModal: React.FC<PythonHubModalProps> = ({
  isOpen,
  onClose,
  backendUrl,
  onUpdateBackendUrl,
  isBackendConnected,
  onTestConnection,
}) => {
  const [activeTab, setActiveTab] = useState<'app' | 'requirements' | 'colab' | 'connect'>('app');
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
        setTestResult('Conexão realizada com sucesso! GPU detectada.');
      } else {
        setTestResult('Não foi possível conectar ao servidor. Verifique se o app.py ou Colab está rodando.');
      }
    } catch {
      setTestResult('Erro ao tentar conectar à URL.');
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
                CENTRO DE DEPLOY & BACKEND NEURAL PYTHON
              </h3>
              <p className="text-[11px] text-slate-400 font-mono">
                TECX SoftHouse — Código oficial do Backend, Requirements & Google Colab
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
            onClick={() => setActiveTab('app')}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'app'
                ? 'bg-cyan-600 text-white font-bold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <span>app.py (Backend FastAPI)</span>
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

          <button
            onClick={() => setActiveTab('colab')}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'colab'
                ? 'bg-cyan-600 text-white font-bold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Cloud className="w-3.5 h-3.5 text-amber-400" />
            <span>Google Colab (GPU Gratuita)</span>
          </button>

          <button
            onClick={() => setActiveTab('connect')}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'connect'
                ? 'bg-indigo-600 text-white font-bold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Server className="w-3.5 h-3.5 text-cyan-300" />
            <span>Conectar Servidor Remoto</span>
          </button>
        </div>

        {/* Conteúdo da Aba */}
        <div className="flex-1 overflow-y-auto p-5 bg-[#090d16]">
          {activeTab === 'app' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-slate-100 text-xs font-mono">
                    app.py — Servidor FastAPI com TripoSR, Rembg e Exporters
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    Contém pipeline completo de remoção de fundo, reconstrução volumétrica, UVs e exportação .OBJ, .GLB e .FBX.
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
                    requirements.txt — Dependências Python (PyTorch, Trimesh, Rembg)
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

          {activeTab === 'colab' && (
            <div className="space-y-4 text-xs text-slate-300">
              <div className="p-4 rounded-xl bg-gradient-to-r from-amber-950/30 to-slate-900 border border-amber-800/40">
                <div className="flex items-center gap-2 text-amber-300 font-bold font-['Chakra_Petch',sans-serif] text-sm">
                  <Cloud className="w-4 h-4" />
                  <span>COMO EXECUTAR NO GOOGLE COLAB (100% GRATUITO COM GPU T4/A100)</span>
                </div>
                <p className="mt-1 text-slate-300">
                  Ideal caso seu computador não possua placa de vídeo NVIDIA potente. O Google Colab oferece placas de vídeo com 16GB de VRAM sem custos.
                </p>
              </div>

              <div className="space-y-3 font-mono">
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                  <p className="text-cyan-400 font-bold mb-1">Passo 1: Acessar Google Colab</p>
                  <p className="text-slate-400">
                    Acesse{' '}
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
                    <p className="text-cyan-400 font-bold">Passo 3: Executar Script no Colab</p>
                    <button
                      onClick={() => copyToClipboard(filesContent.colab, 'colab')}
                      className="flex items-center gap-1 px-2.5 py-1 bg-slate-800 text-slate-200 rounded text-[11px]"
                    >
                      {copied === 'colab' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>Copiar Código</span>
                    </button>
                  </div>
                  <pre className="p-3 rounded-lg bg-black text-[11px] text-slate-300 overflow-x-auto">
                    {filesContent.colab}
                  </pre>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'connect' && (
            <div className="space-y-4 text-xs text-slate-300 max-w-xl mx-auto py-4">
              <div className="p-4 bg-slate-900/60 rounded-xl border border-slate-800">
                <div className="flex items-center gap-2 mb-2">
                  <Server className="w-4 h-4 text-cyan-400" />
                  <span className="font-bold text-slate-100 text-sm">
                    URL da API do Servidor Neural
                  </span>
                </div>
                <p className="text-slate-400 text-xs mb-3">
                  Insira o endereço local onde o <code className="text-cyan-400">app.py</code> está rodando (ex: <code className="text-cyan-300">http://localhost:8000</code>) ou a URL gerada pelo Ngrok no Google Colab.
                </p>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={backendUrl}
                    onChange={(e) => onUpdateBackendUrl(e.target.value)}
                    placeholder="http://localhost:8000"
                    className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-cyan-300 focus:outline-none focus:border-cyan-500"
                  />
                  <button
                    onClick={handleTest}
                    disabled={testing}
                    className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white rounded-lg text-xs font-mono font-bold transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    {testing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Cpu className="w-3.5 h-3.5" />}
                    <span>Testar Conexão</span>
                  </button>
                </div>

                {testResult && (
                  <div
                    className={`mt-3 p-2.5 rounded-lg text-xs font-mono border ${
                      isBackendConnected
                        ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-300'
                        : 'bg-red-950/40 border-red-500/50 text-red-300'
                    }`}
                  >
                    {testResult}
                  </div>
                )}
              </div>

              <div className="p-3.5 bg-cyan-950/20 border border-cyan-900/40 rounded-xl text-[11px] text-slate-400 font-mono">
                💡 Caso nenhum servidor Python esteja conectado no momento, o TECX LABS 3D utiliza automaticamente seu motor cliente WebGPU / Three.js integrado para reconstrução 3D imediata e exportação instantânea!
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
