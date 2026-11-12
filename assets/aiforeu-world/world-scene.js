import * as THREE from '../agentario-scene/vendor/three.module.min.js';
import { RoundedBoxGeometry } from '../agentario-scene/vendor/RoundedBoxGeometry.js';
import { createArchitecture } from './city-architecture.js';
import { createCityLife } from './city-life.js';
import { createCityDetails } from './city-detail.js';

// An authored architectural model. The host owns camera, light, interaction and time.
export function createWorld() {
  const group = new THREE.Group();
  group.name = 'AIFOREU — two connected worlds';
  const colors = {
    plaster: '#e8ecf0', chalk: '#f8fafc', stone: '#bfc7d1', paving: '#dce2e8',
    ink: '#1f2937', orange: '#ee6b35', roof: '#b75b3c', wood: '#b09a88',
    road: '#414955', glass: '#71879d', leaf: '#aa7d53', darkLeaf: '#80624c',
    paleLeaf: '#c6ad7d', soil: '#857563', metal: '#a5a3a3', blue: '#66758e',
  };
  const material = (color, options = {}) => new THREE.MeshStandardMaterial({ color, roughness: .77, metalness: 0, ...options });
  const m = Object.fromEntries(Object.entries(colors).map(([key, value]) => [key, material(value)]));
  m.metal.metalness = .72; m.metal.roughness = .28;
  m.orange = new THREE.MeshPhysicalMaterial({color:colors.orange,roughness:.24,metalness:.12,clearcoat:1,clearcoatRoughness:.15});
  m.glass.roughness = .28; m.glass.metalness = .12;
  // Subtle, deterministic surface grain, authored locally rather than image assets.
  // A single repeating tile is shared; instanced roads and masonry stay batched.
  const size = 128, grain = new Uint8Array(size * size * 4);
  let seed = 1907;
  for (let i = 0; i < size * size; i++) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const value = 168 + (seed >>> 26);
    grain.set([value, value, value, 255], i * 4);
  }
  const surfaceGrain = new THREE.DataTexture(grain, size, size, THREE.RGBAFormat);
  surfaceGrain.wrapS = surfaceGrain.wrapT = THREE.RepeatWrapping;
  surfaceGrain.repeat.set(12, 12); surfaceGrain.generateMipmaps = true;
  surfaceGrain.magFilter = THREE.LinearFilter; surfaceGrain.minFilter = THREE.LinearMipmapLinearFilter;
  surfaceGrain.anisotropy = 4; surfaceGrain.needsUpdate = true;
  m.road.roughness = .96; m.road.bumpMap = surfaceGrain; m.road.bumpScale = .018;
  m.road.roughnessMap = surfaceGrain;
  for (const key of ['plaster', 'stone', 'paving', 'roof']) {
    m[key].bumpMap = surfaceGrain; m[key].bumpScale = key === 'roof' ? .012 : .006;
    m[key].roughness = key === 'paving' ? .93 : .86;
  }
  const geometry = {
    box: new THREE.BoxGeometry(1, 1, 1),
    soft: new RoundedBoxGeometry(1, 1, 1, 2, .045),
    cylinder: new THREE.CylinderGeometry(.5, .5, 1, 24),
    sphere: new THREE.IcosahedronGeometry(.5, 2),
    leaf: new THREE.IcosahedronGeometry(.5, 2),
    plane: new THREE.PlaneGeometry(1, 1),
  };
  const staticMeshes = [];
  function mesh(parent, geo, mat, position, scale = [1, 1, 1], rotation = [0, 0, 0], dynamic = false) {
    const item = new THREE.Mesh(geo, mat);
    item.position.set(...position); item.scale.set(...scale); item.rotation.set(...rotation);
    item.castShadow = true; item.receiveShadow = true;
    parent.add(item);
    if (!dynamic) staticMeshes.push(item);
    return item;
  }
  function box(parent, mat, x, y, z, w, h, d, options = {}) {
    return mesh(parent, options.soft ? geometry.soft : geometry.box, mat, [x, y, z], [w, h, d], options.rotation, options.dynamic);
  }
  function cylinder(parent, mat, x, y, z, diameter, height, options = {}) {
    return mesh(parent, geometry.cylinder, mat, [x, y, z], [diameter, height, diameter], options.rotation, options.dynamic);
  }
  function ball(parent, mat, x, y, z, diameter, scale = [1, 1, 1], dynamic = false) {
    return mesh(parent, geometry.sphere, mat, [x, y, z], scale.map(s => s * diameter), [0, .3, .15], dynamic);
  }
  function subgroup(parent, name, position = [0, 0, 0]) {
    const item = new THREE.Group(); item.name = name; item.position.set(...position); parent.add(item); return item;
  }
  function text(parent, value, x, y, z, width, height, { color = colors.ink, background, size = 64, rotation = [0, 0, 0] } = {}) {
    const canvas = document.createElement('canvas'); canvas.width = 1024; canvas.height = 256;
    const context = canvas.getContext('2d');
    if (!context) return null;
    if (background) { context.fillStyle = background; context.fillRect(0, 0, 1024, 256); }
    context.fillStyle = color; context.textAlign = 'center'; context.textBaseline = 'middle';
    context.font = `600 ${size}px -apple-system, BlinkMacSystemFont, Arial, sans-serif`;
    context.fillText(value, 512, 128, 975);
    const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 8;
    const mat = new THREE.MeshStandardMaterial({ map: texture, transparent: !background, roughness: .8, depthWrite: !!background });
    const item = mesh(parent, geometry.plane, mat, [x, y, z], [width, height, 1], rotation);
    item.castShadow = false;
    return item;
  }
  function tree(x, z, height = 2.1, variation = 0) {
    const t = subgroup(group, 'landscape tree', [x, 0, z]);
    cylinder(t, m.stone, 0, .08, 0, .82, .16);
    cylinder(t, m.soil, 0, .17, 0, .7, .025);
    cylinder(t, m.wood, 0, height * .36, 0, .13, height * .7);
    const foliage = [m.leaf, m.darkLeaf, m.paleLeaf][variation % 3];
    ball(t, foliage, -.16, height * .77, -.04, height * .61, [1, 1.28, .93]);
    ball(t, foliage, .22, height * .65, .13, height * .45, [.9, 1.2, 1]);
    ball(t, foliage, .09, height * .98, -.09, height * .41, [.95, 1.05, .9]);
  }
  function bench(x, z, rotation = 0) {
    const b = subgroup(group, 'timber bench', [x, 0, z]); b.rotation.y = rotation;
    for (const sx of [-.45, .45]) box(b, m.ink, sx, .21, 0, .07, .4, .43);
    for (let n = 0; n < 3; n++) box(b, m.wood, 0, .43, -.16 + n * .15, 1.12, .07, .11, { soft: true });
    box(b, m.wood, 0, .69, -.22, 1.12, .13, .06, { soft: true });
  }
  function person(parent, x, z, { shirt = m.ink, height = 1, rotation = 0, dynamic = false } = {}) {
    const p = subgroup(parent, 'model person', [x, 0, z]); p.rotation.y = rotation;
    cylinder(p, shirt, 0, height * .57, 0, height * .26, height * .39, { dynamic });
    ball(p, m.wood, 0, height * .89, 0, height * .23, [1, 1, 1], dynamic);
    for (const side of [-1, 1]) {
      box(p, m.ink, side * height * .075, height * .22, 0, height * .085, height * .4, height * .11, { soft: true, dynamic });
      cylinder(p, shirt, side * height * .18, height * .57, .03, height * .075, height * .34, { rotation: [0, 0, side * .18], dynamic });
    }
    return p;
  }

  // One continuous island, with a pale pedestrian route connecting both disciplines.
  const base = new THREE.Mesh(new RoundedBoxGeometry(27, .65, 19, 3, .22), m.stone);
  base.position.y = -.325; base.receiveShadow = true; base.castShadow = true; group.add(base);
  box(group, m.paving, 0, .015, 0, 26.65, .04, 18.65, { soft: true });
  box(group, m.chalk, 0, .045, 1.05, 22.6, .035, 1.25);
  for (let n = 0; n < 15; n++) {
    box(group, m.stone, -2 + n * .89, .068, 1.03, .018, .008, 1.19);
  }
  const traffic = subgroup(group, 'VerkehrsAI district');
  const office = subgroup(group, 'Autonomous Workforce atelier');

  // Traffic district: a real little street network, low city blocks and public space.
  box(traffic, m.road, -7.2, .064, .25, 8.9, .055, 1.8);
  box(traffic, m.road, -7.2, .066, -.05, 1.8, .058, 10.1);
  for (const x of [-11.15, -3.25]) box(traffic, m.road, x, .06, 0, 1.13, .05, 10.6);
  for (const z of [-4.95, 4.95]) box(traffic, m.road, -7.2, .061, z, 8.9, .05, 1.12);
  for (let n = 0; n < 5; n++) {
    for (const direction of [-1, 1]) {
      box(traffic, m.chalk, -7.2, .103, direction * (1.7 + n * .59), .055, .012, .26);
      if (n < 4) box(traffic, m.chalk, -7.2 + direction * (1.7 + n * .55), .103, .25, .25, .012, .055);
    }
  }
  for (const side of [-1, 1]) {
    for (let stripe = 0; stripe < 6; stripe++) {
      box(traffic, m.chalk, -7.87 + stripe * .27, .11, .25 + side * 1.32, .15, .014, .54);
      box(traffic, m.chalk, -7.2 + side * 1.32, .11, -.42 + stripe * .27, .54, .014, .15);
    }
    box(traffic, m.chalk, -7.64, .104, .25 + side * 1.79, .7, .012, .06);
    box(traffic, m.chalk, -7.2 + side * 1.8, .104, .69, .06, .012, .7);
  }
  const signals = { nsRed: material('#b84937'), nsGreen: material('#344a3d'), ewRed: material('#503b35'), ewGreen: material('#6e9d74') };
  for (const [x, z, rotate, axis] of [[-8.35, 1.38, 0, 'ns'], [-6.05, -.88, Math.PI, 'ns'], [-8.35, -.88, -Math.PI / 2, 'ew'], [-6.05, 1.38, Math.PI / 2, 'ew']]) {
    const signal = subgroup(traffic, 'traffic signal', [x, 0, z]); signal.rotation.y = rotate;
    cylinder(signal, m.ink, 0, .72, 0, .07, 1.44);
    box(signal, m.ink, 0, 1.48, 0, .22, .57, .18, { soft: true });
    for (let n = 0; n < 3; n++) cylinder(signal, n === 0 ? signals[axis+'Red'] : n === 2 ? signals[axis+'Green'] : m.wood, 0, 1.65 - n * .16, .103, .105, .035, { rotation: [Math.PI / 2, 0, 0] });
  }
  const roofShape = new THREE.Shape(); roofShape.moveTo(-.5, 0); roofShape.lineTo(.5, 0); roofShape.lineTo(0, .5); roofShape.closePath();
  const roofGeometry = new THREE.ExtrudeGeometry(roofShape, { depth: 1, bevelEnabled: false }); roofGeometry.translate(0, 0, -.5);
  function building(x, z, w, h, d, roofMat, title) {
    const b = subgroup(traffic, title, [x, 0, z]);
    box(b, m.stone, 0, .13, 0, w + .23, .22, d + .23, { soft: true });
    box(b, m.plaster, 0, h / 2 + .22, 0, w, h, d, { soft: true });
    mesh(b, roofGeometry, roofMat, [0, h + .19, 0], [w + .3, 1.1, d + .25]);
    // Physical eaves, ridge and standing seams keep the roof readable in close-up.
    box(b, roofMat, 0, h + .755, 0, .08, .07, d + .31);
    for (const side of [-1, 1]) {
      box(b, m.metal, side * (w / 2 + .13), h + .19, 0, .075, .08, d + .27);
      cylinder(b, m.metal, side * (w / 2 + .07), h / 2 + .23, d / 2 + .08, .045, h);
      for (let n = 0; n < 8; n++) {
        const z = -d / 2 + n * d / 7;
        box(b, roofMat, side * (w + .3) / 4, h + .48, z,
          Math.hypot((w + .3) / 2, .55), .025, .028,
          { rotation: [0, 0, -side * Math.atan2(.55, (w + .3) / 2)] });
      }
    }
    box(b, m.ink, .63, h + .45, -.35, .25, .7, .3);
    for (const side of [-1, 1]) {
      for (let row = 0; row < 2; row++) for (let col = 0; col < 3; col++) {
        const wx = (col - 1) * w * .27, wy = .95 + row * .87;
        box(b, m.chalk, wx, wy, side * (d / 2 + .014), .46, .66, .045);
        box(b, m.glass, wx, wy, side * (d / 2 + .04), .34, .53, .022);
        box(b, m.chalk, wx, wy, side * (d / 2 + .057), .025, .53, .016);
        box(b, m.chalk, wx, wy + .04, side * (d / 2 + .06), .35, .025, .016);
        box(b, m.stone, wx, wy - .35, side * (d / 2 + .09), .55, .055, .16);
      }
      for (const z of [-.64, .64]) for (const y of [.95, 1.82]) {
        box(b, m.chalk, side * (w / 2 + .02), y, z, .045, .66, .46);
        box(b, m.glass, side * (w / 2 + .05), y, z, .022, .53, .34);
        box(b, m.chalk, side * (w / 2 + .065), y, z, .016, .53, .025);
      }
    }
    box(b, m.ink, 0, .55, d / 2 + .04, .43, .68, .06);
    box(b, roofMat, 0, 1.01, d / 2 + .28, 1.04, .07, .59);
    text(b, title, 0, h + .02, d / 2 + .06, w * .82, .28, { size: 58 });
  }
  building(-9.35, -2.9, 2.13, 2.35, 2.45, m.roof, 'STADT');
  building(-4.95, -2.95, 2.05, 2.65, 2.4, m.ink, 'PLANUNG');
  // Visible front corners remain low so the crossing can be read from the camera.
  const kiosk = subgroup(traffic, 'street kiosk', [-9.6, 0, 3.18]);
  box(kiosk, m.plaster, 0, .64, 0, 1.3, 1.2, 1.1, { soft: true });
  box(kiosk, m.roof, 0, 1.29, 0, 1.48, .13, 1.35, { soft: true });
  box(kiosk, m.glass, 0, .75, .56, .92, .55, .035);
  box(kiosk, m.wood, 0, .47, .75, 1.17, .07, .45);
  text(kiosk, 'CAFÉ', 0, 1.09, .591, .8, .22, { size: 66 });
  for (const [x, z, h, variation] of [[-10.3,-1.05,1.65,0],[-4.2,-1.1,1.7,2],[-9.25,1.78,1.8,0],[-4.9,3.05,2.15,1],[-5.5,4.02,1.5,2]]) tree(x,z,h,variation);
  bench(-5.45, 2.05, -.3); bench(-8.7, 3.65, Math.PI / 2);
  // A bicycle rack, a mailbox and pavement details complete the street.
  for (let n = 0; n < 3; n++) {
    box(traffic, m.metal, -8.75 + n * .31, .29, 2.47, .035, .52, .05);
    box(traffic, m.metal, -8.75 + n * .31, .29, 2.8, .035, .52, .05);
    box(traffic, m.metal, -8.75 + n * .31, .55, 2.64, .035, .035, .34);
  }
  box(traffic, m.blue, -10.15, .43, 1.7, .31, .55, .28, { soft: true });
  box(traffic, m.ink, -10.15, .49, 1.847, .2, .035, .015);
  for (const [x,z] of [[-9.1,4.1],[-5.1,1.55]]) cylinder(traffic,m.ink,x,.28,z,.25,.5);

  function vehicle(color, long = false) {
    const car = subgroup(traffic, long ? 'electric shuttle' : 'city car');
    const carMat = material(color, { roughness: .42, metalness: .08 });
    const length = long ? 1.62 : 1.13;
    box(car, carMat, 0, .28, 0, .62, .27, length, { soft: true, dynamic: true });
    box(car, carMat, 0, .5, -.04, .55, .29, length * .61, { soft: true, dynamic: true });
    box(car, m.glass, 0, .52, length * .285, .43, .18, .018, { rotation: [-.18,0,0], dynamic: true });
    box(car, m.glass, 0, .52, -length * .325, .43, .17, .018, { dynamic: true });
    for (const sx of [-1, 1]) {
      box(car, m.glass, sx * .284, .52, -.03, .016, .17, length * .4, { dynamic: true });
      box(car, m.chalk, sx * .2, .29, length / 2 + .008, .11, .07, .018, { dynamic: true });
      for (const sz of [-1, 1]) cylinder(car, m.ink, sx * .31, .15, sz * length * .3, .25, .075, { rotation: [0,0,Math.PI/2], dynamic: true });
    }
    return car;
  }
  function roadLoop(points) {
    return new THREE.CatmullRomCurve3(points.map(([x,z])=>new THREE.Vector3(x,.095,z)),true,'centripetal',.3);
  }
  const perimeter = roadLoop([[-10.65,4.92],[-11.15,4.42],[-11.15,0],[-11.15,-4.43],[-10.64,-4.95],[-7.2,-4.95],[-3.77,-4.95],[-3.25,-4.43],[-3.25,0],[-3.25,4.42],[-3.77,4.92],[-7.2,4.92]]);
  const westLoop = roadLoop([[-10.64,-4.95],[-7.75,-4.95],[-7.2,-4.4],[-7.2,-2.1],[-7.2,-.3],[-7.75,.25],[-10.65,.25],[-11.15,-.25],[-11.15,-4.43]]);
  const eastLoop = roadLoop([[-6.65,.25],[-3.8,.25],[-3.25,.8],[-3.25,4.4],[-3.8,4.95],[-6.65,4.95],[-7.2,4.4],[-7.2,.8]]);
  const cars = [
    { object: vehicle(colors.roof), curve: perimeter, speed: .027, offset: .11 },
    { object: vehicle(colors.chalk), curve: westLoop, stop: .367, release: 4 },
    { object: vehicle(colors.blue,true), curve: eastLoop, stop: .882, release: 5.3 },
  ];

  // Central AIFOREU workshop: a covered, open place with a sculptural actual mark.
  const pavilion = subgroup(group, 'shared AIFOREU workshop', [0, 0, -2.45]);
  box(pavilion, m.stone, 0, .15, 0, 3.9, .28, 3.15, { soft: true });
  box(pavilion, m.plaster, 0, 1.32, -1.32, 3.45, 2.34, .2, { soft: true });
  box(pavilion, m.wood, 0, 2.58, 0, 4.05, .23, 3.25, { soft: true });
  box(pavilion, m.plaster, 0, 2.73, 0, 4.15, .12, 3.34, { soft: true });
  for (const x of [-1.61,1.61]) for (const z of [-1.22,1.21]) cylinder(pavilion,m.plaster,x,1.4,z,.17,2.55);
  for(let n=0;n<7;n++) box(pavilion,m.wood,-1.53+n*.51,2.41,0,.055,.13,2.8);
  box(pavilion,m.wood,0,.92,0,2.1,.12,.9,{soft:true});
  for(const x of [-.87,.87]) box(pavilion,m.ink,x,.51,0,.07,.77,.65);
  box(pavilion,m.chalk,-.35,1.005,.06,.7,.035,.5);
  box(pavilion,m.orange,.5,1.08,-.03,.28,.14,.3,{soft:true});
  text(pavilion,'AIFOREU',0,2.86,1.685,2.9,.6,{size:95});
  text(pavilion,'GEMEINSAM WEITER',0,1.82,-1.205,2.5,.53,{size:53});
  cylinder(group,m.stone,0,.12,2.28,3.4,.2);
  cylinder(group,m.chalk,0,.235,2.28,3.1,.04);
  const logoShape = new THREE.Shape();
  const logoPoints = [[0,1.49],[1.296,0],[.864,.24],[.576,0],[0,.384],[-.576,0],[-.864,.24],[-1.296,0]];
  logoPoints.forEach(([x,y],i)=>i?logoShape.lineTo(x,y):logoShape.moveTo(x,y));logoShape.closePath();
  const logoHole = new THREE.Path();logoHole.absellipse(0,.72,.288,.288,0,Math.PI*2,true);logoShape.holes.push(logoHole);
  const logoGeometry = new THREE.ExtrudeGeometry(logoShape,{depth:.19,bevelEnabled:true,bevelThickness:.025,bevelSize:.025,bevelSegments:2,curveSegments:32});
  const logo = new THREE.Mesh(logoGeometry,m.ink);logo.position.set(0,.47,2.3);logo.castShadow=true;logo.receiveShadow=true;group.add(logo);
  box(group,m.wood,0,.33,2.36,1.43,.16,.42,{soft:true});
  for(const side of [-1,1]) {
    for(let n=0;n<5;n++) box(group,m.wood,side*(1.8+n*.29),.084,1.08,.14,.018,.07,{soft:true});
    tree(side*1.7,4.35,1.65,side===1?2:0);
  }
  bench(.05,4.38); person(group,-1.19,.64,{shirt:m.blue,height:.98,rotation:-.5});
  person(pavilion,.95,.3,{shirt:m.paleLeaf,height:.9,rotation:-1.1});
  tree(-1.5,-4.7,2.25,1); tree(1.55,-4.75,1.95,2);

  // Workforce atelier: open cutaway construction, three instruments, one physical case.
  box(office,m.wood,7.05,.15,-.55,8.45,.28,7.45,{soft:true});
  box(office,m.plaster,7.05,.31,-.55,8.22,.04,7.2);
  for(let n=0;n<16;n++) box(office,m.stone,3.15+n*.52,.336,-.55,.012,.008,7.1);
  box(office,m.plaster,7.05,1.73,-3.95,8.2,2.82,.16,{soft:true});
  box(office,m.wood,7.05,3.18,-3.35,8.55,.2,1.52,{soft:true});
  for(const x of [3.15,7.05,10.95]) box(office,m.wood,x,1.78,-3.32,.13,2.93,.15);
  for(let n=0;n<12;n++) box(office,m.wood,3.2+n*.7,3.05,-3.35,.075,.12,1.35);
  text(office,'AUTONOMOUS WORKFORCE',7.08,3.49,-3.24,7.1,.72,{size:71});
  box(office,m.ink,7.03,2.06,-3.84,4.22,1.25,.07,{soft:true});
  text(office,'EIN TEAM. EIN GEMEINSAMER ABLAUF.',7.03,2.39,-3.792,3.8,.4,{size:49,color:colors.chalk});
  // The wall drawing is a simple physical process map, not a pretend product UI.
  for(const [i,x] of [5.72,7.03,8.34].entries()) {
    box(office,i===1?m.wood:m.stone,x,1.99,-3.786,.7,.34,.018,{soft:true});
    if(i<2) box(office,m.chalk,x+.65,1.99,-3.775,.6,.022,.02);
  }
  box(office,m.wood,7.05,1.12,-.25,7.6,.16,2.05,{soft:true});
  for(const x of [3.6,6.1,8.2,10.5]) {
    box(office,m.ink,x,.7,-.81,.1,.8,.12);
    box(office,m.ink,x,.7,.33,.1,.8,.12);
  }
  box(office,m.metal,7.05,1.225,.65,6.4,.055,.17,{soft:true});
  box(office,m.ink,7.05,1.258,.65,6.35,.012,.035);
  for(const [i,x] of [4.55,7.0,9.48].entries()) {
    text(office,['VOICE','DESKTOP','WORKFLOWS'][i],x,1.02,.786,1.9,.31,{size:70});
    box(office,m.stone,x,1.216,-.31,1.7,.035,1.13,{soft:true});
  }
  // Voice: brushed-metal microphone, desk phone, physical audio bars.
  const voice = subgroup(office,'Voice station',[4.55,1.24,-.38]);
  cylinder(voice,m.ink,0,.07,0,.55,.1);
  cylinder(voice,m.metal,0,.38,0,.055,.6);
  box(voice,m.metal,0,.53,0,.56,.055,.065,{soft:true});
  for(const side of [-1,1]) box(voice,m.metal,side*.25,.75,0,.045,.45,.05,{soft:true});
  cylinder(voice,m.ink,0,.94,0,.34,.52);
  ball(voice,m.ink,0,1.2,0,.34);ball(voice,m.ink,0,.68,0,.34);
  for(let n=0;n<7;n++) box(voice,m.metal,0,.73+n*.066,.168,.25,.014,.018);
  box(voice,m.leaf,0,.95,.19,.025,.17,.017,{soft:true});
  box(voice,m.ink,-.58,.07,.14,.34,.12,.55,{soft:true,rotation:[0,-.2,0]});
  box(voice,m.glass,-.58,.14,.1,.23,.015,.28,{rotation:[0,-.2,0]});
  const handset=subgroup(voice,'reception handset',[-.58,.2,.14]);
  box(handset,m.ink,0,.035,0,.12,.1,.48,{soft:true,dynamic:true});
  for(const z of [-.2,.2]) box(handset,m.ink,0,-.02,z,.22,.13,.14,{soft:true,dynamic:true});
  const audioBars=[];
  for(let n=0;n<5;n++) audioBars.push(box(office,m.blue,4.32+n*.115,1.4,.24,.043,.27,.04,{soft:true,dynamic:true}));

  // Desktop: monitor, keyboard and a record that is assembled as the case arrives.
  const desktop = subgroup(office,'Desktop station',[7,1.24,-.46]);
  box(desktop,m.metal,0,.04,.04,.68,.07,.42,{soft:true});
  box(desktop,m.metal,0,.39,0,.09,.67,.08,{soft:true});
  box(desktop,m.ink,0,.93,-.04,1.5,.95,.1,{soft:true});
  box(desktop,m.chalk,0,.94,.016,1.35,.8,.025,{soft:true});
  box(desktop,m.blue,-.52,.94,.035,.22,.8,.012);
  box(desktop,m.ink,-.02,1.17,.042,.5,.035,.013);
  const recordLines=[];
  for(let n=0;n<3;n++) recordLines.push(box(desktop,n===2?m.blue:m.stone,.06,1.03-n*.13,.045,.74-n*.1,.039,.013,{dynamic:true}));
  box(desktop,m.metal,0,.04,.42,.87,.045,.29,{soft:true});
  for(let n=0;n<3;n++) box(desktop,m.ink,0,.067,.33+n*.07,.7,.008,.018);
  cylinder(desktop,m.blue,.62,.16,.3,.15,.28);

  // Workflows: bound calendar, three output trays and a little approval stamp.
  const workflow = subgroup(office,'Workflow station',[9.48,1.24,-.42]);
  box(workflow,m.wood,0,.12,-.1,1.1,.09,.61,{soft:true});
  box(workflow,m.stone,0,.55,-.15,1.05,.92,.08,{soft:true,rotation:[-.14,0,0]});
  box(workflow,m.chalk,0,.55,-.095,.97,.83,.025,{rotation:[-.14,0,0]});
  box(workflow,m.ink,0,.9,-.033,.97,.17,.026);
  for(const x of [-.3,.3]) box(workflow,m.ink,x,1.01,-.09,.055,.14,.13,{soft:true});
  for(let row=0;row<2;row++) for(let col=0;col<4;col++) box(workflow,m.stone,-.34+col*.225,.69-row*.22,-.035,.14,.14,.017);
  const booked=box(workflow,m.leaf,.11,.47,-.01,.14,.14,.022,{dynamic:true});
  for(let n=0;n<3;n++) {
    box(workflow,m.metal,.73,.07+n*.11,.13,.37,.045,.56,{soft:true});
    box(workflow,m.chalk,.73,.103+n*.11,.1,.29,.016,.43);
  }
  const stamp=subgroup(office,'approval stamp',[9.48,1.6,.65]);
  box(stamp,m.ink,0,0,0,.4,.12,.31,{soft:true,dynamic:true});
  cylinder(stamp,m.wood,0,.19,0,.13,.28,{dynamic:true});
  ball(stamp,m.wood,0,.36,0,.26,[1.35,.7,1],true);

  // Covered in/out trays hide the hand-off between successive cases naturally.
  for(const [x,incoming] of [[3.65,true],[10.58,false]]) {
    box(office,m.wood,x,1.64,.65,1.02,.09,1.02,{soft:true});
    box(office,m.wood,x,1.43,1.12,1.02,.4,.08,{soft:true});
    box(office,m.wood,x,1.43,.18,1.02,.4,.08,{soft:true});
    box(office,m.wood,x+(incoming?-.47:.47),1.43,.65,.08,.4,.94);
    text(office,incoming?'EINGANG':'ERLEDIGT',x,1.45,1.168,.84,.24,{size:64});
  }

  const dossier=subgroup(office,'one shared case',[4.55,1.29,.65]);
  box(dossier,m.orange,0,0,0,.69,.055,.79,{soft:true,dynamic:true});
  box(dossier,m.chalk,.025,.032,0,.59,.013,.7,{dynamic:true});
  for(let n=0;n<4;n++) box(dossier,n===0?m.ink:m.stone,-.04,.045,-.24+n*.135,n===0?.39:.47,.009,.024,{dynamic:true});
  const seal=box(dossier,m.orange,.19,.051,.24,.17,.014,.14,{soft:true,dynamic:true});
  // Shelves, books and a small table give the atelier depth and human scale.
  for(const x of [3.78,10.3]) {
    for(let n=0;n<3;n++) box(office,m.wood,x,.78+n*.57,-3.28,1.08,.07,.5);
    for(const dx of [-.49,.49]) box(office,m.ink,x+dx,1.23,-3.3,.045,2.16,.43);
    for(let n=0;n<7;n++) box(office,[m.stone,m.ink,m.roof,m.blue][n%4],x-.4+n*.12,1.06+(n%2)*.57,-3.27,.085,.43+(n%3)*.04,.34);
  }
  cylinder(office,m.wood,7.3,.89,2.1,1.42,.12);
  cylinder(office,m.ink,7.3,.6,2.1,.12,.57);
  cylinder(office,m.stone,7.3,.34,2.1,.65,.08);
  box(office,m.chalk,7.19,.965,2.12,.53,.018,.4,{rotation:[0,-.23,0]});
  cylinder(office,m.blue,7.65,1.06,2.2,.14,.2);
  for(const [x,z] of [[6.3,2.16],[8.29,2.16]]) {
    cylinder(office,m.blue,x,.64,z,.58,.12);
    for(const sx of [-1,1]) box(office,m.ink,x+sx*.18,.47,z,.04,.35,.04);
  }
  person(office,5.48,-1.43,{shirt:m.blue,height:1.05,rotation:Math.PI});
  person(office,8.07,-1.49,{shirt:m.paleLeaf,height:1.04,rotation:Math.PI});
  for(const [x,z,h,v] of [[3.05,3.6,1.72,0],[10.65,3.55,2.04,1],[11.47,-3.3,2.12,2],[2.65,-3.25,1.7,1]]) tree(x,z,h,v);
  // The model's small street furniture doubles as a spatial choice, not a UI card.
  const signMaterials={traffic:material(colors.chalk),workforce:material(colors.chalk)};
  function districtSign(path,label,x,z,w) {
    for(const dx of [-w*.37,w*.37]) box(group,m.wood,x+dx,.55,z,.065,1,.065);
    box(group,signMaterials[path],x,.99,z,w,.5,.1,{soft:true});
    text(group,label,x,1.01,z+.061,w*.94,.4,{size:61});
  }
  districtSign('traffic','VERKEHRS AI',-7.2,5.75,3.35);
  districtSign('workforce','AUTONOMOUS WORKFORCE',7.1,4.61,5.7);
  // Small boundary bollards and loose stones tie the districts to a single landscape.
  for(const x of [-2.2,2.2]) for(const z of [-1.0,.05,3.4]) cylinder(group,m.stone,x,.23,z,.18,.38);
  for(const [x,z] of [[-.8,-5.55],[.3,-5.3],[11.65,2.8],[-11.55,5.6]]) ball(group,m.stone,x,.12,z,.35,[1.5,.55,1]);

  const cityAPI = { THREE, group, traffic, office, m, colors, geometry, mesh, box, cylinder, ball, text, subgroup };
  createArchitecture(cityAPI);
  const cityLife = createCityLife(cityAPI);
  const cityDetails = createCityDetails(cityAPI);

  // Static detail is instanced by shared geometry/material. Animated parts keep ownership.
  group.updateMatrixWorld(true);
  const batches=new Map();
  const revealBatches=[];
  for(const item of staticMeshes) {
    const id=`${item.geometry.uuid}:${item.material.uuid}`;
    if(!batches.has(id))batches.set(id,[]);
    batches.get(id).push(item);
  }
  for(const items of batches.values()) {
    if(items.length<2)continue;
    const batch=new THREE.InstancedMesh(items[0].geometry,items[0].material,items.length);
    batch.name='architectural details';batch.castShadow=items.some(item=>item.castShadow);batch.receiveShadow=true;
    const poses=items.map(item=>({matrix:item.matrixWorld.clone(),lift:item.matrixWorld.elements[13]>.48?5.4:0,delay:Math.min(.28,Math.hypot(item.matrixWorld.elements[12],item.matrixWorld.elements[14])*.018)}));
    items.forEach((item,i)=>{batch.setMatrixAt(i,item.matrixWorld);item.removeFromParent();});
    if(poses.some(pose=>pose.lift))revealBatches.push({batch,poses});
    batch.instanceMatrix.needsUpdate=true;batch.computeBoundingBox();batch.computeBoundingSphere();group.add(batch);
  }
  // Explicit invisible hit volumes are independent of instancing and tiny model details.
  const hitMaterial=new THREE.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false,colorWrite:false});
  const hitTargets=[['traffic',-7.25,2.3,-1.4,8.8,5,14],['workforce',7.1,2.3,-1.4,8.8,5,14]].map(([path,x,y,z,w,h,d])=>{
    const target=new THREE.Mesh(geometry.box,hitMaterial);target.name=`${path} selection volume`;target.position.set(x,y,z);target.scale.set(w,h,d);target.userData.path=path;group.add(target);return target;
  });
  const smooth=value=>{const n=Math.max(0,Math.min(1,value));return n*n*(3-2*n);};
  const phase=(time,a,b)=>smooth((time-a)/(b-a));
  const tangent=new THREE.Vector3();
  let lastEntrance = 1;
  const revealMatrix = new THREE.Matrix4();
  function update(timeSeconds=0,{selected='overview',reducedMotion=false,entrance=1}={}) {
    const build=reducedMotion?1:Math.max(0,Math.min(1,entrance));
    if(build!==lastEntrance){
      for(const {batch,poses} of revealBatches){
        poses.forEach((pose,i)=>{
          const amount=Math.max(0,Math.min(1,(build-pose.delay)/(1-pose.delay)));
          revealMatrix.copy(pose.matrix);revealMatrix.elements[13]-=pose.lift*Math.pow(1-amount,3);
          batch.setMatrixAt(i,revealMatrix);
        });
        batch.instanceMatrix.needsUpdate=true;
      }
      lastEntrance=build;
    }
    const time=Number.isFinite(timeSeconds)?Math.max(0,timeSeconds):0;
    const t=reducedMotion?10.9:time%14;
    cityLife.update(time, {reducedMotion, selected});
    cityDetails.update(time, {reducedMotion, selected});
    for(const car of cars) {
      const trafficTime=reducedMotion?10:time;
      const progress=car.stop===undefined?(trafficTime*car.speed+car.offset)%1:
        (car.stop+phase(trafficTime%24,car.release,23.98))%1;
      car.object.position.copy(car.curve.getPointAt(progress));
      tangent.copy(car.curve.getTangentAt(progress));car.object.rotation.y=Math.atan2(tangent.x,tangent.z);
    }
    const arriving=phase(t,0,1.4),first=phase(t,2.8,4.4),second=phase(t,6.7,8.4),outgoing=phase(t,11,13.7);
    dossier.position.set(3.65+.9*arriving+2.45*first+2.48*second+1.1*outgoing,1.29+.075*Math.sin(Math.PI*first)+.075*Math.sin(Math.PI*second),.65);
    dossier.rotation.y=.035*Math.sin(Math.PI*first)-.035*Math.sin(Math.PI*second);
    const stamping=phase(t,9,9.45)*(1-phase(t,9.6,10.1));
    const settle=phase(t,9.45,9.52)*(1-phase(t,9.52,9.62));
    stamp.position.y=1.6-.2*stamping+.018*settle;
    seal.visible=t>9.45&&t<13.8;
    const booking=t>8.5?1:.25;booked.scale.set(.14*booking,.14*booking,.022);
    const pickup=phase(t,.8,1.45)*(1-phase(t,2,2.65));
    handset.position.y=.2+.19*pickup;handset.rotation.x=-.3*pickup;
    audioBars.forEach((bar,i)=>{const amount=reducedMotion?.42:t<2.8?.4+.6*(Math.sin(time*6.5+i*1.2)*.5+.5):.15;bar.scale.y=.27*amount;bar.position.y=1.27+.135*amount;});
    recordLines.forEach((line,i)=>{line.scale.x=(.74-i*.1)*(.3+.7*phase(t,4.55+i*.25,5.2+i*.25));});
    const nsGreen=(reducedMotion?10:time%24)>=4&&(reducedMotion?10:time%24)<14;
    signals.nsRed.color.set(nsGreen?'#503b35':'#b84937');signals.nsGreen.color.set(nsGreen?'#6e9d74':'#344a3d');
    signals.ewRed.color.set(nsGreen?'#b84937':'#503b35');signals.ewGreen.color.set(nsGreen?'#344a3d':'#6e9d74');
    signMaterials.traffic.color.set(selected==='traffic'?colors.orange:colors.chalk);
    signMaterials.workforce.color.set(selected==='workforce'?colors.orange:colors.chalk);
  }
  update(0);
  // Fit the architectural silhouette to the actual direction of view. This avoids
  // making the frontal city tiny just to reserve space for a later drag rotation.
  // Ground, tram, rear skyline and lower courtyard form four conservative volumes.
  const framePoints = [];
  for (const [left, right, bottom, top, back, front] of [
    [-13.52, 13.52, -.67, .14, -9.52, 9.52],
    [-12.85, 12.85, .14, 1.65, -9.2, 8.25],
    [-11.65, 11.35, .14, 4.95, -8.15, -5.7],
    [-10.7, 11.85, .14, 3.9, -4.7, 4.65],
  ]) for (const x of [left, right]) for (const y of [bottom, top]) for (const z of [back, front]) framePoints.push(new THREE.Vector3(x, y, z));
  const framePoint = new THREE.Vector3();
  function overviewSpan(camera, aspect) {
    let horizontal = 0, vertical = 0;
    for (const point of framePoints) {
      framePoint.copy(point).applyMatrix4(camera.matrixWorldInverse);
      horizontal = Math.max(horizontal, Math.abs(framePoint.x));
      vertical = Math.max(vertical, Math.abs(framePoint.y));
    }
    return Math.max(horizontal * 2, vertical * 2 * aspect) / .94;
  }
  return {
    group,update,hitTargets,overviewSpan,
    views:{
      overview:{position:[5,20,35],target:[0,.7,-.45],span:32},
      traffic:{position:[1,14,16],target:[-7.1,1,-1],span:18.5},
      workforce:{position:[16,13.5,15],target:[6.8,1,-1.25],span:18.5},
    },
    hotspots:{traffic:new THREE.Vector3(-7.2,2.1,4.4),workforce:new THREE.Vector3(7.1,2.1,4.4)},
  };
}
