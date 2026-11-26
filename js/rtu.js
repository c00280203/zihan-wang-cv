/* =========================================================
   RTU · Edge Computing — real five-layer PCB
   Open: 15 components hover above, five copper layers spread
   apart below (each showing its own EDA artwork). Scroll down
   in the stage: layers stack into ONE board and components seat
   on top; tap a layer to lift it out. Scroll up reverses it.
   ========================================================= */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const stage = document.getElementById('rtu-stage');
if (stage) {
  // pos = physical stack position, 0 = top layer, 4 = bottom layer
  const LAYERS = [
    { key: 'top',       en: '01  TOP LAYOUT',     zh: '01  顶层布局',  file: './assets/rtu/top-enh.webp',       pos: 0 },
    { key: 'topcopper', en: '02  TOP COPPER',     zh: '02  顶层铜箔',  file: './assets/rtu/topcopper-enh.webp', pos: 1 },
    { key: 'bottom',    en: '03  BOTTOM LAYER',   zh: '03  底层',      file: './assets/rtu/bottom-enh.webp',    pos: 4 },
    { key: 'signal1',   en: '04  SIGNAL LAYER 1', zh: '04  信号层 1',  file: './assets/rtu/signal1-enh.webp',   pos: 2 },
    { key: 'signal2',   en: '05  SIGNAL LAYER 2', zh: '05  信号层 2',  file: './assets/rtu/signal2-enh.webp',   pos: 3 },
  ];

  const scene = new THREE.Scene();
  scene.background = null;                       // 透出浅色磨砂玻璃舞台
  const W = () => Math.max(1, stage.clientWidth);
  const H = () => Math.max(1, stage.clientHeight);

  const camera = new THREE.PerspectiveCamera(45, W() / H(), 0.01, 30);
  // 炸开时退远看全局；合拢时推近看板子细节（用户手动旋转后不再干预）
  const camPose = function (a) {
    const mobile = window.innerWidth <= 860;
    const open = mobile ? { p:[0.40,1.75,4.7], t:[0.30,0.02,0] }
                        : { p:[0.34,1.38,3.55], t:[0.30,0.00,0] };
    // 手机上卡片收起标题后，镜头略微推近并下移视点，让整块 PCB 居中占满舞台。
    const close = mobile
      ? (window.__rtuFullView ? { p:[0.42,1.32,3.45], t:[0.40,-0.28,0] }
                              : { p:[0.42,1.55,3.6],  t:[0.40,0.02,0] })
      : { p:[0.30,1.10,2.75], t:[0.42,0.02,0] };
    const q = Math.max(0, Math.min(1, a / 0.9));
    const k = q < 0.5 ? 4*q*q*q : 1 - Math.pow(-2*q + 2, 3)/2;
    return {
      p: open.p.map((v, i) => v + (close.p[i] - v) * k),
      t: open.t.map((v, i) => v + (close.t[i] - v) * k)
    };
  };
  {
    const h = camPose(0);
    camera.position.set(...h.p);
  }
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: window.matchMedia('(max-width:760px)').matches ? 'default' : 'high-performance' });
  renderer.setClearAlpha(0);
  renderer.setSize(W(), H());
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  stage.appendChild(renderer.domElement);

  const controls = new OrbitControls(camera, renderer.domElement);
  {
    const h = camPose(0);
    controls.target.set(...h.t);
  }
  controls.enableDamping = true;
  controls.dampingFactor = 0.07;
  controls.minDistance = 1.6;
  controls.maxDistance = 8;
  controls.maxPolarAngle = Math.PI * 0.49;
  controls.update();

  scene.add(new THREE.AmbientLight(0xffffff, 0.78));
  const key = new THREE.DirectionalLight(0xffffff, 1.45);
  key.position.set(1.6, 2.8, 1.6); scene.add(key);
  const fill = new THREE.DirectionalLight(0x9fc4ff, 0.42);
  fill.position.set(-1.5, 1.4, -1.4); scene.add(fill);
  const rim = new THREE.PointLight(0x7fd8b8, 0.5, 7);
  rim.position.set(1.7, 1.1, 0); scene.add(rim);

  /* ---------- five physical PCB layers ---------- */
  const BOARD_W = 2.4, BOARD_D = 1.5, LAYER_T = 0.014;
  const CLOSE_GAP = 0.019;              // 合拢时层间距（叠成一块厚板）
  const CLOSED_TOP = 0.043;             // 合拢时最上层中心 y
  const EXPLODE_TOP = 0.10, SPREAD = 0.25; // 炸开时最上层 y 与层间距
  const TOP_Y = CLOSED_TOP + LAYER_T / 2;   // 零件落位的板面高度
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const ease = t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  function layerY(pos, a) {
    const open = EXPLODE_TOP - pos * SPREAD;
    const closed = CLOSED_TOP - pos * CLOSE_GAP;
    return open + (closed - open) * a;
  }

  const rimMat = new THREE.MeshStandardMaterial({
    color: 0xa9cbb9, roughness: 0.55, metalness: 0.05,
    transparent: true, opacity: 0, depthWrite: true
  });
  const layerObjs = LAYERS.map(L => {
    const face = new THREE.MeshStandardMaterial({
      color: 0xeaf6f1, roughness: 0.5, metalness: 0.02,
      transparent: true, opacity: 0, depthWrite: true
    });
    // BoxGeometry faces: +x -x +y -y +z -z  → 顶面(+y)放电路图
    const mats = [rimMat, rimMat, face, rimMat, rimMat, rimMat];
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(BOARD_W, LAYER_T, BOARD_D), mats);
    mesh.position.y = layerY(L.pos, 0);
    scene.add(mesh);
    return { L, mesh, face, tex: null };
  });
  // 每层各自贴自己的 EDA 图，炸开时即可逐层看清。
  // 贴图只在卡片首次打开时下载，首屏不为没人看的 3D 卡浪费流量。
  let texturesLoaded = false;
  function loadLayerTextures() {
    if (texturesLoaded) return;
    texturesLoaded = true;
    const loader = new THREE.TextureLoader();
    LAYERS.forEach((l, i) => {
      loader.load(l.file, t => {
        t.colorSpace = THREE.SRGBColorSpace;
        t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
        layerObjs[i].tex = t;
        layerObjs[i].face.map = t;
        layerObjs[i].face.color.setHex(0xffffff);
        layerObjs[i].face.needsUpdate = true;
        if (i === 0) { const b = document.getElementById('rtu-status'); if (b) b.textContent = 'LIVE 3D'; }
      }, undefined, () => {});
    });
  }
  window.rtuEnsureTextures = loadLayerTextures;

  /* ---------- 15 components hover above, then seat on the top layer ---------- */
  const chipMat = new THREE.MeshPhysicalMaterial({ color: 0x151a20, roughness: 0.34, metalness: 0.22, clearcoat: 0.35, clearcoatRoughness: 0.45 });
  const chipTopMat = new THREE.MeshStandardMaterial({ color: 0x2b333c, roughness: 0.42, metalness: 0.28 });
  const pinMat = new THREE.MeshStandardMaterial({ color: 0xd0ae4a, roughness: 0.26, metalness: 0.82 });
  const metalMat = new THREE.MeshStandardMaterial({ color: 0xb4bfc9, roughness: 0.28, metalness: 0.85 });
  const greenMat = new THREE.MeshStandardMaterial({ color: 0x1d6b3a, roughness: 0.68 });
  const seatMat = new THREE.MeshStandardMaterial({ color: 0x123a26, roughness: 0.8, metalness: 0.04 });
  const seatEdgeMat = new THREE.MeshStandardMaterial({ color: 0xb99a3f, roughness: 0.45, metalness: 0.55 });
  // 每个 3D 零件下面压一块焊盘底座，盖住贴图里原有的 footprints，落位后才不会像浮在上面
  function addSeat(g, w, d) {
    const edge = new THREE.Mesh(new THREE.BoxGeometry(w + 0.046, 0.002, d + 0.046), seatEdgeMat);
    edge.position.y = TOP_Y + 0.001; g.add(edge);
    const pad = new THREE.Mesh(new THREE.BoxGeometry(w + 0.03, 0.004, d + 0.03), seatMat);
    pad.position.y = TOP_Y + 0.003; g.add(pad);
  }

  let seed = 20261125;
  function rnd() { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; }
  const parts = [];
  function addPart(group) {
    const f = group.position.clone();
    const idx = parts.length;
    const col = idx % 6, row = Math.floor(idx / 6);
    const ex = new THREE.Vector3(
      -1.00 + col * 0.40 + (rnd() - 0.5) * 0.04,
      0.48 + row * 0.16 + (rnd() - 0.5) * 0.03,
      -0.50 + row * 0.46
    );
    const guideGeo = new THREE.BufferGeometry().setFromPoints([ex, f.clone().setY(TOP_Y + 0.02)]);
    const guide = new THREE.Line(guideGeo, new THREE.LineDashedMaterial({
      color: 0x8cb8a6, dashSize: 0.035, gapSize: 0.028, transparent: true, opacity: 0, depthWrite: false
    }));
    guide.computeLineDistances(); scene.add(guide);
    parts.push({
      group, final: f, explode: ex, guide,
      delay: Math.min(1, Math.sqrt(f.x * f.x + f.z * f.z) / 1.15),
      spinX: (rnd() - 0.5) * 1.6, spinY: (rnd() - 0.5) * 2.0,
      arc: 0.10 + rnd() * 0.14, phase: rnd() * Math.PI * 2,
    });
    scene.add(group);
  }
  function makeChip(x, z, w, d, h) {
    const g = new THREE.Group();
    addSeat(g, w, d);
    const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), chipMat);
    body.position.y = TOP_Y + 0.006 + h / 2; g.add(body);
    const top = new THREE.Mesh(new THREE.BoxGeometry(w * 0.86, 0.003, d * 0.86), chipTopMat);
    top.position.y = TOP_Y + 0.008 + h; g.add(top);
    const n = Math.max(3, Math.round(w / 0.055));
    for (let i = 0; i < n; i++) {
      const px = -w / 2 + (i + 0.5) * w / n;
      for (const s of [-1, 1]) {
        const pin = new THREE.Mesh(new THREE.BoxGeometry(w / n * 0.42, 0.006, 0.028), pinMat);
        pin.position.set(px, TOP_Y + 0.006, s * (d / 2 + 0.012)); g.add(pin);
      }
    }
    g.position.set(x, 0, z); addPart(g);
  }
  function makeHeader(x, z, rows, cols) {
    const g = new THREE.Group();
    addSeat(g, (cols - 1) * 0.072 + 0.03, (rows - 1) * 0.072 + 0.03);
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const pin = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, 0.065, 8), pinMat);
      pin.position.set(c * 0.072, TOP_Y + 0.033, r * 0.072); g.add(pin);
    }
    g.position.set(x, 0, z); addPart(g);
  }
  function makeTerminal(x, z, w) {
    const g = new THREE.Group();
    addSeat(g, w, 0.17);
    const base = new THREE.Mesh(new THREE.BoxGeometry(w, 0.1, 0.17), greenMat);
    base.position.y = TOP_Y + 0.006 + 0.05; g.add(base);
    const n = Math.max(2, Math.floor(w / 0.1));
    for (let i = 0; i < n; i++) {
      const px = -w / 2 + (i + 0.5) * w / n;
      const hole = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.026, 0.012, 12),
        new THREE.MeshStandardMaterial({ color: 0x0a0a0a }));
      hole.position.set(px, TOP_Y + 0.110, 0); g.add(hole);
      const screw = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.01, 12), metalMat);
      screw.position.set(px, TOP_Y + 0.117, 0); g.add(screw);
    }
    g.position.set(x, 0, z); addPart(g);
  }
  function makeHeatsink(x, z) {
    const g = new THREE.Group();
    addSeat(g, 0.28, 0.28);
    const base = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.02, 0.28), metalMat);
    base.position.y = TOP_Y + 0.014; g.add(base);
    for (let i = 0; i < 7; i++) {
      const fin = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.11, 0.26), metalMat);
      fin.position.set(-0.12 + i * 0.04, TOP_Y + 0.08, 0); g.add(fin);
    }
    g.position.set(x, 0, z); addPart(g);
  }
  function makeLED(x, z, color) {
    const g = new THREE.Group();
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.015, 10, 10),
      new THREE.MeshBasicMaterial({ color }));
    m.position.y = TOP_Y + 0.012; g.add(m);
    g.position.set(x, 0, z); addPart(g);
  }
  // 位置对齐 top.webp 里真实 footprints：中间主控、右侧四颗 QFP、上方电源、下方端子
  makeChip(-0.06, -0.14, 0.26, 0.26, 0.052);
  makeChip( 0.34,  0.16, 0.16, 0.16, 0.032);
  makeChip( 0.54,  0.16, 0.16, 0.16, 0.032);
  makeChip( 0.74,  0.16, 0.16, 0.16, 0.032);
  makeChip( 0.94,  0.16, 0.15, 0.15, 0.030);
  makeChip( 0.66, -0.42, 0.14, 0.14, 0.030);
  makeChip(-0.62,  0.40, 0.18, 0.18, 0.034);
  makeHeader(-1.00, -0.50, 2, 8);
  makeHeader( 1.00, -0.42, 2, 6);
  makeTerminal(-0.72, 0.50, 0.44);
  makeTerminal(-0.10, 0.56, 0.34);
  makeHeatsink( 0.24, 0.56);
  [[-1.02,0.56,0x4ade80],[-0.95,0.62,0xf87171],[-0.88,0.56,0xfbbf24],
   [0.98,0.30,0x4ade80],[1.04,0.30,0x60a5fa]].forEach(p => makeLED(p[0], p[1], p[2]));

  /* ---------- edge node + centre + data flow ---------- */
  const edgePos = new THREE.Vector3(-0.06, TOP_Y + 0.14, -0.14);
  const edgeNode = new THREE.Mesh(new THREE.SphereGeometry(0.045, 16, 16),
    new THREE.MeshBasicMaterial({ color: 0x2f9e7a, transparent: true, opacity: 0 }));
  edgeNode.position.copy(edgePos); scene.add(edgeNode);
  const halo = new THREE.Mesh(new THREE.RingGeometry(0.07, 0.095, 32),
    new THREE.MeshBasicMaterial({ color: 0x2f9e7a, side: THREE.DoubleSide, transparent: true, opacity: 0 }));
  halo.rotation.x = -Math.PI / 2; halo.position.set(edgePos.x, TOP_Y + 0.004, edgePos.z); scene.add(halo);

  // 边缘网关：单台紧凑设备 + 天线直接插在机壳上，不再像悬空的服务器塔
  const centre = new THREE.Group();
  const gwBase = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.018, 0.34),
    new THREE.MeshStandardMaterial({ color: 0x8fa59c, roughness: 0.6, metalness: 0.3, transparent: true, opacity: 0 }));
  gwBase.position.y = 0.009; centre.add(gwBase);
  const gwShell = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.11, 0.26),
    new THREE.MeshStandardMaterial({ color: 0x27323c, roughness: 0.42, metalness: 0.42, transparent: true, opacity: 0 }));
  gwShell.position.y = 0.075; centre.add(gwShell);
  const gwTop = new THREE.Mesh(new THREE.BoxGeometry(0.30, 0.006, 0.22),
    new THREE.MeshStandardMaterial({ color: 0x3c4a55, roughness: 0.5, metalness: 0.35, transparent: true, opacity: 0 }));
  gwTop.position.y = 0.133; centre.add(gwTop);
  for (let i = 0; i < 3; i++) {
    const led = new THREE.Mesh(new THREE.SphereGeometry(0.009, 8, 8),
      new THREE.MeshBasicMaterial({ color: i === 1 ? 0xd99b2b : 0x2f9e7a, transparent: true, opacity: 0 }));
    led.position.set(-0.10 + i * 0.09, 0.076, 0.134); centre.add(led);
  }
  const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.32, 8),
    new THREE.MeshStandardMaterial({ color: 0x9aa9b6, metalness: 0.65, transparent: true, opacity: 0 }));
  antenna.position.set(-0.12, 0.30, -0.09); centre.add(antenna);
  centre.position.set(1.56, 0.02, 0.08); scene.add(centre);

  const flowCurve = new THREE.QuadraticBezierCurve3(
    edgePos.clone(), new THREE.Vector3(0.80, 0.86, 0.02), new THREE.Vector3(1.56, 0.26, 0.08)
  );
  const pathMesh = new THREE.Mesh(
    new THREE.TubeGeometry(flowCurve, 48, 0.005, 6, false),
    new THREE.MeshBasicMaterial({ color: 0x2f9e7a, transparent: true, opacity: 0 })
  );
  scene.add(pathMesh);
  const particles = [];
  for (let i = 0; i < 9; i++) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.02, 10, 10),
      new THREE.MeshBasicMaterial({ color: 0x2f9e7a, transparent: true, opacity: 0 }));
    scene.add(m); particles.push({ mesh: m, t: i / 9 });
  }

  /* ---------- assembly state: 弹簧阻尼跟随 ---------- */
  let assembly = 0, targetAssembly = 0, assemblyVel = 0, focusLayer = -1, overScroll = 0, assemblyMarked = false, assemblyMarkedAt = 0;
  window.rtuSetAssembly = function (v) { targetAssembly = clamp(v, 0, 1); };
  window.rtuAssembly = function () { return assembly; };
  window.rtuTarget = function () { return targetAssembly; };
  window.rtuAssembled = function () { return assembly >= 0.90; };
  window.rtuReset = function () { targetAssembly = 0; assembly = 0; assemblyVel = 0; focusLayer = -1; overScroll = 0; assemblyMarked = false; assemblyMarkedAt = 0; };
  // 合成后点分层：把该层单独抬起展示（真正看到这一层）
  window.rtuSetLayer = function (i) {
    if (assembly < 0.90) return;
    focusLayer = clamp(i, 0, LAYERS.length - 1);
  };

  controls.enableZoom = false; // 舞台滚轮专用于拆装，镜头由程序平滑控制；仍可拖拽旋转
  stage.addEventListener('wheel', e => {
    if (!window.rtuActive) return;
    e.preventDefault(); e.stopPropagation();
    // 板子拼好之后继续下滑：累积额外滚动量，够了就关闭整张卡
    if (e.deltaY > 0 && targetAssembly >= 0.99 && assembly >= 0.90) {
      // 板子拼好、提示切换后再滑才收起，避免一次连续手势直接把卡片带走
      if (performance.now() - assemblyMarkedAt >= 320) {
        overScroll += e.deltaY;
        if (overScroll > 150 && window.rtuCloseRequest) window.rtuCloseRequest();
      }
      return;
    }
    if (e.deltaY < 0) overScroll = 0;
    const step = clamp(Math.abs(e.deltaY) / 900, 0.02, 0.11);
    targetAssembly = clamp(targetAssembly + (e.deltaY > 0 ? step : -step), 0, 1);
  }, { passive: false, capture: true });

  let touchY = null;
  stage.addEventListener('touchstart', e => { touchY = e.touches[0] ? e.touches[0].clientY : null; }, { passive: true });
  stage.addEventListener('touchmove', e => {
    if (!window.rtuActive || touchY === null) return;
    const t = e.touches[0]; if (!t) return;
    const dy = t.clientY - touchY;
    if (dy < 0) overScroll = 0;
    // 拼好之后继续下滑：累积位移，够了就关闭整张卡
    if (dy > 0 && targetAssembly >= 0.99 && assembly >= 0.90) {
      e.preventDefault(); e.stopPropagation();
      if (performance.now() - assemblyMarkedAt >= 320) {
        overScroll += dy;
        if (overScroll > 60 && window.rtuCloseRequest) window.rtuCloseRequest();
      }
      touchY = t.clientY;
      return;
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
  window.rtuActive = false;
  window.rtuResize = function () {
    camera.aspect = W() / H(); camera.updateProjectionMatrix();
    renderer.setSize(W(), H());
    if (!window.__rtuUserMoved) {
      const h = camPose(assembly);
      camera.position.set(...h.p); controls.target.set(...h.t); controls.update();
    }
  };
  window.__rtuCam = { camera, controls, scene, renderer };
  // 只在用户真正拖拽旋转时锁定镜头；装配用的滚轮不算
  renderer.domElement.addEventListener('pointerdown', e => {
    if (e.button === 0 || e.pointerType === 'touch') {
      const dx = e.movementX || 0, dy = e.movementY || 0;
      if (dx || dy) window.__rtuUserMoved = true;
    }
  });
  renderer.domElement.addEventListener('pointermove', e => {
    if (e.buttons === 1 && (e.movementX || e.movementY)) window.__rtuUserMoved = true;
  });

  // 手机端限制到约 30fps：省电降温，不降 DPR / 抗锯齿 / 纹理质量
  const MOBILE_FRAME_GAP = window.matchMedia('(max-width:760px)').matches ? 32 : 0;
  let lastDraw = 0;
  let rtuRaf = 0;
  function animate(ts) {
    if (!window.rtuActive) { rtuRaf = 0; return; }
    rtuRaf = requestAnimationFrame(animate);
    if (MOBILE_FRAME_GAP && ts && ts - lastDraw < MOBILE_FRAME_GAP) return;
    lastDraw = ts || performance.now();

    const dt = Math.min(clock.getDelta(), 0.05);
    const k = 46, c = 2 * Math.sqrt(k) * 0.92;
    assemblyVel += ((targetAssembly - assembly) * k - assemblyVel * c) * dt;
    assembly = clamp(assembly + assemblyVel * dt, 0, 1);
    if ((assembly === 0 || assembly === 1) && Math.sign(targetAssembly - assembly) !== Math.sign(assemblyVel)) assemblyVel = 0;
    if (!assemblyMarked && assembly >= 0.90) { assemblyMarked = true; assemblyMarkedAt = performance.now(); }
    if (assembly < 0.86) assemblyMarked = false;
    // 装配过程中镜头匀速跟随，用户手动拖动后不再干预
    if (!window.__rtuUserMoved) {
      const pose = camPose(assembly);
      const lerp = Math.min(1, dt * 4);
      camera.position.x += (pose.p[0] - camera.position.x) * lerp;
      camera.position.y += (pose.p[1] - camera.position.y) * lerp;
      camera.position.z += (pose.p[2] - camera.position.z) * lerp;
      controls.target.x += (pose.t[0] - controls.target.x) * lerp;
      controls.target.y += (pose.t[1] - controls.target.y) * lerp;
      controls.target.z += (pose.t[2] - controls.target.z) * lerp;
    }
    controls.update();

    const now = performance.now();
    // 层叠动作：稍早于零件落位完成，合拢后是一张整板
    const stackA = ease(clamp(assembly / 0.86, 0, 1));
    const bf = ease(clamp(assembly / 0.22, 0, 1));
    const focusOn = focusLayer >= 0 && assembly >= 0.90;
    for (let i = 0; i < layerObjs.length; i++) {
      const o = layerObjs[i];
      let y = layerY(o.L.pos, stackA);
      let op = 0.58 + 0.38 * bf;   // 炸开时也能看清每层电路图
      if (focusOn) {
        if (i === focusLayer) { y = 0.44; op = 1; }     // 抽出展示这一层
        else op *= 0.26;                                // 其余层淡出作背景
      }
      o.mesh.position.y += (y - o.mesh.position.y) * Math.min(1, dt * 7);
      o.face.opacity = op;
      rimMat.opacity = 0; // 逐层由 face 控制
    }
    rimMat.opacity = 0.62 * bf;

    const SPAN = 0.56;
    for (const p of parts) {
      const t = clamp((assembly - p.delay * 0.40) / SPAN, 0, 1);
      const e = ease(t);
      p.group.position.lerpVectors(p.explode, p.final, e);
      const arc = Math.sin(Math.PI * t) * p.arc;
      const settle = t > 0.82 ? Math.sin((t - 0.82) / 0.18 * Math.PI) * 0.012 : 0;
      p.group.position.y += arc + settle;
      p.group.rotation.x = p.spinX * Math.pow(1 - e, 1.4);
      p.group.rotation.y = p.spinY * Math.pow(1 - e, 1.4) + (t > 0.8 ? Math.sin((t - 0.8) / 0.2 * Math.PI) * 0.06 : 0);
      if (t < 1) p.group.position.y += Math.sin(now * 0.0016 + p.phase) * 0.014 * Math.pow(1 - e, 1.5);
      p.guide.material.opacity = 0.30 * Math.sin(Math.PI * t) * (1 - bf * 0.4);
    }

    const ff = ease(clamp((assembly - 0.86) / 0.14, 0, 1));
    edgeNode.material.opacity = 0.95 * ff;
    halo.material.opacity = 0.5 * ff;
    centre.children.forEach(c => { if (c.material) c.material.opacity = ff; });
    pathMesh.material.opacity = 0.28 * ff;
    edgeNode.scale.setScalar(1 + 0.18 * Math.sin(now * 0.004));
    halo.scale.setScalar(1 + 0.12 * Math.sin(now * 0.003));
    for (const p of particles) {
      p.t = (p.t + dt * 0.26) % 1;
      p.mesh.position.copy(flowCurve.getPoint(p.t));
      p.mesh.scale.setScalar(0.7 + 0.5 * Math.sin(p.t * Math.PI));
      p.mesh.material.opacity = ff * Math.sin(p.t * Math.PI) * 0.95;
    }

    renderer.render(scene, camera);
  }
  window.addEventListener('resize', () => { if (window.rtuActive) window.rtuResize(); });
  /* 只在卡片打开时跑渲染循环；关闭后彻底停掉 RAF，手机上不持续占用 GPU/CPU。 */
  window.rtuStartLoop = function () {
    loadLayerTextures();             // 首次打开才请求五层电路板贴图
    if (rtuRaf) return;
    clock.getDelta();               // 丢弃关闭期间累积的时间，避免恢复瞬间跳帧
    window.rtuActive = true;
    animate();
  };
}
