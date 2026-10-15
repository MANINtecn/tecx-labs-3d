import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';

/**
 * Utilitário de download de arquivos no navegador
 */
function triggerBrowserDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/**
 * Exporta qualquer Object3D ou Mesh para formato .OBJ (Wavefront)
 */
export function exportToOBJ(object: THREE.Object3D, filename = 'tecx_model.obj') {
  let output = '# TECX LABS 3D - Wavefront OBJ Exporter\n';
  output += '# TECX SoftHouse - AI & 3D Computer Graphics Division\n';
  output += `# Date: ${new Date().toISOString()}\n\n`;

  let vertexOffset = 1;
  let normalOffset = 1;
  let uvOffset = 1;

  object.traverse((child) => {
    if (child instanceof THREE.Mesh && child.geometry) {
      const geometry = child.geometry;
      const positions = geometry.getAttribute('position');
      const normals = geometry.getAttribute('normal');
      const uvs = geometry.getAttribute('uv');

      if (!positions) return;

      output += `o Mesh_${child.id}\n`;

      // Transformação de matriz de mundo
      child.updateMatrixWorld(true);
      const matrixWorld = child.matrixWorld;
      const v = new THREE.Vector3();
      const n = new THREE.Vector3();

      // Vértices (v)
      for (let i = 0; i < positions.count; i++) {
        v.fromBufferAttribute(positions, i);
        v.applyMatrix4(matrixWorld);
        output += `v ${v.x.toFixed(5)} ${v.y.toFixed(5)} ${v.z.toFixed(5)}\n`;
      }

      // UVs (vt)
      if (uvs) {
        for (let i = 0; i < uvs.count; i++) {
          output += `vt ${uvs.getX(i).toFixed(5)} ${uvs.getY(i).toFixed(5)}\n`;
        }
      }

      // Normais (vn)
      if (normals) {
        const normalMatrix = new THREE.Matrix3().getNormalMatrix(matrixWorld);
        for (let i = 0; i < normals.count; i++) {
          n.fromBufferAttribute(normals, i);
          n.applyMatrix3(normalMatrix).normalize();
          output += `vn ${n.x.toFixed(4)} ${n.y.toFixed(4)} ${n.z.toFixed(4)}\n`;
        }
      }

      // Faces (f)
      const indices = geometry.getIndex();
      if (indices) {
        for (let i = 0; i < indices.count; i += 3) {
          const i1 = indices.getX(i) + vertexOffset;
          const i2 = indices.getX(i + 1) + vertexOffset;
          const i3 = indices.getX(i + 2) + vertexOffset;

          if (uvs && normals) {
            output += `f ${i1}/${indices.getX(i) + uvOffset}/${indices.getX(i) + normalOffset} ` +
                      `${i2}/${indices.getX(i + 1) + uvOffset}/${indices.getX(i + 1) + normalOffset} ` +
                      `${i3}/${indices.getX(i + 2) + uvOffset}/${indices.getX(i + 2) + normalOffset}\n`;
          } else {
            output += `f ${i1} ${i2} ${i3}\n`;
          }
        }
      } else {
        for (let i = 0; i < positions.count; i += 3) {
          const i1 = i + vertexOffset;
          const i2 = i + 1 + vertexOffset;
          const i3 = i + 2 + vertexOffset;
          output += `f ${i1} ${i2} ${i3}\n`;
        }
      }

      vertexOffset += positions.count;
      if (uvs) uvOffset += uvs.count;
      if (normals) normalOffset += normals.count;
    }
  });

  const blob = new Blob([output], { type: 'text/plain;charset=utf-8' });
  triggerBrowserDownload(blob, filename);
}

/**
 * Exporta para .GLB binário nativo da Web / Three.js
 */
export function exportToGLB(object: THREE.Object3D, filename = 'tecx_model.glb') {
  const exporter = new GLTFExporter();
  exporter.parse(
    object,
    (gltf) => {
      const blob = new Blob([gltf as ArrayBuffer], { type: 'model/gltf-binary' });
      triggerBrowserDownload(blob, filename);
    },
    (error) => {
      console.error('Erro na exportação GLB:', error);
    },
    { binary: true }
  );
}

/**
 * Exporta para .FBX ASCII padrão compatível com Unreal Engine, Unity e Blender
 */
export function exportToFBX(object: THREE.Object3D, filename = 'tecx_model.fbx') {
  let verticesAll: number[] = [];
  let polyIndicesAll: number[] = [];
  let normalsAll: number[] = [];
  let uvsAll: number[] = [];
  let offset = 0;

  object.traverse((child) => {
    if (child instanceof THREE.Mesh && child.geometry) {
      const geo = child.geometry;
      const posAttr = geo.getAttribute('position');
      const normAttr = geo.getAttribute('normal');
      const uvAttr = geo.getAttribute('uv');
      const idxAttr = geo.getIndex();

      if (!posAttr) return;

      child.updateMatrixWorld(true);
      const mat = child.matrixWorld;
      const v = new THREE.Vector3();

      for (let i = 0; i < posAttr.count; i++) {
        v.fromBufferAttribute(posAttr, i).applyMatrix4(mat);
        verticesAll.push(v.x, v.y, v.z);
      }

      if (normAttr) {
        for (let i = 0; i < normAttr.count; i++) {
          normalsAll.push(normAttr.getX(i), normAttr.getY(i), normAttr.getZ(i));
        }
      }

      if (uvAttr) {
        for (let i = 0; i < uvAttr.count; i++) {
          uvsAll.push(uvAttr.getX(i), uvAttr.getY(i));
        }
      }

      if (idxAttr) {
        for (let i = 0; i < idxAttr.count; i += 3) {
          const a = idxAttr.getX(i) + offset;
          const b = idxAttr.getX(i + 1) + offset;
          const c = idxAttr.getX(i + 2) + offset;
          // FBX usa o último índice negativo (-idx - 1) para demarcar fim do polígono
          polyIndicesAll.push(a, b, -c - 1);
        }
      }

      offset += posAttr.count;
    }
  });

  let fbx = '; TECX LABS 3D - FBX ASCII Exporter v1.0\n';
  fbx += '; TECX SoftHouse - AI & 3D Computer Graphics Division\n';
  fbx += 'FBXHeaderExtension: {\n\tFBXHeaderVersion: 1003\n\tFBXVersion: 7400\n}\n\n';
  fbx += 'Objects: {\n';
  fbx += '\tGeometry: 1000, "Geometry::TECX_Model", "Mesh" {\n';

  // Vertices
  fbx += `\t\tVertices: *${verticesAll.length} {\n\t\t\ta: ${verticesAll.map(n => n.toFixed(4)).join(', ')}\n\t\t}\n`;

  // PolygonVertexIndex
  fbx += `\t\tPolygonVertexIndex: *${polyIndicesAll.length} {\n\t\t\ta: ${polyIndicesAll.join(', ')}\n\t\t}\n`;

  // Normals
  if (normalsAll.length > 0) {
    fbx += `\t\tLayerElementNormal: 0 {\n\t\t\tVersion: 101\n\t\t\tName: "Normals"\n`;
    fbx += `\t\t\tMappingInformationType: "ByVertice"\n\t\t\tReferenceInformationType: "Direct"\n`;
    fbx += `\t\t\tNormals: *${normalsAll.length} {\n\t\t\t\ta: ${normalsAll.map(n => n.toFixed(4)).join(', ')}\n\t\t\t}\n\t\t}\n`;
  }

  // UVs
  if (uvsAll.length > 0) {
    fbx += `\t\tLayerElementUV: 0 {\n\t\t\tVersion: 101\n\t\t\tName: "UVMap"\n`;
    fbx += `\t\t\tMappingInformationType: "ByVertice"\n\t\t\tReferenceInformationType: "Direct"\n`;
    fbx += `\t\t\tUV: *${uvsAll.length} {\n\t\t\t\ta: ${uvsAll.map(n => n.toFixed(4)).join(', ')}\n\t\t\t}\n\t\t}\n`;
  }

  fbx += '\t}\n';
  fbx += '}\n';

  const blob = new Blob([fbx], { type: 'application/octet-stream' });
  triggerBrowserDownload(blob, filename);
}
