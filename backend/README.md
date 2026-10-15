# TECX LABS 3D — Guia de Instalação e Execução
### Desenvolvido por: TECX SoftHouse

O **TECX LABS 3D** é a solução proprietária para conversão de imagens 2D (armas, asas de Mu Online, itens de Lineage 2, criaturas, veículos) em malhas 3D ultra-realistas com topologia otimizada e exportação direta em **.OBJ**, **.GLB** e **.FBX**.

---

## 🚀 Opção 1: Execução em Máquina Local (Com GPU NVIDIA)

### Requisitos Mínimos:
- Python 3.10 ou 3.11 instalado
- Placa de Vídeo NVIDIA com pelo menos 6GB de VRAM (GTX 1660 Ti, RTX 2060, RTX 3060 ou superior)
- CUDA Toolkit 11.8 ou 12.1 instalado

### Passo a Passo:
1. **Clone ou navegue até a pasta do projeto**:
   ```bash
   cd backend
   ```

2. **Crie e ative um ambiente virtual (recomendado)**:
   ```bash
   python -m venv venv
   # No Windows:
   venv\Scripts\activate
   # No Linux/Mac:
   source venv/bin/activate
   ```

3. **Instale o PyTorch com suporte a CUDA**:
   ```bash
   pip install torch torchvision --index-url https://download.pytorch.org/whl/cu121
   ```

4. **Instale as dependências do TECX LABS 3D**:
   ```bash
   pip install -r requirements.txt
   ```

5. **Inicie o servidor de IA**:
   ```bash
   python app.py
   ```
   O servidor estará ativo em: `http://localhost:8000`
   Acesse a documentação interativa em: `http://localhost:8000/docs`

---

## ☁️ Opção 2: Execução em Nuvem Gratuita (Google Colab com GPU T4)

Se você não possui uma GPU potente na máquina local, pode usar a GPU gratuita do Google Colab:

1. Acesse [Google Colab](https://colab.research.google.com/)
2. Crie um **Novo Notebook**
3. No menu, clique em **Ambiente de Execução** -> **Alterar tipo de ambiente de execução** -> Selecione **T4 GPU**
4. Execute as seguintes células:

```python
# Célula 1: Clonar e instalar
!git clone https://github.com/tecxsofthouse/tecx-labs-3d.git || echo "Criando pasta..."
%cd tecx-labs-3d/backend
!pip install -r requirements.txt
!pip install pyngrok
```

```python
# Célula 2: Gerar URL pública com ngrok e rodar servidor
from pyngrok import ngrok
import os

# Defina seu token ngrok gratuito (opcional):
# ngrok.set_auth_token("SEU_TOKEN")

tunnel = ngrok.connect(8000)
print(f"🔥 TECX LABS 3D API CONECTADA: {tunnel.public_url}")

!python app.py
```

5. Copie a URL gerada pelo ngrok e cole no campo **"Conectar Servidor Python"** no frontend do TECX LABS 3D!

---

## 📦 Formatos de Exportação Suportados:
- **.OBJ (+.MTL)**: Compatível com Blender, Maya, 3ds Max, ZBrush.
- **.GLB**: Formato binário padrão da web, Three.js, Babylon.js e Godot.
- **.FBX**: Formato Game-Ready para Unreal Engine 5, Unity 3D e motores retrô.
