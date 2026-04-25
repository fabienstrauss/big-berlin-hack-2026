export type TemplateAsset = {
  type: 'image' | 'video';
  src: string;
  label: string;
};

export type ContentTemplate = {
  id: string;
  title: string;
  category: 'Launch' | 'UGC' | 'Editorial' | 'Performance';
  vibe: string;
  description: string;
  hooks: string[];
  imagePrompt: string;
  videoPrompt: string;
  animationPrompt: string;
  assets?: TemplateAsset[];
};

export const TEMPLATE_ASSET_DIRECTORIES = {
  images: '/template-assets/images',
  videos: '/template-assets/videos',
} as const;

export const contentTemplates: ContentTemplate[] = [
  {
    id: 'premium-hero',
    title: 'Premium Product Hero',
    category: 'Editorial',
    vibe: 'Editorial minimal',
    description: 'Quiet luxury product storytelling with premium composition and restrained copy.',
    hooks: [
      'Lead with tactile materials and precise composition.',
      'Use short, expensive-sounding copy with strong whitespace.',
      'Keep the CTA understated and confidence-led.',
    ],
    imagePrompt:
      'A premium product hero image for a smart bottle on travertine stone at sunrise, soft editorial lighting, luxury still life, minimal palette, 16:9 composition.',
    videoPrompt:
      'A slow cinematic product reveal video for a smart bottle, editorial lighting, macro texture shots, elegant camera motion, luxury ad pacing, 16:9.',
    animationPrompt:
      'A refined looping animation of a smart bottle rotating slowly with soft light sweeps and minimal luxury title cards.',
    assets: [
      {
        type: 'image',
        src: `${TEMPLATE_ASSET_DIRECTORIES.images}/premium-hero-reference.jpg`,
        label: 'premium-hero-reference.jpg',
      },
    ],
  },
  {
    id: 'ugc-testimonial',
    title: 'UGC Testimonial',
    category: 'UGC',
    vibe: 'Authentic performance UGC',
    description: 'Creator-style direct response content focused on trust, routine, and quick proof.',
    hooks: [
      'Open with a face-first hook in the first second.',
      'Use direct language and a routine-driven proof point.',
      'End with a low-friction CTA or product question.',
    ],
    imagePrompt:
      'A casual creator-style selfie product image in a bright apartment, natural light, handheld realism, authentic UGC framing, 9:16.',
    videoPrompt:
      'A UGC testimonial video of a creator talking about a smart bottle, handheld camera, quick jump cuts, on-screen captions, performance ad pacing, 9:16.',
    animationPrompt:
      'A playful looping animation with subtitle callouts and sticker-like product highlights for a UGC ad.',
    assets: [
      {
        type: 'video',
        src: `${TEMPLATE_ASSET_DIRECTORIES.videos}/ugc-testimonial-reference.mp4`,
        label: 'ugc-testimonial-reference.mp4',
      },
    ],
  },
  {
    id: 'launch-countdown',
    title: 'Launch Countdown',
    category: 'Launch',
    vibe: 'Bold launch energy',
    description: 'A campaign template for announcement week with momentum and repeated anticipation.',
    hooks: [
      'Use countdown framing and repeated release cues.',
      'Pair feature teases with anticipation-building visuals.',
      'Close every asset with a strong waitlist or drop CTA.',
    ],
    imagePrompt:
      'A high-energy launch campaign poster for a smart bottle, bold typography, countdown numbers, vibrant gradients, modern startup aesthetic, 4:5.',
    videoPrompt:
      'A launch countdown teaser for a smart bottle with fast cuts, bold type overlays, feature flashes, dramatic music pacing, 16:9.',
    animationPrompt:
      'A looping countdown animation with feature flashes and kinetic typography for a product drop campaign.',
    assets: [
      {
        type: 'image',
        src: `${TEMPLATE_ASSET_DIRECTORIES.images}/launch-countdown-reference.jpg`,
        label: 'launch-countdown-reference.jpg',
      },
    ],
  },
  {
    id: 'comparison-ad',
    title: 'Comparison Ad',
    category: 'Performance',
    vibe: 'Clear conversion framing',
    description: 'A direct-response template showing product differentiation with clean structure.',
    hooks: [
      'Frame the category problem before naming the product.',
      'Use side-by-side comparison language and visual logic.',
      'Finish with a conversion-oriented CTA.',
    ],
    imagePrompt:
      'A clean side-by-side comparison ad for a smart bottle versus generic bottle, modern layout, clear labels, persuasive product marketing design, 1:1.',
    videoPrompt:
      'A performance comparison video showing a smart bottle against a standard bottle, clean split-screen visuals, bold captions, fast explanation pacing, 1:1.',
    animationPrompt:
      'A looping comparison animation with before/after panels and concise benefit callouts.',
    assets: [
      {
        type: 'image',
        src: `${TEMPLATE_ASSET_DIRECTORIES.images}/comparison-ad-reference.jpg`,
        label: 'comparison-ad-reference.jpg',
      },
    ],
  },
];
