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
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const groupMotion = new Map();
  function finishGroup(item, expanded) {
    const panel = item.querySelector('.nav-panel');
    groupMotion.get(item)?.cancel();
    groupMotion.delete(item);
    item.removeAttribute('data-collapsing');
    item.open = expanded;
    panel.inert = false;
  }
  function closeGroups(except) {
    disclosures.forEach(item => { if (item !== except) finishGroup(item, false); });
  }
  function changeGroup(item, expand) {
    if ((item.open && !item.hasAttribute('data-collapsing')) === expand) return;
    const panel = item.querySelector('.nav-panel');
    const from = item.open ? panel.getBoundingClientRect().height : 0;
    groupMotion.get(item)?.cancel();
    item.open = true;
    item.toggleAttribute('data-collapsing', !expand);
    panel.inert = !expand;
    if (reducedMotion.matches || !panel.animate) {
      finishGroup(item, expand);
      return;
    }
    const to = expand ? panel.scrollHeight : 0;
    const motion = panel.animate([{height: from + 'px'}, {height: to + 'px'}], {
      duration: expand ? 230 : 175, easing: 'cubic-bezier(.22,.7,.25,1)', fill: 'both'
    });
    groupMotion.set(item, motion);
    motion.onfinish = () => {
      if (groupMotion.get(item) === motion) finishGroup(item, expand);
    };
  }
  for (const item of disclosures) {
    const summary = item.querySelector('summary');
    // Desktop and no-script navigation keep the native details behavior.
    summary.addEventListener('click', event => {
      if (!menu.open) {
        if (!item.open) closeGroups(item);
        return;
      }
      event.preventDefault();
      const expand = !item.open || item.hasAttribute('data-collapsing');
      disclosures.forEach(other => changeGroup(other, other === item && expand));
    });
    item.addEventListener('toggle', () => { if (item.open && !menu.open) closeGroups(item); });
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
  const activeVoice = document.querySelector('.voice-product-context a[aria-current]');
  if (activeVoice) {
    const strip = activeVoice.closest('.voice-product-context');
    const revealVoiceLink = () => {
      if (!mobile.matches || strip.scrollWidth <= strip.clientWidth) return;
      const bounds = strip.getBoundingClientRect(), link = activeVoice.getBoundingClientRect();
      const padding = 12;
      if (link.right > bounds.right - padding) strip.scrollLeft += link.right - bounds.right + padding;
      else if (link.left < bounds.left + padding) strip.scrollLeft += link.left - bounds.left - padding;
    };
    requestAnimationFrame(revealVoiceLink);
    window.addEventListener('aiforeu:language-ready', revealVoiceLink);
  }
  if (typeof menu.showModal !== 'function') return;

  const menuBody = menu.querySelector('.global-menu-body');
  const language = header.querySelector('[data-site-language-switch]');
  let savedScroll;
  let transition = 0;

  function keepScrollPosition() {
    if (savedScroll && (scrollX !== savedScroll.x || scrollY !== savedScroll.y)) {
      window.scrollTo({left:savedScroll.x, top:savedScroll.y, behavior:'instant'});
    }
  }
  window.addEventListener('aiforeu:language-ready', keepScrollPosition);

  function restore() {
    if (!savedScroll) return;
    header.querySelector('.global-contact').before(nav);
    if (language) toggle.before(language);
    closeGroups();
    disclosures.forEach(item => item.setAttribute('name', 'global-sections'));
    document.body.classList.remove('global-menu-open');
    document.documentElement.classList.remove('global-menu-open');
    keepScrollPosition();
    savedScroll = undefined;
    toggle.setAttribute('aria-expanded', 'false');
  }
  function reveal() {
    transition++;
    menu.setAttribute('data-visible', '');
    toggle.setAttribute('aria-expanded', 'true');
  }
  function finishClose(returnFocus) {
    menu.removeAttribute('data-visible');
    menu.close();
    restore();
    if (returnFocus) (mobile.matches ? toggle : header.querySelector('.global-brand')).focus({preventScroll:true});
  }
  function dismiss(returnFocus, immediate = false) {
    if (!menu.open) return;
    const current = ++transition;
    menu.removeAttribute('data-visible');
    toggle.setAttribute('aria-expanded', 'false');
    if (immediate || reducedMotion.matches || !menuBody.getAnimations) {
      finishClose(returnFocus);
      return;
    }
    // Native modal focus and scroll containment last through the closing motion.
    // A second tap can reverse the current CSS transition before its completion.
    Promise.allSettled(menuBody.getAnimations().map(animation => animation.finished)).then(() => {
      if (current === transition && menu.open) finishClose(returnFocus);
    });
  }
  toggle.addEventListener('click', () => {
    if (!mobile.matches || menu.open) return;
    savedScroll = {x:scrollX, y:scrollY};
    document.documentElement.classList.add('global-menu-open');
    document.body.classList.add('global-menu-open');
    mobileSlot.append(nav);
    if (language) close.before(language);
    disclosures.forEach(item => item.removeAttribute('name'));
    const current = nav.querySelector('.nav-overview[aria-current]')?.closest('.nav-section');
    closeGroups();
    if (current) current.querySelector('details').open = true;
    try {
      menu.showModal();
      menuBody.scrollTop = 0;
      close.focus({preventScroll:true});
      // Commit the closed geometry to let both Safari and Chrome interpolate.
      menuBody.getBoundingClientRect();
      reveal();
    } catch {
      restore();
      document.documentElement.classList.remove('global-nav-ready');
    }
  });
  close.addEventListener('click', () => {
    if (menu.hasAttribute('data-visible')) dismiss(true);
    else reveal();
  });
  menu.addEventListener('cancel', event => { event.preventDefault(); dismiss(true); });
  menu.addEventListener('close', () => { if (!menu.open) restore(); });
  menu.addEventListener('click', event => {
    if (event.target === menu && event.clientY >= menu.getBoundingClientRect().bottom) dismiss(true);
    else if (event.target.closest('a[href]') && event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) dismiss(false, true);
  });
  mobile.addEventListener('change', () => { dismiss(true, true); closeGroups(); });
  window.addEventListener('pagehide', () => { dismiss(false, true); closeGroups(); });
  document.documentElement.classList.add('global-nav-ready');
})();
