/* =========================================================
   Stepper glass dialog controller — one motor, exploded/assembled.
   The 3D scene (stepper.js) handles the along-axis assembly.
   Scroll down in stage: parts assemble. Scroll up: explode.
   Once assembled, further scroll closes the card.
   ========================================================= */
(function () {
  const overlay  = document.getElementById('stepper-overlay');
  const card     = document.getElementById('stepper-card');
  const openBtn  = document.getElementById('stepper-open');
  const closeBtn = document.getElementById('stepper-close');
  const cueEl    = document.getElementById('stepper-cue');
  if (!overlay || !openBtn) return;

  let retractTimer = 0;
  let lastAssembled = false;
  const isOpen = function () { return overlay.getAttribute('aria-hidden') === 'false'; };

  function setCue(assembled) {
    if (!cueEl) return;
    cueEl.classList.toggle('done', assembled);
    const en = cueEl.querySelector('.en'), zh = cueEl.querySelector('.zh');
    if (en) en.textContent = assembled ? '↓ SCROLL TO CLOSE · SCROLL UP TO EXPLODE'
                                       : '↓ SCROLL TO ASSEMBLE · SCROLL UP TO EXPLODE';
    if (zh) zh.textContent = assembled ? '↓ 下滑关闭 · 上滑爆炸散开'
                                       : '↓ 下滑装配 · 上滑爆炸散开';
  }

  function openCard() {
    clearTimeout(retractTimer);
    overlay.classList.remove('retracting');
    overlay.setAttribute('aria-hidden', 'false');
    if (window.lockPageScroll) window.lockPageScroll();
    else document.body.style.overflow = 'hidden';
    if (card) card.focus({ preventScroll: true });
    if (window.stepperReset) window.stepperReset();
    lastAssembled = false;
    setCue(false);
    if (window.stepperResize) requestAnimationFrame(window.stepperResize);
    if (window.stepperStartLoop) window.stepperStartLoop();   // 唤醒渲染循环
    startCueWatch();
  }
  function closeCard() {
    if (!isOpen() || overlay.classList.contains('retracting')) return;
    /* 退出当下就掐掉所有帧循环；不等退场动画结束，手机立刻释放 CPU/GPU。 */
    window.stepperActive = false;
    if (cueRaf) { cancelAnimationFrame(cueRaf); cueRaf = 0; }
    overlay.classList.add('retracting');
    retractTimer = setTimeout(function () {
      overlay.setAttribute('aria-hidden', 'true');
      overlay.classList.remove('retracting');
      if (window.unlockPageScroll) window.unlockPageScroll();
      else document.body.style.overflow = '';
    }, 1120);
  }

  let cueRaf = 0;
  function tickAssembly() {
    if (!isOpen() || overlay.classList.contains('retracting')) { cueRaf = 0; return; }   // 开始退出就停，不常驻轮询
    if (window.stepperAssembly) {
      const assembled = window.stepperAssembly() >= 0.90;
      if (assembled !== lastAssembled) {
        lastAssembled = assembled;
        setCue(assembled);
      }
    }
    cueRaf = requestAnimationFrame(tickAssembly);
  }
  function startCueWatch() { if (!cueRaf) cueRaf = requestAnimationFrame(tickAssembly); }

  openBtn.addEventListener('click', openCard);
  if (closeBtn) closeBtn.addEventListener('click', closeCard);
  if (overlay) overlay.addEventListener('click', function (e) { if (e.target === overlay) closeCard(); });
  document.addEventListener('keydown', function (e) {
    if (isOpen() && e.key === 'Escape') closeCard();
  });
  window.stepperCloseRequest = closeCard;

  // Down-scroll outside the stage closes the card.
  /* 下滑：舞台内交给 3D；正文没滚到底先滚正文；到底后继续上滑才关闭。 */
  const bodyEl = card ? card.querySelector('.stepper-body') : null;
  function canScrollMore() {
    if (!bodyEl) return false;
    return (bodyEl.scrollHeight - bodyEl.clientHeight - bodyEl.scrollTop) > 2;
  }
  window.addEventListener('wheel', function (e) {
    if (!isOpen() || overlay.classList.contains('retracting')) return;
    if (e.target.closest && e.target.closest('#stepper-stage')) return;
    if (e.deltaY <= 2) return;
    if (canScrollMore()) return;
    closeCard();
  }, { passive: true });
  let lastY = null;
  window.addEventListener('touchstart', function (e) { lastY = e.touches[0] ? e.touches[0].clientY : null; }, { passive: true });
  window.addEventListener('touchmove', function (e) {
    if (!isOpen() || lastY === null) return;
    const t = e.touches[0]; if (!t) return;
    if (t.target && t.target.closest && t.target.closest('#stepper-stage')) { lastY = t.clientY; return; }
    if (t.clientY < lastY - 8 && !canScrollMore()) closeCard();
    lastY = t.clientY;
  }, { passive: true });
})();
