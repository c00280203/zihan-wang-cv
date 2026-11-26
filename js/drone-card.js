/* =========================================================
   AI + Drone · carousel card (TA-style) + simulated temperature
   probe on the infrared frame + upload local preview with GPS
   metadata -> four maps. No fake recognition, no manual coords.
   ========================================================= */
(function () {
  const overlay  = document.getElementById('drone-overlay');
  const card     = document.getElementById('drone-card');
  const openBtn  = document.getElementById('drone-open');
  const closeBtn = document.getElementById('drone-close');
  if (!overlay || !openBtn) return;

  const shot     = document.getElementById('drone-shot');
  const imgs     = shot ? Array.prototype.slice.call(shot.querySelectorAll('img[data-view]')) : [];
  const listBtns = Array.prototype.slice.call(document.querySelectorAll('#drone-list [data-drone]'));
  const roleEl   = document.getElementById('drone-role');
  const descEl   = document.getElementById('drone-desc');
  const stackEl  = document.getElementById('drone-stack');
  const countEl  = document.getElementById('drone-count');
  const probeEl  = document.getElementById('drone-probe');
  const probeVal = document.getElementById('drone-probe-val');

  const VIEWS = [
    {
      key: 'visible',
      role: 'VISIBLE LIGHT · BASELINE',
      en: 'The dam looks intact to the naked eye — seepage and piping leave almost no trace in RGB imagery. This is the problem the internship set out to solve: a completely different sensing angle.',
      zh: '肉眼看上去坝体完好——渗漏与管涌在可见光图像里几乎不留痕迹。这正是实习要解决的问题：换一个完全不同的感知角度。',
      stack: ['RGB camera', 'Human-eye baseline', 'No visible anomaly']
    },
    {
      key: 'thermal',
      role: 'THERMAL · SIMULATED TEMPERATURE FIELD',
      en: 'Infrared turns temperature into colour: the cooler seepage band stands out against the warmer surface. Click anywhere on the image to probe the simulated temperature field. This is not the lost recognition model — only the sensing principle is demonstrated here.',
      zh: '红外把温度变成颜色：更凉的渗漏带从较暖的坝面中显现。点击图中任意位置可探查模拟温度场。这里展示的是感知原理，并非已丢失的识别模型。',
      stack: ['Thermal camera', 'ΔT anomaly', 'Click to probe']
    }
  ];

  let current = 0;
  let playing = true;
  let userImage = false;       // 上传后显示本地预览，暂停轮播
  let cycleStart = 0, rafId = 0, retractTimer = 0;
  const CYCLE = 3000;
  const isOpen = function () { return overlay.getAttribute('aria-hidden') === 'false'; };
  const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- 渲染某一视图（与 TA 卡一致的逐字淡入） ---------- */
  function render(i, animate) {
    current = (i + VIEWS.length) % VIEWS.length;
    userImage = false;
    const v = VIEWS[current];
    imgs.forEach(function (im) { im.classList.toggle('show', im.getAttribute('data-view') === v.key); });
    const user = document.getElementById('drone-user-img');
    if (user) { user.hidden = true; user.classList.remove('show'); }
    hideProbe();
    if (shot && animate && !reduced) {
      shot.classList.remove('scanning'); void shot.offsetWidth; shot.classList.add('scanning');
    }
    if (roleEl) {
      const en = roleEl.querySelector('.en'), zh = roleEl.querySelector('.zh');
      if (en) en.textContent = v.role;
      if (zh) zh.textContent = v.role;
    }
    if (descEl) {
      descEl.textContent = '';
      const text = document.body.classList.contains('lang-zh') ? v.zh : v.en;
      if (animate && !reduced) {
        const frag = document.createDocumentFragment();
        Array.prototype.slice.call(text).forEach(function (ch, k) {
          const sp = document.createElement('span');
          sp.textContent = ch; sp.style.opacity = '0';
          sp.style.transition = 'opacity .35s ease';
          sp.style.transitionDelay = Math.min(k * 7, 420) + 'ms';
          frag.appendChild(sp);
          requestAnimationFrame(function () { sp.style.opacity = '1'; });
        });
        descEl.appendChild(frag);
      } else descEl.textContent = text;
    }
    if (stackEl) {
      stackEl.textContent = '';
      v.stack.forEach(function (t) {
        const el = document.createElement('span'); el.textContent = t; stackEl.appendChild(el);
      });
    }
    listBtns.forEach(function (b, k) { b.classList.toggle('on', k === current); });
    if (countEl) countEl.textContent = String(current + 1).padStart(2, '0') + ' / ' + String(VIEWS.length).padStart(2, '0');
    if (shot) shot.classList.toggle('probing', current === 1);
    updateMaps();
  }

  /* ---------- 自动轮播：3 秒，用户交互后固定 ---------- */
  function tick(now) {
    rafId = 0;
    if (!isOpen() || !playing || userImage || overlay.classList.contains('retracting')) return;
    if (!cycleStart) cycleStart = now;
    if (now - cycleStart >= CYCLE) { cycleStart = now; render(current + 1, true); }
    rafId = requestAnimationFrame(tick);
  }
  function restartCycle() {
    cycleStart = 0;
    if (rafId) cancelAnimationFrame(rafId);
    rafId = 0;
    if (playing && !userImage && isOpen() && !overlay.classList.contains('retracting')) rafId = requestAnimationFrame(tick);
  }
  function setPlaying(v) {
    playing = v;
    restartCycle();
  }

  /* ---------- 温度探针（仅红外视图，基于原图色标生成的查找表） ---------- */
  function hideProbe() {
    if (probeEl) { probeEl.classList.remove('on'); probeEl.setAttribute('aria-hidden', 'true'); }
  }
  function sampleTemp(u, v) {
    const g = window.__droneTemps;
    if (!g || !g.data) return null;
    const x = Math.max(0, Math.min(g.w - 1, Math.round(u * (g.w - 1))));
    const y = Math.max(0, Math.min(g.h - 1, Math.round(v * (g.h - 1))));
    const t = g.data[y][x];
    return typeof t === 'number' ? t : null;
  }
  function probeAt(clientX, clientY) {
    if (userImage || current !== 1 || !shot || !probeEl) return;
    const img = imgs.find(function (im) { return im.getAttribute('data-view') === 'thermal'; });
    if (!img || !img.naturalWidth) return;
    const box = shot.getBoundingClientRect();
    const scale = Math.max(box.width / img.naturalWidth, box.height / img.naturalHeight);
    const dw = img.naturalWidth * scale, dh = img.naturalHeight * scale;
    const ox = (box.width - dw) / 2, oy = (box.height - dh) / 2;
    const px = clientX - box.left - ox, py = clientY - box.top - oy;
    if (px < 0 || py < 0 || px > dw || py > dh) return;
    const t = sampleTemp(px / dw, py / dh);
    if (t == null) return;
    const x = clientX - box.left, y = clientY - box.top;
    const cross = probeEl.querySelector('.drone-probe-cross');
    cross.style.left = x + 'px'; cross.style.top = y + 'px';
    probeVal.style.left = x + 'px'; probeVal.style.top = y + 'px';
    const zh = document.body.classList.contains('lang-zh');
    const suffix = zh ? '模拟值' : 'SIMULATED';
    probeVal.innerHTML = t.toFixed(1) + '°C<small>' + suffix + '</small>';
    const ripple = document.createElement('i');
    ripple.className = 'drone-ripple';
    ripple.style.left = x + 'px'; ripple.style.top = y + 'px';
    probeEl.appendChild(ripple);
    setTimeout(function () { if (ripple.parentNode) ripple.parentNode.removeChild(ripple); }, 650);
    probeEl.classList.add('on'); probeEl.setAttribute('aria-hidden', 'false');
  }

  /* ---------- 开合 ---------- */
  function openCard() {
    clearTimeout(retractTimer);
    overlay.classList.remove('retracting');
    overlay.setAttribute('aria-hidden', 'false');
    if (window.lockPageScroll) window.lockPageScroll();
    else document.body.style.overflow = 'hidden';
    if (card) card.focus({ preventScroll: true });
    imgs.forEach(function (im) { if (im.dataset.src && !im.src) im.src = im.dataset.src; });
    setPlaying(true);
    render(0, false);
    restartCycle();
  }
  function closeCard() {
    if (!isOpen() || overlay.classList.contains('retracting')) return;
    if (rafId) { cancelAnimationFrame(rafId); rafId = 0; }
    hideProbe();
    overlay.classList.add('retracting');
    retractTimer = setTimeout(function () {
      overlay.setAttribute('aria-hidden', 'true');
      overlay.classList.remove('retracting');
      if (window.unlockPageScroll) window.unlockPageScroll();
      else document.body.style.overflow = '';
    }, 1120);
  }
  openBtn.addEventListener('click', openCard);
  if (closeBtn) closeBtn.addEventListener('click', closeCard);
  listBtns.forEach(function (b) {
    b.addEventListener('click', function () {
      const idx = parseInt(b.dataset.drone, 10) || 0;
      // 点当前段落 → 恢复自动播放（并退出本地预览）；点其它段落 → 切过去并固定
      if (!playing && idx === current) { if (userImage) render(current, false); setPlaying(true); return; }
      render(idx, true);
      setPlaying(false);
    });
  });
  if (shot) shot.addEventListener('click', function (e) {
    if (!isOpen()) return;
    if (e.target.closest && e.target.closest('.drone-probe')) return;
    probeAt(e.clientX, e.clientY);   // 测温只是瞬时查看，不改自动播放开关
  });
  if (overlay) overlay.addEventListener('click', function (e) { if (e.target === overlay) closeCard(); });
  document.addEventListener('keydown', function (e) {
    if (!isOpen()) return;
    if (e.key === 'Escape') closeCard();
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      render(current + (e.key === 'ArrowRight' ? 1 : -1), true);
      setPlaying(false);
    }
  });
  window.addEventListener('wheel', function (e) {
    if (!isOpen() || overlay.classList.contains('retracting')) return;
    if (e.deltaY <= 2) return;
    closeCard();
  }, { passive: true });
  if (window.installCardTouch) window.installCardTouch({
    isOpen: isOpen,
    body: function () { return card ? card.querySelector('.ta-body') : null; },
    close: closeCard
  });

  /* ---------- GPS → 四个地图（无手填） ---------- */
  const readout = document.getElementById('drone-readout');
  const navNote = document.getElementById('drone-nav-note');
  const mapsBox = document.getElementById('drone-maps');
  const mapLinks = Array.prototype.slice.call(document.querySelectorAll('.drone-maps a[data-map]'));
  let coords = null, lastMsg = 'none', uploadSeq = 0;

  function say(key) {
    lastMsg = key;
    if (!readout) return;
    const dict = {
      none:   ['', ''],
      reading:['Checking image metadata…', '正在读取图像元数据…'],
      noexif: ['No longitude/latitude metadata found in this image.', '这张图片里没有读到经纬度元数据。'],
      stripped:['This format or transfer often removes metadata. Coordinates are read whenever the file still contains them.', '这种格式或转发过程常会清除元数据；只要文件里确实保留了经纬度，仍可读取。'],
      exifnogps:['Image metadata found, but no longitude/latitude coordinates.', '图像有元数据，但没有经纬度坐标。'],
      unsupported:['Could not parse this image format.', '无法解析这种图像格式。'],
      bad:    ['Could not read the file.', '无法读取该文件。'],
      found:  ['Location found — open in a map:', '已读取到位置 — 在地图中打开：'],
    };
    const pair = dict[key] || dict.none;
    readout.classList.toggle('good', key === 'found');
    readout.innerHTML = '<span class="en">' + pair[0] + '</span><span class="zh">' + pair[1] + '</span>';
  }
  function updateMaps() {
    const ok = !!coords;
    const uploaded = !!userImage;   // 上传照片之前只留一句说明，不提前摆出地图按钮
    if (navNote) navNote.hidden = uploaded;
    if (mapsBox) {
      mapsBox.hidden = !uploaded;
      mapsBox.classList.toggle('ready', ok);
      mapsBox.setAttribute('aria-disabled', ok ? 'false' : 'true');
    }
    mapLinks.forEach(function (a) { a.setAttribute('aria-disabled', ok ? 'false' : 'true'); });
    if (!ok) { mapLinks.forEach(function (a) { a.style.transitionDelay = '0ms'; a.href = '#'; }); return; }
    const f = function (n) { return Number(n).toFixed(6); };
    const lat = f(coords.lat), lng = f(coords.lng);
    const name = 'Dam seepage point ' + lat + ',' + lng;
    const urls = {
      amap:   'https://uri.amap.com/marker?position=' + lng + ',' + lat + '&name=' + encodeURIComponent(name) + '&src=resume&coordinate=wgs84&callnative=0',
      baidu:  'https://api.map.baidu.com/marker?location=' + lat + ',' + lng + '&title=' + encodeURIComponent('Dam seepage point') + '&content=' + encodeURIComponent(lat + ', ' + lng) + '&output=html&coord_type=wgs84',
      google: 'https://www.google.com/maps/search/?api=1&query=' + lat + ',' + lng,
      apple:  'https://maps.apple.com/?ll=' + lat + ',' + lng + '&q=' + encodeURIComponent(name),
    };
    mapLinks.forEach(function (a, i) {
      a.style.transitionDelay = (i * 55) + 'ms';
      a.href = urls[a.getAttribute('data-map')];
    });
  }

  /* ---------- EXIF GPS reader (pure JS) ---------- */
  function readExifGps(arrayBuffer) {
    try {
      const dv = new DataView(arrayBuffer);
      if (dv.byteLength < 4 || dv.getUint16(0) !== 0xFFD8) return null;
      let off = 2;
      while (off + 4 < dv.byteLength) {
        if (dv.getUint8(off) !== 0xFF) { off++; continue; }
        const marker = dv.getUint8(off + 1);
        if (marker === 0xD8 || marker === 0x01) { off += 2; continue; }
        if (marker === 0xD9 || marker === 0xDA) break;
        const len = dv.getUint16(off + 2);
        if (marker === 0xE1 && dv.getUint32(off + 4) === 0x45786966 && dv.getUint16(off + 8) === 0x0000) return parseTiff(dv, off + 10);
        off += 2 + len;
      }
    } catch (e) { return null; }
    return null;
  }
  function parseTiff(dv, tiffStart) {
    const le = dv.getUint16(tiffStart) === 0x4949;
    const u16 = function (o) { return dv.getUint16(o, le); };
    const u32 = function (o) { return dv.getUint32(o, le); };
    if (u16(tiffStart + 2) !== 42) return null;
    const ifd0 = tiffStart + u32(tiffStart + 4);
    const n = u16(ifd0);
    let gpsOffset = 0;
    for (let i = 0; i < n; i++) {
      const e = ifd0 + 2 + i * 12;
      if (u16(e) === 0x8825) { gpsOffset = tiffStart + u32(e + 8); break; }
    }
    if (!gpsOffset) return null;
    const gn = u16(gpsOffset);
    let latRef = null, lngRef = null, lat = null, lng = null;
    const rational = function (o) { const num = u32(o), den = u32(o + 4); return den ? num / den : 0; };
    const dms = function (o, count) { let v = 0; for (let i = 0; i < count; i++) v += rational(o + i * 8) / Math.pow(60, i); return v; };
    for (let i = 0; i < gn; i++) {
      const e = gpsOffset + 2 + i * 12;
      const tag = u16(e), type = u16(e + 2), cnt = u32(e + 4), vo = e + 8;
      if (type === 2 && cnt <= 4) {
        let str = '';
        for (let k = 0; k < cnt; k++) { const c = dv.getUint8(vo + k); if (!c) break; str += String.fromCharCode(c); }
        if (tag === 1) latRef = str;
        if (tag === 3) lngRef = str;
      } else if (type === 5) {
        const p = tiffStart + u32(vo);
        if (tag === 2) lat = dms(p, cnt);
        if (tag === 4) lng = dms(p, cnt);
      }
    }
    if (lat == null || lng == null) return null;
    if (latRef === 'S') lat = -lat;
    if (lngRef === 'W') lng = -lng;
    return { lat: lat, lng: lng };
  }

  /* ---------- 通用坐标读取：HEIC / PNG / WebP / TIFF / XMP ---------- */
  let exifrPromise = null;
  function loadExifr() {
    if (window.exifr && typeof window.exifr.gps === 'function') return Promise.resolve(window.exifr);
    if (!exifrPromise) {
      exifrPromise = new Promise(function (resolve, reject) {
        const s = document.createElement('script');
        s.src = 'js/vendor/exifr.full.umd.js?v=exifv20261126';
        s.async = true;
        s.onload = function () {
          if (window.exifr && typeof window.exifr.gps === 'function') resolve(window.exifr);
          else { exifrPromise = null; reject(new Error('EXIF parser unavailable')); }
        };
        s.onerror = function () { exifrPromise = null; reject(new Error('EXIF parser failed to load')); };
        document.head.appendChild(s);
      });
    }
    return exifrPromise;
  }

  function sniffFormat(buffer, file) {
    try {
      const dv = new DataView(buffer);
      const four = function (o) {
        return [0, 1, 2, 3].map(function (i) { return String.fromCharCode(dv.getUint8(o + i)); }).join('');
      };
      if (dv.getUint8(0) === 0xFF && dv.getUint8(1) === 0xD8) return 'jpeg';
      if (four(0) === '\u0089PNG') return 'png';
      if (four(0) === 'RIFF' && four(8) === 'WEBP') return 'webp';
      if (four(4) === 'ftyp') {
        const brand = four(8);
        if (/^(avif|avis)$/.test(brand)) return 'avif';
        return 'heic';
      }
      if (four(0) === 'II*\u0000' || four(0) === 'MM\u0000*') return 'tiff';
    } catch (e) {}
    return (file && file.type ? file.type.split('/').pop() : '').toLowerCase() || 'unknown';
  }

  function webpExifOffset(buffer) {
    try {
      const dv = new DataView(buffer);
      const four = function (o) {
        return [0, 1, 2, 3].map(function (i) { return String.fromCharCode(dv.getUint8(o + i)); }).join('');
      };
      if (four(0) !== 'RIFF' || four(8) !== 'WEBP') return null;
      let off = 12;
      while (off + 8 <= dv.byteLength) {
        const type = four(off);
        const size = dv.getUint32(off + 4, true);
        const data = off + 8;
        if (data + size > dv.byteLength) break;
        if (type === 'EXIF') {
          let p = data;
          if (dv.getUint32(p, false) === 0x45786966 && dv.getUint16(p + 4, false) === 0) p += 6;
          return p;
        }
        off = data + size + (size % 2);
      }
    } catch (e) {}
    return null;
  }

  function webpXmpText(buffer) {
    try {
      const dv = new DataView(buffer);
      const four = function (o) {
        return [0, 1, 2, 3].map(function (i) { return String.fromCharCode(dv.getUint8(o + i)); }).join('');
      };
      if (four(0) !== 'RIFF' || four(8) !== 'WEBP') return null;
      let off = 12;
      while (off + 8 <= dv.byteLength) {
        const type = four(off);
        const size = dv.getUint32(off + 4, true);
        const data = off + 8;
        if (data + size > dv.byteLength) break;
        if (type === 'XMP ') {
          let text = '';
          for (let i = 0; i < size; i++) text += String.fromCharCode(dv.getUint8(data + i));
          return text;
        }
        off = data + size + (size % 2);
      }
    } catch (e) {}
    return null;
  }

  function xmpValue(text, tag) {
    if (!text) return null;
    let m = new RegExp('(?:[\\w.-]+:)?' + tag + '\\s*=\\s*(["\'])(.*?)\\1', 'i').exec(text);
    if (m) return m[2];
    m = new RegExp('<(?:[\\w.-]+:)?' + tag + '\\s*>([^<]+)</(?:[\\w.-]+:)?' + tag + '\\s*>', 'i').exec(text);
    return m ? m[1] : null;
  }

  function coordsFromXmp(text) {
    if (!text) return null;
    const latRaw = xmpValue(text, 'GPSLatitude') || xmpValue(text, 'latitude');
    const lngRaw = xmpValue(text, 'GPSLongitude') || xmpValue(text, 'longitude');
    let lat = coordinateNumber(latRaw), lng = coordinateNumber(lngRaw);
    const latRef = xmpValue(text, 'GPSLatitudeRef'), lngRef = xmpValue(text, 'GPSLongitudeRef');
    if (latRef && /S/i.test(latRef)) lat = -Math.abs(lat);
    if (lngRef && /W/i.test(lngRef)) lng = -Math.abs(lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
    return { lat: lat, lng: lng };
  }

  function coordinateNumber(v) {
    if (v == null || v === '') return NaN;
    if (Array.isArray(v)) {
      if (!v.length) return NaN;
      if (v.length === 1) return Number(v[0]);
      let n = 0;
      for (let i = 0; i < v.length; i++) n += Number(v[i]) / Math.pow(60, i);
      return n;
    }
    if (typeof v === 'string') {
      const parts = v.match(/-?\d+(?:\.\d+)?/g);
      if (!parts || !parts.length) return NaN;
      let n = parts.length === 1 ? Number(parts[0]) : 0;
      if (parts.length > 1) for (let i = 0; i < parts.length; i++) n += Number(parts[i]) / Math.pow(60, i);
      if (/[SW]/i.test(v)) n = -Math.abs(n);
      return n;
    }
    return Number(v);
  }

  function pickCoord(obj, names) {
    for (let i = 0; i < names.length; i++) {
      if (obj && obj[names[i]] != null && obj[names[i]] !== '') return obj[names[i]];
    }
    return null;
  }

  function coordsFromMeta(meta) {
    if (!meta) return null;
    let latRaw = pickCoord(meta, ['latitude', 'GPSLatitude', 'GPS:Latitude', 'GPSLatitudeDecimal', 'lat']);
    let lngRaw = pickCoord(meta, ['longitude', 'GPSLongitude', 'GPS:Longitude', 'GPSLongitudeDecimal', 'lng', 'lon']);
    if ((latRaw == null || lngRaw == null) && meta.GPS && typeof meta.GPS === 'object') {
      if (latRaw == null) latRaw = pickCoord(meta.GPS, ['latitude', 'Latitude', 'GPSLatitude']);
      if (lngRaw == null) lngRaw = pickCoord(meta.GPS, ['longitude', 'Longitude', 'GPSLongitude']);
    }
    let lat = coordinateNumber(latRaw), lng = coordinateNumber(lngRaw);
    const latRef = pickCoord(meta, ['GPSLatitudeRef', 'GPS:LatitudeRef', 'latRef']);
    const lngRef = pickCoord(meta, ['GPSLongitudeRef', 'GPS:LongitudeRef', 'lngRef']);
    if (latRef && /S/i.test(String(latRef))) lat = -Math.abs(lat);
    if (lngRef && /W/i.test(String(lngRef))) lng = -Math.abs(lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
    return { lat: lat, lng: lng };
  }

  async function readLocation(file, buffer) {
    const native = readExifGps(buffer);
    if (native) return { coords: native };

    const webpTiff = webpExifOffset(buffer);
    if (webpTiff != null) {
      try {
        const webpCoords = parseTiff(new DataView(buffer), webpTiff);
        if (webpCoords) return { coords: webpCoords };
      } catch (e) {}
    }
    const webpXmp = webpXmpText(buffer);
    if (webpXmp) {
      const webpCoords = coordsFromXmp(webpXmp);
      if (webpCoords) return { coords: webpCoords };
    }

    const exifr = await loadExifr();
    let gps = null;
    try { gps = await exifr.gps(buffer); } catch (e) {}
    if (gps && Number.isFinite(Number(gps.latitude)) && Number.isFinite(Number(gps.longitude))) {
      return { coords: { lat: Number(gps.latitude), lng: Number(gps.longitude) } };
    }

    let meta = null;
    try {
      meta = await exifr.parse(buffer, { tiff: true, xmp: true, iptc: false, jfif: false, ihdr: false });
    } catch (e) {}
    const metaCoords = coordsFromMeta(meta);
    if (metaCoords) return { coords: metaCoords };

    return {
      coords: null,
      fmt: sniffFormat(buffer, file),
      hasMeta: !!(meta && Object.keys(meta).length) || webpTiff != null || !!webpXmp
    };
  }

  /* ---------- 上传：本地预览 + 读坐标 ---------- */
  const fileInput = document.getElementById('drone-file');
  if (fileInput) fileInput.addEventListener('change', function () {
    const f = fileInput.files && fileInput.files[0];
    if (!f) return;
    const seq = ++uploadSeq;
    coords = null; updateMaps(); say('reading');
    const user = document.getElementById('drone-user-img');
    const url = URL.createObjectURL(f);
    if (user) {
      if (user.dataset.url) URL.revokeObjectURL(user.dataset.url);
      user.dataset.url = url;
      user.src = url; user.hidden = false;
      imgs.forEach(function (im) { im.classList.remove('show'); });
      requestAnimationFrame(function () { user.classList.add('show'); });
    }
    userImage = true; hideProbe(); setPlaying(false);
    if (roleEl) {
      const zh = document.body.classList.contains('lang-zh');
      const en = roleEl.querySelector('.en'), rzh = roleEl.querySelector('.zh');
      if (en) en.textContent = zh ? 'YOUR IMAGE · LOCAL PREVIEW' : 'YOUR IMAGE · LOCAL PREVIEW';
      if (rzh) rzh.textContent = '你的图像 · 本地预览';
    }
    if (descEl) {
      const zh = document.body.classList.contains('lang-zh');
      descEl.textContent = zh
        ? '图像只在你的浏览器里预览，不会上传。只要文件里保留经纬度，下方地图按钮就会亮起。'
        : 'Your image previews locally and is never uploaded. Map links light up whenever the file keeps its coordinates.';
    }
    if (stackEl) stackEl.textContent = '';
    listBtns.forEach(function (b) { b.classList.remove('on'); });
    if (countEl) countEl.textContent = '— / 02';
    if (shot) shot.classList.remove('probing');
    const reader = new FileReader();
    reader.onload = function () {
      if (seq !== uploadSeq) return;
      readLocation(f, reader.result).then(function (result) {
        if (seq !== uploadSeq) return;
        if (result.coords) {
          coords = result.coords;
          say('found');
        } else if (result.hasMeta) {
          say('exifnogps');
        } else if (/^(heic|heif|avif|png|webp)$/.test(result.fmt)) {
          say('stripped');
        } else {
          say('noexif');
        }
        updateMaps();
      }).catch(function (err) {
        if (seq !== uploadSeq) return;
        console.warn('Location read failed', err);
        say('unsupported');
        updateMaps();
      });
    };
    reader.onerror = function () { if (seq === uploadSeq) say('bad'); };
    reader.readAsArrayBuffer(f);
  });

  /* ---------- 语言切换 ---------- */
  if (window.MutationObserver) {
    let last = document.body.className;
    new MutationObserver(function () {
      if (document.body.className === last) return;
      last = document.body.className;
      if (isOpen()) {
        if (userImage) {
          const zh = document.body.classList.contains('lang-zh');
          if (descEl) descEl.textContent = zh
            ? '图像只在你的浏览器里预览，不会上传。只要文件里保留经纬度，下方地图按钮就会亮起。'
            : 'Your image previews locally and is never uploaded. Map links light up whenever the file keeps its coordinates.';
          if (probeVal) probeVal.innerHTML = (zh ? '模拟值' : 'SIMULATED');
        } else render(current, false);
        say(lastMsg);
      }
    }).observe(document.body, { attributes: true, attributeFilter: ['class'] });
  }

  say('none');
  updateMaps();
  render(0, false);
  setPlaying(true);
})();
