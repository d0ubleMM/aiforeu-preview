import * as THREE from '../agentario-scene/vendor/three.module.min.js';
import { RoundedBoxGeometry } from '../agentario-scene/vendor/RoundedBoxGeometry.js';
import { createArchitecture } from '../aiforeu-world/city-architecture.js';
import { createInteriorDetails } from './interior-details.js';
import { createCityMaterials } from './city-materials.js';
import { createWorkforceMaterials } from './workforce-materials.js';
import { createBroadcastMicrophone, detailFurniture } from './interior-props.js';

/** Two connected districts for the carrier interior. No renderer, floor or shell.
 * Coordinates returned by districts/entryClearance are local to the carrier,
 * with this root's uniform .8 scale already included. Bounds include vehicle
 * travel, not just their initial pose. Add group under the carrier
 * without an additional fit-to-box transform. The host owns lighting and camera.
 * update(seconds, {selected:'overview'|'traffic'|'workforce', reducedMotion:false})
 * advances real street traffic and one case from Voice through Desktop to Workflow.
 * Reduced motion samples a fixed, legible state. dispose() is idempotent.
 */
export function createInteriorDistricts() {
  const group = new THREE.Group();
  group.name = 'AIFOREU carrier — connected interior districts';
  let disposed = false;
  const colors = {
    plaster: '#d2cec5', chalk: '#f1efe8', stone: '#848982', paving: '#747a74',
    ink: '#111820', orange: '#e74b0c', roof: '#a43820', wood: '#885025',
    road: '#25292b', glass: '#143843', leaf: '#237638', darkLeaf: '#12502b',
    paleLeaf: '#438a31', soil: '#34251b', metal: '#899298', blue: '#164eab',
  };
  const material = (color, options = {}) => new THREE.MeshStandardMaterial({ color, roughness: .77, metalness: 0, ...options });
  const m = Object.fromEntries(Object.entries(colors).map(([key, value]) => [key, material(value)]));
  m.metal.metalness = .72; m.metal.roughness = .28;
  m.orange = new THREE.MeshPhysicalMaterial({color:colors.orange,roughness:.24,metalness:.12,clearcoat:1,clearcoatRoughness:.15});
  m.glass.roughness = .28; m.glass.metalness = .12;
  m.glass.color.set('#475b63');m.glass.roughness=.16;m.glass.metalness=.32;m.glass.envMapIntensity=2.5;
  const workforceMaterials=createWorkforceMaterials(m), w=workforceMaterials.m;
  const cityMaterials=createCityMaterials();
  const surface=cityMaterials.surface;
  surface(m.road,'asphalt',{metres:1.45,normal:.38,tint:'#777d7c'});
  surface(m.plaster,'plaster',{metres:.36,normal:.18,tint:'#b7bbb6',colorWeight:.34});
  m.cityStone=surface(material('#fff'),'concrete',{metres:.7,normal:.22,tint:'#9d9f96',colorWeight:.32});
  surface(m.paving,'concrete',{metres:.8,normal:.25,tint:'#a2a69e',colorWeight:.4});
  surface(m.roof,'tiles',{metres:1.3,normal:.65,tint:'#bcb8ad'});
  m.bark=surface(material('#fff'),'bark',{metres:.7,normal:.6,tint:'#999489'});
  m.roadPaint=material('#c8ccc7',{roughness:.94});
  m.tire=material('#1c1e1d',{roughness:.92});
  m.windowBack=material('#111a20',{roughness:.86});
  m.curtain=material('#888779',{roughness:.96});
  m.roomWarm=material('#8a7960',{roughness:.8,emissive:'#776047',emissiveIntensity:.10});
  m.leaf.side=m.darkLeaf.side=m.paleLeaf.side=THREE.DoubleSide;
  const geometry = {
    box: new THREE.BoxGeometry(1, 1, 1),
    soft: new RoundedBoxGeometry(1, 1, 1, 2, .012),
    cylinder: new THREE.CylinderGeometry(.5, .5, 1, 24),
    sphere: new THREE.IcosahedronGeometry(.5, 2),
    leaf: new THREE.BufferGeometry(),
    branch: new THREE.CylinderGeometry(.32,.5,1,7),
    plane: new THREE.PlaneGeometry(1, 1),
  };
  // A gently folded leaf has a real lit front/back and an irregular silhouette.
  geometry.leaf.setAttribute('position',new THREE.Float32BufferAttribute([
    0,0,0, -.42,.04,.35, 0,.13,1, 0,0,0, 0,.13,1, .42,.04,.35,
  ],3));
  geometry.leaf.setAttribute('uv',new THREE.Float32BufferAttribute([.5,0,0,.35,.5,1,.5,0,.5,1,1,.35],2));
  geometry.leaf.computeVertexNormals();
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
  function tree(x,z,height=2.1,variation=0) {
    const t=subgroup(group,'branching street tree',[x,0,z]);
    let seed=913+variation*101+Math.floor((x+20)*719+z*337);
    const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
    const branch=(a,b,width)=>{
      const delta=new THREE.Vector3().subVectors(b,a), center=a.clone().add(b).multiplyScalar(.5);
      const item=mesh(t,geometry.branch,m.bark,center.toArray(),[width,delta.length(),width]);
      item.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());
    };
    // Flush square tree pit, rather than a raised model-making pedestal.
    box(t,m.stone,0,.092,0,.75,.09,.75);
    box(t,m.soil,0,.143,0,.59,.018,.59);
    for(let n=0;n<6;n++)box(t,m.ink,-.24+n*.096,.155,0,.015,.012,.57);
    branch(new THREE.Vector3(0,.12,0),new THREE.Vector3(.04,height*.81,-.035),.15);
    for(let b=0;b<9;b++){
      const angle=b*2.39996+variation*.8, radius=height*(.18+random()*.12);
      const end=new THREE.Vector3(Math.cos(angle)*radius,height*(.68+random()*.24),Math.sin(angle)*radius);
      const begin=new THREE.Vector3(.02,height*(.39+random()*.21),0);
      branch(begin,end,.065);
      for(let twig=0;twig<5;twig++){
        const a=angle+twig*1.23, length=height*(.085+random()*.055);
        const tip=end.clone().add(new THREE.Vector3(Math.cos(a)*length,(random()-.2)*height*.2,Math.sin(a)*length));
        branch(end,tip,.024);
        for(let leaf=0;leaf<56;leaf++){
          const p=tip.clone().add(new THREE.Vector3((random()-.5)*height*.24,(random()-.5)*height*.20,(random()-.5)*height*.24));
          const length=height*(.022+random()*.027), mat=[m.leaf,m.darkLeaf,m.paleLeaf][Math.floor(random()*3)];
          mesh(t,geometry.leaf,mat,p.toArray(),[length,length,length],[random()*Math.PI,random()*Math.PI*2,random()*Math.PI]);
        }
      }
    }
  }
  function bench(x, z, rotation = 0) {
    const b = subgroup(group, 'timber bench', [x, 0, z]); b.rotation.y = rotation;
    for (const sx of [-.45, .45]) box(b, m.ink, sx, .21, 0, .07, .4, .43);
    for (let n = 0; n < 3; n++) box(b, m.wood, 0, .43, -.16 + n * .15, 1.12, .07, .11, { soft: true });
    box(b, m.wood, 0, .69, -.22, 1.12, .13, .06, { soft: true });
  }

  const traffic = subgroup(group, 'VerkehrsAI district');
  const office = subgroup(group, 'Autonomous Workforce atelier');

  box(office,w.floorWood,7.05,.02,-.35,8.25,.028,7.35);

  // Traffic district: a real little street network, low city blocks and public space.
  box(traffic, m.road, -7.2, .064, .25, 8.9, .055, 1.8);
  box(traffic, m.road, -7.2, .066, -.05, 1.8, .058, 10.1);
  for (const x of [-11.15, -3.25]) box(traffic, m.road, x, .06, 0, 1.13, .05, 10.6);
  for (const z of [-4.95, 4.95]) box(traffic, m.road, -7.2, .061, z, 8.9, .05, 1.12);
  for (let n = 0; n < 5; n++) {
    for (const direction of [-1, 1]) {
      box(traffic, m.roadPaint, -7.2, .103, direction * (1.7 + n * .59), .055, .012, .26);
      if (n < 4) box(traffic, m.roadPaint, -7.2 + direction * (1.7 + n * .55), .103, .25, .25, .012, .055);
    }
  }
  for (const side of [-1, 1]) {
    for (let stripe = 0; stripe < 6; stripe++) {
      box(traffic, m.roadPaint, -7.87 + stripe * .27, .11, .25 + side * 1.32, .15, .014, .54);
      box(traffic, m.roadPaint, -7.2 + side * 1.32, .11, -.42 + stripe * .27, .54, .014, .15);
    }
    box(traffic, m.roadPaint, -7.64, .104, .25 + side * 1.79, .7, .012, .06);
    box(traffic, m.roadPaint, -7.2 + side * 1.8, .104, .69, .06, .012, .7);
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
    mesh(b, roofGeometry, [m.plaster,roofMat], [0, h + .19, 0], [w + .3, 1.1, d + .25]);
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
        box(b,m.windowBack,wx,wy,side*(d/2+.018),.46,.66,.028);
        box(b,m.glass,wx,wy,side*(d/2+.04),.38,.56,.015);
        for(const edge of [-1,1]) {
          box(b,m.stone,wx+edge*.215,wy,side*(d/2+.075),.04,.69,.10);
          box(b,m.stone,wx,wy+edge*.315,side*(d/2+.075),.46,.04,.10);
        }
        if((row+col)%4===1)box(b,m.curtain,wx,wy+.2,side*(d/2+.055),.36,.16,.008);
        box(b,m.chalk,wx,wy,side*(d/2+.08),.022,.56,.025);
        box(b,m.chalk,wx,wy+.04,side*(d/2+.08),.38,.023,.025);
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
    const carMat = new THREE.MeshPhysicalMaterial({color,roughness:.29,metalness:.45,clearcoat:.8,clearcoatRoughness:.19});
    const length = long ? 1.72 : 1.32;
    box(car, carMat, 0, .28, 0, .62, .27, length, { soft: true, dynamic: true });
    box(car, carMat, 0, .46, -.04, .50, .24, length * .51, { soft: true, dynamic: true });
    box(car, m.glass, 0, .48, length * .243, .42, .16, .018, { rotation: [-.28,0,0], dynamic: true });
    box(car, m.glass, 0, .48, -length * .286, .42, .16, .018, { dynamic: true });
    for (const sx of [-1, 1]) {
      box(car, m.glass, sx * .257, .48, -.03, .016, .15, length * .39, { dynamic: true });
      box(car, m.chalk, sx * .2, .29, length / 2 + .008, .11, .07, .018, { dynamic: true });
      box(car,m.ink,sx*.261,.48,-.035,.019,.17,.026,{dynamic:true});
      box(car,m.metal,sx*.318,.25,0,.012,.018,length*.84,{dynamic:true});
      box(car,m.ink,sx*.16,.25,-length/2-.01,.13,.04,.016,{dynamic:true});
      for (const sz of [-1, 1]) {
        cylinder(car,m.tire,sx*.31,.15,sz*length*.3,.25,.075,{rotation:[0,0,Math.PI/2],dynamic:true});
        cylinder(car,m.metal,sx*.351,.15,sz*length*.3,.135,.012,{rotation:[0,0,Math.PI/2],dynamic:true});
      }
    }
    return car;
  }
  function roadLoop(points) {
    return new THREE.CatmullRomCurve3(points.map(([x,z])=>new THREE.Vector3(x,.095,z)),true,'centripetal',.3);
  }
  const perimeter = roadLoop([[-10.65,4.92],[-11.15,4.42],[-11.15,0],[-11.15,-4.43],[-10.64,-4.95],[-7.2,-4.95],[-3.77,-4.95],[-3.25,-4.43],[-3.25,0],[-3.25,4.42],[-3.77,4.92],[-7.2,4.92]]);
  // Opposing vehicles keep the right-hand lane through both turns. The former
  // shared centreline made the car cut through the oncoming shuttle.
  const westLoop = roadLoop([[-10.64,-4.95],[-8.19,-4.95],[-7.64,-4.4],[-7.64,-2.1],[-7.64,-.74],[-8.19,-.19],[-10.65,-.19],[-11.15,-.69],[-11.15,-4.43]]);
  const eastLoop = roadLoop([[-6.21,.69],[-3.8,.69],[-3.25,1.24],[-3.25,4.4],[-3.8,4.95],[-6.21,4.95],[-6.76,4.4],[-6.76,1.24]]);
  const cars = [
    { object: vehicle('#515b60'), curve: perimeter, offset: .27 },
    { object: vehicle('#bebfba'), curve: westLoop, stop: .367, release: 4 },
    { object: vehicle(colors.blue,true), curve: eastLoop, stop: .882, release: 5.3 },
  ];

  // Workforce atelier: open cutaway construction, three instruments, one physical case.
  box(office,w.officeWall,7.05,1.57,-3.95,8.2,3.14,.16,{soft:true});
  box(office,w.wood,7.05,3.18,-3.35,8.55,.2,1.52,{soft:true});
  for(const x of [3.15,7.05,10.95]) box(office,w.wood,x,1.625,-3.32,.13,3.25,.15);
  for(let n=0;n<12;n++) box(office,w.wood,3.2+n*.7,3.05,-3.35,.075,.12,1.35);
  text(office,'AGENTARIO',7.08,3.49,-3.24,4.8,.60,{size:71});
  box(office,m.ink,7.03,2.06,-3.84,4.22,1.25,.07,{soft:true});
  // The wall drawing is a simple physical process map, not a pretend product UI.
  for(const [i,x] of [5.72,7.03,8.34].entries()) {
    box(office,i===1?w.wood:m.stone,x,1.99,-3.786,.7,.34,.018,{soft:true});
    if(i<2) box(office,m.chalk,x+.65,1.99,-3.775,.6,.022,.02);
  }
  box(office,w.wood,7.05,1.15,-.25,7.6,.10,2.05);
  box(office,w.darkWood,7.05,1.093,-.25,7.56,.025,2.01);
  for(const x of [3.6,6.1,8.2,10.5]) {
    box(office,m.ink,x,.55,-.81,.1,1.1,.12);
    box(office,m.ink,x,.55,.33,.1,1.1,.12);
  }
  box(office,w.metal,7.05,1.225,.65,6.4,.055,.17,{soft:true});
  box(office,m.ink,7.05,1.258,.65,6.35,.012,.035);
  for(const [i,x] of [4.55,7.0,9.48].entries()) {
    text(office,['VOICE','DESKTOP','WORKFLOWS'][i],x,1.02,.786,1.9,.31,{size:70});
    box(office,w.fabric,x,1.208,-.31,1.7,.016,1.13,{soft:true});
  }
  // Voice: brushed-metal microphone, desk phone, physical audio bars.
  const voice = subgroup(office,'Voice station',[4.55,1.216,-.38]);
  createBroadcastMicrophone({THREE,m:w,mesh,box,cylinder,subgroup},voice);
  box(voice,m.ink,-.58,.07,.14,.34,.12,.55,{soft:true,rotation:[0,-.2,0]});
  box(voice,m.glass,-.58,.14,.1,.23,.015,.28,{rotation:[0,-.2,0]});
  const handset=subgroup(voice,'reception handset',[-.58,.2,.14]);
  box(handset,m.ink,0,.035,0,.12,.1,.48,{soft:true,dynamic:true});
  for(const z of [-.2,.2]) box(handset,m.ink,0,-.02,z,.22,.13,.14,{soft:true,dynamic:true});
  box(office,m.ink,4.55,1.405,.27,.69,.34,.065,{soft:true});
  const audioBars=[];
  for(let n=0;n<5;n++) audioBars.push(box(office,m.blue,4.32+n*.115,1.4,.309,.043,.27,.008,{soft:true,dynamic:true}));

  // Desktop: monitor, keyboard and a record that is assembled as the case arrives.
  const desktop = subgroup(office,'Desktop station',[7,1.216,-.46]);
  box(desktop,w.metal,0,.04,.04,.68,.07,.42,{soft:true});
  box(desktop,w.metal,0,.39,0,.09,.67,.08,{soft:true});
  box(desktop,m.ink,0,.93,-.04,1.5,.95,.1,{soft:true});
  box(desktop,m.chalk,0,.94,.016,1.35,.8,.025,{soft:true});
  box(desktop,m.blue,-.52,.94,.035,.22,.8,.012);
  box(desktop,m.ink,-.02,1.17,.042,.5,.035,.013);
  const recordLines=[];
  for(let n=0;n<3;n++) recordLines.push(box(desktop,n===2?m.blue:m.stone,.06,1.03-n*.13,.045,.74-n*.1,.039,.013,{dynamic:true}));
  box(desktop,w.metal,0,.04,.42,.87,.045,.29,{soft:true});

  // Workflows: bound calendar, three output trays and a little approval stamp.
  const workflow = subgroup(office,'Workflow station',[9.48,1.24,-.42]);
  box(workflow,w.wood,0,.12,-.1,1.1,.09,.61,{soft:true});
  box(workflow,m.stone,0,.55,-.15,1.05,.92,.08,{soft:true,rotation:[-.14,0,0]});
  box(workflow,m.chalk,0,.55,-.095,.97,.83,.025,{rotation:[-.14,0,0]});
  box(workflow,m.ink,0,.9,-.033,.97,.17,.026);
  for(const x of [-.3,.3]) box(workflow,m.ink,x,1.01,-.09,.055,.14,.13,{soft:true});
  for(let row=0;row<2;row++) for(let col=0;col<4;col++) box(workflow,m.stone,-.34+col*.225,.69-row*.22,-.035,.14,.14,.017);
  const booked=box(workflow,m.leaf,.11,.47,-.01,.14,.14,.022,{dynamic:true});
  for(let n=0;n<3;n++) {
    box(workflow,w.metal,.73,.07+n*.11,.13,.37,.045,.56,{soft:true});
    box(workflow,m.chalk,.73,.103+n*.11,.1,.29,.016,.43);
  }
  const stamp=subgroup(office,'approval stamp',[9.48,1.6,.65]);
  box(stamp,m.ink,0,0,0,.4,.12,.31,{soft:true,dynamic:true});
  cylinder(stamp,w.wood,0,.19,0,.13,.28,{dynamic:true});
  ball(stamp,w.wood,0,.36,0,.26,[1.35,.7,1],true);

  // Covered in/out trays hide the hand-off between successive cases naturally.
  for(const [x,incoming] of [[3.65,true],[10.58,false]]) {
    box(office,w.wood,x,1.64,.65,1.02,.09,1.02,{soft:true});
    box(office,w.wood,x,1.43,1.12,1.02,.4,.08,{soft:true});
    box(office,w.wood,x,1.43,.18,1.02,.4,.08,{soft:true});
    box(office,w.wood,x+(incoming?-.47:.47),1.43,.65,.08,.4,.94);
    text(office,incoming?'EINGANG':'ERLEDIGT',x,1.45,1.168,.84,.24,{size:64});
  }

  const dossier=subgroup(office,'one shared case',[4.55,1.29,.65]);
  box(dossier,m.orange,0,0,0,.69,.055,.79,{soft:true,dynamic:true});
  box(dossier,m.chalk,.025,.032,0,.59,.013,.7,{dynamic:true});
  for(let n=0;n<4;n++) box(dossier,n===0?m.ink:m.stone,-.04,.045,-.24+n*.135,n===0?.39:.47,.009,.024,{dynamic:true});
  const seal=box(dossier,m.orange,.19,.051,.24,.17,.014,.14,{soft:true,dynamic:true});
  // Shelves, books and a small table give the atelier depth and human scale.
  for(const x of [3.78,10.3]) {
    for(let n=0;n<3;n++) box(office,w.wood,x,.78+n*.57,-3.28,1.08,.07,.5);
    for(const dx of [-.49,.49]) box(office,m.ink,x+dx,1.23,-3.3,.045,2.46,.43);
    for(let n=0;n<7;n++) box(office,[m.stone,m.ink,m.roof,m.blue][n%4],x-.4+n*.12,1.06+(n%2)*.57,-3.27,.085,.43+(n%3)*.04,.34);
  }
  cylinder(office,w.wood,7.3,.89,2.1,1.42,.12);
  cylinder(office,m.ink,7.3,.45,2.1,.12,.87);
  cylinder(office,m.stone,7.3,.04,2.1,.65,.08);
  for(const [x,z] of [[6.3,2.16],[8.29,2.16]]) {
    cylinder(office,m.blue,x,.64,z,.58,.12);
    for(const sx of [-1,1]) box(office,m.ink,x+sx*.18,.325,z,.04,.65,.04);
  }
  const cityAPI = { THREE, group, traffic, office, m, colors, geometry, mesh, box, cylinder, ball, text, subgroup };
  const architecture = createArchitecture(cityAPI);
  for(const key of ['cityBrick','cityBrickDark']) surface(m[key],'brick',{metres:1.02,normal:.62,tint:key==='cityBrick'?'#aaa39a':'#837d76'});
  surface(m.cityIvory,'plaster',{metres:.36,normal:.18,tint:'#c2c6c0',colorWeight:.30});
  for(const key of ['cityLimestone','cityPaleStone']) surface(m[key],'concrete',{metres:.9,normal:.16,tint:key==='cityLimestone'?'#a9ada3':'#c3c5ba',colorWeight:.20});
  surface(m.cityTerracotta,'tiles',{metres:1.35,normal:.6,tint:'#c3b7a7'});
  m.cityMortar.color.set('#77746b');m.cityMortar.roughness=1;
  m.cityZinc.color.set('#485253');m.cityZinc.roughness=.46;m.cityZinc.metalness=.68;
  m.cityTimber.color.set('#78634a');m.cityCopper.color.set('#7e6850');
  for(const key of ['cityGlazing','cityShadowGlass']) {m[key].color.set(key==='cityGlazing'?'#415962':'#2d424b');m[key].roughness=.16;m[key].metalness=.34;m[key].envMapIntensity=2.5;}
  m.cityWarmWindow.color.set('#9b8b6c');m.cityWarmWindow.emissive.set('#725d40');m.cityWarmWindow.emissiveIntensity=.08;
  let windowIndex=0;
  for(const item of [...staticMeshes]) {
    if(!/(recessed glass|HQ glazed bay floor)/.test(item.name))continue;
    const index=windowIndex++;
    if(index%7!==2 && index%7!==5)continue;
    const [w,h,d]=item.scale.toArray(),p=item.position;
    box(item.parent,index%7===2?m.curtain:m.roomWarm,p.x,p.y+h*.28,p.z+d/2+.008,w*.94,h*.32,.008);
  }
  createInteriorDetails(cityAPI);
  detailFurniture({...cityAPI,m:w},desktop);
  const shared = subgroup(group, 'Rear connecting passage');

  // Keep each district's static draw batches together. Matrix copies are taken
  // before the common .8 scale, so dynamic cars and workbench objects agree.
  group.updateMatrixWorld(true);
  const batches = new Map(), tempBounds = new THREE.Box3();
  const destination = item => {
    item.geometry.computeBoundingBox();
    tempBounds.copy(item.geometry.boundingBox).applyMatrix4(item.matrixWorld);
    if (tempBounds.max.x < 0) return traffic;
    if (tempBounds.min.x > 0) return office;
    return shared; // Continuous rear kerb/footway: the only cross-district parts.
  };
  for (const item of staticMeshes) {
    if(/^Brick (horizontal course|bond)/.test(item.name)){item.removeFromParent();continue;}
    if(item.geometry===geometry.cityGable && item.material===m.cityTerracotta)item.material=[m.cityBrick,m.cityTerracotta];
    const owner = destination(item);
    const key = `${owner.uuid}:${item.geometry.uuid}:${[].concat(item.material).map(m=>m.uuid).join(':')}`;
    if (!batches.has(key)) batches.set(key, { owner, items: [] });
    batches.get(key).items.push(item);
  }
  for (const { owner, items } of batches.values()) {
    if (items.length === 1) { owner.attach(items[0]); continue; }
    const batch = new THREE.InstancedMesh(items[0].geometry, items[0].material, items.length);
    batch.name = `${owner === traffic ? 'traffic' : owner === office ? 'workforce' : 'shared'} architectural details`;
    batch.castShadow = items.some(item => item.castShadow); batch.receiveShadow = true;
    items.forEach((item, i) => { batch.setMatrixAt(i, item.matrixWorld); item.removeFromParent(); });
    batch.instanceMatrix.needsUpdate = true;
    batch.computeBoundingBox(); batch.computeBoundingSphere(); owner.add(batch);
  }

  const smooth=value=>{const n=Math.max(0,Math.min(1,value));return n*n*(3-2*n);};
  const phase=(time,a,b)=>smooth((time-a)/(b-a));
  const tangent=new THREE.Vector3();
  function update(timeSeconds=0,{selected='overview',reducedMotion=false}={}) {
    if (disposed) return;
    const time=Number.isFinite(timeSeconds)?Math.max(0,timeSeconds):0;
    const t=reducedMotion?10.9:time%14;
    // All routes share the signal cycle, preserving merge spacing on every
    // repeat and when scroll/replay seeks directly to an arbitrary time.
    const trafficTime=(reducedMotion?10:time)%24;
    for(const car of cars) {
      const progress=car.stop===undefined?(trafficTime/24+car.offset)%1:
        (car.stop+phase(trafficTime,car.release,23.98))%1;
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
    const nsGreen=trafficTime>=4&&trafficTime<14;
    signals.nsRed.color.set(nsGreen?'#503b35':'#b84937');signals.nsGreen.color.set(nsGreen?'#6e9d74':'#344a3d');
    signals.ewRed.color.set(nsGreen?'#b84937':'#503b35');signals.ewGreen.color.set(nsGreen?'#344a3d':'#6e9d74');
    traffic.userData.selected = selected === 'traffic';
    office.userData.selected = selected === 'workforce';
  }
  update(0);
  group.scale.setScalar(.8);
  group.updateMatrixWorld(true);
  const district = districtGroup => {
    const bounds = new THREE.Box3().setFromObject(districtGroup);
    return { center: bounds.getCenter(new THREE.Vector3()), bounds };
  };
  const districts = { traffic: district(traffic), workforce: district(office) };
  // Include every car's route in focus bounds. A little extra padding covers
  // the vehicle body and the small curve arcs between the sampled points.
  for (const car of cars) {
    const route = new THREE.Box3().setFromPoints(car.curve.getPoints(512));
    const padding = car.object.name === 'electric shuttle' ? 1.05 : .85;
    route.min.x -= padding; route.max.x += padding;
    route.min.z -= padding; route.max.z += padding;
    route.min.y = 0; route.max.y = 1;
    route.min.multiplyScalar(.8); route.max.multiplyScalar(.8);
    districts.traffic.bounds.union(route);
  }
  districts.traffic.bounds.getCenter(districts.traffic.center);
  const bounds = new THREE.Box3().setFromObject(group).union(districts.traffic.bounds);
  const entryClearance = new THREE.Box3(new THREE.Vector3(-1.7, 0, -3.6), new THREE.Vector3(1.7, 5.5, 3.6));
  // Input targets are deliberate solid volumes; detail meshes stay batched.
  const hitMaterial = new THREE.MeshBasicMaterial({ transparent:true, opacity:0, depthWrite:false, colorWrite:false });
  const hitTargets = Object.entries(districts).map(([path, district]) => {
    const target = new THREE.Mesh(geometry.box, hitMaterial);
    target.name = `${path} interior selection volume`; target.userData.path = path;
    target.position.copy(district.center).divideScalar(.8);
    target.scale.copy(district.bounds.getSize(new THREE.Vector3())).divideScalar(.8);
    group.add(target); return target;
  });
  const landmarks = Object.fromEntries(Object.entries(architecture.landmarks).map(([key, point]) => [key, point.clone().multiplyScalar(.8)]));
  function dispose() {
    if (disposed) return; disposed = true;
    cityMaterials.stop();workforceMaterials.stop();
    const geometries = new Set(), materials = new Set(), textures = new Set();
    group.traverse(object => {
      if (object.isInstancedMesh) object.dispose();
      if (object.geometry) geometries.add(object.geometry);
      for (const material of [].concat(object.material || [])) {
        materials.add(material);
        for (const value of Object.values(material)) if (value?.isTexture) textures.add(value);
      }
    });
    geometries.forEach(item => item.dispose());
    materials.forEach(item => item.dispose());
    textures.forEach(item => item.dispose());
    group.clear(); group.removeFromParent();
  }
  return { group, update, hitTargets, districts, bounds, entryClearance, landmarks, ready:Promise.all([cityMaterials.ready(),workforceMaterials.ready]), dispose };
}
