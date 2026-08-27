/**
 * AI Image Generator — Multi-Engine Text-to-Image
 *
 * Engines (ordered by prompt adherence):
 * - openrouter-seedream:   Seedream 4.5 (ByteDance) via OpenRouter Image API — top-tier adherence
 * - openrouter-nanobanana: Gemini 2.5 Flash Image via OpenRouter Image API
 * - gemini:                Nano Banana direct on Google AI Studio (free tier key)
 * - nvidia:                FLUX.1-schnell/dev via NVIDIA NIM (nvapi- key, free credits)
 * - openai:                GPT Image / DALL-E 3 direct on OpenAI
 * - custom:                Any OpenAI-compatible images endpoint (9Router, SD WebUI, gateways)
 * - huggingface:           FLUX.1-schnell / SDXL via HF Inference (hf_ token)
 * - horde:                 AI Horde distributed network — NO key at all
 * - dalle / stable-diffusion: via Supabase Edge Function
 *
 * Fallback chain: requested engine → next engine with valid credentials → placeholder.
 *
 * Preferences stored in localStorage so Settings and Studio share config.
 */

import { supabase } from '@/integrations/supabase/client';

// ── Types ────────────────────────────────────────────────────

export type ImageEngineId =
  | 'openrouter-seedream'
  | 'openrouter-nanobanana'
  | 'gemini'
  | 'nvidia'
  | 'openai'
  | 'custom'
  | 'huggingface'
  | 'horde'
  | 'dalle'
  | 'stable-diffusion';

export interface ImageEngineInfo {
  id: ImageEngineId;
  name: string;
  description: string;
  free: boolean;
  requiresKey: boolean;
  speed: 'slow' | 'medium' | 'fast';
  quality: 'high' | 'medium';
  badge?: string;
}

export interface AiImageRequest {
  prompt: string;
  negativePrompt?: string;
  width: number;
  height: number;
  style?: StyleId;
  engine?: ImageEngineId;
  enhance?: boolean;
}

export type StyleId = 'none' | 'photorealistic' | 'illustration' | 'pixel-art' | 'oil-painting' | 'watercolor' | '3d-render' | 'anime' | 'cinematic' | 'digital-art';

export interface AiImageResult {
  dataUrl: string;
  engine: string;
  prompt: string;
  width: number;
  height: number;
}

/** Video/social cover presets */
export const COVER_PRESETS = [
  { id: 'yt_thumb', label: 'Thumbnail YouTube', width: 1280, height: 720, icon: '▶️' },
  { id: 'yt_cover', label: 'Capa de Canal YouTube', width: 2560, height: 1440, icon: '📺' },
  { id: 'reels', label: 'Capa Reels/TikTok/Stories', width: 1080, height: 1920, icon: '📱' },
  { id: 'fb_cover', label: 'Capa Facebook', width: 1640, height: 856, icon: '📘' },
  { id: 'linkedin_banner', label: 'Banner LinkedIn', width: 1584, height: 396, icon: '💼' },
  { id: 'x_header', label: 'Header X (Twitter)', width: 1500, height: 500, icon: '𝕏' },
  { id: 'twitch', label: 'Capa Twitch', width: 1200, height: 480, icon: '🎮' },
  { id: 'kwai', label: 'Capa Kwai', width: 1080, height: 1440, icon: '🎬' },
] as const;

// ── Engine registry ──────────────────────────────────────────

export const IMAGE_ENGINES: ImageEngineInfo[] = [
  {
    id: 'openrouter-seedream',
    name: 'Seedream 4.5 (via OpenRouter)',
    description: 'ByteDance Seedream — fotorrealismo e obediência ao prompt de altíssimo nível. Usa sua chave OpenRouter.',
    free: false,
    requiresKey: true,
    speed: 'fast',
    quality: 'high',
    badge: 'Melhor aderência',
  },
  {
    id: 'openrouter-nanobanana',
    name: 'Nano Banana (via OpenRouter)',
    description: 'Gemini 2.5 Flash Image roteado pelo OpenRouter. Mesma chave OpenRouter do texto.',
    free: false,
    requiresKey: true,
    speed: 'medium',
    quality: 'high',
  },
  {
    id: 'gemini',
    name: 'Nano Banana (Google direto)',
    description: 'Gemini 2.5 Flash Image oficial via Google AI Studio. Chave grátis em aistudio.google.com/apikey.',
    free: true,
    requiresKey: true,
    speed: 'medium',
    quality: 'high',
    badge: 'Chave grátis Google',
  },
  {
    id: 'nvidia',
    name: 'NVIDIA NIM (FLUX.1)',
    description: 'FLUX.1-schnell/dev hospedado pela NVIDIA. Chave nvapi- grátis em build.nvidia.com (1.000 créditos).',
    free: true,
    requiresKey: true,
    speed: 'fast',
    quality: 'high',
    badge: 'Créditos grátis',
  },
  {
    id: 'custom',
    name: 'Endpoint Customizado (9Router etc.)',
    description: 'Qualquer endpoint compatível com OpenAI /images/generations — 9Router, SD WebUI, gateways próprios.',
    free: true,
    requiresKey: true,
    speed: 'medium',
    quality: 'high',
  },
  {
    id: 'openai',
    name: 'OpenAI (GPT Image / DALL-E 3)',
    description: 'Geração oficial da OpenAI. Requer chave com créditos em platform.openai.com.',
    free: false,
    requiresKey: true,
    speed: 'medium',
    quality: 'high',
  },
  {
    id: 'huggingface',
    name: 'Hugging Face FLUX.1',
    description: 'FLUX.1-schnell oficial. Token grátis (hf_...) em huggingface.co/settings/tokens.',
    free: true,
    requiresKey: true,
    speed: 'fast',
    quality: 'high',
  },
  {
    id: 'horde',
    name: 'AI Horde (Grátis total)',
    description: 'Rede distribuída comunitária com Flux Schnell e Albedo XL. NÃO precisa de chave nenhuma. Fila pode levar 1–3 min.',
    free: true,
    requiresKey: false,
    speed: 'slow',
    quality: 'high',
    badge: 'Sem chave',
  },
  {
    id: 'dalle',
    name: 'DALL-E 3 (Edge Function)',
    description: 'Via Edge Function configurada no servidor + chave OpenAI lá.',
    free: false,
    requiresKey: true,
    speed: 'medium',
    quality: 'high',
  },
  {
    id: 'stable-diffusion',
    name: 'Stable Diffusion (Edge Function)',
    description: 'Via Edge Function configurada no servidor.',
    free: false,
    requiresKey: true,
    speed: 'medium',
    quality: 'high',
  },
];

/** Auto-fallback preference order (engines with credentials win over ones without) */
const PREFERENCE_ORDER: ImageEngineId[] = [
  'openrouter-seedream',
  'openrouter-nanobanana',
  'gemini',
  'nvidia',
  'custom',
  'huggingface',
  'horde',  // AI Horde: fully free, no key needed — always available as last resort
  'openai',
];

/** Whether the given engine has the credentials it needs right now */
export function engineHasKey(id: ImageEngineId, prefs: AiImagePrefs): boolean {
  const info = IMAGE_ENGINES.find(e => e.id === id);
  if (!info?.requiresKey) return true;
  switch (id) {
    case 'openrouter-seedream':
    case 'openrouter-nanobanana':
      return !!prefs.openrouterKey;
    case 'gemini':
      return !!prefs.geminiApiKey;
    case 'nvidia':
      return !!prefs.nvidiaApiKey;
    case 'openai':
      return !!prefs.openaiApiKey;
    case 'custom':
      return !!prefs.customImageUrl;
    case 'huggingface':
      return !!prefs.huggingfaceKey;
    case 'dalle':
    case 'stable-diffusion':
      return true; // keys live server-side in the Edge Function
    default:
      return true;
  }
}

/**
 * Ordered list of engines to try for this request:
 * requested first; if it lacks credentials, append engines that DO have them,
 * preferring high-adherence models over generic ones.
 */
function resolveEngineChain(requested: ImageEngineId, prefs: AiImagePrefs): ImageEngineId[] {
  const chain: ImageEngineId[] = [requested];
  for (const candidate of PREFERENCE_ORDER) {
    if (!chain.includes(candidate) && engineHasKey(candidate, prefs)) {
      chain.push(candidate);
    }
  }
  return chain;
}

// ── Preferences (localStorage) ───────────────────────────────

const PREFS_KEY = 'ai_image_prefs';

export interface AiImagePrefs {
  defaultEngine: ImageEngineId;
  /** OpenRouter key (sk-or-v1-...) — same key used for text AI works for images */
  openrouterKey: string;
  /** Google AI Studio key — free tier available */
  geminiApiKey: string;
  /** NVIDIA NIM key (nvapi-...) — free credits on signup */
  nvidiaApiKey: string;
  /** OpenAI platform key */
  openaiApiKey: string;
  /** Base URL of an OpenAI-compatible images endpoint (9Router: http://localhost:20128/v1) */
  customImageUrl: string;
  /** Model slug for the custom endpoint (from its /models or docs) */
  customImageModel: string;
  /** Optional bearer token for the custom endpoint */
  customImageKey: string;
  huggingfaceKey: string;
  enhancePrompts: boolean;
  defaultStyle: StyleId;
}

const DEFAULT_PREFS: AiImagePrefs = {
  defaultEngine: 'openrouter-seedream',
  openrouterKey: '',
  geminiApiKey: '',
  nvidiaApiKey: '',
  openaiApiKey: '',
  customImageUrl: '',
  customImageModel: '',
  customImageKey: '',
  huggingfaceKey: '',
  enhancePrompts: false, // OFF by default — LLM rewrite was injecting anime bias
  defaultStyle: 'none',
};

export function getAiImagePrefs(): AiImagePrefs {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (!raw) return { ...DEFAULT_PREFS };
    const parsed = JSON.parse(raw);

    // One-time migrations:
    // _v2 → reset enhancePrompts (anime bias fix)
    // _v3 → drop Pollinations era: clear pollinationsKey and point default
    //       engine to Seedream via OpenRouter
    let needsSave = false;
    if (!parsed._v2) {
      parsed.enhancePrompts = false;
      parsed._v2 = true;
      needsSave = true;
    }
    if (!parsed._v3) {
      delete parsed.pollinationsKey;
      const legacyEngines: string[] = ['nanobanana', 'seedream', 'flux', 'turbo'];
      if (!parsed.defaultEngine || legacyEngines.includes(parsed.defaultEngine)) {
        parsed.defaultEngine = DEFAULT_PREFS.defaultEngine;
      }
      parsed._v3 = true;
      needsSave = true;
    }

    const merged = { ...DEFAULT_PREFS, ...parsed };
    if (needsSave) localStorage.setItem(PREFS_KEY, JSON.stringify(merged));
    return merged;
  } catch {
    return { ...DEFAULT_PREFS };
  }
}

export function saveAiImagePrefs(prefs: Partial<AiImagePrefs>): AiImagePrefs {
  const next = { ...getAiImagePrefs(), ...prefs };
  localStorage.setItem(PREFS_KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent('ai-image-prefs-updated'));
  return next;
}

// ── Aspect ratio helpers ─────────────────────────────────────

const ASPECT_RATIOS: ReadonlyArray<readonly [string, number]> = [
  ['1:1', 1], ['16:9', 16 / 9], ['9:16', 9 / 16], ['4:3', 4 / 3], ['3:4', 3 / 4],
  ['3:2', 3 / 2], ['2:3', 2 / 3], ['21:9', 21 / 9], ['4:5', 4 / 5], ['5:4', 5 / 4],
];

function nearestAspectRatio(width: number, height: number): string {
  const ratio = width / Math.max(height, 1);
  let best = '1:1';
  let bestDiff = Number.POSITIVE_INFINITY;
  for (const [label, value] of ASPECT_RATIOS) {
    const diff = Math.abs(Math.log(ratio / value));
    if (diff < bestDiff) { bestDiff = diff; best = label; }
  }
  return best;
}

// ── Style prefixes ───────────────────────────────────────────

const STYLE_PREFIXES: Record<StyleId, string> = {
  'none': '',
  'photorealistic': 'ultra realistic photograph, professional photography, sharp focus, high detail, ',
  'illustration': 'digital illustration, clean vector art, vibrant colors, trending on artstation, ',
  'pixel-art': 'pixel art, retro 16-bit game sprite, crisp pixels, ',
  'oil-painting': 'oil painting, classical fine art, textured brushstrokes, masterpiece, ',
  'watercolor': 'watercolor painting, soft washes, flowing pigment, artistic, ',
  '3d-render': '3D render, octane render, volumetric lighting, ray tracing, cinematic, ',
  'anime': 'anime key visual, cel shading, vibrant, studio quality, ',
  'cinematic': 'cinematic still, dramatic lighting, film grain, anamorphic lens, movie scene, ',
  'digital-art': 'digital art, concept art, intricate details, dramatic composition, trending on artstation, ',
};

function buildFullPrompt(request: AiImageRequest): string {
  const stylePrefix = request.style && request.style !== 'none' ? STYLE_PREFIXES[request.style] || '' : '';
  return stylePrefix + request.prompt.trim();
}

// ── Main entry point ─────────────────────────────────────────

// Track runtime state: if OpenRouter returns 402 during this session, skip all OR engines
let _openrouterNoCredits = false;

export async function generateAiImage(request: AiImageRequest): Promise<AiImageResult> {
  const prefs = getAiImagePrefs();
  const requested = request.engine || prefs.defaultEngine || 'horde';
  const fullPrompt = buildFullPrompt(request);
  const chain = resolveEngineChain(requested, prefs);

  const failures: string[] = [];
  for (const engine of chain) {
    // Skip OpenRouter engines if we already know the account has no credits
    if (_openrouterNoCredits && (engine === 'openrouter-seedream' || engine === 'openrouter-nanobanana')) {
      console.warn(`[AI] Engine "${engine}" skipped: OpenRouter sem créditos nesta sessão. Adicione créditos em openrouter.ai/settings/credits`);
      failures.push(`${engine}: sem créditos OpenRouter (402)`);
      continue;
    }

    try {
      const result = await runEngine(engine, fullPrompt, request, prefs);
      if (result) return result;
      failures.push(`${engine}: sem resultado`);
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      // Detect 402 (no credits) and flag all OpenRouter engines as unavailable
      if (errMsg.includes('402') && (engine === 'openrouter-seedream' || engine === 'openrouter-nanobanana')) {
        _openrouterNoCredits = true;
        console.warn(`[AI] OpenRouter sem créditos — os engines OpenRouter serão ignorados nesta sessão. Adicione créditos em: https://openrouter.ai/settings/credits`);
      } else {
        console.warn(`[AI] Engine "${engine}" failed:`, err);
      }
      failures.push(`${engine}: ${errMsg.substring(0, 80)}`);
    }
  }

  console.warn(`[AI] All engines failed → ${failures.join(' | ')}`);
  return generatePlaceholder(request.width, request.height, fullPrompt);
}

async function runEngine(
  engine: ImageEngineId,
  fullPrompt: string,
  request: AiImageRequest,
  prefs: AiImagePrefs,
): Promise<AiImageResult | null> {
  switch (engine) {
    case 'openrouter-seedream':
      return generateWithOpenRouter('bytedance-seed/seedream-4.5', fullPrompt, request.width, request.height);
    case 'openrouter-nanobanana':
      return generateWithOpenRouter('google/gemini-2.5-flash-image', fullPrompt, request.width, request.height);
    case 'gemini':
      return generateWithGemini(fullPrompt, request.width, request.height);
    case 'nvidia':
      return generateWithNvidia(fullPrompt, request.width, request.height);
    case 'openai':
      return generateWithOpenAi(fullPrompt, request.width, request.height);
    case 'custom':
      return generateWithCustom(fullPrompt, request.width, request.height, prefs);
    case 'huggingface':
      return generateWithHuggingFace(fullPrompt, request.width, request.height, request.negativePrompt);
    case 'horde':
      return generateWithHorde(fullPrompt, request.width, request.height, request.negativePrompt);
    case 'dalle':
      return generateWithDalle(fullPrompt, request.width, request.height);
    case 'stable-diffusion':
    default:
      return generateWithStableDiffusion(fullPrompt, request.width, request.height);
  }
}

// ── OpenRouter Image API (Seedream / Nano Banana) ────────────

async function generateWithOpenRouter(
  modelId: string,
  prompt: string,
  width: number,
  height: number,
): Promise<AiImageResult | null> {
  const { openrouterKey } = getAiImagePrefs();
  if (!openrouterKey) return null;

  const response = await fetch('https://openrouter.ai/api/v1/images', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openrouterKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': window.location.origin,
      'X-Title': 'Vitória News',
    },
    body: JSON.stringify({
      model: modelId,
      prompt,
      aspect_ratio: nearestAspectRatio(width, height),
      n: 1,
    }),
  });
  if (!response.ok) {
    throw new Error(`OpenRouter ${response.status}: ${await readErrorBody(response)}`);
  }
  const json = await response.json();
  const item = json?.data?.[0];
  if (!item?.b64_json) return null;

  return {
    dataUrl: `data:${item.media_type || 'image/png'};base64,${item.b64_json}`,
    engine: `openrouter:${modelId}`,
    prompt,
    width,
    height,
  };
}

// ── Google Gemini direct (Nano Banana) ───────────────────────

const GEMINI_IMAGE_MODELS = ['gemini-2.5-flash-image', 'gemini-3.1-flash-image'];

async function generateWithGemini(
  prompt: string,
  width: number,
  height: number,
): Promise<AiImageResult | null> {
  const { geminiApiKey } = getAiImagePrefs();
  if (!geminiApiKey) return null;

  for (const model of GEMINI_IMAGE_MODELS) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent`,
        {
          method: 'POST',
          headers: {
            'x-goog-api-key': geminiApiKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              responseModalities: ['IMAGE'],
              imageConfig: { aspectRatio: nearestAspectRatio(width, height) },
            },
          }),
        },
      );
      if (!response.ok) continue;
      const json = await response.json();
      const parts = json?.candidates?.[0]?.content?.parts ?? [];
      const imagePart = parts.find((p: any) => p.inlineData?.data);
      if (imagePart) {
        const mimeType = imagePart.inlineData.mimeType || 'image/png';
        return {
          dataUrl: `data:${mimeType};base64,${imagePart.inlineData.data}`,
          engine: `gemini:${model}`,
          prompt,
          width,
          height,
        };
      }
    } catch (err) {
      console.warn(`[AI] Gemini model "${model}" failed:`, err);
    }
  }
  return null;
}

// ── NVIDIA NIM (FLUX.1) ──────────────────────────────────────

function snapNvidiaSize(value: number): number {
  return Math.max(512, Math.min(1024, Math.round(value / 64) * 64));
}

async function generateWithNvidia(
  prompt: string,
  width: number,
  height: number,
): Promise<AiImageResult | null> {
  const { nvidiaApiKey } = getAiImagePrefs();
  if (!nvidiaApiKey) return null;
  const w = snapNvidiaSize(width);
  const h = snapNvidiaSize(height);

  // Hosted NIM endpoint (verified live: /v1/genai/{model} returns 401 without key;
  // the OpenAI-compatible path only exists on self-hosted NIM containers)
  const models: Array<{ id: string; steps: number; cfg: number }> = [
    { id: 'black-forest-labs/flux.1-schnell', steps: 4, cfg: 3.5 },
    { id: 'black-forest-labs/flux.1-dev', steps: 28, cfg: 3.5 },
  ];

  for (const model of models) {
    try {
      const response = await fetch(`https://ai.api.nvidia.com/v1/genai/${model.id}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${nvidiaApiKey}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt, mode: 'base', width: w, height: h, steps: model.steps, cfg_scale: model.cfg, n: 1 }),
      });
      if (!response.ok) continue;
      const json = await response.json();
      const b64 = json?.artifacts?.[0]?.base64;
      if (b64) {
        return { dataUrl: `data:image/png;base64,${b64}`, engine: `nvidia:${model.id.split('/')[1]}`, prompt, width, height };
      }
    } catch (err) {
      console.warn(`[AI] NVIDIA "${model.id}" failed:`, err);
    }
  }
  return null;
}

// ── OpenAI direct (GPT Image / DALL-E 3) ─────────────────────

function openAiSize(width: number, height: number, model: 'gpt-image-1' | 'dall-e-3'): string {
  const landscape = width >= height;
  if (model === 'gpt-image-1') return landscape ? '1536x1024' : '1024x1536';
  return landscape ? '1792x1024' : '1024x1792';
}

async function generateWithOpenAi(
  prompt: string,
  width: number,
  height: number,
): Promise<AiImageResult | null> {
  const { openaiApiKey } = getAiImagePrefs();
  if (!openaiApiKey) return null;

  const attempts: Array<{ model: 'gpt-image-1' | 'dall-e-3'; body: Record<string, unknown> }> = [
    {
      model: 'gpt-image-1',
      body: { model: 'gpt-image-1', prompt, n: 1, size: openAiSize(width, height, 'gpt-image-1') },
    },
    {
      model: 'dall-e-3',
      body: { model: 'dall-e-3', prompt, n: 1, size: openAiSize(width, height, 'dall-e-3'), response_format: 'b64_json' },
    },
  ];

  for (const attempt of attempts) {
    try {
      const response = await fetch('https://api.openai.com/v1/images/generations', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(attempt.body),
      });
      if (!response.ok) continue;
      const json = await response.json();
      const item = json?.data?.[0];
      const b64 = item?.b64_json;
      if (b64) {
        return { dataUrl: `data:image/png;base64,${b64}`, engine: attempt.model, prompt, width, height };
      }
      if (item?.url) {
        const blob = await (await fetch(item.url)).blob();
        return { dataUrl: await blobToDataUrl(blob), engine: attempt.model, prompt, width, height };
      }
    } catch (err) {
      console.warn(`[AI] OpenAI "${attempt.model}" failed:`, err);
    }
  }
  return null;
}

// ── Custom OpenAI-compatible endpoint (9Router, SD WebUI…) ───

async function generateWithCustom(
  prompt: string,
  width: number,
  height: number,
  prefs: AiImagePrefs,
): Promise<AiImageResult | null> {
  const base = (prefs.customImageUrl || '').trim().replace(/\/+$/, '');
  if (!base) return null;
  const url = base.endsWith('/images/generations') ? base : `${base}/images/generations`;
  const model = prefs.customImageModel.trim() || 'gemini/gemini-3-pro-image-preview';

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (prefs.customImageKey.trim()) headers['Authorization'] = `Bearer ${prefs.customImageKey.trim()}`;

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model,
      prompt,
      n: 1,
      size: `${snapNvidiaSize(width)}x${snapNvidiaSize(height)}`,
      response_format: 'b64_json',
    }),
  });
  if (!response.ok) {
    throw new Error(`Custom endpoint ${response.status}: ${await readErrorBody(response)}`);
  }

  const contentType = response.headers.get('content-type') || '';
  if (contentType.startsWith('image/')) {
    const blob = await response.blob();
    return { dataUrl: await blobToDataUrl(blob), engine: `custom:${model}`, prompt, width, height };
  }

  const json = await response.json();
  const item = json?.data?.[0];
  if (item?.b64_json) {
    return { dataUrl: `data:image/png;base64,${item.b64_json}`, engine: `custom:${model}`, prompt, width, height };
  }
  if (item?.url) {
    const blob = await (await fetch(item.url)).blob();
    return { dataUrl: await blobToDataUrl(blob), engine: `custom:${model}`, prompt, width, height };
  }
  return null;
}

// ── Hugging Face implementation (free hf_ token) ─────────────

const HF_MODELS = ['black-forest-labs/FLUX.1-schnell', 'stabilityai/stable-diffusion-xl-base-1.0'];

async function generateWithHuggingFace(
  prompt: string,
  width: number,
  height: number,
  negativePrompt?: string,
): Promise<AiImageResult | null> {
  const key = getAiImagePrefs().huggingfaceKey;
  if (!key) return null;

  for (const model of HF_MODELS) {
    const endpoints = [
      `https://router.huggingface.co/hf-inference/models/${model}`,
      `https://api-inference.huggingface.co/models/${model}`,
    ];
    for (const url of endpoints) {
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${key}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            inputs: negativePrompt?.trim()
              ? `${prompt}. Avoid: ${negativePrompt.trim()}`
              : prompt,
            parameters: { width, height },
          }),
        });
        if (!res.ok) continue;
        const blob = await res.blob();
        if (blob.size > 1000 && blob.type.startsWith('image/')) {
          return { dataUrl: await blobToDataUrl(blob), engine: `hf:${model.split('/')[1]}`, prompt, width, height };
        }
      } catch { /* try next endpoint */ }
    }
  }
  return null;
}

// ── AI Horde implementation (free, anonymous) ────────────────

const HORDE_ANON_KEY = '0000000000';
/** Preferred models, tried in order — both follow prompts well */
const HORDE_MODELS = ['Flux.1-Schnell fp8 (Compact)', 'AlbedoBase XL (SDXL)'];

async function generateWithHorde(
  prompt: string,
  width: number,
  height: number,
  negativePrompt?: string,
): Promise<AiImageResult | null> {
  // Horde requires multiples of 64; stay conservative for anonymous priority
  const snap = (v: number) => Math.max(320, Math.min(768, Math.round(v / 64) * 64));
  const w = snap(width);
  const h = snap(height);

  for (const model of HORDE_MODELS) {
    try {
      const isFlux = model.includes('Flux');
      const submitRes = await fetch('https://aihorde.net/api/v2/generate/async', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': HORDE_ANON_KEY,
        },
        body: JSON.stringify({
          prompt: negativePrompt?.trim()
            ? `${prompt} ### ${negativePrompt.trim()}`
            : prompt,
          params: {
            width: w,
            height: h,
            steps: isFlux ? 4 : 22,
            cfg_scale: isFlux ? 3.5 : 7,
            // Verified live: Flux.1-Schnell workers reject k_euler_a (SamplerMismatch) — they require k_euler
            sampler_name: isFlux ? 'k_euler' : 'k_euler_a',
            n: 1,
          },
          models: [model],
          r2: true,
          nsfw: true,
          shared: false,
        }),
      });
      if (!submitRes.ok) continue;
      const { id } = await submitRes.json();
      if (!id) continue;

      // Poll until done (max ~4 min)
      const deadline = Date.now() + 240000;
      let done = false;
      while (Date.now() < deadline) {
        await sleep(4000);
        const checkRes = await fetch(`https://aihorde.net/api/v2/generate/check/${id}`);
        if (!checkRes.ok) break;
        const check = await checkRes.json();
        if (check.faulted || check.is_possible === false) break;
        if (check.done) { done = true; break; }
      }
      if (!done) continue;

      const statusRes = await fetch(`https://aihorde.net/api/v2/generate/status/${id}`);
      if (!statusRes.ok) continue;
      const status = await statusRes.json();
      const img: string | undefined = status.generations?.[0]?.img;
      if (!img) continue;

      // r2:true returns a URL; otherwise base64
      let dataUrl: string;
      if (img.startsWith('http')) {
        const blob = await (await fetch(img)).blob();
        dataUrl = await blobToDataUrl(blob);
      } else {
        dataUrl = img.startsWith('data:') ? img : `data:image/webp;base64,${img}`;
      }
      return { dataUrl, engine: `horde:${model}`, prompt, width, height };
    } catch (err) {
      console.warn(`[AI] Horde model "${model}" failed:`, err);
    }
  }
  return null;
}

// ── DALL-E / SD via Supabase Edge Function ───────────────────

async function generateWithDalle(prompt: string, width: number, height: number): Promise<AiImageResult | null> {
  try {
    const { data, error } = await supabase.functions.invoke('ai-generate-image', {
      body: { model: 'dall-e-3', prompt, size: width >= 1024 ? '1024x1024' : '512x512' },
    });
    if (error) throw error;
    return { dataUrl: data.imageUrl, engine: 'dalle', prompt, width, height };
  } catch (error) {
    console.warn('DALL-E failed:', error);
    return null;
  }
}

async function generateWithStableDiffusion(prompt: string, width: number, height: number): Promise<AiImageResult | null> {
  try {
    const { data, error } = await supabase.functions.invoke('ai-generate-image', {
      body: { model: 'stable-diffusion', prompt, width, height, steps: 30, cfg_scale: 7.5 },
    });
    if (error) throw error;
    return { dataUrl: data.imageUrl, engine: 'stable-diffusion', prompt, width, height };
  } catch (error) {
    console.warn('Stable Diffusion failed:', error);
    return null;
  }
}

// ── Placeholder ──────────────────────────────────────────────

function generatePlaceholder(width: number, height: number, prompt: string): AiImageResult {
  const canvas = document.createElement('canvas');
  canvas.width = Math.min(width, 2048);
  canvas.height = Math.min(height, 2048);
  const w = canvas.width;
  const h = canvas.height;
  const ctx = canvas.getContext('2d')!;

  const hash = prompt.split('').reduce((acc, c) => ((acc << 5) - acc + c.charCodeAt(0)) | 0, 0);
  const hue1 = Math.abs(hash % 360);
  const hue2 = (hue1 + 60) % 360;

  const grad = ctx.createLinearGradient(0, 0, w, h);
  grad.addColorStop(0, `hsl(${hue1}, 70%, 40%)`);
  grad.addColorStop(0.5, `hsl(${(hue1 + hue2) / 2}, 60%, 30%)`);
  grad.addColorStop(1, `hsl(${hue2}, 70%, 40%)`);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  ctx.strokeStyle = 'rgba(255,255,255,0.08)';
  ctx.lineWidth = 1;
  const grid = 40;
  for (let x = 0; x <= w; x += grid) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
  for (let y = 0; y <= h; y += grid) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }

  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.font = `bold ${Math.max(14, Math.min(28, w / 24))}px Inter, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const lines = wrapSimple(ctx, prompt, w * 0.8);
  lines.slice(0, 6).forEach((line, i) => {
    ctx.fillText(line, w / 2, h / 2 + (i - Math.min(lines.length, 6) / 2) * 28);
  });

  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(w / 2 - 110, h - 44, 220, 26);
  ctx.fillStyle = '#fff';
  ctx.font = '12px Inter, sans-serif';
  ctx.fillText('IA offline — configure um motor nas Configurações', w / 2, h - 31);

  return { dataUrl: canvas.toDataURL('image/png'), engine: 'placeholder', prompt, width, height };
}

// ── Helpers ──────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function readErrorBody(response: Response): Promise<string> {
  try {
    const text = await response.text();
    return text.slice(0, 300);
  } catch {
    return '(sem corpo de erro)';
  }
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function wrapSimple(ctx: CanvasRenderingContext2D, text: string, maxW: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let cur = '';
  for (const word of words) {
    const test = cur ? `${cur} ${word}` : word;
    if (ctx.measureText(test).width > maxW && cur) {
      lines.push(cur);
      cur = word;
    } else {
      cur = test;
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

// ── Prompt suggestions ───────────────────────────────────────

export const AI_PROMPT_SUGGESTIONS = [
  { category: 'Capas de Vídeo', prompts: [
    'Epic YouTube thumbnail background, explosive action scene, dramatic red and orange lighting, bold empty space in center for text',
    'Gaming video cover, neon cyberpunk city at night, purple and blue glow, futuristic atmosphere',
    'Podcast episode cover, professional studio microphone with warm bokeh lights, dark elegant background',
    'Vlog thumbnail, bright sunny beach with palm trees, vibrant colors, travel aesthetic',
  ]},
  { category: 'Fundo', prompts: [
    'Abstract geometric gradient background, modern design, dark blue and purple',
    'Bokeh light effect, warm golden tones, cinematic blurred background',
    'Mountain landscape at sunset, dramatic clouds, wide angle vista',
    'City skyline at night, neon lights reflecting on wet streets',
  ]},
  { category: 'Elementos', prompts: [
    'Golden trophy cup, 3D render, studio lighting, isolated on dark background',
    'Professional microphone with glowing sound waves, podcast theme, neon accent',
    'Smartphone mockup floating with social media interface, modern clean design',
    'Vintage newspaper front page, sepia tone, editorial style',
  ]},
  { category: 'Pessoas', prompts: [
    'Professional headshot portrait, corporate style, neutral studio background',
    'Content creator recording video with ring light, modern home studio',
    'News anchor presenting at desk, television studio, professional lighting',
    'Creative professional working at desk, modern office, candid moment',
  ]},
] as const;
