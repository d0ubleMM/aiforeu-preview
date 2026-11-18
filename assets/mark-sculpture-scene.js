import * as THREE from './agentario-scene/vendor/three.module.min.js';

const DURATION = 7.4;
const clamp = value => Math.max(0, Math.min(1, value));
const ease = value => { const t = clamp(value); return t * t * t * (t * (t * 6 - 15) + 10); };

// Original SVG outline; the reveal is a camera move around three solid pieces.
// Lighting is baked into one environment map. No per-frame shadow or blur passes.
export function mountMarkSculpture(host) {
  let renderer;
  try { renderer = new THREE.WebGLRenderer({alpha: true, antialias: true, powerPreference: 'high-performance'}); }
  catch { return null; }
  const pixelRatio = Math.min(devicePixelRatio || 1, 1.5);
  renderer.setPixelRatio(pixelRatio);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  renderer.setClearColor(0x000000, 0);
  const canvas = renderer.domElement;
  canvas.setAttribute('aria-hidden', 'true');
  host.append(canvas);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, .1, 100);
  const sculpture = new THREE.Group();
  scene.add(sculpture);

  // Long studio strips create moving highlights as the surfaces turn into place.
  const studio = new THREE.Scene();
  studio.background = new THREE.Color('#080b10');
  const cards = [];
  for (const [width, height, x, y, z, color, strength] of [
    [12, 2.1, -3, 6, 6, '#f6f8ff', 6],
    [2.8, 10, -2.4, 1, 8, '#f4f7ff', 5],
    [.8, 9, 4, 0, 7, '#ffffff', 4],
    [1.5, 10, 6, 1, 5, '#d3e3ff', 4],
    [3, 7, -6, 0, 2, '#ffffff', 3],
    [10, 1, 0, -4, 6, '#8c9bb7', 2],
    [8, 3, 0, 5, -5, '#ffffff', 5]
  ]) {
    const card = new THREE.Mesh(new THREE.PlaneGeometry(width, height), new THREE.MeshBasicMaterial({color: new THREE.Color(color).multiplyScalar(strength), side: THREE.DoubleSide}));
    card.position.set(x, y, z); card.lookAt(0, 0, 0); studio.add(card); cards.push(card);
  }
  const pmrem = new THREE.PMREMGenerator(renderer);
  const environment = pmrem.fromScene(studio, .04);
  scene.environment = environment.texture;
  pmrem.dispose();
  cards.forEach(card => { card.geometry.dispose(); card.material.dispose(); });

  scene.add(new THREE.HemisphereLight('#cbd9f2', '#131722', .7));
  const key = new THREE.DirectionalLight('#f7f9ff', 2.5); key.position.set(-5, 8, 7); scene.add(key);
  const rim = new THREE.DirectionalLight('#aecbff', 3); rim.position.set(5, 2, -4); scene.add(rim);
  const fill = new THREE.DirectionalLight('#ffffff', .8); fill.position.set(-4, -2, 6); scene.add(fill);

  const face = new THREE.MeshStandardMaterial({color: '#dae1eb', metalness: 1, roughness: .2, envMapIntensity: 1.4});
  const edge = new THREE.MeshStandardMaterial({color: '#aeb6c5', metalness: 1, roughness: .3, envMapIntensity: 1.25});
  const outline = [[128,24],[236,148],[200,128],[176,148],[128,116],[80,148],[56,128],[20,148]].map(([x,y]) => new THREE.Vector2((x-128)/30, (86-y)/30));
  function clip(points, boundary, right) {
    const result = [];
    for (let i = 0; i < points.length; i++) {
      const a = points[i], b = points[(i+1)%points.length];
      const aIn = right ? a.x >= boundary : a.x <= boundary, bIn = right ? b.x >= boundary : b.x <= boundary;
      if (aIn) result.push(a.clone());
      if (aIn !== bIn) { const t = (boundary-a.x)/(b.x-a.x); result.push(new THREE.Vector2(boundary, a.y+(b.y-a.y)*t)); }
    }
    return result;
  }
  const polygons = [clip(outline,-1.04,false), clip(clip(outline,-1.04,true),1.04,false), clip(outline,1.04,true)];
  const parts = polygons.map((points, index) => {
    const shape = new THREE.Shape(points);
    if (index === 1) { const hole = new THREE.Path(); hole.absarc(0,-2/30,24/30,0,Math.PI*2,true); shape.holes.push(hole); }
    const pivot = points.reduce((sum,p) => sum.add(p), new THREE.Vector2()).multiplyScalar(1/points.length);
    const geometry = new THREE.ExtrudeGeometry(shape, {depth: 1.05, bevelEnabled: true, bevelSegments: 5, steps: 1, bevelSize: .055, bevelThickness: .075, curveSegments: 48});
    geometry.translate(-pivot.x,-pivot.y,-.525);
    const mesh = new THREE.Mesh(geometry,[face,edge]); sculpture.add(mesh);
    return {mesh,pivot};
  });

  // A single translucent plane gives depth without rendering a shadow map.
  const shadowCanvas = document.createElement('canvas'); shadowCanvas.width = shadowCanvas.height = 128;
  const context = shadowCanvas.getContext('2d');
  const gradient = context.createRadialGradient(64,64,0,64,64,64);
  gradient.addColorStop(0,'rgba(0,0,0,.55)'); gradient.addColorStop(.35,'rgba(0,0,0,.3)'); gradient.addColorStop(1,'transparent');
  context.fillStyle = gradient; context.fillRect(0,0,128,128);
  const shadowTexture = new THREE.CanvasTexture(shadowCanvas);
  const contact = new THREE.Mesh(new THREE.PlaneGeometry(12,5), new THREE.MeshBasicMaterial({map: shadowTexture, transparent: true, depthWrite: false}));
  contact.rotation.x = -Math.PI/2; contact.position.set(0,-2.7,0); scene.add(contact);

  let lost = false, lastTime = DURATION, lastPointer = {x:0,y:0}, distance = 12, quality = pixelRatio;
  const offsets = [[-1.65,.25,1.3],[.1,.65,-.6],[1.65,-.2,1.6]];
  const turns = [[.1,-.38,-.12],[-.15,.4,.06],[-.1,.4,.15]];
  function render(seconds = DURATION, pointer = {x:0,y:0}) {
    if (lost) return;
    lastTime = seconds; lastPointer = pointer;
    const pullback = ease(seconds / 5.6);
    const assembled = ease((seconds-.65)/4.6);
    parts.forEach(({mesh,pivot},i) => {
      const spread = 1-ease((seconds-.65-i*.13)/4.3);
      const offset = offsets[i], rotation = turns[i];
      mesh.position.set(pivot.x+(i-1)*.027+offset[0]*spread, pivot.y+offset[1]*spread, offset[2]*spread);
      mesh.rotation.set(rotation[0]*spread,rotation[1]*spread,rotation[2]*spread);
    });
    sculpture.rotation.set(.02-.2*pullback+pointer.y*.025, .52-.88*pullback+pointer.x*.045, -.09+.105*pullback);
    sculpture.position.set(0,.04,0);
    camera.position.set(.7*(1-pullback),.4+.35*pullback,distance*(.72+.28*pullback));
    camera.lookAt(.15*(1-pullback),.02,0);
    // A final slow sweep of light reads across the assembled metal.
    const lightTravel = ease((seconds-3.6)/3.8);
    key.position.set(-7+lightTravel*5,8,7);
    key.intensity = 1.6+1.2*lightTravel;
    contact.material.opacity = .25+.75*assembled;
    renderer.render(scene,camera);
  }
  function resize() {
    const {width,height} = host.getBoundingClientRect();
    if (!width || !height) return;
    renderer.setSize(width,height,false); camera.aspect = width/height;
    distance = Math.max(5.05,8.7/camera.aspect)/(2*Math.tan(THREE.MathUtils.degToRad(camera.fov/2)));
    camera.updateProjectionMatrix(); render(lastTime,lastPointer);
  }
  const observer = new ResizeObserver(resize); observer.observe(host);
  const onLost = event => { event.preventDefault(); lost = true; host.closest('[data-mark-sculpture]')?.removeAttribute('data-ready'); };
  const onRestored = () => host.dispatchEvent(new Event('mark-context-restored'));
  canvas.addEventListener('webglcontextlost',onLost); canvas.addEventListener('webglcontextrestored',onRestored);
  resize();
  return {
    duration: DURATION, render, resize, canvas,
    // Lower fill cost only when actual frame intervals show sustained overload.
    lowerQuality() { if (quality <= 1) return; quality = Math.max(1,quality-.25); renderer.setPixelRatio(quality); resize(); },
    snapshot(seconds = DURATION) { render(seconds); return canvas.toDataURL('image/png'); },
    dispose() {
      observer.disconnect(); canvas.removeEventListener('webglcontextlost',onLost); canvas.removeEventListener('webglcontextrestored',onRestored);
      parts.forEach(part => part.mesh.geometry.dispose()); face.dispose(); edge.dispose();
      contact.geometry.dispose(); contact.material.dispose(); shadowTexture.dispose(); environment.dispose();
      renderer.dispose(); renderer.forceContextLoss(); canvas.remove();
    }
  };
}
