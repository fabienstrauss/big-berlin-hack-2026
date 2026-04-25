import type { SupabaseClient } from '@supabase/supabase-js';

import { initialNodes } from './sample-data';
import type { CanvasEdge, CanvasNode, CanvasNodeData } from './types';
import { CANVAS_ASSETS_BUCKET, CANVAS_BOARD_ID } from '../supabase/constants';

export const CANVAS_STATE_TABLE = 'canvas_state';

type StoredCanvasStateRow = {
  id: string;
  nodes: CanvasNode[];
  edges: CanvasEdge[];
  updated_at?: string;
};

function sanitizeNodeData(data: CanvasNodeData): CanvasNodeData {
  const rest = { ...data };
  delete rest.onUpdate;
  return rest;
}

export function sanitizeNodesForStorage(nodes: CanvasNode[]) {
  return nodes.map((node) => ({
    ...node,
    data: sanitizeNodeData(node.data),
  }));
}

export function getDefaultCanvasState() {
  return {
    id: CANVAS_BOARD_ID,
    nodes: sanitizeNodesForStorage(initialNodes),
    edges: [],
  };
}

export async function loadCanvasState(client: SupabaseClient) {
  const { data, error } = await client
    .from(CANVAS_STATE_TABLE)
    .select('id, nodes, edges, updated_at')
    .eq('id', CANVAS_BOARD_ID)
    .maybeSingle<StoredCanvasStateRow>();

  if (error) {
    throw error;
  }

  if (data) {
    return data;
  }

  const fallback = getDefaultCanvasState();
  const { error: insertError } = await client.from(CANVAS_STATE_TABLE).upsert(fallback);

  if (insertError) {
    throw insertError;
  }

  return fallback;
}

export async function saveCanvasState(
  client: SupabaseClient,
  input: { nodes: CanvasNode[]; edges: CanvasEdge[] },
) {
  const payload = {
    id: CANVAS_BOARD_ID,
    nodes: sanitizeNodesForStorage(input.nodes),
    edges: input.edges,
  };

  const { error } = await client.from(CANVAS_STATE_TABLE).upsert(payload);

  if (error) {
    throw error;
  }
}

export async function uploadCanvasAsset(
  client: SupabaseClient,
  file: File,
  index: number,
) {
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '-');
  const path = `${CANVAS_BOARD_ID}/${Date.now()}-${index}-${safeName}`;

  const { error } = await client.storage
    .from(CANVAS_ASSETS_BUCKET)
    .upload(path, file, { upsert: true });

  if (error) {
    throw error;
  }

  const { data } = client.storage.from(CANVAS_ASSETS_BUCKET).getPublicUrl(path);

  return {
    path,
    publicUrl: data.publicUrl,
  };
}
