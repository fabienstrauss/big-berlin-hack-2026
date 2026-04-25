'use client';

import { X } from 'lucide-react';

type WorkspaceActionPanelProps = {
  title: string;
  description: string;
  children: React.ReactNode;
  onClose: () => void;
};

export function WorkspaceActionPanel({
  title,
  description,
  children,
  onClose,
}: WorkspaceActionPanelProps) {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-28 z-20 flex justify-center px-4">
      <div className="pointer-events-auto w-full max-w-lg rounded-[32px] border border-white/40 bg-white/80 p-4 shadow-[0_20px_50px_-20px_rgba(15,23,42,0.3)] backdrop-blur-2xl">
        <div className="mb-3 flex items-center justify-between px-2">
          <div className="flex min-w-0 flex-col gap-1">
            <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400">{title}</h2>
            <p className="truncate text-xs text-slate-500">{description}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex size-7 items-center justify-center rounded-full border border-slate-200/50 bg-white/50 text-slate-400 transition hover:bg-white hover:text-slate-900"
          >
            <X className="size-3.5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
