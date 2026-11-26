/* =========================================================
   Zihan Wang — glass CV interactions
   • 竖版工位牌随滚动退场
   • 人物玻璃相框：跟随光、3D 倾斜、点击回弹
   • 三个热点弹出卡片
   • 中英切换 / 邮箱复制 / 导航高亮 / 逐段入场
   ========================================================= */

document.body.classList.add('js');

/* ---------- 弹窗滚动锁（全局，TA / 3D 卡片共用）----------
   单纯 overflow:hidden 在桌面拦不住 wheel，背景仍会滚；关闭时再 scrollTo
   回去就产生回弹。这里双保险：
   1) html+body 设 overflow:hidden 并把 body 钉在记录的位置；
   2) 用非 passive 的 wheel/touchmove 阻止默认滚动（真正让背景不动）。
   关闭时用 scrollTo 瞬间还原到打开那一刻，无动画、无回弹。 */
window.__scrollLockCount = 0;
window.__scrollLockY = 0;
function blockScroll(e) {
  if (window.__scrollLockCount <= 0) return;
  /* 卡片打开时只锁背景页面；弹层内部正文/3D 舞台必须放行，
     否则手机上整张卡既滚不到底，也无法通过滑动操作 3D。 */
  const t = e.target;
  if (t && t.closest && t.closest('.ta-body, .twin-main, .oec-body, .rtu-body, .stepper-body, #rtu-stage, #stepper-stage, #oec-stage, #oec-rain, #twin-view, .ai-twin-chat')) return;
  e.preventDefault();
}
window.addEventListener('wheel', blockScroll, { passive: false, capture: true });
window.addEventListener('touchmove', blockScroll, { passive: false, capture: true });

window.lockPageScroll = function () {
  if (window.__scrollLockCount++ > 0) return;
  window.__scrollLockY = window.scrollY || window.pageYOffset || 0;
  document.documentElement.classList.add('scroll-locked');
  document.body.classList.add('scroll-locked');
};
window.unlockPageScroll = function () {
  if (window.__scrollLockCount <= 0) return;
  if (--window.__scrollLockCount > 0) return;
  document.documentElement.classList.remove('scroll-locked');
  document.body.classList.remove('scroll-locked');
  window.scrollTo({ top: window.__scrollLockY, behavior: 'auto' });
};

/* 统一的卡片触摸规则：手指上滑先看正文，滚到底后再上滑才关闭；
   手指下滑优先回滚正文。3D 舞台可通过 skip 选择器交给场景自己处理。 */
window.installCardTouch = function (opts) {
  const isOpen = opts.isOpen;
  const getBody = opts.body;
  const close = opts.close;
  const skip = opts.skip || null;
  let lastY = null;
  window.addEventListener('touchstart', function (e) {
    lastY = isOpen() && e.touches[0] ? e.touches[0].clientY : null;
  }, { passive: true });
  window.addEventListener('touchmove', function (e) {
    if (!isOpen() || lastY === null) return;
    const t = e.touches[0]; if (!t) return;
    if (skip && t.target && t.target.closest && t.target.closest(skip)) { lastY = t.clientY; return; }
    const dy = t.clientY - lastY;
    if (Math.abs(dy) < 2) { lastY = t.clientY; return; }
    const bodyEl = typeof getBody === 'function' ? getBody() : getBody;
    const max = bodyEl ? bodyEl.scrollHeight - bodyEl.clientHeight : 0;
    const more = max > 2;
    e.preventDefault();
    if (dy < 0) {
      if (more && bodyEl.scrollTop < max - 2) bodyEl.scrollTop = Math.min(bodyEl.scrollTop - dy, max);
      else close();
    } else if (bodyEl && bodyEl.scrollTop > 0) {
      bodyEl.scrollTop = Math.max(bodyEl.scrollTop - dy, 0);
    }
    lastY = t.clientY;
  }, { passive: false });
};

const body = document.body;
const langBtn = document.getElementById('lang-toggle');
const nameplate = document.getElementById('nameplate');
const badgeVideo = document.getElementById('badge-video');
const backMedia = document.querySelector('.back-media');
const progress = document.getElementById('progress');
const portraitFrame = document.getElementById('portrait-frame');
const portraitStage = document.getElementById('portrait-stage');
const portraitVideo = document.getElementById('portrait-video');
const cursorLight = document.getElementById('cursor-light');
const portraitCaption = document.getElementById('portrait-caption');
const card = document.getElementById('hotspot-card');
const cardTitle = document.getElementById('hotspot-title');
const cardBody = document.getElementById('hotspot-body');
const cardClose = document.getElementById('hotspot-close');
const copyTip = document.getElementById('copy-tip');

const HOTSPOTS = {
  identity: {
    en: ['WHO YOU ARE', 'Zihan Wang — a CS student who likes turning fuzzy problems into working systems. Currently an MSc AI student at XJTLU and a TA for three courses.'],
    zh: ['我是谁', '王子涵 — 喜欢把模糊问题做成能跑的系统的计算机学生。现在在西交利物浦读人工智能硕士，同时给三门课当助教。']
  },
  focus: {
    en: ['WHAT I FOCUS ON', 'Computer vision and edge AI: infrared dam inspection, water-level monitoring, and models that help people make better decisions.'],
    zh: ['我的方向', '计算机视觉与边缘 AI：大坝红外巡检、水位监测，以及帮人做更好决策的模型。']
  },
  base: {
    en: ['WHERE I AM', 'Suzhou, China — five years in Ireland before that. Comfortable switching between Chinese, English and technical work.'],
    zh: ['我在哪里', '中国苏州 — 此前在爱尔兰生活五年，能在中英文与技术工作之间自由切换。']
  }
};

/* ---------------- 语言 ---------------- */
let lang = 'en';
try { lang = localStorage.getItem('zw-cv-lang') === 'zh' ? 'zh' : 'en'; } catch (_) {}

function applyLang(next) {
  lang = next;
  body.classList.toggle('lang-en', lang === 'en');
  body.classList.toggle('lang-zh', lang === 'zh');
  document.documentElement.lang = lang === 'en' ? 'en' : 'zh-CN';
  if (langBtn) {
    langBtn.querySelector('.en').textContent = '中文';
    langBtn.querySelector('.zh').textContent = 'EN';
  }
  if (card && !card.hidden && card.dataset.key && HOTSPOTS[card.dataset.key]) {
    const t = HOTSPOTS[card.dataset.key][lang];
    cardTitle.textContent = t[0];
    cardBody.textContent = t[1];
  }
  try { localStorage.setItem('zw-cv-lang', lang); } catch (_) {}
}
applyLang(lang);

if (langBtn) langBtn.addEventListener('click', () => applyLang(lang === 'en' ? 'zh' : 'en'));

/* ---------------- 滚动：工位牌 + 进度条 ---------------- */
let ticking = false;
let userFlip = null;
let manualScrollY = 0;
function onScrollFrame() {
  const vh = window.innerHeight || 800;
  const pageOne = document.querySelector('.page-one');
  const exitSpan = pageOne ? Math.max(1, pageOne.offsetHeight - vh * 0.4) : vh * 1.1;
  const p = Math.min(1, Math.max(0, window.scrollY / exitSpan));

  /* 手动翻面只在原地有效，开始滚动后重新交给滚动控制 */
  if (userFlip !== null && Math.abs(window.scrollY - manualScrollY) > 24) userFlip = null;

  if (nameplate) {
    nameplate.style.setProperty('--p', p.toFixed(3));
    const scrollFlip = Math.min(1, Math.max(0, (p - 0.10) / 0.22));
    nameplate.style.setProperty('--flip', (userFlip === null ? scrollFlip : userFlip).toFixed(3));
    nameplate.style.pointerEvents = p > 0.85 ? 'none' : 'auto';
    nameplate.setAttribute('aria-hidden', p > 0.85 ? 'true' : 'false');
  }
  if (progress) {
    const max = document.documentElement.scrollHeight - vh;
    progress.style.width = (max > 0 ? (window.scrollY / max) * 100 : 0).toFixed(2) + '%';
  }
  ticking = false;
}
function requestScroll() {
  if (!ticking) { ticking = true; requestAnimationFrame(onScrollFrame); }
}
window.addEventListener('scroll', requestScroll, { passive: true });
window.addEventListener('resize', requestScroll);
onScrollFrame();

/* 仅点击翻转按钮：避免误触整张工牌 */
function setFlip(value) {
  userFlip = value;
  manualScrollY = window.scrollY;
  if (nameplate) nameplate.style.setProperty('--flip', value.toFixed(3));
}
const flipFront = document.getElementById('flip-front');
const flipBack = document.getElementById('flip-back');
if (flipFront) flipFront.addEventListener('click', (e) => { e.stopPropagation(); setFlip(1); });
if (flipBack) flipBack.addEventListener('click', (e) => { e.stopPropagation(); setFlip(0); });

/* ---------------- 人物：跟随光 / 倾斜 / 点击 ---------------- */
let previousCaption = '';
let captionTimer;
if (portraitStage && portraitFrame) {
  const media = portraitFrame.querySelector('video, .portrait-fallback');
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  portraitStage.addEventListener('pointermove', (e) => {
    if (reduce || e.pointerType === 'touch') return;
    const r = portraitFrame.getBoundingClientRect();
    const nx = ((e.clientX - r.left) / r.width - .5) * 2;
    const ny = ((e.clientY - r.top) / r.height - .5) * 2;
    portraitFrame.style.setProperty('--ry', (nx * 5).toFixed(2) + 'deg');
    portraitFrame.style.setProperty('--rx', (-ny * 4).toFixed(2) + 'deg');
    if (media) {
      media.style.setProperty('--tx', (nx * -7).toFixed(1) + 'px');
      media.style.setProperty('--ty', (ny * -5).toFixed(1) + 'px');
    }
    if (cursorLight) {
      cursorLight.style.setProperty('--mx', (((e.clientX - r.left) / r.width) * 100).toFixed(1) + '%');
      cursorLight.style.setProperty('--my', (((e.clientY - r.top) / r.height) * 100).toFixed(1) + '%');
    }
  }, { passive: true });

  portraitStage.addEventListener('pointerleave', () => {
    portraitFrame.style.setProperty('--ry', '0deg');
    portraitFrame.style.setProperty('--rx', '0deg');
    if (media) {
      media.style.setProperty('--tx', '0px');
      media.style.setProperty('--ty', '0px');
    }
  });

  portraitFrame.addEventListener('click', (e) => {
    if (e.target.closest('.hotspot')) return;
    portraitFrame.classList.remove('is-hello');
    void portraitFrame.offsetWidth;
    portraitFrame.classList.add('is-hello');
    if (portraitCaption) {
      const original = portraitCaption.querySelector('.en, .zh');
      if (original) {
        previousCaption = original.textContent;
        original.textContent = lang === 'en' ? 'NICE TO MEET YOU ✳' : '很高兴认识你 ✳';
        portraitCaption.classList.add('is-active');
        clearTimeout(captionTimer);
        captionTimer = setTimeout(() => {
          original.textContent = previousCaption;
          portraitCaption.classList.remove('is-active');
        }, 1800);
      }
    }
  });
}

/* ---------------- 视频回退 ----------------
   先显示同一张肖像 WebP 静态图，视频等主线程空闲后再加载；
   首次打开不再为 1MB 视频等待，画质和最终画面都不变。 */
[portraitVideo, badgeVideo].forEach((video, i) => {
  if (!video) return;
  const target = i === 0 ? portraitFrame : backMedia;
  const fallback = () => target && target.classList.add('is-fallback');
  video.addEventListener('error', fallback);
  const source = video.querySelector('source');
  if (source) source.addEventListener('error', fallback);
  setTimeout(() => { if (video.readyState < 2 && video.dataset.armed) fallback(); }, 6000);
});
function armVideos() {
  [portraitVideo, badgeVideo].forEach((video) => {
    if (!video || video.dataset.armed) return;
    video.dataset.armed = '1';
    video.play().catch(() => {});
  });
}
setTimeout(armVideos, 2500);

/* ---------------- 后台媒体：卡片打开时暂停，关闭后恢复 ----------------
   手机端视频解码是持续负载；卡片遮罩把画面盖住时继续播没有意义。
   用 aria-hidden 变化统一感知所有卡片的开关，不侵入各自的控制器。 */
function syncBackdropVideos() {
  const anyCardOpen = Array.prototype.some.call(
    document.querySelectorAll('[id$="-overlay"][aria-hidden]'),
    (el) => el.getAttribute('aria-hidden') === 'false'
  );
  [portraitVideo, badgeVideo].forEach((video) => {
    if (!video || video.dataset.armed !== '1') return;
    if (document.hidden || anyCardOpen) {
      if (!video.paused) video.pause();
    } else if (video.paused) {
      video.play().catch(() => {});
    }
  });
}
window.__syncCvVideos = syncBackdropVideos;
document.querySelectorAll('[id$="-overlay"][aria-hidden]').forEach((el) => {
  if (!window.MutationObserver) return;
  new MutationObserver(syncBackdropVideos).observe(el, {
    attributes: true, attributeFilter: ['aria-hidden']
  });
});
document.addEventListener('visibilitychange', syncBackdropVideos);
window.addEventListener('pageshow', syncBackdropVideos);
syncBackdropVideos();

/* ---------------- 热点卡片 ---------------- */
function closeCard() {
  if (!card) return;
  card.hidden = true;
  card.dataset.key = '';
  document.querySelectorAll('.hotspot.is-on').forEach((b) => b.classList.remove('is-on'));
}
document.querySelectorAll('.hotspot').forEach((btn) => {
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (!card) return;
    const key = btn.dataset.key;
    if (!card.hidden && card.dataset.key === key) { closeCard(); return; }
    const t = HOTSPOTS[key];
    if (!t) return;
    cardTitle.textContent = t[lang][0];
    cardBody.textContent = t[lang][1];
    card.dataset.key = key;
    card.hidden = false;
    document.querySelectorAll('.hotspot.is-on').forEach((b) => b.classList.remove('is-on'));
    btn.classList.add('is-on');
  });
});
if (cardClose) cardClose.addEventListener('click', closeCard);
document.addEventListener('click', (e) => {
  if (card && !card.hidden && !e.target.closest('.hotspot-card') && !e.target.closest('.hotspot')) closeCard();
});
if (card) card.addEventListener('click', (e) => e.stopPropagation());

/* ---------------- 邮箱复制 ---------------- */
document.querySelectorAll('.contact-grid a[href^="mailto:"]').forEach((a) => {
  a.addEventListener('click', (e) => {
    e.preventDefault();
    const value = a.getAttribute('href').slice(7);
    const done = () => {
      if (copyTip) copyTip.textContent = lang === 'en' ? 'COPIED TO CLIPBOARD ✓' : '已复制到剪贴板 ✓';
      setTimeout(() => { if (copyTip) copyTip.textContent = ''; }, 2600);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(value).then(done).catch(() => { location.href = a.href; });
    } else {
      location.href = a.href;
    }
  });
});

/* ---------------- 导航高亮 ---------------- */
const navLinks = Array.from(document.querySelectorAll('.nav a'));
const navObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (!entry.isIntersecting) return;
    navLinks.forEach((a) => {
      a.classList.toggle('active', a.getAttribute('href') === '#' + entry.target.id);
    });
  });
}, { rootMargin: '-35% 0px -55% 0px' });
navLinks.forEach((a) => {
  const sec = document.getElementById(a.getAttribute('href').slice(1));
  if (sec) navObserver.observe(sec);
});

/* ---------------- 逐段入场 ---------------- */
document.querySelectorAll('.block,.row,.page-two-inner').forEach((el, i) => {
  el.classList.add('reveal');
  el.style.transitionDelay = Math.min(i % 6, 4) * 60 + 'ms';
});
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (!entry.isIntersecting) return;
    entry.target.classList.add('in');
    revealObserver.unobserve(entry.target);
  });
}, { threshold: .08, rootMargin: '0px 0px -8% 0px' });
document.querySelectorAll('.reveal').forEach((el) => revealObserver.observe(el));
