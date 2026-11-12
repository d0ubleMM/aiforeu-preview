export const AREAS=['voice','desktop','workflows','traffic'];
export const clamp=value=>Math.max(0,Math.min(1,value));
export const ease=value=>{const t=clamp(value);return t*t*(3-2*t);};

// A long inspection of each object, then one short lateral passage. No clock.
export function sampleGallery(progress) {
  const p=clamp(progress),step=p*4,index=Math.min(3,Math.floor(step));
  const local=index===3?clamp(step-3):step-index;
  const travel=index<3?ease((local-.72)/.28):0;
  return {progress:p,index,view:AREAS[travel<.5?index:index+1],local,
    centre:(index+travel)*22,inspection:ease(local/.72),
    opacity:index<3?1-Math.sin(Math.PI*travel):1};
}

export function areaProgress(area) {const index=AREAS.indexOf(area);return index<0?null:index/4;}
