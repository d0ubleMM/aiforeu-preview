/* AIFOREU subpages: the filmed stage at the top of a page.
   The clip loads and plays only while the stage is on screen; the still picture stays underneath.
   Once the stage has passed, the header gets its usual light bar back.
   Without this script the still picture is shown and the header keeps the stage's dark bar. */
(() => {
  'use strict';
  const stage = document.querySelector('[data-film-hero]');
  const header = document.querySelector('.global-header');
  if (stage && header) {
    let waiting = false;
    const paint = () => {
      waiting = false;
      header.toggleAttribute('data-solid', stage.getBoundingClientRect().bottom <= header.offsetHeight);
    };
    const schedule = () => { if (!waiting) { waiting = true; requestAnimationFrame(paint); } };
    addEventListener('scroll', schedule, { passive: true });
    addEventListener('resize', schedule);
    paint();
  }

  const clips = [...document.querySelectorAll('video[data-film-clip]')];
  if (!clips.length || !('IntersectionObserver' in window)) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const portrait = matchMedia('(orientation: portrait) and (max-width: 1100px)');
  const visible = new Set();

  function update(clip) {
    if (reduced.matches || navigator.connection?.saveData) {
      clip.pause();
      clip.removeAttribute('data-playing');
      if (clip.hasAttribute('src')) { clip.removeAttribute('src'); clip.load(); }
      return;
    }
    if (!visible.has(clip) || document.hidden) { clip.pause(); return; }
    const src = portrait.matches && clip.dataset.portraitSrc ? clip.dataset.portraitSrc : clip.dataset.src;
    if (clip.getAttribute('src') !== src) {
      clip.removeAttribute('data-playing');
      clip.preload = 'auto';
      clip.src = src;
    }
    clip.play().catch(() => {});
  }

  const observer = new IntersectionObserver(entries => {
    for (const {target, isIntersecting} of entries) {
      if (isIntersecting) visible.add(target);
      else visible.delete(target);
      update(target);
    }
  });
  for (const clip of clips) {
    clip.addEventListener('playing', () => clip.setAttribute('data-playing', ''));
    clip.addEventListener('error', () => clip.removeAttribute('data-playing'));
    observer.observe(clip);
  }
  reduced.addEventListener('change', () => clips.forEach(update));
  portrait.addEventListener('change', () => clips.forEach(update));
  document.addEventListener('visibilitychange', () => clips.forEach(update));
})();
