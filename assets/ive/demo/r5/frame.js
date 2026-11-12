// Bootstraps one demo inside frame.html. Two modes share the stage:
//   preview (default): a generated scene (scenes/<id>.js) on the timeline: seek/play/pause, markers,
//     pointer; any pointer action inside pauses it (window.IVE_DEMO + postMessage protocol with demo.js).
//   app (?mode=app): the IVE app built into the site (lib/app.js) at a route: freely usable, canned
//     agent replies, background work while visible.
// Both: the stage (the app window) scales to the iframe but never below a minimum scale (the
// window gets narrower instead, text stays legible), and app.css's width media queries are
// evaluated against the stage width so the layout is the app's at that window size.
import { createPlayer } from './lib/timeline.js';
import { morph, stick } from './lib/dom.js';
import { colsFor } from './lib/term.js';

const params = new URLSearchParams(location.search);
const sceneId = (params.get('scene') || 'terminal').replace(/[^a-z0-9-]/g, '');
const mode = params.get('mode') === 'app' ? 'app' : 'preview';
const theme = params.get('theme') === 'dark' ? 'dark' : 'light';
document.documentElement.setAttribute('data-theme', theme);
document.documentElement.setAttribute('data-mode', mode);

const stage = document.getElementById('stage');
const root = document.getElementById('root');
const ctx = { width: 1600, height: 1000, scale: 1, theme, mode, route: sceneId, phone: params.get('phone') === '1', variant: (params.get('variant') || '').replace(/[^a-z0-9-]/g, ''), params, cols: () => 80 };
const post = (type, data = {}) => { try { window.parent.postMessage({ source: 'ive-demo', scene: sceneId, mode, type, ...data }, location.origin); } catch { /* no parent */ } };

/* ── app.css width media queries against the stage width (CSSOM, same-origin stylesheet) ── */
const mediaRules = [];
function collectMediaRules() {
  for (const sheet of Array.from(document.styleSheets)) {
    if (!sheet.href || !/app\.css/.test(sheet.href)) continue;
    let rules;
    try { rules = Array.from(sheet.cssRules); } catch { continue; }
    for (const rule of rules) {
      if (!(rule instanceof CSSMediaRule)) continue;
      const text = rule.media.mediaText;
      if (/(min|max)-width/.test(text)) mediaRules.push({ rule, text });
    }
  }
}
const px = (v, unit) => (unit === 'rem' || unit === 'em' ? v * 16 : v);
function widthQueryMatches(text, width) {
  let ok = true;
  text.replace(/\((min|max)-width:\s*([\d.]+)(px|rem|em)\)/g, (_, kind, v, unit) => {
    const limit = px(parseFloat(v), unit);
    if (kind === 'min' ? width < limit : width > limit) ok = false;
    return _;
  });
  return ok;
}
function applyMediaForStage(width) {
  if (!mediaRules.length) collectMediaRules();
  for (const m of mediaRules) {
    const rest = m.text.replace(/\((min|max)-width:[^)]*\)\s*(and\s*)?/g, '').replace(/\s*and\s*$/, '').trim();
    const want = widthQueryMatches(m.text, width) ? (rest || 'all') : 'not all';
    if (m.rule.media.mediaText !== want) { try { m.rule.media.mediaText = want; } catch { /* read-only */ } }
  }
}

/* ── stage size ── */
let fit = { width: 1600, minScale: 0.72, maxScale: 1 };
let onLayout = null;
function layout() {
  const vw = document.documentElement.clientWidth || window.innerWidth;
  const vh = document.documentElement.clientHeight || window.innerHeight;
  if (!vw || !vh) return;
  const base = fit.width || 1600;
  const scale = Math.min(fit.maxScale ?? 1, Math.max(fit.minScale ?? 0.72, vw / base));
  ctx.width = Math.round(vw / scale);
  ctx.height = Math.round(vh / scale);
  ctx.scale = scale;
  stage.style.width = ctx.width + 'px';
  stage.style.height = ctx.height + 'px';
  stage.style.transform = `scale(${scale})`;
  applyMediaForStage(ctx.width);
  if (onLayout) onLayout();
}
ctx.cols = (selector, fontSize = 13) => {
  const el = root.querySelector(selector);
  const w = el ? el.clientWidth : ctx.width - 252;
  return colsFor(w || ctx.width - 252, fontSize);
};
function loadSceneCss(id) {
  return new Promise((resolve) => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = `scenes/${id}.css`;
    link.onload = link.onerror = resolve;
    document.head.appendChild(link);
  });
}

/* ── preview: a scene on the timeline ── */
async function startPreview() {
  let scene, player = null;
  const api = window.IVE_DEMO = {
    scene: sceneId, mode, theme, ready: false,
    seek: (t) => player && player.seek(t),
    play: () => player && player.play(),
    pause: () => player && player.pause(),
    get time() { return player ? player.time : 0; },
    get duration() { return player ? player.duration : 0; },
    get playing() { return !!player && player.playing; },
    get markers() { return player ? player.markers : []; },
    get poster() { return scene ? scene.poster ?? 0 : 0; },
    get title() { return scene ? scene.title : ''; },
    relayout: layout,
  };
  try {
    scene = (await import(`./scenes/${sceneId}.js`)).default;
  } catch (e) {
    root.innerHTML = `<p style="padding:24px;font:13px Inter,system-ui">Demo "${sceneId}" could not load.</p>`;
    post('error', { message: String(e && e.message) });
    return;
  }
  if (scene.css) await loadSceneCss(sceneId);
  fit = { width: 1600, minScale: 0.72, maxScale: 1, ...(scene.fit || {}) };
  if (params.has('minScale')) fit.minScale = Math.min(1, Math.max(0.3, Number(params.get('minScale')) || fit.minScale));
  layout();
  await document.fonts.ready.catch(() => {});
  player = createPlayer(scene, {
    stage, root, ctx,
    onTime: (time, duration) => post('time', { time, duration }),
    onEnd: () => post('ended'),
    onPlayState: (playing) => post('playstate', { playing }),
  });
  onLayout = () => player.relayout();
  const at = params.has('at') ? Number(params.get('at')) : (scene.poster ?? 0);
  player.seek(Number.isFinite(at) ? at : 0);
  player.relayout();
  api.ready = true;
  new ResizeObserver(layout).observe(document.documentElement);
  const takeOver = () => { if (player.playing) { player.pause(); post('takeover'); } };
  stage.addEventListener('pointerdown', takeOver, { passive: true });
  stage.addEventListener('wheel', takeOver, { passive: true });
  stage.addEventListener('keydown', takeOver);
  window.addEventListener('keydown', (e) => { if (e.key === 'Escape') post('key', { key: 'Escape' }); });
  window.addEventListener('message', (e) => {
    if (e.origin !== location.origin || !e.data || e.data.target !== 'ive-demo') return;
    const { type, time } = e.data;
    if (type === 'seek') player.seek(time);
    else if (type === 'play') player.play();
    else if (type === 'pause') player.pause();
  });
  post('ready', { duration: player.duration, markers: player.markers, poster: scene.poster ?? 0, title: scene.title });
}

/* ── app: the IVE app built into the site ── */
const APP_MIN_SCALE = { board: 0.6, attention: 0.8, terminals: 0.55 };
const APP_BASE_WIDTH = { terminals: 2080, attention: 640 };
async function startApp() {
  const { createApp } = await import('./lib/app.js');
  let app = null;
  function render() {
    morph(root, app.render(ctx));
    stick(root);
    const f = app.state.focus;
    if (f && f.kind === 'term') {
      const input = root.querySelector(`.dt-input[data-term-input="${f.sid}"]`);
      if (input && document.activeElement !== input) input.focus({ preventScroll: true });
    }
  }
  let visible = true, last = performance.now();
  function loop() {
    const t = performance.now();
    const dt = Math.min(0.5, (t - last) / 1000);
    last = t;
    if (visible && app && app.tick(dt)) render();
    setTimeout(loop, 120);
  }
  const api = window.IVE_DEMO = {
    scene: sceneId, mode, theme, ready: false,
    get state() { return app ? app.state : null; },
    go: (view, sid) => { if (app) { app.api.go(view, sid); render(); } },
    send: (sid, text) => { if (app) { app.api.send(sid, text); render(); } },
    setVisible: (v) => { visible = !!v; last = performance.now(); },
    relayout: layout,
    render: () => app && render(),
  };
  try {
    fit = { width: APP_BASE_WIDTH[sceneId] || 1600, minScale: APP_MIN_SCALE[sceneId] ?? 0.72, maxScale: 1 };
    if (params.has('minScale')) fit.minScale = Math.min(1, Math.max(0.3, Number(params.get('minScale')) || fit.minScale));
    app = createApp({ ctx, route: sceneId, params });
    onLayout = () => render();
    layout();
    await document.fonts.ready.catch(() => {});
    render();
    layout();
    api.ready = true;
    new ResizeObserver(layout).observe(document.documentElement);
    root.addEventListener('click', (e) => { if (app.click(e)) render(); });
    root.addEventListener('dblclick', (e) => { if (app.dblclick(e)) render(); });
    root.addEventListener('input', (e) => { if (app.input(e)) render(); });
    root.addEventListener('submit', (e) => { e.preventDefault(); if (app.submit(e)) render(); });
    root.addEventListener('keydown', (e) => {
      e.__demoSeen = true;
      if (app.key(e)) { e.preventDefault(); e.__demoHandled = true; render(); }
    });
    // Keys arriving at the window (nothing inside has focus, as after a click in Safari): the app gets
    // them once; Escape the app did not use reaches the parent (closes the viewer).
    window.addEventListener('keydown', (e) => {
      if (!e.__demoSeen) {
        e.__demoSeen = true;
        if (app.key(e)) { e.preventDefault(); e.__demoHandled = true; render(); }
      }
      if (e.key === 'Escape' && !e.__demoHandled) post('key', { key: 'Escape' });
    });
    root.addEventListener('focusin', (e) => {
      const t = e.target;
      if (t && t.classList && t.classList.contains('dt-input')) { app.state.focus = { kind: 'term', sid: t.getAttribute('data-term-input') }; render(); }
    });
    window.addEventListener('message', (e) => {
      if (e.origin !== location.origin || !e.data || e.data.target !== 'ive-demo') return;
      if (e.data.type === 'visible') api.setVisible(e.data.visible);
      else if (e.data.type === 'go') api.go(e.data.view, e.data.sid);
    });
    loop();
    post('ready', { title: 'IVE', app: true });
  } catch (e) {
    console.error(e);
    root.innerHTML = '<p style="padding:24px;font:13px Inter,system-ui">The demo could not start.</p>';
    post('error', { message: String(e && e.message) });
  }
}

if (mode === 'app') startApp(); else startPreview();
