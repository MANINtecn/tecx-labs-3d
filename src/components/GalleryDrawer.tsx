import React from 'react';
import { PRESET_ITEMS } from '../utils/proceduralAssets';
import { PresetItem, PolyQuality } from '../types';
import { X, Sparkles, Layers, Box, Check } from 'lucide-react';

interface GalleryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPreset: (preset: PresetItem) => void;
  activePresetId?: string;
}

export const GalleryDrawer: React.FC<GalleryDrawerProps> = ({
  isOpen,
  onClose,
  onSelectPreset,
  activePresetId,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/75 backdrop-blur-sm select-none">
      <div className="w-full max-w-md bg-[#0b0f19] border-l border-cyan-800/40 h-full shadow-2xl flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 bg-[#0f172a] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <h3 className="font-bold text-slate-100 text-sm tracking-wide font-['Chakra_Petch',sans-serif]">
              GALERIA DE AMOSTRAS GAME-READY
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Descrição */}
        <div className="p-4 bg-cyan-950/20 border-b border-cyan-900/30 text-xs text-slate-300">
          <p>
            Selecione qualquer item icônico de <strong>Mu Online</strong>, <strong>Lineage 2</strong> ou <strong>Cyberpunk</strong> para testar a reconstrução 3D de alta densidade poligonal, UV mapping e shaders PBR.
          </p>
        </div>

        {/* Lista de Presets */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {PRESET_ITEMS.map((item) => {
            const isSelected = activePresetId === item.id;
            return (
              <div
                key={item.id}
                onClick={() => {
                  onSelectPreset(item);
                  onClose();
                }}
                className={`p-3 rounded-xl border transition-all cursor-pointer flex gap-3 group ${
                  isSelected
                    ? 'bg-cyan-950/40 border-cyan-500 shadow-lg shadow-cyan-500/10'
                    : 'bg-[#0f172a] border-slate-800 hover:border-cyan-600/50 hover:bg-slate-800/70'
                }`}
              >
                {/* Thumbnail procedural */}
                <div className="w-20 h-20 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-center p-1 relative shrink-0 overflow-hidden">
                  <img
                    src={item.imageUrl}
                    alt={item.name}
                    className="max-w-full max-h-full object-contain group-hover:scale-110 transition-transform duration-300"
                  />
                  {isSelected && (
                    <div className="absolute top-1 right-1 bg-cyan-500 text-slate-950 p-0.5 rounded shadow">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </div>
                  )}
                </div>

                {/* Informações do Item */}
                <div className="flex-1 min-w-0 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-950/50 border border-amber-800/40 text-amber-300 font-semibold">
                        {item.badge}
                      </span>
                    </div>
                    <h4 className="font-bold text-slate-100 text-xs mt-1 truncate group-hover:text-cyan-300 transition-colors">
                      {item.name}
                    </h4>
                    <p className="text-[11px] text-slate-400 line-clamp-2 mt-0.5 leading-snug">
                      {item.description}
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-slate-800/80 text-[10px] font-mono text-slate-400">
                    <span className="flex items-center gap-1">
                      <Layers className="w-3 h-3 text-cyan-400" />
                      ~{item.targetFaces.toLocaleString()} tris
                    </span>
                    <span className="text-cyan-400 font-semibold group-hover:translate-x-0.5 transition-transform">
                      Carregar 3D →
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-[#0f172a] text-center">
          <p className="text-[11px] font-mono text-slate-400">
            Modelos game-ready gerados com UVs e PBR completo
          </p>
        </div>
      </div>
    </div>
  );
};
