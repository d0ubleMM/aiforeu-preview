(() => {
  const host = document.querySelector('[data-world]');
  if (!host) return;
  const source = document.currentScript.src;
  const header = document.querySelector('.global-header');
  const headerObserver = new IntersectionObserver(([entry]) => header?.toggleAttribute('data-hero-ended', entry.boundingClientRect.bottom <= 80), {threshold: 0});
  headerObserver.observe(host);
  import(new URL('./aiforeu-innenwelt/innenwelt.js', source).href)
    .then(({ mountWorld }) => mountWorld(host))
    .catch(() => { /* Native destination links stay available. */ });
})();
