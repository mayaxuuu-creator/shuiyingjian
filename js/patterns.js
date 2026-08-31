/* 水影笺 · 纹样保底
   一键编排的"墨序"：位置/时机/力度/颜色全部预设，保证出图下限。
   事件格式：{ delay(ms), x, y(左上原点0~1), dx, dy(速度，GL空间：正=向上), color, radius }
   随机只做 ±10% 的微扰，构图骨架不动。 */

window.PATTERNS = (function () {
  'use strict';

  // 松烟盘没有青绿系颜色名 → 按主题替换，保证两套盘纹样都成立
  const fallbackMap = {
    shui: { '石青': '花青', '石绿': '重墨', '藤黄': '清墨', '金泥': '清墨', '朱砂': '赭石', '胭脂': '赭石' },
  };
  function inkColor(palette, name, strength, jitter) {
    let c = palette.colors.find(k => k.name === name);
    if (!c) {
      const sub = (fallbackMap[palette.key] || {})[name];
      c = palette.colors.find(k => k.name === sub) || palette.colors[0];
    }
    const m = Math.max(c.rgb[0], c.rgb[1], c.rgb[2]) || 1;
    const j = jitter === undefined ? 1 : jitter;
    // 松烟（淡色入黑水）容易堆到过曝，整体压一档
    const damp = palette.key === 'shui' ? 0.55 : 1.0;
    return [c.rgb[0] / m * strength * j * damp, c.rgb[1] / m * strength * j * damp, c.rgb[2] / m * strength * j * damp];
  }
  const rnd = (a, b) => a + Math.random() * (b - a);

  /* 云纹：横贯画面的一条流云带 + 上方淡云回声 + 下方薄雾 */
  function yun(p) {
    const e = [];
    const y0 = rnd(0.40, 0.46), amp = rnd(0.10, 0.14);
    for (let i = 0; i < 24; i++) {
      const x = 0.06 + 0.88 * (i / 23);
      const y = y0 + amp * Math.sin(i * 0.55);
      const name = i % 6 === 3 ? '藤黄' : (i % 2 ? '石青' : '石绿');
      e.push({
        delay: i * 42, x: x, y: y,
        dx: rnd(230, 320), dy: rnd(-50, 50),
        color: inkColor(p, name, 0.58, rnd(0.9, 1.1)),
        radius: i % 6 === 3 ? 0.8 : 1.15,
      });
    }
    for (let i = 0; i < 13; i++) {
      const x = 0.14 + 0.72 * (i / 12);
      e.push({
        delay: 520 + i * 48, x: x, y: 0.28 + 0.055 * Math.sin(i * 0.7 + 2),
        dx: rnd(130, 180), dy: rnd(-20, 20),
        color: inkColor(p, i % 3 === 2 ? '金泥' : '石绿', 0.32, rnd(0.9, 1.1)),
        radius: 1.3,
      });
    }
    for (let i = 0; i < 9; i++) {
      e.push({
        delay: 980 + i * 65, x: 0.10 + 0.8 * (i / 8), y: 0.66 + rnd(-0.03, 0.05),
        dx: rnd(60, 110), dy: rnd(10, 30),
        color: inkColor(p, '石青', 0.24, rnd(0.85, 1.1)),
        radius: 1.5,
      });
    }
    return e;
  }

  /* 浪纹：三层横扫的浪（S 走向）+ 尾部金沫 */
  function lang(p) {
    const e = [];
    const rows = [
      { y: 0.26, name: '石青', s: 0.58, dir: 1 },
      { y: 0.50, name: '石绿', s: 0.52, dir: -1 },
      { y: 0.74, name: '石青', s: 0.34, dir: 1 },
    ];
    rows.forEach((row, r) => {
      for (let i = 0; i < 18; i++) {
        const t = i / 17;
        e.push({
          delay: r * 150 + i * 24,
          x: row.dir > 0 ? -0.02 + 1.04 * t : 1.02 - 1.04 * t,
          y: row.y + rnd(-0.015, 0.015),
          dx: row.dir * rnd(230, 290),
          dy: rnd(-45, 20),
          color: inkColor(p, i % 5 === 4 && r < 2 ? '藤黄' : row.name, row.s, rnd(0.9, 1.1)),
          radius: 1.2,
        });
      }
    });
    for (let i = 0; i < 7; i++) {
      e.push({
        delay: 560 + i * 45, x: rnd(0.2, 0.8), y: rnd(0.20, 0.40),
        dx: rnd(80, 140), dy: rnd(-50, 0),
        color: inkColor(p, '金泥', 0.26, rnd(0.85, 1.15)),
        radius: 0.6,
      });
    }
    return e;
  }

  /* 漩涡：双涡对流 + 中心一点朱砂 */
  function xuan(p) {
    const e = [];
    const centers = [
      { cx: 0.63, cy: 0.38, seq: ['石青', '石绿'], t0: 0 },
      { cx: 0.33, cy: 0.64, seq: ['金泥', '赭石'], t0: 430 },
    ];
    centers.forEach(c => {
      const dir = Math.random() > 0.5 ? 1 : -1;
      const n = 17;
      for (let k = 0; k < n; k++) {
        const th = (k / n) * Math.PI * 2 + rnd(-0.1, 0.1);
        const r = 0.062;
        const px = c.cx + r * Math.cos(th);
        const py = c.cy + r * 0.92 * Math.sin(th);
        e.push({
          delay: c.t0 + k * 38, x: px, y: py,
          dx: -Math.sin(th) * dir * rnd(360, 440),
          dy: -Math.cos(th) * dir * rnd(360, 440) * -1,
          color: inkColor(p, c.seq[k % 2], 0.52, rnd(0.9, 1.1)),
          radius: 0.95,
        });
      }
      e.push({
        delay: c.t0 + n * 38 + 120, x: c.cx, y: c.cy,
        dx: 0, dy: 0,
        color: inkColor(p, '朱砂', 0.42, 1),
        radius: 0.55,
      });
    });
    return e;
  }

  const registry = { yun, lang, xuan };
  return {
    make(name, palette) {
      const fn = registry[name] || yun;
      return fn(palette);
    },
    names: Object.keys(registry),
  };
})();
