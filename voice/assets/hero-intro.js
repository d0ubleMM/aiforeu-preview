/* One scroll-built composition: the filaments grow, then the whole heading resolves. */
(() => {
  'use strict';
  const sequence = document.querySelector('.hero-sequence');
  const hero = sequence?.querySelector('.hero');
  const title = hero?.querySelector('h1');
  const canvas = hero?.querySelector('canvas');
  if (!title || !hero.querySelector('.has-particles')) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const clamp = value => Math.max(0, Math.min(1, value));
  let enabled = false, progress = 0, frame = 0, start = 0, distance = 0;
  let completed = reduced.matches, titleShown = false, titleAnimation = null;

  function show(immediate = false) {
    // The heading resolves completely even if scrolling stops halfway through.
    // No resting state contains faded or sliced-up words.
    if (!titleShown && progress >= .22) {
      titleShown = true;
      hero.style.setProperty('--hero-title-visible', '1');
      if (!immediate && progress < 1 && title.animate) {
        titleAnimation = title.animate([
          { opacity: 0, transform: 'scale(1.045)' },
          { opacity: 1, transform: 'none' }
        ], { duration: 700, easing: 'cubic-bezier(.16,1,.3,1)', fill: 'both' });
        const animation = titleAnimation;
        animation.onfinish = () => { if (titleAnimation === animation) { animation.cancel(); titleAnimation = null; } };
      }
    }
    if (immediate) { titleAnimation?.cancel(); titleAnimation = null; }
    hero.dataset.formation = progress.toFixed(4);
    hero.dispatchEvent(new CustomEvent('govvoice:formation', { detail: progress }));
  }

  function measure() {
    if (!enabled) return;
    const headerHeight = document.querySelector('.site-header').getBoundingClientRect().height;
    const sticky = innerHeight >= 700;
    sequence.classList.toggle('is-sticky', sticky);
    sequence.style.setProperty('--hero-sticky-top', `${headerHeight}px`);
    sequence.style.setProperty('--hero-stage-height', `${hero.offsetHeight}px`);
    // One and a half readable viewport heights keep the buildup unhurried.
    // Short landscape windows keep the unpinned, compact fallback.
    distance = Math.round(sticky ? (innerHeight - headerHeight) * 1.5 : innerHeight * .28);
    sequence.style.setProperty('--hero-travel', `${distance}px`);
    start = sequence.getBoundingClientRect().top + scrollY - headerHeight;
  }

  function update() {
    frame = 0;
    if (!enabled || document.hidden) return;
    const next = Math.max(progress, clamp((scrollY - start) / distance));
    if (next !== progress) {
      progress = next;
      completed ||= progress === 1;
      show();
    }
  }

  function schedule() {
    if (enabled && !frame && !document.hidden) frame = requestAnimationFrame(update);
  }

  function finish() {
    completed = true;
    if (!enabled) return;
    progress = 1;
    show(true);
  }

  function stop() {
    enabled = false;
    cancelAnimationFrame(frame);
    frame = 0;
    titleAnimation?.cancel();
    titleAnimation = null;
    sequence.classList.remove('is-building', 'is-sticky');
    hero.style.removeProperty('--hero-title-visible');
    hero.removeAttribute('data-formation');
    hero.dispatchEvent(new CustomEvent('govvoice:formation', { detail: 1 }));
  }

  function enable() {
    if (enabled || reduced.matches || !hero.querySelector('.has-particles')) return;
    // A direct link opens its destination immediately, without an extra intro.
    if (location.hash && location.hash !== '#main') { completed = true; return; }
    enabled = true;
    progress = completed ? 1 : 0;
    titleShown = false;
    hero.style.setProperty('--hero-title-visible', '0');
    sequence.classList.add('is-building');
    measure();
    show();
    update();
  }

  document.addEventListener('focusin', event => {
    if (event.target.id === 'main' ||
      (event.target.matches('a,button') && hero.contains(event.target))) finish();
  });
  hero.addEventListener('click', event => {
    if (event.target.closest('.actions')) finish();
  });
  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', () => { measure(); schedule(); }, { passive: true });
  new ResizeObserver(() => { measure(); schedule(); }).observe(hero);
  window.addEventListener('hashchange', () => { if (location.hash) finish(); });
  window.addEventListener('pageshow', schedule);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) schedule(); });
  window.addEventListener('beforeprint', () => { completed = true; stop(); });
  window.addEventListener('afterprint', enable);
  reduced.addEventListener('change', () => { if (reduced.matches) { completed = true; stop(); } else enable(); });
  canvas.addEventListener('contextlost', () => { completed = true; stop(); });
  canvas.addEventListener('contextrestored', enable);
  try { enable(); } catch (error) { stop(); console.warn('Hero intro unavailable; showing the static composition.', error); }
})();
