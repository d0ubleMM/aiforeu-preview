/* Load the paper scene only as it approaches the viewport. The HTML pile is the fallback. */
(() => {
  'use strict';
  const host = document.querySelector('[data-lu-spielfeld]');
  if (!host) return;
  const source = document.currentScript.src;
  let api = null, pending = false, leftPage = false;
  async function start() {
    if (api || pending || leftPage) return;
    pending = true;
    try {
      const { mount } = await import(new URL('./lu-spielfeld-szene.js?v=stable-1', source).href);
      const instance = await mount(host);
      if (leftPage) instance.destroy(); else api = instance;
    } catch { host.classList.remove('lu-spielfeld--bereit'); host.classList.add('lu-spielfeld--fallback'); }
    finally { pending = false; }
  }
  const observer = new IntersectionObserver(entries => { if (entries[0].isIntersecting) start(); }, { rootMargin: '200px' });
  observer.observe(host);
  addEventListener('pagehide', () => { leftPage = true; api?.destroy(); api = null; });
  addEventListener('pageshow', event => { if (event.persisted) { leftPage = false; start(); } });
})();
