// Scene "autofix": build, check, fix, repeat. The guided task "Fix the expired-session redirect"
// waits for plan approval in "Needs your attention"; the review button opens the task window;
// "Approve plan & start" lets Implement run in a worker session, Verify in a fresh testing
// session; the failed check goes back with its report (Corrections, Test evidence · Reported
// failure); the fix passes and loops to cycle 2; the second check passes and the result waits
// for review ("Accept result"); Run details shows the completed run at "Cycle 2 of 3".
// Demo data for the Orbit project; the stage graph is the one 1.0.17 generates for a guided task.
import { script } from '../lib/timeline.js';
import { shell } from '../lib/ui.js';
import { homeBackdrop, attentionDialog, taskWindow, runDetails } from '../lib/taskflow.js';

const WS = { id: 'orbit', name: 'Orbit', color: 'rgb(16, 185, 129)' };
const TASK = {
  title: 'Fix the expired-session redirect', workspace: 'Orbit', path: '/Projects/orbit',
  description: 'After an expired session the app redirects to / instead of /sign-in. Send it to /sign-in and keep the sign-in checks passing.',
  acceptance: 'Expired sessions land on /sign-in.\nAll sign-in checks pass.',
};
const REPORT = {
  plan: { result: 'pass', text: 'plan', list: ['Read the router guard in `src/app/routes.js` and `src/lib/auth.js`.', 'Send expired sessions to `/sign-in` and keep the return path.', 'Run `npm test` (tests/sign-in.spec.js).'] },
  critic: { result: 'pass', text: 'Concrete and bounded: two source files and one test file. Safe to execute.' },
  implement: { result: 'pass', text: 'Before: expired sessions went to `/`. Now the router guard sends them to `/sign-in?return=…`. Files: `src/app/routes.js`, `src/lib/auth.js`.' },
  verify1: { result: 'fail', text: 'npm test: 13 passed, 1 failed.\nFAIL tests/sign-in.spec.js › expired session keeps the return path\nExpected /sign-in?return=%2Fworkspace, received /sign-in.' },
  verify2: { result: 'pass', text: 'npm test: 14 passed, 0 failed.\nChecked: an expired session lands on /sign-in?return=…; signing in returns to the workspace.' },
};
const PLAN_SUMMARY = '1. Read the router guard in `src/app/routes.js` and `src/lib/auth.js`.\n2. Send expired sessions to `/sign-in` and keep the return path.\n3. Run `npm test` (tests/sign-in.spec.js).';

// Sessions as the sidebar lists them (recent activity first). Pipeline sessions are named the
// way the engine names them: "Pipeline <Role> (<CLI label>)".
const ORBIT = [
  { id: 'interface', name: 'Build the workspace', cli: 'claude', model: 'sonnet', state: 'done', age: '1m ago' },
  { id: 'api', name: 'Connect the API', cli: 'codex', model: 'default', state: 'done', age: '1m ago' },
  { id: 'checks', name: 'Check the sign-in flow', cli: 'claude', model: 'sonnet', state: 'done', age: '1m ago' },
  { id: 'review', name: 'Review the changes', cli: 'claude', model: 'opus', state: 'done', age: '1m ago' },
  { id: 'planner', name: 'Pipeline Planner (Claude Code)', cli: 'claude', model: 'opus', state: 'done', age: '4m ago' },
  { id: 'critic', name: 'Pipeline Planner (Claude Code)', cli: 'claude', model: 'opus', state: 'done', age: '6m ago' },
];
const WORKER = { id: 'worker', name: 'Pipeline Worker (Claude Code)', cli: 'claude', model: 'sonnet', state: 'running', age: 'just now' };
const TESTER = (id) => ({ id, name: 'Pipeline Testing Worker (Claude Code)', cli: 'claude', model: 'sonnet', state: 'running', age: 'just now' });

const STAGES = [
  { id: 'plan', name: 'Plan', kind: 'agent' }, { id: 'plan_critic', name: 'Plan Review', kind: 'agent' }, { id: 'plan_gate', name: 'Plan Gate', kind: 'condition' },
  { id: 'approval', name: 'Plan Approval', kind: 'approval' }, { id: 'implement', name: 'Implement', kind: 'agent' }, { id: 'verify', name: 'Verify', kind: 'agent' },
  { id: 'verify_gate', name: 'Verify Gate', kind: 'condition' }, { id: 'fix', name: 'Fix', kind: 'agent' }, { id: 'done', name: 'Ready for Review', kind: 'task_update' },
];

function init() {
  return {
    view: 'attention',          // 'attention' | 'task' | 'run'
    stage: 'approval',          // 'approval' | 'implement' | 'verify' | 'fix' | 'review'
    cycle: 1,
    sessions: ORBIT.map((s) => ({ ...s })),
    reports: { plan: REPORT.plan, critic: REPORT.critic, implement: null, fix: null, verify: null },
    sections: [['Proposed plan', 'plan'], ['Plan review', 'critic']],
    attention: 1,
  };
}
// Sidebar bookkeeping: a pipeline session appears at the top of the list, newest first.
const addSession = (st, s) => { st.sessions.unshift({ ...s }); };
const setState = (st, id, state) => { const s = st.sessions.find((x) => x.id === id); if (s) s.state = state; };

const s = script();
s.hold(1.1);
s.mark('Needs your attention');
s.click('[data-demo-dialog="attention"] .ive-btn--primary', { dur: 0.7, after: 0 }, (st) => { st.view = 'task'; });
s.hold(1.0);
s.mark('Approve the plan');
// S1: plan approved, Implement starts in a new worker session.
s.click('[data-tour="plan-approve"]', { dur: 0.7, after: 0.1 }, (st) => {
  st.stage = 'implement'; st.attention = 0;
  addSession(st, WORKER);
  st.sections = [['Proposed plan', 'plan'], ['Plan review', 'critic'], ['What changed', 'implement']];
});
s.hold(0.9);
// S2: the implementer reports pass; Verify runs in a fresh testing session.
s.do((st) => {
  st.stage = 'verify'; setState(st, 'worker', 'done'); addSession(st, TESTER('tester1'));
  st.reports.implement = REPORT.implement;
  st.sections = [['Proposed plan', 'plan'], ['Plan review', 'critic'], ['What changed', 'implement'], ['Test evidence', 'verify']];
});
s.hold(1.0);
// S3: the check fails; the report goes back to the implementing session (Fix).
s.do((st) => {
  st.stage = 'fix'; setState(st, 'tester1', 'done'); setState(st, 'worker', 'running');
  st.reports.verify = REPORT.verify1;
  st.sections = [['Proposed plan', 'plan'], ['Plan review', 'critic'], ['What changed', 'implement'], ['Corrections', 'fix'], ['Test evidence', 'verify']];
});
s.mark('Failed check');
s.hold(0.4);
// Down to Corrections and Test evidence (clamped to the end on short stages).
s.scroll('[data-demo-flow-scroll]', 2000, { from: 0, dur: 0.8 });
s.hold(1.4);
// S4: the fix reports pass and loops back: cycle 2, downstream stages reset, a second testing session.
s.do((st) => {
  st.stage = 'verify'; st.cycle = 2; setState(st, 'worker', 'done'); addSession(st, TESTER('tester2'));
  st.reports.verify = null; st.reports.fix = null;
  st.sections = [['Proposed plan', 'plan'], ['Plan review', 'critic'], ['What changed', 'implement'], ['Test evidence', 'verify']];
});
s.mark('Cycle 2');
s.hold(1.2);
// S5: the second check passes; the run completes and the result waits for review.
s.do((st) => {
  st.stage = 'review'; setState(st, 'tester2', 'done'); st.attention = 1;
  st.reports.verify = REPORT.verify2;
});
s.hold(0.5);
s.scroll('[data-demo-flow-scroll]', 0, { from: 600, dur: 0.7 });
s.hold(0.3);
s.moveTo('[data-tour="result-accept"]', { dur: 0.7 });
s.hold(0.6);
s.click('[data-demo-dialog="task"] [data-tour="run-details"]', { dur: 0.6, after: 0 }, (st) => { st.view = 'run'; });
s.hold(0.8);
s.mark('Run details');
const POSTER = s.t;
s.hold(1.4);

export default {
  id: 'autofix',
  title: 'Build, check, fix, repeat',
  script: s.build(),
  poster: POSTER,
  fit: { width: 1600, minScale: 0.72 },
  css: true,
  init,
  render(st, ctx) {
    const sessions = st.sessions.map((x) => ({ ...x }));
    // The sidebar's "needs your attention" row and the Board badge follow the run.
    if (st.attention) sessions.push({ id: 'task-attention', name: '', state: 'waiting', hidden: true, cli: 'claude', model: '' });
    const recent = [ORBIT[0], ORBIT[2], ORBIT[1]];
    let overlay;
    if (st.view === 'attention') overlay = attentionDialog({ item: { title: TASK.title, workspace: TASK.workspace, reason: 'Plan approval needed', hint: 'Review the task to continue.' } });
    else if (st.view === 'task') overlay = taskWindow({ task: TASK, stage: st.stage, reports: st.reports, sections: st.sections });
    else {
      const done = (id, duration = '1m') => ({ ...STAGES.find((x) => x.id === id), status: 'completed', result: 'pass', duration });
      const stages = [{ ...done('plan'), started: '10/23/2026 06:21 PM' }, done('plan_critic'), done('plan_gate'), { ...done('approval'), duration: '' }, done('implement'), done('verify'), done('verify_gate'), { ...STAGES.find((x) => x.id === 'fix'), status: 'pending', result: null }, done('done')];
      overlay = runDetails({ task: TASK, runId: 'run-redi', cycle: 2, maxCycles: 3, startedAt: '10/23/2026 06:16 PM', elapsed: '6m 12s', stages, selected: 'plan', summary: PLAN_SUMMARY, session: 'Pipeline Planner (Claude Code)', narrow: ctx.width < 700 });
    }
    return shell({
      sidebar: ctx.width >= 1000,
      view: 'home', workspace: WS, sessions, activeId: null,
      main: homeBackdrop({ recent }),
      overlays: overlay,
    });
  },
};
