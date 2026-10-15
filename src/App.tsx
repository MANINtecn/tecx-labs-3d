/**
 * TECX LABS 3D - Official Image-to-3D Application
 * TECX SoftHouse - AI & 3D Computer Graphics Division
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

import { ViewMode, PolyQuality, LightingPreset, MeshMetrics, PresetItem } from './types';
import { PRESET_ITEMS } from './utils/proceduralAssets';
import { generateMeshFromImage } from './utils/meshGenerators';
import { removeImageBackground } from './utils/backgroundRemoval';
import { exportToOBJ, exportToGLB, exportToFBX } from './utils/exporters';

import { Viewport3D } from './components/Viewport3D';
import { TopNavbar } from './components/TopNavbar';
import { BottomControlDock } from './components/BottomControlDock';
import { MetricsHud } from './components/MetricsHud';
import { UploadModal } from './components/UploadModal';
import { GalleryDrawer } from './components/GalleryDrawer';
import { PythonHubModal } from './components/PythonHubModal';
import { AIConceptModal } from './components/AIConceptModal';

import { UploadCloud } from 'lucide-react';

export default function App() {
  // Estado 3D Principal
  const [current3DObject, setCurrent3DObject] = useState<THREE.Object3D | null>(null);
  const [activeModelName, setActiveModelName] = useState<string>('Asas do Arcanjo (Mu Online)');
  const [activePresetId, setActivePresetId] = useState<string | undefined>('mu-wings');
  const [currentImageSource, setCurrentImageSource] = useState<string | null>(PRESET_ITEMS[0].imageUrl);

  // Modos de Visualização e Renderização
  const [viewMode, setViewMode] = useState<ViewMode>('textured');
  const [quality, setQuality] = useState<PolyQuality>('mid');
  const [lightingPreset, setLightingPreset] = useState<LightingPreset>('studio');
  const [autoRotate, setAutoRotate] = useState<boolean>(true);

  // Métricas do Modelo (calculadas em tempo real)
  const [metrics, setMetrics] = useState<MeshMetrics>({
    vertices: 0,
    triangles: 0,
    dimensions: { width: 0, height: 0, depth: 0 },
    volumeEstimate: 0,
    drawCalls: 1,
  });

  // Estado de Processamento e Feedback
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [processingStatus, setProcessingStatus] = useState<string>('');

  // Drag & Drop Global
  const [isWindowDragging, setIsWindowDragging] = useState<boolean>(false);

  // Conexão com Servidor Python Remoto / Local
  const [backendUrl, setBackendUrl] = useState<string>('http://localhost:8000');
  const [isBackendConnected, setIsBackendConnected] = useState<boolean>(false);

  // Modais
  const [isUploadOpen, setIsUploadOpen] = useState<boolean>(false);
  const [isGalleryOpen, setIsGalleryOpen] = useState<boolean>(false);
  const [isPythonHubOpen, setIsPythonHubOpen] = useState<boolean>(false);
  const [isAIConceptOpen, setIsAIConceptOpen] = useState<boolean>(false);

  // Referência para controles orbitais
  const controlsRef = useRef<OrbitControls | null>(null);

  // Testar conexão com backend Python silenciosamente
  const testBackendConnection = useCallback(async (): Promise<boolean> => {
    try {
      const res = await fetch(`${backendUrl}/api/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(2500),
      });
      if (res.ok) {
        setIsBackendConnected(true);
        return true;
      }
    } catch {
      setIsBackendConnected(false);
    }
    return false;
  }, [backendUrl]);

  useEffect(() => {
    testBackendConnection();
  }, [testBackendConnection]);

  // Função central para carregar e reconstruir imagem em 3D
  const load3DFromImage = useCallback(
    async (
      imageSrc: string,
      targetQuality: PolyQuality,
      applyBackgroundRemoval: boolean,
      depthFactor: number,
      name: string
    ) => {
      setIsProcessing(true);
      setProcessingStatus('Processando imagem e reconstruindo malha 3D...');

      try {
        let finalImageSrc = imageSrc;

        // Remoção real de fundo no cliente se solicitado
        if (applyBackgroundRemoval) {
          setProcessingStatus('Removendo fundo e isolando silhueta do asset...');
          finalImageSrc = await removeImageBackground(imageSrc);
        }

        // Se houver servidor Python neural conectado (com TripoSR / GPU remota)
        if (isBackendConnected) {
          try {
            setProcessingStatus('Enviando para backend Python GPU (TripoSR)...');
            const blob = await (await fetch(finalImageSrc)).blob();
            const formData = new FormData();
            formData.append('image', blob, 'input.png');
            formData.append('quality', targetQuality);
            formData.append('remove_background', 'false'); // já processado

            const response = await fetch(`${backendUrl}/api/generate-3d`, {
              method: 'POST',
              body: formData,
            });

            if (response.ok) {
              const resData = await response.json();
              if (resData.downloads?.glb) {
                const glbUrl = `${backendUrl}${resData.downloads.glb}`;
                const glbBuffer = await (await fetch(glbUrl)).arrayBuffer();

                const loader = new GLTFLoader();
                loader.parse(
                  glbBuffer,
                  '',
                  (gltf) => {
                    const model = gltf.scene;
                    setCurrent3DObject(model);
                    if (resData.metrics) {
                      setMetrics({
                        vertices: resData.metrics.vertices,
                        triangles: resData.metrics.triangles,
                        dimensions: {
                          width: resData.metrics.dimensions.width * 100,
                          height: resData.metrics.dimensions.height * 100,
                          depth: resData.metrics.dimensions.depth * 100,
                        },
                        volumeEstimate: Math.round(
                          resData.metrics.dimensions.width *
                            resData.metrics.dimensions.height *
                            resData.metrics.dimensions.depth *
                            1000000
                        ),
                        drawCalls: 1,
                      });
                    }
                    setActiveModelName(name);
                    setCurrentImageSource(finalImageSrc);
                    setIsProcessing(false);
                  },
                  (err) => {
                    console.warn('Falha no parse GLB, usando motor WebGL nativo:', err);
                  }
                );
                return;
              }
            }
          } catch (serverErr) {
            console.warn('Servidor Python indisponível no momento, usando motor WebGL local:', serverErr);
          }
        }

        // Motor WebGL nativo de precisão geométrica e volumétrica
        setProcessingStatus('Construindo malha estanque, UV mapping e normais...');
        const { mesh, metrics: calculatedMetrics } = await generateMeshFromImage(
          finalImageSrc,
          targetQuality,
          depthFactor
        );

        setCurrent3DObject(mesh);
        setMetrics(calculatedMetrics);
        setActiveModelName(name);
        setCurrentImageSource(finalImageSrc);
      } catch (error) {
        console.error('Erro na reconstrução 3D:', error);
      } finally {
        setIsProcessing(false);
        setProcessingStatus('');
      }
    },
    [backendUrl, isBackendConnected]
  );

  // Inicialização com primeiro preset sem dados simulados
  useEffect(() => {
    const initialPreset = PRESET_ITEMS[0];
    load3DFromImage(initialPreset.imageUrl, 'mid', false, 0.38, initialPreset.name);
  }, [load3DFromImage]);

  // Selecionar preset da galeria de referência
  const handleSelectPreset = (preset: PresetItem) => {
    setActivePresetId(preset.id);
    load3DFromImage(preset.imageUrl, quality, false, 0.38, preset.name);
  };

  // Processar imagem enviada pelo usuário
  const handleProcessImage = (
    imageSource: string,
    targetQuality: PolyQuality,
    removeBackground: boolean,
    depthFactor: number,
    name: string
  ) => {
    setActivePresetId(undefined);
    setQuality(targetQuality);
    load3DFromImage(imageSource, targetQuality, removeBackground, depthFactor, name);
  };

  // Alterar decimação da malha em tempo real
  const handleQualityChange = (newQuality: PolyQuality) => {
    if (newQuality === quality || isProcessing || !currentImageSource) return;
    setQuality(newQuality);
    load3DFromImage(currentImageSource, newQuality, false, 0.38, activeModelName);
  };

  // Resetar câmera e foco
  const handleResetCamera = () => {
    if (controlsRef.current) {
      controlsRef.current.reset();
      controlsRef.current.update();
    }
  };

  // Exportação 100% gratuita nos formatos .OBJ, .GLB e .FBX
  const handleExport = (format: 'obj' | 'glb' | 'fbx') => {
    if (!current3DObject) return;
    const sanitizedName = activeModelName.toLowerCase().replace(/[^a-z0-9]/g, '_');

    if (format === 'obj') {
      exportToOBJ(current3DObject, `${sanitizedName}.obj`);
    } else if (format === 'glb') {
      exportToGLB(current3DObject, `${sanitizedName}.glb`);
    } else if (format === 'fbx') {
      exportToFBX(current3DObject, `${sanitizedName}.fbx`);
    }
  };

  // Drag & drop global
  const handleWindowDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsWindowDragging(true);
  };

  const handleWindowDragLeave = (e: React.DragEvent) => {
    if (e.relatedTarget === null) {
      setIsWindowDragging(false);
    }
  };

  const handleWindowDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsWindowDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (ev) => {
          const result = ev.target?.result as string;
          handleProcessImage(
            result,
            quality,
            true,
            0.38,
            file.name.replace(/\.[^/.]+$/, '')
          );
        };
        reader.readAsDataURL(file);
      }
    }
  };

  return (
    <div
      onDragOver={handleWindowDragOver}
      onDragLeave={handleWindowDragLeave}
      onDrop={handleWindowDrop}
      className="relative w-screen h-screen bg-[#0b0d13] overflow-hidden select-none"
    >
      {/* 1. Navbar Superior */}
      <TopNavbar
        onOpenUpload={() => setIsUploadOpen(true)}
        onOpenGallery={() => setIsGalleryOpen(true)}
        onOpenAIConcept={() => setIsAIConceptOpen(true)}
        onOpenPythonHub={() => setIsPythonHubOpen(true)}
        isBackendConnected={isBackendConnected}
      />

      {/* 2. HUD de Telemetria e Estatísticas Poligonais Reais */}
      {metrics.triangles > 0 && (
        <MetricsHud
          metrics={metrics}
          quality={quality}
          modelName={activeModelName}
        />
      )}

      {/* 3. Viewport 3D Principal (Three.js WebGL) */}
      <Viewport3D
        current3DObject={current3DObject}
        viewMode={viewMode}
        lightingPreset={lightingPreset}
        autoRotate={autoRotate}
        onSceneReady={(controls) => {
          controlsRef.current = controls;
        }}
      />

      {/* 4. Dock Inferior Compacto e Retrátil */}
      <BottomControlDock
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        quality={quality}
        onQualityChange={handleQualityChange}
        lightingPreset={lightingPreset}
        onLightingPresetChange={setLightingPreset}
        autoRotate={autoRotate}
        onToggleAutoRotate={() => setAutoRotate(!autoRotate)}
        onResetCamera={handleResetCamera}
        onExport={handleExport}
        isProcessing={isProcessing}
      />

      {/* Overlay de Arraste Global (Drag & Drop) */}
      {isWindowDragging && (
        <div className="absolute inset-0 z-50 bg-cyan-950/75 border-4 border-dashed border-cyan-400 flex flex-col items-center justify-center pointer-events-none">
          <UploadCloud className="w-16 h-16 text-cyan-300 animate-bounce" />
          <h2 className="text-xl font-extrabold text-white mt-4 font-['Chakra_Petch',sans-serif]">
            SOLTE SUA IMAGEM 2D AQUI
          </h2>
          <p className="text-xs text-cyan-200 mt-1 font-mono">
            Processamento de silhueta e reconstrução 3D imediata.
          </p>
        </div>
      )}

      {/* Indicador de Processamento em Andamento */}
      {isProcessing && (
        <div className="absolute top-20 right-4 z-40 bg-[#0f172a] border border-cyan-500/50 rounded-xl px-4 py-2.5 shadow-2xl flex items-center gap-3">
          <div className="w-4 h-4 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin shrink-0" />
          <div className="text-xs font-mono text-cyan-300">
            {processingStatus || 'Processando malha 3D...'}
          </div>
        </div>
      )}

      {/* 5. Modais de Suporte */}
      <UploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onProcessImage={handleProcessImage}
        isProcessing={isProcessing}
      />

      <GalleryDrawer
        isOpen={isGalleryOpen}
        onClose={() => setIsGalleryOpen(false)}
        onSelectPreset={handleSelectPreset}
        activePresetId={activePresetId}
      />

      <PythonHubModal
        isOpen={isPythonHubOpen}
        onClose={() => setIsPythonHubOpen(false)}
        backendUrl={backendUrl}
        onUpdateBackendUrl={setBackendUrl}
        isBackendConnected={isBackendConnected}
        onTestConnection={testBackendConnection}
      />

      <AIConceptModal
        isOpen={isAIConceptOpen}
        onClose={() => setIsAIConceptOpen(false)}
        onGenerateFromConcept={(imgUrl, name, targetQ) => {
          handleProcessImage(imgUrl, targetQ, true, 0.42, name);
        }}
        isProcessing={isProcessing}
      />
    </div>
  );
}
