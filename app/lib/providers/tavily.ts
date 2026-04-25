import 'server-only';

import type { CanvasInsertionPayload, TavilyInput } from '../canvas/contracts';
import { getRequiredServerEnv } from './env';

type TavilySearchResult = {
  title?: string;
  url?: string;
  content?: string;
};

type TavilyImage =
  | string
  | {
      url?: string;
      description?: string;
    };

type TavilySearchResponse = {
  answer?: string;
  results?: TavilySearchResult[];
  images?: TavilyImage[];
};

function hostnameFromUrl(url?: string) {
  if (!url) {
    return 'source';
  }

  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return 'source';
  }
}

export function isTavilyConfigured() {
  return Boolean(process.env.TAVILY_API_KEY);
}

export async function searchWithTavily(
  input: TavilyInput,
): Promise<CanvasInsertionPayload> {
  const apiKey = getRequiredServerEnv('TAVILY_API_KEY');

  const response = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query: input.query,
      topic: 'general',
      search_depth: 'advanced',
      max_results: 5,
      include_answer: 'advanced',
      include_images: input.includeImages,
      include_image_descriptions: input.includeImages,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Tavily request failed: ${response.status} ${errorText}`);
  }

  const json = (await response.json()) as TavilySearchResponse;
  const bullets =
    json.results?.slice(0, 3).map((result) => {
      const source = hostnameFromUrl(result.url);
      const summary = result.content?.slice(0, 120)?.trim() ?? result.title ?? 'Relevant result';
      return `${source}: ${summary}`;
    }) ?? [];

  const payload: CanvasInsertionPayload = {
    items: [
      {
        key: 'research-note',
        offsetX: input.includeImages ? -170 : 0,
        data: {
          kind: 'research',
          badge: 'Tavily Research',
          title: `Research for "${input.query}"`,
          subtitle: 'Live Tavily search output',
          accent: 'from-cyan-100 via-white to-blue-50',
          body:
            json.answer ??
            `No synthesized answer returned for ${input.query}, but sources were retrieved.`,
          bullets,
        },
      },
    ],
    edges: [],
  };

  if (!input.includeImages) {
    return payload;
  }

  const stackItems =
    json.images?.slice(0, 3).map((image, index) => {
      const label =
        typeof image === 'string'
          ? `image ${index + 1}`
          : image.description?.slice(0, 20) || `image ${index + 1}`;
      const tints = [
        'from-rose-200 to-orange-100',
        'from-sky-200 to-cyan-100',
        'from-emerald-200 to-lime-100',
      ];

      return {
        label,
        tint: tints[index % tints.length],
      };
    }) ?? [];

  if (!stackItems.length) {
    return payload;
  }

  payload.items.push({
    key: 'image-stack',
    offsetX: 170,
    offsetY: 48,
    data: {
      kind: 'image-stack',
      badge: 'Selected Images',
      title: `Image picks for "${input.query}"`,
      subtitle: 'Live Tavily image results',
      accent: 'from-slate-100 via-white to-zinc-50',
      stackItems,
    },
  });

  payload.edges?.push({
    sourceKey: 'research-note',
    targetKey: 'image-stack',
  });

  return payload;
}
