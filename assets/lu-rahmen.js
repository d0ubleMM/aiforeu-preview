/* AIFOREU · Bewegung · Rahmen. data-lu-rahmen="zu": die Fläche füllt zuerst ihren Platz und zieht sich, während sie
   nach oben aus dem Bild rollt, in einen Rahmen mit runden Ecken zurück. data-lu-rahmen="auf": sie kommt als Rahmen
   ins Bild und öffnet sich bis zur Bildmitte zur vollen Fläche. Kein Layout ändert sich: nur clip-path und transform. */
(() => {
  'use strict';
  const teile = [...document.querySelectorAll('[data-lu-rahmen]')];
  if (!teile.length || matchMedia('(prefers-reduced-motion: reduce)').matches || !CSS.supports('clip-path', 'inset(1px round 2px)')) return;
  const schmal = matchMedia('(max-width: 700px)');
  const weich = t => { t = Math.min(1, Math.max(0, t)); return t * t * (3 - 2 * t); };
  let wartet = false;
  teile.forEach(el => el.classList.add('lu-rahmen--an'));
  function setze() {
    wartet = false;
    const vh = innerHeight, kopf = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--global-header-height')) || 0;
    const rand = schmal.matches ? 10 : Math.min(54, innerWidth * .032), radius = schmal.matches ? 18 : 32;
    for (const el of teile) {
      const r = el.getBoundingClientRect();
      if (r.bottom < -40 || r.top > vh + 40) continue;
      let q;
      if (el.dataset.luRahmen === 'auf') q = 1 - weich((vh - r.top) / (vh * .55));            // 1 = Rahmen, 0 = offen
      else q = weich((kopf - r.top) / Math.max(1, Math.min(r.height, vh) * .75));               // 0 = offen, 1 = Rahmen
      if (q <= .001) { el.style.clipPath = ''; el.style.transform = ''; continue; }
      el.style.clipPath = `inset(${(q * (el.dataset.luRahmen === 'auf' ? rand * .6 : 0)).toFixed(1)}px ${(q * rand).toFixed(1)}px ${(q * (el.dataset.luRahmen === 'auf' ? 0 : rand * .6)).toFixed(1)}px round ${(q * radius).toFixed(1)}px)`;
      el.style.transform = `scale(${(1 - .035 * q).toFixed(4)})`;
    }
  }
  const rufe = () => { if (!wartet) { wartet = true; requestAnimationFrame(setze); } };
  addEventListener('scroll', rufe, { passive: true }); addEventListener('resize', rufe, { passive: true });
  setze();
})();
