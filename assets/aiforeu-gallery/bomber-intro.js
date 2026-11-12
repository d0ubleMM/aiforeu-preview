import { sampleLogoReveal } from '../aiforeu-innenwelt/logo-reveal.js';
import { sampleCarrierView } from '../aiforeu-innenwelt/interior-camera.js';
import { areaProgress, clamp, ease } from './journey.js';

export const INTRO={wordmarkEnd:.055,revealStart:.04,revealEnd:.17,entryStart:.245,entryEnd:.29,galleryStart:.38};
export function landingProgress(area){
  if(area==='logo')return 0;
  if(area==='bomber')return INTRO.revealEnd;
  if(area==='entry')return INTRO.entryStart;
  const progress=areaProgress(area);return progress===null?null:INTRO.galleryStart+progress*(1-INTRO.galleryStart);
}
export function sampleBomberIntro(progress,options={}){
  const p=clamp(progress);
  const brand=1-ease((p-.012)/(INTRO.wordmarkEnd-.012));
  const lockup=1-ease((p-.025)/.055),rotation=[0,0,0];
  if(p<INTRO.revealEnd)return {view:'logo',pose:sampleLogoReveal(clamp((p-INTRO.revealStart)/(INTRO.revealEnd-INTRO.revealStart)),options),blend:0,brand,lockup,rotation,flight:0};
  if(p<INTRO.entryStart){
    const pose=sampleLogoReveal(1,options),t=(p-INTRO.revealEnd)/(INTRO.entryStart-INTRO.revealEnd);
    // A banked fly-past, then level out at the exact roof-entry pose. All
    // movement is sampled from scroll; no elapsed-time animation or inertia.
    const bank=Math.sin(Math.PI*t)**2,yaw=.56*bank;
    const delta=pose.position.map((v,i)=>v-pose.target[i]),scale=1+.25*bank;
    const x=(delta[0]*Math.cos(yaw)+delta[2]*Math.sin(yaw))*scale;
    const z=(-delta[0]*Math.sin(yaw)+delta[2]*Math.cos(yaw))*scale;
    const drift=(options.aspect<1?5:12)*Math.sin(2*Math.PI*t)*bank;
    pose.position=[pose.target[0]+x+drift,pose.target[1]+delta[1]*(1+.12*bank),pose.target[2]+z];
    pose.target=[pose.target[0]+drift,pose.target[1],pose.target[2]];
    return {view:'bomber',pose,blend:0,brand:0,lockup:0,rotation:[.065*bank,.22*bank,-.28*bank],flight:bank};
  }
  // Stop the old camera at the clear roof aperture. From there the host glides
  // directly to the approved workstation, rather than entering the old atrium.
  return {view:'entry',pose:{...sampleCarrierView('entry',clamp((p-INTRO.entryStart)/(INTRO.entryEnd-INTRO.entryStart))*.42,options),form:1},blend:ease((p-INTRO.entryEnd)/(INTRO.galleryStart-INTRO.entryEnd)),brand:0,lockup:0,rotation,flight:0};
}
