/* The same DOM-rendered previews used on ive.dev. Only public sample data. */
(() => {
  'use strict';
  const hosts = [...document.querySelectorAll('[data-ive-preview]')];
  if (!hosts.length || !('IntersectionObserver' in window)) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const previews = hosts.map(host => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'ive-preview-toggle';
    button.hidden = true;
    host.after(button);
    return { host, button, frame: null, ready: false, visible: false, paused: reduced.matches, playing: false };
  });
  const send = (p, type, extra = {}) => p.frame?.contentWindow?.postMessage({ target: 'ive-demo', type, ...extra }, location.origin);
  function sync(p) {
    if (!p.ready) return;
    const playing = p.visible && !p.paused && !document.hidden && !p.host.closest('[hidden]');
    if (playing !== p.playing) {
      send(p, playing ? 'play' : 'pause');
      p.playing = playing;
    }
    p.button.textContent = p.paused ? 'Abspielen' : 'Pause';
    p.button.setAttribute('aria-label', p.paused ? 'IVE-Vorschau abspielen' : 'IVE-Vorschau anhalten');
    p.button.setAttribute('aria-pressed', String(p.paused));
  }
  function mount(p) {
    if (p.frame) return;
    const frame = document.createElement('iframe');
    frame.className = 'ive-preview-frame';
    frame.title = 'Animierte IVE-Produktvorschau mit Beispieldaten';
    frame.tabIndex = -1;
    frame.setAttribute('aria-hidden', 'true');
    frame.inert = true;
    const params = new URLSearchParams({ scene: p.host.dataset.ivePreview, theme: p.host.dataset.iveTheme || 'light', minScale: '1' });
    frame.src = `assets/ive/demo/r5/frame.html?${params}`;
    p.frame = frame;
    p.host.append(frame);
  }
  previews.forEach(p => p.button.addEventListener('click', () => { p.paused = !p.paused; sync(p); }));
  window.addEventListener('message', event => {
    if (event.origin !== location.origin || event.data?.source !== 'ive-demo') return;
    const p = previews.find(item => item.frame?.contentWindow === event.source);
    if (!p) return;
    if (event.data.type === 'ready') {
      p.ready = true;
      p.host.classList.add('ive-preview-ready');
      p.button.hidden = false;
      sync(p);
    } else if (event.data.type === 'ended') {
      p.playing = false;
      send(p, 'seek', { time: 0 });
      sync(p);
    } else if (event.data.type === 'error') {
      p.ready = false;
      p.button.hidden = true;
      p.host.classList.remove('ive-preview-ready');
    }
  });
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      const p = previews.find(item => item.host === entry.target);
      p.visible = entry.isIntersecting;
      if (p.visible) mount(p);
      sync(p);
    });
  }, { threshold: 0.08 });
  previews.forEach(p => observer.observe(p.host));
  // A tab switch must pause the previous scene immediately, including off-screen tabs.
  const hiddenObserver = new MutationObserver(() => previews.forEach(sync));
  document.querySelectorAll('[data-ive-panel]').forEach(panel => hiddenObserver.observe(panel, { attributes: true, attributeFilter: ['hidden'] }));
  document.addEventListener('visibilitychange', () => previews.forEach(sync));
  reduced.addEventListener('change', () => { previews.forEach(p => { p.paused = reduced.matches; sync(p); }); });
})();
