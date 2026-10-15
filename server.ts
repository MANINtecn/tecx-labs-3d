import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Inicializar Google Gemini API no lado do servidor com User-Agent 'aistudio-build'
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

// Endpoint para gerar ou editar conceitos visuais reais via Gemini Image Generation
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

    // Se houver imagem de entrada, realiza edição de imagem; caso contrário, gera imagem nova
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
      // Tentar modelo de geração de imagem primário
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
      console.warn('Tentativa com gemini-3.1-flash-lite-image falhou, tentando fallback com gemini-3.8-flash:', imgErr?.message);

      // Se o modelo de imagem não estiver disponível, gera análise técnica estruturada com gemini-3.8-flash
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
    console.log(`[TECX LABS 3D] Servidor de produção rodando em http://localhost:${PORT}`);
  });
}

startServer();
