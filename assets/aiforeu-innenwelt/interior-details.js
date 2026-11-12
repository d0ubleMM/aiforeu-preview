// Retained street/atelier details for the carrier; no island base or central plaza.
export function createInteriorDetails(api) {
  const { THREE, group, office, m, colors, geometry, mesh, box, cylinder, ball, text, subgroup } = api;
  const details = subgroup(group, 'Interior street and atelier details');
  const stoneDark = new THREE.MeshStandardMaterial({color:'#b6bdc9',roughness:.91});
  const terracotta = new THREE.MeshStandardMaterial({color:'#ccaa92',roughness:.91});
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
  for(const [x,z,r] of [[-10.55,-1.2,0],[-5.9,-4.15,Math.PI],[-10.5,4.1,0],[-3.88,1.65,Math.PI],[2.28,-4.55,0],[11.55,2.25,Math.PI]]) lamp(x,z,r);

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
    box(office,m.ink,x,1.42,-1.9,.07,2.84,.08);
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

}
