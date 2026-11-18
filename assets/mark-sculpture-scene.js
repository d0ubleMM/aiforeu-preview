import * as THREE from './agentario-scene/vendor/three.module.min.js';

// The outer contour and circular cut-out are taken from aiforeu-mark.svg.
// Three solid, closed extrusions meet at the original silhouette.
export function mountMarkSculpture(host) {
  let renderer;
  try { renderer = new THREE.WebGLRenderer({alpha:true, antialias:true, powerPreference:'low-power'}); }
  catch { return null; }
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.7));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.VSMShadowMap;
  renderer.setClearColor(0x000000, 0);
  const canvas = renderer.domElement;
  canvas.setAttribute('aria-hidden','true');
  host.append(canvas);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(31, 1, .1, 100);
  const sculpture = new THREE.Group();
  scene.add(sculpture);

  // Broad photographic softboxes reflected by the metal, without external HDR assets.
  const studio = new THREE.Scene();
  studio.background = new THREE.Color('#26282b');
  const cards = [];
  for (const [width,height,x,y,z,color] of [
    [8,5,-5,7,5,'#ffffff'],[3,8,7,3,1,'#b9c3ce'],
    [9,2,1,6,-5,'#f3f4f3'],[3,3,-6,-1,-2,'#5f6870']
  ]) {
    const card = new THREE.Mesh(new THREE.PlaneGeometry(width,height),new THREE.MeshBasicMaterial({color:new THREE.Color(color).multiplyScalar(5),side:THREE.DoubleSide}));
    card.position.set(x,y,z);card.lookAt(0,0,0);studio.add(card);cards.push(card);
  }
  const pmrem = new THREE.PMREMGenerator(renderer);
  const environment = pmrem.fromScene(studio, .035);
  scene.environment = environment.texture;
  pmrem.dispose();
  cards.forEach(card=>{card.geometry.dispose();card.material.dispose();});

  scene.add(new THREE.HemisphereLight('#eff1f3','#34383d',1.2));
  const key = new THREE.DirectionalLight('#fffdf8',2.8);
  key.position.set(-5,8,7);key.castShadow=true;
  key.shadow.mapSize.set(1024,1024);
  Object.assign(key.shadow.camera,{left:-10,right:10,top:8,bottom:-8,near:.1,far:30});
  key.shadow.normalBias=.025;key.shadow.bias=-.00015;key.shadow.radius=7;key.shadow.blurSamples=8;
  scene.add(key);
  const rim = new THREE.DirectionalLight('#d6e4f1',2.6);rim.position.set(5,4,-5);scene.add(rim);
  const fill = new THREE.DirectionalLight('#ffffff',.65);fill.position.set(3,-1,6);scene.add(fill);

  const face = new THREE.MeshPhysicalMaterial({color:'#f0f1f1',metalness:.72,roughness:.27,clearcoat:.22,clearcoatRoughness:.3});
  const edge = new THREE.MeshStandardMaterial({color:'#c2c9ce',metalness:.85,roughness:.3});
  const outline = [[128,24],[236,148],[200,128],[176,148],[128,116],[80,148],[56,128],[20,148]].map(([x,y])=>new THREE.Vector2((x-128)/30,(86-y)/30));
  function clip(points, boundary, right) {
    const result=[];
    for(let i=0;i<points.length;i++) {
      const a=points[i],b=points[(i+1)%points.length];
      const aIn=right?a.x>=boundary:a.x<=boundary,bIn=right?b.x>=boundary:b.x<=boundary;
      if(aIn)result.push(a.clone());
      if(aIn!==bIn) {const t=(boundary-a.x)/(b.x-a.x);result.push(new THREE.Vector2(boundary,a.y+(b.y-a.y)*t));}
    }
    return result;
  }
  const polygons=[clip(outline,-1.04,false),clip(clip(outline,-1.04,true),1.04,false),clip(outline,1.04,true)];
  const parts=polygons.map((points,index)=>{
    const shape=new THREE.Shape(points);
    if(index===1){const hole=new THREE.Path();hole.absarc(0,-2/30,24/30,0,Math.PI*2,true);shape.holes.push(hole);}
    const pivot=points.reduce((sum,p)=>sum.add(p),new THREE.Vector2()).multiplyScalar(1/points.length);
    const geometry=new THREE.ExtrudeGeometry(shape,{depth:.76,bevelEnabled:true,bevelSegments:6,steps:1,bevelSize:.035,bevelThickness:.05,curveSegments:64});
    geometry.translate(-pivot.x,-pivot.y,-.38);
    const mesh=new THREE.Mesh(geometry,[face,edge]);
    mesh.castShadow=true;mesh.receiveShadow=true;sculpture.add(mesh);
    return {mesh,pivot};
  });

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(80,80),new THREE.ShadowMaterial({opacity:.24}));
  floor.rotation.x=-Math.PI/2;floor.position.y=-2.65;floor.receiveShadow=true;scene.add(floor);
  // A soft contact shadow beneath the hovering sculpture grounds the entire object.
  const shadowCanvas=document.createElement('canvas');shadowCanvas.width=shadowCanvas.height=128;
  const shadowContext=shadowCanvas.getContext('2d');
  const gradient=shadowContext.createRadialGradient(64,64,0,64,64,64);
  gradient.addColorStop(0,'rgba(0,0,0,.45)');gradient.addColorStop(.45,'rgba(0,0,0,.24)');gradient.addColorStop(1,'transparent');
  shadowContext.fillStyle=gradient;shadowContext.fillRect(0,0,128,128);
  const shadowTexture=new THREE.CanvasTexture(shadowCanvas);
  const contact=new THREE.Mesh(new THREE.PlaneGeometry(11,5),new THREE.MeshBasicMaterial({map:shadowTexture,transparent:true,depthWrite:false}));
  contact.rotation.x=-Math.PI/2;contact.position.set(0,-2.64,.5);scene.add(contact);

  let lost=false,lastTime=0,lastPointer={x:0,y:0};
  const ease=t=>t*t*t*(t*(t*6-15)+10);
  function opening(seconds) {
    const t=((seconds%14)+14)%14;
    if(t<1.7)return 0;
    if(t<4.6)return ease((t-1.7)/2.9);
    if(t<6.1)return 1;
    if(t<9.5)return 1-ease((t-6.1)/3.4);
    return 0;
  }
  function render(seconds=0,pointer={x:0,y:0}) {
    if(lost)return;
    lastTime=seconds;lastPointer=pointer;
    const spread=opening(seconds);
    const offsets=[[-.72,.2,.68],[0,.38,-.55],[.72,-.12,.85]];
    const turns=[[.04,-.22,-.075],[-.07,.11,.015],[-.04,.24,.085]];
    parts.forEach(({mesh,pivot},i)=>{
      const d=offsets[i],r=turns[i];
      mesh.position.set(pivot.x+(i-1)*.045+d[0]*spread,pivot.y+d[1]*spread,d[2]*spread);
      mesh.rotation.set(r[0]*spread,r[1]*spread,r[2]*spread);
    });
    const orbit=Math.sin(seconds*Math.PI*2/14);
    sculpture.rotation.set(-.16+pointer.y*.035,-.38+orbit*.055+pointer.x*.06,.025);
    sculpture.position.y=.12+Math.sin(seconds*Math.PI*2/14)*.035;
    contact.material.opacity=1-spread*.15;
    renderer.render(scene,camera);
  }
  function resize() {
    const {width,height}=host.getBoundingClientRect();
    if(!width||!height)return;
    renderer.setSize(width,height,false);camera.aspect=width/height;
    const distance=Math.max(5.7,10.4/camera.aspect)/(2*Math.tan(THREE.MathUtils.degToRad(camera.fov/2)));
    camera.position.set(0,1.05,distance);camera.lookAt(0,-.05,0);camera.updateProjectionMatrix();
    render(lastTime,lastPointer);
  }
  const observer=new ResizeObserver(resize);observer.observe(host);
  const onLost=event=>{event.preventDefault();lost=true;host.closest('[data-mark-sculpture]')?.removeAttribute('data-ready');};
  // Recreate the scene after restoration: GPU-only environment and shadow targets
  // need to be rendered again, rather than reused as empty textures.
  const onRestored=()=>host.dispatchEvent(new Event('mark-context-restored'));
  canvas.addEventListener('webglcontextlost',onLost);canvas.addEventListener('webglcontextrestored',onRestored);
  resize();
  return {
    render,resize,canvas,
    snapshot(seconds=0){render(seconds);return canvas.toDataURL('image/png');},
    dispose(){observer.disconnect();canvas.removeEventListener('webglcontextlost',onLost);canvas.removeEventListener('webglcontextrestored',onRestored);parts.forEach(p=>p.mesh.geometry.dispose());face.dispose();edge.dispose();floor.geometry.dispose();floor.material.dispose();contact.geometry.dispose();contact.material.dispose();shadowTexture.dispose();environment.dispose();key.shadow.map?.dispose();renderer.dispose();renderer.forceContextLoss();canvas.remove();}
  };
}
