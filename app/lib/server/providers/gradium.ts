export type GradiumInput = {
  text: string;
  voiceId?: string;
  outputFormat?:
    | 'wav'
    | 'pcm'
    | 'opus'
    | 'ulaw_8000'
    | 'alaw_8000'
    | 'pcm_8000'
    | 'pcm_16000'
    | 'pcm_24000';
};

export type GradiumOutput = {
  mimeType: string;
  dataUrl: string;
  format: string;
};

const DEFAULT_TTS_ENDPOINT = 'https://api.gradium.ai/api/post/speech/tts';

function getMimeTypeFromFormat(format: string) {
  if (format === 'wav') {
    return 'audio/wav';
  }

  if (format === 'opus') {
    return 'audio/ogg';
  }

  if (format === 'ulaw_8000' || format === 'alaw_8000') {
    return 'audio/basic';
  }

  return 'audio/L16';
}

export async function synthesizeWithGradium(
  input: GradiumInput,
): Promise<GradiumOutput> {
  const apiKey = process.env.GRADIUM_API_KEY;

  if (!apiKey) {
    throw new Error('GRADIUM_API_KEY is not set');
  }

  const outputFormat = input.outputFormat ?? 'wav';

  const response = await fetch(process.env.GRADIUM_TTS_URL ?? DEFAULT_TTS_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
    },
    cache: 'no-store',
    body: JSON.stringify({
      text: input.text,
      voice_id: input.voiceId ?? process.env.GRADIUM_DEFAULT_VOICE_ID ?? 'YTpq7expH9539ERJ',
      output_format: outputFormat,
      only_audio: true,
    }),
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Gradium TTS failed (${response.status}): ${details}`);
  }

  const bytes = Buffer.from(await response.arrayBuffer());
  const mimeType = getMimeTypeFromFormat(outputFormat);

  return {
    mimeType,
    format: outputFormat,
    dataUrl: `data:${mimeType};base64,${bytes.toString('base64')}`,
  };
}
