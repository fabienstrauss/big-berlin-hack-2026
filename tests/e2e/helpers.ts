import { expect, type Page } from '@playwright/test';

const REQUIRED_LIVE_ENV_KEYS = [
  'TAVILY_API_KEY',
  'GRADIUM_API_KEY',
  'HERA_API_KEY',
] as const;

export function getLiveGate() {
  if (process.env.PLAYWRIGHT_LIVE !== '1') {
    return {
      enabled: false,
      reason: 'Set PLAYWRIGHT_LIVE=1 to run paid live tests.',
    };
  }

  if (process.env.LIVE_DEPTH !== 'full') {
    return {
      enabled: false,
      reason: 'Set LIVE_DEPTH=full to run the full live matrix.',
    };
  }

  const hasGoogleKey = Boolean(
    process.env.GOOGLE_GENAI_API_KEY ||
      process.env.GOOGLE_API_KEY ||
      process.env.GEMINI_API_KEY,
  );

  if (!hasGoogleKey) {
    return {
      enabled: false,
      reason: 'Missing live env key: GOOGLE_GENAI_API_KEY (or GOOGLE_API_KEY/GEMINI_API_KEY).',
    };
  }

  const missing = REQUIRED_LIVE_ENV_KEYS.filter((key) => !process.env[key]);
  if (missing.length) {
    return {
      enabled: false,
      reason: `Missing live env keys: ${missing.join(', ')}`,
    };
  }

  return { enabled: true, reason: '' };
}

export async function gotoBoard(page: Page) {
  await page.goto('/');
  await expect(page.getByTestId('toolbar-open-generate')).toBeVisible();
}

export async function openGeneratePanel(page: Page) {
  await page.getByTestId('toolbar-open-generate').click();
  await expect(page.getByTestId('panel-generate')).toBeVisible();
}

export async function openScrapePanel(page: Page) {
  await page.getByTestId('toolbar-open-scrape').click();
  await expect(page.getByTestId('panel-scrape')).toBeVisible();
}

export async function fillGenerateForm(
  page: Page,
  input: {
    type: 'image' | 'video' | 'animation';
    prompt: string;
    contextQuery?: string;
    brandNotes?: string;
    includeResearch?: boolean;
    enableAudio?: boolean;
    audioFormat?: 'wav' | 'opus' | 'pcm';
    audioVoiceId?: string;
    attachBrandImage?: boolean;
  },
) {
  await openGeneratePanel(page);

  await page.getByTestId('generate-type-select').selectOption(input.type);
  await page.getByTestId('generate-prompt-input').fill(input.prompt);

  if (typeof input.contextQuery === 'string') {
    await page.getByTestId('generate-context-query-input').fill(input.contextQuery);
  }

  if (typeof input.includeResearch === 'boolean') {
    const toggle = page.getByTestId('generate-include-research-toggle');
    if ((await toggle.isChecked()) !== input.includeResearch) {
      await toggle.click();
    }
  }

  if (input.brandNotes) {
    await page.getByTestId('generate-brand-notes-input').fill(input.brandNotes);
  }

  if (input.attachBrandImage) {
    await page.getByTestId('generate-brand-files-input').setInputFiles({
      name: 'brand-guide.png',
      mimeType: 'image/png',
      buffer: createBrandImageBuffer(),
    });
  }

  if (input.enableAudio) {
    const audioToggle = page.getByTestId('generate-audio-toggle');
    if (!(await audioToggle.isChecked())) {
      await audioToggle.click();
    }

    if (input.audioVoiceId) {
      await page.getByTestId('generate-audio-voice-input').fill(input.audioVoiceId);
    }

    if (input.audioFormat) {
      await page.getByTestId('generate-audio-format-select').selectOption(input.audioFormat);
    }
  }
}

export async function submitGenerate(page: Page) {
  await page.getByTestId('generate-submit-btn').click();
}

export async function fillScrapeForm(
  page: Page,
  input: {
    query: string;
    includeImages: boolean;
  },
) {
  await openScrapePanel(page);
  await page.getByTestId('scrape-query-input').fill(input.query);

  const includeToggle = page.getByTestId('scrape-include-images-toggle');
  if ((await includeToggle.isChecked()) !== input.includeImages) {
    await includeToggle.click();
  }
}

export async function submitScrape(page: Page) {
  await page.getByTestId('scrape-submit-btn').click();
}

export async function expectAnyEdges(page: Page, minimumCount = 1) {
  await expect.poll(async () => {
    return page.locator('.react-flow__edge').count();
  }).toBeGreaterThanOrEqual(minimumCount);
}

function createBrandImageBuffer() {
  return Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAGElEQVR4nGP8z8Dwn4GBgYGJgQEIMAAAW6sC4hQ2lfUAAAAASUVORK5CYII=',
    'base64',
  );
}
