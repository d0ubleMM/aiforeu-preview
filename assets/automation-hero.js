(() => {
  const media = document.querySelector('.automation-media');
  if (!media) return;
  const clip = media.querySelector('video');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');

  // The vector underneath already runs. Reveal the movie only after it plays.
  function reflect() {
    media.toggleAttribute('data-playing', !reduced.matches && !clip.paused && clip.readyState >= 2 && !clip.error);
  }
  clip.addEventListener('playing', reflect);
  for (const event of ['pause', 'waiting', 'emptied', 'error']) {
    clip.addEventListener(event, () => media.removeAttribute('data-playing'));
  }
  reduced.addEventListener('change', () => {
    media.removeAttribute('data-playing');
    clip.load();
  });
  reflect();
})();
