import * as THREE from '../agentario-scene/vendor/three.module.min.js';

// Furniture-only materials adapted from the interior realism study. These never
// mutate the city's shared wood/metal, photographed facades or vegetation.
export function createWorkforceMaterials(base) {
  const hash=(x,y)=>{let n=Math.imul(x+17,374761393)+Math.imul(y+29,668265263);n=Math.imul(n^(n>>>13),1274126177);return((n^(n>>>16))>>>0)/4294967295;};
  function tile(paint,width=256,height=256) {
    const pixels=[0,1,2].map(()=>new Uint8Array(width*height*4));
    for(let y=0;y<height;y++)for(let x=0;x<width;x++) {
      const [r,g,b,h=128,s=190]=paint(x,y,width,height),i=(y*width+x)*4;
      pixels[0].set([r,g,b,255],i);pixels[1].set([h,h,h,255],i);pixels[2].set([s,s,s,255],i);
    }
    const maps=pixels.map((data,i)=>{
      const t=new THREE.DataTexture(data,width,height,THREE.RGBAFormat);
      t.colorSpace=i===0?THREE.SRGBColorSpace:THREE.NoColorSpace;
      t.wrapS=t.wrapT=THREE.RepeatWrapping;t.generateMipmaps=true;
      t.minFilter=THREE.LinearMipmapLinearFilter;t.magFilter=THREE.LinearFilter;
      t.anisotropy=8;t.needsUpdate=true;return t;
    });
    return {map:maps[0],bumpMap:maps[1],roughnessMap:maps[2]};
  }
  const timber=tile((x,y,w,h)=>{
    const v=y/h,grain=Math.sin(v*190+Math.sin(x/w*6.283)*1.2+Math.sin(v*43)*2.3);
    const pores=Math.pow(Math.max(0,Math.sin(v*870+Math.sin(x/w*12.566)*.8)),14);
    const tone=grain*7-pores*18+(hash(Math.floor(y/(h/4)),6)-.5)*12+(hash(x,y)-.5)*8;
    return y%(h/4)<1.5?[55,29,13,65,205]:[133+tone,77+tone*.65,34+tone*.38,135+grain*9-pores*24,150+pores*45];
  },1024,256);
  const grille=tile((x,y)=>{const d=Math.hypot(x%8-3.5,y%8-3.5),n=hash(x,y)*8;return d<2.5?[8,10,11,25,235]:[65+n,71+n,74+n,174,135];});
  const fabric=tile((x,y)=>{const n=(hash(x,y)-.5)*5,weave=(x%4<2)!==(y%4<2)?8:-4;return[28+n,42+weave+n,49+weave+n,120+weave*3,245];});
  const material=(name,color,extra={})=>{const mat=new THREE.MeshStandardMaterial({color,roughness:.78,...extra});mat.name=`workforce ${name}`;return mat;};
  const m={...base,
    wood:material('timber','#ffffff',{...timber,roughness:.74,bumpScale:.008}),
    darkWood:material('timber edge','#5a2e15',{bumpMap:timber.bumpMap,roughness:.78,bumpScale:.005}),
    metal:material('brushed metal','#899298',{metalness:.88,roughness:.29}),
    micBody:material('audio hardware','#101519',{metalness:.42,roughness:.38}),
    micGrille:material('microphone grille','#ffffff',{...grille,metalness:.75,roughness:.63,bumpScale:.009}),
    rubber:material('rubber','#0c1011',{roughness:.98}),
    fabric:material('upholstery','#ffffff',{...fabric,roughness:.96,bumpScale:.006}),
    red:material('book cover','#80352e'),yellow:material('glazed ceramic','#b89b63',{roughness:.26}),
    paper:material('paper','#e7e4dc'),
  };
  let stopped=false;
  async function load() {
    if(typeof globalThis.document?.createElementNS!=='function')return;
    const loader=new THREE.TextureLoader();
    const results=await Promise.allSettled(['color','normal','arm'].map(kind=>loader.loadAsync(new URL(`./materials/wood_table_001-${kind}.jpg`,import.meta.url).href)));
    const textures=results.filter(r=>r.status==='fulfilled').map(r=>r.value);
    if(stopped||results.some(r=>r.status==='rejected')){textures.forEach(t=>t.dispose());return;}
    const [map,normalMap,arm]=textures;
    for(const t of textures){t.wrapS=t.wrapT=THREE.RepeatWrapping;t.anisotropy=8;t.needsUpdate=true;}
    map.colorSpace=THREE.SRGBColorSpace;
    const replaced=new Set();
    for(const [key,tint] of [['wood','#ffffff'],['darkWood','#9b8270']]) {
      const mat=m[key];for(const value of Object.values(mat))if(value?.isTexture)replaced.add(value);
      Object.assign(mat,{map,normalMap,roughnessMap:arm,aoMap:arm,aoMapIntensity:.65,bumpMap:null});
      mat.normalScale.setScalar(.2);mat.color.set(tint).multiplyScalar(1.7);mat.needsUpdate=true;
    }
    const retained=new Set(Object.values(m).flatMap(mat=>Object.values(mat).filter(value=>value?.isTexture)));
    for(const texture of replaced)if(!retained.has(texture))texture.dispose();
  }
  return {m,ready:load(),stop:()=>{stopped=true;}};
}
