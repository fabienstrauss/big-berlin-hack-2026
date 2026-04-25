'use client';

import { useState, useId, useEffect, useRef } from 'react';
import { Video, Image as ImageIcon, Film, ArrowRight, CircleCheck } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { contentTemplates } from '../../lib/templates/catalog';
import { getTemplateAssetUrl } from '../../lib/templates/assets';

// --- SVG Platform Logos ---

function InstagramLogo({ size = 24 }: { size?: number }) {
  const uid = useId().replace(/:/g, '');
  const gradId = `ig-${uid}`;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <defs>
        <radialGradient id={gradId} cx="30%" cy="107%" r="150%">
          <stop offset="0%" stopColor="#ffd600" />
          <stop offset="10%" stopColor="#ff6d00" />
          <stop offset="50%" stopColor="#e1306c" />
          <stop offset="75%" stopColor="#833ab4" />
          <stop offset="100%" stopColor="#405de6" />
        </radialGradient>
      </defs>
      <rect x="2" y="2" width="20" height="20" rx="6" fill={`url(#${gradId})`} />
      <circle cx="12" cy="12" r="4.5" stroke="white" strokeWidth="1.8" fill="none" />
      <circle cx="17.5" cy="6.5" r="1.2" fill="white" />
    </svg>
  );
}

function TikTokLogo({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect width="24" height="24" rx="6" fill="#010101" />
      <path
        d="M16.6 5.82a4.28 4.28 0 0 1-1.06-2.82h-3.09v12.4a2.592 2.592 0 0 1-2.59 2.5 2.592 2.592 0 0 1-2.59-2.5 2.592 2.592 0 0 1 2.59-2.5c.28 0 .54.04.79.1V9.85a5.76 5.76 0 0 0-.79-.05 5.67 5.67 0 0 0-5.67 5.67 5.67 5.67 0 0 0 5.67 5.67 5.67 5.67 0 0 0 5.67-5.67V8.77a7.35 7.35 0 0 0 4.31 1.38V7.07a4.28 4.28 0 0 1-3.24-1.25z"
        fill="white"
      />
    </svg>
  );
}

function LinkedInLogo({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect width="24" height="24" rx="6" fill="#0A66C2" />
      <path d="M7.5 9.5H5V19H7.5V9.5Z" fill="white" />
      <circle cx="6.25" cy="6.75" r="1.5" fill="white" />
      <path
        d="M19 19h-2.5v-4.75c0-1.1-.4-1.75-1.35-1.75-.9 0-1.4.6-1.65 1.2-.08.2-.1.5-.1.8V19H11s.03-8.5 0-9.5h2.4v1.35c.32-.5 1-1.2 2.45-1.2 1.8 0 3.15 1.15 3.15 3.65V19z"
        fill="white"
      />
    </svg>
  );
}

function XLogo({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect width="24" height="24" rx="6" fill="#000000" />
      <path
        d="M13.6 10.9L18.2 5.5H17L13 10.1L9.8 5.5H5.5L10.3 12.6L5.5 18.3H6.7L10.9 13.4L14.3 18.3H18.5L13.6 10.9ZM11.5 12.7L10.9 11.8L7.2 6.4H9.3L11.9 10.2L12.6 11.2L16.5 16.9H14.4L11.5 12.7Z"
        fill="white"
      />
    </svg>
  );
}

function YouTubeLogo({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect width="24" height="24" rx="6" fill="#FF0000" />
      <path
        d="M19.6 7.9a2.5 2.5 0 0 0-1.76-1.77C16.5 5.75 12 5.75 12 5.75s-4.5 0-5.84.38A2.5 2.5 0 0 0 4.4 7.9 26.2 26.2 0 0 0 4 12c-.01 1.38.13 2.75.4 4.1a2.5 2.5 0 0 0 1.76 1.77C7.5 18.25 12 18.25 12 18.25s4.5 0 5.84-.38a2.5 2.5 0 0 0 1.76-1.77C19.87 14.75 20 13.38 20 12a26.2 26.2 0 0 0-.4-4.1z"
        fill="white"
      />
      <path d="M10.25 14.75L14.75 12L10.25 9.25V14.75Z" fill="#FF0000" />
    </svg>
  );
}

// --- Types ---

type ContentTypeId = 'video' | 'image' | 'animation';

export type AspectRatioId = 'vertical' | 'square' | 'horizontal';

const ASPECT_RATIOS: {
  id: AspectRatioId;
  label: string;
  ratio: string;
  w: number;
  h: number;
}[] = [
  { id: 'vertical',   label: 'Vertical',    ratio: '9:16', w: 9,  h: 16 },
  { id: 'square',     label: 'Square',      ratio: '1:1',  w: 1,  h: 1  },
  { id: 'horizontal', label: 'Horizontal',  ratio: '16:9', w: 16, h: 9  },
];

const VIDEO_CONTENT_TYPES: ContentTypeId[] = ['video', 'animation'];

type PlatformConfig = {
  audience: string;
  contentTypes: ContentTypeId[];
  templates: Partial<Record<ContentTypeId, string>>;
  aspectRatios: Partial<Record<ContentTypeId, AspectRatioId>>;
};

const PLATFORMS = [
  { id: 'instagram' as const, name: 'Instagram', Logo: InstagramLogo },
  { id: 'tiktok' as const, name: 'TikTok', Logo: TikTokLogo },
  { id: 'linkedin' as const, name: 'LinkedIn', Logo: LinkedInLogo },
  { id: 'twitter' as const, name: 'X / Twitter', Logo: XLogo },
  { id: 'youtube' as const, name: 'YouTube', Logo: YouTubeLogo },
];

type PlatformId = (typeof PLATFORMS)[number]['id'];

const AUDIENCES = [
  { id: 'genz', name: 'Gen Z / Alpha', description: 'Fast, authentic, trend-led' },
  { id: 'millennials', name: 'Millennials', description: 'Value-driven, experience-first' },
  { id: 'pro', name: 'Professionals', description: 'Insightful, career-focused' },
  { id: 'tech', name: 'Tech Savvy', description: 'Detailed, innovation-led' },
];

const CONTENT_TYPES: { id: ContentTypeId; name: string; Icon: LucideIcon }[] = [
  { id: 'video', name: 'Short Video', Icon: Video },
  { id: 'image', name: 'Image', Icon: ImageIcon },
  { id: 'animation', name: 'Animation', Icon: Film },
];

const DEFAULT_PLATFORM_CONFIG = (): PlatformConfig => ({
  audience: 'genz',
  contentTypes: ['video'],
  templates: {},
  aspectRatios: { video: 'vertical', animation: 'vertical' },
});

export type ChoiceConfig = {
  platforms: Partial<Record<PlatformId, PlatformConfig>>;
};

type ChoiceScreenProps = {
  onComplete: (config: ChoiceConfig) => void;
  initialConfig?: ChoiceConfig | null;
  onConfigChange?: (config: ChoiceConfig) => void;
};

// --- Template Card ---

function TemplateCard({
  template,
  selected,
  onSelect,
}: {
  template: (typeof contentTemplates)[number];
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      className={[
        'relative flex-shrink-0 w-44 rounded-2xl border text-left overflow-hidden transition-all duration-200',
        selected
          ? 'border-slate-900 shadow-lg ring-1 ring-slate-900'
          : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-md',
      ].join(' ')}
    >
      <div className="h-24 w-full bg-slate-100 overflow-hidden">
        {template.assets?.[0]?.type === 'image' ? (
          <img
            src={getTemplateAssetUrl(template.assets[0].src)}
            alt={template.title}
            className="h-full w-full object-cover"
          />
        ) : template.assets?.[0]?.type === 'video' ? (
          <video
            src={getTemplateAssetUrl(template.assets[0].src)}
            className="h-full w-full object-cover"
            autoPlay
            muted
            loop
            playsInline
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200">
            <Film className="size-7 text-slate-400" />
          </div>
        )}
      </div>
      <div className="p-3">
        <p className="text-xs font-bold text-slate-900 leading-tight">{template.title}</p>
        <span className="mt-1 inline-block rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500">
          {template.category}
        </span>
      </div>
      {selected && (
        <div className="absolute right-2 top-2 flex size-5 items-center justify-center rounded-full bg-slate-900">
          <CircleCheck className="size-3 text-white" />
        </div>
      )}
    </button>
  );
}

// --- Platform Section ---

function PlatformSection({
  platformId,
  config,
  onChange,
}: {
  platformId: PlatformId;
  config: PlatformConfig;
  onChange: (config: PlatformConfig) => void;
}) {
  const platform = PLATFORMS.find((p) => p.id === platformId)!;
  const { Logo } = platform;

  const toggleContentType = (typeId: ContentTypeId) => {
    const current = config.contentTypes;
    if (current.includes(typeId) && current.length === 1) return;
    const removing = current.includes(typeId);
    const next = removing ? current.filter((t) => t !== typeId) : [...current, typeId];
    const newTemplates = { ...config.templates };
    const newAspectRatios = { ...config.aspectRatios };
    if (removing) {
      delete newTemplates[typeId];
      delete newAspectRatios[typeId];
    } else if (VIDEO_CONTENT_TYPES.includes(typeId) && !newAspectRatios[typeId]) {
      newAspectRatios[typeId] = 'vertical';
    }
    onChange({ ...config, contentTypes: next, templates: newTemplates, aspectRatios: newAspectRatios });
  };

  const selectAspectRatio = (typeId: ContentTypeId, ratioId: AspectRatioId) => {
    onChange({ ...config, aspectRatios: { ...config.aspectRatios, [typeId]: ratioId } });
  };

  const selectTemplate = (typeId: ContentTypeId, templateId: string) => {
    const alreadySelected = config.templates[typeId] === templateId;
    const newTemplates = { ...config.templates };
    if (alreadySelected) {
      delete newTemplates[typeId];
    } else {
      newTemplates[typeId] = templateId;
    }
    onChange({ ...config, templates: newTemplates });
  };

  return (
    <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-6 flex items-center gap-3">
        <Logo size={28} />
        <h3 className="text-base font-bold text-slate-900">{platform.name}</h3>
      </div>

      {/* Audience */}
      <div className="mb-6">
        <p className="mb-3 text-[11px] font-bold uppercase tracking-widest text-slate-400">
          Target Audience
        </p>
        <div className="flex flex-wrap gap-2">
          {AUDIENCES.map((a) => (
            <button
              key={a.id}
              onClick={() => onChange({ ...config, audience: a.id })}
              title={a.description}
              className={[
                'rounded-full border px-4 py-1.5 text-xs font-semibold transition-all duration-200',
                config.audience === a.id
                  ? 'border-slate-900 bg-slate-900 text-white'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300',
              ].join(' ')}
            >
              {a.name}
            </button>
          ))}
        </div>
      </div>

      {/* Content Types */}
      <div className="mb-6">
        <p className="mb-3 text-[11px] font-bold uppercase tracking-widest text-slate-400">
          Content Types
        </p>
        <div className="flex flex-wrap gap-2">
          {CONTENT_TYPES.map(({ id, name, Icon }) => {
            const active = config.contentTypes.includes(id);
            return (
              <button
                key={id}
                onClick={() => toggleContentType(id)}
                className={[
                  'flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-semibold transition-all duration-200',
                  active
                    ? 'border-slate-900 bg-slate-900 text-white'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300',
                ].join(' ')}
              >
                <Icon className="size-3.5" />
                {name}
                {active && <CircleCheck className="size-3" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Aspect ratio + template selection per content type */}
      {config.contentTypes.map((typeId) => {
        const contentType = CONTENT_TYPES.find((c) => c.id === typeId)!;
        const isVideoType = VIDEO_CONTENT_TYPES.includes(typeId);
        const activeRatio = config.aspectRatios?.[typeId] ?? 'vertical';

        return (
          <div key={typeId} className="mb-5 last:mb-0">
            {/* Aspect ratio selector — video and animation only */}
            {isVideoType && (
              <div className="mb-4">
                <p className="mb-3 text-[11px] font-bold uppercase tracking-widest text-slate-400">
                  Format — {contentType.name}
                </p>
                <div className="flex gap-3">
                  {ASPECT_RATIOS.map((ar) => {
                    const selected = activeRatio === ar.id;
                    // Scale preview box: max height 48px
                    const scale = 48 / Math.max(ar.w, ar.h);
                    const boxW = Math.round(ar.w * scale);
                    const boxH = Math.round(ar.h * scale);
                    return (
                      <button
                        key={ar.id}
                        onClick={() => selectAspectRatio(typeId, ar.id)}
                        className={[
                          'flex flex-col items-center gap-2 rounded-2xl border px-4 py-3 text-xs font-semibold transition-all duration-200',
                          selected
                            ? 'border-slate-900 bg-slate-900 text-white'
                            : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300',
                        ].join(' ')}
                      >
                        <span
                          className={[
                            'rounded border-2 flex-shrink-0',
                            selected ? 'border-white/60' : 'border-slate-300',
                          ].join(' ')}
                          style={{ width: boxW, height: boxH }}
                        />
                        <span>{ar.label}</span>
                        <span className={selected ? 'text-white/50' : 'text-slate-400'}>
                          {ar.ratio}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <p className="mb-3 text-[11px] font-bold uppercase tracking-widest text-slate-400">
              Template for {contentType.name}
            </p>
            <div className="flex gap-3 overflow-x-auto pb-2 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
              {contentTemplates
                .filter((t) => {
                  const assetType = t.assets?.[0]?.type;
                  if (typeId === 'image') return assetType === 'image';
                  return assetType === 'video'; // video + animation both use video templates
                })
                .map((template) => (
                  <TemplateCard
                    key={template.id}
                    template={template}
                    selected={config.templates[typeId] === template.id}
                    onSelect={() => selectTemplate(typeId, template.id)}
                  />
                ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// --- Main Component ---

export function ChoiceScreen({ onComplete, initialConfig, onConfigChange }: ChoiceScreenProps) {
  const initialIds =
    initialConfig && Object.keys(initialConfig.platforms).length
      ? (Object.keys(initialConfig.platforms) as PlatformId[])
      : (['instagram'] as PlatformId[]);

  const initialPlatformConfigs =
    initialConfig && Object.keys(initialConfig.platforms).length
      ? initialConfig.platforms
      : ({
          instagram: DEFAULT_PLATFORM_CONFIG(),
        } as Partial<Record<PlatformId, PlatformConfig>>);

  const [selectedPlatforms, setSelectedPlatforms] = useState<PlatformId[]>(initialIds);
  const [platformConfigs, setPlatformConfigs] =
    useState<Partial<Record<PlatformId, PlatformConfig>>>(initialPlatformConfigs);

  // Notify parent of every change for live persistence
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return; }
    if (!onConfigChange) return;
    const result: Partial<Record<PlatformId, PlatformConfig>> = {};
    for (const id of selectedPlatforms) {
      result[id] = platformConfigs[id] ?? DEFAULT_PLATFORM_CONFIG();
    }
    onConfigChange({ platforms: result });
  }, [selectedPlatforms, platformConfigs, onConfigChange]);

  const togglePlatform = (id: PlatformId) => {
    if (selectedPlatforms.includes(id)) {
      if (selectedPlatforms.length === 1) return;
      setSelectedPlatforms((prev) => prev.filter((p) => p !== id));
    } else {
      setSelectedPlatforms((prev) => [...prev, id]);
      setPlatformConfigs((prev) => ({
        ...prev,
        [id]: prev[id] ?? DEFAULT_PLATFORM_CONFIG(),
      }));
    }
  };

  const updatePlatformConfig = (id: PlatformId, config: PlatformConfig) => {
    setPlatformConfigs((prev) => ({ ...prev, [id]: config }));
  };

  const handleComplete = () => {
    const result: Partial<Record<PlatformId, PlatformConfig>> = {};
    for (const id of selectedPlatforms) {
      result[id] = platformConfigs[id] ?? DEFAULT_PLATFORM_CONFIG();
    }
    onComplete({ platforms: result });
  };

  return (
    <div className="mx-auto max-w-3xl px-6 pb-32 pt-8">
      {/* Platform Selector */}
      <div className="mb-8">
        <h2 className="mb-1 text-lg font-bold text-slate-900">Where do you want to publish?</h2>
        <p className="mb-5 text-sm text-slate-500">
          Select one or more platforms — each gets its own audience and content configuration.
        </p>
        <div className="flex flex-wrap gap-3">
          {PLATFORMS.map(({ id, name, Logo }) => {
            const active = selectedPlatforms.includes(id);
            return (
              <button
                key={id}
                onClick={() => togglePlatform(id)}
                className={[
                  'flex items-center gap-2.5 rounded-full border px-4 py-2.5 transition-all duration-200',
                  active
                    ? 'border-slate-900 bg-white shadow-md ring-1 ring-slate-900'
                    : 'border-slate-200 bg-white/60 hover:bg-white hover:border-slate-300',
                ].join(' ')}
              >
                <Logo size={20} />
                <span className="text-sm font-semibold text-slate-800">{name}</span>
                {active && <CircleCheck className="size-4 text-slate-900" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Per-Platform Config */}
      <div className="flex flex-col gap-5">
        {selectedPlatforms.map((id) => (
          <PlatformSection
            key={id}
            platformId={id}
            config={platformConfigs[id] ?? DEFAULT_PLATFORM_CONFIG()}
            onChange={(config) => updatePlatformConfig(id, config)}
          />
        ))}
      </div>

      {/* CTA */}
      <div className="mt-8 rounded-[28px] bg-slate-900 p-6 text-white">
        <h4 className="text-base font-bold">Ready to generate?</h4>
        <p className="mt-1 text-sm text-white/50">
          {selectedPlatforms.length} platform{selectedPlatforms.length !== 1 ? 's' : ''} configured
        </p>
        <button
          onClick={handleComplete}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-white py-3.5 text-sm font-bold text-slate-900 transition hover:bg-slate-100 active:scale-[0.98]"
        >
          Go to Generation
          <ArrowRight className="size-4" />
        </button>
      </div>
    </div>
  );
}
