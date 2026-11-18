/* A calm, autonomous assembly. Page scrolling is never intercepted. */
(() => {
  'use strict';
  const host=document.querySelector('[data-mark-sculpture]');
  if(!host)return;
  const moduleURL=new URL('mark-sculpture-scene.js?v=20261118-kinetic',document.currentScript.src);
  const hero=host.closest('.night'),copy=hero.querySelector('.night-copy'),stage=host.querySelector('.mark-canvas');
  const button=host.querySelector('[data-mark-motion]'),header=document.querySelector('.global-header');
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  new ResizeObserver(()=>hero.style.setProperty('--night-copy-height',`${copy.offsetHeight}px`)).observe(copy);
  let scene=null,loading=false,visible=false,paused=reduced.matches,manual=false,elapsed=reduced.matches?0:6.1,frame=0,last=0;
  const pointer={x:0,y:0},target={x:0,y:0};
  function canPlay(){return scene&&!paused&&visible&&!document.hidden&&(!reduced.matches||manual)&&host.hasAttribute('data-ready')&&!document.body.classList.contains('global-menu-open')&&!header?.hasAttribute('data-offers-open');}
  function label(){const text=paused?'Animation abspielen':'Animation pausieren';button.setAttribute('aria-label',text);button.title=text;button.setAttribute('aria-pressed',String(paused));button.firstElementChild.textContent=paused?'▷':'Ⅱ';}
  function tick(now){
    frame=0;if(!canPlay()){last=0;return;}
    if(!last)last=now;
    const delta=now-last;
    if(delta>=1000/30){elapsed+=Math.min(delta,100)/1000;last=now;pointer.x+=(target.x-pointer.x)*.075;pointer.y+=(target.y-pointer.y)*.075;scene.render(elapsed,pointer);}
    frame=requestAnimationFrame(tick);
  }
  function sync(){
    if(canPlay()){if(!frame)frame=requestAnimationFrame(tick);}
    else{cancelAnimationFrame(frame);frame=0;last=0;}
    host.dataset.moving=String(!!canPlay());label();
  }
  async function load(){
    if(loading||navigator.connection?.saveData)return;
    loading=true;
    try{const {mountMarkSculpture}=await import(moduleURL.href);scene=mountMarkSculpture(stage);if(!scene)return;scene.render(elapsed,pointer);host.dataset.ready='true';button.hidden=false;sync();}
    catch{host.removeAttribute('data-ready');}
  }
  new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;if(visible)load();sync();},{threshold:.05}).observe(host);
  stage.addEventListener('mark-context-restored',()=>{scene?.dispose();scene=null;loading=false;load();});
  host.addEventListener('pointermove',event=>{if(event.pointerType!=='mouse'||reduced.matches)return;const rect=host.getBoundingClientRect();target.x=(event.clientX-rect.left)/rect.width*2-1;target.y=(event.clientY-rect.top)/rect.height*2-1;},{passive:true});
  host.addEventListener('pointerleave',()=>{target.x=target.y=0;});
  button.addEventListener('click',()=>{paused=!paused;manual=true;sync();});
  document.addEventListener('visibilitychange',sync);
  reduced.addEventListener('change',()=>{if(reduced.matches){paused=true;manual=false;target.x=target.y=pointer.x=pointer.y=0;scene?.render(0,pointer);elapsed=0;}sync();});
  new MutationObserver(sync).observe(document.body,{attributes:true,attributeFilter:['class']});
  new MutationObserver(sync).observe(host,{attributes:true,attributeFilter:['data-ready']});
  if(header)new MutationObserver(sync).observe(header,{attributes:true,attributeFilter:['data-offers-open']});
})();
