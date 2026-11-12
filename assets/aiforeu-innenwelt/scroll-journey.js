import {sampleCarrierView} from './interior-camera.js';
import {sampleLogoReveal} from './logo-reveal.js';

// Positions within the native page scroll, not seconds or playback triggers.
export const CARRIER_SCROLL = Object.freeze({logoEnd:.42,entryStart:.46,inside:.90,exterior:.44});
const clamp=value=>Number.isFinite(value)?Math.max(0,Math.min(1,value)):0;

export function sampleScrollJourney(progress,options={}) {
  const p=clamp(progress),destination=['traffic','workforce'].includes(options.destination)?options.destination:'atrium';
  let view,pose;
  if(options.reducedMotion){view=destination;pose=sampleCarrierView(view,1,options);}
  else if(p<CARRIER_SCROLL.logoEnd){view='logo';pose=sampleLogoReveal(p/CARRIER_SCROLL.logoEnd,options);}
  else if(p<CARRIER_SCROLL.entryStart){view='exterior';pose=sampleCarrierView(view,1,options);}
  else if(p<CARRIER_SCROLL.inside){view='entry';pose=sampleCarrierView(view,(p-CARRIER_SCROLL.entryStart)/(CARRIER_SCROLL.inside-CARRIER_SCROLL.entryStart),options);}
  else {view=destination;pose=sampleCarrierView(view,1,options);}
  // Street traffic and workstation details also hold still when scrolling stops.
  return {view,pose,progress:p,time:options.reducedMotion?10:p*12.6};
}

export function scrollProgress(scrollY,start,distance) {
  if(!Number.isFinite(distance)||distance<=0)return 1;
  return clamp((scrollY-start)/distance);
}
