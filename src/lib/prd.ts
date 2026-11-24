// Turns the contact form, as it is being typed, into a tiny PRD preview.
// Purely cosmetic: nothing here is sent; the brief itself is what reaches the inbox.

export interface PrdDraft {
  title: string;
  client: string;
  replyTo: string;
  problem: string;
  timeline: string;
  size: string;
}

const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s);

// Deadlines in English and Indonesian: "by March", "within 2 weeks", "minggu depan", "3 bulan", "asap".
const TIMELINE =
  /\b(asap|urgent|secepatnya|next (?:week|month)|this (?:week|month)|minggu depan|bulan depan|akhir (?:bulan|tahun)|(?:by|before|within|in|deadline:?|sebelum|dalam) [^.,;\n]{2,28}|\d+\s*(?:days?|weeks?|months?|hari|minggu|bulan))\b/i;

/** The first sentence of the brief, without a leading "I need / we want / build me" style opener. */
function problemOf(message: string): string {
  const body = message.trim().replace(/^(?:hi|hello|halo|hai)\b[^a-z0-9\n]*/i, '');
  return (body.split(/(?<=[.!?])\s|\n/)[0] ?? '').trim();
}

/** A short title from the brief: "We need a booking app for a clinic" → "Booking app for a clinic". */
function titleOf(problem: string): string {
  const t = problem
    .replace(/^(?:i|we)\s+(?:need|want|would like|'d like|are looking for)\s+(?:to build\s+)?/i, '')
    .replace(/^(?:kami|saya|aku)\s+(?:butuh|mau|ingin|perlu)\s+(?:dibuatkan\s+)?/i, '')
    .replace(/^(?:build|make|create|buat|bikin)\s+(?:me\s+|us\s+)?/i, '')
    .replace(/^(?:a|an|the|sebuah)\s+/i, '')
    .replace(/[.!?]+$/, '');
  return t ? clip(t.charAt(0).toUpperCase() + t.slice(1), 44) : '';
}

export function draftPrd(form: { name: string; contact: string; message: string }): PrdDraft {
  const problem = problemOf(form.message);
  const words = form.message.trim() ? form.message.trim().split(/\s+/).length : 0;
  return {
    title: titleOf(problem) || 'Untitled project',
    client: clip(form.name.trim(), 40) || '…',
    replyTo: clip(form.contact.trim(), 40) || '…',
    problem: clip(problem, 120) || '…',
    timeline: form.message.match(TIMELINE)?.[0].trim() ?? 'tbd',
    size: words === 0 ? '…' : words < 25 ? 'quick brief' : words < 80 ? 'solid brief' : 'detailed brief',
  };
}
