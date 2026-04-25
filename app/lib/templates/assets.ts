import { getSupabaseBrowserClient } from '../supabase/client';

const BUCKET = 'templates';

/**
 * Resolves a bucket-relative template asset filename to a full Supabase Storage public URL.
 * Uses the Supabase client's getPublicUrl — same approach as canvas asset uploads.
 * Returns an empty string when Supabase is not configured.
 *
 * Files live at the root of the "templates" bucket:
 *   fashion_template.png, magazine_template.png, movie_poster_template.png,
 *   y2k_poster_template.jpg, hyper_motion_template.mp4, mock_template.mp4,
 *   tutorial_template.mp4, unboxing_template.mp4
 */
export function getTemplateAssetUrl(filename: string): string {
  const client = getSupabaseBrowserClient();
  if (!client) return '';
  return client.storage.from(BUCKET).getPublicUrl(filename).data.publicUrl;
}
