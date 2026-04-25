import process from 'node:process';
import { execSync } from 'node:child_process';

const baseUrl = process.env.JOBS_BASE_URL ?? 'http://localhost:3000';
const pollDelayMs = Number(process.env.JOBS_POLL_DELAY_MS ?? 7000);
const maxPolls = Number(process.env.JOBS_MAX_POLLS ?? 80);

async function createJob() {
  const response = await fetch(`${baseUrl}/api/jobs`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      mode: 'async',
      type: 'video',
      prompt:
        'A cinematic product showcase for a reusable hydration bottle on a clean desk, soft daylight, 16:9.',
      includeResearch: false,
      brandNotes: 'Primary colors #002B5B and #00B7C2. Premium, concise CTA.',
    }),
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Failed to create job (${response.status}): ${details}`);
  }

  return response.json();
}

async function pollJob(jobId) {
  for (let attempt = 1; attempt <= maxPolls; attempt += 1) {
    const response = await fetch(`${baseUrl}/api/jobs/${jobId}`);

    if (!response.ok) {
      const details = await response.text();
      throw new Error(`Failed to fetch job (${response.status}): ${details}`);
    }

    const payload = await response.json();
    console.log(`poll=${attempt} status=${payload.status}`);

    if (payload.status === 'completed' || payload.status === 'failed') {
      return payload;
    }

    await new Promise((resolve) => setTimeout(resolve, pollDelayMs));
  }

  throw new Error(`Job did not complete within ${maxPolls} polls`);
}

async function main() {
  console.log(`creating async job via ${baseUrl}/api/jobs ...`);
  const created = await createJob();
  console.log(`jobId=${created.jobId} status=${created.status}`);

  const final = await pollJob(created.jobId);
  console.log('\nfinal payload:');
  console.log(JSON.stringify(final, null, 2));

  if (final.artifactUrl) {
    console.log(`\nplayable video URL:\n${final.artifactUrl}`);

    if (process.env.OPEN_VIDEO === '1') {
      try {
        execSync(`open "${final.artifactUrl}"`, { stdio: 'ignore' });
      } catch {
        console.log('Unable to open browser automatically.');
      }
    }
  }

  if (final.status === 'failed') {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
