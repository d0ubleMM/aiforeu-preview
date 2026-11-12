/* Small sheet simulation, in metres relative to the paper size. No DOM or render loop.
   Sheets may overlap horizontally; their ordered support heights keep the resting pile layered. */
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const TAU = Math.PI * 2;
export function randomSource(seed = 27) {
  return () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
}

function support(pile) {
  const notes = pile.notes;
  for (let i = 0; i < notes.length; i++) {
    const n = notes[i]; n.floor = .018;
    for (let j = 0; j < i; j++) {
      const o = notes[j], radius = (n.size + o.size) * .36;
      if ((n.x - o.x) ** 2 + (n.z - o.z) ** 2 < radius * radius) n.floor = Math.max(n.floor, o.floor + .037);
    }
  }
}

export function createPile({ compact = false, seed = 20261112 } = {}) {
  const random = randomSource(seed), count = compact ? 32 : 48;
  const pile = { notes: [], compact, bounds: { x: compact ? 2.25 : 5.1, z: 2.65 }, drag: null, awake: false, energy: 0, quiet: 0, age: 0, time: 0 };
  for (let i = 0; i < count; i++) {
    const angle = random() * TAU, radius = Math.sqrt(random()), width = compact ? 1.65 : 3.2;
    pile.notes.push({
      id: i, size: 1.48 + random() * .22,
      x: Math.cos(angle) * radius * width, z: Math.sin(angle) * radius * 1.65,
      y: 0, floor: 0, yaw: (random() - .5) * 1.8,
      pitch: 0, roll: 0, restPitch: (random() - .5) * .035, restRoll: (random() - .5) * .035,
      vx: 0, vy: 0, vz: 0, spin: 0, flutter: 0, curl: .035 + random() * .13,
      color: i % 11 === 2 ? 3 : i % 7 === 3 ? 2 : i % 4 === 0 ? 1 : 0,
      text: i % 12,
    });
  }
  support(pile); settlePile(pile); return pile;
}

function wake(pile) { pile.awake = true; pile.quiet = 0; pile.age = 0; }
export function settlePile(pile) {
  support(pile);
  for (const n of pile.notes) {
    n.y = n.floor; n.vx = n.vy = n.vz = n.spin = n.flutter = 0;
    n.pitch = n.restPitch; n.roll = n.restRoll;
  }
  pile.energy = 0; pile.quiet = 0; pile.awake = false;
}

export function sweepPile(pile, from, to, strength = 1) {
  const dx = to.x - from.x, dz = to.z - from.z, length = Math.hypot(dx, dz);
  if (length < .004) return false;
  const radius = 1.35, candidates = [];
  for (const n of pile.notes) {
    if (pile.drag?.id === n.id) continue;
    const t = clamp(((n.x - from.x) * dx + (n.z - from.z) * dz) / (length * length), 0, 1);
    const x = from.x + dx * t, z = from.z + dz * t;
    const distance = Math.hypot(n.x - x, n.z - z);
    if (distance < radius) candidates.push({ n, x, z, distance, priority: n.floor - distance * .4 });
  }
  candidates.sort((a, b) => b.priority - a.priority);
  for (const { n, x, z, distance } of candidates.slice(0, 9)) {
    const f = (1 - distance / radius) * clamp(length * 3.2, .08, .85) * strength;
    const awayX = (n.x - x) / Math.max(distance, .1), awayZ = (n.z - z) / Math.max(distance, .1);
    n.vx = clamp(n.vx + (dx / length * 2.1 + awayX * .7) * f, -7, 7);
    n.vz = clamp(n.vz + (dz / length * 2.1 + awayZ * .7) * f, -7, 7);
    n.vy = Math.min(3.9, Math.max(n.vy, 0) + f * 3.3);
    n.spin += (awayX * dz - awayZ * dx) * f * 2;
    n.flutter = Math.min(1, n.flutter + f * 1.8);
  }
  if (candidates.length) wake(pile);
  return candidates.length > 0;
}

export function beginDrag(pile, id, point) {
  const n = pile.notes[id]; if (!n) return;
  pile.drag = { id, x: n.x, z: n.z, offsetX: n.x - point.x, offsetZ: n.z - point.z };
  n.vy = 2.4; wake(pile);
}
export function moveDrag(pile, point) {
  if (!pile.drag) return;
  pile.drag.x = clamp(point.x + pile.drag.offsetX, -pile.bounds.x, pile.bounds.x);
  pile.drag.z = clamp(point.z + pile.drag.offsetZ, -pile.bounds.z, pile.bounds.z);
  wake(pile);
}
export function endDrag(pile) { if (pile.drag) { pile.drag = null; wake(pile); } }

export function stepPile(pile, dt) {
  if (!pile.awake) return false;
  dt = clamp(dt, 0, 1 / 20);
  const steps = Math.max(1, Math.ceil(dt * 120)), h = dt / steps;
  let energy = 0;
  for (let step = 0; step < steps; step++) {
    support(pile); energy = 0;
    for (const n of pile.notes) {
      const held = pile.drag?.id === n.id, height = n.y - n.floor;
      if (held) {
        n.vx += ((pile.drag.x - n.x) * 140 - n.vx * 21) * h;
        n.vz += ((pile.drag.z - n.z) * 140 - n.vz * 21) * h;
        n.vy += ((n.floor + .68 - n.y) * 100 - n.vy * 17) * h;
        n.flutter = .55;
      } else {
        n.vy -= 8.6 * h;
        const friction = Math.exp(-(height > .06 ? 1.25 : 9) * h);
        n.vx *= friction; n.vz *= friction; n.spin *= Math.exp(-3.5 * h);
      }
      n.x += n.vx * h; n.z += n.vz * h; n.y += n.vy * h; n.yaw += n.spin * h;
      if (n.y <= n.floor) { n.y = n.floor; n.vy = n.vy < -.6 ? -n.vy * .12 : 0; }
      if (Math.abs(n.x) > pile.bounds.x) { n.x = clamp(n.x, -pile.bounds.x, pile.bounds.x); n.vx *= -.18; }
      if (Math.abs(n.z) > pile.bounds.z) { n.z = clamp(n.z, -pile.bounds.z, pile.bounds.z); n.vz *= -.18; }
      n.pitch += (clamp(n.vz * .095, -.65, .65) + n.restPitch - n.pitch) * Math.min(1, h * 9);
      n.roll += (clamp(-n.vx * .095, -.65, .65) + n.restRoll - n.roll) * Math.min(1, h * 9);
      n.flutter *= Math.exp(-2.7 * h);
      energy += n.vx ** 2 + n.vy ** 2 + n.vz ** 2 + n.spin ** 2 + (n.y - n.floor) ** 2 * 12 + n.flutter ** 2;
    }
    pile.time += h;
  }
  pile.energy = energy / pile.notes.length;
  pile.age += dt;
  pile.quiet = pile.energy < .002 ? pile.quiet + dt : 0;
  if (!pile.drag && (pile.quiet > .2 || pile.age > 7)) settlePile(pile);
  return pile.awake;
}
