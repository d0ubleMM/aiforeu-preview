// Original AIFOREU geometry: precisely machined, three-branch coupling plates.
// No assets, physics engine, timers, DOM or renderer ownership. Time is absolute.
export function createConnectionSculpture(THREE) {
  const group = new THREE.Group();
  group.name = 'AIFOREU — shared connection sculpture';
  const geometries = new Set(), materials = new Set();
  const geometry = value => { geometries.add(value); return value; };
  const finish = (name, color, options) => {
    const material = new THREE.MeshPhysicalMaterial({ color, roughness: .40, metalness: .55, clearcoat: .06, clearcoatRoughness: .45, specularIntensity: .65, ...options });
    material.name = name; materials.add(material); return material;
  };
  const porcelain = finish('Cool white coated metal', '#e7edf3', { metalness: .28, roughness: .37, clearcoat: .04 });
  const graphite = finish('Machined graphite metal', '#151b24', { metalness: .72, roughness: .36 });
  const orange = finish('AIFOREU orange coated metal', '#e84a16', { metalness: .40, roughness: .34, clearcoat: .08 });
  const titanium = finish('Brushed titanium edges', '#9ba7b4', { metalness: .95, roughness: .38, clearcoat: 0, anisotropy: .50 });
  const silver = finish('Brushed aluminium', '#c5ced8', { metalness: .95, roughness: .33, clearcoat: 0, anisotropy: .62, anisotropyRotation: Math.PI / 2 });
  const steel = finish('Dark cut steel', '#505d6c', { metalness: .86, roughness: .41, clearcoat: 0 });

  function chamferedPath(path, width, height, chamfer, cx = 0, cy = 0) {
    const x = cx - width / 2, y = cy - height / 2, c = Math.min(chamfer, width / 2, height / 2);
    const vertices = [[x+c,y],[x+width-c,y],[x+width,y+c],[x+width,y+height-c],[x+width-c,y+height],[x+c,y+height],[x,y+height-c],[x,y+c]];
    vertices.forEach(([px,py],index) => index ? path.lineTo(px,py) : path.moveTo(px,py));
    path.closePath(); return path;
  }
  function hole(shape, x, y, radius) { const cut = new THREE.Path(); cut.absarc(x, y, radius, 0, Math.PI * 2, true); shape.holes.push(cut); }
  function slot(shape, w, h, c = .06, x = 0, y = 0) { shape.holes.push(chamferedPath(new THREE.Path(), w, h, c, x, y)); }
  function extrude(shape, depth, bevel = .012) {
    const result = new THREE.ExtrudeGeometry(shape, { depth, steps: 1, bevelEnabled: true, bevelSegments: 1, bevelSize: bevel, bevelThickness: bevel, curveSegments: 48 });
    result.translate(0, 0, -depth / 2); result.computeVertexNormals(); return geometry(result);
  }
  function ringShape(radius, bore) { const shape = new THREE.Shape(); shape.absarc(0, 0, radius, 0, Math.PI * 2, false); hole(shape, 0, 0, bore); return shape; }
  function polygonShape(radius, sides = 8, bore = 0) {
    const shape = new THREE.Shape();
    for (let i = 0; i < sides; i++) { const a = (i + .5) * Math.PI * 2 / sides; const x = Math.cos(a) * radius, y = Math.sin(a) * radius; i ? shape.lineTo(x,y) : shape.moveTo(x,y); }
    shape.closePath(); if (bore) hole(shape, 0, 0, bore); return shape;
  }
  function object(parent, name, geo, mat, position = [0, 0, 0], rotation = [0, 0, 0], scale = [1, 1, 1]) {
    const item = new THREE.Mesh(geo, mat); item.name = name;
    item.position.set(...position); item.rotation.set(...rotation); item.scale.set(...scale);
    item.castShadow = true; item.receiveShadow = true; parent.add(item); return item;
  }
  const plateShape = new THREE.Shape();
  [[-.09,1.12],[.09,1.12],[.25,.98],[1.02,-.56],[.97,-.80],[.81,-.90],[-.81,-.90],[-.97,-.80],[-1.02,-.56],[-.25,.98]].forEach(([x,y],i)=>i?plateShape.lineTo(x,y):plateShape.moveTo(x,y));
  plateShape.closePath();
  for (const [x, y] of [[0, .61], [-.60, -.36], [.60, -.36]]) hole(plateShape, x, y, .235);
  const hubGeometry = extrude(plateShape, .49, .016);
  const linkShape = chamferedPath(new THREE.Shape(), 1.23, 4.2, .10);
  hole(linkShape, 0, -1.4, .25); hole(linkShape, 0, 1.4, .25); slot(linkShape, .47, 1.274, .06);
  const linkGeometry = extrude(linkShape, .46, .012);
  const waistedShape = new THREE.Shape();
  [[-.54,-2.1],[.54,-2.1],[.66,-1.98],[.66,-1.04],[.55,-.82],[.55,.82],[.64,1.04],[.64,1.98],[.52,2.1],[-.52,2.1],[-.64,1.98],[-.64,1.04],[-.55,.82],[-.55,-.82],[-.66,-1.04],[-.66,-1.98]].forEach(([x,y],i)=>i?waistedShape.lineTo(x,y):waistedShape.moveTo(x,y));
  waistedShape.closePath();
  hole(waistedShape, 0, -1.4, .25); hole(waistedShape, 0, 1.4, .25); slot(waistedShape, .43, 1.274, .06);
  const waistedGeometry = extrude(waistedShape, .49, .012);
  const topShape = chamferedPath(new THREE.Shape(), 1.38, 2.35, .10);
  hole(topShape, 0, -.75, .25); hole(topShape, 0, .75, .25); slot(topShape, .57, .6375, .06);
  const topGeometry = extrude(topShape, .50, .012);
  const flangeGeometry = extrude(polygonShape(.47, 8, .235), .105, .010);
  const sleeveGeometry = extrude(ringShape(.232, .17), .52, .008);
  const bearingGeometry = extrude(ringShape(.283, .226), .04, .008);
  const capGeometry = extrude(polygonShape(.51, 8, .255), .34, .012);
  const pinGeometry = geometry(new THREE.CylinderGeometry(.195, .195, 1.15, 48));
  const headGeometry = extrude(polygonShape(.305, 6), .12, .008);
  const screwSlotGeometry = geometry(new THREE.BoxGeometry(.23, .025, .014));
  const indexGeometry = geometry(new THREE.BoxGeometry(.055, .12, .018));
  const shoeShape = chamferedPath(new THREE.Shape(), 1.42, .74, .10); slot(shoeShape, .94, .33, .06);
  const shoeGeometry = extrude(shoeShape, .37, .012);
  const railGeometry = geometry(new THREE.BoxGeometry(.09, .35, .055));

  const modules = [];
  function module(name, initial, final, rotation, finalRotation, start, end) {
    const part = new THREE.Group(); part.name = name; group.add(part);
    const initialQuaternion = new THREE.Quaternion().setFromEuler(new THREE.Euler(...rotation));
    const finalQuaternion = new THREE.Quaternion().setFromEuler(new THREE.Euler(...finalRotation));
    modules.push({ part, initial: new THREE.Vector3(...initial), final: new THREE.Vector3(...final), initialQuaternion, finalQuaternion, start, end });
    return part;
  }

  const hub = module('01 — three-port graphite junction', [.08, -.15, -.20], [0, 0, 0], [.13, -.24, -.10], [0, 0, 0], 0, .36);
  object(hub, 'Bored graphite junction casting', hubGeometry, graphite);
  for (const [i, x, y] of [[0, 0, .61], [1, -.60, -.36], [2, .60, -.36]]) {
    object(hub, `Pressed hub bearing ${i + 1}`, bearingGeometry, steel, [x, y, .294]);
  }

  const outwardLeft = new THREE.Vector3(-.9701425, -.2425356, 0);
  const outwardRight = new THREE.Vector3(.9701425, -.2425356, 0);
  const pivotLeft = new THREE.Vector3(-.60, -.36, 0), pivotRight = new THREE.Vector3(.60, -.36, 0);
  const leftCenter = pivotLeft.clone().addScaledVector(outwardLeft, 1.4); leftCenter.z = .42;
  const rightCenter = pivotRight.clone().addScaledVector(outwardRight, 1.4); rightCenter.z = .42;
  const leftAngle = Math.atan2(-outwardLeft.x, outwardLeft.y), rightAngle = Math.atan2(-outwardRight.x, outwardRight.y);
  const left = module('02 — white long-slot plate', [-2.50, .08, -.05], leftCenter.toArray(), [.27, -.18, 1.15], [0, 0, leftAngle], .08, .62);
  object(left, 'White chamfered slotted plate', linkGeometry, porcelain);
  // The actual bores remain round; no nonuniform scaling of drilled geometry.
  for (const y of [-1.4, 1.4]) object(left, `Long-branch bearing ${y < 0 ? 'inner' : 'outer'}`, bearingGeometry, silver, [0, y, .292]);

  const right = module('03 — orange waisted plate', [2.48, .13, -.10], rightCenter.toArray(), [-.21, .19, -1.0], [0, 0, rightAngle], .18, .70);
  object(right, 'Orange machined waisted plate', waistedGeometry, orange);
  for (const y of [-1.4, 1.4]) object(right, `Orange-branch bearing ${y < 0 ? 'inner' : 'outer'}`, bearingGeometry, titanium, [0, y, .31]);

  const top = module('04 — short white crown plate', [.54, 1.34, -.32], [0, 1.36, .42], [-.20, .26, -.46], [0, 0, 0], .12, .66);
  object(top, 'Short crown clevis with rectangular aperture', topGeometry, porcelain);
  for (const y of [-.75, .75]) object(top, `Crown bearing ${y < 0 ? 'inner' : 'outer'}`, bearingGeometry, steel, [0, y, .315]);

  function axle(name, initial, final, rotation, start) {
    const part = module(name, initial, final, rotation, [0, 0, 0], start, start + .30);
    object(part, 'Precision through-axle', pinGeometry, silver, [0, 0, -.045], [Math.PI / 2, 0, 0]);
    object(part, 'Hexagonal machined axle head', headGeometry, silver, [0, 0, .53]);
    object(part, 'Recessed straight drive slot', screwSlotGeometry, graphite, [0, 0, .598]);
    object(part, 'Rear axle retaining collar', flangeGeometry, steel, [0, 0, -.68], [0, 0, 0], [.63, .63, 1]);
    return part;
  }
  axle('05 — left branch through-axle', [-3.75, -1.92, .10], [-.60, -.36, .28], [.2, -.55, -.4], .48);
  axle('06 — right branch through-axle', [3.72, -1.88, .20], [.60, -.36, .28], [-.25, .5, .4], .55);
  axle('07 — crown through-axle', [-1.30, 2.02, .30], [0, .61, .28], [.45, -.25, -.2], .51);

  const leftEnd = pivotLeft.clone().addScaledVector(outwardLeft, 2.8); leftEnd.z = .69;
  const rightEnd = pivotRight.clone().addScaledVector(outwardRight, 2.8); rightEnd.z = .69;
  function endCoupling(name, initial, final, rotation, mat, start, finalAngle = 0) {
    const part = module(name, initial, final, rotation, [0, 0, finalAngle], start, Math.min(.99, start + .31));
    object(part, 'Coated port flange with through-bore', capGeometry, mat);
    object(part, 'Exposed metal port sleeve', sleeveGeometry, silver, [0, 0, -.14]);
    object(part, 'Machined front rim', flangeGeometry, titanium, [0, 0, .22], [0, 0, 0], [.80, .80, .55]);
    for (let n = 0; n < 3; n++) {
      const a = n * Math.PI * 2 / 3;
      object(part, `Port alignment index ${n + 1}`, indexGeometry, mat === graphite ? silver : graphite, [Math.sin(a) * .42, Math.cos(a) * .42, .225], [0, 0, -a]);
    }
    return part;
  }
  endCoupling('08 — left graphite system port', [-3.90, 1.67, .14], leftEnd.toArray(), [.40, -.32, .38], graphite, .63, leftAngle);
  endCoupling('09 — right white system port', [3.83, 1.73, -.10], rightEnd.toArray(), [-.38, .3, -.30], porcelain, .69, rightAngle);
  endCoupling('10 — crown orange system port', [1.84, 2.03, .10], [0, 2.11, .69], [.35, .25, .55], orange, .66);

  const shoe = module('11 — titanium bridge lock', [-.12, -2.26, .14], [0, -.88, .43], [.14, -.18, .21], [0, 0, 0], .72, 1);
  object(shoe, 'Titanium bridge shoe with true rectangular slot', shoeGeometry, titanium);
  for (const x of [-.57, .57]) object(shoe, `Bridge lock shoulder ${x < 0 ? 'left' : 'right'}`, railGeometry, silver, [x, .03, .24]);

  const clamp = value => Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
  const smooth = value => { const v = clamp(value); return v * v * (3 - 2 * v); };
  const pointerVector = new THREE.Vector3(), repulsion = new THREE.Vector3();
  const tempQuaternion = new THREE.Quaternion(), tiltQuaternion = new THREE.Quaternion();
  const tiltEuler = new THREE.Euler();
  function update(time, { progress = 0, pointer = { x: 0, y: 0 }, reducedMotion = false } = {}) {
    const p = clamp(progress);
    const px = reducedMotion ? 0 : Math.max(-1, Math.min(1, Number.isFinite(pointer?.x) ? pointer.x : 0));
    const py = reducedMotion ? 0 : Math.max(-1, Math.min(1, Number.isFinite(pointer?.y) ? pointer.y : 0));
    pointerVector.set(px * 4, py * 2.4, 0);
    const openness = (1 - p) * (1 - p);
    modules.forEach(entry => {
      const raw = clamp((p - entry.start) / (entry.end - entry.start));
      // Orient first, translate on a straight approach, then seat axially by .22.
      // No time-driven drift, elastic overshoot or curved/bouncing trajectories.
      const alignment = smooth(raw / .25);
      const approach = smooth((raw - .15) / .70);
      const seating = smooth((raw - .85) / .15);
      entry.part.position.copy(entry.initial).lerp(entry.final, approach);
      entry.part.position.z += .22 * approach * (1 - seating);
      tempQuaternion.slerpQuaternions(entry.initialQuaternion, entry.finalQuaternion, alignment);
      repulsion.copy(entry.part.position).sub(pointerVector); repulsion.z = 0;
      const distanceSquared = repulsion.lengthSq();
      const proximity = Math.exp(-distanceSquared / 3.1) * Math.min(1, Math.hypot(px, py) * 1.5);
      if (distanceSquared > 1e-8) entry.part.position.addScaledVector(repulsion.normalize(), .055 * proximity * openness);
      entry.part.position.z += .025 * proximity * openness;
      tiltEuler.set(py * .014 * proximity * openness, -px * .018 * proximity * openness, 0);
      tiltQuaternion.setFromEuler(tiltEuler); entry.part.quaternion.copy(tempQuaternion).multiply(tiltQuaternion);
    });
    group.rotation.set(py * .012, px * .016, 0);
  }
  update(0, { progress: 0 });
  return {
    group, update,
    dispose() { geometries.forEach(item => item.dispose()); materials.forEach(item => item.dispose()); },
  };
}
