/* AIFOREU · Startseite · Stealth-Flug durchs All.
   Das AIFOREU-Zeichen fliegt als Nurflügler zwischen den Dingen, die AIFOREU baut: VerkehrsAI mit VerkehrsOS,
   Autonomous Workforce mit Voice, AnyUse und IVE. Er fliegt die Stationen nacheinander an, umkreist jede,
   die Kamera folgt wie in einem Film. Klick auf eine Station: der Flieger dreht ab und fliegt dorthin.
   Schnittstelle wie aiforeu-world/world.js: mountWorld(host) auf section[data-world]; nutzt [data-world-stage],
   [data-world-fallback] und [data-world-detail] aus dem Markup der Seite. */
import { THREE, FARBEN, erstelleUmgebung, erstelleLicht, erstelleSterne, erstelleRenderer, leuchtpunkt, entsorge } from './basis.js';

const STATIONEN = [
  { id: 'verkehr', titel: 'VerkehrsAI', art: 'Bereich', text: 'Lage- und Signalpläne erschließen, prüfen und weiterbearbeiten.', href: 'verkehrsai.html', pos: [-11.61, 0.54, -2.16], r: 2.7 },
  { id: 'verkehrsos', titel: 'VerkehrsOS', art: 'Produkt', text: 'Kreuzungen verstehen. Fundiert weiterplanen.', href: 'verkehrsos.html', pos: [-5.94, -2.29, 4.59], r: 1.15 },
  { id: 'voice', titel: 'Voice', art: 'Agentario', text: 'Gespräche, aus denen Arbeit wird.', href: 'agentario/voice/', pos: [6.21, -2.43, 4.46], r: 1.15 },
  { id: 'workforce', titel: 'Autonomous Workforce', art: 'Bereich', text: 'Agentario verbindet Voice, Desktop und Workflows für wiederkehrende Arbeit.', href: 'autonomous-workforce.html', pos: [11.34, 0.94, -2.97], r: 2.9 },
  { id: 'anyuse', titel: 'AnyUse', art: 'Projekt', text: 'Aus wiederkehrender Arbeit werden konkrete Vorschläge.', href: 'anyuse.html', pos: [3.24, 4.19, -11.34], r: 1.25 },
  { id: 'ive', titel: 'IVE', art: 'Projekt', text: 'Mehrere Coding-Agenten. Ein klarer Überblick.', href: 'ive.html', pos: [-4.32, 3.65, -10.67], r: 1.25 },
];
const FLIEGER_GROESSE = .8;            // Spannweite in der Szene = 2 × Größe
const REISE = 5.2, KREIS = 2.6;        // Fluggeschwindigkeit (Einheiten/s): unterwegs und beim Umkreisen
const KREIS_WINKEL = Math.PI * 1.15;   // wie weit der Flieger eine Station umrundet
const instanzen = new WeakMap();

/* Platzhalter, solange ein Modell fehlt: schlichte Körper, damit die Szene immer läuft. */
let strahlTex = null;
/* Hitzefahne hinter einem flachen Auslass: quer weich (heiße Mitte), längs vom Auslass weg ausblendend. */
function strahlTextur() {
  if (strahlTex) return strahlTex;
  const daten = new Uint8Array(64 * 256 * 4);                              // Zeile 255 = Auslass (v = 1 oben an der Fläche)
  for (let j = 0; j < 256; j++) for (let i = 0; i < 64; i++) {
    const q = Math.abs(i - 31.5) / 32, l = (255 - j) / 255;               // q quer 0..1, l längs 0 (Auslass) .. 1
    const quer = Math.exp(-q * q * (5 + 9 * (1 - l))), laengs = Math.pow(1 - l, 1.7) * Math.min(1, (255 - j) / 10 + .35);
    const kern = Math.exp(-q * q * 40) * Math.pow(1 - l, 5);              // heiße weiße Mitte direkt am Auslass
    const a = Math.min(1, quer * laengs * .85 + kern), p = (j * 64 + i) * 4;
    daten[p] = 255; daten[p + 1] = Math.round(210 + 45 * kern); daten[p + 2] = Math.round(170 + 85 * kern); daten[p + 3] = Math.round(a * 255);
  }
  strahlTex = new THREE.DataTexture(daten, 64, 256, THREE.RGBAFormat);
  strahlTex.colorSpace = THREE.SRGBColorSpace; strahlTex.magFilter = THREE.LinearFilter; strahlTex.minFilter = THREE.LinearMipmapLinearFilter;
  strahlTex.generateMipmaps = true; strahlTex.needsUpdate = true; return strahlTex;
}

function platzhalter(id, k) {
  const g = new THREE.Group();
  const mat = new THREE.MeshPhysicalMaterial({ color: k.farben.stahl, metalness: .6, roughness: .35 });
  if (id === 'flieger') {
    const form = new THREE.Shape(); const p = [[128, 24], [236, 148], [200, 128], [176, 148], [128, 116], [80, 148], [56, 128], [20, 148]];
    p.forEach(([x, y], i) => { const X = (x - 128) / 108, Y = (88 - y) / 108; i ? form.lineTo(X, Y) : form.moveTo(X, Y); });
    const geo = new THREE.ExtrudeGeometry(form, { depth: .06, bevelEnabled: true, bevelSize: .015, bevelThickness: .015, bevelSegments: 2 });
    geo.rotateX(-Math.PI / 2); geo.translate(0, -.03, 0);
    const m = new THREE.Mesh(geo, new THREE.MeshPhysicalMaterial({ color: k.farben.graphit, metalness: .55, roughness: .35, clearcoat: .6 })); m.castShadow = true; g.add(m);
    return { gruppe: g, radius: 1.05, anker: new THREE.Vector3(0, .3, 0), duesen: [{ position: new THREE.Vector3(-.12, .02, -.36), richtung: new THREE.Vector3(0, 0, -1) }, { position: new THREE.Vector3(.12, .02, -.36), richtung: new THREE.Vector3(0, 0, -1) }], spitzen: [new THREE.Vector3(-1, 0, -.56), new THREE.Vector3(1, 0, -.56)], aktualisiere() {} };
  }
  const m = new THREE.Mesh(new THREE.IcosahedronGeometry(.8, 2), mat); m.castShadow = m.receiveShadow = true; g.add(m);
  return { gruppe: g, radius: 1, anker: new THREE.Vector3(0, 1.05, 0), aktualisiere(t) { m.rotation.y = t * .2; } };
}

async function ladeModell(id, k) {
  try {
    const mod = await import(new URL(`./modell-${id}.js`, import.meta.url).href);
    const m = mod.default(THREE, k);
    if (!m || !m.gruppe) throw new Error('kein Modell');
    m.radius ||= 1; m.anker ||= new THREE.Vector3(0, m.radius * 1.05, 0);
    return m;
  } catch (fehler) { return platzhalter(id, k); }
}

/* Hintergrund: sehr dunkle Kuppel mit leichtem warmem Schimmer zur Sonne und kühlem Gegenpol. */
function erstelleKuppel() {
  const c = document.createElement('canvas'); c.width = 1024; c.height = 512; const x = c.getContext('2d');
  x.fillStyle = '#03060b'; x.fillRect(0, 0, 1024, 512);
  const fleck = (cx, cy, r, farbe) => { const v = x.createRadialGradient(cx, cy, 0, cx, cy, r); v.addColorStop(0, farbe); v.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = v; x.fillRect(0, 0, 1024, 512); };
  fleck(770, 200, 300, 'rgba(120,70,40,.32)'); fleck(820, 215, 120, 'rgba(255,170,110,.16)');
  fleck(230, 290, 360, 'rgba(40,60,95,.30)'); fleck(520, 120, 260, 'rgba(30,40,60,.20)');
  // Milchstraße: schräges Band aus weichen Wolken (kühl, zur Sonne hin warm), darüber dunkle Staubbahnen. Fester Startwert.
  let saat = 7; const zufall = () => (saat = (saat * 16807) % 2147483647) / 2147483647;
  const klein = document.createElement('canvas'); klein.width = 272; klein.height = 128; const kx = klein.getContext('2d');   // 8 px Rand je Seite mit umlaufendem Inhalt
  const wolke = (cx, cy, r, farbe) => { cx = cx / 4 + 8; cy /= 4; r /= 4; const v = kx.createRadialGradient(cx, cy, 0, cx, cy, r); v.addColorStop(0, farbe); v.addColorStop(1, 'rgba(0,0,0,0)'); kx.fillStyle = v; kx.fillRect(cx - r, cy - r, r * 2, r * 2); };
  const band = u => 256 + Math.sin(u / 1024 * Math.PI * 2 + .6) * 120;
  for (let i = 0; i < 300; i++) {
    const u = zufall() * 1024, quer = (zufall() + zufall() + zufall() - 1.5) * 34, r = 24 + zufall() * 64, warm = Math.max(0, 1 - Math.abs(u - 780) / 260);
    const a = (.03 + zufall() * .04) * (1 - Math.abs(quer) / 60);
    const farbe = warm > .3 && zufall() < warm ? `rgba(150,118,92,${a.toFixed(3)})` : `rgba(${110 + zufall() * 30 | 0},${124 + zufall() * 30 | 0},${150 + zufall() * 30 | 0},${a.toFixed(3)})`;
    for (const dx of [-1024, 0, 1024]) wolke(u + dx, band(u) + quer, r, farbe);
  }
  for (let i = 0; i < 110; i++) {
    const u = zufall() * 1024, quer = (zufall() - .5) * 18, r = 12 + zufall() * 26;
    for (const dx of [-1024, 0, 1024]) wolke(u + dx, band(u) + quer, r, `rgba(3,6,11,${(.25 + zufall() * .3).toFixed(3)})`);
  }
  x.imageSmoothingEnabled = true; x.imageSmoothingQuality = 'high'; x.drawImage(klein, 8, 0, 256, 128, 0, 0, 1024, 512);   // Quelle ohne Rand: weich hochskaliert, ohne Naht an u = 0
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.mapping = THREE.EquirectangularReflectionMapping;
  const kuppel = new THREE.Mesh(new THREE.SphereGeometry(400, 48, 24), new THREE.MeshBasicMaterial({ map: t, side: THREE.BackSide, depthWrite: false, fog: false }));
  kuppel.rotation.y = -Math.PI * .35; return kuppel;
}

/* Großer Planet weit unten: dunkler Körper und ein Atmosphärenrand, der zur Sonne hin warm leuchtet. Gibt Maßstab. */
function erstelleHorizont(sonnenRichtung) {
  const g = new THREE.Group();
  const c = document.createElement('canvas'); c.width = 512; c.height = 256; const x = c.getContext('2d');
  x.fillStyle = '#05070a'; x.fillRect(0, 0, 512, 256);
  for (let i = 0; i < 2600; i++) { const v = 4 + Math.random() * 9; x.fillStyle = `rgba(${v + 3},${v + 4},${v + 7},.55)`; x.fillRect(Math.random() * 512, Math.random() * 256, 1 + Math.random() * 3, 1); }
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  const koerper = new THREE.Mesh(new THREE.SphereGeometry(170, 128, 64), new THREE.MeshBasicMaterial({ map: tex, color: '#9aa3b3', fog: false }));
  const rand = new THREE.Mesh(new THREE.SphereGeometry(173, 128, 64), new THREE.ShaderMaterial({
    uniforms: { warm: { value: new THREE.Color(FARBEN.glut) }, kuehl: { value: new THREE.Color('#6f8fc2') }, sonne: { value: sonnenRichtung.clone().normalize() } },
    vertexShader: 'varying vec3 vN; varying vec3 vV; void main(){ vec4 w = modelMatrix * vec4(position,1.0); vN = normalize(mat3(modelMatrix) * normal); vV = normalize(cameraPosition - w.xyz); gl_Position = projectionMatrix * viewMatrix * w; }',
    fragmentShader: 'uniform vec3 warm; uniform vec3 kuehl; uniform vec3 sonne; varying vec3 vN; varying vec3 vV; void main(){ float f = pow(1.0 - max(dot(vN, vV), 0.0), 6.0); float l = dot(vN, sonne) * .5 + .5; vec3 c = mix(kuehl * .5, warm, smoothstep(.4, .95, l)); gl_FragColor = vec4(c * f * (0.35 + 2.2 * l), f); }',
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.FrontSide, fog: false,
  }));
  // tief unter der Übersichtskamera: nur der obere Rand steht als Horizont im unteren Bilddrittel
  g.add(koerper, rand); g.position.set(-46, -360, -180); return g;
}

/* Abgasspur hinter einem Auslass: Band, das sich zur Kamera dreht, nach hinten schmaler und dunkler wird (additiv).
   Punkte werden nach Zeit abgetastet (60 je Sekunde), damit die Spur bei jeder Bildrate gleich lang ist. */
function erstelleSpur(laenge, farbe, staerke, breite) {
  const pos = new Float32Array(laenge * 6), col = new Float32Array(laenge * 6), idx = [];
  for (let i = 0; i < laenge - 1; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('color', new THREE.BufferAttribute(col, 3)); geo.setIndex(idx);
  const linie = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false }));
  linie.frustumCulled = false; linie.visible = false; linie.name = 'flug-spur';
  const c = new THREE.Color(farbe), punkte = [], tan = new THREE.Vector3(), zur = new THREE.Vector3(), quer = new THREE.Vector3();
  let leer = true, rest = 0;
  return {
    linie,
    leeren() { leer = true; punkte.length = 0; linie.visible = false; rest = 0; },
    setze(p, dt, auge) {
      if (leer) { for (let i = 0; i < laenge; i++) punkte.push(p.clone()); leer = false; }
      rest += dt;
      while (rest >= 1 / 60) { rest -= 1 / 60; const alt = punkte.pop(); alt.copy(punkte[0]); punkte.unshift(alt); }
      punkte[0].copy(p);
      for (let i = 0; i < laenge; i++) {
        const q = punkte[i], f = i / (laenge - 1);
        tan.copy(punkte[Math.max(0, i - 1)]).sub(punkte[Math.min(laenge - 1, i + 1)]);
        if (tan.lengthSq() < 1e-10) tan.set(0, 0, 1);
        zur.copy(auge).sub(q); quer.crossVectors(tan, zur); if (quer.lengthSq() < 1e-10) quer.set(1, 0, 0);
        quer.normalize().multiplyScalar(breite * (1 - .55 * f) * .5);
        pos.set([q.x + quer.x, q.y + quer.y, q.z + quer.z, q.x - quer.x, q.y - quer.y, q.z - quer.z], i * 6);
        const a = Math.pow(1 - f, 2.2) * staerke * Math.min(1, i / 2 + .25);
        col.set([c.r * a, c.g * a, c.b * a, c.r * a, c.g * a, c.b * a], i * 6);
      }
      geo.attributes.position.needsUpdate = true; geo.attributes.color.needsUpdate = true;
    },
  };
}

export function mountWorld(host) {
  if (instanzen.has(host)) return instanzen.get(host);
  const stage = host.querySelector('[data-world-stage]'), fallback = host.querySelector('[data-world-fallback]');
  const detail = host.querySelector('[data-world-detail]'), alteStifte = host.querySelector('[data-world-pins]');
  if (!stage) throw new Error('Keine Bühne');
  const ruhig = matchMedia('(prefers-reduced-motion: reduce)');
  const ereignisse = new AbortController(), listener = { signal: ereignisse.signal };
  let beendet = false;
  const auftakt = document.querySelector('[data-connection-opening][data-connection-active]');
  let verdeckt = Boolean(auftakt?.parentElement?.contains(host)), bereit = false;
  const vorherLabel = stage.getAttribute('aria-label');
  const stiftEltern = alteStifte?.parentNode, stiftDanach = alteStifte?.nextSibling;
  const css = document.createElement('link'); css.rel = 'stylesheet'; css.href = new URL('./flug.css', import.meta.url).href; document.head.append(css);
  host.classList.add('flug-an'); alteStifte?.remove();
  stage.setAttribute('aria-label', 'AIFOREU im Flug: Das Zeichen fliegt nacheinander die Bereiche und Projekte an. Eine Station wählen, um dorthin zu fliegen. Pfeiltasten wechseln die Station, Escape setzt den Rundflug fort.');

  const canvas = document.createElement('canvas'); canvas.className = 'flug-canvas'; canvas.setAttribute('aria-hidden', 'true');
  stage.prepend(canvas);
  const schmal = () => stage.clientWidth < 760;
  let renderer;
  try { renderer = erstelleRenderer(canvas, { klein: schmal() }); }
  catch (fehler) {
    beendet = true; ereignisse.abort();
    canvas.remove(); css.remove(); host.classList.remove('flug-an');
    if (alteStifte && stiftEltern) stiftEltern.insertBefore(alteStifte, stiftDanach);
    vorherLabel === null ? stage.removeAttribute('aria-label') : stage.setAttribute('aria-label', vorherLabel);
    if (fallback) fallback.hidden = false;
    throw fehler;
  }
  const szene = new THREE.Scene(); szene.background = new THREE.Color(FARBEN.all);
  szene.fog = new THREE.FogExp2('#04070d', .012);
  const umgebung = erstelleUmgebung(renderer); szene.environment = umgebung.texture; szene.environmentIntensity = .85;
  const licht = erstelleLicht(szene), horizont = erstelleHorizont(licht.sonne.position);
  szene.add(erstelleKuppel(), erstelleSterne(schmal() ? 1600 : 2800, 230), horizont);
  const sonne = leuchtpunkt(FARBEN.sonne, 26, .55); sonne.position.copy(licht.sonne.position).normalize().multiplyScalar(160); szene.add(sonne);
  const sonnenStreif = leuchtpunkt(FARBEN.glut, 1, .18); sonnenStreif.scale.set(120, 2.4, 1); sonnenStreif.position.copy(sonne.position); szene.add(sonnenStreif);
  const kamera = new THREE.PerspectiveCamera(34, 2, .05, 900);
  // Begleitlicht: kühles Licht von schräg über der Kamera auf den Flieger, damit seine Kanten im Dunkeln Glanz bekommen.
  const begleit = new THREE.DirectionalLight('#cfdcff', 1.1); begleit.castShadow = false; szene.add(begleit, begleit.target);

  // Staub, der beim Flug an der Kamera vorbeizieht: Tiefe und Tempo.
  const staub = (() => { const n = 700, p = new Float32Array(n * 3); for (let i = 0; i < n; i++) p.set([(Math.random() - .5) * 60, (Math.random() - .5) * 30, (Math.random() - .5) * 60], i * 3); const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(p, 3)); return new THREE.Points(g, new THREE.PointsMaterial({ color: '#c9d3e4', size: .045, transparent: true, opacity: .55, depthWrite: false })); })();
  szene.add(staub);

  const k = { farben: FARBEN, umgebung: umgebung.texture, qualitaet: schmal() ? 'niedrig' : 'hoch' };
  const stationen = STATIONEN.map(s => ({ ...s, punkt: new THREE.Vector3(...s.pos), modell: null, aktiv: false, naehe: 0 }));
  let flieger = null; const flug = new THREE.Group(); flug.name = 'Flieger'; szene.add(flug);
  const glut = [], spuren = [], strahlen = [];

  // Beschriftungen: Knopf je Station, der über dem Modell steht.
  const schicht = document.createElement('div'); schicht.className = 'flug-schilder'; stage.append(schicht);
  stationen.forEach((s, i) => {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'flug-schild'; b.dataset.flugZiel = s.id;
    if (s.art === 'Bereich') b.classList.add('flug-schild--bereich');
    b.textContent = s.titel;
    b.setAttribute('aria-label', `${s.titel} anfliegen`); b.setAttribute('aria-pressed', 'false');
    b.addEventListener('click', () => waehle(i, true), listener); schicht.append(b); s.schild = b;
  });
  const leiste = document.createElement('div'); leiste.className = 'flug-leiste';
  leiste.innerHTML = '<button type="button" class="flug-knopf" data-flug-uebersicht aria-pressed="false">Übersicht</button><button type="button" class="flug-knopf" data-flug-pause>Flug anhalten</button><button type="button" class="flug-knopf" data-flug-rundflug hidden>Rundflug fortsetzen</button><span class="flug-status" aria-live="polite"></span>';
  stage.append(leiste);
  const knopfPause = leiste.querySelector('[data-flug-pause]'), knopfRund = leiste.querySelector('[data-flug-rundflug]'), knopfUebersicht = leiste.querySelector('[data-flug-uebersicht]'), status = leiste.querySelector('.flug-status');

  /* ---------- Flugbahn ---------- */
  // Ein Abschnitt: Hermite-Kurve von der aktuellen Lage zum Einflugpunkt der Station, dann ein Kreisbogen um sie.
  const pos = new THREE.Vector3(3.6, 6.2, 26), vor = new THREE.Vector3(-.26, -.26, -1).normalize();
  let abschnitt = null, ziel = 0, rundflug = true, haltBis = 0, zeit = 0, laeuft = !ruhig.matches, reisen = 0;
  const lageAufKreis = (s, winkel, aus) => { const r = s.r * 1.75, e = s.ebene; return aus.copy(s.punkt).addScaledVector(e.u, Math.cos(winkel) * r).addScaledVector(e.v, Math.sin(winkel) * r); };
  function ebeneFuer(s, herkunft) {
    // Kreisebene leicht geneigt, so gedreht, dass der Einflug von der Herkunft aus tangential passt.
    const zuStation = s.punkt.clone().sub(herkunft).setY(0).normalize();
    const u = zuStation.clone().multiplyScalar(-1), v = new THREE.Vector3(0, 1, 0).cross(u).normalize();
    u.applyAxisAngle(v, .22); return { u, v };
  }
  function neuerAbschnitt(i) {
    const s = stationen[i]; s.ebene = ebeneFuer(s, pos);
    const start0 = Math.PI * .5 + .35, eintritt = lageAufKreis(s, start0, new THREE.Vector3());
    const tangente = s.ebene.u.clone().multiplyScalar(-Math.sin(start0)).addScaledVector(s.ebene.v, Math.cos(start0)).normalize();
    const p0 = pos.clone(), m0 = vor.clone(), dist = p0.distanceTo(eintritt);
    const m1 = tangente.clone(), h = dist * 1.05;
    const kurve = { p0, p1: eintritt, m0: m0.multiplyScalar(h), m1: m1.multiplyScalar(h) };
    const laenge = (() => { let L = 0, a = p0.clone(), b = new THREE.Vector3(); for (let j = 1; j <= 40; j++) { hermite(kurve, j / 40, b); L += a.distanceTo(b); a.copy(b); } return L; })();
    // Kameraart für diese Reise: folgen oder seitlich stehen und den Flieger vorbeiziehen lassen
    const mitte = hermite(kurve, .55, new THREE.Vector3()), richtung = eintritt.clone().sub(p0).normalize();
    const seite = new THREE.Vector3(0, 1, 0).cross(richtung).normalize().multiplyScalar(((reisen % 4) < 2 ? 1 : -1));
    const vorbei = mitte.clone().addScaledVector(seite, 3.6).addScaledVector(new THREE.Vector3(0, 1, 0), .9).addScaledVector(richtung, 1.4);
    abschnitt = { i, kurve, laenge, phase: 'reise', u: 0, winkel0: start0, winkel: 0, art: reisen % 2 ? 'vorbei' : 'folgen', vorbei };
    reisen++;
  }
  function hermite(c, t, aus) {
    const t2 = t * t, t3 = t2 * t, h00 = 2 * t3 - 3 * t2 + 1, h10 = t3 - 2 * t2 + t, h01 = -2 * t3 + 3 * t2, h11 = t3 - t2;
    return aus.set(0, 0, 0).addScaledVector(c.p0, h00).addScaledVector(c.m0, h10).addScaledVector(c.p1, h01).addScaledVector(c.m1, h11);
  }
  const tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3(), alt = new THREE.Vector3();
  function fliege(dt) {
    if (!abschnitt) neuerAbschnitt(ziel);
    const a = abschnitt, s = stationen[a.i];
    alt.copy(pos);
    if (a.phase === 'reise') {
      // nahezu konstante Geschwindigkeit entlang der Kurve, kurz vor dem Ziel abbremsen auf Kreistempo
      const rest = 1 - a.u, tempo = KREIS + (REISE - KREIS) * Math.min(1, rest * 3.2) * Math.min(1, (a.u + .08) * 5);
      a.u = Math.min(1, a.u + tempo * dt / a.laenge); hermite(a.kurve, a.u, pos);
      if (a.u >= 1) { a.phase = 'kreis'; a.winkel = 0; if (modus !== 'auftakt') zeigeDetail(a.i); }
    } else {
      a.winkel += KREIS * dt / (s.r * 1.75);
      lageAufKreis(s, a.winkel0 + a.winkel, pos);
      if (a.winkel >= KREIS_WINKEL) {
        if (rundflug && zeit >= haltBis) { ziel = (a.i + 1) % stationen.length; neuerAbschnitt(ziel); }
        else { a.winkel0 += a.winkel; a.winkel = 0; } // weiter kreisen, bis der Rundflug weitergeht
      }
    }
    tmp.copy(pos).sub(alt); if (tmp.lengthSq() > 1e-8) vor.lerp(tmp.normalize(), Math.min(1, dt * 9)).normalize();
    stationen.forEach((st, j) => { const d = st.punkt.distanceTo(pos), n = Math.max(0, Math.min(1, 1 - (d - st.r * 1.6) / (st.r * 4))); st.naehe += (n - st.naehe) * Math.min(1, dt * 3); st.aktiv = j === a.i && a.phase === 'kreis'; });
  }

  // Lage des Fliegers: Nase entlang der Flugrichtung, Querneigung aus der Kurve, leichtes Wiegen.
  let quer = 0, vorAlt = vor.clone();
  const basis = new THREE.Matrix4(), q = new THREE.Quaternion(), roll = new THREE.Quaternion(), oben = new THREE.Vector3(0, 1, 0);
  function lage(dt, t) {
    const dreh = vorAlt.clone().cross(vor); const wende = dreh.y / Math.max(dt, 1e-3);
    vorAlt.copy(vor);
    const sollQuer = THREE.MathUtils.clamp(-wende * .55, -1.05, 1.05);
    quer += (sollQuer - quer) * Math.min(1, dt * 3.5);
    const z = vor.clone(), x = oben.clone().cross(z).normalize(), y = z.clone().cross(x);
    basis.makeBasis(x, y, z); q.setFromRotationMatrix(basis);
    roll.setFromAxisAngle(z, quer + Math.sin(t * 1.3) * .03); q.premultiply(roll);
    flug.quaternion.copy(q); flug.position.copy(pos).addScaledVector(y, Math.sin(t * 1.7) * .03);
  }

  /* ---------- Kamera ---------- */
  const kamPos = new THREE.Vector3(0, 9.6, 31), kamBlick = new THREE.Vector3(0, 0, -2);
  const sollPos = new THREE.Vector3(), sollBlick = new THREE.Vector3(), zeiger = new THREE.Vector2();
  const kameraOffset = new THREE.Vector3(), sollOffset = new THREE.Vector3();
  const uebersichtsMitte = new THREE.Vector3(0, 1, -3.5);
  let modus = 'auftakt', auftaktBis = 2.4, kameraRahmen = [];

  // Fit actual object spheres against both frustum axes. Portrait screens are
  // constrained by horizontal FOV; a fixed camera distance cannot frame them.
  function rahmenAbstand(blick, richtung, kugeln) {
    const halbV = Math.atan(Math.tan(THREE.MathUtils.degToRad(kamera.fov) / 2) * .92);
    const halbH = Math.atan(Math.tan(THREE.MathUtils.degToRad(kamera.fov) / 2) * kamera.aspect * .92);
    const rechts = oben.clone().cross(richtung).normalize(), hoch = richtung.clone().cross(rechts).normalize();
    let abstand = 3.5;
    for (const kugel of kugeln) {
      const d = kugel.punkt.clone().sub(blick), z = d.dot(richtung), r = kugel.radius;
      abstand = Math.max(abstand,
        z + Math.abs(d.dot(rechts)) / Math.tan(halbH) + r / Math.sin(halbH),
        z + Math.abs(d.dot(hoch)) / Math.tan(halbV) + r / Math.sin(halbV));
    }
    return abstand;
  }
  function kameraZiel() {
    const a = abschnitt, s = a ? stationen[a.i] : null;
    const fliegerRadius = (flieger?.radius || 1.15) * FLIEGER_GROESSE + .12;
    const fliegerKugel = { punkt: pos, radius: fliegerRadius };
    let richtung;
    if (modus === 'auftakt' || modus === 'uebersicht' || !s) {
      sollBlick.copy(uebersichtsMitte);
      richtung = new THREE.Vector3(0, .4, 1).normalize();
      kameraRahmen = [...stationen.map(st => ({ punkt: st.punkt, radius: st.r + .3 })), fliegerKugel];
    } else {
      const seite = oben.clone().cross(vor).normalize();
      const folgen = vor.clone().multiplyScalar(-1).addScaledVector(oben, .42).addScaledVector(seite, a.art === 'vorbei' ? .8 : .28).normalize();
      const kreis = licht.sonne.position.clone().normalize().multiplyScalar(.5).add(new THREE.Vector3(0, .3, 1)).normalize();
      kreis.applyAxisAngle(oben, (a.winkel - KREIS_WINKEL * .5) * .16);
      const naehe = a.phase === 'kreis' ? 1 : 1 - THREE.MathUtils.smoothstep(pos.distanceTo(s.punkt), s.r * 2.3 + 1, s.r * 5 + 3);
      const dist = pos.distanceTo(s.punkt), radius = (dist + s.r + fliegerRadius) / 2;
      const mitte = s.punkt.clone().lerp(pos, dist > 0 ? Math.max(0, Math.min(1, (radius - s.r) / dist)) : 0);
      sollBlick.copy(pos).addScaledVector(vor, .45 * (1 - naehe)).lerp(mitte, naehe);
      richtung = folgen.lerp(kreis, naehe).normalize();
      kameraRahmen = [fliegerKugel];
      // Expand the travel frame continuously as the visited station comes near.
      if (naehe > 0) kameraRahmen.push({ punkt: sollBlick.clone().lerp(s.punkt, naehe), radius: (s.r + .10) * naehe });
    }
    sollPos.copy(sollBlick).addScaledVector(richtung, rahmenAbstand(sollBlick, richtung, kameraRahmen));
    sollPos.x += zeiger.x * .3; sollPos.y += zeiger.y * .2;
  }
  function aktualisiereKamera(dt, sofort = false) {
    kameraZiel();
    kameraOffset.copy(kamPos).sub(kamBlick); sollOffset.copy(sollPos).sub(sollBlick);
    if (sofort || ruhig.matches) kameraOffset.copy(sollOffset);
    else kameraOffset.lerp(sollOffset, 1 - Math.exp(-8 * (dt || .016)));
    // Follow the aircraft without translational lag; soften only the offset.
    kamBlick.copy(sollBlick);
    if (kameraOffset.lengthSq() < .01) kameraOffset.copy(sollOffset);
    let richtung = kameraOffset.clone().normalize();
    kameraOffset.setLength(Math.max(kameraOffset.length(), rahmenAbstand(kamBlick, richtung, kameraRahmen)));
    kamPos.copy(kamBlick).add(kameraOffset);
    for (const st of stationen) {
      const d = kamPos.clone().sub(st.punkt), min = st.r * 2.6;
      if (d.lengthSq() < min * min) kamPos.copy(st.punkt).addScaledVector(d.lengthSq() ? d.normalize() : richtung, min);
    }
    // Collision displacement changes the view direction: fit once more after it.
    kameraOffset.copy(kamPos).sub(kamBlick); richtung = kameraOffset.clone().normalize();
    kameraOffset.setLength(Math.max(kameraOffset.length(), rahmenAbstand(kamBlick, richtung, kameraRahmen)));
    kamPos.copy(kamBlick).add(kameraOffset);
    kamera.position.copy(kamPos); kamera.lookAt(kamBlick); kamera.updateMatrixWorld();
    horizont.visible = modus === 'auftakt' || modus === 'uebersicht';
  }

  /* ---------- Bedienung ---------- */
  function leereSpuren() { spuren.forEach(sp => sp.leeren()); }
  function waehle(i, vomNutzer) {
    if (beendet || !Number.isInteger(i) || i < 0 || i >= stationen.length) return;
    ziel = i; rundflug = !vomNutzer; haltBis = vomNutzer ? zeit + 1e9 : 0;
    modus = 'flug'; knopfUebersicht?.setAttribute('aria-pressed', 'false');
    if (ruhig.matches) {
      leereSpuren(); abschnitt = null; neuerAbschnitt(i); abschnitt.phase = 'kreis'; lageAufKreis(stationen[i], abschnitt.winkel0 + .6, pos);
      stationen.forEach((st, j) => { st.aktiv = j === i; st.naehe = j === i ? 1 : 0; });
    }
    else neuerAbschnitt(i);
    knopfRund.hidden = rundflug; zeigeDetail(i); zeichneEinmal();
  }
  function uebersicht() {
    if (beendet) return;
    modus = 'uebersicht'; rundflug = false; haltBis = zeit + 1e9; leereSpuren();
    if (detail) detail.hidden = true;
    stationen.forEach(st => { st.aktiv = false; st.naehe = 0; st.schild.setAttribute('aria-pressed', 'false'); });
    knopfUebersicht?.setAttribute('aria-pressed', 'true'); knopfRund.hidden = false;
    zeichneEinmal();
  }
  function setzeRundflugFort() {
    if (beendet) return;
    modus = 'flug'; rundflug = true; haltBis = 0; laeuft = !ruhig.matches;
    knopfUebersicht?.setAttribute('aria-pressed', 'false'); knopfRund.hidden = true;
    pauseText(); zeigeDetail(ziel); zeichneEinmal();
  }
  function zeigeDetail(i) {
    const s = stationen[i];
    stationen.forEach((st, j) => st.schild.setAttribute('aria-pressed', String(j === i)));
    if (detail) {
      const t = detail.querySelector('[data-world-title]'), c = detail.querySelector('[data-world-copy]'), l = detail.querySelector('[data-world-link]');
      if (t) t.textContent = s.titel; if (c) c.textContent = s.text;
      if (l) { l.href = s.href; l.firstChild && l.firstChild.nodeType === 3 ? (l.firstChild.nodeValue = `${s.titel} entdecken `) : l.prepend(`${s.titel} entdecken `); }
      detail.hidden = false;
    }
  }
  function pauseText() {
    knopfPause.textContent = laeuft ? 'Flug anhalten' : 'Flug fortsetzen';
    status.textContent = laeuft ? '' : 'Angehalten';
    knopfPause.hidden = ruhig.matches;
  }
  pauseText();
  knopfUebersicht?.addEventListener('click', uebersicht, listener);
  knopfPause.addEventListener('click', () => { laeuft = !laeuft; pauseText(); if (laeuft) wecke(); }, listener);
  knopfRund.addEventListener('click', setzeRundflugFort, listener);
  stage.addEventListener('keydown', e => {
    if (e.target.closest('a')) return;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); stage.focus?.({ preventScroll: true }); waehle((ziel + 1) % stationen.length, true); }
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); stage.focus?.({ preventScroll: true }); waehle((ziel + stationen.length - 1) % stationen.length, true); }
    else if (e.key === 'Escape') { setzeRundflugFort(); }
    else if (e.key === ' ' && e.target === stage) { e.preventDefault(); knopfPause.click(); }
  }, listener);
  stage.addEventListener('pointermove', e => { const r = stage.getBoundingClientRect(); zeiger.set((e.clientX - r.left) / r.width * 2 - 1, -((e.clientY - r.top) / r.height * 2 - 1)); if (!laeuft && !ruhig.matches) wecke(); }, listener);
  stage.addEventListener('pointerleave', () => { zeiger.set(0, 0); if (!laeuft && !ruhig.matches) wecke(); }, listener);

  /* ---------- Schilder an die Stationen heften ---------- */
  const proj = new THREE.Vector3();
  function schilder() {
    const w = stage.clientWidth, h = stage.clientHeight, belegt = [];
    const unten = h - (leiste.offsetHeight || 36) - 28;
    const gesamt = modus === 'auftakt' || modus === 'uebersicht';
    const reihenfolge = gesamt ? [...stationen].sort((a, b) => Number(b.art === 'Bereich') - Number(a.art === 'Bereich')) : stationen;
    for (const s of reihenfolge) {
      if (!s.modell) continue;
      s.modell.gruppe.updateWorldMatrix(true, false);
      proj.copy(s.modell.anker); s.modell.gruppe.localToWorld(proj); proj.project(kamera);
      const hauptnavigation = !gesamt || w > 760 || s.art === 'Bereich';
      const sichtbar = hauptnavigation && s.modell.gruppe.visible && proj.z < 1 && Math.abs(proj.x) < 1.15 && Math.abs(proj.y) < 1.15;
      s.schild.hidden = !sichtbar;
      const sw = Math.min(s.schild.offsetWidth || s.titel.length * 7 + 30, w - 24), sh = s.schild.offsetHeight || 32;
      const darunter = gesamt && s.art === 'Bereich';
      let ankerX = (proj.x * .5 + .5) * w - 6, ankerY = (-proj.y * .5 + .5) * h - sh / 2;
      if (darunter) {
        const mitte = s.punkt.clone().project(kamera), sicht = s.punkt.clone().applyMatrix4(kamera.matrixWorldInverse);
        const winkel = Math.atan2(sicht.y, -sicht.z), radius = s.r * 1.05 + .08;
        const rand = Math.asin(Math.min(.99, radius / Math.hypot(sicht.y, sicht.z)));
        const unterkante = Math.tan(winkel - rand) / Math.tan(THREE.MathUtils.degToRad(kamera.fov) / 2);
        ankerX = (mitte.x * .5 + .5) * w - sw / 2;
        ankerY = (1 - unterkante) * h / 2 + 12;
      }
      const x = THREE.MathUtils.clamp(ankerX, 12, Math.max(12, w - sw - 12));
      const ursprung = THREE.MathUtils.clamp(ankerY, 12, Math.max(12, unten - sh));
      let y = ursprung;
      if (sichtbar) {
        // Keep full names inside the viewport and apart in the narrow overview.
        for (const versatz of darunter ? [0, 1, 2, 3, 4, 5] : [0, 1, -1, 2, -2, 3, -3, 4, -4, 5, -5]) {
          const versuch = ursprung + versatz * (sh + 8);
          if (versuch < 12 || versuch + sh > unten) continue;
          if (!belegt.some(b => x < b.x + b.w + 6 && x + sw + 6 > b.x && versuch < b.y + b.h + 6 && versuch + sh + 6 > b.y)) { y = versuch; break; }
        }
        belegt.push({ x, y, w: sw, h: sh });
      }
      s.schild.style.transform = `translate(${x.toFixed(1)}px,${y.toFixed(1)}px)`;
      s.schild.classList.toggle('flug-schild--weg', !sichtbar);
      s.schild.classList.toggle('flug-schild--aktiv', s.aktiv);
      s.schild.tabIndex = sichtbar ? 0 : -1;
    }
  }

  /* ---------- Schleife ---------- */
  let bild = 0, letzt = 0, sichtbar = true, breite = 0, hoehe = 0;
  const glutFlacker = (t, i) => .85 + Math.sin(t * 31 + i * 2.1) * .08 + Math.sin(t * 13.7 + i) * .07;
  function render(t, dt) {
    if (beendet) return;
    if (laeuft && !ruhig.matches && modus !== 'uebersicht') {
      if (modus === 'auftakt' && t > auftaktBis) { modus = 'flug'; zeigeDetail(ziel); }
      fliege(dt);
    }
    host.dataset.flugAnsicht = modus === 'auftakt' || modus === 'uebersicht' ? 'uebersicht' : 'fokus';
    lage(dt || .016, t);
    aktualisiereKamera(dt);
    begleit.position.copy(kamPos).addScaledVector(kamera.up, 3).addScaledVector(tmp2.copy(kamPos).sub(pos).normalize(), 2); begleit.target.position.copy(pos);
    const fokussiert = modus === 'flug' && abschnitt?.phase === 'kreis';
    for (const [i, s] of stationen.entries()) if (s.modell) {
      s.modell.gruppe.visible = !fokussiert || i === abschnitt.i;
      s.modell.aktualisiere?.(t, { aktiv: s.aktiv, naehe: s.naehe });
    }
    flieger?.aktualisiere?.(t, { aktiv: abschnitt?.phase === 'reise', naehe: 1 });
    const schub = abschnitt?.phase === 'reise' ? 1 : .55;
    strahlen.forEach((k2, i) => { const f2 = glutFlacker(t, (i >> 1) + 7) * schub; k2.scale.set(1, 1, .5 + .7 * f2); k2.material.opacity = Math.min(1, .9 * f2); });
    glut.forEach((g, i) => { g.material.opacity = Math.min(1, glutFlacker(t, i) * schub); g.scale.setScalar((.2 + .1 * schub) * FLIEGER_GROESSE * glutFlacker(t, i + 3)); });
    if (flieger) spuren.forEach(sp => {
      if (ruhig.matches || modus === 'uebersicht') { sp.linie.visible = false; return; }
      sp.setze(flug.localToWorld(sp.quelle.clone()), dt || 0, kamPos); sp.linie.visible = true;
    });
    staub.position.copy(kamPos).multiplyScalar(.0); // Staub bleibt in der Welt; Bewegung entsteht durch die Kamera
    renderer.render(szene, kamera);
    schilder();
  }
  function schleife(jetzt) {
    bild = 0;
    if (beendet || !bereit || verdeckt || !sichtbar || document.hidden) { letzt = 0; return; }
    const dt = letzt ? Math.min(.05, (jetzt - letzt) / 1000) : 1 / 60; letzt = jetzt;
    if (laeuft) zeit += dt;
    render(zeit, laeuft ? dt : 0);
    if (!ruhig.matches && (laeuft || kamPos.distanceTo(sollPos) > .01)) bild = requestAnimationFrame(schleife);
  }
  function wecke() { if (!beendet && bereit && !verdeckt && !bild && sichtbar && !document.hidden) bild = requestAnimationFrame(schleife); }
  function enthuelle() {
    if (beendet || !verdeckt) return;
    verdeckt = false; letzt = 0;
    if (bereit) { render(zeit, 0); if (!ruhig.matches) wecke(); }
  }
  function zeichneEinmal() { if (!bild) { render(zeit, 0); if (!ruhig.matches) wecke(); } }
  function groesse() {
    if (beendet) return;
    breite = stage.clientWidth; hoehe = stage.clientHeight; if (!breite || !hoehe) return;
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, breite < 760 ? 1.5 : 2));
    renderer.setSize(breite, hoehe, false); kamera.aspect = breite / hoehe;
    kamera.fov = breite / hoehe < 1 ? 52 : breite / hoehe < 1.4 ? 42 : 34; kamera.updateProjectionMatrix();
    render(zeit, 0);
  }

  /* ---------- Aufbau ---------- */
  const api = { destroy, waehle: i => waehle(i, true), uebersicht };
  instanzen.set(host, api);
  (async () => {
    const [fm, ...modelle] = await Promise.all([ladeModell('flieger', k), ...stationen.map(s => ladeModell(s.id, k))]);
    if (beendet) { [fm, ...modelle].forEach(m => entsorge(m.gruppe)); return; }
    flieger = fm; fm.gruppe.scale.setScalar(FLIEGER_GROESSE); flug.add(fm.gruppe);
    for (const d of fm.duesen || []) {
      const g = leuchtpunkt(FARBEN.glut, .2, 1); g.position.copy(d.position).addScaledVector(d.richtung, .02); fm.gruppe.add(g); glut.push(g);
      // Hitzefahne: eine flache und eine senkrechte Fläche, vom Auslass entlang der Schubrichtung (alles im Modellraum)
      const fahne = new THREE.Group(); fahne.position.copy(d.position);
      fahne.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, -1), d.richtung.clone().normalize());
      for (const senkrecht of [false, true]) {
        const geo = new THREE.PlaneGeometry(senkrecht ? .05 : .13, .62); geo.translate(0, -.31, 0); geo.rotateX(Math.PI / 2);
        if (senkrecht) geo.rotateZ(Math.PI / 2);
        const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: strahlTextur(), color: FARBEN.glut, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false }));
        m.renderOrder = 3; fahne.add(m); strahlen.push(m);
      }
      fm.gruppe.add(fahne);
      const sp = erstelleSpur(13, FARBEN.glut, .15, .045); sp.quelle = d.position.clone().addScaledVector(d.richtung, .05).multiplyScalar(FLIEGER_GROESSE); szene.add(sp.linie); spuren.push(sp);
    }
    modelle.forEach((m, i) => {
      const s = stationen[i]; s.modell = m;
      const huelle = new THREE.Group(); huelle.position.copy(s.punkt); huelle.scale.setScalar(s.r / (m.radius || 1)); huelle.add(m.gruppe);
      huelle.rotation.y = Math.atan2(-s.punkt.x, 24 - s.punkt.z) * .6; szene.add(huelle);
    });
    if (ruhig.matches) { ziel = 0; neuerAbschnitt(0); abschnitt.phase = 'kreis'; pos.set(.6, .2, 3.6); vor.set(-.6, 0, -1).normalize(); modus = 'auftakt'; }
    // Prepare a still frame under the opening; its reveal starts this scene's loop.
    bereit = true;
    groesse(); fallback && (fallback.hidden = true); stage.dataset.worldReady = ''; stage.setAttribute('data-world-ready', '');
    host.classList.add('flug-bereit');
    if (!ruhig.matches) wecke();
  })().catch(() => { destroy(); });

  const ro = new ResizeObserver(groesse); ro.observe(stage);
  const io = new IntersectionObserver(e => { sichtbar = e[0].isIntersecting; if (sichtbar) wecke(); }, { rootMargin: '60px' }); io.observe(stage);
  const sichtbarkeit = () => { if (!document.hidden) wecke(); };
  document.addEventListener('visibilitychange', sichtbarkeit, listener);
  document.addEventListener('aiforeu:opening-reveal', enthuelle, listener);
  document.addEventListener('aiforeu:opening-complete', enthuelle, listener);
  canvas.addEventListener('webglcontextlost', e => { e.preventDefault(); destroy(); }, listener);
  const bewegung = () => {
    if (beendet) return;
    laeuft = !ruhig.matches; letzt = 0; leereSpuren();
    if (bild) cancelAnimationFrame(bild); bild = 0; pauseText();
    if (ruhig.matches && modus !== 'uebersicht') waehle(ziel, !rundflug);
    else if (ruhig.matches) zeichneEinmal();
    else wecke();
  };
  ruhig.addEventListener('change', bewegung, listener);
  function destroy() {
    if (beendet) return;
    beendet = true; ereignisse.abort();
    if (bild) cancelAnimationFrame(bild); bild = 0; ro.disconnect(); io.disconnect(); document.removeEventListener('visibilitychange', sichtbarkeit);
    entsorge(szene); umgebung.dispose(); renderer.dispose(); canvas.remove(); schicht.remove(); leiste.remove(); host.classList.remove('flug-an', 'flug-bereit');
    css.remove(); stage.removeAttribute('data-world-ready');
    delete host.dataset.flugAnsicht;
    if (alteStifte && stiftEltern) stiftEltern.insertBefore(alteStifte, stiftDanach?.parentNode === stiftEltern ? stiftDanach : null);
    vorherLabel === null ? stage.removeAttribute('aria-label') : stage.setAttribute('aria-label', vorherLabel);
    if (window.AiforeuFlug === debug) delete window.AiforeuFlug;
    if (fallback) fallback.hidden = false; instanzen.delete(host);
  }
  const debug = {
    entspricht: host,
    get zeit() { return zeit; }, get ziel() { return ziel; }, get phase() { return abschnitt?.phase; }, get ansicht() { return modus; },
    waehle: i => waehle(i, true), uebersicht,
    anhalten: () => { laeuft = false; pauseText(); },
    springe(t) {
      leereSpuren();
      const schritte = Math.round(t / .02);
      for (let n = 0; n < schritte; n++) {
        zeit += .02;
        if (modus === 'auftakt' && zeit > auftaktBis) { modus = 'flug'; zeigeDetail(ziel); }
        if (!ruhig.matches && modus !== 'uebersicht') fliege(.02);
        lage(.02, zeit); aktualisiereKamera(.02);
        if (flieger && !ruhig.matches && modus !== 'uebersicht') spuren.forEach(sp => sp.setze(flug.localToWorld(sp.quelle.clone()), .02, kamPos));
      }
      render(zeit, 0);
    },
  };
  window.AiforeuFlug = debug;
  return api;
}
