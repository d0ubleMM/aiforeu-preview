(() => {
  const stage = document.querySelector('.automation-media');
  if (!stage) return;
  const video = stage.querySelector('video');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const portrait = matchMedia('(orientation: portrait) and (max-width: 1100px)');

  function showFilm() {
    stage.toggleAttribute('data-playing', !reduced.matches && !video.paused && video.readyState >= 2 && !video.error);
  }
  function showPicture() {
    stage.removeAttribute('data-playing');
  }
  function playWhenAllowed() {
    if (reduced.matches) return;
    video.play().catch(() => {
      if (video.paused) showPicture();
    });
  }
  function chooseSource() {
    showPicture();
    video.load();
    playWhenAllowed();
  }

  video.addEventListener('playing', showFilm);
  for (const type of ['pause', 'waiting', 'emptied', 'error']) video.addEventListener(type, showPicture);
  reduced.addEventListener('change', chooseSource);
  portrait.addEventListener('change', chooseSource);
  showFilm();
  playWhenAllowed();
})();
