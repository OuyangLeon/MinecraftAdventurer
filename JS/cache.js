/* ============================================================
   cache.js —— 缓存层，避免每帧重复计算
   ============================================================ */

let _cache = { camp:null, adv:new Map(), version:0 };

function invalidateCache(){
  _cache.camp = null;
  _cache.adv.clear();
  _cache.version++;
}

function computeCampEffects(){
  const E = {
    床位:0,幸福度:0,食物减免:0,产量倍率:1,检定加值:0,心理恢复:0,休息倍率:1,
    伐木倍率:1,耕作倍率:1,掘矿倍率:1,铁等级:0,
    夜袭倍率:1,受伤倍率:1,每日食物:0,每日石头:0,
    治安压制:0,巡逻加成:1,痊愈加成:1,行医加成:1,行医节流:1,传染压制:1,
    娱乐加成:1,患病压制:1,每日幸福:0,疲劳恢复:0,反腐加成:1
  };
  for(const [name,lv] of Object.entries(state.buildings)){
    const b = BUILDINGS[name];
    if(!b || !lv || lv<=0) continue;
    const e = b.effect(lv);
    for(const [k,v] of Object.entries(e)){
      if(k.endsWith('倍率')||k==='巡逻加成'||k==='痊愈加成'||k==='行医加成'||k==='行医节流'||k==='传染压制'||k==='娱乐加成'||k==='休息倍率'||k==='患病压制'||k==='反腐加成'){
        E[k] = (E[k] ?? 1) * v;
      } else if(k==='铁等级'){ E[k] = Math.max(E[k] ?? 0, v); }
      else { E[k] = (E[k] ?? 0) + v; }
    }
  }
  E.夜袭倍率 = clamp(safe(E.夜袭倍率,1),.15,1);
  E.受伤倍率 = clamp(safe(E.受伤倍率,1),.3,1);
  E.传染压制 = clamp(safe(E.传染压制,1),.1,1);
  E.患病压制 = clamp(safe(E.患病压制,1),.2,1);
  E.休息倍率 = Math.max(.5, safe(E.休息倍率,1));
  E.产量倍率 = Math.max(.1, safe(E.产量倍率,1));
  E.娱乐加成 = Math.max(.1, safe(E.娱乐加成,1));
  E.反腐加成 = Math.max(1, safe(E.反腐加成,1));
  return E;
}
function getCamp(){ if(!_cache.camp) _cache.camp = computeCampEffects(); return _cache.camp; }

function computeAdvData(adv){
  const mod = (RACES[adv.race] || {mod:{}}).mod;
  const attrs = {};
  ATTR_KEYS.forEach(k=>attrs[k]=clamp((adv.baseAttrs[k]||10)+(mod[k]||0),1,30));
  (adv.diseases||[]).forEach(dz=>{
    for(const [k,v] of Object.entries(dz.effect||{})){
      if(k==='全属性') ATTR_KEYS.forEach(ak=>attrs[ak]=clamp(attrs[ak]+v,1,30));
      else if(attrs[k]!==undefined) attrs[k]=clamp(attrs[k]+v,1,30);
    }
  });
  const max = {hp:attrs.体质*2, mind:attrs.意志*2};
  const diseaseMul = (adv.diseases&&adv.diseases.length) ? Math.min(...adv.diseases.map(dz=>dz.workMul)) : 1;
  return {attrs, max, diseaseMul};
}
function getAdvData(adv){
  if(!_cache.adv.has(adv.id)) _cache.adv.set(adv.id, computeAdvData(adv));
  return _cache.adv.get(adv.id);
}
function getAttrs(adv){ return getAdvData(adv).attrs; }
function calcMax(adv){ return getAdvData(adv).max; }
function diseaseWorkMul(adv){ return getAdvData(adv).diseaseMul; }
