import { afterEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createApp } from './app.js';
import { createMemoryStore } from './store.js';

const seed = JSON.parse(readFileSync(new URL('../content/content.json', import.meta.url), 'utf8'));
const TOKEN = 'test-token';
const servers = [];

async function start(options) {
  const app = createApp({ seed, adminToken: TOKEN, ...options });
  const server = await new Promise((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
  servers.push(server);
  const base = `http://127.0.0.1:${server.address().port}`;
  return (path, init = {}) => fetch(base + path, init);
}

const put = (body, token = TOKEN) => ({
  method: 'PUT',
  headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
  body: JSON.stringify(body),
});
const auth = { headers: { authorization: `Bearer ${TOKEN}` } };

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

  it('rejects a missing or wrong token', async () => {
    const call = await start({ store: createMemoryStore() });
    expect((await call('/api/content', put(seed, ''))).status).toBe(401);
    expect((await call('/api/content', put(seed, 'nope'))).status).toBe(401);
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

describe('admin switch', () => {
  it('disables admin routes when no token is configured', async () => {
    const call = await start({ store: createMemoryStore(), adminToken: '' });
    expect((await call('/api/content', put(seed, ''))).status).toBe(503);
    expect((await call('/api/messages')).status).toBe(503);
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
    expect((await call('/api/messages')).status).toBe(401);
  });
});

describe('removed and unknown routes', () => {
  it('has no AI endpoint', async () => {
    const call = await start({ store: createMemoryStore() });
    const res = await call('/api/ask', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{"question":"hi"}' });
    expect(res.status).toBe(404);
  });
});
