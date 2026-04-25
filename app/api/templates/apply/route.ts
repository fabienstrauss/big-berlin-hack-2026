import { NextResponse } from 'next/server';

import type { TemplateInput } from '../../../lib/canvas/contracts';
import { createMockTemplatePayload } from '../../../lib/canvas/mock-content';

export async function POST(request: Request) {
  const body = (await request.json()) as TemplateInput;
  return NextResponse.json(createMockTemplatePayload(body));
}
