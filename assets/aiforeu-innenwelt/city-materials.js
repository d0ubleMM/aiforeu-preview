import * as THREE from '../agentario-scene/vendor/three.module.min.js';

// Photographed CC0 surfaces, served locally. See materials/sources.json.
// Projection is in world metres so instanced small details and long road strips
// share a consistent grain instead of stretching a texture across each box.
export function createCityMaterials() {
  const pending = [], textures = [], surfaces = new Map(), users = new Map();
  let stopped=false;
  const canLoad = typeof globalThis.document?.createElementNS === 'function';
  const loader = canLoad ? new THREE.TextureLoader() : null;
  const baseColors={asphalt:[57,61,63],bark:[89,77,59],brick:[114,61,44],concrete:[169,166,158],plaster:[211,207,198],tiles:[139,72,43]};
  function configure(texture,kind) {
    texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.anisotropy=8;
    texture.colorSpace=kind==='color'?THREE.SRGBColorSpace:THREE.NoColorSpace;
    return texture;
  }
  function maps(name) {
    if(surfaces.has(name))return surfaces.get(name);
    const result={}, owners=new Set();surfaces.set(name,result);users.set(name,owners);
    for(const [kind,key] of [['color','map'],['normal','normalMap'],['rough','roughnessMap']]) {
      // Preserve a recognisable road/building if a photo is late or unavailable.
      const rgb=kind==='color'?baseColors[name]:kind==='normal'?[128,128,255]:[255,255,255];
      const placeholder=configure(new THREE.DataTexture(new Uint8Array([...rgb,255]),1,1),kind);
      placeholder.name=`${name} fallback ${kind}`;placeholder.needsUpdate=true;
      result[key]=placeholder;textures.push(placeholder);
      if(loader)pending.push(new Promise(resolve=>{
        let requested;
        requested=loader.load(new URL(`./materials/${name}-${kind}.webp`,import.meta.url).href,loaded=>{
          if(stopped){loaded.dispose();resolve();return;}
          configure(loaded,kind);loaded.name=`${name} photographed ${kind}`;loaded.needsUpdate=true;
          result[key]=loaded;textures.push(loaded);
          for(const material of owners){material[key]=loaded;material.needsUpdate=true;}
          placeholder.dispose();resolve();
        },undefined,()=>{requested?.dispose();resolve();});
      }));
    }
    return result;
  }
  function surface(material,name,{metres=1,normal=.4,tint='#ffffff',roughness=1,colorWeight=1}={}) {
    Object.assign(material,maps(name));users.get(name).add(material);material.color.set(tint);
    material.normalScale=new THREE.Vector2(normal,normal);
    material.bumpMap=null;material.roughness=roughness;material.metalness=0;
    material.userData.citySurface=name;
    material.onBeforeCompile=shader=>{
      shader.uniforms.cityMetres={value:metres};
      shader.uniforms.cityColorWeight={value:colorWeight};
      shader.vertexShader='varying vec3 vCityWorld;\n'+shader.vertexShader;
      shader.vertexShader=shader.vertexShader.replace('#include <worldpos_vertex>',`#include <worldpos_vertex>
        vec4 cityWorld=vec4(transformed,1.0);
        #ifdef USE_INSTANCING
          cityWorld=instanceMatrix*cityWorld;
        #endif
        vCityWorld=(modelMatrix*cityWorld).xyz;`);
      shader.fragmentShader=`varying vec3 vCityWorld;
        uniform float cityMetres;
        uniform float cityColorWeight;
        vec2 cityUV(){
          vec3 n=abs(normalize(cross(dFdx(vCityWorld),dFdy(vCityWorld))));
          if(n.y>=n.x && n.y>=n.z)return vCityWorld.xz/cityMetres;
          if(n.x>n.z)return vec2(vCityWorld.z,vCityWorld.y)/cityMetres;
          return vCityWorld.xy/cityMetres;
        }\n`+shader.fragmentShader;
      shader.fragmentShader=shader.fragmentShader
        .replace('#include <map_fragment>','diffuseColor *= mix(vec4(1.0),texture2D(map, cityUV()),cityColorWeight);')
        .replace('#include <roughnessmap_fragment>','float roughnessFactor=roughness*texture2D(roughnessMap,cityUV()).g;')
        .replace('#include <normal_fragment_maps>',`vec3 cityN=texture2D(normalMap,cityUV()).xyz*2.0-1.0;
          cityN.xy*=normalScale;
          normal=normalize(getTangentFrame(-vViewPosition,normal,cityUV())*cityN);`);
    };
    material.customProgramCacheKey=()=>`city-project-v1-${metres}`;
    material.needsUpdate=true;return material;
  }
  return {surface,ready:()=>Promise.all(pending),textures,stop:()=>{stopped=true;}};
}
