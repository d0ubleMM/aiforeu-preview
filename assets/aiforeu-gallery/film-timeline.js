import { INTRO } from './bomber-intro.js?v=brand-3';
import { clamp, ease } from './journey.js?v=cabin-1';

export const FILM_DURATION=14.6;
const mix=(a,b,t)=>a+(b-a)*t;
const mix3=(a,b,t)=>a.map((v,i)=>mix(v,b[i],t));
const pose=(position,target,fov=45)=>({position,target,fov,form:1,open:0});
const between=(a,b,t)=>pose(mix3(a.position,b.position,t),mix3(a.target,b.target,t),mix(a.fov,b.fov,t));
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
  // A visible descent, touchdown and ground roll precede either door hinge.
  const descent=ease((time-2.1)/2.8),roll=ease((time-4.9)/.9);
  const compression=Math.sin(clamp((time-4.9)/.5)*Math.PI)*.10;
  state.position=[-4*(1-descent),14*(1-descent)+compression,mix(-46,-9,descent)+9*roll];
  state.rotation=[.025*(1-descent)-compression*.08,0,-.045*(1-descent)];
  const wide=pose([distance*.18,6+distance*.10,-distance],[0,5,-5],40),gate=pose([0,.38,-28],[0,3.1,-13],55);
  const dolly=ease((time-5.8)/2.25),ratio=28/distance;
  state.camera=between(wide,gate,(1-ratio**dolly)/(1-ratio));
  state.door=ease((time-6.1)/1.3);state.ramp=ease((time-6.85)/1.10);
  if(time>=8.2){
    const drive=ease((time-8.2)/2.7),z=mix(-28,-8,drive);
    const eye=mix(.38,1.72,clamp((z+18.05)/3.35));
    state.camera=between(gate,pose([0,eye,z],[0,2,8],55),ease((time-8.2)/.4));
  }
  if(time>=10.9)state.camera=between(pose([0,1.72,-8],[0,2,8],55),cabinOverview(aspect),ease((time-10.9)/2.5));
  state.room=ease((time-7.8)/2.7);state.floor=0;state.atmosphere=ease((time-9.8)/1.2);
  if(time>=13.4)state.progress=INTRO.galleryStart;
  return state;
}
