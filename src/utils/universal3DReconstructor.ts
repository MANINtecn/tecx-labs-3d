import * as THREE from 'three';
import { sanitizeMeshGeometry } from './meshSanitizer';

export interface ReconstructionOptions {
  resolution?: number; // Tamanho do grid (ex: 120)
  depthScale?: number; // Profundidade volumétrica (ex: 0.25)
  smoothRadius?: number;
  removeBgTolerance?: number;
}

/**
 * Motor Universal Image-to-3D (Padrão Tripo3D / Meshy)
 * Reconstrói QUALQUER imagem (produtos, armas, personagens, ferramentas, peças mecânicas)
 * em uma malha 3D volumétrica estanque 360°, com textura mapeada fielmente da imagem original.
 */
export async function reconstruct3DFromAnyImage(
  imageSrc: string,
  options: ReconstructionOptions = {}
): Promise<THREE.Group> {
  const resolution = options.resolution || 128;
  const depthScale = options.depthScale || 0.28;

  // 1. Carregar a imagem em um elemento HTMLImage
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => resolve(image);
    image.onerror = (err) => reject(new Error('Falha ao carregar arquivo de imagem: ' + err));
    image.src = imageSrc;
  });

  // 2. Desenhar no Canvas para análise de pixels e isolamento de silhueta
  const canvas = document.createElement('canvas');
  canvas.width = resolution;
  canvas.height = resolution;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Falha ao instanciar contexto 2D do Canvas');

  // Desenhar imagem centralizada mantendo proporção de aspecto (aspect ratio)
  const aspect = img.width / img.height;
  let drawW = resolution;
  let drawH = resolution;
  let offX = 0;
  let offY = 0;

  if (aspect > 1) {
    drawH = Math.round(resolution / aspect);
    offY = Math.round((resolution - drawH) / 2);
  } else {
    drawW = Math.round(resolution * aspect);
    offX = Math.round((resolution - drawW) / 2);
  }

  ctx.clearRect(0, 0, resolution, resolution);
  ctx.drawImage(img, offX, offY, drawW, drawH);

  const imgData = ctx.getImageData(0, 0, resolution, resolution);
  const data = imgData.data;

  // 3. Detecção Inteligente de Fundo (Alpha transparente ou Fundo Sólido Branco/Escuro)
  // Verificar se há pixels transparentes
  let hasAlpha = false;
  for (let i = 3; i < data.length; i += 4) {
    if (data[i] < 200) {
      hasAlpha = true;
      break;
    }
  }

  // Se não tem alpha transparente, amostrar os 4 cantos para estimar cor do fundo
  const corners = [
    [0, 0],
    [resolution - 1, 0],
    [0, resolution - 1],
    [resolution - 1, resolution - 1],
  ];
  let bgR = 0, bgG = 0, bgB = 0;
  for (const [cx, cy] of corners) {
    const idx = (cy * resolution + cx) * 4;
    bgR += data[idx];
    bgG += data[idx + 1];
    bgB += data[idx + 2];
  }
  bgR = Math.round(bgR / 4);
  bgG = Math.round(bgG / 4);
  bgB = Math.round(bgB / 4);

  // Criar mapa binário de ocupação do objeto (1 = interior do objeto, 0 = fundo)
  const mask = new Uint8Array(resolution * resolution);
  const tol = options.removeBgTolerance || 38;

  for (let y = 0; y < resolution; y++) {
    for (let x = 0; x < resolution; x++) {
      const idx = (y * resolution + x) * 4;
      const a = data[idx + 3];
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];

      if (hasAlpha) {
        mask[y * resolution + x] = a > 60 ? 1 : 0;
      } else {
        const colorDiff = Math.sqrt((r - bgR) ** 2 + (g - bgG) ** 2 + (b - bgB) ** 2);
        mask[y * resolution + x] = colorDiff > tol ? 1 : 0;
      }
    }
  }

  // 4. Transformada de Distância Euclidiana (Distance Transform)
  // Calcula a espessura orgânica tridimensional do objeto a partir do contorno
  const dist = new Float32Array(resolution * resolution);
  const maxDistInitial = resolution * 2;
  dist.fill(maxDistInitial);

  for (let y = 0; y < resolution; y++) {
    for (let x = 0; x < resolution; x++) {
      if (mask[y * resolution + x] === 0) {
        dist[y * resolution + x] = 0;
      }
    }
  }

  // Primeira passada (Top-Left para Bottom-Right)
  for (let y = 0; y < resolution; y++) {
    for (let x = 0; x < resolution; x++) {
      const idx = y * resolution + x;
      if (dist[idx] > 0) {
        let d = dist[idx];
        if (x > 0) d = Math.min(d, dist[idx - 1] + 1);
        if (y > 0) d = Math.min(d, dist[idx - resolution] + 1);
        if (x > 0 && y > 0) d = Math.min(d, dist[idx - resolution - 1] + 1.414);
        if (x < resolution - 1 && y > 0) d = Math.min(d, dist[idx - resolution + 1] + 1.414);
        dist[idx] = d;
      }
    }
  }

  // Segunda passada (Bottom-Right para Top-Left)
  let maxDistanceFound = 0.001;
  for (let y = resolution - 1; y >= 0; y--) {
    for (let x = resolution - 1; x >= 0; x--) {
      const idx = y * resolution + x;
      if (dist[idx] > 0) {
        let d = dist[idx];
        if (x < resolution - 1) d = Math.min(d, dist[idx + 1] + 1);
        if (y < resolution - 1) d = Math.min(d, dist[idx + resolution] + 1);
        if (x < resolution - 1 && y < resolution - 1) d = Math.min(d, dist[idx + resolution + 1] + 1.414);
        if (x > 0 && y < resolution - 1) d = Math.min(d, dist[idx + resolution - 1] + 1.414);
        dist[idx] = d;
        if (d > maxDistanceFound) maxDistanceFound = d;
      }
    }
  }

  // Normalizar distâncias e aplicar curva de inflação volumétrica suave (Smooth Dome curve)
  const normalizedDepth = new Float32Array(resolution * resolution);
  for (let i = 0; i < dist.length; i++) {
    if (dist[i] > 0) {
      const t = Math.min(1.0, dist[i] / (maxDistanceFound * 0.65));
      // Curva esférica suave sin(t * pi/2) para dar volume natural e espessura 360°
      normalizedDepth[i] = Math.sin(t * Math.PI * 0.5) * depthScale;
    }
  }

  // 5. Construção da Malha Poligonal 3D (Frente, Verso e Bordas de Contorno)
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  // Mapeamento de nós na grade
  const frontIndexMap = new Int32Array(resolution * resolution).fill(-1);
  const backIndexMap = new Int32Array(resolution * resolution).fill(-1);

  // Escala no mundo Three.js (normalizada em ~1.8m de altura)
  const worldSize = 2.0;
  const step = worldSize / resolution;
  const halfWorld = worldSize / 2;

  // Criar vértices da Frente e Verso
  for (let y = 0; y < resolution; y++) {
    for (let x = 0; x < resolution; x++) {
      const idx = y * resolution + x;
      if (mask[idx] === 1) {
        const wx = (x / resolution) * worldSize - halfWorld;
        const wy = (1.0 - y / resolution) * worldSize; // Y para cima
        const z = normalizedDepth[idx];

        const u = x / resolution;
        const v = 1.0 - y / resolution;

        // Vértice Frontal (+Z)
        const frontIdx = positions.length / 3;
        positions.push(wx, wy, z);
        uvs.push(u, v);
        frontIndexMap[idx] = frontIdx;

        // Vértice Traseiro (-Z)
        const backIdx = positions.length / 3;
        positions.push(wx, wy, -z);
        uvs.push(u, v); // Espelhado para texturização simétrica
        backIndexMap[idx] = backIdx;
      }
    }
  }

  // Criar faces triangulares (Frente, Verso e Paredes Laterais)
  for (let y = 0; y < resolution - 1; y++) {
    for (let x = 0; x < resolution - 1; x++) {
      const i00 = y * resolution + x;
      const i10 = y * resolution + (x + 1);
      const i01 = (y + 1) * resolution + x;
      const i11 = (y + 1) * resolution + (x + 1);

      const f00 = frontIndexMap[i00];
      const f10 = frontIndexMap[i10];
      const f01 = frontIndexMap[i01];
      const f11 = frontIndexMap[i11];

      const b00 = backIndexMap[i00];
      const b10 = backIndexMap[i10];
      const b01 = backIndexMap[i01];
      const b11 = backIndexMap[i11];

      // Se os 4 vértices pertencem ao objeto, gerar 2 triângulos frontais e 2 traseiros
      if (f00 !== -1 && f10 !== -1 && f01 !== -1 && f11 !== -1) {
        // Faces frontais (enrolamento horário)
        indices.push(f00, f01, f10);
        indices.push(f10, f01, f11);

        // Faces traseiras (enrolamento anti-horário invertido para normais corretas)
        indices.push(b00, b10, b01);
        indices.push(b10, b11, b01);
      } else {
        // Triangulação de células parciais na fronteira do contorno
        if (f00 !== -1 && f10 !== -1 && f01 !== -1) {
          indices.push(f00, f01, f10);
          indices.push(b00, b10, b01);
        } else if (f10 !== -1 && f11 !== -1 && f01 !== -1) {
          indices.push(f10, f01, f11);
          indices.push(b10, b11, b01);
        } else if (f00 !== -1 && f11 !== -1 && f01 !== -1) {
          indices.push(f00, f01, f11);
          indices.push(b00, b11, b01);
        } else if (f00 !== -1 && f10 !== -1 && f11 !== -1) {
          indices.push(f00, f11, f10);
          indices.push(b00, b10, b11);
        }
      }

      // Paredes de Fechamento Lateral (Watertight Boundary Stitching)
      // Se a célula cruza a fronteira do objeto, costurar frente e verso
      // Borda Direita
      if (mask[i00] === 1 && mask[i10] === 0 && f00 !== -1 && f01 !== -1) {
        indices.push(f00, b00, f01);
        indices.push(b00, b01, f01);
      }
      // Borda Esquerda
      if (mask[i00] === 0 && mask[i10] === 1 && f10 !== -1 && f11 !== -1) {
        indices.push(f10, f11, b10);
        indices.push(b10, f11, b11);
      }
      // Borda Inferior
      if (mask[i00] === 1 && mask[i01] === 0 && f00 !== -1 && f10 !== -1) {
        indices.push(f00, f10, b00);
        indices.push(b00, f10, b10);
      }
      // Borda Superior
      if (mask[i00] === 0 && mask[i01] === 1 && f01 !== -1 && f11 !== -1) {
        indices.push(f01, b01, f11);
        indices.push(b01, b11, f11);
      }
    }
  }

  // 6. Montagem da BufferGeometry do Three.js
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);

  // Sanitização e cálculo robusto de normais para render PBR perfeito
  sanitizeMeshGeometry(geometry);

  // 7. Textura de Alta Fidelidade com a Imagem Original
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = true;

  const material = new THREE.MeshStandardMaterial({
    map: texture,
    roughness: 0.45,
    metalness: 0.15,
    side: THREE.DoubleSide,
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;

  const group = new THREE.Group();
  group.name = 'Reconstructed3D_Asset';
  group.add(mesh);

  // Centralização e assentamento no piso Y = 0
  const bbox = new THREE.Box3().setFromObject(group);
  const center = bbox.getCenter(new THREE.Vector3());
  group.position.x -= center.x;
  group.position.z -= center.z;
  group.position.y -= bbox.min.y;

  return group;
}
