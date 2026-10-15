/**
 * TECX LABS 3D - Processamento Real de Remoção de Fundo
 * TECX SoftHouse - Divisão de Computação Gráfica 3D
 *
 * Algoritmo real de detecção de fundo por análise de cantos,
 * distância euclidiana de cor em espaço RGB e suavização de bordas (feathering).
 */

export async function removeImageBackground(
  imageSource: string | HTMLImageElement,
  tolerance: number = 32
): Promise<string> {
  const img: HTMLImageElement = await new Promise((resolve, reject) => {
    if (typeof imageSource === 'string') {
      const el = new Image();
      el.crossOrigin = 'anonymous';
      el.onload = () => resolve(el);
      el.onerror = (e) => reject(e);
      el.src = imageSource;
    } else {
      resolve(imageSource);
    }
  });

  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth || img.width || 512;
  canvas.height = img.naturalHeight || img.height || 512;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return typeof imageSource === 'string' ? imageSource : img.src;

  ctx.drawImage(img, 0, 0);
  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imgData.data;
  const width = canvas.width;
  const height = canvas.height;

  // 1. Verificar se a imagem já possui canal alfa significativo (transparência nativa)
  let hasExistingAlpha = false;
  for (let i = 3; i < data.length; i += 16) {
    if (data[i] < 240) {
      hasExistingAlpha = true;
      break;
    }
  }

  // Se já tiver transparência transparente nativa, manter como está
  if (hasExistingAlpha) {
    return canvas.toDataURL('image/png');
  }

  // 2. Amostrar cores dos quatro cantos para detectar cor predominante do fundo
  const sampleCorner = (x: number, y: number) => {
    const idx = (y * width + x) * 4;
    return [data[idx], data[idx + 1], data[idx + 2]];
  };

  const corners = [
    sampleCorner(2, 2),
    sampleCorner(width - 3, 2),
    sampleCorner(2, height - 3),
    sampleCorner(width - 3, height - 3),
    sampleCorner(Math.floor(width / 2), 2),
    sampleCorner(Math.floor(width / 2), height - 3),
  ];

  // Média de cor de fundo
  let bgR = 0, bgG = 0, bgB = 0;
  for (const c of corners) {
    bgR += c[0];
    bgG += c[1];
    bgB += c[2];
  }
  bgR = Math.round(bgR / corners.length);
  bgG = Math.round(bgG / corners.length);
  bgB = Math.round(bgB / corners.length);

  // 3. Remover cor de fundo com falloff suave
  const tolSq = tolerance * tolerance;
  const softTolSq = (tolerance * 1.8) * (tolerance * 1.8);

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    const dr = r - bgR;
    const dg = g - bgG;
    const db = b - bgB;
    const distSq = dr * dr + dg * dg + db * db;

    if (distSq <= tolSq) {
      data[i + 3] = 0; // Transparente total
    } else if (distSq < softTolSq) {
      // Suavização gradual na fronteira
      const factor = (distSq - tolSq) / (softTolSq - tolSq);
      data[i + 3] = Math.round(255 * factor);
    }
  }

  ctx.putImageData(imgData, 0, 0);
  return canvas.toDataURL('image/png');
}
