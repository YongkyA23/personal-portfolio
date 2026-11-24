// Entry point: reads the environment, connects storage, starts listening.
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApp } from './app.js';
import { createMysqlStore } from './store.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const port = Number(process.env.PORT) || 8787;
const admin = { user: process.env.ADMIN_USER || '', passwordHash: process.env.ADMIN_PASSWORD_HASH || '' };
const databaseUrl = process.env.DATABASE_URL || '';
const trustProxy = process.env.TRUST_PROXY ? Number(process.env.TRUST_PROXY) || process.env.TRUST_PROXY : undefined;

const seed = JSON.parse(await readFile(path.join(root, 'content', 'content.json'), 'utf8'));

let store = null;
if (databaseUrl) {
  store = createMysqlStore(databaseUrl);
  try {
    await store.init();
    console.log('[portfolio] database ready');
  } catch (err) {
    // Keep serving: reads fall back to the seed and writes answer 503 until the database is back.
    console.warn(`[portfolio] database not reachable yet: ${err.message}`);
  }
} else {
  console.log('[portfolio] DATABASE_URL is not set: serving bundled content, saving is disabled.');
}
if (!admin.user || !admin.passwordHash) console.log('[portfolio] ADMIN_USER or ADMIN_PASSWORD_HASH is not set: the admin page is disabled.');

const app = createApp({ store, seed, admin, distDir: path.join(root, 'dist'), trustProxy });
const server = app.listen(port, () => console.log(`[portfolio] http://localhost:${port}`));

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    server.close(async () => {
      await store?.close().catch(() => {});
      process.exit(0);
    });
  });
}
