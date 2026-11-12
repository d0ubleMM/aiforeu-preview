import * as THREE from '../agentario-scene/vendor/three.module.min.js';
import {createBomberSkin} from '../aiforeu-bomber-sharp/skin.js';
import {mountWorld} from './gallery.js?v=brand-flight-1';
import {BRAND_FLIGHT,sampleBrandFlight,flybyWidth} from './brand-flight-path.js?v=flyby-2';

export function mountBrandFlight(host){
  const html=document.documentElement,mark=document.querySelector('.global-header .global-brand img');
  const abort=new AbortController(),reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const on=(target,event,fn)=>target.addEventListener(event,fn,{signal:abort.signal});
  const room=mountWorld(host,{plainRoom:true});
  const controls=host.querySelector('[data-brand-controls]'),skip=host.querySelector('[data-brand-skip]');
  const layer=document.createElement('div');layer.className='brand-flight-layer';layer.setAttribute('aria-hidden','true');
  const logo=mark.cloneNode();logo.removeAttribute('width');logo.removeAttribute('height');logo.className='brand-flight-mark';layer.append(logo);document.body.append(layer);
  let renderer=null,skin=null,camera=null,scene=null,model=null,frame=0,last=0,time=0,ready=false,playing=false,finished=false,disposed=false,sample=null;
  const materials=[];
  const pause=()=>{playing=false;last=0;if(frame)cancelAnimationFrame(frame);frame=0;};
  function draw(){
    const box=mark.getBoundingClientRect();
    sample=sampleBrandFlight(time,{width:innerWidth,height:innerHeight,mark:{x:box.x+box.width/2,y:box.y+box.height/2,width:box.width}});
    const s=sample;
    html.toggleAttribute('data-brand-flight-active',!s.docked);
    host.toggleAttribute('data-brand-docked',s.docked);
    host.style.setProperty('--room-light',String(s.light));
    host.toggleAttribute('data-room-revealing',s.light>0);
    host.dataset.brandFlight=s.docked?'lighting':s.logo>.5?'logo':'flying';
    controls.hidden=s.docked;
    logo.style.cssText=`width:${s.width}px;height:${s.width*box.height/box.width}px;left:${s.x}px;top:${s.y}px;opacity:${s.docked?0:s.logo}`;
    if(renderer){
      skin.setForm(s.form);model.rotation.set(s.tilt,s.bank,s.turn,'ZYX');
      const size=s.width/THREE.MathUtils.lerp(72,116,s.form);model.scale.setScalar(size);
      for(const m of materials){m.opacity=1-s.logo;const transparent=s.logo>0;if(m.transparent!==transparent){m.transparent=transparent;m.needsUpdate=true;}m.depthWrite=!transparent;}
      renderer.domElement.style.left=s.x+'px';renderer.domElement.style.top=s.y+'px';
      renderer.domElement.style.visibility=s.logo>=1?'hidden':'visible';
      renderer.render(scene,camera);
    }
  }
  function finish(){
    pause();finished=true;time=BRAND_FLIGHT.duration;draw();layer.hidden=true;controls.hidden=true;
    html.removeAttribute('data-brand-flight-active');host.removeAttribute('data-intro-active');host.removeAttribute('data-brand-pending');host.dataset.brandFlight='finished';
    if(!room)host.setAttribute('data-gallery-static','');
  }
  function tick(now){
    frame=0;if(!playing||disposed)return;
    if(document.hidden||document.body.classList.contains('global-menu-open')){last=0;return;}
    time=Math.min(BRAND_FLIGHT.duration,time+(last?Math.min((now-last)/1000,.05):0));last=now;draw();
    if(time>=BRAND_FLIGHT.duration)finish();else frame=requestAnimationFrame(tick);
  }
  function play(){if(disposed||!ready||finished)return;playing=true;last=0;if(!frame)frame=requestAnimationFrame(tick);}
  function resize(){
    if(renderer){const size=Math.ceil(flybyWidth(innerWidth)*1.6);renderer.setPixelRatio(Math.min(devicePixelRatio||1,2));renderer.setSize(size,size);camera.left=-size/2;camera.right=size/2;camera.top=size/2;camera.bottom=-size/2;camera.updateProjectionMatrix();}
    if(ready&&!finished)draw();
  }
  async function loadAircraft(){
    if(reduced.matches)return;
    skin=await createBomberSkin({signal:abort.signal});if(disposed)return;
    renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,powerPreference:'high-performance'});
    on(renderer.domElement,'webglcontextlost',event=>{event.preventDefault();finish();});
    renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.7;renderer.setClearColor(0,0);
    layer.prepend(renderer.domElement);scene=new THREE.Scene();camera=new THREE.OrthographicCamera(-1,1,1,-1,.1,2000);camera.position.set(0,0,1000);
    scene.add(new THREE.HemisphereLight('#ffffff','#70859b',2.5));
    for(const [x,y,z,power] of [[-250,350,500,4],[300,-100,200,2]]){const light=new THREE.DirectionalLight('#f0f3f8',power);light.position.set(x,y,z);scene.add(light);}
    skin.group.traverse(o=>{if(o.isMesh){o.castShadow=o.receiveShadow=false;for(const m of [].concat(o.material)){m.side=THREE.DoubleSide;m.envMapIntensity=1;if(!materials.includes(m))materials.push(m);}}});
    model=new THREE.Group();model.add(skin.group);scene.add(model);skin.setOpen(0);resize();
  }
  const whenReady=Promise.all([room?.ready||Promise.resolve(false),document.fonts.ready,loadAircraft()]).then(()=>{
    if(disposed)return;ready=true;resize();if(finished||reduced.matches||!room)finish();else play();
  }).catch(()=>{ready=true;finish();});
  function replay(){
    if(!ready||disposed)return;pause();(window.AiforeuGallery||room)?.select('overview');time=0;finished=false;layer.hidden=false;controls.hidden=false;host.setAttribute('data-intro-active','');draw();if(reduced.matches||!renderer||renderer.getContext().isContextLost())finish();else play();
  }
  on(skip,'click',finish);on(host,'gallery:replay',replay);on(window,'resize',resize);
  on(reduced,'change',()=>{if(reduced.matches)finish();});
  on(document,'visibilitychange',()=>{if(document.hidden){if(frame)cancelAnimationFrame(frame);frame=0;last=0;}else if(playing)play();});
  const menuObserver=new MutationObserver(()=>{if(!document.body.classList.contains('global-menu-open')&&playing)play();});menuObserver.observe(document.body,{attributes:true,attributeFilter:['class']});
  const observer=new IntersectionObserver(([entry])=>{if(!entry.isIntersecting&&!finished)finish();});observer.observe(host);
  on(window,'pagehide',event=>{if(event.persisted){pause();return;}disposed=true;pause();abort.abort();observer.disconnect();menuObserver.disconnect();skin?.dispose();renderer?.dispose();layer.remove();html.removeAttribute('data-brand-flight-active');});
  on(window,'pageshow',event=>{if(event.persisted&&!finished)finish();});
  controls.hidden=false;html.setAttribute('data-brand-flight-active','');
  window.AiforeuIntro={ready:whenReady,play,pause,skip:finish,replay,seek(seconds){pause();finished=false;layer.hidden=false;controls.hidden=false;host.setAttribute('data-intro-active','');time=seconds;draw();},get state(){return finished?'finished':playing?'playing':'paused';},get time(){return time;},get pose(){return sample?{...sample}:null;}};
  return window.AiforeuIntro;
}
