import React, { useState, useRef } from 'react';
import {
  UploadCloud,
  X,
  Sparkles,
  Zap,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';
import { PolyQuality } from '../types';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProcessImage: (
    imageSource: string,
    quality: PolyQuality,
    removeBackground: boolean,
    name: string
  ) => void;
  isProcessing: boolean;
  processingStatus: string;
  isBackendConnected: boolean;
  onOpenPythonHub: () => void;
}

export const UploadModal: React.FC<UploadModalProps> = ({
  isOpen,
  onClose,
  onProcessImage,
  isProcessing,
  processingStatus,
  isBackendConnected,
  onOpenPythonHub,
}) => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imageName, setImageName] = useState<string>('Objeto Customizado 3D');
  const [quality, setQuality] = useState<PolyQuality>('mid');
  const [dragActive, setDragActive] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Por favor, selecione um arquivo de imagem válido (PNG, JPG, WEBP).');
      return;
    }
    const cleanName = file.name.replace(/\.[^/.]+$/, '');
    setImageName(cleanName);

    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result as string;
      setSelectedImage(base64);
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
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

  const handleSubmit = () => {
    if (!selectedImage) return;
    onProcessImage(selectedImage, quality, true, imageName);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md select-none animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-[#0c101a] border border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header Minimalista */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800/80">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-indigo-600 flex items-center justify-center shadow-md shadow-cyan-500/20">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white tracking-wide">
                GERAR MODELO 3D (IMAGE-TO-3D)
              </h2>
              <p className="text-[11px] text-slate-400">
                Processamento neural 360° com GPU T4 (TripoSR + RMBG-1.4)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Corpo do Modal */}
        <div className="p-6 space-y-5">
          {/* Status do Colab */}
          {!isBackendConnected ? (
            <div className="flex items-center justify-between p-3 rounded-xl bg-amber-950/30 border border-amber-600/40 text-amber-300 text-xs">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-amber-400" />
                <span>O servidor do Colab está desconectado.</span>
              </div>
              <button
                onClick={() => {
                  onClose();
                  onOpenPythonHub();
                }}
                className="flex items-center gap-1 font-bold underline hover:text-white cursor-pointer ml-2 shrink-0"
              >
                <span>Conectar Colab</span>
                <ExternalLink className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-950/20 border border-emerald-500/30 text-emerald-300 text-xs font-mono">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-400" />
              <span>GPU Google Colab Online e Pronta</span>
            </div>
          )}

          {/* Área de Upload / Preview */}
          {!selectedImage ? (
            <div
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`relative flex flex-col items-center justify-center p-8 rounded-xl border-2 border-dashed transition-all cursor-pointer ${
                dragActive
                  ? 'border-cyan-400 bg-cyan-950/20 scale-[0.99]'
                  : 'border-slate-800 hover:border-slate-700 bg-slate-900/40'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
                className="hidden"
              />
              <div className="w-12 h-12 rounded-xl bg-slate-800/80 flex items-center justify-center text-cyan-400 mb-3 shadow-inner">
                <UploadCloud className="w-6 h-6" />
              </div>
              <p className="text-sm font-semibold text-white mb-1">
                Clique para selecionar ou arraste a imagem
              </p>
              <p className="text-xs text-slate-400 text-center">
                Desenho da picareta, arma, armadura, NPC ou foto (PNG, JPG, WEBP)
              </p>
            </div>
          ) : (
            <div className="relative rounded-xl border border-slate-800 bg-slate-900/60 p-3 flex items-center gap-4">
              <div className="w-20 h-20 rounded-lg bg-black/60 border border-slate-700/80 overflow-hidden flex items-center justify-center shrink-0">
                <img
                  src={selectedImage}
                  alt="Preview"
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-slate-400 mb-0.5">Imagem Selecionada</p>
                <p className="text-sm font-bold text-white truncate">{imageName}</p>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="mt-2 text-xs text-cyan-400 hover:text-cyan-300 underline cursor-pointer"
                >
                  Trocar imagem
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
                  className="hidden"
                />
              </div>
              <button
                onClick={() => setSelectedImage(null)}
                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-800 transition-colors"
                title="Remover"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Qualidade do Modelo */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
              <span>Resolução & Detalhes da Malha</span>
              <span className="text-[10px] text-slate-500 font-mono">TripoSR Grid</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'low' as PolyQuality, label: 'Rápido', desc: '128 res (2-4s)' },
                { id: 'mid' as PolyQuality, label: 'Equilibrado', desc: '256 res (Recomendado)' },
                { id: 'high' as PolyQuality, label: 'Ultra HD', desc: '320 res (Alta definição)' },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setQuality(item.id)}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                    quality === item.id
                      ? 'bg-cyan-950/40 border-cyan-500 text-white shadow-sm shadow-cyan-500/20'
                      : 'bg-slate-900/40 border-slate-800 text-slate-400 hover:text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <p className="text-xs font-bold">{item.label}</p>
                  <p className="text-[10px] opacity-75">{item.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Botão de Ação / Barra de Progresso */}
          {isProcessing ? (
            <div className="p-4 rounded-xl bg-slate-900/80 border border-cyan-800/50 space-y-2">
              <div className="flex items-center justify-between text-xs font-mono text-cyan-300">
                <span className="animate-pulse">{processingStatus || 'Processando no Colab...'}</span>
                <Zap className="w-4 h-4 animate-bounce text-cyan-400" />
              </div>
              <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div className="w-full h-full bg-gradient-to-r from-cyan-500 via-indigo-500 to-cyan-400 animate-[progress_1.5s_ease-in-out_infinite]" />
              </div>
              <p className="text-[10px] text-slate-400 text-center pt-1">
                Isolando a silhueta com RMBG-1.4 e esculpindo geometria 360° na GPU T4
              </p>
            </div>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={!selectedImage || !isBackendConnected}
              className={`w-full py-3 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${
                selectedImage && isBackendConnected
                  ? 'bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white shadow-lg shadow-cyan-500/25 cursor-pointer'
                  : 'bg-slate-800 text-slate-500 border border-slate-700/50 cursor-not-allowed'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              <span>Gerar Modelo 3D no Colab T4</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
