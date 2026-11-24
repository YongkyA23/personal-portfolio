import { useEffect, useState, type FormEvent } from 'react';
import { validateContent } from '../../shared/validate.js';
import { Fields, TABS, friendly, type Obj } from './Form';
import './admin.css';

type TabId = string;
type Note = { kind: 'ok' | 'error'; text: string } | null;

const pick = (doc: Obj, keys: string[]) => JSON.stringify(keys.map((k) => doc[k]));

type Message = { at: string; name: string; contact: string; message: string };

/** mailto: for an email, wa.me for something that looks like a phone number. */
function replyLink(contact: string): string {
  if (contact.includes('@')) return `mailto:${contact}?subject=${encodeURIComponent('Re: your project')}`;
  const digits = contact.replace(/\D/g, '').replace(/^0/, '62');
  return digits.length >= 8 ? `https://wa.me/${digits}` : `mailto:${contact}`;
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
  const [doc, setDoc] = useState<Obj | null>(null);
  const [saved, setSaved] = useState<Obj | null>(null);
  const [tab, setTab] = useState<TabId>('profile');
  const [note, setNote] = useState<Note>(null);
  const [busy, setBusy] = useState(false);
  const [messages, setMessages] = useState<Message[] | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/content', { signal: controller.signal })
      .then(async (res) => {
        if (!res.ok) throw new Error(await readError(res));
        const initial = (await res.json()) as Obj;
        setDoc(initial);
        setSaved(initial);
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        setNote({ kind: 'error', text: `Could not load the content: ${err instanceof Error ? err.message : 'network error'}` });
      });
    return () => controller.abort();
  }, []);

  const changed = (keys: string[]) => !!doc && !!saved && pick(doc, keys) !== pick(saved, keys);
  const dirty = TABS.some((t) => changed(t.keys));
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
    if (!doc || busy) return;
    const problem = validateContent(doc);
    if (problem) {
      setNote({ kind: 'error', text: `Not saved: ${friendly(problem)}.` });
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
      if (!res.ok) throw new Error(friendly(await readError(res)));
      setSaved(doc);
      setNote({ kind: 'ok', text: 'Saved. The site shows it on the next page load.' });
    } catch (err) {
      setNote({ kind: 'error', text: `Not saved: ${err instanceof Error ? err.message : 'network error'}` });
    } finally {
      setBusy(false);
    }
  };

  const loadMessages = async () => {
    setMessages(null);
    try {
      const res = await fetch('/api/messages');
      if (signedOut(res)) return;
      if (!res.ok) throw new Error(await readError(res));
      setMessages((await res.json()) as Message[]);
      setNote(null);
    } catch (err) {
      setMessages([]);
      setNote({ kind: 'error', text: `Could not load messages: ${err instanceof Error ? err.message : 'network error'}` });
    }
  };

  const openTab = (id: TabId) => {
    setTab(id);
    if (id === 'messages') void loadMessages();
  };

  const current = TABS.find((t) => t.id === tab);

  return (
    <form className="adm-shell" onSubmit={save}>
      <aside className="adm-side">
        <div className="adm-brand">Portfolio admin</div>
        <nav className="adm-nav" aria-label="Sections">
          {TABS.map((t) => (
            <button key={t.id} type="button" aria-current={tab === t.id ? 'page' : undefined} onClick={() => openTab(t.id)}>
              {t.label}
              {changed(t.keys) && <span aria-label="unsaved changes">•</span>}
            </button>
          ))}
          <button type="button" aria-current={tab === 'messages' ? 'page' : undefined} onClick={() => openTab('messages')}>
            Messages
          </button>
        </nav>
        <div className="adm-side-foot">
          <span className="adm-mono">Signed in as {user}</span>
          <a href="/">← Back to the site</a>
          <button type="button" className="adm-btn is-small" onClick={signOut}>
            Sign out
          </button>
        </div>
      </aside>

      <main className="adm adm-main">
      <h1>{current?.label ?? 'Messages'}</h1>

      {note && (
        <p className={note.kind === 'error' ? 'adm-note is-error' : 'adm-note'} role={note.kind === 'error' ? 'alert' : 'status'}>
          {note.text}
        </p>
      )}

      {current && doc && <Fields fields={current.fields} value={doc} onChange={setDoc} />}
      {current && !doc && !note && <p className="adm-mono">Loading…</p>}

      {tab === 'messages' && (
        <>
          <p className="adm-mono">Sent from the “Start a project” form on the site. Newest first.</p>
          {messages === null ? (
            <p className="adm-mono">Loading…</p>
          ) : messages.length === 0 ? (
            <p className="adm-mono">No messages yet.</p>
          ) : (
            <ul className="adm-msgs">
              {messages.map((m, i) => (
                <li key={i}>
                  <div className="adm-row">
                    <strong className="adm-grow">{m.name}</strong>
                    <span className="adm-mono">{new Date(m.at).toLocaleString()}</span>
                  </div>
                  <a href={replyLink(m.contact)} target="_blank" rel="noreferrer">{m.contact}</a>
                  <p>{m.message}</p>
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      {doc && tab !== 'messages' && (
        <div className="adm-bar">
          <span className="adm-mono adm-grow">{dirty ? 'Unsaved changes' : 'No changes'}</span>
          <button type="button" className="adm-btn" disabled={!dirty || busy} onClick={() => {
              if (saved) setDoc(saved);
              setNote(null);
            }}>
            Discard changes
          </button>
          <button type="submit" className="adm-btn is-solid" disabled={!dirty || busy}>
            {busy ? 'Saving…' : 'Save'}
          </button>
        </div>
      )}
      </main>
    </form>
  );
}
