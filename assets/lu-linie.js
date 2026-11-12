/* AIFOREU · Bewegung · Eine durchgehende Linie zeichnet sich beim Scrollen durch die Startseite: unter dem Hero
   beginnend, an den Rändern der Abschnitte entlang, mit großen Schwüngen durch die freien Bänder dazwischen, bis
   zum Knopf im Kontakt. Der gezeichnete Teil reicht bis etwa 62 % der Bildhöhe und zieht sich beim Zurückscrollen
   zurück. Der Pfad entsteht zur Laufzeit aus der Lage der Abschnitte; er läuft nur durch Ränder und Zwischenräume. */
(() => {
  'use strict';
  const wirt = document.querySelector('main[data-lu-linie], [data-lu-linie] main, main');
  if (!wirt || !document.querySelector('[data-lu-linie]')) return;
  const ruhig = matchMedia('(prefers-reduced-motion: reduce)'), breit = matchMedia('(min-width: 900px)');
  if (ruhig.matches) return;
  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg'), pfad = document.createElementNS(NS, 'path'), kopf = document.createElementNS(NS, 'circle');
  svg.setAttribute('class', 'lu-linie'); svg.setAttribute('aria-hidden', 'true'); kopf.setAttribute('r', '6'); svg.append(pfad, kopf);
  let laenge = 0, proben = [], wartet = false, aktiv = false, gezeichnet = -1;
  function baue() {
    aktiv = breit.matches;
    if (!aktiv) { svg.remove(); return; }
    const abschnitte = [...wirt.querySelectorAll(':scope > section, :scope > .lu-schluss-strecke > section')].filter(el => el.offsetHeight > 40);
    if (abschnitte.length < 3) { aktiv = false; svg.remove(); return; }
    wirt.classList.add('lu-linie-wirt'); if (!svg.isConnected) wirt.append(svg);
    const w = wirt.getBoundingClientRect(), W = wirt.scrollWidth, H = wirt.scrollHeight;
    svg.setAttribute('width', W); svg.setAttribute('height', H); svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    // Die Linie läuft nur durch freie Flächen: senkrecht in den Seitenrändern, waagerecht in den Bändern zwischen
    // dem letzten Inhalt eines Abschnitts und dem ersten des nächsten.
    const rand = Math.max(20, Math.min(40, W * .025));
    const inhalt = el => { let oben = Infinity, unten = -Infinity; for (const k of el.querySelectorAll('h1,h2,h3,p,a,li,span,button,img,canvas')) { const r = k.getBoundingClientRect(); if (!r.width || !r.height) continue; oben = Math.min(oben, r.top); unten = Math.max(unten, r.bottom); } const r = el.getBoundingClientRect(); return { oben: (isFinite(oben) ? oben : r.top) - w.top, unten: (isFinite(unten) ? unten : r.bottom) - w.top }; };
    const k = abschnitte.map(inhalt);
    const baender = []; for (let i = 0; i < k.length - 1; i++) { const a = k[i].unten, b = k[i + 1].oben; baender.push(b - a > 16 ? (a + b) / 2 : a + 8); }
    const R = 20; let links = true, x = rand, y = baender[0];
    let d = `M${(W * .5).toFixed(1)} ${y.toFixed(1)} L${(x + R).toFixed(1)} ${y.toFixed(1)}`;
    for (let i = 1; i < baender.length; i++) {
      const ny = baender[i], zx = links ? W - rand : rand, s = links ? 1 : -1;
      // Ecke nach unten, Seitenrand hinunter, Ecke ins nächste Band, hinüber zur anderen Seite
      d += ` Q${x.toFixed(1)} ${y.toFixed(1)} ${x.toFixed(1)} ${(y + R).toFixed(1)} L${x.toFixed(1)} ${(ny - R).toFixed(1)} Q${x.toFixed(1)} ${ny.toFixed(1)} ${(x + s * R).toFixed(1)} ${ny.toFixed(1)} L${(zx - s * R).toFixed(1)} ${ny.toFixed(1)}`;
      x = zx; y = ny; links = !links;
    }
    // Ende: ein Stück den Seitenrand hinunter, bis der letzte Abschnitt beginnt. Dort bleibt der Punkt stehen;
    // der letzte Abschnitt kann stehen bleiben (sticky), deshalb läuft die Linie nicht in ihn hinein.
    const schluss = abschnitte[abschnitte.length - 1].getBoundingClientRect().top - w.top;
    const ende = Math.max(y + R + 10, Math.min(k[k.length - 1].oben - 26, schluss + 70));
    d += ` Q${x.toFixed(1)} ${y.toFixed(1)} ${x.toFixed(1)} ${(y + R).toFixed(1)} L${x.toFixed(1)} ${ende.toFixed(1)}`;
    pfad.setAttribute('d', d);
    laenge = pfad.getTotalLength(); pfad.style.strokeDasharray = `${laenge.toFixed(1)} ${laenge.toFixed(1)}`;
    proben = []; for (let i = 0; i <= 240; i++) { const l = laenge * i / 240, p = pfad.getPointAtLength(l); proben.push([p.y, l]); }
    for (let i = 1; i < proben.length; i++) proben[i][0] = Math.max(proben[i][0], proben[i - 1][0]);   // Höhe nie rückwärts
    gezeichnet = -1; setze();
  }
  function setze() {
    wartet = false; if (!aktiv || !laenge) return;
    const ziel = -wirt.getBoundingClientRect().top + innerHeight * .62;
    let a = 0, b = proben.length - 1;
    while (b - a > 1) { const m = (a + b) >> 1; if (proben[m][0] < ziel) a = m; else b = m; }
    const [y0, l0] = proben[a], [y1, l1] = proben[b];
    const l = ziel <= proben[0][0] ? 0 : ziel >= proben[proben.length - 1][0] ? laenge : l0 + (l1 - l0) * ((ziel - y0) / Math.max(1, y1 - y0));
    if (Math.abs(l - gezeichnet) < .5) return; gezeichnet = l;
    pfad.style.strokeDashoffset = (laenge - l).toFixed(1); pfad.style.opacity = l > 2 ? '1' : '0';
    const p = pfad.getPointAtLength(l); kopf.setAttribute('cx', p.x.toFixed(1)); kopf.setAttribute('cy', p.y.toFixed(1)); kopf.style.opacity = l > 2 ? '1' : '0';
  }
  const rufe = () => { if (!wartet) { wartet = true; requestAnimationFrame(setze); } };
  let warte = 0; const neu = () => { clearTimeout(warte); warte = setTimeout(baue, 160); };
  addEventListener('scroll', rufe, { passive: true }); addEventListener('resize', neu, { passive: true });
  addEventListener('load', neu); if (document.fonts && document.fonts.ready) document.fonts.ready.then(neu);
  if ('ResizeObserver' in window) new ResizeObserver(neu).observe(wirt);
  baue();
})();
