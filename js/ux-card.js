/* =========================================================
   Middle-platform ERP micro-interactions · glass card
   One animated icon at a time, 3-second autoplay.
   Click the current list item again to resume; open/close mirrors ta/bid cards.
   ========================================================= */
(function () {
  const overlay  = document.getElementById('ux-overlay');
  const card     = document.getElementById('ux-card');
  const openBtn  = document.getElementById('ux-open');
  const closeBtn = document.getElementById('ux-close');
  if (!overlay || !openBtn) return;

  const shots       = Array.prototype.slice.call(document.querySelectorAll('#ux-overlay [data-ux-shot]'));
  const detailItems = Array.prototype.slice.call(document.querySelectorAll('#ux-overlay [data-ux-detail]'));
  const listBtns    = Array.prototype.slice.call(document.querySelectorAll('#ux-overlay [data-ux]'));
  const countEl     = document.getElementById('ux-count');
  const N = shots.length || 5;

  let current = 0;
  let playing = true;
  let cycleTimer = 0;
  let retractTimer = 0;

  const isOpen = function () { return overlay.getAttribute('aria-hidden') === 'false'; };

  function render(idx) {
    current = ((idx % N) + N) % N;
    shots.forEach(function (s, i) { s.classList.toggle('show', i === current); });
    detailItems.forEach(function (s, i) { s.classList.toggle('show', i === current); });
    listBtns.forEach(function (b, i) { b.classList.toggle('on', i === current); });
    if (countEl) countEl.textContent = String(current + 1).padStart(2, '0') + ' / ' + String(N).padStart(2, '0');
  }
  function stopCycle() { clearInterval(cycleTimer); cycleTimer = 0; }
  function restartCycle() {
    stopCycle();
    if (playing && isOpen()) cycleTimer = setInterval(function () { render(current + 1); }, 3000);
  }
  function setPlaying(v) { playing = v; restartCycle(); }

  function openCard() {
    clearTimeout(retractTimer);
    overlay.classList.remove('retracting');
    overlay.setAttribute('aria-hidden', 'false');
    if (window.lockPageScroll) window.lockPageScroll();
    else document.body.style.overflow = 'hidden';
    render(0);
    setPlaying(true);
    if (card) card.focus({ preventScroll: true });
  }
  function closeCard() {
    if (!isOpen() || overlay.classList.contains('retracting')) return;
    stopCycle();
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
  if (overlay) overlay.addEventListener('click', function (e) { if (e.target === overlay) closeCard(); });

  /* 点段落：跳到该帧并固定；再点当前段落恢复自动播放 */
  listBtns.forEach(function (b) {
    b.addEventListener('click', function () {
      const idx = parseInt(b.dataset.ux, 10) || 0;
      if (!playing && idx === current) setPlaying(true);
      else { render(idx); setPlaying(false); }
    });
  });

  document.addEventListener('keydown', function (e) {
    if (!isOpen()) return;
    if (e.key === 'Escape') { closeCard(); return; }
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      render(current + (e.key === 'ArrowRight' ? 1 : -1));
      setPlaying(false);
    }
  });

  /* 下滑关闭：滚轮 / 触摸向下 */
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
})();
