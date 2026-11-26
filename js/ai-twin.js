/* =========================================================
   AI Digital Twin · front-end controller
   Talks to the Vercel proxy (key + persona live on the server).
   Glass thinking bubble in the chat, typewriter reveal, bilingual UI.
   ========================================================= */
(function () {
  const ENDPOINT = 'https://ai-twin-proxy.vercel.app/api/chat';
  const shell    = document.getElementById('ai-twin-chat');
  const compose  = document.getElementById('ai-twin-compose');
  const input    = document.getElementById('ai-twin-input');
  const sendBtn  = document.getElementById('ai-twin-send');
  const emptyEl  = document.getElementById('ai-twin-empty');
  const quickBtns= Array.prototype.slice.call(document.querySelectorAll('#ai-twin-quick button'));
  if (!shell || !input || !sendBtn) return;

  const isZh = function () { return document.body.classList.contains('lang-zh'); };

  /* 本地速答：网络慢、代理不可达或额度异常时，仍然用我的口吻给出真实经历，
     不让访客一直盯着空白思考态。内容与服务端 persona 同源，不编造新事实。 */
  const FALLBACK = {
    zh: [
      { k: /介绍|你是谁|自我介绍/, a: '我是王子涵，湖南湘西吉首人，苗族，现在西浦读人工智能硕士，同时做三门课的助教。本科在爱尔兰读了五年，是软件开发荣誉学士。我比较爱开玩笑，也敢尝试；做得比较多的三块是热成像渗漏识别、助教和 RTU 主板。' },
      { k: /你是AI|是不是AI|数字孪生|机器人|真人|真实的人/, a: '我是王子涵的数字孪生，与一般的AI是有区别的哦！我按真实经历和说话习惯回答，资料里没有的我会直说不太清楚。' },
      { k: /优势.{0,12}缺点|缺点.{0,12}优势|强项.{0,12}不足|不足.{0,12}强项/, a: '我最大的优势是对科技创新敏感，也敢表达：2025 年初我就判断 Agent 是必然，水利上可以用无人机巡检、RTU 边缘计算和历史数据做自动决策，而且数据因安全不能上云，各单位得部署自己的 AI。缺点是我可能过度自信，偶尔忽略很微小的细节，但这也让我敢交流、敢尝试。' },
      { k: /优势|强项|擅长|竞争力|AI 时代|ai时代|Agent|智能体|小龙虾|云端/, a: '我最大的优势是对科技创新敏感，也敢表达。2025 年初我就判断 Agent 是必然，每个行业会有自己的 Agent，但需要大量数据堆积。水利上融合无人机巡检、RTU 边缘计算和历史数据，完全可以自动决策开闸关闸；数据因安全不能上云，各单位得部署自己的 AI。AI 会扩大程序员的优势，反而淘汰对软件理解不足的人。' },
      { k: /缺点|不足|短板/, a: '我可能过度自信，偶尔忽略很微小的细节。但这也让我敢交流、敢尝试；发现问题后我会很快调整，不会硬撑。' },
      { k: /热成像|红外|渗漏|裂缝|管涌|RTK|经纬度|无人机/, a: '水、裂缝和管涌有时肉眼看不见，但和地表有温差，所以我们用无人机热成像找问题点。后来我打开照片发现里面有位置和海拔信息，就用像素点和三角函数算出经纬度，标到百度、高德地图上。' },
      { k: /助教|教学|学生|课程|分布式网络|大数据|数学/, a: '我现在带三门课：分布式网络、大数据、人工智能数学。有几位学生会课后找我问机器学习等其他专业课的问题，哪怕我不是那些课的助教——他们宁愿问我，也不问自己课程的老师和 TA。' },
      { k: /RTU|瑞芯微|RK|OpenCV|主板|边缘计算/, a: '2025 年我提出跳过 MCU 直接用 CPU，选了国产 RK 系列大概 400 的芯片，具体型号记不清了。芯片配置弱，为了节约成本我们选了 OpenCV。硬件在 2026 年初做出来，那时我已经回学校了。' },
      { k: /欧库西|东帝汶|大坝|洪水|省长/, a: '那是水务院想出海的机会，但他们不擅长对外沟通。欧库西省长是澳大利亚留学回来的，适应欧美交流方式，也喜欢高科技。我做洪水影响模拟网页、汇报材料和英文校对，并在双方之间翻译。' },
      { k: /永兴|110|尾款|交付|卡顿|瓦片/, a: '那套系统确实很差，界面把东西全摊开，用户不知道从哪用；瓦片贴图铺满整个水库，卡得厉害。我带队重做使用路径和界面，和甲方沟通两轮，最后验收拿回 110 万尾款。' },
      { k: /谷歌|google|面试/, a: '我投了软件工程师，简历过了、面试也做了，最后没过。我没有沮丧：这证明我拿到了和名校学生竞争的机会，而大部分人连面试机会都没有，尤其学校 QS 不那么靠前的同学。' },
      { k: /成绩|二等二|绩点|gpa|学位|荣誉学士/, a: '如果问到成绩，我会如实说是二等二；简历上体现的是荣誉学士，SETU | BSc (Hons) in Software Development。' },
      { k: /比赛|建投|招投标|六随机|五区间/, a: '湖南「六随机五区间」的细则公开：很多项打分后分配权重，权重和为 1，报价权重一般较高。我读细则后做系数和报价预测。比赛没结束我就回学校了，学生以学业为主，不能耽误。' },
      { k: /步进电机|电机|STM32|闸门/, a: '最初学的就是给引脚通电，让步进电机按不同速度旋转；后来才做到 STM32 控制闸门和上拉皮带。' }
    ],
    en: [
      { k: /introduce|yourself|who are you|background/i, a: 'I am Zihan Wang, from Jishou, Xiangxi, Hunan, and I am Miao. I am doing an MSc in Artificial Intelligence at XJTLU and teaching three courses. I did five years of undergraduate study in Ireland, with a BSc (Hons) in Software Development. I joke a lot and like trying things; the three areas I know best are thermal leak detection, teaching, and the RTU board.' },
      { k: /are you ai|digital twin|robot|real person/i, a: 'I am Zihan Wang\'s digital twin — not quite the same as a regular AI. I answer from my real experience and the way I actually speak; if something is not in my material I will say I am not entirely sure.' },
      { k: /strength.{0,40}weakness|weakness.{0,40}strength|advantage.{0,40}shortcoming/i, a: 'My biggest strength is being sensitive to tech shifts and willing to speak up: in early 2025 I already thought Agents were inevitable, and in water management drone inspection, RTU edge computing and historical data can drive automatic decisions — with data kept local for security. My weakness is that I can be overconfident and sometimes miss tiny details, but that also makes me bolder in talking to people and trying things.' },
      { k: /strength|advantage|competitive|ai era|agent|lobster|cloud/i, a: 'My biggest advantage is being sensitive to tech shifts and willing to speak up. In early 2025 I already thought Agents were inevitable — every industry would have its own, but they need piles of data. In water management, drone inspection, RTU edge computing and historical data can drive automatic decisions like opening and closing gates. The data cannot go to the cloud for security, so authorities need their own AI. AI amplifies good programmers and weeds out people who do not understand software.' },
      { k: /weakness|shortcoming|not good at/i, a: 'I can be overconfident and sometimes miss very small details. But that also makes me bolder in talking to people and trying things; when I spot a problem I adjust quickly rather than stubbornly sticking to it.' },
      { k: /thermal|infrared|leak|crack|piping|rtk|drone/i, a: 'Leaks, cracks and piping are often invisible, but water has a temperature difference from the ground, so we used drone thermal imaging. Later I noticed the photos already had position and elevation data, and used pixel coordinates plus trigonometry to work out latitude and longitude, then marked the points on Baidu and Amap.' },
      { k: /ta|teach|student|course|distributed|big data|math/i, a: 'I teach Distributed Networks, Big Data and Mathematics for AI. A few students come to me after class about other subjects like machine learning, even though I am not their TA for those — they would rather ask me than their own TA or lecturer.' },
      { k: /rtu|rockchip|rk|opencv|board|edge/i, a: 'In 2025 I argued for skipping the MCU and going straight to a CPU. We used a domestic Rockchip RK-series chip around the 400 level — I don\'t remember the exact model. Because the chip was weak and we wanted to save cost, we chose OpenCV. The hardware was built in early 2026, after I had returned to classes.' },
      { k: /oecusse|timor|dam|flood|governor/i, a: 'The institute wanted to go overseas but was not good at cross-border communication. The Governor of Oecusse had studied in Australia, was comfortable with Western-style exchange and liked high tech. I built the flood-impact page, wrote the report slides, checked the English and interpreted between both sides.' },
      { k: /yongxing|1\.1|delivery|million|tiling|slow/i, a: 'That system was genuinely poor: everything was dumped on one screen so users did not know where to start, and tiling the whole reservoir made it painfully slow. I led the redesign of the user flow and interface, and after two rounds with the client we passed acceptance and got a 1.1-million-yuan final payment.' },
      { k: /google|interview/i, a: 'I applied as a software engineer, my CV passed and I did the interviews, but I did not get it. I was not discouraged: it meant I had earned a seat alongside students from top universities, while most people never even get an interview, especially those from less prestigious schools.' },
      { k: /grade|gpa|2:2|degree|honours/i, a: 'If asked directly, I say honestly that I got a 2:2. My CV shows the honours degree: SETU | BSc (Hons) in Software Development.' },
      { k: /competition|bidding|six.random|five.interval/i, a: 'Hunan\'s "six-random, five-interval" rules are public: many items are scored and given weights that sum to 1, with price usually carrying a heavy weight. I read the rules and predicted coefficients and bids. I left before the competition ended because classes come first for a student.' },
      { k: /stepper|motor|stm32|gate/i, a: 'The basics were simply energising pins to make the stepper rotate at different speeds; later I moved on to STM32 controlling the sluice gate and the belt.' }
    ]
  };
  const FALLBACK_GENERIC = {
    zh: '这个我目前也不是很清楚。',
    en: 'I\'m not entirely sure about that one.'
  };
  function fallbackAnswer(q, zh) {
    const list = FALLBACK[zh ? 'zh' : 'en'];
    const hit = list.find(x => x.k.test(q));
    return hit ? hit.a : (zh ? FALLBACK_GENERIC.zh : FALLBACK_GENERIC.en);
  }
  function fallbackNote(err, zh) {
    const m = String(err && err.message || err || '');
    if (/402|balance|insufficient|payment/i.test(m)) return zh ? '账户余额不足 · 本地速答' : 'Low balance · quick local answer';
    if (/429|too many|daily/i.test(m)) return zh ? '问得太快 · 本地速答' : 'Too many calls · quick local answer';
    return zh ? '网络较慢 · 本地速答' : 'Slow connection · quick local answer';
  }

  let history = [];       // {role, content}
  let busy = false;
  let idleTimer = 0;      // 流迟迟不来时主动掐断，转本地速答
  let pendingBubble = null; // 正在思考的气泡，回复到达时转成文字
  let typingRaf = 0;      // 打字机帧；新提问或离页时立即取消，不留后台进程
  let typingSeq = 0;
  let activeController = null;

  function setPlaceholder() {
    input.placeholder = isZh() ? input.dataset.phZh : input.dataset.phEn;
  }
  function setSendLabel() { /* label handled by .en/.zh spans; nothing needed */ }
  setPlaceholder();

  function scrollBottom() { shell.scrollTop = shell.scrollHeight; }

  function addMsg(role, text) {
    if (emptyEl) emptyEl.style.display = 'none';
    const el = document.createElement('div');
    el.className = 'ai-twin-msg ' + (role === 'user' ? 'user' : 'bot');
    if (role === 'user') el.textContent = text;
    shell.appendChild(el);
    scrollBottom();
    return el;
  }

  /* 思考气泡：一个玻璃质感的小胶囊，里面三颗点依次起伏 + 一道高光缓慢扫过。
     没有文字。高度固定，回复到达时平滑过渡成普通气泡。 */
  function addThinkingBubble() {
    const el = addMsg('bot', '');
    el.classList.add('thinking');
    el.innerHTML =
      '<span class="tw-dots"><i></i><i></i><i></i></span>' +
      '<span class="tw-sheen"></span>';
    scrollBottom();
    return el;
  }

  /* 把思考气泡收回成普通文字气泡：淡出点阵，再交给打字机填入内容。 */
  function resolveBubble(el) {
    if (!el) return;
    el.classList.remove('thinking');
    el.classList.add('resolved');
    el.textContent = '';
    pendingBubble = null;
  }

  function setThinking(on) {
    busy = on;
    compose.classList.toggle('thinking', on);
    sendBtn.disabled = on;
    if (!on) resolveBubble(pendingBubble);
  }

  /* 打字机式逐字显现：只在字真正出现时才插入 DOM，
     所以气泡宽度跟着文字一起长，不会先撑满再填空白。 */
  function typeInto(el, text, done) {
    if (typingRaf) { cancelAnimationFrame(typingRaf); typingRaf = 0; }
    const seq = ++typingSeq;
    const chars = Array.prototype.slice.call(text);
    const caret = document.createElement('span');
    caret.className = 'tw-caret';
    el.appendChild(caret);

    let k = 0;
    const step = function () {
      if (seq !== typingSeq) return;   // 已被新回复或离页取消
      const batch = 2 + Math.floor(Math.random() * 2); // 每帧 2-3 字，观感自然
      const frag = document.createDocumentFragment();
      for (let n = 0; n < batch && k < chars.length; n++, k++) {
        const s = document.createElement('span');
        s.className = 'tw-ch';
        s.textContent = chars[k];
        frag.appendChild(s);
      }
      el.insertBefore(frag, caret);
      scrollBottom();
      if (k < chars.length) typingRaf = requestAnimationFrame(step);
      else { typingRaf = 0; caret.classList.add('idle'); if (done) done(); }
    };
    typingRaf = requestAnimationFrame(step);
  }

  function ask(question) {
    question = String(question || '').trim();
    if (!question || busy) return;
    /* 新提问开始前先掐掉上一答的打字机帧，避免两份 RAF 并行。 */
    if (typingRaf) { cancelAnimationFrame(typingRaf); typingRaf = 0; typingSeq++; }
    addMsg('user', question);
    input.value = '';
    setThinking(true);

    /* 回答语言跟随提问本身：中文提问用中文答，英文提问用英文答，
       不再被界面语言绑死。 */
    const zhQuestion = /[\u4e00-\u9fff]/.test(question);
    const payload = {
      question: question,
      lang: zhQuestion ? 'zh' : 'en',
      history: history.slice(-8)
    };

    const botEl = addThinkingBubble();
    pendingBubble = botEl;
    let full = '';

    const controller = new AbortController();
    activeController = controller;
    function armIdle() {
      clearTimeout(idleTimer);
      idleTimer = setTimeout(function () { controller.abort('idle'); }, 12000);
    }
    function finishWithFallback(err) {
      clearTimeout(idleTimer);
      activeController = null;
      setThinking(false);
      botEl.textContent = '';
      const note = document.createElement('span');
      note.className = 'tw-offline';
      note.textContent = fallbackNote(err, zhQuestion);
      botEl.appendChild(note);
      const answer = fallbackAnswer(question, zhQuestion);
      history.push({ role: 'user', content: question });
      history.push({ role: 'assistant', content: answer });
      /* 页面在后台时直接落字，不再启动打字机 RAF；用户回来仍看得到答案。 */
      if (document.hidden) botEl.appendChild(document.createTextNode(answer));
      else typeInto(botEl, answer, scrollBottom);
      console.warn('AI twin fallback:', err && err.message ? err.message : err);
    }

    armIdle();
    fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal
    }).then(function (resp) {
      if (!resp.ok || !resp.body) {
        return resp.json().catch(function () { return {}; }).then(function (j) {
          throw new Error('HTTP ' + resp.status + (j.error ? ' · ' + j.error : ''));
        });
      }
      const reader = resp.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';
      const pump = function () {
        return reader.read().then(function (result) {
          if (result.done) return;
          armIdle();   // 每个chunk都续命，慢一点的回复也不会被误杀
          buffer += decoder.decode(result.value, { stream: true });
          let idx;
          while ((idx = buffer.indexOf('\n')) >= 0) {
            const line = buffer.slice(0, idx).trim();
            buffer = buffer.slice(idx + 1);
            if (!line || line.indexOf('data:') !== 0) continue;
            const data = line.slice(5).trim();
            if (data === '[DONE]') continue;
            try {
              const obj = JSON.parse(data);
              const delta = obj.choices && obj.choices[0] && obj.choices[0].delta;
              const piece = delta && (delta.content || '');
              if (piece) full += piece;
            } catch (e) { /* partial json across frames is fine */ }
          }
          return pump();
        });
      };
      return pump().then(function () {
        if (!full) throw new Error('empty reply');
        clearTimeout(idleTimer);
        activeController = null;
        setThinking(false);
        history.push({ role: 'user', content: question });
        history.push({ role: 'assistant', content: full });
        botEl.textContent = '';
        if (document.hidden) botEl.textContent = full;
        else typeInto(botEl, full, scrollBottom);
      });
    }).catch(finishWithFallback);
  }

  sendBtn.addEventListener('click', function () { ask(input.value); });
  input.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') { e.preventDefault(); ask(input.value); }
  });

  quickBtns.forEach(function (b) {
    b.addEventListener('click', function () {
      const q = isZh() ? b.dataset.qZh : b.dataset.qEn;
      ask(q || b.textContent.trim());
    });
  });

  /* 跟随语言：占位符与快捷气泡文案由 .en/.zh span 自动切换 */
  document.addEventListener('click', function (e) {
    const t = e.target;
    if (t && (t.id === 'lang-toggle' || (t.closest && t.closest('#lang-toggle')))) {
      setTimeout(setPlaceholder, 0);
    }
  });

  /* 兜底：任何来源的 body class 变化都同步占位符 */
  if (window.MutationObserver) {
    let last = document.body.className;
    new MutationObserver(function () {
      if (document.body.className === last) return;
      last = document.body.className;
      setPlaceholder();
    }).observe(document.body, { attributes: true, attributeFilter: ['class'] });
  }

  /* 离开页面/切到后台：取消正在跑的网络流与打字机帧，不留后台进程。 */
  window.addEventListener('pagehide', function () {
    clearTimeout(idleTimer);
    if (activeController) { activeController.abort('pagehide'); activeController = null; }
    if (typingRaf) { cancelAnimationFrame(typingRaf); typingRaf = 0; typingSeq++; }
  });
  document.addEventListener('visibilitychange', function () {
    if (!document.hidden) return;
    if (activeController) { activeController.abort('hidden'); activeController = null; }
    if (typingRaf) { cancelAnimationFrame(typingRaf); typingRaf = 0; typingSeq++; }
  });
})();
