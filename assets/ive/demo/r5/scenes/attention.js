// Scene "attention": a board tile waiting for your answer. The session "Check the sign-in flow"
// asks for permission to run `npm test`; the card with "Allow once" sits in its tile on the
// board. A short, quiet loop for the Why panel: the pointer comes to rest on "Allow once".
// Demo data; no provider runs.
import { script } from '../lib/timeline.js';
import { raw } from '../lib/dom.js';
import { shell } from '../lib/ui.js';
import { boardScreen, chatTile } from '../lib/board.js';

const WS = { id: 'orbit', name: 'Orbit', color: 'rgb(16, 185, 129)' };

function init() {
  return {
    sessions: [{ id: 'checks', name: 'Check the sign-in flow', cli: 'claude', model: 'sonnet', state: 'waiting', detail: 'Permission needed', age: '1m ago' }],
    msgs: [
      { id: 'cu', role: 'user', text: 'Run the sign-in checks: empty state, expired session, and the return to the workspace.', time: '06:18 PM' },
      { id: 'ca', role: 'assistant', steps: [{ id: 'c1', tool: 'Read', input: 'tests/sign-in.spec.js', description: 'Reading tests/sign-in.spec.js' }], text: 'I’ll run the suite now. It needs your permission for `npm test`.' },
    ],
    permission: { command: 'npm test', description: 'Run the sign-in checks', project: '/Projects/orbit' },
  };
}

const s = script();
s.hold(0.8);
s.moveTo('[data-grid-cell-session="checks"] button[data-choice-kind="allow"]', { dur: 1.6 });
s.hold(1.0);

export default {
  id: 'attention',
  title: 'A tile waiting for your answer',
  script: s.build(),
  poster: 0,
  fit: { width: 640, minScale: 0.8, maxScale: 1 },
  init,
  pointerPark: (ctx) => ({ x: ctx.width - 60, y: ctx.height - 40 }),
  render(st, ctx) {
    const sess = st.sessions[0];
    return shell({
      sidebar: false, view: 'board', workspace: WS, sessions: st.sessions, activeId: null,
      // No header: the panel is small, and the still is about the tile. The whole height is the tile.
      header: raw(''),
      main: boardScreen({ tiles: chatTile(sess, { messages: st.msgs, permission: st.permission, stick: false }), columns: 1, rowMin: Math.max(200, ctx.height - 8) }),
    });
  },
  // Keep the choices of the permission card in view when the card does not fit whole.
  after(st, root, ctx) {
    const sc = root.querySelector('[data-session-scroll]');
    const choices = root.querySelector('.ive-chat-question-choices');
    if (!sc || !choices) return;
    const max = sc.scrollHeight - sc.clientHeight;
    if (max <= 0) return;
    const delta = (choices.getBoundingClientRect().bottom - sc.getBoundingClientRect().bottom) / (ctx.scale || 1) + 8;
    sc.scrollTop = Math.min(max, Math.max(0, sc.scrollTop + delta));
  },
};
