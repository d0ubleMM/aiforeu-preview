import * as THREE from '../agentario-scene/vendor/three.module.min.js';

export const BRAND_FLIGHT={pass:1.86,morph:2.75,dock:4.4,duration:5.35,fov:42};
const clamp=x=>Math.max(0,Math.min(1,x));
const ease=x=>{const t=clamp(x);return t*t*(3-2*t);};
const mix=(a,b,t)=>a+(b-a)*t;
const bezier=(a,b,c,d,t)=>a*(1-t)**3+3*b*(1-t)**2*t+3*c*(1-t)*t*t+d*t*t*t;
const UP=new THREE.Vector3(0,1,0),ORIGIN=new THREE.Vector3(),BACK=new THREE.Vector3(0,0,-1);
const LOGO=new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI/2,0,-Math.PI,'ZYX'));
const AIRCRAFT_SCALE=1/116;

// One broad, continuous flight past the camera, then a climbing left turn.
// The aircraft has a fixed wingspan and moves at constant world speed. Its
// apparent size and changing front/top/rear view come entirely from perspective.
const flight=new THREE.CubicBezierCurve3(...[
  [-.7,-.9,-8.5],[-1.4,-.9,-1],[-1.2,-.9,6],[2,3.3,10.5],
].map(p=>new THREE.Vector3(...p)));
flight.arcLengthDivisions=512;
const nearest=flight.getPointAt(BRAND_FLIGHT.pass/BRAND_FLIGHT.dock).length();

export function sampleBrandFlight(seconds,{width,height,mark}){
  const time=Math.max(0,Math.min(BRAND_FLIGHT.duration,seconds));
  const u=clamp(time/BRAND_FLIGHT.dock),framing=ease(u);
  const focal=height/(2*Math.tan(THREE.MathUtils.degToRad(BRAND_FLIGHT.fov/2)));
  const distance=focal/(Math.min(440,width*.64,height*.6)*nearest);
  const position=flight.getPointAt(u).multiplyScalar(distance);
  const forward=flight.getTangentAt(u).normalize();

  // The camera pans with the pass. Framing crosses the screen and gradually
  // leads the departing aircraft up to the real header mark, without cuts.
  const x=bezier(width*1.03,width*.55,mark.x+(width-mark.x)*.08,mark.x,framing);
  const y=bezier(height*.55,height*.59,height*.29,mark.y,framing);
  const ray=new THREE.Vector3((x-width/2)/focal,(height/2-y)/focal,-1).normalize();
  const camera=new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().lookAt(ORIGIN,position,UP));
  camera.multiply(new THREE.Quaternion().setFromUnitVectors(ray,BACK));
  const depth=-position.clone().applyQuaternion(camera.clone().invert()).z;

  // The nose follows the tangent. Coordinated banking lowers the left wing
  // in a left turn; roll is about the longitudinal axis, never screen-space Z.
  const wingAxis=new THREE.Vector3().crossVectors(UP,forward).normalize();
  const top=new THREE.Vector3().crossVectors(forward,wingAxis).normalize();
  const before=flight.getTangentAt(clamp((time-.12)/BRAND_FLIGHT.dock));
  const after=flight.getTangentAt(clamp((time+.12)/BRAND_FLIGHT.dock));
  const yawRate=after.sub(before).divideScalar(.24).dot(wingAxis);
  const bank=Math.max(-.6,Math.min(.6,Math.atan(-yawRate*6)));
  const orientation=new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(wingAxis,top,forward));
  orientation.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,0,1),bank));

  const morph=ease((time-BRAND_FLIGHT.morph)/1.1),form=1-morph;
  orientation.slerp(camera.clone().multiply(LOGO),morph);
  const span=mix(72,116,form),physicalWidth=span*AIRCRAFT_SCALE*focal/depth;
  // Only the already forming brand mark is fitted to its fixed header slot.
  const logoFit=ease((time-3.3)/(BRAND_FLIGHT.dock-3.3));
  const projectedWidth=mix(physicalWidth,mark.width,logoFit);
  const scale=projectedWidth*depth/(span*focal);
  return {time,x,y,width:projectedWidth,form,bank,scale,
    position:position.toArray(),forward:forward.toArray(),orientation:orientation.toArray(),camera:camera.toArray(),
    speed:flight.getLength()*distance/BRAND_FLIGHT.dock,
    logo:ease((time-3.63)/.37),light:ease((time-BRAND_FLIGHT.dock)/.95),docked:time>=BRAND_FLIGHT.dock};
}
