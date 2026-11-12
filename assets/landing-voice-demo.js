/* The media clock owns the dialogue. Every transcript line remains readable without JS. */
(() => {
  'use strict';
  const clock = value => {
    const seconds = Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
    return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
  };
  const setText = (node, value) => { if (node.textContent !== value) node.textContent = value; };

  document.querySelectorAll('[data-landing-voice-demo]').forEach(root => {
    if (root.dataset.lvdReady === 'true') return;
    const $ = selector => root.querySelector(selector);
    const audio = $('[data-lvd-audio]'), controls = $('[data-lvd-controls]');
    const play = $('[data-lvd-play]'), label = $('[data-lvd-play-label]'), icon = $('[data-lvd-play-icon]');
    const seek = $('[data-lvd-seek]'), time = $('[data-lvd-time]'), replay = $('[data-lvd-replay]');
    const status = $('[data-lvd-status]'), result = $('[data-lvd-result]'), resultState = $('[data-lvd-result-state]');
    const lines = [...root.querySelectorAll('[data-lvd-line]')].map(node => ({
      node, start: Number(node.dataset.start), end: Number(node.dataset.end), speaker: node.dataset.speaker,
    }));
    const people = [...root.querySelectorAll('[data-lvd-person]')].map(node => ({
      node, speaker: node.dataset.lvdPerson, state: node.querySelector('[data-lvd-person-state]'),
    }));
    const answerEnd = Number($('.lvd-answer')?.dataset.end);
    if (![audio, controls, play, label, icon, seek, time, replay, status, result, resultState].every(Boolean) ||
        typeof audio.play !== 'function' || typeof audio.pause !== 'function' ||
        !lines.length || lines.some(line => !Number.isFinite(line.start) || !Number.isFinite(line.end) || line.end <= line.start) ||
        !people.length || people.some(person => !person.state) || !Number.isFinite(answerEnd)) return;

    const expectedDuration = Number(root.dataset.lvdDuration) || 0;
    const duration = () => Number.isFinite(audio.duration) && audio.duration > 0 ? audio.duration : 0;
    let playing = false, pending = false, failed = false, finished = false;
    let request = 0, frame = 0;
    const announce = message => setText(status, message);
    const stopFrames = () => { cancelAnimationFrame(frame); frame = 0; };

    function draw() {
      const total = duration(), current = Math.max(0, audio.currentTime || 0);
      const position = lines.findIndex(line => current >= line.start && current < line.end);
      const speaking = playing && position >= 0 ? lines[position].speaker : null;
      const confirmed = current >= answerEnd;
      root.classList.toggle('is-playing', playing);
      root.dataset.lvdState = failed ? 'error' : pending ? 'loading' : playing ? 'playing' :
        finished ? 'ended' : current > 0 ? 'paused' : 'idle';
      setText(label, failed ? 'Erneut versuchen' : pending ? 'Laden abbrechen' : playing ? 'Pausieren' :
        finished ? 'Erneut anhören' : current > 0 ? 'Fortsetzen' : 'Gespräch anhören');
      setText(icon, playing || pending ? 'Ⅱ' : '▶');
      seek.disabled = !total;
      seek.value = total ? String(Math.min(100, current / total * 100)) : '0';
      seek.setAttribute('aria-valuetext', `${clock(current)} von ${clock(total || expectedDuration)}`);
      replay.disabled = !total || (!current && !finished);
      setText(time, `${clock(current)} / ${clock(total || expectedDuration)}`);
      lines.forEach((line, index) => {
        line.node.classList.toggle('is-current', index === position);
        if (index === position) line.node.setAttribute('aria-current', 'true');
        else line.node.removeAttribute('aria-current');
      });
      people.forEach(person => {
        const active = person.speaker === speaking;
        person.node.classList.toggle('is-speaking', active);
        setText(person.state, active ? 'Spricht' : speaking ? 'Hört zu' : playing ? 'Im Gespräch' :
          current > 0 && !finished && !failed ? 'Pausiert' : person.speaker === 'voice' ? 'KI-Assistent' : 'Beispielstimme');
      });
      result.classList.toggle('is-confirmed', confirmed);
      setText(resultState, confirmed ? 'Auskunft erteilt.' : 'Eine klare Auskunft.');
    }

    function tick() {
      frame = 0;
      if (!playing || document.hidden) return;
      draw();
      frame = requestAnimationFrame(tick);
    }
    function pause() {
      request += 1;
      pending = playing = false;
      stopFrames();
      audio.pause();
      draw();
    }
    function fail() {
      failed = true;
      pause();
      announce('Das Audio konnte nicht abgespielt werden. Bitte versuchen Sie es erneut. Das Gespräch können Sie unten vollständig lesen.');
    }
    function onPlaying() {
      if (document.hidden) { pause(); return; }
      if (audio.paused) return;
      pending = failed = finished = false;
      playing = true;
      announce('Beispiel wird abgespielt.');
      draw();
      if (!frame) frame = requestAnimationFrame(tick);
    }
    function start(fromBeginning = false) {
      const token = ++request;
      try {
        if (failed || audio.error) audio.load();
        if (fromBeginning || finished || audio.ended) audio.currentTime = 0;
        failed = finished = false;
        pending = true;
        playing = false;
        stopFrames();
        announce('Hörbeispiel wird geladen …');
        draw();
        // Called directly by the user's click; no autoplay or remote audio service.
        Promise.resolve(audio.play()).then(() => {
          if (token === request && !audio.paused) onPlaying();
        }).catch(error => {
          if (token !== request) return;
          if (error?.name === 'AbortError') {
            pause();
            announce('Wiedergabe pausiert.');
          } else fail();
        });
      } catch { if (token === request) fail(); }
    }

    play.addEventListener('click', () => {
      if (playing || pending || !audio.paused) {
        pause();
        announce('Wiedergabe pausiert.');
      } else start();
    });
    replay.addEventListener('click', () => start(true));
    seek.addEventListener('input', () => {
      const total = duration();
      if (!total) return;
      try {
        const percentage = Math.max(0, Math.min(100, Number(seek.value) || 0));
        audio.currentTime = total * percentage / 100;
        finished = percentage === 100;
        draw();
      } catch { announce('Diese Position ist noch nicht verfügbar. Bitte versuchen Sie es erneut.'); }
    });
    audio.addEventListener('playing', onPlaying);
    audio.addEventListener('waiting', () => {
      if (audio.paused || finished || failed) return;
      pending = true;
      playing = false;
      stopFrames();
      announce('Hörbeispiel wird geladen …');
      draw();
    });
    audio.addEventListener('pause', () => {
      if (!audio.paused) return;
      pending = playing = false;
      stopFrames();
      if (!audio.ended && !failed) announce('Wiedergabe pausiert.');
      draw();
    });
    audio.addEventListener('ended', () => {
      if (!audio.ended) return;
      request += 1;
      pending = playing = false;
      finished = true;
      stopFrames();
      announce('Beispiel beendet.');
      draw();
    });
    audio.addEventListener('error', () => { if (audio.error) fail(); });
    ['loadedmetadata', 'durationchange', 'timeupdate', 'seeked'].forEach(event => audio.addEventListener(event, draw));
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && (pending || !audio.paused)) {
        pause();
        announce('Wiedergabe pausiert.');
      }
    });
    window.addEventListener('pagehide', pause);

    draw();
    // Enhance only complete markup. Native controls and the full text are the fallback.
    audio.controls = false;
    controls.hidden = false;
    root.dataset.lvdReady = 'true';
  });
})();
