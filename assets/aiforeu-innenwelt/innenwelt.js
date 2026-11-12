import * as THREE from '../agentario-scene/vendor/three.module.min.js';
import { FARBEN } from '../aiforeu-flug/basis.js';
import { createCarrier } from './carrier-model.js';
import { createInteriorDistricts } from './interior-districts.js';
import { sampleCarrierView, validExteriorBounds } from './interior-camera.js';
import { sampleLogoReveal } from './logo-reveal.js';
import { CARRIER_SCROLL, sampleScrollJourney, scrollProgress } from './scroll-journey.js';

const mounted = new WeakMap();
const content = {
  traffic: {title:'VerkehrsAI', copy:'KI für Lage- und Signalpläne. VerkehrsOS entsteht als EU-gefördertes Forschungsprojekt.', href:'verkehrsai.html', action:'VerkehrsAI öffnen', secondaryHref:'verkehrsos.html', secondaryAction:'VerkehrsOS'},
  workforce: {title:'Autonomous Workforce', copy:'Agentario verbindet KI-Agenten, Ihre Software und wiederkehrende Abläufe.', href:'agentario/', action:'Agentario öffnen', secondaryHref:'autonomous-workforce.html', secondaryAction:'Bereich ansehen'},
};
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

export function mountWorld(host,{destination:initialDestination='atrium'}={}) {
  if(mounted.has(host))return mounted.get(host);
  const stage=host.querySelector('[data-world-stage]'), fallback=host.querySelector('[data-world-fallback]');
  if(!stage)return null;
  const canvas=document.createElement('canvas');canvas.setAttribute('aria-hidden','true');
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  let renderer,carrier,rooms,env,skin=null,skinLoading=true,exteriorBounds,skinReplaced=[];
  try {
    renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'});
    renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=.95;
    renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
    env=environment(renderer);
    carrier=createCarrier(THREE,{farben:FARBEN,klein:innerWidth<760,umgebung:env.texture});
    rooms=createInteriorDistricts();
  } catch(error) {
    rooms?.dispose();carrier?.dispose?.();env?.dispose();renderer?.dispose();
    host.removeAttribute('data-carrier-scroll');host.setAttribute('data-carrier-static','');stage.dataset.worldReady='fallback';return null;
  }
  const scene=new THREE.Scene();scene.background=new THREE.Color('#080e17');scene.environment=env.texture;scene.environmentIntensity=.45;
  const camera=new THREE.PerspectiveCamera(55,1,.08,1200);
  scene.add(carrier.group,rooms.group);
  const ambient=new THREE.HemisphereLight('#e6eaf0','#454b50',.48);scene.add(ambient);
  const sun=new THREE.DirectionalLight('#fff3e5',1.8);sun.position.set(-25,42,28);scene.add(sun);
  const rim=new THREE.DirectionalLight('#dae5f3',.45);rim.position.set(30,18,-22);scene.add(rim);
  const interior=new THREE.DirectionalLight('#fff8f0',2.0);interior.position.set(-1,7,5);interior.target.position.set(0,0,-2);
  interior.castShadow=true;interior.shadow.mapSize.set(1536,1536);Object.assign(interior.shadow.camera,{left:-15,right:15,top:14,bottom:-14,near:.2,far:35});
  interior.shadow.bias=-.00025;interior.shadow.normalBias=.025;scene.add(interior,interior.target);
  const fill=new THREE.PointLight('#e8edf2',12,36,2);fill.position.set(0,5.8,-4);scene.add(fill);
  // The open aperture admits direct light while fixed ribs keep the room readable.
  const frame=host.querySelector('.world-experience');
  const controls=host.querySelector('[data-carrier-ui]'), choices=host.querySelector('[data-carrier-choices]');
  const enter=host.querySelector('[data-carrier-enter]'), outside=host.querySelector('[data-carrier-outside]');
  const detail=host.querySelector('[data-world-detail]');
  const abort=new AbortController(),on=(element,event,handler,options={})=>element?.addEventListener(event,handler,{...options,signal:abort.signal});
  let aspect=1,view=reduced.matches?'atrium':'logo',destination=content[initialDestination]?initialDestination:'atrium';
  let pose,progress=0,elapsed=0,raf=0,visible=true,blurred=false,contextLost=false,disposed=false,staticView=null;
  let previousPointer=null,selectionAnchor=null,readingAnchor=null;
  const viewPose=(name,p=1)=>name==='logo'?sampleLogoReveal(p,{aspect,exteriorBounds}):sampleCarrierView(name,p,{aspect,exteriorBounds,districts:rooms.districts});
  host.toggleAttribute('data-carrier-scroll',!reduced.matches);host.toggleAttribute('data-carrier-static',reduced.matches);
  function scrollRange() {
    const top=parseFloat(getComputedStyle(host).getPropertyValue('--global-header-height'))||73;
    return {start:scrollY+host.getBoundingClientRect().top-top,distance:Math.max(0,host.offsetHeight-frame.offsetHeight)};
  }
  function syncUI() {
    const focused=document.activeElement;
    host.dataset.carrierView=view;
    controls.hidden=false;enter.hidden=!['logo','exterior','entry'].includes(view);choices.hidden=false;
    enter.firstChild.textContent='Direkt hinein ';
    outside.hidden=['logo','entry'].includes(view);
    outside.textContent=view==='exterior'?(reduced.matches?'Übersicht':'Zum Anfang'):'Außenansicht';
    for(const button of choices.querySelectorAll('button'))button.setAttribute('aria-pressed',String(button.dataset.carrierSelect===view));
    detail.hidden=!content[view];
    if(content[view]){const c=content[view];detail.querySelector('[data-world-title]').textContent=c.title;detail.querySelector('[data-world-copy]').textContent=c.copy;
      const link=detail.querySelector('[data-world-link]');link.href=c.href;link.innerHTML=`${c.action} <span aria-hidden="true">↗</span>`;
      const secondary=detail.querySelector('[data-world-secondary]');secondary.href=c.secondaryHref;secondary.innerHTML=`${c.secondaryAction} <span aria-hidden="true">↗</span>`;}
    if(host.contains(focused)&&focused.closest('[hidden]')) choices.querySelector('button').focus({preventScroll:true});
  }
  function sameSelectionRange(range) {
    return Math.abs(range.start-selectionAnchor.start)<.5&&Math.abs(range.distance-selectionAnchor.distance)<.5;
  }
  function releaseScrolledSelection(range) {
    if(selectionAnchor&&sameSelectionRange(range||scrollRange())&&Math.abs(scrollY-selectionAnchor.y)>.5)selectionAnchor=null;
  }
  function preserveReadingPosition(range) {
    const end=scrollY+host.getBoundingClientRect().bottom;
    // Keep actual content in place when the hero or responsive text above it
    // reflows. Native anchoring may already have done this: apply only the
    // remaining viewport displacement, never the full height delta twice.
    if(readingAnchor?.element.isConnected&&(Math.abs(end-readingAnchor.end)>.5||readingAnchor.width!==innerWidth)){
      const delta=readingAnchor.element.getBoundingClientRect().top-readingAnchor.top;
      if(Math.abs(delta)>.5)window.scrollBy({top:delta,behavior:'instant'});
    }
    if(selectionAnchor||scrollY<=range.start+range.distance+.5){readingAnchor=null;return;}
    const line=(parseFloat(getComputedStyle(host).getPropertyValue('--global-header-height'))||73)+16;
    let closest=null,distance=Infinity;
    // Prefer a nearby readable block, including the direct path navigation.
    // This also preserves later body text when columns stack on rotation.
    for(const element of [host.nextElementSibling,...host.parentElement.querySelectorAll('h2,h3,p,li,blockquote')]){
      if(!element||host.contains(element)||!(host.compareDocumentPosition(element)&Node.DOCUMENT_POSITION_FOLLOWING))continue;
      const rect=element.getBoundingClientRect(),offset=Math.abs(rect.top-line);
      if(rect.width&&rect.height&&rect.bottom>line&&rect.top<innerHeight&&offset<distance){closest=element;distance=offset;}
    }
    readingAnchor=closest?{element:closest,top:closest.getBoundingClientRect().top,end,width:innerWidth}:null;
  }
  function readScroll() {
    const range=scrollRange();
    releaseScrolledSelection(range);
    if(selectionAnchor&&!reduced.matches){
      // A resize changes the native scroll distance. Keep a deliberately chosen
      // room at its normalized position, even if the scroll event arrives first.
      // Compare the actual range: mobile browser chrome can change innerHeight
      // during a normal swipe without changing the stable-viewport CSS height.
      if(!sameSelectionRange(range)){
        window.scrollTo({top:Math.ceil(range.start+range.distance*selectionAnchor.progress),behavior:'instant'});
        selectionAnchor={...selectionAnchor,...range,y:scrollY};
      }
    }
    preserveReadingPosition(range);
    const sample=sampleScrollJourney(scrollProgress(scrollY,range.start,range.distance),{aspect,exteriorBounds,destination,reducedMotion:reduced.matches});
    progress=sample.progress;elapsed=sample.time;
    // Reduced motion permits a deliberate static exterior choice, without travel.
    if(reduced.matches&&staticView){sample.view=staticView;sample.pose=viewPose(staticView);}
    // A failed skin still leaves the procedural exterior and native paths usable.
    if(!skinLoading&&!skin&&sample.view==='logo'){sample.view='exterior';sample.pose=viewPose('exterior');}
    const changed=view!==sample.view;view=sample.view;pose=sample.pose;
    if(changed)syncUI();
  }
  function seek(nextProgress) {
    if(disposed)return;
    readingAnchor=null;
    if(!reduced.matches){const range=scrollRange();window.scrollTo({top:Math.ceil(range.start+range.distance*Math.max(0,Math.min(1,nextProgress))),behavior:'instant'});}
    readScroll();syncUI();draw();
  }
  function select(next) {
    if(disposed||!['logo','exterior','entry','atrium','traffic','workforce'].includes(next))return;
    selectionAnchor=null;readingAnchor=null;
    if(reduced.matches){staticView=next==='exterior'?'exterior':null;destination=content[next]?next:'atrium';readScroll();syncUI();draw();return;}
    staticView=null;
    if(next==='logo'){seek(0);return;}
    if(next==='exterior'){seek(CARRIER_SCROLL.exterior);return;}
    destination=content[next]?next:'atrium';
    seek(Math.max(progress,CARRIER_SCROLL.inside));
    selectionAnchor={progress,y:scrollY,...scrollRange()};
  }
  function setPose(p) {
    camera.position.set(...p.position);camera.lookAt(...p.target);camera.fov=p.fov;camera.updateProjectionMatrix();camera.updateMatrixWorld();carrier.update(p.open,elapsed);
    const revealing=view==='logo';carrier.group.visible=!revealing;rooms.group.visible=!revealing;
    // Cabin fixtures illuminate the opened interior, not the closed aircraft skin.
    interior.intensity=2*p.open;fill.intensity=12*p.open;
    if(skin){for(const object of skinReplaced)object.visible=false;skin.setForm(revealing?p.form:1);skin.setOpen(p.open);skin.update?.(elapsed);}
    fallback.hidden=!(revealing&&!skin);
  }
  function draw() {
    if(disposed||contextLost)return;
    try{setPose(pose);rooms.update(elapsed,{selected:content[view]?view:'overview',reducedMotion:reduced.matches});renderer.render(scene,camera);}catch{dispose();}
  }
  function canRender(){return !disposed&&!contextLost&&visible&&!document.hidden&&!blurred&&!document.body.classList.contains('global-menu-open');}
  // One frame per input or resource change. No clock advances the journey.
  function schedule(){if(canRender()&&!raf)raf=requestAnimationFrame(()=>{raf=0;if(canRender()){readScroll();draw();}});}
  function stop(){cancelAnimationFrame(raf);raf=0;}
  function reconcile(){if(canRender())schedule();else stop();}
  function resize(){if(disposed)return;const rect=stage.getBoundingClientRect();aspect=Math.max(.1,rect.width/Math.max(1,rect.height));camera.aspect=aspect;
    renderer.setPixelRatio(Math.min(devicePixelRatio||1,rect.width<760?1.5:2));renderer.setSize(rect.width,rect.height,false);
    readScroll();draw();}
  const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2();
  function hit(event){const rect=canvas.getBoundingClientRect();pointer.set((event.clientX-rect.left)/rect.width*2-1,-(event.clientY-rect.top)/rect.height*2+1);raycaster.setFromCamera(pointer,camera);return raycaster.intersectObjects(rooms.hitTargets,false)[0]?.object.userData.path;}
  on(canvas,'pointerdown',e=>{previousPointer={x:e.clientX,y:e.clientY,id:e.pointerId};});
  on(canvas,'pointerup',e=>{const start=previousPointer;previousPointer=null;if(!start||start.id!==e.pointerId||Math.hypot(e.clientX-start.x,e.clientY-start.y)>10||['logo','exterior','entry'].includes(view))return;const path=hit(e);if(path)select(path);});
  on(canvas,'pointercancel',()=>{previousPointer=null;});
  on(canvas,'pointermove',e=>{if(e.pointerType==='mouse')canvas.style.cursor=!['logo','exterior','entry'].includes(view)&&hit(e)?'pointer':'default';});
  on(enter,'click',()=>select('atrium'));
  on(outside,'click',()=>select(view==='exterior'?(reduced.matches?'atrium':'logo'):'exterior'));
  for(const button of choices.querySelectorAll('button'))on(button,'click',()=>select(button.dataset.carrierSelect));
  on(host.querySelector('.carrier-scroll'),'click',event=>{
    const target=document.querySelector('#wege');if(!target)return;
    event.preventDefault();selectionAnchor=null;target.scrollIntoView({behavior:'instant',block:'start'});preserveReadingPosition(scrollRange());
  });
  on(host,'keydown',e=>{if(e.key==='Escape'&&content[view]){e.preventDefault();select('atrium');choices.querySelector('[data-carrier-select="atrium"]').focus({preventScroll:true});}});
  // Clear a moved selection even after the scene leaves the viewport and stops
  // rendering, so a later resize never pulls readers back from the page below.
  on(window,'scroll',()=>{const range=scrollRange();releaseScrolledSelection(range);preserveReadingPosition(range);schedule();},{passive:true});
  on(document,'visibilitychange',reconcile);on(window,'blur',()=>{blurred=true;reconcile();});on(window,'focus',()=>{blurred=false;reconcile();});
  on(reduced,'change',()=>{
    const range=scrollRange(),rect=host.getBoundingClientRect(),inside=rect.top<=innerHeight&&rect.bottom>0;
    staticView=null;selectionAnchor=null;host.toggleAttribute('data-carrier-scroll',!reduced.matches);host.toggleAttribute('data-carrier-static',reduced.matches);
    if(inside){const updated=scrollRange();window.scrollTo({top:Math.ceil(reduced.matches?range.start:updated.start+updated.distance*CARRIER_SCROLL.inside),behavior:'instant'});}
    resize();syncUI();reconcile();
  });
  on(canvas,'webglcontextlost',event=>{
    event.preventDefault();const selected=destination;contextLost=true;
    // Dispose while the lost context ignores GPU deletes, before Three can
    // rebuild its internal caches against a new context generation.
    dispose({preserveScrollSpace:true,keepCanvas:true});
    canvas.addEventListener('webglcontextrestored',()=>{canvas.remove();mountWorld(host,{destination:selected});},{once:true});
  });
  on(window,'pagehide',event=>{if(event.persisted)stop();else dispose();});on(window,'pageshow',()=>reconcile());
  const observer=new IntersectionObserver(entries=>{const entry=entries[0];visible=entry.isIntersecting;reconcile();},{threshold:0});observer.observe(stage);
  const menuObserver=new MutationObserver(reconcile);menuObserver.observe(document.body,{attributes:true,attributeFilter:['class']});
  const sizeObserver=new ResizeObserver(resize);sizeObserver.observe(stage);
  function dispose({preserveScrollSpace=false,keepCanvas=false}={}){if(disposed)return;disposed=true;stop();abort.abort();observer.disconnect();menuObserver.disconnect();sizeObserver.disconnect();rooms.dispose();skin?.dispose();carrier.dispose?.();env.dispose();interior.shadow.map?.dispose();renderer.dispose();if(keepCanvas)canvas.style.visibility='hidden';else canvas.remove();fallback.hidden=false;controls.hidden=true;choices.hidden=true;enter.hidden=true;detail.hidden=true;if(!preserveScrollSpace){host.removeAttribute('data-carrier-scroll');host.setAttribute('data-carrier-static','');}stage.dataset.worldReady='fallback';host.dataset.carrierView='exterior';mounted.delete(host);if(window.AiforeuInnenwelt===api)delete window.AiforeuInnenwelt;}
  const api={select,dispose,get model(){return skin?'ready':skinLoading?'loading':'fallback';},get modelBounds(){return exteriorBounds?structuredClone(exteriorBounds):null;},get view(){return view;},get time(){return elapsed;},get pose(){return structuredClone(pose);},get running(){return !!raf;},get scroll(){return {progress,...scrollRange()};},get stats(){return {...renderer.info.render};},sampleLogo(p){seek(Math.max(0,Math.min(1,p))*CARRIER_SCROLL.logoEnd);},sampleEntry(p){destination='atrium';seek(CARRIER_SCROLL.entryStart+Math.max(0,Math.min(1,p))*(CARRIER_SCROLL.inside-CARRIER_SCROLL.entryStart));}};
  mounted.set(host,api);window.AiforeuInnenwelt=api;
  stage.append(canvas);resize();if(!disposed){syncUI();stage.dataset.worldReady='true';draw();schedule();}
  // A stationary scroll position still needs one frame when materials arrive.
  rooms.ready?.then(()=>{if(!disposed&&!contextLost)draw();});
  // Model loading cannot hold navigation hostage or resurrect a disposed scene.
  import('./bomber-haut.js').then(module=>module.createBomberSkin(THREE)).then(loaded=>{
    if(disposed){loaded.dispose();return;}
    try {
      loaded.setForm(1);loaded.setOpen(0);loaded.group.updateMatrixWorld(true);
      const bounds=new THREE.Box3().setFromObject(loaded.group,true);
      const measured={min:bounds.min.toArray(),max:bounds.max.toArray()};
      if(!validExteriorBounds(measured))throw new Error('Invalid aircraft bounds');
      exteriorBounds=measured;
    } catch(error){loaded.dispose();throw error;}
    skin=loaded;skinLoading=false;scene.add(skin.group);
    skinReplaced=[carrier.exterior,...(skin.replaces?.groups||[]).map(key=>carrier[key]),...(skin.replaces?.meshes||[]).map(name=>carrier.group.getObjectByName(name))].filter(Boolean);
    // Re-sample the current scroll, including if the user scrolled while loading.
    readScroll();syncUI();draw();schedule();
  }).catch(()=>{
    if(disposed)return;skinLoading=false;
    readScroll();syncUI();draw();schedule();
  });
  return api;
}
