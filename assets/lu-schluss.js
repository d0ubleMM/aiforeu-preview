/* AIFOREU · Bewegung · Schluss der Startseite: „Was soll morgen einfacher sein?“ driftet beim Scrollen auseinander
   und kommt auf den Betrachter zu; der Knopf rückt in die Mitte und bleibt. Echtes Scrollen: Der Abschnitt steht
   per sticky in einer Strecke, die das Skript um ihn legt. Sein eigenes Markup und Layout bleiben unverändert. */
(() => {
  'use strict';
  const abschnitt = document.querySelector('[data-lu-schluss]');
  const bewegung = matchMedia('(prefers-reduced-motion: reduce)');
  if (!abschnitt || bewegung.matches || !CSS.supports('position', 'sticky')) return;
  const titel = abschnitt.querySelector('h2'), knopf = abschnitt.querySelector('.landing-button'), zeile = abschnitt.querySelector('.landing-kicker');
  if (!titel) return;
  const lesefassung = titel.cloneNode(true);
  for (const br of lesefassung.querySelectorAll('br')) br.replaceWith(document.createTextNode(' '));
  const text = lesefassung.textContent.replace(/\s+/g, ' ').trim();
  const ursprungsLabel = titel.getAttribute('aria-label');
  const knopfTransform = knopf?.style.transform || '', zeilenOpacity = zeile?.style.opacity || '';
  const worte = [];
  for (const kind of [...titel.childNodes]) {
    if (kind.nodeType !== 3) continue;
    const neu = document.createDocumentFragment();
    for (const s of kind.nodeValue.split(/(\s+)/)) {
      if (!s) continue;
      if (/^\s+$/.test(s)) { neu.append(document.createTextNode(s)); continue; }
      const w = document.createElement('lu-sw'); w.setAttribute('aria-hidden', 'true'); w.textContent = s; neu.append(w); worte.push(w);
    }
    kind.replaceWith(neu);
  }
  if (!worte.length) return;
  titel.setAttribute('aria-label', text);
  const strecke = document.createElement('div'); strecke.className = 'lu-schluss-strecke';
  abschnitt.replaceWith(strecke); strecke.append(abschnitt);
  const schmal = matchMedia('(max-width: 700px)');
  let wege = [], wartet = false, weg = 0, kx = 0, ky = 0, aktiv = true;
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
    if (knopf) { const k = knopf.getBoundingClientRect(); kx = a.left + a.width / 2 - (k.left + k.width / 2); ky = a.top + a.height / 2 - (k.top + k.height / 2); }
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
    if (knopf) knopf.style.transform = vor > 0 ? `translate3d(${(kx * vor).toFixed(1)}px,${(ky * vor).toFixed(1)}px,0) scale(${(1 + .3 * vor).toFixed(3)})` : '';
    if (zeile) zeile.style.opacity = (1 - .7 * vor).toFixed(3);
  }
  const rufe = () => { if (aktiv && !wartet) { wartet = true; requestAnimationFrame(setze); } };
  let warte = 0; const neu = () => { if (!aktiv) return; clearTimeout(warte); warte = setTimeout(miss, 140); };
  const beruhige = () => {
    if (!bewegung.matches || !aktiv) return;
    aktiv = false; clearTimeout(warte);
    removeEventListener('scroll', rufe); removeEventListener('resize', neu);
    for (const w of worte) w.replaceWith(document.createTextNode(w.textContent));
    if (ursprungsLabel === null) titel.removeAttribute('aria-label'); else titel.setAttribute('aria-label', ursprungsLabel);
    if (knopf) knopf.style.transform = knopfTransform;
    if (zeile) zeile.style.opacity = zeilenOpacity;
    strecke.replaceWith(abschnitt);
  };
  addEventListener('scroll', rufe, { passive: true }); addEventListener('resize', neu, { passive: true });
  bewegung.addEventListener('change', beruhige);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(miss);
  miss(); beruhige();
})();
