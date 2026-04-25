import { MarkerType } from 'reactflow';

import type { CanvasAssetItem, CanvasEdge, CanvasNode, CanvasNodeData } from './types';

const defaultEdgeStyle = {
  stroke: '#94a3b8',
  strokeWidth: 1.5,
};

export const edgeDefaults = {
  animated: true,
  markerEnd: { type: MarkerType.ArrowClosed },
  style: defaultEdgeStyle,
};

function createNode(
  id: string,
  position: { x: number; y: number },
  data: CanvasNodeData,
): CanvasNode {
  return {
    id,
    type: 'canvas-card',
    position,
    data,
  };
}

export function createCanvasNode(
  id: string,
  position: { x: number; y: number },
  data: CanvasNodeData,
): CanvasNode {
  return createNode(id, position, data);
}

function createPreviewDataUrl(title: string, eyebrow: string, from: string, to: string) {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="1200" height="720" viewBox="0 0 1200 720">
      <defs>
        <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${from}" />
          <stop offset="100%" stop-color="${to}" />
        </linearGradient>
      </defs>
      <rect width="1200" height="720" rx="48" fill="url(#g)" />
      <rect x="56" y="56" width="260" height="44" rx="22" fill="rgba(255,255,255,0.74)" />
      <text x="84" y="84" fill="#0f172a" font-family="Arial, sans-serif" font-size="20" font-weight="700">${eyebrow}</text>
      <text x="84" y="230" fill="#0f172a" font-family="Arial, sans-serif" font-size="68" font-weight="700">${title}</text>
      <text x="84" y="290" fill="#334155" font-family="Arial, sans-serif" font-size="28">Prototype preview rendered on the canvas</text>
    </svg>
  `;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

export function inferMediaType(file: File): CanvasAssetItem['type'] {
  if (file.type.startsWith('image/')) {
    return 'image';
  }

  if (file.type.startsWith('video/')) {
    return 'video';
  }

  if (file.type.startsWith('audio/')) {
    return 'audio';
  }

  return 'document';
}

export const initialNodes: CanvasNode[] = [
  createNode('node-hook', { x: 80, y: 130 }, {
    kind: 'brainstorm',
    badge: 'Campaign Hook',
    title: '30-day creator sprint',
    subtitle: 'LinkedIn thought-starter',
    accent: 'from-amber-100 via-white to-rose-50',
    editable: true,
    body:
      'Open with one contrarian truth about building in public.\nThen turn the month into a visible accountability challenge.\nClose with a question people can answer from experience.',
    chips: ['Founders', 'Challenge', 'Community'],
  }),
  createNode('node-carousel', { x: 470, y: 250 }, {
    kind: 'brainstorm',
    badge: 'Format Angle',
    title: 'Shipping in public carousel',
    subtitle: 'Instagram and LinkedIn carousel',
    accent: 'from-sky-100 via-white to-cyan-50',
    editable: true,
    body:
      'Slide 1 anchors the hook with a surprising metric.\nSlides 2 to 6 map mistake to lesson to proof.\nThe last slide turns into a saveable checklist.',
    chips: ['Carousel', 'Educational', 'High save rate'],
  }),
  createNode('node-video', { x: 840, y: 110 }, {
    kind: 'generation',
    badge: 'Generated Result',
    title: 'Short-form reel about content myths',
    subtitle: 'Prompted output preview',
    accent: 'from-emerald-100 via-white to-lime-50',
    prompt:
      'Generate a 20-second reel covering 3 content myths founders still believe, with fast cuts and bold captions.',
    assetItems: [
      {
        id: 'seed-video',
        label: 'content-myths-reel.mp4',
        type: 'video',
        meta: 'Mock Veo output',
        previewUrl: createPreviewDataUrl('3 CONTENT MYTHS', 'Veo video', '#bbf7d0', '#86efac'),
      },
    ],
    chips: ['Veo video', 'High energy'],
  }),
];

export const initialEdges: CanvasEdge[] = [
  {
    id: 'edge-hook-carousel',
    source: 'node-hook',
    target: 'node-carousel',
    ...edgeDefaults,
  },
  {
    id: 'edge-carousel-video',
    source: 'node-carousel',
    target: 'node-video',
    ...edgeDefaults,
  },
];

export function createQuickNoteNode(
  id: string,
  position: { x: number; y: number },
  index: number,
): CanvasNode {
  return createNode(id, position, {
    kind: 'brainstorm',
    badge: 'Quick Note',
    title: `Fresh angle ${index}`,
    subtitle: 'Editable scratchpad',
    accent: 'from-violet-100 via-white to-fuchsia-50',
    editable: true,
    body:
      'Capture the strongest hook first.\nPick the target channel and format.\nDefine the reaction you want from the audience.',
    chips: ['Draft', 'Untested'],
  });
}

export function createUploadedAssetNode(
  id: string,
  position: { x: number; y: number },
  item: CanvasAssetItem,
): CanvasNode {
  return createNode(id, position, {
    kind: 'asset',
    badge: 'Uploaded Asset',
    title: item.label,
    subtitle: 'Imported from your machine',
    accent: 'from-orange-100 via-white to-amber-50',
    assetItems: [item],
    chips: ['Local file'],
  });
}
