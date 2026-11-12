/* AIFOREU carrier. Metres; +X starboard, +Y up, +Z nose.
 * Exact SVG planform, a real open roof aperture, and a permanent walkable interior.
 * The exterior palette/panel construction follows Claude's modell-flieger.js;
 * this larger airframe has its own geometry so no cockpit bowl crosses the entrance.
 */
export function createCarrier(THREE, k = {}) {
  const F = k.farben || {}, high = k.qualitaet !== 'niedrig' && !k.klein;
  const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
  const clamp = v => Math.max(0, Math.min(1, v));
  const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };
  const TAU = Math.PI * 2, FLOOR = -.4, ROOF = 8.6, OPENING = 8.08;
  const svg = [[128, 24], [236, 148], [200, 128], [176, 148], [128, 116], [80, 148], [56, 128], [20, 148]];
  const contour = svg.map(([x, y]) => [(x - 128) / 3, (88 - y) / 3]);
  const rear = [[0, -28 / 3], [16, -20], [24, -40 / 3], [36, -20]];
  const front = x => 64 / 3 - Math.abs(x) * 31 / 27;
  const aft = x => {
    const a = Math.abs(x);
    for (let i = 1; i < rear.length; i++) if (a <= rear[i][0]) {
      const p = rear[i - 1], q = rear[i]; return p[1] + (q[1] - p[1]) * (a - p[0]) / (q[0] - p[0]);
    }
    return -20;
  };
  const hall = (x, z) => Math.max(
    smooth(16.5, 11, Math.abs(x)) * smooth(-14, -8.5, z) * smooth(14, 9, z),
    smooth(6.3, 3.5, Math.abs(x)) * smooth(5, 8, z) * smooth(20.9, 17.5, z)
  );
  const wing = (x, z) => {
    const d = Math.max(.001, front(x) - aft(x)), t = clamp((z - aft(x)) / d);
    return Math.pow(Math.sin(Math.PI * t), .65) * (1 - Math.abs(x) / 36);
  };
  const skinHeight = (x, z) => {
    const edge = smooth(0, .55, Math.min(front(x) - z, z - aft(x)));
    return .09 + 1.0 * wing(x, z) + (ROOF - .09 - wing(x, z)) * hall(x, z) * edge;
  };
  const ceilingHeight = (x, z) => skinHeight(x, z) - (.12 + .45 * hall(x, z));
  const bellyHeight = (x, z) => -.56 - 1.65 * hall(x, z) * smooth(0, .9, Math.min(front(x) - z, z - aft(x))) - .22 * wing(x, z);

  const geometries = new Set(), materials = new Set(), textures = new Set();
  const geo = g => (geometries.add(g), g);
  const mat = m => (materials.add(m), m);
  const texture = (size, paint, color = true) => {
    const c = document.createElement('canvas'); c.width = c.height = size;
    paint(c.getContext('2d'), size);
    const t = new THREE.CanvasTexture(c); if (color) t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8; textures.add(t); return t;
  };
  const outerMap = texture(1024, (c, n) => {
    const X = x => (x + 36) / 72 * n, Z = z => (64 / 3 - z) / (124 / 3) * n;
    const path = points => { c.beginPath(); points.forEach(([x, z], i) => i ? c.lineTo(X(x), Z(z)) : c.moveTo(X(x), Z(z))); };
    c.fillStyle = '#394350'; c.fillRect(0, 0, n, n);
    path(contour); c.closePath(); c.save(); c.clip();
    const bands = [0, 6, 11, 16, 24, 30, 36], tones = ['#3a4552', '#414c5a', '#333e4c', '#3c4856'];
    for (const s of [-1, 1]) for (let i = 0; i < bands.length - 1; i++) {
      const a = bands[i], b = bands[i + 1], f = [.08, .31, .65, .91];
      for (let j = 0; j < f.length - 1; j++) {
        const p = (x, t) => [s * x, aft(x) + (front(x) - aft(x)) * t];
        path([p(a, f[j]), p(b, f[j]), p(b, f[j + 1]), p(a, f[j + 1])]); c.closePath();
        c.fillStyle = tones[(i + j) % tones.length]; c.fill();
        c.strokeStyle = '#17212c'; c.lineWidth = 1.1; c.stroke();
      }
      path([[s * a, front(a) - .55], [s * b, front(b) - .55]]); c.strokeStyle = '#697787'; c.lineWidth = 2.8; c.stroke();
      path([[s * a, aft(a) + .6], [s * b, aft(b) + .6]]); c.strokeStyle = '#151f29'; c.lineWidth = 2; c.stroke();
      for (const t of [.24, .55, .78]) {
        const x = (a + b) / 2, z = aft(x) + (front(x) - aft(x)) * t;
        c.strokeStyle = '#66717c'; c.lineWidth = .75; c.strokeRect(X(s * x) - 4, Z(z) - 5, 8, 10);
      }
    }
    c.restore();
  });
  const floorMap = texture(512, (c, n) => {
    c.fillStyle = '#293440'; c.fillRect(0, 0, n, n);
    c.fillStyle = '#303c48'; c.fillRect(2, 2, n / 2 - 4, n - 4);
    c.strokeStyle = '#111b26'; c.lineWidth = 3;
    for (const x of [1, n / 2, n - 1]) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, n); c.stroke(); }
    for (const y of [1, n / 2, n - 1]) { c.beginPath(); c.moveTo(0, y); c.lineTo(n, y); c.stroke(); }
    c.fillStyle = '#64707b';
    for (const x of [14, n / 2 - 14, n / 2 + 14, n - 14]) for (const y of [14, n / 2 - 14, n / 2 + 14, n - 14]) { c.beginPath(); c.arc(x, y, 1.5, 0, TAU); c.fill(); }
  });
  floorMap.wrapS = floorMap.wrapT = THREE.RepeatWrapping;
  const material = {
    skin: mat(new THREE.MeshPhysicalMaterial({ map: outerMap, color: '#dce5ef', metalness: .28, roughness: .58, clearcoat: .18, clearcoatRoughness: .4 })),
    belly: mat(new THREE.MeshStandardMaterial({ color: '#202c38', metalness: .45, roughness: .54 })),
    ceiling: mat(new THREE.MeshStandardMaterial({ color: '#526171', metalness: .35, roughness: .52 })),
    floor: mat(new THREE.MeshStandardMaterial({ map: floorMap, color: '#d8e1eb', metalness: .25, roughness: .67 })),
    wall: mat(new THREE.MeshStandardMaterial({ color: '#354352', metalness: .35, roughness: .48 })),
    inset: mat(new THREE.MeshStandardMaterial({ color: '#182430', metalness: .3, roughness: .55 })),
    rib: mat(new THREE.MeshPhysicalMaterial({ color: '#8795a5', metalness: .72, roughness: .32, clearcoat: .25 })),
    ceramic: mat(new THREE.MeshPhysicalMaterial({ color: F.papier || '#e5ebf1', metalness: .1, roughness: .4, clearcoat: .4 })),
    titanium: mat(new THREE.MeshPhysicalMaterial({ color: '#586c80', metalness: .85, roughness: .27 })),
    glass: mat(new THREE.MeshPhysicalMaterial({ color: '#6d7c90', metalness: .2, roughness: .18, clearcoat: 1, transparent: true, opacity: .58, side: THREE.DoubleSide, depthWrite: false })),
    lamp: mat(new THREE.MeshStandardMaterial({ color: '#d9e6f3', emissive: '#c7dbf3', emissiveIntensity: 1.1, roughness: .4, toneMapped: false })),
    amber: mat(new THREE.MeshStandardMaterial({ color: F.orange || '#ee6b35', emissive: F.orange || '#ee6b35', emissiveIntensity: .8, roughness: .4 })),
    engine: mat(new THREE.MeshStandardMaterial({ color: '#101820', metalness: .35, roughness: .65 })),
  };
  const group = new THREE.Group(); group.name = 'aiforeu-carrier';
  const exterior = new THREE.Group(); exterior.name = 'carrier-exterior';
  const interior = new THREE.Group(); interior.name = 'carrier-interior';
  const roof = new THREE.Group(); roof.name = 'carrier-roof';
  const canopy = new THREE.Group(); canopy.name = 'carrier-canopy';
  const leftRoof = new THREE.Group(); leftRoof.name = 'carrier-roof-port';
  const rightRoof = new THREE.Group(); rightRoof.name = 'carrier-roof-starboard';
  group.add(exterior, interior); exterior.add(roof, canopy); roof.add(leftRoof, rightRoof);
  const addMesh = (parent, geometry, m, name, shadow = true) => {
    const o = new THREE.Mesh(geo(geometry), m); o.name = name;
    o.castShadow = shadow; o.receiveShadow = true; parent.add(o); return o;
  };
  const boxGeometry = geo(new THREE.BoxGeometry(1, 1, 1));
  const box = (parent, size, position, m, name) => {
    const o = new THREE.Mesh(boxGeometry, m); o.name = name; o.scale.set(...size); o.position.set(...position); o.castShadow = o.receiveShadow = true; parent.add(o); return o;
  };
  const beam = (parent, a, b, width, depth, m, name) => {
    const d = b.clone().sub(a), o = box(parent, [width, d.length(), depth], a.clone().add(b).multiplyScalar(.5).toArray(), m, name);
    o.quaternion.setFromUnitVectors(V(0, 1, 0), d.normalize()); return o;
  };
  const shape = () => { const s = new THREE.Shape(); contour.forEach(([x, z], i) => i ? s.lineTo(x, -z) : s.moveTo(x, -z)); s.closePath(); return s; };
  const floor = geo(new THREE.ShapeGeometry(shape())); floor.rotateX(-Math.PI / 2); floor.translate(0, FLOOR, 0);
  const fp = floor.attributes.position, fu = floor.attributes.uv;
  for (let i = 0; i < fp.count; i++) fu.setXY(i, fp.getX(i) / 3.6, fp.getZ(i) / 3.6);
  addMesh(interior, floor, material.floor, 'carrier-continuous-floor');

  // One common, corner-preserving strip mesh for the skin and its genuine circular opening.
  // Exact SVG corner X coordinates and the clear-hall edges are included explicitly.
  const step = high ? .9 : 1.4;
  const xs = [-36, -24, -16, -11.6, -11, -8, -3.5, 0, 3.5, 8, 11, 11.6, 16, 24, 36];
  for (let x = -36; x < 36; x += step) xs.push(x);
  const arcSteps = high ? 64 : 40;
  for (let i = 0; i <= arcSteps; i++) xs.push(OPENING * Math.sin(-Math.PI / 2 + Math.PI * i / arcSteps));
  const columns = [...new Set(xs.map(x => +x.toFixed(7)))].sort((a, b) => a - b);
  const criticalZ = [-8.8, -8, 0, 8, 9.5, 16.7, 17.5];
  const rows = (x, part, hole) => {
    const margin = Math.min(.9, Math.max(0, front(x) - aft(x)) / 2);
    const lo = aft(x) + margin, hi = front(x) - margin, middle = Math.max(lo, Math.min(hi, 0));
    const circle = hole && Math.abs(x) < OPENING ? Math.sqrt(OPENING * OPENING - x * x) : 0;
    const a = part ? Math.max(lo, middle + circle) : lo;
    const b = part ? hi : Math.min(hi, middle - circle);
    if (b < a - 1e-6) return [];
    const zs = [a, b, ...criticalZ.filter(z => z > a && z < b)];
    for (let z = Math.ceil(a / step) * step; z < b; z += step) if (z > a) zs.push(z);
    return [...new Set(zs.map(z => +z.toFixed(7)))].sort((u, v) => u - v).map(z => [x, z]);
  };
  const buckets = Array.from({ length: 7 }, () => ({ p: [], n: [], u: [] }));
  const emit = (out, points, height, up) => {
    let [a, b, c] = points;
    const cross = (b[1] - a[1]) * (c[0] - a[0]) - (b[0] - a[0]) * (c[1] - a[1]);
    if (Math.abs(cross) < 1e-8) return;
    if ((cross > 0) !== up) [b, c] = [c, b];
    for (const [x, z] of [a, b, c]) {
      out.p.push(x, height(x, z), z); out.u.push((x + 36) / 72, (z + 20) / (124 / 3));
    }
  };
  const strips = (hole, callback) => {
    for (let k = 1; k < columns.length; k++) for (let part = 0; part < 2; part++) {
      const a = rows(columns[k - 1], part, hole), b = rows(columns[k], part, hole); if (!a.length || !b.length) continue;
      let i = 0, j = 0;
      while (i < a.length - 1 || j < b.length - 1) {
        if (i < a.length - 1 && (j === b.length - 1 || a[i + 1][1] <= b[j + 1][1])) callback([a[i], a[++i], b[j]]);
        else callback([a[i], b[++j], b[j - 1]]);
      }
    }
    // The lips use a separate boundary-following grid: corresponding airfoil samples connect
    // across columns instead of long diagonal fans across a steep curved surface.
    const distances = [0, .08, .2, .36, .55, .9];
    for (let k = 1; k < columns.length; k++) for (const nose of [false, true]) {
      const at = (x, d) => {
        const margin = Math.min(.9, Math.max(0, front(x) - aft(x)) / 2), inset = d / .9 * margin;
        return [x, nose ? front(x) - inset : aft(x) + inset];
      };
      for (let j = 1; j < distances.length; j++) {
        const a = at(columns[k - 1], distances[j - 1]), b = at(columns[k - 1], distances[j]);
        const c = at(columns[k], distances[j]), d = at(columns[k], distances[j - 1]);
        callback([a, b, c]); callback([a, c, d]);
      }
    }
  };
  strips(true, tri => {
    const movable = tri.every(([x, z]) => Math.abs(x) <= 11.60001 && z >= -8.80001 && z <= 9.50001);
    const side = movable ? (tri.reduce((s, p) => s + p[0], 0) < 0 ? 1 : 2) : 0;
    emit(buckets[side], tri, skinHeight, true); emit(buckets[side + 3], tri, ceilingHeight, false);
  });
  strips(false, tri => emit(buckets[6], tri, bellyHeight, false));
  // Smooth the actual triangle normals, weighted by corner angle rather than triangle size.
  // Real folds keep a crease: averaging a flat roof with its near-vertical flange produces
  // false mirror wedges. Closed roof leaves share the same smoothing neighbourhood.
  const smoothSurface = list => {
    const adjacency = new Map(), key = (p, i) => `${Math.round(p[i] * 1e5)},${Math.round(p[i + 1] * 1e5)},${Math.round(p[i + 2] * 1e5)}`;
    const faces = new Map(), crease = Math.cos(50 * Math.PI / 180);
    for (const b of list) {
      const normals = []; faces.set(b, normals);
      for (let i = 0; i < b.p.length; i += 9) {
        const ax = b.p[i + 3] - b.p[i], ay = b.p[i + 4] - b.p[i + 1], az = b.p[i + 5] - b.p[i + 2];
        const bx = b.p[i + 6] - b.p[i], by = b.p[i + 7] - b.p[i + 1], bz = b.p[i + 8] - b.p[i + 2];
        const n = [ay * bz - az * by, az * bx - ax * bz, ax * by - ay * bx], area = Math.hypot(...n) || 1;
        n[0] /= area; n[1] /= area; n[2] /= area; normals.push(n);
        for (let j = 0; j < 3; j++) {
          const q = i + j * 3, r = i + (j + 1) % 3 * 3, s = i + (j + 2) % 3 * 3;
          const dot = (b.p[r] - b.p[q]) * (b.p[s] - b.p[q]) + (b.p[r + 1] - b.p[q + 1]) * (b.p[s + 1] - b.p[q + 1]) + (b.p[r + 2] - b.p[q + 2]) * (b.p[s + 2] - b.p[q + 2]);
          const k = key(b.p, q), neighbours = adjacency.get(k) || [];
          neighbours.push({ n, weight: Math.atan2(area, dot) }); adjacency.set(k, neighbours);
        }
      }
    }
    for (const b of list) for (let i = 0; i < b.p.length; i += 3) {
      const face = faces.get(b)[Math.floor(i / 9)], sum = [0, 0, 0];
      for (const { n, weight } of adjacency.get(key(b.p, i))) {
        if (n[0] * face[0] + n[1] * face[1] + n[2] * face[2] < crease) continue;
        sum[0] += n[0] * weight; sum[1] += n[1] * weight; sum[2] += n[2] * weight;
      }
      const length = Math.hypot(...sum) || 1; b.n.push(sum[0] / length, sum[1] / length, sum[2] / length);
    }
  };
  smoothSurface(buckets.slice(0, 3)); smoothSurface(buckets.slice(3, 6)); smoothSurface([buckets[6]]);
  const fromBucket = b => {
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(b.p, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(b.n, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(b.u, 2)); g.computeBoundingSphere(); return g;
  };
  for (let i = 0; i < 3; i++) {
    const parent = [roof, leftRoof, rightRoof][i];
    addMesh(parent, fromBucket(buckets[i]), material.skin, ['carrier-fixed-skin', 'carrier-port-roof-skin', 'carrier-starboard-roof-skin'][i]);
    addMesh(parent, fromBucket(buckets[i + 3]), material.ceiling, ['carrier-fixed-ceiling', 'carrier-port-roof-ceiling', 'carrier-starboard-roof-ceiling'][i]);
  }
  addMesh(exterior, fromBucket(buckets[6]), material.belly, 'carrier-belly');
  // Close the whole eight-sided body boundary; the floor is continuous above this shell.
  const edgePos = [];
  for (let k = 0; k < contour.length; k++) {
    const a = contour[k], b = contour[(k + 1) % contour.length], n = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 1.2);
    for (let j = 0; j < n; j++) {
      const p = [a[0] + (b[0] - a[0]) * j / n, a[1] + (b[1] - a[1]) * j / n], q = [a[0] + (b[0] - a[0]) * (j + 1) / n, a[1] + (b[1] - a[1]) * (j + 1) / n];
      for (const v of [[p[0], skinHeight(...p), p[1]], [p[0], bellyHeight(...p), p[1]], [q[0], skinHeight(...q), q[1]], [q[0], skinHeight(...q), q[1]], [p[0], bellyHeight(...p), p[1]], [q[0], bellyHeight(...q), q[1]]]) edgePos.push(...v);
    }
  }
  const edges = new THREE.BufferGeometry(); edges.setAttribute('position', new THREE.Float32BufferAttribute(edgePos, 3)); edges.computeVertexNormals();
  addMesh(exterior, edges, material.titanium, 'carrier-closed-leading-and-trailing-edges');

  // Permanent aperture coaming: clear bore stays larger than the promised 8 m radius.
  const ring = (r, width, y, height, m, parent, name) => {
    const s = new THREE.Shape(); s.absarc(0, 0, r + width, 0, TAU, false);
    const hole = new THREE.Path(); hole.absarc(0, 0, r, 0, TAU, true); s.holes.push(hole);
    const g = new THREE.ExtrudeGeometry(s, { depth: height, bevelEnabled: false, curveSegments: high ? 64 : 40 });
    g.rotateX(-Math.PI / 2); g.translate(0, y, 0); return addMesh(parent, g, m, name);
  };
  ring(OPENING, .28, 7.72, .94, material.rib, interior, 'carrier-aperture-reveal');
  ring(OPENING + .02, .34, 8.61, .09, material.titanium, interior, 'carrier-aperture-upper-lip');
  ring(OPENING + .03, .045, 7.73, .035, material.lamp, interior, 'carrier-aperture-light');

  // The canopy is a separate shallow pressure dome, not a closed cockpit tub.
  const capR = OPENING - .03, profile = [];
  for (let i = 0; i <= (high ? 18 : 12); i++) {
    const a = Math.PI / 2 * i / (high ? 18 : 12); profile.push(new THREE.Vector2(capR * Math.sin(a), 1.42 * Math.cos(a)));
  }
  const dome = new THREE.LatheGeometry(profile, high ? 96 : 64); addMesh(canopy, dome, material.glass, 'carrier-canopy-glass', false);
  ring(capR - .06, .13, -.03, .12, material.titanium, canopy, 'carrier-canopy-seal');
  for (const angle of [-.52, .52]) {
    const points = [];
    for (let i = 0; i <= 32; i++) { const a = -Math.PI / 2 + Math.PI * i / 32, x = capR * Math.sin(a), y = 1.42 * Math.cos(a) + .025; points.push(V(x * Math.cos(angle), y, x * Math.sin(angle))); }
    addMesh(canopy, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 32, .035, 5, false), material.titanium, 'carrier-canopy-mullion');
  }

  // Permanent wall frames, coaming supports and ceiling ribs. Nothing crosses the usable central hall.
  for (const side of [-1, 1]) {
    for (const z of [-7.7, -4.4, -1.1, 2.2, 5.5]) {
      box(interior, [.18, 7.95, .24], [side * 11.45, 3.575, z], material.rib, 'carrier-side-rib');
      beam(interior, V(side * 11.45, 7.5, z), V(side * 9.8, 7.9, z), .2, .2, material.rib, 'carrier-roof-knee');
    }
    for (let i = 0; i < 4; i++) {
      const z = -6.05 + i * 3.3;
      box(interior, [.1, 6.0, 3.02], [side * 11.58, 2.75, z], material.wall, 'carrier-side-wall-panel');
      box(interior, [.11, .4, 2.72], [side * 11.51, .18, z], material.inset, 'carrier-wall-service-channel');
      box(interior, [.115, .045, 2.6], [side * 11.44, .5, z], material.amber, 'carrier-low-level-waylight');
      box(interior, [.11, .12, 2.0], [side * 11.44, 5.75, z], material.lamp, 'carrier-hall-light');
    }
    beam(interior, V(side * 10.8, 7.72, -8.3), V(side * 10.8, 7.72, 7.4), .19, .24, material.rib, 'carrier-longitudinal-spar');
    // Forward bridge walls leave a 7 m clear central corridor to the nose.
    for (const [z, length] of [[10.8, 2.4], [13.5, 2.4], [16, 1.2]]) {
      box(interior, [.16, 6.8, .24], [side * 3.85, 3.0, z], material.rib, 'carrier-bridge-rib');
      box(interior, [.1, 2.2, length], [side * 4.02, 1.05, z], material.wall, 'carrier-bridge-lower-wall');
      box(interior, [.115, .08, length - .25], [side * 3.94, 2.4, z], material.lamp, 'carrier-bridge-light');
    }
    for (const z of [-8.1, 7.9]) beam(interior, V(side * 11.1, 7.85, z), V(side * 5.85, 7.85, Math.sign(z) * 5.85), .16, .2, material.rib, 'carrier-coaming-support');
  }
  for (const z of [-8.5, 8.35]) {
    // Full-width crossbeams stay above the camera and above every district.
    beam(interior, V(-10.9, 7.65, z), V(10.9, 7.65, z), .2, .25, material.rib, 'carrier-ceiling-crossbeam');
    box(interior, [15.5, .045, .08], [0, 7.49, z], material.lamp, 'carrier-overhead-strip');
  }
  box(interior, [21.6, 5.6, .12], [0, 2.45, -8.85], material.wall, 'carrier-aft-bulkhead');
  for (let x = -9; x <= 9; x += 3) {
    box(interior, [.16, 6.9, .24], [x, 3.05, -8.65], material.rib, 'carrier-aft-frame');
    box(interior, [2.6, .1, .12], [x, 5.75, -8.74], material.lamp, 'carrier-aft-light');
  }
  // The forward observation bulkhead is behind the mobile distributor-camera position.
  box(interior, [5.5, 1.3, .18], [0, .25, 17.7], material.wall, 'carrier-bridge-front-sill');
  beam(interior, V(-2.75, 7.4, 17.7), V(2.75, 7.4, 17.7), .2, .2, material.rib, 'carrier-bridge-front-header');

  // Paired long exhaust assemblies sit outside the habitable volume, embedded in the wings.
  for (const side of [-1, 1]) {
    const cx = side * 18, base = skinHeight(cx, -8);
    const body = box(exterior, [3.6, .8, 8.3], [cx, base + .35, -9.1], material.belly, 'carrier-engine-nacelle');
    body.rotation.y = side * -.12;
    box(exterior, [2.9, .16, .18], [cx, base + .18, -13.32], material.amber, 'carrier-exhaust-throat');
    box(exterior, [3.24, .54, .22], [cx, base + .39, -13.5], material.engine, 'carrier-exhaust-shroud');
    for (const s of [-1, 1]) box(exterior, [.1, .58, 7.8], [cx + s * 1.76, base + .39, -9.1], material.titanium, 'carrier-engine-rail');
    for (let i = 0; i < 5; i++) box(exterior, [2.8, .06, .09], [cx, base + .79, -6.3 - i * .32], material.titanium, 'carrier-intake-vane');
    // Formation strips parallel to the actual leading edge; geometry remains inside the logo.
    for (const a of [24, 28]) {
      const x = side * a, z = front(a) - .9;
      const p = V(x, skinHeight(x, z) + .035, z), q = V(side * (a + 2), skinHeight(side * (a + 2), front(a + 2) - .9) + .035, front(a + 2) - .9);
      beam(exterior, p, q, .055, .06, material.lamp, 'carrier-formation-strip');
    }
  }

  // Four articulated roof supports keep the lifted leaves visibly connected to the airframe.
  const roofArms = [];
  for (const side of [-1, 1]) for (const z of [-6, 6]) {
    const arm = box(exterior, [.15, 1, .19], [0, 0, 0], material.titanium, 'carrier-roof-actuator');
    roofArms.push({ arm, side, z });
  }
  const armStart = V(), armEnd = V(), armDirection = V(), beamAxis = V(0, 1, 0);

  const entry = { center: V(0, ROOF, 0), radius: 8, floorY: FLOOR, direction: V(0, -1, 0) };
  const interiorBounds = new THREE.Box3(V(-11, FLOOR, -8), V(11, 7.2, 8));
  const bridgeBounds = new THREE.Box3(V(-3.5, FLOOR, 8), V(3.5, 7.2, 16.7));
  group.userData.carrier = { source: 'aiforeu-mark.svg', contour: contour.map(p => [...p]), floorY: FLOOR, clearHeight: 7.2, interiorKey: interior.name };
  let disposed = false;
  function update(entryProgress = 0, time = 0) {
    if (disposed) return;
    const p = clamp(Number.isFinite(entryProgress) ? entryProgress : 0), lift = smooth(.02, .36, p), slide = smooth(.2, .7, p), open = smooth(.38, .92, p);
    canopy.position.set(0, ROOF + 6.8 * lift, 12.8 * slide); canopy.rotation.set(1.32 * slide, 0, 0);
    leftRoof.position.set(-14.8 * open, 2.8 * open, 0); rightRoof.position.set(14.8 * open, 2.8 * open, 0);
    for (const { arm, side, z } of roofArms) {
      armStart.set(side * 11.25, 7.8, z); armEnd.set(side * (8 + 14.8 * open), 8.03 + 2.8 * open, z);
      armDirection.subVectors(armEnd, armStart); arm.scale.y = armDirection.length();
      arm.position.copy(armStart).add(armEnd).multiplyScalar(.5); arm.quaternion.setFromUnitVectors(beamAxis, armDirection.normalize());
    }
    // Open roof leaves and permanent frame remain physical; no opacity or visibility erases the airframe.
    interior.visible = true; roof.visible = true; canopy.visible = true;
    material.amber.emissiveIntensity = .75 + .05 * Math.sin(Number.isFinite(time) ? time * .65 : 0);
    group.updateMatrixWorld(true);
  }
  update(0, 0);
  const bounds = new THREE.Box3().setFromObject(group);
  update(1, 0); bounds.union(new THREE.Box3().setFromObject(group)); update(0, 0);
  function dispose() {
    if (disposed) return; disposed = true;
    group.removeFromParent(); geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose()); textures.forEach(t => t.dispose());
  }
  return { group, exterior, interior, roof, canopy, roofPanels: { left: leftRoof, right: rightRoof }, interiorKey: interior.name, entry, bounds, interiorBounds, bridgeBounds, update, dispose };
}
