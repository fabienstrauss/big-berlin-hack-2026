import type {
  CanvasInsertionPayload,
  GenerateInput,
  TavilyInput,
  TemplateInput,
} from './contracts';
import { contentTemplates } from '../templates/catalog';

function createPreviewDataUrl(title: string, eyebrow: string, from: string, to: string) {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="1200" height="720" viewBox="0 0 1200 720">
      <defs>
        <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${from}" />
          <stop offset="100%" stop-color="${to}" />
        </linearGradient>
      </defs>
      <rect width="1200" height="720" rx="48" fill="url(#g)" />
      <rect x="56" y="56" width="260" height="44" rx="22" fill="rgba(255,255,255,0.74)" />
      <text x="84" y="84" fill="#0f172a" font-family="Arial, sans-serif" font-size="20" font-weight="700">${eyebrow}</text>
      <text x="84" y="230" fill="#0f172a" font-family="Arial, sans-serif" font-size="68" font-weight="700">${title}</text>
      <text x="84" y="290" fill="#334155" font-family="Arial, sans-serif" font-size="28">Prototype preview rendered on the canvas</text>
    </svg>
  `;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

export function createMockGenerationPayload(
  input: GenerateInput,
): CanvasInsertionPayload {
  const preview = createPreviewDataUrl(
    input.type === 'image'
      ? 'HERO VISUAL'
      : input.type === 'video'
        ? 'LAUNCH TEASER'
        : 'LOOPING MOTION',
    input.type === 'image'
      ? 'Nanobanana image'
      : input.type === 'video'
        ? 'Veo video'
        : 'Hera animation',
    input.type === 'image' ? '#fbcfe8' : input.type === 'video' ? '#bfdbfe' : '#ddd6fe',
    input.type === 'image' ? '#fde68a' : input.type === 'video' ? '#67e8f9' : '#f9a8d4',
  );

  return {
    items: [
      {
        key: 'generated-result',
        data: {
          kind: 'generation',
          badge: 'Generated Result',
          title:
            input.type === 'image'
              ? 'AI image concept'
              : input.type === 'video'
                ? 'AI video concept'
                : 'AI animation concept',
          subtitle:
            input.type === 'image'
              ? 'Nanobanana mock output'
              : input.type === 'video'
                ? 'Veo mock output'
                : 'Hera mock output',
          accent: 'from-fuchsia-100 via-white to-rose-50',
          status: 'done',
          prompt: input.prompt,
          hideAssetMeta: true,
          assetItems: [
            {
              id: 'generated-asset',
              label:
                input.type === 'image'
                  ? 'generated-image.png'
                  : 'generated-video.mp4',
              type: input.type === 'image' ? 'image' : 'video',
              meta: '',
              previewUrl: preview,
            },
          ],
        },
      },
    ],
  };
}

export function createMockSearchPayload(input: TavilyInput): CanvasInsertionPayload {
  if (!input.includeImages) {
    return {
      items: [
        {
          key: 'research-note',
          data: {
            kind: 'research',
            badge: 'Tavily Research',
            title: `Research for "${input.query}"`,
            subtitle: 'Mock search output for the canvas',
            accent: 'from-cyan-100 via-white to-blue-50',
            body:
              `Tavily summary for ${input.query}: the strongest pages lean on concrete proof, category-specific phrasing, and people using the product in context.`,
            bullets: [
              'Winning pages use a sharp problem statement above the fold.',
              'Short comparison blocks and proof screenshots drive trust.',
              'UGC-style visuals outperform isolated packshots for conversion content.',
            ],
          },
        },
      ],
    };
  }

  return {
    items: [
      {
        key: 'research-note',
        offsetX: -170,
        data: {
          kind: 'research',
          badge: 'Tavily Research',
          title: `Research for "${input.query}"`,
          subtitle: 'Mock search output for the canvas',
          accent: 'from-cyan-100 via-white to-blue-50',
          body:
            `Tavily summary for ${input.query}: the strongest pages lean on concrete proof, category-specific phrasing, and people using the product in context. Image results were also requested and pinned for moodboarding.`,
          bullets: [
            'Winning pages use a sharp problem statement above the fold.',
            'Short comparison blocks and proof screenshots drive trust.',
            'UGC-style visuals outperform isolated packshots for conversion content.',
          ],
        },
      },
      {
        key: 'image-stack',
        offsetX: 170,
        offsetY: 48,
        data: {
          kind: 'image-stack',
          badge: 'Selected Images',
          title: `Image picks for "${input.query}"`,
          subtitle: 'Pinned from search results',
          accent: 'from-slate-100 via-white to-zinc-50',
          stackItems: [
            { label: 'hero lifestyle', tint: 'from-rose-200 to-orange-100' },
            { label: 'product detail', tint: 'from-sky-200 to-cyan-100' },
            { label: 'workspace scene', tint: 'from-emerald-200 to-lime-100' },
          ],
        },
      },
    ],
    edges: [
      {
        sourceKey: 'research-note',
        targetKey: 'image-stack',
      },
    ],
  };
}

export function createMockTemplatePayload(
  input: TemplateInput,
): CanvasInsertionPayload {
  const template = contentTemplates.find((item) => item.id === input.templateId);

  if (!template) {
    return {
      items: [],
    };
  }

  return {
    items: [
      {
        key: 'template-result',
        data: {
          kind: 'template',
          badge: template.category,
          title: template.title,
          subtitle: template.vibe,
          accent: 'from-indigo-100 via-white to-sky-50',
          templateId: template.id,
          body: template.description,
          bullets: template.hooks,
          imagePrompt: template.imagePrompt,
          videoPrompt: template.videoPrompt,
          animationPrompt: template.animationPrompt,
          hideAssetMeta: true,
          assetItems: template.assets?.map((asset, index) => ({
            id: `${template.id}-asset-${index}`,
            label: asset.label,
            type: asset.type,
            meta: '',
            previewUrl: asset.src,
          })),
        },
      },
    ],
  };
}
