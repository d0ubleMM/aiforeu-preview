import * as THREE from '../agentario-scene/vendor/three.module.min.js';
import {GLTFLoader} from '../agentario-scene/vendor/GLTFLoader.js';

const white=new THREE.Color('#f4f6fb');
const clamp=value=>Math.max(0,Math.min(1,Number.isFinite(value)?value:0));
const smooth=value=>value*value*(3-2*value);

/** Optional alternative skin; never mounts or modifies the host by itself.
 * Replace carrier.exterior, carrier.roof, carrier.canopy and the mesh named
 * carrier-continuous-floor. The GLB includes reachable hall and bridge floors.
 * group is already scaled to metres. Caller owns scene attachment and camera.
 */
export async function createBomberSkin({signal,url=new URL('./bomber-sharp.glb',import.meta.url).href}={}) {
  if(signal?.aborted)throw new DOMException('Model loading cancelled','AbortError');
  const gltf=await new GLTFLoader().loadAsync(url);
  const group=gltf.scene;group.name='AIFOREU sharp carrier skin';group.scale.setScalar(36);
  const meshes=[],materials=new Map(),geometries=new Set(),textures=new Set();
  let disposed=false,form=0,opened=0;
  group.traverse(o=>{
    if(!o.isMesh)return;
    meshes.push(o);o.castShadow=o.receiveShadow=true;geometries.add(o.geometry);
    for(const material of [].concat(o.material||[])){
      if(!materials.has(material))materials.set(material,{color:material.color.clone(),metalness:material.metalness,roughness:material.roughness});
      for(const value of Object.values(material))if(value?.isTexture)textures.add(value);
    }
  });
  function update(){
    if(disposed)return;
    for(const mesh of meshes){
      const dict=mesh.morphTargetDictionary||{};
      if(dict.Bomber!==undefined)mesh.morphTargetInfluences[dict.Bomber]=dict.Offen===undefined?form:form*(1-opened);
      if(dict.Offen!==undefined)mesh.morphTargetInfluences[dict.Offen]=form*opened;
      if(/^(Interior_Floor|Bridge_Floor)/.test(mesh.name))mesh.visible=form>.98;
    }
    const color=smooth(clamp((form-.08)/.86));
    for(const[material,target]of materials){
      material.color.lerpColors(white,target.color,color);
      material.metalness=target.metalness*color;
      material.roughness=THREE.MathUtils.lerp(.88,target.roughness,color);
    }
    group.updateMatrixWorld(true);
  }
  function setForm(value){form=clamp(value);update();}
  function setOpen(value){opened=clamp(value);update();}
  function dispose(){
    if(disposed)return;disposed=true;
    group.removeFromParent();geometries.forEach(g=>g.dispose());materials.forEach((_,m)=>m.dispose());textures.forEach(t=>{t.dispose();t.source?.data?.close?.();});group.clear();
  }
  setForm(1);setOpen(0);const closedBounds=new THREE.Box3().setFromObject(group,true);
  setOpen(1);const openBounds=new THREE.Box3().setFromObject(group,true);
  setForm(0);setOpen(0);
  if(signal?.aborted){dispose();throw new DOMException('Model loading cancelled','AbortError');}
  const abort=()=>dispose();signal?.addEventListener('abort',abort,{once:true});
  const cleanup=()=>{signal?.removeEventListener('abort',abort);dispose();};
  return {group,setForm,setOpen,dispose:cleanup,closedBounds,openBounds,
    get form(){return form;},get open(){return opened;},
    aperture:{center:new THREE.Vector3(0,9.25,0),radius:8.1497},
    replaces:{groups:['exterior','roof','canopy'],meshes:['carrier-continuous-floor']},
  };
}
