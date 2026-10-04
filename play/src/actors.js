// Personajes: la cucaracha con su tarbouch, sus crías, la jadda, la belgha y Mchicha el gato.
// Todos miran hacia +x.
import { THREE, toon, basic, box, cyl, sph, put } from './gfx.js';

const Z = new THREE.Vector3(0, 0, 1);
const V = (x, y, z) => new THREE.Vector3(x, y, z);

// caja estirada entre dos puntos (patas y antenas)
function limb(parent, a, b, thick, color) {
  const d = b.clone().sub(a), m = box(thick, thick, d.length(), color);
  m.position.copy(a).addScaledVector(d, 0.5);
  m.quaternion.setFromUnitVectors(Z, d.normalize());
  parent.add(m);
  return m;
}

export function makeRoach({ baby = false } = {}) {
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
  const shell = baby ? '#cf8436' : '#a8521c', wingC = baby ? '#9a5520' : '#64260c', headC = baby ? '#7a3a14' : '#431808', legC = '#2b0f05';

  const abdomen = put(body, sph(1, shell, 12, 8), -0.14, 0.25, 0); abdomen.scale.set(0.46, 0.19, 0.31);
  put(body, sph(1, baby ? '#e09a4a' : '#c26a26', 10, 7), 0.28, 0.27, 0).scale.set(0.21, 0.175, 0.3); // pronoto
  put(body, sph(0.19, headC, 9, 7), 0.53, 0.24, 0);

  const wings = [], under = [], eyes = [], pupils = [], ant = [], legs = [];
  for (const s of [-1, 1]) {
    const w = new THREE.Group(); w.position.set(0.14, 0.33, s * 0.02); body.add(w);
    put(w, sph(1, wingC, 10, 6), -0.34, 0.0, s * 0.125).scale.set(0.4, 0.12, 0.165);
    w.userData.s = s; wings.push(w);
    const uw = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.3), new THREE.MeshBasicMaterial({ color: '#fff3c4', transparent: true, opacity: 0.65, side: THREE.DoubleSide, depthWrite: false }));
    uw.rotation.x = -Math.PI / 2; uw.position.set(-0.22, 0.36, s * 0.3); uw.visible = false; uw.userData.s = s; body.add(uw); under.push(uw);

    const e = put(body, sph(baby ? 0.11 : 0.09, basic('#fffbe8'), 7, 5), 0.62, 0.34, s * 0.115); e.castShadow = false; eyes.push(e);
    const p = put(body, sph(0.048, basic('#120a06'), 6, 4), 0.69, 0.35, s * 0.125); p.castShadow = false; pupils.push(p);
    if (!baby) put(body, box(0.035, 0.035, 0.17, '#120a06'), 0.7, 0.19, s * 0.1).rotation.y = s * 0.55; // bigote

    const a1 = new THREE.Group(); a1.position.set(0.66, 0.37, s * 0.07); body.add(a1);
    limb(a1, V(0, 0, 0), V(0.36, 0, 0), 0.05, legC);
    const a2 = new THREE.Group(); a2.position.set(0.36, 0, 0); a2.rotation.z = -0.55; a1.add(a2);
    limb(a2, V(0, 0, 0), V(0.34, 0, 0), 0.04, legC);
    a1.userData.s = s; ant.push(a1);

    for (const [i, x] of [0.3, 0.06, -0.2].entries()) {
      const hip = new THREE.Group(); hip.position.set(x, 0.2, s * 0.2); body.add(hip);
      const knee = V(0, 0.12, s * 0.2), foot = V([0.17, 0, -0.2][i], -0.2, s * 0.4);
      limb(hip, V(0, 0, 0), knee, 0.07, legC); limb(hip, knee, foot, 0.06, legC);
      hip.userData = { s, ph: (i % 2 ? Math.PI : 0) + (s > 0 ? 0 : Math.PI) };
      legs.push(hip);
    }
  }

  let tassel = null;
  if (!baby) { // tarbouch
    const fez = new THREE.Group(); fez.position.set(0.47, 0.41, 0); fez.rotation.z = 0.12; body.add(fez);
    put(fez, cyl(0.1, 0.135, 0.21, '#d00000', 8), 0, 0.105, 0);
    put(fez, cyl(0.03, 0.03, 0.03, '#120a06', 5), 0, 0.22, 0);
    tassel = new THREE.Group(); tassel.position.set(0, 0.22, 0); fez.add(tassel);
    limb(tassel, V(0, 0, 0), V(-0.05, -0.02, 0.13), 0.03, '#120a06');
    limb(tassel, V(-0.05, -0.02, 0.13), V(-0.06, -0.16, 0.14), 0.045, '#120a06');
  }

  const oil = put(body, sph(1, basic('#ffd23f'), 8, 6), -0.2, 0.47, 0); oil.castShadow = false; oil.visible = false;
  const shine = put(oil, sph(0.3, basic('#fff6d6'), 5, 4), 0.35, 0.45, 0.3); shine.castShadow = false;

  root.traverse((o) => { // un poco de brillo propio para que se la vea a oscuras
    if (!o.isMesh || !o.material.isMeshToonMaterial) return;
    o.material = o.material.clone(); o.material.emissive.copy(o.material.color).multiplyScalar(0.4);
  });
  root.scale.setScalar(baby ? 0.8 : 2.0);
  root.userData = { body, abdomen, wings, under, eyes, pupils, ant, legs, tassel, oil };
  return root;
}

// a: { phase, speed 0..1, time, turn -1..1, air 0..1, wing 0..1, scared 0..1, carry, squash 0..1 }
export function animRoach(root, a) {
  const u = root.userData, mv = Math.min(1, a.speed), sq = a.squash || 0;
  u.body.position.y = a.air * 0.75 + Math.abs(Math.sin(a.phase)) * 0.025 * mv;
  u.body.rotation.set(-a.turn * 0.35, 0, a.air * 0.3 - mv * 0.04);
  u.body.scale.set(1 + mv * 0.07 + sq * 0.2, 1 - sq * 0.35, 1 - mv * 0.04 + sq * 0.2);
  u.abdomen.scale.y = 0.19 * (1 + Math.sin(a.time * 3) * 0.05 * (1 - mv));
  for (const l of u.legs) {
    const { s, ph } = l.userData, c = a.phase + ph;
    l.rotation.y = Math.sin(c) * 0.5 * mv;
    l.rotation.x = -s * Math.max(0, Math.cos(c)) * 0.32 * mv + s * a.air * 0.5;
  }
  for (const p of u.ant) {
    const s = p.userData.s;
    p.rotation.y = -s * (0.5 - mv * 0.28) + Math.sin(a.time * 4 + s) * 0.14;
    p.rotation.z = 0.7 - mv * 0.4 + a.scared * 0.5 + Math.sin(a.time * 3.1 + s * 2) * 0.09;
  }
  for (const w of u.wings) { const s = w.userData.s; w.rotation.y = s * a.wing * 0.95; w.rotation.x = -s * a.wing * 0.45; }
  for (const w of u.under) { w.visible = a.wing > 0.15; w.rotation.y = w.userData.s * (0.5 + Math.sin(a.time * 70) * 0.35); }
  const es = 1 + a.scared * 0.45, blink = (a.time % 3.3) < 0.12 && a.scared < 0.1;
  for (const e of u.eyes) e.scale.set(es, blink ? 0.15 : es, es);
  for (const p of u.pupils) p.visible = !blink;
  if (u.tassel) u.tassel.rotation.z = -mv * 0.7 + Math.sin(a.time * 5) * 0.12;
  u.oil.visible = a.carry > 0;
  if (a.carry > 0) u.oil.scale.setScalar([0, 0.15, 0.2, 0.25][Math.min(3, a.carry)] * (1 + Math.sin(a.time * 7) * 0.07));
}

export function makeSlipper() {
  const g = new THREE.Group();
  put(g, box(1.0, 0.2, 0.5, '#f4c20d'), 0, 0, 0);
  put(g, box(0.5, 0.3, 0.52, '#f4c20d'), 0.3, 0.14, 0);
  put(g, box(0.25, 0.14, 0.3, '#e0a800'), 0.62, 0, 0);
  return g;
}

// look: 'jadda' (la abuela), 'jeddi' (el abuelo dormilón) o 'keeper' (Si Brahim, el del hanout)
export function makeGranny(look = 'jadda') {
  const g = new THREE.Group();
  const robe = look === 'jeddi' ? '#efe9d8' : look === 'keeper' ? '#2b5fa8' : '#7d3c98';
  const trim = look === 'jeddi' ? '#c9b47f' : look === 'keeper' ? '#f1faee' : '#e9c46a';
  put(g, cyl(0.7, 1.45, 4.2, robe, 12), 0, 2.1, 0);                // djellaba
  put(g, cyl(1.47, 1.5, 0.3, trim, 12), 0, 0.3, 0);
  put(g, cyl(0.72, 0.8, 0.22, trim, 12), 0, 4.1, 0);
  put(g, box(0.1, 2.6, 0.16, trim), 0.98, 2.8, 0).rotation.z = 0.19;
  put(g, sph(0.72, '#c68a5b', 10, 8), 0, 4.85, 0);                 // cabeza
  if (look === 'jadda') { // pañuelo
    put(g, sph(0.8, '#d62828', 10, 8), -0.16, 4.98, 0);
    put(g, sph(0.24, '#d62828', 6, 5), -0.9, 4.6, 0);
  } else if (look === 'jeddi') { // tarbouch y barba blanca
    put(g, cyl(0.42, 0.52, 0.6, '#c1121f', 10), -0.05, 5.7, 0);
    put(g, sph(0.5, '#f4f1ea', 8, 6), 0.3, 4.42, 0).scale.set(0.8, 1, 1.1);
  } else { // gorro blanco y bigote
    put(g, sph(0.76, '#f4f1ea', 10, 6), -0.04, 5.12, 0).scale.y = 0.55;
    put(g, box(0.1, 0.1, 0.5, '#1b1b1b'), 0.72, 4.56, 0);
  }
  for (const s of [-1, 1]) {
    put(g, box(0.08, 0.12, 0.14, '#1b1b1b'), 0.69, 4.9, s * 0.25);
    put(g, box(0.08, 0.06, 0.26, look === 'jeddi' ? '#f4f1ea' : '#3a2414'), 0.7, 5.06, s * 0.27).rotation.x = s * 0.35; // ceño
    put(g, box(0.75, 0.22, 0.44, '#f4c20d'), 1.2, 0.11, s * 0.5);  // belghas
  }
  put(g, sph(0.13, '#b87a4e', 6, 5), 0.74, 4.72, 0);
  put(g, cyl(0.2, 0.25, 1.7, robe, 6), 0.15, 3.0, 1.0).rotation.x = -0.25;

  const arm = new THREE.Group(); arm.position.set(0.1, 3.7, -0.95); g.add(arm);
  put(arm, cyl(0.25, 0.2, 1.7, robe, 6), 0, 0.85, 0);
  put(arm, sph(0.22, '#c68a5b', 6, 5), 0, 1.75, 0);
  const held = makeSlipper(); held.position.set(0.15, 2.1, 0); held.rotation.z = 0.6; arm.add(held);

  const cone = new THREE.Mesh(
    new THREE.CircleGeometry(1, 20, -0.6, 1.2),
    new THREE.MeshBasicMaterial({ color: '#ff9f1c', transparent: true, opacity: 0.3, depthWrite: false }),
  );
  cone.rotation.x = -Math.PI / 2; cone.position.y = 0.05; g.add(cone);

  g.userData = { arm, held, cone };
  return g;
}

export function makeChicken() {
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
  put(body, sph(1, '#f6f1e4', 9, 7), 0, 0.8, 0).scale.set(0.62, 0.5, 0.45);
  put(body, box(0.3, 0.5, 0.12, '#e2dbc8'), -0.6, 1.08, 0).rotation.z = -0.5;      // cola
  const head = new THREE.Group(); head.position.set(0.5, 1.28, 0); body.add(head);
  put(head, sph(0.25, '#f6f1e4', 7, 5), 0, 0, 0);
  put(head, box(0.22, 0.15, 0.07, '#d62828'), 0, 0.27, 0);                          // cresta
  const beak = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.24, 4), toon('#f4a20d')); beak.rotation.z = -Math.PI / 2; beak.castShadow = true;
  put(head, beak, 0.31, -0.02, 0);
  put(head, box(0.07, 0.13, 0.09, '#d62828'), 0.2, -0.17, 0);
  for (const s of [-1, 1]) put(head, sph(0.045, basic('#0b0b12'), 5, 4), 0.14, 0.07, s * 0.19).castShadow = false;
  const legs = [];
  for (const s of [-1, 1]) {
    const l = new THREE.Group(); l.position.set(0, 0.46, s * 0.15); body.add(l);
    put(l, box(0.06, 0.46, 0.06, '#f4a20d'), 0, -0.23, 0); put(l, box(0.22, 0.05, 0.16, '#f4a20d'), 0.06, -0.45, 0);
    l.userData.s = s; legs.push(l);
  }
  root.traverse((o) => {
    if (!o.isMesh || !o.material.isMeshToonMaterial) return;
    o.material = o.material.clone(); o.material.emissive.copy(o.material.color).multiplyScalar(0.3);
  });
  root.scale.setScalar(1.3);
  root.userData = { body, head, legs };
  return root;
}

// state: wander | chase | peck | rest | slide
export function animChicken(root, state, time, walk, k) {
  const u = root.userData, moving = state === 'wander' || state === 'chase';
  for (const l of u.legs) l.rotation.z = moving ? Math.sin(walk + (l.userData.s > 0 ? 0 : Math.PI)) * 0.6 : 0;
  u.head.position.x = 0.5 + (moving ? Math.sin(walk * 2) * 0.07 : 0);
  u.head.rotation.z = state === 'peck' ? (k < 0.7 ? 0.5 * (k / 0.7) : 0.5 - 2.2 * ((k - 0.7) / 0.3)) : 0;
  u.body.rotation.y = state === 'slide' ? time * 13 : 0;
  u.body.position.y = state === 'chase' ? Math.abs(Math.sin(walk)) * 0.12 : 0;
}

export function makeCat() {
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
  const fur = '#e08a2e', stripe = '#b5611a', white = '#f6efe2';
  const torso = put(body, sph(1, fur, 10, 7), 0, 0.78, 0); torso.scale.set(1.0, 0.48, 0.5);
  for (const x of [-0.5, -0.1, 0.3]) put(body, box(0.14, 0.14, 0.72, stripe), x, 1.17, 0);
  put(body, sph(0.3, white, 7, 5), 0.72, 0.62, 0);

  const head = new THREE.Group(); head.position.set(1.05, 1.12, 0); body.add(head);
  put(head, sph(0.43, fur, 9, 7), 0, 0, 0);
  put(head, sph(0.19, white, 6, 5), 0.32, -0.1, 0);
  put(head, box(0.06, 0.06, 0.08, '#e07a8a'), 0.5, -0.04, 0);
  const eyes = [];
  for (const s of [-1, 1]) {
    const ear = new THREE.Mesh(new THREE.ConeGeometry(0.17, 0.32, 4), toon(fur)); ear.castShadow = true;
    put(head, ear, -0.04, 0.42, s * 0.24);
    const e = put(head, sph(0.1, basic('#b6ff5c'), 6, 4), 0.33, 0.1, s * 0.18); e.castShadow = false; eyes.push(e);
    put(e, box(0.04, 0.16, 0.05, basic('#0b0b12')), 0.08, 0, 0).castShadow = false;
  }
  const legs = [];
  for (const x of [-0.6, 0.6]) for (const s of [-1, 1]) {
    const l = new THREE.Group(); l.position.set(x, 0.6, s * 0.27); body.add(l);
    put(l, cyl(0.12, 0.11, 0.6, fur, 6), 0, -0.3, 0); put(l, sph(0.15, white, 6, 4), 0.04, -0.56, 0);
    l.userData.ph = (x > 0 ? 0 : Math.PI) + (s > 0 ? 0 : Math.PI); legs.push(l);
  }
  const tail = new THREE.Group(); tail.position.set(-0.92, 0.95, 0); body.add(tail);
  limb(tail, V(0, 0, 0), V(-0.45, 0.3, 0), 0.15, fur);
  const tip = new THREE.Group(); tip.position.set(-0.45, 0.3, 0); tail.add(tip);
  limb(tip, V(0, 0, 0), V(-0.15, 0.45, 0), 0.14, stripe);
  put(tip, sph(0.1, white, 5, 4), -0.15, 0.48, 0);

  root.traverse((o) => { // que se le vea a oscuras
    if (!o.isMesh || !o.material.isMeshToonMaterial) return;
    o.material = o.material.clone(); o.material.emissive.copy(o.material.color).multiplyScalar(0.3);
  });
  root.scale.setScalar(1.25);
  root.userData = { body, torso, head, eyes, legs, tail, tip };
  return root;
}

// state: sleep | prowl | alert | pounce | recover | slide
export function animCat(root, state, time, walk, k) {
  const u = root.userData, asleep = state === 'sleep';
  u.body.position.y = asleep ? -0.42 : state === 'alert' ? -0.22 : state === 'pounce' ? Math.sin(k * Math.PI) * 0.9 : 0;
  u.body.rotation.set(0, state === 'alert' ? Math.sin(time * 26) * 0.07 : state === 'slide' ? time * 14 : 0, state === 'pounce' ? 0.25 - k * 0.5 : 0);
  u.body.scale.set(state === 'pounce' ? 1.2 : 1, asleep ? 0.9 + Math.sin(time * 2) * 0.03 : 1, 1);
  u.head.position.y = asleep ? 0.86 : state === 'alert' ? 1.0 : 1.12 + (state === 'prowl' ? Math.sin(walk * 2) * 0.03 : 0);
  u.head.rotation.z = asleep ? -0.5 : 0;
  for (const e of u.eyes) { e.visible = !asleep; e.scale.setScalar(state === 'alert' || state === 'pounce' ? 1.5 : 1); }
  for (const l of u.legs) {
    l.rotation.z = state === 'prowl' ? Math.sin(walk + l.userData.ph) * 0.5 : state === 'pounce' ? (l.position.x > 0 ? -1.0 : 1.0) : asleep ? 1.3 * Math.sign(l.position.x) : 0;
  }
  u.tail.rotation.y = asleep ? 2.2 : Math.sin(time * (state === 'alert' ? 14 : 2.5)) * (state === 'alert' ? 0.2 : 0.5);
  u.tail.rotation.z = state === 'alert' ? -0.9 : 0;
  u.tip.rotation.z = Math.sin(time * 3) * 0.3;
}
