import { INTRO } from './bomber-intro.js?v=brand-3';
import { clamp, ease } from './journey.js';

export const FILM_DURATION=8.4;
const beats=[[0,0],[2.05,0],[2.65,.055],[4.45,INTRO.revealEnd],[4.75,INTRO.entryStart],[5.9,INTRO.entryEnd],[8.05,INTRO.galleryStart],[FILM_DURATION,INTRO.galleryStart]];
export function sampleFilm(seconds){
  const time=Math.max(0,Math.min(FILM_DURATION,Number.isFinite(seconds)?seconds:0));
  const entrance=1-(1-clamp(time/1.2))**4,tilt=1-ease(time/1.2);
  let progress=INTRO.galleryStart;
  for(let i=1;i<beats.length;i++)if(time<=beats[i][0]){
    const [a,start]=beats[i-1],[b,end]=beats[i];
    progress=start+(end-start)*(time-a)/(b-a);break;
  }
  return {time,progress,slide:1.15*(1-entrance),rotation:[.24*tilt,-.48*tilt,-1.05*tilt],
    brand:ease((time-1.25)/.5)*(1-ease((time-2.05)/.6)),lift:ease((time-.95)/.75)};
}
