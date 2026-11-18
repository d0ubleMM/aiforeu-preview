/* The scroll position drives the reveal. Scrolling itself stays entirely native. */
(() => {
  'use strict';
  const host = document.querySelector('[data-mark-sculpture]');
  if (!host) return;
  const moduleURL = new URL('mark-sculpture-scene.js?v=20261118-fragments', document.currentScript.src);
  const hero = host.closest('.night'), frameHost = hero.querySelector('.night-frame');
  const copy = hero.querySelector('.night-copy'), stage = host.querySelector('.mark-canvas');
  const header = document.querySelector('.global-header');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const pointer = {x: 0, y: 0};
  const clamp = value => Math.max(0, Math.min(1, value));
  let scene = null, loading = false, failed = false, visible = false;
  let progress = 0, target = 0, frame = 0, last = 0, measure = true, dirty = true, slow = 0;

  function staticView() { return reduced.matches || navigator.connection?.saveData || failed; }
  function allowed() {
    return scene && visible && !document.hidden && host.hasAttribute('data-ready')
      && !document.body.classList.contains('global-menu-open') && !header?.hasAttribute('data-offers-open');
  }
  function readProgress() {
    const distance = hero.offsetHeight - frameHost.offsetHeight;
    target = staticView() ? 1 : clamp(-hero.getBoundingClientRect().top / Math.max(1, distance));
    measure = false;
  }
  function paint(now) {
    frame = 0;
    if (!allowed()) { last = 0; host.dataset.moving = 'false'; return; }
    if (measure) readProgress();
    const delta = last ? Math.min((now-last)/1000, .06) : 1/60;
    last = now;
    if (delta > .025) slow++; else slow = Math.max(0, slow-1);
    if (slow > 24) { scene.lowerQuality(); slow = 0; }
    const difference = target-progress;
    progress = staticView() || Math.abs(difference) < .0004 ? target : progress + difference*(1-Math.exp(-delta*20));
    if (dirty || difference !== 0) {
      scene.render(progress*scene.duration, pointer);
      host.dataset.progress = progress.toFixed(4);
      dirty = false;
    }
    const moving = Math.abs(target-progress) > .00001;
    host.dataset.moving = String(moving);
    if (moving) frame = requestAnimationFrame(paint);
    else last = 0;
  }
  function schedule() {
    measure = true;
    if (allowed()) { if (!frame) frame = requestAnimationFrame(paint); }
    else { cancelAnimationFrame(frame); frame = 0; last = 0; host.dataset.moving = 'false'; }
  }
  function setMode() {
    hero.classList.toggle('night-static', !!staticView());
    dirty = true; schedule();
  }
  async function load() {
    if (loading || staticView()) return;
    loading = true;
    try {
      const {mountMarkSculpture} = await import(moduleURL.href);
      scene = mountMarkSculpture(stage);
      if (!scene) throw new Error('WebGL unavailable');
      readProgress(); progress = target;
      scene.render(progress*scene.duration, pointer);
      host.dataset.progress = progress.toFixed(4);
      host.dataset.pieces = String(scene.pieceCount);
      host.dataset.ready = 'true'; dirty = false; schedule();
    } catch { failed = true; host.removeAttribute('data-ready'); setMode(); }
  }
  let resizeFrame = 0;
  const observer = new ResizeObserver(() => {
    if (resizeFrame) return;
    // Writing the parent's height inside ResizeObserver causes a layout loop on short screens.
    resizeFrame = requestAnimationFrame(() => {
      resizeFrame = 0;
      hero.style.setProperty('--night-copy-height', `${copy.offsetHeight}px`);
      hero.style.setProperty('--night-frame-height', `${frameHost.offsetHeight}px`);
      dirty = true; schedule();
    });
  });
  observer.observe(copy); observer.observe(frameHost);
  new IntersectionObserver(entries => {
    visible = entries[0].isIntersecting;
    if (visible) load();
    schedule();
  }).observe(frameHost);
  stage.addEventListener('mark-context-restored', () => { scene?.dispose(); scene = null; loading = false; load(); });
  addEventListener('scroll', schedule, {passive: true});
  addEventListener('resize', schedule);
  addEventListener('pageshow', schedule);
  document.addEventListener('visibilitychange', schedule);
  reduced.addEventListener('change', () => { setMode(); if (visible) load(); });
  new MutationObserver(schedule).observe(document.body, {attributes: true, attributeFilter: ['class']});
  new MutationObserver(schedule).observe(host, {attributes: true, attributeFilter: ['data-ready']});
  if (header) new MutationObserver(schedule).observe(header, {attributes: true, attributeFilter: ['data-offers-open']});
  setMode();
})();
