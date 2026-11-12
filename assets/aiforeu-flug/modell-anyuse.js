/* AIFOREU · Flug · Station „AnyUse“: Fertigungsbogen im All.
   Links ein Magazin voller gleicher kleiner Blöcke (wiederkehrende Arbeit). Sie laufen auf einer gebogenen Bahn in ein
   Prüftor, werden dort im Lichtschnitt erfasst und kommen als wenige präzise Würfel mit orangen Kanten heraus
   (Vorschläge), die sich rechts in einem Stapelschacht ordnen. Eine kleine Sonde mit Kamera beobachtet den Strom.
   Alles Bewegte folgt aus t. Nur der Wechsel des Durchsatzes bei „aktiv“ wird aus t-Schritten weich aufintegriert,
   damit nichts springt; ein Standbild zu t ist trotzdem eindeutig. */

export default function erstelle(THREE, k) {
  const F = k.farben, hoch = k.qualitaet !== 'niedrig', D = Math.PI / 180;
  const V3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
  const C = c => new THREE.Color(c);
  const gruppe = new THREE.Group(); gruppe.name = 'AnyUse';
  const bau = new THREE.Group(); gruppe.add(bau);          // Baurahmen: Tor-Mitte im Ursprung; am Ende zentriert und skaliert

  // ---------- Zufall mit festem Startwert, Hilfen ----------
  let saat = 0x5eed1234;
  const zufall = () => { saat = (saat + 0x6D2B79F5) | 0; let t = Math.imul(saat ^ (saat >>> 15), 1 | saat); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const glatt = (a, b, x) => { const u = Math.min(1, Math.max(0, (x - a) / (b - a))); return u * u * (3 - 2 * u); };
  const glatter = (a, b, x) => { const u = Math.min(1, Math.max(0, (x - a) / (b - a))); return u * u * u * (u * (u * 6 - 15) + 10); };
  const frak = x => x - Math.floor(x);

  // ---------- Texturen (nur Canvas) ----------
  const leinwand = (w, h, mal) => { const c = document.createElement('canvas'); c.width = w; c.height = h; mal(c.getContext('2d'), w, h); return c; };
  // feine Dreh- und Schleifriefen als Rauheitskarte (Zeilen = Riefen)
  const riefen = new THREE.CanvasTexture(leinwand(16, 512, (x, w, h) => { for (let y = 0; y < h; y++) { const g = 150 + (zufall() - .5) * 80 + Math.sin(y * 1.7) * 12; x.fillStyle = `rgb(${g | 0},${g | 0},${g | 0})`; x.fillRect(0, y, w, 1); } }));
  riefen.wrapS = riefen.wrapT = THREE.RepeatWrapping;
  const punktTex = new THREE.CanvasTexture(leinwand(128, 128, (x) => { const v = x.createRadialGradient(64, 64, 0, 64, 64, 64); v.addColorStop(0, 'rgba(255,255,255,1)'); v.addColorStop(.2, 'rgba(255,255,255,.75)'); v.addColorStop(.5, 'rgba(255,255,255,.16)'); v.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = v; x.fillRect(0, 0, 128, 128); }));
  punktTex.colorSpace = THREE.SRGBColorSpace;
  // Lichtschnitt-Fläche: zum Rand hin heller, das Licht kommt aus der Kante
  const schnittTex = new THREE.CanvasTexture(leinwand(256, 256, (x) => { const v = x.createRadialGradient(128, 128, 0, 128, 128, 128); v.addColorStop(0, 'rgba(255,255,255,.08)'); v.addColorStop(.8, 'rgba(255,255,255,.18)'); v.addColorStop(.97, 'rgba(255,255,255,.85)'); v.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = v; x.fillRect(0, 0, 256, 256); }));
  schnittTex.colorSpace = THREE.SRGBColorSpace;
  // Würfelfläche: feine eingelassene Fuge (Relief) und dieselbe Linie als Leuchtkarte
  const fuge = (x, w, farbe) => { x.strokeStyle = farbe; x.lineWidth = 3; x.strokeRect(34, 34, w - 68, w - 68); };
  const flaecheTex = new THREE.CanvasTexture(leinwand(256, 256, (x, w) => { x.fillStyle = '#000'; x.fillRect(0, 0, w, w); fuge(x, w, '#fff'); }));
  flaecheTex.colorSpace = THREE.SRGBColorSpace;
  const flaecheRelief = new THREE.CanvasTexture(leinwand(256, 256, (x, w) => { x.fillStyle = '#fff'; x.fillRect(0, 0, w, w); fuge(x, w, '#666'); }));

  // ---------- Materialien ----------
  const phys = o => new THREE.MeshPhysicalMaterial(o);
  const M = {
    aluR: phys({ color: C('#dfe4ea'), metalness: .82, roughness: .62, roughnessMap: riefen }),     // gebürstet: nur Dreh- und Fegeteile (UV passt zu den Riefen)
    alu: phys({ color: C('#d4dae2'), metalness: .9, roughness: .3 }),                             // eloxiert glatt: Pfosten, Leisten, Rahmen
    stahl: phys({ color: C('#aab4c1'), metalness: .8, roughness: .36 }),
    graphit: phys({ color: C('#343e4b'), metalness: .3, roughness: .44, clearcoat: .5, clearcoatRoughness: .2 }),    // Albedo etwas höher, sonst säuft jede Fläche ab
    traeger: phys({ color: C('#5e6977'), metalness: .3, roughness: .5, clearcoat: .35, clearcoatRoughness: .3 }),   // Strukturlack Kiel: mittlerer Ton zwischen Keramik und Graphit
    tinte: phys({ color: C('#0f141a'), metalness: .3, roughness: .7 }),
    keramik: phys({ color: C(F.papier), metalness: 0, roughness: .42, clearcoat: .4, clearcoatRoughness: .25 }),
    glas: phys({ color: C('#05080c'), metalness: 0, roughness: .03, clearcoat: 1, clearcoatRoughness: .02 }),
  };
  const leucht = (farbe, staerke) => { const m = new THREE.MeshBasicMaterial({ color: C(farbe).multiplyScalar(staerke) }); m.userData.basis = C(farbe); return m; };
  const setzeLeucht = (m, staerke) => m.color.copy(m.userData.basis).multiplyScalar(staerke);
  const L = {
    kante: leucht(F.glut, 2.2),      // Lichtkante auf den Stirnflächen des Tors
    band: leucht(F.glut, 2.5),       // Lichtband in der Bohrung (Quelle des Lichtschnitts)
    lampe: leucht(F.orange, 2.4),    // Statuslampen
    ablage: leucht(F.orange, 1.8),   // Rahmen der Ablageöffnung
    magazin: leucht(F.orange, 1.8),  // Leiste am Magazin, pulsiert bei jeder Freigabe
  };
  const sprite = (farbe, groesse, deck = 1) => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: punktTex, color: C(farbe), transparent: true, opacity: deck, blending: THREE.AdditiveBlending, depthWrite: false })); s.scale.setScalar(groesse); return s; };

  // ---------- Geometrie-Helfer ----------
  const netz = (geo, mat, schatten = true) => { const m = new THREE.Mesh(geo, mat); m.castShadow = m.receiveShadow = schatten; return m; };
  const setze = (o, x, y, z, eltern = bau) => { o.position.set(x, y, z); eltern.add(o); return o; };

  // Daten je Material sammeln und zu einer Geometrie mit Gruppen verbinden
  const sammler = () => { const m = new Map(); return { hole(i) { if (!m.has(i)) m.set(i, { pos: [], nor: [], uv: [], idx: [] }); return m.get(i); }, m }; };
  function verbinde(s) {
    const pos = [], nor = [], uv = [], idx = []; const g = new THREE.BufferGeometry(); let start = 0;
    for (const [mi, d] of [...s.m.entries()].sort((a, b) => a[0] - b[0])) {
      const off = pos.length / 3;
      for (let i = 0; i < d.pos.length; i++) { pos.push(d.pos[i]); nor.push(d.nor[i]); }
      for (let i = 0; i < d.uv.length; i++) uv.push(d.uv[i]);
      for (let i = 0; i < d.idx.length; i++) idx.push(d.idx[i] + off);
      g.addGroup(start, d.idx.length, mi); start += d.idx.length;
    }
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeBoundingSphere();
    return g;
  }
  // Dreieck mit Wicklung nach Sollnormale
  const dreieckIn = (d, a, b, c, n, uvs) => {
    if (b.clone().sub(a).cross(c.clone().sub(a)).dot(n) < 0) { [b, c] = [c, b]; if (uvs) uvs = [uvs[0], uvs[2], uvs[1]]; }
    const o = d.pos.length / 3;
    for (const [i, p] of [a, b, c].entries()) { d.pos.push(p.x, p.y, p.z); d.nor.push(n.x, n.y, n.z); d.uv.push(...(uvs ? uvs[i] : [0, 0])); }
    d.idx.push(o, o + 1, o + 2);
  };

  // Quader mit 45°-Fasen an allen Kanten; Gruppe 0 = Flächen (UV 0..1 je Fläche), Gruppe 1 = Fasen und Ecken
  function fasenQuader(w, h, d, f) {
    const halb = [w / 2, h / 2, d / 2]; f = Math.min(f, w / 2 - 1e-4, h / 2 - 1e-4, d / 2 - 1e-4);
    const s = sammler();
    const viereck = (g, a, b, c, e, n, uvs) => { dreieckIn(s.hole(g), a, b, c, n, uvs && [uvs[0], uvs[1], uvs[2]]); dreieckIn(s.hole(g), a, c, e, n, uvs && [uvs[0], uvs[2], uvs[3]]); };
    const v = arr => V3(arr[0], arr[1], arr[2]);
    for (let i = 0; i < 3; i++) for (const sg of [-1, 1]) {
      const j = (i + 1) % 3, q = (i + 2) % 3; const ecken = [];
      for (const [sj, sq] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) { const a = [0, 0, 0]; a[i] = sg * halb[i]; a[j] = sj * (halb[j] - f); a[q] = sq * (halb[q] - f); ecken.push(v(a)); }
      const n = V3(); n.setComponent(i, sg);
      viereck(0, ...ecken, n, [[0, 0], [1, 0], [1, 1], [0, 1]]);
    }
    for (let i = 0; i < 3; i++) {
      const j = (i + 1) % 3, q = (i + 2) % 3;
      for (const si of [-1, 1]) for (const sj of [-1, 1]) {
        const p = (ai, aj, aq) => { const a = [0, 0, 0]; a[i] = ai; a[j] = aj; a[q] = aq; return v(a); };
        const q0 = -(halb[q] - f), q1 = halb[q] - f; const n = V3(); n.setComponent(i, si); n.setComponent(j, sj); n.normalize();
        viereck(1, p(si * halb[i], sj * (halb[j] - f), q0), p(si * halb[i], sj * (halb[j] - f), q1), p(si * (halb[i] - f), sj * halb[j], q1), p(si * (halb[i] - f), sj * halb[j], q0), n);
      }
    }
    for (const sx of [-1, 1]) for (const sy of [-1, 1]) for (const sz of [-1, 1]) {
      const [a, b, c] = halb;
      dreieckIn(s.hole(1), V3(sx * a, sy * (b - f), sz * (c - f)), V3(sx * (a - f), sy * b, sz * (c - f)), V3(sx * (a - f), sy * (b - f), sz * c), V3(sx, sy, sz).normalize());
    }
    return verbinde(s);
  }

  // Drehkörper um Y aus Profil [[r,y],...] (gegen den Uhrzeigersinn), Profilkanten hart, rundum glatt.
  // Bei Teilumlauf: Stirnkappen mit Material kappe.
  function drehkoerper(profil, segs, mats, phi0 = 0, phiL = Math.PI * 2, kappe = 0, flach = false) {
    const s = sammler(); let vLauf = 0;
    for (let i = 0; i < profil.length - 1; i++) {
      const [r0, y0] = profil[i], [r1, y1] = profil[i + 1]; const dr = r1 - r0, dy = y1 - y0, l = Math.hypot(dr, dy); if (l < 1e-7) continue;
      const nr = dy / l, ny = -dr / l; const d = s.hole(mats ? mats[i] : 0); const b = d.pos.length / 3;
      if (flach) {   // jede Facette eigene Normale
        for (let j = 0; j < segs; j++) {
          const pa = phi0 + j / segs * phiL, pb = phi0 + (j + 1) / segs * phiL, pm = (pa + pb) / 2; const n = V3(nr * Math.cos(pm), ny, -nr * Math.sin(pm));
          const q = (r, y, p) => V3(r * Math.cos(p), y, -r * Math.sin(p));
          dreieckIn(d, q(r0, y0, pa), q(r0, y0, pb), q(r1, y1, pa), n); dreieckIn(d, q(r1, y1, pa), q(r0, y0, pb), q(r1, y1, pb), n);
        }
        vLauf += l; continue;
      }
      for (let j = 0; j <= segs; j++) {
        const phi = phi0 + j / segs * phiL, c = Math.cos(phi), sn = Math.sin(phi);
        d.pos.push(r0 * c, y0, -r0 * sn, r1 * c, y1, -r1 * sn); d.nor.push(nr * c, ny, -nr * sn, nr * c, ny, -nr * sn);
        d.uv.push(j / segs, vLauf * 6, j / segs, (vLauf + l) * 6);
      }
      for (let j = 0; j < segs; j++) { const a0 = b + j * 2; d.idx.push(a0, a0 + 2, a0 + 1, a0 + 1, a0 + 2, a0 + 3); }
      vLauf += l;
    }
    if (phiL < Math.PI * 2 - 1e-6) {
      const kont = profil.slice(0, -1); const tris = THREE.ShapeUtils.triangulateShape(kont.map(([r, y]) => new THREE.Vector2(r, y)), []);
      for (const [phi, sg] of [[phi0, -1], [phi0 + phiL, 1]]) {
        const c = Math.cos(phi), sn = Math.sin(phi); const n = V3(-sn, 0, -c).multiplyScalar(sg); const d = s.hole(kappe);
        const P = kont.map(([r, y]) => V3(r * c, y, -r * sn));
        for (const [a, b2, c2] of tris) dreieckIn(d, P[a], P[b2], P[c2], n);
      }
    }
    return verbinde(s);
  }

  // Bahn aus dichten Punkten, gleichmäßig nach Bogenlänge; Rahmen: T (Lauf), U (oben), Z = T×U
  function baueBahn(punkte) {
    const n = punkte.length, lang = new Float64Array(n);
    for (let i = 1; i < n; i++) lang[i] = lang[i - 1] + punkte[i].distanceTo(punkte[i - 1]);
    const Lg = lang[n - 1], M2 = Math.max(2, Math.ceil(Lg / 0.0025) + 1), pos = []; let j = 0;
    for (let i = 0; i < M2; i++) { const s = Lg * i / (M2 - 1); while (j < n - 2 && lang[j + 1] < s) j++; const f = (s - lang[j]) / Math.max(1e-9, lang[j + 1] - lang[j]); pos.push(punkte[j].clone().lerp(punkte[j + 1], Math.min(1, Math.max(0, f)))); }
    const tan = pos.map((p, i) => pos[Math.min(M2 - 1, i + 1)].clone().sub(pos[Math.max(0, i - 1)]).normalize());
    const Y = V3(0, 1, 0);
    const lies = (feld, s, ziel) => { const x = Math.min(M2 - 1, Math.max(0, s / Lg * (M2 - 1))); const i = Math.min(M2 - 2, Math.floor(x)); return ziel.copy(feld[i]).lerp(feld[i + 1], x - i); };
    const bahn = {
      L: Lg,
      punkt: (s, z = V3()) => lies(pos, s, z),
      tangente: (s, z = V3()) => lies(tan, s, z).normalize(),
      rahmen(s, r = { P: V3(), T: V3(), U: V3(), Z: V3() }) { bahn.punkt(s, r.P); bahn.tangente(s, r.T); r.U.copy(Y).addScaledVector(r.T, -r.T.y).normalize(); r.Z.copy(r.T).cross(r.U); return r; },
    };
    return bahn;
  }

  // Profil [[u,v],...] (gegen den Uhrzeigersinn, Blick in Laufrichtung: u rechts, v oben) entlang der Bahn fegen
  function fegen(bahn, s0, s1, schritte, profil, mats, kappenMat = 0) {
    const s = sammler(); const rahmen = [];
    for (let i = 0; i <= schritte; i++) { const sv = s0 + (s1 - s0) * i / schritte; rahmen.push({ ...bahn.rahmen(sv), s: sv }); }
    const n = profil.length; let vLauf = 0;
    for (let e = 0; e < n; e++) {
      const [u0, v0] = profil[e], [u1, v1] = profil[(e + 1) % n]; const du = u1 - u0, dv = v1 - v0, l = Math.hypot(du, dv); if (l < 1e-7) continue;
      const nu = dv / l, nv = -du / l; const d = s.hole(mats ? mats[e] : 0); const b = d.pos.length / 3;
      for (const r of rahmen) {
        const N = r.Z.clone().multiplyScalar(nu).addScaledVector(r.U, nv);
        for (const [u, v] of [[u0, v0], [u1, v1]]) { const P = r.P.clone().addScaledVector(r.Z, u).addScaledVector(r.U, v); d.pos.push(P.x, P.y, P.z); d.nor.push(N.x, N.y, N.z); }
        d.uv.push(r.s * 3, vLauf * 8, r.s * 3, (vLauf + l) * 8);
      }
      for (let i = 0; i < schritte; i++) { const a0 = b + i * 2; d.idx.push(a0, a0 + 2, a0 + 1, a0 + 1, a0 + 2, a0 + 3); }
      vLauf += l;
    }
    const tris = THREE.ShapeUtils.triangulateShape(profil.map(([u, v]) => new THREE.Vector2(u, v)), []);
    for (const [r, sg] of [[rahmen[0], -1], [rahmen[rahmen.length - 1], 1]]) {
      const d = s.hole(kappenMat); const N = r.T.clone().multiplyScalar(sg);
      const P = profil.map(([u, v]) => r.P.clone().addScaledVector(r.Z, u).addScaledVector(r.U, v));
      for (const [a, b2, c] of tris) dreieckIn(d, P[a], P[b2], P[c], N);
    }
    return verbinde(s);
  }

  // quadratischer Pyramidenstumpf (Kantenlängen oben/unten), Kanten oben und unten gefast; Gruppe 1 = Fasen
  const stumpf = (oben, unten, h, fa) => { const ro = oben / Math.SQRT2, ru = unten / Math.SQRT2; return drehkoerper([[0, -h / 2], [ru - fa, -h / 2], [ru, -h / 2 + fa], [ro, h / 2 - fa], [ro - fa, h / 2], [0, h / 2]], 4, [0, 1, 0, 1, 0], Math.PI / 4, Math.PI * 2, 0, true); };
  const instanzen = (geo, mat, matrizen, schatten = true) => { const im = new THREE.InstancedMesh(geo, mat, matrizen.length); matrizen.forEach((m, i) => im.setMatrixAt(i, m)); im.castShadow = im.receiveShadow = schatten; im.instanceMatrix.needsUpdate = true; return im; };
  const mat4 = (x, y, z, rx = 0, ry = 0, rz = 0, s = 1) => new THREE.Matrix4().compose(V3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), V3(s, s, s));

  // Schnitt durch die Lichtebene: Fragmente auf einer Seite verwerfen, das angeschnittene Innere glüht (Lichtschnitt)
  function schnitt(mat, u) {
    mat.side = THREE.DoubleSide;
    const vorsatz = s => s.replace('#include <common>', '#include <common>\nvarying vec3 vLok; varying vec3 vObj;')
      .replace('#include <project_vertex>', '#include <project_vertex>\n{ vec4 lp = vec4(transformed, 1.0); vObj = transformed;\n#ifdef USE_INSTANCING\nlp = instanceMatrix * lp;\n#endif\nvLok = lp.xyz; }');
    const kopf = 'varying vec3 vLok; varying vec3 vObj;\nuniform vec3 uN; uniform float uD; uniform float uR; uniform vec3 uM; uniform float uRad; uniform vec3 uFarbe; uniform float uBand; uniform vec3 uHalb; uniform vec3 uLinie;\n';
    const prueft = 'float sdE = dot(vLok, uN) - uD; bool imTor = distance(vLok, uM) < uRad;\nif (imTor && sdE * uR > 0.0) discard;\n';
    mat.onBeforeCompile = sh => {
      Object.assign(sh.uniforms, u);
      sh.vertexShader = vorsatz(sh.vertexShader);
      sh.fragmentShader = kopf + sh.fragmentShader.replace('void main() {', 'void main() {\n' + prueft)
        .replace('#include <opaque_fragment>', '#include <opaque_fragment>\nif (imTor) { float bandE = 1.0 - smoothstep(0.0012, 0.0045, abs(sdE)); gl_FragColor.rgb += uLinie * bandE * uBand; }\nif (!gl_FrontFacing) { vec2 qE = abs(vObj.yz) / uHalb.yz; float randE = smoothstep(.62, 1.0, max(qE.x, qE.y)); gl_FragColor = vec4(uFarbe * (imTor ? mix(.45, 1.5, randE) : 0.0), 1.0); }');
    };
    mat.customProgramCacheKey = () => 'anyuse-schnitt';
    const tiefe = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, side: THREE.DoubleSide });
    tiefe.onBeforeCompile = sh => {
      Object.assign(sh.uniforms, u);
      sh.vertexShader = vorsatz(sh.vertexShader);
      sh.fragmentShader = kopf + sh.fragmentShader.replace('void main() {', 'void main() {\n' + prueft);
    };
    tiefe.customProgramCacheKey = () => 'anyuse-schnitt-tiefe';
    return tiefe;
  }

  // =====================================================================================
  // Maße
  // =====================================================================================
  const A = 28 * D;                              // Achse des Prüftors (Laufrichtung durch das Tor)
  const T = V3(Math.cos(A), 0, Math.sin(A));
  const hdg = psi => V3(Math.cos(psi), 0, Math.sin(psi));
  const Ri = .176, Ro = .262, De = .088;           // Torring
  const bl = .040, bh = .024, bw = .033;           // kleiner Block
  const ab = .054, N = 6;                          // Blockabstand, Blöcke je Vorschlag
  const cw = .118, ch = .131;                      // Vorschlagswürfel, Stapelraster
  const S = 2;                                      // ruhende Lagen im Schacht
  const V0 = .10, V1 = .21;                         // Bahngeschwindigkeit ruhig / aktiv
  const pz = bh + .008, nV = 8;                    // Magazin: Lagenabstand, sichtbare Lagen über der untersten
  const sM = -.03;                                  // Magazinmitte auf der Bahn (vor dem Auslass)

  // ---------- Zulaufbahn: Magazin links, Bogen, gerade ins Tor ----------
  const rIn = .5, dIn = 80 * D, psiS = A - dIn, yS = -.19;
  const B1 = T.clone().multiplyScalar(-.14);
  const cIn = V3(B1.x - rIn * Math.sin(A), 0, B1.z + rIn * Math.cos(A));
  const bogenIn = psi => V3(cIn.x + rIn * Math.sin(psi), 0, cIn.z - rIn * Math.cos(psi));
  const PS = bogenIn(psiS), innen = .16, vor = .05;
  const punkteIn = []; let hor = 0; const hor0 = innen + vor, hor1 = hor0 + rIn * dIn;
  const fuegeIn = p => { if (punkteIn.length) hor += Math.hypot(p.x - punkteIn[punkteIn.length - 1].x, p.z - punkteIn[punkteIn.length - 1].z); p.y = yS * (1 - glatter(hor0, hor1, hor)); punkteIn.push(p); };
  for (let i = 0; i <= 20; i++) fuegeIn(PS.clone().addScaledVector(hdg(psiS), -(innen + vor) * (1 - i / 20)));
  for (let i = 1; i <= 120; i++) fuegeIn(bogenIn(psiS + dIn * i / 120));
  for (let i = 1; i <= 30; i++) fuegeIn(B1.clone().addScaledVector(T, (.14 + .09) * i / 30));
  const bahnIn = baueBahn(punkteIn);
  const sTor = bahnIn.L - .09 - innen;              // Weg vom Auslass (s = 0) bis zur Lichtebene
  const sIn = s => s + innen;                       // Bahnparameter aus Weg ab Auslass

  // ---------- Ausgabebahn: aus dem Tor, Rechtsbogen, in den Schacht ----------
  const rOut = .28, dOut = 52 * D, psiE = A - dOut;
  const Q1 = T.clone().multiplyScalar(.13);
  const cOut = V3(Q1.x + rOut * Math.sin(A), 0, Q1.z - rOut * Math.cos(A));
  const bogenOut = psi => V3(cOut.x - rOut * Math.sin(psi), 0, cOut.z + rOut * Math.cos(psi));
  const punkteOut = [];
  for (let i = 0; i <= 20; i++) punkteOut.push(T.clone().multiplyScalar(-.09 + (.13 + .09) * i / 20));
  for (let i = 1; i <= 60; i++) punkteOut.push(bogenOut(A - dOut * i / 60));
  const Q2 = bogenOut(psiE);
  for (let i = 1; i <= 16; i++) punkteOut.push(Q2.clone().addScaledVector(hdg(psiE), .13 * i / 16));
  const bahnOut = baueBahn(punkteOut);
  const sE = bahnOut.L - .09;                       // Weg von der Lichtebene bis zur Schachtmitte
  const sO = s => s + .09;
  const E = bahnOut.punkt(bahnOut.L);
  const yDeck = -(S * ch + cw / 2 + (ch - cw));     // Oberkante Ablage (Baurahmen)

  // =====================================================================================
  // Prüftor (lokal: X = Laufrichtung, Y oben, Z quer)
  // =====================================================================================
  const tor = new THREE.Group(); tor.name = 'Prueftor'; tor.rotation.y = -A; bau.add(tor);
  const segR = hoch ? 128 : 60;
  let schnittFlaeche, kLampe, kLampeS, schnittGlut, faecher, faecherKern;
  {
    const h2 = De / 2, f = .006, st = .007, w1 = .034, gd = .005, g1 = .011, bd = .006, bh2 = .0055;
    // Profil (r, axial) gegen den Uhrzeigersinn: Eintrittsfläche mit Stufe, außen mit Nut, Austrittsfläche, Bohrung mit Lichtband
    const P = [
      [Ri + f, -h2 + st], [Ri + w1, -h2 + st], [Ri + w1 + .005, -h2], [Ro - f, -h2], [Ro, -h2 + f],
      [Ro, -g1], [Ro - gd, -g1 + gd * .6], [Ro - gd, g1 - gd * .6], [Ro, g1],
      [Ro, h2 - f], [Ro - f, h2], [Ri + w1 + .005, h2], [Ri + w1, h2 - st], [Ri + f, h2 - st], [Ri, h2 - st - f],
      [Ri, bh2], [Ri + bd, bh2 * .5], [Ri + bd, -bh2 * .5], [Ri, -bh2], [Ri, -h2 + st + f], [Ri + f, -h2 + st]];
    // Material je Segment: 0 Alu, 1 Graphit, 2 Lichtkante, 3 Lichtband, 4 Tinte, 5 Stahl, 6 Keramik
    const mi = [1, 2, 0, 5, 6, 4, 4, 4, 6, 5, 0, 2, 1, 1, 1, 3, 3, 3, 1, 1];   // Lichtband: Nutflanken leuchten mit, sonst unsichtbar
    const ring = drehkoerper(P, segR, mi); ring.rotateZ(-Math.PI / 2);
    tor.add(netz(ring, [M.aluR, M.graphit, L.kante, L.band, M.tinte, M.stahl, M.keramik]));

    // Segmentfugen auf beiden Stirnflächen
    const fugen = [], nF = 12;
    for (const sx of [-1, 1]) for (let i = 0; i < nF; i++) { const phi = (i + .5) / nF * Math.PI * 2; const r = (Ri + w1 + .012 + Ro - .008) / 2; fugen.push(new THREE.Matrix4().compose(V3(sx * (h2 + .0002), Math.cos(phi) * r, Math.sin(phi) * r), new THREE.Quaternion().setFromEuler(new THREE.Euler(phi, 0, 0)), V3(1, 1, 1))); }
    tor.add(instanzen(new THREE.BoxGeometry(.0012, Ro - .008 - (Ri + w1 + .012), .0016), M.tinte, fugen, false));
    // Schrauben auf den Stirnflächen
    const schr = [], nS = hoch ? 24 : 12;
    for (const sx of [-1, 1]) for (let i = 0; i < nS; i++) { const phi = (i + .25) / nS * Math.PI * 2; const r = Ro - .014; schr.push(mat4(sx * (h2 + .001), Math.cos(phi) * r, Math.sin(phi) * r, 0, 0, Math.PI / 2)); }
    tor.add(instanzen(new THREE.CylinderGeometry(.0032, .0032, .002, 8), M.stahl, schr, false));

    // Wiege: Teilring, der den Torring unten umgreift, auf einem Sockel
    const w = h2 + .012, ri2 = Ro + .0015, ra = Ro + .034;
    const wiege = drehkoerper([[ri2, -w], [ra - .005, -w], [ra, -w + .005], [ra, w - .005], [ra - .005, w], [ri2, w], [ri2, -w]], hoch ? 48 : 24, [0, 1, 0, 1, 0, 0], -56 * D, 112 * D, 0);
    wiege.rotateZ(-Math.PI / 2); tor.add(netz(wiege, [M.graphit, M.stahl]));
    // Zierleiste außen auf der Wiege
    const leiste = drehkoerper([[ra, -.006], [ra + .003, -.004], [ra + .003, .004], [ra, .006], [ra, -.006]], hoch ? 48 : 24, [0, 0, 0, 0], -50 * D, 100 * D, 0);
    leiste.rotateZ(-Math.PI / 2); tor.add(netz(leiste, M.aluR));
    // Sockel: Pyramidenstumpf mit gefasten Kanten, darunter Fußplatte mit Alu-Fuge
    const sockel = stumpf(.15, .21, .085, .008); sockel.scale(.72, 1, 1); setze(netz(sockel, [M.graphit, M.stahl]), 0, -ra - .03, 0, tor);
    const platte = fasenQuader(.15, .02, .23, .006); setze(netz(platte, [M.graphit, M.stahl]), 0, -ra - .082, 0, tor);
    setze(netz(fasenQuader(.154, .005, .234, .0015), [M.alu, M.alu]), 0, -ra - .0735, 0, tor);

    // Sensorkopf: gebogenes Gehäuse auf dem Scheitel, Objektive zur Zulaufseite, Lampe, Antenne
    const kw = h2 + .009, kr0 = Ro - .004, kr1 = Ro + .05;
    const kopf = drehkoerper([[kr0, -kw], [kr1 - .007, -kw], [kr1, -kw + .007], [kr1, kw - .007], [kr1 - .007, kw], [kr0, kw], [kr0, -kw]], hoch ? 32 : 16, [0, 1, 0, 1, 0, 0], Math.PI - 15 * D, 30 * D, 0);
    kopf.rotateZ(-Math.PI / 2); tor.add(netz(kopf, [M.keramik, M.stahl]));
    // dunkles Fenster auf der Oberseite
    const fenster = drehkoerper([[kr1, -.026], [kr1 + .002, -.024], [kr1 + .002, .016], [kr1, .018], [kr1, -.026]], 16, [0, 0, 0, 0], Math.PI - 9 * D, 18 * D, 0);
    fenster.rotateZ(-Math.PI / 2); tor.add(netz(fenster, M.glas));
    const yk = Ro + .024;
    for (const sz of [-1, 1]) {
      const obj = netz(drehkoerper([[0, .016], [.011, .016], [.0125, .0145], [.0125, -.002], [.0145, -.004], [.0145, -.008]], 28, [1, 0, 0, 0, 0]), [M.stahl, M.glas]);
      obj.rotation.z = Math.PI / 2; setze(obj, -kw - .008, yk, sz * .022, tor);
      const linse = netz(new THREE.CircleGeometry(.0092, 28), M.glas); linse.rotation.y = -Math.PI / 2; setze(linse, -kw - .0241, yk, sz * .022, tor);
    }
    setze(netz(new THREE.CylinderGeometry(.0016, .0016, .07, 6), M.stahl), .03, Ro + .085, -.03, tor);
    kLampe = netz(new THREE.SphereGeometry(.0042, 10, 8), L.lampe, false); setze(kLampe, .012, Ro + .052, .03, tor);
    kLampeS = sprite(F.orange, .05, .9); setze(kLampeS, .012, Ro + .052, .03, tor);

    // Lichtschnitt-Fläche in der Bohrung
    schnittFlaeche = new THREE.Mesh(new THREE.CircleGeometry(Ri - .001, hoch ? 96 : 48), new THREE.MeshBasicMaterial({ map: schnittTex, color: C(F.glut), transparent: true, opacity: .2, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    schnittFlaeche.rotation.y = Math.PI / 2; tor.add(schnittFlaeche);
    schnittGlut = sprite(F.glut, .16, .3); tor.add(schnittGlut);   // weicher Lichtpunkt am Erfassungsort

    // Linienlaser oben in der Bohrung: Gehäuse mit Kühlrippen, leuchtender Schlitz, Fächer in der Torebene bis auf den Strom
    const yE = Ri - .006;
    setze(netz(fasenQuader(.034, .018, .056, .003), [M.graphit, M.stahl]), 0, yE, 0, tor);
    for (const sx of [-1, 1]) setze(netz(fasenQuader(.004, .012, .06, .001), [M.alu, M.alu]), sx * .0195, yE + .002, 0, tor);
    setze(netz(fasenQuader(.012, .004, .044, .0012), [M.stahl, M.stahl]), 0, yE - .0105, 0, tor);
    setze(netz(new THREE.BoxGeometry(.0034, .0016, .038), L.band, false), 0, yE - .0128, 0, tor);
    // Fächer als Gitter mit Eckfarben (additiv, ohne Textur): hell am Schlitz, läuft unter dem Strom weich aus,
    // Ränder weich. Der Kern ist eine schmale hellere Mittelzone.
    const fan = (rad, halb, nA, kern) => {
      const ringe = [0, .5, .78, .9, 1], hell = kern ? [1, .55, .42, .2, 0] : [1, .4, .3, .14, 0];
      const pos = [], col = [], idx = [];
      for (let k = 0; k < ringe.length; k++) for (let i = 0; i <= nA; i++) {
        const a = -halb + 2 * halb * i / nA, w = 1 - Math.abs(a) / halb, r = ringe[k] * rad;
        pos.push(0, -Math.cos(a) * r, Math.sin(a) * r);
        const quer = kern ? Math.pow(w, 5) : glatt(0, .45, w);
        const c = hell[k] * quer; col.push(c, c, c);
      }
      for (let k = 0; k < ringe.length - 1; k++) for (let i = 0; i < nA; i++) { const a0 = k * (nA + 1) + i, b0 = a0 + nA + 1; idx.push(a0, b0, a0 + 1, a0 + 1, b0, b0 + 1); }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.setIndex(idx);
      return new THREE.Mesh(g, new THREE.MeshBasicMaterial({ vertexColors: true, color: C(kern ? F.sonne : F.glut), transparent: true, opacity: .5, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    };
    const fanLaenge = yE - .0128 + .045;                         // vom Schlitz bis unter den Strom, dort ausgeblendet
    faecher = fan(fanLaenge, 11 * D, 16, false); faecher.position.set(0, yE - .0128, 0); tor.add(faecher);
    faecherKern = fan(fanLaenge, 11 * D, 16, true); faecherKern.position.set(0, yE - .0128, 0); tor.add(faecherKern);
  }

  // =====================================================================================
  // Bahnen
  // =====================================================================================
  const rt = -bh / 2 - .006;                         // Oberkante Zulaufträger
  const ro2 = -cw / 2 - .006;                        // Oberkante Ausgabeschienen
  {
    // Zulaufträger: Laufstreifen oben, Seitennut, gefaste Kanten
    const prof = [[-.014, rt - .042], [.014, rt - .042], [.018, rt - .038], [.018, rt - .026], [.0135, rt - .0225], [.0135, rt - .0145], [.018, rt - .0105], [.018, rt - .003], [.015, rt],
      [-.015, rt], [-.018, rt - .003], [-.018, rt - .0105], [-.0135, rt - .0145], [-.0135, rt - .0225], [-.018, rt - .026], [-.018, rt - .038]];
    const mi = [0, 0, 0, 2, 2, 2, 0, 0, 1, 0, 0, 2, 2, 2, 0, 0];
    const sEnde = sIn(sTor) - De / 2 - .014;
    bau.add(netz(fegen(bahnIn, sIn(sM + .028), sEnde, hoch ? 150 : 70, prof, mi), [M.graphit, M.aluR, M.tinte]));
    // Halteklammern im Takt
    const kl = []; for (let s = .14; s < sTor - .12; s += .15) { const r = bahnIn.rahmen(sIn(s)); kl.push(new THREE.Matrix4().makeBasis(r.T, r.U, r.Z).setPosition(r.P.clone().addScaledVector(r.U, rt - .021))); }
    bau.add(instanzen(fasenQuader(.012, .05, .044, .003), [M.stahl, M.alu], kl));

    // Ausgabe: flache Führungsrinne mit zwei Laufkanten (ein Profil, keine Schwellen)
    const profO = [[-.042, ro2 - .02], [.042, ro2 - .02], [.044, ro2 - .018], [.044, ro2 - .0025], [.0415, ro2], [.0335, ro2], [.031, ro2 - .0025], [.031, ro2 - .012],
      [-.031, ro2 - .012], [-.031, ro2 - .0025], [-.0335, ro2], [-.0415, ro2], [-.044, ro2 - .0025], [-.044, ro2 - .018]];
    const miO = [0, 0, 0, 2, 1, 2, 0, 3, 0, 2, 1, 2, 0, 0];
    bau.add(netz(fegen(bahnOut, sO(De / 2 + .012), sO(sE - cw / 2 - .014), hoch ? 90 : 44, profO, miO), [M.graphit, M.aluR, M.stahl, M.stahl]));
    // Tragrollen quer in der Rinne (Oberkante = Würfelunterkante)
    const rr = .0055, rollen = [];
    for (let s = De / 2 + .026; s < sE - cw / 2 - .02; s += .021) { const r = bahnOut.rahmen(sO(s)); rollen.push(new THREE.Matrix4().makeBasis(r.T, r.Z, r.U.clone().negate()).setPosition(r.P.clone().addScaledVector(r.U, -cw / 2 - rr))); }
    bau.add(instanzen(new THREE.CylinderGeometry(rr, rr, .06, hoch ? 10 : 6), M.stahl, rollen));
  }

  // =====================================================================================
  // Magazin (Einlass): senkrechter Schacht voller gleicher Blöcke, unten Auslass auf die Bahn
  // =====================================================================================
  let magLampe;
  {
    const r = bahnIn.rahmen(sIn(sM)); const mag = new THREE.Group(); mag.name = 'Magazin'; bau.add(mag);
    mag.matrixAutoUpdate = false; mag.matrix.makeBasis(r.T, r.U, r.Z).setPosition(r.P);
    const hx = bl / 2 + .006, hz = bw / 2 + .006, yTop = (nV + .5) * pz;
    // Sockel mit Auslass
    setze(netz(fasenQuader(.1, .075, .088, .006), [M.keramik, M.stahl]), -.012, rt - .0375, 0, mag);
    setze(netz(fasenQuader(.104, .01, .092, .003), [M.graphit, M.stahl]), -.012, rt - .079, 0, mag);
    setze(netz(fasenQuader(.026, bh + .004, bw + .01, .003), [M.keramik, M.stahl]), -hx - .011, 0, 0, mag);  // Schieberkasten
    // Schacht: zwei Wände (abgewandte Seite, Auslassseite über der Öffnung), offene Ecke zum Betrachter mit Alu-Pfosten
    const ph = yTop - rt, wd = .009;
    setze(netz(fasenQuader(2 * hx + 2 * wd, ph, wd, .0025), [M.graphit, M.stahl]), 0, rt + ph / 2, -hz - wd / 2, mag);
    const vh = yTop - (bh / 2 + .007);
    setze(netz(fasenQuader(wd, vh, 2 * hz + wd, .0025), [M.graphit, M.stahl]), hx + wd / 2, bh / 2 + .007 + vh / 2, -wd / 2, mag);
    setze(netz(fasenQuader(.007, ph, .007, .0018), [M.alu, M.stahl]), -hx - .0035, rt + ph / 2, hz + .0035, mag);
    setze(netz(fasenQuader(.007, ph, .007, .0018), [M.alu, M.stahl]), -hx - .0035, rt + ph / 2, -hz - .0035, mag);
    setze(netz(fasenQuader(.007, vh, .007, .0018), [M.alu, M.stahl]), hx + .0035, bh / 2 + .007 + vh / 2, hz + .0035, mag);
    // feine Teilstriche an der Wand: eine Marke je Lage
    const marken = []; for (let i = 1; i <= nV; i++) marken.push(mat4(hx - .006, i * pz, -hz + .0004));
    mag.add(instanzen(new THREE.BoxGeometry(.008, .0012, .001), M.alu, marken, false));
    // Haube mit Zufuhrstutzen und Lichtleiste
    setze(netz(fasenQuader(.09, .052, .08, .007), [M.keramik, M.stahl]), 0, yTop + .026, 0, mag);
    setze(netz(fasenQuader(.094, .008, .084, .002), [M.graphit, M.stahl]), 0, yTop + .004, 0, mag);
    magLampe = netz(new THREE.BoxGeometry(.003, .004, .05), L.magazin, false); setze(magLampe, .046, yTop + .036, 0, mag);
    const stutzen = netz(drehkoerper([[0, .03], [.02, .03], [.023, .027], [.023, .012], [.028, .008], [.028, 0], [.026, -.002]], hoch ? 32 : 16, [1, 0, 0, 0, 0, 0]), [M.graphit, M.stahl]);
    setze(stutzen, 0, yTop + .052, 0, mag);
    setze(netz(new THREE.CylinderGeometry(.0014, .0014, .05, 6), M.stahl), -.03, yTop + .077, .028, mag);
  }

  // =====================================================================================
  // Ablage mit Stapelschacht
  // =====================================================================================
  const ablage = new THREE.Group(); ablage.name = 'Ablage'; ablage.position.set(E.x, yDeck, E.z); ablage.rotation.y = -psiE; bau.add(ablage);
  {
    const ap = cw / 2 + .01, b = .21, hb = b / 2, rand = hb - ap;
    setze(netz(stumpf(b, b - .05, .1, .008), [M.keramik, M.stahl]), 0, -.062, 0, ablage);
    setze(netz(fasenQuader(b - .052, .008, b - .052, .002), [M.graphit, M.stahl]), 0, -.114, 0, ablage);
    for (const sz of [-1, 1]) setze(netz(fasenQuader(b, .012, rand, .003), [M.graphit, M.alu]), 0, -.006, sz * (ap + rand / 2), ablage);
    for (const sx of [-1, 1]) setze(netz(fasenQuader(rand, .012, 2 * ap, .003), [M.graphit, M.alu]), sx * (ap + rand / 2), -.006, 0, ablage);
    setze(netz(new THREE.BoxGeometry(2 * ap, .002, 2 * ap), M.tinte), 0, -.009, 0, ablage);
    for (const sz of [-1, 1]) setze(netz(new THREE.BoxGeometry(2 * ap, .004, .002), L.ablage, false), 0, -.0035, sz * (ap - .001), ablage);
    for (const sx of [-1, 1]) setze(netz(new THREE.BoxGeometry(.002, .004, 2 * ap), L.ablage, false), sx * (ap - .001), -.0035, 0, ablage);
    // Schachtpfosten und Führungsrahmen (zur Bahn hin offen)
    const hoeheS = -yDeck + cw / 2 + .012, pf = ap - .001;
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) setze(netz(fasenQuader(.008, hoeheS, .008, .002), [M.alu, M.stahl]), sx * pf, hoeheS / 2, sz * pf, ablage);
    { const y = hoeheS - .004;
      setze(netz(fasenQuader(.006, .006, 2 * pf, .0015), [M.alu, M.alu]), pf, y, 0, ablage);
      for (const sz of [-1, 1]) setze(netz(fasenQuader(2 * pf, .006, .006, .0015), [M.alu, M.alu]), 0, y, sz * pf, ablage);
    }
  }
  // Kiel: ein durchgehender Kastenträger trägt Magazin, Tor und Ablage (statt loser Stäbe).
  // Graphitkörper, oben Keramik-Deckplatten mit Fugen, seitlich Alu-Leiste; Knoten unter Magazin und Tor.
  {
    const hK = .046, wK = .064, yK = -Ro - .034 - .092 - hK / 2;      // Oberkante = Unterkante Torplatte
    const r = bahnIn.rahmen(sIn(sM)); const pMag = r.P.clone().addScaledVector(r.T, -.012).setY(yK);
    const pTor = V3(0, yK, 0), pAbl = V3(E.x, yK, E.z);
    const traeger = (a, b, ueberA, ueberB) => {
      const d = b.clone().sub(a).setY(0), l0 = d.length(); d.normalize();
      const a2 = a.clone().addScaledVector(d, -ueberA), l = l0 + ueberA + ueberB;
      const z = d.clone().cross(V3(0, 1, 0)).normalize();
      const g = new THREE.Group(); g.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(d, V3(0, 1, 0), z));
      g.position.copy(a2).addScaledVector(d, l / 2); bau.add(g);
      g.add(netz(fasenQuader(l, hK, wK, .007), [M.traeger, M.stahl]));
      // Deckplatten in Feldern, dazwischen Fugen
      const nP = Math.max(2, Math.round(l / .11)), lp = l / nP;
      const deck = []; for (let i = 0; i < nP; i++) deck.push(mat4(-l / 2 + lp * (i + .5), hK / 2 + .0022, 0));
      g.add(instanzen(fasenQuader(lp - .005, .0048, wK - .018, .0016), [M.keramik, M.stahl], deck));
      // Alu-Leiste und Fugen an beiden Flanken
      for (const sz of [-1, 1]) {
        setze(netz(fasenQuader(l - .03, .005, .003, .001), [M.alu, M.alu]), 0, -hK * .18, sz * (wK / 2 + .001), g);
        const fu = []; for (let i = 1; i < nP; i++) fu.push(mat4(-l / 2 + lp * i, .004, sz * (wK / 2 + .0003)));
        g.add(instanzen(new THREE.BoxGeometry(.0016, hK - .02, .001), M.tinte, fu, false));
      }
      return g;
    };
    traeger(pMag, pTor, .02, 0);
    traeger(pTor, pAbl, 0, -.05);                                        // endet im Ablagesockel
    // Knoten unter dem Tor (in Torachse) mit Alu-Fuge
    setze(netz(fasenQuader(.13, hK + .01, .13, .008), [M.graphit, M.stahl]), 0, yK - .006, 0, tor);
    setze(netz(fasenQuader(.134, .004, .134, .0012), [M.alu, M.alu]), 0, yK + hK / 2 - .01, 0, tor);
    // Stütze unter dem Magazin: Fuß bis Kiel, mit Knoten und Bund
    const fussU = r.P.y + rt - .084, oberK = yK + hK / 2, hS = fussU - oberK;
    const stuetze = new THREE.Group(); stuetze.rotation.y = Math.atan2(-r.T.z, r.T.x); stuetze.position.copy(pMag); bau.add(stuetze);
    setze(netz(fasenQuader(.052, hS + .004, .05, .006), [M.graphit, M.stahl]), 0, hK / 2 + hS / 2, 0, stuetze);
    setze(netz(fasenQuader(.058, .006, .056, .0015), [M.alu, M.alu]), 0, hK / 2 + hS * .62, 0, stuetze);
    setze(netz(fasenQuader(.1, hK + .012, .09, .008), [M.graphit, M.stahl]), 0, -.004, 0, stuetze);
  }

  // =====================================================================================
  // Sonde mit Kamera
  // =====================================================================================
  const sonde = new THREE.Group(); sonde.name = 'Sonde'; bau.add(sonde);
  const sondeKoerper = new THREE.Group(); sonde.add(sondeKoerper);
  const kardan = new THREE.Group(); sondeKoerper.add(kardan);
  const kam = new THREE.Group(); kardan.add(kam);
  let sLampe, sLampeS;
  {
    const rumpf = drehkoerper([[0, -.048], [.014, -.048], [.019, -.043], [.019, -.03], [.021, -.028], [.021, -.022], [.019, -.02], [.019, .022], [.016, .027], [0, .027]], hoch ? 36 : 18, [0, 1, 2, 1, 1, 1, 2, 1, 0]);
    rumpf.rotateZ(-Math.PI / 2); sondeKoerper.add(netz(rumpf, [M.graphit, M.aluR, M.keramik]));
    // Solarflügel: Ausleger mit Gelenk, Alu-Rahmen, Zellenfeld (Canvas-Raster); Steuerdüsen am Heck
    const zellen = new THREE.CanvasTexture(leinwand(256, 256, (x, w) => {
      x.fillStyle = '#0d141d'; x.fillRect(0, 0, w, w);
      for (let i = 0; i < 4; i++) for (let j = 0; j < 6; j++) { x.fillStyle = (i + j) % 2 ? '#162231' : '#13202d'; x.fillRect(i * w / 4 + 3, j * w / 6 + 3, w / 4 - 6, w / 6 - 6); }
      x.strokeStyle = '#6d7b8c'; x.lineWidth = 2; for (let i = 0; i <= 4; i++) { x.beginPath(); x.moveTo(i * w / 4, 0); x.lineTo(i * w / 4, w); x.stroke(); }
      for (let j = 0; j <= 6; j++) { x.beginPath(); x.moveTo(0, j * w / 6); x.lineTo(w, j * w / 6); x.stroke(); }
    }));
    zellen.colorSpace = THREE.SRGBColorSpace; zellen.anisotropy = 4;
    const mZelle = phys({ map: zellen, metalness: .5, roughness: .24, clearcoat: 1, clearcoatRoughness: .06 });
    for (const sz of [-1, 1]) {
      const arm = netz(new THREE.CylinderGeometry(.0017, .0017, .03, 8), M.stahl); arm.rotation.x = Math.PI / 2; setze(arm, -.012, 0, sz * .034, sondeKoerper);
      setze(netz(fasenQuader(.008, .007, .007, .0015), [M.graphit, M.alu]), -.012, 0, sz * .049, sondeKoerper);
      const fl = new THREE.Group(); fl.rotation.z = .45; setze(fl, -.012, 0, sz * .088, sondeKoerper);   // um den Ausleger zur Sonne gedreht
      fl.add(netz(fasenQuader(.05, .0026, .072, .0009), [M.alu, M.alu]));
      fl.add(netz(fasenQuader(.046, .0034, .068, .0007), [mZelle, M.stahl]));
    }
    for (let i = 0; i < 4; i++) { const w = Math.PI / 4 + i * Math.PI / 2; const d = netz(new THREE.CylinderGeometry(.0028, .0042, .006, 8), M.stahl); d.rotation.z = Math.PI / 2; setze(d, -.051, Math.cos(w) * .011, Math.sin(w) * .011, sondeKoerper); }
    setze(netz(new THREE.CylinderGeometry(.001, .001, .04, 6), M.stahl), -.012, .038, 0, sondeKoerper);
    sLampe = netz(new THREE.SphereGeometry(.0026, 8, 6), L.lampe, false); setze(sLampe, -.012, .059, 0, sondeKoerper);
    sLampeS = sprite(F.orange, .03, .8); setze(sLampeS, -.012, .059, 0, sondeKoerper);
    // Kardangabel und Kamera
    setze(netz(fasenQuader(.006, .03, .032, .0015), [M.graphit, M.alu]), .03, 0, 0, sondeKoerper);
    for (const sz of [-1, 1]) setze(netz(fasenQuader(.016, .02, .003, .001), [M.alu, M.alu]), .039, 0, sz * .0165, sondeKoerper);
    kardan.position.set(.042, 0, 0);
    const kg = netz(new THREE.CylinderGeometry(.0125, .0125, .026, 24), M.graphit); kg.rotation.z = Math.PI / 2; kam.add(kg);
    const ob = netz(drehkoerper([[0, .005], [.0105, .005], [.0112, .0005], [.009, -.002]], 24, [0, 0, 1]), [M.aluR, M.aluR, M.glas]); ob.rotation.z = -Math.PI / 2; setze(ob, .013, 0, 0, kam);
    const gl = netz(new THREE.CircleGeometry(.0085, 24), M.glas); gl.rotation.y = Math.PI / 2; setze(gl, .0176, 0, 0, kam);
  }
  const sondeOrt = V3(-.5, .16, .14), invS = new THREE.Matrix4();
  const sondeBlick = bahnIn.punkt(sIn(sTor * .45));
  const sondeGier = Math.atan2(-(sondeBlick.z - sondeOrt.z), sondeBlick.x - sondeOrt.x);

  // =====================================================================================
  // Strom: kleine Blöcke (rein) und Vorschlagswürfel (raus)
  // =====================================================================================
  const ebene = { uN: { value: T.clone() }, uD: { value: 0 }, uR: { value: 1 }, uM: { value: V3() }, uRad: { value: Ri + .02 }, uFarbe: { value: C(F.glut).lerp(C(F.orange), .45).multiplyScalar(2.8) }, uBand: { value: .9 }, uLinie: { value: C(F.sonne).multiplyScalar(3.2) } };
  const ebeneW = { ...ebene, uR: { value: -1 }, uBand: { value: .9 }, uHalb: { value: V3(cw / 2, cw / 2, cw / 2) }, uFarbe: { value: C(F.glut).lerp(C(F.orange), .7).multiplyScalar(1.55) } };
  ebene.uHalb = { value: V3(bl / 2, bh / 2, bw / 2) };

  const mBlock = phys({ color: C('#f6f2ea'), metalness: 0, roughness: .34, clearcoat: .5, clearcoatRoughness: .22 });
  const mBlockFase = phys({ color: C('#ffffff'), metalness: 0, roughness: .2, clearcoat: .7, clearcoatRoughness: .12 });
  const tiefeB = schnitt(mBlock, ebene); schnitt(mBlockFase, ebene);
  const nCol = nV + 2, nStrom = Math.ceil((sTor - sM + .06) / ab) + 1, nB = nCol + nStrom;
  const bloecke = new THREE.InstancedMesh(fasenQuader(bl, bh, bw, .0032), [mBlock, mBlockFase], nB);
  bloecke.castShadow = bloecke.receiveShadow = true; bloecke.customDepthMaterial = tiefeB; bloecke.frustumCulled = false; bau.add(bloecke);

  const mWuerfel = phys({ color: C('#56606d'), metalness: .35, roughness: .3, clearcoat: 1, clearcoatRoughness: .1, bumpMap: flaecheRelief, bumpScale: .5, emissive: C(F.orange), emissiveMap: flaecheTex, emissiveIntensity: 0 });
  // Fasen: satt orange, ohne Klarlack; Glanz warm getönt, sonst mischt das kühle Gegenlicht Weiß-Blau ins Orange (= Rosa)
  const mWuerfelKante = phys({ color: C(F.orange), metalness: .1, roughness: .42, emissive: C(F.orange), emissiveIntensity: .3, specularColor: C(F.glut), specularIntensity: .55 });
  const tiefeW = schnitt(mWuerfel, ebeneW); schnitt(mWuerfelKante, ebeneW);
  const nW = S + 3;
  const wuerfel = new THREE.InstancedMesh(fasenQuader(cw, cw, cw, .0075), [mWuerfel, mWuerfelKante], nW);
  wuerfel.castShadow = wuerfel.receiveShadow = true; wuerfel.customDepthMaterial = tiefeW; wuerfel.frustumCulled = false; bau.add(wuerfel);

  // =====================================================================================
  // Bewegung
  // =====================================================================================
  const r0 = { P: V3(), T: V3(), U: V3(), Z: V3() }, rM = bahnIn.rahmen(sIn(sM)), mtx = new THREE.Matrix4(), null4 = new THREE.Matrix4().makeScale(0, 0, 0);
  const hE = hdg(psiE), zE = hE.clone().cross(V3(0, 1, 0)), yE = V3(0, 1, 0), tmp = V3(), zielSonde = V3();
  let tAlt = null, extra = 0, schub = 0;
  const p1 = .55, p2 = .62, p3 = .86;               // Takt je Würfel: Fahrt bis p1, Ruhe, Absenken p2..p3
  const fall = 1 - bl / ab;                          // ab hier ist die unterste Lage frei: Magazin rückt nach
  const schieb = x => x * x * (2 - x);               // Auslass: aus der Ruhe auf Bahngeschwindigkeit
  // Würfelweg: bis pe gleichmäßig durch die Lichtebene (eine Kantenlänge), dann Hermite-Kurve bis zum Halt im Schacht
  const pe = .16, vE = cw / pe;
  const fahrtWeg = p => {
    if (p < pe) return -cw / 2 + vE * p;
    const d = p1 - pe, x = Math.min(1, (p - pe) / d), x2 = x * x, x3 = x2 * x;
    return (2 * x3 - 3 * x2 + 1) * (cw / 2) + (x3 - 2 * x2 + x) * d * vE + (-2 * x3 + 3 * x2) * sE;
  };

  function aktualisiere(t, zustand = {}) {
    const ziel = zustand.aktiv ? 1 : 0, nah = zustand.naehe || 0;
    if (tAlt === null || t < tAlt || t - tAlt > 1) { schub = ziel; extra = ziel * (V1 - V0) * t; }
    else { const dt = t - tAlt; schub += (ziel - schub) * (1 - Math.exp(-dt * 3)); extra += (V1 - V0) * schub * dt; }
    tAlt = t;
    const phase = V0 * t + extra;                  // zurückgelegter Weg des Stroms

    // kleine Blöcke: Magazin (senkrecht, taktweise), Auslass (Schieber), Bahn
    const rest = frak(phase / ab) * ab;
    for (let i = 0; i < nB; i++) {
      const sig = rest + (i - nCol) * ab + sM;
      if (sig < sM) {
        const n = (sM - sig) / ab, lag = Math.floor(n) + glatt(.04, fall - .02, frak(n));
        if (lag * pz - bh / 2 > (nV + .5) * pz) { bloecke.setMatrixAt(i, null4); continue; }
        mtx.makeBasis(rM.T, rM.U, rM.Z).setPosition(tmp.copy(rM.P).addScaledVector(rM.U, lag * pz));
      } else {
        const s = sig < sM + bl ? sM + bl * schieb((sig - sM) / bl) : sig;
        if (s > sTor + bl / 2 + .002) { bloecke.setMatrixAt(i, null4); continue; }
        bahnIn.rahmen(sIn(s), r0); mtx.makeBasis(r0.T, r0.U, r0.Z).setPosition(r0.P);
      }
      bloecke.setMatrixAt(i, mtx);
    }
    bloecke.instanceMatrix.needsUpdate = true;

    // Vorschlagswürfel: aus der Lichtebene, Fahrt, auf den Stapel, Stapel senkt sich um eine Lage
    const u = (phase - sTor - bl / 2) / (ab * N), fu = frak(u);
    let austritt = 0;
    const senken = Math.sin(Math.PI * glatt(p2, p3, fu));
    for (let j = 0; j < nW; j++) {
      const p = fu + j;
      let lag = 0; for (let n = 0; n <= Math.floor(p); n++) lag += glatt(p2, p3, p - n);
      const y = -lag * ch;
      if (y + cw / 2 < yDeck - .004) { wuerfel.setMatrixAt(j, null4); continue; }
      if (p < p1) {
        const s = fahrtWeg(p); if (j === 0) austritt = 1 - glatt(0, cw * 1.2, s + cw / 2);
        bahnOut.rahmen(sO(s), r0); mtx.makeBasis(r0.T, r0.U, r0.Z).setPosition(r0.P);
      } else mtx.makeBasis(hE, yE, zE).setPosition(tmp.set(E.x, y, E.z));
      wuerfel.setMatrixAt(j, mtx);
    }
    wuerfel.instanceMatrix.needsUpdate = true;

    // Lichtschnitt: Aufblitzen, wenn ein Block die Ebene kreuzt
    const dq = frak((phase - sTor) / ab) * ab;
    const blitz = Math.max(1 - glatt(0, bl * .7, dq), 1 - glatt(0, bl * .7, ab - dq));
    const g = .35 + .65 * schub;
    setzeLeucht(L.kante, 1.1 + 2.4 * g + 1.0 * blitz * g + 2 * austritt + .6 * nah);
    setzeLeucht(L.band, 1.6 + 3 * g + 3 * blitz + 3 * austritt);
    schnittFlaeche.material.opacity = .04 + .1 * schub + .3 * blitz * (.4 + .6 * schub) + .45 * austritt;
    ebene.uBand.value = ebeneW.uBand.value = .7 + .8 * schub;
    setzeLeucht(L.lampe, 1.6 + 1.6 * schub);
    setzeLeucht(L.ablage, 1.0 + 1.0 * schub + 2.2 * senken);
    setzeLeucht(L.magazin, .9 + .9 * schub + 2.4 * (1 - glatt(0, ab * .5, rest)));
    kLampe.scale.setScalar(.6 + .8 * blitz); kLampeS.material.opacity = .25 + .75 * blitz;
    schnittGlut.material.opacity = (.08 + .5 * blitz + .7 * austritt) * (.45 + .55 * schub); schnittGlut.scale.setScalar(.12 + .06 * blitz + .1 * austritt);

    // Linienlaser: steht immer, wird beim Erfassen und bei aktiv heller
    faecher.material.opacity = (.32 + .3 * blitz + .35 * austritt) * (.55 + .45 * schub);
    faecherKern.material.opacity = (.25 + .5 * blitz + .4 * austritt) * (.5 + .5 * schub);

    // Vorschläge leuchten auf (begrenzt, sonst wäscht der Tonwert das Orange zu Apricot aus)
    mWuerfelKante.emissiveIntensity = .3 + .75 * schub + .2 * nah;
    mWuerfel.emissiveIntensity = 1.0 * schub;

    // Sonde: schwebt, Körper grob zur Bahnmitte, Kardan führt die Kamera genau nach
    sonde.position.set(sondeOrt.x + Math.sin(t * .37) * .02, sondeOrt.y + Math.sin(t * .61) * .01, sondeOrt.z + Math.cos(t * .29) * .016);
    bahnIn.punkt(sIn(sTor * .45 + Math.sin(t * .45) * sTor * .22), zielSonde);
    sonde.rotation.y = sondeGier + Math.sin(t * .23) * .12;
    sondeKoerper.rotation.z = -.32 + Math.sin(t * .5) * .04; sondeKoerper.rotation.x = Math.sin(t * .43) * .05;
    sonde.updateMatrix(); sondeKoerper.updateMatrix();
    const lok = tmp.copy(zielSonde).applyMatrix4(invS.multiplyMatrices(sonde.matrix, sondeKoerper.matrix).invert()).sub(kardan.position);
    kardan.rotation.y = Math.atan2(-lok.z, lok.x);
    kam.rotation.z = Math.atan2(lok.y, Math.hypot(lok.x, lok.z));
    const an = frak(t * .8) < .1 ? 1 : 0; sLampe.visible = an > 0; sLampeS.material.opacity = .8 * an;
  }

  // =====================================================================================
  // Zentrieren und auf Radius 1 bringen
  // =====================================================================================
  aktualisiere(0, { aktiv: false, naehe: 0 }); tAlt = null;
  const MASS = 1.15;                                // auf Radius 1 gebracht (gemessen über viele Zeitpunkte)
  const box = new THREE.Box3().setFromObject(bau); const mitte = box.getCenter(V3());
  bau.scale.setScalar(MASS); bau.position.copy(mitte).multiplyScalar(-MASS);

  return { gruppe, radius: 1, anker: new THREE.Vector3(0, .8, 0), aktualisiere };   // echter Hüllradius gemessen ≈ 0,95; Oberkante ≈ 0,48
}
