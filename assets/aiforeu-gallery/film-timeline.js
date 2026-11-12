import { INTRO } from './bomber-intro.js?v=brand-3';
import { clamp, ease } from './journey.js?v=cabin-1';

export const FILM_DURATION=15.6;
export const FLIGHT={pass:2.27,touchdown:4.65,parked:6.4,entry:9.2,inside:14.4};
const mix=(a,b,t)=>a+(b-a)*t;
const mix3=(a,b,t)=>a.map((v,i)=>mix(v,b[i],t));
const pose=(position,target,fov=45,roll=0)=>({position,target,fov,roll,form:1,open:0});
const between=(a,b,t)=>pose(mix3(a.position,b.position,t),mix3(a.target,b.target,t),mix(a.fov,b.fov,t),mix(a.roll,b.roll,t));
// Metres and metres/second. Continuous velocities carry the fast pass into a
// banking flare and braking; the aircraft never eases to a stop in mid-air.
const flightPath=[
  [1.95,[-5,5.3,-103],[6,-.4,90]],
  [2.8,[1,4.5,-43],[9,-1.3,51]],
  [3.8,[3.8,2.2,-18.8],[-3,-2,16]],
  [4.65,[0,.07,-10],[-2,0,13]],
  [5.2,[-.55,.01,-4.8],[0,0,7]],
  [6.4,[0,0,0],[0,0,0]],
];
function trajectory(t){
  if(t<=flightPath[0][0])return [...flightPath[0][1]];
  for(let i=1;i<flightPath.length;i++){
    const [end,b,vb]=flightPath[i],[start,a,va]=flightPath[i-1];
    if(t>end)continue;
    const duration=end-start,u=clamp((t-start)/duration),u2=u*u,u3=u2*u;
    return a.map((v,j)=>(2*u3-3*u2+1)*v+(u3-2*u2+u)*duration*va[j]+(-2*u3+3*u2)*b[j]+(u3-u2)*duration*vb[j]);
  }
  return [0,0,0];
}
function keyed(t,keys){
  for(let i=1;i<keys.length;i++)if(t<=keys[i][0])return mix(keys[i-1][1],keys[i][1],ease((t-keys[i-1][0])/(keys[i][0]-keys[i-1][0])));
  return keys.at(-1)[1];
}
function impulse(t,start,decay){const d=t-start;return d<0?0:(1-Math.exp(-d*38))*Math.exp(-d*decay);}
export function cabinOverview(aspect=1.55){
  return aspect<1.25?pose([16.8,4.2,-1],[6,1.7,8],2*Math.atan(Math.tan(30*Math.PI/180)/aspect)*180/Math.PI):pose([0,4.3,-12],[0,1.7,8],55);
}
export function sampleFilm(seconds,options={}){
  const time=Math.max(0,Math.min(FILM_DURATION,Number.isFinite(seconds)?seconds:0)),aspect=options.aspect||1.55;
  const distance=58/(Math.tan(20*Math.PI/180)*aspect*.58);
  const front=pose([0,4.8+distance*.115,distance],[0,4.8,0],40);
  const state={time,progress:INTRO.revealEnd,framing:1,slide:0,brand:0,lift:0,rotation:[-Math.atan(.115),0,0],position:[0,0,0],camera:front,galleryBlend:0,room:0,floor:0,atmosphere:0,shellOpacity:1,rear:0,door:0,ramp:0,shutter:0};
  // Start directly in flight. No logo presentation precedes the approach.
  if(time<1.95){
    const t=clamp(time/1.65),run=distance-27,travel=run*t**1.35+Math.max(0,time-1.65)*run*1.35/1.65;
    state.position=[0,.115*travel,travel];state.shutter=ease((time-1.65)/.06);return state;
  }
  state.rear=1;state.shutter=1-ease((time-2)/.2);
  state.position=trajectory(time);
  const ahead=trajectory(time+.005),behind=trajectory(time-.005);
  const yaw=time<6.39?Math.atan2(ahead[0]-behind[0],ahead[2]-behind[2]):0;
  const pitch=keyed(time,[[1.95,-.01],[2.8,.012],[3.65,-.018],[4.65,-.02],[4.95,.006],[5.25,-.006],[5.75,0]]);
  const bank=keyed(time,[[1.95,-.10],[2.55,-.14],[3.35,.075],[4,.018],[4.55,0]]);
  state.rotation=[pitch,yaw*(1-ease((time-5.3)/1.1)),bank];
  const contact=time-FLIGHT.touchdown;
  state.gearCompression=contact<0?0:.18*Math.exp(-contact*4.8)*Math.sin(Math.PI*clamp(contact/.34));
  state.position[1]-=state.gearCompression;
  state.touchdown=contact;
  // A standing viewer is underneath the passing wing. The head follows the
  // aircraft overhead, then the camera sweeps to a low rear three-quarter view.
  const portrait=aspect<1,follow=ease((time-2.85)/2.9);
  const trackingPosition=mix3([40,.38,-76],[portrait?35:50,portrait?3.5:4.4,portrait?-90:-85],follow);
  const tracked=trajectory(time-.045),target=mix3([tracked[0],tracked[1]+2.3,tracked[2]],[0,3.4,-5],ease((time-4.7)/1.7));
  const pass=impulse(time,FLIGHT.pass,3.7),impact=impulse(time,FLIGHT.touchdown,6.5);
  const kick=pass+.55*impact,osc=time-FLIGHT.pass;
  trackingPosition[0]+=.24*kick*(Math.sin(osc*57)+.34*Math.sin(osc*91));
  trackingPosition[1]+=.19*kick*Math.sin(osc*73);
  const shakeRoll=.045*pass*Math.sin(osc*49)+.023*impact*Math.sin(contact*62);
  target[0]+=.30*kick*Math.sin(osc*39);
  state.camera=pose(trackingPosition,target,mix(portrait?101:76,portrait?95:55,ease((time-2.8)/1.3)),shakeRoll);
  state.vibration=kick;
  const wide=pose([portrait?35:50,portrait?3.5:4.4,portrait?-90:-85],[0,3.4,-5],portrait?95:55),gate=pose([0,.38,-28],[0,3.1,-13],55);
  if(time>=6.4)state.camera=between(wide,gate,ease((time-6.4)/2.65));
  state.door=ease((time-7.1)/1.3);state.ramp=ease((time-7.85)/1.10);
  if(time>=9.2){
    const drive=ease((time-9.2)/2.7),z=mix(-28,-8,drive);
    const eye=mix(.38,1.72,clamp((z+18.05)/3.35));
    state.camera=between(gate,pose([0,eye,z],[0,2,8],55),ease((time-9.2)/.4));
  }
  if(time>=11.9)state.camera=between(pose([0,1.72,-8],[0,2,8],55),cabinOverview(aspect),ease((time-11.9)/2.5));
  state.room=ease((time-8.8)/2.7);state.floor=0;state.atmosphere=ease((time-10.8)/1.2);
  if(time>=14.4)state.progress=INTRO.galleryStart;
  return state;
}
