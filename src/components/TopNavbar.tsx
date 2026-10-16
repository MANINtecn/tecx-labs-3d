import React from 'react';
import {
  Box,
  Image as ImageIcon,
  Server,
  Activity,
  Plus,
} from 'lucide-react';

interface TopNavbarProps {
  onOpenUpload: () => void;
  onOpenPythonHub: () => void;
  isBackendConnected: boolean;
  modelName?: string;
}

export const TopNavbar: React.FC<TopNavbarProps> = ({
  onOpenUpload,
  onOpenPythonHub,
  isBackendConnected,
  modelName,
}) => {
  return (
    <header className="absolute top-0 left-0 right-0 z-20 h-16 bg-[#080b12]/95 border-b border-slate-800/80 px-4 sm:px-6 flex items-center justify-between select-none shadow-md backdrop-blur-md">
      {/* Logotipo e Assinatura TECX LABS 3D */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 border border-cyan-400/40">
          <Box className="w-5 h-5 text-white" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-sm sm:text-base tracking-wider text-white">
              TECX LABS 3D
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-950/80 border border-cyan-800/50 text-cyan-300 font-bold">
              NEURAL PRO
            </span>
          </div>
          {modelName && modelName !== 'Nenhum modelo carregado' ? (
            <p className="text-[11px] text-cyan-400 font-mono truncate max-w-[200px] sm:max-w-xs">
              {modelName}
            </p>
          ) : (
            <p className="text-[11px] text-slate-400 font-mono tracking-tight hidden sm:block">
              AI 3D Mesh Generator & Asset Studio
            </p>
          )}
        </div>
      </div>

      {/* Status do Servidor Neural TECX (Sem vazar tecnologias de terceiros) */}
      <div
        onClick={onOpenPythonHub}
        className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full border text-xs font-mono cursor-pointer transition-all ${
          isBackendConnected
            ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300 hover:bg-emerald-900/40 shadow-sm shadow-emerald-500/10'
            : 'bg-amber-950/40 border-amber-500/40 text-amber-300 hover:bg-amber-900/40 shadow-sm shadow-amber-500/10'
        }`}
        title="Gerenciar conexão do Servidor Neural TECX"
      >
        <span
          className={`w-2 h-2 rounded-full animate-pulse ${
            isBackendConnected ? 'bg-emerald-400' : 'bg-amber-400'
          }`}
        />
        <span className="font-semibold hidden sm:inline">
          {isBackendConnected ? 'Servidor Neural Online' : 'Servidor Neural Offline'}
        </span>
        <span className="font-semibold sm:hidden">
          {isBackendConnected ? 'Online' : 'Offline'}
        </span>
        <span className="text-[10px] opacity-75 underline ml-1">
          {isBackendConnected ? 'Config' : 'Conectar'}
        </span>
      </div>

      {/* Ações da Navbar */}
      <div className="flex items-center gap-2">
        <button
          onClick={onOpenPythonHub}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-300 border border-slate-700/80 text-xs font-mono transition-colors cursor-pointer"
          title="Configurar servidor e chave de conexão"
        >
          <Server className="w-3.5 h-3.5 text-cyan-400" />
          <span className="hidden md:inline">Servidor</span>
        </button>

        <button
          onClick={onOpenUpload}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-cyan-500/20 border border-cyan-400/30 transition-all cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Novo Modelo</span>
        </button>
      </div>
    </header>
  );
};
