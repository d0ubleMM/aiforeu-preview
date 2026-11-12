// Scene "start": start with a sentence, queue the next one. A goal is typed on Home and started;
// the new session shows the message, the agent works (steps land); the follow-up is typed into
// the busy composer and Enter queues it (UP NEXT); when the turn ends IVE delivers it (Sent) and
// the agent starts on it. Demo data for the Orbit project; no provider runs.
import { script } from '../lib/timeline.js';
import { shell } from '../lib/ui.js';
import { homeScreen, conversationScreen, queuePanel, homeHeader } from '../lib/home.js';

const GOAL = 'Add a dark theme toggle to the sidebar. Keep the existing keyboard shortcuts working.';
const FOLLOW_UP = 'Also add ⌘⇧T as the shortcut and mention it in the README.';
const NEW_ID = 'demo-session-1';
const NEW_NAME = 'Add a dark theme toggle to';
const WS = { id: 'orbit', name: 'Orbit', color: 'rgb(16, 185, 129)' };
const others = () => [
  { id: 'api', name: 'Connect the API', cli: 'codex', model: 'default', state: 'done', age: '1m ago' },
  { id: 'checks', name: 'Check the sign-in flow', cli: 'claude', model: 'sonnet', state: 'done', age: '1m ago' },
  { id: 'review', name: 'Review the changes', cli: 'claude', model: 'opus', state: 'done', age: '1m ago' },
];

function init() {
  return { view: 'home', homeTyped: '', sessions: others(), messages: [], composerTyped: '', queue: null, pending: false };
}
const me = (st) => st.sessions.find((s) => s.id === NEW_ID);
const group = (st) => st.messages[st.messages.length - 1];

const s = script();
s.hold(0.8);
s.click('[data-home-composer]', { dur: 0.6, offset: { x: 0.2, y: 0.35 }, after: 0.1 });
s.type(GOAL, { cps: 26 }, (st, typed) => { st.homeTyped = typed; });
s.hold(0.4);
s.click('[data-home-start]', { dur: 0.5, after: 0.15 }, (st) => {
  st.view = 'session';
  st.sessions.unshift({ id: NEW_ID, name: NEW_NAME, cli: 'claude', model: 'sonnet', state: 'running', age: 'just now' });
  st.messages.push({ id: 'g1', role: 'user', text: GOAL, time: '06:22 PM' });
  st.pending = true;
  st.homeTyped = '';
});
s.mark('Started');
s.hold(0.9);
s.do((st) => { st.messages.push({ id: 'a1', role: 'assistant', running: true, steps: [{ id: 'h1', tool: 'Read', input: 'src/components/layout/Sidebar.jsx' }] }); });
s.hold(1.0);
s.do((st) => { group(st).steps.push({ id: 'h2', tool: 'Edit', input: 'src/components/layout/Sidebar.jsx', description: 'Add ThemeToggle to the sidebar footer' }); });
s.hold(0.7);
// The composer of the busy session: "Claude is working. Write your next message, Enter queues it."
s.click('form.ive-session-composer textarea', { dur: 0.6, offset: { x: 0.3, y: 0.5 }, after: 0.05 });
s.hold(0.3);
s.type(FOLLOW_UP, { cps: 26 }, (st, typed) => { st.composerTyped = typed; });
s.hold(0.3);
s.do((st) => { st.queue = { text: FOLLOW_UP, state: 'queued' }; st.composerTyped = ''; });
s.mark('Queued');
s.hold(1.0);
// The turn ends; IVE sends the queued message (Sent) and the agent picks it up.
s.do((st) => {
  const g = group(st);
  g.steps.push({ id: 'h3', tool: 'Bash', command: 'npm test', input: 'npm test', description: 'Run the test suite' });
  g.running = false;
  g.text = 'The toggle sits in the sidebar footer and reuses `useTheme`. Existing shortcuts are untouched.';
  g.inline = true;
  st.queue = { text: FOLLOW_UP, state: 'sent' };
});
s.hold(0.6);
s.do((st) => { st.messages.push({ id: 'g2', role: 'user', text: FOLLOW_UP, time: '06:22 PM' }, { id: 'a2', role: 'assistant', running: true, steps: [] }); });
s.mark('Delivered');
s.hold(1.0);
s.do((st) => { group(st).steps.push({ id: 's1', tool: 'Read', input: 'src/lib/keymap.js' }); });
s.hold(1.0);
s.do((st) => { group(st).steps.push({ id: 's2', tool: 'Edit', input: 'src/lib/keymap.js', description: 'Bind ⌘⇧T to toggleTheme' }); });
s.hold(1.6);

export default {
  id: 'start',
  title: 'Start with a sentence',
  script: s.build(),
  poster: (() => { const m = s.build().markers.find((x) => x.label === 'Queued'); return m ? m.t + 0.2 : 12; })(),
  fit: { width: 1600, minScale: 0.75 },
  init,
  render(st, ctx) {
    const sidebar = ctx.width >= 1000;
    if (st.view === 'home') {
      return shell({
        sidebar, view: 'home', workspace: WS, sessions: st.sessions, activeId: null, header: homeHeader(WS),
        main: homeScreen({ typed: st.homeTyped, recent: [st.sessions[1], st.sessions[0], st.sessions[2]], workspace: WS }),
      });
    }
    const session = me(st);
    return shell({
      sidebar, view: 'session', workspace: WS, sessions: st.sessions, activeId: NEW_ID,
      main: conversationScreen({ session, messages: st.messages, typed: st.composerTyped, queue: st.queue ? queuePanel({ ...st.queue, cli: 'claude' }) : null, pending: st.pending }),
    });
  },
};
