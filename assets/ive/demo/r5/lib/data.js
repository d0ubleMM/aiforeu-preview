// The demo project of the IVE app built into the site: "Orbit", its ten sessions, their
// transcripts (terminal lines and Overview rows from one source) and the canned agent programs
// that play when a session works or a visitor sends an instruction. Everything here is labelled
// demo data in the style of the CLIs; no provider runs.
import { step, say, prompt, cstep, csay, cprompt } from './term.js';

export const WS = { id: 'orbit', name: 'Orbit', color: 'rgb(16, 185, 129)', path: '/Projects/orbit' };
export const PERMISSION = { command: 'npm test', description: 'Run the sign-in checks', project: WS.path };
export const WIDTH = 58;

// Tile and sidebar order of the ten-session board; the first four are the small board.
export const SESSIONS = [
  { id: 'interface', name: 'Build the workspace', cli: 'claude', model: 'sonnet', state: 'running', style: 'claude',
    prompt: 'Add a dark theme toggle to the sidebar. Keep the existing keyboard shortcuts working.',
    files: ['src/components/layout/Sidebar.jsx', 'src/hooks/useTheme.js', 'src/lib/keymap.js', 'src/components/settings/GeneralSettingsPanel.jsx'], pattern: 'useTheme',
    follow: 'Also add ⌘⇧T as the shortcut and mention it in the README.',
    mid: 'One test still fails: the footer snapshot has the old markup.', note: 'All 12 tests pass. Adding the shortcut next.' },
  { id: 'api', name: 'Connect the API', cli: 'codex', model: 'default', state: 'running', style: 'codex',
    prompt: 'Connect the sessions list to the new /api/sessions endpoint and keep the event stream in sync.',
    files: ['src/lib/api.js', 'src/hooks/useWebSocket.js', 'src/state/sessions.js', 'src/lib/cursor.js'], pattern: 'listSessions',
    follow: 'Keep the page after a reconnect.',
    mid: 'The list and the stream disagree on the session shape; the stream sends the full row.', note: 'Both sides use one shape now. Looking at the reconnect path.' },
  { id: 'checks', name: 'Check the sign-in flow', cli: 'claude', model: 'sonnet', state: 'waiting', detail: 'Permission needed', style: 'claude',
    prompt: 'Run the sign-in checks: empty state, expired session, and the return to the workspace.',
    files: ['tests/sign-in.spec.js', 'src/app/routes.js', 'src/app/session.js', 'tests/helpers/sign-in.js'], pattern: 'expired',
    follow: 'Check the redirect after an expired session as well.',
    mid: 'One check still fails: the expired-session case expects a redirect to the workspace.', note: 'All three checks pass. Reading the redirect code next.' },
  { id: 'review', name: 'Review the changes', cli: 'claude', model: 'opus', state: 'done', style: 'claude',
    prompt: 'Review the changed files and call out anything that needs another look.',
    files: ['src/components/layout/Sidebar.jsx', 'src/lib/api.js', 'src/hooks/useWebSocket.js', 'tests/sign-in.spec.js'], pattern: 'TODO',
    follow: 'Look at the reconnect path once more.',
    mid: 'api.js pages with a cursor, but a reconnect still resets the list to page one.', note: 'Sidebar.jsx is fine. Reading the reconnect handler again.' },
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
];
export const FOUR = ['interface', 'api', 'checks', 'review'];
export const FINAL = {
  interface: 'The toggle sits in the sidebar footer and reuses `useTheme`. ⌘⇧T toggles it; the README lists it. All 12 tests pass.',
  checks: 'All three sign-in checks pass: empty state, expired session, and the return to the workspace.',
  api: 'The list and the stream share one session shape. `listSessions()` pages with a cursor and reconnects keep their page.',
  docs: 'README and docs/shortcuts.md describe the toggle and ⌘⇧T; the settings page lists the toggle.',
  migration: 'Migration 0008 adds `sessions.cursor` with a backfill from `created_at`; the dry run applies cleanly.',
  flaky: 'The timeout was racing the redirect. The test now waits for the route; 20 of 20 runs pass.',
  audit: 'Every session start and stop writes an audit entry with the model name; 14 tests pass.',
  review: 'Sidebar.jsx is fine. In api.js the reconnect still resets to page one; worth another look. The decision stays with you.',
  client: 'api.d.ts types every request and the WebSocket events; tsc reports no errors.',
  imports: 'Removed 31 unused imports in 14 files; lint and tests pass.',
};
export const REVIEW_HTML = (() => {
  const CODE = (t) => `<code class="bg-x-hover text-x-ink font-mono text-[12px] px-1 py-0.5 rounded">${t}</code>`;
  const FILE = (f) => `<strong class="font-bold text-x-ink"><button type="button" title="Click to open ${f} in IDE" class="border-0 bg-transparent p-0 font-mono text-[12px] text-x-ink underline decoration-dotted underline-offset-2">${f}</button></strong>`;
  return `<h4 class="text-[12px] font-semibold text-x-accent mt-3 mb-1">Review</h4><ul class="list-disc pl-5 my-1.5 space-y-1 text-x-ink-secondary"><li>${FILE('Sidebar.jsx')}: the toggle reuses ${CODE('useTheme')}; the footer keeps its height. Fine.</li><li>${FILE('api.js')}: ${CODE('listSessions()')} pages with a cursor, but the WebSocket reconnect still resets to page one. Worth another look.</li></ul><p class="my-1.5 text-x-ink/90 leading-6 font-sans">The final decision stays with you.</p>`;
})();

export const LOOP_PATTERN = 'repeated Bash with same input 3 times';
export const LOOP_TOAST = `Loop detected in Check the sign-in flow: ${LOOP_PATTERN}`;
export const LOOP_NUDGE = `⚠️ [W2W] [Commander] Loop detected: ${LOOP_PATTERN}. You appear to be stuck in a repetitive pattern. Stop and try a fundamentally different approach — different tool, different strategy, or ask the user for clarification.`;

/* ── steps: one structure, two renderings (terminal lines and Overview cards) ── */
const idx = (s) => Math.max(0, SESSIONS.findIndex((x) => x.id === s.id));
const vary = (s, base, size) => base + ((idx(s) * 7) % 5) * size;
export const S = (tool, input, result) => ({ tool, input, result });

/** The 26 steps of a session's story: nine, the failing test, three more, then the follow-up's eleven. */
export function stepsOf(s) {
  const [f1, f2, f3, f4] = s.files;
  const n = (b, k) => vary(s, b, k);
  const i = idx(s);
  const search = s.style === 'codex' ? `"${s.pattern}" in src` : `pattern: "${s.pattern}", path: "src"`;
  return {
    first: [
      S('Read', f1, `Read ${n(184, 31)} lines`), S('Search', search, `Found ${n(2, 1)} files`), S('Read', f2, `Read ${n(96, 13)} lines`),
      S('Update', f1, `Added ${n(18, 3)} lines, removed ${n(2, 1)} lines`), S('Bash', 'npm run lint', '0 problems'), S('Read', f3, `Read ${n(58, 9)} lines`),
      S('Update', f2, `Added ${n(6, 2)} lines, removed ${n(3, 1)} lines`), S('Bash', 'npm test', `${n(11, 1)} passed, 1 failed (${(3.4 + i * 0.3).toFixed(1)} s)`),
    ],
    second: [S('Read', f4, `Read ${n(140, 17)} lines`), S('Update', f3, `Added ${n(4, 1)} lines, removed 1 line`), S('Bash', 'npm test', `${n(12, 1)} passed, 0 failed (${(3.1 + i * 0.2).toFixed(1)} s)`)],
    live: [
      S('Read', f4, `Read ${n(140, 17)} lines`), S('Search', search, `Found ${n(3, 1)} files`), S('Update', f4, `Added ${n(9, 2)} lines, removed ${n(2, 1)} lines`),
      S('Update', f1, `Added ${n(2, 1)} lines`), S('Bash', 'npm run lint', '0 problems'), S('Read', f2, `Read ${n(102, 11)} lines`),
      S('Update', f2, `Added ${n(3, 1)} lines, removed 1 line`), S('Bash', 'npm test', `${n(12, 1)} passed, 0 failed (${(3.2 + i * 0.2).toFixed(1)} s)`),
      S('Read', f3, `Read ${n(62, 9)} lines`), S('Update', f3, `Added ${n(1, 1)} line${n(1, 1) === 1 ? '' : 's'}`), S('Bash', 'npm test', `${n(12, 1)} passed, 0 failed (${(3.0 + i * 0.2).toFixed(1)} s)`),
    ],
  };
}

/** Terminal lines of a step, in the session's CLI style. */
export const stepLines = (style, st) => (style === 'codex' ? cstep(`${st.tool} ${st.input}`, st.result) : step(st.tool, st.input, st.result));
export const sayLines = (style, text) => (style === 'codex' ? csay : say)(text.replace(/`/g, ''), WIDTH);
export const promptLines = (style, text) => (style === 'codex' ? cprompt : prompt)(text, WIDTH);

const DESC = { Read: (i) => `Reading ${i}`, Search: (i) => `Searching for ${i.replace(/pattern: |, path: .*|"/g, '')}`, Update: (i) => `Editing ${i}`, Bash: (i) => (i === 'npm test' ? 'Run the test suite' : i === 'npm run lint' ? 'Run the linter' : `Run ${i}`) };
let cardSeq = 0;
/** The Overview card of a step (the app names Search "Grep" and Update "Edit"). */
export function cardOf(st) {
  const tool = st.tool === 'Search' ? 'Grep' : st.tool === 'Update' ? 'Edit' : st.tool;
  const card = { id: `c${++cardSeq}`, tool, description: (DESC[st.tool] || ((i) => i))(st.input), result: st.result };
  if (tool === 'Bash') card.command = st.input; else card.input = st.input.replace(/pattern: "(.*)", path: "(.*)"/, '$1 in $2').replace(/"/g, '');
  return card;
}

/** The first turn (prompt, nine steps, the failing test, the fix, the note) as Overview rows and terminal lines. */
export function history(s, { withFinal = false, withFollow = true } = {}) {
  const st = stepsOf(s);
  const messages = [
    { id: `${s.id}-u1`, role: 'user', text: s.prompt, time: '06:18 PM' },
    { id: `${s.id}-a1`, role: 'assistant', steps: st.first.map(cardOf), text: s.mid, inline: true },
    { id: `${s.id}-a2`, role: 'assistant', steps: st.second.map(cardOf), text: s.note, inline: true },
  ];
  const lines = [
    ...promptLines(s.style, s.prompt), ...st.first.flatMap((x) => stepLines(s.style, x)), ...sayLines(s.style, s.mid),
    ...st.second.flatMap((x) => stepLines(s.style, x)), ...sayLines(s.style, s.note),
  ];
  if (withFollow) {
    messages.push({ id: `${s.id}-u2`, role: 'user', text: s.follow, time: '06:21 PM' });
    lines.push(...promptLines(s.style, s.follow));
    if (withFinal) {
      messages.push({ id: `${s.id}-a3`, role: 'assistant', steps: st.live.map(cardOf), text: FINAL[s.id], inline: true });
      lines.push(...st.live.flatMap((x) => stepLines(s.style, x)), ...sayLines(s.style, FINAL[s.id]));
    }
  }
  return { messages, lines, live: st.live };
}

/* ── canned agent programs: timed events the app plays for a session ── */
const ev = (d, kind, extra = {}) => ({ d, kind, ...extra });
/** The follow-up's steps streaming in, then the final reply. */
export const programLive = (s, from = 0) => [...stepsOf(s).live.slice(from).map((x, k) => ev(k === 0 ? 1.0 : 1.4 + ((idx(s) + k) % 3) * 0.4, 'step', { step: x })), ev(1.6, 'say', { text: FINAL[s.id] }), ev(0.2, 'done')];
/** A fresh instruction from a visitor: read, search, edit, test, reply. */
export function programReply(s, instruction) {
  const [f1, f2] = s.files;
  const words = instruction.replace(/[^\w\s-]/g, '').split(/\s+/).filter((w) => w.length > 3);
  const topic = words[1] || words[0] || s.pattern;
  const search = s.style === 'codex' ? `"${topic}" in src` : `pattern: "${topic}", path: "src"`;
  return [
    ev(1.1, 'step', { step: S('Read', f1, `Read ${vary(s, 184, 31)} lines`) }),
    ev(1.5, 'step', { step: S('Search', search, `Found ${vary(s, 2, 1)} files`) }),
    ev(1.8, 'step', { step: S('Update', f1, `Added ${vary(s, 7, 2)} lines, removed ${vary(s, 1, 1)} line${vary(s, 1, 1) === 1 ? '' : 's'}`) }),
    ev(1.6, 'step', { step: S('Read', f2, `Read ${vary(s, 96, 13)} lines`) }),
    ev(2.2, 'step', { step: S('Bash', 'npm test', `${vary(s, 12, 1)} passed, 0 failed (${(3.1 + idx(s) * 0.2).toFixed(1)} s)`) }),
    ev(1.4, 'say', { text: `Done: ${instruction.replace(/\.$/, '')}. The change is in \`${f1}\`; tests pass.` }),
    ev(0.2, 'done'),
  ];
}
/** After "Allow once": the permitted command runs and the session finishes. */
export const programPermitted = (s) => [ev(0.8, 'step', { step: S('Bash', PERMISSION.command, '3 passed, 0 failed (1.4 s)') }), ev(1.6, 'say', { text: FINAL[s.id] }), ev(0.2, 'done')];
export const programDenied = (s) => [ev(0.6, 'say', { text: `Understood, I won’t run \`${PERMISSION.command}\`. Tell me when I may, or run it yourself.` }), ev(0.2, 'done')];
/** Loop detection: the same test three times, the warning, the corrective turn, a new approach. */
export function programLoop(s) {
  const test = S('Bash', 'npm test', '13 passed, 1 failed\nFAIL tests/sign-in.spec.js › expired session keeps the return path');
  return [
    ev(1.2, 'step', { step: test }), ev(1.4, 'step', { step: test }), ev(0.7, 'toast', { text: LOOP_TOAST }),
    ev(1.6, 'say', { text: 'Still 1 failing check: expired session keeps the return path.' }),
    ev(0.5, 'nudge', { text: LOOP_NUDGE }),
    ev(1.5, 'step', { step: S('Read', 'tests/sign-in.spec.js', 'Read 96 lines. The case expects /sign-in?return=%2Fworkspace.') }),
    ev(1.3, 'step', { step: S('Update', 'src/app/routes.js', 'Added 4 lines, removed 1 line') }),
    ev(1.8, 'step', { step: S('Bash', 'npm test', '14 passed, 0 failed (3.2 s)') }),
    ev(1.4, 'say', { text: 'The router guard now passes the return path to /sign-in; all 14 checks pass.' }), ev(0.2, 'done'),
  ];
}

/** A session name from an instruction, the way Home names a quick session (the first words). */
export const nameFor = (text) => text.trim().split(/\s+/).slice(0, 5).join(' ').replace(/[.,;:!?]$/, '') || 'New session';
export const slugOf = (name) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
