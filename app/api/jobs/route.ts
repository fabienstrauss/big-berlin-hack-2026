import { NextResponse } from 'next/server';

import type { GenerateInput } from '@/app/lib/canvas/contracts';
import {
  formatGenerationErrorMessage,
  toGenerationErrorMeta,
} from '@/app/lib/server/providers/vertex';
import { createVideoGenerationJob } from '@/app/lib/server/video-jobs';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as GenerateInput;
    const result = await createVideoGenerationJob(body);

    return NextResponse.json(result, {
      status: result.status === 'failed' ? 200 : 202,
    });
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
