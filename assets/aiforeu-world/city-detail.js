// Human-scale details connect the skyline, streets and workshop into one district.
export function createCityDetails(api) {
  const { THREE, group, office, m, colors, geometry, mesh, box, cylinder, ball, text, subgroup } = api;
  const details = subgroup(group, 'public realm — fountain, terraces and craft');
  const stoneDark = new THREE.MeshStandardMaterial({color:'#b6bdc9',roughness:.91});
  const water = new THREE.MeshStandardMaterial({color:'#8796ac',roughness:.2,metalness:.32});
  const waterLight = new THREE.MeshStandardMaterial({color:'#d0d9e4',roughness:.18,metalness:.1,transparent:true,opacity:.64,depthWrite:false});
  const brass = new THREE.MeshStandardMaterial({color:'#bc8c4f',roughness:.36,metalness:.62});
  const terracotta = new THREE.MeshStandardMaterial({color:'#ccaa92',roughness:.91});
  const torus = new THREE.TorusGeometry(1,.025,6,64);
  const arc = new THREE.TorusGeometry(1,.06,6,24,Math.PI*.72);

  // A layered model edge, like a real architectural maquette, not a floating slab.
  box(details, stoneDark,0,-.43,0,26.76,.11,18.78,{soft:true});
  box(details, m.plaster,0,-.57,0,26.3,.08,18.3,{soft:true});
  for(let i=0;i<23;i++) {
    box(details,stoneDark,-12.1+i*1.1,-.18,9.34,.015,.23,.035);
    box(details,stoneDark,-12.1+i*1.1,-.18,-9.34,.015,.23,.035);
  }
  // Long front promenade with laid-stone joints and an accessible central ramp.
  box(details,m.chalk,0,.074,6.25,23.5,.07,1.95);
  for(let i=0;i<48;i++) box(details,m.stone,-11.5+i*.49,.115,6.23,.012,.008,1.87);
  for(const z of [5.54,6.1,6.66]) box(details,m.stone,0,.115,z,23.35,.008,.012);
  for(const x of [-2.35,2.35]) {
    box(details,m.stone,x,.18,5.4,.18,.31,2.15,{soft:true});
    for(let i=0;i<8;i++) box(details,stoneDark,x,.34,4.5+i*.25,.19,.015,.02);
  }
  for(let i=0;i<3;i++) box(details,m.chalk,0,.10+i*.055,5.6-i*.27,4.25,.11,.32);

  // AIFOREU's existing mark stands in a shallow reflecting basin.
  cylinder(details,stoneDark,0,.07,2.28,4.65,.12);
  cylinder(details,m.chalk,0,.15,2.28,4.5,.14);
  cylinder(details,water,0,.23,2.28,4.19,.035);
  mesh(details,torus,m.chalk,[0,.25,2.28],[2.24,2.24,2.24],[Math.PI/2,0,0]);
  const ripples=[];
  for(const radius of [1.84,1.98,2.08]) {
    const ring=mesh(details,torus,waterLight,[0,.253,2.28],[radius,radius,radius],[Math.PI/2,0,0],true);
    ring.userData.radius=radius; ripples.push(ring);
  }
  for(const side of [-1,1]) {
    const points=[new THREE.Vector3(side*1.98,.27,2.28),new THREE.Vector3(side*1.9,.72,2.28),new THREE.Vector3(side*1.66,.35,2.28)];
    const curve=new THREE.QuadraticBezierCurve3(...points);
    mesh(details,new THREE.TubeGeometry(curve,14,.018,5,false),waterLight,[0,0,0]);
    cylinder(details,brass,side*1.98,.28,2.28,.08,.07);
  }
  // Radial paving, tree grates and seating make the plaza a place to stay.
  for(let i=0;i<28;i++) {
    const angle=i*Math.PI*2/28;
    box(details,stoneDark,Math.cos(angle)*2.42,.067,2.28+Math.sin(angle)*2.42,.1,.012,.28,{rotation:[0,-angle,0]});
  }
  const grating=new THREE.RingGeometry(.21,.43,24);
  for(const [x,z] of [[-1.7,4.35],[1.7,4.35],[-1.5,-4.7],[1.55,-4.75]]) {
    mesh(details,grating,m.ink,[x,.18,z],[1,1,1],[-Math.PI/2,0,0]);
    for(let i=0;i<6;i++) box(details,m.stone,x-.33+i*.13,.185,z,.016,.012,.74);
  }

  // Closed courtyard paving and continuous curbs give the original street actual edges.
  for(const [x,z,w,d] of [[-9.35,-2.95,2.9,3.1],[-4.96,-2.95,2.72,3.1],[-9.35,2.9,2.88,2.55],[-4.96,2.9,2.72,2.55]]) {
    for(const side of [-1,1]) {
      box(details,m.chalk,x+side*w/2,.14,z,.11,.14,d);
      box(details,m.chalk,x,.14,z+side*d/2,w,.14,.11);
    }
    for(let i=0;i<7;i++) box(details,m.stone,x-w/2+i*w/6,.08,z,.012,.01,d-.1);
  }
  // Flush manholes and storm-water grilles stay on the asphalt, not floating UI.
  for(const [x,z] of [[-7.2,-2.5],[-9.7,.25],[-4.1,.25],[-7.2,3.4]]) {
    cylinder(details,stoneDark,x,.107,z,.36,.013);
    for(let i=0;i<4;i++) box(details,m.ink,x-.1+i*.065,.118,z,.018,.009,.21);
  }
  for(const [x,z] of [[-8.15,-1.5],[-6.24,1.9],[-10.54,4.3]]) {
    box(details,m.ink,x,.108,z,.29,.018,.2);
    for(let i=0;i<4;i++) box(details,m.metal,x-.1+i*.065,.121,z,.018,.008,.18);
  }

  function lamp(x,z,rotation=0) {
    const l=subgroup(details,'street lantern',[x,0,z]);l.rotation.y=rotation;
    cylinder(l,m.ink,0,.12,0,.23,.19);
    cylinder(l,m.ink,0,1.32,0,.065,2.55);
    box(l,m.ink,.19,2.53,0,.44,.055,.055,{soft:true});
    box(l,m.ink,.39,2.48,0,.29,.08,.22,{soft:true});
    box(l,m.chalk,.39,2.43,0,.24,.015,.17);
  }
  for(const [x,z,r] of [[-10.55,-1.2,0],[-5.9,-4.15,Math.PI],[-10.5,4.1,0],[-3.88,1.65,Math.PI],[2.28,-4.55,0],[11.55,2.25,Math.PI],[-2.7,6.8,0],[2.7,6.8,Math.PI]]) lamp(x,z,r);

  // Cafe: striped canopy, espresso cups and two little seats at the kiosk's side.
  const cafe=subgroup(details,'corner cafe terrace',[-10.05,0,2.1]);
  cylinder(cafe,m.ink,0,.42,0,.06,.72);
  cylinder(cafe,m.chalk,0,.78,0,.66,.065);
  cylinder(cafe,m.wood,0,.09,0,.32,.045);
  for(const dx of [-.46,.46]) {
    cylinder(cafe,m.wood,dx,.39,0,.32,.06);
    for(const z of [-.1,.1]) box(cafe,m.ink,dx,.22,z,.025,.32,.025);
  }
  for(const dx of [-.15,.15]) {cylinder(cafe,m.chalk,dx,.85,0,.09,.1);cylinder(cafe,m.ink,dx,.903,0,.066,.006);}
  for(let i=0;i<9;i++) box(details,i%2?m.chalk:m.roof,-10.15+i*.137,1.16,3.96,.14,.045,.55,{rotation:[.12,0,0]});
  for(const x of [-10.16,-9.04]) box(details,m.wood,x,.95,4.08,.035,.42,.035);
  text(details,'KAFFEE & IDEEN',-9.6,.97,4.125,1.05,.16,{size:48});

  // Glazed atelier entrance; exposed steel, a lighting rail and pin-up panels.
  for(const x of [3.1,10.98]) {
    box(office,m.ink,x,1.57,-1.9,.07,2.45,.08);
    box(office,m.ink,x,2.81,-2.55,.08,.08,1.4);
    box(office,m.glass,x,1.57,-2.68,.025,2.3,1.18);
    for(const z of [-3.25,-2.11]) box(office,m.metal,x,1.57,z,.045,2.38,.045);
  }
  box(office,m.ink,7.1,2.86,-1.9,7.95,.065,.065);
  for(let i=0;i<5;i++) {
    cylinder(office,m.ink,4.2+i*1.4,2.75,-1.9,.14,.19);
    cylinder(office,m.chalk,4.2+i*1.4,2.65,-1.9,.105,.012);
  }
  // Flat roof panels and vents read as real building services at the back of the atelier.
  for(let x=0;x<6;x++) {
    box(office,m.ink,4+x*1.1,3.33,-3.5,.88,.035,.95,{rotation:[-.12,0,0]});
    for(let n=0;n<4;n++) box(office,m.glass,3.67+x*1.1+n*.22,3.36,-3.5,.012,.01,.9,{rotation:[-.12,0,0]});
  }
  // A planted, warm-toned pocket garden with a pergola next to the atelier.
  const garden=subgroup(details,'atelier garden',[5.0,0,3.75]);
  box(garden,m.wood,0,.12,0,2.35,.2,1.02,{soft:true});
  for(const dx of [-1.02,1.02]) for(const z of [-.36,.36]) box(garden,m.wood,dx,1.11,z,.07,1.97,.07);
  for(let i=0;i<7;i++) box(garden,m.wood,-1.1+i*.365,2.12,0,.09,.09,1.16);
  for(const dx of [-.7,.7]) {
    box(garden,terracotta,dx,.36,0,.43,.35,.48,{soft:true});
    for(let n=0;n<3;n++) ball(garden,[m.leaf,m.darkLeaf,m.paleLeaf][n],dx+(n-1)*.095,.67,0,.33,[.8,1.5,.8]);
  }

  // Physical wayfinding and rear pedestrian passages join both sides of the model.
  for(const x of [-1.93,1.93]) {
    box(details,m.wood,x,.115,-4.8,.06,.05,2.0);
    for(let n=0;n<6;n++) box(details,m.chalk,x,.142,-5.6+n*.3,.23,.015,.1);
  }
  const plaque=subgroup(details,'district model plaque',[0,-.15,9.43]);
  box(plaque,m.ink,0,0,0,3.8,.25,.025,{soft:true});
  text(plaque,'AIFOREU · ZUSAMMEN WEITER',0,0,.019,3.55,.2,{color:colors.chalk,size:53});

  return {
    update(time,{reducedMotion=false}={}) {
      const t=reducedMotion?2:time;
      ripples.forEach((ring,i)=>{
        const r=ring.userData.radius + Math.sin(t*1.25+i*2)*.013;
        ring.scale.set(r,r,r);
      });
    }
  };
}
