/* =========================================================
   Oecusse flood card · glass dialog controller
   The 3D scene lives in oecusse.js; this file owns the card.
   ========================================================= */
(function () {
  const overlay = document.getElementById('oec-overlay');
  const card    = document.getElementById('oec-card');
  const openBtn = document.getElementById('oec-open');
  const closeBtn= document.getElementById('oec-close');
  const listBtns= Array.prototype.slice.call(document.querySelectorAll('#oec-list [data-oec]'));
  const descEl  = document.getElementById('oec-desc');
  const stackEl = document.getElementById('oec-stack');
  if (!overlay || !openBtn) return;

  const STEPS = [
    {
      en: 'As interpreter for the Oecusse Reservoir Project I sat in high-level negotiations and bidding meetings, and translated a large body of water-engineering documents — designs, method statements and technical specifications. That work gave me the vocabulary to make complex engineering ideas usable in a decision room.',
      zh: '作为欧库西水库项目的翻译，我参与高层谈判与投标会议，并翻译了大量水利工程技术文档——设计文件、施工方案与技术规范。这段经历让我能把复杂工程语言转化为决策现场真正用得上的表达。',
      stack: ['Interpretation', 'Technical translation', 'Water engineering']
    },
    {
      en: 'The terrain is not invented. It is built from NASA elevation data and a satellite texture of the actual valley, matching the area surveyed by drone. Five sites — Pante Macassar, Tono Dam, Passabe, Oemanu and Quinat — are marked on the real ground so the Governor could orient himself immediately.',
      zh: '地形不是凭空画的：它基于 NASA 高程数据与真实河谷卫星影像，对应无人机航测的区域。Pante Macassar、Tono Dam、Passabe、Oemanu、Quinat 五个地点标注在真实地面上，让省长一眼就能定位。',
      stack: ['NASADEM', 'Satellite imagery', 'Drone survey', 'GIS layers']
    },
    {
      en: 'Rainfall is converted to runoff through the catchment areas of each river reach; water level then propagates downstream and spills across low ground. The blue overlay grows with the slider — 0 to 200 mm per day — so the same valley can be inspected under a normal storm and a hundred-year event.',
      zh: '降雨通过各河段的集雨面积转化为径流，水位向下游演进并漫过低洼地。蓝色淹没区随滑块变化——每天 0 到 200 毫米——同一片河谷即可在普通暴雨与百年一遇情景之间切换查看。',
      stack: ['Runoff model', 'Catchment areas', 'Inundation', 'Interactive']
    },
    {
      en: 'Built for a non-technical audience: no spreadsheets, just a terrain you can rotate and a slider you can pull. The point was to let officials see which settlements and farmland sit below the flood line, and to make that judgement in seconds rather than reading a report.',
      zh: '为不懂技术的决策者而做：没有表格，只有可以旋转的地形和可以拉动的滑块。目的是让官员直接看到哪些居民点和农田位于洪水线以下，几秒内作出判断，而不是去读一份报告。',
      stack: ['Three.js', 'Decision support', 'Visual storytelling']
    }
  ];

  let current = 0;
  let retractTimer = 0;
  const isOpen = function () { return overlay.getAttribute('aria-hidden') === 'false'; };

  function render(i, animate) {
    current = (i + STEPS.length) % STEPS.length;
    const p = STEPS[current];
    descEl.textContent = '';
    const text = document.body.classList.contains('lang-zh') ? p.zh : p.en;
    if (animate && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      const frag = document.createDocumentFragment();
      Array.prototype.slice.call(text).forEach(function (ch, k) {
        const s = document.createElement('span');
        s.textContent = ch; s.style.opacity = '0';
        s.style.transition = 'opacity .35s ease';
        s.style.transitionDelay = Math.min(k * 7, 420) + 'ms';
        frag.appendChild(s);
        requestAnimationFrame(function () { s.style.opacity = '1'; });
      });
      descEl.appendChild(frag);
    } else descEl.textContent = text;
    stackEl.textContent = '';
    p.stack.forEach(function (s) {
      const el = document.createElement('span'); el.textContent = s; stackEl.appendChild(el);
    });
    listBtns.forEach(function (b, k) { b.classList.toggle('on', k === current); });
  }

  function openCard() {
    clearTimeout(retractTimer);
    overlay.classList.remove('retracting');
    overlay.setAttribute('aria-hidden', 'false');
    if (window.lockPageScroll) window.lockPageScroll();
    else document.body.style.overflow = 'hidden';
    if (card) card.focus({ preventScroll: true });
    window.__oecUserMoved = false;      // 每次打开都恢复默认取景
    if (window.oecusseResize) requestAnimationFrame(window.oecusseResize);
    if (window.oecusseStartLoop) window.oecusseStartLoop();   // 唤醒渲染循环（内部置 active）
    render(current, false);
  }
  function closeCard() {
    if (!isOpen() || overlay.classList.contains('retracting')) return;
    window.oecusseActive = false;
    overlay.classList.add('retracting');
    retractTimer = setTimeout(function () {
      overlay.setAttribute('aria-hidden', 'true');
      overlay.classList.remove('retracting');
      if (window.unlockPageScroll) window.unlockPageScroll();
      else document.body.style.overflow = '';
    }, 1120);
  }

  openBtn.addEventListener('click', openCard);
  if (closeBtn) closeBtn.addEventListener('click', function () { closeCard(); });
  listBtns.forEach(function (b) {
    b.addEventListener('click', function () { render(parseInt(b.dataset.oec, 10) || 0, true); });
  });
  if (overlay) overlay.addEventListener('click', function (e) { if (e.target === overlay) closeCard(); });
  document.addEventListener('keydown', function (e) {
    if (!isOpen()) return;
    if (e.key === 'Escape') closeCard();
    if (e.key === 'ArrowRight') render(current + 1, true);
    if (e.key === 'ArrowLeft') render(current - 1, true);
  });
  /* 下滑：正文没滚到底就让它自然滚动；到底后继续下滑才关闭。
     滚轮缩放已在 oecusse.js 关闭，所以鼠标压在 3D 地形上也能滚正文，
     不会再出现「既看不到下面、又退不出去」的卡死。 */
  const bodyEl = card ? card.querySelector('.oec-body') : null;
  function canScrollMore() {
    if (!bodyEl) return false;
    return (bodyEl.scrollHeight - bodyEl.clientHeight - bodyEl.scrollTop) > 2;
  }
  /* 手动接管滚轮：3D 舞台的 OrbitControls 会在 canvas 上 preventDefault，
     导致浏览器默认滚动失效。这里在捕获阶段接管——没到底就手动滚正文，
     到底后继续下滑就关闭。保证鼠标压在地形上也能看到全部信息、也能退出。 */
  window.addEventListener('wheel', function (e) {
    if (!isOpen() || overlay.classList.contains('retracting')) return;
    if (!bodyEl) return;
    const dy = e.deltaY;
    if (dy > 0) {
      // 下滑：先滚正文，到底再关闭
      if (canScrollMore()) {
        e.preventDefault();
        bodyEl.scrollTop = Math.min(bodyEl.scrollTop + dy, bodyEl.scrollHeight - bodyEl.clientHeight);
      } else {
        e.preventDefault();
        closeCard();
      }
    } else if (dy < 0) {
      // 上滑：正文没回到顶就先回滚
      if (bodyEl.scrollTop > 0) {
        e.preventDefault();
        bodyEl.scrollTop = Math.max(bodyEl.scrollTop + dy, 0);
      }
    }
  }, { passive: false, capture: true });
  let lastY = null;
  window.addEventListener('touchstart', function (e) { lastY = e.touches[0] ? e.touches[0].clientY : null; }, { passive: true });
  window.addEventListener('touchmove', function (e) {
    if (!isOpen() || lastY === null) return;
    const t = e.touches[0]; if (!t) return;
    if (t.target && t.target.closest && t.target.closest('#oec-stage, #oec-rain')) { lastY = t.clientY; return; }
    if (t.clientY < lastY - 8 && !canScrollMore()) closeCard();
    lastY = t.clientY;
  }, { passive: true });

  if (window.MutationObserver) {
    let last = document.body.className;
    new MutationObserver(function () {
      if (document.body.className === last) return;
      last = document.body.className;
      if (isOpen()) render(current, false);
    }).observe(document.body, { attributes: true, attributeFilter: ['class'] });
  }

  // 地形就绪后隐藏加载层
  window.addEventListener('oecusse-ready', function () {
    const l = document.getElementById('oec-loading');
    if (l) l.classList.add('hidden');
  });
  render(0, false);
})();
