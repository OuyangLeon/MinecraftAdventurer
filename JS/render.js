/* ============================================================
   render.js —— 所有渲染函数
   ============================================================ */

/* ---------- 资源栏 ---------- */
function renderRes(){
  $('#resBar').innerHTML = RES_META.map(m=>{
    const v = state.res[m.k] ?? 0;
    const warn = (m.k==='食物' && v<state.adventurers.length*2) ? ' warn' : '';
    return `<div class="res"><span class="ico">${m.i}</span><span>${m.k}</span><span class="val${warn}">${v}</span></div>`;
  }).join('') + `<div class="res"><span class="ico">📅</span><span>第</span><span class="val">${state.day}</span><span>天</span></div>`;
}

/* ---------- 冒险者 ---------- */
function sortAdventurers(list){
  const arr = list.slice();
  switch(currentSort){
    case 'happy-asc': arr.sort((a,b)=>a.happiness-b.happiness); break;
    case 'happy-desc': arr.sort((a,b)=>b.happiness-a.happiness); break;
    case 'fatigue-desc': arr.sort((a,b)=>b.fatigue-a.fatigue); break;
    case 'hp-asc': arr.sort((a,b)=>a.hp-b.hp); break;
    case 'task': arr.sort((a,b)=>(a.task||'').localeCompare(b.task||'')); break;
    case 'name': arr.sort((a,b)=>(a.name||'').localeCompare(b.name||'')); break;
  }
  return arr;
}

function renderAdvs(){
  const list = $('#advList');
  const total = state.adventurers.length;
  const down = state.adventurers.filter(a=>a.status==='昏迷').length;
  const low = state.adventurers.filter(a=>a.happiness<30).length;
  const sick = state.adventurers.filter(a=>(a.diseases||[]).length>0).length;
  const crim = state.adventurers.filter(a=>a.criminal).length;
  const corrupt = state.adventurers.filter(a=>a.corruptCount>0).length;

  $('#advSummary').textContent = total
    ? `共 ${total} 人${down?` · 昏迷 ${down}`:''}${low?` · 低幸福 ${low}`:''}${sick?` · 患病 ${sick}`:''}${crim?` · 罪犯 ${crim}`:''}${corrupt?` · 贪污 ${corrupt}`:''}`
    : '暂无成员';
  $('#popTag').textContent = `人口 ${total}`;

  const wageMonthly = totalMonthlyWage();
  const dtp = daysToPayday();
  const isPay = dtp===0;
  const wt = $('#wageTag');
  if(isPay){ wt.textContent = `💰 月薪 ${wageMonthly.toFixed(1)} · 今天发薪`; wt.className = 'tag payday'; }
  else { wt.textContent = `月薪 ${wageMonthly.toFixed(1)} · 距发薪 ${dtp} 天`; wt.className = 'tag' + (state.res.金币<wageMonthly && dtp<=5 ? ' wage-warn' : ''); }

  const crimeLv = state.crime.level;
  const ct = $('#crimeTag');
  ct.textContent = `治安 ${Math.round(100-crimeLv)} / 100`;
  ct.className = 'tag' + (crimeLv>50?' crime-high':'');

  const jt = $('#joyTag');
  if(state.feast.bonusDays>0){ jt.textContent = `🎊 晚会余韵 ${state.feast.bonusDays} 天`; jt.className = 'tag fire-ready'; }
  else if(state.feast.cooldown>0){ jt.textContent = `🔥 晚会冷却 ${state.feast.cooldown} 天`; jt.className = 'tag'; }
  else { jt.textContent = `🔥 可举办晚会`; jt.className = 'tag fire-ready'; }

  if(!total){ list.innerHTML = `<div class="empty">名册空空如也。<br>点击上方按钮招募第一位冒险者吧。</div>`; return; }

  list.innerHTML = '';
  sortAdventurers(state.adventurers).forEach(adv=> list.appendChild(buildAdvCard(adv)));

  // 绑定：任务切换 & 编辑/解雇
  list.querySelectorAll('.task-select').forEach(sel=>{
    sel.addEventListener('change', e=>{
      const adv = state.adventurers.find(x=>x.id===e.target.dataset.id);
      if(!adv) return;
      const t = e.target.value;
      if(!canDoTask(adv,t)){
        alert(adv.race==='唤藤者' && t==='狩猎' ? '唤藤者无法狩猎。' : '该冒险者无法执行此任务。');
        e.target.value = adv.task;
        return;
      }
      adv.task = t;
      save();
      rerenderOneAdv(adv.id);
      renderCampsite();
    });
  });
  list.querySelectorAll('button[data-act]').forEach(btn=>{
    btn.addEventListener('click', e=>{
      const id = e.target.dataset.id;
      if(e.target.dataset.act==='edit') openModal(id);
      else removeAdv(id);
    });
  });
}

/* 构造单张冒险者卡片 DOM */
function buildAdvCard(adv){
  const data = getAdvData(adv);
  const a = data.attrs, m = data.max;
  const hpPct = clamp(safe(adv.hp)/m.hp*100,0,100);
  const mindPct = clamp(safe(adv.mind)/m.mind*100,0,100);
  const happyPct = clamp(adv.happiness,0,100);
  const fatiguePct = clamp(adv.fatigue,0,100);
  const isDown = adv.status==='昏迷';
  const lowHappy = adv.happiness<30 && !isDown;
  const hasDisease = (adv.diseases||[]).length>0;
  const isCorrupt = adv.corruptCount>0;
  const isRich = adv.wallet>=50;
  const hasBuff = state.feast.bonusDays>0;
  const dirtyCount = (adv.corruptionHistory||[]).length;

  let happyBadge = '';
  if(adv.happiness>=75) happyBadge = `<span class="badge happy-good">幸福 ${Math.round(adv.happiness)}</span>`;
  else if(adv.happiness>=40) happyBadge = `<span class="badge happy-mid">幸福 ${Math.round(adv.happiness)}</span>`;
  else happyBadge = `<span class="badge happy-bad">幸福 ${Math.round(adv.happiness)}</span>`;

  const raceData = RACES[adv.race] || {mech:''};
  const raceBadge = `<span class="badge race" title="${raceData.mech}">${adv.race}</span>`;
  const profBadge = adv.profession ? `<span class="badge prof">专精 · ${adv.profession}</span>` : '';
  const diseaseBadge = hasDisease ? `<span class="badge sick">🤒 ${adv.diseases.map(d=>d.name).join('·')}</span>` : '';
  const crimeBadge = adv.criminal ? `<span class="badge criminal">⚠ 罪犯${adv.crimeRecord>1?`×${adv.crimeRecord}`:''}</span>` : '';
  const prisonBadge = adv.imprisoned>0 ? `<span class="badge imprisoned">🔒 ${adv.imprisoned}天</span>` : '';
  const corruptBadge = isCorrupt ? `<span class="badge corrupt">💸 贪污×${adv.corruptCount}${dirtyCount>0?` · 待查${dirtyCount}`:''}</span>` : '';
  const richBadge = isRich ? `<span class="badge rich">💰 富裕</span>` : '';
  const feastBadge = hasBuff ? `<span class="badge warm">🎊 余韵</span>` : '';

  const invCount = (adv.inventory||[]).length;
  const invTxt = invCount===0 ? '（空）' : (adv.inventory.slice(0,3).join('、') + (invCount>3?`…+${invCount-3}`:''));

  const corruptChance = ((100-adv.integrity)/500 * WAGE_TIERS[state.wageTier].corruptMul * 100).toFixed(1);
  const happyMul = (happinessMul(adv.happiness)*100).toFixed(0);
  const dirtyAmount = (adv.corruptionHistory||[]).reduce((s,h)=>s+h.amount,0);
  const dirtyTxt = dirtyCount>0 ? `<span class="dirty" title="尚未被查获的贪污记录">🕵 待查${dirtyCount}笔·${dirtyAmount.toFixed(1)}🪙</span>` : '';

  const el = document.createElement('div');
  el.className = 'adv'
    + (isDown?' down':'')
    + (adv.task==='建造'?' building-task':'')
    + (lowHappy?' low-happy':'')
    + (hasDisease?' sick':'')
    + (adv.criminal?' criminal':'')
    + (adv.imprisoned>0?' imprisoned':'')
    + (isCorrupt?' corrupt':'')
    + (hasBuff?' buff':'');
  el.dataset.advId = adv.id;
  el.innerHTML = `
    <div class="adv-head"><span class="adv-name">${adv.name}</span>${raceBadge}</div>
    <div class="adv-badges">${happyBadge}${profBadge}${feastBadge}${diseaseBadge}${crimeBadge}${corruptBadge}${richBadge}${prisonBadge}${isDown?'<span class="badge happy-bad">昏迷</span>':''}</div>
    <div class="adv-path"><span>道路：</span>${adv.path} · <span>月薪</span> ${monthlyWage(adv).toFixed(1)}🪙</div>
    <div class="hint" style="font-size:11px;color:#6ab04c;margin-bottom:4px;">⚙ ${raceData.mech}</div>
    <div class="bars">
      <div class="bar"><i class="hp" style="width:${hpPct}%"></i><b>生命 ${adv.hp}/${m.hp}</b></div>
      <div class="bar"><i class="mind" style="width:${mindPct}%"></i><b>心理 ${adv.mind}/${m.mind}</b></div>
      <div class="bar"><i class="happy" style="width:${happyPct}%"></i><b>幸福 ${Math.round(adv.happiness)}/100 · 效率${happyMul}%</b></div>
      <div class="bar"><i class="fatigue" style="width:${fatiguePct}%"></i><b>疲劳 ${Math.round(adv.fatigue)}/100</b></div>
    </div>
    <div class="wallet">
      <span class="coin">💰 ${adv.wallet.toFixed(1)}</span>
      <span class="inv">🎒 ${invTxt}</span>
      <span>诚信 ${Math.round(adv.integrity)} (贪腐${corruptChance}%)</span>
      ${dirtyTxt}
    </div>
    <div class="attrs">${ATTR_KEYS.map(k=>`<span>${ATTR_ICON[k]}${k} <em>${a[k]}</em></span>`).join('')}</div>
    <div class="attrs" style="margin-top:-2px;">
      <span>先攻 <em>${a.敏捷}</em></span>
      <span>劳作 <em>${adv.stats.worked||0}</em></span>
      <span>娱乐 <em>${adv.stats.entertaining||0}</em></span>
    </div>
    <div class="task-row">
      <select data-id="${adv.id}" class="task-select">
        ${Object.keys(TASKS).map(t=>{
          const dis = canDoTask(adv,t) ? '' : 'disabled';
          const mark = dis ? '✗ ' : '';
          return `<option value="${t}" ${adv.task===t?'selected':''} ${dis}>${mark}${TASKS[t].icon} ${t}</option>`;
        }).join('')}
      </select>
      <button data-act="edit" data-id="${adv.id}">编辑</button>
      <button class="danger" data-act="del" data-id="${adv.id}">解雇</button>
    </div>
  `;
  return el;
}

/* 局部重绘单张卡片（避免滚动丢失） */
function rerenderOneAdv(advId){
  const adv = state.adventurers.find(x=>x.id===advId);
  if(!adv) return;
  const oldEl = document.querySelector(`.adv[data-adv-id="${advId}"]`);
  if(!oldEl) return;
  const newEl = buildAdvCard(adv);
  // 事件
  const sel = newEl.querySelector('.task-select');
  if(sel) sel.addEventListener('change', e=>{
    const a = state.adventurers.find(x=>x.id===e.target.dataset.id);
    if(!a) return;
    const t = e.target.value;
    if(!canDoTask(a,t)){ e.target.value = a.task; return; }
    a.task = t; save(); rerenderOneAdv(a.id); renderCampsite();
  });
  newEl.querySelectorAll('button[data-act]').forEach(btn=>{
    btn.addEventListener('click', e=>{
      const id = e.target.dataset.id;
      if(e.target.dataset.act==='edit') openModal(id);
      else removeAdv(id);
    });
  });
  oldEl.replaceWith(newEl);
}

/* ---------- 日志 ---------- */
function renderLog(){
  const box = $('#logList');
  const filter = currentLogFilter;
  const items = state.log.filter(l=>{
    if(filter==='all') return true;
    if(filter==='important') return ['bad','epic','warn','day'].includes(l.type);
    if(filter==='combat') return /受伤|夜袭|罪犯|战斗|巡逻/.test(l.text);
    if(filter==='econ') return /金币|工资|食物|木材|石头|铁|绿宝石|产出|商/.test(l.text);
    return true;
  });
  box.innerHTML = items.slice(0,150).map(l=>
    `<div class="log-item ${l.type}"><span class="d">D${l.day}</span>${l.text}</div>`
  ).join('');
}

/* ---------- 营地 ---------- */
function renderCampsite(){
  const E = getCamp();
  const pop = state.adventurers.length;
  const crimeLv = state.crime.level;
  const wageMonthly = totalMonthlyWage();
  const dtp = daysToPayday();
  const isPay = dtp===0;

  $('#campOverview').innerHTML = `
    <div><span>人口 / 床位</span><b>${pop} / ${E.床位}</b></div>
    <div class="good"><span>幸福加成</span><b>+${E.幸福度}</b></div>
    <div class="good"><span>每日幸福</span><b>+${E.每日幸福}</b></div>
    <div><span>休息恢复</span><b>×${E.休息倍率.toFixed(2)}</b></div>
    <div><span>娱乐加成</span><b>×${E.娱乐加成.toFixed(2)}</b></div>
    <div><span>食物减免</span><b>${E.食物减免}</b></div>
    <div class="${state.res.金币<wageMonthly?'danger':'good'}"><span>月薪支出</span><b>${wageMonthly.toFixed(1)}</b></div>
    <div class="${isPay?'good':''}"><span>距离发薪</span><b>${isPay?'今天':dtp+'天'}</b></div>
    <div class="${crimeLv>50?'danger':crimeLv>25?'':'good'}"><span>犯罪率</span><b>${Math.round(crimeLv)}</b></div>
    <div><span>治安所</span><b>${state.buildings['治安所']||0}</b></div>
    <div><span>反腐加成</span><b>×${E.反腐加成.toFixed(2)}</b></div>
    <div><span>已建</span><b>${Object.keys(state.buildings).length}/${Object.keys(BUILDINGS).length}</b></div>
  `;

  const feast = canFeast();
  const joyInfo = $('#joyInfo');
  let joyText = `消耗 食物 ${FEAST_COST.食物} · 金币 ${FEAST_COST.金币}，全员幸福 +15~25 并获得 3 天余韵。`;
  if(!feast.ok) joyText = `<span style="color:#e2706a">${feast.reason}</span> · ${joyText}`;
  if(state.feast.bonusDays>0) joyText = `🎊 余韵中（剩 ${state.feast.bonusDays} 天） · ${joyText}`;
  joyInfo.innerHTML = joyText;
  $('#btnFeast').disabled = !feast.ok;

  /* 工程进度条（工期 NaN 已修复） */
  const bar = $('#projectBar');
  if(state.project){
    const pj = state.project;
    const required = Math.max(1, Math.round(safe(pj.required,0) || buildingWork(pj.key, pj.targetLevel||1) || 1));
    const progress = Math.max(0, Math.round(safe(pj.progress,0)));
    const pct = clamp(progress / required * 100, 0, 100);
    const b = BUILDINGS[pj.key] || {icon:'🔨'};
    const already = state.buildings[pj.key] || 0;
    const title = already > 0
      ? `${b.icon||'🔨'} ${pj.key} 升级 → Lv.${pj.targetLevel||(already+1)}`
      : `${b.icon||'🔨'} ${pj.key} 建造 → Lv.1`;
    const builders = state.adventurers.filter(a=>a.task==='建造'&&a.status!=='昏迷'&&a.imprisoned===0).length;
    bar.className = 'project-bar';
    bar.innerHTML = `
      <span>🚧 <b style="color:#e8b93b">${title}</b> · 施工 ${builders} 人</span>
      <div class="prog"><i style="width:${pct}%"></i><b>${progress} / ${required}</b></div>
      <button data-act="cancel" style="font-size:12px;">放弃</button>
    `;
    bar.querySelector('button[data-act="cancel"]').addEventListener('click', cancelProject);
  } else {
    bar.className = 'project-bar none';
    bar.innerHTML = `<span>当前没有进行中的工程。点击下方建筑卡片即可开工或升级。</span>`;
  }

  const grid = $('#buildingGrid');
  grid.innerHTML = Object.entries(BUILDINGS).map(([k,b])=>{
    const lv = state.buildings[k]||0;
    const isMax = lv>=5;
    const building = state.project && state.project.key===k;
    const targetLv = lv+1;
    const cost = buildingCost(k,targetLv);
    const work = buildingWork(k,targetLv);
    const affordable = Object.entries(cost).every(([r,v])=>(state.res[r]||0)>=v);

    let cls, statusTxt;
    if(isMax){ cls='maxed'; statusTxt='已满级'; }
    else if(building){ cls='building'; statusTxt='施工中'; }
    else if(lv>0){ cls='built'; statusTxt=`Lv.${lv}`; }
    else if(affordable){ cls='ready'; statusTxt='可开工'; }
    else { cls='locked'; statusTxt='资源不足'; }

    const costTxt = Object.entries(cost).map(([r,v])=>{
      const has = (state.res[r]||0)>=v;
      const icon = (RES_META.find(m=>m.k===r)||{}).i||'';
      return `<em class="${has?'ok':'miss'}">${icon}${r}${v}</em>`;
    }).join(' ');

    const descTxt = lv>0 ? b.desc(lv) : `<span style="color:#7a8492">Lv.1: ${b.desc(1)}</span>`;
    const actionTxt = isMax
      ? `<span style="color:#e8b93b">满级：${b.desc(5)}</span>`
      : `<span>${lv>0?'升':'建'}→Lv.${targetLv} ${costTxt} · 工${work}</span>`;

    return `
      <div class="bld ${cls}" data-key="${k}">
        <div class="bld-top">
          <span class="bld-icon">${b.icon}</span>
          <span class="bld-name">${k}</span>
          <span class="bld-lv ${isMax?'max':''}">${statusTxt}</span>
        </div>
        <div class="bld-desc">${descTxt}</div>
        <div class="bld-cost">${actionTxt}</div>
      </div>
    `;
  }).join('');

  grid.querySelectorAll('.bld').forEach(el=>{
    el.addEventListener('click', ()=>startProject(el.dataset.key));
  });
}

/* ---------- 目标 ---------- */
function renderGoals(){
  const list = $('#goalList');
  list.innerHTML = GOALS.map(g=>{
    const done = state.goalDone && state.goalDone[g.id];
    const reward = g.reward ? Object.entries(g.reward).map(([k,v])=>{
      const icon = (RES_META.find(m=>m.k===k)||{}).i||'';
      return `${icon}${k}+${v}`;
    }).join(' ') : '';
    return `
      <div class="goal ${done?'done':''}">
        <div class="goal-title">${g.name}</div>
        <div class="goal-desc">${g.desc}</div>
        ${reward?`<div class="goal-reward">奖励：${reward}</div>`:''}
      </div>
    `;
  }).join('');
  $('#prosperTag').textContent = `繁荣度：${Math.round(prosperity())} / 100`;
}

/* ---------- 工资 ---------- */
function renderWagePanel(){
  const tier = WAGE_TIERS[state.wageTier];
  $('#wageSlider').value = state.wageTier;
  $('#wageLabel').textContent = tier.name;
  const need = totalMonthlyWage();
  $('#wageDetail').textContent =
    `月薪支出约 ${need.toFixed(1)} 金币（每 ${WAGE_PERIOD} 天）· 幸福 ${tier.happyDelta>=0?'+':''}${tier.happyDelta} · 诚信 ${tier.integrityDelta>=0?'+':''}${tier.integrityDelta}`;
}

/* ---------- 营地名称 ---------- */
function renderCampName(){
  const t = $('#campNameTag');
  if(t) t.textContent = `🏕 ${state.campName} ✏`;
}

/* ---------- 总入口（rAF 节流） ---------- */
let _rafPending = false;
function render(){
  if(_rafPending) return;
  _rafPending = true;
  requestAnimationFrame(()=>{
    _rafPending = false;
    invalidateCache();
    renderRes();
    renderAdvs();
    renderLog();
    renderCampsite();
    renderGoals();
    renderWagePanel();
    renderCampName();
    updateNetTag();
  });
}
function renderNow(){
  invalidateCache();
  renderRes();
  renderAdvs();
  renderLog();
  renderCampsite();
  renderGoals();
  renderWagePanel();
  renderCampName();
  updateNetTag();
}
