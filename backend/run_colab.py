# ===============================================================
# TECX LABS 3D - SERVIDOR PROPRIETÁRIO (TRIPOSR GPU T4 / COLAB)
# TECX SoftHouse - AI & 3D Computer Graphics Division
# ===============================================================

"""
COPIE E COLE O BLOCO ABAIXO DIRETAMENTE EM UMA CÉLULA DO GOOGLE COLAB:
"""

COLAB_COMPLETE_SCRIPT = '''# ===============================================================
# TECX LABS 3D - SERVIDOR PROPRIETÁRIO TRIPOSR (COMPATÍVEL COLAB PYTHON 3.12)
# ===============================================================

# 1. Instalar bibliotecas sem conflitos de versão do Python 3.12 no Colab
!pip install -q "numpy<2.0.0" "scipy<1.13.0"
!pip install -q fastapi uvicorn[standard] python-multipart rembg trimesh einops transformers omegaconf huggingface_hub PyMCubes fast-simplification

# 2. Baixar o repositório TripoSR oficial
%cd /content
!rm -rf TripoSR
!git clone -q https://github.com/VAST-AI-Research/TripoSR.git

# 3. Baixar e instalar o túnel Cloudflare seguro
!wget -q -nc https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
!dpkg -i cloudflared-linux-amd64.deb > /dev/null 2>&1

# 4. Adaptador de Alta Precisão para Marching Cubes (Evita deformações de coordenadas e eixos)
import sys, types, base64
import torch
import numpy as np
import mcubes

fake_torchmcubes = types.ModuleType("torchmcubes")

def marching_cubes_adapter(volume, threshold=0.25):
    if isinstance(volume, torch.Tensor):
        vol_np = volume.detach().cpu().numpy()
        device = volume.device
    else:
        vol_np = np.asarray(volume)
        device = "cuda:0" if torch.cuda.is_available() else "cpu"
    
    t = float(threshold)
    v_max = float(vol_np.max()) if len(vol_np) > 0 else 1.0
    # Compatibilidade com densidade em escala [0.05, 0.5] e densidade não-normalizada
    if v_max > 2.0 and t <= 1.0:
        actual_thresh = t * 100.0
    else:
        actual_thresh = t
    
    # mcubes.marching_cubes retorna coordenadas (x, y, z) idênticas ao torchmcubes C++
    verts, faces = mcubes.marching_cubes(vol_np, actual_thresh)
    verts_t = torch.from_numpy(verts.copy()).float().to(device)
    faces_t = torch.from_numpy(faces.copy().astype(np.int64)).long().to(device)
    return verts_t, faces_t

fake_torchmcubes.marching_cubes = marching_cubes_adapter
sys.modules["torchmcubes"] = fake_torchmcubes

# 5. Inicialização do Servidor Neural TripoSR
sys.path.append("/content/TripoSR")

import os, io, time, re, subprocess
from PIL import Image
import trimesh
from tsr.system import TSR
from tsr.utils import remove_background, resize_foreground
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
print("🔥 MOTOR NEURAL TRIPOSR PRONTO NA GPU!")

def safe_process_image(img: Image.Image, do_remove_bg: bool = True) -> Image.Image:
    if do_remove_bg:
        try:
            img = remove_background(img)
        except Exception as e:
            print(f"Aviso rembg: {e}")
            if img.mode != "RGBA":
                img = img.convert("RGBA")
    else:
        if img.mode != "RGBA":
            img = img.convert("RGBA")
    # Centralização precisa com 85% de escala para garantir enquadramento neural 360
    img = resize_foreground(img, 0.85)
    return img

# Endpoints de Conexão
@app.get("/")
@app.get("/health")
@app.get("/api/health")
def health_check():
    return {
        "status": "online",
        "system": "TECX LABS 3D Neural Engine",
        "gpu": torch.cuda.get_device_name(0) if torch.cuda.is_available() else "CPU",
        "triposr_ready": True
    }

# Endpoint de Reconstrução 3D Volumétrica Real
@app.post("/generate-3d")
@app.post("/api/generate-3d")
async def generate_3d(
    image: UploadFile = File(...), 
    quality: str = Form("mid"),
    asset_type: str = Form("weapon_tool"),
    threshold: str = Form(None)
):
    contents = await image.read()
    input_img = Image.open(io.BytesIO(contents))
    
    # 1. Remoção neural de fundo e centralização precisa
    processed_img = safe_process_image(input_img, do_remove_bg=True)
    
    # 2. Resolução conforme qualidade (High-Fidelity usa 512)
    res_map = {
        "low": 128, 
        "mid": 256, 
        "high": 320, 
        "high_fidelity": 512, 
        "high-fidelity": 512
    }
    res = res_map.get(quality, 256)
    
    # =========================================================================
    # 3. Bloco de Lógica: Controle Explícito do Threshold no TripoSR (0.05 a 0.5)
    # =========================================================================
    # O threshold padrão do Marching Cubes frequentemente produz geometria inflada (bloated)
    # ou achatada/erodida (flattened). Este bloco permite ao cliente enviar um threshold
    # de ajuste fino (entre 0.05 e 0.5) para a chamada model.extract_mesh, alcançando
    # bordas nítidas, definidas e precisas para ferramentas e armas (picaretas, espadas, eixos).
    
    default_thresh = 0.25
    if asset_type in ["weapon_tool", "tool", "weapon"]:
        default_thresh = 0.16  # Borda afiada e preservação de cabos/hastes finas
    elif asset_type in ["wings", "thin"]:
        default_thresh = 0.15
    elif asset_type in ["armor", "shield"]:
        default_thresh = 0.20
    elif asset_type in ["vehicle", "hard_surface"]:
        default_thresh = 0.22
    elif asset_type in ["character", "statue"]:
        default_thresh = 0.25

    if threshold and str(threshold).strip() not in ("", "null", "undefined"):
        try:
            val = float(threshold)
            if 0.01 <= val <= 1.0:
                mc_thresh = max(0.05, min(0.5, val))
            elif 1.0 < val <= 50.0:
                mc_thresh = max(0.05, min(0.5, val / 100.0))
            else:
                mc_thresh = max(0.05, min(0.5, val))
        except (ValueError, TypeError):
            mc_thresh = default_thresh
    else:
        mc_thresh = default_thresh
    
    print(f"⚙️ TripoSR Inferência: Resolução={res}, Threshold={mc_thresh} (Ajuste Fino 0.05-0.5), Asset={asset_type}, Qualidade={quality}")
    
    # 4. Reconstrução volumétrica neural real 360° com TripoSR na GPU
    with torch.no_grad():
        scene_codes = model(processed_img, device=device)
        try:
            mesh = model.extract_mesh(scene_codes, resolution=res, threshold=mc_thresh)[0]
        except Exception as extract_err:
            print(f"Fallback de threshold: {extract_err}")
            mesh = model.extract_mesh(scene_codes, resolution=res, threshold=mc_thresh * 100.0)[0]
        
    # 5. Pós-processamento High-Fidelity: Suavização + Decimação Trimesh
    if quality in ["high_fidelity", "high-fidelity"] or res >= 512:
        try:
            print("✨ Executando pós-processamento High-Fidelity (Suavização Laplacian + Decimação Trimesh)...")
            # Suavização suave para atenuar imperfeições de voxel do Marching Cubes em 512
            trimesh.smoothing.filter_laplacian(mesh, iterations=2)
            # Decimação quadric error metric para manter arestas e silhueta do asset sem estourar o viewport
            target_faces = 85000
            if len(mesh.faces) > target_faces:
                mesh = mesh.simplify_quadric_decimation(face_count=target_faces)
            print(f"✅ Mesh otimizada: {len(mesh.vertices)} vértices, {len(mesh.faces)} triângulos.")
        except Exception as post_err:
            print(f"Aviso pós-processamento trimesh: {post_err}")

    # 6. Exportar arquivos 3D reais
    output_obj = "outputs/model.obj"
    output_glb = "outputs/model.glb"
    mesh.export(output_obj)
    mesh.export(output_glb)
    
    # 7. Ler GLB em Base64 para envio instantâneo e sem falhas de transferência
    with open(output_glb, "rb") as f:
        glb_bytes = f.read()
    glb_b64 = base64.b64encode(glb_bytes).decode("utf-8")
    
    bbox_size = [
        float(mesh.bounds[1][0] - mesh.bounds[0][0]),
        float(mesh.bounds[1][1] - mesh.bounds[0][1]),
        float(mesh.bounds[1][2] - mesh.bounds[0][2]),
    ]
    
    return {
        "success": True,
        "glb_base64": glb_b64,
        "metrics": {
            "vertices": int(len(mesh.vertices)),
            "triangles": int(len(mesh.faces)),
            "dimensions": {
                "width": round(bbox_size[0] * 100, 1),
                "height": round(bbox_size[1] * 100, 1),
                "depth": round(bbox_size[2] * 100, 1)
            }
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
            print("\\n" + "="*60)
            print("🌟 COPIE ESTA URL E COLE NO SEU TECX LABS 3D:")
            print(f"👉 {urls[0]}")
            print("="*60 + "\\n")
            break

# Servidor rodando ativo na porta 8000
uvicorn.run(app, host="0.0.0.0", port=8000)
'''

if __name__ == "__main__":
    print(COLAB_COMPLETE_SCRIPT)
