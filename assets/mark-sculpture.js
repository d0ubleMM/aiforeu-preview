/* One cinematic reveal, timed to the display. Normal page scrolling stays native. */
(() => {
  'use strict';
  const host = document.querySelector('[data-mark-sculpture]');
  if (!host) return;
  const moduleURL = new URL('mark-sculpture-scene.js?v=20261118-cinema',document.currentScript.src);
  const hero = host.closest('.night'), copy = hero.querySelector('.night-copy'), stage = host.querySelector('.mark-canvas');
  const button = host.querySelector('[data-mark-motion]'), header = document.querySelector('.global-header');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  new ResizeObserver(() => hero.style.setProperty('--night-copy-height',`${copy.offsetHeight}px`)).observe(copy);
  let scene = null, loading = false, visible = false, paused = reduced.matches, manual = false;
  let elapsed = reduced.matches ? 100 : 0, frame = 0, last = 0, slow = 0;
  const pointer = {x:0,y:0}, target = {x:0,y:0};
  const ended = () => scene && elapsed >= scene.duration;
  const unsettled = () => Math.abs(target.x-pointer.x)+Math.abs(target.y-pointer.y) > .001;
  function allowed() {
    return scene && !paused && visible && !document.hidden && (!reduced.matches || manual)
      && host.hasAttribute('data-ready') && !document.body.classList.contains('global-menu-open') && !header?.hasAttribute('data-offers-open');
  }
  function label() {
    const complete = ended();
    const text = complete ? 'Animation erneut abspielen' : paused ? 'Animation abspielen' : 'Animation pausieren';
    button.setAttribute('aria-label',text); button.title = text;
    button.setAttribute('aria-pressed',String(paused || complete));
    button.firstElementChild.textContent = complete ? '↻' : paused ? '▷' : 'Ⅱ';
  }
  function tick(now) {
    frame = 0;
    if (!allowed()) { last = 0; return; }
    const delta = last ? Math.min((now-last)/1000,.06) : 0;
    last = now;
    if (delta > .025) slow++; else slow = Math.max(0,slow-1);
    if (slow > 24) { scene.lowerQuality(); slow = 0; }
    elapsed = Math.min(scene.duration,elapsed+delta);
    const smoothing = 1-Math.exp(-delta*7);
    pointer.x += (target.x-pointer.x)*smoothing;
    pointer.y += (target.y-pointer.y)*smoothing;
    scene.render(elapsed,pointer);
    if (!ended() || unsettled()) frame = requestAnimationFrame(tick);
    else { last = 0; host.dataset.moving = 'false'; label(); }
  }
  function sync() {
    const moving = allowed() && (!ended() || unsettled());
    if (moving) { if (!frame) frame = requestAnimationFrame(tick); }
    else { cancelAnimationFrame(frame); frame = 0; last = 0; }
    host.dataset.moving = String(!!moving); label();
  }
  async function load() {
    if (loading || navigator.connection?.saveData) return;
    loading = true;
    try {
      const {mountMarkSculpture} = await import(moduleURL.href);
      scene = mountMarkSculpture(stage);
      if (!scene) return;
      elapsed = Math.min(elapsed,scene.duration);
      scene.render(elapsed,pointer); host.dataset.ready = 'true'; button.hidden = false; sync();
    } catch { host.removeAttribute('data-ready'); }
  }
  new IntersectionObserver(entries => { visible = entries[0].isIntersecting; if (visible) load(); sync(); },{threshold:.05}).observe(host);
  stage.addEventListener('mark-context-restored',() => { scene?.dispose(); scene = null; loading = false; load(); });
  host.addEventListener('pointermove',event => {
    if (event.pointerType !== 'mouse' || reduced.matches || !ended()) return;
    const rect = host.getBoundingClientRect();
    target.x = (event.clientX-rect.left)/rect.width*2-1; target.y = (event.clientY-rect.top)/rect.height*2-1; sync();
  },{passive:true});
  host.addEventListener('pointerleave',() => { target.x = target.y = 0; sync(); });
  button.addEventListener('click',() => {
    if (ended()) { elapsed = 0; paused = false; pointer.x = pointer.y = target.x = target.y = 0; }
    else paused = !paused;
    manual = true; sync();
  });
  document.addEventListener('visibilitychange',sync);
  reduced.addEventListener('change',() => {
    if (reduced.matches) { paused = true; manual = false; elapsed = scene?.duration || 100; target.x = target.y = pointer.x = pointer.y = 0; scene?.render(elapsed,pointer); }
    sync();
  });
  new MutationObserver(sync).observe(document.body,{attributes:true,attributeFilter:['class']});
  new MutationObserver(sync).observe(host,{attributes:true,attributeFilter:['data-ready']});
  if (header) new MutationObserver(sync).observe(header,{attributes:true,attributeFilter:['data-offers-open']});
})();
