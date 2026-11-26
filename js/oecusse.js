/* =========================================================
   Oecusse flood visualisation · stripped for the résumé card
   Real NASA elevation + satellite texture + GIS vector layers.
   Keeps four core interactions: rain slider, inundation,
   five drone-surveyed place labels, orbit / zoom.
   ========================================================= */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const CONFIG = {
  bbox: { west: 124.04875, east: 124.46375, south: -9.46375, north: -9.17458 },
  paths: {
    elevation: './assets/oecusse/elevation.bin',
    proximity: './assets/oecusse/river_proximity.bin',
    texture: './assets/oecusse/satellite.webp',
    boundary: './assets/oecusse/boundary__oecusse_boundary.geojson',
    rivers: './assets/oecusse/water_system__main_engineering_river.geojson',
    tributaries: './assets/oecusse/water_system__tributary_rivers.geojson',
    catchments: [
      './assets/oecusse/catchment__oemanu_catchment_left_2.geojson',
      './assets/oecusse/catchment__oemanu_catchment_left.geojson',
      './assets/oecusse/catchment__qunat_catchment_1.geojson',
      './assets/oecusse/catchment__qunat_catchment_2.geojson',
    ],
  },
  colors: { flood: 0x1e50c8, river: 0x2196F3, boundary: 0x8899bb },
  sceneScale: 1 / 35000,
  points: [
    { name: 'Pante Macassar', lon: 124.384, lat: -9.204 },
    { name: 'Tono Dam',       lon: 124.346, lat: -9.328 },
    { name: 'Passabe',        lon: 124.279, lat: -9.350 },
    { name: 'Oemanu',         lon: 124.338, lat: -9.368 },
    { name: 'Quinat',         lon: 124.423, lat: -9.295 },
  ],
  durationHours: 3,
};

const stage    = document.getElementById('oec-stage');
if (stage) {
  const scene = new THREE.Scene();
  scene.background = null;                       // 透出深色磨砂玻璃卡，不再有独立深蓝底框

  const W = () => Math.max(1, stage.clientWidth);
  const H = () => Math.max(1, stage.clientHeight);
  const camera = new THREE.PerspectiveCamera(45, W() / H(), 0.001, 2.0);
  // 斜俯视角：地形铺满画面，山体起伏、河谷与地块厚度同时可见
  camera.position.set(0.45, 0.62, 0.62);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setSize(W(), H());
  renderer.setClearAlpha(0);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;
  stage.appendChild(renderer.domElement);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 0.12, 0);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.enableZoom = false;  // 滚轮留给卡片的「先看正文、到底再下滑退出」，缩放仅靠触控双指
  controls.minDistance = 0.05;
  controls.maxDistance = 1.8;
  controls.update();
  controls.addEventListener('start', function () { window.__oecUserMoved = true; });

  const centerLon = (CONFIG.bbox.west + CONFIG.bbox.east) / 2;
  const centerLat = (CONFIG.bbox.south + CONFIG.bbox.north) / 2;
  const scaleFactor = 111320 * CONFIG.sceneScale;
  // 返回地表平面坐标 {x,y}（y 对应纬度，最终作为 Three.js 的 z）
  function lonLatToXY(lon, lat) {
    return {
      x: (lon - centerLon) * scaleFactor * Math.cos(centerLat * Math.PI / 180),
      y: (lat - centerLat) * scaleFactor,
    };
  }
  function lonLatToVec3(lon, lat, z = 0) {
    const { x, y } = lonLatToXY(lon, lat);
    return new THREE.Vector3(x, z, y);
  }

  let elevationGrid = null, proximity = null, minElev = 0, lonStep = 0, latStep = 0;
  // 高差取自原项目，保持真实地形比例（2180m → 0.33 场景单位）
  let globalGeometry = null, verticalScale = 0.00015, baseHeight = 0.1;
  let waterSurfaceMesh = null, oceanMesh = null;
  let riverSegments = [], catchments = [], ready = false;
  let floodPlane = null, floodAlphaCanvas = null, floodAlphaCtx = null, floodAlphaTex = null;

  /* ---------- 真实高程：预采样 600×600，与原项目完全一致 ---------- */
  async function loadElevation() {
    const resp = await fetch(CONFIG.paths.elevation);
    if (!resp.ok) throw new Error('elevation HTTP ' + resp.status);
    const buf = await resp.arrayBuffer();
    const view = new DataView(buf);
    const res = 600;
    const grid = [];
    let mn = Infinity, mx = -Infinity;
    for (let r = 0; r < res; r++) {
      const row = [];
      for (let c = 0; c < res; c++) {
        let e = view.getInt16((r * res + c) * 2, false);
        if (e === -32768) e = 0;
        row.push(e); mn = Math.min(mn, e); mx = Math.max(mx, e);
      }
      grid.push(row);
    }
    return { grid, min: mn, max: mx, res };
  }

  async function loadProximity() {
    const resp = await fetch(CONFIG.paths.proximity);
    if (!resp.ok) return null;
    return new Uint8Array(await resp.arrayBuffer());
  }

  function polygonArea(coords) {
    let area = 0, n = coords.length;
    for (let i = 0; i < n - 1; i++) {
      area += (coords[i+1][0] - coords[i][0]) * (coords[i+1][1] + coords[i][1]);
    }
    return Math.abs(area) / 2 * (111.32 * 111.32);
  }
  function pointInPolygon(lon, lat, poly) {
    let inside = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const xi = poly[i][0], yi = poly[i][1], xj = poly[j][0], yj = poly[j][1];
      if (((yi > lat) !== (yj > lat)) && (lon < (xj - xi) * (lat - yi) / (yj - yi) + xi)) inside = !inside;
    }
    return inside;
  }
  async function loadCatchments() {
    const list = [];
    for (const url of CONFIG.paths.catchments) {
      try {
        const data = await (await fetch(url)).json();
        for (const feat of data.features || []) {
          const g = feat.geometry; if (!g) continue;
          let coords = g.type === 'Polygon' ? g.coordinates[0]
                     : g.type === 'MultiPolygon' ? g.coordinates[0]?.[0] : null;
          if (!coords || coords.length < 4) continue;
          list.push({ coords, area: polygonArea(coords) });
        }
      } catch (_) {}
    }
    return list;
  }
  async function fetchGeoJSON(url) { return (await fetch(url)).json(); }

  function buildTerrain(elev, texture) {
    const { west, east, south, north } = CONFIG.bbox;
    const res = elev.res;
    lonStep = (east - west) / (res - 1);
    latStep = (north - south) / (res - 1);
    elevationGrid = elev.grid;
    minElev = elev.min;

    const geo = new THREE.PlaneGeometry(1, 1, res - 1, res - 1);
    const pos = geo.attributes.position, uv = geo.attributes.uv;
    for (let r = 0; r < res; r++) {
      for (let c = 0; c < res; c++) {
        const idx = r * res + c;
        const lon = west + c * lonStep, lat = south + r * latStep;
        const height = (elevationGrid[r][c] - minElev) * verticalScale + baseHeight;
        const { x, y } = lonLatToXY(lon, lat);
        pos.setXYZ(idx, x, height, y);
        uv.setXY(idx, c / (res - 1), 1 - r / (res - 1));
      }
    }
    pos.needsUpdate = true; uv.needsUpdate = true;
    geo.computeVertexNormals();
    globalGeometry = geo;

    const material = texture
      ? new THREE.MeshStandardMaterial({ map: texture, roughness: 0.4, metalness: 0, side: THREE.DoubleSide })
      : new THREE.MeshStandardMaterial({ color: 0x88aa88, roughness: 0.6, side: THREE.DoubleSide });
    scene.add(new THREE.Mesh(geo, material));
    buildTerrainBase(geo, res);
  }

  /* 让地形成为一块「有厚度的实体模型」：四周侧壁 + 底面。
     低角度斜视时能清楚看到侧面轮廓，一眼就是真 3D。 */
  function buildTerrainBase(geo, res) {
    const p = geo.attributes.position;
    const BOTTOM = 0.012;
    const verts = [];
    function ribbon(edge) {
      for (let i = 0; i < edge.length - 1; i++) {
        const a = edge[i], b = edge[i + 1];
        const ax = p.getX(a), ay = p.getY(a), az = p.getZ(a);
        const bx = p.getX(b), by = p.getY(b), bz = p.getZ(b);
        verts.push(ax, ay, az, bx, by, bz, bx, BOTTOM, bz);
        verts.push(ax, ay, az, bx, BOTTOM, bz, ax, BOTTOM, az);
      }
    }
    const south = [], north = [], west = [], east = [];
    for (let c = 0; c < res; c++) { south.push(c); north.push((res - 1) * res + c); }
    for (let r = 0; r < res; r++) { west.push(r * res); east.push(r * res + res - 1); }
    ribbon(south); ribbon(north); ribbon(west); ribbon(east);
    const sideGeo = new THREE.BufferGeometry();
    sideGeo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
    sideGeo.computeVertexNormals();
    const sideMat = new THREE.MeshStandardMaterial({
      color: 0x1d3350, roughness: 0.72, metalness: 0.08, side: THREE.DoubleSide,
    });
    scene.add(new THREE.Mesh(sideGeo, sideMat));
    const bw = (CONFIG.bbox.east - CONFIG.bbox.west) * scaleFactor * Math.cos(centerLat * Math.PI / 180);
    const bh = (CONFIG.bbox.north - CONFIG.bbox.south) * scaleFactor;
    const base = new THREE.Mesh(
      new THREE.PlaneGeometry(bw, bh),
      new THREE.MeshStandardMaterial({ color: 0x0a1422, roughness: 0.9, side: THREE.DoubleSide })
    );
    base.rotation.x = -Math.PI / 2;
    base.position.y = BOTTOM;
    scene.add(base);
  }

  function createOcean() {
    const waterSceneHeight = 0.10;
    const rows = elevationGrid.length, cols = elevationGrid[0].length;
    const canvas = document.createElement('canvas');
    canvas.width = cols; canvas.height = rows;
    const ctx = canvas.getContext('2d');
    const img = ctx.createImageData(cols, rows);
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const h = (elevationGrid[r][c] - minElev) * verticalScale + baseHeight;
      const v = h < waterSceneHeight ? 255 : 0;
      const i = (r * cols + c) * 4;
      img.data[i] = img.data[i+1] = img.data[i+2] = v; img.data[i+3] = 255;
    }
    ctx.putImageData(img, 0, 0);
    const alpha = new THREE.CanvasTexture(canvas); alpha.needsUpdate = true;
    const { west, east, south, north } = CONFIG.bbox;
    const width  = (east - west) * scaleFactor * Math.cos(centerLat * Math.PI / 180) * 1.02;
    const height = (north - south) * scaleFactor * 1.02;
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(width, height),
      new THREE.MeshBasicMaterial({ color: 0x0066aa, transparent: true, opacity: 0.4,
        side: THREE.DoubleSide, depthWrite: false, alphaMap: alpha })
    );
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(0, waterSceneHeight, 0);
    scene.add(mesh); oceanMesh = mesh;
  }

  function buildLines(data, color, height = 0.02) {
    const group = new THREE.Group();
    for (const feat of data.features || []) {
      let pts = [];
      const g = feat.geometry; if (!g) continue;
      if (g.type === 'LineString') pts = g.coordinates;
      else if (g.type === 'Polygon') pts = g.coordinates[0] || [];
      else if (g.type === 'MultiPolygon') pts = g.coordinates[0]?.[0] || [];
      const vecs = pts.map(c => lonLatToVec3(c[0], c[1], height)).filter(p => !isNaN(p.x));
      if (vecs.length < 2) continue;
      group.add(new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(vecs),
        new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.6 })
      ));
    }
    return group;
  }

  /* ---------- 地点标签：轻量屏幕投影，不依赖 CSS2DRenderer ---------- */
  const labelEls = [];
  function createLabels() {
    CONFIG.points.forEach(p => {
      const div = document.createElement('div');
      div.className = 'oec-label';
      div.textContent = p.name;
      stage.appendChild(div);
      labelEls.push({ div, pos: lonLatToVec3(p.lon, p.lat, 0.18) });
    });
  }
  function updateLabels() {
    const w = W(), h = H();
    for (const o of labelEls) {
      const v = o.pos.clone().project(camera);
      const behind = v.z > 1;
      o.div.style.display = behind ? 'none' : 'block';
      if (behind) continue;
      let x = (v.x * 0.5 + 0.5) * w, y = (-v.y * 0.5 + 0.5) * h;
      // 把标签钳制在舞台内，避免窄屏上被裁切
      const halfW = (o.div.offsetWidth || 70) / 2 + 4;
      const halfH = (o.div.offsetHeight || 22) / 2 + 4;
      x = Math.max(halfW, Math.min(w - halfW, x));
      y = Math.max(halfH, Math.min(h - halfH, y));
      o.div.style.transform = 'translate(-50%,-50%) translate(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px)';
    }
  }

  function processRiverCatchments(riverData) {
    const segs = [];
    for (const feat of riverData.features || []) {
      const coords = feat.geometry?.coordinates;
      if (!coords) continue;
      for (const line of coords) {
        if (!Array.isArray(line) || line.length < 2) continue;
        const step = Math.max(1, Math.floor(line.length / 20));
        let total = 0, count = 0;
        for (let i = 0; i < line.length; i += step) {
          for (const cat of catchments) {
            if (pointInPolygon(line[i][0], line[i][1], cat.coords)) { total += cat.area; count++; break; }
          }
        }
        segs.push({ coords: line, area_km2: count ? total / count : 0 });
      }
    }
    return segs;
  }

  function computeWaterLevels(rain) {
    if (!riverSegments.length) return 0;
    // 降雨量直接线性映射到洪水位：0mm 不淹，200mm 淹到海拔约 460m 的河谷。
    const FLOOR = 0.100, CEIL = 0.168;
    const level = FLOOR + (Math.max(0, Math.min(200, rain)) / 200) * (CEIL - FLOOR);
    riverSegments.forEach(s => { s.waterHeight = level; });
    return level;
  }

  /* ---------- 基于真实高程的水平淹没面 ----------
     水位高于某网格点地面高程时，该点被淹。用 alpha 蒙版生成
     贴合等高线的连续水面，替代原来沿河段的放射状尖刺。 */
  function buildFloodPlane() {
    const rows = elevationGrid.length, cols = elevationGrid[0].length;
    floodAlphaCanvas = document.createElement('canvas');
    floodAlphaCanvas.width = cols; floodAlphaCanvas.height = rows;
    floodAlphaCtx = floodAlphaCanvas.getContext('2d');
    floodAlphaTex = new THREE.CanvasTexture(floodAlphaCanvas);
    floodAlphaTex.minFilter = THREE.LinearFilter; floodAlphaTex.magFilter = THREE.LinearFilter;
    const { west, east, south, north } = CONFIG.bbox;
    const w = (east - west) * scaleFactor * Math.cos(centerLat * Math.PI / 180);
    const h = (north - south) * scaleFactor;
    floodPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshStandardMaterial({
        color: 0x2f7fd0, transparent: true, opacity: 0.62, side: THREE.DoubleSide,
        depthWrite: false, roughness: 0.25, metalness: 0.1,
        alphaMap: floodAlphaTex,
      })
    );
    floodPlane.rotation.x = -Math.PI / 2;
    floodPlane.position.set(0, 0, 0);
    floodPlane.renderOrder = 2;
    scene.add(floodPlane);
  }

  function updateFlood(level) {
    if (!floodPlane || !elevationGrid) return;
    floodPlane.visible = level > 0.001;
    if (!floodPlane.visible) return;
    floodPlane.position.y = level;
    const rows = elevationGrid.length, cols = elevationGrid[0].length;
    const img = floodAlphaCtx.createImageData(cols, rows);
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const idx = r * cols + c;
        const ground = (elevationGrid[r][c] - minElev) * verticalScale + baseHeight;
        // 只在河道邻域且低于水位的网格显示水面，避免灌满整片沿海低地
        const nearRiver = proximity ? proximity[idx] : 255;
        let v = 0;
        if (ground < level && nearRiver > 0) {
          const depth = Math.min(1, (level - ground) / 0.02);
          v = Math.round(255 * (0.35 + 0.65 * depth) * (nearRiver / 10));
        }
        const i = idx * 4;
        img.data[i] = img.data[i+1] = img.data[i+2] = v;
        img.data[i+3] = 255;
      }
    }
    floodAlphaCtx.putImageData(img, 0, 0);
    floodAlphaTex.needsUpdate = true;
  }

  function simulate(rain) {
    if (!ready) return;
    updateFlood(computeWaterLevels(rain));
    const el = document.getElementById('oec-rain-value');
    if (el) el.textContent = Number(rain).toFixed(1);
  }
  window.oecusseSimulate = simulate;

  function addLights() {
    scene.add(new THREE.AmbientLight(0xffffff, 0.62));
    // 侧上方主光，让山脊产生明暗对比，强化立体感
    const d = new THREE.DirectionalLight(0xffffff, 1.65); d.position.set(0.55, 0.85, 0.35); scene.add(d);
    const f = new THREE.DirectionalLight(0x88a8ff, 0.35); f.position.set(-0.4, 0.35, -0.35); scene.add(f);
  }

  async function init() {
    try {
      const [elev, prox, texture, catchData, riverData, tribData, boundary] = await Promise.all([
        loadElevation(),
        loadProximity(),
        new Promise(res => new THREE.TextureLoader().load(CONFIG.paths.texture, t => {
          t.colorSpace = THREE.SRGBColorSpace; t.needsUpdate = true;
          t.minFilter = THREE.LinearMipmapLinearFilter; t.magFilter = THREE.LinearFilter;
          res(t);
        }, undefined, () => res(null))),
        loadCatchments(), fetchGeoJSON(CONFIG.paths.rivers),
        fetchGeoJSON(CONFIG.paths.tributaries), fetchGeoJSON(CONFIG.paths.boundary),
      ]);
      catchments = catchData;
      proximity = prox;
      buildTerrain(elev, texture);
      createOcean();
      buildFloodPlane();
      scene.add(buildLines(boundary, CONFIG.colors.boundary, 0.02));
      scene.add(buildLines(riverData, CONFIG.colors.river, 0.02));
      scene.add(buildLines(tribData, 0x4a90d9, 0.02));
      riverSegments = processRiverCatchments({ features: [...(riverData.features || []), ...(tribData.features || [])] });
      createLabels();
      addLights();
      ready = true;
      const slider = document.getElementById('oec-rain');
      if (slider) {
        slider.addEventListener('input', () => simulate(parseFloat(slider.value)));
        simulate(parseFloat(slider.value));
      }
      const badge = document.getElementById('oec-status');
      if (badge) badge.textContent = 'LIVE 3D · V2';
      window.dispatchEvent(new CustomEvent('oecusse-ready'));
    } catch (err) {
      const badge = document.getElementById('oec-status');
      if (badge) badge.textContent = 'LOAD FAILED';
      console.error('Oecusse init failed:', err);
    }
  }

  let oecRaf = 0;
  function animate() {
    if (!window.oecusseActive) { oecRaf = 0; return; }
    oecRaf = requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
    updateLabels();
  }
  window.oecusseActive = false;
  window.__oecCam = { camera, controls, scene, renderer };
  window.oecusseResize = function () {
    camera.aspect = W() / H(); camera.updateProjectionMatrix();
    renderer.setSize(W(), H());
    // 窄屏（竖版舞台）把视线落点抬高一点，让地形在画面中更居中
    if (window.innerWidth <= 860 && !window.__oecUserMoved) {
      camera.position.set(0.38, 0.74, 0.80);
      controls.target.set(0, 0.14, 0);
      controls.update();
    }
  };
  /* 地形数据（卫星图 + 高程 + 河网）只在卡片首次打开时请求，
     首屏不为没人看到的 3D 场景浪费 3MB 流量与解析时间。 */
  let dataInited = false;
  /* 只在卡片打开时跑渲染循环；关闭后彻底停掉 RAF。 */
  window.oecusseStartLoop = function () {
    if (!dataInited) { dataInited = true; init(); }
    if (oecRaf) return;
    window.oecusseActive = true;
    animate();
  };
}
