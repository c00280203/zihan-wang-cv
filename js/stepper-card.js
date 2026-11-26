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
  const statusEl = document.getElementById('stepper-status');
  if (!overlay || !openBtn) return;

  let retractTimer = 0;
  let lastAssembled = false;
  const isOpen = function () { return overlay.getAttribute('aria-hidden') === 'false'; };
  const isPhone = function () { return window.matchMedia('(max-width:760px)').matches; };

  /* 手机上装配完成后，卡片只留 3D 舞台 —— 它本身就是一台完整步进电机。 */
  function setFullView(on) {
    if (!card) return;
    card.classList.toggle('fullview', !!on);
    if (statusEl) statusEl.textContent = on ? 'MOTOR · ASSEMBLED' : 'LIVE 3D';
    if (window.stepperResize) requestAnimationFrame(window.stepperResize);
  }

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
    lastAssembled = false;
    setCue(false);
    setFullView(false);
    if (window.with3D) window.with3D('stepper', function () {
      if (window.stepperReset) window.stepperReset();
      if (window.stepperResize) requestAnimationFrame(window.stepperResize);
      if (window.stepperStartLoop) window.stepperStartLoop();
    });
    startCueWatch();
  }
  function closeCard() {
    if (!isOpen() || overlay.classList.contains('retracting')) return;
    /* 退出当下就掐掉所有帧循环；不等退场动画结束，手机立刻释放 CPU/GPU。 */
    window.stepperActive = false;
    if (cueRaf) { cancelAnimationFrame(cueRaf); cueRaf = 0; }
    setFullView(false);
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
      const a = window.stepperAssembly();
      const assembled = a >= 0.90;
      if (assembled !== lastAssembled) {
        lastAssembled = assembled;
        setCue(assembled);
        if (isPhone()) setFullView(assembled);
      } else if (isPhone() && card && card.classList.contains('fullview') && a < 0.84) {
        setFullView(false);
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
  if (window.installCardTouch && !isPhone()) window.installCardTouch({
    isOpen: isOpen,
    body: function () { return bodyEl; },
    skip: '#stepper-stage',
    close: closeCard
  });

  /* 手机：整张卡都能驱动装配；舞台内仍由 3D 场景自己处理。 */
  let touchY = null, afterAssembleTravel = 0;
  if (card) {
    card.addEventListener('touchstart', function (e) {
      if (!isOpen() || !isPhone() || e.touches.length !== 1) return;
      if (e.target.closest && e.target.closest('#stepper-stage, button, input, a')) { touchY = null; return; }
      touchY = e.touches[0].clientY;
    }, { passive: true });
    card.addEventListener('touchmove', function (e) {
      if (!isOpen() || touchY === null || e.touches.length !== 1) return;
      const t = e.touches[0];
      const dy = t.clientY - touchY;
      if (Math.abs(dy) < 2) return;
      e.preventDefault();
      const full = card.classList.contains('fullview');
      const target = window.stepperTarget ? window.stepperTarget() : 0;
      const done = window.stepperAssembled ? window.stepperAssembled() : target >= 0.99;
      if (dy > 0) {
        if (full && done) {
          afterAssembleTravel += dy;
          if (afterAssembleTravel > 56) closeCard();
        } else if (bodyEl && bodyEl.scrollTop > 0) {
          bodyEl.scrollTop = Math.max(0, bodyEl.scrollTop - dy);
        } else if (window.stepperSetAssembly) {
          window.stepperSetAssembly(target + dy / 300);
        }
      } else {
        if (full) {
          if (window.stepperSetAssembly) window.stepperSetAssembly(Math.min(target - 0.22, 0.72));
          setFullView(false);
        } else {
          const max = bodyEl ? bodyEl.scrollHeight - bodyEl.clientHeight : 0;
          if (bodyEl && bodyEl.scrollTop < max - 2) bodyEl.scrollTop = Math.min(max, bodyEl.scrollTop - dy);
          else closeCard();
        }
      }
      touchY = t.clientY;
    }, { passive: false });
    card.addEventListener('touchend', function () { touchY = null; afterAssembleTravel = 0; }, { passive: true });
    card.addEventListener('touchcancel', function () { touchY = null; afterAssembleTravel = 0; }, { passive: true });
  }
})();
