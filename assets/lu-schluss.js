/* AIFOREU · Schluss: die Wörter driften beim Scrollen auseinander, der Kontaktknopf
   rückt in die Mitte. Die ursprünglichen Bewegungswege bleiben erhalten.
   Ganze Sätze werden vor dem Aufteilen übersetzt; Rückwärtsscrollen setzt alles zurück. */
(() => {
  'use strict';
  const abschnitt = document.querySelector('[data-lu-schluss]');
  if (!abschnitt || !CSS.supports('position', 'sticky')) return;
  const titel = abschnitt.querySelector('h2'), knopf = abschnitt.querySelector('.landing-button'), zeile = abschnitt.querySelector('.landing-kicker');
  if (!titel) return;
  const bewegung = matchMedia('(prefers-reduced-motion: reduce)'), schmal = matchMedia('(max-width: 700px)');
  const quelle = (window.AiforeuLanguage?.sourceText(titel) || titel.textContent).replace(/\s+/g, ' ').trim();
  const ursprungsLabel = titel.getAttribute('aria-label');
  const knopfTransform = knopf?.style.transform || '', zeilenOpacity = zeile?.style.opacity || '';
  // The language runtime must translate this sentence as a whole, not each animated word.
  titel.dataset.i18nIgnore = '';
  let strecke = null, worte = [], wege = [], wartet = false, warte = 0, weg = 0, kx = 0, ky = 0, vergroesserung = .3, aktiv = false;
  const weich = (x, a, b) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  const kopfhoehe = () => parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--global-header-height')) || 73;

  function miss() {
    if (!aktiv) return;
    weg = Math.round(innerHeight * (schmal.matches ? .6 : .95));
    strecke.style.height = (abschnitt.offsetHeight + weg) + 'px';
    for (const w of worte) { w.style.transform = ''; w.style.opacity = ''; w.style.filter = ''; }
    if (knopf) knopf.style.transform = '';
    const t = titel.getBoundingClientRect(), a = abschnitt.getBoundingClientRect(), mx = t.left + t.width / 2, my = t.top + t.height / 2;
    wege = worte.map((w, i) => {
      const r = w.getBoundingClientRect(), dx = (r.left + r.width / 2 - mx) / Math.max(1, t.width / 2), dy = (r.top + r.height / 2 - my) / Math.max(1, t.height / 2);
      return { x: dx * (schmal.matches ? 80 : 280) + ((i * 53) % 7 - 3) * (schmal.matches ? 8 : 22), y: dy * (schmal.matches ? 60 : 130) - 24 - ((i * 29) % 5) * 14, z: 180 + ((i * 41) % 6) * 75, dreh: ((i * 37) % 11 - 5) * 1.5, ab: ((i * 17) % 5) * .045 };
    });
    if (knopf) {
      const k = knopf.getBoundingClientRect();
      kx = a.left + a.width / 2 - (k.left + k.width / 2); ky = a.top + a.height / 2 - (k.top + k.height / 2);
      // Preserve the original enlargement, while keeping translated buttons inside narrow screens.
      vergroesserung = Math.max(0, Math.min(.3, (a.width - 48) / Math.max(1, k.width) - 1));
    }
    setze();
  }
  function setze() {
    wartet = false; if (!aktiv) return;
    const r = strecke.getBoundingClientRect();
    const p = weg > 0 ? Math.min(1, Math.max(0, (kopfhoehe() - r.top) / weg)) : 0;
    worte.forEach((w, i) => {
      const g = wege[i], e = weich(p, .05 + g.ab, .72 + g.ab * .6);
      if (e <= 0) { w.style.transform = ''; w.style.opacity = ''; w.style.filter = ''; return; }
      w.style.transform = `translate3d(${(g.x * e).toFixed(1)}px,${(g.y * e).toFixed(1)}px,${(g.z * e).toFixed(1)}px) rotate(${(g.dreh * e).toFixed(2)}deg)`;
      w.style.opacity = (1 - weich(e, .5, 1)).toFixed(3);
      w.style.filter = e > .55 ? `blur(${((e - .55) * 9).toFixed(1)}px)` : '';
    });
    const vor = weich(p, .3, .92);
    if (knopf) knopf.style.transform = vor > 0 ? `translate3d(${(kx * vor).toFixed(1)}px,${(ky * vor).toFixed(1)}px,0) scale(${(1 + vergroesserung * vor).toFixed(3)})` : '';
    if (zeile) zeile.style.opacity = (1 - .7 * vor).toFixed(3);
  }
  function aufbauen() {
    clearTimeout(warte);
    aktiv = false;
    const text = window.AiforeuLanguage?.t(quelle, 'de') || quelle;
    titel.textContent = text;
    if (ursprungsLabel === null) titel.removeAttribute('aria-label'); else titel.setAttribute('aria-label', text);
    if (knopf) knopf.style.transform = knopfTransform;
    if (zeile) zeile.style.opacity = zeilenOpacity;
    if (bewegung.matches) {
      if (strecke) { strecke.replaceWith(abschnitt); strecke = null; }
      worte = []; return;
    }
    worte = [];
    const teile = document.createDocumentFragment();
    for (const teil of text.split(/(\s+)/)) {
      if (!teil.trim()) { teile.append(teil); continue; }
      const wort = document.createElement('lu-sw'); wort.setAttribute('aria-hidden', 'true'); wort.textContent = teil;
      worte.push(wort); teile.append(wort);
    }
    titel.replaceChildren(teile); titel.setAttribute('aria-label', text);
    if (!strecke) {
      strecke = document.createElement('div'); strecke.className = 'lu-schluss-strecke';
      abschnitt.replaceWith(strecke); strecke.append(abschnitt);
    }
    aktiv = true; miss();
  }
  const rufe = () => { if (aktiv && !wartet) { wartet = true; requestAnimationFrame(setze); } };
  const neu = () => { if (!aktiv) return; clearTimeout(warte); warte = setTimeout(miss, 140); };
  addEventListener('scroll', rufe, { passive: true }); addEventListener('resize', neu, { passive: true });
  addEventListener('aiforeu:language-ready', aufbauen);
  bewegung.addEventListener('change', aufbauen);
  if (document.fonts?.ready) document.fonts.ready.then(miss);
  if (!window.AiforeuLanguage || window.AiforeuLanguage.ready) aufbauen();
})();
