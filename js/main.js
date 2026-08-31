/* 水影笺 · 主流程
   滴墨/吹墨(流体引擎内) → 纹样保底 → 覆纸拓印 → 保存成笺 */

(function () {
  'use strict';

  const state = {
    palette: PALETTES.qinglv,
    colorIndex: PALETTES.qinglv.defaultIndex,
    number: 0,
  };

  const $ = s => document.querySelector(s);
  const poolWrap = $('#poolWrap');
  const paletteBox = $('#palette');
  const hint = $('#hint');
  const overlay = $('#printOverlay');
  const paperCanvas = $('#paperCanvas');
  const resultBar = $('#resultBar');
  const caption = $('#sheetCaption');

  // ---------- 墨盘 ----------
  function cssColor(rgb, boost) {
    const b = boost || 1.0;
    const f = v => Math.round(Math.min(1, v * b) * 255);
    return `rgb(${f(rgb[0])}, ${f(rgb[1])}, ${f(rgb[2])})`;
  }
  function buildPalette() {
    paletteBox.innerHTML = '';
    state.palette.colors.forEach((c, i) => {
      const btn = document.createElement('button');
      btn.className = 'swatch' + (i === state.colorIndex ? ' active' : '');
      btn.title = c.name;
      btn.style.background = cssColor(c.rgb, 1.25);
      btn.addEventListener('click', () => {
        state.colorIndex = i;
        paletteBox.querySelectorAll('.swatch').forEach(el => el.classList.remove('active'));
        btn.classList.add('active');
        FLUID.setInk(c.rgb);
      });
      paletteBox.appendChild(btn);
    });
    FLUID.setInk(state.palette.colors[state.colorIndex].rgb);
  }

  function setTheme(palette) {
    state.palette = palette;
    state.colorIndex = palette.defaultIndex;
    FLUID.setTheme(palette);
    FLUID.paperForPrint = palette.paper;
    buildPalette();
    document.body.classList.toggle('theme-shui', palette.key === 'shui');
  }

  $('#themeSwitch').addEventListener('click', e => {
    const btn = e.target.closest('.theme-btn');
    if (!btn) return;
    document.querySelectorAll('.theme-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    setTheme(PALETTES[btn.dataset.theme]);
  });

  // ---------- 纹样 / 清池 ----------
  document.querySelectorAll('[data-pattern]').forEach(btn => {
    btn.addEventListener('click', () => {
      FLUID.queue(PATTERNS.make(btn.dataset.pattern, state.palette));
      dismissHint();
    });
  });
  $('#clearBtn').addEventListener('click', () => FLUID.clear());

  // ---------- 覆纸拓印 ----------
  $('#printBtn').addEventListener('click', () => {
    state.number = 1000 + Math.floor(Math.random() * 9000);
    FLUID.pause();
    const pixels = FLUID.getPixels();
    const sheet = RUBBING.create({ pixels, number: state.number });
    paperCanvas.width = RUBBING.W;
    paperCanvas.height = RUBBING.H;
    paperCanvas.getContext('2d').drawImage(sheet, 0, 0);
    caption.textContent = '第 ' + state.number + ' 号';
    resultBar.classList.add('hidden');
    overlay.classList.remove('hidden');
    void overlay.offsetWidth;   // 强制 reflow，保证过渡动画必触发（不依赖 rAF 存活）
    overlay.classList.add('show');
    setTimeout(() => resultBar.classList.remove('hidden'), 1250);
  });

  $('#againBtn').addEventListener('click', () => {
    overlay.classList.remove('show');
    setTimeout(() => overlay.classList.add('hidden'), 420);
    FLUID.resume();
  });

  $('#saveBtn').addEventListener('click', () => {
    paperCanvas.toBlob(blob => {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = '水影笺_' + state.number + '.png';
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 3000);
    }, 'image/png');
  });

  // ---------- 引导 ----------
  let hintDone = false;
  function dismissHint() {
    if (hintDone) return;
    hintDone = true;
    hint.classList.add('hide');
  }
  document.addEventListener('pool-touch', dismissHint);
  setTimeout(dismissHint, 7000);

  // ---------- 启动 ----------
  setTheme(PALETTES.qinglv);

  // URL 演示钩子：?demo=shui-xuan-print
  // 主题段：qinglv / shui；纹样段：yun / lang / xuan；带 print = 自动覆纸
  const demo = new URLSearchParams(location.search).get('demo');
  if (demo) {
    const themeKey = demo.includes('shui') ? 'shui' : 'qinglv';
    const patName = demo.includes('lang') ? 'lang' : demo.includes('xuan') ? 'xuan' : 'yun';
    setTimeout(() => {
      document.querySelector('[data-theme="' + themeKey + '"]').click();
      FLUID.clear();
      FLUID.queue(PATTERNS.make(patName, PALETTES[themeKey]));
      if (demo.includes('print')) setTimeout(() => document.getElementById('printBtn').click(), 2800);
    }, 450);
  } else {
    // 迎客墨：开场自动演半段云纹，第一眼就有东西看
    setTimeout(() => FLUID.queue(PATTERNS.make('yun', state.palette).slice(0, 34)), 700);
  }
})();
