/* Different treatments for different sections; most reading content stays static. */
(() => {
  'use strict';
  if (!document.querySelector('.landing-hero') || !Element.prototype.animate) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let items = [], frame = 0, lastWidth = 0, enabled = false, observer;

  function clear(item) {
    item.animation?.cancel();
    item.animation = null;
    item.node.style.removeProperty('transform');
    item.node.style.removeProperty('opacity');
    item.node.style.removeProperty('clip-path');
    item.node.style.removeProperty('filter');
    item.node.style.removeProperty('will-change');
  }

  function stop() {
    enabled = false;
    cancelAnimationFrame(frame);
    frame = 0;
    observer?.disconnect();
    items.forEach(item => { clear(item); item.node.removeAttribute('data-motion'); });
    items = [];
    document.body.classList.remove('landing-motion');
  }

  function add(node, kind = 'fade', delay = 0, anchor = node) {
    if (!node || items.some(item => item.node === node)) return;
    node.dataset.motion = kind;
    items.push({ node, anchor, kind, delay, seen: false, ever: false,
      animation: null, top: 0, height: 0 });
  }

  function measure() {
    // Layout offsets ignore animated transforms, avoiding scroll feedback/jitter.
    for (const item of items) {
      let top = 0;
      for (let node = item.anchor; node; node = node.offsetParent) top += node.offsetTop;
      item.top = top;
      item.height = item.anchor.offsetHeight;
    }
  }

  function protectedItem(item) {
    const active = document.activeElement;
    return item.node.contains(active) || item.anchor.contains(active) ||
      (item.node.matches('.hero-call') && item.node.matches(':hover, :focus-within')) ||
      (item.node.querySelector('audio') && !item.node.querySelector('audio').paused);
  }

  function enter(item) {
    clear(item);
    item.seen = item.ever = true;
    const treatments = {
      zoom: [{ transform: 'scale(.93)', opacity: .45 }, { transform: 'none', opacity: 1 }],
      wipe: [{ clipPath: 'inset(0 100% 0 0)', opacity: 1 }, { clipPath: 'inset(0 0 0 0)', opacity: 1 }],
      fold: [{ transform: 'perspective(650px) rotateX(-65deg)', opacity: 0 }, { transform: 'perspective(650px) rotateX(0deg)', opacity: 1 }],
      tilt: [{ transform: 'rotate(-4deg) scale(.94)', opacity: .25 }, { transform: 'rotate(0deg) scale(1)', opacity: 1 }],
      fade: [{ opacity: 0 }, { opacity: 1 }],
      side: [{ transform: `translateX(${innerWidth < 600 ? 16 : 24}px)`, opacity: 0 }, { transform: 'none', opacity: 1 }],
      focus: [{ filter: 'blur(9px)', opacity: .25 }, { filter: 'blur(0)', opacity: 1 }]
    };
    const durations = { zoom: 850, wipe: 750, fold: 650, tilt: 800, fade: 650, side: 650, focus: 900 };
    item.node.style.willChange = item.kind === 'focus' ? 'filter, opacity' : 'transform, opacity';
    item.animation = item.node.animate(treatments[item.kind], {
      duration: durations[item.kind], delay: item.delay,
      easing: 'cubic-bezier(.16,1,.3,1)', fill: 'both' });
    const animation = item.animation;
    animation.onfinish = () => { if (item.animation === animation) { clear(item); schedule(); } };
  }

  function draw() {
    frame = 0;
    if (!enabled || document.hidden) return;
    const viewport = innerHeight, scroll = scrollY;
    for (const item of items) {
      const top = item.top - scroll, bottom = top + item.height;
      if (protectedItem(item)) { clear(item); item.seen = item.ever = true; continue; }
      if (bottom < 0 || top > viewport * 1.08) {
        clear(item);
        // Most sections animate once. Returning to them is deliberately calm.
        if (item.ever) { item.seen = true; continue; }
        item.seen = false;
        item.node.style.opacity = '0';
        continue;
      }
      if (!item.seen) {
        if (top < viewport * .91 && bottom > 74) enter(item);
        else item.node.style.opacity = '0';
        continue;
      }
      if (item.animation) continue;
      clear(item);
    }
  }

  function schedule() {
    if (enabled && !frame && !document.hidden) frame = requestAnimationFrame(draw);
  }

  function revealTarget(target) {
    if (!(target instanceof Element)) return;
    items.filter(item => item.node.contains(target) || target.contains(item.node)).forEach(item => {
      clear(item);
      item.seen = item.ever = true;
    });
  }

  function start() {
    if (enabled || reduced.matches) return;
    try {
      enabled = true;
      lastWidth = innerWidth;
      document.body.classList.add('landing-motion');
      const group = (selector, kind, step = 80) =>
        document.querySelectorAll(selector).forEach((node, index) => add(node, kind, index * step));
      // Static: body copy, actions, audio heading, use cases, flow controls,
      // trust heading, closing action and footer. No generic reveal on every block.
      add(document.querySelector('.hero-call'), 'zoom');
      add(document.querySelector('.calendar-summary'), 'wipe');
      group('.source-stack > span', 'fold', 110);
      add(document.querySelector('.handover-preview'), 'tilt');
      add(document.querySelector('#funktionsweise .section-heading h2'), 'fade');
      group('.trust-proof > div', 'side', 120);
      add(document.querySelector('.closing h2'), 'focus');
      measure();
      draw();
      // Height changes include an expanded transcript and responsive text reflow.
      observer = new ResizeObserver(() => { measure(); schedule(); });
      observer.observe(document.querySelector('main'));
      if (location.hash) revealTarget(document.getElementById(location.hash.slice(1)));
    } catch (error) {
      // Progressive enhancement: a failed animation never hides the page.
      stop();
      console.warn('Landing motion unavailable; showing the static page.', error);
    }
  }

  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', () => {
    if (!enabled) return;
    if (innerWidth !== lastWidth) { stop(); start(); }
    else { measure(); schedule(); }
  }, { passive: true });
  document.addEventListener('focusin', event => {
    if (event.target.matches(':focus-visible')) revealTarget(event.target);
  });
  // Never move a pointer target between pointerdown and click.
  document.addEventListener('click', event => revealTarget(event.target));
  window.addEventListener('hashchange', () => revealTarget(document.getElementById(location.hash.slice(1))));
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) items.forEach(item => { if (item.animation) clear(item); });
    else schedule();
  });
  window.addEventListener('pagehide', () => items.forEach(clear));
  window.addEventListener('pageshow', schedule);
  window.addEventListener('beforeprint', stop);
  window.addEventListener('afterprint', start);
  reduced.addEventListener('change', () => reduced.matches ? stop() : start());
  start();
})();
