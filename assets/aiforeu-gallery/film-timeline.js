import { INTRO } from './bomber-intro.js?v=brand-3';
import { ease } from './journey.js';

export const FILM_DURATION=11.4;
// Aircraft, original mark, aircraft again, then a continuous descent inside.
const beats=[[0,INTRO.revealEnd],[1.15,INTRO.revealEnd],[3.1,INTRO.revealStart],
  [3.65,INTRO.revealStart],[5.9,INTRO.revealEnd],[6.6,INTRO.entryStart],
  [9.1,INTRO.entryEnd],[11,INTRO.galleryStart],[FILM_DURATION,INTRO.galleryStart]];
export function sampleFilm(seconds){
  const time=Math.max(0,Math.min(FILM_DURATION,Number.isFinite(seconds)?seconds:0));
  let progress=INTRO.galleryStart;
  for(let i=1;i<beats.length;i++)if(time<=beats[i][0]){
    const [a,start]=beats[i-1],[b,end]=beats[i];
    progress=start+(end-start)*(time-a)/(b-a);break;
  }
  const arrival=1-ease(time/1.15),bank=arrival*(1-ease((time-1.15)/.3));
  return {time,progress,slide:0,brand:0,lift:0,
    rotation:[-.025*bank,.13*bank,-.075*bank],position:[-8*arrival,1.2*arrival,-12*arrival],
    framing:1.55-.55*ease((time-6.6)/1.9)};
}
