/* AIFOREU · One deliberate heading accent per page. Text is static by default.
   Opt in on the heading itself with data-lu-worte; never split its words. */
(() => {
  'use strict';
  const preference = matchMedia('(prefers-reduced-motion: reduce)');
  if (!('IntersectionObserver' in window) || preference.matches) return;
  const heading = [...document.querySelectorAll('main h1[data-lu-worte], main h2[data-lu-worte], main h3[data-lu-worte]')]
    .find(el => el.dataset.luWorte !== 'aus'
      && !el.closest('[data-lu-schluss],[data-lu-worte="aus"]')
      && el.getClientRects().length > 0);
  if (!heading) return;

  const reveal = () => {
    heading.classList.add('lu-an');
    observer.disconnect();
    preference.removeEventListener('change', onPreference);
  };
  const observer = new IntersectionObserver(entries => {
    if (entries.some(entry => entry.isIntersecting)) reveal();
  }, { threshold: .1, rootMargin: '0px 0px -4% 0px' });
  const onPreference = () => { if (preference.matches) reveal(); };
  heading.classList.add('lu-worte-bereit');
  observer.observe(heading);
  preference.addEventListener('change', onPreference);
  onPreference();
})();
