// Form editor for the content document. Each section is described by a small field schema,
// and one set of components renders any schema, so a new content field is one line here.
import { useState } from 'react';

export type Obj = Record<string, unknown>;

export type Field =
  | { k: string; label: string; kind: 'text' | 'area'; hint?: string }
  | { k: string; label: string; kind: 'select'; options: readonly string[]; hint?: string }
  /** string[] edited one item per line */
  | { k: string; label: string; kind: 'lines'; hint?: string }
  /** fixed number of strings, e.g. a two-line headline */
  | { k: string; label: string; kind: 'tuple'; n: number; area?: boolean; hint?: string }
  /** fixed number of string[] rows, each one item per line */
  | { k: string; label: string; kind: 'rows'; n: number; hint?: string }
  /** terminal preview lines: [text, 1 bright / 0 dim] */
  | { k: string; label: string; kind: 'term'; hint?: string }
  | { k: string; label: string; kind: 'object'; fields: Field[] }
  | { k: string; label: string; kind: 'list'; fields: Field[]; title: (item: Obj) => string; blank: () => Obj; add: string; hint?: string };

const str = (v: unknown) => (typeof v === 'string' ? v : '');
const strs = (v: unknown) => (Array.isArray(v) ? (v as string[]) : []);
const toLines = (text: string) => text.split('\n');
const tidy = (list: string[]) => list.map((s) => s.trim()).filter(Boolean);
const WIDE = new Set(['area', 'lines', 'tuple', 'rows', 'term', 'object', 'list']);

function Hint({ text }: { text?: string }) {
  return text ? <small className="adm-hint">{text}</small> : null;
}

export function Fields({ fields, value, onChange }: { fields: Field[]; value: Obj; onChange: (next: Obj) => void }) {
  return (
    <div className="adm-grid">
      {fields.map((f) => (
        <div key={f.k} className={WIDE.has(f.kind) ? 'adm-wide' : undefined}>
          <FieldView f={f} v={value[f.k]} set={(x) => onChange({ ...value, [f.k]: x })} />
        </div>
      ))}
    </div>
  );
}

function LinesBox({ value, set, label }: { value: string[]; set: (v: string[]) => void; label: string }) {
  return (
    <textarea
      aria-label={label}
      wrap="off"
      rows={Math.max(3, value.length + 1)}
      value={value.join('\n')}
      onChange={(e) => set(toLines(e.target.value))}
      onBlur={() => set(tidy(value))}
    />
  );
}

function FieldView({ f, v, set }: { f: Field; v: unknown; set: (v: unknown) => void }) {
  switch (f.kind) {
    case 'text':
      return (
        <label className="adm-field">
          <span>{f.label}</span>
          <input value={str(v)} onChange={(e) => set(e.target.value)} />
          <Hint text={f.hint} />
        </label>
      );
    case 'area':
      return (
        <label className="adm-field">
          <span>{f.label}</span>
          <textarea rows={Math.max(3, Math.ceil(str(v).length / 90))} value={str(v)} onChange={(e) => set(e.target.value)} />
          <Hint text={f.hint} />
        </label>
      );
    case 'select':
      return (
        <label className="adm-field">
          <span>{f.label}</span>
          <select value={str(v)} onChange={(e) => set(e.target.value)}>
            {f.options.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
          <Hint text={f.hint} />
        </label>
      );
    case 'lines':
      return (
        <label className="adm-field">
          <span>{f.label}</span>
          <LinesBox label={f.label} value={strs(v)} set={set} />
          <Hint text={f.hint ?? 'One per line.'} />
        </label>
      );
    case 'tuple': {
      const list = strs(v);
      const put = (i: number, x: string) => set(Array.from({ length: f.n }, (_, j) => (j === i ? x : list[j] ?? '')));
      return (
        <fieldset className="adm-field">
          <legend>{f.label}</legend>
          {Array.from({ length: f.n }, (_, i) =>
            f.area ? (
              <textarea key={i} aria-label={`${f.label} ${i + 1}`} rows={2} value={list[i] ?? ''} onChange={(e) => put(i, e.target.value)} />
            ) : (
              <input key={i} aria-label={`${f.label} ${i + 1}`} value={list[i] ?? ''} onChange={(e) => put(i, e.target.value)} />
            ),
          )}
          <Hint text={f.hint} />
        </fieldset>
      );
    }
    case 'rows': {
      const rows = Array.isArray(v) ? (v as string[][]) : [];
      return (
        <fieldset className="adm-field">
          <legend>{f.label}</legend>
          <div className="adm-cols">
            {Array.from({ length: f.n }, (_, i) => (
              <LinesBox
                key={i}
                label={`${f.label} ${i + 1}`}
                value={rows[i] ?? []}
                set={(x) => set(Array.from({ length: f.n }, (_, j) => (j === i ? x : rows[j] ?? [])))}
              />
            ))}
          </div>
          <Hint text={f.hint ?? 'One per line.'} />
        </fieldset>
      );
    }
    case 'term': {
      const lines = Array.isArray(v) ? (v as Array<[string, 0 | 1]>) : [];
      const put = (next: Array<[string, 0 | 1]>) => set(next.length ? next : undefined);
      return (
        <fieldset className="adm-field">
          <legend>{f.label}</legend>
          {lines.map(([text, bright], i) => (
            <div key={i} className="adm-term-row">
              <input aria-label={`Line ${i + 1}`} value={text} onChange={(e) => put(lines.map((l, j) => (j === i ? [e.target.value, l[1]] : l)))} />
              <label className="adm-check">
                <input type="checkbox" checked={bright === 1} onChange={(e) => put(lines.map((l, j) => (j === i ? [l[0], e.target.checked ? 1 : 0] : l)))} />
                Bright
              </label>
              <button type="button" className="adm-btn is-small" onClick={() => put(lines.filter((_, j) => j !== i))}>
                Remove
              </button>
            </div>
          ))}
          <button type="button" className="adm-btn is-small" onClick={() => put([...lines, ['', 0]])}>
            + Add line
          </button>
          <Hint text={f.hint} />
        </fieldset>
      );
    }
    case 'object':
      return <Fields fields={f.fields} value={(v as Obj) ?? {}} onChange={set} />;
    case 'list':
      return <ListEditor f={f} items={Array.isArray(v) ? (v as Obj[]) : []} set={set} />;
  }
}

function ListEditor({ f, items, set }: { f: Extract<Field, { kind: 'list' }>; items: Obj[]; set: (v: Obj[]) => void }) {
  const [open, setOpen] = useState<number | null>(null);
  const move = (i: number, by: number) => {
    const j = i + by;
    if (j < 0 || j >= items.length) return;
    const next = [...items];
    [next[i], next[j]] = [next[j], next[i]];
    set(next);
    setOpen(j);
  };
  const remove = (i: number) => {
    if (!window.confirm(`Delete “${f.title(items[i]) || 'this item'}”?`)) return;
    set(items.filter((_, j) => j !== i));
    setOpen(null);
  };
  return (
    <div className="adm-list-edit">
      {f.label && <h2 className="adm-list-title">{f.label}</h2>}
      <Hint text={f.hint} />
      {items.map((item, i) => (
        <section key={i} className={open === i ? 'adm-item is-open' : 'adm-item'}>
          <button type="button" className="adm-item-head" aria-expanded={open === i} onClick={() => setOpen(open === i ? null : i)}>
            <span className="adm-mono">{String(i + 1).padStart(2, '0')}</span>
            <span className="adm-grow">{f.title(item) || 'Untitled'}</span>
            <span aria-hidden="true">{open === i ? '−' : '+'}</span>
          </button>
          {open === i && (
            <div className="adm-item-body">
              <Fields fields={f.fields} value={item} onChange={(x) => set(items.map((it, j) => (j === i ? x : it)))} />
              <div className="adm-row">
                <button type="button" className="adm-btn is-small" disabled={i === 0} onClick={() => move(i, -1)}>
                  Move up
                </button>
                <button type="button" className="adm-btn is-small" disabled={i === items.length - 1} onClick={() => move(i, 1)}>
                  Move down
                </button>
                <span className="adm-grow" />
                <button type="button" className="adm-btn is-small is-danger" onClick={() => remove(i)}>
                  Delete
                </button>
              </div>
            </div>
          )}
        </section>
      ))}
      <button
        type="button"
        className="adm-btn"
        onClick={() => {
          set([...items, f.blank()]);
          setOpen(items.length);
        }}
      >
        + {f.add}
      </button>
    </div>
  );
}

// ---------- the content schema ----------

const PROFILE: Field[] = [
  { k: 'name', label: 'Name', kind: 'text' },
  { k: 'initials', label: 'Initials', kind: 'text' },
  { k: 'role', label: 'Role', kind: 'text' },
  { k: 'availability', label: 'Availability', kind: 'text' },
  { k: 'location', label: 'Location', kind: 'text' },
  { k: 'tz', label: 'Time zone', kind: 'text' },
  { k: 'email', label: 'Email', kind: 'text' },
  { k: 'cvUrl', label: 'CV link', kind: 'text', hint: 'A path like /Yongky_Anthonychow_CV.pdf or an https:// link.' },
  { k: 'linkedin', label: 'LinkedIn', kind: 'text', hint: 'https:// link' },
  { k: 'github', label: 'GitHub', kind: 'text', hint: 'https:// link' },
  { k: 'kicker', label: 'Kicker', kind: 'text', hint: 'Small line above the headline.' },
  { k: 'headline', label: 'Headline', kind: 'tuple', n: 2, hint: 'Two lines.' },
  { k: 'intro', label: 'Intro', kind: 'area' },
  { k: 'statement', label: 'Statement', kind: 'area' },
  { k: 'about', label: 'About', kind: 'lines', hint: 'One paragraph per line.' },
  {
    k: 'stats',
    label: 'Stats',
    kind: 'list',
    add: 'Add stat',
    title: (s) => `${str(s.value)} ${str(s.label)}`.trim(),
    blank: () => ({ value: '', label: '' }),
    fields: [
      { k: 'value', label: 'Number', kind: 'text' },
      { k: 'label', label: 'Label', kind: 'text' },
    ],
  },
  { k: 'marquee', label: 'Marquee', kind: 'rows', n: 2, hint: 'Two scrolling rows, one word per line.' },
  { k: 'contactHeadline', label: 'Contact headline', kind: 'tuple', n: 2, hint: 'Two lines.' },
  { k: 'secrets', label: 'Flashlight secrets', kind: 'tuple', n: 3, area: true, hint: 'Three hidden lines that show only under the flashlight.' },
];

const PROJECT: Field[] = [
  { k: 'name', label: 'Name', kind: 'text' },
  { k: 'id', label: 'ID', kind: 'text', hint: 'Lowercase letters, digits and dashes. Used in the link to the case study.' },
  { k: 'cat', label: 'Category', kind: 'select', options: ['product', 'internal', 'personal'] },
  { k: 'type', label: 'Preview', kind: 'select', options: ['web', 'phone', 'term'], hint: 'Which mock-up the preview shows.' },
  { k: 'kind', label: 'Kind', kind: 'text', hint: 'e.g. Mobile app with AI assistant' },
  { k: 'status', label: 'Status', kind: 'text', hint: 'e.g. LIVE' },
  { k: 'role', label: 'Role', kind: 'text' },
  { k: 'url', label: 'Website', kind: 'text', hint: 'Bare host like qi-r.me. Empty if not public.' },
  { k: 'desc', label: 'Description', kind: 'area' },
  { k: 'stack', label: 'Stack', kind: 'lines' },
  { k: 'built', label: 'What I built', kind: 'lines' },
  { k: 'how', label: 'How', kind: 'area' },
  { k: 'outcome', label: 'Outcome', kind: 'lines' },
  { k: 'shot', label: 'Screenshot', kind: 'text', hint: 'A tall full-page image, e.g. /previews/qir.webp or an https:// link. Scrolls inside the preview; empty shows the placeholder.' },
  { k: 'lines', label: 'Terminal preview', kind: 'term', hint: 'Only used when Preview is “term”.' },
];

export const TABS: Array<{ id: string; label: string; keys: string[]; fields: Field[] }> = [
  { id: 'profile', label: 'Profile', keys: ['profile'], fields: [{ k: 'profile', label: '', kind: 'object', fields: PROFILE }] },
  {
    id: 'projects',
    label: 'Projects',
    keys: ['projects'],
    fields: [
      {
        k: 'projects',
        label: '',
        kind: 'list',
        add: 'Add project',
        hint: 'Shown on the site in this order.',
        title: (p) => str(p.name),
        blank: () => ({ id: `project-${Date.now().toString(36)}`, cat: 'personal', type: 'web', name: 'New project', kind: '', status: '', role: '', url: '', desc: '', stack: [], built: [], how: '', outcome: [] }),
        fields: PROJECT,
      },
    ],
  },
  {
    id: 'experience',
    label: 'Experience',
    keys: ['experience'],
    fields: [
      {
        k: 'experience',
        label: '',
        kind: 'list',
        add: 'Add experience',
        title: (e) => [str(e.role), str(e.org)].filter(Boolean).join(' · '),
        blank: () => ({ when: '', year: '', role: '', org: '', note: '' }),
        fields: [
          { k: 'role', label: 'Role', kind: 'text' },
          { k: 'org', label: 'Organisation', kind: 'text' },
          { k: 'when', label: 'Period', kind: 'text', hint: 'e.g. FEB 2025 · NOW' },
          { k: 'year', label: 'Year', kind: 'text' },
          { k: 'note', label: 'Note', kind: 'area' },
        ],
      },
    ],
  },
  {
    id: 'stack',
    label: 'Stack',
    keys: ['stack'],
    fields: [
      {
        k: 'stack',
        label: '',
        kind: 'list',
        add: 'Add group',
        hint: 'The first group gets the light chips.',
        title: (g) => str(g.label),
        blank: () => ({ label: 'NEW GROUP', items: [] }),
        fields: [
          { k: 'label', label: 'Group name', kind: 'text' },
          { k: 'items', label: 'Items', kind: 'lines' },
        ],
      },
    ],
  },
  {
    id: 'answers',
    label: 'Answers',
    keys: ['answers', 'fallbackAnswer'],
    fields: [
      {
        k: 'answers',
        label: 'Ask AI answers',
        kind: 'list',
        add: 'Add answer',
        hint: 'What “Ask AI” replies. The first answer whose keywords match the question wins.',
        title: (a) => str(a.match),
        blank: () => ({ match: '', text: '' }),
        fields: [
          { k: 'match', label: 'Keywords', kind: 'text', hint: 'Words separated by |, e.g. empuan|health|women' },
          { k: 'text', label: 'Answer', kind: 'area' },
        ],
      },
      { k: 'fallbackAnswer', label: 'When nothing matches', kind: 'area' },
    ],
  },
];

/** Turns a validator message such as `projects[1].id must…` into `Projects #2 › id must…`. */
export function friendly(message: string): string {
  return message.replace(/(\w+)\[(\d+)\]\.?/g, (_, k: string, i: string) => `${k[0].toUpperCase()}${k.slice(1)} #${Number(i) + 1} › `);
}
