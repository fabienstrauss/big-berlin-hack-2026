import { NextResponse } from 'next/server';

import type { TavilyInput } from '../../lib/canvas/contracts';
import { buildSearchPayload } from '../../lib/server/pipeline';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as TavilyInput;
    const payload = await buildSearchPayload(body);
    return NextResponse.json(payload);
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Search request failed',
      },
      { status: 500 },
    );
  }
}
