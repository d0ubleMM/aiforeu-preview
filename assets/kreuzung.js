// VerkehrsOS: die Kreuzung aus Punkten (wie im früheren Startbild). Beim Scrollen fliegen verstreute Punkte
// zu Fahrbahnen, Überwegen, Haltlinien und Ampeln zusammen. Gesteuert über den Kapitelfortschritt aus motor.js.
(() => {
  const cv = document.getElementById('kreuzung-canvas');
  if (!cv) return;
  const kap = cv.closest('[data-kapitel]'), box = cv.parentElement, ctx = cv.getContext('2d');
  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const prng = s => () => (s = s * 16807 % 2147483647) / 2147483647;
  const sm = t => t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t);
  const N = innerWidth < 760 ? 1300 : 2800;
  const Lin = (a, x1, y1, x2, y2, s, c) => { const n = Math.max(1, Math.round(Math.hypot(x2 - x1, y2 - y1) / s)); for (let i = 0; i <= n; i++) a.push(x1 + (x2 - x1) * i / n, y1 + (y2 - y1) * i / n, c); };
  const Rec = (a, x, y, w, h, s, c) => { for (let v = y; v <= y + h; v += s) for (let u = x; u <= x + w; u += s) a.push(u, v, c); };
  const Kre = (a, cx, cy, r, s, c) => { for (let v = -r; v <= r; v += s) for (let u = -r; u <= r; u += s) if (u * u + v * v <= r * r) a.push(cx + u, cy + v, c); };
  const packe = (a, seed) => {
    const n = Math.max(1, a.length / 3), r = prng(seed), x = new Float32Array(N), y = new Float32Array(N), c = new Uint8Array(N), idx = new Uint32Array(N);
    for (let i = 0; i < N; i++) idx[i] = n >= N ? Math.floor(i * n / N) : (i < n ? i : Math.floor(r() * n));
    for (let i = N - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)), t = idx[i]; idx[i] = idx[j]; idx[j] = t; }
    for (let i = 0; i < N; i++) { const k = idx[i] * 3; x[i] = (a[k] || 0) + (r() - .5) * .8; y[i] = (a[k + 1] || 0) + (r() - .5) * .8; c[i] = a[k + 2] || 0; }
    return { x, y, c };
  };
  // Farben: 0 Fahrbahn/Überweg, 1 Haltlinie, 2 Gelb, 3 Grün, 4 Mittellinie
  const F = ['rgba(250,250,247,.92)', '#E8352B', '#F5B800', '#1E9E5A', 'rgba(250,250,247,.36)'];
  const kreuzung = (a, W, H) => {
    const cx = W / 2, cy = H * .5, rw = Math.min(W, H) * .17, r = rw * .45, zw = rw * .42, s = 3;
    G = { cx, cy, rw, r, zw, h: rw + zw + 14 };
    for (const sx of [-1, 1]) for (const sy of [-1, 1]) {
      const ox = cx + sx * (rw + r), oy = cy + sy * (rw + r);
      Lin(a, ox, cy + sy * rw, sx < 0 ? 0 : W, cy + sy * rw, s, 0); Lin(a, cx + sx * rw, oy, cx + sx * rw, sy < 0 ? 0 : H, s, 0);
      for (let i = 0; i <= 12; i++) { const t = i / 12 * Math.PI / 2; a.push(ox - sx * r * Math.cos(t), oy - sy * r * Math.sin(t), 0); }
      const gx = cx + sx * (rw + r + 18), gy = cy + sy * (rw + r + 18); [1, 2, 3].forEach((c, k) => Kre(a, gx, gy - 11 + k * 11, 4.5, 2, c));
    }
    const dash = (x1, y1, x2, y2) => { const L = Math.hypot(x2 - x1, y2 - y1); for (let d = 0; d < L; d += 24) { const e = Math.min(d + 14, L); Lin(a, x1 + (x2 - x1) * d / L, y1 + (y2 - y1) * d / L, x1 + (x2 - x1) * e / L, y1 + (y2 - y1) * e / L, 3, 4); } };
    const g = rw + zw + 20; dash(0, cy, cx - g, cy); dash(cx + g, cy, W, cy); dash(cx, 0, cx, cy - g); dash(cx, cy + g, cx, H);
    for (let v = cy - rw + 5; v < cy + rw - 6; v += 11) { Rec(a, cx - rw - zw - 6, v, zw, 5, 2.5, 0); Rec(a, cx + rw + 6, v, zw, 5, 2.5, 0); }
    for (let u = cx - rw + 5; u < cx + rw - 6; u += 11) { Rec(a, u, cy - rw - zw - 6, 5, zw, 2.5, 0); Rec(a, u, cy + rw + 6, 5, zw, 2.5, 0); }
    const h = rw + zw + 14; Rec(a, cx - h - 4, cy + 3, 4, rw - 6, 2, 1); Rec(a, cx + h, cy - rw + 3, 4, rw - 6, 2, 1); Rec(a, cx - rw + 3, cy - h - 4, rw - 6, 4, 2, 1); Rec(a, cx + 3, cy + h, rw - 6, 4, 2, 1);
  };
  let W = 0, H = 0, ziel = null, wolke = null, sicht = false, letzt = -1, G = null;
  const baue = () => {
    W = cv.clientWidth; H = cv.clientHeight; if (!W || !H) return;
    const d = Math.min(devicePixelRatio || 1, 2); cv.width = W * d; cv.height = H * d; ctx.setTransform(d, 0, 0, d, 0, 0);
    const a = []; kreuzung(a, W, H); ziel = packe(a, 5);
    const r = prng(9), w = []; for (let i = 0; i < N; i++) w.push(r() * W, r() * H, ziel.c[i] === 0 ? 4 : ziel.c[i]);
    wolke = packe(w, 13); letzt = -1;
  };
  // ---- Analyse aus den Punkten: erkennen (.3–.55), mit Kartendaten prüfen (.55–.8), zur Freigabe vorlegen (.8–1) ----
  const fenster = (p, a, b) => sm((p - a) / (b - a));
  const bez = (a, c, b, t) => [(1 - t) * (1 - t) * a[0] + 2 * (1 - t) * t * c[0] + t * t * b[0], (1 - t) * (1 - t) * a[1] + 2 * (1 - t) * t * c[1] + t * t * b[1]];
  // Zeichnet eine Bahn bis zum Anteil t, gestrichelt, mit Pfeilspitze am Ende.
  const bahn = (punkt, t, farbe, breite = 2.2) => {
    if (t <= 0) return;
    const n = 70, k = Math.max(1, Math.round(n * t));
    ctx.save(); ctx.strokeStyle = farbe; ctx.lineWidth = breite; ctx.setLineDash([7, 6]); ctx.lineCap = 'round';
    ctx.beginPath(); for (let i = 0; i <= k; i++) { const [x, y] = punkt(i / n); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } ctx.stroke();
    if (t >= .999) {
      const [x1, y1] = punkt(1), [x0, y0] = punkt(.97), w = Math.atan2(y1 - y0, x1 - x0);
      ctx.setLineDash([]); ctx.fillStyle = farbe; ctx.beginPath();
      ctx.moveTo(x1 + Math.cos(w) * 4, y1 + Math.sin(w) * 4); ctx.lineTo(x1 - Math.cos(w - .5) * 11, y1 - Math.sin(w - .5) * 11); ctx.lineTo(x1 - Math.cos(w + .5) * 11, y1 - Math.sin(w + .5) * 11); ctx.fill();
    }
    ctx.restore();
  };
  const haken = (x, y, farbe, a, warn = false) => {
    if (a <= 0) return;
    ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = farbe; ctx.beginPath(); ctx.arc(x, y, 11, 0, 7); ctx.fill();
    ctx.strokeStyle = '#0E1014'; ctx.lineWidth = 2.4; ctx.lineCap = 'round'; ctx.beginPath();
    if (warn) { ctx.moveTo(x, y - 5); ctx.lineTo(x, y + 1); ctx.moveTo(x, y + 5); ctx.lineTo(x, y + 5.2); }
    else { ctx.moveTo(x - 5, y); ctx.lineTo(x - 1.5, y + 3.5); ctx.lineTo(x + 5, y - 3.5); }
    ctx.stroke(); ctx.restore();
  };
  const analyse = p => {
    if (!G || p < .3) return;
    const { cx, cy, rw, zw, h } = G, x0 = cx - h - 46;
    // Stufe 1: Überwege und Haltlinien kurz hervorgehoben, dann die Fahrbeziehungen
    const hv = fenster(p, .3, .36) * (1 - .6 * fenster(p, .42, .5));
    if (hv > 0) {
      ctx.save(); ctx.globalAlpha = hv; ctx.strokeStyle = '#FF4A3D'; ctx.lineWidth = 2;
      const zonen = [[cx - rw - zw - 10, cy - rw, zw + 8, rw * 2], [cx + rw + 2, cy - rw, zw + 8, rw * 2], [cx - rw, cy - rw - zw - 10, rw * 2, zw + 8], [cx - rw, cy + rw + 2, rw * 2, zw + 8]];
      for (const [x, y, w, hh] of zonen) ctx.strokeRect(x, y, w, hh);
      ctx.restore();
    }
    const weiss = 'rgba(241,242,240,.95)';
    // Rechtsabbieger in drei Teilen, damit er nie über den Bordstein fährt: gerade bis in den Knoten, Bogen, gerade hinaus.
    const a1 = [x0, cy + rw * .8], a2 = [cx - rw * .95, cy + rw * .8], kp = [cx - rw * .5, cy + rw * .8], a3 = [cx - rw * .5, cy + rw * 1.25], a4 = [cx - rw * .5, H * .96];
    const l1 = a2[0] - a1[0], l2 = rw * .7, l3 = a4[1] - a3[1], lg = l1 + l2 + l3;
    const rechts = t => { const d = t * lg; if (d <= l1) return [a1[0] + d, a1[1]]; if (d <= l1 + l2) return bez(a2, kp, a3, (d - l1) / l2); return [a3[0], a3[1] + (d - l1 - l2)]; };
    const bahnen = [
      t => [x0 + (W * .97 - x0) * t, cy + rw * .55],
      t => bez([x0, cy + rw * .3], [cx + rw * .5, cy + rw * .3], [cx + rw * .5, H * .04], t),
      rechts,
      t => [W - x0 - (W - x0 - W * .03) * t, cy - rw * .55],
      t => [cx - rw * .55, H * .03 + (H * .94) * t],
      t => [cx + rw * .55, H * .97 - (H * .94) * t],
    ];
    bahnen.forEach((f, i) => bahn(f, fenster(p, .36 + i * .025, .46 + i * .025), i < 3 ? '#FF4A3D' : weiss));
    // Stufe 2: Kartendaten (Mittellinien aus OpenStreetMap) legen sich darüber, Prüfpunkte je Zufahrt
    const k = fenster(p, .55, .62);
    if (k > 0) {
      ctx.save(); ctx.globalAlpha = .75 * k; ctx.strokeStyle = '#1E9E5A'; ctx.lineWidth = 1.6; ctx.setLineDash([2, 5]);
      ctx.beginPath(); ctx.moveTo(0, cy + 3); ctx.lineTo(W * k, cy + 3); ctx.moveTo(cx + 3, 0); ctx.lineTo(cx + 3, H * k); ctx.stroke(); ctx.restore();
    }
    const pruef = [[cx - h - 70, cy], [cx + h + 70, cy], [cx, cy + h + 60], [cx, cy - h - 60]];
    pruef.forEach(([x, y], i) => {
      const a = fenster(p, .6 + i * .03, .64 + i * .03);
      // Eine Zufahrt passt nicht zur Karte: erst gelb, nach der Prüfung am Plan grün.
      const offen = i === 3 && p < .76;
      haken(x, y, offen ? '#F5B800' : '#1E9E5A', a, offen);
    });
  };
  const liste = document.getElementById('vp-liste');
  let alt = -1;
  const karte = document.querySelector('.vp-ergebnis');
  if (karte) document.documentElement.classList.add('kreuzung-js');
  const phase = p => {
    const zeigen = p >= .8;
    if (karte && karte.classList.contains('sichtbar') !== zeigen) { karte.classList.toggle('sichtbar', zeigen); karte.inert = !zeigen; }
    const n = p < .55 ? 0 : p < .8 ? 1 : 2;
    if (n === alt || !liste) return; alt = n;
    [...liste.children].forEach((el, i) => el.classList.toggle('jetzt', i === n));
  };
  // Ohne klebende Bühne (Handy) läuft die Analyse einmal in etwa neun Sekunden ab, sobald sie zu sehen ist.
  let start = 0, fertigImTakt = false;
  const klebt = () => getComputedStyle(kap.querySelector('[data-buehne]')).position === 'sticky';
  const fortschritt = () => {
    if (RM) return 1;
    if (klebt()) { fertigImTakt = false; return window.ablauf?.wert ? window.ablauf.wert(kap) : 1; }
    if (!start) start = performance.now();
    const t = Math.min(1, (performance.now() - start) / 9000);
    fertigImTakt = t >= 1;
    return t;
  };
  // Freigabe: entscheidet der Mensch, nicht die Animation.
  const knopf = document.getElementById('vp-frei'), status = document.getElementById('vp-status');
  knopf?.addEventListener('click', () => {
    const an = knopf.getAttribute('aria-pressed') !== 'true';
    knopf.setAttribute('aria-pressed', an); knopf.textContent = an ? 'Zurücknehmen' : 'Freigeben';
    status.dataset.z = an ? 'erledigt' : 'wartet'; status.textContent = an ? 'freigegeben' : 'wartet auf Freigabe';
  });

  // Die Schleife läuft nur, solange die Kreuzung sichtbar ist; bei reduzierter Bewegung wird einmal fertig gezeichnet.
  let laeuft = false;
  const bild = () => {
    if (!sicht || !ziel) { laeuft = false; return; }
    // Im Zeitmodus (Handy) endet die Schleife nach dem fertigen Bild; beim Scrollen läuft sie, solange sichtbar.
    if (!RM && !(fertigImTakt && letzt === 1)) requestAnimationFrame(bild); else laeuft = false;
    const p = fortschritt();
    const e = sm(p / .3);
    if (Math.abs(p - letzt) < .0005) return; letzt = p;
    phase(p);
    ctx.clearRect(0, 0, W, H);
    for (let f = 0; f < 5; f++) {
      ctx.fillStyle = F[f];
      for (let i = 0; i < N; i++) {
        // Farbe erst zeigen, wenn der Punkt fast angekommen ist: vorher grau wie in der Wolke.
        const fz = e > .8 ? ziel.c[i] : 4; if (fz !== f) continue;
        // Jeder Punkt startet leicht versetzt, damit die Kreuzung von außen nach innen entsteht.
        const v = Math.min(1, Math.max(0, e * 1.35 - (i % 7) * .05));
        const x = wolke.x[i] + (ziel.x[i] - wolke.x[i]) * v, y = wolke.y[i] + (ziel.y[i] - wolke.y[i]) * v;
        ctx.fillRect(x - 1, y - 1, f === 4 ? 1.6 : 2.1, f === 4 ? 1.6 : 2.1);
      }
    }
    analyse(p);
  };
  const starte = () => { if (!laeuft && sicht) { laeuft = true; requestAnimationFrame(bild); } };
  new IntersectionObserver(es => { sicht = es[0].isIntersecting; letzt = -1; starte(); }).observe(box);
  let rz = 0; new ResizeObserver(() => { cancelAnimationFrame(rz); rz = requestAnimationFrame(() => { baue(); laeuft = false; starte(); }); }).observe(box);
  baue();
})();
