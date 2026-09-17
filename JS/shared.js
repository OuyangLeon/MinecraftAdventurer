/* ============================================================
   shared.js —— 共享注册表（网络同步营地列表）
   ★ 使用 IIFE 包裹，避免向全局泄漏变量导致重复声明
   ============================================================ */
(function () {
  'use strict';

  /* 确保 state / SHARED / REGISTRY_KEY 已从其他模块加载 */
  if (typeof SHARED === 'undefined' || typeof REGISTRY_KEY === 'undefined') {
    console.error('[shared.js] 缺少 data.js 中的 SHARED 或 REGISTRY_KEY 定义，请检查加载顺序');
    return;
  }

  async function ensureRegistryId() {
    let id = null;
    try {
      const urlId = new URLSearchParams(location.search).get('reg');
      if (urlId) { id = urlId; localStorage.setItem(REGISTRY_KEY, id); }
    } catch (e) { /* ignore */ }
    if (!id) id = localStorage.getItem(REGISTRY_KEY);
    if (!id && SHARED.registryId) id = SHARED.registryId;
    if (id) return id;

    try {
      const r = await fetch(SHARED.createUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ camps: {}, version: 1, lastUpdated: Date.now() })
      });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const j = await r.json();
      id = j.id || (j.uri && j.uri.split('/').pop());
      if (id) {
        localStorage.setItem(REGISTRY_KEY, id);
        console.log('[共享注册表] 已创建新 ID:', id);
      }
      return id;
    } catch (e) {
      console.warn('[共享注册表] 创建失败，仅本地模式', e);
      return null;
    }
  }

  async function fetchRegistry() {
    const id = await ensureRegistryId();
    if (!id) return null;
    try {
      const r = await fetch(SHARED.baseUrl + id, { cache: 'no-store' });
      if (!r.ok) { SHARED._netOk = false; return null; }
      SHARED._netOk = true;
      return await r.json();
    } catch (e) {
      SHARED._netOk = false;
      return null;
    }
  }

  async function pushRegistry(reg) {
    const id = await ensureRegistryId();
    if (!id) return false;
    try {
      const r = await fetch(SHARED.baseUrl + id, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reg)
      });
      SHARED._netOk = r.ok;
      return r.ok;
    } catch (e) {
      SHARED._netOk = false;
      return false;
    }
  }

  function myCampEntry() {
    const st = window.state;
    const pop = st.adventurers.length;
    const avgHappy = pop ? Math.round(st.adventurers.reduce((s, a) => s + a.happiness, 0) / pop) : 0;
    const avgIntegrity = pop ? Math.round(st.adventurers.reduce((s, a) => s + a.integrity, 0) / pop) : 0;
    return {
      id: st.campId,
      name: st.campName,
      day: st.day,
      population: pop,
      buildings: Object.keys(st.buildings).length,
      prosperity: Math.round(window.prosperity()),
      avgHappiness: avgHappy,
      avgIntegrity: avgIntegrity,
      crimeLevel: Math.round(st.crime.level),
      gold: st.res.金币,
      updated: Date.now()
    };
  }

  async function publishMyCamp(force) {
    if (!SHARED.enabled) return;
    if (SHARED._uploading) return;
    const now = Date.now();
    if (!force && now - SHARED._lastUpload < SHARED.uploadThrottle) return;
    SHARED._uploading = true;
    try {
      for (let i = 0; i < 3; i++) {
        const reg = await fetchRegistry() || { camps: {}, version: 1, lastUpdated: now };
        if (!reg.camps) reg.camps = {};
        reg.camps[window.state.campId] = myCampEntry();
        reg.lastUpdated = now;
        const ok = await pushRegistry(reg);
        if (ok) { SHARED._lastUpload = now; SHARED._netOk = true; updateNetTag(); return; }
        await new Promise(r => setTimeout(r, 400 + i * 400));
      }
    } finally {
      SHARED._uploading = false;
      updateNetTag();
    }
  }

  function updateNetTag() {
    const t = document.getElementById('netTag');
    if (!t) return;
    if (SHARED._netOk) {
      t.innerHTML = '<span class="net-badge on"></span>在线共享';
      t.className = 'tag net-ok';
    } else {
      t.innerHTML = '<span class="net-badge off"></span>离线';
      t.className = 'tag net-bad';
    }
  }

  async function showCampList() {
    const mask = document.getElementById('campListMask');
    const body = document.getElementById('campListBody');
    if (!mask || !body) { console.error('找不到 campListMask/campListBody'); return; }
    body.innerHTML = '<div style="text-align:center;padding:24px;color:#8892a0;">正在加载营地列表...</div>';
    mask.classList.add('on');

    const reg = await fetchRegistry();
    if (!reg) {
      body.innerHTML = '<div style="text-align:center;padding:24px;color:#d9534f;">无法连接到共享注册表。<div style="font-size:12px;color:#8892a0;margin-top:8px;">请检查网络后重试。</div></div>';
      updateNetTag();
      return;
    }
    updateNetTag();

    const camps = Object.values(reg.camps || {}).sort((a, b) => (b.prosperity || 0) - (a.prosperity || 0) || b.updated - a.updated);
    if (!camps.length) {
      body.innerHTML = '<div style="text-align:center;padding:24px;color:#8892a0;">还没有营地被分享。<br>结算一天即可自动上传你的营地。</div>';
      return;
    }

    const me = window.state.campId;
    const regId = localStorage.getItem(REGISTRY_KEY) || '';
    const shareUrl = regId ? (location.origin + location.pathname + '?reg=' + regId) : location.href;

    body.innerHTML = `
      <div style="font-size:12.5px;color:#8892a0;margin-bottom:12px;display:flex;flex-wrap:wrap;gap:8px;align-items:center;">
        <span>共 <b style="color:#e8b93b;">${camps.length}</b> 个营地</span>
        <span>· 你的营地 ID：<code style="color:#4ec9b0;">${me}</code></span>
        <button id="btnCopyReg" style="padding:2px 8px;font-size:11px;margin-left:auto;">复制分享链接</button>
        <button id="btnRefreshList" style="padding:2px 8px;font-size:11px;">刷新</button>
      </div>
      <div class="camplist">
        ${camps.map(c => `
          <div class="camp-card ${c.id === me ? 'mine' : ''}">
            <div class="cname">
              <span>${window.escapeHtml(c.name || '无名营地')}</span>
              ${c.id === me ? '<small>（我的）</small>' : ''}
            </div>
            <div class="cgrid">
              <span>📅 第 <b>${c.day || 0}</b> 天</span>
              <span>👥 <b>${c.population || 0}</b> 人</span>
              <span>🏛 <b>${c.buildings || 0}</b> 建筑</span>
              <span>🌱 <b>${c.prosperity || 0}</b> 繁荣</span>
              <span>😊 <b>${c.avgHappiness || 0}</b> 幸福</span>
              <span>⚖ <b>${100 - (c.crimeLevel || 0)}</b> 治安</span>
              <span>💰 <b>${c.gold || 0}</b> 金币</span>
              <span>🛡 <b>${c.avgIntegrity || 0}</b> 诚信</span>
            </div>
            <div class="ctime">${window.timeAgo(c.updated)} 更新</div>
          </div>
        `).join('')}
      </div>
    `;

    const copyBtn = document.getElementById('btnCopyReg');
    if (copyBtn) copyBtn.addEventListener('click', () => {
      navigator.clipboard.writeText(shareUrl).then(() => {
        copyBtn.textContent = '已复制！';
        setTimeout(() => copyBtn.textContent = '复制分享链接', 1500);
      }).catch(() => prompt('请手动复制以下分享链接：', shareUrl));
    });
    const refreshBtn = document.getElementById('btnRefreshList');
    if (refreshBtn) refreshBtn.addEventListener('click', showCampList);
  }

  /* ★ 只向全局暴露这两个函数 —— 不会与其他文件冲突 */
  window.showCampList = showCampList;
  window.updateNetTag = updateNetTag;
  window.ensureRegistryId = ensureRegistryId;
  window.fetchRegistry = fetchRegistry;
  window.pushRegistry = pushRegistry;
  window.publishMyCamp = publishMyCamp;
  window.myCampEntry = myCampEntry;

  console.log('[shared.js] 已加载');
})();
