(() => {
  'use strict';

  const opening = document.querySelector('[data-opening-film]');
  if (!opening) return;
  const title = document.getElementById('landing-title');
  const original = title.textContent.trim();
  title.dataset.i18nIgnore = '';
  function setTitle() {
    const language = document.documentElement.lang;
    const text = window.AiforeuLanguage?.t(original, 'de') || original;
    // In these two headlines the last word is the action. Other languages wrap as a whole.
    const split = /^(de|en)(-|$)/i.test(language) ? text.lastIndexOf(' ') : -1;
    if (split < 0) {
      title.textContent = text;
      return;
    }
    const action = document.createElement('em');
    action.textContent = text.slice(split + 1);
    title.replaceChildren(document.createTextNode(text.slice(0, split + 1)), action);
  }
  setTitle();
  addEventListener('aiforeu:language-ready', setTitle);

  const video = opening.querySelector('video');
  const toggle = opening.querySelector('[data-film-toggle]');
  const playLabel = toggle.querySelector('[data-play-label]');
  const pauseLabel = toggle.querySelector('[data-pause-label]');
  const portrait = matchMedia('(orientation: portrait) and (max-width: 1100px)');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const connection = navigator.connection;
  let inView = false;
  let wantsPlayback = !reduced.matches && !connection?.saveData;
  let failed = false;

  function reflectPlayback() {
    const playing = !video.paused && !video.ended;
    toggle.toggleAttribute('data-playing', playing);
    playLabel.hidden = playing;
    pauseLabel.hidden = !playing;
  }

  function sync() {
    if (!inView || document.hidden || !wantsPlayback || failed) {
      video.pause();
      return;
    }
    const source = portrait.matches ? video.dataset.portrait : video.dataset.landscape;
    if (video.getAttribute('src') !== source) {
      opening.removeAttribute('data-has-frame');
      video.src = source;
    }
    video.play().catch(error => {
      // A newer pause or source change can interrupt an older play request.
      if (error.name === 'AbortError') return;
      wantsPlayback = false;
      reflectPlayback();
    });
  }

  toggle.addEventListener('click', () => {
    wantsPlayback = video.paused;
    sync();
  });
  video.addEventListener('playing', () => {
    opening.setAttribute('data-has-frame', '');
    reflectPlayback();
  });
  video.addEventListener('pause', reflectPlayback);
  video.addEventListener('error', () => {
    failed = true;
    toggle.hidden = true;
    opening.removeAttribute('data-has-frame');
  });

  function changeFormat() {
    failed = false;
    toggle.hidden = false;
    video.pause();
    opening.removeAttribute('data-has-frame');
    sync();
  }
  function changePreference() {
    wantsPlayback = !reduced.matches && !connection?.saveData;
    if (!wantsPlayback) opening.removeAttribute('data-has-frame');
    sync();
  }
  portrait.addEventListener('change', changeFormat);
  reduced.addEventListener('change', changePreference);
  connection?.addEventListener('change', changePreference);
  document.addEventListener('visibilitychange', sync);
  addEventListener('pagehide', () => video.pause());
  addEventListener('pageshow', sync);
  toggle.hidden = false;
  new IntersectionObserver(([entry]) => {
    inView = entry.isIntersecting;
    sync();
  }).observe(opening);
})();
