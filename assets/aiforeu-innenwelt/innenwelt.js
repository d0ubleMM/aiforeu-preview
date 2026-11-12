import * as THREE from '../agentario-scene/vendor/three.module.min.js';
import { FARBEN } from '../aiforeu-flug/basis.js';
import { createCarrier } from './carrier-model.js';
import { createInteriorDistricts } from './interior-districts.js';
import { sampleCarrierView } from './interior-camera.js';

const mounted = new WeakMap();
const content = {
  traffic: {title:'VerkehrsAI', copy:'KI für die Verkehrsplanung. Mit VerkehrsOS entwickeln wir ein EU-gefördertes Forschungsprojekt für Lage- und Signalpläne.', href:'verkehrsai.html', action:'VerkehrsAI entdecken'},
  workforce: {title:'Autonomous Workforce', copy:'Agentario verbindet Voice, Desktop und Workflows. Damit aus wiederkehrender Arbeit ein selbstständiger Ablauf wird.', href:'autonomous-workforce.html', action:'Agentario und Workforce entdecken'},
};
const smooth = t => {t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
const mixPose = (a,b,t) => ({position:a.position.map((v,i)=>THREE.MathUtils.lerp(v,b.position[i],t)),target:a.target.map((v,i)=>THREE.MathUtils.lerp(v,b.target[i],t)),fov:THREE.MathUtils.lerp(a.fov,b.fov,t),open:THREE.MathUtils.lerp(a.open,b.open,t)});

// A neutral studio sky lights the real surfaces; the rooms have their own fixtures.
function environment(renderer) {
  const studio = new THREE.Scene(); studio.background=new THREE.Color('#566374');
  for (const [position,scale,intensity] of [ [[0,30,5],[45,1,40],3], [[-30,8,15],[1,24,55],2], [[30,4,-15],[1,18,35],1.5] ]) {
    const light=new THREE.Mesh(new THREE.BoxGeometry(...scale),new THREE.MeshBasicMaterial({color:new THREE.Color('#e5edfa').multiplyScalar(intensity)}));
    light.position.set(...position);studio.add(light);
  }
  const generator=new THREE.PMREMGenerator(renderer); const texture=generator.fromScene(studio,.04);generator.dispose();
  studio.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});return texture;
}

export function mountWorld(host) {
  if(mounted.has(host))return mounted.get(host);
  const stage=host.querySelector('[data-world-stage]'), fallback=host.querySelector('[data-world-fallback]');
  if(!stage)return null;
  const canvas=document.createElement('canvas');canvas.setAttribute('aria-hidden','true');
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  let renderer,carrier,rooms,env;
  try {
    renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'});
    renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.02;
    renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
    env=environment(renderer);
    carrier=createCarrier(THREE,{farben:FARBEN,klein:innerWidth<760,umgebung:env.texture});
    rooms=createInteriorDistricts();
  } catch(error) {
    rooms?.dispose();carrier?.dispose?.();env?.dispose();renderer?.dispose();
    stage.dataset.worldReady='fallback';return null;
  }
  const scene=new THREE.Scene();scene.background=new THREE.Color('#080e17');scene.environment=env.texture;
  const camera=new THREE.PerspectiveCamera(55,1,.08,1200);
  scene.add(carrier.group,rooms.group);
  const ambient=new THREE.HemisphereLight('#e8f0ff','#677384',1.15);scene.add(ambient);
  const sun=new THREE.DirectionalLight('#fff0dc',2.8);sun.position.set(-25,42,28);scene.add(sun);
  const rim=new THREE.DirectionalLight('#c5d9ff',1.5);rim.position.set(30,18,-22);scene.add(rim);
  const interior=new THREE.DirectionalLight('#fff8f0',2.4);interior.position.set(-1,7,5);interior.target.position.set(0,0,-2);
  interior.castShadow=true;interior.shadow.mapSize.set(1536,1536);Object.assign(interior.shadow.camera,{left:-15,right:15,top:14,bottom:-14,near:.2,far:35});
  interior.shadow.bias=-.00025;interior.shadow.normalBias=.025;scene.add(interior,interior.target);
  const fill=new THREE.PointLight('#dbe9ff',35,36,1.3);fill.position.set(0,5.8,-4);scene.add(fill);
  // The open aperture admits direct light while fixed ribs keep the room readable.
  const controls=host.querySelector('[data-carrier-ui]'), choices=host.querySelector('[data-carrier-choices]');
  const enter=host.querySelector('[data-carrier-enter]'), outside=host.querySelector('[data-carrier-outside]'), pause=host.querySelector('[data-carrier-pause]');
  const detail=host.querySelector('[data-world-detail]');
  const abort=new AbortController(),on=(element,event,handler)=>element?.addEventListener(event,handler,{signal:abort.signal});
  let aspect=1,view=reduced.matches?'atrium':'exterior',entryProgress=0,openingClock=0,automatic=!reduced.matches;
  let pose,transition=null,elapsed=0,last=0,raf=0,visible=true,blurred=false,paused=false,contextLost=false,disposed=false;
  let previousPointer=null;
  const viewPose=(name,p=1)=>sampleCarrierView(name,p,{aspect,districts:rooms.districts});
  function syncUI() {
    const focused=document.activeElement;
    host.dataset.carrierView=view;
    controls.hidden=false;enter.hidden=!['exterior','entry'].includes(view);choices.hidden=['exterior','entry'].includes(view);
    enter.firstChild.textContent=view==='entry'?'Direkt hinein ':'AIFOREU betreten ';
    outside.hidden=['exterior','entry'].includes(view);
    pause.hidden=reduced.matches;
    pause.setAttribute('aria-pressed',String(paused));pause.setAttribute('aria-label',paused?'Animation fortsetzen':'Animation pausieren');
    pause.querySelector('path').setAttribute('d',paused?'M5 3l7 5-7 5V3Z':'M5 3v10M11 3v10');
    for(const button of choices.querySelectorAll('button'))button.setAttribute('aria-pressed',String(button.dataset.carrierSelect===view));
    detail.hidden=!content[view];
    if(content[view]){const c=content[view];detail.querySelector('[data-world-title]').textContent=c.title;detail.querySelector('[data-world-copy]').textContent=c.copy;
      const link=detail.querySelector('a');link.href=c.href;link.innerHTML=`${c.action} <span aria-hidden="true">↗</span>`;}
    if(host.contains(focused)&&focused.closest('[hidden]')) (choices.hidden?enter:choices.querySelector('button')).focus({preventScroll:true});
  }
  function select(next,instant=false) {
    if(disposed)return;automatic=false;
    if(next==='entry'&&(reduced.matches||paused)){next='atrium';instant=true;}
    const previous=view;view=next;
    if(next==='entry'){entryProgress=0;openingClock=0;transition=null;automatic=true;}
    else {const target=viewPose(next);
      const via=aspect<1.15&&Math.max(pose.position[2],target.position[2])>8&&Math.max(Math.abs(pose.position[0]),Math.abs(target.position[0]))>3.5?{position:[0,6.3,7.2],target:[0,1.2,-2.5],fov:(pose.fov+target.fov)/2,open:1}:null;
      transition=(!instant&&!reduced.matches&&!paused&&previous!=='entry')?{from:pose,to:target,via,time:0}:null;if(!transition)pose=target;}
    syncUI();draw();schedule();
  }
  function setPose(p) {
    camera.position.set(...p.position);camera.lookAt(...p.target);camera.fov=p.fov;camera.updateProjectionMatrix();camera.updateMatrixWorld();carrier.update(p.open,elapsed);
  }
  function draw() {
    if(disposed||contextLost)return;
    try{setPose(pose);rooms.update(elapsed,{selected:content[view]?view:'overview',reducedMotion:reduced.matches});renderer.render(scene,camera);}catch{dispose();}
  }
  function canRun(){return !disposed&&!contextLost&&visible&&!document.hidden&&!blurred&&!document.body.classList.contains('global-menu-open')&&!paused&&!reduced.matches;}
  function schedule(){if(canRun()&&!raf){last=performance.now();raf=requestAnimationFrame(tick);}}
  function tick(now) {
    raf=0;if(!canRun())return;
    const dt=Math.min(.05,(now-last)/1000);last=now;elapsed+=dt;
    if(automatic){
      openingClock+=dt;
      if(view==='exterior'&&openingClock>.9){view='entry';openingClock=0;syncUI();}
      if(view==='entry'){entryProgress=Math.min(1,openingClock/6.2);pose=viewPose('entry',entryProgress);
        if(entryProgress===1){view='atrium';automatic=false;pose=viewPose('atrium');syncUI();}}
    }
    if(transition){transition.time+=dt;const t=Math.min(1,transition.time/(transition.via?1.5:.95));
      pose=transition.via?(t<.5?mixPose(transition.from,transition.via,smooth(t*2)):mixPose(transition.via,transition.to,smooth((t-.5)*2))):mixPose(transition.from,transition.to,smooth(t));if(t===1)transition=null;}
    draw();if(canRun())raf=requestAnimationFrame(tick);
  }
  function stop(){cancelAnimationFrame(raf);raf=0;}
  function reconcile(){if(canRun())schedule();else stop();}
  function resize(){if(disposed)return;const rect=stage.getBoundingClientRect();aspect=Math.max(.1,rect.width/Math.max(1,rect.height));camera.aspect=aspect;
    renderer.setPixelRatio(Math.min(devicePixelRatio||1,rect.width<760?1.5:2));renderer.setSize(rect.width,rect.height,false);
    pose=viewPose(view,view==='entry'?entryProgress:1);transition=null;draw();}
  const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2();
  function hit(event){const rect=canvas.getBoundingClientRect();pointer.set((event.clientX-rect.left)/rect.width*2-1,-(event.clientY-rect.top)/rect.height*2+1);raycaster.setFromCamera(pointer,camera);return raycaster.intersectObjects(rooms.hitTargets,false)[0]?.object.userData.path;}
  on(canvas,'pointerdown',e=>{previousPointer={x:e.clientX,y:e.clientY,id:e.pointerId};});
  on(canvas,'pointerup',e=>{const start=previousPointer;previousPointer=null;if(!start||start.id!==e.pointerId||Math.hypot(e.clientX-start.x,e.clientY-start.y)>10||['exterior','entry'].includes(view))return;const path=hit(e);if(path)select(path);});
  on(canvas,'pointercancel',()=>{previousPointer=null;});
  on(canvas,'pointermove',e=>{if(e.pointerType==='mouse')canvas.style.cursor=!['exterior','entry'].includes(view)&&hit(e)?'pointer':'default';});
  on(enter,'click',()=>select(view==='entry'?'atrium':'entry',view==='entry'));
  on(outside,'click',()=>select('exterior',true));
  on(pause,'click',()=>{paused=!paused;syncUI();reconcile();});
  on(host.querySelector('[data-carrier-overview]'),'click',()=>select('atrium'));
  for(const button of choices.querySelectorAll('button'))on(button,'click',()=>select(button.dataset.carrierSelect));
  on(host,'keydown',e=>{if(e.key==='Escape'&&content[view]){select('atrium');choices.querySelector('button').focus();}});
  on(document,'visibilitychange',reconcile);on(window,'blur',()=>{blurred=true;reconcile();});on(window,'focus',()=>{blurred=false;reconcile();});
  on(reduced,'change',()=>{automatic=false;transition=null;view=content[view]?view:'atrium';pose=viewPose(view);syncUI();draw();reconcile();});
  on(canvas,'webglcontextlost',event=>{
    event.preventDefault();const next=content[view]?view:'atrium';contextLost=true;
    // Dispose while the lost context ignores GPU deletes, before Three can
    // rebuild its internal caches against a new context generation.
    dispose();canvas.addEventListener('webglcontextrestored',()=>mountWorld(host)?.select(next,true),{once:true});
  });
  on(window,'pagehide',event=>{if(event.persisted)stop();else dispose();});on(window,'pageshow',()=>reconcile());
  const observer=new IntersectionObserver(entries=>{const entry=entries[0];visible=entry.isIntersecting;reconcile();},{threshold:0});observer.observe(host);
  const menuObserver=new MutationObserver(reconcile);menuObserver.observe(document.body,{attributes:true,attributeFilter:['class']});
  const sizeObserver=new ResizeObserver(resize);sizeObserver.observe(stage);
  function dispose(){if(disposed)return;disposed=true;stop();abort.abort();observer.disconnect();menuObserver.disconnect();sizeObserver.disconnect();rooms.dispose();carrier.dispose?.();env.dispose();interior.shadow.map?.dispose();renderer.dispose();canvas.remove();fallback.hidden=false;controls.hidden=true;choices.hidden=true;enter.hidden=true;detail.hidden=true;stage.dataset.worldReady='fallback';host.dataset.carrierView='exterior';mounted.delete(host);if(window.AiforeuInnenwelt===api)delete window.AiforeuInnenwelt;}
  const api={select,dispose,get view(){return view;},get time(){return elapsed;},get pose(){return structuredClone(pose);},get running(){return !!raf;},get stats(){return {...renderer.info.render};},sampleEntry(progress){automatic=false;transition=null;view='entry';entryProgress=Math.max(0,Math.min(1,progress));pose=viewPose('entry',entryProgress);syncUI();draw();}};
  mounted.set(host,api);window.AiforeuInnenwelt=api;
  stage.append(canvas);pose=viewPose(view);resize();if(!disposed){syncUI();fallback.hidden=true;stage.dataset.worldReady='true';draw();schedule();}
  return api;
}
