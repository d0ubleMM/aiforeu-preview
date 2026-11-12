// Scene "loopdetect": caught going in circles. The agent in "Check the sign-in flow" runs the same
// `npm test` three times with the same failing result; IVE shows "Loop detected in Check the
// sign-in flow: repeated Bash with same input 3 times", and when the turn ends the corrective
// message reaches the agent as its next user turn; the agent reads the spec and edits the route.
// Demo data for the Orbit project; no provider runs. (Doom Loop Detection is on by default in 1.0.17.)
import { script } from '../lib/timeline.js';
import { shell } from '../lib/ui.js';
import { conversationScreen, toast } from '../lib/home.js';

const PATTERN = 'repeated Bash with same input 3 times';
const TOAST = `Loop detected in Check the sign-in flow: ${PATTERN}`;
const NUDGE = `⚠️ [W2W] [Commander] Loop detected: ${PATTERN}. You appear to be stuck in a repetitive pattern. Stop and try a fundamentally different approach — different tool, different strategy, or ask the user for clarification.`;
const WS = { id: 'orbit', name: 'Orbit', color: 'rgb(16, 185, 129)' };
const SID = 'checks';
const sessions = () => [
  { id: 'interface', name: 'Build the workspace', cli: 'claude', model: 'sonnet', state: 'done', age: '1m ago' },
  { id: 'api', name: 'Connect the API', cli: 'codex', model: 'default', state: 'done', age: '1m ago' },
  { id: SID, name: 'Check the sign-in flow', cli: 'claude', model: 'sonnet', state: 'running', age: '1m ago' },
  { id: 'review', name: 'Review the changes', cli: 'claude', model: 'opus', state: 'done', age: '1m ago' },
];
const npmTest = (n) => ({ id: `n${n}`, tool: 'Bash', command: 'npm test', input: 'npm test', description: 'Run the sign-in checks' });

function init() {
  return {
    sessions: sessions(),
    messages: [
      { id: 'u1', role: 'user', text: 'Make the sign-in checks pass: empty state, expired session, and the return to the workspace.', time: '06:20 PM' },
      { id: 'a1', role: 'assistant', running: true, open: false, steps: [npmTest(1)] },
    ],
    toast: false, secs: 3, turnStart: 0,
  };
}
const me = (st) => st.sessions.find((x) => x.id === SID);
const group = (st) => st.messages[st.messages.length - 1];

const s = script();
s.hold(0.6);
// Open the running step so each identical call is visible as it lands.
s.click('.ive-conversation-activity-toggle', { dur: 0.6, offset: { x: 0.3, y: 0.5 }, after: 0.4 }, (st) => { group(st).open = true; });
s.do((st) => { group(st).steps.push(npmTest(2)); });
s.hold(0.9);
s.do((st) => { group(st).steps.push(npmTest(3)); });
s.hold(0.7);
// The backend's detector fires after the third identical call.
s.do((st) => { st.toast = true; });
s.mark('Loop detected');
s.hold(1.7);
// The turn ends; at the idle the warning is typed into the session as the next user turn.
s.do((st) => {
  group(st).running = false;
  st.messages.push({ id: 'r1', role: 'assistant', text: 'Still 1 failing check: expired session keeps the return path.', time: '06:23 PM' });
});
s.hold(0.3);
const nudgeAt = s.t;
s.do((st) => {
  st.messages.push({ id: 'u2', role: 'user', text: NUDGE, time: '06:23 PM' }, { id: 'a2', role: 'assistant', running: true, steps: [] });
  st.turnStart = nudgeAt;
});
s.mark('Corrective turn');
s.hold(1.4);
s.do((st) => { group(st).steps.push({ id: 'd1', tool: 'Read', input: 'tests/sign-in.spec.js' }); });
s.hold(1.0);
s.do((st) => { group(st).steps.push({ id: 'd2', tool: 'Edit', input: 'src/app/routes.js', description: 'Pass the return path to /sign-in' }); });
s.hold(2.4);
// The "Assistant is responding… Ns" chip counts the seconds of the running turn.
const end = s.t;
s.at(0).every(1, end, (st, k, at) => { st.secs = Math.max(0, Math.round(at - st.turnStart)) + (st.turnStart === 0 ? 3 : 0); });
s.at(end);

export default {
  id: 'loopdetect',
  title: 'Caught going in circles',
  script: s.build(),
  poster: (() => { const m = s.build().markers.find((x) => x.label === 'Loop detected'); return m ? m.t + 0.4 : 3; })(),
  fit: { width: 1600, minScale: 0.75 },
  init,
  render(st, ctx) {
    const session = me(st);
    const running = session.state === 'running' && group(st).running;
    return shell({
      sidebar: ctx.width >= 1000, view: 'session', workspace: WS, sessions: st.sessions, activeId: SID,
      main: conversationScreen({ session, messages: st.messages, respondingFor: running ? st.secs : null }),
      overlays: st.toast ? toast(TOAST) : '',
    });
  },
};
