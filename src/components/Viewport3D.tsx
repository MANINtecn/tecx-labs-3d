import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { ViewMode, LightingPreset } from '../types';

interface Viewport3DProps {
  current3DObject: THREE.Object3D | null;
  viewMode: ViewMode;
  lightingPreset: LightingPreset;
  autoRotate: boolean;
  onSceneReady?: (controls: OrbitControls) => void;
}

// Pre-alocação de variáveis matemáticas no escopo do módulo para prevenir Garbage Collection
const _tempVec3 = new THREE.Vector3();

export const Viewport3D: React.FC<Viewport3DProps> = ({
  current3DObject,
  viewMode,
  lightingPreset,
  autoRotate,
  onSceneReady,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const modelAnchorGroupRef = useRef<THREE.Group>(new THREE.Group());
  const lightsRef = useRef<{
    keyLight: THREE.DirectionalLight;
    fillLight: THREE.HemisphereLight;
    rimLight: THREE.PointLight;
  } | null>(null);

  // Armazenar materiais originais para restauração em modos wireframe/clay
  const originalMaterialsMapRef = useRef<Map<THREE.Mesh, THREE.Material | THREE.Material[]>>(new Map());

  // Inicialização estável do Canvas Three.js (Executa apenas uma vez no ciclo)
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    // 1. Cena com Fog atmosférico sintonizado com o fundo escuro do estúdio
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0b0d13);
    scene.fog = new THREE.FogExp2(0x0b0d13, 0.045);
    sceneRef.current = scene;

    // 2. Câmera Perspectiva
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 1.8, 4.6);
    cameraRef.current = camera;

    // 3. Renderer com PBR, ACESFilmic e sRGB
    const isHeadless = navigator.webdriver || /HeadlessChrome/i.test(navigator.userAgent);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(isHeadless ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.shadowMap.enabled = !isHeadless;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    rendererRef.current = renderer;

    container.appendChild(renderer.domElement);

    // 4. RoomEnvironment Procedural (PMREMGenerator)
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    // 5. Iluminação PBR de Estúdio com Contraste Quente/Frio
    const fillLight = new THREE.HemisphereLight(0x38bdf8, 0x0f172a, 0.9);
    scene.add(fillLight);

    const keyLight = new THREE.DirectionalLight(0xffedd5, 1.8);
    keyLight.position.set(3.5, 6, 4);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 2048;
    keyLight.shadow.mapSize.height = 2048;
    keyLight.shadow.bias = -0.0005;
    keyLight.shadow.normalBias = 0.02;
    keyLight.shadow.camera.near = 0.5;
    keyLight.shadow.camera.far = 18;
    keyLight.shadow.camera.left = -3;
    keyLight.shadow.camera.right = 3;
    keyLight.shadow.camera.top = 3;
    keyLight.shadow.camera.bottom = -3;
    scene.add(keyLight);

    const rimLight = new THREE.PointLight(0x06b6d4, 2.5, 12);
    rimLight.position.set(-3.5, 2.5, -3.5);
    scene.add(rimLight);

    lightsRef.current = { keyLight, fillLight, rimLight };

    // 6. Grupo Âncora para o Modelo 3D
    scene.add(modelAnchorGroupRef.current);

    // 7. Sombra de Contato Radial (Contact Shadow) no chão Y = 0.001
    const shadowCanvas = document.createElement('canvas');
    shadowCanvas.width = 256;
    shadowCanvas.height = 256;
    const sCtx = shadowCanvas.getContext('2d');
    if (sCtx) {
      const grad = sCtx.createRadialGradient(128, 128, 10, 128, 128, 120);
      grad.addColorStop(0, 'rgba(0, 0, 0, 0.7)');
      grad.addColorStop(0.5, 'rgba(0, 0, 0, 0.35)');
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      sCtx.fillStyle = grad;
      sCtx.fillRect(0, 0, 256, 256);
    }
    const shadowTex = new THREE.CanvasTexture(shadowCanvas);
    const shadowPlaneGeo = new THREE.PlaneGeometry(5.5, 5.5);
    const shadowPlaneMat = new THREE.MeshBasicMaterial({
      map: shadowTex,
      transparent: true,
      depthWrite: false,
      opacity: 0.65,
    });
    const contactShadow = new THREE.Mesh(shadowPlaneGeo, shadowPlaneMat);
    contactShadow.rotation.x = -Math.PI / 2;
    contactShadow.position.y = 0.002;
    scene.add(contactShadow);

    // 8. Grade de Estúdio Hexagonal / Polar CAD
    const gridHelper = new THREE.GridHelper(10, 24, 0x06b6d4, 0x1e293b);
    gridHelper.position.y = 0;
    scene.add(gridHelper);

    // 9. OrbitControls com Amortecimento Exponencial
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.maxPolarAngle = Math.PI / 2 - 0.01; // Não penetra sob o piso
    controls.minDistance = 0.8;
    controls.maxDistance = 14;
    controls.target.set(0, 0.8, 0);
    controls.update();
    controlsRef.current = controls;

    if (onSceneReady) {
      onSceneReady(controls);
    }

    // 10. Pré-aquecer shaders
    renderer.compile(scene, camera);

    // 11. Loop de Renderização a 60fps
    let animationFrameId: number;
    let lastTime = performance.now();

    const animate = (time: number) => {
      animationFrameId = requestAnimationFrame(animate);
      const dt = Math.min((time - lastTime) / 1000, 0.1);
      lastTime = time;

      if (controlsRef.current) {
        controlsRef.current.autoRotate = autoRotate;
        controlsRef.current.autoRotateSpeed = 1.2;
        controlsRef.current.update();
      }

      renderer.render(scene, camera);
    };

    animationFrameId = requestAnimationFrame(animate);

    // 12. Tratamento de redimensionamento de janela
    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  // Atualizar autoRotate dinamicamente
  useEffect(() => {
    if (controlsRef.current) {
      controlsRef.current.autoRotate = autoRotate;
    }
  }, [autoRotate]);

  // Atualizar Iluminação conforme o preset
  useEffect(() => {
    if (!lightsRef.current) return;
    const { keyLight, fillLight, rimLight } = lightsRef.current;

    switch (lightingPreset) {
      case 'cyberpunk':
        keyLight.color.setHex(0x06b6d4);
        keyLight.intensity = 2.0;
        fillLight.color.setHex(0xd946ef);
        fillLight.groundColor.setHex(0x0f172a);
        rimLight.color.setHex(0xec4899);
        rimLight.intensity = 3.5;
        break;
      case 'warm':
        keyLight.color.setHex(0xf59e0b);
        keyLight.intensity = 2.2;
        fillLight.color.setHex(0xfef08a);
        fillLight.groundColor.setHex(0x451a03);
        rimLight.color.setHex(0xd97706);
        rimLight.intensity = 2.0;
        break;
      case 'dramatic':
        keyLight.color.setHex(0xffffff);
        keyLight.intensity = 2.8;
        fillLight.color.setHex(0x334155);
        fillLight.groundColor.setHex(0x020617);
        rimLight.color.setHex(0x38bdf8);
        rimLight.intensity = 1.5;
        break;
      case 'studio':
      default:
        keyLight.color.setHex(0xffedd5);
        keyLight.intensity = 1.8;
        fillLight.color.setHex(0x38bdf8);
        fillLight.groundColor.setHex(0x0f172a);
        rimLight.color.setHex(0x06b6d4);
        rimLight.intensity = 2.2;
        break;
    }
  }, [lightingPreset]);

  // Substituir o modelo 3D ativo na cena
  useEffect(() => {
    const anchor = modelAnchorGroupRef.current;
    // Limpar modelo anterior e liberar buffers da GPU
    while (anchor.children.length > 0) {
      const oldChild = anchor.children[0];
      anchor.remove(oldChild);
      oldChild.traverse((node) => {
        if (node instanceof THREE.Mesh && node.geometry) {
          node.geometry.dispose();
        }
      });
    }
    originalMaterialsMapRef.current.clear();

    if (!current3DObject) return;

    // Clonar e registrar materiais originais, garantindo sanitização de geometria
    current3DObject.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = true;
        child.receiveShadow = true;
        if (child.geometry) {
          // Garantir normais e caixas delimitadoras calculadas sem NaN
          if (!child.geometry.getAttribute('normal')) {
            child.geometry.computeVertexNormals();
          }
          try {
            child.geometry.computeBoundingBox();
            child.geometry.computeBoundingSphere();
          } catch (e) {
            console.warn('[TECX LABS 3D] Falha ao calcular limites de malha:', e);
          }
        }
        originalMaterialsMapRef.current.set(child, child.material);
      }
    });

    anchor.add(current3DObject);

    // Ajustar foco da câmera no centro do modelo com fallback para prevenir NaN
    const bbox = new THREE.Box3().setFromObject(current3DObject);
    const center = bbox.getCenter(_tempVec3);
    const rawSize = bbox.getSize(new THREE.Vector3()).length();
    const size = Number.isFinite(rawSize) && rawSize > 0.05 ? rawSize : 1.5;

    if (controlsRef.current && cameraRef.current) {
      controlsRef.current.target.copy(center);
      cameraRef.current.position.set(
        Number.isFinite(center.x) ? center.x : 0,
        (Number.isFinite(center.y) ? center.y : 0) + size * 0.45,
        (Number.isFinite(center.z) ? center.z : 0) + size * 1.35
      );
      controlsRef.current.update();
    }
  }, [current3DObject]);

  // Alterar modo de visualização (Textured, Clay Shaded, Wireframe, X-Ray)
  useEffect(() => {
    const anchor = modelAnchorGroupRef.current;

    anchor.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        const origMat = originalMaterialsMapRef.current.get(child);

        if (viewMode === 'textured') {
          if (origMat) child.material = origMat;
        } else if (viewMode === 'shaded') {
          // Modo Studio Clay / MatCap Neutro
          child.material = new THREE.MeshStandardMaterial({
            color: 0x94a3b8,
            metalness: 0.2,
            roughness: 0.5,
            wireframe: false,
          });
        } else if (viewMode === 'wireframe') {
          // Topologia limpa com Wireframe destacado
          child.material = new THREE.MeshStandardMaterial({
            color: 0x06b6d4,
            wireframe: true,
            roughness: 0.3,
          });
        } else if (viewMode === 'xray') {
          // Raio-X volumétrico
          child.material = new THREE.MeshPhysicalMaterial({
            color: 0x38bdf8,
            transparent: true,
            opacity: 0.35,
            roughness: 0.1,
            metalness: 0.1,
            wireframe: false,
            depthWrite: false,
          });
        }
      }
    });
  }, [viewMode]);

  return (
    <div
      ref={mountRef}
      className="w-full h-full absolute inset-0 overflow-hidden cursor-grab active:cursor-grabbing select-none"
    />
  );
};
