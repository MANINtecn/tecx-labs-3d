# Plano de Implementação: Motor 3D Hard-Surface Estilo Blender & Correção dos Erros Three.js

O usuário enviou o desenho/foto de uma ferramenta (picareta) para tirar ideias do papel e transformar em asset 3D para jogos. No entanto, o pipeline anterior produziu uma malha deformada e cheia de ruído, além de disparar 3 erros no console do navegador ao carregar/renderizar no Three.js.

Este plano estabelece a solução definitiva: eliminação dos 3 erros do console no Three.js e introdução de um **Gerador 3D Hard-Surface Game-Ready** (estilo modelagem limpa do Blender) com arestas vivas, geometria estruturada (cabo e lâmina) e texturas fiéis, mantendo também o suporte neural TripoSR otimizado.

---

## 1. Diagnóstico e Resolução dos 3 Erros do Console Three.js

### Causa Raiz Identificada:
1. **Erro de Atributos & Normais Inválidas no Three.js**: Malhas geradas por marching cubes frequentemente vêm sem normais de vértices pré-calculadas ou com valores `NaN` no `BufferGeometry.computeBoundingSphere()`, fazendo o WebGL lançar avisos e erros de renderização `INVALID_OPERATION`.
2. **Crash no GLTFLoader.parse por Payload Inválido**: Quando o servidor remoto retorna texto/HTML de erro de proxy ou um buffer incompleto, o `atob()` e o `GLTFLoader.parse()` falham silenciosamente disparando exceções de decodificação no console.
3. **Incompatibilidade de Material (Material vs Material[])**: No loop de travessia do `Viewport3D.tsx`, a atribuição de `vertexColors` e `side` a `child.material` não trata arrays de materiais, gerando advertências no renderizador Three.js.

### Ações de Correção:
- **Sanitização de Geometria**: Criar utilitário `sanitizeMeshGeometry(geometry)` que executa `computeVertexNormals()`, remove vértices duplicados/degenerados, calcula esferas delimitadoras válidas e substitui coordenadas `NaN` por zero.
- **Validação do Buffer GLB**: Verificar o número mágico GLB (`0x46546C67`) antes de chamar o `GLTFLoader`, exibindo mensagem clara ao usuário em caso de resposta anômala do servidor.
- **Tratamento Universal de Materiais**: Normalizar materiais em `Viewport3D.tsx` suportando tanto `THREE.Material` único quanto `THREE.Material[]`, além de adicionar listeners de perda e restauração de contexto WebGL (`webglcontextlost`/`webglcontextrestored`).

---

## 2. Motor de Modelagem 3D Hard-Surface (Estilo Blender / Game-Ready)

Para atender ao pedido de "tirar as ideias do papel com a melhor e mais estável modelagem", implementaremos um pipeline de **Geração Hard-Surface Paramétrica e Estruturada com IA Vision**:

### Arquitetura do Novo Gerador 3D:
1. **Análise Anatômica com Gemini Vision**:
   - O endpoint `/api/ai/analyze-and-model-asset` inspeciona o desenho/foto enviado (ex: picareta, machado, espada, escudo, ferramenta, armadura).
   - Extrai:
     - Tipo de asset (`pickaxe`, `axe`, `sword`, `hammer`, `shield`, etc.).
     - Proporções (comprimento do cabo, curvatura da cabeça da picareta, largura da lâmina, ponta chanfrada, acabamento de metal e madeira).
     - Paleta de cores exata (tons do ferro forjado, textura do cabo de madeira, fixadores).
2. **Síntese de Geometria Procedural Limpa (Topology-First)**:
   - Em vez de uma "bolha" orgânica distorcida de marching cubes, o gerador constrói geometria 3D poligonal limpa como feita no Blender:
     - **Cabo (Shaft/Handle)**: Cilindro facetado chanfrado com perfil ergonômico, topo reforçado e empunhadura texturizada.
     - **Cabeça da Picareta/Ferramenta**: Arco curvo extrudado com espessura variável, arestas chanfradas (bevels), ponta perfurante cônica afiada e lâmina oposta.
     - **Colar/Encaixe Central**: Anel de reforço conectando o cabo à cabeça com rebites/fixadores metálicos.
3. **Materiais PBR Game-Ready**:
   - Criação de mapas de materiais PBR (`MeshStandardMaterial`) com `roughness`, `metalness` calibrados e cores extraídas da própria imagem.
   - Arestas vivas e polígonos nítidos no modo Wireframe e Shaded.

---

## 3. Experiência de Interface do Usuário (UI/UX)

- **Seletor de Modo de Geração no Modal de Upload**:
  - **Modo Blender Game-Ready (Recomendado)**: Gera geometria limpa, sem deformações, estruturada por peças com topologia low-poly perfeita para games.
  - **Modo Neural TripoSR (GPU)**: Mantido para quem deseja reconstrução volumétrica de fotos da vida real.
- **Ajustes de Topologia no Dock**:
  - Botão de alternância entre estilo **Low-Poly Facetado** e **Suavizado (Subdivision)**.
  - Exportação direta em `.OBJ`, `.GLB` e `.FBX` 100% testada e compatível com Unity, Unreal Engine e Blender.

---

## 4. Plano de Verificação

1. **Testes do Three.js Viewport**:
   - Confirmar zero erros no console ao carregar modelos e alternar modos de visualização (`textured`, `shaded`, `wireframe`, `xray`).
   - Testar o comportamento com geometrias limpas e buffers binários.
2. **Geração de Ferramentas / Picareta a partir de Desenho**:
   - Carregar a imagem do usuário e verificar se o modelo resultante é uma picareta nítida e reconhecível com cabo e cabeça proporcional.
3. **Compilação e Linter**:
   - Executar `npm run build` e `npm run lint` para garantir integridade completa do TypeScript e das rotas do servidor Express.
