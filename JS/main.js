/* ============================================================
   main.js —— 事件绑定与启动（最后加载）
   ============================================================ */

function bindEvents(){
  if(listenersBound) return;
  listenersBound = true;

  /* ---- 顶部工具栏 ---- */
  $('#btnRecruit').addEventListener('click', recruit);
  $('#btnNext').addEventListener('click', nextDay);
  $('#btnStats').addEventListener('click', openStats);
  $('#btnFeast').addEventListener('click', holdFeast);
  $('#btnGoals').addEventListener('click', openGoals);
  $('#btnCamp').addEventListener('click', openCampInfo);
  $('#btnCamps').addEventListener('click', showCampList);
  $('#btnExport').addEventListener('click', exportSave);
  $('#btnImport').addEventListener('click', ()=>$('#fileInput').click());
  $('#fileInput').addEventListener('change', e=>{
    importSave(e.target.files[0]);
    e.target.value = '';
  });

  /* ---- 营地名称 ---- */
  $('#campNameTag').addEventListener('click', openNameEditor);
  $('#btnNameCancel').addEventListener('click', ()=>$('#nameMask').classList.remove('on'));
  $('#btnNameSave').addEventListener('click', saveCampName);
  $('#nameMask').addEventListener('click', e=>{ if(e.target.id==='nameMask') $('#nameMask').classList.remove('on'); });
  $('#inpCampName').addEventListener('keydown', e=>{ if(e.key==='Enter') saveCampName(); });

  /* ---- 工资滑杆 ---- */
  $('#wageSlider').addEventListener('input', e=>{
    state.wageTier = parseInt(e.target.value);
    renderNow(); save();
  });

  /* ---- 招募弹窗 ---- */
  $('#btnRoll').addEventListener('click', ()=>{
    writeBaseToInputs(rollBaseAttrs());
    updatePreview();
  });
  $('#btnPointBuy').addEventListener('click', ()=>{
    const base = {};
    let left = 96;
    ATTR_KEYS.forEach((k,i)=>{
      const rest = ATTR_KEYS.length - i - 1;
      const avg = Math.floor(left / (rest + 1));
      base[k] = clamp(avg + rnd(-2,2), 6, 18);
      left -= base[k];
    });
    let i = 0;
    while(left !== 0 && i < 200){
      const k = ATTR_KEYS[i % 8];
      if(left > 0 && base[k] < 18){ base[k]++; left--; }
      else if(left < 0 && base[k] > 6){ base[k]--; left++; }
      i++;
    }
    writeBaseToInputs(base);
    updatePreview();
  });
  $('#btnCancel').addEventListener('click', closeModal);
  $('#btnSave').addEventListener('click', saveAdv);
  $('#mask').addEventListener('click', e=>{ if(e.target.id==='mask') closeModal(); });

  /* ---- 各类弹窗关闭 ---- */
  $('#btnStatsClose').addEventListener('click', ()=>$('#statsMask').classList.remove('on'));
  $('#statsMask').addEventListener('click', e=>{ if(e.target.id==='statsMask') $('#statsMask').classList.remove('on'); });

  $('#btnGoalsClose').addEventListener('click', ()=>$('#goalsMask').classList.remove('on'));
  $('#goalsMask').addEventListener('click', e=>{ if(e.target.id==='goalsMask') $('#goalsMask').classList.remove('on'); });

  $('#btnCampClose').addEventListener('click', ()=>$('#campMask').classList.remove('on'));
  $('#campMask').addEventListener('click', e=>{ if(e.target.id==='campMask') $('#campMask').classList.remove('on'); });

  $('#btnCampListClose').addEventListener('click', ()=>$('#campListMask').classList.remove('on'));
  $('#campListMask').addEventListener('click', e=>{ if(e.target.id==='campListMask') $('#campListMask').classList.remove('on'); });

  /* ---- 结局弹窗 ---- */
  $('#btnEndContinue').addEventListener('click', ()=>{ $('#endMask').classList.remove('on'); });
  $('#btnEndRestart').addEventListener('click', ()=>{
    if(!confirm('确定要重新开始吗？')) return;
    localStorage.removeItem(SAVE_KEY);
    LEGACY_KEYS.forEach(k=>localStorage.removeItem(k));
    state = null;
    endingsShown = {victory:false, defeat:false};
    bootstrap();
  });

  /* ---- 日志过滤 ---- */
  document.querySelectorAll('#logFilter button').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      document.querySelectorAll('#logFilter button').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      currentLogFilter = btn.dataset.f;
      renderLog();
    });
  });

  /* ---- 排序 ---- */
  $('#sortBy').addEventListener('change', e=>{
    currentSort = e.target.value;
    renderAdvs();
  });

  /* ---- 一键分配 ---- */
  $('#btnRestAll').addEventListener('click', ()=>{
    state.adventurers.forEach(a=>{ a.task = '休息'; });
    renderAdvs(); save();
    addLog('🛏 全员休息。', '');
  });
  $('#btnBuildAll').addEventListener('click', ()=>{
    if(!state.project){ alert('当前没有工程。'); return; }
    state.adventurers.forEach(a=>{
      if(a.status!=='昏迷' && a.imprisoned===0) a.task = '建造';
    });
    renderAdvs(); save();
    addLog('🔨 全员建造。', '');
  });

  /* ---- 重置存档 ---- */
  $('#btnReset').addEventListener('click', ()=>{
    if(!confirm('确定要清空全部进度并重新开始吗？\n建议先导出存档备份。')) return;
    localStorage.removeItem(SAVE_KEY);
    LEGACY_KEYS.forEach(k=>localStorage.removeItem(k));
    state = null;
    endingsShown = {victory:false, defeat:false};
    bootstrap();
  });

  /* ---- Esc 关闭弹窗 ---- */
  document.addEventListener('keydown', e=>{
    if(e.key==='Escape'){
      closeModal();
      $('#statsMask').classList.remove('on');
      $('#goalsMask').classList.remove('on');
      $('#campMask').classList.remove('on');
      $('#nameMask').classList.remove('on');
      $('#campListMask').classList.remove('on');
    }
  });
}

function bootstrap(){
  state = load();
  if(!state){
    state = defaultState();
    const seeds = [
      ['艾琳娜','人类','神秘使'],
      ['格罗姆','骷髅','受契之人'],
      ['缇娅','猪灵','炼金术士'],
      ['布洛姆','人类','凡俗者'],
      ['薇拉','猪灵','神秘使']
    ];
    seeds.forEach(([n,r,p])=>{
      const adv = newAdventurer(n,r,p,rollBaseAttrs());
      if(Math.random()<.6) adv.inventory.push(pick(PERSONAL_ITEMS));
      state.adventurers.push(adv);
    });
    state.campName = pick(['翠','金','石','铁','木','水','火','风','雷','霜'])+'石营地';
    state.campId = 'camp_' + Date.now().toString(36) + Math.random().toString(36).slice(2,6);
    addLog(`🏕 你在主世界边缘建立了一处小小据点「${state.campName}」，冒险者们慕名而来。`, 'epic');
    addLog('提示：巡逻有机会查获贪污并追回赃款；点击营地名称可改名。', '');
    save();
  }
  if(!state.campName) state.campName = pick(['翠','金','石','铁','木','水','火','风','雷','霜'])+'石营地';
  if(!state.campId) state.campId = 'camp_' + Date.now().toString(36) + Math.random().toString(36).slice(2,6);

  validateState();

  initModalSelects();
  bindEvents();
  renderNow();

  // 首次启动异步初始化共享注册表
  setTimeout(async ()=>{
    const id = await ensureRegistryId();
    if (id){
      console.log('[共享注册表] ID: ' + id);
      await publishMyCamp(true);
      updateNetTag();
    }
  }, 500);
}

/* ★ 新增：防止 UI 初始化重复执行 */
var _uiInitialized = false;
var _sharedInitScheduled = false;

function bootstrap(){
  state = load();
  if(!state){
    state = defaultState();
    const seeds = [
      ['艾琳娜','人类','神秘使'],
      ['格罗姆','骷髅','受契之人'],
      ['缇娅','猪灵','炼金术士'],
      ['布洛姆','人类','凡俗者'],
      ['薇拉','猪灵','神秘使']
    ];
    seeds.forEach(([n,r,p])=>{
      const adv = newAdventurer(n,r,p,rollBaseAttrs());
      if(Math.random()<.6) adv.inventory.push(pick(PERSONAL_ITEMS));
      state.adventurers.push(adv);
    });
    state.campName = pick(['翠','金','石','铁','木','水','火','风','雷','霜'])+'石营地';
    state.campId = 'camp_' + Date.now().toString(36) + Math.random().toString(36).slice(2,6);
    addLog(`🏕 你在主世界边缘建立了一处小小据点「${state.campName}」，冒险者们慕名而来。`, 'epic');
    addLog('提示：巡逻有机会查获贪污并追回赃款；点击营地名称可改名。', '');
    save();
  }
  if(!state.campName) state.campName = pick(['翠','金','石','铁','木','水','火','风','雷','霜'])+'石营地';
  if(!state.campId) state.campId = 'camp_' + Date.now().toString(36) + Math.random().toString(36).slice(2,6);

  validateState();

  // ★ 只在首次初始化 UI 结构（下拉框、属性输入等）
  if(!_uiInitialized){
    initModalSelects();
    _uiInitialized = true;
  }

  bindEvents();  // 有 listenersBound 保护，只绑定一次
  renderNow();

  // ★ 共享注册表初始化只跑一次，避免重复 setTimeout
  if(!_sharedInitScheduled){
    _sharedInitScheduled = true;
    setTimeout(async ()=>{
      const id = await ensureRegistryId();
      if (id){
        console.log('[共享注册表] ID: ' + id);
        await publishMyCamp(true);
        updateNetTag();
      }
    }, 500);
  }
}
