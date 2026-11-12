/* Local, scroll-driven geography. Frankfurt denotes a region, never a building. */
(() => {
  'use strict';
  const section = document.querySelector('.hosting-section');
  if (!section) return;
  const sequence = section.querySelector('.hosting-sequence');
  const stage = section.querySelector('.hosting-stage');
  const visual = section.querySelector('.hosting-visual');
  const destination = section.querySelector('.hosting-destination');
  const canvas = section.querySelector('canvas');
  const context = canvas.getContext('2d');
  if (!context) return;
  const controls = section.querySelector('.hosting-controls');
  const buttons = [...controls.querySelectorAll('button')];
  const dataURL = new URL('globe-land.json', document.currentScript.src);
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const clamp = n => Math.min(1, Math.max(0, n));
  const ease = n => { const t = clamp(n); return t * t * (3 - 2 * t); };
  const mix = (a, b, t) => a + (b - a) * t;
  const vector = ([lon, lat]) => {
    const a = lon * Math.PI / 180, b = lat * Math.PI / 180;
    return [Math.cos(b) * Math.sin(a), Math.sin(b), Math.cos(b) * Math.cos(a)];
  };
  const grid = [];
  for (let lon = -180; lon < 180; lon += 30) grid.push(Array.from({ length: 73 }, (_, i) => vector([lon, i * 2.5 - 90])));
  for (let lat = -60; lat <= 60; lat += 30) grid.push(Array.from({ length: 145 }, (_, i) => vector([i * 2.5 - 180, lat])));
  let data, ready = false, printing = false, visible = false;
  let width = 0, height = 0, ratio = 1, progress = 0, scrollProgress = 0;
  let frame = 0, motionFrame = 0, manual = null, start = 0, travel = 0, pinned = false;
  let paper = '', soft = '', lastPhase = null;

  // Hide the static map before its lazy load, so there is no flash of Earth.
  // A failed request removes this class and restores the useful static view.
  section.classList.add('globe-pending');
  destination.inert = !reduced.matches;

  function paint() {
    if (!ready || !width) return;
    const p = progress, mobile = width < 700;
    const formation = ease((p - .12) / .29);
    const retreat = ease((p - .12) / .33);
    const approach = ease((p - .51) / .35);
    const arrival = ease((p - .84) / .12);
    const turn = ease((p - .44) / .34);
    const longitude = mix(mix(18, -35, retreat), 8.682, turn) * Math.PI / 180;
    const latitude = mix(18, 50.11, turn) * Math.PI / 180;
    const sinLon = Math.sin(longitude), cosLon = Math.cos(longitude);
    const sinLat = Math.sin(latitude), cosLat = Math.cos(latitude);
    const baseRadius = Math.min(width * (mobile ? .43 : .32), height * .38);
    const radius = baseRadius * mix(3.6, 1, retreat) * mix(1, mobile ? 3.6 : 4.15, approach);
    const centerX = width * mix(.5, mobile ? .5 : .34, approach);
    const centerY = height * mix(.48, mobile ? .29 : .5, approach);
    const project = point => {
      const x = point[0] * cosLon - point[2] * sinLon;
      const z = point[0] * sinLon + point[2] * cosLon;
      return [centerX + radius * x, centerY - radius * (point[1] * cosLat - z * sinLat), point[1] * sinLat + z * cosLat];
    };
    context.clearRect(0, 0, width, height);
    context.fillStyle = paper;
    context.strokeStyle = soft;
    // Darkness is a real first state, not an already-rendered globe behind a veil.
    if (formation > 0) {
      const shell = ease((formation - .35) / .65);
      context.globalAlpha = .025 * shell;
      context.beginPath(); context.arc(centerX, centerY, radius, 0, Math.PI * 2); context.fill();
      context.globalAlpha = .45 * shell * (1 - approach);
      context.lineWidth = .7; context.stroke();
      function lines(paths, alpha, lineWidth) {
        context.globalAlpha = alpha; context.lineWidth = lineWidth;
        context.beginPath();
        for (const path of paths) {
          let drawing = false;
          for (const point of path) {
            const [x, y, z] = project(point);
            if (z > .025) {
              if (drawing) context.lineTo(x, y); else context.moveTo(x, y);
              drawing = true;
            } else drawing = false;
          }
        }
        context.stroke();
      }
      lines(grid, (.17 - approach * .10) * shell, .7);
      lines(data.coasts, (.4 + approach * .16) * shell, .75);
      lines(data.borders, approach * .21, .65);
      function dots(points, alpha, size, assemble) {
        context.globalAlpha = alpha; context.beginPath();
        for (let i = 0; i < points.length; i++) {
          const point = points[i];
          let [x, y, z] = project(point);
          if (z <= .02) continue;
          const settled = assemble ? ease((formation - ((i * .6180339) % 1) * .3) / .7) : 1;
          if (settled <= 0) continue;
          const spread = 1 + (1 - settled) * .55;
          x = centerX + (x - centerX) * spread;
          y = centerY + (y - centerY) * spread;
          if (x < -3 || y < -3 || x > width + 3 || y > height + 3) continue;
          const r = size * (.6 + z * .4) * Math.min(1, settled * 3);
          // Short tracks coalesce into the geographical points, then disappear.
          if (assemble && settled < .95) {
            const length = (1 - settled) * 15;
            const angle = Math.atan2(y - centerY, x - centerX);
            context.moveTo(x, y);
            context.lineTo(x + Math.cos(angle) * length, y + Math.sin(angle) * length);
          }
          context.moveTo(x + r, y); context.arc(x, y, r, 0, Math.PI * 2);
        }
        context.fill();
        if (assemble && formation < 1) { context.globalAlpha = alpha * .25; context.lineWidth = .7; context.stroke(); }
      }
      dots(data.land, .9 - approach * .72, mobile ? 1.05 : 1.2, true);
      if (approach) dots(data.europe, approach * .75, mobile ? 1.1 : 1.35, false);
      if (arrival) {
        context.strokeStyle = paper;
        lines(data.germany, arrival * .85, 1.1);
        const [x, y] = project(vector([8.682, 50.11]));
        context.globalAlpha = arrival;
        context.lineWidth = 1;
        context.beginPath(); context.arc(x, y, 6, 0, Math.PI * 2); context.fill();
        context.beginPath(); context.arc(x, y, mix(55, 24, arrival), 0, Math.PI * 2); context.stroke();
        context.globalAlpha = arrival * .25;
        context.beginPath(); context.arc(x, y, 37, 0, Math.PI * 2); context.stroke();
        context.globalAlpha = arrival * .65;
        const endX = mobile ? x : width * .60;
        const endY = mobile ? height * .44 : height * .48;
        context.beginPath(); context.moveTo(x + (mobile ? 0 : 38), y + (mobile ? 38 : 0));
        context.lineTo(endX, endY); context.stroke();
      }
    }
    context.globalAlpha = 1;
    section.classList.toggle('is-past-title', p >= .10);
    // Colour changes finish before the globe forms; all text retains contrast.
    section.style.setProperty('--hosting-darkness', ease(p / .10).toFixed(4));
    const phase = p < .12 ? 'intro' : p < .43 ? 'forming' : p < .55 ? 'world' : p < .87 ? 'zoom' : 'region';
    if (phase !== lastPhase) {
      section.dataset.globePhase = phase;
      visual.classList.toggle('is-europe', phase === 'region');
      destination.inert = !reduced.matches && phase !== 'region';
      buttons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.globeView === (phase === 'region' ? 'europe' : phase === 'world' ? 'world' : ''))));
      lastPhase = phase;
    }
    section.dataset.globeProgress = p.toFixed(4);
  }

  function measure() {
    if (!ready || printing) return;
    const header = document.querySelector('.site-header').offsetHeight;
    pinned = !reduced.matches && innerHeight >= 640;
    sequence.classList.toggle('is-pinned', pinned);
    section.style.setProperty('--hosting-viewport', `${Math.max(560, innerHeight - header)}px`);
    // One continuous native scroll: reveal, pull back, hold, travel in, resolve.
    travel = Math.round((innerHeight - header) * 3.2);
    sequence.style.setProperty('--hosting-height', `${stage.offsetHeight}px`);
    sequence.style.setProperty('--hosting-travel', `${travel}px`);
    sequence.style.setProperty('--hosting-top', `${header}px`);
    start = sequence.getBoundingClientRect().top + scrollY - header;
    const bounds = visual.getBoundingClientRect();
    const nextRatio = Math.min(devicePixelRatio || 1, 2);
    if (width !== Math.round(bounds.width) || height !== Math.round(bounds.height) || ratio !== nextRatio) {
      width = Math.round(bounds.width); height = Math.round(bounds.height); ratio = nextRatio;
      canvas.width = Math.round(width * ratio); canvas.height = Math.round(height * ratio);
      context.setTransform(ratio, 0, 0, ratio, 0, 0); paint();
    }
  }
  function update() {
    frame = 0;
    if (!ready || printing || reduced.matches || !visible || document.hidden || manual !== null || motionFrame) return;
    const value = pinned ? (scrollY - start) / travel : (innerHeight * .9 - visual.getBoundingClientRect().top) / (innerHeight * .9);
    scrollProgress = clamp(value);
    if (progress !== scrollProgress) { progress = scrollProgress; paint(); }
  }
  function schedule() {
    if (ready && !frame && !document.hidden && visible && !reduced.matches && !printing) frame = requestAnimationFrame(update);
  }
  function onScroll() {
    if (reduced.matches || printing) return;
    // Scrolling takes over from a chosen view, including an unfinished flight.
    manual = null;
    cancelAnimationFrame(motionFrame);
    motionFrame = 0;
    schedule();
  }
  function choose(target) {
    cancelAnimationFrame(motionFrame); motionFrame = 0; manual = target;
    if (reduced.matches || document.hidden) { progress = target; paint(); return; }
    const from = progress, began = performance.now();
    if (from === target) return;
    function tick(now) {
      motionFrame = 0;
      if (document.hidden) { progress = target; paint(); return; }
      const t = clamp((now - began) / 2300);
      progress = mix(from, target, ease(t)); paint();
      if (t < 1) motionFrame = requestAnimationFrame(tick);
    }
    motionFrame = requestAnimationFrame(tick);
  }
  buttons.forEach(button => button.addEventListener('click', () => choose(button.dataset.globeView === 'europe' ? 1 : .48)));
  function fallback() {
    ready = false;
    cancelAnimationFrame(frame); cancelAnimationFrame(motionFrame); frame = motionFrame = 0;
    manual = lastPhase = null;
    section.classList.remove('globe-pending', 'globe-ready');
    visual.classList.remove('has-globe', 'is-europe');
    sequence.classList.remove('is-pinned');
    controls.hidden = true; destination.inert = false;
    section.removeAttribute('data-globe-progress'); section.removeAttribute('data-globe-phase');
  }
  function enable() {
    if (!data) return;
    ready = true;
    paper = getComputedStyle(section).getPropertyValue('--paper').trim();
    soft = getComputedStyle(section).getPropertyValue('--accent-soft').trim();
    progress = reduced.matches ? 1 : scrollProgress;
    section.classList.add('globe-ready'); section.classList.remove('globe-pending');
    measure(); paint(); visual.classList.add('has-globe'); controls.hidden = false; schedule();
  }
  const preload = new IntersectionObserver(async entries => {
    if (!entries.some(entry => entry.isIntersecting)) return;
    preload.disconnect();
    try {
      const response = await fetch(dataURL);
      if (!response.ok) throw new Error('Map data unavailable');
      const raw = await response.json();
      const paths = key => raw[key].map(path => path.map(vector));
      if (!raw.land?.length || !raw.europe?.length || !raw.germany?.length) throw new Error('Invalid geography');
      data = { land: raw.land.map(vector), europe: raw.europe.map(vector), coasts: paths('coasts'), borders: paths('borders'), germany: paths('germany') };
      enable();
    } catch { fallback(); }
  }, { rootMargin: '600px' });
  preload.observe(section);
  new IntersectionObserver(entries => {
    visible = entries[0].isIntersecting;
    if (!visible) {
      cancelAnimationFrame(frame); cancelAnimationFrame(motionFrame); frame = motionFrame = 0; manual = null;
    } else schedule();
  }).observe(section);
  new ResizeObserver(() => { measure(); schedule(); }).observe(stage);
  window.addEventListener('resize', () => { measure(); schedule(); }, { passive: true });
  window.addEventListener('scroll', onScroll, { passive: true });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      cancelAnimationFrame(frame); cancelAnimationFrame(motionFrame); frame = motionFrame = 0;
      if (manual !== null) { progress = manual; paint(); }
    } else schedule();
  });
  reduced.addEventListener('change', () => {
    cancelAnimationFrame(motionFrame); motionFrame = 0; manual = null; progress = scrollProgress = 1;
    measure(); paint(); schedule();
  });
  window.addEventListener('beforeprint', () => { printing = true; fallback(); });
  window.addEventListener('afterprint', () => { printing = false; scrollProgress = 1; enable(); });
  canvas.addEventListener('contextlost', fallback);
  canvas.addEventListener('contextrestored', () => { width = 0; scrollProgress = 1; enable(); });
})();
