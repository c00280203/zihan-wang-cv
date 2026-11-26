/* =========================================================
   Digital-twin case study · lazy-loaded live 3D viewer
   Renders the actual delivered GLB with its six bound motion
   nodes. three.js is only downloaded the first time the card
   is opened, so the CV itself stays instant.
   ========================================================= */

const overlay  = document.getElementById('twin-overlay');
const card     = document.getElementById('twin-card');
const openBtn  = document.getElementById('twin-open');
const closeBtn = document.getElementById('twin-close');
const view     = document.getElementById('twin-view');
const loading  = document.getElementById('twin-loading');

const D2R = Math.PI / 180;
const MODEL_URL = './assets/twin/Shimen_Bucketwheel_HMI01.glb';
const WHEEL_DIR = -1;  // 局部 -Y = 实机取料转向
const BELT_DIR  = -1;  // 正速度 = 卸料方向

let THREE = null;
let scene, camera, renderer, controls, clock, modelBox;
let nodes = null, beltInfo = null, beltTex = null;
let beltCleats = [], beltDrums = [];
let modelRadius = 40;
let userMoved = false;
let inited = false, ready = false;
let raf = 0, retractTimer = 0;

/* 固定展示姿态：大车、回转、俯仰、尾车都停在一个好看的位置，
   只有斗轮和皮带极缓慢地原地运转，不会「走来走去」。 */
const state = {
  travel: 0, slew: -12, luff: 3, tripper: 4,
  wheelRpm: 2, wheelAngle: 0, beltSpeed: .3
};
/* 机构演示：一次性的回转 / 抬臂动作，播完自动回到上面的静止姿态 */
const REST = { slew: -12, luff: 3 };
let demo = null;   // { kind, t, dur, from, to }

const isOpen = () => !!overlay && overlay.getAttribute('aria-hidden') === 'false';
/* 退场动画期间仍算 isOpen，但不应再启动 3D 渲染循环 */
const isActive = () => isOpen() && !overlay.classList.contains('retracting');

/* ---------- 皮带程序纹理：1 m 节距人字纹 + 接头横带 ---------- */
function makeBeltTexture() {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 336;
  const g = c.getContext('2d');
  g.fillStyle = '#24282b'; g.fillRect(0, 0, 256, 336);
  g.strokeStyle = 'rgba(196,206,214,.5)'; g.lineWidth = 7; g.lineCap = 'butt';
  for (const o of [0, 128]) {
    g.beginPath(); g.moveTo(o + 14, 0); g.lineTo(o + 78, 336); g.stroke();
    g.beginPath(); g.moveTo(o + 70, 0); g.lineTo(o + 6, 336); g.stroke();
  }
  g.fillStyle = '#cbd5dc';
  g.fillRect(0, 0, 4.5, 336); g.fillRect(251.5, 0, 4.5, 336);
  g.fillStyle = '#8d99a3';
  for (let y = 26; y < 336; y += 46) {
    g.beginPath(); g.arc(2.2, y, 2.3, 0, 6.283); g.fill();
    g.beginPath(); g.arc(253.8, y, 2.3, 0, 6.283); g.fill();
  }
  g.fillStyle = 'rgba(14,17,19,.9)'; g.fillRect(0, 0, 256, 9); g.fillRect(0, 327, 256, 9);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 8;
  return tex;
}

function makeDrumTexture() {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 24;
  const g = c.getContext('2d');
  g.fillStyle = '#5f6b75'; g.fillRect(0, 0, 256, 24);
  g.fillStyle = '#d9e0e6';
  for (let i = 0; i < 8; i++) g.fillRect(i * 32, 0, 13, 24);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

/* 程序端补件：皮带面 UV 滚动 + 横向挡条 + 首尾滚筒。全部挂在
   boom_belt 节点下，随俯仰/回转一起运动，不改动 GLB 本身。 */
function buildBeltVisual(beltNode) {
  const bb = new THREE.Box3();
  beltNode.traverse((o) => {
    if (o.isMesh && o.geometry) { o.geometry.computeBoundingBox(); bb.union(o.geometry.boundingBox); }
  });
  if (bb.isEmpty()) return;
  const x0 = bb.min.x, x1 = bb.max.x, y0 = bb.min.y;
  const W = bb.max.y - y0, L = x1 - x0, topZ = bb.max.z;
  beltInfo = { x0, x1, y0, W, L, topZ, pitch: 1.0, travel: 0, spin: 0 };

  beltTex = makeBeltTexture();
  beltNode.traverse((o) => {
    if (!o.isMesh) return;
    const pos = o.geometry.attributes.position;
    if (!pos) return;
    const uv = new Float32Array(pos.count * 2);
    for (let i = 0; i < pos.count; i++) {
      uv[i * 2]     = (pos.getX(i) - x0) / beltInfo.pitch;
      uv[i * 2 + 1] = (pos.getY(i) - y0) / W;
    }
    o.geometry.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    o.material = new THREE.MeshStandardMaterial({
      map: beltTex, roughness: .92, metalness: 0, color: 0xffffff, side: THREE.DoubleSide
    });
  });

  const cleatGeo = new THREE.BoxGeometry(.07, W * .9, .11);
  const cleatMat = new THREE.MeshStandardMaterial({ color: 0xd3dae0, roughness: .5, metalness: .28 });
  const n = Math.max(1, Math.round(L / beltInfo.pitch));
  for (let i = 0; i < n; i++) {
    const m = new THREE.Mesh(cleatGeo, cleatMat);
    m.position.set(x0 + i * beltInfo.pitch, 0, topZ + .055);
    beltNode.add(m); beltCleats.push(m);
  }

  const r = .22, drumTex = makeDrumTexture();
  const drumMat = new THREE.MeshStandardMaterial({ map: drumTex, roughness: .45, metalness: .5 });
  for (const x of [x0 + .12, x1 - .12]) {
    const d = new THREE.Mesh(new THREE.CylinderGeometry(r, r, W * .96, 24, 1, false), drumMat);
    d.position.set(x, 0, topZ - r);
    beltNode.add(d); beltDrums.push(d);
  }
}

/* ---------- 三个预设视角：整体 / 斗轮 / 侧面 ---------- */
function viewFor(i) {
  const center = new THREE.Vector3();
  modelBox.getCenter(center);
  const vFov = camera.fov * D2R;
  const hFov = 2 * Math.atan(Math.tan(vFov / 2) * camera.aspect);
  const fit = (r, k) => r / Math.sin(Math.min(vFov, hFov) / 2) * k;

  if (i === 1 && nodes && nodes.wheel) {          // 斗轮特写：局部视角，机身延伸出画属正常
    const target = new THREE.Vector3();
    nodes.wheel.getWorldPosition(target);
    const dir = new THREE.Vector3(.52, .26, .81).normalize();
    return { pos: target.clone().add(dir.multiplyScalar(15)), target };
  }
  if (i === 2) {                                   // 侧面
    const target = center.clone();
    target.y = modelBox.min.y + (modelBox.max.y - modelBox.min.y) * .45;
    const dir = new THREE.Vector3(-.18, .30, .94).normalize();
    return { pos: target.clone().add(dir.multiplyScalar(fit(modelRadius, .8))), target };
  }
  const target = center.clone();                   // 整体（默认）
  target.y = modelBox.min.y + (modelBox.max.y - modelBox.min.y) * .45;
  const dir = new THREE.Vector3(.72, .42, .55).normalize();
  return { pos: target.clone().add(dir.multiplyScalar(fit(modelRadius, .92))), target };
}

let camTween = null;
let activeView = 0;
function applyView(i, animateCam) {
  activeView = i;
  const v = viewFor(i);
  if (animateCam && ready) {
    camTween = {
      p0: camera.position.clone(), t0: controls.target.clone(),
      p1: v.pos, t1: v.target, t: 0, dur: .9
    };
  } else {
    camTween = null;
    controls.target.copy(v.target);
    camera.position.copy(v.pos);
    controls.update();
  }
}
function resize() {
  const w = view.clientWidth, h = view.clientHeight;
  if (!w || !h || !renderer || !ready) return;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h, false);
  if (!userMoved) applyView(activeView, false);
}

/* ---------- 模型初始姿态：只设一次，之后不再移动机身 ---------- */
function applyStaticPose() {
  if (!nodes) return;
  nodes.travel.position.x = state.travel;
  nodes.slew.rotation.z   = state.slew * D2R;
  nodes.luff.rotation.y   = -state.luff * D2R;
  if (nodes.tripper) nodes.tripper.rotation.y = state.tripper * D2R;
}

/* ---------- 演示动画：点一次 → 平滑去到目标 → 平滑回到静止姿态 ---------- */
function stepDemo(dt) {
  if (!demo || !nodes) return;
  demo.t += dt;
  const k = Math.min(1, demo.t / demo.dur);
  /* 前半段从当前姿态走到目标，后半段原路返回；两端速度为 0，自然缓停 */
  const tri = k < .5 ? k * 2 : (1 - k) * 2;          // 0 → 1 → 0
  const e = .5 - Math.cos(tri * Math.PI) / 2;        // easeInOutSine
  const val = demo.from + (demo.to - demo.from) * e;
  if (demo.kind === 'slew') state.slew = val;
  else state.luff = val;
  applyStaticPose();

  if (k >= 1) {
    state.slew = REST.slew;
    state.luff = REST.luff;
    applyStaticPose();
    demo = null;
    /* 播完只停掉呼吸动画，保留点亮（on），表示当前停留在这项演示 */
    document.querySelectorAll('.twin-tags [data-demo].playing').forEach((b) => b.classList.remove('playing'));
  }
}

/* 清除列表所有点亮/演示态 */
function clearTwinSelection() {
  document.querySelectorAll('.twin-tags button').forEach((b) => b.classList.remove('on', 'playing'));
}

function startDemo(kind) {
  if (!ready || !nodes) return;
  applyView(0, true);                 // 回到整体视角，避免局部特写下动作跑出画面
  userMoved = false;
  demo = {
    kind,
    t: 0,
    dur: kind === 'slew' ? 4.6 : 3.6, // 回转幅度大，给更长时间，动作才不显急
    from: kind === 'slew' ? state.slew : state.luff,
    to:   kind === 'slew' ? 48 : 18   // 回转 48°；抬臂 18°（模型量程上限）
  };
  /* 点哪亮哪：05/04 点亮并保持，演示期间叠加呼吸动画 */
  clearTwinSelection();
  const btn = document.querySelector('.twin-tags [data-demo="' + kind + '"]');
  if (btn) btn.classList.add('on', 'playing');
}

/* ---------- 渲染循环：机身不动，仅斗轮与皮带极缓慢原地运转 ---------- */
function animate() {
  raf = requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), .1);

  stepDemo(dt);

  if (nodes) {
    state.wheelAngle = (state.wheelAngle + state.wheelRpm * 6 * dt) % 360;
    nodes.wheel.rotation.y = WHEEL_DIR * state.wheelAngle * D2R;

    if (beltInfo && state.beltSpeed !== 0) {
      const ds = BELT_DIR * state.beltSpeed * dt;
      beltInfo.travel += ds;
      beltInfo.spin   += ds / .22;
    }
    if (beltInfo) {
      const { x0, L, pitch } = beltInfo;
      for (let i = 0; i < beltCleats.length; i++) {
        const x = ((i * pitch + beltInfo.travel) % L + L) % L;
        beltCleats[i].position.x = x0 + x;
      }
      for (const d of beltDrums) d.rotation.y = beltInfo.spin;
      if (beltTex) beltTex.offset.x = -(((beltInfo.travel % pitch) + pitch) % pitch) / pitch;
    }
  }

  if (camTween) {
    camTween.t += dt;
    const k = Math.min(1, camTween.t / camTween.dur);
    const e = k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;  // easeInOutQuad
    camera.position.lerpVectors(camTween.p0, camTween.p1, e);
    controls.target.lerpVectors(camTween.t0, camTween.t1, e);
    if (k >= 1) camTween = null;
  }
  controls.update();          // 随时可拖动/旋转视角
  renderer.render(scene, camera);
}

function startLoop() {
  if (raf || !ready) return;
  clock.getDelta();           // 丢弃关闭期间累积的时间
  animate();
}
function stopLoop() {
  if (raf) { cancelAnimationFrame(raf); raf = 0; }
}

/* ---------- 懒加载：首次打开才下载 three.js 与 GLB ---------- */
async function ensureInit() {
  if (inited) return;
  inited = true;
  try {
    THREE = await import('three');
    const { GLTFLoader }   = await import('three/addons/loaders/GLTFLoader.js');
    const { OrbitControls } = await import('three/addons/controls/OrbitControls.js');

    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(45, 1, .1, 3000);
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearAlpha(0);       // 透明背景，直接透出磨砂玻璃
    view.appendChild(renderer.domElement);

    scene.add(new THREE.HemisphereLight(0xffffff, 0x8899aa, 1.25));
    const sun = new THREE.DirectionalLight(0xffffff, 1.4);
    sun.position.set(40, 60, 30);
    scene.add(sun);
    const grid = new THREE.GridHelper(180, 90, 0xbcc7d2, 0xdce3e9);
    grid.material.transparent = true;
    grid.material.opacity = .3;
    scene.add(grid);

    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = .08;
    controls.maxPolarAngle = Math.PI / 2.03;
    controls.minDistance = 8;
    controls.maxDistance = 260;
    controls.enableZoom = false;   // 滚轮留给「下滑缩回」手势，缩放用双指/触控
    controls.addEventListener('start', () => { userMoved = true; });

    clock = new THREE.Clock();
    modelBox = new THREE.Box3();

    const gltf = await new Promise((resolve, reject) => {
      new GLTFLoader().load(MODEL_URL, resolve, undefined, reject);
    });
    scene.add(gltf.scene);
    const find = (name) => gltf.scene.getObjectByName(name);
    nodes = {
      travel:  find('travel_base'),
      slew:    find('slew_platform'),
      luff:    find('luff_boom'),
      wheel:   find('bucket_wheel'),
      belt:    find('boom_belt'),
      tripper: find('tripper_lift')
    };
    if (nodes.belt) buildBeltVisual(nodes.belt);
    applyStaticPose();                 // 设定展示姿态后再取景，避免模型偏出画面
    modelBox.setFromObject(gltf.scene);
    const size = new THREE.Vector3();
    modelBox.getSize(size);
    modelRadius = size.length() / 2;

    ready = true;                       // applyView 依赖 ready
    applyView(0, false);

    if (window.ResizeObserver) new ResizeObserver(resize).observe(view);
    else window.addEventListener('resize', resize);
    resize();

    if (loading) loading.remove();
    if (isActive()) startLoop();
  } catch (err) {
    console.error('[twin] model failed to load', err);
    if (loading) loading.textContent = '3D MODEL UNAVAILABLE';
  }
}

/* ---------- 卡片开合 ---------- */
function openCard() {
  if (!overlay) return;
  clearTimeout(retractTimer);
  overlay.classList.remove('retracting');
  overlay.setAttribute('aria-hidden', 'false');
  if (window.lockPageScroll) window.lockPageScroll();
  else document.body.style.overflow = 'hidden';
  if (card) card.focus({ preventScroll: true });
  if (!inited) ensureInit();
  else if (ready) startLoop();
}

function closeCard(viaScroll) {
  if (!overlay || !isOpen() || overlay.classList.contains('retracting')) return;
  /* 收起时结束任何进行中的演示并复位，下次打开仍是静止姿态 */
  demo = null;
  state.slew = REST.slew;
  state.luff = REST.luff;
  if (nodes) applyStaticPose();
  clearTwinSelection();
  const firstView = document.querySelector('.twin-tags [data-view="0"]');
  if (firstView) firstView.classList.add('on');   // 下次打开默认 01 点亮
  /* 退出一开始即停渲染：CSS 退场照常播放，但不再持续占用 GPU/CPU。 */
  stopLoop();
  overlay.classList.add('retracting');   // CSS 负责缩小 + 淡出
  retractTimer = setTimeout(() => {
    overlay.setAttribute('aria-hidden', 'true');
    overlay.classList.remove('retracting');
    if (window.unlockPageScroll) window.unlockPageScroll();
    else document.body.style.overflow = '';
    /* 不再自动滚动到任何位置：背景在卡片打开期间被锁死，
       关闭后精确回到打开那一刻，杜绝回弹。 */
  /* 等待时间略大于退场动画时长（1.0s），确保动画播完再真正隐藏 */
  }, 1100);
}

if (openBtn)  openBtn.addEventListener('click', openCard);
if (closeBtn) closeBtn.addEventListener('click', () => closeCard());

/* 演示按钮：点一次，机构缓慢动作一次后自动复位 */
document.querySelectorAll('.twin-tags [data-demo]').forEach((el) => {
  el.addEventListener('click', () => startDemo(el.dataset.demo));
});

/* 标签 = 视角切换：点击后相机平滑飞到对应细节 */
document.querySelectorAll('.twin-tags [data-view]').forEach((el) => {
  el.addEventListener('click', () => {
    const i = parseInt(el.dataset.view, 10) || 0;
    userMoved = false;
    clearTwinSelection();
    el.classList.add('on');
    if (ready) applyView(i, true);
  });
});

if (overlay) overlay.addEventListener('click', (e) => {
  if (e.target === overlay) closeCard();
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && isOpen()) closeCard();
});

/* ---------- 一直下滑 → 卡片缩回 ----------
   只要向下滚动/滑动就收起，不必先滚到文字底部；
   模型用拖拽旋转（滚轮缩放已关闭，避免与下滑手势冲突）。 */
window.addEventListener('wheel', (e) => {
  if (!isOpen() || overlay.classList.contains('retracting')) return;
  if (e.deltaY <= 2) return;   // 只响应向下
  closeCard(true);
}, { passive: true });

if (window.installCardTouch) window.installCardTouch({
  isOpen: isOpen,
  body: function () { return card ? card.querySelector('.twin-main') : null; },
  close: function () { closeCard(true); }
});
