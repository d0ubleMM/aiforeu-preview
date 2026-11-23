(() => {
  'use strict';
  if (new URLSearchParams(location.search).get('review') === '1') document.body.classList.add('review-mode');
  const header = document.querySelector('.global-header');
  const nav = header?.querySelector('.global-navigation');
  if (!nav) return;

  const menu = document.getElementById('global-menu');
  const toggle = header.querySelector('.global-menu-toggle');
  const close = menu.querySelector('.global-menu-close');
  const mobileSlot = menu.querySelector('[data-mobile-navigation]');
  const groups = [...nav.querySelectorAll('.nav-section')];
  const disclosures = groups.map(group => group.querySelector('details'));
  const mobile = matchMedia('(max-width: 1000px)');
  const normalize = path => path.replace(/(?:index\.html)?\/$|\/index\.html$/, '') || '/';
  const pathnameOf = href => new URL(href, location.href).pathname;

  const siteRoot = new URL('.', header.querySelector('.global-brand').href);
  function updateLocation() {
    const path = normalize(location.pathname);
    for (const link of [...nav.querySelectorAll('a[href]'), header.querySelector('.global-contact')]) {
      const href = pathnameOf(link.href);
      const related = [link.dataset.related, link.dataset.relatedAlt].filter(Boolean);
      const nested = (href.endsWith('/') && path.startsWith(href)) ||
        related.some(prefix => (path + '/').startsWith(new URL(prefix, siteRoot).pathname));
      if (normalize(href) === path) link.setAttribute('aria-current', 'page');
      else if (nested) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    }
    for (const group of groups) {
      if (group.querySelector('.nav-panel [aria-current]')) {
        const overview = group.querySelector('.nav-overview');
        if (!overview.hasAttribute('aria-current')) overview.setAttribute('aria-current', 'location');
      }
    }
  }
  function closeGroups(except) {
    disclosures.forEach(item => { if (item !== except) item.open = false; });
  }
  for (const item of disclosures) {
    const summary = item.querySelector('summary');
    // Native disclosure remains available before scripts load and with JS disabled.
    summary.addEventListener('click', () => { if (!item.open) closeGroups(item); });
    item.addEventListener('toggle', () => { if (item.open) closeGroups(item); });
    item.closest('.nav-section').addEventListener('keydown', event => {
      if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
      if (event.target !== summary && !event.target.matches('.nav-overview')) return;
      event.preventDefault();
      closeGroups(item);
      item.open = true;
      const links = item.querySelectorAll('a[href]');
      links[event.key === 'ArrowDown' ? 0 : links.length - 1]?.focus();
    });
  }
  document.addEventListener('click', event => {
    if (!menu.open && !event.target.closest('.nav-section')) closeGroups();
  });
  document.addEventListener('focusin', event => {
    if (!mobile.matches) closeGroups(event.target.closest('.nav-section')?.querySelector('details'));
  });
  document.addEventListener('keydown', event => {
    const open = disclosures.find(item => item.open);
    if (event.key !== 'Escape' || !open || menu.open) return;
    event.preventDefault();
    open.open = false;
    open.querySelector('summary').focus({preventScroll:true});
  });
  window.addEventListener('aiforeu:route', updateLocation);
  window.addEventListener('pageshow', updateLocation);
  updateLocation();
  if (typeof menu.showModal !== 'function') return;

  let savedScroll;
  function restore() {
    if (!savedScroll) return;
    // Move the very same nav back so translation, aria-current and focus agree.
    header.querySelector('.global-contact').before(nav);
    closeGroups();
    document.body.classList.remove('global-menu-open');
    document.body.style.removeProperty('--global-lock-top');
    document.body.style.removeProperty('--global-lock-padding');
    window.scrollTo({left:savedScroll.x, top:savedScroll.y, behavior:'instant'});
    savedScroll = undefined;
    toggle.setAttribute('aria-expanded', 'false');
  }
  function dismiss(returnFocus) {
    if (!menu.open) return;
    menu.close();
    restore();
    if (returnFocus) (mobile.matches ? toggle : header.querySelector('.global-brand')).focus({preventScroll:true});
  }
  toggle.addEventListener('click', () => {
    if (!mobile.matches || menu.open) return;
    const gutter = Math.max(0, innerWidth - document.documentElement.clientWidth);
    const padding = parseFloat(getComputedStyle(document.body).paddingRight) || 0;
    savedScroll = {x:scrollX, y:scrollY};
    document.body.style.setProperty('--global-lock-top', -scrollY + 'px');
    document.body.style.setProperty('--global-lock-padding', (padding + gutter) + 'px');
    document.body.classList.add('global-menu-open');
    mobileSlot.append(nav);
    const group = nav.querySelector('.nav-overview[aria-current]')?.closest('.nav-section') || groups[0];
    closeGroups();
    group.querySelector('details').open = true;
    try {
      menu.showModal();
      menu.scrollTop = 0;
      toggle.setAttribute('aria-expanded', 'true');
      close.focus({preventScroll:true});
    } catch {
      restore();
      document.documentElement.classList.remove('global-nav-ready');
    }
  });
  close.addEventListener('click', () => dismiss(true));
  menu.addEventListener('cancel', event => { event.preventDefault(); dismiss(true); });
  menu.addEventListener('close', () => { if (!menu.open) restore(); });
  menu.addEventListener('click', event => {
    if (event.target.closest('a[href]') && event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) dismiss(false);
  });
  mobile.addEventListener('change', () => { dismiss(true); closeGroups(); });
  window.addEventListener('pagehide', () => { dismiss(false); closeGroups(); });
  document.documentElement.classList.add('global-nav-ready');
})();
