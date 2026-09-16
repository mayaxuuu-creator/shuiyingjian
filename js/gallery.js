/* 水影笺 · 长物斋（本地展品库）
   首选 IndexedDB；浏览器受限（隐私模式/内置浏览器禁用）时自动降级 localStorage（上限 8 张）。
   展墙视图：深色展墙网格 + 展签，点开看大图可再保存/发笔记/删除。数据仅存于本机设备。
   v3.6 策展：用户可把最多九件作品放入「斋展」，旧数据未上展仍可正常显示。 */

window.GALLERY = (function () {
  'use strict';

  const DB_NAME = 'syj_gallery_v1', STORE = 'works', CAP = 60, LS_CAP = 8, LS_KEY = 'syj_gallery_ls';
  const EXHIBIT_CAP = 9;
  let dbPromise = null, idbBroken = false;
  let currentFilter = 'all';

  function open() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
      const rq = indexedDB.open(DB_NAME, 1);
      rq.onupgradeneeded = () => rq.result.createObjectStore('works', { keyPath: 'id' });
      rq.onsuccess = () => resolve(rq.result);
      rq.onerror = () => reject(rq.error || new Error('IndexedDB open failed'));
      rq.onblocked = () => reject(new Error('IndexedDB blocked'));
    });
    return dbPromise;
  }

  /* ---------- 存储层：IDB 优先，失败自动落到 localStorage ---------- */
  async function put(work) {
    if (!idbBroken) {
      try {
        const db = await open();
        await new Promise((res, rej) => {
          const tx = db.transaction(STORE, 'readwrite');
          tx.objectStore(STORE).put(work);
          tx.oncomplete = res; tx.onerror = () => rej(tx.error || new Error('IDB put failed')); tx.onabort = () => rej(tx.error || new Error('IDB aborted'));
        });
        return 'idb';
      } catch (e) {
        idbBroken = true;   // 本会话内不再尝试 IDB
      }
    }
    // localStorage 兜底（容量小，限 8 张）
    const list = lsAll();
    const idx = list.findIndex(w => w.id === work.id);
    if (idx >= 0) list[idx] = work; else list.unshift(work);
    while (list.length > LS_CAP) list.pop();
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(list));
    } catch (e) {
      throw new Error('本地存储已满');
    }
    return 'ls';
  }

  function lsAll() {
    try { return JSON.parse(localStorage.getItem(LS_KEY) || '[]'); } catch (e) { return []; }
  }

  async function all() {
    if (!idbBroken) {
      try {
        const db = await open();
        return await new Promise((res, rej) => {
          const rq = db.transaction(STORE).objectStore(STORE).getAll();
          rq.onsuccess = () => res((rq.result || []).sort((a, b) => b.ts - a.ts));
          rq.onerror = () => rej(rq.error || new Error('IDB read failed'));
        });
      } catch (e) {
        idbBroken = true;
      }
    }
    return lsAll().sort((a, b) => b.ts - a.ts);
  }

  async function remove(id) {
    if (!idbBroken) {
      try {
        const db = await open();
        return await new Promise((res, rej) => {
          const tx = db.transaction(STORE, 'readwrite');
          tx.objectStore(STORE).delete(id);
          tx.oncomplete = res; tx.onerror = () => rej(tx.error);
        });
      } catch (e) { /* 落到 LS 删除 */ }
    }
    localStorage.setItem(LS_KEY, JSON.stringify(lsAll().filter(w => w.id !== id)));
  }

  async function add(work) {
    const store = await put(work);
    if (store === 'idb') {
      const list = await all();
      if (list.length > CAP) for (const w of list.slice(CAP)) await remove(w.id);
    }
    return store;
  }

  async function setFeatured(id, featured) {
    const works = await all();
    const work = works.find(w => String(w.id) === String(id));
    if (!work) return false;
    const exhibitCount = works.filter(w => w.featured).length;
    if (featured && !work.featured && exhibitCount >= EXHIBIT_CAP) return false;
    work.featured = !!featured;
    await put(work);
    return true;
  }

  /* ---------- 展墙视图 ---------- */
  let view = null;
  let onSave = null, onPost = null;   // 由 main.js 注入（桥接保存/发笔记）
  const SECTIONS = [
    { key: 'featured', title: '斋 展', note: '上展长物' },
    { key: 'sheet', title: '笺 架', note: '纸上长物' },
    { key: 'fan', title: '扇 架', note: '团扇' },
    { key: 'bookmark', title: '签 架', note: '书签' },
  ];

  function ensureView() {
    if (view) return;
    view = document.createElement('div');
    view.id = 'galleryView';
    view.innerHTML =
      '<div class="gv-head"><span class="gv-title">长 物 斋</span><span class="gv-count"></span>' +
      '<button class="gv-close">返回</button></div>' +
      '<div class="gv-curation">' +
        '<div class="gv-tabs">' +
          '<button class="gv-tab active" data-filter="all">全 部</button>' +
          '<button class="gv-tab" data-filter="featured">斋 展</button>' +
        '</div>' +
        '<span class="gv-note">斋展最多九件</span>' +
      '</div>' +
      '<div class="gv-grid"></div>' +
      '<div class="gv-detail hidden"></div>';
    document.body.appendChild(view);
    view.querySelector('.gv-close').addEventListener('click', hide);
    view.querySelector('.gv-tabs').addEventListener('click', event => {
      const btn = event.target.closest('.gv-tab');
      if (!btn) return;
      currentFilter = btn.dataset.filter;
      render();
    });
  }

  function esc(s) { return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }

  function cardHTML(w) {
    const carrier = w.carrier || 'sheet';
    return '<div class="gv-card carrier-' + carrier + '" data-id="' + w.id + '">' +
      '<div class="gv-frame"><img src="' + w.dataUrl + '" alt=""></div>' +
      (w.featured ? '<span class="gv-badge">斋展</span>' : '') +
      '<div class="gv-tag">第 ' + w.number + ' 号 · ' + esc(w.mind) + '</div>' +
      '<i class="gv-shelf"></i></div>';
  }

  function sectionHTML(key, title, note, works) {
    return '<section class="gv-section carrier-' + key + '">' +
      '<header class="gv-section-head"><h2>' + title + '</h2><span>' + works.length + ' 件 · ' + note + '</span></header>' +
      '<div class="gv-grid">' + works.map(cardHTML).join('') + '</div>' +
      '</section>';
  }

  async function render() {
    const works = await all();
    const shown = currentFilter === 'featured' ? works.filter(w => w.featured) : works;
    view.querySelectorAll('.gv-tab').forEach(btn => btn.classList.toggle('active', btn.dataset.filter === currentFilter));
    view.querySelector('.gv-count').textContent = shown.length ? shown.length + ' 件' : '';
    const grid = view.querySelector('.gv-grid');
    const detail = view.querySelector('.gv-detail');
    detail.classList.add('hidden');

    let html = '';
    if (currentFilter === 'featured') {
      html = shown.length ? sectionHTML('featured', '斋 展', '上展长物', shown)
        : '<div class="gv-empty">斋展未立<br>点开一件长物，上展即可</div>';
    } else {
      const byCarrier = {
        sheet: works.filter(w => (w.carrier || 'sheet') === 'sheet' && !w.featured),
        fan: works.filter(w => (w.carrier || 'sheet') === 'fan' && !w.featured),
        bookmark: works.filter(w => (w.carrier || 'sheet') === 'bookmark' && !w.featured),
      };
      const featured = works.filter(w => w.featured);
      if (featured.length) html += sectionHTML('featured', '斋 展', '上展长物', featured);
      SECTIONS.slice(1).forEach(section => {
        const items = byCarrier[section.key];
        if (items.length) html += sectionHTML(section.key, section.title, section.note, items);
      });
      if (!works.length) html = '<div class="gv-empty">长物斋尚空<br>拓一张喜欢的，收入斋中吧</div>';
    }
    grid.innerHTML = html;
    grid.classList.remove('hidden');
    grid.querySelectorAll('.gv-card').forEach(card => {
      const find = currentFilter === 'featured' ? shown : works;
      card.addEventListener('click', () => showDetail(find.find(w => String(w.id) === card.dataset.id)));
    });
  }

  function showDetail(w) {
    const detail = view.querySelector('.gv-detail');
    const grid = view.querySelector('.gv-grid');
    grid.classList.add('hidden');
    detail.classList.remove('hidden');
    detail.innerHTML =
      '<img class="gv-big" src="' + w.dataUrl + '" alt="">' +
      '<div class="gv-dtag">' + esc(w.theme || '流沙笺') + ' · 第 ' + w.number + ' 号 · 心相「' + esc(w.mind) + '」' +
      (w.carrierLabel && w.carrierLabel !== '笺' ? '<br>成器 · ' + esc(w.carrierLabel) : '') +
      (w.material ? '<br>辅料 · ' + esc(w.material) : '') +
      '<br>' + esc(w.poem || '') + '</div>' +
      '<div class="gv-actions">' +
      '<button class="tool-btn small" data-act="save">保存图片</button>' +
      '<button class="tool-btn small" data-act="post">发笔记</button>' +
      '<button class="tool-btn small" data-act="feature">' + (w.featured ? '撤出斋展' : '入斋展') + '</button>' +
      '<button class="tool-btn small ghost" data-act="del">删除</button>' +
      '</div>';
    detail.querySelectorAll('[data-act]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const act = btn.dataset.act;
        if (act === 'save' && onSave) await onSave(w.dataUrl, w.number);
        if (act === 'post' && onPost) onPost(w);
        if (act === 'feature') {
          const ok = await setFeatured(w.id, !w.featured);
          if (!ok) { btn.textContent = '斋展已满'; return; }
          await render();
        }
        if (act === 'del') { await remove(w.id); await render(); }
      });
    });
  }

  function show() { ensureView(); render(); view.classList.add('show'); }
  function hide() { if (view) view.classList.remove('show'); }

  return { add, all, remove, setFeatured, show, hide, setHandlers: (o) => { onSave = o.save; onPost = o.post; } };
})();
