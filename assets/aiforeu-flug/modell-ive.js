/* AIFOREU · Flug · Modell „ive“: Kommandoturm voller Terminals. IVE zeigt, welcher Agent wartet.
   Schaft mit Bildschirmraster auf vier Seiten, Übersichtstafel unter der Brücke, verglaste Kanzel, Mast mit
   Sensorbalken, Andockstutzen im Sockel, Agenten-Drohnen an den Terminals, ein Lichtrahmen sucht den wartenden. */

export default function erstelle(THREE, k) {
  const F = k.farben, hoch = k.qualitaet !== 'niedrig';
  const gruppe = new THREE.Group(); gruppe.name = 'IVE Kommandoturm';

  /* ---------- Hilfen ---------- */
  let saat = 20261112;
  const zufall = () => (saat = (saat * 16807) % 2147483647) / 2147483647;
  const streu = (a, b) => { let h = Math.imul((a | 0) ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul((b | 0) + 0x632be5ab, 0xc2b2ae35); h ^= h >>> 15; h = Math.imul(h, 0x2c1b3c6d); h ^= h >>> 12; h = Math.imul(h, 0x297a2d39); h ^= h >>> 15; return (h >>> 0) / 4294967296; };
  const klemme = (v, a, b) => Math.min(b, Math.max(a, v));
  const glatt = (a, b, x) => { const u = klemme((x - a) / (b - a), 0, 1); return u * u * (3 - 2 * u); };
  const glatter = u => { u = klemme(u, 0, 1); return u * u * u * (u * (u * 6 - 15) + 10); };
  const zurueck = u => { u = klemme(u, 0, 1); const c = 1.3; return 1 + (c + 1) * Math.pow(u - 1, 3) + c * Math.pow(u - 1, 2); };
  const seg = hoch ? 20 : 10;
  const ikosa = r => new THREE.IcosahedronGeometry(r, hoch ? 1 : 0); // Leuchtpunkte, im Niedrigmodus gröber
  const Y = new THREE.Vector3(0, 1, 0);

  /* ---------- Maße ---------- */
  const HX = .21, FASE = .03, Y0 = -.6, Y1 = .5, ETAGEN = 5, P = (Y1 - Y0) / ETAGEN, DECKE = .024;
  const SH = .074, PX_JE_EINHEIT = 128 / .094, KOPF = 16 / PX_JE_EINHEIT / SH;
  const reiheY = r => Y0 + Math.floor(r / 2) * P + (r % 2 ? .147 : .049);
  const drehung = f => new THREE.Matrix4().makeRotationY(f * Math.PI / 2);
  // Fassadenarten: drei schmale oder zwei breite Terminals je Reihe
  const ART = {
    3: { x: [-.112, 0, .112], w: .094, pfosten: [[-.1695, .021], [-.056, .018], [.056, .018], [.1695, .021]] },
    2: { x: [-.084, .084], w: .15, pfosten: [[-.1695, .021], [0, .018], [.1695, .021]] },
  };
  const SEITEN = [{ art: 3, tafel: true }, { art: 2 }, { art: 3, schacht: true }, { art: 2 }];
  const hatSchirm = (f, r, ci) => !(SEITEN[f].tafel && r >= 8) && !(SEITEN[f].schacht && ci === 1);

  /* ---------- Geometrie: Achteck-Lofts mit harten Facetten ---------- */
  const achteck = (hx, hz, f) => [[hx, -hz + f], [hx, hz - f], [hx - f, hz], [-hx + f, hz], [-hx, hz - f], [-hx, -hz + f], [-hx + f, -hz], [hx - f, -hz]];
  function loft(stufen, { unten = true, oben = true } = {}) {
    const pos = [], uv = [], ac = new THREE.Vector3(), n = new THREE.Vector3();
    const dreieck = (a, b, c, soll, ua, ub, uc) => {
      n.subVectors(b, a).cross(ac.subVectors(c, a));
      if (n.lengthSq() < 1e-14) return;
      if (n.dot(soll) < 0) { [b, c] = [c, b]; [ub, uc] = [uc, ub]; }
      pos.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z); uv.push(...ua, ...ub, ...uc);
    };
    const v3 = (p, y) => new THREE.Vector3(p[0], y, p[1]);
    for (let s = 0; s < stufen.length - 1; s++) {
      const A = stufen[s], B = stufen[s + 1];
      const ra = achteck(A.hx, A.hz ?? A.hx, A.f), rb = achteck(B.hx, B.hz ?? B.hx, B.f);
      const dr = B.hx - A.hx, dy = B.y - A.y; let umfang = 0;
      for (let i = 0; i < 8; i++) {
        const j = (i + 1) % 8, a = v3(ra[i], A.y), b = v3(ra[j], A.y), c = v3(rb[j], B.y), d = v3(rb[i], B.y);
        const m = a.clone().add(b).add(c).add(d).multiplyScalar(.25), radial = new THREE.Vector3(m.x, 0, m.z).normalize();
        const soll = new THREE.Vector3(radial.x * dy, -dr, radial.z * dy); if (soll.lengthSq() < 1e-12) soll.copy(radial);
        const l = Math.max(a.distanceTo(b), d.distanceTo(c)), u0 = umfang, u1 = umfang + l; umfang = u1;
        dreieck(a, b, c, soll, [u0, A.y], [u1, A.y], [u1, B.y]);
        dreieck(a, c, d, soll, [u0, A.y], [u1, B.y], [u0, B.y]);
      }
    }
    const deckel = (S, nach) => {
      const r = achteck(S.hx, S.hz ?? S.hx, S.f), m = new THREE.Vector3(0, S.y, 0), soll = new THREE.Vector3(0, nach, 0);
      for (let i = 0; i < 8; i++) { const j = (i + 1) % 8; dreieck(m, v3(r[i], S.y), v3(r[j], S.y), soll, [0, 0], r[i], r[j]); }
    };
    if (unten) deckel(stufen[0], -1);
    if (oben) deckel(stufen[stufen.length - 1], 1);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.computeVertexNormals();
    return g;
  }
  const quader = (w, h, d, f = .003) => loft([
    { y: -h / 2, hx: w / 2 - f, hz: d / 2 - f, f: f * .8 }, { y: -h / 2 + f, hx: w / 2, hz: d / 2, f: f * 1.6 },
    { y: h / 2 - f, hx: w / 2, hz: d / 2, f: f * 1.6 }, { y: h / 2, hx: w / 2 - f, hz: d / 2 - f, f: f * .8 }]);
  const band = (y0, y1, hx, f, k = .004) => loft([
    { y: y0, hx: hx - k, f }, { y: y0 + k, hx, f: f + k * .4 }, { y: y1 - k, hx, f: f + k * .4 }, { y: y1, hx: hx - k, f }]);

  /* ---------- Materialien ---------- */
  const leinwand = (w, h, malen) => { const c = document.createElement('canvas'); c.width = w; c.height = h; malen(c.getContext('2d'), w, h); return c; };
  // Fugenbild für Paneele (Relief), Weltmaßstab über Loft-UVs
  const fugen = new THREE.CanvasTexture(leinwand(256, 256, (x) => {
    x.fillStyle = '#808080'; x.fillRect(0, 0, 256, 256);
    x.fillStyle = '#3c3c3c';
    for (const y of [0, 96, 160]) x.fillRect(0, y, 256, 3);
    for (const [px, y0, y1] of [[0, 0, 96], [128, 0, 96], [64, 96, 160], [192, 96, 160], [0, 160, 256], [100, 160, 256], [180, 160, 256]]) x.fillRect(px, y0, 3, y1 - y0);
    x.fillStyle = '#9a9a9a'; for (let i = 0; i < 40; i++) { x.beginPath(); x.arc(8 + (i % 10) * 25, 6 + Math.floor(i / 10) * 64, 1.4, 0, 7); x.fill(); }
  }));
  fugen.wrapS = fugen.wrapT = THREE.RepeatWrapping; fugen.repeat.set(1 / .16, 1 / .16);
  const physisch = o => new THREE.MeshPhysicalMaterial(o);
  // Grautöne leicht kühl angelegt: unter der warmen Sonne werden sie neutral statt bräunlich.
  // Metall mit hohem Metallanteil, damit es die Umgebung spiegelt statt diffus braun zu werden.
  const mat = {
    graphit: physisch({ color: F.graphit, metalness: .55, roughness: .36, clearcoat: .45, clearcoatRoughness: .25 }),
    paneel: physisch({ color: '#1b222c', metalness: .5, roughness: .42, clearcoat: .35, clearcoatRoughness: .3, bumpMap: fugen, bumpScale: 1.2 }),
    tief: physisch({ color: '#080b10', metalness: .3, roughness: .7 }),
    stahl: physisch({ color: '#c3ccd8', metalness: .8, roughness: .3, anisotropy: .5 }),
    stahlMatt: physisch({ color: '#929dac', metalness: .72, roughness: .38 }),
    ring: physisch({ color: '#3a4553', metalness: .45, roughness: .32, clearcoat: .6, clearcoatRoughness: .14 }),
    rahmen: physisch({ color: '#34404d', metalness: .55, roughness: .32, clearcoat: .35, clearcoatRoughness: .18, emissive: '#a9b9cf', emissiveIntensity: .006 }),
    keramik: physisch({ color: F.papier, metalness: 0, roughness: .38, clearcoat: .6, clearcoatRoughness: .2 }),
    glas: physisch({ color: '#0a1017', metalness: .1, roughness: .04, clearcoat: 1, clearcoatRoughness: .02, transparent: true, opacity: .4, depthWrite: false }),
  };
  const leuchtMat = (farbe, staerke = 3) => new THREE.MeshBasicMaterial({ color: new THREE.Color(farbe).multiplyScalar(staerke) });
  const lampeWarm = leuchtMat('#ffe6c8', 2.4);
  const teil = (geo, m, { schatten = true, empfang = true } = {}) => { const o = new THREE.Mesh(geo, m); o.castShadow = schatten; o.receiveShadow = empfang; return o; };
  // Geometrien (Lage schon eingerechnet) zu einer zusammenführen: Position, Normale, UV
  const vereine = geos => {
    const flach = geos.map(g => g.index ? g.toNonIndexed() : g);
    let n = 0; for (const g of flach) n += g.attributes.position.count;
    const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), uv = new Float32Array(n * 2); let o = 0;
    for (const g of flach) { pos.set(g.attributes.position.array, o * 3); nor.set(g.attributes.normal.array, o * 3); if (g.attributes.uv) uv.set(g.attributes.uv.array, o * 2); o += g.attributes.position.count; }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    return g;
  };
  const gelegt = (geo, m) => (geo.index ? geo.toNonIndexed() : geo.clone()).applyMatrix4(m);
  const T = (x = 0, y = 0, z = 0) => new THREE.Matrix4().makeTranslation(x, y, z);
  // Instanzierte Leuchten: Helligkeit je Instanz über die Instanzfarbe
  const instLicht = new THREE.MeshBasicMaterial({ color: '#ffffff' });
  const instanzen = (geo, material, n, schatten = false) => { const m = new THREE.InstancedMesh(geo, material, n); m.castShadow = m.receiveShadow = schatten; m.frustumCulled = false; gruppe.add(m); return m; };
  const glutTextur = new THREE.CanvasTexture(leinwand(64, 64, (x) => {
    const v = x.createRadialGradient(32, 32, 0, 32, 32, 32);
    v.addColorStop(0, 'rgba(255,255,255,1)'); v.addColorStop(.18, 'rgba(255,255,255,.75)'); v.addColorStop(.45, 'rgba(255,255,255,.16)'); v.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = v; x.fillRect(0, 0, 64, 64);
  }));
  glutTextur.colorSpace = THREE.SRGBColorSpace;
  const leucht = (farbe, groesse, deck = 1) => {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glutTextur, color: farbe, transparent: true, opacity: deck, blending: THREE.AdditiveBlending, depthWrite: false }));
    s.scale.setScalar(groesse); return s;
  };

  /* ---------- Terminal-Atlas: 8 Inhaltsstreifen (128 × 880, nahtlos) + 72 Kopfzeilen (128 × 16) ---------- */
  const ZP = 11, STREIFEN = 880;
  const atlas = new THREE.CanvasTexture(leinwand(1024, 1024, (x) => {
    x.fillStyle = '#000'; x.fillRect(0, 0, 1024, 1024);
    const CH = 4, HS = 3, ORANGE = '#ff7a3e';
    const ton = a => `rgba(247,236,220,${a})`;
    const wort = (px, py, n, a, h = HS) => { x.fillStyle = ton(a); x.fillRect(px, py, n * CH - 1, h); };
    const punkt = (px, py, farbe, r = 2) => { x.fillStyle = farbe; x.beginPath(); x.arc(px, py, r, 0, Math.PI * 2); x.fill(); };
    const arten = ['code', 'log', 'code', 'tabelle', 'log', 'balken', 'code', 'diff'];
    for (let s = 0; s < 8; s++) {
      const x0 = s * 128 + 7, x1 = s * 128 + 121, art = arten[s]; let einzug = 0;
      for (let z = 0; z < STREIFEN / ZP; z++) {
        const y = z * ZP + 4;
        if (art === 'code' || art === 'diff') {
          wort(x0, y, 2, .22);
          x.fillStyle = ton(.1); x.fillRect(x0 + 10, z * ZP, 1, ZP);
          if (zufall() < .09) continue;
          let px = x0 + 14;
          if (art === 'diff') {
            const m = zufall(); if (m < .22) { x.fillStyle = ton(.9); x.fillRect(px, y + 1.5, 4, 1); x.fillRect(px + 1.5, y, 1, 4); } else if (m < .32) { x.fillStyle = ORANGE; x.fillRect(px, y + 1.5, 4, 1); }
            px += 7;
          }
          einzug = klemme(einzug + (zufall() < .3 ? 1 : 0) - (zufall() < .3 ? 1 : 0), 0, 4); px += einzug * 2 * CH;
          let erstes = true;
          while (px < x1 - 6) { const n = 2 + Math.floor(zufall() * 8); if (px + n * CH > x1) break; wort(px, y, n, erstes ? .95 : (zufall() < .35 ? .38 : .66)); px += (n + 1) * CH; erstes = false; if (zufall() < .17) break; }
          if (zufall() < .04) punkt(x0 + 12.5, y + 2, ORANGE, 1.8);
        } else if (art === 'log') {
          wort(x0, y, 8, .26);
          const pegel = zufall(); if (pegel < .06) { x.fillStyle = ORANGE; x.fillRect(x0 + 36, y, 11, HS); } else wort(x0 + 36, y, 3, pegel < .5 ? .55 : .35);
          let px = x0 + 52;
          while (px < x1 - 6) { const n = 2 + Math.floor(zufall() * 7); if (px + n * CH > x1) break; wort(px, y, n, .78); px += (n + 1) * CH; if (zufall() < .22) break; }
        } else if (art === 'tabelle') {
          if (z % 10 === 0) { for (const sx of [0, 40, 70, 96]) wort(x0 + sx, y, 4, .95); x.fillStyle = ton(.3); x.fillRect(x0, y + 6, x1 - x0, 1); continue; }
          wort(x0, y, 3 + Math.floor(zufall() * 4), .66);
          for (const [sx, br] of [[66, 5], [92, 4], [114, 4]]) { const n = 1 + Math.floor(zufall() * br); wort(x0 + sx - n * CH, y, n, .85); }
          if (zufall() < .05) punkt(x1 - 2, y + 2, ORANGE, 1.8);
        } else if (art === 'balken') {
          if (z % 6 === 5) continue;
          wort(x0, y, 6, .58);
          x.fillStyle = ton(.2); x.fillRect(x0 + 30, y - 1, x1 - x0 - 30, 1); x.fillRect(x0 + 30, y + HS, x1 - x0 - 30, 1);
          const anteil = .12 + zufall() * .88; x.fillStyle = anteil < .24 ? ORANGE : ton(.85); x.fillRect(x0 + 30, y + 1, (x1 - x0 - 30) * anteil, HS - 2);
        }
      }
    }
    for (let h = 0; h < 72; h++) {
      const hx = (h % 8) * 128, hy = STREIFEN + Math.floor(h / 8) * 16;
      x.fillStyle = '#1d242e'; x.fillRect(hx, hy, 128, 16);
      for (let d = 0; d < 3; d++) punkt(hx + 9 + d * 6, hy + 8, ton(.3), 1.5);
      wort(hx + 30, hy + 6, 5 + Math.floor(zufall() * 8), .72, 3);
      if (zufall() < .3) punkt(hx + 117, hy + 8, ORANGE, 2); else wort(hx + 104, hy + 6, 4, .45, 3);
      x.fillStyle = ton(.14); x.fillRect(hx, hy + 15, 128, 1);
    }
  }));
  atlas.colorSpace = THREE.SRGBColorSpace; atlas.anisotropy = 8;

  /* ---------- Schaft, Geschossbänder, Rahmenwerk ---------- */
  gruppe.add(teil(loft([{ y: Y0, hx: HX, f: FASE }, { y: Y1, hx: HX, f: FASE }]), mat.tief));
  // Geschossbänder; das Band unter der Tafel in heller Keramik trennt Überblick und Terminals
  for (let e = 0; e < ETAGEN; e++) { const yt = Y0 + (e + 1) * P; gruppe.add(teil(band(yt - DECKE, yt, HX + .016, FASE + .007), e === 3 ? mat.keramik : mat.ring)); }
  const stuecke = [];
  for (let f = 0; f < 4; f++) for (let e = 0; e < ETAGEN; e++) {
    const a = ART[SEITEN[f].art], yb = Y0 + e * P, hInnen = P - DECKE, tafel = SEITEN[f].tafel && e === 4;
    for (const [px, pw] of a.pfosten) if (!tafel || Math.abs(px) > .1) stuecke.push([f, px, yb + hInnen / 2, pw, hInnen, .012]);
    for (const [py, ph] of [[.006, .014], [.098, .026], [.19, .014]]) if (!tafel || py !== .098) stuecke.push([f, 0, yb + py, .36, ph, .01]);
  }
  const rahmenwerk = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), mat.rahmen, stuecke.length);
  stuecke.forEach(([f, x, y, w, h, d], i) => rahmenwerk.setMatrixAt(i, drehung(f).multiply(new THREE.Matrix4().compose(new THREE.Vector3(x, y, HX + d / 2), new THREE.Quaternion(), new THREE.Vector3(w, h, d)))));
  rahmenwerk.castShadow = rahmenwerk.receiveShadow = true; gruppe.add(rahmenwerk);

  // Ecksäulen aus heller Keramik, durchgehend vom Sockel bis unter die Kanzel: tragen den Turm, geben die
  // schlanke Senkrechte und lesen sich auch klein. Je Geschoss eine dunkle Klammer (Geschossring) und eine Positionslampe.
  const ES = .042, ET = .024, ER = (HX - FASE / 2) * Math.SQRT2 + ET / 2 - .001, EY0 = Y0 - .05, EY1 = Y1 + .012;
  const lampen = [], klammern = [];
  for (let q = 0; q < 4; q++) {
    const a = q * Math.PI / 2 + Math.PI / 4, M = new THREE.Matrix4().makeRotationY(a);
    const s = teil(quader(ES, EY1 - EY0, ET, .004), mat.keramik); s.applyMatrix4(M.clone().multiply(T(0, (EY0 + EY1) / 2, ER))); gruppe.add(s);
    for (let e = 0; e <= ETAGEN; e++) {
      const yt = e === 0 ? Y0 - .008 : Y0 + e * P - DECKE / 2;
      if (e < ETAGEN) lampen.push(new THREE.Vector3(0, Y0 + e * P + P - DECKE - .016, ER + ET / 2 + .0025).applyMatrix4(M));
      klammern.push(M.clone().multiply(new THREE.Matrix4().compose(new THREE.Vector3(0, yt, ER + .001), new THREE.Quaternion(), new THREE.Vector3(ES + .006, e === 0 ? .014 : DECKE + .006, ET + .006))));
    }
  }
  const klMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), mat.ring, klammern.length);
  klammern.forEach((m, i) => klMesh.setMatrixAt(i, m)); klMesh.castShadow = klMesh.receiveShadow = true; gruppe.add(klMesh);
  if (hoch) {
    const lampMesh = new THREE.InstancedMesh(ikosa(.004, 1), lampeWarm, lampen.length);
    lampen.forEach((p, i) => lampMesh.setMatrixAt(i, new THREE.Matrix4().makeTranslation(p.x, p.y, p.z))); gruppe.add(lampMesh);
  }

  // Versorgungsschacht auf der Rückseite: Rippen, Leitungen, Lampen als Datenimpuls zur Brücke
  {
    const M = drehung(2), s = new THREE.Group(); s.applyMatrix4(M); gruppe.add(s);
    const schacht = teil(quader(.094, Y1 - Y0 - .01, .03, .005), mat.paneel); schacht.position.set(0, (Y0 + Y1) / 2, HX + .015); s.add(schacht);
    for (let e = 0; e <= ETAGEN; e++) {
      const rippe = teil(quader(.112, .016, .04, .003), mat.stahl); rippe.position.set(0, Y0 + e * P - (e === ETAGEN ? DECKE / 2 : e === 0 ? -.008 : DECKE / 2), HX + .02); s.add(rippe);
    }
    for (const sx of [-1, 1]) { const rohr = teil(new THREE.CylinderGeometry(.0055, .0055, Y1 - Y0 - .02, 8), mat.stahlMatt); rohr.position.set(sx * .036, (Y0 + Y1) / 2, HX + .036); s.add(rohr); }
  }
  /* ---------- Radiatoren: führen die Abwärme der Rechenlast ab, zwei Flügel an den hinteren Ecksäulen ---------- */
  const radiatoren = [], RAD_Y = -.12;
  {
    const radTextur = new THREE.CanvasTexture(leinwand(128, 256, (x) => {
      x.fillStyle = '#ece6da'; x.fillRect(0, 0, 128, 256);
      // senkrechte Kühlrohre mit Licht- und Schattenkante, Sammler oben, Mitte, unten
      for (let i = 0; i < 18; i++) { const px = 3 + i * 7; x.fillStyle = '#bdb6a9'; x.fillRect(px, 0, 2, 256); x.fillStyle = '#fbf8f2'; x.fillRect(px + 2, 0, 1, 256); }
      x.fillStyle = '#9d978b'; for (const y of [0, 125, 250]) x.fillRect(0, y, 128, 6);
      x.fillStyle = '#d8d1c4'; for (const y of [6, 131]) x.fillRect(0, y, 128, 1);
    }));
    radTextur.colorSpace = THREE.SRGBColorSpace; radTextur.anisotropy = 8;
    const radMat = physisch({ color: '#ffffff', map: radTextur, metalness: 0, roughness: .42, clearcoat: .5, clearcoatRoughness: .25 });
    // Je Radiator: fest an der Säule ein Drehgelenk und ein Ausleger; um dessen Achse dreht die Fläche langsam
    // (Nachführung, damit sie die Sonne von der Kante nimmt). Fläche, Profil, Sammelrohr und Streben drehen mit.
    const RL = .2, RHH = .42, R0 = .43, RD = .005;
    const strebe = (a, b, r) => { const d = b.clone().sub(a), l = d.length(); return new THREE.CylinderGeometry(r, r, l, 6).applyQuaternion(new THREE.Quaternion().setFromUnitVectors(Y, d.normalize())).translate((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2); };
    const fest = [], gelenk = [];
    for (const q of [1, 2]) {
      const a = q * Math.PI / 2 + Math.PI / 4, M = new THREE.Matrix4().makeRotationY(a).premultiply(T(0, RAD_Y, 0));
      gelenk.push(gelegt(new THREE.CylinderGeometry(.0115, .0115, .022, 14).rotateX(Math.PI / 2), M.clone().multiply(T(0, 0, .306))));
      gelenk.push(gelegt(new THREE.CylinderGeometry(.0075, .0075, .012, 12).rotateX(Math.PI / 2), M.clone().multiply(T(0, 0, .322))));
      fest.push(gelegt(new THREE.CylinderGeometry(.0046, .0046, R0 - .32, 8).rotateX(Math.PI / 2), M.clone().multiply(T(0, 0, .32 + (R0 - .32) / 2))));
      const g = new THREE.Group(); g.position.y = RAD_Y; g.rotation.y = a; gruppe.add(g); radiatoren.push(g);
      g.add(teil(new THREE.BoxGeometry(RD, RHH, RL).translate(0, 0, R0 + RL / 2), radMat));
      const st = [], mt = [];
      for (const [h, d, y, z] of [[.008, RL + .008, RHH / 2, R0 + RL / 2], [.008, RL + .008, -RHH / 2, R0 + RL / 2], [RHH, .008, 0, R0 + RL + .002]]) st.push(gelegt(new THREE.BoxGeometry(RD + .003, h, d), T(0, y, z)));
      mt.push(gelegt(new THREE.CylinderGeometry(.0062, .0062, RHH + .02, 10), T(0, 0, R0 - .002)));
      mt.push(gelegt(new THREE.CylinderGeometry(.0085, .0085, .02, 10).rotateX(Math.PI / 2), T(0, 0, R0 - .012)));
      for (const sy of [-1, 1]) st.push(strebe(new THREE.Vector3(0, 0, R0 - .04), new THREE.Vector3(0, sy * .1, R0 - .004), .0026));
      g.add(teil(vereine(st), mat.stahl), teil(vereine(mt), mat.stahlMatt));
      // Positionslampe an der äußeren oberen Ecke
      const lp = new THREE.Mesh(ikosa(.0042), lampeWarm); lp.position.set(0, RHH / 2 + .007, R0 + RL); g.add(lp);
    }
    gruppe.add(teil(vereine(fest), mat.stahl), teil(vereine(gelenk), mat.stahlMatt));
  }
  const schachtLampen = instanzen(new THREE.BoxGeometry(.03, .004, .002), instLicht, ETAGEN);
  for (let e = 0; e < ETAGEN; e++) { schachtLampen.setMatrixAt(e, drehung(2).multiply(T(0, Y0 + e * P + .1, HX + .0305))); schachtLampen.setColorAt(e, new THREE.Color('#ffe6c8')); }

  /* ---------- Terminals: eine Geometrie, eigener Shader-Zusatz ---------- */
  const schirme = [], schirmId = {};
  const schirmGeo = (() => {
    const pos = [], nor = [], uv = [], a1 = [], a2 = [], idx = []; let v = 0;
    for (let f = 0; f < 4; f++) {
      const M = drehung(f), N = new THREE.Vector3(0, 0, 1).applyMatrix4(M), a = ART[SEITEN[f].art];
      for (let r = 0; r < 10; r++) a.x.forEach((cx, ci) => {
        if (!hatSchirm(f, r, ci)) return;
        const id = schirme.length, cy = reiheY(r), breit = a.w / .094;
        const d = { id, f, r, ci, streifen: Math.floor(zufall() * 8), phase: zufall() * 80, tempo: .5 + zufall() * zufall() * 3.4, hell: zufall() < .09 ? 0 : .72 + zufall() * .32, kopf: Math.floor(zufall() * 72) };
        schirme.push(d); schirmId[`${f}:${r}:${ci}`] = id;
        for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
          const p = new THREE.Vector3(cx + sx * a.w / 2, cy + sy * SH / 2, HX + .0015).applyMatrix4(M);
          pos.push(p.x, p.y, p.z); nor.push(N.x, N.y, N.z); uv.push((sx + 1) / 2, (sy + 1) / 2);
          a1.push(d.streifen, d.phase, d.tempo, d.hell); a2.push(id, d.kopf, breit, 0);
        }
        idx.push(v, v + 1, v + 2, v, v + 2, v + 3); v += 4;
      });
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setAttribute('aS', new THREE.Float32BufferAttribute(a1, 4)); g.setAttribute('aS2', new THREE.Float32BufferAttribute(a2, 4));
    g.setIndex(idx);
    return g;
  })();
  const U = {
    uAtlas: { value: atlas }, uZeit: { value: 0 }, uHell: { value: 1 }, uZiel: { value: -1 }, uZielPuls: { value: 0 }, uZielEis: { value: 0 },
    uSperre: { value: 0 }, uBlitz: { value: -1 }, uBlitzHell: { value: 0 }, uAgent: { value: new Array(8).fill(-1) }, uOrange: { value: new THREE.Color(F.orange) },
  };
  const GLSL_GEMEINSAM = `
uniform sampler2D uAtlas; uniform float uZeit, uHell, uZiel, uZielPuls, uZielEis, uSperre, uBlitz, uBlitzHell; uniform float uAgent[8]; uniform vec3 uOrange;
float kasten(vec2 p, vec2 a, vec2 b) { vec2 w = fwidth(p) * .7; vec2 s = smoothstep(a - w, a + w, p) * (1. - smoothstep(b - w, b + w, p)); return s.x * s.y; }
float istAgent(float id) { float a = 0.; for (int i = 0; i < 8; i++) a = max(a, 1. - step(.5, abs(id - uAgent[i]))); return a; }
float zufall1(float n) { return fract(sin(n * 91.345 + 7.13) * 43758.5453); }
`;
  const schirmShader = (glsl, aufruf) => s => {
    Object.assign(s.uniforms, U);
    s.vertexShader = s.vertexShader
      .replace('#include <common>', '#include <common>\nattribute vec4 aS; attribute vec4 aS2; varying vec4 vS; varying vec4 vS2; varying vec2 vSU;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvS = aS; vS2 = aS2; vSU = uv;');
    s.fragmentShader = s.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec4 vS; varying vec4 vS2; varying vec2 vSU;' + GLSL_GEMEINSAM + glsl)
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += ' + aufruf + ';');
  };
  const schirmMat = physisch({ color: '#04070b', metalness: 0, roughness: .2, clearcoat: 1, clearcoatRoughness: .05 });
  schirmMat.customProgramCacheKey = () => 'ive-schirm';
  schirmMat.onBeforeCompile = schirmShader(`
vec3 schirmLicht() {
  const float KOPF = ${KOPF.toFixed(5)}, INNEN = 1. - KOPF, STR = ${STREIFEN.toFixed(1)}, ZP = ${ZP.toFixed(1)};
  vec2 su = vSU; float id = vS2.x, hell = vS.w, breit = vS2.z;
  float ASP = ${(SH / .094).toFixed(5)} / breit;
  float wartet = 1. - step(.5, abs(id - uZiel)), agent = istAgent(id);
  // Inhalt: Zeilen laufen zeilenweise nach oben; breite Terminals zeigen zwei Spalten
  float L = uZeit * vS.z + vS.y; L = floor(L) + smoothstep(0., .3, fract(L)); L = mix(L, uZielEis, wartet);
  float fensterPx = 128. * breit * INNEN * ASP;
  float yPx = L * ZP + (INNEN - su.y) / INNEN * fensterPx;
  float xPx = vS.x * 128. + su.x * 128. * breit;
  vec2 ai = vec2(fract(xPx / 1024.), 1. - mod(yPx, STR) / 1024.);
  vec2 gx = vec2(dFdx(xPx), -dFdx(yPx)) / 1024., gy = vec2(dFdy(xPx), -dFdy(yPx)) / 1024.;
  vec3 inhalt = textureGrad(uAtlas, ai, gx, gy).rgb;
  // Kopfzeile (Reiter) aus dem Atlas
  float ky = clamp((su.y - INNEN) / KOPF, 0., 1.), kz = floor(vS2.y / 8.), ks = mod(vS2.y, 8.);
  float kx = mod(su.x * 128. * breit, 128.);
  vec2 ak = vec2((ks * 128. + kx) / 1024., 1. - (STR + kz * 16. + (1. - ky) * 16.) / 1024.);
  float kdy = 16. / KOPF / 1024.;
  vec3 kopf = textureGrad(uAtlas, ak, vec2(dFdx(su.x) * breit * .125, dFdx(su.y) * kdy), vec2(dFdy(su.x) * breit * .125, dFdy(su.y) * kdy)).rgb;
  float zeileH = ZP / (128. * breit * ASP);
  inhalt *= mix(1., step(.07 + zeileH * 1.4, su.y), wartet);
  vec3 e = mix(inhalt, kopf, step(INNEN, su.y));
  // Hintergrundbeleuchtung: kühles Schiefergrau, damit jeder Bildschirm auch klein als helle Fläche steht
  vec3 hinter = vec3(.020, .025, .034) * (.35 + 1.1 * uHell * uHell) * (1.08 - .3 * su.y);
  float h = hell * uHell * (1. + .3 * agent);
  vec3 farbe = e * h * 1.35 + hinter * (.55 + hell);
  // Bereitschaft: nur Kopf und Cursor
  float ruhe = 1. - step(.05, hell);
  vec3 cursor = vec3(1., .9, .78) * kasten(su, vec2(.07, INNEN - .2), vec2(.07 + .045 / breit, INNEN - .12)) * step(.5, fract(uZeit * .8 + id * .37));
  farbe = mix(farbe, hinter * .7 + kopf * .5 * uHell + cursor, ruhe);
  // Wartendes Terminal: Ausgabe steht, oranger Prompt blinkt, Fläche pulsiert
  float pw = .035 / breit;
  float prompt = kasten(su, vec2(.07, .07), vec2(.07 + pw, .07 + zeileH * .42));
  float blink = kasten(su, vec2(.07 + pw * 1.8, .07), vec2(.07 + pw * 3.6, .07 + zeileH * .5)) * step(.45, fract(uZeit * 1.6));
  vec3 warte = farbe * (.6 - .2 * uSperre) + uOrange * (prompt + blink) * (1.6 + 2.4 * uSperre) + uOrange * uZielPuls * (.12 + .5 * uSperre) * (1. - .5 * length(su - .5));
  farbe = mix(farbe, warte, wartet);
  farbe += vec3(1., .93, .84) * uBlitzHell * (1. - step(.5, abs(id - uBlitz))) * .5;
  vec2 r = min(su, 1. - su) * vec2(breit, ${(SH / .094).toFixed(5)});
  return farbe * smoothstep(0., .03, min(r.x, r.y));
}`, 'schirmLicht()');
  gruppe.add(teil(schirmGeo, schirmMat, { schatten: false }));

  /* ---------- Übersichtstafel: alle Front-Terminals auf einen Blick ---------- */
  const TW = .318, TH = .172, TY = Y0 + 4 * P + .098;
  {
    const g = new THREE.PlaneGeometry(TW, TH); g.translate(0, TY, HX + .0015);
    const tafelMat = physisch({ color: '#04070b', metalness: 0, roughness: .2, clearcoat: 1, clearcoatRoughness: .05 });
    tafelMat.customProgramCacheKey = () => 'ive-tafel';
    tafelMat.onBeforeCompile = schirmShader(`
vec3 tafelLicht() {
  vec2 su = vSU; const float ASP = ${(TH / TW).toFixed(5)};
  vec3 warm = vec3(1., .93, .84), hinter = vec3(.007, .009, .013);
  vec3 c = hinter * 1.4;
  // Kopf: Titel, Zähler, Hinweis
  c += warm * .07 * kasten(su, vec2(.0, .9), vec2(1., 1.));
  c += warm * .8 * kasten(su, vec2(.035, .935), vec2(.2, .962));
  c += warm * .35 * kasten(su, vec2(.23, .935), vec2(.3, .962));
  float jemand = step(-.5, uZiel) * step(uZiel, 23.5);
  c += mix(warm * .4, uOrange * (1.5 + 2. * uZielPuls), jemand) * kasten(su, vec2(.93, .93), vec2(.955, .967));
  // Kacheln: 6 × 4, eine je Front-Terminal
  vec2 b0 = vec2(.035, .14), b1 = vec2(.965, .87);
  vec2 q = (su - b0) / (b1 - b0);
  if (q.x > 0. && q.x < 1. && q.y > 0. && q.y < 1.) {
    vec2 zelle = floor(q * vec2(6., 4.)), lok = fract(q * vec2(6., 4.));
    float n = zelle.y * 6. + zelle.x, wartet = 1. - step(.5, abs(n - uZiel)), agent = istAgent(n);
    float rand = kasten(lok, vec2(.05, .08), vec2(.95, .92)) - kasten(lok, vec2(.075, .13), vec2(.925, .87));
    float fl = kasten(lok, vec2(.05, .08), vec2(.95, .92));
    float fort = fract(uZeit * (.05 + .1 * zufall1(n)) + zufall1(n + 3.));
    vec3 kc = warm * (.035 * fl + .22 * rand + .7 * agent * rand);
    kc += warm * .75 * kasten(lok, vec2(.14, .62), vec2(.14 + .3 + .3 * zufall1(n + 9.), .74));
    kc += warm * .3 * kasten(lok, vec2(.14, .42), vec2(.6, .5));
    kc += warm * .8 * kasten(lok, vec2(.14, .2), vec2(.14 + .72 * fort, .28)) + warm * .12 * kasten(lok, vec2(.14, .2), vec2(.86, .28));
    kc += warm * (.25 + .9 * agent) * kasten(lok, vec2(.8, .6), vec2(.86, .76));
    vec3 wk = uOrange * (.35 + 1.4 * uZielPuls) * fl + warm * 1.1 * kasten(lok, vec2(.14, .62), vec2(.6, .74)) + uOrange * 2.5 * rand;
    c += mix(kc, wk, wartet);
  }
  // Fußzeile: Verlaufskurve der Auslastung
  float x = su.x, kurve = .065 + .022 * sin(x * 23. - uZeit * .9) * sin(x * 7. + uZeit * .3) + .01 * sin(x * 61. + uZeit * 2.);
  float lin = 1. - smoothstep(0., fwidth(su.y) * 1.6, abs(su.y - kurve));
  c += warm * .55 * lin * kasten(su, vec2(.035, 0.), vec2(.965, 1.));
  c += warm * .06 * kasten(su, vec2(.035, .108), vec2(.965, .112));
  c *= uHell;
  vec2 r = min(su, 1. - su) * vec2(1., ASP);
  return c * smoothstep(0., .012, min(r.x, r.y));
}`, 'tafelLicht()');
    gruppe.add(teil(g, tafelMat, { schatten: false }));
  }

  /* ---------- Sockel mit Andockstutzen ---------- */
  gruppe.add(teil(band(Y0 - .066, Y0, HX + .022, FASE + .01, .006), mat.paneel));
  gruppe.add(teil(band(Y0 - .034, Y0 - .022, HX + .026, FASE + .012, .002), mat.keramik));
  gruppe.add(teil(loft([{ y: -.80, hx: .118, f: .022 }, { y: Y0 - .066, hx: HX + .004, f: FASE + .004 }]), mat.paneel));
  // Die Ecksäulen laufen über die Sockelkanten bis zum Kiel weiter: eine durchgehende Struktur statt Kasten auf Klotz
  {
    const yA = Y0 - .066, yB = -.80, rA = (HX + .004 - (FASE + .004) / 2) * Math.SQRT2, rB = (.118 - .011) * Math.SQRT2;
    const dr = rB - rA, dy = yB - yA, len = Math.hypot(dr, dy), nr = -dy / len, ny = dr / len, phi = Math.atan2(-dr, -dy);
    for (let q = 0; q < 4; q++) {
      const M = new THREE.Matrix4().makeRotationY(q * Math.PI / 2 + Math.PI / 4).multiply(T(0, (yA + yB) / 2 + ny * ET / 2, (rA + rB) / 2 + nr * ET / 2)).multiply(new THREE.Matrix4().makeRotationX(phi));
      const s = teil(quader(ES * .78, len + .01, ET * .75, .004), mat.keramik); s.applyMatrix4(M); gruppe.add(s);
    }
    // Fensterreihe im Maschinendeck (vorn und hinten): zeigt die Sockelfläche im Schatten und gibt Maßstab
    const fy = -.708, fz = HX + .004 - (HX + .004 - .118) * (Y0 - .066 - fy) / (Y0 - .066 - yB), neig = Math.atan((HX + .004 - .118) / (Y0 - .066 - yB));
    const fensterMat = leuchtMat('#ffe2c2', 1.25);
    for (const f of [0, 2]) for (const x of [-.084, -.042, 0, .042, .084]) {
      const w = new THREE.Mesh(quader(.026, .011, .003, .0012), fensterMat);
      w.applyMatrix4(drehung(f).multiply(T(x, fy, fz + .0012)).multiply(new THREE.Matrix4().makeRotationX(neig))); gruppe.add(w);
    }
  }
  gruppe.add(teil(band(-.83, -.80, .108, .02, .004), mat.stahl));
  for (let q = 0; q < 4; q++) { const l = new THREE.Mesh(new THREE.BoxGeometry(.012, .004, .002), lampeWarm); l.position.set(0, -.815, .1085).applyMatrix4(drehung(q)); l.rotation.y = q * Math.PI / 2; gruppe.add(l); }
  gruppe.add(teil(loft([{ y: -.862, hx: .05, f: .012 }, { y: -.83, hx: .07, f: .016 }]), mat.graphit));
  const antenne = teil(new THREE.CylinderGeometry(.0035, .006, .095, 8), mat.stahl); antenne.position.y = -.905; gruppe.add(antenne);
  const spitze = new THREE.Mesh(ikosa(.0055, 1), lampeWarm); spitze.position.y = -.955; gruppe.add(spitze);
  const spitzeGlut = leucht('#ffd9ae', .05, .6); spitzeGlut.position.y = -.955; gruppe.add(spitzeGlut);
  // Lageregeldüsen an den vier Sockelecken
  if (hoch) for (let q = 0; q < 4; q++) {
    const a = q * Math.PI / 2 + Math.PI / 4, r = (HX + .01) * Math.SQRT2 - .03, d = new THREE.Group();
    d.position.set(Math.sin(a) * r, Y0 - .045, Math.cos(a) * r); d.rotation.y = a; gruppe.add(d);
    d.add(teil(quader(.03, .026, .026, .003), mat.stahlMatt));
    for (const [nx, ny, nz, rx, rz] of [[0, 0, .016, Math.PI / 2, 0], [.018, 0, 0, 0, -Math.PI / 2], [-.018, 0, 0, 0, Math.PI / 2], [0, -.016, 0, Math.PI, 0]]) {
      const n = teil(new THREE.CylinderGeometry(.0035, .006, .008, 8), mat.tief); n.position.set(nx, ny, nz); n.rotation.set(rx, 0, rz); d.add(n);
    }
  }
  const stutzenLampen = instanzen(new THREE.BoxGeometry(.004, .006, .006), instLicht, 16);
  for (const sx of [1, -1]) {
    const s = new THREE.Group(); s.position.set(0, -.728, 0); s.rotation.y = sx > 0 ? 0 : Math.PI;
    const rohr = teil(new THREE.CylinderGeometry(.034, .04, .16, seg).rotateZ(Math.PI / 2), mat.stahlMatt); rohr.position.x = .2; s.add(rohr);
    for (const rx of [.215, .245]) { const ring = teil(new THREE.CylinderGeometry(.043, .043, .008, seg).rotateZ(Math.PI / 2), mat.stahl); ring.position.x = rx; s.add(ring); }
    const kragen = teil(new THREE.CylinderGeometry(.056, .05, .034, seg).rotateZ(Math.PI / 2), mat.keramik); kragen.position.x = .29; s.add(kragen);
    const lippe = teil(new THREE.TorusGeometry(.047, .0045, hoch ? 6 : 4, seg * 2).rotateY(Math.PI / 2), mat.stahl); lippe.position.x = .308; s.add(lippe);
    const luke = teil(new THREE.CylinderGeometry(.038, .038, .01, seg).rotateZ(Math.PI / 2), mat.tief); luke.position.x = .304; s.add(luke);
    for (const rz of [0, Math.PI / 2]) { const k2 = teil(new THREE.BoxGeometry(.004, .056, .004), mat.stahlMatt); k2.position.x = .31; k2.rotation.x = rz; s.add(k2); }
    for (let i = 0; i < 8; i++) {
      const a = i / 8 * Math.PI * 2 + Math.PI / 8, j = (sx > 0 ? 0 : 8) + i;
      stutzenLampen.setMatrixAt(j, T(0, -.728, 0).multiply(new THREE.Matrix4().makeRotationY(s.rotation.y)).multiply(T(.3075, Math.sin(a) * .0525, Math.cos(a) * .0525)));
      stutzenLampen.setColorAt(j, new THREE.Color(F.orange));
    }
    gruppe.add(s);
  }

  /* ---------- Brücke: verglaste Kanzel für den Überblick ---------- */
  const B0 = Y1;
  gruppe.add(teil(loft([{ y: B0, hx: HX + .012, f: FASE + .006 }, { y: B0 + .05, hx: .272, f: .048 }], { oben: false }), mat.paneel));
  gruppe.add(teil(band(B0 + .05, B0 + .076, .278, .05, .004), mat.stahl));
  // Downlights unter der Kanzel
  if (hoch) {
    const dl = [], schraeg = new THREE.Matrix4().makeRotationX(-Math.PI / 4);
    for (let f = 0; f < 4; f++) for (const x of [-.15, -.075, 0, .075, .15]) dl.push(drehung(f).multiply(new THREE.Matrix4().makeTranslation(x, B0 + .025, .2475 + .0012)).multiply(schraeg));
    const dm = new THREE.InstancedMesh(new THREE.BoxGeometry(.014, .002, .007), lampeWarm, dl.length);
    dl.forEach((m, i) => dm.setMatrixAt(i, m)); gruppe.add(dm);
  }
  const GU = B0 + .076, GO = B0 + .222;
  const innenTextur = new THREE.CanvasTexture(leinwand(512, 128, (x) => {
    // Leitstand: neutrale dunkle Wand, durchgehendes Lichtband an der Decke, Pulte mit Bildschirmen
    const v = x.createLinearGradient(0, 0, 0, 128); v.addColorStop(0, '#8a7f74'); v.addColorStop(.25, '#4f4842'); v.addColorStop(.62, '#252322'); v.addColorStop(1, '#0b0b0c');
    x.fillStyle = v; x.fillRect(0, 0, 512, 128);
    x.fillStyle = 'rgba(255,238,218,.95)'; for (let i = 0; i < 16; i++) x.fillRect(i * 32 + 2, 10, 28, 5);
    x.fillStyle = 'rgba(255,214,170,.28)'; x.fillRect(0, 15, 512, 12);
    for (let i = 0; i < 10; i++) {
      const px = i * 51 + 5;
      x.fillStyle = '#26303c'; x.fillRect(px + 4, 62, 36, 22);                     // Pultbildschirm
      x.fillStyle = 'rgba(255,236,214,.75)'; for (let z = 0; z < 4; z++) x.fillRect(px + 7, 66 + z * 4, 10 + ((i * 7 + z * 5) % 18), 1.5);
      if (i % 4 === 1) { x.fillStyle = '#ee6b35'; x.fillRect(px + 34, 65, 3, 3); }
      x.fillStyle = '#050506'; x.beginPath(); x.moveTo(px, 128); x.lineTo(px + 3, 88); x.lineTo(px + 42, 86); x.lineTo(px + 45, 128); x.fill();
    }
    for (let i = 0; i < 26; i++) { x.fillStyle = i % 7 === 3 ? '#ee6b35' : 'rgba(255,230,200,.8)'; x.fillRect(12 + i * 19.3, 95 + (i % 3), 5, 2); }
  }));
  innenTextur.colorSpace = THREE.SRGBColorSpace; innenTextur.wrapS = THREE.RepeatWrapping; innenTextur.repeat.set(1 / .5, 1 / (GO - GU)); innenTextur.offset.set(0, -GU / (GO - GU));
  const innenMat = new THREE.MeshStandardMaterial({ color: '#000', emissive: '#ffffff', emissiveMap: innenTextur, emissiveIntensity: 1, roughness: 1, metalness: 0 });
  gruppe.add(teil(loft([{ y: GU, hx: .232, f: .042 }, { y: GO, hx: .232, f: .042 }], { unten: false }), innenMat, { schatten: false }));
  const RU = .258, RO = .29;
  const glas = teil(loft([{ y: GU, hx: RU, f: .048 }, { y: GO, hx: RO, f: .055 }], { unten: false, oben: false }), mat.glas, { schatten: false, empfang: false });
  glas.renderOrder = 2; gruppe.add(glas);
  {
    const ru = achteck(RU + .002, RU + .002, .048), ro = achteck(RO + .002, RO + .002, .055), sprossen = [];
    for (let i = 0; i < 8; i++) {
      const j = (i + 1) % 8;
      for (const s of i % 2 === 0 ? [0, 1 / 3, 2 / 3] : [0]) {
        const pu = new THREE.Vector3(ru[i][0] + (ru[j][0] - ru[i][0]) * s, GU, ru[i][1] + (ru[j][1] - ru[i][1]) * s);
        const po = new THREE.Vector3(ro[i][0] + (ro[j][0] - ro[i][0]) * s, GO, ro[i][1] + (ro[j][1] - ro[i][1]) * s);
        const d = po.clone().sub(pu), l = d.length();
        sprossen.push(new THREE.Matrix4().compose(pu.clone().add(po).multiplyScalar(.5), new THREE.Quaternion().setFromUnitVectors(Y, d.normalize()), new THREE.Vector3(.0065, l, .0065)));
      }
    }
    const sp = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), mat.stahl, sprossen.length);
    sprossen.forEach((m, i) => sp.setMatrixAt(i, m)); sp.castShadow = true; gruppe.add(sp);
  }
  // Gesims in heller Keramik, darüber das Dach
  gruppe.add(teil(band(GO, GO + .032, .302, .058, .005), mat.keramik));
  // flaches Walmdach mit Fugen: jede Facette fängt das Licht anders
  gruppe.add(teil(loft([{ y: GO + .032, hx: .286, f: .052 }, { y: GO + .042, hx: .286, f: .052 }, { y: GO + .064, hx: .15, f: .03 }], { unten: false }), mat.paneel));
  const DACH = GO + .064;
  if (hoch) {
    // Eckleuchten auf dem Gesims
    for (let q = 0; q < 4; q++) { const a = q * Math.PI / 2 + Math.PI / 4, r = .302 * Math.SQRT2 - .046; const l = new THREE.Mesh(ikosa(.0045, 1), lampeWarm); l.position.set(Math.sin(a) * r, GO + .036, Math.cos(a) * r); gruppe.add(l); }
    // Parabolantenne auf der Dachschräge
    const fuss = teil(new THREE.CylinderGeometry(.0035, .006, .026, 8), mat.stahl); fuss.position.set(-.19, GO + .066, -.19); gruppe.add(fuss);
    const sch = new THREE.Group(); sch.position.set(-.19, GO + .08, -.19); sch.rotation.order = 'YXZ'; sch.rotation.set(-.6, -Math.PI * .75, 0); gruppe.add(sch);
    const spiegelMat = mat.keramik.clone(); spiegelMat.side = THREE.DoubleSide;
    const spiegel = teil(new THREE.SphereGeometry(.034, 18, 5, 0, Math.PI * 2, 0, .62).rotateX(-Math.PI / 2), spiegelMat); spiegel.position.z = .026; sch.add(spiegel);
    const speise = teil(new THREE.CylinderGeometry(.0016, .0016, .017, 6).rotateX(Math.PI / 2), mat.stahl); speise.position.z = .0005; sch.add(speise);
    const horn = teil(new THREE.CylinderGeometry(.003, .002, .005, 8).rotateX(Math.PI / 2), mat.stahlMatt); horn.position.z = .009; sch.add(horn);
  }
  gruppe.add(teil(loft([{ y: DACH - .004, hx: .068, f: .02 }, { y: DACH + .026, hx: .054, f: .016 }]), mat.graphit));
  const rotor = new THREE.Group(); rotor.position.y = DACH + .04; gruppe.add(rotor);
  rotor.add(teil(new THREE.CylinderGeometry(.024, .028, .02, seg), mat.stahl));
  {
    const balken = teil(quader(.24, .015, .03, .003), mat.graphit); balken.position.y = .018; rotor.add(balken);
    const leiste = new THREE.Mesh(new THREE.BoxGeometry(.19, .0035, .002), lampeWarm); leiste.position.set(0, .018, .0155); rotor.add(leiste);
    for (const sx of [-1, 1]) { const kappe = teil(quader(.02, .019, .034, .003), mat.keramik); kappe.position.set(sx * .12, .018, 0); rotor.add(kappe); }
  }
  {
    const mast = teil(new THREE.CylinderGeometry(.0048, .008, .12, 8), mat.stahl); mast.position.y = DACH + .08; gruppe.add(mast);
    const quer = teil(new THREE.BoxGeometry(.062, .0038, .0038), mat.stahl); quer.position.y = DACH + .112; gruppe.add(quer);
    for (const sx of [-1, 1]) { const l = new THREE.Mesh(ikosa(.0036, 1), lampeWarm); l.position.set(sx * .031, DACH + .112, 0); gruppe.add(l); }
    const peitsche = teil(new THREE.CylinderGeometry(.0016, .0028, .04, 6), mat.stahl); peitsche.position.y = DACH + .165; gruppe.add(peitsche);
    const a = teil(new THREE.CylinderGeometry(.0022, .0035, .07, 6), mat.stahl); a.position.set(.2, GO + .056 + .035, .2); gruppe.add(a);
  }
  const feuerMat = leuchtMat(F.orange, 2.5);
  const feuer = new THREE.Mesh(ikosa(.006, 1), feuerMat); feuer.position.y = DACH + .145; gruppe.add(feuer);
  const feuerGlut = leucht(F.orange, .09, 0); feuerGlut.position.copy(feuer.position); gruppe.add(feuerGlut);

  /* ---------- Agenten-Drohnen ---------- */
  // Facettierte Kapsel: Keramikschale oben, Graphitbauch, Stahlnaht mit Visier, Heckdüsen, einfahrbarer Andockarm
  const DA = .04; // Abstand Drohnenmitte zur Rahmenfläche im angedockten Zustand
  const DG = {
    bauch: loft([{ y: -.011, hx: .016, hz: .012, f: .006 }, { y: -.003, hx: .029, hz: .021, f: .01 }]),
    naht: loft([{ y: -.003, hx: .0295, hz: .0215, f: .0102 }, { y: .002, hx: .0295, hz: .0215, f: .0102 }], { unten: false, oben: false }),
    schale: loft([{ y: .002, hx: .029, hz: .021, f: .01 }, { y: .008, hx: .025, hz: .018, f: .009 }, { y: .012, hx: .016, hz: .011, f: .006 }], { unten: false }),
    duese: new THREE.CylinderGeometry(.0048, .0068, .009, hoch ? 12 : 6).rotateX(Math.PI / 2),
    // Flügel: kleine Radiatorflächen quer zur Flugrichtung, zum Betrachter hin flach; Ausleger aus Stahl
    fluegel: quader(.024, .012, .0018, .0006), ausleger: new THREE.CylinderGeometry(.0011, .0011, .009, 5).rotateZ(Math.PI / 2),
    arm: new THREE.CylinderGeometry(.0017, .0017, 1, 6).rotateX(Math.PI / 2).translate(0, 0, -.5),
    klemme: quader(.012, .01, .003, .001), punkt: ikosa(.0034, 1),
    visier: new THREE.BoxGeometry(.026, .0026, .002), fuehler: new THREE.CylinderGeometry(.0008, .0008, .012, 4),
  };
  // Alle sechs Drohnen als Instanzen je Bauteil (wenige Zeichenaufrufe)
  const ND = 6;
  const drohnen = [0, 0, 0, 1, 3, 2].map(f => ({ f }));
  const FX = .0375 + .012; // Flügelmitte seitlich
  const dKoerper = [
    instanzen(DG.bauch, mat.graphit, ND, true),
    instanzen(vereine([gelegt(DG.naht, T()), gelegt(DG.ausleger, T(.0345, 0, .002)), gelegt(DG.ausleger, T(-.0345, 0, .002)), ...(hoch ? [gelegt(DG.fuehler, T(.009, .016, .008))] : [])]), mat.stahl, ND, true),
    instanzen(vereine([gelegt(DG.schale, T()), gelegt(DG.fluegel, T(FX, 0, .002)), gelegt(DG.fluegel, T(-FX, 0, .002))]), mat.keramik, ND, true),
    instanzen(gelegt(DG.duese, T(0, -.001, .0235)), mat.tief, ND, true),
  ];
  const dArm = instanzen(DG.arm, mat.stahl, ND, true), dKlemme = instanzen(DG.klemme, mat.stahlMatt, ND, true);
  const dVisier = instanzen(DG.visier, instLicht, ND), dStatus = instanzen(DG.punkt, instLicht, ND), dKontakt = instanzen(DG.punkt, instLicht, ND), dHeck = instanzen(DG.punkt, instLicht, ND);
  // Leuchthöfe als Punktwolken: Größe in Welteinheiten, Helligkeit über die Punktfarbe (additiv)
  const hofPunkte = (n, groesse) => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3)); g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
    const p = new THREE.Points(g, new THREE.PointsMaterial({ map: glutTextur, size: groesse, sizeAttenuation: true, vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
    p.frustumCulled = false; gruppe.add(p); return p;
  };
  const dStatusHof = hofPunkte(ND, .17), dHeckHof = hofPunkte(ND, .2);

  /* ---------- Lichtrahmen ---------- */
  const SW3 = ART[3].w, RW = SW3 + .016, RH = SH + .016, ST = .004;
  const rahmen = new THREE.Group(); gruppe.add(rahmen);
  const rahmenMat = new THREE.MeshBasicMaterial({ color: '#fff3e4', toneMapped: false });
  rahmen.add(new THREE.Mesh(vereine([[RW + ST, ST, 0, RH / 2], [RW + ST, ST, 0, -RH / 2], [ST, RH, RW / 2, 0], [ST, RH, -RW / 2, 0]].map(([w, h, x, y]) => gelegt(new THREE.BoxGeometry(w, h, .002), T(x, y, 0)))), rahmenMat));
  const winkelTeile = [];
  for (const sx of [-1, 1]) for (const sy of [-1, 1]) {
    const L = .022, D = .007;
    winkelTeile.push(gelegt(new THREE.BoxGeometry(L, D, .003), T(sx * (RW / 2 + .004 - L / 2 + D / 2), sy * (RH / 2 + .004), 0)));
    winkelTeile.push(gelegt(new THREE.BoxGeometry(D, L, .003), T(sx * (RW / 2 + .004), sy * (RH / 2 + .004 - L / 2 + D / 2), 0)));
  }
  const winkel = new THREE.Mesh(vereine(winkelTeile), rahmenMat); rahmen.add(winkel);
  const HW = 150, HH = 150 * RH / RW;
  const hofTextur = new THREE.CanvasTexture(leinwand(256, 256, (x) => {
    x.strokeStyle = '#fff'; x.lineWidth = 7; x.shadowColor = '#fff'; x.shadowBlur = 26;
    for (let i = 0; i < 3; i++) x.strokeRect(128 - HW / 2, 128 - HH / 2, HW, HH);
  }));
  hofTextur.colorSpace = THREE.SRGBColorSpace;
  const hofMat = new THREE.MeshBasicMaterial({ map: hofTextur, color: '#fff1de', transparent: true, opacity: .5, blending: THREE.AdditiveBlending, depthWrite: false });
  const hof = new THREE.Mesh(new THREE.PlaneGeometry(RW * 256 / HW, RH * 256 / HH), hofMat); hof.position.z = -.001; rahmen.add(hof);

  /* ---------- Ablauf: wer wartet, wohin fliegen die Drohnen ---------- */
  const C = 7.2, HOP = .62, ZUG = .32, ENDE = C - .7;
  const folge = [0, 2, 1, 0, 1, 2];
  const wartend = kz => folge[((kz % 6) + 6) % 6];
  const baender = [[0, 1, 2], [3, 4, 5], [6, 7]];
  const frontZelle = (i, kz) => { const b = baender[i], z = Math.floor(streu(i * 97 + 13, kz) * b.length * 3); return { c: z % 3, r: b[Math.floor(z / 3)] }; };
  const dockZelle = (i, kz) => wartend(kz) === i ? frontZelle(i, kz - 1) : frontZelle(i, kz);
  const seitenZelle = (i, f, m) => {
    const a = ART[SEITEN[f].art], spalten = a.x.map((_, ci) => ci).filter(ci => hatSchirm(f, 0, ci));
    const z = Math.floor(streu(i * 131 + 7, m) * 10 * spalten.length); return { c: spalten[z % spalten.length], r: Math.floor(z / spalten.length) };
  };
  const zeilenStand = (sc, t) => { const L = t * sc.tempo + sc.phase, fr = L - Math.floor(L); return Math.floor(L) + glatt(0, .3, fr); };
  const dockX = (f, ci) => { const a = ART[SEITEN[f].art]; if (SEITEN[f].schacht) return ci === 0 ? -.1695 : .1695; return a.x[ci] + a.w / 2 + (ci === a.x.length - 1 ? .0105 : .009); };
  const dockPunkt = (f, z, aus = 0) => new THREE.Vector3(dockX(f, z.c), reiheY(z.r), HX + .012 + DA + aus).applyMatrix4(drehung(f));
  const bezier = (a, b, c, d, s) => { const u = 1 - s; return a.clone().multiplyScalar(u * u * u).add(b.clone().multiplyScalar(3 * u * u * s)).add(c.clone().multiplyScalar(3 * u * s * s)).add(d.clone().multiplyScalar(s * s * s)); };
  const weiss = new THREE.Color('#fff3e4'), orange = new THREE.Color(F.orange);

  function drohnenLage(i, t) {
    const dr = drohnen[i];
    let von, nach, s;
    if (i < 3) {
      const kz = Math.floor(t / C), p = t - kz * C, o = [.45, 1.0, 1.55][i];
      von = dockZelle(i, kz - 1); nach = dockZelle(i, kz); s = glatter((p - o) / 1.5);
    } else {
      const per = [5.4, 6.3, 7.7][i - 3], tt = t + i * 1.7, m = Math.floor(tt / per), p = tt - m * per;
      von = seitenZelle(i, dr.f, m - 1); nach = seitenZelle(i, dr.f, m); s = glatter((p - .3) / 1.6);
    }
    const a = dockPunkt(dr.f, von), d = dockPunkt(dr.f, nach);
    const weg = a.distanceTo(d), hub = Math.min(.09, .03 + weg * .35);
    const b = dockPunkt(dr.f, von, hub), c = dockPunkt(dr.f, nach, hub);
    const unterwegs = s > 0 && s < 1 && weg > 1e-4;
    const arm = unterwegs ? klemme(Math.max(1 - s / .1, (s - .9) / .1), 0, 1) : 1;
    return { pos: bezier(a, b, c, d, s), unterwegs, zelle: s >= 1 ? nach : von, arm };
  }

  // Arbeitsobjekte, damit pro Bild wenig neu angelegt wird
  const _md = new THREE.Matrix4(), _m = new THREE.Matrix4(), _s = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _eins = new THREE.Vector3(1, 1, 1), _p = new THREE.Vector3(), _c = new THREE.Color();

  function aktualisiere(t, zustand = {}) {
      const aktiv = !!zustand.aktiv, naehe = zustand.naehe || 0;
      U.uZeit.value = t;
      U.uHell.value = (aktiv ? 1.4 : .8) + naehe * .1;

      // Zyklus des Lichtrahmens: suchen, finden, halten, Antwort
      const kz = Math.floor(t / C), p = t - kz * C, w = wartend(kz);
      const ziel = dockZelle(w, kz), vor = dockZelle(wartend(kz - 1), kz - 1);
      const zielId = schirmId[`0:${ziel.r}:${ziel.c}`];
      const punkte = [vor];
      for (let j = 1; j <= 3; j++) {
        const a = j / 4, st = 1 - a, alt = punkte[j - 1];
        const c = klemme(Math.round(vor.c + (ziel.c - vor.c) * a + (streu(kz, 10 + j) - .5) * 2.6 * st), 0, 2);
        let r = klemme(Math.round(vor.r + (ziel.r - vor.r) * a + (streu(kz, 20 + j) - .5) * 6 * st), 0, 7);
        if (c === alt.c && r === alt.r) r = r < 7 ? r + 1 : r - 1;
        punkte.push({ c, r });
      }
      punkte.push(ziel);
      const lage = z => [ART[3].x[z.c], reiheY(z.r)];
      let fx, fy, sperrStart;
      if (aktiv) {
        sperrStart = .34;
        const s = zurueck((p - .1) / .24), [ax, ay] = lage(vor), [bx, by] = lage(ziel);
        fx = ax + (bx - ax) * s; fy = ay + (by - ay) * s;
      } else {
        sperrStart = .35 + 3 * HOP + ZUG;
        const j = klemme(Math.floor((p - .35) / HOP), 0, 3), s = p < .35 ? 0 : glatter((p - .35 - j * HOP) / ZUG);
        const [ax, ay] = lage(punkte[j]), [bx, by] = lage(punkte[j + 1]);
        fx = ax + (bx - ax) * s; fy = ay + (by - ay) * s;
      }
      const sperre = glatt(sperrStart, sperrStart + .2, p) * (1 - glatt(ENDE, ENDE + .08, p));
      const puls = .5 + .5 * Math.sin((p - sperrStart) * Math.PI * 2 * (aktiv ? 1.4 : 1.05));
      const antwort = p > ENDE ? 1 - (p - ENDE) / (C - ENDE) : 0;
      U.uZiel.value = p < ENDE ? zielId : -1;
      U.uSperre.value = sperre * (aktiv ? 1 : .75);
      U.uZielPuls.value = (p < ENDE ? .2 : 0) + sperre * puls * (aktiv ? 1 : .65);
      U.uZielEis.value = zeilenStand(schirme[zielId], kz * C);
      U.uBlitz.value = zielId; U.uBlitzHell.value = antwort * antwort;

      const fokus = p > sperrStart ? 1 + .5 * (1 - glatt(sperrStart, sperrStart + .32, p)) : 1;
      rahmen.position.set(fx, fy, HX + .0185);
      winkel.scale.setScalar(fokus + sperre * puls * .05);
      rahmenMat.color.copy(weiss).lerp(orange, sperre).multiplyScalar((aktiv ? 1 : .8) + sperre * .3);
      hofMat.color.copy(rahmenMat.color);
      hofMat.opacity = (aktiv ? .5 : .32) + sperre * puls * (aktiv ? .5 : .3);

      // Drohnen: andocken, umsetzen, wartender Agent pulsiert orange
      const agenten = U.uAgent.value; agenten.fill(-1);
      const sPos = dStatusHof.geometry.attributes.position, sFarbe = dStatusHof.geometry.attributes.color;
      const hPos = dHeckHof.geometry.attributes.position, hFarbe = dHeckHof.geometry.attributes.color;
      drohnen.forEach((dr, i) => {
        const l = drohnenLage(i, t), l2 = drohnenLage(i, t + .03);
        const v = l2.pos.clone().sub(l.pos).divideScalar(.03).applyMatrix4(drehung(-dr.f)), tempo = v.length();
        _e.set(klemme(v.y * .9, -.35, .35), dr.f * Math.PI / 2, klemme(-v.x * 1.1, -.45, .45), 'YXZ');
        _md.compose(l.pos, _q.setFromEuler(_e), _eins);
        for (const m of dKoerper) m.setMatrixAt(i, _md);
        // Andockarm fährt aus, Klemme sitzt auf dem Rahmen, Kontaktlicht zeigt die Verbindung
        const L = (DA - .0225) * glatter(l.arm), klZ = -.021 - L - .0015;
        dArm.setMatrixAt(i, _m.copy(_md).multiply(T(0, 0, -.021)).multiply(_s.makeScale(1, 1, Math.max(L, 1e-4))));
        dKlemme.setMatrixAt(i, _m.copy(_md).multiply(T(0, 0, klZ)));
        dVisier.setMatrixAt(i, _m.copy(_md).multiply(T(0, -.0005, -.0215)));
        dStatus.setMatrixAt(i, _m.copy(_md).multiply(T(0, .0125, .004)));
        dKontakt.setMatrixAt(i, _m.copy(_md).multiply(T(0, .0062, klZ)).multiply(_s.makeScale(.6, .6, .6)));
        dHeck.setMatrixAt(i, _m.copy(_md).multiply(T(0, -.001, .0275)).multiply(_s.makeScale(1.1, 1.1, .6)));
        if (!l.unterwegs) agenten[i] = schirmId[`${dr.f}:${l.zelle.r}:${l.zelle.c}`];
        const istWartend = i < 3 && i === w && p < ENDE, wp = istWartend ? .35 + .65 * (sperre > 0 ? puls : .5) : 0;
        dStatus.setColorAt(i, _c.set(istWartend ? F.orange : '#ffe6c8').multiplyScalar(istWartend ? 1.5 + 2.5 * wp : 1.5));
        dVisier.setColorAt(i, _c.set('#ffe6c8').multiplyScalar(1.3));
        dKontakt.setColorAt(i, _c.set('#ffe6c8').multiplyScalar(.3 + 2.2 * glatt(.8, 1, l.arm) * (.75 + .25 * Math.sin(t * 5 + i))));
        // Düse glimmt angedockt nur, im Flug heller
        dHeck.setColorAt(i, _c.set(F.glut).multiplyScalar(.18 + klemme(tempo * 7, 0, 3)));
        // Leuchthöfe
        _p.set(0, .0125, .004).applyMatrix4(_md); sPos.setXYZ(i, _p.x, _p.y, _p.z);
        _c.set(istWartend ? F.orange : '#ffe6c8').multiplyScalar(istWartend ? .45 + .55 * wp : .28); sFarbe.setXYZ(i, _c.r, _c.g, _c.b);
        _p.set(0, -.001, .031).applyMatrix4(_md); hPos.setXYZ(i, _p.x, _p.y, _p.z);
        _c.set(F.glut).multiplyScalar(.03 + klemme(tempo * 2.4, 0, .8)); hFarbe.setXYZ(i, _c.r, _c.g, _c.b);
      });
      for (const m of [...dKoerper, dArm, dKlemme, dVisier, dStatus, dKontakt, dHeck]) { m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true; }
      sPos.needsUpdate = sFarbe.needsUpdate = hPos.needsUpdate = hFarbe.needsUpdate = true;

      // Dach, Feuer, Stutzen, Schacht, Brücke
      rotor.rotation.y = t * .55;
      // Radiatoren: langsame Nachführung um den Ausleger, spiegelbildlich
      const neig = .36 + .12 * Math.sin(t * .23);
      radiatoren[0].rotation.z = neig; radiatoren[1].rotation.z = -neig;
      const blitz = Math.pow(Math.max(0, Math.sin(t * Math.PI * 1.6)), 24);
      feuerMat.color.set(F.orange).multiplyScalar(.6 + blitz * 3.5); feuerGlut.material.opacity = blitz * .95;
      for (let i = 0; i < 16; i++) { const a = .5 + .5 * Math.sin(t * 2.4 - (i % 8) * .8); stutzenLampen.setColorAt(i, _c.set(F.orange).multiplyScalar(.5 + a * (aktiv ? 2.4 : 1.4) + naehe)); }
      stutzenLampen.instanceColor.needsUpdate = true;
      for (let e = 0; e < ETAGEN; e++) { const wl = Math.pow(.5 + .5 * Math.cos((t * (aktiv ? 1.6 : 1) - e * .22) * Math.PI * 2 / 2.4), 8); schachtLampen.setColorAt(e, _c.set('#ffe6c8').multiplyScalar(.35 + 2.4 * wl)); }
      schachtLampen.instanceColor.needsUpdate = true;
      innenMat.emissiveIntensity = (aktiv ? 2.1 : 1.5) + naehe * .25;
      mat.rahmen.emissiveIntensity = (aktiv ? .018 : .006) + naehe * .004; // Widerschein der Bildschirme
      spitzeGlut.material.opacity = .4 + .25 * Math.sin(t * 1.3);
  }

  /* ---------- Statische Teile je Material zusammenführen ---------- */
  function verschmelze(wurzel, ausnahmen) {
    wurzel.updateMatrixWorld(true);
    const inv = wurzel.matrixWorld.clone().invert(), toepfe = new Map();
    wurzel.traverse(o => {
      if (!o.isMesh || o.isInstancedMesh || o === wurzel) return;
      for (let q = o; q && q !== wurzel; q = q.parent) if (ausnahmen.has(q)) return;
      const k = `${o.material.uuid}|${o.castShadow}|${o.receiveShadow}|${o.renderOrder}`;
      if (!toepfe.has(k)) toepfe.set(k, []);
      toepfe.get(k).push(o);
    });
    for (const liste of toepfe.values()) {
      if (liste.length < 2) continue;
      const geo = vereine(liste.map(o => gelegt(o.geometry, new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld))));
      const v = liste[0], neu = new THREE.Mesh(geo, v.material);
      neu.castShadow = v.castShadow; neu.receiveShadow = v.receiveShadow; neu.renderOrder = v.renderOrder;
      for (const o of liste) o.parent.remove(o);
      wurzel.add(neu);
    }
    // leere Gruppen entfernen
    const leer = []; wurzel.traverse(o => { if (o !== wurzel && o.isGroup && o.children.length === 0 && !ausnahmen.has(o)) leer.push(o); });
    for (const o of leer) o.parent.remove(o);
  }
  verschmelze(gruppe, new Set([rotor, rahmen, ...radiatoren]));
  verschmelze(rotor, new Set());
  aktualisiere(0, {});

  return { gruppe, radius: 1, anker: new THREE.Vector3(0, 1.1, 0), aktualisiere };
}
