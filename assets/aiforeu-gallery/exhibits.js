import * as THREE from '../agentario-scene/vendor/three.module.min.js';
import { RoundedBoxGeometry } from '../agentario-scene/vendor/RoundedBoxGeometry.js';
import { createBroadcastMicrophone } from '../aiforeu-innenwelt/interior-props.js';
import { DESK_LAYOUT } from './journey.js?v=cabin-1';

export function createExhibits() {
  const root=new THREE.Group(),groups=[],owned=new Set(),textures=new Set(),pending=[];
  let disposed=false;
  const mat=(name,color,options={})=>{const m=new THREE.MeshStandardMaterial({color,roughness:.42,...options});m.name=name;owned.add(m);return m;};
  const m={white:mat('white satin desk','#ffffff',{roughness:.32}),frame:mat('white powder coat','#f5f6f7',{roughness:.48,metalness:.12}),
    metal:mat('brushed aluminium','#b0b5ba',{metalness:.85,roughness:.26}),ink:mat('black anodised aluminium','#151719',{metalness:.45,roughness:.32}),
    micBody:mat('microphone housing','#17191c',{metalness:.6,roughness:.28}),rubber:mat('black rubber','#101113',{roughness:.94}),
    leaf:mat('status lamp','#36b681',{emissive:'#36b681',emissiveIntensity:.3}),paper:mat('paper edges','#f6f6f3',{roughness:.9}),
    blue:mat('cobalt','#1645b8',{roughness:.7}),yellow:mat('yellow paper','#dfac00',{roughness:.95,toneMapped:false}),orange:mat('orange paper','#d23a0d',{roughness:.95,toneMapped:false})};
  const canvasTexture=(width,height,paint)=>{const c=document.createElement('canvas');c.width=width;c.height=height;paint(c.getContext('2d'),width,height);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=8;textures.add(t);return t;};
  const grille=canvasTexture(256,256,c=>{c.fillStyle='#6e7379';c.fillRect(0,0,256,256);c.fillStyle='#0e1012';for(let y=4;y<256;y+=8)for(let x=4;x<256;x+=8){c.beginPath();c.arc(x+(y%16?0:4),y,2.6,0,Math.PI*2);c.fill();}});
  grille.wrapS=grille.wrapT=THREE.RepeatWrapping;grille.repeat.set(2,2);
  m.micGrille=mat('perforated microphone grille','#dce0e3',{map:grille,bumpMap:grille,bumpScale:.006,metalness:.78,roughness:.49});
  const geometry={box:new THREE.BoxGeometry(1,1,1),soft:new RoundedBoxGeometry(1,1,1,2,.009),cylinder:new THREE.CylinderGeometry(.5,.5,1,32),plane:new THREE.PlaneGeometry(1,1)};
  const mesh=(parent,geo,material,position=[0,0,0],scale=[1,1,1],rotation=[0,0,0])=>{const o=new THREE.Mesh(geo,material);o.position.set(...position);o.scale.set(...scale);o.rotation.set(...rotation);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o;};
  const box=(p,mat,x,y,z,w,h,d,options={})=>mesh(p,options.soft?geometry.soft:geometry.box,mat,[x,y,z],[w,h,d],options.rotation);
  const cylinder=(p,mat,x,y,z,diameter,height,options={})=>mesh(p,geometry.cylinder,mat,[x,y,z],[diameter,height,diameter],options.rotation);
  const subgroup=(p,name,position=[0,0,0])=>{const g=new THREE.Group();g.name=name;g.position.set(...position);p.add(g);return g;};
  const desk=(g)=>{
    // Thin solid white top, white steel frame, cable tray and adjustable feet.
    box(g,m.white,0,1.38,0,4.7,.095,2.35,{soft:true});
    for(const x of [-1.92,1.92]){
      box(g,m.frame,x,1.26,0,.09,.12,1.85);
      for(const z of [-.83,.83]){box(g,m.frame,x,.68,z,.075,1.22,.075);cylinder(g,m.rubber,x,.065,z,.105,.035);}
    }
    box(g,m.frame,0,1.22,-.78,3.9,.08,.07);
    box(g,m.frame,0,1.12,-.72,3.2,.13,.23);
  };
  const make=(name,i)=>{
    const g=subgroup(root,name,[DESK_LAYOUT.first+i*DESK_LAYOUT.spacing,0,DESK_LAYOUT.z]);g.rotation.y=Math.PI;groups.push(g);desk(g);
    box(g,m.frame,0,1.17,1.12,4.5,.29,.055);
    const label=canvasTexture(1024,128,(c,w,h)=>{c.fillStyle='#f5f6f7';c.fillRect(0,0,w,h);c.fillStyle='#30363d';c.textAlign='center';c.textBaseline='middle';c.font='500 72px Arial';c.fillText(['Voice','Desktop','Workflows','VerkehrsAI'][i],w/2,h/2);});
    const labelMat=new THREE.MeshBasicMaterial({map:label,toneMapped:false});owned.add(labelMat);mesh(g,geometry.plane,labelMat,[0,1.17,1.15],[2.5,.265,1]);
    return g;
  };
  const voice=make('voice',0),mic=subgroup(voice,'broadcast studio',[.1,1.443,-.12]);
  mic.scale.setScalar(1.85);createBroadcastMicrophone({THREE,m,mesh,box,cylinder,subgroup},mic);
  // One ruled notebook and a metal pen, away from the microphone arm.
  const notebook=subgroup(voice,'notebook',[-1.18,1.454,.47]);notebook.rotation.y=-.16;
  box(notebook,m.ink,0,0,0,.73,.035,.94,{soft:true});box(notebook,m.paper,.012,.026,0,.70,.023,.90);
  for(let i=0;i<8;i++)box(notebook,m.metal,0,.039,-.31+i*.082,.52,.001,.003);
  cylinder(notebook,m.metal,.28,.062,.08,.025,.66,{rotation:[Math.PI/2,0,.08]});

  const desktop=make('desktop',1),screen=subgroup(desktop,'desktop display',[0,1.437,-.43]);
  box(screen,m.metal,0,.033,.03,.98,.065,.65,{soft:true});box(screen,m.metal,0,.41,-.02,.13,.72,.11);
  const monitor=subgroup(screen,'screen',[0,1.24,0]);monitor.rotation.x=-.07;
  box(monitor,m.ink,0,0,0,2.85,1.83,.105,{soft:true});
  const display=canvasTexture(2400,1500,(c,w,h)=>{
    c.fillStyle='#e9edf0';c.fillRect(0,0,w,h);c.fillStyle='#ffffff';c.fillRect(0,0,w,82);c.fillStyle='#171c23';c.font='500 28px Arial';c.fillText('Agentario',52,51);c.fillStyle='#6f7781';c.font='23px Arial';c.fillText('Desktop',230,51);c.textAlign='right';c.fillText('Beispiel',w-50,51);c.textAlign='left';
    c.fillStyle='#fff';c.fillRect(475,150,1450,1230);c.fillStyle='#161b21';c.font='500 76px Arial';c.fillText('Angebot',585,310);c.fillStyle='#737a82';c.font='26px Arial';c.fillText('Entwurf · 12. November 2026',588,370);
    c.fillStyle='#151a22';c.font='36px Arial';c.fillText('KI-Implementierung',588,520);c.fillStyle='#707780';c.font='27px Arial';c.fillText('Position',588,660);c.fillText('Umfang',1300,660);c.fillText('Status',1640,660);
    for(const [i,t] of ['Prozessanalyse','Integration','Einrichtung & Übergabe'].entries()){const y=750+i*125;c.fillStyle='#e6e9ec';c.fillRect(588,y-58,1220,2);c.fillStyle='#252d36';c.font='29px Arial';c.fillText(t,588,y);c.fillStyle='#828991';c.fillText(['Workshop','Ihre Systeme','Ihr Team'][i],1300,y);c.fillStyle='#2254e6';c.fillRect(1640,y-27,120,34);}
    c.fillStyle='#1b2430';c.fillRect(1270,1150,540,110);c.fillStyle='#fff';c.font='30px Arial';c.fillText('Entwurf prüfen',1330,1218);
    c.strokeStyle='#2254e6';c.lineWidth=5;c.strokeRect(564,687,1268,93);c.fillStyle='#2254e6';c.beginPath();c.moveTo(1760,816);c.lineTo(1760,865);c.lineTo(1777,849);c.lineTo(1800,848);c.closePath();c.fill();
  });
  const displayMat=new THREE.MeshBasicMaterial({map:display,toneMapped:false});owned.add(displayMat);
  mesh(monitor,geometry.plane,displayMat,[0,.005,.054],[2.72,1.70,1]);cylinder(monitor,m.rubber,0,.88,.055,.023,.008,{rotation:[Math.PI/2,0,0]});
  const keyboard=subgroup(desktop,'keyboard',[-.19,1.46,.66]);box(keyboard,m.metal,0,0,0,1.35,.055,.44,{soft:true});
  for(let row=0;row<5;row++)for(let key=0;key<14;key++)box(keyboard,m.white,-.61+key*.093,.038,-.163+row*.078,.077,.018,.059,{soft:true});
  box(keyboard,m.white,0,.039,.149,.48,.018,.059,{soft:true});
  mesh(desktop,new THREE.SphereGeometry(.5,32,16),m.white,[1.13,1.50,.64],[.32,.13,.48]);box(desktop,m.metal,1.13,1.565,.61,.016,.009,.07);

  const workflows=make('workflows',2),notes=[];
  // Paper is made from bent surfaces, not rounded cubes. The stack assembles
  // only as the visitor scrolls through this station.
  const noteGeometry=new THREE.PlaneGeometry(.80,.80,12,12);const positions=noteGeometry.attributes.position;
  for(let i=0;i<positions.count;i++){const y=positions.getY(i),x=positions.getX(i);positions.setZ(i,Math.pow(Math.max(0,y+.05),2)*.24+Math.pow(x,2)*.035);}noteGeometry.computeVertexNormals();
  const noteMats=[m.yellow,m.blue,m.orange].map(material=>{const copy=material.clone();copy.side=THREE.DoubleSide;owned.add(copy);return copy;});
  for(let i=0;i<30;i++){
    const stack=i%3,layer=Math.floor(i/3),angle=Math.sin(i*13.7)*.28;
    const paper=mesh(workflows,noteGeometry,noteMats[stack],[0,0,0],[1,1,1],[-Math.PI/2,0,angle]);
    notes.push({paper,stack,layer,angle,index:i});
  }
  box(workflows,m.metal,1.72,1.49,-.5,.27,.09,.75,{soft:true});
  for(let i=0;i<4;i++)box(workflows,m.ink,1.72,1.54,-.73+i*.15,.19,.009,.025);

  const traffic=make('traffic',3),mapBoard=subgroup(traffic,'aerial light table',[0,2.10,-.08]);
  mapBoard.rotation.x=.5;box(mapBoard,m.frame,0,.08,0,3.92,.16,2.70,{soft:true});
  for(const x of [-1.4,1.4])box(traffic,m.metal,x,1.96,-.93,.08,1.0,.08);
  const mapMat=mat('real aerial photograph','#ffffff',{roughness:.68});
  const mapPlane=mesh(mapBoard,geometry.plane,mapMat,[0,.163,0],[3.72,2.56,1],[-Math.PI/2,0,0]);mapPlane.receiveShadow=false;
  const loader=new THREE.TextureLoader();
  pending.push(loader.loadAsync(new URL('../traffic-map/junction.jpg',import.meta.url).href).then(texture=>{if(disposed){texture.dispose();return;}texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=16;textures.add(texture);mapMat.map=texture;mapMat.needsUpdate=true;}).catch(()=>{}));
  const mapLines=subgroup(mapBoard,'illustrative public road traces',[0,.181,0]);
  // Clip public OSM road segments to the same ground coordinates as the photo.
  const traceMaterial=new THREE.LineBasicMaterial({color:'#66a9ff',toneMapped:false});owned.add(traceMaterial);let roadTrace=null;
  pending.push(fetch(new URL('../traffic-map/map-data.json',import.meta.url)).then(r=>{if(!r.ok)throw new Error('Map data unavailable');return r.json();}).then(data=>{
    if(disposed)return;const points=[];
    for(const feature of data.features){
      if(feature.kind!=='road')continue;
      for(let i=1;i<feature.points.length;i++){
        const [x,y]=feature.points[i-1],[endX,endY]=feature.points[i],dx=endX-x,dy=endY-y;let low=0,high=1,accepted=true;
        for(const [p,q] of [[-dx,x+260],[dx,260-x],[-dy,y+178.75],[dy,178.75-y]]){
          if(Math.abs(p)<1e-9){if(q<0)accepted=false;continue;}
          const t=q/p;if(p<0)low=Math.max(low,t);else high=Math.min(high,t);
        }
        if(!accepted||low>high)continue;
        for(const t of [low,high])points.push(new THREE.Vector3((x+dx*t)*3.72/520,0,(y+dy*t)*2.56/357.5));
      }
    }
    roadTrace=new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(points),traceMaterial);mapLines.add(roadTrace);
  }).catch(()=>{}));
  const marker=mesh(mapLines,new THREE.TorusGeometry(.13,.008,5,48),m.white,[.04,.006,0],[1,1,1],[-Math.PI/2,0,0]);
  const pencil=subgroup(traffic,'drawing pencil',[2.10,1.46,.35]);pencil.rotation.y=-.08;cylinder(pencil,m.ink,0,.018,0,.028,.86,{rotation:[Math.PI/2,0,0]});
  // A single neutral floor continues under every exhibit; no buildings or shell.
  const floorMat=mat('studio floor','#15171b',{roughness:.74});const floor=mesh(root,new THREE.PlaneGeometry(500,500),floorMat,[33,0,0],[1,1,1],[-Math.PI/2,0,0]);floor.castShadow=false;

  function update(sample,reduced=false){
    groups.forEach(g=>{g.visible=true;});
    const t=reduced||sample.view!=='workflows' ? .65 : sample.inspection;
    for(const {paper,stack,layer,angle,index} of notes){
      const spread=1-t,side=stack-1;
      paper.position.set(side*.83+Math.sin(index*8.9)*spread*.34,1.454+layer*.009,-.1+Math.cos(index*4.3)*spread*.38);
      paper.rotation.set(-Math.PI/2,0,angle*(.3+spread));
    }
    const mapProgress=sample.view==='traffic'&&!reduced?sample.inspection:1;
    mapLines.visible=true;marker.scale.setScalar(.7+mapProgress*.3);
    if(roadTrace)roadTrace.geometry.setDrawRange(0,Math.floor(roadTrace.geometry.attributes.position.count*mapProgress/2)*2);
  }
  function dispose(){if(disposed)return;disposed=true;const geometries=new Set();root.traverse(o=>{if(o.geometry)geometries.add(o.geometry);});for(const g of geometries)g.dispose();for(const texture of textures)texture.dispose();for(const material of owned)material.dispose();root.clear();}
  return {root,floor,groups,ready:Promise.all(pending),update,dispose};
}
