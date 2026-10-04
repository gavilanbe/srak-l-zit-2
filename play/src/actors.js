// Personajes: la cucaracha con su tarbouch, la jadda y la belgha voladora. Todos miran hacia +x.
import { THREE, toon, basic, box, cyl, sph, put } from './gfx.js';

export function makeRoach() {
  const g = new THREE.Group();
  put(g, sph(1, '#8a3b16', 12, 8), 0, 0.22, 0).scale.set(0.5, 0.17, 0.3);
  put(g, sph(1, '#5c240c', 10, 6), -0.1, 0.28, 0).scale.set(0.4, 0.13, 0.25);
  put(g, sph(0.17, '#3d1608', 8, 6), 0.5, 0.2, 0);
  put(g, cyl(0.085, 0.11, 0.17, '#d00000', 8), 0.48, 0.42, 0);              // tarbouch
  put(g, box(0.04, 0.12, 0.04, '#111111'), 0.42, 0.47, 0.07);
  for (const s of [-1, 1]) put(g, sph(0.04, basic('#fff6d6'), 5, 4), 0.62, 0.24, s * 0.09);

  const ant = [], legs = [];
  for (const s of [-1, 1]) {
    const p = new THREE.Group(); p.position.set(0.6, 0.26, s * 0.06); g.add(p);
    put(p, box(0.55, 0.05, 0.05, '#2b0f05'), 0.27, 0, 0);
    p.rotation.set(0, -s * 0.45, 0.3); p.userData.s = s; ant.push(p);
    for (const [i, x] of [0.26, 0.02, -0.24].entries()) {
      const l = new THREE.Group(); l.position.set(x, 0.14, s * 0.24); g.add(l);
      put(l, box(0.06, 0.06, 0.4, '#2b0f05'), 0, -0.05, s * 0.2).rotation.x = s * 0.3;
      l.userData = { s, base: (i - 1) * -0.35 * s, ph: (i % 2 ? 0 : Math.PI) + (s > 0 ? 0 : Math.PI) };
      legs.push(l);
    }
  }
  const drops = [];
  for (let i = 0; i < 3; i++) {
    const d = put(g, sph(0.13, basic('#ffd23f'), 6, 5), 0.12 - i * 0.2, 0.46, 0);
    d.castShadow = false; d.visible = false; drops.push(d);
  }
  g.traverse((o) => { // un poco de brillo propio para que se la vea a oscuras
    if (!o.isMesh || !o.material.isMeshToonMaterial) return;
    o.material = o.material.clone(); o.material.emissive.copy(o.material.color).multiplyScalar(0.45);
  });
  g.scale.setScalar(1.8);
  g.userData = { ant, legs, drops };
  return g;
}

export function animRoach(g, phase, moving, time) {
  const { ant, legs } = g.userData;
  for (const l of legs) l.rotation.y = l.userData.base + (moving ? Math.sin(phase + l.userData.ph) * 0.55 : 0);
  for (const a of ant) a.rotation.y = -a.userData.s * 0.45 + Math.sin(time * 5 + a.userData.s) * 0.18;
}

export function makeSlipper() {
  const g = new THREE.Group();
  put(g, box(1.0, 0.2, 0.5, '#f4c20d'), 0, 0, 0);
  put(g, box(0.5, 0.3, 0.52, '#f4c20d'), 0.3, 0.14, 0);
  put(g, box(0.25, 0.14, 0.3, '#e0a800'), 0.62, 0, 0);
  return g;
}

export function makeGranny() {
  const g = new THREE.Group();
  const robe = '#7d3c98';
  put(g, cyl(0.7, 1.45, 4.2, robe, 12), 0, 2.1, 0);                // djellaba
  put(g, cyl(1.47, 1.5, 0.3, '#e9c46a', 12), 0, 0.3, 0);
  put(g, cyl(0.72, 0.8, 0.22, '#e9c46a', 12), 0, 4.1, 0);
  put(g, box(0.1, 2.6, 0.16, '#e9c46a'), 0.98, 2.8, 0).rotation.z = 0.19;
  put(g, sph(0.72, '#c68a5b', 10, 8), 0, 4.85, 0);                 // cabeza y pañuelo
  put(g, sph(0.8, '#d62828', 10, 8), -0.16, 4.98, 0);
  put(g, sph(0.24, '#d62828', 6, 5), -0.9, 4.6, 0);
  for (const s of [-1, 1]) {
    put(g, box(0.08, 0.12, 0.14, '#1b1b1b'), 0.69, 4.9, s * 0.25);
    put(g, box(0.08, 0.06, 0.26, '#3a2414'), 0.7, 5.06, s * 0.27).rotation.x = s * 0.35; // ceño
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
