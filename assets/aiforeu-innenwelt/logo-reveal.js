/**
 * Logo -> aircraft camera, before the existing carrier entry.
 *
 * Metres, +Z nose, +Y up. The skin's form=0 is the exact logo in the XZ plane
 * at Y=0. Without exteriorBounds the original 72m / linear-height fit is kept.
 * With measured closed-skin bounds, the envelope expands ahead of the body's
 * smoothstep(form / .8) and retains the logo extents for late canopy/details.
 * This covers linear morphs and local smoothsteps starting by form=.85 and
 * finishing no earlier than form=.8. Real GLB vertices still need validation.
 * Pass the same measured bounds to the subsequent carrier entry.
 *
 * Set camera.up to (0,1,0), apply position/target/fov and skin.setForm(form).
 * Keep skin.setOpen(open) closed during this reveal. At progress=1 the pose is
 * exactly sampleCarrierView('exterior'), so sampleCarrierView('entry', 0)
 * continues without a reset. Reduced motion may start directly at progress=1.
 * No DOM, WebGL, clock, state, or Three dependency.
 */
import { sampleCarrierView, validExteriorBounds } from './interior-camera.js';

export const LOGO_REVEAL_DURATION = 6.4;

const DEG = Math.PI / 180;
const INITIAL_TILT = 2 * DEG;
const INITIAL_FOV = 28;
const clamp = value => Math.max(0, Math.min(1, value));
const ease = value => { const t = clamp(value); return t * t * t * (t * (t * 6 - 15) + 10); };
const mix = (a, b, t) => a + (b - a) * t;
const dot = (a, b) => a.reduce((sum, value, i) => sum + value * b[i], 0);
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const unit = vector => { const length = Math.hypot(...vector); return vector.map(value => value / length); };

const smoothstep = value => { const t = clamp(value); return t * t * (3 - 2 * t); };
function morphBounds(form, exteriorBounds) {
  if (!validExteriorBounds(exteriorBounds)) return { min: [-36, -2.4 * form, -20], max: [36, 10.1 * form, 21.33] };
  const start = { min: [-36, 0, -20], max: [36, 0, 21.33] };
  // Union of a deliberately early expansion and a deliberately late contraction.
  // The product stays >= both linear progress and the body's faster local
  // smoothstep, without introducing a max() kink into the expansion timeline.
  const early = 1 - (1 - form) * (1 - smoothstep(form / .8));
  const late = smoothstep((form - .85) / .15);
  return {
    min: start.min.map((value, i) => Math.min(mix(value, exteriorBounds.min[i], early), mix(value, exteriorBounds.min[i], late))),
    max: start.max.map((value, i) => Math.max(mix(value, exteriorBounds.max[i], early), mix(value, exteriorBounds.max[i], late))),
  };
}

function fitDistance(direction, target, fov, aspect, bounds, inset) {
  const forward = direction.map(value => -value);
  const right = unit(cross(forward, [0, 1, 0]));
  const up = cross(right, forward);
  const vertical = Math.tan(fov * DEG / 2) * inset;
  let distance = 0;
  // Fit the whole morph volume, not just a centre point or the end silhouette.
  for (const x of [bounds.min[0], bounds.max[0]]) for (const y of [bounds.min[1], bounds.max[1]]) for (const z of [bounds.min[2], bounds.max[2]]) {
    const relative = [x - target[0], y - target[1], z - target[2]];
    const depth = dot(relative, forward);
    distance = Math.max(distance, Math.abs(dot(relative, right)) / (vertical * aspect) - depth, Math.abs(dot(relative, up)) / vertical - depth);
  }
  return distance + .2;
}

/**
 * @param {number} progress Normalized reveal time. Values outside [0,1] clamp.
 * @param {{aspect?:number,exteriorBounds?:{min:number[],max:number[]}}} options Canvas aspect and optional measured closed-skin box.
 * @returns {{position:number[],target:number[],fov:number,open:number,form:number}}
 */
export function sampleLogoReveal(progress = 0, { aspect = 1.44, exteriorBounds } = {}) {
  const ratio = Number.isFinite(aspect) && aspect > 0 ? aspect : 1.44;
  const t = Number.isFinite(progress) ? clamp(progress) : 0;
  const end = sampleCarrierView('exterior', 1, { aspect: ratio, exteriorBounds });
  if (t === 1) return { ...end, form: 1 };

  // A brief readable mark, then one uninterrupted orbit. The aircraft finishes
  // forming before the camera settles; there is no spin, roll, or opening yet.
  const motion = ease((t - .1) / .9);
  const form = ease((t - .13) / .72);
  const finalDirection = unit(end.position.map((value, i) => value - end.target[i]));
  const tilt = mix(INITIAL_TILT, Math.acos(finalDirection[1]), motion);
  const measured = validExteriorBounds(exteriorBounds);
  // A front-facing aircraft needs a longer real orbit than the legacy rear
  // view. Cubic ease caps that yaw's peak speed while preserving still ends.
  const yawMotion = measured ? smoothstep((t - .1) / .9) : motion;
  const yaw = Math.atan2(finalDirection[0], -finalDirection[2]) * yawMotion;
  const direction = [Math.sin(yaw) * Math.sin(tilt), Math.cos(tilt), -Math.cos(yaw) * Math.sin(tilt)];
  // Slightly behind the overhead axis gives a stable lookAt with the nose up.
  const target = [0, end.target[1] * motion, mix(.665, end.target[2], motion)];
  const fov = mix(INITIAL_FOV, end.fov, motion);
  const distance = fitDistance(direction, target, fov, ratio, morphBounds(form, exteriorBounds), mix(.9, measured ? .92 : .84, motion));
  return { position: target.map((value, i) => value + direction[i] * distance), target, fov, open: 0, form };
}
