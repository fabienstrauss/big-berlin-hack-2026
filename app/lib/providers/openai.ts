import 'server-only';

import type {
  CanvasInsertionPayload,
  GenerateInput,
} from '../canvas/contracts';
import { getOptionalServerEnv, getRequiredServerEnv } from './env';

const OPENAI_API_URL = 'https://api.openai.com/v1/responses';
const DEFAULT_OPENAI_MODEL = 'gpt-4o-mini';

const canvasPayloadSchema = {
  name: 'canvas_insertion_payload',
  strict: true,
  schema: {
    type: 'object',
    additionalProperties: false,
    required: ['items', 'edges'],
    properties: {
      items: {
        type: 'array',
        minItems: 1,
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['key', 'data'],
          properties: {
            key: { type: 'string' },
            offsetX: { type: 'number' },
            offsetY: { type: 'number' },
            data: {
              type: 'object',
              additionalProperties: false,
              required: ['kind', 'badge', 'title', 'subtitle', 'accent'],
              properties: {
                kind: {
                  type: 'string',
                  enum: [
                    'brainstorm',
                    'asset',
                    'generation',
                    'research',
                    'image-stack',
                    'template',
                  ],
                },
                badge: { type: 'string' },
                title: { type: 'string' },
                subtitle: { type: 'string' },
                accent: { type: 'string' },
                editable: { type: 'boolean' },
                body: { type: 'string' },
                bullets: {
                  type: 'array',
                  items: { type: 'string' },
                },
                chips: {
                  type: 'array',
                  items: { type: 'string' },
                },
                prompt: { type: 'string' },
                assetItems: {
                  type: 'array',
                  items: {
                    type: 'object',
                    additionalProperties: false,
                    required: ['id', 'label', 'type', 'meta'],
                    properties: {
                      id: { type: 'string' },
                      label: { type: 'string' },
                      type: {
                        type: 'string',
                        enum: ['image', 'video', 'document'],
                      },
                      meta: { type: 'string' },
                      previewUrl: { type: 'string' },
                      tint: { type: 'string' },
                    },
                  },
                },
                stackItems: {
                  type: 'array',
                  items: {
                    type: 'object',
                    additionalProperties: false,
                    required: ['label', 'tint'],
                    properties: {
                      label: { type: 'string' },
                      tint: { type: 'string' },
                    },
                  },
                },
              },
            },
          },
        },
      },
      edges: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['sourceKey', 'targetKey'],
          properties: {
            sourceKey: { type: 'string' },
            targetKey: { type: 'string' },
          },
        },
      },
    },
  },
} as const;

type OpenAIResponseShape = {
  output_text?: string;
  output?: Array<{
    content?: Array<{
      type?: string;
      text?: string;
    }>;
  }>;
};

function parseStructuredPayload(response: OpenAIResponseShape): CanvasInsertionPayload {
  const outputText =
    response.output_text ??
    response.output?.flatMap((item) => item.content ?? []).find((item) => item.type === 'output_text')
      ?.text;

  if (!outputText) {
    throw new Error('OpenAI returned no structured output text');
  }

  return JSON.parse(outputText) as CanvasInsertionPayload;
}

async function requestCanvasPayload(instructions: string, input: string) {
  const apiKey = getRequiredServerEnv('OPENAI_API_KEY');
  const model = getOptionalServerEnv('OPENAI_MODEL') ?? DEFAULT_OPENAI_MODEL;

  const response = await fetch(OPENAI_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      instructions,
      input,
      text: {
        format: {
          type: 'json_schema',
          ...canvasPayloadSchema,
        },
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI request failed: ${response.status} ${errorText}`);
  }

  const json = (await response.json()) as OpenAIResponseShape;
  return parseStructuredPayload(json);
}

export function isOpenAIConfigured() {
  return Boolean(process.env.OPENAI_API_KEY);
}

export async function generateCanvasPayloadWithOpenAI(input: GenerateInput) {
  return requestCanvasPayload(
    [
      'You produce JSON for a social-content brainstorming canvas.',
      'Return valid JSON matching the provided schema.',
      'The output should create one generation node only.',
      'Do not include markdown.',
      'Do not include image preview URLs.',
      'Use a soft light-mode accent string like "from-fuchsia-100 via-white to-rose-50".',
    ].join(' '),
    [
      `Create a canvas insertion payload for a ${input.type} generation request.`,
      `User prompt: ${input.prompt}`,
      'The node kind must be "generation".',
      'Include a concise title, subtitle, 3 bullets, and keep the original prompt in the prompt field.',
    ].join('\n'),
  );
}
