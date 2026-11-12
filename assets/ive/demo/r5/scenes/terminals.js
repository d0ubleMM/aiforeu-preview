// Scene "terminals": ten terminals, one board. The Board of Orbit with ten sessions open as
// tiles in the app's Terminal view (cc-terminalBoardMode), every tile a terminal with a
// CLI-style transcript streaming in; status words change (Running → Done), one tile waits for
// a permission that is answered in its terminal (click, Enter), and at the end one tile is
// opened ("Open") to its full-size terminal at Session level. Every terminal's text is scripted
// demo output in the style of the CLIs; no provider runs. Ten is the configuration shown, not a
// limit of the app.
import { script } from '../lib/timeline.js';
import { shell, sessionScreen } from '../lib/ui.js';
import { boardHeader, boardScreen, terminalTile } from '../lib/board.js';
import { terminal, step, say, prompt, cstep, csay, cprompt, spinner, permissionDialog, G, B, D, R } from '../lib/term.js';

const WS = { id: 'orbit', name: 'Orbit', color: 'rgb(16, 185, 129)' };
const WIDTH = 58;

// Tile and sidebar order of the recorded board.
const SESSIONS = [
  { id: 'checks', name: 'Check the sign-in flow', cli: 'claude', model: 'sonnet', state: 'waiting', detail: 'Permission needed', style: 'claude',
    prompt: 'Run the sign-in checks: empty state, expired session, and the return to the workspace.',
    files: ['tests/sign-in.spec.js', 'src/app/routes.js', 'src/app/session.js', 'tests/helpers/sign-in.js'], pattern: 'expired',
    follow: 'Check the redirect after an expired session as well.',
    mid: 'One check still fails: the expired-session case expects a redirect to the workspace.', note: 'All three checks pass. Reading the redirect code next.' },
  { id: 'api', name: 'Connect the API', cli: 'codex', model: 'default', state: 'running', style: 'codex',
    prompt: 'Connect the sessions list to the new /api/sessions endpoint and keep the event stream in sync.',
    files: ['src/lib/api.js', 'src/hooks/useWebSocket.js', 'src/state/sessions.js', 'src/lib/cursor.js'], pattern: 'listSessions',
    follow: 'Keep the page after a reconnect.',
    mid: 'The list and the stream disagree on the session shape; the stream sends the full row.', note: 'Both sides use one shape now. Looking at the reconnect path.' },
  { id: 'docs', name: 'Update the docs', cli: 'claude', model: 'haiku', state: 'running', style: 'claude',
    prompt: 'Update the docs for the theme toggle and the new shortcut.',
    files: ['README.md', 'docs/shortcuts.md', 'docs/settings.md', 'CHANGELOG.md'], pattern: 'shortcut',
    follow: 'Add the toggle to the settings page too.',
    mid: 'The shortcut table in docs/shortcuts.md is out of date; two entries point at old keys.', note: 'Docs updated. Linking the settings page next.' },
  { id: 'migration', name: 'Write the migration', cli: 'claude', model: 'sonnet', state: 'running', style: 'claude',
    prompt: 'Write the migration that adds a cursor column to the sessions table.',
    files: ['db/schema.sql', 'db/migrations/0007_tags.sql', 'db/migrations/0008_sessions_cursor.sql', 'src/lib/db.js'], pattern: 'sessions',
    follow: 'Backfill the cursor from created_at.',
    mid: 'The dry run reports a missing default for sessions.cursor on existing rows.', note: 'The migration applies cleanly in the dry run. Writing the backfill.' },
  { id: 'flaky', name: 'Fix the flaky test', cli: 'codex', model: 'default', state: 'running', style: 'codex',
    prompt: 'Fix the flaky test in tests/sign-in.spec.js. It fails about one run in ten.',
    files: ['tests/sign-in.spec.js', 'src/app/routes.js', 'tests/helpers/wait.js', 'playwright.config.js'], pattern: 'waitFor',
    follow: 'Run it twenty times to be sure.',
    mid: 'The test waits a fixed 500 ms; the redirect sometimes takes longer than that.', note: 'The test now waits for the route itself. Running it in a loop.' },
  { id: 'audit', name: 'Add the audit log', cli: 'claude', model: 'sonnet', state: 'running', style: 'claude',
    prompt: 'Add an audit log entry for every session start and stop.',
    files: ['src/lib/audit.js', 'src/state/sessions.js', 'db/migrations/0009_audit.sql', 'tests/audit.spec.js'], pattern: 'audit',
    follow: 'Include the model name in each entry.',
    mid: 'Session stops are logged twice when a process exits on its own.', note: 'Start and stop write one entry each. Adding the model name.' },
  { id: 'review', name: 'Review the changes', cli: 'claude', model: 'opus', state: 'done', style: 'claude',
    prompt: 'Review the changed files and call out anything that needs another look.',
    files: ['src/components/layout/Sidebar.jsx', 'src/lib/api.js', 'src/hooks/useWebSocket.js', 'tests/sign-in.spec.js'], pattern: 'TODO',
    follow: 'Look at the reconnect path once more.',
    mid: 'api.js pages with a cursor, but a reconnect still resets the list to page one.', note: 'Sidebar.jsx is fine. Reading the reconnect handler again.' },
  { id: 'client', name: 'Type the API client', cli: 'codex', model: 'default', state: 'running', style: 'codex',
    prompt: 'Add TypeScript types for the API client and check them.',
    files: ['src/lib/api.js', 'src/lib/api.d.ts', 'src/lib/types.d.ts', 'tsconfig.json'], pattern: 'export async',
    follow: 'Type the WebSocket events as well.',
    mid: 'tsc reports 6 errors: listSessions returns an untyped cursor.', note: 'tsc is clean for the request functions. Typing the events next.' },
  { id: 'imports', name: 'Clean up the imports', cli: 'codex', model: 'default', state: 'done', style: 'codex',
    prompt: 'Remove unused imports across src and keep the import order consistent.',
    files: ['src/components/chat/Composer.jsx', 'src/components/home/HomeScreen.jsx', 'src/lib/api.js', 'eslint.config.js'], pattern: 'import',
    follow: 'Run the linter once more at the end.',
    mid: '14 files import from the old lib/http path; the linter flags 31 unused names.', note: 'Imports are clean and ordered. One more lint run at the end.' },
  { id: 'interface', name: 'Build the workspace', cli: 'claude', model: 'sonnet', state: 'running', style: 'claude',
    prompt: 'Add a dark theme toggle to the sidebar. Keep the existing keyboard shortcuts working.',
    files: ['src/components/layout/Sidebar.jsx', 'src/hooks/useTheme.js', 'src/lib/keymap.js', 'src/components/settings/GeneralSettingsPanel.jsx'], pattern: 'useTheme',
    follow: 'Also add ⌘⇧T as the shortcut and mention it in the README.',
    mid: 'One test still fails: the footer snapshot has the old markup.', note: 'All 12 tests pass. Adding the shortcut next.' },
];
const FINAL = {
  interface: 'The toggle sits in the sidebar footer and reuses useTheme. ⌘⇧T toggles it; the README lists it. All 12 tests pass.',
  checks: 'All three sign-in checks pass: empty state, expired session, and the return to the workspace.',
  api: 'The list and the stream share one session shape. listSessions() pages with a cursor and reconnects keep their page.',
  docs: 'README and docs/shortcuts.md describe the toggle and ⌘⇧T; the settings page lists the toggle.',
  migration: 'Migration 0008 adds sessions.cursor with a backfill from created_at; the dry run applies cleanly.',
  flaky: 'The timeout was racing the redirect. The test now waits for the route; 20 of 20 runs pass.',
  audit: 'Every session start and stop writes an audit entry with the model name; 14 tests pass.',
  review: 'Sidebar.jsx is fine. In api.js the reconnect still resets to page one; worth another look. The decision stays with you.',
  client: 'api.d.ts types every request and the WebSocket events; tsc reports no errors.',
  imports: 'Removed 31 unused imports in 14 files; lint and tests pass.',
};

// A session's transcript as a list of steps (each a list of lines); counts differ per session.
function transcriptOf(s) {
  const [f1, f2, f3, f4] = s.files;
  const i = SESSIONS.indexOf(s);
  const n = (base, stepSize) => base + ((i * 7) % 5) * stepSize;
  const c = s.style === 'codex';
  const S = c ? (tool, input, result) => cstep(`${tool} ${input}`, result) : step;
  const P = c ? cprompt : prompt;
  const T = c ? csay : say;
  return [
    P(s.prompt, WIDTH),
    S('Read', f1, `Read ${n(184, 31)} lines`),
    S('Search', c ? `"${s.pattern}" in src` : `pattern: "${s.pattern}", path: "src"`, `Found ${n(2, 1)} files`),
    S('Read', f2, `Read ${n(96, 13)} lines`),
    S('Update', f1, `Added ${n(18, 3)} lines, removed ${n(2, 1)} lines`),
    S('Bash', 'npm run lint', '0 problems'),
    S('Read', f3, `Read ${n(58, 9)} lines`),
    S('Update', f2, `Added ${n(6, 2)} lines, removed ${n(3, 1)} lines`),
    S('Bash', 'npm test', `${n(11, 1)} passed, 1 failed (${(3.4 + i * 0.3).toFixed(1)} s)`),
    T(s.mid, WIDTH),
    S('Read', f4, `Read ${n(140, 17)} lines`),
    S('Update', f3, `Added ${n(4, 1)} lines, removed 1 line`),
    S('Bash', 'npm test', `${n(12, 1)} passed, 0 failed (${(3.1 + i * 0.2).toFixed(1)} s)`),
    T(s.note, WIDTH),
    P(s.follow, WIDTH),
    S('Read', f4, `Read ${n(140, 17)} lines`),
    S('Search', c ? `"${s.pattern}" in src` : `pattern: "${s.pattern}", path: "src"`, `Found ${n(3, 1)} files`),
    S('Update', f4, `Added ${n(9, 2)} lines, removed ${n(2, 1)} lines`),
    S('Update', f1, `Added ${n(2, 1)} lines`),
    S('Bash', 'npm run lint', '0 problems'),
    S('Read', f2, `Read ${n(102, 11)} lines`),
    S('Update', f2, `Added ${n(3, 1)} lines, removed 1 line`),
    S('Bash', 'npm test', `${n(12, 1)} passed, 0 failed (${(3.2 + i * 0.2).toFixed(1)} s)`),
    S('Read', f3, `Read ${n(62, 9)} lines`),
    S('Update', f3, `Added ${n(1, 1)} line${n(1, 1) === 1 ? '' : 's'}`),
    S('Bash', 'npm test', `${n(12, 1)} passed, 0 failed (${(3.0 + i * 0.2).toFixed(1)} s)`),
  ];
}
const BACKLOG_STEPS = 14;

function init() {
  const sessions = SESSIONS.map((s) => ({ id: s.id, name: s.name, cli: s.cli, model: s.model, state: s.state, detail: s.detail, age: '1m ago' }));
  const terms = {}, live = {}, since = {};
  for (const s of SESSIONS) {
    const steps = transcriptOf(s);
    const backlog = steps.slice(0, BACKLOG_STEPS).flat();
    live[s.id] = steps.slice(BACKLOG_STEPS);
    if (s.state === 'done') backlog.push(...(s.style === 'codex' ? csay : say)(FINAL[s.id], WIDTH));
    terms[s.id] = terminal({
      style: s.style, content: backlog,
      spinner: s.state === 'running' ? spinner(8, s.style) : null,
      dialog: s.state === 'waiting' ? permissionDialog('npm test', 'Run the sign-in checks') : null,
    });
    since[s.id] = s.state === 'running' ? -7 : null; // spinners show 8 s and up
  }
  return { sessions, terms, live, since, secs: 0, lastStep: {}, open: null, done: {} };
}
const by = (st, id) => st.sessions.find((x) => x.id === id);
const styleOf = (id) => SESSIONS.find((x) => x.id === id).style;
const land = (id) => (st) => { const q = st.live[id]; if (q.length) st.terms[id].content.push(...q.shift()); st.lastStep[id] = st.secs; };
const finish = (id) => (st) => {
  const t = st.terms[id];
  t.content.push(...(styleOf(id) === 'codex' ? csay : say)(FINAL[id], WIDTH));
  t.spinner = null;
  by(st, id).state = 'done';
  st.done[id] = true;
  st.lastStep[id] = st.secs;
};

const s = script();
const END = 14.2;
// Spinners tick once a second while a session works.
s.every(1, END, (st, k) => {
  st.secs = k;
  for (const sess of st.sessions) {
    const t = st.terms[sess.id];
    if (sess.state === 'running' && !t.dialog && st.since[sess.id] != null) t.spinner = spinner(Math.max(1, k - st.since[sess.id]), t.style);
  }
});
const EVENTS = [
  [1.4, 'api'], [1.9, 'audit'], [2.1, 'docs'], [2.3, 'flaky'], [2.7, 'interface'], [3.1, 'client'], [3.4, 'migration'],
  [3.9, 'api'], [4.3, 'docs'], [4.5, 'audit'], [4.9, 'flaky'], [5.2, 'interface'], [5.7, 'client'],
  [6.4, 'docs', 'finish'], [6.9, 'migration'], [7.2, 'api'], [7.6, 'audit'], [8.1, 'flaky'], [8.4, 'interface'],
  [8.9, 'client'], [9.6, 'api'], [9.9, 'migration'], [10.2, 'audit', 'finish'], [12.6, 'flaky'], [13.4, 'flaky', 'finish'],
];
for (const [t, id, what] of EVENTS) s.at(t).do(what === 'finish' ? finish(id) : land(id));

s.at(0.7).mark('Ten terminals');
// The waiting tile: click into its terminal, Enter answers the CLI's own dialog ("1. Yes").
s.at(1.0).click('[data-grid-cell-session="checks"] [data-terminal-slot]', { dur: 0.9, offset: { x: 0.5, y: 0.55 }, after: 0.3 }, (st) => { st.terms.checks.focused = true; });
s.hold(0.1).do((st) => {
  const t = st.terms.checks;
  t.dialog = null;
  t.content.push(`${G}⏺${R} ${B}Bash${R}(npm test)`, `  ${D}⎿  Running…${R}`, '');
  by(st, 'checks').state = 'running';
  by(st, 'checks').detail = '';
  st.since.checks = st.secs;
  t.spinner = spinner(1, 'claude');
});
s.mark('Enter answers the prompt');
s.hold(0.4).moveTo('header.ive-header', { dur: 0.7, offset: { x: 0.55, y: 0.5 } });
s.at(4.6).do((st) => { st.terms.checks.content.push(`  ${D}⎿  3 passed, 0 failed (1.4 s)${R}`, ''); st.lastStep.checks = st.secs; });
s.at(6.0).do(finish('checks'));
// Open one tile: the same terminal at full size, at Session level.
s.at(10.8).click('[data-grid-cell-session="flaky"] button[aria-label="Open Fix the flaky test"]', { dur: 1.0, after: 0 }, (st) => { st.open = 'flaky'; st.terms.flaky.focused = true; });
s.mark('One terminal at full size');
s.hold(0.5).moveTo('[data-terminal-composer]', { dur: 0.8, offset: { x: 0.9, y: 0.3 } });
s.at(END);

export default {
  id: 'terminals',
  title: 'Ten terminals, one board',
  script: s.build(),
  poster: 0.7,
  fit: { width: 2080, minScale: 0.55 },
  init,
  pointerPark: (ctx) => ({ x: 120, y: ctx.height - 290 }),
  render(st, ctx) {
    // The app's own phone layout starts below 768 viewport px (the iframe's width): no sidebar there.
    const showSidebar = ctx.width >= 1000 && ctx.width * (ctx.scale || 1) >= 768;
    if (st.open) {
      const sess = by(st, st.open);
      const cols = ctx.cols(`[data-terminal-slot="${sess.id}"]`);
      return shell({
        sidebar: showSidebar, view: 'session', workspace: WS, sessions: st.sessions, activeId: sess.id,
        main: sessionScreen({ session: sess, mode: 'full', messages: [], terminal: st.terms[sess.id], cols, lastSeconds: Math.max(0, st.secs - (st.lastStep[sess.id] ?? 0)), narrow: ctx.width < 700 }),
      });
    }
    // Five columns on the wide board; narrower stages get fewer columns and scroll through the ten.
    const columns = ctx.width >= 1900 ? 5 : ctx.width >= 1300 ? 3 : ctx.width >= 700 ? 2 : 1;
    const area = ctx.height - 44 - 8;
    const rowMin = columns === 5 ? Math.max(380, Math.floor((area - 4) / 2)) : columns === 3 ? 300 : 280;
    const tileW = (ctx.width - (showSidebar ? 240 : 0) - 8 - (columns - 1) * 4) / columns;
    const fontSize = Math.max(9, Math.min(13, Math.round(tileW / 40)));
    const tiles = st.sessions.map((sess) => terminalTile(sess, st.terms[sess.id], { cols: ctx.cols(`[data-terminal-slot="${sess.id}"]`, fontSize), fontSize }));
    return shell({
      sidebar: showSidebar, view: 'board', workspace: WS, sessions: st.sessions, activeId: 'imports',
      header: boardHeader({ sidebarOpen: showSidebar }),
      main: boardScreen({ tiles, columns, rowMin, colMin: 0 }),
    });
  },
};
