/* ============================================================
   modals.js —— 所有弹窗与导入导出
   ============================================================ */

/* ---------- 招募/编辑弹窗 ---------- */
function initModalSelects(){
  $('#f-race').innerHTML = Object.keys(RACES).map(r=>`<option value="${r}">${r}</option>`).join('');
  $('#f-path').innerHTML = Object.keys(PATHS).map(p=>`<option value="${p}">${p}</option>`).join('');
  $('#attrGrid').innerHTML = ATTR_KEYS.map(k=>`
    <div class="cell">
      <label>${ATTR_ICON[k]} ${k}</label>
      <input type="number" min="1" max="18" data-attr="${k}" value="10">
      <div class="mod" data-mod="${k}"></div>
    </div>
  `).join('');
  $('#attrGrid').querySelectorAll('input').forEach(inp=>{
    inp.addEventListener('input', updatePreview);
  });
  $('#f-race').addEventListener('change', updatePreview);
  $('#f-path').addEventListener('change', updatePreview);
}
function readBaseFromInputs(){
  const o = {};
  ATTR_KEYS.forEach(k=>{
    const inp = $(`#attrGrid input[data-attr="${k}"]`);
    o[k] = clamp(parseInt(inp.value)||10, 1, 18);
  });
  return o;
}
function writeBaseToInputs(obj){
  ATTR_KEYS.forEach(k=>{
    const el = $(`#attrGrid input[data-attr="${k}"]`);
    if(el) el.value = obj[k];
  });
}
function updatePreview(){
  const base = readBaseFromInputs();
  const race = $('#f-race').value;
  const mod = (RACES[race]||{mod:{}}).mod;
  ATTR_KEYS.forEach(k=>{
    const el = $(`#attrGrid .mod[data-mod="${k}"]`);
    if(!el) return;
    const mv = mod[k]||0;
    el.textContent = mv ? (mv>0?'+'+mv:mv) : '';
    el.className = 'mod ' + (mv>0?'up':mv<0?'down':'');
  });
  const fin = {};
  ATTR_KEYS.forEach(k=>fin[k] = clamp(base[k]+(mod[k]||0), 1, 30));
  const path = $('#f-path').value;
  const pb = PATHS[path] ? PATHS[path].bonus : {};
  const bonusTxt = Object.keys(pb).length ? Object.entries(pb).map(([k,v])=>`${k}+${v}`).join('、') : '无';
  const pathWage = PATHS[path] ? PATHS[path].wage : 0;
  const baseMonthly = 8 + pathWage*2;
  const tier = WAGE_TIERS[state.wageTier];
  $('#preview').innerHTML = `
    <div>最终属性：${ATTR_KEYS.map(k=>`${k} <b>${fin[k]}</b>`).join(' · ')}</div>
    <div style="margin-top:5px;">生命 <b>${fin.体质*2}</b> · 先攻 <b>${fin.敏捷}</b> · 心理 <b>${fin.意志*2}</b></div>
    <div style="margin-top:5px;color:#8892a0;">道路加成：${bonusTxt}</div>
    <div style="margin-top:5px;color:#e8b93b;">月薪预估：约 ${(baseMonthly*tier.mul).toFixed(1)} 金币（${tier.name}档）</div>
    <div style="margin-top:5px;color:#6ab04c;">种族机制：${(RACES[race]||{}).mech||''}</div>
  `;
  $('#raceDesc').textContent = RACES[race] ? RACES[race].desc : '';
}
function openModal(id){
  editingId = id || null;
  const adv = id ? state.adventurers.find(a=>a.id===id) : null;
  $('#modalTitle').textContent = adv ? `编辑 —— ${adv.name}` : '招募冒险者';
  $('#btnSave').textContent = adv ? '保存修改' : '确认招募';
  if(adv){
    $('#f-name').value = adv.name;
    $('#f-race').value = adv.race;
    $('#f-path').value = adv.path;
    writeBaseToInputs(adv.baseAttrs);
  } else {
    $('#f-name').value = genName();
    $('#f-race').value = pick(Object.keys(RACES));
    $('#f-path').value = pick(Object.keys(PATHS));
    writeBaseToInputs(rollBaseAttrs());
  }
  updatePreview();
  $('#mask').classList.add('on');
}
function closeModal(){ $('#mask').classList.remove('on'); editingId = null; }

function recruit(){
  const cost = 30;
  if(state.res.金币<cost){ addLog('❌ 金币不足。','bad'); renderLog(); save(); return; }
  state.res.金币 -= cost;
  openModal(null);
}
function saveAdv(){
  const name = ($('#f-name').value||'').trim() || genName();
  const race = $('#f-race').value;
  const path = $('#f-path').value;
  const base = readBaseFromInputs();
  if(editingId){
    const adv = state.adventurers.find(a=>a.id===editingId);
    if(!adv) return closeModal();
    const oldMax = calcMax(adv);
    adv.name = name; adv.race = race; adv.path = path; adv.baseAttrs = base;
    const newMax = calcMax(adv);
    adv.hp = clamp(Math.round(safe(adv.hp,oldMax.hp)/oldMax.hp*newMax.hp),1,newMax.hp);
    adv.mind = clamp(Math.round(safe(adv.mind,oldMax.mind)/oldMax.mind*newMax.mind),0,newMax.mind);
    addLog(`📝 ${name} 更新。`, '');
  } else {
    const adv = newAdventurer(name, race, path, base);
    if(Math.random()<.7) adv.inventory.push(pick(PERSONAL_ITEMS));
    state.adventurers.push(adv);
    addLog(`🎉 <b>${name}</b>（${race} · ${path}）加入据点！`, 'good');
  }
  closeModal();
  renderNow(); save();
}
function removeAdv(id){
  const adv = state.adventurers.find(a=>a.id===id);
  if(!adv) return;
  if(!confirm(`解雇 ${adv.name}？\n将带走 ${adv.wallet.toFixed(1)} 金币。`)) return;
  state.adventurers = state.adventurers.filter(a=>a.id!==id);
  addLog(`🚪 ${adv.name} 离开据点（带走 ${adv.wallet.toFixed(1)} 金币）。`, 'bad');
  renderNow(); save();
}

/* ---------- 统计弹窗 ---------- */
function openStats(){
  const g = state.totals || {};
  const prod = Object.entries(g.produced||{}).map(([k,v])=>`${k}+${v}`).join(' · ') || '暂无';
  const sick = state.adventurers.filter(a=>(a.diseases||[]).length>0).length;
  const criminals = state.adventurers.filter(a=>a.criminal).length;
  const totalWallet = state.adventurers.reduce((s,a)=>s+a.wallet,0);
  const corruptCount = state.adventurers.filter(a=>a.corruptCount>0).length;
  const dirtyTotal = state.adventurers.reduce((s,a)=>s+(a.corruptionHistory||[]).reduce((x,h)=>x+h.amount,0),0);
  const avgHappy = state.adventurers.length ? Math.round(state.adventurers.reduce((s,a)=>s+a.happiness,0)/state.adventurers.length) : 0;
  let html = `
    <div class="stat-summary">
      <div><span>据点天数</span><b>${state.day}</b></div>
      <div><span>人口</span><b>${state.adventurers.length}</b></div>
      <div><span>平均幸福</span><b>${avgHappy}</b></div>
      <div><span>繁荣度</span><b>${Math.round(prosperity())}</b></div>
      <div><span>累计工资</span><b>${Math.round(g.wages||0)}</b></div>
      <div><span>个人财富</span><b>${Math.round(totalWallet)}</b></div>
      <div><span>累计贪污</span><b>${g.corrupt||0}</b></div>
      <div><span>待查赃款</span><b>${dirtyTotal.toFixed(1)}</b></div>
      <div><span>犯罪率</span><b>${Math.round(state.crime.level)}</b></div>
      <div><span>患病</span><b>${sick}</b></div>
      <div><span>罪犯</span><b>${criminals}</b></div>
      <div><span>贪腐者</span><b>${corruptCount}</b></div>
      <div><span>已建建筑</span><b>${Object.keys(state.buildings).length}/${Object.keys(BUILDINGS).length}</b></div>
      <div style="grid-column:1/-1;"><span>累计产出</span><b>${prod}</b></div>
    </div>
  `;
  if(!state.adventurers.length){
    html += `<div class="empty">暂无冒险者。</div>`;
    $('#statsBody').innerHTML = html;
    $('#statsMask').classList.add('on');
    return;
  }
  state.adventurers.forEach(adv=>{
    const st = adv.stats || {};
    const init = adv.initialAttrs || adv.baseAttrs || {};
    const prodList = Object.entries(st.produced||{}).map(([k,v])=>`${k}+${v}`).join(' ') || '—';
    const dzList = (adv.diseases||[]).map(d=>`${d.name}(${d.days}天)`).join('、') || '—';
    const invList = (adv.inventory||[]).join('、') || '（空）';
    const rows = ATTR_KEYS.map(k=>{
      const v0 = init[k] ?? 10;
      const v1 = adv.baseAttrs[k] ?? 10;
      const dv = v1-v0;
      const dtxt = dv===0 ? '—' : dv>0 ? `<span class="up">+${dv}</span>` : `<span class="down">${dv}</span>`;
      return `<tr><td>${ATTR_ICON[k]} ${k}</td><td>${v0}</td><td><b>${v1}</b></td><td>${dtxt}</td></tr>`;
    }).join('');
    const m = calcMax(adv);
    const corruptChance = ((100-adv.integrity)/500 * WAGE_TIERS[state.wageTier].corruptMul * 100).toFixed(2);
    const dirtyList = (adv.corruptionHistory||[]).map(h=>`D${h.day}·${h.context}·${h.amount}🪙`).join('；') || '—';
    html += `
      <div class="stat-card">
        <div class="stat-name">${adv.name}<span>${adv.race} · ${adv.path}${adv.profession?` · 专精「${adv.profession}」`:''}${adv.status==='昏迷'?' · 昏迷':''}${adv.criminal?' · 罪犯':''}</span></div>
        <table class="stat-table">
          <thead><tr><th>属性</th><th>初始</th><th>当前</th><th>变动</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
        <div class="stat-foot">
          <span>💰 <b>${adv.wallet.toFixed(1)}</b></span>
          <span>月薪 <b>${monthlyWage(adv).toFixed(1)}</b></span>
          <span>诚信 <b>${Math.round(adv.integrity)}</b> (贪腐${corruptChance}%)</span>
          <span>累计工资 <b>${Math.round(st.wageEarned||0)}</b></span>
          <span>贪污 <b>${adv.corruptCount||0}</b></span>
          <span>已追回 <b>${Math.round(st.recovered||0)}</b></span>
          <span>幸福 <b>${Math.round(adv.happiness)}</b></span>
          <span>疲劳 <b>${Math.round(adv.fatigue)}</b></span>
          <span style="flex-basis:100%;">疾病：${dzList}</span>
          <span style="flex-basis:100%;">藏品：${invList}</span>
          <span style="flex-basis:100%;">产出：${prodList}</span>
          <span style="flex-basis:100%;color:#e2706a;">未查获：${dirtyList}</span>
        </div>
      </div>
    `;
  });
  $('#statsBody').innerHTML = html;
  $('#statsMask').classList.add('on');
}

/* ---------- 营地加成弹窗 ---------- */
function openCampInfo(){
  const E = getCamp();
  const rows = [
    ['床位', E.床位], ['幸福度加成', `+${E.幸福度}`], ['每日幸福', `+${E.每日幸福}`],
    ['食物减免', E.食物减免], ['每日食物', `+${E.每日食物}`], ['每日石头', `+${E.每日石头}`],
    ['休息倍率', `×${E.休息倍率.toFixed(2)}`], ['心理恢复', `+${E.心理恢复}`], ['疲劳恢复', `+${E.疲劳恢复}`],
    ['产量倍率', `×${E.产量倍率.toFixed(2)}`], ['伐木倍率', `×${E.伐木倍率.toFixed(2)}`],
    ['耕作倍率', `×${E.耕作倍率.toFixed(2)}`], ['掘矿倍率', `×${E.掘矿倍率.toFixed(2)}`],
    ['铁等级', E.铁等级], ['检定加值', `+${E.检定加值}`],
    ['娱乐加成', `×${E.娱乐加成.toFixed(2)}`], ['夜袭倍率', `×${E.夜袭倍率.toFixed(2)}`],
    ['受伤倍率', `×${E.受伤倍率.toFixed(2)}`], ['治安压制', E.治安压制],
    ['巡逻加成', `×${E.巡逻加成.toFixed(2)}`], ['反腐加成', `×${E.反腐加成.toFixed(2)}`],
    ['痊愈加成', `×${E.痊愈加成.toFixed(2)}`], ['行医加成', `×${E.行医加成.toFixed(2)}`],
    ['传染压制', `×${E.传染压制.toFixed(2)}`], ['患病压制', `×${E.患病压制.toFixed(2)}`]
  ];
  $('#campBody').innerHTML = `
    <p style="color:#8892a0;font-size:12.5px;margin-bottom:10px;">所有已建造建筑的累计效果。</p>
    ${rows.map(([k,v])=>`<div class="info-row"><span>${k}</span><b>${v}</b></div>`).join('')}
  `;
  $('#campMask').classList.add('on');
}

/* ---------- 目标弹窗 ---------- */
function openGoals(){
  $('#goalsBody').innerHTML = `
    <p style="color:#8892a0;font-size:12.5px;margin-bottom:10px;">当前繁荣度：<b style="color:#e8b93b;">${Math.round(prosperity())} / 100</b></p>
    <div class="goal-list">
      ${GOALS.map(goal=>{
        const done = state.goalDone && state.goalDone[goal.id];
        const reward = goal.reward ? Object.entries(goal.reward).map(([k,v])=>{
          const icon = (RES_META.find(m=>m.k===k)||{}).i||'';
          return `${icon}${k}+${v}`;
        }).join(' ') : '';
        return `
          <div class="goal ${done?'done':''}">
            <div class="goal-title">${goal.name}</div>
            <div class="goal-desc">${goal.desc}</div>
            ${reward?`<div class="goal-reward">奖励：${reward}</div>`:''}
          </div>
        `;
      }).join('')}
    </div>
    <div style="margin-top:14px;padding-top:10px;border-top:1px dashed #333c47;">
      <div style="color:#6ab04c;font-size:13px;font-weight:700;">🏆 胜利条件</div>
      <div style="font-size:12.5px;color:#c8d2de;margin-top:4px;">繁荣度达到 100（当前 ${Math.round(prosperity())}）</div>
      <div style="color:#d9534f;font-size:13px;font-weight:700;margin-top:10px;">💀 失败条件</div>
      <div style="font-size:12.5px;color:#c8d2de;margin-top:4px;">人口归零（当前 ${state.adventurers.length}）</div>
    </div>
  `;
  $('#goalsMask').classList.add('on');
}

/* ---------- 营地名称 ---------- */
function openNameEditor(){
  $('#inpCampName').value = state.campName;
  $('#nameMask').classList.add('on');
  setTimeout(()=>$('#inpCampName').focus(), 50);
}
function saveCampName(){
  const v = ($('#inpCampName').value || '').trim().slice(0,16);
  if(!v){ alert('请输入营地名称。'); return; }
  state.campName = v;
  $('#nameMask').classList.remove('on');
  renderCampName();
  save();
  addLog(`🏕 营地更名为「${v}」`, 'good');
  publishMyCamp(true);
}

/* ---------- 事件弹窗 ---------- */
function showNextEvent(){
  if(!pendingEvents.length) return;
  const ev = pendingEvents[0];
  $('#eventTitle').textContent = ev.title;
  $('#eventDesc').textContent = ev.desc;
  const box = $('#eventChoices');
  box.innerHTML = '';
  ev.choices.forEach((c, i)=>{
    const btn = document.createElement('button');
    btn.innerHTML = c.text;
    btn.addEventListener('click', ()=>{
      const chosen = pendingEvents.shift();
      const lines = [];
      try { chosen.choices[i].effect(state, (text, type)=>{
        lines.push({text, type: type||''});
      }); } catch(e){ console.error(e); }
      lines.forEach(l=>addLog(l.text, l.type));
      $('#eventMask').classList.remove('on');
      renderNow(); save();
      if(pendingEvents.length) setTimeout(()=>showNextEvent(), 300);
    });
    box.appendChild(btn);
  });
  $('#eventMask').classList.add('on');
}

/* ---------- 导入导出 ---------- */
function exportSave(){
  try {
    const data = JSON.stringify(state, null, 2);
    const blob = new Blob([data], {type:'application/json;charset=utf-8'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const stamp = new Date().toISOString().slice(0,10);
    a.href = url;
    a.download = `MC冒险者模拟器_${state.campName}_第${state.day}天_${stamp}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(()=>URL.revokeObjectURL(url),1000);
    addLog('💾 存档已导出。', 'good');
    renderLog(); save();
  } catch(e){ alert('导出失败：'+e.message); }
}
function importSave(file){
  if(!file) return;
  const reader = new FileReader();
  reader.onload = e=>{
    try {
      const raw = JSON.parse(e.target.result);
      if(!raw || !Array.isArray(raw.adventurers)) throw new Error('文件不是有效存档');
      state = migrate(raw);
      validateState();
      save();
      renderNow();
      addLog(`📂 已导入存档：第 ${state.day} 天，${state.adventurers.length} 名冒险者。`, 'good');
      renderLog(); save();
      alert(`导入成功！\n当前进度：第 ${state.day} 天，${state.adventurers.length} 名冒险者。`);
    } catch(err){
      alert('导入失败：'+err.message);
    }
  };
  reader.onerror = ()=>alert('读取文件失败。');
  reader.readAsText(file, 'utf-8');
}
