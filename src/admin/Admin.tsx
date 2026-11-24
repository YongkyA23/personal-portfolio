import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { validateContent } from '../../shared/validate.js';
import type { Content } from '../content/types';
import './admin.css';

const TABS = [
  { id: 'profile', label: 'Profile', keys: ['profile'] },
  { id: 'projects', label: 'Projects', keys: ['projects'] },
  { id: 'experience', label: 'Experience', keys: ['experience'] },
  { id: 'stack', label: 'Stack', keys: ['stack'] },
  { id: 'answers', label: 'Answers', keys: ['answers', 'fallbackAnswer'] },
] as const;

type TabId = (typeof TABS)[number]['id'] | 'pings';
type Drafts = Record<string, string>;
type Note = { kind: 'ok' | 'error'; text: string } | null;

const pretty = (value: unknown) => JSON.stringify(value, null, 2);

function draftsFrom(content: Content): Drafts {
  const source = content as unknown as Record<string, unknown>;
  const drafts: Drafts = {};
  for (const tab of TABS) {
    drafts[tab.id] = tab.keys.length === 1 ? pretty(source[tab.keys[0]]) : pretty(Object.fromEntries(tab.keys.map((k) => [k, source[k]])));
  }
  return drafts;
}

/** Rebuilds the whole document from the per-tab editors. Throws with the tab name on bad JSON. */
function assemble(drafts: Drafts): unknown {
  const doc: Record<string, unknown> = {};
  for (const tab of TABS) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(drafts[tab.id]);
    } catch (err) {
      throw new Error(`${tab.label}: not valid JSON (${err instanceof Error ? err.message : 'parse error'})`);
    }
    if (tab.keys.length === 1) doc[tab.keys[0]] = parsed;
    else Object.assign(doc, Object.fromEntries(tab.keys.map((k) => [k, (parsed as Record<string, unknown> | null)?.[k]])));
  }
  return doc;
}

async function readError(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as { error?: string };
    if (body.error) return body.error;
  } catch {
    /* fall through */
  }
  return `The server answered ${res.status}.`;
}

/** null = still asking the server, '' = signed out, otherwise the signed-in username. */
type Session = string | null;

function Login({ onIn, notice }: { onIn: (user: string) => void; notice: string }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(notice);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      if (!res.ok) throw new Error(await readError(res));
      onIn(((await res.json()) as { user: string }).user);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error.');
      setPassword('');
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="adm adm-login">
      <form className="adm-card" onSubmit={submit}>
        <h1>Sign in</h1>
        <p className="adm-mono">Portfolio admin</p>
        <label className="adm-field">
          <span>Username</span>
          <input name="username" autoComplete="username" autoCapitalize="none" spellCheck={false} required value={username} onChange={(e) => setUsername(e.target.value)} />
        </label>
        <label className="adm-field">
          <span>Password</span>
          <input name="password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>
        {error && (
          <p className="adm-note is-error" role="alert">
            {error}
          </p>
        )}
        <button type="submit" className="adm-btn is-solid" disabled={busy}>
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
        <a href="/" className="adm-mono">
          ← Back to the site
        </a>
      </form>
    </main>
  );
}

export default function Admin() {
  const [session, setSession] = useState<Session>(null);
  const [ended, setEnded] = useState('');

  useEffect(() => {
    document.title = 'Admin · portfolio';
    fetch('/api/session')
      .then(async (res) => {
        if (res.ok) return setSession(((await res.json()) as { user: string }).user);
        setSession('');
        if (res.status === 503) setEnded(await readError(res));
      })
      .catch(() => {
        setSession('');
        setEnded('Could not reach the server.');
      });
  }, []);

  if (session === null) return <main className="adm"><p className="adm-mono">Loading…</p></main>;
  if (!session) return <Login notice={ended} onIn={(user) => { setEnded(''); setSession(user); }} />;
  return <Editor user={session} onOut={(why) => { setEnded(why); setSession(''); }} />;
}

function Editor({ user, onOut }: { user: string; onOut: (why: string) => void }) {
  const [drafts, setDrafts] = useState<Drafts | null>(null);
  const [saved, setSaved] = useState<Drafts | null>(null);
  const [tab, setTab] = useState<TabId>('profile');
  const [note, setNote] = useState<Note>(null);
  const [busy, setBusy] = useState(false);
  const [pings, setPings] = useState<Array<{ at: string }> | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/content', { signal: controller.signal })
      .then(async (res) => {
        if (!res.ok) throw new Error(await readError(res));
        const initial = draftsFrom((await res.json()) as Content);
        setDrafts(initial);
        setSaved(initial);
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        setNote({ kind: 'error', text: `Could not load the content: ${err instanceof Error ? err.message : 'network error'}` });
      });
    return () => controller.abort();
  }, []);

  const dirty = !!drafts && !!saved && TABS.some((t) => drafts[t.id] !== saved[t.id]);
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  // A 401 means the session cookie expired or was cleared: back to the sign-in screen.
  const signedOut = (res: Response) => {
    if (res.status !== 401) return false;
    onOut('Your session has ended. Sign in again.');
    return true;
  };

  const signOut = async () => {
    if (dirty && !window.confirm('Discard unsaved changes and sign out?')) return;
    await fetch('/api/logout', { method: 'POST' }).catch(() => {});
    onOut('');
  };

  const save = async (e: FormEvent) => {
    e.preventDefault();
    if (!drafts || busy) return;
    let doc: unknown;
    try {
      doc = assemble(drafts);
    } catch (err) {
      setNote({ kind: 'error', text: err instanceof Error ? err.message : 'Invalid JSON.' });
      return;
    }
    const problem = validateContent(doc);
    if (problem) {
      setNote({ kind: 'error', text: `Not saved: ${problem}.` });
      return;
    }
    setBusy(true);
    setNote(null);
    try {
      const res = await fetch('/api/content', {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(doc),
      });
      if (signedOut(res)) return;
      if (!res.ok) throw new Error(await readError(res));
      setSaved(drafts);
      setNote({ kind: 'ok', text: 'Saved. The site shows it on the next page load.' });
    } catch (err) {
      setNote({ kind: 'error', text: `Not saved: ${err instanceof Error ? err.message : 'network error'}` });
    } finally {
      setBusy(false);
    }
  };

  const loadPings = useCallback(async () => {
    setPings(null);
    try {
      const res = await fetch('/api/messages');
      if (signedOut(res)) return;
      if (!res.ok) throw new Error(await readError(res));
      setPings((await res.json()) as Array<{ at: string }>);
      setNote(null);
    } catch (err) {
      setPings([]);
      setNote({ kind: 'error', text: `Could not load pings: ${err instanceof Error ? err.message : 'network error'}` });
    }
  }, [onOut]);

  const openTab = (id: TabId) => {
    setTab(id);
    if (id === 'pings') void loadPings();
  };

  const current = TABS.find((t) => t.id === tab);
  let parseError = '';
  if (drafts && current) {
    try {
      JSON.parse(drafts[current.id]);
    } catch (err) {
      parseError = err instanceof Error ? err.message : 'Invalid JSON';
    }
  }

  return (
    <form className="adm" onSubmit={save}>
      <div className="adm-row">
        <h1 className="adm-grow">Portfolio admin</h1>
        <a href="/">← Back to the site</a>
        <span className="adm-mono">{user}</span>
        <button type="button" className="adm-btn" onClick={signOut}>
          Sign out
        </button>
      </div>

      <div className="adm-row" role="group" aria-label="Sections">
        {TABS.map((t) => (
          <button key={t.id} type="button" className="adm-btn" aria-pressed={tab === t.id} onClick={() => openTab(t.id)}>
            {t.label}
            {drafts && saved && drafts[t.id] !== saved[t.id] ? ' •' : ''}
          </button>
        ))}
        <button type="button" className="adm-btn" aria-pressed={tab === 'pings'} onClick={() => openTab('pings')}>
          Hire pings
        </button>
      </div>

      {note && (
        <p className={note.kind === 'error' ? 'adm-note is-error' : 'adm-note'} role={note.kind === 'error' ? 'alert' : 'status'}>
          {note.text}
        </p>
      )}

      {current && drafts && (
        <>
          <textarea
            aria-label={`${current.label} as JSON`}
            aria-invalid={parseError ? true : undefined}
            spellCheck={false}
            value={drafts[current.id]}
            onChange={(e) => setDrafts({ ...drafts, [current.id]: e.target.value })}
          />
          <div className="adm-row">
            <span className="adm-mono adm-grow">{parseError ? `JSON error: ${parseError}` : dirty ? 'Unsaved changes' : 'No changes'}</span>
            <button type="button" className="adm-btn" disabled={!dirty || busy} onClick={() => saved && setDrafts(saved)}>
              Discard changes
            </button>
            <button type="submit" className="adm-btn is-solid" disabled={!dirty || busy}>
              {busy ? 'Saving…' : 'Save'}
            </button>
          </div>
        </>
      )}
      {current && !drafts && !note && <p className="adm-mono">Loading…</p>}

      {tab === 'pings' && (
        <>
          <p className="adm-mono">Each row is one visitor who held the “Hold to hire” button. Newest first.</p>
          {pings === null ? (
            <p className="adm-mono">Loading…</p>
          ) : pings.length === 0 ? (
            <p className="adm-mono">No pings to show.</p>
          ) : (
            <ul className="adm-list">
              {pings.map((p, i) => (
                <li key={i}>{new Date(p.at).toLocaleString()}</li>
              ))}
            </ul>
          )}
        </>
      )}
    </form>
  );
}
