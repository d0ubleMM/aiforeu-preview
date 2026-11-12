import * as THREE from '../agentario-scene/vendor/three.module.min.js';
import { createExhibits } from './exhibits.js?v=bomber-1';
import { AREAS, clamp, ease, sampleGallery } from './journey.js';
import { INTRO, landingProgress, sampleBomberIntro } from './bomber-intro.js?v=brand-3';
import { createBomberSkin } from '../aiforeu-bomber-sharp/skin.js';

const mounted=new WeakMap();
const content={
  voice:{title:'Voice',copy:'Agentario nimmt Anrufe an und führt die nächsten Schritte aus.',href:'agentario/voice/',action:'Voice entdecken'},
  desktop:{title:'Desktop',copy:'Agentario arbeitet direkt in Ihrer Software.',href:'agentario/desktop/',action:'Desktop entdecken'},
  workflows:{title:'Workflows',copy:'Agentario verbindet Ihre Programme zu einem gemeinsamen Ablauf.',href:'agentario/workflows/',action:'Workflows entdecken'},
  traffic:{title:'VerkehrsAI',copy:'Lage- und Signalpläne digital erschließen. Mit VerkehrsOS als EU-gefördertem Forschungsprojekt.',href:'verkehrsai.html',action:'VerkehrsAI entdecken'},
};

function environment(renderer){
  const scene=new THREE.Scene();scene.background=new THREE.Color('#6a6c70');
  for(const [pos,size,intensity] of [[[-9,10,4],[8,8,.2],5],[[9,6,1],[6,9,.2],3],[[0,14,-4],[12,.2,8],4]]){
    const o=new THREE.Mesh(new THREE.BoxGeometry(...size),new THREE.MeshBasicMaterial({color:new THREE.Color('#ffffff').multiplyScalar(intensity)}));o.position.set(...pos);o.lookAt(0,2,0);scene.add(o);
  }
  const generator=new THREE.PMREMGenerator(renderer),env=generator.fromScene(scene,.06);generator.dispose();scene.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});return env;
}

export function mountWorld(host,{selected='logo'}={}){
  if(mounted.has(host))return mounted.get(host);
  const stage=host.querySelector('[data-world-stage]'),frame=host.querySelector('.world-experience'),canvas=document.createElement('canvas');
  const fallback=host.querySelector('[data-world-fallback]'),copy=host.querySelector('[data-gallery-copy]'),nav=host.querySelector('[data-gallery-nav]');
  const previous=host.querySelector('[data-gallery-previous]'),next=host.querySelector('[data-gallery-next]'),credit=host.querySelector('[data-gallery-credit]');
  const wordmark=host.querySelector('[data-gallery-wordmark]');
  const reduced=matchMedia('(prefers-reduced-motion: reduce)'),abort=new AbortController();
  const on=(target,event,fn,options={})=>target?.addEventListener(event,fn,{...options,signal:abort.signal});
  if(reduced.matches&&selected==='logo')selected='bomber';
  let renderer,exhibits,env,disposed=false,raf=0,visible=true,lost=false,ready=false,progress=landingProgress(selected)||0,view=selected,pose=null,lastRange=null,reading=null;
  let bomber=null,bomberState='loading',bomberBounds=null,bomberMaterials=[],oldFloors=[];
  let motionPreference=reduced.matches;
  try{
    renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'});
    renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;
    renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
    env=environment(renderer);exhibits=createExhibits();
  }catch{exhibits?.dispose();env?.dispose();renderer?.dispose();host.setAttribute('data-gallery-static','');return null;}
  const scene=new THREE.Scene();scene.background=new THREE.Color('#0c0e11');scene.fog=new THREE.Fog('#0c0e11',21,65);scene.environment=env.texture;scene.environmentIntensity=.65;scene.add(exhibits.root);
  const fog=scene.fog,camera=new THREE.PerspectiveCamera(35,1,.08,1200);
  const ambient=new THREE.HemisphereLight('#ffffff','#46484e',1.15);scene.add(ambient);
  const key=new THREE.DirectionalLight('#ffffff',3.1);key.castShadow=true;key.shadow.mapSize.set(2048,2048);Object.assign(key.shadow.camera,{left:-7,right:7,top:7,bottom:-7,near:.1,far:28});key.shadow.bias=-.0002;key.shadow.normalBias=.015;scene.add(key,key.target);
  const rim=new THREE.DirectionalLight('#e7edff',1.1);scene.add(rim,rim.target);
  host.toggleAttribute('data-gallery-static',reduced.matches);
  function range(){const top=parseFloat(getComputedStyle(host).getPropertyValue('--global-header-height'))||73;return {start:scrollY+host.getBoundingClientRect().top-top,distance:Math.max(0,host.offsetHeight-frame.offsetHeight)};}
  function captureReading(r){
    const end=scrollY+host.getBoundingClientRect().bottom;
    if(reading?.element.isConnected&&(Math.abs(end-reading.end)>.5||reading.width!==innerWidth)){
      const delta=reading.element.getBoundingClientRect().top-reading.top;if(Math.abs(delta)>.5)scrollBy({top:delta,behavior:'instant'});
    }
    if(scrollY<=r.start+r.distance+.5){reading=null;return;}
    const line=(parseFloat(getComputedStyle(host).getPropertyValue('--global-header-height'))||73)+16;
    let found=null,distance=Infinity;
    for(const el of [host.nextElementSibling,...host.parentElement.querySelectorAll('h2,h3,p')]){
      if(!el||host.contains(el)||!(host.compareDocumentPosition(el)&Node.DOCUMENT_POSITION_FOLLOWING))continue;
      const rect=el.getBoundingClientRect(),d=Math.abs(rect.top-line);
      if(rect.width&&rect.height&&rect.bottom>line&&rect.top<innerHeight&&d<distance){found=el;distance=d;}
    }
    reading=found?{element:found,top:found.getBoundingClientRect().top,end,width:innerWidth}:null;
  }
  function sync(sample){
    const changed=view!==sample.view||!host.dataset.galleryView;view=sample.view;host.dataset.galleryView=view;
    const intro=!content[view];copy.hidden=intro;
    if(intro){previous.hidden=true;next.firstChild.textContent='Voice →';credit.hidden=true;return;}
    copy.style.opacity=String(sample.opacity);const index=AREAS.indexOf(view),c=content[view];
    if(changed){
      host.querySelector('[data-gallery-title]').textContent=c.title;host.querySelector('[data-gallery-description]').textContent=c.copy;
      const link=host.querySelector('[data-gallery-link]');link.href=c.href;link.firstChild.textContent=c.action+' ';
      host.querySelector('[data-gallery-family]').textContent=view==='traffic'?'EU-gefördert':'Agentario';
      previous.hidden=false;previous.firstChild.textContent=index>0?'← '+content[AREAS[index-1]].title:'← Bomber';
      next.firstChild.textContent=index<3?content[AREAS[index+1]].title+' →':'Weiter →';
      credit.hidden=view!=='traffic';
      if(previous.hidden&&document.activeElement===previous)next.focus({preventScroll:true});
    }
  }
  function draw(){
    if(disposed||lost||motionPreference!==reduced.matches)return;
    const r=range();captureReading(r);if(!reduced.matches)progress=clamp((scrollY-r.start)/Math.max(1,r.distance));
    const galleryProgress=clamp((progress-INTRO.galleryStart)/(1-INTRO.galleryStart));
    const inIntro=reduced.matches?!content[view]:progress<INTRO.galleryStart;
    const opening=sampleBomberIntro(reduced.matches&&inIntro?landingProgress('bomber'):progress,{aspect:camera.aspect,exteriorBounds:bomberBounds});
    const sample=sampleGallery(galleryProgress);if(reduced.matches&&!inIntro){sample.index=AREAS.indexOf(view);sample.centre=sample.index*22;sample.view=view;sample.opacity=1;sample.inspection=.65;}
    sync(inIntro?{...sample,view:opening.view}:sample);exhibits.update(sample,reduced.matches);
    const angle=.50+Math.sin(galleryProgress*Math.PI*2)*.12,direction=new THREE.Vector3(Math.sin(angle),.35+ease((galleryProgress-.68)/.12)*.42,Math.cos(angle)).normalize();
    const target=new THREE.Vector3(sample.centre,1.58,0),right=new THREE.Vector3().crossVectors(new THREE.Vector3(0,1,0),direction).normalize(),up=new THREE.Vector3().crossVectors(direction,right).normalize();
    const rect=stage.getBoundingClientRect(),portrait=rect.width<=760&&rect.height>500;
    const availableWidth=portrait?.96:.69,availableHeight=portrait?(rect.height-260)/rect.height:.94;
    camera.fov=35;camera.clearViewOffset();camera.updateProjectionMatrix();
    const tan=Math.tan(THREE.MathUtils.degToRad(camera.fov/2));let distance=6;
    // Fit the complete desk and microphone in the actual canvas, including 320px.
    for(const x of [-2.6,2.6])for(const y of [0,3.55])for(const z of [-1.45,1.45]){
      const point=new THREE.Vector3(x,y-1.58,z),depth=point.dot(direction);
      distance=Math.max(distance,depth+Math.abs(point.dot(up))/(tan*availableHeight),depth+Math.abs(point.dot(right))/(tan*camera.aspect*availableWidth));
    }
    distance*=1.06;camera.position.copy(target).addScaledVector(direction,distance);camera.lookAt(target);camera.updateMatrixWorld();
    key.position.set(sample.centre-4.5,8.5,5.5);key.target.position.set(sample.centre,1,0);rim.position.set(sample.centre+4,6,-4);rim.target.position.set(sample.centre,1,0);
    const blend=inIntro?opening.blend:1;
    const room=inIntro?ease((progress-INTRO.entryStart-.008)/.035):1;
    const brand=inIntro?opening.brand:0,lockup=inIntro?opening.lockup:0;
    if(wordmark){wordmark.hidden=brand<=0;wordmark.style.opacity=String(brand);wordmark.style.transform=`translate(-50%,calc(-50% + ${(1-brand)*24}px))`;}
    host.toggleAttribute('data-brand-intro',brand>.01);
    if(inIntro){
      camera.position.lerpVectors(new THREE.Vector3(...opening.pose.position),camera.position,blend);target.lerpVectors(new THREE.Vector3(...opening.pose.target),target,blend);
      camera.position.sub(target).multiplyScalar(1+(portrait?.08:1.1)*lockup).add(target);
      camera.fov=THREE.MathUtils.lerp(opening.pose.fov,35,blend);
      key.position.lerpVectors(new THREE.Vector3(-25,42,28),key.position,room);key.target.position.lerpVectors(new THREE.Vector3(),key.target.position,room);
      rim.position.lerpVectors(new THREE.Vector3(30,18,-22),rim.position,room);
    }
    camera.setViewOffset(rect.width,rect.height,portrait?0:-rect.width*.145*blend,(portrait?-74*blend:0)+rect.height*.14*lockup,rect.width,rect.height);camera.lookAt(target);camera.updateProjectionMatrix();camera.updateMatrixWorld();
    const atmosphere=inIntro?ease((progress-INTRO.entryStart-.012)/.060):1;
    fog.near=THREE.MathUtils.lerp(800,21,atmosphere);fog.far=THREE.MathUtils.lerp(1200,65,atmosphere);
    ambient.intensity=THREE.MathUtils.lerp(.75,1.15,room);key.intensity=THREE.MathUtils.lerp(2.8,3.1,room);rim.intensity=THREE.MathUtils.lerp(.9,1.1,room);renderer.toneMappingExposure=THREE.MathUtils.lerp(1.3,1.05,room);scene.environmentIntensity=.65;
    exhibits.root.visible=!inIntro||progress>=INTRO.entryStart;
    // The same neutral material and plane run from the cabin to the gallery.
    // Introduce it through the roof opening, before the outer shell dissolves.
    const floorOpacity=inIntro?ease((progress-INTRO.entryStart-.006)/.025):1;
    exhibits.floor.visible=floorOpacity>0;exhibits.floor.material.opacity=floorOpacity;exhibits.floor.material.transparent=floorOpacity<1;exhibits.floor.material.depthWrite=floorOpacity>=1;
    if(bomber){
      bomber.group.visible=inIntro;bomber.setForm(opening.pose.form);bomber.setOpen(opening.pose.open);
      oldFloors.forEach(mesh=>{mesh.visible=false;});
      const opacity=inIntro?1-ease((progress-INTRO.entryEnd-.015)/.025):0;
      bomber.group.visible=inIntro&&opacity>0;
      for(const {material,base} of bomberMaterials){
        if(material.name==='Laibung'){material.color.lerp(exhibits.floor.material.color,room);material.metalness*=1-room;material.roughness=THREE.MathUtils.lerp(material.roughness,.74,room);}
        material.opacity=base.opacity*opacity;material.transparent=base.transparent||opacity<1;material.depthWrite=base.depthWrite&&opacity>=1;
      }
    }
    fallback.hidden=!(inIntro&&!bomber);
    pose={position:camera.position.toArray(),target:target.toArray(),view,centre:sample.centre,inspection:sample.inspection,form:inIntro?opening.pose.form:1,open:inIntro?opening.pose.open:1};
    renderer.render(scene,camera);lastRange=r;
  }
  const active=()=>!disposed&&!lost&&visible&&!document.hidden&&!document.body.classList.contains('global-menu-open');
  function schedule(){if(!raf&&active())raf=requestAnimationFrame(()=>{raf=0;draw();});}
  function stop(){if(raf)cancelAnimationFrame(raf);raf=0;}
  function resize(){
    if(disposed||motionPreference!==reduced.matches)return;
    const r=range();captureReading(r);
    if(lastRange&&!reading&&!reduced.matches&&Math.abs(lastRange.distance-r.distance)>.5&&scrollY>=lastRange.start-.5&&scrollY<=lastRange.start+lastRange.distance+.5){scrollTo({top:Math.round(r.start+r.distance*progress),behavior:'instant'});}
    const rect=stage.getBoundingClientRect();if(!rect.width||!rect.height)return;
    renderer.setPixelRatio(Math.min(devicePixelRatio||1,2));renderer.setSize(rect.width,rect.height,false);camera.aspect=rect.width/rect.height;camera.updateProjectionMatrix();draw();schedule();
  }
  function select(area){const p=landingProgress(area);if(p===null||disposed)return;reading=null;view=area;host.removeAttribute('data-gallery-view');progress=p;if(!reduced.matches){const r=range();scrollTo({top:Math.ceil(r.start+r.distance*p),behavior:'instant'});}draw();}
  on(previous,'click',()=>select(AREAS.indexOf(view)<=0?'bomber':AREAS[AREAS.indexOf(view)-1]));
  on(next,'click',()=>{const index=AREAS.indexOf(view);if(index<3)select(AREAS[index+1]);else{document.querySelector('#wege')?.scrollIntoView({behavior:'instant',block:'start'});captureReading(range());}});
  on(window,'scroll',()=>{if(motionPreference!==reduced.matches||document.body.classList.contains('global-menu-open'))return;captureReading(range());schedule();},{passive:true});
  on(document,'visibilitychange',()=>{stop();schedule();});
  on(reduced,'change',()=>{
    // CSS responds to this preference before the event. Use the last rendered
    // range so a collapsed scene is not mistaken for already-read body text.
    const r=lastRange||range(),inside=!reading&&scrollY>=r.start-.5&&scrollY<=r.start+r.distance+.5;
    motionPreference=reduced.matches;host.toggleAttribute('data-gallery-static',reduced.matches);
    if(inside){reading=null;const updated=range();scrollTo({top:Math.ceil(updated.start+(reduced.matches?0:updated.distance*landingProgress(view))),behavior:'instant'});}
    lastRange=null;resize();
  });
  on(canvas,'webglcontextlost',event=>{event.preventDefault();lost=true;const selected=view;dispose({preserve:true,keepCanvas:true});canvas.addEventListener('webglcontextrestored',()=>{canvas.remove();mountWorld(host,{selected});},{once:true});});
  on(window,'pagehide',event=>{if(event.persisted)stop();else dispose();});on(window,'pageshow',schedule);
  const observer=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;if(!visible)stop();else schedule();});observer.observe(frame);
  const menuObserver=new MutationObserver(()=>{stop();schedule();});menuObserver.observe(document.body,{attributes:true,attributeFilter:['class']});
  const sizeObserver=new ResizeObserver(resize);sizeObserver.observe(stage);
  function dispose({preserve=false,keepCanvas=false}={}){
    if(disposed)return;disposed=true;stop();abort.abort();observer.disconnect();menuObserver.disconnect();sizeObserver.disconnect();exhibits.dispose();bomber?.dispose();env.dispose();key.shadow.map?.dispose();renderer.dispose();
    if(keepCanvas)canvas.style.visibility='hidden';else canvas.remove();fallback.hidden=false;nav.hidden=true;stage.dataset.worldReady='fallback';if(!preserve)host.setAttribute('data-gallery-static','');mounted.delete(host);if(window.AiforeuGallery===api)delete window.AiforeuGallery;
  }
  const api={select,dispose,get model(){return ready?'ready':'loading';},get bomber(){return bomberState;},get view(){return view;},get scroll(){return {progress,...range()};},get pose(){return structuredClone(pose);},get running(){return !!raf;},get stats(){return {...renderer.info.render};}};
  mounted.set(host,api);window.AiforeuGallery=api;stage.append(canvas);fallback.hidden=true;nav.hidden=false;stage.dataset.worldReady='true';resize();
  const aircraft=createBomberSkin({signal:abort.signal}).then(loaded=>{
    if(disposed){loaded.dispose();return;}
    bomber=loaded;bomberState='ready';bomberBounds={min:loaded.closedBounds.min.toArray(),max:loaded.closedBounds.max.toArray()};
    const materials=new Set();bomber.group.traverse(o=>{if(o.isMesh){o.castShadow=false;o.receiveShadow=false;if(/^(Interior_Floor|Bridge_Floor)/.test(o.name))oldFloors.push(o);[].concat(o.material).forEach(m=>materials.add(m));}});
    bomberMaterials=[...materials].map(material=>({material,base:{opacity:material.opacity,transparent:material.transparent,depthWrite:material.depthWrite}}));
    scene.add(bomber.group);draw();schedule();
  }).catch(()=>{if(!disposed){bomberState='unavailable';draw();schedule();}});
  Promise.all([exhibits.ready,aircraft]).then(()=>{if(!disposed){ready=true;draw();schedule();}});
  return api;
}
