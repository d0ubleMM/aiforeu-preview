(() => {
  const host = document.querySelector('[data-connection-story]');
  if (!host) return;
  // Progressive enhancement: the page itself is the default. A failed script,
  // reduced-motion preference or deep link never leaves a blocking curtain.
  if (host.hasAttribute('data-connection-opening')) {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches || location.hash || window.scrollY > 80) {
      host.dataset.connectionState = 'fallback';
      return;
    }
    host.dataset.connectionActive = 'true';
  }
  const source = document.currentScript.src;
  const release = () => {
    host.removeAttribute('data-connection-active');
    host.dataset.connectionState = 'fallback';
    document.dispatchEvent(new CustomEvent('aiforeu:opening-complete'));
  };
  import(new URL('./connection-story.js', source).href)
    .catch(release);
  setTimeout(() => {
    if (host.dataset.connectionState !== 'ready') {
      release();
    }
  }, 10000);
})();
