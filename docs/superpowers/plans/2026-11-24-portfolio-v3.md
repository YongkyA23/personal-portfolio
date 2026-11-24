# Portfolio v3 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the "Portfolio v3" canvas as Yongky's real, self-hosted portfolio with MySQL-backed editable content.

**Architecture:** A Vite + React + TypeScript single-page site whose markup is converted mechanically from the canvas template. One Express process serves the built site and a small JSON API; content is one validated document stored in MySQL, with the bundled seed as fallback.

**Tech Stack:** Vite 8, React 19, TypeScript 7 (strict), Express 5, mysql2, helmet, express-rate-limit, Vitest, Playwright (verification only, pre-installed).

**Spec:** `docs/superpowers/specs/2026-11-24-portfolio-v3-design.md` (the "Changes agreed" section at the end overrides earlier text). Visual spec: `docs/superpowers/specs/portfolio-v3-canvas.dc.html`.

**Execution:** Native, in one session, as Yongky asked for it to be built through to the end without check-ins.

## Global Constraints

- Node >= 20. Branch `claude/wonderful-carson-og5crz`. Repo is public.
- Yongky's phone number must not appear in the repo or the site.
- No placeholder text in square brackets on the public site.
- Inline style declarations from the canvas are kept verbatim (through `sx()`); only the differences listed in the spec are allowed.
- No live AI agent: no `/api/ask`, no `@anthropic-ai/sdk`.
- Server default port 8787. Env: `DATABASE_URL`, `ADMIN_TOKEN`, `PORT`, `TRUST_PROXY`.

## Review Focus

1. Database down or `DATABASE_URL` unset: the public site still loads with seed content; admin saves fail with a clear 503. (Task 1 test.)
2. Admin saves content that would break the page (missing field, duplicate project id, bad regex): rejected with a message naming the field. (Task 1 and 2 tests.)
3. Visitor has `prefers-reduced-motion` or a touch device: no intro wait, no invisible content, stack still readable. (Task 6 browser check.)
4. Deep link to `/#/work/<unknown-id>` or a project removed in admin: site opens normally, no crash. (Task 6 browser check.)
5. Terminal input nobody planned for (empty line, `cat` with no file, `open` with no name, very long line): prints a helpful line, never throws. (Task 2 tests.)

---

### Task 1: Storage and API

**Files:** Create `server/store.js`, `server/app.js`, `server/app.test.js`. Modify `server/index.js` (becomes a thin entry point), `package.json` (add `mysql2`, remove `@anthropic-ai/sdk`).

**Interfaces — Produces:**
- `createMemoryStore(): Store` and `createMysqlStore(databaseUrl: string): Store`, where `Store = { init(): Promise<void>, getContent(): Promise<object|null>, setContent(doc): Promise<void>, addPing(): Promise<void>, listPings(): Promise<Array<{at: string}>>, close(): Promise<void> }`.
- `createApp({ store: Store|null, seed: object, adminToken: string, distDir?: string }): express.Express`.

- [ ] Write `server/app.test.js` (Vitest, app on an ephemeral port, `fetch`): `GET /api/content` returns the seed when the store is empty, returns saved content after a valid `PUT`; `PUT` without or with a wrong token is 401; `PUT` with invalid content is 400 and names the field; admin routes are 503 when `adminToken` is empty; with `store: null` or a store whose methods reject, `GET /api/content` still returns the seed and `PUT`/`POST /api/hire` return 503; `POST /api/hire` then `GET /api/messages` lists one ping; `POST /api/ask` is 404.
- [ ] Run it; expect failures (modules missing).
- [ ] Implement `store.js` (tables `site_content`, `hire_pings` per spec, created in `init()`; pool of 5) and `app.js` (move routes out of `index.js`, drop the ask route and Anthropic code). `index.js` reads env, builds the store, calls `init()` with a logged warning on failure, listens.
- [ ] Run tests; expect pass. Commit.

### Task 2: Pure client logic and its tests

**Files:** Existing `src/lib/css.ts`, `src/lib/terminal.ts`, `src/lib/answer.ts`, `shared/validate.js`. Create `src/lib/lib.test.ts`, `tsconfig.json`, `vite.config.ts`.

- [ ] Tests: `sx` parses camelCase, vendor prefixes (`-webkit-text-stroke` → `WebkitTextStroke`), custom properties kept as written, returns the same object for the same string; `validateContent(seed) === null` and rejects a duplicate id, a `url` with a scheme, an invalid `match` pattern; `runCommand` for `help`, `ls projects`, `cat empuan.md`, `cat` (no file), `open qir` (`openId === 'qir'`, `close`), `open` (no name), `sudo hire yongky` (has a mailto link), `clear`, unknown command, empty input, a 5,000-character line; `localAnswer` matches "roblox" and falls back.
- [ ] Run; fix any failures in the WIP code. Commit.

### Task 3: Site markup, styles and behaviour

**Files:** Create `index.html`, `public/favicon.svg`, `src/main.tsx`, `src/App.tsx`, `src/styles.css`, `src/site/{Site,Intro,Sidebar,Hero,Marquee,Statement,Work,Experience,Playground,Contact,Palette,CaseStudy,Terminal}.tsx`. Existing `src/site/{effects,pointer,Scramble,icons}.ts(x)`, `src/lib/{physics,api,env}.ts`.

- [ ] Convert the canvas template to JSX with the one-off script (holes → expressions, `sc-for` → `map`, `sc-if` → `&&`, `style="…"` → `sx(\`…\`)`), split by section, and stitch each into its component with hand-written logic. `src/styles.css` is the canvas `<style>` block plus font variables, focus outlines, the `.dk-word` rule and the static-chips fallback.
- [ ] Replace hard-coded copy with content fields. Remove `/api/ask` use from `api.ts`; the palette answers with `localAnswer`.
- [ ] Add: global keys (`⌘K`/`Ctrl K`, backtick, `Esc`), case-study URL (`#/work/<id>`, Back closes), scroll lock under full-screen overlays, reduced-motion and touch fallbacks.
- [ ] `npm run build` passes with zero type errors. Commit.

### Task 4: Admin page

**Files:** Create `src/admin/Admin.tsx`, `src/admin/admin.css`. `App.tsx` lazy-loads it at `/admin`.

- [ ] Token field (sessionStorage), tabs Profile / Projects / Experience / Stack / Answers each a JSON editor, client-side `validateContent` before save with the error shown, Save → `PUT /api/content`, a Pings tab from `GET /api/messages`. Build passes. Commit.

### Task 5: CV

- [ ] Strip the phone number from a copy of the uploaded résumé, convert to `public/Yongky_Anthonychow_CV.pdf` with LibreOffice, assert `pdftotext` output contains neither "819" nor "+62". Commit.

### Task 6: Verification in a real browser and against real MySQL

- [ ] Start MySQL in Docker (or MariaDB if the image is unavailable), run the server with `DATABASE_URL` and `ADMIN_TOKEN`, save content through the API, restart the server, confirm it persisted.
- [ ] Playwright script at 1440×900 and 390×844: no console errors or failed requests; screenshot every section and overlay and read them; assert palette open/close and an answer, terminal commands, case study open/next/Back, filter, flashlight, hold-to-hire, physics chips inside the box, keyboard shortcuts, reduced-motion run, unknown case hash.
- [ ] Fix what it finds (superpowers:systematic-debugging), re-run until clean.

### Task 7: Docs and finish

- [ ] README: develop, build, env vars, MySQL setup, systemd unit, Nginx block, how to edit content. Remove dead files. Final `npm test` and `npm run build`, fresh-reviewer pass on the branch diff, fix findings, commit and push.
