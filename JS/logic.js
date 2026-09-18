/* ============================================================
   logic.js —— 游戏核心逻辑：结算、贪污、巡逻、事件
   ★ 已修复食物产出未入库的 bug
   ============================================================ */

/* ---------- 建筑 ---------- */
function buildingCost(key,targetLevel){
  const b = BUILDINGS[key];
  if(!b) return {};
  const lv = Math.max(1, Math.floor(targetLevel)||1);
  const p = Math.pow(safe(b.costMul,1.5), lv-1);
  const out = {};
  for(const [r,v] of Object.entries(b.baseCost||{})) out[r] = Math.round(v*p);
  return out;
}
function buildingWork(key,targetLevel){
  const b = BUILDINGS[key];
  if(!b) return 0;
  const lv = Math.max(1, Math.floor(targetLevel)||1);
  const base = safe(b.baseWork, 10);
  const mul = safe(b.workMul, 1.3);
  const result = Math.round(base * Math.pow(mul, lv-1));
  return (isNaN(result) || !isFinite(result) || result <= 0) ? Math.max(1, Math.round(base)) : result;
}
function startProject(k){
  const lv = state.buildings[k]||0;
  if(lv>=5){ alert(`${k} 已满级。`); return; }
  if(state.project){ alert(`已有工程：${state.project.key} → Lv.${state.project.targetLevel}\n先完成或放弃。`); return; }
  const targetLv = lv+1;
  const cost = buildingCost(k,targetLv);
  const missing = Object.entries(cost).filter(([r,v])=>(state.res[r]||0)<v);
  if(missing.length){ alert('资源不足：\n'+missing.map(([r,v])=>`${r} 需 ${v}，有 ${state.res[r]||0}`).join('\n')); return; }
  Object.entries(cost).forEach(([r,v])=>{ state.res[r]-=v; });
  const required = buildingWork(k,targetLv);
  state.project = {key:k, targetLevel:targetLv, progress:0, required:Math.max(1, required)};
  const verb = lv>0?'升级':'建造';
  addLog(`🔨 开始${verb} <b>${k}</b> → Lv.${targetLv}（工时 ${state.project.required}）`, 'epic');
  renderNow(); save();
}
function cancelProject(){
  if(!state.project) return;
  const pj = state.project;
  if(!confirm(`放弃「${pj.key} → Lv.${pj.targetLevel}」？工时全废，材料不退。`)) return;
  addLog(`🚫 放弃工程「${pj.key}」`, 'bad');
  state.project = null;
  renderNow(); save();
}

/* ---------- 篝火晚会 ---------- */
function canFeast(){
  if(!state.adventurers.length) return {ok:false, reason:'据点空无一人'};
  if(state.feast.cooldown>0) return {ok:false, reason:`冷却中（还需 ${state.feast.cooldown} 天）`};
  for(const [r,v] of Object.entries(FEAST_COST)){
    if((state.res[r]||0)<v) return {ok:false, reason:`${r} 不足（需 ${v}）`};
  }
  return {ok:true};
}
function holdFeast(){
  const check = canFeast();
  if(!check.ok){ alert('无法举办：'+check.reason); return; }
  if(!confirm(`举办篝火晚会？\n食物 -${FEAST_COST.食物}，金币 -${FEAST_COST.金币}\n全员幸福大幅提升 + 3 天余韵。`)) return;
  for(const [r,v] of Object.entries(FEAST_COST)) state.res[r]-=v;
  state.totals.feasts = (state.totals.feasts||0)+1;
  const baseHappy = rnd(15,25);
  state.adventurers.forEach(adv=>{
    if(adv.status==='昏迷') return;
    adv.happiness = clamp(adv.happiness+baseHappy,0,100);
    adv.mind = Math.min(calcMax(adv).mind, adv.mind+rnd(3,8));
    adv.fatigue = clamp(adv.fatigue-20,0,100);
    adv.stats.feastHappy += baseHappy;
  });
  state.feast.bonusDays = 3;
  state.feast.cooldown = 5;
  state.feast.lastDay = state.day;
  addLog(`🎊 篝火晚会！全员幸福 +${baseHappy}，持续 3 天余韵。`, 'epic');
  renderNow(); save();
}

/* ---------- 个人消费 ---------- */
function tryPersonalSpending(adv, lines){
  if(adv.status==='昏迷' || adv.imprisoned>0) return;
  if(adv.happiness>=80) return;
  if(adv.race==='猪灵'){
    if(Math.random()<.25){
      const g = rnd(2,8);
      adv.wallet += g;
      lines.push({text:`🐷 <b>${adv.name}</b> 在酒馆妙语连珠，赢得 ${g} 金币。`, type:'epic'});
    }
    return;
  }
  if(adv.wallet<2) return;
  const desire = (80-adv.happiness)/80;
  if(Math.random() > desire*0.15) return;
  const affordable = SPENDING_OPTIONS.filter(o=>o.cost<=adv.wallet);
  if(!affordable.length) return;
  const choice = pick(affordable);
  adv.wallet = Math.round((adv.wallet-choice.cost)*10)/10;
  adv.stats.spent = Math.round((adv.stats.spent||0)+choice.cost*10)/10;
  let happy = choice.happy;
  let desc = choice.desc;
  if(choice.risk){
    if(Math.random()<.4){ happy = -Math.max(2,Math.round(choice.happy/2)); desc = '赌输了'; }
    else if(Math.random()<.15){ const win = rnd(5,15); adv.wallet+=win; happy = choice.happy+5; desc = `赢回 ${win} 金币`; }
  }
  if(choice.item && adv.inventory.length<15){
    const item = pick(PERSONAL_ITEMS);
    if(!adv.inventory.includes(item)){ adv.inventory.push(item); desc += `（${item}）`; }
  }
  if(choice.teamHappy){
    state.adventurers.forEach(t=>{
      if(t.id===adv.id) return;
      if(t.status==='昏迷'||t.imprisoned>0) return;
      t.happiness = clamp(t.happiness+choice.teamHappy,0,100);
      t.stats.feastHappy += choice.teamHappy;
    });
  }
  adv.happiness = clamp(adv.happiness+happy,0,100);
  if(happy>0) adv.stats.feastHappy += happy;
  if(happy>0) lines.push({text:`🛍 <b>${adv.name}</b> ${choice.name}（${choice.cost}🪙），幸福 +${happy}。`, type:''});
  else lines.push({text:`🛍 <b>${adv.name}</b> ${choice.name}，${desc}。`, type:'warn'});
}

/* ---------- 贪污 ---------- */
function maybeCorrupt(adv, context, lines, gain, resourceKey){
  const tier = WAGE_TIERS[state.wageTier];
  let chance = (100-adv.integrity)/500;
  chance *= tier.corruptMul;
  if(adv.happiness<30) chance *= 1.5;
  if(state.res.金币 < totalMonthlyWage()*.5) chance *= 1.6;
  if(adv.wallet>50) chance *= 1.2;
  if(adv.corruptCount>0) chance *= 1.4;
  if(Math.random()>=chance) return;
  adv.corruptCount++;
  adv.integrity = clamp(adv.integrity-8,0,100);
  state.totals.corrupt++;
  adv.stats.corruption++;

  let amount = 0;
  let contextDesc = '';
  if(context==='建造'){
    amount = rnd(2,6);
    adv.wallet += amount;
    if(state.project) state.project.progress = Math.max(0, state.project.progress-rnd(1,3));
    contextDesc = '虚报建造材料';
    lines.push({text:`💸 <b>${adv.name}</b> 建造中虚报材料，私吞 ${amount} 金币。`, type:'warn'});
  } else if(context==='生产' && gain && resourceKey){
    const skim = Math.max(1,Math.round(gain[resourceKey]*.15));
    if(gain[resourceKey]>=skim){
      gain[resourceKey] -= skim;
      const gold = skim*2;
      adv.wallet += gold;
      amount = gold;
      contextDesc = `克扣${resourceKey}`;
      lines.push({text:`💸 <b>${adv.name}</b> 克扣${resourceKey} ${skim} 单位，转卖得 ${gold} 金币。`, type:'warn'});
    }
  }

  if(amount > 0){
    if(!adv.corruptionHistory) adv.corruptionHistory = [];
    adv.corruptionHistory.push({
      day: state.day,
      amount: Math.round(amount*10)/10,
      context: contextDesc
    });
    if(adv.corruptionHistory.length > 20) adv.corruptionHistory.shift();
  }

  if(Math.random()<.25){
    adv.happiness = clamp(adv.happiness-8,0,100);
    lines.push({text:`👀 <b>${adv.name}</b> 的不轨行为被察觉。`, type:'warn'});
    if((state.buildings['治安所']||0)>0){
      adv.imprisoned = rnd(1,2);
      adv.task = '休息';
      lines.push({text:`⚖ <b>${adv.name}</b> 因贪污被捕，监禁 ${adv.imprisoned} 天。`, type:'bad'});
    }
  }
}

/* ---------- 任务产出 ---------- */
function calcYield(adv, task, g, E){
  const a = getAttrs(adv);
  const t = TASKS[task];
  if(!t || t.base===0) return 0;
  const attrVal = a[t.attrKey] || 10;
  const attrMul = t.attrScale + (attrVal/20) * (1 - t.attrScale) + (attrVal/20 - .5) * .3;
  const eff = happinessMul(adv.happiness) * diseaseWorkMul(adv) * raceWorkMul(adv, task);
  let mult = E.产量倍率 * eff * attrMul;
  if(task==='伐木') mult *= E.伐木倍率;
  if(task==='耕作') mult *= E.耕作倍率;
  if(task==='掘矿') mult *= E.掘矿倍率;
  const profProd = (adv.taskCount[task]||0)>=15 ? 1.25 : (adv.taskCount[task]||0)>=8 ? 1.1 : 1;
  mult *= profProd;
  const roll = .85 + Math.random()*.3;
  let amount = Math.round(t.base * g.m * roll * mult);

  if(task === '狩猎'){
    if(g.k === 'S') amount = Math.round(amount * 1.8);
    else if(g.k === 'A') amount = Math.round(amount * 1.5);
    else if(g.k === 'B') amount = Math.round(amount * 1.2);
  }

  if(g.k==='F') amount = 0;
  return Math.max(0, amount);
}

/* ---------- 巡逻查获贪污 ---------- */
function patrolInvestigate(patrolAdv, g, E, lines){
  const suspects = state.adventurers.filter(x =>
    x.id !== patrolAdv.id &&
    (x.corruptionHistory || []).length > 0 &&
    x.status !== '昏迷' &&
    x.imprisoned === 0
  );
  if(!suspects.length) return;

  const baseCatch = {'F':0,'E':0.05,'D':0.15,'C':0.35,'B':0.55,'A':0.75,'S':0.9}[g.k] || 0;
  const finalChance = clamp(baseCatch * E.反腐加成, 0, 0.95);
  if(finalChance <= 0) return;

  let caught = 0, totalRecovered = 0;

  suspects.forEach(suspect => {
    const history = suspect.corruptionHistory || [];
    if(!history.length) return;
    const totalStolen = history.reduce((s,h)=>s+h.amount, 0);
    if(Math.random() >= finalChance) return;

    const recovery = Math.min(suspect.wallet, totalStolen);
    suspect.wallet = Math.round((suspect.wallet - recovery)*10)/10;
    suspect.stats.recovered = Math.round((suspect.stats.recovered||0) + recovery, 10)/10;
    state.res.金币 = (state.res.金币||0) + Math.round(recovery);

    suspect.integrity = clamp(suspect.integrity - 25, 0, 100);
    suspect.happiness = clamp(suspect.happiness - 15, 0, 100);
    suspect.criminal = true;
    suspect.crimeRecord = (suspect.crimeRecord||0) + 1;

    const hasGuard = (state.buildings['治安所']||0) > 0;
    const imprisonDays = hasGuard ? rnd(3,6) : rnd(2,4);
    suspect.imprisoned = imprisonDays;
    suspect.task = '休息';
    suspect.corruptionHistory = [];

    patrolAdv.happiness = clamp(patrolAdv.happiness + 3, 0, 100);
    caught++;
    totalRecovered += recovery;

    const detail = history.length >= 3 ? `${history.length} 起案件`
      : history.map(h => h.context).join('、');
    lines.push({
      text: `🚔 <b>${patrolAdv.name}</b> 在巡逻中查获了 <b>${suspect.name}</b> 的贪污行为（${detail}）！追回 ${recovery.toFixed(1)} 金币，判处监禁 ${imprisonDays} 天。`,
      type: 'epic'
    });
  });

  if(caught === 0 && g.m >= 1.5 && suspects.length > 0){
    lines.push({
      text: `🕵 <b>${patrolAdv.name}</b> 察觉到据点内似有贪墨迹象，但尚未查实。`,
      type: 'warn'
    });
  } else if(totalRecovered > 0){
    lines.push({
      text: `💰 本次巡逻共追回 ${totalRecovered.toFixed(1)} 金币。`,
      type: 'good'
    });
  }
}

/* ============================================================
   子函数：单个冒险者执行行动
   ============================================================ */
function _runOneAdventurer(adv, E, gain, lines){
  const result = { rest:null, work:null, entertain:0, build:0, important:[] };

  const a = getAttrs(adv);
  const max = calcMax(adv);

  if(adv.imprisoned>0) return result;

  if(adv.status==='昏迷'){
    if(Math.random()<.35){
      adv.status = '正常';
      adv.hp = Math.max(1,Math.round(max.hp*.3));
      adv.task = '休息';
      result.important.push({text:`💫 <b>${adv.name}</b> 苏醒。`, type:'epic'});
    }
    return result;
  }

  const task = TASKS[adv.task] || TASKS['休息'];

  /* ---- 休息 ---- */
  if(adv.task==='休息'){
    const restMul = Math.max(.5, safe(E.休息倍率,1));
    const heal = Math.max(3, Math.round(max.hp*.40*restMul));
    const mheal = Math.max(3, Math.round(max.mind*.50*restMul)) + safe(E.心理恢复,0);
    const before = adv.hp;
    adv.hp = Math.min(max.hp, adv.hp+heal);
    adv.mind = Math.min(max.mind, adv.mind+mheal);
    adv.stats.healed = (adv.stats.healed||0) + (adv.hp-before);
    adv.consecutiveWork = 0;
    adv.fatigue = clamp(adv.fatigue-65,0,100);
    const restHappy = 8 + Math.round((state.buildings['住房']||0)*2);
    adv.happiness = clamp(adv.happiness+restHappy,0,100);
    adv.stats.feastHappy += restHappy;
    result.rest = {name:adv.name, hp:adv.hp-before, mind:mheal, happy:restHappy};
    return result;
  }

  /* ---- 建造 ---- */
  if(adv.task==='建造'){
    if(!state.project){
      adv.consecutiveWork++;
      adv.fatigue = clamp(adv.fatigue+4,0,100);
      result.work = {task:'闲着', count:1, total:0};
      return result;
    }
    const eff = happinessMul(adv.happiness) * diseaseWorkMul(adv) * raceWorkMul(adv,'建造');
    const contrib = Math.max(1, Math.round((1+Math.floor(a.力量/6)) * eff));
    const pj = state.project;
    if(typeof pj.required !== 'number' || isNaN(pj.required) || pj.required <= 0){
      pj.required = buildingWork(pj.key, pj.targetLevel||1);
    }
    pj.progress = (typeof pj.progress === 'number' && !isNaN(pj.progress)) ? pj.progress + contrib : contrib;
    adv.stats.worked++;
    adv.workDays++;
    adv.consecutiveWork++;
    adv.fatigue = clamp(adv.fatigue+8,0,100);
    state.totals.worked++;
    result.build = contrib;
    maybeCorrupt(adv,'建造',result.important);
    if(pj.progress >= pj.required){
      const newLv = pj.targetLevel;
      state.buildings[pj.key] = newLv;
      const verb = newLv>1?'升级完成':'建造完成';
      result.important.push({text:`🎉 <b>${pj.key}</b> ${verb}（Lv.${newLv}）！`, type:'epic'});
      state.project = null;
    }
    return result;
  }

  /* ---- 巡逻 ---- */
  if(adv.task==='巡逻'){
    const roll = d(20);
    const total = roll + (a.意志||10) + (a.灵感||10)/2 + E.检定加值;
    const g = grade(total,roll);
    adv.stats.worked++;
    adv.workDays++;
    adv.consecutiveWork++;
    adv.fatigue = clamp(adv.fatigue+5,0,100);
    state.totals.worked++;
    const pressure = (g.m*6+3) * E.巡逻加成;
    state.crime.level = clamp(state.crime.level-pressure,0,100);

    patrolInvestigate(adv, g, E, result.important);

    if(g.k==='F'){
      const dmg = rnd(1,4);
      adv.hp = Math.max(0, adv.hp-dmg);
      adv.stats.injured += dmg;
      state.totals.injured += dmg;
      result.important.push({text:`🛡 <b>${adv.name}</b> 巡逻遇袭，受伤 ${dmg}。`, type:'bad'});
      if(adv.hp<=0){ adv.status='昏迷'; adv.task='休息'; adv.stats.downed++; }
    } else if(g.m>=1.5){
      result.important.push({text:`🛡 <b>${adv.name}</b> 巡逻【${g.n}】，治安 -${Math.round(pressure)}。`, type:'good'});
    }
    return result;
  }

  /* ---- 娱乐 ---- */
  if(adv.task==='娱乐'){
    const roll = d(20);
    const total = roll + (a.魅力||10)*1.2 + (a.灵感||10)/2 + E.检定加值;
    const g = grade(total,roll);
    adv.stats.worked++;
    adv.stats.entertaining++;
    adv.workDays++;
    adv.consecutiveWork++;
    adv.fatigue = clamp(adv.fatigue+4,0,100);
    state.totals.worked++;
    const baseUp = Math.round((2 + a.魅力/5) * g.m * E.娱乐加成);
    state.adventurers.forEach(t=>{
      if(t.status==='昏迷'||t.imprisoned>0) return;
      t.happiness = clamp(t.happiness+baseUp,0,100);
      t.stats.feastHappy += baseUp;
    });
    adv.mind = Math.min(max.mind, adv.mind + Math.round(baseUp/2));
    result.entertain = baseUp;
    return result;
  }

  /* ---- 行医 ---- */
  if(adv.task==='行医'){
    if(adv.path!=='炼金术士'){
      result.important.push({text:`⚕ <b>${adv.name}</b> 非炼金术士，无法行医。`, type:'warn'});
      return result;
    }
    const patients = state.adventurers.filter(x=>x.id!==adv.id && (x.diseases||[]).length>0);
    if(!patients.length) return result;
    const roll = d(20);
    const total = roll + (a.智力||10) + (a.灵感||10)/2 + E.检定加值;
    const g = grade(total,roll);
    adv.stats.worked++;
    adv.workDays++;
    adv.consecutiveWork++;
    adv.fatigue = clamp(adv.fatigue+4,0,100);
    state.totals.worked++;
    patients.sort((x,y)=>{
      const sx = Math.max(...x.diseases.map(z=>z.severity));
      const sy = Math.max(...y.diseases.map(z=>z.severity));
      return sy-sx;
    });
    const patient = patients[0];
    const dz = patient.diseases[0];
    const baseCure = DISEASES[dz.name]?DISEASES[dz.name].alchemyCure:.5;
    const cureChance = baseCure * g.m * E.行医加成;
    const cost = {食物: Math.max(1, Math.round(2*E.行医节流))};
    if(dz.severity>=3) cost.绿宝石 = 1;
    let affordable = true;
    for(const [r,v] of Object.entries(cost)) if(v>0 && (state.res[r]||0)<v){ affordable=false; break; }
    if(!affordable) return result;
    for(const [r,v] of Object.entries(cost)) if(v>0) state.res[r]-=v;
    if(Math.random()<cureChance){
      patient.diseases = patient.diseases.filter(x=>x!==dz);
      adv.stats.cured++;
      result.important.push({text:`⚕ <b>${adv.name}</b> 治愈 <b>${patient.name}</b> 的${dz.name}。`, type:'epic'});
    } else {
      dz.days = Math.max(1, dz.days-2);
      result.important.push({text:`⚕ <b>${adv.name}</b> 缓解 <b>${patient.name}</b> 的${dz.name}（剩 ${dz.days} 天）。`, type:'good'});
    }
    return result;
  }

  /* ---- 劳作 ---- */
  const mainVal = a[task.main] || 10;
  const pathBonus = (PATHS[adv.path] && PATHS[adv.path].bonus[adv.task]) || 0;
  const profBonus = (adv.taskCount[adv.task]||0)>=15 ? 3 : (adv.taskCount[adv.task]||0)>=8 ? 1 : 0;
  const roll = d(20);
  const total = roll + mainVal + pathBonus + profBonus + E.检定加值;
  const g = grade(total,roll);
  let amount = calcYield(adv, adv.task, g, E);

  adv.stats.worked++;
  adv.workDays++;
  adv.consecutiveWork++;
  adv.fatigue = clamp(adv.fatigue + (TASKS[adv.task].fatigue||6), 0, 100);
  state.totals.worked++;
  adv.taskCount[adv.task] = (adv.taskCount[adv.task]||0)+1;

  if(!adv.profession && adv.taskCount[adv.task]>=15){
    adv.profession = adv.task;
    result.important.push({text:`🏆 <b>${adv.name}</b> 在「${adv.task}」中成长为专精！`, type:'epic'});
  }

  if(amount>0){
    gain[task.res] = (gain[task.res]||0) + amount;
    adv.stats.produced[task.res] = (adv.stats.produced[task.res]||0) + amount;
    if(adv.task==='掘矿' && E.铁等级>0){
      const iron = Math.max(1, Math.round(amount*(.08+E.铁等级*.07)));
      gain.铁 = (gain.铁||0) + iron;
      adv.stats.produced['铁'] = (adv.stats.produced['铁']||0) + iron;
    }
    maybeCorrupt(adv,'生产',result.important,gain,task.res);
  } else if(g.k==='F'){
    result.important.push({text:`${task.icon} <b>${adv.name}</b> ${adv.task}【大失败】一无所获。`, type:'warn'});
  }

  result.work = {task:adv.task, count:1, total:amount};

  if(task.risk && g.k==='F'){
    const dmg = Math.max(1, Math.round(rnd(3,8)*E.受伤倍率));
    adv.hp -= dmg;
    adv.mind = Math.max(0, adv.mind-rnd(1,3));
    adv.stats.injured += dmg;
    state.totals.injured += dmg;
    result.important.push({text:`💥 <b>${adv.name}</b> 遭遇意外，损失 ${dmg} 生命。`, type:'bad'});
  } else if(task.risk && g.k==='E'){
    const dmg = Math.max(1, Math.round(rnd(1,3)*E.受伤倍率));
    adv.hp -= dmg;
    adv.stats.injured += dmg;
    state.totals.injured += dmg;
  }

  if(g.m>=1.9){
    adv.mind = Math.min(max.mind, adv.mind + d(3));
    adv.happiness = clamp(adv.happiness+2,0,100);
  } else if(g.m<=.4){
    adv.mind = Math.max(0, adv.mind - d(3));
    adv.happiness = clamp(adv.happiness-2,0,100);
  }

  if(adv.taskCount[adv.task] % 3 === 0){
    const growthMap = {
      '狩猎':['力量','敏捷'], '垂钓':['灵感','意志'],
      '伐木':['力量','体质'], '掘矿':['力量','幸运'],
      '耕作':['体质','意志'], '探索':['灵感','幸运'],
      '巡逻':['意志','灵感'], '娱乐':['魅力','灵感'],
      '建造':['力量','体质']
    };
    const pool = growthMap[adv.task] || ATTR_KEYS;
    const k = pick(pool);
    if(adv.baseAttrs[k]!==undefined && adv.baseAttrs[k]<18){
      adv.baseAttrs[k]++;
      result.important.push({text:`📈 <b>${adv.name}</b> 在长期${adv.task}中，${k} +1。`, type:'epic'});
    }
  }

  if(adv.hp<=0){
    adv.hp = 0;
    adv.status = '昏迷';
    adv.task = '休息';
    adv.stats.downed++;
    result.important.push({text:`⚠️ <b>${adv.name}</b> 倒下昏迷！`, type:'bad'});
    if(adv.race==='苦力怕'){
      state.adventurers.forEach(t=>{
        if(t.id===adv.id || t.status==='昏迷') return;
        const boom = rnd(3,8);
        t.hp = Math.max(0, t.hp-boom);
        t.stats.injured += boom;
        state.totals.injured += boom;
        if(t.hp<=0){ t.status='昏迷'; t.task='休息'; t.stats.downed++; }
      });
      result.important.push({text:`💥 <b>${adv.name}</b> 昏迷时自爆，周围同伴受伤！`, type:'bad'});
    }
  }

  return result;
}

/* ============================================================
   子函数：疾病处理
   ============================================================ */
function _processDiseases(E, importantLines){
  state.adventurers.forEach(adv=>{
    if(!adv.diseases||!adv.diseases.length) return;
    const remaining = [];
    adv.diseases.forEach(dz=>{
      const base = DISEASES[dz.name]?DISEASES[dz.name].cureChance:.2;
      const chance = base*E.痊愈加成*.35 + .05;
      if(Math.random()<chance){
        importantLines.push({text:`💚 <b>${adv.name}</b> 的${dz.name}痊愈。`, type:'good'});
      } else {
        dz.days--;
        if(dz.days<=0) importantLines.push({text:`💚 <b>${adv.name}</b> 的${dz.name}终于痊愈。`, type:'good'});
        else remaining.push(dz);
      }
    });
    adv.diseases = remaining;
  });

  state.adventurers.forEach(src=>{
    if(!src.diseases||!src.diseases.length) return;
    src.diseases.forEach(dz=>{
      const base = DISEASES[dz.name]?DISEASES[dz.name].contagion:0;
      if(base<=0) return;
      const chance = base*E.传染压制;
      if(Math.random()<chance){
        const others = state.adventurers.filter(x=>x.id!==src.id && !(x.diseases||[]).some(z=>z.name===dz.name));
        if(others.length){
          const victim = pick(others);
          victim.diseases.push({name:dz.name, days:rnd(DISEASES[dz.name].days[0],DISEASES[dz.name].days[1]), severity:dz.severity});
          importantLines.push({text:`🦠 <b>${victim.name}</b> 被传染${dz.name}！`, type:'warn'});
        }
      }
    });
  });

  state.adventurers.forEach(adv=>{
    if(adv.status==='昏迷'||adv.imprisoned>0) return;
    if((adv.diseases||[]).length>=2) return;
    let chance = .015;
    if(adv.fatigue>70) chance += .06;
    if(adv.fatigue>85) chance += .05;
    if(adv.happiness<30) chance += .05;
    if(state.res.食物===0) chance += .08;
    if(adv.hp<calcMax(adv).hp*.4) chance += .04;
    if(state.crime.level>50) chance += .03;
    chance *= E.患病压制;
    if(Math.random()<chance){
      const names = Object.keys(DISEASES);
      const weights = names.map(n=>DISEASES[n].severity===1?6:DISEASES[n].severity===2?3:1);
      let total = weights.reduce((a,b)=>a+b,0);
      let r = Math.random()*total;
      let chosen = names[0];
      for(let i=0;i<names.length;i++){ r -= weights[i]; if(r<=0){ chosen = names[i]; break; } }
      const dz = DISEASES[chosen];
      adv.diseases.push({name:chosen, days:rnd(dz.days[0],dz.days[1]), severity:dz.severity});
      importantLines.push({text:`🤒 <b>${adv.name}</b> 染上<b>${chosen}</b>！`, type:'warn'});
    }
  });
}

/* ============================================================
   子函数：犯罪处理
   ============================================================ */
function _processCrime(pop, E, importantLines){
  let pressure = 0;
  const hungryCount = state.res.食物===0 ? pop : 0;
  const unhappyCount = state.adventurers.filter(a=>a.happiness<30).length;
  const tiredCount = state.adventurers.filter(a=>a.fatigue>70).length;
  const corruptCount = state.adventurers.filter(a=>a.corruptCount>0).length;
  pressure += unhappyCount*2.5 + tiredCount*1.5 + hungryCount*4 + corruptCount*3;
  pressure -= (state.buildings['治安所']||0)*2.5;
  state.crime.level = clamp(state.crime.level + pressure*.35, 0, 100);

  const crimeChance = state.crime.level/100 * .35;
  if(state.adventurers.length>0 && Math.random()<crimeChance){
    const candidates = state.adventurers.filter(a=>a.status!=='昏迷'&&a.imprisoned===0);
    if(candidates.length){
      candidates.sort((x,y)=>{
        const sx = (100-x.happiness) + x.fatigue + (state.res.食物===0?30:0) + x.corruptCount*5;
        const sy = (100-y.happiness) + y.fatigue + (state.res.食物===0?30:0) + y.corruptCount*5;
        return sy-sx;
      });
      const criminal = candidates[0];
      const richTargets = state.adventurers.filter(x=>x.id!==criminal.id && x.wallet>5);
      const useTheft = richTargets.length>0 && Math.random()<.5;
      state.crime.totalCrimes++;
      state.crime.criminals++;
      criminal.criminal = true;
      criminal.crimeRecord = (criminal.crimeRecord||0)+1;
      criminal.stats.crimes = (criminal.stats.crimes||0)+1;

      if(useTheft){
        richTargets.sort((x,y)=>y.wallet-x.wallet);
        const victim = richTargets[0];
        const steal = Math.round(Math.min(victim.wallet, rnd(3,10))*10)/10;
        victim.wallet -= steal;
        criminal.wallet += steal;
        victim.happiness = clamp(victim.happiness-8,0,100);
        importantLines.push({text:`🚨 <b>${criminal.name}</b> 偷了 <b>${victim.name}</b> ${steal} 金币。`, type:'bad'});
      } else {
        const types = ['偷窃营地资源','破坏营地','斗殴伤人','走私货品'];
        const crime = pick(types);
        if(crime==='偷窃营地资源'){
          const steal = {};
          for(const r of Object.keys(state.res)){
            if(state.res[r]>0){ const amt = Math.min(state.res[r], rnd(2,8)); state.res[r]-=amt; steal[r]=amt; }
          }
          const gold = Object.values(steal).reduce((a,b)=>a+b,0)*2;
          criminal.wallet += gold;
          importantLines.push({text:`🚨 <b>${criminal.name}</b> 偷窃营地资源，转卖 ${gold} 金币。`, type:'bad'});
        } else if(crime==='破坏营地'){
          if(state.project){
            const dmg = rnd(3,10);
            state.project.progress = Math.max(0, state.project.progress-dmg);
            importantLines.push({text:`🚨 <b>${criminal.name}</b> 破坏工程（-${dmg}）。`, type:'bad'});
          }
        } else if(crime==='斗殴伤人'){
          const others = state.adventurers.filter(x=>x.id!==criminal.id && x.status!=='昏迷');
          if(others.length){
            const victim = pick(others);
            const dmg = rnd(2,6);
            victim.hp = Math.max(0, victim.hp-dmg);
            if(victim.hp<=0){ victim.status='昏迷'; victim.task='休息'; victim.stats.downed++; }
            importantLines.push({text:`🚨 <b>${criminal.name}</b> 打伤 <b>${victim.name}</b>（-${dmg}）。`, type:'bad'});
          }
        } else {
          const amt = rnd(5,15);
          state.res.金币 = Math.max(0, state.res.金币-amt);
          criminal.wallet += amt;
          importantLines.push({text:`🚨 <b>${criminal.name}</b> 走私，营地金币 -${amt}。`, type:'bad'});
        }
      }

      const hasGuard = (state.buildings['治安所']||0)>0;
      const patrolCoverage = state.adventurers.filter(x=>x.task==='巡逻'&&x.imprisoned===0).length;
      const catchChance = (hasGuard?.5:0) + Math.min(.5, patrolCoverage*.25);
      if(Math.random()<catchChance){
        if(criminal.crimeRecord>=3){
          importantLines.push({text:`⚖ <b>${criminal.name}</b> 屡犯，驱逐出据点！`, type:'bad'});
          state.adventurers = state.adventurers.filter(x=>x.id!==criminal.id);
        } else {
          criminal.imprisoned = rnd(2,4);
          criminal.task = '休息';
          importantLines.push({text:`⚖ <b>${criminal.name}</b> 被捕，监禁 ${criminal.imprisoned} 天。`, type:'bad'});
        }
      } else {
        importantLines.push({text:`⚖ 据点治安不足，<b>${criminal.name}</b> 未被抓获。`, type:'warn'});
      }
    }
  }
  state.crime.level = clamp(state.crime.level-2, 0, 100);
}

/* ============================================================
   ★ 子函数：食物 —— 先入库，再扣消耗
   ============================================================ */
function _processFood(pop, E, gain, importantLines){
  // ★ 第一步：当日食物产出入库
  if(gain.食物 > 0){
    state.res.食物 = (state.res.食物||0) + gain.食物;
    state.totals.produced['食物'] = (state.totals.produced['食物']||0) + gain.食物;
    addLog(`🌾 今日收获食物 +${gain.食物}（仓库存量 ${state.res.食物}）。`, 'good');
  }

  // ★ 第二步：扣除当日消耗
  if(pop>0){
    let need = 0;
    state.adventurers.forEach(adv=>{ need += raceFoodCost(adv); });
    need = Math.max(0, need - E.食物减免);

    if(state.res.食物 >= need){
      state.res.食物 -= need;
      addLog(`🍖 全员消耗食物 ${need} 单位${E.食物减免?`（建筑减免 ${E.食物减免}）`:''}。`, '');
    } else {
      const shortage = need - state.res.食物;
      state.res.食物 = 0;
      importantLines.push({text:`🚨 食物短缺！缺口 ${shortage}，全员挨饿。`, type:'bad'});
      state.adventurers.forEach(adv=>{
        const hpL = rnd(2,5), mindL = rnd(1,3);
        adv.hp = Math.max(0, adv.hp-hpL);
        adv.mind = Math.max(0, adv.mind-mindL);
        adv.happiness = clamp(adv.happiness-8,0,100);
        if(adv.hp<=0 && adv.status!=='昏迷'){ adv.status='昏迷'; adv.task='休息'; adv.stats.downed++; }
      });
    }
  }

  // ★ 第三步：清空 gain.食物，避免 _processStorage 重复入库
  gain.食物 = 0;
}

/* ============================================================
   子函数：其余资源入库
   ============================================================ */
function _processStorage(gain){
  Object.keys(gain).forEach(k=>{
    if(gain[k]>0){
      state.res[k] = (state.res[k]||0) + gain[k];
      state.totals.produced[k] = (state.totals.produced[k]||0) + gain[k];
    }
  });
}

/* ============================================================
   子函数：工资
   ============================================================ */
function _processWages(pop, importantLines){
  if(pop<=0) return;
  const isPayday = state.day % WAGE_PERIOD === 0;
  if(!isPayday) return;

  let totalNeed = Math.round(totalMonthlyWage()*10)/10;
  const paid = Math.min(state.res.金币, totalNeed);
  state.res.金币 -= paid;
  state.totals.wages += paid;
  const ratio = totalNeed>0 ? paid/totalNeed : 1;

  if(ratio>=1) importantLines.push({text:`💰 【发薪日】全员发放月薪共 ${totalNeed.toFixed(1)} 金币。`, type:'epic'});
  else if(ratio>0) importantLines.push({text:`💰 【发薪日】仅发放 ${paid.toFixed(1)}/${totalNeed.toFixed(1)}（拖欠 ${(totalNeed-paid).toFixed(1)}）。`, type:'warn'});
  else importantLines.push({text:`💸 【发薪日】金币枯竭，全员未领工资！`, type:'bad'});

  state.adventurers.forEach(adv=>{
    const want = monthlyWage(adv);
    const got = Math.round(want*ratio*10)/10;
    adv.wallet += got;
    adv.stats.wageEarned = (adv.stats.wageEarned||0) + got;
    const tier = WAGE_TIERS[state.wageTier];
    if(ratio>=1){
      adv.integrity = clamp(adv.integrity+tier.integrityDelta,0,100);
      adv.happiness = clamp(adv.happiness+tier.happyDelta,0,100);
    } else {
      adv.happiness = clamp(adv.happiness-12,0,100);
      adv.integrity = clamp(adv.integrity-12,0,100);
    }
    if(got>0 && Math.random()<.25 && adv.inventory.length<12){
      const item = pick(PERSONAL_ITEMS);
      if(!adv.inventory.includes(item)) adv.inventory.push(item);
    }
  });
}

/* ============================================================
   子函数：幸福演变 + 夜袭
   ============================================================ */
function _processHappinessAndRaid(pop, E, importantLines){
  const bedCount = E.床位;
  state.adventurers.forEach(adv=>{
    if(adv.status==='昏迷'){ adv.happiness = clamp(adv.happiness-1,0,100); return; }
    if(adv.imprisoned>0){ adv.happiness = clamp(adv.happiness-3,0,100); return; }
    let delta = 0;
    if(bedCount>=pop) delta += 5 + (state.buildings['住房']||0);
    else delta -= 12;
    if(state.res.食物>pop*4) delta += 4;
    else if(state.res.食物>pop*1.5) delta += 1;
    else if(state.res.食物===0) delta -= 8;
    if(adv.fatigue>85) delta -= 2;
    else if(adv.fatigue>70) delta -= 1;
    delta -= Math.min(2, Math.floor(adv.consecutiveWork/8));
    delta += Math.round(E.幸福度/Math.max(1,pop));
    if((adv.diseases||[]).length>0) delta -= (adv.diseases.length*2);
    if(adv.criminal) delta -= 2;
    if(adv.wallet>=30) delta += 1;
    if(adv.wallet>=80) delta += 1;
    if(adv.wallet>=10 && state.res.食物>pop*2) delta += 1;
    adv.happiness = clamp(adv.happiness+delta,0,100);
    if(adv.happiness<15){
      adv.lowHappyDays++;
      if(adv.lowHappyDays>=3 && pop>1){
        importantLines.push({text:`😡 <b>${adv.name}</b> 幸福过低，离据点而去！`, type:'bad'});
        adv._leave = true;
      }
    } else adv.lowHappyDays = 0;
  });
  const leavers = state.adventurers.filter(a=>a._leave);
  if(leavers.length){
    state.adventurers = state.adventurers.filter(a=>!a._leave);
    leavers.forEach(a=>delete a._leave);
  }

  const raidChance = .28 * E.夜袭倍率;
  if(state.adventurers.length>0 && Math.random()<raidChance){
    const awake = state.adventurers.filter(a=>a.status!=='昏迷' && a.imprisoned===0);
    if(awake.length){
      const victim = pick(awake);
      const dmg = Math.max(1, Math.round(rnd(3,10)*E.受伤倍率));
      victim.hp = Math.max(0, victim.hp-dmg);
      victim.mind = Math.max(0, victim.mind-rnd(1,5));
      victim.happiness = clamp(victim.happiness-4,0,100);
      victim.stats.injured += dmg;
      state.totals.injured += dmg;
      if(victim.hp<=0){ victim.status='昏迷'; victim.task='休息'; victim.stats.downed++; }
      importantLines.push({text:`🧟 亡灵夜袭！<b>${victim.name}</b> 受伤 ${dmg}。`, type:'bad'});
    }
  }
}

/* ============================================================
   ★ 主入口：结算一天
   ============================================================ */
function nextDay(){
  const lines = [];
  const gain = {食物:0,木材:0,石头:0,铁:0,金币:0,绿宝石:0};
  const E = getCamp();
  const pop = state.adventurers.length;

  // 数据校验
  validateState();

  // 冒险者数据修复
  state.adventurers.forEach(adv=>{
    const m = calcMax(adv);
    if(typeof adv.hp!=='number'||isNaN(adv.hp)) adv.hp = adv.status==='昏迷'?0:m.hp;
    if(typeof adv.mind!=='number'||isNaN(adv.mind)) adv.mind = adv.status==='昏迷'?0:m.mind;
    if(typeof adv.happiness!=='number'||isNaN(adv.happiness)) adv.happiness = 60;
    if(typeof adv.fatigue!=='number'||isNaN(adv.fatigue)) adv.fatigue = 0;
    if(typeof adv.wallet!=='number'||isNaN(adv.wallet)) adv.wallet = 0;
    if(typeof adv.integrity!=='number'||isNaN(adv.integrity)) adv.integrity = 60;
    if(typeof adv.consecutiveWork!=='number'||isNaN(adv.consecutiveWork)) adv.consecutiveWork = 0;
    if(!adv.taskCount) adv.taskCount = {};
    if(!adv.profCount) adv.profCount = {};
    if(!Array.isArray(adv.corruptionHistory)) adv.corruptionHistory = [];
    if(!adv.stats) adv.stats = {worked:0,injured:0,produced:{},downed:0,healed:0,cured:0,crimes:0,wageEarned:0,entertaining:0,spent:0,feastHappy:0,passiveHappy:0,recovered:0};
    if(typeof adv.stats.recovered !== 'number') adv.stats.recovered = 0;
  });

  if(state.feast.cooldown>0) state.feast.cooldown--;
  if(state.feast.bonusDays>0) state.feast.bonusDays--;

  state.adventurers.forEach(adv=>{
    if(adv.imprisoned>0){
      adv.imprisoned--;
      if(adv.imprisoned===0) lines.push({text:`🔓 <b>${adv.name}</b> 刑满释放。`, type:'good'});
    }
  });

  const summary = {rest:[], work:{}, entertain:0, build:0};
  const importantLines = [];

  // 每位冒险者依次行动
  state.adventurers.forEach(adv=>{
    const r = _runOneAdventurer(adv, E, gain, lines);
    if(r.rest) summary.rest.push(r.rest);
    if(r.work){
      const k = r.work.task;
      if(!summary.work[k]) summary.work[k] = {count:0, total:0};
      summary.work[k].count += r.work.count;
      summary.work[k].total += r.work.total;
    }
    summary.entertain += r.entertain;
    summary.build += r.build;
    r.important.forEach(x=>importantLines.push(x));
  });

  /* ---- 建筑产出 ---- */
  if(E.每日食物>0) gain.食物 = (gain.食物||0) + E.每日食物;
  if(E.每日石头>0) gain.石头 = (gain.石头||0) + E.每日石头;

  /* ---- 种族被动产出 ---- */
  state.adventurers.forEach(adv=>{
    if(adv.status==='昏迷') return;
    const out = raceDailyOutput(adv);
    for(const [r,v] of Object.entries(out)) gain[r] = (gain[r]||0) + v;
  });

  /* ---- 建筑被动幸福 / 疲劳 ---- */
  if(E.每日幸福>0 || E.疲劳恢复>0){
    state.adventurers.forEach(adv=>{
      if(adv.status==='昏迷'||adv.imprisoned>0) return;
      if(E.每日幸福>0){
        adv.happiness = clamp(adv.happiness+E.每日幸福,0,100);
        adv.stats.passiveHappy = (adv.stats.passiveHappy||0) + E.每日幸福;
      }
      if(E.疲劳恢复>0) adv.fatigue = clamp(adv.fatigue-E.疲劳恢复,0,100);
    });
  }

  /* ---- 篝火余韵 ---- */
  if(state.feast.bonusDays>0){
    state.adventurers.forEach(adv=>{
      if(adv.status==='昏迷'||adv.imprisoned>0) return;
      adv.happiness = clamp(adv.happiness+3,0,100);
      adv.stats.passiveHappy = (adv.stats.passiveHappy||0) + 3;
    });
  }

  /* ---- 商路被动 ---- */
  if(state.flags && state.flags.tradeRoute){
    gain.金币 = (gain.金币||0) + 5;
  }

  /* ---- 工资 ---- */
  _processWages(pop, importantLines);

  /* ---- 个人消费 ---- */
  const spendingLines = [];
  state.adventurers.forEach(adv=>tryPersonalSpending(adv, spendingLines));
  spendingLines.forEach(l=>importantLines.push(l));

  /* ---- 疾病 ---- */
  _processDiseases(E, importantLines);

  /* ---- 犯罪 ---- */
  _processCrime(pop, E, importantLines);

  /* ---- ★ 食物：先入库，再扣消耗 ---- */
  _processFood(pop, E, gain, importantLines);

  /* ---- 其余资源入库 ---- */
  _processStorage(gain);

  /* ---- 幸福演变 + 夜袭 ---- */
  _processHappinessAndRaid(pop, E, importantLines);

  /* ---- 随机事件 ---- */
  const evs = [];
  if(Math.random()<.28){
    const pool = [];
    EVENTS.forEach(e=>{ for(let i=0;i<e.weight;i++) pool.push(e); });
    if(pool.length) evs.push(pick(pool));
  }

  /* ---- 写日志 ---- */
  state.day++;
  addLog(`—— 第 ${state.day} 天 ——`, 'day');

  if(summary.rest.length){
    const tHp = summary.rest.reduce((a,b)=>a+b.hp,0);
    const tMind = summary.rest.reduce((a,b)=>a+b.mind,0);
    const tHappy = summary.rest.reduce((a,b)=>a+b.happy,0);
    addLog(`🛏 ${summary.rest.length} 名冒险者休息，共恢复 ${tHp} 生命 · ${tMind} 心理 · ${tHappy} 幸福。`, 'good');
  }

  const workEntries = Object.entries(summary.work).filter(([k])=>k!=='闲着');
  if(workEntries.length){
    const txt = workEntries.map(([k,v])=>`${(TASKS[k]||{icon:'❓'}).icon}${k}×${v.count}${v.total>0?`(+${v.total})`:''}`).join(' · ');
    addLog(`⚙ 今日劳作：${txt}`, '');
  }

  if(summary.build>0) addLog(`🔨 施工进度 +${summary.build}。`, '');
  if(summary.entertain>0) addLog(`🎭 娱乐表演，全队幸福 +${summary.entertain}。`, 'good');

  const gainTxt = Object.entries(gain).filter(([k,v])=>v>0).map(([k,v])=>{
    const icon = (RES_META.find(m=>m.k===k)||{}).i||'';
    return `${icon}${k}+${v}`;
  }).join(' ');
  if(gainTxt) addLog(`📦 今日入库：${gainTxt}`, '');

  importantLines.slice().reverse().forEach(l=>addLog(l.text, l.type));

  checkGoals();
  checkEndings();

  pendingEvents = evs;
  renderNow();
  save();

  if(pendingEvents.length) setTimeout(()=>showNextEvent(), 200);
}

/* ---------- 目标 / 结局 ---------- */
function checkGoals(){
  if(!state.goalDone) state.goalDone = {};
  GOALS.forEach(g=>{
    if(state.goalDone[g.id]) return;
    if(g.check(state)){
      state.goalDone[g.id] = true;
      addLog(`🏅 达成目标：<b>${g.name}</b> —— ${g.desc}`, 'epic');
      if(g.reward){
        for(const [r,v] of Object.entries(g.reward)) state.res[r] = (state.res[r]||0) + v;
        const rewardTxt = Object.entries(g.reward).map(([k,v])=>`${k}+${v}`).join(' ');
        addLog(`🎁 奖励：${rewardTxt}`, 'good');
      }
    }
  });
}
function checkEndings(){
  const pop = state.adventurers.length;
  if(pop===0 && state.day>5 && !endingsShown.defeat){
    endingsShown.defeat = true;
    showEnding('defeat', '据点离散', '所有冒险者都已离开或倒下，据点成为废墟。');
    return;
  }
  const pros = prosperity();
  if(pros>=100 && !endingsShown.victory){
    endingsShown.victory = true;
    showEnding('victory', '繁荣的据点', `经过 ${state.day} 天的经营，你的据点繁荣度达到 ${Math.round(pros)}，成为主世界边陲的一个小中心。`);
  }
}
function showEnding(type, title, body){
  $('#endTitle').textContent = type==='victory' ? '🏆 ' + title : '💀 ' + title;
  $('#endTitle').style.color = type==='victory' ? '#6ab04c' : '#d9534f';
  const pop = state.adventurers.length;
  const bld = Object.keys(state.buildings).length;
  const avgHappy = pop ? Math.round(state.adventurers.reduce((a,b)=>a+b.happiness,0)/pop) : 0;
  $('#endBody').innerHTML = `
    <p style="font-size:14px;line-height:1.8;color:#c8d2de;">${body}</p>
    <div class="stat-summary" style="margin-top:14px;">
      <div><span>存活天数</span><b>${state.day}</b></div>
      <div><span>人口</span><b>${pop}</b></div>
      <div><span>建筑数</span><b>${bld}</b></div>
      <div><span>平均幸福</span><b>${avgHappy}</b></div>
      <div><span>累计工资</span><b>${Math.round(state.totals.wages||0)}</b></div>
      <div><span>繁荣度</span><b>${Math.round(prosperity())}</b></div>
    </div>
  `;
  $('#endMask').classList.add('on');
}
