/* The six public illustrations blend once from day to night. No scroll capture. */
(() => {
 'use strict';
 const scene = document.querySelector('[data-road-scene]');
 if (!scene) return;
 const canvas = scene.querySelector('[data-road-canvas]');
 const poster = scene.querySelector('.road-scene-poster');
 const media = scene.querySelector('.road-scene-media');
 const controls = scene.querySelector('[data-road-controls]');
 const play = scene.querySelector('[data-road-play]');
 const playLabel = scene.querySelector('[data-road-play-label]');
 const icon = scene.querySelector('[data-road-icon]');
 const range = scene.querySelector('[data-road-range]');
 const time = scene.querySelector('[data-road-time]');
 const status = scene.querySelector('[data-road-status]');
 if (!canvas || !poster || !media || !controls || !play || !playLabel || !icon || !range || !time || !status) return;
 const context = canvas.getContext('2d');
 if (!context) return;
 const reduced = matchMedia('(prefers-reduced-motion: reduce)');
 const sources = (canvas.dataset.frames || '').trim().split(/\s+/).filter(Boolean);
 if (sources.length !== 6) return;
 const names = ['Mittag', 'Nachmittag', 'Später Nachmittag', 'Abend', 'Dämmerung', 'Nacht'];
 const duration = 20000;
 const clamp = value => Math.max(0, Math.min(1, value));
 const ease = value => value * value * (3 - 2 * value);
 let frames = [], position = 0, ready = false, loading = false;
 let visible = false, playing = !reduced.matches, printing = false;
 let frame = 0, previous = null, lastPaint = -Infinity;
 let width = 0, height = 0;

 function updateControls() {
  const phase = Math.round(position * (names.length - 1));
  range.value = String(Math.round(position * 1000));
  range.setAttribute('aria-valuetext', names[phase]);
  time.textContent = names[phase];
  play.hidden = reduced.matches;
  playLabel.textContent = playing ? 'Animation pausieren' : position >= 1 ? 'Noch einmal' : position > 0 ? 'Animation fortsetzen' : 'Animation abspielen';
  icon.textContent = playing ? 'Ⅱ' : position >= 1 ? '↺' : '▶';
  scene.dataset.roadState = reduced.matches ? 'reduced' : playing ? 'playing' : position >= 1 ? 'ended' : 'paused';
 }

 function cover(image, alpha) {
  const scale = Math.max(width / image.naturalWidth, height / image.naturalHeight);
  const w = image.naturalWidth * scale, h = image.naturalHeight * scale;
  context.globalAlpha = alpha;
  context.drawImage(image, (width - w) / 2, (height - h) / 2, w, h);
 }

 function paint() {
  if (!ready || !width || !height) return;
  const point = position * (frames.length - 1);
  const first = reduced.matches ? Math.round(point) : Math.floor(point);
  context.clearRect(0, 0, width, height);
  cover(frames[first], 1);
  if (!reduced.matches && first < frames.length - 1) cover(frames[first + 1], ease(point - first));
  context.globalAlpha = 1;
  updateControls();
 }

 function resize() {
  const bounds = media.getBoundingClientRect();
  if (!bounds.width || !bounds.height) return;
  width = bounds.width; height = bounds.height;
  const ratio = Math.min(devicePixelRatio || 1, 1.5, 2304 / width);
  canvas.width = Math.max(1, Math.round(width * ratio));
  canvas.height = Math.max(1, Math.round(height * ratio));
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  paint();
 }

 function canRun() {
  return ready && playing && visible && !document.hidden && !reduced.matches && !printing && position < 1;
 }

 function stopFrame() {
  cancelAnimationFrame(frame);
  frame = 0; previous = null;
 }

 function tick(now) {
  frame = 0;
  if (!canRun()) { previous = null; return; }
  if (previous !== null) position = clamp(position + Math.min(now - previous, 100) / duration);
  previous = now;
  if (position >= 1) {
   playing = false; previous = null;
   paint();
   status.textContent = 'Die Straßenszene ist beendet. Nachtansicht.';
   return;
  }
  if (now - lastPaint >= 1000 / 30) { paint(); lastPaint = now; }
  frame = requestAnimationFrame(tick);
 }

 function sync() {
  if (canRun()) { if (!frame) frame = requestAnimationFrame(tick); }
  else stopFrame();
 }

 function fallback() {
  stopFrame(); playing = false; ready = false;
  canvas.hidden = true; controls.hidden = true;
  scene.dataset.roadState = 'static';
 }

 function loadImage(source, index) {
  return new Promise((resolve, reject) => {
   const image = index === 0 ? poster : new Image();
   image.decoding = 'async';
   image.addEventListener('load', () => resolve(image), { once: true });
   image.addEventListener('error', reject, { once: true });
   if (index !== 0) image.src = source;
   if (image.complete) {
    if (image.naturalWidth) resolve(image);
    else reject(new Error('Illustration unavailable'));
   }
  });
 }

 async function load() {
  if (loading || ready) return;
  loading = true;
  try {
   frames = await Promise.all(sources.map(loadImage));
   ready = true;
   resize();
   // Reveal only after a complete first frame. The native poster always remains below.
   canvas.hidden = false; controls.hidden = false;
   updateControls(); sync();
  } catch { fallback(); }
 }

 play.addEventListener('click', () => {
  if (!ready || reduced.matches) return;
  if (position >= 1) { position = 0; playing = true; paint(); }
  else playing = !playing;
  updateControls(); sync();
  status.textContent = playing ? 'Straßenszene wird abgespielt.' : 'Straßenszene pausiert.';
 });
 range.addEventListener('focus', () => {
  playing = false; updateControls(); sync();
 });
 range.addEventListener('input', () => {
  playing = false; position = clamp(Number(range.value) / 1000);
  stopFrame(); paint();
 });
 reduced.addEventListener('change', () => {
  playing = false; position = 0;
  stopFrame(); paint(); updateControls();
 });
 document.addEventListener('visibilitychange', sync);
 window.addEventListener('pagehide', stopFrame);
 window.addEventListener('pageshow', sync);
 window.addEventListener('beforeprint', () => { printing = true; stopFrame(); });
 window.addEventListener('afterprint', () => { printing = false; resize(); sync(); });
 canvas.addEventListener('contextlost', fallback);
 if ('ResizeObserver' in window) new ResizeObserver(resize).observe(media);
 else window.addEventListener('resize', resize, { passive: true });
 if ('IntersectionObserver' in window) {
  new IntersectionObserver(entries => {
   visible = entries[0].isIntersecting;
   if (visible) load();
   sync();
  }, { threshold: .01 }).observe(scene);
 } else { visible = true; load(); }
})();
