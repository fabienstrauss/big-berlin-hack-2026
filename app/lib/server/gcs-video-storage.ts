import { Storage } from '@google-cloud/storage';

import type { VertexVideoOutput } from './providers/vertex';

export type StoredVideoResult = {
  artifactPath?: string;
  artifactUrl?: string;
  warning?: string;
};

let cachedStorage: Storage | null = null;

function getStorageClient() {
  if (cachedStorage) {
    return cachedStorage;
  }

  cachedStorage = new Storage();
  return cachedStorage;
}

function getBucketName() {
  return process.env.GCS_VIDEO_BUCKET;
}

function getSignedUrlTtlSeconds() {
  return Number(process.env.GCS_SIGNED_URL_TTL_SECONDS ?? 86400);
}

function dataUrlToBuffer(dataUrl: string) {
  const separator = dataUrl.indexOf(',');
  if (separator < 0) {
    throw new Error('Invalid data URL payload for video bytes');
  }

  return Buffer.from(dataUrl.slice(separator + 1), 'base64');
}

async function downloadVideoFromUri(uri: string) {
  const response = await fetch(uri);
  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Unable to fetch provider video URI (${response.status}): ${details}`);
  }

  return Buffer.from(await response.arrayBuffer());
}

export async function persistVideoArtifactToGcs(
  jobId: string,
  video: VertexVideoOutput,
): Promise<StoredVideoResult> {
  const bucketName = getBucketName();

  if (!bucketName) {
    return {
      artifactUrl: video.uri,
      warning: 'GCS_VIDEO_BUCKET is not configured; returning provider URI fallback.',
    };
  }

  let bytes: Buffer;

  try {
    if (video.dataUrl) {
      bytes = dataUrlToBuffer(video.dataUrl);
    } else if (video.uri) {
      bytes = await downloadVideoFromUri(video.uri);
    } else {
      return {
        warning: 'Provider returned no dataUrl/URI for video artifact.',
      };
    }
  } catch (error) {
    return {
      artifactUrl: video.uri,
      warning:
        error instanceof Error
          ? `Failed to prepare video bytes for GCS upload: ${error.message}`
          : 'Failed to prepare video bytes for GCS upload.',
    };
  }

  const storage = getStorageClient();
  const artifactPath = `videos/${jobId}.mp4`;
  const mimeType = video.mimeType ?? 'video/mp4';

  try {
    const bucket = storage.bucket(bucketName);
    const file = bucket.file(artifactPath);

    await file.save(bytes, {
      resumable: false,
      metadata: {
        contentType: mimeType,
      },
    });

    const [signedUrl] = await file.getSignedUrl({
      action: 'read',
      expires: Date.now() + getSignedUrlTtlSeconds() * 1000,
    });

    return {
      artifactPath,
      artifactUrl: signedUrl,
    };
  } catch (error) {
    return {
      artifactUrl: video.uri,
      warning:
        error instanceof Error
          ? `GCS upload/signing failed: ${error.message}`
          : 'GCS upload/signing failed.',
    };
  }
}
