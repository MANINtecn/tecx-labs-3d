import React, { useState } from 'react';
import {
  Image as ImageIcon,
  Columns,
  Layers,
  X,
  Maximize2,
  Minimize2,
  Eye,
  EyeOff,
  Sliders,
  MoveHorizontal,
} from 'lucide-react';

export type ComparisonMode = 'off' | 'pip' | 'split' | 'overlay';

interface ReferenceComparisonProps {
  referenceImage: string | null;
  mode: ComparisonMode;
  onModeChange: (mode: ComparisonMode) => void;
  overlayOpacity: number;
  onOpacityChange: (opacity: number) => void;
  modelName?: string;
}

export const ReferenceComparison: React.FC<ReferenceComparisonProps> = ({
  referenceImage,
  mode,
  onModeChange,
  overlayOpacity,
  onOpacityChange,
  modelName = 'Asset 3D',
}) => {
  const [isMinimized, setIsMinimized] = useState<boolean>(false);
  const [isZoomed, setIsZoomed] = useState<boolean>(false);

  if (!referenceImage) return null;

  return (
    <>
      {/* 1. Botão Flutuante quando a comparação está desativada ('off') */}
      {mode === 'off' && (
        <button
          onClick={() => onModeChange('pip')}
          className="fixed top-20 left-4 z-30 flex items-center gap-2 px-3 py-2 rounded-xl bg-[#0b0f19]/90 hover:bg-[#0f172a] border border-cyan-800/50 hover:border-cyan-500/80 text-cyan-300 text-xs font-mono shadow-xl backdrop-blur-md transition-all cursor-pointer group"
          title="Ver imagem de referência original para comparar com o 3D"
        >
          <div className="w-6 h-6 rounded-lg overflow-hidden border border-cyan-500/40 shrink-0">
            <img src={referenceImage} alt="Ref" className="w-full h-full object-cover" />
          </div>
          <span className="font-bold">Comparar com Foto 2D</span>
          <Columns className="w-3.5 h-3.5 text-cyan-400 group-hover:scale-110 transition-transform" />
        </button>
      )}

      {/* 2. Modo Picture-in-Picture (PiP / Miniatura Flutuante) */}
      {mode === 'pip' && (
        <div
          className={`fixed top-20 left-4 z-30 bg-[#0b0f19]/95 border border-cyan-800/60 rounded-2xl shadow-2xl backdrop-blur-md transition-all duration-300 overflow-hidden select-none ${
            isMinimized ? 'w-48' : isZoomed ? 'w-80 sm:w-96' : 'w-64 sm:w-72'
          }`}
        >
          {/* Header do Card PiP */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-slate-800 bg-[#0f172a]/80">
            <div className="flex items-center gap-1.5 min-w-0">
              <ImageIcon className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              <span className="text-[11px] font-mono font-bold text-slate-200 truncate">
                Referência 2D
              </span>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setIsZoomed(!isZoomed)}
                className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition-colors cursor-pointer"
                title={isZoomed ? 'Reduzir' : 'Ampliar'}
              >
                {isZoomed ? <Minimize2 className="w-3 h-3" /> : <Maximize2 className="w-3 h-3" />}
              </button>
              <button
                onClick={() => setIsMinimized(!isMinimized)}
                className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition-colors cursor-pointer"
                title={isMinimized ? 'Expandir' : 'Minimizar'}
              >
                {isMinimized ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
              </button>
              <button
                onClick={() => onModeChange('off')}
                className="p-1 text-slate-400 hover:text-rose-400 rounded hover:bg-slate-800 transition-colors cursor-pointer"
                title="Fechar Comparação"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Imagem de Referência */}
          {!isMinimized && (
            <div className="p-2 space-y-2">
              <div className="relative rounded-xl overflow-hidden border border-slate-800 bg-black/60 flex items-center justify-center max-h-56">
                <img
                  src={referenceImage}
                  alt="Referência Original"
                  className="max-h-52 w-auto object-contain transition-transform hover:scale-105 duration-200"
                />
                <span className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/70 text-[9px] font-mono text-cyan-300 border border-white/10">
                  Foto 2D
                </span>
              </div>

              {/* Seletor de Modos de Comparação */}
              <div className="grid grid-cols-2 gap-1.5 pt-1">
                <button
                  onClick={() => onModeChange('split')}
                  className="py-1.5 px-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-cyan-600/60 text-slate-300 hover:text-cyan-300 text-[10px] font-mono flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Columns className="w-3 h-3" />
                  <span>Lado a Lado</span>
                </button>

                <button
                  onClick={() => onModeChange('overlay')}
                  className="py-1.5 px-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-cyan-600/60 text-slate-300 hover:text-cyan-300 text-[10px] font-mono flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Layers className="w-3 h-3" />
                  <span>Sobreposição</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 3. Modo Sobreposição Fantasma (Ghost Overlay com controle de opacidade) */}
      {mode === 'overlay' && (
        <>
          {/* Painel de Controle de Opacidade no topo */}
          <div className="fixed top-20 left-1/2 -translate-x-1/2 z-30 bg-[#0b0f19]/95 border border-cyan-500/70 rounded-2xl px-4 py-2.5 shadow-2xl backdrop-blur-md flex items-center gap-4 text-xs font-mono select-none">
            <div className="flex items-center gap-2 text-cyan-300">
              <Layers className="w-4 h-4 text-cyan-400" />
              <span className="font-bold">Modo Sobreposição (Ghost Alignment):</span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[10px] text-slate-400">Opacidade:</span>
              <input
                type="range"
                min="0.1"
                max="0.9"
                step="0.05"
                value={overlayOpacity}
                onChange={(e) => onOpacityChange(parseFloat(e.target.value))}
                className="w-28 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
              />
              <span className="text-[11px] text-cyan-300 font-bold w-9">
                {Math.round(overlayOpacity * 100)}%
              </span>
            </div>

            <div className="flex items-center gap-1 pl-2 border-l border-slate-800">
              <button
                onClick={() => onModeChange('split')}
                className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] transition-colors cursor-pointer"
              >
                Lado a Lado
              </button>
              <button
                onClick={() => onModeChange('pip')}
                className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] transition-colors cursor-pointer"
              >
                Minimizar
              </button>
              <button
                onClick={() => onModeChange('off')}
                className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition-colors cursor-pointer"
                title="Fechar"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Imagem Sobreposta Translúcida perfeitamente alinhada com a viewport */}
          <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none select-none">
            <img
              src={referenceImage}
              alt="Sobreposição de Referência"
              style={{ opacity: overlayOpacity }}
              className="max-h-[78vh] max-w-[78vw] object-contain transition-opacity duration-150 filter drop-shadow-[0_0_15px_rgba(6,182,212,0.3)]"
            />
          </div>
        </>
      )}
    </>
  );
};
