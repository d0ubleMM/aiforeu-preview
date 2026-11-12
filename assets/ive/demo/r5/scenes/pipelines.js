// Scene "pipelines": draw your own loop. The Pipeline editor opens on "Choose a Pipeline" (⌘⇧L)
// with the six presets of 1.0.17; the saved "Sign-in checks loop" (the RALPH graph with a fixed
// Execute prompt) is opened and run: Execute → Verify → Evaluate; the failed check takes the
// "Fix issues" edge to Fix, which loops back to Verify ("Cycle 2 of 20"); the second check
// passes and the run completes. "Run Detail" lists the stages. Demo data for the Orbit project:
// the presets are the engine's definitions, the run and its reports are scripted; no engine runs.
import { script } from '../lib/timeline.js';
import { shell } from '../lib/ui.js';
import { homeScreen, pipelineChooser, pipelineCanvas, runDetail } from '../lib/pipeline.js';

const WS = { id: 'orbit', name: 'Orbit', color: 'rgb(16, 185, 129)' };
const TESTER = 'tester';
const sessions = () => [
  { id: 'interface', name: 'Build the workspace', cli: 'claude', model: 'sonnet', state: 'done', age: '1m ago' },
  { id: 'api', name: 'Connect the API', cli: 'codex', model: 'default', state: 'done', age: '3m ago' },
  { id: 'checks', name: 'Check the sign-in flow', cli: 'claude', model: 'sonnet', state: 'done', age: '2m ago' },
  { id: 'review', name: 'Review the changes', cli: 'claude', model: 'opus', state: 'done', age: '11m ago' },
  { id: TESTER, name: 'Pipeline Testing Worker (Claude Code)', cli: 'claude', model: 'sonnet', state: 'running', age: 'now', hidden: true },
];

// The RALPH graph with the user's own Execute prompt, nodes where the user placed them.
const PLACED = {
  wide: { execute: [400, 200], verify: [700, 200], evaluate: [1000, 200], fix: [850, 380] },
  narrow: { execute: [40, 70], verify: [300, 70], evaluate: [560, 70], fix: [430, 240] },
};
const pipelineFor = (layout) => ({
  id: 'signin', name: 'Sign-in checks loop',
  stages: [
    { id: 'execute', name: 'Execute', type: 'agent', role: 'worker', icon: 'zap' },
    { id: 'verify', name: 'Verify', type: 'agent', role: 'tester', icon: 'shield' },
    { id: 'evaluate', name: 'Evaluate', type: 'condition', icon: 'git-branch' },
    { id: 'fix', name: 'Fix', type: 'agent', role: 'worker', icon: 'wrench' },
  ].map((n) => ({ ...n, x: PLACED[layout][n.id][0], y: PLACED[layout][n.id][1] })),
  transitions: [
    { id: 't1', source: 'execute', target: 'verify', condition: 'always', label: '' },
    { id: 't2', source: 'verify', target: 'evaluate', condition: 'always', label: '' },
    { id: 't3', source: 'evaluate', target: 'fix', condition: 'on_fail', label: 'Fix issues' },
    { id: 't4', source: 'fix', target: 'verify', condition: 'always', label: 'Re-verify' },
  ],
});

const REPORT = {
  execute: 'Router guard sends expired sessions to /sign-in with the return path.',
  verify1: 'npm test: 13 passed, 1 failed. expired session keeps the return path.',
  verify2: 'npm test: 14 passed, 0 failed.',
};
const pending = () => ({ status: 'pending' });
const running = (session) => ({ status: 'running', session });
const done = (result, summary, session) => ({ status: 'completed', result, summary, session });

function init() {
  return {
    sessions: sessions(),
    view: 'chooser', // chooser | canvas | detail
    run: null,
    pan: 0, // the canvas pan on narrow stages (the app's own translate), in px
  };
}
const S = (st, id) => st.sessions.find((s) => s.id === id);

const s = script();
s.mark('Presets');
s.hold(1.5);
s.click('[data-demo="open-signin"]', { dur: 0.8, after: 0 }, (st) => { st.view = 'canvas'; });
s.mark('Canvas');
s.hold(0.8);
s.click('[data-demo="run"]', { dur: 0.7, after: 0 }, (st) => {
  st.run = { id: 'run-sign', status: 'running', iteration: 1, max: 20, stages: { execute: running('Build the workspace'), verify: pending(), evaluate: pending(), fix: pending() } };
  S(st, 'interface').state = 'running';
});
s.moveTo('[data-demo="zoom"]', { dur: 0.6, offset: { x: -1.4, y: 0.5 } });
s.hold(0.6);
// Execute reports pass; Verify starts in a testing session.
s.do((st) => {
  st.run.stages.execute = done('pass', REPORT.execute, 'Build the workspace');
  st.run.stages.verify = running('Pipeline Testing Worker (Claude Code)');
  S(st, 'interface').state = 'done';
  S(st, TESTER).hidden = false;
  st.pan = 1;
});
s.hold(1.6);
// Verify reports fail; Evaluate takes the "Fix issues" edge; Fix runs in Execute's session.
s.do((st) => {
  st.run.stages.verify = done('fail', REPORT.verify1, 'Pipeline Testing Worker (Claude Code)');
  st.run.stages.evaluate = done('fail', REPORT.verify1);
  st.run.stages.fix = running('Build the workspace');
  S(st, TESTER).state = 'done';
  S(st, 'interface').state = 'running';
});
s.mark('Fix issues');
s.hold(1.8);
// Fix reports pass: back to Verify, cycle 2; Verify, Evaluate and Fix reset.
s.do((st) => {
  st.run.iteration = 2;
  st.run.stages.fix = pending();
  st.run.stages.evaluate = pending();
  st.run.stages.verify = running('Pipeline Testing Worker (Claude Code)');
  S(st, 'interface').state = 'done';
  S(st, TESTER).state = 'running';
});
s.mark('Cycle 2');
s.hold(0.5);
const POSTER = s.t;
s.hold(1.1);
// Verify passes, Evaluate passes: the run is complete.
s.do((st) => {
  st.run.stages.verify = done('pass', REPORT.verify2, 'Pipeline Testing Worker (Claude Code)');
  st.run.stages.evaluate = done('pass', REPORT.verify2);
  st.run.status = 'completed';
  S(st, TESTER).state = 'done';
});
s.hold(1.3);
s.click('[data-demo="run-detail"]', { dur: 0.7, after: 0 }, (st) => { st.view = 'detail'; });
s.mark('Run detail');
s.hold(2.6);

export default {
  id: 'pipelines',
  title: 'Draw your own loop',
  script: s.build(),
  poster: POSTER,
  fit: { width: 1600, minScale: 0.7 },
  css: true,
  pointerPark: (ctx) => ({ x: ctx.width - 120, y: ctx.height - 100 }),
  init,
  render(st, ctx) {
    const narrow = ctx.width < 1100;
    const tight = ctx.width < 760; // a phone: the graph is wider than the canvas
    const pipeline = pipelineFor(narrow ? 'narrow' : 'wide');
    // Narrow stages place the nodes closer; on a phone the loop (Verify, Evaluate, Fix) comes
    // into view once the run moves there, with the app's own canvas pan.
    const pan = tight ? { x: st.pan ? -250 : 20, y: 30 } : narrow ? { x: 28, y: 30 } : { x: 0, y: 0 };
    let overlay;
    if (st.view === 'chooser') overlay = pipelineChooser({ own: [pipeline] });
    else {
      overlay = pipelineCanvas({ pipeline, run: st.run, pan, narrow, tight });
      if (st.view === 'detail') overlay = [overlay, runDetail({ pipeline, run: st.run, tight })];
    }
    return shell({
      sidebar: ctx.width >= 1000,
      view: 'home', workspace: WS, sessions: st.sessions, activeId: null,
      main: homeScreen({ sessions: st.sessions }),
      overlays: overlay,
    });
  },
};
