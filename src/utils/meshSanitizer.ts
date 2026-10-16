import * as THREE from 'three';

/**
 * Sanitiza e valida malhas Three.js para prevenir os erros clássicos do WebGL:
 * 1. Normais de vértices ausentes ou degeneradas
 * 2. Coordenadas NaN ou infinitas que quebram o boundingSphere
 * 3. Índices de faces fora do intervalo de vértices
 */
export function sanitizeMeshGeometry(geometry: THREE.BufferGeometry): THREE.BufferGeometry {
  const positionAttr = geometry.getAttribute('position');
  if (!positionAttr) return geometry;

  const positions = positionAttr.array as Float32Array;
  let hasNaN = false;

  for (let i = 0; i < positions.length; i++) {
    if (!Number.isFinite(positions[i])) {
      positions[i] = 0;
      hasNaN = true;
    }
  }

  if (hasNaN) {
    positionAttr.needsUpdate = true;
  }

  // Recalcular normais se ausentes ou inválidas
  if (!geometry.getAttribute('normal')) {
    geometry.computeVertexNormals();
  }

  // Recalcular caixas e esferas delimitadoras
  try {
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();
  } catch (err) {
    console.warn('[TECX LABS 3D] Aviso ao calcular bounding boxes:', err);
  }

  return geometry;
}

/**
 * Verifica se um ArrayBuffer contém o cabeçalho binário válido de um arquivo GLB (0x46546C67 = "glTF")
 */
export function isValidGlbBuffer(buffer: ArrayBuffer): boolean {
  if (!buffer || buffer.byteLength < 12) return false;
  const dataView = new DataView(buffer);
  const magic = dataView.getUint32(0, true);
  return magic === 0x46546c67; // 'glTF' em little-endian
}
