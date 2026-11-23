/* All state comes from the native media element, including keyboard seeks. */
(() => {
  'use strict';

  function mount(root) {
    if (root.hasAttribute('data-ready')) return;
    const audio = root.querySelector('[data-call-audio]');
    const play = root.querySelector('[data-call-play]');
    const seek = root.querySelector('[data-call-seek]');
    const clock = root.querySelector('[data-call-time]');
    const wave = root.querySelector('[data-call-wave]');
    const error = root.querySelector('[data-call-error]');
    const actions = [...root.querySelectorAll('[data-call-action]')];
    const lines = [...root.querySelectorAll('[data-call-line]')];
    const tabs = [...root.querySelectorAll('[data-call-tab]')];
    const panels = [...root.querySelectorAll('[data-call-panel]')];
    let pendingSeek = null;

    function selectPanel(tab, focus = false) {
      for (const option of tabs) {
        const selected = option === tab;
        option.setAttribute('aria-selected', String(selected));
        option.tabIndex = selected ? 0 : -1;
      }
      for (const panel of panels) {
        panel.hidden = panel.dataset.callPanel !== tab.dataset.callTab;
      }
      if (focus) tab.focus({preventScroll: true});
    }

    function render() {
      const duration = Number.isFinite(audio.duration) ? audio.duration : Number(seek.max);
      const time = Math.min(pendingSeek ?? audio.currentTime, duration);
      const stamp = `${Math.floor(time / 60)}:${String(Math.floor(time % 60)).padStart(2, '0')}`;
      const playing = !audio.error && !audio.paused && !audio.ended;
      const action = audio.ended ? 'replay' : playing ? 'pause' : 'play';
      seek.max = String(duration);
      seek.value = String(time);
      seek.setAttribute('aria-valuetext', stamp);
      if (clock.value !== stamp) clock.value = stamp;
      wave.style.setProperty('--heard', String(time / duration));
      root.toggleAttribute('data-playing', playing);
      for (const item of actions) item.hidden = item.dataset.callAction !== action;
      for (const line of lines) {
        if (time >= Number(line.dataset.start) && time < Number(line.dataset.end)) {
          line.setAttribute('aria-current', 'true');
        } else {
          line.removeAttribute('aria-current');
        }
      }
    }

    function showError() {
      audio.pause();
      pendingSeek = null;
      error.hidden = false;
      render();
    }

    play.addEventListener('click', async () => {
      if (!audio.paused && !audio.error) {
        audio.pause();
        return;
      }
      error.hidden = true;
      if (audio.error) audio.load();
      if (audio.ended) audio.currentTime = 0;
      try {
        await audio.play();
      } catch (reason) {
        if (reason.name !== 'AbortError') showError();
      }
    });

    seek.addEventListener('input', () => {
      const target = Number(seek.value);
      if (!audio.readyState) {
        pendingSeek = target;
        if (audio.networkState !== HTMLMediaElement.NETWORK_LOADING) audio.load();
        render();
      } else {
        audio.currentTime = target;
        render();
      }
    });
    audio.addEventListener('loadedmetadata', () => {
      if (pendingSeek !== null) {
        audio.currentTime = Math.min(audio.duration, pendingSeek);
        pendingSeek = null;
      }
      render();
    });
    audio.addEventListener('error', showError);
    for (const event of ['timeupdate', 'play', 'playing', 'pause', 'ended', 'seeked']) {
      audio.addEventListener(event, render);
    }
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) audio.pause();
    });

    for (const [index, tab] of tabs.entries()) {
      tab.setAttribute('role', 'tab');
      tab.addEventListener('click', () => selectPanel(tab));
      tab.addEventListener('keydown', event => {
        const last = tabs.length - 1;
        const indices = {ArrowLeft: (index + last) % tabs.length, ArrowRight: (index + 1) % tabs.length, Home: 0, End: last};
        if (!Object.hasOwn(indices, event.key)) return;
        event.preventDefault();
        selectPanel(tabs[indices[event.key]], true);
      });
    }
    for (const panel of panels) {
      panel.setAttribute('role', 'tabpanel');
      panel.setAttribute('aria-labelledby', `ac-tab-${panel.dataset.callPanel}`);
      panel.tabIndex = 0;
    }
    const next = root.querySelector('[data-call-next]');
    next.hidden = false;
    next.addEventListener('click', () => selectPanel(tabs.find(tab => tab.dataset.callTab === 'handoff'), true));
    const tabList = root.querySelector('[data-call-tabs]');
    tabList.setAttribute('role', 'tablist');
    tabList.hidden = false;
    selectPanel(tabs[0]);
    render();
    root.querySelector('[data-call-transport]').hidden = false;
    root.setAttribute('data-ready', '');
  }

  document.querySelectorAll('[data-call-demo]').forEach(mount);
})();
