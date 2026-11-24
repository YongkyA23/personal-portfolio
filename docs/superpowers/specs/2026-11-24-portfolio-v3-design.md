# Portfolio v3: design

Date: 2026-11-24. Owner: Yongky Anthonychow.

## Intent

Turn the approved design canvas "Portfolio v3" into Yongky's real portfolio
site. It is read by recruiters and by prospective clients of his studio,
Turudev Tech. It has to look and behave exactly like the canvas, and Yongky
has to be able to change its content himself without touching code.

The canvas source is the visual spec. It is kept in the repo at
`docs/superpowers/specs/portfolio-v3-canvas.dc.html` (one self-contained
file: a `<style>` block, an HTML template with `{{holes}}`, `<sc-for>` and
`<sc-if>`, and a component class whose `renderVals()` supplies the values).

## Goals

- Same layout, type, colours, copy and motion as the canvas, at desktop
  and at phone width (the canvas already carries its own `max-width: 820px`
  rules).
- All eleven v3 interactions work: inverting custom cursor with labels,
  magnetic buttons, floating project preview, 3D tilt, word-by-word
  statement, sideways experience scroll, scroll-velocity skew, physics stack
  playground, terminal mode, flashlight mode, hold-to-hire. Plus what v2
  already had: intro (first visit only, skippable), command palette, case
  study overlay, text scramble, live preview mock-ups.
- Content (profile, projects, experience, stack, canned answers) comes from
  an API and can be edited on an admin page.
- Things the canvas could not do become real: `⌘K` / `Ctrl K` and the
  backtick key work from anywhere, `Esc` closes the top overlay, a case
  study has its own URL and the Back button closes it.
- No console errors, type-checks clean, unit tests for the pure logic,
  checked in a real browser before it is called done.

## Non-goals

- A visually designed admin. It is a plain, functional page in the same
  dark style.
- A database. Content is one JSON file on the server's disk.
- Sending email. The hire button records a ping; it does not mail anyone.
- Real screenshots or screen recordings (Yongky has not supplied them).
- Analytics, i18n, a blog.

## Anti-goals

- Any visible difference from the canvas that is not listed under
  "Deliberate differences" below.
- Placeholder text such as `[SCREENSHOT]` showing on the public site.
- Yongky's phone number appearing anywhere in the repo or the site.
- A public endpoint that can run up an unbounded Claude API bill.

## Constraints

- Self-hosted on Yongky's own Linux server behind Nginx, run by systemd.
  One Node process serves both the API and the built site.
- Node 20 or newer. The repo is public.
- Work happens on branch `claude/wonderful-carson-og5crz`.

## Approaches

1. **Self-hosted Node server, JSON file storage (chosen by Yongky).** One
   Express process; content in `server/data/content.json`; admin and the
   live AI agent work. Fits how he already deploys. Cost: he runs a server.
2. **Vercel plus a hosted database.** Everything works without a server,
   but needs a database account and credentials, and moves storage off his
   own machine.
3. **Static Vercel site.** Simplest, but no admin and no live agent, which
   drops the "edit content myself" requirement.

Within approach 1, how the markup is ported (my call): the canvas template
is converted mechanically to JSX, keeping each inline style declaration
string verbatim and parsing it to a React style object at runtime through a
memoised helper. Rewriting ~600 lines of inline styles into CSS classes by
hand was rejected because every rewrite is a chance to drift from the
canvas, and exact parity is the main requirement.

## Design

**Stack (my calls).** Vite, React 19, TypeScript (strict) for the site.
Express 5 for the API, plain ES modules. Fonts self-hosted through
`@fontsource-variable/geist` and `geist-mono`, so there is no third-party
request. Vitest for unit tests. Replaces the old Create React App site
entirely, including its committed `build/` folder.

**Content.** `content/content.json` is the seed and is also bundled into
the site, so the page renders instantly and still works if the API is down.
On load the site fetches `/api/content` and swaps it in if it is valid.
`shared/validate.js` checks the shape and is used by both server (before
saving) and client (before trusting a response).

**API.**
- `GET /api/content`: current content (saved file, else the seed).
- `PUT /api/content`: replace content. Needs `Authorization: Bearer
  $ADMIN_TOKEN`. Validated, written atomically.
- `POST /api/hire`: appends `{at, kind}` to `server/data/messages.json`
  (last 500 kept). 5 per hour per IP. Stores no personal data.
- `GET /api/messages`: admin only.
- `POST /api/ask`: `{question}` up to 300 characters. Calls Claude
  (`claude-opus-5-5`, low effort, server-side refusal fallback) with the
  content as the only source of facts. 8 per minute per IP and a global
  daily cap (default 300). Returns 503 when there are no Anthropic
  credentials or the cap is hit; the site then answers from the canned
  answers in the content. Model and cap are env-configurable.
- Helmet with a strict CSP, JSON body limit 300 kB, admin disabled (503)
  when `ADMIN_TOKEN` is unset.

**Site structure.** One `Site` component owns overlay state (intro,
palette, terminal, case study, flashlight, active section) and global keys.
Sections are separate memoised components: Intro, Sidebar, Hero, Marquee,
Statement, Work, Experience, Playground, Contact, Palette, CaseStudy,
Terminal. Pointer and scroll effects run in a single `requestAnimationFrame`
loop that writes to the DOM directly and never sets React state. The
physics simulation runs only while the playground is on screen. The
terminal command interpreter, canned-answer matcher, style parser and
validator are pure functions with unit tests.

**Admin.** `/admin`, loaded as a separate chunk. Token field (kept in
`sessionStorage`), one JSON editor per content section with validation
errors shown inline, Save, and a list of hire pings.

**Reduced motion and touch.** With `prefers-reduced-motion`, the intro,
skew, magnet, tilt and physics are off and the stack shows as a static list.
On touch devices there is no custom cursor or magnet.

**CV.** `public/Yongky_Anthonychow_CV.pdf`, generated from the résumé
Yongky uploaded with the phone number removed (my call). `cvUrl` is a
content field, so he can point it elsewhere.

**Deployment.** `npm run build`, then `npm start` (serves `dist/` and the
API on `PORT`, default 8787). README documents env vars, a systemd unit and
an Nginx server block.

## Deliberate differences from the canvas

1. Canvas-only notes are replaced with true statements: the palette footer
   says where an answer came from; the text under the hire button says what
   actually happened.
2. The `[SCREEN RECORDING OF …]` pill in the case study is removed; the
   animated mock-up stays.
3. Outcome lines that were placeholders (`[USERS OR DOWNLOADS]`,
   `[NUMBER OF APPS CONNECTED]`) are removed from the content.
4. `neofetch` in the terminal derives its numbers from the content instead
   of hard-coding them.
5. Keyboard shortcuts, case-study URLs, focus outlines for keyboard users,
   and the reduced-motion and touch behaviour above are additions.

## How parity is checked (my call)

The canvas cannot be rendered from the repo: it needs the canvas host's
runtime. Parity therefore rests on two things. First, the markup and CSS are
ported mechanically, not retyped, so declarations are identical by
construction. Second, the built site is driven in a real browser
(Playwright, Chromium) at 1440 px and 390 px: screenshots of every section
and every overlay are read for defects, and each interaction is exercised
with assertions (palette, terminal commands, case study, flashlight, hold
button, physics, filter, keyboard shortcuts). Yongky then compares the
running site with the canvas himself; anything he flags is a bug.

## Starting point (my call)

Commit `d5dd88e` on the branch is the base. It already removed the old site
and added the content seed, validator, API server and client libraries,
written before this document. That code is kept, but it is audited against
this document and gets tests as part of the plan; it is not assumed correct.

## CV source

The résumé is the file Yongky uploaded in the session
(`Yongky_Anthonychow_Resume_AI_Builder.docx`), which is not in the repo. Its
only private detail is the phone number; the location line says just
"Jakarta, Indonesia". The phone number is removed, the result is converted
to PDF, and the PDF text is checked for the number before it is committed.

## Left to the builder

File layout inside `src/`, component prop shapes, the exact admin layout,
test selection beyond the pure functions named above, README wording.

## Changes agreed on 2026-11-24 (these override the text above)

Yongky approved the design with two changes and asked for it to be built
through to the end without further check-ins.

1. **Storage is MySQL, not a JSON file.** Driver `mysql2`. Connection from
   `DATABASE_URL` (`mysql://user:pass@host:3306/dbname`). Two tables,
   created on start if missing:
   - `site_content (id TINYINT PRIMARY KEY, body JSON NOT NULL, updated_at
     TIMESTAMP)`, a single row with `id = 1` holding the whole content
     document. One document, because the site always reads and writes it
     whole and the validator already works on that shape.
   - `hire_pings (id BIGINT AUTO_INCREMENT PRIMARY KEY, created_at
     TIMESTAMP)`.
   If the row is missing the API serves the bundled seed. If the database is
   unreachable, `GET /api/content` still serves the seed (the public site
   must not go down with the database), and writes return 503. The
   non-goal "A database" is withdrawn. The storage code sits behind a small
   interface so tests can run it against an in-memory fake.
2. **No live AI agent for now.** `POST /api/ask` and the Anthropic SDK are
   removed. The palette's "Ask AI" answers from the canned answers in the
   content, which Yongky can edit in the admin. A Gemini-backed agent may be
   added later; nothing in this build depends on it. The related anti-goal
   about an unbounded API bill no longer applies.

## Found while building (2026-11-24)

Three canvas defects showed up once the page ran in a real browser and were
fixed in the site; each is a difference from the canvas as drawn:

1. The project preview's host line and title were vertically centred over
   the mock-up, because the preview became a `<button>` in v3 and buttons
   centre their content. They are pinned to the top, as in v2.
2. "Search / ask" in the sidebar wrapped onto two lines. It is now one line
   at 13 px.
3. At phone width the "NAVIGATE" label shared a row with the links and the
   active-link bar floated between them. The label has its own row and the
   bar is hidden there.

An independent review of the finished branch then found eleven issues, all
fixed with tests: a mangled case-study link blanked the page; links to
projects added in the admin were dropped before the content loaded; Back
could reopen an earlier case study; the palette opened behind a case study;
tables were not created if MySQL was down at boot; an answer pattern could
freeze a visitor's tab (patterns are now limited to words, `|`, `.`, `?`,
`-` and `\b`); `cvUrl` accepted `//host` links; dialogs did not trap or
restore focus; the hold button could not be used with assistive technology;
the palette did not announce its selection.
