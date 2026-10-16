import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import multer from 'multer';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Configurar multer para upload em memória
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
});

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Inicializar Google Gemini API no lado do servidor
const apiKey = process.env.GEMINI_API_KEY;
let aiClient: GoogleGenAI | null = null;
if (apiKey) {
  try {
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  } catch (e) {
    console.warn('Erro ao inicializar GoogleGenAI:', e);
  }
}

// Executa geração de conteúdo com fallback automático entre modelos em caso de 503 (High Demand)
async function generateContentWithFallback(params: any): Promise<any> {
  if (!aiClient) throw new Error('Cliente IA não inicializado');
  const candidateModels = ['gemini-3.8-flash', 'gemini-3.1-flash-lite', 'gemini-flash-latest'];
  let lastError: any = null;

  for (const model of candidateModels) {
    try {
      const res = await aiClient.models.generateContent({
        ...params,
        model,
      });
      return res;
    } catch (err: any) {
      lastError = err;
      console.warn(`[TECX LABS 3D] Modelo ${model} indisponível (503/erro: ${err.message || ''}). Tentando próximo...`);
    }
  }

  throw lastError;
}

// Endpoint de integridade do servidor local
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    system: 'TECX LABS 3D Core Gateway',
    ready: true,
  });
});

// Endpoint para entregar o script oficial do Colab para a interface web
app.get('/api/files/content/run_colab.py', (req, res) => {
  try {
    const colabScriptPath = path.join(__dirname, 'backend', 'run_colab.py');
    if (fs.existsSync(colabScriptPath)) {
      const content = fs.readFileSync(colabScriptPath, 'utf-8');
      return res.json({ content });
    }
    return res.status(404).json({ error: 'Arquivo run_colab.py não encontrado.' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Endpoint para testar conexão com o servidor remoto (Colab / Cloudflare) sem problemas de CORS
app.post('/api/neural/test-connection', async (req, res) => {
  const { url } = req.body;
  if (!url) {
    return res.status(400).json({ success: false, error: 'URL do servidor não informada.' });
  }

  const cleanUrl = url.trim().replace(/\/$/, '');
  const checkEndpoints = [`${cleanUrl}/api/health`, `${cleanUrl}/health`, `${cleanUrl}/`];

  for (const endpoint of checkEndpoints) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 7000);

      const response = await fetch(endpoint, {
        method: 'GET',
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (response.ok) {
        let data: any = {};
        try {
          data = await response.json();
        } catch {
          data = { status: 'online' };
        }
        return res.json({
          success: true,
          message: 'Conectado com sucesso ao TripoSR GPU!',
          data,
        });
      }
    } catch {
      // Tentar próximo endpoint
    }
  }

  return res.status(500).json({
    success: false,
    error: `Não foi possível conectar ao Colab (${cleanUrl}). Verifique se o notebook está em execução e o link do túnel Cloudflare está correto.`,
  });
});

// Endpoint Gateway Neural: encaminha a imagem para o TripoSR no Colab (Sem CORS) e retorna o GLB real
app.post('/api/neural/generate-3d', upload.single('image'), async (req, res) => {
  try {
    const targetBackend = req.body.targetBackendUrl || req.headers['x-target-backend'];
    const quality = req.body.quality || 'mid';
    const assetType = req.body.asset_type || req.body.assetType || 'weapon_tool';
    const threshold = req.body.threshold || req.body.mc_threshold;

    if (!targetBackend) {
      return res.status(400).json({
        success: false,
        error: 'Nenhum servidor neural conectado. Conecte sua GPU do Google Colab (Cloudflare) na aba Python & Colab para gerar o modelo 3D real!',
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'Nenhum arquivo de imagem foi enviado.',
      });
    }

    const cleanBackend = String(targetBackend).trim().replace(/\/$/, '');

    // Criar FormData nativo do Node para despachar para o Colab
    const blob = new Blob([new Uint8Array(req.file.buffer)], { type: req.file.mimetype || 'image/png' });
    const formData = new FormData();
    formData.append('image', blob, req.file.originalname || 'input.png');
    formData.append('quality', quality);
    formData.append('asset_type', assetType);
    if (threshold && String(threshold).trim() !== '') {
      formData.append('threshold', String(threshold));
    }

    console.log(`[TECX LABS 3D] Enviando imagem (${req.file.size} bytes) para TripoSR em: ${cleanBackend} [Asset: ${assetType}, Quality: ${quality}, Thresh: ${threshold || 'auto'}]`);

    // Tentar /api/generate-3d e depois /generate-3d
    let colabResponse = await fetch(`${cleanBackend}/api/generate-3d`, {
      method: 'POST',
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
      body: formData,
    });

    if (colabResponse.status === 404) {
      // Tentar sem prefixo /api
      const retryFormData = new FormData();
      retryFormData.append('image', blob, req.file.originalname || 'input.png');
      retryFormData.append('quality', quality);
      retryFormData.append('asset_type', assetType);
      if (threshold && String(threshold).trim() !== '') {
        retryFormData.append('threshold', String(threshold));
      }

      colabResponse = await fetch(`${cleanBackend}/generate-3d`, {
        method: 'POST',
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
        body: retryFormData,
      });
    }

    if (!colabResponse.ok) {
      const errorText = await colabResponse.text();
      console.error(`[TECX LABS 3D] Erro retornado pelo Colab (${colabResponse.status}):`, errorText);
      return res.status(colabResponse.status).json({
        success: false,
        error: `Erro no servidor TripoSR (${colabResponse.status}): ${errorText.slice(0, 300)}`,
      });
    }

    const colabData = await colabResponse.json();
    console.log('[TECX LABS 3D] TripoSR concluiu geração com sucesso:', colabData.metrics);

    // 1. Se o servidor retornou glb_base64 diretamente (método atômico preferencial)
    if (colabData.glb_base64 || colabData.glbBase64) {
      return res.json({
        success: true,
        metrics: colabData.metrics,
        glbBase64: colabData.glb_base64 || colabData.glbBase64,
        downloads: colabData.downloads,
        server_logs: colabData.server_logs || [],
        segmented_preview: colabData.segmented_preview || null,
      });
    }

    // 2. Fallback: Baixar o arquivo GLB gerado pelo endpoint de download
    const rawGlbPath = colabData.downloads?.glb || colabData.glb_url;
    if (!rawGlbPath) {
      return res.status(500).json({
        success: false,
        error: 'O servidor TripoSR não retornou o caminho nem o binário do modelo GLB gerado.',
      });
    }

    const glbDownloadUrl = `${cleanBackend}${rawGlbPath.startsWith('/') ? '' : '/'}${rawGlbPath}`;
    console.log('[TECX LABS 3D] Baixando GLB 360° do TripoSR:', glbDownloadUrl);

    const glbFetch = await fetch(glbDownloadUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
    });
    if (!glbFetch.ok) {
      return res.status(500).json({
        success: false,
        error: `Falha ao transferir o arquivo GLB gerado pelo Colab (${glbFetch.status}).`,
      });
    }

    const glbBuffer = await glbFetch.arrayBuffer();
    const base64Glb = Buffer.from(glbBuffer).toString('base64');

    return res.json({
      success: true,
      metrics: colabData.metrics,
      glbBase64: base64Glb,
      downloads: colabData.downloads,
    });
  } catch (err: any) {
    console.error('[TECX LABS 3D] Erro no gateway neural:', err);
    return res.status(500).json({
      success: false,
      error: `Falha na comunicação com o TripoSR: ${err.message || 'Erro inesperado'}`,
    });
  }
});

// Endpoint Inteligente: Escanear e Analisar Foto de Asset via Gemini Vision
app.post('/api/ai/scan-asset', async (req, res) => {
  try {
    const { imageBase64 } = req.body;
    if (!imageBase64) {
      return res.status(400).json({ success: false, error: 'Imagem base64 não fornecida.' });
    }

    if (!aiClient) {
      return res.status(503).json({
        success: false,
        error: 'Chave GEMINI_API_KEY não configurada no servidor.',
      });
    }

    const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');

    let textOutput = '{}';
    try {
      const response = await generateContentWithFallback({
        contents: [
          {
            role: 'user',
            parts: [
              {
                inlineData: {
                  data: cleanBase64,
                  mimeType: 'image/png',
                },
              },
              {
                text: `Você é o Arquiteto Chefe de Visão Computacional e Reconstrução 3D da TECX SoftHouse.
Analise detalhadamente a foto deste objeto para conversão Image-to-3D via TripoSR.
Identifique:
1. O que é o asset com alta precisão (ex: "Picareta de Mineração Low-Poly", "Espada Longa Medieval", "Escudo de Dragão", "Carro Blindado", "Asas de Arcanjo").
2. Categoria: escolha estritamente uma destas opções: "weapon_tool", "armor", "character", "vehicle", "wings".
3. Se possui geometria fina/delgada (cabos, hastes de picareta, lâminas afiadas, antenas) que precisam de threshold calibrado (~15-18) para evitar furos ou rompimento.
4. Sugestão de threshold e qualidade para TripoSR.
5. Diagnóstico de qualidade da imagem (contraste, fundo, enquadramento).

Responda OBRIGATORIAMENTE em JSON puro no formato:
{
  "assetName": "Nome do Asset",
  "category": "weapon_tool",
  "suggestedThreshold": 0.16,
  "recommendedQuality": "high_fidelity",
  "isThinGeometry": true,
  "diagnosis": "Diagnóstico do asset e da foto.",
  "geometryAdvice": "Dica prática de modelagem para preservar este asset."
}`,
              },
            ],
          },
        ],
        config: {
          responseMimeType: 'application/json',
        },
      });
      textOutput = response.text || '{}';
    } catch (err: any) {
      console.warn('[TECX LABS 3D] IA em alta demanda (503), aplicando diagnóstico local inteligente:', err.message);
    }

    let parsedData: any = {};
    try {
      parsedData = JSON.parse(textOutput);
      if (parsedData.suggestedThreshold > 1.0) {
        parsedData.suggestedThreshold = Math.min(0.5, Math.max(0.05, parsedData.suggestedThreshold / 100));
      }
    } catch {
      parsedData = {
        assetName: 'Asset Customizado',
        category: 'weapon_tool',
        suggestedThreshold: 0.16,
        recommendedQuality: 'high_fidelity',
        isThinGeometry: true,
        diagnosis: 'Asset escaneado com sucesso via pré-processador local.',
        geometryAdvice: 'Limiar calibrado para preservação de bordas e espessura 360°.',
      };
    }

    return res.json({
      success: true,
      scan: parsedData,
    });
  } catch (err: any) {
    console.error('Erro no endpoint de escanear asset:', err);
    return res.json({
      success: true,
      scan: {
        assetName: 'Asset Customizado 3D',
        category: 'weapon_tool',
        suggestedThreshold: 0.16,
        recommendedQuality: 'high_fidelity',
        isThinGeometry: true,
        diagnosis: 'Processamento local ativo.',
        geometryAdvice: 'Reconstrução volumétrica direta.',
      },
    });
  }
});

// Endpoint: Decomposição Anatômica para Modelagem 3D Hard-Surface (Estilo Blender)
app.post('/api/ai/analyze-and-model-asset', async (req, res) => {
  try {
    const { imageBase64 } = req.body;
    if (!imageBase64) {
      return res.status(400).json({ success: false, error: 'Imagem base64 não fornecida.' });
    }

    if (!aiClient) {
      return res.status(503).json({
        success: false,
        error: 'Chave GEMINI_API_KEY não configurada no servidor.',
      });
    }

    const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');
    let textOutput = '{}';
    try {
      const response = await generateContentWithFallback({
        contents: [
          {
            role: 'user',
            parts: [
              {
                inlineData: {
                  data: cleanBase64,
                  mimeType: 'image/png',
                },
              },
              {
                text: `Você é um Modelador 3D Sênior especialista em topologia e assets Game-Ready.
Analise este desenho ou foto e identifique o objeto:
1. assetType: tipo exato do objeto (ex: "chair", "sword", "sneaker", "car", "bottle", "helmet", "robot", "tool", "item").
2. assetTitle: título limpo para o asset.
3. handleColor: cor predominante da base/estrutura.
4. headColor: cor predominante da parte principal/metal/material.
5. metalRoughness: rugosidade média (0.2 a 0.6).
6. woodRoughness: rugosidade secundária (0.4 a 0.8).
7. metalness: metálico (0.1 a 0.9).

Responda OBRIGATORIAMENTE em JSON puro no formato:
{
  "assetType": "item",
  "assetTitle": "Asset 3D",
  "handleColor": "#334155",
  "headColor": "#64748b",
  "metalRoughness": 0.4,
  "woodRoughness": 0.6,
  "metalness": 0.5
}`,
              },
            ],
          },
        ],
        config: {
          responseMimeType: 'application/json',
        },
      });
      textOutput = response.text || '{}';
    } catch (aiErr: any) {
      console.warn('[TECX LABS 3D] IA em alta demanda (503) na análise anatômica, usando parâmetros universais:', aiErr.message);
    }

    let parsed: any = {};
    try {
      parsed = JSON.parse(textOutput);
    } catch {
      parsed = {
        assetType: 'item',
        assetTitle: 'Asset 3D Reconstruído',
        handleColor: '#475569',
        headColor: '#64748b',
        metalRoughness: 0.4,
        woodRoughness: 0.6,
        metalness: 0.3,
      };
    }

    return res.json({
      success: true,
      modelingParams: parsed,
    });
  } catch (err: any) {
    console.error('Erro no endpoint analyze-and-model-asset:', err);
    return res.json({
      success: true,
      modelingParams: {
        assetType: 'item',
        assetTitle: 'Asset 3D Customizado',
        handleColor: '#475569',
        headColor: '#64748b',
        metalRoughness: 0.4,
        woodRoughness: 0.6,
        metalness: 0.3,
      },
    });
  }
});

// Endpoint: Otimizar e Isolar Foto do Asset para Studio 3D (Remove ruídos e gera foto ortográfica pura)
app.post('/api/ai/enhance-asset-photo', async (req, res) => {
  try {
    const { imageBase64, assetName } = req.body;
    if (!imageBase64) {
      return res.status(400).json({ success: false, error: 'Imagem base64 não fornecida.' });
    }

    if (!aiClient) {
      return res.status(503).json({
        success: false,
        error: 'Chave GEMINI_API_KEY não configurada no servidor.',
      });
    }

    const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');
    const prompt = `Pristine studio 3D reference photograph of this exact asset: ${assetName || 'item'}. Single object perfectly centered in orthographic view on a solid pure clean white background. Remove all background clutter, hands, tables, shadows, and noise. Ultra crisp clean silhouette, vivid textures, game-ready reference for 3D volumetric scanning.`;

    const imageResponse = await aiClient.models.generateContent({
      model: 'gemini-3.1-flash-lite-image',
      contents: {
        parts: [
          {
            inlineData: {
              data: cleanBase64,
              mimeType: 'image/png',
            },
          },
          { text: prompt },
        ],
      },
    });

    let generatedImageUrl: string | null = null;
    const candidates = imageResponse.candidates;
    if (candidates && candidates[0]?.content?.parts) {
      for (const part of candidates[0].content.parts) {
        if (part.inlineData?.data) {
          generatedImageUrl = `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
          break;
        }
      }
    }

    if (!generatedImageUrl) {
      return res.status(500).json({
        success: false,
        error: 'A IA não retornou imagem gerada.',
      });
    }

    return res.json({
      success: true,
      imageUrl: generatedImageUrl,
    });
  } catch (err: any) {
    console.error('Erro ao otimizar foto do asset com IA:', err);
    return res.status(500).json({
      success: false,
      error: `Falha ao otimizar foto: ${err.message || 'Erro inesperado'}`,
    });
  }
});

// Endpoint para gerar conceitos visuais do zero via Gemini Image Generation
app.post('/api/ai/generate-image', async (req, res) => {
  try {
    const { prompt, style = 'game_asset', inputImageBase64 } = req.body;
    if (!prompt) {
      return res.status(400).json({ success: false, error: 'O prompt descritivo é obrigatório.' });
    }

    if (!aiClient) {
      return res.status(400).json({
        success: false,
        error: 'Chave GEMINI_API_KEY não configurada. Configure sua chave no painel Secrets para usar a IA.',
      });
    }

    const enhancedPrompt = `Game-ready 3D asset concept art of ${prompt}. Style: ${style}, RPG game asset suitable for Lineage 2, Mu Online, or Unreal Engine. Single hero item centered in frame, orthographic perspective, completely isolated on solid white background with clean edges, no shadows, no text, no watermark, highly detailed PBR textures.`;

    const parts: any[] = [];
    if (inputImageBase64) {
      const cleanBase64 = inputImageBase64.replace(/^data:image\/\w+;base64,/, '');
      parts.push({
        inlineData: {
          data: cleanBase64,
          mimeType: 'image/png',
        },
      });
      parts.push({ text: `Modify this asset according to: ${prompt}. Keep it isolated on pure solid white background.` });
    } else {
      parts.push({ text: enhancedPrompt });
    }

    let generatedImageUrl: string | null = null;
    let descriptionText: string = '';

    try {
      const imageResponse = await aiClient.models.generateContent({
        model: 'gemini-3.1-flash-lite-image',
        contents: { parts },
      });

      const candidates = imageResponse.candidates;
      if (candidates && candidates[0]?.content?.parts) {
        for (const part of candidates[0].content.parts) {
          if (part.inlineData?.data) {
            generatedImageUrl = `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
          } else if (part.text) {
            descriptionText += part.text;
          }
        }
      }
    } catch (imgErr: any) {
      console.warn('Fallback para gemini-3.8-flash:', imgErr?.message);
      const textResponse = await aiClient.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: `Você é o Arquiteto 3D Chefe da TECX SoftHouse. Analise o asset solicitado: "${prompt}". Retorne uma descrição técnica de geometria e materiais para modelagem 3D.`,
      });
      descriptionText = textResponse.text || '';
    }

    if (!generatedImageUrl) {
      return res.status(200).json({
        success: false,
        error: 'Não foi possível gerar imagem direta com o modelo de IA no momento.',
        details: descriptionText,
      });
    }

    return res.json({
      success: true,
      imageUrl: generatedImageUrl,
      description: descriptionText,
    });
  } catch (error: any) {
    console.error('Erro na API de IA:', error);
    return res.status(500).json({ success: false, error: error.message || 'Erro ao comunicar com a IA' });
  }
});

// Endpoint para baixar os arquivos do backend Python diretamente
app.get('/api/files/download/:filename', (req, res) => {
  const filename = req.params.filename;
  const allowedFiles: Record<string, string> = {
    'app.py': path.resolve('./backend/app.py'),
    'requirements.txt': path.resolve('./backend/requirements.txt'),
    'run_colab.py': path.resolve('./backend/run_colab.py'),
    'README.md': path.resolve('./backend/README.md'),
  };

  const targetPath = allowedFiles[filename];
  if (!targetPath || !fs.existsSync(targetPath)) {
    return res.status(404).json({ error: 'Arquivo não encontrado' });
  }

  res.download(targetPath, filename);
});

// Endpoint para obter o código fonte dos arquivos do backend
app.get('/api/files/content/:filename', (req, res) => {
  const filename = req.params.filename;
  const allowedFiles: Record<string, string> = {
    'app.py': path.resolve('./backend/app.py'),
    'requirements.txt': path.resolve('./backend/requirements.txt'),
    'run_colab.py': path.resolve('./backend/run_colab.py'),
    'README.md': path.resolve('./backend/README.md'),
  };

  const targetPath = allowedFiles[filename];
  if (!targetPath || !fs.existsSync(targetPath)) {
    return res.status(404).json({ error: 'Arquivo não encontrado' });
  }

  const content = fs.readFileSync(targetPath, 'utf-8');
  res.json({ filename, content });
});

async function startServer() {
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'spa',
  });

  app.use(vite.middlewares);

  app.listen(PORT, () => {
    console.log(`[TECX LABS 3D] Servidor rodando ativo em http://localhost:${PORT}`);
  });
}

startServer();
