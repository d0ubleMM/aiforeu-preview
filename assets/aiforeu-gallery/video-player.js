export function mountFilm(host){
  const video=host.querySelector('[data-gallery-film]'),controls=host.querySelector('[data-film-controls]'),toggle=host.querySelector('[data-film-toggle]'),skip=host.querySelector('[data-film-skip]');
  const reduced=matchMedia('(prefers-reduced-motion: reduce)'),portrait=matchMedia('(max-width:760px) and (min-height:501px)'),abort=new AbortController();
  const on=(target,type,fn,options={})=>target.addEventListener(type,fn,{...options,signal:abort.signal});
  let scene=null,active=true,visible=host.getBoundingClientRect().bottom>80&&host.getBoundingClientRect().top<innerHeight,userPaused=reduced.matches,disposed=false,source='';
  const available=()=>active&&!disposed&&visible&&!document.hidden&&!document.body.classList.contains('global-menu-open');
  function label(){toggle.textContent=video.paused?'Abspielen':'Pause';host.dataset.videoState=active?(video.paused?'paused':'playing'):'finished';}
  function play(){if(!available()||userPaused)return;video.play().then(label).catch(error=>{if(active&&error.name!=='AbortError'){userPaused=true;label();}});}
  function chooseSource(time=0){
    const variant=portrait.matches?'mobile':'desktop';if(variant===source){if(time===0)video.currentTime=0;return;}
    source=variant;video.poster=new URL(`../aiforeu-film/poster-${variant}-bomber.webp`,import.meta.url).href;
    video.src=new URL(`../aiforeu-film/intro-${variant}-bomber.mp4`,import.meta.url).href;
    video.addEventListener('loadedmetadata',()=>{if(time>0)video.currentTime=Math.min(time,video.duration);play();},{once:true,signal:abort.signal});
    video.load();
  }
  function showScene(ready){
    if(active||disposed)return;
    host.removeAttribute('data-intro-active');host.removeAttribute('data-brand-intro');host.removeAttribute('data-film-title');controls.hidden=true;
    if(ready)host.setAttribute('data-video-ended','');
    else{host.setAttribute('data-gallery-static','');host.querySelector('[data-world-stage]').dataset.worldReady='fallback';}
    label();
  }
  const sceneReady=import('./gallery.js?v=bomber-roundtrip-1').then(({mountWorld})=>{
    if(disposed)return false;scene=mountWorld(host);return scene?scene.ready:false;
  }).catch(()=>false);
  sceneReady.then(ready=>{if(!active)showScene(ready);});
  function finish(){if(!active)return;active=false;host.removeAttribute('data-film-title');video.pause();sceneReady.then(showScene);}
  function replay(){
    if(disposed)return;active=true;userPaused=false;(window.AiforeuGallery||scene)?.select('voice');host.removeAttribute('data-video-ended');host.removeAttribute('data-film-title');host.setAttribute('data-intro-active','');host.setAttribute('data-brand-intro','');controls.hidden=false;chooseSource(0);play();
  }
  on(toggle,'click',()=>{userPaused=!video.paused;if(userPaused)video.pause();else play();label();});
  on(skip,'click',finish);on(host,'gallery:replay',replay);
  on(video,'ended',finish);on(video,'play',label);on(video,'pause',label);
  on(video,'error',()=>{finish();host.dataset.videoState='unavailable';});
  on(document,'visibilitychange',()=>{if(available())play();else video.pause();});
  on(reduced,'change',()=>{if(reduced.matches){userPaused=true;video.pause();label();}});
  on(portrait,'change',()=>{if(active){const time=video.currentTime;chooseSource(time);}});
  const observer=new IntersectionObserver(([entry])=>{visible=entry.isIntersecting&&entry.intersectionRatio>.05;if(available())play();else video.pause();},{threshold:[0,.05,.5]});observer.observe(host);
  const menuObserver=new MutationObserver(()=>{if(available())play();else video.pause();});menuObserver.observe(document.body,{attributes:true,attributeFilter:['class']});
  on(window,'pagehide',event=>{video.pause();if(!event.persisted){disposed=true;abort.abort();observer.disconnect();menuObserver.disconnect();}});
  on(window,'pageshow',play);
  video.muted=true;video.defaultMuted=true;controls.hidden=false;chooseSource();label();play();
  window.AiforeuIntro={play(){userPaused=false;play();},pause(){userPaused=true;video.pause();},skip:finish,replay,get state(){return host.dataset.videoState;},get video(){return video;}};
}
