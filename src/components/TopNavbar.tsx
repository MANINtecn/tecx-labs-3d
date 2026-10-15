import React from 'react';
import {
  Box,
  Image as ImageIcon,
  Sparkles,
  Terminal,
  Grid,
  Zap,
} from 'lucide-react';

interface TopNavbarProps {
  onOpenUpload: () => void;
  onOpenGallery: () => void;
  onOpenAIConcept: () => void;
  onOpenPythonHub: () => void;
  isBackendConnected: boolean;
}

export const TopNavbar: React.FC<TopNavbarProps> = ({
  onOpenUpload,
  onOpenGallery,
  onOpenAIConcept,
  onOpenPythonHub,
  isBackendConnected,
}) => {
  return (
    <header className="absolute top-0 left-0 right-0 z-20 h-16 bg-[#090d16]/95 border-b border-slate-800/80 px-4 flex items-center justify-between select-none shadow-md">
      {/* Logotipo e Assinatura TECX SoftHouse */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 border border-cyan-400/40">
          <Box className="w-5 h-5 text-white" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-base tracking-wider text-white font-['Chakra_Petch',sans-serif]">
              TECX LABS 3D
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-950/80 border border-cyan-800/50 text-cyan-300 font-bold">
              v1.0 NEURAL
            </span>
          </div>
          <p className="text-[11px] text-slate-400 font-mono tracking-tight hidden sm:block">
            TECX SoftHouse — High-Density Image-to-3D Suite
          </p>
        </div>
      </div>

      {/* Status do Motor (Estático, sem pulsating dots de acordo com as regras de UX) */}
      <div className="hidden lg:flex items-center gap-2.5 bg-[#0f172a] px-3 py-1.5 rounded-full border border-slate-800 text-xs font-mono">
        <span
          className={`w-2 h-2 rounded-full ${
            isBackendConnected ? 'bg-emerald-400' : 'bg-cyan-400'
          }`}
        />
        <span className="text-slate-300">
          {isBackendConnected ? 'Servidor Python Conectado (GPU)' : 'Motor 3D WebGPU Ativo'}
        </span>
      </div>

      {/* Ações Principais da Navbar */}
      <div className="flex items-center gap-2">
        <button
          onClick={onOpenGallery}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0f172a] hover:bg-slate-800 text-slate-200 border border-slate-700/80 text-xs font-medium transition-colors cursor-pointer"
        >
          <Grid className="w-3.5 h-3.5 text-amber-400" />
          <span className="hidden md:inline">Amostras</span>
          <span className="hidden sm:inline font-mono text-amber-400">(Mu / L2)</span>
        </button>

        <button
          onClick={onOpenAIConcept}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0f172a] hover:bg-slate-800 text-slate-200 border border-slate-700/80 text-xs font-medium transition-colors cursor-pointer"
        >
          <Sparkles className="w-3.5 h-3.5 text-fuchsia-400" />
          <span className="hidden sm:inline">IA Concept</span>
        </button>

        <button
          onClick={onOpenUpload}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-cyan-600/20 border border-cyan-400/30 transition-all cursor-pointer"
        >
          <ImageIcon className="w-3.5 h-3.5" />
          <span>Nova Imagem</span>
        </button>

        <button
          onClick={onOpenPythonHub}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0f172a] hover:bg-slate-800 text-slate-300 border border-cyan-900/50 hover:border-cyan-500/50 text-xs font-mono transition-colors cursor-pointer"
          title="Ver código Python (app.py), requirements.txt e Google Colab"
        >
          <Terminal className="w-3.5 h-3.5 text-cyan-400" />
          <span className="hidden md:inline">Python & Colab</span>
        </button>
      </div>
    </header>
  );
};
