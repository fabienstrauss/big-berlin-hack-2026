export type TavilySearchInput = {
  query: string;
  includeImages?: boolean;
  maxResults?: number;
};

export type TavilyCitation = {
  title: string;
  url: string;
  content: string;
  score?: number;
};

export type TavilySearchOutput = {
  query: string;
  summary: string;
  citations: TavilyCitation[];
  images: string[];
};

type TavilyResponse = {
  query?: string;
  answer?: string;
  images?: string[];
  results?: Array<{
    title?: string;
    url?: string;
    content?: string;
    score?: number;
  }>;
};

const DEFAULT_ENDPOINT = 'https://api.tavily.com/search';

function compactText(value: string, max = 220) {
  const normalized = value.replace(/\s+/g, ' ').trim();
  if (normalized.length <= max) {
    return normalized;
  }

  return `${normalized.slice(0, max - 1)}…`;
}

export async function searchWithTavily(
  input: TavilySearchInput,
): Promise<TavilySearchOutput> {
  const apiKey = process.env.TAVILY_API_KEY;

  if (!apiKey) {
    throw new Error('TAVILY_API_KEY is not set');
  }

  const response = await fetch(process.env.TAVILY_SEARCH_URL ?? DEFAULT_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    cache: 'no-store',
    body: JSON.stringify({
      api_key: apiKey,
      query: input.query,
      search_depth: 'advanced',
      include_answer: true,
      include_images: Boolean(input.includeImages),
      max_results: input.maxResults ?? 6,
    }),
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Tavily search failed (${response.status}): ${details}`);
  }

  const payload = (await response.json()) as TavilyResponse;
  const citations = (payload.results ?? [])
    .filter((result) => result.url)
    .map((result) => ({
      title: result.title?.trim() || 'Untitled source',
      url: result.url as string,
      content: compactText(result.content ?? ''),
      score: result.score,
    }));

  const summary = payload.answer?.trim()
    ? payload.answer.trim()
    : citations.length
      ? citations
          .slice(0, 3)
          .map((citation) => citation.content)
          .join(' ')
      : `No Tavily results were returned for "${input.query}".`;

  return {
    query: payload.query?.trim() || input.query,
    summary: compactText(summary, 420),
    citations,
    images: (payload.images ?? []).slice(0, 6),
  };
}
