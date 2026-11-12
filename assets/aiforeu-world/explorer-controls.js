import { createExplorer } from './world-explorer.js';

// Direct scene interaction. Input belongs to the focused scene, never the page.
export function mountExplorerControls({THREE, host, stage, scene, camera, onStart, onStop, requestFrame, redraw}) {
  const avatar = createExplorer(THREE);
  scene.add(avatar.group);
  const keys = new Set(), cleanups = [];
  const forward = new THREE.Vector3(), right = new THREE.Vector3(), up = new THREE.Vector3(0,1,0);
  let active = false, destination = null;
  const map = {w:'forward',ArrowUp:'forward',s:'back',ArrowDown:'back',a:'left',ArrowLeft:'left',d:'right',ArrowRight:'right'};
  function on(target,event,handler,options){target.addEventListener(event,handler,options);cleanups.push(()=>target.removeEventListener(event,handler,options));}
  function owns(target) {
    return !!target && (target === stage || stage.contains(target)) &&
      !target.isContentEditable && !target.closest?.('a,button,input,textarea,select,[contenteditable],[role="dialog"],[role="menu"],[role="menubar"]');
  }
  function clear(){keys.clear();destination=null;}
  function start(){
    if(active)return;
    active=true;clear();avatar.reset();avatar.setActive(true);host.dataset.worldExploring='true';
    stage.focus({preventScroll:true});onStart();requestFrame();redraw();
  }
  function stop(notify=true){
    if(!active)return;
    active=false;clear();avatar.setActive(false);delete host.dataset.worldExploring;
    if(notify)onStop();
  }
  function moveTo(x,z){
    if(!avatar.canOccupy(x,z))return false;
    start();destination={x,z};stage.focus({preventScroll:true});requestFrame();redraw();return true;
  }
  function update(dt,reduced=false){
    if(!active)return;
    let x=0,z=0;
    if(keys.size){
      destination=null;
      const horizontal=Number(keys.has('right'))-Number(keys.has('left'));
      const vertical=Number(keys.has('forward'))-Number(keys.has('back'));
      camera.getWorldDirection(forward);forward.y=0;forward.normalize();right.crossVectors(forward,up).normalize();
      x=right.x*horizontal+forward.x*vertical;z=right.z*horizontal+forward.z*vertical;
    }else if(destination){
      const dx=destination.x-avatar.position.x,dz=destination.z-avatar.position.z,distance=Math.hypot(dx,dz);
      if(distance<.035)destination=null;
      else {const amount=Math.min(1,distance/(3*Math.max(dt,.001)));x=dx/distance*amount;z=dz/distance*amount;}
    }
    const moved=avatar.step(dt,{x,z},reduced);
    if(destination&&dt>0&&(moved<.00001||Math.hypot(destination.x-avatar.position.x,destination.z-avatar.position.z)<.035))destination=null;
  }
  on(document,'keydown',event=>{
    if(!owns(event.target)||event.metaKey||event.ctrlKey||event.altKey)return;
    if(event.key==='Escape'&&active){event.preventDefault();stop();return;}
    if(event.key==='Enter'&&!active){event.preventDefault();start();return;}
    const direction=map[event.key.length===1?event.key.toLowerCase():event.key];
    if(!active||!direction)return;
    event.preventDefault();destination=null;keys.add(direction);
    if(document.hidden){update(.08,matchMedia('(prefers-reduced-motion: reduce)').matches);redraw();}
    requestFrame();
  });
  on(document,'keyup',event=>{const direction=map[event.key.length===1?event.key.toLowerCase():event.key];if(direction)keys.delete(direction);});
  on(document,'pointerdown',event=>{if(active&&!stage.contains(event.target))stop();},true);
  on(document,'focusin',event=>{if(active&&!owns(event.target))stop();});
  on(window,'blur',clear);on(window,'pagehide',clear);
  on(document,'visibilitychange',()=>{if(document.hidden)clear();});
  return {avatar,update,start,stop,moveTo,get active(){return active;},get moving(){return active&&(keys.size>0||destination!==null);},
    destroy(){stop(false);cleanups.forEach(fn=>fn());avatar.group.removeFromParent();avatar.dispose();}};
}
