import * as THREE from '../agentario-scene/vendor/three.module.min.js';

// World metres: +Z is the nose. The continuous upper skin remains closed.
export const REAR_ENTRY={z:-14.7,width:10.2,floor:.02,ceiling:6.8,rampLength:3.6,rampAngle:-1.95};
export function createRearHangar(){
  const root=new THREE.Group(),airframe=new THREE.Group(),bay=new THREE.Group();
  root.add(airframe);airframe.add(bay);
  const materials=[],geometries=[],textures=[],cut={value:0};
  const mat=(color,extra={})=>{const m=new THREE.MeshStandardMaterial({color,roughness:.62,...extra});materials.push(m);return m;};
  const shell=mat('#202a31',{metalness:.38,roughness:.48}),edge=mat('#11181d',{metalness:.45,roughness:.42});
  const inside=mat('#25272c',{metalness:0,roughness:.82}),floor=mat('#15171b',{roughness:.74});
  const rubber=mat('#07090b',{roughness:.9}),metal=mat('#6d777e',{metalness:.7,roughness:.38}),marking=mat('#727873',{roughness:.92});
  const light=mat('#dce3df',{emissive:'#e2e8e2',emissiveIntensity:3,roughness:.35});
  function mesh(parent,geometry,material,position=[0,0,0]){
    geometries.push(geometry);const object=new THREE.Mesh(geometry,material);
    object.position.set(...position);object.castShadow=material!==floor&&material!==inside;object.receiveShadow=true;parent.add(object);return object;
  }
  const box=(parent,m,pos,size)=>mesh(parent,new THREE.BoxGeometry(...size),m,pos);
  function panel(parent,m,points){
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(points.flat(),3));
    g.setIndex([0,1,2,0,2,3]);g.computeVertexNormals();m.side=THREE.DoubleSide;return mesh(parent,g,m);
  }
  function prism(parent,m,points,depth,position){
    const shape=new THREE.Shape();points.forEach(([x,y],i)=>i?shape.lineTo(x,y):shape.moveTo(x,y));shape.closePath();
    return mesh(parent,new THREE.ExtrudeGeometry(shape,{depth,bevelEnabled:true,bevelSize:.035,bevelThickness:.035,bevelSegments:2,steps:1}),m,position);
  }
  function beam(parent,m,a,b,width,depth=width){
    const start=new THREE.Vector3(...a),end=new THREE.Vector3(...b),object=box(parent,m,start.clone().add(end).multiplyScalar(.5).toArray(),[width,start.distanceTo(end),depth]);
    object.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),end.sub(start).normalize());return object;
  }
  const profile=[[-5.1,0],[5.1,0],[5.1,5.5],[3.85,6.8],[-3.85,6.8],[-5.1,5.5]];
  const spread=z=>Math.min(13.4*Math.min(1,Math.max(0,(z+14.7)/10)),13.4-Math.min(1,Math.max(0,(z-8)/9.5))*10.8);
  const section=z=>profile.map(([x,y])=>[x+Math.sign(x)*spread(z),y,z]);
  const outer=[[-5.55,-.25],[5.55,-.25],[5.55,5.7],[4.05,7.25],[-4.05,7.25],[-5.55,5.7]];
  // Chamfered portal and tapered panels follow the centre body's angular skin.
  for(let i=0;i<6;i++){
    const j=(i+1)%6,a=outer[i],b=outer[j],c=profile[j],d=profile[i];
    panel(bay,edge,[[...a,-14.84],[...b,-14.84],[...c,-14.84],[...d,-14.84]]);
    beam(bay,metal,[...d,-14.88],[...c,-14.88],.045,.06);
  }
  panel(bay,shell,[[-4.05,7.25,-14.7],[4.05,7.25,-14.7],[7,9.2,-8.9],[-7,9.2,-8.9]]);
  for(const side of [-1,1]){
    panel(bay,shell,[[side*4.05,7.25,-14.7],[side*5.55,5.7,-14.7],[side*8.3,6.1,-8.9],[side*7,9.2,-8.9]]);
    panel(bay,shell,[[side*5.55,5.7,-14.7],[side*5.55,-.25,-14.7],[side*8.3,-.8,-8.9],[side*8.3,6.1,-8.9]]);
  }
  // The original quiet grey room continues behind the rear entrance.
  const stations=[-14.7,-8,-4.7,8,17.5];
  for(let k=1;k<stations.length;k++)for(let i=0;i<6;i++){
    const j=(i+1)%6,a=section(stations[k-1]),b=section(stations[k]);
    panel(bay,i===0?floor:inside,[a[i],b[i],b[j],a[j]]);
  }
  box(bay,inside,[0,3.4,17.6],[15.4,6.8,.15]);
  // The upper flap lifts outwards. The lower leaf is a load-bearing ramp.
  const upper=new THREE.Group();upper.position.set(0,6.8,-14.7);bay.add(upper);
  prism(upper,shell,[[-5.05,-3.2],[5.05,-3.2],[5.05,-1.32],[3.82,-.04],[-3.82,-.04],[-5.05,-1.32]],.16,[0,0,-.08]);
  for(const side of [-1,1]){
    box(upper,edge,[side*2.8,-1.6,.15],[.14,2.5,.16]);box(upper,metal,[side*2.8,-1.6,-.105],[.028,2.45,.025]);box(upper,edge,[side*2.8,0,0],[.65,.16,.36]);
  }
  const ramp=new THREE.Group();ramp.position.set(0,.02,-14.7);bay.add(ramp);
  prism(ramp,shell,[[-5.05,0],[5.05,0],[5.05,3.56],[-5.05,3.56]],.18,[0,0,-.09]);
  for(let y=.16;y<3.5;y+=.17)box(ramp,metal,[0,y,.115],[9.4,.025,.03]);
  for(const side of [-1,1]){
    box(ramp,edge,[side*4.84,1.8,.15],[.23,3.6,.20]);box(ramp,light,[side*4.84,1.8,.258],[.035,3.35,.018]);box(ramp,metal,[side*4.4,.08,-.13],[.55,.18,.18]);
  }
  const rods=[];
  for(const side of [-1,1]){
    const rod=mesh(bay,new THREE.CylinderGeometry(.055,.055,1,16),metal),sleeve=mesh(bay,new THREE.CylinderGeometry(.10,.10,1,16),edge);rods.push({rod,sleeve,side});
  }
  // Landing gear, parking marks and a cast shadow establish ground contact.
  const suspension=[];
  for(const [x,z] of [[-10,-3],[10,-3],[0,16]]){
    const strut=mesh(airframe,new THREE.CylinderGeometry(.10,.13,1.2,16),metal,[x,-.39,z]);beam(airframe,metal,[x,-.75,z],[x+.5,-.05,z+.5],.10);
    const axle=new THREE.Group();airframe.add(axle);suspension.push({strut,axle});
    for(const offset of [-.27,.27]){
      const wheel=mesh(axle,new THREE.TorusGeometry(.29,.15,12,32),rubber,[x+offset,-.92,z]);wheel.rotation.y=Math.PI/2;
      const hub=mesh(axle,new THREE.CylinderGeometry(.17,.17,.23,16),metal,[x+offset,-.92,z]);hub.rotation.z=Math.PI/2;
    }
  }
  const apron=new THREE.Group();root.add(apron);
  const data=new Uint8Array(128*128*4);let seed=7721;
  for(let i=0;i<data.length;i+=4){seed=(seed*1664525+1013904223)>>>0;const value=228+(seed%8);data[i]=data[i+1]=data[i+2]=value;data[i+3]=255;}
  const grain=new THREE.DataTexture(data,128,128,THREE.RGBAFormat);grain.wrapS=grain.wrapT=THREE.RepeatWrapping;grain.repeat.set(1200,1200);grain.minFilter=THREE.LinearMipmapLinearFilter;grain.magFilter=THREE.LinearFilter;grain.generateMipmaps=true;grain.anisotropy=4;grain.needsUpdate=true;textures.push(grain);
  const apronMaterial=mat('#090d11',{roughness:.87,metalness:.08,envMapIntensity:.12,roughnessMap:grain});
  const ground=mesh(apron,new THREE.PlaneGeometry(2400,2400),apronMaterial,[0,-1.365,0]);ground.rotation.x=-Math.PI/2;ground.castShadow=false;
  for(const x of [-7.4,7.4])box(apron,marking,[x,-1.351,-27],[.065,.012,24]);box(apron,marking,[0,-1.351,-15.6],[14.9,.012,.065]);
  // Passing runway marks provide a foreground speed reference at eye level.
  for(let z=-178;z<-42;z+=14)box(apron,marking,[0,-1.35,z],[.38,.012,6]).castShadow=false;
  for(const side of [-1,1]){
    box(apron,marking,[side*21,-1.35,-110],[.14,.012,160]).castShadow=false;
    for(let z=-178;z<-40;z+=18)box(apron,marking,[side*21,-1.30,z],[.32,.10,.48]).castShadow=false;
  }
  const hazeCanvas=document.createElement('canvas');hazeCanvas.width=hazeCanvas.height=64;
  const ctx=hazeCanvas.getContext('2d'),gradient=ctx.createRadialGradient(32,32,1,32,32,32);
  gradient.addColorStop(0,'rgba(190,198,200,.8)');gradient.addColorStop(.38,'rgba(160,170,176,.28)');gradient.addColorStop(1,'rgba(160,170,176,0)');ctx.fillStyle=gradient;ctx.fillRect(0,0,64,64);
  const hazeTexture=new THREE.CanvasTexture(hazeCanvas);textures.push(hazeTexture);
  const haze=[];
  for(const side of [-1,1])for(let i=0;i<3;i++){
    const material=new THREE.SpriteMaterial({map:hazeTexture,transparent:true,opacity:0,depthWrite:false,toneMapped:false}),sprite=new THREE.Sprite(material);root.add(sprite);haze.push({sprite,material,side,i});
  }
  const cabinLight=new THREE.PointLight('#e3e8e5',24,27,2);cabinLight.position.set(0,5,-8);airframe.add(cabinLight);
  const spill=[];
  for(const side of [-1,1]){
    const spot=new THREE.SpotLight('#e1e6df',65,36,.55,.65,2);spot.position.set(side*3.4,5.8,-13.3);spot.target.position.set(side*2,-1.3,-23);airframe.add(spot,spot.target);spill.push(spot);
  }
  function attachSkin(entries){
    for(const {material} of entries){
      material.onBeforeCompile=shader=>{
        shader.uniforms.rearCut=cut;
        shader.vertexShader='varying vec3 vCarrierPoint;\n'+shader.vertexShader.replace('#include <morphtarget_vertex>','#include <morphtarget_vertex>\nvCarrierPoint=transformed*36.0;');
        shader.fragmentShader='varying vec3 vCarrierPoint; uniform float rearCut;\n'+shader.fragmentShader.replace('#include <clipping_planes_fragment>','#include <clipping_planes_fragment>\nif(rearCut>0.5 && abs(vCarrierPoint.x)<5.45 && vCarrierPoint.z< -9.3 && vCarrierPoint.y> -0.25 && vCarrierPoint.y<7.35) discard;');
      };
      material.customProgramCacheKey=()=> 'aiforeu-chamfered-rear-2';material.needsUpdate=true;
    }
  }
  function update(state){
    const active=state?.rear||0,opacity=state?.shellOpacity??0;root.visible=active>0&&opacity>0;cut.value=active>0?1:0;if(!root.visible)return;
    airframe.position.set(...state.position);airframe.rotation.set(...state.rotation);upper.rotation.x=Math.PI*.51*state.door;ramp.rotation.x=REAR_ENTRY.rampAngle*state.ramp;
    const compression=state.gearCompression||0;
    for(const {strut,axle} of suspension){axle.position.y=compression;strut.scale.y=1-compression/1.2;strut.position.y=-.39+compression*.5;}
    for(const {sprite,material,side,i} of haze){
      const age=(state.touchdown??-1)-i*.045;const visible=age>0&&age<1.1;sprite.visible=visible;
      if(visible){material.opacity=.28*(1-Math.exp(-age*22))*Math.exp(-age*3);sprite.position.set(side*(10+age*.7),-.8+age*.6,-13-age*5-i*.2);sprite.scale.set(1+age*5,.5+age*2.3,1);}
    }
    cabinLight.intensity=24*state.door*opacity;spill.forEach(s=>{s.intensity=65*state.door*opacity;});light.emissiveIntensity=3*state.door;
    for(const {rod,sleeve,side} of rods){
      const a=new THREE.Vector3(side*4.8,5.1,-12.3),b=new THREE.Vector3(side*4.7,6.8-2.7*Math.cos(upper.rotation.x),-14.7-2.7*Math.sin(upper.rotation.x));
      const direction=b.clone().sub(a),length=direction.length(),q=new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),direction.normalize());
      rod.position.copy(a).add(b).multiplyScalar(.5);rod.scale.y=length;rod.quaternion.copy(q);sleeve.position.copy(a).addScaledVector(direction,length*.22);sleeve.scale.y=length*.44;sleeve.quaternion.copy(q);
    }
    for(const m of materials){m.opacity=opacity;const transparent=opacity<1;if(m.transparent!==transparent){m.transparent=transparent;m.needsUpdate=true;}m.depthWrite=opacity>=1;}
  }
  function dispose(){root.removeFromParent();geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());haze.forEach(h=>h.material.dispose());}
  return {root,attachSkin,update,dispose};
}
