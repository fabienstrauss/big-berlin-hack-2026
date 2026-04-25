import { expect, test } from '@playwright/test';

import {
  fillGenerateForm,
  fillScrapeForm,
  gotoBoard,
  submitGenerate,
  submitScrape,
} from './helpers';

const SAMPLE_IMAGE_DATA_URL =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAGElEQVR4nGP8z8Dwn4GBgYGJgQEIMAAAW6sC4hQ2lfUAAAAASUVORK5CYII=';

test.describe('Canvas pipeline mocked regressions', () => {
  test('adds generated image nodes from mocked /api/generate', async ({ page }) => {
    await page.route('**/api/generate', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          items: [
            {
              key: 'generation-result',
              data: {
                kind: 'generation',
                badge: 'Generated Result',
                title: 'Brand-aligned image',
                subtitle: 'Vertex image generation (gemini-2.5-flash-image)',
                accent: 'from-fuchsia-100 via-white to-rose-50',
                body: 'Synthetic generated description.',
                prompt: 'Synthetic prompt',
                assetItems: [
                  {
                    id: 'vertex-image-1',
                    label: 'generated-image.png',
                    type: 'image',
                    meta: 'gemini-2.5-flash-image',
                    previewUrl: SAMPLE_IMAGE_DATA_URL,
                  },
                ],
              },
            },
            {
              key: 'brand-profile',
              data: {
                kind: 'template',
                badge: 'Brand Profile',
                title: 'Mock brand profile',
                subtitle: 'Derived from uploaded image/PDF notes',
                accent: 'from-indigo-100 via-white to-sky-50',
              },
            },
          ],
          edges: [
            {
              sourceKey: 'brand-profile',
              targetKey: 'generation-result',
            },
          ],
        }),
      });
    });

    await gotoBoard(page);
    await fillGenerateForm(page, {
      type: 'image',
      prompt: 'Create a mock hero image for hydration brand.',
      includeResearch: false,
    });

    await submitGenerate(page);

    await expect(page.getByText('Brand-aligned image')).toBeVisible();
    await expect(page.getByRole('img', { name: 'generated-image.png' }).first()).toBeVisible();
    await expect(page.getByText('Mock brand profile')).toBeVisible();
  });

  test('adds Tavily research + citation + image stack nodes from mocked /api/search', async ({
    page,
  }) => {
    await page.route('**/api/search', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          items: [
            {
              key: 'research-note',
              data: {
                kind: 'research',
                badge: 'Tavily Research',
                title: 'Research for "hydration trends DACH"',
                subtitle: 'Context pack with grounded citations',
                accent: 'from-cyan-100 via-white to-blue-50',
                body: 'Hydration products with electrolyte bundles are trending.',
                bullets: ['Citation snippet A', 'Citation snippet B'],
              },
            },
            {
              key: 'citations',
              data: {
                kind: 'research',
                badge: 'Citations',
                title: 'Source links',
                subtitle: '2 sources',
                accent: 'from-slate-100 via-white to-zinc-50',
                bullets: ['Source A — https://example.com/a', 'Source B — https://example.com/b'],
              },
            },
            {
              key: 'image-stack',
              data: {
                kind: 'image-stack',
                badge: 'Reference Images',
                title: 'Visual references',
                subtitle: 'From Tavily image search',
                accent: 'from-emerald-100 via-white to-cyan-50',
                stackItems: [
                  { label: 'ref 1', tint: 'from-rose-200 to-orange-100' },
                  { label: 'ref 2', tint: 'from-sky-200 to-cyan-100' },
                ],
                assetItems: [
                  {
                    id: 'reference-image-1',
                    label: 'reference-1.png',
                    type: 'image',
                    meta: 'Tavily image result',
                    previewUrl: SAMPLE_IMAGE_DATA_URL,
                  },
                ],
              },
            },
          ],
          edges: [
            { sourceKey: 'research-note', targetKey: 'citations' },
            { sourceKey: 'research-note', targetKey: 'image-stack' },
          ],
        }),
      });
    });

    await gotoBoard(page);
    await fillScrapeForm(page, {
      query: 'hydration trends DACH',
      includeImages: true,
    });
    await submitScrape(page);

    await expect(page.getByText('Research for "hydration trends DACH"')).toBeVisible();
    await expect(page.getByText('Source links')).toBeVisible();
    await expect(page.getByText('Visual references')).toBeVisible();
  });

  test('surfaces controlled generation error node payload', async ({ page }) => {
    await page.route('**/api/generate', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          items: [
            {
              key: 'generation-result',
              data: {
                kind: 'generation',
                badge: 'Generated Result',
                title: 'Brand-aligned video',
                subtitle: 'Generation Error video generation (unavailable)',
                accent: 'from-fuchsia-100 via-white to-rose-50',
                body: 'Provider rejected request.',
                assetItems: [
                  {
                    id: 'generation-error-1',
                    label: 'video-generation-error.txt',
                    type: 'document',
                    meta: 'Provider rejected request.',
                  },
                ],
              },
            },
          ],
          edges: [],
        }),
      });
    });

    await gotoBoard(page);
    await fillGenerateForm(page, {
      type: 'video',
      prompt: 'Generate a cinematic product reveal video.',
      includeResearch: false,
    });
    await submitGenerate(page);

    await expect(page.getByText('Brand-aligned video')).toBeVisible();
    await expect(page.getByText('Generation Error video generation (unavailable)')).toBeVisible();
    await expect(page.getByText('video-generation-error.txt')).toBeVisible();
  });

  test('keeps Hera placeholder node stable when file URL is missing', async ({ page }) => {
    await page.route('**/api/generate', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          items: [
            {
              key: 'generation-result',
              data: {
                kind: 'generation',
                badge: 'Generated Result',
                title: 'Brand-aligned animation',
                subtitle: 'Hera animation generation (queued)',
                accent: 'from-fuchsia-100 via-white to-rose-50',
                body: 'Animation queued, waiting for final render URL.',
                assetItems: [
                  {
                    id: 'hera-video-queued',
                    label: 'hera-animation.mp4',
                    type: 'document',
                    meta: 'queued',
                  },
                ],
              },
            },
          ],
          edges: [],
        }),
      });
    });

    await gotoBoard(page);
    await fillGenerateForm(page, {
      type: 'animation',
      prompt: 'Animate text overlays for product CTA sequence.',
      includeResearch: false,
    });
    await submitGenerate(page);

    await expect(page.getByText('Brand-aligned animation')).toBeVisible();
    await expect(page.getByText('Hera animation generation (queued)')).toBeVisible();
    await expect(page.getByText('hera-animation.mp4')).toBeVisible();
  });
});
