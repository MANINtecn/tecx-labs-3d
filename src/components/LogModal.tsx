import React, { useState } from 'react';
import {
  FileText,
  X,
  Copy,
  Check,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Sparkles,
} from 'lucide-react';

interface LogModalProps {
  isOpen: boolean;
  onClose: () => void;
  serverLogs: string[];
  segmentedPreview: string | null;
  clientLogs: string[];
  backendUrl: string;
  isBackendConnected: boolean;
}

export const LogModal: React.FC<LogModalProps> = ({
  isOpen,
  onClose,
  serverLogs,
  segmentedPreview,
  clientLogs,
  backendUrl,
  isBackendConnected,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const fullLogText = [
    `=== TECX LABS 3D - RELATÓRIO DE TELEMETRIA ===`,
    `Data/Hora: ${new Date().toLocaleString()}`,
    `Status da Conexão: ${isBackendConnected ? 'Online' : 'Offline'}`,
    `URL do Servidor: ${backendUrl || 'Não configurada'}`,
    ``,
    `--- LOGS DO SERVIDOR NEURAL (COLAB) ---`,
    ...(serverLogs.length > 0 ? serverLogs : ['Nenhum log retornado pelo servidor ainda.']),
    ``,
    `--- LOGS DO CLIENTE / GATEWAY LOCAL ---`,
    ...(clientLogs.length > 0 ? clientLogs : ['Nenhum log do cliente registrado.']),
    ``,
    `Status Segmentação: ${segmentedPreview ? 'Imagem segmentada disponível' : 'Nenhuma imagem processada'}`,
  ].join('\n');

  const handleCopy = () => {
    navigator.clipboard.writeText(fullLogText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md select-none animate-in fade-in duration-200">
      <div className="bg-[#0b0f19] border border-slate-800 rounded-2xl w-full max-w-3xl max-h-[88vh] shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-950/60 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white tracking-wide">
                DIAGNÓSTICO & LOGS DO SERVIDOR NEURAL
              </h2>
              <p className="text-[11px] text-slate-400">
                Inspecione cada etapa do processamento e remoção de fundo
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copiado!' : 'Copiar Logs para Gemini'}</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Corpo com Scroll */}
        <div className="p-6 space-y-5 overflow-y-auto font-mono text-xs text-slate-300">
          {/* Preview da Segmentação */}
          {segmentedPreview && (
            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
              <div className="flex items-center gap-2 text-cyan-300 text-xs font-bold">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Recorte Neural de Fundo (RMBG-1.4) — Preview Real</span>
              </div>
              <p className="text-[11px] text-slate-400 font-sans">
                Esta é a imagem exata gerada pelo recorte antes de esculpir em 3D. Se o fundo tiver sumido, o modelo 3D sairá limpo sem caixas:
              </p>
              <div className="w-36 h-36 rounded-lg bg-[radial-gradient(#334155_1px,transparent_1px)] [background-size:12px_12px] bg-slate-950 border border-slate-700 p-2 flex items-center justify-center overflow-hidden">
                <img
                  src={`data:image/png;base64,${segmentedPreview}`}
                  alt="Segmented Preview"
                  className="max-w-full max-h-full object-contain"
                />
              </div>
            </div>
          )}

          {/* Logs do Servidor Neural */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-white">
              <span>Passo a Passo da Última Geração (Servidor Remoto):</span>
              <span className="text-[10px] text-slate-500 font-normal">
                {serverLogs.length} etapas registradas
              </span>
            </div>
            <div className="p-3.5 rounded-xl bg-black/80 border border-slate-800 max-h-48 overflow-y-auto space-y-1.5 text-[11px] text-slate-300 leading-relaxed">
              {serverLogs.length > 0 ? (
                serverLogs.map((log, idx) => (
                  <div key={idx} className="flex items-start gap-2">
                    <span className="text-cyan-400 select-none">›</span>
                    <span className={log.includes('❌') ? 'text-red-400' : log.includes('✅') ? 'text-emerald-300' : 'text-slate-300'}>
                      {log}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-slate-500 italic">
                  Nenhum modelo foi gerado nesta sessão ainda. Quando você gerar, o passo a passo detalhado aparecerá aqui.
                </p>
              )}
            </div>
          </div>

          {/* Logs do Cliente */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-white">Logs do Gateway Local:</span>
            <div className="p-3 rounded-xl bg-black/60 border border-slate-800 text-[11px] text-slate-400 max-h-32 overflow-y-auto space-y-1">
              <div className="text-slate-300">
                Conexão: <span className={isBackendConnected ? 'text-emerald-400' : 'text-amber-400'}>{isBackendConnected ? 'Ativa' : 'Inativa'}</span> ({backendUrl || 'Sem URL'})
              </div>
              {clientLogs.map((log, idx) => (
                <div key={idx}>• {log}</div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
