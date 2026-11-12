/* AIFOREU · Flug · Modell „workforce“ – Agentario: Autonomous Workforce.
   Modulare Raumstation: Nabe mit Andockringen, vier Arme mit Modulen, zwei Solarflügelpaare.
   Auf einem Schienennetz (Ring um die Nabe, Doppelspur je Arm) pendeln Agenten-Kapseln mit oranger Fracht. */
import { RoundedBoxGeometry } from '../agentario-scene/vendor/RoundedBoxGeometry.js';

export default function erstelle(THREE, k) {
  const F = k.farben, hoch = k.qualitaet !== 'niedrig';
  const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
  const OBEN = V(0, 1, 0), TAU = Math.PI * 2;
  const seg = n => Math.max(6, Math.round(hoch ? n : n * .5));
  let saat = 7041;
  const zufall = () => (saat = (saat * 1664525 + 1013904223) >>> 0) / 4294967296;
  const glatt = x => x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x);
  const gruppe = new THREE.Group(); gruppe.name = 'workforce';

  // ---------- Leinwand-Texturen ----------
  const textur = (w, h, malen, farbig = true) => {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    malen(c.getContext('2d'), w, h);
    const t = new THREE.CanvasTexture(c); if (farbig) t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; return t;
  };
  const rund = (x, a, b, w, h, r) => { x.beginPath(); x.roundRect(a, b, w, h, r); };
  const KACHEL = .24;   // Weltmaß einer Paneelkachel (6 × 4 Paneele, Paneel wie bisher .04 × .06)
  const FKACHEL = .2;   // Weltmaß einer Fensterkachel (16 Fenster)

  // Keramikhaut: 24 Paneele je Kachel mit echten Tonunterschieden (einzelne getauschte Paneele, Thermodecken),
  // feine Fugen, Nieten, wenige Wartungsklappen. Größere Kachel, damit das Raster nicht sichtbar wiederkehrt.
  // eigener Zufall für die Haut, damit die Folge für Solarzellen und Fahrplan-Phasen unverändert bleibt
  let saatHaut = 3317; const zufallHaut = () => (saatHaut = (saatHaut * 1664525 + 1013904223) >>> 0) / 4294967296;
  for (let i = 0; i < 6; i++) zufall();
  const PC = 6, PR = 4;
  const ton = Array.from({ length: PC * PR }, () => { const z = zufallHaut(); return z < .1 ? -14 : z > .9 ? 7 : Math.round((z - .5) * 9); });
  const decke = Array.from({ length: PC * PR }, () => zufallHaut() < .12);
  const klappe = Array.from({ length: PC * PR }, () => zufallHaut() < .2);
  const fugen = (x, w, h, farbe, licht, niete, klappenFarbe) => {
    const pw = w / PC, ph = h / PR;
    x.fillStyle = farbe; for (let c = 0; c <= PC; c++) x.fillRect(c * pw - 1.5, 0, 3, h); for (let r = 0; r <= PR; r++) x.fillRect(0, r * ph - 1.5, w, 3);
    if (licht) { x.fillStyle = licht; for (let c = 0; c < PC; c++) x.fillRect(c * pw + 1.5, 0, 1.2, h); for (let r = 0; r < PR; r++) x.fillRect(0, r * ph + 1.5, w, 1.2); }
    for (let r = 0; r < PR; r++) for (let c = 0; c < PC; c++) {
      x.fillStyle = niete;
      for (const [dx, dy] of [[12, 12], [pw - 12, 12], [12, ph - 12], [pw - 12, ph - 12], [pw / 2, 12], [pw / 2, ph - 12]]) { x.beginPath(); x.arc(c * pw + dx, r * ph + dy, 2.2, 0, TAU); x.fill(); }
      if (klappe[r * PC + c]) { x.strokeStyle = klappenFarbe; x.lineWidth = 2; rund(x, c * pw + pw * .28, r * ph + ph * .3, pw * .44, ph * .3, 4); x.stroke(); }
    }
  };
  const haut = textur(1024, 1024, (x, w, h) => {
    const pw = w / PC, ph = h / PR;
    for (let r = 0; r < PR; r++) for (let c = 0; c < PC; c++) {
      const i = r * PC + c, l = 238 + ton[i];
      x.fillStyle = decke[i] ? `rgb(${l - 10},${l - 9},${l - 7})` : `rgb(${l - 1},${l},${l + 1})`; x.fillRect(c * pw, r * ph, pw, ph);
      if (decke[i]) { x.fillStyle = 'rgba(120,124,130,.16)'; for (let s = 1; s < 6; s++) x.fillRect(c * pw + 6, r * ph + s * ph / 6, pw - 12, 1.4); } // gesteppte Thermodecke
    }
    fugen(x, w, h, 'rgba(110,112,116,.34)', 'rgba(255,255,255,.22)', 'rgba(130,132,136,.3)', 'rgba(110,112,116,.28)');
  });
  const relief = textur(1024, 1024, (x, w, h) => { x.fillStyle = '#fff'; x.fillRect(0, 0, w, h); fugen(x, w, h, '#8c8c8c', null, '#d0d0d0', '#a8a8a8'); }, false);

  // Fensterband: 8 Fenster je Kachel, v läuft entlang des Bandes
  const hell = [.95, .74, 1, .86, .62, .92, 1, .8, .9, 1, .7, .96, .82, 1, .66, .9];
  const fensterBild = textur(64, 1024, (x, w, h) => {
    x.fillStyle = '#4a525d'; x.fillRect(0, 0, w, h);
    x.fillStyle = '#6a737f'; x.fillRect(0, 0, 4, h); x.fillRect(w - 4, 0, 4, h);
    for (let i = 0; i < 16; i++) { x.fillStyle = '#0a0d12'; rund(x, 9, i * 64 + 8, 46, 48, 9); x.fill(); }
  });
  const fensterLicht = textur(64, 1024, (x, w, h) => {
    x.fillStyle = '#000'; x.fillRect(0, 0, w, h);
    for (let i = 0; i < 16; i++) {
      const b = hell[i], g = x.createLinearGradient(14, 0, 50, 0);
      g.addColorStop(0, `rgba(255,244,228,${b})`); g.addColorStop(1, `rgba(255,212,172,${b * .72})`);
      x.fillStyle = g; rund(x, 11, i * 64 + 10, 42, 44, 8); x.fill();
    }
  });

  // Solarzellen: dunkle Zellen, feines Raster, hellere Scharniere je acht Zellen; u läuft entlang des Flügels
  const zellenBild = textur(1024, 128, (x, w, h) => {
    x.fillStyle = '#58606c'; x.fillRect(0, 0, w, h);
    const nx = 48, ny = 6, cw = w / nx, ch = h / ny;
    for (let i = 0; i < nx; i++) {
      const feld = Math.floor(i / 8), basis = 22 + (feld * 37 % 6);
      for (let j = 0; j < ny; j++) {
        const l = basis + Math.round(zufall() * 4);
        x.fillStyle = `rgb(${l + 1},${l + 1},${l + 3})`; x.fillRect(i * cw + 1, j * ch + 1, cw - 2, ch - 2);
        x.fillStyle = 'rgba(160,170,184,.13)'; for (let f = 1; f < 4; f++) x.fillRect(i * cw + 1, j * ch + f * ch / 4, cw - 2, .6);
        x.fillStyle = 'rgba(190,198,210,.22)'; x.fillRect(i * cw + cw / 2 - .4, j * ch + 1, .8, ch - 2);
      }
    }
    x.fillStyle = '#6f7884'; for (let i = 0; i <= nx; i += 8) x.fillRect(i * cw - 1.1, 0, 2.2, h);
    x.fillStyle = '#7d8693'; x.fillRect(0, 0, w, 1.5); x.fillRect(0, h - 1.5, w, 1.5);
  });
  // Rückseite: helle, neutrale Trägerfolie mit Scharnieren (nicht goldbraun)
  const rueckBild = textur(512, 32, (x, w, h) => { x.fillStyle = '#d4d7db'; x.fillRect(0, 0, w, h); x.fillStyle = 'rgba(60,66,74,.4)'; for (let i = 0; i <= 48; i += 8) x.fillRect(i * w / 48 - 1, 0, 2, h); x.fillStyle = 'rgba(60,66,74,.12)'; for (let i = 0; i < 48; i++) x.fillRect(i * w / 48, 0, .7, h); });

  // Gitterrost der Schiebebühnen: Aluminiumstege, quadratische Löcher (Alpha); u läuft entlang des Arms
  const rostBild = textur(128, 256, (x, w, h) => {
    x.clearRect(0, 0, w, h); x.fillStyle = '#e6e9ec'; x.fillRect(0, 0, w, h);
    const nx = 5, ny = 10, cw = (w - 12) / nx, ch = (h - 12) / ny; // wenige große Löcher: bleiben auch schräg sauber
    for (let i = 0; i < nx; i++) for (let j = 0; j < ny; j++) x.clearRect(6 + i * cw + cw * .19, 6 + j * ch + ch * .19, cw * .62, ch * .62);
    x.fillStyle = '#e6e9ec'; x.fillRect(0, 0, w, 6); x.fillRect(0, h - 6, w, 6); x.fillRect(0, 0, 6, h); x.fillRect(w - 6, 0, 6, h); // Rahmen
  });
  rostBild.wrapS = rostBild.wrapT = THREE.ClampToEdgeWrapping;

  // Leuchtpunkt für Lampen
  const punktBild = textur(64, 64, (x, w) => {
    const g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(.18, 'rgba(255,255,255,.75)'); g.addColorStop(.45, 'rgba(255,255,255,.16)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g; x.fillRect(0, 0, w, w);
  });

  // ---------- Materialien (auf schwarze Umgebung und warme Sonne abgestimmt) ----------
  // Metall mit hohem Metallanteil spiegelt hier fast nur Schwarz und wird unter der warmen Sonne bronzefarben.
  // Deshalb: helles, leicht kühles Aluminium mit wenig Metallanteil; Haut minimal kühl, damit sie weiß statt creme liest.
  const mat = {
    keramik: new THREE.MeshPhysicalMaterial({ color: '#e5ebf1', map: haut, bumpMap: relief, bumpScale: .45, roughness: .52, metalness: 0, clearcoat: .3, clearcoatRoughness: .4 }),
    stahl: new THREE.MeshPhysicalMaterial({ color: '#c9d0d9', metalness: .28, roughness: .38, clearcoat: .25, clearcoatRoughness: .3 }),
    poliert: new THREE.MeshPhysicalMaterial({ color: '#dfe4ea', metalness: .62, roughness: .24, clearcoat: .5 }),
    graphit: new THREE.MeshPhysicalMaterial({ color: '#30373f', metalness: .25, roughness: .5, clearcoat: .3, clearcoatRoughness: .35 }),
    tinte: new THREE.MeshStandardMaterial({ color: F.tinte, metalness: .2, roughness: .5 }),
    orange: new THREE.MeshPhysicalMaterial({ color: F.orange, roughness: .4, metalness: .05, clearcoat: .5 }),
    fenster: new THREE.MeshPhysicalMaterial({ color: '#ffffff', map: fensterBild, emissive: '#ffd0a2', emissiveMap: fensterLicht, emissiveIntensity: 1.6, roughness: .2, metalness: .15, clearcoat: .8 }),
    zellen: new THREE.MeshPhysicalMaterial({ color: '#ffffff', map: zellenBild, metalness: .3, roughness: .28, clearcoat: 1, clearcoatRoughness: .05 }),
    rueck: new THREE.MeshStandardMaterial({ color: '#bfc3c8', map: rueckBild, roughness: .8 }),
    schiene: new THREE.MeshPhysicalMaterial({ color: '#eef1f4', metalness: .35, roughness: .28, clearcoat: .4 }),
    rost: new THREE.MeshStandardMaterial({ color: '#c6ccd3', map: rostBild, alphaTest: .5, metalness: .3, roughness: .5, side: THREE.DoubleSide }),
  };
  const statusMat = () => new THREE.MeshPhysicalMaterial({ color: '#aeb7c3', metalness: .55, roughness: .34, emissive: F.orange, emissiveIntensity: 0 });
  const hautMat = () => { const m = mat.keramik.clone(); m.emissive = new THREE.Color('#ff9430'); m.emissiveIntensity = 0; return m; };
  const satz = (status = mat.orange, haut = mat.keramik) => [haut, mat.stahl, status, mat.poliert, mat.graphit, mat.tinte];
  const K_ = 0, ST = 1, SU = 2, PO = 3, GR = 4, TI = 5; // Materialindizes im Satz

  // ---------- Geometrie-Helfer ----------
  const mittel = (a, b) => { const x = a[0] + b[0], y = a[1] + b[1], l = Math.hypot(x, y) || 1; return [x / l, y / l]; };
  /* Drehkörper um Y. Profil [[r, y, Material, glatt], ...] von unten nach oben; harte Kanten, außer glatt = 1. */
  function drehkoerper(profil, n, { kachel = KACHEL, phi0 = 0, phiL = TAU, uFest = false, tausch = false } = {}) {
    const sn = [], bogen = [0];
    for (let i = 0; i < profil.length - 1; i++) {
      const dr = profil[i + 1][0] - profil[i][0], dy = profil[i + 1][1] - profil[i][1], l = Math.hypot(dr, dy) || 1;
      sn.push([dy / l, -dr / l]); bogen.push(bogen[i] + l);
    }
    const gesamt = bogen[bogen.length - 1], rMax = Math.max(...profil.map(p => p[0]));
    const uRep = uFest ? 1 : Math.max(1, Math.round(rMax * phiL / kachel));
    const pos = [], nor = [], uv = [], idx = [], gruppen = [];
    for (let i = 0; i < profil.length - 1; i++) {
      const a = profil[i], b = profil[i + 1];
      if (Math.hypot(b[0] - a[0], b[1] - a[1]) < 1e-7) continue;
      const nA = a[3] && i > 0 ? mittel(sn[i - 1], sn[i]) : sn[i];
      const nB = b[3] && i < sn.length - 1 ? mittel(sn[i], sn[i + 1]) : sn[i];
      const basis = pos.length / 3;
      for (let j = 0; j <= n; j++) {
        const f = phi0 + phiL * j / n, s = Math.sin(f), c = Math.cos(f);
        for (const [p, q, bl] of [[a, nA, bogen[i]], [b, nB, bogen[i + 1]]]) {
          pos.push(p[0] * s, p[1], p[0] * c); nor.push(q[0] * s, q[1], q[0] * c);
          if (tausch) uv.push(bl / gesamt, p[0] * phiL * j / n / kachel); else uv.push(j / n * uRep, bl / kachel);
        }
      }
      const start = idx.length;
      for (let j = 0; j < n; j++) { const a0 = basis + j * 2; idx.push(a0, a0 + 2, a0 + 1, a0 + 1, a0 + 2, a0 + 3); }
      const m = a[2] || 0, letzte = gruppen[gruppen.length - 1];
      if (letzte && letzte.m === m) letzte.count += idx.length - start; else gruppen.push({ start, count: idx.length - start, m });
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(idx); for (const gr of gruppen) g.addGroup(gr.start, gr.count, gr.m);
    return g;
  }
  const netz = (geo, m, schatten = true) => { const x = new THREE.Mesh(geo, m); x.castShadow = schatten; x.receiveShadow = true; return x; };
  // Kasten mit Fase, UV als Kastenprojektion in Weltmaß
  function kasten(b, l, h, r = .008, s = 2) {
    const g = new RoundedBoxGeometry(b, l, h, s, r);
    const p = g.attributes.position, n = g.attributes.normal, uv = g.attributes.uv;
    for (let i = 0; i < p.count; i++) {
      const ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i)), az = Math.abs(n.getZ(i));
      const [u, w] = ax >= ay && ax >= az ? [p.getY(i), p.getZ(i)] : ay >= az ? [p.getX(i), p.getZ(i)] : [p.getX(i), p.getY(i)];
      uv.setXY(i, u / KACHEL + .5, w / KACHEL + .5);
    }
    return g;
  }
  // Stäbe als Quader-Instanzen: Liste von Matrizen
  const _y = V(), _z = V(), _x = V();
  function stab(liste, a, b, breite, hoehe = breite, oben = null) {
    _y.subVectors(b, a); const l = _y.length(); if (l < 1e-6) return; _y.divideScalar(l);
    _z.copy(oben || (Math.abs(_y.y) < .95 ? OBEN : V(1, 0, 0)));
    _z.addScaledVector(_y, -_z.dot(_y)); if (_z.lengthSq() < 1e-8) _z.set(0, 0, 1);
    _z.normalize(); _x.crossVectors(_y, _z);
    const m = new THREE.Matrix4().makeBasis(_x, _y, _z).scale(V(breite, l, hoehe));
    m.setPosition((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2); liste.push(m);
  }
  function instanzen(liste, m, schatten = true) {
    const im = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), m, Math.max(1, liste.length));
    liste.forEach((x, i) => im.setMatrixAt(i, x)); im.count = liste.length;
    im.castShadow = schatten; im.receiveShadow = true; return im;
  }
  // Geometrien mit Eckfarben zu einer verschmelzen (für Kapseln)
  function verschmelze(teile) {
    const pos = [], nor = [], col = [], c = new THREE.Color();
    for (const { geo, farbe } of teile) {
      const g = geo.index ? geo.toNonIndexed() : geo, p = g.attributes.position;
      pos.push(...p.array); nor.push(...g.attributes.normal.array);
      for (let i = 0; i < p.count; i += 3) {
        const cx = (p.getX(i) + p.getX(i + 1) + p.getX(i + 2)) / 3, cy = (p.getY(i) + p.getY(i + 1) + p.getY(i + 2)) / 3, cz = (p.getZ(i) + p.getZ(i + 1) + p.getZ(i + 2)) / 3;
        c.set(typeof farbe === 'function' ? farbe(cx, cy, cz) : farbe); for (let j = 0; j < 3; j++) col.push(c.r, c.g, c.b);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    return g;
  }
  // Übergabe-Leuchte: orange Flankenlicht am Statusring, nur sichtbar, solange das Modul übergibt
  const uebergabeLicht = (eltern, pos, groesse) => {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: punktBild, color: F.orange, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
    s.position.copy(pos); s.scale.setScalar(groesse); s.visible = false; s.userData.groesse = groesse; eltern.add(s); return s;
  };
  const leuchten = [];
  function leuchte(eltern, pos, farbe, groesse, art = 'fest', phase = 0) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: punktBild, color: farbe, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
    s.position.copy(pos); s.scale.setScalar(groesse); eltern.add(s); leuchten.push({ s, art, phase, groesse }); return s;
  }
  // Parabolschüssel (Öffnung nach +Y)
  const schuessel = (r, tiefe, dicke = .003) => {
    const p = [], n = 5;
    for (let i = 0; i <= n; i++) { const x = r * i / n; p.push([x, x * x / (r * r) * tiefe - tiefe, 0, 1]); }
    for (let i = n; i >= 0; i--) { const x = r * i / n; p.push([x, x * x / (r * r) * tiefe - tiefe - dicke, 0, 1]); }
    return drehkoerper(p.reverse(), seg(20));
  };

  // ---------- Maße des Netzes ----------
  const SY = .105;            // Oberkante der Schienen
  const RR = .205;            // Radius des Ringgleises um die Nabe
  const SW = .0175;           // halber Spurabstand je Arm
  const KR = .0122, KL = .056, KF = .8; // Kapsel: Radius, Länge, Abflachung
  const KY = SY + .005 + KR * KF;       // Höhe der Kapselmitte
  const BUCHT = (SW + .033) / SW;       // Abstand der Ausweichgleise von der Mitte (in Spurmaß); Seite −1 innen, +1 außen
  const alpha = kk => kk * Math.PI / 2;            // Arm k: 0 = +X, 1 = −Z, 2 = −X, 3 = +Z
  const richtung = a => V(Math.cos(a), 0, -Math.sin(a));
  const quer = a => V(-Math.sin(a), 0, -Math.cos(a)); // Fahrtrichtung des Rings

  const staebe = { stahl: [], schiene: [], graphit: [], rost: [] };
  const module = []; // für die Übergabe: { status, fenster, haut, reihe }
  const dreher = [];
  const docks = [];  // Ausweichgleise: { k, r, seite }

  // ---------- Nabe ----------
  const nabe = new THREE.Group(); nabe.name = 'Nabe'; gruppe.add(nabe);
  const nabeProfil = [
    [0, -.192, ST], [.07, -.192, ST], [.076, -.186, ST], [.076, -.178, K_], [.118, -.158, K_], [.131, -.15, K_], [.135, -.142, K_],
    [.135, -.074, PO], [.151, -.074, PO], [.155, -.07, PO], [.155, -.056, PO], [.151, -.052, PO], [.135, -.052, K_],
    [.135, -.034, TI], [.129, -.03, TI], [.129, .03, TI], [.135, .034, K_],
    [.135, .052, PO], [.151, .052, PO], [.155, .056, PO], [.155, .07, PO], [.151, .074, PO], [.135, .074, K_],
    [.135, .142, K_], [.131, .15, K_], [.118, .158, K_], [.076, .178, ST], [.076, .186, ST], [.07, .192, ST], [0, .192],
  ];
  const nabeHaut = hautMat();
  nabe.add(netz(drehkoerper(nabeProfil, seg(44)), satz(mat.orange, nabeHaut)));
  const nabeStatus = statusMat();
  nabe.add(netz(drehkoerper([[.135, .039, SU], [.1366, .0402, SU], [.1366, .0448, SU], [.135, .046]], seg(44)), satz(nabeStatus), false));
  // Fensterband der Nabe: vier Bögen zwischen den Tunneln
  const nabeFenster = mat.fenster.clone();
  for (let i = 0; i < 4; i++) {
    const mitte = alpha(i) + Math.PI / 2 + Math.PI / 4;
    nabe.add(netz(drehkoerper([[.1298, -.019], [.1298, .019]], seg(14), { phi0: mitte - .42, phiL: .84, tausch: true, kachel: FKACHEL * 1.3 }), nabeFenster, false));
  }
  module.push({ status: nabeStatus, fenster: nabeFenster, haut: nabeHaut, reihe: 0,
    lichter: [0, 1, 2, 3].map(i => uebergabeLicht(nabe, richtung(Math.PI / 4 + i * Math.PI / 2).multiplyScalar(.142).setY(.0425), .06)) });
  // Axiale Andockstutzen oben und unten
  const stutzen = [[0, .192, GR], [.05, .192, GR], [.05, .204, PO], [.06, .204, PO], [.062, .207, PO], [.062, .217, PO], [.058, .221, ST], [.04, .221, ST], [.04, .225, ST], [0, .225]];
  const spiegelY = p => p.map(q => [q[0], -q[1], q[2]]).reverse().map((q, i, a) => [q[0], q[1], a[i + 1]?.[2] ?? 0]);
  nabe.add(netz(drehkoerper(stutzen, seg(36)), satz()));
  nabe.add(netz(drehkoerper(spiegelY(stutzen), seg(36)), satz()));
  for (let i = 0; i < 3; i++) { // Führungsblätter am oberen Andockring
    const w = i * TAU / 3 + .3, b = netz(new THREE.BoxGeometry(.018, .02, .004), mat.stahl);
    b.position.set(Math.sin(w) * .054, .232, Math.cos(w) * .054); b.rotation.y = w; b.rotation.x = -.28; nabe.add(b);
  }
  // Antennenmast oben mit kleiner Schüssel und Leuchtfeuer
  stab(staebe.stahl, V(0, .225, 0), V(0, .315, 0), .006);
  stab(staebe.stahl, V(-.022, .272, 0), V(.022, .272, 0), .0028);
  const kleinSchuessel = netz(schuessel(.03, .009), mat.keramik); kleinSchuessel.position.set(0, .293, .012); kleinSchuessel.rotation.x = .9; nabe.add(kleinSchuessel);
  leuchte(nabe, V(0, .322, 0), F.orange, .07, 'feuer');
  // RCS-Düsenblöcke auf der oberen Schulter
  for (let i = 0; i < (hoch ? 4 : 0); i++) {
    const w = i * Math.PI / 2 + Math.PI / 4 + Math.PI / 2, blk = new THREE.Group(); blk.position.set(Math.sin(w) * .108, .165, Math.cos(w) * .108); blk.rotation.y = w; nabe.add(blk);
    const kb = netz(kasten(.024, .014, .016, .002, 1), mat.graphit); blk.add(kb);
    for (const [dx, dy, rx, rz] of [[0, .011, 0, 0], [.016, 0, 0, -Math.PI / 2], [-.016, 0, 0, Math.PI / 2]]) {
      const d = netz(new THREE.CylinderGeometry(.0028, .0045, .008, seg(8), 1, true), mat.stahl); d.position.set(dx, dy, 0); d.rotation.set(rx, 0, rz); blk.add(d);
    }
  }

  // Andockgaragen der Kapseln: vier Hallentore in der Nabenwand zwischen den Armen.
  // Innen dunkel mit Lichtleiste am Sturz, warmem Bodenschein und den Schienen, die hineinführen (kein flacher Bildschirm).
  const torBild = textur(128, 64, (x, w, h) => {
    x.fillStyle = '#05070a'; x.fillRect(0, 0, w, h);
    const g = x.createLinearGradient(0, h, 0, h * .35); g.addColorStop(0, 'rgba(255,168,100,.42)'); g.addColorStop(1, 'rgba(255,168,100,0)');
    x.fillStyle = g; x.fillRect(0, 0, w, h);
    x.fillStyle = 'rgba(255,190,140,.10)'; for (let i = 1; i < 8; i++) { x.fillRect(i * w / 8, 8, 1, h - 8); } // Spanten der Halle
    x.fillStyle = '#fff1df'; x.fillRect(5, 1, w - 10, 4);                                          // Lichtleiste
    x.fillStyle = 'rgba(214,206,196,.75)'; for (const u of [.235, .765]) x.fillRect(u * w - 2, h * .58, 4, h * .42); // Schienen
  });
  const torMat = new THREE.MeshBasicMaterial({ map: torBild, color: '#ffffff' });
  for (let g = 0; g < 4; g++) {
    const a = Math.PI / 4 + g * Math.PI / 2, d = richtung(a), q = quer(a);
    const p0 = d.clone().multiplyScalar(.134).setY(KY + .001);
    const tor = new THREE.Group(); tor.position.copy(p0);
    tor.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(q.clone(), OBEN, d));
    tor.add(netz(kasten(.078, .044, .01, .003, 1), mat.graphit));
    const innen = new THREE.Mesh(new THREE.PlaneGeometry(.066, .031), torMat); innen.position.set(0, -.0025, .0052); tor.add(innen);
    nabe.add(tor);
    // Zarge aus Aluminium: Sturz, Schwelle, Pfosten
    const ecke = (sq, su) => p0.clone().addScaledVector(q, sq).addScaledVector(OBEN, su).addScaledVector(d, .0062);
    stab(staebe.stahl, ecke(-.0365, .0148), ecke(.0365, .0148), .004, .004);
    stab(staebe.stahl, ecke(-.0365, -.0195), ecke(.0365, -.0195), .003, .003);
    for (const sq of [-.0352, .0352]) stab(staebe.stahl, ecke(sq, -.0195), ecke(sq, .0148), .0034, .0034);
    leuchte(nabe, ecke(0, .0118).addScaledVector(d, .003), F.glut, .032, 'garage', g);
    for (const sq of [-1, 1]) stab(staebe.schiene, d.clone().multiplyScalar(.14).addScaledVector(q, sq * SW).setY(SY - .002), d.clone().multiplyScalar(RR).addScaledVector(q, sq * SW).setY(SY - .002), .0055, .004);
  }
  // Ringgleis um die Nabe, mit Auslegern
  const ringProfil = [[RR - .0028, SY - .004, 0], [RR + .0028, SY - .004, 0], [RR + .0028, SY, 0], [RR - .0028, SY, 0], [RR - .0028, SY - .004]];
  nabe.add(netz(drehkoerper(ringProfil, seg(72)), mat.schiene, false));
  for (let i = 0; i < 8; i++) {
    const a = Math.PI / 8 + i * Math.PI / 4, d = richtung(a);
    stab(staebe.stahl, d.clone().multiplyScalar(.134).setY(SY - .009), d.clone().multiplyScalar(RR + .004).setY(SY - .009), .004, .005);
    stab(staebe.stahl, d.clone().multiplyScalar(RR).setY(SY - .004), d.clone().multiplyScalar(RR).setY(SY - .012), .0045);
  }

  // Leitlicht an der Außenkante des Ringgleises: klein ist es die warme Ellipse, die den Ring lesbar macht
  const streifenMat = new THREE.MeshBasicMaterial({ color: F.glut });
  nabe.add(netz(drehkoerper([[RR + .0029, SY - .0033], [RR + .0029, SY - .0011]], seg(72)), streifenMat, false));
  const RL = 32, ringLampen = new THREE.InstancedMesh(new THREE.BoxGeometry(.0026, .003, .0062), new THREE.MeshBasicMaterial({ color: '#ffffff' }), RL);
  for (let i = 0; i < RL; i++) { const a = i * TAU / RL + TAU / RL / 2; ringLampen.setMatrixAt(i, new THREE.Matrix4().makeRotationY(a).setPosition(Math.cos(a) * (RR + .0042), SY - .0022, -Math.sin(a) * (RR + .0042))); ringLampen.setColorAt(i, new THREE.Color(F.glut)); }
  gruppe.add(ringLampen);

  // ---------- Arme ----------
  const armGruppe = [];
  for (let kk = 0; kk < 4; kk++) {
    const d = richtung(alpha(kk)), m = new THREE.Matrix4().makeBasis(d.clone().cross(OBEN), d, OBEN);
    const g = new THREE.Group(); g.quaternion.setFromRotationMatrix(m); gruppe.add(g);
    armGruppe.push({ g, m });
  }
  // lokale Koordinaten eines Arms: X quer (= Außenspur), Y nach außen, Z oben
  const welt = (kk, p) => p.clone().applyMatrix4(armGruppe[kk].m);
  const stabA = (kk, liste, a, b, br, ho, oben) => stab(liste, welt(kk, a), welt(kk, b), br, ho, oben ? oben.clone().applyMatrix4(armGruppe[kk].m) : null);
  const add = (kk, o) => { armGruppe[kk].g.add(o); return o; };

  // Zylindermodul mit Kegelenden, Rippen, Statusring und zwei Fensterbändern auf den oberen Flanken
  function zylModul(kk, r, y0, y1, { e0 = .046, e1 = .046, rippen = [], status, fenster, kegel = .024, reihe }) {
    const st = statusMat(), fm = mat.fenster.clone(), hm = hautMat();
    const ringe = rippen.map(y => ({ y, m: ST })).concat([{ y: status, m: SU, b: .0045, h: .0016 }]).sort((p, q) => p.y - q.y);
    const p = [[0, y0, ST], [e0, y0, ST], [e0, y0 + .004, K_], [r - .005, y0 + kegel, K_], [r, y0 + kegel + .005, K_]];
    for (const g of ringe) { const b = g.b || .007, h = g.h || .0026; p.push([r, g.y - b / 2, g.m], [r + h, g.y - b / 2 + h * .6, g.m], [r + h, g.y + b / 2 - h * .6, g.m], [r, g.y + b / 2, K_]); }
    p.push([r, y1 - kegel - .005, K_], [r - .005, y1 - kegel, K_], [e1, y1 - .004, ST], [e1, y1, ST], [0, y1]);
    add(kk, netz(drehkoerper(p, seg(34)), satz(st, hm)));
    for (const s of [1, -1]) {
      const breite = .0145 / r;
      add(kk, netz(drehkoerper([[r + .0012, fenster[0]], [r + .0012, fenster[1]]], seg(5), { phi0: s * .92 - breite / 2, phiL: breite, uFest: true, kachel: FKACHEL }), fm, false));
    }
    // Handlauf an der Unterseite
    if (hoch) {
      const w = 2.3, rr = r + .0055, pa = V(Math.sin(w) * rr, y0 + kegel + .018, Math.cos(w) * rr), pb = V(Math.sin(w) * rr, y1 - kegel - .018, Math.cos(w) * rr);
      stabA(kk, staebe.stahl, pa, pb, .002);
      for (const t of [0, .5, 1]) { const q = pa.clone().lerp(pb, t); stabA(kk, staebe.stahl, q, V(Math.sin(w) * r, q.y, Math.cos(w) * r), .0016); }
    }
    module.push({ status: st, fenster: fm, haut: hm, reihe, lichter: [1, -1].map(s => uebergabeLicht(armGruppe[kk].g, V(s * (r + .006), status, 0), .075)) });
  }
  // Kastenmodul mit Fensterbändern an beiden Seiten
  function kastenModul(kk, b, h, y0, y1, reihe) {
    const st = statusMat(), fm = mat.fenster.clone(), hm = hautMat(), l = y1 - y0, ym = (y0 + y1) / 2;
    const k1 = add(kk, netz(kasten(b, l, h, .011), hm)); k1.position.y = ym;
    for (const s of [1, -1]) {
      const pg = new THREE.PlaneGeometry(.0155, l - .05), uv = pg.attributes.uv;
      for (let i = 0; i < uv.count; i++) uv.setY(i, uv.getY(i) * (l - .05) / FKACHEL);
      const f = add(kk, netz(pg, fm, false)); f.position.set(s * (b / 2 + .0008), ym, .014);
      f.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(V(0, 0, -s), V(0, 1, 0), V(s, 0, 0)));
      const sl = add(kk, netz(new THREE.BoxGeometry(.0024, l - .05, .0032), st, false)); sl.position.set(s * (b / 2 + .0006), ym, -.004);
      if (hoch) stabA(kk, staebe.stahl, V(s * (b / 2 + .005), y0 + .03, -h / 2 + .022), V(s * (b / 2 + .005), y1 - .03, -h / 2 + .022), .002);
    }
    module.push({ status: st, fenster: fm, haut: hm, reihe, lichter: [1, -1].map(s => uebergabeLicht(armGruppe[kk].g, V(s * (b / 2 + .007), ym, -.004), .075)) });
    return k1;
  }
  function tunnel(kk, y0 = .118, y1 = .226) {
    const p = [[0, y0, GR], [.044, y0, GR], [.044, .13, PO], [.05, .13, PO], [.05, .138, GR], [.044, .138, GR],
      [.044, .188, PO], [.056, .188, PO], [.058, .191, PO], [.058, .203, PO], [.056, .206, GR], [.044, .206, GR], [.044, y1, GR], [0, y1]];
    add(kk, netz(drehkoerper(p, seg(24)), satz()));
  }
  // Fachwerk entlang Y mit quadratischem Querschnitt
  function fachwerk(kk, y0, y1, h = .024) {
    const n = Math.max(2, Math.round((y1 - y0) / .04)), ecken = [[h, h], [-h, h], [-h, -h], [h, -h]];
    for (const [x, z] of ecken) stabA(kk, staebe.stahl, V(x, y0, z), V(x, y1, z), .0055, .0055, V(1, 0, 0));
    for (let i = 0; i <= n; i++) {
      const y = y0 + (y1 - y0) * i / n;
      for (let e = 0; e < 4; e++) { const [ax, az] = ecken[e], [bx, bz] = ecken[(e + 1) % 4]; stabA(kk, staebe.stahl, V(ax, y, az), V(bx, y, bz), .0036, .0036, V(0, 1, 0)); }
      if (i < n && hoch) {
        const y2 = y0 + (y1 - y0) * (i + 1) / n;
        for (let e = 0; e < 4; e++) { const [ax, az] = ecken[e], [bx, bz] = ecken[(e + 1) % 4], ab = (i + e) % 2; stabA(kk, staebe.stahl, V(ab ? ax : bx, y, ab ? az : bz), V(ab ? bx : ax, y2, ab ? bz : az), .0028, .0028, V(0, 1, 0)); }
      }
    }
    // Kabelkanal entlang der Oberseite
    stabA(kk, staebe.graphit, V(0, y0, h + .004), V(0, y1, h + .004), .01, .004, V(0, 0, 1));
  }
  function drehgelenk(kk, y0, y1) {
    add(kk, netz(drehkoerper([[0, y0, ST], [.03, y0, ST], [.03, y0 + .005, PO], [.04, y0 + .007, PO], [.04, y1 - .007, PO], [.03, y1 - .005, ST], [.03, y1, ST], [0, y1]], seg(32)), satz()));
  }
  // Solarflügelpaar: zwei Flügel nach oben und unten, Vorderseite +X (lokal), dreht sich um die Armachse
  function fluegelPaar(kk, yc) {
    const aussen = new THREE.Group(); aussen.position.y = yc; if (kk === 2) aussen.rotation.z = Math.PI;
    const innen = new THREE.Group(); aussen.add(innen); add(kk, aussen);
    const rahmen = [], L = .542, B = .068;
    innen.add(netz(kasten(.034, .162, .05, .005, 1), mat.stahl));
    for (const s of [1, -1]) {
      const kas = netz(kasten(.024, .158, .018, .004, 1), mat.stahl); kas.position.z = s * .034; innen.add(kas);
      const spitze = netz(kasten(.012, .158, .01, .003, 1), mat.stahl); spitze.position.z = s * .59; innen.add(spitze);
      for (const sy of [1, -1]) {
        const decke = netz(new THREE.BoxGeometry(.0016, B, L), [mat.zellen, mat.rueck, mat.stahl, mat.stahl, mat.stahl, mat.stahl]);
        decke.position.set(0, sy * (.007 + B / 2), s * (.043 + L / 2)); innen.add(decke);
        stab(rahmen, V(0, sy * (.007 + B + .0012), s * .043), V(0, sy * (.007 + B + .0012), s * (.043 + L)), .0042, .0034, V(1, 0, 0));
        stab(rahmen, V(0, sy * .0072, s * .043), V(0, sy * .0072, s * (.043 + L)), .0032, .0026, V(1, 0, 0));
      }
      stab(rahmen, V(0, 0, s * .043), V(0, 0, s * (.043 + L)), .0055, .0055, V(1, 0, 0)); // Mittelmast
      leuchte(innen, V(.008, 0, s * .598), '#fff1de', .05, 'blitz', kk * .7 + (s > 0 ? 0 : 1.3));
    }
    innen.add(instanzen(rahmen, mat.stahl));
    dreher.push({ fluegel: innen, phase: kk });
  }
  // Arm 3 (+Z, vorn): Werkmodule
  tunnel(3);
  zylModul(3, .078, .226, .505, { rippen: [.262, .468], status: .455, fenster: [.276, .445], reihe: 5 });
  add(3, netz(drehkoerper([[0, .505, ST], [.046, .505, ST], [.046, .51, ST], [.056, .516, ST], [.058, .52, ST], [.058, .547, ST], [.056, .551, ST], [.046, .557, ST], [.046, .562, ST], [0, .562]], seg(32)), satz()));
  { // seitlicher Stutzen am Knoten mit kleiner Antenne
    const st = add(3, netz(drehkoerper([[0, 0, ST], [.026, 0, ST], [.026, .028, PO], [.032, .03, PO], [.032, .036, ST], [0, .036]], seg(24)), satz()));
    st.position.set(.05, .533, 0); st.rotation.z = -Math.PI / 2;
    stabA(3, staebe.stahl, V(-.05, .533, .03), V(-.05, .533, .11), .0024);
  }
  zylModul(3, .064, .562, .735, { e1: .036, rippen: [.588, .712], status: .7, fenster: [.6, .69], reihe: 6 });
  add(3, netz(drehkoerper([[0, .735, PO], [.036, .735, PO], [.036, .738, PO], [.046, .74, PO], [.046, .75, PO], [.04, .754, ST], [.03, .754, ST], [.03, .757, ST], [0, .757]], seg(32)), satz()));
  leuchte(armGruppe[3].g, V(0, .762, .03), '#fff1de', .045, 'blitz', 2.1);

  // Arm 1 (−Z, hinten): Laborkasten, Rundmodul, Antennenschüssel
  tunnel(1);
  kastenModul(1, .136, .118, .226, .425, 2);
  add(1, netz(drehkoerper([[0, .425, GR], [.04, .425, GR], [.04, .436, PO], [.047, .438, PO], [.047, .446, GR], [.04, .448, GR], [.04, .458, GR], [0, .458]], seg(28)), satz()));
  zylModul(1, .068, .458, .64, { e1: .03, rippen: [.484, .618], status: .606, fenster: [.497, .592], reihe: 3 });
  { // Ausleger mit großer Schüssel
    stabA(1, staebe.stahl, V(0, .64, 0), V(0, .69, 0), .011, .011);
    const sch = add(1, new THREE.Group()); sch.position.set(0, .7, 0);
    const gel = netz(new THREE.CylinderGeometry(.012, .012, .022, seg(16)), mat.graphit); gel.rotation.z = Math.PI / 2; sch.add(gel);
    const dreh = new THREE.Group(); sch.add(dreh);
    const s = netz(schuessel(.062, .018, .0035), mat.keramik); s.position.set(0, .01, .03); s.rotation.x = .9; dreh.add(s);
    const fuss = netz(new THREE.CylinderGeometry(.0035, .0035, .05, seg(8)), mat.stahl); fuss.position.set(0, .012, .022); fuss.rotation.x = .9; dreh.add(fuss);
    dreher.push({ schuessel: dreh });
  }
  for (const s of [1, -1]) stabA(1, staebe.stahl, V(s * .056, .25, .059), V(s * .056, .25, .14), .0022);
  { const gk = add(1, netz(kasten(.03, .05, .016, .003, 1), mat.graphit)); gk.position.set(-.042, .392, .066); }

  // Arm 0 (+X): Rundmodul, Fachwerk, Solarflügel
  tunnel(0);
  zylModul(0, .072, .226, .445, { rippen: [.262, .408], status: .395, fenster: [.276, .382], reihe: 1 });
  add(0, netz(drehkoerper([[0, .445, ST], [.05, .445, ST], [.05, .452, ST], [0, .452]], seg(28)), satz()));
  fachwerk(0, .452, .605);
  drehgelenk(0, .605, .638);
  fluegelPaar(0, .716);

  // Arm 2 (−X): Übergabekasten, Fachwerk mit Lager, Solarflügel
  tunnel(2);
  kastenModul(2, .126, .108, .226, .40, 4);
  add(2, netz(drehkoerper([[0, .40, ST], [.05, .40, ST], [.05, .408, ST], [0, .408]], seg(28)), satz()));
  fachwerk(2, .408, .605);
  for (let i = 0; i < 3; i++) { // Frachtbehälter am Fachwerk
    const y = .445 + i * .05, b = add(2, netz(kasten(.04, .04, .032, .004, 1), i === 1 ? mat.graphit : mat.keramik)); b.position.set(0, y, .046);
    const bd = add(2, netz(new THREE.BoxGeometry(.0412, .005, .0332), mat.orange, false)); bd.position.set(0, y + .011, .046);
  }
  { // Roboterarm am Lager: Fuß, Schulter, zwei Ausleger, Greifer
    const glied = (l, r) => { const g = new THREE.Group(), b = netz(new THREE.CylinderGeometry(r, r, l, seg(10)), mat.keramik); b.position.y = l / 2; g.add(b);
      const ge = netz(new THREE.CylinderGeometry(r * 1.55, r * 1.55, r * 3.2, seg(12)), mat.graphit); ge.rotation.z = Math.PI / 2; g.add(ge); return g; };
    const fuss = add(2, netz(new THREE.CylinderGeometry(.011, .013, .014, seg(14)), mat.graphit)); fuss.position.set(0, .588, .031); fuss.rotation.x = Math.PI / 2;
    const gier = add(2, new THREE.Group()); gier.position.set(0, .588, .039);
    const schulter = glied(.112, .0052); gier.add(schulter);
    const ellbogen = glied(.1, .0046); ellbogen.position.y = .112; schulter.add(ellbogen);
    const hand = new THREE.Group(); hand.position.y = .1; ellbogen.add(hand);
    const greifer = netz(kasten(.014, .016, .012, .002, 1), mat.graphit); greifer.position.y = .006; hand.add(greifer);
    leuchte(hand, V(0, .016, 0), F.glut, .025, 'fest');
    gier.rotation.z = Math.PI; schulter.rotation.x = .95; ellbogen.rotation.x = -1.65; hand.rotation.x = -.55; // Grundhaltung
    dreher.push({ arm: { gier, schulter, ellbogen, hand } });
  }
  drehgelenk(2, .605, .638);
  fluegelPaar(2, .716);

  // ---------- Schienen je Arm ----------
  const oberflaeche = [ // Moduloberkante über der Achse je Arm: [y0, y1, z]
    [[.118, .226, .044], [.226, .25, .06], [.25, .421, .072], [.421, .445, .055]],
    [[.118, .226, .044], [.226, .425, .059], [.425, .458, .04], [.458, .48, .055], [.48, .616, .068]],
    [[.118, .226, .044], [.226, .40, .054]],
    [[.118, .226, .044], [.226, .25, .06], [.25, .48, .078], [.48, .505, .06], [.505, .562, .058], [.562, .586, .055], [.586, .71, .064], [.71, .735, .05]],
  ];
  const spurEnde = [.43, .6, .387, .705];
  const dockR = [[.3, .4], [.3, .4, .56], [.28, .37], [.3, .45, .66]];
  const pylone = [[.255, .415], [.255, .4, .47, .585], [.255, .37], [.255, .47, .535, .7]];
  const dockLampenM = [];
  for (let kk = 0; kk < 4; kk++) {
    const ende = spurEnde[kk];
    for (const s of [1, -1]) stabA(kk, staebe.schiene, V(s * SW, RR + .001, SY - .002), V(s * SW, ende, SY - .002), .0055, .004, V(0, 0, 1));
    stabA(kk, staebe.graphit, V(0, ende + .003, SY - .004), V(0, ende + .011, SY - .004), SW * 2 + .012, .008, V(0, 0, 1)); // Prellbock
    // wenige schlanke Pylone (dunkel), damit die Spur als klare Linie schwebt
    for (const y of pylone[kk]) {
      const z = (oberflaeche[kk].find(o => y >= o[0] && y < o[1]) || [0, 0, null])[2]; if (z === null) continue;
      stabA(kk, staebe.graphit, V(-SW - .004, y, SY - .0055), V(SW + .004, y, SY - .0055), .0042, .003, V(0, 0, 1));
      stabA(kk, staebe.graphit, V(0, y, SY - .007), V(0, y, z - .002), .0052, .0036, V(0, 1, 0));
    }
    stabA(kk, staebe.graphit, V(0, RR - .004, SY - .0065), V(0, RR + .026, SY - .0065), SW * 2 + .014, .005, V(0, 0, 1)); // Weiche
    // Andockstellen: je Halt eine quer liegende Schiebebühne (Gitterrost mit Alu-Kanten) über beide Spuren,
    // darauf die kurzen Ausweichgleise. Die Kapsel wird seitlich umgesetzt, so wie sie sich bewegt.
    for (const r of dockR[kk]) {
      const BW = 2 * (SW + .033) + .016, BL = .06;
      stabA(kk, staebe.rost, V(-BW / 2, r, SY - .0054), V(BW / 2, r, SY - .0054), BL, .0016, V(0, 0, 1));
      for (const e of [-1, 1]) stabA(kk, staebe.stahl, V(-BW / 2, r + e * BL / 2, SY - .0052), V(BW / 2, r + e * BL / 2, SY - .0052), .0024, .0034, V(0, 0, 1));
      for (const seite of [-1, 1]) {
        // lokal liegt die Einwärtsspur bei −X; Seite −1 = Ausweichgleis neben ihr, +1 = neben der Außenspur
        const xb = seite * (SW + .033);
        stabA(kk, staebe.schiene, V(xb, r - .03, SY - .002), V(xb, r + .03, SY - .002), .0055, .004, V(0, 0, 1));
        dockLampenM.push(new THREE.Matrix4().compose(welt(kk, V(xb + seite * .0085, r, SY - .0028)), new THREE.Quaternion(), V(1, 1, 1)));
        docks.push({ k: kk, r, seite });
      }
    }
  }
  const dockLampen = new THREE.InstancedMesh(new THREE.BoxGeometry(.0055, .0045, .0055), new THREE.MeshBasicMaterial({ color: '#ffffff' }), docks.length);
  dockLampenM.forEach((m, i) => { dockLampen.setMatrixAt(i, m); dockLampen.setColorAt(i, new THREE.Color(F.glut)); });
  gruppe.add(dockLampen);

  // ---------- Versorger unten angedockt ----------
  {
    const p = [[0, -.404, GR], [.016, -.404, GR], [.03, -.39, GR], [.03, -.382, ST], [.046, -.376, K_], [.052, -.364, K_], [.052, -.305, SU], [.0532, -.304, SU], [.0532, -.297, SU], [.052, -.296, K_],
      [.052, -.262, K_], [.046, -.25, ST], [.04, -.242, ST], [.04, -.225, ST], [0, -.225]];
    gruppe.add(netz(drehkoerper(p, seg(32)), satz()));
    for (const s of [1, -1]) {
      const pan = netz(new THREE.BoxGeometry(.11, .0016, .04), [mat.stahl, mat.stahl, mat.zellen, mat.rueck, mat.stahl, mat.stahl]); pan.position.set(s * .117, -.335, 0); gruppe.add(pan);
      stab(staebe.stahl, V(s * .052, -.335, 0), V(s * .062, -.335, 0), .005);
    }
  }

  // ---------- Statische Stäbe ----------
  gruppe.add(instanzen(staebe.stahl, mat.stahl));
  gruppe.add(instanzen(staebe.schiene, mat.schiene, false));
  gruppe.add(instanzen(staebe.graphit, mat.graphit));
  gruppe.add(instanzen(staebe.rost, mat.rost));

  // ---------- Fahrpläne der Kapseln ----------
  const V_FAHRT = .2, T_ANF = .45, RG = .06, KT = 900;
  const spur = (kk, r, s) => richtung(alpha(kk)).multiplyScalar(r).addScaledVector(quer(alpha(kk)), -s * SW).setY(KY);
  const ringP = a => V(RR * Math.cos(a), KY, -RR * Math.sin(a));
  const garageA = g => Math.PI / 4 + g * Math.PI / 2;
  const garageP = (g, r, s = 0) => richtung(garageA(g)).multiplyScalar(r).addScaledVector(quer(garageA(g)), s * SW).setY(KY);
  function glaette(p) {
    // gleichmäßig neu abtasten (Schrittweite h), Feld [x, y, z, ...]
    const neu = (f, h) => {
      const n0 = f.length / 3, s = new Float32Array(n0);
      for (let i = 1; i < n0; i++) s[i] = s[i - 1] + Math.hypot(f[i * 3] - f[i * 3 - 3], f[i * 3 + 1] - f[i * 3 - 2], f[i * 3 + 2] - f[i * 3 - 1]);
      const L = s[n0 - 1], n = Math.max(2, Math.round(L / h)), out = new Float32Array((n + 1) * 3); let j = 0;
      for (let i = 0; i <= n; i++) {
        const t = L * i / n; while (j < n0 - 2 && s[j + 1] < t) j++;
        const w = (t - s[j]) / Math.max(1e-9, s[j + 1] - s[j]);
        for (let c = 0; c < 3; c++) out[i * 3 + c] = f[j * 3 + c] + (f[j * 3 + 3 + c] - f[j * 3 + c]) * w;
      }
      return out;
    };
    let q = neu(new Float32Array(p.flatMap(v => [v.x, v.y, v.z])), .0025), r = new Float32Array(q.length);
    const n = q.length / 3;
    for (let it = 0; it < 70; it++) {
      r.set(q);
      for (let i = 1; i < n - 1; i++) for (let c = 0; c < 3; c++) r[i * 3 + c] = (q[i * 3 - 3 + c] + 2 * q[i * 3 + c] + q[i * 3 + 3 + c]) * .25;
      [q, r] = [r, q];
    }
    q = neu(q, .0025);
    const pts = []; for (let i = 0; i < q.length; i += 3) pts.push(V(q[i], q[i + 1], q[i + 2]));
    let L = 0; for (let i = 1; i < pts.length; i++) L += pts[i].distanceTo(pts[i - 1]);
    return { q: pts, L };
  }
  function weg(a, b) {
    const p = [], D = .3;
    let a0;
    if (a.g === undefined) { for (let r = a.r; r > RR + .035; r -= .01) p.push(spur(a.k, r, -1)); a0 = alpha(a.k) + D; }
    else { for (let r = RG; r < RR - .03; r += .01) p.push(garageP(a.g, r, 1)); a0 = garageA(a.g) + D; }
    let a1 = (b.g === undefined ? alpha(b.k) : garageA(b.g)) - D; while (a1 < a0 + .1) a1 += TAU;
    for (let w = a0; w < a1; w += .04) p.push(ringP(w)); p.push(ringP(a1));
    if (b.g === undefined) { for (let r = RR + .035; r < b.r; r += .01) p.push(spur(b.k, r, 1)); p.push(spur(b.k, b.r, 1)); }
    else { for (let r = RR - .03; r > RG; r -= .01) p.push(garageP(b.g, r, -1)); p.push(garageP(b.g, RG, -1)); }
    return glaette(p);
  }
  const fahrzeit = L => L / V_FAHRT + T_ANF;
  const strecke = (t, T, L) => { // Trapezprofil: anfahren, rollen, bremsen
    const v = L / (T - T_ANF), a = v / T_ANF;
    if (t < T_ANF) return .5 * a * t * t;
    if (t > T - T_ANF) { const r = T - t; return L - .5 * a * r * r; }
    return .5 * a * T_ANF * T_ANF + v * (t - T_ANF);
  };
  const D = (kk, i, seite = -1) => ({ k: kk, r: dockR[kk][i], seite, id: docks.findIndex(x => x.k === kk && x.r === dockR[kk][i] && x.seite === seite) });
  const G = g => ({ g });
  // Grundbetrieb: Pendel zwischen Modulen verschiedener Arme (Ring einmal ganz herum je Umlauf)
  const routenDef = [
    [D(0, 1), D(3, 2), 'hin'], [D(1, 2), D(2, 1), 'tausch'], [D(3, 0), D(1, 0), 'hin'], [D(2, 0), D(0, 0), 'tausch'],
    [D(3, 1), D(2, 0), 'hin'], [D(1, 1), D(0, 1), 'hin'], [D(0, 0), D(1, 2), 'tausch'], [D(2, 1), D(3, 1), 'hin'],
  ].map(([a, b, art]) => ({ a, b, c: a, art }));
  // Zusätzlich im aktiven Zustand: aus Garage g zum nächsten Arm und zurück in die nächste Garage (kaum Ringstrecke);
  // der Wechsel der Garage geschieht verborgen in der Nabe.
  const extraDef = [];
  for (let i = 0; i < 3; i++) for (let g = 0; g < 4; g++) { const kk = (g + 1) % 4; if (i < dockR[kk].length) extraDef.push({ a: G(g), b: D(kk, dockR[kk].length - 1 - i, 1), c: G(kk), art: 'hin' }); }
  const alle = routenDef.concat(hoch ? extraDef : extraDef.filter((_, i) => i % 2 === 0));
  const routen = alle.map(d => { const ab = weg(d.a, d.b), bc = weg(d.b, d.c); return { ...d, ab, ba: bc, tAB: fahrzeit(ab.L), tBA: fahrzeit(bc.L), extra: d.a.g !== undefined }; });
  const HALT = 1.7;
  const P = Math.ceil(Math.max(...routen.map(r => r.tAB + r.tBA + 2 * HALT)));
  for (const r of routen) r.wdh = r.extra && r.tAB + r.tBA + HALT + 1 < P / 2 ? 2 : 1; // kurze Umläufe zweimal je Periode
  const _p = V(), _t = V();
  for (const r of routen) {
    const Pr = P / r.wdh;
    const haltA = r.extra ? Pr - r.tAB - r.tBA - HALT : (Pr - r.tAB - r.tBA) / 2, haltB = r.extra ? HALT : haltA;
    const tab = { p: new Float32Array(KT * 3), d: new Float32Array(KT * 3), f: new Float32Array(KT), h: new Uint8Array(KT), dk: new Int16Array(KT).fill(-1), an: new Float32Array(KT) };
    const fahrt = (w, s, i) => {
      const n = w.q.length - 1, f = Math.min(n - 1e-6, Math.max(0, s / w.L * n)), j = Math.floor(f), u = f - j;
      _p.copy(w.q[j]).lerp(w.q[j + 1], u); tab.p.set([_p.x, _p.y, _p.z], i * 3);
      _t.copy(w.q[Math.min(n, j + 2)]).sub(w.q[Math.max(0, j - 1)]).normalize(); tab.d.set([_t.x, 0, _t.z], i * 3);
      tab.h[i] = Math.hypot(_p.x, _p.z) < .105 ? 1 : 0;
    };
    const halt = (ziel, t, dauer, modus, i) => {
      if (ziel.g !== undefined) { const q = garageP(ziel.g, RG, 0), dd = richtung(garageA(ziel.g)); tab.p.set([q.x, q.y, q.z], i * 3); tab.d.set([dd.x, 0, dd.z], i * 3); tab.h[i] = 1; tab.f[i] = 1; return; }
      // ankommen auf der Außenspur, seitlich aufs Ausweichgleis, dort laden, zurück auf die Einwärtsspur
      const rein = glatt(t / .85), raus = glatt((t - dauer + .6) / .6), u = glatt((t - .95) / .6);
      const sb = -ziel.seite * BUCHT, q = raus > 0 ? spur(ziel.k, ziel.r, sb).lerp(spur(ziel.k, ziel.r, -1), raus) : spur(ziel.k, ziel.r, 1).lerp(spur(ziel.k, ziel.r, sb), rein), dd = richtung(alpha(ziel.k));
      tab.p.set([q.x, q.y, q.z], i * 3); tab.d.set([dd.x, 0, dd.z], i * 3); tab.dk[i] = ziel.id;
      tab.an[i] = Math.min(glatt((t - .5) / .4), glatt((dauer - t - .4) / .3));
      tab.f[i] = modus === 'laden' ? u : modus === 'entladen' ? 1 - u : Math.abs(1 - 2 * u);
    };
    for (let i = 0; i < KT; i++) {
      const t = (i / KT * P) % Pr;
      if (t < haltA) halt(r.a, t, haltA, r.art === 'tausch' ? 'tausch' : 'laden', i);
      else if (t < haltA + r.tAB) { fahrt(r.ab, strecke(t - haltA, r.tAB, r.ab.L), i); tab.f[i] = 1; }
      else if (t < haltA + r.tAB + haltB) halt(r.b, t - haltA - r.tAB, haltB, r.art === 'tausch' ? 'tausch' : 'entladen', i);
      else { fahrt(r.ba, strecke(t - haltA - r.tAB - haltB, r.tBA, r.ba.L), i); tab.f[i] = r.art === 'tausch' ? 1 : 0; }
    }
    // Richtung ohne Sprünge (Kapsel ist vorn wie hinten gleich)
    for (let i = 1; i < KT; i++) { const j = i * 3, h = j - 3; if (tab.d[j] * tab.d[h] + tab.d[j + 2] * tab.d[h + 2] < 0) { tab.d[j] *= -1; tab.d[j + 2] *= -1; } }
    r.tab = tab;
  }
  // Phasen so wählen, dass sich Kapseln nicht überlappen (fester Zufall, beim Bauen).
  // Überlapp nur, wenn längs näher als eine Kapsellänge und quer näher als eine Kapselbreite (Nebenspur zählt nicht).
  const M = 128, LANG = KL * 1.3, QUER = KR * 2 + .008;
  const probe = (r, phase) => {
    const out = new Float32Array(M * 5);
    for (let m = 0; m < M; m++) { const i = Math.floor(((m / M * P + phase) % P) / P * KT) % KT; out.set([r.tab.p[i * 3], r.tab.p[i * 3 + 2], r.tab.d[i * 3], r.tab.d[i * 3 + 2], r.tab.h[i]], m * 5); }
    return out;
  };
  const kosten = (a, b) => {
    let k = 0;
    for (let m = 0; m < M; m++) {
      const o = m * 5; if (a[o + 4] || b[o + 4]) continue;
      const dx = b[o] - a[o], dz = b[o + 1] - a[o + 1], laengs = Math.abs(dx * a[o + 2] + dz * a[o + 3]), quer_ = Math.abs(dx * a[o + 3] - dz * a[o + 2]);
      if (laengs < LANG && quer_ < QUER) k += LANG - laengs;
    }
    return k;
  };
  // gemeinsame Suche aller Phasen: gieriger Start, dann Abkühlen (fester Zufall)
  const NR = routen.length, gew = (i, j) => routen[i].extra || routen[j].extra ? 1 : 3;
  const proben = routen.map(() => null), C = Array.from({ length: NR }, () => new Float32Array(NR));
  for (let i = 0; i < NR; i++) {
    let best = null;
    for (let c = 0; c < 48; c++) {
      const phase = (c + zufall()) / 48 * P, pr = probe(routen[i], phase); let k = 0;
      for (let j = 0; j < i; j++) k += kosten(pr, proben[j]) * gew(i, j);
      if (!best || k < best.k) best = { phase, pr, k };
    }
    routen[i].phase = best.phase; proben[i] = best.pr;
    for (let j = 0; j < i; j++) C[i][j] = C[j][i] = kosten(proben[i], proben[j]) * gew(i, j);
  }
  const zeile = new Float32Array(NR);
  for (let it = 0, IT = hoch ? 3200 : 1600; it < IT; it++) {
    const T = .3 * (1 - it / IT) + .001, i = Math.floor(zufall() * NR);
    const phase = zufall() < .5 ? zufall() * P : (routen[i].phase + (zufall() - .5) * 1.2 + P) % P, pr = probe(routen[i], phase);
    let alt = 0, neu = 0;
    for (let j = 0; j < NR; j++) { if (j === i) continue; alt += C[i][j]; zeile[j] = kosten(pr, proben[j]) * gew(i, j); neu += zeile[j]; }
    if (neu <= alt || zufall() < Math.exp((alt - neu) / T)) { routen[i].phase = phase; proben[i] = pr; for (let j = 0; j < NR; j++) if (j !== i) C[i][j] = C[j][i] = zeile[j]; }
  }
  let konflikt = 0; for (let i = 0; i < routen.length; i++) for (let j = i + 1; j < routen.length; j++) konflikt += kosten(proben[i], proben[j]);

  // ---------- Kapseln ----------
  const N = routen.length, hl = KL / 2;
  const koerper = drehkoerper([[0, -hl, 0], [KR * .55, -hl + .0012, 0, 1], [KR * .84, -hl + .004, 0, 1], [KR, -hl + .011, 0, 1], [KR, hl - .011, 0, 1], [KR * .84, hl - .004, 0, 1], [KR * .55, hl - .0012, 0, 1], [0, hl]], seg(12));
  koerper.rotateX(Math.PI / 2); koerper.scale(1, KF, 1);
  const kufe = new THREE.BoxGeometry(.011, .005, KL * .6); kufe.translate(0, -KR * KF - .0022, 0);
  // Farbe je Dreieck: oben helle Schale, unten Graphit-Fahrwerk, vorn und hinten nur ein schmaler Sensorschlitz oben
  const kapselGeo = verschmelze([{ geo: koerper, farbe: (x, y, z) => y < -.0004 ? '#3a414b' : (Math.abs(z) > hl - .0118 && Math.abs(z) < hl - .0035 && y > KR * KF * .62) ? '#1a2129' : '#e8ebee' }, { geo: kufe, farbe: '#2b3139' }]);
  const kapseln = new THREE.InstancedMesh(kapselGeo, new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: .3, metalness: .05, clearcoat: .9, clearcoatRoughness: .15 }), N);
  const frachtGeo = new THREE.BoxGeometry(.013, .0088, .017); frachtGeo.translate(0, KR * KF + .0046, 0);
  const fracht = new THREE.InstancedMesh(frachtGeo, mat.orange, N);
  const lampen = new THREE.InstancedMesh(new THREE.BoxGeometry(.007, .0032, KL + .0015), new THREE.MeshBasicMaterial({ color: '#ffffff' }), N); // Lichtpunkte vorn und hinten
  for (const im of [kapseln, fracht, lampen]) { im.frustumCulled = false; im.castShadow = im !== lampen; im.receiveShadow = true; gruppe.add(im); }
  for (let i = 0; i < N; i++) lampen.setColorAt(i, new THREE.Color(F.glut));
  // weicher Schein je Kapsel (ein Zeichenaufruf)
  const scheinPos = new Float32Array(N * 3), scheinFarbe = new Float32Array(N * 3);
  const scheinGeo = new THREE.BufferGeometry(); scheinGeo.setAttribute('position', new THREE.BufferAttribute(scheinPos, 3)); scheinGeo.setAttribute('color', new THREE.BufferAttribute(scheinFarbe, 3));
  const schein = new THREE.Points(scheinGeo, new THREE.PointsMaterial({ size: .07, map: punktBild, vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true }));
  schein.frustumCulled = false; gruppe.add(schein);

  // ---------- Leben ----------
  let letzt = null, pegel = 0;
  const dabei = routen.map(r => !r.extra);
  const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _s = V(), _pos = V(), _c = new THREE.Color(), _o = new THREE.Color(F.orange), _gl = new THREE.Color(F.glut), _fw = new THREE.Color('#ffd0a2');
  // Übergabe-Hüllkurve: weich an (0,1 s), halten (0,35 s), ausklingen; überlappt mit dem nächsten Modul wie ein weitergereichter Staffelstab
  const puls = x => x < 0 ? 0 : x < .1 ? glatt(x / .1) : x < .45 ? 1 : Math.max(0, Math.exp(-(x - .45) * 4.5) * 1.03 - .03);
  const dockBelegt = new Float32Array(docks.length);
  const reihe = module.slice().sort((a, b) => a.reihe - b.reihe);

  function stelle(t, aktiv, erster) {
    dockBelegt.fill(0);
    for (let i = 0; i < N; i++) {
      const r = routen[i], tab = r.tab, tau = ((t + r.phase) % P + P) % P, f = tau / P * KT, i0 = Math.floor(f) % KT, i1 = (i0 + 1) % KT, w = f - Math.floor(f);
      if (r.extra && (erster || tab.h[i0])) dabei[i] = aktiv;
      const sicht = dabei[i] && !(tab.h[i0] && tab.h[i1]);
      _pos.set(tab.p[i0 * 3] + (tab.p[i1 * 3] - tab.p[i0 * 3]) * w, tab.p[i0 * 3 + 1] + (tab.p[i1 * 3 + 1] - tab.p[i0 * 3 + 1]) * w, tab.p[i0 * 3 + 2] + (tab.p[i1 * 3 + 2] - tab.p[i0 * 3 + 2]) * w);
      let dx1 = tab.d[i1 * 3], dz1 = tab.d[i1 * 3 + 2]; const dx0 = tab.d[i0 * 3], dz0 = tab.d[i0 * 3 + 2];
      if (dx0 * dx1 + dz0 * dz1 < 0) { dx1 = -dx1; dz1 = -dz1; }
      _q.setFromAxisAngle(OBEN, Math.atan2(dx0 + (dx1 - dx0) * w, dz0 + (dz1 - dz0) * w));
      _s.setScalar(sicht ? 1 : 0); _m.compose(_pos, _q, _s); kapseln.setMatrixAt(i, _m); lampen.setMatrixAt(i, _m);
      const fr = (tab.f[i0] + (tab.f[i1] - tab.f[i0]) * w) * (sicht ? 1 : 0);
      _s.set(fr, Math.max(fr, 1e-4), fr); _m.compose(_pos, _q, _s); fracht.setMatrixAt(i, _m);
      scheinPos.set([_pos.x, _pos.y + .002, _pos.z], i * 3);
      const sh = sicht ? (Math.hypot(_pos.x, _pos.z) < .14 ? .35 : 1) : 0; scheinFarbe.set([sh * .8, sh * .5, sh * .26], i * 3);
      if (sicht && tab.dk[i0] >= 0) dockBelegt[tab.dk[i0]] = Math.max(dockBelegt[tab.dk[i0]], tab.an[i0]);
    }
    kapseln.instanceMatrix.needsUpdate = fracht.instanceMatrix.needsUpdate = lampen.instanceMatrix.needsUpdate = true;
    scheinGeo.attributes.position.needsUpdate = scheinGeo.attributes.color.needsUpdate = true;
  }
  stelle(0, false, true);

  return {
    gruppe,
    radius: 1,
    anker: new THREE.Vector3(0, .72, 0),
    aktualisiere(t, zustand = {}) {
      const aktiv = !!zustand.aktiv, naehe = zustand.naehe || 0, erster = letzt === null || t < letzt || t - letzt > 1.5;
      pegel = erster ? (aktiv ? 1 : 0) : pegel + ((aktiv ? 1 : 0) - pegel) * Math.min(1, (t - letzt) * 2.5);
      letzt = t;
      stelle(t, aktiv, erster);
      for (let i = 0; i < docks.length; i++) { _c.copy(_gl).multiplyScalar(.3 + 2.2 * dockBelegt[i]); dockLampen.setColorAt(i, _c); }
      dockLampen.instanceColor.needsUpdate = true;
      for (let i = 0; i < RL; i++) {
        const a = i * TAU / RL + TAU / RL / 2, welle = Math.pow(Math.max(0, Math.cos(2 * (a - t * 1.3))), 16);
        _c.copy(_gl).multiplyScalar(.6 + .35 * pegel + (.5 + 2.2 * pegel) * welle); ringLampen.setColorAt(i, _c);
      }
      ringLampen.instanceColor.needsUpdate = true;
      streifenMat.color.copy(_gl).multiplyScalar(.55 + .35 * pegel);
      torMat.color.setScalar(.75 + .55 * pegel); // Hallen heller, wenn mehr Kapseln ein- und ausfahren
      // Fenster und Übergabe: im aktiven Zustand leuchtet ein Modul nach dem anderen orange auf.
      // Die Haut bleibt weiß (kein Lachston); orange werden Statusring, Fenster, Flankenlichter und ein leichter Schein.
      const schritt = .55, zyklus = reihe.length * schritt + 1.4;
      reihe.forEach((mo, i) => {
        const fl = puls((((t - i * schritt) % zyklus) + zyklus) % zyklus) * pegel;
        mo.status.emissiveIntensity = 5 * fl;
        mo.fenster.emissiveIntensity = 1.9 + 1.1 * pegel + .3 * naehe + 1.5 * fl;
        mo.fenster.emissive.copy(_fw).lerp(_o, fl * .85);
        mo.haut.emissiveIntensity = .22 * fl; mo.haut.clearcoat = .3 - .25 * fl; // ohne kühle Spiegelung kein Lila
        for (const s of mo.lichter) { s.visible = fl > .004; s.material.opacity = fl; s.scale.setScalar(s.userData.groesse * (.55 + .45 * fl)); }
      });
      for (const l of leuchten) {
        let a = 1;
        if (l.art === 'blitz') { const x = ((t + l.phase) % 2.4 + 2.4) % 2.4; a = x < .07 ? 1 : x < .2 ? .15 : .05; }
        else if (l.art === 'feuer') a = .3 + .7 * Math.pow(.5 + .5 * Math.sin(t * 2.2), 3);
        else if (l.art === 'garage') a = .35 + .6 * pegel;
        l.s.material.opacity = a; l.s.scale.setScalar(l.groesse * (.7 + .3 * a));
      }
      _c.copy(_gl).multiplyScalar(1.6 + .9 * pegel); for (let i = 0; i < N; i++) lampen.setColorAt(i, _c); lampen.instanceColor.needsUpdate = true;
      // Solarflügel folgen langsam der Sonne, Schüssel schwenkt
      for (const d of dreher) {
        if (d.fluegel) d.fluegel.rotation.y = -.34 + .07 * Math.sin(t * .11 + d.phase);
        if (d.schuessel) d.schuessel.rotation.y = .5 * Math.sin(t * .23);
        if (d.arm) { // langsam zwischen Lager und Übergabekasten schwenken, aktiv etwas lebhafter
          const a = d.arm, w = Math.sin(t * .37) + pegel * .35 * Math.sin(t * 1.1 + 1);
          a.gier.rotation.z = Math.PI + .5 * w;
          a.schulter.rotation.x = .95 + .18 * Math.sin(t * .53 + .4);
          a.ellbogen.rotation.x = -(1.65 + .3 * Math.sin(t * .53 + 1.6) + pegel * .15 * Math.sin(t * 1.4));
          a.hand.rotation.x = -.55 + .25 * Math.sin(t * .7);
        }
      }
    },
    konflikt, periode: P,
  };
}
