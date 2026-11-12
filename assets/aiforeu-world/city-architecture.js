// Authored rear street. Call before createWorld's static-mesh batching pass.
// All dimensions are world units; the host supplies the extended island below it.
export function createArchitecture(api) {
  const { THREE, group, m, geometry, mesh, box, cylinder, subgroup } = api;
  const street = subgroup(group, 'Rear city street — five architectural addresses');
  const paint = (key, color, extra = {}) => {
    m[key] = new THREE.MeshStandardMaterial({ color, roughness: .86, metalness: 0,
      bumpMap: m.plaster.bumpMap, bumpScale: .006, ...extra });
    return m[key];
  };
  const brick = paint('cityBrick', '#b77962');
  const brickDark = paint('cityBrickDark', '#895747');
  const mortar = paint('cityMortar', '#caa392');
  const ivory = paint('cityIvory', '#e9edf1');
  const limestone = paint('cityLimestone', '#bfc7d1');
  const paleStone = paint('cityPaleStone', '#d7dfe7');
  const charcoal = paint('cityCharcoal', '#3b414a');
  const zinc = paint('cityZinc', '#727b88', { roughness: .4, metalness: .58, bumpScale: .002 });
  const glazing = paint('cityGlazing', '#71879f', { roughness: .21, metalness: .2, bumpScale: 0 });
  const shadowGlass = paint('cityShadowGlass', '#354657', { roughness: .25, metalness: .18, bumpScale: 0 });
  const copper = paint('cityCopper', '#b87850', { roughness: .46, metalness: .32 });
  const timber = paint('cityTimber', '#b99570');
  const amber = paint('cityWarmWindow', '#e4bd82', { roughness: .65 });
  const terracotta = paint('cityTerracotta', '#a65e48');
  const B = (parent, name, mat, x, y, z, w, h, d, options) => {
    const item = box(parent, mat, x, y, z, w, h, d, options); item.name = name; return item;
  };
  const C = (parent, name, mat, x, y, z, diameter, height, options) => {
    const item = cylinder(parent, mat, x, y, z, diameter, height, options); item.name = name; return item;
  };
  const M = (parent, name, geo, mat, position, scale, rotation) => {
    const item = mesh(parent, geo, mat, position, scale, rotation); item.name = name; return item;
  };
  const G = (name, x, z) => subgroup(street, name, [x, 0, z]);

  // Unit gable and segmental-arch profiles are shared by every relevant detail.
  const roofShape = new THREE.Shape(); roofShape.moveTo(-.5, 0); roofShape.lineTo(.5, 0); roofShape.lineTo(0, 1); roofShape.closePath();
  const gable = new THREE.ExtrudeGeometry(roofShape, { depth: 1, bevelEnabled: false }); gable.translate(0, 0, -.5);
  geometry.cityGable = gable;
  const archOutline = new THREE.Shape(); archOutline.moveTo(-.5, 0); archOutline.lineTo(.5, 0); archOutline.lineTo(.5, .77); archOutline.absarc(0, .77, .5, 0, Math.PI, false); archOutline.lineTo(-.5, 0);
  geometry.cityArchInset = new THREE.ExtrudeGeometry(archOutline, { depth: .06, bevelEnabled: false, curveSegments: 16 });
  const archFrame = archOutline.clone();
  const aperture = new THREE.Path(); aperture.moveTo(-.39, .08); aperture.lineTo(-.39, .77); aperture.absarc(0, .77, .39, Math.PI, 0, true); aperture.lineTo(.39, .08); aperture.closePath(); archFrame.holes.push(aperture);
  geometry.cityArchFrame = new THREE.ExtrudeGeometry(archFrame, { depth: .10, bevelEnabled: false, curveSegments: 16 });
  geometry.cityClockBezel = new THREE.TorusGeometry(.5, .035, 8, 32);
  const sawShape = new THREE.Shape(); sawShape.moveTo(-.5, 0); sawShape.lineTo(.5, 0); sawShape.lineTo(.5, .45); sawShape.lineTo(-.5, .08); sawShape.closePath();
  geometry.citySawRoof = new THREE.ExtrudeGeometry(sawShape, { depth: 1, bevelEnabled: false }); geometry.citySawRoof.translate(0, 0, -.5);

  function arch(parent, name, x, y, z, width, height, inset = shadowGlass, frame = limestone) {
    const a = subgroup(parent, name, [x, y, z]);
    M(a, `${name} recessed arch`, geometry.cityArchInset, inset, [0, 0, -.025], [width, height / 1.27, 1]);
    M(a, `${name} voussoir surround`, geometry.cityArchFrame, frame, [0, 0, .008], [width, height / 1.27, 1]);
    B(a, `${name} central mullion`, frame, 0, height * .42, .075, .035, height * .7, .035);
    B(a, `${name} transom`, frame, 0, height * .55, .075, width * .79, .04, .035);
    return a;
  }
  function window(parent, name, x, y, z, w = .5, h = .68, options = {}) {
    const { surround = ivory, glass = glazing, cross = true, balcony = false } = options;
    B(parent, `${name} surround`, surround, x, y, z, w + .13, h + .14, .09);
    B(parent, `${name} recessed glass`, glass, x, y, z + .052, w, h, .025);
    B(parent, `${name} center frame`, ivory, x, y, z + .072, .027, h, .025);
    if (cross) B(parent, `${name} transom`, ivory, x, y + h * .08, z + .074, w, .026, .025);
    B(parent, `${name} projecting sill`, limestone, x, y - h / 2 - .075, z + .08, w + .2, .065, .20);
    if (balcony) {
      B(parent, `${name} balcony slab`, paleStone, x, y - h / 2 - .12, z + .22, w + .33, .08, .39);
      B(parent, `${name} balcony handrail`, charcoal, x, y - .02, z + .4, w + .31, .035, .035);
      for (let n = 0; n < 5; n++) B(parent, `${name} balcony baluster ${n + 1}`, charcoal, x - (w + .25) / 2 + n * (w + .25) / 4, y - .16, z + .4, .025, .29, .025);
    }
  }
  function frontCornice(parent, name, width, y, front, mat = limestone) {
    B(parent, `${name} lower molding`, mat, 0, y, front, width + .08, .065, .14);
    B(parent, `${name} projecting crown`, mat, 0, y + .075, front + .015, width + .19, .08, .22);
  }
  function parapet(parent, name, width, depth, y, mat = ivory) {
    for (const z of [-depth / 2, depth / 2]) B(parent, `${name} long coping ${z < 0 ? 'rear' : 'front'}`, mat, 0, y, z, width + .04, .12, .11);
    for (const x of [-width / 2, width / 2]) B(parent, `${name} side coping ${x < 0 ? 'west' : 'east'}`, mat, x, y, 0, .11, .12, depth);
  }
  function roofPlant(parent, name, x, y, z, w = .56) {
    B(parent, `${name} curb`, charcoal, x, y, z, w + .1, .08, .45);
    B(parent, `${name} casing`, zinc, x, y + .17, z, w, .28, .36);
    for (let n = 0; n < 4; n++) B(parent, `${name} grille ${n + 1}`, charcoal, x - w * .32 + n * w * .21, y + .315, z, .025, .012, .26);
  }

  // The pavement is a narrow continuous address edge; buildings are not separate diorama plinths.
  B(street, 'Continuous rear-street footway', paleStone, 0, .055, -5.95, 22.75, .11, .48);
  B(street, 'Front kerb of rear-street footway', limestone, 0, .065, -5.725, 22.75, .13, .045);
  for (let i = 0; i < 32; i++) B(street, `Rear footway paving joint ${i + 1}`, limestone, -11.02 + i * .71, .114, -5.96, .012, .008, .41);

  // 1 — Stepped brick shop-house with an attached narrow plaster address.
  const town = G('West mixed-use terrace — stepped brick shop and narrow townhouse', -9.78, -7.1);
  B(town, 'Shop-house limestone plinth', limestone, -.45, .16, 0, 2.17, .25, 1.9);
  B(town, 'Shop-house brick masonry', brick, -.45, 1.55, 0, 2.07, 2.6, 1.76);
  M(town, 'Shop-house pitched tile roof', gable, terracotta, [-.45, 2.85, 0], [2.14, .86, 1.83]);
  // Wide steps at the street-facing gable form a legible skyline from the overview.
  for (let i = 0; i < 5; i++) B(town, `Brick stepped gable tier ${i + 1}`, brick, -.45, 2.92 + i * .20, .88, 2.13 - i * .39, .23, .17);
  for (let i = 0; i < 5; i++) B(town, `Stepped gable stone coping ${i + 1}`, limestone, -.45, 3.045 + i * .20, .88, 2.18 - i * .39, .045, .21);
  for (let row = 0; row < 12; row++) {
    const y = .56 + row * .19;
    B(town, `Brick horizontal course ${row + 1}`, mortar, -.45, y, .885, 2.05, .012, .012);
    for (let col = 0; col < 5; col++) {
      const x = -1.32 + col * .4 + (row % 2) * .2;
      if (x < .57) B(town, `Brick bond ${row + 1}-${col + 1}`, mortar, x, y + .09, .889, .012, .17, .014);
    }
  }
  arch(town, 'Shop glazed arcade west', -.99, .27, .91, .76, 1.12, shadowGlass, limestone);
  arch(town, 'Shop glazed arcade east', .03, .27, .91, .76, 1.12, amber, limestone);
  B(town, 'Shop entrance threshold', paleStone, -.99, .18, 1.1, .77, .13, .3);
  B(town, 'Shop timber fascia', timber, -.45, 1.48, .95, 1.91, .14, .12);
  B(town, 'Shop canvas awning', terracotta, -.45, 1.48, 1.16, 1.95, .045, .34, { rotation: [-.12, 0, 0] });
  B(town, 'Shop awning leading valance', ivory, -.45, 1.43, 1.32, 1.95, .10, .035);
  for (const [i, x] of [-1.0, .1].entries()) window(town, `Brick apartment window ${i + 1}`, x, 2.15, .92, .48, .70, { balcony: i === 1 });
  window(town, 'Stepped attic window', -.45, 3.04, .99, .37, .43, { surround: limestone, cross: false });
  B(town, 'Brick chimney stack', brickDark, -.96, 3.63, -.43, .29, .64, .32);
  B(town, 'Brick chimney cap', limestone, -.96, 3.98, -.43, .37, .08, .39);
  C(town, 'Shop-house rainwater pipe', zinc, .62, 1.45, .98, .055, 2.7);
  const narrow = subgroup(town, 'Attached narrow plaster townhouse', [1.08, 0, -.03]);
  B(narrow, 'Narrow townhouse limestone plinth', limestone, 0, .16, 0, .91, .25, 1.88);
  B(narrow, 'Narrow townhouse body', ivory, 0, 1.73, 0, .88, 3.07, 1.76);
  M(narrow, 'Narrow townhouse zinc roof', gable, zinc, [0, 3.25, 0], [1.01, .62, 1.85]);
  for (let floor = 0; floor < 3; floor++) window(narrow, `Narrow townhouse window ${floor + 1}`, 0, .79 + floor * .91, .91, .4, .63, { surround: paleStone, glass: floor === 1 ? amber : shadowGlass });
  frontCornice(narrow, 'Narrow townhouse cornice', .88, 3.19, .92);
  B(narrow, 'Narrow townhouse entrance canopy', charcoal, 0, 1.19, 1.06, .67, .055, .3);

  // 2 — Municipal clock tower and an arcaded, low civic wing.
  const civic = G('Municipal clock tower and public arcade', -6.82, -7.09);
  B(civic, 'Clock tower broad stone base', limestone, 0, .21, 0, 1.46, .38, 1.88);
  B(civic, 'Clock tower main masonry shaft', ivory, 0, 2.1, -.03, 1.22, 3.8, 1.67);
  for (const x of [-.58, .58]) B(civic, `Clock tower corner pier ${x < 0 ? 'west' : 'east'}`, paleStone, x, 2.03, .83, .15, 3.68, .11);
  for (const y of [1.3, 2.6, 3.38]) B(civic, `Clock tower string course at ${y}`, limestone, 0, y, .87, 1.36, .10, .16);
  arch(civic, 'Civic tower entrance', 0, .27, .865, .76, 1.10, timber, limestone);
  for (const [i, x] of [-.28, .28].entries()) arch(civic, `Tower paired upper opening ${i + 1}`, x, 2.74, .87, .33, .52, charcoal, limestone);
  for (let i = 0; i < 4; i++) B(civic, `Tower entrance step ${i + 1}`, paleStone, 0, .07 + i * .045, 1.24 - i * .065, 1.07 - i * .07, .09, .16);
  C(civic, 'Clock face dial', ivory, 0, 3.89, .855, .88, .04, { rotation: [Math.PI / 2, 0, 0] });
  M(civic, 'Clock copper bezel', geometry.cityClockBezel, copper, [0, 3.89, .889], [.91, .91, .91]);
  for (let hour = 0; hour < 12; hour++) {
    const a = hour * Math.PI / 6;
    B(civic, `Clock hour index ${hour + 1}`, charcoal, Math.sin(a) * .34, 3.89 + Math.cos(a) * .34, .918, .026, hour % 3 === 0 ? .09 : .055, .022, { rotation: [0, 0, -a] });
  }
  B(civic, 'Clock minute hand', charcoal, .105, 3.98, .94, .032, .28, .022, { rotation: [0, 0, -.86] });
  B(civic, 'Clock hour hand', charcoal, -.068, 3.947, .95, .042, .21, .025, { rotation: [0, 0, .85] });
  C(civic, 'Clock central boss', copper, 0, 3.89, .975, .09, .03, { rotation: [Math.PI / 2, 0, 0] });
  B(civic, 'Tower upper cornice', limestone, 0, 4.35, -.03, 1.43, .15, 1.86);
  M(civic, 'Clock tower pitched zinc cap', gable, zinc, [0, 4.43, -.03], [1.4, .43, 1.85]);
  B(civic, 'Tower roof ridge', charcoal, 0, 4.88, -.03, .075, .08, 1.88);
  const wing = subgroup(civic, 'Municipal public service wing', [1.51, 0, -.02]);
  B(wing, 'Civic wing plinth', limestone, 0, .17, 0, 1.72, .28, 1.86);
  B(wing, 'Civic wing facade', paleStone, 0, 1.45, 0, 1.66, 2.47, 1.77);
  for (const [i, x] of [-.44, .44].entries()) {
    arch(wing, `Public arcade bay ${i + 1}`, x, .28, .9, .70, 1.08, shadowGlass, ivory);
    window(wing, `Municipal upper window ${i + 1}`, x, 2.05, .91, .45, .65, { surround: ivory });
  }
  frontCornice(wing, 'Civic wing entablature', 1.66, 2.69, .91, ivory);
  M(wing, 'Civic wing shallow pitched roof', gable, zinc, [0, 2.77, 0], [1.81, .37, 1.89]);

  // 3 — Glazed design studio with timber piers, a setback upper gallery and sawtooth light.
  const studio = G('Contemporary glazed studio with northlight roof', -2.24, -7.06);
  B(studio, 'Studio low concrete podium', limestone, 0, .18, 0, 4.04, .27, 1.93);
  B(studio, 'Studio dark interior volume', shadowGlass, 0, 1.57, -.05, 3.87, 2.57, 1.69);
  B(studio, 'Studio ground-floor glazing', glazing, 0, 1.03, .82, 3.86, 1.45, .035);
  B(studio, 'Studio upper-floor glazing', glazing, 0, 2.33, .80, 3.86, .91, .035);
  for (let i = 0; i < 7; i++) B(studio, `Studio facade timber pier ${i + 1}`, timber, -1.89 + i * .63, 1.58, .87, .085, 2.61, .13);
  for (const y of [.31, 1.79, 2.87]) B(studio, `Studio slab edge ${y}`, ivory, 0, y, .87, 4.0, .12, .19);
  for (let i = 0; i < 6; i++) B(studio, `Studio upper transom ${i + 1}`, charcoal, -1.58 + i * .63, 2.33, .852, .035, .91, .03);
  B(studio, 'Studio recessed double entrance', charcoal, -.63, .88, .875, .68, 1.15, .045);
  B(studio, 'Studio entrance glazed leaf', shadowGlass, -.63, .89, .905, .58, 1.04, .02);
  B(studio, 'Studio door handle', copper, -.39, .88, .938, .025, .24, .035);
  B(studio, 'Studio floating entrance canopy', zinc, -.63, 1.55, 1.04, 1.15, .07, .37);
  // Deep roof members and upright light strips make the industrial roof profile visible.
  for (let i = 0; i < 3; i++) {
    const x = -1.30 + i * 1.30;
    M(studio, `Studio northlight roof tooth ${i + 1}`, geometry.citySawRoof, zinc, [x, 2.92, -.035], [1.30, 1.12, 1.85]);
    B(studio, `Studio northlight upright glazing ${i + 1}`, glazing, x + .65, 3.19, -.035, .025, .38, 1.61);
    for (let j = 0; j < 4; j++) B(studio, `Northlight frame ${i + 1}-${j + 1}`, charcoal, x + .67, 3.19, -.69 + j * .44, .035, .43, .035);
  }
  // The east return is visible from the overview; continue actual curtain-wall framing.
  for (let i = 0; i < 4; i++) B(studio, `Studio east-return mullion ${i + 1}`, timber, 1.96, 1.58, -.7 + i * .46, .11, 2.61, .065);
  B(studio, 'Studio east-return glass', glazing, 1.934, 1.57, 0, .018, 2.48, 1.65);
  roofPlant(studio, 'Studio roof ventilator', -1.4, 3.26, -.35, .36);

  // 4 — Headquarters: stone piers, deep double-storey glazing, recessed rooftop pavilion.
  const hq = G('Workforce headquarters — articulated limestone office', 3.05, -7.04);
  B(hq, 'Headquarters continuous stone podium', limestone, 0, .18, 0, 5.22, .29, 1.98);
  B(hq, 'Headquarters central masonry core', paleStone, 0, 2.02, -.05, 5.08, 3.54, 1.78);
  for (let floor = 0; floor < 3; floor++) {
    const y = .86 + floor * 1.04;
    for (let bay = 0; bay < 7; bay++) {
      const x = -2.1 + bay * .7;
      B(hq, `HQ glazed bay floor ${floor + 1} bay ${bay + 1}`, floor === 0 && bay === 3 ? shadowGlass : glazing, x, y, .856, .55, .78, .026);
      B(hq, `HQ horizontal glazing transom ${floor + 1}-${bay + 1}`, charcoal, x, y + .03, .883, .55, .03, .027);
      B(hq, `HQ narrow glazing mullion ${floor + 1}-${bay + 1}`, charcoal, x, y, .884, .025, .78, .027);
    }
    B(hq, `HQ floor slab ${floor + 1}`, ivory, 0, y - .5, .91, 5.18, .14, .21);
  }
  for (let bay = 0; bay < 8; bay++) B(hq, `HQ deep facade pier ${bay + 1}`, limestone, -2.45 + bay * .7, 1.99, .94, .12, 3.48, .20);
  B(hq, 'HQ top horizontal lintel', ivory, 0, 3.76, .93, 5.25, .18, .22);
  B(hq, 'HQ copper entrance canopy', copper, 0, 1.49, 1.12, 1.42, .08, .40);
  for (const x of [-.33, .33]) B(hq, `HQ paired entrance handle ${x < 0 ? 'west' : 'east'}`, copper, x, .86, .92, .025, .29, .035);
  for (let i = 0; i < 3; i++) {
    B(hq, `HQ east return rear window ${i + 1}`, glazing, 2.55, 1.06 + i * 1.05, -.44, .025, .74, .56);
    B(hq, `HQ east return front window ${i + 1}`, glazing, 2.55, 1.06 + i * 1.05, .36, .025, .74, .56);
    B(hq, `HQ east return lintel ${i + 1}`, ivory, 2.60, .55 + i * 1.05, 0, .14, .13, 1.8);
  }
  B(hq, 'HQ recessed rooftop pavilion body', charcoal, -.35, 4.11, -.28, 3.48, .70, 1.09);
  B(hq, 'HQ rooftop pavilion glazing', shadowGlass, -.35, 4.10, .282, 3.33, .53, .023);
  for (let i = 0; i < 6; i++) B(hq, `HQ rooftop pavilion mullion ${i + 1}`, zinc, -1.96 + i * .64, 4.10, .306, .045, .60, .045);
  B(hq, 'HQ floating rooftop canopy', ivory, -.35, 4.53, -.28, 3.73, .13, 1.27);
  parapet(hq, 'HQ perimeter terrace', 5.08, 1.79, 3.86, paleStone);
  for (let i = 0; i < 11; i++) B(hq, `HQ terrace front railing upright ${i + 1}`, zinc, -2.42 + i * .484, 4.08, .92, .023, .38, .023);
  B(hq, 'HQ terrace front handrail', zinc, 0, 4.28, .92, 4.88, .025, .025);
  roofPlant(hq, 'HQ rooftop air handling', 1.88, 3.89, -.25, .55);
  C(hq, 'HQ roof extract flue', zinc, -1.68, 4.68, -.44, .13, .25);
  C(hq, 'HQ roof extract cap', charcoal, -1.68, 4.82, -.44, .22, .04);

  // 5 — Service address: sawtooth workshop, loading doors and a proper contained yard.
  const service = G('Service workshop with loading court and utility yard', 8.72, -7.05);
  B(service, 'Workshop concrete foundation', limestone, -.70, .18, 0, 3.22, .28, 1.94);
  B(service, 'Workshop brick volume', brick, -.70, 1.42, -.04, 3.08, 2.30, 1.79);
  B(service, 'Workshop stone eaves band', ivory, -.70, 2.61, -.04, 3.20, .12, 1.91);
  for (let bay = 0; bay < 2; bay++) {
    const x = -1.46 + bay * 1.43;
    B(service, `Loading bay ${bay + 1} frame`, limestone, x, 1.05, .89, 1.19, 1.57, .13);
    B(service, `Loading bay ${bay + 1} sectional door`, zinc, x, 1.03, .967, 1.0, 1.36, .045);
    for (let slat = 0; slat < 7; slat++) B(service, `Loading bay ${bay + 1} shutter joint ${slat + 1}`, charcoal, x, .45 + slat * .18, .995, .97, .018, .014);
    B(service, `Loading bay ${bay + 1} vision panel`, shadowGlass, x, 1.43, 1.011, .76, .16, .018);
    B(service, `Loading bay ${bay + 1} concrete apron`, paleStone, x, .19, 1.13, 1.24, .28, .38);
    for (const side of [-1, 1]) B(service, `Loading bay ${bay + 1} dock bumper ${side < 0 ? 'west' : 'east'}`, charcoal, x + side * .50, .42, 1.03, .08, .26, .08);
  }
  B(service, 'Loading canopy deep shadow', charcoal, -.70, 1.96, 1.09, 3.14, .08, .44);
  B(service, 'Loading canopy zinc surface', zinc, -.70, 2.015, 1.09, 3.20, .045, .46);
  for (let i = 0; i < 3; i++) {
    const x = -1.73 + i * 1.03;
    M(service, `Workshop shed roof ${i + 1}`, geometry.citySawRoof, terracotta, [x, 2.67, -.04], [1.03, .82, 1.88]);
    B(service, `Workshop clerestory light ${i + 1}`, glazing, x + .515, 2.87, -.04, .021, .27, 1.68);
  }
  // The yard is deliberately low: it provides a silhouette pause at the east edge.
  const yard = subgroup(service, 'Contained utility court', [1.68, 0, .01]);
  B(yard, 'Utility court paving', paleStone, 0, .12, 0, 1.60, .18, 1.89);
  B(yard, 'Utility court rear wall', limestone, 0, .67, -.87, 1.58, 1.04, .12);
  B(yard, 'Utility court east boundary wall', limestone, .74, .67, 0, .12, 1.04, 1.76);
  B(yard, 'Utility court rear coping', ivory, 0, 1.22, -.87, 1.65, .09, .18);
  B(yard, 'Utility court east coping', ivory, .74, 1.22, 0, .18, .09, 1.82);
  B(yard, 'Service yard gate top rail', charcoal, 0, .89, .92, 1.43, .05, .06);
  for (let i = 0; i < 9; i++) B(yard, `Service yard gate slat ${i + 1}`, zinc, -.64 + i * .16, .55, .92, .07, .66, .045);
  for (const x of [-.7, .7]) B(yard, `Service yard gate pier ${x < 0 ? 'west' : 'east'}`, limestone, x, .62, .92, .14, .98, .19);
  for (let stack = 0; stack < 2; stack++) {
    const x = -.37 + stack * .67;
    B(yard, `Stored pallet ${stack + 1}`, timber, x, .28, -.24, .55, .10, .54);
    for (let level = 0; level < 2 + stack; level++) B(yard, `Stacked service crate ${stack + 1}-${level + 1}`, level % 2 ? copper : timber, x, .44 + level * .21, -.24, .48, .18, .47);
  }
  C(service, 'Workshop extraction duct', zinc, -.42, 3.15, -.51, .23, .42);
  C(service, 'Workshop extraction mushroom cap', charcoal, -.42, 3.39, -.51, .36, .08);

  // No label planes: each address is identified by its architecture and silhouette.
  return {
    group: street,
    landmarks: {
      terrace: new THREE.Vector3(-9.78, 3.82, -6.22),
      clockTower: new THREE.Vector3(-6.82, 4.90, -7.09),
      studio: new THREE.Vector3(-2.24, 3.43, -7.06),
      headquarters: new THREE.Vector3(3.05, 4.60, -7.04),
      serviceCourt: new THREE.Vector3(10.40, 1.25, -7.04),
    },
  };
}
