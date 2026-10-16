import React from 'react';
import { ViewMode } from '../types';
import {
  RotateCw,
  Focus,
  Grid,
  Download,
  Box,
  Eye,
  Layers,
  Sparkles,
} from 'lucide-react';

interface BottomControlDockProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  autoRotate: boolean;
  onToggleAutoRotate: () => void;
  onResetCamera: () => void;
  showGrid: boolean;
  onToggleGrid: () => void;
  onExport: (format: 'glb' | 'obj') => void;
  hasModel: boolean;
}

export const BottomControlDock: React.FC<BottomControlDockProps> = ({
  viewMode,
  onViewModeChange,
  autoRotate,
  onToggleAutoRotate,
  onResetCamera,
  showGrid,
  onToggleGrid,
  onExport,
  hasModel,
}) => {
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30 pointer-events-none select-none">
      <div className="pointer-events-auto flex items-center gap-1.5 p-1.5 bg-[#0b0f19]/90 backdrop-blur-md border border-slate-800/80 rounded-2xl shadow-2xl shadow-black/60 text-xs">
        {/* Modos de Visualização (Shading) */}
        <div className="flex items-center gap-1 bg-slate-900/80 p-0.5 rounded-xl border border-slate-800/60">
          <button
            onClick={() => onViewModeChange('textured')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
              viewMode === 'textured'
                ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md shadow-cyan-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
            title="Visualização Texturizada PBR"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Textura</span>
          </button>

          <button
            onClick={() => onViewModeChange('shaded')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
              viewMode === 'shaded'
                ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md shadow-cyan-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
            title="Visualização Fosca Studio Clay"
          >
            <Box className="w-3.5 h-3.5" />
            <span>Clay</span>
          </button>

          <button
            onClick={() => onViewModeChange('wireframe')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
              viewMode === 'wireframe'
                ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md shadow-cyan-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
            title="Visualização da Malha / Vértices"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Wireframe</span>
          </button>

          <button
            onClick={() => onViewModeChange('xray')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
              viewMode === 'xray'
                ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md shadow-cyan-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
            title="Visualização Raio-X Transparente"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Raio-X</span>
          </button>
        </div>

        {/* Divisor */}
        <div className="w-[1px] h-6 bg-slate-800 mx-1" />

        {/* Ferramentas de Câmera e Grade */}
        <div className="flex items-center gap-1">
          <button
            onClick={onToggleAutoRotate}
            className={`p-2 rounded-xl border transition-colors cursor-pointer ${
              autoRotate
                ? 'bg-cyan-950/60 border-cyan-500/50 text-cyan-300'
                : 'bg-slate-900/60 border-slate-800/60 text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
            title="Alternar Auto-Rotação 360°"
          >
            <RotateCw className="w-4 h-4" />
          </button>

          <button
            onClick={onResetCamera}
            className="p-2 rounded-xl bg-slate-900/60 hover:bg-slate-800 border border-slate-800/60 text-slate-400 hover:text-white transition-colors cursor-pointer"
            title="Centralizar e Enquadrar Câmera"
          >
            <Focus className="w-4 h-4" />
          </button>

          <button
            onClick={onToggleGrid}
            className={`p-2 rounded-xl border transition-colors cursor-pointer ${
              showGrid
                ? 'bg-cyan-950/60 border-cyan-500/50 text-cyan-300'
                : 'bg-slate-900/60 border-slate-800/60 text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
            title="Exibir / Ocultar Grade e Eixos"
          >
            <Grid className="w-4 h-4" />
          </button>
        </div>

        {/* Divisor */}
        <div className="w-[1px] h-6 bg-slate-800 mx-1" />

        {/* Botões Diretos de Exportação */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => onExport('glb')}
            disabled={!hasModel}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold transition-all ${
              hasModel
                ? 'bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 cursor-pointer'
                : 'bg-slate-900/40 text-slate-600 border border-slate-800/40 cursor-not-allowed'
            }`}
            title="Baixar Modelo em formato GLB (Unreal / Unity / Web)"
          >
            <Download className="w-3.5 h-3.5 text-cyan-400" />
            <span>.GLB</span>
          </button>

          <button
            onClick={() => onExport('obj')}
            disabled={!hasModel}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold transition-all ${
              hasModel
                ? 'bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 cursor-pointer'
                : 'bg-slate-900/40 text-slate-600 border border-slate-800/40 cursor-not-allowed'
            }`}
            title="Baixar Modelo em formato OBJ (Blender / L2 Interlude)"
          >
            <Download className="w-3.5 h-3.5 text-indigo-400" />
            <span>.OBJ</span>
          </button>
        </div>
      </div>
    </div>
  );
};
