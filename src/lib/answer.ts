import type { Content } from '../content/types';

/** Keyword answers written by Yongky. Used when the live agent is unavailable. */
const MAX_QUESTION = 300;

export function localAnswer(question: string, content: Content): string {
  const asked = question.slice(0, MAX_QUESTION);
  for (const entry of content.answers) {
    try {
      if (new RegExp(entry.match, 'i').test(asked)) return entry.text;
    } catch {
      /* an invalid pattern is skipped rather than breaking the palette */
    }
  }
  return content.fallbackAnswer;
}
