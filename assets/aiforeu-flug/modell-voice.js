/* AIFOREU · Flug · Station „Voice“ (Agentario): Kommunikationssatellit, der Gespräche aussendet.
   Bus mit Stahlrahmen und Graphitfolie, zwei Solarflügel quer (±X), auf dem Erddeck (+Y) ein großer Parabolspiegel
   an Mast und Kardan, Speisehorn am Dreibein. Der Strahl zeigt nach rechts oben: Die Szenenkamera (vorn, oben,
   Sonnenseite) sieht die Schüssel im Profil, die Wellenringe laufen frei über dem rechten Flügel davon. */
import { RoundedBoxGeometry } from '../agentario-scene/vendor/RoundedBoxGeometry.js';

/* Fester Zufall (mulberry32) */
function startwert(s) {
  return () => { s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
const leinwand = (b, h) => { const c = document.createElement('canvas'); c.width = b; c.height = h; return c; };

export default function erstelle(THREE, k) {
  const F = k.farben, hoch = k.qualitaet !== 'niedrig';
  const V3 = (x, y, z) => new THREE.Vector3(x, y, z), V2 = (x, y) => new THREE.Vector2(x, y);
  const zufall = startwert(1112);
  const gruppe = new THREE.Group(); gruppe.name = 'Voice';
  const sat = new THREE.Group(); sat.name = 'Satellit'; gruppe.add(sat);

  /* ---------- Hilfen ---------- */
  const textur = (c, farbig, wdh = 1) => { const t = new THREE.CanvasTexture(c); if (farbig) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(wdh, wdh); return t; };
  const netz = (geo, mat, eltern, schatten = true) => { const m = new THREE.Mesh(geo, mat); m.castShadow = m.receiveShadow = schatten; eltern.add(m); return m; };
  // Drehteil um Z (Spiegelachse) bzw. um Y (Mast, Decks); Profil (r, h). Reihenfolge der Punkte bestimmt die Außenseite.
  const drehteil = (pkte, seg, mat, eltern, schatten = true) => { const g = new THREE.LatheGeometry(pkte, seg); g.rotateX(Math.PI / 2); return netz(g, mat, eltern, schatten); };
  const drehteilY = (pkte, seg, mat, eltern, schatten = true) => netz(new THREE.LatheGeometry(pkte, seg), mat, eltern, schatten);
  // Harte Kanten: jeden inneren Punkt doppeln
  const hart = pk => pk.flatMap((p, i) => (i === 0 || i === pk.length - 1) ? [p] : [p, p.clone()]);
  const stab = (a, b, r, mat, eltern, seg = 8) => {
    const d = b.clone().sub(a), l = d.length(), m = netz(new THREE.CylinderGeometry(r, r, l, seg), mat, eltern);
    m.position.copy(a).addScaledVector(d, .5); m.quaternion.setFromUnitVectors(V3(0, 1, 0), d.normalize()); return m;
  };
  const kiste = (b, h, t, r, mat, eltern, x = 0, y = 0, z = 0, seg = 1) => { const m = netz(new RoundedBoxGeometry(b, h, t, seg, r), mat, eltern); m.position.set(x, y, z); return m; };

  /* ---------- Texturen (Canvas) ---------- */
  const R = .44, f = .30, dick = .012, rI = .04;          // Spiegel: Radius, Brennweite, Schalendicke, Innenradius
  const zP = r => r * r / (4 * f);

  // Spiegelvorderseite: Paneele mit Fugen, leichte Verschattung zum Rand und an der Scheitelplatte. u = Umfang, v = Profil
  function spiegelTexturen() {
    const B = 1024, H = 512, c = leinwand(B, H), x = c.getContext('2d'), cb = leinwand(B, H), xb = cb.getContext('2d');
    const yy = r => (r - rI) / (R - rI) * H;
    x.fillStyle = '#e2e7ee'; x.fillRect(0, 0, B, H); xb.fillStyle = '#fff'; xb.fillRect(0, 0, B, H);
    const zonen = [[rI, .13, 8], [.13, .235, 16], [.235, .34, 24], [.34, R, 32]];
    for (const [r0, r1, n] of zonen) {
      const y0 = yy(r0), y1 = yy(r1);
      for (let i = 0; i < n; i++) { const h = 222 + Math.round((zufall() - .5) * 6); x.fillStyle = `rgb(${h},${h + 5},${h + 12})`; x.fillRect(i / n * B, y0, B / n + 1, y1 - y0 + 1); }
    }
    for (const z of [x, xb]) {
      z.strokeStyle = z === x ? 'rgba(150,152,156,.55)' : 'rgba(0,0,0,.8)';
      for (const [r0, r1, n] of zonen) {
        const y0 = yy(r0), y1 = yy(r1);
        z.lineWidth = Math.min(3, 1.05 * R / ((r0 + r1) / 2));
        for (let i = 0; i <= n; i++) { const xp = i / n * B; z.beginPath(); z.moveTo(xp, y0); z.lineTo(xp, y1); z.stroke(); }
        z.lineWidth = 1.3; z.beginPath(); z.moveTo(0, y0); z.lineTo(B, y0); z.stroke();
      }
    }
    // Umgebungsverdeckung: innen an der Randlippe und um die Scheitelplatte etwas dunkler
    const ao = x.createLinearGradient(0, 0, 0, H);
    ao.addColorStop(0, 'rgba(40,44,52,.0)'); ao.addColorStop(.035, 'rgba(40,44,52,.0)'); ao.addColorStop(.97, 'rgba(40,44,52,.0)'); ao.addColorStop(1, 'rgba(40,44,52,.28)');
    x.fillStyle = ao; x.fillRect(0, 0, B, H);
    const lippe = x.createLinearGradient(0, H, 0, H - 26); lippe.addColorStop(0, 'rgba(40,44,52,.32)'); lippe.addColorStop(1, 'rgba(40,44,52,0)');
    x.fillStyle = lippe; x.fillRect(0, H - 26, B, 26);
    return { farbe: textur(c, true), relief: textur(cb, false) };
  }

  // Graphitfolie: zerknitterte Facetten (Voronoi) als Normalen-, Rauheits- und Farbkarte, kachelbar
  function folienTexturen() {
    const n = 320, z = 38, cN = leinwand(n, n), cR = leinwand(n, n), cF = leinwand(n, n);
    const xN = cN.getContext('2d'), xR = cR.getContext('2d'), xF = cF.getContext('2d');
    const bN = xN.createImageData(n, n), bR = xR.createImageData(n, n), bF = xF.createImageData(n, n);
    const pkt = [];
    for (let j = 0; j < z; j++) for (let i = 0; i < z; i++) pkt.push({ x: (i + .1 + .8 * zufall()) / z, y: (j + .1 + .8 * zufall()) / z, nx: (zufall() - .5) * .62, ny: (zufall() - .5) * .62, r: zufall(), h: zufall() });
    for (let py = 0; py < n; py++) for (let px = 0; px < n; px++) {
      const u = (px + .5) / n, v = (py + .5) / n, gi = Math.floor(u * z), gj = Math.floor(v * z);
      let d1 = 9, d2 = 9, b = null;
      for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
        const ii = gi + di, jj = gj + dj, p = pkt[((jj + z) % z) * z + (ii + z) % z];
        const d = (p.x + Math.floor(ii / z) - u) ** 2 + (p.y + Math.floor(jj / z) - v) ** 2;
        if (d < d1) { d2 = d1; d1 = d; b = p; } else if (d < d2) d2 = d;
      }
      const falte = 1 - Math.min(1, (Math.sqrt(d2) - Math.sqrt(d1)) * z * 4);
      const l = Math.hypot(b.nx, b.ny, 1), o = (py * n + px) * 4;
      bN.data[o] = (b.nx / l * .5 + .5) * 255; bN.data[o + 1] = (b.ny / l * .5 + .5) * 255; bN.data[o + 2] = (1 / l * .5 + .5) * 255; bN.data[o + 3] = 255;
      const rau = 112 + b.r * 34 + falte * 44; bR.data[o] = bR.data[o + 1] = bR.data[o + 2] = rau; bR.data[o + 3] = 255;
      const hell = 224 + b.h * 14 - falte * 22; bF.data[o] = hell; bF.data[o + 1] = hell; bF.data[o + 2] = hell + 4; bF.data[o + 3] = 255;
    }
    xN.putImageData(bN, 0, 0); xR.putImageData(bR, 0, 0); xF.putImageData(bF, 0, 0);
    // Klebebandnähte der Isolierdecken: Rand und eine Quernaht, matter als die Folie
    for (const [z2, farbe, breite] of [[xF, 'rgba(255,255,255,.55)', 3], [xR, 'rgba(235,235,235,.8)', 3], [xN, 'rgb(128,128,255)', 3]]) {
      z2.strokeStyle = farbe; z2.lineWidth = breite; z2.strokeRect(9, 9, n - 18, n - 18);
      z2.beginPath(); z2.moveTo(9, n * .56); z2.lineTo(n - 9, n * .56); z2.stroke();
    }
    return { normal: textur(cN, false), rau: textur(cR, false), farbe: textur(cF, true) };
  }

  // Solarzellen: dunkle Zellen mit Fingern und Sammelschienen, Stege hell
  function zellenTexturen() {
    const B = 512, H = 768, c = leinwand(B, H), x = c.getContext('2d'), cr = leinwand(B, H), xr = cr.getContext('2d');
    x.fillStyle = '#5a606a'; x.fillRect(0, 0, B, H); xr.fillStyle = '#9a9a9a'; xr.fillRect(0, 0, B, H);
    const rand = 12, spalt = 3, sp = 6, ze = 10;
    const zb = (B - 2 * rand - (sp - 1) * spalt) / sp, zh = (H - 2 * rand - (ze - 1) * spalt) / ze;
    for (let j = 0; j < ze; j++) for (let i = 0; i < sp; i++) {
      const x0 = rand + i * (zb + spalt), y0 = rand + j * (zh + spalt), e = 5;
      const pfad = t => { t.beginPath(); t.moveTo(x0 + e, y0); t.lineTo(x0 + zb - e, y0); t.lineTo(x0 + zb, y0 + e); t.lineTo(x0 + zb, y0 + zh - e); t.lineTo(x0 + zb - e, y0 + zh); t.lineTo(x0 + e, y0 + zh); t.lineTo(x0, y0 + zh - e); t.lineTo(x0, y0 + e); t.closePath(); };
      const v = (zufall() - .5) * 7, g = x.createLinearGradient(x0, y0, x0 + zb, y0 + zh);
      g.addColorStop(0, `rgb(${62 + v},${80 + v},${114 + v})`); g.addColorStop(1, `rgb(${42 + v},${56 + v},${84 + v})`);
      pfad(x); x.fillStyle = g; x.fill();
      x.save(); pfad(x); x.clip(); x.strokeStyle = 'rgba(150,162,180,.10)'; x.lineWidth = 1;
      for (let yy = y0 + 3; yy < y0 + zh; yy += 4) { x.beginPath(); x.moveTo(x0, yy + .5); x.lineTo(x0 + zb, yy + .5); x.stroke(); }
      x.strokeStyle = 'rgba(190,198,210,.32)'; x.lineWidth = 1.5;
      for (const q of [.3, .7]) { x.beginPath(); x.moveTo(x0 + zb * q, y0); x.lineTo(x0 + zb * q, y0 + zh); x.stroke(); }
      x.restore(); pfad(xr); xr.fillStyle = '#2a2a2a'; xr.fill();
    }
    return { farbe: textur(c, true), rau: textur(cr, false) };
  }

  // Radiator: Spiegelkacheln (OSR) mit feinen Fugen
  function radiatorTexturen() {
    const n = 256, c = leinwand(n, n), x = c.getContext('2d'), cr = leinwand(n, n), xr = cr.getContext('2d');
    x.fillStyle = '#868c94'; x.fillRect(0, 0, n, n); xr.fillStyle = '#707070'; xr.fillRect(0, 0, n, n);
    const t = 10, s = n / t;
    for (let j = 0; j < t; j++) for (let i = 0; i < t; i++) {
      const h = 142 + Math.round((zufall() - .5) * 8); x.fillStyle = `rgb(${h},${h + 3},${h + 8})`; x.fillRect(i * s + 1, j * s + 1, s - 2, s - 2);
      const r = 30 + Math.round(zufall() * 30); xr.fillStyle = `rgb(${r},${r},${r})`; xr.fillRect(i * s + 1, j * s + 1, s - 2, s - 2);
    }
    return { farbe: textur(c, true), rau: textur(cr, false) };
  }

  // Paneelrückseite: Kohlefaser-Graphit, helle Klebebänder als Raster, Kabelstrang
  function rueckTextur() {
    const B = 256, H = 384, c = leinwand(B, H), x = c.getContext('2d');
    x.fillStyle = '#3b4049'; x.fillRect(0, 0, B, H);
    x.strokeStyle = 'rgba(205,208,212,.28)'; x.lineWidth = 2;
    for (let i = 1; i < 4; i++) { x.beginPath(); x.moveTo(i * B / 4, 6); x.lineTo(i * B / 4, H - 6); x.stroke(); }
    for (let j = 1; j < 6; j++) { x.beginPath(); x.moveTo(6, j * H / 6); x.lineTo(B - 6, j * H / 6); x.stroke(); }
    x.fillStyle = 'rgba(190,192,196,.5)'; x.fillRect(B * .5 - 5, 6, 10, H - 12);
    x.strokeStyle = 'rgba(120,126,134,.9)'; x.lineWidth = 6; x.strokeRect(3, 3, B - 6, H - 6);
    return textur(c, true);
  }

  function leuchtTextur() {
    const c = leinwand(64, 64), x = c.getContext('2d'), g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(.18, 'rgba(255,255,255,.75)'); g.addColorStop(.5, 'rgba(255,255,255,.16)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g; x.fillRect(0, 0, 64, 64); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  }

  const sp = spiegelTexturen(), fo = folienTexturen(), ze = zellenTexturen(), ra = radiatorTexturen();

  /* ---------- Materialien ---------- */
  const M = {
    // matter Reflektorlack wie im Original (bündelt die Sonne nicht aufs Horn); Klarlack nur als Hauch
    spiegel: new THREE.MeshPhysicalMaterial({ color: '#ffffff', map: sp.farbe, bumpMap: sp.relief, bumpScale: .6, roughness: .64, metalness: 0, clearcoat: .06, clearcoatRoughness: .55 }),
    rueck: new THREE.MeshPhysicalMaterial({ color: F.graphit, roughness: .5, metalness: .35, clearcoat: .25, clearcoatRoughness: .4 }),
    stahl: new THREE.MeshStandardMaterial({ color: '#a9b3c0', metalness: .85, roughness: .3 }),
    stahlDunkel: new THREE.MeshStandardMaterial({ color: '#5b6470', metalness: .8, roughness: .38 }),
    rahmen: new THREE.MeshStandardMaterial({ color: '#9aa4b2', metalness: .7, roughness: .34 }),
    rippe: new THREE.MeshStandardMaterial({ color: '#5d6672', metalness: .45, roughness: .64 }),   // matt, sonst blitzt eine Rippenflanke wie ein loses Blatt
    graphit: new THREE.MeshStandardMaterial({ color: '#232a33', metalness: .45, roughness: .42 }),
    keramik: new THREE.MeshPhysicalMaterial({ color: '#cfd3d8', roughness: .38, metalness: .1, clearcoat: .4 }),
    strebe: new THREE.MeshStandardMaterial({ color: '#59616c', metalness: .6, roughness: .38 }),
    // Folie satiniert statt Spiegel: weniger Metall, flachere Facetten, sonst spiegelt sie den kühlen Horizont fleckig
    folie: new THREE.MeshStandardMaterial({ color: '#3a414b', map: fo.farbe, normalMap: fo.normal, normalScale: V2(.32, .32), roughnessMap: fo.rau, roughness: 1.25, metalness: .5 }),
    radiator: new THREE.MeshStandardMaterial({ color: '#ffffff', map: ra.farbe, roughnessMap: ra.rau, roughness: 1, metalness: .92 }),
    zellen: new THREE.MeshPhysicalMaterial({ color: '#ffffff', map: ze.farbe, roughnessMap: ze.rau, roughness: 1, metalness: .12, clearcoat: .3, clearcoatRoughness: .12 }),
    paneelRueck: new THREE.MeshStandardMaterial({ color: '#ffffff', map: rueckTextur(), roughness: .62, metalness: .2 }),
    hornInnen: new THREE.MeshStandardMaterial({ color: '#0d1116', roughness: .6, metalness: .3, side: THREE.DoubleSide }),
    duese: new THREE.MeshStandardMaterial({ color: '#4c545f', metalness: .85, roughness: .34, side: THREE.DoubleSide }),
    lampe: new THREE.MeshStandardMaterial({ color: '#3a1d12', emissive: new THREE.Color(F.orange), emissiveIntensity: 0, roughness: .3 }),
  };

  /* ---------- Bus: Stahlrahmen, Graphitdecken, Radiatoren an den Flügelseiten ---------- */
  const bW = .36, bH = .30, bD = .32, yO = bH / 2, yU = -bH / 2;
  kiste(bW, bH, bD, .012, M.rahmen, sat, 0, 0, 0, hoch ? 2 : 1);                         // Rahmen (sichtbar an den Kanten)
  kiste(bW - .03, bH + .006, bD - .03, .005, M.folie, sat);                              // Decke Erd- und Gegendeck
  kiste(bW - .03, bH - .03, bD + .006, .005, M.folie, sat);                              // Decke vorn und hinten
  for (const sx of [-1, 1]) kiste(.008, bH - .05, bD - .05, .002, M.radiator, sat, sx * (bW / 2 + .003));   // OSR-Radiatoren
  // Erddeck: Montageplatte unter dem Mast
  const MX = -.02, MZ = 0;
  kiste(.15, .008, .15, .002, M.stahl, sat, MX, yO + .006, MZ);
  // kleine Hornantennen vorn
  for (const sx of [-1, 1]) {
    const g = new THREE.CylinderGeometry(.021, .008, .036, 4, 1); g.rotateY(Math.PI / 4); g.rotateX(Math.PI / 2);
    netz(g, M.stahl, sat).position.set(sx * .105, -.07, bD / 2 + .021);
  }
  // Gegendeck (unten): Adapterring, Apogäumstriebwerk, Lagedüsen an den Ecken
  const yG = yU - .003;
  drehteilY(hart([V2(.097, yG - .014), V2(.097, yG), V2(.086, yG), V2(.086, yG - .014), V2(.097, yG - .014)]), 56, M.stahl, sat);
  const bell = []; for (let j = 0; j <= 10; j++) { const s = 1 - j / 10; bell.push(V2(.015 + .03 * Math.pow(s, .75), yG - .02 - .07 * s)); }
  drehteilY(bell, 32, M.duese, sat);
  drehteilY(hart([V2(.024, yG - .022), V2(.024, yG - .006), V2(.034, yG - .002), V2(.034, yG)]), 24, M.stahl, sat);
  const geoDuese = new THREE.LatheGeometry([V2(.012, -.02), V2(.0085, -.01), V2(.0055, 0)], 12);
  const duesen = new THREE.InstancedMesh(geoDuese, M.duese, 4); let di = 0;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) { const m = new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(-sz * .3, 0, sx * .3)); m.setPosition(sx * .15, yU + .002, sz * .13); duesen.setMatrixAt(di++, m); }
  duesen.castShadow = true; sat.add(duesen);
  // Sternsensoren mit Blenden, hinten auf dem Erddeck
  for (const [x, w] of [[-.125, -.35], [-.075, -.2]]) {
    const st = new THREE.Group(); st.position.set(x, yO + .007, -.11); st.rotation.set(-.5, 0, w); sat.add(st);
    netz(new THREE.CylinderGeometry(.014, .014, .026, 16), M.graphit, st).position.y = .013;
    netz(new THREE.LatheGeometry([V2(.025, .052), V2(.015, .026)], 16), M.duese, st);
  }
  // Rundstrahlantenne hinten rechts
  stab(V3(.13, yO + .004, -.12), V3(.13, yO + .1, -.135), .0028, M.stahl, sat, 6);
  netz(new THREE.ConeGeometry(.011, .016, 12), M.stahl, sat).position.set(.13, yO + .105, -.136);

  /* ---------- Mast und Kardan ---------- */
  const hMast = .25, yPiv = yO + .01 + hMast + .05, AZ = 100 * Math.PI / 180, EL = 26 * Math.PI / 180;
  stab(V3(MX, yO + .01, MZ), V3(MX, yPiv - .045, MZ), .021, M.stahlDunkel, sat, 20);   // Mastrohr
  drehteilY(hart([V2(.04, yO + .01), V2(.04, yO + .022), V2(.024, yO + .03), V2(.021, yO + .03)]), 32, M.stahl, sat);   // Fußflansch
  for (const w of [30, 150, 270]) {   // Abspannstreben
    const a = w * Math.PI / 180, c = Math.cos(a), s = Math.sin(a);
    stab(V3(MX + c * .065, yO + .012, MZ + s * .065), V3(MX + c * .02, yO + .16, MZ + s * .02), .0042, M.strebe, sat, 6);
  }
  drehteilY(hart([V2(.028, yO + .155), V2(.028, yO + .175), V2(.021, yO + .178)]), 24, M.stahl, sat);   // Schelle der Streben
  const azimut = new THREE.Group(); azimut.position.set(MX, yPiv, MZ); azimut.rotation.y = AZ; sat.add(azimut);   // Drehteller (um die Mastachse)
  const schwenk = new THREE.Group(); schwenk.rotation.x = -EL; azimut.add(schwenk);                              // Gabelachse
  const spiegel = new THREE.Group(); spiegel.position.z = .10; schwenk.add(spiegel);                              // Scheitel, Achse +Z
  drehteilY(hart([V2(.05, -.05), V2(.05, -.04), V2(.046, -.037), V2(.02, -.037)]), 40, M.stahl, azimut);
  for (const sx of [-1, 1]) {
    kiste(.012, .06, .048, .003, M.stahl, azimut, sx * .068, -.012, 0);
    netz(new THREE.CylinderGeometry(.013, .013, .012, 16).rotateZ(Math.PI / 2), M.stahlDunkel, azimut).position.x = sx * .056;
    netz(new THREE.CylinderGeometry(.017, .017, .006, 20).rotateZ(Math.PI / 2), M.stahlDunkel, azimut).position.x = sx * .077;
  }

  /* ---------- Spiegel ---------- */
  const nPr = hoch ? 20 : 12, nUm = hoch ? 80 : 44;
  // Vorderseite (vom Rand zur Mitte, Normalen in die Schale)
  const vorn = []; for (let j = 0; j <= nPr; j++) { const r = R - (R - rI) * j / nPr; vorn.push(V2(r, zP(r))); }
  const flaeche = drehteil(vorn, nUm, M.spiegel, spiegel); flaeche.receiveShadow = false;
  const platte = drehteil(hart([V2(rI + .004, zP(rI) - .001), V2(rI - .002, .007), V2(.012, .009), V2(0, .009)]), 32, M.keramik, spiegel);   // Scheitelplatte
  // Rückseite (von innen nach außen)
  const hinten = []; for (let j = 0; j <= Math.round(nPr * .6); j++) { const r = .06 + (R - .06) * j / Math.round(nPr * .6); hinten.push(V2(r, zP(r) - dick)); }
  drehteil(hinten, nUm, M.rueck, spiegel);
  // Randlippe (von hinten nach vorn, Normalen nach außen)
  const zR = zP(R);
  drehteil([V2(R - .003, zR - dick), V2(R + .004, zR - dick + .002), V2(R + .0075, zR - dick * .5), V2(R + .0065, zR - .0015), V2(R + .002, zR + .0018), V2(R - .005, zR + .0006)], nUm, M.stahl, spiegel);

  // Rippen auf der Rückseite: Höhe nimmt nach außen ab, mit Erleichterungslöchern
  const rA = .07, rB = R - .01, t0 = .066, t1 = .012, tiefe = r => t0 + (t1 - t0) * (r - rA) / (rB - rA);
  const form = new THREE.Shape(), nR = 12;
  for (let j = 0; j <= nR; j++) { const r = rA + (rB - rA) * j / nR; j ? form.lineTo(r, zP(r) - dick - tiefe(r)) : form.moveTo(r, zP(r) - dick - tiefe(r)); }
  for (let j = nR; j >= 0; j--) { const r = rA + (rB - rA) * j / nR; form.lineTo(r, zP(r) - dick + .001); }
  if (hoch) for (const s of [.16, .38, .6]) {
    const r = rA + (rB - rA) * s, h = tiefe(r), loch = new THREE.Path();
    loch.absarc(r, zP(r) - dick - h * .5, h * .27, 0, Math.PI * 2, true); form.holes.push(loch);
  }
  const geoRippe = new THREE.ExtrudeGeometry(form, { depth: .006, bevelEnabled: false, curveSegments: 5 });
  geoRippe.translate(0, 0, -.003); geoRippe.rotateX(Math.PI / 2);
  const nRip = hoch ? 16 : 12, rippen = new THREE.InstancedMesh(geoRippe, M.rippe, nRip), mh = new THREE.Matrix4();
  for (let i = 0; i < nRip; i++) rippen.setMatrixAt(i, mh.makeRotationZ(i / nRip * Math.PI * 2));
  rippen.castShadow = rippen.receiveShadow = true; spiegel.add(rippen);
  // Umlaufende Spanten an der Rippenunterkante
  for (const r of [.2, .34]) netz(new THREE.TorusGeometry(r, .0042, 6, nUm), M.rippe, spiegel).position.z = zP(r) - dick - tiefe(r) + .003;
  // Nabe mit Flanschring, Kardanblock zwischen den Gabelzapfen
  drehteil(hart([V2(0, -.084), V2(.054, -.084), V2(.062, -.077), V2(.062, -.014), V2(.07, -.008)]), 40, M.graphit, spiegel);
  drehteil(hart([V2(.063, -.062), V2(.07, -.062), V2(.07, -.054), V2(.063, -.054)]), 40, M.stahl, spiegel);
  kiste(.10, .04, .036, .006, M.stahlDunkel, spiegel, 0, 0, -.10);

  // Speisehorn: geriffelter Konus, Öffnung zum Spiegel, dahinter das Gehäuse mit Lampe
  const horn = [V2(.041, f), V2(.050, f)], nK = 6, hK = .0095;
  for (let i = 0; i < nK; i++) { const z0 = f + i * hK, rr = .050 - i * .0042; horn.push(V2(rr, z0 + .0006), V2(rr, z0 + hK * .55), V2(rr - .005, z0 + hK * .62), V2(rr - .005, z0 + hK * .98)); }
  const zH = f + nK * hK;
  horn.push(V2(.03, zH + .002), V2(.03, zH + .056), V2(.026, zH + .062), V2(.012, zH + .064), V2(0, zH + .064));
  drehteil(horn, hoch ? 32 : 18, M.stahl, spiegel);
  drehteil([V2(.012, f + .05), V2(.041, f + .0004)], hoch ? 32 : 18, M.hornInnen, spiegel, false);
  drehteil(hart([V2(.031, zH + .018), V2(.0325, zH + .02), V2(.0325, zH + .03), V2(.031, zH + .032)]), 32, M.graphit, spiegel);   // Schelle
  const zLampe = zH + .064;
  const lampe = netz(new THREE.SphereGeometry(.0075, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), M.lampe, spiegel, false);
  lampe.rotation.x = Math.PI / 2; lampe.position.z = zLampe - .001;
  const leucht = leuchtTextur();
  const glanz = new THREE.Sprite(new THREE.SpriteMaterial({ map: leucht, color: new THREE.Color(F.orange), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
  glanz.position.z = zLampe + .004; glanz.scale.setScalar(.06); spiegel.add(glanz);
  // Sendeglühen in der Hornöffnung, folgt dem Sprechpegel
  const sendung = new THREE.Sprite(new THREE.SpriteMaterial({ map: leucht, color: new THREE.Color('#ffd9b0'), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
  sendung.position.z = f - .002; sendung.scale.setScalar(.05); spiegel.add(sendung);   // klein und in der Öffnung, sonst liegt es als Fleck auf dem Spiegel

  // Dreibein vom Spiegelrand zur Schelle; Segmente merken für den Schatten auf der Fläche
  const segmente = [[V3(0, 0, f), V3(0, 0, zH), .044], [V3(0, 0, zH), V3(0, 0, zH + .064), .031]];
  for (const w of [90, 210, 330]) {
    const a = w * Math.PI / 180, c = Math.cos(a), s = Math.sin(a);
    const fuss = V3(c * (R - .035), s * (R - .035), zP(R - .035) + .002), kopf = V3(c * .031, s * .031, zH + .025);
    stab(fuss, kopf, .0046, M.strebe, spiegel); segmente.push([fuss.clone(), kopf.clone(), .0046]);
    const d = kopf.clone().sub(fuss).normalize();
    stab(fuss.clone().addScaledVector(d, -.004), fuss.clone().addScaledVector(d, .03), .0085, M.stahl, spiegel, 10);
    if (w === 90) {   // Speisekabel an der oberen Strebe, leicht versetzt
      const v = V3(-s, c, 0).multiplyScalar(.0085);
      stab(fuss.clone().add(v).addScaledVector(d, .03), kopf.clone().add(v).addScaledVector(d, -.012), .0022, M.stahl, spiegel, 6);
    }
  }
  kiste(.022, .016, .03, .003, M.stahlDunkel, spiegel, 0, .036, zH + .04);   // Hohlleiterkasten
  segmente.push([V3(0, .036, zH + .025), V3(0, .036, zH + .055), .011]);

  /* Schatten von Horn, Dreibein und Hohlleiterkasten auf der Spiegelfläche: analytisch im Shader, weil die
     Schattenkarte der Szene für 1-cm-Streben zu grob ist. Wirkt für jedes gerichtete Licht, Halbschatten wächst mit dem Abstand. */
  const NS = segmente.length, sA = segmente.map(() => V3(0, 0, 0)), sB = segmente.map(() => V3(0, 0, 0)), sR = segmente.map(() => 0), sK = { value: .001 };
  const mvS = new THREE.Matrix4();
  function schattenLage(renderer, szene, kamera) {
    mvS.multiplyMatrices(kamera.matrixWorldInverse, this.matrixWorld);
    const sk = this.matrixWorld.getMaxScaleOnAxis();
    for (let i = 0; i < NS; i++) { sA[i].copy(segmente[i][0]).applyMatrix4(mvS); sB[i].copy(segmente[i][1]).applyMatrix4(mvS); sR[i] = segmente[i][2] * sk; }
    sK.value = .0012 * sk;
  }
  const schattenGlsl = `
    uniform vec3 uSegA[${NS}]; uniform vec3 uSegB[${NS}]; uniform float uSegR[${NS}]; uniform float uSegK;
    float speiseSchatten(vec3 L) {
      vec3 P = -vViewPosition; float hell = 1.0;
      for (int i = 0; i < ${NS}; i++) {
        vec3 A = uSegA[i], AB = uSegB[i] - A, W = P - A;
        float b = dot(L, AB), c = dot(AB, AB), d = dot(L, W), e = dot(AB, W);
        float u = clamp((e - b * d) / max(c - b * b, 1e-9), 0.0, 1.0);
        vec3 Q = A + u * AB; float s = dot(Q - P, L);
        if (s <= 0.0) continue;
        float abst = length(P + s * L - Q), rand = uSegK + s * 0.016;
        hell *= mix(0.06, 1.0, smoothstep(uSegR[i] - rand, uSegR[i] + rand, abst));
      }
      return hell;
    }
    void main() {`;
  const mitSpeiseSchatten = mat => {
    mat.onBeforeCompile = sh => {
      Object.assign(sh.uniforms, { uSegA: { value: sA }, uSegB: { value: sB }, uSegR: { value: sR }, uSegK: sK });
      sh.fragmentShader = sh.fragmentShader.replace('void main() {', schattenGlsl).replace('#include <lights_fragment_begin>',
        THREE.ShaderChunk.lights_fragment_begin.replace('getDirectionalLightInfo( directionalLight, directLight );', 'getDirectionalLightInfo( directionalLight, directLight );\n\t\tif ( dot( directLight.color, vec3( .2126, .7152, .0722 ) ) > 1.5 ) directLight.color *= speiseSchatten( directLight.direction );'));
    };   // nur die Sonne (einziges helles Richtlicht) wirft den Speiseschatten; Schatten des kühlen Begleitlichts sähen wie Flecken aus
    mat.customProgramCacheKey = () => 'voice-speiseschatten';
  };
  mitSpeiseSchatten(M.spiegel); mitSpeiseSchatten(M.keramik);
  flaeche.onBeforeRender = platte.onBeforeRender = schattenLage;

  /* ---------- Solarflügel ---------- */
  const pw = .17, ph = .27, spalt = .011, matPaneel = [M.stahl, M.stahl, M.stahl, M.stahl, M.zellen, M.paneelRueck];
  for (const sx of [-1, 1]) {
    const fl = new THREE.Group(); fl.position.set(sx * (bW / 2 + .007), 0, 0); fl.rotation.x = -.38; sat.add(fl);
    netz(new THREE.CylinderGeometry(.03, .03, .036, 24).rotateZ(Math.PI / 2), M.stahlDunkel, fl).position.x = sx * .018;   // Antrieb (SADA)
    const x0 = sx * .036, x1 = sx * .118;
    stab(V3(x0, 0, 0), V3(x1, .11, 0), .0055, M.graphit, fl); stab(V3(x0, 0, 0), V3(x1, -.11, 0), .0055, M.graphit, fl);
    for (let i = 0; i < 3; i++) {
      const cx = sx * (.12 + pw / 2 + i * (pw + spalt));
      const p = netz(new THREE.BoxGeometry(pw, ph, .009), matPaneel, fl); p.position.x = cx; p.receiveShadow = false;   // grobe Schattenkarte gäbe Flecken
      if (i < 2) for (const sy of [-1, 1]) netz(new THREE.CylinderGeometry(.0045, .0045, .03, 8), M.stahlDunkel, fl).position.set(cx + sx * (pw + spalt) / 2, sy * .085, 0);
    }
  }

  /* ---------- Wellenringe (Bänder, die zur Kamera zeigen, konstante Breite) ---------- */
  const S = hoch ? 96 : 64, N = hoch ? 40 : 26;
  const pos = new Float32Array((S + 1) * 6), sei = new Float32Array((S + 1) * 2), idx = [];
  for (let i = 0; i <= S; i++) { const w = i / S * Math.PI * 2; for (let q = 0; q < 2; q++) { pos.set([Math.cos(w), Math.sin(w), 0], (i * 2 + q) * 3); sei[i * 2 + q] = q ? 1 : -1; } }
  for (let i = 0; i < S; i++) { const a = i * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
  const rg = new THREE.BufferGeometry(); rg.setAttribute('position', new THREE.BufferAttribute(pos, 3)); rg.setAttribute('seite', new THREE.BufferAttribute(sei, 1)); rg.setIndex(idx);
  const aB = new THREE.InstancedBufferAttribute(new Float32Array(N), 1), aA = new THREE.InstancedBufferAttribute(new Float32Array(N), 1), aF = new THREE.InstancedBufferAttribute(new Float32Array(N * 3), 3);
  for (const a of [aB, aA, aF]) a.setUsage(THREE.DynamicDrawUsage);
  rg.setAttribute('aBreite', aB); rg.setAttribute('aAlpha', aA); rg.setAttribute('aFarbe', aF);
  const ringMat = new THREE.ShaderMaterial({
    uniforms: { uPixel: { value: new THREE.Vector2(1200, 800) } },
    vertexShader: /* glsl */`
      attribute float seite; attribute float aBreite; attribute float aAlpha; attribute vec3 aFarbe;
      uniform vec2 uPixel; varying float vQuer; varying float vAlpha; varying vec3 vFarbe;
      void main() {
        mat4 mv = modelViewMatrix * instanceMatrix;
        vec4 p = mv * vec4(position, 1.0);
        vec3 tang = normalize((mv * vec4(-position.y, position.x, 0.0, 0.0)).xyz + 1e-6);
        vec3 quer = cross(tang, normalize(-p.xyz)); float l = length(quer);
        quer = l > 1e-3 ? quer / l : normalize((mv * vec4(0.0, 0.0, 1.0, 0.0)).xyz + 1e-6);
        float b = aBreite * length(modelMatrix[0].xyz);
        float pxJe = uPixel.y * 0.5 * projectionMatrix[1][1] / max(-p.z, 1e-3);
        float minB = 1.0 / pxJe, faktor = 1.0;          // mindestens ~2 px breit, dafür etwas blasser
        if (b < minB) { faktor = sqrt(b / minB); b = minB; }
        p.xyz += quer * seite * b;
        vQuer = seite; vAlpha = aAlpha * faktor; vFarbe = aFarbe;
        gl_Position = projectionMatrix * p;
      }`,
    fragmentShader: /* glsl */`
      varying float vQuer; varying float vAlpha; varying vec3 vFarbe;
      void main() {
        float d = abs(vQuer);
        float kern = 1.0 - smoothstep(0.22, 0.55, d), hof = (1.0 - d) * (1.0 - d);
        gl_FragColor = vec4(vFarbe * vAlpha * (kern * 0.9 + hof * 0.32), 1.0);
        #include <colorspace_fragment>
      }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, forceSinglePass: true, toneMapped: false,
  });
  const ringe = new THREE.InstancedMesh(rg, ringMat, N); ringe.frustumCulled = false; ringe.name = 'Wellen';
  const R0 = .19, R1 = .45, Z0 = f + .05, Z1 = Z0 + .48, L = 1.3;   // Strahlkegel und Lebensdauer
  const mt = new THREE.Matrix4();
  for (let i = 0; i < N; i++) { const s = i % 2; mt.makeScale(s ? R1 : R0, s ? R1 : R0, 1).setPosition(0, 0, s ? Z1 : Z0); ringe.setMatrixAt(i, mt); }
  ringe.computeBoundingBox(); ringe.computeBoundingSphere();   // Hülle des ganzen Strahls
  ringe.onBeforeRender = r => r.getDrawingBufferSize(ringMat.uniforms.uPixel.value);
  spiegel.add(ringe);

  /* ---------- Stimme: Phrasen aus Wörtern aus Silben aus Ringen ---------- */
  const plan = (() => {
    const rnd = startwert(4711), liste = []; let t = .05, phrase = 0;
    while (t < 15) {
      const a = phrase % 2 === 0;                        // Sprecher A führt; Sprecher B antwortet (in Ruhe nur leise)
      const woerter = a ? 3 + Math.floor(rnd() * 2) : 1 + Math.floor(rnd() * 2);
      for (let w = 0; w < woerter; w++) {
        const silben = 1 + Math.floor(rnd() * 3), betont = Math.floor(rnd() * silben);
        for (let s = 0; s < silben; s++) {
          const n = 3 + Math.floor(rnd() * 4), takt = .066 + rnd() * .03, laut = (s === betont ? 1 : .6 + rnd() * .25) * (a ? 1 : .82);
          for (let i = 0; i < n; i++) {
            const huelle = Math.pow(Math.sin(Math.PI * (i + .5) / n), .8), spitze = i === 2 * Math.floor((n - 1) / 4);
            liste.push({ e: t, a: laut * (.3 + .7 * huelle), orange: a && s === betont && spitze && w % 2 === 0, basis: i % 2 === 0, leise: !a, akzent: s === betont && i === 0 });
            t += takt * (.9 + .2 * rnd());
          }
          t += .09 + rnd() * .07;
        }
        t += .16 + rnd() * .16;
      }
      t += .26 + rnd() * .2; phrase++;
    }
    return { liste, P: t + .2 };
  })();
  const P = plan.P, weiss = new THREE.Color('#ffe8cc'), orange = new THREE.Color(F.orange).multiplyScalar(1.35);

  /* ---------- Einpassen: Kugel mit Radius < 1 um den Ursprung ---------- */
  sat.updateMatrixWorld(true);
  const pkte = [], mi = new THREE.Matrix4(), mw = new THREE.Matrix4();
  sat.traverse(o => {
    if (!o.isMesh || o === ringe) return;
    const p = o.geometry.attributes.position, n = o.isInstancedMesh ? o.count : 1;
    for (let i = 0; i < n; i++) {
      if (o.isInstancedMesh) { o.getMatrixAt(i, mi); mw.multiplyMatrices(o.matrixWorld, mi); } else mw.copy(o.matrixWorld);
      for (let j = 0; j < p.count; j += 2) pkte.push(new THREE.Vector3().fromBufferAttribute(p, j).applyMatrix4(mw));
    }
  });
  for (let i = 0; i < 48; i++) { const w = i / 48 * Math.PI * 2; for (const [r, z] of [[R0, Z0], [R1, Z1]]) pkte.push(V3(Math.cos(w) * r, Math.sin(w) * r, z).applyMatrix4(spiegel.matrixWorld)); }
  const box = new THREE.Box3().setFromPoints(pkte), mitte = box.getCenter(new THREE.Vector3());
  let best = Infinity, bestM = mitte.clone();
  for (let it = 0; it < 400; it++) {         // Mittelpunkt zur kleinsten Hüllkugel schieben
    let fern = null, dmax = 0; for (const p of pkte) { const d = p.distanceToSquared(mitte); if (d > dmax) { dmax = d; fern = p; } }
    if (Math.sqrt(dmax) < best) { best = Math.sqrt(dmax); bestM.copy(mitte); }
    mitte.lerp(fern, 1 / (it + 6));
  }
  const skala = .975 / best; sat.scale.setScalar(skala); sat.position.copy(bestM).multiplyScalar(-skala);
  const oben = box.max.y;

  return {
    gruppe,
    radius: 1,
    anker: new THREE.Vector3(0, (oben - bestM.y) * skala + .12, 0),
    aktualisiere(t, zustand) {
      const z = zustand || {}, aktiv = !!z.aktiv, nah = Math.min(1, Math.max(0, +z.naehe || 0));
      // Spiegel führt ganz leicht nach
      schwenk.rotation.set(-EL + .01 * Math.sin(t * .23 + 1.1), .014 * Math.sin(t * .17), 0);
      // Ringe aus dem Stimmplan
      const hell = (aktiv ? 1.1 : .92) * (1 + .2 * nah);
      let n = 0, pegel = 0, blitz = 0;
      for (const r of plan.liste) {
        if (!aktiv && !r.basis) continue;
        const alter = ((t - r.e) % P + P) % P; if (alter >= L) continue;
        if (alter < .14) pegel = Math.max(pegel, (r.leise && !aktiv ? .5 : 1) * r.a * (1 - alter / .14));
        if (r.akzent && alter < .22) blitz = Math.max(blitz, 1 - alter / .22);
        const s = alter / L, rad = R0 + (R1 - R0) * s;
        mt.makeScale(rad, rad, 1).setPosition(0, 0, Z0 + (Z1 - Z0) * s); ringe.setMatrixAt(n, mt);
        // weich ein (über dem hellen Spiegel noch leise), Plateau vor dem Schwarz, aus
        const x = Math.min(1, s / .34), y = Math.max(0, (s - .55) / .45), ein = x * x * (3 - 2 * x), aus = 1 - y * y * (3 - 2 * y);
        const a = r.leise && !aktiv ? r.a * .55 : r.a;
        aA.array[n] = Math.pow(a, 1.3) * ein * aus * hell;
        aB.array[n] = (.0016 + .0042 * a) * (.75 + .5 * s);
        const c = r.orange ? orange : weiss; aF.array[n * 3] = c.r; aF.array[n * 3 + 1] = c.g; aF.array[n * 3 + 2] = c.b;
        if (++n >= N) break;
      }
      for (let i = n; i < N; i++) { mt.makeScale(1e-4, 1e-4, 1).setPosition(0, 0, Z0); ringe.setMatrixAt(i, mt); aA.array[i] = 0; aB.array[i] = 0; }
      ringe.instanceMatrix.needsUpdate = aA.needsUpdate = aB.needsUpdate = aF.needsUpdate = true;
      sendung.material.opacity = pegel * (aktiv ? .55 : .38) * (1 + .3 * nah); sendung.visible = pegel > .01;
      // Lampe am Horn: im Gespräch kurzer oranger Blitz auf jeder betonten Silbe
      const an = aktiv ? blitz * blitz * (3 - 2 * blitz) : 0;
      M.lampe.emissiveIntensity = .08 + an * 6; glanz.material.opacity = an; glanz.visible = an > .01; glanz.scale.setScalar(.05 + .03 * an);
    },
  };
}
