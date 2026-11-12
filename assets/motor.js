(() => {
  const kapitel = [...document.querySelectorAll('[data-kapitel]')];
  if (!kapitel.length || window.ablauf?.motor) return;
  const mq = matchMedia('(prefers-reduced-motion: reduce)');
  let still = mq.matches;
  const klemme = v => v < 0 ? 0 : v > 1 ? 1 : v;
  const kurve = t => 1 - Math.pow(1 - t, 3);
  const wurzel = document.documentElement;
  // Jedes Element gehört nur zum nächsten Kapitel um es herum, auch wenn Kapitel verschachtelt sind.
  const eigene = (k, sel) => [...k.querySelectorAll(sel)].filter(e => e.closest('[data-kapitel]') === k);
  const daten = kapitel.map((k, i) => {
    if (!k.id) k.id = 'kapitel-' + (i + 1);
    const spannen = eigene(k, '[data-spanne]').map(e => {
      const [a, b] = (e.dataset.spanne || '').split(/[\s,]+/).map(Number);
      const von = Number.isFinite(a) ? a : 0, bis = Number.isFinite(b) ? b : 1;
      return { e, von, bis: bis > von ? bis : von + .001, alt: -1 };
    });
    const folgen = eigene(k, 'canvas[data-folge]').map(c => {
      const f = { c, x: c.getContext('2d'), alt: -1, d: null };
      // Ist ein Bild fertig geladen, sofort neu zeichnen: sonst stünde bis zum nächsten Scrollen ein leeres Canvas da.
      f.bilder = c.dataset.folge.trim().split(/\s+/).filter(Boolean).map(src => { const b = new Image(); b.decoding = 'async'; b.src = src; b.decode?.().then(() => { if (f.d) zeichne(f, f.d.wert, true); }).catch(() => {}); return b; });
      return f;
    });
    const d = { k, oben: 0, laenge: 1, wert: 0, gesetzt: -1, sicht: true, spannen, folgen };
    folgen.forEach(f => { f.d = d; });
    return d;
  });
  // Bildfolge: Nachbarbilder weich überblendet, Ausschnitt wie object-fit: cover.
  const decke = (x, b, w, h, alpha) => {
    if (!b.complete || !b.naturalWidth) return false;
    const s = Math.max(w / b.naturalWidth, h / b.naturalHeight), bw = b.naturalWidth * s, bh = b.naturalHeight * s;
    x.globalAlpha = alpha; x.drawImage(b, (w - bw) / 2, (h - bh) / 2, bw, bh); x.globalAlpha = 1; return true;
  };
  const zeichne = (f, p, immer) => {
    const n = f.bilder.length; if (!n) return;
    const pos = p * (n - 1);
    if (!immer && Math.abs(pos - f.alt) < .002) return;
    const { width: w, height: h } = f.c; if (!w || !h) return;
    const i = Math.floor(pos), rest = pos - i, b = f.bilder[i];
    // Ist ein Bild noch nicht geladen, bleibt das zuletzt gezeichnete stehen. Sonst erst leeren, damit bei transparenten Bildern nichts nachbleibt.
    if (!b.complete || !b.naturalWidth) return;
    f.x.clearRect(0, 0, w, h);
    decke(f.x, b, w, h, 1);
    if (rest > .001 && f.bilder[i + 1]) decke(f.x, f.bilder[i + 1], w, h, rest);
    f.alt = pos;
  };
  const puffer = (f, d) => {
    const dpr = Math.min(2, devicePixelRatio || 1), r = f.c.getBoundingClientRect();
    const w = Math.round(r.width * dpr), h = Math.round(r.height * dpr);
    if (w && h && (w !== f.c.width || h !== f.c.height)) { f.c.width = w; f.c.height = h; zeichne(f, d.wert, true); }
  };
  const miss = () => {
    for (const d of daten) { const r = d.k.getBoundingClientRect(); d.oben = r.top + scrollY; d.laenge = Math.max(1, d.k.offsetHeight - innerHeight); }
  };
  // Fortschrittsanzeige: Claude setzt ein leeres Element mit data-ablauf-nav, der Motor füllt es mit den Kapiteln.
  const links = [...document.querySelectorAll('[data-ablauf-nav]')].map(nav => {
    if (!nav.getAttribute('aria-label')) nav.setAttribute('aria-label', 'Kapitel');
    return daten.map(d => {
      const a = document.createElement('a');
      a.className = 'ablauf-nav-link'; a.href = '#' + d.k.id; a.textContent = d.k.dataset.kapitel || d.k.id;
      a.addEventListener('click', e => { e.preventDefault(); miss(); const rand = parseFloat(getComputedStyle(d.k).scrollMarginTop) || 0; scrollTo({ top: d.oben - rand + 2, behavior: still ? 'auto' : 'smooth' }); if (!d.k.hasAttribute('tabindex')) d.k.setAttribute('tabindex', '-1'); d.k.focus({ preventScroll: true }); history.replaceState(null, '', '#' + d.k.id); });
      nav.append(a); return a;
    });
  });
  const setze = (d, p) => {
    d.gesetzt = p;
    d.k.style.setProperty('--p', p.toFixed(4));
    for (const s of d.spannen) { const v = kurve(klemme((p - s.von) / (s.bis - s.von))); if (Math.abs(v - s.alt) > .0005) { s.alt = v; s.e.style.setProperty('--t', v.toFixed(4)); } }
    for (const f of d.folgen) zeichne(f, p);
  };
  const ziel = d => still ? 1 : klemme((scrollY - d.oben) / d.laenge);
  let aktiv = -1, letzte = 0, laeuft = false, seite = '';
  // Die Schleife läuft nur, solange sich etwas bewegt, und schläft danach bis zum nächsten Scrollen.
  const schritt = t => {
    const dt = letzte ? Math.min(.1, Math.max(0, (t - letzte) / 1000)) : 1 / 60; letzte = t;
    const f = still ? 1 : 1 - Math.exp(-dt * 8);
    let bewegt = false;
    for (const d of daten) {
      const z = ziel(d);
      if (d.gesetzt === z && d.wert === z) continue;
      if (!d.sicht && !still) { d.wert = z; setze(d, z); continue; }
      d.wert += (z - d.wert) * f;
      if (Math.abs(z - d.wert) < .0005) d.wert = z; else bewegt = true;
      if (Math.abs(d.wert - d.gesetzt) >= .0005 || d.wert === z) setze(d, d.wert);
    }
    const max = Math.max(1, wurzel.scrollHeight - innerHeight);
    const sv = (still ? 1 : klemme(scrollY / max)).toFixed(4);
    if (sv !== seite) { seite = sv; wurzel.style.setProperty('--seite', sv); }
    let jetzt = -1;
    daten.forEach((d, i) => { if (scrollY + innerHeight / 2 >= d.oben) jetzt = i; });
    if (jetzt !== aktiv) { aktiv = jetzt; for (const reihe of links) reihe.forEach((a, i) => i === jetzt ? a.setAttribute('aria-current', 'step') : a.removeAttribute('aria-current')); }
    for (const reihe of links) reihe.forEach((a, i) => { const v = daten[i].gesetzt.toFixed(3); if (a.dataset.p !== v) { a.dataset.p = v; a.style.setProperty('--p', v); } });
    if (bewegt) requestAnimationFrame(schritt); else { laeuft = false; letzte = 0; }
  };
  const wecke = () => { if (!laeuft) { laeuft = true; requestAnimationFrame(schritt); } };
  const io = new IntersectionObserver(es => { for (const e of es) { const d = daten.find(x => x.k === e.target); if (d) d.sicht = e.isIntersecting; } wecke(); }, { rootMargin: '50% 0px' });
  daten.forEach(d => io.observe(d.k));
  // Neu messen, wenn sich Größen ändern: Fenster, nachgeladene Bilder und Schriften, aufgeklappte Inhalte.
  let warte;
  const neu = () => { clearTimeout(warte); warte = setTimeout(() => { miss(); for (const d of daten) for (const f of d.folgen) puffer(f, d); wecke(); }, 80); };
  const ro = new ResizeObserver(neu);
  ro.observe(document.body); daten.forEach(d => { ro.observe(d.k); d.folgen.forEach(f => ro.observe(f.c)); });
  addEventListener('resize', neu); addEventListener('load', neu); document.fonts?.ready.then(neu);
  // Beim Scrollen gelegentlich neu messen: Verschiebungen ohne Größenänderung meldet kein ResizeObserver.
  let gemessen = 0;
  addEventListener('scroll', () => { const t = performance.now(); if (t - gemessen > 400) { gemessen = t; miss(); } wecke(); }, { passive: true });
  mq.addEventListener?.('change', () => { still = mq.matches; window.ablauf.still = still; for (const d of daten) d.gesetzt = -1; wecke(); });
  miss(); for (const d of daten) for (const f of d.folgen) puffer(f, d);
  // Erster Stand ohne Glättung, damit nichts beim Laden hereinspringt.
  for (const d of daten) { d.wert = ziel(d); setze(d, d.wert); }
  // Für eigene Effekte: geglätteter Fortschritt des Kapitels, in dem ein Element steht.
  window.ablauf = { motor: true, still, wert: el => { const k = el?.closest?.('[data-kapitel]'); const d = daten.find(x => x.k === k); return d ? d.wert : 0; } };
  wecke();
})();