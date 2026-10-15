import React, { useState, useRef } from 'react';
import { Upload, X, Scissors, Layers, CheckCircle, AlertCircle } from 'lucide-react';
import { PolyQuality } from '../types';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProcessImage: (
    imageSource: string,
    quality: PolyQuality,
    removeBackground: boolean,
    depthFactor: number,
    name: string
  ) => void;
  isProcessing: boolean;
}

export const UploadModal: React.FC<UploadModalProps> = ({
  isOpen,
  onClose,
  onProcessImage,
  isProcessing,
}) => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imageName, setImageName] = useState<string>('Objeto Customizado 3D');
  const [removeBackground, setRemoveBackground] = useState<boolean>(true);
  const [depthFactor, setDepthFactor] = useState<number>(0.38);
  const [quality, setQuality] = useState<PolyQuality>('mid');
  const [dragActive, setDragActive] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Por favor, selecione um arquivo de imagem válido (PNG, JPG, WEBP).');
      return;
    }
    setImageName(file.name.replace(/\.[^/.]+$/, ''));
    const reader = new FileReader();
    reader.onload = (e) => {
      setSelectedImage(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleGenerate = () => {
    if (!selectedImage) return;
    onProcessImage(selectedImage, quality, removeBackground, depthFactor, imageName);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm select-none">
      <div className="bg-[#0b0f19] border border-cyan-800/40 rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-[#0f172a]">
          <div className="flex items-center gap-2">
            <Upload className="w-5 h-5 text-cyan-400" />
            <h3 className="font-bold text-slate-100 text-sm tracking-wide font-['Chakra_Petch',sans-serif]">
              IMPORTAR IMAGEM 2D PARA RECONSTRUÇÃO 3D
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4">
          {/* Zona de Arraste (Drag & Drop) */}
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-6 text-center transition-all cursor-pointer flex flex-col items-center justify-center min-h-[190px] relative overflow-hidden ${
              dragActive
                ? 'border-cyan-400 bg-cyan-950/20'
                : selectedImage
                ? 'border-slate-700 bg-slate-900/40'
                : 'border-slate-700 hover:border-cyan-500/50 bg-[#0f172a]/40'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            />

            {selectedImage ? (
              <div className="flex flex-col items-center gap-3">
                <div className="w-32 h-32 rounded-lg overflow-hidden border border-cyan-500/40 bg-slate-950 flex items-center justify-center p-1 relative shadow-inner">
                  <img
                    src={selectedImage}
                    alt="Preview"
                    className="max-w-full max-h-full object-contain"
                  />
                  {removeBackground && (
                    <div className="absolute top-1 right-1 bg-cyan-600 text-white rounded p-0.5 text-[9px] font-mono flex items-center gap-0.5 shadow">
                      <Scissors className="w-2.5 h-2.5" />
                      <span>Corte</span>
                    </div>
                  )}
                </div>
                <div className="text-center">
                  <p className="text-xs font-mono text-cyan-300 font-semibold">{imageName}</p>
                  <p className="text-[11px] text-slate-400">Clique ou arraste outra imagem para substituir</p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2.5 text-slate-400">
                <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center text-cyan-400">
                  <Upload className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-200">
                    Arraste qualquer imagem 2D aqui
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Armas, armaduras, veículos, monstros, asas de Mu Online, itens de L2
                  </p>
                </div>
                <span className="text-[11px] font-mono text-cyan-400 bg-cyan-950/40 px-2.5 py-1 rounded-full border border-cyan-800/40">
                  Suporta PNG, JPG, WEBP
                </span>
              </div>
            )}
          </div>

          {/* Opções de Processamento */}
          <div className="bg-[#0f172a] rounded-xl p-3.5 border border-slate-800 space-y-3">
            {/* Remoção de Fundo */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Scissors className="w-4 h-4 text-cyan-400" />
                <span className="text-xs font-medium text-slate-200">
                  Remoção Automática de Fundo (rembg)
                </span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={removeBackground}
                  onChange={(e) => setRemoveBackground(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-cyan-600"></div>
              </label>
            </div>

            {/* Slider de Volume / Espessura 3D */}
            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-slate-400">Espessura / Relevo 3D:</span>
                <span className="font-mono text-cyan-300 font-bold">
                  {Math.round(depthFactor * 100)}%
                </span>
              </div>
              <input
                type="range"
                min="0.15"
                max="0.75"
                step="0.01"
                value={depthFactor}
                onChange={(e) => setDepthFactor(parseFloat(e.target.value))}
                className="w-full accent-cyan-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
              />
            </div>

            {/* Seletor de Densidade de Polígonos */}
            <div>
              <div className="text-xs text-slate-400 mb-1.5 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-cyan-400" />
                <span>Densidade Poligonal Alvo:</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setQuality('low')}
                  className={`py-1.5 px-2 rounded-lg text-xs font-mono border transition-colors cursor-pointer text-center ${
                    quality === 'low'
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/60 font-bold'
                      : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Low-Poly (3k)
                </button>
                <button
                  type="button"
                  onClick={() => setQuality('mid')}
                  className={`py-1.5 px-2 rounded-lg text-xs font-mono border transition-colors cursor-pointer text-center ${
                    quality === 'mid'
                      ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/60 font-bold'
                      : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Mid-Poly (25k)
                </button>
                <button
                  type="button"
                  onClick={() => setQuality('high')}
                  className={`py-1.5 px-2 rounded-lg text-xs font-mono border transition-colors cursor-pointer text-center ${
                    quality === 'high'
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/60 font-bold'
                      : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  High-Poly (85k)
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-800 bg-[#0f172a] flex items-center justify-end gap-2.5">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button
            disabled={!selectedImage || isProcessing}
            onClick={handleGenerate}
            className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-cyan-600/20 border border-cyan-400/40 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer flex items-center gap-2"
          >
            <CheckCircle className="w-4 h-4" />
            <span>Gerar Modelo 3D Game-Ready</span>
          </button>
        </div>
      </div>
    </div>
  );
};
