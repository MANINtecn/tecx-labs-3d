# TECX LABS 3D - Script Autônomo para Execução no Google Colab (GPU Gratuita T4/A100)
# TECX SoftHouse - AI & 3D Computer Graphics Division

"""
INSTRUÇÕES PARA RODAR NO GOOGLE COLAB:
1. Abra https://colab.research.google.com
2. Clique em "Novo Notebook"
3. No menu superior, vá em: Ambiente de Execução -> Alterar tipo de ambiente de execução -> Selecione T4 GPU
4. Cole e execute as células abaixo.
"""

# ================= CÉLULA 1: Instalação das Dependências =================
CELL_1_INSTALL = """
!pip install -q fastapi uvicorn[standard] python-multipart rembg trimesh PyMCubes scikit-image nest_asyncio pillow fast_simplification
!wget -q -nc -O cloudflared https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64
!chmod +x cloudflared
print("✅ Dependências do TECX LABS 3D instaladas com sucesso!")
"""

# ================= CÉLULA 2: Inicialização do Servidor e Túnel Cloudflare =================
CELL_2_SERVER = """
# Clone do repositório oficial TECX LABS 3D
%cd /content
!rm -rf tecx-labs-3d
!git clone https://github.com/MANINtecn/tecx-labs-3d.git
%cd /content/tecx-labs-3d/backend

import subprocess
import threading
import time
import re
import nest_asyncio
nest_asyncio.apply()

# Inicia o Cloudflare Tunnel
def start_tunnel():
    time.sleep(2)
    proc = subprocess.Popen(["/content/cloudflared", "tunnel", "--url", "http://localhost:8000"], stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
    for line in proc.stdout:
        match = re.search(r"https://[a-zA-Z0-9\-]+\.trycloudflare\.com", line)
        if match:
            url = match.group(0)
            print("\n" + "="*60)
            print("🌟 COPIE ESTA URL E COLE NO SEU APLICATIVO:")
            print(f"👉 {url}")
            print("="*60 + "\n")

threading.Thread(target=start_tunnel, daemon=True).start()

# Inicia o backend FastAPI
!uvicorn app:app --host 0.0.0.0 --port 8000
"""

print("TECX LABS 3D - Guia de Colab gerado.")
