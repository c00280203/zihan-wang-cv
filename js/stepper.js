/* =========================================================
   Stepper / brushless-core motor — refined exploded assembly
   Parts modeled procedurally along ONE axis. Scroll down in
   the stage to slide them into one compact motor; scroll up
   to explode. Refinement pass:
     · realistic detail — bolts, enamel-wound copper, cooling
       slots, nameplate, lead cables, laminations, magnets,
       wave washer
     · finer structure — 11 independently moving groups
     · rendering — brushed metal roughness, studio env, rim
       lights (transparent stage, no ground shadow)
     · motion — sequential stagger, part-by-part highlight,
       restrained bilingual leader-line labels during explode
   ========================================================= */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const stage = document.getElementById('stepper-stage');
if (stage) {
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const ease = t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const small = t => t * t * (3 - 2 * t);

  const scene = new THREE.Scene();
  scene.background = null;
  const W = () => Math.max(1, stage.clientWidth);
  const H = () => Math.max(1, stage.clientHeight);

  const camera = new THREE.PerspectiveCamera(42, W() / H(), 0.01, 60);
  const camPose = function (a) {
    const mobile = window.innerWidth <= 860;
    // axis runs along Z; camera from the side so the row reads as a diagonal
    const open  = mobile ? { p: [7.2, 4.4, 4.0], t: [0, 0, 0] }
                         : { p: [4.6, 2.7, 2.5], t: [0, 0, 0] };
    const close = mobile ? { p: [3.4, 2.1, 2.3], t: [0, 0, 0] }
                         : { p: [2.7, 1.7, 1.9], t: [0, 0, 0] };
    const q = clamp(a / 0.9, 0, 1), k = ease(q);
    return {
      p: open.p.map((v, i) => v + (close.p[i] - v) * k),
      t: open.t.map((v, i) => v + (close.t[i] - v) * k),
    };
  };
  {
    const h = camPose(0);
    camera.position.set(...h.p);
  }

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setClearAlpha(0);
  renderer.setSize(W(), H());
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.02;
  stage.appendChild(renderer.domElement);

  /* ---------- procedural studio environment for metal reflections ---------- */
  function makeEnvTexture() {
    const c = document.createElement('canvas');
    c.width = 1024; c.height = 512;
    const x = c.getContext('2d');
    const g = x.createLinearGradient(0, 0, 0, 512);
    g.addColorStop(0.00, '#ffffff');
    g.addColorStop(0.26, '#e7edf4');
    g.addColorStop(0.46, '#aab6c4');
    g.addColorStop(0.62, '#6a7686');
    g.addColorStop(1.00, '#262e38');
    x.fillStyle = g; x.fillRect(0, 0, 1024, 512);
    x.save();
    x.globalCompositeOperation = 'lighter';
    const strip = (cx, cy, w, h, a) => {
      const rg = x.createRadialGradient(cx, cy, 0, cx, cy, Math.max(w, h));
      rg.addColorStop(0, `rgba(255,255,255,${a})`);
      rg.addColorStop(1, 'rgba(255,255,255,0)');
      x.fillStyle = rg; x.fillRect(cx - w, cy - h, w * 2, h * 2);
    };
    strip(210, 118, 200, 130, 0.98);
    strip(770, 84, 160, 110, 0.90);
    strip(520, 196, 96, 230, 0.42);
    strip(950, 300, 130, 96, 0.55);
    strip(120, 380, 120, 70, 0.40);
    x.restore();
    const tex = new THREE.CanvasTexture(c);
    tex.mapping = THREE.EquirectangularReflectionMapping;
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envTex = makeEnvTexture();
  scene.environment = pmrem.fromEquirectangular(envTex).texture;
  envTex.dispose();

  /* ---------- brushed-metal roughness map ---------- */
  function makeBrushedTexture() {
    const c = document.createElement('canvas');
    c.width = 512; c.height = 512;
    const x = c.getContext('2d');
    x.fillStyle = '#8a8a8a'; x.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 2200; i++) {
      const y = Math.random() * 512;
      const v = 96 + Math.random() * 96;
      x.strokeStyle = `rgba(${v},${v},${v},${0.05 + Math.random() * 0.13})`;
      x.lineWidth = Math.random() * 1.1 + 0.25;
      x.beginPath();
      x.moveTo(0, y);
      x.lineTo(512, y + (Math.random() - 0.5) * 2.2);
      x.stroke();
    }
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(4, 1);
    return t;
  }
  const brushed = makeBrushedTexture();

  /* ---------- nameplate texture ---------- */
  function makeNameplateTexture(text) {
    const c = document.createElement('canvas');
    c.width = 320; c.height = 112;
    const x = c.getContext('2d');
    x.fillStyle = '#1d232b'; x.fillRect(0, 0, 320, 112);
    x.strokeStyle = 'rgba(255,255,255,0.16)'; x.lineWidth = 3;
    x.strokeRect(6, 6, 308, 100);
    x.fillStyle = '#e8edf3';
    x.font = '600 40px -apple-system, Arial, sans-serif';
    x.textAlign = 'center'; x.textBaseline = 'middle';
    x.fillText(text, 160, 58);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }

  const controls = new OrbitControls(camera, renderer.domElement);
  {
    const h = camPose(0);
    controls.target.set(...h.t);
  }
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.enableZoom = false;              // wheel is reserved for assembly
  controls.minDistance = 2.2;
  controls.maxDistance = 12;
  controls.update();

  scene.add(new THREE.AmbientLight(0xffffff, 0.5));
  const key = new THREE.DirectionalLight(0xffffff, 1.65);
  key.position.set(4, 6, 4); scene.add(key);
  const fill = new THREE.DirectionalLight(0x9fc4ff, 0.62);
  fill.position.set(-4, 2, -3); scene.add(fill);
  const rim = new THREE.PointLight(0xffe6c0, 0.95, 14);
  rim.position.set(0, 3, -4); scene.add(rim);
  const rimCool = new THREE.DirectionalLight(0xbcd6ff, 0.55);
  rimCool.position.set(-2, 1.5, -5); scene.add(rimCool);
  const topStrip = new THREE.DirectionalLight(0xffffff, 0.4);
  topStrip.position.set(0, 6, 0); scene.add(topStrip);

  /* ---------- materials ---------- */
  const chrome = new THREE.MeshStandardMaterial({
    color: 0xc2cbd6, metalness: 1.0, roughness: 0.16,
    roughnessMap: brushed, envMapIntensity: 1.75,
  });
  const chromeSoft = new THREE.MeshStandardMaterial({
    color: 0xa4afbc, metalness: 0.97, roughness: 0.22,
    roughnessMap: brushed, envMapIntensity: 1.45,
  });
  const steel = new THREE.MeshStandardMaterial({
    color: 0x96a0ac, metalness: 0.92, roughness: 0.28,
    roughnessMap: brushed, envMapIntensity: 1.2,
  });
  const steelLam = new THREE.MeshStandardMaterial({
    color: 0x7f8a97, metalness: 0.94, roughness: 0.34,
    roughnessMap: brushed, envMapIntensity: 1.05,
  });
  const darkSteel = new THREE.MeshStandardMaterial({
    color: 0x444c57, metalness: 0.84, roughness: 0.42, envMapIntensity: 0.9,
  });
  const magnet = new THREE.MeshStandardMaterial({
    color: 0x2f3a49, metalness: 0.72, roughness: 0.46, envMapIntensity: 0.8,
  });
  const copper = new THREE.MeshStandardMaterial({
    color: 0xd99f58, metalness: 0.92, roughness: 0.24, envMapIntensity: 1.45,
  });
  const copperLight = new THREE.MeshStandardMaterial({
    color: 0xe8b878, metalness: 0.88, roughness: 0.3, envMapIntensity: 1.3,
  });
  const copperDeep = new THREE.MeshStandardMaterial({
    color: 0xb4752e, metalness: 0.88, roughness: 0.32, envMapIntensity: 1.2,
  });
  const hole = new THREE.MeshStandardMaterial({
    color: 0x191f27, metalness: 0.4, roughness: 0.72,
  });
  const rubber = new THREE.MeshStandardMaterial({
    color: 0x242b34, metalness: 0.2, roughness: 0.85,
  });

  const axis = new THREE.Group();           // whole motor; parts slide along local Z
  scene.add(axis);

  const parts = [];                          // { group, closedZ, openZ, spin, mats, delay }
  function register(group, closedZ, openZ, spin, delay) {
    group.position.z = openZ;
    axis.add(group);
    // per-part material clones so each group can highlight independently
    const mats = [];
    group.traverse(function (o) {
      if (o.isMesh && o.material && !o.userData.noHi) {
        o.material = o.material.clone();
        if (o.material.emissive) {
          o.material.emissive = new THREE.Color(0xbcd2ff);
          o.material.emissiveIntensity = 0;
          mats.push(o.material);
        }
      }
    });
    parts.push({
      group, closedZ, openZ, spin: spin || 0,
      delay: delay || 0, mats,
    });
    return group;
  }
  function boltRing(radius, count, boltR, boltH, mat) {
    const g = new THREE.Group();
    const geo = new THREE.CylinderGeometry(boltR, boltR, boltH, 10);
    const capGeo = new THREE.CylinderGeometry(boltR * 0.55, boltR * 0.55, boltH * 1.04, 6);
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2;
      const m = new THREE.Mesh(geo, mat);
      m.rotation.x = Math.PI / 2;
      m.position.set(Math.cos(a) * radius, Math.sin(a) * radius, 0);
      g.add(m);
      const cap = new THREE.Mesh(capGeo, darkSteel);
      cap.rotation.x = Math.PI / 2;
      cap.position.set(Math.cos(a) * radius, Math.sin(a) * radius, boltH * 0.06);
      g.add(cap);
    }
    return g;
  }
  function toothedRing(rInner, rOuter, teeth, depth, mat) {
    const g = new THREE.Group();
    const ring = new THREE.Mesh(
      new THREE.CylinderGeometry(rOuter, rOuter, depth, 48, 1, true), mat);
    ring.rotation.x = Math.PI / 2; g.add(ring);
    const inner = new THREE.Mesh(
      new THREE.CylinderGeometry(rInner, rInner, depth, 48, 1, true), mat);
    inner.rotation.x = Math.PI / 2; g.add(inner);
    const tGeo = new THREE.BoxGeometry((rOuter - rInner) * 0.9, depth * 0.92, 0.035);
    for (let i = 0; i < teeth; i++) {
      const a = (i / teeth) * Math.PI * 2;
      const t = new THREE.Mesh(tGeo, mat);
      t.position.set(Math.cos(a) * (rInner + (rOuter - rInner) * 0.5),
                     Math.sin(a) * (rInner + (rOuter - rInner) * 0.5), 0);
      t.rotation.z = a; g.add(t);
    }
    return g;
  }
  function latheRing(profile, mat) {
    const pts = profile.map(p => new THREE.Vector2(p[0], p[1]));
    const m = new THREE.Mesh(new THREE.LatheGeometry(pts, 64), mat);
    m.rotation.x = Math.PI / 2;              // lathe axis Y -> world Z
    const g = new THREE.Group(); g.add(m);
    return g;
  }
  function arcWedge(rIn, rOut, a0, a1, depth, mat, bevel) {
    const s = new THREE.Shape();
    s.absarc(0, 0, rOut, a0, a1, false);
    s.lineTo(Math.cos(a1) * rIn, Math.sin(a1) * rIn);
    s.absarc(0, 0, rIn, a1, a0, true);
    s.closePath();
    const b = bevel === undefined ? 0.012 : bevel;
    const geo = new THREE.ExtrudeGeometry(s, {
      depth, bevelEnabled: b > 0, bevelThickness: b, bevelSize: b,
      bevelSegments: 2, curveSegments: 16,
    });
    geo.translate(0, 0, -depth / 2);
    return new THREE.Mesh(geo, mat);
  }
  function laminationStack(rInner, rOuter, count, thickness, gap, mat) {
    const g = new THREE.Group();
    const geo = new THREE.CylinderGeometry(rOuter, rOuter, thickness, 48, 1, false);
    const inner = new THREE.CylinderGeometry(rInner, rInner, thickness * 1.02, 48, 1, true);
    const total = count * thickness + (count - 1) * gap;
    for (let i = 0; i < count; i++) {
      const z = -total / 2 + thickness / 2 + i * (thickness + gap);
      const m = new THREE.Mesh(geo, mat);
      m.rotation.x = Math.PI / 2; m.position.z = z; g.add(m);
      const inn = new THREE.Mesh(inner, hole);
      inn.rotation.x = Math.PI / 2; inn.position.z = z; g.add(inn);
    }
    return g;
  }

  /* ---- 1. rear flange: ring + cooling slots + bolt holes + nameplate ---- */
  {
    const g = new THREE.Group();
    const body = latheRing([
      [0.30, -0.10], [0.62, -0.10], [0.67, -0.05], [0.67, 0.05],
      [0.62, 0.10], [0.30, 0.10], [0.30, -0.10],
    ], chrome);
    g.add(body);
    g.add(boltRing(0.56, 12, 0.028, 0.21, steel));
    // cooling slots around the rim
    const vent = new THREE.BoxGeometry(0.055, 0.135, 0.23);
    for (let i = 0; i < 20; i++) {
      const a = (i / 20) * Math.PI * 2;
      const m = new THREE.Mesh(vent, darkSteel);
      m.position.set(Math.cos(a) * 0.475, Math.sin(a) * 0.475, 0);
      m.rotation.z = a; g.add(m);
    }
    // engraved nameplate on the outer face
    const plate = new THREE.Mesh(
      new THREE.PlaneGeometry(0.34, 0.12),
      new THREE.MeshStandardMaterial({
        map: makeNameplateTexture('NEMA 17 · 1.8°'),
        metalness: 0.3, roughness: 0.5, emissive: 0x1a1e24, emissiveIntensity: 0.25,
      })
    );
    plate.userData.noHi = true;
    plate.position.set(0, 0.44, -0.101);
    plate.rotation.y = Math.PI;
    g.add(plate);
    register(g, -0.68, -2.78, 0.10, 0.00);
  }

  /* ---- 2. rear cap: toothed disc + bolts ---- */
  {
    const g = new THREE.Group();
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.49, 0.49, 0.16, 48), chromeSoft);
    disc.rotation.x = Math.PI / 2; g.add(disc);
    g.add(toothedRing(0.41, 0.51, 28, 0.12, steel));
    g.add(boltRing(0.36, 8, 0.024, 0.19, steel));
    register(g, -0.50, -2.05, -0.14, 0.06);
  }

  /* ---- 3. rear bearing: races + balls + retainer ---- */
  function makeBearing() {
    const g = new THREE.Group();
    const outer = new THREE.Mesh(new THREE.TorusGeometry(0.37, 0.05, 14, 48), chrome);
    const inner = new THREE.Mesh(new THREE.TorusGeometry(0.245, 0.045, 14, 48), chromeSoft);
    g.add(outer, inner);
    const ballGeo = new THREE.SphereGeometry(0.043, 14, 14);
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      const b = new THREE.Mesh(ballGeo, chrome);
      b.position.set(Math.cos(a) * 0.305, Math.sin(a) * 0.305, 0);
      g.add(b);
    }
    const retainer = new THREE.Mesh(new THREE.TorusGeometry(0.305, 0.012, 8, 48), steelLam);
    g.add(retainer);
    return g;
  }
  register(makeBearing(), -0.33, -1.40, 0.22, 0.12);

  /* ---- 4. wave washer: thin scalloped spring ring ---- */
  {
    const g = new THREE.Group();
    const wave = toothedRing(0.27, 0.40, 18, 0.02, steelLam);
    g.add(wave);
    for (let i = 0; i < 18; i += 2) {
      const a = (i / 18) * Math.PI * 2;
      const b = new THREE.Mesh(new THREE.SphereGeometry(0.018, 8, 8), chromeSoft);
      b.position.set(Math.cos(a) * 0.335, Math.sin(a) * 0.335, 0.022);
      g.add(b);
    }
    register(g, -0.25, -1.00, -0.08, 0.18);
  }

  /* ---- 5. rotor: laminated core + magnets + shaft ---- */
  {
    const g = new THREE.Group();
    g.add(laminationStack(0.12, 0.345, 7, 0.042, 0.006, steelLam));
    g.add(toothedRing(0.345, 0.415, 22, 0.32, steel));
    // surface magnets, alternating poles
    const M = 4;
    for (let i = 0; i < M; i++) {
      const a0 = (i / M) * Math.PI * 2 + 0.05;
      const a1 = ((i + 1) / M) * Math.PI * 2 - 0.05;
      g.add(arcWedge(0.415, 0.435, a0, a1, 0.30, magnet, 0.006));
    }
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.078, 0.078, 0.78, 20), chrome);
    shaft.rotation.x = Math.PI / 2; shaft.position.z = -0.18; g.add(shaft);
    const flat = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.09, 0.34), chromeSoft);
    flat.position.set(0.078, 0, -0.30); g.add(flat);
    register(g, -0.06, -0.54, -0.28, 0.24);
  }

  /* ---- 6. stator laminations: stacked iron core ring ---- */
  {
    const g = new THREE.Group();
    // stacked thin rings to read as laminated steel
    const ringGeo = new THREE.CylinderGeometry(0.52, 0.52, 0.042, 48, 1, true);
    const innerGeo = new THREE.CylinderGeometry(0.32, 0.32, 0.044, 48, 1, true);
    const count = 9, total = count * 0.042 + (count - 1) * 0.006;
    for (let i = 0; i < count; i++) {
      const z = -total / 2 + 0.021 + i * 0.048;
      const r = new THREE.Mesh(ringGeo, steelLam);
      r.rotation.x = Math.PI / 2; r.position.z = z; g.add(r);
      const inn = new THREE.Mesh(innerGeo, hole);
      inn.rotation.x = Math.PI / 2; inn.position.z = z; g.add(inn);
    }
    // inner teeth
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      const t = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.055, 0.40), steelLam);
      t.position.set(Math.cos(a) * 0.30, Math.sin(a) * 0.30, 0);
      t.rotation.z = a; g.add(t);
    }
    register(g, 0.11, 0.08, 0.34, 0.30);
  }

  /* ---- 7. windings: 12 enamel-wound copper coils (hero part) ---- */
  const windingGroup = (function () {
    const g = new THREE.Group();
    const N = 12;
    for (let i = 0; i < N; i++) {
      const a0 = (i / N) * Math.PI * 2 + 0.035;
      const a1 = ((i + 1) / N) * Math.PI * 2 - 0.035;
      g.add(arcWedge(0.35, 0.535, a0, a1, 0.36, copper));
      // fine enamel-wire bands across the outer face
      const bands = 5;
      for (let k = 0; k < bands; k++) {
        const zz = -0.15 + k * (0.30 / (bands - 1));
        const band = arcWedge(0.44, 0.545, a0, a1, 0.028,
                              k % 2 ? copperLight : copperDeep, 0.004);
        band.position.z = zz; g.add(band);
      }
      // end-turn bundle peeking at both ends
      for (const s of [-1, 1]) {
        const end = arcWedge(0.36, 0.52, a0 + 0.02, a1 - 0.02, 0.03, copperLight, 0.006);
        end.position.z = s * 0.188; g.add(end);
      }
    }
    return g;
  })();
  register(windingGroup, 0.11, 0.52, 0.10, 0.36);

  /* ---- 8. lead cables: 4 thin wires exiting the windings ---- */
  {
    const g = new THREE.Group();
    const wireMat = [0xc0392b, 0x2f6fd0, 0x2e9e5b, 0x222831].map(function (c) {
      return new THREE.MeshStandardMaterial({ color: c, metalness: 0.1, roughness: 0.7 });
    });
    for (let i = 0; i < 4; i++) {
      const a = Math.PI * 0.35 + i * 0.14;
      const r = 0.48;
      const curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(Math.cos(a) * r, Math.sin(a) * r, -0.14),
        new THREE.Vector3(Math.cos(a) * (r + 0.10), Math.sin(a) * (r + 0.08), -0.30),
        new THREE.Vector3(Math.cos(a) * (r + 0.16), Math.sin(a) * (r - 0.04), -0.50),
        new THREE.Vector3(Math.cos(a) * (r + 0.10), Math.sin(a) * (r - 0.18), -0.66),
      ]);
      const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 26, 0.013, 7, false), wireMat[i]);
      tube.userData.noHi = true;
      g.add(tube);
    }
    register(g, 0.02, 0.78, 0.04, 0.40);
  }

  /* ---- 9. front bearing ---- */
  register(makeBearing(), 0.31, 1.04, -0.20, 0.46);

  /* ---- 10. front cap: mirror disc + hub + bolts ---- */
  {
    const g = new THREE.Group();
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.48, 0.15, 48), chrome);
    disc.rotation.x = Math.PI / 2; g.add(disc);
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.21, 0.21, 0.25, 32), chromeSoft);
    hub.rotation.x = Math.PI / 2; hub.position.z = 0.11; g.add(hub);
    const seal = new THREE.Mesh(new THREE.TorusGeometry(0.155, 0.018, 10, 40), rubber);
    seal.position.z = 0.235; g.add(seal);
    g.add(boltRing(0.37, 8, 0.024, 0.2, steel));
    register(g, 0.49, 1.70, 0.18, 0.52);
  }

  /* ---- 11. front flange: threaded ring + bolts ---- */
  {
    const g = new THREE.Group();
    const body = latheRing([
      [0.26, -0.10], [0.60, -0.10], [0.66, -0.04], [0.66, 0.06],
      [0.60, 0.11], [0.26, 0.11], [0.26, -0.10],
    ], chrome);
    g.add(body);
    for (let i = 0; i < 7; i++) {
      const th = new THREE.Mesh(new THREE.TorusGeometry(0.27 + i * 0.004, 0.012, 8, 48), chromeSoft);
      th.position.z = -0.07 + i * 0.024; g.add(th);
    }
    g.add(boltRing(0.53, 10, 0.026, 0.22, steel));
    register(g, 0.68, 2.58, -0.12, 0.58);
  }

  /* ---------- restrained bilingual leader-line labels ---------- */
  const annots = [];
  const annotsLayer = document.createElement('div');
  annotsLayer.className = 'step-annots';
  const annotsSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  annotsSvg.setAttribute('class', 'step-annot-lines');
  annotsLayer.appendChild(annotsSvg);
  stage.appendChild(annotsLayer);

  function addAnnot(partIndex, en, zh, anchor, dy, mobile) {
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('class', 'step-lead');
    annotsSvg.appendChild(line);
    const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    dot.setAttribute('class', 'step-node');
    dot.setAttribute('r', '2');
    annotsSvg.appendChild(dot);
    const label = document.createElement('div');
    label.className = 'step-annot';
    const enSpan = document.createElement('span'); enSpan.className = 'en'; enSpan.textContent = en;
    const zhSpan = document.createElement('span'); zhSpan.className = 'zh'; zhSpan.textContent = zh;
    label.appendChild(enSpan); label.appendChild(zhSpan);
    annotsLayer.appendChild(label);
    annots.push({ part: parts[partIndex], line, dot, label, anchor, dy, mobile: !!mobile });
  }
  // index: 0 flange,1 cap,2 bearing,3 washer,4 rotor,
  //        5 stator,6 windings,7 leads,8 bearing,9 cap,10 flange
  // 5 on desktop; on the small phone stage keep only the two hero parts
  addAnnot(6, 'COPPER WINDINGS', '铜绕组', new THREE.Vector3(0.50, 0.06, 0), -46, true);
  addAnnot(4, 'ROTOR + MAGNETS', '转子与磁钢', new THREE.Vector3(0.40, -0.10, 0), 40, true);
  addAnnot(2, 'BALL BEARING', '滚珠轴承', new THREE.Vector3(0.32, 0.10, 0), -34, false);
  addAnnot(9, 'END CAP', '端盖', new THREE.Vector3(0.42, -0.06, 0), 44, false);
  addAnnot(10, 'OUTPUT FLANGE', '输出法兰', new THREE.Vector3(0.55, 0.08, 0), -42, false);

  const projV = new THREE.Vector3();
  function updateAnnots(assembly) {
    // only during disassembly; fade out as it closes
    const vis = clamp((0.62 - assembly) / 0.34, 0, 1);
    annotsLayer.style.opacity = vis.toFixed(3);
    if (vis <= 0.01) return;
    const w = W(), h = H();
    const phone = w < 480;
    axis.updateMatrixWorld(true);
    for (const a of annots) {
      const show = phone ? a.mobile : true;
      a.line.style.display = a.dot.style.display = a.label.style.display = show ? '' : 'none';
      if (!show) continue;
      projV.copy(a.anchor);
      a.part.group.localToWorld(projV);
      projV.project(camera);
      const sx = (projV.x * 0.5 + 0.5) * w;
      const sy = (-projV.y * 0.5 + 0.5) * h;
      const offX = phone ? 26 : 44;
      const lx = clamp(sx + offX, 6, w - (phone ? 104 : 118));
      const ly = clamp(sy + (phone ? a.dy * 0.72 : a.dy), 14, h - 14);
      a.line.setAttribute('x1', sx.toFixed(1));
      a.line.setAttribute('y1', sy.toFixed(1));
      a.line.setAttribute('x2', lx.toFixed(1));
      a.line.setAttribute('y2', ly.toFixed(1));
      a.dot.setAttribute('cx', sx.toFixed(1));
      a.dot.setAttribute('cy', sy.toFixed(1));
      a.label.style.transform = 'translate(' + lx.toFixed(1) + 'px,' + (ly - 5).toFixed(1) + 'px)';
    }
  }
  updateAnnots(0);

  /* ---------- assembly state: spring follow ---------- */
  let assembly = 0, targetAssembly = 0, assemblyVel = 0;
  let overScroll = 0, assemblyMarked = false, assemblyMarkedAt = 0;
  window.stepperSetAssembly = v => { targetAssembly = clamp(v, 0, 1); };
  window.stepperAssembly = () => assembly;
  window.stepperTarget = () => targetAssembly;
  window.stepperAssembled = () => assembly >= 0.90;
  window.stepperReset = () => {
    targetAssembly = 0; assembly = 0; assemblyVel = 0;
    overScroll = 0; assemblyMarked = false; assemblyMarkedAt = 0;
    axis.rotation.z = 0;
  };

  controls.enableZoom = false;
  stage.addEventListener('wheel', e => {
    if (!window.stepperActive) return;
    e.preventDefault(); e.stopPropagation();
    if (e.deltaY > 0 && targetAssembly >= 0.99 && assembly >= 0.90) {
      if (performance.now() - assemblyMarkedAt >= 320) {
        overScroll += e.deltaY;
        if (overScroll > 150 && window.stepperCloseRequest) window.stepperCloseRequest();
      }
      return;
    }
    if (e.deltaY < 0) overScroll = 0;
    const step = clamp(Math.abs(e.deltaY) / 900, 0.02, 0.11);
    targetAssembly = clamp(targetAssembly + (e.deltaY > 0 ? step : -step), 0, 1);
  }, { passive: false, capture: true });

  let touchY = null;
  stage.addEventListener('touchstart', e => {
    touchY = e.touches[0] ? e.touches[0].clientY : null;
  }, { passive: true });
  stage.addEventListener('touchmove', e => {
    if (!window.stepperActive || touchY === null) return;
    const t = e.touches[0]; if (!t) return;
    const dy = t.clientY - touchY;
    if (dy < 0) overScroll = 0;
    if (dy > 0 && targetAssembly >= 0.99 && assembly >= 0.90) {
      e.preventDefault(); e.stopPropagation();
      if (performance.now() - assemblyMarkedAt >= 320) {
        overScroll += dy;
        if (overScroll > 60 && window.stepperCloseRequest) window.stepperCloseRequest();
      }
      touchY = t.clientY; return;
    }
    if (Math.abs(dy) > 4 && (dy < 0 || assembly < 0.99)) {
      e.preventDefault(); e.stopPropagation();
      targetAssembly = clamp(targetAssembly + dy / 320, 0, 1);
      touchY = t.clientY;
    }
  }, { passive: false, capture: true });
  stage.addEventListener('touchend', () => { touchY = null; }, { passive: true });

  /* ---------- loop ---------- */
  const clock = new THREE.Clock();
  window.stepperActive = false;
  let userMoved = false;
  window.stepperResize = function () {
    camera.aspect = W() / H(); camera.updateProjectionMatrix();
    renderer.setSize(W(), H());
    if (!userMoved) {
      const h = camPose(assembly);
      camera.position.set(...h.p); controls.target.set(...h.t); controls.update();
    }
    updateAnnots(assembly);
  };
  renderer.domElement.addEventListener('pointermove', e => {
    if (e.buttons === 1 && (e.movementX || e.movementY)) userMoved = true;
  });

  let stepperRaf = 0;
  function animate() {
    if (!window.stepperActive) { stepperRaf = 0; return; }
    stepperRaf = requestAnimationFrame(animate);
    const dt = Math.min(clock.getDelta(), 0.05);
    const k = 42, c = 2 * Math.sqrt(k) * 0.9;
    assemblyVel += ((targetAssembly - assembly) * k - assemblyVel * c) * dt;
    assembly = clamp(assembly + assemblyVel * dt, 0, 1);
    if ((assembly === 0 || assembly === 1) && Math.sign(targetAssembly - assembly) !== Math.sign(assemblyVel)) assemblyVel = 0;
    if (!assemblyMarked && assembly >= 0.90) { assemblyMarked = true; assemblyMarkedAt = performance.now(); }
    if (assembly < 0.86) assemblyMarked = false;

    if (!userMoved) {
      const pose = camPose(assembly);
      const lerp = Math.min(1, dt * 3.6);
      camera.position.x += (pose.p[0] - camera.position.x) * lerp;
      camera.position.y += (pose.p[1] - camera.position.y) * lerp;
      camera.position.z += (pose.p[2] - camera.position.z) * lerp;
      controls.target.x += (pose.t[0] - controls.target.x) * lerp;
      controls.target.y += (pose.t[1] - controls.target.y) * lerp;
      controls.target.z += (pose.t[2] - controls.target.z) * lerp;
    }
    controls.update();

    // sequential stagger: later parts start a touch later -> layered assembly
    const maxDelay = 0.58;
    const a = ease(clamp(assembly, 0, 1));
    for (const p of parts) {
      const local = clamp((a - p.delay) / (1 - maxDelay), 0, 1);
      const le = ease(local);
      p.group.position.z = p.openZ + (p.closedZ - p.openZ) * le;
      p.group.rotation.z = p.spin * (1 - le);
      // gentle highlight while a part is in motion
      const moving = Math.sin(Math.PI * local);
      const glow = 0.16 * moving * moving;
      for (const m of p.mats) m.emissiveIntensity = glow;
    }
    // gentle idle spin once assembled
    if (assembly > 0.9) axis.rotation.z += dt * 0.16;

    updateAnnots(assembly);
    renderer.render(scene, camera);
  }
  window.addEventListener('resize', () => { if (window.stepperActive) window.stepperResize(); });
  /* 只在卡片打开时跑渲染循环；关闭后彻底停掉 RAF。 */
  window.stepperStartLoop = function () {
    if (stepperRaf) return;
    clock.getDelta();
    window.stepperActive = true;
    animate();
  };
}
