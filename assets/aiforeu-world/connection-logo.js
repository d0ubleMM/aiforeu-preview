// The assembled mechanism's own edges resolve into the actual AIFOREU mark.
// Geometry only: the host owns progress, playback, renderer and accessibility.
// Coordinates below come directly from assets/aiforeu-mark.svg.
export function createConnectionLogo(THREE, sculpture) {
  if (!sculpture?.group || typeof sculpture.update !== 'function') {
    throw new TypeError('The logo reveal requires the actual connection sculpture.');
  }
  const group = new THREE.Group();
  group.name = 'AIFOREU — model edges to original mark';
  // Deliberately remain in the model's native coordinate system. The host
  // rotates hardware and outline together before flattening the mark.

  const scale = 6.6 / 216;
  const centerY = 86;
  const outer = [[128, 24], [236, 148], [200, 128], [176, 148], [128, 116], [80, 148], [56, 128], [20, 148]];
  const left = [[128, 24], [20, 148], [56, 128], [80, 148], [128, 116]];
  const rightSide = outer.slice(0, 5);
  const clamp = value => Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
  const smooth = value => { const t = clamp(value); return t * t * (3 - 2 * t); };
  const graphite = new THREE.Color('#0e1113');
  const orange = new THREE.Color('#e84a16');
  const geometries = new Set(), materials = new Set();

  const epsilon = 1e-6;
  const distanceXY = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
  const interpolate = (a, b, t) => a.map((value, axis) => value + (b[axis] - value) * t);
  const cross = (ax, ay, bx, by) => ax * by - ay * bx;
  const signedArea = points => points.reduce((area, point, index) => {
    const next = points[(index + 1) % points.length];
    return area + point[0] * next[1] - next[0] * point[1];
  }, 0) / 2;

  sculpture.update(0, { progress: 1, pointer: { x: 0, y: 0 }, reducedMotion: true });
  sculpture.group.updateWorldMatrix(true, true);
  const inverseModel = sculpture.group.matrixWorld.clone().invert();
  function frontContour(mesh, path) {
    mesh.geometry.computeBoundingBox();
    const front = mesh.geometry.boundingBox.max.z;
    const transform = new THREE.Matrix4().multiplyMatrices(inverseModel, mesh.matrixWorld);
    const points = path.getPoints(mesh.geometry.parameters.options.curveSegments || 48)
      .map(point => new THREE.Vector3(point.x, point.y, front).applyMatrix4(transform).toArray());
    if (distanceXY(points[0], points[points.length - 1]) < epsilon) points.pop();
    return points;
  }
  const bodyNames = new Set(['Bored graphite junction casting', 'White chamfered slotted plate',
    'Orange machined waisted plate', 'Short crown clevis with rectangular aperture',
    'Coated port flange with through-bore', 'Titanium bridge shoe with true rectangular slot']);
  const polygons = [];
  sculpture.group.traverse(mesh => {
    if (!mesh.isMesh || !bodyNames.has(mesh.name)) return;
    const polygon = frontContour(mesh, mesh.geometry.parameters.shapes);
    if (signedArea(polygon) < 0) polygon.reverse();
    polygons.push(polygon);
  });
  if (polygons.length < 6) throw new Error('The connection model is missing its authored body contours.');

  function inside(point, polygon) {
    let result = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const a = polygon[i], b = polygon[j];
      if ((a[1] > point[1]) !== (b[1] > point[1])
        && point[0] < (b[0] - a[0]) * (point[1] - a[1]) / (b[1] - a[1]) + a[0]) result = !result;
    }
    return result;
  }
  const insideUnion = point => polygons.some(polygon => inside(point, polygon));
  const edges = polygons.flatMap(polygon => polygon.map((a, index) => ({ a, b: polygon[(index + 1) % polygon.length] })));
  const exterior = new Map();
  const key = point => `${Math.round(point[0] / epsilon)},${Math.round(point[1] / epsilon)}`;
  for (const edge of edges) {
    const { a, b } = edge, dx = b[0] - a[0], dy = b[1] - a[1], length = Math.hypot(dx, dy);
    const cuts = [0, 1];
    for (const other of edges) {
      const cx = other.a[0] - a[0], cy = other.a[1] - a[1];
      const ox = other.b[0] - other.a[0], oy = other.b[1] - other.a[1];
      const denominator = cross(dx, dy, ox, oy);
      if (Math.abs(denominator) > epsilon) {
        const t = cross(cx, cy, ox, oy) / denominator, u = cross(cx, cy, dx, dy) / denominator;
        if (t > epsilon && t < 1 - epsilon && u >= -epsilon && u <= 1 + epsilon) cuts.push(t);
      } else if (Math.abs(cross(cx, cy, dx, dy)) < epsilon) {
        for (const point of [other.a, other.b]) {
          const t = ((point[0] - a[0]) * dx + (point[1] - a[1]) * dy) / (length * length);
          if (t > epsilon && t < 1 - epsilon) cuts.push(t);
        }
      }
    }
    cuts.sort((a, b) => a - b);
    for (let n = 1; n < cuts.length; n++) {
      if (cuts[n] - cuts[n - 1] < epsilon) continue;
      const mid = interpolate(a, b, (cuts[n] + cuts[n - 1]) / 2);
      const offsetX = -dy / length * epsilon * 8, offsetY = dx / length * epsilon * 8;
      const leftInside = insideUnion([mid[0] + offsetX, mid[1] + offsetY]);
      const rightInside = insideUnion([mid[0] - offsetX, mid[1] - offsetY]);
      if (leftInside === rightInside) continue;
      let from = interpolate(a, b, cuts[n - 1]), to = interpolate(a, b, cuts[n]);
      if (!leftInside) [from, to] = [to, from];
      const id = `${key(from)}:${key(to)}`, existing = exterior.get(id);
      if (!existing || from[2] > existing.a[2]) exterior.set(id, { a: from, b: to });
    }
  }
  // Chain the boundary segments; overlap intersections retain their real
  // component depths. No line is invented across a gap between front faces.
  const unused = new Set(exterior.values()), loops = [];
  while (unused.size) {
    const start = unused.values().next().value, loop = [start]; unused.delete(start);
    let end = start.b;
    while (distanceXY(end, start.a) > epsilon * 4) {
      const next = [...unused].find(segment => distanceXY(segment.a, end) < epsilon * 4);
      if (!next) throw new Error('The connection model exterior is not closed.');
      loop.push(next); unused.delete(next); end = next.b;
    }
    loops.push(loop);
  }
  loops.sort((a, b) => Math.abs(signedArea(b.map(edge => edge.a))) - Math.abs(signedArea(a.map(edge => edge.a))));
  const boundary = loops[0].flatMap(edge => {
    const t = -edge.a[0] / (edge.b[0] - edge.a[0]);
    if (Number.isFinite(t) && t > epsilon && t < 1 - epsilon) {
      const point = interpolate(edge.a, edge.b, t);
      return [{ a: edge.a, b: point }, { a: point, b: edge.b }];
    }
    return [edge];
  });
  let topIndex = -1;
  boundary.forEach((edge, index) => {
    if (Math.abs(edge.a[0]) < epsilon && (topIndex < 0 || edge.a[1] > boundary[topIndex].a[1])) topIndex = index;
  });
  if (topIndex < 0) throw new Error('The connection model has no crown axis.');
  const ordered = boundary.slice(topIndex).concat(boundary.slice(0, topIndex));
  let bottomIndex = 0;
  ordered.forEach((edge, index) => {
    if (Math.abs(edge.a[0]) < epsilon && edge.a[1] < ordered[bottomIndex].a[1]) bottomIndex = index;
  });
  if (!bottomIndex) throw new Error('The connection model has no lower axis.');
  const firstSide = ordered.slice(0, bottomIndex);
  const secondSide = ordered.slice(bottomIndex).reverse().map(edge => ({ a: edge.b, b: edge.a }));
  const averageX = side => side.reduce((sum, edge) => sum + edge.a[0] + edge.b[0], 0) / side.length;
  const sourceLeft = averageX(firstSide) < averageX(secondSide) ? firstSide : secondSide;
  const sourceRight = sourceLeft === firstSide ? secondSide : firstSide;
  const crown = sculpture.group.children.find(object => object.name.includes('crown orange system port'));
  const rim = crown?.getObjectByName('Machined front rim');
  if (!rim) throw new Error('The connection model is missing its crown aperture.');
  const bore = frontContour(rim, rim.geometry.parameters.shapes.holes[0]);
  const sourceBore = bore.map((a, index) => ({ a, b: bore[(index + 1) % bore.length] }));
  const targetEdges = points => points.slice(1).map((b, index) => ({ a: points[index], b }));
  const toMark = points => points.map(([x, y]) => [(x - 128) * scale, (centerY - y) * scale, 0]);
  const targetCircle = [];
  for (let n = 0; n <= 144; n++) {
    const angle = -n / 144 * Math.PI * 2;
    targetCircle.push([Math.cos(angle) * 24 * scale, (centerY - 88) * scale + Math.sin(angle) * 24 * scale, 0]);
  }

  function parameterize(edges) {
    let length = 0;
    const pieces = edges.map(edge => { const start = length; length += distanceXY(edge.a, edge.b); return { ...edge, start, end: length }; });
    pieces.forEach(piece => { piece.start /= length; piece.end /= length; });
    return pieces;
  }
  function pairedSamples(sourceEdges, targetEdges) {
    const from = parameterize(sourceEdges), to = parameterize(targetEdges);
    // Both sets of corner parameters survive. Sampling only one of the paths
    // would either round the original machined edges or clip the logo notches.
    const all = [0, 1, ...from.map(piece => piece.end), ...to.map(piece => piece.end),
      ...Array.from({ length: 161 }, (_, index) => index / 160)].sort((a, b) => a - b);
    const knots = all.filter((t, index) => !index || t - all[index - 1] > 1e-8);
    const source = [], target = [], breaks = new Set();
    const pointAt = (piece, t) => interpolate(piece.a, piece.b, clamp((t - piece.start) / (piece.end - piece.start)));
    for (let n = 1; n < knots.length; n++) {
      const a = knots[n - 1], b = knots[n], mid = (a + b) / 2;
      const sourcePiece = from.find(piece => mid <= piece.end), targetPiece = to.find(piece => mid <= piece.end);
      const start = pointAt(sourcePiece, a), targetStart = pointAt(targetPiece, a);
      const last = source[source.length - 1];
      if (!last || Math.hypot(...last.map((value, axis) => value - start[axis])) > epsilon) {
        if (last) breaks.add(source.length - 1);
        source.push(start); target.push(targetStart);
      }
      source.push(pointAt(sourcePiece, b)); target.push(pointAt(targetPiece, b));
    }
    return { source, target, breaks };
  }

  function strand(name, samples, color, delay, closed = false) {
    const count = samples.source.length, source = new Float32Array(samples.source.flat()), target = new Float32Array(samples.target.flat());
    const centers = new Float32Array(count * 3), positions = new Float32Array(count * 6);
    const indices = new Uint16Array((count - 1) * 6);
    for (let n = 0; n < count; n++) {
      if (n < count - 1 && !samples.breaks.has(n)) {
        const base = n * 2;
        indices.set([base, base + 1, base + 2, base + 1, base + 3, base + 2], n * 6);
      }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3).setUsage(THREE.DynamicDrawUsage));
    geometry.setIndex(new THREE.BufferAttribute(indices, 1));
    geometry.setDrawRange(0, 0); geometries.add(geometry);
    const material = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0, side: THREE.DoubleSide,
      depthTest: true, depthWrite: false, toneMapped: false,
      polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
    materials.add(material);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = name; mesh.frustumCulled = false; mesh.renderOrder = 5;
    group.add(mesh);
    return { mesh, geometry, material, count, source, target, centers, positions, delay, closed, color: new THREE.Color(color) };
  }

  const strands = [
    strand('Left contour — actual machined exterior', pairedSamples(sourceLeft, targetEdges(toMark(left))), graphite, 0),
    strand('Right contour — actual machined exterior', pairedSamples(sourceRight, targetEdges(toMark(rightSide))), graphite, .055),
    strand('Crown aperture — actual port bore', pairedSamples(sourceBore, targetEdges(targetCircle)), orange, .11, true),
  ];

  const shape = new THREE.Shape();
  outer.forEach(([x, y], index) => index
    ? shape.lineTo((x - 128) * scale, (centerY - y) * scale)
    : shape.moveTo((x - 128) * scale, (centerY - y) * scale));
  shape.closePath();
  const aperture = new THREE.Path();
  aperture.absarc(0, (centerY - 88) * scale, 24 * scale, 0, Math.PI * 2, true);
  shape.holes.push(aperture);
  // A restrained physical thickness survives the later bank/flight without
  // changing the logo's front silhouette or its circular aperture.
  const fillGeometry = new THREE.ExtrudeGeometry(shape, { depth: .08, steps: 1, bevelEnabled: false, curveSegments: 96 });
  fillGeometry.translate(0, 0, -.04);
  const fillMaterial = new THREE.MeshBasicMaterial({ color: graphite, transparent: true, opacity: 0,
    side: THREE.DoubleSide, depthTest: true, depthWrite: false, toneMapped: false });
  const edgeMaterial = new THREE.MeshBasicMaterial({ color: '#27313b', transparent: true, opacity: 0,
    side: THREE.DoubleSide, depthTest: true, depthWrite: false, toneMapped: false });
  const mark = new THREE.Mesh(fillGeometry, [fillMaterial, edgeMaterial]);
  mark.name = 'AIFOREU — original filled mark with circular aperture';
  mark.renderOrder = 4; group.add(mark);
  geometries.add(fillGeometry); materials.add(fillMaterial); materials.add(edgeMaterial);

  // Interpolation is a convex combination of the source and target points.
  // Their extrema therefore cover every intermediate pose. Padding covers
  // the permitted ribbon width and miter extension without frame sampling.
  const bounds = { min: [Infinity, Infinity, Infinity], max: [-Infinity, -Infinity, -Infinity] };
  for (const entry of strands) for (const points of [entry.source, entry.target]) {
    for (let n = 0; n < points.length; n++) {
      const axis = n % 3;
      bounds.min[axis] = Math.min(bounds.min[axis], points[n]);
      bounds.max[axis] = Math.max(bounds.max[axis], points[n]);
    }
  }
  const fitPoints = [];
  for (const x of [bounds.min[0] - .18, bounds.max[0] + .18])
    for (const y of [bounds.min[1] - .18, bounds.max[1] + .18])
      for (const z of [bounds.min[2] - .18, bounds.max[2] + .18]) fitPoints.push([x, y, z]);

  function paintStrand(entry, trace, morph, fill, halfWidth) {
    const { source, target, centers, positions, count, geometry, mesh, material, closed } = entry;
    const reveal = clamp((trace - entry.delay) / (1 - entry.delay));
    mesh.visible = reveal > 0 && fill < 1;
    material.opacity = 1 - fill;
    material.color.copy(entry.color).lerp(graphite, smooth(morph));
    if (!mesh.visible) { geometry.setDrawRange(0, 0); return; }
    const last = count - 1, tip = reveal * last, lastVisible = Math.ceil(tip);
    for (let n = 0; n < centers.length; n++) centers[n] = source[n] + (target[n] - source[n]) * morph;
    // Only the end of the active segment moves while tracing: this avoids
    // visible one-segment jumps when the lines are drawn on a large screen.
    if (lastVisible > 0 && lastVisible < count) {
      const fraction = tip - (lastVisible - 1), at = lastVisible * 3, before = at - 3;
      for (let axis = 0; axis < 3; axis++) centers[at + axis] = centers[before + axis]
        + (centers[at + axis] - centers[before + axis]) * fraction;
    }
    for (let n = 0; n <= lastVisible; n++) {
      const current = n * 3;
      const previous = n === 0 ? (closed && reveal === 1 ? last - 1 : 0) * 3 : current - 3;
      const next = n === lastVisible ? (closed && reveal === 1 ? 1 : n) * 3 : current + 3;
      let ax = centers[current] - centers[previous], ay = centers[current + 1] - centers[previous + 1];
      let bx = centers[next] - centers[current], by = centers[next + 1] - centers[current + 1];
      const lengthA = Math.hypot(ax, ay), lengthB = Math.hypot(bx, by);
      if (lengthA > 1e-8) { ax /= lengthA; ay /= lengthA; }
      if (lengthB > 1e-8) { bx /= lengthB; by /= lengthB; }
      if (lengthA <= 1e-8) { ax = bx; ay = by; }
      if (lengthB <= 1e-8) { bx = ax; by = ay; }
      let nx = -ay - by, ny = ax + bx;
      const normalLength = Math.hypot(nx, ny);
      if (normalLength > 1e-8) { nx /= normalLength; ny /= normalLength; }
      else { nx = -by; ny = bx; }
      const miter = halfWidth / Math.max(.38, Math.abs(nx * -by + ny * bx));
      const at = n * 6;
      positions[at] = centers[current] + nx * miter;
      positions[at + 1] = centers[current + 1] + ny * miter;
      positions[at + 2] = centers[current + 2];
      positions[at + 3] = centers[current] - nx * miter;
      positions[at + 4] = centers[current + 1] - ny * miter;
      positions[at + 5] = centers[current + 2];
    }
    geometry.setDrawRange(0, lastVisible * 6);
    geometry.attributes.position.needsUpdate = true;
  }

  let previousTrace = -1, previousMorph = -1, previousFill = -1, previousWidth = -1;
  function update({ trace = 0, morph = 0, fill = 0, strokeWidth = .018 } = {}) {
    const t = clamp(trace), m = clamp(morph), f = clamp(fill);
    const width = Math.min(.12, Math.max(.001, Number.isFinite(strokeWidth) ? strokeWidth : .018));
    if (t === previousTrace && m === previousMorph && f === previousFill && width === previousWidth) return;
    previousTrace = t; previousMorph = m; previousFill = f; previousWidth = width;
    group.visible = t > 0 || f > 0;
    mark.visible = f > 0; fillMaterial.opacity = edgeMaterial.opacity = f;
    for (const entry of strands) paintStrand(entry, t, m, f, width / 2);
  }

  update();
  const outlinePoints = outer.map(([x, y]) => [(x - 128) * scale, (centerY - y) * scale, .04]);
  return { group, update, fitPoints, outlinePoints,
    dispose() { geometries.forEach(geometry => geometry.dispose()); materials.forEach(material => material.dispose()); },
  };
}
