/* =========================================================
   RTU glass dialog controller — one board, one short intro.
   The 3D scene (rtu.js) handles the five-layer assembly.
   ========================================================= */
(function () {
  const overlay = document.getElementById('rtu-overlay');
  const card    = document.getElementById('rtu-card');
  const openBtn = document.getElementById('rtu-open');
  const closeBtn= document.getElementById('rtu-close');
  const cueEl   = document.getElementById('rtu-cue');
  if (!overlay || !openBtn) return;

  let retractTimer = 0;
  let lastAssembled = false;
  const isOpen = function () { return overlay.getAttribute('aria-hidden') === 'false'; };

  function setCue(assembled) {
    if (!cueEl) return;
    cueEl.classList.toggle('done', assembled);
    const en = cueEl.querySelector('.en'), zh = cueEl.querySelector('.zh');
    if (en) en.textContent = assembled ? '↓ SCROLL TO CLOSE' : '↓ SCROLL TO ASSEMBLE';
    if (zh) zh.textContent = assembled ? '↓ 下滑关闭' : '↓ 下滑装配';
  }

  function openCard() {
    clearTimeout(retractTimer);
    overlay.classList.remove('retracting');
    overlay.setAttribute('aria-hidden', 'false');
    if (window.lockPageScroll) window.lockPageScroll();
    else document.body.style.overflow = 'hidden';
    if (card) card.focus({ preventScroll: true });
    window.__rtuUserMoved = false;
    lastAssembled = false;
    setCue(false);
    if (window.with3D) window.with3D('rtu', function () {
      if (window.rtuReset) window.rtuReset();
      if (window.rtuResize) requestAnimationFrame(window.rtuResize);
      if (window.rtuStartLoop) window.rtuStartLoop();
    });
    startCueWatch();
  }
  function closeCard() {
    if (!isOpen() || overlay.classList.contains('retracting')) return;
    /* 退出当下就掐掉所有帧循环；不等退场动画结束，手机立刻释放 CPU/GPU。 */
    window.rtuActive = false;
    if (cueRaf) { cancelAnimationFrame(cueRaf); cueRaf = 0; }
    overlay.classList.add('retracting');
    retractTimer = setTimeout(function () {
      overlay.setAttribute('aria-hidden', 'true');
      overlay.classList.remove('retracting');
      if (window.unlockPageScroll) window.unlockPageScroll();
      else document.body.style.overflow = '';
    }, 1120);
  }

  // 合成完成后，提示由「下滑装配」变成「已完成」
  let cueRaf = 0;
  function tickAssembly() {
    if (!isOpen() || overlay.classList.contains('retracting')) { cueRaf = 0; return; }   // 开始退出就停，不常驻
    if (window.rtuAssembly) {
      const assembled = window.rtuAssembly() >= 0.90;
      if (assembled !== lastAssembled) {
        lastAssembled = assembled;
        setCue(assembled);
      }
    }
    cueRaf = requestAnimationFrame(tickAssembly);
  }
  function startCueWatch() { if (!cueRaf) cueRaf = requestAnimationFrame(tickAssembly); }

  openBtn.addEventListener('click', openCard);
  if (closeBtn) closeBtn.addEventListener('click', function () { closeCard(); });
  if (overlay) overlay.addEventListener('click', function (e) { if (e.target === overlay) closeCard(); });
  document.addEventListener('keydown', function (e) {
    if (isOpen() && e.key === 'Escape') closeCard();
  });
  // 3D 舞台装配完成后继续下滑，由这里统一收起卡片
  window.rtuCloseRequest = closeCard;

  /* 下滑逻辑（小屏友好）：
     · 舞台内下滑 → 交给 rtu.js 做装配，不关闭；
     · 正文还有内容没看完 → 让卡片正文继续滚动，绝不关闭；
     · 正文已滚到底、用户仍在上滑 → 才关闭卡片。 */
  const bodyEl = card ? card.querySelector('.rtu-body') : null;
  function canScrollMore() {
    if (!bodyEl) return false;
    return (bodyEl.scrollHeight - bodyEl.clientHeight - bodyEl.scrollTop) > 2;
  }
  window.addEventListener('wheel', function (e) {
    if (!isOpen() || overlay.classList.contains('retracting')) return;
    if (e.target.closest && e.target.closest('#rtu-stage')) return;
    if (e.deltaY <= 2) return;
    if (canScrollMore()) return;   // 正文没到底，先让它滚
    closeCard();
  }, { passive: true });
  if (window.installCardTouch) window.installCardTouch({
    isOpen: isOpen,
    body: function () { return bodyEl; },
    skip: '#rtu-stage',
    close: closeCard
  });
})();
