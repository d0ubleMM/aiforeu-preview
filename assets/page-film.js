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
  const connection = navigator.connection;
  const updates = new Map();
  const visible = new Set();
  const observer = new IntersectionObserver(entries => {
    for (const {target, isIntersecting} of entries) {
      if (isIntersecting) visible.add(target);
      else visible.delete(target);
      updates.get(target)();
    }
  });

  for (const clip of clips) {
    const container = clip.parentElement;
    const button = container.querySelector('[data-film-toggle]');
    const pauseAction = button?.querySelector('[data-film-action="pause"]');
    const playAction = button?.querySelector('[data-film-action="play"]');
    const portrait = matchMedia(container.querySelector('picture source[media]')?.media
      || '(orientation: portrait) and (max-width: 1100px)');
    let pausedByUser = false;
    let needsGesture = false;
    let failedSource = '';

    function controls(playing) {
      if (!button) return;
      button.hidden = false;
      pauseAction.hidden = !playing;
      playAction.hidden = playing;
    }

    function update() {
      if (reduced.matches || connection?.saveData) {
        if (button) button.hidden = true;
        clip.pause();
        clip.removeAttribute('data-playing');
        if (clip.hasAttribute('src')) { clip.removeAttribute('src'); clip.load(); }
        return;
      }
      if (!visible.has(clip) || document.hidden) { clip.pause(); return; }
      const src = portrait.matches && clip.dataset.portraitSrc ? clip.dataset.portraitSrc : clip.dataset.src;
      if (clip.getAttribute('src') !== src) {
        clip.removeAttribute('data-playing');
        failedSource = '';
        needsGesture = false;
        clip.preload = pausedByUser ? 'none' : 'auto';
        clip.src = src;
      }
      if (failedSource === src) return;
      if (pausedByUser || needsGesture) { controls(false); return; }
      if (!clip.paused) return;
      clip.play().catch(error => {
        if (error.name === 'AbortError' || clip.getAttribute('src') !== src) return;
        clip.removeAttribute('data-playing');
        if (error.name === 'NotAllowedError' && button) {
          needsGesture = true;
          controls(false);
        }
      });
    }

    button?.addEventListener('click', () => {
      if (!playAction.hidden) {
        pausedByUser = false;
        needsGesture = false;
        update();
      } else {
        pausedByUser = true;
        clip.pause();
        controls(false);
      }
    });
    clip.addEventListener('playing', () => {
      if (reduced.matches || connection?.saveData || pausedByUser || document.hidden || !visible.has(clip)) {
        clip.pause();
        return;
      }
      clip.setAttribute('data-playing', '');
      controls(true);
    });
    clip.addEventListener('error', () => {
      failedSource = clip.getAttribute('src');
      clip.removeAttribute('data-playing');
      if (button) button.hidden = true;
    });
    portrait.addEventListener('change', update);
    updates.set(clip, update);
    observer.observe(clip);
  }

  function updateAll() { updates.forEach(update => update()); }
  reduced.addEventListener('change', updateAll);
  connection?.addEventListener?.('change', updateAll);
  document.addEventListener('visibilitychange', updateAll);
})();
