/* Shared product examples. Native, sharp HTML/SVG; no perpetual render loop. */
(() => {
 'use strict';
 const motion=matchMedia('(prefers-reduced-motion: reduce)'),narrow=matchMedia('(max-width: 760px)');
 let count=0;
 for(const host of document.querySelectorAll('[data-product-experience]')){
  const tabs=[...host.querySelectorAll('[data-experience-select]')],panels=[...host.querySelectorAll('[data-experience-panel]')];
  const button=host.querySelector('[data-experience-play]'),label=host.querySelector('[data-experience-play-label]');
  const id=`product-experience-${++count}`,duration=5200;
  let selected=host.dataset.initialView||'voice',visible=false,played=false,playing=false,userPaused=false,elapsed=duration,last=0,frame=0;
  const text=source=>window.AiforeuLanguage?.ready?window.AiforeuLanguage.t(source,'de'):source;
  const canPlay=()=>playing&&visible&&!userPaused&&!document.hidden&&!document.body.classList.contains('global-menu-open');
  function reflect(){
   button.hidden=motion.matches;label.textContent=text(playing&&!userPaused?'Pause':'Abspielen');
   button.setAttribute('aria-label',text(playing&&!userPaused?'Ablauf pausieren':'Ablauf abspielen'));
   button.querySelector('path').setAttribute('d',playing&&!userPaused?'M6 4v12M14 4v12':'M5 4v12l10-6z');
   host.toggleAttribute('data-playing',playing);host.toggleAttribute('data-paused',playing&&!canPlay());
  }
  function paint(){const progress=Math.max(0,Math.min(1,elapsed/duration));host.style.setProperty('--demo-progress',progress.toFixed(3));host.dataset.step=String(Math.min(3,Math.floor(progress*4)));}
  function stop(){cancelAnimationFrame(frame);frame=0;last=0;}
  function tick(now){frame=0;if(!canPlay()){last=0;reflect();return;}if(last)elapsed+=Math.min(60,now-last);last=now;paint();if(elapsed>=duration){playing=false;last=0;reflect();return;}frame=requestAnimationFrame(tick);}
  function sync(){if(canPlay()){if(!frame)frame=requestAnimationFrame(tick);}else stop();reflect();}
  function play(){if(motion.matches)return;elapsed=0;played=true;playing=true;userPaused=false;last=0;paint();sync();}
  function select(view,manual=false){
   selected=view;host.dataset.view=view;
   tabs.forEach(tab=>{const active=tab.dataset.experienceSelect===view;tab.setAttribute('aria-selected',String(active));tab.tabIndex=active?0:-1;});
   panels.forEach(panel=>panel.hidden=panel.dataset.experiencePanel!==view);
   stop();playing=false;userPaused=false;played=false;elapsed=duration;paint();
   if((manual||visible)&&!motion.matches)play();else reflect();
  }
  const tablist=host.querySelector('.experience-tabs');tablist.setAttribute('role','tablist');
  const orient=()=>tablist.setAttribute('aria-orientation',narrow.matches?'horizontal':'vertical');
  orient();narrow.addEventListener('change',orient);
  tabs.forEach((tab,index)=>{
   const view=tab.dataset.experienceSelect,panel=panels.find(panel=>panel.dataset.experiencePanel===view);
   tab.id=`${id}-tab-${view}`;tab.setAttribute('role','tab');tab.setAttribute('aria-controls',`${id}-${view}`);
   panel.id=`${id}-${view}`;panel.setAttribute('role','tabpanel');panel.setAttribute('aria-labelledby',tab.id);panel.tabIndex=0;
   tab.addEventListener('click',event=>{if(event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;event.preventDefault();select(view,true);});
   tab.addEventListener('keydown',event=>{let next=index;if(['ArrowRight','ArrowDown'].includes(event.key))next=(index+1)%tabs.length;else if(['ArrowLeft','ArrowUp'].includes(event.key))next=(index+tabs.length-1)%tabs.length;else if(event.key==='Home')next=0;else if(event.key==='End')next=tabs.length-1;else return;event.preventDefault();tabs[next].focus({preventScroll:true});select(tabs[next].dataset.experienceSelect,true);});
  });
  button.addEventListener('click',()=>{if(playing){userPaused=!userPaused;sync();}else play();});
  const observer=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;if(visible&&!played&&!motion.matches&&window.AiforeuLanguage?.ready)play();else sync();},{threshold:.25});observer.observe(host);
  document.addEventListener('visibilitychange',sync);
  const menuObserver=new MutationObserver(sync);menuObserver.observe(document.body,{attributes:true,attributeFilter:['class']});
  motion.addEventListener('change',()=>{stop();playing=false;elapsed=duration;paint();reflect();});
  window.addEventListener('aiforeu:language-ready',()=>{if(visible&&!played&&!motion.matches)play();else reflect();});
  window.addEventListener('pagehide',event=>{stop();if(!event.persisted){observer.disconnect();menuObserver.disconnect();}});
  window.addEventListener('pageshow',sync);
  // The original German control strings are translated as complete labels.
  button.dataset.i18nIgnore='';host.dataset.ready='true';select(selected);
 }
})();
