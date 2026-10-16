import * as THREE from 'three';
import { sanitizeMeshGeometry } from './meshSanitizer';

export interface HardSurfaceModelParams {
  assetType?: 'pickaxe' | 'axe' | 'sword' | 'hammer' | 'shield' | 'tool' | 'weapon';
  handleColor?: string;
  headColor?: string;
  metalRoughness?: number;
  metalness?: number;
  woodRoughness?: number;
  scale?: number;
}

/**
 * Cria texturas procedurais PBR em canvas para madeira e metal escovado
 */
function createWoodTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#6b4226';
    ctx.fillRect(0, 0, 512, 512);

    // Linhas sutis de veio de madeira
    for (let i = 0; i < 40; i++) {
      const y = Math.random() * 512;
      const alpha = 0.08 + Math.random() * 0.12;
      ctx.strokeStyle = Math.random() > 0.5 ? `rgba(50, 25, 10, ${alpha})` : `rgba(130, 85, 45, ${alpha})`;
      ctx.lineWidth = 2 + Math.random() * 4;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.bezierCurveTo(170, y + (Math.random() - 0.5) * 15, 340, y + (Math.random() - 0.5) * 15, 512, y);
      ctx.stroke();
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

function createBrushedMetalTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#475569';
    ctx.fillRect(0, 0, 512, 512);

    for (let i = 0; i < 60; i++) {
      const x = Math.random() * 512;
      const alpha = 0.05 + Math.random() * 0.1;
      ctx.strokeStyle = Math.random() > 0.5 ? `rgba(255, 255, 255, ${alpha})` : `rgba(15, 23, 42, ${alpha})`;
      ctx.lineWidth = 1 + Math.random() * 2;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + (Math.random() - 0.5) * 6, 512);
      ctx.stroke();
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

/**
 * Construtor de Picareta Hard-Surface Estilo Blender (Game-Ready)
 * Geometria limpa e estruturada: Cabo de madeira torneado + Colar de ferro forjado + Cabeça curva com bico perfurante e cinzel.
 */
export function buildBlenderStylePickaxe(params: HardSurfaceModelParams = {}): THREE.Group {
  const group = new THREE.Group();
  group.name = 'BlenderPickaxe_Asset';

  const woodTexture = createWoodTexture();
  const metalTexture = createBrushedMetalTexture();

  // 1. Materiais PBR profissionais
  const woodMaterial = new THREE.MeshStandardMaterial({
    color: new THREE.Color(params.handleColor || '#854d0e'),
    map: woodTexture,
    roughness: params.woodRoughness ?? 0.65,
    metalness: 0.05,
    side: THREE.DoubleSide,
  });

  const ironMaterial = new THREE.MeshStandardMaterial({
    color: new THREE.Color(params.headColor || '#64748b'),
    map: metalTexture,
    roughness: params.metalRoughness ?? 0.35,
    metalness: params.metalness ?? 0.85,
    side: THREE.DoubleSide,
  });

  const darkIronMaterial = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#334155'),
    roughness: 0.45,
    metalness: 0.9,
    side: THREE.DoubleSide,
  });

  // 2. Cabo de Madeira Ergonômico (Shaft)
  // Criado com perfil chanfrado suave (low-poly facetado limpo)
  const handlePoints: THREE.Vector2[] = [
    new THREE.Vector2(0.045, 0.0),    // Pommel base
    new THREE.Vector2(0.065, 0.03),   // Pommel flare
    new THREE.Vector2(0.042, 0.08),   // Pommel tuck
    new THREE.Vector2(0.038, 0.5),    // Main shaft grip
    new THREE.Vector2(0.042, 1.1),    // Upper shaft
    new THREE.Vector2(0.048, 1.45),   // Neck flare below head
    new THREE.Vector2(0.044, 1.62),   // Socket tip
    new THREE.Vector2(0.0, 1.62),     // Top cap
  ];

  const handleGeo = new THREE.LatheGeometry(handlePoints, 12);
  sanitizeMeshGeometry(handleGeo);
  const handleMesh = new THREE.Mesh(handleGeo, woodMaterial);
  handleMesh.castShadow = true;
  handleMesh.receiveShadow = true;
  group.add(handleMesh);

  // 3. Empunhadura de Couro / Anéis de Fixação (Grip straps)
  const ringGeo = new THREE.CylinderGeometry(0.043, 0.043, 0.02, 12);
  sanitizeMeshGeometry(ringGeo);
  const ringMesh1 = new THREE.Mesh(ringGeo, darkIronMaterial);
  ringMesh1.position.y = 0.25;
  ringMesh1.castShadow = true;
  group.add(ringMesh1);

  const ringMesh2 = ringMesh1.clone();
  ringMesh2.position.y = 0.45;
  group.add(ringMesh2);

  // 4. Colar de Fixação da Cabeça (Socket collar em ferro fundido)
  const collarGeo = new THREE.CylinderGeometry(0.065, 0.06, 0.16, 8);
  sanitizeMeshGeometry(collarGeo);
  const collarMesh = new THREE.Mesh(collarGeo, darkIronMaterial);
  collarMesh.position.y = 1.42;
  collarMesh.castShadow = true;
  group.add(collarMesh);

  // 5. Cabeça da Picareta (Pick Head com curvatura aerodinâmica e chanfros)
  // Criada através de extrusão de perfil hexagonal ao longo de uma curva 3D suave
  const headCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.68, 1.34, 0.0), // Ponta esquerda (bico afiado)
    new THREE.Vector3(-0.45, 1.44, 0.0), // Curvatura esquerda
    new THREE.Vector3(-0.15, 1.49, 0.0), // Ombro esquerdo
    new THREE.Vector3(0.0, 1.5, 0.0),    // Centro do colar
    new THREE.Vector3(0.18, 1.49, 0.0),  // Ombro direito
    new THREE.Vector3(0.46, 1.42, 0.0),  // Curvatura direita
    new THREE.Vector3(0.65, 1.35, 0.0),  // Ponta direita (cinzel)
  ]);

  // Perfil transversal hexagonal de ferramentas manuais
  const profileShape = new THREE.Shape();
  const pw = 0.04;
  const ph = 0.05;
  profileShape.moveTo(-pw, 0);
  profileShape.lineTo(-pw * 0.6, ph);
  profileShape.lineTo(pw * 0.6, ph);
  profileShape.lineTo(pw, 0);
  profileShape.lineTo(pw * 0.6, -ph);
  profileShape.lineTo(-pw * 0.6, -ph);
  profileShape.closePath();

  const headExtrudeSettings: THREE.ExtrudeGeometryOptions = {
    steps: 24,
    bevelEnabled: false,
    extrudePath: headCurve,
  };

  const headGeo = new THREE.ExtrudeGeometry(profileShape, headExtrudeSettings);
  sanitizeMeshGeometry(headGeo);
  const headMesh = new THREE.Mesh(headGeo, ironMaterial);
  headMesh.castShadow = true;
  headMesh.receiveShadow = true;
  group.add(headMesh);

  // 6. Ponta Esquerda Afiada (Spike Pick Tip)
  const spikeGeo = new THREE.ConeGeometry(0.038, 0.16, 6);
  spikeGeo.rotateZ(Math.PI / 2 + 0.32);
  sanitizeMeshGeometry(spikeGeo);
  const spikeMesh = new THREE.Mesh(spikeGeo, ironMaterial);
  spikeMesh.position.set(-0.73, 1.31, 0);
  spikeMesh.castShadow = true;
  group.add(spikeMesh);

  // 7. Ponta Direita Chanfrada (Chisel / Wedge Tip)
  const chiselGeo = new THREE.BoxGeometry(0.12, 0.02, 0.07);
  chiselGeo.rotateZ(-0.35);
  sanitizeMeshGeometry(chiselGeo);
  const chiselMesh = new THREE.Mesh(chiselGeo, ironMaterial);
  chiselMesh.position.set(0.69, 1.32, 0);
  chiselMesh.castShadow = true;
  group.add(chiselMesh);

  // 8. Rebites e Parafusos de Travamento
  const rivetGeo = new THREE.SphereGeometry(0.016, 6, 6);
  sanitizeMeshGeometry(rivetGeo);
  const rivet1 = new THREE.Mesh(rivetGeo, darkIronMaterial);
  rivet1.position.set(0, 1.42, 0.068);
  group.add(rivet1);

  const rivet2 = rivet1.clone();
  rivet2.position.set(0, 1.42, -0.068);
  group.add(rivet2);

  // Centralização e assentamento
  const bbox = new THREE.Box3().setFromObject(group);
  const center = bbox.getCenter(new THREE.Vector3());
  group.position.x -= center.x;
  group.position.z -= center.z;
  group.position.y -= bbox.min.y;

  return group;
}

/**
 * Construtor Genérico de Assets Hard-Surface baseado na análise de imagem
 */
export function buildHardSurfaceAsset(
  detectedType: string = 'pickaxe',
  params: HardSurfaceModelParams = {}
): THREE.Group {
  const typeLower = detectedType.toLowerCase();

  // Atualmente otimizado para pickaxe/ferramentas de mineração e armas brancas
  if (typeLower.includes('pick') || typeLower.includes('picareta') || typeLower.includes('tool')) {
    return buildBlenderStylePickaxe(params);
  }

  // Fallback padrão de alta fidelidade
  return buildBlenderStylePickaxe(params);
}
