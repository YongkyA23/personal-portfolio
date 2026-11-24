// The HTTP API and, when a build exists, the site itself.
import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { createHash, timingSafeEqual } from 'node:crypto';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { validateContent } from '../shared/validate.js';

const digest = (value) => createHash('sha256').update(String(value)).digest();

const limiter = (limit, windowMs) =>
  rateLimit({
    windowMs,
    limit,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { error: 'Too many requests. Try again shortly.' },
  });

/**
 * @param {object} options
 * @param {import('./store.js').Store | null} options.store  null when no database is configured.
 * @param {object} options.seed          Content served when nothing is saved or the database is down.
 * @param {string} options.adminToken    Empty string disables the admin routes.
 * @param {string} [options.distDir]     Built site to serve, if it exists.
 * @param {string|number} [options.trustProxy]
 */
export function createApp({ store, seed, adminToken, distDir, trustProxy }) {
  const app = express();
  app.disable('x-powered-by');
  if (trustProxy) app.set('trust proxy', trustProxy);

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          // React writes inline style attributes; there are no inline <style> or <script> tags.
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:'],
          fontSrc: ["'self'"],
          connectSrc: ["'self'"],
          objectSrc: ["'none'"],
          frameAncestors: ["'none'"],
          baseUri: ["'self'"],
          formAction: ["'self'"],
          // Do not force HTTPS for sub-resources: the site must also work over plain HTTP before a certificate is installed.
          upgradeInsecureRequests: null,
        },
      },
    }),
  );
  app.use(express.json({ limit: '300kb' }));

  const requireAdmin = (req, res, next) => {
    if (!adminToken) return res.status(503).json({ error: 'Admin is disabled: set ADMIN_TOKEN on the server.' });
    const header = req.get('authorization') || '';
    const given = header.startsWith('Bearer ') ? header.slice(7) : '';
    if (!given || !timingSafeEqual(digest(given), digest(adminToken))) return res.status(401).json({ error: 'Wrong admin token.' });
    next();
  };

  // Runs a storage call; a missing or failing database becomes a clean 503.
  const withStore = (handler) => async (req, res) => {
    if (!store) return res.status(503).json({ error: 'No database is configured on the server.' });
    try {
      await handler(req, res);
    } catch (err) {
      console.warn(`[db] ${req.method} ${req.path}: ${err?.message || err}`);
      res.status(503).json({ error: 'The database is unavailable. Try again shortly.' });
    }
  };

  const api = express.Router();
  api.use((req, res, next) => {
    res.set('Cache-Control', 'no-store');
    next();
  });

  // The public page must not go down with the database: fall back to the seed.
  api.get('/content', async (req, res) => {
    let content = null;
    if (store) {
      try {
        const saved = await store.getContent();
        const problem = saved ? validateContent(saved) : null;
        if (saved && problem) console.warn(`[content] saved content ignored: ${problem}`);
        else content = saved;
      } catch (err) {
        console.warn(`[db] GET /content: ${err?.message || err}`);
      }
    }
    res.json(content || seed);
  });

  api.put(
    '/content',
    limiter(30, 60_000),
    requireAdmin,
    (req, res, next) => {
      const problem = validateContent(req.body);
      if (problem) return res.status(400).json({ error: problem });
      next();
    },
    withStore(async (req, res) => {
      await store.setContent(req.body);
      res.json({ ok: true });
    }),
  );

  api.get(
    '/messages',
    limiter(60, 60_000),
    requireAdmin,
    withStore(async (req, res) => {
      res.json(await store.listPings());
    }),
  );

  api.post(
    '/hire',
    limiter(5, 60 * 60_000),
    withStore(async (req, res) => {
      await store.addPing();
      res.json({ ok: true });
    }),
  );

  api.use((req, res) => res.status(404).json({ error: 'Not found' }));
  app.use('/api', api);

  if (distDir && existsSync(path.join(distDir, 'index.html'))) {
    app.use('/assets', express.static(path.join(distDir, 'assets'), { immutable: true, maxAge: '1y', fallthrough: false }));
    app.use(express.static(distDir, { index: false, maxAge: '1h' }));
    // Single-page app: every other GET gets the shell.
    app.use((req, res, next) => {
      if (req.method !== 'GET' && req.method !== 'HEAD') return next();
      res.set('Cache-Control', 'no-cache');
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    if (err?.type === 'entity.parse.failed') return res.status(400).json({ error: 'Body is not valid JSON.' });
    if (err?.type === 'entity.too.large') return res.status(413).json({ error: 'Body is too large.' });
    if (err?.status === 404 || err?.statusCode === 404) return res.status(404).end();
    console.error(err);
    res.status(500).json({ error: 'Something went wrong.' });
  });

  return app;
}
