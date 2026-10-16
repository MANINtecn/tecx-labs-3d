export type ViewMode = 'textured' | 'shaded' | 'wireframe' | 'xray';

export type PolyQuality = 'low' | 'mid' | 'high' | 'high_fidelity';

export type AssetCategory = 'weapon_tool' | 'armor' | 'character' | 'vehicle' | 'wings';

export interface AIScanResult {
  assetName: string;
  category: AssetCategory;
  suggestedThreshold: number;
  recommendedQuality: PolyQuality;
  diagnosis: string;
  isThinGeometry: boolean;
  geometryAdvice: string;
}

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

export type LightingPreset = 'studio' | 'cyberpunk' | 'dramatic' | 'warm';
