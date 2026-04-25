import { NextResponse } from 'next/server';

import type { GenerateInput } from '../../lib/canvas/contracts';
import { buildGenerationPayload } from '../../lib/server/pipeline';
import {
  formatGenerationErrorMessage,
  toGenerationErrorMeta,
} from '../../lib/server/providers/vertex';
import { createVideoGenerationJob } from '../../lib/server/video-jobs';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as GenerateInput;

    if (body.mode === 'async' && body.type === 'video') {
      const job = await createVideoGenerationJob(body);
      return NextResponse.json(job, { status: 202 });
    }

    const payload = await buildGenerationPayload(body);
    return NextResponse.json(payload);
  } catch (error) {
    const errorMeta = toGenerationErrorMeta(error);
    return NextResponse.json(
      {
        error: formatGenerationErrorMessage(errorMeta),
        errorMeta,
      },
      { status: 500 },
    );
  }
}
