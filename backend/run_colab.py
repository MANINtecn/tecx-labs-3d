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
!nvidia-smi
!pip install -q fastapi uvicorn[standard] python-multipart pyngrok rembg trimesh PyMCubes einops transformers huggingface_hub
!pip install -q git+https://github.com/VAST-AI-Research/TripoSR.git
print("Dependências do TECX LABS 3D instaladas com sucesso!")
"""

# ================= CÉLULA 2: Inicialização do Servidor e Túnel Ngrok =================
CELL_2_SERVER = """
from pyngrok import ngrok
import uvicorn
import threading

# Insira seu token gratuito do ngrok (opcional se usar localtunnel/bore)
# ngrok.set_auth_token("SEU_TOKEN_NGROK")

# Abrir túnel público
public_url = ngrok.connect(8000).public_url
print(f"🔥 TECX LABS 3D BACKEND ONLINE!")
print(f"🔗 URL Pública para colar no Web App: {public_url}")

# Rodar backend
!python app.py
"""

print("TECX LABS 3D - Guia de Colab gerado.")
