import * as THREE from './vendor/three.module.min.js';
import { RoomEnvironment } from './vendor/RoomEnvironment.js';
import { makeKit, createScene } from './scene.js';

const mounted = new WeakMap();

/** Enhance one static figure. Importing this module does not alter the page. */
export function mountAgentarioScene(host, { still = false } = {}) {
  if (!host || typeof host.querySelector !== 'function') throw new TypeError('A scene host is required.');
  if (mounted.has(host)) return mounted.get(host);
  const stage = host.querySelector('[data-agentario-stage]');
  const fallback = host.querySelector('[data-agentario-fallback]');
  if (!stage || !fallback) throw new TypeError('The scene needs its static stage and text fallback.');

  const doc = host.ownerDocument, win = doc.defaultView;
  const reduce = win.matchMedia('(prefers-reduced-motion: reduce)');
  const cleanups = [], resources = new Set();
  let renderer, scene, camera, kit, active, key, environment;
  let frameId = null, lastTime = null, time = 0, sized = false;
  let playing = !reduce.matches && !still, pageVisible = true, failed = false, destroyed = false;
  let intersecting = !('IntersectionObserver' in win);
  let resizeObserver, intersectionObserver;
  const canvas = doc.createElement('canvas');
  canvas.className = 'agentario-scene-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  const controls = doc.createElement('div');
  controls.className = 'agentario-scene-controls';
  controls.hidden = true;
  const toggle = doc.createElement('button'), replay = doc.createElement('button');
  toggle.type = replay.type = 'button';
  replay.textContent = 'Wiederholen';
  replay.setAttribute('aria-label', 'Animation von vorne wiederholen');
  const status = doc.createElement('span');
  status.className = 'agentario-scene-status';
  controls.append(toggle, replay, status);
  const caption = host.querySelector('figcaption');
  host.insertBefore(controls, caption && caption.parentNode === host ? caption : null);
  stage.append(canvas);

  function listen(target, name, callback, options) {
    target.addEventListener(name, callback, options);
    cleanups.push(() => target.removeEventListener(name, callback, options));
  }
  function stopFrame() {
    if (frameId !== null) win.cancelAnimationFrame(frameId);
    frameId = null;
    lastTime = null;
  }
  function canRun() {
    return !destroyed && !failed && active && sized && playing && !reduce.matches &&
      pageVisible && !doc.hidden && intersecting && time < active.duration;
  }
  function updateControls() {
    const ended = active && time >= active.duration;
    toggle.textContent = playing ? 'Pausieren' : ended ? 'Abspielen' : 'Fortsetzen';
    toggle.setAttribute('aria-label', playing ? 'Animation pausieren' : ended ? 'Animation erneut abspielen' : 'Animation fortsetzen');
    toggle.disabled = replay.disabled = failed || reduce.matches;
    status.textContent = reduce.matches ? 'Reduzierte Bewegung · Endstand' :
      ended ? 'Abgeschlossen · Ergebnis bleibt sichtbar' : playing ? 'Spielt einmal' : 'Animation pausiert';
  }
  function schedule() {
    stopFrame();
    updateControls();
    if (canRun()) frameId = win.requestAnimationFrame(frame);
  }
  function fail() {
    if (destroyed || failed) return;
    failed = true;
    playing = false;
    stopFrame();
    host.removeAttribute('data-agentario-ready');
    fallback.hidden = false;
    controls.hidden = true;
    const note = fallback.querySelector('[data-agentario-note]');
    if (note) note.textContent = 'Die 3D-Ansicht ist hier nicht verfügbar. Der Ablauf bleibt als Text sichtbar.';
    disposeGraphics();
  }
  function render() {
    if (destroyed || failed || !sized || !active) return;
    try {
      active.update(time);
      renderer.render(scene, camera);
      fallback.hidden = true;
      controls.hidden = false;
      host.setAttribute('data-agentario-ready', '');
      updateControls();
    } catch { fail(); }
  }
  function frame(now) {
    frameId = null;
    if (!canRun()) { lastTime = null; return; }
    const delta = lastTime === null ? 0 : Math.min((now - lastTime) / 1000, .08);
    lastTime = now;
    time = Math.min(active.duration, time + delta);
    if (time >= active.duration) playing = false;
    render();
    if (canRun()) frameId = win.requestAnimationFrame(frame);
    else lastTime = null;
  }
  function resize() {
    if (destroyed || failed || !renderer || !active) return;
    const width = stage.clientWidth, height = stage.clientHeight;
    sized = width > 0 && height > 0;
    if (!sized) { schedule(); return; }
    try {
      renderer.setPixelRatio(Math.min(win.devicePixelRatio || 1, 2));
      renderer.setSize(width, height, false);
      const { span = 12.5, position, target } = active.camera;
      const aspect = width / height;
      const horizontal = aspect < 1.2 ? span * 1.04 : Math.max(span, span * aspect / 2.2);
      camera.left = -horizontal / 2; camera.right = horizontal / 2;
      camera.top = horizontal / aspect / 2; camera.bottom = -horizontal / aspect / 2;
      camera.position.set(...position); camera.lookAt(...target); camera.updateProjectionMatrix();
      render();
      schedule();
    } catch { fail(); }
  }
  function play(reset = false) {
    if (destroyed || failed || reduce.matches || !active) return;
    if (reset || time >= active.duration) time = 0;
    playing = true;
    render();
    schedule();
  }
  function pause() {
    if (destroyed || failed) return;
    playing = false;
    schedule();
  }
  function onReduce() {
    if (destroyed || failed || !active) return;
    // Preference changes never restart motion without an explicit click.
    playing = false;
    time = active.duration;
    render();
    schedule();
  }
  function checkViewport() {
    const rect = stage.getBoundingClientRect();
    intersecting = rect.bottom > 0 && rect.top < win.innerHeight && rect.right > 0 && rect.left < win.innerWidth;
    schedule();
  }
  function disposeGraphics() {
    kit?.dispose();
    environment?.dispose();
    key?.shadow?.dispose();
    resources.forEach(resource => resource.dispose());
    resources.clear();
    renderer?.dispose();
  }
  function destroy() {
    if (destroyed) return;
    destroyed = true;
    stopFrame();
    resizeObserver?.disconnect();
    intersectionObserver?.disconnect();
    cleanups.forEach(cleanup => cleanup());
    if (!failed) disposeGraphics();
    renderer?.forceContextLoss();
    canvas.remove();
    controls.remove();
    fallback.hidden = false;
    host.removeAttribute('data-agentario-ready');
    mounted.delete(host);
  }
  const api = { pause, replay: () => play(true), destroy };
  mounted.set(host, api);
  listen(toggle, 'click', () => playing ? pause() : play());
  listen(replay, 'click', () => play(true));
  listen(canvas, 'webglcontextlost', event => { event.preventDefault(); fail(); });
  listen(doc, 'visibilitychange', schedule);
  listen(win, 'pagehide', () => { pageVisible = false; schedule(); });
  listen(win, 'pageshow', () => { pageVisible = true; schedule(); });
  if (reduce.addEventListener) listen(reduce, 'change', onReduce);
  else { reduce.addListener(onReduce); cleanups.push(() => reduce.removeListener(onReduce)); }

  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'low-power' });
    renderer.setClearColor('#eef2f7');
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    scene = new THREE.Scene();
    scene.background = new THREE.Color('#eef2f7');
    camera = new THREE.OrthographicCamera(-7, 7, 5, -5, .1, 100);
    scene.add(new THREE.HemisphereLight('#ffffff', '#b1bfd3', 1.5));
    key = new THREE.DirectionalLight('#fff5ea', 3.2);
    key.position.set(-4, 9, 5); key.castShadow = true; key.shadow.mapSize.set(2048, 2048);
    Object.assign(key.shadow.camera, { left: -9, right: 9, top: 7, bottom: -7, near: .1, far: 30 });
    key.shadow.bias = -.0001; key.shadow.normalBias = .025; key.shadow.radius = 5;
    scene.add(key);
    const fill = new THREE.DirectionalLight('#cad8ff', 1.3);
    fill.position.set(7, 4, -5); scene.add(fill);
    const floorGeometry = new THREE.PlaneGeometry(200, 200);
    const floorMaterial = new THREE.MeshStandardMaterial({ color: '#eef2f7', roughness: .86, metalness: 0 });
    resources.add(floorGeometry); resources.add(floorMaterial);
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2; floor.position.y = -.45; floor.receiveShadow = true; scene.add(floor);
    const generator = new THREE.PMREMGenerator(renderer), room = new RoomEnvironment();
    try { environment = generator.fromScene(room, .06); }
    finally { room.dispose(); generator.dispose(); }
    scene.environment = environment.texture; scene.environmentIntensity = .5;
    kit = makeKit();
    active = createScene({ THREE, kit });
    scene.add(active.root);
    time = reduce.matches || still ? active.duration : 0;
    if ('ResizeObserver' in win) {
      resizeObserver = new win.ResizeObserver(resize);
      resizeObserver.observe(stage);
    } else listen(win, 'resize', resize);
    if ('IntersectionObserver' in win) {
      intersectionObserver = new win.IntersectionObserver(([entry]) => {
        intersecting = entry.isIntersecting;
        schedule();
      }, { threshold: 0 });
      intersectionObserver.observe(stage);
    } else {
      listen(win, 'scroll', checkViewport, { passive: true });
      listen(win, 'resize', checkViewport);
      checkViewport();
    }
    resize();
  } catch { fail(); }
  return api;
}
