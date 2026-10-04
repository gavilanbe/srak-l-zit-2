// Render 3D → pixel art: la escena se dibuja a baja resolución, se le añaden
// contornos a partir de la profundidad y el navegador la amplía sin suavizar.
import * as THREE from '../vendor/three.module.js';
export { THREE };

export const PPU = 16; // píxeles de pantalla (a baja resolución) por unidad de mundo

const POST_VERT = `
varying vec2 vUv;
void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;

const POST_FRAG = `
uniform sampler2D tColor;
uniform sampler2D tDepth;
uniform vec2 texel;
uniform float range;
uniform float flash;
uniform vec3 tint;
varying vec2 vUv;
float D(vec2 o) { return texture2D(tDepth, vUv + o * texel).x * range; }
void main() {
  vec3 col = texture2D(tColor, vUv).rgb;
  float c = D(vec2(0.0));
  float l = D(vec2(-1.0, 0.0)), r = D(vec2(1.0, 0.0));
  float u = D(vec2(0.0, 1.0)), b = D(vec2(0.0, -1.0));
  float far = max(max(l, r), max(u, b)) - c;   // un vecino queda mucho más lejos: silueta
  float lap = l + r + u + b - 4.0 * c;         // curvatura: aristas convexas y cóncavas
  if (far > 0.4) col *= 0.4;
  else if (lap > 0.06) col = col * 1.3 + 0.03;
  else if (lap < -0.09 && lap > -0.45) col *= 0.78;
  col *= tint;
  col = mix(col, vec3(1.0), flash);
  gl_FragColor = vec4(col, 1.0);
  #include <colorspace_fragment>
}`;

export class Gfx {
  constructor(root) {
    const r = this.renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
    r.setPixelRatio(1);
    r.shadowMap.enabled = true;
    r.shadowMap.type = THREE.BasicShadowMap;
    this.canvas = r.domElement;
    root.appendChild(this.canvas);

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#090b16');

    const yaw = Math.PI / 4, pitch = THREE.MathUtils.degToRad(40);
    this.dir = new THREE.Vector3(Math.cos(pitch) * Math.sin(yaw), Math.sin(pitch), Math.cos(pitch) * Math.cos(yaw));
    this.near = 1; this.far = 130; this.camDist = 65;
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, this.near, this.far);
    this.camera.position.copy(this.dir).multiplyScalar(this.camDist);
    this.camera.lookAt(0, 0, 0);
    this.camera.updateMatrixWorld();
    this.right = new THREE.Vector3().setFromMatrixColumn(this.camera.matrixWorld, 0);
    this.up = new THREE.Vector3().setFromMatrixColumn(this.camera.matrixWorld, 1);
    // ejes de movimiento sobre el suelo, relativos a la pantalla
    this.floorRight = new THREE.Vector3(this.right.x, 0, this.right.z).normalize();
    this.floorUp = new THREE.Vector3(this.up.x, 0, this.up.z).normalize();

    this.post = new THREE.ShaderMaterial({
      vertexShader: POST_VERT, fragmentShader: POST_FRAG, depthTest: false, depthWrite: false,
      uniforms: {
        tColor: { value: null }, tDepth: { value: null }, texel: { value: new THREE.Vector2() },
        range: { value: this.far - this.near }, flash: { value: 0 }, tint: { value: new THREE.Color(1, 1, 1) },
      },
    });
    this.postScene = new THREE.Scene();
    this.postScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.post));
    this.postCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    this.offX = 0; this.offY = 0; this.W = 0; this.H = 0; this.scale = 1;
    this._v = new THREE.Vector3(); this._t = new THREE.Vector3();
  }

  resize(W, H, scale) {
    this.W = W; this.H = H; this.scale = scale;
    const w = W + 2, h = H + 2; // un píxel de margen para el desplazamiento subpíxel
    this.renderer.setSize(w, h, false);
    this.canvas.style.width = w * scale + 'px';
    this.canvas.style.height = h * scale + 'px';
    this.canvas.style.left = -scale + 'px';
    this.canvas.style.top = -scale + 'px';
    if (this.rt) this.rt.dispose();
    this.rt = new THREE.WebGLRenderTarget(w, h, { minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter });
    this.rt.depthTexture = new THREE.DepthTexture(w, h);
    this.post.uniforms.tColor.value = this.rt.texture;
    this.post.uniforms.tDepth.value = this.rt.depthTexture;
    this.post.uniforms.texel.value.set(1 / w, 1 / h);
    const c = this.camera;
    c.left = -w / 2 / PPU; c.right = w / 2 / PPU; c.top = h / 2 / PPU; c.bottom = -h / 2 / PPU;
    c.updateProjectionMatrix();
  }

  // Coloca la cámara ajustada a la rejilla de píxeles y compensa el resto moviendo el canvas.
  setTarget(t) {
    const r = t.dot(this.right), u = t.dot(this.up);
    const rs = Math.round(r * PPU) / PPU, us = Math.round(u * PPU) / PPU;
    this._t.copy(t).addScaledVector(this.right, rs - r).addScaledVector(this.up, us - u);
    this.camera.position.copy(this._t).addScaledVector(this.dir, this.camDist);
    this.camera.updateMatrixWorld();
    this.offX = -(r - rs) * PPU; this.offY = (u - us) * PPU;
    this.canvas.style.transform = `translate(${this.offX * this.scale}px, ${this.offY * this.scale}px)`;
  }

  project(p) {
    this._v.copy(p).project(this.camera);
    return {
      x: (this._v.x * 0.5 + 0.5) * (this.W + 2) - 1 + this.offX,
      y: (1 - (this._v.y * 0.5 + 0.5)) * (this.H + 2) - 1 + this.offY,
    };
  }

  render() {
    const r = this.renderer;
    r.setRenderTarget(this.rt);
    r.render(this.scene, this.camera);
    r.setRenderTarget(null);
    r.render(this.postScene, this.postCam);
  }
}

// ---------- materiales y piezas ----------

const grad = new THREE.DataTexture(new Uint8Array([70, 135, 205, 255]), 4, 1, THREE.RedFormat);
grad.minFilter = grad.magFilter = THREE.NearestFilter;
grad.needsUpdate = true;

const toonCache = new Map();
export function toon(color, map) {
  if (map) return new THREE.MeshToonMaterial({ color, map, gradientMap: grad });
  let m = toonCache.get(color);
  if (!m) { m = new THREE.MeshToonMaterial({ color, gradientMap: grad }); toonCache.set(color, m); }
  return m;
}
export const basic = (color, opts = {}) => new THREE.MeshBasicMaterial({ color, ...opts });
export const GHOST = new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false });

function mesh(geo, m) {
  const o = new THREE.Mesh(geo, typeof m === 'string' ? toon(m) : m);
  const solid = !o.material.transparent;
  o.castShadow = solid; o.receiveShadow = solid;
  return o;
}
export const box = (w, h, d, m) => mesh(new THREE.BoxGeometry(w, h, d), m);
export const cyl = (rt, rb, h, m, seg = 10) => mesh(new THREE.CylinderGeometry(rt, rb, h, seg), m);
export const sph = (r, m, ws = 10, hs = 7) => mesh(new THREE.SphereGeometry(r, ws, hs), m);
export const plane = (w, h, m) => mesh(new THREE.PlaneGeometry(w, h), m);
export function put(parent, o, x = 0, y = 0, z = 0) { o.position.set(x, y, z); parent.add(o); return o; }

export function canvasTex(w, h, draw, repX = 1, repY = 1) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.magFilter = t.minFilter = THREE.NearestFilter; t.generateMipmaps = false;
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repX, repY);
  return t;
}
