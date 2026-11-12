// A small original explorer for the authored map. The host owns input and camera.
export function createExplorer(THREE) {
  const group = new THREE.Group(); group.name = 'You — orange-jacket city explorer'; group.visible = false;
  const position = group.position;
  const body = new THREE.Group(); body.name = 'Explorer articulated body'; group.add(body);
  const resources = new Set();
  const own = resource => { resources.add(resource); return resource; };
  const coat = own(new THREE.MeshStandardMaterial({ color: '#ee6b35', roughness: .68 }));
  const graphite = own(new THREE.MeshStandardMaterial({ color: '#1f2937', roughness: .78 }));
  const skin = own(new THREE.MeshStandardMaterial({ color: '#c99472', roughness: .88 }));
  const white = own(new THREE.MeshStandardMaterial({ color: '#f5f7fa', roughness: .7 }));
  const cube = own(new THREE.BoxGeometry(1, 1, 1));
  const sphere = own(new THREE.SphereGeometry(1, 16, 12));
  const tube = own(new THREE.CylinderGeometry(.5, .5, 1, 12));
  function mesh(parent, name, geo, mat, xyz, scale = [1, 1, 1]) {
    const item = new THREE.Mesh(geo, mat); item.name = name; item.position.set(...xyz); item.scale.set(...scale);
    item.castShadow = true; item.receiveShadow = true; parent.add(item); return item;
  }
  // Fourteen meshes including the contact ring; no floating markers or labels.
  const jacketGeometry = own(new THREE.CylinderGeometry(.15, .135, .33, 14));
  mesh(body, 'Orange jacket', jacketGeometry, coat, [0, .59, 0], [1, 1, .79]);
  mesh(body, 'Face', sphere, skin, [0, .899, .009], [.108, .116, .106]);
  const hairGeometry = own(new THREE.SphereGeometry(.112, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2));
  mesh(body, 'Graphite hair cap', hairGeometry, graphite, [0, .916, .001], [1, 1, 1]);
  mesh(body, 'Neck', tube, skin, [0, .789, 0], [.095, .075, .09]);
  const legs = [], arms = [];
  for (const side of [-1, 1]) {
    const leg = new THREE.Group(); leg.name = `${side < 0 ? 'Left' : 'Right'} leg pivot`; leg.position.set(side * .07, .42, 0); body.add(leg); legs.push(leg);
    mesh(leg, 'Graphite trouser leg', cube, graphite, [0, -.17, 0], [.085, .34, .105]);
    mesh(leg, 'Walking shoe', cube, graphite, [0, -.38, .032], [.105, .08, .17]);
    const arm = new THREE.Group(); arm.name = `${side < 0 ? 'Left' : 'Right'} arm pivot`; arm.position.set(side * .171, .724, 0); body.add(arm); arms.push(arm);
    mesh(arm, 'Orange jacket sleeve', tube, coat, [0, -.14, 0], [.085, .28, .085]);
    mesh(arm, 'Hand', sphere, skin, [0, -.306, 0], [.043, .048, .043]);
  }
  mesh(body, 'Jacket zipper', cube, white, [0, .598, .119], [.017, .24, .012]);
  const shadowMaterial = own(new THREE.MeshBasicMaterial({ color: '#1f2937', transparent: true, opacity: .18, depthWrite: false }));
  const shadow = mesh(group, 'Soft contact ring', own(new THREE.RingGeometry(.18, .29, 40)), shadowMaterial, [0, .006, 0]);
  shadow.rotation.x = -Math.PI / 2; shadow.castShadow = false; shadow.receiveShadow = false;

  const radius = .25, speed = 3;
  const bounds = Object.freeze({ minX: -11.7, maxX: 11.7, minZ: -8.35, maxZ: 7.1 });
  const colliders = [];
  const rect = (name, minX, maxX, minZ, maxZ) => colliders.push(Object.freeze({ type: 'rect', name, minX, maxX, minZ, maxZ }));
  const circle = (name, x, z, r) => colliders.push(Object.freeze({ type: 'circle', name, x, z, radius: r }));

  // Footprints from world-scene.js, city-architecture.js, city-detail.js and city-life.js.
  // The rear street's buildings are intentionally closed; there are no interior doors.
  rect('Rear architectural row', -11.4, 11.4, -8.2, -5.65);
  rect('STADT masonry and plinth', -10.53, -8.17, -4.24, -1.55);
  rect('STADT projecting entrance canopy', -9.9, -8.8, -1.59, -1.10);
  rect('PLANUNG masonry and plinth', -6.09, -3.81, -4.27, -1.63);
  rect('PLANUNG projecting entrance canopy', -5.5, -4.4, -1.67, -1.10);
  rect('Cafe kiosk and serving counter', -10.35, -8.85, 2.53, 3.96);
  rect('Cafe awning supporting edge', -10.23, -8.97, 4.03, 4.13);
  circle('Cafe terrace table', -10.05, 2.1, .35);
  circle('Cafe terrace west chair', -10.51, 2.1, .18);
  circle('Cafe terrace east chair', -9.59, 2.1, .18);
  circle('Fountain water and stone perimeter', 0, 2.28, 2.45);
  rect('Pavilion rear wall', -1.73, 1.73, -3.88, -3.66);
  rect('Pavilion shared table', -1.08, 1.08, -2.93, -1.97);
  for (const x of [-1.61, 1.61]) for (const z of [-3.67, -1.24]) circle('Pavilion column', x, z, .10);
  rect('Atelier rear wall', 2.95, 11.15, -4.04, -3.86);
  rect('Atelier long workbench', 3.25, 10.85, -1.28, .78);
  rect('Atelier incoming tray', 3.12, 4.18, .14, 1.17);
  rect('Atelier outgoing tray', 10.05, 11.11, .14, 1.17);
  for (const x of [3.78, 10.3]) rect('Atelier shelving', x - .56, x + .56, -3.54, -3.01);
  for (const x of [3.1, 10.98]) {
    rect('Atelier side glazing', x - .035, x + .035, -3.28, -2.08);
    circle('Atelier front steel post', x, -1.9, .055);
  }
  for (const x of [3.15, 7.05, 10.95]) rect('Atelier rear timber post', x - .075, x + .075, -3.405, -3.235);
  circle('Atelier round meeting table', 7.3, 2.1, .73);
  for (const x of [6.3, 8.29]) circle('Atelier meeting stool', x, 2.16, .30);
  rect('Atelier planted garden', 3.8, 6.2, 3.2, 4.4);
  // Thin sign boards are physical obstructions but leave routes around their ends.
  rect('Traffic district sign', -8.88, -5.52, 5.69, 5.81);
  rect('Workforce district sign', 4.25, 9.95, 4.55, 4.67);
  rect('Street bench by traffic square', -6.06, -4.84, 1.66, 2.42);
  rect('Street bench beside kiosk', -8.94, -8.46, 3.07, 4.23);
  rect('Bicycle stands', -8.8, -8.06, 2.42, 2.85);
  circle('Mailbox', -10.15, 1.7, .20);
  for (const [x, z] of [[-9.1, 4.1], [-5.1, 1.55]]) circle('Street bin', x, z, .14);
  // Allow entering a shelter and walking past it. Do not block the whole platform.
  for (const x of [-6, 6]) {
    rect('Tram shelter glass back', x - 1.12, x + 1.12, 6.18, 6.24);
    rect('Tram shelter bench', x - .89, x + .89, 6.30, 6.73);
    for (const dx of [-1.12, 1.12]) for (const z of [6.24, 6.92]) circle('Tram shelter post', x + dx, z, .045);
    circle('Tram stop marker post', x + 1.45, 6.81, .045);
  }
  for (const [x, z] of [[-10.3, -1.05], [-4.2, -1.1], [-9.25, 1.78], [-4.9, 3.05], [-5.5, 4.02], [-1.7, 4.35], [1.7, 4.35], [-1.5, -4.7], [1.55, -4.75], [3.05, 3.6], [10.65, 3.55], [11.47, -3.3], [2.65, -3.25]]) circle('Tree planter and trunk', x, z, .35);
  for (const [x, z] of [[-10.55, -1.2], [-5.9, -4.15], [-10.5, 4.1], [-3.88, 1.65], [2.28, -4.55], [11.55, 2.25], [-2.7, 6.8], [2.7, 6.8]]) circle('Street lantern base', x, z, .12);
  for (const [x, z] of [[-8.35, 1.38], [-6.05, -.88], [-8.35, -.88], [-6.05, 1.38]]) circle('Traffic signal pole', x, z, .065);
  for (const x of [-2.2, 2.2]) for (const z of [-1, .05, 3.4]) circle('Boundary bollard', x, z, .095);
  Object.freeze(colliders);

  function canOccupy(x, z) {
    if (!Number.isFinite(x) || !Number.isFinite(z) || x < bounds.minX || x > bounds.maxX || z < bounds.minZ || z > bounds.maxZ) return false;
    for (const collider of colliders) {
      if (collider.type === 'circle') {
        const dx = x - collider.x, dz = z - collider.z, limit = radius + collider.radius;
        if (dx * dx + dz * dz < limit * limit - 1e-10) return false;
      } else {
        const nearestX = Math.max(collider.minX, Math.min(collider.maxX, x));
        const nearestZ = Math.max(collider.minZ, Math.min(collider.maxZ, z));
        const dx = x - nearestX, dz = z - nearestZ;
        if (dx * dx + dz * dz < radius * radius - 1e-10) return false;
      }
    }
    return true;
  }
  function groundHeight(x, z) {
    if (x >= 2.85 && x <= 11.2 && z >= -4.1 && z <= 3.2) return .34;
    if (x >= -1.95 && x <= 1.95 && z >= -4.025 && z <= -.875) return .30;
    return .12;
  }
  let active = false, travelled = 0;
  function neutralPose() { legs.forEach(leg => { leg.rotation.x = 0; }); arms.forEach(arm => { arm.rotation.x = 0; }); body.position.y = 0; }
  function reset() { position.set(0, .12, 6.2); group.rotation.set(0, Math.PI, 0); travelled = 0; neutralPose(); }
  function setActive(value) { active = !!value; group.visible = active; if (!active) neutralPose(); }
  function advanceAxis(axis, delta) {
    if (!delta) return;
    const start = position[axis];
    const minimum = axis === 'x' ? bounds.minX : bounds.minZ, maximum = axis === 'x' ? bounds.maxX : bounds.maxZ;
    const wanted = Math.max(minimum, Math.min(maximum, start + delta));
    const accepts = value => canOccupy(axis === 'x' ? value : position.x, axis === 'z' ? value : position.z);
    if (accepts(wanted)) { position[axis] = wanted; return; }
    // Refine to contact instead of leaving a frame-size gap at a wall.
    let low = 0, high = 1;
    for (let i = 0; i < 12; i++) { const mid = (low + high) / 2; if (accepts(start + (wanted - start) * mid)) low = mid; else high = mid; }
    position[axis] = start + (wanted - start) * low;
  }
  function step(dt, input = { x: 0, z: 0 }, reducedMotion = false) {
    // No updates at all on dt=0, inactive state or invalid elapsed time.
    if (!active || !Number.isFinite(dt) || dt <= 0) return 0;
    const elapsed = Math.min(dt, 1); // Prevent catch-up after a suspended/background tab.
    let x = Number.isFinite(input?.x) ? input.x : 0, z = Number.isFinite(input?.z) ? input.z : 0;
    const magnitude = Math.hypot(x, z); if (magnitude > 1) { x /= magnitude; z /= magnitude; }
    const oldX = position.x, oldZ = position.z;
    const distance = speed * elapsed * Math.hypot(x, z);
    const subdivisions = Math.max(1, Math.ceil(distance / .06));
    const dx = speed * elapsed * x / subdivisions, dz = speed * elapsed * z / subdivisions;
    for (let i = 0; i < subdivisions; i++) {
      // Alternate the leading axis to avoid a persistent directional preference.
      if (i % 2 === 0) { advanceAxis('x', dx); advanceAxis('z', dz); }
      else { advanceAxis('z', dz); advanceAxis('x', dx); }
    }
    position.y = groundHeight(position.x, position.z);
    const actualX = position.x - oldX, actualZ = position.z - oldZ, moved = Math.hypot(actualX, actualZ);
    if (moved > 1e-7) {
      group.rotation.y = Math.atan2(actualX, actualZ); travelled += moved;
      if (!reducedMotion) {
        const phase = travelled * 10.2, gait = Math.sin(phase) * .47;
        legs[0].rotation.x = gait; legs[1].rotation.x = -gait;
        arms[0].rotation.x = -gait * .72; arms[1].rotation.x = gait * .72;
        body.position.y = .014 * (1 - Math.cos(phase * 2));
      } else neutralPose();
    } else neutralPose();
    return moved;
  }
  function nearby() {
    if (!active) return null;
    const trafficDistance = Math.hypot(position.x + 6, position.z - 2.5);
    const workforceDistance = Math.hypot(position.x - 7.1, position.z - 2.1);
    if (trafficDistance <= 3 && trafficDistance <= workforceDistance) return 'traffic';
    if (workforceDistance <= 3) return 'workforce';
    return null;
  }
  reset();
  return { group, position, reset, setActive, step, nearby, colliders, bounds, radius, canOccupy, dispose() { resources.forEach(resource => resource.dispose()); } };
}
