/* ============================================================
   state.js —— 全局状态、存档、迁移、工资、繁荣度
   ============================================================ */

var state = state || null;
var editingId = editingId || null;
var listenersBound = listenersBound || false;
var currentLogFilter = currentLogFilter || 'all';
var currentSort = currentSort || 'default';
var pendingEvents = pendingEvents || [];
var endingsShown = endingsShown || { victory:false, defeat:false };

function defaultState(){
  return {
    day:1,
    res:{食物:40, 木材:20, 石头:10, 铁:0, 金币:80, 绿宝石:0},
    adventurers:[],
    buildings:{},
    project:null,
    log:[],
    totals:{produced:{}, injured:0, worked:0, events:0, wages:0, corrupt:0, feasts:0},
    crime:{level:0, totalCrimes:0, criminals:0},
    wageTier:2,
    feast:{cooldown:0, lastDay:-99, bonusDays:0},
    flags:{tradeRoute:false},
    goalDone:{},
    campName:'',
    campId:''
  };
}

function newAdventurer(name,race,path,base){
  const adv = {
    id:'a'+Date.now().toString(36)+Math.random().toString(36).slice(2,6),
    name,race,path,
    baseAttrs:Object.assign({},base),
    initialAttrs:Object.assign({},base),
    task:'休息',status:'正常',workDays:0,
    taskCount:{}, profCount:{},
    stats:{worked:0,injured:0,mental:0,produced:{},downed:0,healed:0,
           cured:0,crimes:0,wageEarned:0,corruption:0,entertaining:0,
           stolen:0,lost:0,spent:0,feastHappy:0,passiveHappy:0,recovered:0},
    hp:0,mind:0,happiness:60,fatigue:0,
    consecutiveWork:0,
    profession:null,
    lowHappyDays:0,
    diseases:[],criminal:false,imprisoned:0,crimeRecord:0,
    wallet:0,inventory:[],integrity:60,corruptCount:0,
    corruptionHistory:[]
  };
  const m = calcMax(adv);
  adv.hp = m.hp; adv.mind = m.mind;
  return adv;
}

/* ---------- 工资 ---------- */
function baseMonthlyWage(adv){ const p = PATHS[adv.path] || {wage:0}; return 8 + (p.wage||0)*2; }
function monthlyWage(adv){ const tier = WAGE_TIERS[state.wageTier] || WAGE_TIERS[2]; return Math.round(baseMonthlyWage(adv)*tier.mul*10)/10; }
function totalMonthlyWage(){ return state.adventurers.reduce((s,a)=>s+monthlyWage(a),0); }
function daysToPayday(){ return (WAGE_PERIOD - (state.day % WAGE_PERIOD)) % WAGE_PERIOD; }

/* ---------- 繁荣度 ---------- */
function prosperity(){
  if(!state.adventurers.length) return 0;
  const pop = state.adventurers.length;
  const bld = Object.keys(state.buildings).length;
  const avgHappy = state.adventurers.reduce((a,b)=>a+b.happiness,0)/pop;
  const crime = state.crime.level;
  let score = pop*3 + bld*3 + (avgHappy-30)/2 + (100-crime)/5;
  return clamp(score,0,150);
}

/* ---------- 数据校验（修复工期 NaN） ---------- */
function validateState(){
  if(!state) return;
  if(state.project){
    if(!state.project.key || !BUILDINGS[state.project.key]){
      state.project = null;
    } else {
      if(typeof state.project.targetLevel !== 'number' || !isFinite(state.project.targetLevel) || state.project.targetLevel < 1){
        state.project.targetLevel = (state.buildings[state.project.key]||0) + 1;
      }
      if(typeof state.project.required !== 'number' || isNaN(state.project.required) || !isFinite(state.project.required) || state.project.required <= 0){
        state.project.required = buildingWork(state.project.key, state.project.targetLevel);
      }
      if(typeof state.project.progress !== 'number' || isNaN(state.project.progress) || !isFinite(state.project.progress)){
        state.project.progress = 0;
      }
      if(state.project.progress < 0) state.project.progress = 0;
    }
  }
  state.adventurers.forEach(adv => {
    if(!Array.isArray(adv.corruptionHistory)) adv.corruptionHistory = [];
  });
}

/* ---------- 迁移旧存档 ---------- */
function migrate(raw){
  const base = defaultState();
  const s = Object.assign({}, base, raw);
  s.res = Object.assign({}, base.res, raw.res||{});

  const ob = raw.buildings || {};
  s.buildings = {};
  for(const [k,v] of Object.entries(ob)){
    if(!BUILDINGS[k]) continue;
    if(v===true) s.buildings[k] = 1;
    else if(typeof v==='number' && v>0) s.buildings[k] = Math.min(5, Math.floor(v));
  }

  s.project = raw.project || null;
  if(s.project){
    if(!s.project.targetLevel) s.project.targetLevel = (s.buildings[s.project.key]||0)+1;
    if(!s.project.required || typeof s.project.required !== 'number' || isNaN(s.project.required) || !isFinite(s.project.required) || s.project.required <= 0){
      s.project.required = buildingWork(s.project.key, s.project.targetLevel);
    }
    if(typeof s.project.progress!=='number' || isNaN(s.project.progress)) s.project.progress = 0;
  }

  s.log = raw.log || [];
  s.totals = Object.assign({produced:{}, injured:0, worked:0, events:0, wages:0, corrupt:0, feasts:0}, raw.totals||{});
  s.totals.produced = (raw.totals && raw.totals.produced) || {};
  s.crime = Object.assign({level:0, totalCrimes:0, criminals:0}, raw.crime||{});
  s.wageTier = typeof raw.wageTier==='number' ? clamp(raw.wageTier,0,3) : 2;

  s.feast = Object.assign({cooldown:0, lastDay:-99, bonusDays:0}, raw.feast||{});
  if(typeof s.feast.cooldown!=='number' || isNaN(s.feast.cooldown)) s.feast.cooldown = 0;
  if(typeof s.feast.bonusDays!=='number' || isNaN(s.feast.bonusDays)) s.feast.bonusDays = 0;
  if(typeof s.feast.lastDay!=='number') s.feast.lastDay = -99;

  s.flags = Object.assign({tradeRoute:false}, raw.flags||{});
  s.goalDone = Object.assign({}, raw.goalDone||{});

  if(!s.campName) s.campName = pick(['翠','金','石','铁','木','水','火','风','雷','霜'])+'石营地';
  if(!s.campId) s.campId = 'camp_' + Date.now().toString(36) + Math.random().toString(36).slice(2,6);

  s.adventurers = (raw.adventurers || []).map(a=>{
    const adv = Object.assign({
      task:'休息', status:'正常', workDays:0,
      baseAttrs:{}, stats:{}, taskCount:{}, profCount:{},
      happiness:60, fatigue:0, consecutiveWork:0,
      profession:null, lowHappyDays:0,
      diseases:[], criminal:false, imprisoned:0, crimeRecord:0,
      wallet:0, inventory:[], integrity:60, corruptCount:0,
      corruptionHistory:[]
    }, a);
    adv.baseAttrs = a.baseAttrs || {};
    adv.initialAttrs = a.initialAttrs || Object.assign({}, adv.baseAttrs);
    adv.stats = Object.assign(
      {worked:0,injured:0,produced:{},downed:0,healed:0,cured:0,crimes:0,
       wageEarned:0,entertaining:0,spent:0,feastHappy:0,passiveHappy:0,recovered:0},
      a.stats||{}
    );
    adv.stats.produced = (a.stats && a.stats.produced) || {};
    if(typeof adv.stats.recovered !== 'number') adv.stats.recovered = 0;
    adv.taskCount = a.taskCount || a.profCount || {};
    adv.profCount = adv.taskCount;
    adv.diseases = (a.diseases||[]).map(dz=>{
      const def = DISEASES[dz.name] || DISEASES['感冒'];
      return {
        name: dz.name,
        days: typeof dz.days==='number' && !isNaN(dz.days) ? dz.days : rnd(def.days[0], def.days[1]),
        severity: dz.severity || def.severity
      };
    });
    adv.criminal = !!a.criminal;
    adv.imprisoned = typeof a.imprisoned==='number' ? a.imprisoned : 0;
    adv.crimeRecord = a.crimeRecord || 0;
    adv.wallet = typeof a.wallet==='number' && !isNaN(a.wallet) ? a.wallet : 0;
    adv.inventory = Array.isArray(a.inventory) ? a.inventory.slice(0,15) : [];
    adv.integrity = typeof a.integrity==='number' && !isNaN(a.integrity) ? a.integrity : 60;
    adv.corruptCount = typeof a.corruptCount==='number' ? a.corruptCount : 0;
    adv.corruptionHistory = Array.isArray(a.corruptionHistory) ? a.corruptionHistory.map(h=>({
      day: typeof h.day === 'number' ? h.day : 0,
      amount: typeof h.amount === 'number' && !isNaN(h.amount) ? h.amount : 0,
      context: h.context || '未知'
    })) : [];

    const m = calcMax(adv);
    if(typeof adv.hp!=='number' || isNaN(adv.hp) || !isFinite(adv.hp)) adv.hp = adv.status==='昏迷'?0:m.hp;
    if(typeof adv.mind!=='number' || isNaN(adv.mind) || !isFinite(adv.mind)) adv.mind = adv.status==='昏迷'?0:m.mind;
    adv.hp = clamp(adv.hp, 0, m.hp);
    adv.mind = clamp(adv.mind, 0, m.mind);
    if(typeof adv.happiness!=='number' || isNaN(adv.happiness)) adv.happiness = 60;
    if(typeof adv.fatigue!=='number' || isNaN(adv.fatigue)) adv.fatigue = 0;
    if(typeof adv.consecutiveWork!=='number' || isNaN(adv.consecutiveWork)) adv.consecutiveWork = 0;
    if(typeof adv.lowHappyDays!=='number' || isNaN(adv.lowHappyDays)) adv.lowHappyDays = 0;
    return adv;
  });
  return s;
}

/* ---------- 存读档 ----------
   ★ save 会触发一次异步发布到共享注册表（节流由 shared.js 控制） */
function save(){
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); } catch(e){}
  if (typeof publishMyCamp === 'function' && SHARED.enabled){
    publishMyCamp(false);
  }
}
function load(){
  try {
    let raw = localStorage.getItem(SAVE_KEY);
    if(!raw){
      for(const k of LEGACY_KEYS){
        raw = localStorage.getItem(k);
        if(raw) break;
      }
    }
    if(raw){
      const s = JSON.parse(raw);
      if(s && Array.isArray(s.adventurers) && s.res) return migrate(s);
    }
  } catch(e){}
  return null;
}
