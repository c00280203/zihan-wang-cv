/* =========================================================
   TA mentorship portfolio · glass card
   Five REAL course websites built for students. Screenshots
   were captured from each app actually running locally.
   ========================================================= */
(function () {
  const overlay = document.getElementById('ta-overlay');
  const card    = document.getElementById('ta-card');
  const openBtn = document.getElementById('ta-open');
  const closeBtn= document.getElementById('ta-close');
  const shot    = document.getElementById('ta-shot');
  const descEl  = document.getElementById('ta-desc');
  const stackEl = document.getElementById('ta-stack');
  const countEl = document.getElementById('ta-count');
  const listBtns= Array.prototype.slice.call(document.querySelectorAll('.ta-list [data-ta]'));
  if (!overlay || !openBtn) return;

  const PROJECTS = [
    {
      img: './assets/ta/knowledgehub.png',
      role: 'FULL-STACK · FLASK + POSTGRESQL',
      en: 'A knowledge-point search system for four courses. Students type a question, get the exact courseware file and page where a topic is covered, and can generate AI summaries. I designed the normalized SQL schema, fuzzy + semantic search, an admin upload flow and the bilingual UI.',
      zh: '面向四门课的知识点检索系统：输入问题即可定位知识点出现在哪份课件、哪一页，并生成 AI 摘要。我设计了规范化数据库、模糊+语义搜索、管理员上传流程和双语界面。',
      stack: ['Flask', 'PostgreSQL', 'DeepSeek API', 'SQLAlchemy']
    },
    {
      img: './assets/ta/aip_analysis.png',
      role: 'DATA ANALYSIS · MACHINE LEARNING',
      en: 'Guided a student through a classification coursework: feature-space visualisation, RBF-SVM training and held-out evaluation with confusion matrices. Helped interpret the scatter structure and read the per-class errors, turning raw results into an explainable write-up.',
      zh: '辅导同学完成分类作业：特征空间可视化、RBF-SVM 训练与留出集评估（混淆矩阵）。帮他理解散点结构与各类别误差，把实验结果整理成有解释的分析。',
      stack: ['Python', 'scikit-learn', 'SVM', 'Matplotlib']
    },
    {
      img: './assets/ta/v2_student_home.png',
      role: 'FULL-STACK · FLASK + SQLITE',
      en: 'Built a coursework submission system with a student workspace: each assignment shows live deadlines, file requirements and draft/final status at a glance. I designed the requirement-validation rules, late-submission handling and the clean card-based interface.',
      zh: '开发作业提交系统的学生端：每项作业集中展示实时截止时间、文件要求与草稿/最终状态。我设计了要求校验规则、迟交处理与简洁的卡片式界面。',
      stack: ['Flask', 'SQLite', 'Validation', 'I18n']
    },
    {
      img: './assets/ta/v2_teacher_home.png',
      role: 'FULL-STACK · FLASK + SQLITE',
      en: 'The teacher side of the same system: publish assignments with structured file rules, then review submissions with automated checks and AI-assisted feedback. I built the publishing flow, review views and bilingual interface for teaching staff.',
      zh: '同一系统的教师端：按结构化文件规则发布作业，并用自动校验与 AI 辅助反馈审阅提交。我实现了发布流程、审阅视图和面向教师的双语界面。',
      stack: ['Flask', 'SQLite', 'Review Flow', 'DeepSeek']
    },
    {
      img: './assets/ta/learningweb.png',
      role: 'FRONT-END · STUDY PLANNER',
      en: 'A minimalist study-planning website: set weekly goals, check in with yourself and get guided reflections. Clean responsive layout, subtle motion and a calm interface designed to make planning feel light rather than heavy.',
      zh: '极简学习规划网站：设定每周目标、自我打卡并获得引导式反思。响应式布局、克制动效和清爽界面，让计划这件事变得轻松。',
      stack: ['HTML', 'CSS', 'JavaScript', 'UX']
    }
  ];

  // 图片在首次打开卡片时才加载：首屏不下载隐藏弹层里的截图
  const imgs = PROJECTS.map(function () {
    const im = document.createElement('img');
    im.alt = ''; im.loading = 'lazy';
    shot.appendChild(im);
    return im;
  });
  let imgsLoaded = false;
  function loadImgs() {
    if (imgsLoaded) return;
    imgsLoaded = true;
    imgs.forEach(function (im, i) { im.src = PROJECTS[i].img; });
  }

  let current = 0;
  let playing = true;
  let cycleTimer = 0;
  let retractTimer = 0;
  let savedScrollY = 0;
  let rafId = 0;

  const isOpen = function () { return overlay.getAttribute('aria-hidden') === 'false'; };

  /* ---------- 渲染某一个项目 ---------- */
  function render(i, animate) {
    current = (i + PROJECTS.length) % PROJECTS.length;
    const p = PROJECTS[current];

    imgs.forEach(function (im, k) { im.classList.toggle('show', k === current); });
    if (animate) {
      shot.classList.remove('scanning');
      void shot.offsetWidth;      // 重启动画
      shot.classList.add('scanning');
    }

    descEl.textContent = '';
    // 逐字淡入，强化"这是做出来的东西"的感觉
    const text = document.body.classList.contains('lang-zh') ? p.zh : p.en;
    if (animate && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      const frag = document.createDocumentFragment();
      const chars = Array.prototype.slice.call(text);
      chars.forEach(function (ch, k) {
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

    const roleEl = document.querySelector('.ta-role');
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
    countEl.textContent = String(current + 1).padStart(2, '0') + ' / ' + String(PROJECTS.length).padStart(2, '0');
    restartCycle();
  }

  /* ---------- 自动轮播：3 秒一张，用户交互后固定在当前页 ---------- */
  const CYCLE = 3000;
  let startedAt = 0;
  function tick(now) {
    rafId = 0;
    if (!isOpen() || !playing || overlay.classList.contains('retracting')) return;
    if (!startedAt) startedAt = now;
    const elapsed = now - startedAt;
    const k = Math.min(1, elapsed / CYCLE);
    if (k >= 1) { startedAt = now; render(current + 1, true); }
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
    // 真正钉住页面：背景不动、无回弹
    overlay.setAttribute('aria-hidden', 'false');
    if (window.lockPageScroll) window.lockPageScroll();
    else document.body.style.overflow = 'hidden';
    if (card) card.focus({ preventScroll: true });
    loadImgs();
    setPlaying(true);           // 每次打开都重新开始 2 秒自动轮播
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
      const idx = parseInt(b.dataset.ta, 10) || 0;
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

  /* 下滑收起：滚轮/触摸向下都关闭，然后回到原滚动位置 */
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

  // 语言切换时，用当前语言重渲染描述
  if (window.MutationObserver) {
    let lastLang = document.body.className;
    new MutationObserver(function () {
      if (document.body.className === lastLang) return;
      lastLang = document.body.className;
      if (isOpen()) render(current, false);
    }).observe(document.body, { attributes: true, attributeFilter: ['class'] });
  }

  // 首屏先渲染第一个项目（不触发动画）
  render(0, false);
  setPlaying(true);
})();
