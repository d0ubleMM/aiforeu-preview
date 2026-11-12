(() => {
  const host=document.querySelector('[data-world]');
  if(!host)return;
  const source=document.currentScript.src,header=document.querySelector('.global-header');
  const observer=new IntersectionObserver(([entry])=>header?.toggleAttribute('data-hero-ended',entry.boundingClientRect.bottom<=80),{threshold:0});
  observer.observe(host);
  import(new URL('./aiforeu-gallery/gallery.js?v=brand-3',source).href)
    .then(({mountWorld})=>mountWorld(host))
    .catch(()=>host.setAttribute('data-gallery-static',''));
})();
