/* AIFOREU · Flug · Modell „verkehr“ (VerkehrsAI).
   Kleiner dunkler Planet, dessen Nachtseite ein feines Straßennetz zeigt. Zwei Ringstraßen liegen auf einer
   gemeinsamen Kugelschale und kreuzen sich an zwei gegenüberliegenden Knoten; dort geben Signaltore Ring A und
   Ring B abwechselnd frei. Der Verkehr kommt aus einer Fahrzeugfolge-Simulation (IDM), die beim Bauen läuft und
   exakt auf zwei Signalzyklen einrastet; aktualisiere(t) schlägt nur nach. */
export default function erstelle(THREE, k) {
  const F = k.farben, hoch = k.qualitaet !== 'niedrig';
  const V3 = THREE.Vector3;
  const gruppe = new THREE.Group(); gruppe.name = 'VerkehrsAI';

  // ---------- Maße ----------
  const RP = 0.55;                    // Planet
  const R = 0.872;                    // Fahrbahn Ring A; Ring B liegt 2 mm tiefer (A deckt das Kreuzungsfeld)
  const RB = R - 0.002;
  const B = 0.045;                    // halbe Fahrbahnbreite (zwei Spuren je Richtung)
  const SPUR = [B * 0.75, B * 0.25];  // Querlage rechte und linke Spur (Betrag)
  const BR = 0.007;                   // Brüstungsbreite
  const ALPHA = 38 * Math.PI / 180;   // Winkel zwischen den Ringebenen
  const SA = Math.sin(ALPHA), CA = Math.cos(ALPHA);
  // Signaltor: achteckige Manschette um die Fahrbahn (Querschnitt in z/y)
  const TOR = { wi: B + BR + 0.0045, yo: 0.026, yu: -0.031, fase: 0.010, dick: 0.0066, tief: 0.0105 };
  const XG = ((TOR.wi + TOR.dick) * CA + B + BR + 0.004) / SA;    // Tor-Abstand vom Knoten (Bogenlänge)
  const HL = XG + 0.0055, LED = XG + 0.0102, HALT = XG + 0.0135;  // Haltelinie, Haltebalken, Fahrzeugfront
  const LEN = 0.017, UMF = 2 * Math.PI * R;
  const G = 3.2, CL = 1.5, P = 2 * (G + CL), FPS = 30;          // Signalzyklus (Grün, Räumzeit)

  let saat = 90417;
  const zufall = () => (saat = saat * 16807 % 2147483647) / 2147483647;
  const mod = (a, b) => ((a % b) + b) % b;

  // ---------- Ringrahmen ----------
  // Mittlere Ringebene (Normale m), Knoten 1 in Richtung d (vorn rechts), Ringe um ±ALPHA/2 um d gekippt.
  const m = new V3(-0.22, 0.93, 0.30).normalize();
  const d = new V3(0.62, 0, 0.78); d.addScaledVector(m, -d.dot(m)).normalize();
  const rahmen = (w, r) => { const n = m.clone().applyAxisAngle(d, w).normalize(); return { u: d.clone(), v: new V3().crossVectors(n, d), n, r }; };
  const ringA = rahmen(ALPHA / 2, R), ringB = rahmen(-ALPHA / 2, RB);
  ringA.anderer = ringB; ringB.anderer = ringA;
  const er = (g, th, z = new V3()) => z.copy(g.u).multiplyScalar(Math.cos(th)).addScaledVector(g.v, Math.sin(th));
  const et = (g, th, z = new V3()) => z.copy(g.u).multiplyScalar(-Math.sin(th)).addScaledVector(g.v, Math.cos(th));
  const punkt = (g, th, s, h, z = new V3()) => { const b = s / R, rr = g.r + h; er(g, th, z).multiplyScalar(Math.cos(b) * rr); return z.addScaledVector(g.n, Math.sin(b) * rr); };
  // Querlage auf dem anderen Ring für einen Punkt (x längs, s quer) nahe Knoten th0: s' = x·kx + s·ks
  const kreuzKoef = (g, th0) => ({ kx: et(g, th0).dot(g.anderer.n), ks: g.n.dot(g.anderer.n) });
  for (const g of [ringA, ringB]) g.k = [kreuzKoef(g, 0), kreuzKoef(g, Math.PI)];

  // ---------- Geometrie-Hilfen ----------
  const netz = () => ({ p: [], n: [], uv: [], st: [], c: [] });
  const _a = new V3(), _b = new V3(), _c = new V3();
  // Dreieck; Umlaufsinn wird an der Hinweisnormale ausgerichtet; ohne Normalen flach schattiert
  function dreieck(z, A, Bv, C, nA, nB, nC, hinweis, uvs, sts, farbe) {
    _a.subVectors(Bv, A); _b.subVectors(C, A); _c.crossVectors(_a, _b);
    const um = _c.dot(hinweis) < 0, o = um ? [0, 2, 1] : [0, 1, 2], P3 = [A, Bv, C], N3 = [nA, nB, nC];
    const fn = _c.clone().normalize().multiplyScalar(um ? -1 : 1);
    for (const i of o) { z.p.push(P3[i].x, P3[i].y, P3[i].z); const nn = N3[i] || fn; z.n.push(nn.x, nn.y, nn.z); if (uvs) z.uv.push(...uvs[i]); if (sts) z.st.push(...sts[i]); if (farbe !== undefined) z.c.push(farbe, farbe, farbe); }
  }
  function viereck(z, A, Bv, C, D, nA, nB, nC, nD, hinweis, uvs, sts, farbe) {
    dreieck(z, A, Bv, C, nA, nB, nC, hinweis, uvs && [uvs[0], uvs[1], uvs[2]], sts && [sts[0], sts[1], sts[2]], farbe);
    dreieck(z, A, C, D, nA, nC, nD, hinweis, uvs && [uvs[0], uvs[2], uvs[3]], sts && [sts[0], sts[2], sts[3]], farbe);
  }
  function fertig(z) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(z.p, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(z.n, 3));
    if (z.uv.length) g.setAttribute('uv', new THREE.Float32BufferAttribute(z.uv, 2));
    if (z.st.length) g.setAttribute('strasse', new THREE.Float32BufferAttribute(z.st, 2));
    if (z.c.length) g.setAttribute('color', new THREE.Float32BufferAttribute(z.c, 3));
    g.computeBoundingSphere(); return g;
  }
  // Quader mit Fasen an allen Kanten (44 Dreiecke), flach schattiert
  function fasenQuader(lx, ly, lz, c) {
    const hx = lx / 2, hy = ly / 2, hz = lz / 2, z = netz();
    const PX = (a, b, e) => new V3(a * hx, b * (hy - c), e * (hz - c)), PY = (a, b, e) => new V3(a * (hx - c), b * hy, e * (hz - c)), PZ = (a, b, e) => new V3(a * (hx - c), b * (hy - c), e * hz);
    const fl = (A, Bv, C, D) => { const h = new V3().add(A).add(Bv).add(C); if (D) h.add(D); D ? viereck(z, A, Bv, C, D, null, null, null, null, h) : dreieck(z, A, Bv, C, null, null, null, h); };
    for (const s of [-1, 1]) {
      fl(PX(s, -1, -1), PX(s, 1, -1), PX(s, 1, 1), PX(s, -1, 1));
      fl(PY(-1, s, -1), PY(1, s, -1), PY(1, s, 1), PY(-1, s, 1));
      fl(PZ(-1, -1, s), PZ(1, -1, s), PZ(1, 1, s), PZ(-1, 1, s));
    }
    for (const a of [-1, 1]) for (const b of [-1, 1]) {
      fl(PX(a, b, -1), PX(a, b, 1), PY(a, b, 1), PY(a, b, -1));
      fl(PY(-1, a, b), PY(1, a, b), PZ(1, a, b), PZ(-1, a, b));
      fl(PX(a, -1, b), PX(a, 1, b), PZ(a, 1, b), PZ(a, -1, b));
      for (const e of [-1, 1]) fl(PX(a, b, e), PY(a, b, e), PZ(a, b, e));
    }
    return fertig(z);
  }
  // konvexe Hülle (2D)
  const huelle = pts => {
    const p = pts.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]), kr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
    const lo = [], hi = []; for (const q of p) { while (lo.length > 1 && kr(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); }
    for (const q of p.reverse()) { while (hi.length > 1 && kr(hi[hi.length - 2], hi[hi.length - 1], q) <= 0) hi.pop(); hi.push(q); }
    return lo.slice(0, -1).concat(hi.slice(0, -1));
  };
  const leinwand = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
  const textur = (c, srgb = true) => { const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; };

  // ---------- Materialien ----------
  const env = k.umgebung || null;
  const stahl = new THREE.MeshPhysicalMaterial({ color: F.stahl, metalness: 0.85, roughness: 0.3, envMap: env });
  const knotenMat = new THREE.MeshStandardMaterial({ color: '#39414c', metalness: 0.7, roughness: 0.38, envMap: env });
  const keramik = new THREE.MeshPhysicalMaterial({ color: '#ece6db', metalness: 0, roughness: 0.42, clearcoat: 0.4, clearcoatRoughness: 0.35, envMap: env });
  const fugenTex = (() => {   // Paneelfugen für Flanken und Unterseite
    const c = leinwand(256, 16), x = c.getContext('2d'); x.fillStyle = '#d6d6d6'; x.fillRect(0, 0, 256, 16);
    x.fillStyle = '#5e5e5e'; x.fillRect(0, 0, 3, 16); x.fillStyle = '#f0f0f0'; x.fillRect(3, 0, 1, 16);
    for (const u of [64, 128, 192]) { x.fillStyle = '#b4b4b4'; x.fillRect(u, 0, 1, 16); }
    const t = textur(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
  })();
  const flanke = new THREE.MeshStandardMaterial({ color: '#5b6470', metalness: 0.62, roughness: 0.4, map: fugenTex, envMap: env });

  // Fahrbahn: Markierungen, Haltelinien und Haltebalken entstehen im Shader aus (Bogenlänge, Querlage).
  function fahrbahnMaterial(g) {
    // Glanz gedämpft und leicht kühl: bei so dunkler Albedo bestimmt sonst der warme Sonnenglanz die Farbe (Bronze)
    const mat = new THREE.MeshPhysicalMaterial({ color: '#ffffff', roughness: 0.8, metalness: 0.0, specularIntensity: 0.55, specularColor: '#d6e0ee', envMap: env });
    const u = { uUmf: { value: UMF }, uB: { value: B }, uBR: { value: BR }, uKs: { value: g.k[0].ks }, uKx1: { value: g.k[0].kx }, uKx2: { value: g.k[1].kx }, uHL: { value: HL }, uLED: { value: LED }, uRot: { value: 0 }, uAktiv: { value: 0 }, uZeit: { value: 0 } };
    mat.userData.u = u;
    mat.onBeforeCompile = sh => {
      Object.assign(sh.uniforms, u);
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute vec2 strasse;\nvarying vec2 vStrasse;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvStrasse = strasse;');
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
varying vec2 vStrasse;
uniform float uUmf, uB, uBR, uKs, uKx1, uKx2, uHL, uLED, uRot, uAktiv, uZeit;
float lin(float d, float w) { float f = max(fwidth(d), 1e-6) * 0.75; return (1.0 - smoothstep(w - f, w + f, d)) * min(1.0, w / f); }   // Linie, unter Pixelbreite flächenrichtig gedimmt`)
        .replace('#include <map_fragment>', `
float sx = vStrasse.x, sq = vStrasse.y, aq = abs(sq), halb = uUmf * 0.5;
float xk = sx, kx = uKx1;
if (sx > halb * 0.5 && sx < halb * 1.5) { xk = sx - halb; kx = uKx2; } else if (sx >= halb * 1.5) { xk = sx - uUmf; }
float feld = 1.0 - smoothstep(uB + uBR - 0.001, uB + uBR, abs(xk * kx + sq * uKs));   // Fläche der anderen Straße
float mark = lin(abs(aq - (uB - 0.0040)), 0.0009);                                  // Randlinien
mark = max(mark, lin(abs(aq - 0.0017), 0.0005));                                     // doppelte Mittellinie
mark = max(mark, lin(abs(aq - uB * 0.5), 0.00055) * lin(abs(fract(sx / 0.12) - 0.2) * 0.12, 0.02));  // Leitlinien
mark *= 1.0 - feld;
float zuf = step(0.0, xk * sq) * step(0.0012, aq) * step(aq, uB - 0.0030);           // Zufahrtshälfte
float halt = lin(abs(abs(xk) - uHL), 0.0018) * zuf;
mark = max(mark * 0.75, halt * 0.9);
float fuge = lin(abs(fract(sx / 0.24 + 0.5) - 0.5) * 0.24, 0.0004);
float reifen = (1.0 - smoothstep(0.0008, 0.0026, abs(abs(abs(aq - uB * 0.5) - uB * 0.25) - 0.0027))) * (1.0 - feld);
// Graphit-Asphalt, kühl abgestimmt (die warme Sonne macht ihn neutral statt bronze)
vec3 asphalt = vec3(0.014, 0.020, 0.033) * (1.0 - 0.45 * fuge) * (1.0 - 0.1 * reifen) * (1.0 - 0.18 * feld);
diffuseColor.rgb = mix(asphalt, vec3(0.74, 0.76, 0.78), mark);`)
        .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = mix(roughnessFactor, 0.55, mark) - 0.08 * reifen;')
        .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
vec2 ledP = vec2(abs(xk) - uLED, (fract(aq / 0.0064) - 0.5) * 0.0064);
float led = lin(length(ledP), 0.0015) * zuf;
totalEmissiveRadiance += vec3(1.0, 0.30, 0.07) * led * uRot * (1.5 + 1.0 * uAktiv);
totalEmissiveRadiance += vec3(0.85, 0.82, 0.76) * mark * (0.015 + 0.02 * uAktiv);
// aktiv: Leitlicht-Pulse in den Randlinien, in Fahrtrichtung der angrenzenden Spuren (s>0 fährt gegen sx)
if (uAktiv > 0.0) {
  float xr = -sign(sq) * sx, fp = fract((0.62 * uZeit - xr) / (uUmf / 9.0));
  float puls = exp(-fp * 6.0) * smoothstep(0.0, 0.015, fp);
  float rand = lin(abs(aq - (uB - 0.0040)), 0.0011) + 0.22 * exp(-abs(aq - (uB - 0.0040)) / 0.0035);
  totalEmissiveRadiance += vec3(1.0, 0.80, 0.58) * rand * puls * (1.0 - feld) * 3.2 * uAktiv;
}`);
    };
    mat.customProgramCacheKey = () => 'verkehr-fahrbahn';
    return mat;
  }
  const fahrbahnA = fahrbahnMaterial(ringA), fahrbahnB = fahrbahnMaterial(ringB);

  // ---------- Ringstraßen ----------
  const SEG = hoch ? 136 : 88;
  // Lücken der Brüstung, wo die andere Straße kreuzt (Winkelintervalle)
  function luecken(g, seite) {
    const out = [], mrg = B + BR + 0.002;
    g.k.forEach((kk, i) => {
      const xs = []; for (const s of [seite * B, seite * (B + BR)]) for (const e of [-mrg, mrg]) xs.push((e - s * kk.ks) / kk.kx);
      out.push([i * Math.PI + Math.min(...xs) / R, i * Math.PI + Math.max(...xs) / R]);
    });
    return out;
  }
  function baueRing(g, fahrbahn) {
    const lR = luecken(g, 1), lL = luecken(g, -1);
    const ths = []; for (let i = 0; i <= SEG; i++) ths.push(i / SEG * 2 * Math.PI);
    for (const t of [...lR.flat(), ...lL.flat()].map(t => mod(t, 2 * Math.PI))) if (!ths.some(q => Math.abs(q - t) < 1e-4)) ths.push(t);
    ths.sort((a, b) => a - b);
    const inL = (l, t) => l.some(([a, b]) => mod(t - a, 2 * Math.PI) < mod(b - a, 2 * Math.PI));
    const zF = netz(), zB = netz(), zS = netz();
    const quer = (th, s) => { const b = s / R; return er(g, th).multiplyScalar(-Math.sin(b)).addScaledVector(g.n, Math.cos(b)); };
    const radial = (th, s) => { const b = s / R; return er(g, th).multiplyScalar(Math.cos(b)).addScaledVector(g.n, Math.sin(b)); };
    // Streifen einer Profilkante (s1,h1)->(s2,h2); Normale = linke Normale der Kante
    const streifen = (z, s1, h1, s2, h2, filter, art) => {
      const ds = s2 - s1, dh = h2 - h1, ln = Math.hypot(ds, dh), ns = -dh / ln, nh = ds / ln, sm = (s1 + s2) / 2;
      const nrm = t => quer(t, sm).multiplyScalar(ns).addScaledVector(radial(t, sm), nh).normalize();
      for (let i = 0; i < ths.length - 1; i++) {
        const t0 = ths[i], t1 = ths[i + 1];
        if (filter && !filter((t0 + t1) / 2)) continue;
        const n0 = nrm(t0), n1 = nrm(t1);
        const sts = art === 'bahn' ? [[t0 * R, s1], [t0 * R, s2], [t1 * R, s2], [t1 * R, s1]] : null;
        const uvs = art === 'bahn' ? null : [[t0 * R / 0.24, 0.5], [t0 * R / 0.24, 0.5], [t1 * R / 0.24, 0.5], [t1 * R / 0.24, 0.5]];
        viereck(z, punkt(g, t0, s1, h1), punkt(g, t0, s2, h2), punkt(g, t1, s2, h2), punkt(g, t1, s1, h1), n0, n0, n1, n1, nrm((t0 + t1) / 2), uvs, sts);
      }
    };
    const QS = hoch ? 3 : 2;   // Querstreifen gegen die Kugelkrümmung
    for (let q = 0; q < QS; q++) streifen(zF, -B + 2 * B * q / QS, 0, -B + 2 * B * (q + 1) / QS, 0, null, 'bahn');
    streifen(zF, B, 0, B + BR, 0, t => inL(lR, t), 'bahn');      // Schultern nur in den Lücken
    streifen(zF, -B - BR, 0, -B, 0, t => inL(lL, t), 'bahn');
    // Brüstungen (rechts von innen nach außen, links gespiegelt)
    const bp = hoch ? [[0, 0], [0, 0.0052], [0.0014, 0.0068], [BR - 0.0014, 0.0068], [BR, 0.0054], [BR, 0]] : [[0, 0], [0, 0.0066], [BR, 0.0066], [BR, 0]];
    for (let i = 0; i < bp.length - 1; i++) {
      streifen(zB, B + bp[i][0], bp[i][1], B + bp[i + 1][0], bp[i + 1][1], t => !inL(lR, t));
      streifen(zB, -B - bp[i + 1][0], bp[i + 1][1], -B - bp[i][0], bp[i][1], t => !inL(lL, t));
    }
    for (const [l, seite] of [[lR, 1], [lL, -1]]) for (const [a, b] of l) for (const [t, r] of [[a, 1], [b, -1]]) {   // Endkappen
      const pts = bp.map(([s, h]) => punkt(g, t, seite * (B + s), h)), nn = et(g, t).multiplyScalar(r);
      const uv = [t * R / 0.24, 0.5];
      for (let i = 1; i < pts.length - 1; i++) dreieck(zB, pts[0], pts[i], pts[i + 1], nn, nn, nn, nn, [uv, uv, uv]);
    }
    // Deckkörper mit Kielträger (im Uhrzeigersinn: rechts runter, unten, links hoch)
    const dp = hoch
      ? [[B + BR, 0], [B + BR, -0.0045], [B + 0.0035, -0.0085], [0.019, -0.0085], [0.015, -0.0215], [0.0105, -0.026]]
      : [[B + BR, 0], [B + BR, -0.0085], [0.017, -0.0085], [0.012, -0.026]];
    const voll = [...dp, ...dp.slice().reverse().map(([s, h]) => [-s, h])];
    for (let i = 0; i < voll.length - 1; i++) streifen(zS, voll[i][0], voll[i][1], voll[i + 1][0], voll[i + 1][1]);
    const grp = new THREE.Group();
    // nur der Deckkörper wirft Schatten (dünne Flächen würden sich selbst streifig beschatten)
    for (const [z, mat, wirft] of [[zF, fahrbahn, false], [zB, stahl, false], [zS, flanke, true]]) { const me = new THREE.Mesh(fertig(z), mat); me.castShadow = wirft; me.receiveShadow = true; grp.add(me); }
    // Randleuchten auf den Brüstungen (wie Pistenbefeuerung), nicht in den Kreuzungslücken
    // randLauf: Lage längs in Fahrtrichtung der angrenzenden Spuren (für das Lauflicht bei aktiv)
    for (let i = 0; i < 112; i++) { const t = (i + 0.5) / 112 * 2 * Math.PI; if (!inL(lR, t)) { randPos.push(punkt(g, t, B + BR / 2, 0.0072)); randLauf.push(-t / (2 * Math.PI)); } if (!inL(lL, t)) { randPos.push(punkt(g, t, -B - BR / 2, 0.0072)); randLauf.push(t / (2 * Math.PI) + 0.37); } }
    return grp;
  }
  const randPos = [], randLauf = [];
  gruppe.add(baueRing(ringA, fahrbahnA), baueRing(ringB, fahrbahnB));

  // ---------- Knoten: Platte unter der Kreuzung, Leitstand mit Fensterband, Antenne, Blinklicht ----------
  const abbKnoten = (mitte, ex, es, x, s, h) => { const q = ex.clone().multiplyScalar(x).addScaledVector(es, s), rho = q.length(), p = mitte.clone().multiplyScalar(Math.cos(rho / R)); if (rho > 1e-9) p.addScaledVector(q, Math.sin(rho / R) / rho); return p.multiplyScalar(R + h); };
  // Konvexes Prisma in der Tangentialebene eines Knotens, auf die Kugel gelegt, mit Fasen.
  function knotenPrisma(z, mitte, ex, es, umriss, hO, hU, fase, teil) {
    const einr = (poly, w) => poly.map((_, i) => {
      const a = poly[(i - 1 + poly.length) % poly.length], b = poly[i], c = poly[(i + 1) % poly.length];
      const n1 = [-(b[1] - a[1]), b[0] - a[0]], n2 = [-(c[1] - b[1]), c[0] - b[0]], l1 = Math.hypot(...n1), l2 = Math.hypot(...n2);
      const p1 = [a[0] + n1[0] / l1 * w, a[1] + n1[1] / l1 * w], d1 = [b[0] - a[0], b[1] - a[1]], p2 = [b[0] + n2[0] / l2 * w, b[1] + n2[1] / l2 * w], d2 = [c[0] - b[0], c[1] - b[1]];
      const t = ((p2[0] - p1[0]) * d2[1] - (p2[1] - p1[1]) * d2[0]) / (d1[0] * d2[1] - d1[1] * d2[0]);
      return [p1[0] + d1[0] * t, p1[1] + d1[1] * t];
    });
    const teile = umriss.map((a, i) => { const b = umriss[(i + 1) % umriss.length]; return Math.max(1, Math.round(Math.hypot(b[0] - a[0], b[1] - a[1]) / teil)); });
    const fein = poly => { const o = []; poly.forEach((a, i) => { const b = poly[(i + 1) % poly.length], n = teile[i]; for (let j = 0; j < n; j++) o.push([a[0] + (b[0] - a[0]) * j / n, a[1] + (b[1] - a[1]) * j / n]); }); return o; };
    const innen = fein(einr(umriss, fase)), aussen = fein(umriss);
    const stufen = [[innen, hO], [aussen, hO - fase], [aussen, hU + fase], [innen, hU]].map(([poly, h]) => poly.map(([x, s]) => abbKnoten(mitte, ex, es, x, s, h)));
    const achse = mitte.clone().multiplyScalar(R + (hO + hU) / 2);
    for (let l = 0; l < 3; l++) { const A = stufen[l], Bq = stufen[l + 1]; for (let i = 0; i < A.length; i++) { const j = (i + 1) % A.length; viereck(z, A[i], A[j], Bq[j], Bq[i], null, null, null, null, new V3().add(A[i]).add(A[j]).add(Bq[i]).multiplyScalar(1 / 3).sub(achse)); } }
    for (const [poly, sg] of [[stufen[0], 1], [stufen[3], -1]]) { const cc = poly.reduce((s, p) => s.add(p), new V3()).multiplyScalar(1 / poly.length); for (let i = 0; i < poly.length; i++) dreieck(z, cc, poly[i], poly[(i + 1) % poly.length], null, null, null, mitte.clone().multiplyScalar(sg)); }
  }
  const knoten = [];
  {
    const zK = netz(), S = B + BR + 0.006;
    for (const [i, th0] of [[0, 0], [1, Math.PI]]) {
      const mitte = er(ringA, th0), ex = et(ringA, th0), es = ringA.n.clone(), kk = ringA.k[i];
      const ecke = (s, s2) => [(s2 - s * kk.ks) / kk.kx, s];
      const stumpf = [ecke(S, S), ecke(-S, -S)], spitz = [ecke(S, -S), ecke(-S, S)];
      const pts = [];
      for (const p of spitz) {   // spitze Ecken bei 0,105 vom Knoten kappen (Punkte auf den Kanten)
        const l = Math.hypot(...p), ph = [p[0] / l, p[1] / l];
        for (const q of stumpf) { const t = (0.105 - l) / ((q[0] - p[0]) * ph[0] + (q[1] - p[1]) * ph[1]); pts.push([p[0] + t * (q[0] - p[0]), p[1] + t * (q[1] - p[1])]); }
      }
      pts.push(...stumpf);
      knotenPrisma(zK, mitte, ex, es, huelle(pts), -0.0046, -0.036, 0.003, 0.02);
      const sb = stumpf[0], lb = Math.hypot(...sb);
      knoten.push({ mitte, ex, es, ub: [sb[0] / lb, sb[1] / lb], th0 });
    }
    const me = new THREE.Mesh(fertig(zK), knotenMat); me.castShadow = me.receiveShadow = true; gruppe.add(me);
  }
  // Leitstand in der stumpfen Ecke: Konsole, Keramikkubus mit Fensterband, Antenne mit Blinklicht
  const geoKonsole = fasenQuader(0.046, 0.0075, 0.036, 0.0013), geoKabine = fasenQuader(0.021, 0.0125, 0.03, 0.0016), geoBand = new THREE.BoxGeometry(0.0216, 0.0024, 0.0306);
  const geoMast = new THREE.CylinderGeometry(0.0006, 0.0009, 0.04, 6).translate(0, 0.02, 0), geoFeuer = new THREE.SphereGeometry(0.0019, 10, 6);
  const fensterMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(F.glut).multiplyScalar(1.6) });
  const feuerMat = new THREE.MeshBasicMaterial({ color: '#ffffff' });
  const imKonsole = new THREE.InstancedMesh(geoKonsole, knotenMat, 2), imKabine = new THREE.InstancedMesh(geoKabine, keramik, 2), imBand = new THREE.InstancedMesh(geoBand, fensterMat, 2), imMast = new THREE.InstancedMesh(geoMast, stahl, 2), imFeuer = new THREE.InstancedMesh(geoFeuer, feuerMat, 2);
  // Dach: dunkle Dachhaut mit Technikkasten (sonst liest sich die helle Dachfläche von oben als Zifferblatt)
  const gehMatL = new THREE.MeshStandardMaterial({ color: '#20262e', metalness: 0.5, roughness: 0.5, envMap: env });
  const imDach = new THREE.InstancedMesh(fasenQuader(0.0172, 0.0008, 0.0255, 0.0003), gehMatL, 2), imAggregat = new THREE.InstancedMesh(fasenQuader(0.007, 0.0022, 0.009, 0.0005), knotenMat, 2);
  imDach.receiveShadow = imAggregat.castShadow = imAggregat.receiveShadow = true; gruppe.add(imDach, imAggregat);
  const feuerPos = [];
  knoten.forEach((kn, i) => {
    const basis = (r, h) => {
      const p = abbKnoten(kn.mitte, kn.ex, kn.es, kn.ub[0] * r, kn.ub[1] * r, h), up = p.clone().normalize();
      const fw = kn.ex.clone().multiplyScalar(kn.ub[0]).addScaledVector(kn.es, kn.ub[1]); fw.addScaledVector(up, -fw.dot(up)).normalize();
      return new THREE.Matrix4().makeBasis(fw, up, new V3().crossVectors(fw, up)).setPosition(p);
    };
    const M = basis(0.081, -0.0046), T = (x2, y2, z2) => new THREE.Matrix4().multiplyMatrices(M, new THREE.Matrix4().makeTranslation(x2, y2, z2));
    imKonsole.setMatrixAt(i, basis(0.074, -0.0046 - 0.00375));
    imKabine.setMatrixAt(i, T(0, 0.00625, 0)); imBand.setMatrixAt(i, T(0, 0.0081, 0)); imDach.setMatrixAt(i, T(-0.001, 0.0128, -0.002)); imAggregat.setMatrixAt(i, T(-0.003, 0.0141, -0.006));
    imMast.setMatrixAt(i, T(0.005, 0.0125, 0.011)); imFeuer.setMatrixAt(i, T(0.005, 0.0125 + 0.0405, 0.011));
    feuerPos.push(new V3(0.005, 0.0125 + 0.0405, 0.011).applyMatrix4(M));
  });
  imKonsole.castShadow = imKonsole.receiveShadow = true; imKabine.castShadow = imKabine.receiveShadow = true; imMast.castShadow = true;
  gruppe.add(imKonsole, imKabine, imBand, imMast, imFeuer);

  // ---------- Signaltore ----------
  // Je Knoten und Ring zwei Tore auf den Zufahrten. Lokale Achsen: x längs (+th), y radial, z = -s.
  const tore = [];
  for (const g of [ringA, ringB]) for (const th0 of [0, Math.PI]) for (const seite of [-1, 1]) {
    const th = th0 + seite * XG / R, M = new THREE.Matrix4().makeBasis(et(g, th), er(g, th), g.n.clone().negate()).setPosition(punkt(g, th, 0, 0));
    tore.push({ g, M, seite });   // seite -1: Zufahrt der +th-Spuren (s<0), Lampen blicken nach -x
  }
  // Manschette: Achteck-Rahmen; Innenflächen getrennt (leuchten bei aktiv)
  const achteck = (w, yo, yu, f) => [[w - f, yo], [-(w - f), yo], [-w, yo - f], [-w, yu + f], [-(w - f), yu], [w - f, yu], [w, yu + f], [w, yo - f]];
  const geoManschette = (() => {
    const { wi, yo, yu, fase, dick, tief } = TOR, fo = fase + dick * 0.4142;
    const inn = achteck(wi, yo, yu, fase), aus = achteck(wi + dick, yo + dick, yu - dick, fo), zA = netz(), zI = netz(), zL = netz();
    // eingelassenes Lichtband auf beiden Stirnseiten (Mitte der Rahmenbreite)
    const w1 = dick * 0.2, w2 = dick * 0.8, l1 = achteck(wi + w1, yo + w1, yu - w1, fase + w1 * 0.4142), l2 = achteck(wi + w2, yo + w2, yu - w2, fase + w2 * 0.4142);
    const P3 = (q, x) => new V3(x, q[1], q[0]), hx = tief / 2, mitte = new V3(0, (yo + yu) / 2, 0);
    for (let i = 0; i < 8; i++) {
      const j = (i + 1) % 8;
      viereck(zA, P3(aus[i], -hx), P3(aus[j], -hx), P3(aus[j], hx), P3(aus[i], hx), null, null, null, null, P3(aus[i], 0).add(P3(aus[j], 0)).multiplyScalar(0.5).sub(mitte));
      viereck(zI, P3(inn[i], -hx), P3(inn[j], -hx), P3(inn[j], hx), P3(inn[i], hx), null, null, null, null, mitte.clone().sub(P3(inn[i], 0).add(P3(inn[j], 0)).multiplyScalar(0.5)));
      for (const sx of [-1, 1]) {
        viereck(zA, P3(inn[i], sx * hx), P3(inn[j], sx * hx), P3(aus[j], sx * hx), P3(aus[i], sx * hx), null, null, null, null, new V3(sx, 0, 0));
        const xl = sx * (hx + 0.00015);
        viereck(zL, P3(l1[i], xl), P3(l1[j], xl), P3(l2[j], xl), P3(l2[i], xl), null, null, null, null, new V3(sx, 0, 0));
      }
    }
    return [fertig(zA), fertig(zI), fertig(zL)];
  })();
  // Signalleiste oben auf dem Riegel über den Zufahrtsspuren: Leuchtstreifen oben und an beiden Stirnseiten
  const LW = B - 0.004;
  const geoGehaeuse = fasenQuader(0.0048, 0.0034, LW + 0.004, 0.0007), geoSensor = fasenQuader(0.0062, 0.0036, 0.011, 0.0008);
  const geoSignal = (() => {
    const z = netz(), hx = 0.0024, hy = 0.0017, hz = LW / 2, q = (a, b, c, d, n) => viereck(z, a, b, c, d, null, null, null, null, n);
    q(new V3(-0.0011, hy + 0.0001, -hz), new V3(0.0011, hy + 0.0001, -hz), new V3(0.0011, hy + 0.0001, hz), new V3(-0.0011, hy + 0.0001, hz), new V3(0, 1, 0));
    for (const sx of [-1, 1]) q(new V3(sx * (hx + 0.0001), -0.0008, -hz), new V3(sx * (hx + 0.0001), 0.0008, -hz), new V3(sx * (hx + 0.0001), 0.0008, hz), new V3(sx * (hx + 0.0001), -0.0008, hz), new V3(sx, 0, 0));
    return fertig(z);
  })();
  const gehMat = new THREE.MeshStandardMaterial({ color: '#171c23', metalness: 0.45, roughness: 0.45, envMap: env });
  const torMat = keramik.clone(); torMat.emissive = new THREE.Color(F.orange); torMat.emissiveIntensity = 0;
  const torInnen = new THREE.MeshStandardMaterial({ color: '#2a3038', metalness: 0.5, roughness: 0.4, emissive: F.orange, emissiveIntensity: 0, envMap: env });
  const imMansch = new THREE.InstancedMesh(geoManschette[0], torMat, tore.length), imInnen = new THREE.InstancedMesh(geoManschette[1], torInnen, tore.length);
  const torBand = new THREE.MeshStandardMaterial({ color: '#3c434c', metalness: 0.4, roughness: 0.3, emissive: F.orange, emissiveIntensity: 0.0, envMap: env });
  const imBandTor = new THREE.InstancedMesh(geoManschette[2], torBand, tore.length);
  const torFarbe = torMat.color.clone(), torAktiv = new THREE.Color('#c8a48a');
  const imGeh = new THREE.InstancedMesh(geoGehaeuse, gehMat, tore.length), imSensor = new THREE.InstancedMesh(geoSensor, gehMat, tore.length);
  const signalMat = new THREE.MeshBasicMaterial({ color: '#ffffff' });
  const imSignal = new THREE.InstancedMesh(geoSignal, signalMat, tore.length);
  const lok = (M, x, y, z) => new THREE.Matrix4().multiplyMatrices(M, new THREE.Matrix4().makeTranslation(x, y, z));
  const yL = TOR.yo + TOR.dick + 0.0017;
  tore.forEach((t, i) => {
    imMansch.setMatrixAt(i, t.M); imInnen.setMatrixAt(i, t.M); imBandTor.setMatrixAt(i, t.M);
    const zA = t.seite < 0 ? B / 2 : -B / 2;   // Zufahrtshälfte (z = -s)
    imGeh.setMatrixAt(i, lok(t.M, 0, yL, zA)); imSignal.setMatrixAt(i, lok(t.M, 0, yL, zA));
    imSensor.setMatrixAt(i, lok(t.M, 0, TOR.yo + TOR.dick + 0.0018, -zA * 0.9));
    t.signalPos = new V3(0, yL + 0.0035, zA).applyMatrix4(t.M);
  });
  for (const im of [imMansch, imInnen, imBandTor, imGeh, imSensor]) { im.receiveShadow = true; gruppe.add(im); }
  gruppe.add(imSignal);
  for (let i = 0; i < tore.length; i++) imSignal.setColorAt(i, new THREE.Color(0, 0, 0));

  // ---------- Lichthöfe (additive Punkte, mit Mindestgröße für kleine Ansichten) ----------
  const hofTex = (() => { const c = leinwand(64, 64), x = c.getContext('2d'), v = x.createRadialGradient(32, 32, 0, 32, 32, 32); v.addColorStop(0, 'rgba(255,255,255,1)'); v.addColorStop(0.2, 'rgba(255,255,255,.92)'); v.addColorStop(0.45, 'rgba(255,255,255,.3)'); v.addColorStop(0.75, 'rgba(255,255,255,.05)'); v.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = v; x.fillRect(0, 0, 64, 64); return textur(c); })();
  const hoefe = (n, groesse, minPx, maxPx, vor = 0.025) => {
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3)); geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
    const mat = new THREE.PointsMaterial({ size: groesse, map: hofTex, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true });
    // Sprite 2,5 cm zur Kamera vorziehen (nicht vom eigenen Fahrzeug oder Asphalt verdeckt, wohl aber von Planet und Ringen);
    // Pixelgröße begrenzen, damit die Lichter klein lesbar bleiben und nah nicht aufblähen
    mat.onBeforeCompile = sh => { sh.vertexShader = sh.vertexShader.replace('#include <fog_vertex>', `mvPosition.xyz *= max(0.0, 1.0 - ${vor.toFixed(3)} / length(mvPosition.xyz));\ngl_Position = projectionMatrix * mvPosition;\ngl_PointSize = clamp(gl_PointSize, ${minPx.toFixed(2)}, ${maxPx.toFixed(2)});\n#include <fog_vertex>`); };
    mat.customProgramCacheKey = () => 'verkehr-hof-' + minPx + '-' + maxPx + '-' + vor;
    const p = new THREE.Points(geo, mat); p.frustumCulled = false; return p;
  };
  // Haltebalken-Punkte: je Zufahrt vier über die Zufahrtshälfte
  const balken = [];
  for (const g of [ringA, ringB]) for (const th0 of [0, Math.PI]) for (const seite of [-1, 1]) for (let j = 0; j < 4; j++) {
    const s = seite * (0.006 + (B - 0.012) * j / 3);
    balken.push({ g, pos: punkt(g, th0 + seite * LED / R, s, 0.0012) });
  }
  const signalHof = hoefe(tore.length + balken.length + feuerPos.length, 0.034, 2.2, 26); gruppe.add(signalHof);
  const randHof = hoefe(randPos.length, 0.02, 1.4, 12); gruppe.add(randHof);
  { const ra = randHof.geometry.attributes; randPos.forEach((p, i) => ra.position.setXYZ(i, p.x, p.y, p.z)); }
  // Torhof: weiches oranges Leuchten um jedes Tor, nur bei aktiv
  const torHof = hoefe(tore.length, 0.2, 13, 80, 0.07); gruppe.add(torHof);
  tore.forEach((t, i) => { const p = new V3(0, (TOR.yo + TOR.yu) / 2 + 0.01, 0).applyMatrix4(t.M); torHof.geometry.attributes.position.setXYZ(i, p.x, p.y, p.z); });

  // ---------- Verkehr: Simulation ----------
  function simuliere(N, v0, saatS) {
    const a = 0.26, b = 0.42, T = 0.32, s0 = 0.007, bHart = 1.1, dt = 1 / 60;
    const x = new Float64Array(N), v = new Float64Array(N), acc = new Float64Array(N);
    let s = saatS; const rnd = () => (s = s * 16807 % 2147483647) / 2147483647;
    for (let i = 0; i < N; i++) { x[i] = i / N * UMF + (rnd() - 0.5) * 0.02; v[i] = v0 * 0.6; }
    const l1 = UMF / 2 - HALT, l2 = UMF - HALT; let t = 0;
    const schritt = () => {
      const rot = mod(t, P) >= G;
      for (let i = 0; i < N; i++) {
        const j = i + 1 === N ? 0 : i + 1;
        let gap = x[j] - x[i] - LEN + (j === 0 ? UMF : 0), dv = v[i] - v[j];
        if (rot) {
          const xm = mod(x[i], UMF); let zl = l1 - xm; if (zl < -1e-6) zl = l2 - xm; if (zl < -1e-6) zl = l1 + UMF - xm;
          if (zl < gap && v[i] * v[i] < 2 * bHart * Math.max(zl, 1e-4)) { gap = Math.max(zl, 1e-4); dv = v[i]; }
        }
        const ss = s0 + Math.max(0, v[i] * T + v[i] * dv / (2 * Math.sqrt(a * b))), q = v[i] / v0, r = ss / Math.max(gap, 1e-4);
        acc[i] = a * (1 - q * q * q * q - r * r);
      }
      for (let i = 0; i < N; i++) { let nv = v[i] + acc[i] * dt; if (nv < 0) nv = 0; x[i] += (v[i] + nv) * 0.5 * dt; v[i] = nv; }
      t += dt;
    };
    const warm = Math.round(12 * P * 60); for (let i = 0; i < warm; i++) schritt();
    const frames = Math.round(2 * P * FPS), pos = new Float32Array((frames + 1) * N), basis = Math.floor(x[0] / UMF) * UMF;
    for (let f = 0; f <= frames; f++) { for (let i = 0; i < N; i++) pos[f * N + i] = x[i] - basis; if (f < frames) { schritt(); schritt(); } }
    return { N, pos, frames };
  }
  const sims = [[22, 0.215, 11], [20, 0.22, 23], [24, 0.21, 37], [18, 0.22, 51]].map(([N, v0, s]) => simuliere(N, v0, s));
  // Spuren: Ring, Richtung, Querlage, Simulation; Ring B läuft eine halbe Periode versetzt
  const WEISS = new THREE.Color('#ffe6c8'), ORANGE = new THREE.Color(F.orange);
  const spuren = [];
  for (const [g, off, folge] of [[ringA, 0, [0, 1, 2, 3]], [ringB, P / 2, [2, 3, 0, 1]]]) {
    spuren.push({ g, off, dir: 1, s: -SPUR[0], sim: sims[folge[0]], farbe: WEISS });
    spuren.push({ g, off, dir: 1, s: -SPUR[1], sim: sims[folge[1]], farbe: WEISS });
    spuren.push({ g, off, dir: -1, s: SPUR[0], sim: sims[folge[2]], farbe: ORANGE });
    spuren.push({ g, off, dir: -1, s: SPUR[1], sim: sims[folge[3]], farbe: ORANGE });
  }
  const NF = spuren.reduce((a, sp) => a + sp.sim.N, 0);

  // ---------- Fahrzeuge: dunkler Körper, Lichtleisten vorn und hinten ----------
  const FW = 0.0076, FH = 0.0034;
  const fzPunkte = [[-LEN / 2, 0, -FW / 2], [LEN / 2, 0, -FW / 2], [LEN / 2, 0, FW / 2], [-LEN / 2, 0, FW / 2], [-LEN * 0.36, FH, -FW * 0.36], [LEN * 0.3, FH, -FW * 0.36], [LEN * 0.3, FH, FW * 0.36], [-LEN * 0.36, FH, FW * 0.36]].map(p => new V3(...p));
  const geoFz = (() => {
    const z = netz(), Pk = fzPunkte, mt = new V3(0, FH / 2, 0);
    for (const [i, j, kk, q] of [[4, 5, 6, 7], [1, 2, 6, 5], [0, 3, 7, 4], [0, 1, 5, 4], [3, 2, 6, 7], [0, 1, 2, 3]]) viereck(z, Pk[i], Pk[j], Pk[kk], Pk[q], null, null, null, null, new V3().add(Pk[i]).add(Pk[j]).add(Pk[kk]).add(Pk[q]).multiplyScalar(0.25).sub(mt));
    return fertig(z);
  })();
  const geoLicht = (() => {   // Leisten auf den schrägen Stirnflächen, leicht abgehoben
    const z = netz(), Pk = fzPunkte;
    const leiste = (u0, u1, o0, o1, hell) => {
      const L = (a, b, t) => a.clone().lerp(b, t), n = new V3().crossVectors(new V3().subVectors(o0, u0), new V3().subVectors(u1, u0)).normalize();
      if (n.x * (u0.x) < 0) n.negate();
      const q = [L(u0, o0, 0.22), L(u1, o1, 0.22), L(u1, o1, 0.86), L(u0, o0, 0.86)].map(p => { p.addScaledVector(n, 0.00012); p.z *= 0.9; return p; });
      viereck(z, q[0], q[1], q[2], q[3], null, null, null, null, n, null, null, hell);
    };
    leiste(Pk[1], Pk[2], Pk[5], Pk[6], 1.0); leiste(Pk[0], Pk[3], Pk[4], Pk[7], 0.3);
    // kurze Querleiste vorn auf dem Dach: von oben lesbar
    const y = FH + 0.00012, w = FW * 0.3;
    viereck(z, new V3(LEN * 0.18, y, -w), new V3(LEN * 0.28, y, -w), new V3(LEN * 0.28, y, w), new V3(LEN * 0.18, y, w), null, null, null, null, new V3(0, 1, 0), null, null, 0.8);
    return fertig(z);
  })();
  const fzMat = new THREE.MeshStandardMaterial({ color: '#7b8694', metalness: 0.7, roughness: 0.3, envMap: env });
  const lichtMat = new THREE.MeshBasicMaterial({ color: '#ffffff', vertexColors: true });
  const imFz = new THREE.InstancedMesh(geoFz, fzMat, NF), imLicht = new THREE.InstancedMesh(geoLicht, lichtMat, NF);
  imFz.frustumCulled = imLicht.frustumCulled = false;
  const kegelTex = (() => { const c = leinwand(64, 32), x = c.getContext('2d'), lg = x.createLinearGradient(0, 0, 64, 0); lg.addColorStop(0, 'rgba(255,255,255,.9)'); lg.addColorStop(0.3, 'rgba(255,255,255,.35)'); lg.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = lg; x.fillRect(0, 0, 64, 32); const id = x.getImageData(0, 0, 64, 32); for (let y = 0; y < 32; y++) { const f = Math.max(0, 1 - Math.abs(y - 15.5) / 16) ** 1.6; for (let xx = 0; xx < 64; xx++) id.data[(y * 64 + xx) * 4 + 3] *= f; } x.putImageData(id, 0, 0); return textur(c); })();
  const geoKegel = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2).translate(0.5, 0, 0);
  const kegelMat = new THREE.MeshBasicMaterial({ map: kegelTex, color: '#ffffff', transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  const imKegel = new THREE.InstancedMesh(geoKegel, kegelMat, NF); imKegel.frustumCulled = false;
  const fzHof = hoefe(NF, 0.07, 3.8, 24);
  { let i = 0; for (const sp of spuren) for (let j = 0; j < sp.sim.N; j++, i++) { const w = sp.farbe === WEISS, hk = w ? 1.25 : 1.5; imLicht.setColorAt(i, sp.farbe.clone().multiplyScalar(w ? 3.2 : 3.6)); imKegel.setColorAt(i, sp.farbe.clone().multiplyScalar(0.42)); fzHof.geometry.attributes.color.setXYZ(i, sp.farbe.r * hk, sp.farbe.g * hk, sp.farbe.b * hk); } }
  imFz.castShadow = false; imFz.receiveShadow = true;
  gruppe.add(imFz, imLicht, imKegel, fzHof);

  // ---------- Planet ----------
  const planetGruppe = new THREE.Group(); planetGruppe.quaternion.setFromUnitVectors(new V3(0, 1, 0), m); gruppe.add(planetGruppe);
  const { albedo, lichter, rauheit } = (() => {
    const W = hoch ? 1024 : 512, H = W / 2, sk = W / 1024;
    const cA = leinwand(W, H), xA = cA.getContext('2d'), cL = leinwand(W, H), xL = cL.getContext('2d'), cR = leinwand(W, H), xR = cR.getContext('2d');
    // Grund: kühler Schiefer (unter warmer Sonne neutral dunkel), Rauheit hoch
    xA.fillStyle = '#28323f'; xA.fillRect(0, 0, W, H); xL.fillStyle = '#000'; xL.fillRect(0, 0, W, H); xR.fillStyle = '#e4e4e4'; xR.fillRect(0, 0, W, H);
    const fleck = (ctx, u, v, r, farbe) => {   // weicher Fleck, längengerecht gestreckt, über die Naht gespiegelt
      const lat = (0.5 - v / H) * Math.PI;
      for (const off of [-W, 0, W]) { if (u + off < -r * 5 || u + off > W + r * 5) continue;
        ctx.save(); ctx.translate(u + off, v); ctx.scale(1 / Math.max(0.3, Math.cos(lat)), 1);
        const gr = ctx.createRadialGradient(0, 0, 0, 0, 0, r); gr.addColorStop(0, farbe); gr.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill(); ctx.restore(); }
    };
    // weiche Tonflecken: Gelände ohne Kontinente
    for (let i = 0; i < 260; i++) {
      const u = zufall() * W, v = H * (0.05 + 0.9 * zufall()), r = (5 + 40 * zufall() ** 2) * sk, hell = zufall() < 0.5;
      fleck(xA, u, v, r, hell ? 'rgba(66,78,94,.15)' : 'rgba(8,10,14,.15)');
    }
    const proj = p => { const th = Math.acos(Math.max(-1, Math.min(1, p.y))); let ph = Math.atan2(p.z, -p.x); if (ph < 0) ph += 2 * Math.PI; return [ph / (2 * Math.PI) * W, th / Math.PI * H]; };
    const STU = 6, pfade = Array.from({ length: STU }, () => []);
    const linie = (pts, hell) => {
      const q = pts.map(proj); for (let i = 1; i < q.length; i++) { while (q[i][0] - q[i - 1][0] > W / 2) q[i][0] -= W; while (q[i][0] - q[i - 1][0] < -W / 2) q[i][0] += W; }
      pfade[Math.max(0, Math.min(STU - 1, Math.floor(hell * STU)))].push(q);
    };
    const bogen = (a, b, schritt = 0.01) => { const w = a.angleTo(b), n = Math.max(1, Math.ceil(w / schritt)), o = []; for (let i = 0; i <= n; i++) { const t = i / n; o.push(a.clone().multiplyScalar(Math.sin((1 - t) * w)).addScaledVector(b, Math.sin(t * w)).divideScalar(Math.sin(w) || 1).normalize()); } return o; };
    const rahmenAuf = (p, psi) => { let e1 = new V3(0, 1, 0).cross(p); if (e1.lengthSq() < 1e-6) e1.set(1, 0, 0); e1.normalize(); const e2 = new V3().crossVectors(p, e1), c = Math.cos(psi), s = Math.sin(psi); return [e1.clone().multiplyScalar(c).addScaledVector(e2, s), e2.clone().multiplyScalar(c).addScaledVector(e1, -s)]; };
    // Grundnetz: gejittertes Fibonacci-Gitter (nicht an den Polen), Straßen zu den nächsten Nachbarn
    const NK = hoch ? 4200 : 1800, sp = Math.sqrt(4 * Math.PI / NK), punkte = [], netzK = [];
    for (let i = 0; i < NK; i++) {
      const y = 1 - 2 * (i + 0.5) / NK; if (Math.abs(y) > 0.9) continue;
      const r = Math.sqrt(1 - y * y), ph = i * 2.399963;
      netzK.push(new V3(Math.cos(ph) * r + (zufall() - 0.5) * sp * 0.8, y + (zufall() - 0.5) * sp * 0.8, Math.sin(ph) * r + (zufall() - 0.5) * sp * 0.8).normalize());
    }
    // Siedlungsräume: weiche Dichtefelder (keine Küstenlinien); dazwischen dunkle, dünn erschlossene Ebenen
    const regionen = Array.from({ length: 9 }, () => { const y = (zufall() * 2 - 1) * 0.8, ph = zufall() * 2 * Math.PI, s = Math.sqrt(1 - y * y); return { p: new V3(s * Math.cos(ph), y, s * Math.sin(ph)), r: 0.42 + 0.42 * zufall() }; });
    const region = p => { let w = 0; for (const g of regionen) { const a = g.p.angleTo(p); if (a < g.r) w = Math.max(w, 1 - (a / g.r) ** 2); } return w; };
    // Städte: wenige verdichtete Rasterstädte, bevorzugt in den Siedlungsräumen
    const staedte = [];
    for (let i = 0, versuch = 0; i < 24 && versuch < 4000; versuch++) { const p = netzK[Math.floor(zufall() * netzK.length)]; if (region(p) < 0.3 + 0.4 * zufall()) continue; staedte.push({ p, w: 0.2 + 0.8 * zufall() ** 1.6 }); i++; }
    const naehe = p => { let w = 0; for (const s of staedte) { const a = s.p.angleTo(p), rr = (0.04 + 0.08 * s.w) * 2.4; if (a < rr) w = Math.max(w, s.w * (1 - a / rr)); } return w; };
    // Nachbarsuche über ein Würfelraster
    const zelle = sp * 2.2, raster = new Map(), schl = (x, y, z) => x * 1e6 + y * 1e3 + z;
    netzK.forEach((p, i) => { const k = schl(Math.floor(p.x / zelle), Math.floor(p.y / zelle), Math.floor(p.z / zelle)); if (!raster.has(k)) raster.set(k, []); raster.get(k).push(i); });
    // Kandidaten: je Knoten die 3 nächsten Nachbarn
    const gesehen = new Set(), kand = [];
    netzK.forEach((p, i) => {
      const cx = Math.floor(p.x / zelle), cy = Math.floor(p.y / zelle), cz = Math.floor(p.z / zelle), nach = [];
      for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) for (let c = -1; c <= 1; c++) for (const j of raster.get(schl(cx + a, cy + b, cz + c)) || []) if (j !== i) nach.push([j, p.distanceToSquared(netzK[j])]);
      nach.sort((a, b) => a[1] - b[1]);
      for (const [j, d2] of nach.slice(0, 3)) { const key = Math.min(i, j) * 8192 + Math.max(i, j); if (gesehen.has(key)) continue; gesehen.add(key); kand.push([i, j, Math.sqrt(d2) * (0.75 + 0.5 * zufall())]); }
    });
    // Rückgrat: minimaler Spannbaum (Kruskal), damit auch dünne Gegenden zusammenhängende Landstraßen haben
    const eltern = netzK.map((_, i) => i), wurzel = i => { while (eltern[i] !== i) i = eltern[i] = eltern[eltern[i]]; return i; };
    kand.sort((a, b) => a[2] - b[2]);
    const baum = [], rest = [], grad = new Int32Array(netzK.length);
    for (const e of kand) { const a = wurzel(e[0]), b = wurzel(e[1]); if (a !== b) { eltern[a] = b; baum.push(e); grad[e[0]]++; grad[e[1]]++; } else rest.push(e); }
    // in dünnen Gegenden Sackgassen kappen: übrig bleiben verzweigte Fernwege
    let aktivB = baum.map(() => true);
    for (let runde = 0; runde < 4; runde++) {
      const weg = [];
      baum.forEach((e, n) => { if (!aktivB[n]) return; const rg = (region(netzK[e[0]]) + region(netzK[e[1]])) / 2; if ((grad[e[0]] === 1 || grad[e[1]] === 1) && rg < 0.18 * (runde + 1)) weg.push(n); });
      for (const n of weg) { aktivB[n] = false; grad[baum[n][0]]--; grad[baum[n][1]]--; }
    }
    const kante = ([i, j], extra) => { const uj = Math.max(naehe(netzK[i]), naehe(netzK[j])), rj = (region(netzK[i]) + region(netzK[j])) / 2; linie([netzK[i], netzK[j]], 0.035 + 0.05 * zufall() + 0.12 * rj + 0.6 * uj + extra); };
    baum.forEach((e, n) => { if (aktivB[n]) kante(e, 0.02); });
    // Maschen nur in Siedlungsräumen und um Städte
    for (const e of rest) { const uj = Math.max(naehe(netzK[e[0]]), naehe(netzK[e[1]])), rj = (region(netzK[e[0]]) + region(netzK[e[1]])) / 2; if (zufall() < 0.9 * Math.max(rj * rj, uj * 1.6)) kante(e, 0); }
    netzK.forEach(p => { const u = naehe(p), rg = region(p); if (zufall() < 0.04 + 0.3 * rg + 0.6 * u) punkte.push([p, 0.6 + 0.4 * zufall() + 1.2 * u, 0.16 + 0.12 * rg + 0.4 * u]); });
    const rasterStadt = (p, w, rc, gw, dichte) => {
      const [e1, e2] = rahmenAuf(p, zufall() * Math.PI), auf = (a, b) => p.clone().addScaledVector(e1, a).addScaledVector(e2, b).normalize(), M = Math.ceil(rc / gw);
      for (let i = -M; i <= M; i++) for (let j = -M; j < M; j++) for (const quer of [0, 1]) {
        const a = quer ? [j * gw, i * gw] : [i * gw, j * gw], b = quer ? [(j + 1) * gw, i * gw] : [i * gw, (j + 1) * gw];
        const dist = Math.hypot((a[0] + b[0]) / 2, (a[1] + b[1]) / 2) / rc; if (dist > 1) continue;
        if (zufall() > (1.05 - dist * dist) * dichte) continue;
        linie([auf(...a), auf(...b)], w * (1 - 0.7 * dist) * (0.6 + 0.4 * zufall()) + 0.08);
      }
      return auf;
    };
    for (const st of staedte) {
      rasterStadt(st.p, 0.4 + 0.6 * st.w, 0.025 + 0.07 * st.w, 0.0135 + 0.003 * zufall(), 0.75 + 0.2 * st.w);
      punkte.push([st.p, 1.2 + 1.8 * st.w, 0.35 + 0.3 * st.w]);
    }
    // Fernlinien zwischen den Städten (Spannbaum), etwas heller als das Grundnetz
    const inBaum = [0], kanten = [];
    while (staedte.length && inBaum.length < staedte.length) { let best = null; for (const i of inBaum) staedte.forEach((s, j) => { if (inBaum.includes(j)) return; const w = staedte[i].p.angleTo(s.p); if (!best || w < best[2]) best = [i, j, w]; }); inBaum.push(best[1]); kanten.push(best); }
    // Fernstraßen schlängeln sich leicht (Gelände), statt als Großkreis-Strahl durchs Netz zu schneiden
    for (const [i, j, w] of kanten) {
      if (w > 1.2) continue;
      const a = staedte[i].p, b = staedte[j].p, quer = new V3().crossVectors(a, b).normalize(), f1 = 2 + Math.floor(zufall() * 3), p1 = zufall() * 6.28, p2 = zufall() * 6.28, amp = Math.min(0.03, 0.05 * w);
      linie(bogen(a, b, 0.008).map((p, n, arr) => { const t = n / (arr.length - 1), e = Math.sin(Math.PI * t) * amp * (Math.sin(f1 * Math.PI * t + p1) + 0.45 * Math.sin(2.7 * f1 * Math.PI * t + p2)); return p.clone().addScaledVector(quer, e).normalize(); }), 0.3);
    }
    // zeichnen: Lichter mit Hof und Kern
    const zeichne = (ctx, farbe, breite, alpha) => {
      for (let b = 0; b < STU; b++) {
        ctx.beginPath();
        for (const q of pfade[b]) { let mn = Infinity, mx = -Infinity; for (const p of q) { mn = Math.min(mn, p[0]); mx = Math.max(mx, p[0]); }
          for (const off of [-W, 0, W]) { if (mx + off < -4 || mn + off > W + 4) continue; ctx.moveTo(q[0][0] + off, q[0][1]); for (let i = 1; i < q.length; i++) ctx.lineTo(q[i][0] + off, q[i][1]); } }
        ctx.strokeStyle = farbe; ctx.globalAlpha = alpha(b / (STU - 1)); ctx.lineWidth = breite; ctx.stroke();
      }
      ctx.globalAlpha = 1;
    };
    // Tagseite: Stadtflächen heller und glatter, Straßen als heller Beton, glatter (Sonnenglanz zeichnet das Netz nach)
    for (const st of staedte) { const [u, v] = proj(st.p), r = (0.035 + 0.075 * st.w) * H / Math.PI * 1.15; fleck(xA, u, v, r, `rgba(118,130,146,${0.16 + 0.2 * st.w})`); fleck(xR, u, v, r, `rgba(120,120,120,${0.35 + 0.3 * st.w})`); }
    xA.lineCap = xR.lineCap = 'round';
    zeichne(xA, '#a7b2bf', 1.3 * sk, h => 0.1 + 0.45 * h);
    zeichne(xR, '#6a6a6a', 1.7 * sk, h => 0.3 + 0.5 * h);
    // Linien nicht unter 1,2 px: dünnere werden bei Vergrößerung perlig
    xL.lineCap = 'round'; xL.globalCompositeOperation = 'lighter';
    zeichne(xL, F.glut, 2.8 * sk, h => 0.035 + 0.08 * h);
    zeichne(xL, '#ffc48f', 1.2 * sk, h => 0.12 + 0.48 * h);
    for (const [p, r, a] of punkte) { const [u, v] = proj(p); for (const off of [-W, 0, W]) { const x0 = u + off; if (x0 < -20 || x0 > W + 20) continue; const gr = xL.createRadialGradient(x0, v, 0, x0, v, r * sk); gr.addColorStop(0, `rgba(255,226,194,${a})`); gr.addColorStop(0.35, `rgba(255,186,124,${a * 0.35})`); gr.addColorStop(1, 'rgba(255,160,90,0)'); xL.fillStyle = gr; xL.fillRect(x0 - r * sk, v - r * sk, 2 * r * sk, 2 * r * sk); } }
    return { albedo: textur(cA), lichter: textur(cL), rauheit: textur(cR, false) };
  })();
  const planetMat = new THREE.MeshPhysicalMaterial({ map: albedo, color: '#ffffff', roughness: 1.0, roughnessMap: rauheit, metalness: 0.0, specularIntensity: 0.6, emissive: '#ffffff', emissiveMap: lichter, emissiveIntensity: 2.6, envMap: env, envMapIntensity: 0.35 });
  planetMat.onBeforeCompile = sh => {
    sh.fragmentShader = sh.fragmentShader.replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
#if NUM_DIR_LIGHTS > 0
  float nlS = dot( normalize( vNormal ), directionalLights[ 0 ].direction );
  // Nachtseite voll, Dämmerung breit; auf der Tagseite glimmen nur die hellsten Stadtkerne (quadratisch)
  vec3 lichtTag = totalEmissiveRadiance * totalEmissiveRadiance * 0.16;
  totalEmissiveRadiance = mix( lichtTag, totalEmissiveRadiance, 1.0 - smoothstep( -0.05, 0.42, nlS ) );
  float nvS = saturate( dot( normal, normalize( vViewPosition ) ) );
  totalEmissiveRadiance += vec3( 0.55, 0.67, 0.84 ) * pow( 1.0 - nvS, 5.0 ) * ( 0.03 + 0.42 * smoothstep( -0.15, 0.5, nlS ) );
#endif`);
  };
  planetMat.customProgramCacheKey = () => 'verkehr-planet';
  const planet = new THREE.Mesh(new THREE.SphereGeometry(RP, hoch ? 64 : 40, hoch ? 40 : 26), planetMat);
  planet.castShadow = planet.receiveShadow = true; planetGruppe.add(planet);

  // ---------- Aktualisieren ----------
  const _m = new THREE.Matrix4(), _p = new V3(), _f = new V3(), _u = new V3(), _s = new V3(), _q = new V3(), _fl = new V3(), _sl = new V3();
  const gruen = (g, t) => mod(g === ringA ? t : t - P / 2, P) < G;
  const cHalt = new THREE.Color('#ff5a1e'), cFrei = new THREE.Color('#fff0d8'), cFeuer = new THREE.Color(F.orange), _col = new THREE.Color();
  return {
    gruppe,
    radius: 0.95,
    anker: new V3(0, 1.0, 0),
    aktualisiere(t, zustand = {}) {
      const aktiv = zustand.aktiv ? 1 : 0;
      planet.rotation.y = t * 0.015;
      // Signale
      const grA = gruen(ringA, t), grB = gruen(ringB, t);
      fahrbahnA.userData.u.uRot.value = grA ? 0 : 1; fahrbahnB.userData.u.uRot.value = grB ? 0 : 1;
      fahrbahnA.userData.u.uAktiv.value = fahrbahnB.userData.u.uAktiv.value = aktiv;
      fahrbahnA.userData.u.uZeit.value = t; fahrbahnB.userData.u.uZeit.value = t + 1.7;
      // Signalleisten: orange = halt, warmweiß = frei; Lichthöfe über den Leisten und auf den Haltebalken
      const hofL = signalHof.geometry.attributes; let h = 0;
      tore.forEach((tr, j) => {
        const gr = tr.g === ringA ? grA : grB, c = gr ? cFrei : cHalt;
        imSignal.setColorAt(j, _col.copy(c).multiplyScalar(gr ? 2.6 : 2.2 + 0.6 * aktiv));   // Halt nicht überstrahlen, sonst kippt Orange ins Gelb
        const hs = gr ? 0.55 : 0.9 + 0.5 * aktiv;
        hofL.position.setXYZ(h, tr.signalPos.x, tr.signalPos.y, tr.signalPos.z); hofL.color.setXYZ(h++, c.r * hs, c.g * hs, c.b * hs);
      });
      for (const bk of balken) {
        const rot = !(bk.g === ringA ? grA : grB), hs = rot ? 0.5 + 0.3 * aktiv : 0;
        hofL.position.setXYZ(h, bk.pos.x, bk.pos.y, bk.pos.z); hofL.color.setXYZ(h++, cHalt.r * hs, cHalt.g * hs, cHalt.b * hs);
      }
      // Blinklicht der Leitstände: kurzer Doppelblitz
      const ph = mod(t, 2.2), blitz = (ph < 0.09 || (ph > 0.28 && ph < 0.37)) ? 1 : 0;
      feuerMat.color.copy(cFeuer).multiplyScalar(0.25 + blitz * 4);
      for (const p of feuerPos) { const hs = blitz * 1.3; hofL.position.setXYZ(h, p.x, p.y, p.z); hofL.color.setXYZ(h++, cFeuer.r * hs, cFeuer.g * hs, cFeuer.b * hs); }
      imSignal.instanceColor.needsUpdate = true; hofL.position.needsUpdate = hofL.color.needsUpdate = true;
      // Tore: bei aktiv leuchtet die ganze Manschette orange
      // Lichtring innen leuchtet, die Keramik außen bleibt Material und nimmt nur einen warmen Schein an
      torInnen.emissiveIntensity = aktiv ? 1.6 : 0; torMat.emissiveIntensity = aktiv ? 0.5 : 0; torMat.color.copy(aktiv ? torAktiv : torFarbe);
      torBand.emissiveIntensity = aktiv ? 1.9 : 0;   // unter ACES bleibt Orange nur bis etwa 2 gesättigt
      // Randleuchten: gedimmt, bei aktiv heller
      const naehe = Math.min(1, Math.max(0, zustand.naehe || 0));
      // bei aktiv: Lauflicht in Fahrtrichtung (wie Anflugbefeuerung), je Ring 7 Pulse mit kurzem Nachleuchten
      { const rc = randHof.geometry.attributes.color, k2 = 0.32 + 0.2 * naehe;
        for (let j = 0; j < randPos.length; j++) {
          let k = k2;
          if (aktiv) { const f = mod(t * 0.9 - randLauf[j] * 7, 1); k = 0.55 + 0.2 * naehe + 2.6 * Math.exp(-f * 9) * Math.min(1, f * 40); }
          rc.setXYZ(j, WEISS.r * k, WEISS.g * k * 0.94, WEISS.b * k * 0.82);
        }
        rc.needsUpdate = true; }
      { const tc = torHof.geometry.attributes.color, k3 = aktiv ? 1.5 : 0; for (let j = 0; j < tore.length; j++) tc.setXYZ(j, ORANGE.r * k3, ORANGE.g * k3, ORANGE.b * k3); tc.needsUpdate = true; }
      planetMat.emissiveIntensity = aktiv ? 3.3 : 2.6;
      fensterMat.color.set(F.glut).multiplyScalar((aktiv ? 2.4 : 1.5) + 0.6 * naehe);
      // Fahrzeuge
      const hof = fzHof.geometry.attributes.position; let i = 0;
      lichtMat.color.setScalar(aktiv ? 1.6 : 1); kegelMat.opacity = aktiv ? 1 : 0.7; fzHof.material.opacity = aktiv ? 1 : 0.62; fzHof.material.color.setScalar(aktiv ? 1.45 : 1);
      for (const sp of spuren) {
        const { N, pos, frames } = sp.sim, g = sp.g, tau = mod(t - sp.off, 2 * P), f = Math.min(frames - 1e-6, tau * FPS), i0 = Math.floor(f), w = f - i0;
        for (let j = 0; j < N; j++, i++) {
          const x0 = pos[i0 * N + j], x1 = pos[(i0 + 1) * N + j], x = x0 + (x1 - x0) * w, v = (x1 - x0) * FPS;
          const th = sp.dir * (mod(x, UMF) - LEN / 2) / R;
          // Ring B im Kreuzungsbereich auf die Höhe von Ring A heben
          const xk = Math.abs(mod(th + Math.PI / 2, Math.PI) - Math.PI / 2) * R;
          const hub = g === ringB ? 0.002 * (1 - Math.min(1, Math.max(0, (xk - 0.16) / 0.03))) : 0;
          punkt(g, th, sp.s, 0.0003 + hub, _p); _u.copy(_p).normalize();
          et(g, th, _f).multiplyScalar(sp.dir); _s.crossVectors(_f, _u);
          _m.makeBasis(_f, _u, _s).setPosition(_p); imFz.setMatrixAt(i, _m); imLicht.setMatrixAt(i, _m);
          const lk = 0.022 + 0.04 * Math.min(1, v / 0.22);
          _q.copy(_p).addScaledVector(_f, LEN / 2 - 0.001).addScaledVector(_u, 0.0006);
          _m.makeBasis(_fl.copy(_f).multiplyScalar(lk), _u, _sl.copy(_s).multiplyScalar(0.015)).setPosition(_q); imKegel.setMatrixAt(i, _m);
          hof.setXYZ(i, _p.x + _u.x * 0.003 + _f.x * 0.004, _p.y + _u.y * 0.003 + _f.y * 0.004, _p.z + _u.z * 0.003 + _f.z * 0.004);
        }
      }
      imFz.instanceMatrix.needsUpdate = imLicht.instanceMatrix.needsUpdate = imKegel.instanceMatrix.needsUpdate = true; hof.needsUpdate = true;
    },
  };
}
