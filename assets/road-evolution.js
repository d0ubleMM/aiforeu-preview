/* Twelve illustrated epochs, blended along a construction front. No scroll-driven playback. */
(() => {
  'use strict';
  const host = document.querySelector('[data-evolution]');
  if (!host) return;
  const hero = host.closest('.night'), copy = hero.querySelector('.night-copy');
  const canvas = host.querySelector('canvas'), ctx = canvas.getContext('2d');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const play = host.querySelector('[data-evolution-play]'), seek = host.querySelector('[data-evolution-seek]');
  const stages = ['Matschweg','Pferdewagen','Schotterweg','Pflaster und Kutsche','Stadtkutsche','Industrie und Straßenbahn','Erste Autos','Betonstraße','Stadtverkehr','Elektromobilität','Autonome Fahrzeuge','Fliegende Autos'];
  new ResizeObserver(() => hero.style.setProperty('--night-copy-height', `${copy.offsetHeight}px`)).observe(copy);
  if (!ctx) return;
  const art = new Image();
  // Resolving from the script keeps this working below a GitHub Pages project path.
  art.src = new URL('road-evolution/epochs.webp', document.currentScript.src).href;
  const overlay = document.createElement('canvas'), layer = overlay.getContext('2d');
  const size = 724; overlay.width = overlay.height = size;
  let cell = 362, position = 0, elapsed = 0, frame = 0, last = 0, visible = false, ready = false;
  let playing = !reduced.matches && !navigator.connection?.saveData, manuallyStarted = false;
  const duration = 2.6, end = 11 * duration;
  function label() {
    const complete = position >= 11;
    const text = complete ? 'Entwicklung erneut ansehen' : playing ? 'Zeitraffer pausieren' : 'Zeitraffer abspielen';
    play.setAttribute('aria-label', text); play.title = text;
    play.firstElementChild.textContent = complete ? '↻' : playing ? 'Ⅱ' : '▷';
    seek.value = String(position);
    seek.setAttribute('aria-valuetext', stages[Math.min(11, Math.round(position))]);
    host.dataset.epoch = String(Math.min(11, Math.floor(position)));
  }
  function tile(target, index) {
    target.drawImage(art, (index % 4) * cell, Math.floor(index / 4) * cell, cell, cell, 0, 0, size, size);
  }
  function draw() {
    if (!ready) return;
    const index = Math.min(11, Math.floor(position)), part = position - index;
    ctx.clearRect(0, 0, size, size); tile(ctx, index);
    if (index < 11 && part > 0) {
      layer.clearRect(0,0,size,size); layer.globalCompositeOperation = 'source-over'; tile(layer, index + 1);
      layer.globalCompositeOperation = 'destination-in';
      const feather = 80, front = -feather + part * (size + feather * 2);
      const mask = layer.createLinearGradient(front - feather, 0, front + feather, 0);
      mask.addColorStop(0,'#000'); mask.addColorStop(1,'transparent');
      layer.fillStyle = mask; layer.fillRect(0,0,size,size);
      layer.globalCompositeOperation = 'source-over'; ctx.drawImage(overlay,0,0);
    }
    label();
  }
  function canPlay() {
    return ready && playing && visible && !document.hidden && (!reduced.matches || manuallyStarted) && !document.body.classList.contains('global-menu-open') && !document.querySelector('.global-header')?.hasAttribute('data-offers-open');
  }
  function tick(now) {
    frame = 0;
    if (!canPlay()) {last = 0; return;}
    if (!last) last = now;
    const delta = now - last;
    if (delta >= 1000 / 30) {
      elapsed = Math.min(end, elapsed + Math.min(delta, 100) / 1000); last = now;
      const whole = Math.floor(elapsed / duration), fraction = elapsed / duration - whole;
      const transition = Math.max(0, Math.min(1, (fraction - .38) / .62));
      position = Math.min(11, whole + transition * transition * (3 - 2 * transition));
      if (elapsed >= end) playing = false;
      draw();
    }
    if (canPlay()) frame = requestAnimationFrame(tick);
  }
  function sync() {
    if (canPlay()) {if (!frame) frame = requestAnimationFrame(tick);}
    else {cancelAnimationFrame(frame); frame = 0; last = 0;}
    label();
  }
  play.addEventListener('click', () => {
    if (position >= 11) {position = 0; elapsed = 0; playing = true;}
    else playing = !playing;
    manuallyStarted = true; draw(); sync();
  });
  seek.addEventListener('input', () => {
    playing = false; position = Number(seek.value);
    const whole = Math.floor(position), fraction = position - whole;
    // Invert the eased reveal so playback resumes exactly where the slider stopped.
    let low = 0, high = 1;
    for (let i = 0; i < 16; i++) {
      const mid = (low + high) / 2;
      if (mid * mid * (3 - 2 * mid) < fraction) low = mid; else high = mid;
    }
    elapsed = Math.min(end, (whole + (fraction ? .38 + .62 * (low + high) / 2 : 0)) * duration);
    draw(); sync();
  });
  new IntersectionObserver(entries => {visible = entries[0].isIntersecting; sync();}, {threshold: .15}).observe(host);
  document.addEventListener('visibilitychange', sync);
  new MutationObserver(sync).observe(document.body, {attributes:true,attributeFilter:['class']});
  const header = document.querySelector('.global-header');
  if (header) new MutationObserver(sync).observe(header, {attributes:true,attributeFilter:['data-offers-open']});
  reduced.addEventListener('change', () => {if(reduced.matches){playing=false;manuallyStarted=false;}sync();});
  art.decode().then(() => {
    cell = art.naturalWidth / 4;
    if (Math.abs(art.naturalHeight / 3 - cell) > 1) return;
    ready = true; draw(); canvas.hidden = false; host.dataset.ready = 'true';
    host.querySelector('.evolution-controls').hidden = false; sync();
  }).catch(() => {});
})();
