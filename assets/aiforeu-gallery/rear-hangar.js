import * as THREE from '../agentario-scene/vendor/three.module.min.js';

// World metres: +Z is the nose. The rear opening is at Z=-14.7.
// The roof stays sealed. A local cut volume removes only the obstructing aft
// skin, retaining the exact uncut logo throughout both transformations.
export const REAR_ENTRY={z:-14.7,width:11.4,floor:.02,ceiling:7.6,rampLength:3.6,rampAngle:-1.95};
export function createRearHangar(){
  const root=new THREE.Group(),airframe=new THREE.Group(),bay=new THREE.Group();root.add(airframe);airframe.add(bay);
  const materials=[],geometries=[],cut={value:0};
  const mat=(color,extra={})=>{const m=new THREE.MeshStandardMaterial({color,roughness:.65,...extra});materials.push(m);return m;};
  const shell=mat('#263039',{metalness:.15}),edge=mat('#11171d',{metalness:.25}),inside=mat('#252a30'),floor=mat('#15171b',{roughness:.74}),rubber=mat('#080a0c'),metal=mat('#89939b',{metalness:.75,roughness:.28}),line=mat('#a8a89a'),light=mat('#dce9f1',{emissive:'#dce9f1',emissiveIntensity:2.2});
  function box(parent,m,pos,size){const g=new THREE.BoxGeometry(...size);geometries.push(g);const mesh=new THREE.Mesh(g,m);mesh.position.set(...pos);parent.add(mesh);return mesh;}
  function panel(parent,m,points){const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(points.flat(),3));g.setIndex([0,1,2,0,2,3]);g.computeVertexNormals();geometries.push(g);const mesh=new THREE.Mesh(g,m);mesh.material.side=THREE.DoubleSide;parent.add(mesh);return mesh;}
  // A tapered rear fairing joins the raised wing to a full-height cargo portal.
  panel(bay,shell,[[-6.1,7.9,-14.9],[6.1,7.9,-14.9],[7,9.2,-9.1],[-7,9.2,-9.1]]);
  for(const side of [-1,1]){
    panel(bay,shell,[[side*6.1,-.2,-14.9],[side*6.1,7.9,-14.9],[side*7,9.2,-9.1],[side*7,-.8,-9.1]]);
    box(bay,edge,[side*5.95,3.8,-14.7],[.5,7.8,.45]);
    box(bay,inside,[side*5.75,3.75,1.65],[.22,7.5,32.7]);
    for(const z of [-13,-9,-5]){
      box(bay,edge,[side*5.55,3.6,z],[.2,7.2,.22]);
      box(bay,light,[side*5.39,5.8,z],[.04,.07,2]);
    }
  }
  box(bay,edge,[0,7.67,-14.7],[12.4,.42,.5]);
  box(bay,floor,[0,-.10,1.65],[11.5,.2,32.7]);
  box(bay,inside,[0,7.6,1.65],[11.5,.2,32.7]);
  for(const z of [-12,-8,-4,0,5,10])box(bay,light,[0,7.43,z],[8.7,.07,.13]);
  // Two real hinge transforms, not a dissolving door texture.
  const upper=new THREE.Group();upper.position.set(0,7.6,-14.7);bay.add(upper);
  box(upper,shell,[0,-2,0],[11.4,4,.22]);
  for(const x of [-4.5,-1.5,1.5,4.5])box(upper,edge,[x,-2,.14],[.07,3.6,.06]);
  const ramp=new THREE.Group();ramp.position.set(0,.02,-14.7);bay.add(ramp);
  box(ramp,shell,[0,1.8,0],[11.4,3.6,.24]);
  for(let y=.25;y<3.5;y+=.28)box(ramp,metal,[0,y,.145],[10.7,.035,.03]);
  for(const x of [-5.4,5.4])box(ramp,line,[x,1.8,.15],[.08,3.5,.03]);
  const rods=[];
  for(const side of [-1,1]){
    const g=new THREE.CylinderGeometry(.065,.065,1,12);geometries.push(g);const rod=new THREE.Mesh(g,metal);bay.add(rod);rods.push({rod,side});
  }
  // Landing gear and the stationary apron make the braking motion readable.
  const gear=new THREE.Group();airframe.add(gear);
  for(const [x,z] of [[-10,-3],[10,-3],[0,16]]){
    box(gear,metal,[x,-.39,z],[.17,1.2,.17]);
    for(const offset of [-.25,.25]){const g=new THREE.CylinderGeometry(.44,.44,.3,24);geometries.push(g);const wheel=new THREE.Mesh(g,rubber);wheel.rotation.z=Math.PI/2;wheel.position.set(x+offset,-.92,z);gear.add(wheel);}
  }
  const apron=new THREE.Group();root.add(apron);
  box(apron,mat('#0e1115',{roughness:.9}),[0,-1.42,-3],[2400,.12,2400]);
  for(const x of [-7.4,7.4])box(apron,line,[x,-1.351,-27],[.10,.015,24]);
  box(apron,line,[0,-1.351,-15.6],[14.9,.015,.1]);
  const cabinLight=new THREE.PointLight('#dce9f1',25,28,2);cabinLight.position.set(0,5.7,-9);airframe.add(cabinLight);
  function attachSkin(entries){
    for(const {material} of entries){
      material.onBeforeCompile=shader=>{
        shader.uniforms.rearCut=cut;
        shader.vertexShader='varying vec3 vCarrierPoint;\n'+shader.vertexShader.replace('#include <morphtarget_vertex>','#include <morphtarget_vertex>\nvCarrierPoint=transformed*36.0;');
        shader.fragmentShader='varying vec3 vCarrierPoint; uniform float rearCut;\n'+shader.fragmentShader.replace('#include <clipping_planes_fragment>','#include <clipping_planes_fragment>\nif(rearCut>0.5 && abs(vCarrierPoint.x)<5.8 && vCarrierPoint.z< -9.3 && vCarrierPoint.y> -0.25 && vCarrierPoint.y<7.9) discard;');
      };
      material.customProgramCacheKey=()=> 'aiforeu-rear-aperture-1';material.needsUpdate=true;
    }
  }
  function update(state){
    const active=state?.rear||0,opacity=state?.shellOpacity??0;root.visible=active>0&&opacity>0;cut.value=active>0?1:0;
    if(!root.visible)return;
    airframe.position.set(...state.position);airframe.rotation.set(...state.rotation);
    upper.rotation.x=-Math.PI/2*state.door;
    ramp.rotation.x=REAR_ENTRY.rampAngle*state.ramp;
    cabinLight.intensity=25*state.door*opacity;
    for(const {rod,side} of rods){const a=new THREE.Vector3(side*5.4,6.9,-11.5),b=new THREE.Vector3(side*5.4,-3.4*Math.cos(upper.rotation.x)+7.6,-3.4*Math.sin(upper.rotation.x)-14.7);rod.position.copy(a).add(b).multiplyScalar(.5);rod.scale.y=a.distanceTo(b);rod.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),b.sub(a).normalize());}
    for(const m of materials){m.opacity=opacity;const transparent=opacity<1;if(m.transparent!==transparent){m.transparent=transparent;m.needsUpdate=true;}m.depthWrite=opacity>=1;}
  }
  function dispose(){root.removeFromParent();geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());}
  return {root,attachSkin,update,dispose};
}
