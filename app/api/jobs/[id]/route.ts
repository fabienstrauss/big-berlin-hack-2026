import { NextResponse } from 'next/server';

import { getVideoGenerationJob, pollVideoGenerationJob } from '@/app/lib/server/video-jobs';

export const runtime = 'nodejs';

type Params = {
  id: string;
};

export async function GET(
  request: Request,
  context: { params: Promise<Params> },
) {
  try {
    const { id } = await context.params;
    const url = new URL(request.url);
    const shouldPoll = url.searchParams.get('poll') !== '0';

    const result = shouldPoll
      ? await pollVideoGenerationJob(id)
      : await getVideoGenerationJob(id);

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to fetch generation job',
      },
      { status: 500 },
    );
  }
}
