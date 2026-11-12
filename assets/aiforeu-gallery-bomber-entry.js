(() => {
  const host=document.querySelector('[data-world]');if(!host)return;
  const header=document.querySelector('.global-header');
  let frame=0;
  const updateHeader=()=>{frame=0;header?.toggleAttribute('data-hero-ended',host.getBoundingClientRect().bottom<=(header?.offsetHeight||80));};
  const scheduleHeader=()=>{if(!frame)frame=requestAnimationFrame(updateHeader);};
  addEventListener('scroll',scheduleHeader,{passive:true});addEventListener('resize',scheduleHeader);updateHeader();
  import(new URL('./aiforeu-gallery/video-player.js?v=bomber-roundtrip-1',document.currentScript.src).href).then(({mountFilm})=>mountFilm(host)).catch(()=>{host.removeAttribute('data-intro-active');host.removeAttribute('data-brand-intro');host.removeAttribute('data-film-title');host.setAttribute('data-gallery-static','');});
})();
