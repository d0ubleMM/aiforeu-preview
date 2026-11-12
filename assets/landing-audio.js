/* A real, prerecorded Voice example. Native controls remain until setup succeeds. */
(() => {
  'use strict';

  const formatTime = value => {
    const seconds = Math.max(0, Math.floor(Number(value) || 0));
    return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
  };

  document.querySelectorAll('[data-landing-audio]').forEach(root => {
    const audio = root.querySelector('audio');
    const toggle = root.querySelector('[data-audio-toggle]');
    const icon = root.querySelector('[data-audio-icon]');
    const label = root.querySelector('[data-audio-label]');
    const seek = root.querySelector('[data-audio-seek]');
    const time = root.querySelector('[data-audio-time]');
    const status = root.querySelector('[data-audio-status]');
    if (!audio || !toggle || !icon || !label || !seek || !time || !status ||
        typeof audio.play !== 'function' || typeof audio.pause !== 'function') return;
    if (root.dataset.audioEnhanced === 'true') return;

    let request = 0;
    let pending = false;
    let playing = false;
    let failed = false;
    let finished = false;

    const duration = () => Number.isFinite(audio.duration) && audio.duration > 0 ? audio.duration : 0;
    const announce = message => {
      if (status.textContent !== message) status.textContent = message;
    };

    function updateTime() {
      const total = duration();
      const current = Math.max(0, Number(audio.currentTime) || 0);
      seek.disabled = !total;
      seek.value = total ? String(Math.min(100, current / total * 100)) : '0';
      seek.setAttribute('aria-valuetext', total ? `${formatTime(current)} von ${formatTime(total)}` : 'Dauer noch nicht geladen');
      time.textContent = total ? `${formatTime(current)} / ${formatTime(total)}` : formatTime(current);
    }

    function render() {
      root.classList.toggle('is-playing', playing);
      icon.textContent = playing || pending ? 'Ⅱ' : '▶';
      label.textContent = failed ? 'Erneut versuchen' : pending ? 'Laden abbrechen' :
        playing ? 'Pausieren' : finished ? 'Erneut anhören' :
          audio.currentTime > 0 ? 'Fortsetzen' : 'Beispiel anhören';
      updateTime();
    }

    function pause() {
      request += 1;
      pending = playing = false;
      audio.pause();
      render();
    }

    function fail() {
      pause();
      failed = true;
      announce('Das Hörbeispiel konnte nicht abgespielt werden. Bitte versuchen Sie es erneut.');
      render();
    }

    toggle.addEventListener('click', () => {
      if (playing || pending || !audio.paused) {
        pause();
        announce('Wiedergabe pausiert.');
        return;
      }
      const token = ++request;
      if (failed || audio.error) audio.load();
      if (finished || audio.ended) audio.currentTime = 0;
      failed = finished = false;
      pending = true;
      announce('Hörbeispiel wird geladen …');
      render();
      try {
        // Remain in the user gesture: browsers may reject delayed audio playback.
        const playback = audio.play();
        Promise.resolve(playback).catch(error => {
          if (token !== request) return;
          if (error?.name === 'AbortError') {
            pending = playing = false;
            announce('Wiedergabe pausiert.');
            render();
          } else fail();
        });
      } catch {
        if (token === request) fail();
      }
    });

    seek.addEventListener('input', () => {
      const total = duration();
      if (!total) return;
      const position = Math.max(0, Math.min(100, Number(seek.value) || 0));
      try {
        audio.currentTime = total * position / 100;
        finished = position === 100;
        render();
      } catch {
        announce('Diese Position ist noch nicht verfügbar. Bitte versuchen Sie es erneut.');
        updateTime();
      }
    });

    audio.addEventListener('playing', () => {
      if (document.hidden) { pause(); return; }
      pending = failed = finished = false;
      playing = true;
      announce('Beispiel wird abgespielt.');
      render();
    });
    audio.addEventListener('waiting', () => {
      if (audio.paused || finished || failed) return;
      playing = false;
      pending = true;
      announce('Hörbeispiel wird geladen …');
      render();
    });
    audio.addEventListener('pause', () => {
      pending = playing = false;
      if (!audio.ended && !failed) announce('Wiedergabe pausiert.');
      render();
    });
    audio.addEventListener('ended', () => {
      request += 1;
      pending = playing = false;
      finished = true;
      announce('Beispiel beendet.');
      render();
    });
    audio.addEventListener('error', fail);
    ['loadedmetadata', 'durationchange', 'timeupdate', 'seeked'].forEach(event => {
      audio.addEventListener(event, updateTime);
    });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && (pending || !audio.paused)) {
        pause();
        announce('Wiedergabe pausiert.');
      }
    });
    window.addEventListener('pagehide', pause);

    seek.step = '1';
    render();
    // No load/play call during setup. No-JS and incomplete markup retain controls.
    audio.controls = false;
    toggle.hidden = seek.hidden = false;
    root.dataset.audioEnhanced = 'true';
  });
})();
