import { NextResponse } from 'next/server';

import type { GenerateInput } from '@/app/lib/canvas/contracts';
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
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to create generation job',
      },
      { status: 500 },
    );
  }
}
