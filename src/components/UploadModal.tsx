import React, { useState, useRef } from 'react';
import {
  Upload,
  X,
  Scissors,
  Layers,
  CheckCircle,
  Sparkles,
  Zap,
  Info,
  Shield,
  Crosshair,
  User,
  Truck,
  Feather,
  RefreshCw,
} from 'lucide-react';
import { PolyQuality, AssetCategory, AIScanResult } from '../types';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProcessImage: (
    imageSource: string,
    quality: PolyQuality,
    removeBackground: boolean,
    name: string,
    assetCategory?: AssetCategory,
    customThreshold?: number
  ) => void;
  onGenerateBlenderAsset?: (
    name: string,
    assetCategory?: AssetCategory,
    imageSource?: string | null
  ) => void;
  isProcessing: boolean;
}

export const UploadModal: React.FC<UploadModalProps> = ({
  isOpen,
  onClose,
  onProcessImage,
  onGenerateBlenderAsset,
  isProcessing,
}) => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imageName, setImageName] = useState<string>('Objeto Customizado 3D');
  const [engineMode, setEngineMode] = useState<'blender' | 'triposr'>('blender');
  const [removeBackground, setRemoveBackground] = useState<boolean>(true);
  const [quality, setQuality] = useState<PolyQuality>('high_fidelity');
  const [assetCategory, setAssetCategory] = useState<AssetCategory>('weapon_tool');
  const [customThreshold, setCustomThreshold] = useState<number>(0.16);
  const [dragActive, setDragActive] = useState<boolean>(false);

  // Estados de IA para Escaneamento e Otimização
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [scanResult, setScanResult] = useState<AIScanResult | null>(null);
  const [isEnhancing, setIsEnhancing] = useState<boolean>(false);
  const [enhanceSuccess, setEnhanceSuccess] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Por favor, selecione um arquivo de imagem válido (PNG, JPG, WEBP).');
      return;
    }
    const cleanName = file.name.replace(/\.[^/.]+$/, '');
    setImageName(cleanName);
    setScanResult(null);
    setEnhanceSuccess(false);

    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result as string;
      setSelectedImage(base64);
    };
    reader.readAsDataURL(file);
  };

  // Escanear e Identificar o Asset com IA
  const autoScanWithAI = async (base64Img: string, fallbackName?: string) => {
    setIsScanning(true);
    try {
      const res = await fetch('/api/ai/scan-asset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: base64Img }),
      });
      const data = await res.json();
      if (data.success && data.scan) {
        setScanResult(data.scan);
        if (data.scan.assetName) {
          setImageName(data.scan.assetName);
        }
        if (data.scan.category) {
          setAssetCategory(data.scan.category);
        }
        if (data.scan.suggestedThreshold) {
          setCustomThreshold(Number(data.scan.suggestedThreshold));
        }
        if (data.scan.recommendedQuality) {
          setQuality(data.scan.recommendedQuality);
        }
      }
    } catch (err) {
      console.warn('Escaneamento IA offline ou indisponível:', err);
    } finally {
      setIsScanning(false);
    }
  };

  // Otimizar e Isolar o Asset em Estúdio 3D com IA
  const handleEnhanceWithAI = async () => {
    if (!selectedImage) return;
    setIsEnhancing(true);
    try {
      const res = await fetch('/api/ai/enhance-asset-photo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: selectedImage,
          assetName: imageName,
        }),
      });
      const data = await res.json();
      if (data.success && data.imageUrl) {
        setSelectedImage(data.imageUrl);
        setEnhanceSuccess(true);
      } else {
        alert(data.error || 'Não foi possível otimizar a imagem com IA.');
      }
    } catch (err: any) {
      alert('Erro ao otimizar foto: ' + (err.message || 'Erro inesperado'));
    } finally {
      setIsEnhancing(false);
    }
  };

  const handleCategoryChange = (cat: AssetCategory) => {
    setAssetCategory(cat);
    const presetMap: Record<AssetCategory, number> = {
      weapon_tool: 0.16,
      wings: 0.15,
      armor: 0.20,
      vehicle: 0.22,
      character: 0.25,
    };
    setCustomThreshold(presetMap[cat]);
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
    if (engineMode === 'blender' && onGenerateBlenderAsset) {
      onGenerateBlenderAsset(imageName, assetCategory, selectedImage);
    } else {
      onProcessImage(
        selectedImage,
        quality,
        removeBackground,
        imageName,
        assetCategory,
        customThreshold
      );
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm select-none">
      <div className="bg-[#0b0f19] border border-cyan-800/40 rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-[#0f172a]">
          <div className="flex items-center gap-2">
            <Upload className="w-5 h-5 text-cyan-400" />
            <h3 className="font-bold text-slate-100 text-sm tracking-wide font-['Chakra_Petch',sans-serif]">
              SCANNER NEURAL 3D DE IMAGEM & RECONSTRUÇÃO
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
            className={`border-2 border-dashed rounded-xl p-5 text-center transition-all cursor-pointer flex flex-col items-center justify-center min-h-[170px] relative overflow-hidden ${
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
              <div className="flex flex-col sm:flex-row items-center gap-4 w-full justify-center">
                <div className="w-28 h-28 rounded-lg overflow-hidden border border-cyan-500/40 bg-slate-950 flex items-center justify-center p-1 relative shadow-inner shrink-0">
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
                <div className="text-left flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-mono text-cyan-300 font-bold truncate">{imageName}</p>
                    {enhanceSuccess && (
                      <span className="text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-500/50 px-1.5 py-0.2 rounded font-mono">
                        IA Estúdio Ativo
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Imagem carregada e calibrada para extração volumétrica.
                  </p>
                  <p className="text-[10px] text-slate-500 mt-1 font-mono">
                    Clique para trocar de imagem
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2.5 text-slate-400">
                <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center text-cyan-400">
                  <Upload className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-200">
                    Arraste ou selecione a foto do asset
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Picaretas, espadas, asas, armas, personagens, armaduras, carros
                  </p>
                </div>
                <span className="text-[11px] font-mono text-cyan-400 bg-cyan-950/40 px-2.5 py-1 rounded-full border border-cyan-800/40">
                  Suporta PNG, JPG, WEBP
                </span>
              </div>
            )}
          </div>

          {/* Banner de Diagnóstico IA */}
          {selectedImage && (
            <div className="bg-[#0f172a] rounded-xl p-3 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-fuchsia-400" />
                  <span className="text-xs font-bold text-slate-200 font-['Chakra_Petch',sans-serif]">
                    SCANNER IA & DIAGNÓSTICO DO ASSET
                  </span>
                </div>
                <button
                  type="button"
                  disabled={isScanning || isEnhancing}
                  onClick={(e) => {
                    e.stopPropagation();
                    autoScanWithAI(selectedImage);
                  }}
                  className="text-[10px] text-cyan-400 hover:text-cyan-300 font-mono flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className={`w-3 h-3 ${isScanning ? 'animate-spin' : ''}`} />
                  <span>{isScanning ? 'Escaneando...' : 'Re-escanear'}</span>
                </button>
              </div>

              {scanResult ? (
                <div className="bg-[#090b10] rounded-lg p-2.5 border border-cyan-900/30 text-xs space-y-1.5 font-sans">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-cyan-300">{scanResult.assetName}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded font-mono bg-indigo-950 text-indigo-300 border border-indigo-500/40">
                      Limiar IA: {customThreshold}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300 leading-snug">
                    {scanResult.diagnosis}
                  </p>
                  {scanResult.isThinGeometry && (
                    <div className="flex items-center gap-1 text-[11px] text-amber-300 bg-amber-950/40 p-1.5 rounded border border-amber-500/30 font-mono">
                      <Zap className="w-3.5 h-3.5 shrink-0 text-amber-400" />
                      <span>
                        Geometria delgada detectada: Limiar reduzido para {customThreshold} para preservar cabos/hastes sem romper a malha.
                      </span>
                    </div>
                  )}
                </div>
              ) : isScanning ? (
                <div className="text-center py-2 text-xs text-slate-400 font-mono flex items-center justify-center gap-2">
                  <div className="w-3 h-3 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                  <span>Identificando silhueta e calibrando geometria com Gemini Vision...</span>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <p className="text-[11px] text-slate-400">
                    Imagem pronta para reconstrução 3D imediata.
                  </p>
                  <button
                    type="button"
                    onClick={() => selectedImage && autoScanWithAI(selectedImage, imageName)}
                    className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 text-[10px] font-mono border border-slate-700 transition-colors cursor-pointer"
                  >
                    Identificar com IA (Opcional)
                  </button>
                </div>
              )}

              {/* Botão de Otimização Estúdio com IA */}
              <div className="pt-1 flex items-center justify-between">
                <span className="text-[11px] text-slate-400">
                  Foto com fundo confuso ou sombras?
                </span>
                <button
                  type="button"
                  disabled={isEnhancing}
                  onClick={handleEnhanceWithAI}
                  className="px-2.5 py-1 rounded-lg bg-fuchsia-950/50 hover:bg-fuchsia-900/60 text-fuchsia-300 border border-fuchsia-500/40 text-[11px] font-mono flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Sparkles className={`w-3 h-3 text-fuchsia-400 ${isEnhancing ? 'animate-spin' : ''}`} />
                  <span>{isEnhancing ? 'Isolando com IA...' : '✨ Limpar & Isolar Asset com IA'}</span>
                </button>
              </div>
            </div>
          )}

          {/* Seletor de Motor 3D (Tripo3D Universal vs TripoSR Neural) */}
          <div className="bg-[#0f172a] rounded-xl p-3.5 border border-slate-800 space-y-2">
            <div className="text-xs text-slate-300 font-semibold flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-cyan-400" />
                <span>Motor de Geração 3D:</span>
              </span>
              <span className="text-[10px] font-mono text-emerald-400">
                {engineMode === 'blender' ? 'Qualquer Item / Produto / Peça (Tripo3D)' : 'Neural Marching Cubes (Colab)'}
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setEngineMode('blender')}
                className={`p-3 rounded-lg text-left border transition-all cursor-pointer ${
                  engineMode === 'blender'
                    ? 'bg-emerald-950/40 border-emerald-500/80 text-emerald-300 ring-1 ring-emerald-500/50'
                    : 'bg-slate-900/50 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className="text-xs font-bold text-white flex items-center justify-between">
                  <span>Tripo3D Universal</span>
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded font-mono font-normal">Recomendado</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1 leading-snug">
                  Reconstrói <strong>qualquer</strong> foto (produto, arma, peça, calçado, personagem) em 3D volumétrico 360° com textura original da foto e zero deformação.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setEngineMode('triposr')}
                className={`p-3 rounded-lg text-left border transition-all cursor-pointer ${
                  engineMode === 'triposr'
                    ? 'bg-cyan-950/40 border-cyan-500/80 text-cyan-300 ring-1 ring-cyan-500/50'
                    : 'bg-slate-900/50 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className="text-xs font-bold text-white flex items-center justify-between">
                  <span>TripoSR Neural (GPU Colab)</span>
                  <span className="text-[10px] bg-cyan-500/20 text-cyan-300 px-1.5 py-0.5 rounded font-mono font-normal">Colab T4</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1 leading-snug">
                  Reconstrução volumétrica via tensores NeRF. Requer notebook Google Colab conectado.
                </p>
              </button>
            </div>
          </div>

          {/* Seletor de Categoria de Asset (Ajusta Limiar do Marching Cubes) */}
          <div className="bg-[#0f172a] rounded-xl p-3.5 border border-slate-800 space-y-3">
            <div>
              <div className="text-xs text-slate-300 font-semibold mb-1.5 flex items-center justify-between">
                <span>Tipo de Asset (Calibração de Reconstrução):</span>
                <span className="text-[10px] font-mono text-cyan-400">
                  Limiar: {customThreshold}
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
                <button
                  type="button"
                  onClick={() => handleCategoryChange('weapon_tool')}
                  className={`p-2 rounded-lg text-xs font-mono border text-center transition-all cursor-pointer flex flex-col items-center gap-1 ${
                    assetCategory === 'weapon_tool'
                      ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/80 font-bold'
                      : 'border-slate-800 bg-slate-900/50 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Crosshair className="w-3.5 h-3.5" />
                  <span className="text-[11px]">Picareta/Arma</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleCategoryChange('wings')}
                  className={`p-2 rounded-lg text-xs font-mono border text-center transition-all cursor-pointer flex flex-col items-center gap-1 ${
                    assetCategory === 'wings'
                      ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/80 font-bold'
                      : 'border-slate-800 bg-slate-900/50 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Feather className="w-3.5 h-3.5" />
                  <span className="text-[11px]">Asas/Finos</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleCategoryChange('armor')}
                  className={`p-2 rounded-lg text-xs font-mono border text-center transition-all cursor-pointer flex flex-col items-center gap-1 ${
                    assetCategory === 'armor'
                      ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/80 font-bold'
                      : 'border-slate-800 bg-slate-900/50 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Shield className="w-3.5 h-3.5" />
                  <span className="text-[11px]">Armadura</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleCategoryChange('character')}
                  className={`p-2 rounded-lg text-xs font-mono border text-center transition-all cursor-pointer flex flex-col items-center gap-1 ${
                    assetCategory === 'character'
                      ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/80 font-bold'
                      : 'border-slate-800 bg-slate-900/50 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <User className="w-3.5 h-3.5" />
                  <span className="text-[11px]">Personagem</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleCategoryChange('vehicle')}
                  className={`p-2 rounded-lg text-xs font-mono border text-center transition-all cursor-pointer flex flex-col items-center gap-1 ${
                    assetCategory === 'vehicle'
                      ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/80 font-bold'
                      : 'border-slate-800 bg-slate-900/50 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Truck className="w-3.5 h-3.5" />
                  <span className="text-[11px]">Veículo</span>
                </button>
              </div>
            </div>

            {/* Slider de Ajuste Fino do Threshold (0.05 a 0.50) para Bordas Nítidas */}
            <div className="pt-2 border-t border-slate-800/80 space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300 font-semibold flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Ajuste Fino de Threshold (Sharp Edges):</span>
                </span>
                <span className="font-mono text-cyan-300 font-bold bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800/50">
                  {customThreshold.toFixed(2)}
                </span>
              </div>
              <input
                type="range"
                min="0.05"
                max="0.50"
                step="0.01"
                value={customThreshold}
                onChange={(e) => setCustomThreshold(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
              />
              <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                <span>0.05 (Ultrafino)</span>
                <span className="text-cyan-400 font-bold">0.16 (Ferramentas/Armas)</span>
                <span>0.25 (Padrão)</span>
                <span>0.50 (Maciço)</span>
              </div>
              <p className="text-[10px] text-slate-400 leading-tight">
                💡 Controla a iso-superfície: valores entre 0.12 e 0.18 produzem bordas nítidas em picaretas e armas sem inflar (bloat) ou achatar a geometria.
              </p>
            </div>

            {/* Remoção de Fundo */}
            <div className="flex items-center justify-between pt-1 border-t border-slate-800/80">
              <div className="flex items-center gap-2">
                <Scissors className="w-4 h-4 text-cyan-400" />
                <div>
                  <span className="text-xs font-medium text-slate-200 block">
                    Remoção Automática de Fundo (rembg)
                  </span>
                  <span className="text-[10px] text-slate-400">
                    Isola a silhueta para garantir volume 360° estanque
                  </span>
                </div>
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

            {/* Seletor de Densidade de Polígonos */}
            <div className="pt-1 border-t border-slate-800/80">
              <div className="text-xs text-slate-400 mb-1.5 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Modo de Reconstrução TripoSR:</span>
                </span>
                <span className="text-[10px] text-purple-300 font-mono">
                  {quality === 'high_fidelity' ? 'Res 512 + Decimação Trimesh' : ''}
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button
                  type="button"
                  onClick={() => setQuality('low')}
                  className={`py-2 px-2 rounded-lg text-xs font-mono border transition-colors cursor-pointer text-center ${
                    quality === 'low'
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/60 font-bold'
                      : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <div className="font-bold">Low-Poly</div>
                  <div className="text-[10px] opacity-75">Res 128 (~3k)</div>
                </button>
                <button
                  type="button"
                  onClick={() => setQuality('mid')}
                  className={`py-2 px-2 rounded-lg text-xs font-mono border transition-colors cursor-pointer text-center ${
                    quality === 'mid'
                      ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/60 font-bold'
                      : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <div className="font-bold">Mid-Poly</div>
                  <div className="text-[10px] opacity-75">Res 256 (~25k)</div>
                </button>
                <button
                  type="button"
                  onClick={() => setQuality('high')}
                  className={`py-2 px-2 rounded-lg text-xs font-mono border transition-colors cursor-pointer text-center ${
                    quality === 'high'
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/60 font-bold'
                      : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <div className="font-bold">High-Poly</div>
                  <div className="text-[10px] opacity-75">Res 320 (~85k)</div>
                </button>
                <button
                  type="button"
                  onClick={() => setQuality('high_fidelity')}
                  className={`py-2 px-2 rounded-lg text-xs font-mono border transition-colors cursor-pointer text-center ${
                    quality === 'high_fidelity'
                      ? 'bg-purple-500/25 text-purple-300 border-purple-500/70 font-bold shadow-lg shadow-purple-500/10'
                      : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <div className="font-bold text-purple-300">High-Fidelity</div>
                  <div className="text-[10px] opacity-80 text-purple-200/90">Res 512 + Decim</div>
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
            className={`px-5 py-2.5 rounded-xl text-white text-xs font-bold shadow-lg disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer flex items-center gap-2 ${
              engineMode === 'blender'
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-emerald-600/20 border border-emerald-400/40'
                : 'bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 shadow-cyan-600/20 border border-cyan-400/40'
            }`}
          >
            <CheckCircle className="w-4 h-4" />
            <span>
              {engineMode === 'blender'
                ? 'Gerar Modelo 3D Real (Padrão Tripo3D)'
                : 'Gerar com TripoSR (GPU Colab)'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
