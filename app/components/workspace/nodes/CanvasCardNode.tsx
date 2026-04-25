'use client';

import Image from 'next/image';
import {
  AudioLines,
  FileText,
  ImageIcon,
  NotebookPen,
  Play,
  Search,
  Sparkles,
  Video,
} from 'lucide-react';
import { Handle, Position, type NodeProps } from 'reactflow';

import type { CanvasAssetItem, CanvasNodeData } from '../../../lib/canvas/types';

type CanvasCardNodeProps = NodeProps<CanvasNodeData>;

function trimLabel(label: string, maxLength = 28) {
  if (label.length <= maxLength) {
    return label;
  }

  const extensionIndex = label.lastIndexOf('.');

  if (extensionIndex <= 0 || extensionIndex === label.length - 1) {
    return `${label.slice(0, maxLength - 1)}…`;
  }

  const extension = label.slice(extensionIndex);
  const base = label.slice(0, extensionIndex);
  const visibleBaseLength = Math.max(8, maxLength - extension.length - 1);

  return `${base.slice(0, visibleBaseLength)}…${extension}`;
}

function MediaIcon({ type }: { type: CanvasAssetItem['type'] }) {
  if (type === 'image') {
    return <ImageIcon className="size-4" />;
  }

  if (type === 'video') {
    return <Video className="size-4" />;
  }

  if (type === 'audio') {
    return <AudioLines className="size-4" />;
  }

  return <FileText className="size-4" />;
}

function NodeGlyph({ kind }: { kind: CanvasNodeData['kind'] }) {
  if (kind === 'asset') {
    return <ImageIcon className="size-4" />;
  }

  if (kind === 'generation') {
    return <Sparkles className="size-4" />;
  }

  if (kind === 'research' || kind === 'image-stack') {
    return <Search className="size-4" />;
  }

  if (kind === 'template') {
    return <NotebookPen className="size-4" />;
  }

  return <Sparkles className="size-4" />;
}

export function CanvasCardNode({ data, selected }: CanvasCardNodeProps) {
  return (
    <div
      className={[
        'w-80 rounded-3xl border border-slate-200/80 bg-gradient-to-br p-4 shadow-[0_18px_50px_-30px_rgba(15,23,42,0.35)] transition-all duration-200',
        selected
          ? 'scale-[1.01] border-slate-300 shadow-[0_24px_60px_-32px_rgba(15,23,42,0.42)]'
          : '',
        data.accent,
      ].join(' ')}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!size-5 !border-[3px] !border-white !bg-slate-400 !shadow-md"
      />

      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-3">
          <span className="inline-flex w-fit items-center rounded-full border border-slate-200 bg-white/80 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-600 backdrop-blur">
            {data.badge}
          </span>

          <div className="flex items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white/85 text-slate-700 shadow-sm">
              <NodeGlyph kind={data.kind} />
            </div>
            <div className="min-w-0 flex flex-1 flex-col gap-1">
              {data.editable ? (
                <input
                  value={data.title}
                  onChange={(event) => data.onUpdate?.({ title: event.target.value })}
                  className="nodrag nowheel w-full rounded-xl border border-transparent bg-white/70 px-2 py-1 text-base font-semibold leading-6 text-slate-900 outline-none transition focus:border-slate-200"
                />
              ) : (
                <h3
                  className="truncate text-base font-semibold leading-6 text-slate-900"
                  title={data.title}
                >
                  {data.title}
                </h3>
              )}
              <p className="truncate text-sm text-slate-500" title={data.subtitle}>
                {data.subtitle}
              </p>
            </div>
          </div>
        </div>

        {data.editable ? (
          <textarea
            value={data.body ?? ''}
            onChange={(event) => data.onUpdate?.({ body: event.target.value })}
            onWheelCapture={(event) => event.stopPropagation()}
            className="nodrag nowheel min-h-28 max-h-64 resize-none overflow-y-auto rounded-2xl border border-white/80 bg-white/75 p-3 text-sm leading-6 text-slate-700 outline-none backdrop-blur-sm transition focus:border-slate-200"
          />
        ) : null}

        {!data.editable && data.body ? (
          <div className="rounded-2xl border border-white/80 bg-white/75 p-3 text-sm leading-6 text-slate-600 backdrop-blur-sm">
            {data.body}
          </div>
        ) : null}

        {data.prompt ? (
          <div className="rounded-2xl border border-white/80 bg-white/80 p-3 backdrop-blur-sm">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
              Prompt
            </p>
            <p className="text-sm leading-6 text-slate-700">{data.prompt}</p>
          </div>
        ) : null}

        {data.bullets?.length ? (
          <ul className="rounded-2xl border border-white/80 bg-white/75 p-3 backdrop-blur-sm">
            {data.bullets.map((bullet) => (
              <li key={bullet} className="flex gap-2 text-sm leading-6 text-slate-600">
                <span className="mt-2 size-1.5 rounded-full bg-slate-300" />
                <span>{bullet}</span>
              </li>
            ))}
          </ul>
        ) : null}

        {data.assetItems?.length ? (
          <div className="flex flex-col gap-3 rounded-2xl border border-white/80 bg-white/75 p-3 backdrop-blur-sm">
            {data.assetItems.map((item) => (
              <div
                key={item.id}
                className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
              >
                {item.type === 'image' && item.previewUrl ? (
                  <Image
                    src={item.previewUrl}
                    alt={item.label}
                    width={640}
                    height={320}
                    unoptimized
                    className="h-40 w-full object-cover"
                  />
                ) : null}

                {item.type === 'video' ? (
                  item.previewUrl ? (
                    <div className="relative h-40 w-full bg-slate-100">
                      <video
                        src={item.previewUrl}
                        className="h-full w-full object-cover"
                        muted
                        playsInline
                        controls
                      />
                    </div>
                  ) : (
                    <div className="flex h-40 items-center justify-center bg-gradient-to-br from-sky-100 to-cyan-50">
                      <div className="flex size-12 items-center justify-center rounded-full bg-white/80 text-slate-700 shadow-sm">
                        <Play className="ml-0.5 size-5" />
                      </div>
                    </div>
                  )
                ) : null}

                {item.type === 'audio' ? (
                  <div className="flex items-center gap-3 p-4">
                    <div className="flex size-10 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
                      <AudioLines className="size-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-900">
                        {trimLabel(item.label)}
                      </p>
                      <p className="text-xs text-slate-500">{item.meta}</p>
                      {item.previewUrl ? (
                        <audio src={item.previewUrl} controls className="mt-2 w-full" />
                      ) : null}
                    </div>
                  </div>
                ) : null}

                {item.type === 'document' ? (
                  <div className="flex items-center gap-3 p-4">
                    <div className="flex size-10 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
                      <FileText className="size-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-900">
                        {trimLabel(item.label)}
                      </p>
                      <p className="text-xs text-slate-500">{item.meta}</p>
                    </div>
                  </div>
                ) : null}

                {item.type !== 'document' ? (
                  <div className="flex items-center justify-between border-t border-slate-100 px-3 py-2 text-sm text-slate-600">
                    <div className="min-w-0 flex flex-1 items-center gap-2">
                      <MediaIcon type={item.type} />
                      <span className="truncate font-medium text-slate-800">
                        {trimLabel(item.label)}
                      </span>
                    </div>
                    <span className="ml-3 shrink-0 text-xs text-slate-500">
                      {item.meta}
                    </span>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        ) : null}

        {data.stackItems?.length ? (
          <div className="rounded-2xl border border-white/80 bg-white/75 p-3 backdrop-blur-sm">
            <div className="relative h-28">
              {data.stackItems.map((item, index) => (
                <div
                  key={item.label}
                  className={[
                    'absolute inset-y-0 w-28 rounded-2xl border border-white/90 bg-gradient-to-br shadow-md',
                    item.tint,
                  ].join(' ')}
                  style={{
                    left: `${index * 52}px`,
                    transform: `rotate(${index % 2 === 0 ? -5 : 5}deg)`,
                  }}
                >
                  <div className="flex h-full items-end rounded-2xl bg-white/20 p-3">
                    <span className="rounded-full bg-white/80 px-2 py-1 text-xs font-medium text-slate-700">
                      {item.label}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        className="!size-5 !border-[3px] !border-white !bg-slate-400 !shadow-md"
      />
    </div>
  );
}
