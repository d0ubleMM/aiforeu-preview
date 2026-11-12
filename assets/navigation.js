(() => {
  'use strict';
  if (new URLSearchParams(location.search).get('review') === '1') document.body.classList.add('review-mode');

  const header = document.querySelector('.global-header');
  const toggle = header?.querySelector('.global-menu-toggle');
  const menu = document.querySelector('#global-menu');
  const closeButton = menu?.querySelector('.global-menu-close');
  // Without native dialog support, the navigation stays visible in normal flow.
  if (!toggle || !closeButton || typeof menu?.showModal !== 'function') return;

  const mobile = matchMedia('(max-width:1000px)');
  const reduced = matchMedia('(prefers-reduced-motion:reduce)');
  let position = null;
  let closeTimer = 0;
  let closing = false;

  function lockScroll() {
    if (position) return;
    const padding = parseFloat(getComputedStyle(document.body).paddingRight) || 0;
    const scrollbar = Math.max(0, innerWidth - document.documentElement.clientWidth);
    position = { x: scrollX, y: scrollY };
    document.body.style.setProperty('--global-lock-top', `${-position.y}px`);
    document.body.style.setProperty('--global-lock-padding', `${padding + scrollbar}px`);
    document.body.classList.add('global-menu-open');
  }

  function unlockScroll() {
    if (!position) return;
    const saved = position;
    position = null;
    document.body.classList.remove('global-menu-open');
    document.body.style.removeProperty('--global-lock-top');
    document.body.style.removeProperty('--global-lock-padding');
    window.scrollTo({ top: saved.y, left: saved.x, behavior: 'instant' });
  }

  function finishClose(returnFocus = true) {
    clearTimeout(closeTimer);
    closing = false;
    menu.classList.remove('is-closing');
    if (menu.open) menu.close();
    unlockScroll();
    toggle.setAttribute('aria-expanded', 'false');
    if (returnFocus && mobile.matches) toggle.focus({ preventScroll: true });
  }

  function closeMenu({ animate = true, returnFocus = true } = {}) {
    if (!menu.open) return;
    if (!animate || reduced.matches) { finishClose(returnFocus); return; }
    if (closing) return;
    closing = true;
    menu.classList.add('is-closing');
    // The timeout also completes closing in a background tab or with missing CSS.
    closeTimer = setTimeout(() => finishClose(returnFocus), 190);
  }

  function openMenu() {
    if (!mobile.matches || menu.open) return;
    clearTimeout(closeTimer);
    closing = false;
    menu.classList.remove('is-closing');
    lockScroll();
    try {
      menu.showModal();
      toggle.setAttribute('aria-expanded', 'true');
      menu.scrollTop = 0;
      closeButton.focus({ preventScroll: true });
    } catch (error) {
      unlockScroll();
      // An unusable modal must not leave the links hidden.
      document.documentElement.classList.remove('global-nav-ready');
    }
  }

  toggle.addEventListener('click', openMenu);
  closeButton.addEventListener('click', () => closeMenu());
  menu.addEventListener('cancel', event => { event.preventDefault(); closeMenu(); });
  menu.addEventListener('click', event => {
    const link = event.target.closest('a[href]');
    if (!link || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    // Restore the page before the native link handles its URL or anchor.
    closeMenu({ animate: false, returnFocus: false });
  });
  menu.addEventListener('close', () => {
    if (menu.open) return;
    clearTimeout(closeTimer);
    closing = false;
    menu.classList.remove('is-closing');
    unlockScroll();
    toggle.setAttribute('aria-expanded', 'false');
  });
  mobile.addEventListener('change', event => {
    if (event.matches || !menu.open) return;
    const hadFocus = menu.contains(document.activeElement);
    closeMenu({ animate: false, returnFocus: false });
    if (hadFocus) header.querySelector('.global-brand').focus({ preventScroll: true });
  });
  reduced.addEventListener('change', () => { if (reduced.matches && closing) finishClose(); });
  window.addEventListener('pagehide', () => closeMenu({ animate: false, returnFocus: false }));
  window.addEventListener('beforeprint', () => closeMenu({ animate: false, returnFocus: false }));

  // Set only after every control is bound; JS/CSS delivery failures retain the fallback.
  document.documentElement.classList.add('global-nav-ready');
})();
