import React, { useState, useEffect } from 'react';
import { ViewMode, PolyQuality, LightingPreset } from '../types';
import {
  Layers,
  Sun,
  Camera,
  RotateCw,
  Download,
  ChevronDown,
  ChevronUp,
  Eye,
  Sliders,
  Sparkles,
} from 'lucide-react';

interface BottomControlDockProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  quality: PolyQuality;
  onQualityChange: (quality: PolyQuality) => void;
  lightingPreset: LightingPreset;
  onLightingPresetChange: (preset: LightingPreset) => void;
  autoRotate: boolean;
  onToggleAutoRotate: () => void;
  onResetCamera: () => void;
  onExport: (format: 'obj' | 'glb' | 'fbx') => void;
  isProcessing?: boolean;
}

export const BottomControlDock: React.FC<BottomControlDockProps> = ({
  viewMode,
  onViewModeChange,
  quality,
  onQualityChange,
  lightingPreset,
  onLightingPresetChange,
  autoRotate,
  onToggleAutoRotate,
  onResetCamera,
  onExport,
  isProcessing = false,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState<'shading' | 'poly' | 'lights' | 'export'>('shading');

  // Atalho de teclado 'H' para alternar o modo Cinema/Zen
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'h' || e.key === 'H') {
        setIsCollapsed((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-30 w-full max-w-[940px] px-3 pointer-events-none select-none transition-transform duration-300">
      {/* Botão de Colapso / Cinema Mode */}
      <div className="flex justify-center mb-1.5 pointer-events-auto">
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="flex items-center gap-1.5 px-3 py-1 bg-[#0f172a] hover:bg-slate-800 border border-slate-700/80 rounded-full text-slate-300 text-xs font-mono shadow-lg transition-colors cursor-pointer"
          title="Atalho: tecla [H]"
        >
          {isCollapsed ? (
            <>
              <ChevronUp className="w-3.5 h-3.5 text-cyan-400" />
              <span>Expandir Painel 3D [H]</span>
            </>
          ) : (
            <>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              <span>Ocultar Painel (Zen Mode) [H]</span>
            </>
          )}
        </button>
      </div>

      {/* Dock Principal - Superfície sólida sem backdrop-filter para máximo desempenho WebGL */}
      <div
        className={`pointer-events-auto bg-[#090d16] border border-cyan-900/40 rounded-2xl shadow-2xl p-2.5 transition-all duration-300 ${
          isCollapsed ? 'translate-y-[120%] opacity-0 pointer-events-none' : 'translate-y-0 opacity-100'
        }`}
      >
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5">
          {/* Seletor de Abas Compactas */}
          <div className="flex items-center gap-1 bg-[#0f172a] p-1 rounded-xl border border-slate-800 shrink-0">
            <button
              onClick={() => setActiveTab('shading')}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                activeTab === 'shading'
                  ? 'bg-cyan-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Render</span>
            </button>

            <button
              onClick={() => setActiveTab('poly')}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                activeTab === 'poly'
                  ? 'bg-cyan-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Polígonos</span>
            </button>

            <button
              onClick={() => setActiveTab('lights')}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                activeTab === 'lights'
                  ? 'bg-cyan-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Sun className="w-3.5 h-3.5" />
              <span>Estúdio</span>
            </button>

            <button
              onClick={() => setActiveTab('export')}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                activeTab === 'export'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Download className="w-3.5 h-3.5" />
              <span>Exportar</span>
            </button>
          </div>

          {/* Área de Conteúdo da Aba Ativa */}
          <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto py-0.5">
            {activeTab === 'shading' && (
              <div className="flex items-center gap-1.5 bg-[#0f172a] p-1 rounded-xl border border-slate-800">
                <button
                  onClick={() => onViewModeChange('textured')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-colors cursor-pointer ${
                    viewMode === 'textured'
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Texturizado (PBR)
                </button>
                <button
                  onClick={() => onViewModeChange('shaded')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-colors cursor-pointer ${
                    viewMode === 'shaded'
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Shaded (Clay)
                </button>
                <button
                  onClick={() => onViewModeChange('wireframe')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-colors cursor-pointer ${
                    viewMode === 'wireframe'
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Wireframe
                </button>
                <button
                  onClick={() => onViewModeChange('xray')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-colors cursor-pointer ${
                    viewMode === 'xray'
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Raio-X
                </button>
              </div>
            )}

            {activeTab === 'poly' && (
              <div className="flex items-center gap-1.5 bg-[#0f172a] p-1 rounded-xl border border-slate-800">
                <button
                  onClick={() => onQualityChange('low')}
                  disabled={isProcessing}
                  className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-colors cursor-pointer ${
                    quality === 'low'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Low-Poly (~3.5k)
                </button>
                <button
                  onClick={() => onQualityChange('mid')}
                  disabled={isProcessing}
                  className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-colors cursor-pointer ${
                    quality === 'mid'
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Mid-Poly (~25k Game)
                </button>
                <button
                  onClick={() => onQualityChange('high')}
                  disabled={isProcessing}
                  className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-colors cursor-pointer ${
                    quality === 'high'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  High-Poly (~85k UE5)
                </button>
              </div>
            )}

            {activeTab === 'lights' && (
              <div className="flex items-center gap-1.5 bg-[#0f172a] p-1 rounded-xl border border-slate-800">
                <button
                  onClick={() => onLightingPresetChange('studio')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-colors cursor-pointer ${
                    lightingPreset === 'studio'
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Estúdio PBR
                </button>
                <button
                  onClick={() => onLightingPresetChange('cyberpunk')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-colors cursor-pointer ${
                    lightingPreset === 'cyberpunk'
                      ? 'bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-500/50'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Cyber Neon
                </button>
                <button
                  onClick={() => onLightingPresetChange('warm')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-colors cursor-pointer ${
                    lightingPreset === 'warm'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Luz Quente
                </button>
                <button
                  onClick={() => onLightingPresetChange('dramatic')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-colors cursor-pointer ${
                    lightingPreset === 'dramatic'
                      ? 'bg-slate-500/30 text-slate-100 border border-slate-400/50'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Dramático
                </button>
              </div>
            )}

            {activeTab === 'export' && (
              <div className="flex items-center gap-1.5 bg-[#0f172a] p-1 rounded-xl border border-slate-800">
                <button
                  onClick={() => onExport('obj')}
                  className="px-2.5 py-1 bg-cyan-700/60 hover:bg-cyan-600 text-cyan-100 border border-cyan-500/40 rounded-lg text-xs font-mono transition-colors cursor-pointer flex items-center gap-1"
                >
                  <Download className="w-3 h-3" />
                  .OBJ + MTL
                </button>
                <button
                  onClick={() => onExport('glb')}
                  className="px-2.5 py-1 bg-emerald-700/60 hover:bg-emerald-600 text-emerald-100 border border-emerald-500/40 rounded-lg text-xs font-mono transition-colors cursor-pointer flex items-center gap-1"
                >
                  <Download className="w-3 h-3" />
                  .GLB (Web3D)
                </button>
                <button
                  onClick={() => onExport('fbx')}
                  className="px-2.5 py-1 bg-indigo-700/60 hover:bg-indigo-600 text-indigo-100 border border-indigo-500/40 rounded-lg text-xs font-mono transition-colors cursor-pointer flex items-center gap-1"
                >
                  <Download className="w-3 h-3" />
                  .FBX (Unreal/Unity)
                </button>
              </div>
            )}
          </div>

          {/* Controles de Câmera e Giro */}
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={onToggleAutoRotate}
              className={`p-2 rounded-xl border transition-colors cursor-pointer ${
                autoRotate
                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50'
                  : 'bg-[#0f172a] text-slate-400 hover:text-slate-200 border-slate-800'
              }`}
              title={autoRotate ? 'Pausar Rotação Orbital' : 'Girar Modelo em Órbita'}
            >
              <RotateCw className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={onResetCamera}
              className="p-2 bg-[#0f172a] hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800 rounded-xl transition-colors cursor-pointer"
              title="Resetar Câmera e Foco"
            >
              <Camera className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
