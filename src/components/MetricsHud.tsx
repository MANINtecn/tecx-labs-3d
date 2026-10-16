import React from 'react';
import { MeshMetrics, PolyQuality } from '../types';
import { Box, Layers, Cpu, Maximize2 } from 'lucide-react';

interface MetricsHudProps {
  metrics: MeshMetrics;
  quality: PolyQuality;
  modelName: string;
}

export const MetricsHud: React.FC<MetricsHudProps> = ({ metrics, quality, modelName }) => {
  const qualityLabels: Record<PolyQuality, { label: string; color: string }> = {
    low: { label: 'Low-Poly (Mobile / Retrô)', color: 'text-emerald-400 border-emerald-500/30' },
    mid: { label: 'Mid-Poly (L2 / Mu / Unity)', color: 'text-cyan-400 border-cyan-500/30' },
    high: { label: 'High-Poly (UE5 Nanite / ZBrush)', color: 'text-amber-400 border-amber-500/30' },
    high_fidelity: { label: 'High-Fidelity (512 Res + Decimação Trimesh)', color: 'text-purple-400 border-purple-500/30' },
  };

  return (
    <div className="absolute top-20 left-4 z-20 pointer-events-none select-none">
      <div className="bg-[#0f172a]/90 border border-slate-700/60 rounded-xl p-3.5 shadow-2xl backdrop-blur-none text-xs text-slate-300 min-w-[260px] pointer-events-auto">
        {/* Header do Modelo */}
        <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-slate-700/50">
          <div className="flex items-center gap-1.5 font-semibold text-slate-100 truncate max-w-[170px]">
            <Box className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span className="truncate">{modelName}</span>
          </div>
          <span className={`px-2 py-0.5 rounded text-[10px] font-mono border ${qualityLabels[quality].color} bg-slate-900/60`}>
            {quality.toUpperCase()}
          </span>
        </div>

        {/* Grade de Estatísticas CAD */}
        <div className="grid grid-cols-2 gap-2 font-mono text-[11px]">
          <div className="bg-slate-900/60 rounded-lg p-2 border border-slate-800">
            <div className="text-slate-400 text-[10px] flex items-center gap-1">
              <Layers className="w-3 h-3 text-cyan-400" />
              TRIÂNGULOS
            </div>
            <div className="text-cyan-300 font-bold text-sm mt-0.5">
              {metrics.triangles.toLocaleString()}
            </div>
          </div>

          <div className="bg-slate-900/60 rounded-lg p-2 border border-slate-800">
            <div className="text-slate-400 text-[10px] flex items-center gap-1">
              <Cpu className="w-3 h-3 text-indigo-400" />
              VÉRTICES
            </div>
            <div className="text-indigo-300 font-bold text-sm mt-0.5">
              {metrics.vertices.toLocaleString()}
            </div>
          </div>
        </div>

        {/* Dimensões em cm */}
        <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-mono text-slate-400">
          <div className="flex items-center gap-1">
            <Maximize2 className="w-3 h-3 text-slate-400" />
            <span>DIMENSÕES (L×A×P):</span>
          </div>
          <span className="text-slate-200 font-medium">
            {metrics.dimensions.width}×{metrics.dimensions.height}×{metrics.dimensions.depth} cm
          </span>
        </div>
      </div>
    </div>
  );
};
