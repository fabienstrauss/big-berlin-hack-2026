import 'server-only';

import { CANVAS_ASSETS_BUCKET, CANVAS_BOARD_ID } from './constants';

function getSupabaseStorageEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error('Missing Supabase env for server storage upload');
  }

  return { url, anonKey };
}

function buildPublicUrl(baseUrl: string, path: string) {
  return `${baseUrl}/storage/v1/object/public/${CANVAS_ASSETS_BUCKET}/${path}`;
}

export async function uploadGeneratedAssetToSupabase(input: {
  bytes: Uint8Array;
  mimeType: string;
  extension: string;
  prefix: string;
}) {
  const { url, anonKey } = getSupabaseStorageEnv();
  const path = `${CANVAS_BOARD_ID}/generated/${input.prefix}-${Date.now()}.${input.extension}`;
  const uploadUrl = `${url}/storage/v1/object/${CANVAS_ASSETS_BUCKET}/${path}`;

  const response = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${anonKey}`,
      apikey: anonKey,
      'Content-Type': input.mimeType,
      'x-upsert': 'true',
    },
    body: Buffer.from(input.bytes),
  });

  if (!response.ok) {
    throw new Error(`Supabase storage upload failed: ${response.status} ${await response.text()}`);
  }

  return {
    path,
    publicUrl: buildPublicUrl(url, path),
  };
}
