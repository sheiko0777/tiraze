import type { AppEnv } from './auth.ts';
export function sameOrigin(request: Request, env: AppEnv): boolean {
  const origin = request.headers.get('origin');
  return (
    origin === new URL(env.APP_URL).origin && request.headers.get('sec-fetch-site') !== 'cross-site'
  );
}
export async function readJson(request: Request, limit = 16384): Promise<unknown> {
  if (!(request.headers.get('content-type') ?? '').startsWith('application/json'))
    throw new Error('json_required');
  if (Number(request.headers.get('content-length')) > limit) throw new Error('payload_too_large');
  const reader = request.body?.getReader();
  if (!reader) throw new Error('body_required');
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > limit) {
        await reader.cancel();
        throw new Error('payload_too_large');
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(size);
  let at = 0;
  for (const c of chunks) {
    bytes.set(c, at);
    at += c.length;
  }
  return JSON.parse(new TextDecoder().decode(bytes));
}
export function response(data: unknown, status = 200) {
  return Response.json(data, { status, headers: { 'Cache-Control': 'no-store' } });
}

/** Drain a small rejected body so the local Workers HTTP bridge can finish its request stream. */
export async function drainRejectedBody(request: Request) {
  const reader = request.body?.getReader();
  if (!reader) return;
  let bytes = 0;
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      bytes += chunk.value.length;
      if (bytes > 16384) {
        await reader.cancel();
        break;
      }
    }
  } catch {
  } finally {
    reader.releaseLock();
  }
}
