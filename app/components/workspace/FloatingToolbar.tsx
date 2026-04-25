'use client';

import {
  Globe,
  Library,
  Paperclip,
  Plus,
  Sparkles,
  type LucideIcon,
} from 'lucide-react';

type ToolbarAction = {
  testId: string;
  label: string;
  icon: LucideIcon;
  onClick: () => void;
  primary?: boolean;
};

type FloatingToolbarProps = {
  onAddNote: () => void;
  onOpenUpload: () => void;
  onOpenGenerate: () => void;
  onOpenScrape: () => void;
  onOpenTemplate: () => void;
};

export function FloatingToolbar({
  onAddNote,
  onOpenUpload,
  onOpenGenerate,
  onOpenScrape,
  onOpenTemplate,
}: FloatingToolbarProps) {
  const actions: ToolbarAction[] = [
    {
      testId: 'toolbar-add-note',
      label: 'Add note',
      icon: Plus,
      onClick: onAddNote,
      primary: true,
    },
    {
      testId: 'toolbar-open-upload',
      label: 'Own content',
      icon: Paperclip,
      onClick: onOpenUpload,
    },
    {
      testId: 'toolbar-open-generate',
      label: 'Generate',
      icon: Sparkles,
      onClick: onOpenGenerate,
    },
    {
      testId: 'toolbar-open-scrape',
      label: 'Tavily scrape',
      icon: Globe,
      onClick: onOpenScrape,
    },
    {
      testId: 'toolbar-open-template',
      label: 'Templates',
      icon: Library,
      onClick: onOpenTemplate,
    },
  ];

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-20 flex justify-center px-4 pb-6">
      <div className="pointer-events-auto flex items-center gap-2 rounded-full border border-white/70 bg-white/80 p-2 shadow-[0_24px_60px_-30px_rgba(15,23,42,0.35)] backdrop-blur-xl">
        {actions.map(({ testId, label, icon: Icon, onClick, primary }) => (
          <button
            key={label}
            type="button"
            onClick={onClick}
            data-testid={testId}
            className={[
              'group flex items-center gap-2 rounded-full px-4 py-3 text-sm font-medium text-slate-600 transition duration-200 hover:scale-[1.03] hover:bg-slate-50 hover:text-slate-900 active:scale-[0.98]',
              primary
                ? 'bg-slate-900 text-white hover:bg-slate-800 hover:text-white'
                : '',
            ].join(' ')}
          >
            <Icon className="size-4 transition-opacity duration-200 group-hover:opacity-90" />
            <span className="hidden md:inline">{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
