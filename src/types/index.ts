export type ViewMode = 'textured' | 'shaded' | 'wireframe' | 'xray';

export type PolyQuality = 'low' | 'mid' | 'high';

export interface MeshMetrics {
  vertices: number;
  triangles: number;
  dimensions: {
    width: number;
    height: number;
    depth: number;
  };
  volumeEstimate: number; // in cm3
  drawCalls: number;
}

export interface PresetItem {
  id: string;
  name: string;
  category: 'Mu Online' | 'Lineage 2' | 'Armas & Equipamentos' | 'Cyberpunk' | 'RPG Fantasy';
  description: string;
  badge: string;
  targetFaces: number;
  baseColor: string;
  accentColor: string;
  metallic: number;
  roughness: number;
  imageUrl: string; // Procedural SVG/Canvas data URL
}

export type LightingPreset = 'studio' | 'cyberpunk' | 'dramatic' | 'warm';
