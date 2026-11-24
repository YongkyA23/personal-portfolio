import { validateContent } from '../../shared/validate.js';
import type { Content } from '../content/types';

/**
 * null = not probed yet, false = no backend (e.g. a static deployment).
 * Once we know there is no backend we stop sending requests that can only fail.
 */
let backend: boolean | null = null;

export const hasBackend = () => backend === true;

async function json(res: Response): Promise<unknown> {
  const type = res.headers.get('content-type') || '';
  if (!res.ok || !type.includes('application/json')) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function fetchContent(signal?: AbortSignal): Promise<Content | null> {
  try {
    const data = await json(await fetch('/api/content', { signal, headers: { accept: 'application/json' } }));
    backend = true;
    return validateContent(data) === null ? (data as Content) : null;
  } catch (err) {
    if (!(err instanceof DOMException && err.name === 'AbortError')) backend = false;
    return null;
  }
}

async function post(path: string, body: unknown, timeoutMs: number): Promise<unknown> {
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(timeoutMs),
  });
  return json(res);
}

/** Asks the live agent. Resolves to null when it is unavailable, so the caller can answer locally. */
export async function askAgent(question: string): Promise<string | null> {
  if (backend !== true) return null;
  try {
    const data = (await post('/api/ask', { question }, 30_000)) as { answer?: unknown };
    return typeof data.answer === 'string' && data.answer ? data.answer : null;
  } catch {
    return null;
  }
}

export async function sendHirePing(): Promise<boolean> {
  if (backend !== true) return false;
  try {
    await post('/api/hire', {}, 10_000);
    return true;
  } catch {
    return false;
  }
}
