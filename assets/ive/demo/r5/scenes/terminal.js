// Scene "terminal": a normal terminal, enhanced. The session "Build the workspace" opens with its
// terminal at full size (the app's drawer bar "Terminal · claude", ⌘J). An instruction is typed
// into the CLI's prompt box, the turn streams in CLI style (⏺ steps, spinner), the prompt
// returns; then "Restore small terminal" shows the same session as Overview (steps and reply)
// with the terminal below. Demo data for the Orbit project; the terminal text is scripted, no
// provider runs.
import { script } from '../lib/timeline.js';
import { shell, sessionScreen } from '../lib/ui.js';
import { terminal, step, say, prompt, spinner } from '../lib/term.js';

const INSTRUCTION = 'Add a dark theme toggle to the sidebar.';
const WS = { id: 'orbit', name: 'Orbit', color: 'rgb(16, 185, 129)' };
const sessions = () => [
  { id: 'interface', name: 'Build the workspace', cli: 'claude', model: 'sonnet', state: 'done', age: '1m ago' },
  { id: 'api', name: 'Connect the API', cli: 'codex', model: 'default', state: 'running', age: '1m ago' },
  { id: 'checks', name: 'Check the sign-in flow', cli: 'claude', model: 'sonnet', state: 'waiting', detail: 'Permission needed', age: '1m ago' },
  { id: 'review', name: 'Review the changes', cli: 'claude', model: 'opus', state: 'done', age: '1m ago' },
];
const EARLIER = [
  ...prompt('What does the sidebar footer render?'),
  ...step('Read', 'src/components/layout/Sidebar.jsx', 'Read 312 lines'),
  ...say('The footer renders ConnectionStatus and CostToday, nothing else.'),
];
const STEPS = [
  { tool: 'Read', input: 'src/components/layout/Sidebar.jsx', result: 'Read 312 lines', description: 'Reading src/components/layout/Sidebar.jsx' },
  { tool: 'Search', input: 'pattern: "useTheme", path: "src"', result: 'Found 2 files', description: 'Searching for useTheme in src', card: { tool: 'Grep', input: 'useTheme in src' } },
  { tool: 'Update', input: 'src/components/layout/Sidebar.jsx', result: 'Added 18 lines, removed 2 lines', description: 'Add ThemeToggle to the sidebar footer', card: { tool: 'Edit', input: 'src/components/layout/Sidebar.jsx' } },
  { tool: 'Bash', input: 'npm test', result: '12 passed, 0 failed (3.1 s)', description: 'Run the test suite', card: { tool: 'Bash', command: 'npm test' } },
];
const REPLY = 'The toggle sits in the sidebar footer and reuses `useTheme`. Existing shortcuts are untouched; all 12 tests pass.';

function init() {
  return {
    sessions: sessions(),
    mode: 'full',
    term: terminal({ style: 'claude', content: EARLIER }),
    messages: [
      { id: 'q1', role: 'user', text: 'What does the sidebar footer render?', time: '06:15 PM' },
      { id: 'a1', role: 'assistant', steps: [{ tool: 'Read', input: 'src/components/layout/Sidebar.jsx', description: 'Reading src/components/layout/Sidebar.jsx' }], text: 'The footer renders `ConnectionStatus` and `CostToday`, nothing else.', inline: true },
    ],
    secs: 0, lastStep: 0,
  };
}
const me = (s) => s.sessions[0];

const s = script();
s.hold(0.6);
s.click('[data-terminal-slot="interface"] .dt', { dur: 0.6, offset: { x: 0.3, y: 0.14 }, after: 0.2 });
s.type(INSTRUCTION, { cps: 26 }, (st, typed) => { st.term.typed = typed; });
s.hold(0.35);
s.do((st) => {
  st.term.content.push(...prompt(INSTRUCTION));
  st.term.typed = '';
  st.term.spinner = spinner(0);
  me(st).state = 'running';
  st.messages.push({ id: 'u2', role: 'user', text: INSTRUCTION, time: '06:21 PM' }, { id: 'a2', role: 'assistant', steps: [], running: true });
  st.secs = 0;
});
const started = s.t;
s.mark('Typed');
// The spinner counts seconds while the turn runs.
const turnEnd = started + 6.9;
s.every(1, turnEnd, (st, k) => { st.secs = k; if (st.term.spinner) st.term.spinner = spinner(k); });
const landStep = (i) => (st) => {
  const d = STEPS[i];
  st.term.content.push(...step(d.tool, d.input, d.result));
  const group = st.messages[st.messages.length - 1];
  group.steps.push({ id: `s${i}`, ...(d.card || { tool: d.tool, input: d.input }), description: d.description, result: d.result });
  st.lastStep = st.secs;
};
s.hold(1.1).do(landStep(0));
s.hold(1.3).do(landStep(1));
s.hold(1.6).do(landStep(2));
s.hold(1.5).do(landStep(3));
s.at(turnEnd).do((st) => {
  st.term.content.push(...say('The toggle sits in the sidebar footer and reuses useTheme. Existing shortcuts are untouched; all 12 tests pass.'));
  st.term.spinner = null;
  me(st).state = 'done';
  const group = st.messages[st.messages.length - 1];
  group.running = false;
  st.messages.push({ id: 'r2', role: 'assistant', text: REPLY, time: '06:21 PM' });
});
s.mark('Reply');
s.hold(0.6);
const POSTER = s.t;
s.hold(0.8);
s.click('button[aria-label="Restore small terminal"]', { dur: 0.9, after: 0.3 }, (st) => { st.mode = 'drawer'; });
s.mark('Overview + terminal');
s.hold(2.6);

export default {
  id: 'terminal',
  title: 'A normal terminal, enhanced',
  script: s.build(),
  poster: POSTER,
  fit: { width: 1600, minScale: 0.75 },
  init,
  /** Live toggles for a visitor: the drawer bar's restore/expand/hide and the composer's terminal button. */
  interact(e, st) {
    const b = e.target.closest('button');
    if (!b) return false;
    const label = b.getAttribute('aria-label') || '';
    if (label === 'Restore small terminal') st.mode = 'drawer';
    else if (label === 'Expand terminal') st.mode = 'full';
    else if (label.startsWith('Hide terminal')) st.mode = 'overview';
    else if (b.hasAttribute('data-demo-terminal-toggle')) st.mode = st.mode === 'overview' ? 'drawer' : 'overview';
    else return false;
    return true;
  },
  render(st, ctx) {
    const sid = me(st);
    const cols = ctx.cols(`[data-terminal-slot="${sid.id}"]`);
    return shell({
      sidebar: ctx.width >= 1000,
      view: 'session', workspace: WS, sessions: st.sessions, activeId: sid.id,
      main: sessionScreen({ session: sid, mode: st.mode, messages: st.messages, terminal: st.term, cols, drawerHeight: Math.min(320, Math.round(ctx.height * 0.34)), lastSeconds: Math.max(0, st.secs - st.lastStep), narrow: ctx.width < 700 }),
    });
  },
};
