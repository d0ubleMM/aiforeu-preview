import * as THREE from '../agentario-scene/vendor/three.module.min.js';

// Two fine wingtip vortices make the bank read as forward flight. The mesh is
// fixed; only its visibility and attitude follow scroll. No particles or clock.
export function createFlightWake(aircraft){
  const group=new THREE.Group(),point=new THREE.Vector3(),tips=[new THREE.Vector3(Infinity,0,0),new THREE.Vector3(-Infinity,0,0)];
  aircraft.group.updateMatrixWorld(true);
  aircraft.group.traverse(mesh=>{
    if(!mesh.isMesh||!mesh.name.startsWith('Rumpf'))return;
    for(let i=0;i<mesh.geometry.attributes.position.count;i++){
      mesh.getVertexPosition(i,point).applyMatrix4(mesh.matrixWorld);
      if(point.x<tips[0].x)tips[0].copy(point);
      if(point.x>tips[1].x)tips[1].copy(point);
    }
  });
  const material=new THREE.MeshBasicMaterial({color:'#e3e8ed',vertexColors:true,transparent:true,opacity:0,depthWrite:false,side:THREE.DoubleSide,toneMapped:false});
  for(const [side,tip] of tips.entries()){
    const positions=[],colors=[],indices=[];
    for(let i=0;i<=48;i++){
      const t=i/48,x=tip.x+(side?1:-1)*6*t*t,y=tip.y+.1+t*t*2,z=tip.z-56*t;
      const width=.035+Math.sin(Math.PI*t)*.12,alpha=(1-t)**2;
      for(const edge of [-1,1]){positions.push(x+edge*width,y,z);colors.push(1,1,1,alpha);}
      if(i<48){const k=i*2;indices.push(k,k+1,k+2,k+1,k+3,k+2);}
    }
    const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,4));geometry.setIndex(indices);group.add(new THREE.Mesh(geometry,material));
  }
  return {group,update(rotation,amount){group.rotation.set(...rotation);group.visible=amount>.001;material.opacity=.24*amount;},dispose(){group.removeFromParent();group.children.forEach(mesh=>mesh.geometry.dispose());material.dispose();}};
}
