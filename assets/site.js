(() => {
  'use strict';
  const toggle = document.querySelector('.nav-toggle');
  const nav = document.querySelector('#main-nav');
  const products = document.querySelector('.products-menu');
  const closeNav = (returnFocus = false) => {
    const wasOpen = toggle?.getAttribute('aria-expanded') === 'true';
    toggle?.setAttribute('aria-expanded', 'false');
    nav?.classList.remove('is-open');
    if (products) products.open = false;
    if (returnFocus && wasOpen) toggle.focus();
  };
  toggle?.addEventListener('click', () => {
    const open = toggle.getAttribute('aria-expanded') !== 'true';
    toggle.setAttribute('aria-expanded', String(open));
    nav.classList.toggle('is-open', open);
    if (!open && products) products.open = false;
  });
  nav?.addEventListener('click', event => { if (event.target.closest('a')) closeNav(); });
  document.addEventListener('click', event => {
    if (products?.open && !products.contains(event.target)) products.open = false;
    if (nav?.classList.contains('is-open') && !event.target.closest('.site-header')) closeNav();
  });
  document.addEventListener('keydown', event => {
    if (event.key !== 'Escape') return;
    if (nav?.classList.contains('is-open')) closeNav(true);
    else if (products?.open) { products.open = false; products.querySelector('summary').focus(); }
  });
  matchMedia('(min-width:721px)').addEventListener('change', event => { if (event.matches) closeNav(); });
  // Collapse the mobile navigation only after its controls are ready.
  if (toggle && nav) document.documentElement.classList.add('nav-ready');
  if (new URLSearchParams(location.search).get('review') === '1') document.body.classList.add('review-mode');
})();
