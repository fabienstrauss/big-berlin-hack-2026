import { randomUUID } from 'node:crypto';

import type {
  GenerateInput,
  GenerationJobCreateResponse,
  GenerationJobResponse,
  GenerationJobStatus,
} from '@/app/lib/canvas/contracts';

import { persistVideoArtifactToGcs } from './gcs-video-storage';
import { getSupabaseAdminClient } from './supabase-admin';
import { searchWithTavily } from './providers/tavily';
import {
  composeGenerationPrompt,
  extractBrandProfile,
  pollVideoGenerationOperation,
  rewriteNarrationScript,
  startVideoGenerationWithVertex,
  type VertexVideoOperationPayload,
} from './providers/vertex';

type GenerationJobRow = {
  id: string;
  status: GenerationJobStatus;
  provider: 'vertex';
  type: 'video';
  request_payload: Record<string, unknown>;
  operation_payload: Record<string, unknown> | null;
  artifact_path: string | null;
  artifact_url: string | null;
  warning: string | null;
  error: string | null;
};

type OperationEnvelope = {
  model: string;
  operation: VertexVideoOperationPayload;
};

const GENERATION_JOBS_TABLE = 'generation_jobs';

function toJobResponse(row: GenerationJobRow): GenerationJobResponse {
  return {
    jobId: row.id,
    status: row.status,
    provider: row.provider,
    type: row.type,
    artifactPath: row.artifact_path,
    artifactUrl: row.artifact_url,
    warning: row.warning,
    error: row.error,
    completedWithWarning: Boolean(row.warning),
  };
}

function getSupabaseOrThrow() {
  const client = getSupabaseAdminClient();
  if (!client) {
    throw new Error(
      'Supabase admin client is not configured. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.',
    );
  }

  return client;
}

async function getJobRow(jobId: string): Promise<GenerationJobRow> {
  const client = getSupabaseOrThrow();

  const { data, error } = await client
    .from(GENERATION_JOBS_TABLE)
    .select('*')
    .eq('id', jobId)
    .single<GenerationJobRow>();

  if (error || !data) {
    throw new Error(error?.message ?? `Job ${jobId} not found`);
  }

  return data;
}

async function updateJobRow(
  jobId: string,
  patch: Partial<GenerationJobRow>,
): Promise<GenerationJobRow> {
  const client = getSupabaseOrThrow();

  const { data, error } = await client
    .from(GENERATION_JOBS_TABLE)
    .update(patch)
    .eq('id', jobId)
    .select('*')
    .single<GenerationJobRow>();

  if (error || !data) {
    throw new Error(error?.message ?? `Unable to update job ${jobId}`);
  }

  return data;
}

async function buildVideoPrompt(input: GenerateInput) {
  const shouldIncludeResearch =
    input.includeResearch !== false && Boolean(input.contextQuery?.trim());

  const research = shouldIncludeResearch
    ? await searchWithTavily({
        query: input.contextQuery!.trim(),
        includeImages: true,
        maxResults: 5,
      }).catch(() => null)
    : null;

  const brandProfile = await extractBrandProfile(input.brandAssets ?? [], input.brandNotes ?? '');
  const composedPrompt = composeGenerationPrompt({
    prompt: input.prompt,
    type: 'video',
    brandProfile,
    tavilyContext: research,
  });

  const narrationScript = await rewriteNarrationScript({
    originalPrompt: input.prompt,
    composedPrompt,
    research,
  });

  return {
    composedPrompt,
    narrationScript,
  };
}

export async function createVideoGenerationJob(
  input: GenerateInput,
): Promise<GenerationJobCreateResponse> {
  if (input.type !== 'video') {
    throw new Error('Asynchronous jobs currently support only video generation.');
  }

  const { composedPrompt, narrationScript } = await buildVideoPrompt(input);
  const start = await startVideoGenerationWithVertex(composedPrompt, {
    model: input.modelOverrides?.vertexVideoModel,
    durationSeconds: input.modelOverrides?.vertexVideoDurationSeconds,
  });

  const operationEnvelope: OperationEnvelope = {
    model: start.model,
    operation: start.operation,
  };

  const id = randomUUID();
  const client = getSupabaseOrThrow();

  const { error } = await client.from(GENERATION_JOBS_TABLE).insert({
    id,
    status: 'queued',
    provider: 'vertex',
    type: 'video',
    request_payload: {
      input,
      composedPrompt,
      narrationScript,
    },
    operation_payload: operationEnvelope,
    artifact_path: null,
    artifact_url: null,
    warning: null,
    error: null,
  });

  if (error) {
    throw new Error(error.message);
  }

  return {
    jobId: id,
    status: 'queued',
  };
}

export async function getVideoGenerationJob(jobId: string): Promise<GenerationJobResponse> {
  const row = await getJobRow(jobId);
  return toJobResponse(row);
}

export async function pollVideoGenerationJob(jobId: string): Promise<GenerationJobResponse> {
  const row = await getJobRow(jobId);

  if (row.status === 'completed' || row.status === 'failed') {
    return toJobResponse(row);
  }

  const operationEnvelope = row.operation_payload as OperationEnvelope | null;

  if (!operationEnvelope?.model || !operationEnvelope.operation) {
    const failedRow = await updateJobRow(jobId, {
      status: 'failed',
      error: 'Missing video operation payload for job polling.',
    });

    return toJobResponse(failedRow);
  }

  const polled = await pollVideoGenerationOperation(
    operationEnvelope.operation,
    operationEnvelope.model,
  );

  if (!polled.done) {
    const runningRow = await updateJobRow(jobId, {
      status: 'running',
      operation_payload: {
        ...operationEnvelope,
        operation: polled.operation,
      },
    });

    return toJobResponse(runningRow);
  }

  if (!polled.output) {
    const failedRow = await updateJobRow(jobId, {
      status: 'failed',
      operation_payload: {
        ...operationEnvelope,
        operation: polled.operation,
      },
      error:
        polled.error ??
        'Video generation completed without playable payload from provider.',
    });

    return toJobResponse(failedRow);
  }

  const stored = await persistVideoArtifactToGcs(jobId, polled.output);

  const completedRow = await updateJobRow(jobId, {
    status: 'completed',
    operation_payload: {
      ...operationEnvelope,
      operation: polled.operation,
    },
    artifact_path: stored.artifactPath ?? null,
    artifact_url: stored.artifactUrl ?? null,
    warning: stored.warning ?? null,
    error: null,
  });

  return toJobResponse(completedRow);
}
