// Module "review" of the IVE app built into the site (lib/app.js): the Code Review as the app has
// it. The sidebar's Review entry (and the Project-tools button with the same `data-nav`) opens the
// working-diff side panel next to the current session; the panel's Fullscreen button opens the
// fullscreen review with Split/Unified views and "Collapse to Sidebar"; Escape closes the
// fullscreen; the panel's X closes the panel. The diff is the Orbit demo diff (lib/review.js);
// its containers are real scrollable DOM. No provider, no backend.
//
// State: state.review = { panel: boolean, full: boolean, view: 'split' | 'unified' };
//        state.reviewOpen mirrors `panel` so the sidebar marks Review as the current place.
// Reacts to: [data-nav="review"], [data-demo-review-close], [data-demo-review-fullscreen],
//        [data-demo-review-view="split|unified"], [data-demo-review-collapse], [data-demo-review-file]
//        (scrolls the open diff to that file), Escape (closes the fullscreen).
import { html } from './dom.js';
import { header, sessionScreen } from './ui.js';
import { queuePanel, replyPending, responding } from './home.js';
import { reviewPanel, reviewFullscreen, FILES } from './review.js';

const R = (st) => st.review || (st.review = { panel: false, full: false, view: 'split' });
const setPanel = (st, open) => { R(st).panel = open; st.reviewOpen = open; };

/** The session screen as the core renders it (lib/app.js renderSession), so the panel sits beside the same view. */
function sessionView(st, ctx, s) {
  const sid = s.id;
  const mode = st.modes[sid] || 'overview';
  const agent = st.agents[sid];
  const secs = agent ? Math.max(0, Math.round(st.clock - agent.started)) : null;
  const q = st.queue[sid];
  const messages = st.msgs[sid] || [];
  const lastGroup = messages[messages.length - 1];
  const after = s.state === 'running'
    ? (lastGroup && lastGroup.role === 'assistant' && lastGroup.steps && lastGroup.steps.length ? responding(secs ?? 0) : replyPending(s.cli))
    : '';
  const focused = st.focus && st.focus.kind === 'term' && st.focus.sid === sid;
  return sessionScreen({
    session: s, mode, messages, terminal: st.terms[sid], cols: ctx.cols(`[data-terminal-slot="${sid}"]`),
    drawerHeight: Math.max(170, Math.min(320, Math.round(ctx.height * 0.34))),
    typed: st.composerTyped[sid] || '', queue: q ? queuePanel({ text: q.text, state: q.state, cli: s.cli }) : null,
    lastSeconds: secs, narrow: ctx.width < 700, after, termFocused: !!focused,
  });
}

/** Scrolls the open diff (fullscreen first, else the panel) to a file's header row. */
function scrollToFile(e, path) {
  const root = e.target.ownerDocument;
  const full = root.querySelector('[data-demo-review-diff]');
  const container = full || root.querySelector('[data-demo-review-panel-diff]');
  if (!container) return;
  const base = path.split('/').pop();
  const rows = Array.from(container.children);
  const row = rows.find((el) => /^diff --git /.test(el.textContent || '') && (el.textContent || '').includes(path)) || rows.find((el) => (el.textContent || '').includes(`b/${path}`) || (el.textContent || '').includes(base));
  if (!row) return;
  const top = row.getBoundingClientRect().top - container.getBoundingClientRect().top + container.scrollTop - 8;
  container.scrollTop = Math.max(0, top);
}

export default {
  id: 'review',

  init(state, env) {
    state.review = { panel: env.route === 'review', full: false, view: 'split' };
    state.reviewOpen = state.review.panel;
  },

  main(state, ctx) {
    const r = R(state);
    // the panel belongs to the session level: Home and Board mark their own nav entry
    state.reviewOpen = r.panel && state.view === 'session';
    if (state.view !== 'session' || !r.panel) return null;
    const s = state.sessions.find((x) => x.id === state.activeId);
    if (!s) return null;
    const sidebarWanted = state.sidebarOpen && ctx.width >= 1000 && ctx.variant !== 'hero' && state.route !== 'attention';
    // a small app window shows the panel alone, like the app's slide-in sidebar below 900 px
    const narrow = ctx.width < 900;
    const main = html`<div class="flex flex-1 min-h-0 min-w-0" data-demo-review-layout="">${narrow ? '' : sessionView(state, ctx, s)}${reviewPanel({ files: FILES, wide: narrow })}</div>`;
    return { main, header: header({ view: 'session', workspace: state.ws, session: s, sidebarOpen: sidebarWanted }) };
  },

  overlays(state, ctx) {
    const r = R(state);
    return r.full ? reviewFullscreen({ files: FILES, view: r.view, workspace: state.ws.id, narrow: ctx.width < 800 }) : '';
  },

  click(e, state, api) {
    const b = e.target && e.target.closest ? e.target.closest('button, [role="button"]') : null;
    if (!b) return false;
    const r = R(state);
    if (b.matches('[data-nav="review"]')) {
      if (r.panel && state.view === 'session') { setPanel(state, false); return true; }
      if (state.view !== 'session' || !state.activeId) api.go('session', state.activeId || 'review');
      setPanel(state, true);
      return true;
    }
    if (b.hasAttribute('data-demo-review-close')) { setPanel(state, false); return true; }
    if (b.hasAttribute('data-demo-review-fullscreen')) { r.full = true; return true; }
    if (b.hasAttribute('data-demo-review-collapse')) { r.full = false; setPanel(state, true); return true; }
    if (b.hasAttribute('data-demo-review-view')) {
      const view = b.getAttribute('data-demo-review-view') === 'unified' ? 'unified' : 'split';
      if (view === r.view) return false;
      r.view = view;
      return true;
    }
    if (b.hasAttribute('data-demo-review-file')) { scrollToFile(e, b.getAttribute('data-demo-review-file')); return false; }
    return false;
  },

  key(e, state) {
    if (e.key === 'Escape' && R(state).full) { R(state).full = false; return true; }
    return false;
  },
};
