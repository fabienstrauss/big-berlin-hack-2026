'use client';

import { Plus } from 'lucide-react';
import { ContentTemplate } from '../../lib/templates/catalog';
import { getTemplateAssetUrl } from '../../lib/templates/assets';

type TemplateGalleryProps = {
  templates: ContentTemplate[];
  onSelect: (templateId: string) => void;
  isApplying?: boolean;
};

export function TemplateGallery({
  templates,
  onSelect,
  isApplying = false,
}: TemplateGalleryProps) {
  if (templates.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-sm text-slate-500">No templates available.</p>
      </div>
    );
  }

  return (
    <div className="max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
      <div className="columns-2 gap-3 space-y-3 sm:columns-3">
        {templates.map((template) => (
          <TemplateCard
            key={template.id}
            template={template}
            onSelect={onSelect}
            isApplying={isApplying}
          />
        ))}
      </div>
    </div>
  );
}

function TemplateCard({ 
  template, 
  onSelect, 
  isApplying 
}: { 
  template: ContentTemplate; 
  onSelect: (id: string) => void;
  isApplying: boolean;
}) {
  const referenceAsset = template.assets?.find(a => a.type === 'image' || a.type === 'video') || template.assets?.[0];
  
  return (
    <button
      onClick={() => onSelect(template.id)}
      disabled={isApplying}
      className="group relative mb-3 block w-full break-inside-avoid overflow-hidden rounded-2xl border border-slate-200 bg-white transition hover:border-slate-400 hover:shadow-md disabled:opacity-50"
    >
      <div className="relative w-full overflow-hidden bg-slate-50">
        {referenceAsset?.type === 'image' ? (
          <img
            src={getTemplateAssetUrl(referenceAsset.src)}
            alt={template.title}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
          />
        ) : referenceAsset?.type === 'video' ? (
          <video
            src={getTemplateAssetUrl(referenceAsset.src)}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
            autoPlay
            muted
            loop
            playsInline
          />
        ) : (
          <div className="flex aspect-square w-full items-center justify-center bg-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-tighter p-4 text-center">
            {template.title}
          </div>
        )}
        
        {/* Hover Overlay */}
        <div className="absolute inset-0 flex items-center justify-center bg-slate-900/20 opacity-0 transition group-hover:opacity-100">
          <div className="flex size-8 items-center justify-center rounded-full bg-white text-slate-900 shadow-lg">
            <Plus className="size-4" />
          </div>
        </div>

        {/* Minimal Label */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2 opacity-0 transition group-hover:opacity-100">
          <p className="text-[10px] font-bold text-white truncate">{template.title}</p>
        </div>
      </div>
    </button>
  );
}
