import { sampleLogoReveal } from '../aiforeu-innenwelt/logo-reveal.js';
import { sampleCarrierView } from '../aiforeu-innenwelt/interior-camera.js';
import { areaProgress, clamp, ease } from './journey.js';

export const INTRO={wordmarkEnd:.055,revealStart:.04,revealEnd:.17,entryStart:.20,entryEnd:.245,galleryStart:.34};
export function landingProgress(area){
  if(area==='logo')return 0;
  if(area==='bomber')return INTRO.revealEnd;
  if(area==='entry')return INTRO.entryStart;
  const progress=areaProgress(area);return progress===null?null:INTRO.galleryStart+progress*(1-INTRO.galleryStart);
}
export function sampleBomberIntro(progress,options={}){
  const p=clamp(progress);
  const brand=1-ease((p-.012)/(INTRO.wordmarkEnd-.012));
  const lockup=1-ease((p-.025)/.055);
  if(p<INTRO.revealEnd)return {view:'logo',pose:sampleLogoReveal(clamp((p-INTRO.revealStart)/(INTRO.revealEnd-INTRO.revealStart)),options),blend:0,brand,lockup};
  if(p<INTRO.entryStart)return {view:'bomber',pose:sampleLogoReveal(1,options),blend:0,brand:0,lockup:0};
  // Pass fully through the open roof before the host glides
  // directly to the approved workstation, rather than entering the old atrium.
  return {view:'entry',pose:{...sampleCarrierView('entry',clamp((p-INTRO.entryStart)/(INTRO.entryEnd-INTRO.entryStart))*.78,options),form:1},blend:ease((p-INTRO.entryEnd)/(INTRO.galleryStart-INTRO.entryEnd)),brand:0,lockup:0};
}
