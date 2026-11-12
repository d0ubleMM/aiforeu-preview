import * as THREE from '../agentario-scene/vendor/three.module.min.js';
import { RoomEnvironment } from '../agentario-scene/vendor/RoomEnvironment.js';
import { createWorld } from './world-scene.js';
import { mountExplorerControls } from './explorer-controls.js';

const content = {
  traffic: { title: 'VerkehrsAI', copy: 'Intelligente Werkzeuge für die Verkehrsplanung. Von der Kreuzung bis zum nächsten Planungsschritt.', href: 'verkehrsai.html' },
  workforce: { title: 'Autonomous Workforce', copy: 'Agentario verbindet Gespräche, Software und Workflows. Ihr Team gibt die Richtung vor. Agenten übernehmen die Routine.', href: 'autonomous-workforce.html' }
};
const instances = new WeakMap();
const precisionStyles = new URL('./world-controls.css', import.meta.url).href;
if (!document.querySelector('link[data-world-precision]')) {
  const style = document.createElement('link'); style.rel = 'stylesheet'; style.href = precisionStyles;
  style.dataset.worldPrecision = ''; document.head.append(style);
}

export function mountWorld(host) {
  if (instances.has(host)) return instances.get(host);
  const stage = host.querySelector('[data-world-stage]');
  const fallback = host.querySelector('[data-world-fallback]');
  const pins = host.querySelector('[data-world-pins]');
  const buttons = [...host.querySelectorAll('[data-world-select]')];
  const detail = host.querySelector('[data-world-detail]');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const canvas = document.createElement('canvas');
  canvas.setAttribute('aria-hidden', 'true');
  canvas.className = 'world-canvas';
  const cleanups = [];
  let renderer, world, environment, scene, camera, observer, resizeObserver, exploration;
  const opening = document.querySelector('[data-connection-opening][data-connection-active]');
  let coveredByOpening = Boolean(opening?.parentElement?.contains(host));
  // Compose the complete city under the curtain once. The GPU only animates
  // the opening until its flight reveals the world; no hidden second loop.
  let entranceTime = coveredByOpening ? 2.8 : 0;
  let frameId = 0, last = 0, elapsed = 3, selected = 'overview', running = !reduce.matches;
  let failed = false, disposed = false, inView = true, activePage = true;
  let width = 0, height = 0, currentSpan = 34.5, goalSpan = 34.5, userYaw = 0, zoomLevel = 1;
  let dragStart = null, moving = false, currentPointer = 0, desiredPointer = 0;
  const currentTarget = new THREE.Vector3(), goalTarget = new THREE.Vector3();
  const currentPosition = new THREE.Vector3(), goalPosition = new THREE.Vector3();
  const raycaster = new THREE.Raycaster(), pointer = new THREE.Vector2();
  const projection = new THREE.Vector3();
  function on(target, type, handler, options) {
    target.addEventListener(type, handler, options);
    cleanups.push(() => target.removeEventListener(type, handler, options));
  }
  function stop() { if (frameId) cancelAnimationFrame(frameId); frameId = 0; last = 0; }
  function visible() { return !disposed && !failed && !coveredByOpening && !document.hidden && activePage && inView && width > 0 && height > 0; }
  function schedule() { if (!frameId && visible() && (moving || exploration?.moving || (running && !reduce.matches))) frameId = requestAnimationFrame(tick); }
  function uncover() {
    if (!coveredByOpening) return;
    coveredByOpening = false;
    if (renderer && world) { render(); schedule(); }
  }
  on(document, 'aiforeu:opening-reveal', uncover);
  on(document, 'aiforeu:opening-complete', uncover);
  function projectionSize() {
    const aspect = width / height;
    const span = !exploration?.active && selected === 'overview' ? world.overviewSpan(camera, aspect) * zoomLevel : currentSpan;
    const shift = !exploration?.active && selected !== 'overview' && width > 700 ? currentSpan * .12 : 0;
    camera.left = -span / 2 + shift; camera.right = span / 2 + shift;
    camera.top = span / aspect / 2; camera.bottom = -span / aspect / 2;
    camera.updateProjectionMatrix();
  }
  function targets(snap = false) {
    if(exploration?.active){
      goalTarget.copy(exploration.avatar.position).add(new THREE.Vector3(0,1.1,0));
      goalPosition.copy(goalTarget).add(new THREE.Vector3(8,11,13));
      goalSpan=Math.max(width<700?10.5:15,width/height*10.5)*zoomLevel;
      if(snap){currentPosition.copy(goalPosition);currentTarget.copy(goalTarget);currentSpan=goalSpan;moving=false;}else moving=true;
      return;
    }
    const view = world.views[selected];
    goalPosition.set(...view.position); goalTarget.set(...view.target);
    const aspect = width / height;
    goalSpan = (view.span || (selected === 'overview' ? 32 : 20));
    // Keep the two districts together on narrow viewports; close-up views remain useful.
    if (aspect < 1) goalSpan *= selected === 'overview' ? 1 : .92;
    goalSpan = Math.max(goalSpan, aspect * (selected === 'overview' ? 20.7 : 13.2)) * zoomLevel;
    if (snap) { currentPosition.copy(goalPosition); currentTarget.copy(goalTarget); currentSpan = goalSpan; moving = false; }
    else moving = true;
  }
  function positionPins() {
    const positions = [];
    for (const button of buttons) {
      const key = button.dataset.worldSelect;
      button.hidden = exploration?.active ? exploration.avatar.nearby() !== key : selected !== 'overview' && selected !== key;
      if (button.hidden) continue;
      const bw = button.offsetWidth || 150;
      if (width <= 700 && selected === 'overview' && !exploration?.active) {
        const x = key === 'traffic' ? 16 : width - bw - 16;
        const y = Math.max(0, height - (button.offsetHeight || 44) - 12);
        button.style.transform = `translate(${Math.round(x)}px,${Math.round(y)}px)`;
        continue;
      }
      projection.copy(world.hotspots[key]).project(camera);
      const x = Math.max(bw / 2 + 12, Math.min(width - bw / 2 - 12, (projection.x * .5 + .5) * width));
      let y = Math.max(20, Math.min(height - 74, (-projection.y * .5 + .5) * height));
      if (positions.some(p => Math.abs(p.x - x) < (p.bw + bw) / 2 + 10 && Math.abs(p.y - y) < 46)) y += 48;
      button.style.transform = `translate(${Math.round(x - bw / 2)}px,${Math.round(y)}px)`;
      positions.push({ x, y, bw });
    }
  }
  function render() {
    if (disposed || failed || !width || !height) return;
    try {
      const build = reduce.matches || document.hidden ? 1 : Math.min(1, entranceTime / 2.8);
      const travel = 1 - Math.pow(1 - build, 3);
      const offset = currentPosition.clone().sub(currentTarget);
      offset.applyAxisAngle(new THREE.Vector3(0, 1, 0), userYaw + currentPointer);
      if (selected === 'overview' && travel < 1) {
        offset.applyAxisAngle(new THREE.Vector3(0,1,0), (1-travel)*-.24);
        offset.y *= .8+.2*travel;
      }
      camera.position.copy(currentTarget).add(offset);
      camera.lookAt(currentTarget); camera.updateMatrixWorld();
      projectionSize();
      world.update(elapsed, { selected, reducedMotion: reduce.matches, entrance: build });
      renderer.render(scene, camera); pins.hidden = false; positionPins();
      fallback.hidden = true; canvas.hidden = false; pins.hidden = false;
      stage.setAttribute('data-world-ready', '');
      stage.dataset.worldView = selected;
    } catch (error) { fail(error); }
  }
  function tick(now) {
    frameId = 0;
    if (!visible()) { last = 0; return; }
    const dt = last ? Math.min((now - last) / 1000, .05) : 1 / 60; last = now;
    if (running && !reduce.matches) { elapsed += dt; entranceTime = Math.min(2.8, entranceTime + dt); }
    const easing = 1 - Math.exp(-4.3 * dt);
    if(exploration?.active){
      exploration.update(dt, reduce.matches);
      goalTarget.copy(exploration.avatar.position).add(new THREE.Vector3(0,1.1,0));
      goalPosition.copy(goalTarget).add(new THREE.Vector3(8,11,13));
      goalSpan=Math.max(width<700?10.5:15,width/height*10.5)*zoomLevel;
      if(reduce.matches){currentPosition.copy(goalPosition);currentTarget.copy(goalTarget);currentSpan=goalSpan;}
    }
    currentPosition.lerp(goalPosition, easing); currentTarget.lerp(goalTarget, easing);
    currentSpan += (goalSpan - currentSpan) * easing;
    currentPointer += (desiredPointer - currentPointer) * easing;
    moving = currentPosition.distanceToSquared(goalPosition) > .0001 || Math.abs(currentSpan - goalSpan) > .001 || Math.abs(currentPointer - desiredPointer) > .0001;
    render(); schedule();
  }
  function resize() {
    if (disposed || failed || !renderer) return;
    width = stage.clientWidth; height = stage.clientHeight;
    if (!width || !height) { stop(); return; }
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
    renderer.setSize(width, height, false);
    if(exploration?.active){goalSpan=Math.max(width<700?10.5:15,width/height*10.5)*zoomLevel;currentSpan=goalSpan;}else targets(true);
    render(); schedule();
  }
  function select(key, focusBack = false) {
    if (failed || disposed || !world.views[key]) return;
    exploration?.stop(false);
    entranceTime = 2.8;
    selected = key; zoomLevel = 1; userYaw = desiredPointer = currentPointer = 0;
    buttons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.worldSelect === key)));
    if (key === 'overview') {
      detail.hidden = true;
    } else {
      const item = content[key];
      host.querySelector('[data-world-title]').textContent = item.title;
      host.querySelector('[data-world-copy]').textContent = item.copy;
      host.querySelector('[data-world-link]').href = item.href;
      detail.hidden = false;
    }
    targets(reduce.matches || document.hidden); render(); schedule();
    if (focusBack) buttons[0].focus({ preventScroll: true });
  }
  function zoom(delta) {
    entranceTime = 2.8;
    zoomLevel = THREE.MathUtils.clamp(Math.round((zoomLevel + delta) * 100) / 100, .6, 1.16);
    targets(reduce.matches || !running || document.hidden); render(); schedule();
  }
  function disposeGraphics() {
    const geometries = new Set(), materials = new Set(), textures = new Set();
    scene?.traverse(object => {
      if (object.geometry) geometries.add(object.geometry);
      for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
        if (!material) continue;
        materials.add(material);
        for (const value of Object.values(material)) if (value?.isTexture) textures.add(value);
      }
    });
    geometries.forEach(item => item.dispose()); materials.forEach(item => item.dispose()); textures.forEach(item => item.dispose());
    environment?.dispose(); renderer?.dispose();
  }
  function fail() {
    failed = true; stop(); exploration?.destroy(); exploration = null; fallback.hidden = false; canvas.hidden = true;
    pins.hidden = detail.hidden = true;
    stage.removeAttribute('data-world-ready'); disposeGraphics();
  }
  function destroy() {
    if (disposed) return; disposed = true; stop(); cleanups.forEach(fn => fn());
    observer?.disconnect(); resizeObserver?.disconnect(); exploration?.destroy(); disposeGraphics(); canvas.remove(); instances.delete(host);
    fallback.hidden = false;
    pins.hidden = detail.hidden = true;
    stage.removeAttribute('data-world-ready');
    stage.removeAttribute('data-world-dragging');
    stage.removeAttribute('data-world-view');
    buttons.forEach(button => button.setAttribute('aria-pressed', 'false'));
  }
  const api = { select, destroy }; instances.set(host, api);
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'default' });
    renderer.setClearColor('#f5f7fa'); renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.02;
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    scene = new THREE.Scene(); scene.background = new THREE.Color('#f5f7fa');
    scene.fog = new THREE.Fog('#f5f7fa', 65, 105);
    camera = new THREE.OrthographicCamera(-16, 16, 10, -10, .1, 150);
    const pmrem = new THREE.PMREMGenerator(renderer), room = new RoomEnvironment();
    environment = pmrem.fromScene(room, .035); scene.environment = environment.texture; scene.environmentIntensity = .3;
    room.dispose(); pmrem.dispose();
    scene.add(new THREE.HemisphereLight('#ffffff', '#8794a4', 1.55));
    const sun = new THREE.DirectionalLight('#fffaf4', 3.15); sun.position.set(-13, 25, 15);
    const shadowSize = Math.min(renderer.capabilities.maxTextureSize, stage.clientWidth > 700 ? 4096 : 2048);
    sun.castShadow = true; sun.shadow.mapSize.set(shadowSize, shadowSize);
    Object.assign(sun.shadow.camera, { left: -19, right: 19, top: 18, bottom: -18, near: .5, far: 70 });
    sun.shadow.normalBias = .018; sun.shadow.bias = -.00012; sun.shadow.radius = 1; scene.add(sun);
    world = createWorld(); scene.add(world.group); stage.prepend(canvas);
    exploration=mountExplorerControls({THREE,host,stage,scene,camera,requestFrame:schedule,redraw(){if(exploration?.active)targets(reduce.matches||document.hidden);render();schedule();},
      onStart(){
        entranceTime=2.8;selected='overview';zoomLevel=1;userYaw=desiredPointer=currentPointer=0;detail.hidden=true;
        goalTarget.copy(exploration.avatar.position).add(new THREE.Vector3(0,1.1,0));goalPosition.copy(goalTarget).add(new THREE.Vector3(8,11,13));
        goalSpan=Math.max(width<700?10.5:15,width/height*10.5)*zoomLevel;
        if(reduce.matches||document.hidden){currentTarget.copy(goalTarget);currentPosition.copy(goalPosition);currentSpan=goalSpan;}
        moving=true;
      },onStop(){select('overview');}
    });
    on(canvas, 'webglcontextlost', event => { event.preventDefault(); fail(); });
    buttons.forEach(button => on(button, 'click', () => select(button.dataset.worldSelect)));
    on(stage, 'keydown', event => {
      if(event.target!==stage||event.metaKey||event.ctrlKey||event.altKey)return;
      if(event.key===' '){event.preventDefault();running=!running;if(running)schedule();else{stop();if(moving||exploration?.moving)schedule();}}
      if(event.key==='+'||event.key==='-'){event.preventDefault();zoom(event.key==='+'?-.16:.16);}
      if(event.key==='Escape'&&!exploration?.active){event.preventDefault();select('overview');}
    });
    on(canvas, 'pointerdown', event => { entranceTime = 2.8; dragStart = { x: event.clientX, y: event.clientY, yaw: userYaw, dragged: false }; });
    on(canvas, 'pointermove', event => {
      if(exploration?.active)return;
      if (dragStart && event.buttons) {
        const dx = event.clientX - dragStart.x;
        if (Math.abs(dx) > 8) { dragStart.dragged = true; stage.setAttribute('data-world-dragging', ''); userYaw = THREE.MathUtils.clamp(dragStart.yaw + dx * .002, -.65, .65); render(); }
      } else if (event.pointerType === 'mouse' && running && !reduce.matches) {
        const rect = canvas.getBoundingClientRect(); desiredPointer = ((event.clientX - rect.left) / rect.width - .5) * .09; moving = true; schedule();
      }
    });
    on(canvas, 'pointerleave', () => { desiredPointer = 0; dragStart = null; stage.removeAttribute('data-world-dragging'); if (!reduce.matches) { moving = true; schedule(); } });
    on(canvas, 'pointercancel', () => { dragStart = null; stage.removeAttribute('data-world-dragging'); });
    on(canvas, 'pointerup', event => {
      const start = dragStart; dragStart = null; stage.removeAttribute('data-world-dragging');
      if (!start || start.dragged || Math.hypot(event.clientX - start.x, event.clientY - start.y) > 8) return;
      const rect = canvas.getBoundingClientRect();
      pointer.set((event.clientX - rect.left) / rect.width * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1);
      raycaster.setFromCamera(pointer, camera);
      const hit = !exploration.active && raycaster.intersectObjects(world.hitTargets, true)[0];
      let object = hit?.object;
      while (object && !object.userData.path) object = object.parent;
      if (object?.userData.path) select(object.userData.path);
      else {
        const ground = raycaster.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0,1,0),-.12),new THREE.Vector3());
        if(ground)exploration.moveTo(ground.x,ground.z);
      }
    });
    on(document, 'visibilitychange', () => { if (document.hidden) stop(); else { render(); schedule(); } });
    on(window, 'pagehide', event => { activePage = false; stop(); if (!event.persisted) destroy(); });
    on(window, 'pageshow', () => { activePage = true; resize(); schedule(); });
    on(reduce, 'change', () => { running = false; stop(); desiredPointer = currentPointer = 0; targets(true); render(); });
    observer = new IntersectionObserver(entries => { inView = entries[0].isIntersecting; if (inView) schedule(); else stop(); }, { rootMargin: '80px' }); observer.observe(stage);
    resizeObserver = new ResizeObserver(resize); resizeObserver.observe(stage);
    resize();
  } catch (error) { fail(error); }
  return api;
}
