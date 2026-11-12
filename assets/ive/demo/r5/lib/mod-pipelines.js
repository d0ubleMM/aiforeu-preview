// Module "pipelines" of the IVE app built into the site (lib/app.js): the Pipeline editor as a
// visitor can use it. The Project-tools button `[data-demo-open="pipelines"]` or ⌘⇧L opens
// "Choose a Pipeline" (the six 1.0.17 presets, read-only on the canvas, and the saved "Sign-in
// checks loop"); the loop opens on the canvas (Execute → Verify → Evaluate, Fix back to Verify);
// "Run" plays the run with the recorded timing (Execute passes, Verify in a testing session fails,
// Evaluate takes "Fix issues", Fix passes, cycle 2: Verify and Evaluate pass, "Cycle 2 of 20 ·
// completed"); Pause/Resume, Stop, "Run Detail" with a clickable stage list, "Open session";
// Back to list, the close X and Escape return to the app. Demo data for the Orbit project; the
// Orbit sessions in the sidebar change state through the app's api. No engine or provider runs.
import { PRESETS, pipelineChooser, pipelineCanvas, runDetail } from './pipeline.js';
import { prompt, step, say } from './term.js';

const TESTER = 'tester';
const TESTER_NAME = 'Pipeline Testing Worker (Claude Code)';
const WORKER = 'interface';
const WORKER_NAME = 'Build the workspace';

// The RALPH graph with the user's own Execute prompt; node positions as the user placed them.
const PLACED = {
  wide: { execute: [400, 200], verify: [700, 200], evaluate: [1000, 200], fix: [850, 380] },
  narrow: { execute: [40, 70], verify: [300, 70], evaluate: [560, 70], fix: [430, 240] },
};
const RALPH_STAGES = [
  { id: 'execute', name: 'Execute', type: 'agent', role: 'worker', icon: 'zap' },
  { id: 'verify', name: 'Verify', type: 'agent', role: 'tester', icon: 'shield' },
  { id: 'evaluate', name: 'Evaluate', type: 'condition', icon: 'git-branch' },
  { id: 'fix', name: 'Fix', type: 'agent', role: 'worker', icon: 'wrench' },
];
const RALPH_TRANSITIONS = [
  { id: 't1', source: 'execute', target: 'verify', condition: 'always', label: '' },
  { id: 't2', source: 'verify', target: 'evaluate', condition: 'always', label: '' },
  { id: 't3', source: 'evaluate', target: 'fix', condition: 'on_fail', label: 'Fix issues' },
  { id: 't4', source: 'fix', target: 'verify', condition: 'always', label: 'Re-verify' },
];
const signinLoop = (layout) => ({
  id: 'signin', name: 'Sign-in checks loop', readonly: false,
  stages: RALPH_STAGES.map((n) => ({ ...n, x: PLACED[layout][n.id][0], y: PLACED[layout][n.id][1] })),
  transitions: RALPH_TRANSITIONS,
});

// A preset on the canvas, read-only: its chips as a chain of stages (the RALPH preset is the loop).
const CHIP_ROLE = { Test: 'tester', 'Unit Tests': 'tester', 'E2E Tests': 'tester', Verify: 'tester', Review: 'reviewer', 'Quality Audit': 'reviewer', Research: 'researcher', Plan: 'planner', Document: 'writer' };
function presetGraph(index, layout) {
  const p = PRESETS[index];
  if (!p) return null;
  if (p.name === 'RALPH Pipeline') return { ...signinLoop(layout), id: `preset-${index}`, name: p.name, readonly: true };
  const gapX = layout === 'wide' ? 260 : 230, x0 = layout === 'wide' ? 120 : 40, y0 = layout === 'wide' ? 220 : 90;
  const stages = p.chips.map(([name, icon, condition], k) => ({
    id: `s${k}`, name, type: condition ? 'condition' : 'agent', role: condition ? undefined : (CHIP_ROLE[name] || 'worker'), icon,
    x: x0 + (k % 4) * gapX, y: y0 + Math.floor(k / 4) * 180,
  }));
  const transitions = stages.slice(1).map((n, k) => ({ id: `t${k}`, source: stages[k].id, target: n.id, condition: 'always', label: '' }));
  // loops end where they say so: the last condition sends failures back to the implementing stage
  const lastCond = [...stages].reverse().find((n) => n.type === 'condition');
  const impl = stages.find((n) => /Implement|Execute|Fix|Dispatch/.test(n.name)) || stages[0];
  if (lastCond && impl && lastCond.id !== impl.id) transitions.push({ id: 'loop', source: lastCond.id, target: impl.id, condition: 'on_fail', label: 'Fix issues' });
  return { id: `preset-${index}`, name: p.name, readonly: true, stages, transitions };
}

const REPORT = {
  execute: 'Router guard sends expired sessions to /sign-in with the return path.',
  verify1: 'npm test: 13 passed, 1 failed. expired session keeps the return path.',
  verify2: 'npm test: 14 passed, 0 failed.',
  fix: 'Kept the return path when the guard redirects; routes.js passes location.pathname to /sign-in.',
};
const pending = () => ({ status: 'pending' });
const running = (session) => ({ status: 'running', session });
const done = (result, summary, session) => ({ status: 'completed', result, summary, session });

/* ── the run as timed events (seconds after Run), applied by tick ── */
function runEvents(api, st) {
  const P = st.pipelines;
  return [
    { at: 0, fn: () => { P.run.stages.execute = running(WORKER_NAME); setWorker(api, st, 'running'); } },
    { at: 1.8, fn: () => {
      P.run.stages.execute = done('pass', REPORT.execute, WORKER_NAME);
      P.run.stages.verify = running(TESTER_NAME);
      restoreWorker(api, st);
      ensureTester(api, st);
      api.setState(TESTER, 'running');
      P.pan = 1;
    } },
    { at: 3.6, fn: () => {
      P.run.stages.verify = done('fail', REPORT.verify1, TESTER_NAME);
      P.run.stages.evaluate = done('fail', REPORT.verify1);
      P.run.stages.fix = running(WORKER_NAME);
      P.run.current = ['fix'];
      api.setState(TESTER, 'done');
      setWorker(api, st, 'running');
    } },
    { at: 5.6, fn: () => {
      P.run.iteration = 2;
      P.run.stages.fix = pending();
      P.run.stages.evaluate = pending();
      P.run.stages.verify = running(TESTER_NAME);
      P.run.current = ['verify'];
      P.run.fixSummary = REPORT.fix;
      restoreWorker(api, st);
      api.setState(TESTER, 'running');
    } },
    { at: 7.6, fn: () => {
      P.run.stages.verify = done('pass', REPORT.verify2, TESTER_NAME);
      P.run.stages.evaluate = done('pass', REPORT.verify2);
      P.run.status = 'completed';
      P.run.current = [];
      api.setState(TESTER, 'done');
      api.toast('Sign-in checks loop completed in cycle 2 of 20.');
    } },
  ];
}
function setWorker(api, st, state) {
  const P = st.pipelines;
  const row = api.session(WORKER);
  if (!row) return;
  if (P.workerPrev == null) P.workerPrev = row.state;
  // a session that is already working on its own keeps working
  if (row.state !== 'running') api.setState(WORKER, state);
  P.workerHeld = true;
}
function restoreWorker(api, st) {
  const P = st.pipelines;
  const row = api.session(WORKER);
  if (row && P.workerHeld && P.workerPrev != null && !st.agents[WORKER]) api.setState(WORKER, P.workerPrev === 'running' ? 'done' : P.workerPrev);
  P.workerPrev = null;
  P.workerHeld = false;
}
function ensureTester(api, st) {
  if (api.session(TESTER)) return;
  const instruction = 'Verify: run the sign-in checks (tests/sign-in.spec.js) and report the result.';
  api.addSession({ id: TESTER, name: TESTER_NAME, cli: 'claude', model: 'sonnet', state: 'running', style: 'claude' }, {
    messages: [
      { id: 'tester-u1', role: 'user', text: instruction, time: api.now() },
      { id: 'tester-a1', role: 'assistant', steps: [{ id: 'tester-s1', tool: 'Bash', command: 'npm test', description: 'Run the sign-in checks', result: REPORT.verify1 }], text: REPORT.verify1, inline: true },
    ],
    lines: [...prompt(instruction, 58), ...step('Bash', 'npm test', '13 passed, 1 failed (3.3 s)'), ...say(REPORT.verify1, 58)],
  });
  // pipeline sessions sit in the sidebar; they do not open a board tile by themselves
  st.tabs = st.tabs.filter((id) => id !== TESTER);
}

/* ── module ── */
function openChooser(st) { st.pipelines.open = 'chooser'; st.pipelines.detail = false; }
function openPipeline(st, pipeline) {
  const P = st.pipelines;
  P.open = 'canvas';
  P.pipeline = pipeline;
  P.detail = false;
  P.selected = null;
  P.pan = 0;
  if (!pipeline.readonly && P.run && P.run.pipelineId !== pipeline.id) P.run = null;
}
function startRun(st, api) {
  const P = st.pipelines;
  if (!P.pipeline || P.pipeline.readonly) return;
  P.run = { id: 'run-signin', pipelineId: P.pipeline.id, status: 'running', iteration: 1, max: 20, current: ['execute'], stages: { execute: pending(), verify: pending(), evaluate: pending(), fix: pending() } };
  P.started = st.clock;
  P.paused = false;
  P.pausedAt = null;
  P.events = runEvents(api, st);
  P.pan = 0;
}
function stopRun(st, api) {
  const P = st.pipelines;
  if (!P.run) return;
  P.events = [];
  P.paused = false;
  for (const id of Object.keys(P.run.stages)) if (P.run.stages[id].status === 'running') P.run.stages[id] = pending();
  P.run.status = 'cancelled';
  P.run.current = [];
  if (api.session(TESTER)) api.setState(TESTER, 'stopped');
  restoreWorker(api, st);
}
function closeAll(st) { const P = st.pipelines; P.open = null; P.detail = false; }

const mod = {
  id: 'pipelines',
  init(state, env) {
    state.pipelines = { open: env.route === 'pipelines' ? 'chooser' : null, pipeline: null, run: null, detail: false, selected: null, pan: 0, paused: false, pausedAt: null, events: [], started: 0, workerPrev: null, workerHeld: false };
    // ⌘⇧L and Escape also when nothing inside the app has focus (the frame listens on #root only):
    // a document-level listener handles keys whose target is outside the root.
    if (typeof document !== 'undefined' && !document.__demoPipelinesKeys) {
      document.__demoPipelinesKeys = true;
      document.addEventListener('keydown', (e) => {
        const root = document.getElementById('root');
        if (root && e.target && root.contains(e.target)) return;
        if (mod.key(e, state, env.api)) { e.preventDefault(); if (window.IVE_DEMO && window.IVE_DEMO.render) window.IVE_DEMO.render(); }
      });
    }
  },
  overlays(st, ctx) {
    const P = st.pipelines;
    if (!P || !P.open) return '';
    const narrow = ctx.width < 1100;
    const tight = ctx.width < 760;
    const layout = narrow ? 'narrow' : 'wide';
    if (P.open === 'chooser') return pipelineChooser({ own: [signinLoop(layout)] });
    // the stored pipeline keeps the layout current for this stage width
    const pipeline = P.pipeline.readonly ? presetGraph(Number(P.pipeline.id.replace('preset-', '')), layout) : signinLoop(layout);
    const pan = tight ? { x: P.pan ? -250 : 20, y: 30 } : narrow ? { x: 28, y: 30 } : { x: 0, y: 0 };
    const run = P.run && P.run.pipelineId === pipeline.id ? P.run : null;
    const canvas = pipelineCanvas({ pipeline, run, pan, narrow, tight, readonly: !!pipeline.readonly, paused: P.paused });
    if (P.detail && run) return [canvas, runDetail({ pipeline, run, selected: P.selected, tight })];
    return canvas;
  },
  click(e, st, api) {
    const P = st.pipelines;
    const b = e.target && e.target.closest ? e.target.closest('button, [role="button"]') : null;
    if (b && b.getAttribute('data-demo-open') === 'pipelines') { openChooser(st); return true; }
    if (!P.open) return false;
    if (!b) {
      // clicks on the scrim of the topmost window close it, like the app's dialogs
      const scrim = e.target && e.target.closest ? e.target.closest('[data-demo="chooser"], [data-demo="editor"], [data-demo="run-window"]') : null;
      if (scrim && e.target === scrim) { if (P.detail) P.detail = false; else closeAll(st); return true; }
      return true; // the editor covers the app: nothing underneath reacts
    }
    if (b.classList.contains('ive-notice-close')) return false; // the app's toast, handled by the core
    const k = b.getAttribute('data-demo') || '';
    if (k === 'chooser-close' || k === 'editor-close') { closeAll(st); return true; }
    if (k === 'back') { openChooser(st); return true; }
    if (k.startsWith('open-signin') || k === 'open-signin') { openPipeline(st, signinLoop('wide')); return true; }
    if (k.startsWith('preset-')) { const g = presetGraph(Number(k.slice(7)), 'wide'); if (g) openPipeline(st, g); return true; }
    if (k === 'create') { api.toast('This demo keeps its saved pipeline; a blank pipeline would start here.'); return true; }
    if (k === 'run') {
      if (P.pipeline && P.pipeline.readonly) { api.toast('Presets run from a task. Open "Sign-in checks loop" to run it here.'); return true; }
      if (P.run && P.run.status === 'running' && P.paused) { resume(st); return true; }
      startRun(st, api);
      return true;
    }
    if (k === 'pause') { if (P.paused) resume(st); else { P.paused = true; P.pausedAt = st.clock; } return true; }
    if (k === 'stop') { stopRun(st, api); return true; }
    if (k === 'run-detail') { if (P.run) { P.detail = true; P.selected = P.selected || (P.run.current && P.run.current[0]) || 'execute'; } return true; }
    if (k.startsWith('stage-')) { P.selected = k.slice(6); return true; }
    if (b.getAttribute('aria-label') === 'Close workflow run') { P.detail = false; return true; }
    if (k === 'open-session') {
      const name = b.getAttribute('data-session-name') || '';
      const sid = name === TESTER_NAME ? TESTER : name === WORKER_NAME ? WORKER : null;
      if (sid && api.session(sid)) { closeAll(st); api.go('session', sid); }
      return true;
    }
    if (k === 'deactivate' || k === 'save' || k === 'delete' || k === 'trigger') { api.toast('This demo keeps the saved pipeline as it is.'); return true; }
    if (b.getAttribute('data-demo') === null && b.closest('[data-demo="run-window"]')) {
      // the linked-session name button in the run window
      const name = b.textContent.trim();
      const sid = name === TESTER_NAME ? TESTER : name === WORKER_NAME ? WORKER : null;
      if (sid && api.session(sid)) { closeAll(st); api.go('session', sid); return true; }
    }
    return true; // every other control inside the editor is inert in the demo
  },
  key(e, st, api) {
    // one decision per key event: the frame's #root listener and the document listener above may both see it
    if (e.__demoPipelinesSeen) return false;
    e.__demoPipelinesSeen = true;
    const P = st.pipelines;
    if ((e.metaKey || e.ctrlKey) && e.shiftKey && (e.key === 'L' || e.key === 'l')) {
      if (P.open) closeAll(st); else openChooser(st);
      return true;
    }
    if (e.key === 'Escape' && P.open) {
      if (P.detail) P.detail = false;
      else if (P.open === 'canvas') openChooser(st);
      else closeAll(st);
      return true;
    }
    return false;
  },
  tick(st, dt, api) {
    const P = st.pipelines;
    if (!P || !P.run || P.run.status !== 'running' || P.paused || !P.events.length) return false;
    let changed = false;
    while (P.events.length && st.clock - P.started >= P.events[0].at) {
      const evn = P.events.shift();
      evn.fn();
      changed = true;
    }
    return changed;
  },
};
export default mod;

function resume(st) {
  const P = st.pipelines;
  if (!P.paused) return;
  // the pause shifts the remaining events by its length
  P.started += st.clock - (P.pausedAt ?? st.clock);
  P.paused = false;
  P.pausedAt = null;
}
