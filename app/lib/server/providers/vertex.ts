import {
  GoogleGenAI,
  Modality,
  createPartFromBase64,
  createPartFromText,
  createUserContent,
} from '@google/genai';

import type { BrandAssetInput } from '@/app/lib/canvas/contracts';

import type { TavilySearchOutput } from './tavily';

export type BrandPaletteEntry = {
  name: string;
  hex: string;
  usage?: string;
};

export type BrandProfile = {
  brandName?: string;
  voiceTone: string[];
  palette: BrandPaletteEntry[];
  typography: string[];
  dos: string[];
  donts: string[];
  ctaStyle?: string;
  notes: string[];
};

export type VertexImageOutput = {
  dataUrl: string;
  mimeType: string;
  model: string;
};

export type VertexVideoOutput = {
  model: string;
  mimeType?: string;
  dataUrl?: string;
  uri?: string;
};

export type VertexVideoOperationPayload = {
  done?: boolean;
};

let cachedClient: GoogleGenAI | null = null;

const DEFAULT_TEXT_MODEL = 'gemini-2.5-flash';
const DEFAULT_IMAGE_MODEL = 'gemini-2.5-flash-image';
const DEFAULT_VIDEO_MODEL = 'veo-3.0-fast-generate-001';

function compactText(value: string, max = 280) {
  const normalized = value.replace(/\s+/g, ' ').trim();

  if (normalized.length <= max) {
    return normalized;
  }

  return `${normalized.slice(0, max - 1)}…`;
}

function extractHexColors(text: string) {
  const matches = text.match(/#[0-9a-fA-F]{3,8}/g) ?? [];
  return Array.from(new Set(matches)).slice(0, 8);
}

function parseJson<T>(value: string): T | null {
  const cleaned = value.trim();

  try {
    return JSON.parse(cleaned) as T;
  } catch {
    const codeMatch = cleaned.match(/```json\s*([\s\S]*?)```/i);

    if (!codeMatch) {
      return null;
    }

    try {
      return JSON.parse(codeMatch[1]) as T;
    } catch {
      return null;
    }
  }
}

function dataUrlToBase64(asset: BrandAssetInput) {
  const separatorIndex = asset.dataUrl.indexOf(',');

  if (separatorIndex < 0) {
    throw new Error(`Invalid data URL for asset ${asset.name}`);
  }

  return asset.dataUrl.slice(separatorIndex + 1);
}

function getVertexProjectConfig() {
  const project = process.env.GOOGLE_CLOUD_PROJECT;
  const location = process.env.GOOGLE_CLOUD_LOCATION;

  if (!project || !location) {
    return null;
  }

  return {
    project,
    location,
    apiVersion: process.env.GOOGLE_GENAI_API_VERSION ?? 'v1beta',
  };
}

function getApiKeyConfig() {
  const apiKey =
    process.env.GOOGLE_API_KEY ??
    process.env.GEMINI_API_KEY ??
    process.env.VERTEX_API_KEY;

  if (!apiKey) {
    return null;
  }

  return {
    apiKey,
    apiVersion: process.env.GOOGLE_GENAI_API_VERSION ?? 'v1beta',
  };
}

function getVertexClient() {
  if (cachedClient) {
    return cachedClient;
  }

  const vertexConfig = getVertexProjectConfig();

  if (vertexConfig) {
    cachedClient = new GoogleGenAI({
      vertexai: true,
      project: vertexConfig.project,
      location: vertexConfig.location,
      apiVersion: vertexConfig.apiVersion,
    });

    return cachedClient;
  }

  const apiKeyConfig = getApiKeyConfig();

  if (!apiKeyConfig) {
    return null;
  }

  cachedClient = new GoogleGenAI({
    apiKey: apiKeyConfig.apiKey,
    apiVersion: apiKeyConfig.apiVersion,
  });

  return cachedClient;
}

export function isVertexConfigured() {
  return Boolean(getVertexProjectConfig() || getApiKeyConfig());
}

function createFallbackBrandProfile(
  notes: string,
  brandAssets: BrandAssetInput[],
): BrandProfile {
  const palette = extractHexColors(notes).map((hex, index) => ({
    name: `Color ${index + 1}`,
    hex,
    usage: 'Extracted from notes',
  }));

  return {
    brandName: undefined,
    voiceTone: notes ? ['clear', 'confident'] : ['neutral'],
    palette,
    typography: [],
    dos: notes
      ? ['Keep visuals consistent with uploaded brand references.']
      : ['Prioritize clean, readable composition.'],
    donts: ['Avoid off-brand colors and inconsistent typography.'],
    ctaStyle: 'Short and direct.',
    notes: brandAssets.length
      ? [`${brandAssets.length} brand file(s) provided by user.`]
      : [],
  };
}

export async function extractBrandProfile(
  brandAssets: BrandAssetInput[],
  brandNotes: string,
): Promise<BrandProfile> {
  if (!brandAssets.length && !brandNotes.trim()) {
    return createFallbackBrandProfile('', []);
  }

  const client = getVertexClient();

  if (!client) {
    return createFallbackBrandProfile(brandNotes, brandAssets);
  }

  const model = process.env.VERTEX_BRAND_MODEL ?? DEFAULT_TEXT_MODEL;
  const parts = [
    createPartFromText(`Extract brand guidelines from the provided files and notes.
Return strict JSON only with shape:
{
  "brandName": string | null,
  "voiceTone": string[],
  "palette": [{"name": string, "hex": string, "usage": string}],
  "typography": string[],
  "dos": string[],
  "donts": string[],
  "ctaStyle": string | null,
  "notes": string[]
}
If uncertain, keep fields empty arrays or null.

User notes: ${brandNotes || 'none'}`),
    ...brandAssets.slice(0, 3).map((asset) =>
      createPartFromBase64(dataUrlToBase64(asset), asset.mimeType),
    ),
  ];

  try {
    const response = await client.models.generateContent({
      model,
      contents: [createUserContent(parts)],
      config: {
        temperature: 0.2,
      },
    });

    const parsed = parseJson<BrandProfile>(response.text ?? '');

    if (parsed) {
      return {
        brandName: parsed.brandName,
        voiceTone: parsed.voiceTone ?? [],
        palette: parsed.palette ?? [],
        typography: parsed.typography ?? [],
        dos: parsed.dos ?? [],
        donts: parsed.donts ?? [],
        ctaStyle: parsed.ctaStyle,
        notes: parsed.notes ?? [],
      };
    }
  } catch {
    // Fall back to deterministic extraction if model call fails.
  }

  return createFallbackBrandProfile(brandNotes, brandAssets);
}

export function composeGenerationPrompt(params: {
  prompt: string;
  type: 'image' | 'video' | 'animation';
  brandProfile: BrandProfile;
  tavilyContext?: TavilySearchOutput | null;
}) {
  const paletteText = params.brandProfile.palette.length
    ? params.brandProfile.palette.map((entry) => `${entry.name}: ${entry.hex}`).join(', ')
    : 'No explicit palette provided.';

  const toneText = params.brandProfile.voiceTone.length
    ? params.brandProfile.voiceTone.join(', ')
    : 'neutral';

  const doText = params.brandProfile.dos.length
    ? params.brandProfile.dos.join('; ')
    : 'Maintain visual coherence and legibility.';

  const dontText = params.brandProfile.donts.length
    ? params.brandProfile.donts.join('; ')
    : 'Avoid low contrast and noisy compositions.';

  const contextBlock = params.tavilyContext
    ? `Research summary: ${params.tavilyContext.summary}\nCitations: ${params.tavilyContext.citations
        .slice(0, 4)
        .map((citation) => `${citation.title} (${citation.url})`)
        .join('; ')}`
    : 'No external research context provided.';

  return `Create ${params.type} content for this brief:\n${params.prompt}\n\nBrand constraints:\n- Brand: ${params.brandProfile.brandName ?? 'unspecified'}\n- Voice tone: ${toneText}\n- Palette: ${paletteText}\n- Typography: ${params.brandProfile.typography.join(', ') || 'No strict typography provided.'}\n- Do: ${doText}\n- Avoid: ${dontText}\n- CTA style: ${params.brandProfile.ctaStyle ?? 'Short and direct.'}\n\n${contextBlock}`;
}

export async function rewriteNarrationScript(params: {
  originalPrompt: string;
  composedPrompt: string;
  research?: TavilySearchOutput | null;
}) {
  const client = getVertexClient();

  if (!client) {
    return compactText(params.originalPrompt, 420);
  }

  try {
    const response = await client.models.generateContent({
      model: process.env.VERTEX_SCRIPT_MODEL ?? DEFAULT_TEXT_MODEL,
      contents: `Rewrite this into a spoken narration for a short marketing video. Keep facts accurate, concise clauses, and natural pauses.\n\n${params.composedPrompt}`,
      config: {
        temperature: 0.35,
      },
    });

    return compactText(response.text ?? params.originalPrompt, 520);
  } catch {
    return compactText(params.originalPrompt, 420);
  }
}

export async function generateImageWithVertex(
  prompt: string,
  modelOverride?: string,
): Promise<VertexImageOutput> {
  const client = getVertexClient();

  if (!client) {
    throw new Error(
      'Google GenAI is not configured. Set ADC project/location or GOOGLE_API_KEY.',
    );
  }

  const model = modelOverride ?? process.env.VERTEX_IMAGE_MODEL ?? DEFAULT_IMAGE_MODEL;
  const isGeminiImageModel =
    model.includes('gemini') && (model.includes('image') || model.includes('banana'));

  if (isGeminiImageModel) {
    const response = await client.models.generateContent({
      model,
      contents: prompt,
      config: {
        responseModalities: [Modality.TEXT, Modality.IMAGE],
      },
    });

    const inline = response.candidates?.[0]?.content?.parts?.find((part) => part.inlineData)
      ?.inlineData;

    if (!inline?.data) {
      throw new Error('Gemini image generation did not return image bytes');
    }

    const mimeType = inline.mimeType ?? 'image/png';

    return {
      model,
      mimeType,
      dataUrl: `data:${mimeType};base64,${inline.data}`,
    };
  }

  const response = await client.models.generateImages({
    model,
    prompt,
    config: {
      numberOfImages: 1,
      outputMimeType: 'image/png',
      aspectRatio: '16:9',
      includeRaiReason: true,
    },
  });

  const image = response.generatedImages?.[0]?.image;

  if (!image?.imageBytes) {
    throw new Error('Vertex image generation did not return image bytes');
  }

  const mimeType = image.mimeType ?? 'image/png';

  return {
    model,
    mimeType,
    dataUrl: `data:${mimeType};base64,${image.imageBytes}`,
  };
}

export async function generateVideoWithVertex(
  prompt: string,
  options?: {
    model?: string;
    durationSeconds?: number;
  },
): Promise<VertexVideoOutput> {
  const start = await startVideoGenerationWithVertex(prompt, options);
  let operation = start.operation;
  const client = getVertexClient();

  if (!client) {
    throw new Error(
      'Google GenAI is not configured. Set ADC project/location or GOOGLE_API_KEY.',
    );
  }

  const maxPolls = Number(process.env.VERTEX_VIDEO_MAX_POLLS ?? 18);
  const pollDelayMs = Number(process.env.VERTEX_VIDEO_POLL_DELAY_MS ?? 5000);

  for (let attempt = 0; !operation.done && attempt < maxPolls; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, pollDelayMs));
    operation = (await client.operations.getVideosOperation({
      operation: operation as never,
    })) as unknown as VertexVideoOperationPayload;
  }

  if (!operation.done) {
    throw new Error('Vertex video generation timed out before completion');
  }

  const output = normalizeVertexVideoOutput(operation, start.model);
  if (!output) {
    throw new Error('Vertex video generation did not return a playable payload');
  }

  return output;
}

function normalizeVertexVideoOutput(
  operation: VertexVideoOperationPayload,
  model: string,
): VertexVideoOutput | null {
  const response = (operation as { response?: unknown }).response as
    | {
        generatedVideos?: Array<{
          video?: {
            mimeType?: string;
            videoBytes?: string;
            uri?: string;
          };
        }>;
      }
    | undefined;

  const video = response?.generatedVideos?.[0]?.video;

  if (!video) {
    return null;
  }

  if (video.videoBytes) {
    const mimeType = video.mimeType ?? 'video/mp4';
    return {
      model,
      mimeType,
      dataUrl: `data:${mimeType};base64,${video.videoBytes}`,
    };
  }

  if (video.uri) {
    return {
      model,
      mimeType: video.mimeType,
      uri: video.uri,
    };
  }

  return null;
}

export async function startVideoGenerationWithVertex(
  prompt: string,
  options?: {
    model?: string;
    durationSeconds?: number;
  },
): Promise<{ model: string; operation: VertexVideoOperationPayload }> {
  const client = getVertexClient();

  if (!client) {
    throw new Error(
      'Google GenAI is not configured. Set ADC project/location or GOOGLE_API_KEY.',
    );
  }

  const model = options?.model ?? process.env.VERTEX_VIDEO_MODEL ?? DEFAULT_VIDEO_MODEL;
  const durationSeconds =
    options?.durationSeconds ?? Number(process.env.VERTEX_VIDEO_DURATION_SECONDS ?? 8);
  const operation = await client.models.generateVideos({
    model,
    source: {
      prompt,
    },
    config: {
      numberOfVideos: 1,
      durationSeconds,
      aspectRatio: process.env.VERTEX_VIDEO_ASPECT_RATIO ?? '16:9',
      resolution: process.env.VERTEX_VIDEO_RESOLUTION ?? '720p',
    },
  });

  return {
    model,
    operation: operation as VertexVideoOperationPayload,
  };
}

export async function pollVideoGenerationOperation(
  operationPayload: VertexVideoOperationPayload,
  model: string,
): Promise<{
  done: boolean;
  operation: VertexVideoOperationPayload;
  output?: VertexVideoOutput;
  error?: string;
}> {
  const client = getVertexClient();

  if (!client) {
    throw new Error(
      'Google GenAI is not configured. Set ADC project/location or GOOGLE_API_KEY.',
    );
  }

  const nextOperation = (await client.operations.getVideosOperation({
    operation: operationPayload as never,
  })) as unknown as VertexVideoOperationPayload & { done?: boolean; error?: { message?: string } };

  if (!nextOperation.done) {
    return {
      done: false,
      operation: nextOperation,
    };
  }

  const output = normalizeVertexVideoOutput(nextOperation, model);
  const error = nextOperation.error?.message;

  return {
    done: true,
    operation: nextOperation,
    output: output ?? undefined,
    error,
  };
}

export function getModalityForType(type: 'image' | 'video' | 'animation') {
  if (type === 'image') {
    return Modality.IMAGE;
  }

  if (type === 'video') {
    return Modality.VIDEO;
  }

  return Modality.VIDEO;
}
