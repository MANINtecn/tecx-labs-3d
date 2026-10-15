import React, { useState } from 'react';
import { Sparkles, X, Wand2, RefreshCw, CheckCircle, AlertCircle, Lightbulb } from 'lucide-react';
import { PolyQuality } from '../types';

interface AIConceptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerateFromConcept: (
    imageDataUrl: string,
    name: string,
    quality: PolyQuality
  ) => void;
  isProcessing: boolean;
}

export const AIConceptModal: React.FC<AIConceptModalProps> = ({
  isOpen,
  onClose,
  onGenerateFromConcept,
  isProcessing,
}) => {
  const [prompt, setPrompt] = useState('');
  const [style, setStyle] = useState<'lineage' | 'mu_online' | 'cyberpunk' | 'fantasy'>('lineage');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [generatedPreview, setGeneratedPreview] = useState<string | null>(null);
  const [assetName, setAssetName] = useState<string>('Artefato 3D Gerado por IA');
  const [quality, setQuality] = useState<PolyQuality>('mid');
  const [technicalDetails, setTechnicalDetails] = useState<string | null>(null);

  if (!isOpen) return null;

  const quickPrompts = [
    'Asas do Arcanjo Sagradas Douradas com penas brilhantes de Mu Online',
    'Adaga Dupla Amaldiçoada Demoníaca Zariche de Lineage 2',
    'Montante Dragon Slayer pesado com gumes de aço e escamas',
    'Capacete Tático Cibernético com visor holográfico azul',
  ];

  const handleCreateConcept = async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/ai/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, style }),
      });

      const data = await res.json();

      if (data.success && data.imageUrl) {
        setGeneratedPreview(data.imageUrl);
        setAssetName(prompt.slice(0, 32).trim());
        setTechnicalDetails(data.description || 'Imagem gerada com sucesso via Gemini.');
      } else {
        setErrorMessage(data.error || 'Não foi possível gerar a imagem com a IA no momento.');
        if (data.details) {
          setTechnicalDetails(data.details);
        }
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro de conexão com o servidor de IA.');
    } finally {
      setLoading(false);
    }
  };

  const handleApply3D = () => {
    if (!generatedPreview) return;
    onGenerateFromConcept(generatedPreview, assetName, quality);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm select-none">
      <div className="bg-[#0b0f19] border border-cyan-800/40 rounded-2xl w-full max-w-xl shadow-2xl flex flex-col overflow-hidden max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-[#0f172a]">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-fuchsia-400" />
            <h3 className="font-bold text-slate-100 text-sm tracking-wide font-['Chakra_Petch',sans-serif]">
              IA CONCEPT STUDIO (GEMINI 3.8 FLASH)
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto space-y-4">
          <div>
            <label className="text-xs font-mono text-slate-300 block mb-1">
              Descreva o Asset 3D que deseja criar via IA:
            </label>
            <textarea
              rows={3}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Ex: Asas de arcanjo douradas com penas celestiais de Mu Online..."
              className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 placeholder-slate-500 font-sans"
            />
          </div>

          {/* Sugestões Rápidas */}
          <div>
            <div className="text-[11px] font-mono text-slate-400 mb-1.5 flex items-center gap-1">
              <Lightbulb className="w-3 h-3 text-amber-400" />
              <span>Ideias Rápidas:</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {quickPrompts.map((p, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setPrompt(p)}
                  className="px-2 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-cyan-300 text-[10px] font-mono transition-colors cursor-pointer"
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Estilo Visual */}
          <div>
            <label className="text-xs font-mono text-slate-400 block mb-1.5">
              Estilo Estético do Asset:
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[
                { id: 'lineage', label: 'Lineage 2' },
                { id: 'mu_online', label: 'Mu Online' },
                { id: 'cyberpunk', label: 'Cyberpunk' },
                { id: 'fantasy', label: 'Dark Fantasy' },
              ].map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setStyle(s.id as any)}
                  className={`py-1.5 px-2 rounded-lg text-xs font-mono border transition-colors cursor-pointer text-center ${
                    style === s.id
                      ? 'bg-fuchsia-950/40 text-fuchsia-300 border-fuchsia-500 font-bold'
                      : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Botão de Geração Real com IA */}
          <button
            onClick={handleCreateConcept}
            disabled={!prompt.trim() || loading}
            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-fuchsia-600 to-indigo-600 hover:from-fuchsia-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-fuchsia-600/20 border border-fuchsia-400/40 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Processando com Gemini...</span>
              </>
            ) : (
              <>
                <Wand2 className="w-4 h-4" />
                <span>Gerar Conceito Real com Gemini</span>
              </>
            )}
          </button>

          {/* Mensagem de Erro Real se falhar */}
          {errorMessage && (
            <div className="p-3 bg-red-950/40 border border-red-500/50 rounded-xl text-xs text-red-300 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">{errorMessage}</p>
                {technicalDetails && <p className="text-[11px] text-slate-400 mt-1">{technicalDetails}</p>}
              </div>
            </div>
          )}

          {/* Preview da Imagem Real Gerada */}
          {generatedPreview && (
            <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-cyan-300 font-bold truncate max-w-[280px]">
                  {assetName}
                </span>
                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-800/40 shrink-0">
                  Imagem Real Gerada
                </span>
              </div>

              <div className="flex gap-3 items-center">
                <div className="w-28 h-28 rounded-lg bg-slate-900 border border-slate-700 flex items-center justify-center p-1 overflow-hidden shrink-0">
                  <img
                    src={generatedPreview}
                    alt="Concept Preview"
                    className="max-w-full max-h-full object-contain"
                  />
                </div>
                <div className="text-[11px] text-slate-400 space-y-1">
                  <p className="text-slate-200">
                    A imagem conceitual gerada acima será enviada para o pipeline de reconstrução volumétrica 3D, UV mapping e bake PBR.
                  </p>
                  <div className="pt-1">
                    <span className="text-[10px] font-mono text-slate-400 block mb-1">Qualidade:</span>
                    <div className="flex gap-1.5">
                      {(['low', 'mid', 'high'] as PolyQuality[]).map((q) => (
                        <button
                          key={q}
                          type="button"
                          onClick={() => setQuality(q)}
                          className={`px-2 py-0.5 rounded text-[10px] font-mono border transition-colors ${
                            quality === q
                              ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500'
                              : 'bg-slate-900 text-slate-400 border-slate-800'
                          }`}
                        >
                          {q.toUpperCase()}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-[#0f172a] flex items-center justify-end gap-2.5">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors cursor-pointer"
          >
            Fechar
          </button>
          <button
            disabled={!generatedPreview || isProcessing}
            onClick={handleApply3D}
            className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-cyan-600/20 border border-cyan-400/40 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer flex items-center gap-2"
          >
            <CheckCircle className="w-4 h-4" />
            <span>Reconstruir em 3D no Viewport</span>
          </button>
        </div>
      </div>
    </div>
  );
};
