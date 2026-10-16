# ===============================================================
# TECX LABS 3D - SERVIDOR NEURAL PROPRIETÁRIO (TECX CORE ENGINE)
# TECX SoftHouse - AI & 3D Computer Graphics Division
# ===============================================================

COLAB_COMPLETE_SCRIPT = '''# ===============================================================
# TECX LABS 3D - SERVIDOR NEURAL PROPRIETÁRIO (TECX CORE ENGINE v2.2)
# ===============================================================

# 1. Instalar bibliotecas essenciais e compilar o torchmcubes nativo com CUDA
!pip install -q --upgrade setuptools
!pip install -q git+https://github.com/tatsy/torchmcubes.git
!pip install -q "torchvision" "transformers" "omegaconf" "einops" "huggingface_hub" "trimesh" "fast-simplification" "PyMCubes" "scipy" "networkx" "fastapi" "uvicorn[standard]" "python-multipart" "nest_asyncio"

import nest_asyncio
nest_asyncio.apply()

# 2. Baixar o motor neural oficial
%cd /content
!rm -rf TripoSR
!git clone -q https://github.com/VAST-AI-Research/TripoSR.git
!sed -i 's/import rembg/# import rembg/g' /content/TripoSR/tsr/utils.py

# 3. Baixar e instalar o túnel Cloudflare seguro
!wget -q -nc https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
!dpkg -i cloudflared-linux-amd64.deb > /dev/null 2>&1

# 4. Configurar Marching Cubes (Nativo CUDA com fallback seguro à prova de cubo)
import sys, types, base64, traceback
import torch
import numpy as np

try:
    import torchmcubes
    print("✅ torchmcubes nativo com CUDA compilado com sucesso!")
except Exception as e:
    print(f"⚠️ torchmcubes nativo não encontrado ({e}). Ativando adaptador seguro com isolamento de borda...")
    import mcubes
    fake_torchmcubes = types.ModuleType("torchmcubes")
    def marching_cubes_adapter(volume, threshold=0.0):
        if isinstance(volume, torch.Tensor):
            vol_np = volume.detach().cpu().numpy()
            device = volume.device
        else:
            vol_np = np.asarray(volume)
            device = "cuda:0" if torch.cuda.is_available() else "cpu"
        # Borda de segurança negativa para NUNCA criar paredes de caixa
        padded = np.pad(vol_np, 1, mode="constant", constant_values=-100.0)
        verts, faces = mcubes.marching_cubes(padded, 0.0)
        verts = verts - 1.0
        verts_t = torch.from_numpy(verts.copy()).float().to(device)
        faces_t = torch.from_numpy(faces.copy().astype(np.int64)).long().to(device)
        return verts_t, faces_t
    fake_torchmcubes.marching_cubes = marching_cubes_adapter
    sys.modules["torchmcubes"] = fake_torchmcubes

# 5. Inicialização dos Motores Neurais na GPU
sys.path.append("/content/TripoSR")

import os, io, time, re, subprocess, asyncio
from PIL import Image
import torchvision.transforms.functional as TF
from transformers import AutoModelForImageSegmentation
import trimesh
from tsr.system import TSR
from tsr.utils import resize_foreground
from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse
import uvicorn

device = "cuda:0" if torch.cuda.is_available() else "cpu"
print(f"\\n🔥 Servidor Neural TECX Ativo em: {device}")

print("⏳ Carregando IA de Recorte Neural de Estúdio (RMBG-1.4)...")
rmbg_model = AutoModelForImageSegmentation.from_pretrained("briaai/RMBG-1.4", trust_remote_code=True)
rmbg_model.to(device)
rmbg_model.eval()
print("✅ IA de Recorte Neural Pronta!")

print("⏳ Carregando Pesos Neurais do Motor 3D...")
tripo_model = TSR.from_pretrained(
    "stabilityai/TripoSR",
    config_name="config.yaml",
    weight_name="model.ckpt",
)
tripo_model.renderer.set_chunk_size(8192)
tripo_model.to(device)
print("✅ Motor 3D 360° Pronto!")

os.makedirs("outputs", exist_ok=True)

# 6. Pipeline de Pré-processamento com Diagnóstico e Desempacotamento de Tensor
def remove_background_neural(img: Image.Image, logs: list) -> Image.Image:
    \"\"\"Isola a silhueta da picareta/objeto com qualidade de estúdio via RMBG-1.4\"\"\"
    try:
        orig_size = img.size
        input_img = img.convert("RGB")
        w, h = orig_size
        scale = 1024.0 / max(w, h)
        new_w, new_h = max(16, int(w * scale)), max(16, int(h * scale))
        resized_input = input_img.resize((new_w, new_h), Image.BILINEAR)
        
        canvas = Image.new("RGB", (1024, 1024), (255, 255, 255))
        paste_x = (1024 - new_w) // 2
        paste_y = (1024 - new_h) // 2
        canvas.paste(resized_input, (paste_x, paste_y))
        
        input_tensor = TF.to_tensor(canvas).unsqueeze(0).to(device)
        input_tensor = TF.normalize(input_tensor, [0.5, 0.5, 0.5], [1.0, 1.0, 1.0])
        
        with torch.no_grad():
            output = rmbg_model(input_tensor)
            # Desempacotar lista aninhada do modelo RMBG-1.4 com segurança
            while isinstance(output, (list, tuple)):
                output = output[0]
            if hasattr(output, "sigmoid"):
                preds = output.sigmoid().cpu().squeeze()
            else:
                preds = torch.sigmoid(output).cpu().squeeze()
        
        # Converte para PIL Image com escala 0..255
        full_mask = TF.to_pil_image(preds)
        cropped_mask = full_mask.crop((paste_x, paste_y, paste_x + new_w, paste_y + new_h))
        mask = cropped_mask.resize(orig_size, Image.BILINEAR)
        
        rgba_img = img.convert("RGBA")
        rgba_img.putalpha(mask)
        logs.append(f"✅ Recorte RMBG-1.4 concluído com sucesso ({orig_size[0]}x{orig_size[1]}px). Fundo removido.")
        return rgba_img
    except Exception as e:
        err_msg = f"❌ Falha no recorte RMBG-1.4: {e}"
        print(err_msg)
        logs.append(err_msg)
        if img.mode != "RGBA":
            return img.convert("RGBA")
        return img

def prepare_for_triposr(rgba_img: Image.Image, logs: list) -> Image.Image:
    \"\"\"Centraliza com 85% de escala e mescla contra cinza neutro (0.5)\"\"\"
    scaled_img = resize_foreground(rgba_img, 0.85)
    img_np = np.array(scaled_img).astype(np.float32) / 255.0
    alpha = img_np[:, :, 3:4]
    rgb = img_np[:, :, :3]
    blended = rgb * alpha + (1.0 - alpha) * 0.5
    logs.append(f"✅ Enquadramento ótico TripoSR aplicado (escala 85% e alpha blend 0.5 cinza neutro).")
    return Image.fromarray((blended * 255.0).astype(np.uint8))

# 7. Servidor FastAPI com Telemetria e Logs Detalhados
app = FastAPI(title="TECX LABS 3D Engine")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
@app.get("/health")
@app.get("/api/health")
def health_check():
    return {
        "status": "online",
        "system": "TECX LABS 3D Neural Suite v2.2",
        "ready": True
    }

@app.post("/generate-3d")
@app.post("/api/generate-3d")
async def generate_3d(
    image: UploadFile = File(...),
    quality: str = Form("mid"),
    asset_type: str = Form("weapon_tool"),
    threshold: str = Form(None)
):
    start_time = time.time()
    server_logs = []
    try:
        contents = await image.read()
        input_img = Image.open(io.BytesIO(contents))
        server_logs.append(f"📥 Imagem recebida pelo servidor ({input_img.size[0]}x{input_img.size[1]}px, formato: {input_img.format}).")
        
        # 1. Recorte Neural de Fundo
        rgba_img = remove_background_neural(input_img, server_logs)
        
        # Salvar preview da imagem segmentada em base64 para inspeção no app
        buf = io.BytesIO()
        rgba_img.save(buf, format="PNG")
        seg_preview_b64 = base64.b64encode(buf.getvalue()).decode("utf-8")
        
        # 2. Preparação Ótica
        tripo_input = prepare_for_triposr(rgba_img, server_logs)
        
        res_map = {"low": 128, "mid": 256, "high": 320}
        res = res_map.get(quality, 256)
        server_logs.append(f"⚙️ Iniciando inferência neural 360° em resolução {res}x{res}x{res}...")
        
        # 3. Inferência Neural (Passa lista de imagens conforme especificação oficial do TSR)
        with torch.no_grad():
            scene_codes = tripo_model([tripo_input], device=device)
            server_logs.append(f"🧠 Tensores volumétricos calculados pelo backbone TripoSR.")
            
            # 4. Extração de Isosuperfície com cores de vértice
            mesh = tripo_model.extract_mesh(scene_codes, True, resolution=res)[0]
            server_logs.append(f"📐 Malha bruta extraída via Marching Cubes ({len(mesh.vertices)} vértices, {len(mesh.faces)} faces).")
        
        # 5. Pipeline de Engenharia Reversa (Estilo Meshy / Tripo AI Pro)
        # A. Eliminar ruídos e fragmentos soltos ("lixaiada"), isolando apenas o corpo principal da arma
        try:
            comps = mesh.split(only_watertight=False)
            if len(comps) > 1:
                comps = sorted(comps, key=lambda c: len(c.faces), reverse=True)
                mesh = comps[0]
                server_logs.append(f"🧹 Descartados {len(comps) - 1} fragmentos flutuantes. Malha da arma isolada.")
        except Exception as e:
            server_logs.append(f"ℹ️ Limpeza de fragmentos: {e}")

        # B. Retopologia e Decimação Low-Poly (Gera malha limpa para jogos, sem o milhão de polígonos)
        target_faces = {"low": 8000, "mid": 20000, "high": 50000}.get(quality, 20000)
        if len(mesh.faces) > target_faces:
            try:
                import fast_simplification
                reduction = 1.0 - (target_faces / len(mesh.faces))
                simp_verts, simp_faces = fast_simplification.simplify(
                    mesh.vertices, mesh.faces, target_reduction=reduction
                )
                mesh = trimesh.Trimesh(vertices=simp_verts, faces=simp_faces, process=False)
                server_logs.append(f"📉 Retopologia Low-Poly aplicada: reduzido para {len(mesh.faces)} triângulos ({quality}).")

                # C. Re-amostragem das cores neurais na nova malha Low-Poly
                with torch.no_grad():
                    v_tensor = torch.from_numpy(mesh.vertices).float().to(device)
                    sampled_colors = tripo_model.renderer.query_triplane(
                        tripo_model.decoder,
                        v_tensor,
                        scene_codes[0]
                    )["color"]
                    mesh.visual = trimesh.visual.ColorVisuals(
                        vertex_colors=(sampled_colors.cpu().numpy() * 255.0).clip(0, 255).astype(np.uint8)
                    )
                    server_logs.append(f"🎨 Cores e texturas neurais preservadas na malha Low-Poly.")
            except Exception as e:
                server_logs.append(f"ℹ️ Decimação Low-Poly: {e}")

        # D. Suavização de superfície laplaciana suave
        try:
            trimesh.smoothing.filter_laplacian(mesh, iterations=1)
            server_logs.append(f"✨ Acabamento de superfície aplicado com sucesso.")
        except Exception as e:
            server_logs.append(f"⚠️ Aviso na suavização: {e}")
            
        output_obj = "outputs/model.obj"
        output_glb = "outputs/model.glb"
        mesh.export(output_obj)
        mesh.export(output_glb)
        
        elapsed = round(time.time() - start_time, 2)
        server_logs.append(f"✨ Geração concluída com sucesso em {elapsed}s!")
        
        with open(output_glb, "rb") as f:
            glb_bytes = f.read()
        glb_b64 = base64.b64encode(glb_bytes).decode("utf-8")
        
        return {
            "success": True,
            "metrics": {
                "vertices": len(mesh.vertices),
                "triangles": len(mesh.faces),
                "elapsed_seconds": elapsed,
                "dimensions": {
                    "width": round(float(mesh.extents[0]), 2),
                    "height": round(float(mesh.extents[1]), 2),
                    "depth": round(float(mesh.extents[2]), 2)
                }
            },
            "glb_base64": glb_b64,
            "segmented_preview": seg_preview_b64,
            "server_logs": server_logs,
            "downloads": {
                "glb": "/outputs/model.glb",
                "obj": "/outputs/model.obj"
            }
        }
    except Exception as e:
        tb = traceback.format_exc()
        server_logs.append(f"💥 ERRO CRÍTICO NO SERVIDOR: {e}")
        print(f"❌ ERRO NA GERAÇÃO 3D:\\n{tb}")
        return JSONResponse(status_code=500, content={"error": str(e), "traceback": tb, "server_logs": server_logs})

@app.get("/outputs/{filename}")
def get_file(filename: str):
    path = os.path.join("outputs", filename)
    if os.path.exists(path):
        return FileResponse(path)
    return JSONResponse(status_code=404, content={"error": "Arquivo não encontrado"})

# 8. Túnel Seguro
os.system("pkill -f cloudflared")
tunnel_proc = subprocess.Popen(
    ["cloudflared", "tunnel", "--url", "http://localhost:8000"],
    stdout=subprocess.PIPE,
    stderr=subprocess.STDOUT,
    text=True,
    bufsize=1
)

async def monitor_tunnel():
    print("⏳ Aguardando URL pública do túnel...")
    for _ in range(120):
        await asyncio.sleep(0.5)
        line = tunnel_proc.stdout.readline()
        if "trycloudflare.com" in line:
            urls = re.findall(r'https://[a-zA-Z0-9\-]+\.trycloudflare\.com', line)
            if urls:
                print("\\n" + "="*65)
                print("🌟 SERVIDOR TECX LABS 3D ONLINE! COPIE ESTA URL E COLE NO APP:")
                print(f"👉 {urls[0]}")
                print("="*65 + "\\n")
                break

asyncio.create_task(monitor_tunnel())

config = uvicorn.Config(app, host="0.0.0.0", port=8000, loop="asyncio")
server = uvicorn.Server(config)
await server.serve()
'''

if __name__ == "__main__":
    print(COLAB_COMPLETE_SCRIPT)
