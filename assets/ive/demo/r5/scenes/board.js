// Scene "board": the Board of the Orbit project. Four sessions side by side in Overview tiles:
// two work (steps land, "Assistant is responding…"), "Check the sign-in flow" waits for the
// permission to run `npm test` (the card in its tile), "Review the changes" is done. The
// permission is answered on the board with "Allow once" and every session finishes. Shown dark
// on the site's hero and Why panel. Demo data; no provider runs.
import { script } from '../lib/timeline.js';
import { shell } from '../lib/ui.js';
import { boardHeader, boardScreen, chatTile } from '../lib/board.js';

const WS = { id: 'orbit', name: 'Orbit', color: 'rgb(16, 185, 129)' };
const CODE = (t) => `<code class="bg-x-hover text-x-ink font-mono text-[12px] px-1 py-0.5 rounded">${t}</code>`;
const FILE = (f) => `<strong class="font-bold text-x-ink"><button type="button" title="Click to open ${f} in IDE" class="border-0 bg-transparent p-0 font-mono text-[12px] text-x-ink-secondary underline decoration-x-line-strong underline-offset-2 break-all cursor-pointer hover:text-x-ink">${f}</button></strong>`;
const REVIEW_HTML = `<h4 class="text-[12px] font-semibold text-x-accent mt-3 mb-1">Review</h4><ul class="list-disc pl-5 my-1.5 space-y-1 text-x-ink-secondary"><li>${FILE('Sidebar.jsx')}<span>: the toggle reuses </span>${CODE('useTheme')}<span>; the footer keeps its height. Fine.</span></li><li>${FILE('api.js')}<span>: </span>${CODE('listSessions()')}<span> pages with a cursor, but the WebSocket reconnect still resets to page one. Worth another look.</span></li></ul><p class="my-1.5 text-x-ink/90 leading-6 font-sans">The final decision stays with you.</p>`;
const REVIEW_BRIEF = 'Review - Sidebar.jsx: the toggle reuses useTheme; the footer keeps its height. Fine. - api.js: listSessions() pages with a cursor, but the WebSocket reconnect still resets to page one. Worth another look. The final decision stays with you.';

function init() {
  return {
    sessions: [
      { id: 'interface', name: 'Build the workspace', cli: 'claude', model: 'sonnet', state: 'running', age: '1m ago' },
      { id: 'api', name: 'Connect the API', cli: 'codex', model: 'default', state: 'running', age: '1m ago' },
      { id: 'checks', name: 'Check the sign-in flow', cli: 'claude', model: 'sonnet', state: 'waiting', detail: 'Permission needed', age: '1m ago' },
      { id: 'review', name: 'Review the changes', cli: 'claude', model: 'opus', state: 'done', age: '1m ago' },
    ],
    msgs: {
      interface: [
        { id: 'iu', role: 'user', text: 'Add a dark theme toggle to the sidebar. Keep the existing keyboard shortcuts working.', time: '06:19 PM' },
        { id: 'ia', role: 'assistant', running: true, steps: [
          { id: 'i1', tool: 'Read', input: 'src/components/layout/Sidebar.jsx', description: 'Reading src/components/layout/Sidebar.jsx' },
          { id: 'i2', tool: 'Grep', input: 'useTheme in src', description: 'Searching for useTheme in src' },
          { id: 'i3', tool: 'Edit', input: 'src/components/layout/Sidebar.jsx', description: 'Add ThemeToggle to the sidebar footer' },
        ] },
      ],
      api: [
        { id: 'au', role: 'user', text: 'Connect the sessions list to the new `/api/sessions` endpoint and keep the event stream in sync.', time: '06:20 PM' },
        { id: 'aa', role: 'assistant', running: true, steps: [
          { id: 'a1', tool: 'Read', input: 'src/lib/api.js', description: 'Reading src/lib/api.js' },
          { id: 'a2', tool: 'Edit', input: 'src/lib/api.js', description: 'Add listSessions() with cursor paging' },
        ] },
      ],
      checks: [
        { id: 'cu', role: 'user', text: 'Run the sign-in checks: empty state, expired session, and the return to the workspace.', time: '06:18 PM' },
        { id: 'ca', role: 'assistant', steps: [{ id: 'c1', tool: 'Read', input: 'tests/sign-in.spec.js', description: 'Reading tests/sign-in.spec.js' }], text: 'I’ll run the suite now. It needs your permission for `npm test`.' },
      ],
      review: [
        { id: 'ru', role: 'user', text: 'Review the changed files and call out anything that needs another look.', time: '06:09 PM' },
        { id: 'ra', role: 'assistant', steps: [{ id: 'r1', tool: 'Bash', command: 'git diff --stat', description: 'List the changed files' }], html: REVIEW_HTML, brief: REVIEW_BRIEF },
      ],
    },
    permission: { command: 'npm test', description: 'Run the sign-in checks', project: '/Projects/orbit' },
    secs: 0,
    since: { interface: -3, api: -3, checks: null },
  };
}
const by = (st, id) => st.sessions.find((s) => s.id === id);
const group = (st, id) => st.msgs[id][st.msgs[id].length - 1];

const s = script();
// Clocks for the "Assistant is responding… Ns" chips.
s.every(1, 13.6, (st, k) => { st.secs = k; });
s.hold(0.4).mark('Board');
s.hold(1.2).do((st) => { group(st, 'interface').steps.push({ id: 'i4', tool: 'Bash', command: 'npm test', description: 'Run the test suite' }); st.since.interface = st.secs; });
s.hold(1.0).do((st) => { group(st, 'api').steps.push({ id: 'a3', tool: 'Read', input: 'src/hooks/useWebSocket.js', description: 'Reading src/hooks/useWebSocket.js' }); st.since.api = st.secs; });
s.hold(0.8);
// On wide, short stages (the hero) the waiting tile sits in the second row: scroll it into view first.
s.scroll('[data-terminal-grid]', 4000, { from: 0, dur: 0.7 });
s.click('[data-grid-cell-session="checks"] button[data-choice-kind="allow"]', { dur: 1.0, after: 0.6 }, (st) => {
  st.permission = null;
  by(st, 'checks').state = 'running';
  const g = group(st, 'checks');
  g.running = true;
  g.text = '';
  st.since.checks = st.secs;
});
s.mark('Allow once');
s.hold(0.8).do((st) => { group(st, 'checks').steps.push({ id: 'c2', tool: 'Bash', command: 'npm test', description: 'Run the sign-in checks' }); st.since.checks = st.secs; });
s.hold(1.8).do((st) => {
  by(st, 'interface').state = 'done';
  const g = group(st, 'interface');
  g.running = false; g.count = 5;
  g.text = 'The toggle sits in the sidebar footer and reuses `useTheme`. Existing shortcuts are untouched; all 12 tests pass.';
});
s.hold(1.4).do((st) => {
  by(st, 'checks').state = 'done';
  const g = group(st, 'checks');
  g.running = false; g.count = 3;
  g.text = 'All three sign-in checks pass: empty state, expired session, and the return to the workspace.';
});
s.hold(1.4).do((st) => {
  by(st, 'api').state = 'done';
  const g = group(st, 'api');
  g.running = false; g.count = 3;
  g.text = 'The list and the stream now share one session shape. `listSessions()` pages with a cursor and reconnects keep their page.';
});
s.mark('All done');
s.scroll('[data-terminal-grid]', 0, { from: 4000, dur: 0.8 });
s.moveTo('[data-grid-cell-session="review"]', { dur: 0.8, offset: { x: 0.9, y: 0.86 } });
s.hold(2.2);

export default {
  id: 'board',
  title: 'The board',
  script: s.build(),
  poster: 0.4,
  fit: { width: 1600, minScale: 0.6 },
  init,
  pointerPark: (ctx) => ({ x: ctx.width - 100, y: ctx.height - 200 }),
  render(st, ctx) {
    const hero = ctx.variant === 'hero' || ctx.width / ctx.height > 2.2;
    const columns = ctx.width < 700 ? 1 : 2;
    const rowMin = hero ? Math.max(200, ctx.height - 44 - 8) : columns === 1 ? 420 : 240;
    const tiles = st.sessions.map((sess) => chatTile(sess, {
      messages: st.msgs[sess.id],
      pending: sess.state === 'running' && st.since[sess.id] != null ? Math.max(0, st.secs - st.since[sess.id]) : null,
      permission: sess.id === 'checks' ? st.permission : null,
    }));
    // The app's own phone layout starts below 768 viewport px (the iframe's width): no sidebar there.
    const showSidebar = !hero && ctx.width >= 1000 && ctx.width * (ctx.scale || 1) >= 768;
    return shell({
      sidebar: showSidebar, view: 'board', workspace: WS, sessions: st.sessions, activeId: 'review',
      header: boardHeader({ sidebarOpen: showSidebar }),
      main: boardScreen({ tiles, columns, rowMin }),
    });
  },
};
