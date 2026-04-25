'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  addEdge,
  useEdgesState,
  useNodesState,
  useReactFlow,
  type Connection,
} from 'reactflow';

import {
  createQuickNoteNode,
  createCanvasNode,
  createUploadedAssetNode,
  edgeDefaults,
  inferMediaType,
  initialEdges,
  initialNodes,
} from '../lib/canvas/sample-data';
import type {
  CanvasInsertionPayload,
  GenerateInput,
  TavilyInput,
  TemplateInput,
} from '../lib/canvas/contracts';
import {
  loadCanvasState,
  saveCanvasState,
  sanitizeNodesForStorage,
  uploadCanvasAsset,
} from '../lib/canvas/persistence';
import { getSupabaseBrowserClient, isSupabaseConfigured } from '../lib/supabase/client';
import type {
  CanvasAssetItem,
  CanvasEdge,
  CanvasNode,
  CanvasNodeData,
} from '../lib/canvas/types';

type PersistenceStatus =
  | 'local-only'
  | 'loading'
  | 'ready'
  | 'saving'
  | 'saved'
  | 'error';

export function useCanvasBoard() {
  const [rawNodes, setNodes, onNodesChange] = useNodesState<CanvasNodeData>(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState<CanvasEdge>(initialEdges);
  const { screenToFlowPosition } = useReactFlow();
  const [persistenceStatus, setPersistenceStatus] = useState<PersistenceStatus>(
    isSupabaseConfigured() ? 'loading' : 'local-only',
  );
  const [persistenceError, setPersistenceError] = useState<string | null>(null);
  const spawnCountRef = useRef(0);
  const objectUrlsRef = useRef<string[]>([]);
  const hasLoadedRef = useRef(false);
  const saveTimerRef = useRef<number | null>(null);
  const supabase = getSupabaseBrowserClient();

  useEffect(() => {
    const objectUrls = objectUrlsRef.current;

    return () => {
      objectUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  useEffect(() => {
    if (!supabase) {
      return;
    }

    const client = supabase;
    let isActive = true;

    async function hydrateCanvas() {
      setPersistenceStatus('loading');
      setPersistenceError(null);

      try {
        const canvas = await loadCanvasState(client);

        if (!isActive) {
          return;
        }

        setNodes(
          canvas.nodes?.length ? sanitizeNodesForStorage(canvas.nodes) : initialNodes,
        );
        setEdges(canvas.edges?.length ? canvas.edges : initialEdges);
        hasLoadedRef.current = true;
        setPersistenceStatus('saved');
      } catch (error) {
        if (!isActive) {
          return;
        }

        hasLoadedRef.current = true;
        setPersistenceStatus('error');
        setPersistenceError(
          error instanceof Error ? error.message : 'Failed to load canvas',
        );
      }
    }

    hydrateCanvas();

    return () => {
      isActive = false;
    };
  }, [setEdges, setNodes, supabase]);

  useEffect(() => {
    if (!supabase || !hasLoadedRef.current) {
      return;
    }

    const client = supabase;
    if (saveTimerRef.current) {
      window.clearTimeout(saveTimerRef.current);
    }

    setPersistenceStatus('saving');
    saveTimerRef.current = window.setTimeout(async () => {
      try {
        await saveCanvasState(client, { nodes: rawNodes, edges });
        setPersistenceStatus('saved');
        setPersistenceError(null);
      } catch (error) {
        setPersistenceStatus('error');
        setPersistenceError(
          error instanceof Error ? error.message : 'Failed to save canvas',
        );
      }
    }, 700);

    return () => {
      if (saveTimerRef.current) {
        window.clearTimeout(saveTimerRef.current);
      }
    };
  }, [edges, rawNodes, supabase]);

  const updateNodeData = useCallback(
    (nodeId: string, patch: Partial<CanvasNodeData>) => {
      setNodes((currentNodes) =>
        currentNodes.map((node) =>
          node.id === nodeId
            ? {
                ...node,
                data: {
                  ...node.data,
                  ...patch,
                },
              }
            : node,
        ),
      );
    },
    [setNodes],
  );

  const nodes = useMemo(
    () =>
      rawNodes.map((node) => ({
        ...node,
        data: {
          ...node.data,
          onUpdate: (patch: Partial<CanvasNodeData>) => updateNodeData(node.id, patch),
        },
      })),
    [rawNodes, updateNodeData],
  );

  const getSpawnPosition = useCallback(
    (offsetX = 0, offsetY = 0) => {
      const step = spawnCountRef.current;
      const position = screenToFlowPosition({
        x: window.innerWidth / 2 + offsetX + (step % 3) * 44,
        y: window.innerHeight / 2 + offsetY + (step % 2) * 36,
      });

      spawnCountRef.current += 1;
      return position;
    },
    [screenToFlowPosition],
  );

  const addNode = useCallback(
    (node: CanvasNode) => {
      setNodes((currentNodes) => [...currentNodes, node]);
    },
    [setNodes],
  );

  const applyCanvasPayload = useCallback(
    (payload: CanvasInsertionPayload) => {
      const keyToId = new Map<string, string>();

      const nextNodes = payload.items.map((item, index) => {
        const id = `${item.key}-${Date.now()}-${index}`;
        keyToId.set(item.key, id);

        return createCanvasNode(
          id,
          getSpawnPosition(item.offsetX ?? index * 40, item.offsetY ?? index * 28),
          item.data,
        );
      });

      setNodes((currentNodes) => [...currentNodes, ...nextNodes]);

      if (!payload.edges?.length) {
        return;
      }

      const nextEdges = payload.edges
        .map((edge, index) => {
          const source = keyToId.get(edge.sourceKey);
          const target = keyToId.get(edge.targetKey);

          if (!source || !target) {
            return null;
          }

          return {
            id: `edge-${source}-${target}-${index}`,
            source,
            target,
            ...edgeDefaults,
          };
        })
        .filter(Boolean) as CanvasEdge[];

      if (nextEdges.length) {
        setEdges((currentEdges) => [...currentEdges, ...nextEdges]);
      }
    },
    [getSpawnPosition, setEdges, setNodes],
  );

  const requestCanvasPayload = useCallback(
    async <TInput>(path: string, body: TInput) => {
      const response = await fetch(path, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorPayload = await response
          .json()
          .catch(() => ({ error: `Request failed for ${path}` })) as {
          error?: string;
        };
        throw new Error(errorPayload.error || `Request failed for ${path}`);
      }

      return (await response.json()) as CanvasInsertionPayload;
    },
    [],
  );

  const addQuickNote = useCallback(() => {
    const id = `note-${Date.now()}`;
    addNode(createQuickNoteNode(id, getSpawnPosition(-220, -60), spawnCountRef.current + 1));
  }, [addNode, getSpawnPosition]);

  const addOwnContent = useCallback(
    async (files: File[]) => {
      const nextNodes: CanvasNode[] = [];

      for (const [index, file] of files.entries()) {
        const type = inferMediaType(file);
        let previewUrl: string | undefined;

        if (supabase) {
          const uploadedAsset = await uploadCanvasAsset(supabase, file, index);
          previewUrl = uploadedAsset.publicUrl;
        } else if (type === 'image' || type === 'video' || type === 'audio') {
          previewUrl = URL.createObjectURL(file);
          objectUrlsRef.current.push(previewUrl);
        }

        const item: CanvasAssetItem = {
          id: `${file.name}-${index}-${Date.now()}`,
          label: file.name,
          type,
          meta:
            type === 'document'
              ? `${Math.max(1, Math.round(file.size / 1024))} KB document`
              : type === 'audio'
                ? `${Math.max(1, Math.round(file.size / 1024 / 1024))} MB audio`
              : `${Math.max(1, Math.round(file.size / 1024 / 1024))} MB ${type}`,
          previewUrl,
        };

        nextNodes.push(
          createUploadedAssetNode(
            `asset-${Date.now()}-${index}`,
            getSpawnPosition(-160 + index * 48, 40 + index * 24),
            item,
          ),
        );
      }

      setNodes((currentNodes) => [...currentNodes, ...nextNodes]);
    },
    [getSpawnPosition, setNodes, supabase],
  );

  const addGeneratedContent = useCallback(
    async (input: GenerateInput) => {
      const payload = await requestCanvasPayload('/api/generate', input);
      applyCanvasPayload(payload);
    },
    [applyCanvasPayload, requestCanvasPayload],
  );

  const addResearchPack = useCallback(
    async (input: TavilyInput) => {
      const payload = await requestCanvasPayload('/api/search', input);
      applyCanvasPayload(payload);
    },
    [applyCanvasPayload, requestCanvasPayload],
  );

  const addTemplate = useCallback(
    async (input: TemplateInput) => {
      const payload = await requestCanvasPayload('/api/templates/apply', input);
      applyCanvasPayload(payload);
    },
    [applyCanvasPayload, requestCanvasPayload],
  );

  const onConnect = useCallback(
    (connection: Connection) => {
      setEdges((currentEdges) =>
        addEdge(
          {
            ...connection,
            ...edgeDefaults,
          },
          currentEdges,
        ),
      );
    },
    [setEdges],
  );

  const onEdgeDoubleClick = useCallback(
    (edgeId: string) => {
      setEdges((currentEdges) =>
        currentEdges.filter((edge) => edge.id !== edgeId),
      );
    },
    [setEdges],
  );

  const actions = useMemo(
    () => ({
      addQuickNote,
      addOwnContent,
      addGeneratedContent,
      addResearchPack,
      addTemplate,
      updateNodeData,
    }),
    [addGeneratedContent, addOwnContent, addQuickNote, addResearchPack, addTemplate, updateNodeData],
  );

  return {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    onEdgeDoubleClick,
    actions,
    persistenceStatus,
    persistenceError,
  };
}
