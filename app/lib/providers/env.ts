import 'server-only';

export function getRequiredServerEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required server env: ${name}`);
  }

  return value;
}

export function getOptionalServerEnv(name: string) {
  return process.env[name] ?? null;
}
