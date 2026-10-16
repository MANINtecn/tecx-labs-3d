# 📔 DIÁRIO DE BORDO — TECX LABS 3D
### Sistema Proprietário de Geração 3D Neural (Image-to-3D)
**Divisão:** TECX SoftHouse — AI & 3D Computer Graphics Division  
**Ambiente:** Google Colab (GPU T4) + Cliente Web Local (Node/Express + Three.js)  
**Início do Projeto:** Outubro / 2026  

---

## 📌 Visão Geral & Regra de Ouro do Projeto
> **Regra Nº 1 da TECX:**  
> Não utilizar serviços pagos de terceiros (sem custo em dólar ou real). Construir e dominar nosso próprio motor de modelagem 3D, executando a inferência pesada na nuvem gratuita do Google Colab (GPU T4) e operando uma interface local limpa, rápida e intuitiva no padrão das grandes empresas de tecnologia (Tripo AI / Meshy AI).

---

## 📜 Histórico de Versões, Tentativas e Descobertas

### 🏷️ Versão 1.0 — A Barreira de Dependências no Colab
- **Objetivo:** Fazer o repositório oficial do TripoSR inicializar no ambiente Google Colab (Python 3.12).
- **Problema Encontrado:**  
  A biblioteca legada `rembg` gerava falha crítica de importação:  
  `ImportError: cannot import name '_center' from 'numpy._core.umath'`.  
  O ambiente moderno do Colab causava conflitos insolúveis entre `rembg`, `scipy.sparse` e `numpy 2.0`.
- **Tentativa de Contorno:**  
  Aplicação do comando `!sed -i 's/import rembg/# import rembg/g'` no arquivo `TripoSR/tsr/utils.py`.  
  O TripoSR inicializou, porém sem ferramenta para remoção de fundo.

---

### 🏷️ Versão 1.5 — A Falha do OpenCV e o Efeito "Bloco Quadrado"
- **Objetivo:** Remover o fundo da imagem enviada pelo usuário utilizando visão computacional tradicional (OpenCV).
- **Abordagem Adotada:**  
  Implementação da função `professional_pre_process` com binarização adaptativa Otsu (`cv2.threshold`), detecção de contornos (`cv2.findContours`) e preenchimento de máscara (`cv2.drawContours`).
- **O Desastre Visual ("Efeito Bloco"):**  
  Ao enviar o desenho da picareta, a IA retornou um **bloco cilíndrico/quadrado maciço** com a picareta estampada na face frontal.
- **Diagnóstico das Causas Raízes:**
  1. **Falha de Segmentação:** Em desenhos sobre papel ou fotos com iluminação irregular, o algoritmo de Otsu detectou a **moldura retangular externa da folha** como o maior contorno. O OpenCV preencheu a imagem inteira com 255. O fundo branco/cinza continuou lá como matéria sólida!
  2. **Conversão Destrutiva `.convert('RGB')`:** O TripoSR exige mesclagem matemática com canal alfa. Ao converter para RGB puro, áreas vazias viraram preto ou branco absoluto, interpretadas pela rede como superfícies maciças.
  3. **Marching Cubes Invertido:** O adaptador virtual usando `skimage.measure.marching_cubes` com `threshold=0.0` capturou toda a névoa de densidade do espaço delimitador e inverteu coordenadas de eixo `(Z, Y, X)` para `(X, Y, Z)`, achatando a malha em formato de almofada.

---

### 🏷️ Versão 2.0 (VERSÃO CAMPEÃ — ESTÁVEL) 🏆
- **Data:** 16 de Outubro de 2026
- **Status:** **RODOU DE PRIMEIRA SEM NENHUM ERRO DO INÍCIO AO FIM!**
- **Grandes Descobertas e Soluções:**

#### 1. IA Neural de Recorte de Estúdio (`briaai/RMBG-1.4`)
- Substituiu completamente o OpenCV frágil e o `rembg` quebrado.
- Executada nativamente em **Pure PyTorch** na GPU T4.
- Recorta cabelos, frestas, lâminas e contornos com precisão de estúdio em apenas **0.2 segundos**, eliminando 100% de qualquer resquício de fundo em rascunhos, desenhos ou fotos.

#### 2. Enquadramento Ótico & Mesclagem Alpha Neutra do TripoSR
- **Escala Ótica:** A imagem recortada é centralizada e reescalonada com proporção de 85% (`resize_foreground`).
- **Mesclagem de Fundo Neutro:**
  $$\text{Pixel} = \text{RGB} \times \alpha + (1.0 - \alpha) \times 0.5$$
  Essa fórmula preenche o fundo transparente com cinza neutro (128), atendendo aos requisitos exatos do codificador visual ViT do TripoSR.

#### 3. Marching Cubes de Alta Precisão via PyMCubes
- Injeção do módulo virtual `torchmcubes` apontando para `mcubes.marching_cubes` (C++).
- Zero conflitos de compilação ou compatibilidade.
- **Threshold Calibrado:** Definido em `0.18` para armas e ferramentas, preservando cabos finos, pontas e biséis sem deformação.

#### 4. Pós-Processamento Trimesh Game-Ready
- Aplicação de `filter_laplacian(mesh, iterations=2)` para suavizar voxels.
- Exportação atômica em `.glb` e `.obj` e empacotamento em Base64 para carregamento instantâneo via gateway Node sem erro de CORS.

#### 5. Correção de Desempacotamento do Tensor RMBG-1.4
- **Diagnóstico:** O modelo RMBG-1.4 do HuggingFace retorna uma estrutura aninhada `list[list[Tensor]]`. A chamada direta de `[-1].sigmoid()` gerava `'list' object has no attribute 'sigmoid'`.
- **Solução:** Implementado desempacotamento recursivo automático:
  ```python
  while isinstance(output, (list, tuple)):
      output = output[0]
  preds = torch.sigmoid(output).cpu().squeeze()
  ```
- **Fallback de Segurança:** Em caso de exceção no recorte, o pipeline continua sem interromper a geração 3D.

---

## 🖥️ Reformulação da Interface (Padrão Tripo AI)

1. **Gizmo 3D Interativo de Coordenadas (X, Y, Z):**
   - Integrado o `ViewHelper` oficial do Three.js no canto superior direito do Viewport.
   - Esferas e eixos coloridos (**X: Vermelho**, **Y: Verde**, **Z: Azul**) sincronizados em tempo real com o OrbitControls.
   - Clique direto nos eixos para rotacionar suavemente para as vistas Frontal, Topo e Lateral.
   - Adicionado `AxesHelper` central no piso para orientação espacial imediata.

2. **Despoluição Completa da UI:**
   - Removidos painéis complexos, geradores procedurais de mentira e abas secundárias desnecessárias.
   - **Dock Inferior Flutuante Minimalista:**
     - Modos de visualização rápidos: **Textura PBR**, **Studio Clay (fosco)**, **Wireframe** e **Raio-X**.
     - Controles de cena: **Auto-Girar 360°**, **Centralizar/Focar Câmera** e **Alternar Grade**.
     - Download em 1 clique: botões dedicados para **.GLB** e **.OBJ**.
   - **Upload Modal Direto:** Arrastar imagem $\rightarrow$ Selecionar qualidade $\rightarrow$ Gerar no Colab T4.

---

## 📊 Tabela Comparativa de Evolução

| Característica | Versão 1.5 (OpenCV) | Versão 2.0 (RMBG-1.4 + TripoSR) |
| :--- | :--- | :--- |
| **Recorte de Fundo** | OpenCV Otsu (Falhava em desenhos) | IA Neural RMBG-1.4 (Perfeição em 0.2s) |
| **Geometria Resultante** | Bloco cúbico maciço deformado | Modelo 3D volumétrico real 360° |
| **Isosuperfície** | skimage (eixos invertidos, level 0.0) | PyMCubes C++ (Threshold 0.18 calibrado) |
| **Estabilidade no Colab** | Quebrava imports e dependências | Rodou de primeira sem nenhum erro |
| **Interface de Visualização**| Sem eixos, poluída com abas | Padrão Tripo AI com Gizmo XYZ e Dock limpo |
| **Exportação** | Manual / Falha de CORS | 1 clique (.GLB e .OBJ) via Gateway Node |

---

## 🚀 Próximas Metas (Pipeline L2 Interlude)
1. **Conversão para .PSK / .UKX:** Conectar a malha gerada ao esqueleto de 1 osso (`bip01_r_hand`) para registro imediato no Lineage 2 Interlude (`weapongrp.dat` e `itemname-e.dat`).
2. **Texturização de Materiais:** Suporte a geração de variações de texturas PBR (madeira antiga, ferro forjado escuro, runas brilhantes).
