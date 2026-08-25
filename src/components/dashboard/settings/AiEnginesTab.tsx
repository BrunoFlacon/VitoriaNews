/**
 * AiEnginesTab — Dashboard settings tab for AI image engines.
 *
 * Lets users:
 * - Pick default image engine (Seedream / Nano Banana via OpenRouter, Gemini,
 *   NVIDIA NIM, OpenAI, custom OpenAI-compatible endpoint, Hugging Face, AI Horde…)
 * - Manage API keys per provider (stored locally on this device)
 * - Toggle prompt enhancement
 * - Test-generate an image to verify setup
 */

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Sparkles, Check, Loader2, Key, ExternalLink, Wand2,
  Zap, Gauge, Crown, Info, BrainCircuit, Globe,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import {
  IMAGE_ENGINES,
  getAiImagePrefs,
  saveAiImagePrefs,
  generateAiImage,
  engineHasKey,
  type ImageEngineId,
  type AiImagePrefs,
} from '@/components/dashboard/studio/ai-tools/aiImageGenerator';

const SPEED_ICON = { slow: Gauge, medium: Zap, fast: Zap } as const;

/** Fallback order used when the selected engine has no credentials */
const FALLBACK_ORDER: ImageEngineId[] = [
  'openrouter-seedream', 'openrouter-nanobanana', 'gemini', 'nvidia',
  'custom', 'huggingface', 'horde', 'openai',
];

function resolveFallbackName(prefs: AiImagePrefs): string | null {
  const fallbackId = FALLBACK_ORDER.find(id => engineHasKey(id, prefs));
  return fallbackId ? IMAGE_ENGINES.find(e => e.id === fallbackId)?.name ?? null : null;
}

// ── Reusable key row ─────────────────────────────────────────

interface KeyRowConfig {
  prefKey: 'openrouterKey' | 'geminiApiKey' | 'nvidiaApiKey' | 'openaiApiKey' | 'huggingfaceKey';
  label: string;
  hint: string;
  placeholder: string;
  linkHref?: string;
  linkLabel?: string;
}

const KEY_ROWS: KeyRowConfig[] = [
  {
    prefKey: 'openrouterKey',
    label: 'OpenRouter',
    hint: 'Habilita Seedream 4.5 e Nano Banana. Pode ser a mesma chave que você já usa para texto.',
    placeholder: 'sk-or-v1-...',
    linkHref: 'https://openrouter.ai/settings/keys',
    linkLabel: 'Obter chave',
  },
  {
    prefKey: 'geminiApiKey',
    label: 'Google Gemini (AI Studio)',
    hint: 'Nano Banana oficial com nível grátis do Google AI Studio.',
    placeholder: 'AIza...',
    linkHref: 'https://aistudio.google.com/apikey',
    linkLabel: 'Chave grátis',
  },
  {
    prefKey: 'nvidiaApiKey',
    label: 'NVIDIA NIM',
    hint: 'FLUX.1 hospedado pela NVIDIA. Conta de dev grátis dá 1.000 créditos.',
    placeholder: 'nvapi-...',
    linkHref: 'https://build.nvidia.com/',
    linkLabel: 'Chave grátis',
  },
  {
    prefKey: 'openaiApiKey',
    label: 'OpenAI',
    hint: 'GPT Image / DALL-E 3 oficiais. Requer créditos na plataforma.',
    placeholder: 'sk-...',
    linkHref: 'https://platform.openai.com/api-keys',
    linkLabel: 'Obter chave',
  },
  {
    prefKey: 'huggingfaceKey',
    label: 'Hugging Face',
    hint: 'FLUX.1-schnell oficial. Token de leitura grátis (hf_...).',
    placeholder: 'hf_...',
    linkHref: 'https://huggingface.co/settings/tokens',
    linkLabel: 'Token grátis',
  },
];

const EngineKeyRow = ({
  config,
  value,
  onSave,
}: {
  config: KeyRowConfig;
  value: string;
  onSave: (key: string) => void;
}) => {
  const [editing, setEditing] = useState(false);
  const [input, setInput] = useState('');

  return (
    <div className="border-t border-border/60 pt-4 first:border-t-0 first:pt-0">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 min-w-0">
          <div className="p-2 bg-primary/10 rounded-lg shrink-0"><BrainCircuit className="w-4 h-4 text-primary" /></div>
          <div className="min-w-0">
            <h4 className="font-bold text-sm">{config.label}</h4>
            <p className="text-xs text-muted-foreground mt-0.5">{config.hint}</p>
          </div>
        </div>
        {config.linkHref && (
          <a
            href={config.linkHref}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-primary hover:underline inline-flex items-center gap-1 whitespace-nowrap shrink-0"
          >
            {config.linkLabel ?? 'Obter chave'} <ExternalLink className="w-3 h-3" />
          </a>
        )}
      </div>

      {value ? (
        <div className="mt-3 flex items-center justify-between gap-3 bg-green-500/5 border border-green-500/25 rounded-xl p-3">
          <span className="text-sm flex items-center gap-2 text-green-600 font-medium">
            <Check className="w-4 h-4 shrink-0" /> Configurada ({value.slice(0, Math.min(8, value.length))}•••)
          </span>
          <Button variant="ghost" size="sm" onClick={() => { setInput(''); onSave(''); }}>
            Remover
          </Button>
        </div>
      ) : editing ? (
        <form
          className="mt-3 flex gap-2"
          onSubmit={(e) => { e.preventDefault(); onSave(input.trim()); setEditing(false); }}
          autoComplete="off"
        >
          <Input
            type="password"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={config.placeholder}
            className="max-w-xs"
            autoComplete="new-password"
          />
          <Button type="submit" size="sm">Salvar</Button>
          <Button type="button" size="sm" variant="ghost" onClick={() => setEditing(false)}>Cancelar</Button>
        </form>
      ) : (
        <Button variant="outline" size="sm" className="mt-3" onClick={() => setEditing(true)}>
          <Key className="w-3.5 h-3.5 mr-2" /> Adicionar chave
        </Button>
      )}
    </div>
  );
};

// ── Main tab ─────────────────────────────────────────────────

export const AiEnginesTab = () => {
  const { toast } = useToast();
  const [prefs, setPrefs] = useState<AiImagePrefs>(() => getAiImagePrefs());
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; url?: string; engine?: string } | null>(null);

  // Live-sync when prefs change elsewhere (e.g. studio panel)
  useEffect(() => {
    const handler = () => setPrefs(getAiImagePrefs());
    window.addEventListener('ai-image-prefs-updated', handler);
    return () => window.removeEventListener('ai-image-prefs-updated', handler);
  }, []);

  const selectEngine = useCallback((engine: ImageEngineId) => {
    setPrefs(saveAiImagePrefs({ defaultEngine: engine }));
    toast({
      title: 'Motor padrão atualizado',
      description: `Novas gerações usarão ${IMAGE_ENGINES.find(e => e.id === engine)?.name}.`,
      duration: 2500,
    });
  }, [toast]);

  const toggleEnhance = useCallback((checked: boolean) => {
    setPrefs(saveAiImagePrefs({ enhancePrompts: checked }));
  }, []);

  const savePref = useCallback((patch: Partial<AiImagePrefs>, successMsg?: string) => {
    setPrefs(saveAiImagePrefs(patch));
    if (successMsg) {
      toast({ title: successMsg, duration: 2500 });
    }
  }, [toast]);

  const runTest = useCallback(async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const result = await generateAiImage({
        prompt: 'colorful abstract test pattern, vibrant gradient',
        width: 512,
        height: 512,
        style: 'digital-art',
        enhance: false,
      });
      const ok = result.engine !== 'placeholder';
      setTestResult({ ok, url: result.dataUrl, engine: result.engine });
      if (ok) {
        toast({ title: '✅ Motor funcionando', description: `Gerado via ${result.engine}.`, duration: 3000 });
      } else {
        toast({
          title: '⚠️ Motor indisponível',
          description: 'Recebeu placeholder. Verifique conexão ou configure uma chave.',
          variant: 'destructive',
        });
      }
    } finally {
      setTesting(false);
    }
  }, [toast]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="glass-card rounded-2xl border border-border p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-start gap-4">
            <div className="p-2.5 bg-purple-500/10 rounded-xl">
              <Sparkles className="w-5 h-5 text-purple-500" />
            </div>
            <div>
              <h3 className="font-display font-bold text-lg">Motores de IA — Imagens & Capas</h3>
              <p className="text-sm text-muted-foreground mt-0.5">
                Escolha o motor usado no Studio para gerar capas de vídeos e publicações por prompt.
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={runTest} disabled={testing}>
            {testing ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-2" /> : <Wand2 className="w-3.5 h-3.5 mr-2" />}
            Testar motor
          </Button>
        </div>

        {/* Test result preview */}
        {testResult && (
          <div className={cn(
            'mt-4 p-3 rounded-xl border flex items-center gap-4',
            testResult.ok ? 'border-green-500/30 bg-green-500/5' : 'border-yellow-500/30 bg-yellow-500/5'
          )}>
            {testResult.url && (
              <img src={testResult.url} alt="Teste" className="w-16 h-16 rounded-lg object-cover border border-border" />
            )}
            <div className="text-sm">
              <p className={cn('font-semibold', testResult.ok ? 'text-green-600' : 'text-yellow-600')}>
                {testResult.ok ? `Funcionando via ${testResult.engine}` : 'Placeholder retornado'}
              </p>
              <p className="text-xs text-muted-foreground">
                {testResult.ok ? 'Pronto para gerar capas no Studio.' : 'Sem conexão com o motor selecionado.'}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Key-required engine selected without key → warning */}
      {(() => {
        const active = IMAGE_ENGINES.find(e => e.id === prefs.defaultEngine);
        if (!active?.requiresKey || engineHasKey(active.id, prefs)) return null;
        const fallbackName = resolveFallbackName(prefs);
        return (
          <div className="flex items-start gap-3 p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/25">
            <Key className="w-4 h-4 text-yellow-500 shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-semibold text-yellow-600">
                "{active.name}" precisa de uma chave
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {fallbackName
                  ? <>Sem a chave, as gerações caem automaticamente para <strong>{fallbackName}</strong>.</>
                  : 'Sem nenhuma credencial, as gerações usam a rede comunitária AI Horde (mais lenta).'}
                {' '}Adicione a chave na seção abaixo.
              </p>
            </div>
          </div>
        );
      })()}

      {/* Engine cards */}
      <div className="grid gap-3 sm:grid-cols-2">
        {IMAGE_ENGINES.map((engine) => {
          const isActive = prefs.defaultEngine === engine.id;
          const SpeedIcon = SPEED_ICON[engine.speed];
          const missingKey = engine.requiresKey && !engineHasKey(engine.id, prefs);
          return (
            <button
              key={engine.id}
              onClick={() => selectEngine(engine.id)}
              disabled={missingKey}
              className={cn(
                'relative text-left p-4 rounded-xl border transition-all group',
                isActive
                  ? 'border-purple-500 bg-purple-500/5 shadow-[0_0_16px_rgba(168,85,247,0.15)]'
                  : 'border-border hover:border-purple-400/50 hover:bg-muted/40',
                missingKey && 'opacity-50 cursor-not-allowed'
              )}
            >
              {engine.badge && (
                <Badge className="absolute -top-2 right-3 bg-purple-500 text-[9px] px-1.5 py-0">
                  {engine.badge}
                </Badge>
              )}
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold text-sm">{engine.name}</span>
                {isActive ? (
                  <span className="flex items-center gap-1 text-purple-500 text-xs font-bold">
                    <Check className="w-3.5 h-3.5" /> Ativo
                  </span>
                ) : (
                  <span className="text-[10px] text-muted-foreground uppercase">Selecionar</span>
                )}
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed mb-3">{engine.description}</p>
              <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                <span className="flex items-center gap-1">
                  <SpeedIcon className={cn('w-3 h-3', engine.speed === 'fast' && 'text-green-500', engine.speed === 'slow' && 'text-orange-500')} />
                  {engine.speed === 'fast' ? 'Rápido' : engine.speed === 'medium' ? 'Médio' : 'Lento'}
                </span>
                <span className="flex items-center gap-1">
                  <Crown className={cn('w-3 h-3', engine.quality === 'high' ? 'text-yellow-500' : 'text-muted-foreground')} />
                  {engine.quality === 'high' ? 'Alta qualidade' : 'Qualidade média'}
                </span>
                <span className={cn('ml-auto font-bold', engine.free ? 'text-green-500' : 'text-orange-500')}>
                  {engine.free ? 'GRÁTIS*' : 'PAGO'}
                </span>
              </div>
            </button>
          );
        })}
      </div>
      <p className="text-[10px] text-muted-foreground -mt-3">
        * GRÁTIS = sem custo direto nesta plataforma (nível grátis ou créditos iniciais; limites podem se aplicar).
      </p>

      {/* API keys */}
      <div className="glass-card rounded-2xl border border-border p-6 space-y-5">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-primary/10 rounded-lg"><Key className="w-4 h-4 text-primary" /></div>
          <div>
            <h4 className="font-bold text-sm">Chaves dos motores</h4>
            <p className="text-xs text-muted-foreground mt-0.5 max-w-md">
              Ficam salvas apenas neste dispositivo (localStorage). Configure pelo menos uma —
              o AI Horde funciona sem chave nenhuma.
            </p>
          </div>
        </div>

        {KEY_ROWS.map((row) => (
          <EngineKeyRow
            key={row.prefKey}
            config={row}
            value={prefs[row.prefKey]}
            onSave={(key) => savePref({ [row.prefKey]: key } as Partial<AiImagePrefs>)}
          />
        ))}

        {/* Custom OpenAI-compatible endpoint (9Router etc.) */}
        <div className="border-t border-border/60 pt-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3 min-w-0">
              <div className="p-2 bg-primary/10 rounded-lg shrink-0"><Globe className="w-4 h-4 text-primary" /></div>
              <div className="min-w-0">
                <h4 className="font-bold text-sm">Endpoint Customizado (9Router, SD WebUI…)</h4>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Qualquer serviço compatível com OpenAI /images/generations.
                  Exemplo 9Router: <code className="text-[10px]">http://localhost:20128/v1</code>
                </p>
              </div>
            </div>
            <a
              href="https://github.com/decolua/9router"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-primary hover:underline inline-flex items-center gap-1 whitespace-nowrap shrink-0"
            >
              Sobre o 9Router <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          <form className="mt-3 grid gap-2 sm:grid-cols-2" onSubmit={(e) => e.preventDefault()} autoComplete="off">
            <Input
              type="text"
              value={prefs.customImageUrl}
              onChange={(e) => savePref({ customImageUrl: e.target.value })}
              placeholder="URL base (ex: http://localhost:20128/v1)"
              className="text-xs"
              autoComplete="off"
            />
            <Input
              type="text"
              value={prefs.customImageModel}
              onChange={(e) => savePref({ customImageModel: e.target.value })}
              placeholder="Modelo (ex: gemini/gemini-3-pro-image-preview)"
              className="text-xs"
              autoComplete="off"
            />
            <Input
              type="password"
              value={prefs.customImageKey}
              onChange={(e) => savePref({ customImageKey: e.target.value })}
              placeholder="Token (opcional)"
              className="text-xs sm:col-span-2"
              autoComplete="off"
            />
          </form>
          {prefs.customImageUrl && (
            <p className="text-[10px] text-green-600 mt-2 flex items-center gap-1">
              <Check className="w-3 h-3" /> Endpoint configurado — salvo automaticamente
            </p>
          )}
        </div>

        <div className="border-t border-border/60 pt-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-primary/10 rounded-lg"><Wand2 className="w-4 h-4 text-primary" /></div>
              <div>
                <h4 className="font-bold text-sm">Melhorar prompts automaticamente</h4>
                <p className="text-xs text-muted-foreground mt-0.5 max-w-md">
                  Um LLM reescreve seu prompt antes de gerar. Atenção: pode desviar do estilo pedido —
                  deixe desligado para resultados fiéis ao prompt.
                </p>
              </div>
            </div>
            <Switch checked={prefs.enhancePrompts} onCheckedChange={toggleEnhance} />
          </div>
        </div>
      </div>

      {/* Info footer */}
      <div className="flex items-start gap-2 text-xs text-muted-foreground p-4 rounded-xl bg-muted/40 border border-border/50">
        <Info className="w-4 h-4 shrink-0 mt-0.5" />
        <p>
          Estes motores alimentam o gerador de capas do <strong>Studio</strong> (Campos → Gerar Capa / Imagem com IA).
          As preferências ficam salvas neste dispositivo. Chaves de texto/áudio (OpenRouter, ElevenLabs etc.)
          continuam nos campos acima desta seção.
        </p>
      </div>
    </motion.div>
  );
};
