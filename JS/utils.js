/* ============================================================
   utils.js —— 基础工具函数（无副作用，纯函数为主）
   ============================================================ */

const $ = s => document.querySelector(s);
const d = n => Math.floor(Math.random()*n)+1;
const pick = a => a[Math.floor(Math.random()*a.length)];
const clamp = (v,a,b) => Math.max(a,Math.min(b,v));
const rnd = (a,b) => a+Math.floor(Math.random()*(b-a+1));
const safe = (v,f=0) => (typeof v==='number' && !isNaN(v) && isFinite(v)) ? v : f;

const XING = ['艾','卡','罗','雷','诺','维','希','塞','格','布','法','乌','伊','阿','奥','莫','德','提','库','兰'];
const MING = ['恩','拉','斯','特','德','尔','娜','娅','琳','克','顿','文','瑞','利','诺','安','塔','姆','兹','斐'];
function genName(){ return pick(XING)+pick(MING)+(Math.random()<.4?pick(MING):''); }

function rollBaseAttrs(){
  const a = {};
  ['力量','敏捷','意志','魅力','灵感'].forEach(k=>a[k]=d(6)*3);
  ['体质','幸运','智力'].forEach(k=>a[k]=d(6)*2+6);
  return a;
}

function grade(total,roll){
  if(roll===1) return {k:'F',n:'大失败',m:0};
  if(roll===20) return {k:'S',n:'大成功',m:2.4};
  if(total>=32) return {k:'A',n:'极佳',m:1.9};
  if(total>=26) return {k:'B',n:'优异',m:1.55};
  if(total>=19) return {k:'C',n:'成功',m:1.2};
  if(total>=14) return {k:'D',n:'勉强',m:.75};
  return {k:'E',n:'失败',m:.35};
}

/* 幸福对工作效率的影响：幸福 60 时效率 1.0 */
function happinessMul(h){ return .4 + (safe(h,60)/100); }

/* 写日志到当前 state（state 由 state.js 提供） */
function addLog(text,type=''){
  state.log.unshift({day:state.day, text, type});
  if(state.log.length>400) state.log.length = 400;
}

/* ---------- 种族机制 ---------- */
function raceWorkMul(adv,task){
  let mul = 1;
  const isDay = state.day % 2 === 1;
  switch(adv.race){
    case '僵尸': if(isDay) mul *= .8; break;
    case '骷髅': if(isDay) mul *= .7; break;
    case '溺尸': if(task!=='垂钓'&&task!=='探索'&&task!=='休息'&&task!=='建造') mul *= .6; break;
    case '守卫者': if(task!=='垂钓'&&task!=='休息') mul *= .8; break;
    case '凋零骷髅': if(task==='掘矿'||task==='狩猎') mul *= 1.2; break;
    case '乌莱斯': mul *= 1.1; break;
    case '僵尸猪灵': mul *= 1.15; break;
    case '旋风人': if(task==='探索') mul *= 1.4; if(task==='休息') mul *= .7; break;
  }
  return mul;
}
function raceFoodCost(adv){
  if(adv.race==='骷髅'||adv.race==='乌莱斯'||adv.race==='僵尸猪灵'||adv.race==='唤藤者') return 0;
  if(adv.race==='尸壳') return 1;
  if(adv.race==='凋零骷髅') return 3;
  return 2;
}
function raceDailyOutput(adv){
  const out = {};
  if(adv.race==='唤藤者') out.食物 = 2;
  if(adv.race==='守卫者') out.食物 = 1;
  return out;
}
function canDoTask(adv,task){
  if(task==='狩猎' && adv.race==='唤藤者') return false;
  if(task==='行医' && adv.path!=='炼金术士') return false;
  return true;
}

/* ---------- 共享列表用的字符串工具 ---------- */
function escapeHtml(s){
  return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
function timeAgo(ts){
  const s = Math.floor((Date.now() - ts)/1000);
  if (s < 60) return s + ' 秒前';
  if (s < 3600) return Math.floor(s/60) + ' 分钟前';
  if (s < 86400) return Math.floor(s/3600) + ' 小时前';
  return Math.floor(s/86400) + ' 天前';
}
