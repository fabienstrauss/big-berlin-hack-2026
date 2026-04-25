import type { CanvasNodeData } from './types';

export type GenerateInput = {
  type: 'image' | 'video' | 'animation';
  prompt: string;
  mode?: 'sync' | 'async';
  contextQuery?: string;
  includeResearch?: boolean;
  brandNotes?: string;
  brandAssets?: BrandAssetInput[];
  audio?: GenerateAudioInput;
  modelOverrides?: GenerateModelOverrides;
};

export type TavilyInput = {
  query: string;
  includeImages: boolean;
  maxResults?: number;
};

export type TemplateInput = {
  templateId: string;
};

export type BrandAssetInput = {
  name: string;
  mimeType: string;
  dataUrl: string;
};

export type GenerateAudioInput = {
  enabled: boolean;
  voiceId?: string;
  outputFormat?: 'wav' | 'opus' | 'pcm';
};

export type GenerateModelOverrides = {
  vertexImageModel?: string;
  vertexVideoModel?: string;
  vertexVideoDurationSeconds?: number;
};

export type GenerationJobStatus = 'queued' | 'running' | 'completed' | 'failed';

export type GenerationErrorCategory =
  | 'quota_exhausted'
  | 'model_not_found_or_no_access'
  | 'auth_config'
  | 'transient'
  | 'unknown';

export type GenerationErrorMeta = {
  category: GenerationErrorCategory;
  status?: string | null;
  statusCode?: number | null;
  retryable: boolean;
  message: string;
  hint?: string | null;
};

export type GenerationJobCreateResponse = {
  jobId: string;
  status: GenerationJobStatus;
  error?: string | null;
  errorMeta?: GenerationErrorMeta | null;
};

export type GenerationJobResponse = {
  jobId: string;
  status: GenerationJobStatus;
  provider: 'vertex';
  type: 'video';
  artifactPath?: string | null;
  artifactUrl?: string | null;
  warning?: string | null;
  error?: string | null;
  errorMeta?: GenerationErrorMeta | null;
  completedWithWarning?: boolean;
};

export type CanvasInsertionItem = {
  key: string;
  offsetX?: number;
  offsetY?: number;
  data: Omit<CanvasNodeData, 'onUpdate'>;
};

export type CanvasInsertionEdge = {
  sourceKey: string;
  targetKey: string;
};

export type CanvasInsertionPayload = {
  items: CanvasInsertionItem[];
  edges?: CanvasInsertionEdge[];
};
