// The sculpture is loaded only near its own section. This module owns the
// renderer, accessible stage interaction and page/viewport lifecycle.
const mounted = new WeakMap();
const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));
const finite = (value, fallback = 0) => Number.isFinite(value) ? value : fallback;
const ease = value => { const t = clamp(value); return t * t * (3 - 2 * t); };

// The mark comes from the mechanism itself. Once it is recognisable, it banks
// and flies through the leading edge of the curtain to uncover the real page.
export function connectionRevealState(progress) {
  const p = clamp(finite(progress));
  const interval = (start, end) => ease((p - start) / (end - start));
  return {
    assembly: clamp(p / .26),
    trace: interval(.28, .46),
    face: interval(.42, .66),
    morph: interval(.48, .69),
    fill: interval(.68, .76),
    bank: interval(.77, .9),
    flight: interval(.82, 1),
    sculptureOpacity: 1 - interval(.5, .66),
    phase: p < .28 ? 'assembly' : p < .48 ? 'trace' : p < .68 ? 'morph' : p < .82 ? 'logo' : 'flight',
  };
}

export function connectionPresentation(THREE) {
  const direction = new THREE.Vector3(9, 7, 14).normalize();
  const right = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), direction).normalize();
  const up = new THREE.Vector3().crossVectors(direction, right);
  const front = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(right, up, direction));
  return { direction, right, up, front };
}

// Flight coordinates use the camera plane, so the wipe follows the aircraft on
// both portrait and landscape screens instead of depending on world units.
export function connectionFlightState(flight, bank, aspect = 1) {
  const f = clamp(flight), b = clamp(bank), a = Math.max(.2, finite(aspect, 1));
  return {
    x: f * 1.8,
    y: f * .46,
    scale: 1 - f * .32,
    pitch: b * .42,
    yaw: -b * .34,
    roll: -b * Math.atan2(1.8 * a, .46),
  };
}

// The diagonal curtain meets the projected trailing contour of the aircraft.
// Only the short initial pickup crosses from the viewport edge to the mark;
// thereafter the page is uncovered by the actual silhouette, at every size.
export function connectionCurtainEdge(flight, projectedOutline) {
  const f = clamp(finite(flight));
  if (!f || !projectedOutline?.length) return -14;
  const contact = Math.min(...projectedOutline.map(([x, y]) => x + 14 * y / 100));
  return -14 + (contact + 14) * ease(f / .12);
}

export function connectionScrollProgress(rect, viewportHeight) {
  const viewport = Math.max(1, finite(viewportHeight, 1));
  const height = Math.max(1, finite(rect.height, 1));
  return clamp((viewport * .85 - finite(rect.top)) / (viewport * .85 + height * .35));
}

// Fit all corners of the authored scatter volume, not just its gathered pose.
export function connectionFitDistance(aspect, fov = 36, projectedPoints = null) {
  const ratio = Math.max(.2, finite(aspect, 1));
  const length = Math.hypot(9, 7, 14), direction = [9 / length, 7 / length, 14 / length];
  const horizontal = Math.hypot(direction[2], direction[0]);
  const right = [direction[2] / horizontal, 0, -direction[0] / horizontal];
  const up = [direction[1] * right[2], direction[2] * right[0] - direction[0] * right[2], -direction[1] * right[0]];
  const tanVertical = Math.tan(clamp(finite(fov, 36), 20, 70) * Math.PI / 360);
  if (projectedPoints?.length) {
    let fitted = 10;
    for (const [x, y, depth] of projectedPoints) {
      fitted = Math.max(fitted, Math.abs(x) / (tanVertical * ratio) + depth, Math.abs(y) / tanVertical + depth);
    }
    return fitted * 1.105;
  }
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  let distance = 15.8;
  for (const x of [-5.5, 5.5]) for (const y of [-3.4, 3.4]) for (const z of [-2.45, 2.45]) {
    const point = [x, y, z], depth = dot(point, direction);
    distance = Math.max(distance,
      Math.abs(dot(point, right)) / (tanVertical * ratio) + depth,
      Math.abs(dot(point, up)) / tanVertical + depth);
  }
  return distance * 1.045;
}

// Sample transformed part bounds once. The complete scatter box has large
// empty corners; fitting those would shrink the actual sculpture needlessly.
export function connectionFitPoints(THREE, sculpture) {
  const { direction, right, up, front } = connectionPresentation(THREE);
  const vertex = new THREE.Vector3(), points = [];
  for (const time of [0, 13]) for (const progress of [0, .25, .5, .75, 1]) {
    for (const x of [-1, 1]) for (const y of [-1, 1]) {
      sculpture.update(time, { progress, pointer: { x, y }, reducedMotion: false });
      sculpture.group.updateMatrixWorld(true);
      sculpture.group.traverse(object => {
        if (!object.isMesh) return;
        if (!object.geometry.boundingBox) object.geometry.computeBoundingBox();
        const bounds = object.geometry.boundingBox;
        for (const px of [bounds.min.x, bounds.max.x]) for (const py of [bounds.min.y, bounds.max.y]) for (const pz of [bounds.min.z, bounds.max.z]) {
          vertex.set(px, py, pz).applyMatrix4(object.matrixWorld);
          points.push([vertex.dot(right), vertex.dot(up), vertex.dot(direction)]);
        }
      });
    }
  }
  // The assembled hardware turns with its traced contour. Include that turn
  // in the fit; otherwise a portrait viewport can clip the long side plates.
  sculpture.update(0, { progress: 1, pointer: { x: 0, y: 0 }, reducedMotion: true });
  sculpture.group.updateMatrixWorld(true);
  const turn = new THREE.Quaternion();
  for (const face of [0, .25, .5, .75, 1]) {
    turn.identity().slerp(front, face);
    sculpture.group.traverse(object => {
      if (!object.isMesh) return;
      const bounds = object.geometry.boundingBox;
      for (const x of [bounds.min.x, bounds.max.x]) for (const y of [bounds.min.y, bounds.max.y]) for (const z of [bounds.min.z, bounds.max.z]) {
        vertex.set(x, y, z).applyMatrix4(object.matrixWorld).applyQuaternion(turn);
        points.push([vertex.dot(right), vertex.dot(up), vertex.dot(direction)]);
      }
    });
  }
  return points;
}

// Pure motion state makes the control semantics checkable without a GPU.
export function createConnectionMotion({ progress = 0, reducedMotion = false } = {}) {
  const state = {
    progress: reducedMotion ? 1 : clamp(finite(progress)),
    target: reducedMotion ? 1 : clamp(finite(progress)),
    elapsed: 0,
    paused: Boolean(reducedMotion),
    reducedMotion: Boolean(reducedMotion),
    pointer: { x: 0, y: 0 },
    pointerTarget: { x: 0, y: 0 },
    transition: null,
  };
  function setTarget(value, duration = 2.1, linear = false) {
    const next = clamp(finite(value, state.target));
    if (Math.abs(next - state.target) < .0001 && !state.paused && !state.reducedMotion) return;
    state.target = next;
    if (state.paused || state.reducedMotion || duration <= 0) {
      state.progress = next; state.transition = null;
    } else {
      state.transition = { from: state.progress, to: next, time: 0, duration: Math.max(.1, finite(duration, 2.1)), linear };
    }
  }
  function setPointer(x, y) {
    if (state.paused || state.reducedMotion) return;
    state.pointerTarget.x = clamp(finite(x), -1, 1);
    state.pointerTarget.y = clamp(finite(y), -1, 1);
  }
  function setPaused(paused) {
    state.paused = state.reducedMotion || Boolean(paused);
    if (state.paused) Object.assign(state.pointerTarget, state.pointer);
  }
  function setReduced(reduced) {
    state.reducedMotion = Boolean(reduced);
    state.paused = true;
    state.transition = null;
    state.elapsed = 0;
    state.pointer.x = state.pointer.y = state.pointerTarget.x = state.pointerTarget.y = 0;
    if (reduced) state.progress = state.target = 1;
  }
  function advance(seconds) {
    if (state.paused || state.reducedMotion) return;
    const dt = clamp(finite(seconds), 0, .1);
    state.elapsed += dt;
    if (state.transition) {
      const transition = state.transition;
      transition.time = Math.min(transition.duration, transition.time + dt);
      const t = transition.time / transition.duration;
      state.progress = transition.from + (transition.to - transition.from) * (transition.linear ? t : ease(t));
      if (transition.time >= transition.duration) { state.progress = transition.to; state.transition = null; }
    }
    const damping = 1 - Math.exp(-7 * dt);
    for (const axis of ['x', 'y']) {
      state.pointer[axis] += (state.pointerTarget[axis] - state.pointer[axis]) * damping;
      if (Math.abs(state.pointerTarget[axis] - state.pointer[axis]) < .0001) state.pointer[axis] = state.pointerTarget[axis];
    }
  }
  return { state, setTarget, setPointer, setPaused, setReduced, advance };
}

export function connectionPointerActivation(start, end, scrollY) {
  return Boolean(start && !start.moved && start.id === end.pointerId
    && Math.hypot(end.clientX - start.x, end.clientY - start.y) <= 8
    && Math.abs(scrollY - start.scrollY) <= 8);
}

export function mountConnectionStory(host) {
  if (!host) return null;
  if (mounted.has(host)) return mounted.get(host);
  const stage = host.querySelector('[data-connection-stage]');
  if (!stage) return null;
  const fallback = host.querySelector('[data-connection-fallback]');
  const opening = host.hasAttribute('data-connection-opening');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (opening && (!host.hasAttribute('data-connection-active') || reduced.matches)) {
    host.dataset.connectionState = 'fallback';
    host.removeAttribute('data-connection-active');
    return null;
  }
  const curtain = host.querySelector('[data-connection-curtain]');
  const skip = host.querySelector('[data-connection-skip]');
  const motion = createConnectionMotion({ reducedMotion: reduced.matches });
  const cleanups = [];
  let graphics = null, initialization = null, preloadObserver = null, visibilityObserver = null, resizeObserver = null;
  let disposed = false, failed = false, inView = false, activePage = true, completed = false, pageRevealing = false;
  let frameId = 0, lastFrame = 0, width = 0, height = 0;
  let manualOverride = false, manualScrollOrigin = 0, scrollGestureArmed = false;
  let pointerStart = null, pendingClickAllowed = null;
  let waitingForOpening = opening && document.documentElement.classList.contains('lu-laedt');
  let openingTimer = 0;
  host.dataset.connectionState = 'waiting';
  stage.setAttribute('aria-disabled', 'true');
  stage.setAttribute('aria-label', 'Interaktive 3D-Illustration wird geladen.');
  stage.setAttribute('aria-keyshortcuts', 'Enter Space Escape');

  function on(target, event, handler, options) {
    target.addEventListener(event, handler, options);
    cleanups.push(() => target.removeEventListener(event, handler, options));
  }
  function visible() {
    return !disposed && !failed && !completed && !waitingForOpening && activePage && !document.hidden && inView && width > 0 && height > 0;
  }
  function canPaint() {
    // A single explicit repaint remains valid in a background Safari preview;
    // animation scheduling still requires a visible document.
    return !disposed && !failed && !completed && activePage && inView && width > 0 && height > 0;
  }
  function stop() {
    if (frameId) window.cancelAnimationFrame(frameId);
    frameId = 0; lastFrame = 0;
  }
  function updateAccessibility() {
    const ready = Boolean(graphics) && !failed && !disposed;
    const gathered = motion.state.target >= .5;
    stage.setAttribute('aria-disabled', String(!ready));
    stage.setAttribute('aria-pressed', String(opening ? motion.state.paused : gathered));
    if (ready) {
      const action = opening ? 'Aktivieren pausiert oder startet die Animation.' : gathered ? 'Aktivieren, um das AIFOREU-Logo wieder in Einzelteile zu verwandeln.' : 'Aktivieren, um aus den Einzelteilen das AIFOREU-Logo entstehen zu lassen.';
      const playback = reduced.matches ? 'Reduzierte Bewegung ist aktiviert.'
        : motion.state.paused ? 'Animation pausiert. Escape setzt sie fort.' : 'Escape pausiert die Animation.';
      stage.setAttribute('aria-label', `Interaktive 3D-Illustration. ${action} ${playback}`);
    } else stage.setAttribute('aria-label', failed ? '3D-Illustration momentan nicht verfügbar.' : 'Interaktive 3D-Illustration wird geladen.');
    host.dataset.connectionPaused = String(motion.state.paused);
  }
  function disposeGraphics() {
    if (!graphics) return;
    const { scene, renderer, environment, canvas } = graphics;
    const geometries = new Set(), materials = new Set(), textures = new Set();
    scene.traverse(object => {
      if (object.isLight && object.shadow) object.shadow.dispose();
      if (object.geometry) geometries.add(object.geometry);
      for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
        if (!material) continue;
        materials.add(material);
        for (const value of Object.values(material)) if (value?.isTexture && value !== environment?.texture) textures.add(value);
      }
    });
    geometries.forEach(item => item.dispose());
    materials.forEach(item => item.dispose());
    textures.forEach(item => item.dispose());
    environment?.dispose(); renderer.dispose(); canvas.remove();
    graphics = null;
  }
  function fail(error) {
    if (disposed || failed) return;
    failed = true; stop(); disposeGraphics();
    if (fallback) fallback.hidden = false;
    host.dataset.connectionState = 'fallback';
    if (opening) finishOpening();
    updateAccessibility();
    // Keep the authored fallback and native page content intact.
    console.warn('AIFOREU connection illustration unavailable:', error?.message || error);
  }
  function finishOpening() {
    if (!opening || completed) return;
    completed = true;
    stop();
    window.clearTimeout(openingTimer);
    waitingForOpening = false; openingTimer = 0;
    preloadObserver?.disconnect(); visibilityObserver?.disconnect(); resizeObserver?.disconnect();
    host.dataset.connectionComplete = 'true';
    host.removeAttribute('data-connection-active');
    host.setAttribute('aria-hidden', 'true');
    stage.tabIndex = -1;
    // Never drop keyboard focus into a hidden overlay. Pointer users keep
    // their scroll position and are not unexpectedly moved to a heading.
    if (host.contains(document.activeElement)) {
      const title = document.getElementById('landing-title');
      title?.setAttribute('tabindex', '-1');
      title?.focus({ preventScroll: true });
    }
    document.dispatchEvent(new CustomEvent('aiforeu:opening-complete'));
    disposeGraphics();
  }
  function render() {
    if (!graphics || !canPaint()) return;
    const { sculpture, logo, presentation, floor, sculptureMaterials, scene, camera, renderer, direction, right, up, front, target } = graphics;
    try {
      const reveal = connectionRevealState(motion.state.progress);
      if (opening && reveal.flight > 0 && !pageRevealing) {
        pageRevealing = true;
        document.dispatchEvent(new CustomEvent('aiforeu:opening-reveal'));
      }
      const parallax = 1 - ease((motion.state.progress - .17) / .1);
      camera.position.copy(direction).multiplyScalar(graphics.distance);
      camera.position.x += motion.state.pointer.x * .35 * parallax;
      camera.position.y += motion.state.pointer.y * .22 * parallax;
      camera.lookAt(target);
      sculpture.update(motion.state.elapsed, {
        progress: reveal.assembly,
        pointer: { x: motion.state.pointer.x * parallax, y: motion.state.pointer.y * parallax },
        reducedMotion: motion.state.reducedMotion,
      });
      sculpture.group.visible = reveal.sculptureOpacity > .001;
      for (const material of sculptureMaterials) {
        const transparent = reveal.sculptureOpacity < .999;
        if (material.transparent !== transparent) {
          material.transparent = transparent;
          material.depthWrite = !transparent;
          material.needsUpdate = true;
        }
        material.opacity = reveal.sculptureOpacity;
      }
      floor.visible = sculpture.group.visible;
      floor.material.opacity = (width < 700 ? .12 : .21) * reveal.sculptureOpacity;
      logo.update({ ...reveal, strokeWidth: Math.max(.014, graphics.distance * Math.tan(camera.fov * Math.PI / 360) / height * 1.6) });
      presentation.quaternion.identity().slerp(front, reveal.face);
      const flight = connectionFlightState(opening ? reveal.flight : 0, opening ? reveal.bank : 0, camera.aspect);
      graphics.flightEuler.set(flight.pitch, flight.yaw, flight.roll, 'ZYX');
      graphics.flightQuaternion.setFromEuler(graphics.flightEuler);
      presentation.quaternion.multiply(graphics.flightQuaternion);
      const halfHeight = graphics.distance * Math.tan(camera.fov * Math.PI / 360);
      presentation.position.copy(right).multiplyScalar(flight.x * halfHeight * camera.aspect).addScaledVector(up, flight.y * halfHeight);
      presentation.scale.setScalar(flight.scale);
      if (curtain) {
        camera.updateMatrixWorld();
        presentation.updateMatrixWorld(true);
        const outline = logo.outlinePoints.map(point => {
          graphics.projectedVertex.set(...point).applyMatrix4(logo.group.matrixWorld).project(camera);
          return [(graphics.projectedVertex.x + 1) * 50, (1 - graphics.projectedVertex.y) * 50];
        });
        const edge = connectionCurtainEdge(reveal.flight, outline);
        curtain.style.clipPath = `polygon(${edge.toFixed(3)}% 0,100% 0,100% 100%,${(edge - 14).toFixed(3)}% 100%)`;
      }
      renderer.render(scene, camera);
      if (fallback) fallback.hidden = true;
      graphics.canvas.hidden = false;
      host.dataset.connectionState = 'ready';
      host.dataset.connectionPhase = reveal.phase;
      if (opening && motion.state.progress >= .9999) finishOpening();
    } catch (error) { fail(error); }
  }
  function schedule() {
    const moving = motion.state.transition || Math.abs(motion.state.pointer.x - motion.state.pointerTarget.x) > .0001
      || Math.abs(motion.state.pointer.y - motion.state.pointerTarget.y) > .0001;
    if (!frameId && moving && graphics && visible() && !motion.state.paused && !motion.state.reducedMotion) {
      frameId = window.requestAnimationFrame(tick);
    }
  }
  function tick(now) {
    frameId = 0;
    if (!visible() || motion.state.paused || motion.state.reducedMotion) { lastFrame = 0; return; }
    const dt = lastFrame ? Math.min((now - lastFrame) / 1000, .05) : 0;
    lastFrame = now;
    motion.advance(dt);
    render(); schedule();
  }
  function redraw() { render(); schedule(); }
  function releaseOpening() {
    if (completed || disposed) return;
    waitingForOpening = false;
    window.clearTimeout(openingTimer);
    openingTimer = 0;
    redraw();
  }
  on(document, 'lu:offen', () => {
    if (!waitingForOpening || completed || disposed) return;
    const curtain = document.querySelector('.lu-lader');
    if (!curtain || reduced.matches) { releaseOpening(); return; }
    on(curtain, 'transitionend', event => {
      if (event.target === curtain && event.propertyName === 'clip-path') releaseOpening();
    });
    // A cancelled transition must never hold the mechanism in its first pose.
    window.clearTimeout(openingTimer);
    openingTimer = window.setTimeout(releaseOpening, 900);
  });
  if (waitingForOpening) openingTimer = window.setTimeout(releaseOpening, 6500);
  function readScrollTarget() { return connectionScrollProgress(stage.getBoundingClientRect(), window.innerHeight); }
  function applyScrollTarget() {
    // The opening plays once on entry and remains a clean logo. Ordinary page
    // scrolling must not rewind it halfway through its reveal.
    if (opening) return;
    if (!manualOverride && !motion.state.paused && !motion.state.reducedMotion) {
      motion.setTarget(readScrollTarget(), .85); updateAccessibility(); schedule();
    }
  }
  function resize() {
    if (!graphics || disposed || failed) return;
    width = Math.max(0, stage.clientWidth); height = Math.max(0, stage.clientHeight);
    if (!width || !height) { stop(); return; }
    const { renderer, camera } = graphics;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(width, height, false);
    camera.aspect = width / height; camera.updateProjectionMatrix();
    graphics.key.position.set(...(width < 700 ? [-3, 22, 5] : [-6, 12, 9]));
    graphics.distance = connectionFitDistance(width / height, camera.fov, graphics.fitPoints);
    redraw();
  }
  async function initialize() {
    if (disposed || failed) return;
    if (initialization) return initialization;
    initialization = (async () => {
      try {
        const [THREE, { RoomEnvironment }, { createConnectionSculpture }, { createConnectionLogo }] = await Promise.all([
          import('./agentario-scene/vendor/three.module.min.js'),
          import('./agentario-scene/vendor/RoomEnvironment.js'),
          import('./aiforeu-world/connection-sculpture.js'),
          import('./aiforeu-world/connection-logo.js'),
        ]);
        if (disposed || failed || completed) return;
        const canvas = document.createElement('canvas');
        canvas.className = 'connection-canvas'; canvas.hidden = true;
        canvas.setAttribute('aria-hidden', 'true');
        const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: opening, powerPreference: 'default' });
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = .92;
        renderer.setClearColor('#f5f7fa', opening ? 0 : 1);
        renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        const scene = new THREE.Scene();
        if (!opening) scene.background = new THREE.Color('#f5f7fa');
        const camera = new THREE.PerspectiveCamera(36, 1, .1, 120);
        // Register ownership before building the environment/sculpture so an
        // initialization failure also releases partially created GPU resources.
        graphics = { THREE, scene, camera, renderer, environment: null, sculpture: null, logo: null, floor: null, sculptureMaterials: new Set(), canvas, fitPoints: null, distance: 20,
          ...connectionPresentation(THREE), target: new THREE.Vector3(0, 0, 0), projectedVertex: new THREE.Vector3(), flightEuler: new THREE.Euler(), flightQuaternion: new THREE.Quaternion() };
        const room = new RoomEnvironment(), pmrem = new THREE.PMREMGenerator(renderer);
        let environment;
        try { environment = pmrem.fromScene(room, .035); }
        finally { room.dispose(); pmrem.dispose(); }
        graphics.environment = environment;
        scene.environment = environment.texture; scene.environmentIntensity = .62;
        scene.add(new THREE.HemisphereLight('#ffffff', '#687485', .48));
        const key = new THREE.DirectionalLight('#ffffff', 2.8);
        key.position.set(-6, 12, 9); key.castShadow = true;
        key.shadow.mapSize.set(2048, 2048);
        Object.assign(key.shadow.camera, { left: -9, right: 9, top: 8, bottom: -8, near: .5, far: 40 });
        key.shadow.bias = -.00015; key.shadow.normalBias = .012; key.shadow.radius = 1;
        scene.add(key);
        graphics.key = key;
        const rim = new THREE.DirectionalLight('#ffffff', 1.65); rim.position.set(7, 6, -9); scene.add(rim);
        const fill = new THREE.DirectionalLight('#edf1f7', .28); fill.position.set(-10, 0, -4); scene.add(fill);
        const floor = new THREE.Mesh(new THREE.PlaneGeometry(100, 100), new THREE.ShadowMaterial({ color: '#344256', opacity: .21, depthWrite: false }));
        floor.rotation.x = -Math.PI / 2; floor.position.y = -3.35; floor.receiveShadow = true; scene.add(floor);
        graphics.floor = floor;
        const sculpture = createConnectionSculpture(THREE);
        const presentation = new THREE.Group();
        presentation.name = 'Mechanism, traced mark and flight in a shared coordinate frame';
        scene.add(presentation); presentation.add(sculpture.group);
        graphics.presentation = presentation;
        graphics.sculpture = sculpture;
        sculpture.group.traverse(object => {
          for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
            if (material) graphics.sculptureMaterials.add(material);
          }
        });
        const logo = createConnectionLogo(THREE, sculpture);
        presentation.add(logo.group);
        graphics.logo = logo;
        graphics.fitPoints = connectionFitPoints(THREE, sculpture);
        const vertex = new THREE.Vector3(), turn = new THREE.Quaternion();
        for (const face of [0, .25, .5, .75, 1]) {
          turn.identity().slerp(graphics.front, face);
          for (const point of logo.fitPoints) {
            vertex.set(...point).applyQuaternion(turn);
            graphics.fitPoints.push([vertex.dot(graphics.right), vertex.dot(graphics.up), vertex.dot(graphics.direction)]);
          }
        }
        stage.prepend(canvas);
        on(canvas, 'webglcontextlost', event => { event.preventDefault(); fail(new Error('WebGL context lost')); });
        if (!motion.state.reducedMotion && !manualOverride) {
          if(opening){
            manualOverride=true;manualScrollOrigin=window.scrollY;scrollGestureArmed=false;
            motion.setTarget(1,7.8,true);
          }else motion.setTarget(readScrollTarget(),0);
        }
        if ('ResizeObserver' in window) {
          resizeObserver = new ResizeObserver(resize); resizeObserver.observe(stage);
        }
        updateAccessibility(); resize();
        preloadObserver?.disconnect();
      } catch (error) { fail(error); }
    })();
    return initialization;
  }
  function destroy() {
    if (disposed) return;
    disposed = true; stop();
    window.clearTimeout(openingTimer);
    preloadObserver?.disconnect(); visibilityObserver?.disconnect(); resizeObserver?.disconnect();
    cleanups.forEach(cleanup => cleanup()); disposeGraphics(); mounted.delete(host);
    if (fallback) fallback.hidden = false;
    host.dataset.connectionState = 'waiting';
    updateAccessibility();
  }

  function activate() {
    if (!graphics || failed) return;
    if (opening) { togglePlayback(); return; }
    manualOverride = true; manualScrollOrigin = window.scrollY; scrollGestureArmed = false;
    const target = motion.state.target >= .5 ? 0 : 1;
    motion.setTarget(target, document.hidden ? 0 : Math.max(2, Math.abs(target - motion.state.progress) * 7.2));
    updateAccessibility(); redraw();
  }
  function togglePlayback() {
    if (!graphics || reduced.matches || failed) return;
    motion.setPaused(!motion.state.paused); stop();
    if (!motion.state.paused) applyScrollTarget();
    updateAccessibility(); redraw();
  }
  if (skip) on(skip, 'click', finishOpening);
  const coveredHero = opening && host.parentElement?.querySelector('[data-world]');
  // Keyboard navigation takes precedence over the introduction. Reveal a
  // destination as soon as focus enters it, rather than hiding focused UI.
  if (coveredHero) on(coveredHero, 'focusin', finishOpening);
  on(stage, 'pointerdown', event => {
    if (event.isPrimary === false || (event.button !== undefined && event.button !== 0)) return;
    pointerStart = { id: event.pointerId, x: event.clientX, y: event.clientY, scrollY: window.scrollY, moved: false };
    pendingClickAllowed = null;
  }, { passive: true });
  on(stage, 'pointerup', event => {
    pendingClickAllowed = connectionPointerActivation(pointerStart, event, window.scrollY);
    pointerStart = null;
  }, { passive: true });
  on(stage, 'click', event => {
    // Assistive activation can arrive without a pointer gesture. A dragged or
    // cancelled touch must never turn the browser's trailing click into action.
    const allowed = pendingClickAllowed !== false && !pointerStart?.moved;
    pendingClickAllowed = null;
    if (allowed) activate();
  });
  on(stage, 'keydown', event => {
    if (event.key === 'Enter' || event.key === ' ' || event.key === 'Spacebar') {
      event.preventDefault();
      if (!event.repeat) activate();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      if (!event.repeat) togglePlayback();
    }
  });
  on(stage, 'pointermove', event => {
    if (pointerStart && pointerStart.id === event.pointerId
      && (Math.hypot(event.clientX - pointerStart.x, event.clientY - pointerStart.y) > 8
        || Math.abs(window.scrollY - pointerStart.scrollY) > 8)) pointerStart.moved = true;
    if (!graphics || !visible() || motion.state.paused || reduced.matches) return;
    if (event.pointerType === 'touch' && event.buttons === 0) return;
    const rect = stage.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    motion.setPointer((event.clientX - rect.left) / rect.width * 2 - 1, 1 - (event.clientY - rect.top) / rect.height * 2);
    schedule();
  }, { passive: true });
  for (const event of ['pointerleave', 'pointercancel']) on(stage, event, () => {
    if (pointerStart) { pointerStart = null; pendingClickAllowed = false; }
    motion.setPointer(0, 0); schedule();
  }, { passive: true });
  on(window, 'wheel', event => { if (manualOverride && Math.abs(event.deltaY) > 4) scrollGestureArmed = true; }, { passive: true });
  on(window, 'touchstart', event => {
    if (manualOverride && !event.target.closest?.('button,a,input,textarea,select')) scrollGestureArmed = true;
  }, { passive: true });
  on(window, 'keydown', event => {
    if (manualOverride && ['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', 'Home', 'End', ' '].includes(event.key)
      && !event.defaultPrevented && !event.target.closest?.('button,[role="button"],a,input,textarea,select,[contenteditable]')) scrollGestureArmed = true;
  });
  on(window, 'scroll', () => {
    if (opening && Math.abs(window.scrollY - manualScrollOrigin) > 80) { finishOpening(); return; }
    if (pointerStart && Math.abs(window.scrollY - pointerStart.scrollY) > 8) pointerStart.moved = true;
    if (manualOverride && scrollGestureArmed && Math.abs(window.scrollY - manualScrollOrigin) > 20) {
      manualOverride = false; scrollGestureArmed = false;
    }
    if (!('IntersectionObserver' in window)) {
      const rect = stage.getBoundingClientRect(); inView = rect.bottom > 0 && rect.top < window.innerHeight;
      if (!inView) stop(); else redraw();
    }
    applyScrollTarget();
  }, { passive: true });
  on(window, 'resize', resize, { passive: true });
  on(document, 'visibilitychange', () => { if (document.hidden) stop(); else redraw(); });
  on(window, 'pagehide', event => { activePage = false; stop(); if (!event.persisted) destroy(); });
  on(window, 'pageshow', () => { activePage = true; resize(); });
  on(reduced, 'change', () => {
    motion.setReduced(reduced.matches); stop(); manualOverride = false;
    if (opening && reduced.matches) finishOpening();
    updateAccessibility(); redraw();
  });

  const api = { destroy, initialize, getState: () => ({
    ready: Boolean(graphics) && !failed, paused: motion.state.paused, reducedMotion: motion.state.reducedMotion,
    inView, activePage, progress: motion.state.progress, target: motion.state.target, manualOverride,
    frameScheduled: Boolean(frameId), completed,
  }) };
  mounted.set(host, api);
  if ('IntersectionObserver' in window) {
    visibilityObserver = new IntersectionObserver(entries => {
      inView = entries.some(entry => entry.isIntersecting && entry.intersectionRatio > 0);
      if (inView) { applyScrollTarget(); redraw(); } else stop();
    }, { threshold: 0 });
    visibilityObserver.observe(stage);
    preloadObserver = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) initialize();
    }, { rootMargin: '450px 0px', threshold: 0 });
    preloadObserver.observe(stage);
  } else {
    const rect = stage.getBoundingClientRect(); inView = rect.bottom > 0 && rect.top < window.innerHeight;
    initialize();
  }
  return api;
}

export function mountConnectionStories(scope = document) {
  return [...scope.querySelectorAll('[data-connection-story]')].map(mountConnectionStory);
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => mountConnectionStories(), { once: true });
  else mountConnectionStories();
}
