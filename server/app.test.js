import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createApp } from './app.js';
import { createMemoryStore } from './store.js';
import { checkSession, createSession, hashPassword } from './auth.js';

const seed = JSON.parse(readFileSync(new URL('../content/content.json', import.meta.url), 'utf8'));
const USER = 'admin';
const PASSWORD = 'correct horse battery';
let admin;
let cookie = '';
const servers = [];

beforeAll(async () => {
  admin = { user: USER, passwordHash: await hashPassword(PASSWORD) };
});

const json = (method, body) => ({ method, headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });

/** Starts an app and signs in, so `call` carries the session cookie unless told otherwise. */
async function start(options) {
  const app = createApp({ seed, admin, ...options });
  const server = await new Promise((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
  servers.push(server);
  const base = `http://127.0.0.1:${server.address().port}`;
  const raw = (path, init = {}) => fetch(base + path, init);
  cookie = '';
  const login = await raw('/api/login', json('POST', { username: USER, password: PASSWORD }));
  if (login.ok) cookie = (login.headers.get('set-cookie') || '').split(';')[0];
  return (path, init = {}, signedIn = true) =>
    raw(path, { ...init, headers: { ...(init.headers || {}), ...(signedIn && cookie ? { cookie } : {}) } });
}

const put = (body) => json('PUT', body);
const auth = {};

afterEach(async () => {
  await Promise.all(servers.splice(0).map((s) => new Promise((r) => s.close(r))));
});

describe('content', () => {
  it('serves the seed while nothing is saved', async () => {
    const call = await start({ store: createMemoryStore() });
    const res = await call('/api/content');
    expect(res.status).toBe(200);
    expect((await res.json()).profile.name).toBe(seed.profile.name);
  });

  it('saves valid content and serves it back', async () => {
    const call = await start({ store: createMemoryStore() });
    const next = structuredClone(seed);
    next.profile.availability = 'Fully booked';
    expect((await call('/api/content', put(next))).status).toBe(200);
    expect((await (await call('/api/content')).json()).profile.availability).toBe('Fully booked');
  });

  it('rejects a save without a session or with a forged one', async () => {
    const call = await start({ store: createMemoryStore() });
    expect((await call('/api/content', put(seed), false)).status).toBe(401);
    const forged = { ...put(seed), headers: { ...put(seed).headers, cookie: `ya_admin=${Date.now() + 9e9}.forged` } };
    expect((await call('/api/content', forged, false)).status).toBe(401);
  });

  it('rejects content that would break the page and names the field', async () => {
    const call = await start({ store: createMemoryStore() });
    const bad = structuredClone(seed);
    bad.projects[1].id = bad.projects[0].id;
    const res = await call('/api/content', put(bad));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toContain('projects[1].id');
  });

  it('rejects a body that is not JSON', async () => {
    const call = await start({ store: createMemoryStore() });
    const res = await call('/api/content', { ...put(seed), body: '{nope' });
    expect(res.status).toBe(400);
  });
});

describe('admin login', () => {
  it('signs in with the right username and password and sets an HttpOnly cookie', async () => {
    await start({ store: createMemoryStore() });
    expect(cookie).toMatch(/^ya_admin=/);
    const call = await start({ store: createMemoryStore() });
    const res = await call('/api/session');
    expect(res.status).toBe(200);
    expect((await res.json()).user).toBe(USER);
  });

  it('refuses a wrong password or username with the same message', async () => {
    const call = await start({ store: createMemoryStore() });
    for (const body of [{ username: USER, password: 'nope' }, { username: 'root', password: PASSWORD }, {}]) {
      const res = await call('/api/login', json('POST', body), false);
      expect(res.status).toBe(401);
      expect((await res.json()).error).toBe('Wrong username or password.');
    }
  });

  it('marks the cookie HttpOnly and SameSite=Strict', async () => {
    const app = createApp({ seed, admin, store: createMemoryStore() });
    const server = await new Promise((resolve) => {
      const s = app.listen(0, '127.0.0.1', () => resolve(s));
    });
    servers.push(server);
    const res = await fetch(`http://127.0.0.1:${server.address().port}/api/login`, json('POST', { username: USER, password: PASSWORD }));
    const header = res.headers.get('set-cookie') || '';
    expect(header).toContain('HttpOnly');
    expect(header).toContain('SameSite=Strict');
  });

  it('signs out', async () => {
    const call = await start({ store: createMemoryStore() });
    const res = await call('/api/logout', { method: 'POST' });
    expect(res.headers.get('set-cookie')).toContain('Max-Age=0');
  });

  it('expires sessions and rejects ones signed with another password', () => {
    const now = Date.now();
    const token = createSession('key-a', now);
    expect(checkSession('key-a', token, now)).toBe(true);
    expect(checkSession('key-b', token, now)).toBe(false);
    expect(checkSession('key-a', token, now + 13 * 3600_000)).toBe(false);
  });

  it('disables admin routes when no admin is configured', async () => {
    const call = await start({ store: createMemoryStore(), admin: undefined });
    expect((await call('/api/login', json('POST', { username: USER, password: PASSWORD }), false)).status).toBe(503);
    expect((await call('/api/content', put(seed), false)).status).toBe(503);
    expect((await call('/api/messages', {}, false)).status).toBe(503);
  });
});

describe('database trouble', () => {
  const broken = () => {
    const fail = async () => {
      throw new Error('connect ECONNREFUSED');
    };
    return { init: fail, getContent: fail, setContent: fail, addPing: fail, listPings: fail, close: async () => {} };
  };

  it('keeps the public site up with seed content', async () => {
    for (const store of [null, broken()]) {
      const call = await start({ store });
      const res = await call('/api/content');
      expect(res.status).toBe(200);
      expect((await res.json()).projects.length).toBe(seed.projects.length);
    }
  });

  it('answers writes with 503', async () => {
    for (const store of [null, broken()]) {
      const call = await start({ store });
      expect((await call('/api/content', put(seed))).status).toBe(503);
      expect((await call('/api/hire', { method: 'POST' })).status).toBe(503);
      expect((await call('/api/messages', auth)).status).toBe(503);
    }
  });
});

describe('hire pings', () => {
  it('records a ping that the admin can list', async () => {
    const call = await start({ store: createMemoryStore() });
    expect((await call('/api/hire', { method: 'POST' })).status).toBe(200);
    const res = await call('/api/messages', auth);
    expect(res.status).toBe(200);
    const list = await res.json();
    expect(list).toHaveLength(1);
    expect(Number.isNaN(Date.parse(list[0].at))).toBe(false);
  });

  it('keeps the ping list private', async () => {
    const call = await start({ store: createMemoryStore() });
    expect((await call('/api/messages', {}, false)).status).toBe(401);
  });
});

describe('removed and unknown routes', () => {
  it('has no AI endpoint', async () => {
    const call = await start({ store: createMemoryStore() });
    const res = await call('/api/ask', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{"question":"hi"}' });
    expect(res.status).toBe(404);
  });
});

describe('mysql store recovery', () => {
  it('creates tables on first use when the database was down at boot', async () => {
    const { createLazyInit } = await import('./store.js');
    let attempts = 0;
    const ensure = createLazyInit(async () => {
      attempts += 1;
      if (attempts === 1) throw new Error('connect ECONNREFUSED');
    });
    await expect(ensure()).rejects.toThrow('ECONNREFUSED');
    await expect(ensure()).resolves.toBeUndefined();
    await ensure();
    expect(attempts).toBe(2);
  });
});
