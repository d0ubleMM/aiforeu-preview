/**
 * Camera choreography for the AIFOREU carrier, in carrier-local coordinates.
 * +Z is the nose; Y is up. Pass the actual canvas width / height as aspect.
 *
 * Only `entry` consumes progress: 0 is exactly `exterior`, 1 exactly `atrium`.
 * The other views are stable destination poses. The scene owns transitions,
 * reduced motion, rendering and opening-reveal/opening-complete coordination.
 * Set the renderer camera's near plane to <= 0.15 and far plane to >= 1000.
 * `open` controls the roof panels, not the camera or district visibility.
 *
 * The mobile atrium uses the physical front bridge (x +/-3.5, z 8..16.7),
 * rather than pulling the camera back out through the roof. It frames the two
 * entrances. Mobile focus moves into that hall and frames the meaningful core
 * above the detail card; peripheral buildings may leave the frame. Desktop
 * retains the wider architectural view. Move between bridge and hall through
 * [0, 6.3, 7.2], rather than cutting diagonally across the bridge side.
 * No DOM, WebGL, animation clock or library dependencies.
 */

const DEG = Math.PI / 180;
const EYE_HEIGHT = 6.3;
const BRIDGE_END = 16.45;
const INSET = .87;

const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
const mix = (a, b, t) => a + (b - a) * t;
const ease = t => { const x = clamp(t, 0, 1); return x * x * x * (x * (x * 6 - 15) + 10); };
const mix3 = (a, b, t) => a.map((value, index) => mix(value, b[index], t));
const sub = (a, b) => a.map((value, index) => value - b[index]);
const dot = (a, b) => a.reduce((sum, value, index) => sum + value * b[index], 0);
const unit = vector => { const length = Math.hypot(...vector); return vector.map(value => value / length); };
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];

function corners(min, max) {
  const points = [];
  for (const x of [min[0], max[0]]) for (const y of [min[1], max[1]]) for (const z of [min[2], max[2]]) points.push([x, y, z]);
  return points;
}

// Closed carrier, including the canopy peak. Open panels are deliberately not
// included in exterior fitting: the exterior pose always has a closed roof.
const exteriorPoints = corners([-36, -2.4, -20], [36, 10.1, 21.33]);
const entrancePoints = [-6, 6].flatMap(x => corners([x - .7, .2, -1.7], [x + .7, 2.4, -.3]));

function axes(position, target) {
  const forward = unit(sub(target, position));
  const right = unit(cross(forward, [0, 1, 0]));
  return { forward, right, up: cross(right, forward) };
}

function fits(position, target, fov, aspect, points, inset = INSET) {
  const { forward, right, up } = axes(position, target);
  const height = Math.tan(fov * DEG / 2) * inset;
  for (const point of points) {
    const relative = sub(point, position), depth = dot(relative, forward);
    if (depth <= .2 || Math.abs(dot(relative, right)) > depth * height * aspect || Math.abs(dot(relative, up)) > depth * height) return false;
  }
  return true;
}

function exterior(aspect, portrait) {
  const target = [0, 2.8, .5];
  // Portrait turns around the same aircraft, not a separate portrait model.
  const direction = unit(mix3([.1, 1.5, -1], [.8, 1.6, -.55], portrait));
  const fov = mix(40, 46, portrait);
  const { forward, right, up } = axes(direction, [0, 0, 0]);
  const halfHeight = Math.tan(fov * DEG / 2) * .84;
  let distance = 0;
  for (const point of exteriorPoints) {
    const relative = sub(point, target);
    const depth = dot(relative, forward);
    distance = Math.max(distance, Math.abs(dot(relative, right)) / (halfHeight * aspect) - depth, Math.abs(dot(relative, up)) / halfHeight - depth);
  }
  return { position: target.map((value, index) => value + direction[index] * (distance + .2)), target, fov, open: 0 };
}

// Centre the angular silhouette rather than aiming at a Euclidean box centre.
// On a close oblique view the front outer corner occupies more screen space.
function boxTarget(position, points) {
  const vectors = points.map(point => sub(point, position));
  const yawAngles = vectors.map(point => Math.atan2(point[0], -point[2]));
  const yaw = (Math.min(...yawAngles) + Math.max(...yawAngles)) / 2;
  const horizontal = [Math.sin(yaw), 0, -Math.cos(yaw)];
  const pitchAngles = vectors.map(point => Math.atan2(point[1], dot(point, horizontal)));
  const pitch = (Math.min(...pitchAngles) + Math.max(...pitchAngles)) / 2;
  const forward = [horizontal[0] * Math.cos(pitch), Math.sin(pitch), horizontal[2] * Math.cos(pitch)];
  const distance = (1.8 - position[1]) / forward[1];
  return position.map((value, index) => value + forward[index] * distance);
}

function bridgePose({ x, fov, aspect, points, target, start = 7 }) {
  const at = z => {
    const position = [x, EYE_HEIGHT, z];
    return { position, target: target || boxTarget(position, points), fov, open: 1 };
  };
  // Keep the eye inside the real front bridge, including unusually tall
  // viewports. FOV widens only after the available bridge depth is exhausted.
  let end = at(BRIDGE_END);
  while (!fits(end.position, end.target, fov, aspect, points) && fov < 110) {
    fov = Math.min(110, fov + 1);
    end = at(BRIDGE_END);
  }
  let low = start, high = BRIDGE_END;
  for (let i = 0; i < 32; i++) {
    const middle = (low + high) / 2, pose = at(middle);
    if (fits(pose.position, pose.target, fov, aspect, points)) high = middle;
    else low = middle;
  }
  return at(high);
}

function atrium(aspect, portrait) {
  return bridgePose({ x: 0, fov: mix(60, 88, portrait), aspect, points: entrancePoints, target: [0, 1.2, -2.5] });
}

function district(view, aspect, portrait) {
  const side = view === 'traffic' ? -1 : 1;
  if (aspect < 1) {
    // The selected scene is a room to enter, not a box to observe from the
    // far end of the bridge. The crossing / three workstations stay above the
    // mobile detail card. Wider city edges are context, not framing targets.
    const traffic = view === 'traffic';
    const x = traffic ? -5.76 : 5.65;
    const position = [x, EYE_HEIGHT, traffic ? 7.2 : 7.5];
    const target = [x, -2.4, -.2];
    const core = traffic ? corners([-7.4, 0, -1.5], [-4.1, 1.5, 1.75]) : corners([3.15, .95, -.8], [8.1, 2.15, .8]);
    let fov = traffic ? 68 : 80;
    while (!fits(position, target, fov, aspect, core, .9) && fov < 110) fov++;
    return { position, target, fov, open: 1 };
  }
  // Includes animated cars and the highest current building, with small
  // clearance. The full two-district measured envelope is x[-9.772,9.332],
  // y[0,3.936], z[-6.456,4.938]; these per-room boxes are conservative.
  const points = corners([side * 6 - 4, 0, -6.6], [side * 6 + 4, 4.2, 5]);
  return bridgePose({ x: side * 2.6, fov: mix(56, 84, portrait), aspect, points, start: 8.1 });
}

function between(a, b, progress) {
  const t = ease(progress);
  return { position: mix3(a.position, b.position, t), target: mix3(a.target, b.target, t), fov: mix(a.fov, b.fov, t), open: mix(a.open, b.open, t) };
}

function approachAperture(outside, overhead, progress) {
  const t = ease(progress), target = mix3(outside.target, overhead.target, t);
  const dx = outside.position[0] - outside.target[0], dz = outside.position[2] - outside.target[2];
  // A rear approach must turn around the opening before descending. A linear
  // position/target blend would pass almost vertically over the target and
  // flip lookAt's yaw by 180 degrees in a handful of frames.
  const angle = mix(Math.atan2(dz, dx), Math.PI / 2, t);
  const radius = mix(Math.hypot(dx, dz), 3.3, t);
  return {
    position: [target[0] + Math.cos(angle) * radius, mix(outside.position[1], overhead.position[1], t), target[2] + Math.sin(angle) * radius],
    target, fov: mix(outside.fov, overhead.fov, t), open: t,
  };
}

/** @returns {{position: number[], target: number[], fov: number, open: number}} */
export function sampleCarrierView(view = 'exterior', progress = 1, { aspect = 1.44 } = {}) {
  const ratio = Number.isFinite(aspect) && aspect > 0 ? aspect : 1.44;
  const portrait = ease((1.15 - ratio) / .65);
  if (view === 'exterior') return exterior(ratio, portrait);
  if (view === 'atrium') return atrium(ratio, portrait);
  if (view === 'traffic' || view === 'workforce') return district(view, ratio, portrait);
  if (view !== 'entry') throw new RangeError(`Unknown carrier view: ${view}`);

  const t = Number.isFinite(progress) ? clamp(progress, 0, 1) : 0;
  const outside = exterior(ratio, portrait), inside = atrium(ratio, portrait);
  if (t === 0) return outside;
  if (t === 1) return inside;
  const overhead = { position: [0, 18, .8], target: [0, 1, -2.5], fov: mix(60, 76, portrait), open: 1 };
  const through = { position: [0, EYE_HEIGHT, .8], target: [0, 1.2, -3], fov: inside.fov, open: 1 };
  let pose;
  if (t < .42) pose = approachAperture(outside, overhead, t / .42);
  else if (t < .78) pose = between(overhead, through, (t - .42) / .36);
  else pose = between(through, inside, (t - .78) / .22);
  // Fully open before approaching the roof. The opening remains open once
  // inside; the fixed aperture rim and structural frame preserve enclosure.
  pose.open = ease((t - .08) / .3);
  return pose;
}
