/* Radial filaments: every point remains attached to its line during interaction. */
(() => {
  'use strict';
  const hero = document.querySelector('.landing-hero');
  const geometry = hero?.querySelector('.hero-rays');
  const canvas = hero?.querySelector('.hero-particles');
  const context = canvas?.getContext('2d');
  if (!context || !geometry) return;

  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const surface = canvas.parentElement;
  const pointer = { x: 0, y: 0, active: false };
  const blueprint = [...geometry.querySelectorAll('[data-ray]')].map(ray => {
    const line = ray.querySelector('line'), tip = ray.querySelector('circle');
    return { originX: line.x1.baseVal.value, originY: line.y1.baseVal.value,
      endX: tip.cx.baseVal.value, endY: tip.cy.baseVal.value,
      size: tip.r.baseVal.value, alpha: Number(ray.getAttribute('opacity')),
      weight: Number(line.getAttribute('stroke-width')),
      lineAlpha: Number(line.getAttribute('stroke-opacity')) };
  });
  let points = [], width = 0, height = 0, pixelRatio = 1;
  let frame = 0, previousTime = 0, visible = true;
  let ink = '#F5F7FA', formation = 1;
  const smooth = value => { const t = Math.max(0, Math.min(1, value)); return t * t * (3 - 2 * t); };

  function paint() {
    context.clearRect(0, 0, width, height);
    context.fillStyle = ink;
    context.strokeStyle = ink;
    for (let index = 0; index < points.length; index++) {
      const point = points[index];
      // Deterministic depth groups create a growing volume, not a uniform zoom.
      const depth = ((index * 73) % 257) / 257;
      const growth = smooth((formation - depth * .28) / .72);
      const reach = .3 + .7 * growth;
      const earlyOrigin = Math.min(height * .89, innerHeight - 125);
      const originY = earlyOrigin + (point.originY - earlyOrigin) * smooth(formation);
      const endX = point.originX + (point.homeX - point.originX) * reach + point.x;
      const endY = originY + (point.homeY - point.originY) * reach + point.y;
      const visibility = formation === 1 ? 1 : .65 + .35 * smooth((formation + .12 - depth * .42) / .58);
      const brightness = Math.min(1, point.alpha + Math.hypot(point.x, point.y) / 150) * visibility;
      context.lineWidth = point.weight;
      context.globalAlpha = brightness * point.lineAlpha;
      context.beginPath();
      context.moveTo(point.originX, originY);
      context.lineTo(endX, endY);
      context.stroke();
      context.globalAlpha = brightness;
      context.beginPath();
      context.arc(endX, endY, point.size * (.7 + growth * .3), 0, Math.PI * 2);
      context.fill();
    }
    context.globalAlpha = 1;
  }

  function reset() {
    cancelAnimationFrame(frame);
    frame = 0;
    previousTime = 0;
    pointer.active = false;
    for (const point of points) point.x = point.y = point.vx = point.vy = 0;
    paint();
  }

  function resize() {
    const bounds = hero.getBoundingClientRect();
    const nextWidth = Math.round(bounds.width), nextHeight = Math.round(bounds.height);
    const nextRatio = Math.min(devicePixelRatio || 1, 2);
    if (width === nextWidth && height === nextHeight && pixelRatio === nextRatio) return;
    width = nextWidth;
    height = nextHeight;
    pixelRatio = nextRatio;
    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    ink = getComputedStyle(hero).getPropertyValue('--paper').trim();
    // Reuse the fallback SVG's actual responsive transform, including mobile crop.
    const matrix = geometry.getScreenCTM();
    if (!matrix) return;
    const project = (x, y) => ({ x: matrix.a * x + matrix.c * y + matrix.e - bounds.left,
      y: matrix.b * x + matrix.d * y + matrix.f - bounds.top });
    const scale = Math.sqrt(Math.abs(matrix.a * matrix.d - matrix.b * matrix.c));
    points = blueprint.map(ray => {
      const start = project(ray.originX, ray.originY), end = project(ray.endX, ray.endY);
      return { originX: start.x, originY: start.y, homeX: end.x, homeY: end.y,
        size: Math.max(.55, ray.size * scale), alpha: ray.alpha,
        weight: ray.weight, lineAlpha: ray.lineAlpha,
        x: 0, y: 0, vx: 0, vy: 0 };
    });
    reset();
    surface.classList.add('has-particles');
  }

  function tick(time) {
    frame = 0;
    if (reduced.matches || document.hidden || !visible) { reset(); return; }
    const step = previousTime ? Math.min(2, (time - previousTime) / (1000 / 60)) : 1;
    previousTime = time;
    const radius = width < 600 ? 95 : 130;
    const strength = width < 600 ? 38 : 55;
    const damping = Math.pow(.73, step);
    let moving = false;
    for (const point of points) {
      let targetX = 0, targetY = 0;
      if (pointer.active) {
        const dx = point.homeX - pointer.x, dy = point.homeY - pointer.y;
        const distance = Math.hypot(dx, dy);
        if (distance < radius) {
          const amount = strength * Math.pow(1 - distance / radius, 2);
          const angle = Math.atan2(dy, dx);
          targetX = Math.cos(angle) * amount;
          targetY = Math.sin(angle) * amount;
        }
      }
      point.vx = (point.vx + (targetX - point.x) * .11 * step) * damping;
      point.vy = (point.vy + (targetY - point.y) * .11 * step) * damping;
      point.x += point.vx * step;
      point.y += point.vy * step;
      if (Math.abs(targetX - point.x) + Math.abs(targetY - point.y) + Math.abs(point.vx) + Math.abs(point.vy) > .03) {
        moving = true;
      } else {
        point.x = targetX; point.y = targetY; point.vx = point.vy = 0;
      }
    }
    paint();
    if (moving) frame = requestAnimationFrame(tick);
    else previousTime = 0;
  }

  function wake() {
    if (!frame && !reduced.matches && !document.hidden && visible) frame = requestAnimationFrame(tick);
  }

  function move(event) {
    if (formation < 1 || reduced.matches || !event.isPrimary || (event.pointerType === 'touch' && event.type === 'pointermove' && !pointer.active)) return;
    const bounds = hero.getBoundingClientRect();
    pointer.x = event.clientX - bounds.left;
    pointer.y = event.clientY - bounds.top;
    pointer.active = true;
    wake();
  }

  function release() {
    if (!pointer.active) return;
    pointer.active = false;
    wake();
  }

  hero.addEventListener('pointermove', move, { passive: true });
  hero.addEventListener('pointerdown', move, { passive: true });
  hero.addEventListener('pointerleave', release, { passive: true });
  hero.addEventListener('pointercancel', release, { passive: true });
  hero.addEventListener('pointerup', event => { if (event.pointerType !== 'mouse') release(); }, { passive: true });
  // No pointer capture or preventDefault: touch scrolling and links stay native.
  window.addEventListener('scroll', release, { passive: true });
  window.addEventListener('resize', resize, { passive: true });
  window.addEventListener('pagehide', reset);
  hero.addEventListener('govvoice:formation', event => {
    const next = Math.max(0, Math.min(1, Number(event.detail)));
    if (!Number.isFinite(next) || next === formation) return;
    formation = next;
    reset();
  });
  document.addEventListener('visibilitychange', () => { if (document.hidden) reset(); });
  reduced.addEventListener('change', reset);
  new ResizeObserver(resize).observe(hero);
  new IntersectionObserver(entries => {
    visible = entries[0].isIntersecting;
    if (!visible) reset();
  }).observe(hero);
  canvas.addEventListener('contextlost', () => { reset(); surface.classList.remove('has-particles'); });
  canvas.addEventListener('contextrestored', () => { width = 0; resize(); });
  resize();
})();
