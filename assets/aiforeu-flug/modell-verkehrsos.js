/* AIFOREU · Flug · Station VerkehrsOS
   Schwebende Messplatte: Keramik im dunklen Rahmen, darauf eine Kreuzung als Relief (Fahrbahnen, Markierungen,
   Überwege, orange Haltlinien, Signalmasten), dazu Blockrandbebauung als weißes Architekturmodell (Parzellen,
   abgeschrägte Eckhäuser, gravierte Fensterbänder). Ein heller Lesebalken mit Lichtkante fährt auf Schienen über die
   Platte; seine Lichtlinie liegt auf dem Relief, erkannte Elemente bekommen kurz feine senkrechte Lichtstriche.
   Unten vier Schubdüsen mit kurzer Abgasfahne.
   aktiv: Balken schneller, erkannte Elemente mit orangen Umrissen, Lichtfuge wird orange.
   Zeit: Alles folgt aus t und zustand. Nur der Wechsel ruhig/aktiv wird über die Bildfolge geglättet (Phase und
   Mischwert); bei Zeitsprung (rückwärts oder > 0,5 s) wird direkt aus t neu berechnet, also gleiche Folge = gleiches Bild. */
import { RoundedBoxGeometry } from '../agentario-scene/vendor/RoundedBoxGeometry.js';

export default function erstelle(THREE, k) {
  const F = k.farben, hoch = k.qualitaet !== 'niedrig', PI = Math.PI;
  const Q = (a, b) => hoch ? a : b;   // Segmentzahl je Qualität
  const gruppe = new THREE.Group(); gruppe.name = 'VerkehrsOS';
  const traeger = new THREE.Group(); gruppe.add(traeger);   // Neigung und Schweben
  const platte = new THREE.Group(); traeger.add(platte);     // Planraum: x rechts, z vorn, y oben; Fahrbahn bei y = 0
  const NEIGUNG = 0.25;

  // fester Zufall
  let saat = 0x2f6b1d;
  const zufall = () => { saat = (saat + 0x6D2B79F5) | 0; let t = Math.imul(saat ^ (saat >>> 15), 1 | saat); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };

  // ---------- Maße ----------
  const X = 0.62, RA = 0.70, RR = 0.15, RI = 0.085;   // Keramik halb, Rahmen halb, Eckradien
  const YK = 0.014, YI = 0.011, YF = 0.022, YU = -0.036; // Gehweg, Insel, Rahmen oben, Rahmen unten
  const xs = 0.1, zs = 0.15, RK = 0.07;                 // halbe Breiten Nord-Süd / Ost-West, Bordsteinradius
  const YM = 0.0009;                                    // Markierungen über Fahrbahn

  // ---------- Hilfen ----------
  const v3 = (x, y, z) => new THREE.Vector3(x, y, z);
  const mtx = (x, y, z, ry = 0, rx = 0, rz = 0, s = 1) => new THREE.Matrix4().compose(v3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), typeof s === 'number' ? v3(s, s, s) : v3(...s));
  const netz = (geo, mat, schatten = true, eltern = platte) => { const m = new THREE.Mesh(geo, mat); m.castShadow = m.receiveShadow = schatten; eltern.add(m); return m; };
  const rb = (w, h, d, r, s = 1) => new RoundedBoxGeometry(w, h, d, s, r);

  // Normalen glätten, Kanten über dem Grenzwinkel bleiben hart (Fasen scharf, Rundungen weich)
  function glaette(geo, grad = 30) {
    const a = geo.attributes.position.array, n = a.length / 3, tri = n / 3, grenze = Math.cos(grad * PI / 180);
    const fn = new Float32Array(tri * 3), fu = new Float32Array(tri * 3);
    for (let t = 0; t < tri; t++) {
      const i = t * 9, ux = a[i + 3] - a[i], uy = a[i + 4] - a[i + 1], uz = a[i + 5] - a[i + 2], vx = a[i + 6] - a[i], vy = a[i + 7] - a[i + 1], vz = a[i + 8] - a[i + 2];
      const cx = uy * vz - uz * vy, cy = uz * vx - ux * vz, cz = ux * vy - uy * vx, l = Math.hypot(cx, cy, cz);
      fn[t * 3] = cx; fn[t * 3 + 1] = cy; fn[t * 3 + 2] = cz;
      if (l > 1e-12) { fu[t * 3] = cx / l; fu[t * 3 + 1] = cy / l; fu[t * 3 + 2] = cz / l; }
    }
    const karte = new Map(), schl = v => `${Math.round(a[v * 3] * 2e4)},${Math.round(a[v * 3 + 1] * 2e4)},${Math.round(a[v * 3 + 2] * 2e4)}`;
    const schluessel = new Array(n);
    for (let v = 0; v < n; v++) { const s = schluessel[v] = schl(v); let l = karte.get(s); if (!l) karte.set(s, l = []); l.push((v / 3) | 0); }
    const nor = new Float32Array(n * 3);
    for (let v = 0; v < n; v++) {
      const t = (v / 3) | 0; let x = 0, y = 0, z = 0;
      for (const u of karte.get(schluessel[v])) if (fu[t * 3] * fu[u * 3] + fu[t * 3 + 1] * fu[u * 3 + 1] + fu[t * 3 + 2] * fu[u * 3 + 2] >= grenze) { x += fn[u * 3]; y += fn[u * 3 + 1]; z += fn[u * 3 + 2]; }
      const l = Math.hypot(x, y, z) || 1; nor[v * 3] = x / l; nor[v * 3 + 1] = y / l; nor[v * 3 + 2] = z / l;
    }
    geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
    return geo;
  }
  const kantig = (geo, grad = 30) => { const g = geo.index ? geo.toNonIndexed() : geo; if (g !== geo) geo.dispose(); return glaette(g, grad); };

  // Geometrien zusammenführen (nicht indiziert)
  function verbinde(teile) {
    const gs = teile.map(([geo, m]) => { const g = geo.index ? geo.toNonIndexed() : geo.clone(); if (m) g.applyMatrix4(m); return g; });
    let n = 0; for (const g of gs) n += g.attributes.position.count;
    const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), uv = new Float32Array(n * 2); let o = 0;
    for (const g of gs) { const c = g.attributes.position.count; pos.set(g.attributes.position.array, o * 3); nor.set(g.attributes.normal.array, o * 3); if (g.attributes.uv) uv.set(g.attributes.uv.array, o * 2); o += c; g.dispose(); }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    return geo;
  }

  // Abgerundetes Rechteck in Formkoordinaten (sx = x, sy = -z); r = [unten links, unten rechts, oben rechts, oben links]
  function eckPfad(p, x0, y0, x1, y1, r) {
    const [a, b, c, d] = typeof r === 'number' ? [r, r, r, r] : r;
    p.moveTo(x0 + a, y0);
    p.lineTo(x1 - b, y0); if (b) p.absarc(x1 - b, y0 + b, b, -PI / 2, 0, false);
    p.lineTo(x1, y1 - c); if (c) p.absarc(x1 - c, y1 - c, c, 0, PI / 2, false);
    p.lineTo(x0 + d, y1); if (d) p.absarc(x0 + d, y1 - d, d, PI / 2, PI, false);
    p.lineTo(x0, y0 + a); if (a) p.absarc(x0 + a, y0 + a, a, PI, PI * 1.5, false);
    return p;
  }
  // Rechteck im Planraum (z0 < z1) mit Eckradien je Ecke {x0z0, x1z0, x1z1, x0z1}
  const planForm = (b, p = new THREE.Shape()) => eckPfad(p, b.x0, -b.z1, b.x1, -b.z0, [b.r.x0z1 || 0, b.r.x1z1 || 0, b.r.x1z0 || 0, b.r.x0z0 || 0]);

  // Platte aus Form extrudieren, y0..y1, Fase als echte 45°-Schräge
  function platteGeo(form, y0, y1, fase, kurven = 10) {
    const g = new THREE.ExtrudeGeometry(form, { depth: Math.max(y1 - y0 - 2 * fase, 1e-4), bevelEnabled: fase > 0, bevelThickness: fase, bevelSize: fase, bevelOffset: -fase, bevelSegments: 1, curveSegments: kurven });
    g.rotateX(-PI / 2); g.translate(0, y0 + fase, 0);
    return glaette(g, 30);
  }

  // Leinwand-Textur
  const leinwand = (n, mal) => { const c = document.createElement('canvas'); c.width = c.height = n; const x = c.getContext('2d'); mal(x, n); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; };
  const planAbbild = (t, halb) => { t.repeat.set(1 / (2 * halb), 1 / (2 * halb)); t.offset.set(.5, .5); return t; };

  // Leuchtpunkt
  const glanzTex = leinwand(64, (x) => { const v = x.createRadialGradient(32, 32, 0, 32, 32, 32); v.addColorStop(0, 'rgba(255,255,255,1)'); v.addColorStop(.2, 'rgba(255,255,255,.7)'); v.addColorStop(.5, 'rgba(255,255,255,.14)'); v.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = v; x.fillRect(0, 0, 64, 64); });
  const glanz = (farbe, groesse, deck = 1, eltern = platte) => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glanzTex, color: farbe, transparent: true, opacity: deck, blending: THREE.AdditiveBlending, depthWrite: false })); s.scale.setScalar(groesse); eltern.add(s); return s; };

  // ---------- Lesebalken: Bewegung und Licht im Shader ----------
  const SA = 0.55, SK = 0.985, SAK = Math.asin(SK);       // Hub, Rundung der Umkehr
  const scan = { lage: { value: new THREE.Vector4(0, 0, 1, 1) }, form: { value: new THREE.Vector4(SA, SK, SAK, 1.5) }, farbe: { value: new THREE.Color(F.sonne) }, inv: { value: new THREE.Matrix4() } };
  const planInv = () => scan.inv.value.copy(platte.matrixWorld).invert();
  // Material bekommt die Lichtlinie des Balkens und ein Nachleuchten dort, wo gerade gelesen wurde
  function lesbar(m, erkennung) {
    m.onBeforeCompile = s => {
      Object.assign(s.uniforms, { uScan: scan.lage, uScanForm: scan.form, uScanFarbe: scan.farbe, uPlanInv: scan.inv, uErkennung: { value: erkennung } });
      s.vertexShader = s.vertexShader.replace('#include <common>', '#include <common>\nuniform mat4 uPlanInv;\nvarying vec3 vPlan;')
        .replace('#include <begin_vertex>', `#include <begin_vertex>
          vec4 planPos = vec4(transformed, 1.0);
          #ifdef USE_INSTANCING
            planPos = instanceMatrix * planPos;
          #endif
          vPlan = (uPlanInv * modelMatrix * planPos).xyz;`);
      s.fragmentShader = s.fragmentShader.replace('#include <common>', `#include <common>
          uniform vec4 uScan; uniform vec4 uScanForm; uniform vec3 uScanFarbe; uniform float uErkennung; varying vec3 vPlan;
          float scanSeit(float z) {
            float p = clamp(z / uScanForm.x, -1.0, 1.0);
            float f1 = asin(clamp(sin(p * uScanForm.z) / uScanForm.y, -1.0, 1.0));
            float f2 = 3.14159265 - f1;
            return min(mod(uScan.y - f1, 6.2831853), mod(uScan.y - f2, 6.2831853)) / uScan.z;
          }`)
        .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
          {
            float d = vPlan.z - uScan.x, w = 0.0055;
            float linie = 1.15 * exp(-d * d / (w * w)) + 0.075 * exp(-d * d / (49.0 * w * w));
            float spur = uErkennung * exp(-scanSeit(vPlan.z) / uScanForm.w);
            float maske = step(abs(vPlan.x), 0.632) * step(vPlan.y, 0.112);
            // auf heller Keramik würde Warmweiß im Tonemapping untergehen: dort kräftiger und wärmer
            float hell = smoothstep(0.35, 0.8, dot(diffuseColor.rgb, vec3(0.299, 0.587, 0.114)));
            vec3 farbe = mix(uScanFarbe, vec3(1.0, 0.56, 0.3), hell * 0.6);
            totalEmissiveRadiance += farbe * uScan.w * (linie * (1.0 + 1.3 * hell) + spur) * maske;
          }`);
    };
    m.customProgramCacheKey = () => 'verkehrsos-lesbar';
    return m;
  }
  // Diamantgeschnittene Fasen: Flächen mit Schrägnormalen werden blankes Metall
  function facette(m) {
    m.onBeforeCompile = s => {
      s.vertexShader = s.vertexShader.replace('#include <common>', '#include <common>\nvarying float vFacNy;').replace('#include <beginnormal_vertex>', '#include <beginnormal_vertex>\nvFacNy = objectNormal.y;');
      s.fragmentShader = s.fragmentShader.replace('#include <common>', '#include <common>\nvarying float vFacNy;').replace('#include <metalnessmap_fragment>', `#include <metalnessmap_fragment>
        { float a = abs(vFacNy), f = smoothstep(0.3, 0.45, a) * (1.0 - smoothstep(0.88, 0.96, a));
          diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.8, 0.83, 0.88), f); metalnessFactor = mix(metalnessFactor, 1.0, f); roughnessFactor = mix(roughnessFactor, 0.16, f); }`);
    };
    m.customProgramCacheKey = () => 'verkehrsos-facette';
    return m;
  }
  const lesbarNetz = (geo, mat, schatten = true) => { const m = netz(geo, mat, schatten); m.onBeforeRender = planInv; return m; };
  const ohneWurf = m => { m.castShadow = false; return m; };

  // ---------- Kreuzung: Daten ----------
  // Arme: a = nach außen, rr = rechts der ankommenden Fahrzeuge (Rechtsverkehr)
  const ARME = [
    { a: [-1, 0], rr: [0, 1], q: 'ew' }, { a: [1, 0], rr: [0, -1], q: 'ew' },
    { a: [0, -1], rr: [-1, 0], q: 'ns' }, { a: [0, 1], rr: [1, 0], q: 'ns' },
  ];
  const quer = (hw, o) => { const cw0 = hw === zs ? xs + RK + 0.012 : zs + RK + 0.012, cw1 = cw0 + 0.055, h0 = cw1 + 0.012; return { hw, cw0, cw1, h0, h1: h0 + 0.015, ...o }; };
  const QUER = {
    ew: quer(zs, { ein: [0.02, 0.146], spuren: [[0.02, 0.083, 'GL'], [0.083, 0.146, 'GR']], gleich: [0.083], aus: [-0.083], gegen: null }),
    ns: quer(xs, { ein: [-0.031, 0.094], spuren: [[-0.031, 0.031, 'L'], [0.031, 0.094, 'GR']], gleich: [0.031], aus: [], gegen: -0.031 }),
  };
  const NASE = QUER.ew.cw1 + 0.004;
  const pl = (arm, u, r) => [u * arm.a[0] + r * arm.rr[0], u * arm.a[1] + r * arm.rr[1]];
  const lokalRechteck = (arm, u0, u1, r0, r1) => { const [ax, az] = pl(arm, u0, r0), [bx, bz] = pl(arm, u1, r1); return [Math.min(ax, bx), Math.max(ax, bx), Math.min(az, bz), Math.max(az, bz)]; };
  const BLOECKE = [
    { x0: xs, x1: X, z0: -X, z1: -zs, r: { x0z1: RK, x1z0: RI }, sx: 1, sz: -1 },
    { x0: -X, x1: -xs, z0: -X, z1: -zs, r: { x1z1: RK, x0z0: RI }, sx: -1, sz: -1 },
    { x0: xs, x1: X, z0: zs, z1: X, r: { x0z0: RK, x1z1: RI }, sx: 1, sz: 1 },
    { x0: -X, x1: -xs, z0: zs, z1: X, r: { x1z0: RK, x0z1: RI }, sx: -1, sz: 1 },
  ];
  const INSELN = [
    { x0: -X, x1: -NASE, z0: -0.02, z1: 0.02, r: { x1z0: 0.0198, x1z1: 0.0198 } },
    { x0: NASE, x1: X, z0: -0.02, z1: 0.02, r: { x0z0: 0.0198, x0z1: 0.0198 } },
  ];
  // Gebäude: Blockrand mit Parzellen und abgeschrägtem Eckhaus, wie an einer deutschen Innenstadtkreuzung
  // (Viertelkoordinaten p = |x|, q = |z|, Höhe über Gehweg). Geschoss GH, Höhen als Geschosse plus Attika.
  const R4 = (p0, q0, p1, q1) => [[p0, q0], [p1, q0], [p1, q1], [p0, q1]];
  const GH = 0.0072, HAEUSER = [];
  const haus = (b, poly, geschosse) => HAEUSER.push({ pts: poly.map(([p, q]) => [[1, -1, 1, -1][b] * p, [-1, -1, 1, 1][b] * q]), h: geschosse * GH + 0.0022, b });
  const hz = () => 4 + Math.floor(zufall() * 3);   // 4 bis 6 Geschosse
  // Reihe von Parzellen längs p (an der Ost-West-Straße) oder längs q (an der Nord-Süd-Straße)
  function reihe(b, laengsP, a0, a1, c0, c1, gs) {
    let a = a0;
    while (a1 - a > 0.03) {
      let w = 0.046 + zufall() * 0.03; if (a1 - (a + w) < 0.04) w = a1 - a;
      haus(b, laengsP ? R4(a, c0, a + w, c1) : R4(c0, a, c1, a + w), gs ?? hz()); a += w;
    }
  }
  const P0 = 0.18, Q0 = 0.23, T = 0.078, FA = 0.03;   // Bauflucht, Flügeltiefe, Eckabschrägung
  const eckhaus = (b, g) => haus(b, [[P0, Q0 + FA], [P0 + FA, Q0], [P0 + T + 0.012, Q0], [P0 + T + 0.012, Q0 + T], [P0 + T, Q0 + T], [P0 + T, Q0 + T + 0.012], [P0, Q0 + T + 0.012]], g);
  // Nordost: Eckhaus, zwei Flügel, Hinterhaus
  eckhaus(0, 7); reihe(0, true, P0 + T + 0.012, 0.52, Q0, Q0 + T); reihe(0, false, Q0 + T + 0.012, 0.47, P0, P0 + T);
  haus(0, R4(0.34, 0.39, 0.44, 0.46), 2);
  // Nordwest: Bürohaus auf Sockel mit Scheibe darüber, dahinter ein kleiner Bau
  haus(1, [[P0, Q0 + 0.022], [P0 + 0.022, Q0], [0.49, Q0], [0.49, 0.40], [P0, 0.40]], 2);
  haus(1, R4(0.215, 0.262, 0.43, 0.338), 8);
  haus(1, R4(0.215, 0.46, 0.34, 0.565), 4); haus(1, R4(0.40, 0.47, 0.545, 0.54), 3);
  // Südost: geschlossener Block mit Hof
  eckhaus(2, 7); reihe(2, true, P0 + T + 0.012, 0.565, Q0, Q0 + T); reihe(2, false, Q0 + T + 0.012, 0.555, P0, P0 + T);
  reihe(2, false, Q0 + T, 0.555, 0.565 - T, 0.565, 5);
  haus(2, R4(0.31, 0.37, 0.4, 0.45), 2);
  // Südwest: offener Platz mit Brunnen, Randbebauung nur außen
  reihe(3, true, 0.45, 0.57, Q0, Q0 + T); reihe(3, false, 0.47, 0.57, P0, P0 + T);
  haus(3, R4(0.48, 0.38, 0.57, 0.565), 5);

  // Bordsteinlinie eines Blocks, um w in den Block versetzt (Punkte im Planraum, nur Straßenseiten)
  function bordLinie(b, w) {
    const { sx, sz } = b, cx = sx * (xs + RK), cz = sz * (zs + RK), r = RK - w, pts = [[sx * (xs + w), sz * X]];
    const t0 = Math.atan2(0, -sx), t1 = Math.atan2(-sz, 0); let d = t1 - t0; while (d > PI) d -= 2 * PI; while (d < -PI) d += 2 * PI;
    for (let i = 0; i <= 18; i++) { const t = t0 + d * i / 18; pts.push([cx + r * Math.cos(t), cz + r * Math.sin(t)]); }
    pts.push([sx * X, sz * (zs + w)]); return pts;
  }

  // ---------- Markierungen, Elemente, Lesepunkte ----------
  const weiss = [], orange = [], striche = [], elemente = [];
  const dreieck = (ziel, a, b, c, y) => { const ny = (b[1] - a[1]) * (c[0] - a[0]) - (b[0] - a[0]) * (c[1] - a[1]); if (ny < 0) [b, c] = [c, b]; ziel.push(a[0], y, a[1], b[0], y, b[1], c[0], y, c[1]); };
  const viereck = (ziel, x0, x1, z0, z1, y) => { dreieck(ziel, [x0, z0], [x0, z1], [x1, z1], y); dreieck(ziel, [x0, z0], [x1, z1], [x1, z0], y); };
  const lokalViereck = (ziel, arm, u0, u1, r0, r1, y = YM) => { const [x0, x1, z0, z1] = lokalRechteck(arm, u0, u1, r0, r1); viereck(ziel, x0, x1, z0, z1, y); return [x0, x1, z0, z1]; };
  const strich = (x, z, h, y = YM) => striche.push({ x, y, z, h: h * 1.35 * (0.7 + 0.6 * zufall()) });
  const element = (rect, staerke = 1) => elemente.push({ x0: rect[0], x1: rect[1], z0: rect[2], z1: rect[3], staerke });

  // Pfeil: Polygone in (links, vor) ab Fuß
  const PF = (() => {
    const stiel = (v1) => [[-0.0024, 0], [0.0024, 0], [0.0024, v1], [-0.0024, v1]];
    const kopf = (s, dir, hb) => { const n = [-dir[1], dir[0]]; return [[s[0] + n[0] * hb, s[1] + n[1] * hb], [s[0] - n[0] * hb, s[1] - n[1] * hb], [s[0] + dir[0] * 0.019, s[1] + dir[1] * 0.019]]; };
    const ast = (seite) => { const dir = [0.7 * seite, 0.714], s0 = [0, 0.013], s1 = [s0[0] + dir[0] * 0.02, s0[1] + dir[1] * 0.02], n = [-dir[1] * 0.0024, dir[0] * 0.0024]; return [[[s0[0] + n[0], s0[1] + n[1]], [s0[0] - n[0], s0[1] - n[1]], [s1[0] - n[0], s1[1] - n[1]], [s1[0] + n[0], s1[1] + n[1]]], kopf(s1, dir, 0.0078)]; };
    const gerade = [stiel(0.036), [[-0.0082, 0.034], [0.0082, 0.034], [0, 0.056]]];
    return { G: gerade, GL: [...gerade, ...ast(1)], GR: [...gerade, ...ast(-1)], L: [stiel(0.016), ...ast(1)] };
  })();
  function pfeil(arm, art, uFuss, rMitte) {
    for (const poly of PF[art]) {
      const p = poly.map(([w, v]) => pl(arm, uFuss - v * 1.12, rMitte - w * 1.12));
      for (let i = 1; i < p.length - 1; i++) dreieck(weiss, p[0], p[i], p[i + 1], YM);
    }
    const [x, z] = pl(arm, uFuss - 0.03, rMitte); strich(x, z, 0.065);
  }
  // Linie längs (gestrichelt oder durchgehend) zwischen u0 und u1 bei r
  function laengs(arm, r, u0, u1, breite, strich_, luecke) {
    if (!strich_) { lokalViereck(weiss, arm, u0, u1, r - breite / 2, r + breite / 2); for (let u = u0 + 0.03; u < u1; u += 0.11) { const [x, z] = pl(arm, u, r); strich(x, z, 0.05); } return; }
    let n = 0; for (let u = u0; u + strich_ <= u1 + 1e-6; u += strich_ + luecke, n++) { lokalViereck(weiss, arm, u, u + strich_, r - breite / 2, r + breite / 2); if (n % 2 === 0) { const [x, z] = pl(arm, u + strich_ / 2, r); strich(x, z, 0.05); } }
  }

  for (const arm of ARME) {
    const q = QUER[arm.q], ende = X - 0.006;
    // Fußgängerüberweg (Zebrastreifen)
    const rb0 = -q.hw + 0.008, rb1 = q.hw - 0.008, sb = 0.0115, pitch = 0.023, anz = Math.floor((rb1 - rb0 + (pitch - sb)) / pitch), start = (rb0 + rb1) / 2 - ((anz - 1) * pitch) / 2;
    for (let i = 0; i < anz; i++) { const r = start + i * pitch; lokalViereck(weiss, arm, q.cw0, q.cw1, r - sb / 2, r + sb / 2); const [x, z] = pl(arm, (q.cw0 + q.cw1) / 2, r); strich(x, z, 0.075); }
    element(lokalRechteck(arm, q.cw0 - 0.006, q.cw1 + 0.006, -q.hw + 0.004, q.hw - 0.004));
    // Haltlinie über die ankommenden Streifen
    lokalViereck(orange, arm, q.h0, q.h1, q.ein[0] + 0.002, q.ein[1] - 0.002, YM + 0.0002);
    for (const f of [0.12, 0.5, 0.88]) { const [x, z] = pl(arm, (q.h0 + q.h1) / 2, q.ein[0] + (q.ein[1] - q.ein[0]) * f); strich(x, z, 0.105); }
    element(lokalRechteck(arm, q.h0 - 0.006, q.h1 + 0.006, q.ein[0] + 0.001, q.ein[1] - 0.001));
    // Streifen gleicher Richtung: erst durchgehend, dann Leitlinie
    for (const r of q.gleich) { laengs(arm, r, q.h1, q.h1 + 0.12, 0.0042); laengs(arm, r, q.h1 + 0.15, ende, 0.0034, 0.03, 0.03); }
    for (const r of q.aus) laengs(arm, r, q.cw1 + 0.03, ende, 0.0034, 0.03, 0.03);
    if (q.gegen !== null) { laengs(arm, q.gegen, q.cw1 + 0.008, q.h1 + 0.16, 0.0042); laengs(arm, q.gegen, q.h1 + 0.19, ende, 0.0042, 0.05, 0.035); }
    // Pfeile und Fahrstreifen als Elemente
    for (const [r0, r1, art] of q.spuren) {
      const rm = (r0 + r1) / 2; pfeil(arm, art, q.h1 + 0.088, rm); pfeil(arm, art, q.h1 + 0.235, rm);
      element(lokalRechteck(arm, q.h1 + 0.012, X - 0.014, r0 + 0.005, r1 - 0.005), 0.8);
    }
  }

  // Abbiegeleitlinien (gestrichelte Bögen) für die Linksabbieger, punktsymmetrisch
  {
    const cE = QUER.ew.cw0 - 0.006, cN = QUER.ns.cw0 - 0.006, zl = (QUER.ew.spuren[0][0] + QUER.ew.spuren[0][1]) / 2, xn = (QUER.ns.spuren[1][0] + QUER.ns.spuren[1][1]) / 2;
    const bez = (a, b, c, d, t) => { const u = 1 - t; return [u * u * u * a[0] + 3 * u * u * t * b[0] + 3 * u * t * t * c[0] + t * t * t * d[0], u * u * u * a[1] + 3 * u * u * t * b[1] + 3 * u * t * t * c[1] + t * t * t * d[1]]; };
    const wege = [
      [[-cE, zl], [-cE + 0.15, zl], [xn, -cN + 0.17], [xn, -cN]],   // West nach Nord
      [[0, -cN], [0, -cN + 0.18], [cE - 0.13, zl], [cE, zl]],        // Nord nach Ost
    ];
    for (const sg of [1, -1]) for (const w of wege) {
      const P_ = w.map(([x, z]) => [x * sg, z * sg]), pts = [];
      for (let i = 0; i <= 200; i++) pts.push(bez(...P_, i / 200));
      const lang = [0]; for (let i = 1; i < pts.length; i++) lang.push(lang[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
      const bei = (l) => { let i = 1; while (i < pts.length - 1 && lang[i] < l) i++; const f = (l - lang[i - 1]) / (lang[i] - lang[i - 1] || 1), a = pts[i - 1], b = pts[i]; return { p: [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f], d: [(b[0] - a[0]) / (Math.hypot(b[0] - a[0], b[1] - a[1]) || 1), (b[1] - a[1]) / (Math.hypot(b[0] - a[0], b[1] - a[1]) || 1)] }; };
      const L = lang[lang.length - 1];
      for (const off of [-0.03]) for (let l = 0.014; l + 0.015 < L; l += 0.036) {
        const A = bei(l), B = bei(l + 0.015), n = [-A.d[1], A.d[0]], m = [-B.d[1], B.d[0]], h = 0.0013;
        const a0 = [A.p[0] + n[0] * (off - h), A.p[1] + n[1] * (off - h)], a1 = [A.p[0] + n[0] * (off + h), A.p[1] + n[1] * (off + h)];
        const b0 = [B.p[0] + m[0] * (off - h), B.p[1] + m[1] * (off - h)], b1 = [B.p[0] + m[0] * (off + h), B.p[1] + m[1] * (off + h)];
        dreieck(weiss, a0, a1, b1, YM); dreieck(weiss, a0, b1, b0, YM);
        if (Math.round(l / 0.036) % 2 === 0) { const q = bei(l + 0.008).p, o = [-bei(l + 0.008).d[1] * off, bei(l + 0.008).d[0] * off]; strich(q[0] + o[0], q[1] + o[1], 0.04); }
      }
    }
  }

  // ---------- Texturen ----------
  const N = hoch ? 1024 : 512, P = v => (v + X) / (2 * X) * N, Lg = v => v / (2 * X) * N;
  const pfad = (c, pts) => { c.beginPath(); pts.forEach(([x, z], i) => i ? c.lineTo(P(x), P(z)) : c.moveTo(P(x), P(z))); };
  const rundRechteckLw = (c, b) => { c.beginPath(); c.roundRect(P(b.x0), P(b.z0), Lg(b.x1 - b.x0), Lg(b.z1 - b.z0), [Lg(b.r.x0z0 || 0), Lg(b.r.x1z0 || 0), Lg(b.r.x1z1 || 0), Lg(b.r.x0z1 || 0)]); };

  // Lageplan auf der Keramik: Raster, Gehwegkante, Gebäudeumrisse, Bäume, Leitelemente, Beschriftung
  const planTex = planAbbild(leinwand(N, (c) => {
    const s = N / 1024;
    c.fillStyle = '#e9eff7'; c.fillRect(0, 0, N, N);
    for (let i = -15; i <= 15; i++) { const v = i * 0.04, gross = i % 5 === 0; c.strokeStyle = gross ? 'rgba(58,68,80,.15)' : 'rgba(58,68,80,.065)'; c.lineWidth = s; c.beginPath(); c.moveTo(P(v), 0); c.lineTo(P(v), N); c.moveTo(0, P(v)); c.lineTo(N, P(v)); c.stroke(); }
    c.strokeStyle = 'rgba(40,50,60,.42)'; c.lineWidth = 1.2 * s;
    for (let i = -3; i <= 3; i++) for (let j = -3; j <= 3; j++) { const x = P(i * 0.2), y = P(j * 0.2); c.beginPath(); c.moveTo(x - 5 * s, y); c.lineTo(x + 5 * s, y); c.moveTo(x, y - 5 * s); c.lineTo(x, y + 5 * s); c.stroke(); }
    // Gehwegkante
    c.strokeStyle = 'rgba(52,62,74,.38)'; c.lineWidth = 1.4 * s;
    for (const b of BLOECKE) { pfad(c, bordLinie(b, 0.044)); c.stroke(); }
    // Gebäude (Viertelkoordinaten p = |x|, q = |z|)
    // Kontaktschatten unter den Gebäudekörpern (Dach deckt die Mitte)
    c.filter = `blur(${7 * s}px)`; c.fillStyle = 'rgba(36,44,54,.42)';
    for (const h of HAEUSER) { pfad(c, h.pts); c.closePath(); c.fill(); }
    c.filter = `blur(${2.5 * s}px)`; c.fillStyle = 'rgba(36,44,54,.35)';
    for (const h of HAEUSER) { pfad(c, h.pts); c.closePath(); c.fill(); }
    c.filter = 'none';
    // Grundstücksgrenzen fein gestrichelt
    c.setLineDash([6 * s, 4 * s]); c.strokeStyle = 'rgba(52,62,74,.22)'; c.lineWidth = s;
    for (const b of BLOECKE) { c.beginPath(); c.moveTo(P(b.sx * 0.34), P(b.sz * (zs + 0.06))); c.lineTo(P(b.sx * 0.34), P(b.sz * X)); c.moveTo(P(b.sx * (xs + 0.06)), P(b.sz * 0.39)); c.lineTo(P(b.sx * X), P(b.sz * 0.39)); c.stroke(); }
    c.setLineDash([]);
    // Platz mit Brunnen im Südwesten
    c.strokeStyle = 'rgba(42,52,62,.45)'; c.lineWidth = 1.3 * s; c.beginPath(); c.arc(P(-0.37), P(0.39), Lg(0.05), 0, 2 * PI); c.stroke(); c.beginPath(); c.arc(P(-0.37), P(0.39), Lg(0.028), 0, 2 * PI); c.stroke();
    // Bäume entlang der Gehwege und auf den Inseln
    const baum = (x, z) => { c.beginPath(); c.arc(P(x), P(z), Lg(0.0085), 0, 2 * PI); c.strokeStyle = 'rgba(48,58,70,.26)'; c.lineWidth = s; c.stroke(); c.beginPath(); c.arc(P(x), P(z), 1.1 * s, 0, 2 * PI); c.fillStyle = 'rgba(48,58,70,.32)'; c.fill(); };
    for (const b of BLOECKE) { for (let p = 0.31; p < 0.6; p += 0.075) baum(b.sx * p, b.sz * (zs + 0.022)); for (let q = 0.36; q < 0.6; q += 0.075) baum(b.sx * (xs + 0.022), b.sz * q); }
    for (const sx of [-1, 1]) for (let p = 0.29; p < 0.6; p += 0.075) baum(sx * p, 0);
    // Bodenindikatoren an den Überwegen
    c.fillStyle = 'rgba(150,140,124,.55)';
    for (const arm of ARME) { const q = QUER[arm.q]; for (const sr of [-1, 1]) { const [x0, x1, z0, z1] = lokalRechteck(arm, q.cw0 + 0.004, q.cw1 - 0.004, sr * (q.hw + 0.004), sr * (q.hw + 0.026)); for (let x = x0; x < x1; x += 0.0045) for (let z = z0; z < z1; z += 0.0045) c.fillRect(P(x), P(z), 1.6 * s, 1.6 * s); } }
    // Rand zur Fassung leicht verschattet
    const g = c.createLinearGradient(0, 0, 0, 14 * s); g.addColorStop(0, 'rgba(40,40,40,.18)'); g.addColorStop(1, 'rgba(40,40,40,0)');
    for (let i = 0; i < 4; i++) { c.save(); c.translate(N / 2, N / 2); c.rotate(i * PI / 2); c.translate(-N / 2, -N / 2); c.fillStyle = g; c.fillRect(0, 0, N, 14 * s); c.restore(); }
    // Beschriftung
    c.fillStyle = 'rgba(38,48,58,.72)'; c.font = `600 ${Math.round(12 * s)}px ui-monospace, Menlo, monospace`; c.textBaseline = 'alphabetic';
    c.fillText('KNOTEN 04', P(-0.58), P(-0.585)); c.fillStyle = 'rgba(38,48,58,.5)'; c.font = `500 ${Math.round(10 * s)}px ui-monospace, Menlo, monospace`; c.fillText('LAGEPLAN · BESTAND', P(-0.58), P(-0.565));
    // Maßstabsleiste und Nordpfeil
    const mx = P(0.36), my = P(0.585), ml = Lg(0.18);   // 10 m: Fahrstreifen 0,063 = 3,5 m
    c.fillStyle = 'rgba(38,48,58,.75)'; for (let i = 0; i < 4; i++) if (i % 2 === 0) c.fillRect(mx + i * ml / 4, my, ml / 4, 3 * s);
    c.strokeStyle = 'rgba(38,48,58,.75)'; c.lineWidth = s; c.strokeRect(mx, my, ml, 3 * s);
    c.font = `500 ${Math.round(9 * s)}px ui-monospace, Menlo, monospace`; c.fillText('0', mx - 2 * s, my - 4 * s); c.fillText('10 m', mx + ml - 12 * s, my - 4 * s); c.fillText('M 1:500', mx, my + 14 * s);
    const nx = P(0.56), ny = P(-0.5); c.beginPath(); c.moveTo(nx, ny - 16 * s); c.lineTo(nx + 6 * s, ny + 8 * s); c.lineTo(nx, ny + 3 * s); c.lineTo(nx - 6 * s, ny + 8 * s); c.closePath(); c.fillStyle = 'rgba(38,48,58,.7)'; c.fill();
    c.font = `600 ${Math.round(11 * s)}px ui-monospace, Menlo, monospace`; c.fillText('N', nx - 4 * s, ny - 20 * s);
  }), X);

  // Fahrbahn: Körnung, Bordsteinschatten, Fahrspuren
  const asphaltTex = planAbbild(leinwand(N, (c) => {
    const s = N / 1024;
    c.fillStyle = '#30363f'; c.fillRect(0, 0, N, N);
    for (let i = 0; i < (hoch ? 30000 : 8000); i++) { const x = zufall() * N, y = zufall() * N, h = zufall(); c.fillStyle = h > .55 ? `rgba(255,255,255,${.025 + .05 * zufall()})` : `rgba(0,0,0,${.05 + .09 * zufall()})`; c.fillRect(x, y, 1.3 * s, 1.3 * s); }
    // Fahrspuren der Räder vor den Haltlinien
    c.fillStyle = 'rgba(0,0,0,.07)';
    for (const arm of ARME) { const q = QUER[arm.q]; for (const [r0, r1] of q.spuren) for (const f of [0.28, 0.72]) { const [x0, x1, z0, z1] = lokalRechteck(arm, q.h1 + 0.01, X, r0 + (r1 - r0) * f - 0.006, r0 + (r1 - r0) * f + 0.006); c.fillRect(P(x0), P(z0), Lg(x1 - x0), Lg(z1 - z0)); } }
    // Schatten an Bordsteinen und Inseln
    c.filter = `blur(${4 * s}px)`; c.strokeStyle = 'rgba(0,0,0,.5)'; c.lineWidth = Lg(0.01);
    for (const b of BLOECKE) { pfad(c, bordLinie(b, 0)); c.stroke(); }
    for (const b of INSELN) { rundRechteckLw(c, b); c.stroke(); }
    c.filter = 'none';
  }), X);

  // Fassung: eloxiertes Graphit mit Skalenstrichen und Gravur
  const NR = hoch ? 1024 : 512, PR = v => (v + RA) / (2 * RA) * NR, LR = v => v / (2 * RA) * NR;
  const rahmenTex = planAbbild(leinwand(NR, (c) => {
    const s = NR / 1024;
    c.fillStyle = '#262d36'; c.fillRect(0, 0, NR, NR);
    for (let i = 0; i < NR; i += 2) { c.fillStyle = `rgba(255,255,255,${0.008 + 0.012 * zufall()})`; c.fillRect(0, i, NR, 1); }
    c.fillStyle = 'rgba(196,206,220,.7)';
    for (let i = -30; i <= 30; i++) {
      const v = i * 0.02, gross = i % 5 === 0, l = LR(gross ? 0.022 : 0.012), b = Math.max(1, (gross ? 1.6 : 1.1) * s);
      c.fillRect(PR(v) - b / 2, PR(X + 0.004), b, l); c.fillRect(PR(v) - b / 2, PR(-X - 0.004) - l, b, l);       // vorn, hinten
      c.fillRect(PR(X + 0.004), PR(v) - b / 2, l * .9, b); c.fillRect(PR(-X - 0.004) - l * .9, PR(v) - b / 2, l * .9, b); // rechts, links (innen vor der Schiene)
    }
    c.fillStyle = 'rgba(196,206,220,.62)'; c.font = `600 ${Math.round(12 * s)}px ui-monospace, Menlo, monospace`; c.textAlign = 'center';
    c.fillText('VERKEHRSOS', PR(-0.15), PR(0.672)); c.fillText('KNOTEN 04 · M 1:500', PR(0.2), PR(0.672));
    c.fillText('AIFOREU', PR(0), PR(-0.66));
  }), RA);

  // ---------- Materialien ----------
  const Mp = o => new THREE.MeshPhysicalMaterial(o);
  const mRahmen = facette(Mp({ color: '#262d36', metalness: .55, roughness: .38, clearcoat: .45, clearcoatRoughness: .4 }));
  const mBalkenRahmen = facette(Mp({ color: '#b4bdc9', metalness: .45, roughness: .3, clearcoat: .5, clearcoatRoughness: .22 }));   // helles Eloxal, hebt sich von Fahrbahn und Fassung ab
  const mRahmenKappe = Mp({ color: '#ffffff', map: rahmenTex, metalness: .55, roughness: .38, clearcoat: .45, clearcoatRoughness: .4 });
  const mKeramik = lesbar(Mp({ color: '#e4ebf4', roughness: .5, clearcoat: .3, clearcoatRoughness: .3 }), .018);
  const mKeramikKappe = lesbar(Mp({ color: '#ffffff', map: planTex, roughness: .52, clearcoat: .3, clearcoatRoughness: .3 }), .018);
  // Fassade: ein Feld = ein Geschoss hoch, eine Achse breit; oben im Bild liegt die Geschosskante (Brüstung)
  const fassadeTex = leinwand(128, (c, n) => {
    c.fillStyle = '#ffffff'; c.fillRect(0, 0, n, n);
    c.fillStyle = '#e1e6ec'; c.fillRect(0, 0, n, n * 0.05);                // Geschosskante
    c.fillStyle = '#c7cfd9'; c.fillRect(0, n * 0.34, n, n * 0.36);         // Fensterband
    c.fillStyle = '#b3bdc9'; c.fillRect(0, n * 0.34, n, n * 0.06);         // Sturzschatten
    c.fillStyle = '#e8ecf1'; c.fillRect(0, n * 0.34, n * 0.05, n * 0.36);  // feine Pfosten
  });
  fassadeTex.wrapS = fassadeTex.wrapT = THREE.RepeatWrapping; fassadeTex.repeat.set(1 / 0.014, 1 / GH); fassadeTex.offset.set(0, Math.ceil(1 / GH) - 1 / GH);
  const mFassade = lesbar(Mp({ color: '#e4ebf4', map: fassadeTex, roughness: .55, clearcoat: .2, clearcoatRoughness: .4 }), .018);
  const mFahrbahn = lesbar(Mp({ color: '#ffffff', map: asphaltTex, roughness: .82 }), 0.03);
  const mMarkierung = lesbar(Mp({ color: F.papier, roughness: .5, emissive: F.papier, emissiveIntensity: .05 }), .55);
  const mHalt = lesbar(Mp({ color: F.orange, roughness: .42, emissive: F.orange, emissiveIntensity: .85 }), .5);
  const mStahl = lesbar(Mp({ color: F.stahl, metalness: .85, roughness: .3 }), 0);
  const mStahlFrei = Mp({ color: F.stahl, metalness: .85, roughness: .28 });
  const mGraphit = Mp({ color: F.graphit, metalness: .5, roughness: .45, clearcoat: .3, clearcoatRoughness: .5 });
  const mGraphitMatt = Mp({ color: '#1c222b', metalness: .35, roughness: .62 });
  const mSignal = lesbar(Mp({ color: '#151a21', metalness: .3, roughness: .5 }), 0);
  const mGlas = Mp({ color: '#0a0e14', metalness: .2, roughness: .06, clearcoat: 1, clearcoatRoughness: .04 });
  const mDuese = Mp({ color: '#6c7684', metalness: .9, roughness: .34 });
  const leucht = (farbe, f = 1) => new THREE.MeshBasicMaterial({ color: new THREE.Color(farbe).multiplyScalar(f), toneMapped: false });

  // ---------- Fassung und Keramik ----------
  const kurv = hoch ? 12 : 6;
  const rahmenOben = eckPfad(new THREE.Shape(), -RA, -RA, RA, RA, RR); rahmenOben.holes.push(eckPfad(new THREE.Path(), -X, -X, X, X, RI));
  const rahmenUnten = eckPfad(new THREE.Shape(), -RA + 0.006, -RA + 0.006, RA - 0.006, RA - 0.006, RR - 0.006); rahmenUnten.holes.push(eckPfad(new THREE.Path(), -X, -X, X, X, RI));
  netz(platteGeo(rahmenOben, -0.0075, YF, 0.003, kurv), [mRahmenKappe, mRahmen]);
  netz(platteGeo(rahmenUnten, YU, -0.0125, 0.0025, kurv), mRahmen);
  // Lichtfuge in der Nut zwischen Ober- und Unterteil der Fassung
  const fuge = eckPfad(new THREE.Shape(), -RA + 0.0028, -RA + 0.0028, RA - 0.0028, RA - 0.0028, RR - 0.0028); fuge.holes.push(eckPfad(new THREE.Path(), -RA + 0.012, -RA + 0.012, RA - 0.012, RA - 0.012, RR - 0.012));
  const mFuge = leucht(F.glut, 0.42);
  netz(platteGeo(fuge, -0.0122, -0.0078, 0, kurv), mFuge, false);
  lesbarNetz(platteGeo(eckPfad(new THREE.Shape(), -X, -X, X, X, RI), -0.02, 0, 0, kurv), [mFahrbahn, mFahrbahn]);
  for (const b of BLOECKE) lesbarNetz(platteGeo(planForm(b), 0, YK, 0.0024, kurv), [mKeramikKappe, mKeramik]);
  for (const b of INSELN) lesbarNetz(platteGeo(planForm(b), 0, YI, 0.002, 8), [mKeramikKappe, mKeramik]);
  // Gebäude: Dächer glatt, Fassaden mit gravierten Fensterbändern (Seiten-UVs der Extrusion: u längs Wand, v über Höhe)
  const gruppeAus = (geo, gi) => {
    const g2 = new THREE.BufferGeometry();
    for (const k of ['position', 'normal', 'uv']) {
      const a = geo.attributes[k], n = a.itemSize, arr = [];
      for (const g of geo.groups) if (g.materialIndex === gi) for (let i = g.start * n; i < (g.start + g.count) * n; i++) arr.push(a.array[i]);
      g2.setAttribute(k, new THREE.Float32BufferAttribute(arr, n));
    }
    return g2;
  };
  const hausGeos = HAEUSER.map(h => platteGeo(new THREE.Shape(h.pts.map(([x, z]) => new THREE.Vector2(x, -z))), YK - 0.001, YK + h.h, 0.0016, 1));
  // kein Schlagschatten: die Schattenkarte der Szene ist dafür zu grob (Streifen); Verdeckung ist in den Lageplan gemalt
  ohneWurf(lesbarNetz(verbinde(hausGeos.map(g => [gruppeAus(g, 0)])), mKeramik));
  ohneWurf(lesbarNetz(verbinde(hausGeos.map(g => [gruppeAus(g, 1)])), mFassade));
  hausGeos.forEach(g => g.dispose());
  // Dachaufbauten (Technik) auf den höheren Häusern
  const aufbauten = [];
  for (const h of HAEUSER) {
    if (h.h < 0.03) continue;
    const xs_ = h.pts.map(p => p[0]), zs_ = h.pts.map(p => p[1]), x0 = Math.min(...xs_), x1 = Math.max(...xs_), z0 = Math.min(...zs_), z1 = Math.max(...zs_);
    const n = (x1 - x0) * (z1 - z0) > 0.012 ? 2 : zufall() < 0.5 ? 1 : 0;
    for (let i = 0; i < n; i++) {
      const w = 0.012 + zufall() * 0.008, d = 0.01 + zufall() * 0.006, hh = 0.0045 + zufall() * 0.003;
      const x = x0 + (x1 - x0) * (0.3 + 0.4 * zufall()), z = z0 + (z1 - z0) * (0.3 + 0.4 * zufall());
      aufbauten.push(mtx(x, YK + h.h + hh / 2 - 0.0002, z, 0, 0, 0, [w, hh, d]));
    }
  }
  const aufbauNetz = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), mKeramik, aufbauten.length);
  aufbauten.forEach((m, i) => aufbauNetz.setMatrixAt(i, m)); aufbauNetz.onBeforeRender = planInv; platte.add(aufbauNetz);

  // Markierungen als flache Flächen
  const flaeche = (arr) => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(arr, 3)); const n = new Float32Array(arr.length); for (let i = 1; i < n.length; i += 3) n[i] = 1; g.setAttribute('normal', new THREE.BufferAttribute(n, 3)); return g; };
  lesbarNetz(flaeche(weiss), mMarkierung, false).receiveShadow = true;
  lesbarNetz(flaeche(orange), mHalt, false).receiveShadow = true;

  // Schrauben in der Fassung
  if (hoch) {
    const orte = [];
    for (const v of [-0.56, -0.3, 0.3, 0.56]) orte.push([v, 0.684], [v, -0.684], [0.687, v], [-0.687, v]);
    const kopf = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.0052, 0.0047, 0.0016, 16), mStahlFrei, orte.length);
    const loch = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.0021, 0.0021, 0.0004, 6), leucht('#07090c'), orte.length);
    orte.forEach(([x, z], i) => { kopf.setMatrixAt(i, mtx(x, YF + 0.0004, z)); loch.setMatrixAt(i, mtx(x, YF + 0.0013, z, i * 0.7)); });
    kopf.castShadow = kopf.receiveShadow = true; platte.add(kopf, loch);
  }

  // Ecklampen der Fassung
  const ecklichter = [];
  for (const [sx, sz] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) {
    const x = sx * 0.643, z = sz * 0.643;
    netz(new THREE.CylinderGeometry(0.0075, 0.0082, 0.003, Q(18, 8)).translate(x, YF + 0.0015, z), mGraphit);
    netz(new THREE.SphereGeometry(0.0048, Q(14, 6), Q(8, 3), 0, 2 * PI, 0, PI / 2).translate(x, YF + 0.003, z), leucht(F.glut, .9), false);
    const g = glanz(F.glut, 0.05, 0); g.position.set(x, YF + 0.008, z); ecklichter.push(g);
  }

  // Lagesteuerdüsen an den Rahmenecken (je zwei tangential, eine schräg nach unten)
  const puffs = [];
  const rcsTeile = [], rcsDuesen = [];
  [[1, 1], [-1, 1], [1, -1], [-1, -1]].forEach(([sx, sz], i) => {
    const w = Math.atan2(sz, sx), rr = (RA - RR) * Math.SQRT2 + RR, ry = PI / 2 - w;
    const M = (x, y, z, rx = 0, rz = 0) => new THREE.Matrix4().multiplyMatrices(mtx(Math.cos(w) * rr, 0, Math.sin(w) * rr, ry), mtx(x, y, z, 0, rx, rz));
    rcsTeile.push([rb(0.036, 0.02, 0.016, 0.003, Q(2, 1)), M(0, 0.004, 0.006)]);
    for (const t of [-1, 1]) rcsDuesen.push([new THREE.CylinderGeometry(0.0022, 0.0042, 0.007, Q(12, 6)), M(t * 0.0215, 0.004, 0.008, 0, -t * PI / 2)]);
    rcsDuesen.push([new THREE.CylinderGeometry(0.0022, 0.0042, 0.007, Q(12, 6)), M(0, -0.006, 0.016, -PI * 0.75)]);
    const g = glanz(F.sonne, 0.035, 0); g.position.set(Math.cos(w) * (rr + 0.006) + Math.cos(w + PI / 2) * 0.03, 0.004, Math.sin(w) * (rr + 0.006) + Math.sin(w + PI / 2) * 0.03); puffs.push(g);
  });
  netz(verbinde(rcsTeile), mGraphit); netz(verbinde(rcsDuesen), mDuese);

  // ---------- Signalmasten ----------
  const stahlTeile = [], signalTeile = [], lampen = [];
  ARME.forEach((arm, ai) => {
    const q = QUER[arm.q], th = Math.atan2(arm.a[0], arm.a[1]), R = new THREE.Matrix4().makeRotationY(th);
    const um = q.h1 + 0.014, rm = q.hw + 0.016, yArm = YK + 0.062, rEnde = q.ein[0] + 0.008;
    const L = (m) => new THREE.Matrix4().multiplyMatrices(R, m);
    stahlTeile.push([new THREE.CylinderGeometry(0.0085, 0.0095, 0.0016, Q(16, 8)), L(mtx(rm, YK + 0.0008, um))]);
    stahlTeile.push([new THREE.CylinderGeometry(0.0028, 0.0036, yArm - YK + 0.004, Q(10, 6)), L(mtx(rm, (YK + yArm + 0.004) / 2, um))]);
    stahlTeile.push([new THREE.CylinderGeometry(0.0019, 0.0022, rm - rEnde, 8), L(mtx((rm + rEnde) / 2, yArm, um, 0, 0, PI / 2))]);
    stahlTeile.push([new THREE.CylinderGeometry(0.0012, 0.0012, 0.03, 6), L(mtx(rm - 0.012, yArm - 0.012, um, 0, 0, PI / 4))]);   // Strebe
    signalTeile.push([rb(0.012, 0.007, 0.01, 0.002), L(mtx(rm + 0.001, yArm + 0.008, um + 0.002, 0, -0.5))]);                  // Detektorkamera
    for (const [r0, r1] of q.spuren) {
      const rc = (r0 + r1) / 2, yk = yArm - 0.02;
      stahlTeile.push([new THREE.CylinderGeometry(0.0009, 0.0009, 0.006, 6), L(mtx(rc, yArm - 0.004, um))]);
      signalTeile.push([hoch ? rb(0.0105, 0.029, 0.0085, 0.0018) : new THREE.BoxGeometry(0.0105, 0.029, 0.0085), L(mtx(rc, yk, um))]);
      signalTeile.push([new THREE.BoxGeometry(0.019, 0.036, 0.0012), L(mtx(rc, yk, um - 0.005))]);
      for (let j = 0; j < 3; j++) lampen.push({ m: L(mtx(rc, yk + 0.0088 - j * 0.0088, um + 0.0044)), j, ew: arm.q === 'ew' });
    }
  });
  ohneWurf(lesbarNetz(verbinde(stahlTeile), mStahl));
  ohneWurf(lesbarNetz(verbinde(signalTeile), mSignal));
  const lampenNetz = new THREE.InstancedMesh(new THREE.CircleGeometry(0.0029, Q(14, 6)), new THREE.MeshBasicMaterial({ color: '#ffffff', toneMapped: false }), lampen.length);
  lampen.forEach((l, i) => { lampenNetz.setMatrixAt(i, l.m); lampenNetz.setColorAt(i, new THREE.Color('#111')); });
  platte.add(lampenNetz);

  // ---------- Lesebalken ----------
  const XB = 0.66, YB0 = 0.118, YB1 = 0.132;
  for (const sx of [-1, 1]) {
    netz(rb(0.014, 0.007, 1.18, 0.002).translate(sx * XB, YF + 0.0035, 0), mStahlFrei);
    for (const sz of [-1, 1]) netz(rb(0.026, 0.016, 0.012, 0.003).translate(sx * XB, YF + 0.008, sz * 0.597), mGraphit);
  }
  const balken = new THREE.Group(); platte.add(balken);
  const netzB = (geo, mat) => { const m = netz(geo, mat, false, balken); m.receiveShadow = true; return m; };
  const balkenLeds = [];
  for (const sx of [-1, 1]) {
    netzB(rb(0.042, 0.018, 0.074, 0.004).translate(sx * XB, YF + 0.016, 0), mGraphit);
    netzB(rb(0.044, 0.004, 0.06, 0.0015).translate(sx * XB, YF + 0.026, 0), mStahlFrei);
    netzB(rb(0.022, YB1 - YF - 0.028, 0.03, 0.004).translate(sx * XB, (YB1 + YF + 0.028) / 2, 0), mGraphit);
    netz(new THREE.BoxGeometry(0.0015, 0.004, 0.012).translate(sx * (XB + 0.0215), YF + 0.016, 0.02), leucht(F.orange, 1.6), false, balken);
    const g = glanz(F.orange, 0.035, .8, balken); g.position.set(sx * (XB + 0.024), YF + 0.016, 0.02); balkenLeds.push(g);
  }
  const BZ = 0.019, BL = 0.0072;   // halbe Tiefe des Balkenrahmens, halbe Schlitzbreite
  const ring = eckPfad(new THREE.Shape(), -0.672, -BZ, 0.672, BZ, 0.007); ring.holes.push(eckPfad(new THREE.Path(), -0.637, -BL, 0.637, BL, 0.0028));
  netzB(platteGeo(ring, YB0, YB1, 0.0022, 6), mBalkenRahmen);
  netzB(rb(0.072, 0.02, 0.046, 0.006).translate(0, YB1 + 0.009, 0), mBalkenRahmen);   // Messkopf
  netzB(rb(0.08, 0.004, 0.05, 0.0015).translate(0, YB1 + 0.0005, 0), mGraphit);        // dunkle Fuge unter dem Kopf
  netz(rb(0.048, 0.008, 0.004, 0.0015).translate(0, YB1 + 0.009, 0.0235), mGlas, false, balken);
  const kopfLed = glanz(F.orange, 0.03, .9, balken); kopfLed.position.set(0.028, YB1 + 0.02, 0.018);
  // Lichtkante: Leuchtband im Schlitz, an den Innenkanten und als feine Linie vorn und hinten am Rahmen
  const mKante = leucht(F.sonne, 1.9), mKanteInnen = leucht(F.glut, 1.1), mKanteAussen = leucht(F.sonne, 1.25);
  netz(new THREE.PlaneGeometry(1.272, BL * 1.64).rotateX(PI / 2).translate(0, YB0 + 0.004, 0), mKante, false, balken);
  for (const sz of [-1, 1]) netz(new THREE.BoxGeometry(1.272, 0.0016, 0.0016).translate(0, YB0 + 0.0009, sz * (BL - 0.0006)), mKanteInnen, false, balken);
  for (const sz of [-1, 1]) netz(new THREE.BoxGeometry(1.3, 0.0024, 0.0007).translate(0, YB0 + 0.0047, sz * (BZ + 0.0002)), mKanteAussen, false, balken);
  netz(new THREE.BoxGeometry(1.272, 0.008, 0.0006).translate(0, YB0 + 0.009, 0), leucht('#06080b'), false, balken);
  // Lichtvorhang zwischen Balken und Platte
  const vorhangTex = leinwand(128, (c, n) => {
    const v = c.createLinearGradient(0, 0, 0, n); v.addColorStop(0, 'rgba(255,255,255,.8)'); v.addColorStop(.2, 'rgba(255,255,255,.2)'); v.addColorStop(.8, 'rgba(255,255,255,.07)'); v.addColorStop(1, 'rgba(255,255,255,.22)');
    c.fillStyle = v; c.fillRect(0, 0, n, n); c.globalCompositeOperation = 'destination-in';
    const h = c.createLinearGradient(0, 0, n, 0); h.addColorStop(0, 'rgba(0,0,0,0)'); h.addColorStop(.06, 'rgba(0,0,0,1)'); h.addColorStop(.94, 'rgba(0,0,0,1)'); h.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = h; c.fillRect(0, 0, n, n);
  });
  const mVorhang = new THREE.MeshBasicMaterial({ map: vorhangTex, color: new THREE.Color(F.sonne).multiplyScalar(.2), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  netz(new THREE.PlaneGeometry(1.25, YB0).translate(0, YB0 / 2, 0), mVorhang, false, balken);

  // ---------- Lichtstriche ----------
  const strichMat = new THREE.ShaderMaterial({
    uniforms: { uBreite: { value: 0.0019 } },
    vertexShader: `uniform float uBreite; varying float vY; varying float vX; varying vec3 vFarbe;
      void main() {
        vY = position.y; vX = position.x * 2000.0; vFarbe = vec3(1.0);
        #ifdef USE_INSTANCING_COLOR
          vFarbe = instanceColor;
        #endif
        mat4 mi = mat4(1.0);
        #ifdef USE_INSTANCING
          mi = instanceMatrix;
        #endif
        vec4 a = modelViewMatrix * mi * vec4(0.0, 0.0, 0.0, 1.0), b = modelViewMatrix * mi * vec4(0.0, 1.0, 0.0, 1.0);
        vec3 p = mix(a.xyz, b.xyz, position.y), s = cross(b.xyz - a.xyz, normalize(p));
        float l = length(s); s = l > 1e-9 ? s / l : vec3(1.0, 0.0, 0.0);
        gl_Position = projectionMatrix * vec4(p + s * position.x * 1000.0 * uBreite, 1.0);
      }`,
    fragmentShader: `varying float vY; varying float vX; varying vec3 vFarbe;
      void main() { float h = 1.0 - vY; float a = (h * h * 0.85 + 0.15 * h) * (1.0 - vX * vX * 0.7); gl_FragColor = vec4(vFarbe * a, 1.0); }`,
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
  });
  const strichNetz = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.001, 1).translate(0, 0.5, 0), strichMat, striche.length);
  strichNetz.frustumCulled = false; platte.add(strichNetz);
  // Fußpunkte der Striche
  const fussNetz = new THREE.InstancedMesh(new THREE.CircleGeometry(0.0042, Q(12, 5)).rotateX(-PI / 2), new THREE.MeshBasicMaterial({ map: glanzTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }), striche.length);
  fussNetz.frustumCulled = false; platte.add(fussNetz);
  striche.forEach((p, i) => { fussNetz.setMatrixAt(i, mtx(p.x, p.y + 0.0012, p.z, 0, 0, 0, 1.0)); strichNetz.setColorAt(i, new THREE.Color(0)); fussNetz.setColorAt(i, new THREE.Color(0)); });

  // ---------- Umrisse (aktiv) ----------
  const umrisse = [];
  for (const [ei, e] of elemente.entries()) {
    const w = 0.0034, wb = 0.0072, L = Math.min(0.026, (e.x1 - e.x0) / 3, (e.z1 - e.z0) / 3);
    const cx = (e.x0 + e.x1) / 2, cz = (e.z0 + e.z1) / 2;
    umrisse.push({ e: ei, f: .5, x: cx, z: e.z0, sx: e.x1 - e.x0, sz: w }, { e: ei, f: .5, x: cx, z: e.z1, sx: e.x1 - e.x0, sz: w }, { e: ei, f: .5, x: e.x0, z: cz, sx: w, sz: e.z1 - e.z0 }, { e: ei, f: .5, x: e.x1, z: cz, sx: w, sz: e.z1 - e.z0 });
    for (const [x, z, dx, dz] of [[e.x0, e.z0, 1, 1], [e.x1, e.z0, -1, 1], [e.x1, e.z1, -1, -1], [e.x0, e.z1, 1, -1]]) {
      umrisse.push({ e: ei, f: 1, x: x + dx * L / 2, z, sx: L, sz: wb }, { e: ei, f: 1, x, z: z + dz * L / 2, sx: wb, sz: L });
    }
  }
  const umrissNetz = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1).rotateX(-PI / 2), new THREE.MeshBasicMaterial({ transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }), umrisse.length);
  umrisse.forEach((u, i) => { umrissNetz.setMatrixAt(i, mtx(u.x, 0.0024, u.z, 0, 0, 0, [u.sx, 1, u.sz])); umrissNetz.setColorAt(i, new THREE.Color(0)); });
  umrissNetz.frustumCulled = false; platte.add(umrissNetz);
  // zarte Flächenfüllung der erkannten Elemente: trägt den Aktiv-Zustand auch bei 200 px
  const fuellTex = leinwand(64, (c, n) => {   // innen schwach, zum Rand hin kräftiger: wirkt als Licht, nicht als Farbe
    const id = c.createImageData(n, n);
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) { const d = Math.min(x, y, n - 1 - x, n - 1 - y) / (n / 2), v = Math.round(255 * (0.32 + 0.68 * Math.exp(-d * 9))); id.data.set([v, v, v, 255], (y * n + x) * 4); }
    c.putImageData(id, 0, 0);
  });
  fuellTex.colorSpace = THREE.NoColorSpace;   // Werte linear verwenden
  const fuellNetz = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1).rotateX(-PI / 2), new THREE.MeshBasicMaterial({ map: fuellTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }), elemente.length);
  elemente.forEach((e, i) => { fuellNetz.setMatrixAt(i, mtx((e.x0 + e.x1) / 2, 0.002, (e.z0 + e.z1) / 2, 0, 0, 0, [e.x1 - e.x0, 1, e.z1 - e.z0])); fuellNetz.setColorAt(i, new THREE.Color(0)); });
  fuellNetz.frustumCulled = false; platte.add(fuellNetz);

  // ---------- Unterbau mit Schubdüsen ----------
  netz(platteGeo(eckPfad(new THREE.Shape(), -0.6, -0.6, 0.6, 0.6, 0.13), -0.064, YU, 0.006, kurv), mGraphitMatt);
  const nabe = kantig(new THREE.LatheGeometry([[0.0001, -0.09], [0.055, -0.09], [0.074, -0.082], [0.085, -0.072], [0.085, -0.064]].map(([r, y]) => new THREE.Vector2(r, y)), Q(40, 18)));
  netz(nabe, mGraphit);
  netz(new THREE.SphereGeometry(0.034, Q(28, 14), Q(10, 5), 0, 2 * PI, PI / 2, PI / 2).translate(0, -0.089, 0), mGlas);
  netz(new THREE.TorusGeometry(0.036, 0.0022, Q(6, 4), Q(40, 18)).rotateX(PI / 2).translate(0, -0.09, 0), mStahlFrei);
  const rippen = [];
  for (const [sx, sz] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) rippen.push([rb(0.5, 0.012, 0.022, 0.003), mtx(sx * 0.25, -0.07, sz * 0.25, Math.atan2(-sz, sx))]);
  netz(verbinde(rippen), mGraphit);
  const gehaeuseGeo = kantig(new THREE.LatheGeometry([[0.016, -0.032], [0.021, -0.03], [0.04, -0.028], [0.046, -0.022], [0.046, -0.005], [0.041, 0], [0.0001, 0]].map(([r, y]) => new THREE.Vector2(r, y)), Q(32, 14)));
  const glockeGeo = kantig(new THREE.LatheGeometry([[0.03, -0.074], [0.025, -0.064], [0.0185, -0.051], [0.0138, -0.038], [0.0122, -0.03], [0.0102, -0.032], [0.0114, -0.04], [0.0162, -0.052], [0.0226, -0.065], [0.0274, -0.0745], [0.03, -0.074]].map(([r, y]) => new THREE.Vector2(r, y)), Q(32, 14)), 40);
  // Abgasfahne: offener Kegel, hell an der Düse, zum Ende orange und durchsichtig; Ränder weich über den Blickwinkel
  const FL = 0.2, fahneGeo = new THREE.CylinderGeometry(0.022, 0.062, FL, Q(28, 12), 1, true).translate(0, -FL / 2, 0);
  const fahneMat = new THREE.ShaderMaterial({
    uniforms: { uStaerke: { value: 1 }, uA: { value: new THREE.Color(F.sonne) }, uB: { value: new THREE.Color(F.glut).lerp(new THREE.Color(F.orange), 0.45) } },
    vertexShader: `varying float vH; varying float vF;
      void main() { vH = clamp(-position.y / ${FL.toFixed(3)}, 0.0, 1.0);
        vec4 mv = modelViewMatrix * vec4(position, 1.0); vF = abs(dot(normalize(normalMatrix * normal), normalize(-mv.xyz)));
        gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform float uStaerke; uniform vec3 uA; uniform vec3 uB; varying float vH; varying float vF;
      void main() { float a = pow(1.0 - vH, 2.4) * pow(vF, 2.2) * uStaerke * smoothstep(0.0, 0.06, vH + 0.02);
        gl_FragColor = vec4(mix(uA, uB, smoothstep(0.0, 0.55, vH)) * a, 1.0); }`,
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
  });
  const duesen = [];
  for (const [sx, sz] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) {
    const d = new THREE.Group(); d.position.set(sx * 0.43, -0.064, sz * 0.43);
    d.rotation.set(sz * 0.16, 0, -sx * 0.16); platte.add(d);
    netz(gehaeuseGeo, mGraphit, true, d); netz(glockeGeo, mDuese, true, d);
    netz(new THREE.CircleGeometry(0.0115, Q(20, 8)).rotateX(PI / 2).translate(0, -0.034, 0), leucht(F.glut, 1.5), false, d);
    for (let i = 0; i < 6; i++) { const w = i / 6 * 2 * PI; netz(new THREE.BoxGeometry(0.004, 0.018, 0.006).rotateY(-w).translate(Math.cos(w) * 0.0475, -0.014, Math.sin(w) * 0.0475), mDuese, false, d); }
    const g1 = glanz(F.glut, 0.085, .8, d); g1.position.y = -0.08;
    const g2 = glanz(F.orange, 0.2, .25, d); g2.position.y = -0.11;
    const fahne = new THREE.Mesh(fahneGeo, fahneMat.clone()); fahne.position.y = -0.073; fahne.renderOrder = 2; d.add(fahne);
    duesen.push([g1, g2, fahne]);
  }

  // ---------- Zeitlauf ----------
  const OM_RUHE = 2 * PI / 10.5, OM_AKTIV = 2 * PI / 4.2;
  const lage = phi => SA * Math.asin(SK * Math.sin(phi)) / SAK;
  const mod2pi = v => ((v % (2 * PI)) + 2 * PI) % (2 * PI);
  const seitBei = (z, phi, om) => { const p = Math.max(-1, Math.min(1, z / SA)), f1 = Math.asin(Math.max(-1, Math.min(1, Math.sin(p * SAK) / SK))), f2 = PI - f1; return Math.min(mod2pi(phi - f1), mod2pi(phi - f2)) / om; };
  const intern = { tAlt: null, phi: 0, mix: 0 };
  const hilfM = new THREE.Matrix4(), hilfC = new THREE.Color(), warm = new THREE.Color(F.sonne), ora = new THREE.Color(F.orange);
  const fugeRuhe = new THREE.Color(F.glut).multiplyScalar(0.42), fugeAktiv = new THREE.Color(F.orange).multiplyScalar(0.95);
  const LAMPE = [new THREE.Color(F.orange).multiplyScalar(1.7), new THREE.Color(F.glut).multiplyScalar(1.6), new THREE.Color(F.sonne).multiplyScalar(1.5)], AUS = new THREE.Color('#161b22');

  function aktualisiere(t, zustand = {}) {
    const ziel = zustand.aktiv ? 1 : 0, nah = zustand.naehe || 0;
    const dt = intern.tAlt === null ? -1 : t - intern.tAlt;
    if (dt < 0 || dt > 0.5) { intern.mix = ziel; intern.phi = (ziel ? OM_AKTIV : OM_RUHE) * (t - 2) + 0.3; }
    else { intern.mix += (ziel - intern.mix) * (1 - Math.exp(-dt * 2.4)); intern.phi += (OM_RUHE + (OM_AKTIV - OM_RUHE) * intern.mix) * dt; }
    intern.tAlt = t;
    const mix = intern.mix, phi = intern.phi, om = OM_RUHE + (OM_AKTIV - OM_RUHE) * mix, s = lage(phi), tau = 1.4 - 0.5 * mix, tauS = 0.8 - 0.3 * mix;

    // Schweben
    traeger.position.y = 0.012 * Math.sin(t * 0.85);
    traeger.rotation.x = NEIGUNG + 0.012 * Math.sin(t * 0.6 + 0.5);
    traeger.rotation.z = 0.009 * Math.sin(t * 0.47 + 1.2);

    // Balken und Licht
    balken.position.z = s;
    scan.lage.value.set(s, phi, om, 1 + 0.35 * mix + 0.2 * nah);
    scan.form.value.w = tau;
    mVorhang.opacity = 0.75 + 0.35 * mix;
    mFuge.color.copy(fugeRuhe).lerp(fugeAktiv, mix);

    // Lichtstriche
    for (let i = 0; i < striche.length; i++) {
      const p = striche[i], d = seitBei(p.z, phi, om), auf = Math.min(1, d / 0.14), sicht = Math.exp(-d / tauS);
      const h = p.h * (0.12 + 0.88 * (1 - (1 - auf) ** 3)) * (sicht > 0.01 ? 1 : 0.001);
      strichNetz.setMatrixAt(i, hilfM.makeScale(1, h, 1).setPosition(p.x, p.y, p.z));
      const st = sicht * (1 + 0.9 * (1 - auf)) * (0.95 + 0.25 * mix);
      strichNetz.setColorAt(i, hilfC.copy(warm).multiplyScalar(st * 1.05));
      fussNetz.setColorAt(i, hilfC.copy(warm).multiplyScalar(st * 0.45));
    }
    strichNetz.instanceMatrix.needsUpdate = true; strichNetz.instanceColor.needsUpdate = true; fussNetz.instanceColor.needsUpdate = true;

    // Umrisse
    umrissNetz.visible = fuellNetz.visible = mix > 0.005;
    if (umrissNetz.visible) {
      const blitz = elemente.map(e => { const d = (s >= e.z0 && s <= e.z1) ? 0 : Math.min(seitBei(e.z0, phi, om), seitBei(e.z1, phi, om)); return Math.exp(-d / 1.1); });
      umrisse.forEach((u, i) => umrissNetz.setColorAt(i, hilfC.copy(ora).multiplyScalar(mix * u.f * elemente[u.e].staerke * (0.55 + 0.9 * blitz[u.e]) * 1.4)));
      elemente.forEach((e, i) => fuellNetz.setColorAt(i, hilfC.copy(ora).multiplyScalar(mix * e.staerke * (0.085 + 0.28 * blitz[i]))));
      umrissNetz.instanceColor.needsUpdate = true; fuellNetz.instanceColor.needsUpdate = true;
    }

    // Signale: Ost-West und Nord-Süd im Wechsel
    const c = ((t % 16) + 16) % 16, phase = (offen, gelb) => (c >= offen[0] && c < offen[1]) ? 2 : (c >= gelb[0] && c < gelb[1]) ? 1 : 0;
    const pe = phase([0, 6.5], [6.5, 7.5]), pn = phase([8, 14.5], [14.5, 15.5]);
    lampen.forEach((l, i) => lampenNetz.setColorAt(i, (l.ew ? pe : pn) === l.j ? LAMPE[l.j] : AUS));
    lampenNetz.instanceColor.needsUpdate = true;

    // Düsen, Lampen
    duesen.forEach(([g1, g2, fahne], i) => {
      const f = 0.78 + 0.1 * Math.sin(t * 23 + i * 1.7) + 0.07 * Math.sin(t * 37.3 + i * 2.9) + 0.05 * Math.sin(t * 5.1 + i);
      g1.material.opacity = f * (0.8 + 0.15 * nah + 0.1 * mix); g2.material.opacity = f * (0.24 + 0.1 * mix);
      fahne.material.uniforms.uStaerke.value = f * (0.5 + 0.25 * nah + 0.12 * mix); fahne.scale.set(1, 0.92 + 0.1 * f, 1);
    });
    const b = ((t % 2.8) + 2.8) % 2.8, blink = (b < 0.07 || (b > 0.22 && b < 0.29)) ? 1 : 0;
    ecklichter.forEach((g, i) => { g.material.opacity = 0.25 + 0.75 * (i % 2 ? blink : (((t + 1.4) % 2.8 + 2.8) % 2.8 < 0.07 ? 1 : 0)); });
    puffs.forEach((g, i) => { const f = Math.max(0, Math.sin(t * 0.7 + i * 1.9)) ** 60; g.material.opacity = f * 0.9; g.scale.setScalar(0.02 + 0.03 * f); });
    const led = (((t * (1 + mix)) % 1.2) + 1.2) % 1.2 < 0.12 ? 1 : 0.35;
    balkenLeds.forEach(g => g.material.opacity = led); kopfLed.material.opacity = 0.4 + 0.6 * led;
  }
  aktualisiere(0, { aktiv: false, naehe: 0 }); intern.tAlt = null;

  return { gruppe, radius: 1, anker: new THREE.Vector3(0, 0.62, 0), aktualisiere };
}
