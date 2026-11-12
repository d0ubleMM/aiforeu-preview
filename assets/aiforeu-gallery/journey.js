export const AREAS=['voice','desktop','workflows','traffic'];
export const DESK_LAYOUT={spacing:-7,first:10.5,z:8};
export const clamp=value=>Math.max(0,Math.min(1,value));
export const ease=value=>{const t=clamp(value);return t*t*(3-2*t);};

// A long inspection of each object, then one short lateral passage. No clock.
export function sampleGallery(progress) {
  const p=clamp(progress),step=p*4,index=Math.min(3,Math.floor(step));
  const local=index===3?clamp(step-3):step-index;
  const travel=index<3?ease((local-.72)/.28):0;
  return {progress:p,index,view:AREAS[travel<.5?index:index+1],local,
    centre:DESK_LAYOUT.first+(index+travel)*DESK_LAYOUT.spacing,inspection:ease(local/.72),
    opacity:index<3?1-Math.sin(Math.PI*travel):1};
}

export function areaProgress(area) {const index=AREAS.indexOf(area);return index<0?null:index/4;}
