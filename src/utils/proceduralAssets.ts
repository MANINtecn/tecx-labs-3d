import { PresetItem } from '../types';

/**
 * Gera imagens de referência 2D procedurais e de altíssima definição em HTML5 Canvas
 * para que nunca haja dependência de arquivos externos ou links que possam retornar 404.
 */
function createProceduralCanvas(drawFn: (ctx: CanvasRenderingContext2D, w: number, h: number) => void): string {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';
  drawFn(ctx, 512, 512);
  return canvas.toDataURL('image/png');
}

// 1. Asas do Arcanjo (Mu Online)
export const MU_WINGS_DATA_URL = createProceduralCanvas((ctx, w, h) => {
  ctx.clearRect(0, 0, w, h);
  
  // Gradiente de energia sagrada
  const grad = ctx.createRadialGradient(w / 2, h / 2, 20, w / 2, h / 2, 240);
  grad.addColorStop(0, '#ffffff');
  grad.addColorStop(0.3, '#f59e0b');
  grad.addColorStop(0.7, '#d97706');
  grad.addColorStop(1, '#b45309');

  // Desenhar asas estilizadas
  ctx.save();
  ctx.translate(w / 2, h / 2 + 30);
  
  // Asa Esquerda e Direita espelhadas
  for (const dir of [-1, 1]) {
    ctx.save();
    ctx.scale(dir, 1);
    
    // Penas principais
    for (let i = 0; i < 7; i++) {
      ctx.beginPath();
      ctx.moveTo(10, 0);
      const angle = -0.2 - (i * 0.18);
      const length = 210 - (i * 18);
      const c1x = Math.cos(angle) * length * 0.5 + 20;
      const c1y = Math.sin(angle) * length * 0.5 - 40;
      const ex = Math.cos(angle) * length + 30;
      const ey = Math.sin(angle) * length;
      
      ctx.quadraticCurveTo(c1x, c1y, ex, ey);
      ctx.quadraticCurveTo(c1x - 10, c1y + 35, 10, 20 + i * 15);
      ctx.fillStyle = grad;
      ctx.fill();
      ctx.strokeStyle = '#fef08a';
      ctx.lineWidth = 3;
      ctx.stroke();
    }

    // Núcleo central dourado
    ctx.beginPath();
    ctx.arc(0, 0, 24, 0, Math.PI * 2);
    ctx.fillStyle = '#fde047';
    ctx.fill();
    ctx.strokeStyle = '#b45309';
    ctx.lineWidth = 4;
    ctx.stroke();

    ctx.restore();
  }

  // Gemas místicas centrais
  ctx.beginPath();
  ctx.arc(0, 0, 14, 0, Math.PI * 2);
  ctx.fillStyle = '#06b6d4';
  ctx.fill();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.restore();
});

// 2. Dual Zariche (Lineage 2)
export const L2_ZARICHE_DATA_URL = createProceduralCanvas((ctx, w, h) => {
  ctx.clearRect(0, 0, w, h);
  
  ctx.save();
  ctx.translate(w / 2, h / 2);

  for (const dir of [-1, 1]) {
    ctx.save();
    ctx.rotate((dir * 25 * Math.PI) / 180);

    // Lâmina Demônica Carmesim
    ctx.beginPath();
    ctx.moveTo(0, 160);
    ctx.lineTo(-24, 80);
    ctx.lineTo(-14, -130);
    ctx.lineTo(0, -210); // Ponta da lâmina
    ctx.lineTo(14, -130);
    ctx.lineTo(24, 80);
    ctx.closePath();

    const bladeGrad = ctx.createLinearGradient(-30, 0, 30, 0);
    bladeGrad.addColorStop(0, '#1c1917');
    bladeGrad.addColorStop(0.3, '#7f1d1d');
    bladeGrad.addColorStop(0.5, '#ef4444');
    bladeGrad.addColorStop(0.7, '#7f1d1d');
    bladeGrad.addColorStop(1, '#1c1917');

    ctx.fillStyle = bladeGrad;
    ctx.fill();
    ctx.strokeStyle = '#f87171';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Sulco de sangue / Fullers brilhantes
    ctx.beginPath();
    ctx.moveTo(0, 70);
    ctx.lineTo(0, -170);
    ctx.strokeStyle = '#ff0055';
    ctx.lineWidth = 4;
    ctx.stroke();

    // Guarda pontiaguda
    ctx.beginPath();
    ctx.moveTo(-50, 95);
    ctx.lineTo(0, 80);
    ctx.lineTo(50, 95);
    ctx.lineTo(35, 120);
    ctx.lineTo(0, 105);
    ctx.lineTo(-35, 120);
    ctx.closePath();
    ctx.fillStyle = '#450a0a';
    ctx.fill();
    ctx.strokeStyle = '#fca5a5';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Empunhadura
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(-10, 120, 20, 70);
    ctx.strokeStyle = '#dc2626';
    ctx.strokeRect(-10, 120, 20, 70);

    // Pomo
    ctx.beginPath();
    ctx.arc(0, 200, 14, 0, Math.PI * 2);
    ctx.fillStyle = '#991b1b';
    ctx.fill();
    ctx.strokeStyle = '#f87171';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.restore();
  }

  ctx.restore();
});

// 3. Dragon Slayer Greatsword (Lineage 2 / RPG)
export const DRAGON_SLAYER_DATA_URL = createProceduralCanvas((ctx, w, h) => {
  ctx.clearRect(0, 0, w, h);
  ctx.save();
  ctx.translate(w / 2, h / 2);

  // Lâmina pesada de duas mãos
  ctx.beginPath();
  ctx.moveTo(0, -220); // Ponta
  ctx.lineTo(38, -160);
  ctx.lineTo(44, 90);
  ctx.lineTo(20, 110);
  ctx.lineTo(-20, 110);
  ctx.lineTo(-44, 90);
  ctx.lineTo(-38, -160);
  ctx.closePath();

  const steelGrad = ctx.createLinearGradient(-45, 0, 45, 0);
  steelGrad.addColorStop(0, '#334155');
  steelGrad.addColorStop(0.3, '#94a3b8');
  steelGrad.addColorStop(0.5, '#f8fafc');
  steelGrad.addColorStop(0.7, '#94a3b8');
  steelGrad.addColorStop(1, '#334155');
  ctx.fillStyle = steelGrad;
  ctx.fill();
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 3;
  ctx.stroke();

  // Escamas de dragão no centro da espada
  ctx.fillStyle = '#0f766e';
  ctx.fillRect(-8, -150, 16, 230);
  ctx.strokeStyle = '#2dd4bf';
  ctx.lineWidth = 2;
  ctx.strokeRect(-8, -150, 16, 230);

  // Guarda ornamental em asas de dragão
  ctx.beginPath();
  ctx.moveTo(-90, 120);
  ctx.quadraticCurveTo(-40, 95, 0, 110);
  ctx.quadraticCurveTo(40, 95, 90, 120);
  ctx.lineTo(70, 140);
  ctx.lineTo(0, 125);
  ctx.lineTo(-70, 140);
  ctx.closePath();
  ctx.fillStyle = '#ca8a04';
  ctx.fill();
  ctx.strokeStyle = '#fef08a';
  ctx.lineWidth = 2.5;
  ctx.stroke();

  // Cabo e Pomo
  ctx.fillStyle = '#292524';
  ctx.fillRect(-12, 140, 24, 75);
  ctx.beginPath();
  ctx.arc(0, 225, 18, 0, Math.PI * 2);
  ctx.fillStyle = '#a16207';
  ctx.fill();
  ctx.strokeStyle = '#fde047';
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.restore();
});

// 4. Capacete Cibernético Mecanizado
export const CYBER_HELM_DATA_URL = createProceduralCanvas((ctx, w, h) => {
  ctx.clearRect(0, 0, w, h);
  ctx.save();
  ctx.translate(w / 2, h / 2);

  // Cúpula do capacete
  ctx.beginPath();
  ctx.arc(0, -20, 150, Math.PI, 0, false);
  ctx.lineTo(140, 90);
  ctx.lineTo(80, 160);
  ctx.lineTo(-80, 160);
  ctx.lineTo(-140, 90);
  ctx.closePath();

  const carbonGrad = ctx.createLinearGradient(-150, -100, 150, 150);
  carbonGrad.addColorStop(0, '#18181b');
  carbonGrad.addColorStop(0.5, '#27272a');
  carbonGrad.addColorStop(1, '#09090b');
  ctx.fillStyle = carbonGrad;
  ctx.fill();
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 4;
  ctx.stroke();

  // Visor Holográfico Curvo
  ctx.beginPath();
  ctx.moveTo(-110, 0);
  ctx.quadraticCurveTo(0, -25, 110, 0);
  ctx.lineTo(95, 60);
  ctx.quadraticCurveTo(0, 45, -95, 60);
  ctx.closePath();

  const visorGrad = ctx.createLinearGradient(0, -30, 0, 70);
  visorGrad.addColorStop(0, '#0284c7');
  visorGrad.addColorStop(0.5, '#38bdf8');
  visorGrad.addColorStop(1, '#0c4a6e');
  ctx.fillStyle = visorGrad;
  ctx.fill();
  ctx.strokeStyle = '#e0f2fe';
  ctx.lineWidth = 3;
  ctx.stroke();

  // Placas de ventilação lateral
  for (let i = 0; i < 4; i++) {
    ctx.fillStyle = '#52525b';
    ctx.fillRect(-60 + i * 35, 100, 20, 35);
    ctx.strokeStyle = '#06b6d4';
    ctx.strokeRect(-60 + i * 35, 100, 20, 35);
  }

  ctx.restore();
});

// Lista de Presets Curados
export const PRESET_ITEMS: PresetItem[] = [
  {
    id: 'mu-wings',
    name: 'Asas do Arcanjo +15',
    category: 'Mu Online',
    description: 'Asas lendárias de anjo com geometria alar expansiva, penas de alta densidade e brilho celestial.',
    badge: 'Mu Online Clássico',
    targetFaces: 28400,
    baseColor: '#f59e0b',
    accentColor: '#38bdf8',
    metallic: 0.75,
    roughness: 0.25,
    imageUrl: MU_WINGS_DATA_URL,
  },
  {
    id: 'l2-zariche',
    name: 'Dual Dagger Demonic Zariche',
    category: 'Lineage 2',
    description: 'Lâminas amaldiçoadas forjadas em obsidiana com runas de sangue e encaixe duplo de batalha.',
    badge: 'Lineage 2 Chronicle',
    targetFaces: 32600,
    baseColor: '#7f1d1d',
    accentColor: '#ef4444',
    metallic: 0.85,
    roughness: 0.18,
    imageUrl: L2_ZARICHE_DATA_URL,
  },
  {
    id: 'l2-dragon-slayer',
    name: 'Dragon Slayer Grade-S',
    category: 'Lineage 2',
    description: 'Montante épico de duas mãos com escamas de dragão verde esmeralda e guarnições de ouro.',
    badge: 'Lineage 2 S-Grade',
    targetFaces: 35200,
    baseColor: '#94a3b8',
    accentColor: '#10b981',
    metallic: 0.92,
    roughness: 0.15,
    imageUrl: DRAGON_SLAYER_DATA_URL,
  },
  {
    id: 'cyber-helmet',
    name: 'Capacete Tático Valkyrie-7',
    category: 'Cyberpunk',
    description: 'Armadura cranial mecânica com visor HUD transiluminado, entradas de ar e blindagem de carbono.',
    badge: 'Game-Ready Sci-Fi',
    targetFaces: 41000,
    baseColor: '#18181b',
    accentColor: '#06b6d4',
    metallic: 0.7,
    roughness: 0.28,
    imageUrl: CYBER_HELM_DATA_URL,
  },
];
