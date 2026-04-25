import {
  GenerateVideosOperation,
  GoogleGenAI,
  Modality,
  createPartFromBase64,
  createPartFromText,
  createUserContent,
} from '@google/genai';

import type {
  BrandAssetInput,
  GenerationErrorCategory,
  GenerationErrorMeta,
} from '@/app/lib/canvas/contracts';

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
  name?: string;
  done?: boolean;
  error?: {
    message?: string;
  };
  response?: {
    generatedVideos?: Array<{
      video?: {
        mimeType?: string;
        videoBytes?: string;
        uri?: string;
      };
    }>;
    generateVideoResponse?: {
      generatedSamples?: Array<{
        video?: {
          mimeType?: string;
          videoBytes?: string;
          uri?: string;
        };
      }>;
    };
  };
  [key: string]: unknown;
};

export type GoogleGenAIAuthMode =
  | 'api_key_first'
  | 'vertex_first'
  | 'api_key_only'
  | 'vertex_only';

type GoogleGenAIClientSource = 'api_key' | 'vertex';

type GoogleGenAIClientContext = {
  client: GoogleGenAI;
  source: GoogleGenAIClientSource;
  project?: string;
  location?: string;
};

type VertexProjectConfig = {
  project: string;
  location: string;
  apiVersion: string;
};

type ApiKeyConfig = {
  apiKey: string;
  apiVersion: string;
};

type ParsedGoogleApiError = {
  statusCode?: number | null;
  status?: string | null;
  message: string;
  rawMessage?: string | null;
};

class GenerationProviderError extends Error {
  meta: GenerationErrorMeta;

  constructor(meta: GenerationErrorMeta, cause?: unknown) {
    super(formatGenerationErrorMessage(meta));
    this.name = 'GenerationProviderError';
    this.meta = meta;

    if (cause !== undefined) {
      (this as Error & { cause?: unknown }).cause = cause;
    }
  }
}

let cachedDefaultClientContext: GoogleGenAIClientContext | null = null;
let cachedVideoClientContext: GoogleGenAIClientContext | null = null;

const DEFAULT_TEXT_MODEL = 'gemini-2.5-flash';
const DEFAULT_IMAGE_MODEL = 'gemini-2.5-flash-image';
const DEFAULT_VIDEO_MODEL = 'veo-3.0-fast-generate-001';
const DEFAULT_AUTH_MODE: GoogleGenAIAuthMode = 'api_key_first';
const DEFAULT_RETRY_ATTEMPTS = 3;
const DEFAULT_RETRY_DELAY_MS = 1500;

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

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getAuthMode(): GoogleGenAIAuthMode {
  const raw = process.env.GOOGLE_GENAI_AUTH_MODE?.trim().toLowerCase();

  if (
    raw === 'api_key_first' ||
    raw === 'vertex_first' ||
    raw === 'api_key_only' ||
    raw === 'vertex_only'
  ) {
    return raw;
  }

  return DEFAULT_AUTH_MODE;
}

function isVertexExplicitlyEnabled() {
  const raw = process.env.GOOGLE_GENAI_USE_VERTEXAI?.trim().toLowerCase();
  return raw === '1' || raw === 'true' || raw === 'yes';
}

function parseGoogleApiError(error: unknown): ParsedGoogleApiError {
  if (!(error instanceof Error)) {
    return {
      message: 'Unknown provider error',
      rawMessage: null,
      status: null,
      statusCode: null,
    };
  }

  const rawMessage = error.message?.trim();
  if (!rawMessage) {
    return {
      message: 'Unknown provider error',
      rawMessage,
      status: null,
      statusCode: null,
    };
  }

  try {
    const parsed = JSON.parse(rawMessage) as {
      error?: {
        code?: number;
        status?: string;
        message?: string;
      };
    };

    return {
      statusCode: parsed.error?.code ?? null,
      status: parsed.error?.status ?? null,
      message: parsed.error?.message?.trim() || rawMessage,
      rawMessage,
    };
  } catch {
    return {
      message: rawMessage,
      rawMessage,
      status: null,
      statusCode: null,
    };
  }
}

function classifyErrorCategory(parsed: ParsedGoogleApiError): GenerationErrorCategory {
  const status = parsed.status?.toUpperCase() ?? '';
  const message = parsed.message.toLowerCase();

  if (status === 'RESOURCE_EXHAUSTED' || parsed.statusCode === 429) {
    return 'quota_exhausted';
  }

  if (status === 'NOT_FOUND' && (message.includes('model') || message.includes('access'))) {
    return 'model_not_found_or_no_access';
  }

  if (
    status === 'UNAUTHENTICATED' ||
    status === 'PERMISSION_DENIED' ||
    message.includes('not configured') ||
    message.includes('missing required')
  ) {
    return 'auth_config';
  }

  if (
    status === 'UNAVAILABLE' ||
    status === 'INTERNAL' ||
    status === 'DEADLINE_EXCEEDED' ||
    parsed.statusCode === 503 ||
    parsed.statusCode === 504 ||
    message.includes('timed out') ||
    message.includes('network')
  ) {
    return 'transient';
  }

  return 'unknown';
}

function buildErrorHint(category: GenerationErrorCategory) {
  if (category === 'quota_exhausted') {
    return 'Quota exhausted. Verify project tier/quota in AI Studio and retry later.';
  }

  if (category === 'model_not_found_or_no_access') {
    return 'Model unavailable for current project or region. Check Veo model access and region.';
  }

  if (category === 'auth_config') {
    return 'Auth configuration is invalid. Verify GOOGLE_GENAI_API_KEY or Vertex credentials.';
  }

  if (category === 'transient') {
    return 'Temporary upstream issue. Retry with backoff.';
  }

  return 'Review provider logs for the full response payload.';
}

export function toGenerationErrorMeta(error: unknown): GenerationErrorMeta {
  if (
    error instanceof GenerationProviderError &&
    error.meta &&
    typeof error.meta.category === 'string'
  ) {
    return error.meta;
  }

  const parsed = parseGoogleApiError(error);
  const category = classifyErrorCategory(parsed);

  return {
    category,
    status: parsed.status ?? null,
    statusCode: parsed.statusCode ?? null,
    retryable: category === 'transient' || category === 'quota_exhausted',
    message: parsed.message,
    hint: buildErrorHint(category),
  };
}

export function formatGenerationErrorMessage(meta: GenerationErrorMeta) {
  const statusPrefix = meta.status ? `[${meta.status}] ` : '';
  const statusCodeSuffix = meta.statusCode ? ` (code ${meta.statusCode})` : '';

  if (meta.hint) {
    return `${statusPrefix}${meta.message}${statusCodeSuffix}. ${meta.hint}`;
  }

  return `${statusPrefix}${meta.message}${statusCodeSuffix}`;
}

function toProviderError(error: unknown) {
  if (error instanceof GenerationProviderError) {
    return error;
  }

  return new GenerationProviderError(toGenerationErrorMeta(error), error);
}

function getRetryAttempts() {
  return Number(process.env.GOOGLE_GENAI_RETRY_ATTEMPTS ?? DEFAULT_RETRY_ATTEMPTS);
}

function getRetryDelayMs() {
  return Number(process.env.GOOGLE_GENAI_RETRY_DELAY_MS ?? DEFAULT_RETRY_DELAY_MS);
}

async function withProviderRetry<T>(
  fn: () => Promise<T>,
  options?: {
    shouldRetry?: (meta: GenerationErrorMeta) => boolean;
  },
): Promise<T> {
  const attempts = Math.max(1, getRetryAttempts());
  const delayMs = Math.max(0, getRetryDelayMs());

  let latestError: GenerationProviderError | null = null;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await fn();
    } catch (error) {
      const providerError = toProviderError(error);
      latestError = providerError;

      const canRetryByCategory = providerError.meta.retryable;
      const canRetryByOption = options?.shouldRetry
        ? options.shouldRetry(providerError.meta)
        : true;

      if (attempt >= attempts || !canRetryByCategory || !canRetryByOption) {
        throw providerError;
      }

      await sleep(delayMs * attempt);
    }
  }

  throw latestError ?? new GenerationProviderError(toGenerationErrorMeta(new Error('Retry failed')));
}

function getVertexProjectConfig(options?: {
  forVideo?: boolean;
  locationOverride?: string;
}): VertexProjectConfig | null {
  const project = process.env.GOOGLE_CLOUD_PROJECT;
  const explicitLocationOverride = options?.locationOverride?.trim();
  const videoLocationOverride = options?.forVideo
    ? process.env.VERTEX_VIDEO_LOCATION?.trim()
    : null;
  const location =
    explicitLocationOverride || videoLocationOverride || process.env.GOOGLE_CLOUD_LOCATION;

  if (!project || !location) {
    return null;
  }

  return {
    project,
    location,
    apiVersion: process.env.GOOGLE_GENAI_API_VERSION ?? 'v1beta',
  };
}

function getApiKeyConfig(): ApiKeyConfig | null {
  const apiKey =
    process.env.GOOGLE_GENAI_API_KEY ??
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

function createVertexClientContext(
  vertexConfig: VertexProjectConfig,
): GoogleGenAIClientContext {
  return {
    client: new GoogleGenAI({
      vertexai: true,
      project: vertexConfig.project,
      location: vertexConfig.location,
      apiVersion: vertexConfig.apiVersion,
    }),
    source: 'vertex',
    project: vertexConfig.project,
    location: vertexConfig.location,
  };
}

function createApiKeyClientContext(apiKeyConfig: ApiKeyConfig): GoogleGenAIClientContext {
  return {
    client: new GoogleGenAI({
      apiKey: apiKeyConfig.apiKey,
      apiVersion: apiKeyConfig.apiVersion,
      // Force Gemini API mode even when Vertex env vars are present globally.
      vertexai: false,
    }),
    source: 'api_key',
  };
}

function resolveClientContext(options?: {
  forVideo?: boolean;
  locationOverride?: string;
}): GoogleGenAIClientContext | null {
  const authMode = getAuthMode();
  const vertexConfig = getVertexProjectConfig(options);
  const apiKeyConfig = getApiKeyConfig();
  const vertexAllowedByMode = authMode === 'vertex_first' || authMode === 'vertex_only';
  const vertexEnabled = vertexAllowedByMode || isVertexExplicitlyEnabled();

  if (authMode === 'api_key_only') {
    return apiKeyConfig ? createApiKeyClientContext(apiKeyConfig) : null;
  }

  if (authMode === 'vertex_only') {
    return vertexConfig ? createVertexClientContext(vertexConfig) : null;
  }

  if (authMode === 'vertex_first') {
    if (vertexConfig && vertexEnabled) {
      return createVertexClientContext(vertexConfig);
    }

    return apiKeyConfig ? createApiKeyClientContext(apiKeyConfig) : null;
  }

  if (apiKeyConfig) {
    return createApiKeyClientContext(apiKeyConfig);
  }

  if (vertexConfig && vertexEnabled) {
    return createVertexClientContext(vertexConfig);
  }

  return null;
}

function getVertexClient(options?: {
  forVideo?: boolean;
  locationOverride?: string;
}): GoogleGenAIClientContext | null {
  if (options?.locationOverride) {
    return resolveClientContext(options);
  }

  const useVideoCache = Boolean(options?.forVideo);

  if (useVideoCache && cachedVideoClientContext) {
    return cachedVideoClientContext;
  }

  if (!useVideoCache && cachedDefaultClientContext) {
    return cachedDefaultClientContext;
  }

  const context = resolveClientContext(options);

  if (!context) {
    return null;
  }

  if (useVideoCache) {
    cachedVideoClientContext = context;
  } else {
    cachedDefaultClientContext = context;
  }

  return context;
}

export function isVertexConfigured() {
  return Boolean(resolveClientContext());
}

export function getConfiguredAuthMode(): GoogleGenAIAuthMode {
  return getAuthMode();
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

  const clientContext = getVertexClient();

  if (!clientContext) {
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
    const response = await clientContext.client.models.generateContent({
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
  const clientContext = getVertexClient();

  if (!clientContext) {
    return compactText(params.originalPrompt, 420);
  }

  try {
    const response = await clientContext.client.models.generateContent({
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
  const clientContext = getVertexClient();

  if (!clientContext) {
    throw new GenerationProviderError(
      toGenerationErrorMeta(
        new Error(
          'Google GenAI is not configured. Set GOOGLE_GENAI_API_KEY or enable Vertex mode with project/location.',
        ),
      ),
    );
  }

  const model = modelOverride ?? process.env.VERTEX_IMAGE_MODEL ?? DEFAULT_IMAGE_MODEL;
  const isGeminiImageModel =
    model.includes('gemini') && (model.includes('image') || model.includes('banana'));

  if (isGeminiImageModel) {
    const response = await withProviderRetry(() =>
      clientContext.client.models.generateContent({
        model,
        contents: prompt,
        config: {
          responseModalities: [Modality.TEXT, Modality.IMAGE],
        },
      }),
    );

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

  const response = await withProviderRetry(() =>
    clientContext.client.models.generateImages({
      model,
      prompt,
      config: {
        numberOfImages: 1,
        outputMimeType: 'image/png',
        aspectRatio: '16:9',
        includeRaiReason: true,
      },
    }),
  );

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
  const clientContext = getVertexClient({
    forVideo: true,
    locationOverride: start.location,
  });

  if (!clientContext) {
    throw new GenerationProviderError(
      toGenerationErrorMeta(
        new Error(
          'Google GenAI is not configured. Set GOOGLE_GENAI_API_KEY or enable Vertex mode with project/location.',
        ),
      ),
    );
  }

  const maxPolls = Number(process.env.VERTEX_VIDEO_MAX_POLLS ?? 18);
  const pollDelayMs = Number(process.env.VERTEX_VIDEO_POLL_DELAY_MS ?? 5000);

  for (let attempt = 0; !operation.done && attempt < maxPolls; attempt += 1) {
    await sleep(pollDelayMs);
    operation = await withProviderRetry(
      async () =>
        ((await clientContext.client.operations.getVideosOperation({
          operation: operation as never,
        })) as unknown as VertexVideoOperationPayload),
      {
        shouldRetry: (meta) => meta.category !== 'model_not_found_or_no_access',
      },
    );
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
        generateVideoResponse?: {
          generatedSamples?: Array<{
            video?: {
              mimeType?: string;
              videoBytes?: string;
              uri?: string;
            };
          }>;
        };
      }
    | undefined;

  const video =
    response?.generatedVideos?.[0]?.video ??
    response?.generateVideoResponse?.generatedSamples?.[0]?.video;

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

function getVideoModelCandidates(modelOverride?: string) {
  const primary = modelOverride ?? process.env.VERTEX_VIDEO_MODEL ?? DEFAULT_VIDEO_MODEL;
  const fallbackRaw = process.env.VERTEX_VIDEO_MODEL_FALLBACKS ?? '';
  const fallbacks = fallbackRaw
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);

  return Array.from(new Set([primary, ...fallbacks]));
}

export async function startVideoGenerationWithVertex(
  prompt: string,
  options?: {
    model?: string;
    durationSeconds?: number;
  },
): Promise<{ model: string; operation: VertexVideoOperationPayload; location?: string }> {
  const clientContext = getVertexClient({ forVideo: true });

  if (!clientContext) {
    throw new GenerationProviderError(
      toGenerationErrorMeta(
        new Error(
          'Google GenAI is not configured. Set GOOGLE_GENAI_API_KEY or enable Vertex mode with project/location.',
        ),
      ),
    );
  }

  const models = getVideoModelCandidates(options?.model);
  const durationSeconds =
    options?.durationSeconds ?? Number(process.env.VERTEX_VIDEO_DURATION_SECONDS ?? 8);
  let latestError: GenerationProviderError | null = null;

  for (const model of models) {
    try {
      const operation = await withProviderRetry(
        () =>
          clientContext.client.models.generateVideos({
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
          }),
        {
          shouldRetry: (meta) => meta.category !== 'model_not_found_or_no_access',
        },
      );

      return {
        model,
        operation: operation as unknown as VertexVideoOperationPayload,
        location: clientContext.location,
      };
    } catch (error) {
      const providerError = toProviderError(error);
      latestError = providerError;

      if (providerError.meta.category !== 'model_not_found_or_no_access') {
        throw providerError;
      }
    }
  }

  throw (
    latestError ??
    new GenerationProviderError(
      toGenerationErrorMeta(
        new Error('No accessible Veo model found from configured primary/fallback list.'),
      ),
    )
  );
}

export async function pollVideoGenerationOperation(
  operationPayload: VertexVideoOperationPayload | string,
  model: string,
  locationOverride?: string,
): Promise<{
  done: boolean;
  operation: VertexVideoOperationPayload;
  output?: VertexVideoOutput;
  error?: string;
}> {
  const clientContext = getVertexClient({
    forVideo: true,
    locationOverride,
  });

  if (!clientContext) {
    throw new GenerationProviderError(
      toGenerationErrorMeta(
        new Error(
          'Google GenAI is not configured. Set GOOGLE_GENAI_API_KEY or enable Vertex mode with project/location.',
        ),
      ),
    );
  }

  let operationReference: VertexVideoOperationPayload;

  if (typeof operationPayload === 'string') {
    const operation = new GenerateVideosOperation();
    operation.name = operationPayload;
    operationReference = operation as unknown as VertexVideoOperationPayload;
  } else if (
    typeof (operationPayload as { _fromAPIResponse?: unknown })._fromAPIResponse === 'function'
  ) {
    operationReference = operationPayload;
  } else if (operationPayload.name) {
    const operation = new GenerateVideosOperation();
    operation.name = operationPayload.name;
    operationReference = operation as unknown as VertexVideoOperationPayload;
  } else {
    throw new Error('Missing video operation name for polling.');
  }

  const nextOperation = await withProviderRetry(
    async () =>
      ((await clientContext.client.operations.getVideosOperation({
        operation: operationReference as never,
      })) as unknown as VertexVideoOperationPayload & {
        done?: boolean;
        error?: { message?: string };
      }),
    {
      shouldRetry: (meta) => meta.category !== 'model_not_found_or_no_access',
    },
  );

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
