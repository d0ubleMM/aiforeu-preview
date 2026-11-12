// Small, authored street life. Static helpers join the host's architectural
// instances; every descendant of a moving object is explicitly dynamic.
export function createCityLife(api) {
  const { THREE, group, m, colors, geometry, mesh, box, cylinder, ball, text, subgroup } = api;
  const city = subgroup(group, 'outer tram and promenade');
  const TAU = Math.PI * 2;
  const clamp = v => Math.min(1, Math.max(0, v));
  const smooth = v => { const p = clamp(v); return p * p * (3 - 2 * p); };
  const phase = (t, a, b) => smooth((t - a) / (b - a));
  const mix = (a, b, t) => a + (b - a) * t;
  const modulo = (v, period) => ((v % period) + period) % period;

  // Rounded rectangle, exact centre line x ±12.3 and z -8.8 / 7.8.
  // Radius 1.4 contains carriage corner overhang within x ±12.8 as well.
  const radius = 1.4;
  const cornerX = 12.3 - radius, frontCorner = 7.8 - radius, backCorner = -8.8 + radius;
  const horizontal = 2 * cornerX;
  const vertical = frontCorner - backCorner;
  const arcLength = Math.PI * radius / 2;
  const routeLength = 2 * horizontal + 2 * vertical + 4 * arcLength;
  const segments = [
    { length: horizontal, x: -cornerX, z: 7.8, dx: 1, dz: 0 },
    { length: arcLength, cx: cornerX, cz: frontCorner, angle: Math.PI / 2 },
    { length: vertical, x: 12.3, z: frontCorner, dx: 0, dz: -1 },
    { length: arcLength, cx: cornerX, cz: backCorner, angle: 0 },
    { length: horizontal, x: cornerX, z: -8.8, dx: -1, dz: 0 },
    { length: arcLength, cx: -cornerX, cz: backCorner, angle: -Math.PI / 2 },
    { length: vertical, x: -12.3, z: backCorner, dx: 0, dz: 1 },
    { length: arcLength, cx: -cornerX, cz: frontCorner, angle: Math.PI },
  ];
  function route(distance) {
    let s = modulo(distance, routeLength);
    let segment = segments[segments.length - 1];
    for (const candidate of segments) {
      segment = candidate;
      if (s <= candidate.length) break;
      s -= candidate.length;
    }
    if (segment.cx === undefined) return {
      x: segment.x + segment.dx * s, z: segment.z + segment.dz * s,
      dx: segment.dx, dz: segment.dz,
    };
    const angle = segment.angle - s / radius;
    return {
      x: segment.cx + Math.cos(angle) * radius,
      z: segment.cz + Math.sin(angle) * radius,
      dx: Math.sin(angle), dz: -Math.cos(angle),
    };
  }
  function offsetPoint(distance, offset) {
    const p = route(distance);
    return { x: p.x - p.dz * offset, z: p.z + p.dx * offset };
  }

  // Rail beds, individual timber sleepers and two continuous steel running rails.
  // Short shared box segments instance well, including around rounded corners.
  const bedCount = Math.ceil(routeLength / .30);
  for (let i = 0; i < bedCount; i++) {
    const p = route((i + .5) * routeLength / bedCount);
    box(city, m.stone, p.x, .041, p.z, .84, .055, routeLength / bedCount + .025,
      { rotation: [0, Math.atan2(p.dx, p.dz), 0] });
  }
  const sleeperCount = Math.ceil(routeLength / .43);
  for (let i = 0; i < sleeperCount; i++) {
    const p = route(i * routeLength / sleeperCount);
    box(city, m.wood, p.x, .081, p.z, .79, .034, .075,
      { rotation: [0, Math.atan2(p.dx, p.dz), 0] });
  }
  const railCount = Math.ceil(routeLength / .22);
  for (let i = 0; i < railCount; i++) {
    for (const gauge of [-.245, .245]) {
      const a = offsetPoint(i * routeLength / railCount, gauge);
      const b = offsetPoint((i + 1) * routeLength / railCount, gauge);
      const dx = b.x - a.x, dz = b.z - a.z;
      box(city, m.metal, (a.x + b.x) / 2, .115, (a.z + b.z) / 2,
        .027, .033, Math.hypot(dx, dz) + .007,
        { rotation: [0, Math.atan2(dx, dz), 0] });
    }
  }

  // Compact cantilevered shelters. They leave x -2..2 completely unobstructed.
  function shelter(x, title, number) {
    const stop = subgroup(city, `${title} tram shelter`, [x, 0, 6.6]);
    box(stop, m.chalk, 0, .065, 0, 2.8, .1, 1.06, { soft: true });
    box(stop, m.wood, 0, 1.4, 0, 2.78, .12, 1.04, { soft: true });
    box(stop, m.roof, 0, 1.48, 0, 2.85, .055, 1.09, { soft: true });
    for (const xSide of [-1.12, 1.12]) {
      box(stop, m.ink, xSide, .77, -.36, .055, 1.36, .055);
      box(stop, m.ink, xSide, .77, .32, .055, 1.36, .055);
    }
    box(stop, m.glass, 0, .86, -.39, 2.18, .99, .027);
    box(stop, m.metal, 0, .35, -.39, 2.25, .035, .055);
    for (const xLeg of [-.67, .67]) box(stop, m.ink, xLeg, .29, -.08, .045, .36, .32);
    box(stop, m.wood, 0, .48, -.08, 1.72, .065, .38, { soft: true });
    box(stop, m.wood, 0, .72, -.26, 1.72, .17, .045, { soft: true });
    box(stop, m.ink, 0, 1.23, .34, 1.47, .27, .055, { soft: true });
    text(stop, title, 0, 1.235, .373, 1.37, .23, { size: 75, color: colors.chalk });
    cylinder(stop, m.ink, 1.45, .67, .21, .043, 1.25);
    box(stop, m.orange, 1.45, 1.29, .21, .31, .38, .085, { soft: true });
    text(stop, number, 1.45, 1.29, .258, .27, .25, { size: 83, color: colors.chalk });
    // Tactile strip marks the boarding edge without introducing a new road.
    for (let n = 0; n < 11; n++) box(stop, m.wood, -1.2 + n * .24, .122, .42, .13, .015, .055);
  }
  shelter(-6, 'STADT', 'H');
  shelter(6, 'ATELIER', 'H');

  function rod(parent, mat, a, b, diameter, dynamic = false) {
    const from = new THREE.Vector3(...a), to = new THREE.Vector3(...b);
    const delta = to.clone().sub(from);
    const item = mesh(parent, geometry.cylinder, mat,
      from.clone().add(to).multiplyScalar(.5).toArray(),
      [diameter, delta.length(), diameter], [0, 0, 0], dynamic);
    item.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.normalize());
    return item;
  }

  const tram = subgroup(city, 'two carriage autumn tram');
  const carriageData = [];
  function carriage(index) {
    const car = subgroup(tram, index === 0 ? 'leading tram carriage' : 'trailing tram carriage');
    const dynamic = { dynamic: true, soft: true };
    box(car, m.ink, 0, .275, 0, .65, .13, 1.22, dynamic);
    box(car, m.orange, 0, .43, 0, .75, .24, 1.28, dynamic);
    box(car, m.chalk, 0, .7, 0, .73, .34, 1.23, dynamic);
    box(car, m.stone, 0, .915, 0, .76, .1, 1.29, dynamic);
    for (const side of [-1, 1]) {
      for (const z of [-.4, .4]) box(car, m.glass, side * .372, .72, z, .018, .26, .28, { dynamic: true });
      for (const z of [-.39, .39]) cylinder(car, m.ink, side * .288, .23, z, .214, .105,
        { rotation: [0, 0, Math.PI / 2], dynamic: true });
    }
    for (const z of [-.38, .38]) box(car, m.metal, 0, .245, z, .62, .075, .16, { dynamic: true });
    for (const z of [-.625, .625]) box(car, m.glass, 0, .72, z, .55, .25, .016, { dynamic: true });
    // The inner side faces both station platforms along the front straight.
    box(car, m.ink, .373, .62, 0, .014, .47, .38, { dynamic: true });
    const doors = [];
    for (const side of [-1, 1]) {
      const door = box(car, m.glass, .386, .62, side * .098, .018, .46, .184, { dynamic: true });
      doors.push({ door, side });
    }
    for (const x of [-.22, .22]) box(car, m.chalk, x, .43, index === 0 ? .648 : -.648, .1, .06, .017, { dynamic: true });
    box(car, m.metal, 0, .989, -.1, .39, .075, .42, dynamic);
    if (index === 0) {
      const lower = [0, 1.03, -.2], left = [0, 1.18, -.43], right = [0, 1.18, .03], top = [0, 1.35, -.2];
      for (const [a, b] of [[lower, left], [lower, right], [left, top], [right, top]]) rod(car, m.ink, a, b, .028, true);
      box(car, m.metal, 0, 1.36, -.2, .49, .035, .065, { dynamic: true });
    } else {
      // Three bellows folds keep the two separately steered bodies articulated.
      for (const z of [.657, .692, .727]) box(car, m.ink, 0, .59, z, .56, .47, .025, { dynamic: true });
    }
    carriageData.push({ car, doors, offset: index === 0 ? .66 : -.66 });
  }
  carriage(0); carriage(1);

  // Six people total: four quiet walkers and two waiting passengers. Clothing
  // uses the inherited warm neutrals, terracotta and orange, never foliage green.
  const pedestrians = [];
  function pedestrian(name, shirt, spec) {
    const person = subgroup(city, name);
    cylinder(person, shirt, 0, .51, 0, .21, .3, { dynamic: true });
    ball(person, m.wood, 0, .78, 0, .205, [1, 1, 1], true);
    const limbs = [];
    for (const side of [-1, 1]) {
      const leg = subgroup(person, 'walking leg', [side * .057, .38, 0]);
      box(leg, m.ink, 0, -.17, 0, .075, .34, .092, { soft: true, dynamic: true });
      const arm = subgroup(person, 'walking arm', [side * .145, .62, 0]);
      cylinder(arm, shirt, 0, -.13, 0, .06, .26, { dynamic: true });
      limbs.push({ leg, arm, side });
    }
    box(person, m.roof, -.17, .36, -.01, .115, .17, .15, { soft: true, dynamic: true });
    pedestrians.push({ person, limbs, ...spec });
  }
  pedestrian('promenade walker west', m.roof, { a: -10.2, b: -7.9, z: 6.08, duration: 23, offset: 0 });
  pedestrian('promenade walker near city', m.ink, { a: -4.45, b: -3.1, z: 6.08, duration: 19, offset: 6 });
  pedestrian('promenade walker near atelier', m.orange, { a: 3.2, b: 4.6, z: 6.1, duration: 21, offset: 4 });
  pedestrian('promenade walker east', m.wood, { a: 8.05, b: 10.3, z: 6.08, duration: 27, offset: 11 });
  pedestrian('waiting passenger city', m.ink, { a: -5.16, b: -5.16, z: 6.1, duration: 1, offset: 0, waiting: true });
  pedestrian('waiting passenger atelier', m.roof, { a: 5.14, b: 5.14, z: 6.1, duration: 1, offset: 0, waiting: true });

  // A compact cargo bicycle stays on the right-hand promenade. Its local +Z is
  // forward. Shared geometry is used except for one small reused tyre ring.
  const bike = subgroup(city, 'courier bicycle');
  const tyreGeometry = new THREE.TorusGeometry(.16, .021, 5, 16);
  const bikeWheels = [];
  for (const z of [-.4, .4]) {
    const wheel = subgroup(bike, 'bicycle wheel', [0, .22, z]);
    mesh(wheel, tyreGeometry, m.ink, [0, 0, 0], [1, 1, 1], [0, Math.PI / 2, 0], true);
    for (const angle of [0, Math.PI / 2]) box(wheel, m.metal, 0, 0, 0, .014, .29, .016, { rotation: [angle, 0, 0], dynamic: true });
    bikeWheels.push(wheel);
  }
  const pedal = [0, .25, -.02], seat = [0, .54, -.19], head = [0, .54, .23];
  for (const [a, b] of [[pedal, seat], [seat, head], [head, pedal], [seat, [0, .22, -.4]], [pedal, [0, .22, -.4]], [head, [0, .22, .4]]]) rod(bike, m.roof, a, b, .035, true);
  box(bike, m.ink, 0, .575, -.19, .18, .035, .16, { soft: true, dynamic: true });
  rod(bike, m.metal, head, [0, .66, .26], .026, true);
  rod(bike, m.ink, [-.16, .66, .26], [.16, .66, .26], .025, true);
  box(bike, m.orange, 0, .58, -.42, .31, .27, .31, { soft: true, dynamic: true });
  box(bike, m.wood, 0, .723, -.42, .315, .025, .315, { dynamic: true });
  const rider = subgroup(bike, 'courier rider', [0, 0, -.03]);
  box(rider, m.ink, 0, .75, -.1, .21, .3, .16, { soft: true, rotation: [.25, 0, 0], dynamic: true });
  ball(rider, m.wood, 0, .96, -.035, .18, [1, 1, 1], true);
  ball(rider, m.roof, 0, 1.025, -.045, .19, [1.1, .55, 1.08], true);
  for (const side of [-1, 1]) rod(rider, m.ink, [side * .1, .85, -.03], [side * .15, .66, .29], .055, true);
  const riderLegs = [];
  for (const side of [-1, 1]) {
    const leg = subgroup(rider, 'courier pedalling leg', [side * .075, .62, -.1]);
    box(leg, m.roof, 0, -.14, 0, .072, .3, .08, { soft: true, dynamic: true });
    riderLegs.push({ leg, side });
  }

  function update(timeSeconds = 0, { reducedMotion = false } = {}) {
    const rawTime = Number.isFinite(timeSeconds) ? Math.max(0, timeSeconds) : 0;
    const time = reducedMotion ? 2.2 : rawTime;
    const t = modulo(time, 72);
    const stationA = cornerX - 6, stationB = cornerX + 6;
    let distance, doors = 0;
    if (t < 5) {
      distance = stationA;
      doors = phase(t, .35, 1.1) * (1 - phase(t, 3.65, 4.6));
    } else if (t < 15.5) {
      distance = mix(stationA, stationB, phase(t, 5, 15.5));
    } else if (t < 20.5) {
      distance = stationB;
      doors = phase(t, 15.85, 16.6) * (1 - phase(t, 19.15, 20.1));
    } else {
      distance = mix(stationB, stationA + routeLength, phase(t, 20.5, 72));
    }
    carriageData.forEach(({ car, offset, doors: panels }) => {
      const p = route(distance + offset);
      car.position.set(p.x, 0, p.z);
      car.rotation.y = Math.atan2(p.dx, p.dz);
      panels.forEach(({ door, side }) => { door.position.z = side * (.098 + .185 * doors); });
    });

    pedestrians.forEach(({ person, limbs, a, b, z, duration, offset, waiting }) => {
      const cycle = modulo(time + offset, duration) / duration;
      const forward = cycle < .5;
      const progress = smooth(forward ? cycle * 2 : (1 - cycle) * 2);
      const gait = waiting || reducedMotion ? 0 : Math.sin(time * 3.4 + offset) * .28 * Math.abs(Math.sin(cycle * TAU));
      person.position.set(waiting ? a : mix(a, b, progress), 0, z);
      person.rotation.y = waiting ? .12 : forward ? Math.PI / 2 : -Math.PI / 2;
      limbs.forEach(({ leg, arm, side }) => {
        leg.rotation.x = side * gait;
        arm.rotation.x = -side * gait * .7;
      });
    });

    const bikeTime = modulo(time + 5, 30);
    let bikeX, heading, wheelDistance;
    if (bikeTime < 13) {
      const progress = phase(bikeTime, 0, 13);
      bikeX = mix(3.25, 10.5, progress); heading = Math.PI / 2; wheelDistance = progress * 7.25;
    } else if (bikeTime < 15) {
      bikeX = 10.5; heading = mix(Math.PI / 2, Math.PI * 1.5, phase(bikeTime, 13, 15)); wheelDistance = 7.25;
    } else if (bikeTime < 28) {
      const progress = phase(bikeTime, 15, 28);
      bikeX = mix(10.5, 3.25, progress); heading = Math.PI * 1.5; wheelDistance = 7.25 + progress * 7.25;
    } else {
      bikeX = 3.25; heading = mix(Math.PI * 1.5, Math.PI * 2.5, phase(bikeTime, 28, 30)); wheelDistance = 14.5;
    }
    bike.position.set(bikeX, 0, 5.82);
    bike.rotation.y = heading;
    const cycling = !reducedMotion && (bikeTime < 13 || (bikeTime >= 15 && bikeTime < 28));
    const pedalAngle = cycling ? Math.sin(time * 5) * .34 : 0;
    riderLegs.forEach(({ leg, side }) => { leg.rotation.x = side * pedalAngle; });
    bikeWheels.forEach(wheel => { wheel.rotation.x = -(Math.floor((time + 5) / 30) * 14.5 + wheelDistance) / .16; });
  }
  update(0);
  return { update };
}
