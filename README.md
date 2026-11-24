# Yongky Anthonychow — portfolio

A single-page portfolio with a small API behind it. The content (profile,
projects, experience, stack, canned answers) lives in MySQL and is edited on
an admin page; the site itself is React.

- **Site:** Vite, React 19, TypeScript. Source in `src/`.
- **API:** Express 5 in `server/`, storage in MySQL through `mysql2`.
- **Design:** ported from the design canvas kept in
  `docs/superpowers/specs/portfolio-v3-canvas.dc.html`. The design document
  and the implementation plan are next to it in `docs/superpowers/`.

## Run it locally

Needs Node 20 or newer.

```bash
npm install
```

```bash
npm run dev
```

This starts the site on http://localhost:5173 and the API on port 8787.
Without a database the API serves the content bundled in
`content/content.json` and saving is switched off, which is enough for
working on the front end.

To work with saving and the admin page, point it at a MySQL database:

```bash
DATABASE_URL='mysql://portfolio:secret@127.0.0.1:3306/portfolio' ADMIN_USER=admin ADMIN_PASSWORD_HASH="$(echo 'dev-password' | node server/auth.js | cut -d= -f2)" npm run dev
```

The two tables (`site_content`, `contact_messages`) are created on first start.

## Checks

```bash
npm test
```

```bash
npm run build
```

`npm test` runs the unit and API tests (Vitest). `npm run build` type-checks
and writes the production site to `dist/`.

## Editing content

Open `/admin`, sign in with the admin username and password, edit a section and press Save. The session lasts 12 hours; changing the password signs every session out. Pick a
section in the sidebar and edit it as a form: lists such as a project's stack
take one item per line, and projects, experience, stack groups and answers
can be added, reordered and deleted. Anything that would break the page (a
missing field, two projects with the same `id`, an invalid pattern) is
refused with a message naming the item and field. The form fields live in
`src/admin/Form.tsx`. Visitors see the change on their next page load.

Things worth knowing:

- A project's `type` picks its preview mock-up: `web`, `phone` or `term`.
- A project's `url` is a bare host such as `qi-r.me`; leave it empty for
  work that is not public.
- **Answers** are what "Ask AI" in the command palette replies with. `match`
  is a case-insensitive pattern tested against the question: words separated
  by `|`, plus `.`, `?`, `-` and `\b`. Groups and repetition are refused so a
  pattern can never freeze a visitor's browser. First match wins, and `fallbackAnswer` is used when nothing matches. There is no live
  AI model behind it.
- **Messages** lists what visitors sent with the "Start a project" form:
  name, email or WhatsApp, and the brief. Clicking the contact opens a reply.
  The form is limited to 5 messages per hour per address and drops bot
  submissions that fill a hidden field.
- **WhatsApp** on the profile (digits with country code) shows a WhatsApp
  button next to the email; leave it empty to hide it.
- The CV button points at `profile.cvUrl`. The file shipped in
  `public/Yongky_Anthonychow_CV.pdf` has the phone number removed because
  this repository and the site are public.

If the database is ever down, the site keeps working with the bundled
content from `content/content.json`; only saving and the contact form stop.

## Deploy on your own server

Tested with Node 22, MySQL 8.4 and Nginx. MariaDB works too.

1. Create the database and user:

   ```sql
   CREATE DATABASE portfolio CHARACTER SET utf8mb4;
   CREATE USER 'portfolio'@'localhost' IDENTIFIED BY 'a-strong-password';
   GRANT ALL PRIVILEGES ON portfolio.* TO 'portfolio'@'localhost';
   ```

2. Put the code in `/var/www/portfolio`, then install and build:

   ```bash
   npm ci
   ```

   ```bash
   npm run build
   ```

3. Copy `.env.example` to `.env` and fill in `DATABASE_URL`, `ADMIN_USER`
   and `ADMIN_PASSWORD_HASH` (from `echo 'your password' | node server/auth.js`).
   Keep `TRUST_PROXY=1` behind Nginx (`2` when Cloudflare proxies in front of it).
4. Install `deploy/portfolio.service` as a systemd unit and start it:

   ```bash
   sudo systemctl enable --now portfolio
   ```

5. Install `deploy/nginx.conf` as an Nginx site, set your domain in it,
   reload Nginx and add HTTPS with certbot.

To update later: pull, `npm ci`, `npm run build`, then
`sudo systemctl restart portfolio`.

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | `mysql://user:password@host:3306/database`. Unset: bundled content, no saving. |
| `ADMIN_USER` | Username for `/admin`. |
| `ADMIN_PASSWORD_HASH` | scrypt hash of the admin password. Either unset: the admin page is disabled. |
| `PORT` | Port to listen on. Default 8787. |
| `TRUST_PROXY` | Number of reverse proxies in front. `1` behind Nginx. |

## Layout

```
content/content.json   seed content, also bundled into the site
shared/validate.js     content shape check used by server and site
server/                Express app, MySQL store, API tests
src/site/              page sections and overlays
src/lib/               style helper, physics, terminal interpreter, API client
src/admin/             admin page (loaded only at /admin)
deploy/                systemd unit and Nginx site
```
