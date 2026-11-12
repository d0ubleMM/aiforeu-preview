/* Loose, curled paper on a surface. Motion starts with the visitor's gesture, then sleeps. */
import * as THREE from './agentario-scene/vendor/three.module.min.js';
import { createPile, randomSource, sweepPile, beginDrag, moveDrag, endDrag, stepPile, settlePile } from './postits-physics.js';

const INSTANCES = new WeakMap();
const COLORS = ['#f6df72', '#f5e7a0', '#efb171', '#c3d8e5'];
const WORDS = [['Rückruf', '14:30'], ['Angebot', 'prüfen'], ['Termin', 'bestätigen'], ['Rechnung', 'zuordnen'], ['Mail', 'beantworten'], ['Freigabe', 'einholen'], ['Ticket', 'ergänzen'], ['Daten', 'übertragen'], ['Lieferung', 'nachfragen'], ['Beleg', 'ablegen'], ['Kontakt', 'aktualisieren'], ['Heute:', 'nachfassen']];

function paperTexture(color, text) {
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 512;
  const c = canvas.getContext('2d'), random = randomSource(73 + text * 11);
  c.fillStyle = color; c.fillRect(0, 0, 512, 512);
  const grain = c.getImageData(0, 0, 512, 512);
  for (let i = 0; i < grain.data.length; i += 4) {
    const noise = (random() - .5) * 5;
    for (let j = 0; j < 3; j++) grain.data[i + j] += noise;
  }
  c.putImageData(grain, 0, 0);
  const glue = c.createLinearGradient(0, 0, 0, 100);
  glue.addColorStop(0, '#806d2510'); glue.addColorStop(1, '#806d2500');
  c.fillStyle = glue; c.fillRect(0, 0, 512, 100);
  c.translate(59, 150); c.rotate((random() - .5) * .07);
  c.font = '600 84px AiforeuNotes, cursive'; c.fillStyle = '#273747';
  c.textBaseline = 'alphabetic';
  WORDS[text].forEach((line, i) => c.fillText(line, i ? 7 : 0, i * 96, 390));
  c.lineWidth = 3; c.strokeStyle = '#273747'; c.lineCap = 'round';
  if (text % 3 === 0) {
    c.beginPath(); c.moveTo(8, 119); c.quadraticCurveTo(87, 126, 205 + random() * 70, 119); c.stroke();
  } else if (text % 4 === 0) {
    c.beginPath(); c.moveTo(10, 189); c.lineTo(23, 204); c.lineTo(57, 165); c.stroke();
  }
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace; texture.anisotropy = 8;
  return texture;
}

function sheetGeometry(size) {
  const segments = 14, p = [], uv = [], index = [];
  for (let j = 0; j <= segments; j++) for (let i = 0; i <= segments; i++) {
    p.push((i / segments - .5) * size, 0, (j / segments - .5) * size);
    uv.push(i / segments, 1 - j / segments);
  }
  for (let j = 0; j < segments; j++) for (let i = 0; i < segments; i++) {
    const a = j * (segments + 1) + i, b = a + 1, c = a + segments + 1;
    index.push(a, c, b, b, c, c + 1);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); geo.setIndex(index);
  return geo;
}

export function mount(host) {
  if (INSTANCES.has(host)) return INSTANCES.get(host);
  const pending = start(host).catch(error => { INSTANCES.delete(host); throw error; });
  INSTANCES.set(host, pending); return pending;
}

async function start(host) {
  const surface = host.querySelector('.lu-spielfeld-flaeche');
  if (!surface) throw new Error('Missing paper surface');
  try { await document.fonts.load('600 48px AiforeuNotes'); } catch { /* The local handwriting fallback remains usable. */ }
  if (!host.isConnected) throw new Error('Paper surface was removed');
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const events = new AbortController(), options = { signal: events.signal };
  let disposed = false, visible = false, frame = 0, last = 0, elapsed = 0, compact = surface.clientWidth < 700;
  let pile = createPile({ compact }), sheets = [];
  const materials = new Map(), textures = new Set();
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'default' });
  renderer.setClearColor('#f5f7fa', 0); renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.12;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.VSMShadowMap;
  const canvas = renderer.domElement; canvas.setAttribute('aria-hidden', 'true'); surface.append(canvas);
  const scene = new THREE.Scene(), camera = new THREE.OrthographicCamera(-7, 7, 3, -3, .1, 70);
  camera.position.set(0, 9.5, 10.5); camera.lookAt(0, .3, 0);
  scene.add(new THREE.HemisphereLight('#ffffff', '#b3ad94', 2.15));
  const key = new THREE.DirectionalLight('#fffaf1', 3.1); key.position.set(-4.5, 10, 4); key.castShadow = true;
  key.shadow.mapSize.set(compact ? 1024 : 2048, compact ? 1024 : 2048);
  Object.assign(key.shadow.camera, { left: -9, right: 9, top: 8, bottom: -8, near: .1, far: 28 });
  key.shadow.bias = -.0003; key.shadow.normalBias = .025; key.shadow.radius = 6; key.shadow.blurSamples = 12; scene.add(key);
  const fill = new THREE.DirectionalLight('#dce7ff', .4); fill.position.set(5, 4, -4); scene.add(fill);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.ShadowMaterial({ opacity: .2 }));
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; ground.position.y = -.015; scene.add(ground);

  function material(note) {
    const id = `${note.color}-${note.text}`;
    if (!materials.has(id)) {
      const map = paperTexture(COLORS[note.color], note.text); textures.add(map);
      const front = new THREE.MeshStandardMaterial({ map, roughness: .98, metalness: 0, side: THREE.FrontSide, shadowSide: THREE.DoubleSide });
      const back = new THREE.MeshStandardMaterial({ color: COLORS[note.color], roughness: 1, metalness: 0, side: THREE.BackSide });
      materials.set(id, [front, back]);
    }
    return materials.get(id);
  }
  function buildSheets() {
    for (const sheet of sheets) { scene.remove(sheet.group); sheet.geo.dispose(); }
    sheets = pile.notes.map(note => {
      const geo = sheetGeometry(note.size), [front, back] = material(note);
      const group = new THREE.Group(), face = new THREE.Mesh(geo, front), reverse = new THREE.Mesh(geo, back);
      face.castShadow = face.receiveShadow = true; reverse.receiveShadow = true; face.userData.noteId = note.id;
      group.add(face, reverse); scene.add(group);
      return { group, face, geo, bend: NaN };
    });
  }
  function draw() {
    if (disposed) return;
    pile.notes.forEach((note, i) => {
      const sheet = sheets[i];
      sheet.group.position.set(note.x, note.y, note.z); sheet.group.rotation.set(note.pitch, note.yaw, note.roll);
      const bend = note.flutter;
      if (!Number.isFinite(sheet.bend) || Math.abs(sheet.bend - bend) > .001 || bend > .005) {
        const p = sheet.geo.attributes.position, uv = sheet.geo.attributes.uv;
        for (let j = 0; j < p.count; j++) {
          const u = uv.getX(j), v = 1 - uv.getY(j), free = v * v * v;
          const wave = Math.sin(u * 5.4 + pile.time * 16 + note.id) * bend * .105;
          p.setY(j, free * (note.curl + wave) + Math.pow(Math.abs(u - .5) * 2, 5) * v * .024);
        }
        p.needsUpdate = true; sheet.geo.computeVertexNormals(); sheet.geo.computeBoundingSphere(); sheet.bend = bend;
      }
    });
    renderer.render(scene, camera);
  }
  function tick(now) {
    frame = 0;
    if (disposed || !visible || document.hidden) { last = 0; return; }
    const dt = last ? Math.min((now - last) / 1000, .05) : 1 / 60; last = now; elapsed += dt;
    stepPile(pile, dt); draw();
    if (pile.awake && !motion.matches) frame = requestAnimationFrame(tick); else last = 0;
  }
  function wake() {
    if (disposed) return;
    if (motion.matches) { settlePile(pile); draw(); return; }
    if (!frame && visible && !document.hidden && pile.awake) frame = requestAnimationFrame(tick);
  }
  function resize() {
    if (disposed || !surface.clientWidth || !surface.clientHeight) return;
    const width = surface.clientWidth, height = surface.clientHeight, nextCompact = width < 700;
    if (nextCompact !== compact) { compact = nextCompact; pile = createPile({ compact }); buildSheets(); }
    const aspect = width / height, viewHeight = Math.max(5.9, 6.4 / aspect);
    camera.left = -viewHeight * aspect / 2; camera.right = -camera.left;
    camera.top = viewHeight / 2; camera.bottom = -camera.top; camera.updateProjectionMatrix();
    pile.bounds.x = Math.min(compact ? 2.25 : 5.1, camera.right - .92);
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, compact ? 1.75 : 2)); renderer.setSize(width, height, false); draw();
  }

  const ray = new THREE.Raycaster(), cursor = new THREE.Vector2(), plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -.45);
  const point = new THREE.Vector3(); let previous = null, pointer = null;
  function locate(event) {
    const box = canvas.getBoundingClientRect();
    cursor.set((event.clientX - box.left) / box.width * 2 - 1, 1 - (event.clientY - box.top) / box.height * 2);
    ray.setFromCamera(cursor, camera);
    return ray.ray.intersectPlane(plane, point) ? { x: point.x, z: point.z } : null;
  }
  function stopPointer() {
    if (pointer !== null && canvas.hasPointerCapture(pointer)) canvas.releasePointerCapture(pointer);
    pointer = null; previous = null; surface.classList.remove('lu-spielfeld--greifen'); endDrag(pile); wake();
  }
  canvas.addEventListener('pointerdown', event => {
    if (event.button !== 0 || !event.isPrimary) return;
    const p = locate(event); if (!p) return;
    pointer = event.pointerId; previous = p; canvas.setPointerCapture(pointer);
    const hit = ray.intersectObjects(sheets.map(s => s.face), false)[0];
    if (hit) { beginDrag(pile, hit.object.userData.noteId, p); surface.classList.add('lu-spielfeld--greifen'); }
    else sweepPile(pile, { x: p.x - .5, z: p.z }, p, 1.4);
    if (event.pointerType === 'mouse') event.preventDefault();
    surface.focus({ preventScroll: true }); wake();
  }, options);
  canvas.addEventListener('pointermove', event => {
    if (!event.isPrimary || (event.pointerType === 'touch' && pointer !== event.pointerId)) return;
    const p = locate(event); if (!p) return;
    if (previous && !motion.matches) sweepPile(pile, previous, p, pile.drag ? 1.2 : .68);
    if (pile.drag) {
      moveDrag(pile, p);
      if (motion.matches) { const n = pile.notes[pile.drag.id]; n.x = pile.drag.x; n.z = pile.drag.z; }
    }
    previous = p; wake();
  }, options);
  canvas.addEventListener('pointerup', stopPointer, options);
  canvas.addEventListener('pointercancel', stopPointer, options);
  canvas.addEventListener('lostpointercapture', () => { pointer = null; endDrag(pile); surface.classList.remove('lu-spielfeld--greifen'); wake(); }, options);
  canvas.addEventListener('pointerleave', () => { if (pointer === null) previous = null; }, options);
  surface.addEventListener('keydown', event => {
    if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault();
      if (motion.matches) {
        pile.notes.slice(-6).forEach((n, i) => { n.x = Math.max(-pile.bounds.x, Math.min(pile.bounds.x, n.x + (i % 2 ? .25 : -.25))); n.yaw += .12; });
      } else sweepPile(pile, { x: -1.3, z: .2 }, { x: 1.3, z: .2 }, 1.7);
      wake();
    } else if (event.key === 'Escape') stopPointer();
  }, options);
  const stopFrame = () => { if (frame) cancelAnimationFrame(frame); frame = 0; last = 0; };
  const resizeObserver = new ResizeObserver(resize); resizeObserver.observe(surface);
  const visibilityObserver = new IntersectionObserver(entries => {
    visible = entries[0].isIntersecting;
    if (visible) wake(); else { stopFrame(); previous = null; }
  }, { rootMargin: '40px' }); visibilityObserver.observe(surface);
  document.addEventListener('visibilitychange', () => { if (document.hidden) stopFrame(); else wake(); }, options);
  motion.addEventListener('change', () => { stopFrame(); endDrag(pile); settlePile(pile); draw(); }, options);
  canvas.addEventListener('webglcontextlost', event => { event.preventDefault(); host.classList.add('lu-spielfeld--fallback'); destroy(); }, options);
  function destroy() {
    if (disposed) return;
    disposed = true; events.abort(); stopFrame(); resizeObserver.disconnect(); visibilityObserver.disconnect();
    for (const s of sheets) s.geo.dispose();
    for (const pair of materials.values()) pair.forEach(m => m.dispose());
    textures.forEach(t => t.dispose()); ground.geometry.dispose(); ground.material.dispose();
    key.shadow.dispose(); renderer.dispose(); canvas.remove();
    host.classList.remove('lu-spielfeld--bereit'); surface.classList.remove('lu-spielfeld--greifen');
    for (const attr of ['role', 'tabindex', 'aria-label', 'aria-keyshortcuts']) surface.removeAttribute(attr);
    if (window.AiforeuLuSpielfeld === api) delete window.AiforeuLuSpielfeld;
    INSTANCES.delete(host);
  }
  const api = { destroy, get laeuft() { return !!frame; }, get karten() { return pile.notes.length; },
    get energie() { return pile.energy; }, get zeit() { return elapsed; },
    getState: () => ({ disposed, reducedMotion: motion.matches, dragging: pile.drag?.id ?? null, notes: pile.notes.map(({ x, y, z, yaw }) => ({ x, y, z, yaw })) }),
  };
  buildSheets(); resize();
  host.classList.add('lu-spielfeld--bereit');
  surface.setAttribute('role', 'button'); surface.setAttribute('tabindex', '0'); surface.setAttribute('aria-label', 'Notizzettel aufwühlen'); surface.setAttribute('aria-keyshortcuts', 'Space Enter');
  window.AiforeuLuSpielfeld = api;
  return api;
}
