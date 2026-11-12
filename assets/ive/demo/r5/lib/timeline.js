// The demo timeline: a scene is a deterministic script of timed events over a plain state
// object, plus pointer moves and clicks. `seek(t)` rebuilds the state exactly (scrubbing
// backwards replays from the start), `play()` advances on requestAnimationFrame. The scene's
// `render(state, ctx)` returns the app markup; `morph` patches the live DOM in place.
import { morph } from './dom.js';

const CURSOR_SVG = '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="30" viewBox="0 0 22 30"><path d="M3 2.5 3 23.2 8.3 18.4 11.6 26.6 15.7 24.9 12.4 16.8 19.4 16.6Z" fill="#111" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/></svg>';
const ease = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));

/**
 * Builds a scene script. Time advances as the script is written, like the recorder's holds:
 *   s.hold(0.6).click('[data-x]').type('text', { cps: 26 }, (state, typed) => …).do(state => …)
 */
export function script() {
  const events = [], moves = [], clicks = [], markers = [], scrollTargets = [];
  let t = 0;
  const api = {
    get t() { return t; },
    at(time) { t = time; return api; },
    hold(sec) { t += sec; return api; },
    /** A state change at the current time. */
    do(fn) { events.push({ t, fn }); return api; },
    /** `fn(state, k)` at every `sec` from now until `until` (spinners, clocks). */
    every(sec, until, fn) { let k = 0; for (let x = t; x < until - 1e-9; x += sec) { const at = x, n = k++; events.push({ t: at, fn: (s) => fn(s, n, at) }); } return api; },
    /** Types `text` character by character; `fn(state, typedSoFar)` per character. */
    type(text, { cps = 24, jitter = true } = {}, fn) {
      const per = 1 / cps;
      let typed = '';
      let seed = text.length;
      for (const ch of text) {
        typed += ch;
        const partial = typed;
        events.push({ t, fn: (s) => fn(s, partial) });
        seed = (seed * 9301 + 49297) % 233280;
        const j = jitter ? 0.7 + (seed / 233280) * 0.6 : 1;
        t += per * j + (/[.,;:!?]/.test(ch) ? per * 1.5 : 0);
      }
      return api;
    },
    /** Moves the pointer to a target (`[x, y]` in stage px or a selector with a fractional offset). */
    moveTo(target, { dur = 0.5, offset } = {}) { moves.push({ t0: t, t1: t + dur, target, offset }); t += dur; return api; },
    /** Moves to the target, clicks (a ring shows), runs `fn(state)`, then waits `after` seconds. */
    click(target, { dur = 0.5, offset, after = 0.25 } = {}, fn) {
      if (target) api.moveTo(target, { dur, offset });
      clicks.push({ t });
      t += 0.08;
      if (fn) events.push({ t, fn });
      t += after;
      return api;
    },
    /** A labelled point on the scrubber. */
    mark(label) { markers.push({ t, label }); return api; },
    /** Scrolls the element `selector` finds from `from` to `to` CSS px over `dur` seconds (deterministic on seek). */
    scroll(selector, to, { from = 0, dur = 0.6 } = {}) {
      if (!scrollTargets.some((x) => x.selector === selector)) scrollTargets.push({ selector, from });
      const start = t;
      const steps = Math.max(1, Math.round(dur * 20));
      for (let i = 1; i <= steps; i++) {
        const p = i / steps, at = start + dur * p;
        events.push({ t: at, fn: (s) => { s._scroll = { ...(s._scroll || {}), [selector]: Math.round(from + (to - from) * ease(p)) }; } });
      }
      t += dur;
      return api;
    },
    build(extra = {}) {
      events.sort((a, b) => a.t - b.t);
      return { events, moves, clicks, markers, scrollTargets, duration: t, ...extra };
    },
  };
  return api;
}

/**
 * Plays a scene inside `stage` (the scaled app window) and `root` (where the markup goes).
 *   scene: { init(), render(state, ctx), script: built script, poster, fit, pointerPark }
 *   ctx:   { width, height, scale, cols(selector) } for layout-dependent rendering
 */
export function createPlayer(scene, { stage, root, ctx, onTime, onEnd, onPlayState }) {
  const { events, moves, clicks, duration, scrollTargets = [] } = scene.script;
  // Scripted scroll containers start at their declared baseline (deterministic before the first scroll event).
  const baseline = () => Object.fromEntries(scrollTargets.map((x) => [x.selector, x.from]));
  let state = Object.assign(scene.init(), { _scroll: baseline() });
  let idx = 0, time = 0, playing = false, raf = 0, last = 0, dirty = false;
  const appliedScroll = new Map();

  // Synthetic pointer: headless-style cursor and click ring inside the stage.
  const cursor = document.createElement('div');
  cursor.className = 'demo-cursor';
  cursor.innerHTML = CURSOR_SVG;
  const ring = document.createElement('div');
  ring.className = 'demo-click';
  stage.append(cursor, ring);

  function resolve(target, offset) {
    if (!target) return null;
    if (Array.isArray(target)) return { x: target[0], y: target[1] };
    const el = root.querySelector(target);
    if (!el) return null;
    const r = el.getBoundingClientRect(), s = stage.getBoundingClientRect();
    const scale = ctx.scale || 1;
    const o = offset || { x: 0.5, y: 0.5 };
    return { x: (r.left - s.left) / scale + (r.width / scale) * o.x, y: (r.top - s.top) / scale + (r.height / scale) * o.y };
  }
  const park = () => scene.pointerPark ? scene.pointerPark(ctx) : { x: ctx.width - 100, y: ctx.height - 200 };

  function pointerAt(t) {
    let from = park(), pos = from, visible = false;
    for (const m of moves) {
      if (t < m.t0) break;
      const to = resolve(m.target, m.offset);
      if (!to) continue;
      visible = true;
      if (t >= m.t1) { pos = to; from = to; continue; }
      const p = ease((t - m.t0) / (m.t1 - m.t0));
      pos = { x: from.x + (to.x - from.x) * p, y: from.y + (to.y - from.y) * p };
      break;
    }
    return { pos, visible: visible || t > 0 };
  }

  function updatePointer() {
    const { pos, visible } = pointerAt(time);
    cursor.style.transform = `translate(${pos.x.toFixed(1)}px, ${pos.y.toFixed(1)}px)`;
    cursor.style.opacity = visible && !scene.hidePointer ? '1' : '0';
    const c = clicks.find((k) => time >= k.t && time < k.t + 0.32);
    if (c) {
      const p = (time - c.t) / 0.32;
      ring.style.transform = `translate(${pos.x.toFixed(1)}px, ${pos.y.toFixed(1)}px) scale(${(0.6 + p * 0.9).toFixed(3)})`;
      ring.style.opacity = String(1 - p);
    } else ring.style.opacity = '0';
  }

  // Scripted scroll positions are absolute values in the state (so a seek backwards restores
  // them); each is written once per change. Elements marked data-stick follow their end (new
  // output) until a visitor scrolls them up, and follow again once scrolled back down.
  function applyScroll() {
    const want = state._scroll || {};
    for (const [sel, top] of Object.entries(want)) {
      const el = root.querySelector(sel);
      if (!el) continue;
      if (appliedScroll.get(sel) === top) continue;
      appliedScroll.set(sel, top);
      el.scrollTop = top;
    }
    for (const el of root.querySelectorAll('[data-stick], .dt')) {
      if (!el.__demoStickBound) {
        el.__demoStickBound = true;
        // The scroll event fires after the browser scrolled: a visitor's scroll (not one set
        // here) decides whether the container is free of the end.
        el.addEventListener('scroll', () => {
          if (el.__demoSetting) { el.__demoSetting = false; return; }
          el.__demoFree = el.scrollTop + el.clientHeight < el.scrollHeight - 6;
        }, { passive: true });
      }
      if (el.__demoFree) continue;
      const end = el.scrollHeight - el.clientHeight;
      if (end > 0 && Math.abs(el.scrollTop - end) > 1) { el.__demoSetting = true; el.scrollTop = end; }
    }
  }

  function render() {
    morph(root, scene.render(state, ctx));
    if (scene.after) scene.after(state, root, ctx);
    applyScroll();
    updatePointer();
  }

  function seek(t, { silent = false } = {}) {
    t = Math.max(0, Math.min(duration, t));
    // Backwards, or after a visitor's own view toggle (dirty): rebuild the scripted state from the start.
    if (t < time || dirty) {
      dirty = false;
      state = Object.assign(scene.init(), { _scroll: baseline() });
      idx = 0;
      appliedScroll.clear();
      for (const el of root.querySelectorAll('[data-stick], .dt, [data-session-scroll]')) { el.scrollTop = 0; el.__demoFree = false; }
      for (const x of scrollTargets) { const el = root.querySelector(x.selector); if (el) el.scrollTop = x.from; }
    }
    while (idx < events.length && events[idx].t <= t + 1e-9) events[idx++].fn(state);
    time = t;
    render();
    if (!silent && onTime) onTime(time, duration);
  }

  function frame(now) {
    raf = 0;
    if (!playing) return;
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    const next = time + dt;
    if (next >= duration) {
      seek(duration);
      playing = false;
      if (onPlayState) onPlayState(false);
      if (onEnd) onEnd();
      return;
    }
    seek(next);
    raf = requestAnimationFrame(frame);
  }

  // Live view toggles: a scene may answer a visitor's click (`scene.interact(event, state)` returns
  // true when it changed the state); the frame has paused the timer already, the view re-renders.
  // A later seek replays the script and overrides the visitor's choice, as a scrub should.
  root.addEventListener('click', (e) => {
    if (!scene.interact) return;
    let changed = false;
    try { changed = !!scene.interact(e, state, ctx); } catch { changed = false; }
    if (changed) { dirty = true; e.preventDefault(); render(); }
  });

  const api = {
    get time() { return time; },
    get duration() { return duration; },
    get playing() { return playing; },
    get state() { return state; },
    seek,
    play() {
      if (playing) return;
      if (time >= duration - 1e-6) seek(0);
      playing = true;
      last = performance.now();
      if (onPlayState) onPlayState(true);
      raf = requestAnimationFrame(frame);
    },
    pause() {
      if (!playing) return;
      playing = false;
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      if (onPlayState) onPlayState(false);
    },
    /** Re-render for a new layout (resize); the state is unchanged. */
    relayout() { render(); },
    markers: scene.script.markers,
  };
  return api;
}
