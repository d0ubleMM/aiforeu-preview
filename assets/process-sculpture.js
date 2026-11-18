/* One short illustration, with explicit replay and no background render loop. */
(() => {
 const motion=matchMedia('(prefers-reduced-motion: reduce)');
 for(const host of document.querySelectorAll('[data-process-sculpture]')){
  const button=host.querySelector('[data-process-play]'),label=button.querySelector('span'),signal=host.querySelector('.process-signal');
  let started=false,playing=false,userPaused=false,visible=false;
  const controls=()=>{button.hidden=motion.matches;button.setAttribute('aria-label',playing&&!userPaused?'Ablauf pausieren':'Ablauf abspielen');label.textContent=playing&&!userPaused?'Pause':'Abspielen';};
  const pause=()=>host.toggleAttribute('data-paused',playing&&(!visible||userPaused||document.hidden));
  const play=()=>{if(motion.matches)return;host.removeAttribute('data-playing');void host.offsetWidth;host.setAttribute('data-playing','');started=true;playing=true;userPaused=false;pause();controls();};
  button.addEventListener('click',()=>{if(playing){userPaused=!userPaused;pause();controls();}else play();});
  signal.addEventListener('animationend',()=>{playing=false;host.removeAttribute('data-playing');host.removeAttribute('data-paused');controls();});
  const observer=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;if(visible&&!started&&!motion.matches&&window.AiforeuLanguage?.ready)play();else pause();},{threshold:.25});observer.observe(host);
  document.addEventListener('visibilitychange',pause);
  window.addEventListener('aiforeu:language-ready',()=>{if(visible&&!started&&!motion.matches)play();});
  motion.addEventListener('change',()=>{if(motion.matches){host.removeAttribute('data-playing');host.removeAttribute('data-paused');playing=false;}controls();});
  controls();
 }
})();
