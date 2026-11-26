/* =========================================================
   Tender-intelligence portfolio · glass card
   Three simulated ML figures from the Hunan bidding project.
   Interaction mirrors the mentorship card exactly.
   ========================================================= */
(function () {
  const overlay = document.getElementById('bid-overlay');
  const card    = document.getElementById('bid-card');
  const openBtn = document.getElementById('bid-open');
  const closeBtn= document.getElementById('bid-close');
  const shot    = document.getElementById('bid-shot');
  const descEl  = document.getElementById('bid-desc');
  const stackEl = document.getElementById('bid-stack');
  const countEl = document.getElementById('bid-count');
  const listBtns= Array.prototype.slice.call(document.querySelectorAll('#bid-list [data-bid]'));
  if (!overlay || !openBtn) return;

  const TYPES = [
    { en: 'Reservoirs',    zh: '水库',   all: [0.850, 0.978], win: [0.862, 0.906], winMid: 0.884, rec: 0.866 },
    { en: 'Embankments',   zh: '堤防',   all: [0.858, 0.986], win: [0.872, 0.914], winMid: 0.893, rec: 0.875 },
    { en: 'Pump stations', zh: '泵站',   all: [0.842, 0.972], win: [0.856, 0.900], winMid: 0.878, rec: 0.860 },
    { en: 'Irrigation',    zh: '灌区',   all: [0.866, 0.994], win: [0.880, 0.922], winMid: 0.901, rec: 0.883 },
    { en: 'River works',   zh: '河道',   all: [0.854, 0.982], win: [0.868, 0.910], winMid: 0.889, rec: 0.871 }
  ];

  const FIGURES = [
    {
      role: 'CRAWLER · 1,284 PROJECTS',
      en: 'Scraped every water-resource tender on the Hunan public bidding portal since machine-led tendering. Each record keeps the scoring weights, every bidder quote and the winning price. Normalising each quote against the control price reveals the bands companies actually bid in — and how those bands differ across reservoirs, embankments, pump stations, irrigation and river works.',
      zh: '爬取湖南省招标网自机器管招投标以来的全部水利项目，每条记录保留评分权重、所有公司报价与中标价。将报价按控制价归一化后，可以看出公司真实的报价区间，以及水库、堤防、泵站、灌区、河道治理这几类项目的差异。',
      stack: ['Scrapy', 'Pandas', 'Normalisation', 'EDA'],
      head: { en: ['QUOTE BANDS / 01', 'Quote bands by project type', '1,284 projects'], zh: ['报价分布 / 01', '各项目类型的报价区间', '1,284 个项目'] },
      stats: { en: [['1,284', 'projects scraped'], ['2022–26', 'machine-led era'], ['5', 'project types']], zh: [['1,284', '爬取项目'], ['2022–26', '机器管招投标'], ['5', '项目类型']] }
    },
    {
      role: 'LOGISTIC REGRESSION · P(WIN)',
      en: 'A logistic model fits the probability of winning against the quote ratio. Because the quote carries the largest weight in the score, a lower ratio lifts the win probability — the fitted curve crosses 50% around 0.93. The shaded 0.86–0.90 band is where the model expects a win probability above roughly 0.79, balancing competitiveness against an unrealistically low bid.',
      zh: '用逻辑回归拟合报价系数与中标概率的关系。由于报价在评分中权重最高，报价越低中标概率越高，拟合曲线在 0.93 附近越过 50%。图中阴影的 0.86–0.90 区间，是模型给出的中标概率约 0.79 以上的报价带，兼顾竞争力与报价过低的风险。',
      stack: ['scikit-learn', 'Logistic Regression', 'Probability', 'Curve fitting'],
      head: { en: ['LOGISTIC MODEL / 02', 'Win probability vs. quote ratio', 'P(win) fitted'], zh: ['逻辑回归 / 02', '中标概率与报价系数的关系', '拟合 P(win)'] },
      stats: { en: [['0.93', '50% win point'], ['0.86–0.90', 'sweet spot'], ['≥ 0.79', 'model P(win)']], zh: [['0.93', '50% 交叉点'], ['0.86–0.90', '推荐报价带'], ['≥ 0.79', '模型中标概率']] }
    },
    {
      role: 'DECISION SUPPORT · INSTITUTE',
      en: 'For each project category the model recommends a quote ratio, compared here with the historical winning average and the 10th–90th percentile of past wins. The suggestion sits about 1.7 points below the historical average, targeting the highest-scoring band under the five-interval rule — an estimated 18% lift in win rate.',
      zh: '针对每类项目给出建议报价系数，并与历史中标均价及历史中标的 10–90 分位区间对比。建议值比历史均价低约 1.7 个百分点，瞄准五区间规则下得分最高的报价带，预计中标率提升约 18%。',
      stack: ['Inference', 'Recommendation', 'Decision Support', 'Reporting'],
      head: { en: ['DECISION SUPPORT / 03', 'Recommended quote vs. past wins', 'model output'], zh: ['报价建议 / 03', '建议报价与历史中标对比', '模型输出'] },
      stats: { en: [['−1.7 pts', 'vs. historical mean'], ['+18%', 'est. win uplift'], ['5 / 5', 'categories']], zh: [['−1.7 点', '低于历史均价'], ['+18%', '预计中标率提升'], ['5 / 5', '项目类型']] }
    }
  ];

  function mulberry32(a) {
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      let t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  const n = v => Number(v).toFixed(1);
  const delay = ms => ' style="--d:' + ms + 'ms"';

  /* ---------- 01 报价区间：横向区间 + 散点 ---------- */
  function chartBands(zh) {
    const W = 640, H = 400, L = 116, R = 18, T = 76, B = 42;
    const x0 = 0.80, x1 = 1.02;
    const sx = v => L + (v - x0) / (x1 - x0) * (W - L - R);
    const rnd = mulberry32(31122026);
    let s = '<svg viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="xMidYMid meet" aria-hidden="true">';
    // legend
    s += '<g class="bid-fade"' + delay(0) + '>';
    s += '<rect x="330" y="18" width="292" height="44" rx="11" fill="rgba(255,255,255,.42)" stroke="rgba(255,255,255,.62)"/>';
    s += '<rect x="344" y="27" width="22" height="8" rx="4" fill="rgba(143,190,232,.55)"/><text x="374" y="35" font-size="12.5" fill="#5d6b79">' + (zh ? '全部公司报价' : 'All submitted quotes') + '</text>';
    s += '<rect x="344" y="45" width="22" height="8" rx="4" fill="rgba(240,174,124,.78)"/><text x="374" y="53" font-size="12.5" fill="#5d6b79">' + (zh ? '历史中标报价' : 'Winning quotes') + '</text>';
    s += '<circle cx="560" cy="31" r="4" fill="#fff" stroke="#d9824b" stroke-width="2"/><text x="572" y="35" font-size="12.5" fill="#5d6b79">' + (zh ? '均价' : 'Mean') + '</text>';
    s += '<circle cx="560" cy="49" r="4.5" fill="#6fae86"/><text x="572" y="53" font-size="12.5" fill="#5d6b79">' + (zh ? '建议' : 'Model') + '</text></g>';
    for (let v = 0.80; v <= 1.021; v += 0.04) {
      s += '<line x1="' + n(sx(v)) + '" y1="' + T + '" x2="' + n(sx(v)) + '" y2="' + (H - B) + '" stroke="rgba(120,135,150,.14)"/>';
      s += '<text x="' + n(sx(v)) + '" y="' + (H - B + 18) + '" text-anchor="middle" font-size="12.5" fill="#8d98a4">' + v.toFixed(2) + '</text>';
    }
    const rowH = (H - T - B) / TYPES.length;
    TYPES.forEach((t, i) => {
      const cy = T + rowH * (i + 0.5);
      const base = 80 + i * 90;
      s += '<text class="bid-fade"' + delay(base) + ' x="' + (L - 12) + '" y="' + n(cy + 4) + '" text-anchor="end" font-size="13.5" fill="#4f5b67">' + (zh ? t.zh : t.en) + '</text>';
      s += '<rect class="bid-grow"' + delay(base + 60) + ' x="' + n(sx(t.all[0])) + '" y="' + n(cy - 11) + '" width="' + n(sx(t.all[1]) - sx(t.all[0])) + '" height="22" rx="11" fill="rgba(143,190,232,.5)"/>';
      s += '<rect class="bid-grow"' + delay(base + 140) + ' x="' + n(sx(t.win[0])) + '" y="' + n(cy - 11) + '" width="' + n(sx(t.win[1]) - sx(t.win[0])) + '" height="22" rx="11" fill="rgba(240,174,124,.78)"/>';
      s += '<line class="bid-grow"' + delay(base + 220) + ' x1="' + n(sx(t.winMid)) + '" y1="' + n(cy - 14) + '" x2="' + n(sx(t.winMid)) + '" y2="' + n(cy + 14) + '" stroke="#d9824b" stroke-width="2.5" stroke-linecap="round"/>';
      for (let k = 0; k < 24; k++) {
        const q = t.all[0] + rnd() * (t.all[1] - t.all[0]);
        const won = q >= t.win[0] && q <= t.win[1];
        const dy = (rnd() - 0.5) * 30;
        s += '<circle class="bid-pop"' + delay(base + 250 + k * 9) + ' cx="' + n(sx(q)) + '" cy="' + n(cy + dy) + '" r="' + (won ? 2.2 : 1.7) + '" fill="' + (won ? '#e08a50' : '#7fa6d4') + '" fill-opacity="' + (won ? '.75' : '.42') + '"/>';
      }
    });
    s += '<text x="' + ((L + W - R) / 2) + '" y="' + (H - 4) + '" text-anchor="middle" font-size="13" fill="#8d98a4">' + (zh ? '报价系数 = 报价 / 控制价' : 'Quote ratio = bid / control price') + '</text></svg>';
    return s;
  }

  /* ---------- 02 逻辑回归：S 曲线 + 散点 ---------- */
  function chartLogistic(zh) {
    const W = 640, H = 400, L = 52, R = 18, T = 34, B = 44;
    const x0 = 0.80, x1 = 1.02;
    const sx = v => L + (v - x0) / (x1 - x0) * (W - L - R);
    const sy = p => T + (1 - p) * (H - T - B);
    const P = r => 1 / (1 + Math.exp(45 * (r - 0.93)));
    const rnd = mulberry32(20261126);
    let s = '<svg viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="xMidYMid meet" aria-hidden="true">';
    for (let p = 0; p <= 1.001; p += 0.2) {
      s += '<line x1="' + L + '" y1="' + n(sy(p)) + '" x2="' + (W - R) + '" y2="' + n(sy(p)) + '" stroke="rgba(120,135,150,.14)"/>';
      s += '<text x="' + (L - 9) + '" y="' + n(sy(p) + 3) + '" text-anchor="end" font-size="12.5" fill="#8d98a4">' + p.toFixed(1) + '</text>';
    }
    for (let v = 0.80; v <= 1.021; v += 0.04) {
      s += '<text x="' + n(sx(v)) + '" y="' + (H - B + 18) + '" text-anchor="middle" font-size="12.5" fill="#8d98a4">' + v.toFixed(2) + '</text>';
    }
    s += '<g class="bid-fade"' + delay(0) + '><rect x="' + n(sx(0.86)) + '" y="' + T + '" width="' + n(sx(0.90) - sx(0.86)) + '" height="' + (H - T - B) + '" fill="rgba(127,169,141,.16)"/>';
    s += '<line x1="' + n(sx(0.86)) + '" y1="' + T + '" x2="' + n(sx(0.86)) + '" y2="' + (H - B) + '" stroke="#7fa98d" stroke-dasharray="4 4" stroke-opacity=".7"/>';
    s += '<line x1="' + n(sx(0.90)) + '" y1="' + T + '" x2="' + n(sx(0.90)) + '" y2="' + (H - B) + '" stroke="#7fa98d" stroke-dasharray="4 4" stroke-opacity=".7"/>';
    s += '<text x="' + n((sx(0.86) + sx(0.90)) / 2) + '" y="' + (T + 17) + '" text-anchor="middle" font-size="12.5" font-weight="600" fill="#5e8c6c">' + (zh ? '推荐 0.86–0.90' : 'RECOMMENDED 0.86–0.90') + '</text></g>';
    s += '<line x1="' + L + '" y1="' + n(sy(0.5)) + '" x2="' + (W - R) + '" y2="' + n(sy(0.5)) + '" stroke="rgba(120,135,150,.35)" stroke-dasharray="3 5"/>';
    for (let k = 0; k < 110; k++) {
      const r = 0.80 + rnd() * 0.22;
      const won = rnd() < P(r);
      const p = Math.max(0.02, Math.min(0.98, P(r) + (rnd() - 0.5) * 0.17));
      s += '<circle class="bid-pop"' + delay(120 + k * 5) + ' cx="' + n(sx(r)) + '" cy="' + n(sy(p)) + '" r="' + (won ? 2.6 : 1.9) + '" fill="' + (won ? '#e08a50' : '#7fa6d4') + '" fill-opacity="' + (won ? '.68' : '.32') + '"/>';
    }
    let d = '';
    for (let r = 0.80; r <= 1.0201; r += 0.002) d += (d ? 'L' : 'M') + n(sx(r)) + ' ' + n(sy(P(r))) + ' ';
    s += '<path class="bid-draw" d="' + d + '" pathLength="1" fill="none" stroke="#3e6fa8" stroke-width="4" stroke-linecap="round"/>';
    s += '<g class="bid-pop"' + delay(900) + '><circle cx="' + n(sx(0.93)) + '" cy="' + n(sy(0.5)) + '" r="5" fill="#fff" stroke="#3e6fa8" stroke-width="2.5"/>';
    s += '<text x="' + n(sx(0.93) + 9) + '" y="' + n(sy(0.5) - 9) + '" font-size="12.5" fill="#3e6fa8">' + (zh ? 'P=50% @ 0.93' : 'P(win)=0.50 @ 0.93') + '</text></g>';
    s += '<text x="' + ((L + W - R) / 2) + '" y="' + (H - 4) + '" text-anchor="middle" font-size="13" fill="#8d98a4">' + (zh ? '报价系数 = 报价 / 控制价' : 'Quote ratio = bid / control price') + '</text>';
    s += '<text transform="translate(13 ' + ((T + H - B) / 2) + ') rotate(-90)" text-anchor="middle" font-size="13" fill="#8d98a4">P(win)</text></svg>';
    return s;
  }

  /* ---------- 03 建议报价 vs 历史中标 ---------- */
  function chartRecommend(zh) {
    const W = 640, H = 400, L = 116, R = 18, T = 66, B = 42;
    const x0 = 0.82, x1 = 0.96;
    const sx = v => L + (v - x0) / (x1 - x0) * (W - L - R);
    let s = '<svg viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="xMidYMid meet" aria-hidden="true">';
    s += '<g class="bid-fade"' + delay(0) + '><rect x="300" y="14" width="322" height="40" rx="11" fill="rgba(255,255,255,.42)" stroke="rgba(255,255,255,.62)"/>';
    s += '<circle cx="318" cy="26" r="6" fill="#fff" stroke="#6b96c9" stroke-width="2.5"/><text x="332" y="30" font-size="12.5" fill="#5d6b79">' + (zh ? '历史中标均价' : 'Historical mean') + '</text>';
    s += '<circle cx="318" cy="43" r="6.5" fill="#6fae86"/><text x="332" y="47" font-size="12.5" fill="#5d6b79">' + (zh ? '模型建议报价' : 'Model recommendation') + '</text></g>';
    for (let v = 0.82; v <= 0.961; v += 0.02) {
      s += '<line x1="' + n(sx(v)) + '" y1="' + T + '" x2="' + n(sx(v)) + '" y2="' + (H - B) + '" stroke="rgba(120,135,150,.14)"/>';
      s += '<text x="' + n(sx(v)) + '" y="' + (H - B + 18) + '" text-anchor="middle" font-size="12.5" fill="#8d98a4">' + v.toFixed(2) + '</text>';
    }
    const rowH = (H - T - B) / TYPES.length;
    TYPES.forEach((t, i) => {
      const cy = T + rowH * (i + 0.5);
      const base = 100 + i * 100;
      s += '<text class="bid-fade"' + delay(base) + ' x="' + (L - 12) + '" y="' + n(cy + 4) + '" text-anchor="end" font-size="13.5" fill="#4f5b67">' + (zh ? t.zh : t.en) + '</text>';
      s += '<line class="bid-grow"' + delay(base + 60) + ' x1="' + n(sx(t.win[0])) + '" y1="' + n(cy) + '" x2="' + n(sx(t.win[1])) + '" y2="' + n(cy) + '" stroke="rgba(156,200,239,.9)" stroke-width="8" stroke-linecap="round"/>';
      s += '<line class="bid-grow"' + delay(base + 100) + ' x1="' + n(sx(t.win[0])) + '" y1="' + n(cy - 8) + '" x2="' + n(sx(t.win[0])) + '" y2="' + n(cy + 8) + '" stroke="#7fa6d4" stroke-width="1.5"/>';
      s += '<line class="bid-grow"' + delay(base + 100) + ' x1="' + n(sx(t.win[1])) + '" y1="' + n(cy - 8) + '" x2="' + n(sx(t.win[1])) + '" y2="' + n(cy + 8) + '" stroke="#7fa6d4" stroke-width="1.5"/>';
      s += '<circle class="bid-pop"' + delay(base + 180) + ' cx="' + n(sx(t.winMid)) + '" cy="' + n(cy) + '" r="6.5" fill="rgba(255,255,255,.9)" stroke="#6b96c9" stroke-width="2.5"/>';
      s += '<circle class="bid-pop"' + delay(base + 260) + ' cx="' + n(sx(t.rec)) + '" cy="' + n(cy) + '" r="7" fill="#6fae86" stroke="#fff" stroke-width="2"/>';
      s += '<text class="bid-fade"' + delay(base + 320) + ' x="' + n(sx(t.rec) - 12) + '" y="' + n(cy - 13) + '" text-anchor="end" font-size="12.5" font-weight="600" fill="#4f8a67">' + t.rec.toFixed(3) + '</text>';
    });
    s += '<text x="' + ((L + W - R) / 2) + '" y="' + (H - 4) + '" text-anchor="middle" font-size="13" fill="#8d98a4">' + (zh ? '报价系数 = 报价 / 控制价' : 'Quote ratio = bid / control price') + '</text></svg>';
    return s;
  }

  function buildChart(i, zh) {
    const p = FIGURES[i], h = p.head[zh ? 'zh' : 'en'], st = p.stats[zh ? 'zh' : 'en'];
    const svg = [chartBands, chartLogistic, chartRecommend][i](zh);
    return '<div class="bid-chart">' +
      '<div class="bid-chart-head"><div><span class="bid-kicker">' + h[0] + '</span><h4>' + h[1] + '</h4></div><span class="bid-pill">' + h[2] + '</span></div>' +
      svg +
      '<div class="bid-chart-foot">' + st.map(x => '<div><b>' + x[0] + '</b><small>' + x[1] + '</small></div>').join('') + '</div></div>';
  }

  let current = 0;
  let playing = true;
  let rafId = 0;
  let retractTimer = 0;
  let startedAt = 0;
  const CYCLE = 3000;

  const isOpen = function () { return overlay.getAttribute('aria-hidden') === 'false'; };

  function render(i, animate) {
    current = (i + FIGURES.length) % FIGURES.length;
    const p = FIGURES[current];

    shot.innerHTML = buildChart(current, document.body.classList.contains('lang-zh'));
    if (animate && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      shot.animate(
        [{ opacity: 0.35, transform: 'translateY(10px) scale(.965)' }, { opacity: 1, transform: 'none' }],
        { duration: 520, easing: 'cubic-bezier(.2,.85,.3,1)' }
      );
    }

    descEl.textContent = '';
    const text = document.body.classList.contains('lang-zh') ? p.zh : p.en;
    if (animate && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      const frag = document.createDocumentFragment();
      Array.prototype.slice.call(text).forEach(function (ch, k) {
        const s = document.createElement('span');
        s.textContent = ch;
        s.style.opacity = '0';
        s.style.transition = 'opacity .35s ease';
        s.style.transitionDelay = Math.min(k * 7, 420) + 'ms';
        frag.appendChild(s);
        requestAnimationFrame(function () { s.style.opacity = '1'; });
      });
      descEl.appendChild(frag);
    } else {
      descEl.textContent = text;
    }

    const roleEl = document.querySelector('#bid-detail .ta-role');
    if (roleEl) {
      const ren = roleEl.querySelector('.en'), rzh = roleEl.querySelector('.zh');
      if (ren) ren.textContent = p.role;
      if (rzh) rzh.textContent = p.role;
    }
    stackEl.textContent = '';
    p.stack.forEach(function (s) {
      const el = document.createElement('span');
      el.textContent = s;
      stackEl.appendChild(el);
    });
    listBtns.forEach(function (b, k) { b.classList.toggle('on', k === current); });
    countEl.textContent = String(current + 1).padStart(2, '0') + ' / ' + String(FIGURES.length).padStart(2, '0');
    restartCycle();
  }

  /* ---------- 自动轮播：3 秒一张，用户交互后固定 ---------- */
  function tick(now) {
    rafId = 0;
    if (!isOpen() || !playing || overlay.classList.contains('retracting')) return;
    if (!startedAt) startedAt = now;
    const elapsed = now - startedAt;
    if (elapsed >= CYCLE) { startedAt = now; render(current + 1, true); }
    rafId = requestAnimationFrame(tick);
  }
  function restartCycle() {
    startedAt = 0;
    if (rafId) cancelAnimationFrame(rafId);
    rafId = 0;
    if (playing && isOpen() && !overlay.classList.contains('retracting')) {
      rafId = requestAnimationFrame(tick);
    }
  }
  function setPlaying(v) {
    playing = v;
    restartCycle();
  }

  /* ---------- 开合 ---------- */
  function openCard() {
    if (!overlay) return;
    clearTimeout(retractTimer);
    overlay.classList.remove('retracting');
    overlay.setAttribute('aria-hidden', 'false');
    if (window.lockPageScroll) window.lockPageScroll();
    else document.body.style.overflow = 'hidden';
    if (card) card.focus({ preventScroll: true });
    setPlaying(true);
    render(current, false);
    restartCycle();
  }

  function closeCard() {
    if (!overlay || !isOpen() || overlay.classList.contains('retracting')) return;
    if (rafId) { cancelAnimationFrame(rafId); rafId = 0; }
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
    b.addEventListener('click', function () {
      const idx = parseInt(b.dataset.bid, 10) || 0;
      // 点当前段落 → 恢复自动播放；点其它段落 → 切过去并固定
      if (!playing && idx === current) { setPlaying(true); return; }
      render(idx, true);
      setPlaying(false);
    });
  });

  if (overlay) overlay.addEventListener('click', function (e) {
    if (e.target === overlay) closeCard();
  });

  document.addEventListener('keydown', function (e) {
    if (!isOpen()) return;
    if (e.key === 'Escape') closeCard();
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      render(current + (e.key === 'ArrowRight' ? 1 : -1), true);
      setPlaying(false);   // 键盘切到指定页后固定，再按方向键继续切换
    }
  });

  /* 下滑收起 */
  window.addEventListener('wheel', function (e) {
    if (!isOpen() || overlay.classList.contains('retracting')) return;
    if (e.deltaY <= 2) return;
    closeCard();
  }, { passive: true });

  let lastY = null;
  window.addEventListener('touchstart', function (e) {
    lastY = e.touches[0] ? e.touches[0].clientY : null;
  }, { passive: true });
  window.addEventListener('touchmove', function (e) {
    if (!isOpen() || lastY === null) return;
    const t = e.touches[0];
    if (!t) return;
    const y = t.clientY;
    if (y < lastY - 8) closeCard();
    lastY = y;
  }, { passive: true });

  if (window.MutationObserver) {
    let lastLang = document.body.className;
    new MutationObserver(function () {
      if (document.body.className === lastLang) return;
      lastLang = document.body.className;
      if (isOpen()) render(current, false);
    }).observe(document.body, { attributes: true, attributeFilter: ['class'] });
  }

  render(0, false);
  setPlaying(true);
})();
