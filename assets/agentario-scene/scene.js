// Shared-case scene and geometry kit from the AIFOREU motion studio.
// Local import paths only; scene geometry and timing are preserved.
import * as THREE from './vendor/three.module.min.js';
import { RoundedBoxGeometry } from './vendor/RoundedBoxGeometry.js';

export const palette = { ink: '#253047', white: '#fafcff', blue: '#506cea', teal: '#168a79', amber: '#c18b38', muted: '#8290a4', line: '#d2dce8', pale: '#e7edf5' };
export const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const ease = v => { v = clamp(v); return v * v * (3 - 2 * v); };
export const phase = (t, a, b) => ease((t - a) / (b - a));
export const mix = (a, b, t) => a + (b - a) * t;

export function makeKit() {
  const resources = new Set();
  function track(object) { resources.add(object); return object; }
  function material(color = palette.white, extra = {}) {
    return track(new THREE.MeshStandardMaterial({ color, roughness: .34, metalness: .12, ...extra }));
  }
  function box({ w = 1, h = .18, d = 1, x = 0, y = 0, z = 0, color = palette.white, r = .07, metalness, opacity = 1 } = {}) {
    const geometry = track(new RoundedBoxGeometry(w, h, d, 3, Math.min(r, w/3, h/3, d/3)));
    const m = material(color, { ...(metalness === undefined ? {} : {metalness}), transparent: opacity < 1, opacity });
    const mesh = new THREE.Mesh(geometry, m);
    mesh.position.set(x,y,z); mesh.castShadow = true; mesh.receiveShadow = true;
    return mesh;
  }
  function line(points, color = palette.line, radius = .022) {
    const curve = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p)), false, 'centripetal');
    const mesh = new THREE.Mesh(track(new THREE.TubeGeometry(curve, Math.max(16, points.length*12), radius, 6, false)), material(color));
    mesh.userData.curve = curve;
    return mesh;
  }
  function label(text, { width = 2, color = palette.ink, size = 50, background = null } = {}) {
    const canvas = document.createElement('canvas'); canvas.width = 1024; canvas.height = 180;
    const ctx = canvas.getContext('2d');
    if (background) { ctx.fillStyle = background; ctx.fillRect(0,0,1024,180); }
    ctx.font = `550 ${size*1.2}px -apple-system, BlinkMacSystemFont, Arial, sans-serif`;
    ctx.fillStyle = color; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(text,512,90,990);
    const texture = track(new THREE.CanvasTexture(canvas)); texture.colorSpace = THREE.SRGBColorSpace;
    const mat = track(new THREE.SpriteMaterial({map:texture, transparent:true, depthWrite:false}));
    const sprite = new THREE.Sprite(mat); sprite.scale.set(width,width*180/1024,1); sprite.renderOrder = 10;
    return sprite;
  }
  function documentCard({ title = 'Anfrage', subtitle = 'Beispielvorgang', accent = palette.blue, w = 1.6, d = 2.1 } = {}) {
    const group = new THREE.Group();
    group.add(box({w,h:.07,d,color:palette.white,r:.025}));
    const canvas = document.createElement('canvas'); canvas.width = 640; canvas.height = 840;
    const ctx = canvas.getContext('2d'); ctx.fillStyle = '#fafcff'; ctx.fillRect(0,0,640,840);
    ctx.fillStyle = accent; ctx.fillRect(50,62,64,10); ctx.font='600 42px Arial'; ctx.fillStyle=palette.ink; ctx.fillText(title,50,145,540);
    ctx.font='25px Arial'; ctx.fillStyle='#768398'; ctx.fillText(subtitle,50,192,540);
    [320,450,390,470,270].forEach((length,i) => { ctx.fillStyle=i===0?'#b5c2d4':'#dce3ec'; ctx.fillRect(50,280+i*63,length,13); });
    ctx.strokeStyle='#d5deea'; ctx.strokeRect(50,671,540,90); ctx.fillStyle=accent; ctx.fillRect(70,701,22,22);
    ctx.fillStyle='#768398';ctx.font='23px Arial';ctx.fillText('Vorgang 014',110,721);
    const texture=track(new THREE.CanvasTexture(canvas));texture.colorSpace=THREE.SRGBColorSpace;
    const face=new THREE.Mesh(track(new THREE.PlaneGeometry(w*.96,d*.96)),track(new THREE.MeshStandardMaterial({map:texture,roughness:.65,metalness:0})));
    face.rotation.x=-Math.PI/2;face.position.y=.038;group.add(face);
    return group;
  }
  function plate(text, { w = 2.4, d = 1.8, color = palette.white, accent = palette.blue } = {}) {
    const group = new THREE.Group();
    group.add(box({w,h:.28,d,color}));
    group.add(box({w:w*.62,h:.014,d:.045,y:.148,z:-d*.3,color:accent,r:.004}));
    const name=label(text,{width:w*1.15,color:color===palette.ink?'#ffffff':palette.ink,size:53});
    name.position.set(0,.55,.12);group.add(name);return group;
  }
  function ring({ radius = .5, tube = .035, color = palette.blue } = {}) {
    const mesh = new THREE.Mesh(track(new THREE.TorusGeometry(radius,tube,8,56)),material(color));mesh.rotation.x=-Math.PI/2;return mesh;
  }
  function check({ color = palette.teal, scale = 1 } = {}) {
    const mesh = line([[-.25*scale,0,0],[-.07*scale,0,.18*scale],[.3*scale,0,-.22*scale]],color,.035*scale); return mesh;
  }
  function dispose() { resources.forEach(resource=>resource.dispose?.());resources.clear(); }
  return { box, line, label, document:documentCard, plate, ring, check, material, palette, clamp, ease, phase, mix, track, dispose };
}

// Illustrative, already approved Agentario workflow. The moving dossier is one case.
export function createScene({ THREE, kit }) {
  const { box, line, label, document: paper, material, track, palette: p, phase, mix } = kit;
  const root = new THREE.Group();
  const duration = 11.5;
  const add = (parent, object) => { parent.add(object); return object; };
  const cylinder = (radius, height, color, extra = {}) => {
    const mesh = new THREE.Mesh(track(new THREE.CylinderGeometry(radius, radius, height, 48)), material(color, extra));
    mesh.castShadow = true; mesh.receiveShadow = true; return mesh;
  };
  const sphere = (radius, color) => {
    const mesh = new THREE.Mesh(track(new THREE.SphereGeometry(radius, 32, 24)), material(color));
    mesh.castShadow = true; return mesh;
  };
  const stationName = (text, x, y, z, width = 2) => {
    const sprite = label(text, { width, color: p.ink, size: 50 });
    sprite.position.set(x, y, z); root.add(sprite); return sprite;
  };

  // A single machined guide, resting on four small feet, is the common process.
  const rail = new THREE.Group(); root.add(rail);
  rail.add(box({ w: 9, h: .09, d: .18, y: -.14, z: 1.15, color: '#bfcad9', r: .035, metalness: .72 }));
  rail.add(box({ w: 9, h: .055, d: .035, y: -.085, z: 1.15, color: p.white, r: .012 }));
  for (const x of [-4.25, -1.5, 1.5, 4.25]) rail.add(box({ w: .12, h: .25, d: .38, x, y: -.3, z: 1.15, color: '#bec9d8', r: .025, metalness: .65 }));
  const completedRail = box({ w: 8.65, h: .014, d: .045, x: -4.32, y: -.051, z: 1.15, color: p.blue, r: .004 });
  root.add(completedRail);
  for (const x of [-3.25, 0, 3.25]) {
    root.add(line([[x, -.1, 1.15], [x, -.1, .65], [x, -.15, -.15]], '#b9c6d6', .027));
  }

  // Microphone: grille, yoke, threaded stem and weighted round base.
  const mic = new THREE.Group(); mic.position.set(-3.25, -.09, -.72); root.add(mic);
  const base = add(mic, cylinder(.59, .14, '#d6dee8', { metalness: .72, roughness: .26 })); base.position.y = -.29;
  const baseInset = add(mic, cylinder(.41, .022, p.ink)); baseInset.position.y = -.205;
  const stem = add(mic, cylinder(.065, .72, '#99a9bd', { metalness: .85, roughness: .25 })); stem.position.y = .15;
  mic.add(line([[-.48, 1.35, 0], [-.47, .62, 0], [0, .49, 0], [.47, .62, 0], [.48, 1.35, 0]], '#98a9bd', .055));
  const capsule = new THREE.Group(); capsule.position.y = 1.2; mic.add(capsule);
  add(capsule, cylinder(.34, .82, p.ink));
  const capTop = add(capsule, sphere(.34, p.ink)); capTop.position.y = .41;
  const capBottom = add(capsule, sphere(.34, p.ink)); capBottom.position.y = -.41;
  for (let n = 0; n < 11; n++) {
    const grille = new THREE.Mesh(track(new THREE.TorusGeometry(.343, .012, 6, 48)), material('#78899e', { metalness: .65 }));
    grille.rotation.x = Math.PI / 2; grille.position.y = -.4 + n * .08; capsule.add(grille);
  }
  const light = box({ w: .035, h: .37, d: .018, y: -.08, z: .347, color: p.blue, r: .007 }); capsule.add(light);
  for (const x of [-.5, .5]) { const pin = add(mic, cylinder(.09, .07, '#b8c5d5', { metalness: .85 })); pin.rotation.z = Math.PI / 2; pin.position.set(x, 1.32, 0); }
  const audioBars = new THREE.Group(); audioBars.position.set(-3.25, .29, .34); root.add(audioBars);
  const bars = [-2, -1, 0, 1, 2].map((n) => {
    const bar = box({ w: .055, h: .28, d: .055, x: n * .11, color: p.blue, r: .02 }); audioBars.add(bar); return bar;
  });
  stationName('Gespräch', -3.25, 2.45, -.72, 1.85);

  // A real spatial desktop silhouette, with a single customer record on its display.
  const desktop = new THREE.Group(); desktop.position.set(0, -.12, -.78); root.add(desktop);
  desktop.add(box({ w: 1.1, h: .10, d: .7, y: -.28, z: .12, color: '#c5cfdd', metalness: .72, r: .05 }));
  desktop.add(box({ w: .16, h: .68, d: .16, y: .07, color: '#aab8c9', metalness: .8, r: .035 }));
  const monitor = new THREE.Group(); monitor.position.y = 1.10; monitor.rotation.x = -.075; desktop.add(monitor);
  monitor.add(box({ w: 2.1, h: 1.38, d: .13, color: '#98a9be', metalness: .62, r: .085 }));
  monitor.add(box({ w: 1.98, h: 1.25, d: .025, z: .077, color: p.ink, r: .065 }));
  monitor.add(box({ w: 1.83, h: 1.09, d: .018, z: .095, y: .015, color: '#f1f5fa', r: .035 }));
  monitor.add(box({ w: .34, h: 1.09, d: .007, x: -.74, y: .015, z: .108, color: '#dce4f1', r: .02 }));
  for (let i = 0; i < 4; i++) monitor.add(box({ w: .18, h: .025, d: .01, x: -.74, y: .34 - i * .18, z: .119, color: i === 1 ? p.blue : '#aab8cc', r: .008 }));
  const customer = new THREE.Group(); monitor.add(customer);
  const avatar = cylinder(.12, .018, '#9aaedb'); avatar.rotation.x = Math.PI / 2; avatar.position.set(-.32, .27, .129); customer.add(avatar);
  customer.add(box({ w: .65, h: .045, d: .012, x: .25, y: .32, z: .124, color: p.ink, r: .01 }));
  customer.add(box({ w: .45, h: .03, d: .012, x: .15, y: .19, z: .124, color: '#b3c0d2', r: .008 }));
  const recordRows = [.72, .86, .59].map((w, i) => {
    const row = box({ w, h: .035, d: .012, x: -.33 + w / 2, y: -.08 - i * .15, z: .125, color: i === 2 ? p.blue : '#a6b7cd', r: .008 }); customer.add(row); return row;
  });
  const keyboard = box({ w: 1.35, h: .055, d: .43, y: -.2, z: .62, color: '#e7edf4', r: .035 }); desktop.add(keyboard);
  for (let i = 0; i < 3; i++) desktop.add(box({ w: 1.05, h: .012, d: .022, y: -.164, z: .48 + i * .11, color: '#afbdd0', r: .005 }));
  stationName('Kundeneintrag', 0, 2.45, -.78, 2.35);

  // A bound desk calendar: stand, dark binding rings and a tangible booked day.
  const calendar = new THREE.Group(); calendar.position.set(3.25, -.085, -.67); root.add(calendar);
  calendar.add(line([[-.65, -.32, .1], [-.65, 1.43, -.18], [-.65, -.32, -.85]], '#aebccc', .045));
  calendar.add(line([[.65, -.32, .1], [.65, 1.43, -.18], [.65, -.32, -.85]], '#aebccc', .045));
  const page = new THREE.Group(); page.position.set(0, .65, -.02); page.rotation.x = -.17; calendar.add(page);
  page.add(box({ w: 1.72, h: 1.62, d: .10, color: '#d8e1ee', r: .045 }));
  page.add(box({ w: 1.64, h: 1.52, d: .035, z: .07, color: p.white, r: .022 }));
  page.add(box({ w: 1.64, h: .30, d: .018, y: .60, z: .093, color: p.blue, r: .015 }));
  for (const x of [-.5, .5]) {
    const binding = new THREE.Mesh(track(new THREE.TorusGeometry(.115, .026, 8, 32)), material(p.ink, { metalness: .55 }));
    binding.rotation.y = Math.PI / 2; binding.position.set(x, .83, .02); page.add(binding);
  }
  for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) page.add(box({ w: .23, h: .20, d: .012, x: -.51 + c * .34, y: .25 - r * .31, z: .096, color: '#e5ebf5', r: .018 }));
  const day = box({ w: .27, h: .24, d: .045, x: .17, y: -.06, z: .15, color: p.blue, r: .022 }); page.add(day);
  const tick = kit.check({ color: p.white, scale: .25 }); tick.rotation.x = Math.PI / 2; tick.position.set(.17, -.06, .177); page.add(tick);
  stationName('Termin', 3.25, 2.45, -.67, 1.5);

  const dossier = paper({ title: 'Terminanfrage', subtitle: 'Ein gemeinsamer Vorgang', w: 1.25, d: 1.65 });
  dossier.add(box({ w: .055, h: .085, d: 1.65, x: -.6, y: .013, color: p.blue, r: .012 }));
  root.add(dossier);
  const stamps = [-3.25, 0, 3.25].map((x) => {
    const group = new THREE.Group(); group.position.set(x, -.11, 1.95); root.add(group);
    const disk = cylinder(.15, .035, '#e6edf4'); group.add(disk);
    const mark = kit.check({ color: p.teal, scale: .32 }); mark.position.y = .025; group.add(mark);
    return group;
  });

  function update(time) {
    const t = Math.max(0, Math.min(duration, time));
    const toDesktop = phase(t, 2.5, 4.35), toCalendar = phase(t, 6.1, 7.95);
    const formed = phase(t, .75, 1.95), booking = phase(t, 8.0, 9.2);
    const x = -3.25 + 3.25 * toDesktop + 3.25 * toCalendar;
    dossier.position.set(x, .12 + .13 * Math.sin(Math.PI * toDesktop) + .13 * Math.sin(Math.PI * toCalendar), 1.15);
    dossier.scale.setScalar(mix(.02, 1, formed)); dossier.visible = t > .75;
    dossier.rotation.y = -.035 * Math.sin(Math.PI * toDesktop) + .035 * Math.sin(Math.PI * toCalendar);
    audioBars.scale.setScalar(1 - phase(t, 1.75, 2.35));
    bars.forEach((bar, i) => { bar.scale.y = .35 + .65 * (Math.sin(t * 7 + i * 1.3) * .5 + .5); });
    light.material.color.set(t < 2.35 ? p.blue : '#6c7c92');
    customer.scale.setScalar(mix(.001, 1, phase(t, 4.1, 4.8)));
    recordRows.forEach((row, i) => { row.scale.x = mix(.001, 1, phase(t, 4.65 + i * .18, 5.2 + i * .18)); });
    day.position.z = mix(.5, .15, booking); day.scale.setScalar(mix(.001, 1, booking));
    tick.visible = booking > .95;
    const progress = .12 + .38 * toDesktop + .38 * toCalendar + .12 * phase(t, 9.3, 10.6);
    completedRail.scale.x = Math.max(.001, progress); completedRail.position.x = -4.325 + (8.65 * progress / 2);
    stamps.forEach((stamp, i) => { const done = phase(t, [2.0, 5.4, 9.3][i], [2.4, 5.95, 10.0][i]); stamp.scale.setScalar(done); });
  }
  update(0);
  return { root, duration, camera: { position: [8.4, 8.5, 13.5], target: [0, .55, .05], span: 12.5 }, update };
}
