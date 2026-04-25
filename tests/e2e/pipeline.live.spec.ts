import { expect, test } from '@playwright/test';

import {
  expectAnyEdges,
  fillGenerateForm,
  fillScrapeForm,
  getLiveGate,
  gotoBoard,
  submitGenerate,
  submitScrape,
} from './helpers';

const gate = getLiveGate();

test.describe('@live Full provider matrix', () => {
  test.describe.configure({ mode: 'serial' });
  test.skip(!gate.enabled, gate.reason);

  test('Tavily returns research cards with image stack', async ({ page }) => {
    await gotoBoard(page);

    await fillScrapeForm(page, {
      query: 'latest hydration consumer trends in Germany 2026',
      includeImages: true,
    });

    await submitScrape(page);

    await expect(
      page.getByText('Research for "latest hydration consumer trends in Germany 2026"'),
    ).toBeVisible({ timeout: 90_000 });
    await expect(page.getByText('Source links')).toBeVisible();
    await expect(page.getByText('Visual references')).toBeVisible();
  });

  test('Vertex Nano Banana image generation inserts image asset node', async ({ page }) => {
    await gotoBoard(page);

    await fillGenerateForm(page, {
      type: 'image',
      prompt:
        'Create a premium ad visual for a reusable water bottle on a clean marble surface, bright daylight, minimal style.',
      includeResearch: false,
    });

    await submitGenerate(page);

    await expect(page.getByText('Brand-aligned image')).toBeVisible({ timeout: 120_000 });
    await expect(page.getByRole('img', { name: 'generated-image.png' }).first()).toBeVisible();
  });

  test('Vertex Imagen fallback model path inserts image asset node', async ({ page }) => {
    await page.route(
      '**/api/generate',
      async (route) => {
        const currentBody = JSON.parse(route.request().postData() || '{}');
        currentBody.modelOverrides = {
          ...(currentBody.modelOverrides || {}),
          vertexImageModel: 'imagen-4.0-fast-generate-001',
        };

        await route.continue({ postData: JSON.stringify(currentBody) });
      },
      { times: 1 },
    );

    await gotoBoard(page);

    await fillGenerateForm(page, {
      type: 'image',
      prompt:
        'Generate a crisp studio product scene for a hydration bottle with subtle reflections and clean shadows.',
      includeResearch: false,
    });

    await submitGenerate(page);

    await expect(page.getByText('Brand-aligned image')).toBeVisible({ timeout: 120_000 });
    await expect(page.getByRole('img', { name: 'generated-image.png' }).first()).toBeVisible();
  });

  test('Veo fast returns playable video asset node', async ({ page }) => {
    test.setTimeout(10 * 60 * 1000);

    await gotoBoard(page);

    const prompt =
      'A cinematic close-up sequence of a hydration bottle on a desk, natural morning light, smooth camera motion, 16:9.';

    let hasPlayableVideo = false;

    for (let attempt = 0; attempt < 2; attempt += 1) {
      await fillGenerateForm(page, {
        type: 'video',
        prompt,
        includeResearch: false,
      });

      await submitGenerate(page);
      await expect(page.getByText('Brand-aligned video')).toBeVisible({
        timeout: 8 * 60 * 1000,
      });

      const playableVideoCount = await page.locator('video').count();
      if (playableVideoCount > 0) {
        hasPlayableVideo = true;
        break;
      }
    }

    expect(
      hasPlayableVideo,
      'Expected at least one Veo attempt to return a playable video node.',
    ).toBe(true);
    await expect(page.locator('video').first()).toBeVisible();
  });

  test('Veo invalid-duration boundary returns controlled Generation Error node', async ({ page }) => {
    await page.route(
      '**/api/generate',
      async (route) => {
        const currentBody = JSON.parse(route.request().postData() || '{}');
        currentBody.modelOverrides = {
          ...(currentBody.modelOverrides || {}),
          vertexVideoDurationSeconds: 12,
        };

        await route.continue({ postData: JSON.stringify(currentBody) });
      },
      { times: 1 },
    );

    await gotoBoard(page);

    await fillGenerateForm(page, {
      type: 'video',
      prompt: 'A clean product montage for a hydration bottle, 16:9 advertising style.',
      includeResearch: false,
    });

    await submitGenerate(page);

    await expect(page.getByText('Brand-aligned video')).toBeVisible({ timeout: 120_000 });
    await expect(page.getByText('Generation Error video generation (unavailable)')).toBeVisible();
    await expect(page.getByText('video-generation-error.txt')).toBeVisible();
  });

  test('Gradium audio generation creates narration node (wav + opus)', async ({ page }) => {
    await gotoBoard(page);

    await fillGenerateForm(page, {
      type: 'image',
      prompt: 'A high-contrast hero image for a hydration campaign with strong brand clarity.',
      includeResearch: false,
      enableAudio: true,
      audioFormat: 'wav',
    });

    await submitGenerate(page);

    await expect(page.getByText('Narration Track')).toBeVisible({ timeout: 180_000 });
    await expect(page.getByText('Gradium wav').first()).toBeVisible();
    await expect(page.locator('audio').first()).toBeVisible();

    await gotoBoard(page);

    await fillGenerateForm(page, {
      type: 'image',
      prompt: 'A fresh lifestyle visual for hydration product launch.',
      includeResearch: false,
      enableAudio: true,
      audioFormat: 'opus',
    });

    await submitGenerate(page);

    await expect(page.getByText('Narration Track')).toBeVisible({ timeout: 180_000 });
    await expect(page.getByText('Gradium opus').first()).toBeVisible();
  });

  test('Hera animation path stays stable with queued/completed response states', async ({ page }) => {
    await gotoBoard(page);

    await fillGenerateForm(page, {
      type: 'animation',
      prompt:
        'Animate a short typography-led launch sequence for hydration brand with bold CTA at end.',
      includeResearch: false,
    });

    await submitGenerate(page);

    await expect(page.getByText('Brand-aligned animation')).toBeVisible({ timeout: 120_000 });
    await expect(page.getByText(/Hera animation generation/)).toBeVisible();
    await expect(page.getByText('hera-animation.mp4')).toBeVisible();
  });

  test('full end-to-end flow: brand file + Tavily context + Veo video + Gradium audio', async ({
    page,
  }) => {
    test.setTimeout(12 * 60 * 1000);

    await gotoBoard(page);

    let hasPlayableVideo = false;

    for (let attempt = 0; attempt < 2; attempt += 1) {
      await fillGenerateForm(page, {
        type: 'video',
        prompt:
          'Create a premium launch video for a smart hydration bottle with an energetic but clean visual style.',
        contextQuery: 'recent hydration social content trends in DACH market',
        includeResearch: true,
        brandNotes:
          'Primary colors #002B5B and #00B7C2, premium but friendly tone, short CTA.',
        attachBrandImage: true,
        enableAudio: true,
        audioFormat: 'wav',
      });

      await submitGenerate(page);
      await expect(page.getByText('Brand-aligned video')).toBeVisible({
        timeout: 10 * 60 * 1000,
      });

      const playableVideoCount = await page.locator('video').count();
      if (playableVideoCount > 0) {
        hasPlayableVideo = true;
        break;
      }
    }

    expect(
      hasPlayableVideo,
      'Expected at least one full-flow Veo attempt to produce a playable video.',
    ).toBe(true);
    await expect(page.getByText('Brand Profile')).toBeVisible();
    await expect(
      page.getByText('Context for "recent hydration social content trends in DACH market"'),
    ).toBeVisible();
    await expect(page.getByText('Narration Track')).toBeVisible();

    await expectAnyEdges(page, 3);
  });
});
