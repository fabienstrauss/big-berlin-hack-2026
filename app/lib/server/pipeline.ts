import type {
  CanvasInsertionPayload,
  GenerateInput,
  TavilyInput,
} from '@/app/lib/canvas/contracts';
import type { CanvasAssetItem, CanvasNodeData } from '@/app/lib/canvas/types';
import {
  createMockGenerationPayload,
  createMockSearchPayload,
} from '@/app/lib/canvas/mock-content';

import { synthesizeWithGradium } from './providers/gradium';
import { generateWithHera } from './providers/hera';
import { searchWithTavily, type TavilySearchOutput } from './providers/tavily';
import {
  composeGenerationPrompt,
  extractBrandProfile,
  generateImageWithVertex,
  generateVideoWithVertex,
  isVertexConfigured,
  rewriteNarrationScript,
} from './providers/vertex';

function compactText(value: string, max = 180) {
  const normalized = value.replace(/\s+/g, ' ').trim();

  if (normalized.length <= max) {
    return normalized;
  }

  return `${normalized.slice(0, max - 1)}…`;
}

function formatCitation(citation: { title: string; url: string }) {
  return `${compactText(citation.title, 80)} — ${citation.url}`;
}

function createNode(
  key: string,
  data: Omit<CanvasNodeData, 'onUpdate'>,
  offsetX?: number,
  offsetY?: number,
) {
  return {
    key,
    offsetX,
    offsetY,
    data,
  };
}

function createSearchPayloadFromResult(
  input: TavilyInput,
  result: TavilySearchOutput,
): CanvasInsertionPayload {
  const payload: CanvasInsertionPayload = {
    items: [
      createNode(
        'research-note',
        {
          kind: 'research',
          badge: 'Tavily Research',
          title: `Research for "${result.query}"`,
          subtitle: 'Context pack with grounded citations',
          accent: 'from-cyan-100 via-white to-blue-50',
          body: result.summary,
          bullets: result.citations.slice(0, 4).map((citation) => citation.content),
          chips: ['source-grounded', 'tavily'],
        },
        input.includeImages ? -170 : 0,
        0,
      ),
      createNode(
        'citations',
        {
          kind: 'research',
          badge: 'Citations',
          title: 'Source links',
          subtitle: `${result.citations.length} sources`,
          accent: 'from-slate-100 via-white to-zinc-50',
          bullets: result.citations.slice(0, 6).map(formatCitation),
          chips: ['verification'],
        },
        input.includeImages ? -130 : 120,
        170,
      ),
    ],
    edges: [
      {
        sourceKey: 'research-note',
        targetKey: 'citations',
      },
    ],
  };

  if (input.includeImages && result.images.length) {
    payload.items.push(
      createNode(
        'image-stack',
        {
          kind: 'image-stack',
          badge: 'Reference Images',
          title: 'Visual references',
          subtitle: 'From Tavily image search',
          accent: 'from-emerald-100 via-white to-cyan-50',
          stackItems: result.images.slice(0, 3).map((url, index) => ({
            label: `ref ${index + 1}`,
            tint:
              index % 3 === 0
                ? 'from-rose-200 to-orange-100'
                : index % 3 === 1
                  ? 'from-sky-200 to-cyan-100'
                  : 'from-emerald-200 to-lime-100',
          })),
          assetItems: result.images.slice(0, 3).map((url, index) => ({
            id: `reference-image-${index}`,
            label: `reference-${index + 1}.png`,
            type: 'image',
            meta: 'Tavily image result',
            previewUrl: url,
          })),
        },
        180,
        40,
      ),
    );

    payload.edges?.push({
      sourceKey: 'research-note',
      targetKey: 'image-stack',
    });
  }

  return payload;
}

export async function buildSearchPayload(
  input: TavilyInput,
): Promise<CanvasInsertionPayload> {
  try {
    const result = await searchWithTavily({
      query: input.query,
      includeImages: input.includeImages,
      maxResults: input.maxResults,
    });

    return createSearchPayloadFromResult(input, result);
  } catch {
    return createMockSearchPayload(input);
  }
}

function createVisualAssetFromError(type: GenerateInput['type'], message: string): CanvasAssetItem {
  return {
    id: `generation-error-${Date.now()}`,
    label: `${type}-generation-error.txt`,
    type: 'document',
    meta: compactText(message, 80),
  };
}

function createGenerationNodeSubtitle(
  type: GenerateInput['type'],
  provider: string,
  model: string,
) {
  if (type === 'image') {
    return `${provider} image generation (${model})`;
  }

  if (type === 'video') {
    return `${provider} video generation (${model})`;
  }

  return `${provider} animation generation (${model})`;
}

export async function buildGenerationPayload(
  input: GenerateInput,
): Promise<CanvasInsertionPayload> {
  const shouldIncludeResearch =
    input.includeResearch !== false && Boolean(input.contextQuery?.trim());

  const research = shouldIncludeResearch
    ? await searchWithTavily({
        query: input.contextQuery!.trim(),
        includeImages: true,
        maxResults: 5,
      }).catch(() => null)
    : null;

  const brandProfile = await extractBrandProfile(input.brandAssets ?? [], input.brandNotes ?? '');
  const composedPrompt = composeGenerationPrompt({
    prompt: input.prompt,
    type: input.type,
    brandProfile,
    tavilyContext: research,
  });

  const narrationScript = await rewriteNarrationScript({
    originalPrompt: input.prompt,
    composedPrompt,
    research,
  });

  let visualAsset: CanvasAssetItem;
  let providerLabel = 'Mock Provider';
  let providerModel = 'mock';

  try {
    if (input.type === 'image') {
      const image = await generateImageWithVertex(
        composedPrompt,
        input.modelOverrides?.vertexImageModel,
      );
      providerLabel = 'Vertex';
      providerModel = image.model;
      visualAsset = {
        id: `vertex-image-${Date.now()}`,
        label: 'generated-image.png',
        type: 'image',
        meta: image.model,
        previewUrl: image.dataUrl,
      };
    } else if (input.type === 'video') {
      const video = await generateVideoWithVertex(composedPrompt, {
        model: input.modelOverrides?.vertexVideoModel,
        durationSeconds: input.modelOverrides?.vertexVideoDurationSeconds,
      });
      providerLabel = 'Vertex';
      providerModel = video.model;
      visualAsset = {
        id: `vertex-video-${Date.now()}`,
        label: 'generated-video.mp4',
        type: 'video',
        meta: video.model,
        previewUrl: video.dataUrl ?? video.uri,
      };
    } else {
      const animation = await generateWithHera({
        prompt: composedPrompt,
        durationSeconds: 8,
      });
      providerLabel = 'Hera';
      providerModel = animation.status ?? 'queued';
      visualAsset = {
        id: `hera-video-${animation.videoId}`,
        label: 'hera-animation.mp4',
        type: animation.fileUrl || animation.projectUrl ? 'video' : 'document',
        meta: animation.status ?? 'in-progress',
        previewUrl: animation.fileUrl ?? animation.projectUrl,
      };
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown generation error';

    if (!isVertexConfigured() && input.type !== 'animation') {
      return createMockGenerationPayload(input);
    }

    visualAsset = createVisualAssetFromError(input.type, message);
    providerLabel = 'Generation Error';
    providerModel = 'unavailable';
  }

  const payload: CanvasInsertionPayload = {
    items: [
      createNode(
        'generation-result',
        {
          kind: 'generation',
          badge: 'Generated Result',
          title:
            input.type === 'image'
              ? 'Brand-aligned image'
              : input.type === 'video'
                ? 'Brand-aligned video'
                : 'Brand-aligned animation',
          subtitle: createGenerationNodeSubtitle(input.type, providerLabel, providerModel),
          accent: 'from-fuchsia-100 via-white to-rose-50',
          prompt: composedPrompt,
          body: compactText(narrationScript, 420),
          chips: ['adc-first', providerLabel.toLowerCase()],
          assetItems: [visualAsset],
        },
      ),
      createNode(
        'brand-profile',
        {
          kind: 'template',
          badge: 'Brand Profile',
          title: brandProfile.brandName ?? 'Extracted brand guidance',
          subtitle: 'Derived from uploaded image/PDF notes',
          accent: 'from-indigo-100 via-white to-sky-50',
          bullets: [
            ...(brandProfile.voiceTone.length
              ? [`Tone: ${brandProfile.voiceTone.join(', ')}`]
              : []),
            ...(brandProfile.palette.length
              ? [
                  `Palette: ${brandProfile.palette
                    .slice(0, 4)
                    .map((entry) => entry.hex)
                    .join(', ')}`,
                ]
              : []),
            ...(brandProfile.dos.slice(0, 2).map((item) => `Do: ${item}`) ?? []),
            ...(brandProfile.donts.slice(0, 2).map((item) => `Avoid: ${item}`) ?? []),
          ],
          chips: ['brand-locked'],
        },
        -180,
        -30,
      ),
    ],
    edges: [
      {
        sourceKey: 'brand-profile',
        targetKey: 'generation-result',
      },
    ],
  };

  if (research) {
    payload.items.push(
      createNode(
        'research-note',
        {
          kind: 'research',
          badge: 'Tavily Context',
          title: `Context for "${research.query}"`,
          subtitle: `${research.citations.length} source(s)` ,
          accent: 'from-cyan-100 via-white to-blue-50',
          body: research.summary,
          bullets: research.citations.slice(0, 4).map((citation) => citation.content),
          chips: ['citation-grounded'],
        },
        170,
        -20,
      ),
    );

    payload.edges?.push({
      sourceKey: 'research-note',
      targetKey: 'generation-result',
    });
  }

  if (input.audio?.enabled) {
    try {
      const audio = await synthesizeWithGradium({
        text: narrationScript,
        voiceId: input.audio.voiceId,
        outputFormat: input.audio.outputFormat,
      });

      payload.items.push(
        createNode(
          'audio-track',
          {
            kind: 'asset',
            badge: 'Gradium Audio',
            title: 'Narration Track',
            subtitle: 'TTS generated from scene script',
            accent: 'from-emerald-100 via-white to-lime-50',
            body: compactText(narrationScript, 280),
            chips: ['gradium', input.audio.voiceId || 'default-voice'],
            assetItems: [
              {
                id: `gradium-audio-${Date.now()}`,
                label: `narration.${audio.format === 'wav' ? 'wav' : 'ogg'}`,
                type: 'audio',
                meta: `Gradium ${audio.format}`,
                previewUrl: audio.dataUrl,
              },
            ],
          },
          0,
          190,
        ),
      );

      payload.edges?.push({
        sourceKey: 'generation-result',
        targetKey: 'audio-track',
      });
    } catch (error) {
      payload.items.push(
        createNode(
          'audio-track',
          {
            kind: 'asset',
            badge: 'Gradium Audio',
            title: 'Narration generation failed',
            subtitle: 'Check Gradium API configuration',
            accent: 'from-amber-100 via-white to-orange-50',
            body:
              error instanceof Error
                ? compactText(error.message, 240)
                : 'Unknown Gradium error',
            chips: ['gradium-error'],
          },
          0,
          190,
        ),
      );

      payload.edges?.push({
        sourceKey: 'generation-result',
        targetKey: 'audio-track',
      });
    }
  }

  return payload;
}
