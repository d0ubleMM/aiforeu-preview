import * as THREE from './agentario-scene/vendor/three.module.min.js';

/* Public, illustrative geometry. No planning software, private data or map imagery. */
export function mountJunction(host) {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({alpha: true, antialias: true, powerPreference: 'high-performance'});
  } catch { return null; }
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.6));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.setClearColor(0x000000, 0);
  const canvas = renderer.domElement;
  canvas.setAttribute('aria-hidden', 'true');
  host.append(canvas);
  const scene = new THREE.Scene();
  const root = new THREE.Group();
  scene.add(root);
  const camera = new THREE.PerspectiveCamera(33, 1, .1, 120);
  scene.add(new THREE.HemisphereLight('#ffffff', '#78808a', 2.25));
  const sun = new THREE.DirectionalLight('#ffffff', 3.4);
  sun.position.set(-8, 18, 10); sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, {left: -12, right: 12, top: 12, bottom: -12, near: 1, far: 45});
  sun.shadow.normalBias = .025; sun.shadow.bias = -.0003;
  scene.add(sun);
  const fill = new THREE.DirectionalLight('#c6d4e5', 1.3); fill.position.set(9, 8, -10); scene.add(fill);
  const material = (color, roughness = .85, metalness = 0) => new THREE.MeshStandardMaterial({color, roughness, metalness});
  const concrete = material('#bcc2c4'), road = material('#515b62'), paving = material('#e1e4e2');
  const building = material('#d5dbdc'), roof = material('#b3bec2'), glass = material('#73858e', .3, .2);
  const white = material('#dce3df'), treeGreen = material('#899b8f'), trunk = material('#68756b');
  function box(parent, dims, pos, mat) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(...dims), mat);
    mesh.position.set(...pos); mesh.castShadow = true; mesh.receiveShadow = true; parent.add(mesh); return mesh;
  }
  box(root, [13.8, .42, 13.8], [0, -.27, 0], concrete);
  box(root, [3.8, .045, 13.8], [0, -.025, 0], road);
  box(root, [13.8, .05, 3.8], [0, -.02, 0], road);
  // The four quarters are deliberately different: the intersection remains readable while the camera moves.
  for (const [x,z,w,d,h] of [[-4.55,-4.55,2.8,3.1,2.1],[4.45,-4.7,3,2.6,3.2],[-4.8,4.5,2.5,3.1,1.3],[4.5,4.5,3,3.1,2.2]]) {
    box(root, [4.8,.15,4.8], [Math.sign(x)*4.5,.065,Math.sign(z)*4.5], paving);
    box(root,[w,h,d],[x,h/2+.16,z],building);
    box(root,[w+.09,.09,d+.09],[x,h+.19,z],roof);
    box(root,[w*.55,.2,d*.4],[x,h+.33,z],concrete);
    for(let level=.45;level<h-.1;level+=.62){
      box(root,[w*.75,.24,.018],[x,level+.16,z+d/2+.012],glass);
      box(root,[.018,.24,d*.72],[x+w/2+.012,level+.16,z],glass);
    }
  }
  // Lane centres, stop lines and pedestrian crossings.
  for(let n=-6.4;n<=6.4;n+=1.05) if(Math.abs(n)>2.7){
    box(root,[.06,.012,.48],[0,.018,n],white);
    box(root,[.48,.012,.06],[n,.02,0],white);
  }
  for(const sign of [-1,1]) {
    for(let i=0;i<8;i++){
      box(root,[.24,.018,.64],[-1.55+i*.44,.03,sign*2.4],white);
      box(root,[.64,.018,.24],[sign*2.4,.03,-1.55+i*.44],white);
    }
    box(root,[1.5,.018,.09],[-sign*.92,.035,sign*3],white);
    box(root,[.09,.018,1.5],[sign*3,.035,sign*.92],white);
  }
  for(const [x,z] of [[-2.25,-3.3],[2.25,3.3],[3.3,-2.25],[-3.3,2.25]]) {
    box(root,[.07,1.35,.07],[x,.76,z],trunk);
    box(root,[.19,.4,.17],[x,1.48,z],road);
    const light = new THREE.Mesh(new THREE.SphereGeometry(.045,8,6),new THREE.MeshBasicMaterial({color:x*z>0?'#c3c88d':'#b5907b'}));
    light.position.set(x,1.49,z+.09); root.add(light);
  }
  for(const [x,z] of [[-6.3,-2.8],[-2.8,-6.1],[2.85,-5.5],[6.2,2.8],[2.8,6.1],[-6.1,2.9]]) {
    box(root,[.09,.65,.09],[x,.45,z],trunk);
    const crown = new THREE.Mesh(new THREE.IcosahedronGeometry(.46,1),treeGreen);
    crown.scale.set(.85,1.2,.85); crown.position.set(x,1.05,z); crown.castShadow=true; root.add(crown);
  }
  // Traffic follows the two independent axes; its motion can be stopped without losing the scene.
  const cars=[];
  for(let i=0;i<7;i++) {
    const car=new THREE.Group();
    const paint=material(['#b5c4c5','#edece3','#738a94','#a5b0a8'][i%4],.45,.1);
    box(car,[.47,.22,.9],[0,.19,0],paint);
    box(car,[.4,.18,.46],[0,.38,-.02],glass);
    box(car,[.4,.025,.33],[0,.49,-.02],paint);
    for(const x of [-.24,.24])for(const z of [-.28,.28])box(car,[.07,.15,.14],[x,.13,z],road);
    root.add(car);cars.push({car,axis:i%2,offset:i*2.7,direction:i%3?1:-1});
  }
  // A translucent drawing plane lifts off the model. It shows geometry, not an unverified software capability.
  const drawing=new THREE.Group();root.add(drawing);
  const sheetMat=new THREE.MeshBasicMaterial({color:'#a4cbd9',transparent:true,opacity:0,side:THREE.DoubleSide,depthWrite:false});
  const sheet=new THREE.Mesh(new THREE.PlaneGeometry(13.8,13.8),sheetMat);sheet.rotation.x=-Math.PI/2;drawing.add(sheet);
  const lineMat=new THREE.LineBasicMaterial({color:'#c3e0e9',transparent:true,opacity:0,depthWrite:false});
  const points=[];
  const segment=(x1,z1,x2,z2)=>{points.push(x1,.015,z1,x2,.015,z2);};
  for(const d of [-6.8,6.8]){segment(-6.8,d,6.8,d);segment(d,-6.8,d,6.8);}
  for(const d of [-1.95,1.95]){segment(-6.8,d,6.8,d);segment(d,-6.8,d,6.8);}
  for(let d=-6;d<=6;d+=1.5){segment(d,-6.8,d,-6.55);segment(-6.8,d,-6.55,d);}
  for(const [x,z,w,d]of[[-4.55,-4.55,2.8,3.1],[4.45,-4.7,3,2.6],[-4.8,4.5,2.5,3.1],[4.5,4.5,3,3.1]]) {
    segment(x-w/2,z-d/2,x+w/2,z-d/2);segment(x+w/2,z-d/2,x+w/2,z+d/2);segment(x+w/2,z+d/2,x-w/2,z+d/2);segment(x-w/2,z+d/2,x-w/2,z-d/2);
  }
  const lines=new THREE.LineSegments(new THREE.BufferGeometry().setAttribute('position',new THREE.Float32BufferAttribute(points,3)),lineMat);drawing.add(lines);
  const floor=new THREE.Mesh(new THREE.PlaneGeometry(70,70),new THREE.ShadowMaterial({opacity:.18}));
  floor.rotation.x=-Math.PI/2;floor.position.y=-.5;floor.receiveShadow=true;scene.add(floor);

  let state={plan:0,progress:0,active:false,moving:false},frame=0,clock=0,last=0,lost=false,visible=false;
  function draw() {
    if(lost)return;
    const {plan,progress}=state;
    root.rotation.y=-.19+progress*.23;
    camera.position.set(16-plan*1.4,14.5+plan*4.5,19-plan*1.5);
    const distance=Math.max(1.08,1.3/camera.aspect)+plan*.12;
    camera.position.multiplyScalar(distance);
    camera.lookAt(0,1+plan*.8,0);
    drawing.position.y=.2+plan*4.6;
    sheetMat.opacity=plan*.1;lineMat.opacity=plan*.8;
    drawing.visible=plan>.001;
    cars.forEach(({car,axis,offset,direction})=>{
      const travel=((clock*.8+offset)%14)-7;
      car.position.set(axis?travel*direction:direction*.88,.03,axis?-direction*.88:travel*direction);
      car.rotation.y=axis?Math.PI/2*direction:direction<0?Math.PI:0;
    });
    renderer.render(scene,camera);
    host.dataset.ready='true';
  }
  function tick(time) {
    frame=0;
    if(lost||!visible||!state.active||!state.moving){last=0;return;}
    if(!last)last=time;
    clock+=Math.min(time-last,60)/1000;
    last=time;draw();
    frame=requestAnimationFrame(tick);
  }
  function update(next) {
    state=next;
    if(!visible||!next.active||!next.moving){cancelAnimationFrame(frame);frame=0;last=0;}
    if(next.active)draw();
    if(visible&&next.active&&next.moving&&!frame&&!lost)frame=requestAnimationFrame(tick);
  }
  function resize(){
    const {width,height}=host.getBoundingClientRect();
    if(width<=0||height<=0)return;
    renderer.setSize(width,height,false);camera.aspect=width/height;camera.updateProjectionMatrix();draw();
  }
  canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();lost=true;cancelAnimationFrame(frame);frame=0;host.dataset.ready='false';});
  canvas.addEventListener('webglcontextrestored',()=>{lost=false;resize();update(state);});
  new ResizeObserver(resize).observe(host);
  new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;update(state);}).observe(host);
  resize();
  return {update};
}
