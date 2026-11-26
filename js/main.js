document.addEventListener('DOMContentLoaded', () => {

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // ============ 1. 自定义光标：内核立即跟随 + 外环缓动 ============
    const cursor = document.querySelector('.cursor');
    const dot = document.querySelector('.cursor-dot');
    let mouseX = -100, mouseY = -100;       // 目标位置
    let ringX = -100, ringY = -100;         // 外环缓动位置

    document.addEventListener('mousemove', (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;
        if (dot) { dot.style.left = mouseX + 'px'; dot.style.top = mouseY + 'px'; }
    });

    // 外环用 requestAnimationFrame 缓动跟随，产生「丝滑拖尾」质感
    function renderCursor() {
        ringX += (mouseX - ringX) * 0.2;
        ringY += (mouseY - ringY) * 0.2;
        if (cursor) { cursor.style.left = ringX + 'px'; cursor.style.top = ringY + 'px'; }
        requestAnimationFrame(renderCursor);
    }
    renderCursor();

    // 悬停可交互元素时外环放大
    document.querySelectorAll('a, .btn, .card, .tags span, .to-top').forEach(link => {
        link.addEventListener('mouseenter', () => {
            cursor.style.width = '44px';
            cursor.style.height = '44px';
            cursor.style.backgroundColor = 'rgba(0,0,0,0.06)';
        });
        link.addEventListener('mouseleave', () => {
            cursor.style.width = '20px';
            cursor.style.height = '20px';
            cursor.style.backgroundColor = 'transparent';
        });
    });

    // ============ 2. 首屏鼠标光晕跟随（--mx / --my） ============
    const hero = document.getElementById('hero');
    if (hero) {
        hero.addEventListener('mousemove', (e) => {
            const r = hero.getBoundingClientRect();
            const mx = ((e.clientX - r.left) / r.width) * 100;
            const my = ((e.clientY - r.top) / r.height) * 100;
            hero.style.setProperty('--mx', mx + '%');
            hero.style.setProperty('--my', my + '%');
        });
    }

    // ============ 3. 中英文切换 + 打字机 ============
    const langBtn = document.getElementById('lang-toggle');
    const typewriterEl = document.getElementById('typewriter');
    const texts = {
        en: "MSc AI Student @ XJTLU | Teaching Assistant",
        zh: "西浦人工智能硕士在读 ｜ 课程助教"
    };
    let currentLang = 'en';
    let typeTimer = null;

    function typeWriter() {
        clearTimeout(typeTimer);
        typewriterEl.textContent = '';
        const text = texts[currentLang];
        let i = 0;
        (function tick() {
            if (i < text.length) {
                typewriterEl.textContent += text.charAt(i);
                i++;
                typeTimer = setTimeout(tick, currentLang === 'zh' ? 130 : 70);
            }
        })();
    }

    function setLang(lang) {
        currentLang = lang;
        document.body.classList.toggle('zh', lang === 'zh');
        document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en';
        typeWriter();
    }

    langBtn.addEventListener('click', () => {
        setLang(currentLang === 'en' ? 'zh' : 'en');
    });

    // ============ 4. 平滑滚动（导航锚点） ============
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                e.preventDefault();
                target.scrollIntoView({ behavior: 'smooth' });
            }
        });
    });

    // ============ 5. 滚动渐入（分段错落） ============
    const revealObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach((entry, idx) => {
            if (entry.isIntersecting) {
                // 同一批进入视口的元素依次延迟，形成错落入场
                setTimeout(() => entry.target.classList.add('active'), idx * 90);
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

    document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));

    // ============ 6. 时间线滚动进度线 ============
    const timeline = document.querySelector('.timeline');
    const progress = document.querySelector('.timeline-progress');
    function updateProgress() {
        if (!timeline || !progress) return;
        const rect = timeline.getBoundingClientRect();
        const viewportH = window.innerHeight;
        const filled = Math.min(Math.max(viewportH * 0.7 - rect.top, 0), rect.height);
        progress.style.height = filled + 'px';
    }
    window.addEventListener('scroll', updateProgress, { passive: true });
    window.addEventListener('resize', updateProgress);
    updateProgress();

    // ============ 7. 3D 倾斜卡片 + 光泽追踪 ============
    document.querySelectorAll('.tilt').forEach(el => {
        el.addEventListener('mousemove', (e) => {
            const rect = el.getBoundingClientRect();
            const x = (e.clientX - rect.left) / rect.width - 0.5;
            const y = (e.clientY - rect.top) / rect.height - 0.5;
            el.style.transform =
                `perspective(900px) rotateY(${x * 5}deg) rotateX(${-y * 5}deg) translateY(-3px)`;
            // 卡片光泽跟随鼠标
            el.style.setProperty('--lx', ((e.clientX - rect.left) / rect.width) * 100 + '%');
            el.style.setProperty('--ly', ((e.clientY - rect.top) / rect.height) * 100 + '%');
        });
        el.addEventListener('mouseleave', () => {
            el.style.transform = '';
        });
    });

    // ============ 8. 技能标签点击弹跳 ============
    document.querySelectorAll('.tags span').forEach(tag => {
        tag.addEventListener('click', () => {
            tag.classList.remove('pop');
            void tag.offsetWidth;
            tag.classList.add('pop');
        });
        tag.addEventListener('animationend', () => tag.classList.remove('pop'));
    });

    // ============ 9. 导航高亮当前分区 ============
    const navAnchors = document.querySelectorAll('.nav-links a');
    const sectionMap = new Map();
    navAnchors.forEach(a => {
        const id = a.getAttribute('href').slice(1);
        const sec = document.getElementById(id);
        if (sec) sectionMap.set(sec, a);
    });
    const navObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            const link = sectionMap.get(entry.target);
            if (link && entry.isIntersecting) {
                navAnchors.forEach(a => a.classList.remove('active'));
                link.classList.add('active');
            }
        });
    }, { threshold: 0.3 });
    sectionMap.forEach((_, sec) => navObserver.observe(sec));

    // ============ 10. 按钮磁吸 + 点击涟漪 ============
    document.querySelectorAll('.btn').forEach(btn => {
        btn.addEventListener('mousemove', (e) => {
            const r = btn.getBoundingClientRect();
            const mx = e.clientX - (r.left + r.width / 2);
            const my = e.clientY - (r.top + r.height / 2);
            btn.style.transform = `translate(${mx * 0.25}px, ${my * 0.3}px)`;
        });
        btn.addEventListener('mouseleave', () => {
            btn.style.transform = '';
        });
        btn.addEventListener('mousedown', (e) => {
            const r = btn.getBoundingClientRect();
            const size = Math.max(r.width, r.height);
            const ripple = document.createElement('span');
            ripple.className = 'ripple';
            ripple.style.width = ripple.style.height = size + 'px';
            ripple.style.left = (e.clientX - r.left - size / 2) + 'px';
            ripple.style.top = (e.clientY - r.top - size / 2) + 'px';
            btn.appendChild(ripple);
            setTimeout(() => ripple.remove(), 650);
        });
    });

    // ============ 11. 顶部滚动进度 + 回到顶部 ============
    const bar = document.querySelector('.scroll-progress');
    const toTop = document.querySelector('.to-top');
    function updateBar() {
        const scrollTop = window.scrollY || document.documentElement.scrollTop;
        const docH = document.documentElement.scrollHeight - window.innerHeight;
        const pct = docH > 0 ? (scrollTop / docH) * 100 : 0;
        if (bar) bar.style.width = pct + '%';
        if (toTop) toTop.classList.toggle('show', scrollTop > 500);
    }
    window.addEventListener('scroll', updateBar, { passive: true });
    updateBar();

    if (toTop) {
        toTop.addEventListener('click', () => {
            window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
        });
    }

    // 初始打字机
    setTimeout(typeWriter, 500);
});
