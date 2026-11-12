// Stufen-Szenen: ein Kapitel schaltet beim Scrollen Schritt für Schritt weiter (IVE-Rundgang, AnyUse-Ablauf, Voice-Gespräch).
// [data-stufen="einzeln|kumulativ"] am Kapitel, Elemente mit data-stufe="0 3" (eine oder mehrere Stufen).
// einzeln: nur die aktuelle Stufe ist an. kumulativ: alles bis zur aktuellen Stufe ist an.
// Ohne klebende Bühne (Handy) oder bei reduzierter Bewegung läuft die Szene selbst im Takt (data-takt in ms) oder steht ganz offen.
(() => {
  const RM = matchMedia('(prefers-reduced-motion: reduce)');
  const szenen = [...document.querySelectorAll('[data-stufen]')].map(k => {
    const s = { k, art: k.dataset.stufen, takt: +k.dataset.takt || 2400, a: -1, uhr: null, sicht: false, ziele: new Set() };
    // Sichtbar heißt: das eigentliche Bild (Telefon, Fenster, Plan) ist im Blick, nicht nur die Oberkante des Kapitels.
    s.beob = [...k.querySelectorAll('[data-stufen-blick]')]; if (!s.beob.length) s.beob = [k];
    s.buehne = k.querySelector('[data-buehne]');
    return s;
  });
  if (!szenen.length) return;
  document.documentElement.classList.add('stufen-js');
  // Nur Elemente der sichtbaren Variante zählen (Voice hat zwei Gespräche, eins davon ist versteckt).
  const elemente = s => [...s.k.querySelectorAll('[data-stufe]')].filter(e => !e.closest('[hidden]'));
  const nummern = e => e.dataset.stufe.trim().split(/\s+/).map(Number);
  const anzahl = s => Math.max(1, ...elemente(s).flatMap(nummern).map(n => n + 1));
  const zeige = (s, a, immer) => {
    if (a === s.a && !immer) return;
    s.a = a; s.k.style.setProperty('--a', a); s.k.dataset.aktiv = a;
    for (const e of elemente(s)) {
      const n = nummern(e);
      const an = s.art === 'kumulativ' ? Math.min(...n) <= a : n.includes(a);
      e.classList.toggle('an', an); e.classList.toggle('jetzt', n.includes(a));
    }
    s.k.querySelectorAll('[data-waehle]').forEach(b => +b.dataset.waehle === a ? b.setAttribute('aria-current', 'step') : b.removeAttribute('aria-current'));
  };
  // Breite Fenster scrollen die Szene, schmale (dort klebt die Bühne nicht) laufen im Takt.
  const BREIT = matchMedia('(min-width:1001px) and (min-height:620px)');
  const modus = () => RM.matches ? 'still' : BREIT.matches ? 'scroll' : 'takt';
  // Live (Sprechen mit dem Bot) ist ein eigener Zustand neben dem Layoutmodus: das Layout bleibt, nur das Weiterschalten ruht.
  const live = s => s.k.dataset.live === '1';
  const ausScroll = s => {
    const p = window.ablauf?.wert ? window.ablauf.wert(s.k) : 0, n = anzahl(s);
    zeige(s, Math.min(n - 1, Math.max(0, Math.floor(p * n * 1.04 - .02))));
  };
  const halt = s => { clearInterval(s.uhr); s.uhr = null; };
  const starte = s => {
    // Der Layoutmodus folgt immer dem Fenster, auch während Live; nur das Weiterschalten ruht dann.
    const m = modus(s); s.k.dataset.modus = m;
    if (live(s)) return;
    halt(s);
    if (m === 'still') return zeige(s, s.art === 'kumulativ' ? anzahl(s) - 1 : Math.max(0, s.a), true);
    if (m === 'scroll') return ausScroll(s);
    if (!s.sicht) return;
    if (s.a < 0) zeige(s, 0);
    s.uhr = setInterval(() => {
      const n = anzahl(s);
      // kumulativ einmal durchlaufen und dann stehen lassen, einzeln im Kreis.
      if (s.art === 'kumulativ') { if (s.a >= n - 1) return halt(s); zeige(s, s.a + 1); }
      else zeige(s, (s.a + 1) % n);
    }, s.takt);
  };
  let laeuft = false;
  const schleife = () => {
    let weiter = false;
    for (const s of szenen) if (s.k.dataset.modus === 'scroll' && s.sicht && !live(s)) { ausScroll(s); weiter = true; }
    if (weiter && performance.now() - zuletzt < 1200) requestAnimationFrame(schleife); else laeuft = false;
  };
  let zuletzt = 0;
  const wecke = () => { zuletzt = performance.now(); if (!laeuft) { laeuft = true; requestAnimationFrame(schleife); } };
  addEventListener('scroll', wecke, { passive: true });
  const io = new IntersectionObserver(es => es.forEach(e => {
    const s = szenen.find(x => x.beob.includes(e.target)); if (!s) return;
    if (e.isIntersecting) s.ziele.add(e.target); else s.ziele.delete(e.target);
    const vorher = s.sicht; s.sicht = s.ziele.size > 0;
    if (s.k.dataset.modus === 'takt' && vorher !== s.sicht) { if (s.sicht) starte(s); else halt(s); }
    if (s.sicht) wecke();
  }), { rootMargin: '0px 0px -20% 0px', threshold: .35 });
  szenen.forEach(s => s.beob.forEach(z => io.observe(z)));
  let warte;
  const neu = () => { clearTimeout(warte); warte = setTimeout(() => { szenen.forEach(s => { if (s.k.dataset.modus !== modus(s)) starte(s); }); wecke(); }, 150); };
  // motor.js lädt nach diesem Skript: sobald er steht, einmal nachziehen.
  addEventListener('load', wecke);
  addEventListener('resize', neu); RM.addEventListener?.('change', () => szenen.forEach(starte)); BREIT.addEventListener?.('change', neu);

  // Antippen einer Stufe springt dorthin: beim Scrollen an die passende Stelle, sonst direkt.
  szenen.forEach(s => s.k.addEventListener('click', e => {
    const z = e.target.closest('[data-waehle]'); if (!z || !s.k.contains(z) || live(s)) return;
    const a = +z.dataset.waehle;
    if (s.k.dataset.modus === 'scroll') {
      const r = s.k.getBoundingClientRect(), laenge = Math.max(1, s.k.offsetHeight - innerHeight);
      scrollTo({ top: scrollY + r.top + laenge * (a + .5) / anzahl(s), behavior: 'smooth' });
    } else { halt(s); zeige(s, a); }
  }));

  // Voice: ohne Skript stehen beide Gespräche da; mit Skript nur das gewählte.
  document.querySelectorAll('[data-fall-wahl]').forEach(g => {
    const an = g.querySelector('button[aria-pressed=true]')?.dataset.fall;
    g.closest('[data-stufen]')?.querySelectorAll('[data-fall-inhalt]').forEach(x => { x.hidden = x.dataset.fallInhalt !== an; });
  });
  szenen.forEach(s => { s.a = -1; starte(s); });

  // Voice: Fallwahl wechselt das Beispielgespräch und startet es von vorn.
  document.querySelectorAll('[data-fall-wahl]').forEach(gruppe => {
    const s = szenen.find(x => x.k.contains(gruppe));
    gruppe.addEventListener('click', e => {
      const b = e.target.closest('button[data-fall]'); if (!b || !s) return;
      if (live(s)) window.stufen.beendeLive?.();
      gruppe.querySelectorAll('button[data-fall]').forEach(x => x.setAttribute('aria-pressed', x === b));
      s.k.querySelectorAll('[data-fall-inhalt]').forEach(x => { x.hidden = x.dataset.fallInhalt !== b.dataset.fall; });
      s.a = -1;
      if (s.k.dataset.modus === 'scroll') { ausScroll(s); zeige(s, s.a, true); } else starte(s);
      s.ziele.clear(); s.beob.forEach(z => { io.unobserve(z); io.observe(z); });
    });
  });

  // Schnittstelle für das Sprechen mit dem Bot (voice-demo.js): Szene festhalten und selbst weiterschalten.
  window.stufen = {
    live(k, an) { const s = szenen.find(x => x.k === k); if (!s) return; halt(s); if (an) { s.k.dataset.live = '1'; zeige(s, 0, true); } else { const war = live(s); delete s.k.dataset.live; if (war) s.a = -1; starte(s); } },
    zeige(k, a) { const s = szenen.find(x => x.k === k); if (s) zeige(s, a, true); },
    stand(k) { const s = szenen.find(x => x.k === k); return s ? { a: s.a, n: anzahl(s) } : { a: -1, n: 0 }; }
  };

  // Laufband: anhalten und weiterlaufen lassen.
  document.querySelectorAll('[data-band-pause]').forEach(b => b.addEventListener('click', () => {
    const an = b.getAttribute('aria-pressed') !== 'true';
    b.setAttribute('aria-pressed', an); b.textContent = an ? 'Laufband fortsetzen' : 'Laufband anhalten';
    b.closest('.vd-ticker')?.classList.toggle('steht', an);
  }));
})();
