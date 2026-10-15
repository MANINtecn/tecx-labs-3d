# TECX LABS 3D - Script Autônomo para Execução no Google Colab (GPU Gratuita T4/A100)
# TECX SoftHouse - AI & 3D Computer Graphics Division

"""
INSTRUÇÕES PARA RODAR NO GOOGLE COLAB:
1. Abra https://colab.research.google.com
2. Crie um "Novo Notebook"
3. No menu superior: Ambiente de Execução -> Alterar tipo de ambiente de execução -> Selecione T4 GPU
4. Cole o bloco abaixo em UMA ÚNICA CÉLULA e aperte o Play.
"""

UNIFIED_COLAB_CELL = """
# ===============================================================
# TECX LABS 3D - CÉLULA ÚNICA (Instalação + Servidor + Túnel)
# ===============================================================
import os, sys, time, subprocess, re

print("📦 1/3. Instalando dependências (aguarde cerca de 1 min)...")
!pip install -q fastapi uvicorn[standard] python-multipart rembg trimesh PyMCubes scikit-image nest_asyncio pillow fast_simplification

print("🌐 2/3. Baixando Cloudflared...")
!wget -q -nc -O /content/cloudflared https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64
!chmod +x /content/cloudflared

print("📥 3/3. Baixando arquivos do TECX LABS 3D...")
%cd /content
!rm -rf tecx-labs-3d
!git clone -q https://github.com/MANINtecn/tecx-labs-3d.git
%cd /content/tecx-labs-3d/backend

# Limpar processos antigos
!pkill -f cloudflared
!pkill -f uvicorn

print("\n🔍 Iniciando túnel da Cloudflare...")
os.system("nohup /content/cloudflared tunnel --url http://127.0.0.1:8000 > /content/tunnel.log 2>&1 &")

url = None
for _ in range(30):
    time.sleep(1)
    if os.path.exists("/content/tunnel.log"):
        with open("/content/tunnel.log", "r") as f:
            content = f.read()
            match = re.search(r"https://[a-zA-Z0-9\-]+\.trycloudflare\.com", content)
            if match:
                url = match.group(0)
                break

if url:
    print("\\n" + "="*60)
    print("🌟 COPIE ESTA URL ABAIXO:")
    print(f"👉 {url}")
    print("="*60)
    print("\\n💡 Cole essa URL no TECX LABS 3D na aba 'Conectar' do Python Hub!")
    print("⚡ O servidor ficará com o Play girando pois está online aguardando requisições.\\n")
else:
    print("⚠️ Não foi possível obter o link da Cloudflare automaticamente. Verifique /content/tunnel.log")

# Inicia o servidor FastAPI (mantém a célula rodando)
!uvicorn app:app --host 0.0.0.0 --port 8000
"""

