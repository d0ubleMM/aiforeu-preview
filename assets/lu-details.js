/* AIFOREU · Bewegung · Kleinigkeiten nach lusion.co (eigene Umsetzung). */
(() => {
  'use strict';
  const ruhig = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const maus = matchMedia('(hover: hover) and (pointer: fine)').matches;

  /* 1 · Scroll-Anzeige am rechten Rand (Desktop) */
  if (maus && innerWidth >= 900) {
    const rand = document.createElement('div'); rand.className = 'lu-rand'; rand.setAttribute('aria-hidden', 'true');
    const balken = document.createElement('i'); rand.append(balken); document.body.append(rand);
    let warte = 0, wartet = false;
    const setze = () => {
      wartet = false;
      const max = document.documentElement.scrollHeight - innerHeight;
      if (max < innerHeight * .5) { rand.classList.remove('lu-rand--an'); return; }
      balken.style.transform = `translateY(${((scrollY / max) * (132 - 34)).toFixed(1)}px)`;
      rand.classList.add('lu-rand--an'); clearTimeout(warte); warte = setTimeout(() => rand.classList.remove('lu-rand--an'), 1100);
    };
    addEventListener('scroll', () => { if (!wartet) { wartet = true; requestAnimationFrame(setze); } }, { passive: true });
  }

  /* 3 · Linie unter Textlinks */
  const STRICH = '.site-footer .footer-links a, .site-footer a[href^="mailto"], .landing-text-link, .bp-link, .projects-link, .global-menu-bottom a';
  for (const a of document.querySelectorAll(STRICH)) if (!a.querySelector('img') && a.textContent.trim()) a.classList.add('lu-strich');

  /* 4 · Pfeil vor Kartentiteln, Bild in der Karte zoomt leicht (nur wenn der Rahmen beschneidet) */
  if (maus && !ruhig) {
    const KARTEN = [['.world-path', '.world-path-title'], ['.platform-capabilities a', 'h3'], ['.projects-entry', 'h3'], ['.bp-other-path', 'h2, h3, strong'], ['.bp-work-capability', 'h3']];
    for (const [ks, ts] of KARTEN) for (const karte of document.querySelectorAll(ks)) {
      const titel = karte.querySelector(ts); if (!titel || titel.querySelector('.lu-kt')) continue;
      const kinder = [...titel.childNodes]; const ende = kinder.findIndex(n => n.nodeType === 1 && (n.tagName === 'B' || n.getAttribute('aria-hidden') === 'true'));
      const vorne = ende < 0 ? kinder : kinder.slice(0, ende); if (!vorne.some(n => n.textContent.trim())) continue;
      const huelle = document.createElement('span'); huelle.className = 'lu-kt';
      const pfeil = document.createElement('lu-pfeil'); pfeil.setAttribute('aria-hidden', 'true'); pfeil.textContent = '→';
      titel.insertBefore(huelle, vorne[0]); huelle.append(pfeil, ...vorne); karte.classList.add('lu-karte');
      const bild = karte.querySelector('img'); if (bild && /hidden|clip/.test(getComputedStyle(bild.parentElement).overflow)) bild.classList.add('lu-karte-bild');
    }
  }

  /* 5 · Bilder öffnen sich beim Hineinscrollen (nur solche, die beim Laden noch unten liegen) */
  if (!ruhig && 'IntersectionObserver' in window) {
    const kandidaten = [...document.querySelectorAll('main img')].filter(img => {
      if (img.closest('[data-world], [data-road-scene], .bp-road, .lu-spielfeld, .aiforeu-trust, header, .global-menu') || img.width < 160 || !img.getClientRects().length) return false;
      return img.getBoundingClientRect().top > innerHeight * 1.05;
    });
    // Beobachtet wird der Rahmen um das Bild: das beschnittene Bild selbst gilt dem Beobachter als unsichtbar.
    const zuBild = new Map();
    const o = new IntersectionObserver(eintraege => { for (const e of eintraege) if (e.isIntersecting) { o.unobserve(e.target); for (const img of zuBild.get(e.target) || []) { img.classList.add('lu-bild-auf'); img.classList.remove('lu-bild-warten'); } } }, { threshold: .12, rootMargin: '0px 0px -4% 0px' });
    for (const img of kandidaten) { const r = img.parentElement; img.classList.add('lu-bild-warten'); if (!zuBild.has(r)) { zuBild.set(r, []); o.observe(r); } zuBild.get(r).push(img); }
  }

  /* Menü: ruhige Rückmeldung hinter den Hauptlinks. */
  const menue = document.querySelector('.global-menu');
  if (menue) {
    for (const a of menue.querySelectorAll('.global-menu-primary > a')) a.classList.add('lu-pille');
  }

  /* 7 · Weiter zum nächsten Bereich: der Balken füllt sich, während der Block durchs Bild läuft */
  const weiter = document.querySelector('.lu-weiter');
  if (weiter && !ruhig) {
    let wartet = false;
    const setze = () => { wartet = false; const r = weiter.getBoundingClientRect(), p = Math.min(1, Math.max(0, (innerHeight - r.top) / (innerHeight * .75))); weiter.style.setProperty('--lu-p', p.toFixed(3)); weiter.classList.toggle('lu-weiter--voll', p >= 1); };
    addEventListener('scroll', () => { if (!wartet) { wartet = true; requestAnimationFrame(setze); } }, { passive: true }); setze();
  }
})();
