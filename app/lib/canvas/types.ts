import type { Edge, Node } from 'reactflow';

export type CanvasNodeKind =
  | 'brainstorm'
  | 'asset'
  | 'generation'
  | 'research'
  | 'image-stack'
  | 'template';

export type MediaType = 'image' | 'video' | 'audio' | 'document';

export type CanvasAssetItem = {
  id: string;
  label: string;
  type: MediaType;
  meta: string;
  previewUrl?: string;
  tint?: string;
};

export type CanvasStackItem = {
  label: string;
  tint: string;
};

export type CanvasNodeData = {
  kind: CanvasNodeKind;
  badge: string;
  title: string;
  subtitle: string;
  accent: string;
  templateId?: string;
  status?: 'generating' | 'error' | 'done';
  statusMessage?: string;
  editable?: boolean;
  body?: string;
  bullets?: string[];
  chips?: string[];
  prompt?: string;
  imagePrompt?: string;
  videoPrompt?: string;
  animationPrompt?: string;
  hideAssetMeta?: boolean;
  assetItems?: CanvasAssetItem[];
  stackItems?: CanvasStackItem[];
  onUpdate?: (patch: Partial<CanvasNodeData>) => void;
  onDelete?: () => void;
};

export type CanvasNode = Node<CanvasNodeData>;
export type CanvasEdge = Edge;
