// Hard-surface furniture and audio hardware. Shared geometry is still eligible
// for the district's instancing pass; cables are short, low-segment tubes.
export function createBroadcastMicrophone(api, parent) {
  const {THREE,m,mesh,box,cylinder,subgroup}=api;
  const mic=subgroup(parent,'broadcast microphone and articulated arm');
  const beam=(a,b,r=.023,mat=m.micBody)=>{
    const start=new THREE.Vector3(...a),end=new THREE.Vector3(...b),v=end.clone().sub(start);
    const item=mesh(mic,new THREE.CylinderGeometry(r,r,v.length(),12),mat,start.add(end).multiplyScalar(.5).toArray());
    item.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),v.normalize());return item;
  };
  // Desk clamp, swivel bearing and parallel spring-loaded arm members.
  box(mic,m.micBody,-.42,.015,-.31,.18,.075,.19);
  box(mic,m.micBody,-.42,-.055,-.41,.18,.13,.035);
  cylinder(mic,m.metal,-.42,-.14,-.36,.035,.13);
  box(mic,m.rubber,-.42,-.205,-.36,.12,.028,.035);
  cylinder(mic,m.micBody,-.42,.1,-.31,.105,.15);
  for(const z of [-.35,-.27]){
    beam([-.42,.14,z],[-.56,.76,z],.022);
    beam([-.56,.76,z],[.19,1.01,z+.20],.022);
  }
  beam([-.42,.19,-.31],[-.55,.66,-.31],.013,m.metal);
  beam([-.49,.78,-.31],[.10,.98,-.13],.013,m.metal);
  for(const [x,y,z] of [[-.42,.15,-.31],[-.56,.76,-.31],[.19,1.01,-.11]])
    cylinder(mic,m.metal,x,y,z,.095,.11,{rotation:[Math.PI/2,0,0]});
  beam([.19,1.01,-.11],[.19,.79,-.09],.029);
  const body=subgroup(mic,'microphone capsule',[.19,.76,.015]);body.rotation.x=-.23;
  cylinder(body,m.micBody,0,0,-.07,.245,.37,{rotation:[Math.PI/2,0,0]});
  cylinder(body,m.metal,0,0,.119,.249,.018,{rotation:[Math.PI/2,0,0]});
  cylinder(body,m.micGrille,0,0,.223,.257,.195,{rotation:[Math.PI/2,0,0]});
  mesh(body,new THREE.SphereGeometry(.129,24,12,0,Math.PI*2,0,Math.PI/2),m.micGrille,[0,0,.321],[1,1,1],[Math.PI/2,0,0]);
  cylinder(body,m.micBody,0,0,-.268,.192,.035,{rotation:[Math.PI/2,0,0]});
  cylinder(body,m.metal,0,0,-.295,.068,.045,{rotation:[Math.PI/2,0,0]});
  // U-shaped yoke, knurled side screws and elastic suspension rings.
  for(const side of [-1,1]){
    box(body,m.micBody,side*.174,-.045,-.04,.035,.265,.058);
    cylinder(body,m.metal,side*.17,.04,-.04,.067,.06,{rotation:[0,0,Math.PI/2]});
    cylinder(body,m.rubber,side*.207,.04,-.04,.08,.025,{rotation:[0,0,Math.PI/2]});
  }
  box(body,m.micBody,0,-.175,-.04,.37,.035,.058);
  const ring=new THREE.TorusGeometry(.151,.009,5,28);
  for(const z of [-.1,.08])mesh(body,ring,m.rubber,[0,0,z]);
  box(body,m.metal,.125,-.028,-.075,.007,.04,.09);
  const cable=new THREE.CatmullRomCurve3([
    new THREE.Vector3(.19,.70,-.29),new THREE.Vector3(.1,.57,-.43),
    new THREE.Vector3(-.36,.47,-.43),new THREE.Vector3(-.43,.12,-.35),
    new THREE.Vector3(-.30,.022,.10),new THREE.Vector3(.41,.022,.13),new THREE.Vector3(.54,.028,-.03),
  ]);
  mesh(mic,new THREE.TubeGeometry(cable,26,.012,6,false),m.rubber,[0,0,0]);
  // Compact audio interface, gain knob, jack and status lamp.
  box(mic,m.micBody,.57,.05,-.02,.35,.09,.26,{soft:true});
  cylinder(mic,m.metal,.52,.05,.121,.059,.024,{rotation:[Math.PI/2,0,0]});
  cylinder(mic,m.rubber,.65,.05,.122,.045,.025,{rotation:[Math.PI/2,0,0]});
  box(mic,m.leaf,.59,.054,.124,.02,.018,.008);
}

export function detailFurniture(api,desktop) {
  const {THREE,office,m,geometry,mesh,box,cylinder,subgroup}=api;
  // Powder-coated underframe, cross rails and adjustment feet carry the slab.
  for(const x of [3.6,6.1,8.2,10.5]) {
    box(office,m.ink,x,.95,-.25,.065,.085,1.38);
    for(const z of [-.81,.33]) {
      cylinder(office,m.metal,x,.11,z,.075,.13);
      cylinder(office,m.rubber,x,.041,z,.14,.035);
    }
  }
  box(office,m.ink,7.05,.91,-.75,7.02,.07,.055);
  box(office,m.ink,7.05,.83,-.8,6.9,.10,.19);
  for(let n=0;n<6;n++)box(office,m.darkWood,3.29+n*1.49,1.12,.779,.008,.094,.004);
  // The visible desk edge has a shallow chamfer rather than a swollen corner.
  box(office,m.darkWood,7.05,1.195,.778,7.6,.018,.012,{rotation:[Math.PI/4,0,0]});
  const drawer=subgroup(office,'desk storage cabinet',[10.1,0,-.55]);
  box(drawer,m.ink,0,.57,0,.63,.92,.8);
  for(let n=0;n<3;n++){
    box(drawer,m.wood,0,.3+n*.27,.408,.59,.24,.025);
    box(drawer,m.metal,0,.35+n*.27,.435,.24,.018,.026);
  }
  // Independent keycaps and a trackpad make the monitor a real workstation.
  for(let row=0;row<4;row++)for(let key=0;key<11;key++)
    box(desktop,m.ink,-.345+key*.066,.07,.32+row*.054,.052,.018,.04,{soft:true});
  box(desktop,m.ink,0,.07,.539,.27,.018,.038,{soft:true});
  const mouseGeo=new THREE.SphereGeometry(.5,16,10);
  mesh(desktop,mouseGeo,m.micBody,[.62,.075,.48],[.18,.11,.27]);
  box(desktop,m.metal,.62,.126,.445,.017,.012,.045);
  box(desktop,m.ink,.62,.122,.485,.006,.015,.12);
  cylinder(desktop,m.ink,0,1.389,.014,.025,.014,{rotation:[Math.PI/2,0,0]});
  // Thin notebook, exposed page edges and a pen, placed on the meeting table.
  const book=subgroup(office,'meeting notebook',[7.15,.968,2.12]);book.rotation.y=-.23;
  box(book,m.red,0,0,0,.56,.04,.43);
  box(book,m.paper,.012,.023,0,.53,.025,.40);
  box(book,m.red,0,.042,0,.56,.012,.43);
  box(book,m.metal,.20,.052,0,.012,.013,.32,{rotation:[0,-.16,0]});
  // Mug walls, handle and coffee surface replace solid coloured cylinders.
  const mug=subgroup(office,'glazed ceramic coffee mug',[7.65,.95,2.2]);
  const profile=[new THREE.Vector2(.048,0),new THREE.Vector2(.068,.018),new THREE.Vector2(.076,.18),new THREE.Vector2(.062,.18),new THREE.Vector2(.055,.035)];
  mesh(mug,new THREE.LatheGeometry(profile,20),m.yellow,[0,0,0]);
  mesh(mug,new THREE.TorusGeometry(.053,.012,7,20),m.yellow,[.087,.10,0],[1,1,1],[0,Math.PI/2,0]);
  cylinder(mug,m.darkWood,0,.152,0,.12,.006);
  // A proper backed chair with a five-arm base at the side of the bench.
  const chair=subgroup(office,'upholstered task chair',[5.83,0,1.55]);chair.rotation.y=-.26;
  box(chair,m.fabric,0,.64,0,.62,.12,.56,{soft:true});
  box(chair,m.ink,0,.56,0,.49,.055,.45);
  cylinder(chair,m.metal,0,.34,0,.075,.45);
  for(let n=0;n<5;n++){
    const a=n*Math.PI*2/5,x=Math.sin(a)*.25,z=Math.cos(a)*.25;
    box(chair,m.ink,x/2,.12,z/2,.045,.05,.33,{rotation:[0,a,0]});
    cylinder(chair,m.rubber,x,.079,z,.11,.075,{rotation:[0,0,Math.PI/2]});
  }
  for(const side of [-1,1]){
    box(chair,m.ink,side*.23,.94,-.25,.035,.72,.04,{rotation:[-.12,0,0]});
    box(chair,m.ink,side*.32,.79,0,.035,.29,.035);
    box(chair,m.rubber,side*.32,.94,.03,.09,.045,.35,{soft:true});
  }
  box(chair,m.fabric,0,1.15,-.29,.58,.55,.085,{soft:true,rotation:[-.12,0,0]});
  // Low shelves retain real books with distinct covers and visible paper blocks.
  for(const x of [3.78,10.3])for(let n=0;n<5;n++){
    box(office,[m.red,m.yellow,m.blue,m.leaf,m.ink][n],x-.37+n*.18,1.65,-3.02,.13,.43,.035);
    box(office,m.paper,x-.37+n*.18,1.845,-3.13,.10,.015,.21);
  }
}
