// The IVE app, built into the site: an interactive model of the 1.0.17 interface over the Orbit
// demo project. A visitor navigates Home, Board and sessions, opens tiles, switches terminal and
// Overview, types into a terminal or the composer and gets a canned agent reply, answers a
// permission on the board, opens the Review, the Pipeline editor and the guided task flow
// (modules). Running sessions work on their own in the background. No provider runs; every
// reply is demo data (lib/data.js).
//
// API: createApp({ ctx, route, params }) → { state, render(ctx), click(e), dblclick(e), input(e),
//   key(e), submit(e), tick(dt) }; the handlers return true when the view must re-render.
// Routes (where the app opens): home, board (the small board; ctx.variant 'hero' shows one row),
//   attention (the waiting tile alone), terminals (the ten-tile board in Terminal view),
//   terminal (a session with its terminal at full size), session (a session's Overview),
//   start (Home), loopdetect (the checks session during loop detection), review, pipelines, autofix.
// Modules (lib/mod-*.js) add overlays and views: { id, init(state, env), overlays(state, ctx),
//   main(state, ctx), click(e, state, api), key(e, state, api), tick(state, dt, api) }.
import { html, raw } from './dom.js';
import { shell, header, sessionScreen } from './ui.js';
import { boardHeader, boardScreen, chatTile, terminalTile } from './board.js';
import { homeScreen, queuePanel, toast as toastView, replyPending, responding } from './home.js';
import { terminal, permissionDialog, spinner, colsFor } from './term.js';
import { WS, SESSIONS, FOUR, PERMISSION, REVIEW_HTML, history, stepLines, sayLines, promptLines, cardOf, programLive, programReply, programPermitted, programDenied, programLoop, nameFor } from './data.js';
import review from './mod-review.js';
import pipelines from './mod-pipelines.js';
import flow from './mod-flow.js';

const MODULES = [review, pipelines, flow];
const now = () => '06:2' + String(Math.floor(Date.now() / 60000) % 10) + ' PM';

/* ── initial state per route ── */
function sessionRow(s, state) {
  return { id: s.id, name: s.name, cli: s.cli, model: s.model, state: state ?? s.state, detail: state === 'waiting' || (state == null && s.state === 'waiting') ? s.detail : undefined, age: '1m ago', style: s.style };
}

export function initialState(route, params, ctx) {
  const ten = route === 'terminals';
  const base = ten ? SESSIONS : SESSIONS.filter((s) => FOUR.includes(s.id));
  const st = {
    route, ws: WS, view: 'board', activeId: null, tabs: base.map((s) => s.id),
    sessions: [], msgs: {}, terms: {}, modes: {}, tileViews: {}, terminalBoard: ten,
    homeTyped: '', composerTyped: {}, termTyped: {}, queue: {}, focus: null, agents: {}, clock: 0, toasts: [],
    permission: {}, sidebarOpen: null, defs: Object.fromEntries(SESSIONS.map((s) => [s.id, s])),
  };
  for (const s of base) {
    const loop = route === 'loopdetect' && s.id === 'checks';
    let state = s.state;
    if (route === 'review' && s.id === 'review') state = 'done';
    if (loop) state = 'running';
    st.sessions.push(sessionRow(s, state));
    if (loop) {
      // The checks session during loop detection: one failing test so far, the detector about to fire.
      const u = 'Make the sign-in checks pass: empty state, expired session, and the return to the workspace.';
      const first = { tool: 'Bash', input: 'npm test', result: '13 passed, 1 failed\nFAIL tests/sign-in.spec.js › expired session keeps the return path' };
      st.msgs[s.id] = [{ id: 'l-u1', role: 'user', text: u, time: '06:20 PM' }, { id: 'l-a1', role: 'assistant', running: true, open: true, steps: [cardOf(first)] }];
      st.terms[s.id] = terminal({ style: s.style, content: [...promptLines(s.style, u), ...stepLines(s.style, first)], spinner: spinner(3, s.style) });
      st.agents[s.id] = { events: programLoop(s), at: 1.2, started: -3 };
      continue;
    }
    const h = history(s, { withFinal: state === 'done' });
    st.msgs[s.id] = h.messages;
    if (s.id === 'review' && state === 'done') { const last = h.messages[h.messages.length - 1]; last.html = REVIEW_HTML; last.text = ''; last.brief = 'Review: Sidebar.jsx is fine; api.js resets to page one on reconnect, worth another look.'; }
    st.terms[s.id] = terminal({ style: s.style, content: h.lines, spinner: state === 'running' ? spinner(4, s.style) : null, dialog: state === 'waiting' ? permissionDialog(PERMISSION.command, PERMISSION.description) : null });
    if (state === 'running') {
      st.msgs[s.id].push({ id: `${s.id}-a3`, role: 'assistant', running: true, steps: [] });
      st.agents[s.id] = { events: programLive(s), at: 0.6 + (SESSIONS.indexOf(s) % 4) * 0.5, started: -4 };
    }
    if (state === 'waiting') st.permission[s.id] = { ...PERMISSION };
  }
  switch (route) {
    case 'home': case 'start': st.view = 'home'; break;
    case 'terminal': st.view = 'session'; st.activeId = 'interface'; st.modes.interface = 'full'; break;
    case 'session': st.view = 'session'; st.activeId = params.get('sid') || 'interface'; break;
    case 'loopdetect': st.view = 'session'; st.activeId = 'checks'; break;
    case 'review': st.view = 'session'; st.activeId = 'review'; break;
    case 'attention': st.view = 'board'; st.tabs = ['checks']; break;
    case 'autofix': case 'pipelines': st.view = 'home'; break;
    default: st.view = 'board';
  }
  for (const id of st.tabs) if (ten) st.tileViews[id] = 'terminal';
  return st;
}

/* ── the app ── */
export function createApp({ ctx, route = 'board', params = new URLSearchParams() }) {
  const state = initialState(route, params, ctx);
  const api = {
    now, ctx,
    session: (sid) => state.sessions.find((s) => s.id === sid),
    def: (sid) => state.defs[sid],
    go(view, sid = null) {
      state.view = view;
      if (sid) { state.activeId = sid; if (!state.tabs.includes(sid)) state.tabs.push(sid); }
      state.focus = null;
      if (ctx.width < 1000) state.sidebarOpen = false;
    },
    setState(sid, s) { const row = api.session(sid); if (row) { row.state = s; if (s !== 'waiting') row.detail = undefined; } },
    addSession(row, { messages = [], lines = [] } = {}) {
      state.sessions.unshift({ age: 'just now', ...row });
      state.msgs[row.id] = messages;
      state.terms[row.id] = terminal({ style: row.style || (row.cli === 'codex' ? 'codex' : 'claude'), content: lines });
      state.defs[row.id] = state.defs[row.id] || { ...SESSIONS[0], id: row.id, name: row.name, cli: row.cli, model: row.model, style: row.style || 'claude', prompt: messages[0]?.text || '' };
      if (!row.hidden && !state.tabs.includes(row.id)) state.tabs.push(row.id);
    },
    startAgent(sid, events, { delay = 0.8 } = {}) { state.agents[sid] = { events: events.slice(), at: state.clock + delay, started: state.clock }; api.setState(sid, 'running'); },
    toast(text) { state.toasts.push({ id: 't' + Date.now(), text, at: state.clock }); },
    send(sid, text) { sendInstruction(state, api, sid, text); },
  };
  const env = { route, params, ctx, api };
  for (const m of MODULES) { try { m.init?.(state, env); } catch (e) { console.error(m.id, e); } }

  return {
    state, api,
    render: (c) => renderApp(state, c),
    click: (e) => onClick(e, state, api),
    dblclick: (e) => onDblClick(e, state, api),
    input: (e) => onInput(e, state),
    key: (e) => onKey(e, state, api),
    submit: (e) => onSubmit(e, state, api),
    tick: (dt) => onTick(state, dt, api),
  };
}

/* ── rendering ── */
function renderApp(st, ctx) {
  const narrow = ctx.width < 1000;
  const open = st.sidebarOpen ?? !narrow;
  const sidebarWanted = open && ctx.variant !== 'hero' && st.route !== 'attention';
  const overlay = sidebarWanted && narrow;
  const active = st.sessions.find((s) => s.id === st.activeId) || null;
  let main = null, head = null;
  for (const m of MODULES) { const r = m.main?.(st, ctx); if (r) { main = r.main || r; head = r.header || null; break; } }
  if (!main) {
    if (st.view === 'home') {
      head = header({ view: 'home', workspace: st.ws, sidebarOpen: sidebarWanted });
      main = homeScreen({ typed: st.homeTyped, recent: st.sessions.filter((x) => !x.hidden).slice(0, 5), workspace: st.ws });
    } else if (st.view === 'board') {
      head = boardHeader({ sidebarOpen: sidebarWanted });
      main = renderBoard(st, ctx);
    } else if (active) {
      head = header({ view: 'session', workspace: st.ws, session: active, sidebarOpen: sidebarWanted });
      main = renderSession(st, ctx, active);
    } else {
      head = header({ view: 'home', workspace: st.ws, sidebarOpen: sidebarWanted });
      main = homeScreen({ typed: st.homeTyped, recent: st.sessions.filter((x) => !x.hidden).slice(0, 5), workspace: st.ws });
    }
  }
  const flat = (o) => (Array.isArray(o) ? o.map(flat).join('') : o && o.__raw !== undefined ? o.__raw : typeof o === 'string' ? o : '');
  const overlays = [...MODULES.map((m) => flat(m.overlays?.(st, ctx))), flat(st.toasts.length ? toastView(st.toasts[st.toasts.length - 1].text) : '')];
  const navView = st.view === 'session' ? 'session' : st.view;
  const out = shell({ sidebar: sidebarWanted, view: st.reviewOpen ? 'review' : navView, workspace: st.ws, sessions: st.sessions, activeId: st.activeId, main, header: head, tools: true, overlays: raw(overlays.join('')) });
  // a narrow window shows the sidebar as an overlay the header's toggle opens (the app's own ⌘\ toggle)
  if (overlay) return raw(out.__raw.replace('class="x-app-shell ', 'class="x-app-shell demo-sidebar-overlay ').replace('<main class="x-app-main', '<div class="demo-scrim" data-demo-scrim=""></div><main class="x-app-main'));
  return out;
}

function columnsFor(st, ctx) {
  const n = st.tabs.length;
  const w = ctx.width;
  const max = w >= 1900 ? 5 : w >= 1300 ? (n > 4 ? 3 : 2) : w >= 700 ? 2 : 1;
  return Math.max(1, Math.min(n, max));
}
function renderBoard(st, ctx) {
  const hero = ctx.variant === 'hero' || ctx.width / ctx.height > 2.2;
  const columns = st.route === 'attention' ? 1 : columnsFor(st, ctx);
  const rowMin = hero ? Math.max(240, ctx.height - 52) : st.route === 'attention' ? Math.max(240, ctx.height - 52) : 240;
  const tileW = (ctx.width - (st.sidebarOpen && ctx.width >= 1000 && !hero ? 240 : 0)) / columns;
  const fontSize = tileW >= 600 ? 13 : tileW >= 440 ? 11 : 9;
  const tiles = st.tabs.map((sid) => {
    const s = st.sessions.find((x) => x.id === sid);
    if (!s || s.hidden) return '';
    const view = st.tileViews[sid] || 'chat';
    if (view === 'terminal') return terminalTile(s, st.terms[sid], { cols: colsFor(tileW, fontSize), fontSize });
    const agent = st.agents[sid];
    const pending = s.state === 'running' && agent ? Math.max(0, Math.round(st.clock - agent.started)) : null;
    return chatTile(s, { messages: st.msgs[sid], pending, permission: st.permission[sid] ? { ...st.permission[sid], id: `perm-${sid}` } : null });
  });
  return boardScreen({ tiles, columns, rowMin });
}

function renderSession(st, ctx, s) {
  const sid = s.id;
  const mode = st.modes[sid] || 'overview';
  const term = st.terms[sid];
  const cols = ctx.cols(`[data-terminal-slot="${sid}"]`);
  const agent = st.agents[sid];
  const secs = agent ? Math.max(0, Math.round(st.clock - agent.started)) : null;
  const q = st.queue[sid];
  const messages = st.msgs[sid];
  const lastGroup = messages[messages.length - 1];
  const after = s.state === 'running'
    ? (lastGroup && lastGroup.role === 'assistant' && lastGroup.steps && lastGroup.steps.length ? responding(secs ?? 0) : replyPending(s.cli))
    : '';
  const focused = st.focus && st.focus.kind === 'term' && st.focus.sid === sid;
  return sessionScreen({
    session: s, mode, messages, terminal: term, cols, drawerHeight: Math.max(170, Math.min(320, Math.round(ctx.height * 0.34))),
    typed: st.composerTyped[sid] || '', queue: q ? queuePanel({ text: q.text, state: q.state, cli: s.cli }) : null,
    lastSeconds: secs, narrow: ctx.width < 700, after, termFocused: !!focused, termTyped: st.termTyped[sid] || '',
  });
}

/* ── events ── */
const closest = (e, sel) => (e.target && e.target.closest ? e.target.closest(sel) : null);

function onClick(e, st, api) {
  for (const m of MODULES) { try { if (m.click?.(e, st, api)) return true; } catch (err) { console.error(m.id, err); } }
  if (closest(e, '[data-demo-scrim]')) { st.sidebarOpen = false; return true; }
  const b = closest(e, 'button, [role="button"], a, summary');
  // terminal focus
  const dt = closest(e, '.dt');
  if (dt && !b) {
    const sid = dt.getAttribute('data-term');
    st.focus = { kind: 'term', sid };
    const input = dt.querySelector('.dt-input');
    if (input) input.focus({ preventScroll: true });
    return true;
  }
  if (!b) {
    if (closest(e, '.ive-conversation, .x-app-shell') && st.focus) { st.focus = null; return true; }
    return false;
  }
  const label = b.getAttribute('aria-label') || '';
  const title = b.getAttribute('title') || '';
  // sidebar and header
  if (b.hasAttribute('data-sidebar-toggle')) { st.sidebarOpen = !(st.sidebarOpen ?? api.ctx.width >= 1000); return true; }
  if (b.hasAttribute('data-demo-scrim')) { st.sidebarOpen = false; return true; }
  if (b.matches('[data-nav="home"]') || b.hasAttribute('data-sidebar-new-chat') || b.hasAttribute('data-new-session-button')) { api.go('home'); return true; }
  if (b.matches('[data-nav="board"]') || b.classList.contains('ive-crumb-parent')) { api.go('board'); return true; }
  const card = closest(e, '[data-session-id]');
  if (card && !b.matches('[aria-label^="Delete"], [aria-label^="More actions"], [role="checkbox"]')) { api.go('session', card.getAttribute('data-session-id')); return true; }
  if (b.hasAttribute('data-sidebar-new-session')) { api.go('home'); return true; }
  if (b.classList.contains('ive-needs-you')) {
    const waiting = st.sessions.find((s) => s.state === 'waiting');
    if (waiting) { api.go('board'); return true; }
    return false;
  }
  if (b.classList.contains('ive-recent-session')) { api.go('session', b.getAttribute('data-key')); return true; }
  if (b.hasAttribute('data-home-start')) { startFromHome(st, api); return true; }
  // board tiles
  const tile = closest(e, '[data-grid-cell-session]');
  if (tile && st.view === 'board') {
    const sid = tile.getAttribute('data-grid-cell-session');
    if (label.startsWith('Open ') || title === 'Open') { api.go('session', sid); return true; }
    if (title === 'Switch to Terminal View') { st.tileViews[sid] = 'terminal'; return true; }
    if (title === 'Switch to Chat View') { st.tileViews[sid] = 'chat'; return true; }
    if (b.classList.contains('ive-session-close')) { st.tabs = st.tabs.filter((x) => x !== sid); if (st.activeId === sid) st.activeId = null; return true; }
    if (b.hasAttribute('data-demo-terminal-toggle') || title === 'Open this session’s terminal') { st.tileViews[sid] = 'terminal'; return true; }
    const kind = b.getAttribute('data-choice-kind');
    if (kind) { answerPermission(st, api, sid, kind !== 'deny'); return true; }
    if (b.getAttribute('type') === 'submit' && closest(e, 'form.ive-session-composer')) { e.preventDefault(); sendFromComposer(st, api, sid); return true; }
    if (title.startsWith('Cancel output')) { cancelAgent(st, api, sid); return true; }
    if (b.classList.contains('ive-conversation-activity-toggle')) {
      const proc = closest(e, '.ive-conversation-process');
      const id = (proc ? proc.getAttribute('data-key') : '').replace(/-p$/, '');
      const m = st.msgs[sid].find((x) => (x.id || '') === id) || [...st.msgs[sid]].reverse().find((x) => x.role === 'assistant' && x.steps);
      if (m) { m.open = !m.open; return true; }
    }
  }
  // the session level: drawer bar, composer, activity groups
  const sid = st.activeId;
  if (st.view === 'session' && sid) {
    if (label === 'Restore small terminal') { st.modes[sid] = 'drawer'; return true; }
    if (label === 'Expand terminal') { st.modes[sid] = 'full'; return true; }
    if (label.startsWith('Hide terminal')) { st.modes[sid] = 'overview'; return true; }
    if (b.hasAttribute('data-demo-terminal-toggle')) { st.modes[sid] = (st.modes[sid] || 'overview') === 'overview' ? 'drawer' : 'overview'; return true; }
    if (b.classList.contains('ive-conversation-activity-toggle')) {
      const proc = closest(e, '.ive-conversation-process');
      const key = proc ? proc.getAttribute('data-key') : '';
      const id = key.replace(/-p$/, '');
      const m = st.msgs[sid].find((x) => (x.id || '') === id) || [...st.msgs[sid]].reverse().find((x) => x.role === 'assistant' && x.steps);
      if (m) { m.open = !m.open; return true; }
    }
    if (b.getAttribute('type') === 'submit' && closest(e, 'form.ive-session-composer')) { e.preventDefault(); sendFromComposer(st, api, sid); return true; }
    if (b.getAttribute('type') === 'submit' && closest(e, '[data-terminal-composer]')) { e.preventDefault(); sendFromTerminalComposer(st, api, sid); return true; }
    if (title.startsWith('Cancel output')) { cancelAgent(st, api, sid); return true; }
    const kind = b.getAttribute('data-choice-kind');
    if (kind) { answerPermission(st, api, sid, kind !== 'deny'); return true; }
  }
  if (b.classList.contains('ive-notice-close')) { st.toasts = []; return true; }
  return false;
}

function onDblClick(e, st, api) {
  const heading = closest(e, '.ive-session-heading');
  if (heading && st.view === 'board') { api.go('session', heading.getAttribute('data-reorder-session')); return true; }
  return false;
}

/** The session a control belongs to: its board tile, else the active session. */
function sidOf(t, st) {
  const tile = t && t.closest ? t.closest('[data-grid-cell-session]') : null;
  return (tile && tile.getAttribute('data-grid-cell-session')) || st.activeId;
}
function onInput(e, st) {
  const t = e.target;
  if (!t) return false;
  if (t.hasAttribute('data-home-composer')) { st.homeTyped = t.value; return true; }
  const sid = sidOf(t, st);
  if (t.closest && t.closest('form.ive-session-composer') && t.tagName === 'TEXTAREA' && sid) { st.composerTyped[sid] = t.value; return true; }
  if (t.closest && t.closest('[data-terminal-composer]') && t.tagName === 'INPUT' && sid) { st.termTyped[sid] = t.value; return true; }
  // the terminal's hidden input: characters, paste and virtual keyboards arrive as input events
  if (t.classList && t.classList.contains('dt-input')) {
    if (e.inputType === 'insertCompositionText') return false;
    const sid = t.getAttribute('data-term-input');
    const term = st.terms[sid];
    if (term && !term.dialog && t.value) term.typed += t.value.replace(/[\r\n]+/g, ' ');
    t.value = '';
    return !!term;
  }
  return false;
}

function onSubmit(e, st, api) {
  const form = e.target;
  if (form.classList.contains('ive-home-composer')) { startFromHome(st, api); return true; }
  const sid = sidOf(form, st);
  if (form.classList.contains('ive-session-composer') && sid) { sendFromComposer(st, api, sid); return true; }
  if (form.closest && form.closest('[data-terminal-composer]') && sid) { sendFromTerminalComposer(st, api, sid); return true; }
  return true;
}
function sendFromTerminalComposer(st, api, sid) {
  const text = (st.termTyped[sid] || '').trim();
  if (!text) return;
  st.termTyped[sid] = '';
  sendInstruction(st, api, sid, text, { fromTerminal: true });
}

function onKey(e, st, api) {
  for (const m of MODULES) { try { if (m.key?.(e, st, api)) return true; } catch (err) { console.error(m.id, err); } }
  const meta = e.metaKey || e.ctrlKey;
  if (meta && !e.shiftKey && (e.key === 'j' || e.key === 'J') && st.view === 'session' && st.activeId) {
    const sid = st.activeId;
    st.modes[sid] = (st.modes[sid] || 'overview') === 'overview' ? 'drawer' : 'overview';
    return true;
  }
  const t = e.target;
  // Enter in the composers sends; Shift+Enter is a new line
  if (e.key === 'Enter' && !e.shiftKey && t && t.tagName === 'TEXTAREA') {
    if (t.hasAttribute('data-home-composer')) { startFromHome(st, api); return true; }
    if (t.closest('form.ive-session-composer') && sidOf(t, st)) { sendFromComposer(st, api, sidOf(t, st)); return true; }
  }
  if (e.key === 'Enter' && t && t.tagName === 'INPUT' && t.closest && t.closest('[data-terminal-composer]') && sidOf(t, st)) { sendFromTerminalComposer(st, api, sidOf(t, st)); return true; }
  // typing into a terminal
  if (t && t.classList && t.classList.contains('dt-input')) {
    const sid = t.getAttribute('data-term-input');
    const term = st.terms[sid];
    if (!term) return false;
    if (e.key === 'Escape') { st.focus = null; t.blur(); return true; }
    if (term.dialog) {
      if (e.key === 'Enter' || e.key === '1' || e.key === '2') { answerPermission(st, api, sid, true); return true; }
      if (e.key === '3') { answerPermission(st, api, sid, false); return true; }
      return false;
    }
    if (meta) return false;
    if (e.key === 'Backspace') { term.typed = term.typed.slice(0, -1); return true; }
    if (e.key === 'Enter') { if (term.typed.trim()) sendInstruction(st, api, sid, term.typed.trim(), { fromTerminal: true }); term.typed = ''; return true; }
    return false; // printable characters reach the input event (also paste and virtual keyboards)
  }
  return false;
}

/* ── actions ── */
function startFromHome(st, api) {
  const text = st.homeTyped.trim();
  if (!text) return;
  const id = 'demo-session-' + (Object.keys(st.msgs).length + 1);
  const row = { id, name: nameFor(text), cli: 'claude', model: 'sonnet', state: 'running', style: 'claude' };
  api.addSession(row, { messages: [{ id: id + '-u1', role: 'user', text, time: now() }], lines: promptLines('claude', text) });
  st.terms[id].spinner = spinner(0, 'claude');
  st.msgs[id].push({ id: id + '-a1', role: 'assistant', running: true, steps: [] });
  st.homeTyped = '';
  api.go('session', id);
  api.startAgent(id, programReply(st.defs[id], text), { delay: 1.2 });
}

function sendFromComposer(st, api, sid) {
  const text = (st.composerTyped[sid] || '').trim();
  if (!text) return;
  st.composerTyped[sid] = '';
  sendInstruction(st, api, sid, text);
}

/** An instruction for a session: sent now, or queued (UP NEXT) while the agent works. */
function sendInstruction(st, api, sid, text, { fromTerminal = false } = {}) {
  const s = api.session(sid);
  if (!s) return;
  if (s.state === 'running' && st.agents[sid]) { st.queue[sid] = { text, state: 'queued' }; st.terms[sid].queued = text; return; }
  if (s.state === 'waiting') { answerPermission(st, api, sid, true); }
  const style = st.terms[sid].style;
  st.msgs[sid].push({ id: `${sid}-u${st.msgs[sid].length}`, role: 'user', text, time: now() }, { id: `${sid}-a${st.msgs[sid].length}`, role: 'assistant', running: true, steps: [] });
  st.terms[sid].content.push(...promptLines(style, text));
  st.terms[sid].typed = '';
  st.terms[sid].spinner = spinner(0, style);
  api.startAgent(sid, programReply(st.defs[sid] || SESSIONS[0], text), { delay: fromTerminal ? 1.0 : 0.9 });
}

function answerPermission(st, api, sid, allowed) {
  const s = api.session(sid);
  const term = st.terms[sid];
  if (!s || !term) return;
  delete st.permission[sid];
  term.dialog = null;
  const style = term.style;
  const last = st.msgs[sid][st.msgs[sid].length - 1];
  if (!last || last.role !== 'assistant' || !last.running) st.msgs[sid].push({ id: `${sid}-a${st.msgs[sid].length}`, role: 'assistant', running: true, steps: [] });
  term.spinner = spinner(0, style);
  api.startAgent(sid, allowed ? programPermitted(st.defs[sid]) : programDenied(st.defs[sid]), { delay: 0.6 });
}

function cancelAgent(st, api, sid) {
  const agent = st.agents[sid];
  if (!agent) return;
  delete st.agents[sid];
  finishTurn(st, api, sid, 'Stopped. Tell me how to continue.');
}

function finishTurn(st, api, sid, text) {
  const term = st.terms[sid];
  const style = term.style;
  const msgs = st.msgs[sid];
  const g = [...msgs].reverse().find((m) => m.role === 'assistant' && m.running);
  if (g) { g.running = false; if (!g.steps.length) { msgs.splice(msgs.indexOf(g), 1); } }
  if (text) {
    msgs.push({ id: `${sid}-r${msgs.length}`, role: 'assistant', text, time: now() });
    term.content.push(...sayLines(style, text));
  }
  term.spinner = null;
  api.setState(sid, 'done');
  const q = st.queue[sid];
  if (q && q.state === 'queued') {
    st.queue[sid] = { text: q.text, state: 'sent' };
    st.pendingQueue = st.pendingQueue || {};
    st.pendingQueue[sid] = st.clock + 0.9;
  }
}

/* ── time: the agents' programs, spinners, the queue, toasts ── */
function onTick(st, dt, api) {
  st.clock += dt;
  let changed = false;
  for (const m of MODULES) { try { if (m.tick?.(st, dt, api)) changed = true; } catch (err) { console.error(m.id, err); } }
  for (const [sid, agent] of Object.entries(st.agents)) {
    const term = st.terms[sid];
    const style = term.style;
    const secs = Math.max(0, Math.floor(st.clock - agent.started));
    if (term.spinner !== null && term.spinner !== undefined) {
      const sp = spinner(secs, style);
      if (sp !== term.spinner) { term.spinner = sp; changed = true; }
    }
    if (agent.lastSecs !== secs) { agent.lastSecs = secs; changed = true; }
    while (agent.events.length && st.clock >= agent.at) {
      const evn = agent.events.shift();
      changed = true;
      const msgs = st.msgs[sid];
      let g = [...msgs].reverse().find((m) => m.role === 'assistant' && m.running);
      if (evn.kind === 'step') {
        if (!g) { g = { id: `${sid}-a${msgs.length}`, role: 'assistant', running: true, steps: [] }; msgs.push(g); }
        g.steps.push(cardOf(evn.step));
        term.content.push(...stepLines(style, evn.step));
      } else if (evn.kind === 'say') {
        if (g && g.steps.length && !g.text) { g.text = evn.text; g.inline = true; }
        else msgs.push({ id: `${sid}-r${msgs.length}`, role: 'assistant', text: evn.text, time: now() });
        term.content.push(...sayLines(style, evn.text));
      } else if (evn.kind === 'toast') {
        api.toast(evn.text);
      } else if (evn.kind === 'nudge') {
        if (g) g.running = false;
        msgs.push({ id: `${sid}-n${msgs.length}`, role: 'user', text: evn.text, time: now() }, { id: `${sid}-a${msgs.length + 1}`, role: 'assistant', running: true, steps: [] });
        term.content.push(...promptLines(style, evn.text));
        agent.started = st.clock;
      } else if (evn.kind === 'done') {
        delete st.agents[sid];
        finishTurn(st, api, sid, null);
        break;
      }
      const next = agent.events[0];
      agent.at = st.clock + (next ? next.d : 0);
    }
  }
  // queued instructions go out when the turn ended
  if (st.pendingQueue) {
    for (const [sid, at] of Object.entries(st.pendingQueue)) {
      if (st.clock < at) continue;
      delete st.pendingQueue[sid];
      const q = st.queue[sid];
      delete st.queue[sid];
      if (st.terms[sid]) st.terms[sid].queued = null;
      if (q) sendInstruction(st, api, sid, q.text);
      changed = true;
    }
  }
  // toasts stay a while, like the app's notices
  const before = st.toasts.length;
  st.toasts = st.toasts.filter((t) => st.clock - t.at < 9);
  if (st.toasts.length !== before) changed = true;
  return changed;
}
