export type TemplateAsset = {
  type: 'image' | 'video';
  src: string; // bucket-relative filename, e.g. "fashion_template.png"
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

export const contentTemplates: ContentTemplate[] = [
  {
    id: 'fashion',
    title: 'Fashion Editorial',
    category: 'Editorial',
    vibe: 'High fashion, aspirational',
    description: 'Refined editorial framing with a fashion-forward aesthetic and minimal copy.',
    hooks: [
      'Lead with texture, silhouette, and mood.',
      'Keep copy spare — let the visual carry the weight.',
      'Use a confident, brand-voice CTA.',
    ],
    imagePrompt:
      'A fashion editorial product image, clean studio lighting, aspirational composition, minimal palette, strong negative space, 4:5.',
    videoPrompt:
      'A fashion-forward product video with slow reveals, editorial camera moves, ambient sound, and restrained title cards, 9:16.',
    animationPrompt:
      'A refined looping animation with editorial typography and smooth product transitions in a fashion aesthetic.',
    assets: [{ type: 'image', src: 'fashion_template.png', label: 'Fashion Editorial' }],
  },
  {
    id: 'magazine',
    title: 'Magazine Spread',
    category: 'Editorial',
    vibe: 'Print-inspired, premium layout',
    description: 'A structured magazine-style layout with strong typographic hierarchy and editorial imagery.',
    hooks: [
      'Use headline-driven layout with editorial subtext.',
      'Balance image and copy like a print spread.',
      'Anchor with a masthead-style brand mark.',
    ],
    imagePrompt:
      'A magazine editorial layout for a product, clean grid, strong headline typography, premium photo placement, print-inspired design, 16:9.',
    videoPrompt:
      'A magazine-style product reveal video with page-turn transitions, editorial typography, and a luxury ad pace, 16:9.',
    animationPrompt:
      'A looping magazine-spread animation with kinetic text, editorial photo framing, and print-inspired motion.',
    assets: [{ type: 'image', src: 'magazine_template.png', label: 'Magazine Spread' }],
  },
  {
    id: 'movie-poster',
    title: 'Movie Poster',
    category: 'Launch',
    vibe: 'Cinematic, dramatic reveal',
    description: 'High-drama movie poster treatment for product launches that need to feel like an event.',
    hooks: [
      'Use cinematic framing and dramatic lighting.',
      'Treat the product like the hero of the film.',
      'One bold tagline — no bullet points.',
    ],
    imagePrompt:
      'A cinematic movie poster product image with dramatic lighting, bold title treatment, dark atmospheric background, event-launch energy, 2:3.',
    videoPrompt:
      'A movie-trailer-style product launch video with dramatic score, sweeping camera, bold title card, and a single punchy CTA, 16:9.',
    animationPrompt:
      'A cinematic looping animation with dramatic light sweeps, movie title typography, and a product reveal moment.',
    assets: [{ type: 'image', src: 'movie_poster_template.png', label: 'Movie Poster' }],
  },
  {
    id: 'y2k-poster',
    title: 'Y2K Poster',
    category: 'Performance',
    vibe: 'Retro Y2K, maximalist nostalgia',
    description: 'Early-2000s-inspired maximalist design with chrome type, pixel accents, and nostalgic energy.',
    hooks: [
      'Lean into chrome, metallics, and pixel textures.',
      'Use nostalgic copy framing — "new era", "loading…".',
      'Mix eras: digital glitch meets glossy 2000s.',
    ],
    imagePrompt:
      'A Y2K-era inspired product poster with chrome typography, pixel borders, glossy textures, early-2000s maximalist design, 1:1.',
    videoPrompt:
      'A Y2K nostalgic product video with glitch transitions, chrome title cards, retro digital effects, and era-accurate sound design, 9:16.',
    animationPrompt:
      'A looping Y2K animation with chrome shimmer, pixel grid overlays, and nostalgic UI-style product callouts.',
    assets: [{ type: 'image', src: 'y2k_poster_template.jpg', label: 'Y2K Poster' }],
  },
  {
    id: 'hyper-motion',
    title: 'Hyper Motion',
    category: 'Performance',
    vibe: 'High-energy, fast-cut action',
    description: 'Adrenaline-driven fast-cut video template for performance ads that demand attention.',
    hooks: [
      'Hook in the first 0.5 seconds with movement.',
      'Use rapid cuts synced to a beat.',
      'End on product + CTA at full energy.',
    ],
    imagePrompt:
      'A high-energy product still frame with motion blur, dynamic angle, bold overlaid text, performance ad composition, 9:16.',
    videoPrompt:
      'A hyper-motion product video with fast cuts, beat-synced editing, bold caption overlays, and maximum visual energy, 9:16.',
    animationPrompt:
      'A high-energy looping animation with rapid transitions, kinetic text, and motion-blur product highlights.',
    assets: [{ type: 'video', src: 'hyper_motion_template.mp4', label: 'Hyper Motion' }],
  },
  {
    id: 'mock',
    title: 'Product Mockup',
    category: 'Launch',
    vibe: 'Clean mockup, conversion-ready',
    description: 'Studio-clean product mockup format optimised for ads and launch announcements.',
    hooks: [
      'Lead with a pristine, distraction-free product shot.',
      'Use benefit callouts as overlay text.',
      'Close with price or CTA.',
    ],
    imagePrompt:
      'A clean product mockup on a neutral studio background, soft shadow, sharp product detail, minimal overlay text, conversion-ready layout, 1:1.',
    videoPrompt:
      'A product mockup video with a slow 360 rotation, clean studio background, benefit text overlays, and a clear CTA ending, 1:1.',
    animationPrompt:
      'A looping product mockup animation with a slow rotation, feature callout bubbles, and a clean brand-colour background.',
    assets: [{ type: 'video', src: 'mock_template.mp4', label: 'Product Mockup' }],
  },
  {
    id: 'tutorial',
    title: 'Tutorial / How-To',
    category: 'UGC',
    vibe: 'Educational, step-by-step',
    description: 'Structured tutorial format that builds trust through clear explanation and product demonstration.',
    hooks: [
      'Open with the problem, then immediately show the fix.',
      'Use numbered steps with on-screen text.',
      'End with a results-driven CTA.',
    ],
    imagePrompt:
      'A tutorial step-by-step product image with numbered callouts, clean instructional layout, bright lighting, educational clarity, 9:16.',
    videoPrompt:
      'A how-to tutorial video showing product use in clear steps, screen captions, upbeat pacing, creator-style delivery, 9:16.',
    animationPrompt:
      'A looping tutorial animation with numbered steps, icon callouts, and clean educational motion graphics.',
    assets: [{ type: 'video', src: 'tutorial_template.mp4', label: 'Tutorial / How-To' }],
  },
  {
    id: 'unboxing',
    title: 'Unboxing',
    category: 'UGC',
    vibe: 'First impression, authentic reveal',
    description: 'Authentic unboxing format that builds anticipation and showcases packaging alongside product.',
    hooks: [
      'Build anticipation before the reveal — show the box first.',
      'React naturally and highlight packaging quality.',
      'End with the product in hand and an honest CTA.',
    ],
    imagePrompt:
      'An unboxing flat-lay product image showing packaging, tissue paper, and product arranged on a clean surface, warm lifestyle lighting, 4:5.',
    videoPrompt:
      'An unboxing video with close-up hands opening premium packaging, natural reaction, product reveal moment, and a conversational wrap-up CTA, 9:16.',
    animationPrompt:
      'A looping unboxing animation with a box lid lifting, product rising from packaging, and reveal title card.',
    assets: [{ type: 'video', src: 'unboxing_template.mp4', label: 'Unboxing' }],
  },
];
