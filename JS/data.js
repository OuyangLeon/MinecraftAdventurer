/* ============================================================
   data.js —— 所有静态配置数据
   （无依赖，只做数据声明）
   ============================================================ */

const ATTR_KEYS = ['力量','体质','敏捷','意志','魅力','灵感','幸运','智力'];
const ATTR_ICON = {力量:'💪',体质:'❤',敏捷:'🏃',意志:'🧠',魅力:'✨',灵感:'👁',幸运:'🍀',智力:'📖'};

const WAGE_PERIOD = 30;
const VERSION = 12;
const SAVE_KEY = 'mc_arcane_sim_v'+VERSION;
const LEGACY_KEYS = ['mc_arcane_sim_v11','mc_arcane_sim_v10','mc_arcane_sim_v9',
                     'mc_arcane_sim_v8','mc_arcane_sim_v7','mc_arcane_sim_v6',
                     'mc_arcane_sim_v5','mc_arcane_sim_v4','mc_arcane_sim_v3',
                     'mc_arcane_sim_v2','mc_arcane_sim_v1'];

/* ---------- 共享注册表配置 ---------- */
const SHARED = {
  enabled: true,
  createUrl: 'https://api.extendsclass.com/json-storage/bin',
  baseUrl:   'https://api.extendsclass.com/json-storage/bin/',
  registryId: '',       // 作者可填入固定 ID 让所有访客共享；留空则各自创建
  uploadThrottle: 20000,
  _lastUpload: 0,
  _uploading: false,
  _netOk: false
};
const REGISTRY_KEY = 'mc_camp_registry_id_v1';

/* ---------- 资源元数据 ---------- */
const RES_META = [
  {k:'食物',i:'🍖'},{k:'木材',i:'🪵'},{k:'石头',i:'🪨'},
  {k:'铁',i:'⛓'},{k:'金币',i:'🪙'},{k:'绿宝石',i:'💚'}
];

/* ---------- 种族 ---------- */
const RACES = {
  '人类':     { mod:{幸运:2},                    mech:'适应力强。无明显优缺点。', desc:'分布最广的种族。' },
  '僵尸':     { mod:{体质:4,敏捷:-3},             mech:'白天（奇数天）工作效率 -20%。', desc:'肤色青绿，行动迟缓。' },
  '尸壳':     { mod:{体质:3,力量:2,敏捷:-2},      mech:'食物消耗 -1/人。',       desc:'沙漠中的劫掠者。' },
  '溺尸':     { mod:{敏捷:3,体质:2,灵感:-1},      mech:'只能高效执行垂钓/探索；其他陆地工作效率 -40%。', desc:'蓝肤绿发的海洋亡灵。' },
  '骷髅':     { mod:{灵感:3,敏捷:2,体质:-2},      mech:'无需进食；白天工作效率 -30%。',  desc:'白骨智慧亡灵，善射。' },
  '凋零骷髅': { mod:{力量:5,体质:2,魅力:-3},      mech:'战斗与掘矿产出 +20%，但食物消耗 +1/人。', desc:'焦黑高大的亡灵战士。' },
  '乌莱斯':   { mod:{力量:4,灵感:2,体质:-3},      mech:'无需进食；所有劳作效率 +10%。',   desc:'蓝色灵体亡灵，可穿墙。' },
  '僵尸猪灵': { mod:{力量:3,体质:2,魅力:-2},      mech:'无需进食；所有劳作效率 +15%。',   desc:'大耳獠牙的亡灵。' },
  '猪灵':     { mod:{魅力:3,幸运:2,意志:-1},      mech:'个人消费时额外获得金币（而非花费）。', desc:'美丽好斗的商业种族。' },
  '苦力怕':   { mod:{力量:3,体质:2,魅力:-3},      mech:'昏迷时对周围冒险者造成 3~8 伤害。', desc:'碧绿的危险生物。' },
  '唤藤者':   { mod:{体质:3,意志:3,敏捷:-2},      mech:'无需进食，每日自动产出 2 食物；无法狩猎。', desc:'会行走的智慧植物。' },
  '守卫者':   { mod:{体质:4,灵感:2,敏捷:-3},      mech:'自动产出 1 食物/日；陆地工作效率 -20%。', desc:'海洋岩石皮肤种族。' },
  '旋风人':   { mod:{敏捷:4,灵感:2,力量:-2},      mech:'探索产出 +40%，但休息效率 -30%。',   desc:'天空中的风暴种族。' }
};

/* ---------- 奥术道路 ---------- */
const PATHS = {
  '凡俗者':   { desc:'未踏入奥术道路的人。', bonus:{}, wage:0 },
  '神秘使':   { desc:'以器物驾驭源质。',     bonus:{探索:3}, wage:2 },
  '受契之人': { desc:'与宗主签订契约。',     bonus:{狩猎:3}, wage:2 },
  '唤魔者':   { desc:'召唤生灵协助。',       bonus:{探索:2,狩猎:1}, wage:1 },
  '附魔师':   { desc:'为器物赋予魔咒。',     bonus:{掘矿:2,伐木:1}, wage:1 },
  '傀儡师':   { desc:'制作傀儡生物。',       bonus:{伐木:3,掘矿:1}, wage:1 },
  '炼金术士': { desc:'坩埚调和源质。',       bonus:{耕作:3,垂钓:2}, wage:2 }
};

/* ---------- 疾病 ---------- */
const DISEASES = {
  '感冒':{severity:1,days:[3,5],contagion:0,workMul:.75,effect:{体质:-2},desc:'轻微不适。',cureChance:.4,alchemyCure:1},
  '热病':{severity:2,days:[4,7],contagion:.1,workMul:.45,effect:{力量:-3,敏捷:-3,体质:-3},desc:'高烧不退。',cureChance:.2,alchemyCure:.85},
  '瘟疫':{severity:3,days:[6,10],contagion:.25,workMul:.2,effect:{力量:-4,敏捷:-4,体质:-5,意志:-2},desc:'重病缠身，易传染。',cureChance:.08,alchemyCure:.7}
};

/* ---------- 任务 ----------
   ★ 狩猎 base 从 4 提升到 6，让"高风险高回报"落地 */
const TASKS = {
  '休息':{icon:'🛏',main:null,res:null,base:0,risk:false,fatigue:-65,desc:'恢复生命/心理/幸福'},
  '建造':{icon:'🔨',main:'力量',res:null,base:0,risk:false,fatigue:8,desc:'推进工程进度'},
  '巡逻':{icon:'🛡',main:'意志',res:null,base:0,risk:true,fatigue:5,desc:'维持治安，可查获贪污'},
  '娱乐':{icon:'🎭',main:'魅力',res:null,base:0,risk:false,fatigue:4,desc:'提升全队幸福'},
  '行医':{icon:'⚕',main:'智力',res:null,base:0,risk:false,fatigue:4,desc:'炼金术士专属'},
  '狩猎':{icon:'🏹',main:'力量',res:'食物',base:6,risk:true,fatigue:12,attrKey:'力量',attrScale:.55,desc:'高风险高回报，检定等级越高产出越多'},
  '垂钓':{icon:'🎣',main:'灵感',res:'食物',base:3,risk:false,fatigue:3,attrKey:'灵感',attrScale:.7,desc:'稳定低疲劳，灵感影响大'},
  '伐木':{icon:'🪓',main:'力量',res:'木材',base:5,risk:false,fatigue:8,attrKey:'力量',attrScale:.8,desc:'受水车加成显著'},
  '掘矿':{icon:'⛏',main:'力量',res:'石头',base:5,risk:true,fatigue:10,attrKey:'力量',attrScale:.8,desc:'受矿井/熔炉加成显著'},
  '耕作':{icon:'🌾',main:'体质',res:'食物',base:5,risk:false,fatigue:6,attrKey:'体质',attrScale:.85,desc:'稳定，受风车加成'},
  '探索':{icon:'🗺',main:'灵感',res:'金币',base:4,risk:true,fatigue:10,attrKey:'灵感',attrScale:.7,desc:'高收益，高危险'}
};

/* ---------- 建筑 ---------- */
const BUILDINGS = {
  '住房':{icon:'🏠',baseCost:{木材:15,石头:5},baseWork:8,costMul:1.55,workMul:1.3,
    desc:lv=>`床位 ${1+lv}，幸福 +${(lv-1)*3}，休息 +${(lv-1)*10}%`,
    effect:lv=>({床位:1+lv,幸福度:(lv-1)*3,休息倍率:1+(lv-1)*.1})},
  '食堂':{icon:'🍲',baseCost:{木材:12,石头:8},baseWork:10,costMul:1.5,workMul:1.28,
    desc:lv=>`食物消耗 -${lv}，幸福 +${lv*2}`,
    effect:lv=>({食物减免:lv,幸福度:lv*2})},
  '酒馆':{icon:'🍺',baseCost:{木材:18,石头:10},baseWork:12,costMul:1.5,workMul:1.28,
    desc:lv=>`娱乐效果 +${lv*25}%，幸福 +${lv}`,
    effect:lv=>({娱乐加成:1+lv*.25,幸福度:lv})},
  '温泉':{icon:'♨',baseCost:{石头:20,木材:15},baseWork:14,costMul:1.5,workMul:1.28,
    desc:lv=>`每日幸福 +${lv*2}，疲劳恢复 +${lv*8}`,
    effect:lv=>({每日幸福:lv*2,疲劳恢复:lv*8})},
  '花园':{icon:'🌸',baseCost:{木材:12,食物:8},baseWork:10,costMul:1.5,workMul:1.25,
    desc:lv=>`每日幸福 +${1+lv}，疾病概率 -${lv*8}%`,
    effect:lv=>({每日幸福:1+lv,患病压制:1-lv*.08})},
  '农田':{icon:'🌾',baseCost:{木材:10,食物:5},baseWork:12,costMul:1.5,workMul:1.25,
    desc:lv=>`每日食物 +${lv*4}`,
    effect:lv=>({每日食物:lv*4})},
  '畜栏':{icon:'🐄',baseCost:{木材:15,食物:10},baseWork:14,costMul:1.5,workMul:1.28,
    desc:lv=>`每日食物 +${2+lv*2}`,
    effect:lv=>({每日食物:2+lv*2})},
  '仓库':{icon:'📦',baseCost:{木材:20,石头:10},baseWork:12,costMul:1.5,workMul:1.28,
    desc:lv=>`产出 +${lv*4}%，幸福 +${lv}`,
    effect:lv=>({产量倍率:1+lv*.04,幸福度:lv})},
  '熔炉':{icon:'🏭',baseCost:{石头:20,木材:10},baseWork:12,costMul:1.5,workMul:1.28,
    desc:lv=>`掘矿产铁，等级 ${lv}`,
    effect:lv=>({铁等级:lv})},
  '高炉':{icon:'⚒',baseCost:{石头:30,铁:5},baseWork:20,costMul:1.55,workMul:1.3,
    desc:lv=>`强化冶炼，铁等级 ${lv+1}`,
    effect:lv=>({铁等级:lv+1})},
  '矿井':{icon:'🕳',baseCost:{木材:20,石头:20},baseWork:16,costMul:1.5,workMul:1.28,
    desc:lv=>`掘矿 +${lv*10}%`,
    effect:lv=>({掘矿倍率:1+lv*.1})},
  '水车':{icon:'💧',baseCost:{木材:20,铁:3},baseWork:16,costMul:1.5,workMul:1.28,
    desc:lv=>`伐木 +${lv*10}%`,
    effect:lv=>({伐木倍率:1+lv*.1})},
  '风车':{icon:'🌀',baseCost:{木材:25,铁:5},baseWork:18,costMul:1.5,workMul:1.28,
    desc:lv=>`耕作 +${lv*10}%`,
    effect:lv=>({耕作倍率:1+lv*.1})},
  '瞭望塔':{icon:'🗼',baseCost:{木材:20,石头:15},baseWork:14,costMul:1.5,workMul:1.28,
    desc:lv=>`夜袭 -${lv*10}%，受伤 -${lv*6}%`,
    effect:lv=>({夜袭倍率:1-lv*.1,受伤倍率:1-lv*.06})},
  '围墙':{icon:'🧱',baseCost:{石头:30},baseWork:16,costMul:1.55,workMul:1.28,
    desc:lv=>`夜袭 -${lv*12}%，受伤 -${lv*8}%`,
    effect:lv=>({夜袭倍率:1-lv*.12,受伤倍率:1-lv*.08})},
  '治安所':{icon:'🚨',baseCost:{木材:20,石头:15},baseWork:14,costMul:1.55,workMul:1.3,
    desc:lv=>`犯罪 -${lv*3}/日，巡逻 +${lv*20}%，反腐 +${lv*30}%`,
    effect:lv=>({治安压制:lv*3,巡逻加成:1+lv*.2,反腐加成:1+lv*.3})},
  '医院':{icon:'🏥',baseCost:{木材:25,石头:20},baseWork:18,costMul:1.55,workMul:1.3,
    desc:lv=>`痊愈 +${lv*12}%，行医 +${lv*15}%`,
    effect:lv=>({痊愈加成:1+lv*.12,行医加成:1+lv*.15})},
  '药房':{icon:'💊',baseCost:{木材:15,石头:10,绿宝石:1},baseWork:14,costMul:1.5,workMul:1.28,
    desc:lv=>`行医消耗 -${lv*25}%，传染 -${lv*20}%`,
    effect:lv=>({行医节流:1-lv*.25,传染压制:1-lv*.2})},
  '附魔台':{icon:'📖',baseCost:{石头:20,绿宝石:2},baseWork:20,costMul:1.55,workMul:1.3,
    desc:lv=>`所有检定 +${lv}`,
    effect:lv=>({检定加值:lv})},
  '坩埚':{icon:'⚗',baseCost:{石头:15,铁:3},baseWork:16,costMul:1.5,workMul:1.28,
    desc:lv=>`休息心理恢复 +${lv*2}`,
    effect:lv=>({心理恢复:lv*2})},
  '傀儡工坊':{icon:'🗿',baseCost:{铁:10,木材:20},baseWork:24,costMul:1.55,workMul:1.3,
    desc:lv=>`每日石头 +${2+lv*2}`,
    effect:lv=>({每日石头:2+lv*2})}
};

/* ---------- 工资档位 ---------- */
const WAGE_TIERS = [
  {name:'无薪',mul:0,happyDelta:-20,integrityDelta:-25,corruptMul:2.5},
  {name:'低薪',mul:.6,happyDelta:-6,integrityDelta:-10,corruptMul:1.6},
  {name:'标准',mul:1,happyDelta:5,integrityDelta:0,corruptMul:1},
  {name:'优厚',mul:1.6,happyDelta:15,integrityDelta:10,corruptMul:.5}
];

/* ---------- 个人物品 / 消费选项 ---------- */
const PERSONAL_ITEMS = ['旧怀表','铜戒指','旅行日记','干枯花束','骰子','护身符',
  '家庭信物','异国硬币','小酒壶','木雕偶','破旧地图','银别针',
  '诗集','草药包','幸运骨','猎刀','羽毛笔','皮革钱袋'];

const SPENDING_OPTIONS = [
  {name:'喝一杯酒',cost:3,happy:6,desc:'在酒馆放松'},
  {name:'买点小吃',cost:2,happy:4,desc:'犒劳自己'},
  {name:'赌一把',cost:5,happy:8,risk:true,desc:'有输有赢'},
  {name:'买件小玩意',cost:4,happy:5,item:true,desc:'淘心头好'},
  {name:'给同伴买礼物',cost:6,happy:3,teamHappy:4,desc:'分享快乐'}
];

/* ---------- 篝火晚会消耗 ---------- */
const FEAST_COST = {食物:15, 金币:20};

/* ---------- 阶段目标 ---------- */
const GOALS = [
  {id:'g1',name:'初具规模',desc:'建成 3 栋建筑',check:s=>Object.keys(s.buildings).length>=3,reward:{金币:50}},
  {id:'g2',name:'人丁兴旺',desc:'人口达到 5 人',check:s=>s.adventurers.length>=5,reward:{金币:80}},
  {id:'g3',name:'商路初通',desc:'触发过商路事件',check:s=>s.flags&&s.flags.tradeRoute,reward:{金币:100}},
  {id:'g4',name:'安居乐业',desc:'平均幸福 ≥ 70',check:s=>s.adventurers.length>0&&s.adventurers.reduce((a,b)=>a+b.happiness,0)/s.adventurers.length>=70,reward:{食物:30}},
  {id:'g5',name:'铁壁营垒',desc:'建成围墙+治安所各1级',check:s=>(s.buildings['围墙']||0)>=1&&(s.buildings['治安所']||0)>=1,reward:{铁:20}},
  {id:'g6',name:'贤者之塔',desc:'建成附魔台1级',check:s=>(s.buildings['附魔台']||0)>=1,reward:{绿宝石:3}},
  {id:'g7',name:'太平盛世',desc:'犯罪率 ≤ 10 且存活 40 天',check:s=>s.crime.level<=10&&s.day>=40,reward:{金币:200}}
];

/* ---------- 随机事件 ---------- */
const EVENTS = [
  {id:'caravan',weight:3,title:'商队求宿',desc:'一支疲惫的商队请求在据点借宿一晚。',
   choices:[
     {text:'<b>接待（消耗 8 食物）</b>',effect:(s,log)=>{ if(s.res.食物<8){log('食物不足，商队失望离去。','warn');return;} s.res.食物-=8; if(Math.random()<.6){ s.flags.tradeRoute=true; log('🤝 商队感激，建立了商路！每日 +5 金币。','epic'); }else{ s.res.金币+=15; log('💰 商队支付 15 金币作为谢礼。','good'); } }},
     {text:'<b>拒绝</b>',effect:(s,log)=>{ s.crime.level=clamp(s.crime.level+5,0,100); log('🚪 商队失望离去，治安 -5。','warn'); }}
   ]},
  {id:'refugee',weight:2,title:'难民求助',desc:'一群衣衫褴褛的难民来到据点边缘，请求庇护。',
   choices:[
     {text:'<b>收留（消耗 15 食物）</b>',effect:(s,log)=>{ if(s.res.食物<15){log('食物不足。','warn');return;} s.res.食物-=15; log('🏘 难民在据点附近安家。','good'); }},
     {text:'<b>婉拒</b>',effect:(s,log)=>{ log('🚶 难民默默离开。',''); }}
   ]},
  {id:'mage',weight:2,title:'流浪法师',desc:'一位流浪法师希望在你据点借坩埚一用。',
   choices:[
     {text:'<b>允许</b>',effect:(s,log)=>{ if(Math.random()<.7){ s.res.绿宝石+=2; log('✨ 法师留下 2 绿宝石。','epic'); }else{ log('🔥 法师实验失手，损失 5 木材。','warn'); s.res.木材=Math.max(0,s.res.木材-5); } }},
     {text:'<b>拒绝</b>',effect:(s,log)=>{ log('🧙 法师摇头离去。',''); }}
   ]},
  {id:'merchant',weight:3,title:'流动商人',desc:'一名流动商人希望出售一批货物。',
   choices:[
     {text:'<b>采购（20 金币）</b>',effect:(s,log)=>{ if(s.res.金币<20){log('金币不足。','warn');return;} s.res.金币-=20; s.res.食物+=15; s.res.木材+=10; log('📦 采购完成：食物 +15，木材 +10。','good'); }},
     {text:'<b>不采购</b>',effect:(s,log)=>{ log('商人继续赶路。',''); }}
   ]},
  {id:'raid',weight:2,title:'亡灵斥候',desc:'几名亡灵斥候在据点外徘徊。',
   choices:[
     {text:'<b>主动出击</b>',effect:(s,log)=>{
       const awake=s.adventurers.filter(a=>a.status!=='昏迷'&&a.imprisoned===0);
       if(!awake.length){log('无人可战。','warn');return;}
       const v=pick(awake); const dmg=rnd(2,6); v.hp=Math.max(0,v.hp-dmg);
       if(Math.random()<.7){ s.res.铁+=3; log('⚔ 击退亡灵！铁 +3，'+v.name+' 受伤 '+dmg+'。','bad'); }
       else{ log('💥 战斗不利，'+v.name+' 受伤 '+dmg+'。','bad'); }
     }},
     {text:'<b>加强防守</b>',effect:(s,log)=>{ s.crime.level=clamp(s.crime.level+3,0,100); log('🛡 亡灵绕道而行。',''); }}
   ]},
  {id:'relic',weight:1,title:'古代遗迹',desc:'探索者在附近发现了一处古代遗迹入口。',
   choices:[
     {text:'<b>组织探索</b>',effect:(s,log)=>{
       if(Math.random()<.55){ const g=rnd(30,80); s.res.金币+=g; log('🏰 探险队取得重大收获！金币 +'+g,'epic'); }
       else{ const v=pick(s.adventurers.filter(a=>a.status!=='昏迷')); if(v){const dmg=rnd(3,10); v.hp=Math.max(0,v.hp-dmg); if(v.hp<=0)v.status='昏迷'; log('💀 遗迹陷阱！'+v.name+' 受伤 '+dmg+'。','bad');} else log('无人可派。','warn'); }
     }},
     {text:'<b>封存遗迹</b>',effect:(s,log)=>{ log('🚪 遗迹被重新封存。',''); }}
   ]}
];
