'use client';

import type { ReactNode } from 'react';
import Image from 'next/image';
import {
  AudioLines,
  LoaderCircle,
  Trash2,
  FileText,
  ImageIcon,
  NotebookPen,
  Play,
  Search,
  Sparkles,
  Video,
} from 'lucide-react';
import type { NodeProps } from 'reactflow';

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

function PromptCard({
  title,
  icon,
  prompt,
}: {
  title: string;
  icon: ReactNode;
  prompt?: string;
}) {
  if (!prompt) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-white/80 bg-white/80 p-3 backdrop-blur-sm">
      <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
        {icon}
        <span>{title}</span>
      </div>
      <p className="text-sm leading-6 text-slate-700">{prompt}</p>
    </div>
  );
}

export function CanvasCardNode({ data, selected }: CanvasCardNodeProps) {
  // Template nodes: media-only card, no text content
  if (data.kind === 'template') {
    const asset = data.assetItems?.[0];
    return (
      <div
        className={[
          'relative w-72 overflow-hidden rounded-3xl border border-slate-200/80 shadow-[0_18px_50px_-30px_rgba(15,23,42,0.35)] transition-all duration-200 bg-slate-900',
          selected ? 'scale-[1.01] border-slate-400 shadow-[0_24px_60px_-32px_rgba(15,23,42,0.55)]' : '',
        ].join(' ')}
      >
        {/* Delete */}
        <button
          type="button"
          onClick={data.onDelete}
          className="nodrag absolute right-3 top-3 z-10 flex size-8 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm transition hover:bg-black/60"
        >
          <Trash2 className="size-4" />
        </button>

        {/* Media */}
        {asset?.type === 'image' && asset.previewUrl ? (
          <img
            src={asset.previewUrl}
            alt={data.title}
            className="w-full object-cover"
          />
        ) : asset?.type === 'video' && asset.previewUrl ? (
          <video
            src={asset.previewUrl}
            className="w-full object-cover"
            autoPlay
            muted
            loop
            playsInline
          />
        ) : (
          <div className="flex h-48 w-full items-center justify-center bg-slate-800">
            <NotebookPen className="size-8 text-slate-500" />
          </div>
        )}

        {/* Title overlay */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent px-4 pb-4 pt-10">
          <p className="text-sm font-bold text-white leading-tight">{data.title}</p>
          <p className="mt-0.5 text-xs text-white/50">{data.subtitle}</p>
        </div>
      </div>
    );
  }

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
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <span className="inline-flex w-fit items-center rounded-full border border-slate-200 bg-white/80 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-600 backdrop-blur">
              {data.badge}
            </span>
            <button
              type="button"
              onClick={data.onDelete}
              className="nodrag flex size-8 items-center justify-center rounded-full border border-slate-200 bg-white/80 text-slate-500 transition hover:text-slate-900"
            >
              <Trash2 className="size-4" />
            </button>
          </div>

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

        <PromptCard
          title="Prompt"
          icon={<Sparkles className="size-3.5" />}
          prompt={data.prompt}
        />
        <PromptCard
          title="Image Prompt"
          icon={<ImageIcon className="size-3.5" />}
          prompt={data.imagePrompt}
        />
        <PromptCard
          title="Video Prompt"
          icon={<Video className="size-3.5" />}
          prompt={data.videoPrompt}
        />
        <PromptCard
          title="Animation Prompt"
          icon={<Sparkles className="size-3.5" />}
          prompt={data.animationPrompt}
        />

        {data.kind === 'generation' && data.status === 'generating' ? (
          <div className="rounded-2xl border border-white/80 bg-white/80 p-4 backdrop-blur-sm">
            <div className="mb-3 flex items-center gap-2 text-sm font-medium text-slate-700">
              <LoaderCircle className="size-4 animate-spin" />
              <span>{data.statusMessage ?? 'Generating asset...'}</span>
            </div>
            <div className="h-40 animate-pulse rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-100 via-white to-slate-200" />
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

                {item.type !== 'document' && !data.hideAssetMeta ? (
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
    </div>
  );
}
