export const BRAND_FLIGHT={dock:3.4,duration:4.35};
const clamp=x=>Math.max(0,Math.min(1,x));
const ease=x=>{const t=clamp(x);return t*t*(3-2*t);};
const mix=(a,b,t)=>a+(b-a)*t;
const bezier=(a,b,c,d,t)=>a*(1-t)**3+3*b*(1-t)**2*t+3*c*(1-t)*t*t+d*t*t*t;

// Pixel coordinates: one right-to-left pass ends at the actual header mark.
export function sampleBrandFlight(seconds,{width,height,mark}){
  const time=Math.max(0,Math.min(BRAND_FLIGHT.duration,seconds));
  const t=ease(time/BRAND_FLIGHT.dock),small=Math.min(210,width*.28);
  const morph=ease((time-1.05)/1.45),shrink=ease((time-.8)/2.6);
  const x=bezier(width+small,width*.70,width*.30,mark.x,t);
  const y=bezier(height*.45,height*.49,height*.24,mark.y,t);
  return {time,x,y,width:mix(small,mark.width,shrink),form:1-morph,
    tilt:mix(1.05,Math.PI/2,morph),turn:mix(-Math.PI/2+.10,-Math.PI,morph),
    logo:ease((time-2.15)/.5),light:ease((time-BRAND_FLIGHT.dock)/.95),docked:time>=BRAND_FLIGHT.dock};
}
