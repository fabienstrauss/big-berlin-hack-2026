import { randomUUID } from 'node:crypto';

import type {
  GenerateInput,
  GenerationErrorMeta,
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
  formatGenerationErrorMessage,
  pollVideoGenerationOperation,
  rewriteNarrationScript,
  startVideoGenerationWithVertex,
  toGenerationErrorMeta,
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
  location?: string;
  errorMeta?: GenerationErrorMeta;
  operationName?: string;
  operation?: VertexVideoOperationPayload;
};

const GENERATION_JOBS_TABLE = 'generation_jobs';

function getOperationEnvelope(row: GenerationJobRow): OperationEnvelope | null {
  const payload = row.operation_payload;
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  return payload as OperationEnvelope;
}

function getRowErrorMeta(row: GenerationJobRow): GenerationErrorMeta | null {
  const operationEnvelope = getOperationEnvelope(row);
  return operationEnvelope?.errorMeta ?? null;
}

function toJobResponse(row: GenerationJobRow): GenerationJobResponse {
  const errorMeta = getRowErrorMeta(row);
  return {
    jobId: row.id,
    status: row.status,
    provider: row.provider,
    type: row.type,
    artifactPath: row.artifact_path,
    artifactUrl: row.artifact_url,
    warning: row.warning,
    error: row.error,
    errorMeta,
    completedWithWarning: Boolean(row.warning),
  };
}

function getOperationName(operationEnvelope: OperationEnvelope | null) {
  if (!operationEnvelope) {
    return null;
  }

  if (operationEnvelope.operationName) {
    return operationEnvelope.operationName;
  }

  const operationName =
    operationEnvelope.operation &&
    typeof operationEnvelope.operation === 'object' &&
    typeof (operationEnvelope.operation as { name?: unknown }).name === 'string'
      ? (operationEnvelope.operation as { name: string }).name
      : null;

  return operationName;
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

  const id = randomUUID();
  const client = getSupabaseOrThrow();

  const { error } = await client.from(GENERATION_JOBS_TABLE).insert({
    id,
    status: 'queued',
    provider: 'vertex',
    type: 'video',
    request_payload: {
      input,
    },
    operation_payload: null,
    artifact_path: null,
    artifact_url: null,
    warning: null,
    error: null,
  });

  if (error) {
    throw new Error(error.message);
  }

  try {
    const { composedPrompt, narrationScript } = await buildVideoPrompt(input);
    const start = await startVideoGenerationWithVertex(composedPrompt, {
      model: input.modelOverrides?.vertexVideoModel,
      durationSeconds: input.modelOverrides?.vertexVideoDurationSeconds,
    });
    const operationName = start.operation.name;

    if (!operationName) {
      throw new Error('Vertex did not return an operation name for async video polling.');
    }

    const operationEnvelope: OperationEnvelope = {
      model: start.model,
      location: start.location,
      operationName,
      operation: {
        name: operationName,
        done: start.operation.done,
      },
    };

    const updatedRow = await updateJobRow(id, {
      status: 'running',
      request_payload: {
        input,
        composedPrompt,
        narrationScript,
      },
      warning: null,
      error: null,
      operation_payload: {
        ...operationEnvelope,
        errorMeta: null,
      },
    });

    return {
      jobId: id,
      status: updatedRow.status,
    };
  } catch (providerError) {
    const errorMeta = toGenerationErrorMeta(providerError);
    const failedRow = await updateJobRow(id, {
      status: 'failed',
      error: formatGenerationErrorMessage(errorMeta),
      operation_payload: {
        errorMeta,
      },
    });

    return {
      jobId: id,
      status: failedRow.status,
      error: failedRow.error,
      errorMeta,
    };
  }
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

  const operationEnvelope = getOperationEnvelope(row);
  const operationName = getOperationName(operationEnvelope);

  if (!operationEnvelope?.model || !operationName) {
    const errorMeta = toGenerationErrorMeta(
      new Error('Missing video operation payload for job polling.'),
    );
    const failedRow = await updateJobRow(jobId, {
      status: 'failed',
      error: formatGenerationErrorMessage(errorMeta),
      operation_payload: {
        ...(operationEnvelope ?? {}),
        errorMeta,
      },
    });

    return toJobResponse(failedRow);
  }

  let polled: Awaited<ReturnType<typeof pollVideoGenerationOperation>>;

  try {
    polled = await pollVideoGenerationOperation(
      operationName,
      operationEnvelope.model,
      operationEnvelope.location,
    );
  } catch (error) {
    const errorMeta = toGenerationErrorMeta(error);
    const failedRow = await updateJobRow(jobId, {
      status: 'failed',
      operation_payload: {
        ...operationEnvelope,
        errorMeta,
        operationName,
        operation: {
          name: operationName,
        },
      },
      error: formatGenerationErrorMessage(errorMeta),
    });

    return toJobResponse(failedRow);
  }

  if (!polled.done) {
    const runningRow = await updateJobRow(jobId, {
      status: 'running',
      operation_payload: {
        ...operationEnvelope,
        operationName: polled.operation.name ?? operationName,
        operation: {
          name: polled.operation.name ?? operationName,
          done: false,
        },
      },
    });

    return toJobResponse(runningRow);
  }

  if (!polled.output) {
    const errorMeta = toGenerationErrorMeta(
      new Error(
        polled.error ?? 'Video generation completed without playable payload from provider.',
      ),
    );
    const failedRow = await updateJobRow(jobId, {
      status: 'failed',
      operation_payload: {
        ...operationEnvelope,
        errorMeta,
        operationName: polled.operation.name ?? operationName,
        operation: {
          name: polled.operation.name ?? operationName,
          done: true,
          error: polled.operation.error,
        },
      },
      error: formatGenerationErrorMessage(errorMeta),
    });

    return toJobResponse(failedRow);
  }

  const stored = await persistVideoArtifactToGcs(jobId, polled.output);

  const completedRow = await updateJobRow(jobId, {
    status: 'completed',
    operation_payload: {
      ...operationEnvelope,
      operationName: polled.operation.name ?? operationName,
      errorMeta: null,
      operation: {
        name: polled.operation.name ?? operationName,
        done: true,
      },
    },
    artifact_path: stored.artifactPath ?? null,
    artifact_url: stored.artifactUrl ?? null,
    warning: stored.warning ?? null,
    error: null,
  });

  return toJobResponse(completedRow);
}
