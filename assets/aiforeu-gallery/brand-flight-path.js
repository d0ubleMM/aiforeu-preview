export const BRAND_FLIGHT={pass:1.35,dock:3.4,duration:4.35};
const clamp=x=>Math.max(0,Math.min(1,x));
const ease=x=>{const t=clamp(x);return t*t*(3-2*t);};
const mix=(a,b,t)=>a+(b-a)*t;

// Monotone Hermite interpolation keeps velocity continuous through the flyby
// and the climb, without stopping at waypoints or overshooting the header.
function track(time,points){
  const slopes=points.slice(1).map(([t,v],i)=>(v-points[i][1])/(t-points[i][0]));
  const tangent=i=>i===0||i===points.length-1?0:
    slopes[i-1]*slopes[i]<=0?0:2*slopes[i-1]*slopes[i]/(slopes[i-1]+slopes[i]);
  let i=0;while(i<points.length-2&&time>points[i+1][0])i++;
  const [a,v]=points[i],[b,w]=points[i+1],u=clamp((time-a)/(b-a));
  return (2*u**3-3*u*u+1)*v+(u**3-2*u*u+u)*(b-a)*tangent(i)
    +(-2*u**3+3*u*u)*w+(u**3-u*u)*(b-a)*tangent(i+1);
}

export const flybyWidth=width=>Math.min(420,width*.48);

export function sampleBrandFlight(seconds,{width,height,mark}){
  const time=Math.max(0,Math.min(BRAND_FLIGHT.duration,seconds));
  const x=track(time,[[0,1.08],[.65,.98],[1.1,.77],[1.35,.50],[1.6,.25],[1.95,.12],[2.55,.035],[3.4,0]]);
  const y=track(time,[[0,.55],[.65,.55],[1.1,.52],[1.35,.48],[1.6,.37],[1.95,.22],[2.55,.07],[3.4,0]]);
  // Reciprocal distance makes the close pass brief: approach, rush past the
  // lens, then recede. The bomber stays intact until it has passed the camera.
  const distance=Math.hypot(.16,time-BRAND_FLIGHT.pass);
  const span=flybyWidth(width)*.16/distance;
  const morph=ease((time-1.72)/1.12);
  const tilt=track(time,[[0,.64],[1.1,.84],[1.35,1.15],[1.65,1.04],[2.1,1.22],[2.84,Math.PI/2]]);
  const turn=track(time,[[0,-1.40],[1.1,-1.48],[1.35,-1.67],[1.65,-2.24],[2.1,-2.65],[2.84,-Math.PI]]);
  const bank=track(time,[[0,-.12],[1.1,-.30],[1.35,.06],[1.65,.38],[2.1,.16],[2.84,0]]);
  return {time,x:mix(mark.x,width,x),y:mix(mark.y,height,y),
    width:mix(span,mark.width,ease((time-1.85)/1.55)),form:1-morph,
    tilt,turn,bank,logo:ease((time-2.48)/.46),
    light:ease((time-BRAND_FLIGHT.dock)/.95),docked:time>=BRAND_FLIGHT.dock};
}
