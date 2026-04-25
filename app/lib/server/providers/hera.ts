export type HeraGenerationInput = {
  prompt: string;
  durationSeconds?: number;
};

export type HeraGenerationOutput = {
  videoId: string;
  projectUrl?: string;
  status?: 'in-progress' | 'success' | 'failed';
  fileUrl?: string;
};

type HeraCreateResponse = {
  video_id?: string;
  project_url?: string;
};

type HeraStatusResponse = {
  video_id?: string;
  project_url?: string;
  status?: 'in-progress' | 'success' | 'failed';
  outputs?: Array<{
    status?: 'in-progress' | 'success' | 'failed';
    file_url?: string | null;
  }>;
};

const DEFAULT_HERA_BASE_URL = 'https://api.hera.video/v1';

export async function generateWithHera(
  input: HeraGenerationInput,
): Promise<HeraGenerationOutput> {
  const apiKey = process.env.HERA_API_KEY;

  if (!apiKey) {
    throw new Error('HERA_API_KEY is not set');
  }

  const baseUrl = process.env.HERA_API_BASE_URL ?? DEFAULT_HERA_BASE_URL;
  const createResponse = await fetch(`${baseUrl}/videos`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
    },
    cache: 'no-store',
    body: JSON.stringify({
      prompt: input.prompt,
      duration_seconds: input.durationSeconds ?? 8,
      outputs: [
        {
          format: 'mp4',
          aspect_ratio: '16:9',
          fps: '30',
          resolution: '720p',
        },
      ],
    }),
  });

  if (!createResponse.ok) {
    const details = await createResponse.text();
    throw new Error(`Hera create video failed (${createResponse.status}): ${details}`);
  }

  const createPayload = (await createResponse.json()) as HeraCreateResponse;

  if (!createPayload.video_id) {
    throw new Error('Hera API response did not include video_id');
  }

  const videoId = createPayload.video_id;

  let statusPayload: HeraStatusResponse | null = null;

  try {
    const statusResponse = await fetch(`${baseUrl}/videos/${videoId}`, {
      method: 'GET',
      headers: {
        'x-api-key': apiKey,
      },
      cache: 'no-store',
    });

    if (statusResponse.ok) {
      statusPayload = (await statusResponse.json()) as HeraStatusResponse;
    }
  } catch {
    // Keep create response even if immediate status fetch fails.
  }

  return {
    videoId,
    projectUrl: statusPayload?.project_url ?? createPayload.project_url,
    status: statusPayload?.status,
    fileUrl: statusPayload?.outputs?.find((output) => output.file_url)?.file_url ?? undefined,
  };
}
