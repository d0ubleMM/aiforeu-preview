(() => {
  const host=document.querySelector('[data-world]');if(!host)return;
  const header=document.querySelector('.global-header');let frame=0;
  const update=()=>{frame=0;header?.toggleAttribute('data-hero-ended',host.getBoundingClientRect().bottom<=(header?.offsetHeight||80));};
  const schedule=()=>{if(!frame)frame=requestAnimationFrame(update);};
  addEventListener('scroll',schedule,{passive:true});addEventListener('resize',schedule);update();
  import(new URL('./aiforeu-gallery/brand-flight.js?v=flyby-2',document.currentScript.src).href).then(({mountBrandFlight})=>mountBrandFlight(host)).catch(()=>{document.documentElement.removeAttribute('data-brand-flight-active');host.removeAttribute('data-intro-active');host.removeAttribute('data-brand-pending');host.setAttribute('data-gallery-static','');});
})();
