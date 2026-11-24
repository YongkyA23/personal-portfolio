import type { Content } from '../content/types';

/** Keyword answers written by Yongky. Used when the live agent is unavailable. */
export function localAnswer(question: string, content: Content): string {
  for (const entry of content.answers) {
    try {
      if (new RegExp(entry.match, 'i').test(question)) return entry.text;
    } catch {
      /* an invalid pattern is skipped rather than breaking the palette */
    }
  }
  return content.fallbackAnswer;
}
