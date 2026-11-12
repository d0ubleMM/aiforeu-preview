/* AIFOREU · Flug · Flieger
   Das AIFOREU-Zeichen als Nurflügler. Kontur exakt nach aiforeu-mark.svg:
   x = (px-128)/108, z = (88-py)/108; Nase bei +Z, Spitzen bei x = ±1, Kreis (0,0) mit r = 24/108 ist die Kanzel.
   Haut aus Rippen quer zur Flugrichtung (Flügelprofil je x-Schnitt); Sägezahn-Hinterkante scharf. */

export default function erstelle(THREE, k) {
  const F = k.farben, hoch = k.qualitaet !== 'niedrig';
  const gruppe = new THREE.Group(); gruppe.name = 'Flieger';
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const klemm = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const glatt = (a, b, v) => { const t = klemm((v - a) / (b - a)); return t * t * (3 - 2 * t); };

  /* ---------- Kontur (ax = |x|) ---------- */
  const P = (px, py) => [(px - 128) / 108, (88 - py) / 108];
  const NASE = P(128, 24)[1];
  const HK = [P(128, 116), P(176, 148), P(200, 128), P(236, 148)];   // Hinterkante, ax aufsteigend
  const SPZ = HK[3][1], KR = 24 / 108, LE_STEIG = SPZ - NASE;
  const vorder = ax => NASE + LE_STEIG * ax;
  const hinter = ax => {
    for (let i = 0; i < 3; i++) { const [a0, z0] = HK[i], [a1, z1] = HK[i + 1]; if (ax <= a1 + 1e-9) return z0 + (z1 - z0) * (ax - a0) / (a1 - a0); }
    return SPZ;
  };
  const tiefe = ax => Math.max(0, vorder(ax) - hinter(ax));
  const ZMIN = -0.58, ZMAX = 0.61;

  /* ---------- Profil und Dicke ---------- */
  const smin = (a, b, w) => { const h = Math.max(w - Math.abs(a - b), 0) / w; return Math.min(a, b) - h * h * w / 4; };
  const rumpf = ax => Math.exp(-((ax / 0.33) ** 4));                       // Anteil Mittelkörper
  const dickeFl = ax => smin(0.0065 + 0.030 * (1 - ax), 0.105 * tiefe(ax), 0.006);
  const D0 = dickeFl(0);
  const dickeO = ax => 0.62 * dickeFl(ax) + (0.086 - 0.62 * D0) * rumpf(ax);   // Mittelkörper deutlich gewölbt (Nurflügler mit Rumpf)
  const dickeU = ax => 0.38 * dickeFl(ax) + (0.044 - 0.38 * D0) * Math.exp(-((ax / 0.36) ** 4));
  const maxO = ax => 0.30 + 0.24 * rumpf(ax), maxU = ax => 0.33 + 0.10 * rumpf(ax);
  // vorn Ellipse (runde Nase), hinten Hermite-Abfall mit endlichem Keilwinkel
  const profil = (u, m, g) => {
    if (u <= m) { const w = 1 - u / m; return Math.sqrt(Math.max(0, 1 - w * w)); }
    const s = (u - m) / (1 - m); return 1 - (3 - g) * s * s + (2 - g) * s * s * s;
  };
  const hkDicke = ax => 0.0016 * Math.min(1, tiefe(ax) / 0.12);          // halbe Hinterkantendicke (Fase)
  // Mittelstreifen hinten voller (Rücken läuft bis kurz vor die Kerbe), damit die Kanzel hinten auf Rumpf sitzt
  const voll = (u, m) => u <= m ? profil(u, m, 1) : 1 - Math.pow((u - m) / (1 - m), 5);
  const yO = (ax, u) => { const m = maxO(ax), p = profil(u, m, 1.25), w = Math.exp(-((ax / 0.08) ** 2)); return dickeO(ax) * (p + (voll(u, m) - p) * w) + hkDicke(ax) * u; };
  const yU = (ax, u) => -(dickeU(ax) * profil(u, maxU(ax), 1.1) + hkDicke(ax) * u);
  const uVon = (ax, z) => { const c = tiefe(ax); return c < 1e-7 ? 0 : klemm((vorder(ax) - z) / c); };
  /* Kanzelsockel: Rahmen liegt in einer Ebene (fällt nach hinten leicht ab), die Haut wird im Ring darum
     sanft auf diese Ebene gezogen; zur Hinterkante hin klingt das aus, damit die Kerbe scharf bleibt.
     Unter dem Glas sinkt die Haut ab (Wanne, vom Innenraum verdeckt). */
  const KA = 0.064, KB = 0.08, ebene = z => KA + KB * z, KRG = KR - 0.005;
  // Hinterkante mit weich gerundeter Mittelkerbe (nur für das Ausklingen; liegt nie hinter der echten Kante)
  const HKS = (HK[1][1] - HK[0][1]) / HK[1][0], hinterWeich = ax => HK[0][1] + HKS * (Math.hypot(ax, 0.05) - 0.05);
  const oberseite = (x, z) => {
    const ax = Math.abs(x), roh = yO(ax, uVon(ax, z)), r = Math.hypot(x, z);
    if (r > KR + 0.11) return roh;
    const w = 0.07 + 0.04 * klemm(z / Math.max(r, 1e-6));          // vorn weiter auslaufend als seitlich/hinten
    const g = 1 - glatt(KR + 0.014, KR + w, r), te = ax < HK[1][0] ? glatt(0, 0.034, z - hinterWeich(ax)) : 1;
    return roh + (ebene(z) - roh) * g * te - 0.024 * glatt(KR - 0.03, KR - 0.07, r);
  };
  const unterseite = (x, z) => yU(Math.abs(x), uVon(Math.abs(x), z));

  /* ---------- Hilfen ---------- */
  // Gitterfläche aus Zeilen von Punkten; dreht die Wicklung, falls die Normale nicht zu 'aussen' zeigt
  function flaeche(zeilen, { zu = false, aussen = null, uv = null } = {}) {
    const R = zeilen.length, C = zeilen[0].length, pos = [], uvs = [], idx = [];
    for (const z of zeilen) for (const p of z) { pos.push(p.x, p.y, p.z); if (uv) uvs.push(...uv(p)); }
    const cMax = zu ? C : C - 1;
    for (let i = 0; i < R - 1; i++) for (let j = 0; j < cMax; j++) {
      const j1 = (j + 1) % C, a = i * C + j, b = (i + 1) * C + j, c = (i + 1) * C + j1, d = i * C + j1;
      idx.push(a, d, b, d, c, b);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    if (uv) geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geo.setIndex(idx);
    if (aussen) {
      const pa = V(), pb = V(), pc = V(), n = V(), e1 = V(), e2 = V();
      let summe = 0;
      for (let t = 0; t < idx.length; t += 3) {
        pa.fromArray(pos, idx[t] * 3); pb.fromArray(pos, idx[t + 1] * 3); pc.fromArray(pos, idx[t + 2] * 3);
        n.crossVectors(e1.subVectors(pb, pa), e2.subVectors(pc, pa));
        summe += n.dot(typeof aussen === 'function' ? aussen(pa) : aussen);
      }
      if (summe < 0) { for (let t = 0; t < idx.length; t += 3) { const h = idx[t + 1]; idx[t + 1] = idx[t + 2]; idx[t + 2] = h; } geo.setIndex(idx); }
    }
    geo.computeVertexNormals();
    return geo;
  }
  const schatten = (m, wirft = true, nimmt = true) => { m.castShadow = wirft; m.receiveShadow = nimmt; return m; };

  /* ---------- Lage der Triebwerksgondeln (rechte Seite; s längs 0..1, l quer -1..1) und Formationslichter ---------- */
  const XC = 0.33, WF = 0.082, WM = 0.076, WR = 0.064, Z0 = -0.09, HKA = 0.07;
  const zVorn = l => Z0 + LE_STEIG * Math.abs(l) * WF;                     // Pfeil-Lippe, Flanken parallel zur Vorderkante
  const zHinten = ax => hinter(ax) + HKA;                                   // Auslass parallel zur Hinterkante
  const breite = s => { s = klemm(s); return WF + (WR - WF) * s + (WM - (WF + WR) / 2) * 4 * s * (1 - s); };
  const gondelZ = (s, l) => { const x = XC + l * breite(s), zf = zVorn(l); return zf + s * (zHinten(x) - zf); };
  const FORMATION = [[0.10, 0.17], [0.40, 0.48], [0.70, 0.78]], FD = 0.05;   // ax-Bereiche, Abstand zur Vorderkante

  /* ---------- Texturen: Fugen, Felder, hellere Vorderkante (Canvas, Halbspannweite gespiegelt) ---------- */
  // [Farbe, Rauheit, Metall, Höhe]; Graphit mit Metallanteil, Felder leicht verschieden
  const STIL = {
    grund: ['#3a424d', .46, .58, .5], feld1: ['#414a56', .40, .62, .5], feld2: ['#333b45', .55, .50, .5],
    ruder: ['#434c58', .38, .64, .5], vk: ['#5f6a78', .30, .72, .5], deck: ['#5c6066', .62, .2, .5],
    naht: ['#4e5763', .40, .56, .54], fuge: ['#161a20', .72, .30, .12], leiste: ['#1a1e24', .5, .4, .56],
    gondel: ['#3d4651', .42, .60, .5], kabine: ['#06080b', .8, 0, .5], schlund: ['#040506', .9, 0, .3],
  };
  function muster(g, S, schicht, unten) {
    const X = a => a * S, Y = z => (ZMAX - z) / (ZMAX - ZMIN) * S, lw = S / 1024;
    const col = st => { const s = STIL[st]; if (schicht === 'farbe') return s[0]; if (schicht === 'orm') return `rgb(255,${Math.round(s[1] * 255)},${Math.round(s[2] * 255)})`; const v = Math.round(s[3] * 255); return `rgb(${v},${v},${v})`; };
    const weg = pts => { g.beginPath(); pts.forEach(([a, z], i) => i ? g.lineTo(X(a), Y(z)) : g.moveTo(X(a), Y(z))); };
    const fuell = (pts, st) => { weg(pts); g.closePath(); g.fillStyle = col(st); g.fill(); };
    const strich = (pts, st, b = 1.6) => { weg(pts); g.strokeStyle = col(st); g.lineWidth = b * lw; g.lineJoin = 'miter'; g.stroke(); };
    const fuge = (pts, naht = false) => { if (naht) strich(pts, 'naht', 5); strich(pts, 'fuge'); };
    const vkL = (d, a0 = 0, a1 = 1.05) => [[a0, vorder(a0) - d], [a1, vorder(a1) - d]];
    const hkL = e => HK.map(([a, z]) => [a, z + e]);
    const raute = (a0, z0, w, st = null) => { const h = -LE_STEIG * w; const p = [[a0, z0 + h], [a0 + w, z0], [a0, z0 - h], [a0 - w, z0]]; if (st) fuell(p, st); weg(p); g.closePath(); g.strokeStyle = col('fuge'); g.lineWidth = 1.5 * lw; g.stroke(); };
    const ellipse = (r, st, b) => { g.beginPath(); g.ellipse(X(0), Y(0), r * S, r * S / (ZMAX - ZMIN), 0, 0, Math.PI * 2); g.strokeStyle = col(st); g.lineWidth = b * lw; g.stroke(); };

    g.fillStyle = col('grund'); g.fillRect(0, 0, S, S);
    // hellere Vorderkante (auch etwas außerhalb, damit Mip-Stufen sauber bleiben)
    fuell([...vkL(-0.06), ...vkL(0.024).reverse()], 'vk');
    g.save(); weg([[-0.01, NASE + 0.01], [1.01, SPZ], HK[2], HK[1], [-0.01, HK[0][1]]]); g.closePath(); g.clip();
    fuell([...vkL(0.024), ...vkL(-0.06).reverse()], 'vk');
    // große Felder zwischen Holmlinien, parallel zur Vorderkante
    fuell([...vkL(0.024), ...vkL(0.105).reverse()], 'feld1');
    fuell([...vkL(0.23), ...vkL(0.37).reverse()], 'feld2');
    fuell([...vkL(0.37), ...vkL(0.62).reverse()], 'feld1');
    // Ruderflächen entlang der Hinterkante
    fuell([...hkL(0.058), ...hkL(-0.2).reverse()], 'ruder');
    if (!unten) {
      // helle Keramik-Decks hinter den Auslässen
      const a0 = XC - WR - 0.004, a1 = XC + WR + 0.006;
      fuell([[a0, zHinten(a0) + 0.006], [a1, zHinten(a1) + 0.006], [a1 + 0.012, hinter(a1 + 0.012) - 0.05], [a0 - 0.006, hinter(a0 - 0.006) - 0.05]], 'deck');
    }
    // Nähte und Fugen
    fuge(vkL(0.024), true); fuge(vkL(0.105), true); fuge(vkL(0.23), true); fuge(vkL(0.37)); fuge(vkL(0.62));
    fuge(hkL(0.058), true);
    // Trennfugen der Ruder, in Flugrichtung
    for (const a of [0.15, 0.30, 0.4444, 0.56, 0.6667, 0.78, 0.89]) { const z = hinter(a); fuge([[a, z + 0.058], [a, z - 0.02]]); }
    // zweite Linie: gespaltenes Seitenruder außen
    if (!unten) fuge([[0.78, hinter(0.78) + 0.032], [0.95, hinter(0.95) + 0.032]].map(([a, z]) => [a, Math.min(z, vorder(a) - 0.01)]));
    // Felder quer (gespiegelte Pfeilung), ergibt Rauten-Paneele
    for (const [a, z] of [[0.62, -0.26], [0.80, -0.40]]) {
      let t = 0; while (t < 1 && z + t * 0.12 * LE_STEIG > hinter(a - t * 0.12) + 0.058) t += 0.01;   // endet an der Ruderfuge
      fuge([[a, z], [a - t * 0.12, z + t * 0.12 * LE_STEIG]]);
    }
    if (!unten) {
      // Gondelflächen sauber (Linien darunter überdecken), eigene Nähte
      const fp = [];
      for (let i = 0; i <= 10; i++) { const s = i / 10; fp.push([XC + breite(s) * 0.92, gondelZ(s, 0.92)]); }
      for (let i = 10; i >= 0; i--) { const s = i / 10; fp.push([XC - breite(s) * 0.92, gondelZ(s, -0.92)]); }
      fp.push([XC, zVorn(0) + 0.004]);
      fuell(fp, 'gondel');
      // Schlund unter der Einlauflippe (von oben als dunkler Pfeil lesbar) und Schattenfuge hinter dem Auslass
      const pfeil = (s0, s1, st, b = 0.86) => { const p = []; for (let i = 0; i <= 8; i++) { const l = -b + 2 * b * i / 8; p.push([XC + l * breite(s0), gondelZ(s0, l)]); } for (let i = 8; i >= 0; i--) { const l = -b + 2 * b * i / 8; p.push([XC + l * breite(s1), gondelZ(s1, l)]); } fuell(p, st); };
      pfeil(-0.03, 0.05, 'schlund', 0.8);
      pfeil(0.975, 1.03, 'schlund', 0.8);
      fuge([[XC, zVorn(0) - 0.035], [XC, zHinten(XC) + 0.012]]);
      for (const s of [0.36, 0.68]) fuge([[XC - breite(s) * 0.7, gondelZ(s, -0.7)], [XC, gondelZ(s, 0)], [XC + breite(s) * 0.7, gondelZ(s, 0.7)]]);
      // Kanzelrahmen-Platte, Mittelnaht vor der Kanzel
      ellipse(KR + 0.045, 'naht', 5); ellipse(KR + 0.045, 'fuge', 1.6);
      fuge([[0.0015, NASE - 0.025], [0.0015, KR + 0.045]]);
      // Wartungsklappen (Rauten, entlang der Vorderkanten-Pfeilung)
      raute(0, 0.36, 0.022, 'feld2'); raute(0.36, 0.12, 0.018); raute(0.50, -0.02, 0.024, 'feld2'); raute(0.585, -0.13, 0.014);
      raute(0.72, -0.285, 0.013); raute(0.84, -0.41, 0.009); raute(0.12, -0.262, 0.011); raute(0.11, 0.22, 0.012);
      // unter dem Glas: dunkle Kabine
      g.beginPath(); g.ellipse(X(0), Y(0), KR * S, KR * S / (ZMAX - ZMIN), 0, 0, Math.PI * 2); g.fillStyle = col('kabine'); g.fill();
      // Fassungen der Formationslichter
      for (const [a0, a1] of FORMATION) fuell([[a0 - 0.004, vorder(a0 - 0.004) - FD + 0.0065], [a1 + 0.004, vorder(a1 + 0.004) - FD + 0.0065], [a1 + 0.004, vorder(a1 + 0.004) - FD - 0.0065], [a0 - 0.004, vorder(a0 - 0.004) - FD - 0.0065]], 'leiste');
      // feine Sondenpunkte an der Nase
      g.fillStyle = col('fuge'); for (const [a, z] of [[0.05, 0.47], [0.07, 0.44]]) { g.beginPath(); g.arc(X(a), Y(z), 2.2 * lw, 0, Math.PI * 2); g.fill(); }
    } else {
      // Unterseite: Waffenschacht, Fahrwerksklappen (Sägezahn), Bugfahrwerk
      // Klappen mit Sägezahn-Enden; Zahnflanken parallel zur Vorderkante
      const tuer = (a0, a1, z0, z1, zack = 2) => {
        const vorn = [], hinten = [], tief = -LE_STEIG * (a1 - a0) / (zack * 2);
        for (let i = 0; i <= zack * 2; i++) { const a = a0 + (a1 - a0) * i / (zack * 2), h = (i % 2) * tief; vorn.push([a, z1 - h]); hinten.push([a, z0 - h]); }
        const p = [...vorn, ...hinten.reverse()]; fuell(p, 'feld2'); weg(p); g.closePath(); g.strokeStyle = col('naht'); g.lineWidth = 5 * lw; g.stroke(); g.strokeStyle = col('fuge'); g.lineWidth = 1.6 * lw; g.stroke();
      };
      tuer(0.012, 0.128, -0.12, 0.22, 2); fuge([[0.07, 0.19], [0.07, -0.12]]);
      tuer(0.25, 0.34, -0.07, 0.11, 2); fuge([[0.295, 0.09], [0.295, -0.07]]);
      tuer(0.0, 0.028, 0.30, 0.43, 1);
      raute(0.42, -0.08, 0.016); raute(0.58, -0.2, 0.012);
    }
    g.restore();
  }
  function texturen(unten, S) {
    const mk = () => { const c = document.createElement('canvas'); c.width = c.height = S; return c; };
    const farbe = mk(), orm = mk(), hoehe = mk();
    muster(farbe.getContext('2d'), S, 'farbe', unten); muster(orm.getContext('2d'), S, 'orm', unten);
    const gh = hoehe.getContext('2d'); try { gh.filter = `blur(${(S / 1024 * 0.7).toFixed(2)}px)`; } catch (e) { /* ohne Weichzeichner */ }
    muster(gh, S, 'hoehe', unten);
    // Normalenkarte aus der Höhe
    const h = gh.getImageData(0, 0, S, S).data, nk = mk(), nx = nk.getContext('2d'), out = nx.createImageData(S, S), o = out.data, st = 2.2;
    const H = (i, j) => h[(klemm(j, 0, S - 1) * S + klemm(i, 0, S - 1)) * 4] / 255;
    for (let j = 0; j < S; j++) for (let i = 0; i < S; i++) {
      const du = (H(i + 1, j) - H(i - 1, j)) * 0.5 * st, dv = -(H(i, j + 1) - H(i, j - 1)) * 0.5 * st;
      const l = Math.hypot(du, dv, 1), p = (j * S + i) * 4;
      o[p] = (-du / l * 0.5 + 0.5) * 255; o[p + 1] = (-dv / l * 0.5 + 0.5) * 255; o[p + 2] = (1 / l * 0.5 + 0.5) * 255; o[p + 3] = 255;
    }
    nx.putImageData(out, 0, 0);
    const tex = (c, srgb) => { const t = new THREE.CanvasTexture(c); t.anisotropy = 8; if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; return t; };
    return { farbe: tex(farbe, true), orm: tex(orm), normal: tex(nk) };
  }
  const TO = texturen(false, hoch ? 1024 : 512), TU = texturen(true, hoch ? 512 : 256);
  const haut = (T, cc) => new THREE.MeshPhysicalMaterial({
    color: '#ffffff', map: T.farbe, roughness: 1, metalness: 1, roughnessMap: T.orm, metalnessMap: T.orm,
    normalMap: T.normal, normalScale: new THREE.Vector2(0.7, 0.7), clearcoat: cc, clearcoatRoughness: 0.08,
    clearcoatNormalMap: T.normal, clearcoatNormalScale: new THREE.Vector2(0.35, 0.35), envMapIntensity: 2.0,
  });
  const matOben = haut(TO, 1), matUnten = haut(TU, 0.7);
  const uvPlan = p => [Math.abs(p.x), (p.z - ZMIN) / (ZMAX - ZMIN)];

  /* ---------- Rumpf: Rippen (x-Schnitte) mit Profil, Haut dazwischen ---------- */
  // Rippen: zur Mitte dichter (Kanzelsockel, Kerbe), außen gleichmäßig
  const seg = hoch ? [24, 12, 13] : [15, 8, 10], kn = [0, HK[1][0], HK[2][0], 1];
  const axs = [0]; for (let s = 0; s < 3; s++) for (let i = 1; i <= seg[s]; i++) { const f = i / seg[s]; axs.push(kn[s] + (kn[s + 1] - kn[s]) * (s === 0 ? Math.pow(f, 1.3) : f)); }
  const xs = [...axs.slice(1).reverse().map(a => -a), ...axs];
  // Sehnenteilung: dicht an Nase und Hinterkante (runde Nase, steiler Sockelabfall zur Kerbe)
  const N = hoch ? 40 : 24, us = []; for (let i = 0; i <= N; i++) us.push(0.5 - 0.5 * Math.cos(Math.PI * i / N));
  const ring = []; for (let j = 0; j <= 2 * N; j++) ring.push(j <= N ? [us[N - j], true] : [us[j - N], false]);
  {
    const R = ring.length, pos = [], uvs = [], idxO = [], idxU = [];
    for (const x of xs) {
      const ax = Math.abs(x), le = vorder(ax), c = tiefe(ax);
      for (const [u, oben] of ring) { const z = le - u * c, y = oben ? oberseite(x, z) : yU(ax, u); pos.push(x, y, z); uvs.push(ax, (z - ZMIN) / (ZMAX - ZMIN)); }
    }
    for (let i = 0; i < xs.length - 1; i++) for (let j = 0; j < R - 1; j++) {
      const a = i * R + j, b = (i + 1) * R + j, c = (i + 1) * R + j + 1, d = i * R + j + 1;
      (j < N ? idxO : idxU).push(a, d, b, d, c, b);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geo.setIndex([...idxO, ...idxU]); geo.addGroup(0, idxO.length, 0); geo.addGroup(idxO.length, idxU.length, 1);
    geo.computeVertexNormals();
    const n = geo.attributes.normal; for (let i = 0; i < n.count; i++) if (n.getX(i) ** 2 + n.getY(i) ** 2 + n.getZ(i) ** 2 < 0.5) n.setXYZ(i, 0, (i % R) < N ? 1 : -1, 0);
    gruppe.add(schatten(new THREE.Mesh(geo, [matOben, matUnten]), true, false));
  }
  // schmale Hinterkantenfläche (fängt Licht als feine Linie)
  {
    const pos = [], nor = [];
    for (let i = 0; i < xs.length - 1; i++) {
      const x0 = xs[i], x1 = xs[i + 1], a0 = Math.abs(x0), a1 = Math.abs(x1);
      const p = [V(x0, yO(a0, 1), hinter(a0)), V(x1, yO(a1, 1), hinter(a1)), V(x1, yU(a1, 1), hinter(a1)), V(x0, yU(a0, 1), hinter(a0))];
      const n = V().crossVectors(V().subVectors(p[1], p[0]), V(0, 1, 0)).normalize(); if (n.z > 0) n.negate();
      for (const q of [p[0], p[3], p[1], p[1], p[3], p[2]]) { pos.push(q.x, q.y, q.z); nor.push(n.x, n.y, n.z); }
    }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    gruppe.add(new THREE.Mesh(geo, new THREE.MeshPhysicalMaterial({ color: new THREE.Color(F.stahl).lerp(new THREE.Color(F.kante), 0.45), metalness: 0.9, roughness: 0.3, envMapIntensity: 1.5, side: THREE.DoubleSide })));
  }

  /* ---------- Kanzel: getönte Glaskuppel auf planarem Rahmen, darunter eine flache Wanne mit Innenleben ---------- */
  const nT = hoch ? 80 : 48, nR = hoch ? 12 : 7;
  const KH = 0.06, GB = 0.004;                                   // Kuppelhöhe, Glasrand über der Rahmenebene
  const glasY = (z, s) => ebene(z) + GB + KH * Math.pow(Math.max(0, 1 - s * s), 0.55);
  let innenMat;
  {
    const zeilen = [];
    for (let r = 0; r <= nR; r++) {
      const s = Math.sin(Math.PI / 2 * r / nR), zeile = [];
      for (let t = 0; t < nT; t++) { const w = t / nT * Math.PI * 2, x = KRG * s * Math.cos(w), z = KRG * s * Math.sin(w); zeile.push(V(x, glasY(z, s), z)); }
      zeilen.push(zeile);
    }
    // eigene Spiegelumgebung nur fürs Glas (Lichtrichtungen wie in der Szene): Zenit dunkel, damit die Kuppel
    // von oben ein dunkler Kreis bleibt; Sonne, Gegenlicht und eine schmale Horizontlinie geben scharfe Glanzkanten
    const ec = document.createElement('canvas'); ec.width = 1024; ec.height = 512; const e = ec.getContext('2d');
    const EW = 1024, EH = 512, eq = (az, el) => [(Math.atan2(Math.sin(az), Math.cos(az)) / (2 * Math.PI) + 0.5) * EW, (0.5 - el / Math.PI) * EH];
    { const himmel = e.createLinearGradient(0, 0, 0, EH); himmel.addColorStop(0, '#3a4659'); himmel.addColorStop(0.18, '#222b39'); himmel.addColorStop(0.36, '#0f141c'); himmel.addColorStop(0.5, '#06080c'); himmel.addColorStop(1, '#020305'); e.fillStyle = himmel; e.fillRect(0, 0, EW, EH); }   // Zenit gedämpft hell: die Kuppel liest sich von oben als gewölbtes Glas, nicht als Loch
    const hz = e.createLinearGradient(0, 0, 0, EH);
    hz.addColorStop(0, 'rgba(0,0,0,0)'); hz.addColorStop(0.2, 'rgba(10,13,18,.6)'); hz.addColorStop(0.44, 'rgba(34,44,60,.75)');
    hz.addColorStop(0.5, 'rgba(58,72,92,.8)'); hz.addColorStop(0.53, 'rgba(8,10,14,.6)'); hz.addColorStop(1, 'rgba(0,0,0,0)');
    e.fillStyle = hz; e.fillRect(0, 0, EW, EH);
    // Horizontlinie in Abschnitten verschiedener Helligkeit: wandert und bricht auf, wenn der Flieger giert
    for (let i = 0; i < 64; i++) {
      const az = (i / 64 - 0.5) * 2 * Math.PI, sonne = Math.max(0, Math.cos(az - Math.atan2(10, 18))), gegen = Math.max(0, Math.cos(az - Math.atan2(-14, -20)));
      const a = 0.08 + 0.6 * Math.pow(sonne, 3) + 0.3 * Math.pow(gegen, 4) + 0.16 * (0.5 + 0.5 * Math.sin(az * 5 + 1.3));
      const x0 = i / 64 * EW, hl = e.createLinearGradient(0, EH / 2 - 8, 0, EH / 2 + 3);
      hl.addColorStop(0, 'rgba(200,214,234,0)'); hl.addColorStop(0.6, `rgba(225,234,246,${Math.min(1, a).toFixed(3)})`); hl.addColorStop(1, 'rgba(200,214,234,0)');
      e.fillStyle = hl; e.fillRect(x0, EH / 2 - 8, EW / 64 + 1, 11);
    }
    const fleck = (az, el, rx, ry, farbe) => { const [x, y] = eq(az, el); for (const dx of [-EW, 0, EW]) { const v = e.createRadialGradient(x + dx, y, 0, x + dx, y, rx); v.addColorStop(0, farbe); v.addColorStop(1, 'rgba(0,0,0,0)'); e.save(); e.translate(x + dx, y); e.scale(1, ry / rx); e.translate(-x - dx, -y); e.fillStyle = v; e.fillRect(x + dx - rx, y - rx, rx * 2, rx * 2); e.restore(); } };
    // Lichtleiste schräg oben (wie eine Station in der Nähe): langer, scharfer Streifen, gibt die Glanzbahn auf der Kuppel
    const leiste = (az0, az1, el, h, a) => { const [x0, y] = eq(az0, el), [x1] = eq(az1, el); const v = e.createLinearGradient(0, y - h, 0, y + h); v.addColorStop(0, 'rgba(230,236,245,0)'); v.addColorStop(0.5, `rgba(235,240,248,${a})`); v.addColorStop(1, 'rgba(230,236,245,0)'); e.fillStyle = v; e.fillRect(Math.min(x0, x1), y - h, Math.abs(x1 - x0), 2 * h); };
    leiste(-2.6, -0.9, 0.62, 7, 0.75);
    leiste(1.2, 2.3, 0.5, 5, 0.45);
    fleck(Math.atan2(10, 18), 0.2, 260, 90, 'rgba(120,104,90,.55)');     // warmer Himmelsschein unter der Sonne
    fleck(Math.atan2(10, 18), 0.41, 120, 60, 'rgba(255,214,170,.9)');    // Sonne, Hof
    fleck(Math.atan2(10, 18), 0.41, 26, 18, 'rgba(255,252,246,1)');      // Sonnenkern
    fleck(Math.atan2(-14, -20), -0.05, 220, 56, 'rgba(159,183,217,.75)'); // kühles Gegenlicht
    const glasUmgebung = new THREE.CanvasTexture(ec); glasUmgebung.mapping = THREE.EquirectangularReflectionMapping; glasUmgebung.colorSpace = THREE.SRGBColorSpace;
    // goldbedampftes Kanzelglas (wie bei echten Tarnkappenfliegern): spiegelt warm, Innenraum nur schwach dahinter
    const glas = new THREE.MeshPhysicalMaterial({ color: '#c99556', metalness: 1, roughness: 0.06, clearcoat: 1, clearcoatRoughness: 0.03, envMap: glasUmgebung, envMapIntensity: 2.4, transparent: true, opacity: 0.93 });
    const glasGeo = flaeche(zeilen, { zu: true, aussen: V(0, 1, 0) });
    { const n = glasGeo.attributes.normal, pol = V(0, 1, -KB).normalize(); for (let t = 0; t < nT; t++) n.setXYZ(t, pol.x, pol.y, pol.z); }   // Pol: eine Normale, kein Knick im Glanz
    const glasMesh = new THREE.Mesh(glasGeo, glas); glasMesh.renderOrder = 2;
    gruppe.add(schatten(glasMesh, false, false));   // Schatten wären bei der Kartenauflösung nur Treppen

    // Innenleben (von oben, Nase = oben im Bild): Wanne, zwei Sitze nebeneinander, Konsole mit gedämpften Anzeigen
    const S2 = hoch ? 512 : 256, ic = document.createElement('canvas'); ic.width = ic.height = S2; const g = ic.getContext('2d');
    const cx = S2 / 2, sk = S2 / 2 / KRG, CX = x => cx + x * sk, CY = z => cx - z * sk, L = v => v * KRG * sk;
    const wv = g.createRadialGradient(cx, cx, 0, cx, cx, cx); wv.addColorStop(0, '#07090c'); wv.addColorStop(0.8, '#05070a'); wv.addColorStop(1, '#0b0e12');
    g.fillStyle = wv; g.fillRect(0, 0, S2, S2);
    const bogen = (r0, r1, w0, w1, farbe) => { g.beginPath(); g.arc(cx, cx, L(r1), -w1, -w0); g.arc(cx, cx, L(r0), -w0, -w1, true); g.closePath(); g.fillStyle = farbe; g.fill(); };
    const rr = (x, z, w, h, r, farbe) => { g.fillStyle = farbe; g.beginPath(); g.roundRect(CX(x * KRG) - L(w) / 2, CY(z * KRG) - L(h) / 2, L(w), L(h), L(r)); g.fill(); };
    // Instrumententafel: gerader Balken quer vor den Sitzen, Anzeigen unterschiedlich breit, warm gedimmt
    rr(0, 0.5, 1.3, 0.2, 0.03, '#0d1015'); rr(0, 0.405, 1.26, 0.018, 0.005, '#161a20');
    for (const [x, b, a, kuehl] of [[-0.47, 0.22, 0.2, 0], [-0.2, 0.24, 0.3, 0], [0.02, 0.1, 0.16, 1], [0.22, 0.22, 0.28, 0], [0.47, 0.16, 0.18, 0]]) rr(x, 0.5, b, 0.11, 0.008, kuehl ? `rgba(170,190,215,${a})` : `rgba(255,170,112,${a})`);
    // Sitze mit Kopfstützen (Kopf zum Heck), Mittelkonsole
    for (const sx of [-0.3, 0.3]) { rr(sx, 0.08, 0.26, 0.36, 0.06, '#0e1217'); rr(sx, -0.13, 0.17, 0.09, 0.03, '#141920'); rr(sx, 0.12, 0.18, 0.2, 0.04, '#0a0d11'); }
    rr(0, 0.05, 0.1, 0.42, 0.02, '#0b0e12');
    // Rückwand mit feinem Lichtband
    bogen(0.66, 0.8, -Math.PI / 2 - 0.9, -Math.PI / 2 + 0.9, '#0c0f13');
    bogen(0.705, 0.715, -Math.PI / 2 - 0.7, -Math.PI / 2 + 0.7, 'rgba(255,200,150,.16)');
    const itex = new THREE.CanvasTexture(ic); itex.colorSpace = THREE.SRGBColorSpace; itex.anisotropy = 4;
    // Wanne: flacher Boden, Rand steigt bis knapp unter den Glasrand (Tiefe hinter dem Glas)
    const izeilen = [], nI = hoch ? 10 : 6, nIT = nT / 2;
    for (let r = 0; r <= nI; r++) { const s = Math.sin(Math.PI / 2 * r / nI), zeile = []; for (let t = 0; t < nIT; t++) { const w = t / nIT * Math.PI * 2, x = KRG * s * Math.cos(w), z = KRG * s * Math.sin(w); zeile.push(V(x, ebene(z) - 0.011 + 0.0145 * glatt(0.6, 0.97, s), z)); } izeilen.push(zeile); }
    innenMat = new THREE.MeshBasicMaterial({ map: itex, color: '#ffffff' });
    gruppe.add(new THREE.Mesh(flaeche(izeilen, { zu: true, aussen: V(0, 1, 0), uv: p => [0.5 + p.x / (2 * KRG), 0.5 + p.z / (2 * KRG)] }), innenMat));

    // Rahmen: schmale gefräste Fassung, Krone planar, Fasen innen und außen, Flansch läuft auf die Haut aus
    // [dr zu KR, dy zur Ebene] oder [dr, null, Versatz zur Haut]
    const prof = [[KRG - KR - 0.0002, GB - 0.002], [KRG - KR - 0.0002, 0.0058], [-0.0044, 0.0068], [0.0028, 0.0068], [0.0038, 0.0058], [0.0074, null, 0.0012], [0.0094, null, -0.0040]];
    const rz = [];
    for (const [dr, dy, ver] of prof) {
      const zeile = [];
      for (let t = 0; t < nT; t++) { const w = t / nT * Math.PI * 2, r = KR + dr, x = r * Math.cos(w), z = r * Math.sin(w); zeile.push(V(x, dy === null ? oberseite(x, z) + ver : ebene(z) + dy, z)); }
      rz.push(zeile);
    }
    const rahmen = new THREE.MeshPhysicalMaterial({ color: '#7d8896', metalness: 1, roughness: 0.3, clearcoat: 0.5, clearcoatRoughness: 0.12 });
    // jedes Band eigenes Netz: rundherum glatt, an den Fasen harte Kanten
    for (let i = 0; i < rz.length - 1; i++) {
      const aussen = i === 0 ? (p => V(-p.x, 0, -p.z)) : V(0, 1, 0);
      gruppe.add(schatten(new THREE.Mesh(flaeche([rz[i], rz[i + 1]], { zu: true, aussen }), rahmen), false, false));
    }
  }

  /* ---------- Triebwerksgondeln mit Pfeil-Einlauf und flachem, glühendem Auslass ---------- */
  // Höhe längs: Lippe vorn, flacher Scheitel, zum Auslass niedriger (flacher Buckel, das Zeichen bleibt vorn)
  const hoeheG = s => 0.0098 + 0.0016 * Math.sin(Math.PI / 2 * klemm(s / 0.25)) - 0.0040 * glatt(0.25, 1, s);
  // Querschnitt: schmales Deck, flache Seitenfacetten, weite Rundungen an Schulter und Kehle (läuft in die Haut aus)
  const facette = (t, a) => { if (t <= 0) return 0; if (t >= 1) return 1; const k = 1 / (1 - a); return t < a ? k * t * t / (2 * a) : t > 1 - a ? 1 - k * (1 - t) ** 2 / (2 * a) : k * (t - a / 2); };
  const glocke = l => (1 - facette((Math.abs(l) - 0.34) / 0.66, 0.44)) * (1 - 0.05 * l * l) - 0.04;
  const gp = (sg, s, l, f) => { const x = XC + l * breite(s), z = gondelZ(s, l); return V(sg * x, oberseite(x, z) + f * hoeheG(klemm(s)) * glocke(l), z); };
  const nl = hoch ? 22 : 12, ls = []; for (let i = 0; i <= nl; i++) ls.push(Math.sin(Math.PI / 2 * (-1 + 2 * i / nl)));
  const sMitte = []; const nsm = hoch ? 16 : 8; for (let i = 0; i <= nsm; i++) sMitte.push(0.03 + 0.945 * i / nsm);
  const ringe = [[0.04, 0.55], [0.008, 0.78], [-0.004, 0.93], [0.012, 1], ...sMitte.map(s => [s, 1]), [0.99, 1], [1.004, 0.93], [0.994, 0.78], [0.965, 0.55]];
  // Auslass: Glut mit feinen dunklen Leitschaufeln (Canvas)
  const glutTex = (() => {
    const c = document.createElement('canvas'); c.width = 256; c.height = 32; const x = c.getContext('2d');
    const q = x.createLinearGradient(0, 0, 256, 0); q.addColorStop(0, '#000'); q.addColorStop(0.12, '#fff'); q.addColorStop(0.88, '#fff'); q.addColorStop(1, '#000');
    x.fillStyle = q; x.fillRect(0, 0, 256, 32);
    x.fillStyle = 'rgba(0,0,0,.72)'; for (let i = 1; i < 8; i++) x.fillRect(i * 32 - 1.5, 0, 3, 32);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  })();
  const glutMat = new THREE.MeshBasicMaterial({ vertexColors: true, color: '#ffffff', map: glutTex });
  const deckMat = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  const schwarz = new THREE.MeshStandardMaterial({ vertexColors: true, color: '#ffffff', roughness: 0.9, metalness: 0, side: THREE.DoubleSide });
  const duesen = [];
  const cHeiss = new THREE.Color(F.sonne), cGlut = new THREE.Color(F.glut), cRand = new THREE.Color(F.orange);
  for (const sg of [1, -1]) {
    const zeilen = ringe.map(([s, f]) => ls.map(l => gp(sg, s, l, f)));
    // Haut der Gondel: Lippe vorn eingerollt, Deck, Lippe hinten eingerollt (Wicklung über die Gesamtsumme nach oben)
    gruppe.add(schatten(new THREE.Mesh(flaeche(zeilen, { uv: uvPlan, aussen: V(0, 1, 0) }), matOben)));
    // Einlauf: dunkle Fläche hinter der Lippe
    const flaecheSchlitz = (s, f, farbe) => {
      const oben = ls.map(l => gp(sg, s, l, f)), unten = ls.map(l => { const p = gp(sg, s, l, 0); p.y = oberseite(p.x, p.z) - 0.0015; return p; });
      const g = flaeche([unten, oben], { aussen: V(0, 0, s < 0.5 ? 1 : -1) });
      const c = [], uv = []; for (let r = 0; r < 2; r++) for (let i = 0; i <= nl; i++) { const q = farbe(r, ls[i]); c.push(q.r, q.g, q.b); uv.push((ls[i] + 1) / 2, r); }
      g.setAttribute('color', new THREE.Float32BufferAttribute(c, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); return g;
    };
    gruppe.add(new THREE.Mesh(flaecheSchlitz(0.04, 0.55, (r, l) => new THREE.Color(0.012, 0.014, 0.017).multiplyScalar(1 - 0.6 * (1 - Math.abs(l)))), schwarz));
    // Auslass: warm glühend, Mitte heiß
    const glut = new THREE.Mesh(flaecheSchlitz(0.965, 0.55, (r, l) => { const m = (1 - l * l) * (0.6 + 0.4 * r); return cRand.clone().lerp(cGlut, klemm(m * 1.4)).lerp(cHeiss, klemm(m * m * 1.3)).multiplyScalar(0.35 + 0.65 * m); }), glutMat);
    gruppe.add(glut);
    // Glut auf dem Keramik-Deck bis zur Hinterkante
    const dz = [];
    for (let q = 0; q <= 6; q++) {
      const zeile = [];
      for (const l of ls) { const x = XC + l * WR * (1 + 0.25 * q / 6), ax = x, zr = zHinten(ax), z = zr + (hinter(ax) - zr) * q / 6 + 0.002; zeile.push(V(sg * x, oberseite(x, z) + 0.0006, z)); }
      dz.push(zeile);
    }
    const dg = flaeche(dz, { aussen: V(0, 1, 0) });
    const dc = []; for (let q = 0; q <= 6; q++) for (const l of ls) { const w = Math.pow(1 - q / 6, 1.8) * (1 - l * l) ** 2; const c = cGlut.clone().multiplyScalar(w * 0.3); dc.push(c.r, c.g, c.b); }
    dg.setAttribute('color', new THREE.Float32BufferAttribute(dc, 3));
    gruppe.add(new THREE.Mesh(dg, deckMat));
    const mitte = gp(sg, 0.99, 0, 0.3); mitte.z -= 0.004;
    duesen.push({ position: mitte, richtung: V(0, 0.03, -1).normalize() });
  }

  /* ---------- Positionslampen an den Spitzen, Blitzlicht unten ---------- */
  const glanzTex = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d');
    const v = x.createRadialGradient(32, 32, 0, 32, 32, 32); v.addColorStop(0, 'rgba(255,255,255,1)'); v.addColorStop(0.2, 'rgba(255,255,255,.75)'); v.addColorStop(0.5, 'rgba(255,255,255,.15)'); v.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = v; x.fillRect(0, 0, 64, 64); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  })();
  const lampe = (pos, farbe, r) => {
    const kern = new THREE.Mesh(new THREE.SphereGeometry(r, 10, 8), new THREE.MeshBasicMaterial({ color: farbe }));
    kern.position.copy(pos);
    const hof = new THREE.Sprite(new THREE.SpriteMaterial({ map: glanzTex, color: farbe, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
    hof.position.copy(pos); hof.scale.setScalar(0.03); gruppe.add(kern, hof);
    return { kern, hof, basis: new THREE.Color(farbe) };
  };
  // Formationslichter: kurze, schwach leuchtende Streifen parallel zur Vorderkante
  const formMat = new THREE.MeshBasicMaterial({ color: F.glut, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  const cForm = new THREE.Color(F.glut).lerp(new THREE.Color('#ffffff'), 0.35);
  for (const sg of [1, -1]) for (const [a0, a1] of FORMATION) {
    const zeilen = [];
    for (const d of [FD - 0.0032, FD + 0.0032]) { const zr = []; for (let i = 0; i <= 6; i++) { const a = a0 + (a1 - a0) * i / 6, z = vorder(a) - d; zr.push(V(sg * a, oberseite(a, z) + 0.0007, z)); } zeilen.push(zr); }
    gruppe.add(new THREE.Mesh(flaeche(zeilen, { aussen: V(0, 1, 0) }), formMat));
  }
  // Lampenkugel umschließt die Flügelspitze
  const spitzeL = lampe(V(-0.999, 0, SPZ), '#ffffff', 0.0042), spitzeR = lampe(V(0.999, 0, SPZ), '#ffffff', 0.0042);
  const bake = lampe(V(0, unterseite(0, 0.08) - 0.0025, 0.08), F.orange, 0.006);

  /* ---------- Rückgabe ---------- */
  const tmp = new THREE.Color();
  return {
    gruppe,
    radius: 1.15,
    anker: V(0, 0.2, 0),
    duesen,
    spitzen: [V(-1, 0, SPZ), V(1, 0, SPZ)],
    aktualisiere(t, zustand = {}) {
      const aktiv = !!zustand.aktiv;
      // Doppelblitz alle 1,6 s
      const f = ((t % 1.6) + 1.6) % 1.6;
      const blitz = Math.exp(-(((f - 0.05) / 0.03) ** 2)) + 0.8 * Math.exp(-(((f - 0.24) / 0.03) ** 2));
      for (const L of [spitzeL, spitzeR]) {
        L.kern.material.color.copy(L.basis).multiplyScalar(0.7 + 2.5 * blitz);
        L.hof.material.opacity = 0.35 + 0.65 * klemm(blitz); L.hof.scale.setScalar(0.03 + 0.12 * klemm(blitz));
      }
      const b = Math.pow(Math.max(0, Math.sin(t * Math.PI * 2 * 0.85)), 8);
      bake.kern.material.color.copy(bake.basis).multiplyScalar(0.5 + 2 * b);
      bake.hof.material.opacity = 0.2 + 0.8 * b; bake.hof.scale.setScalar(0.03 + 0.1 * b);
      // Triebwerke: leichtes Flackern, aktiv heller
      const fl = 1 + 0.035 * Math.sin(t * 21.7) + 0.025 * Math.sin(t * 34.3 + 1.7) + 0.02 * Math.sin(t * 7.9);
      const g = (aktiv ? 3.4 : 1.2) * fl;
      glutMat.color.setScalar(g); deckMat.color.copy(tmp.setScalar(aktiv ? 2.6 : 0.65)).multiplyScalar(fl);
      formMat.color.copy(cForm).multiplyScalar(aktiv ? 0.85 : 0.5);
      innenMat.color.setScalar((aktiv ? 1.35 : 0.85) * (1 + 0.04 * Math.sin(t * 2.3)));
    },
  };
}
