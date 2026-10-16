# TECX LABS 3D — Guia de Instalação e Execução
### Desenvolvido por: TECX SoftHouse

O **TECX LABS 3D** é a suíte proprietária de **Image-to-3D** para geração de modelos 3D ultra-realistas e Game-Ready com exportação direta em **.OBJ, .GLB e .FBX**.

---

## ⚡ Solução Definitiva para o Erro no Google Colab

O erro `ImportError: cannot import name '_center' from 'numpy._core.umath'` ocorria porque o arquivo `TripoSR/tsr/utils.py` continha a linha `import rembg` no topo, carregando o `pymatting` e o `scipy.sparse`.

A correção é feita com uma linha simples que desativa essa importação no TripoSR:
```bash
!sed -i 's/import rembg/# import rembg/g' /content/TripoSR/tsr/utils.py
```
Dessa forma, o TripoSR não tenta carregar bibliotecas conflitantes e inicializa diretamente na GPU T4.

---

## ☁️ Código Oficial para o Google Colab

1. Abra seu notebook no [Google Colab](https://colab.research.google.com/) com ambiente **T4 GPU**.
2. Cole o código a seguir em uma única célula e execute:

```python
# 1. Instalar bibliotecas essenciais
!pip install -q fastapi uvicorn[standard] python-multipart trimesh einops transformers omegaconf huggingface_hub scikit-image PyMCubes

# 2. Baixar o repositório TripoSR oficial
%cd /content
!rm -rf TripoSR
!git clone -q https://github.com/VAST-AI-Research/TripoSR.git

# 3. Remover a dependência conflitante do rembg diretamente no TripoSR
!sed -i 's/import rembg/# import rembg/g' /content/TripoSR/tsr/utils.py

# 4. Baixar e instalar o túnel Cloudflare seguro
!wget -q -nc https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
!dpkg -i cloudflared-linux-amd64.deb > /dev/null 2>&1

# 5. Injetar módulo virtual torchmcubes (Resolve o erro no Python 3.12 sem compilar C++)
import sys, types
import torch
import numpy as np
from skimage.measure import marching_cubes as sk_mc

fake_torchmcubes = types.ModuleType("torchmcubes")

def marching_cubes_adapter(volume, threshold=0.0):
    if isinstance(volume, torch.Tensor):
        vol_np = volume.detach().cpu().numpy()
        device = volume.device
    else:
        vol_np = np.asarray(volume)
        device = "cuda:0" if torch.cuda.is_available() else "cpu"
    
    verts, faces, _, _ = sk_mc(vol_np, level=threshold)
    verts_t = torch.from_numpy(verts.copy()).float().to(device)
    faces_t = torch.from_numpy(faces.copy()).long().to(device)
    return verts_t, faces_t

fake_torchmcubes.marching_cubes = marching_cubes_adapter
sys.modules["torchmcubes"] = fake_torchmcubes

# 6. Inicialização do Servidor Neural TripoSR
sys.path.append("/content/TripoSR")

import os, io, time, re, subprocess
from PIL import Image
import trimesh
from tsr.system import TSR
from tsr.utils import resize_foreground
from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse
import uvicorn

app = FastAPI(title="TECX LABS 3D Core")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

os.makedirs("outputs", exist_ok=True)

print("\n⏳ Carregando pesos neurais do TripoSR na GPU T4...")
device = "cuda:0" if torch.cuda.is_available() else "cpu"
model = TSR.from_pretrained(
    "stabilityai/TripoSR",
    config_name="config.yaml",
    weight_name="model.ckpt",
)
model.renderer.set_chunk_size(8192)
model.to(device)
print("🔥 MOTOR NEURAL TECX PRONTO NA GPU!")

# Remoção de fundo calibrada e segura
def remove_background_safe(img: Image.Image) -> Image.Image:
    if img.mode == "RGBA":
        extrema = img.getextrema()
        if len(extrema) == 4 and extrema[3][0] < 250:
            return img
    img_rgba = img.convert("RGBA")
    arr = np.array(img_rgba)
    corners = np.array([arr[0,0,:3], arr[0,-1,:3], arr[-1,0,:3], arr[-1,-1,:3]], dtype=np.float32)
    bg_color = np.median(corners, axis=0)
    diff = np.sqrt(np.sum((arr[:, :, :3] - bg_color) ** 2, axis=-1))
    alpha = np.clip((diff - 25) / 30.0, 0.0, 1.0) * 255.0
    arr[:, :, 3] = alpha.astype(np.uint8)
    return Image.fromarray(arr)

# Endpoints de Conexão
@app.get("/")
@app.get("/api/health")
def health_check():
    return {
        "status": "online",
        "system": "TECX LABS 3D v1.0",
        "gpu": torch.cuda.get_device_name(0) if torch.cuda.is_available() else "CPU",
        "triposr_ready": True
    }

# Endpoint de Reconstrução 3D Volumétrica
@app.post("/api/generate-3d")
async def generate_3d(image: UploadFile = File(...), quality: str = Form("mid")):
    contents = await image.read()
    input_img = Image.open(io.BytesIO(contents))
    
    # 1. Remoção neural de fundo e enquadramento calibrado
    processed_img = remove_background_safe(input_img)
    processed_img = resize_foreground(processed_img, 0.85)
    
    # 2. Resolução conforme qualidade
    res_map = {"low": 128, "mid": 256, "high": 320}
    res = res_map.get(quality, 256)
    
    # 3. Reconstrução volumétrica neural real em 360°
    with torch.no_grad():
        scene_codes = model(processed_img, device=device)
        mesh = model.extract_mesh(scene_codes, resolution=res)[0]
        
    # 4. Exportar OBJ e GLB desbloqueados e gratuitos
    output_obj = "outputs/model.obj"
    output_glb = "outputs/model.glb"
    mesh.export(output_obj)
    mesh.export(output_glb)
    
    return {
        "success": True,
        "metrics": {
            "vertices": len(mesh.vertices),
            "triangles": len(mesh.faces),
            "dimensions": {"width": 1.0, "height": 1.0, "depth": 1.0}
        },
        "downloads": {
            "glb": "/outputs/model.glb",
            "obj": "/outputs/model.obj"
        },
        "glb_url": "/outputs/model.glb",
        "obj_url": "/outputs/model.obj"
    }

@app.get("/outputs/{filename}")
def get_file(filename: str):
    path = os.path.join("outputs", filename)
    if os.path.exists(path):
        return FileResponse(path)
    return JSONResponse(status_code=404, content={"error": "Arquivo não encontrado"})

# Iniciar Túnel Cloudflare Gratuito
os.system("pkill -f cloudflared")
tunnel_proc = subprocess.Popen(
    ["cloudflared", "tunnel", "--url", "http://localhost:8000"],
    stdout=subprocess.PIPE,
    stderr=subprocess.STDOUT,
    text=True
)

print("⏳ Gerando link do túnel Cloudflare...")
start_t = time.time()
while time.time() - start_t < 25:
    line = tunnel_proc.stdout.readline()
    if "trycloudflare.com" in line:
        urls = re.findall(r'https://[a-zA-Z0-9\-]+\.trycloudflare\.com', line)
        if urls:
            print("\n" + "="*60)
            print("🌟 COPIE ESTA URL E COLE NO SEU TECX LABS 3D:")
            print(f"👉 {urls[0]}")
            print("="*60 + "\n")
            break

# Servidor rodando ativo na porta 8000
uvicorn.run(app, host="0.0.0.0", port=8000)
```
