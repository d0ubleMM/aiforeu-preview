(() => {
  const figure = document.querySelector('.automation-flow');
  if (!figure) return;
  const video = figure.querySelector('video');
  const cues = [...figure.querySelectorAll('[data-start]')];
  const starts = cues.map(cue => Number(cue.dataset.start));
  const duration = Number(figure.dataset.duration);
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const portrait = matchMedia('(orientation: portrait) and (max-width: 1100px)');
  let currentCue = -1, inView = true;
  let cueTimer, stallTimer, storyOrigin = 0, resumeTime = 0;
  let sourceVersion = 0, joiningFilm = false;

  function visible() {
    return inView && !document.hidden;
  }
  function useStill() {
    if (!reduced.matches) return false;
    clearTimeout(cueTimer);
    clearTimeout(stallTimer);
    figure.dataset.mode = 'still';
    if (!video.paused) video.pause();
    return true;
  }

  function selectCue(time) {
    let index = starts.length - 1;
    while (index > 0 && time < starts[index]) index--;
    if (index !== currentCue) {
      if (currentCue >= 0) cues[currentCue].removeAttribute('data-current');
      cues[index].setAttribute('data-current', '');
      figure.dataset.shot = cues[index].dataset.shot;
      currentCue = index;
    }
    return starts[index + 1] ?? duration;
  }

  function storyTime() {
    return ((performance.now() - storyOrigin) / 1000) % duration;
  }
  function advanceStory() {
    const time = storyTime();
    const next = selectCue(time);
    cueTimer = setTimeout(advanceStory, (next - time) * 1000 + 8);
  }
  function showStory() {
    if (useStill() || !visible() || figure.dataset.mode === 'story') return;
    storyOrigin = performance.now() - (video.currentTime || resumeTime) * 1000;
    figure.dataset.mode = 'story';
    advanceStory();
  }
  function allowForBuffering() {
    clearTimeout(stallTimer);
    if (!useStill() && visible()) stallTimer = setTimeout(showStory, 1400);
  }

  function showFilm() {
    if (useStill() || !visible() || video.paused || video.seeking || video.readyState < 2) return;
    clearTimeout(stallTimer);
    if (figure.dataset.mode === 'story' && !joiningFilm) {
      const time = storyTime();
      if (Math.abs(video.currentTime - time) > .45 && video.seekable.length && video.seekable.end(0) >= time) {
        joiningFilm = true;
        video.currentTime = time;
        return;
      }
    }
    clearTimeout(cueTimer);
    joiningFilm = false;
    figure.dataset.mode = 'film';
    selectCue(video.currentTime);
  }
  function start(reload = false, keepTime = false) {
    const version = ++sourceVersion;
    resumeTime = keepTime ? (figure.dataset.mode === 'story' ? storyTime() : video.currentTime || 0) : 0;
    clearTimeout(stallTimer);
    clearTimeout(cueTimer);
    joiningFilm = false;
    figure.dataset.mode = 'pending';
    selectCue(resumeTime);
    if (reload) video.load();
    if (useStill() || !visible()) return;
    allowForBuffering();
    video.play().catch(error => {
      if (version === sourceVersion && error.name !== 'AbortError') showStory();
    });
    showFilm();
  }

  video.addEventListener('loadedmetadata', () => {
    if (resumeTime > 0 && Number.isFinite(video.duration)) {
      video.currentTime = Math.min(resumeTime, video.duration - .05);
      resumeTime = 0;
    }
  });
  video.addEventListener('playing', showFilm);
  video.addEventListener('seeked', showFilm);
  video.addEventListener('timeupdate', () => {
    if (figure.dataset.mode === 'film') selectCue(video.currentTime);
  });
  video.addEventListener('waiting', allowForBuffering);
  video.addEventListener('error', showStory);
  video.addEventListener('pause', () => {
    if (!document.hidden) allowForBuffering();
  });
  function syncVisibility() {
    if (visible()) { start(false, true); return; }
    clearTimeout(stallTimer);
    clearTimeout(cueTimer);
    video.pause();
  }
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(([entry]) => {
      if (inView === entry.isIntersecting) return;
      inView = entry.isIntersecting;
      syncVisibility();
    });
    observer.observe(figure);
  }
  document.addEventListener('visibilitychange', syncVisibility);
  reduced.addEventListener('change', () => start(true));
  portrait.addEventListener('change', () => start(true, !reduced.matches));
  start();
})();
