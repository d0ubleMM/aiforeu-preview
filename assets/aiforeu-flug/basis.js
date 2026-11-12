/* AIFOREU · Flug · Gemeinsame Grundlagen für Szene und Prüfstand: Farben, Licht, Umgebung (Reflexionen), Sterne.
   Jedes Modell wird unter genau diesem Licht gebaut und geprüft, damit es in der Szene gleich aussieht. */
import * as THREE from '../agentario-scene/vendor/three.module.min.js';
export { THREE };

export const FARBEN = {
  all: '#04070d',        // Hintergrund
  graphit: '#1a2029',    // Flieger, dunkle Rümpfe
  stahl: '#8b97a7',      // Metall hell
  papier: '#f5f7fa',     // helle Flächen
  tinte: '#26333b',      // dunkle Flächen
  orange: '#ee6b35',     // AIFOREU-Akzent, Leuchten
  glut: '#ffb27a',       // Triebwerksglut, warmes Licht
  sonne: '#ffd9ae',      // Hauptlicht
  kante: '#9fb7d9',      // kühles Gegenlicht
};

/* Umgebungstextur für Reflexionen: warme Sonne, kühler Horizont, sonst Schwarz. Ohne Bilddateien. */
export function erstelleUmgebung(renderer) {
  const s = new THREE.Scene(); s.background = new THREE.Color('#020306');
  const kugel = (farbe, staerke, pos, r) => { const m = new THREE.Mesh(new THREE.SphereGeometry(r, 16, 12), new THREE.MeshBasicMaterial({ color: new THREE.Color(farbe).multiplyScalar(staerke) })); m.position.set(...pos); s.add(m); };
  kugel(FARBEN.sonne, 9, [18, 9, 10], 3.2);
  kugel(FARBEN.kante, 1.6, [-20, -2, -14], 9);
  kugel('#ffffff', .5, [0, 26, 0], 10);
  const pm = new THREE.PMREMGenerator(renderer); const rt = pm.fromScene(s, .04); pm.dispose();
  s.traverse(o => { o.geometry?.dispose(); o.material?.dispose(); });
  return rt;
}

/* Licht der Szene: warme Sonne mit Schatten, kühles Gegenlicht, wenig Grundlicht (es ist All). */
export function erstelleLicht(szene, { schatten = true } = {}) {
  const sonne = new THREE.DirectionalLight(FARBEN.sonne, 3.4); sonne.position.set(14, 9, 8);
  if (schatten) { sonne.castShadow = true; sonne.shadow.mapSize.set(2048, 2048); Object.assign(sonne.shadow.camera, { left: -14, right: 14, top: 14, bottom: -14, near: 1, far: 60 }); sonne.shadow.bias = -.0003; sonne.shadow.normalBias = .02; }
  const kante = new THREE.DirectionalLight(FARBEN.kante, 1.25); kante.position.set(-12, 3, -10);
  const grund = new THREE.HemisphereLight('#28344a', '#05070b', .55);
  szene.add(sonne, kante, grund);
  return { sonne, kante, grund };
}

/* Sterne: zwei Schichten Punkte auf großen Kugelschalen, feine Größenunterschiede, keine Farbe außer leicht warm/kühl. */
export function erstelleSterne(anzahl = 2600, radius = 220) {
  const g = new THREE.Group(); g.name = 'Sterne';
  for (const [n, r, groesse, deck] of [[anzahl, radius, 1.3, .85], [Math.round(anzahl * .25), radius * .7, 2.1, 1]]) {
    const pos = new Float32Array(n * 3), farbe = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const u = Math.random() * 2 - 1, phi = Math.random() * Math.PI * 2, s = Math.sqrt(1 - u * u);
      pos.set([r * s * Math.cos(phi), r * u, r * s * Math.sin(phi)], i * 3);
      const w = Math.random(); const c = new THREE.Color(w < .15 ? '#ffd2a6' : w > .85 ? '#bcd0ff' : '#ffffff').multiplyScalar(.55 + Math.random() * .45);
      farbe.set([c.r, c.g, c.b], i * 3);
    }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('color', new THREE.BufferAttribute(farbe, 3));
    const mat = new THREE.PointsMaterial({ size: groesse, sizeAttenuation: false, vertexColors: true, transparent: true, opacity: deck, depthWrite: false });
    g.add(new THREE.Points(geo, mat));
  }
  return g;
}

/* Weicher Leuchtpunkt (additiv) als Sprite: Triebwerke, Lampen, Sonne. */
let leuchtTextur = null;
export function leuchtpunkt(farbe = FARBEN.glut, groesse = 1, deckkraft = 1) {
  if (!leuchtTextur) {
    const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d');
    const v = x.createRadialGradient(64, 64, 0, 64, 64, 64); v.addColorStop(0, 'rgba(255,255,255,1)'); v.addColorStop(.18, 'rgba(255,255,255,.85)'); v.addColorStop(.45, 'rgba(255,255,255,.22)'); v.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = v; x.fillRect(0, 0, 128, 128); leuchtTextur = new THREE.CanvasTexture(c); leuchtTextur.colorSpace = THREE.SRGBColorSpace;
  }
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: leuchtTextur, color: farbe, transparent: true, opacity: deckkraft, blending: THREE.AdditiveBlending, depthWrite: false }));
  s.scale.setScalar(groesse); return s;
}

/* Renderer mit scharfer, filmischer Grundeinstellung. */
export function erstelleRenderer(canvas, { klein = false } = {}) {
  const r = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
  r.setClearColor(FARBEN.all); r.outputColorSpace = THREE.SRGBColorSpace;
  r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = 1.08;
  r.shadowMap.enabled = true; r.shadowMap.type = THREE.PCFSoftShadowMap;
  r.setPixelRatio(Math.min(devicePixelRatio || 1, klein ? 1.5 : 2));
  return r;
}

/* Modelle aufräumen. */
export function entsorge(wurzel) {
  wurzel.traverse(o => { o.geometry?.dispose(); for (const m of [].concat(o.material || [])) { for (const v of Object.values(m)) if (v?.isTexture) v.dispose(); m.dispose(); } });
}
