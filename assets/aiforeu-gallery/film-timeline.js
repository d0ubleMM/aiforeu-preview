import { INTRO } from './bomber-intro.js?v=brand-3';
import { sampleLogoReveal } from '../aiforeu-innenwelt/logo-reveal.js';
import { clamp, ease } from './journey.js';

export const FILM_DURATION=16;
const mix=(a,b,t)=>a+(b-a)*t,mix3=(a,b,t)=>a.map((v,i)=>mix(v,b[i],t));
const pose=(position,target,fov=45)=>({position,target,fov,form:1,open:0});
const between=(a,b,t)=>pose(mix3(a.position,b.position,t),mix3(a.target,b.target,t),mix(a.fov,b.fov,t));
export function sampleFilm(seconds,options={}){
  const time=Math.max(0,Math.min(FILM_DURATION,Number.isFinite(seconds)?seconds:0)),aspect=options.aspect||1.55;
  const beats=[[0,INTRO.revealEnd],[1,INTRO.revealEnd],[2.7,INTRO.revealStart],[3.3,INTRO.revealStart],[5.1,INTRO.revealEnd]];
  let progress=INTRO.revealEnd;
  for(let i=1;i<beats.length;i++)if(time<=beats[i][0]){const [a,start]=beats[i-1],[b,end]=beats[i];progress=mix(start,end,(time-a)/(b-a));break;}
  const arrival=1-ease(time),framing=1.55;
  const state={time,progress,framing,slide:0,brand:0,lift:0,rotation:[-.025*arrival,.13*arrival,-.075*arrival],position:[-8*arrival,1.2*arrival,-12*arrival],camera:null,galleryBlend:0,room:0,floor:0,atmosphere:0,shellOpacity:1,rear:0,door:0,ramp:0,shutter:0};
  if(time<5.1)return state;
  state.framing=1;
  const initial=sampleLogoReveal(1,options);initial.position=mix3(initial.target,initial.position,framing);
  const distance=58/(Math.tan(20*Math.PI/180)*aspect*.55),front=pose([0,4.8+distance*.115,distance],[0,4.8,0],40);
  if(time<7.3){
    state.camera=between(initial,front,ease((time-5.1)/.7));
    const approach=clamp((time-5.8)/1.3),run=front.position[2]-27;
    const travel=run*approach**3+Math.max(0,time-7.1)*run*3/1.3;
    state.position=[0,.115*travel,travel];
    state.rotation=[-Math.atan(.115)*ease((time-5.1)/.7),0,0];
    state.shutter=ease((time-7.1)/.05);
    return state;
  }
  state.rear=1;state.shutter=1-ease((time-7.43)/.20);
  const park=1-ease((time-7.45)/1.35);
  state.position=[0,.65*park,-6*park];state.rotation=[.012*park,0,0];
  const wide=pose([distance*.18,4.8+distance*.17,-distance],[0,3,-5],40),gate=pose([0,.38,-28],[0,3.25,-13],55);
  state.camera=between(wide,gate,ease((time-8.8)/1.7));
  state.door=ease((time-9.1)/1.15);state.ramp=ease((time-9.55)/.85);
  if(time>=10.5){
    const drive=ease((time-10.5)/2),z=mix(-28,-10,drive);
    // Eye follows the ground and the actual sloping ramp, then the cabin floor.
    const rampProgress=clamp((z+18.05)/3.35),eye=mix(.38,1.72,rampProgress);
    const enter=pose([0,eye,z],[0,2.2,z+9],55);
    state.camera=between(gate,enter,ease((time-10.5)/.35));
  }
  if(time>=12.5){
    const turn=ease((time-12.5)/1),start=pose([0,1.72,-10],[0,2.2,-1],55),end=pose([4.7,2.5,1],[0,1.58,0],45);
    state.camera=between(start,end,turn);
  }
  state.room=ease((time-10.4)/2.4);state.floor=ease((time-12.2)/.6);state.atmosphere=ease((time-12.2)/2);
  state.galleryBlend=ease((time-13.5)/2.1);state.shellOpacity=1-ease((time-13.05)/1.5);
  if(time>=15.6)state.progress=INTRO.galleryStart;
  return state;
}
