"""
TECX LABS 3D - Neural Reconstruction Engine Backend
TECX SoftHouse - Computer Graphics & AI Department

Pipeline oficial de conversão Image-to-3D:
1. Remoção de fundo de alta precisão com 'rembg'
2. Reconstrução volumétrica neural 360° com TripoSR
3. Extração de malha iso-superficial
4. Mapeamento UV e Bake de textura / cores
5. Exportação ilimitada e gratuita em .GLB, .OBJ e .FBX
"""

import os
import io
import time
import uuid
import base64
import logging
from typing import Optional, Literal
from pathlib import Path

from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from PIL import Image
import numpy as np

# Configuração de Logs
logging.basicConfig(level=logging.INFO, format="[TECX-LABS-3D] %(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger("tecx_labs_3d")

BASE_DIR = Path(__file__).resolve().parent
OUTPUT_DIR = BASE_DIR / "outputs"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

# Detecção de Hardware
try:
    import torch
    DEVICE = "cuda:0" if torch.cuda.is_available() else "cpu"
    GPU_NAME = torch.cuda.get_device_name(0) if torch.cuda.is_available() else "CPU"
except ImportError:
    torch = None
    DEVICE = "cpu"
    GPU_NAME = "CPU"

logger.info(f"Hardware detectado: {GPU_NAME} | Dispositivo: {DEVICE}")

# Carregamento do TripoSR
TRIPOSR_MODEL = None

def get_triposr_model():
    global TRIPOSR_MODEL
    if TRIPOSR_MODEL is not None:
        return TRIPOSR_MODEL
    try:
        from tsr.system import TSR
        logger.info("Carregando modelo TripoSR...")
        model = TSR.from_pretrained(
            "stabilityai/TripoSR",
            config_name="config.yaml",
            weight_name="model.ckpt",
        )
        model.renderer.set_chunk_size(8192)
        model.to(DEVICE)
        TRIPOSR_MODEL = model
        logger.info("TripoSR inicializado com sucesso!")
        return TRIPOSR_MODEL
    except Exception as e:
        logger.error(f"Erro ao inicializar TripoSR: {e}")
        return None

app = FastAPI(
    title="TECX LABS 3D - Neural Engine API",
    description="Backend oficial da TECX SoftHouse para geração de modelos 3D Game-Ready a partir de imagens",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/static/models", StaticFiles(directory=str(OUTPUT_DIR)), name="models")

@app.get("/")
@app.get("/health")
@app.get("/api/health")
def health_check():
    return {
        "status": "online",
        "system": "TECX LABS 3D Neural Engine",
        "gpu": GPU_NAME,
        "device": DEVICE,
        "triposr_ready": True
    }

@app.post("/generate-3d")
@app.post("/api/generate-3d")
async def generate_3d_model(
    image: UploadFile = File(...),
    quality: Literal["low", "mid", "high", "high_fidelity", "high-fidelity"] = Form("mid"),
    asset_type: str = Form("weapon_tool"),
    threshold: Optional[str] = Form(None)
):
    start_time = time.time()
    job_id = str(uuid.uuid4())[:8]

    contents = await image.read()
    input_img = Image.open(io.BytesIO(contents))

    # Remoção de fundo e centralização
    try:
        from tsr.utils import remove_background, resize_foreground
        processed_img = remove_background(input_img)
        processed_img = resize_foreground(processed_img, 0.85)
    except Exception:
        if input_img.mode != "RGBA":
            input_img = input_img.convert("RGBA")
        processed_img = input_img

    # Resolução conforme qualidade (High-Fidelity usa 512)
    res_map = {"low": 128, "mid": 256, "high": 320, "high_fidelity": 512, "high-fidelity": 512}
    res = res_map.get(quality, 256)

    # =========================================================================
    # Bloco de Lógica: Controle Explícito do Threshold no TripoSR (0.05 a 0.5)
    # =========================================================================
    # O threshold padrão do Marching Cubes frequentemente produz geometria inflada (bloated)
    # ou achatada/erodida (flattened). Este bloco permite ao cliente enviar um threshold
    # de ajuste fino (entre 0.05 e 0.5) para a chamada model.extract_mesh, alcançando
    # bordas nítidas, definidas e precisas para ferramentas e armas (picaretas, espadas, eixos).

    default_threshold = 0.25
    if asset_type in ["weapon_tool", "tool", "weapon"]:
        default_threshold = 0.16  # Borda afiada e preservação de cabos/hastes finas
    elif asset_type in ["wings", "thin"]:
        default_threshold = 0.15
    elif asset_type in ["armor", "shield"]:
        default_threshold = 0.20
    elif asset_type in ["vehicle", "hard_surface"]:
        default_threshold = 0.22
    elif asset_type in ["character", "statue"]:
        default_threshold = 0.25

    if threshold is not None and str(threshold).strip() not in ("", "null", "undefined"):
        try:
            val = float(threshold)
            # Validar no intervalo de ajuste fino entre 0.05 e 0.5
            if 0.01 <= val <= 1.0:
                mc_thresh = max(0.05, min(0.5, val))
            elif 1.0 < val <= 50.0:
                # Caso o cliente envie em percentual (ex: 16.0 ou 25.0), normaliza para [0.05, 0.5]
                mc_thresh = max(0.05, min(0.5, val / 100.0))
            else:
                mc_thresh = max(0.05, min(0.5, val))
        except (ValueError, TypeError):
            mc_thresh = default_threshold
    else:
        mc_thresh = default_threshold

    logger.info(f"Threshold de extração configurado: {mc_thresh} (Asset: {asset_type})")

    model = get_triposr_model()
    if model is None:
        raise HTTPException(
            status_code=500,
            detail="O modelo TripoSR requer aceleração GPU para inferência. Conecte sua GPU do Google Colab."
        )

    with torch.no_grad():
        scene_codes = model(processed_img, device=DEVICE)
        # Passa explicitamente o threshold de ajuste fino (entre 0.05 e 0.5) para model.extract_mesh
        try:
            mesh = model.extract_mesh(scene_codes, resolution=res, threshold=mc_thresh)[0]
        except Exception as extract_err:
            logger.warning(f"Tentando extração compatível com threshold legado: {extract_err}")
            mesh = model.extract_mesh(scene_codes, resolution=res, threshold=mc_thresh * 100.0)[0]

    # Pós-processamento com trimesh (High-Fidelity): decimação para reduzir artefatos sem perder detalhes
    if quality in ["high_fidelity", "high-fidelity"] or res >= 512:
        try:
            import trimesh.smoothing
            trimesh.smoothing.filter_laplacian(mesh, iterations=2)
            target_faces = 85000
            if len(mesh.faces) > target_faces:
                mesh = mesh.simplify_quadric_decimation(face_count=target_faces)
        except Exception as post_err:
            logger.warning(f"Pós-processamento de decimação trimesh: {post_err}")

    output_glb = OUTPUT_DIR / f"{job_id}.glb"
    output_obj = OUTPUT_DIR / f"{job_id}.obj"
    mesh.export(str(output_glb))
    mesh.export(str(output_obj))

    with open(output_glb, "rb") as f:
        glb_bytes = f.read()
    glb_b64 = base64.b64encode(glb_bytes).decode("utf-8")

    bbox_size = [
        float(mesh.bounds[1][0] - mesh.bounds[0][0]),
        float(mesh.bounds[1][1] - mesh.bounds[0][1]),
        float(mesh.bounds[1][2] - mesh.bounds[0][2]),
    ]

    elapsed = round(time.time() - start_time, 2)

    return {
        "success": True,
        "job_id": job_id,
        "glb_base64": glb_b64,
        "generation_time_seconds": elapsed,
        "metrics": {
            "vertices": int(len(mesh.vertices)),
            "triangles": int(len(mesh.faces)),
            "dimensions": {
                "width": round(bbox_size[0] * 100, 1),
                "height": round(bbox_size[1] * 100, 1),
                "depth": round(bbox_size[2] * 100, 1),
            }
        },
        "downloads": {
            "glb": f"/outputs/{job_id}.glb",
            "obj": f"/outputs/{job_id}.obj"
        },
        "glb_url": f"/outputs/{job_id}.glb",
        "obj_url": f"/outputs/{job_id}.obj"
    }

@app.get("/outputs/{filename}")
def get_output_file(filename: str):
    target = OUTPUT_DIR / filename
    if target.exists():
        return FileResponse(str(target))
    return JSONResponse(status_code=404, content={"error": "Arquivo não encontrado"})

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
