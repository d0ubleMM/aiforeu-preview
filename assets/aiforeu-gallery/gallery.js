import * as THREE from '../agentario-scene/vendor/three.module.min.js';
import { createExhibits } from './exhibits.js?v=gray-room-1';
import { AREAS, DESK_LAYOUT, clamp, ease, sampleGallery } from './journey.js?v=cabin-1';
import { INTRO, landingProgress } from './bomber-intro.js?v=brand-3';
import { createBomberSkin } from '../aiforeu-bomber-sharp/skin.js';
import { sampleFilm, cabinOverview, FLIGHT } from './film-timeline.js?v=gray-room-1';
import { createRearHangar } from './rear-hangar.js?v=gray-room-1';

const mounted=new WeakMap();
const content={
  overview:{title:'Inside AIFOREU',copy:'Wählen Sie einen der vier Arbeitsplätze.',href:'agentario/',action:'Agentario entdecken'},
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

export function mountWorld(host,{selected='overview',capture=false,plainRoom=false}={}){
  if(mounted.has(host))return mounted.get(host);
  const stage=host.querySelector('[data-world-stage]'),frame=host.querySelector('.world-experience'),canvas=document.createElement('canvas');
  const fallback=host.querySelector('[data-world-fallback]'),copy=host.querySelector('[data-gallery-copy]'),nav=host.querySelector('[data-gallery-nav]');
  const previous=host.querySelector('[data-gallery-previous]'),next=host.querySelector('[data-gallery-next]'),credit=host.querySelector('[data-gallery-credit]');
  const wordmark=host.querySelector('[data-gallery-wordmark]');
  let resolveReady;const whenReady=new Promise(resolve=>{resolveReady=resolve;});
  const reduced=matchMedia('(prefers-reduced-motion: reduce)'),abort=new AbortController();
  const on=(target,event,fn,options={})=>target?.addEventListener(event,fn,{...options,signal:abort.signal});
  let renderer,exhibits,env,disposed=false,raf=0,visible=true,lost=false,ready=false,progress=landingProgress(selected)||INTRO.galleryStart,view=selected,overview=selected==='overview'||capture,pose=null,filmSample=null,transition=null;
  let studioBlend=overview?0:1;
  let dissolve=null,snapshot=null;
  function clearDissolve(){dissolve?.cancel();dissolve=null;snapshot?.remove();snapshot=null;}
  let bomber=null,bomberState=capture?'loading':'video',bomberBounds=null,bomberMaterials=[],oldFloors=[];
  try{
    renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'});
    renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;
    renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
    env=environment(renderer);exhibits=createExhibits();
  }catch{exhibits?.dispose();env?.dispose();renderer?.dispose();host.setAttribute('data-gallery-static','');return null;}
  const scene=new THREE.Scene();scene.background=new THREE.Color('#0c0e11');scene.fog=new THREE.Fog('#0c0e11',21,65);scene.environment=env.texture;scene.environmentIntensity=.65;scene.add(exhibits.root);
  const hangar=createRearHangar();scene.add(hangar.root);
  const shutter=capture?document.createElement('div'):null;if(shutter){shutter.style.cssText='position:absolute;inset:0;background:#08090b;pointer-events:none;z-index:8;opacity:0';frame.append(shutter);}
  const fog=scene.fog,camera=new THREE.PerspectiveCamera(35,1,.08,1200);
  const ambient=new THREE.HemisphereLight('#ffffff','#46484e',1.15);scene.add(ambient);
  const key=new THREE.DirectionalLight('#ffffff',3.1);key.castShadow=true;key.shadow.mapSize.set(2048,2048);Object.assign(key.shadow.camera,{left:-24,right:24,top:24,bottom:-24,near:.1,far:80});key.shadow.bias=-.0002;key.shadow.normalBias=.015;scene.add(key,key.target);
  const rim=new THREE.DirectionalLight('#e7edff',1.1);scene.add(rim,rim.target);
  const apronKey=capture?new THREE.DirectionalLight('#edf0ee',1.6):null;
  const runwayBounce=capture?new THREE.DirectionalLight('#a6b5bf',2.4):null;
  if(runwayBounce)scene.add(runwayBounce,runwayBounce.target);
  if(apronKey){apronKey.position.set(-35,65,-25);apronKey.target.position.set(0,0,-4);apronKey.castShadow=true;apronKey.shadow.mapSize.set(2048,2048);Object.assign(apronKey.shadow.camera,{left:-76,right:76,top:48,bottom:-48,near:1,far:180});apronKey.shadow.bias=-.0002;apronKey.shadow.normalBias=.04;apronKey.shadow.radius=3;scene.add(apronKey,apronKey.target);}
  function sync(sample){
    const changed=view!==sample.view||!host.dataset.galleryView;view=sample.view;host.dataset.galleryView=view;
    const intro=!content[view];copy.hidden=intro;
    if(intro){previous.hidden=true;next.firstChild.textContent='Voice →';credit.hidden=true;return;}
    copy.style.opacity=String(sample.opacity);const index=AREAS.indexOf(view),c=content[view];
    if(changed){
      host.querySelector('[data-gallery-title]').textContent=c.title;host.querySelector('[data-gallery-description]').textContent=c.copy;
      const link=host.querySelector('[data-gallery-link]');link.href=c.href;link.firstChild.textContent=c.action+' ';
      host.querySelector('[data-gallery-family]').textContent=view==='overview'?'AIFOREU':view==='traffic'?'EU-gefördert':'Agentario';
      link.hidden=view==='overview';
      previous.hidden=false;previous.firstChild.textContent=view==='overview'?'↺ Intro':'← Alle Tische';
      next.firstChild.textContent=index<3?content[AREAS[index+1]].title+' →':'Weiter →';
      credit.hidden=false;
      host.querySelectorAll('[data-cabin-select]').forEach(button=>{button.setAttribute('aria-pressed',String(button.dataset.cabinSelect===view));});
      if(previous.hidden&&document.activeElement===previous)next.focus({preventScroll:true});
    }
  }
  function draw(){
    if(disposed||lost)return;
    if(filmSample){filmSample=sampleFilm(filmSample.time,{aspect:camera.aspect});progress=filmSample.progress;}
    const inIntro=!!filmSample&&filmSample.time<FLIGHT.inside;
    const galleryProgress=clamp((progress-INTRO.galleryStart)/(1-INTRO.galleryStart));
    const sample=sampleGallery(galleryProgress);
    if(overview){sample.view='overview';sample.centre=0;sample.inspection=.65;sample.opacity=1;}
    else sample.inspection=transition?ease((transition.elapsed/transition.duration-.35)/.65):1;
    const focusCentre=transition?.leave?THREE.MathUtils.lerp(transition.anchor,0,1-studioBlend):sample.centre;
    sync(inIntro?{...sample,view:'bomber'}:sample);exhibits.update({...sample,centre:focusCentre},!capture&&reduced.matches,studioBlend);
    const settled={rear:1,shellOpacity:1-studioBlend,position:[0,0,0],rotation:[0,0,0],door:1,ramp:1};
    hangar.update(filmSample||settled);
    if(plainRoom)hangar.root.visible=false;
    exhibits.root.visible=!filmSample||filmSample.rear>0;
    exhibits.root.position.set(...(filmSample?.position||[0,0,0]));exhibits.root.rotation.set(...(filmSample?.rotation||[0,0,0]));
    exhibits.floor.visible=plainRoom||studioBlend>0;exhibits.floor.position.y=.025;
    const floorOpacity=plainRoom?1:studioBlend;
    exhibits.floor.material.opacity=floorOpacity;exhibits.floor.material.transparent=floorOpacity<1;exhibits.floor.material.depthWrite=floorOpacity>=1;
    host.dataset.galleryDisplay=overview?'overview':studioBlend>.999?'studio':'transition';
    if(!inIntro){copy.style.opacity=String(sample.opacity*(overview?1-studioBlend:ease((studioBlend-.68)/.32)));credit.hidden=studioBlend>.98&&sample.view!=='traffic';}
    const rect=stage.getBoundingClientRect(),portrait=rect.width<=760&&rect.height>500;
    const captureScale=capture&&portrait?rect.width/390:1;
    let target=new THREE.Vector3(sample.centre,1.58,DESK_LAYOUT.z),offset=[0,0];
    camera.clearViewOffset();
    if(overview){
      const wide=cabinOverview(camera.aspect);camera.position.fromArray(wide.position);target.fromArray(wide.target);camera.fov=wide.fov;
    }else{
      // The original grey exhibit composition, rotated with the rear-facing desks.
      const angle=.50+Math.sin(galleryProgress*Math.PI*2)*.12;
      const direction=new THREE.Vector3(-Math.sin(angle),.35+ease((galleryProgress-.68)/.12)*.42,-Math.cos(angle)).normalize();
      const right=new THREE.Vector3().crossVectors(new THREE.Vector3(0,1,0),direction).normalize(),up=new THREE.Vector3().crossVectors(direction,right).normalize();
      camera.fov=35;const tan=Math.tan(THREE.MathUtils.degToRad(camera.fov/2));
      const availableWidth=portrait?.96:.69,availableHeight=portrait?(rect.height-260*captureScale)/rect.height:.94;
      let distance=6;
      for(const x of [-2.6,2.6])for(const y of [0,3.55])for(const z of [-1.45,1.45]){
        const point=new THREE.Vector3(x,y-1.58,z),depth=point.dot(direction);
        distance=Math.max(distance,depth+Math.abs(point.dot(up))/(tan*availableHeight),depth+Math.abs(point.dot(right))/(tan*camera.aspect*availableWidth));
      }
      camera.position.copy(target).addScaledVector(direction,distance*1.06);
      offset=[portrait?0:-rect.width*.145,portrait?-74*captureScale:0];
    }
    if(filmSample){camera.position.fromArray(filmSample.camera.position);target.fromArray(filmSample.camera.target);camera.fov=filmSample.camera.fov;offset=[0,0];}
    if(transition?.cameraFrom){
      const start=transition.cameraFrom,t=clamp(transition.elapsed/transition.duration),destination={position:camera.position.toArray(),target:target.toArray(),fov:camera.fov,offset};
      const via={position:[transition.anchor-2.1,3.2,-2.8],target:[transition.anchor,1.58,DESK_LAYOUT.z],fov:50,offset:[0,0]};
      let a=start,b=destination,u=ease(t);
      if(transition.enter){if(t<.42){b=via;u=ease(t/.42);}else{a=via;u=ease((t-.42)/.58);}}
      if(transition.leave){if(t<.5){b=via;u=ease(t/.5);}else{a=via;u=ease((t-.5)/.5);}}
      camera.position.lerpVectors(new THREE.Vector3(...a.position),new THREE.Vector3(...b.position),u);target.lerpVectors(new THREE.Vector3(...a.target),new THREE.Vector3(...b.target),u);camera.fov=THREE.MathUtils.lerp(a.fov,b.fov,u);offset=a.offset.map((v,i)=>THREE.MathUtils.lerp(v,b.offset[i],u));
    }
    camera.setViewOffset(rect.width,rect.height,...offset,rect.width,rect.height);camera.lookAt(target);camera.rotateZ(filmSample?.camera.roll||0);camera.updateProjectionMatrix();camera.updateMatrixWorld();
    const room=filmSample?filmSample.room:1,centre=focusCentre;
    key.position.set(centre+THREE.MathUtils.lerp(-4.5,4.5,studioBlend),THREE.MathUtils.lerp(5.8,8.5,studioBlend),DESK_LAYOUT.z-5.5);key.target.position.set(centre,1,DESK_LAYOUT.z);
    rim.position.set(centre+THREE.MathUtils.lerp(4,-4,studioBlend),6,DESK_LAYOUT.z+4);rim.target.position.set(centre,1,DESK_LAYOUT.z);
    const shadowExtent=THREE.MathUtils.lerp(24,7,studioBlend);Object.assign(key.shadow.camera,{left:-shadowExtent,right:shadowExtent,top:shadowExtent,bottom:-shadowExtent,far:THREE.MathUtils.lerp(80,28,studioBlend)});key.shadow.camera.updateProjectionMatrix();
    key.position.lerpVectors(new THREE.Vector3(-25,42,28),key.position,room);key.target.position.lerpVectors(new THREE.Vector3(),key.target.position,room);
    rim.position.lerpVectors(new THREE.Vector3(30,18,-22),rim.position,room);
    const exteriorFog=filmSample?.rear?Math.max(160,260/camera.aspect):800;
    fog.near=THREE.MathUtils.lerp(exteriorFog,THREE.MathUtils.lerp(35,21,studioBlend),room);fog.far=THREE.MathUtils.lerp(Math.min(1200,exteriorFog*3),THREE.MathUtils.lerp(100,65,studioBlend),room);
    ambient.intensity=THREE.MathUtils.lerp(filmSample?.rear ? .38 : .72,1.15,room);key.intensity=THREE.MathUtils.lerp(filmSample?.rear ? .8 : 3.2,3.1,room);rim.intensity=THREE.MathUtils.lerp(filmSample?.rear?2.6:3.2,1.1,room);renderer.toneMappingExposure=THREE.MathUtils.lerp(1.25,1.05,room);scene.environmentIntensity=.65;
    key.castShadow=room>.8;if(apronKey){
      apronKey.intensity=filmSample?.rear?1.6*(1-room):0;
      const p=filmSample?.position||[0,0,0];apronKey.position.set(p[0]-35,65,p[2]-25);apronKey.target.position.set(p[0],0,p[2]);
    }
    if(runwayBounce){const p=filmSample?.position||[0,0,0];runwayBounce.intensity=filmSample?.rear?2.4*(1-room):0;runwayBounce.position.set(p[0]+8,-15,p[2]-10);runwayBounce.target.position.fromArray(p);}
    if(bomber){
      bomber.group.visible=!!filmSample;bomber.setForm(1);bomber.setOpen(0);
      // Cabin lights illuminate the interior independently of the exterior skin.
      bomber.group.traverse(object=>{if(object.isMesh)object.castShadow=room<=.8;});
      bomber.group.rotation.set(...(filmSample?.rotation||[0,0,0]));bomber.group.position.set(...(filmSample?.position||[0,0,0]));oldFloors.forEach(mesh=>{mesh.visible=false;});
      for(const {material,base} of bomberMaterials){
        if(!/Void|Seam|Cockpit|Floor/.test(material.name)){material.metalness=Math.min(.58,material.metalness+.22);material.roughness=Math.max(.38,material.roughness-.13);}
        if(/^(Haut_Oben|Glas|Kante_VK)$/.test(material.name))material.color.multiplyScalar(1.45);
        material.opacity=base.opacity;if(material.transparent!==base.transparent){material.transparent=base.transparent;material.needsUpdate=true;}material.depthWrite=base.depthWrite;
      }
    }
    if(shutter)shutter.style.opacity=String(filmSample?.shutter||0);if(wordmark)wordmark.hidden=true;
    fallback.hidden=true;
    pose={position:camera.position.toArray(),target:target.toArray(),fov:camera.fov,offset,view,centre:sample.centre,inspection:sample.inspection,studioBlend,form:1,open:0};
    renderer.render(scene,camera);
  }
  const active=()=>!disposed&&!lost&&visible&&!document.hidden&&!document.body.classList.contains('global-menu-open');
  function schedule(){if(!raf&&active())raf=requestAnimationFrame(now=>{
    raf=0;
    if(transition){
      if(transition.last!==null)transition.elapsed+=Math.min(50,now-transition.last);
      transition.last=now;const t=clamp(transition.elapsed/transition.duration);
      progress=THREE.MathUtils.lerp(transition.from,transition.to,ease(t));
      const mix=transition.enter?ease((t-.22)/.50):transition.leave?ease((t-.15)/.55):ease(t);
      studioBlend=THREE.MathUtils.lerp(transition.fromStudio,transition.toStudio,mix);if(t>=1)transition=null;
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
    const p=area==='overview'?INTRO.galleryStart:landingProgress(area);if(p===null||disposed)return;
    clearDissolve();
    if(plainRoom&&animate&&!reduced.matches&&pose&&ready){
      // A short dissolve between finished compositions; no extra camera journey.
      draw();const image=document.createElement('canvas');image.width=canvas.width;image.height=canvas.height;image.className='gallery-scene-snapshot';image.setAttribute('aria-hidden','true');image.getContext('2d').drawImage(canvas,0,0);
      select(area);snapshot=image;stage.append(image);
      const animation=image.animate([{opacity:1},{opacity:0}],{duration:320,easing:'ease-in-out',fill:'forwards'});dissolve=animation;
      copy.animate([{opacity:0},{opacity:1}],{duration:260,easing:'ease-out'});
      animation.onfinish=()=>{image.remove();if(dissolve===animation){dissolve=null;snapshot=null;}};
      return;
    }
    const changingOverview=overview!==(area==='overview'),cameraFrom=pose?structuredClone(pose):null;
    const wasOverview=overview,toStudio=area==='overview'?0:1;
    filmSample=null;overview=area==='overview';
    if(animate&&!reduced.matches){transition={from:wasOverview&&!overview?p:progress,to:p,cameraFrom,fromStudio:studioBlend,toStudio,enter:wasOverview&&!overview,leave:!wasOverview&&overview,anchor:overview?(pose?.centre||0):sampleGallery(clamp((p-INTRO.galleryStart)/(1-INTRO.galleryStart))).centre,elapsed:0,last:null,duration:changingOverview?1600:900};schedule();return;}
    transition=null;studioBlend=toStudio;progress=p;view=area;host.removeAttribute('data-gallery-view');draw();
  }
  on(previous,'click',()=>{if(view==='overview')host.dispatchEvent(new CustomEvent('gallery:replay'));else select('overview',{animate:true});});
  on(next,'click',()=>{const index=AREAS.indexOf(view);if(index<3)select(AREAS[index+1],{animate:true});else document.querySelector('#wege')?.scrollIntoView({behavior:'smooth',block:'start'});});
  host.querySelectorAll('[data-cabin-select]').forEach(button=>on(button,'click',()=>select(button.dataset.cabinSelect,{animate:true})));
  const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2();let pressed=null;
  function deskAt(event){
    if(!overview||transition||host.hasAttribute('data-intro-active'))return null;
    const rect=canvas.getBoundingClientRect();pointer.set((event.clientX-rect.left)/rect.width*2-1,-(event.clientY-rect.top)/rect.height*2+1);raycaster.setFromCamera(pointer,camera);
    const hit=raycaster.intersectObjects(exhibits.groups,true)[0];let object=hit?.object;
    while(object&&!AREAS.includes(object.name))object=object.parent;
    return object?.name||null;
  }
  on(canvas,'pointermove',event=>{canvas.style.cursor=deskAt(event)?'pointer':'';});
  on(canvas,'pointerdown',event=>{pressed={x:event.clientX,y:event.clientY};});
  on(canvas,'pointercancel',()=>{pressed=null;});
  on(canvas,'pointerup',event=>{if(pressed&&Math.hypot(event.clientX-pressed.x,event.clientY-pressed.y)<8){const area=deskAt(event);if(area)select(area,{animate:true});}pressed=null;});
  on(document,'visibilitychange',()=>{stop();schedule();});
  on(reduced,'change',()=>{clearDissolve();if(transition){progress=transition.to;studioBlend=transition.toStudio;transition=null;}resize();});
  on(canvas,'webglcontextlost',event=>{event.preventDefault();lost=true;const selected=view;dispose({preserve:true,keepCanvas:true});canvas.addEventListener('webglcontextrestored',()=>{canvas.remove();mountWorld(host,{selected,plainRoom});},{once:true});});
  on(window,'pagehide',event=>{if(event.persisted)stop();else dispose();});on(window,'pageshow',schedule);
  const observer=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;if(!visible)stop();else schedule();});observer.observe(frame);
  const menuObserver=new MutationObserver(()=>{stop();schedule();});menuObserver.observe(document.body,{attributes:true,attributeFilter:['class']});
  const sizeObserver=new ResizeObserver(resize);sizeObserver.observe(stage);
  function dispose({preserve=false,keepCanvas=false}={}){
    if(disposed)return;disposed=true;resolveReady(false);stop();clearDissolve();abort.abort();observer.disconnect();menuObserver.disconnect();sizeObserver.disconnect();exhibits.dispose();bomber?.dispose();hangar?.dispose();shutter?.remove();env.dispose();key.shadow.map?.dispose();apronKey?.shadow.map?.dispose();renderer.dispose();
    if(keepCanvas)canvas.style.visibility='hidden';else canvas.remove();fallback.hidden=false;nav.hidden=true;stage.dataset.worldReady='fallback';if(!preserve)host.setAttribute('data-gallery-static','');mounted.delete(host);if(window.AiforeuGallery===api)delete window.AiforeuGallery;
  }
  const api={select,dispose,ready:whenReady,setFilmTime(seconds){if(!capture||disposed)return;filmSample=sampleFilm(seconds);progress=filmSample.progress;draw();},get model(){return ready?'ready':'loading';},get bomber(){return bomberState;},get view(){return view;},get presentation(){return host.dataset.galleryDisplay;},get progress(){return progress;},get pose(){return structuredClone(pose);},get running(){return !!raf||!!dissolve;},get stations(){const rect=canvas.getBoundingClientRect();return exhibits.groups.map(g=>{const point=g.position.clone().add(new THREE.Vector3(0,1.44,0)).project(camera);return {name:g.name,position:g.position.toArray(),visible:g.visible,opacity:g.userData.opacity,screen:{x:rect.left+(point.x+1)*rect.width/2,y:rect.top+(1-point.y)*rect.height/2}};});},get stats(){return {...renderer.info.render};}};
  mounted.set(host,api);window.AiforeuGallery=api;stage.append(canvas);fallback.hidden=true;nav.hidden=false;stage.dataset.worldReady='true';resize();
  const aircraft=capture?createBomberSkin({signal:abort.signal}).then(loaded=>{
    if(disposed){loaded.dispose();return;}
    bomber=loaded;bomberState='ready';bomberBounds={min:loaded.closedBounds.min.toArray(),max:loaded.closedBounds.max.toArray()};
    const materials=new Set();bomber.group.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=false;if(/^(Interior_Floor|Bridge_Floor)/.test(o.name))oldFloors.push(o);[].concat(o.material).forEach(m=>materials.add(m));}});
    bomberMaterials=[...materials].map(material=>({material,base:{opacity:material.opacity,transparent:material.transparent,depthWrite:material.depthWrite}}));
    hangar?.attachSkin(bomberMaterials);scene.add(bomber.group);draw();schedule();
  }).catch(()=>{if(!disposed){bomberState='unavailable';draw();schedule();}}):Promise.resolve();
  Promise.all([exhibits.ready,aircraft]).then(()=>{if(!disposed){ready=true;draw();schedule();resolveReady(true);}});
  return api;
}
