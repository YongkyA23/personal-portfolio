import { validateContent } from '../../shared/validate.js';
import type { Content } from '../content/types';

/**
 * null = not probed yet, false = no backend (e.g. a static deployment).
 * Once we know there is no backend we stop sending requests that can only fail.
 */
let backend: boolean | null = null;


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

export type ContactForm = { name: string; contact: string; message: string; website: string };

/** Sends the contact form. Resolves to null on success, otherwise a message to show the visitor. */
export async function sendContact(form: ContactForm): Promise<string | null> {
  if (backend === false) return 'The form is offline on this copy of the site.';
  try {
    const res = await fetch('/api/contact', {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify(form),
      signal: AbortSignal.timeout(10_000),
    });
    if (res.ok) return null;
    if (res.status === 429) return 'Too many messages from this connection. Try again later.';
    const body = (await res.json().catch(() => null)) as { error?: string } | null;
    return body?.error || 'It could not be sent right now.';
  } catch {
    return 'The server could not be reached.';
  }
}
