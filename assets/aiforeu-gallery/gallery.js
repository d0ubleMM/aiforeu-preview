import * as THREE from '../agentario-scene/vendor/three.module.min.js';
import { createExhibits } from './exhibits.js?v=bomber-1';
import { AREAS, clamp, ease, sampleGallery } from './journey.js';
import { INTRO, landingProgress, sampleBomberIntro } from './bomber-intro.js?v=brand-3';
import { createBomberSkin } from '../aiforeu-bomber-sharp/skin.js';
import { sampleFilm } from './film-timeline.js';
import { createRearHangar } from './rear-hangar.js';

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

export function mountWorld(host,{selected='voice',capture=false}={}){
  if(mounted.has(host))return mounted.get(host);
  const stage=host.querySelector('[data-world-stage]'),frame=host.querySelector('.world-experience'),canvas=document.createElement('canvas');
  const fallback=host.querySelector('[data-world-fallback]'),copy=host.querySelector('[data-gallery-copy]'),nav=host.querySelector('[data-gallery-nav]');
  const previous=host.querySelector('[data-gallery-previous]'),next=host.querySelector('[data-gallery-next]'),credit=host.querySelector('[data-gallery-credit]');
  const wordmark=host.querySelector('[data-gallery-wordmark]');
  let resolveReady;const whenReady=new Promise(resolve=>{resolveReady=resolve;});
  const reduced=matchMedia('(prefers-reduced-motion: reduce)'),abort=new AbortController();
  const on=(target,event,fn,options={})=>target?.addEventListener(event,fn,{...options,signal:abort.signal});
  let renderer,exhibits,env,disposed=false,raf=0,visible=true,lost=false,ready=false,progress=landingProgress(selected)||0,view=selected,pose=null,filmSample=null,transition=null;
  let bomber=null,bomberState=capture?'loading':'video',bomberBounds=null,bomberMaterials=[],oldFloors=[];
  try{
    renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'});
    renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;
    renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
    env=environment(renderer);exhibits=createExhibits();
  }catch{exhibits?.dispose();env?.dispose();renderer?.dispose();host.setAttribute('data-gallery-static','');return null;}
  const scene=new THREE.Scene();scene.background=new THREE.Color('#0c0e11');scene.fog=new THREE.Fog('#0c0e11',21,65);scene.environment=env.texture;scene.environmentIntensity=.65;scene.add(exhibits.root);
  const hangar=capture?createRearHangar():null;if(hangar)scene.add(hangar.root);
  const shutter=capture?document.createElement('div'):null;if(shutter){shutter.style.cssText='position:absolute;inset:0;background:#08090b;pointer-events:none;z-index:8;opacity:0';frame.append(shutter);}
  const fog=scene.fog,camera=new THREE.PerspectiveCamera(35,1,.08,1200);
  const ambient=new THREE.HemisphereLight('#ffffff','#46484e',1.15);scene.add(ambient);
  const key=new THREE.DirectionalLight('#ffffff',3.1);key.castShadow=true;key.shadow.mapSize.set(2048,2048);Object.assign(key.shadow.camera,{left:-7,right:7,top:7,bottom:-7,near:.1,far:28});key.shadow.bias=-.0002;key.shadow.normalBias=.015;scene.add(key,key.target);
  const rim=new THREE.DirectionalLight('#e7edff',1.1);scene.add(rim,rim.target);
  function sync(sample){
    const changed=view!==sample.view||!host.dataset.galleryView;view=sample.view;host.dataset.galleryView=view;
    const intro=!content[view];copy.hidden=intro;
    if(intro){previous.hidden=true;next.firstChild.textContent='Voice →';credit.hidden=true;return;}
    copy.style.opacity=String(sample.opacity);const index=AREAS.indexOf(view),c=content[view];
    if(changed){
      host.querySelector('[data-gallery-title]').textContent=c.title;host.querySelector('[data-gallery-description]').textContent=c.copy;
      const link=host.querySelector('[data-gallery-link]');link.href=c.href;link.firstChild.textContent=c.action+' ';
      host.querySelector('[data-gallery-family]').textContent=view==='traffic'?'EU-gefördert':'Agentario';
      previous.hidden=false;previous.firstChild.textContent=index>0?'← '+content[AREAS[index-1]].title:'↺ Intro';
      next.firstChild.textContent=index<3?content[AREAS[index+1]].title+' →':'Weiter →';
      credit.hidden=view!=='traffic';
      if(previous.hidden&&document.activeElement===previous)next.focus({preventScroll:true});
    }
  }
  function draw(){
    if(disposed||lost)return;
    if(filmSample){filmSample=sampleFilm(filmSample.time,{aspect:camera.aspect,exteriorBounds:bomberBounds});progress=filmSample.progress;}
    const galleryProgress=clamp((progress-INTRO.galleryStart)/(1-INTRO.galleryStart));
    const inIntro=progress<INTRO.galleryStart;
    let opening=sampleBomberIntro(progress,{aspect:camera.aspect,exteriorBounds:bomberBounds});
    if(filmSample?.camera)opening={pose:filmSample.camera,blend:filmSample.galleryBlend,brand:0,lockup:0,view:'bomber'};
    const sample=sampleGallery(galleryProgress);if(reduced.matches&&!capture&&!inIntro){sample.index=AREAS.indexOf(view);sample.centre=sample.index*22;sample.view=view;sample.opacity=1;sample.inspection=.65;}
    sync(inIntro?{...sample,view:opening.view}:sample);exhibits.update(sample,!capture&&reduced.matches);
    const angle=.50+Math.sin(galleryProgress*Math.PI*2)*.12,direction=new THREE.Vector3(Math.sin(angle),.35+ease((galleryProgress-.68)/.12)*.42,Math.cos(angle)).normalize();
    const target=new THREE.Vector3(sample.centre,1.58,0),right=new THREE.Vector3().crossVectors(new THREE.Vector3(0,1,0),direction).normalize(),up=new THREE.Vector3().crossVectors(direction,right).normalize();
    const rect=stage.getBoundingClientRect(),portrait=rect.width<=760&&rect.height>500;
    const captureScale=capture&&portrait?rect.width/390:1;
    const availableWidth=portrait?.96:.69,availableHeight=portrait?(rect.height-260*captureScale)/rect.height:.94;
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
    const room=filmSample?filmSample.room:(inIntro?ease((progress-INTRO.entryStart-.008)/.035):1);
    const brand=filmSample?filmSample.brand:(inIntro?opening.brand:0),lockup=inIntro&&!filmSample?opening.lockup:0;
    if(wordmark){wordmark.hidden=brand<=0;wordmark.style.opacity=String(brand);wordmark.style.transform=`translate(-50%,calc(-50% + ${(1-brand)*24}px))`;}
    if(capture)host.toggleAttribute('data-brand-intro',brand>.01);
    if(inIntro){
      camera.position.lerpVectors(new THREE.Vector3(...opening.pose.position),camera.position,blend);target.lerpVectors(new THREE.Vector3(...opening.pose.target),target,blend);
      camera.position.sub(target).multiplyScalar(filmSample?.framing??(1+(portrait?.08:1.1)*lockup)).add(target);
      camera.fov=THREE.MathUtils.lerp(opening.pose.fov,35,blend);
      key.position.lerpVectors(new THREE.Vector3(-25,42,28),key.position,room);key.target.position.lerpVectors(new THREE.Vector3(),key.target.position,room);
      rim.position.lerpVectors(new THREE.Vector3(30,18,-22),rim.position,room);
    }
    camera.setViewOffset(rect.width,rect.height,(portrait?0:-rect.width*.145*blend)+rect.width*(filmSample?.slide||0),(portrait?-74*blend*captureScale:0)+rect.height*.14*lockup*(filmSample?.lift??1),rect.width,rect.height);camera.lookAt(target);camera.updateProjectionMatrix();camera.updateMatrixWorld();
    const atmosphere=filmSample?filmSample.atmosphere:(inIntro?ease((progress-INTRO.entryStart-.012)/.060):1);
    const exteriorFog=filmSample?.rear?Math.max(160,260/camera.aspect):800;
    fog.near=THREE.MathUtils.lerp(exteriorFog,21,atmosphere);fog.far=THREE.MathUtils.lerp(Math.min(1200,exteriorFog*3),65,atmosphere);
    ambient.intensity=THREE.MathUtils.lerp(.75,1.15,room);key.intensity=THREE.MathUtils.lerp(2.8,3.1,room);rim.intensity=THREE.MathUtils.lerp(filmSample?.rear?1.7:.9,1.1,room);renderer.toneMappingExposure=THREE.MathUtils.lerp(1.3,1.05,room);scene.environmentIntensity=.65;
    exhibits.root.visible=filmSample?filmSample.rear>0:(!inIntro||progress>=INTRO.entryStart);
    // The same neutral material and plane run from the cabin to the gallery.
    // The room floor takes over after the camera has crossed the rear ramp.
    const floorOpacity=filmSample?filmSample.floor:(inIntro?ease((progress-INTRO.entryStart-.006)/.025):1);
    exhibits.floor.visible=floorOpacity>0;exhibits.floor.material.opacity=floorOpacity;exhibits.floor.material.transparent=floorOpacity<1;exhibits.floor.material.depthWrite=floorOpacity>=1;
    if(bomber){
      bomber.group.visible=inIntro;bomber.setForm(opening.pose.form);bomber.setOpen(filmSample?0:opening.pose.open);
      bomber.group.rotation.set(...(filmSample?.rotation||[0,0,0]));bomber.group.position.set(...(filmSample?.position||[0,0,0]));oldFloors.forEach(mesh=>{mesh.visible=false;});
      const opacity=filmSample?filmSample.shellOpacity:(inIntro?1-ease((progress-INTRO.entryEnd-.015)/.025):0);
      bomber.group.visible=inIntro&&opacity>0;
      for(const {material,base} of bomberMaterials){
        if(material.name==='Laibung'){material.color.lerp(exhibits.floor.material.color,room);material.metalness*=1-room;material.roughness=THREE.MathUtils.lerp(material.roughness,.74,room);}
        material.opacity=base.opacity*opacity;const transparent=base.transparent||opacity<1;
        if(material.transparent!==transparent){material.transparent=transparent;material.needsUpdate=true;}
        material.depthWrite=base.depthWrite&&opacity>=1;
      }
    }
    hangar?.update(filmSample);if(shutter)shutter.style.opacity=String(filmSample?.shutter||0);
    fallback.hidden=!(inIntro&&!bomber);
    pose={position:camera.position.toArray(),target:target.toArray(),view,centre:sample.centre,inspection:sample.inspection,form:inIntro?opening.pose.form:1,open:filmSample?0:(inIntro?opening.pose.open:1)};
    renderer.render(scene,camera);
  }
  const active=()=>!disposed&&!lost&&visible&&!document.hidden&&!document.body.classList.contains('global-menu-open');
  function schedule(){if(!raf&&active())raf=requestAnimationFrame(now=>{
    raf=0;
    if(transition){
      if(transition.last!==null)transition.elapsed+=Math.min(50,now-transition.last);
      transition.last=now;const t=clamp(transition.elapsed/700);
      progress=THREE.MathUtils.lerp(transition.from,transition.to,ease(t));if(t>=1)transition=null;
    }
    draw();if(transition)schedule();
  });}
  function stop(){if(raf)cancelAnimationFrame(raf);raf=0;if(transition)transition.last=null;}
  function resize(){
    if(disposed)return;
    const rect=stage.getBoundingClientRect();if(!rect.width||!rect.height)return;
    renderer.setPixelRatio(Math.min(devicePixelRatio||1,2));renderer.setSize(rect.width,rect.height,false);camera.aspect=rect.width/rect.height;camera.updateProjectionMatrix();draw();schedule();
  }
  function select(area,{animate=false}={}){
    const p=landingProgress(area);if(p===null||disposed)return;filmSample=null;
    if(animate&&!reduced.matches&&progress>=INTRO.galleryStart&&p>=INTRO.galleryStart){transition={from:progress,to:p,elapsed:0,last:null};schedule();return;}
    transition=null;progress=p;view=area;host.removeAttribute('data-gallery-view');draw();
  }
  on(previous,'click',()=>{const index=AREAS.indexOf(view);if(index<=0)host.dispatchEvent(new CustomEvent('gallery:replay'));else select(AREAS[index-1],{animate:true});});
  on(next,'click',()=>{const index=AREAS.indexOf(view);if(index<3)select(AREAS[index+1],{animate:true});else document.querySelector('#wege')?.scrollIntoView({behavior:'smooth',block:'start'});});
  on(document,'visibilitychange',()=>{stop();schedule();});
  on(reduced,'change',()=>{if(transition){progress=transition.to;transition=null;}resize();});
  on(canvas,'webglcontextlost',event=>{event.preventDefault();lost=true;const selected=view;dispose({preserve:true,keepCanvas:true});canvas.addEventListener('webglcontextrestored',()=>{canvas.remove();mountWorld(host,{selected});},{once:true});});
  on(window,'pagehide',event=>{if(event.persisted)stop();else dispose();});on(window,'pageshow',schedule);
  const observer=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;if(!visible)stop();else schedule();});observer.observe(frame);
  const menuObserver=new MutationObserver(()=>{stop();schedule();});menuObserver.observe(document.body,{attributes:true,attributeFilter:['class']});
  const sizeObserver=new ResizeObserver(resize);sizeObserver.observe(stage);
  function dispose({preserve=false,keepCanvas=false}={}){
    if(disposed)return;disposed=true;resolveReady(false);stop();abort.abort();observer.disconnect();menuObserver.disconnect();sizeObserver.disconnect();exhibits.dispose();bomber?.dispose();hangar?.dispose();shutter?.remove();env.dispose();key.shadow.map?.dispose();renderer.dispose();
    if(keepCanvas)canvas.style.visibility='hidden';else canvas.remove();fallback.hidden=false;nav.hidden=true;stage.dataset.worldReady='fallback';if(!preserve)host.setAttribute('data-gallery-static','');mounted.delete(host);if(window.AiforeuGallery===api)delete window.AiforeuGallery;
  }
  const api={select,dispose,ready:whenReady,setFilmTime(seconds){if(!capture||disposed)return;filmSample=sampleFilm(seconds);progress=filmSample.progress;draw();},get model(){return ready?'ready':'loading';},get bomber(){return bomberState;},get view(){return view;},get progress(){return progress;},get pose(){return structuredClone(pose);},get running(){return !!raf;},get stats(){return {...renderer.info.render};}};
  mounted.set(host,api);window.AiforeuGallery=api;stage.append(canvas);fallback.hidden=true;nav.hidden=false;stage.dataset.worldReady='true';resize();
  const aircraft=capture?createBomberSkin({signal:abort.signal}).then(loaded=>{
    if(disposed){loaded.dispose();return;}
    bomber=loaded;bomberState='ready';bomberBounds={min:loaded.closedBounds.min.toArray(),max:loaded.closedBounds.max.toArray()};
    const materials=new Set();bomber.group.traverse(o=>{if(o.isMesh){o.castShadow=false;o.receiveShadow=false;if(/^(Interior_Floor|Bridge_Floor)/.test(o.name))oldFloors.push(o);[].concat(o.material).forEach(m=>materials.add(m));}});
    bomberMaterials=[...materials].map(material=>({material,base:{opacity:material.opacity,transparent:material.transparent,depthWrite:material.depthWrite}}));
    hangar?.attachSkin(bomberMaterials);scene.add(bomber.group);draw();schedule();
  }).catch(()=>{if(!disposed){bomberState='unavailable';draw();schedule();}}):Promise.resolve();
  Promise.all([exhibits.ready,aircraft]).then(()=>{if(!disposed){ready=true;draw();schedule();resolveReady(true);}});
  return api;
}
