import { sampleLogoReveal } from '../aiforeu-innenwelt/logo-reveal.js';
import { sampleCarrierView } from '../aiforeu-innenwelt/interior-camera.js';
import { areaProgress, clamp, ease } from './journey.js';

export const INTRO={revealEnd:.17,entryStart:.20,entryEnd:.245,galleryStart:.34};
export function landingProgress(area){
  if(area==='logo')return 0;
  if(area==='bomber')return .185;
  if(area==='entry')return INTRO.entryStart;
  const progress=areaProgress(area);return progress===null?null:INTRO.galleryStart+progress*(1-INTRO.galleryStart);
}
export function sampleBomberIntro(progress,options={}){
  const p=clamp(progress);
  if(p<INTRO.revealEnd)return {view:'logo',pose:sampleLogoReveal(p/INTRO.revealEnd,options),blend:0};
  if(p<INTRO.entryStart)return {view:'bomber',pose:sampleLogoReveal(1,options),blend:0};
  // Stop the old camera at the clear roof aperture. From there the host glides
  // directly to the approved workstation, rather than entering the old atrium.
  return {view:'entry',pose:{...sampleCarrierView('entry',clamp((p-INTRO.entryStart)/(INTRO.entryEnd-INTRO.entryStart))*.42,options),form:1},blend:ease((p-INTRO.entryEnd)/(INTRO.galleryStart-INTRO.entryEnd))};
}
