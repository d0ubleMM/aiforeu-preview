// The Pipeline editor of IVE 1.0.17 as markup functions: the "Choose a Pipeline" window with the
// six shipped presets, the canvas (stage nodes, SVG edges, the cycle counter, Run / Pause / Stop,
// the properties panel with Triggers and Recent Runs) and the "Pipeline Run" detail window.
// Markup and class names follow DOM dumps of the real frontend (scripts/demos/snapshot.mjs,
// clip loop-canvas); app.css styles it. Demo data for the Orbit project; no engine runs.
//
// API (all return `html` results):
//   homeScreen({ sessions })                           Home behind the editor's scrim
//   pipelineChooser({ presets, own })                  the preset list window (fixed overlay)
//   pipelineCanvas({ pipeline, run, pan, zoom, narrow }) the editor with a pipeline open
//   runDetail({ pipeline, run, selected })             the run window on top of the editor
//   Node: { id, name, type: 'agent'|'condition', role, icon, x, y }   edges: { source, target, label, condition }
//   run: { status: 'running'|'completed', iteration, max, current: [ids], stages: { id: { status: 'pending'|'running'|'completed', result, summary, session } } }
import { html, raw } from './dom.js';
import { ic } from './ui.js';

const NODE_W = 200, NODE_H = 80;

/* ── the six presets as the chooser shows them (names, descriptions, chips) ── */
export const PRESETS = [
  { name: 'Research Loop', description: 'Research -> Plan -> Implement -> Test -> Document -> Loop. The full CI/CD agent cycle, ending with docs once tests pass.', chips: [['Research', 'search'], ['Plan', 'map'], ['Implement', 'code'], ['Test', 'circle-check-big'], ['Evaluate', 'git-branch', true], ['Document', 'arrow-right']] },
  { name: 'TDD Loop', description: 'Implement -> Test -> Fix -> Repeat until green.', chips: [['Implement', 'code'], ['Test', 'circle-check-big'], ['Evaluate', 'git-branch', true]] },
  { name: 'Review Loop', description: 'Implement -> Code Review -> Revise -> Repeat until approved.', chips: [['Implement', 'code'], ['Review', 'eye'], ['Evaluate', 'git-branch', true]] },
  { name: 'Verification Cascade', description: 'Unit Tests -> E2E Tests -> Quality Audit, with fix-and-restart at every level. Escalating verification that checks if outputs are actually useful, not just working.', chips: [['Unit Tests', 'arrow-right'], ['Unit Gate', 'git-branch', true], ['E2E Tests', 'arrow-right'], ['E2E Gate', 'git-branch', true], ['Quality Audit', 'eye'], ['Quality Gate', 'git-branch', true], ['Fix', 'wrench']] },
  { name: 'RALPH Pipeline', description: 'Execute -> Verify -> Fix -> Repeat. Multi-agent version of RALPH mode.', chips: [['Execute', 'zap'], ['Verify', 'shield'], ['Evaluate', 'git-branch', true], ['Fix', 'wrench']] },
  { name: 'Auto-Dispatch', description: 'When a task enters Todo, automatically route it to Commander to spawn a worker and begin implementation. Enable the board_column trigger to make todo tasks self-dispatching. Commander checks current in_progress load before acting.', chips: [['Dispatch to Worker', 'arrow-right']] },
];

/* ── Home (what the editor's scrim covers) ── */
export function homeScreen({ sessions = [], date = 'Friday 23 October' } = {}) {
  const recent = sessions.filter((s) => !s.hidden).slice(0, 3);
  return html`<div class="ive-home flex-1 overflow-y-auto" data-home-screen=""><h1 class="sr-only">Home</h1><div class="ive-home-inner"><p class="t-meta ive-home-date">${date}</p>
<form class="x-composer ive-home-composer"><textarea data-home-composer="true" aria-label="What do you want to work on?" placeholder="What do you want to work on? Type / for commands, @ for files" rows="2"></textarea><div class="ive-home-composer-row"><span class="ive-header-fill"></span><button type="submit" data-home-start="true" class="ive-btn ive-btn--primary" disabled="">Start</button></div></form>
<section class="ive-continue-panel ive-control-surface" aria-labelledby="continue-work-title"><header class="ive-panel-heading"><span class="ive-panel-icon">${ic('folder-open', 16)}</span><div><p class="ive-eyebrow">Your workspace</p><h2 id="continue-work-title">Continue working</h2></div></header>
<div class="ive-recent-sessions">${recent.map((s) => html`<button type="button" class="ive-recent-session" title="Open ${s.name}">${ic('terminal', 14, 'shrink-0 text-x-muted')}<span class="min-w-0 flex-1"><span class="block truncate font-semibold text-x-ink">${s.name}</span><span class="mt-1 flex items-center gap-2 text-xs text-x-muted"><span class="h-1.5 w-1.5 shrink-0 rounded-full ${s.state === 'running' ? 'bg-x-running' : 'bg-x-good'}"></span>${s.state === 'running' ? 'Running' : 'Done'}<span class="truncate">· Orbit</span></span></span>${ic('arrow-right', 14, 'shrink-0 text-x-muted')}</button>`)}</div>
<button type="button" class="ive-text-action">${ic('search', 14)} Find a session ${ic('arrow-right', 14)}</button></section></div></div>`;
}

/* ── Choose a Pipeline ── */
const chip = ([name, icon, condition]) => html`<span class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[11px]" style="background: var(--x-tint); color: var(${condition ? '--x-accent-ink' : '--x-accent'}); border: 1px solid var(${condition ? '--x-accent-ink' : '--x-accent'});">${ic(icon, 11)}${name}</span>`;

export function pipelineChooser({ presets = PRESETS, own = [] } = {}) {
  return html`<div class="fixed inset-0 z-50 bg-x-scrim backdrop-blur-[4px] flex flex-col" data-demo="chooser"><div class="flex-1 flex flex-col m-4 x-panel shadow-x-3 overflow-hidden">
<div class="flex items-center justify-between px-5 py-3 border-b border-x-line"><div class="flex items-center gap-2">${ic('git-branch', 16, 'text-x-accent')}<span class="text-sm font-semibold text-x-ink">Pipeline Editor</span></div><button class="p-1 rounded-md text-x-muted hover:text-x-ink hover:bg-x-hover transition-colors duration-[80ms]" aria-label="Close" data-demo="chooser-close">${ic('x', 16)}</button></div>
<div class="flex-1 overflow-auto p-6"><div class="max-w-4xl mx-auto"><h2 class="text-lg font-semibold text-x-ink mb-1">Choose a Pipeline</h2><p class="text-sm text-x-muted mb-6">A pipeline is a reusable workflow: connect AI work, checks, and decisions. Start with a preset, then adapt its steps.</p>
<div class="grid grid-cols-2 gap-3 mb-8">${presets.map((p, i) => html`<button class="text-left p-4 bg-x-surface border border-x-line rounded-lg hover:border-x-line-strong hover:bg-x-hover transition-colors duration-[80ms] ease-x" data-demo="preset-${i}"><div class="flex items-center gap-2 mb-1">${ic('sparkles', 14, 'text-x-accent')}<span class="text-sm font-medium text-x-ink-secondary">${p.name}</span></div><p class="text-xs text-x-muted leading-relaxed">${p.description}</p><div class="mt-2 flex gap-1">${p.chips.map(chip)}</div></button>`)}</div>
<h3 class="text-sm font-medium text-x-ink-secondary mb-3">Your Pipelines</h3>
<div class="space-y-2 mb-6">${own.map((p) => html`<button class="w-full text-left p-3 bg-x-surface-2 border border-x-line rounded-lg hover:border-x-line-strong hover:bg-x-hover transition-colors duration-[80ms] ease-x flex items-center justify-between" data-demo="open-${p.id}"><div><span class="text-sm text-x-ink-secondary">${p.name}</span><span class="ml-2 text-xs text-x-muted">${p.stages.length} stages</span></div><span class="text-[11px] font-medium px-1.5 py-0.5 rounded-md bg-x-good/15 text-x-good">active</span></button>`)}</div>
<button class="flex items-center gap-2 h-[30px] px-4 bg-x-accent hover:bg-x-accent-ink text-x-on-accent rounded-md text-[13px] font-medium active:scale-[0.98] transition-colors duration-[80ms] ease-x" data-demo="create">${ic('plus', 14)} Create Blank Pipeline</button></div></div></div></div>`;
}

/* ── the canvas ── */
const ROLE_LABEL = (n) => (n.type === 'condition' ? 'Condition gate' : n.role || 'worker');
const stageState = (run, id) => (run && run.stages[id]) || { status: 'pending' };

function edgePath(a, b) {
  const sx = a.x + NODE_W, sy = a.y + NODE_H / 2, tx = b.x, ty = b.y + NODE_H / 2;
  const off = Math.min(80, Math.max(40, Math.abs(tx - sx) * 0.4));
  return { d: `M ${sx} ${sy} C ${sx + off} ${sy}, ${tx - off} ${ty}, ${tx} ${ty}`, sx, sy, tx, ty };
}

export function pipelineCanvas({ pipeline, run = null, pan = { x: 0, y: 0 }, zoom = 1, narrow = false, tight = false, readonly = false, paused = false }) {
  const byId = Object.fromEntries(pipeline.stages.map((n) => [n.id, n]));
  const running = run && run.status === 'running';
  // The edge into a running stage from a completed one is drawn as a moving dashed line (one per target).
  const activeTargets = new Set();
  const edges = pipeline.transitions.map((t) => {
    const a = byId[t.source], b = byId[t.target];
    const p = edgePath(a, b);
    const active = running && stageState(run, t.source).status === 'completed' && stageState(run, t.target).status === 'running' && !activeTargets.has(t.target);
    if (active) activeTargets.add(t.target);
    const color = a.type === 'condition' ? 'var(--x-accent-ink)' : 'var(--x-accent)';
    const mid = { x: (p.sx + p.tx) / 2, y: (p.sy + p.ty) / 2 };
    return raw(`<g><path d="${p.d}" fill="none" stroke="${color}" stroke-width="1.5" stroke-dasharray="${active ? '8 4' : 'none'}" class="cursor-pointer"${active ? ' style="animation: 0.6s linear 0s infinite normal none running dash;"' : ''}></path><polygon points="${p.tx},${p.ty} ${p.tx - 8},${p.ty - 4} ${p.tx - 8},${p.ty + 4}" fill="${color}"></polygon>${t.label && t.condition === 'on_fail' ? `<text x="${mid.x}" y="${mid.y - 8}" text-anchor="middle" fill="${color}" font-size="10" font-weight="500" class="pointer-events-none select-none">${t.label}</text>` : ''}</g>`);
  });
  const nodes = pipeline.stages.map((n) => {
    const st = stageState(run, n.id);
    const isRunning = st.status === 'running';
    const dotColor = st.status === 'pending' || !run ? 'var(--x-faint)' : 'var(--x-good)';
    const portColor = n.type === 'condition' ? 'var(--x-accent-ink)' : 'var(--x-accent)';
    return html`<div class="absolute select-none transition-colors duration-[80ms] ease-x" data-demo="node-${n.id}" data-key="node-${n.id}" style="left: ${n.x}px; top: ${n.y}px; width: ${NODE_W}px; height: ${NODE_H}px;"><div class="w-full h-full rounded-lg border cursor-pointer flex flex-col justify-center px-3 transition-colors duration-[80ms] ease-x ${isRunning ? 'border-x-good/50 ring-1 ring-x-good/25' : 'border-x-line'}" style="background: var(--x-tint);"><div class="flex items-center gap-2">${ic(n.icon, 14, n.type === 'condition' ? 'text-x-accent-ink shrink-0' : 'text-x-accent shrink-0')}<span class="text-xs font-medium text-x-ink truncate">${n.name}</span>${run ? html`<span class="ml-auto w-2 h-2 rounded-full flex-shrink-0 ${isRunning ? 'animate-subtle-pulse' : ''}" style="background: ${dotColor};"></span>` : ''}</div><div class="text-[11px] text-x-faint mt-1 truncate flex items-center gap-1">${ROLE_LABEL(n)}</div></div><div class="absolute w-3 h-3 rounded-full border-2 cursor-crosshair transition-colors duration-[80ms]" style="left: -6px; top: 34px; background: var(--x-surface-2); border-color: ${portColor};"></div><div class="absolute w-3 h-3 rounded-full border-2 cursor-crosshair transition-colors duration-[80ms]" style="right: -6px; top: 34px; background: var(--x-surface-2); border-color: ${portColor};"></div></div>`;
  });
  const counter = run ? html`<span class="text-[11px] text-x-faint" data-demo="cycle">Cycle ${run.iteration} of ${run.max} · ${run.status}</span><button class="px-2 py-1 text-[11px] font-medium rounded-md border bg-x-tint text-x-accent border-x-accent/30 hover:bg-x-accent/15 hover:border-x-accent/45 transition-colors duration-[80ms] ease-x" data-demo="run-detail">Run Detail</button>` : '';
  const controls = running
    ? html`<button title="Pause progression; the current step may finish" data-demo="pause" class="flex items-center gap-1 px-2 py-1 text-[11px] font-medium bg-x-accent-ink/10 text-x-accent-ink hover:bg-x-accent-ink/15 border border-x-accent-ink/30 hover:border-x-accent-ink/45 rounded-md transition-colors duration-[80ms] ease-x">${ic(paused ? 'play' : 'pause', 12)} ${paused ? 'Resume' : 'Pause'}</button><button title="Cancel this workflow and interrupt its active work" data-demo="stop" class="flex items-center gap-1 px-2 py-1 text-[11px] font-medium bg-x-accent-ink/10 text-x-accent-ink hover:bg-x-accent-ink/15 border border-x-accent-ink/30 hover:border-x-accent-ink/45 rounded-md transition-colors duration-[80ms] ease-x">${ic('square', 12)} Stop</button>`
    : html`<button title="${readonly ? 'Presets run from a task; open a saved pipeline to run it here' : 'Start this workflow'}"${readonly ? raw(' disabled=""') : ''} class="flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium bg-x-good/10 text-x-good hover:bg-x-good/15 border border-x-good/30 hover:border-x-good/45 rounded-md transition-colors duration-[80ms] ease-x disabled:opacity-40 disabled:cursor-not-allowed" data-demo="run">${ic('play', 12)} ${paused ? 'Resume' : 'Run'}</button>`;
  const recent = run ? html`<div class="mt-4"><span class="text-xs font-medium text-x-faint block mb-2">Recent Runs</span><div class="flex items-center justify-between py-1 border-b border-x-line"><div class="flex items-center gap-1.5"><span class="w-1.5 h-1.5 rounded-full" style="background: var(--x-good);"></span><span class="text-[11px] text-x-ink-secondary">${run.status}</span></div><button data-demo="run-detail" class="text-[11px] text-x-accent hover:text-x-accent-ink">detail</button></div></div>` : '';
  return html`<div class="fixed inset-0 z-50 bg-x-scrim backdrop-blur-[4px] flex flex-col" data-demo="editor"><div class="flex-1 flex flex-col m-3 x-panel shadow-x-3 overflow-hidden">
<div class="border-b border-x-line px-4 py-2 text-xs text-x-muted">Connect steps with arrows. A condition chooses what happens after a check. Pause waits before the next step; Stop cancels active work. Each loop has a cycle limit.</div>
<div class="flex items-center justify-between px-4 py-2 border-b border-x-line bg-x-surface-2"><div class="flex items-center gap-3"><button class="p-1 rounded-md text-x-muted hover:text-x-ink hover:bg-x-hover transition-colors duration-[80ms]" title="Back to list" data-demo="back">${ic('rotate-ccw', 14)}</button><input class="bg-transparent text-sm font-semibold text-x-ink border-none outline-none w-52"${narrow ? raw(' style="width: 150px;"') : ''} value="${pipeline.name}"><span class="text-[11px] font-medium px-1.5 py-0.5 rounded-md bg-x-good/15 text-x-good">active</span></div>
<div class="flex items-center gap-1.5">${narrow ? '' : html`<button class="flex items-center gap-1 px-2 py-1 text-[11px] font-medium bg-x-accent/10 text-x-accent hover:bg-x-accent/15 rounded-md border border-x-accent/30 transition-colors duration-[80ms] ease-x">${ic('plus', 12)} Agent</button><button class="flex items-center gap-1 px-2 py-1 text-[11px] font-medium bg-x-accent-ink/10 text-x-accent-ink hover:bg-x-accent-ink/15 rounded-md border border-x-accent-ink/30 transition-colors duration-[80ms] ease-x">${ic('plus', 12)} Condition</button><button class="flex items-center gap-1 px-2 py-1 text-[11px] font-medium bg-x-good/10 text-x-good hover:bg-x-good/15 rounded-md border border-x-good/30 transition-colors duration-[80ms] ease-x">${ic('plus', 12)} Command</button><div class="w-px h-4 bg-x-line mx-1"></div>`}${controls}${counter}<div class="w-px h-4 bg-x-line mx-1"></div>${narrow ? '' : html`<button class="px-2 py-1 text-[11px] font-medium rounded-md border transition-colors duration-[80ms] ease-x bg-x-good/10 text-x-good border-x-good/30 hover:bg-x-good/15 hover:border-x-good/45" data-demo="deactivate">Deactivate</button><button disabled="" data-demo="save" class="flex items-center gap-1 px-2 py-1 text-[11px] font-medium rounded-md transition-colors duration-[80ms] ease-x disabled:opacity-40 bg-x-surface text-x-faint">${ic('save', 12)} Save</button><button class="p-1 rounded-md text-x-faint hover:text-x-accent-ink hover:bg-x-accent-ink/15 transition-colors duration-[80ms]" aria-label="Delete pipeline" data-demo="delete">${ic('trash2', 14)}</button>`}<button class="p-1 rounded-md text-x-muted hover:text-x-ink hover:bg-x-hover transition-colors duration-[80ms] ml-1" aria-label="Close editor" data-demo="editor-close">${ic('x', 16)}</button></div></div>
<div class="flex-1 flex overflow-hidden"><div class="flex-1 relative overflow-hidden cursor-grab active:cursor-grabbing" data-demo="canvas" style="background: var(--x-bg);">
<svg class="absolute inset-0 w-full h-full pointer-events-none opacity-20"><pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse" patternTransform="translate(${pan.x % 40} ${pan.y % 40})"><circle cx="20" cy="20" r="0.8" fill="var(--x-faint)"></circle></pattern><rect width="100%" height="100%" fill="url(#grid)"></rect></svg>
<div class="absolute" style="transform: translate(${pan.x}px, ${pan.y}px) scale(${zoom}); transform-origin: 0px 0px; transition: transform 600ms var(--x-ease);"><svg class="absolute" style="width: 4000px; height: 2000px; overflow: visible;"><defs><style>@keyframes dash { to { stroke-dashoffset: -12; } }</style></defs>${edges}</svg>${nodes}</div>
<div class="absolute bottom-3 right-3 text-[11px] text-x-faint bg-x-surface-2 border border-x-line px-2 py-0.5 rounded-md" data-demo="zoom">${Math.round(zoom * 100)}%</div></div>
${narrow ? '' : html`<div class="w-72 border-l border-x-line bg-x-surface-2 overflow-y-auto"><div class="p-3 space-y-3"><div class="flex items-center justify-between"><span class="text-xs font-medium text-x-ink-secondary">Triggers</span><div class="flex gap-1"><button class="text-[11px] font-medium px-1.5 py-0.5 bg-x-accent/10 text-x-accent rounded-md hover:bg-x-accent/15 transition-colors duration-[80ms]" data-demo="trigger">+ Column</button><button class="text-[11px] font-medium px-1.5 py-0.5 bg-x-surface text-x-ink-secondary rounded-md hover:bg-x-hover transition-colors duration-[80ms]" data-demo="trigger">+ Manual</button></div></div><p class="text-[11px] text-x-faint italic">No triggers — pipeline is manual only.</p>${recent}</div></div>`}</div></div></div>`;
}

/* ── Pipeline Run (detail window) ── */
const RESULT_CHIP = (r) => (r === 'pass'
  ? html`<span class="rounded-md px-1.5 py-0.5 text-[11px] font-medium bg-x-good/10 text-x-good">pass</span>`
  : r === 'fail' ? html`<span class="rounded-md px-1.5 py-0.5 text-[11px] font-medium bg-x-failed/10 text-x-failed">fail</span>` : '');

export function runDetail({ pipeline, run, selected = null, when = '10/23/2026 06:22 PM', started = '10/23/2026 06:21 PM', elapsed = '5s', tight = false }) {
  const sel = pipeline.stages.find((n) => n.id === (selected || pipeline.stages[0].id));
  const selState = stageState(run, sel.id);
  const dotOf = (st) => (st.status === 'pending' ? 'bg-x-faint' : st.status === 'running' ? 'bg-x-running' : 'bg-x-good');
  const list = pipeline.stages.map((n) => {
    const st = stageState(run, n.id);
    const active = n.id === sel.id;
    return html`<button class="w-full rounded-md border p-2.5 text-left transition-colors duration-[80ms] ease-x ${active ? 'border-x-accent/45 bg-x-tint' : 'border-x-line bg-transparent hover:bg-x-hover hover:border-x-line-strong'}" data-demo="stage-${n.id}" aria-pressed="${active ? 'true' : 'false'}"><div class="flex items-center gap-2"><span class="h-2 w-2 rounded-full shrink-0 ${dotOf(st)}"></span><span class="min-w-0 flex-1 truncate text-[12px] font-medium text-x-ink-secondary">${n.name}</span>${RESULT_CHIP(st.result)}</div><div class="mt-1 flex items-center gap-2 text-[11px] text-x-faint"><span>${n.type}</span><span>${st.status}</span>${st.status === 'completed' ? html`<span>1m</span>` : ''}</div></button>`;
  });
  return html`<div class="fixed inset-0 z-[80] bg-x-scrim backdrop-blur-[4px] flex flex-col" data-demo="run-window"><div class="flex-1 m-3 x-panel shadow-x-3 overflow-hidden flex flex-col">
<header class="flex items-center justify-between gap-3 border-b border-x-line bg-x-surface-2 px-4 py-3"><div class="min-w-0"><div class="flex items-center gap-2">${ic('git-branch', 16, 'text-x-accent')}<h2 class="truncate text-sm font-semibold text-x-ink">Pipeline Run</h2><span class="rounded-md border px-1.5 py-0.5 text-[11px] font-medium ${run.status === 'completed' ? 'bg-x-good/10 text-x-good border-x-good/25' : 'bg-x-tint text-x-accent border-x-accent/25'}">${run.status}</span></div><div class="mt-1 flex flex-wrap gap-2 text-[11px] text-x-faint"><span>${pipeline.name}</span><span class="font-mono">run ${run.id}</span><span class="tabular-nums">Cycle ${run.iteration} of ${run.max}</span><span>${when}</span><span>${ic('clock3', 11, 'inline')}${elapsed}</span></div></div><div class="flex items-center gap-1.5"><button aria-label="Close workflow run" class="p-1 rounded-md text-x-muted hover:text-x-ink hover:bg-x-hover transition-colors duration-[80ms]">${ic('x', 16)}</button></div></header>
<div class="flex-1 min-h-0 flex"><aside class="w-80 shrink-0 border-r border-x-line bg-x-surface-2 overflow-y-auto"${tight ? raw(' style="width: 176px;"') : ''}><div class="p-3 space-y-2">${list}</div></aside>
<main class="flex-1 min-w-0 overflow-y-auto"><div class="p-4 space-y-4">
<section class="rounded-lg border border-x-line bg-x-surface shadow-x-1 p-3"><div class="flex flex-wrap items-center gap-2"><span class="h-2 w-2 rounded-full shrink-0 ${dotOf(selState)}"></span><h3 class="text-sm font-semibold text-x-ink">${sel.name}</h3><span class="rounded-md border border-x-line bg-x-hover px-1.5 py-0.5 text-[11px] text-x-faint">${sel.type}</span>${RESULT_CHIP(selState.result)}</div><div class="mt-2 flex flex-wrap gap-3 text-[11px] text-x-faint"><span>started ${started}</span><span>duration 1m</span>${selState.session ? html`<button class="inline-flex items-center gap-1 text-x-accent hover:text-x-accent-ink">${ic('external-link', 11)} ${selState.session}</button>` : ''}</div></section>
<section><div class="mb-1 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.06em] text-x-faint">${ic('file-text', 12)} Stage Summary</div><pre class="max-h-[44vh] overflow-auto whitespace-pre-wrap rounded-lg border p-3 text-[11px] leading-relaxed font-mono border-x-line bg-x-surface-2 text-x-ink-secondary">${selState.summary || ''}</pre></section>
${selState.session ? html`<section class="rounded-lg border border-x-line bg-x-surface shadow-x-1 p-3 space-y-3"><div class="flex items-center justify-between gap-2"><div class="flex items-center gap-2 text-[11px] font-medium text-x-ink-secondary">${ic('terminal', 12)} Linked Session</div><button class="inline-flex items-center gap-1 text-[11px] text-x-accent hover:text-x-accent-ink" data-demo="open-session" data-session-name="${selState.session}">${ic('external-link', 11)} Open session</button></div><section><div class="mb-1 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.06em] text-x-faint">${ic('file-text', 12)} Recent Terminal Output</div><pre class="max-h-[44vh] overflow-auto whitespace-pre-wrap rounded-lg border p-3 text-[11px] leading-relaxed font-mono border-x-line bg-x-surface-2 text-x-ink-secondary">❯ </pre></section><div><div class="mb-1 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.06em] text-x-faint">${ic('box', 12)} Captures / Artifacts</div><div class="rounded-lg border border-x-line bg-x-surface-2 p-3 text-[11px] text-x-faint">No captures recorded for this session.</div></div></section>` : ''}
</div></main></div></div></div>`;
}
