(function(){const e=document.createElement("link").relList;if(e&&e.supports&&e.supports("modulepreload"))return;for(const r of document.querySelectorAll('link[rel="modulepreload"]'))n(r);new MutationObserver(r=>{for(const s of r)if(s.type==="childList")for(const a of s.addedNodes)a.tagName==="LINK"&&a.rel==="modulepreload"&&n(a)}).observe(document,{childList:!0,subtree:!0});function t(r){const s={};return r.integrity&&(s.integrity=r.integrity),r.referrerPolicy&&(s.referrerPolicy=r.referrerPolicy),r.crossOrigin==="use-credentials"?s.credentials="include":r.crossOrigin==="anonymous"?s.credentials="omit":s.credentials="same-origin",s}function n(r){if(r.ep)return;r.ep=!0;const s=t(r);fetch(r.href,s)}})();const Yh=[0,20,50,100,170,260,380,540,740,1e3],vo=i=>Math.max(1,Yh.filter(e=>i>=e).length),qp={normal:0,green:0,blue:4,purple:12,gold:30,rainbow:60},hu=i=>i.traits.reduce((e,t)=>e+(Xi(t)==="size"?0:qp[dt[t].tier]),0)*i.kg/Ye[i.species].kg;function Kh(i){const e=hu(i);return e>=150?"rainbow":e>=50?"gold":e>=25?"purple":"blue"}const Zh={strawberry:["sugar","fragrant","milky","honey","delicate","starcore","glassheart","dreambutterfly"],pineapple:["juicy","coral","honey","nectar","redgold","abundant","galaxycore","halo"],apple:["sugar","shiny","wax","striped","golden","amber","daylight","meteorRing"],blueberry:["mint","firefly","nightdye","dew","silver","moon","nebula","stardust"],tomato:["juicy","coral","twin","nectar","abundant","crystal","glassheart","prism"],carrot:["fragrant","leafwhistle","softcore","breezy","delicate","goldbell","galaxycore","halo"],lotus:["mist","raindrop","celadon","pearl","jade","moon","iridescent","dreambutterfly"],sunflower:["shiny","petals","flowerknot","milky","golden","amber","daylight","halo"],tulip:["velvet","petals","butterfly","classical","crystal","glowring","rainbow","meteorRing"]},Wn={sunny:{name:"晴日",icon:"☀",grade:"R",pool:["sugar","juicy","shiny","honey","wax","golden","daylight"],mass:[0,.1]},breeze:{name:"花风",icon:"🍃",grade:"SR",pool:["fragrant","petals","breezy","flowerknot","delicate","halo"],mass:[.05,.2]},rain:{name:"甘霖",icon:"🌧",grade:"SR",pool:["raindrop","mint","dew","celadon","jade","glassheart"],mass:[.1,.35]},storm:{name:"雷暴",icon:"⚡",grade:"SR",pool:["shiny","mist","nightdye","purple","thunder","prism"],mass:[.1,.3]},snow:{name:"初雪",icon:"❄",grade:"SR",pool:["velvet","raindrop","frost","snowbell","silver","iridescent"],mass:[.05,.2]},honeywind:{name:"蜜风",icon:"🌼",grade:"SR",pool:["sugar","fragrant","nectar","milky","amber","galaxycore"],mass:[.15,.4]},meteor:{name:"流星夜",icon:"☄",grade:"SSR",pool:["breezy","pearl","moon","starcore","stardust","meteorRing"],mass:[.3,.8]},aurora:{name:"极光夜",icon:"🌌",grade:"SSR",pool:["frost","nightdye","crystal","silver","rainbow","iridescent"],mass:[.3,.9]},prismatic:{name:"幻光",icon:"🌈",grade:"SSR",pool:["purple","celadon","jade","crystal","prism","glassheart"],mass:[.3,.8]},daylight:{name:"极昼",icon:"🌅",grade:"SSR",pool:["milky","wax","golden","redgold","daylight","halo"],mass:[.35,.9]},starchart:{name:"星图",icon:"✨",grade:"SSR",pool:["butterfly","softcore","glowring","obsidian","nebula","galaxycore","dreambutterfly"],mass:[.4,1]}};function sd(i,e="garden"){const t=Ks(`weather3:${e}:${i}`),n=["breeze","rain","storm","snow","honeywind"],r=["meteor","aurora","prismatic","daylight","starchart"];return(i%13+13)%13===12?r[Math.floor(t()*r.length)]:t()<10/150?n[Math.floor(t()*n.length)]:"sunny"}const jp=i=>i==="starchart"?[0,600,353,47]:Wn[i].grade==="SSR"?[0,66,30,4]:Wn[i].grade==="SR"?[400,400,200,4]:[700,200,100,2],Yp=i=>{const e=Kt[i],t=e.grade-1;return{effect:e.effect,grade:e.grade,price:{speed:[5,12,24,45],mutation:[7,18,38,70],weight:[6,14,30,55]}[e.effect][t],speed:[.2,.3,.4,.5][t],lambda:[.23,.64,1.08,1.29][t],mass:[[0,.4],[.3,.6],[.5,1],[.8,1.2]][t]}};function Ro(i){const e=Yp(i);return e.effect==="speed"?`剩余生长时间缩短 ${Math.round(e.speed*100)}%，天气暴露也缩短`:e.effect==="mutation"?`变异强度 +${e.lambda}，按剩余幼苗覆盖折算`:`最终重量倍率 +${e.mass[0]}～${e.mass[1]}`}const Kp={strawberry:{cost:6,sale:30,minutes:30},sunflower:{cost:12,sale:55,minutes:60},lotus:{cost:12,sale:55,minutes:60},tulip:{cost:12,sale:55,minutes:60},pineapple:{cost:36,sale:150,minutes:240},apple:{cost:54,sale:220,minutes:480},carrot:{cost:3,sale:12,minutes:10},tomato:{cost:8,sale:36,minutes:30},blueberry:{cost:14,sale:60,minutes:60}},Zp={normal:{name:"普通精油",price:35,single:.25,double:.3,pity:10,size:.2,cap:3},rich:{name:"浓缩精油",price:80,single:.4,double:.5,pity:5,size:.3,cap:4}},Yr=[{id:"lantern",name:"灯笼",price:120,tier:"common"},{id:"plant",name:"盆栽",price:360,tier:"common"},{id:"fan",name:"折扇",price:480,tier:"common"},{id:"clock",name:"挂钟",price:900,tier:"common"},{id:"teapot",name:"茶壶案几",price:1200,tier:"common"},{id:"painting",name:"山水挂画",price:4e3,tier:"rare"},{id:"calligraphy",name:"字画卷轴",price:6e3,tier:"rare"},{id:"shelf",name:"书架",price:6e3,tier:"rare"},{id:"window",name:"圆窗",price:9e3,tier:"epic"},{id:"screen",name:"屏风",price:9e3,tier:"epic"}];function Jp(i,e){const t=Ks(`furniture-v4:${i}:${e}`),n=Yr.filter(a=>a.tier==="common");if(t()>=.08)return[...n];const r=t(),s=Yr.filter(a=>a.price===(r<.6?4e3:r<.9?6e3:9e3));return[...n,s[Math.floor(t()*s.length)]]}const Qp={cost:60},Ko={kyoto:{name:"京都",cost:120,minutes:120,seed:"lotus"},paris:{name:"巴黎",cost:220,minutes:180,seed:"tulip"},island:{name:"海岛",cost:300,minutes:240,seed:"pineapple"}},Jh=[{id:"kyoto-lantern",name:"京都·花灯",base:"lantern",city:"kyoto",trips:3,tint:"hue-rotate(340deg)"},{id:"kyoto-screen",name:"京都·庭院屏风",base:"screen",city:"kyoto",trips:6,tint:"hue-rotate(340deg)"},{id:"paris-painting",name:"巴黎·画廊小画",base:"painting",city:"paris",trips:3,tint:"hue-rotate(20deg)"},{id:"paris-clock",name:"巴黎·旧街挂钟",base:"clock",city:"paris",trips:6,tint:"hue-rotate(20deg)"},{id:"island-plant",name:"海岛·海风盆栽",base:"plant",city:"island",trips:3,tint:"hue-rotate(30deg)"},{id:"island-window",name:"海岛·晴海圆窗",base:"window",city:"island",trips:6,tint:"hue-rotate(30deg)"}];function em(i,e){const t=Math.floor(i/18e5),n=Ks(`social-weather:${e}:${t}`),r=n(),s=["aurora","meteor","prismatic","daylight","starchart"],a=["breeze","rain","storm","snow","honeywind"],o=Math.floor(Ks(`weather-offset:${e}`)()*96),l=((t+o)%96+96)%96===95||r<.02?s[Math.floor(n()*s.length)]:r<.1?a[Math.floor(n()*a.length)]:"sunny";return{id:`social-weather:${e}:${t}`,kind:l,start:t*18e5,end:(t+1)*18e5,source:e}}const Ye={lotus:{name:"莲花",minutes:60,price:65,kg:.6,harvests:1,rarity:"blue",chance:.5},strawberry:{name:"草莓",minutes:30,price:30,kg:.2,harvests:3,rarity:"normal",chance:1},sunflower:{name:"向日葵",minutes:15,price:45,kg:.4,harvests:1,rarity:"green",chance:.8},carrot:{name:"胡萝卜",minutes:5,price:12,kg:.15,harvests:1,rarity:"normal",chance:1},tomato:{name:"番茄",minutes:30,price:70,kg:.3,harvests:3,rarity:"green",chance:.65},blueberry:{name:"蓝莓",minutes:60,price:110,kg:.15,harvests:3,rarity:"blue",chance:.4},pineapple:{name:"菠萝",minutes:240,price:180,kg:1.2,harvests:3,rarity:"purple",chance:.2},apple:{name:"苹果",minutes:480,price:240,kg:.4,harvests:3,rarity:"gold",chance:.12},tulip:{name:"郁金香",minutes:60,price:55,kg:.25,harvests:1,rarity:"green",chance:.7}};function tm(i,e){return e?.economy?Kp[i].minutes:Ye[i].minutes*(e?.v3?1-.01*(vo(e.xp[i])-1):e?1-.03*(ef(e.xp[i])-1):1)}function Co(i,e){const t=Number(tm(i,e).toFixed(2)),n=e?.economy?1:Ye[i].harvests;return`${t} 分钟成熟${n>1?` / 轮 · 可采 ${n} 次`:""}`}const dt={shiny:{name:"闪亮",category:"accessory",tier:"blue",level:1,chance:.008,multiplier:1.5},purple:{name:"异色·紫色",category:"body",tier:"purple",level:1,chance:.013,multiplier:2},giant:{name:"巨大化",category:"body",tier:"gold",level:1,chance:.009,multiplier:2.5},twin:{name:"双生",category:"body",tier:"purple",level:1,chance:.01,multiplier:1.8},golden:{name:"鎏金",category:"body",tier:"gold",level:2,chance:.006,multiplier:3},rainbow:{name:"虹彩",category:"body",tier:"rainbow",level:3,chance:.0035,multiplier:5},mint:{name:"薄荷",category:"body",tier:"blue",level:1,chance:.008,multiplier:1.4},coral:{name:"珊瑚",category:"body",tier:"blue",level:1,chance:.008,multiplier:1.4},punk:{name:"朋克",category:"accessory",tier:"purple",level:1,chance:.008,multiplier:1.8},classical:{name:"古典",category:"accessory",tier:"purple",level:1,chance:.008,multiplier:1.8},firefly:{name:"萤火",category:"accessory",tier:"blue",level:1,chance:.008,multiplier:1.4},petals:{name:"花雨",category:"accessory",tier:"blue",level:1,chance:.008,multiplier:1.4},frost:{name:"冰冻",category:"body",tier:"purple",level:1,chance:.0045,multiplier:2},thunder:{name:"雷击",category:"accessory",tier:"gold",level:1,chance:.0025,multiplier:2.5},dew:{name:"凝露",category:"body",tier:"purple",level:2,chance:.006,multiplier:1.6},striped:{name:"斑纹",category:"body",tier:"purple",level:2,chance:.006,multiplier:1.6},honey:{name:"蜜心",category:"body",tier:"purple",level:3,chance:.005,multiplier:1.8},breezy:{name:"风铃",category:"accessory",tier:"purple",level:3,chance:.005,multiplier:1.8},jade:{name:"玉润",category:"body",tier:"gold",level:4,chance:.003,multiplier:2.8},crystal:{name:"晶透",category:"body",tier:"gold",level:4,chance:.003,multiplier:2.8},moon:{name:"月华",category:"accessory",tier:"gold",level:5,chance:.0025,multiplier:3},amber:{name:"琥珀",category:"body",tier:"gold",level:5,chance:.0025,multiplier:3},stardust:{name:"星尘",category:"accessory",tier:"rainbow",level:6,chance:.001,multiplier:4.5},prism:{name:"棱光",category:"body",tier:"rainbow",level:6,chance:.001,multiplier:4.5},nebula:{name:"星云",category:"body",tier:"rainbow",level:7,chance:8e-4,multiplier:5},halo:{name:"天光冠",category:"accessory",tier:"rainbow",level:8,chance:6e-4,multiplier:5},sugar:{name:"糖心",category:"body",tier:"blue",level:1,chance:0,multiplier:1.4},fragrant:{name:"清香",category:"body",tier:"blue",level:1,chance:0,multiplier:1.4},juicy:{name:"多汁",category:"body",tier:"blue",level:1,chance:0,multiplier:1.4},nectar:{name:"饱蜜",category:"body",tier:"purple",level:2,chance:0,multiplier:1.8},milky:{name:"奶香",category:"body",tier:"purple",level:2,chance:0,multiplier:1.8},softcore:{name:"糯心",category:"body",tier:"purple",level:3,chance:0,multiplier:1.8},delicate:{name:"玲珑",category:"body",tier:"gold",level:4,chance:0,multiplier:2.8},abundant:{name:"丰穗",category:"body",tier:"gold",level:4,chance:0,multiplier:2.8},starcore:{name:"星瓤",category:"body",tier:"gold",level:5,chance:0,multiplier:3},glassheart:{name:"琉璃心",category:"body",tier:"rainbow",level:7,chance:0,multiplier:5},galaxycore:{name:"星河芯",category:"body",tier:"rainbow",level:8,chance:0,multiplier:5},velvet:{name:"绒霜",category:"body",tier:"blue",level:1,chance:0,multiplier:1.4},celadon:{name:"青瓷",category:"body",tier:"purple",level:2,chance:0,multiplier:1.8},wax:{name:"蜜蜡",category:"body",tier:"purple",level:3,chance:0,multiplier:1.8},pearl:{name:"珠光",category:"body",tier:"purple",level:3,chance:0,multiplier:1.8},nightdye:{name:"夜染",category:"body",tier:"purple",level:3,chance:0,multiplier:1.8},redgold:{name:"赤金",category:"body",tier:"gold",level:4,chance:0,multiplier:3},silver:{name:"秘银",category:"body",tier:"gold",level:5,chance:0,multiplier:3},obsidian:{name:"曜石",category:"body",tier:"gold",level:5,chance:0,multiplier:3},iridescent:{name:"幻彩",category:"body",tier:"rainbow",level:7,chance:0,multiplier:5},daylight:{name:"极昼",category:"body",tier:"rainbow",level:8,chance:0,multiplier:5},mist:{name:"晨雾",category:"accessory",tier:"blue",level:1,chance:0,multiplier:1.4},raindrop:{name:"雨珠",category:"accessory",tier:"blue",level:1,chance:0,multiplier:1.4},leafwhistle:{name:"叶哨",category:"accessory",tier:"blue",level:1,chance:0,multiplier:1.4},flowerknot:{name:"花结",category:"accessory",tier:"purple",level:2,chance:0,multiplier:1.8},butterfly:{name:"蝶舞",category:"accessory",tier:"purple",level:3,chance:0,multiplier:1.8},snowbell:{name:"雪铃",category:"accessory",tier:"purple",level:3,chance:0,multiplier:1.8},glowring:{name:"流萤",category:"accessory",tier:"gold",level:5,chance:0,multiplier:3},goldbell:{name:"金铃",category:"accessory",tier:"gold",level:5,chance:0,multiplier:3},meteorRing:{name:"流星环",category:"accessory",tier:"rainbow",level:7,chance:0,multiplier:5},dreambutterfly:{name:"幻蝶",category:"accessory",tier:"rainbow",level:8,chance:0,multiplier:5},mini:{name:"迷你",category:"body",tier:"blue",level:1,chance:0,multiplier:1},plump:{name:"饱满",category:"body",tier:"purple",level:1,chance:0,multiplier:1},large:{name:"大型",category:"body",tier:"gold",level:1,chance:0,multiplier:1}},si={normal:"普通",green:"优良",blue:"精品",purple:"紫色",gold:"金色",rainbow:"彩色"},Kt={speed:{name:"初级加速",description:"生长时间减少 50%",effect:"speed",strength:.5,grade:1,price:25,chance:.85},mutation:{name:"初级变异",description:"每批果实额外一次变异机会",effect:"mutation",strength:1.5,grade:1,price:35,chance:.8},weight:{name:"初级增重",description:"每批果实重量增加 50%",effect:"weight",strength:1.5,grade:1,price:30,chance:.85},speed2:{name:"中级加速",description:"生长时间减少 65%",effect:"speed",strength:.65,grade:2,price:75,chance:.35},mutation2:{name:"中级变异",description:"每批果实获得更高变异机会",effect:"mutation",strength:2,grade:2,price:100,chance:.3},weight2:{name:"中级增重",description:"每批果实重量增加 80%",effect:"weight",strength:1.8,grade:2,price:85,chance:.35},speed3:{name:"高级加速",description:"生长时间减少 80%",effect:"speed",strength:.8,grade:3,price:180,chance:.1},mutation3:{name:"高级变异",description:"每批果实获得最高变异机会",effect:"mutation",strength:3,grade:3,price:240,chance:.08},weight3:{name:"高级增重",description:"每批果实重量增加 120%",effect:"weight",strength:2.2,grade:3,price:210,chance:.1},speed4:{name:"特级加速",description:"本轮剩余时间减少 50%",effect:"speed",strength:.5,grade:4,price:45,chance:.05},mutation4:{name:"特级变异",description:"幼苗变异强度 +1.29",effect:"mutation",strength:1.29,grade:4,price:70,chance:.05},weight4:{name:"特级增重",description:"最终重量倍率 +0.8～1.2",effect:"weight",strength:1.2,grade:4,price:55,chance:.05}},Qh=[0,40,80,160,280,440,660,960],fu=18e4;function ef(i){return Math.max(1,Qh.filter(e=>i>=e).length)}const pu={fruit:"果实",skin:"果皮",accessory:"挂饰",size:"体型"};function Xi(i){return["giant","mini","plump","large"].includes(i)?"size":dt[i].category==="accessory"?"accessory":["twin","honey","nebula","sugar","fragrant","juicy","nectar","milky","softcore","delicate","abundant","starcore","glassheart","galaxycore"].includes(i)?"fruit":"skin"}function ii(i,e){if(e?.publicQuality)return e.publicQuality;if(e?.growthVersion===3)return Kh(e);const t=Lo(i);return t==="blue"||t==="green"?"normal":t}function Pt(i){return(i.growthVersion===2||i.growthVersion===3)&&!i.revealed&&ii(i.traits,i)==="rainbow"}function qi(i){return!i.bred&&!i.locked&&!Pt(i)&&["gold","rainbow"].includes(ii(i.traits,i))}function zs(i,e){const t=i.cultivation;return t?Math.max(0,t.remainingMs-(t.startedAt===void 0?0:Math.max(0,e-t.startedAt))):i.growthVersion===3?18e4:fu}function nm(i){return Math.min(15,1+[...new Set(i)].reduce((e,t)=>e+dt[t].multiplier-1,0))}function Lo(i){const e=["normal","green","blue","purple","gold","rainbow"];return i.reduce((t,n)=>e.indexOf(dt[n].tier)>e.indexOf(t)?dt[n].tier:t,"normal")}function Mi(i,e=Date.now()){return Math.max(0,Math.min(1,(e-i.plantedAt)/Math.max(1,i.readyAt-i.plantedAt)))}function im(i){if(i.economy)return i.economy.tutorial.claimed?i.economy.tutorial.bred?{text:"拜访朋友 · 共享天气 · 布置小屋",page:"friends"}:{text:"试试第一次金色繁育",page:"plots"}:{text:"邀请伙伴 · 领取金色亲本和加速肥",page:"plots"};const e=i.journey??{bought:0,planted:0,harvested:0,earned:0,appleBought:0};if(!e.bought)return{text:"购买一份种子（0/1）",page:"shop"};if(!e.planted)return{text:"种下一株植物（0/1）",page:"plots"};if(!e.harvested)return{text:"完成首次采摘（0/1）",page:"plots"};if(e.earned<240)return{text:`出售收获（${Math.floor(e.earned)}/240 币）`,page:"bag"};if(!e.appleBought)return{text:"购买苹果种子（0/1）",page:"shop"};const t=i.discovered.filter(n=>n.endsWith(":base")).length;return{text:t<Object.keys(Ye).length?`收集不同植物（${t}/${Object.keys(Ye).length}）`:"植物图鉴已集齐 · 去看看新的词条",page:"book"}}const rm=864e5,mn={work:64800,speed:360,leaseMs:15e3,minSeconds:20,minContribution:.05},sm=i=>(i+1)*rm-4*36e5,_i=[0,20,60,120,200,300,440,620,840,1100],el=i=>_i.filter(e=>i>=e).length,am=[],Po={lotus:"🪷",strawberry:"🍓",sunflower:"🌻",carrot:"🥕",tomato:"🍅",blueberry:"🫐",pineapple:"🍍",apple:"🍎",tulip:"🌷"},Hs={cream:{name:"奶油",hue:35},mint:{name:"薄荷绿",hue:105},pink:{name:"樱粉",hue:320},lilac:{name:"淡紫",hue:260},ocean:{name:"海蓝",hue:180}},ri={color:{name:"色彩喷雾",price:90,description:"随机染成一种颜色 · 不增加词条或售价",pool:[]},fruit:{name:"果实喷雾",price:150,description:"果实槽随机获得一个词条",pool:["sugar","fragrant","juicy","twin","honey","nectar","milky","softcore","delicate","abundant","starcore","nebula","glassheart","galaxycore"]},material:{name:"材质喷雾",price:180,description:"果皮槽随机获得一个词条",pool:["mint","coral","velvet","purple","frost","dew","striped","celadon","wax","pearl","nightdye","golden","jade","crystal","amber","redgold","silver","obsidian","rainbow","prism","iridescent","daylight"]},charm:{name:"挂饰喷雾",price:180,description:"挂饰槽随机获得一个词条",pool:["shiny","firefly","petals","mist","raindrop","leafwhistle","punk","classical","breezy","flowerknot","butterfly","snowbell","thunder","moon","glowring","goldbell","stardust","halo","meteorRing","dreambutterfly"]},moon:{name:"月夜喷雾",price:260,description:"月夜主题随机词条",pool:["nightdye","moon","stardust"]}};function tf(i){if(Xi(i)==="size")return"最终重量派生 / 增重肥 / 重量鉴定"+(i==="mini"?"":" / 体型遗传");const e=Object.keys(ri).filter(n=>ri[n].pool.includes(i)).map(n=>ri[n].name);for(const n of Object.values(Wn))n.pool.includes(i)&&e.unshift(n.name);const t=Object.entries(Zh).filter(([,n])=>n.includes(i)).map(([n])=>Ye[n].name);return t.length&&e.push(t.join("、")+"亲和"),e.push("杂交遗传"),e.join(" / ")}function om(i){return i==="color"?Object.keys(Hs).map(e=>({dye:e,weight:1})):ri[i].pool.map(e=>({trait:e,weight:{blue:60,purple:30,gold:9,rainbow:1,normal:60,green:60}[dt[e].tier]}))}function Ks(i){let e=2166136261;for(const t of i)e=Math.imul(e^t.charCodeAt(0),16777619);return()=>{e+=1831565813;let t=Math.imul(e^e>>>15,1|e);return t^=t+Math.imul(t^t>>>7,61|t),((t^t>>>14)>>>0)/4294967296}}function cm(i,e){const t=Ks(`shop-v1:${i}:${e}`),n=Object.keys(ri).map(s=>({k:s,r:t()})).sort((s,a)=>s.r-a.r).slice(0,2).map(s=>s.k),r=Object.keys(Ye).map(s=>({k:s,r:t()})).sort((s,a)=>s.r-a.r).slice(0,3).map(s=>s.k);return[...n.map(s=>({id:`${e}:spray:${s}`,kind:"spray",item:s,price:ri[s].price,limit:1})),...r.map(s=>({id:`${e}:seed:${s}`,kind:"seed",item:s,price:Ye[s].price,limit:3}))]}function nf(i,e){return!i.done&&!e.locked&&!Pt(e)&&e.species===i.species&&i.traits.every(t=>e.traits.includes(t))}function tl(i){return`${Ye[i.species].name} ×1${i.traits.length?" · "+i.traits.map(e=>dt[e].name).join("＋"):""}`}function mu(i){return i.activeActor?i.life?.characters[i.activeActor]:void 0}const lm=7,rf=i=>Math.min(7,Math.max(3,i+2)),pa=i=>i.economy?4:rf(el(mu(i)?.xp??0)),sf=(i,e)=>e<pa(i)||!!i.plots[e],af=i=>i.plots.filter((e,t)=>!e&&t<pa(i)).length;function so(i,e){if(!(i.life?.pending?.target===e.id||i.v3?.appraisals[e.id]&&!i.v3.appraisals[e.id].done))return mu(i)?.wishes.filter(t=>nf(t,e)).sort((t,n)=>n.xp-t.xp)[0]}const ao="application/x-qbot-garden-fruit",Xe=(i,e="",t="")=>{const n=document.createElement(i);return n.textContent=e,n.className=t,n};function $r(i,e,t,n=!1){const r=Xe("button",i);return r.type="button",r.title=e,r.setAttribute("aria-label",e),r.onclick=t,r.disabled=n,r}function Zo(i){const e=Xe("span","","character-portrait"),t=i?"__portrait.png":void 0;if(i&&t){const n=Xe("img");n.src=`qbot-asset://${i.dirId}/${t}`,n.alt=i.manifest.name,n.draggable=!1,n.onerror=()=>{e.textContent=i.manifest.name.slice(0,1)},e.append(n)}else e.textContent=i?.manifest.name.slice(0,1)??"？";return e}function ad(i){document.querySelector(".character-dialog")?.remove();const e=Xe("dialog","","character-dialog"),t=Xe("div","","character-dialog-title");return t.append(Xe("h2",i),$r("×","关闭",()=>e.close())),e.append(t),e.addEventListener("close",()=>e.remove()),e.onclick=n=>{if(n.target===e){const r=e.getBoundingClientRect();(n.clientX<r.left||n.clientX>r.right||n.clientY<r.top||n.clientY>r.bottom)&&e.close()}},document.body.append(e),e.showModal(),e}function um(i){const{state:e}=i,t=mu(e),n=t?.xp??0,r=el(n),s=i.characters.find(p=>p.dirId===e.activeActor),a=Xe("header","","character-header");if(a.setAttribute("aria-label","角色与今日心愿"),e.economy){const p=Xe("div","","character-identity");p.append(Zo(s),Xe("strong",s?.manifest.name??"选择角色"));const _=Xe("select");_.setAttribute("aria-label","一起种植的角色");for(const x of i.characters)_.append(new Option(x.manifest.name,x.dirId));_.value=e.activeActor??"",_.onchange=()=>{i.switchActor(_.value)},p.append(_);const y=Xe("div","","character-wallet");return y.append(Xe("small","花园币"),Xe("strong",String(e.coins))),a.append(p,Xe("p","一起种植 · 四块土地 · 心愿记录共同经历"),y),a}const o=Xe("div","","character-identity"),c=$r("","把背包果实拖到这里投喂",()=>i.notice("把背包里的果实拖到角色或今日心愿上，也可点击果实的投喂按钮。"),!e.activeActor);c.className="character-feed-target",c.append(Zo(s));const l=Xe("div","","character-summary"),u=Xe("div","","character-name");u.append(Xe("strong",s?.manifest.name??(e.activeActor?"当前角色":"选择角色")),Xe("span",`Lv.${r}`,"character-level"));const d=Xe("span","","character-small-actions");d.append($r("⇄","切换角色",()=>{const p=ad("选择陪伴的角色");i.characters.length||p.append(Xe("p","角色列表暂不可用，请关闭后重新打开花园。"));for(const _ of i.characters){const y=e.life?.characters[_.dirId],x=el(y?.xp??0),A=$r("",`切换到${_.manifest.name}`,()=>{p.querySelectorAll("button").forEach(w=>w.disabled=!0),i.switchActor(_.dirId).then(()=>p.close()).catch(w=>{i.notice(String(w)),p.querySelectorAll("button").forEach(R=>R.disabled=!1)})},i.busy||_.dirId===e.activeActor);A.className="character-choice",A.append(Zo(_),Xe("strong",_.manifest.name),Xe("span",`Lv.${x} · ${y?.xp??0} 经验${_.dirId===e.activeActor?" · 当前":""}`)),p.append(A)}},i.busy),$r("↗","查看等级奖励",()=>{const p=ad(`${s?.manifest.name??"角色"}的成长`);p.append(Xe("p",`Lv.${r} · 累计 ${n} 经验`,"muted"));const _=Xe("ol","","level-rewards");for(let y=1;y<=_i.length;y++){const x=Xe("li","",y<=r?"achieved":""),A=[...y<=5?[`${rf(y)} 块土地${y===5?"（全部解锁）":""}`]:[],...am.filter(w=>w.level===y).map(w=>w.name)];x.append(Xe("strong",`Lv.${y}`),Xe("span",A.join(" · ")||"继续积累成长"),Xe("small",`${_i[y-1]} 经验${y<=r?" · 已达到":""}`)),_.append(x)}p.append(_)})),u.append(d);const f=Xe("progress");f.setAttribute("aria-label","角色升级经验"),f.max=r<_i.length?_i[r]-_i[r-1]:1,f.value=r<_i.length?n-_i[r-1]:1,l.append(u,f,Xe("small",`${r<_i.length?`${f.value} / ${f.max} 经验`:"已满级"} · ${pa(e)} 块土地`,"character-experience")),o.append(c,l);const h=Xe("section","","header-wishes");h.setAttribute("aria-label","今日心愿");const m=Xe("div","","wish-heading");m.append(Xe("strong","今日心愿"),Xe("small","拖来果实，喂给它")),h.append(m);const v=Xe("div","","header-wish-list");for(const p of t?.wishes??[]){const _=Xe("div","",`header-wish${p.done?" completed":""}`);_.dataset.wish=p.id,_.append(Xe("span",Po[p.species],"wish-icon"),Xe("span",tl(p),"wish-name"),Xe("small",p.done?"已完成":`+${p.xp} 经验`)),p.done||_.append($r("↻",`更换心愿：${tl(p)}`,()=>{i.act({type:"rerollWish",wish:p.id})},i.busy||!!t?.rerolled)),v.append(_)}t||v.append(Xe("small","选择一个角色，看看它今天想吃什么。")),h.append(v);const g=Xe("div","","character-wallet");return g.append(Xe("small","花园币"),Xe("strong",`◉ ${e.coins.toLocaleString()}`)),a.append(o,h,g),a.ondragover=p=>{!p.dataTransfer?.types.includes(ao)||i.busy||(p.preventDefault(),p.dataTransfer.dropEffect="move",a.classList.add("feeding-over"))},a.ondragleave=p=>{(!(p.relatedTarget instanceof Node)||!a.contains(p.relatedTarget))&&a.classList.remove("feeding-over")},a.ondrop=p=>{if(a.classList.remove("feeding-over"),!!p.dataTransfer?.types.includes(ao)){p.preventDefault();try{const _=JSON.parse(p.dataTransfer.getData(ao));typeof _.id=="string"&&_.actor===e.activeActor?i.feed(_.id,e.activeActor):i.notice("角色已切换，请重新拖动果实。")}catch{i.notice("请从收获篮拖动一颗果实。")}}},a}const dm=""+new URL("calligraphy-CaqZ3Z3d.png",import.meta.url).href,hm=""+new URL("clock-BLxTcNuM.png",import.meta.url).href,fm=""+new URL("fan-BM5aYuXZ.png",import.meta.url).href,pm=""+new URL("lantern-CA_brrBe.png",import.meta.url).href,mm=""+new URL("painting-B8ZY23ir.png",import.meta.url).href,gm=""+new URL("plant-CDUvCHm2.png",import.meta.url).href,vm=""+new URL("screen-l5V3Eu8N.png",import.meta.url).href,_m=""+new URL("shelf-lxfPufq4.png",import.meta.url).href,ym=""+new URL("teapot-B5X8-Y3G.png",import.meta.url).href,xm=""+new URL("window-DBaWrIw0.png",import.meta.url).href,Zn=i=>new URL(Object.assign({"./decor/calligraphy.png":dm,"./decor/clock.png":hm,"./decor/fan.png":fm,"./decor/lantern.png":pm,"./decor/painting.png":mm,"./decor/plant.png":gm,"./decor/screen.png":vm,"./decor/shelf.png":_m,"./decor/teapot.png":ym,"./decor/window.png":xm})[`./decor/${i}.png`],import.meta.url).href,nl=[{id:"painting",name:"山水挂画",image:Zn("painting"),defaultW:91,anchor:"wall",category:"墙面",aspect:1.431},{id:"lantern",name:"灯笼",image:Zn("lantern"),defaultW:84,anchor:"wall",category:"墙面",aspect:1.55},{id:"window",name:"圆窗",image:Zn("window"),defaultW:149,anchor:"wall",category:"墙面",aspect:1.006},{id:"clock",name:"挂钟",image:Zn("clock"),defaultW:90,anchor:"wall",category:"墙面",aspect:1.003},{id:"fan",name:"折扇",image:Zn("fan"),defaultW:113,anchor:"wall",category:"墙面",aspect:.796},{id:"calligraphy",name:"字画卷轴",image:Zn("calligraphy"),defaultW:67,anchor:"wall",category:"墙面",aspect:2.703},{id:"screen",name:"屏风",image:Zn("screen"),defaultW:165,anchor:"floor",category:"家具",aspect:1.153},{id:"shelf",name:"书架",image:Zn("shelf"),defaultW:92,anchor:"floor",category:"家具",aspect:1.948},{id:"plant",name:"盆栽",image:Zn("plant"),defaultW:99,anchor:"floor",category:"家具",aspect:1.206},{id:"teapot",name:"茶壶案几",image:Zn("teapot"),defaultW:84,anchor:"floor",category:"家具",aspect:.836}];for(const i of Jh){const e=nl.find(t=>t.id===i.base);nl.push({...e,id:i.id,name:i.name,tint:i.tint})}const Mm=new Map(nl.map(i=>[i.id,i])),Fe=(i,e="",t="")=>{const n=document.createElement(i);return n.textContent=e,n.className=t,n},Lt=(i,e,t=!1)=>{const n=document.createElement("button");return n.textContent=i,n.disabled=t,n.onclick=()=>{e()},n};function of(i,e){const t=document.createElement("img");return t.width=180,t.height=120,t.src=Mm.get(i)?.image??"",t.alt=e,t}function Sm(i,e,t,n=e.life?.owner,r=e.economy?.day){if(!e.economy||!n||r===void 0)return;const s=e.economy,a=Fe("section","","social-economy");a.append(Fe("h2","家具小店"),Fe("p","每天 04:00 换新。珍稀家具出现率 8%；每天最多买一件珍稀家具。朋友货架的购买名额各自独立。"));const o=Fe("div","","economy-grid");for(const l of Jp(n,r)){const u=Fe("article","","economy-item");u.append(of(l.id,l.name),Fe("h3",l.name),Fe("p",`${l.tier==="common"?"日常家具":"珍稀家具"} · 已有 ${s.furniture[l.id]??0} 件`),Lt(`购买 · ${l.price} 花园币`,()=>t({type:"buyFurniture",owner:n,item:l.id}),e.coins<l.price||!!s.purchases[`${n}:${l.id}`]||l.tier!=="common"&&s.rareBought>=1)),l.tier!=="common"&&u.append(Lt("预留72小时 · 替换上次预留",()=>t({type:"reserveFurniture",owner:n,item:l.id}))),o.append(u)}a.append(o);const c=s.furnitureReservation;if(c&&c.expiresAt>Date.now()&&n===e.life?.owner){const l=Yr.find(u=>u.id===c.item);a.append(Fe("h3","替你留好的家具"),Fe("p",`${l?.name??c.item} · ${new Date(c.expiresAt).toLocaleString()} 前有效`),Lt(`购买预留 · ${c.price} 花园币`,()=>t({type:"buyFurniture",owner:c.owner,item:c.item}),e.coins<c.price||s.rareBought>=1))}i.append(a)}function bm(i,e,t){const n=e.economy;if(!n)return;const r=Fe("section","","social-economy capsule-room");r.append(Fe("div","✦","capsule-orb"),Fe("h2","茶室家具扭蛋机"),Fe("p","模拟付费试玩 · 不会发生真实扣款","capsule-test"),Fe("strong",`测试代币 ${n.tokens}`),Fe("p",`单抽 ${Qp.cost} 代币 · 普通 70% / 稀有 25% / 史诗 5%`),Fe("p",`距离稀有以上保底最多 ${10-n.rareMisses} 抽，史诗保底最多 ${20-n.epicMisses} 抽。`));const s=Fe("div","","economy-actions");s.append(Lt("模拟充值 · +300 代币",()=>t({type:"capsuleTopUp"}),n.topUpDay>=n.day),Lt("转一次 · 60",()=>t({type:"capsuleDraw",count:1}),n.tokens<60),Lt("转十次 · 600",()=>t({type:"capsuleDraw",count:10}),n.tokens<600)),r.append(s,Fe("p","模拟充值每天一次。保底跨天保存，提前抽中会重置对应计数；重复家具保留为额外件数，可在不同位置摆放。"));const a=Fe("details");a.append(Fe("summary","查看完整奖池与单件概率"));for(const c of Yr){const l=Yr.filter(u=>u.tier===c.tier).length;a.append(Fe("p",`${c.name} · ${({common:70,rare:25,epic:5}[c.tier]/l).toFixed(2)}%（不含保底）`))}r.append(a);const o=Fe("div","","economy-grid");for(const c of Yr){const l=Fe("article","","economy-item");l.append(of(c.id,c.name),Fe("strong",c.name),Fe("p",`收藏 ×${n.furniture[c.id]??0}`)),o.append(l)}r.append(o),i.append(r)}function wm(i,e,t,n){const r=e.economy;if(!r)return;const s=Fe("section","","social-economy social-guide");if(!r.tutorial.bred){const o=Fe("p");if(s.append(Fe("h2","先找伙伴，再一起种花"),Fe("p","邀请自己的角色上桌，或进入公共房间认识伙伴。陪伴角色会标明身份，也可以一个人继续。"),Lt("邀请伙伴 / 进入公共房间",()=>window.qbot.rooms.open()),Lt("第一次做客 · 陪伴角色房间",async()=>{o.textContent="正在找有空位的陪伴角色房间…";try{if(!await window.qbot.social.prepareJoin()){o.textContent="准备好角色后，随时可以再来。";return}if((await window.qbot.rooms.getStatus()).phase==="in-room"){window.qbot.rooms.open(),o.textContent="你已经在房间里，可以邀请伙伴一起种植。";return}const l=(await window.qbot.rooms.list()).find(u=>u.companion&&u.online<u.capacity);if(!l)throw Error("暂时没有空位，试试公共房间列表");await window.qbot.rooms.join(l.roomId),window.qbot.rooms.open(),o.textContent="已经来到陪伴角色的房间。可以打招呼，也可以去看花园。"}catch(c){o.textContent=c instanceof Error?c.message:String(c)}}),o),!r.tutorial.claimed)s.append(Lt("领取金色亲本与新手加速肥",()=>t({type:"socialStarter"})));else{const c=e.plots.findIndex(l=>l?.id===r.tutorial.seed);s.append(Fe("p","背包里的金色亲本留着繁育；种下金色种子，用新手加速肥，5 秒后就能和它繁育。金色门槛在后续仍然保留。"),Lt("去种植",()=>n("plots"))),c>=0&&r.tutorial.fertilizer&&s.append(Lt("使用新手加速肥",()=>t({type:"tutorialSpeed",plot:c})))}}s.append(Fe("h3",`今天想一起做的事 · 奖励 ${r.wishClaims.length}/2`));for(const o of r.wishes??[]){const c=o.kind,l=c==="harvest"?"socialHarvest":c,u=(e.v3?.counters[l]??0)>(r.wishBaseline[l]??0)&&(!o.target||c==="furniture"?!o.target||!!r.furniture[o.target]:e.v3?.records.some(f=>f.kind==="visit"&&f.peer===o.target&&f.at>=o.createdAt)),d=Fe("div");d.append(Lt(`${o.done?"✓ ":""}${o.label}${u&&!o.done?" · 领取20币":""}`,()=>t({type:"socialWish",kind:c}),!u||o.done||r.wishClaims.length>=2)),o.done||(c==="visit"&&o.target&&d.append(Lt("去找这位朋友",()=>n("visit:"+o.target))),c==="furniture"&&d.append(Lt("去小店看看",()=>n("daily"))),d.append(Lt("换一个",()=>t({type:"rerollSocialWish",id:o.id}),(r.wishRerolls??0)>=2))),s.append(d)}const a=r.notifications.filter(o=>!o.read);if(a.length){s.append(Fe("h3",`花园发生了 ${a.length} 件新变化`));for(const o of a.slice(-3))s.append(Fe("p",o.text));s.append(Lt("知道啦",()=>t({type:"readMutations"})))}i.append(s)}const Em={kyoto:new URL(""+new URL("kyoto-BEnfmvme.png",import.meta.url).href,import.meta.url).href,paris:new URL(""+new URL("paris-B_WW5ie_.png",import.meta.url).href,import.meta.url).href,island:new URL(""+new URL("island-C0hCNoiW.png",import.meta.url).href,import.meta.url).href};function Tm(i,e,t,n,r){const s=e.economy;if(!s)return;const a=s.travel;i.append(Lt("← 返回花园",()=>r("plots")),Fe("h2","和谁一起去旅行"),Fe("p","选 1～2 位已在花园出现过的自己的角色。每周可出发两次，人数不增加费用或奖励；出游期间仍可在桌面陪伴。"));const o=a?.active;if(o){const c=Fe("section","","social-economy"),l=Fe("p"),u=Lt("迎接旅行归来",()=>n({type:"tripClaim",id:o.id}),!0);c.append(Fe("h3",Ko[o.city].name+" · "+o.actors.map(h=>t.find(m=>m.dirId===h)?.manifest.name??"旅行伙伴").join("、")),l,u),i.append(c);const d=()=>{const h=Math.max(0,o.readyAt-Date.now());l.textContent=h?`还有 ${Math.ceil(h/6e4)} 分钟 · 可离线等待`:"已经归来，等你收好纪念品",u.disabled=h>0};d();const f=setInterval(()=>{if(!c.isConnected){clearInterval(f);return}d()},1e3)}else{const c=new Set(e.activeActor?[e.activeActor]:[]),l=Fe("div","","social-economy");for(const d of t.filter(f=>Object.hasOwn(e.life?.characters??{},f.dirId))){const f=Fe("label"),h=document.createElement("input");h.type="checkbox",h.checked=c.has(d.dirId),h.onchange=()=>{if(h.checked&&c.size>=2){h.checked=!1;return}h.checked?c.add(d.dirId):c.delete(d.dirId)},f.append(h,document.createTextNode(d.manifest.name+" ")),l.append(f)}i.append(l);const u=Fe("div","","economy-grid");for(const[d,f]of Object.entries(Ko)){const h=Fe("article","","social-economy"),m=document.createElement("img");m.src=Em[d],m.alt=f.name,m.style.cssText="width:100%;max-height:220px;object-fit:cover;border-radius:14px",h.append(m,Fe("h3",f.name),Fe("p",`${f.cost} 金币 · ${f.minutes} 分钟 · 已完成 ${a?.counts[d]??0} 次`),Fe("p",Jh.filter(v=>v.city===d).map(v=>`${v.trips} 次：${v.name}`).join("；")),Lt("派出这支旅行小队",()=>n({type:"tripStart",city:d,actors:[...c]}),e.coins<f.cost||(a?.starts??0)>=2)),a?.tutorialDone||h.append(Lt("初次短途 · 60 金币 / 10分钟",()=>n({type:"tripStart",city:d,actors:[...c],tutorial:!0}),e.coins<60)),u.append(h)}i.append(u)}i.append(Fe("h3","旅行手账"));for(const c of[...a?.history??[]].reverse().slice(0,12))i.append(Fe("p",`${new Date(c.claimedAt).toLocaleDateString()} · ${Ko[c.city].name} · ${c.actors.map(l=>t.find(u=>u.dirId===l)?.manifest.name??"旅行伙伴").join("、")} · 带回一包地区植物种子${c.tutorial?"（初次短途不计家具累计次数）":""}`))}function Am(i,e,t){if(!e.economy)return;const n=em(Date.now(),e.life?.owner??"local"),r=e.economy.weather,s=r&&r.acceptedAt+12e4<=Date.now()&&r.end>Date.now()?r:n;if(i.append(Fe("h2",`${Wn[s.kind].icon} ${Wn[s.kind].name}`),Fe("p","个人天气每 30 分钟变化；每四天有一个固定珍稀时段，其他时段有 2% 珍稀概率。"),Fe("p","生长到 20%、40%、60%、80% 时各结算一次。共享天气进入满 2 分钟才生效，成熟植物不会重抽。")),r&&r.end>Date.now()&&i.append(Fe("p",`共享来源：${r.source} · ${new Date(r.end).toLocaleTimeString()} 结束${r.acceptedAt+12e4>Date.now()?" · 正在等待生效":""}`),Lt("恢复自己的天气",()=>t({type:"leaveWeather"}))),e.roomWeather){i.append(Fe("h3","房间天气"),Fe("p","访客可以提供自己的天气。房主选定后，每位成员可自行加入共享。"));for(const a of e.roomWeather.sources)i.append(Lt(`${a.name} · ${Wn[a.kind].name}${e.roomWeather.active===a.id?" · 房间已选定":""}`,()=>t({type:"shareWeather",source:a.id}),!e.roomWeather.isHost&&e.roomWeather.active!==a.id&&a.id!==e.life?.owner))}else i.append(Lt("进入房间共享天气",()=>window.qbot.rooms.open()))}const Jo={breeze:{name:"花风",icon:"🍃",quality:"normal",weight:30},rain:{name:"甘霖",icon:"🌧",quality:"normal",weight:30},meteor:{name:"流星夜",icon:"☄",quality:"purple",weight:15},storm:{name:"雷暴",icon:"⚡",quality:"purple",weight:15},aurora:{name:"极光夜",icon:"🌌",quality:"gold",weight:6},prismatic:{name:"幻光",icon:"🌈",quality:"gold",weight:4}},od={normal:"普通天气",purple:"稀有天气",gold:"传说天气"},cd={breeze:[{trait:"petals",chance:.18},{trait:"breezy",chance:.12},{trait:"honey",chance:.06}],rain:[{trait:"dew",chance:.18},{trait:"striped",chance:.1},{trait:"jade",chance:.04}],storm:[{trait:"thunder",chance:.12},{trait:"amber",chance:.06},{trait:"crystal",chance:.04}],prismatic:[{trait:"rainbow",chance:.08},{trait:"prism",chance:.05},{trait:"nebula",chance:.03},{trait:"halo",chance:.02}],meteor:[{trait:"shiny",chance:.14},{trait:"firefly",chance:.08},{trait:"moon",chance:.05},{trait:"stardust",chance:.025}],aurora:[{trait:"frost",chance:.12},{trait:"crystal",chance:.08},{trait:"rainbow",chance:.04},{trait:"prism",chance:.025}]},Rm={meteor:[{trait:"shiny",chance:.06},{trait:"firefly",chance:.03}],aurora:[{trait:"frost",chance:.04},{trait:"rainbow",chance:.005}]};function ld(i){const e=Math.max(0,Math.ceil(i/6e4));return e>=60?`${Math.floor(e/60)} 小时 ${e%60} 分钟`:`${e} 分钟`}function Cm(i){return i&&i!=="meteor"&&i!=="aurora"?`<span class="weather-symbol" aria-hidden="true">${Wn[i].icon}</span>`:`<svg viewBox="0 0 32 32" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${i==="meteor"?'<path d="m27 3-15 13M28 10 17 21M20 3 8 15" stroke="#b3d7ff"/><path d="m10 15 2 5 5 1-4 3v5l-4-3-5 1 2-5-3-4z" fill="#ffe9ae" stroke="#876d54"/>':i==="aurora"?'<path d="M4 21Q10 3 17 13T29 7M3 27Q12 11 20 20T30 15" stroke="#9becce" stroke-width="4"/><path d="M4 15Q12 1 22 10" stroke="#c7b9ff"/>':'<circle cx="17" cy="14" r="7" fill="#ffe5a0"/><path d="M17 2v3M17 23v3M4 14h3M27 14h3M7 4l3 3M25 4l-3 3" stroke="#bca578"/><path d="M5 26h18a4 4 0 0 0 0-8 6 6 0 0 0-11-2 5 5 0 0 0-7 10Z" fill="#faf5e8" stroke="#786956"/>'}</svg>`}const Qo=i=>i?Wn[i].name:"晴朗";function Lm(i,e){const t=e.preview??e.current?.kind??null,n=t??e.next.kind;i.innerHTML=`<article class="weather-card ${t??"clear"}"><div class="weather-sky"><span class="weather-label">花园气象台 · ${e.test?"测试天气 · 真实生效":t?"特殊天气进行中":"今日天气"}</span><div class="weather-emblem">${Cm(t)}</div><h1>${Qo(t)}</h1><strong class="weather-quality ${t?Jo[t].quality:"normal"}">${t?od[Jo[t].quality]:"普通天气"}</strong><p class="weather-current-time"></p></div><div class="weather-info"><h2>${t?"本场变异因子":"下一场 · "+Qo(n)}</h2><p class="weather-intro">每株每场各因子独立判定 · 升级提高概率。</p><div class="weather-factors"></div><div class="weather-next"><span>下一场 · ${Qo(e.next.kind)}</span><strong class="weather-next-time"></strong><small>${new Intl.DateTimeFormat("zh-CN",{timeZone:"Asia/Shanghai",month:"numeric",day:"numeric",hour:"2-digit",minute:"2-digit",hour12:!1}).format(e.next.start)} · 北京时间</small></div><p class="weather-rules">每天 8:00—22:00，每两小时一场，持续 45 分钟。<br>生长中和成熟留田都可变异；背包不参与。<br>自然天气无保底，离线最多补算 7 天。<br>每级因子概率提高 6%（相对加成）；开始培育后锁定结果。${e.test?"<br><b>手动测试沿用旧规则：成熟留田、基础概率、最多补足两株，会真实保存。</b>":""}</p></div></article>`;const r=i.querySelector(".weather-factors");for(const a of e.test?Rm[n]:cd[n]){const o=document.createElement("div");o.className="weather-factor "+dt[a.trait].tier;const c=document.createElement("strong");c.textContent=dt[a.trait].name;const l=document.createElement("small");l.textContent=`植物 Lv.${dt[a.trait].level} · 基础概率 · ${pu[Xi(a.trait)]} · ${si[dt[a.trait].tier]}`;const u=document.createElement("b");u.textContent=`${+(a.chance*100).toFixed(2)}%`,o.append(c,l,u),r.append(o)}const s=document.createElement("section");s.className="weather-catalog";for(const[a,o]of Object.entries(Jo)){const c=document.createElement("div");c.className="weather-catalog-row "+o.quality,c.textContent=o.icon+" "+o.name+" · "+od[o.quality]+" · 权重 "+o.weight+"% · "+cd[a].map(l=>dt[l.trait].name).join(" / "),s.append(c)}i.querySelector(".weather-info").append(s),cf(i,e,e.now)}function cf(i,e,t){const n=i.querySelector(".weather-current-time");n&&(n.textContent=e.current?`还将持续 ${ld(e.current.end-t)}`:"阳光正好，等一场天空的礼物。");const r=i.querySelector(".weather-next-time");r&&(r.textContent=`还有 ${ld(e.next.start-t)}`)}const Ee=(i,e="",t="")=>{const n=document.createElement(i);return n.textContent=e,n.className=t,n};function ot(i,e,t=!1){const n=Ee("button",i);return n.disabled=t,n.onclick=()=>{const r=e();r instanceof Promise&&r.catch(s=>alert(String(s)))},n}function Vi(i,e){const t=Ee("article","","card life-card");return t.append(Ee("h3",i),Ee("p",e,"muted")),t}function lf(i){const e=om(i),t=e.reduce((r,s)=>r+s.weight,0),n=Ee("details");n.append(Ee("summary","可能获得与概率"));for(const r of e)n.append(Ee("p",`${r.trait?dt[r.trait].name:Hs[r.dye].name} · ${(100*r.weight/t).toFixed(1)}%`));return n}function Zs(i){return`${Po[i.species]} ${Ye[i.species].name} · ${i.traits.map(e=>dt[e].name).join(" / ")||"原生"}`}function uf(i,e){return e.dye&&Hs[e.dye]&&(i.dataset.dye=e.dye,i.style.setProperty("--dye-hue",Hs[e.dye].hue+"deg"),i.title=Hs[e.dye].name+"染色"),i}function df(i,e,t=e.state.life?.owner,n){const r=e.state.life;if(!r||!t){i.append(Ee("p","请重新打开花园，初始化每日商店。"));return}const s=n?.day??r.day;if(e.state.economy){Sm(i,e.state,e.act,t,s),n||i.append(ot("去朋友的小店看看",()=>e.go("friends")),ot("购买种子和加速肥",()=>e.go("shop")));return}!n&&e.state.v3&&i.append(Ee("p","每天为你留一包免费的草莓种子，已经放进背包。基础种植可以慢慢来。","muted")),i.append(Ee("h2",n?`${n.name}的今日商店`:"今日小店"),Ee("p",`每日 04:00 换新 · 下次 ${new Date(sm(s)).toLocaleString("zh-CN")} · 今日珍稀喷雾 ${r.rareBought}/3`,"muted"));const a=Ee("div","","grid");for(const o of n?.offers??cm(t,s)){const c=r.purchases[`${t}/${o.id}`]??0,l=Math.max(0,o.limit-c),u=o.kind==="spray"?ri[o.item]:void 0,d=Vi(u?"🧴 "+u.name:Po[o.item]+" "+Ye[o.item].name+"种子",u?.description??"带回自己的花园种下");u?d.append(lf(o.item)):d.append(Ee("small",Co(o.item,e.state))),d.append(Ee("small",`你还可买 ${l} 份`),ot(`◉ ${o.price} · 带回家`,()=>e.act({type:"buyDaily",owner:t,offer:o.id}),e.busy||!l||e.state.coins<o.price||!!u&&r.rareBought>=3)),a.append(d)}i.append(a),n||i.append(ot("去朋友的小店看看",()=>e.go("friends")))}const ec=new Set;function hf(i,e,t){const n=e.state.life;if(!n)return;i.append(Ee("h2","给地里的作物换个模样"),Ee("p","使用后随机结果立即生效，同槽位满时自动替换最早的词条。纯染色不增加词条或售价。","muted"));const r=n.pending;if(r){if(i.append(Ee("p","正在应用已保存的喷雾结果…")),!ec.has(r.id)){ec.add(r.id);const o=e.state.produce.find(l=>l.id===r.target)??e.state.plots.find(l=>l?.id===r.target),c=r.trait?o?.traits.find(l=>Xi(l)===Xi(r.trait)):void 0;queueMicrotask(()=>{e.act({type:"resolveSpray",id:r.id,accept:!0,replace:c}).finally(()=>ec.delete(r.id))})}return}const s=e.state.plots.find(o=>o?.id===t);if(!s){i.append(Ee("p","点击地里成熟的作物，在详情中选择「使用喷雾」。收获篮中的果实不能喷雾。"),ot("去我的土地",()=>e.go("plots")));return}const a=Ee("div","","grid");for(const o of Object.keys(ri)){const c=n.sprays[o]??0;if(!c)continue;const l=ri[o],u=Vi(`🧴 ${l.name} ×${c}`,l.description);u.append(lf(o)),u.append(ot("使用"+l.name,()=>e.act({type:"spray",kind:o,target:s.id}),e.busy||s.readyAt>Date.now()||!!s.locked||Pt(s)||!!s.cultivation)),a.append(u)}a.children.length||a.append(Ee("p","还没有喷雾，去每日商店看看吧。","empty")),i.append(a,ot("逛今日商店",()=>e.go("daily")))}function Pm(i,e){i.append(Ee("h2","朋友的花园与小店")),ff(i,e);for(const n of e.state.cooperations??[])if(n.done){const r=Vi("共同培育完成了","即使主人已经收获，你的助育奖励仍可领取。");r.append(ot("领取助育奖励",async()=>{await window.qbot.garden.cooperate(n.owner,n.plot,"claim",void 0,n.id),await e.refresh()},e.busy)),i.append(r)}if(e.state.rehearsal){i.append(Ee("p","本地试演：自己的土地使用本地收藏副本，其他角色使用虚拟花园；操作不会写回正式存档。"),ot("我的模拟土地",()=>e.go("plots")));for(const n of e.state.rehearsal.members.filter(r=>r.id!==e.state.life?.owner)){const r=Vi(n.name,"测试角色 · 虚拟花园与商店");r.append(ot("看土地 / 逛商店",()=>e.go("visit:"+n.id))),i.append(r)}return}if(!e.state.online){i.append(Ee("p","联机花园由服务器保存，每个人都有自己的每日货架。现有本地收藏会完整保留，开通后从新的联机花园开始。"),ot("开通 / 进入联机花园",async()=>{await window.qbot.garden.online(!0),await e.refresh()},e.busy));return}for(const n of["land","shop"]){const r=Ee("select");for(const[s,a]of[["private","仅自己"],["friends","仅好友"],["public","所有人"]])r.append(new Option(a,s));r.value=(n==="shop"?e.state.life?.shopVisibility:void 0)??e.state.life?.visibility??"friends",r.onchange=()=>{e.act({type:"gardenVisibility",scope:n,visibility:r.value})},i.append(Ee("label",n==="land"?"土地查看范围":"商店购物范围"),r)}if(i.append(ot("返回本地收藏花园",async()=>{await window.qbot.garden.online(!1),await e.refresh()})),e.state.v3){i.append(Ee("h3",`向日葵伙伴 ${e.state.v3.sunPartners.length}/2`),Ee("p","双方接受后，朋友地里有向日葵时，为你下一轮果实增加 0.03 重量倍率，最多 +0.06。可以随时解除。"));for(const n of e.state.v3.sunPartners)i.append(ot("回访伙伴",()=>e.go("visit:"+n)),ot("解除绑定",()=>e.act({type:"sunRemove",target:n})));for(const n of e.state.v3.sunRequests??[])i.append(ot("看看邀请者",()=>e.go("visit:"+n)),ot("接受向日葵邀请",()=>e.act({type:"sunAnswer",target:n,accept:!0})),ot("婉拒",()=>e.act({type:"sunAnswer",target:n,accept:!1})))}const t=Ee("div","","grid");i.append(t),window.qbot.social.contacts(!0).then(n=>{if(i.isConnected){for(const r of n.people.filter(s=>s.relation==="friend")){const s=Vi(r.nickname,r.online?"在线 · 去看看今日有什么":"离线 · 开放的商店仍可访问");s.append(ot("看土地 / 逛商店",()=>e.go("visit:"+r.id))),t.append(s),window.qbot.garden.visit(r.id,!0).then(a=>{s.isConnected&&s.append(Ee("small",`${a.actorName??r.character} · Lv.${a.actorLevel}`),Ee("p",a.shopOpen===!1?"商店暂未开放":a.offers.filter(o=>o.kind==="spray").map(o=>{const c=o.limit-(e.state.life?.purchases[r.id+"/"+o.id]??0);return"🧴 "+ri[o.item].name+(c>0?" · 可购买":" · 已买过")}).join(" / ")))}).catch(()=>{s.isConnected&&s.append(Ee("small","花园暂未开放"))})}t.children.length||t.append(Ee("p","还没有游戏好友。在“一起玩”的朋友页认识伙伴吧。"))}}).catch(n=>e.notice(String(n)))}async function Im(i,e,t){const n=await window.qbot.garden.get(),r=n.rehearsal?n.rehearsal.members.filter(a=>a.id!==n.life?.owner).map(a=>({id:a.id,nickname:a.name,online:!0})):(await window.qbot.social.contacts(!0)).people.filter(a=>a.relation==="friend"),s=Ee("dialog","","garden-invite-dialog");s.append(Ee("h2","邀请朋友一起培育"),Ee("p","消息只展示神秘果实，特性在培育完成后揭晓。","muted")),r.length||s.append(Ee("p","还没有游戏好友，去“一起玩”认识伙伴吧。"));for(const a of r)s.append(ot(a.nickname+(a.online?" · 在线":" · 离线"),async()=>{try{await window.qbot.garden.cooperate(i,e,"invite",a.id),t(n.rehearsal?"测试伙伴已加入待培育名单":"邀请已送达"),s.close(),s.remove()}catch(o){t(String(o))}}));s.append(ot("关闭",()=>{s.close(),s.remove()})),s.oncancel=()=>s.remove(),document.body.append(s),s.showModal()}function ff(i,e,t){const n=e.state.life?.owner;for(const r of e.state.friendBreeding??[]){if(t&&r.from!==t&&r.to!==t)continue;const s=r.to===n,a=Vi(s?`${r.fromName}申请繁育`:`等待${r.toName}同意`,`${Zs(r.plant)} × ${Zs(r.parent)}`);a.append(Ee("p",`双方各得一包子代种子、各用一次亲本繁育资格；${r.fromName}提供1瓶${r.oil==="rich"?"浓缩":"普通"}精油。`),Ee("small",`${new Date(r.expiresAt).toLocaleString("zh-CN")} 前有效，接受时重新检查亲本与剩余次数。`)),s?a.append(ot("同意繁育",()=>e.act({type:"friendBreedAnswer",request:r.id,accept:!0}),e.busy),ot("拒绝",()=>e.act({type:"friendBreedAnswer",request:r.id,accept:!1}),e.busy)):a.append(ot("撤回申请",()=>e.act({type:"friendBreedCancel",request:r.id}),e.busy)),i.append(a)}}async function Dm(i,e,t){const n=await window.qbot.garden.get(),r=Ee("dialog","","garden-invite-dialog");r.append(Ee("h2","选择与好友繁育的果实"),Ee("p",`朋友的亲本：${Zs(t)}`),Ee("p","从背包选一颗金色以上、未繁育的非迷你果实。好友同意后，双方各获得一包相同的子代种子；各用一次亲本资格和本周次数，亲本保留，由你提供一瓶精油。申请24小时内有效。"));const s=Ee("select");for(const[o,c]of[["normal","普通"],["rich","浓缩"]])s.append(new Option(`${c}精油 ×${n.v3?.oils[o]??0}`,o));s.value=n.v3?.oils.normal?"normal":"rich",r.append(s);const a=n.produce.filter(o=>qi(o)&&!o.traits.includes("mini"));for(const o of a)r.append(ot(Zs(o),async()=>{await i.act({type:"friendBreedRequest",owner:e,plant:t.id,parent:o.id,oil:s.value}),r.close(),r.remove()},!n.v3||n.v3.oils.normal+n.v3.oils.rich===0||n.v3.breeds>=90));a.length||r.append(Ee("p","背包中还没有符合条件的果实，先收获一颗金色以上作物吧。")),n.v3&&!n.v3.oils.normal&&!n.v3.oils.rich&&r.append(Ee("p","还需要一瓶繁育精油，可到商店购买。")),n.v3&&n.v3.breeds>=90&&r.append(Ee("p","本周90次繁育已用完，下周可继续。")),r.append(ot("取消",()=>{r.close(),r.remove()})),r.oncancel=()=>r.remove(),document.body.append(r),r.showModal()}function Nm(i,e,t){const[n,,r]=t.startsWith("test:")?[t]:t.split(":");i.append(Ee("h2","朋友的花园"),ot("← 返回朋友",()=>e.go("friends")));const s=Ee("div");i.append(s);let a=!1,o;const c=d=>{if(!i.isConnected)return;if(o=d.tasks?.find(h=>!h.done&&(h.members[e.state.life?.owner??""]?.seenAt??0)+15e3>Date.now())?.plot,s.replaceChildren(Ee("h2",d.name+"的花园名片"),Ee("p",`${d.actorName??"当前角色"} · Lv.${d.actorLevel} · 土地${d.landOpen===!1?"未开放":"可查看"} · 商店${d.shopOpen===!1?"未开放":"可购物"}`,"muted")),d.companion&&d.friend&&e.state.online&&!e.state.rehearsal){const h=ot("↻ 刷新测试",async()=>{h.disabled=!0;try{await e.act({type:"companionGardenRefresh",owner:n}),await l()}finally{h.disabled=!1}},e.busy);h.className="garden-test-refresh",h.title="刷新出可繁育的金色作物和待培育的神秘作物；保留正在进行的合作",s.append(h)}if(s.append(Ee("p","待培育的作物可以直接帮忙；金色及以上、还有繁育次数的成熟作物可以向好友申请繁育。","muted")),s.append(Ee("p",`今日还可领取 ${d.rewardsLeft??5} 次培育种子${d.rewardsLeft===0?"；仍可帮忙加速并留下共同记录":" · 普通种子或自带词条的神秘种子"}`)),ff(s,e,n),e.state.online||s.append(Ee("p","你正在本地花园。进入联机花园后可购物和共同培育，本地收藏会保留。"),ot("进入联机花园",async()=>{await window.qbot.garden.online(!0),await e.refresh()})),r){const h=d.tasks?.find(m=>m.id===r);if(h?.done){const m=Vi("这次共同培育已完成",h.fruit?Zs(h.fruit):"果实已由主人收好");h.fruit&&m.prepend(e.plantArt(h.fruit)),m.append(Ee("p",`${Object.keys(h.members).length} 位伙伴留下了这段经历`),ot("领取我的助育奖励",async()=>{await window.qbot.garden.cooperate(n,h.plot,"claim",void 0,h.id),await e.refresh()})),s.append(m)}else d.plots.some(m=>m?.id===r)||s.append(Ee("p","这颗果实已不在地里，可以去朋友的花园看看近况。"))}const f=Ee("div","","grid");d.plots.forEach((h,m)=>{if(!h&&m>=(d.plotCount??Math.min(7,d.actorLevel+2))||r&&h?.id!==r)return;const v=Vi(`${m+1}号地 · ${h?Po[h.species]+" "+Ye[h.species].name:"空土地"}`,h?Pt(h)?"？ ？ ？ · 培育后揭晓":h.traits.map(g=>dt[g].name+"（"+si[dt[g].tier]+"）").join(" / ")||"原生":"还没有种下植物");if(h){v.prepend(e.plantArt(h));const g=d.tasks?.find(p=>p.plant===h.id);if(Pt(h)||g||e.state.economy&&h.readyAt>Date.now()){const p=Object.values(g?.members??{}).filter(w=>w.seenAt+15e3>Date.now()).length;v.append(Ee("p",g?.done?"已经揭晓":`？ 可一起培育 · ${p} 人正在参与 · ${Math.ceil((g?.remaining??mn.work)/(360*Math.max(1,Math.min(4,p))))} 秒${p?"":"（单人）"}`));const _=Object.values(g?.members??{}).filter(w=>w.seconds>=mn.minSeconds&&w.work>=mn.work*mn.minContribution).length;v.append(Ee("small",`${_} 位已达标 · 奖励普通草莓种子 · 每天最多 3 次`));const y=g?.members[e.state.life?.owner??""],x=Math.max(0,mn.minSeconds-(y?.seconds??0),(mn.work*mn.minContribution-(y?.work??0))/360),A=(g?.remaining??mn.work)/(360*Math.max(1,p+(o===m?0:1)));if(!g?.done)v.append(Ee("small",A<x?"剩余工作可能不足奖励资格，仍欢迎来陪伴":`再参与约 ${Math.ceil(x)} 秒可达个人奖励资格`),ot(o===m?"暂停参与":"帮忙培育",async()=>{const w=o===m?"leave":"join",R=await window.qbot.garden.cooperate(n,m,w);o=w==="join"?m:void 0,c(R)},!e.state.online));else{const w=g.claimed.includes(e.state.life?.owner??""),R=!!y&&y.seconds>=mn.minSeconds&&y.work>=mn.work*mn.minContribution;v.append(ot(w?"已领取":R?"领取我的助育奖励":"本次贡献未达到领取资格",async()=>{c(await window.qbot.garden.cooperate(n,m,"claim")),e.notice("奖励已经放入联机背包")},!e.state.online||w||!R||d.rewardsLeft===0))}}else v.append(Ee("p",h.readyAt<=Date.now()?"已经成熟":"正在生长"));if(!Pt(h)&&h.readyAt<=Date.now()){const p=ii(h.traits,h);v.append(Ee("small",`${si[p]}品质 · 剩余繁育 ${h.bred?0:["gold","rainbow"].includes(p)?1:0} 次`)),d.friend&&qi(h)&&!h.cultivation&&!e.state.rehearsal&&v.append(ot("申请繁育",()=>Dm(e,n,h),e.busy||!e.state.online))}}f.append(v)}),s.append(f),e.state.online&&d.shopOpen!==!1&&df(s,e,n,d)},l=async()=>{if(!(a||document.hidden)){a=!0;try{c(await window.qbot.garden.visit(n,!1,r))}catch(d){s.replaceChildren(Ee("p",String(d)),ot("重试",()=>l())),o=void 0}finally{a=!1}}};l();const u=setInterval(()=>{if(!i.isConnected){clearInterval(u),o!==void 0&&window.qbot.garden.cooperate(n,o,"leave").catch(()=>{});return}l()},5e3)}const Um=[new URL(""+new URL("paris-garden-walk-CdvQAPxO.png",import.meta.url).href,import.meta.url).href,new URL(""+new URL("paris-garden-picnic-CG0FJuxz.png",import.meta.url).href,import.meta.url).href,new URL(""+new URL("paris-garden-flowers-C1g5WaVr.png",import.meta.url).href,import.meta.url).href];function pf(i,e,t){return i===1&&e===4?Um[Math.min(2,Math.max(0,t))]:void 0}const Ot=[{id:"kyoto",name:"京都",region:"亚洲",subtitle:"把日子泡进一杯抹茶里",color:"#d9b5ba",projects:[{name:"茶屋",icon:"tea",steps:["尝一杯抹茶","学做和菓子","参加茶会"]},{name:"古街",icon:"street",steps:["逛古街小店","挑选浴衣","夜游花灯街"]},{name:"庭院",icon:"garden",steps:["看庭院樱花","樱花下野餐","留一张庭院合影"]},{name:"温泉",icon:"spring",steps:["泡一会足汤","体验露天温泉","温泉旅馆留宿"]},{name:"手作",icon:"craft",steps:["听风铃","制作风铃","带回纪念风铃"]}],costs:[80,140,220]},{id:"paris",name:"巴黎",region:"欧洲",subtitle:"沿着河岸，慢慢走",color:"#bbcad9",projects:[{name:"面包房",icon:"tea",steps:["尝黄油可颂","烤一条法棍","准备野餐篮"]},{name:"塞纳河",icon:"spring",steps:["沿河散步","乘一段游船","看落日河岸"]},{name:"美术馆",icon:"craft",steps:["欣赏画作","画一张速写","挑选艺术明信片"]},{name:"铁塔",icon:"street",steps:["铁塔下合影","登高看城市","等铁塔亮灯"]},{name:"花园",icon:"garden",steps:["逛花园","喷泉边野餐","留一束干花"]}],costs:[220,360,540]},{id:"island",name:"海岛",region:"大洋洲",subtitle:"今天的计划，是听海",color:"#9ad5ca",projects:[{name:"沙滩",icon:"garden",steps:["捡贝壳","堆一座沙堡","沙滩看日落"]},{name:"海湾",icon:"spring",steps:["在浅水踏浪","浮潜看鱼群","拍一张海底照片"]},{name:"小食摊",icon:"tea",steps:["喝一杯椰汁","品尝当地小食","准备海边晚餐"]},{name:"灯塔",icon:"street",steps:["走近灯塔","登塔看海","看灯塔亮起"]},{name:"纪念铺",icon:"craft",steps:["挑贝壳","串贝壳手链","寄一张海岛明信片"]}],costs:[400,650,950]}];function mf(i){const e=_o(i.at);e.current=i.city;for(let t=0;t<i.city;t++)e.progress[t].fill(3);return e.progress[i.city]=[...i.progress],e.posts=i.posts,e.diaries=i.diary?[i.diary]:[],e}function Fm(i,e){const t=i.posts.filter(n=>n.city===e).at(-1);if(t)return i.diaries.find(n=>n.city===e&&n.actor===t.actor&&n.day===gf(t.at))}function ud(i){return Ot.map((e,t)=>{const n=i.posts.filter(s=>s.city===t).sort((s,a)=>s.at-a.at),r=[...new Map(n.map(s=>[s.project,s])).values()];return{city:t,posts:n,photos:r,likeId:n[0]?.id??""}}).filter(e=>e.posts.length).sort((e,t)=>t.posts.at(-1).at-e.posts.at(-1).at)}function _o(i){return{current:0,startedAt:i,progress:Ot.map(e=>e.projects.map(()=>0)),posts:[],diaries:[]}}function oo(i,e=i.current){return i.progress[e].every(t=>t===3)}function gf(i){const e=new Date(i);return`${e.getFullYear()}-${String(e.getMonth()+1).padStart(2,"0")}-${String(e.getDate()).padStart(2,"0")}`}function vf(i){if(!i||!Number.isInteger(i.current)||i.current<0||i.current>=Ot.length||!Number.isFinite(i.startedAt)||!Array.isArray(i.progress)||i.progress.length!==Ot.length||!i.progress.every(e=>Array.isArray(e)&&e.length===5&&e.every(t=>Number.isInteger(t)&&t>=0&&t<=3))||!Array.isArray(i.posts)||!Array.isArray(i.diaries))throw Error("旅行存档已损坏");if(i.progress.some((e,t)=>t<i.current&&!e.every(n=>n===3)||t>i.current&&e.some(n=>n!==0)))throw Error("旅行进度不一致");for(const e of i.posts)if(!e||typeof e.id!="string"||!Number.isFinite(e.at)||!Number.isInteger(e.city)||!Ot[e.city]||!Number.isInteger(e.project)||!Ot[e.city].projects[e.project]||!Number.isInteger(e.step)||e.step<0||e.step>2||typeof e.title!="string"||typeof e.text!="string"||typeof e.liked!="boolean"||e.portrait!==void 0&&typeof e.portrait!="string")throw Error("旅行回忆已损坏");if(new Set(i.posts.map(e=>e.id)).size!==i.posts.length)throw Error("旅行回忆重复");for(const e of i.diaries)if(!e||typeof e.day!="string"||typeof e.actor!="string"||typeof e.name!="string"||typeof e.text!="string"||typeof e.signature!="string"||!Number.isFinite(e.updatedAt))throw Error("旅行日记已损坏");for(const e of i.diaries)if(e.city!==void 0&&(!Number.isInteger(e.city)||!Ot[e.city]))throw Error("旅行日记地点无效");if(i.moments!==void 0&&(!Array.isArray(i.moments)||i.moments.some(e=>!e||typeof e.id!="string"||!Number.isFinite(e.at)||typeof e.day!="string"||typeof e.actor!="string"||typeof e.name!="string"||typeof e.text!="string"||typeof e.liked!="boolean")||new Set(i.moments.map(e=>e.id)).size!==i.moments.length))throw Error("朋友圈记录已损坏");if(i.rehearsals!==void 0){if(!Array.isArray(i.rehearsals)||new Set(i.rehearsals.map(e=>e.id)).size!==i.rehearsals.length)throw Error("测试旅行记录已损坏");for(const e of i.rehearsals){if(!e||typeof e.id!="string"||typeof e.actor!="string"||typeof e.name!="string"||typeof e.liked!="boolean"||!Number.isFinite(e.at)||!Number.isInteger(e.city)||!Ot[e.city]||!Array.isArray(e.progress)||e.progress.length!==5||!e.progress.every(t=>Number.isInteger(t)&&t>=0&&t<=3))throw Error("测试旅行记录已损坏");vf(mf(e))}}}function Om(i,e,t){const n=i.travel??=_o(t);if(vf(n),e.type==="travelRehearsalLike"){const c=n.rehearsals?.find(l=>l.id===e.id);if(!c)throw Error("这条测试旅行不存在");c.liked=!c.liked;return}if(e.type==="travelMomentLike"){const c=n.moments?.find(l=>l.id===e.id);if(!c)throw Error("这条朋友圈不存在");c.liked=!c.liked;return}if(e.type==="travelLike"){const c=n.posts.find(l=>l.id===e.id);if(!c)throw Error("这条回忆不存在");c.liked=!c.liked;return}if(e.city!==n.current)throw Error("请在当前目的地继续旅行");if(e.type==="travelNext"){if(!oo(n))throw Error("完成本站体验后再出发");if(n.current===Ot.length-1)throw Error("新的目的地正在准备中");n.current++;return}const r=Ot[n.current],s=r.projects[e.project];if(!Number.isInteger(e.project)||!s||!Number.isInteger(e.step)||e.step<0||e.step>=3||n.progress[n.current][e.project]!==e.step)throw Error("体验已更新，请刷新后再试");const a=r.costs[e.step];if(i.coins<a)throw Error("旅费还差一点，去收获一些植物吧");i.coins-=a,n.progress[n.current][e.project]++;const o=s.steps[e.step];n.posts.push({id:`${r.id}-${e.project}-${e.step}`,at:t,city:n.current,project:e.project,step:e.step,title:o,text:`今天在${r.name}，${o}。又多了一段和你一起的回忆。`,liked:!1})}const Bm=new URL(""+new URL("world-kvmriea8.png",import.meta.url).href,import.meta.url).href,gu=[new URL(""+new URL("kyoto-BEnfmvme.png",import.meta.url).href,import.meta.url).href,new URL(""+new URL("paris-B_WW5ie_.png",import.meta.url).href,import.meta.url).href,new URL(""+new URL("island-C0hCNoiW.png",import.meta.url).href,import.meta.url).href],Oi=[[25,27],[77,30],[26,53],[76,56],[50,79]],dd=[[82,28],[23,28],[60,72]];let tr,Jn=!1,Qn=0,jt,Ma=!1,bn,wn,tc=!1,Kr=0,ys=!1,di="",_f;const xs=new Set,il=new Set,Xr=new Map;window.qbot.settings.onChanged(()=>{wn=void 0,Kr++,il.clear(),Xr.clear(),_f?.()});function km(i){if(wn||tc)return;tc=!0;const e=Kr;window.qbot.garden.journalStatus().then(t=>{e===Kr&&(wn=t)}).catch(()=>{wn={enabled:!1,configured:!1,actor:"",name:"桌宠"}}).finally(()=>{tc=!1,i()})}document.addEventListener("keydown",i=>{i.key==="Escape"&&document.body.classList.contains("travel-mode")&&!document.querySelector(".experience-preview[open]")&&window.qbot.garden.closeTravel()});function yf(i,e,t){bn={city:i,project:e,step:t,until:Date.now()+3400}}const ye=(i,e="",t="")=>{const n=document.createElement(i);return n.textContent=e,n.className=t,n},Ft=(i,e,t="",n=!1)=>{const r=ye("button",i,t);return r.type="button",r.disabled=n,r.onclick=e,r};function rl(i,e){const t=ye("dialog","","experience-preview"),n=ye("img");n.src=i,n.alt=e;const r=Ft("×",()=>t.close(),"preview-close");r.setAttribute("aria-label","关闭配图"),t.append(r,n,ye("p",e)),t.addEventListener("click",s=>{if(s.target===t){const a=t.getBoundingClientRect();(s.clientX<a.left||s.clientX>a.right||s.clientY<a.top||s.clientY>a.bottom)&&t.close()}}),t.addEventListener("close",()=>t.remove(),{once:!0}),document.body.append(t),t.showModal(),r.focus()}function zm(i,e=""){const t=ye("div","","travel-scene "+e),n=ye("img");return n.src=gu[i],n.alt=Ot[i].name+"手绘旅行地图",n.draggable=!1,t.append(n),t}function hd(i){const e=ye("figure","","travel-photo"),t=ye("div","","photo-window"),n=ye("img"),r=pf(i.city,i.project,i.step);if(n.src=r??gu[i.city],n.alt=i.title,r?(t.classList.add("activity-photo"),t.tabIndex=0,t.setAttribute("role","button"),t.setAttribute("aria-label","查看"+i.title+"配图"),t.onclick=()=>rl(r,i.title),t.onkeydown=s=>{(s.key==="Enter"||s.key===" ")&&(s.preventDefault(),rl(r,i.title))}):n.style.transform="translate(-"+Oi[i.project][0]+"%,-"+Oi[i.project][1]+"%)",t.append(n),i.portrait?.startsWith("data:image/")){const s=ye("img","","traveller-seal");s.src=i.portrait,s.alt=i.name??"旅伴",t.append(s)}return e.append(t,ye("figcaption",i.title)),e}function Hm(i,e,t,n,r,s,a=()=>r(t)){_f=a,km(a);const o=e.travel?.moments??[],c=n,l=e.travel?.rehearsals??[],u=e.travel?.current??0,d=w=>{if(s||!Number.isInteger(w)||!Ot[w])return;const R=_o(Date.now());R.current=w;for(let C=0;C<w;C++)R.progress[C].fill(3);jt={id:crypto.randomUUID(),coins:5e4,travel:R},tr=w,Jn=!0,bn=void 0,r("travel")};if(jt){const w=jt;e={...e,...w},s=Ma,n=async R=>{if(Ma||jt!==w||R.type!=="travelExperience")return;const C=structuredClone(w);try{Om(C,R,Date.now())}catch{return}Ma=!0,a();try{const S=await window.qbot.garden.saveRehearsal({id:w.id,city:R.city,progress:C.travel.progress[R.city]});if(!S.ok){di=S.error;return}if(jt!==w)return;C.travel.posts=S.value.posts,jt=C,R.type==="travelExperience"&&(C.travel.diaries=C.travel.diaries.filter(b=>b.city!==R.city),yf(R.city,R.project,R.step))}catch{di="测试手账保存失败，请再试一次"}finally{Ma=!1,a()}}}const f=document.querySelector(".journal-pages")?.scrollTop??0,h=w=>{r(w),window.scrollTo({top:0,behavior:"instant"})},m=e.travel??_o(Date.now());if(jt&&wn)for(const w of m.posts)w.actor=wn.actor,w.name=wn.name;(tr===void 0||!Ot[tr])&&(tr=m.current);const v=tr,g=Ot[v],p=m.progress[v].reduce((w,R)=>w+R,0),_=Math.max(1,Math.floor((Date.now()-m.startedAt)/864e5)+1);i.className="travel-shell "+(t==="moments"?"journal-shell":Jn?"local-shell":"atlas-shell");const y=ye("div","","travel-heading");y.append(ye("span",jt?"测试中":"DAY "+_,"travel-day"),ye("strong",t==="moments"?"旅行手账":Jn?g.name:"世界旅行"),ye("span",(jt?"测试币 ":"◉ ")+e.coins.toLocaleString(),"travel-wallet"));const x=Ft("×",()=>window.qbot.garden.closeTravel(),"travel-close");x.title="收起旅行 · Esc",x.setAttribute("aria-label","收起旅行"),y.append(x),y.title="拖动这里移动旅行面板",i.append(y);const A=ye("nav","","travel-tabs");if(A.append(Ft("世界地图",()=>{jt=void 0,bn=void 0,Jn=!1,h("travel")},t==="travel"&&!Jn?"active":""),Ft("当地体验",()=>{Jn=!0,h("travel")},t==="travel"&&Jn?"active":"",v>m.current),Ft("旅行手账",()=>h("moments"),t==="moments"?"active":""),Ft("花园",()=>{window.qbot.garden.open("shop"),window.qbot.garden.closeTravel()})),t==="moments"){const w=ye("div","","journal-cover");w.style.backgroundImage='url("'+gu[m.current]+'")',w.append(ye("span","我们的旅行"),ye("h1","把日子，过成风景。"),ye("small","第 "+_+" 天 · "+ud(m).length+" 个目的地")),i.append(w);const R=ye("div","","journal-writing"),C=!!wn?.enabled&&!!wn.configured;if(R.append(Ft(ys?"正在写今日朋友圈…":"测试：写今日朋友圈",()=>{ys||(ys=!0,di="正在回看今天的小事…",a(),window.qbot.garden.generateMoment(crypto.randomUUID()).then(L=>{di=L.ok?"今日朋友圈已加入手账。":L.error}).catch(()=>{di="生成失败，请重试"}).finally(()=>{ys=!1,a()}))},"journal-generate",!C||ys)),R.append(ye("small",wn?wn.enabled?wn.configured?"根据今日真实记录生成并保存；测试重玩的经历不计入今日朋友圈。":"请先配置 LLM API Key。":"开启 LLM 模式后，可按人设写手账和朋友圈。":"读取 LLM 状态…")),di){const L=ye("p",di,"journal-status");L.setAttribute("role","status"),R.append(L)}i.append(R);for(const L of[...o].sort((D,k)=>k.at-D.at)){const D=ye("article","","moment-card daily-moment");D.dataset.momentId=L.id;const k=ye("div","","moment-heading");k.append(ye("small",L.name+"的今日朋友圈"),ye("h2",L.day));const H=ye("div","","moment-footer");H.append(ye("span",new Date(L.at).toLocaleTimeString("zh-CN",{hour:"2-digit",minute:"2-digit"})),Ft(L.liked?"♥ 喜欢":"♡ 喜欢",()=>{c({type:"travelMomentLike",id:L.id})},"moment-like",s)),D.append(k,ye("p",L.text,"city-diary"),H),i.append(D)}const b=[{travel:m,rehearsalId:jt?.id,liked:l.find(L=>L.id===jt?.id)?.liked??!1},...l.filter(L=>L.id!==jt?.id).map(L=>({travel:mf(L),rehearsalId:L.id,liked:L.liked}))].flatMap(L=>ud(L.travel).map(D=>({...L,album:D})));for(const{travel:L,rehearsalId:D,liked:k,album:H}of b){const X=H.posts.at(-1),V=H.posts[0],K=ye("article","","moment-card");K.dataset.city=String(H.city),D&&(K.dataset.rehearsalId=D,K.classList.add("test-travel-card"));const G=new Date(X.at),se=ye("div","","date-ticket");se.append(ye("strong",String(G.getDate())),ye("small",G.getMonth()+1+"月")),K.append(se);const me=ye("div","","moment-heading");me.append(ye("small",(X.name??"旅伴")+"的旅行日记"+(D?" · 测试旅行":"")),ye("h2",Ot[H.city].name+" · "+Ot[H.city].subtitle)),K.append(me);const _e=ye("div","","album-photos");for(const $e of H.photos)_e.append(hd($e));K.append(_e);const Be=Fm(L,H.city);if(K.append(ye("p",Be?.text??"这一路，我们"+H.photos.map($e=>$e.title).join("、")+"。想把这些小小的快乐，都留在这一页。","city-diary")),C&&X.actor===wn?.actor){const $e=[Kr,D??"real",X.actor,H.city,gf(X.at),...H.posts.map(ee=>ee.id)].join("|"),st=()=>{if(xs.has($e))return;xs.add($e),il.add($e),Xr.delete($e);const ee=jt,Me=Kr;a(),window.qbot.garden.rewriteDiary({city:H.city,...D?{rehearsalId:D}:{}}).then(De=>{if(!(Me!==Kr||jt!==ee))if(De.ok){const be=De.value;L.diaries=L.diaries.filter(Ze=>Ze.city!==be.city||Ze.actor!==be.actor||Ze.day!==be.day),L.diaries.push(be)}else Xr.set($e,De.error)}).catch(()=>{Xr.set($e,"生成失败，可点击重试")}).finally(()=>{xs.delete($e),a()})},Y=ye("div","","diary-writing");Y.append(Ft(xs.has($e)?"正在按人设写…":"按人设重写",st,"diary-rewrite",xs.has($e)||s)),Xr.has($e)&&Y.append(ye("small",Xr.get($e))),K.append(Y),!Be?.generated&&!il.has($e)&&!s&&queueMicrotask(st)}const lt=ye("div","","moment-footer");lt.append(ye("span",oo(L,H.city)?"✓ 本站已集齐":"已收藏 "+H.photos.length+" / 5 段风景"),Ft((D?k:V.liked)?"♥ 喜欢":"♡ 喜欢",()=>{c(D?{type:"travelRehearsalLike",id:D}:{type:"travelLike",id:H.likeId})},"moment-like",s)),K.append(lt),i.append(K)}!b.length&&!o.length&&i.append(ye("div","手账的第一页，等你一起出发，也可以先写下今天的小事。","travel-empty"))}else if(Jn){const w=zm(v,"destination-view"),R=ye("div","","destination-heading");if(R.append(ye("span",g.region+" / "+g.name),ye("strong",p+" / 15")),w.append(R),g.projects.forEach((X,V)=>{const K=m.progress[v][V],G=Ft(X.name+" "+(K===3?"✓":"●".repeat(K)+"○".repeat(3-K)),()=>{Qn=V,r("travel")},"place-pin "+(V===Qn?"selected":"")+(K===3?" complete":""));if(G.style.left=Oi[V][0]+"%",G.style.top=Oi[V][1]+"%",w.append(G),K){const se=ye("span",K===3?"✿":"✧","place-keepsake");se.style.left=Oi[V][0]+9+"%",se.style.top=Oi[V][1]-7+"%",w.append(se)}}),bn&&bn.city===v&&bn.until>Date.now()&&m.progress[v][bn.project]>bn.step){const X=bn,V=ye("div","","experience-celebration");V.style.left=Oi[bn.project][0]+"%",V.style.top=Oi[bn.project][1]+"%";for(let _e=0;_e<12;_e++){const Be=ye("i",_e%3?"✦":"❀");Be.style.setProperty("--i",String(_e)),V.append(Be)}V.append(ye("strong","回忆 +1","memory-stamp")),w.append(V);const K=ye("div","","travel-photo-reveal");K.setAttribute("aria-live","polite");const G=g.projects[X.project].steps[X.step],se=hd({city:v,project:X.project,step:X.step,title:G});se.classList.add("revealed-postcard"),se.querySelector(".photo-window")?.removeAttribute("tabindex");const me=ye("span",g.name+" · 已收藏","postcard-stamp");se.append(me),K.append(se),i.append(K),requestAnimationFrame(()=>{if(!i.isConnected)return;const _e=w.querySelectorAll(".place-pin")[X.project].getBoundingClientRect(),Be=se.getBoundingClientRect();K.style.setProperty("--collect-x",_e.left+_e.width/2-Be.left-Be.width/2+"px"),K.style.setProperty("--collect-y",_e.top+_e.height/2-Be.top-Be.height/2+"px"),K.style.setProperty("--elapsed",Math.min(0,X.until-Date.now()-3400)+"ms"),K.classList.add("playing"),se.addEventListener("animationend",()=>{K.remove(),w.querySelectorAll(".place-pin")[X.project].classList.add("photo-collected")},{once:!0})})}i.append(w);const C=g.projects[Qn],S=m.progress[v][Qn],b=ye("div","","experience-card"),L=ye("div"),D=pf(v,Qn,Math.min(S,2));if(D){const X=Ft("",()=>rl(D,C.steps[Math.min(S,2)]),"experience-thumbnail");X.setAttribute("aria-label","查看"+C.steps[Math.min(S,2)]+"配图");const V=ye("img");V.src=D,V.alt=C.steps[Math.min(S,2)],X.append(V),b.append(X)}L.className="experience-copy",L.append(ye("small",C.name+" · "+"●".repeat(S)+"○".repeat(3-S)),ye("h2",S===3?"这一刻，记住了":C.steps[S])),b.append(L),b.append(Ft(S===3?"已体验":"◉ "+g.costs[S]+"  体验",()=>{n({type:"travelExperience",city:v,project:Qn,step:S})},"experience-buy",s||S===3||v!==m.current||e.coins<g.costs[S])),S<3&&e.coins<g.costs[S]&&b.append(ye("small","还差 "+(g.costs[S]-e.coins)+" 金币","short-fare")),i.append(b);const k=ye("div","","travel-next");k.append(Ft("查看本站手账 →",()=>r("moments")));const H=Ft(jt?"重新测试":"测试重玩",()=>d(v),"travel-replay",s);H.title="仅测试：重新体验本站，不扣真实金币、不修改旅行进度",k.append(H),jt?k.append(Ft("退出测试",()=>{jt=void 0,bn=void 0,v>u&&(Jn=!1),r("travel")},"travel-replay-exit")):v===m.current&&v<Ot.length-1?k.append(Ft("下一站 · "+Ot[v+1].name,()=>{bn=void 0,n({type:"travelNext",city:v}).then(()=>{tr=void 0,Qn=0,r("travel")})},"depart",s||!oo(m,v))):v===Ot.length-1&&oo(m,v)&&k.append(ye("span","这一程，圆满收进手账。")),i.append(k)}else{const w=ye("div","","world-map"),R=ye("img");R.src=Bm,R.alt="手绘世界旅行路线",w.append(R);const C=document.createElementNS("http://www.w3.org/2000/svg","svg");C.setAttribute("viewBox","0 0 100 150"),C.classList.add("atlas-route"),C.setAttribute("aria-hidden","true"),C.innerHTML='<path d="M82 48V66H23V48M23 48V92H60V114" fill="none" stroke="#345f58" stroke-width="1.2" stroke-dasharray="1 1" opacity=".65"/><path d="'+(m.current===0?"M82 48":m.current===1?"M82 48V66H23V48":"M82 48V66H23V48V92H60V114")+'" fill="none" stroke="#fff1c0" stroke-width="1.2"/>',w.append(C),Ot.forEach((L,D)=>{const k=Ft((D<m.current?"✓ ":D>m.current?"⌑ ":"")+L.name,()=>{tr=D,Qn=0,h("travel")},"map-pin "+(D===m.current?"current":"")+(D===v?" selected":""));k.setAttribute("aria-pressed",String(D===v)),k.style.left=dd[D][0]+"%",k.style.top=dd[D][1]+"%",k.title=D>m.current?"尚未解锁，可选中后进入测试":L.region,w.append(k)});const S=ye("div","","departure-ticket");S.append(ye("small",v>m.current?"尚未解锁 · 可直接测试":v<m.current?"已到访 · 可回看或测试":"当前目的地"),ye("h2",g.name));const b=ye("div","","destination-actions");b.append(Ft(v>m.current?"尚未解锁":v<m.current?"回看 →":"出发 →",()=>{Jn=!0,Qn=0,h("travel")},"depart",s||v>m.current),Ft("进入测试",()=>{Qn=0,d(v)},"travel-test-entry",s)),S.append(b),w.append(S),i.append(w)}if(t==="moments"){const w=ye("div","","journal-pages");for(const R of[...i.children])R!==y&&w.append(R);i.append(w),requestAnimationFrame(()=>{i.isConnected&&(w.scrollTop=f)})}i.append(A),di.includes("保存失败")&&i.append(ye("p",di,"journal-status"))}function Io(i){const e=new Map;for(const t of i){const n=JSON.stringify([t.species,t.origin,t.massGene,t.slots,t.bred,[...t.genes].sort(),t.parents?[...t.parents].sort():[]]),r=e.get(n);r?r.count++:e.set(n,{seed:t,count:1})}return[...e.values()]}const Vm={bag:'<path d="M12 9V6q6-5 12 0v3" fill="none"/><path d="M9 10q9-3 18 0l3 19q-12 5-24 0Z" fill="#dca760"/><path d="M10 10q8-3 16 0v9q-8 5-16 0Z" fill="#93b487"/><path d="M13 24h10v6H13Z" fill="#ffe1a0"/><path d="M17 17h3v5h-3Z" fill="#fff5d6"/>',shop:'<path d="M7 17h23v15H7Z" fill="#f3d59d"/><path d="M4 16 9 5h18l5 11" fill="#f8eee0"/><path d="m9 5-2 11h6l2-11m6 0 2 11h7L27 5" fill="#e88978"/><path d="M4 16q3 6 7 0 4 6 8 0 4 6 8 0 3 5 5 0" fill="#efaa86"/><path d="M12 23h6v9h-6Z" fill="#92b394"/><path d="M22 22h5v5h-5Z" fill="#b8dce2"/>',book:'<path d="M5 6q7-3 13 1 7-4 13-1v24q-7-3-13 1-7-4-13-1Z" fill="#a6c9d2"/><path d="M8 8q5-1 10 2 5-3 10-2v19q-6-2-10 1-5-3-10-1Z" fill="#fff4d8"/><path d="M18 10v18" fill="none"/><path d="M22 24V15q8 0 3 6h-3M14 22l-4-2m1-6h3" fill="#8bb589"/>',close:'<path d="M9 9q9-4 18 0l1 17q-10 5-20 0Z" fill="#eddfc0"/><path d="m14 14 9 9m0-9-9 9" fill="none"/>',ready:'<path d="m18 3 4 10 11 5-11 4-4 11-5-11L3 18l10-5Z" fill="#e8c46e"/>'};function co(i){return`<svg viewBox="0 0 36 36" aria-hidden="true" focusable="false" fill="none" stroke="#414335" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round">${Vm[i]}</svg>`}function Gm(i,e,t,n,r,s,a=!1){const l=Math.max(8,Math.min(r-t/2,i-t-8)),u=Math.min(e,...s.map(m=>m.top))-16,d=Math.max(0,u-8);if(d>=(a?n:110)){const m=Math.min(350,d);return{left:l,top:Math.max(8,u-Math.min(n,m)),maxHeight:m}}const f=Math.min(350,n,e-16),h=[8,i-t-8,...s.flatMap(m=>[m.left-16-t,m.right+16])];for(const m of h)if(!(m<8||m+t>i-8)&&s.every(v=>m+t+16<=v.left||m>=v.right+16||8+f+16<=v.top||8>=v.bottom+16))return{left:m,top:8,maxHeight:f};return{left:l,top:8,maxHeight:a?f:d}}function Wm(i,e,t,n){const s=n==="left"?i-20-455:e+20,a=Math.max(54,Math.min(s,t-455-54));return{left:a,width:455,toolsLeft:n==="left"?a-48:a+455+12}}const nc='<path d="M0 0Q-32-30-37-9Q-30 9 0 0Q32-30 37-9Q30 9 0 0" fill="#86aa58"/>',$m={lotus:'<path d="M0 55V9" fill="none" stroke="#789554" stroke-width="6"/><path d="M0 40q-40-28-38-4Q-27 53 0 40" fill="#93b871"/><path d="M0 6Q-41 5-43-30Q-16-28 0 6Q41 5 43-30Q16-28 0 6" fill="#ef98ba"/><path d="M0 9Q-29-17 0-48Q29-17 0 9Z" fill="#f4b1cd"/>',sunflower:'<path d="M0 58V7" fill="none" stroke="#789554" stroke-width="6"/><path d="M0 42q33-31 35-12Q26 48 0 42" fill="#93b871"/><g fill="#e7bb51"><ellipse cy="-35" rx="10" ry="20"/><ellipse cy="-35" rx="10" ry="20" transform="rotate(45 0 -7)"/><ellipse cy="-35" rx="10" ry="20" transform="rotate(90 0 -7)"/><ellipse cy="-35" rx="10" ry="20" transform="rotate(135 0 -7)"/><ellipse cy="-35" rx="10" ry="20" transform="rotate(180 0 -7)"/><ellipse cy="-35" rx="10" ry="20" transform="rotate(225 0 -7)"/><ellipse cy="-35" rx="10" ry="20" transform="rotate(270 0 -7)"/><ellipse cy="-35" rx="10" ry="20" transform="rotate(315 0 -7)"/></g><circle cy="-7" r="22" fill="#a58258"/>',strawberry:'<path d="M-32-19Q-52 5-13 44Q0 56 13 44Q52 5 32-19Q15-33 0-23Q-15-33-32-19Z" fill="#ed6573"/><path d="M0-20l-26-14 13 22-21 2 25 8 9-14 10 14 24-8-21-2 13-22Z" fill="#82a85b"/><g fill="#ffe7a0" stroke="none"><ellipse cx="-20" cy="3" rx="2" ry="4"/><ellipse cx="4" cy="5" rx="2" ry="4"/><ellipse cx="22" cy="2" rx="2" ry="4"/><ellipse cx="-10" cy="25" rx="2" ry="4"/><ellipse cx="12" cy="25" rx="2" ry="4"/></g>',apple:'<path d="M0-22C-48-48-53 14-25 40Q-12 50 0 42Q17 51 30 36C55 5 44-42 0-22Z" fill="#df7160"/><path d="M0-24q-2-17 8-23" fill="none"/><path d="M5-32q16-29 34-11Q29-23 5-32" fill="#88a95d"/><path d="M-25-12q-9 8-8 18" fill="none" stroke="#ffd9b3" stroke-width="5"/>',pineapple:'<path d="M-29-15Q0-35 29-15L35 28Q32 50 0 52Q-32 50-35 28Z" fill="#edbc58"/><path d="M-26-12l54 48m-59-27 44 40M26-12l-54 48m59-27-44 40" stroke="#c89449" stroke-width="2"/><path d="M0-19l-30-30 22 10-5-27 16 22 13-28 2 31 21-12-14 28Z" fill="#79a567"/>',tomato:'<path d="M0-24C-58-41-57 45 0 45C57 45 58-41 0-24Z" fill="#e97b58"/><path d="M0-24l-22-17 10 21-23 2 28 10 7-13 13 15 21-14-23-1 7-20Z" fill="#7a9d56"/>',blueberry:'<g fill="#839ac9"><circle cx="-20" cy="4" r="23"/><circle cx="20" cy="4" r="23"/><circle cy="30" r="23"/></g><g fill="#586982" stroke="none"><path d="M-20-7l4 7 8 2-8 3-4 7-3-8-8-2 8-3Z"/><path d="M20-7l4 7 8 2-8 3-4 7-3-8-8-2 8-3Z"/><path d="M0 19l4 7 8 2-8 3-4 7-3-8-8-2 8-3Z"/></g><path d="M0-20q10-30 28-19Q20-17 0-20" fill="#86aa58"/>',carrot:'<path d="M-23-17Q0-33 23-17Q16 24-3 55Q-17 29-23-17Z" fill="#ed9b58"/><path d="M0-21q-34-34-19-43Q-4-62 0-21q0-53 15-43Q25-54 0-21q35-38 36-16Q26-22 0-21" fill="#83a960"/><path d="M-18-3l17 5m-13 16 15 4" fill="none" stroke="#c47743"/>',tulip:'<path d="M0 55V0" fill="none" stroke="#6f9454" stroke-width="7"/><path d="M0 40q-37-9-27-33Q-8 13 0 40q33-9 27-27Q11 16 0 40" fill="#8aad65"/><path d="M-30-43l21 13L0-51l13 22 20-13Q38 3 0 7Q-36 3-30-43Z" fill="#e9a0b3"/>'},fd={lotus:new URL(""+new URL("lotus-zwGTFjtY.png",import.meta.url).href,import.meta.url).href,sunflower:new URL(""+new URL("sunflower-BwQond-r.png",import.meta.url).href,import.meta.url).href},Xm={plant:new URL(""+new URL("pineapple-plant-ChmR5eJd.png",import.meta.url).href,import.meta.url).href,fruit:new URL(""+new URL("pineapple-fruit-vT9mnn_G.png",import.meta.url).href,import.meta.url).href},qm={strawberry:{plant:new URL(""+new URL("strawberry-plant-BkCo3Cay.png",import.meta.url).href,import.meta.url).href,fruit:new URL(""+new URL("strawberry-fruit-Dh2WQMj9.png",import.meta.url).href,import.meta.url).href},lotus:{plant:new URL(""+new URL("lotus-plant-Cu3oLzHS.png",import.meta.url).href,import.meta.url).href,fruit:new URL(""+new URL("lotus-fruit-efEWYPsR.png",import.meta.url).href,import.meta.url).href},sunflower:{plant:new URL(""+new URL("sunflower-plant-DpoadjuH.png",import.meta.url).href,import.meta.url).href,fruit:new URL(""+new URL("sunflower-fruit-BrfLv-m9.png",import.meta.url).href,import.meta.url).href},carrot:{plant:new URL(""+new URL("carrot-plant-CohLgyNw.png",import.meta.url).href,import.meta.url).href,fruit:new URL(""+new URL("carrot-fruit-LWE9jegu.png",import.meta.url).href,import.meta.url).href},tomato:{plant:new URL(""+new URL("tomato-plant-wjJC-Nj4.png",import.meta.url).href,import.meta.url).href,fruit:new URL(""+new URL("tomato-fruit-CtltaVUI.png",import.meta.url).href,import.meta.url).href},blueberry:{plant:new URL(""+new URL("blueberry-plant-kE3q5jst.png",import.meta.url).href,import.meta.url).href,fruit:new URL(""+new URL("blueberry-fruit-B01_pfqA.png",import.meta.url).href,import.meta.url).href},apple:{plant:new URL(""+new URL("apple-plant-CY0nLUij.png",import.meta.url).href,import.meta.url).href,fruit:new URL(""+new URL("apple-fruit-DrNlcgVg.png",import.meta.url).href,import.meta.url).href},tulip:{plant:new URL(""+new URL("tulip-plant-C2UpgVLG.png",import.meta.url).href,import.meta.url).href,fruit:new URL(""+new URL("tulip-fruit-8BppNjqR.png",import.meta.url).href,import.meta.url).href},pineapple:Xm};function ic(i,e="0 0 160 200"){return"data:image/svg+xml;charset=utf-8,"+encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${e}"><g stroke="#56533c" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">${i}</g></svg>`)}function yo(i,e="fruit",t=!0){if(e==="seed")return ic('<path d="M47 18h66l-8 22q23 40 20 125-45 22-90 0-3-85 20-125Z" fill="#f3dfae"/><path d="M51 40h58" stroke="#b38c60" stroke-width="6"/><path d="M42 61q-7 56-3 91m76-91q7 56 3 91" fill="none" stroke="#dcc496"/><ellipse cx="80" cy="107" rx="35" ry="43" fill="#fff8e6" stroke="#d8bd89"/>');if(e==="fruit"||t)return qm[i][e];if(fd[i])return fd[i];const n=$m[i];if(i==="tulip")return ic(`<g transform="translate(80 96) scale(1.25)">${n}</g>`);const r=i==="apple",s=i==="pineapple";let a=r?'<path d="M74 189l2-94h12l5 94Z" fill="#b09267"/><path d="M80 137l-29-36m34 18 25-39" fill="none" stroke-width="7" stroke="#8e7855"/><path d="M23 105C-8 66 31 50 37 47C31 8 90-5 110 31C153 13 172 72 146 97Q123 133 92 115Q47 137 23 105Z" fill="#88aa62"/>':s?'<path d="M80 188Q10 171 7 107Q52 121 80 180Q16 85 42 67Q66 100 80 171Q72 63 95 67Q107 114 86 175Q130 87 153 109Q138 171 80 188Z" fill="#85a967"/>':`<path d="M80 189Q62 147 80 65M78 149L42 114M79 127L117 85" fill="none" stroke="#789555" stroke-width="6"/><g transform="translate(77 170)">${nc}</g><g transform="translate(71 129) rotate(-20)">${nc}</g><g transform="translate(84 94) scale(.8)">${nc}</g>`;return t?a+=s?`<g transform="translate(80 90) scale(.7)">${n}</g>`:`<g transform="translate(47 90) scale(.42)">${n}</g><g transform="translate(106 70) scale(.46)">${n}</g><g transform="translate(102 127) scale(.4)">${n}</g>`:a+='<g fill="#f7e4bd" stroke="none"><circle cx="47" cy="85" r="4"/><circle cx="105" cy="69" r="4"/></g>',ic(a)}const jm=new URL(""+new URL("juvenile-plants-DGZuYsb7.png",import.meta.url).href,import.meta.url).href,Ym=["strawberry","lotus","sunflower","carrot","tomato","blueberry","apple","tulip","pineapple"];let Km=0;function Zm(i){const e=Ym.indexOf(i),t=1254/3,n=Math.floor(e/3),r=[0,410,790][n],s=[410,380,464][n],a=document.createElementNS("http://www.w3.org/2000/svg","svg");a.setAttribute("viewBox",`${e%3*t} ${r} ${t} ${s}`),a.setAttribute("preserveAspectRatio","xMidYMax meet"),a.setAttribute("aria-label",`${i} juvenile plant`),a.classList.add("juvenile-art");const o=document.createElementNS(a.namespaceURI,"image");o.setAttribute("href",jm),o.setAttribute("width","1254"),o.setAttribute("height","1254");const c=document.createElementNS(a.namespaceURI,"clipPath");c.id=`juvenile-cell-${++Km}`;const l=document.createElementNS(a.namespaceURI,"rect");l.setAttribute("x",String(e%3*t)),l.setAttribute("y",String(r)),l.setAttribute("width",String(t)),l.setAttribute("height",String(s)),c.append(l),o.setAttribute("clip-path",`url(#${c.id})`);const u=document.createElementNS(a.namespaceURI,"defs");return u.append(c),a.append(u,o),a}function xf(i,e=!1,t=!1){const n=document.createElement("div");return n.className=`art secret-growth secret-${i}${e?" secret-sealed":""}${t?" secret-active":""}`,n.setAttribute("role","img"),n.setAttribute("aria-label",e?`${si[i]}灵果，${t?"正在培育":"等待培育揭晓"}`:`${si[i]}品质，果实仍在孕育`),n.innerHTML=`<svg viewBox="0 0 160 200" aria-hidden="true">
      <ellipse class="secret-shadow" cx="80" cy="182" rx="40" ry="7"/>
      <path d="M80 180V132M80 166Q44 174 37 144Q65 141 80 166M80 155Q105 128 124 137Q120 161 80 166" fill="#92ae70" stroke="#647b51" stroke-width="3" stroke-linejoin="round"/>
      <g class="secret-aura"><ellipse cx="80" cy="102" rx="55" ry="62"/></g>
      ${e?'<g class="secret-lotus" fill="#ecb2b7" stroke="#be7e93" stroke-width="2"><path d="M80 147Q24 155 20 119Q58 111 80 147Q101 110 140 119Q133 155 80 147Z"/><path d="M80 152Q45 128 80 107Q114 130 80 152Z" fill="#f5d3b3"/></g>':""}
      <g class="secret-core"><path d="M80 49C40 49 39 79 43 106Q45 137 80 145Q115 137 117 106C121 79 120 49 80 49Z" fill="${e?"#6b527d":"#9ea98d"}" stroke="${e?"#f7d89a":"#dbe4c1"}" stroke-width="3"/>
      <ellipse cx="80" cy="95" rx="25" ry="29" fill="${e?"#d3aac8":"#d4d8ba"}" opacity=".28"/>
      <path d="M47 79Q80 58 113 79M44 104Q81 82 116 105M52 124Q81 103 109 124" fill="none" stroke="#fff4d6" stroke-width="9" opacity=".22"/>
      ${e?'<path d="M71 67h18l-3 62-6-5-6 5Z" fill="#f8d995"/><path d="m77 80 7 7-7 7 7 7-7 7" fill="none" stroke="#b97060" stroke-width="2.5"/>':'<path d="M80 53Q63 33 52 49Q57 64 80 59Q99 39 109 51Q104 66 80 59" fill="#89a56e"/>'}</g>
      ${e?'<g class="secret-ribbons" fill="none" stroke="#ee9c9b" stroke-width="5" stroke-linecap="round"><path d="M41 94Q16 66 20 110Q22 135 42 125M119 94Q146 66 140 110Q139 135 118 125"/></g><ellipse class="secret-orbit" cx="80" cy="106" rx="63" ry="20" transform="rotate(-22 80 106)"/>':""}
      <g class="secret-sparks"><path d="m32 63 3-8 3 8 8 3-8 3-3 8-3-8-8-3ZM124 47l3-7 3 7 7 3-7 3-3 7-3-7-7-3Z"/><circle cx="133" cy="92" r="3"/><circle cx="29" cy="118" r="2"/></g>
    </svg>`,n}const Jm={dew:["#bdebe5","#fffdf4"],striped:["#af845a","#fce1a5"],jade:["#79b69a","#ecffed"],crystal:["#c4e8f0","#ffffff"],amber:["#d79341","#ffda82"],prism:["#b1bcf5","#bff2d9"],velvet:["#d9e8e3","#f7f5e9"],celadon:["#8fc6b7","#e1f4de"],wax:["#d99e45","#ffe6a7"],pearl:["#e4c2d8","#f9f9e2"],nightdye:["#584d87","#c0bcf5"],redgold:["#c5784e","#ffe2b0"],silver:["#a7bcc9","#f7faff"],obsidian:["#434b63","#abb9d7"],iridescent:["#9ecfd2","#e6bcea"],daylight:["#fff2b1","#fffdf4"],sugar:["#f6b1b5","#fff1c8"],fragrant:["#c5d79e","#f4efbc"],juicy:["#f1ad84","#ffffff"],honey:["#dfaa57","#ffeab6"],nectar:["#df9746","#ffdc86"],milky:["#f3dfc4","#fffbed"],softcore:["#dfd6b7","#fff9e0"],delicate:["#d7c2eb","#fff4c3"],abundant:["#c3bd74","#fff0a4"],starcore:["#d8b768","#fff8bf"],nebula:["#aa9bd4","#e6bcdf"],glassheart:["#bad9e7","#f9e2ee"],galaxycore:["#9898d8","#d6e2fc"]};function Qm(i,e){const t=Ln(`botanical-accessory ornament-${i}${e?" twin-copy":""}`),n=["breezy","snowbell","goldbell"].includes(i),r=["butterfly","dreambutterfly"].includes(i),s=i==="goldbell"?"#e7bb57":i==="snowbell"?"#c7e3e7":i==="dreambutterfly"?"#b7a2dc":"#dda9bf",a=n?'<path d="M68 30v11m-8 0q8-13 16 0l4 12H56Z"/><circle cx="68" cy="55" r="3"/>':r?'<path d="M70 40q-23-25-20-4 1 13 20 7-14 18-2 13l3-12q18 15 18 2 0-9-16-6 18-21 3-18Z"/>':i==="leafwhistle"?'<path d="M66 55q-26-32 9-33 10 24-9 33Z"/><path d="m64 60 7-31" fill="none"/>':i==="moon"?'<path d="M82 22a19 19 0 1 0 0 35 20 20 0 0 1 0-35Z"/>':i==="halo"?'<path d="m27 22 7-14 15 13L63 7l9 15Z"/><circle cx="49" cy="17" r="3" fill="#fff7bf"/>':'<path d="M50 70q-25-23-21-3 2 13 19 7-4 15 2 12 6 3 3-12 20 6 19-8-3-16-21 4Z"/><circle cx="50" cy="72" r="4" fill="#ffecc3"/>';return t.innerHTML=`<svg viewBox="0 0 100 100"><g fill="${s}" stroke="#87715d" stroke-width="1.2" stroke-linejoin="round">${a}</g></svg>`,t}const pd="M0 35L22 29 31 43 50 36 65 51 89 39 100 44M22 29L26 9 18 0M31 43L28 67 43 81 39 100M65 51L61 73 76 88 73 100M89 39L78 18 89 0M28 67L0 79M61 73L100 64",eg=`url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path d="${pd}" fill="none" stroke="#429ad1" stroke-width="1.8"/><path d="${pd}" fill="none" stroke="#e7fbff" stroke-width=".65"/></svg>`)}")`;function Ln(i){const e=document.createElement("div");return e.className=i,e.setAttribute("aria-hidden","true"),e}function Bn(i,e,t){t=Math.min(t,Math.max(0,8-i.querySelectorAll(".mutation-particles i").length));const n=Ln(`mutation-particles particles-${e}`);for(let r=0;r<t;r++){const s=document.createElement("i");s.style.setProperty("--i",String(r));const a=[[9,25],[84,14],[17,68],[88,63],[40,4],[67,88],[55,35],[4,86]],[o,c]=a[r%a.length];s.style.left=o+"%",s.style.top=c+"%",e==="note"&&(s.textContent=r%2?"♪":"♫"),n.append(s)}i.append(n)}function tg(i,e){const t=Ln(`botanical-accessory accessory-${i}${e?" twin-copy":""}`);return t.innerHTML=i==="punk"?'<svg viewBox="0 0 100 100"><g stroke="#654052" stroke-width="1.2" stroke-linejoin="round"><path d="M22 64Q50 73 78 64L77 73Q50 81 23 73Z" fill="#69475f"/><path d="M24 66Q50 74 76 66" fill="none" stroke="#b77a9c"/><path d="M31 67l-4 6 8-1Z M49 70l-4 6 8-1Z M68 68l-4 6 8-1Z" fill="#fff2d9"/><path d="M71 26q-3-5-6-1t1 6l8 9q4 3 6-1t-2-6Z" fill="none" stroke="#50394c" stroke-width="3.5"/><path d="M71 26q-3-5-6-1t1 6l8 9q4 3 6-1t-2-6Z" fill="none" stroke="#eddddc" stroke-width="1.8"/></g></svg>':'<svg viewBox="0 0 100 100"><g stroke="#704267" stroke-width="1.2" stroke-linejoin="round"><path d="M47 76L36 88l-1-7-7 1 9-13M53 76l11 12 1-7 7 1-9-13" fill="#995394"/><path d="M49 70Q27 54 29 69Q28 80 49 74M51 70Q73 54 71 69Q72 80 51 74" fill="#b773b0"/><path d="M32 66l15 6-15 1M68 66l-15 6 15 1" fill="#d59bca" stroke="none"/><ellipse cx="50" cy="76" rx="8" ry="11" fill="#e5bb63" stroke="#a87942"/><ellipse cx="50" cy="76" rx="5.6" ry="8.4" fill="#fff1cf" stroke="#fff7d7"/><path d="M52 69v10q-5 4-5 0 0-2 4-2" fill="none" stroke="#aa7848"/></g></svg>',t}const Sa=new Set;let Ms,rc,ba;function sc(i){const e=i.querySelector("img");if(!e?.naturalWidth)return;const t=getComputedStyle(i),n=i.clientWidth-parseFloat(t.paddingLeft)-parseFloat(t.paddingRight),r=i.clientHeight-parseFloat(t.paddingTop)-parseFloat(t.paddingBottom),s=Math.min(n,r*e.naturalWidth/e.naturalHeight);i.style.setProperty("--fx-width",`${s}px`),i.style.setProperty("--fx-height",`${s*e.naturalHeight/e.naturalWidth}px`),i.style.setProperty("--fx-bottom",t.paddingBottom)}function ng(i){if(!Ms){Ms=new IntersectionObserver(n=>{for(const r of n)r.target.classList.toggle("fx-offscreen",!r.isIntersecting)}),ba=new ResizeObserver(n=>{for(const r of n)sc(r.target)});const t=()=>document.documentElement.classList.toggle("garden-fx-paused",document.hidden);document.addEventListener("visibilitychange",t),t(),rc=new MutationObserver(()=>{for(const n of Sa)n.isConnected||(Ms.unobserve(n),ba.unobserve(n),Sa.delete(n))}),rc.observe(document.body,{childList:!0,subtree:!0}),window.addEventListener("pagehide",()=>{Ms?.disconnect(),rc?.disconnect(),ba?.disconnect(),Sa.clear(),document.removeEventListener("visibilitychange",t)},{once:!0})}Sa.add(i),Ms.observe(i),ba.observe(i);const e=i.querySelector("img");e.complete?sc(i):e.addEventListener("load",()=>sc(i),{once:!0})}function ig(i,e,t,n=!1){if(!(!t.length&&!n)){i.classList.add("mutation-art"),i.style.setProperty("--plant-mask",`url(${JSON.stringify(e)})`),n&&Bn(i,"gold-quality",5);for(let r=0;r<(t.includes("twin")?2:1);r++){const s=Ln(`mutation-surface${r?" twin-copy":""}`);for(const a of["purple","mint","coral","rainbow","golden","punk","frost","thunder"]){if(!t.includes(a))continue;const o=Ln(`surface-${a}`);if(a==="frost"&&o.style.setProperty("--ice-cracks",eg),a==="rainbow")for(const c of["a","b","c"])o.append(Ln(`prism-region prism-${c}`));s.append(o)}for(const a of t){const o=Jm[a];if(!o)continue;const c=Ln(`surface-life surface-life-${a}`);c.style.setProperty("--material-a",o[0]),c.style.setProperty("--material-b",o[1]),s.append(c)}s.childElementCount&&i.append(s);for(const a of["punk","classical"])t.includes(a)&&i.append(tg(a,r));for(const a of["breezy","snowbell","goldbell","butterfly","dreambutterfly","leafwhistle","moon","halo","flowerknot"])t.includes(a)&&i.append(Qm(a,r))}if(t.includes("frost")&&(i.append(Ln("frost-mist")),Bn(i,"ice",6)),t.includes("thunder")){const r=Ln("thunder-arcs");r.innerHTML='<svg viewBox="0 0 100 120" preserveAspectRatio="none"><g class="arc arc-a"><path d="M28 13L13 28 23 33 9 49 19 54 13 74M13 28L5 22M19 54L31 48"/></g><g class="arc arc-b"><path d="M77 35L91 47 80 55 96 69 85 77 91 99M91 47L98 40M85 77L71 85"/></g><g class="arc arc-c"><path d="M25 94L42 100 49 90 59 107 77 102"/></g></svg>';for(const s of r.querySelectorAll("g")){const a=s.firstElementChild;a.classList.add("arc-glow");const o=a.cloneNode();o.setAttribute("class","arc-core"),s.append(o)}i.append(r),Bn(i,"charge",5)}t.includes("shiny")&&Bn(i,"star",7),t.includes("firefly")&&Bn(i,"firefly",5),t.includes("petals")&&Bn(i,"petal",7),t.includes("classical")&&Bn(i,"note",3),t.includes("mist")&&i.append(Ln("frost-mist")),t.includes("raindrop")&&Bn(i,"droplet",3),t.includes("stardust")&&Bn(i,"star",4),t.includes("glowring")&&(Bn(i,"firefly",5),i.append(Ln("life-orbit orbit-glow"))),t.includes("meteorRing")&&(Bn(i,"star",3),i.append(Ln("life-orbit orbit-meteor"))),ng(i)}}function sl(i,e){const t=document.createElement("span");if(t.className="supply-art",i==="seed"&&Object.hasOwn(Ye,e)){const n=document.createElement("img");n.src=yo(e,"seed"),n.alt="",t.append(n)}else{const n={speed:"#e8b36e",mutation:"#bb9ed2",weight:"#8bb7cc"}[Kt[e]?.effect??e]??"#a8bd8c";t.innerHTML=`<svg viewBox="0 0 64 72" aria-hidden="true"><path d="M19 7h26l-3 10 10 43q-20 10-40 0l10-43Z" fill="${n}" stroke="#697552" stroke-width="2.5"/><path d="M21 17h22" stroke="#697552" stroke-width="3"/><ellipse cx="32" cy="42" rx="12" ry="14" fill="#fff7de"/><path d="M32 51V34q14-6 8 5-3 5-8 4m0-1q-14-2-8-8 6 0 8 8" fill="#87a56d"/></svg>`}if(i==="fertilizer"){const n=Kt[e]?.grade??1,r=document.createElement("small");r.className="fert-grade",r.textContent="✦".repeat(n),t.append(r)}return t}const vu="180",rg=0,md=1,sg=2,Mf=1,ag=2,yi=3,Ci=0,un=1,In=2,Gi=0,Zr=1,gd=2,vd=3,_d=4,og=5,dr=100,cg=101,lg=102,ug=103,dg=104,hg=200,fg=201,pg=202,mg=203,al=204,ol=205,gg=206,vg=207,_g=208,yg=209,xg=210,Mg=211,Sg=212,bg=213,wg=214,cl=0,ll=1,ul=2,ts=3,dl=4,hl=5,fl=6,pl=7,_u=0,Eg=1,Tg=2,Wi=0,Ag=1,Rg=2,Cg=3,yu=4,Lg=5,Pg=6,Ig=7,yd="attached",Dg="detached",Sf=300,ns=301,is=302,ml=303,gl=304,Do=306,rs=1e3,Hi=1001,xo=1002,dn=1003,bf=1004,Us=1005,En=1006,lo=1007,Si=1008,ai=1009,wf=1010,Ef=1011,Js=1012,xu=1013,vr=1014,Gn=1015,ma=1016,Mu=1017,Su=1018,Qs=1020,Tf=35902,Af=35899,Rf=1021,Cf=1022,Un=1023,ea=1026,ta=1027,bu=1028,wu=1029,Lf=1030,Eu=1031,Tu=1033,uo=33776,ho=33777,fo=33778,po=33779,vl=35840,_l=35841,yl=35842,xl=35843,Ml=36196,Sl=37492,bl=37496,wl=37808,El=37809,Tl=37810,Al=37811,Rl=37812,Cl=37813,Ll=37814,Pl=37815,Il=37816,Dl=37817,Nl=37818,Ul=37819,Fl=37820,Ol=37821,Bl=36492,kl=36494,zl=36495,Hl=36283,Vl=36284,Gl=36285,Wl=36286,na=2300,ia=2301,ac=2302,xd=2400,Md=2401,Sd=2402,Ng=2500,Ug=0,Pf=1,$l=2,Fg=3200,Og=3201,Au=0,Bg=1,zi="",Bt="srgb",fn="srgb-linear",Mo="linear",_t="srgb",Sr=7680,bd=519,kg=512,zg=513,Hg=514,If=515,Vg=516,Gg=517,Wg=518,$g=519,Xl=35044,wd="300 es",ni=2e3,So=2001;class fs{addEventListener(e,t){this._listeners===void 0&&(this._listeners={});const n=this._listeners;n[e]===void 0&&(n[e]=[]),n[e].indexOf(t)===-1&&n[e].push(t)}hasEventListener(e,t){const n=this._listeners;return n===void 0?!1:n[e]!==void 0&&n[e].indexOf(t)!==-1}removeEventListener(e,t){const n=this._listeners;if(n===void 0)return;const r=n[e];if(r!==void 0){const s=r.indexOf(t);s!==-1&&r.splice(s,1)}}dispatchEvent(e){const t=this._listeners;if(t===void 0)return;const n=t[e.type];if(n!==void 0){e.target=this;const r=n.slice(0);for(let s=0,a=r.length;s<a;s++)r[s].call(this,e);e.target=null}}}const Qt=["00","01","02","03","04","05","06","07","08","09","0a","0b","0c","0d","0e","0f","10","11","12","13","14","15","16","17","18","19","1a","1b","1c","1d","1e","1f","20","21","22","23","24","25","26","27","28","29","2a","2b","2c","2d","2e","2f","30","31","32","33","34","35","36","37","38","39","3a","3b","3c","3d","3e","3f","40","41","42","43","44","45","46","47","48","49","4a","4b","4c","4d","4e","4f","50","51","52","53","54","55","56","57","58","59","5a","5b","5c","5d","5e","5f","60","61","62","63","64","65","66","67","68","69","6a","6b","6c","6d","6e","6f","70","71","72","73","74","75","76","77","78","79","7a","7b","7c","7d","7e","7f","80","81","82","83","84","85","86","87","88","89","8a","8b","8c","8d","8e","8f","90","91","92","93","94","95","96","97","98","99","9a","9b","9c","9d","9e","9f","a0","a1","a2","a3","a4","a5","a6","a7","a8","a9","aa","ab","ac","ad","ae","af","b0","b1","b2","b3","b4","b5","b6","b7","b8","b9","ba","bb","bc","bd","be","bf","c0","c1","c2","c3","c4","c5","c6","c7","c8","c9","ca","cb","cc","cd","ce","cf","d0","d1","d2","d3","d4","d5","d6","d7","d8","d9","da","db","dc","dd","de","df","e0","e1","e2","e3","e4","e5","e6","e7","e8","e9","ea","eb","ec","ed","ee","ef","f0","f1","f2","f3","f4","f5","f6","f7","f8","f9","fa","fb","fc","fd","fe","ff"];let Ed=1234567;const Vs=Math.PI/180,ss=180/Math.PI;function Fn(){const i=Math.random()*4294967295|0,e=Math.random()*4294967295|0,t=Math.random()*4294967295|0,n=Math.random()*4294967295|0;return(Qt[i&255]+Qt[i>>8&255]+Qt[i>>16&255]+Qt[i>>24&255]+"-"+Qt[e&255]+Qt[e>>8&255]+"-"+Qt[e>>16&15|64]+Qt[e>>24&255]+"-"+Qt[t&63|128]+Qt[t>>8&255]+"-"+Qt[t>>16&255]+Qt[t>>24&255]+Qt[n&255]+Qt[n>>8&255]+Qt[n>>16&255]+Qt[n>>24&255]).toLowerCase()}function tt(i,e,t){return Math.max(e,Math.min(t,i))}function Ru(i,e){return(i%e+e)%e}function Xg(i,e,t,n,r){return n+(i-e)*(r-n)/(t-e)}function qg(i,e,t){return i!==e?(t-i)/(e-i):0}function Gs(i,e,t){return(1-t)*i+t*e}function jg(i,e,t,n){return Gs(i,e,1-Math.exp(-t*n))}function Yg(i,e=1){return e-Math.abs(Ru(i,e*2)-e)}function Kg(i,e,t){return i<=e?0:i>=t?1:(i=(i-e)/(t-e),i*i*(3-2*i))}function Zg(i,e,t){return i<=e?0:i>=t?1:(i=(i-e)/(t-e),i*i*i*(i*(i*6-15)+10))}function Jg(i,e){return i+Math.floor(Math.random()*(e-i+1))}function Qg(i,e){return i+Math.random()*(e-i)}function e0(i){return i*(.5-Math.random())}function t0(i){i!==void 0&&(Ed=i);let e=Ed+=1831565813;return e=Math.imul(e^e>>>15,e|1),e^=e+Math.imul(e^e>>>7,e|61),((e^e>>>14)>>>0)/4294967296}function n0(i){return i*Vs}function i0(i){return i*ss}function r0(i){return(i&i-1)===0&&i!==0}function s0(i){return Math.pow(2,Math.ceil(Math.log(i)/Math.LN2))}function a0(i){return Math.pow(2,Math.floor(Math.log(i)/Math.LN2))}function o0(i,e,t,n,r){const s=Math.cos,a=Math.sin,o=s(t/2),c=a(t/2),l=s((e+n)/2),u=a((e+n)/2),d=s((e-n)/2),f=a((e-n)/2),h=s((n-e)/2),m=a((n-e)/2);switch(r){case"XYX":i.set(o*u,c*d,c*f,o*l);break;case"YZY":i.set(c*f,o*u,c*d,o*l);break;case"ZXZ":i.set(c*d,c*f,o*u,o*l);break;case"XZX":i.set(o*u,c*m,c*h,o*l);break;case"YXY":i.set(c*h,o*u,c*m,o*l);break;case"ZYZ":i.set(c*m,c*h,o*u,o*l);break;default:console.warn("THREE.MathUtils: .setQuaternionFromProperEuler() encountered an unknown order: "+r)}}function Vn(i,e){switch(e.constructor){case Float32Array:return i;case Uint32Array:return i/4294967295;case Uint16Array:return i/65535;case Uint8Array:return i/255;case Int32Array:return Math.max(i/2147483647,-1);case Int16Array:return Math.max(i/32767,-1);case Int8Array:return Math.max(i/127,-1);default:throw new Error("Invalid component type.")}}function mt(i,e){switch(e.constructor){case Float32Array:return i;case Uint32Array:return Math.round(i*4294967295);case Uint16Array:return Math.round(i*65535);case Uint8Array:return Math.round(i*255);case Int32Array:return Math.round(i*2147483647);case Int16Array:return Math.round(i*32767);case Int8Array:return Math.round(i*127);default:throw new Error("Invalid component type.")}}const c0={DEG2RAD:Vs,RAD2DEG:ss,generateUUID:Fn,clamp:tt,euclideanModulo:Ru,mapLinear:Xg,inverseLerp:qg,lerp:Gs,damp:jg,pingpong:Yg,smoothstep:Kg,smootherstep:Zg,randInt:Jg,randFloat:Qg,randFloatSpread:e0,seededRandom:t0,degToRad:n0,radToDeg:i0,isPowerOfTwo:r0,ceilPowerOfTwo:s0,floorPowerOfTwo:a0,setQuaternionFromProperEuler:o0,normalize:mt,denormalize:Vn};class ue{constructor(e=0,t=0){ue.prototype.isVector2=!0,this.x=e,this.y=t}get width(){return this.x}set width(e){this.x=e}get height(){return this.y}set height(e){this.y=e}set(e,t){return this.x=e,this.y=t,this}setScalar(e){return this.x=e,this.y=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;default:throw new Error("index is out of range: "+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;default:throw new Error("index is out of range: "+e)}}clone(){return new this.constructor(this.x,this.y)}copy(e){return this.x=e.x,this.y=e.y,this}add(e){return this.x+=e.x,this.y+=e.y,this}addScalar(e){return this.x+=e,this.y+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this}sub(e){return this.x-=e.x,this.y-=e.y,this}subScalar(e){return this.x-=e,this.y-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this}multiply(e){return this.x*=e.x,this.y*=e.y,this}multiplyScalar(e){return this.x*=e,this.y*=e,this}divide(e){return this.x/=e.x,this.y/=e.y,this}divideScalar(e){return this.multiplyScalar(1/e)}applyMatrix3(e){const t=this.x,n=this.y,r=e.elements;return this.x=r[0]*t+r[3]*n+r[6],this.y=r[1]*t+r[4]*n+r[7],this}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this}clamp(e,t){return this.x=tt(this.x,e.x,t.x),this.y=tt(this.y,e.y,t.y),this}clampScalar(e,t){return this.x=tt(this.x,e,t),this.y=tt(this.y,e,t),this}clampLength(e,t){const n=this.length();return this.divideScalar(n||1).multiplyScalar(tt(n,e,t))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this}negate(){return this.x=-this.x,this.y=-this.y,this}dot(e){return this.x*e.x+this.y*e.y}cross(e){return this.x*e.y-this.y*e.x}lengthSq(){return this.x*this.x+this.y*this.y}length(){return Math.sqrt(this.x*this.x+this.y*this.y)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)}normalize(){return this.divideScalar(this.length()||1)}angle(){return Math.atan2(-this.y,-this.x)+Math.PI}angleTo(e){const t=Math.sqrt(this.lengthSq()*e.lengthSq());if(t===0)return Math.PI/2;const n=this.dot(e)/t;return Math.acos(tt(n,-1,1))}distanceTo(e){return Math.sqrt(this.distanceToSquared(e))}distanceToSquared(e){const t=this.x-e.x,n=this.y-e.y;return t*t+n*n}manhattanDistanceTo(e){return Math.abs(this.x-e.x)+Math.abs(this.y-e.y)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this}lerpVectors(e,t,n){return this.x=e.x+(t.x-e.x)*n,this.y=e.y+(t.y-e.y)*n,this}equals(e){return e.x===this.x&&e.y===this.y}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e}fromBufferAttribute(e,t){return this.x=e.getX(t),this.y=e.getY(t),this}rotateAround(e,t){const n=Math.cos(t),r=Math.sin(t),s=this.x-e.x,a=this.y-e.y;return this.x=s*n-a*r+e.x,this.y=s*r+a*n+e.y,this}random(){return this.x=Math.random(),this.y=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y}}class Ji{constructor(e=0,t=0,n=0,r=1){this.isQuaternion=!0,this._x=e,this._y=t,this._z=n,this._w=r}static slerpFlat(e,t,n,r,s,a,o){let c=n[r+0],l=n[r+1],u=n[r+2],d=n[r+3];const f=s[a+0],h=s[a+1],m=s[a+2],v=s[a+3];if(o===0){e[t+0]=c,e[t+1]=l,e[t+2]=u,e[t+3]=d;return}if(o===1){e[t+0]=f,e[t+1]=h,e[t+2]=m,e[t+3]=v;return}if(d!==v||c!==f||l!==h||u!==m){let g=1-o;const p=c*f+l*h+u*m+d*v,_=p>=0?1:-1,y=1-p*p;if(y>Number.EPSILON){const A=Math.sqrt(y),w=Math.atan2(A,p*_);g=Math.sin(g*w)/A,o=Math.sin(o*w)/A}const x=o*_;if(c=c*g+f*x,l=l*g+h*x,u=u*g+m*x,d=d*g+v*x,g===1-o){const A=1/Math.sqrt(c*c+l*l+u*u+d*d);c*=A,l*=A,u*=A,d*=A}}e[t]=c,e[t+1]=l,e[t+2]=u,e[t+3]=d}static multiplyQuaternionsFlat(e,t,n,r,s,a){const o=n[r],c=n[r+1],l=n[r+2],u=n[r+3],d=s[a],f=s[a+1],h=s[a+2],m=s[a+3];return e[t]=o*m+u*d+c*h-l*f,e[t+1]=c*m+u*f+l*d-o*h,e[t+2]=l*m+u*h+o*f-c*d,e[t+3]=u*m-o*d-c*f-l*h,e}get x(){return this._x}set x(e){this._x=e,this._onChangeCallback()}get y(){return this._y}set y(e){this._y=e,this._onChangeCallback()}get z(){return this._z}set z(e){this._z=e,this._onChangeCallback()}get w(){return this._w}set w(e){this._w=e,this._onChangeCallback()}set(e,t,n,r){return this._x=e,this._y=t,this._z=n,this._w=r,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._w)}copy(e){return this._x=e.x,this._y=e.y,this._z=e.z,this._w=e.w,this._onChangeCallback(),this}setFromEuler(e,t=!0){const n=e._x,r=e._y,s=e._z,a=e._order,o=Math.cos,c=Math.sin,l=o(n/2),u=o(r/2),d=o(s/2),f=c(n/2),h=c(r/2),m=c(s/2);switch(a){case"XYZ":this._x=f*u*d+l*h*m,this._y=l*h*d-f*u*m,this._z=l*u*m+f*h*d,this._w=l*u*d-f*h*m;break;case"YXZ":this._x=f*u*d+l*h*m,this._y=l*h*d-f*u*m,this._z=l*u*m-f*h*d,this._w=l*u*d+f*h*m;break;case"ZXY":this._x=f*u*d-l*h*m,this._y=l*h*d+f*u*m,this._z=l*u*m+f*h*d,this._w=l*u*d-f*h*m;break;case"ZYX":this._x=f*u*d-l*h*m,this._y=l*h*d+f*u*m,this._z=l*u*m-f*h*d,this._w=l*u*d+f*h*m;break;case"YZX":this._x=f*u*d+l*h*m,this._y=l*h*d+f*u*m,this._z=l*u*m-f*h*d,this._w=l*u*d-f*h*m;break;case"XZY":this._x=f*u*d-l*h*m,this._y=l*h*d-f*u*m,this._z=l*u*m+f*h*d,this._w=l*u*d+f*h*m;break;default:console.warn("THREE.Quaternion: .setFromEuler() encountered an unknown order: "+a)}return t===!0&&this._onChangeCallback(),this}setFromAxisAngle(e,t){const n=t/2,r=Math.sin(n);return this._x=e.x*r,this._y=e.y*r,this._z=e.z*r,this._w=Math.cos(n),this._onChangeCallback(),this}setFromRotationMatrix(e){const t=e.elements,n=t[0],r=t[4],s=t[8],a=t[1],o=t[5],c=t[9],l=t[2],u=t[6],d=t[10],f=n+o+d;if(f>0){const h=.5/Math.sqrt(f+1);this._w=.25/h,this._x=(u-c)*h,this._y=(s-l)*h,this._z=(a-r)*h}else if(n>o&&n>d){const h=2*Math.sqrt(1+n-o-d);this._w=(u-c)/h,this._x=.25*h,this._y=(r+a)/h,this._z=(s+l)/h}else if(o>d){const h=2*Math.sqrt(1+o-n-d);this._w=(s-l)/h,this._x=(r+a)/h,this._y=.25*h,this._z=(c+u)/h}else{const h=2*Math.sqrt(1+d-n-o);this._w=(a-r)/h,this._x=(s+l)/h,this._y=(c+u)/h,this._z=.25*h}return this._onChangeCallback(),this}setFromUnitVectors(e,t){let n=e.dot(t)+1;return n<1e-8?(n=0,Math.abs(e.x)>Math.abs(e.z)?(this._x=-e.y,this._y=e.x,this._z=0,this._w=n):(this._x=0,this._y=-e.z,this._z=e.y,this._w=n)):(this._x=e.y*t.z-e.z*t.y,this._y=e.z*t.x-e.x*t.z,this._z=e.x*t.y-e.y*t.x,this._w=n),this.normalize()}angleTo(e){return 2*Math.acos(Math.abs(tt(this.dot(e),-1,1)))}rotateTowards(e,t){const n=this.angleTo(e);if(n===0)return this;const r=Math.min(1,t/n);return this.slerp(e,r),this}identity(){return this.set(0,0,0,1)}invert(){return this.conjugate()}conjugate(){return this._x*=-1,this._y*=-1,this._z*=-1,this._onChangeCallback(),this}dot(e){return this._x*e._x+this._y*e._y+this._z*e._z+this._w*e._w}lengthSq(){return this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w}length(){return Math.sqrt(this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w)}normalize(){let e=this.length();return e===0?(this._x=0,this._y=0,this._z=0,this._w=1):(e=1/e,this._x=this._x*e,this._y=this._y*e,this._z=this._z*e,this._w=this._w*e),this._onChangeCallback(),this}multiply(e){return this.multiplyQuaternions(this,e)}premultiply(e){return this.multiplyQuaternions(e,this)}multiplyQuaternions(e,t){const n=e._x,r=e._y,s=e._z,a=e._w,o=t._x,c=t._y,l=t._z,u=t._w;return this._x=n*u+a*o+r*l-s*c,this._y=r*u+a*c+s*o-n*l,this._z=s*u+a*l+n*c-r*o,this._w=a*u-n*o-r*c-s*l,this._onChangeCallback(),this}slerp(e,t){if(t===0)return this;if(t===1)return this.copy(e);const n=this._x,r=this._y,s=this._z,a=this._w;let o=a*e._w+n*e._x+r*e._y+s*e._z;if(o<0?(this._w=-e._w,this._x=-e._x,this._y=-e._y,this._z=-e._z,o=-o):this.copy(e),o>=1)return this._w=a,this._x=n,this._y=r,this._z=s,this;const c=1-o*o;if(c<=Number.EPSILON){const h=1-t;return this._w=h*a+t*this._w,this._x=h*n+t*this._x,this._y=h*r+t*this._y,this._z=h*s+t*this._z,this.normalize(),this}const l=Math.sqrt(c),u=Math.atan2(l,o),d=Math.sin((1-t)*u)/l,f=Math.sin(t*u)/l;return this._w=a*d+this._w*f,this._x=n*d+this._x*f,this._y=r*d+this._y*f,this._z=s*d+this._z*f,this._onChangeCallback(),this}slerpQuaternions(e,t,n){return this.copy(e).slerp(t,n)}random(){const e=2*Math.PI*Math.random(),t=2*Math.PI*Math.random(),n=Math.random(),r=Math.sqrt(1-n),s=Math.sqrt(n);return this.set(r*Math.sin(e),r*Math.cos(e),s*Math.sin(t),s*Math.cos(t))}equals(e){return e._x===this._x&&e._y===this._y&&e._z===this._z&&e._w===this._w}fromArray(e,t=0){return this._x=e[t],this._y=e[t+1],this._z=e[t+2],this._w=e[t+3],this._onChangeCallback(),this}toArray(e=[],t=0){return e[t]=this._x,e[t+1]=this._y,e[t+2]=this._z,e[t+3]=this._w,e}fromBufferAttribute(e,t){return this._x=e.getX(t),this._y=e.getY(t),this._z=e.getZ(t),this._w=e.getW(t),this._onChangeCallback(),this}toJSON(){return this.toArray()}_onChange(e){return this._onChangeCallback=e,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._w}}class P{constructor(e=0,t=0,n=0){P.prototype.isVector3=!0,this.x=e,this.y=t,this.z=n}set(e,t,n){return n===void 0&&(n=this.z),this.x=e,this.y=t,this.z=n,this}setScalar(e){return this.x=e,this.y=e,this.z=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setZ(e){return this.z=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;case 2:this.z=t;break;default:throw new Error("index is out of range: "+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;case 2:return this.z;default:throw new Error("index is out of range: "+e)}}clone(){return new this.constructor(this.x,this.y,this.z)}copy(e){return this.x=e.x,this.y=e.y,this.z=e.z,this}add(e){return this.x+=e.x,this.y+=e.y,this.z+=e.z,this}addScalar(e){return this.x+=e,this.y+=e,this.z+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this.z=e.z+t.z,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this.z+=e.z*t,this}sub(e){return this.x-=e.x,this.y-=e.y,this.z-=e.z,this}subScalar(e){return this.x-=e,this.y-=e,this.z-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this.z=e.z-t.z,this}multiply(e){return this.x*=e.x,this.y*=e.y,this.z*=e.z,this}multiplyScalar(e){return this.x*=e,this.y*=e,this.z*=e,this}multiplyVectors(e,t){return this.x=e.x*t.x,this.y=e.y*t.y,this.z=e.z*t.z,this}applyEuler(e){return this.applyQuaternion(Td.setFromEuler(e))}applyAxisAngle(e,t){return this.applyQuaternion(Td.setFromAxisAngle(e,t))}applyMatrix3(e){const t=this.x,n=this.y,r=this.z,s=e.elements;return this.x=s[0]*t+s[3]*n+s[6]*r,this.y=s[1]*t+s[4]*n+s[7]*r,this.z=s[2]*t+s[5]*n+s[8]*r,this}applyNormalMatrix(e){return this.applyMatrix3(e).normalize()}applyMatrix4(e){const t=this.x,n=this.y,r=this.z,s=e.elements,a=1/(s[3]*t+s[7]*n+s[11]*r+s[15]);return this.x=(s[0]*t+s[4]*n+s[8]*r+s[12])*a,this.y=(s[1]*t+s[5]*n+s[9]*r+s[13])*a,this.z=(s[2]*t+s[6]*n+s[10]*r+s[14])*a,this}applyQuaternion(e){const t=this.x,n=this.y,r=this.z,s=e.x,a=e.y,o=e.z,c=e.w,l=2*(a*r-o*n),u=2*(o*t-s*r),d=2*(s*n-a*t);return this.x=t+c*l+a*d-o*u,this.y=n+c*u+o*l-s*d,this.z=r+c*d+s*u-a*l,this}project(e){return this.applyMatrix4(e.matrixWorldInverse).applyMatrix4(e.projectionMatrix)}unproject(e){return this.applyMatrix4(e.projectionMatrixInverse).applyMatrix4(e.matrixWorld)}transformDirection(e){const t=this.x,n=this.y,r=this.z,s=e.elements;return this.x=s[0]*t+s[4]*n+s[8]*r,this.y=s[1]*t+s[5]*n+s[9]*r,this.z=s[2]*t+s[6]*n+s[10]*r,this.normalize()}divide(e){return this.x/=e.x,this.y/=e.y,this.z/=e.z,this}divideScalar(e){return this.multiplyScalar(1/e)}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this.z=Math.min(this.z,e.z),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this.z=Math.max(this.z,e.z),this}clamp(e,t){return this.x=tt(this.x,e.x,t.x),this.y=tt(this.y,e.y,t.y),this.z=tt(this.z,e.z,t.z),this}clampScalar(e,t){return this.x=tt(this.x,e,t),this.y=tt(this.y,e,t),this.z=tt(this.z,e,t),this}clampLength(e,t){const n=this.length();return this.divideScalar(n||1).multiplyScalar(tt(n,e,t))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this}dot(e){return this.x*e.x+this.y*e.y+this.z*e.z}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)}normalize(){return this.divideScalar(this.length()||1)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this.z+=(e.z-this.z)*t,this}lerpVectors(e,t,n){return this.x=e.x+(t.x-e.x)*n,this.y=e.y+(t.y-e.y)*n,this.z=e.z+(t.z-e.z)*n,this}cross(e){return this.crossVectors(this,e)}crossVectors(e,t){const n=e.x,r=e.y,s=e.z,a=t.x,o=t.y,c=t.z;return this.x=r*c-s*o,this.y=s*a-n*c,this.z=n*o-r*a,this}projectOnVector(e){const t=e.lengthSq();if(t===0)return this.set(0,0,0);const n=e.dot(this)/t;return this.copy(e).multiplyScalar(n)}projectOnPlane(e){return oc.copy(this).projectOnVector(e),this.sub(oc)}reflect(e){return this.sub(oc.copy(e).multiplyScalar(2*this.dot(e)))}angleTo(e){const t=Math.sqrt(this.lengthSq()*e.lengthSq());if(t===0)return Math.PI/2;const n=this.dot(e)/t;return Math.acos(tt(n,-1,1))}distanceTo(e){return Math.sqrt(this.distanceToSquared(e))}distanceToSquared(e){const t=this.x-e.x,n=this.y-e.y,r=this.z-e.z;return t*t+n*n+r*r}manhattanDistanceTo(e){return Math.abs(this.x-e.x)+Math.abs(this.y-e.y)+Math.abs(this.z-e.z)}setFromSpherical(e){return this.setFromSphericalCoords(e.radius,e.phi,e.theta)}setFromSphericalCoords(e,t,n){const r=Math.sin(t)*e;return this.x=r*Math.sin(n),this.y=Math.cos(t)*e,this.z=r*Math.cos(n),this}setFromCylindrical(e){return this.setFromCylindricalCoords(e.radius,e.theta,e.y)}setFromCylindricalCoords(e,t,n){return this.x=e*Math.sin(t),this.y=n,this.z=e*Math.cos(t),this}setFromMatrixPosition(e){const t=e.elements;return this.x=t[12],this.y=t[13],this.z=t[14],this}setFromMatrixScale(e){const t=this.setFromMatrixColumn(e,0).length(),n=this.setFromMatrixColumn(e,1).length(),r=this.setFromMatrixColumn(e,2).length();return this.x=t,this.y=n,this.z=r,this}setFromMatrixColumn(e,t){return this.fromArray(e.elements,t*4)}setFromMatrix3Column(e,t){return this.fromArray(e.elements,t*3)}setFromEuler(e){return this.x=e._x,this.y=e._y,this.z=e._z,this}setFromColor(e){return this.x=e.r,this.y=e.g,this.z=e.b,this}equals(e){return e.x===this.x&&e.y===this.y&&e.z===this.z}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this.z=e[t+2],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e[t+2]=this.z,e}fromBufferAttribute(e,t){return this.x=e.getX(t),this.y=e.getY(t),this.z=e.getZ(t),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this}randomDirection(){const e=Math.random()*Math.PI*2,t=Math.random()*2-1,n=Math.sqrt(1-t*t);return this.x=n*Math.cos(e),this.y=t,this.z=n*Math.sin(e),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z}}const oc=new P,Td=new Ji;class Qe{constructor(e,t,n,r,s,a,o,c,l){Qe.prototype.isMatrix3=!0,this.elements=[1,0,0,0,1,0,0,0,1],e!==void 0&&this.set(e,t,n,r,s,a,o,c,l)}set(e,t,n,r,s,a,o,c,l){const u=this.elements;return u[0]=e,u[1]=r,u[2]=o,u[3]=t,u[4]=s,u[5]=c,u[6]=n,u[7]=a,u[8]=l,this}identity(){return this.set(1,0,0,0,1,0,0,0,1),this}copy(e){const t=this.elements,n=e.elements;return t[0]=n[0],t[1]=n[1],t[2]=n[2],t[3]=n[3],t[4]=n[4],t[5]=n[5],t[6]=n[6],t[7]=n[7],t[8]=n[8],this}extractBasis(e,t,n){return e.setFromMatrix3Column(this,0),t.setFromMatrix3Column(this,1),n.setFromMatrix3Column(this,2),this}setFromMatrix4(e){const t=e.elements;return this.set(t[0],t[4],t[8],t[1],t[5],t[9],t[2],t[6],t[10]),this}multiply(e){return this.multiplyMatrices(this,e)}premultiply(e){return this.multiplyMatrices(e,this)}multiplyMatrices(e,t){const n=e.elements,r=t.elements,s=this.elements,a=n[0],o=n[3],c=n[6],l=n[1],u=n[4],d=n[7],f=n[2],h=n[5],m=n[8],v=r[0],g=r[3],p=r[6],_=r[1],y=r[4],x=r[7],A=r[2],w=r[5],R=r[8];return s[0]=a*v+o*_+c*A,s[3]=a*g+o*y+c*w,s[6]=a*p+o*x+c*R,s[1]=l*v+u*_+d*A,s[4]=l*g+u*y+d*w,s[7]=l*p+u*x+d*R,s[2]=f*v+h*_+m*A,s[5]=f*g+h*y+m*w,s[8]=f*p+h*x+m*R,this}multiplyScalar(e){const t=this.elements;return t[0]*=e,t[3]*=e,t[6]*=e,t[1]*=e,t[4]*=e,t[7]*=e,t[2]*=e,t[5]*=e,t[8]*=e,this}determinant(){const e=this.elements,t=e[0],n=e[1],r=e[2],s=e[3],a=e[4],o=e[5],c=e[6],l=e[7],u=e[8];return t*a*u-t*o*l-n*s*u+n*o*c+r*s*l-r*a*c}invert(){const e=this.elements,t=e[0],n=e[1],r=e[2],s=e[3],a=e[4],o=e[5],c=e[6],l=e[7],u=e[8],d=u*a-o*l,f=o*c-u*s,h=l*s-a*c,m=t*d+n*f+r*h;if(m===0)return this.set(0,0,0,0,0,0,0,0,0);const v=1/m;return e[0]=d*v,e[1]=(r*l-u*n)*v,e[2]=(o*n-r*a)*v,e[3]=f*v,e[4]=(u*t-r*c)*v,e[5]=(r*s-o*t)*v,e[6]=h*v,e[7]=(n*c-l*t)*v,e[8]=(a*t-n*s)*v,this}transpose(){let e;const t=this.elements;return e=t[1],t[1]=t[3],t[3]=e,e=t[2],t[2]=t[6],t[6]=e,e=t[5],t[5]=t[7],t[7]=e,this}getNormalMatrix(e){return this.setFromMatrix4(e).invert().transpose()}transposeIntoArray(e){const t=this.elements;return e[0]=t[0],e[1]=t[3],e[2]=t[6],e[3]=t[1],e[4]=t[4],e[5]=t[7],e[6]=t[2],e[7]=t[5],e[8]=t[8],this}setUvTransform(e,t,n,r,s,a,o){const c=Math.cos(s),l=Math.sin(s);return this.set(n*c,n*l,-n*(c*a+l*o)+a+e,-r*l,r*c,-r*(-l*a+c*o)+o+t,0,0,1),this}scale(e,t){return this.premultiply(cc.makeScale(e,t)),this}rotate(e){return this.premultiply(cc.makeRotation(-e)),this}translate(e,t){return this.premultiply(cc.makeTranslation(e,t)),this}makeTranslation(e,t){return e.isVector2?this.set(1,0,e.x,0,1,e.y,0,0,1):this.set(1,0,e,0,1,t,0,0,1),this}makeRotation(e){const t=Math.cos(e),n=Math.sin(e);return this.set(t,-n,0,n,t,0,0,0,1),this}makeScale(e,t){return this.set(e,0,0,0,t,0,0,0,1),this}equals(e){const t=this.elements,n=e.elements;for(let r=0;r<9;r++)if(t[r]!==n[r])return!1;return!0}fromArray(e,t=0){for(let n=0;n<9;n++)this.elements[n]=e[n+t];return this}toArray(e=[],t=0){const n=this.elements;return e[t]=n[0],e[t+1]=n[1],e[t+2]=n[2],e[t+3]=n[3],e[t+4]=n[4],e[t+5]=n[5],e[t+6]=n[6],e[t+7]=n[7],e[t+8]=n[8],e}clone(){return new this.constructor().fromArray(this.elements)}}const cc=new Qe;function Df(i){for(let e=i.length-1;e>=0;--e)if(i[e]>=65535)return!0;return!1}function ra(i){return document.createElementNS("http://www.w3.org/1999/xhtml",i)}function l0(){const i=ra("canvas");return i.style.display="block",i}const Ad={};function sa(i){i in Ad||(Ad[i]=!0,console.warn(i))}function u0(i,e,t){return new Promise(function(n,r){function s(){switch(i.clientWaitSync(e,i.SYNC_FLUSH_COMMANDS_BIT,0)){case i.WAIT_FAILED:r();break;case i.TIMEOUT_EXPIRED:setTimeout(s,t);break;default:n()}}setTimeout(s,t)})}const Rd=new Qe().set(.4123908,.3575843,.1804808,.212639,.7151687,.0721923,.0193308,.1191948,.9505322),Cd=new Qe().set(3.2409699,-1.5373832,-.4986108,-.9692436,1.8759675,.0415551,.0556301,-.203977,1.0569715);function d0(){const i={enabled:!0,workingColorSpace:fn,spaces:{},convert:function(r,s,a){return this.enabled===!1||s===a||!s||!a||(this.spaces[s].transfer===_t&&(r.r=Ti(r.r),r.g=Ti(r.g),r.b=Ti(r.b)),this.spaces[s].primaries!==this.spaces[a].primaries&&(r.applyMatrix3(this.spaces[s].toXYZ),r.applyMatrix3(this.spaces[a].fromXYZ)),this.spaces[a].transfer===_t&&(r.r=Jr(r.r),r.g=Jr(r.g),r.b=Jr(r.b))),r},workingToColorSpace:function(r,s){return this.convert(r,this.workingColorSpace,s)},colorSpaceToWorking:function(r,s){return this.convert(r,s,this.workingColorSpace)},getPrimaries:function(r){return this.spaces[r].primaries},getTransfer:function(r){return r===zi?Mo:this.spaces[r].transfer},getToneMappingMode:function(r){return this.spaces[r].outputColorSpaceConfig.toneMappingMode||"standard"},getLuminanceCoefficients:function(r,s=this.workingColorSpace){return r.fromArray(this.spaces[s].luminanceCoefficients)},define:function(r){Object.assign(this.spaces,r)},_getMatrix:function(r,s,a){return r.copy(this.spaces[s].toXYZ).multiply(this.spaces[a].fromXYZ)},_getDrawingBufferColorSpace:function(r){return this.spaces[r].outputColorSpaceConfig.drawingBufferColorSpace},_getUnpackColorSpace:function(r=this.workingColorSpace){return this.spaces[r].workingColorSpaceConfig.unpackColorSpace},fromWorkingColorSpace:function(r,s){return sa("THREE.ColorManagement: .fromWorkingColorSpace() has been renamed to .workingToColorSpace()."),i.workingToColorSpace(r,s)},toWorkingColorSpace:function(r,s){return sa("THREE.ColorManagement: .toWorkingColorSpace() has been renamed to .colorSpaceToWorking()."),i.colorSpaceToWorking(r,s)}},e=[.64,.33,.3,.6,.15,.06],t=[.2126,.7152,.0722],n=[.3127,.329];return i.define({[fn]:{primaries:e,whitePoint:n,transfer:Mo,toXYZ:Rd,fromXYZ:Cd,luminanceCoefficients:t,workingColorSpaceConfig:{unpackColorSpace:Bt},outputColorSpaceConfig:{drawingBufferColorSpace:Bt}},[Bt]:{primaries:e,whitePoint:n,transfer:_t,toXYZ:Rd,fromXYZ:Cd,luminanceCoefficients:t,outputColorSpaceConfig:{drawingBufferColorSpace:Bt}}}),i}const at=d0();function Ti(i){return i<.04045?i*.0773993808:Math.pow(i*.9478672986+.0521327014,2.4)}function Jr(i){return i<.0031308?i*12.92:1.055*Math.pow(i,.41666)-.055}let br;class h0{static getDataURL(e,t="image/png"){if(/^data:/i.test(e.src)||typeof HTMLCanvasElement>"u")return e.src;let n;if(e instanceof HTMLCanvasElement)n=e;else{br===void 0&&(br=ra("canvas")),br.width=e.width,br.height=e.height;const r=br.getContext("2d");e instanceof ImageData?r.putImageData(e,0,0):r.drawImage(e,0,0,e.width,e.height),n=br}return n.toDataURL(t)}static sRGBToLinear(e){if(typeof HTMLImageElement<"u"&&e instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&e instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&e instanceof ImageBitmap){const t=ra("canvas");t.width=e.width,t.height=e.height;const n=t.getContext("2d");n.drawImage(e,0,0,e.width,e.height);const r=n.getImageData(0,0,e.width,e.height),s=r.data;for(let a=0;a<s.length;a++)s[a]=Ti(s[a]/255)*255;return n.putImageData(r,0,0),t}else if(e.data){const t=e.data.slice(0);for(let n=0;n<t.length;n++)t instanceof Uint8Array||t instanceof Uint8ClampedArray?t[n]=Math.floor(Ti(t[n]/255)*255):t[n]=Ti(t[n]);return{data:t,width:e.width,height:e.height}}else return console.warn("THREE.ImageUtils.sRGBToLinear(): Unsupported image type. No color space conversion applied."),e}}let f0=0;class Cu{constructor(e=null){this.isSource=!0,Object.defineProperty(this,"id",{value:f0++}),this.uuid=Fn(),this.data=e,this.dataReady=!0,this.version=0}getSize(e){const t=this.data;return typeof HTMLVideoElement<"u"&&t instanceof HTMLVideoElement?e.set(t.videoWidth,t.videoHeight,0):t instanceof VideoFrame?e.set(t.displayHeight,t.displayWidth,0):t!==null?e.set(t.width,t.height,t.depth||0):e.set(0,0,0),e}set needsUpdate(e){e===!0&&this.version++}toJSON(e){const t=e===void 0||typeof e=="string";if(!t&&e.images[this.uuid]!==void 0)return e.images[this.uuid];const n={uuid:this.uuid,url:""},r=this.data;if(r!==null){let s;if(Array.isArray(r)){s=[];for(let a=0,o=r.length;a<o;a++)r[a].isDataTexture?s.push(lc(r[a].image)):s.push(lc(r[a]))}else s=lc(r);n.url=s}return t||(e.images[this.uuid]=n),n}}function lc(i){return typeof HTMLImageElement<"u"&&i instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&i instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&i instanceof ImageBitmap?h0.getDataURL(i):i.data?{data:Array.from(i.data),width:i.width,height:i.height,type:i.data.constructor.name}:(console.warn("THREE.Texture: Unable to serialize Texture."),{})}let p0=0;const uc=new P;class Vt extends fs{constructor(e=Vt.DEFAULT_IMAGE,t=Vt.DEFAULT_MAPPING,n=Hi,r=Hi,s=En,a=Si,o=Un,c=ai,l=Vt.DEFAULT_ANISOTROPY,u=zi){super(),this.isTexture=!0,Object.defineProperty(this,"id",{value:p0++}),this.uuid=Fn(),this.name="",this.source=new Cu(e),this.mipmaps=[],this.mapping=t,this.channel=0,this.wrapS=n,this.wrapT=r,this.magFilter=s,this.minFilter=a,this.anisotropy=l,this.format=o,this.internalFormat=null,this.type=c,this.offset=new ue(0,0),this.repeat=new ue(1,1),this.center=new ue(0,0),this.rotation=0,this.matrixAutoUpdate=!0,this.matrix=new Qe,this.generateMipmaps=!0,this.premultiplyAlpha=!1,this.flipY=!0,this.unpackAlignment=4,this.colorSpace=u,this.userData={},this.updateRanges=[],this.version=0,this.onUpdate=null,this.renderTarget=null,this.isRenderTargetTexture=!1,this.isArrayTexture=!!(e&&e.depth&&e.depth>1),this.pmremVersion=0}get width(){return this.source.getSize(uc).x}get height(){return this.source.getSize(uc).y}get depth(){return this.source.getSize(uc).z}get image(){return this.source.data}set image(e=null){this.source.data=e}updateMatrix(){this.matrix.setUvTransform(this.offset.x,this.offset.y,this.repeat.x,this.repeat.y,this.rotation,this.center.x,this.center.y)}addUpdateRange(e,t){this.updateRanges.push({start:e,count:t})}clearUpdateRanges(){this.updateRanges.length=0}clone(){return new this.constructor().copy(this)}copy(e){return this.name=e.name,this.source=e.source,this.mipmaps=e.mipmaps.slice(0),this.mapping=e.mapping,this.channel=e.channel,this.wrapS=e.wrapS,this.wrapT=e.wrapT,this.magFilter=e.magFilter,this.minFilter=e.minFilter,this.anisotropy=e.anisotropy,this.format=e.format,this.internalFormat=e.internalFormat,this.type=e.type,this.offset.copy(e.offset),this.repeat.copy(e.repeat),this.center.copy(e.center),this.rotation=e.rotation,this.matrixAutoUpdate=e.matrixAutoUpdate,this.matrix.copy(e.matrix),this.generateMipmaps=e.generateMipmaps,this.premultiplyAlpha=e.premultiplyAlpha,this.flipY=e.flipY,this.unpackAlignment=e.unpackAlignment,this.colorSpace=e.colorSpace,this.renderTarget=e.renderTarget,this.isRenderTargetTexture=e.isRenderTargetTexture,this.isArrayTexture=e.isArrayTexture,this.userData=JSON.parse(JSON.stringify(e.userData)),this.needsUpdate=!0,this}setValues(e){for(const t in e){const n=e[t];if(n===void 0){console.warn(`THREE.Texture.setValues(): parameter '${t}' has value of undefined.`);continue}const r=this[t];if(r===void 0){console.warn(`THREE.Texture.setValues(): property '${t}' does not exist.`);continue}r&&n&&r.isVector2&&n.isVector2||r&&n&&r.isVector3&&n.isVector3||r&&n&&r.isMatrix3&&n.isMatrix3?r.copy(n):this[t]=n}}toJSON(e){const t=e===void 0||typeof e=="string";if(!t&&e.textures[this.uuid]!==void 0)return e.textures[this.uuid];const n={metadata:{version:4.7,type:"Texture",generator:"Texture.toJSON"},uuid:this.uuid,name:this.name,image:this.source.toJSON(e).uuid,mapping:this.mapping,channel:this.channel,repeat:[this.repeat.x,this.repeat.y],offset:[this.offset.x,this.offset.y],center:[this.center.x,this.center.y],rotation:this.rotation,wrap:[this.wrapS,this.wrapT],format:this.format,internalFormat:this.internalFormat,type:this.type,colorSpace:this.colorSpace,minFilter:this.minFilter,magFilter:this.magFilter,anisotropy:this.anisotropy,flipY:this.flipY,generateMipmaps:this.generateMipmaps,premultiplyAlpha:this.premultiplyAlpha,unpackAlignment:this.unpackAlignment};return Object.keys(this.userData).length>0&&(n.userData=this.userData),t||(e.textures[this.uuid]=n),n}dispose(){this.dispatchEvent({type:"dispose"})}transformUv(e){if(this.mapping!==Sf)return e;if(e.applyMatrix3(this.matrix),e.x<0||e.x>1)switch(this.wrapS){case rs:e.x=e.x-Math.floor(e.x);break;case Hi:e.x=e.x<0?0:1;break;case xo:Math.abs(Math.floor(e.x)%2)===1?e.x=Math.ceil(e.x)-e.x:e.x=e.x-Math.floor(e.x);break}if(e.y<0||e.y>1)switch(this.wrapT){case rs:e.y=e.y-Math.floor(e.y);break;case Hi:e.y=e.y<0?0:1;break;case xo:Math.abs(Math.floor(e.y)%2)===1?e.y=Math.ceil(e.y)-e.y:e.y=e.y-Math.floor(e.y);break}return this.flipY&&(e.y=1-e.y),e}set needsUpdate(e){e===!0&&(this.version++,this.source.needsUpdate=!0)}set needsPMREMUpdate(e){e===!0&&this.pmremVersion++}}Vt.DEFAULT_IMAGE=null;Vt.DEFAULT_MAPPING=Sf;Vt.DEFAULT_ANISOTROPY=1;class ht{constructor(e=0,t=0,n=0,r=1){ht.prototype.isVector4=!0,this.x=e,this.y=t,this.z=n,this.w=r}get width(){return this.z}set width(e){this.z=e}get height(){return this.w}set height(e){this.w=e}set(e,t,n,r){return this.x=e,this.y=t,this.z=n,this.w=r,this}setScalar(e){return this.x=e,this.y=e,this.z=e,this.w=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setZ(e){return this.z=e,this}setW(e){return this.w=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;case 2:this.z=t;break;case 3:this.w=t;break;default:throw new Error("index is out of range: "+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;case 2:return this.z;case 3:return this.w;default:throw new Error("index is out of range: "+e)}}clone(){return new this.constructor(this.x,this.y,this.z,this.w)}copy(e){return this.x=e.x,this.y=e.y,this.z=e.z,this.w=e.w!==void 0?e.w:1,this}add(e){return this.x+=e.x,this.y+=e.y,this.z+=e.z,this.w+=e.w,this}addScalar(e){return this.x+=e,this.y+=e,this.z+=e,this.w+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this.z=e.z+t.z,this.w=e.w+t.w,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this.z+=e.z*t,this.w+=e.w*t,this}sub(e){return this.x-=e.x,this.y-=e.y,this.z-=e.z,this.w-=e.w,this}subScalar(e){return this.x-=e,this.y-=e,this.z-=e,this.w-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this.z=e.z-t.z,this.w=e.w-t.w,this}multiply(e){return this.x*=e.x,this.y*=e.y,this.z*=e.z,this.w*=e.w,this}multiplyScalar(e){return this.x*=e,this.y*=e,this.z*=e,this.w*=e,this}applyMatrix4(e){const t=this.x,n=this.y,r=this.z,s=this.w,a=e.elements;return this.x=a[0]*t+a[4]*n+a[8]*r+a[12]*s,this.y=a[1]*t+a[5]*n+a[9]*r+a[13]*s,this.z=a[2]*t+a[6]*n+a[10]*r+a[14]*s,this.w=a[3]*t+a[7]*n+a[11]*r+a[15]*s,this}divide(e){return this.x/=e.x,this.y/=e.y,this.z/=e.z,this.w/=e.w,this}divideScalar(e){return this.multiplyScalar(1/e)}setAxisAngleFromQuaternion(e){this.w=2*Math.acos(e.w);const t=Math.sqrt(1-e.w*e.w);return t<1e-4?(this.x=1,this.y=0,this.z=0):(this.x=e.x/t,this.y=e.y/t,this.z=e.z/t),this}setAxisAngleFromRotationMatrix(e){let t,n,r,s;const c=e.elements,l=c[0],u=c[4],d=c[8],f=c[1],h=c[5],m=c[9],v=c[2],g=c[6],p=c[10];if(Math.abs(u-f)<.01&&Math.abs(d-v)<.01&&Math.abs(m-g)<.01){if(Math.abs(u+f)<.1&&Math.abs(d+v)<.1&&Math.abs(m+g)<.1&&Math.abs(l+h+p-3)<.1)return this.set(1,0,0,0),this;t=Math.PI;const y=(l+1)/2,x=(h+1)/2,A=(p+1)/2,w=(u+f)/4,R=(d+v)/4,C=(m+g)/4;return y>x&&y>A?y<.01?(n=0,r=.707106781,s=.707106781):(n=Math.sqrt(y),r=w/n,s=R/n):x>A?x<.01?(n=.707106781,r=0,s=.707106781):(r=Math.sqrt(x),n=w/r,s=C/r):A<.01?(n=.707106781,r=.707106781,s=0):(s=Math.sqrt(A),n=R/s,r=C/s),this.set(n,r,s,t),this}let _=Math.sqrt((g-m)*(g-m)+(d-v)*(d-v)+(f-u)*(f-u));return Math.abs(_)<.001&&(_=1),this.x=(g-m)/_,this.y=(d-v)/_,this.z=(f-u)/_,this.w=Math.acos((l+h+p-1)/2),this}setFromMatrixPosition(e){const t=e.elements;return this.x=t[12],this.y=t[13],this.z=t[14],this.w=t[15],this}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this.z=Math.min(this.z,e.z),this.w=Math.min(this.w,e.w),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this.z=Math.max(this.z,e.z),this.w=Math.max(this.w,e.w),this}clamp(e,t){return this.x=tt(this.x,e.x,t.x),this.y=tt(this.y,e.y,t.y),this.z=tt(this.z,e.z,t.z),this.w=tt(this.w,e.w,t.w),this}clampScalar(e,t){return this.x=tt(this.x,e,t),this.y=tt(this.y,e,t),this.z=tt(this.z,e,t),this.w=tt(this.w,e,t),this}clampLength(e,t){const n=this.length();return this.divideScalar(n||1).multiplyScalar(tt(n,e,t))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this.w=Math.floor(this.w),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this.w=Math.ceil(this.w),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this.w=Math.round(this.w),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this.w=Math.trunc(this.w),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this.w=-this.w,this}dot(e){return this.x*e.x+this.y*e.y+this.z*e.z+this.w*e.w}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)+Math.abs(this.w)}normalize(){return this.divideScalar(this.length()||1)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this.z+=(e.z-this.z)*t,this.w+=(e.w-this.w)*t,this}lerpVectors(e,t,n){return this.x=e.x+(t.x-e.x)*n,this.y=e.y+(t.y-e.y)*n,this.z=e.z+(t.z-e.z)*n,this.w=e.w+(t.w-e.w)*n,this}equals(e){return e.x===this.x&&e.y===this.y&&e.z===this.z&&e.w===this.w}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this.z=e[t+2],this.w=e[t+3],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e[t+2]=this.z,e[t+3]=this.w,e}fromBufferAttribute(e,t){return this.x=e.getX(t),this.y=e.getY(t),this.z=e.getZ(t),this.w=e.getW(t),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this.w=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z,yield this.w}}class m0 extends fs{constructor(e=1,t=1,n={}){super(),n=Object.assign({generateMipmaps:!1,internalFormat:null,minFilter:En,depthBuffer:!0,stencilBuffer:!1,resolveDepthBuffer:!0,resolveStencilBuffer:!0,depthTexture:null,samples:0,count:1,depth:1,multiview:!1},n),this.isRenderTarget=!0,this.width=e,this.height=t,this.depth=n.depth,this.scissor=new ht(0,0,e,t),this.scissorTest=!1,this.viewport=new ht(0,0,e,t);const r={width:e,height:t,depth:n.depth},s=new Vt(r);this.textures=[];const a=n.count;for(let o=0;o<a;o++)this.textures[o]=s.clone(),this.textures[o].isRenderTargetTexture=!0,this.textures[o].renderTarget=this;this._setTextureOptions(n),this.depthBuffer=n.depthBuffer,this.stencilBuffer=n.stencilBuffer,this.resolveDepthBuffer=n.resolveDepthBuffer,this.resolveStencilBuffer=n.resolveStencilBuffer,this._depthTexture=null,this.depthTexture=n.depthTexture,this.samples=n.samples,this.multiview=n.multiview}_setTextureOptions(e={}){const t={minFilter:En,generateMipmaps:!1,flipY:!1,internalFormat:null};e.mapping!==void 0&&(t.mapping=e.mapping),e.wrapS!==void 0&&(t.wrapS=e.wrapS),e.wrapT!==void 0&&(t.wrapT=e.wrapT),e.wrapR!==void 0&&(t.wrapR=e.wrapR),e.magFilter!==void 0&&(t.magFilter=e.magFilter),e.minFilter!==void 0&&(t.minFilter=e.minFilter),e.format!==void 0&&(t.format=e.format),e.type!==void 0&&(t.type=e.type),e.anisotropy!==void 0&&(t.anisotropy=e.anisotropy),e.colorSpace!==void 0&&(t.colorSpace=e.colorSpace),e.flipY!==void 0&&(t.flipY=e.flipY),e.generateMipmaps!==void 0&&(t.generateMipmaps=e.generateMipmaps),e.internalFormat!==void 0&&(t.internalFormat=e.internalFormat);for(let n=0;n<this.textures.length;n++)this.textures[n].setValues(t)}get texture(){return this.textures[0]}set texture(e){this.textures[0]=e}set depthTexture(e){this._depthTexture!==null&&(this._depthTexture.renderTarget=null),e!==null&&(e.renderTarget=this),this._depthTexture=e}get depthTexture(){return this._depthTexture}setSize(e,t,n=1){if(this.width!==e||this.height!==t||this.depth!==n){this.width=e,this.height=t,this.depth=n;for(let r=0,s=this.textures.length;r<s;r++)this.textures[r].image.width=e,this.textures[r].image.height=t,this.textures[r].image.depth=n,this.textures[r].isArrayTexture=this.textures[r].image.depth>1;this.dispose()}this.viewport.set(0,0,e,t),this.scissor.set(0,0,e,t)}clone(){return new this.constructor().copy(this)}copy(e){this.width=e.width,this.height=e.height,this.depth=e.depth,this.scissor.copy(e.scissor),this.scissorTest=e.scissorTest,this.viewport.copy(e.viewport),this.textures.length=0;for(let t=0,n=e.textures.length;t<n;t++){this.textures[t]=e.textures[t].clone(),this.textures[t].isRenderTargetTexture=!0,this.textures[t].renderTarget=this;const r=Object.assign({},e.textures[t].image);this.textures[t].source=new Cu(r)}return this.depthBuffer=e.depthBuffer,this.stencilBuffer=e.stencilBuffer,this.resolveDepthBuffer=e.resolveDepthBuffer,this.resolveStencilBuffer=e.resolveStencilBuffer,e.depthTexture!==null&&(this.depthTexture=e.depthTexture.clone()),this.samples=e.samples,this}dispose(){this.dispatchEvent({type:"dispose"})}}class _r extends m0{constructor(e=1,t=1,n={}){super(e,t,n),this.isWebGLRenderTarget=!0}}class Nf extends Vt{constructor(e=null,t=1,n=1,r=1){super(null),this.isDataArrayTexture=!0,this.image={data:e,width:t,height:n,depth:r},this.magFilter=dn,this.minFilter=dn,this.wrapR=Hi,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1,this.layerUpdates=new Set}addLayerUpdate(e){this.layerUpdates.add(e)}clearLayerUpdates(){this.layerUpdates.clear()}}class g0 extends Vt{constructor(e=null,t=1,n=1,r=1){super(null),this.isData3DTexture=!0,this.image={data:e,width:t,height:n,depth:r},this.magFilter=dn,this.minFilter=dn,this.wrapR=Hi,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}}class oi{constructor(e=new P(1/0,1/0,1/0),t=new P(-1/0,-1/0,-1/0)){this.isBox3=!0,this.min=e,this.max=t}set(e,t){return this.min.copy(e),this.max.copy(t),this}setFromArray(e){this.makeEmpty();for(let t=0,n=e.length;t<n;t+=3)this.expandByPoint(kn.fromArray(e,t));return this}setFromBufferAttribute(e){this.makeEmpty();for(let t=0,n=e.count;t<n;t++)this.expandByPoint(kn.fromBufferAttribute(e,t));return this}setFromPoints(e){this.makeEmpty();for(let t=0,n=e.length;t<n;t++)this.expandByPoint(e[t]);return this}setFromCenterAndSize(e,t){const n=kn.copy(t).multiplyScalar(.5);return this.min.copy(e).sub(n),this.max.copy(e).add(n),this}setFromObject(e,t=!1){return this.makeEmpty(),this.expandByObject(e,t)}clone(){return new this.constructor().copy(this)}copy(e){return this.min.copy(e.min),this.max.copy(e.max),this}makeEmpty(){return this.min.x=this.min.y=this.min.z=1/0,this.max.x=this.max.y=this.max.z=-1/0,this}isEmpty(){return this.max.x<this.min.x||this.max.y<this.min.y||this.max.z<this.min.z}getCenter(e){return this.isEmpty()?e.set(0,0,0):e.addVectors(this.min,this.max).multiplyScalar(.5)}getSize(e){return this.isEmpty()?e.set(0,0,0):e.subVectors(this.max,this.min)}expandByPoint(e){return this.min.min(e),this.max.max(e),this}expandByVector(e){return this.min.sub(e),this.max.add(e),this}expandByScalar(e){return this.min.addScalar(-e),this.max.addScalar(e),this}expandByObject(e,t=!1){e.updateWorldMatrix(!1,!1);const n=e.geometry;if(n!==void 0){const s=n.getAttribute("position");if(t===!0&&s!==void 0&&e.isInstancedMesh!==!0)for(let a=0,o=s.count;a<o;a++)e.isMesh===!0?e.getVertexPosition(a,kn):kn.fromBufferAttribute(s,a),kn.applyMatrix4(e.matrixWorld),this.expandByPoint(kn);else e.boundingBox!==void 0?(e.boundingBox===null&&e.computeBoundingBox(),wa.copy(e.boundingBox)):(n.boundingBox===null&&n.computeBoundingBox(),wa.copy(n.boundingBox)),wa.applyMatrix4(e.matrixWorld),this.union(wa)}const r=e.children;for(let s=0,a=r.length;s<a;s++)this.expandByObject(r[s],t);return this}containsPoint(e){return e.x>=this.min.x&&e.x<=this.max.x&&e.y>=this.min.y&&e.y<=this.max.y&&e.z>=this.min.z&&e.z<=this.max.z}containsBox(e){return this.min.x<=e.min.x&&e.max.x<=this.max.x&&this.min.y<=e.min.y&&e.max.y<=this.max.y&&this.min.z<=e.min.z&&e.max.z<=this.max.z}getParameter(e,t){return t.set((e.x-this.min.x)/(this.max.x-this.min.x),(e.y-this.min.y)/(this.max.y-this.min.y),(e.z-this.min.z)/(this.max.z-this.min.z))}intersectsBox(e){return e.max.x>=this.min.x&&e.min.x<=this.max.x&&e.max.y>=this.min.y&&e.min.y<=this.max.y&&e.max.z>=this.min.z&&e.min.z<=this.max.z}intersectsSphere(e){return this.clampPoint(e.center,kn),kn.distanceToSquared(e.center)<=e.radius*e.radius}intersectsPlane(e){let t,n;return e.normal.x>0?(t=e.normal.x*this.min.x,n=e.normal.x*this.max.x):(t=e.normal.x*this.max.x,n=e.normal.x*this.min.x),e.normal.y>0?(t+=e.normal.y*this.min.y,n+=e.normal.y*this.max.y):(t+=e.normal.y*this.max.y,n+=e.normal.y*this.min.y),e.normal.z>0?(t+=e.normal.z*this.min.z,n+=e.normal.z*this.max.z):(t+=e.normal.z*this.max.z,n+=e.normal.z*this.min.z),t<=-e.constant&&n>=-e.constant}intersectsTriangle(e){if(this.isEmpty())return!1;this.getCenter(Ss),Ea.subVectors(this.max,Ss),wr.subVectors(e.a,Ss),Er.subVectors(e.b,Ss),Tr.subVectors(e.c,Ss),Li.subVectors(Er,wr),Pi.subVectors(Tr,Er),nr.subVectors(wr,Tr);let t=[0,-Li.z,Li.y,0,-Pi.z,Pi.y,0,-nr.z,nr.y,Li.z,0,-Li.x,Pi.z,0,-Pi.x,nr.z,0,-nr.x,-Li.y,Li.x,0,-Pi.y,Pi.x,0,-nr.y,nr.x,0];return!dc(t,wr,Er,Tr,Ea)||(t=[1,0,0,0,1,0,0,0,1],!dc(t,wr,Er,Tr,Ea))?!1:(Ta.crossVectors(Li,Pi),t=[Ta.x,Ta.y,Ta.z],dc(t,wr,Er,Tr,Ea))}clampPoint(e,t){return t.copy(e).clamp(this.min,this.max)}distanceToPoint(e){return this.clampPoint(e,kn).distanceTo(e)}getBoundingSphere(e){return this.isEmpty()?e.makeEmpty():(this.getCenter(e.center),e.radius=this.getSize(kn).length()*.5),e}intersect(e){return this.min.max(e.min),this.max.min(e.max),this.isEmpty()&&this.makeEmpty(),this}union(e){return this.min.min(e.min),this.max.max(e.max),this}applyMatrix4(e){return this.isEmpty()?this:(hi[0].set(this.min.x,this.min.y,this.min.z).applyMatrix4(e),hi[1].set(this.min.x,this.min.y,this.max.z).applyMatrix4(e),hi[2].set(this.min.x,this.max.y,this.min.z).applyMatrix4(e),hi[3].set(this.min.x,this.max.y,this.max.z).applyMatrix4(e),hi[4].set(this.max.x,this.min.y,this.min.z).applyMatrix4(e),hi[5].set(this.max.x,this.min.y,this.max.z).applyMatrix4(e),hi[6].set(this.max.x,this.max.y,this.min.z).applyMatrix4(e),hi[7].set(this.max.x,this.max.y,this.max.z).applyMatrix4(e),this.setFromPoints(hi),this)}translate(e){return this.min.add(e),this.max.add(e),this}equals(e){return e.min.equals(this.min)&&e.max.equals(this.max)}toJSON(){return{min:this.min.toArray(),max:this.max.toArray()}}fromJSON(e){return this.min.fromArray(e.min),this.max.fromArray(e.max),this}}const hi=[new P,new P,new P,new P,new P,new P,new P,new P],kn=new P,wa=new oi,wr=new P,Er=new P,Tr=new P,Li=new P,Pi=new P,nr=new P,Ss=new P,Ea=new P,Ta=new P,ir=new P;function dc(i,e,t,n,r){for(let s=0,a=i.length-3;s<=a;s+=3){ir.fromArray(i,s);const o=r.x*Math.abs(ir.x)+r.y*Math.abs(ir.y)+r.z*Math.abs(ir.z),c=e.dot(ir),l=t.dot(ir),u=n.dot(ir);if(Math.max(-Math.max(c,l,u),Math.min(c,l,u))>o)return!1}return!0}const v0=new oi,bs=new P,hc=new P;class ci{constructor(e=new P,t=-1){this.isSphere=!0,this.center=e,this.radius=t}set(e,t){return this.center.copy(e),this.radius=t,this}setFromPoints(e,t){const n=this.center;t!==void 0?n.copy(t):v0.setFromPoints(e).getCenter(n);let r=0;for(let s=0,a=e.length;s<a;s++)r=Math.max(r,n.distanceToSquared(e[s]));return this.radius=Math.sqrt(r),this}copy(e){return this.center.copy(e.center),this.radius=e.radius,this}isEmpty(){return this.radius<0}makeEmpty(){return this.center.set(0,0,0),this.radius=-1,this}containsPoint(e){return e.distanceToSquared(this.center)<=this.radius*this.radius}distanceToPoint(e){return e.distanceTo(this.center)-this.radius}intersectsSphere(e){const t=this.radius+e.radius;return e.center.distanceToSquared(this.center)<=t*t}intersectsBox(e){return e.intersectsSphere(this)}intersectsPlane(e){return Math.abs(e.distanceToPoint(this.center))<=this.radius}clampPoint(e,t){const n=this.center.distanceToSquared(e);return t.copy(e),n>this.radius*this.radius&&(t.sub(this.center).normalize(),t.multiplyScalar(this.radius).add(this.center)),t}getBoundingBox(e){return this.isEmpty()?(e.makeEmpty(),e):(e.set(this.center,this.center),e.expandByScalar(this.radius),e)}applyMatrix4(e){return this.center.applyMatrix4(e),this.radius=this.radius*e.getMaxScaleOnAxis(),this}translate(e){return this.center.add(e),this}expandByPoint(e){if(this.isEmpty())return this.center.copy(e),this.radius=0,this;bs.subVectors(e,this.center);const t=bs.lengthSq();if(t>this.radius*this.radius){const n=Math.sqrt(t),r=(n-this.radius)*.5;this.center.addScaledVector(bs,r/n),this.radius+=r}return this}union(e){return e.isEmpty()?this:this.isEmpty()?(this.copy(e),this):(this.center.equals(e.center)===!0?this.radius=Math.max(this.radius,e.radius):(hc.subVectors(e.center,this.center).setLength(e.radius),this.expandByPoint(bs.copy(e.center).add(hc)),this.expandByPoint(bs.copy(e.center).sub(hc))),this)}equals(e){return e.center.equals(this.center)&&e.radius===this.radius}clone(){return new this.constructor().copy(this)}toJSON(){return{radius:this.radius,center:this.center.toArray()}}fromJSON(e){return this.radius=e.radius,this.center.fromArray(e.center),this}}const fi=new P,fc=new P,Aa=new P,Ii=new P,pc=new P,Ra=new P,mc=new P;class No{constructor(e=new P,t=new P(0,0,-1)){this.origin=e,this.direction=t}set(e,t){return this.origin.copy(e),this.direction.copy(t),this}copy(e){return this.origin.copy(e.origin),this.direction.copy(e.direction),this}at(e,t){return t.copy(this.origin).addScaledVector(this.direction,e)}lookAt(e){return this.direction.copy(e).sub(this.origin).normalize(),this}recast(e){return this.origin.copy(this.at(e,fi)),this}closestPointToPoint(e,t){t.subVectors(e,this.origin);const n=t.dot(this.direction);return n<0?t.copy(this.origin):t.copy(this.origin).addScaledVector(this.direction,n)}distanceToPoint(e){return Math.sqrt(this.distanceSqToPoint(e))}distanceSqToPoint(e){const t=fi.subVectors(e,this.origin).dot(this.direction);return t<0?this.origin.distanceToSquared(e):(fi.copy(this.origin).addScaledVector(this.direction,t),fi.distanceToSquared(e))}distanceSqToSegment(e,t,n,r){fc.copy(e).add(t).multiplyScalar(.5),Aa.copy(t).sub(e).normalize(),Ii.copy(this.origin).sub(fc);const s=e.distanceTo(t)*.5,a=-this.direction.dot(Aa),o=Ii.dot(this.direction),c=-Ii.dot(Aa),l=Ii.lengthSq(),u=Math.abs(1-a*a);let d,f,h,m;if(u>0)if(d=a*c-o,f=a*o-c,m=s*u,d>=0)if(f>=-m)if(f<=m){const v=1/u;d*=v,f*=v,h=d*(d+a*f+2*o)+f*(a*d+f+2*c)+l}else f=s,d=Math.max(0,-(a*f+o)),h=-d*d+f*(f+2*c)+l;else f=-s,d=Math.max(0,-(a*f+o)),h=-d*d+f*(f+2*c)+l;else f<=-m?(d=Math.max(0,-(-a*s+o)),f=d>0?-s:Math.min(Math.max(-s,-c),s),h=-d*d+f*(f+2*c)+l):f<=m?(d=0,f=Math.min(Math.max(-s,-c),s),h=f*(f+2*c)+l):(d=Math.max(0,-(a*s+o)),f=d>0?s:Math.min(Math.max(-s,-c),s),h=-d*d+f*(f+2*c)+l);else f=a>0?-s:s,d=Math.max(0,-(a*f+o)),h=-d*d+f*(f+2*c)+l;return n&&n.copy(this.origin).addScaledVector(this.direction,d),r&&r.copy(fc).addScaledVector(Aa,f),h}intersectSphere(e,t){fi.subVectors(e.center,this.origin);const n=fi.dot(this.direction),r=fi.dot(fi)-n*n,s=e.radius*e.radius;if(r>s)return null;const a=Math.sqrt(s-r),o=n-a,c=n+a;return c<0?null:o<0?this.at(c,t):this.at(o,t)}intersectsSphere(e){return e.radius<0?!1:this.distanceSqToPoint(e.center)<=e.radius*e.radius}distanceToPlane(e){const t=e.normal.dot(this.direction);if(t===0)return e.distanceToPoint(this.origin)===0?0:null;const n=-(this.origin.dot(e.normal)+e.constant)/t;return n>=0?n:null}intersectPlane(e,t){const n=this.distanceToPlane(e);return n===null?null:this.at(n,t)}intersectsPlane(e){const t=e.distanceToPoint(this.origin);return t===0||e.normal.dot(this.direction)*t<0}intersectBox(e,t){let n,r,s,a,o,c;const l=1/this.direction.x,u=1/this.direction.y,d=1/this.direction.z,f=this.origin;return l>=0?(n=(e.min.x-f.x)*l,r=(e.max.x-f.x)*l):(n=(e.max.x-f.x)*l,r=(e.min.x-f.x)*l),u>=0?(s=(e.min.y-f.y)*u,a=(e.max.y-f.y)*u):(s=(e.max.y-f.y)*u,a=(e.min.y-f.y)*u),n>a||s>r||((s>n||isNaN(n))&&(n=s),(a<r||isNaN(r))&&(r=a),d>=0?(o=(e.min.z-f.z)*d,c=(e.max.z-f.z)*d):(o=(e.max.z-f.z)*d,c=(e.min.z-f.z)*d),n>c||o>r)||((o>n||n!==n)&&(n=o),(c<r||r!==r)&&(r=c),r<0)?null:this.at(n>=0?n:r,t)}intersectsBox(e){return this.intersectBox(e,fi)!==null}intersectTriangle(e,t,n,r,s){pc.subVectors(t,e),Ra.subVectors(n,e),mc.crossVectors(pc,Ra);let a=this.direction.dot(mc),o;if(a>0){if(r)return null;o=1}else if(a<0)o=-1,a=-a;else return null;Ii.subVectors(this.origin,e);const c=o*this.direction.dot(Ra.crossVectors(Ii,Ra));if(c<0)return null;const l=o*this.direction.dot(pc.cross(Ii));if(l<0||c+l>a)return null;const u=-o*Ii.dot(mc);return u<0?null:this.at(u/a,s)}applyMatrix4(e){return this.origin.applyMatrix4(e),this.direction.transformDirection(e),this}equals(e){return e.origin.equals(this.origin)&&e.direction.equals(this.direction)}clone(){return new this.constructor().copy(this)}}class Ke{constructor(e,t,n,r,s,a,o,c,l,u,d,f,h,m,v,g){Ke.prototype.isMatrix4=!0,this.elements=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1],e!==void 0&&this.set(e,t,n,r,s,a,o,c,l,u,d,f,h,m,v,g)}set(e,t,n,r,s,a,o,c,l,u,d,f,h,m,v,g){const p=this.elements;return p[0]=e,p[4]=t,p[8]=n,p[12]=r,p[1]=s,p[5]=a,p[9]=o,p[13]=c,p[2]=l,p[6]=u,p[10]=d,p[14]=f,p[3]=h,p[7]=m,p[11]=v,p[15]=g,this}identity(){return this.set(1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1),this}clone(){return new Ke().fromArray(this.elements)}copy(e){const t=this.elements,n=e.elements;return t[0]=n[0],t[1]=n[1],t[2]=n[2],t[3]=n[3],t[4]=n[4],t[5]=n[5],t[6]=n[6],t[7]=n[7],t[8]=n[8],t[9]=n[9],t[10]=n[10],t[11]=n[11],t[12]=n[12],t[13]=n[13],t[14]=n[14],t[15]=n[15],this}copyPosition(e){const t=this.elements,n=e.elements;return t[12]=n[12],t[13]=n[13],t[14]=n[14],this}setFromMatrix3(e){const t=e.elements;return this.set(t[0],t[3],t[6],0,t[1],t[4],t[7],0,t[2],t[5],t[8],0,0,0,0,1),this}extractBasis(e,t,n){return e.setFromMatrixColumn(this,0),t.setFromMatrixColumn(this,1),n.setFromMatrixColumn(this,2),this}makeBasis(e,t,n){return this.set(e.x,t.x,n.x,0,e.y,t.y,n.y,0,e.z,t.z,n.z,0,0,0,0,1),this}extractRotation(e){const t=this.elements,n=e.elements,r=1/Ar.setFromMatrixColumn(e,0).length(),s=1/Ar.setFromMatrixColumn(e,1).length(),a=1/Ar.setFromMatrixColumn(e,2).length();return t[0]=n[0]*r,t[1]=n[1]*r,t[2]=n[2]*r,t[3]=0,t[4]=n[4]*s,t[5]=n[5]*s,t[6]=n[6]*s,t[7]=0,t[8]=n[8]*a,t[9]=n[9]*a,t[10]=n[10]*a,t[11]=0,t[12]=0,t[13]=0,t[14]=0,t[15]=1,this}makeRotationFromEuler(e){const t=this.elements,n=e.x,r=e.y,s=e.z,a=Math.cos(n),o=Math.sin(n),c=Math.cos(r),l=Math.sin(r),u=Math.cos(s),d=Math.sin(s);if(e.order==="XYZ"){const f=a*u,h=a*d,m=o*u,v=o*d;t[0]=c*u,t[4]=-c*d,t[8]=l,t[1]=h+m*l,t[5]=f-v*l,t[9]=-o*c,t[2]=v-f*l,t[6]=m+h*l,t[10]=a*c}else if(e.order==="YXZ"){const f=c*u,h=c*d,m=l*u,v=l*d;t[0]=f+v*o,t[4]=m*o-h,t[8]=a*l,t[1]=a*d,t[5]=a*u,t[9]=-o,t[2]=h*o-m,t[6]=v+f*o,t[10]=a*c}else if(e.order==="ZXY"){const f=c*u,h=c*d,m=l*u,v=l*d;t[0]=f-v*o,t[4]=-a*d,t[8]=m+h*o,t[1]=h+m*o,t[5]=a*u,t[9]=v-f*o,t[2]=-a*l,t[6]=o,t[10]=a*c}else if(e.order==="ZYX"){const f=a*u,h=a*d,m=o*u,v=o*d;t[0]=c*u,t[4]=m*l-h,t[8]=f*l+v,t[1]=c*d,t[5]=v*l+f,t[9]=h*l-m,t[2]=-l,t[6]=o*c,t[10]=a*c}else if(e.order==="YZX"){const f=a*c,h=a*l,m=o*c,v=o*l;t[0]=c*u,t[4]=v-f*d,t[8]=m*d+h,t[1]=d,t[5]=a*u,t[9]=-o*u,t[2]=-l*u,t[6]=h*d+m,t[10]=f-v*d}else if(e.order==="XZY"){const f=a*c,h=a*l,m=o*c,v=o*l;t[0]=c*u,t[4]=-d,t[8]=l*u,t[1]=f*d+v,t[5]=a*u,t[9]=h*d-m,t[2]=m*d-h,t[6]=o*u,t[10]=v*d+f}return t[3]=0,t[7]=0,t[11]=0,t[12]=0,t[13]=0,t[14]=0,t[15]=1,this}makeRotationFromQuaternion(e){return this.compose(_0,e,y0)}lookAt(e,t,n){const r=this.elements;return Mn.subVectors(e,t),Mn.lengthSq()===0&&(Mn.z=1),Mn.normalize(),Di.crossVectors(n,Mn),Di.lengthSq()===0&&(Math.abs(n.z)===1?Mn.x+=1e-4:Mn.z+=1e-4,Mn.normalize(),Di.crossVectors(n,Mn)),Di.normalize(),Ca.crossVectors(Mn,Di),r[0]=Di.x,r[4]=Ca.x,r[8]=Mn.x,r[1]=Di.y,r[5]=Ca.y,r[9]=Mn.y,r[2]=Di.z,r[6]=Ca.z,r[10]=Mn.z,this}multiply(e){return this.multiplyMatrices(this,e)}premultiply(e){return this.multiplyMatrices(e,this)}multiplyMatrices(e,t){const n=e.elements,r=t.elements,s=this.elements,a=n[0],o=n[4],c=n[8],l=n[12],u=n[1],d=n[5],f=n[9],h=n[13],m=n[2],v=n[6],g=n[10],p=n[14],_=n[3],y=n[7],x=n[11],A=n[15],w=r[0],R=r[4],C=r[8],S=r[12],b=r[1],L=r[5],D=r[9],k=r[13],H=r[2],X=r[6],V=r[10],K=r[14],G=r[3],se=r[7],me=r[11],_e=r[15];return s[0]=a*w+o*b+c*H+l*G,s[4]=a*R+o*L+c*X+l*se,s[8]=a*C+o*D+c*V+l*me,s[12]=a*S+o*k+c*K+l*_e,s[1]=u*w+d*b+f*H+h*G,s[5]=u*R+d*L+f*X+h*se,s[9]=u*C+d*D+f*V+h*me,s[13]=u*S+d*k+f*K+h*_e,s[2]=m*w+v*b+g*H+p*G,s[6]=m*R+v*L+g*X+p*se,s[10]=m*C+v*D+g*V+p*me,s[14]=m*S+v*k+g*K+p*_e,s[3]=_*w+y*b+x*H+A*G,s[7]=_*R+y*L+x*X+A*se,s[11]=_*C+y*D+x*V+A*me,s[15]=_*S+y*k+x*K+A*_e,this}multiplyScalar(e){const t=this.elements;return t[0]*=e,t[4]*=e,t[8]*=e,t[12]*=e,t[1]*=e,t[5]*=e,t[9]*=e,t[13]*=e,t[2]*=e,t[6]*=e,t[10]*=e,t[14]*=e,t[3]*=e,t[7]*=e,t[11]*=e,t[15]*=e,this}determinant(){const e=this.elements,t=e[0],n=e[4],r=e[8],s=e[12],a=e[1],o=e[5],c=e[9],l=e[13],u=e[2],d=e[6],f=e[10],h=e[14],m=e[3],v=e[7],g=e[11],p=e[15];return m*(+s*c*d-r*l*d-s*o*f+n*l*f+r*o*h-n*c*h)+v*(+t*c*h-t*l*f+s*a*f-r*a*h+r*l*u-s*c*u)+g*(+t*l*d-t*o*h-s*a*d+n*a*h+s*o*u-n*l*u)+p*(-r*o*u-t*c*d+t*o*f+r*a*d-n*a*f+n*c*u)}transpose(){const e=this.elements;let t;return t=e[1],e[1]=e[4],e[4]=t,t=e[2],e[2]=e[8],e[8]=t,t=e[6],e[6]=e[9],e[9]=t,t=e[3],e[3]=e[12],e[12]=t,t=e[7],e[7]=e[13],e[13]=t,t=e[11],e[11]=e[14],e[14]=t,this}setPosition(e,t,n){const r=this.elements;return e.isVector3?(r[12]=e.x,r[13]=e.y,r[14]=e.z):(r[12]=e,r[13]=t,r[14]=n),this}invert(){const e=this.elements,t=e[0],n=e[1],r=e[2],s=e[3],a=e[4],o=e[5],c=e[6],l=e[7],u=e[8],d=e[9],f=e[10],h=e[11],m=e[12],v=e[13],g=e[14],p=e[15],_=d*g*l-v*f*l+v*c*h-o*g*h-d*c*p+o*f*p,y=m*f*l-u*g*l-m*c*h+a*g*h+u*c*p-a*f*p,x=u*v*l-m*d*l+m*o*h-a*v*h-u*o*p+a*d*p,A=m*d*c-u*v*c-m*o*f+a*v*f+u*o*g-a*d*g,w=t*_+n*y+r*x+s*A;if(w===0)return this.set(0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0);const R=1/w;return e[0]=_*R,e[1]=(v*f*s-d*g*s-v*r*h+n*g*h+d*r*p-n*f*p)*R,e[2]=(o*g*s-v*c*s+v*r*l-n*g*l-o*r*p+n*c*p)*R,e[3]=(d*c*s-o*f*s-d*r*l+n*f*l+o*r*h-n*c*h)*R,e[4]=y*R,e[5]=(u*g*s-m*f*s+m*r*h-t*g*h-u*r*p+t*f*p)*R,e[6]=(m*c*s-a*g*s-m*r*l+t*g*l+a*r*p-t*c*p)*R,e[7]=(a*f*s-u*c*s+u*r*l-t*f*l-a*r*h+t*c*h)*R,e[8]=x*R,e[9]=(m*d*s-u*v*s-m*n*h+t*v*h+u*n*p-t*d*p)*R,e[10]=(a*v*s-m*o*s+m*n*l-t*v*l-a*n*p+t*o*p)*R,e[11]=(u*o*s-a*d*s-u*n*l+t*d*l+a*n*h-t*o*h)*R,e[12]=A*R,e[13]=(u*v*r-m*d*r+m*n*f-t*v*f-u*n*g+t*d*g)*R,e[14]=(m*o*r-a*v*r-m*n*c+t*v*c+a*n*g-t*o*g)*R,e[15]=(a*d*r-u*o*r+u*n*c-t*d*c-a*n*f+t*o*f)*R,this}scale(e){const t=this.elements,n=e.x,r=e.y,s=e.z;return t[0]*=n,t[4]*=r,t[8]*=s,t[1]*=n,t[5]*=r,t[9]*=s,t[2]*=n,t[6]*=r,t[10]*=s,t[3]*=n,t[7]*=r,t[11]*=s,this}getMaxScaleOnAxis(){const e=this.elements,t=e[0]*e[0]+e[1]*e[1]+e[2]*e[2],n=e[4]*e[4]+e[5]*e[5]+e[6]*e[6],r=e[8]*e[8]+e[9]*e[9]+e[10]*e[10];return Math.sqrt(Math.max(t,n,r))}makeTranslation(e,t,n){return e.isVector3?this.set(1,0,0,e.x,0,1,0,e.y,0,0,1,e.z,0,0,0,1):this.set(1,0,0,e,0,1,0,t,0,0,1,n,0,0,0,1),this}makeRotationX(e){const t=Math.cos(e),n=Math.sin(e);return this.set(1,0,0,0,0,t,-n,0,0,n,t,0,0,0,0,1),this}makeRotationY(e){const t=Math.cos(e),n=Math.sin(e);return this.set(t,0,n,0,0,1,0,0,-n,0,t,0,0,0,0,1),this}makeRotationZ(e){const t=Math.cos(e),n=Math.sin(e);return this.set(t,-n,0,0,n,t,0,0,0,0,1,0,0,0,0,1),this}makeRotationAxis(e,t){const n=Math.cos(t),r=Math.sin(t),s=1-n,a=e.x,o=e.y,c=e.z,l=s*a,u=s*o;return this.set(l*a+n,l*o-r*c,l*c+r*o,0,l*o+r*c,u*o+n,u*c-r*a,0,l*c-r*o,u*c+r*a,s*c*c+n,0,0,0,0,1),this}makeScale(e,t,n){return this.set(e,0,0,0,0,t,0,0,0,0,n,0,0,0,0,1),this}makeShear(e,t,n,r,s,a){return this.set(1,n,s,0,e,1,a,0,t,r,1,0,0,0,0,1),this}compose(e,t,n){const r=this.elements,s=t._x,a=t._y,o=t._z,c=t._w,l=s+s,u=a+a,d=o+o,f=s*l,h=s*u,m=s*d,v=a*u,g=a*d,p=o*d,_=c*l,y=c*u,x=c*d,A=n.x,w=n.y,R=n.z;return r[0]=(1-(v+p))*A,r[1]=(h+x)*A,r[2]=(m-y)*A,r[3]=0,r[4]=(h-x)*w,r[5]=(1-(f+p))*w,r[6]=(g+_)*w,r[7]=0,r[8]=(m+y)*R,r[9]=(g-_)*R,r[10]=(1-(f+v))*R,r[11]=0,r[12]=e.x,r[13]=e.y,r[14]=e.z,r[15]=1,this}decompose(e,t,n){const r=this.elements;let s=Ar.set(r[0],r[1],r[2]).length();const a=Ar.set(r[4],r[5],r[6]).length(),o=Ar.set(r[8],r[9],r[10]).length();this.determinant()<0&&(s=-s),e.x=r[12],e.y=r[13],e.z=r[14],zn.copy(this);const l=1/s,u=1/a,d=1/o;return zn.elements[0]*=l,zn.elements[1]*=l,zn.elements[2]*=l,zn.elements[4]*=u,zn.elements[5]*=u,zn.elements[6]*=u,zn.elements[8]*=d,zn.elements[9]*=d,zn.elements[10]*=d,t.setFromRotationMatrix(zn),n.x=s,n.y=a,n.z=o,this}makePerspective(e,t,n,r,s,a,o=ni,c=!1){const l=this.elements,u=2*s/(t-e),d=2*s/(n-r),f=(t+e)/(t-e),h=(n+r)/(n-r);let m,v;if(c)m=s/(a-s),v=a*s/(a-s);else if(o===ni)m=-(a+s)/(a-s),v=-2*a*s/(a-s);else if(o===So)m=-a/(a-s),v=-a*s/(a-s);else throw new Error("THREE.Matrix4.makePerspective(): Invalid coordinate system: "+o);return l[0]=u,l[4]=0,l[8]=f,l[12]=0,l[1]=0,l[5]=d,l[9]=h,l[13]=0,l[2]=0,l[6]=0,l[10]=m,l[14]=v,l[3]=0,l[7]=0,l[11]=-1,l[15]=0,this}makeOrthographic(e,t,n,r,s,a,o=ni,c=!1){const l=this.elements,u=2/(t-e),d=2/(n-r),f=-(t+e)/(t-e),h=-(n+r)/(n-r);let m,v;if(c)m=1/(a-s),v=a/(a-s);else if(o===ni)m=-2/(a-s),v=-(a+s)/(a-s);else if(o===So)m=-1/(a-s),v=-s/(a-s);else throw new Error("THREE.Matrix4.makeOrthographic(): Invalid coordinate system: "+o);return l[0]=u,l[4]=0,l[8]=0,l[12]=f,l[1]=0,l[5]=d,l[9]=0,l[13]=h,l[2]=0,l[6]=0,l[10]=m,l[14]=v,l[3]=0,l[7]=0,l[11]=0,l[15]=1,this}equals(e){const t=this.elements,n=e.elements;for(let r=0;r<16;r++)if(t[r]!==n[r])return!1;return!0}fromArray(e,t=0){for(let n=0;n<16;n++)this.elements[n]=e[n+t];return this}toArray(e=[],t=0){const n=this.elements;return e[t]=n[0],e[t+1]=n[1],e[t+2]=n[2],e[t+3]=n[3],e[t+4]=n[4],e[t+5]=n[5],e[t+6]=n[6],e[t+7]=n[7],e[t+8]=n[8],e[t+9]=n[9],e[t+10]=n[10],e[t+11]=n[11],e[t+12]=n[12],e[t+13]=n[13],e[t+14]=n[14],e[t+15]=n[15],e}}const Ar=new P,zn=new Ke,_0=new P(0,0,0),y0=new P(1,1,1),Di=new P,Ca=new P,Mn=new P,Ld=new Ke,Pd=new Ji;class qn{constructor(e=0,t=0,n=0,r=qn.DEFAULT_ORDER){this.isEuler=!0,this._x=e,this._y=t,this._z=n,this._order=r}get x(){return this._x}set x(e){this._x=e,this._onChangeCallback()}get y(){return this._y}set y(e){this._y=e,this._onChangeCallback()}get z(){return this._z}set z(e){this._z=e,this._onChangeCallback()}get order(){return this._order}set order(e){this._order=e,this._onChangeCallback()}set(e,t,n,r=this._order){return this._x=e,this._y=t,this._z=n,this._order=r,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._order)}copy(e){return this._x=e._x,this._y=e._y,this._z=e._z,this._order=e._order,this._onChangeCallback(),this}setFromRotationMatrix(e,t=this._order,n=!0){const r=e.elements,s=r[0],a=r[4],o=r[8],c=r[1],l=r[5],u=r[9],d=r[2],f=r[6],h=r[10];switch(t){case"XYZ":this._y=Math.asin(tt(o,-1,1)),Math.abs(o)<.9999999?(this._x=Math.atan2(-u,h),this._z=Math.atan2(-a,s)):(this._x=Math.atan2(f,l),this._z=0);break;case"YXZ":this._x=Math.asin(-tt(u,-1,1)),Math.abs(u)<.9999999?(this._y=Math.atan2(o,h),this._z=Math.atan2(c,l)):(this._y=Math.atan2(-d,s),this._z=0);break;case"ZXY":this._x=Math.asin(tt(f,-1,1)),Math.abs(f)<.9999999?(this._y=Math.atan2(-d,h),this._z=Math.atan2(-a,l)):(this._y=0,this._z=Math.atan2(c,s));break;case"ZYX":this._y=Math.asin(-tt(d,-1,1)),Math.abs(d)<.9999999?(this._x=Math.atan2(f,h),this._z=Math.atan2(c,s)):(this._x=0,this._z=Math.atan2(-a,l));break;case"YZX":this._z=Math.asin(tt(c,-1,1)),Math.abs(c)<.9999999?(this._x=Math.atan2(-u,l),this._y=Math.atan2(-d,s)):(this._x=0,this._y=Math.atan2(o,h));break;case"XZY":this._z=Math.asin(-tt(a,-1,1)),Math.abs(a)<.9999999?(this._x=Math.atan2(f,l),this._y=Math.atan2(o,s)):(this._x=Math.atan2(-u,h),this._y=0);break;default:console.warn("THREE.Euler: .setFromRotationMatrix() encountered an unknown order: "+t)}return this._order=t,n===!0&&this._onChangeCallback(),this}setFromQuaternion(e,t,n){return Ld.makeRotationFromQuaternion(e),this.setFromRotationMatrix(Ld,t,n)}setFromVector3(e,t=this._order){return this.set(e.x,e.y,e.z,t)}reorder(e){return Pd.setFromEuler(this),this.setFromQuaternion(Pd,e)}equals(e){return e._x===this._x&&e._y===this._y&&e._z===this._z&&e._order===this._order}fromArray(e){return this._x=e[0],this._y=e[1],this._z=e[2],e[3]!==void 0&&(this._order=e[3]),this._onChangeCallback(),this}toArray(e=[],t=0){return e[t]=this._x,e[t+1]=this._y,e[t+2]=this._z,e[t+3]=this._order,e}_onChange(e){return this._onChangeCallback=e,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._order}}qn.DEFAULT_ORDER="XYZ";class Uf{constructor(){this.mask=1}set(e){this.mask=(1<<e|0)>>>0}enable(e){this.mask|=1<<e|0}enableAll(){this.mask=-1}toggle(e){this.mask^=1<<e|0}disable(e){this.mask&=~(1<<e|0)}disableAll(){this.mask=0}test(e){return(this.mask&e.mask)!==0}isEnabled(e){return(this.mask&(1<<e|0))!==0}}let x0=0;const Id=new P,Rr=new Ji,pi=new Ke,La=new P,ws=new P,M0=new P,S0=new Ji,Dd=new P(1,0,0),Nd=new P(0,1,0),Ud=new P(0,0,1),Fd={type:"added"},b0={type:"removed"},Cr={type:"childadded",child:null},gc={type:"childremoved",child:null};class wt extends fs{constructor(){super(),this.isObject3D=!0,Object.defineProperty(this,"id",{value:x0++}),this.uuid=Fn(),this.name="",this.type="Object3D",this.parent=null,this.children=[],this.up=wt.DEFAULT_UP.clone();const e=new P,t=new qn,n=new Ji,r=new P(1,1,1);function s(){n.setFromEuler(t,!1)}function a(){t.setFromQuaternion(n,void 0,!1)}t._onChange(s),n._onChange(a),Object.defineProperties(this,{position:{configurable:!0,enumerable:!0,value:e},rotation:{configurable:!0,enumerable:!0,value:t},quaternion:{configurable:!0,enumerable:!0,value:n},scale:{configurable:!0,enumerable:!0,value:r},modelViewMatrix:{value:new Ke},normalMatrix:{value:new Qe}}),this.matrix=new Ke,this.matrixWorld=new Ke,this.matrixAutoUpdate=wt.DEFAULT_MATRIX_AUTO_UPDATE,this.matrixWorldAutoUpdate=wt.DEFAULT_MATRIX_WORLD_AUTO_UPDATE,this.matrixWorldNeedsUpdate=!1,this.layers=new Uf,this.visible=!0,this.castShadow=!1,this.receiveShadow=!1,this.frustumCulled=!0,this.renderOrder=0,this.animations=[],this.customDepthMaterial=void 0,this.customDistanceMaterial=void 0,this.userData={}}onBeforeShadow(){}onAfterShadow(){}onBeforeRender(){}onAfterRender(){}applyMatrix4(e){this.matrixAutoUpdate&&this.updateMatrix(),this.matrix.premultiply(e),this.matrix.decompose(this.position,this.quaternion,this.scale)}applyQuaternion(e){return this.quaternion.premultiply(e),this}setRotationFromAxisAngle(e,t){this.quaternion.setFromAxisAngle(e,t)}setRotationFromEuler(e){this.quaternion.setFromEuler(e,!0)}setRotationFromMatrix(e){this.quaternion.setFromRotationMatrix(e)}setRotationFromQuaternion(e){this.quaternion.copy(e)}rotateOnAxis(e,t){return Rr.setFromAxisAngle(e,t),this.quaternion.multiply(Rr),this}rotateOnWorldAxis(e,t){return Rr.setFromAxisAngle(e,t),this.quaternion.premultiply(Rr),this}rotateX(e){return this.rotateOnAxis(Dd,e)}rotateY(e){return this.rotateOnAxis(Nd,e)}rotateZ(e){return this.rotateOnAxis(Ud,e)}translateOnAxis(e,t){return Id.copy(e).applyQuaternion(this.quaternion),this.position.add(Id.multiplyScalar(t)),this}translateX(e){return this.translateOnAxis(Dd,e)}translateY(e){return this.translateOnAxis(Nd,e)}translateZ(e){return this.translateOnAxis(Ud,e)}localToWorld(e){return this.updateWorldMatrix(!0,!1),e.applyMatrix4(this.matrixWorld)}worldToLocal(e){return this.updateWorldMatrix(!0,!1),e.applyMatrix4(pi.copy(this.matrixWorld).invert())}lookAt(e,t,n){e.isVector3?La.copy(e):La.set(e,t,n);const r=this.parent;this.updateWorldMatrix(!0,!1),ws.setFromMatrixPosition(this.matrixWorld),this.isCamera||this.isLight?pi.lookAt(ws,La,this.up):pi.lookAt(La,ws,this.up),this.quaternion.setFromRotationMatrix(pi),r&&(pi.extractRotation(r.matrixWorld),Rr.setFromRotationMatrix(pi),this.quaternion.premultiply(Rr.invert()))}add(e){if(arguments.length>1){for(let t=0;t<arguments.length;t++)this.add(arguments[t]);return this}return e===this?(console.error("THREE.Object3D.add: object can't be added as a child of itself.",e),this):(e&&e.isObject3D?(e.removeFromParent(),e.parent=this,this.children.push(e),e.dispatchEvent(Fd),Cr.child=e,this.dispatchEvent(Cr),Cr.child=null):console.error("THREE.Object3D.add: object not an instance of THREE.Object3D.",e),this)}remove(e){if(arguments.length>1){for(let n=0;n<arguments.length;n++)this.remove(arguments[n]);return this}const t=this.children.indexOf(e);return t!==-1&&(e.parent=null,this.children.splice(t,1),e.dispatchEvent(b0),gc.child=e,this.dispatchEvent(gc),gc.child=null),this}removeFromParent(){const e=this.parent;return e!==null&&e.remove(this),this}clear(){return this.remove(...this.children)}attach(e){return this.updateWorldMatrix(!0,!1),pi.copy(this.matrixWorld).invert(),e.parent!==null&&(e.parent.updateWorldMatrix(!0,!1),pi.multiply(e.parent.matrixWorld)),e.applyMatrix4(pi),e.removeFromParent(),e.parent=this,this.children.push(e),e.updateWorldMatrix(!1,!0),e.dispatchEvent(Fd),Cr.child=e,this.dispatchEvent(Cr),Cr.child=null,this}getObjectById(e){return this.getObjectByProperty("id",e)}getObjectByName(e){return this.getObjectByProperty("name",e)}getObjectByProperty(e,t){if(this[e]===t)return this;for(let n=0,r=this.children.length;n<r;n++){const a=this.children[n].getObjectByProperty(e,t);if(a!==void 0)return a}}getObjectsByProperty(e,t,n=[]){this[e]===t&&n.push(this);const r=this.children;for(let s=0,a=r.length;s<a;s++)r[s].getObjectsByProperty(e,t,n);return n}getWorldPosition(e){return this.updateWorldMatrix(!0,!1),e.setFromMatrixPosition(this.matrixWorld)}getWorldQuaternion(e){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(ws,e,M0),e}getWorldScale(e){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(ws,S0,e),e}getWorldDirection(e){this.updateWorldMatrix(!0,!1);const t=this.matrixWorld.elements;return e.set(t[8],t[9],t[10]).normalize()}raycast(){}traverse(e){e(this);const t=this.children;for(let n=0,r=t.length;n<r;n++)t[n].traverse(e)}traverseVisible(e){if(this.visible===!1)return;e(this);const t=this.children;for(let n=0,r=t.length;n<r;n++)t[n].traverseVisible(e)}traverseAncestors(e){const t=this.parent;t!==null&&(e(t),t.traverseAncestors(e))}updateMatrix(){this.matrix.compose(this.position,this.quaternion,this.scale),this.matrixWorldNeedsUpdate=!0}updateMatrixWorld(e){this.matrixAutoUpdate&&this.updateMatrix(),(this.matrixWorldNeedsUpdate||e)&&(this.matrixWorldAutoUpdate===!0&&(this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix)),this.matrixWorldNeedsUpdate=!1,e=!0);const t=this.children;for(let n=0,r=t.length;n<r;n++)t[n].updateMatrixWorld(e)}updateWorldMatrix(e,t){const n=this.parent;if(e===!0&&n!==null&&n.updateWorldMatrix(!0,!1),this.matrixAutoUpdate&&this.updateMatrix(),this.matrixWorldAutoUpdate===!0&&(this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix)),t===!0){const r=this.children;for(let s=0,a=r.length;s<a;s++)r[s].updateWorldMatrix(!1,!0)}}toJSON(e){const t=e===void 0||typeof e=="string",n={};t&&(e={geometries:{},materials:{},textures:{},images:{},shapes:{},skeletons:{},animations:{},nodes:{}},n.metadata={version:4.7,type:"Object",generator:"Object3D.toJSON"});const r={};r.uuid=this.uuid,r.type=this.type,this.name!==""&&(r.name=this.name),this.castShadow===!0&&(r.castShadow=!0),this.receiveShadow===!0&&(r.receiveShadow=!0),this.visible===!1&&(r.visible=!1),this.frustumCulled===!1&&(r.frustumCulled=!1),this.renderOrder!==0&&(r.renderOrder=this.renderOrder),Object.keys(this.userData).length>0&&(r.userData=this.userData),r.layers=this.layers.mask,r.matrix=this.matrix.toArray(),r.up=this.up.toArray(),this.matrixAutoUpdate===!1&&(r.matrixAutoUpdate=!1),this.isInstancedMesh&&(r.type="InstancedMesh",r.count=this.count,r.instanceMatrix=this.instanceMatrix.toJSON(),this.instanceColor!==null&&(r.instanceColor=this.instanceColor.toJSON())),this.isBatchedMesh&&(r.type="BatchedMesh",r.perObjectFrustumCulled=this.perObjectFrustumCulled,r.sortObjects=this.sortObjects,r.drawRanges=this._drawRanges,r.reservedRanges=this._reservedRanges,r.geometryInfo=this._geometryInfo.map(o=>({...o,boundingBox:o.boundingBox?o.boundingBox.toJSON():void 0,boundingSphere:o.boundingSphere?o.boundingSphere.toJSON():void 0})),r.instanceInfo=this._instanceInfo.map(o=>({...o})),r.availableInstanceIds=this._availableInstanceIds.slice(),r.availableGeometryIds=this._availableGeometryIds.slice(),r.nextIndexStart=this._nextIndexStart,r.nextVertexStart=this._nextVertexStart,r.geometryCount=this._geometryCount,r.maxInstanceCount=this._maxInstanceCount,r.maxVertexCount=this._maxVertexCount,r.maxIndexCount=this._maxIndexCount,r.geometryInitialized=this._geometryInitialized,r.matricesTexture=this._matricesTexture.toJSON(e),r.indirectTexture=this._indirectTexture.toJSON(e),this._colorsTexture!==null&&(r.colorsTexture=this._colorsTexture.toJSON(e)),this.boundingSphere!==null&&(r.boundingSphere=this.boundingSphere.toJSON()),this.boundingBox!==null&&(r.boundingBox=this.boundingBox.toJSON()));function s(o,c){return o[c.uuid]===void 0&&(o[c.uuid]=c.toJSON(e)),c.uuid}if(this.isScene)this.background&&(this.background.isColor?r.background=this.background.toJSON():this.background.isTexture&&(r.background=this.background.toJSON(e).uuid)),this.environment&&this.environment.isTexture&&this.environment.isRenderTargetTexture!==!0&&(r.environment=this.environment.toJSON(e).uuid);else if(this.isMesh||this.isLine||this.isPoints){r.geometry=s(e.geometries,this.geometry);const o=this.geometry.parameters;if(o!==void 0&&o.shapes!==void 0){const c=o.shapes;if(Array.isArray(c))for(let l=0,u=c.length;l<u;l++){const d=c[l];s(e.shapes,d)}else s(e.shapes,c)}}if(this.isSkinnedMesh&&(r.bindMode=this.bindMode,r.bindMatrix=this.bindMatrix.toArray(),this.skeleton!==void 0&&(s(e.skeletons,this.skeleton),r.skeleton=this.skeleton.uuid)),this.material!==void 0)if(Array.isArray(this.material)){const o=[];for(let c=0,l=this.material.length;c<l;c++)o.push(s(e.materials,this.material[c]));r.material=o}else r.material=s(e.materials,this.material);if(this.children.length>0){r.children=[];for(let o=0;o<this.children.length;o++)r.children.push(this.children[o].toJSON(e).object)}if(this.animations.length>0){r.animations=[];for(let o=0;o<this.animations.length;o++){const c=this.animations[o];r.animations.push(s(e.animations,c))}}if(t){const o=a(e.geometries),c=a(e.materials),l=a(e.textures),u=a(e.images),d=a(e.shapes),f=a(e.skeletons),h=a(e.animations),m=a(e.nodes);o.length>0&&(n.geometries=o),c.length>0&&(n.materials=c),l.length>0&&(n.textures=l),u.length>0&&(n.images=u),d.length>0&&(n.shapes=d),f.length>0&&(n.skeletons=f),h.length>0&&(n.animations=h),m.length>0&&(n.nodes=m)}return n.object=r,n;function a(o){const c=[];for(const l in o){const u=o[l];delete u.metadata,c.push(u)}return c}}clone(e){return new this.constructor().copy(this,e)}copy(e,t=!0){if(this.name=e.name,this.up.copy(e.up),this.position.copy(e.position),this.rotation.order=e.rotation.order,this.quaternion.copy(e.quaternion),this.scale.copy(e.scale),this.matrix.copy(e.matrix),this.matrixWorld.copy(e.matrixWorld),this.matrixAutoUpdate=e.matrixAutoUpdate,this.matrixWorldAutoUpdate=e.matrixWorldAutoUpdate,this.matrixWorldNeedsUpdate=e.matrixWorldNeedsUpdate,this.layers.mask=e.layers.mask,this.visible=e.visible,this.castShadow=e.castShadow,this.receiveShadow=e.receiveShadow,this.frustumCulled=e.frustumCulled,this.renderOrder=e.renderOrder,this.animations=e.animations.slice(),this.userData=JSON.parse(JSON.stringify(e.userData)),t===!0)for(let n=0;n<e.children.length;n++){const r=e.children[n];this.add(r.clone())}return this}}wt.DEFAULT_UP=new P(0,1,0);wt.DEFAULT_MATRIX_AUTO_UPDATE=!0;wt.DEFAULT_MATRIX_WORLD_AUTO_UPDATE=!0;const Hn=new P,mi=new P,vc=new P,gi=new P,Lr=new P,Pr=new P,Od=new P,_c=new P,yc=new P,xc=new P,Mc=new ht,Sc=new ht,bc=new ht;class Dn{constructor(e=new P,t=new P,n=new P){this.a=e,this.b=t,this.c=n}static getNormal(e,t,n,r){r.subVectors(n,t),Hn.subVectors(e,t),r.cross(Hn);const s=r.lengthSq();return s>0?r.multiplyScalar(1/Math.sqrt(s)):r.set(0,0,0)}static getBarycoord(e,t,n,r,s){Hn.subVectors(r,t),mi.subVectors(n,t),vc.subVectors(e,t);const a=Hn.dot(Hn),o=Hn.dot(mi),c=Hn.dot(vc),l=mi.dot(mi),u=mi.dot(vc),d=a*l-o*o;if(d===0)return s.set(0,0,0),null;const f=1/d,h=(l*c-o*u)*f,m=(a*u-o*c)*f;return s.set(1-h-m,m,h)}static containsPoint(e,t,n,r){return this.getBarycoord(e,t,n,r,gi)===null?!1:gi.x>=0&&gi.y>=0&&gi.x+gi.y<=1}static getInterpolation(e,t,n,r,s,a,o,c){return this.getBarycoord(e,t,n,r,gi)===null?(c.x=0,c.y=0,"z"in c&&(c.z=0),"w"in c&&(c.w=0),null):(c.setScalar(0),c.addScaledVector(s,gi.x),c.addScaledVector(a,gi.y),c.addScaledVector(o,gi.z),c)}static getInterpolatedAttribute(e,t,n,r,s,a){return Mc.setScalar(0),Sc.setScalar(0),bc.setScalar(0),Mc.fromBufferAttribute(e,t),Sc.fromBufferAttribute(e,n),bc.fromBufferAttribute(e,r),a.setScalar(0),a.addScaledVector(Mc,s.x),a.addScaledVector(Sc,s.y),a.addScaledVector(bc,s.z),a}static isFrontFacing(e,t,n,r){return Hn.subVectors(n,t),mi.subVectors(e,t),Hn.cross(mi).dot(r)<0}set(e,t,n){return this.a.copy(e),this.b.copy(t),this.c.copy(n),this}setFromPointsAndIndices(e,t,n,r){return this.a.copy(e[t]),this.b.copy(e[n]),this.c.copy(e[r]),this}setFromAttributeAndIndices(e,t,n,r){return this.a.fromBufferAttribute(e,t),this.b.fromBufferAttribute(e,n),this.c.fromBufferAttribute(e,r),this}clone(){return new this.constructor().copy(this)}copy(e){return this.a.copy(e.a),this.b.copy(e.b),this.c.copy(e.c),this}getArea(){return Hn.subVectors(this.c,this.b),mi.subVectors(this.a,this.b),Hn.cross(mi).length()*.5}getMidpoint(e){return e.addVectors(this.a,this.b).add(this.c).multiplyScalar(1/3)}getNormal(e){return Dn.getNormal(this.a,this.b,this.c,e)}getPlane(e){return e.setFromCoplanarPoints(this.a,this.b,this.c)}getBarycoord(e,t){return Dn.getBarycoord(e,this.a,this.b,this.c,t)}getInterpolation(e,t,n,r,s){return Dn.getInterpolation(e,this.a,this.b,this.c,t,n,r,s)}containsPoint(e){return Dn.containsPoint(e,this.a,this.b,this.c)}isFrontFacing(e){return Dn.isFrontFacing(this.a,this.b,this.c,e)}intersectsBox(e){return e.intersectsTriangle(this)}closestPointToPoint(e,t){const n=this.a,r=this.b,s=this.c;let a,o;Lr.subVectors(r,n),Pr.subVectors(s,n),_c.subVectors(e,n);const c=Lr.dot(_c),l=Pr.dot(_c);if(c<=0&&l<=0)return t.copy(n);yc.subVectors(e,r);const u=Lr.dot(yc),d=Pr.dot(yc);if(u>=0&&d<=u)return t.copy(r);const f=c*d-u*l;if(f<=0&&c>=0&&u<=0)return a=c/(c-u),t.copy(n).addScaledVector(Lr,a);xc.subVectors(e,s);const h=Lr.dot(xc),m=Pr.dot(xc);if(m>=0&&h<=m)return t.copy(s);const v=h*l-c*m;if(v<=0&&l>=0&&m<=0)return o=l/(l-m),t.copy(n).addScaledVector(Pr,o);const g=u*m-h*d;if(g<=0&&d-u>=0&&h-m>=0)return Od.subVectors(s,r),o=(d-u)/(d-u+(h-m)),t.copy(r).addScaledVector(Od,o);const p=1/(g+v+f);return a=v*p,o=f*p,t.copy(n).addScaledVector(Lr,a).addScaledVector(Pr,o)}equals(e){return e.a.equals(this.a)&&e.b.equals(this.b)&&e.c.equals(this.c)}}const Ff={aliceblue:15792383,antiquewhite:16444375,aqua:65535,aquamarine:8388564,azure:15794175,beige:16119260,bisque:16770244,black:0,blanchedalmond:16772045,blue:255,blueviolet:9055202,brown:10824234,burlywood:14596231,cadetblue:6266528,chartreuse:8388352,chocolate:13789470,coral:16744272,cornflowerblue:6591981,cornsilk:16775388,crimson:14423100,cyan:65535,darkblue:139,darkcyan:35723,darkgoldenrod:12092939,darkgray:11119017,darkgreen:25600,darkgrey:11119017,darkkhaki:12433259,darkmagenta:9109643,darkolivegreen:5597999,darkorange:16747520,darkorchid:10040012,darkred:9109504,darksalmon:15308410,darkseagreen:9419919,darkslateblue:4734347,darkslategray:3100495,darkslategrey:3100495,darkturquoise:52945,darkviolet:9699539,deeppink:16716947,deepskyblue:49151,dimgray:6908265,dimgrey:6908265,dodgerblue:2003199,firebrick:11674146,floralwhite:16775920,forestgreen:2263842,fuchsia:16711935,gainsboro:14474460,ghostwhite:16316671,gold:16766720,goldenrod:14329120,gray:8421504,green:32768,greenyellow:11403055,grey:8421504,honeydew:15794160,hotpink:16738740,indianred:13458524,indigo:4915330,ivory:16777200,khaki:15787660,lavender:15132410,lavenderblush:16773365,lawngreen:8190976,lemonchiffon:16775885,lightblue:11393254,lightcoral:15761536,lightcyan:14745599,lightgoldenrodyellow:16448210,lightgray:13882323,lightgreen:9498256,lightgrey:13882323,lightpink:16758465,lightsalmon:16752762,lightseagreen:2142890,lightskyblue:8900346,lightslategray:7833753,lightslategrey:7833753,lightsteelblue:11584734,lightyellow:16777184,lime:65280,limegreen:3329330,linen:16445670,magenta:16711935,maroon:8388608,mediumaquamarine:6737322,mediumblue:205,mediumorchid:12211667,mediumpurple:9662683,mediumseagreen:3978097,mediumslateblue:8087790,mediumspringgreen:64154,mediumturquoise:4772300,mediumvioletred:13047173,midnightblue:1644912,mintcream:16121850,mistyrose:16770273,moccasin:16770229,navajowhite:16768685,navy:128,oldlace:16643558,olive:8421376,olivedrab:7048739,orange:16753920,orangered:16729344,orchid:14315734,palegoldenrod:15657130,palegreen:10025880,paleturquoise:11529966,palevioletred:14381203,papayawhip:16773077,peachpuff:16767673,peru:13468991,pink:16761035,plum:14524637,powderblue:11591910,purple:8388736,rebeccapurple:6697881,red:16711680,rosybrown:12357519,royalblue:4286945,saddlebrown:9127187,salmon:16416882,sandybrown:16032864,seagreen:3050327,seashell:16774638,sienna:10506797,silver:12632256,skyblue:8900331,slateblue:6970061,slategray:7372944,slategrey:7372944,snow:16775930,springgreen:65407,steelblue:4620980,tan:13808780,teal:32896,thistle:14204888,tomato:16737095,turquoise:4251856,violet:15631086,wheat:16113331,white:16777215,whitesmoke:16119285,yellow:16776960,yellowgreen:10145074},Ni={h:0,s:0,l:0},Pa={h:0,s:0,l:0};function wc(i,e,t){return t<0&&(t+=1),t>1&&(t-=1),t<1/6?i+(e-i)*6*t:t<1/2?e:t<2/3?i+(e-i)*6*(2/3-t):i}class We{constructor(e,t,n){return this.isColor=!0,this.r=1,this.g=1,this.b=1,this.set(e,t,n)}set(e,t,n){if(t===void 0&&n===void 0){const r=e;r&&r.isColor?this.copy(r):typeof r=="number"?this.setHex(r):typeof r=="string"&&this.setStyle(r)}else this.setRGB(e,t,n);return this}setScalar(e){return this.r=e,this.g=e,this.b=e,this}setHex(e,t=Bt){return e=Math.floor(e),this.r=(e>>16&255)/255,this.g=(e>>8&255)/255,this.b=(e&255)/255,at.colorSpaceToWorking(this,t),this}setRGB(e,t,n,r=at.workingColorSpace){return this.r=e,this.g=t,this.b=n,at.colorSpaceToWorking(this,r),this}setHSL(e,t,n,r=at.workingColorSpace){if(e=Ru(e,1),t=tt(t,0,1),n=tt(n,0,1),t===0)this.r=this.g=this.b=n;else{const s=n<=.5?n*(1+t):n+t-n*t,a=2*n-s;this.r=wc(a,s,e+1/3),this.g=wc(a,s,e),this.b=wc(a,s,e-1/3)}return at.colorSpaceToWorking(this,r),this}setStyle(e,t=Bt){function n(s){s!==void 0&&parseFloat(s)<1&&console.warn("THREE.Color: Alpha component of "+e+" will be ignored.")}let r;if(r=/^(\w+)\(([^\)]*)\)/.exec(e)){let s;const a=r[1],o=r[2];switch(a){case"rgb":case"rgba":if(s=/^\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(o))return n(s[4]),this.setRGB(Math.min(255,parseInt(s[1],10))/255,Math.min(255,parseInt(s[2],10))/255,Math.min(255,parseInt(s[3],10))/255,t);if(s=/^\s*(\d+)\%\s*,\s*(\d+)\%\s*,\s*(\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(o))return n(s[4]),this.setRGB(Math.min(100,parseInt(s[1],10))/100,Math.min(100,parseInt(s[2],10))/100,Math.min(100,parseInt(s[3],10))/100,t);break;case"hsl":case"hsla":if(s=/^\s*(\d*\.?\d+)\s*,\s*(\d*\.?\d+)\%\s*,\s*(\d*\.?\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(o))return n(s[4]),this.setHSL(parseFloat(s[1])/360,parseFloat(s[2])/100,parseFloat(s[3])/100,t);break;default:console.warn("THREE.Color: Unknown color model "+e)}}else if(r=/^\#([A-Fa-f\d]+)$/.exec(e)){const s=r[1],a=s.length;if(a===3)return this.setRGB(parseInt(s.charAt(0),16)/15,parseInt(s.charAt(1),16)/15,parseInt(s.charAt(2),16)/15,t);if(a===6)return this.setHex(parseInt(s,16),t);console.warn("THREE.Color: Invalid hex color "+e)}else if(e&&e.length>0)return this.setColorName(e,t);return this}setColorName(e,t=Bt){const n=Ff[e.toLowerCase()];return n!==void 0?this.setHex(n,t):console.warn("THREE.Color: Unknown color "+e),this}clone(){return new this.constructor(this.r,this.g,this.b)}copy(e){return this.r=e.r,this.g=e.g,this.b=e.b,this}copySRGBToLinear(e){return this.r=Ti(e.r),this.g=Ti(e.g),this.b=Ti(e.b),this}copyLinearToSRGB(e){return this.r=Jr(e.r),this.g=Jr(e.g),this.b=Jr(e.b),this}convertSRGBToLinear(){return this.copySRGBToLinear(this),this}convertLinearToSRGB(){return this.copyLinearToSRGB(this),this}getHex(e=Bt){return at.workingToColorSpace(en.copy(this),e),Math.round(tt(en.r*255,0,255))*65536+Math.round(tt(en.g*255,0,255))*256+Math.round(tt(en.b*255,0,255))}getHexString(e=Bt){return("000000"+this.getHex(e).toString(16)).slice(-6)}getHSL(e,t=at.workingColorSpace){at.workingToColorSpace(en.copy(this),t);const n=en.r,r=en.g,s=en.b,a=Math.max(n,r,s),o=Math.min(n,r,s);let c,l;const u=(o+a)/2;if(o===a)c=0,l=0;else{const d=a-o;switch(l=u<=.5?d/(a+o):d/(2-a-o),a){case n:c=(r-s)/d+(r<s?6:0);break;case r:c=(s-n)/d+2;break;case s:c=(n-r)/d+4;break}c/=6}return e.h=c,e.s=l,e.l=u,e}getRGB(e,t=at.workingColorSpace){return at.workingToColorSpace(en.copy(this),t),e.r=en.r,e.g=en.g,e.b=en.b,e}getStyle(e=Bt){at.workingToColorSpace(en.copy(this),e);const t=en.r,n=en.g,r=en.b;return e!==Bt?`color(${e} ${t.toFixed(3)} ${n.toFixed(3)} ${r.toFixed(3)})`:`rgb(${Math.round(t*255)},${Math.round(n*255)},${Math.round(r*255)})`}offsetHSL(e,t,n){return this.getHSL(Ni),this.setHSL(Ni.h+e,Ni.s+t,Ni.l+n)}add(e){return this.r+=e.r,this.g+=e.g,this.b+=e.b,this}addColors(e,t){return this.r=e.r+t.r,this.g=e.g+t.g,this.b=e.b+t.b,this}addScalar(e){return this.r+=e,this.g+=e,this.b+=e,this}sub(e){return this.r=Math.max(0,this.r-e.r),this.g=Math.max(0,this.g-e.g),this.b=Math.max(0,this.b-e.b),this}multiply(e){return this.r*=e.r,this.g*=e.g,this.b*=e.b,this}multiplyScalar(e){return this.r*=e,this.g*=e,this.b*=e,this}lerp(e,t){return this.r+=(e.r-this.r)*t,this.g+=(e.g-this.g)*t,this.b+=(e.b-this.b)*t,this}lerpColors(e,t,n){return this.r=e.r+(t.r-e.r)*n,this.g=e.g+(t.g-e.g)*n,this.b=e.b+(t.b-e.b)*n,this}lerpHSL(e,t){this.getHSL(Ni),e.getHSL(Pa);const n=Gs(Ni.h,Pa.h,t),r=Gs(Ni.s,Pa.s,t),s=Gs(Ni.l,Pa.l,t);return this.setHSL(n,r,s),this}setFromVector3(e){return this.r=e.x,this.g=e.y,this.b=e.z,this}applyMatrix3(e){const t=this.r,n=this.g,r=this.b,s=e.elements;return this.r=s[0]*t+s[3]*n+s[6]*r,this.g=s[1]*t+s[4]*n+s[7]*r,this.b=s[2]*t+s[5]*n+s[8]*r,this}equals(e){return e.r===this.r&&e.g===this.g&&e.b===this.b}fromArray(e,t=0){return this.r=e[t],this.g=e[t+1],this.b=e[t+2],this}toArray(e=[],t=0){return e[t]=this.r,e[t+1]=this.g,e[t+2]=this.b,e}fromBufferAttribute(e,t){return this.r=e.getX(t),this.g=e.getY(t),this.b=e.getZ(t),this}toJSON(){return this.getHex()}*[Symbol.iterator](){yield this.r,yield this.g,yield this.b}}const en=new We;We.NAMES=Ff;let w0=0;class On extends fs{constructor(){super(),this.isMaterial=!0,Object.defineProperty(this,"id",{value:w0++}),this.uuid=Fn(),this.name="",this.type="Material",this.blending=Zr,this.side=Ci,this.vertexColors=!1,this.opacity=1,this.transparent=!1,this.alphaHash=!1,this.blendSrc=al,this.blendDst=ol,this.blendEquation=dr,this.blendSrcAlpha=null,this.blendDstAlpha=null,this.blendEquationAlpha=null,this.blendColor=new We(0,0,0),this.blendAlpha=0,this.depthFunc=ts,this.depthTest=!0,this.depthWrite=!0,this.stencilWriteMask=255,this.stencilFunc=bd,this.stencilRef=0,this.stencilFuncMask=255,this.stencilFail=Sr,this.stencilZFail=Sr,this.stencilZPass=Sr,this.stencilWrite=!1,this.clippingPlanes=null,this.clipIntersection=!1,this.clipShadows=!1,this.shadowSide=null,this.colorWrite=!0,this.precision=null,this.polygonOffset=!1,this.polygonOffsetFactor=0,this.polygonOffsetUnits=0,this.dithering=!1,this.alphaToCoverage=!1,this.premultipliedAlpha=!1,this.forceSinglePass=!1,this.allowOverride=!0,this.visible=!0,this.toneMapped=!0,this.userData={},this.version=0,this._alphaTest=0}get alphaTest(){return this._alphaTest}set alphaTest(e){this._alphaTest>0!=e>0&&this.version++,this._alphaTest=e}onBeforeRender(){}onBeforeCompile(){}customProgramCacheKey(){return this.onBeforeCompile.toString()}setValues(e){if(e!==void 0)for(const t in e){const n=e[t];if(n===void 0){console.warn(`THREE.Material: parameter '${t}' has value of undefined.`);continue}const r=this[t];if(r===void 0){console.warn(`THREE.Material: '${t}' is not a property of THREE.${this.type}.`);continue}r&&r.isColor?r.set(n):r&&r.isVector3&&n&&n.isVector3?r.copy(n):this[t]=n}}toJSON(e){const t=e===void 0||typeof e=="string";t&&(e={textures:{},images:{}});const n={metadata:{version:4.7,type:"Material",generator:"Material.toJSON"}};n.uuid=this.uuid,n.type=this.type,this.name!==""&&(n.name=this.name),this.color&&this.color.isColor&&(n.color=this.color.getHex()),this.roughness!==void 0&&(n.roughness=this.roughness),this.metalness!==void 0&&(n.metalness=this.metalness),this.sheen!==void 0&&(n.sheen=this.sheen),this.sheenColor&&this.sheenColor.isColor&&(n.sheenColor=this.sheenColor.getHex()),this.sheenRoughness!==void 0&&(n.sheenRoughness=this.sheenRoughness),this.emissive&&this.emissive.isColor&&(n.emissive=this.emissive.getHex()),this.emissiveIntensity!==void 0&&this.emissiveIntensity!==1&&(n.emissiveIntensity=this.emissiveIntensity),this.specular&&this.specular.isColor&&(n.specular=this.specular.getHex()),this.specularIntensity!==void 0&&(n.specularIntensity=this.specularIntensity),this.specularColor&&this.specularColor.isColor&&(n.specularColor=this.specularColor.getHex()),this.shininess!==void 0&&(n.shininess=this.shininess),this.clearcoat!==void 0&&(n.clearcoat=this.clearcoat),this.clearcoatRoughness!==void 0&&(n.clearcoatRoughness=this.clearcoatRoughness),this.clearcoatMap&&this.clearcoatMap.isTexture&&(n.clearcoatMap=this.clearcoatMap.toJSON(e).uuid),this.clearcoatRoughnessMap&&this.clearcoatRoughnessMap.isTexture&&(n.clearcoatRoughnessMap=this.clearcoatRoughnessMap.toJSON(e).uuid),this.clearcoatNormalMap&&this.clearcoatNormalMap.isTexture&&(n.clearcoatNormalMap=this.clearcoatNormalMap.toJSON(e).uuid,n.clearcoatNormalScale=this.clearcoatNormalScale.toArray()),this.sheenColorMap&&this.sheenColorMap.isTexture&&(n.sheenColorMap=this.sheenColorMap.toJSON(e).uuid),this.sheenRoughnessMap&&this.sheenRoughnessMap.isTexture&&(n.sheenRoughnessMap=this.sheenRoughnessMap.toJSON(e).uuid),this.dispersion!==void 0&&(n.dispersion=this.dispersion),this.iridescence!==void 0&&(n.iridescence=this.iridescence),this.iridescenceIOR!==void 0&&(n.iridescenceIOR=this.iridescenceIOR),this.iridescenceThicknessRange!==void 0&&(n.iridescenceThicknessRange=this.iridescenceThicknessRange),this.iridescenceMap&&this.iridescenceMap.isTexture&&(n.iridescenceMap=this.iridescenceMap.toJSON(e).uuid),this.iridescenceThicknessMap&&this.iridescenceThicknessMap.isTexture&&(n.iridescenceThicknessMap=this.iridescenceThicknessMap.toJSON(e).uuid),this.anisotropy!==void 0&&(n.anisotropy=this.anisotropy),this.anisotropyRotation!==void 0&&(n.anisotropyRotation=this.anisotropyRotation),this.anisotropyMap&&this.anisotropyMap.isTexture&&(n.anisotropyMap=this.anisotropyMap.toJSON(e).uuid),this.map&&this.map.isTexture&&(n.map=this.map.toJSON(e).uuid),this.matcap&&this.matcap.isTexture&&(n.matcap=this.matcap.toJSON(e).uuid),this.alphaMap&&this.alphaMap.isTexture&&(n.alphaMap=this.alphaMap.toJSON(e).uuid),this.lightMap&&this.lightMap.isTexture&&(n.lightMap=this.lightMap.toJSON(e).uuid,n.lightMapIntensity=this.lightMapIntensity),this.aoMap&&this.aoMap.isTexture&&(n.aoMap=this.aoMap.toJSON(e).uuid,n.aoMapIntensity=this.aoMapIntensity),this.bumpMap&&this.bumpMap.isTexture&&(n.bumpMap=this.bumpMap.toJSON(e).uuid,n.bumpScale=this.bumpScale),this.normalMap&&this.normalMap.isTexture&&(n.normalMap=this.normalMap.toJSON(e).uuid,n.normalMapType=this.normalMapType,n.normalScale=this.normalScale.toArray()),this.displacementMap&&this.displacementMap.isTexture&&(n.displacementMap=this.displacementMap.toJSON(e).uuid,n.displacementScale=this.displacementScale,n.displacementBias=this.displacementBias),this.roughnessMap&&this.roughnessMap.isTexture&&(n.roughnessMap=this.roughnessMap.toJSON(e).uuid),this.metalnessMap&&this.metalnessMap.isTexture&&(n.metalnessMap=this.metalnessMap.toJSON(e).uuid),this.emissiveMap&&this.emissiveMap.isTexture&&(n.emissiveMap=this.emissiveMap.toJSON(e).uuid),this.specularMap&&this.specularMap.isTexture&&(n.specularMap=this.specularMap.toJSON(e).uuid),this.specularIntensityMap&&this.specularIntensityMap.isTexture&&(n.specularIntensityMap=this.specularIntensityMap.toJSON(e).uuid),this.specularColorMap&&this.specularColorMap.isTexture&&(n.specularColorMap=this.specularColorMap.toJSON(e).uuid),this.envMap&&this.envMap.isTexture&&(n.envMap=this.envMap.toJSON(e).uuid,this.combine!==void 0&&(n.combine=this.combine)),this.envMapRotation!==void 0&&(n.envMapRotation=this.envMapRotation.toArray()),this.envMapIntensity!==void 0&&(n.envMapIntensity=this.envMapIntensity),this.reflectivity!==void 0&&(n.reflectivity=this.reflectivity),this.refractionRatio!==void 0&&(n.refractionRatio=this.refractionRatio),this.gradientMap&&this.gradientMap.isTexture&&(n.gradientMap=this.gradientMap.toJSON(e).uuid),this.transmission!==void 0&&(n.transmission=this.transmission),this.transmissionMap&&this.transmissionMap.isTexture&&(n.transmissionMap=this.transmissionMap.toJSON(e).uuid),this.thickness!==void 0&&(n.thickness=this.thickness),this.thicknessMap&&this.thicknessMap.isTexture&&(n.thicknessMap=this.thicknessMap.toJSON(e).uuid),this.attenuationDistance!==void 0&&this.attenuationDistance!==1/0&&(n.attenuationDistance=this.attenuationDistance),this.attenuationColor!==void 0&&(n.attenuationColor=this.attenuationColor.getHex()),this.size!==void 0&&(n.size=this.size),this.shadowSide!==null&&(n.shadowSide=this.shadowSide),this.sizeAttenuation!==void 0&&(n.sizeAttenuation=this.sizeAttenuation),this.blending!==Zr&&(n.blending=this.blending),this.side!==Ci&&(n.side=this.side),this.vertexColors===!0&&(n.vertexColors=!0),this.opacity<1&&(n.opacity=this.opacity),this.transparent===!0&&(n.transparent=!0),this.blendSrc!==al&&(n.blendSrc=this.blendSrc),this.blendDst!==ol&&(n.blendDst=this.blendDst),this.blendEquation!==dr&&(n.blendEquation=this.blendEquation),this.blendSrcAlpha!==null&&(n.blendSrcAlpha=this.blendSrcAlpha),this.blendDstAlpha!==null&&(n.blendDstAlpha=this.blendDstAlpha),this.blendEquationAlpha!==null&&(n.blendEquationAlpha=this.blendEquationAlpha),this.blendColor&&this.blendColor.isColor&&(n.blendColor=this.blendColor.getHex()),this.blendAlpha!==0&&(n.blendAlpha=this.blendAlpha),this.depthFunc!==ts&&(n.depthFunc=this.depthFunc),this.depthTest===!1&&(n.depthTest=this.depthTest),this.depthWrite===!1&&(n.depthWrite=this.depthWrite),this.colorWrite===!1&&(n.colorWrite=this.colorWrite),this.stencilWriteMask!==255&&(n.stencilWriteMask=this.stencilWriteMask),this.stencilFunc!==bd&&(n.stencilFunc=this.stencilFunc),this.stencilRef!==0&&(n.stencilRef=this.stencilRef),this.stencilFuncMask!==255&&(n.stencilFuncMask=this.stencilFuncMask),this.stencilFail!==Sr&&(n.stencilFail=this.stencilFail),this.stencilZFail!==Sr&&(n.stencilZFail=this.stencilZFail),this.stencilZPass!==Sr&&(n.stencilZPass=this.stencilZPass),this.stencilWrite===!0&&(n.stencilWrite=this.stencilWrite),this.rotation!==void 0&&this.rotation!==0&&(n.rotation=this.rotation),this.polygonOffset===!0&&(n.polygonOffset=!0),this.polygonOffsetFactor!==0&&(n.polygonOffsetFactor=this.polygonOffsetFactor),this.polygonOffsetUnits!==0&&(n.polygonOffsetUnits=this.polygonOffsetUnits),this.linewidth!==void 0&&this.linewidth!==1&&(n.linewidth=this.linewidth),this.dashSize!==void 0&&(n.dashSize=this.dashSize),this.gapSize!==void 0&&(n.gapSize=this.gapSize),this.scale!==void 0&&(n.scale=this.scale),this.dithering===!0&&(n.dithering=!0),this.alphaTest>0&&(n.alphaTest=this.alphaTest),this.alphaHash===!0&&(n.alphaHash=!0),this.alphaToCoverage===!0&&(n.alphaToCoverage=!0),this.premultipliedAlpha===!0&&(n.premultipliedAlpha=!0),this.forceSinglePass===!0&&(n.forceSinglePass=!0),this.wireframe===!0&&(n.wireframe=!0),this.wireframeLinewidth>1&&(n.wireframeLinewidth=this.wireframeLinewidth),this.wireframeLinecap!=="round"&&(n.wireframeLinecap=this.wireframeLinecap),this.wireframeLinejoin!=="round"&&(n.wireframeLinejoin=this.wireframeLinejoin),this.flatShading===!0&&(n.flatShading=!0),this.visible===!1&&(n.visible=!1),this.toneMapped===!1&&(n.toneMapped=!1),this.fog===!1&&(n.fog=!1),Object.keys(this.userData).length>0&&(n.userData=this.userData);function r(s){const a=[];for(const o in s){const c=s[o];delete c.metadata,a.push(c)}return a}if(t){const s=r(e.textures),a=r(e.images);s.length>0&&(n.textures=s),a.length>0&&(n.images=a)}return n}clone(){return new this.constructor().copy(this)}copy(e){this.name=e.name,this.blending=e.blending,this.side=e.side,this.vertexColors=e.vertexColors,this.opacity=e.opacity,this.transparent=e.transparent,this.blendSrc=e.blendSrc,this.blendDst=e.blendDst,this.blendEquation=e.blendEquation,this.blendSrcAlpha=e.blendSrcAlpha,this.blendDstAlpha=e.blendDstAlpha,this.blendEquationAlpha=e.blendEquationAlpha,this.blendColor.copy(e.blendColor),this.blendAlpha=e.blendAlpha,this.depthFunc=e.depthFunc,this.depthTest=e.depthTest,this.depthWrite=e.depthWrite,this.stencilWriteMask=e.stencilWriteMask,this.stencilFunc=e.stencilFunc,this.stencilRef=e.stencilRef,this.stencilFuncMask=e.stencilFuncMask,this.stencilFail=e.stencilFail,this.stencilZFail=e.stencilZFail,this.stencilZPass=e.stencilZPass,this.stencilWrite=e.stencilWrite;const t=e.clippingPlanes;let n=null;if(t!==null){const r=t.length;n=new Array(r);for(let s=0;s!==r;++s)n[s]=t[s].clone()}return this.clippingPlanes=n,this.clipIntersection=e.clipIntersection,this.clipShadows=e.clipShadows,this.shadowSide=e.shadowSide,this.colorWrite=e.colorWrite,this.precision=e.precision,this.polygonOffset=e.polygonOffset,this.polygonOffsetFactor=e.polygonOffsetFactor,this.polygonOffsetUnits=e.polygonOffsetUnits,this.dithering=e.dithering,this.alphaTest=e.alphaTest,this.alphaHash=e.alphaHash,this.alphaToCoverage=e.alphaToCoverage,this.premultipliedAlpha=e.premultipliedAlpha,this.forceSinglePass=e.forceSinglePass,this.visible=e.visible,this.toneMapped=e.toneMapped,this.userData=JSON.parse(JSON.stringify(e.userData)),this}dispose(){this.dispatchEvent({type:"dispose"})}set needsUpdate(e){e===!0&&this.version++}}class bi extends On{constructor(e){super(),this.isMeshBasicMaterial=!0,this.type="MeshBasicMaterial",this.color=new We(16777215),this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.specularMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new qn,this.combine=_u,this.reflectivity=1,this.refractionRatio=.98,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.color.copy(e.color),this.map=e.map,this.lightMap=e.lightMap,this.lightMapIntensity=e.lightMapIntensity,this.aoMap=e.aoMap,this.aoMapIntensity=e.aoMapIntensity,this.specularMap=e.specularMap,this.alphaMap=e.alphaMap,this.envMap=e.envMap,this.envMapRotation.copy(e.envMapRotation),this.combine=e.combine,this.reflectivity=e.reflectivity,this.refractionRatio=e.refractionRatio,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.wireframeLinecap=e.wireframeLinecap,this.wireframeLinejoin=e.wireframeLinejoin,this.fog=e.fog,this}}const Ut=new P,Ia=new ue;let E0=0;class hn{constructor(e,t,n=!1){if(Array.isArray(e))throw new TypeError("THREE.BufferAttribute: array should be a Typed Array.");this.isBufferAttribute=!0,Object.defineProperty(this,"id",{value:E0++}),this.name="",this.array=e,this.itemSize=t,this.count=e!==void 0?e.length/t:0,this.normalized=n,this.usage=Xl,this.updateRanges=[],this.gpuType=Gn,this.version=0}onUploadCallback(){}set needsUpdate(e){e===!0&&this.version++}setUsage(e){return this.usage=e,this}addUpdateRange(e,t){this.updateRanges.push({start:e,count:t})}clearUpdateRanges(){this.updateRanges.length=0}copy(e){return this.name=e.name,this.array=new e.array.constructor(e.array),this.itemSize=e.itemSize,this.count=e.count,this.normalized=e.normalized,this.usage=e.usage,this.gpuType=e.gpuType,this}copyAt(e,t,n){e*=this.itemSize,n*=t.itemSize;for(let r=0,s=this.itemSize;r<s;r++)this.array[e+r]=t.array[n+r];return this}copyArray(e){return this.array.set(e),this}applyMatrix3(e){if(this.itemSize===2)for(let t=0,n=this.count;t<n;t++)Ia.fromBufferAttribute(this,t),Ia.applyMatrix3(e),this.setXY(t,Ia.x,Ia.y);else if(this.itemSize===3)for(let t=0,n=this.count;t<n;t++)Ut.fromBufferAttribute(this,t),Ut.applyMatrix3(e),this.setXYZ(t,Ut.x,Ut.y,Ut.z);return this}applyMatrix4(e){for(let t=0,n=this.count;t<n;t++)Ut.fromBufferAttribute(this,t),Ut.applyMatrix4(e),this.setXYZ(t,Ut.x,Ut.y,Ut.z);return this}applyNormalMatrix(e){for(let t=0,n=this.count;t<n;t++)Ut.fromBufferAttribute(this,t),Ut.applyNormalMatrix(e),this.setXYZ(t,Ut.x,Ut.y,Ut.z);return this}transformDirection(e){for(let t=0,n=this.count;t<n;t++)Ut.fromBufferAttribute(this,t),Ut.transformDirection(e),this.setXYZ(t,Ut.x,Ut.y,Ut.z);return this}set(e,t=0){return this.array.set(e,t),this}getComponent(e,t){let n=this.array[e*this.itemSize+t];return this.normalized&&(n=Vn(n,this.array)),n}setComponent(e,t,n){return this.normalized&&(n=mt(n,this.array)),this.array[e*this.itemSize+t]=n,this}getX(e){let t=this.array[e*this.itemSize];return this.normalized&&(t=Vn(t,this.array)),t}setX(e,t){return this.normalized&&(t=mt(t,this.array)),this.array[e*this.itemSize]=t,this}getY(e){let t=this.array[e*this.itemSize+1];return this.normalized&&(t=Vn(t,this.array)),t}setY(e,t){return this.normalized&&(t=mt(t,this.array)),this.array[e*this.itemSize+1]=t,this}getZ(e){let t=this.array[e*this.itemSize+2];return this.normalized&&(t=Vn(t,this.array)),t}setZ(e,t){return this.normalized&&(t=mt(t,this.array)),this.array[e*this.itemSize+2]=t,this}getW(e){let t=this.array[e*this.itemSize+3];return this.normalized&&(t=Vn(t,this.array)),t}setW(e,t){return this.normalized&&(t=mt(t,this.array)),this.array[e*this.itemSize+3]=t,this}setXY(e,t,n){return e*=this.itemSize,this.normalized&&(t=mt(t,this.array),n=mt(n,this.array)),this.array[e+0]=t,this.array[e+1]=n,this}setXYZ(e,t,n,r){return e*=this.itemSize,this.normalized&&(t=mt(t,this.array),n=mt(n,this.array),r=mt(r,this.array)),this.array[e+0]=t,this.array[e+1]=n,this.array[e+2]=r,this}setXYZW(e,t,n,r,s){return e*=this.itemSize,this.normalized&&(t=mt(t,this.array),n=mt(n,this.array),r=mt(r,this.array),s=mt(s,this.array)),this.array[e+0]=t,this.array[e+1]=n,this.array[e+2]=r,this.array[e+3]=s,this}onUpload(e){return this.onUploadCallback=e,this}clone(){return new this.constructor(this.array,this.itemSize).copy(this)}toJSON(){const e={itemSize:this.itemSize,type:this.array.constructor.name,array:Array.from(this.array),normalized:this.normalized};return this.name!==""&&(e.name=this.name),this.usage!==Xl&&(e.usage=this.usage),e}}class Of extends hn{constructor(e,t,n){super(new Uint16Array(e),t,n)}}class Bf extends hn{constructor(e,t,n){super(new Uint32Array(e),t,n)}}class ct extends hn{constructor(e,t,n){super(new Float32Array(e),t,n)}}let T0=0;const Rn=new Ke,Ec=new wt,Ir=new P,Sn=new oi,Es=new oi,Yt=new P;class Xt extends fs{constructor(){super(),this.isBufferGeometry=!0,Object.defineProperty(this,"id",{value:T0++}),this.uuid=Fn(),this.name="",this.type="BufferGeometry",this.index=null,this.indirect=null,this.attributes={},this.morphAttributes={},this.morphTargetsRelative=!1,this.groups=[],this.boundingBox=null,this.boundingSphere=null,this.drawRange={start:0,count:1/0},this.userData={}}getIndex(){return this.index}setIndex(e){return Array.isArray(e)?this.index=new(Df(e)?Bf:Of)(e,1):this.index=e,this}setIndirect(e){return this.indirect=e,this}getIndirect(){return this.indirect}getAttribute(e){return this.attributes[e]}setAttribute(e,t){return this.attributes[e]=t,this}deleteAttribute(e){return delete this.attributes[e],this}hasAttribute(e){return this.attributes[e]!==void 0}addGroup(e,t,n=0){this.groups.push({start:e,count:t,materialIndex:n})}clearGroups(){this.groups=[]}setDrawRange(e,t){this.drawRange.start=e,this.drawRange.count=t}applyMatrix4(e){const t=this.attributes.position;t!==void 0&&(t.applyMatrix4(e),t.needsUpdate=!0);const n=this.attributes.normal;if(n!==void 0){const s=new Qe().getNormalMatrix(e);n.applyNormalMatrix(s),n.needsUpdate=!0}const r=this.attributes.tangent;return r!==void 0&&(r.transformDirection(e),r.needsUpdate=!0),this.boundingBox!==null&&this.computeBoundingBox(),this.boundingSphere!==null&&this.computeBoundingSphere(),this}applyQuaternion(e){return Rn.makeRotationFromQuaternion(e),this.applyMatrix4(Rn),this}rotateX(e){return Rn.makeRotationX(e),this.applyMatrix4(Rn),this}rotateY(e){return Rn.makeRotationY(e),this.applyMatrix4(Rn),this}rotateZ(e){return Rn.makeRotationZ(e),this.applyMatrix4(Rn),this}translate(e,t,n){return Rn.makeTranslation(e,t,n),this.applyMatrix4(Rn),this}scale(e,t,n){return Rn.makeScale(e,t,n),this.applyMatrix4(Rn),this}lookAt(e){return Ec.lookAt(e),Ec.updateMatrix(),this.applyMatrix4(Ec.matrix),this}center(){return this.computeBoundingBox(),this.boundingBox.getCenter(Ir).negate(),this.translate(Ir.x,Ir.y,Ir.z),this}setFromPoints(e){const t=this.getAttribute("position");if(t===void 0){const n=[];for(let r=0,s=e.length;r<s;r++){const a=e[r];n.push(a.x,a.y,a.z||0)}this.setAttribute("position",new ct(n,3))}else{const n=Math.min(e.length,t.count);for(let r=0;r<n;r++){const s=e[r];t.setXYZ(r,s.x,s.y,s.z||0)}e.length>t.count&&console.warn("THREE.BufferGeometry: Buffer size too small for points data. Use .dispose() and create a new geometry."),t.needsUpdate=!0}return this}computeBoundingBox(){this.boundingBox===null&&(this.boundingBox=new oi);const e=this.attributes.position,t=this.morphAttributes.position;if(e&&e.isGLBufferAttribute){console.error("THREE.BufferGeometry.computeBoundingBox(): GLBufferAttribute requires a manual bounding box.",this),this.boundingBox.set(new P(-1/0,-1/0,-1/0),new P(1/0,1/0,1/0));return}if(e!==void 0){if(this.boundingBox.setFromBufferAttribute(e),t)for(let n=0,r=t.length;n<r;n++){const s=t[n];Sn.setFromBufferAttribute(s),this.morphTargetsRelative?(Yt.addVectors(this.boundingBox.min,Sn.min),this.boundingBox.expandByPoint(Yt),Yt.addVectors(this.boundingBox.max,Sn.max),this.boundingBox.expandByPoint(Yt)):(this.boundingBox.expandByPoint(Sn.min),this.boundingBox.expandByPoint(Sn.max))}}else this.boundingBox.makeEmpty();(isNaN(this.boundingBox.min.x)||isNaN(this.boundingBox.min.y)||isNaN(this.boundingBox.min.z))&&console.error('THREE.BufferGeometry.computeBoundingBox(): Computed min/max have NaN values. The "position" attribute is likely to have NaN values.',this)}computeBoundingSphere(){this.boundingSphere===null&&(this.boundingSphere=new ci);const e=this.attributes.position,t=this.morphAttributes.position;if(e&&e.isGLBufferAttribute){console.error("THREE.BufferGeometry.computeBoundingSphere(): GLBufferAttribute requires a manual bounding sphere.",this),this.boundingSphere.set(new P,1/0);return}if(e){const n=this.boundingSphere.center;if(Sn.setFromBufferAttribute(e),t)for(let s=0,a=t.length;s<a;s++){const o=t[s];Es.setFromBufferAttribute(o),this.morphTargetsRelative?(Yt.addVectors(Sn.min,Es.min),Sn.expandByPoint(Yt),Yt.addVectors(Sn.max,Es.max),Sn.expandByPoint(Yt)):(Sn.expandByPoint(Es.min),Sn.expandByPoint(Es.max))}Sn.getCenter(n);let r=0;for(let s=0,a=e.count;s<a;s++)Yt.fromBufferAttribute(e,s),r=Math.max(r,n.distanceToSquared(Yt));if(t)for(let s=0,a=t.length;s<a;s++){const o=t[s],c=this.morphTargetsRelative;for(let l=0,u=o.count;l<u;l++)Yt.fromBufferAttribute(o,l),c&&(Ir.fromBufferAttribute(e,l),Yt.add(Ir)),r=Math.max(r,n.distanceToSquared(Yt))}this.boundingSphere.radius=Math.sqrt(r),isNaN(this.boundingSphere.radius)&&console.error('THREE.BufferGeometry.computeBoundingSphere(): Computed radius is NaN. The "position" attribute is likely to have NaN values.',this)}}computeTangents(){const e=this.index,t=this.attributes;if(e===null||t.position===void 0||t.normal===void 0||t.uv===void 0){console.error("THREE.BufferGeometry: .computeTangents() failed. Missing required attributes (index, position, normal or uv)");return}const n=t.position,r=t.normal,s=t.uv;this.hasAttribute("tangent")===!1&&this.setAttribute("tangent",new hn(new Float32Array(4*n.count),4));const a=this.getAttribute("tangent"),o=[],c=[];for(let C=0;C<n.count;C++)o[C]=new P,c[C]=new P;const l=new P,u=new P,d=new P,f=new ue,h=new ue,m=new ue,v=new P,g=new P;function p(C,S,b){l.fromBufferAttribute(n,C),u.fromBufferAttribute(n,S),d.fromBufferAttribute(n,b),f.fromBufferAttribute(s,C),h.fromBufferAttribute(s,S),m.fromBufferAttribute(s,b),u.sub(l),d.sub(l),h.sub(f),m.sub(f);const L=1/(h.x*m.y-m.x*h.y);isFinite(L)&&(v.copy(u).multiplyScalar(m.y).addScaledVector(d,-h.y).multiplyScalar(L),g.copy(d).multiplyScalar(h.x).addScaledVector(u,-m.x).multiplyScalar(L),o[C].add(v),o[S].add(v),o[b].add(v),c[C].add(g),c[S].add(g),c[b].add(g))}let _=this.groups;_.length===0&&(_=[{start:0,count:e.count}]);for(let C=0,S=_.length;C<S;++C){const b=_[C],L=b.start,D=b.count;for(let k=L,H=L+D;k<H;k+=3)p(e.getX(k+0),e.getX(k+1),e.getX(k+2))}const y=new P,x=new P,A=new P,w=new P;function R(C){A.fromBufferAttribute(r,C),w.copy(A);const S=o[C];y.copy(S),y.sub(A.multiplyScalar(A.dot(S))).normalize(),x.crossVectors(w,S);const L=x.dot(c[C])<0?-1:1;a.setXYZW(C,y.x,y.y,y.z,L)}for(let C=0,S=_.length;C<S;++C){const b=_[C],L=b.start,D=b.count;for(let k=L,H=L+D;k<H;k+=3)R(e.getX(k+0)),R(e.getX(k+1)),R(e.getX(k+2))}}computeVertexNormals(){const e=this.index,t=this.getAttribute("position");if(t!==void 0){let n=this.getAttribute("normal");if(n===void 0)n=new hn(new Float32Array(t.count*3),3),this.setAttribute("normal",n);else for(let f=0,h=n.count;f<h;f++)n.setXYZ(f,0,0,0);const r=new P,s=new P,a=new P,o=new P,c=new P,l=new P,u=new P,d=new P;if(e)for(let f=0,h=e.count;f<h;f+=3){const m=e.getX(f+0),v=e.getX(f+1),g=e.getX(f+2);r.fromBufferAttribute(t,m),s.fromBufferAttribute(t,v),a.fromBufferAttribute(t,g),u.subVectors(a,s),d.subVectors(r,s),u.cross(d),o.fromBufferAttribute(n,m),c.fromBufferAttribute(n,v),l.fromBufferAttribute(n,g),o.add(u),c.add(u),l.add(u),n.setXYZ(m,o.x,o.y,o.z),n.setXYZ(v,c.x,c.y,c.z),n.setXYZ(g,l.x,l.y,l.z)}else for(let f=0,h=t.count;f<h;f+=3)r.fromBufferAttribute(t,f+0),s.fromBufferAttribute(t,f+1),a.fromBufferAttribute(t,f+2),u.subVectors(a,s),d.subVectors(r,s),u.cross(d),n.setXYZ(f+0,u.x,u.y,u.z),n.setXYZ(f+1,u.x,u.y,u.z),n.setXYZ(f+2,u.x,u.y,u.z);this.normalizeNormals(),n.needsUpdate=!0}}normalizeNormals(){const e=this.attributes.normal;for(let t=0,n=e.count;t<n;t++)Yt.fromBufferAttribute(e,t),Yt.normalize(),e.setXYZ(t,Yt.x,Yt.y,Yt.z)}toNonIndexed(){function e(o,c){const l=o.array,u=o.itemSize,d=o.normalized,f=new l.constructor(c.length*u);let h=0,m=0;for(let v=0,g=c.length;v<g;v++){o.isInterleavedBufferAttribute?h=c[v]*o.data.stride+o.offset:h=c[v]*u;for(let p=0;p<u;p++)f[m++]=l[h++]}return new hn(f,u,d)}if(this.index===null)return console.warn("THREE.BufferGeometry.toNonIndexed(): BufferGeometry is already non-indexed."),this;const t=new Xt,n=this.index.array,r=this.attributes;for(const o in r){const c=r[o],l=e(c,n);t.setAttribute(o,l)}const s=this.morphAttributes;for(const o in s){const c=[],l=s[o];for(let u=0,d=l.length;u<d;u++){const f=l[u],h=e(f,n);c.push(h)}t.morphAttributes[o]=c}t.morphTargetsRelative=this.morphTargetsRelative;const a=this.groups;for(let o=0,c=a.length;o<c;o++){const l=a[o];t.addGroup(l.start,l.count,l.materialIndex)}return t}toJSON(){const e={metadata:{version:4.7,type:"BufferGeometry",generator:"BufferGeometry.toJSON"}};if(e.uuid=this.uuid,e.type=this.type,this.name!==""&&(e.name=this.name),Object.keys(this.userData).length>0&&(e.userData=this.userData),this.parameters!==void 0){const c=this.parameters;for(const l in c)c[l]!==void 0&&(e[l]=c[l]);return e}e.data={attributes:{}};const t=this.index;t!==null&&(e.data.index={type:t.array.constructor.name,array:Array.prototype.slice.call(t.array)});const n=this.attributes;for(const c in n){const l=n[c];e.data.attributes[c]=l.toJSON(e.data)}const r={};let s=!1;for(const c in this.morphAttributes){const l=this.morphAttributes[c],u=[];for(let d=0,f=l.length;d<f;d++){const h=l[d];u.push(h.toJSON(e.data))}u.length>0&&(r[c]=u,s=!0)}s&&(e.data.morphAttributes=r,e.data.morphTargetsRelative=this.morphTargetsRelative);const a=this.groups;a.length>0&&(e.data.groups=JSON.parse(JSON.stringify(a)));const o=this.boundingSphere;return o!==null&&(e.data.boundingSphere=o.toJSON()),e}clone(){return new this.constructor().copy(this)}copy(e){this.index=null,this.attributes={},this.morphAttributes={},this.groups=[],this.boundingBox=null,this.boundingSphere=null;const t={};this.name=e.name;const n=e.index;n!==null&&this.setIndex(n.clone());const r=e.attributes;for(const l in r){const u=r[l];this.setAttribute(l,u.clone(t))}const s=e.morphAttributes;for(const l in s){const u=[],d=s[l];for(let f=0,h=d.length;f<h;f++)u.push(d[f].clone(t));this.morphAttributes[l]=u}this.morphTargetsRelative=e.morphTargetsRelative;const a=e.groups;for(let l=0,u=a.length;l<u;l++){const d=a[l];this.addGroup(d.start,d.count,d.materialIndex)}const o=e.boundingBox;o!==null&&(this.boundingBox=o.clone());const c=e.boundingSphere;return c!==null&&(this.boundingSphere=c.clone()),this.drawRange.start=e.drawRange.start,this.drawRange.count=e.drawRange.count,this.userData=e.userData,this}dispose(){this.dispatchEvent({type:"dispose"})}}const Bd=new Ke,rr=new No,Da=new ci,kd=new P,Na=new P,Ua=new P,Fa=new P,Tc=new P,Oa=new P,zd=new P,Ba=new P;class Tt extends wt{constructor(e=new Xt,t=new bi){super(),this.isMesh=!0,this.type="Mesh",this.geometry=e,this.material=t,this.morphTargetDictionary=void 0,this.morphTargetInfluences=void 0,this.count=1,this.updateMorphTargets()}copy(e,t){return super.copy(e,t),e.morphTargetInfluences!==void 0&&(this.morphTargetInfluences=e.morphTargetInfluences.slice()),e.morphTargetDictionary!==void 0&&(this.morphTargetDictionary=Object.assign({},e.morphTargetDictionary)),this.material=Array.isArray(e.material)?e.material.slice():e.material,this.geometry=e.geometry,this}updateMorphTargets(){const t=this.geometry.morphAttributes,n=Object.keys(t);if(n.length>0){const r=t[n[0]];if(r!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let s=0,a=r.length;s<a;s++){const o=r[s].name||String(s);this.morphTargetInfluences.push(0),this.morphTargetDictionary[o]=s}}}}getVertexPosition(e,t){const n=this.geometry,r=n.attributes.position,s=n.morphAttributes.position,a=n.morphTargetsRelative;t.fromBufferAttribute(r,e);const o=this.morphTargetInfluences;if(s&&o){Oa.set(0,0,0);for(let c=0,l=s.length;c<l;c++){const u=o[c],d=s[c];u!==0&&(Tc.fromBufferAttribute(d,e),a?Oa.addScaledVector(Tc,u):Oa.addScaledVector(Tc.sub(t),u))}t.add(Oa)}return t}raycast(e,t){const n=this.geometry,r=this.material,s=this.matrixWorld;r!==void 0&&(n.boundingSphere===null&&n.computeBoundingSphere(),Da.copy(n.boundingSphere),Da.applyMatrix4(s),rr.copy(e.ray).recast(e.near),!(Da.containsPoint(rr.origin)===!1&&(rr.intersectSphere(Da,kd)===null||rr.origin.distanceToSquared(kd)>(e.far-e.near)**2))&&(Bd.copy(s).invert(),rr.copy(e.ray).applyMatrix4(Bd),!(n.boundingBox!==null&&rr.intersectsBox(n.boundingBox)===!1)&&this._computeIntersections(e,t,rr)))}_computeIntersections(e,t,n){let r;const s=this.geometry,a=this.material,o=s.index,c=s.attributes.position,l=s.attributes.uv,u=s.attributes.uv1,d=s.attributes.normal,f=s.groups,h=s.drawRange;if(o!==null)if(Array.isArray(a))for(let m=0,v=f.length;m<v;m++){const g=f[m],p=a[g.materialIndex],_=Math.max(g.start,h.start),y=Math.min(o.count,Math.min(g.start+g.count,h.start+h.count));for(let x=_,A=y;x<A;x+=3){const w=o.getX(x),R=o.getX(x+1),C=o.getX(x+2);r=ka(this,p,e,n,l,u,d,w,R,C),r&&(r.faceIndex=Math.floor(x/3),r.face.materialIndex=g.materialIndex,t.push(r))}}else{const m=Math.max(0,h.start),v=Math.min(o.count,h.start+h.count);for(let g=m,p=v;g<p;g+=3){const _=o.getX(g),y=o.getX(g+1),x=o.getX(g+2);r=ka(this,a,e,n,l,u,d,_,y,x),r&&(r.faceIndex=Math.floor(g/3),t.push(r))}}else if(c!==void 0)if(Array.isArray(a))for(let m=0,v=f.length;m<v;m++){const g=f[m],p=a[g.materialIndex],_=Math.max(g.start,h.start),y=Math.min(c.count,Math.min(g.start+g.count,h.start+h.count));for(let x=_,A=y;x<A;x+=3){const w=x,R=x+1,C=x+2;r=ka(this,p,e,n,l,u,d,w,R,C),r&&(r.faceIndex=Math.floor(x/3),r.face.materialIndex=g.materialIndex,t.push(r))}}else{const m=Math.max(0,h.start),v=Math.min(c.count,h.start+h.count);for(let g=m,p=v;g<p;g+=3){const _=g,y=g+1,x=g+2;r=ka(this,a,e,n,l,u,d,_,y,x),r&&(r.faceIndex=Math.floor(g/3),t.push(r))}}}}function A0(i,e,t,n,r,s,a,o){let c;if(e.side===un?c=n.intersectTriangle(a,s,r,!0,o):c=n.intersectTriangle(r,s,a,e.side===Ci,o),c===null)return null;Ba.copy(o),Ba.applyMatrix4(i.matrixWorld);const l=t.ray.origin.distanceTo(Ba);return l<t.near||l>t.far?null:{distance:l,point:Ba.clone(),object:i}}function ka(i,e,t,n,r,s,a,o,c,l){i.getVertexPosition(o,Na),i.getVertexPosition(c,Ua),i.getVertexPosition(l,Fa);const u=A0(i,e,t,n,Na,Ua,Fa,zd);if(u){const d=new P;Dn.getBarycoord(zd,Na,Ua,Fa,d),r&&(u.uv=Dn.getInterpolatedAttribute(r,o,c,l,d,new ue)),s&&(u.uv1=Dn.getInterpolatedAttribute(s,o,c,l,d,new ue)),a&&(u.normal=Dn.getInterpolatedAttribute(a,o,c,l,d,new P),u.normal.dot(n.direction)>0&&u.normal.multiplyScalar(-1));const f={a:o,b:c,c:l,normal:new P,materialIndex:0};Dn.getNormal(Na,Ua,Fa,f.normal),u.face=f,u.barycoord=d}return u}class xr extends Xt{constructor(e=1,t=1,n=1,r=1,s=1,a=1){super(),this.type="BoxGeometry",this.parameters={width:e,height:t,depth:n,widthSegments:r,heightSegments:s,depthSegments:a};const o=this;r=Math.floor(r),s=Math.floor(s),a=Math.floor(a);const c=[],l=[],u=[],d=[];let f=0,h=0;m("z","y","x",-1,-1,n,t,e,a,s,0),m("z","y","x",1,-1,n,t,-e,a,s,1),m("x","z","y",1,1,e,n,t,r,a,2),m("x","z","y",1,-1,e,n,-t,r,a,3),m("x","y","z",1,-1,e,t,n,r,s,4),m("x","y","z",-1,-1,e,t,-n,r,s,5),this.setIndex(c),this.setAttribute("position",new ct(l,3)),this.setAttribute("normal",new ct(u,3)),this.setAttribute("uv",new ct(d,2));function m(v,g,p,_,y,x,A,w,R,C,S){const b=x/R,L=A/C,D=x/2,k=A/2,H=w/2,X=R+1,V=C+1;let K=0,G=0;const se=new P;for(let me=0;me<V;me++){const _e=me*L-k;for(let Be=0;Be<X;Be++){const lt=Be*b-D;se[v]=lt*_,se[g]=_e*y,se[p]=H,l.push(se.x,se.y,se.z),se[v]=0,se[g]=0,se[p]=w>0?1:-1,u.push(se.x,se.y,se.z),d.push(Be/R),d.push(1-me/C),K+=1}}for(let me=0;me<C;me++)for(let _e=0;_e<R;_e++){const Be=f+_e+X*me,lt=f+_e+X*(me+1),$e=f+(_e+1)+X*(me+1),st=f+(_e+1)+X*me;c.push(Be,lt,st),c.push(lt,$e,st),G+=6}o.addGroup(h,G,S),h+=G,f+=K}}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new xr(e.width,e.height,e.depth,e.widthSegments,e.heightSegments,e.depthSegments)}}function as(i){const e={};for(const t in i){e[t]={};for(const n in i[t]){const r=i[t][n];r&&(r.isColor||r.isMatrix3||r.isMatrix4||r.isVector2||r.isVector3||r.isVector4||r.isTexture||r.isQuaternion)?r.isRenderTargetTexture?(console.warn("UniformsUtils: Textures of render targets cannot be cloned via cloneUniforms() or mergeUniforms()."),e[t][n]=null):e[t][n]=r.clone():Array.isArray(r)?e[t][n]=r.slice():e[t][n]=r}}return e}function an(i){const e={};for(let t=0;t<i.length;t++){const n=as(i[t]);for(const r in n)e[r]=n[r]}return e}function R0(i){const e=[];for(let t=0;t<i.length;t++)e.push(i[t].clone());return e}function kf(i){const e=i.getRenderTarget();return e===null?i.outputColorSpace:e.isXRRenderTarget===!0?e.texture.colorSpace:at.workingColorSpace}const C0={clone:as,merge:an};var L0=`void main() {
	gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}`,P0=`void main() {
	gl_FragColor = vec4( 1.0, 0.0, 0.0, 1.0 );
}`;class ji extends On{constructor(e){super(),this.isShaderMaterial=!0,this.type="ShaderMaterial",this.defines={},this.uniforms={},this.uniformsGroups=[],this.vertexShader=L0,this.fragmentShader=P0,this.linewidth=1,this.wireframe=!1,this.wireframeLinewidth=1,this.fog=!1,this.lights=!1,this.clipping=!1,this.forceSinglePass=!0,this.extensions={clipCullDistance:!1,multiDraw:!1},this.defaultAttributeValues={color:[1,1,1],uv:[0,0],uv1:[0,0]},this.index0AttributeName=void 0,this.uniformsNeedUpdate=!1,this.glslVersion=null,e!==void 0&&this.setValues(e)}copy(e){return super.copy(e),this.fragmentShader=e.fragmentShader,this.vertexShader=e.vertexShader,this.uniforms=as(e.uniforms),this.uniformsGroups=R0(e.uniformsGroups),this.defines=Object.assign({},e.defines),this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.fog=e.fog,this.lights=e.lights,this.clipping=e.clipping,this.extensions=Object.assign({},e.extensions),this.glslVersion=e.glslVersion,this}toJSON(e){const t=super.toJSON(e);t.glslVersion=this.glslVersion,t.uniforms={};for(const r in this.uniforms){const a=this.uniforms[r].value;a&&a.isTexture?t.uniforms[r]={type:"t",value:a.toJSON(e).uuid}:a&&a.isColor?t.uniforms[r]={type:"c",value:a.getHex()}:a&&a.isVector2?t.uniforms[r]={type:"v2",value:a.toArray()}:a&&a.isVector3?t.uniforms[r]={type:"v3",value:a.toArray()}:a&&a.isVector4?t.uniforms[r]={type:"v4",value:a.toArray()}:a&&a.isMatrix3?t.uniforms[r]={type:"m3",value:a.toArray()}:a&&a.isMatrix4?t.uniforms[r]={type:"m4",value:a.toArray()}:t.uniforms[r]={value:a}}Object.keys(this.defines).length>0&&(t.defines=this.defines),t.vertexShader=this.vertexShader,t.fragmentShader=this.fragmentShader,t.lights=this.lights,t.clipping=this.clipping;const n={};for(const r in this.extensions)this.extensions[r]===!0&&(n[r]=!0);return Object.keys(n).length>0&&(t.extensions=n),t}}class zf extends wt{constructor(){super(),this.isCamera=!0,this.type="Camera",this.matrixWorldInverse=new Ke,this.projectionMatrix=new Ke,this.projectionMatrixInverse=new Ke,this.coordinateSystem=ni,this._reversedDepth=!1}get reversedDepth(){return this._reversedDepth}copy(e,t){return super.copy(e,t),this.matrixWorldInverse.copy(e.matrixWorldInverse),this.projectionMatrix.copy(e.projectionMatrix),this.projectionMatrixInverse.copy(e.projectionMatrixInverse),this.coordinateSystem=e.coordinateSystem,this}getWorldDirection(e){return super.getWorldDirection(e).negate()}updateMatrixWorld(e){super.updateMatrixWorld(e),this.matrixWorldInverse.copy(this.matrixWorld).invert()}updateWorldMatrix(e,t){super.updateWorldMatrix(e,t),this.matrixWorldInverse.copy(this.matrixWorld).invert()}clone(){return new this.constructor().copy(this)}}const Ui=new P,Hd=new ue,Vd=new ue;class nn extends zf{constructor(e=50,t=1,n=.1,r=2e3){super(),this.isPerspectiveCamera=!0,this.type="PerspectiveCamera",this.fov=e,this.zoom=1,this.near=n,this.far=r,this.focus=10,this.aspect=t,this.view=null,this.filmGauge=35,this.filmOffset=0,this.updateProjectionMatrix()}copy(e,t){return super.copy(e,t),this.fov=e.fov,this.zoom=e.zoom,this.near=e.near,this.far=e.far,this.focus=e.focus,this.aspect=e.aspect,this.view=e.view===null?null:Object.assign({},e.view),this.filmGauge=e.filmGauge,this.filmOffset=e.filmOffset,this}setFocalLength(e){const t=.5*this.getFilmHeight()/e;this.fov=ss*2*Math.atan(t),this.updateProjectionMatrix()}getFocalLength(){const e=Math.tan(Vs*.5*this.fov);return .5*this.getFilmHeight()/e}getEffectiveFOV(){return ss*2*Math.atan(Math.tan(Vs*.5*this.fov)/this.zoom)}getFilmWidth(){return this.filmGauge*Math.min(this.aspect,1)}getFilmHeight(){return this.filmGauge/Math.max(this.aspect,1)}getViewBounds(e,t,n){Ui.set(-1,-1,.5).applyMatrix4(this.projectionMatrixInverse),t.set(Ui.x,Ui.y).multiplyScalar(-e/Ui.z),Ui.set(1,1,.5).applyMatrix4(this.projectionMatrixInverse),n.set(Ui.x,Ui.y).multiplyScalar(-e/Ui.z)}getViewSize(e,t){return this.getViewBounds(e,Hd,Vd),t.subVectors(Vd,Hd)}setViewOffset(e,t,n,r,s,a){this.aspect=e/t,this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=e,this.view.fullHeight=t,this.view.offsetX=n,this.view.offsetY=r,this.view.width=s,this.view.height=a,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){const e=this.near;let t=e*Math.tan(Vs*.5*this.fov)/this.zoom,n=2*t,r=this.aspect*n,s=-.5*r;const a=this.view;if(this.view!==null&&this.view.enabled){const c=a.fullWidth,l=a.fullHeight;s+=a.offsetX*r/c,t-=a.offsetY*n/l,r*=a.width/c,n*=a.height/l}const o=this.filmOffset;o!==0&&(s+=e*o/this.getFilmWidth()),this.projectionMatrix.makePerspective(s,s+r,t,t-n,e,this.far,this.coordinateSystem,this.reversedDepth),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(e){const t=super.toJSON(e);return t.object.fov=this.fov,t.object.zoom=this.zoom,t.object.near=this.near,t.object.far=this.far,t.object.focus=this.focus,t.object.aspect=this.aspect,this.view!==null&&(t.object.view=Object.assign({},this.view)),t.object.filmGauge=this.filmGauge,t.object.filmOffset=this.filmOffset,t}}const Dr=-90,Nr=1;class I0 extends wt{constructor(e,t,n){super(),this.type="CubeCamera",this.renderTarget=n,this.coordinateSystem=null,this.activeMipmapLevel=0;const r=new nn(Dr,Nr,e,t);r.layers=this.layers,this.add(r);const s=new nn(Dr,Nr,e,t);s.layers=this.layers,this.add(s);const a=new nn(Dr,Nr,e,t);a.layers=this.layers,this.add(a);const o=new nn(Dr,Nr,e,t);o.layers=this.layers,this.add(o);const c=new nn(Dr,Nr,e,t);c.layers=this.layers,this.add(c);const l=new nn(Dr,Nr,e,t);l.layers=this.layers,this.add(l)}updateCoordinateSystem(){const e=this.coordinateSystem,t=this.children.concat(),[n,r,s,a,o,c]=t;for(const l of t)this.remove(l);if(e===ni)n.up.set(0,1,0),n.lookAt(1,0,0),r.up.set(0,1,0),r.lookAt(-1,0,0),s.up.set(0,0,-1),s.lookAt(0,1,0),a.up.set(0,0,1),a.lookAt(0,-1,0),o.up.set(0,1,0),o.lookAt(0,0,1),c.up.set(0,1,0),c.lookAt(0,0,-1);else if(e===So)n.up.set(0,-1,0),n.lookAt(-1,0,0),r.up.set(0,-1,0),r.lookAt(1,0,0),s.up.set(0,0,1),s.lookAt(0,1,0),a.up.set(0,0,-1),a.lookAt(0,-1,0),o.up.set(0,-1,0),o.lookAt(0,0,1),c.up.set(0,-1,0),c.lookAt(0,0,-1);else throw new Error("THREE.CubeCamera.updateCoordinateSystem(): Invalid coordinate system: "+e);for(const l of t)this.add(l),l.updateMatrixWorld()}update(e,t){this.parent===null&&this.updateMatrixWorld();const{renderTarget:n,activeMipmapLevel:r}=this;this.coordinateSystem!==e.coordinateSystem&&(this.coordinateSystem=e.coordinateSystem,this.updateCoordinateSystem());const[s,a,o,c,l,u]=this.children,d=e.getRenderTarget(),f=e.getActiveCubeFace(),h=e.getActiveMipmapLevel(),m=e.xr.enabled;e.xr.enabled=!1;const v=n.texture.generateMipmaps;n.texture.generateMipmaps=!1,e.setRenderTarget(n,0,r),e.render(t,s),e.setRenderTarget(n,1,r),e.render(t,a),e.setRenderTarget(n,2,r),e.render(t,o),e.setRenderTarget(n,3,r),e.render(t,c),e.setRenderTarget(n,4,r),e.render(t,l),n.texture.generateMipmaps=v,e.setRenderTarget(n,5,r),e.render(t,u),e.setRenderTarget(d,f,h),e.xr.enabled=m,n.texture.needsPMREMUpdate=!0}}class Hf extends Vt{constructor(e=[],t=ns,n,r,s,a,o,c,l,u){super(e,t,n,r,s,a,o,c,l,u),this.isCubeTexture=!0,this.flipY=!1}get images(){return this.image}set images(e){this.image=e}}class D0 extends _r{constructor(e=1,t={}){super(e,e,t),this.isWebGLCubeRenderTarget=!0;const n={width:e,height:e,depth:1},r=[n,n,n,n,n,n];this.texture=new Hf(r),this._setTextureOptions(t),this.texture.isRenderTargetTexture=!0}fromEquirectangularTexture(e,t){this.texture.type=t.type,this.texture.colorSpace=t.colorSpace,this.texture.generateMipmaps=t.generateMipmaps,this.texture.minFilter=t.minFilter,this.texture.magFilter=t.magFilter;const n={uniforms:{tEquirect:{value:null}},vertexShader:`

				varying vec3 vWorldDirection;

				vec3 transformDirection( in vec3 dir, in mat4 matrix ) {

					return normalize( ( matrix * vec4( dir, 0.0 ) ).xyz );

				}

				void main() {

					vWorldDirection = transformDirection( position, modelMatrix );

					#include <begin_vertex>
					#include <project_vertex>

				}
			`,fragmentShader:`

				uniform sampler2D tEquirect;

				varying vec3 vWorldDirection;

				#include <common>

				void main() {

					vec3 direction = normalize( vWorldDirection );

					vec2 sampleUV = equirectUv( direction );

					gl_FragColor = texture2D( tEquirect, sampleUV );

				}
			`},r=new xr(5,5,5),s=new ji({name:"CubemapFromEquirect",uniforms:as(n.uniforms),vertexShader:n.vertexShader,fragmentShader:n.fragmentShader,side:un,blending:Gi});s.uniforms.tEquirect.value=t;const a=new Tt(r,s),o=t.minFilter;return t.minFilter===Si&&(t.minFilter=En),new I0(1,10,this).update(e,a),t.minFilter=o,a.geometry.dispose(),a.material.dispose(),this}clear(e,t=!0,n=!0,r=!0){const s=e.getRenderTarget();for(let a=0;a<6;a++)e.setRenderTarget(this,a),e.clear(t,n,r);e.setRenderTarget(s)}}class Zt extends wt{constructor(){super(),this.isGroup=!0,this.type="Group"}}const N0={type:"move"};class Ac{constructor(){this._targetRay=null,this._grip=null,this._hand=null}getHandSpace(){return this._hand===null&&(this._hand=new Zt,this._hand.matrixAutoUpdate=!1,this._hand.visible=!1,this._hand.joints={},this._hand.inputState={pinching:!1}),this._hand}getTargetRaySpace(){return this._targetRay===null&&(this._targetRay=new Zt,this._targetRay.matrixAutoUpdate=!1,this._targetRay.visible=!1,this._targetRay.hasLinearVelocity=!1,this._targetRay.linearVelocity=new P,this._targetRay.hasAngularVelocity=!1,this._targetRay.angularVelocity=new P),this._targetRay}getGripSpace(){return this._grip===null&&(this._grip=new Zt,this._grip.matrixAutoUpdate=!1,this._grip.visible=!1,this._grip.hasLinearVelocity=!1,this._grip.linearVelocity=new P,this._grip.hasAngularVelocity=!1,this._grip.angularVelocity=new P),this._grip}dispatchEvent(e){return this._targetRay!==null&&this._targetRay.dispatchEvent(e),this._grip!==null&&this._grip.dispatchEvent(e),this._hand!==null&&this._hand.dispatchEvent(e),this}connect(e){if(e&&e.hand){const t=this._hand;if(t)for(const n of e.hand.values())this._getHandJoint(t,n)}return this.dispatchEvent({type:"connected",data:e}),this}disconnect(e){return this.dispatchEvent({type:"disconnected",data:e}),this._targetRay!==null&&(this._targetRay.visible=!1),this._grip!==null&&(this._grip.visible=!1),this._hand!==null&&(this._hand.visible=!1),this}update(e,t,n){let r=null,s=null,a=null;const o=this._targetRay,c=this._grip,l=this._hand;if(e&&t.session.visibilityState!=="visible-blurred"){if(l&&e.hand){a=!0;for(const v of e.hand.values()){const g=t.getJointPose(v,n),p=this._getHandJoint(l,v);g!==null&&(p.matrix.fromArray(g.transform.matrix),p.matrix.decompose(p.position,p.rotation,p.scale),p.matrixWorldNeedsUpdate=!0,p.jointRadius=g.radius),p.visible=g!==null}const u=l.joints["index-finger-tip"],d=l.joints["thumb-tip"],f=u.position.distanceTo(d.position),h=.02,m=.005;l.inputState.pinching&&f>h+m?(l.inputState.pinching=!1,this.dispatchEvent({type:"pinchend",handedness:e.handedness,target:this})):!l.inputState.pinching&&f<=h-m&&(l.inputState.pinching=!0,this.dispatchEvent({type:"pinchstart",handedness:e.handedness,target:this}))}else c!==null&&e.gripSpace&&(s=t.getPose(e.gripSpace,n),s!==null&&(c.matrix.fromArray(s.transform.matrix),c.matrix.decompose(c.position,c.rotation,c.scale),c.matrixWorldNeedsUpdate=!0,s.linearVelocity?(c.hasLinearVelocity=!0,c.linearVelocity.copy(s.linearVelocity)):c.hasLinearVelocity=!1,s.angularVelocity?(c.hasAngularVelocity=!0,c.angularVelocity.copy(s.angularVelocity)):c.hasAngularVelocity=!1));o!==null&&(r=t.getPose(e.targetRaySpace,n),r===null&&s!==null&&(r=s),r!==null&&(o.matrix.fromArray(r.transform.matrix),o.matrix.decompose(o.position,o.rotation,o.scale),o.matrixWorldNeedsUpdate=!0,r.linearVelocity?(o.hasLinearVelocity=!0,o.linearVelocity.copy(r.linearVelocity)):o.hasLinearVelocity=!1,r.angularVelocity?(o.hasAngularVelocity=!0,o.angularVelocity.copy(r.angularVelocity)):o.hasAngularVelocity=!1,this.dispatchEvent(N0)))}return o!==null&&(o.visible=r!==null),c!==null&&(c.visible=s!==null),l!==null&&(l.visible=a!==null),this}_getHandJoint(e,t){if(e.joints[t.jointName]===void 0){const n=new Zt;n.matrixAutoUpdate=!1,n.visible=!1,e.joints[t.jointName]=n,e.add(n)}return e.joints[t.jointName]}}class Uo extends wt{constructor(){super(),this.isScene=!0,this.type="Scene",this.background=null,this.environment=null,this.fog=null,this.backgroundBlurriness=0,this.backgroundIntensity=1,this.backgroundRotation=new qn,this.environmentIntensity=1,this.environmentRotation=new qn,this.overrideMaterial=null,typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}copy(e,t){return super.copy(e,t),e.background!==null&&(this.background=e.background.clone()),e.environment!==null&&(this.environment=e.environment.clone()),e.fog!==null&&(this.fog=e.fog.clone()),this.backgroundBlurriness=e.backgroundBlurriness,this.backgroundIntensity=e.backgroundIntensity,this.backgroundRotation.copy(e.backgroundRotation),this.environmentIntensity=e.environmentIntensity,this.environmentRotation.copy(e.environmentRotation),e.overrideMaterial!==null&&(this.overrideMaterial=e.overrideMaterial.clone()),this.matrixAutoUpdate=e.matrixAutoUpdate,this}toJSON(e){const t=super.toJSON(e);return this.fog!==null&&(t.object.fog=this.fog.toJSON()),this.backgroundBlurriness>0&&(t.object.backgroundBlurriness=this.backgroundBlurriness),this.backgroundIntensity!==1&&(t.object.backgroundIntensity=this.backgroundIntensity),t.object.backgroundRotation=this.backgroundRotation.toArray(),this.environmentIntensity!==1&&(t.object.environmentIntensity=this.environmentIntensity),t.object.environmentRotation=this.environmentRotation.toArray(),t}}class Vf{constructor(e,t){this.isInterleavedBuffer=!0,this.array=e,this.stride=t,this.count=e!==void 0?e.length/t:0,this.usage=Xl,this.updateRanges=[],this.version=0,this.uuid=Fn()}onUploadCallback(){}set needsUpdate(e){e===!0&&this.version++}setUsage(e){return this.usage=e,this}addUpdateRange(e,t){this.updateRanges.push({start:e,count:t})}clearUpdateRanges(){this.updateRanges.length=0}copy(e){return this.array=new e.array.constructor(e.array),this.count=e.count,this.stride=e.stride,this.usage=e.usage,this}copyAt(e,t,n){e*=this.stride,n*=t.stride;for(let r=0,s=this.stride;r<s;r++)this.array[e+r]=t.array[n+r];return this}set(e,t=0){return this.array.set(e,t),this}clone(e){e.arrayBuffers===void 0&&(e.arrayBuffers={}),this.array.buffer._uuid===void 0&&(this.array.buffer._uuid=Fn()),e.arrayBuffers[this.array.buffer._uuid]===void 0&&(e.arrayBuffers[this.array.buffer._uuid]=this.array.slice(0).buffer);const t=new this.array.constructor(e.arrayBuffers[this.array.buffer._uuid]),n=new this.constructor(t,this.stride);return n.setUsage(this.usage),n}onUpload(e){return this.onUploadCallback=e,this}toJSON(e){return e.arrayBuffers===void 0&&(e.arrayBuffers={}),this.array.buffer._uuid===void 0&&(this.array.buffer._uuid=Fn()),e.arrayBuffers[this.array.buffer._uuid]===void 0&&(e.arrayBuffers[this.array.buffer._uuid]=Array.from(new Uint32Array(this.array.buffer))),{uuid:this.uuid,buffer:this.array.buffer._uuid,type:this.array.constructor.name,stride:this.stride}}}const sn=new P;class aa{constructor(e,t,n,r=!1){this.isInterleavedBufferAttribute=!0,this.name="",this.data=e,this.itemSize=t,this.offset=n,this.normalized=r}get count(){return this.data.count}get array(){return this.data.array}set needsUpdate(e){this.data.needsUpdate=e}applyMatrix4(e){for(let t=0,n=this.data.count;t<n;t++)sn.fromBufferAttribute(this,t),sn.applyMatrix4(e),this.setXYZ(t,sn.x,sn.y,sn.z);return this}applyNormalMatrix(e){for(let t=0,n=this.count;t<n;t++)sn.fromBufferAttribute(this,t),sn.applyNormalMatrix(e),this.setXYZ(t,sn.x,sn.y,sn.z);return this}transformDirection(e){for(let t=0,n=this.count;t<n;t++)sn.fromBufferAttribute(this,t),sn.transformDirection(e),this.setXYZ(t,sn.x,sn.y,sn.z);return this}getComponent(e,t){let n=this.array[e*this.data.stride+this.offset+t];return this.normalized&&(n=Vn(n,this.array)),n}setComponent(e,t,n){return this.normalized&&(n=mt(n,this.array)),this.data.array[e*this.data.stride+this.offset+t]=n,this}setX(e,t){return this.normalized&&(t=mt(t,this.array)),this.data.array[e*this.data.stride+this.offset]=t,this}setY(e,t){return this.normalized&&(t=mt(t,this.array)),this.data.array[e*this.data.stride+this.offset+1]=t,this}setZ(e,t){return this.normalized&&(t=mt(t,this.array)),this.data.array[e*this.data.stride+this.offset+2]=t,this}setW(e,t){return this.normalized&&(t=mt(t,this.array)),this.data.array[e*this.data.stride+this.offset+3]=t,this}getX(e){let t=this.data.array[e*this.data.stride+this.offset];return this.normalized&&(t=Vn(t,this.array)),t}getY(e){let t=this.data.array[e*this.data.stride+this.offset+1];return this.normalized&&(t=Vn(t,this.array)),t}getZ(e){let t=this.data.array[e*this.data.stride+this.offset+2];return this.normalized&&(t=Vn(t,this.array)),t}getW(e){let t=this.data.array[e*this.data.stride+this.offset+3];return this.normalized&&(t=Vn(t,this.array)),t}setXY(e,t,n){return e=e*this.data.stride+this.offset,this.normalized&&(t=mt(t,this.array),n=mt(n,this.array)),this.data.array[e+0]=t,this.data.array[e+1]=n,this}setXYZ(e,t,n,r){return e=e*this.data.stride+this.offset,this.normalized&&(t=mt(t,this.array),n=mt(n,this.array),r=mt(r,this.array)),this.data.array[e+0]=t,this.data.array[e+1]=n,this.data.array[e+2]=r,this}setXYZW(e,t,n,r,s){return e=e*this.data.stride+this.offset,this.normalized&&(t=mt(t,this.array),n=mt(n,this.array),r=mt(r,this.array),s=mt(s,this.array)),this.data.array[e+0]=t,this.data.array[e+1]=n,this.data.array[e+2]=r,this.data.array[e+3]=s,this}clone(e){if(e===void 0){console.log("THREE.InterleavedBufferAttribute.clone(): Cloning an interleaved buffer attribute will de-interleave buffer data.");const t=[];for(let n=0;n<this.count;n++){const r=n*this.data.stride+this.offset;for(let s=0;s<this.itemSize;s++)t.push(this.data.array[r+s])}return new hn(new this.array.constructor(t),this.itemSize,this.normalized)}else return e.interleavedBuffers===void 0&&(e.interleavedBuffers={}),e.interleavedBuffers[this.data.uuid]===void 0&&(e.interleavedBuffers[this.data.uuid]=this.data.clone(e)),new aa(e.interleavedBuffers[this.data.uuid],this.itemSize,this.offset,this.normalized)}toJSON(e){if(e===void 0){console.log("THREE.InterleavedBufferAttribute.toJSON(): Serializing an interleaved buffer attribute will de-interleave buffer data.");const t=[];for(let n=0;n<this.count;n++){const r=n*this.data.stride+this.offset;for(let s=0;s<this.itemSize;s++)t.push(this.data.array[r+s])}return{itemSize:this.itemSize,type:this.array.constructor.name,array:t,normalized:this.normalized}}else return e.interleavedBuffers===void 0&&(e.interleavedBuffers={}),e.interleavedBuffers[this.data.uuid]===void 0&&(e.interleavedBuffers[this.data.uuid]=this.data.toJSON(e)),{isInterleavedBufferAttribute:!0,itemSize:this.itemSize,data:this.data.uuid,offset:this.offset,normalized:this.normalized}}}class Lu extends On{constructor(e){super(),this.isSpriteMaterial=!0,this.type="SpriteMaterial",this.color=new We(16777215),this.map=null,this.alphaMap=null,this.rotation=0,this.sizeAttenuation=!0,this.transparent=!0,this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.color.copy(e.color),this.map=e.map,this.alphaMap=e.alphaMap,this.rotation=e.rotation,this.sizeAttenuation=e.sizeAttenuation,this.fog=e.fog,this}}let Ur;const Ts=new P,Fr=new P,Or=new P,Br=new ue,As=new ue,Gf=new Ke,za=new P,Rs=new P,Ha=new P,Gd=new ue,Rc=new ue,Wd=new ue;class Wf extends wt{constructor(e=new Lu){if(super(),this.isSprite=!0,this.type="Sprite",Ur===void 0){Ur=new Xt;const t=new Float32Array([-.5,-.5,0,0,0,.5,-.5,0,1,0,.5,.5,0,1,1,-.5,.5,0,0,1]),n=new Vf(t,5);Ur.setIndex([0,1,2,0,2,3]),Ur.setAttribute("position",new aa(n,3,0,!1)),Ur.setAttribute("uv",new aa(n,2,3,!1))}this.geometry=Ur,this.material=e,this.center=new ue(.5,.5),this.count=1}raycast(e,t){e.camera===null&&console.error('THREE.Sprite: "Raycaster.camera" needs to be set in order to raycast against sprites.'),Fr.setFromMatrixScale(this.matrixWorld),Gf.copy(e.camera.matrixWorld),this.modelViewMatrix.multiplyMatrices(e.camera.matrixWorldInverse,this.matrixWorld),Or.setFromMatrixPosition(this.modelViewMatrix),e.camera.isPerspectiveCamera&&this.material.sizeAttenuation===!1&&Fr.multiplyScalar(-Or.z);const n=this.material.rotation;let r,s;n!==0&&(s=Math.cos(n),r=Math.sin(n));const a=this.center;Va(za.set(-.5,-.5,0),Or,a,Fr,r,s),Va(Rs.set(.5,-.5,0),Or,a,Fr,r,s),Va(Ha.set(.5,.5,0),Or,a,Fr,r,s),Gd.set(0,0),Rc.set(1,0),Wd.set(1,1);let o=e.ray.intersectTriangle(za,Rs,Ha,!1,Ts);if(o===null&&(Va(Rs.set(-.5,.5,0),Or,a,Fr,r,s),Rc.set(0,1),o=e.ray.intersectTriangle(za,Ha,Rs,!1,Ts),o===null))return;const c=e.ray.origin.distanceTo(Ts);c<e.near||c>e.far||t.push({distance:c,point:Ts.clone(),uv:Dn.getInterpolation(Ts,za,Rs,Ha,Gd,Rc,Wd,new ue),face:null,object:this})}copy(e,t){return super.copy(e,t),e.center!==void 0&&this.center.copy(e.center),this.material=e.material,this}}function Va(i,e,t,n,r,s){Br.subVectors(i,t).addScalar(.5).multiply(n),r!==void 0?(As.x=s*Br.x-r*Br.y,As.y=r*Br.x+s*Br.y):As.copy(Br),i.copy(e),i.x+=As.x,i.y+=As.y,i.applyMatrix4(Gf)}const $d=new P,Xd=new ht,qd=new ht,U0=new P,jd=new Ke,Ga=new P,Cc=new ci,Yd=new Ke,Lc=new No;class F0 extends Tt{constructor(e,t){super(e,t),this.isSkinnedMesh=!0,this.type="SkinnedMesh",this.bindMode=yd,this.bindMatrix=new Ke,this.bindMatrixInverse=new Ke,this.boundingBox=null,this.boundingSphere=null}computeBoundingBox(){const e=this.geometry;this.boundingBox===null&&(this.boundingBox=new oi),this.boundingBox.makeEmpty();const t=e.getAttribute("position");for(let n=0;n<t.count;n++)this.getVertexPosition(n,Ga),this.boundingBox.expandByPoint(Ga)}computeBoundingSphere(){const e=this.geometry;this.boundingSphere===null&&(this.boundingSphere=new ci),this.boundingSphere.makeEmpty();const t=e.getAttribute("position");for(let n=0;n<t.count;n++)this.getVertexPosition(n,Ga),this.boundingSphere.expandByPoint(Ga)}copy(e,t){return super.copy(e,t),this.bindMode=e.bindMode,this.bindMatrix.copy(e.bindMatrix),this.bindMatrixInverse.copy(e.bindMatrixInverse),this.skeleton=e.skeleton,e.boundingBox!==null&&(this.boundingBox=e.boundingBox.clone()),e.boundingSphere!==null&&(this.boundingSphere=e.boundingSphere.clone()),this}raycast(e,t){const n=this.material,r=this.matrixWorld;n!==void 0&&(this.boundingSphere===null&&this.computeBoundingSphere(),Cc.copy(this.boundingSphere),Cc.applyMatrix4(r),e.ray.intersectsSphere(Cc)!==!1&&(Yd.copy(r).invert(),Lc.copy(e.ray).applyMatrix4(Yd),!(this.boundingBox!==null&&Lc.intersectsBox(this.boundingBox)===!1)&&this._computeIntersections(e,t,Lc)))}getVertexPosition(e,t){return super.getVertexPosition(e,t),this.applyBoneTransform(e,t),t}bind(e,t){this.skeleton=e,t===void 0&&(this.updateMatrixWorld(!0),this.skeleton.calculateInverses(),t=this.matrixWorld),this.bindMatrix.copy(t),this.bindMatrixInverse.copy(t).invert()}pose(){this.skeleton.pose()}normalizeSkinWeights(){const e=new ht,t=this.geometry.attributes.skinWeight;for(let n=0,r=t.count;n<r;n++){e.fromBufferAttribute(t,n);const s=1/e.manhattanLength();s!==1/0?e.multiplyScalar(s):e.set(1,0,0,0),t.setXYZW(n,e.x,e.y,e.z,e.w)}}updateMatrixWorld(e){super.updateMatrixWorld(e),this.bindMode===yd?this.bindMatrixInverse.copy(this.matrixWorld).invert():this.bindMode===Dg?this.bindMatrixInverse.copy(this.bindMatrix).invert():console.warn("THREE.SkinnedMesh: Unrecognized bindMode: "+this.bindMode)}applyBoneTransform(e,t){const n=this.skeleton,r=this.geometry;Xd.fromBufferAttribute(r.attributes.skinIndex,e),qd.fromBufferAttribute(r.attributes.skinWeight,e),$d.copy(t).applyMatrix4(this.bindMatrix),t.set(0,0,0);for(let s=0;s<4;s++){const a=qd.getComponent(s);if(a!==0){const o=Xd.getComponent(s);jd.multiplyMatrices(n.bones[o].matrixWorld,n.boneInverses[o]),t.addScaledVector(U0.copy($d).applyMatrix4(jd),a)}}return t.applyMatrix4(this.bindMatrixInverse)}}class $f extends wt{constructor(){super(),this.isBone=!0,this.type="Bone"}}class Xf extends Vt{constructor(e=null,t=1,n=1,r,s,a,o,c,l=dn,u=dn,d,f){super(null,a,o,c,l,u,r,s,d,f),this.isDataTexture=!0,this.image={data:e,width:t,height:n},this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}}const Kd=new Ke,O0=new Ke;class Pu{constructor(e=[],t=[]){this.uuid=Fn(),this.bones=e.slice(0),this.boneInverses=t,this.boneMatrices=null,this.boneTexture=null,this.init()}init(){const e=this.bones,t=this.boneInverses;if(this.boneMatrices=new Float32Array(e.length*16),t.length===0)this.calculateInverses();else if(e.length!==t.length){console.warn("THREE.Skeleton: Number of inverse bone matrices does not match amount of bones."),this.boneInverses=[];for(let n=0,r=this.bones.length;n<r;n++)this.boneInverses.push(new Ke)}}calculateInverses(){this.boneInverses.length=0;for(let e=0,t=this.bones.length;e<t;e++){const n=new Ke;this.bones[e]&&n.copy(this.bones[e].matrixWorld).invert(),this.boneInverses.push(n)}}pose(){for(let e=0,t=this.bones.length;e<t;e++){const n=this.bones[e];n&&n.matrixWorld.copy(this.boneInverses[e]).invert()}for(let e=0,t=this.bones.length;e<t;e++){const n=this.bones[e];n&&(n.parent&&n.parent.isBone?(n.matrix.copy(n.parent.matrixWorld).invert(),n.matrix.multiply(n.matrixWorld)):n.matrix.copy(n.matrixWorld),n.matrix.decompose(n.position,n.quaternion,n.scale))}}update(){const e=this.bones,t=this.boneInverses,n=this.boneMatrices,r=this.boneTexture;for(let s=0,a=e.length;s<a;s++){const o=e[s]?e[s].matrixWorld:O0;Kd.multiplyMatrices(o,t[s]),Kd.toArray(n,s*16)}r!==null&&(r.needsUpdate=!0)}clone(){return new Pu(this.bones,this.boneInverses)}computeBoneTexture(){let e=Math.sqrt(this.bones.length*4);e=Math.ceil(e/4)*4,e=Math.max(e,4);const t=new Float32Array(e*e*4);t.set(this.boneMatrices);const n=new Xf(t,e,e,Un,Gn);return n.needsUpdate=!0,this.boneMatrices=t,this.boneTexture=n,this}getBoneByName(e){for(let t=0,n=this.bones.length;t<n;t++){const r=this.bones[t];if(r.name===e)return r}}dispose(){this.boneTexture!==null&&(this.boneTexture.dispose(),this.boneTexture=null)}fromJSON(e,t){this.uuid=e.uuid;for(let n=0,r=e.bones.length;n<r;n++){const s=e.bones[n];let a=t[s];a===void 0&&(console.warn("THREE.Skeleton: No bone found with UUID:",s),a=new $f),this.bones.push(a),this.boneInverses.push(new Ke().fromArray(e.boneInverses[n]))}return this.init(),this}toJSON(){const e={metadata:{version:4.7,type:"Skeleton",generator:"Skeleton.toJSON"},bones:[],boneInverses:[]};e.uuid=this.uuid;const t=this.bones,n=this.boneInverses;for(let r=0,s=t.length;r<s;r++){const a=t[r];e.bones.push(a.uuid);const o=n[r];e.boneInverses.push(o.toArray())}return e}}class ql extends hn{constructor(e,t,n,r=1){super(e,t,n),this.isInstancedBufferAttribute=!0,this.meshPerAttribute=r}copy(e){return super.copy(e),this.meshPerAttribute=e.meshPerAttribute,this}toJSON(){const e=super.toJSON();return e.meshPerAttribute=this.meshPerAttribute,e.isInstancedBufferAttribute=!0,e}}const kr=new Ke,Zd=new Ke,Wa=[],Jd=new oi,B0=new Ke,Cs=new Tt,Ls=new ci;class qf extends Tt{constructor(e,t,n){super(e,t),this.isInstancedMesh=!0,this.instanceMatrix=new ql(new Float32Array(n*16),16),this.instanceColor=null,this.morphTexture=null,this.count=n,this.boundingBox=null,this.boundingSphere=null;for(let r=0;r<n;r++)this.setMatrixAt(r,B0)}computeBoundingBox(){const e=this.geometry,t=this.count;this.boundingBox===null&&(this.boundingBox=new oi),e.boundingBox===null&&e.computeBoundingBox(),this.boundingBox.makeEmpty();for(let n=0;n<t;n++)this.getMatrixAt(n,kr),Jd.copy(e.boundingBox).applyMatrix4(kr),this.boundingBox.union(Jd)}computeBoundingSphere(){const e=this.geometry,t=this.count;this.boundingSphere===null&&(this.boundingSphere=new ci),e.boundingSphere===null&&e.computeBoundingSphere(),this.boundingSphere.makeEmpty();for(let n=0;n<t;n++)this.getMatrixAt(n,kr),Ls.copy(e.boundingSphere).applyMatrix4(kr),this.boundingSphere.union(Ls)}copy(e,t){return super.copy(e,t),this.instanceMatrix.copy(e.instanceMatrix),e.morphTexture!==null&&(this.morphTexture=e.morphTexture.clone()),e.instanceColor!==null&&(this.instanceColor=e.instanceColor.clone()),this.count=e.count,e.boundingBox!==null&&(this.boundingBox=e.boundingBox.clone()),e.boundingSphere!==null&&(this.boundingSphere=e.boundingSphere.clone()),this}getColorAt(e,t){t.fromArray(this.instanceColor.array,e*3)}getMatrixAt(e,t){t.fromArray(this.instanceMatrix.array,e*16)}getMorphAt(e,t){const n=t.morphTargetInfluences,r=this.morphTexture.source.data.data,s=n.length+1,a=e*s+1;for(let o=0;o<n.length;o++)n[o]=r[a+o]}raycast(e,t){const n=this.matrixWorld,r=this.count;if(Cs.geometry=this.geometry,Cs.material=this.material,Cs.material!==void 0&&(this.boundingSphere===null&&this.computeBoundingSphere(),Ls.copy(this.boundingSphere),Ls.applyMatrix4(n),e.ray.intersectsSphere(Ls)!==!1))for(let s=0;s<r;s++){this.getMatrixAt(s,kr),Zd.multiplyMatrices(n,kr),Cs.matrixWorld=Zd,Cs.raycast(e,Wa);for(let a=0,o=Wa.length;a<o;a++){const c=Wa[a];c.instanceId=s,c.object=this,t.push(c)}Wa.length=0}}setColorAt(e,t){this.instanceColor===null&&(this.instanceColor=new ql(new Float32Array(this.instanceMatrix.count*3).fill(1),3)),t.toArray(this.instanceColor.array,e*3)}setMatrixAt(e,t){t.toArray(this.instanceMatrix.array,e*16)}setMorphAt(e,t){const n=t.morphTargetInfluences,r=n.length+1;this.morphTexture===null&&(this.morphTexture=new Xf(new Float32Array(r*this.count),r,this.count,bu,Gn));const s=this.morphTexture.source.data.data;let a=0;for(let l=0;l<n.length;l++)a+=n[l];const o=this.geometry.morphTargetsRelative?1:1-a,c=r*e;s[c]=o,s.set(n,c+1)}updateMorphTargets(){}dispose(){this.dispatchEvent({type:"dispose"}),this.morphTexture!==null&&(this.morphTexture.dispose(),this.morphTexture=null)}}const Pc=new P,k0=new P,z0=new Qe;class lr{constructor(e=new P(1,0,0),t=0){this.isPlane=!0,this.normal=e,this.constant=t}set(e,t){return this.normal.copy(e),this.constant=t,this}setComponents(e,t,n,r){return this.normal.set(e,t,n),this.constant=r,this}setFromNormalAndCoplanarPoint(e,t){return this.normal.copy(e),this.constant=-t.dot(this.normal),this}setFromCoplanarPoints(e,t,n){const r=Pc.subVectors(n,t).cross(k0.subVectors(e,t)).normalize();return this.setFromNormalAndCoplanarPoint(r,e),this}copy(e){return this.normal.copy(e.normal),this.constant=e.constant,this}normalize(){const e=1/this.normal.length();return this.normal.multiplyScalar(e),this.constant*=e,this}negate(){return this.constant*=-1,this.normal.negate(),this}distanceToPoint(e){return this.normal.dot(e)+this.constant}distanceToSphere(e){return this.distanceToPoint(e.center)-e.radius}projectPoint(e,t){return t.copy(e).addScaledVector(this.normal,-this.distanceToPoint(e))}intersectLine(e,t){const n=e.delta(Pc),r=this.normal.dot(n);if(r===0)return this.distanceToPoint(e.start)===0?t.copy(e.start):null;const s=-(e.start.dot(this.normal)+this.constant)/r;return s<0||s>1?null:t.copy(e.start).addScaledVector(n,s)}intersectsLine(e){const t=this.distanceToPoint(e.start),n=this.distanceToPoint(e.end);return t<0&&n>0||n<0&&t>0}intersectsBox(e){return e.intersectsPlane(this)}intersectsSphere(e){return e.intersectsPlane(this)}coplanarPoint(e){return e.copy(this.normal).multiplyScalar(-this.constant)}applyMatrix4(e,t){const n=t||z0.getNormalMatrix(e),r=this.coplanarPoint(Pc).applyMatrix4(e),s=this.normal.applyMatrix3(n).normalize();return this.constant=-r.dot(s),this}translate(e){return this.constant-=e.dot(this.normal),this}equals(e){return e.normal.equals(this.normal)&&e.constant===this.constant}clone(){return new this.constructor().copy(this)}}const sr=new ci,H0=new ue(.5,.5),$a=new P;class Iu{constructor(e=new lr,t=new lr,n=new lr,r=new lr,s=new lr,a=new lr){this.planes=[e,t,n,r,s,a]}set(e,t,n,r,s,a){const o=this.planes;return o[0].copy(e),o[1].copy(t),o[2].copy(n),o[3].copy(r),o[4].copy(s),o[5].copy(a),this}copy(e){const t=this.planes;for(let n=0;n<6;n++)t[n].copy(e.planes[n]);return this}setFromProjectionMatrix(e,t=ni,n=!1){const r=this.planes,s=e.elements,a=s[0],o=s[1],c=s[2],l=s[3],u=s[4],d=s[5],f=s[6],h=s[7],m=s[8],v=s[9],g=s[10],p=s[11],_=s[12],y=s[13],x=s[14],A=s[15];if(r[0].setComponents(l-a,h-u,p-m,A-_).normalize(),r[1].setComponents(l+a,h+u,p+m,A+_).normalize(),r[2].setComponents(l+o,h+d,p+v,A+y).normalize(),r[3].setComponents(l-o,h-d,p-v,A-y).normalize(),n)r[4].setComponents(c,f,g,x).normalize(),r[5].setComponents(l-c,h-f,p-g,A-x).normalize();else if(r[4].setComponents(l-c,h-f,p-g,A-x).normalize(),t===ni)r[5].setComponents(l+c,h+f,p+g,A+x).normalize();else if(t===So)r[5].setComponents(c,f,g,x).normalize();else throw new Error("THREE.Frustum.setFromProjectionMatrix(): Invalid coordinate system: "+t);return this}intersectsObject(e){if(e.boundingSphere!==void 0)e.boundingSphere===null&&e.computeBoundingSphere(),sr.copy(e.boundingSphere).applyMatrix4(e.matrixWorld);else{const t=e.geometry;t.boundingSphere===null&&t.computeBoundingSphere(),sr.copy(t.boundingSphere).applyMatrix4(e.matrixWorld)}return this.intersectsSphere(sr)}intersectsSprite(e){sr.center.set(0,0,0);const t=H0.distanceTo(e.center);return sr.radius=.7071067811865476+t,sr.applyMatrix4(e.matrixWorld),this.intersectsSphere(sr)}intersectsSphere(e){const t=this.planes,n=e.center,r=-e.radius;for(let s=0;s<6;s++)if(t[s].distanceToPoint(n)<r)return!1;return!0}intersectsBox(e){const t=this.planes;for(let n=0;n<6;n++){const r=t[n];if($a.x=r.normal.x>0?e.max.x:e.min.x,$a.y=r.normal.y>0?e.max.y:e.min.y,$a.z=r.normal.z>0?e.max.z:e.min.z,r.distanceToPoint($a)<0)return!1}return!0}containsPoint(e){const t=this.planes;for(let n=0;n<6;n++)if(t[n].distanceToPoint(e)<0)return!1;return!0}clone(){return new this.constructor().copy(this)}}class jf extends On{constructor(e){super(),this.isLineBasicMaterial=!0,this.type="LineBasicMaterial",this.color=new We(16777215),this.map=null,this.linewidth=1,this.linecap="round",this.linejoin="round",this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.color.copy(e.color),this.map=e.map,this.linewidth=e.linewidth,this.linecap=e.linecap,this.linejoin=e.linejoin,this.fog=e.fog,this}}const bo=new P,wo=new P,Qd=new Ke,Ps=new No,Xa=new ci,Ic=new P,eh=new P;class Du extends wt{constructor(e=new Xt,t=new jf){super(),this.isLine=!0,this.type="Line",this.geometry=e,this.material=t,this.morphTargetDictionary=void 0,this.morphTargetInfluences=void 0,this.updateMorphTargets()}copy(e,t){return super.copy(e,t),this.material=Array.isArray(e.material)?e.material.slice():e.material,this.geometry=e.geometry,this}computeLineDistances(){const e=this.geometry;if(e.index===null){const t=e.attributes.position,n=[0];for(let r=1,s=t.count;r<s;r++)bo.fromBufferAttribute(t,r-1),wo.fromBufferAttribute(t,r),n[r]=n[r-1],n[r]+=bo.distanceTo(wo);e.setAttribute("lineDistance",new ct(n,1))}else console.warn("THREE.Line.computeLineDistances(): Computation only possible with non-indexed BufferGeometry.");return this}raycast(e,t){const n=this.geometry,r=this.matrixWorld,s=e.params.Line.threshold,a=n.drawRange;if(n.boundingSphere===null&&n.computeBoundingSphere(),Xa.copy(n.boundingSphere),Xa.applyMatrix4(r),Xa.radius+=s,e.ray.intersectsSphere(Xa)===!1)return;Qd.copy(r).invert(),Ps.copy(e.ray).applyMatrix4(Qd);const o=s/((this.scale.x+this.scale.y+this.scale.z)/3),c=o*o,l=this.isLineSegments?2:1,u=n.index,f=n.attributes.position;if(u!==null){const h=Math.max(0,a.start),m=Math.min(u.count,a.start+a.count);for(let v=h,g=m-1;v<g;v+=l){const p=u.getX(v),_=u.getX(v+1),y=qa(this,e,Ps,c,p,_,v);y&&t.push(y)}if(this.isLineLoop){const v=u.getX(m-1),g=u.getX(h),p=qa(this,e,Ps,c,v,g,m-1);p&&t.push(p)}}else{const h=Math.max(0,a.start),m=Math.min(f.count,a.start+a.count);for(let v=h,g=m-1;v<g;v+=l){const p=qa(this,e,Ps,c,v,v+1,v);p&&t.push(p)}if(this.isLineLoop){const v=qa(this,e,Ps,c,m-1,h,m-1);v&&t.push(v)}}}updateMorphTargets(){const t=this.geometry.morphAttributes,n=Object.keys(t);if(n.length>0){const r=t[n[0]];if(r!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let s=0,a=r.length;s<a;s++){const o=r[s].name||String(s);this.morphTargetInfluences.push(0),this.morphTargetDictionary[o]=s}}}}}function qa(i,e,t,n,r,s,a){const o=i.geometry.attributes.position;if(bo.fromBufferAttribute(o,r),wo.fromBufferAttribute(o,s),t.distanceSqToSegment(bo,wo,Ic,eh)>n)return;Ic.applyMatrix4(i.matrixWorld);const l=e.ray.origin.distanceTo(Ic);if(!(l<e.near||l>e.far))return{distance:l,point:eh.clone().applyMatrix4(i.matrixWorld),index:a,face:null,faceIndex:null,barycoord:null,object:i}}const th=new P,nh=new P;class V0 extends Du{constructor(e,t){super(e,t),this.isLineSegments=!0,this.type="LineSegments"}computeLineDistances(){const e=this.geometry;if(e.index===null){const t=e.attributes.position,n=[];for(let r=0,s=t.count;r<s;r+=2)th.fromBufferAttribute(t,r),nh.fromBufferAttribute(t,r+1),n[r]=r===0?0:n[r-1],n[r+1]=n[r]+th.distanceTo(nh);e.setAttribute("lineDistance",new ct(n,1))}else console.warn("THREE.LineSegments.computeLineDistances(): Computation only possible with non-indexed BufferGeometry.");return this}}class G0 extends Du{constructor(e,t){super(e,t),this.isLineLoop=!0,this.type="LineLoop"}}class Yf extends On{constructor(e){super(),this.isPointsMaterial=!0,this.type="PointsMaterial",this.color=new We(16777215),this.map=null,this.alphaMap=null,this.size=1,this.sizeAttenuation=!0,this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.color.copy(e.color),this.map=e.map,this.alphaMap=e.alphaMap,this.size=e.size,this.sizeAttenuation=e.sizeAttenuation,this.fog=e.fog,this}}const ih=new Ke,jl=new No,ja=new ci,Ya=new P;class W0 extends wt{constructor(e=new Xt,t=new Yf){super(),this.isPoints=!0,this.type="Points",this.geometry=e,this.material=t,this.morphTargetDictionary=void 0,this.morphTargetInfluences=void 0,this.updateMorphTargets()}copy(e,t){return super.copy(e,t),this.material=Array.isArray(e.material)?e.material.slice():e.material,this.geometry=e.geometry,this}raycast(e,t){const n=this.geometry,r=this.matrixWorld,s=e.params.Points.threshold,a=n.drawRange;if(n.boundingSphere===null&&n.computeBoundingSphere(),ja.copy(n.boundingSphere),ja.applyMatrix4(r),ja.radius+=s,e.ray.intersectsSphere(ja)===!1)return;ih.copy(r).invert(),jl.copy(e.ray).applyMatrix4(ih);const o=s/((this.scale.x+this.scale.y+this.scale.z)/3),c=o*o,l=n.index,d=n.attributes.position;if(l!==null){const f=Math.max(0,a.start),h=Math.min(l.count,a.start+a.count);for(let m=f,v=h;m<v;m++){const g=l.getX(m);Ya.fromBufferAttribute(d,g),rh(Ya,g,c,r,e,t,this)}}else{const f=Math.max(0,a.start),h=Math.min(d.count,a.start+a.count);for(let m=f,v=h;m<v;m++)Ya.fromBufferAttribute(d,m),rh(Ya,m,c,r,e,t,this)}}updateMorphTargets(){const t=this.geometry.morphAttributes,n=Object.keys(t);if(n.length>0){const r=t[n[0]];if(r!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let s=0,a=r.length;s<a;s++){const o=r[s].name||String(s);this.morphTargetInfluences.push(0),this.morphTargetDictionary[o]=s}}}}}function rh(i,e,t,n,r,s,a){const o=jl.distanceSqToPoint(i);if(o<t){const c=new P;jl.closestPointToPoint(i,c),c.applyMatrix4(n);const l=r.ray.origin.distanceTo(c);if(l<r.near||l>r.far)return;s.push({distance:l,distanceToRay:Math.sqrt(o),point:c,index:e,face:null,faceIndex:null,barycoord:null,object:a})}}class $0 extends Vt{constructor(e,t,n,r,s,a,o,c,l){super(e,t,n,r,s,a,o,c,l),this.isCanvasTexture=!0,this.needsUpdate=!0}}class Kf extends Vt{constructor(e,t,n=vr,r,s,a,o=dn,c=dn,l,u=ea,d=1){if(u!==ea&&u!==ta)throw new Error("DepthTexture format must be either THREE.DepthFormat or THREE.DepthStencilFormat");const f={width:e,height:t,depth:d};super(f,r,s,a,o,c,u,n,l),this.isDepthTexture=!0,this.flipY=!1,this.generateMipmaps=!1,this.compareFunction=null}copy(e){return super.copy(e),this.source=new Cu(Object.assign({},e.image)),this.compareFunction=e.compareFunction,this}toJSON(e){const t=super.toJSON(e);return this.compareFunction!==null&&(t.compareFunction=this.compareFunction),t}}class Zf extends Vt{constructor(e=null){super(),this.sourceTexture=e,this.isExternalTexture=!0}copy(e){return super.copy(e),this.sourceTexture=e.sourceTexture,this}}class Nu extends Xt{constructor(e=1,t=32,n=0,r=Math.PI*2){super(),this.type="CircleGeometry",this.parameters={radius:e,segments:t,thetaStart:n,thetaLength:r},t=Math.max(3,t);const s=[],a=[],o=[],c=[],l=new P,u=new ue;a.push(0,0,0),o.push(0,0,1),c.push(.5,.5);for(let d=0,f=3;d<=t;d++,f+=3){const h=n+d/t*r;l.x=e*Math.cos(h),l.y=e*Math.sin(h),a.push(l.x,l.y,l.z),o.push(0,0,1),u.x=(a[f]/e+1)/2,u.y=(a[f+1]/e+1)/2,c.push(u.x,u.y)}for(let d=1;d<=t;d++)s.push(d,d+1,0);this.setIndex(s),this.setAttribute("position",new ct(a,3)),this.setAttribute("normal",new ct(o,3)),this.setAttribute("uv",new ct(c,2))}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new Nu(e.radius,e.segments,e.thetaStart,e.thetaLength)}}class Uu extends Xt{constructor(e=1,t=1,n=1,r=32,s=1,a=!1,o=0,c=Math.PI*2){super(),this.type="CylinderGeometry",this.parameters={radiusTop:e,radiusBottom:t,height:n,radialSegments:r,heightSegments:s,openEnded:a,thetaStart:o,thetaLength:c};const l=this;r=Math.floor(r),s=Math.floor(s);const u=[],d=[],f=[],h=[];let m=0;const v=[],g=n/2;let p=0;_(),a===!1&&(e>0&&y(!0),t>0&&y(!1)),this.setIndex(u),this.setAttribute("position",new ct(d,3)),this.setAttribute("normal",new ct(f,3)),this.setAttribute("uv",new ct(h,2));function _(){const x=new P,A=new P;let w=0;const R=(t-e)/n;for(let C=0;C<=s;C++){const S=[],b=C/s,L=b*(t-e)+e;for(let D=0;D<=r;D++){const k=D/r,H=k*c+o,X=Math.sin(H),V=Math.cos(H);A.x=L*X,A.y=-b*n+g,A.z=L*V,d.push(A.x,A.y,A.z),x.set(X,R,V).normalize(),f.push(x.x,x.y,x.z),h.push(k,1-b),S.push(m++)}v.push(S)}for(let C=0;C<r;C++)for(let S=0;S<s;S++){const b=v[S][C],L=v[S+1][C],D=v[S+1][C+1],k=v[S][C+1];(e>0||S!==0)&&(u.push(b,L,k),w+=3),(t>0||S!==s-1)&&(u.push(L,D,k),w+=3)}l.addGroup(p,w,0),p+=w}function y(x){const A=m,w=new ue,R=new P;let C=0;const S=x===!0?e:t,b=x===!0?1:-1;for(let D=1;D<=r;D++)d.push(0,g*b,0),f.push(0,b,0),h.push(.5,.5),m++;const L=m;for(let D=0;D<=r;D++){const H=D/r*c+o,X=Math.cos(H),V=Math.sin(H);R.x=S*V,R.y=g*b,R.z=S*X,d.push(R.x,R.y,R.z),f.push(0,b,0),w.x=X*.5+.5,w.y=V*.5*b+.5,h.push(w.x,w.y),m++}for(let D=0;D<r;D++){const k=A+D,H=L+D;x===!0?u.push(H,H+1,k):u.push(H+1,H,k),C+=3}l.addGroup(p,C,x===!0?1:2),p+=C}}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new Uu(e.radiusTop,e.radiusBottom,e.height,e.radialSegments,e.heightSegments,e.openEnded,e.thetaStart,e.thetaLength)}}class Fu extends Uu{constructor(e=1,t=1,n=32,r=1,s=!1,a=0,o=Math.PI*2){super(0,e,t,n,r,s,a,o),this.type="ConeGeometry",this.parameters={radius:e,height:t,radialSegments:n,heightSegments:r,openEnded:s,thetaStart:a,thetaLength:o}}static fromJSON(e){return new Fu(e.radius,e.height,e.radialSegments,e.heightSegments,e.openEnded,e.thetaStart,e.thetaLength)}}class ga extends Xt{constructor(e=[],t=[],n=1,r=0){super(),this.type="PolyhedronGeometry",this.parameters={vertices:e,indices:t,radius:n,detail:r};const s=[],a=[];o(r),l(n),u(),this.setAttribute("position",new ct(s,3)),this.setAttribute("normal",new ct(s.slice(),3)),this.setAttribute("uv",new ct(a,2)),r===0?this.computeVertexNormals():this.normalizeNormals();function o(_){const y=new P,x=new P,A=new P;for(let w=0;w<t.length;w+=3)h(t[w+0],y),h(t[w+1],x),h(t[w+2],A),c(y,x,A,_)}function c(_,y,x,A){const w=A+1,R=[];for(let C=0;C<=w;C++){R[C]=[];const S=_.clone().lerp(x,C/w),b=y.clone().lerp(x,C/w),L=w-C;for(let D=0;D<=L;D++)D===0&&C===w?R[C][D]=S:R[C][D]=S.clone().lerp(b,D/L)}for(let C=0;C<w;C++)for(let S=0;S<2*(w-C)-1;S++){const b=Math.floor(S/2);S%2===0?(f(R[C][b+1]),f(R[C+1][b]),f(R[C][b])):(f(R[C][b+1]),f(R[C+1][b+1]),f(R[C+1][b]))}}function l(_){const y=new P;for(let x=0;x<s.length;x+=3)y.x=s[x+0],y.y=s[x+1],y.z=s[x+2],y.normalize().multiplyScalar(_),s[x+0]=y.x,s[x+1]=y.y,s[x+2]=y.z}function u(){const _=new P;for(let y=0;y<s.length;y+=3){_.x=s[y+0],_.y=s[y+1],_.z=s[y+2];const x=g(_)/2/Math.PI+.5,A=p(_)/Math.PI+.5;a.push(x,1-A)}m(),d()}function d(){for(let _=0;_<a.length;_+=6){const y=a[_+0],x=a[_+2],A=a[_+4],w=Math.max(y,x,A),R=Math.min(y,x,A);w>.9&&R<.1&&(y<.2&&(a[_+0]+=1),x<.2&&(a[_+2]+=1),A<.2&&(a[_+4]+=1))}}function f(_){s.push(_.x,_.y,_.z)}function h(_,y){const x=_*3;y.x=e[x+0],y.y=e[x+1],y.z=e[x+2]}function m(){const _=new P,y=new P,x=new P,A=new P,w=new ue,R=new ue,C=new ue;for(let S=0,b=0;S<s.length;S+=9,b+=6){_.set(s[S+0],s[S+1],s[S+2]),y.set(s[S+3],s[S+4],s[S+5]),x.set(s[S+6],s[S+7],s[S+8]),w.set(a[b+0],a[b+1]),R.set(a[b+2],a[b+3]),C.set(a[b+4],a[b+5]),A.copy(_).add(y).add(x).divideScalar(3);const L=g(A);v(w,b+0,_,L),v(R,b+2,y,L),v(C,b+4,x,L)}}function v(_,y,x,A){A<0&&_.x===1&&(a[y]=_.x-1),x.x===0&&x.z===0&&(a[y]=A/2/Math.PI+.5)}function g(_){return Math.atan2(_.z,-_.x)}function p(_){return Math.atan2(-_.y,Math.sqrt(_.x*_.x+_.z*_.z))}}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new ga(e.vertices,e.indices,e.radius,e.details)}}class Fo extends ga{constructor(e=1,t=0){const n=(1+Math.sqrt(5))/2,r=1/n,s=[-1,-1,-1,-1,-1,1,-1,1,-1,-1,1,1,1,-1,-1,1,-1,1,1,1,-1,1,1,1,0,-r,-n,0,-r,n,0,r,-n,0,r,n,-r,-n,0,-r,n,0,r,-n,0,r,n,0,-n,0,-r,n,0,-r,-n,0,r,n,0,r],a=[3,11,7,3,7,15,3,15,13,7,19,17,7,17,6,7,6,15,17,4,8,17,8,10,17,10,6,8,0,16,8,16,2,8,2,10,0,12,1,0,1,18,0,18,16,6,10,2,6,2,13,6,13,15,2,16,18,2,18,3,2,3,13,18,1,9,18,9,11,18,11,3,4,14,12,4,12,0,4,0,8,11,9,5,11,5,19,11,19,7,19,5,14,19,14,4,19,4,17,1,12,14,1,14,5,1,5,9];super(s,a,e,t),this.type="DodecahedronGeometry",this.parameters={radius:e,detail:t}}static fromJSON(e){return new Fo(e.radius,e.detail)}}class li{constructor(){this.type="Curve",this.arcLengthDivisions=200,this.needsUpdate=!1,this.cacheArcLengths=null}getPoint(){console.warn("THREE.Curve: .getPoint() not implemented.")}getPointAt(e,t){const n=this.getUtoTmapping(e);return this.getPoint(n,t)}getPoints(e=5){const t=[];for(let n=0;n<=e;n++)t.push(this.getPoint(n/e));return t}getSpacedPoints(e=5){const t=[];for(let n=0;n<=e;n++)t.push(this.getPointAt(n/e));return t}getLength(){const e=this.getLengths();return e[e.length-1]}getLengths(e=this.arcLengthDivisions){if(this.cacheArcLengths&&this.cacheArcLengths.length===e+1&&!this.needsUpdate)return this.cacheArcLengths;this.needsUpdate=!1;const t=[];let n,r=this.getPoint(0),s=0;t.push(0);for(let a=1;a<=e;a++)n=this.getPoint(a/e),s+=n.distanceTo(r),t.push(s),r=n;return this.cacheArcLengths=t,t}updateArcLengths(){this.needsUpdate=!0,this.getLengths()}getUtoTmapping(e,t=null){const n=this.getLengths();let r=0;const s=n.length;let a;t?a=t:a=e*n[s-1];let o=0,c=s-1,l;for(;o<=c;)if(r=Math.floor(o+(c-o)/2),l=n[r]-a,l<0)o=r+1;else if(l>0)c=r-1;else{c=r;break}if(r=c,n[r]===a)return r/(s-1);const u=n[r],f=n[r+1]-u,h=(a-u)/f;return(r+h)/(s-1)}getTangent(e,t){let r=e-1e-4,s=e+1e-4;r<0&&(r=0),s>1&&(s=1);const a=this.getPoint(r),o=this.getPoint(s),c=t||(a.isVector2?new ue:new P);return c.copy(o).sub(a).normalize(),c}getTangentAt(e,t){const n=this.getUtoTmapping(e);return this.getTangent(n,t)}computeFrenetFrames(e,t=!1){const n=new P,r=[],s=[],a=[],o=new P,c=new Ke;for(let h=0;h<=e;h++){const m=h/e;r[h]=this.getTangentAt(m,new P)}s[0]=new P,a[0]=new P;let l=Number.MAX_VALUE;const u=Math.abs(r[0].x),d=Math.abs(r[0].y),f=Math.abs(r[0].z);u<=l&&(l=u,n.set(1,0,0)),d<=l&&(l=d,n.set(0,1,0)),f<=l&&n.set(0,0,1),o.crossVectors(r[0],n).normalize(),s[0].crossVectors(r[0],o),a[0].crossVectors(r[0],s[0]);for(let h=1;h<=e;h++){if(s[h]=s[h-1].clone(),a[h]=a[h-1].clone(),o.crossVectors(r[h-1],r[h]),o.length()>Number.EPSILON){o.normalize();const m=Math.acos(tt(r[h-1].dot(r[h]),-1,1));s[h].applyMatrix4(c.makeRotationAxis(o,m))}a[h].crossVectors(r[h],s[h])}if(t===!0){let h=Math.acos(tt(s[0].dot(s[e]),-1,1));h/=e,r[0].dot(o.crossVectors(s[0],s[e]))>0&&(h=-h);for(let m=1;m<=e;m++)s[m].applyMatrix4(c.makeRotationAxis(r[m],h*m)),a[m].crossVectors(r[m],s[m])}return{tangents:r,normals:s,binormals:a}}clone(){return new this.constructor().copy(this)}copy(e){return this.arcLengthDivisions=e.arcLengthDivisions,this}toJSON(){const e={metadata:{version:4.7,type:"Curve",generator:"Curve.toJSON"}};return e.arcLengthDivisions=this.arcLengthDivisions,e.type=this.type,e}fromJSON(e){return this.arcLengthDivisions=e.arcLengthDivisions,this}}class Ou extends li{constructor(e=0,t=0,n=1,r=1,s=0,a=Math.PI*2,o=!1,c=0){super(),this.isEllipseCurve=!0,this.type="EllipseCurve",this.aX=e,this.aY=t,this.xRadius=n,this.yRadius=r,this.aStartAngle=s,this.aEndAngle=a,this.aClockwise=o,this.aRotation=c}getPoint(e,t=new ue){const n=t,r=Math.PI*2;let s=this.aEndAngle-this.aStartAngle;const a=Math.abs(s)<Number.EPSILON;for(;s<0;)s+=r;for(;s>r;)s-=r;s<Number.EPSILON&&(a?s=0:s=r),this.aClockwise===!0&&!a&&(s===r?s=-r:s=s-r);const o=this.aStartAngle+e*s;let c=this.aX+this.xRadius*Math.cos(o),l=this.aY+this.yRadius*Math.sin(o);if(this.aRotation!==0){const u=Math.cos(this.aRotation),d=Math.sin(this.aRotation),f=c-this.aX,h=l-this.aY;c=f*u-h*d+this.aX,l=f*d+h*u+this.aY}return n.set(c,l)}copy(e){return super.copy(e),this.aX=e.aX,this.aY=e.aY,this.xRadius=e.xRadius,this.yRadius=e.yRadius,this.aStartAngle=e.aStartAngle,this.aEndAngle=e.aEndAngle,this.aClockwise=e.aClockwise,this.aRotation=e.aRotation,this}toJSON(){const e=super.toJSON();return e.aX=this.aX,e.aY=this.aY,e.xRadius=this.xRadius,e.yRadius=this.yRadius,e.aStartAngle=this.aStartAngle,e.aEndAngle=this.aEndAngle,e.aClockwise=this.aClockwise,e.aRotation=this.aRotation,e}fromJSON(e){return super.fromJSON(e),this.aX=e.aX,this.aY=e.aY,this.xRadius=e.xRadius,this.yRadius=e.yRadius,this.aStartAngle=e.aStartAngle,this.aEndAngle=e.aEndAngle,this.aClockwise=e.aClockwise,this.aRotation=e.aRotation,this}}class X0 extends Ou{constructor(e,t,n,r,s,a){super(e,t,n,n,r,s,a),this.isArcCurve=!0,this.type="ArcCurve"}}function Bu(){let i=0,e=0,t=0,n=0;function r(s,a,o,c){i=s,e=o,t=-3*s+3*a-2*o-c,n=2*s-2*a+o+c}return{initCatmullRom:function(s,a,o,c,l){r(a,o,l*(o-s),l*(c-a))},initNonuniformCatmullRom:function(s,a,o,c,l,u,d){let f=(a-s)/l-(o-s)/(l+u)+(o-a)/u,h=(o-a)/u-(c-a)/(u+d)+(c-o)/d;f*=u,h*=u,r(a,o,f,h)},calc:function(s){const a=s*s,o=a*s;return i+e*s+t*a+n*o}}}const Ka=new P,Dc=new Bu,Nc=new Bu,Uc=new Bu;class Jf extends li{constructor(e=[],t=!1,n="centripetal",r=.5){super(),this.isCatmullRomCurve3=!0,this.type="CatmullRomCurve3",this.points=e,this.closed=t,this.curveType=n,this.tension=r}getPoint(e,t=new P){const n=t,r=this.points,s=r.length,a=(s-(this.closed?0:1))*e;let o=Math.floor(a),c=a-o;this.closed?o+=o>0?0:(Math.floor(Math.abs(o)/s)+1)*s:c===0&&o===s-1&&(o=s-2,c=1);let l,u;this.closed||o>0?l=r[(o-1)%s]:(Ka.subVectors(r[0],r[1]).add(r[0]),l=Ka);const d=r[o%s],f=r[(o+1)%s];if(this.closed||o+2<s?u=r[(o+2)%s]:(Ka.subVectors(r[s-1],r[s-2]).add(r[s-1]),u=Ka),this.curveType==="centripetal"||this.curveType==="chordal"){const h=this.curveType==="chordal"?.5:.25;let m=Math.pow(l.distanceToSquared(d),h),v=Math.pow(d.distanceToSquared(f),h),g=Math.pow(f.distanceToSquared(u),h);v<1e-4&&(v=1),m<1e-4&&(m=v),g<1e-4&&(g=v),Dc.initNonuniformCatmullRom(l.x,d.x,f.x,u.x,m,v,g),Nc.initNonuniformCatmullRom(l.y,d.y,f.y,u.y,m,v,g),Uc.initNonuniformCatmullRom(l.z,d.z,f.z,u.z,m,v,g)}else this.curveType==="catmullrom"&&(Dc.initCatmullRom(l.x,d.x,f.x,u.x,this.tension),Nc.initCatmullRom(l.y,d.y,f.y,u.y,this.tension),Uc.initCatmullRom(l.z,d.z,f.z,u.z,this.tension));return n.set(Dc.calc(c),Nc.calc(c),Uc.calc(c)),n}copy(e){super.copy(e),this.points=[];for(let t=0,n=e.points.length;t<n;t++){const r=e.points[t];this.points.push(r.clone())}return this.closed=e.closed,this.curveType=e.curveType,this.tension=e.tension,this}toJSON(){const e=super.toJSON();e.points=[];for(let t=0,n=this.points.length;t<n;t++){const r=this.points[t];e.points.push(r.toArray())}return e.closed=this.closed,e.curveType=this.curveType,e.tension=this.tension,e}fromJSON(e){super.fromJSON(e),this.points=[];for(let t=0,n=e.points.length;t<n;t++){const r=e.points[t];this.points.push(new P().fromArray(r))}return this.closed=e.closed,this.curveType=e.curveType,this.tension=e.tension,this}}function sh(i,e,t,n,r){const s=(n-e)*.5,a=(r-t)*.5,o=i*i,c=i*o;return(2*t-2*n+s+a)*c+(-3*t+3*n-2*s-a)*o+s*i+t}function q0(i,e){const t=1-i;return t*t*e}function j0(i,e){return 2*(1-i)*i*e}function Y0(i,e){return i*i*e}function Ws(i,e,t,n){return q0(i,e)+j0(i,t)+Y0(i,n)}function K0(i,e){const t=1-i;return t*t*t*e}function Z0(i,e){const t=1-i;return 3*t*t*i*e}function J0(i,e){return 3*(1-i)*i*i*e}function Q0(i,e){return i*i*i*e}function $s(i,e,t,n,r){return K0(i,e)+Z0(i,t)+J0(i,n)+Q0(i,r)}class Qf extends li{constructor(e=new ue,t=new ue,n=new ue,r=new ue){super(),this.isCubicBezierCurve=!0,this.type="CubicBezierCurve",this.v0=e,this.v1=t,this.v2=n,this.v3=r}getPoint(e,t=new ue){const n=t,r=this.v0,s=this.v1,a=this.v2,o=this.v3;return n.set($s(e,r.x,s.x,a.x,o.x),$s(e,r.y,s.y,a.y,o.y)),n}copy(e){return super.copy(e),this.v0.copy(e.v0),this.v1.copy(e.v1),this.v2.copy(e.v2),this.v3.copy(e.v3),this}toJSON(){const e=super.toJSON();return e.v0=this.v0.toArray(),e.v1=this.v1.toArray(),e.v2=this.v2.toArray(),e.v3=this.v3.toArray(),e}fromJSON(e){return super.fromJSON(e),this.v0.fromArray(e.v0),this.v1.fromArray(e.v1),this.v2.fromArray(e.v2),this.v3.fromArray(e.v3),this}}class ev extends li{constructor(e=new P,t=new P,n=new P,r=new P){super(),this.isCubicBezierCurve3=!0,this.type="CubicBezierCurve3",this.v0=e,this.v1=t,this.v2=n,this.v3=r}getPoint(e,t=new P){const n=t,r=this.v0,s=this.v1,a=this.v2,o=this.v3;return n.set($s(e,r.x,s.x,a.x,o.x),$s(e,r.y,s.y,a.y,o.y),$s(e,r.z,s.z,a.z,o.z)),n}copy(e){return super.copy(e),this.v0.copy(e.v0),this.v1.copy(e.v1),this.v2.copy(e.v2),this.v3.copy(e.v3),this}toJSON(){const e=super.toJSON();return e.v0=this.v0.toArray(),e.v1=this.v1.toArray(),e.v2=this.v2.toArray(),e.v3=this.v3.toArray(),e}fromJSON(e){return super.fromJSON(e),this.v0.fromArray(e.v0),this.v1.fromArray(e.v1),this.v2.fromArray(e.v2),this.v3.fromArray(e.v3),this}}class ep extends li{constructor(e=new ue,t=new ue){super(),this.isLineCurve=!0,this.type="LineCurve",this.v1=e,this.v2=t}getPoint(e,t=new ue){const n=t;return e===1?n.copy(this.v2):(n.copy(this.v2).sub(this.v1),n.multiplyScalar(e).add(this.v1)),n}getPointAt(e,t){return this.getPoint(e,t)}getTangent(e,t=new ue){return t.subVectors(this.v2,this.v1).normalize()}getTangentAt(e,t){return this.getTangent(e,t)}copy(e){return super.copy(e),this.v1.copy(e.v1),this.v2.copy(e.v2),this}toJSON(){const e=super.toJSON();return e.v1=this.v1.toArray(),e.v2=this.v2.toArray(),e}fromJSON(e){return super.fromJSON(e),this.v1.fromArray(e.v1),this.v2.fromArray(e.v2),this}}class tv extends li{constructor(e=new P,t=new P){super(),this.isLineCurve3=!0,this.type="LineCurve3",this.v1=e,this.v2=t}getPoint(e,t=new P){const n=t;return e===1?n.copy(this.v2):(n.copy(this.v2).sub(this.v1),n.multiplyScalar(e).add(this.v1)),n}getPointAt(e,t){return this.getPoint(e,t)}getTangent(e,t=new P){return t.subVectors(this.v2,this.v1).normalize()}getTangentAt(e,t){return this.getTangent(e,t)}copy(e){return super.copy(e),this.v1.copy(e.v1),this.v2.copy(e.v2),this}toJSON(){const e=super.toJSON();return e.v1=this.v1.toArray(),e.v2=this.v2.toArray(),e}fromJSON(e){return super.fromJSON(e),this.v1.fromArray(e.v1),this.v2.fromArray(e.v2),this}}class tp extends li{constructor(e=new ue,t=new ue,n=new ue){super(),this.isQuadraticBezierCurve=!0,this.type="QuadraticBezierCurve",this.v0=e,this.v1=t,this.v2=n}getPoint(e,t=new ue){const n=t,r=this.v0,s=this.v1,a=this.v2;return n.set(Ws(e,r.x,s.x,a.x),Ws(e,r.y,s.y,a.y)),n}copy(e){return super.copy(e),this.v0.copy(e.v0),this.v1.copy(e.v1),this.v2.copy(e.v2),this}toJSON(){const e=super.toJSON();return e.v0=this.v0.toArray(),e.v1=this.v1.toArray(),e.v2=this.v2.toArray(),e}fromJSON(e){return super.fromJSON(e),this.v0.fromArray(e.v0),this.v1.fromArray(e.v1),this.v2.fromArray(e.v2),this}}class np extends li{constructor(e=new P,t=new P,n=new P){super(),this.isQuadraticBezierCurve3=!0,this.type="QuadraticBezierCurve3",this.v0=e,this.v1=t,this.v2=n}getPoint(e,t=new P){const n=t,r=this.v0,s=this.v1,a=this.v2;return n.set(Ws(e,r.x,s.x,a.x),Ws(e,r.y,s.y,a.y),Ws(e,r.z,s.z,a.z)),n}copy(e){return super.copy(e),this.v0.copy(e.v0),this.v1.copy(e.v1),this.v2.copy(e.v2),this}toJSON(){const e=super.toJSON();return e.v0=this.v0.toArray(),e.v1=this.v1.toArray(),e.v2=this.v2.toArray(),e}fromJSON(e){return super.fromJSON(e),this.v0.fromArray(e.v0),this.v1.fromArray(e.v1),this.v2.fromArray(e.v2),this}}class ip extends li{constructor(e=[]){super(),this.isSplineCurve=!0,this.type="SplineCurve",this.points=e}getPoint(e,t=new ue){const n=t,r=this.points,s=(r.length-1)*e,a=Math.floor(s),o=s-a,c=r[a===0?a:a-1],l=r[a],u=r[a>r.length-2?r.length-1:a+1],d=r[a>r.length-3?r.length-1:a+2];return n.set(sh(o,c.x,l.x,u.x,d.x),sh(o,c.y,l.y,u.y,d.y)),n}copy(e){super.copy(e),this.points=[];for(let t=0,n=e.points.length;t<n;t++){const r=e.points[t];this.points.push(r.clone())}return this}toJSON(){const e=super.toJSON();e.points=[];for(let t=0,n=this.points.length;t<n;t++){const r=this.points[t];e.points.push(r.toArray())}return e}fromJSON(e){super.fromJSON(e),this.points=[];for(let t=0,n=e.points.length;t<n;t++){const r=e.points[t];this.points.push(new ue().fromArray(r))}return this}}var Yl=Object.freeze({__proto__:null,ArcCurve:X0,CatmullRomCurve3:Jf,CubicBezierCurve:Qf,CubicBezierCurve3:ev,EllipseCurve:Ou,LineCurve:ep,LineCurve3:tv,QuadraticBezierCurve:tp,QuadraticBezierCurve3:np,SplineCurve:ip});class nv extends li{constructor(){super(),this.type="CurvePath",this.curves=[],this.autoClose=!1}add(e){this.curves.push(e)}closePath(){const e=this.curves[0].getPoint(0),t=this.curves[this.curves.length-1].getPoint(1);if(!e.equals(t)){const n=e.isVector2===!0?"LineCurve":"LineCurve3";this.curves.push(new Yl[n](t,e))}return this}getPoint(e,t){const n=e*this.getLength(),r=this.getCurveLengths();let s=0;for(;s<r.length;){if(r[s]>=n){const a=r[s]-n,o=this.curves[s],c=o.getLength(),l=c===0?0:1-a/c;return o.getPointAt(l,t)}s++}return null}getLength(){const e=this.getCurveLengths();return e[e.length-1]}updateArcLengths(){this.needsUpdate=!0,this.cacheLengths=null,this.getCurveLengths()}getCurveLengths(){if(this.cacheLengths&&this.cacheLengths.length===this.curves.length)return this.cacheLengths;const e=[];let t=0;for(let n=0,r=this.curves.length;n<r;n++)t+=this.curves[n].getLength(),e.push(t);return this.cacheLengths=e,e}getSpacedPoints(e=40){const t=[];for(let n=0;n<=e;n++)t.push(this.getPoint(n/e));return this.autoClose&&t.push(t[0]),t}getPoints(e=12){const t=[];let n;for(let r=0,s=this.curves;r<s.length;r++){const a=s[r],o=a.isEllipseCurve?e*2:a.isLineCurve||a.isLineCurve3?1:a.isSplineCurve?e*a.points.length:e,c=a.getPoints(o);for(let l=0;l<c.length;l++){const u=c[l];n&&n.equals(u)||(t.push(u),n=u)}}return this.autoClose&&t.length>1&&!t[t.length-1].equals(t[0])&&t.push(t[0]),t}copy(e){super.copy(e),this.curves=[];for(let t=0,n=e.curves.length;t<n;t++){const r=e.curves[t];this.curves.push(r.clone())}return this.autoClose=e.autoClose,this}toJSON(){const e=super.toJSON();e.autoClose=this.autoClose,e.curves=[];for(let t=0,n=this.curves.length;t<n;t++){const r=this.curves[t];e.curves.push(r.toJSON())}return e}fromJSON(e){super.fromJSON(e),this.autoClose=e.autoClose,this.curves=[];for(let t=0,n=e.curves.length;t<n;t++){const r=e.curves[t];this.curves.push(new Yl[r.type]().fromJSON(r))}return this}}class ah extends nv{constructor(e){super(),this.type="Path",this.currentPoint=new ue,e&&this.setFromPoints(e)}setFromPoints(e){this.moveTo(e[0].x,e[0].y);for(let t=1,n=e.length;t<n;t++)this.lineTo(e[t].x,e[t].y);return this}moveTo(e,t){return this.currentPoint.set(e,t),this}lineTo(e,t){const n=new ep(this.currentPoint.clone(),new ue(e,t));return this.curves.push(n),this.currentPoint.set(e,t),this}quadraticCurveTo(e,t,n,r){const s=new tp(this.currentPoint.clone(),new ue(e,t),new ue(n,r));return this.curves.push(s),this.currentPoint.set(n,r),this}bezierCurveTo(e,t,n,r,s,a){const o=new Qf(this.currentPoint.clone(),new ue(e,t),new ue(n,r),new ue(s,a));return this.curves.push(o),this.currentPoint.set(s,a),this}splineThru(e){const t=[this.currentPoint.clone()].concat(e),n=new ip(t);return this.curves.push(n),this.currentPoint.copy(e[e.length-1]),this}arc(e,t,n,r,s,a){const o=this.currentPoint.x,c=this.currentPoint.y;return this.absarc(e+o,t+c,n,r,s,a),this}absarc(e,t,n,r,s,a){return this.absellipse(e,t,n,n,r,s,a),this}ellipse(e,t,n,r,s,a,o,c){const l=this.currentPoint.x,u=this.currentPoint.y;return this.absellipse(e+l,t+u,n,r,s,a,o,c),this}absellipse(e,t,n,r,s,a,o,c){const l=new Ou(e,t,n,r,s,a,o,c);if(this.curves.length>0){const d=l.getPoint(0);d.equals(this.currentPoint)||this.lineTo(d.x,d.y)}this.curves.push(l);const u=l.getPoint(1);return this.currentPoint.copy(u),this}copy(e){return super.copy(e),this.currentPoint.copy(e.currentPoint),this}toJSON(){const e=super.toJSON();return e.currentPoint=this.currentPoint.toArray(),e}fromJSON(e){return super.fromJSON(e),this.currentPoint.fromArray(e.currentPoint),this}}class rp extends ah{constructor(e){super(e),this.uuid=Fn(),this.type="Shape",this.holes=[]}getPointsHoles(e){const t=[];for(let n=0,r=this.holes.length;n<r;n++)t[n]=this.holes[n].getPoints(e);return t}extractPoints(e){return{shape:this.getPoints(e),holes:this.getPointsHoles(e)}}copy(e){super.copy(e),this.holes=[];for(let t=0,n=e.holes.length;t<n;t++){const r=e.holes[t];this.holes.push(r.clone())}return this}toJSON(){const e=super.toJSON();e.uuid=this.uuid,e.holes=[];for(let t=0,n=this.holes.length;t<n;t++){const r=this.holes[t];e.holes.push(r.toJSON())}return e}fromJSON(e){super.fromJSON(e),this.uuid=e.uuid,this.holes=[];for(let t=0,n=e.holes.length;t<n;t++){const r=e.holes[t];this.holes.push(new ah().fromJSON(r))}return this}}function iv(i,e,t=2){const n=e&&e.length,r=n?e[0]*t:i.length;let s=sp(i,0,r,t,!0);const a=[];if(!s||s.next===s.prev)return a;let o,c,l;if(n&&(s=cv(i,e,s,t)),i.length>80*t){o=1/0,c=1/0;let u=-1/0,d=-1/0;for(let f=t;f<r;f+=t){const h=i[f],m=i[f+1];h<o&&(o=h),m<c&&(c=m),h>u&&(u=h),m>d&&(d=m)}l=Math.max(u-o,d-c),l=l!==0?32767/l:0}return oa(s,a,t,o,c,l,0),a}function sp(i,e,t,n,r){let s;if(r===yv(i,e,t,n)>0)for(let a=e;a<t;a+=n)s=oh(a/n|0,i[a],i[a+1],s);else for(let a=t-n;a>=e;a-=n)s=oh(a/n|0,i[a],i[a+1],s);return s&&os(s,s.next)&&(la(s),s=s.next),s}function yr(i,e){if(!i)return i;e||(e=i);let t=i,n;do if(n=!1,!t.steiner&&(os(t,t.next)||It(t.prev,t,t.next)===0)){if(la(t),t=e=t.prev,t===t.next)break;n=!0}else t=t.next;while(n||t!==e);return e}function oa(i,e,t,n,r,s,a){if(!i)return;!a&&s&&fv(i,n,r,s);let o=i;for(;i.prev!==i.next;){const c=i.prev,l=i.next;if(s?sv(i,n,r,s):rv(i)){e.push(c.i,i.i,l.i),la(i),i=l.next,o=l.next;continue}if(i=l,i===o){a?a===1?(i=av(yr(i),e),oa(i,e,t,n,r,s,2)):a===2&&ov(i,e,t,n,r,s):oa(yr(i),e,t,n,r,s,1);break}}}function rv(i){const e=i.prev,t=i,n=i.next;if(It(e,t,n)>=0)return!1;const r=e.x,s=t.x,a=n.x,o=e.y,c=t.y,l=n.y,u=Math.min(r,s,a),d=Math.min(o,c,l),f=Math.max(r,s,a),h=Math.max(o,c,l);let m=n.next;for(;m!==e;){if(m.x>=u&&m.x<=f&&m.y>=d&&m.y<=h&&Fs(r,o,s,c,a,l,m.x,m.y)&&It(m.prev,m,m.next)>=0)return!1;m=m.next}return!0}function sv(i,e,t,n){const r=i.prev,s=i,a=i.next;if(It(r,s,a)>=0)return!1;const o=r.x,c=s.x,l=a.x,u=r.y,d=s.y,f=a.y,h=Math.min(o,c,l),m=Math.min(u,d,f),v=Math.max(o,c,l),g=Math.max(u,d,f),p=Kl(h,m,e,t,n),_=Kl(v,g,e,t,n);let y=i.prevZ,x=i.nextZ;for(;y&&y.z>=p&&x&&x.z<=_;){if(y.x>=h&&y.x<=v&&y.y>=m&&y.y<=g&&y!==r&&y!==a&&Fs(o,u,c,d,l,f,y.x,y.y)&&It(y.prev,y,y.next)>=0||(y=y.prevZ,x.x>=h&&x.x<=v&&x.y>=m&&x.y<=g&&x!==r&&x!==a&&Fs(o,u,c,d,l,f,x.x,x.y)&&It(x.prev,x,x.next)>=0))return!1;x=x.nextZ}for(;y&&y.z>=p;){if(y.x>=h&&y.x<=v&&y.y>=m&&y.y<=g&&y!==r&&y!==a&&Fs(o,u,c,d,l,f,y.x,y.y)&&It(y.prev,y,y.next)>=0)return!1;y=y.prevZ}for(;x&&x.z<=_;){if(x.x>=h&&x.x<=v&&x.y>=m&&x.y<=g&&x!==r&&x!==a&&Fs(o,u,c,d,l,f,x.x,x.y)&&It(x.prev,x,x.next)>=0)return!1;x=x.nextZ}return!0}function av(i,e){let t=i;do{const n=t.prev,r=t.next.next;!os(n,r)&&op(n,t,t.next,r)&&ca(n,r)&&ca(r,n)&&(e.push(n.i,t.i,r.i),la(t),la(t.next),t=i=r),t=t.next}while(t!==i);return yr(t)}function ov(i,e,t,n,r,s){let a=i;do{let o=a.next.next;for(;o!==a.prev;){if(a.i!==o.i&&gv(a,o)){let c=cp(a,o);a=yr(a,a.next),c=yr(c,c.next),oa(a,e,t,n,r,s,0),oa(c,e,t,n,r,s,0);return}o=o.next}a=a.next}while(a!==i)}function cv(i,e,t,n){const r=[];for(let s=0,a=e.length;s<a;s++){const o=e[s]*n,c=s<a-1?e[s+1]*n:i.length,l=sp(i,o,c,n,!1);l===l.next&&(l.steiner=!0),r.push(mv(l))}r.sort(lv);for(let s=0;s<r.length;s++)t=uv(r[s],t);return t}function lv(i,e){let t=i.x-e.x;if(t===0&&(t=i.y-e.y,t===0)){const n=(i.next.y-i.y)/(i.next.x-i.x),r=(e.next.y-e.y)/(e.next.x-e.x);t=n-r}return t}function uv(i,e){const t=dv(i,e);if(!t)return e;const n=cp(t,i);return yr(n,n.next),yr(t,t.next)}function dv(i,e){let t=e;const n=i.x,r=i.y;let s=-1/0,a;if(os(i,t))return t;do{if(os(i,t.next))return t.next;if(r<=t.y&&r>=t.next.y&&t.next.y!==t.y){const d=t.x+(r-t.y)*(t.next.x-t.x)/(t.next.y-t.y);if(d<=n&&d>s&&(s=d,a=t.x<t.next.x?t:t.next,d===n))return a}t=t.next}while(t!==e);if(!a)return null;const o=a,c=a.x,l=a.y;let u=1/0;t=a;do{if(n>=t.x&&t.x>=c&&n!==t.x&&ap(r<l?n:s,r,c,l,r<l?s:n,r,t.x,t.y)){const d=Math.abs(r-t.y)/(n-t.x);ca(t,i)&&(d<u||d===u&&(t.x>a.x||t.x===a.x&&hv(a,t)))&&(a=t,u=d)}t=t.next}while(t!==o);return a}function hv(i,e){return It(i.prev,i,e.prev)<0&&It(e.next,i,i.next)<0}function fv(i,e,t,n){let r=i;do r.z===0&&(r.z=Kl(r.x,r.y,e,t,n)),r.prevZ=r.prev,r.nextZ=r.next,r=r.next;while(r!==i);r.prevZ.nextZ=null,r.prevZ=null,pv(r)}function pv(i){let e,t=1;do{let n=i,r;i=null;let s=null;for(e=0;n;){e++;let a=n,o=0;for(let l=0;l<t&&(o++,a=a.nextZ,!!a);l++);let c=t;for(;o>0||c>0&&a;)o!==0&&(c===0||!a||n.z<=a.z)?(r=n,n=n.nextZ,o--):(r=a,a=a.nextZ,c--),s?s.nextZ=r:i=r,r.prevZ=s,s=r;n=a}s.nextZ=null,t*=2}while(e>1);return i}function Kl(i,e,t,n,r){return i=(i-t)*r|0,e=(e-n)*r|0,i=(i|i<<8)&16711935,i=(i|i<<4)&252645135,i=(i|i<<2)&858993459,i=(i|i<<1)&1431655765,e=(e|e<<8)&16711935,e=(e|e<<4)&252645135,e=(e|e<<2)&858993459,e=(e|e<<1)&1431655765,i|e<<1}function mv(i){let e=i,t=i;do(e.x<t.x||e.x===t.x&&e.y<t.y)&&(t=e),e=e.next;while(e!==i);return t}function ap(i,e,t,n,r,s,a,o){return(r-a)*(e-o)>=(i-a)*(s-o)&&(i-a)*(n-o)>=(t-a)*(e-o)&&(t-a)*(s-o)>=(r-a)*(n-o)}function Fs(i,e,t,n,r,s,a,o){return!(i===a&&e===o)&&ap(i,e,t,n,r,s,a,o)}function gv(i,e){return i.next.i!==e.i&&i.prev.i!==e.i&&!vv(i,e)&&(ca(i,e)&&ca(e,i)&&_v(i,e)&&(It(i.prev,i,e.prev)||It(i,e.prev,e))||os(i,e)&&It(i.prev,i,i.next)>0&&It(e.prev,e,e.next)>0)}function It(i,e,t){return(e.y-i.y)*(t.x-e.x)-(e.x-i.x)*(t.y-e.y)}function os(i,e){return i.x===e.x&&i.y===e.y}function op(i,e,t,n){const r=Ja(It(i,e,t)),s=Ja(It(i,e,n)),a=Ja(It(t,n,i)),o=Ja(It(t,n,e));return!!(r!==s&&a!==o||r===0&&Za(i,t,e)||s===0&&Za(i,n,e)||a===0&&Za(t,i,n)||o===0&&Za(t,e,n))}function Za(i,e,t){return e.x<=Math.max(i.x,t.x)&&e.x>=Math.min(i.x,t.x)&&e.y<=Math.max(i.y,t.y)&&e.y>=Math.min(i.y,t.y)}function Ja(i){return i>0?1:i<0?-1:0}function vv(i,e){let t=i;do{if(t.i!==i.i&&t.next.i!==i.i&&t.i!==e.i&&t.next.i!==e.i&&op(t,t.next,i,e))return!0;t=t.next}while(t!==i);return!1}function ca(i,e){return It(i.prev,i,i.next)<0?It(i,e,i.next)>=0&&It(i,i.prev,e)>=0:It(i,e,i.prev)<0||It(i,i.next,e)<0}function _v(i,e){let t=i,n=!1;const r=(i.x+e.x)/2,s=(i.y+e.y)/2;do t.y>s!=t.next.y>s&&t.next.y!==t.y&&r<(t.next.x-t.x)*(s-t.y)/(t.next.y-t.y)+t.x&&(n=!n),t=t.next;while(t!==i);return n}function cp(i,e){const t=Zl(i.i,i.x,i.y),n=Zl(e.i,e.x,e.y),r=i.next,s=e.prev;return i.next=e,e.prev=i,t.next=r,r.prev=t,n.next=t,t.prev=n,s.next=n,n.prev=s,n}function oh(i,e,t,n){const r=Zl(i,e,t);return n?(r.next=n.next,r.prev=n,n.next.prev=r,n.next=r):(r.prev=r,r.next=r),r}function la(i){i.next.prev=i.prev,i.prev.next=i.next,i.prevZ&&(i.prevZ.nextZ=i.nextZ),i.nextZ&&(i.nextZ.prevZ=i.prevZ)}function Zl(i,e,t){return{i,x:e,y:t,prev:null,next:null,z:0,prevZ:null,nextZ:null,steiner:!1}}function yv(i,e,t,n){let r=0;for(let s=e,a=t-n;s<t;s+=n)r+=(i[a]-i[s])*(i[s+1]+i[a+1]),a=s;return r}class xv{static triangulate(e,t,n=2){return iv(e,t,n)}}class Xs{static area(e){const t=e.length;let n=0;for(let r=t-1,s=0;s<t;r=s++)n+=e[r].x*e[s].y-e[s].x*e[r].y;return n*.5}static isClockWise(e){return Xs.area(e)<0}static triangulateShape(e,t){const n=[],r=[],s=[];ch(e),lh(n,e);let a=e.length;t.forEach(ch);for(let c=0;c<t.length;c++)r.push(a),a+=t[c].length,lh(n,t[c]);const o=xv.triangulate(n,r);for(let c=0;c<o.length;c+=3)s.push(o.slice(c,c+3));return s}}function ch(i){const e=i.length;e>2&&i[e-1].equals(i[0])&&i.pop()}function lh(i,e){for(let t=0;t<e.length;t++)i.push(e[t].x),i.push(e[t].y)}class Oo extends ga{constructor(e=1,t=0){const n=(1+Math.sqrt(5))/2,r=[-1,n,0,1,n,0,-1,-n,0,1,-n,0,0,-1,n,0,1,n,0,-1,-n,0,1,-n,n,0,-1,n,0,1,-n,0,-1,-n,0,1],s=[0,11,5,0,5,1,0,1,7,0,7,10,0,10,11,1,5,9,5,11,4,11,10,2,10,7,6,7,1,8,3,9,4,3,4,2,3,2,6,3,6,8,3,8,9,4,9,5,2,4,11,6,2,10,8,6,7,9,8,1];super(r,s,e,t),this.type="IcosahedronGeometry",this.parameters={radius:e,detail:t}}static fromJSON(e){return new Oo(e.radius,e.detail)}}class ku extends Xt{constructor(e=[new ue(0,-.5),new ue(.5,0),new ue(0,.5)],t=12,n=0,r=Math.PI*2){super(),this.type="LatheGeometry",this.parameters={points:e,segments:t,phiStart:n,phiLength:r},t=Math.floor(t),r=tt(r,0,Math.PI*2);const s=[],a=[],o=[],c=[],l=[],u=1/t,d=new P,f=new ue,h=new P,m=new P,v=new P;let g=0,p=0;for(let _=0;_<=e.length-1;_++)switch(_){case 0:g=e[_+1].x-e[_].x,p=e[_+1].y-e[_].y,h.x=p*1,h.y=-g,h.z=p*0,v.copy(h),h.normalize(),c.push(h.x,h.y,h.z);break;case e.length-1:c.push(v.x,v.y,v.z);break;default:g=e[_+1].x-e[_].x,p=e[_+1].y-e[_].y,h.x=p*1,h.y=-g,h.z=p*0,m.copy(h),h.x+=v.x,h.y+=v.y,h.z+=v.z,h.normalize(),c.push(h.x,h.y,h.z),v.copy(m)}for(let _=0;_<=t;_++){const y=n+_*u*r,x=Math.sin(y),A=Math.cos(y);for(let w=0;w<=e.length-1;w++){d.x=e[w].x*x,d.y=e[w].y,d.z=e[w].x*A,a.push(d.x,d.y,d.z),f.x=_/t,f.y=w/(e.length-1),o.push(f.x,f.y);const R=c[3*w+0]*x,C=c[3*w+1],S=c[3*w+0]*A;l.push(R,C,S)}}for(let _=0;_<t;_++)for(let y=0;y<e.length-1;y++){const x=y+_*e.length,A=x,w=x+e.length,R=x+e.length+1,C=x+1;s.push(A,w,C),s.push(R,C,w)}this.setIndex(s),this.setAttribute("position",new ct(a,3)),this.setAttribute("uv",new ct(o,2)),this.setAttribute("normal",new ct(l,3))}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new ku(e.points,e.segments,e.phiStart,e.phiLength)}}class zu extends ga{constructor(e=1,t=0){const n=[1,0,0,-1,0,0,0,1,0,0,-1,0,0,0,1,0,0,-1],r=[0,2,4,0,4,3,0,3,5,0,5,2,1,2,5,1,5,3,1,3,4,1,4,2];super(n,r,e,t),this.type="OctahedronGeometry",this.parameters={radius:e,detail:t}}static fromJSON(e){return new zu(e.radius,e.detail)}}class Bo extends Xt{constructor(e=1,t=1,n=1,r=1){super(),this.type="PlaneGeometry",this.parameters={width:e,height:t,widthSegments:n,heightSegments:r};const s=e/2,a=t/2,o=Math.floor(n),c=Math.floor(r),l=o+1,u=c+1,d=e/o,f=t/c,h=[],m=[],v=[],g=[];for(let p=0;p<u;p++){const _=p*f-a;for(let y=0;y<l;y++){const x=y*d-s;m.push(x,-_,0),v.push(0,0,1),g.push(y/o),g.push(1-p/c)}}for(let p=0;p<c;p++)for(let _=0;_<o;_++){const y=_+l*p,x=_+l*(p+1),A=_+1+l*(p+1),w=_+1+l*p;h.push(y,x,w),h.push(x,A,w)}this.setIndex(h),this.setAttribute("position",new ct(m,3)),this.setAttribute("normal",new ct(v,3)),this.setAttribute("uv",new ct(g,2))}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new Bo(e.width,e.height,e.widthSegments,e.heightSegments)}}class Hu extends Xt{constructor(e=new rp([new ue(0,.5),new ue(-.5,-.5),new ue(.5,-.5)]),t=12){super(),this.type="ShapeGeometry",this.parameters={shapes:e,curveSegments:t};const n=[],r=[],s=[],a=[];let o=0,c=0;if(Array.isArray(e)===!1)l(e);else for(let u=0;u<e.length;u++)l(e[u]),this.addGroup(o,c,u),o+=c,c=0;this.setIndex(n),this.setAttribute("position",new ct(r,3)),this.setAttribute("normal",new ct(s,3)),this.setAttribute("uv",new ct(a,2));function l(u){const d=r.length/3,f=u.extractPoints(t);let h=f.shape;const m=f.holes;Xs.isClockWise(h)===!1&&(h=h.reverse());for(let g=0,p=m.length;g<p;g++){const _=m[g];Xs.isClockWise(_)===!0&&(m[g]=_.reverse())}const v=Xs.triangulateShape(h,m);for(let g=0,p=m.length;g<p;g++){const _=m[g];h=h.concat(_)}for(let g=0,p=h.length;g<p;g++){const _=h[g];r.push(_.x,_.y,0),s.push(0,0,1),a.push(_.x,_.y)}for(let g=0,p=v.length;g<p;g++){const _=v[g],y=_[0]+d,x=_[1]+d,A=_[2]+d;n.push(y,x,A),c+=3}}}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}toJSON(){const e=super.toJSON(),t=this.parameters.shapes;return Mv(t,e)}static fromJSON(e,t){const n=[];for(let r=0,s=e.shapes.length;r<s;r++){const a=t[e.shapes[r]];n.push(a)}return new Hu(n,e.curveSegments)}}function Mv(i,e){if(e.shapes=[],Array.isArray(i))for(let t=0,n=i.length;t<n;t++){const r=i[t];e.shapes.push(r.uuid)}else e.shapes.push(i.uuid);return e}class Yi extends Xt{constructor(e=1,t=32,n=16,r=0,s=Math.PI*2,a=0,o=Math.PI){super(),this.type="SphereGeometry",this.parameters={radius:e,widthSegments:t,heightSegments:n,phiStart:r,phiLength:s,thetaStart:a,thetaLength:o},t=Math.max(3,Math.floor(t)),n=Math.max(2,Math.floor(n));const c=Math.min(a+o,Math.PI);let l=0;const u=[],d=new P,f=new P,h=[],m=[],v=[],g=[];for(let p=0;p<=n;p++){const _=[],y=p/n;let x=0;p===0&&a===0?x=.5/t:p===n&&c===Math.PI&&(x=-.5/t);for(let A=0;A<=t;A++){const w=A/t;d.x=-e*Math.cos(r+w*s)*Math.sin(a+y*o),d.y=e*Math.cos(a+y*o),d.z=e*Math.sin(r+w*s)*Math.sin(a+y*o),m.push(d.x,d.y,d.z),f.copy(d).normalize(),v.push(f.x,f.y,f.z),g.push(w+x,1-y),_.push(l++)}u.push(_)}for(let p=0;p<n;p++)for(let _=0;_<t;_++){const y=u[p][_+1],x=u[p][_],A=u[p+1][_],w=u[p+1][_+1];(p!==0||a>0)&&h.push(y,x,w),(p!==n-1||c<Math.PI)&&h.push(x,A,w)}this.setIndex(h),this.setAttribute("position",new ct(m,3)),this.setAttribute("normal",new ct(v,3)),this.setAttribute("uv",new ct(g,2))}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new Yi(e.radius,e.widthSegments,e.heightSegments,e.phiStart,e.phiLength,e.thetaStart,e.thetaLength)}}class Vu extends Xt{constructor(e=1,t=.4,n=12,r=48,s=Math.PI*2){super(),this.type="TorusGeometry",this.parameters={radius:e,tube:t,radialSegments:n,tubularSegments:r,arc:s},n=Math.floor(n),r=Math.floor(r);const a=[],o=[],c=[],l=[],u=new P,d=new P,f=new P;for(let h=0;h<=n;h++)for(let m=0;m<=r;m++){const v=m/r*s,g=h/n*Math.PI*2;d.x=(e+t*Math.cos(g))*Math.cos(v),d.y=(e+t*Math.cos(g))*Math.sin(v),d.z=t*Math.sin(g),o.push(d.x,d.y,d.z),u.x=e*Math.cos(v),u.y=e*Math.sin(v),f.subVectors(d,u).normalize(),c.push(f.x,f.y,f.z),l.push(m/r),l.push(h/n)}for(let h=1;h<=n;h++)for(let m=1;m<=r;m++){const v=(r+1)*h+m-1,g=(r+1)*(h-1)+m-1,p=(r+1)*(h-1)+m,_=(r+1)*h+m;a.push(v,g,_),a.push(g,p,_)}this.setIndex(a),this.setAttribute("position",new ct(o,3)),this.setAttribute("normal",new ct(c,3)),this.setAttribute("uv",new ct(l,2))}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new Vu(e.radius,e.tube,e.radialSegments,e.tubularSegments,e.arc)}}class Gu extends Xt{constructor(e=new np(new P(-1,-1,0),new P(-1,1,0),new P(1,1,0)),t=64,n=1,r=8,s=!1){super(),this.type="TubeGeometry",this.parameters={path:e,tubularSegments:t,radius:n,radialSegments:r,closed:s};const a=e.computeFrenetFrames(t,s);this.tangents=a.tangents,this.normals=a.normals,this.binormals=a.binormals;const o=new P,c=new P,l=new ue;let u=new P;const d=[],f=[],h=[],m=[];v(),this.setIndex(m),this.setAttribute("position",new ct(d,3)),this.setAttribute("normal",new ct(f,3)),this.setAttribute("uv",new ct(h,2));function v(){for(let y=0;y<t;y++)g(y);g(s===!1?t:0),_(),p()}function g(y){u=e.getPointAt(y/t,u);const x=a.normals[y],A=a.binormals[y];for(let w=0;w<=r;w++){const R=w/r*Math.PI*2,C=Math.sin(R),S=-Math.cos(R);c.x=S*x.x+C*A.x,c.y=S*x.y+C*A.y,c.z=S*x.z+C*A.z,c.normalize(),f.push(c.x,c.y,c.z),o.x=u.x+n*c.x,o.y=u.y+n*c.y,o.z=u.z+n*c.z,d.push(o.x,o.y,o.z)}}function p(){for(let y=1;y<=t;y++)for(let x=1;x<=r;x++){const A=(r+1)*(y-1)+(x-1),w=(r+1)*y+(x-1),R=(r+1)*y+x,C=(r+1)*(y-1)+x;m.push(A,w,C),m.push(w,R,C)}}function _(){for(let y=0;y<=t;y++)for(let x=0;x<=r;x++)l.x=y/t,l.y=x/r,h.push(l.x,l.y)}}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}toJSON(){const e=super.toJSON();return e.path=this.parameters.path.toJSON(),e}static fromJSON(e){return new Gu(new Yl[e.path.type]().fromJSON(e.path),e.tubularSegments,e.radius,e.radialSegments,e.closed)}}class $n extends On{constructor(e){super(),this.isMeshStandardMaterial=!0,this.type="MeshStandardMaterial",this.defines={STANDARD:""},this.color=new We(16777215),this.roughness=1,this.metalness=0,this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.emissive=new We(0),this.emissiveIntensity=1,this.emissiveMap=null,this.bumpMap=null,this.bumpScale=1,this.normalMap=null,this.normalMapType=Au,this.normalScale=new ue(1,1),this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.roughnessMap=null,this.metalnessMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new qn,this.envMapIntensity=1,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.flatShading=!1,this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.defines={STANDARD:""},this.color.copy(e.color),this.roughness=e.roughness,this.metalness=e.metalness,this.map=e.map,this.lightMap=e.lightMap,this.lightMapIntensity=e.lightMapIntensity,this.aoMap=e.aoMap,this.aoMapIntensity=e.aoMapIntensity,this.emissive.copy(e.emissive),this.emissiveMap=e.emissiveMap,this.emissiveIntensity=e.emissiveIntensity,this.bumpMap=e.bumpMap,this.bumpScale=e.bumpScale,this.normalMap=e.normalMap,this.normalMapType=e.normalMapType,this.normalScale.copy(e.normalScale),this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this.roughnessMap=e.roughnessMap,this.metalnessMap=e.metalnessMap,this.alphaMap=e.alphaMap,this.envMap=e.envMap,this.envMapRotation.copy(e.envMapRotation),this.envMapIntensity=e.envMapIntensity,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.wireframeLinecap=e.wireframeLinecap,this.wireframeLinejoin=e.wireframeLinejoin,this.flatShading=e.flatShading,this.fog=e.fog,this}}class ln extends $n{constructor(e){super(),this.isMeshPhysicalMaterial=!0,this.defines={STANDARD:"",PHYSICAL:""},this.type="MeshPhysicalMaterial",this.anisotropyRotation=0,this.anisotropyMap=null,this.clearcoatMap=null,this.clearcoatRoughness=0,this.clearcoatRoughnessMap=null,this.clearcoatNormalScale=new ue(1,1),this.clearcoatNormalMap=null,this.ior=1.5,Object.defineProperty(this,"reflectivity",{get:function(){return tt(2.5*(this.ior-1)/(this.ior+1),0,1)},set:function(t){this.ior=(1+.4*t)/(1-.4*t)}}),this.iridescenceMap=null,this.iridescenceIOR=1.3,this.iridescenceThicknessRange=[100,400],this.iridescenceThicknessMap=null,this.sheenColor=new We(0),this.sheenColorMap=null,this.sheenRoughness=1,this.sheenRoughnessMap=null,this.transmissionMap=null,this.thickness=0,this.thicknessMap=null,this.attenuationDistance=1/0,this.attenuationColor=new We(1,1,1),this.specularIntensity=1,this.specularIntensityMap=null,this.specularColor=new We(1,1,1),this.specularColorMap=null,this._anisotropy=0,this._clearcoat=0,this._dispersion=0,this._iridescence=0,this._sheen=0,this._transmission=0,this.setValues(e)}get anisotropy(){return this._anisotropy}set anisotropy(e){this._anisotropy>0!=e>0&&this.version++,this._anisotropy=e}get clearcoat(){return this._clearcoat}set clearcoat(e){this._clearcoat>0!=e>0&&this.version++,this._clearcoat=e}get iridescence(){return this._iridescence}set iridescence(e){this._iridescence>0!=e>0&&this.version++,this._iridescence=e}get dispersion(){return this._dispersion}set dispersion(e){this._dispersion>0!=e>0&&this.version++,this._dispersion=e}get sheen(){return this._sheen}set sheen(e){this._sheen>0!=e>0&&this.version++,this._sheen=e}get transmission(){return this._transmission}set transmission(e){this._transmission>0!=e>0&&this.version++,this._transmission=e}copy(e){return super.copy(e),this.defines={STANDARD:"",PHYSICAL:""},this.anisotropy=e.anisotropy,this.anisotropyRotation=e.anisotropyRotation,this.anisotropyMap=e.anisotropyMap,this.clearcoat=e.clearcoat,this.clearcoatMap=e.clearcoatMap,this.clearcoatRoughness=e.clearcoatRoughness,this.clearcoatRoughnessMap=e.clearcoatRoughnessMap,this.clearcoatNormalMap=e.clearcoatNormalMap,this.clearcoatNormalScale.copy(e.clearcoatNormalScale),this.dispersion=e.dispersion,this.ior=e.ior,this.iridescence=e.iridescence,this.iridescenceMap=e.iridescenceMap,this.iridescenceIOR=e.iridescenceIOR,this.iridescenceThicknessRange=[...e.iridescenceThicknessRange],this.iridescenceThicknessMap=e.iridescenceThicknessMap,this.sheen=e.sheen,this.sheenColor.copy(e.sheenColor),this.sheenColorMap=e.sheenColorMap,this.sheenRoughness=e.sheenRoughness,this.sheenRoughnessMap=e.sheenRoughnessMap,this.transmission=e.transmission,this.transmissionMap=e.transmissionMap,this.thickness=e.thickness,this.thicknessMap=e.thicknessMap,this.attenuationDistance=e.attenuationDistance,this.attenuationColor.copy(e.attenuationColor),this.specularIntensity=e.specularIntensity,this.specularIntensityMap=e.specularIntensityMap,this.specularColor.copy(e.specularColor),this.specularColorMap=e.specularColorMap,this}}class Sv extends On{constructor(e){super(),this.isMeshLambertMaterial=!0,this.type="MeshLambertMaterial",this.color=new We(16777215),this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.emissive=new We(0),this.emissiveIntensity=1,this.emissiveMap=null,this.bumpMap=null,this.bumpScale=1,this.normalMap=null,this.normalMapType=Au,this.normalScale=new ue(1,1),this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.specularMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new qn,this.combine=_u,this.reflectivity=1,this.refractionRatio=.98,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.flatShading=!1,this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.color.copy(e.color),this.map=e.map,this.lightMap=e.lightMap,this.lightMapIntensity=e.lightMapIntensity,this.aoMap=e.aoMap,this.aoMapIntensity=e.aoMapIntensity,this.emissive.copy(e.emissive),this.emissiveMap=e.emissiveMap,this.emissiveIntensity=e.emissiveIntensity,this.bumpMap=e.bumpMap,this.bumpScale=e.bumpScale,this.normalMap=e.normalMap,this.normalMapType=e.normalMapType,this.normalScale.copy(e.normalScale),this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this.specularMap=e.specularMap,this.alphaMap=e.alphaMap,this.envMap=e.envMap,this.envMapRotation.copy(e.envMapRotation),this.combine=e.combine,this.reflectivity=e.reflectivity,this.refractionRatio=e.refractionRatio,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.wireframeLinecap=e.wireframeLinecap,this.wireframeLinejoin=e.wireframeLinejoin,this.flatShading=e.flatShading,this.fog=e.fog,this}}class bv extends On{constructor(e){super(),this.isMeshDepthMaterial=!0,this.type="MeshDepthMaterial",this.depthPacking=Fg,this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.wireframe=!1,this.wireframeLinewidth=1,this.setValues(e)}copy(e){return super.copy(e),this.depthPacking=e.depthPacking,this.map=e.map,this.alphaMap=e.alphaMap,this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this}}class wv extends On{constructor(e){super(),this.isMeshDistanceMaterial=!0,this.type="MeshDistanceMaterial",this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.setValues(e)}copy(e){return super.copy(e),this.map=e.map,this.alphaMap=e.alphaMap,this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this}}function Qa(i,e){return!i||i.constructor===e?i:typeof e.BYTES_PER_ELEMENT=="number"?new e(i):Array.prototype.slice.call(i)}function Ev(i){return ArrayBuffer.isView(i)&&!(i instanceof DataView)}function Tv(i){function e(r,s){return i[r]-i[s]}const t=i.length,n=new Array(t);for(let r=0;r!==t;++r)n[r]=r;return n.sort(e),n}function uh(i,e,t){const n=i.length,r=new i.constructor(n);for(let s=0,a=0;a!==n;++s){const o=t[s]*e;for(let c=0;c!==e;++c)r[a++]=i[o+c]}return r}function lp(i,e,t,n){let r=1,s=i[0];for(;s!==void 0&&s[n]===void 0;)s=i[r++];if(s===void 0)return;let a=s[n];if(a!==void 0)if(Array.isArray(a))do a=s[n],a!==void 0&&(e.push(s.time),t.push(...a)),s=i[r++];while(s!==void 0);else if(a.toArray!==void 0)do a=s[n],a!==void 0&&(e.push(s.time),a.toArray(t,t.length)),s=i[r++];while(s!==void 0);else do a=s[n],a!==void 0&&(e.push(s.time),t.push(a)),s=i[r++];while(s!==void 0)}class va{constructor(e,t,n,r){this.parameterPositions=e,this._cachedIndex=0,this.resultBuffer=r!==void 0?r:new t.constructor(n),this.sampleValues=t,this.valueSize=n,this.settings=null,this.DefaultSettings_={}}evaluate(e){const t=this.parameterPositions;let n=this._cachedIndex,r=t[n],s=t[n-1];n:{e:{let a;t:{i:if(!(e<r)){for(let o=n+2;;){if(r===void 0){if(e<s)break i;return n=t.length,this._cachedIndex=n,this.copySampleValue_(n-1)}if(n===o)break;if(s=r,r=t[++n],e<r)break e}a=t.length;break t}if(!(e>=s)){const o=t[1];e<o&&(n=2,s=o);for(let c=n-2;;){if(s===void 0)return this._cachedIndex=0,this.copySampleValue_(0);if(n===c)break;if(r=s,s=t[--n-1],e>=s)break e}a=n,n=0;break t}break n}for(;n<a;){const o=n+a>>>1;e<t[o]?a=o:n=o+1}if(r=t[n],s=t[n-1],s===void 0)return this._cachedIndex=0,this.copySampleValue_(0);if(r===void 0)return n=t.length,this._cachedIndex=n,this.copySampleValue_(n-1)}this._cachedIndex=n,this.intervalChanged_(n,s,r)}return this.interpolate_(n,s,e,r)}getSettings_(){return this.settings||this.DefaultSettings_}copySampleValue_(e){const t=this.resultBuffer,n=this.sampleValues,r=this.valueSize,s=e*r;for(let a=0;a!==r;++a)t[a]=n[s+a];return t}interpolate_(){throw new Error("call to abstract method")}intervalChanged_(){}}class Av extends va{constructor(e,t,n,r){super(e,t,n,r),this._weightPrev=-0,this._offsetPrev=-0,this._weightNext=-0,this._offsetNext=-0,this.DefaultSettings_={endingStart:xd,endingEnd:xd}}intervalChanged_(e,t,n){const r=this.parameterPositions;let s=e-2,a=e+1,o=r[s],c=r[a];if(o===void 0)switch(this.getSettings_().endingStart){case Md:s=e,o=2*t-n;break;case Sd:s=r.length-2,o=t+r[s]-r[s+1];break;default:s=e,o=n}if(c===void 0)switch(this.getSettings_().endingEnd){case Md:a=e,c=2*n-t;break;case Sd:a=1,c=n+r[1]-r[0];break;default:a=e-1,c=t}const l=(n-t)*.5,u=this.valueSize;this._weightPrev=l/(t-o),this._weightNext=l/(c-n),this._offsetPrev=s*u,this._offsetNext=a*u}interpolate_(e,t,n,r){const s=this.resultBuffer,a=this.sampleValues,o=this.valueSize,c=e*o,l=c-o,u=this._offsetPrev,d=this._offsetNext,f=this._weightPrev,h=this._weightNext,m=(n-t)/(r-t),v=m*m,g=v*m,p=-f*g+2*f*v-f*m,_=(1+f)*g+(-1.5-2*f)*v+(-.5+f)*m+1,y=(-1-h)*g+(1.5+h)*v+.5*m,x=h*g-h*v;for(let A=0;A!==o;++A)s[A]=p*a[u+A]+_*a[l+A]+y*a[c+A]+x*a[d+A];return s}}class Rv extends va{constructor(e,t,n,r){super(e,t,n,r)}interpolate_(e,t,n,r){const s=this.resultBuffer,a=this.sampleValues,o=this.valueSize,c=e*o,l=c-o,u=(n-t)/(r-t),d=1-u;for(let f=0;f!==o;++f)s[f]=a[l+f]*d+a[c+f]*u;return s}}class Cv extends va{constructor(e,t,n,r){super(e,t,n,r)}interpolate_(e){return this.copySampleValue_(e-1)}}class Yn{constructor(e,t,n,r){if(e===void 0)throw new Error("THREE.KeyframeTrack: track name is undefined");if(t===void 0||t.length===0)throw new Error("THREE.KeyframeTrack: no keyframes in track named "+e);this.name=e,this.times=Qa(t,this.TimeBufferType),this.values=Qa(n,this.ValueBufferType),this.setInterpolation(r||this.DefaultInterpolation)}static toJSON(e){const t=e.constructor;let n;if(t.toJSON!==this.toJSON)n=t.toJSON(e);else{n={name:e.name,times:Qa(e.times,Array),values:Qa(e.values,Array)};const r=e.getInterpolation();r!==e.DefaultInterpolation&&(n.interpolation=r)}return n.type=e.ValueTypeName,n}InterpolantFactoryMethodDiscrete(e){return new Cv(this.times,this.values,this.getValueSize(),e)}InterpolantFactoryMethodLinear(e){return new Rv(this.times,this.values,this.getValueSize(),e)}InterpolantFactoryMethodSmooth(e){return new Av(this.times,this.values,this.getValueSize(),e)}setInterpolation(e){let t;switch(e){case na:t=this.InterpolantFactoryMethodDiscrete;break;case ia:t=this.InterpolantFactoryMethodLinear;break;case ac:t=this.InterpolantFactoryMethodSmooth;break}if(t===void 0){const n="unsupported interpolation for "+this.ValueTypeName+" keyframe track named "+this.name;if(this.createInterpolant===void 0)if(e!==this.DefaultInterpolation)this.setInterpolation(this.DefaultInterpolation);else throw new Error(n);return console.warn("THREE.KeyframeTrack:",n),this}return this.createInterpolant=t,this}getInterpolation(){switch(this.createInterpolant){case this.InterpolantFactoryMethodDiscrete:return na;case this.InterpolantFactoryMethodLinear:return ia;case this.InterpolantFactoryMethodSmooth:return ac}}getValueSize(){return this.values.length/this.times.length}shift(e){if(e!==0){const t=this.times;for(let n=0,r=t.length;n!==r;++n)t[n]+=e}return this}scale(e){if(e!==1){const t=this.times;for(let n=0,r=t.length;n!==r;++n)t[n]*=e}return this}trim(e,t){const n=this.times,r=n.length;let s=0,a=r-1;for(;s!==r&&n[s]<e;)++s;for(;a!==-1&&n[a]>t;)--a;if(++a,s!==0||a!==r){s>=a&&(a=Math.max(a,1),s=a-1);const o=this.getValueSize();this.times=n.slice(s,a),this.values=this.values.slice(s*o,a*o)}return this}validate(){let e=!0;const t=this.getValueSize();t-Math.floor(t)!==0&&(console.error("THREE.KeyframeTrack: Invalid value size in track.",this),e=!1);const n=this.times,r=this.values,s=n.length;s===0&&(console.error("THREE.KeyframeTrack: Track is empty.",this),e=!1);let a=null;for(let o=0;o!==s;o++){const c=n[o];if(typeof c=="number"&&isNaN(c)){console.error("THREE.KeyframeTrack: Time is not a valid number.",this,o,c),e=!1;break}if(a!==null&&a>c){console.error("THREE.KeyframeTrack: Out of order keys.",this,o,c,a),e=!1;break}a=c}if(r!==void 0&&Ev(r))for(let o=0,c=r.length;o!==c;++o){const l=r[o];if(isNaN(l)){console.error("THREE.KeyframeTrack: Value is not a valid number.",this,o,l),e=!1;break}}return e}optimize(){const e=this.times.slice(),t=this.values.slice(),n=this.getValueSize(),r=this.getInterpolation()===ac,s=e.length-1;let a=1;for(let o=1;o<s;++o){let c=!1;const l=e[o],u=e[o+1];if(l!==u&&(o!==1||l!==e[0]))if(r)c=!0;else{const d=o*n,f=d-n,h=d+n;for(let m=0;m!==n;++m){const v=t[d+m];if(v!==t[f+m]||v!==t[h+m]){c=!0;break}}}if(c){if(o!==a){e[a]=e[o];const d=o*n,f=a*n;for(let h=0;h!==n;++h)t[f+h]=t[d+h]}++a}}if(s>0){e[a]=e[s];for(let o=s*n,c=a*n,l=0;l!==n;++l)t[c+l]=t[o+l];++a}return a!==e.length?(this.times=e.slice(0,a),this.values=t.slice(0,a*n)):(this.times=e,this.values=t),this}clone(){const e=this.times.slice(),t=this.values.slice(),n=this.constructor,r=new n(this.name,e,t);return r.createInterpolant=this.createInterpolant,r}}Yn.prototype.ValueTypeName="";Yn.prototype.TimeBufferType=Float32Array;Yn.prototype.ValueBufferType=Float32Array;Yn.prototype.DefaultInterpolation=ia;class ps extends Yn{constructor(e,t,n){super(e,t,n)}}ps.prototype.ValueTypeName="bool";ps.prototype.ValueBufferType=Array;ps.prototype.DefaultInterpolation=na;ps.prototype.InterpolantFactoryMethodLinear=void 0;ps.prototype.InterpolantFactoryMethodSmooth=void 0;class up extends Yn{constructor(e,t,n,r){super(e,t,n,r)}}up.prototype.ValueTypeName="color";class cs extends Yn{constructor(e,t,n,r){super(e,t,n,r)}}cs.prototype.ValueTypeName="number";class Lv extends va{constructor(e,t,n,r){super(e,t,n,r)}interpolate_(e,t,n,r){const s=this.resultBuffer,a=this.sampleValues,o=this.valueSize,c=(n-t)/(r-t);let l=e*o;for(let u=l+o;l!==u;l+=4)Ji.slerpFlat(s,0,a,l-o,a,l,c);return s}}class ls extends Yn{constructor(e,t,n,r){super(e,t,n,r)}InterpolantFactoryMethodLinear(e){return new Lv(this.times,this.values,this.getValueSize(),e)}}ls.prototype.ValueTypeName="quaternion";ls.prototype.InterpolantFactoryMethodSmooth=void 0;class ms extends Yn{constructor(e,t,n){super(e,t,n)}}ms.prototype.ValueTypeName="string";ms.prototype.ValueBufferType=Array;ms.prototype.DefaultInterpolation=na;ms.prototype.InterpolantFactoryMethodLinear=void 0;ms.prototype.InterpolantFactoryMethodSmooth=void 0;class us extends Yn{constructor(e,t,n,r){super(e,t,n,r)}}us.prototype.ValueTypeName="vector";class Pv{constructor(e="",t=-1,n=[],r=Ng){this.name=e,this.tracks=n,this.duration=t,this.blendMode=r,this.uuid=Fn(),this.userData={},this.duration<0&&this.resetDuration()}static parse(e){const t=[],n=e.tracks,r=1/(e.fps||1);for(let a=0,o=n.length;a!==o;++a)t.push(Dv(n[a]).scale(r));const s=new this(e.name,e.duration,t,e.blendMode);return s.uuid=e.uuid,s.userData=JSON.parse(e.userData||"{}"),s}static toJSON(e){const t=[],n=e.tracks,r={name:e.name,duration:e.duration,tracks:t,uuid:e.uuid,blendMode:e.blendMode,userData:JSON.stringify(e.userData)};for(let s=0,a=n.length;s!==a;++s)t.push(Yn.toJSON(n[s]));return r}static CreateFromMorphTargetSequence(e,t,n,r){const s=t.length,a=[];for(let o=0;o<s;o++){let c=[],l=[];c.push((o+s-1)%s,o,(o+1)%s),l.push(0,1,0);const u=Tv(c);c=uh(c,1,u),l=uh(l,1,u),!r&&c[0]===0&&(c.push(s),l.push(l[0])),a.push(new cs(".morphTargetInfluences["+t[o].name+"]",c,l).scale(1/n))}return new this(e,-1,a)}static findByName(e,t){let n=e;if(!Array.isArray(e)){const r=e;n=r.geometry&&r.geometry.animations||r.animations}for(let r=0;r<n.length;r++)if(n[r].name===t)return n[r];return null}static CreateClipsFromMorphTargetSequences(e,t,n){const r={},s=/^([\w-]*?)([\d]+)$/;for(let o=0,c=e.length;o<c;o++){const l=e[o],u=l.name.match(s);if(u&&u.length>1){const d=u[1];let f=r[d];f||(r[d]=f=[]),f.push(l)}}const a=[];for(const o in r)a.push(this.CreateFromMorphTargetSequence(o,r[o],t,n));return a}static parseAnimation(e,t){if(console.warn("THREE.AnimationClip: parseAnimation() is deprecated and will be removed with r185"),!e)return console.error("THREE.AnimationClip: No animation in JSONLoader data."),null;const n=function(d,f,h,m,v){if(h.length!==0){const g=[],p=[];lp(h,g,p,m),g.length!==0&&v.push(new d(f,g,p))}},r=[],s=e.name||"default",a=e.fps||30,o=e.blendMode;let c=e.length||-1;const l=e.hierarchy||[];for(let d=0;d<l.length;d++){const f=l[d].keys;if(!(!f||f.length===0))if(f[0].morphTargets){const h={};let m;for(m=0;m<f.length;m++)if(f[m].morphTargets)for(let v=0;v<f[m].morphTargets.length;v++)h[f[m].morphTargets[v]]=-1;for(const v in h){const g=[],p=[];for(let _=0;_!==f[m].morphTargets.length;++_){const y=f[m];g.push(y.time),p.push(y.morphTarget===v?1:0)}r.push(new cs(".morphTargetInfluence["+v+"]",g,p))}c=h.length*a}else{const h=".bones["+t[d].name+"]";n(us,h+".position",f,"pos",r),n(ls,h+".quaternion",f,"rot",r),n(us,h+".scale",f,"scl",r)}}return r.length===0?null:new this(s,c,r,o)}resetDuration(){const e=this.tracks;let t=0;for(let n=0,r=e.length;n!==r;++n){const s=this.tracks[n];t=Math.max(t,s.times[s.times.length-1])}return this.duration=t,this}trim(){for(let e=0;e<this.tracks.length;e++)this.tracks[e].trim(0,this.duration);return this}validate(){let e=!0;for(let t=0;t<this.tracks.length;t++)e=e&&this.tracks[t].validate();return e}optimize(){for(let e=0;e<this.tracks.length;e++)this.tracks[e].optimize();return this}clone(){const e=[];for(let n=0;n<this.tracks.length;n++)e.push(this.tracks[n].clone());const t=new this.constructor(this.name,this.duration,e,this.blendMode);return t.userData=JSON.parse(JSON.stringify(this.userData)),t}toJSON(){return this.constructor.toJSON(this)}}function Iv(i){switch(i.toLowerCase()){case"scalar":case"double":case"float":case"number":case"integer":return cs;case"vector":case"vector2":case"vector3":case"vector4":return us;case"color":return up;case"quaternion":return ls;case"bool":case"boolean":return ps;case"string":return ms}throw new Error("THREE.KeyframeTrack: Unsupported typeName: "+i)}function Dv(i){if(i.type===void 0)throw new Error("THREE.KeyframeTrack: track type undefined, can not parse");const e=Iv(i.type);if(i.times===void 0){const t=[],n=[];lp(i.keys,t,n,"value"),i.times=t,i.values=n}return e.parse!==void 0?e.parse(i):new e(i.name,i.times,i.values,i.interpolation)}const wi={enabled:!1,files:{},add:function(i,e){this.enabled!==!1&&(this.files[i]=e)},get:function(i){if(this.enabled!==!1)return this.files[i]},remove:function(i){delete this.files[i]},clear:function(){this.files={}}};class Nv{constructor(e,t,n){const r=this;let s=!1,a=0,o=0,c;const l=[];this.onStart=void 0,this.onLoad=e,this.onProgress=t,this.onError=n,this.abortController=new AbortController,this.itemStart=function(u){o++,s===!1&&r.onStart!==void 0&&r.onStart(u,a,o),s=!0},this.itemEnd=function(u){a++,r.onProgress!==void 0&&r.onProgress(u,a,o),a===o&&(s=!1,r.onLoad!==void 0&&r.onLoad())},this.itemError=function(u){r.onError!==void 0&&r.onError(u)},this.resolveURL=function(u){return c?c(u):u},this.setURLModifier=function(u){return c=u,this},this.addHandler=function(u,d){return l.push(u,d),this},this.removeHandler=function(u){const d=l.indexOf(u);return d!==-1&&l.splice(d,2),this},this.getHandler=function(u){for(let d=0,f=l.length;d<f;d+=2){const h=l[d],m=l[d+1];if(h.global&&(h.lastIndex=0),h.test(u))return m}return null},this.abort=function(){return this.abortController.abort(),this.abortController=new AbortController,this}}}const Uv=new Nv;class gs{constructor(e){this.manager=e!==void 0?e:Uv,this.crossOrigin="anonymous",this.withCredentials=!1,this.path="",this.resourcePath="",this.requestHeader={}}load(){}loadAsync(e,t){const n=this;return new Promise(function(r,s){n.load(e,r,t,s)})}parse(){}setCrossOrigin(e){return this.crossOrigin=e,this}setWithCredentials(e){return this.withCredentials=e,this}setPath(e){return this.path=e,this}setResourcePath(e){return this.resourcePath=e,this}setRequestHeader(e){return this.requestHeader=e,this}abort(){return this}}gs.DEFAULT_MATERIAL_NAME="__DEFAULT";const vi={};class Fv extends Error{constructor(e,t){super(e),this.response=t}}class dp extends gs{constructor(e){super(e),this.mimeType="",this.responseType="",this._abortController=new AbortController}load(e,t,n,r){e===void 0&&(e=""),this.path!==void 0&&(e=this.path+e),e=this.manager.resolveURL(e);const s=wi.get(`file:${e}`);if(s!==void 0)return this.manager.itemStart(e),setTimeout(()=>{t&&t(s),this.manager.itemEnd(e)},0),s;if(vi[e]!==void 0){vi[e].push({onLoad:t,onProgress:n,onError:r});return}vi[e]=[],vi[e].push({onLoad:t,onProgress:n,onError:r});const a=new Request(e,{headers:new Headers(this.requestHeader),credentials:this.withCredentials?"include":"same-origin",signal:typeof AbortSignal.any=="function"?AbortSignal.any([this._abortController.signal,this.manager.abortController.signal]):this._abortController.signal}),o=this.mimeType,c=this.responseType;fetch(a).then(l=>{if(l.status===200||l.status===0){if(l.status===0&&console.warn("THREE.FileLoader: HTTP Status 0 received."),typeof ReadableStream>"u"||l.body===void 0||l.body.getReader===void 0)return l;const u=vi[e],d=l.body.getReader(),f=l.headers.get("X-File-Size")||l.headers.get("Content-Length"),h=f?parseInt(f):0,m=h!==0;let v=0;const g=new ReadableStream({start(p){_();function _(){d.read().then(({done:y,value:x})=>{if(y)p.close();else{v+=x.byteLength;const A=new ProgressEvent("progress",{lengthComputable:m,loaded:v,total:h});for(let w=0,R=u.length;w<R;w++){const C=u[w];C.onProgress&&C.onProgress(A)}p.enqueue(x),_()}},y=>{p.error(y)})}}});return new Response(g)}else throw new Fv(`fetch for "${l.url}" responded with ${l.status}: ${l.statusText}`,l)}).then(l=>{switch(c){case"arraybuffer":return l.arrayBuffer();case"blob":return l.blob();case"document":return l.text().then(u=>new DOMParser().parseFromString(u,o));case"json":return l.json();default:if(o==="")return l.text();{const d=/charset="?([^;"\s]*)"?/i.exec(o),f=d&&d[1]?d[1].toLowerCase():void 0,h=new TextDecoder(f);return l.arrayBuffer().then(m=>h.decode(m))}}}).then(l=>{wi.add(`file:${e}`,l);const u=vi[e];delete vi[e];for(let d=0,f=u.length;d<f;d++){const h=u[d];h.onLoad&&h.onLoad(l)}}).catch(l=>{const u=vi[e];if(u===void 0)throw this.manager.itemError(e),l;delete vi[e];for(let d=0,f=u.length;d<f;d++){const h=u[d];h.onError&&h.onError(l)}this.manager.itemError(e)}).finally(()=>{this.manager.itemEnd(e)}),this.manager.itemStart(e)}setResponseType(e){return this.responseType=e,this}setMimeType(e){return this.mimeType=e,this}abort(){return this._abortController.abort(),this._abortController=new AbortController,this}}const zr=new WeakMap;class Ov extends gs{constructor(e){super(e)}load(e,t,n,r){this.path!==void 0&&(e=this.path+e),e=this.manager.resolveURL(e);const s=this,a=wi.get(`image:${e}`);if(a!==void 0){if(a.complete===!0)s.manager.itemStart(e),setTimeout(function(){t&&t(a),s.manager.itemEnd(e)},0);else{let d=zr.get(a);d===void 0&&(d=[],zr.set(a,d)),d.push({onLoad:t,onError:r})}return a}const o=ra("img");function c(){u(),t&&t(this);const d=zr.get(this)||[];for(let f=0;f<d.length;f++){const h=d[f];h.onLoad&&h.onLoad(this)}zr.delete(this),s.manager.itemEnd(e)}function l(d){u(),r&&r(d),wi.remove(`image:${e}`);const f=zr.get(this)||[];for(let h=0;h<f.length;h++){const m=f[h];m.onError&&m.onError(d)}zr.delete(this),s.manager.itemError(e),s.manager.itemEnd(e)}function u(){o.removeEventListener("load",c,!1),o.removeEventListener("error",l,!1)}return o.addEventListener("load",c,!1),o.addEventListener("error",l,!1),e.slice(0,5)!=="data:"&&this.crossOrigin!==void 0&&(o.crossOrigin=this.crossOrigin),wi.add(`image:${e}`,o),s.manager.itemStart(e),o.src=e,o}}class hp extends gs{constructor(e){super(e)}load(e,t,n,r){const s=new Vt,a=new Ov(this.manager);return a.setCrossOrigin(this.crossOrigin),a.setPath(this.path),a.load(e,function(o){s.image=o,s.needsUpdate=!0,t!==void 0&&t(s)},n,r),s}}class ko extends wt{constructor(e,t=1){super(),this.isLight=!0,this.type="Light",this.color=new We(e),this.intensity=t}dispose(){}copy(e,t){return super.copy(e,t),this.color.copy(e.color),this.intensity=e.intensity,this}toJSON(e){const t=super.toJSON(e);return t.object.color=this.color.getHex(),t.object.intensity=this.intensity,this.groundColor!==void 0&&(t.object.groundColor=this.groundColor.getHex()),this.distance!==void 0&&(t.object.distance=this.distance),this.angle!==void 0&&(t.object.angle=this.angle),this.decay!==void 0&&(t.object.decay=this.decay),this.penumbra!==void 0&&(t.object.penumbra=this.penumbra),this.shadow!==void 0&&(t.object.shadow=this.shadow.toJSON()),this.target!==void 0&&(t.object.target=this.target.uuid),t}}class Wu extends ko{constructor(e,t,n){super(e,n),this.isHemisphereLight=!0,this.type="HemisphereLight",this.position.copy(wt.DEFAULT_UP),this.updateMatrix(),this.groundColor=new We(t)}copy(e,t){return super.copy(e,t),this.groundColor.copy(e.groundColor),this}}const Fc=new Ke,dh=new P,hh=new P;class $u{constructor(e){this.camera=e,this.intensity=1,this.bias=0,this.normalBias=0,this.radius=1,this.blurSamples=8,this.mapSize=new ue(512,512),this.mapType=ai,this.map=null,this.mapPass=null,this.matrix=new Ke,this.autoUpdate=!0,this.needsUpdate=!1,this._frustum=new Iu,this._frameExtents=new ue(1,1),this._viewportCount=1,this._viewports=[new ht(0,0,1,1)]}getViewportCount(){return this._viewportCount}getFrustum(){return this._frustum}updateMatrices(e){const t=this.camera,n=this.matrix;dh.setFromMatrixPosition(e.matrixWorld),t.position.copy(dh),hh.setFromMatrixPosition(e.target.matrixWorld),t.lookAt(hh),t.updateMatrixWorld(),Fc.multiplyMatrices(t.projectionMatrix,t.matrixWorldInverse),this._frustum.setFromProjectionMatrix(Fc,t.coordinateSystem,t.reversedDepth),t.reversedDepth?n.set(.5,0,0,.5,0,.5,0,.5,0,0,1,0,0,0,0,1):n.set(.5,0,0,.5,0,.5,0,.5,0,0,.5,.5,0,0,0,1),n.multiply(Fc)}getViewport(e){return this._viewports[e]}getFrameExtents(){return this._frameExtents}dispose(){this.map&&this.map.dispose(),this.mapPass&&this.mapPass.dispose()}copy(e){return this.camera=e.camera.clone(),this.intensity=e.intensity,this.bias=e.bias,this.radius=e.radius,this.autoUpdate=e.autoUpdate,this.needsUpdate=e.needsUpdate,this.normalBias=e.normalBias,this.blurSamples=e.blurSamples,this.mapSize.copy(e.mapSize),this}clone(){return new this.constructor().copy(this)}toJSON(){const e={};return this.intensity!==1&&(e.intensity=this.intensity),this.bias!==0&&(e.bias=this.bias),this.normalBias!==0&&(e.normalBias=this.normalBias),this.radius!==1&&(e.radius=this.radius),(this.mapSize.x!==512||this.mapSize.y!==512)&&(e.mapSize=this.mapSize.toArray()),e.camera=this.camera.toJSON(!1).object,delete e.camera.matrix,e}}class Bv extends $u{constructor(){super(new nn(50,1,.5,500)),this.isSpotLightShadow=!0,this.focus=1,this.aspect=1}updateMatrices(e){const t=this.camera,n=ss*2*e.angle*this.focus,r=this.mapSize.width/this.mapSize.height*this.aspect,s=e.distance||t.far;(n!==t.fov||r!==t.aspect||s!==t.far)&&(t.fov=n,t.aspect=r,t.far=s,t.updateProjectionMatrix()),super.updateMatrices(e)}copy(e){return super.copy(e),this.focus=e.focus,this}}class kv extends ko{constructor(e,t,n=0,r=Math.PI/3,s=0,a=2){super(e,t),this.isSpotLight=!0,this.type="SpotLight",this.position.copy(wt.DEFAULT_UP),this.updateMatrix(),this.target=new wt,this.distance=n,this.angle=r,this.penumbra=s,this.decay=a,this.map=null,this.shadow=new Bv}get power(){return this.intensity*Math.PI}set power(e){this.intensity=e/Math.PI}dispose(){this.shadow.dispose()}copy(e,t){return super.copy(e,t),this.distance=e.distance,this.angle=e.angle,this.penumbra=e.penumbra,this.decay=e.decay,this.target=e.target.clone(),this.shadow=e.shadow.clone(),this}}const fh=new Ke,Is=new P,Oc=new P;class zv extends $u{constructor(){super(new nn(90,1,.5,500)),this.isPointLightShadow=!0,this._frameExtents=new ue(4,2),this._viewportCount=6,this._viewports=[new ht(2,1,1,1),new ht(0,1,1,1),new ht(3,1,1,1),new ht(1,1,1,1),new ht(3,0,1,1),new ht(1,0,1,1)],this._cubeDirections=[new P(1,0,0),new P(-1,0,0),new P(0,0,1),new P(0,0,-1),new P(0,1,0),new P(0,-1,0)],this._cubeUps=[new P(0,1,0),new P(0,1,0),new P(0,1,0),new P(0,1,0),new P(0,0,1),new P(0,0,-1)]}updateMatrices(e,t=0){const n=this.camera,r=this.matrix,s=e.distance||n.far;s!==n.far&&(n.far=s,n.updateProjectionMatrix()),Is.setFromMatrixPosition(e.matrixWorld),n.position.copy(Is),Oc.copy(n.position),Oc.add(this._cubeDirections[t]),n.up.copy(this._cubeUps[t]),n.lookAt(Oc),n.updateMatrixWorld(),r.makeTranslation(-Is.x,-Is.y,-Is.z),fh.multiplyMatrices(n.projectionMatrix,n.matrixWorldInverse),this._frustum.setFromProjectionMatrix(fh,n.coordinateSystem,n.reversedDepth)}}class fp extends ko{constructor(e,t,n=0,r=2){super(e,t),this.isPointLight=!0,this.type="PointLight",this.distance=n,this.decay=r,this.shadow=new zv}get power(){return this.intensity*4*Math.PI}set power(e){this.intensity=e/(4*Math.PI)}dispose(){this.shadow.dispose()}copy(e,t){return super.copy(e,t),this.distance=e.distance,this.decay=e.decay,this.shadow=e.shadow.clone(),this}}class zo extends zf{constructor(e=-1,t=1,n=1,r=-1,s=.1,a=2e3){super(),this.isOrthographicCamera=!0,this.type="OrthographicCamera",this.zoom=1,this.view=null,this.left=e,this.right=t,this.top=n,this.bottom=r,this.near=s,this.far=a,this.updateProjectionMatrix()}copy(e,t){return super.copy(e,t),this.left=e.left,this.right=e.right,this.top=e.top,this.bottom=e.bottom,this.near=e.near,this.far=e.far,this.zoom=e.zoom,this.view=e.view===null?null:Object.assign({},e.view),this}setViewOffset(e,t,n,r,s,a){this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=e,this.view.fullHeight=t,this.view.offsetX=n,this.view.offsetY=r,this.view.width=s,this.view.height=a,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){const e=(this.right-this.left)/(2*this.zoom),t=(this.top-this.bottom)/(2*this.zoom),n=(this.right+this.left)/2,r=(this.top+this.bottom)/2;let s=n-e,a=n+e,o=r+t,c=r-t;if(this.view!==null&&this.view.enabled){const l=(this.right-this.left)/this.view.fullWidth/this.zoom,u=(this.top-this.bottom)/this.view.fullHeight/this.zoom;s+=l*this.view.offsetX,a=s+l*this.view.width,o-=u*this.view.offsetY,c=o-u*this.view.height}this.projectionMatrix.makeOrthographic(s,a,o,c,this.near,this.far,this.coordinateSystem,this.reversedDepth),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(e){const t=super.toJSON(e);return t.object.zoom=this.zoom,t.object.left=this.left,t.object.right=this.right,t.object.top=this.top,t.object.bottom=this.bottom,t.object.near=this.near,t.object.far=this.far,this.view!==null&&(t.object.view=Object.assign({},this.view)),t}}class Hv extends $u{constructor(){super(new zo(-5,5,5,-5,.5,500)),this.isDirectionalLightShadow=!0}}class ds extends ko{constructor(e,t){super(e,t),this.isDirectionalLight=!0,this.type="DirectionalLight",this.position.copy(wt.DEFAULT_UP),this.updateMatrix(),this.target=new wt,this.shadow=new Hv}dispose(){this.shadow.dispose()}copy(e){return super.copy(e),this.target=e.target.clone(),this.shadow=e.shadow.clone(),this}}class qs{static extractUrlBase(e){const t=e.lastIndexOf("/");return t===-1?"./":e.slice(0,t+1)}static resolveURL(e,t){return typeof e!="string"||e===""?"":(/^https?:\/\//i.test(t)&&/^\//.test(e)&&(t=t.replace(/(^https?:\/\/[^\/]+).*/i,"$1")),/^(https?:)?\/\//i.test(e)||/^data:.*,.*$/i.test(e)||/^blob:.*$/i.test(e)?e:t+e)}}const Bc=new WeakMap;class Vv extends gs{constructor(e){super(e),this.isImageBitmapLoader=!0,typeof createImageBitmap>"u"&&console.warn("THREE.ImageBitmapLoader: createImageBitmap() not supported."),typeof fetch>"u"&&console.warn("THREE.ImageBitmapLoader: fetch() not supported."),this.options={premultiplyAlpha:"none"},this._abortController=new AbortController}setOptions(e){return this.options=e,this}load(e,t,n,r){e===void 0&&(e=""),this.path!==void 0&&(e=this.path+e),e=this.manager.resolveURL(e);const s=this,a=wi.get(`image-bitmap:${e}`);if(a!==void 0){if(s.manager.itemStart(e),a.then){a.then(l=>{if(Bc.has(a)===!0)r&&r(Bc.get(a)),s.manager.itemError(e),s.manager.itemEnd(e);else return t&&t(l),s.manager.itemEnd(e),l});return}return setTimeout(function(){t&&t(a),s.manager.itemEnd(e)},0),a}const o={};o.credentials=this.crossOrigin==="anonymous"?"same-origin":"include",o.headers=this.requestHeader,o.signal=typeof AbortSignal.any=="function"?AbortSignal.any([this._abortController.signal,this.manager.abortController.signal]):this._abortController.signal;const c=fetch(e,o).then(function(l){return l.blob()}).then(function(l){return createImageBitmap(l,Object.assign(s.options,{colorSpaceConversion:"none"}))}).then(function(l){return wi.add(`image-bitmap:${e}`,l),t&&t(l),s.manager.itemEnd(e),l}).catch(function(l){r&&r(l),Bc.set(c,l),wi.remove(`image-bitmap:${e}`),s.manager.itemError(e),s.manager.itemEnd(e)});wi.add(`image-bitmap:${e}`,c),s.manager.itemStart(e)}abort(){return this._abortController.abort(),this._abortController=new AbortController,this}}class Gv extends nn{constructor(e=[]){super(),this.isArrayCamera=!0,this.isMultiViewCamera=!1,this.cameras=e}}const Xu="\\[\\]\\.:\\/",Wv=new RegExp("["+Xu+"]","g"),qu="[^"+Xu+"]",$v="[^"+Xu.replace("\\.","")+"]",Xv=/((?:WC+[\/:])*)/.source.replace("WC",qu),qv=/(WCOD+)?/.source.replace("WCOD",$v),jv=/(?:\.(WC+)(?:\[(.+)\])?)?/.source.replace("WC",qu),Yv=/\.(WC+)(?:\[(.+)\])?/.source.replace("WC",qu),Kv=new RegExp("^"+Xv+qv+jv+Yv+"$"),Zv=["material","materials","bones","map"];class Jv{constructor(e,t,n){const r=n||gt.parseTrackName(t);this._targetGroup=e,this._bindings=e.subscribe_(t,r)}getValue(e,t){this.bind();const n=this._targetGroup.nCachedObjects_,r=this._bindings[n];r!==void 0&&r.getValue(e,t)}setValue(e,t){const n=this._bindings;for(let r=this._targetGroup.nCachedObjects_,s=n.length;r!==s;++r)n[r].setValue(e,t)}bind(){const e=this._bindings;for(let t=this._targetGroup.nCachedObjects_,n=e.length;t!==n;++t)e[t].bind()}unbind(){const e=this._bindings;for(let t=this._targetGroup.nCachedObjects_,n=e.length;t!==n;++t)e[t].unbind()}}class gt{constructor(e,t,n){this.path=t,this.parsedPath=n||gt.parseTrackName(t),this.node=gt.findNode(e,this.parsedPath.nodeName),this.rootNode=e,this.getValue=this._getValue_unbound,this.setValue=this._setValue_unbound}static create(e,t,n){return e&&e.isAnimationObjectGroup?new gt.Composite(e,t,n):new gt(e,t,n)}static sanitizeNodeName(e){return e.replace(/\s/g,"_").replace(Wv,"")}static parseTrackName(e){const t=Kv.exec(e);if(t===null)throw new Error("PropertyBinding: Cannot parse trackName: "+e);const n={nodeName:t[2],objectName:t[3],objectIndex:t[4],propertyName:t[5],propertyIndex:t[6]},r=n.nodeName&&n.nodeName.lastIndexOf(".");if(r!==void 0&&r!==-1){const s=n.nodeName.substring(r+1);Zv.indexOf(s)!==-1&&(n.nodeName=n.nodeName.substring(0,r),n.objectName=s)}if(n.propertyName===null||n.propertyName.length===0)throw new Error("PropertyBinding: can not parse propertyName from trackName: "+e);return n}static findNode(e,t){if(t===void 0||t===""||t==="."||t===-1||t===e.name||t===e.uuid)return e;if(e.skeleton){const n=e.skeleton.getBoneByName(t);if(n!==void 0)return n}if(e.children){const n=function(s){for(let a=0;a<s.length;a++){const o=s[a];if(o.name===t||o.uuid===t)return o;const c=n(o.children);if(c)return c}return null},r=n(e.children);if(r)return r}return null}_getValue_unavailable(){}_setValue_unavailable(){}_getValue_direct(e,t){e[t]=this.targetObject[this.propertyName]}_getValue_array(e,t){const n=this.resolvedProperty;for(let r=0,s=n.length;r!==s;++r)e[t++]=n[r]}_getValue_arrayElement(e,t){e[t]=this.resolvedProperty[this.propertyIndex]}_getValue_toArray(e,t){this.resolvedProperty.toArray(e,t)}_setValue_direct(e,t){this.targetObject[this.propertyName]=e[t]}_setValue_direct_setNeedsUpdate(e,t){this.targetObject[this.propertyName]=e[t],this.targetObject.needsUpdate=!0}_setValue_direct_setMatrixWorldNeedsUpdate(e,t){this.targetObject[this.propertyName]=e[t],this.targetObject.matrixWorldNeedsUpdate=!0}_setValue_array(e,t){const n=this.resolvedProperty;for(let r=0,s=n.length;r!==s;++r)n[r]=e[t++]}_setValue_array_setNeedsUpdate(e,t){const n=this.resolvedProperty;for(let r=0,s=n.length;r!==s;++r)n[r]=e[t++];this.targetObject.needsUpdate=!0}_setValue_array_setMatrixWorldNeedsUpdate(e,t){const n=this.resolvedProperty;for(let r=0,s=n.length;r!==s;++r)n[r]=e[t++];this.targetObject.matrixWorldNeedsUpdate=!0}_setValue_arrayElement(e,t){this.resolvedProperty[this.propertyIndex]=e[t]}_setValue_arrayElement_setNeedsUpdate(e,t){this.resolvedProperty[this.propertyIndex]=e[t],this.targetObject.needsUpdate=!0}_setValue_arrayElement_setMatrixWorldNeedsUpdate(e,t){this.resolvedProperty[this.propertyIndex]=e[t],this.targetObject.matrixWorldNeedsUpdate=!0}_setValue_fromArray(e,t){this.resolvedProperty.fromArray(e,t)}_setValue_fromArray_setNeedsUpdate(e,t){this.resolvedProperty.fromArray(e,t),this.targetObject.needsUpdate=!0}_setValue_fromArray_setMatrixWorldNeedsUpdate(e,t){this.resolvedProperty.fromArray(e,t),this.targetObject.matrixWorldNeedsUpdate=!0}_getValue_unbound(e,t){this.bind(),this.getValue(e,t)}_setValue_unbound(e,t){this.bind(),this.setValue(e,t)}bind(){let e=this.node;const t=this.parsedPath,n=t.objectName,r=t.propertyName;let s=t.propertyIndex;if(e||(e=gt.findNode(this.rootNode,t.nodeName),this.node=e),this.getValue=this._getValue_unavailable,this.setValue=this._setValue_unavailable,!e){console.warn("THREE.PropertyBinding: No target node found for track: "+this.path+".");return}if(n){let l=t.objectIndex;switch(n){case"materials":if(!e.material){console.error("THREE.PropertyBinding: Can not bind to material as node does not have a material.",this);return}if(!e.material.materials){console.error("THREE.PropertyBinding: Can not bind to material.materials as node.material does not have a materials array.",this);return}e=e.material.materials;break;case"bones":if(!e.skeleton){console.error("THREE.PropertyBinding: Can not bind to bones as node does not have a skeleton.",this);return}e=e.skeleton.bones;for(let u=0;u<e.length;u++)if(e[u].name===l){l=u;break}break;case"map":if("map"in e){e=e.map;break}if(!e.material){console.error("THREE.PropertyBinding: Can not bind to material as node does not have a material.",this);return}if(!e.material.map){console.error("THREE.PropertyBinding: Can not bind to material.map as node.material does not have a map.",this);return}e=e.material.map;break;default:if(e[n]===void 0){console.error("THREE.PropertyBinding: Can not bind to objectName of node undefined.",this);return}e=e[n]}if(l!==void 0){if(e[l]===void 0){console.error("THREE.PropertyBinding: Trying to bind to objectIndex of objectName, but is undefined.",this,e);return}e=e[l]}}const a=e[r];if(a===void 0){const l=t.nodeName;console.error("THREE.PropertyBinding: Trying to update property for track: "+l+"."+r+" but it wasn't found.",e);return}let o=this.Versioning.None;this.targetObject=e,e.isMaterial===!0?o=this.Versioning.NeedsUpdate:e.isObject3D===!0&&(o=this.Versioning.MatrixWorldNeedsUpdate);let c=this.BindingType.Direct;if(s!==void 0){if(r==="morphTargetInfluences"){if(!e.geometry){console.error("THREE.PropertyBinding: Can not bind to morphTargetInfluences because node does not have a geometry.",this);return}if(!e.geometry.morphAttributes){console.error("THREE.PropertyBinding: Can not bind to morphTargetInfluences because node does not have a geometry.morphAttributes.",this);return}e.morphTargetDictionary[s]!==void 0&&(s=e.morphTargetDictionary[s])}c=this.BindingType.ArrayElement,this.resolvedProperty=a,this.propertyIndex=s}else a.fromArray!==void 0&&a.toArray!==void 0?(c=this.BindingType.HasFromToArray,this.resolvedProperty=a):Array.isArray(a)?(c=this.BindingType.EntireArray,this.resolvedProperty=a):this.propertyName=r;this.getValue=this.GetterByBindingType[c],this.setValue=this.SetterByBindingTypeAndVersioning[c][o]}unbind(){this.node=null,this.getValue=this._getValue_unbound,this.setValue=this._setValue_unbound}}gt.Composite=Jv;gt.prototype.BindingType={Direct:0,EntireArray:1,ArrayElement:2,HasFromToArray:3};gt.prototype.Versioning={None:0,NeedsUpdate:1,MatrixWorldNeedsUpdate:2};gt.prototype.GetterByBindingType=[gt.prototype._getValue_direct,gt.prototype._getValue_array,gt.prototype._getValue_arrayElement,gt.prototype._getValue_toArray];gt.prototype.SetterByBindingTypeAndVersioning=[[gt.prototype._setValue_direct,gt.prototype._setValue_direct_setNeedsUpdate,gt.prototype._setValue_direct_setMatrixWorldNeedsUpdate],[gt.prototype._setValue_array,gt.prototype._setValue_array_setNeedsUpdate,gt.prototype._setValue_array_setMatrixWorldNeedsUpdate],[gt.prototype._setValue_arrayElement,gt.prototype._setValue_arrayElement_setNeedsUpdate,gt.prototype._setValue_arrayElement_setMatrixWorldNeedsUpdate],[gt.prototype._setValue_fromArray,gt.prototype._setValue_fromArray_setNeedsUpdate,gt.prototype._setValue_fromArray_setMatrixWorldNeedsUpdate]];function ph(i,e,t,n){const r=Qv(n);switch(t){case Rf:return i*e;case bu:return i*e/r.components*r.byteLength;case wu:return i*e/r.components*r.byteLength;case Lf:return i*e*2/r.components*r.byteLength;case Eu:return i*e*2/r.components*r.byteLength;case Cf:return i*e*3/r.components*r.byteLength;case Un:return i*e*4/r.components*r.byteLength;case Tu:return i*e*4/r.components*r.byteLength;case uo:case ho:return Math.floor((i+3)/4)*Math.floor((e+3)/4)*8;case fo:case po:return Math.floor((i+3)/4)*Math.floor((e+3)/4)*16;case _l:case xl:return Math.max(i,16)*Math.max(e,8)/4;case vl:case yl:return Math.max(i,8)*Math.max(e,8)/2;case Ml:case Sl:return Math.floor((i+3)/4)*Math.floor((e+3)/4)*8;case bl:return Math.floor((i+3)/4)*Math.floor((e+3)/4)*16;case wl:return Math.floor((i+3)/4)*Math.floor((e+3)/4)*16;case El:return Math.floor((i+4)/5)*Math.floor((e+3)/4)*16;case Tl:return Math.floor((i+4)/5)*Math.floor((e+4)/5)*16;case Al:return Math.floor((i+5)/6)*Math.floor((e+4)/5)*16;case Rl:return Math.floor((i+5)/6)*Math.floor((e+5)/6)*16;case Cl:return Math.floor((i+7)/8)*Math.floor((e+4)/5)*16;case Ll:return Math.floor((i+7)/8)*Math.floor((e+5)/6)*16;case Pl:return Math.floor((i+7)/8)*Math.floor((e+7)/8)*16;case Il:return Math.floor((i+9)/10)*Math.floor((e+4)/5)*16;case Dl:return Math.floor((i+9)/10)*Math.floor((e+5)/6)*16;case Nl:return Math.floor((i+9)/10)*Math.floor((e+7)/8)*16;case Ul:return Math.floor((i+9)/10)*Math.floor((e+9)/10)*16;case Fl:return Math.floor((i+11)/12)*Math.floor((e+9)/10)*16;case Ol:return Math.floor((i+11)/12)*Math.floor((e+11)/12)*16;case Bl:case kl:case zl:return Math.ceil(i/4)*Math.ceil(e/4)*16;case Hl:case Vl:return Math.ceil(i/4)*Math.ceil(e/4)*8;case Gl:case Wl:return Math.ceil(i/4)*Math.ceil(e/4)*16}throw new Error(`Unable to determine texture byte length for ${t} format.`)}function Qv(i){switch(i){case ai:case wf:return{byteLength:1,components:1};case Js:case Ef:case ma:return{byteLength:2,components:1};case Mu:case Su:return{byteLength:2,components:4};case vr:case xu:case Gn:return{byteLength:4,components:1};case Tf:case Af:return{byteLength:4,components:3}}throw new Error(`Unknown texture type ${i}.`)}typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("register",{detail:{revision:vu}}));typeof window<"u"&&(window.__THREE__?console.warn("WARNING: Multiple instances of Three.js being imported."):window.__THREE__=vu);function pp(){let i=null,e=!1,t=null,n=null;function r(s,a){t(s,a),n=i.requestAnimationFrame(r)}return{start:function(){e!==!0&&t!==null&&(n=i.requestAnimationFrame(r),e=!0)},stop:function(){i.cancelAnimationFrame(n),e=!1},setAnimationLoop:function(s){t=s},setContext:function(s){i=s}}}function e_(i){const e=new WeakMap;function t(o,c){const l=o.array,u=o.usage,d=l.byteLength,f=i.createBuffer();i.bindBuffer(c,f),i.bufferData(c,l,u),o.onUploadCallback();let h;if(l instanceof Float32Array)h=i.FLOAT;else if(typeof Float16Array<"u"&&l instanceof Float16Array)h=i.HALF_FLOAT;else if(l instanceof Uint16Array)o.isFloat16BufferAttribute?h=i.HALF_FLOAT:h=i.UNSIGNED_SHORT;else if(l instanceof Int16Array)h=i.SHORT;else if(l instanceof Uint32Array)h=i.UNSIGNED_INT;else if(l instanceof Int32Array)h=i.INT;else if(l instanceof Int8Array)h=i.BYTE;else if(l instanceof Uint8Array)h=i.UNSIGNED_BYTE;else if(l instanceof Uint8ClampedArray)h=i.UNSIGNED_BYTE;else throw new Error("THREE.WebGLAttributes: Unsupported buffer data format: "+l);return{buffer:f,type:h,bytesPerElement:l.BYTES_PER_ELEMENT,version:o.version,size:d}}function n(o,c,l){const u=c.array,d=c.updateRanges;if(i.bindBuffer(l,o),d.length===0)i.bufferSubData(l,0,u);else{d.sort((h,m)=>h.start-m.start);let f=0;for(let h=1;h<d.length;h++){const m=d[f],v=d[h];v.start<=m.start+m.count+1?m.count=Math.max(m.count,v.start+v.count-m.start):(++f,d[f]=v)}d.length=f+1;for(let h=0,m=d.length;h<m;h++){const v=d[h];i.bufferSubData(l,v.start*u.BYTES_PER_ELEMENT,u,v.start,v.count)}c.clearUpdateRanges()}c.onUploadCallback()}function r(o){return o.isInterleavedBufferAttribute&&(o=o.data),e.get(o)}function s(o){o.isInterleavedBufferAttribute&&(o=o.data);const c=e.get(o);c&&(i.deleteBuffer(c.buffer),e.delete(o))}function a(o,c){if(o.isInterleavedBufferAttribute&&(o=o.data),o.isGLBufferAttribute){const u=e.get(o);(!u||u.version<o.version)&&e.set(o,{buffer:o.buffer,type:o.type,bytesPerElement:o.elementSize,version:o.version});return}const l=e.get(o);if(l===void 0)e.set(o,t(o,c));else if(l.version<o.version){if(l.size!==o.array.byteLength)throw new Error("THREE.WebGLAttributes: The size of the buffer attribute's array buffer does not match the original size. Resizing buffer attributes is not supported.");n(l.buffer,o,c),l.version=o.version}}return{get:r,remove:s,update:a}}var t_=`#ifdef USE_ALPHAHASH
	if ( diffuseColor.a < getAlphaHashThreshold( vPosition ) ) discard;
#endif`,n_=`#ifdef USE_ALPHAHASH
	const float ALPHA_HASH_SCALE = 0.05;
	float hash2D( vec2 value ) {
		return fract( 1.0e4 * sin( 17.0 * value.x + 0.1 * value.y ) * ( 0.1 + abs( sin( 13.0 * value.y + value.x ) ) ) );
	}
	float hash3D( vec3 value ) {
		return hash2D( vec2( hash2D( value.xy ), value.z ) );
	}
	float getAlphaHashThreshold( vec3 position ) {
		float maxDeriv = max(
			length( dFdx( position.xyz ) ),
			length( dFdy( position.xyz ) )
		);
		float pixScale = 1.0 / ( ALPHA_HASH_SCALE * maxDeriv );
		vec2 pixScales = vec2(
			exp2( floor( log2( pixScale ) ) ),
			exp2( ceil( log2( pixScale ) ) )
		);
		vec2 alpha = vec2(
			hash3D( floor( pixScales.x * position.xyz ) ),
			hash3D( floor( pixScales.y * position.xyz ) )
		);
		float lerpFactor = fract( log2( pixScale ) );
		float x = ( 1.0 - lerpFactor ) * alpha.x + lerpFactor * alpha.y;
		float a = min( lerpFactor, 1.0 - lerpFactor );
		vec3 cases = vec3(
			x * x / ( 2.0 * a * ( 1.0 - a ) ),
			( x - 0.5 * a ) / ( 1.0 - a ),
			1.0 - ( ( 1.0 - x ) * ( 1.0 - x ) / ( 2.0 * a * ( 1.0 - a ) ) )
		);
		float threshold = ( x < ( 1.0 - a ) )
			? ( ( x < a ) ? cases.x : cases.y )
			: cases.z;
		return clamp( threshold , 1.0e-6, 1.0 );
	}
#endif`,i_=`#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, vAlphaMapUv ).g;
#endif`,r_=`#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,s_=`#ifdef USE_ALPHATEST
	#ifdef ALPHA_TO_COVERAGE
	diffuseColor.a = smoothstep( alphaTest, alphaTest + fwidth( diffuseColor.a ), diffuseColor.a );
	if ( diffuseColor.a == 0.0 ) discard;
	#else
	if ( diffuseColor.a < alphaTest ) discard;
	#endif
#endif`,a_=`#ifdef USE_ALPHATEST
	uniform float alphaTest;
#endif`,o_=`#ifdef USE_AOMAP
	float ambientOcclusion = ( texture2D( aoMap, vAoMapUv ).r - 1.0 ) * aoMapIntensity + 1.0;
	reflectedLight.indirectDiffuse *= ambientOcclusion;
	#if defined( USE_CLEARCOAT ) 
		clearcoatSpecularIndirect *= ambientOcclusion;
	#endif
	#if defined( USE_SHEEN ) 
		sheenSpecularIndirect *= ambientOcclusion;
	#endif
	#if defined( USE_ENVMAP ) && defined( STANDARD )
		float dotNV = saturate( dot( geometryNormal, geometryViewDir ) );
		reflectedLight.indirectSpecular *= computeSpecularOcclusion( dotNV, ambientOcclusion, material.roughness );
	#endif
#endif`,c_=`#ifdef USE_AOMAP
	uniform sampler2D aoMap;
	uniform float aoMapIntensity;
#endif`,l_=`#ifdef USE_BATCHING
	#if ! defined( GL_ANGLE_multi_draw )
	#define gl_DrawID _gl_DrawID
	uniform int _gl_DrawID;
	#endif
	uniform highp sampler2D batchingTexture;
	uniform highp usampler2D batchingIdTexture;
	mat4 getBatchingMatrix( const in float i ) {
		int size = textureSize( batchingTexture, 0 ).x;
		int j = int( i ) * 4;
		int x = j % size;
		int y = j / size;
		vec4 v1 = texelFetch( batchingTexture, ivec2( x, y ), 0 );
		vec4 v2 = texelFetch( batchingTexture, ivec2( x + 1, y ), 0 );
		vec4 v3 = texelFetch( batchingTexture, ivec2( x + 2, y ), 0 );
		vec4 v4 = texelFetch( batchingTexture, ivec2( x + 3, y ), 0 );
		return mat4( v1, v2, v3, v4 );
	}
	float getIndirectIndex( const in int i ) {
		int size = textureSize( batchingIdTexture, 0 ).x;
		int x = i % size;
		int y = i / size;
		return float( texelFetch( batchingIdTexture, ivec2( x, y ), 0 ).r );
	}
#endif
#ifdef USE_BATCHING_COLOR
	uniform sampler2D batchingColorTexture;
	vec3 getBatchingColor( const in float i ) {
		int size = textureSize( batchingColorTexture, 0 ).x;
		int j = int( i );
		int x = j % size;
		int y = j / size;
		return texelFetch( batchingColorTexture, ivec2( x, y ), 0 ).rgb;
	}
#endif`,u_=`#ifdef USE_BATCHING
	mat4 batchingMatrix = getBatchingMatrix( getIndirectIndex( gl_DrawID ) );
#endif`,d_=`vec3 transformed = vec3( position );
#ifdef USE_ALPHAHASH
	vPosition = vec3( position );
#endif`,h_=`vec3 objectNormal = vec3( normal );
#ifdef USE_TANGENT
	vec3 objectTangent = vec3( tangent.xyz );
#endif`,f_=`float G_BlinnPhong_Implicit( ) {
	return 0.25;
}
float D_BlinnPhong( const in float shininess, const in float dotNH ) {
	return RECIPROCAL_PI * ( shininess * 0.5 + 1.0 ) * pow( dotNH, shininess );
}
vec3 BRDF_BlinnPhong( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in vec3 specularColor, const in float shininess ) {
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNH = saturate( dot( normal, halfDir ) );
	float dotVH = saturate( dot( viewDir, halfDir ) );
	vec3 F = F_Schlick( specularColor, 1.0, dotVH );
	float G = G_BlinnPhong_Implicit( );
	float D = D_BlinnPhong( shininess, dotNH );
	return F * ( G * D );
} // validated`,p_=`#ifdef USE_IRIDESCENCE
	const mat3 XYZ_TO_REC709 = mat3(
		 3.2404542, -0.9692660,  0.0556434,
		-1.5371385,  1.8760108, -0.2040259,
		-0.4985314,  0.0415560,  1.0572252
	);
	vec3 Fresnel0ToIor( vec3 fresnel0 ) {
		vec3 sqrtF0 = sqrt( fresnel0 );
		return ( vec3( 1.0 ) + sqrtF0 ) / ( vec3( 1.0 ) - sqrtF0 );
	}
	vec3 IorToFresnel0( vec3 transmittedIor, float incidentIor ) {
		return pow2( ( transmittedIor - vec3( incidentIor ) ) / ( transmittedIor + vec3( incidentIor ) ) );
	}
	float IorToFresnel0( float transmittedIor, float incidentIor ) {
		return pow2( ( transmittedIor - incidentIor ) / ( transmittedIor + incidentIor ));
	}
	vec3 evalSensitivity( float OPD, vec3 shift ) {
		float phase = 2.0 * PI * OPD * 1.0e-9;
		vec3 val = vec3( 5.4856e-13, 4.4201e-13, 5.2481e-13 );
		vec3 pos = vec3( 1.6810e+06, 1.7953e+06, 2.2084e+06 );
		vec3 var = vec3( 4.3278e+09, 9.3046e+09, 6.6121e+09 );
		vec3 xyz = val * sqrt( 2.0 * PI * var ) * cos( pos * phase + shift ) * exp( - pow2( phase ) * var );
		xyz.x += 9.7470e-14 * sqrt( 2.0 * PI * 4.5282e+09 ) * cos( 2.2399e+06 * phase + shift[ 0 ] ) * exp( - 4.5282e+09 * pow2( phase ) );
		xyz /= 1.0685e-7;
		vec3 rgb = XYZ_TO_REC709 * xyz;
		return rgb;
	}
	vec3 evalIridescence( float outsideIOR, float eta2, float cosTheta1, float thinFilmThickness, vec3 baseF0 ) {
		vec3 I;
		float iridescenceIOR = mix( outsideIOR, eta2, smoothstep( 0.0, 0.03, thinFilmThickness ) );
		float sinTheta2Sq = pow2( outsideIOR / iridescenceIOR ) * ( 1.0 - pow2( cosTheta1 ) );
		float cosTheta2Sq = 1.0 - sinTheta2Sq;
		if ( cosTheta2Sq < 0.0 ) {
			return vec3( 1.0 );
		}
		float cosTheta2 = sqrt( cosTheta2Sq );
		float R0 = IorToFresnel0( iridescenceIOR, outsideIOR );
		float R12 = F_Schlick( R0, 1.0, cosTheta1 );
		float T121 = 1.0 - R12;
		float phi12 = 0.0;
		if ( iridescenceIOR < outsideIOR ) phi12 = PI;
		float phi21 = PI - phi12;
		vec3 baseIOR = Fresnel0ToIor( clamp( baseF0, 0.0, 0.9999 ) );		vec3 R1 = IorToFresnel0( baseIOR, iridescenceIOR );
		vec3 R23 = F_Schlick( R1, 1.0, cosTheta2 );
		vec3 phi23 = vec3( 0.0 );
		if ( baseIOR[ 0 ] < iridescenceIOR ) phi23[ 0 ] = PI;
		if ( baseIOR[ 1 ] < iridescenceIOR ) phi23[ 1 ] = PI;
		if ( baseIOR[ 2 ] < iridescenceIOR ) phi23[ 2 ] = PI;
		float OPD = 2.0 * iridescenceIOR * thinFilmThickness * cosTheta2;
		vec3 phi = vec3( phi21 ) + phi23;
		vec3 R123 = clamp( R12 * R23, 1e-5, 0.9999 );
		vec3 r123 = sqrt( R123 );
		vec3 Rs = pow2( T121 ) * R23 / ( vec3( 1.0 ) - R123 );
		vec3 C0 = R12 + Rs;
		I = C0;
		vec3 Cm = Rs - T121;
		for ( int m = 1; m <= 2; ++ m ) {
			Cm *= r123;
			vec3 Sm = 2.0 * evalSensitivity( float( m ) * OPD, float( m ) * phi );
			I += Cm * Sm;
		}
		return max( I, vec3( 0.0 ) );
	}
#endif`,m_=`#ifdef USE_BUMPMAP
	uniform sampler2D bumpMap;
	uniform float bumpScale;
	vec2 dHdxy_fwd() {
		vec2 dSTdx = dFdx( vBumpMapUv );
		vec2 dSTdy = dFdy( vBumpMapUv );
		float Hll = bumpScale * texture2D( bumpMap, vBumpMapUv ).x;
		float dBx = bumpScale * texture2D( bumpMap, vBumpMapUv + dSTdx ).x - Hll;
		float dBy = bumpScale * texture2D( bumpMap, vBumpMapUv + dSTdy ).x - Hll;
		return vec2( dBx, dBy );
	}
	vec3 perturbNormalArb( vec3 surf_pos, vec3 surf_norm, vec2 dHdxy, float faceDirection ) {
		vec3 vSigmaX = normalize( dFdx( surf_pos.xyz ) );
		vec3 vSigmaY = normalize( dFdy( surf_pos.xyz ) );
		vec3 vN = surf_norm;
		vec3 R1 = cross( vSigmaY, vN );
		vec3 R2 = cross( vN, vSigmaX );
		float fDet = dot( vSigmaX, R1 ) * faceDirection;
		vec3 vGrad = sign( fDet ) * ( dHdxy.x * R1 + dHdxy.y * R2 );
		return normalize( abs( fDet ) * surf_norm - vGrad );
	}
#endif`,g_=`#if NUM_CLIPPING_PLANES > 0
	vec4 plane;
	#ifdef ALPHA_TO_COVERAGE
		float distanceToPlane, distanceGradient;
		float clipOpacity = 1.0;
		#pragma unroll_loop_start
		for ( int i = 0; i < UNION_CLIPPING_PLANES; i ++ ) {
			plane = clippingPlanes[ i ];
			distanceToPlane = - dot( vClipPosition, plane.xyz ) + plane.w;
			distanceGradient = fwidth( distanceToPlane ) / 2.0;
			clipOpacity *= smoothstep( - distanceGradient, distanceGradient, distanceToPlane );
			if ( clipOpacity == 0.0 ) discard;
		}
		#pragma unroll_loop_end
		#if UNION_CLIPPING_PLANES < NUM_CLIPPING_PLANES
			float unionClipOpacity = 1.0;
			#pragma unroll_loop_start
			for ( int i = UNION_CLIPPING_PLANES; i < NUM_CLIPPING_PLANES; i ++ ) {
				plane = clippingPlanes[ i ];
				distanceToPlane = - dot( vClipPosition, plane.xyz ) + plane.w;
				distanceGradient = fwidth( distanceToPlane ) / 2.0;
				unionClipOpacity *= 1.0 - smoothstep( - distanceGradient, distanceGradient, distanceToPlane );
			}
			#pragma unroll_loop_end
			clipOpacity *= 1.0 - unionClipOpacity;
		#endif
		diffuseColor.a *= clipOpacity;
		if ( diffuseColor.a == 0.0 ) discard;
	#else
		#pragma unroll_loop_start
		for ( int i = 0; i < UNION_CLIPPING_PLANES; i ++ ) {
			plane = clippingPlanes[ i ];
			if ( dot( vClipPosition, plane.xyz ) > plane.w ) discard;
		}
		#pragma unroll_loop_end
		#if UNION_CLIPPING_PLANES < NUM_CLIPPING_PLANES
			bool clipped = true;
			#pragma unroll_loop_start
			for ( int i = UNION_CLIPPING_PLANES; i < NUM_CLIPPING_PLANES; i ++ ) {
				plane = clippingPlanes[ i ];
				clipped = ( dot( vClipPosition, plane.xyz ) > plane.w ) && clipped;
			}
			#pragma unroll_loop_end
			if ( clipped ) discard;
		#endif
	#endif
#endif`,v_=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
	uniform vec4 clippingPlanes[ NUM_CLIPPING_PLANES ];
#endif`,__=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
#endif`,y_=`#if NUM_CLIPPING_PLANES > 0
	vClipPosition = - mvPosition.xyz;
#endif`,x_=`#if defined( USE_COLOR_ALPHA )
	diffuseColor *= vColor;
#elif defined( USE_COLOR )
	diffuseColor.rgb *= vColor;
#endif`,M_=`#if defined( USE_COLOR_ALPHA )
	varying vec4 vColor;
#elif defined( USE_COLOR )
	varying vec3 vColor;
#endif`,S_=`#if defined( USE_COLOR_ALPHA )
	varying vec4 vColor;
#elif defined( USE_COLOR ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
	varying vec3 vColor;
#endif`,b_=`#if defined( USE_COLOR_ALPHA )
	vColor = vec4( 1.0 );
#elif defined( USE_COLOR ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
	vColor = vec3( 1.0 );
#endif
#ifdef USE_COLOR
	vColor *= color;
#endif
#ifdef USE_INSTANCING_COLOR
	vColor.xyz *= instanceColor.xyz;
#endif
#ifdef USE_BATCHING_COLOR
	vec3 batchingColor = getBatchingColor( getIndirectIndex( gl_DrawID ) );
	vColor.xyz *= batchingColor.xyz;
#endif`,w_=`#define PI 3.141592653589793
#define PI2 6.283185307179586
#define PI_HALF 1.5707963267948966
#define RECIPROCAL_PI 0.3183098861837907
#define RECIPROCAL_PI2 0.15915494309189535
#define EPSILON 1e-6
#ifndef saturate
#define saturate( a ) clamp( a, 0.0, 1.0 )
#endif
#define whiteComplement( a ) ( 1.0 - saturate( a ) )
float pow2( const in float x ) { return x*x; }
vec3 pow2( const in vec3 x ) { return x*x; }
float pow3( const in float x ) { return x*x*x; }
float pow4( const in float x ) { float x2 = x*x; return x2*x2; }
float max3( const in vec3 v ) { return max( max( v.x, v.y ), v.z ); }
float average( const in vec3 v ) { return dot( v, vec3( 0.3333333 ) ); }
highp float rand( const in vec2 uv ) {
	const highp float a = 12.9898, b = 78.233, c = 43758.5453;
	highp float dt = dot( uv.xy, vec2( a,b ) ), sn = mod( dt, PI );
	return fract( sin( sn ) * c );
}
#ifdef HIGH_PRECISION
	float precisionSafeLength( vec3 v ) { return length( v ); }
#else
	float precisionSafeLength( vec3 v ) {
		float maxComponent = max3( abs( v ) );
		return length( v / maxComponent ) * maxComponent;
	}
#endif
struct IncidentLight {
	vec3 color;
	vec3 direction;
	bool visible;
};
struct ReflectedLight {
	vec3 directDiffuse;
	vec3 directSpecular;
	vec3 indirectDiffuse;
	vec3 indirectSpecular;
};
#ifdef USE_ALPHAHASH
	varying vec3 vPosition;
#endif
vec3 transformDirection( in vec3 dir, in mat4 matrix ) {
	return normalize( ( matrix * vec4( dir, 0.0 ) ).xyz );
}
vec3 inverseTransformDirection( in vec3 dir, in mat4 matrix ) {
	return normalize( ( vec4( dir, 0.0 ) * matrix ).xyz );
}
mat3 transposeMat3( const in mat3 m ) {
	mat3 tmp;
	tmp[ 0 ] = vec3( m[ 0 ].x, m[ 1 ].x, m[ 2 ].x );
	tmp[ 1 ] = vec3( m[ 0 ].y, m[ 1 ].y, m[ 2 ].y );
	tmp[ 2 ] = vec3( m[ 0 ].z, m[ 1 ].z, m[ 2 ].z );
	return tmp;
}
bool isPerspectiveMatrix( mat4 m ) {
	return m[ 2 ][ 3 ] == - 1.0;
}
vec2 equirectUv( in vec3 dir ) {
	float u = atan( dir.z, dir.x ) * RECIPROCAL_PI2 + 0.5;
	float v = asin( clamp( dir.y, - 1.0, 1.0 ) ) * RECIPROCAL_PI + 0.5;
	return vec2( u, v );
}
vec3 BRDF_Lambert( const in vec3 diffuseColor ) {
	return RECIPROCAL_PI * diffuseColor;
}
vec3 F_Schlick( const in vec3 f0, const in float f90, const in float dotVH ) {
	float fresnel = exp2( ( - 5.55473 * dotVH - 6.98316 ) * dotVH );
	return f0 * ( 1.0 - fresnel ) + ( f90 * fresnel );
}
float F_Schlick( const in float f0, const in float f90, const in float dotVH ) {
	float fresnel = exp2( ( - 5.55473 * dotVH - 6.98316 ) * dotVH );
	return f0 * ( 1.0 - fresnel ) + ( f90 * fresnel );
} // validated`,E_=`#ifdef ENVMAP_TYPE_CUBE_UV
	#define cubeUV_minMipLevel 4.0
	#define cubeUV_minTileSize 16.0
	float getFace( vec3 direction ) {
		vec3 absDirection = abs( direction );
		float face = - 1.0;
		if ( absDirection.x > absDirection.z ) {
			if ( absDirection.x > absDirection.y )
				face = direction.x > 0.0 ? 0.0 : 3.0;
			else
				face = direction.y > 0.0 ? 1.0 : 4.0;
		} else {
			if ( absDirection.z > absDirection.y )
				face = direction.z > 0.0 ? 2.0 : 5.0;
			else
				face = direction.y > 0.0 ? 1.0 : 4.0;
		}
		return face;
	}
	vec2 getUV( vec3 direction, float face ) {
		vec2 uv;
		if ( face == 0.0 ) {
			uv = vec2( direction.z, direction.y ) / abs( direction.x );
		} else if ( face == 1.0 ) {
			uv = vec2( - direction.x, - direction.z ) / abs( direction.y );
		} else if ( face == 2.0 ) {
			uv = vec2( - direction.x, direction.y ) / abs( direction.z );
		} else if ( face == 3.0 ) {
			uv = vec2( - direction.z, direction.y ) / abs( direction.x );
		} else if ( face == 4.0 ) {
			uv = vec2( - direction.x, direction.z ) / abs( direction.y );
		} else {
			uv = vec2( direction.x, direction.y ) / abs( direction.z );
		}
		return 0.5 * ( uv + 1.0 );
	}
	vec3 bilinearCubeUV( sampler2D envMap, vec3 direction, float mipInt ) {
		float face = getFace( direction );
		float filterInt = max( cubeUV_minMipLevel - mipInt, 0.0 );
		mipInt = max( mipInt, cubeUV_minMipLevel );
		float faceSize = exp2( mipInt );
		highp vec2 uv = getUV( direction, face ) * ( faceSize - 2.0 ) + 1.0;
		if ( face > 2.0 ) {
			uv.y += faceSize;
			face -= 3.0;
		}
		uv.x += face * faceSize;
		uv.x += filterInt * 3.0 * cubeUV_minTileSize;
		uv.y += 4.0 * ( exp2( CUBEUV_MAX_MIP ) - faceSize );
		uv.x *= CUBEUV_TEXEL_WIDTH;
		uv.y *= CUBEUV_TEXEL_HEIGHT;
		#ifdef texture2DGradEXT
			return texture2DGradEXT( envMap, uv, vec2( 0.0 ), vec2( 0.0 ) ).rgb;
		#else
			return texture2D( envMap, uv ).rgb;
		#endif
	}
	#define cubeUV_r0 1.0
	#define cubeUV_m0 - 2.0
	#define cubeUV_r1 0.8
	#define cubeUV_m1 - 1.0
	#define cubeUV_r4 0.4
	#define cubeUV_m4 2.0
	#define cubeUV_r5 0.305
	#define cubeUV_m5 3.0
	#define cubeUV_r6 0.21
	#define cubeUV_m6 4.0
	float roughnessToMip( float roughness ) {
		float mip = 0.0;
		if ( roughness >= cubeUV_r1 ) {
			mip = ( cubeUV_r0 - roughness ) * ( cubeUV_m1 - cubeUV_m0 ) / ( cubeUV_r0 - cubeUV_r1 ) + cubeUV_m0;
		} else if ( roughness >= cubeUV_r4 ) {
			mip = ( cubeUV_r1 - roughness ) * ( cubeUV_m4 - cubeUV_m1 ) / ( cubeUV_r1 - cubeUV_r4 ) + cubeUV_m1;
		} else if ( roughness >= cubeUV_r5 ) {
			mip = ( cubeUV_r4 - roughness ) * ( cubeUV_m5 - cubeUV_m4 ) / ( cubeUV_r4 - cubeUV_r5 ) + cubeUV_m4;
		} else if ( roughness >= cubeUV_r6 ) {
			mip = ( cubeUV_r5 - roughness ) * ( cubeUV_m6 - cubeUV_m5 ) / ( cubeUV_r5 - cubeUV_r6 ) + cubeUV_m5;
		} else {
			mip = - 2.0 * log2( 1.16 * roughness );		}
		return mip;
	}
	vec4 textureCubeUV( sampler2D envMap, vec3 sampleDir, float roughness ) {
		float mip = clamp( roughnessToMip( roughness ), cubeUV_m0, CUBEUV_MAX_MIP );
		float mipF = fract( mip );
		float mipInt = floor( mip );
		vec3 color0 = bilinearCubeUV( envMap, sampleDir, mipInt );
		if ( mipF == 0.0 ) {
			return vec4( color0, 1.0 );
		} else {
			vec3 color1 = bilinearCubeUV( envMap, sampleDir, mipInt + 1.0 );
			return vec4( mix( color0, color1, mipF ), 1.0 );
		}
	}
#endif`,T_=`vec3 transformedNormal = objectNormal;
#ifdef USE_TANGENT
	vec3 transformedTangent = objectTangent;
#endif
#ifdef USE_BATCHING
	mat3 bm = mat3( batchingMatrix );
	transformedNormal /= vec3( dot( bm[ 0 ], bm[ 0 ] ), dot( bm[ 1 ], bm[ 1 ] ), dot( bm[ 2 ], bm[ 2 ] ) );
	transformedNormal = bm * transformedNormal;
	#ifdef USE_TANGENT
		transformedTangent = bm * transformedTangent;
	#endif
#endif
#ifdef USE_INSTANCING
	mat3 im = mat3( instanceMatrix );
	transformedNormal /= vec3( dot( im[ 0 ], im[ 0 ] ), dot( im[ 1 ], im[ 1 ] ), dot( im[ 2 ], im[ 2 ] ) );
	transformedNormal = im * transformedNormal;
	#ifdef USE_TANGENT
		transformedTangent = im * transformedTangent;
	#endif
#endif
transformedNormal = normalMatrix * transformedNormal;
#ifdef FLIP_SIDED
	transformedNormal = - transformedNormal;
#endif
#ifdef USE_TANGENT
	transformedTangent = ( modelViewMatrix * vec4( transformedTangent, 0.0 ) ).xyz;
	#ifdef FLIP_SIDED
		transformedTangent = - transformedTangent;
	#endif
#endif`,A_=`#ifdef USE_DISPLACEMENTMAP
	uniform sampler2D displacementMap;
	uniform float displacementScale;
	uniform float displacementBias;
#endif`,R_=`#ifdef USE_DISPLACEMENTMAP
	transformed += normalize( objectNormal ) * ( texture2D( displacementMap, vDisplacementMapUv ).x * displacementScale + displacementBias );
#endif`,C_=`#ifdef USE_EMISSIVEMAP
	vec4 emissiveColor = texture2D( emissiveMap, vEmissiveMapUv );
	#ifdef DECODE_VIDEO_TEXTURE_EMISSIVE
		emissiveColor = sRGBTransferEOTF( emissiveColor );
	#endif
	totalEmissiveRadiance *= emissiveColor.rgb;
#endif`,L_=`#ifdef USE_EMISSIVEMAP
	uniform sampler2D emissiveMap;
#endif`,P_="gl_FragColor = linearToOutputTexel( gl_FragColor );",I_=`vec4 LinearTransferOETF( in vec4 value ) {
	return value;
}
vec4 sRGBTransferEOTF( in vec4 value ) {
	return vec4( mix( pow( value.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), value.rgb * 0.0773993808, vec3( lessThanEqual( value.rgb, vec3( 0.04045 ) ) ) ), value.a );
}
vec4 sRGBTransferOETF( in vec4 value ) {
	return vec4( mix( pow( value.rgb, vec3( 0.41666 ) ) * 1.055 - vec3( 0.055 ), value.rgb * 12.92, vec3( lessThanEqual( value.rgb, vec3( 0.0031308 ) ) ) ), value.a );
}`,D_=`#ifdef USE_ENVMAP
	#ifdef ENV_WORLDPOS
		vec3 cameraToFrag;
		if ( isOrthographic ) {
			cameraToFrag = normalize( vec3( - viewMatrix[ 0 ][ 2 ], - viewMatrix[ 1 ][ 2 ], - viewMatrix[ 2 ][ 2 ] ) );
		} else {
			cameraToFrag = normalize( vWorldPosition - cameraPosition );
		}
		vec3 worldNormal = inverseTransformDirection( normal, viewMatrix );
		#ifdef ENVMAP_MODE_REFLECTION
			vec3 reflectVec = reflect( cameraToFrag, worldNormal );
		#else
			vec3 reflectVec = refract( cameraToFrag, worldNormal, refractionRatio );
		#endif
	#else
		vec3 reflectVec = vReflect;
	#endif
	#ifdef ENVMAP_TYPE_CUBE
		vec4 envColor = textureCube( envMap, envMapRotation * vec3( flipEnvMap * reflectVec.x, reflectVec.yz ) );
	#else
		vec4 envColor = vec4( 0.0 );
	#endif
	#ifdef ENVMAP_BLENDING_MULTIPLY
		outgoingLight = mix( outgoingLight, outgoingLight * envColor.xyz, specularStrength * reflectivity );
	#elif defined( ENVMAP_BLENDING_MIX )
		outgoingLight = mix( outgoingLight, envColor.xyz, specularStrength * reflectivity );
	#elif defined( ENVMAP_BLENDING_ADD )
		outgoingLight += envColor.xyz * specularStrength * reflectivity;
	#endif
#endif`,N_=`#ifdef USE_ENVMAP
	uniform float envMapIntensity;
	uniform float flipEnvMap;
	uniform mat3 envMapRotation;
	#ifdef ENVMAP_TYPE_CUBE
		uniform samplerCube envMap;
	#else
		uniform sampler2D envMap;
	#endif
	
#endif`,U_=`#ifdef USE_ENVMAP
	uniform float reflectivity;
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		varying vec3 vWorldPosition;
		uniform float refractionRatio;
	#else
		varying vec3 vReflect;
	#endif
#endif`,F_=`#ifdef USE_ENVMAP
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		
		varying vec3 vWorldPosition;
	#else
		varying vec3 vReflect;
		uniform float refractionRatio;
	#endif
#endif`,O_=`#ifdef USE_ENVMAP
	#ifdef ENV_WORLDPOS
		vWorldPosition = worldPosition.xyz;
	#else
		vec3 cameraToVertex;
		if ( isOrthographic ) {
			cameraToVertex = normalize( vec3( - viewMatrix[ 0 ][ 2 ], - viewMatrix[ 1 ][ 2 ], - viewMatrix[ 2 ][ 2 ] ) );
		} else {
			cameraToVertex = normalize( worldPosition.xyz - cameraPosition );
		}
		vec3 worldNormal = inverseTransformDirection( transformedNormal, viewMatrix );
		#ifdef ENVMAP_MODE_REFLECTION
			vReflect = reflect( cameraToVertex, worldNormal );
		#else
			vReflect = refract( cameraToVertex, worldNormal, refractionRatio );
		#endif
	#endif
#endif`,B_=`#ifdef USE_FOG
	vFogDepth = - mvPosition.z;
#endif`,k_=`#ifdef USE_FOG
	varying float vFogDepth;
#endif`,z_=`#ifdef USE_FOG
	#ifdef FOG_EXP2
		float fogFactor = 1.0 - exp( - fogDensity * fogDensity * vFogDepth * vFogDepth );
	#else
		float fogFactor = smoothstep( fogNear, fogFar, vFogDepth );
	#endif
	gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );
#endif`,H_=`#ifdef USE_FOG
	uniform vec3 fogColor;
	varying float vFogDepth;
	#ifdef FOG_EXP2
		uniform float fogDensity;
	#else
		uniform float fogNear;
		uniform float fogFar;
	#endif
#endif`,V_=`#ifdef USE_GRADIENTMAP
	uniform sampler2D gradientMap;
#endif
vec3 getGradientIrradiance( vec3 normal, vec3 lightDirection ) {
	float dotNL = dot( normal, lightDirection );
	vec2 coord = vec2( dotNL * 0.5 + 0.5, 0.0 );
	#ifdef USE_GRADIENTMAP
		return vec3( texture2D( gradientMap, coord ).r );
	#else
		vec2 fw = fwidth( coord ) * 0.5;
		return mix( vec3( 0.7 ), vec3( 1.0 ), smoothstep( 0.7 - fw.x, 0.7 + fw.x, coord.x ) );
	#endif
}`,G_=`#ifdef USE_LIGHTMAP
	uniform sampler2D lightMap;
	uniform float lightMapIntensity;
#endif`,W_=`LambertMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularStrength = specularStrength;`,$_=`varying vec3 vViewPosition;
struct LambertMaterial {
	vec3 diffuseColor;
	float specularStrength;
};
void RE_Direct_Lambert( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in LambertMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Lambert( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in LambertMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_Lambert
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Lambert`,X_=`uniform bool receiveShadow;
uniform vec3 ambientLightColor;
#if defined( USE_LIGHT_PROBES )
	uniform vec3 lightProbe[ 9 ];
#endif
vec3 shGetIrradianceAt( in vec3 normal, in vec3 shCoefficients[ 9 ] ) {
	float x = normal.x, y = normal.y, z = normal.z;
	vec3 result = shCoefficients[ 0 ] * 0.886227;
	result += shCoefficients[ 1 ] * 2.0 * 0.511664 * y;
	result += shCoefficients[ 2 ] * 2.0 * 0.511664 * z;
	result += shCoefficients[ 3 ] * 2.0 * 0.511664 * x;
	result += shCoefficients[ 4 ] * 2.0 * 0.429043 * x * y;
	result += shCoefficients[ 5 ] * 2.0 * 0.429043 * y * z;
	result += shCoefficients[ 6 ] * ( 0.743125 * z * z - 0.247708 );
	result += shCoefficients[ 7 ] * 2.0 * 0.429043 * x * z;
	result += shCoefficients[ 8 ] * 0.429043 * ( x * x - y * y );
	return result;
}
vec3 getLightProbeIrradiance( const in vec3 lightProbe[ 9 ], const in vec3 normal ) {
	vec3 worldNormal = inverseTransformDirection( normal, viewMatrix );
	vec3 irradiance = shGetIrradianceAt( worldNormal, lightProbe );
	return irradiance;
}
vec3 getAmbientLightIrradiance( const in vec3 ambientLightColor ) {
	vec3 irradiance = ambientLightColor;
	return irradiance;
}
float getDistanceAttenuation( const in float lightDistance, const in float cutoffDistance, const in float decayExponent ) {
	float distanceFalloff = 1.0 / max( pow( lightDistance, decayExponent ), 0.01 );
	if ( cutoffDistance > 0.0 ) {
		distanceFalloff *= pow2( saturate( 1.0 - pow4( lightDistance / cutoffDistance ) ) );
	}
	return distanceFalloff;
}
float getSpotAttenuation( const in float coneCosine, const in float penumbraCosine, const in float angleCosine ) {
	return smoothstep( coneCosine, penumbraCosine, angleCosine );
}
#if NUM_DIR_LIGHTS > 0
	struct DirectionalLight {
		vec3 direction;
		vec3 color;
	};
	uniform DirectionalLight directionalLights[ NUM_DIR_LIGHTS ];
	void getDirectionalLightInfo( const in DirectionalLight directionalLight, out IncidentLight light ) {
		light.color = directionalLight.color;
		light.direction = directionalLight.direction;
		light.visible = true;
	}
#endif
#if NUM_POINT_LIGHTS > 0
	struct PointLight {
		vec3 position;
		vec3 color;
		float distance;
		float decay;
	};
	uniform PointLight pointLights[ NUM_POINT_LIGHTS ];
	void getPointLightInfo( const in PointLight pointLight, const in vec3 geometryPosition, out IncidentLight light ) {
		vec3 lVector = pointLight.position - geometryPosition;
		light.direction = normalize( lVector );
		float lightDistance = length( lVector );
		light.color = pointLight.color;
		light.color *= getDistanceAttenuation( lightDistance, pointLight.distance, pointLight.decay );
		light.visible = ( light.color != vec3( 0.0 ) );
	}
#endif
#if NUM_SPOT_LIGHTS > 0
	struct SpotLight {
		vec3 position;
		vec3 direction;
		vec3 color;
		float distance;
		float decay;
		float coneCos;
		float penumbraCos;
	};
	uniform SpotLight spotLights[ NUM_SPOT_LIGHTS ];
	void getSpotLightInfo( const in SpotLight spotLight, const in vec3 geometryPosition, out IncidentLight light ) {
		vec3 lVector = spotLight.position - geometryPosition;
		light.direction = normalize( lVector );
		float angleCos = dot( light.direction, spotLight.direction );
		float spotAttenuation = getSpotAttenuation( spotLight.coneCos, spotLight.penumbraCos, angleCos );
		if ( spotAttenuation > 0.0 ) {
			float lightDistance = length( lVector );
			light.color = spotLight.color * spotAttenuation;
			light.color *= getDistanceAttenuation( lightDistance, spotLight.distance, spotLight.decay );
			light.visible = ( light.color != vec3( 0.0 ) );
		} else {
			light.color = vec3( 0.0 );
			light.visible = false;
		}
	}
#endif
#if NUM_RECT_AREA_LIGHTS > 0
	struct RectAreaLight {
		vec3 color;
		vec3 position;
		vec3 halfWidth;
		vec3 halfHeight;
	};
	uniform sampler2D ltc_1;	uniform sampler2D ltc_2;
	uniform RectAreaLight rectAreaLights[ NUM_RECT_AREA_LIGHTS ];
#endif
#if NUM_HEMI_LIGHTS > 0
	struct HemisphereLight {
		vec3 direction;
		vec3 skyColor;
		vec3 groundColor;
	};
	uniform HemisphereLight hemisphereLights[ NUM_HEMI_LIGHTS ];
	vec3 getHemisphereLightIrradiance( const in HemisphereLight hemiLight, const in vec3 normal ) {
		float dotNL = dot( normal, hemiLight.direction );
		float hemiDiffuseWeight = 0.5 * dotNL + 0.5;
		vec3 irradiance = mix( hemiLight.groundColor, hemiLight.skyColor, hemiDiffuseWeight );
		return irradiance;
	}
#endif`,q_=`#ifdef USE_ENVMAP
	vec3 getIBLIrradiance( const in vec3 normal ) {
		#ifdef ENVMAP_TYPE_CUBE_UV
			vec3 worldNormal = inverseTransformDirection( normal, viewMatrix );
			vec4 envMapColor = textureCubeUV( envMap, envMapRotation * worldNormal, 1.0 );
			return PI * envMapColor.rgb * envMapIntensity;
		#else
			return vec3( 0.0 );
		#endif
	}
	vec3 getIBLRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness ) {
		#ifdef ENVMAP_TYPE_CUBE_UV
			vec3 reflectVec = reflect( - viewDir, normal );
			reflectVec = normalize( mix( reflectVec, normal, roughness * roughness) );
			reflectVec = inverseTransformDirection( reflectVec, viewMatrix );
			vec4 envMapColor = textureCubeUV( envMap, envMapRotation * reflectVec, roughness );
			return envMapColor.rgb * envMapIntensity;
		#else
			return vec3( 0.0 );
		#endif
	}
	#ifdef USE_ANISOTROPY
		vec3 getIBLAnisotropyRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness, const in vec3 bitangent, const in float anisotropy ) {
			#ifdef ENVMAP_TYPE_CUBE_UV
				vec3 bentNormal = cross( bitangent, viewDir );
				bentNormal = normalize( cross( bentNormal, bitangent ) );
				bentNormal = normalize( mix( bentNormal, normal, pow2( pow2( 1.0 - anisotropy * ( 1.0 - roughness ) ) ) ) );
				return getIBLRadiance( viewDir, bentNormal, roughness );
			#else
				return vec3( 0.0 );
			#endif
		}
	#endif
#endif`,j_=`ToonMaterial material;
material.diffuseColor = diffuseColor.rgb;`,Y_=`varying vec3 vViewPosition;
struct ToonMaterial {
	vec3 diffuseColor;
};
void RE_Direct_Toon( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in ToonMaterial material, inout ReflectedLight reflectedLight ) {
	vec3 irradiance = getGradientIrradiance( geometryNormal, directLight.direction ) * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Toon( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in ToonMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_Toon
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Toon`,K_=`BlinnPhongMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularColor = specular;
material.specularShininess = shininess;
material.specularStrength = specularStrength;`,Z_=`varying vec3 vViewPosition;
struct BlinnPhongMaterial {
	vec3 diffuseColor;
	vec3 specularColor;
	float specularShininess;
	float specularStrength;
};
void RE_Direct_BlinnPhong( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in BlinnPhongMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
	reflectedLight.directSpecular += irradiance * BRDF_BlinnPhong( directLight.direction, geometryViewDir, geometryNormal, material.specularColor, material.specularShininess ) * material.specularStrength;
}
void RE_IndirectDiffuse_BlinnPhong( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in BlinnPhongMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_BlinnPhong
#define RE_IndirectDiffuse		RE_IndirectDiffuse_BlinnPhong`,J_=`PhysicalMaterial material;
material.diffuseColor = diffuseColor.rgb * ( 1.0 - metalnessFactor );
vec3 dxy = max( abs( dFdx( nonPerturbedNormal ) ), abs( dFdy( nonPerturbedNormal ) ) );
float geometryRoughness = max( max( dxy.x, dxy.y ), dxy.z );
material.roughness = max( roughnessFactor, 0.0525 );material.roughness += geometryRoughness;
material.roughness = min( material.roughness, 1.0 );
#ifdef IOR
	material.ior = ior;
	#ifdef USE_SPECULAR
		float specularIntensityFactor = specularIntensity;
		vec3 specularColorFactor = specularColor;
		#ifdef USE_SPECULAR_COLORMAP
			specularColorFactor *= texture2D( specularColorMap, vSpecularColorMapUv ).rgb;
		#endif
		#ifdef USE_SPECULAR_INTENSITYMAP
			specularIntensityFactor *= texture2D( specularIntensityMap, vSpecularIntensityMapUv ).a;
		#endif
		material.specularF90 = mix( specularIntensityFactor, 1.0, metalnessFactor );
	#else
		float specularIntensityFactor = 1.0;
		vec3 specularColorFactor = vec3( 1.0 );
		material.specularF90 = 1.0;
	#endif
	material.specularColor = mix( min( pow2( ( material.ior - 1.0 ) / ( material.ior + 1.0 ) ) * specularColorFactor, vec3( 1.0 ) ) * specularIntensityFactor, diffuseColor.rgb, metalnessFactor );
#else
	material.specularColor = mix( vec3( 0.04 ), diffuseColor.rgb, metalnessFactor );
	material.specularF90 = 1.0;
#endif
#ifdef USE_CLEARCOAT
	material.clearcoat = clearcoat;
	material.clearcoatRoughness = clearcoatRoughness;
	material.clearcoatF0 = vec3( 0.04 );
	material.clearcoatF90 = 1.0;
	#ifdef USE_CLEARCOATMAP
		material.clearcoat *= texture2D( clearcoatMap, vClearcoatMapUv ).x;
	#endif
	#ifdef USE_CLEARCOAT_ROUGHNESSMAP
		material.clearcoatRoughness *= texture2D( clearcoatRoughnessMap, vClearcoatRoughnessMapUv ).y;
	#endif
	material.clearcoat = saturate( material.clearcoat );	material.clearcoatRoughness = max( material.clearcoatRoughness, 0.0525 );
	material.clearcoatRoughness += geometryRoughness;
	material.clearcoatRoughness = min( material.clearcoatRoughness, 1.0 );
#endif
#ifdef USE_DISPERSION
	material.dispersion = dispersion;
#endif
#ifdef USE_IRIDESCENCE
	material.iridescence = iridescence;
	material.iridescenceIOR = iridescenceIOR;
	#ifdef USE_IRIDESCENCEMAP
		material.iridescence *= texture2D( iridescenceMap, vIridescenceMapUv ).r;
	#endif
	#ifdef USE_IRIDESCENCE_THICKNESSMAP
		material.iridescenceThickness = (iridescenceThicknessMaximum - iridescenceThicknessMinimum) * texture2D( iridescenceThicknessMap, vIridescenceThicknessMapUv ).g + iridescenceThicknessMinimum;
	#else
		material.iridescenceThickness = iridescenceThicknessMaximum;
	#endif
#endif
#ifdef USE_SHEEN
	material.sheenColor = sheenColor;
	#ifdef USE_SHEEN_COLORMAP
		material.sheenColor *= texture2D( sheenColorMap, vSheenColorMapUv ).rgb;
	#endif
	material.sheenRoughness = clamp( sheenRoughness, 0.07, 1.0 );
	#ifdef USE_SHEEN_ROUGHNESSMAP
		material.sheenRoughness *= texture2D( sheenRoughnessMap, vSheenRoughnessMapUv ).a;
	#endif
#endif
#ifdef USE_ANISOTROPY
	#ifdef USE_ANISOTROPYMAP
		mat2 anisotropyMat = mat2( anisotropyVector.x, anisotropyVector.y, - anisotropyVector.y, anisotropyVector.x );
		vec3 anisotropyPolar = texture2D( anisotropyMap, vAnisotropyMapUv ).rgb;
		vec2 anisotropyV = anisotropyMat * normalize( 2.0 * anisotropyPolar.rg - vec2( 1.0 ) ) * anisotropyPolar.b;
	#else
		vec2 anisotropyV = anisotropyVector;
	#endif
	material.anisotropy = length( anisotropyV );
	if( material.anisotropy == 0.0 ) {
		anisotropyV = vec2( 1.0, 0.0 );
	} else {
		anisotropyV /= material.anisotropy;
		material.anisotropy = saturate( material.anisotropy );
	}
	material.alphaT = mix( pow2( material.roughness ), 1.0, pow2( material.anisotropy ) );
	material.anisotropyT = tbn[ 0 ] * anisotropyV.x + tbn[ 1 ] * anisotropyV.y;
	material.anisotropyB = tbn[ 1 ] * anisotropyV.x - tbn[ 0 ] * anisotropyV.y;
#endif`,Q_=`struct PhysicalMaterial {
	vec3 diffuseColor;
	float roughness;
	vec3 specularColor;
	float specularF90;
	float dispersion;
	#ifdef USE_CLEARCOAT
		float clearcoat;
		float clearcoatRoughness;
		vec3 clearcoatF0;
		float clearcoatF90;
	#endif
	#ifdef USE_IRIDESCENCE
		float iridescence;
		float iridescenceIOR;
		float iridescenceThickness;
		vec3 iridescenceFresnel;
		vec3 iridescenceF0;
	#endif
	#ifdef USE_SHEEN
		vec3 sheenColor;
		float sheenRoughness;
	#endif
	#ifdef IOR
		float ior;
	#endif
	#ifdef USE_TRANSMISSION
		float transmission;
		float transmissionAlpha;
		float thickness;
		float attenuationDistance;
		vec3 attenuationColor;
	#endif
	#ifdef USE_ANISOTROPY
		float anisotropy;
		float alphaT;
		vec3 anisotropyT;
		vec3 anisotropyB;
	#endif
};
vec3 clearcoatSpecularDirect = vec3( 0.0 );
vec3 clearcoatSpecularIndirect = vec3( 0.0 );
vec3 sheenSpecularDirect = vec3( 0.0 );
vec3 sheenSpecularIndirect = vec3(0.0 );
vec3 Schlick_to_F0( const in vec3 f, const in float f90, const in float dotVH ) {
    float x = clamp( 1.0 - dotVH, 0.0, 1.0 );
    float x2 = x * x;
    float x5 = clamp( x * x2 * x2, 0.0, 0.9999 );
    return ( f - vec3( f90 ) * x5 ) / ( 1.0 - x5 );
}
float V_GGX_SmithCorrelated( const in float alpha, const in float dotNL, const in float dotNV ) {
	float a2 = pow2( alpha );
	float gv = dotNL * sqrt( a2 + ( 1.0 - a2 ) * pow2( dotNV ) );
	float gl = dotNV * sqrt( a2 + ( 1.0 - a2 ) * pow2( dotNL ) );
	return 0.5 / max( gv + gl, EPSILON );
}
float D_GGX( const in float alpha, const in float dotNH ) {
	float a2 = pow2( alpha );
	float denom = pow2( dotNH ) * ( a2 - 1.0 ) + 1.0;
	return RECIPROCAL_PI * a2 / pow2( denom );
}
#ifdef USE_ANISOTROPY
	float V_GGX_SmithCorrelated_Anisotropic( const in float alphaT, const in float alphaB, const in float dotTV, const in float dotBV, const in float dotTL, const in float dotBL, const in float dotNV, const in float dotNL ) {
		float gv = dotNL * length( vec3( alphaT * dotTV, alphaB * dotBV, dotNV ) );
		float gl = dotNV * length( vec3( alphaT * dotTL, alphaB * dotBL, dotNL ) );
		float v = 0.5 / ( gv + gl );
		return saturate(v);
	}
	float D_GGX_Anisotropic( const in float alphaT, const in float alphaB, const in float dotNH, const in float dotTH, const in float dotBH ) {
		float a2 = alphaT * alphaB;
		highp vec3 v = vec3( alphaB * dotTH, alphaT * dotBH, a2 * dotNH );
		highp float v2 = dot( v, v );
		float w2 = a2 / v2;
		return RECIPROCAL_PI * a2 * pow2 ( w2 );
	}
#endif
#ifdef USE_CLEARCOAT
	vec3 BRDF_GGX_Clearcoat( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in PhysicalMaterial material) {
		vec3 f0 = material.clearcoatF0;
		float f90 = material.clearcoatF90;
		float roughness = material.clearcoatRoughness;
		float alpha = pow2( roughness );
		vec3 halfDir = normalize( lightDir + viewDir );
		float dotNL = saturate( dot( normal, lightDir ) );
		float dotNV = saturate( dot( normal, viewDir ) );
		float dotNH = saturate( dot( normal, halfDir ) );
		float dotVH = saturate( dot( viewDir, halfDir ) );
		vec3 F = F_Schlick( f0, f90, dotVH );
		float V = V_GGX_SmithCorrelated( alpha, dotNL, dotNV );
		float D = D_GGX( alpha, dotNH );
		return F * ( V * D );
	}
#endif
vec3 BRDF_GGX( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in PhysicalMaterial material ) {
	vec3 f0 = material.specularColor;
	float f90 = material.specularF90;
	float roughness = material.roughness;
	float alpha = pow2( roughness );
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNL = saturate( dot( normal, lightDir ) );
	float dotNV = saturate( dot( normal, viewDir ) );
	float dotNH = saturate( dot( normal, halfDir ) );
	float dotVH = saturate( dot( viewDir, halfDir ) );
	vec3 F = F_Schlick( f0, f90, dotVH );
	#ifdef USE_IRIDESCENCE
		F = mix( F, material.iridescenceFresnel, material.iridescence );
	#endif
	#ifdef USE_ANISOTROPY
		float dotTL = dot( material.anisotropyT, lightDir );
		float dotTV = dot( material.anisotropyT, viewDir );
		float dotTH = dot( material.anisotropyT, halfDir );
		float dotBL = dot( material.anisotropyB, lightDir );
		float dotBV = dot( material.anisotropyB, viewDir );
		float dotBH = dot( material.anisotropyB, halfDir );
		float V = V_GGX_SmithCorrelated_Anisotropic( material.alphaT, alpha, dotTV, dotBV, dotTL, dotBL, dotNV, dotNL );
		float D = D_GGX_Anisotropic( material.alphaT, alpha, dotNH, dotTH, dotBH );
	#else
		float V = V_GGX_SmithCorrelated( alpha, dotNL, dotNV );
		float D = D_GGX( alpha, dotNH );
	#endif
	return F * ( V * D );
}
vec2 LTC_Uv( const in vec3 N, const in vec3 V, const in float roughness ) {
	const float LUT_SIZE = 64.0;
	const float LUT_SCALE = ( LUT_SIZE - 1.0 ) / LUT_SIZE;
	const float LUT_BIAS = 0.5 / LUT_SIZE;
	float dotNV = saturate( dot( N, V ) );
	vec2 uv = vec2( roughness, sqrt( 1.0 - dotNV ) );
	uv = uv * LUT_SCALE + LUT_BIAS;
	return uv;
}
float LTC_ClippedSphereFormFactor( const in vec3 f ) {
	float l = length( f );
	return max( ( l * l + f.z ) / ( l + 1.0 ), 0.0 );
}
vec3 LTC_EdgeVectorFormFactor( const in vec3 v1, const in vec3 v2 ) {
	float x = dot( v1, v2 );
	float y = abs( x );
	float a = 0.8543985 + ( 0.4965155 + 0.0145206 * y ) * y;
	float b = 3.4175940 + ( 4.1616724 + y ) * y;
	float v = a / b;
	float theta_sintheta = ( x > 0.0 ) ? v : 0.5 * inversesqrt( max( 1.0 - x * x, 1e-7 ) ) - v;
	return cross( v1, v2 ) * theta_sintheta;
}
vec3 LTC_Evaluate( const in vec3 N, const in vec3 V, const in vec3 P, const in mat3 mInv, const in vec3 rectCoords[ 4 ] ) {
	vec3 v1 = rectCoords[ 1 ] - rectCoords[ 0 ];
	vec3 v2 = rectCoords[ 3 ] - rectCoords[ 0 ];
	vec3 lightNormal = cross( v1, v2 );
	if( dot( lightNormal, P - rectCoords[ 0 ] ) < 0.0 ) return vec3( 0.0 );
	vec3 T1, T2;
	T1 = normalize( V - N * dot( V, N ) );
	T2 = - cross( N, T1 );
	mat3 mat = mInv * transposeMat3( mat3( T1, T2, N ) );
	vec3 coords[ 4 ];
	coords[ 0 ] = mat * ( rectCoords[ 0 ] - P );
	coords[ 1 ] = mat * ( rectCoords[ 1 ] - P );
	coords[ 2 ] = mat * ( rectCoords[ 2 ] - P );
	coords[ 3 ] = mat * ( rectCoords[ 3 ] - P );
	coords[ 0 ] = normalize( coords[ 0 ] );
	coords[ 1 ] = normalize( coords[ 1 ] );
	coords[ 2 ] = normalize( coords[ 2 ] );
	coords[ 3 ] = normalize( coords[ 3 ] );
	vec3 vectorFormFactor = vec3( 0.0 );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 0 ], coords[ 1 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 1 ], coords[ 2 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 2 ], coords[ 3 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 3 ], coords[ 0 ] );
	float result = LTC_ClippedSphereFormFactor( vectorFormFactor );
	return vec3( result );
}
#if defined( USE_SHEEN )
float D_Charlie( float roughness, float dotNH ) {
	float alpha = pow2( roughness );
	float invAlpha = 1.0 / alpha;
	float cos2h = dotNH * dotNH;
	float sin2h = max( 1.0 - cos2h, 0.0078125 );
	return ( 2.0 + invAlpha ) * pow( sin2h, invAlpha * 0.5 ) / ( 2.0 * PI );
}
float V_Neubelt( float dotNV, float dotNL ) {
	return saturate( 1.0 / ( 4.0 * ( dotNL + dotNV - dotNL * dotNV ) ) );
}
vec3 BRDF_Sheen( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, vec3 sheenColor, const in float sheenRoughness ) {
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNL = saturate( dot( normal, lightDir ) );
	float dotNV = saturate( dot( normal, viewDir ) );
	float dotNH = saturate( dot( normal, halfDir ) );
	float D = D_Charlie( sheenRoughness, dotNH );
	float V = V_Neubelt( dotNV, dotNL );
	return sheenColor * ( D * V );
}
#endif
float IBLSheenBRDF( const in vec3 normal, const in vec3 viewDir, const in float roughness ) {
	float dotNV = saturate( dot( normal, viewDir ) );
	float r2 = roughness * roughness;
	float a = roughness < 0.25 ? -339.2 * r2 + 161.4 * roughness - 25.9 : -8.48 * r2 + 14.3 * roughness - 9.95;
	float b = roughness < 0.25 ? 44.0 * r2 - 23.7 * roughness + 3.26 : 1.97 * r2 - 3.27 * roughness + 0.72;
	float DG = exp( a * dotNV + b ) + ( roughness < 0.25 ? 0.0 : 0.1 * ( roughness - 0.25 ) );
	return saturate( DG * RECIPROCAL_PI );
}
vec2 DFGApprox( const in vec3 normal, const in vec3 viewDir, const in float roughness ) {
	float dotNV = saturate( dot( normal, viewDir ) );
	const vec4 c0 = vec4( - 1, - 0.0275, - 0.572, 0.022 );
	const vec4 c1 = vec4( 1, 0.0425, 1.04, - 0.04 );
	vec4 r = roughness * c0 + c1;
	float a004 = min( r.x * r.x, exp2( - 9.28 * dotNV ) ) * r.x + r.y;
	vec2 fab = vec2( - 1.04, 1.04 ) * a004 + r.zw;
	return fab;
}
vec3 EnvironmentBRDF( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float roughness ) {
	vec2 fab = DFGApprox( normal, viewDir, roughness );
	return specularColor * fab.x + specularF90 * fab.y;
}
#ifdef USE_IRIDESCENCE
void computeMultiscatteringIridescence( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float iridescence, const in vec3 iridescenceF0, const in float roughness, inout vec3 singleScatter, inout vec3 multiScatter ) {
#else
void computeMultiscattering( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float roughness, inout vec3 singleScatter, inout vec3 multiScatter ) {
#endif
	vec2 fab = DFGApprox( normal, viewDir, roughness );
	#ifdef USE_IRIDESCENCE
		vec3 Fr = mix( specularColor, iridescenceF0, iridescence );
	#else
		vec3 Fr = specularColor;
	#endif
	vec3 FssEss = Fr * fab.x + specularF90 * fab.y;
	float Ess = fab.x + fab.y;
	float Ems = 1.0 - Ess;
	vec3 Favg = Fr + ( 1.0 - Fr ) * 0.047619;	vec3 Fms = FssEss * Favg / ( 1.0 - Ems * Favg );
	singleScatter += FssEss;
	multiScatter += Fms * Ems;
}
#if NUM_RECT_AREA_LIGHTS > 0
	void RE_Direct_RectArea_Physical( const in RectAreaLight rectAreaLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
		vec3 normal = geometryNormal;
		vec3 viewDir = geometryViewDir;
		vec3 position = geometryPosition;
		vec3 lightPos = rectAreaLight.position;
		vec3 halfWidth = rectAreaLight.halfWidth;
		vec3 halfHeight = rectAreaLight.halfHeight;
		vec3 lightColor = rectAreaLight.color;
		float roughness = material.roughness;
		vec3 rectCoords[ 4 ];
		rectCoords[ 0 ] = lightPos + halfWidth - halfHeight;		rectCoords[ 1 ] = lightPos - halfWidth - halfHeight;
		rectCoords[ 2 ] = lightPos - halfWidth + halfHeight;
		rectCoords[ 3 ] = lightPos + halfWidth + halfHeight;
		vec2 uv = LTC_Uv( normal, viewDir, roughness );
		vec4 t1 = texture2D( ltc_1, uv );
		vec4 t2 = texture2D( ltc_2, uv );
		mat3 mInv = mat3(
			vec3( t1.x, 0, t1.y ),
			vec3(    0, 1,    0 ),
			vec3( t1.z, 0, t1.w )
		);
		vec3 fresnel = ( material.specularColor * t2.x + ( vec3( 1.0 ) - material.specularColor ) * t2.y );
		reflectedLight.directSpecular += lightColor * fresnel * LTC_Evaluate( normal, viewDir, position, mInv, rectCoords );
		reflectedLight.directDiffuse += lightColor * material.diffuseColor * LTC_Evaluate( normal, viewDir, position, mat3( 1.0 ), rectCoords );
	}
#endif
void RE_Direct_Physical( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	#ifdef USE_CLEARCOAT
		float dotNLcc = saturate( dot( geometryClearcoatNormal, directLight.direction ) );
		vec3 ccIrradiance = dotNLcc * directLight.color;
		clearcoatSpecularDirect += ccIrradiance * BRDF_GGX_Clearcoat( directLight.direction, geometryViewDir, geometryClearcoatNormal, material );
	#endif
	#ifdef USE_SHEEN
		sheenSpecularDirect += irradiance * BRDF_Sheen( directLight.direction, geometryViewDir, geometryNormal, material.sheenColor, material.sheenRoughness );
	#endif
	reflectedLight.directSpecular += irradiance * BRDF_GGX( directLight.direction, geometryViewDir, geometryNormal, material );
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Physical( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectSpecular_Physical( const in vec3 radiance, const in vec3 irradiance, const in vec3 clearcoatRadiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight) {
	#ifdef USE_CLEARCOAT
		clearcoatSpecularIndirect += clearcoatRadiance * EnvironmentBRDF( geometryClearcoatNormal, geometryViewDir, material.clearcoatF0, material.clearcoatF90, material.clearcoatRoughness );
	#endif
	#ifdef USE_SHEEN
		sheenSpecularIndirect += irradiance * material.sheenColor * IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness );
	#endif
	vec3 singleScattering = vec3( 0.0 );
	vec3 multiScattering = vec3( 0.0 );
	vec3 cosineWeightedIrradiance = irradiance * RECIPROCAL_PI;
	#ifdef USE_IRIDESCENCE
		computeMultiscatteringIridescence( geometryNormal, geometryViewDir, material.specularColor, material.specularF90, material.iridescence, material.iridescenceFresnel, material.roughness, singleScattering, multiScattering );
	#else
		computeMultiscattering( geometryNormal, geometryViewDir, material.specularColor, material.specularF90, material.roughness, singleScattering, multiScattering );
	#endif
	vec3 totalScattering = singleScattering + multiScattering;
	vec3 diffuse = material.diffuseColor * ( 1.0 - max( max( totalScattering.r, totalScattering.g ), totalScattering.b ) );
	reflectedLight.indirectSpecular += radiance * singleScattering;
	reflectedLight.indirectSpecular += multiScattering * cosineWeightedIrradiance;
	reflectedLight.indirectDiffuse += diffuse * cosineWeightedIrradiance;
}
#define RE_Direct				RE_Direct_Physical
#define RE_Direct_RectArea		RE_Direct_RectArea_Physical
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Physical
#define RE_IndirectSpecular		RE_IndirectSpecular_Physical
float computeSpecularOcclusion( const in float dotNV, const in float ambientOcclusion, const in float roughness ) {
	return saturate( pow( dotNV + ambientOcclusion, exp2( - 16.0 * roughness - 1.0 ) ) - 1.0 + ambientOcclusion );
}`,ey=`
vec3 geometryPosition = - vViewPosition;
vec3 geometryNormal = normal;
vec3 geometryViewDir = ( isOrthographic ) ? vec3( 0, 0, 1 ) : normalize( vViewPosition );
vec3 geometryClearcoatNormal = vec3( 0.0 );
#ifdef USE_CLEARCOAT
	geometryClearcoatNormal = clearcoatNormal;
#endif
#ifdef USE_IRIDESCENCE
	float dotNVi = saturate( dot( normal, geometryViewDir ) );
	if ( material.iridescenceThickness == 0.0 ) {
		material.iridescence = 0.0;
	} else {
		material.iridescence = saturate( material.iridescence );
	}
	if ( material.iridescence > 0.0 ) {
		material.iridescenceFresnel = evalIridescence( 1.0, material.iridescenceIOR, dotNVi, material.iridescenceThickness, material.specularColor );
		material.iridescenceF0 = Schlick_to_F0( material.iridescenceFresnel, 1.0, dotNVi );
	}
#endif
IncidentLight directLight;
#if ( NUM_POINT_LIGHTS > 0 ) && defined( RE_Direct )
	PointLight pointLight;
	#if defined( USE_SHADOWMAP ) && NUM_POINT_LIGHT_SHADOWS > 0
	PointLightShadow pointLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_POINT_LIGHTS; i ++ ) {
		pointLight = pointLights[ i ];
		getPointLightInfo( pointLight, geometryPosition, directLight );
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_POINT_LIGHT_SHADOWS )
		pointLightShadow = pointLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getPointShadow( pointShadowMap[ i ], pointLightShadow.shadowMapSize, pointLightShadow.shadowIntensity, pointLightShadow.shadowBias, pointLightShadow.shadowRadius, vPointShadowCoord[ i ], pointLightShadow.shadowCameraNear, pointLightShadow.shadowCameraFar ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_SPOT_LIGHTS > 0 ) && defined( RE_Direct )
	SpotLight spotLight;
	vec4 spotColor;
	vec3 spotLightCoord;
	bool inSpotLightMap;
	#if defined( USE_SHADOWMAP ) && NUM_SPOT_LIGHT_SHADOWS > 0
	SpotLightShadow spotLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHTS; i ++ ) {
		spotLight = spotLights[ i ];
		getSpotLightInfo( spotLight, geometryPosition, directLight );
		#if ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS )
		#define SPOT_LIGHT_MAP_INDEX UNROLLED_LOOP_INDEX
		#elif ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
		#define SPOT_LIGHT_MAP_INDEX NUM_SPOT_LIGHT_MAPS
		#else
		#define SPOT_LIGHT_MAP_INDEX ( UNROLLED_LOOP_INDEX - NUM_SPOT_LIGHT_SHADOWS + NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS )
		#endif
		#if ( SPOT_LIGHT_MAP_INDEX < NUM_SPOT_LIGHT_MAPS )
			spotLightCoord = vSpotLightCoord[ i ].xyz / vSpotLightCoord[ i ].w;
			inSpotLightMap = all( lessThan( abs( spotLightCoord * 2. - 1. ), vec3( 1.0 ) ) );
			spotColor = texture2D( spotLightMap[ SPOT_LIGHT_MAP_INDEX ], spotLightCoord.xy );
			directLight.color = inSpotLightMap ? directLight.color * spotColor.rgb : directLight.color;
		#endif
		#undef SPOT_LIGHT_MAP_INDEX
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
		spotLightShadow = spotLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getShadow( spotShadowMap[ i ], spotLightShadow.shadowMapSize, spotLightShadow.shadowIntensity, spotLightShadow.shadowBias, spotLightShadow.shadowRadius, vSpotLightCoord[ i ] ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_DIR_LIGHTS > 0 ) && defined( RE_Direct )
	DirectionalLight directionalLight;
	#if defined( USE_SHADOWMAP ) && NUM_DIR_LIGHT_SHADOWS > 0
	DirectionalLightShadow directionalLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_DIR_LIGHTS; i ++ ) {
		directionalLight = directionalLights[ i ];
		getDirectionalLightInfo( directionalLight, directLight );
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_DIR_LIGHT_SHADOWS )
		directionalLightShadow = directionalLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getShadow( directionalShadowMap[ i ], directionalLightShadow.shadowMapSize, directionalLightShadow.shadowIntensity, directionalLightShadow.shadowBias, directionalLightShadow.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_RECT_AREA_LIGHTS > 0 ) && defined( RE_Direct_RectArea )
	RectAreaLight rectAreaLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_RECT_AREA_LIGHTS; i ++ ) {
		rectAreaLight = rectAreaLights[ i ];
		RE_Direct_RectArea( rectAreaLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if defined( RE_IndirectDiffuse )
	vec3 iblIrradiance = vec3( 0.0 );
	vec3 irradiance = getAmbientLightIrradiance( ambientLightColor );
	#if defined( USE_LIGHT_PROBES )
		irradiance += getLightProbeIrradiance( lightProbe, geometryNormal );
	#endif
	#if ( NUM_HEMI_LIGHTS > 0 )
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_HEMI_LIGHTS; i ++ ) {
			irradiance += getHemisphereLightIrradiance( hemisphereLights[ i ], geometryNormal );
		}
		#pragma unroll_loop_end
	#endif
#endif
#if defined( RE_IndirectSpecular )
	vec3 radiance = vec3( 0.0 );
	vec3 clearcoatRadiance = vec3( 0.0 );
#endif`,ty=`#if defined( RE_IndirectDiffuse )
	#ifdef USE_LIGHTMAP
		vec4 lightMapTexel = texture2D( lightMap, vLightMapUv );
		vec3 lightMapIrradiance = lightMapTexel.rgb * lightMapIntensity;
		irradiance += lightMapIrradiance;
	#endif
	#if defined( USE_ENVMAP ) && defined( STANDARD ) && defined( ENVMAP_TYPE_CUBE_UV )
		iblIrradiance += getIBLIrradiance( geometryNormal );
	#endif
#endif
#if defined( USE_ENVMAP ) && defined( RE_IndirectSpecular )
	#ifdef USE_ANISOTROPY
		radiance += getIBLAnisotropyRadiance( geometryViewDir, geometryNormal, material.roughness, material.anisotropyB, material.anisotropy );
	#else
		radiance += getIBLRadiance( geometryViewDir, geometryNormal, material.roughness );
	#endif
	#ifdef USE_CLEARCOAT
		clearcoatRadiance += getIBLRadiance( geometryViewDir, geometryClearcoatNormal, material.clearcoatRoughness );
	#endif
#endif`,ny=`#if defined( RE_IndirectDiffuse )
	RE_IndirectDiffuse( irradiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif
#if defined( RE_IndirectSpecular )
	RE_IndirectSpecular( radiance, iblIrradiance, clearcoatRadiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif`,iy=`#if defined( USE_LOGARITHMIC_DEPTH_BUFFER )
	gl_FragDepth = vIsPerspective == 0.0 ? gl_FragCoord.z : log2( vFragDepth ) * logDepthBufFC * 0.5;
#endif`,ry=`#if defined( USE_LOGARITHMIC_DEPTH_BUFFER )
	uniform float logDepthBufFC;
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,sy=`#ifdef USE_LOGARITHMIC_DEPTH_BUFFER
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,ay=`#ifdef USE_LOGARITHMIC_DEPTH_BUFFER
	vFragDepth = 1.0 + gl_Position.w;
	vIsPerspective = float( isPerspectiveMatrix( projectionMatrix ) );
#endif`,oy=`#ifdef USE_MAP
	vec4 sampledDiffuseColor = texture2D( map, vMapUv );
	#ifdef DECODE_VIDEO_TEXTURE
		sampledDiffuseColor = sRGBTransferEOTF( sampledDiffuseColor );
	#endif
	diffuseColor *= sampledDiffuseColor;
#endif`,cy=`#ifdef USE_MAP
	uniform sampler2D map;
#endif`,ly=`#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
	#if defined( USE_POINTS_UV )
		vec2 uv = vUv;
	#else
		vec2 uv = ( uvTransform * vec3( gl_PointCoord.x, 1.0 - gl_PointCoord.y, 1 ) ).xy;
	#endif
#endif
#ifdef USE_MAP
	diffuseColor *= texture2D( map, uv );
#endif
#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, uv ).g;
#endif`,uy=`#if defined( USE_POINTS_UV )
	varying vec2 vUv;
#else
	#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
		uniform mat3 uvTransform;
	#endif
#endif
#ifdef USE_MAP
	uniform sampler2D map;
#endif
#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,dy=`float metalnessFactor = metalness;
#ifdef USE_METALNESSMAP
	vec4 texelMetalness = texture2D( metalnessMap, vMetalnessMapUv );
	metalnessFactor *= texelMetalness.b;
#endif`,hy=`#ifdef USE_METALNESSMAP
	uniform sampler2D metalnessMap;
#endif`,fy=`#ifdef USE_INSTANCING_MORPH
	float morphTargetInfluences[ MORPHTARGETS_COUNT ];
	float morphTargetBaseInfluence = texelFetch( morphTexture, ivec2( 0, gl_InstanceID ), 0 ).r;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		morphTargetInfluences[i] =  texelFetch( morphTexture, ivec2( i + 1, gl_InstanceID ), 0 ).r;
	}
#endif`,py=`#if defined( USE_MORPHCOLORS )
	vColor *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		#if defined( USE_COLOR_ALPHA )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ) * morphTargetInfluences[ i ];
		#elif defined( USE_COLOR )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ).rgb * morphTargetInfluences[ i ];
		#endif
	}
#endif`,my=`#ifdef USE_MORPHNORMALS
	objectNormal *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) objectNormal += getMorph( gl_VertexID, i, 1 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,gy=`#ifdef USE_MORPHTARGETS
	#ifndef USE_INSTANCING_MORPH
		uniform float morphTargetBaseInfluence;
		uniform float morphTargetInfluences[ MORPHTARGETS_COUNT ];
	#endif
	uniform sampler2DArray morphTargetsTexture;
	uniform ivec2 morphTargetsTextureSize;
	vec4 getMorph( const in int vertexIndex, const in int morphTargetIndex, const in int offset ) {
		int texelIndex = vertexIndex * MORPHTARGETS_TEXTURE_STRIDE + offset;
		int y = texelIndex / morphTargetsTextureSize.x;
		int x = texelIndex - y * morphTargetsTextureSize.x;
		ivec3 morphUV = ivec3( x, y, morphTargetIndex );
		return texelFetch( morphTargetsTexture, morphUV, 0 );
	}
#endif`,vy=`#ifdef USE_MORPHTARGETS
	transformed *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) transformed += getMorph( gl_VertexID, i, 0 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,_y=`float faceDirection = gl_FrontFacing ? 1.0 : - 1.0;
#ifdef FLAT_SHADED
	vec3 fdx = dFdx( vViewPosition );
	vec3 fdy = dFdy( vViewPosition );
	vec3 normal = normalize( cross( fdx, fdy ) );
#else
	vec3 normal = normalize( vNormal );
	#ifdef DOUBLE_SIDED
		normal *= faceDirection;
	#endif
#endif
#if defined( USE_NORMALMAP_TANGENTSPACE ) || defined( USE_CLEARCOAT_NORMALMAP ) || defined( USE_ANISOTROPY )
	#ifdef USE_TANGENT
		mat3 tbn = mat3( normalize( vTangent ), normalize( vBitangent ), normal );
	#else
		mat3 tbn = getTangentFrame( - vViewPosition, normal,
		#if defined( USE_NORMALMAP )
			vNormalMapUv
		#elif defined( USE_CLEARCOAT_NORMALMAP )
			vClearcoatNormalMapUv
		#else
			vUv
		#endif
		);
	#endif
	#if defined( DOUBLE_SIDED ) && ! defined( FLAT_SHADED )
		tbn[0] *= faceDirection;
		tbn[1] *= faceDirection;
	#endif
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	#ifdef USE_TANGENT
		mat3 tbn2 = mat3( normalize( vTangent ), normalize( vBitangent ), normal );
	#else
		mat3 tbn2 = getTangentFrame( - vViewPosition, normal, vClearcoatNormalMapUv );
	#endif
	#if defined( DOUBLE_SIDED ) && ! defined( FLAT_SHADED )
		tbn2[0] *= faceDirection;
		tbn2[1] *= faceDirection;
	#endif
#endif
vec3 nonPerturbedNormal = normal;`,yy=`#ifdef USE_NORMALMAP_OBJECTSPACE
	normal = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;
	#ifdef FLIP_SIDED
		normal = - normal;
	#endif
	#ifdef DOUBLE_SIDED
		normal = normal * faceDirection;
	#endif
	normal = normalize( normalMatrix * normal );
#elif defined( USE_NORMALMAP_TANGENTSPACE )
	vec3 mapN = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;
	mapN.xy *= normalScale;
	normal = normalize( tbn * mapN );
#elif defined( USE_BUMPMAP )
	normal = perturbNormalArb( - vViewPosition, normal, dHdxy_fwd(), faceDirection );
#endif`,xy=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,My=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,Sy=`#ifndef FLAT_SHADED
	vNormal = normalize( transformedNormal );
	#ifdef USE_TANGENT
		vTangent = normalize( transformedTangent );
		vBitangent = normalize( cross( vNormal, vTangent ) * tangent.w );
	#endif
#endif`,by=`#ifdef USE_NORMALMAP
	uniform sampler2D normalMap;
	uniform vec2 normalScale;
#endif
#ifdef USE_NORMALMAP_OBJECTSPACE
	uniform mat3 normalMatrix;
#endif
#if ! defined ( USE_TANGENT ) && ( defined ( USE_NORMALMAP_TANGENTSPACE ) || defined ( USE_CLEARCOAT_NORMALMAP ) || defined( USE_ANISOTROPY ) )
	mat3 getTangentFrame( vec3 eye_pos, vec3 surf_norm, vec2 uv ) {
		vec3 q0 = dFdx( eye_pos.xyz );
		vec3 q1 = dFdy( eye_pos.xyz );
		vec2 st0 = dFdx( uv.st );
		vec2 st1 = dFdy( uv.st );
		vec3 N = surf_norm;
		vec3 q1perp = cross( q1, N );
		vec3 q0perp = cross( N, q0 );
		vec3 T = q1perp * st0.x + q0perp * st1.x;
		vec3 B = q1perp * st0.y + q0perp * st1.y;
		float det = max( dot( T, T ), dot( B, B ) );
		float scale = ( det == 0.0 ) ? 0.0 : inversesqrt( det );
		return mat3( T * scale, B * scale, N );
	}
#endif`,wy=`#ifdef USE_CLEARCOAT
	vec3 clearcoatNormal = nonPerturbedNormal;
#endif`,Ey=`#ifdef USE_CLEARCOAT_NORMALMAP
	vec3 clearcoatMapN = texture2D( clearcoatNormalMap, vClearcoatNormalMapUv ).xyz * 2.0 - 1.0;
	clearcoatMapN.xy *= clearcoatNormalScale;
	clearcoatNormal = normalize( tbn2 * clearcoatMapN );
#endif`,Ty=`#ifdef USE_CLEARCOATMAP
	uniform sampler2D clearcoatMap;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform sampler2D clearcoatNormalMap;
	uniform vec2 clearcoatNormalScale;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform sampler2D clearcoatRoughnessMap;
#endif`,Ay=`#ifdef USE_IRIDESCENCEMAP
	uniform sampler2D iridescenceMap;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform sampler2D iridescenceThicknessMap;
#endif`,Ry=`#ifdef OPAQUE
diffuseColor.a = 1.0;
#endif
#ifdef USE_TRANSMISSION
diffuseColor.a *= material.transmissionAlpha;
#endif
gl_FragColor = vec4( outgoingLight, diffuseColor.a );`,Cy=`vec3 packNormalToRGB( const in vec3 normal ) {
	return normalize( normal ) * 0.5 + 0.5;
}
vec3 unpackRGBToNormal( const in vec3 rgb ) {
	return 2.0 * rgb.xyz - 1.0;
}
const float PackUpscale = 256. / 255.;const float UnpackDownscale = 255. / 256.;const float ShiftRight8 = 1. / 256.;
const float Inv255 = 1. / 255.;
const vec4 PackFactors = vec4( 1.0, 256.0, 256.0 * 256.0, 256.0 * 256.0 * 256.0 );
const vec2 UnpackFactors2 = vec2( UnpackDownscale, 1.0 / PackFactors.g );
const vec3 UnpackFactors3 = vec3( UnpackDownscale / PackFactors.rg, 1.0 / PackFactors.b );
const vec4 UnpackFactors4 = vec4( UnpackDownscale / PackFactors.rgb, 1.0 / PackFactors.a );
vec4 packDepthToRGBA( const in float v ) {
	if( v <= 0.0 )
		return vec4( 0., 0., 0., 0. );
	if( v >= 1.0 )
		return vec4( 1., 1., 1., 1. );
	float vuf;
	float af = modf( v * PackFactors.a, vuf );
	float bf = modf( vuf * ShiftRight8, vuf );
	float gf = modf( vuf * ShiftRight8, vuf );
	return vec4( vuf * Inv255, gf * PackUpscale, bf * PackUpscale, af );
}
vec3 packDepthToRGB( const in float v ) {
	if( v <= 0.0 )
		return vec3( 0., 0., 0. );
	if( v >= 1.0 )
		return vec3( 1., 1., 1. );
	float vuf;
	float bf = modf( v * PackFactors.b, vuf );
	float gf = modf( vuf * ShiftRight8, vuf );
	return vec3( vuf * Inv255, gf * PackUpscale, bf );
}
vec2 packDepthToRG( const in float v ) {
	if( v <= 0.0 )
		return vec2( 0., 0. );
	if( v >= 1.0 )
		return vec2( 1., 1. );
	float vuf;
	float gf = modf( v * 256., vuf );
	return vec2( vuf * Inv255, gf );
}
float unpackRGBAToDepth( const in vec4 v ) {
	return dot( v, UnpackFactors4 );
}
float unpackRGBToDepth( const in vec3 v ) {
	return dot( v, UnpackFactors3 );
}
float unpackRGToDepth( const in vec2 v ) {
	return v.r * UnpackFactors2.r + v.g * UnpackFactors2.g;
}
vec4 pack2HalfToRGBA( const in vec2 v ) {
	vec4 r = vec4( v.x, fract( v.x * 255.0 ), v.y, fract( v.y * 255.0 ) );
	return vec4( r.x - r.y / 255.0, r.y, r.z - r.w / 255.0, r.w );
}
vec2 unpackRGBATo2Half( const in vec4 v ) {
	return vec2( v.x + ( v.y / 255.0 ), v.z + ( v.w / 255.0 ) );
}
float viewZToOrthographicDepth( const in float viewZ, const in float near, const in float far ) {
	return ( viewZ + near ) / ( near - far );
}
float orthographicDepthToViewZ( const in float depth, const in float near, const in float far ) {
	return depth * ( near - far ) - near;
}
float viewZToPerspectiveDepth( const in float viewZ, const in float near, const in float far ) {
	return ( ( near + viewZ ) * far ) / ( ( far - near ) * viewZ );
}
float perspectiveDepthToViewZ( const in float depth, const in float near, const in float far ) {
	return ( near * far ) / ( ( far - near ) * depth - far );
}`,Ly=`#ifdef PREMULTIPLIED_ALPHA
	gl_FragColor.rgb *= gl_FragColor.a;
#endif`,Py=`vec4 mvPosition = vec4( transformed, 1.0 );
#ifdef USE_BATCHING
	mvPosition = batchingMatrix * mvPosition;
#endif
#ifdef USE_INSTANCING
	mvPosition = instanceMatrix * mvPosition;
#endif
mvPosition = modelViewMatrix * mvPosition;
gl_Position = projectionMatrix * mvPosition;`,Iy=`#ifdef DITHERING
	gl_FragColor.rgb = dithering( gl_FragColor.rgb );
#endif`,Dy=`#ifdef DITHERING
	vec3 dithering( vec3 color ) {
		float grid_position = rand( gl_FragCoord.xy );
		vec3 dither_shift_RGB = vec3( 0.25 / 255.0, -0.25 / 255.0, 0.25 / 255.0 );
		dither_shift_RGB = mix( 2.0 * dither_shift_RGB, -2.0 * dither_shift_RGB, grid_position );
		return color + dither_shift_RGB;
	}
#endif`,Ny=`float roughnessFactor = roughness;
#ifdef USE_ROUGHNESSMAP
	vec4 texelRoughness = texture2D( roughnessMap, vRoughnessMapUv );
	roughnessFactor *= texelRoughness.g;
#endif`,Uy=`#ifdef USE_ROUGHNESSMAP
	uniform sampler2D roughnessMap;
#endif`,Fy=`#if NUM_SPOT_LIGHT_COORDS > 0
	varying vec4 vSpotLightCoord[ NUM_SPOT_LIGHT_COORDS ];
#endif
#if NUM_SPOT_LIGHT_MAPS > 0
	uniform sampler2D spotLightMap[ NUM_SPOT_LIGHT_MAPS ];
#endif
#ifdef USE_SHADOWMAP
	#if NUM_DIR_LIGHT_SHADOWS > 0
		uniform sampler2D directionalShadowMap[ NUM_DIR_LIGHT_SHADOWS ];
		varying vec4 vDirectionalShadowCoord[ NUM_DIR_LIGHT_SHADOWS ];
		struct DirectionalLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform DirectionalLightShadow directionalLightShadows[ NUM_DIR_LIGHT_SHADOWS ];
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
		uniform sampler2D spotShadowMap[ NUM_SPOT_LIGHT_SHADOWS ];
		struct SpotLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform SpotLightShadow spotLightShadows[ NUM_SPOT_LIGHT_SHADOWS ];
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		uniform sampler2D pointShadowMap[ NUM_POINT_LIGHT_SHADOWS ];
		varying vec4 vPointShadowCoord[ NUM_POINT_LIGHT_SHADOWS ];
		struct PointLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
			float shadowCameraNear;
			float shadowCameraFar;
		};
		uniform PointLightShadow pointLightShadows[ NUM_POINT_LIGHT_SHADOWS ];
	#endif
	float texture2DCompare( sampler2D depths, vec2 uv, float compare ) {
		float depth = unpackRGBAToDepth( texture2D( depths, uv ) );
		#ifdef USE_REVERSED_DEPTH_BUFFER
			return step( depth, compare );
		#else
			return step( compare, depth );
		#endif
	}
	vec2 texture2DDistribution( sampler2D shadow, vec2 uv ) {
		return unpackRGBATo2Half( texture2D( shadow, uv ) );
	}
	float VSMShadow( sampler2D shadow, vec2 uv, float compare ) {
		float occlusion = 1.0;
		vec2 distribution = texture2DDistribution( shadow, uv );
		#ifdef USE_REVERSED_DEPTH_BUFFER
			float hard_shadow = step( distribution.x, compare );
		#else
			float hard_shadow = step( compare, distribution.x );
		#endif
		if ( hard_shadow != 1.0 ) {
			float distance = compare - distribution.x;
			float variance = max( 0.00000, distribution.y * distribution.y );
			float softness_probability = variance / (variance + distance * distance );			softness_probability = clamp( ( softness_probability - 0.3 ) / ( 0.95 - 0.3 ), 0.0, 1.0 );			occlusion = clamp( max( hard_shadow, softness_probability ), 0.0, 1.0 );
		}
		return occlusion;
	}
	float getShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord ) {
		float shadow = 1.0;
		shadowCoord.xyz /= shadowCoord.w;
		shadowCoord.z += shadowBias;
		bool inFrustum = shadowCoord.x >= 0.0 && shadowCoord.x <= 1.0 && shadowCoord.y >= 0.0 && shadowCoord.y <= 1.0;
		bool frustumTest = inFrustum && shadowCoord.z <= 1.0;
		if ( frustumTest ) {
		#if defined( SHADOWMAP_TYPE_PCF )
			vec2 texelSize = vec2( 1.0 ) / shadowMapSize;
			float dx0 = - texelSize.x * shadowRadius;
			float dy0 = - texelSize.y * shadowRadius;
			float dx1 = + texelSize.x * shadowRadius;
			float dy1 = + texelSize.y * shadowRadius;
			float dx2 = dx0 / 2.0;
			float dy2 = dy0 / 2.0;
			float dx3 = dx1 / 2.0;
			float dy3 = dy1 / 2.0;
			shadow = (
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx0, dy0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( 0.0, dy0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx1, dy0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx2, dy2 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( 0.0, dy2 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx3, dy2 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx0, 0.0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx2, 0.0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy, shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx3, 0.0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx1, 0.0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx2, dy3 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( 0.0, dy3 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx3, dy3 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx0, dy1 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( 0.0, dy1 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx1, dy1 ), shadowCoord.z )
			) * ( 1.0 / 17.0 );
		#elif defined( SHADOWMAP_TYPE_PCF_SOFT )
			vec2 texelSize = vec2( 1.0 ) / shadowMapSize;
			float dx = texelSize.x;
			float dy = texelSize.y;
			vec2 uv = shadowCoord.xy;
			vec2 f = fract( uv * shadowMapSize + 0.5 );
			uv -= f * texelSize;
			shadow = (
				texture2DCompare( shadowMap, uv, shadowCoord.z ) +
				texture2DCompare( shadowMap, uv + vec2( dx, 0.0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, uv + vec2( 0.0, dy ), shadowCoord.z ) +
				texture2DCompare( shadowMap, uv + texelSize, shadowCoord.z ) +
				mix( texture2DCompare( shadowMap, uv + vec2( -dx, 0.0 ), shadowCoord.z ),
					 texture2DCompare( shadowMap, uv + vec2( 2.0 * dx, 0.0 ), shadowCoord.z ),
					 f.x ) +
				mix( texture2DCompare( shadowMap, uv + vec2( -dx, dy ), shadowCoord.z ),
					 texture2DCompare( shadowMap, uv + vec2( 2.0 * dx, dy ), shadowCoord.z ),
					 f.x ) +
				mix( texture2DCompare( shadowMap, uv + vec2( 0.0, -dy ), shadowCoord.z ),
					 texture2DCompare( shadowMap, uv + vec2( 0.0, 2.0 * dy ), shadowCoord.z ),
					 f.y ) +
				mix( texture2DCompare( shadowMap, uv + vec2( dx, -dy ), shadowCoord.z ),
					 texture2DCompare( shadowMap, uv + vec2( dx, 2.0 * dy ), shadowCoord.z ),
					 f.y ) +
				mix( mix( texture2DCompare( shadowMap, uv + vec2( -dx, -dy ), shadowCoord.z ),
						  texture2DCompare( shadowMap, uv + vec2( 2.0 * dx, -dy ), shadowCoord.z ),
						  f.x ),
					 mix( texture2DCompare( shadowMap, uv + vec2( -dx, 2.0 * dy ), shadowCoord.z ),
						  texture2DCompare( shadowMap, uv + vec2( 2.0 * dx, 2.0 * dy ), shadowCoord.z ),
						  f.x ),
					 f.y )
			) * ( 1.0 / 9.0 );
		#elif defined( SHADOWMAP_TYPE_VSM )
			shadow = VSMShadow( shadowMap, shadowCoord.xy, shadowCoord.z );
		#else
			shadow = texture2DCompare( shadowMap, shadowCoord.xy, shadowCoord.z );
		#endif
		}
		return mix( 1.0, shadow, shadowIntensity );
	}
	vec2 cubeToUV( vec3 v, float texelSizeY ) {
		vec3 absV = abs( v );
		float scaleToCube = 1.0 / max( absV.x, max( absV.y, absV.z ) );
		absV *= scaleToCube;
		v *= scaleToCube * ( 1.0 - 2.0 * texelSizeY );
		vec2 planar = v.xy;
		float almostATexel = 1.5 * texelSizeY;
		float almostOne = 1.0 - almostATexel;
		if ( absV.z >= almostOne ) {
			if ( v.z > 0.0 )
				planar.x = 4.0 - v.x;
		} else if ( absV.x >= almostOne ) {
			float signX = sign( v.x );
			planar.x = v.z * signX + 2.0 * signX;
		} else if ( absV.y >= almostOne ) {
			float signY = sign( v.y );
			planar.x = v.x + 2.0 * signY + 2.0;
			planar.y = v.z * signY - 2.0;
		}
		return vec2( 0.125, 0.25 ) * planar + vec2( 0.375, 0.75 );
	}
	float getPointShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord, float shadowCameraNear, float shadowCameraFar ) {
		float shadow = 1.0;
		vec3 lightToPosition = shadowCoord.xyz;
		
		float lightToPositionLength = length( lightToPosition );
		if ( lightToPositionLength - shadowCameraFar <= 0.0 && lightToPositionLength - shadowCameraNear >= 0.0 ) {
			float dp = ( lightToPositionLength - shadowCameraNear ) / ( shadowCameraFar - shadowCameraNear );			dp += shadowBias;
			vec3 bd3D = normalize( lightToPosition );
			vec2 texelSize = vec2( 1.0 ) / ( shadowMapSize * vec2( 4.0, 2.0 ) );
			#if defined( SHADOWMAP_TYPE_PCF ) || defined( SHADOWMAP_TYPE_PCF_SOFT ) || defined( SHADOWMAP_TYPE_VSM )
				vec2 offset = vec2( - 1, 1 ) * shadowRadius * texelSize.y;
				shadow = (
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.xyy, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.yyy, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.xyx, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.yyx, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.xxy, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.yxy, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.xxx, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.yxx, texelSize.y ), dp )
				) * ( 1.0 / 9.0 );
			#else
				shadow = texture2DCompare( shadowMap, cubeToUV( bd3D, texelSize.y ), dp );
			#endif
		}
		return mix( 1.0, shadow, shadowIntensity );
	}
#endif`,Oy=`#if NUM_SPOT_LIGHT_COORDS > 0
	uniform mat4 spotLightMatrix[ NUM_SPOT_LIGHT_COORDS ];
	varying vec4 vSpotLightCoord[ NUM_SPOT_LIGHT_COORDS ];
#endif
#ifdef USE_SHADOWMAP
	#if NUM_DIR_LIGHT_SHADOWS > 0
		uniform mat4 directionalShadowMatrix[ NUM_DIR_LIGHT_SHADOWS ];
		varying vec4 vDirectionalShadowCoord[ NUM_DIR_LIGHT_SHADOWS ];
		struct DirectionalLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform DirectionalLightShadow directionalLightShadows[ NUM_DIR_LIGHT_SHADOWS ];
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
		struct SpotLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform SpotLightShadow spotLightShadows[ NUM_SPOT_LIGHT_SHADOWS ];
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		uniform mat4 pointShadowMatrix[ NUM_POINT_LIGHT_SHADOWS ];
		varying vec4 vPointShadowCoord[ NUM_POINT_LIGHT_SHADOWS ];
		struct PointLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
			float shadowCameraNear;
			float shadowCameraFar;
		};
		uniform PointLightShadow pointLightShadows[ NUM_POINT_LIGHT_SHADOWS ];
	#endif
#endif`,By=`#if ( defined( USE_SHADOWMAP ) && ( NUM_DIR_LIGHT_SHADOWS > 0 || NUM_POINT_LIGHT_SHADOWS > 0 ) ) || ( NUM_SPOT_LIGHT_COORDS > 0 )
	vec3 shadowWorldNormal = inverseTransformDirection( transformedNormal, viewMatrix );
	vec4 shadowWorldPosition;
#endif
#if defined( USE_SHADOWMAP )
	#if NUM_DIR_LIGHT_SHADOWS > 0
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_DIR_LIGHT_SHADOWS; i ++ ) {
			shadowWorldPosition = worldPosition + vec4( shadowWorldNormal * directionalLightShadows[ i ].shadowNormalBias, 0 );
			vDirectionalShadowCoord[ i ] = directionalShadowMatrix[ i ] * shadowWorldPosition;
		}
		#pragma unroll_loop_end
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_POINT_LIGHT_SHADOWS; i ++ ) {
			shadowWorldPosition = worldPosition + vec4( shadowWorldNormal * pointLightShadows[ i ].shadowNormalBias, 0 );
			vPointShadowCoord[ i ] = pointShadowMatrix[ i ] * shadowWorldPosition;
		}
		#pragma unroll_loop_end
	#endif
#endif
#if NUM_SPOT_LIGHT_COORDS > 0
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHT_COORDS; i ++ ) {
		shadowWorldPosition = worldPosition;
		#if ( defined( USE_SHADOWMAP ) && UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
			shadowWorldPosition.xyz += shadowWorldNormal * spotLightShadows[ i ].shadowNormalBias;
		#endif
		vSpotLightCoord[ i ] = spotLightMatrix[ i ] * shadowWorldPosition;
	}
	#pragma unroll_loop_end
#endif`,ky=`float getShadowMask() {
	float shadow = 1.0;
	#ifdef USE_SHADOWMAP
	#if NUM_DIR_LIGHT_SHADOWS > 0
	DirectionalLightShadow directionalLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_DIR_LIGHT_SHADOWS; i ++ ) {
		directionalLight = directionalLightShadows[ i ];
		shadow *= receiveShadow ? getShadow( directionalShadowMap[ i ], directionalLight.shadowMapSize, directionalLight.shadowIntensity, directionalLight.shadowBias, directionalLight.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
	SpotLightShadow spotLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHT_SHADOWS; i ++ ) {
		spotLight = spotLightShadows[ i ];
		shadow *= receiveShadow ? getShadow( spotShadowMap[ i ], spotLight.shadowMapSize, spotLight.shadowIntensity, spotLight.shadowBias, spotLight.shadowRadius, vSpotLightCoord[ i ] ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
	PointLightShadow pointLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_POINT_LIGHT_SHADOWS; i ++ ) {
		pointLight = pointLightShadows[ i ];
		shadow *= receiveShadow ? getPointShadow( pointShadowMap[ i ], pointLight.shadowMapSize, pointLight.shadowIntensity, pointLight.shadowBias, pointLight.shadowRadius, vPointShadowCoord[ i ], pointLight.shadowCameraNear, pointLight.shadowCameraFar ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#endif
	return shadow;
}`,zy=`#ifdef USE_SKINNING
	mat4 boneMatX = getBoneMatrix( skinIndex.x );
	mat4 boneMatY = getBoneMatrix( skinIndex.y );
	mat4 boneMatZ = getBoneMatrix( skinIndex.z );
	mat4 boneMatW = getBoneMatrix( skinIndex.w );
#endif`,Hy=`#ifdef USE_SKINNING
	uniform mat4 bindMatrix;
	uniform mat4 bindMatrixInverse;
	uniform highp sampler2D boneTexture;
	mat4 getBoneMatrix( const in float i ) {
		int size = textureSize( boneTexture, 0 ).x;
		int j = int( i ) * 4;
		int x = j % size;
		int y = j / size;
		vec4 v1 = texelFetch( boneTexture, ivec2( x, y ), 0 );
		vec4 v2 = texelFetch( boneTexture, ivec2( x + 1, y ), 0 );
		vec4 v3 = texelFetch( boneTexture, ivec2( x + 2, y ), 0 );
		vec4 v4 = texelFetch( boneTexture, ivec2( x + 3, y ), 0 );
		return mat4( v1, v2, v3, v4 );
	}
#endif`,Vy=`#ifdef USE_SKINNING
	vec4 skinVertex = bindMatrix * vec4( transformed, 1.0 );
	vec4 skinned = vec4( 0.0 );
	skinned += boneMatX * skinVertex * skinWeight.x;
	skinned += boneMatY * skinVertex * skinWeight.y;
	skinned += boneMatZ * skinVertex * skinWeight.z;
	skinned += boneMatW * skinVertex * skinWeight.w;
	transformed = ( bindMatrixInverse * skinned ).xyz;
#endif`,Gy=`#ifdef USE_SKINNING
	mat4 skinMatrix = mat4( 0.0 );
	skinMatrix += skinWeight.x * boneMatX;
	skinMatrix += skinWeight.y * boneMatY;
	skinMatrix += skinWeight.z * boneMatZ;
	skinMatrix += skinWeight.w * boneMatW;
	skinMatrix = bindMatrixInverse * skinMatrix * bindMatrix;
	objectNormal = vec4( skinMatrix * vec4( objectNormal, 0.0 ) ).xyz;
	#ifdef USE_TANGENT
		objectTangent = vec4( skinMatrix * vec4( objectTangent, 0.0 ) ).xyz;
	#endif
#endif`,Wy=`float specularStrength;
#ifdef USE_SPECULARMAP
	vec4 texelSpecular = texture2D( specularMap, vSpecularMapUv );
	specularStrength = texelSpecular.r;
#else
	specularStrength = 1.0;
#endif`,$y=`#ifdef USE_SPECULARMAP
	uniform sampler2D specularMap;
#endif`,Xy=`#if defined( TONE_MAPPING )
	gl_FragColor.rgb = toneMapping( gl_FragColor.rgb );
#endif`,qy=`#ifndef saturate
#define saturate( a ) clamp( a, 0.0, 1.0 )
#endif
uniform float toneMappingExposure;
vec3 LinearToneMapping( vec3 color ) {
	return saturate( toneMappingExposure * color );
}
vec3 ReinhardToneMapping( vec3 color ) {
	color *= toneMappingExposure;
	return saturate( color / ( vec3( 1.0 ) + color ) );
}
vec3 CineonToneMapping( vec3 color ) {
	color *= toneMappingExposure;
	color = max( vec3( 0.0 ), color - 0.004 );
	return pow( ( color * ( 6.2 * color + 0.5 ) ) / ( color * ( 6.2 * color + 1.7 ) + 0.06 ), vec3( 2.2 ) );
}
vec3 RRTAndODTFit( vec3 v ) {
	vec3 a = v * ( v + 0.0245786 ) - 0.000090537;
	vec3 b = v * ( 0.983729 * v + 0.4329510 ) + 0.238081;
	return a / b;
}
vec3 ACESFilmicToneMapping( vec3 color ) {
	const mat3 ACESInputMat = mat3(
		vec3( 0.59719, 0.07600, 0.02840 ),		vec3( 0.35458, 0.90834, 0.13383 ),
		vec3( 0.04823, 0.01566, 0.83777 )
	);
	const mat3 ACESOutputMat = mat3(
		vec3(  1.60475, -0.10208, -0.00327 ),		vec3( -0.53108,  1.10813, -0.07276 ),
		vec3( -0.07367, -0.00605,  1.07602 )
	);
	color *= toneMappingExposure / 0.6;
	color = ACESInputMat * color;
	color = RRTAndODTFit( color );
	color = ACESOutputMat * color;
	return saturate( color );
}
const mat3 LINEAR_REC2020_TO_LINEAR_SRGB = mat3(
	vec3( 1.6605, - 0.1246, - 0.0182 ),
	vec3( - 0.5876, 1.1329, - 0.1006 ),
	vec3( - 0.0728, - 0.0083, 1.1187 )
);
const mat3 LINEAR_SRGB_TO_LINEAR_REC2020 = mat3(
	vec3( 0.6274, 0.0691, 0.0164 ),
	vec3( 0.3293, 0.9195, 0.0880 ),
	vec3( 0.0433, 0.0113, 0.8956 )
);
vec3 agxDefaultContrastApprox( vec3 x ) {
	vec3 x2 = x * x;
	vec3 x4 = x2 * x2;
	return + 15.5 * x4 * x2
		- 40.14 * x4 * x
		+ 31.96 * x4
		- 6.868 * x2 * x
		+ 0.4298 * x2
		+ 0.1191 * x
		- 0.00232;
}
vec3 AgXToneMapping( vec3 color ) {
	const mat3 AgXInsetMatrix = mat3(
		vec3( 0.856627153315983, 0.137318972929847, 0.11189821299995 ),
		vec3( 0.0951212405381588, 0.761241990602591, 0.0767994186031903 ),
		vec3( 0.0482516061458583, 0.101439036467562, 0.811302368396859 )
	);
	const mat3 AgXOutsetMatrix = mat3(
		vec3( 1.1271005818144368, - 0.1413297634984383, - 0.14132976349843826 ),
		vec3( - 0.11060664309660323, 1.157823702216272, - 0.11060664309660294 ),
		vec3( - 0.016493938717834573, - 0.016493938717834257, 1.2519364065950405 )
	);
	const float AgxMinEv = - 12.47393;	const float AgxMaxEv = 4.026069;
	color *= toneMappingExposure;
	color = LINEAR_SRGB_TO_LINEAR_REC2020 * color;
	color = AgXInsetMatrix * color;
	color = max( color, 1e-10 );	color = log2( color );
	color = ( color - AgxMinEv ) / ( AgxMaxEv - AgxMinEv );
	color = clamp( color, 0.0, 1.0 );
	color = agxDefaultContrastApprox( color );
	color = AgXOutsetMatrix * color;
	color = pow( max( vec3( 0.0 ), color ), vec3( 2.2 ) );
	color = LINEAR_REC2020_TO_LINEAR_SRGB * color;
	color = clamp( color, 0.0, 1.0 );
	return color;
}
vec3 NeutralToneMapping( vec3 color ) {
	const float StartCompression = 0.8 - 0.04;
	const float Desaturation = 0.15;
	color *= toneMappingExposure;
	float x = min( color.r, min( color.g, color.b ) );
	float offset = x < 0.08 ? x - 6.25 * x * x : 0.04;
	color -= offset;
	float peak = max( color.r, max( color.g, color.b ) );
	if ( peak < StartCompression ) return color;
	float d = 1. - StartCompression;
	float newPeak = 1. - d * d / ( peak + d - StartCompression );
	color *= newPeak / peak;
	float g = 1. - 1. / ( Desaturation * ( peak - newPeak ) + 1. );
	return mix( color, vec3( newPeak ), g );
}
vec3 CustomToneMapping( vec3 color ) { return color; }`,jy=`#ifdef USE_TRANSMISSION
	material.transmission = transmission;
	material.transmissionAlpha = 1.0;
	material.thickness = thickness;
	material.attenuationDistance = attenuationDistance;
	material.attenuationColor = attenuationColor;
	#ifdef USE_TRANSMISSIONMAP
		material.transmission *= texture2D( transmissionMap, vTransmissionMapUv ).r;
	#endif
	#ifdef USE_THICKNESSMAP
		material.thickness *= texture2D( thicknessMap, vThicknessMapUv ).g;
	#endif
	vec3 pos = vWorldPosition;
	vec3 v = normalize( cameraPosition - pos );
	vec3 n = inverseTransformDirection( normal, viewMatrix );
	vec4 transmitted = getIBLVolumeRefraction(
		n, v, material.roughness, material.diffuseColor, material.specularColor, material.specularF90,
		pos, modelMatrix, viewMatrix, projectionMatrix, material.dispersion, material.ior, material.thickness,
		material.attenuationColor, material.attenuationDistance );
	material.transmissionAlpha = mix( material.transmissionAlpha, transmitted.a, material.transmission );
	totalDiffuse = mix( totalDiffuse, transmitted.rgb, material.transmission );
#endif`,Yy=`#ifdef USE_TRANSMISSION
	uniform float transmission;
	uniform float thickness;
	uniform float attenuationDistance;
	uniform vec3 attenuationColor;
	#ifdef USE_TRANSMISSIONMAP
		uniform sampler2D transmissionMap;
	#endif
	#ifdef USE_THICKNESSMAP
		uniform sampler2D thicknessMap;
	#endif
	uniform vec2 transmissionSamplerSize;
	uniform sampler2D transmissionSamplerMap;
	uniform mat4 modelMatrix;
	uniform mat4 projectionMatrix;
	varying vec3 vWorldPosition;
	float w0( float a ) {
		return ( 1.0 / 6.0 ) * ( a * ( a * ( - a + 3.0 ) - 3.0 ) + 1.0 );
	}
	float w1( float a ) {
		return ( 1.0 / 6.0 ) * ( a *  a * ( 3.0 * a - 6.0 ) + 4.0 );
	}
	float w2( float a ){
		return ( 1.0 / 6.0 ) * ( a * ( a * ( - 3.0 * a + 3.0 ) + 3.0 ) + 1.0 );
	}
	float w3( float a ) {
		return ( 1.0 / 6.0 ) * ( a * a * a );
	}
	float g0( float a ) {
		return w0( a ) + w1( a );
	}
	float g1( float a ) {
		return w2( a ) + w3( a );
	}
	float h0( float a ) {
		return - 1.0 + w1( a ) / ( w0( a ) + w1( a ) );
	}
	float h1( float a ) {
		return 1.0 + w3( a ) / ( w2( a ) + w3( a ) );
	}
	vec4 bicubic( sampler2D tex, vec2 uv, vec4 texelSize, float lod ) {
		uv = uv * texelSize.zw + 0.5;
		vec2 iuv = floor( uv );
		vec2 fuv = fract( uv );
		float g0x = g0( fuv.x );
		float g1x = g1( fuv.x );
		float h0x = h0( fuv.x );
		float h1x = h1( fuv.x );
		float h0y = h0( fuv.y );
		float h1y = h1( fuv.y );
		vec2 p0 = ( vec2( iuv.x + h0x, iuv.y + h0y ) - 0.5 ) * texelSize.xy;
		vec2 p1 = ( vec2( iuv.x + h1x, iuv.y + h0y ) - 0.5 ) * texelSize.xy;
		vec2 p2 = ( vec2( iuv.x + h0x, iuv.y + h1y ) - 0.5 ) * texelSize.xy;
		vec2 p3 = ( vec2( iuv.x + h1x, iuv.y + h1y ) - 0.5 ) * texelSize.xy;
		return g0( fuv.y ) * ( g0x * textureLod( tex, p0, lod ) + g1x * textureLod( tex, p1, lod ) ) +
			g1( fuv.y ) * ( g0x * textureLod( tex, p2, lod ) + g1x * textureLod( tex, p3, lod ) );
	}
	vec4 textureBicubic( sampler2D sampler, vec2 uv, float lod ) {
		vec2 fLodSize = vec2( textureSize( sampler, int( lod ) ) );
		vec2 cLodSize = vec2( textureSize( sampler, int( lod + 1.0 ) ) );
		vec2 fLodSizeInv = 1.0 / fLodSize;
		vec2 cLodSizeInv = 1.0 / cLodSize;
		vec4 fSample = bicubic( sampler, uv, vec4( fLodSizeInv, fLodSize ), floor( lod ) );
		vec4 cSample = bicubic( sampler, uv, vec4( cLodSizeInv, cLodSize ), ceil( lod ) );
		return mix( fSample, cSample, fract( lod ) );
	}
	vec3 getVolumeTransmissionRay( const in vec3 n, const in vec3 v, const in float thickness, const in float ior, const in mat4 modelMatrix ) {
		vec3 refractionVector = refract( - v, normalize( n ), 1.0 / ior );
		vec3 modelScale;
		modelScale.x = length( vec3( modelMatrix[ 0 ].xyz ) );
		modelScale.y = length( vec3( modelMatrix[ 1 ].xyz ) );
		modelScale.z = length( vec3( modelMatrix[ 2 ].xyz ) );
		return normalize( refractionVector ) * thickness * modelScale;
	}
	float applyIorToRoughness( const in float roughness, const in float ior ) {
		return roughness * clamp( ior * 2.0 - 2.0, 0.0, 1.0 );
	}
	vec4 getTransmissionSample( const in vec2 fragCoord, const in float roughness, const in float ior ) {
		float lod = log2( transmissionSamplerSize.x ) * applyIorToRoughness( roughness, ior );
		return textureBicubic( transmissionSamplerMap, fragCoord.xy, lod );
	}
	vec3 volumeAttenuation( const in float transmissionDistance, const in vec3 attenuationColor, const in float attenuationDistance ) {
		if ( isinf( attenuationDistance ) ) {
			return vec3( 1.0 );
		} else {
			vec3 attenuationCoefficient = -log( attenuationColor ) / attenuationDistance;
			vec3 transmittance = exp( - attenuationCoefficient * transmissionDistance );			return transmittance;
		}
	}
	vec4 getIBLVolumeRefraction( const in vec3 n, const in vec3 v, const in float roughness, const in vec3 diffuseColor,
		const in vec3 specularColor, const in float specularF90, const in vec3 position, const in mat4 modelMatrix,
		const in mat4 viewMatrix, const in mat4 projMatrix, const in float dispersion, const in float ior, const in float thickness,
		const in vec3 attenuationColor, const in float attenuationDistance ) {
		vec4 transmittedLight;
		vec3 transmittance;
		#ifdef USE_DISPERSION
			float halfSpread = ( ior - 1.0 ) * 0.025 * dispersion;
			vec3 iors = vec3( ior - halfSpread, ior, ior + halfSpread );
			for ( int i = 0; i < 3; i ++ ) {
				vec3 transmissionRay = getVolumeTransmissionRay( n, v, thickness, iors[ i ], modelMatrix );
				vec3 refractedRayExit = position + transmissionRay;
				vec4 ndcPos = projMatrix * viewMatrix * vec4( refractedRayExit, 1.0 );
				vec2 refractionCoords = ndcPos.xy / ndcPos.w;
				refractionCoords += 1.0;
				refractionCoords /= 2.0;
				vec4 transmissionSample = getTransmissionSample( refractionCoords, roughness, iors[ i ] );
				transmittedLight[ i ] = transmissionSample[ i ];
				transmittedLight.a += transmissionSample.a;
				transmittance[ i ] = diffuseColor[ i ] * volumeAttenuation( length( transmissionRay ), attenuationColor, attenuationDistance )[ i ];
			}
			transmittedLight.a /= 3.0;
		#else
			vec3 transmissionRay = getVolumeTransmissionRay( n, v, thickness, ior, modelMatrix );
			vec3 refractedRayExit = position + transmissionRay;
			vec4 ndcPos = projMatrix * viewMatrix * vec4( refractedRayExit, 1.0 );
			vec2 refractionCoords = ndcPos.xy / ndcPos.w;
			refractionCoords += 1.0;
			refractionCoords /= 2.0;
			transmittedLight = getTransmissionSample( refractionCoords, roughness, ior );
			transmittance = diffuseColor * volumeAttenuation( length( transmissionRay ), attenuationColor, attenuationDistance );
		#endif
		vec3 attenuatedColor = transmittance * transmittedLight.rgb;
		vec3 F = EnvironmentBRDF( n, v, specularColor, specularF90, roughness );
		float transmittanceFactor = ( transmittance.r + transmittance.g + transmittance.b ) / 3.0;
		return vec4( ( 1.0 - F ) * attenuatedColor, 1.0 - ( 1.0 - transmittedLight.a ) * transmittanceFactor );
	}
#endif`,Ky=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	varying vec2 vUv;
#endif
#ifdef USE_MAP
	varying vec2 vMapUv;
#endif
#ifdef USE_ALPHAMAP
	varying vec2 vAlphaMapUv;
#endif
#ifdef USE_LIGHTMAP
	varying vec2 vLightMapUv;
#endif
#ifdef USE_AOMAP
	varying vec2 vAoMapUv;
#endif
#ifdef USE_BUMPMAP
	varying vec2 vBumpMapUv;
#endif
#ifdef USE_NORMALMAP
	varying vec2 vNormalMapUv;
#endif
#ifdef USE_EMISSIVEMAP
	varying vec2 vEmissiveMapUv;
#endif
#ifdef USE_METALNESSMAP
	varying vec2 vMetalnessMapUv;
#endif
#ifdef USE_ROUGHNESSMAP
	varying vec2 vRoughnessMapUv;
#endif
#ifdef USE_ANISOTROPYMAP
	varying vec2 vAnisotropyMapUv;
#endif
#ifdef USE_CLEARCOATMAP
	varying vec2 vClearcoatMapUv;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	varying vec2 vClearcoatNormalMapUv;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	varying vec2 vClearcoatRoughnessMapUv;
#endif
#ifdef USE_IRIDESCENCEMAP
	varying vec2 vIridescenceMapUv;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	varying vec2 vIridescenceThicknessMapUv;
#endif
#ifdef USE_SHEEN_COLORMAP
	varying vec2 vSheenColorMapUv;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	varying vec2 vSheenRoughnessMapUv;
#endif
#ifdef USE_SPECULARMAP
	varying vec2 vSpecularMapUv;
#endif
#ifdef USE_SPECULAR_COLORMAP
	varying vec2 vSpecularColorMapUv;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	varying vec2 vSpecularIntensityMapUv;
#endif
#ifdef USE_TRANSMISSIONMAP
	uniform mat3 transmissionMapTransform;
	varying vec2 vTransmissionMapUv;
#endif
#ifdef USE_THICKNESSMAP
	uniform mat3 thicknessMapTransform;
	varying vec2 vThicknessMapUv;
#endif`,Zy=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	varying vec2 vUv;
#endif
#ifdef USE_MAP
	uniform mat3 mapTransform;
	varying vec2 vMapUv;
#endif
#ifdef USE_ALPHAMAP
	uniform mat3 alphaMapTransform;
	varying vec2 vAlphaMapUv;
#endif
#ifdef USE_LIGHTMAP
	uniform mat3 lightMapTransform;
	varying vec2 vLightMapUv;
#endif
#ifdef USE_AOMAP
	uniform mat3 aoMapTransform;
	varying vec2 vAoMapUv;
#endif
#ifdef USE_BUMPMAP
	uniform mat3 bumpMapTransform;
	varying vec2 vBumpMapUv;
#endif
#ifdef USE_NORMALMAP
	uniform mat3 normalMapTransform;
	varying vec2 vNormalMapUv;
#endif
#ifdef USE_DISPLACEMENTMAP
	uniform mat3 displacementMapTransform;
	varying vec2 vDisplacementMapUv;
#endif
#ifdef USE_EMISSIVEMAP
	uniform mat3 emissiveMapTransform;
	varying vec2 vEmissiveMapUv;
#endif
#ifdef USE_METALNESSMAP
	uniform mat3 metalnessMapTransform;
	varying vec2 vMetalnessMapUv;
#endif
#ifdef USE_ROUGHNESSMAP
	uniform mat3 roughnessMapTransform;
	varying vec2 vRoughnessMapUv;
#endif
#ifdef USE_ANISOTROPYMAP
	uniform mat3 anisotropyMapTransform;
	varying vec2 vAnisotropyMapUv;
#endif
#ifdef USE_CLEARCOATMAP
	uniform mat3 clearcoatMapTransform;
	varying vec2 vClearcoatMapUv;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform mat3 clearcoatNormalMapTransform;
	varying vec2 vClearcoatNormalMapUv;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform mat3 clearcoatRoughnessMapTransform;
	varying vec2 vClearcoatRoughnessMapUv;
#endif
#ifdef USE_SHEEN_COLORMAP
	uniform mat3 sheenColorMapTransform;
	varying vec2 vSheenColorMapUv;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	uniform mat3 sheenRoughnessMapTransform;
	varying vec2 vSheenRoughnessMapUv;
#endif
#ifdef USE_IRIDESCENCEMAP
	uniform mat3 iridescenceMapTransform;
	varying vec2 vIridescenceMapUv;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform mat3 iridescenceThicknessMapTransform;
	varying vec2 vIridescenceThicknessMapUv;
#endif
#ifdef USE_SPECULARMAP
	uniform mat3 specularMapTransform;
	varying vec2 vSpecularMapUv;
#endif
#ifdef USE_SPECULAR_COLORMAP
	uniform mat3 specularColorMapTransform;
	varying vec2 vSpecularColorMapUv;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	uniform mat3 specularIntensityMapTransform;
	varying vec2 vSpecularIntensityMapUv;
#endif
#ifdef USE_TRANSMISSIONMAP
	uniform mat3 transmissionMapTransform;
	varying vec2 vTransmissionMapUv;
#endif
#ifdef USE_THICKNESSMAP
	uniform mat3 thicknessMapTransform;
	varying vec2 vThicknessMapUv;
#endif`,Jy=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	vUv = vec3( uv, 1 ).xy;
#endif
#ifdef USE_MAP
	vMapUv = ( mapTransform * vec3( MAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ALPHAMAP
	vAlphaMapUv = ( alphaMapTransform * vec3( ALPHAMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_LIGHTMAP
	vLightMapUv = ( lightMapTransform * vec3( LIGHTMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_AOMAP
	vAoMapUv = ( aoMapTransform * vec3( AOMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_BUMPMAP
	vBumpMapUv = ( bumpMapTransform * vec3( BUMPMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_NORMALMAP
	vNormalMapUv = ( normalMapTransform * vec3( NORMALMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_DISPLACEMENTMAP
	vDisplacementMapUv = ( displacementMapTransform * vec3( DISPLACEMENTMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_EMISSIVEMAP
	vEmissiveMapUv = ( emissiveMapTransform * vec3( EMISSIVEMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_METALNESSMAP
	vMetalnessMapUv = ( metalnessMapTransform * vec3( METALNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ROUGHNESSMAP
	vRoughnessMapUv = ( roughnessMapTransform * vec3( ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ANISOTROPYMAP
	vAnisotropyMapUv = ( anisotropyMapTransform * vec3( ANISOTROPYMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOATMAP
	vClearcoatMapUv = ( clearcoatMapTransform * vec3( CLEARCOATMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	vClearcoatNormalMapUv = ( clearcoatNormalMapTransform * vec3( CLEARCOAT_NORMALMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	vClearcoatRoughnessMapUv = ( clearcoatRoughnessMapTransform * vec3( CLEARCOAT_ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_IRIDESCENCEMAP
	vIridescenceMapUv = ( iridescenceMapTransform * vec3( IRIDESCENCEMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	vIridescenceThicknessMapUv = ( iridescenceThicknessMapTransform * vec3( IRIDESCENCE_THICKNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SHEEN_COLORMAP
	vSheenColorMapUv = ( sheenColorMapTransform * vec3( SHEEN_COLORMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	vSheenRoughnessMapUv = ( sheenRoughnessMapTransform * vec3( SHEEN_ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULARMAP
	vSpecularMapUv = ( specularMapTransform * vec3( SPECULARMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULAR_COLORMAP
	vSpecularColorMapUv = ( specularColorMapTransform * vec3( SPECULAR_COLORMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	vSpecularIntensityMapUv = ( specularIntensityMapTransform * vec3( SPECULAR_INTENSITYMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_TRANSMISSIONMAP
	vTransmissionMapUv = ( transmissionMapTransform * vec3( TRANSMISSIONMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_THICKNESSMAP
	vThicknessMapUv = ( thicknessMapTransform * vec3( THICKNESSMAP_UV, 1 ) ).xy;
#endif`,Qy=`#if defined( USE_ENVMAP ) || defined( DISTANCE ) || defined ( USE_SHADOWMAP ) || defined ( USE_TRANSMISSION ) || NUM_SPOT_LIGHT_COORDS > 0
	vec4 worldPosition = vec4( transformed, 1.0 );
	#ifdef USE_BATCHING
		worldPosition = batchingMatrix * worldPosition;
	#endif
	#ifdef USE_INSTANCING
		worldPosition = instanceMatrix * worldPosition;
	#endif
	worldPosition = modelMatrix * worldPosition;
#endif`;const ex=`varying vec2 vUv;
uniform mat3 uvTransform;
void main() {
	vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	gl_Position = vec4( position.xy, 1.0, 1.0 );
}`,tx=`uniform sampler2D t2D;
uniform float backgroundIntensity;
varying vec2 vUv;
void main() {
	vec4 texColor = texture2D( t2D, vUv );
	#ifdef DECODE_VIDEO_TEXTURE
		texColor = vec4( mix( pow( texColor.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), texColor.rgb * 0.0773993808, vec3( lessThanEqual( texColor.rgb, vec3( 0.04045 ) ) ) ), texColor.w );
	#endif
	texColor.rgb *= backgroundIntensity;
	gl_FragColor = texColor;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,nx=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,ix=`#ifdef ENVMAP_TYPE_CUBE
	uniform samplerCube envMap;
#elif defined( ENVMAP_TYPE_CUBE_UV )
	uniform sampler2D envMap;
#endif
uniform float flipEnvMap;
uniform float backgroundBlurriness;
uniform float backgroundIntensity;
uniform mat3 backgroundRotation;
varying vec3 vWorldDirection;
#include <cube_uv_reflection_fragment>
void main() {
	#ifdef ENVMAP_TYPE_CUBE
		vec4 texColor = textureCube( envMap, backgroundRotation * vec3( flipEnvMap * vWorldDirection.x, vWorldDirection.yz ) );
	#elif defined( ENVMAP_TYPE_CUBE_UV )
		vec4 texColor = textureCubeUV( envMap, backgroundRotation * vWorldDirection, backgroundBlurriness );
	#else
		vec4 texColor = vec4( 0.0, 0.0, 0.0, 1.0 );
	#endif
	texColor.rgb *= backgroundIntensity;
	gl_FragColor = texColor;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,rx=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,sx=`uniform samplerCube tCube;
uniform float tFlip;
uniform float opacity;
varying vec3 vWorldDirection;
void main() {
	vec4 texColor = textureCube( tCube, vec3( tFlip * vWorldDirection.x, vWorldDirection.yz ) );
	gl_FragColor = texColor;
	gl_FragColor.a *= opacity;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,ax=`#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
varying vec2 vHighPrecisionZW;
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <skinbase_vertex>
	#include <morphinstance_vertex>
	#ifdef USE_DISPLACEMENTMAP
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vHighPrecisionZW = gl_Position.zw;
}`,ox=`#if DEPTH_PACKING == 3200
	uniform float opacity;
#endif
#include <common>
#include <packing>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
varying vec2 vHighPrecisionZW;
void main() {
	vec4 diffuseColor = vec4( 1.0 );
	#include <clipping_planes_fragment>
	#if DEPTH_PACKING == 3200
		diffuseColor.a = opacity;
	#endif
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <logdepthbuf_fragment>
	#ifdef USE_REVERSED_DEPTH_BUFFER
		float fragCoordZ = vHighPrecisionZW[ 0 ] / vHighPrecisionZW[ 1 ];
	#else
		float fragCoordZ = 0.5 * vHighPrecisionZW[ 0 ] / vHighPrecisionZW[ 1 ] + 0.5;
	#endif
	#if DEPTH_PACKING == 3200
		gl_FragColor = vec4( vec3( 1.0 - fragCoordZ ), opacity );
	#elif DEPTH_PACKING == 3201
		gl_FragColor = packDepthToRGBA( fragCoordZ );
	#elif DEPTH_PACKING == 3202
		gl_FragColor = vec4( packDepthToRGB( fragCoordZ ), 1.0 );
	#elif DEPTH_PACKING == 3203
		gl_FragColor = vec4( packDepthToRG( fragCoordZ ), 0.0, 1.0 );
	#endif
}`,cx=`#define DISTANCE
varying vec3 vWorldPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <skinbase_vertex>
	#include <morphinstance_vertex>
	#ifdef USE_DISPLACEMENTMAP
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <worldpos_vertex>
	#include <clipping_planes_vertex>
	vWorldPosition = worldPosition.xyz;
}`,lx=`#define DISTANCE
uniform vec3 referencePosition;
uniform float nearDistance;
uniform float farDistance;
varying vec3 vWorldPosition;
#include <common>
#include <packing>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <clipping_planes_pars_fragment>
void main () {
	vec4 diffuseColor = vec4( 1.0 );
	#include <clipping_planes_fragment>
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	float dist = length( vWorldPosition - referencePosition );
	dist = ( dist - nearDistance ) / ( farDistance - nearDistance );
	dist = saturate( dist );
	gl_FragColor = packDepthToRGBA( dist );
}`,ux=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
}`,dx=`uniform sampler2D tEquirect;
varying vec3 vWorldDirection;
#include <common>
void main() {
	vec3 direction = normalize( vWorldDirection );
	vec2 sampleUV = equirectUv( direction );
	gl_FragColor = texture2D( tEquirect, sampleUV );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,hx=`uniform float scale;
attribute float lineDistance;
varying float vLineDistance;
#include <common>
#include <uv_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	vLineDistance = scale * lineDistance;
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
}`,fx=`uniform vec3 diffuse;
uniform float opacity;
uniform float dashSize;
uniform float totalSize;
varying float vLineDistance;
#include <common>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	if ( mod( vLineDistance, totalSize ) > dashSize ) {
		discard;
	}
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,px=`#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#if defined ( USE_ENVMAP ) || defined ( USE_SKINNING )
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinbase_vertex>
		#include <skinnormal_vertex>
		#include <defaultnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <fog_vertex>
}`,mx=`uniform vec3 diffuse;
uniform float opacity;
#ifndef FLAT_SHADED
	varying vec3 vNormal;
#endif
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <fog_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	#ifdef USE_LIGHTMAP
		vec4 lightMapTexel = texture2D( lightMap, vLightMapUv );
		reflectedLight.indirectDiffuse += lightMapTexel.rgb * lightMapIntensity * RECIPROCAL_PI;
	#else
		reflectedLight.indirectDiffuse += vec3( 1.0 );
	#endif
	#include <aomap_fragment>
	reflectedLight.indirectDiffuse *= diffuseColor.rgb;
	vec3 outgoingLight = reflectedLight.indirectDiffuse;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,gx=`#define LAMBERT
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,vx=`#define LAMBERT
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float opacity;
#include <common>
#include <packing>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_lambert_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_lambert_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,_x=`#define MATCAP
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <color_pars_vertex>
#include <displacementmap_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
	vViewPosition = - mvPosition.xyz;
}`,yx=`#define MATCAP
uniform vec3 diffuse;
uniform float opacity;
uniform sampler2D matcap;
varying vec3 vViewPosition;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <normal_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	vec3 viewDir = normalize( vViewPosition );
	vec3 x = normalize( vec3( viewDir.z, 0.0, - viewDir.x ) );
	vec3 y = cross( viewDir, x );
	vec2 uv = vec2( dot( x, normal ), dot( y, normal ) ) * 0.495 + 0.5;
	#ifdef USE_MATCAP
		vec4 matcapColor = texture2D( matcap, uv );
	#else
		vec4 matcapColor = vec4( vec3( mix( 0.2, 0.8, uv.y ) ), 1.0 );
	#endif
	vec3 outgoingLight = diffuseColor.rgb * matcapColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,xx=`#define NORMAL
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	varying vec3 vViewPosition;
#endif
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	vViewPosition = - mvPosition.xyz;
#endif
}`,Mx=`#define NORMAL
uniform float opacity;
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	varying vec3 vViewPosition;
#endif
#include <packing>
#include <uv_pars_fragment>
#include <normal_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( 0.0, 0.0, 0.0, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	gl_FragColor = vec4( packNormalToRGB( normal ), diffuseColor.a );
	#ifdef OPAQUE
		gl_FragColor.a = 1.0;
	#endif
}`,Sx=`#define PHONG
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,bx=`#define PHONG
uniform vec3 diffuse;
uniform vec3 emissive;
uniform vec3 specular;
uniform float shininess;
uniform float opacity;
#include <common>
#include <packing>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_phong_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_phong_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + reflectedLight.directSpecular + reflectedLight.indirectSpecular + totalEmissiveRadiance;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,wx=`#define STANDARD
varying vec3 vViewPosition;
#ifdef USE_TRANSMISSION
	varying vec3 vWorldPosition;
#endif
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
#ifdef USE_TRANSMISSION
	vWorldPosition = worldPosition.xyz;
#endif
}`,Ex=`#define STANDARD
#ifdef PHYSICAL
	#define IOR
	#define USE_SPECULAR
#endif
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float roughness;
uniform float metalness;
uniform float opacity;
#ifdef IOR
	uniform float ior;
#endif
#ifdef USE_SPECULAR
	uniform float specularIntensity;
	uniform vec3 specularColor;
	#ifdef USE_SPECULAR_COLORMAP
		uniform sampler2D specularColorMap;
	#endif
	#ifdef USE_SPECULAR_INTENSITYMAP
		uniform sampler2D specularIntensityMap;
	#endif
#endif
#ifdef USE_CLEARCOAT
	uniform float clearcoat;
	uniform float clearcoatRoughness;
#endif
#ifdef USE_DISPERSION
	uniform float dispersion;
#endif
#ifdef USE_IRIDESCENCE
	uniform float iridescence;
	uniform float iridescenceIOR;
	uniform float iridescenceThicknessMinimum;
	uniform float iridescenceThicknessMaximum;
#endif
#ifdef USE_SHEEN
	uniform vec3 sheenColor;
	uniform float sheenRoughness;
	#ifdef USE_SHEEN_COLORMAP
		uniform sampler2D sheenColorMap;
	#endif
	#ifdef USE_SHEEN_ROUGHNESSMAP
		uniform sampler2D sheenRoughnessMap;
	#endif
#endif
#ifdef USE_ANISOTROPY
	uniform vec2 anisotropyVector;
	#ifdef USE_ANISOTROPYMAP
		uniform sampler2D anisotropyMap;
	#endif
#endif
varying vec3 vViewPosition;
#include <common>
#include <packing>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <iridescence_fragment>
#include <cube_uv_reflection_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_physical_pars_fragment>
#include <fog_pars_fragment>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_physical_pars_fragment>
#include <transmission_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <clearcoat_pars_fragment>
#include <iridescence_pars_fragment>
#include <roughnessmap_pars_fragment>
#include <metalnessmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <roughnessmap_fragment>
	#include <metalnessmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <clearcoat_normal_fragment_begin>
	#include <clearcoat_normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_physical_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 totalDiffuse = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse;
	vec3 totalSpecular = reflectedLight.directSpecular + reflectedLight.indirectSpecular;
	#include <transmission_fragment>
	vec3 outgoingLight = totalDiffuse + totalSpecular + totalEmissiveRadiance;
	#ifdef USE_SHEEN
		float sheenEnergyComp = 1.0 - 0.157 * max3( material.sheenColor );
		outgoingLight = outgoingLight * sheenEnergyComp + sheenSpecularDirect + sheenSpecularIndirect;
	#endif
	#ifdef USE_CLEARCOAT
		float dotNVcc = saturate( dot( geometryClearcoatNormal, geometryViewDir ) );
		vec3 Fcc = F_Schlick( material.clearcoatF0, material.clearcoatF90, dotNVcc );
		outgoingLight = outgoingLight * ( 1.0 - material.clearcoat * Fcc ) + ( clearcoatSpecularDirect + clearcoatSpecularIndirect ) * material.clearcoat;
	#endif
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,Tx=`#define TOON
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,Ax=`#define TOON
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float opacity;
#include <common>
#include <packing>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <gradientmap_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_toon_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_toon_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,Rx=`uniform float size;
uniform float scale;
#include <common>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
#ifdef USE_POINTS_UV
	varying vec2 vUv;
	uniform mat3 uvTransform;
#endif
void main() {
	#ifdef USE_POINTS_UV
		vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	#endif
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <project_vertex>
	gl_PointSize = size;
	#ifdef USE_SIZEATTENUATION
		bool isPerspective = isPerspectiveMatrix( projectionMatrix );
		if ( isPerspective ) gl_PointSize *= ( scale / - mvPosition.z );
	#endif
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <worldpos_vertex>
	#include <fog_vertex>
}`,Cx=`uniform vec3 diffuse;
uniform float opacity;
#include <common>
#include <color_pars_fragment>
#include <map_particle_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_particle_fragment>
	#include <color_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,Lx=`#include <common>
#include <batching_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <shadowmap_pars_vertex>
void main() {
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,Px=`uniform vec3 color;
uniform float opacity;
#include <common>
#include <packing>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <logdepthbuf_pars_fragment>
#include <shadowmap_pars_fragment>
#include <shadowmask_pars_fragment>
void main() {
	#include <logdepthbuf_fragment>
	gl_FragColor = vec4( color, opacity * ( 1.0 - getShadowMask() ) );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
}`,Ix=`uniform float rotation;
uniform vec2 center;
#include <common>
#include <uv_pars_vertex>
#include <fog_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	vec4 mvPosition = modelViewMatrix[ 3 ];
	vec2 scale = vec2( length( modelMatrix[ 0 ].xyz ), length( modelMatrix[ 1 ].xyz ) );
	#ifndef USE_SIZEATTENUATION
		bool isPerspective = isPerspectiveMatrix( projectionMatrix );
		if ( isPerspective ) scale *= - mvPosition.z;
	#endif
	vec2 alignedPosition = ( position.xy - ( center - vec2( 0.5 ) ) ) * scale;
	vec2 rotatedPosition;
	rotatedPosition.x = cos( rotation ) * alignedPosition.x - sin( rotation ) * alignedPosition.y;
	rotatedPosition.y = sin( rotation ) * alignedPosition.x + cos( rotation ) * alignedPosition.y;
	mvPosition.xy += rotatedPosition;
	gl_Position = projectionMatrix * mvPosition;
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
}`,Dx=`uniform vec3 diffuse;
uniform float opacity;
#include <common>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
}`,et={alphahash_fragment:t_,alphahash_pars_fragment:n_,alphamap_fragment:i_,alphamap_pars_fragment:r_,alphatest_fragment:s_,alphatest_pars_fragment:a_,aomap_fragment:o_,aomap_pars_fragment:c_,batching_pars_vertex:l_,batching_vertex:u_,begin_vertex:d_,beginnormal_vertex:h_,bsdfs:f_,iridescence_fragment:p_,bumpmap_pars_fragment:m_,clipping_planes_fragment:g_,clipping_planes_pars_fragment:v_,clipping_planes_pars_vertex:__,clipping_planes_vertex:y_,color_fragment:x_,color_pars_fragment:M_,color_pars_vertex:S_,color_vertex:b_,common:w_,cube_uv_reflection_fragment:E_,defaultnormal_vertex:T_,displacementmap_pars_vertex:A_,displacementmap_vertex:R_,emissivemap_fragment:C_,emissivemap_pars_fragment:L_,colorspace_fragment:P_,colorspace_pars_fragment:I_,envmap_fragment:D_,envmap_common_pars_fragment:N_,envmap_pars_fragment:U_,envmap_pars_vertex:F_,envmap_physical_pars_fragment:q_,envmap_vertex:O_,fog_vertex:B_,fog_pars_vertex:k_,fog_fragment:z_,fog_pars_fragment:H_,gradientmap_pars_fragment:V_,lightmap_pars_fragment:G_,lights_lambert_fragment:W_,lights_lambert_pars_fragment:$_,lights_pars_begin:X_,lights_toon_fragment:j_,lights_toon_pars_fragment:Y_,lights_phong_fragment:K_,lights_phong_pars_fragment:Z_,lights_physical_fragment:J_,lights_physical_pars_fragment:Q_,lights_fragment_begin:ey,lights_fragment_maps:ty,lights_fragment_end:ny,logdepthbuf_fragment:iy,logdepthbuf_pars_fragment:ry,logdepthbuf_pars_vertex:sy,logdepthbuf_vertex:ay,map_fragment:oy,map_pars_fragment:cy,map_particle_fragment:ly,map_particle_pars_fragment:uy,metalnessmap_fragment:dy,metalnessmap_pars_fragment:hy,morphinstance_vertex:fy,morphcolor_vertex:py,morphnormal_vertex:my,morphtarget_pars_vertex:gy,morphtarget_vertex:vy,normal_fragment_begin:_y,normal_fragment_maps:yy,normal_pars_fragment:xy,normal_pars_vertex:My,normal_vertex:Sy,normalmap_pars_fragment:by,clearcoat_normal_fragment_begin:wy,clearcoat_normal_fragment_maps:Ey,clearcoat_pars_fragment:Ty,iridescence_pars_fragment:Ay,opaque_fragment:Ry,packing:Cy,premultiplied_alpha_fragment:Ly,project_vertex:Py,dithering_fragment:Iy,dithering_pars_fragment:Dy,roughnessmap_fragment:Ny,roughnessmap_pars_fragment:Uy,shadowmap_pars_fragment:Fy,shadowmap_pars_vertex:Oy,shadowmap_vertex:By,shadowmask_pars_fragment:ky,skinbase_vertex:zy,skinning_pars_vertex:Hy,skinning_vertex:Vy,skinnormal_vertex:Gy,specularmap_fragment:Wy,specularmap_pars_fragment:$y,tonemapping_fragment:Xy,tonemapping_pars_fragment:qy,transmission_fragment:jy,transmission_pars_fragment:Yy,uv_pars_fragment:Ky,uv_pars_vertex:Zy,uv_vertex:Jy,worldpos_vertex:Qy,background_vert:ex,background_frag:tx,backgroundCube_vert:nx,backgroundCube_frag:ix,cube_vert:rx,cube_frag:sx,depth_vert:ax,depth_frag:ox,distanceRGBA_vert:cx,distanceRGBA_frag:lx,equirect_vert:ux,equirect_frag:dx,linedashed_vert:hx,linedashed_frag:fx,meshbasic_vert:px,meshbasic_frag:mx,meshlambert_vert:gx,meshlambert_frag:vx,meshmatcap_vert:_x,meshmatcap_frag:yx,meshnormal_vert:xx,meshnormal_frag:Mx,meshphong_vert:Sx,meshphong_frag:bx,meshphysical_vert:wx,meshphysical_frag:Ex,meshtoon_vert:Tx,meshtoon_frag:Ax,points_vert:Rx,points_frag:Cx,shadow_vert:Lx,shadow_frag:Px,sprite_vert:Ix,sprite_frag:Dx},pe={common:{diffuse:{value:new We(16777215)},opacity:{value:1},map:{value:null},mapTransform:{value:new Qe},alphaMap:{value:null},alphaMapTransform:{value:new Qe},alphaTest:{value:0}},specularmap:{specularMap:{value:null},specularMapTransform:{value:new Qe}},envmap:{envMap:{value:null},envMapRotation:{value:new Qe},flipEnvMap:{value:-1},reflectivity:{value:1},ior:{value:1.5},refractionRatio:{value:.98}},aomap:{aoMap:{value:null},aoMapIntensity:{value:1},aoMapTransform:{value:new Qe}},lightmap:{lightMap:{value:null},lightMapIntensity:{value:1},lightMapTransform:{value:new Qe}},bumpmap:{bumpMap:{value:null},bumpMapTransform:{value:new Qe},bumpScale:{value:1}},normalmap:{normalMap:{value:null},normalMapTransform:{value:new Qe},normalScale:{value:new ue(1,1)}},displacementmap:{displacementMap:{value:null},displacementMapTransform:{value:new Qe},displacementScale:{value:1},displacementBias:{value:0}},emissivemap:{emissiveMap:{value:null},emissiveMapTransform:{value:new Qe}},metalnessmap:{metalnessMap:{value:null},metalnessMapTransform:{value:new Qe}},roughnessmap:{roughnessMap:{value:null},roughnessMapTransform:{value:new Qe}},gradientmap:{gradientMap:{value:null}},fog:{fogDensity:{value:25e-5},fogNear:{value:1},fogFar:{value:2e3},fogColor:{value:new We(16777215)}},lights:{ambientLightColor:{value:[]},lightProbe:{value:[]},directionalLights:{value:[],properties:{direction:{},color:{}}},directionalLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},directionalShadowMap:{value:[]},directionalShadowMatrix:{value:[]},spotLights:{value:[],properties:{color:{},position:{},direction:{},distance:{},coneCos:{},penumbraCos:{},decay:{}}},spotLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},spotLightMap:{value:[]},spotShadowMap:{value:[]},spotLightMatrix:{value:[]},pointLights:{value:[],properties:{color:{},position:{},decay:{},distance:{}}},pointLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{},shadowCameraNear:{},shadowCameraFar:{}}},pointShadowMap:{value:[]},pointShadowMatrix:{value:[]},hemisphereLights:{value:[],properties:{direction:{},skyColor:{},groundColor:{}}},rectAreaLights:{value:[],properties:{color:{},position:{},width:{},height:{}}},ltc_1:{value:null},ltc_2:{value:null}},points:{diffuse:{value:new We(16777215)},opacity:{value:1},size:{value:1},scale:{value:1},map:{value:null},alphaMap:{value:null},alphaMapTransform:{value:new Qe},alphaTest:{value:0},uvTransform:{value:new Qe}},sprite:{diffuse:{value:new We(16777215)},opacity:{value:1},center:{value:new ue(.5,.5)},rotation:{value:0},map:{value:null},mapTransform:{value:new Qe},alphaMap:{value:null},alphaMapTransform:{value:new Qe},alphaTest:{value:0}}},ti={basic:{uniforms:an([pe.common,pe.specularmap,pe.envmap,pe.aomap,pe.lightmap,pe.fog]),vertexShader:et.meshbasic_vert,fragmentShader:et.meshbasic_frag},lambert:{uniforms:an([pe.common,pe.specularmap,pe.envmap,pe.aomap,pe.lightmap,pe.emissivemap,pe.bumpmap,pe.normalmap,pe.displacementmap,pe.fog,pe.lights,{emissive:{value:new We(0)}}]),vertexShader:et.meshlambert_vert,fragmentShader:et.meshlambert_frag},phong:{uniforms:an([pe.common,pe.specularmap,pe.envmap,pe.aomap,pe.lightmap,pe.emissivemap,pe.bumpmap,pe.normalmap,pe.displacementmap,pe.fog,pe.lights,{emissive:{value:new We(0)},specular:{value:new We(1118481)},shininess:{value:30}}]),vertexShader:et.meshphong_vert,fragmentShader:et.meshphong_frag},standard:{uniforms:an([pe.common,pe.envmap,pe.aomap,pe.lightmap,pe.emissivemap,pe.bumpmap,pe.normalmap,pe.displacementmap,pe.roughnessmap,pe.metalnessmap,pe.fog,pe.lights,{emissive:{value:new We(0)},roughness:{value:1},metalness:{value:0},envMapIntensity:{value:1}}]),vertexShader:et.meshphysical_vert,fragmentShader:et.meshphysical_frag},toon:{uniforms:an([pe.common,pe.aomap,pe.lightmap,pe.emissivemap,pe.bumpmap,pe.normalmap,pe.displacementmap,pe.gradientmap,pe.fog,pe.lights,{emissive:{value:new We(0)}}]),vertexShader:et.meshtoon_vert,fragmentShader:et.meshtoon_frag},matcap:{uniforms:an([pe.common,pe.bumpmap,pe.normalmap,pe.displacementmap,pe.fog,{matcap:{value:null}}]),vertexShader:et.meshmatcap_vert,fragmentShader:et.meshmatcap_frag},points:{uniforms:an([pe.points,pe.fog]),vertexShader:et.points_vert,fragmentShader:et.points_frag},dashed:{uniforms:an([pe.common,pe.fog,{scale:{value:1},dashSize:{value:1},totalSize:{value:2}}]),vertexShader:et.linedashed_vert,fragmentShader:et.linedashed_frag},depth:{uniforms:an([pe.common,pe.displacementmap]),vertexShader:et.depth_vert,fragmentShader:et.depth_frag},normal:{uniforms:an([pe.common,pe.bumpmap,pe.normalmap,pe.displacementmap,{opacity:{value:1}}]),vertexShader:et.meshnormal_vert,fragmentShader:et.meshnormal_frag},sprite:{uniforms:an([pe.sprite,pe.fog]),vertexShader:et.sprite_vert,fragmentShader:et.sprite_frag},background:{uniforms:{uvTransform:{value:new Qe},t2D:{value:null},backgroundIntensity:{value:1}},vertexShader:et.background_vert,fragmentShader:et.background_frag},backgroundCube:{uniforms:{envMap:{value:null},flipEnvMap:{value:-1},backgroundBlurriness:{value:0},backgroundIntensity:{value:1},backgroundRotation:{value:new Qe}},vertexShader:et.backgroundCube_vert,fragmentShader:et.backgroundCube_frag},cube:{uniforms:{tCube:{value:null},tFlip:{value:-1},opacity:{value:1}},vertexShader:et.cube_vert,fragmentShader:et.cube_frag},equirect:{uniforms:{tEquirect:{value:null}},vertexShader:et.equirect_vert,fragmentShader:et.equirect_frag},distanceRGBA:{uniforms:an([pe.common,pe.displacementmap,{referencePosition:{value:new P},nearDistance:{value:1},farDistance:{value:1e3}}]),vertexShader:et.distanceRGBA_vert,fragmentShader:et.distanceRGBA_frag},shadow:{uniforms:an([pe.lights,pe.fog,{color:{value:new We(0)},opacity:{value:1}}]),vertexShader:et.shadow_vert,fragmentShader:et.shadow_frag}};ti.physical={uniforms:an([ti.standard.uniforms,{clearcoat:{value:0},clearcoatMap:{value:null},clearcoatMapTransform:{value:new Qe},clearcoatNormalMap:{value:null},clearcoatNormalMapTransform:{value:new Qe},clearcoatNormalScale:{value:new ue(1,1)},clearcoatRoughness:{value:0},clearcoatRoughnessMap:{value:null},clearcoatRoughnessMapTransform:{value:new Qe},dispersion:{value:0},iridescence:{value:0},iridescenceMap:{value:null},iridescenceMapTransform:{value:new Qe},iridescenceIOR:{value:1.3},iridescenceThicknessMinimum:{value:100},iridescenceThicknessMaximum:{value:400},iridescenceThicknessMap:{value:null},iridescenceThicknessMapTransform:{value:new Qe},sheen:{value:0},sheenColor:{value:new We(0)},sheenColorMap:{value:null},sheenColorMapTransform:{value:new Qe},sheenRoughness:{value:1},sheenRoughnessMap:{value:null},sheenRoughnessMapTransform:{value:new Qe},transmission:{value:0},transmissionMap:{value:null},transmissionMapTransform:{value:new Qe},transmissionSamplerSize:{value:new ue},transmissionSamplerMap:{value:null},thickness:{value:0},thicknessMap:{value:null},thicknessMapTransform:{value:new Qe},attenuationDistance:{value:0},attenuationColor:{value:new We(0)},specularColor:{value:new We(1,1,1)},specularColorMap:{value:null},specularColorMapTransform:{value:new Qe},specularIntensity:{value:1},specularIntensityMap:{value:null},specularIntensityMapTransform:{value:new Qe},anisotropyVector:{value:new ue},anisotropyMap:{value:null},anisotropyMapTransform:{value:new Qe}}]),vertexShader:et.meshphysical_vert,fragmentShader:et.meshphysical_frag};const eo={r:0,b:0,g:0},ar=new qn,Nx=new Ke;function Ux(i,e,t,n,r,s,a){const o=new We(0);let c=s===!0?0:1,l,u,d=null,f=0,h=null;function m(y){let x=y.isScene===!0?y.background:null;return x&&x.isTexture&&(x=(y.backgroundBlurriness>0?t:e).get(x)),x}function v(y){let x=!1;const A=m(y);A===null?p(o,c):A&&A.isColor&&(p(A,1),x=!0);const w=i.xr.getEnvironmentBlendMode();w==="additive"?n.buffers.color.setClear(0,0,0,1,a):w==="alpha-blend"&&n.buffers.color.setClear(0,0,0,0,a),(i.autoClear||x)&&(n.buffers.depth.setTest(!0),n.buffers.depth.setMask(!0),n.buffers.color.setMask(!0),i.clear(i.autoClearColor,i.autoClearDepth,i.autoClearStencil))}function g(y,x){const A=m(x);A&&(A.isCubeTexture||A.mapping===Do)?(u===void 0&&(u=new Tt(new xr(1,1,1),new ji({name:"BackgroundCubeMaterial",uniforms:as(ti.backgroundCube.uniforms),vertexShader:ti.backgroundCube.vertexShader,fragmentShader:ti.backgroundCube.fragmentShader,side:un,depthTest:!1,depthWrite:!1,fog:!1,allowOverride:!1})),u.geometry.deleteAttribute("normal"),u.geometry.deleteAttribute("uv"),u.onBeforeRender=function(w,R,C){this.matrixWorld.copyPosition(C.matrixWorld)},Object.defineProperty(u.material,"envMap",{get:function(){return this.uniforms.envMap.value}}),r.update(u)),ar.copy(x.backgroundRotation),ar.x*=-1,ar.y*=-1,ar.z*=-1,A.isCubeTexture&&A.isRenderTargetTexture===!1&&(ar.y*=-1,ar.z*=-1),u.material.uniforms.envMap.value=A,u.material.uniforms.flipEnvMap.value=A.isCubeTexture&&A.isRenderTargetTexture===!1?-1:1,u.material.uniforms.backgroundBlurriness.value=x.backgroundBlurriness,u.material.uniforms.backgroundIntensity.value=x.backgroundIntensity,u.material.uniforms.backgroundRotation.value.setFromMatrix4(Nx.makeRotationFromEuler(ar)),u.material.toneMapped=at.getTransfer(A.colorSpace)!==_t,(d!==A||f!==A.version||h!==i.toneMapping)&&(u.material.needsUpdate=!0,d=A,f=A.version,h=i.toneMapping),u.layers.enableAll(),y.unshift(u,u.geometry,u.material,0,0,null)):A&&A.isTexture&&(l===void 0&&(l=new Tt(new Bo(2,2),new ji({name:"BackgroundMaterial",uniforms:as(ti.background.uniforms),vertexShader:ti.background.vertexShader,fragmentShader:ti.background.fragmentShader,side:Ci,depthTest:!1,depthWrite:!1,fog:!1,allowOverride:!1})),l.geometry.deleteAttribute("normal"),Object.defineProperty(l.material,"map",{get:function(){return this.uniforms.t2D.value}}),r.update(l)),l.material.uniforms.t2D.value=A,l.material.uniforms.backgroundIntensity.value=x.backgroundIntensity,l.material.toneMapped=at.getTransfer(A.colorSpace)!==_t,A.matrixAutoUpdate===!0&&A.updateMatrix(),l.material.uniforms.uvTransform.value.copy(A.matrix),(d!==A||f!==A.version||h!==i.toneMapping)&&(l.material.needsUpdate=!0,d=A,f=A.version,h=i.toneMapping),l.layers.enableAll(),y.unshift(l,l.geometry,l.material,0,0,null))}function p(y,x){y.getRGB(eo,kf(i)),n.buffers.color.setClear(eo.r,eo.g,eo.b,x,a)}function _(){u!==void 0&&(u.geometry.dispose(),u.material.dispose(),u=void 0),l!==void 0&&(l.geometry.dispose(),l.material.dispose(),l=void 0)}return{getClearColor:function(){return o},setClearColor:function(y,x=1){o.set(y),c=x,p(o,c)},getClearAlpha:function(){return c},setClearAlpha:function(y){c=y,p(o,c)},render:v,addToRenderList:g,dispose:_}}function Fx(i,e){const t=i.getParameter(i.MAX_VERTEX_ATTRIBS),n={},r=f(null);let s=r,a=!1;function o(b,L,D,k,H){let X=!1;const V=d(k,D,L);s!==V&&(s=V,l(s.object)),X=h(b,k,D,H),X&&m(b,k,D,H),H!==null&&e.update(H,i.ELEMENT_ARRAY_BUFFER),(X||a)&&(a=!1,x(b,L,D,k),H!==null&&i.bindBuffer(i.ELEMENT_ARRAY_BUFFER,e.get(H).buffer))}function c(){return i.createVertexArray()}function l(b){return i.bindVertexArray(b)}function u(b){return i.deleteVertexArray(b)}function d(b,L,D){const k=D.wireframe===!0;let H=n[b.id];H===void 0&&(H={},n[b.id]=H);let X=H[L.id];X===void 0&&(X={},H[L.id]=X);let V=X[k];return V===void 0&&(V=f(c()),X[k]=V),V}function f(b){const L=[],D=[],k=[];for(let H=0;H<t;H++)L[H]=0,D[H]=0,k[H]=0;return{geometry:null,program:null,wireframe:!1,newAttributes:L,enabledAttributes:D,attributeDivisors:k,object:b,attributes:{},index:null}}function h(b,L,D,k){const H=s.attributes,X=L.attributes;let V=0;const K=D.getAttributes();for(const G in K)if(K[G].location>=0){const me=H[G];let _e=X[G];if(_e===void 0&&(G==="instanceMatrix"&&b.instanceMatrix&&(_e=b.instanceMatrix),G==="instanceColor"&&b.instanceColor&&(_e=b.instanceColor)),me===void 0||me.attribute!==_e||_e&&me.data!==_e.data)return!0;V++}return s.attributesNum!==V||s.index!==k}function m(b,L,D,k){const H={},X=L.attributes;let V=0;const K=D.getAttributes();for(const G in K)if(K[G].location>=0){let me=X[G];me===void 0&&(G==="instanceMatrix"&&b.instanceMatrix&&(me=b.instanceMatrix),G==="instanceColor"&&b.instanceColor&&(me=b.instanceColor));const _e={};_e.attribute=me,me&&me.data&&(_e.data=me.data),H[G]=_e,V++}s.attributes=H,s.attributesNum=V,s.index=k}function v(){const b=s.newAttributes;for(let L=0,D=b.length;L<D;L++)b[L]=0}function g(b){p(b,0)}function p(b,L){const D=s.newAttributes,k=s.enabledAttributes,H=s.attributeDivisors;D[b]=1,k[b]===0&&(i.enableVertexAttribArray(b),k[b]=1),H[b]!==L&&(i.vertexAttribDivisor(b,L),H[b]=L)}function _(){const b=s.newAttributes,L=s.enabledAttributes;for(let D=0,k=L.length;D<k;D++)L[D]!==b[D]&&(i.disableVertexAttribArray(D),L[D]=0)}function y(b,L,D,k,H,X,V){V===!0?i.vertexAttribIPointer(b,L,D,H,X):i.vertexAttribPointer(b,L,D,k,H,X)}function x(b,L,D,k){v();const H=k.attributes,X=D.getAttributes(),V=L.defaultAttributeValues;for(const K in X){const G=X[K];if(G.location>=0){let se=H[K];if(se===void 0&&(K==="instanceMatrix"&&b.instanceMatrix&&(se=b.instanceMatrix),K==="instanceColor"&&b.instanceColor&&(se=b.instanceColor)),se!==void 0){const me=se.normalized,_e=se.itemSize,Be=e.get(se);if(Be===void 0)continue;const lt=Be.buffer,$e=Be.type,st=Be.bytesPerElement,Y=$e===i.INT||$e===i.UNSIGNED_INT||se.gpuType===xu;if(se.isInterleavedBufferAttribute){const ee=se.data,Me=ee.stride,De=se.offset;if(ee.isInstancedInterleavedBuffer){for(let be=0;be<G.locationSize;be++)p(G.location+be,ee.meshPerAttribute);b.isInstancedMesh!==!0&&k._maxInstanceCount===void 0&&(k._maxInstanceCount=ee.meshPerAttribute*ee.count)}else for(let be=0;be<G.locationSize;be++)g(G.location+be);i.bindBuffer(i.ARRAY_BUFFER,lt);for(let be=0;be<G.locationSize;be++)y(G.location+be,_e/G.locationSize,$e,me,Me*st,(De+_e/G.locationSize*be)*st,Y)}else{if(se.isInstancedBufferAttribute){for(let ee=0;ee<G.locationSize;ee++)p(G.location+ee,se.meshPerAttribute);b.isInstancedMesh!==!0&&k._maxInstanceCount===void 0&&(k._maxInstanceCount=se.meshPerAttribute*se.count)}else for(let ee=0;ee<G.locationSize;ee++)g(G.location+ee);i.bindBuffer(i.ARRAY_BUFFER,lt);for(let ee=0;ee<G.locationSize;ee++)y(G.location+ee,_e/G.locationSize,$e,me,_e*st,_e/G.locationSize*ee*st,Y)}}else if(V!==void 0){const me=V[K];if(me!==void 0)switch(me.length){case 2:i.vertexAttrib2fv(G.location,me);break;case 3:i.vertexAttrib3fv(G.location,me);break;case 4:i.vertexAttrib4fv(G.location,me);break;default:i.vertexAttrib1fv(G.location,me)}}}}_()}function A(){C();for(const b in n){const L=n[b];for(const D in L){const k=L[D];for(const H in k)u(k[H].object),delete k[H];delete L[D]}delete n[b]}}function w(b){if(n[b.id]===void 0)return;const L=n[b.id];for(const D in L){const k=L[D];for(const H in k)u(k[H].object),delete k[H];delete L[D]}delete n[b.id]}function R(b){for(const L in n){const D=n[L];if(D[b.id]===void 0)continue;const k=D[b.id];for(const H in k)u(k[H].object),delete k[H];delete D[b.id]}}function C(){S(),a=!0,s!==r&&(s=r,l(s.object))}function S(){r.geometry=null,r.program=null,r.wireframe=!1}return{setup:o,reset:C,resetDefaultState:S,dispose:A,releaseStatesOfGeometry:w,releaseStatesOfProgram:R,initAttributes:v,enableAttribute:g,disableUnusedAttributes:_}}function Ox(i,e,t){let n;function r(l){n=l}function s(l,u){i.drawArrays(n,l,u),t.update(u,n,1)}function a(l,u,d){d!==0&&(i.drawArraysInstanced(n,l,u,d),t.update(u,n,d))}function o(l,u,d){if(d===0)return;e.get("WEBGL_multi_draw").multiDrawArraysWEBGL(n,l,0,u,0,d);let h=0;for(let m=0;m<d;m++)h+=u[m];t.update(h,n,1)}function c(l,u,d,f){if(d===0)return;const h=e.get("WEBGL_multi_draw");if(h===null)for(let m=0;m<l.length;m++)a(l[m],u[m],f[m]);else{h.multiDrawArraysInstancedWEBGL(n,l,0,u,0,f,0,d);let m=0;for(let v=0;v<d;v++)m+=u[v]*f[v];t.update(m,n,1)}}this.setMode=r,this.render=s,this.renderInstances=a,this.renderMultiDraw=o,this.renderMultiDrawInstances=c}function Bx(i,e,t,n){let r;function s(){if(r!==void 0)return r;if(e.has("EXT_texture_filter_anisotropic")===!0){const R=e.get("EXT_texture_filter_anisotropic");r=i.getParameter(R.MAX_TEXTURE_MAX_ANISOTROPY_EXT)}else r=0;return r}function a(R){return!(R!==Un&&n.convert(R)!==i.getParameter(i.IMPLEMENTATION_COLOR_READ_FORMAT))}function o(R){const C=R===ma&&(e.has("EXT_color_buffer_half_float")||e.has("EXT_color_buffer_float"));return!(R!==ai&&n.convert(R)!==i.getParameter(i.IMPLEMENTATION_COLOR_READ_TYPE)&&R!==Gn&&!C)}function c(R){if(R==="highp"){if(i.getShaderPrecisionFormat(i.VERTEX_SHADER,i.HIGH_FLOAT).precision>0&&i.getShaderPrecisionFormat(i.FRAGMENT_SHADER,i.HIGH_FLOAT).precision>0)return"highp";R="mediump"}return R==="mediump"&&i.getShaderPrecisionFormat(i.VERTEX_SHADER,i.MEDIUM_FLOAT).precision>0&&i.getShaderPrecisionFormat(i.FRAGMENT_SHADER,i.MEDIUM_FLOAT).precision>0?"mediump":"lowp"}let l=t.precision!==void 0?t.precision:"highp";const u=c(l);u!==l&&(console.warn("THREE.WebGLRenderer:",l,"not supported, using",u,"instead."),l=u);const d=t.logarithmicDepthBuffer===!0,f=t.reversedDepthBuffer===!0&&e.has("EXT_clip_control"),h=i.getParameter(i.MAX_TEXTURE_IMAGE_UNITS),m=i.getParameter(i.MAX_VERTEX_TEXTURE_IMAGE_UNITS),v=i.getParameter(i.MAX_TEXTURE_SIZE),g=i.getParameter(i.MAX_CUBE_MAP_TEXTURE_SIZE),p=i.getParameter(i.MAX_VERTEX_ATTRIBS),_=i.getParameter(i.MAX_VERTEX_UNIFORM_VECTORS),y=i.getParameter(i.MAX_VARYING_VECTORS),x=i.getParameter(i.MAX_FRAGMENT_UNIFORM_VECTORS),A=m>0,w=i.getParameter(i.MAX_SAMPLES);return{isWebGL2:!0,getMaxAnisotropy:s,getMaxPrecision:c,textureFormatReadable:a,textureTypeReadable:o,precision:l,logarithmicDepthBuffer:d,reversedDepthBuffer:f,maxTextures:h,maxVertexTextures:m,maxTextureSize:v,maxCubemapSize:g,maxAttributes:p,maxVertexUniforms:_,maxVaryings:y,maxFragmentUniforms:x,vertexTextures:A,maxSamples:w}}function kx(i){const e=this;let t=null,n=0,r=!1,s=!1;const a=new lr,o=new Qe,c={value:null,needsUpdate:!1};this.uniform=c,this.numPlanes=0,this.numIntersection=0,this.init=function(d,f){const h=d.length!==0||f||n!==0||r;return r=f,n=d.length,h},this.beginShadows=function(){s=!0,u(null)},this.endShadows=function(){s=!1},this.setGlobalState=function(d,f){t=u(d,f,0)},this.setState=function(d,f,h){const m=d.clippingPlanes,v=d.clipIntersection,g=d.clipShadows,p=i.get(d);if(!r||m===null||m.length===0||s&&!g)s?u(null):l();else{const _=s?0:n,y=_*4;let x=p.clippingState||null;c.value=x,x=u(m,f,y,h);for(let A=0;A!==y;++A)x[A]=t[A];p.clippingState=x,this.numIntersection=v?this.numPlanes:0,this.numPlanes+=_}};function l(){c.value!==t&&(c.value=t,c.needsUpdate=n>0),e.numPlanes=n,e.numIntersection=0}function u(d,f,h,m){const v=d!==null?d.length:0;let g=null;if(v!==0){if(g=c.value,m!==!0||g===null){const p=h+v*4,_=f.matrixWorldInverse;o.getNormalMatrix(_),(g===null||g.length<p)&&(g=new Float32Array(p));for(let y=0,x=h;y!==v;++y,x+=4)a.copy(d[y]).applyMatrix4(_,o),a.normal.toArray(g,x),g[x+3]=a.constant}c.value=g,c.needsUpdate=!0}return e.numPlanes=v,e.numIntersection=0,g}}function zx(i){let e=new WeakMap;function t(a,o){return o===ml?a.mapping=ns:o===gl&&(a.mapping=is),a}function n(a){if(a&&a.isTexture){const o=a.mapping;if(o===ml||o===gl)if(e.has(a)){const c=e.get(a).texture;return t(c,a.mapping)}else{const c=a.image;if(c&&c.height>0){const l=new D0(c.height);return l.fromEquirectangularTexture(i,a),e.set(a,l),a.addEventListener("dispose",r),t(l.texture,a.mapping)}else return null}}return a}function r(a){const o=a.target;o.removeEventListener("dispose",r);const c=e.get(o);c!==void 0&&(e.delete(o),c.dispose())}function s(){e=new WeakMap}return{get:n,dispose:s}}const qr=4,mh=[.125,.215,.35,.446,.526,.582],hr=20,kc=new zo,gh=new We;let zc=null,Hc=0,Vc=0,Gc=!1;const ur=(1+Math.sqrt(5))/2,Hr=1/ur,vh=[new P(-ur,Hr,0),new P(ur,Hr,0),new P(-Hr,0,ur),new P(Hr,0,ur),new P(0,ur,-Hr),new P(0,ur,Hr),new P(-1,1,-1),new P(1,1,-1),new P(-1,1,1),new P(1,1,1)],Hx=new P;class Jl{constructor(e){this._renderer=e,this._pingPongRenderTarget=null,this._lodMax=0,this._cubeSize=0,this._lodPlanes=[],this._sizeLods=[],this._sigmas=[],this._blurMaterial=null,this._cubemapMaterial=null,this._equirectMaterial=null,this._compileMaterial(this._blurMaterial)}fromScene(e,t=0,n=.1,r=100,s={}){const{size:a=256,position:o=Hx}=s;zc=this._renderer.getRenderTarget(),Hc=this._renderer.getActiveCubeFace(),Vc=this._renderer.getActiveMipmapLevel(),Gc=this._renderer.xr.enabled,this._renderer.xr.enabled=!1,this._setSize(a);const c=this._allocateTargets();return c.depthBuffer=!0,this._sceneToCubeUV(e,n,r,c,o),t>0&&this._blur(c,0,0,t),this._applyPMREM(c),this._cleanup(c),c}fromEquirectangular(e,t=null){return this._fromTexture(e,t)}fromCubemap(e,t=null){return this._fromTexture(e,t)}compileCubemapShader(){this._cubemapMaterial===null&&(this._cubemapMaterial=xh(),this._compileMaterial(this._cubemapMaterial))}compileEquirectangularShader(){this._equirectMaterial===null&&(this._equirectMaterial=yh(),this._compileMaterial(this._equirectMaterial))}dispose(){this._dispose(),this._cubemapMaterial!==null&&this._cubemapMaterial.dispose(),this._equirectMaterial!==null&&this._equirectMaterial.dispose()}_setSize(e){this._lodMax=Math.floor(Math.log2(e)),this._cubeSize=Math.pow(2,this._lodMax)}_dispose(){this._blurMaterial!==null&&this._blurMaterial.dispose(),this._pingPongRenderTarget!==null&&this._pingPongRenderTarget.dispose();for(let e=0;e<this._lodPlanes.length;e++)this._lodPlanes[e].dispose()}_cleanup(e){this._renderer.setRenderTarget(zc,Hc,Vc),this._renderer.xr.enabled=Gc,e.scissorTest=!1,to(e,0,0,e.width,e.height)}_fromTexture(e,t){e.mapping===ns||e.mapping===is?this._setSize(e.image.length===0?16:e.image[0].width||e.image[0].image.width):this._setSize(e.image.width/4),zc=this._renderer.getRenderTarget(),Hc=this._renderer.getActiveCubeFace(),Vc=this._renderer.getActiveMipmapLevel(),Gc=this._renderer.xr.enabled,this._renderer.xr.enabled=!1;const n=t||this._allocateTargets();return this._textureToCubeUV(e,n),this._applyPMREM(n),this._cleanup(n),n}_allocateTargets(){const e=3*Math.max(this._cubeSize,112),t=4*this._cubeSize,n={magFilter:En,minFilter:En,generateMipmaps:!1,type:ma,format:Un,colorSpace:fn,depthBuffer:!1},r=_h(e,t,n);if(this._pingPongRenderTarget===null||this._pingPongRenderTarget.width!==e||this._pingPongRenderTarget.height!==t){this._pingPongRenderTarget!==null&&this._dispose(),this._pingPongRenderTarget=_h(e,t,n);const{_lodMax:s}=this;({sizeLods:this._sizeLods,lodPlanes:this._lodPlanes,sigmas:this._sigmas}=Vx(s)),this._blurMaterial=Gx(s,e,t)}return r}_compileMaterial(e){const t=new Tt(this._lodPlanes[0],e);this._renderer.compile(t,kc)}_sceneToCubeUV(e,t,n,r,s){const c=new nn(90,1,t,n),l=[1,-1,1,1,1,1],u=[1,1,1,-1,-1,-1],d=this._renderer,f=d.autoClear,h=d.toneMapping;d.getClearColor(gh),d.toneMapping=Wi,d.autoClear=!1,d.state.buffers.depth.getReversed()&&(d.setRenderTarget(r),d.clearDepth(),d.setRenderTarget(null));const v=new bi({name:"PMREM.Background",side:un,depthWrite:!1,depthTest:!1}),g=new Tt(new xr,v);let p=!1;const _=e.background;_?_.isColor&&(v.color.copy(_),e.background=null,p=!0):(v.color.copy(gh),p=!0);for(let y=0;y<6;y++){const x=y%3;x===0?(c.up.set(0,l[y],0),c.position.set(s.x,s.y,s.z),c.lookAt(s.x+u[y],s.y,s.z)):x===1?(c.up.set(0,0,l[y]),c.position.set(s.x,s.y,s.z),c.lookAt(s.x,s.y+u[y],s.z)):(c.up.set(0,l[y],0),c.position.set(s.x,s.y,s.z),c.lookAt(s.x,s.y,s.z+u[y]));const A=this._cubeSize;to(r,x*A,y>2?A:0,A,A),d.setRenderTarget(r),p&&d.render(g,c),d.render(e,c)}g.geometry.dispose(),g.material.dispose(),d.toneMapping=h,d.autoClear=f,e.background=_}_textureToCubeUV(e,t){const n=this._renderer,r=e.mapping===ns||e.mapping===is;r?(this._cubemapMaterial===null&&(this._cubemapMaterial=xh()),this._cubemapMaterial.uniforms.flipEnvMap.value=e.isRenderTargetTexture===!1?-1:1):this._equirectMaterial===null&&(this._equirectMaterial=yh());const s=r?this._cubemapMaterial:this._equirectMaterial,a=new Tt(this._lodPlanes[0],s),o=s.uniforms;o.envMap.value=e;const c=this._cubeSize;to(t,0,0,3*c,2*c),n.setRenderTarget(t),n.render(a,kc)}_applyPMREM(e){const t=this._renderer,n=t.autoClear;t.autoClear=!1;const r=this._lodPlanes.length;for(let s=1;s<r;s++){const a=Math.sqrt(this._sigmas[s]*this._sigmas[s]-this._sigmas[s-1]*this._sigmas[s-1]),o=vh[(r-s-1)%vh.length];this._blur(e,s-1,s,a,o)}t.autoClear=n}_blur(e,t,n,r,s){const a=this._pingPongRenderTarget;this._halfBlur(e,a,t,n,r,"latitudinal",s),this._halfBlur(a,e,n,n,r,"longitudinal",s)}_halfBlur(e,t,n,r,s,a,o){const c=this._renderer,l=this._blurMaterial;a!=="latitudinal"&&a!=="longitudinal"&&console.error("blur direction must be either latitudinal or longitudinal!");const u=3,d=new Tt(this._lodPlanes[r],l),f=l.uniforms,h=this._sizeLods[n]-1,m=isFinite(s)?Math.PI/(2*h):2*Math.PI/(2*hr-1),v=s/m,g=isFinite(s)?1+Math.floor(u*v):hr;g>hr&&console.warn(`sigmaRadians, ${s}, is too large and will clip, as it requested ${g} samples when the maximum is set to ${hr}`);const p=[];let _=0;for(let R=0;R<hr;++R){const C=R/v,S=Math.exp(-C*C/2);p.push(S),R===0?_+=S:R<g&&(_+=2*S)}for(let R=0;R<p.length;R++)p[R]=p[R]/_;f.envMap.value=e.texture,f.samples.value=g,f.weights.value=p,f.latitudinal.value=a==="latitudinal",o&&(f.poleAxis.value=o);const{_lodMax:y}=this;f.dTheta.value=m,f.mipInt.value=y-n;const x=this._sizeLods[r],A=3*x*(r>y-qr?r-y+qr:0),w=4*(this._cubeSize-x);to(t,A,w,3*x,2*x),c.setRenderTarget(t),c.render(d,kc)}}function Vx(i){const e=[],t=[],n=[];let r=i;const s=i-qr+1+mh.length;for(let a=0;a<s;a++){const o=Math.pow(2,r);t.push(o);let c=1/o;a>i-qr?c=mh[a-i+qr-1]:a===0&&(c=0),n.push(c);const l=1/(o-2),u=-l,d=1+l,f=[u,u,d,u,d,d,u,u,d,d,u,d],h=6,m=6,v=3,g=2,p=1,_=new Float32Array(v*m*h),y=new Float32Array(g*m*h),x=new Float32Array(p*m*h);for(let w=0;w<h;w++){const R=w%3*2/3-1,C=w>2?0:-1,S=[R,C,0,R+2/3,C,0,R+2/3,C+1,0,R,C,0,R+2/3,C+1,0,R,C+1,0];_.set(S,v*m*w),y.set(f,g*m*w);const b=[w,w,w,w,w,w];x.set(b,p*m*w)}const A=new Xt;A.setAttribute("position",new hn(_,v)),A.setAttribute("uv",new hn(y,g)),A.setAttribute("faceIndex",new hn(x,p)),e.push(A),r>qr&&r--}return{lodPlanes:e,sizeLods:t,sigmas:n}}function _h(i,e,t){const n=new _r(i,e,t);return n.texture.mapping=Do,n.texture.name="PMREM.cubeUv",n.scissorTest=!0,n}function to(i,e,t,n,r){i.viewport.set(e,t,n,r),i.scissor.set(e,t,n,r)}function Gx(i,e,t){const n=new Float32Array(hr),r=new P(0,1,0);return new ji({name:"SphericalGaussianBlur",defines:{n:hr,CUBEUV_TEXEL_WIDTH:1/e,CUBEUV_TEXEL_HEIGHT:1/t,CUBEUV_MAX_MIP:`${i}.0`},uniforms:{envMap:{value:null},samples:{value:1},weights:{value:n},latitudinal:{value:!1},dTheta:{value:0},mipInt:{value:0},poleAxis:{value:r}},vertexShader:ju(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			varying vec3 vOutputDirection;

			uniform sampler2D envMap;
			uniform int samples;
			uniform float weights[ n ];
			uniform bool latitudinal;
			uniform float dTheta;
			uniform float mipInt;
			uniform vec3 poleAxis;

			#define ENVMAP_TYPE_CUBE_UV
			#include <cube_uv_reflection_fragment>

			vec3 getSample( float theta, vec3 axis ) {

				float cosTheta = cos( theta );
				// Rodrigues' axis-angle rotation
				vec3 sampleDirection = vOutputDirection * cosTheta
					+ cross( axis, vOutputDirection ) * sin( theta )
					+ axis * dot( axis, vOutputDirection ) * ( 1.0 - cosTheta );

				return bilinearCubeUV( envMap, sampleDirection, mipInt );

			}

			void main() {

				vec3 axis = latitudinal ? poleAxis : cross( poleAxis, vOutputDirection );

				if ( all( equal( axis, vec3( 0.0 ) ) ) ) {

					axis = vec3( vOutputDirection.z, 0.0, - vOutputDirection.x );

				}

				axis = normalize( axis );

				gl_FragColor = vec4( 0.0, 0.0, 0.0, 1.0 );
				gl_FragColor.rgb += weights[ 0 ] * getSample( 0.0, axis );

				for ( int i = 1; i < n; i++ ) {

					if ( i >= samples ) {

						break;

					}

					float theta = dTheta * float( i );
					gl_FragColor.rgb += weights[ i ] * getSample( -1.0 * theta, axis );
					gl_FragColor.rgb += weights[ i ] * getSample( theta, axis );

				}

			}
		`,blending:Gi,depthTest:!1,depthWrite:!1})}function yh(){return new ji({name:"EquirectangularToCubeUV",uniforms:{envMap:{value:null}},vertexShader:ju(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			varying vec3 vOutputDirection;

			uniform sampler2D envMap;

			#include <common>

			void main() {

				vec3 outputDirection = normalize( vOutputDirection );
				vec2 uv = equirectUv( outputDirection );

				gl_FragColor = vec4( texture2D ( envMap, uv ).rgb, 1.0 );

			}
		`,blending:Gi,depthTest:!1,depthWrite:!1})}function xh(){return new ji({name:"CubemapToCubeUV",uniforms:{envMap:{value:null},flipEnvMap:{value:-1}},vertexShader:ju(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			uniform float flipEnvMap;

			varying vec3 vOutputDirection;

			uniform samplerCube envMap;

			void main() {

				gl_FragColor = textureCube( envMap, vec3( flipEnvMap * vOutputDirection.x, vOutputDirection.yz ) );

			}
		`,blending:Gi,depthTest:!1,depthWrite:!1})}function ju(){return`

		precision mediump float;
		precision mediump int;

		attribute float faceIndex;

		varying vec3 vOutputDirection;

		// RH coordinate system; PMREM face-indexing convention
		vec3 getDirection( vec2 uv, float face ) {

			uv = 2.0 * uv - 1.0;

			vec3 direction = vec3( uv, 1.0 );

			if ( face == 0.0 ) {

				direction = direction.zyx; // ( 1, v, u ) pos x

			} else if ( face == 1.0 ) {

				direction = direction.xzy;
				direction.xz *= -1.0; // ( -u, 1, -v ) pos y

			} else if ( face == 2.0 ) {

				direction.x *= -1.0; // ( -u, v, 1 ) pos z

			} else if ( face == 3.0 ) {

				direction = direction.zyx;
				direction.xz *= -1.0; // ( -1, v, -u ) neg x

			} else if ( face == 4.0 ) {

				direction = direction.xzy;
				direction.xy *= -1.0; // ( -u, -1, v ) neg y

			} else if ( face == 5.0 ) {

				direction.z *= -1.0; // ( u, v, -1 ) neg z

			}

			return direction;

		}

		void main() {

			vOutputDirection = getDirection( uv, faceIndex );
			gl_Position = vec4( position, 1.0 );

		}
	`}function Wx(i){let e=new WeakMap,t=null;function n(o){if(o&&o.isTexture){const c=o.mapping,l=c===ml||c===gl,u=c===ns||c===is;if(l||u){let d=e.get(o);const f=d!==void 0?d.texture.pmremVersion:0;if(o.isRenderTargetTexture&&o.pmremVersion!==f)return t===null&&(t=new Jl(i)),d=l?t.fromEquirectangular(o,d):t.fromCubemap(o,d),d.texture.pmremVersion=o.pmremVersion,e.set(o,d),d.texture;if(d!==void 0)return d.texture;{const h=o.image;return l&&h&&h.height>0||u&&h&&r(h)?(t===null&&(t=new Jl(i)),d=l?t.fromEquirectangular(o):t.fromCubemap(o),d.texture.pmremVersion=o.pmremVersion,e.set(o,d),o.addEventListener("dispose",s),d.texture):null}}}return o}function r(o){let c=0;const l=6;for(let u=0;u<l;u++)o[u]!==void 0&&c++;return c===l}function s(o){const c=o.target;c.removeEventListener("dispose",s);const l=e.get(c);l!==void 0&&(e.delete(c),l.dispose())}function a(){e=new WeakMap,t!==null&&(t.dispose(),t=null)}return{get:n,dispose:a}}function $x(i){const e={};function t(n){if(e[n]!==void 0)return e[n];let r;switch(n){case"WEBGL_depth_texture":r=i.getExtension("WEBGL_depth_texture")||i.getExtension("MOZ_WEBGL_depth_texture")||i.getExtension("WEBKIT_WEBGL_depth_texture");break;case"EXT_texture_filter_anisotropic":r=i.getExtension("EXT_texture_filter_anisotropic")||i.getExtension("MOZ_EXT_texture_filter_anisotropic")||i.getExtension("WEBKIT_EXT_texture_filter_anisotropic");break;case"WEBGL_compressed_texture_s3tc":r=i.getExtension("WEBGL_compressed_texture_s3tc")||i.getExtension("MOZ_WEBGL_compressed_texture_s3tc")||i.getExtension("WEBKIT_WEBGL_compressed_texture_s3tc");break;case"WEBGL_compressed_texture_pvrtc":r=i.getExtension("WEBGL_compressed_texture_pvrtc")||i.getExtension("WEBKIT_WEBGL_compressed_texture_pvrtc");break;default:r=i.getExtension(n)}return e[n]=r,r}return{has:function(n){return t(n)!==null},init:function(){t("EXT_color_buffer_float"),t("WEBGL_clip_cull_distance"),t("OES_texture_float_linear"),t("EXT_color_buffer_half_float"),t("WEBGL_multisampled_render_to_texture"),t("WEBGL_render_shared_exponent")},get:function(n){const r=t(n);return r===null&&sa("THREE.WebGLRenderer: "+n+" extension not supported."),r}}}function Xx(i,e,t,n){const r={},s=new WeakMap;function a(d){const f=d.target;f.index!==null&&e.remove(f.index);for(const m in f.attributes)e.remove(f.attributes[m]);f.removeEventListener("dispose",a),delete r[f.id];const h=s.get(f);h&&(e.remove(h),s.delete(f)),n.releaseStatesOfGeometry(f),f.isInstancedBufferGeometry===!0&&delete f._maxInstanceCount,t.memory.geometries--}function o(d,f){return r[f.id]===!0||(f.addEventListener("dispose",a),r[f.id]=!0,t.memory.geometries++),f}function c(d){const f=d.attributes;for(const h in f)e.update(f[h],i.ARRAY_BUFFER)}function l(d){const f=[],h=d.index,m=d.attributes.position;let v=0;if(h!==null){const _=h.array;v=h.version;for(let y=0,x=_.length;y<x;y+=3){const A=_[y+0],w=_[y+1],R=_[y+2];f.push(A,w,w,R,R,A)}}else if(m!==void 0){const _=m.array;v=m.version;for(let y=0,x=_.length/3-1;y<x;y+=3){const A=y+0,w=y+1,R=y+2;f.push(A,w,w,R,R,A)}}else return;const g=new(Df(f)?Bf:Of)(f,1);g.version=v;const p=s.get(d);p&&e.remove(p),s.set(d,g)}function u(d){const f=s.get(d);if(f){const h=d.index;h!==null&&f.version<h.version&&l(d)}else l(d);return s.get(d)}return{get:o,update:c,getWireframeAttribute:u}}function qx(i,e,t){let n;function r(f){n=f}let s,a;function o(f){s=f.type,a=f.bytesPerElement}function c(f,h){i.drawElements(n,h,s,f*a),t.update(h,n,1)}function l(f,h,m){m!==0&&(i.drawElementsInstanced(n,h,s,f*a,m),t.update(h,n,m))}function u(f,h,m){if(m===0)return;e.get("WEBGL_multi_draw").multiDrawElementsWEBGL(n,h,0,s,f,0,m);let g=0;for(let p=0;p<m;p++)g+=h[p];t.update(g,n,1)}function d(f,h,m,v){if(m===0)return;const g=e.get("WEBGL_multi_draw");if(g===null)for(let p=0;p<f.length;p++)l(f[p]/a,h[p],v[p]);else{g.multiDrawElementsInstancedWEBGL(n,h,0,s,f,0,v,0,m);let p=0;for(let _=0;_<m;_++)p+=h[_]*v[_];t.update(p,n,1)}}this.setMode=r,this.setIndex=o,this.render=c,this.renderInstances=l,this.renderMultiDraw=u,this.renderMultiDrawInstances=d}function jx(i){const e={geometries:0,textures:0},t={frame:0,calls:0,triangles:0,points:0,lines:0};function n(s,a,o){switch(t.calls++,a){case i.TRIANGLES:t.triangles+=o*(s/3);break;case i.LINES:t.lines+=o*(s/2);break;case i.LINE_STRIP:t.lines+=o*(s-1);break;case i.LINE_LOOP:t.lines+=o*s;break;case i.POINTS:t.points+=o*s;break;default:console.error("THREE.WebGLInfo: Unknown draw mode:",a);break}}function r(){t.calls=0,t.triangles=0,t.points=0,t.lines=0}return{memory:e,render:t,programs:null,autoReset:!0,reset:r,update:n}}function Yx(i,e,t){const n=new WeakMap,r=new ht;function s(a,o,c){const l=a.morphTargetInfluences,u=o.morphAttributes.position||o.morphAttributes.normal||o.morphAttributes.color,d=u!==void 0?u.length:0;let f=n.get(o);if(f===void 0||f.count!==d){let S=function(){R.dispose(),n.delete(o),o.removeEventListener("dispose",S)};f!==void 0&&f.texture.dispose();const h=o.morphAttributes.position!==void 0,m=o.morphAttributes.normal!==void 0,v=o.morphAttributes.color!==void 0,g=o.morphAttributes.position||[],p=o.morphAttributes.normal||[],_=o.morphAttributes.color||[];let y=0;h===!0&&(y=1),m===!0&&(y=2),v===!0&&(y=3);let x=o.attributes.position.count*y,A=1;x>e.maxTextureSize&&(A=Math.ceil(x/e.maxTextureSize),x=e.maxTextureSize);const w=new Float32Array(x*A*4*d),R=new Nf(w,x,A,d);R.type=Gn,R.needsUpdate=!0;const C=y*4;for(let b=0;b<d;b++){const L=g[b],D=p[b],k=_[b],H=x*A*4*b;for(let X=0;X<L.count;X++){const V=X*C;h===!0&&(r.fromBufferAttribute(L,X),w[H+V+0]=r.x,w[H+V+1]=r.y,w[H+V+2]=r.z,w[H+V+3]=0),m===!0&&(r.fromBufferAttribute(D,X),w[H+V+4]=r.x,w[H+V+5]=r.y,w[H+V+6]=r.z,w[H+V+7]=0),v===!0&&(r.fromBufferAttribute(k,X),w[H+V+8]=r.x,w[H+V+9]=r.y,w[H+V+10]=r.z,w[H+V+11]=k.itemSize===4?r.w:1)}}f={count:d,texture:R,size:new ue(x,A)},n.set(o,f),o.addEventListener("dispose",S)}if(a.isInstancedMesh===!0&&a.morphTexture!==null)c.getUniforms().setValue(i,"morphTexture",a.morphTexture,t);else{let h=0;for(let v=0;v<l.length;v++)h+=l[v];const m=o.morphTargetsRelative?1:1-h;c.getUniforms().setValue(i,"morphTargetBaseInfluence",m),c.getUniforms().setValue(i,"morphTargetInfluences",l)}c.getUniforms().setValue(i,"morphTargetsTexture",f.texture,t),c.getUniforms().setValue(i,"morphTargetsTextureSize",f.size)}return{update:s}}function Kx(i,e,t,n){let r=new WeakMap;function s(c){const l=n.render.frame,u=c.geometry,d=e.get(c,u);if(r.get(d)!==l&&(e.update(d),r.set(d,l)),c.isInstancedMesh&&(c.hasEventListener("dispose",o)===!1&&c.addEventListener("dispose",o),r.get(c)!==l&&(t.update(c.instanceMatrix,i.ARRAY_BUFFER),c.instanceColor!==null&&t.update(c.instanceColor,i.ARRAY_BUFFER),r.set(c,l))),c.isSkinnedMesh){const f=c.skeleton;r.get(f)!==l&&(f.update(),r.set(f,l))}return d}function a(){r=new WeakMap}function o(c){const l=c.target;l.removeEventListener("dispose",o),t.remove(l.instanceMatrix),l.instanceColor!==null&&t.remove(l.instanceColor)}return{update:s,dispose:a}}const mp=new Vt,Mh=new Kf(1,1),gp=new Nf,vp=new g0,_p=new Hf,Sh=[],bh=[],wh=new Float32Array(16),Eh=new Float32Array(9),Th=new Float32Array(4);function vs(i,e,t){const n=i[0];if(n<=0||n>0)return i;const r=e*t;let s=Sh[r];if(s===void 0&&(s=new Float32Array(r),Sh[r]=s),e!==0){n.toArray(s,0);for(let a=1,o=0;a!==e;++a)o+=t,i[a].toArray(s,o)}return s}function Wt(i,e){if(i.length!==e.length)return!1;for(let t=0,n=i.length;t<n;t++)if(i[t]!==e[t])return!1;return!0}function $t(i,e){for(let t=0,n=e.length;t<n;t++)i[t]=e[t]}function Ho(i,e){let t=bh[e];t===void 0&&(t=new Int32Array(e),bh[e]=t);for(let n=0;n!==e;++n)t[n]=i.allocateTextureUnit();return t}function Zx(i,e){const t=this.cache;t[0]!==e&&(i.uniform1f(this.addr,e),t[0]=e)}function Jx(i,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y)&&(i.uniform2f(this.addr,e.x,e.y),t[0]=e.x,t[1]=e.y);else{if(Wt(t,e))return;i.uniform2fv(this.addr,e),$t(t,e)}}function Qx(i,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z)&&(i.uniform3f(this.addr,e.x,e.y,e.z),t[0]=e.x,t[1]=e.y,t[2]=e.z);else if(e.r!==void 0)(t[0]!==e.r||t[1]!==e.g||t[2]!==e.b)&&(i.uniform3f(this.addr,e.r,e.g,e.b),t[0]=e.r,t[1]=e.g,t[2]=e.b);else{if(Wt(t,e))return;i.uniform3fv(this.addr,e),$t(t,e)}}function eM(i,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z||t[3]!==e.w)&&(i.uniform4f(this.addr,e.x,e.y,e.z,e.w),t[0]=e.x,t[1]=e.y,t[2]=e.z,t[3]=e.w);else{if(Wt(t,e))return;i.uniform4fv(this.addr,e),$t(t,e)}}function tM(i,e){const t=this.cache,n=e.elements;if(n===void 0){if(Wt(t,e))return;i.uniformMatrix2fv(this.addr,!1,e),$t(t,e)}else{if(Wt(t,n))return;Th.set(n),i.uniformMatrix2fv(this.addr,!1,Th),$t(t,n)}}function nM(i,e){const t=this.cache,n=e.elements;if(n===void 0){if(Wt(t,e))return;i.uniformMatrix3fv(this.addr,!1,e),$t(t,e)}else{if(Wt(t,n))return;Eh.set(n),i.uniformMatrix3fv(this.addr,!1,Eh),$t(t,n)}}function iM(i,e){const t=this.cache,n=e.elements;if(n===void 0){if(Wt(t,e))return;i.uniformMatrix4fv(this.addr,!1,e),$t(t,e)}else{if(Wt(t,n))return;wh.set(n),i.uniformMatrix4fv(this.addr,!1,wh),$t(t,n)}}function rM(i,e){const t=this.cache;t[0]!==e&&(i.uniform1i(this.addr,e),t[0]=e)}function sM(i,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y)&&(i.uniform2i(this.addr,e.x,e.y),t[0]=e.x,t[1]=e.y);else{if(Wt(t,e))return;i.uniform2iv(this.addr,e),$t(t,e)}}function aM(i,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z)&&(i.uniform3i(this.addr,e.x,e.y,e.z),t[0]=e.x,t[1]=e.y,t[2]=e.z);else{if(Wt(t,e))return;i.uniform3iv(this.addr,e),$t(t,e)}}function oM(i,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z||t[3]!==e.w)&&(i.uniform4i(this.addr,e.x,e.y,e.z,e.w),t[0]=e.x,t[1]=e.y,t[2]=e.z,t[3]=e.w);else{if(Wt(t,e))return;i.uniform4iv(this.addr,e),$t(t,e)}}function cM(i,e){const t=this.cache;t[0]!==e&&(i.uniform1ui(this.addr,e),t[0]=e)}function lM(i,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y)&&(i.uniform2ui(this.addr,e.x,e.y),t[0]=e.x,t[1]=e.y);else{if(Wt(t,e))return;i.uniform2uiv(this.addr,e),$t(t,e)}}function uM(i,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z)&&(i.uniform3ui(this.addr,e.x,e.y,e.z),t[0]=e.x,t[1]=e.y,t[2]=e.z);else{if(Wt(t,e))return;i.uniform3uiv(this.addr,e),$t(t,e)}}function dM(i,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z||t[3]!==e.w)&&(i.uniform4ui(this.addr,e.x,e.y,e.z,e.w),t[0]=e.x,t[1]=e.y,t[2]=e.z,t[3]=e.w);else{if(Wt(t,e))return;i.uniform4uiv(this.addr,e),$t(t,e)}}function hM(i,e,t){const n=this.cache,r=t.allocateTextureUnit();n[0]!==r&&(i.uniform1i(this.addr,r),n[0]=r);let s;this.type===i.SAMPLER_2D_SHADOW?(Mh.compareFunction=If,s=Mh):s=mp,t.setTexture2D(e||s,r)}function fM(i,e,t){const n=this.cache,r=t.allocateTextureUnit();n[0]!==r&&(i.uniform1i(this.addr,r),n[0]=r),t.setTexture3D(e||vp,r)}function pM(i,e,t){const n=this.cache,r=t.allocateTextureUnit();n[0]!==r&&(i.uniform1i(this.addr,r),n[0]=r),t.setTextureCube(e||_p,r)}function mM(i,e,t){const n=this.cache,r=t.allocateTextureUnit();n[0]!==r&&(i.uniform1i(this.addr,r),n[0]=r),t.setTexture2DArray(e||gp,r)}function gM(i){switch(i){case 5126:return Zx;case 35664:return Jx;case 35665:return Qx;case 35666:return eM;case 35674:return tM;case 35675:return nM;case 35676:return iM;case 5124:case 35670:return rM;case 35667:case 35671:return sM;case 35668:case 35672:return aM;case 35669:case 35673:return oM;case 5125:return cM;case 36294:return lM;case 36295:return uM;case 36296:return dM;case 35678:case 36198:case 36298:case 36306:case 35682:return hM;case 35679:case 36299:case 36307:return fM;case 35680:case 36300:case 36308:case 36293:return pM;case 36289:case 36303:case 36311:case 36292:return mM}}function vM(i,e){i.uniform1fv(this.addr,e)}function _M(i,e){const t=vs(e,this.size,2);i.uniform2fv(this.addr,t)}function yM(i,e){const t=vs(e,this.size,3);i.uniform3fv(this.addr,t)}function xM(i,e){const t=vs(e,this.size,4);i.uniform4fv(this.addr,t)}function MM(i,e){const t=vs(e,this.size,4);i.uniformMatrix2fv(this.addr,!1,t)}function SM(i,e){const t=vs(e,this.size,9);i.uniformMatrix3fv(this.addr,!1,t)}function bM(i,e){const t=vs(e,this.size,16);i.uniformMatrix4fv(this.addr,!1,t)}function wM(i,e){i.uniform1iv(this.addr,e)}function EM(i,e){i.uniform2iv(this.addr,e)}function TM(i,e){i.uniform3iv(this.addr,e)}function AM(i,e){i.uniform4iv(this.addr,e)}function RM(i,e){i.uniform1uiv(this.addr,e)}function CM(i,e){i.uniform2uiv(this.addr,e)}function LM(i,e){i.uniform3uiv(this.addr,e)}function PM(i,e){i.uniform4uiv(this.addr,e)}function IM(i,e,t){const n=this.cache,r=e.length,s=Ho(t,r);Wt(n,s)||(i.uniform1iv(this.addr,s),$t(n,s));for(let a=0;a!==r;++a)t.setTexture2D(e[a]||mp,s[a])}function DM(i,e,t){const n=this.cache,r=e.length,s=Ho(t,r);Wt(n,s)||(i.uniform1iv(this.addr,s),$t(n,s));for(let a=0;a!==r;++a)t.setTexture3D(e[a]||vp,s[a])}function NM(i,e,t){const n=this.cache,r=e.length,s=Ho(t,r);Wt(n,s)||(i.uniform1iv(this.addr,s),$t(n,s));for(let a=0;a!==r;++a)t.setTextureCube(e[a]||_p,s[a])}function UM(i,e,t){const n=this.cache,r=e.length,s=Ho(t,r);Wt(n,s)||(i.uniform1iv(this.addr,s),$t(n,s));for(let a=0;a!==r;++a)t.setTexture2DArray(e[a]||gp,s[a])}function FM(i){switch(i){case 5126:return vM;case 35664:return _M;case 35665:return yM;case 35666:return xM;case 35674:return MM;case 35675:return SM;case 35676:return bM;case 5124:case 35670:return wM;case 35667:case 35671:return EM;case 35668:case 35672:return TM;case 35669:case 35673:return AM;case 5125:return RM;case 36294:return CM;case 36295:return LM;case 36296:return PM;case 35678:case 36198:case 36298:case 36306:case 35682:return IM;case 35679:case 36299:case 36307:return DM;case 35680:case 36300:case 36308:case 36293:return NM;case 36289:case 36303:case 36311:case 36292:return UM}}class OM{constructor(e,t,n){this.id=e,this.addr=n,this.cache=[],this.type=t.type,this.setValue=gM(t.type)}}class BM{constructor(e,t,n){this.id=e,this.addr=n,this.cache=[],this.type=t.type,this.size=t.size,this.setValue=FM(t.type)}}class kM{constructor(e){this.id=e,this.seq=[],this.map={}}setValue(e,t,n){const r=this.seq;for(let s=0,a=r.length;s!==a;++s){const o=r[s];o.setValue(e,t[o.id],n)}}}const Wc=/(\w+)(\])?(\[|\.)?/g;function Ah(i,e){i.seq.push(e),i.map[e.id]=e}function zM(i,e,t){const n=i.name,r=n.length;for(Wc.lastIndex=0;;){const s=Wc.exec(n),a=Wc.lastIndex;let o=s[1];const c=s[2]==="]",l=s[3];if(c&&(o=o|0),l===void 0||l==="["&&a+2===r){Ah(t,l===void 0?new OM(o,i,e):new BM(o,i,e));break}else{let d=t.map[o];d===void 0&&(d=new kM(o),Ah(t,d)),t=d}}}class mo{constructor(e,t){this.seq=[],this.map={};const n=e.getProgramParameter(t,e.ACTIVE_UNIFORMS);for(let r=0;r<n;++r){const s=e.getActiveUniform(t,r),a=e.getUniformLocation(t,s.name);zM(s,a,this)}}setValue(e,t,n,r){const s=this.map[t];s!==void 0&&s.setValue(e,n,r)}setOptional(e,t,n){const r=t[n];r!==void 0&&this.setValue(e,n,r)}static upload(e,t,n,r){for(let s=0,a=t.length;s!==a;++s){const o=t[s],c=n[o.id];c.needsUpdate!==!1&&o.setValue(e,c.value,r)}}static seqWithValue(e,t){const n=[];for(let r=0,s=e.length;r!==s;++r){const a=e[r];a.id in t&&n.push(a)}return n}}function Rh(i,e,t){const n=i.createShader(e);return i.shaderSource(n,t),i.compileShader(n),n}const HM=37297;let VM=0;function GM(i,e){const t=i.split(`
`),n=[],r=Math.max(e-6,0),s=Math.min(e+6,t.length);for(let a=r;a<s;a++){const o=a+1;n.push(`${o===e?">":" "} ${o}: ${t[a]}`)}return n.join(`
`)}const Ch=new Qe;function WM(i){at._getMatrix(Ch,at.workingColorSpace,i);const e=`mat3( ${Ch.elements.map(t=>t.toFixed(4))} )`;switch(at.getTransfer(i)){case Mo:return[e,"LinearTransferOETF"];case _t:return[e,"sRGBTransferOETF"];default:return console.warn("THREE.WebGLProgram: Unsupported color space: ",i),[e,"LinearTransferOETF"]}}function Lh(i,e,t){const n=i.getShaderParameter(e,i.COMPILE_STATUS),s=(i.getShaderInfoLog(e)||"").trim();if(n&&s==="")return"";const a=/ERROR: 0:(\d+)/.exec(s);if(a){const o=parseInt(a[1]);return t.toUpperCase()+`

`+s+`

`+GM(i.getShaderSource(e),o)}else return s}function $M(i,e){const t=WM(e);return[`vec4 ${i}( vec4 value ) {`,`	return ${t[1]}( vec4( value.rgb * ${t[0]}, value.a ) );`,"}"].join(`
`)}function XM(i,e){let t;switch(e){case Ag:t="Linear";break;case Rg:t="Reinhard";break;case Cg:t="Cineon";break;case yu:t="ACESFilmic";break;case Pg:t="AgX";break;case Ig:t="Neutral";break;case Lg:t="Custom";break;default:console.warn("THREE.WebGLProgram: Unsupported toneMapping:",e),t="Linear"}return"vec3 "+i+"( vec3 color ) { return "+t+"ToneMapping( color ); }"}const no=new P;function qM(){at.getLuminanceCoefficients(no);const i=no.x.toFixed(4),e=no.y.toFixed(4),t=no.z.toFixed(4);return["float luminance( const in vec3 rgb ) {",`	const vec3 weights = vec3( ${i}, ${e}, ${t} );`,"	return dot( weights, rgb );","}"].join(`
`)}function jM(i){return[i.extensionClipCullDistance?"#extension GL_ANGLE_clip_cull_distance : require":"",i.extensionMultiDraw?"#extension GL_ANGLE_multi_draw : require":""].filter(Os).join(`
`)}function YM(i){const e=[];for(const t in i){const n=i[t];n!==!1&&e.push("#define "+t+" "+n)}return e.join(`
`)}function KM(i,e){const t={},n=i.getProgramParameter(e,i.ACTIVE_ATTRIBUTES);for(let r=0;r<n;r++){const s=i.getActiveAttrib(e,r),a=s.name;let o=1;s.type===i.FLOAT_MAT2&&(o=2),s.type===i.FLOAT_MAT3&&(o=3),s.type===i.FLOAT_MAT4&&(o=4),t[a]={type:s.type,location:i.getAttribLocation(e,a),locationSize:o}}return t}function Os(i){return i!==""}function Ph(i,e){const t=e.numSpotLightShadows+e.numSpotLightMaps-e.numSpotLightShadowsWithMaps;return i.replace(/NUM_DIR_LIGHTS/g,e.numDirLights).replace(/NUM_SPOT_LIGHTS/g,e.numSpotLights).replace(/NUM_SPOT_LIGHT_MAPS/g,e.numSpotLightMaps).replace(/NUM_SPOT_LIGHT_COORDS/g,t).replace(/NUM_RECT_AREA_LIGHTS/g,e.numRectAreaLights).replace(/NUM_POINT_LIGHTS/g,e.numPointLights).replace(/NUM_HEMI_LIGHTS/g,e.numHemiLights).replace(/NUM_DIR_LIGHT_SHADOWS/g,e.numDirLightShadows).replace(/NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS/g,e.numSpotLightShadowsWithMaps).replace(/NUM_SPOT_LIGHT_SHADOWS/g,e.numSpotLightShadows).replace(/NUM_POINT_LIGHT_SHADOWS/g,e.numPointLightShadows)}function Ih(i,e){return i.replace(/NUM_CLIPPING_PLANES/g,e.numClippingPlanes).replace(/UNION_CLIPPING_PLANES/g,e.numClippingPlanes-e.numClipIntersection)}const ZM=/^[ \t]*#include +<([\w\d./]+)>/gm;function Ql(i){return i.replace(ZM,QM)}const JM=new Map;function QM(i,e){let t=et[e];if(t===void 0){const n=JM.get(e);if(n!==void 0)t=et[n],console.warn('THREE.WebGLRenderer: Shader chunk "%s" has been deprecated. Use "%s" instead.',e,n);else throw new Error("Can not resolve #include <"+e+">")}return Ql(t)}const eS=/#pragma unroll_loop_start\s+for\s*\(\s*int\s+i\s*=\s*(\d+)\s*;\s*i\s*<\s*(\d+)\s*;\s*i\s*\+\+\s*\)\s*{([\s\S]+?)}\s+#pragma unroll_loop_end/g;function Dh(i){return i.replace(eS,tS)}function tS(i,e,t,n){let r="";for(let s=parseInt(e);s<parseInt(t);s++)r+=n.replace(/\[\s*i\s*\]/g,"[ "+s+" ]").replace(/UNROLLED_LOOP_INDEX/g,s);return r}function Nh(i){let e=`precision ${i.precision} float;
	precision ${i.precision} int;
	precision ${i.precision} sampler2D;
	precision ${i.precision} samplerCube;
	precision ${i.precision} sampler3D;
	precision ${i.precision} sampler2DArray;
	precision ${i.precision} sampler2DShadow;
	precision ${i.precision} samplerCubeShadow;
	precision ${i.precision} sampler2DArrayShadow;
	precision ${i.precision} isampler2D;
	precision ${i.precision} isampler3D;
	precision ${i.precision} isamplerCube;
	precision ${i.precision} isampler2DArray;
	precision ${i.precision} usampler2D;
	precision ${i.precision} usampler3D;
	precision ${i.precision} usamplerCube;
	precision ${i.precision} usampler2DArray;
	`;return i.precision==="highp"?e+=`
#define HIGH_PRECISION`:i.precision==="mediump"?e+=`
#define MEDIUM_PRECISION`:i.precision==="lowp"&&(e+=`
#define LOW_PRECISION`),e}function nS(i){let e="SHADOWMAP_TYPE_BASIC";return i.shadowMapType===Mf?e="SHADOWMAP_TYPE_PCF":i.shadowMapType===ag?e="SHADOWMAP_TYPE_PCF_SOFT":i.shadowMapType===yi&&(e="SHADOWMAP_TYPE_VSM"),e}function iS(i){let e="ENVMAP_TYPE_CUBE";if(i.envMap)switch(i.envMapMode){case ns:case is:e="ENVMAP_TYPE_CUBE";break;case Do:e="ENVMAP_TYPE_CUBE_UV";break}return e}function rS(i){let e="ENVMAP_MODE_REFLECTION";return i.envMap&&i.envMapMode===is&&(e="ENVMAP_MODE_REFRACTION"),e}function sS(i){let e="ENVMAP_BLENDING_NONE";if(i.envMap)switch(i.combine){case _u:e="ENVMAP_BLENDING_MULTIPLY";break;case Eg:e="ENVMAP_BLENDING_MIX";break;case Tg:e="ENVMAP_BLENDING_ADD";break}return e}function aS(i){const e=i.envMapCubeUVHeight;if(e===null)return null;const t=Math.log2(e)-2,n=1/e;return{texelWidth:1/(3*Math.max(Math.pow(2,t),112)),texelHeight:n,maxMip:t}}function oS(i,e,t,n){const r=i.getContext(),s=t.defines;let a=t.vertexShader,o=t.fragmentShader;const c=nS(t),l=iS(t),u=rS(t),d=sS(t),f=aS(t),h=jM(t),m=YM(s),v=r.createProgram();let g,p,_=t.glslVersion?"#version "+t.glslVersion+`
`:"";t.isRawShaderMaterial?(g=["#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,m].filter(Os).join(`
`),g.length>0&&(g+=`
`),p=["#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,m].filter(Os).join(`
`),p.length>0&&(p+=`
`)):(g=[Nh(t),"#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,m,t.extensionClipCullDistance?"#define USE_CLIP_DISTANCE":"",t.batching?"#define USE_BATCHING":"",t.batchingColor?"#define USE_BATCHING_COLOR":"",t.instancing?"#define USE_INSTANCING":"",t.instancingColor?"#define USE_INSTANCING_COLOR":"",t.instancingMorph?"#define USE_INSTANCING_MORPH":"",t.useFog&&t.fog?"#define USE_FOG":"",t.useFog&&t.fogExp2?"#define FOG_EXP2":"",t.map?"#define USE_MAP":"",t.envMap?"#define USE_ENVMAP":"",t.envMap?"#define "+u:"",t.lightMap?"#define USE_LIGHTMAP":"",t.aoMap?"#define USE_AOMAP":"",t.bumpMap?"#define USE_BUMPMAP":"",t.normalMap?"#define USE_NORMALMAP":"",t.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",t.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",t.displacementMap?"#define USE_DISPLACEMENTMAP":"",t.emissiveMap?"#define USE_EMISSIVEMAP":"",t.anisotropy?"#define USE_ANISOTROPY":"",t.anisotropyMap?"#define USE_ANISOTROPYMAP":"",t.clearcoatMap?"#define USE_CLEARCOATMAP":"",t.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",t.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",t.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",t.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",t.specularMap?"#define USE_SPECULARMAP":"",t.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",t.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",t.roughnessMap?"#define USE_ROUGHNESSMAP":"",t.metalnessMap?"#define USE_METALNESSMAP":"",t.alphaMap?"#define USE_ALPHAMAP":"",t.alphaHash?"#define USE_ALPHAHASH":"",t.transmission?"#define USE_TRANSMISSION":"",t.transmissionMap?"#define USE_TRANSMISSIONMAP":"",t.thicknessMap?"#define USE_THICKNESSMAP":"",t.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",t.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",t.mapUv?"#define MAP_UV "+t.mapUv:"",t.alphaMapUv?"#define ALPHAMAP_UV "+t.alphaMapUv:"",t.lightMapUv?"#define LIGHTMAP_UV "+t.lightMapUv:"",t.aoMapUv?"#define AOMAP_UV "+t.aoMapUv:"",t.emissiveMapUv?"#define EMISSIVEMAP_UV "+t.emissiveMapUv:"",t.bumpMapUv?"#define BUMPMAP_UV "+t.bumpMapUv:"",t.normalMapUv?"#define NORMALMAP_UV "+t.normalMapUv:"",t.displacementMapUv?"#define DISPLACEMENTMAP_UV "+t.displacementMapUv:"",t.metalnessMapUv?"#define METALNESSMAP_UV "+t.metalnessMapUv:"",t.roughnessMapUv?"#define ROUGHNESSMAP_UV "+t.roughnessMapUv:"",t.anisotropyMapUv?"#define ANISOTROPYMAP_UV "+t.anisotropyMapUv:"",t.clearcoatMapUv?"#define CLEARCOATMAP_UV "+t.clearcoatMapUv:"",t.clearcoatNormalMapUv?"#define CLEARCOAT_NORMALMAP_UV "+t.clearcoatNormalMapUv:"",t.clearcoatRoughnessMapUv?"#define CLEARCOAT_ROUGHNESSMAP_UV "+t.clearcoatRoughnessMapUv:"",t.iridescenceMapUv?"#define IRIDESCENCEMAP_UV "+t.iridescenceMapUv:"",t.iridescenceThicknessMapUv?"#define IRIDESCENCE_THICKNESSMAP_UV "+t.iridescenceThicknessMapUv:"",t.sheenColorMapUv?"#define SHEEN_COLORMAP_UV "+t.sheenColorMapUv:"",t.sheenRoughnessMapUv?"#define SHEEN_ROUGHNESSMAP_UV "+t.sheenRoughnessMapUv:"",t.specularMapUv?"#define SPECULARMAP_UV "+t.specularMapUv:"",t.specularColorMapUv?"#define SPECULAR_COLORMAP_UV "+t.specularColorMapUv:"",t.specularIntensityMapUv?"#define SPECULAR_INTENSITYMAP_UV "+t.specularIntensityMapUv:"",t.transmissionMapUv?"#define TRANSMISSIONMAP_UV "+t.transmissionMapUv:"",t.thicknessMapUv?"#define THICKNESSMAP_UV "+t.thicknessMapUv:"",t.vertexTangents&&t.flatShading===!1?"#define USE_TANGENT":"",t.vertexColors?"#define USE_COLOR":"",t.vertexAlphas?"#define USE_COLOR_ALPHA":"",t.vertexUv1s?"#define USE_UV1":"",t.vertexUv2s?"#define USE_UV2":"",t.vertexUv3s?"#define USE_UV3":"",t.pointsUvs?"#define USE_POINTS_UV":"",t.flatShading?"#define FLAT_SHADED":"",t.skinning?"#define USE_SKINNING":"",t.morphTargets?"#define USE_MORPHTARGETS":"",t.morphNormals&&t.flatShading===!1?"#define USE_MORPHNORMALS":"",t.morphColors?"#define USE_MORPHCOLORS":"",t.morphTargetsCount>0?"#define MORPHTARGETS_TEXTURE_STRIDE "+t.morphTextureStride:"",t.morphTargetsCount>0?"#define MORPHTARGETS_COUNT "+t.morphTargetsCount:"",t.doubleSided?"#define DOUBLE_SIDED":"",t.flipSided?"#define FLIP_SIDED":"",t.shadowMapEnabled?"#define USE_SHADOWMAP":"",t.shadowMapEnabled?"#define "+c:"",t.sizeAttenuation?"#define USE_SIZEATTENUATION":"",t.numLightProbes>0?"#define USE_LIGHT_PROBES":"",t.logarithmicDepthBuffer?"#define USE_LOGARITHMIC_DEPTH_BUFFER":"",t.reversedDepthBuffer?"#define USE_REVERSED_DEPTH_BUFFER":"","uniform mat4 modelMatrix;","uniform mat4 modelViewMatrix;","uniform mat4 projectionMatrix;","uniform mat4 viewMatrix;","uniform mat3 normalMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;","#ifdef USE_INSTANCING","	attribute mat4 instanceMatrix;","#endif","#ifdef USE_INSTANCING_COLOR","	attribute vec3 instanceColor;","#endif","#ifdef USE_INSTANCING_MORPH","	uniform sampler2D morphTexture;","#endif","attribute vec3 position;","attribute vec3 normal;","attribute vec2 uv;","#ifdef USE_UV1","	attribute vec2 uv1;","#endif","#ifdef USE_UV2","	attribute vec2 uv2;","#endif","#ifdef USE_UV3","	attribute vec2 uv3;","#endif","#ifdef USE_TANGENT","	attribute vec4 tangent;","#endif","#if defined( USE_COLOR_ALPHA )","	attribute vec4 color;","#elif defined( USE_COLOR )","	attribute vec3 color;","#endif","#ifdef USE_SKINNING","	attribute vec4 skinIndex;","	attribute vec4 skinWeight;","#endif",`
`].filter(Os).join(`
`),p=[Nh(t),"#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,m,t.useFog&&t.fog?"#define USE_FOG":"",t.useFog&&t.fogExp2?"#define FOG_EXP2":"",t.alphaToCoverage?"#define ALPHA_TO_COVERAGE":"",t.map?"#define USE_MAP":"",t.matcap?"#define USE_MATCAP":"",t.envMap?"#define USE_ENVMAP":"",t.envMap?"#define "+l:"",t.envMap?"#define "+u:"",t.envMap?"#define "+d:"",f?"#define CUBEUV_TEXEL_WIDTH "+f.texelWidth:"",f?"#define CUBEUV_TEXEL_HEIGHT "+f.texelHeight:"",f?"#define CUBEUV_MAX_MIP "+f.maxMip+".0":"",t.lightMap?"#define USE_LIGHTMAP":"",t.aoMap?"#define USE_AOMAP":"",t.bumpMap?"#define USE_BUMPMAP":"",t.normalMap?"#define USE_NORMALMAP":"",t.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",t.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",t.emissiveMap?"#define USE_EMISSIVEMAP":"",t.anisotropy?"#define USE_ANISOTROPY":"",t.anisotropyMap?"#define USE_ANISOTROPYMAP":"",t.clearcoat?"#define USE_CLEARCOAT":"",t.clearcoatMap?"#define USE_CLEARCOATMAP":"",t.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",t.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",t.dispersion?"#define USE_DISPERSION":"",t.iridescence?"#define USE_IRIDESCENCE":"",t.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",t.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",t.specularMap?"#define USE_SPECULARMAP":"",t.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",t.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",t.roughnessMap?"#define USE_ROUGHNESSMAP":"",t.metalnessMap?"#define USE_METALNESSMAP":"",t.alphaMap?"#define USE_ALPHAMAP":"",t.alphaTest?"#define USE_ALPHATEST":"",t.alphaHash?"#define USE_ALPHAHASH":"",t.sheen?"#define USE_SHEEN":"",t.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",t.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",t.transmission?"#define USE_TRANSMISSION":"",t.transmissionMap?"#define USE_TRANSMISSIONMAP":"",t.thicknessMap?"#define USE_THICKNESSMAP":"",t.vertexTangents&&t.flatShading===!1?"#define USE_TANGENT":"",t.vertexColors||t.instancingColor||t.batchingColor?"#define USE_COLOR":"",t.vertexAlphas?"#define USE_COLOR_ALPHA":"",t.vertexUv1s?"#define USE_UV1":"",t.vertexUv2s?"#define USE_UV2":"",t.vertexUv3s?"#define USE_UV3":"",t.pointsUvs?"#define USE_POINTS_UV":"",t.gradientMap?"#define USE_GRADIENTMAP":"",t.flatShading?"#define FLAT_SHADED":"",t.doubleSided?"#define DOUBLE_SIDED":"",t.flipSided?"#define FLIP_SIDED":"",t.shadowMapEnabled?"#define USE_SHADOWMAP":"",t.shadowMapEnabled?"#define "+c:"",t.premultipliedAlpha?"#define PREMULTIPLIED_ALPHA":"",t.numLightProbes>0?"#define USE_LIGHT_PROBES":"",t.decodeVideoTexture?"#define DECODE_VIDEO_TEXTURE":"",t.decodeVideoTextureEmissive?"#define DECODE_VIDEO_TEXTURE_EMISSIVE":"",t.logarithmicDepthBuffer?"#define USE_LOGARITHMIC_DEPTH_BUFFER":"",t.reversedDepthBuffer?"#define USE_REVERSED_DEPTH_BUFFER":"","uniform mat4 viewMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;",t.toneMapping!==Wi?"#define TONE_MAPPING":"",t.toneMapping!==Wi?et.tonemapping_pars_fragment:"",t.toneMapping!==Wi?XM("toneMapping",t.toneMapping):"",t.dithering?"#define DITHERING":"",t.opaque?"#define OPAQUE":"",et.colorspace_pars_fragment,$M("linearToOutputTexel",t.outputColorSpace),qM(),t.useDepthPacking?"#define DEPTH_PACKING "+t.depthPacking:"",`
`].filter(Os).join(`
`)),a=Ql(a),a=Ph(a,t),a=Ih(a,t),o=Ql(o),o=Ph(o,t),o=Ih(o,t),a=Dh(a),o=Dh(o),t.isRawShaderMaterial!==!0&&(_=`#version 300 es
`,g=[h,"#define attribute in","#define varying out","#define texture2D texture"].join(`
`)+`
`+g,p=["#define varying in",t.glslVersion===wd?"":"layout(location = 0) out highp vec4 pc_fragColor;",t.glslVersion===wd?"":"#define gl_FragColor pc_fragColor","#define gl_FragDepthEXT gl_FragDepth","#define texture2D texture","#define textureCube texture","#define texture2DProj textureProj","#define texture2DLodEXT textureLod","#define texture2DProjLodEXT textureProjLod","#define textureCubeLodEXT textureLod","#define texture2DGradEXT textureGrad","#define texture2DProjGradEXT textureProjGrad","#define textureCubeGradEXT textureGrad"].join(`
`)+`
`+p);const y=_+g+a,x=_+p+o,A=Rh(r,r.VERTEX_SHADER,y),w=Rh(r,r.FRAGMENT_SHADER,x);r.attachShader(v,A),r.attachShader(v,w),t.index0AttributeName!==void 0?r.bindAttribLocation(v,0,t.index0AttributeName):t.morphTargets===!0&&r.bindAttribLocation(v,0,"position"),r.linkProgram(v);function R(L){if(i.debug.checkShaderErrors){const D=r.getProgramInfoLog(v)||"",k=r.getShaderInfoLog(A)||"",H=r.getShaderInfoLog(w)||"",X=D.trim(),V=k.trim(),K=H.trim();let G=!0,se=!0;if(r.getProgramParameter(v,r.LINK_STATUS)===!1)if(G=!1,typeof i.debug.onShaderError=="function")i.debug.onShaderError(r,v,A,w);else{const me=Lh(r,A,"vertex"),_e=Lh(r,w,"fragment");console.error("THREE.WebGLProgram: Shader Error "+r.getError()+" - VALIDATE_STATUS "+r.getProgramParameter(v,r.VALIDATE_STATUS)+`

Material Name: `+L.name+`
Material Type: `+L.type+`

Program Info Log: `+X+`
`+me+`
`+_e)}else X!==""?console.warn("THREE.WebGLProgram: Program Info Log:",X):(V===""||K==="")&&(se=!1);se&&(L.diagnostics={runnable:G,programLog:X,vertexShader:{log:V,prefix:g},fragmentShader:{log:K,prefix:p}})}r.deleteShader(A),r.deleteShader(w),C=new mo(r,v),S=KM(r,v)}let C;this.getUniforms=function(){return C===void 0&&R(this),C};let S;this.getAttributes=function(){return S===void 0&&R(this),S};let b=t.rendererExtensionParallelShaderCompile===!1;return this.isReady=function(){return b===!1&&(b=r.getProgramParameter(v,HM)),b},this.destroy=function(){n.releaseStatesOfProgram(this),r.deleteProgram(v),this.program=void 0},this.type=t.shaderType,this.name=t.shaderName,this.id=VM++,this.cacheKey=e,this.usedTimes=1,this.program=v,this.vertexShader=A,this.fragmentShader=w,this}let cS=0;class lS{constructor(){this.shaderCache=new Map,this.materialCache=new Map}update(e){const t=e.vertexShader,n=e.fragmentShader,r=this._getShaderStage(t),s=this._getShaderStage(n),a=this._getShaderCacheForMaterial(e);return a.has(r)===!1&&(a.add(r),r.usedTimes++),a.has(s)===!1&&(a.add(s),s.usedTimes++),this}remove(e){const t=this.materialCache.get(e);for(const n of t)n.usedTimes--,n.usedTimes===0&&this.shaderCache.delete(n.code);return this.materialCache.delete(e),this}getVertexShaderID(e){return this._getShaderStage(e.vertexShader).id}getFragmentShaderID(e){return this._getShaderStage(e.fragmentShader).id}dispose(){this.shaderCache.clear(),this.materialCache.clear()}_getShaderCacheForMaterial(e){const t=this.materialCache;let n=t.get(e);return n===void 0&&(n=new Set,t.set(e,n)),n}_getShaderStage(e){const t=this.shaderCache;let n=t.get(e);return n===void 0&&(n=new uS(e),t.set(e,n)),n}}class uS{constructor(e){this.id=cS++,this.code=e,this.usedTimes=0}}function dS(i,e,t,n,r,s,a){const o=new Uf,c=new lS,l=new Set,u=[],d=r.logarithmicDepthBuffer,f=r.vertexTextures;let h=r.precision;const m={MeshDepthMaterial:"depth",MeshDistanceMaterial:"distanceRGBA",MeshNormalMaterial:"normal",MeshBasicMaterial:"basic",MeshLambertMaterial:"lambert",MeshPhongMaterial:"phong",MeshToonMaterial:"toon",MeshStandardMaterial:"physical",MeshPhysicalMaterial:"physical",MeshMatcapMaterial:"matcap",LineBasicMaterial:"basic",LineDashedMaterial:"dashed",PointsMaterial:"points",ShadowMaterial:"shadow",SpriteMaterial:"sprite"};function v(S){return l.add(S),S===0?"uv":`uv${S}`}function g(S,b,L,D,k){const H=D.fog,X=k.geometry,V=S.isMeshStandardMaterial?D.environment:null,K=(S.isMeshStandardMaterial?t:e).get(S.envMap||V),G=K&&K.mapping===Do?K.image.height:null,se=m[S.type];S.precision!==null&&(h=r.getMaxPrecision(S.precision),h!==S.precision&&console.warn("THREE.WebGLProgram.getParameters:",S.precision,"not supported, using",h,"instead."));const me=X.morphAttributes.position||X.morphAttributes.normal||X.morphAttributes.color,_e=me!==void 0?me.length:0;let Be=0;X.morphAttributes.position!==void 0&&(Be=1),X.morphAttributes.normal!==void 0&&(Be=2),X.morphAttributes.color!==void 0&&(Be=3);let lt,$e,st,Y;if(se){const ft=ti[se];lt=ft.vertexShader,$e=ft.fragmentShader}else lt=S.vertexShader,$e=S.fragmentShader,c.update(S),st=c.getVertexShaderID(S),Y=c.getFragmentShaderID(S);const ee=i.getRenderTarget(),Me=i.state.buffers.depth.getReversed(),De=k.isInstancedMesh===!0,be=k.isBatchedMesh===!0,Ze=!!S.map,qt=!!S.matcap,I=!!K,St=!!S.aoMap,Pe=!!S.lightMap,ze=!!S.bumpMap,Z=!!S.normalMap,le=!!S.displacementMap,ne=!!S.emissiveMap,te=!!S.metalnessMap,xe=!!S.roughnessMap,Ue=S.anisotropy>0,T=S.clearcoat>0,M=S.dispersion>0,U=S.iridescence>0,q=S.sheen>0,Q=S.transmission>0,j=Ue&&!!S.anisotropyMap,Le=T&&!!S.clearcoatMap,ce=T&&!!S.clearcoatNormalMap,Te=T&&!!S.clearcoatRoughnessMap,Re=U&&!!S.iridescenceMap,ie=U&&!!S.iridescenceThicknessMap,de=q&&!!S.sheenColorMap,He=q&&!!S.sheenRoughnessMap,Ie=!!S.specularMap,ge=!!S.specularColorMap,Je=!!S.specularIntensityMap,N=Q&&!!S.transmissionMap,oe=Q&&!!S.thicknessMap,he=!!S.gradientMap,we=!!S.alphaMap,re=S.alphaTest>0,J=!!S.alphaHash,Ce=!!S.extensions;let je=Wi;S.toneMapped&&(ee===null||ee.isXRRenderTarget===!0)&&(je=i.toneMapping);const bt={shaderID:se,shaderType:S.type,shaderName:S.name,vertexShader:lt,fragmentShader:$e,defines:S.defines,customVertexShaderID:st,customFragmentShaderID:Y,isRawShaderMaterial:S.isRawShaderMaterial===!0,glslVersion:S.glslVersion,precision:h,batching:be,batchingColor:be&&k._colorsTexture!==null,instancing:De,instancingColor:De&&k.instanceColor!==null,instancingMorph:De&&k.morphTexture!==null,supportsVertexTextures:f,outputColorSpace:ee===null?i.outputColorSpace:ee.isXRRenderTarget===!0?ee.texture.colorSpace:fn,alphaToCoverage:!!S.alphaToCoverage,map:Ze,matcap:qt,envMap:I,envMapMode:I&&K.mapping,envMapCubeUVHeight:G,aoMap:St,lightMap:Pe,bumpMap:ze,normalMap:Z,displacementMap:f&&le,emissiveMap:ne,normalMapObjectSpace:Z&&S.normalMapType===Bg,normalMapTangentSpace:Z&&S.normalMapType===Au,metalnessMap:te,roughnessMap:xe,anisotropy:Ue,anisotropyMap:j,clearcoat:T,clearcoatMap:Le,clearcoatNormalMap:ce,clearcoatRoughnessMap:Te,dispersion:M,iridescence:U,iridescenceMap:Re,iridescenceThicknessMap:ie,sheen:q,sheenColorMap:de,sheenRoughnessMap:He,specularMap:Ie,specularColorMap:ge,specularIntensityMap:Je,transmission:Q,transmissionMap:N,thicknessMap:oe,gradientMap:he,opaque:S.transparent===!1&&S.blending===Zr&&S.alphaToCoverage===!1,alphaMap:we,alphaTest:re,alphaHash:J,combine:S.combine,mapUv:Ze&&v(S.map.channel),aoMapUv:St&&v(S.aoMap.channel),lightMapUv:Pe&&v(S.lightMap.channel),bumpMapUv:ze&&v(S.bumpMap.channel),normalMapUv:Z&&v(S.normalMap.channel),displacementMapUv:le&&v(S.displacementMap.channel),emissiveMapUv:ne&&v(S.emissiveMap.channel),metalnessMapUv:te&&v(S.metalnessMap.channel),roughnessMapUv:xe&&v(S.roughnessMap.channel),anisotropyMapUv:j&&v(S.anisotropyMap.channel),clearcoatMapUv:Le&&v(S.clearcoatMap.channel),clearcoatNormalMapUv:ce&&v(S.clearcoatNormalMap.channel),clearcoatRoughnessMapUv:Te&&v(S.clearcoatRoughnessMap.channel),iridescenceMapUv:Re&&v(S.iridescenceMap.channel),iridescenceThicknessMapUv:ie&&v(S.iridescenceThicknessMap.channel),sheenColorMapUv:de&&v(S.sheenColorMap.channel),sheenRoughnessMapUv:He&&v(S.sheenRoughnessMap.channel),specularMapUv:Ie&&v(S.specularMap.channel),specularColorMapUv:ge&&v(S.specularColorMap.channel),specularIntensityMapUv:Je&&v(S.specularIntensityMap.channel),transmissionMapUv:N&&v(S.transmissionMap.channel),thicknessMapUv:oe&&v(S.thicknessMap.channel),alphaMapUv:we&&v(S.alphaMap.channel),vertexTangents:!!X.attributes.tangent&&(Z||Ue),vertexColors:S.vertexColors,vertexAlphas:S.vertexColors===!0&&!!X.attributes.color&&X.attributes.color.itemSize===4,pointsUvs:k.isPoints===!0&&!!X.attributes.uv&&(Ze||we),fog:!!H,useFog:S.fog===!0,fogExp2:!!H&&H.isFogExp2,flatShading:S.flatShading===!0&&S.wireframe===!1,sizeAttenuation:S.sizeAttenuation===!0,logarithmicDepthBuffer:d,reversedDepthBuffer:Me,skinning:k.isSkinnedMesh===!0,morphTargets:X.morphAttributes.position!==void 0,morphNormals:X.morphAttributes.normal!==void 0,morphColors:X.morphAttributes.color!==void 0,morphTargetsCount:_e,morphTextureStride:Be,numDirLights:b.directional.length,numPointLights:b.point.length,numSpotLights:b.spot.length,numSpotLightMaps:b.spotLightMap.length,numRectAreaLights:b.rectArea.length,numHemiLights:b.hemi.length,numDirLightShadows:b.directionalShadowMap.length,numPointLightShadows:b.pointShadowMap.length,numSpotLightShadows:b.spotShadowMap.length,numSpotLightShadowsWithMaps:b.numSpotLightShadowsWithMaps,numLightProbes:b.numLightProbes,numClippingPlanes:a.numPlanes,numClipIntersection:a.numIntersection,dithering:S.dithering,shadowMapEnabled:i.shadowMap.enabled&&L.length>0,shadowMapType:i.shadowMap.type,toneMapping:je,decodeVideoTexture:Ze&&S.map.isVideoTexture===!0&&at.getTransfer(S.map.colorSpace)===_t,decodeVideoTextureEmissive:ne&&S.emissiveMap.isVideoTexture===!0&&at.getTransfer(S.emissiveMap.colorSpace)===_t,premultipliedAlpha:S.premultipliedAlpha,doubleSided:S.side===In,flipSided:S.side===un,useDepthPacking:S.depthPacking>=0,depthPacking:S.depthPacking||0,index0AttributeName:S.index0AttributeName,extensionClipCullDistance:Ce&&S.extensions.clipCullDistance===!0&&n.has("WEBGL_clip_cull_distance"),extensionMultiDraw:(Ce&&S.extensions.multiDraw===!0||be)&&n.has("WEBGL_multi_draw"),rendererExtensionParallelShaderCompile:n.has("KHR_parallel_shader_compile"),customProgramCacheKey:S.customProgramCacheKey()};return bt.vertexUv1s=l.has(1),bt.vertexUv2s=l.has(2),bt.vertexUv3s=l.has(3),l.clear(),bt}function p(S){const b=[];if(S.shaderID?b.push(S.shaderID):(b.push(S.customVertexShaderID),b.push(S.customFragmentShaderID)),S.defines!==void 0)for(const L in S.defines)b.push(L),b.push(S.defines[L]);return S.isRawShaderMaterial===!1&&(_(b,S),y(b,S),b.push(i.outputColorSpace)),b.push(S.customProgramCacheKey),b.join()}function _(S,b){S.push(b.precision),S.push(b.outputColorSpace),S.push(b.envMapMode),S.push(b.envMapCubeUVHeight),S.push(b.mapUv),S.push(b.alphaMapUv),S.push(b.lightMapUv),S.push(b.aoMapUv),S.push(b.bumpMapUv),S.push(b.normalMapUv),S.push(b.displacementMapUv),S.push(b.emissiveMapUv),S.push(b.metalnessMapUv),S.push(b.roughnessMapUv),S.push(b.anisotropyMapUv),S.push(b.clearcoatMapUv),S.push(b.clearcoatNormalMapUv),S.push(b.clearcoatRoughnessMapUv),S.push(b.iridescenceMapUv),S.push(b.iridescenceThicknessMapUv),S.push(b.sheenColorMapUv),S.push(b.sheenRoughnessMapUv),S.push(b.specularMapUv),S.push(b.specularColorMapUv),S.push(b.specularIntensityMapUv),S.push(b.transmissionMapUv),S.push(b.thicknessMapUv),S.push(b.combine),S.push(b.fogExp2),S.push(b.sizeAttenuation),S.push(b.morphTargetsCount),S.push(b.morphAttributeCount),S.push(b.numDirLights),S.push(b.numPointLights),S.push(b.numSpotLights),S.push(b.numSpotLightMaps),S.push(b.numHemiLights),S.push(b.numRectAreaLights),S.push(b.numDirLightShadows),S.push(b.numPointLightShadows),S.push(b.numSpotLightShadows),S.push(b.numSpotLightShadowsWithMaps),S.push(b.numLightProbes),S.push(b.shadowMapType),S.push(b.toneMapping),S.push(b.numClippingPlanes),S.push(b.numClipIntersection),S.push(b.depthPacking)}function y(S,b){o.disableAll(),b.supportsVertexTextures&&o.enable(0),b.instancing&&o.enable(1),b.instancingColor&&o.enable(2),b.instancingMorph&&o.enable(3),b.matcap&&o.enable(4),b.envMap&&o.enable(5),b.normalMapObjectSpace&&o.enable(6),b.normalMapTangentSpace&&o.enable(7),b.clearcoat&&o.enable(8),b.iridescence&&o.enable(9),b.alphaTest&&o.enable(10),b.vertexColors&&o.enable(11),b.vertexAlphas&&o.enable(12),b.vertexUv1s&&o.enable(13),b.vertexUv2s&&o.enable(14),b.vertexUv3s&&o.enable(15),b.vertexTangents&&o.enable(16),b.anisotropy&&o.enable(17),b.alphaHash&&o.enable(18),b.batching&&o.enable(19),b.dispersion&&o.enable(20),b.batchingColor&&o.enable(21),b.gradientMap&&o.enable(22),S.push(o.mask),o.disableAll(),b.fog&&o.enable(0),b.useFog&&o.enable(1),b.flatShading&&o.enable(2),b.logarithmicDepthBuffer&&o.enable(3),b.reversedDepthBuffer&&o.enable(4),b.skinning&&o.enable(5),b.morphTargets&&o.enable(6),b.morphNormals&&o.enable(7),b.morphColors&&o.enable(8),b.premultipliedAlpha&&o.enable(9),b.shadowMapEnabled&&o.enable(10),b.doubleSided&&o.enable(11),b.flipSided&&o.enable(12),b.useDepthPacking&&o.enable(13),b.dithering&&o.enable(14),b.transmission&&o.enable(15),b.sheen&&o.enable(16),b.opaque&&o.enable(17),b.pointsUvs&&o.enable(18),b.decodeVideoTexture&&o.enable(19),b.decodeVideoTextureEmissive&&o.enable(20),b.alphaToCoverage&&o.enable(21),S.push(o.mask)}function x(S){const b=m[S.type];let L;if(b){const D=ti[b];L=C0.clone(D.uniforms)}else L=S.uniforms;return L}function A(S,b){let L;for(let D=0,k=u.length;D<k;D++){const H=u[D];if(H.cacheKey===b){L=H,++L.usedTimes;break}}return L===void 0&&(L=new oS(i,b,S,s),u.push(L)),L}function w(S){if(--S.usedTimes===0){const b=u.indexOf(S);u[b]=u[u.length-1],u.pop(),S.destroy()}}function R(S){c.remove(S)}function C(){c.dispose()}return{getParameters:g,getProgramCacheKey:p,getUniforms:x,acquireProgram:A,releaseProgram:w,releaseShaderCache:R,programs:u,dispose:C}}function hS(){let i=new WeakMap;function e(a){return i.has(a)}function t(a){let o=i.get(a);return o===void 0&&(o={},i.set(a,o)),o}function n(a){i.delete(a)}function r(a,o,c){i.get(a)[o]=c}function s(){i=new WeakMap}return{has:e,get:t,remove:n,update:r,dispose:s}}function fS(i,e){return i.groupOrder!==e.groupOrder?i.groupOrder-e.groupOrder:i.renderOrder!==e.renderOrder?i.renderOrder-e.renderOrder:i.material.id!==e.material.id?i.material.id-e.material.id:i.z!==e.z?i.z-e.z:i.id-e.id}function Uh(i,e){return i.groupOrder!==e.groupOrder?i.groupOrder-e.groupOrder:i.renderOrder!==e.renderOrder?i.renderOrder-e.renderOrder:i.z!==e.z?e.z-i.z:i.id-e.id}function Fh(){const i=[];let e=0;const t=[],n=[],r=[];function s(){e=0,t.length=0,n.length=0,r.length=0}function a(d,f,h,m,v,g){let p=i[e];return p===void 0?(p={id:d.id,object:d,geometry:f,material:h,groupOrder:m,renderOrder:d.renderOrder,z:v,group:g},i[e]=p):(p.id=d.id,p.object=d,p.geometry=f,p.material=h,p.groupOrder=m,p.renderOrder=d.renderOrder,p.z=v,p.group=g),e++,p}function o(d,f,h,m,v,g){const p=a(d,f,h,m,v,g);h.transmission>0?n.push(p):h.transparent===!0?r.push(p):t.push(p)}function c(d,f,h,m,v,g){const p=a(d,f,h,m,v,g);h.transmission>0?n.unshift(p):h.transparent===!0?r.unshift(p):t.unshift(p)}function l(d,f){t.length>1&&t.sort(d||fS),n.length>1&&n.sort(f||Uh),r.length>1&&r.sort(f||Uh)}function u(){for(let d=e,f=i.length;d<f;d++){const h=i[d];if(h.id===null)break;h.id=null,h.object=null,h.geometry=null,h.material=null,h.group=null}}return{opaque:t,transmissive:n,transparent:r,init:s,push:o,unshift:c,finish:u,sort:l}}function pS(){let i=new WeakMap;function e(n,r){const s=i.get(n);let a;return s===void 0?(a=new Fh,i.set(n,[a])):r>=s.length?(a=new Fh,s.push(a)):a=s[r],a}function t(){i=new WeakMap}return{get:e,dispose:t}}function mS(){const i={};return{get:function(e){if(i[e.id]!==void 0)return i[e.id];let t;switch(e.type){case"DirectionalLight":t={direction:new P,color:new We};break;case"SpotLight":t={position:new P,direction:new P,color:new We,distance:0,coneCos:0,penumbraCos:0,decay:0};break;case"PointLight":t={position:new P,color:new We,distance:0,decay:0};break;case"HemisphereLight":t={direction:new P,skyColor:new We,groundColor:new We};break;case"RectAreaLight":t={color:new We,position:new P,halfWidth:new P,halfHeight:new P};break}return i[e.id]=t,t}}}function gS(){const i={};return{get:function(e){if(i[e.id]!==void 0)return i[e.id];let t;switch(e.type){case"DirectionalLight":t={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new ue};break;case"SpotLight":t={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new ue};break;case"PointLight":t={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new ue,shadowCameraNear:1,shadowCameraFar:1e3};break}return i[e.id]=t,t}}}let vS=0;function _S(i,e){return(e.castShadow?2:0)-(i.castShadow?2:0)+(e.map?1:0)-(i.map?1:0)}function yS(i){const e=new mS,t=gS(),n={version:0,hash:{directionalLength:-1,pointLength:-1,spotLength:-1,rectAreaLength:-1,hemiLength:-1,numDirectionalShadows:-1,numPointShadows:-1,numSpotShadows:-1,numSpotMaps:-1,numLightProbes:-1},ambient:[0,0,0],probe:[],directional:[],directionalShadow:[],directionalShadowMap:[],directionalShadowMatrix:[],spot:[],spotLightMap:[],spotShadow:[],spotShadowMap:[],spotLightMatrix:[],rectArea:[],rectAreaLTC1:null,rectAreaLTC2:null,point:[],pointShadow:[],pointShadowMap:[],pointShadowMatrix:[],hemi:[],numSpotLightShadowsWithMaps:0,numLightProbes:0};for(let l=0;l<9;l++)n.probe.push(new P);const r=new P,s=new Ke,a=new Ke;function o(l){let u=0,d=0,f=0;for(let S=0;S<9;S++)n.probe[S].set(0,0,0);let h=0,m=0,v=0,g=0,p=0,_=0,y=0,x=0,A=0,w=0,R=0;l.sort(_S);for(let S=0,b=l.length;S<b;S++){const L=l[S],D=L.color,k=L.intensity,H=L.distance,X=L.shadow&&L.shadow.map?L.shadow.map.texture:null;if(L.isAmbientLight)u+=D.r*k,d+=D.g*k,f+=D.b*k;else if(L.isLightProbe){for(let V=0;V<9;V++)n.probe[V].addScaledVector(L.sh.coefficients[V],k);R++}else if(L.isDirectionalLight){const V=e.get(L);if(V.color.copy(L.color).multiplyScalar(L.intensity),L.castShadow){const K=L.shadow,G=t.get(L);G.shadowIntensity=K.intensity,G.shadowBias=K.bias,G.shadowNormalBias=K.normalBias,G.shadowRadius=K.radius,G.shadowMapSize=K.mapSize,n.directionalShadow[h]=G,n.directionalShadowMap[h]=X,n.directionalShadowMatrix[h]=L.shadow.matrix,_++}n.directional[h]=V,h++}else if(L.isSpotLight){const V=e.get(L);V.position.setFromMatrixPosition(L.matrixWorld),V.color.copy(D).multiplyScalar(k),V.distance=H,V.coneCos=Math.cos(L.angle),V.penumbraCos=Math.cos(L.angle*(1-L.penumbra)),V.decay=L.decay,n.spot[v]=V;const K=L.shadow;if(L.map&&(n.spotLightMap[A]=L.map,A++,K.updateMatrices(L),L.castShadow&&w++),n.spotLightMatrix[v]=K.matrix,L.castShadow){const G=t.get(L);G.shadowIntensity=K.intensity,G.shadowBias=K.bias,G.shadowNormalBias=K.normalBias,G.shadowRadius=K.radius,G.shadowMapSize=K.mapSize,n.spotShadow[v]=G,n.spotShadowMap[v]=X,x++}v++}else if(L.isRectAreaLight){const V=e.get(L);V.color.copy(D).multiplyScalar(k),V.halfWidth.set(L.width*.5,0,0),V.halfHeight.set(0,L.height*.5,0),n.rectArea[g]=V,g++}else if(L.isPointLight){const V=e.get(L);if(V.color.copy(L.color).multiplyScalar(L.intensity),V.distance=L.distance,V.decay=L.decay,L.castShadow){const K=L.shadow,G=t.get(L);G.shadowIntensity=K.intensity,G.shadowBias=K.bias,G.shadowNormalBias=K.normalBias,G.shadowRadius=K.radius,G.shadowMapSize=K.mapSize,G.shadowCameraNear=K.camera.near,G.shadowCameraFar=K.camera.far,n.pointShadow[m]=G,n.pointShadowMap[m]=X,n.pointShadowMatrix[m]=L.shadow.matrix,y++}n.point[m]=V,m++}else if(L.isHemisphereLight){const V=e.get(L);V.skyColor.copy(L.color).multiplyScalar(k),V.groundColor.copy(L.groundColor).multiplyScalar(k),n.hemi[p]=V,p++}}g>0&&(i.has("OES_texture_float_linear")===!0?(n.rectAreaLTC1=pe.LTC_FLOAT_1,n.rectAreaLTC2=pe.LTC_FLOAT_2):(n.rectAreaLTC1=pe.LTC_HALF_1,n.rectAreaLTC2=pe.LTC_HALF_2)),n.ambient[0]=u,n.ambient[1]=d,n.ambient[2]=f;const C=n.hash;(C.directionalLength!==h||C.pointLength!==m||C.spotLength!==v||C.rectAreaLength!==g||C.hemiLength!==p||C.numDirectionalShadows!==_||C.numPointShadows!==y||C.numSpotShadows!==x||C.numSpotMaps!==A||C.numLightProbes!==R)&&(n.directional.length=h,n.spot.length=v,n.rectArea.length=g,n.point.length=m,n.hemi.length=p,n.directionalShadow.length=_,n.directionalShadowMap.length=_,n.pointShadow.length=y,n.pointShadowMap.length=y,n.spotShadow.length=x,n.spotShadowMap.length=x,n.directionalShadowMatrix.length=_,n.pointShadowMatrix.length=y,n.spotLightMatrix.length=x+A-w,n.spotLightMap.length=A,n.numSpotLightShadowsWithMaps=w,n.numLightProbes=R,C.directionalLength=h,C.pointLength=m,C.spotLength=v,C.rectAreaLength=g,C.hemiLength=p,C.numDirectionalShadows=_,C.numPointShadows=y,C.numSpotShadows=x,C.numSpotMaps=A,C.numLightProbes=R,n.version=vS++)}function c(l,u){let d=0,f=0,h=0,m=0,v=0;const g=u.matrixWorldInverse;for(let p=0,_=l.length;p<_;p++){const y=l[p];if(y.isDirectionalLight){const x=n.directional[d];x.direction.setFromMatrixPosition(y.matrixWorld),r.setFromMatrixPosition(y.target.matrixWorld),x.direction.sub(r),x.direction.transformDirection(g),d++}else if(y.isSpotLight){const x=n.spot[h];x.position.setFromMatrixPosition(y.matrixWorld),x.position.applyMatrix4(g),x.direction.setFromMatrixPosition(y.matrixWorld),r.setFromMatrixPosition(y.target.matrixWorld),x.direction.sub(r),x.direction.transformDirection(g),h++}else if(y.isRectAreaLight){const x=n.rectArea[m];x.position.setFromMatrixPosition(y.matrixWorld),x.position.applyMatrix4(g),a.identity(),s.copy(y.matrixWorld),s.premultiply(g),a.extractRotation(s),x.halfWidth.set(y.width*.5,0,0),x.halfHeight.set(0,y.height*.5,0),x.halfWidth.applyMatrix4(a),x.halfHeight.applyMatrix4(a),m++}else if(y.isPointLight){const x=n.point[f];x.position.setFromMatrixPosition(y.matrixWorld),x.position.applyMatrix4(g),f++}else if(y.isHemisphereLight){const x=n.hemi[v];x.direction.setFromMatrixPosition(y.matrixWorld),x.direction.transformDirection(g),v++}}}return{setup:o,setupView:c,state:n}}function Oh(i){const e=new yS(i),t=[],n=[];function r(u){l.camera=u,t.length=0,n.length=0}function s(u){t.push(u)}function a(u){n.push(u)}function o(){e.setup(t)}function c(u){e.setupView(t,u)}const l={lightsArray:t,shadowsArray:n,camera:null,lights:e,transmissionRenderTarget:{}};return{init:r,state:l,setupLights:o,setupLightsView:c,pushLight:s,pushShadow:a}}function xS(i){let e=new WeakMap;function t(r,s=0){const a=e.get(r);let o;return a===void 0?(o=new Oh(i),e.set(r,[o])):s>=a.length?(o=new Oh(i),a.push(o)):o=a[s],o}function n(){e=new WeakMap}return{get:t,dispose:n}}const MS=`void main() {
	gl_Position = vec4( position, 1.0 );
}`,SS=`uniform sampler2D shadow_pass;
uniform vec2 resolution;
uniform float radius;
#include <packing>
void main() {
	const float samples = float( VSM_SAMPLES );
	float mean = 0.0;
	float squared_mean = 0.0;
	float uvStride = samples <= 1.0 ? 0.0 : 2.0 / ( samples - 1.0 );
	float uvStart = samples <= 1.0 ? 0.0 : - 1.0;
	for ( float i = 0.0; i < samples; i ++ ) {
		float uvOffset = uvStart + i * uvStride;
		#ifdef HORIZONTAL_PASS
			vec2 distribution = unpackRGBATo2Half( texture2D( shadow_pass, ( gl_FragCoord.xy + vec2( uvOffset, 0.0 ) * radius ) / resolution ) );
			mean += distribution.x;
			squared_mean += distribution.y * distribution.y + distribution.x * distribution.x;
		#else
			float depth = unpackRGBAToDepth( texture2D( shadow_pass, ( gl_FragCoord.xy + vec2( 0.0, uvOffset ) * radius ) / resolution ) );
			mean += depth;
			squared_mean += depth * depth;
		#endif
	}
	mean = mean / samples;
	squared_mean = squared_mean / samples;
	float std_dev = sqrt( squared_mean - mean * mean );
	gl_FragColor = pack2HalfToRGBA( vec2( mean, std_dev ) );
}`;function bS(i,e,t){let n=new Iu;const r=new ue,s=new ue,a=new ht,o=new bv({depthPacking:Og}),c=new wv,l={},u=t.maxTextureSize,d={[Ci]:un,[un]:Ci,[In]:In},f=new ji({defines:{VSM_SAMPLES:8},uniforms:{shadow_pass:{value:null},resolution:{value:new ue},radius:{value:4}},vertexShader:MS,fragmentShader:SS}),h=f.clone();h.defines.HORIZONTAL_PASS=1;const m=new Xt;m.setAttribute("position",new hn(new Float32Array([-1,-1,.5,3,-1,.5,-1,3,.5]),3));const v=new Tt(m,f),g=this;this.enabled=!1,this.autoUpdate=!0,this.needsUpdate=!1,this.type=Mf;let p=this.type;this.render=function(w,R,C){if(g.enabled===!1||g.autoUpdate===!1&&g.needsUpdate===!1||w.length===0)return;const S=i.getRenderTarget(),b=i.getActiveCubeFace(),L=i.getActiveMipmapLevel(),D=i.state;D.setBlending(Gi),D.buffers.depth.getReversed()===!0?D.buffers.color.setClear(0,0,0,0):D.buffers.color.setClear(1,1,1,1),D.buffers.depth.setTest(!0),D.setScissorTest(!1);const k=p!==yi&&this.type===yi,H=p===yi&&this.type!==yi;for(let X=0,V=w.length;X<V;X++){const K=w[X],G=K.shadow;if(G===void 0){console.warn("THREE.WebGLShadowMap:",K,"has no shadow.");continue}if(G.autoUpdate===!1&&G.needsUpdate===!1)continue;r.copy(G.mapSize);const se=G.getFrameExtents();if(r.multiply(se),s.copy(G.mapSize),(r.x>u||r.y>u)&&(r.x>u&&(s.x=Math.floor(u/se.x),r.x=s.x*se.x,G.mapSize.x=s.x),r.y>u&&(s.y=Math.floor(u/se.y),r.y=s.y*se.y,G.mapSize.y=s.y)),G.map===null||k===!0||H===!0){const _e=this.type!==yi?{minFilter:dn,magFilter:dn}:{};G.map!==null&&G.map.dispose(),G.map=new _r(r.x,r.y,_e),G.map.texture.name=K.name+".shadowMap",G.camera.updateProjectionMatrix()}i.setRenderTarget(G.map),i.clear();const me=G.getViewportCount();for(let _e=0;_e<me;_e++){const Be=G.getViewport(_e);a.set(s.x*Be.x,s.y*Be.y,s.x*Be.z,s.y*Be.w),D.viewport(a),G.updateMatrices(K,_e),n=G.getFrustum(),x(R,C,G.camera,K,this.type)}G.isPointLightShadow!==!0&&this.type===yi&&_(G,C),G.needsUpdate=!1}p=this.type,g.needsUpdate=!1,i.setRenderTarget(S,b,L)};function _(w,R){const C=e.update(v);f.defines.VSM_SAMPLES!==w.blurSamples&&(f.defines.VSM_SAMPLES=w.blurSamples,h.defines.VSM_SAMPLES=w.blurSamples,f.needsUpdate=!0,h.needsUpdate=!0),w.mapPass===null&&(w.mapPass=new _r(r.x,r.y)),f.uniforms.shadow_pass.value=w.map.texture,f.uniforms.resolution.value=w.mapSize,f.uniforms.radius.value=w.radius,i.setRenderTarget(w.mapPass),i.clear(),i.renderBufferDirect(R,null,C,f,v,null),h.uniforms.shadow_pass.value=w.mapPass.texture,h.uniforms.resolution.value=w.mapSize,h.uniforms.radius.value=w.radius,i.setRenderTarget(w.map),i.clear(),i.renderBufferDirect(R,null,C,h,v,null)}function y(w,R,C,S){let b=null;const L=C.isPointLight===!0?w.customDistanceMaterial:w.customDepthMaterial;if(L!==void 0)b=L;else if(b=C.isPointLight===!0?c:o,i.localClippingEnabled&&R.clipShadows===!0&&Array.isArray(R.clippingPlanes)&&R.clippingPlanes.length!==0||R.displacementMap&&R.displacementScale!==0||R.alphaMap&&R.alphaTest>0||R.map&&R.alphaTest>0||R.alphaToCoverage===!0){const D=b.uuid,k=R.uuid;let H=l[D];H===void 0&&(H={},l[D]=H);let X=H[k];X===void 0&&(X=b.clone(),H[k]=X,R.addEventListener("dispose",A)),b=X}if(b.visible=R.visible,b.wireframe=R.wireframe,S===yi?b.side=R.shadowSide!==null?R.shadowSide:R.side:b.side=R.shadowSide!==null?R.shadowSide:d[R.side],b.alphaMap=R.alphaMap,b.alphaTest=R.alphaToCoverage===!0?.5:R.alphaTest,b.map=R.map,b.clipShadows=R.clipShadows,b.clippingPlanes=R.clippingPlanes,b.clipIntersection=R.clipIntersection,b.displacementMap=R.displacementMap,b.displacementScale=R.displacementScale,b.displacementBias=R.displacementBias,b.wireframeLinewidth=R.wireframeLinewidth,b.linewidth=R.linewidth,C.isPointLight===!0&&b.isMeshDistanceMaterial===!0){const D=i.properties.get(b);D.light=C}return b}function x(w,R,C,S,b){if(w.visible===!1)return;if(w.layers.test(R.layers)&&(w.isMesh||w.isLine||w.isPoints)&&(w.castShadow||w.receiveShadow&&b===yi)&&(!w.frustumCulled||n.intersectsObject(w))){w.modelViewMatrix.multiplyMatrices(C.matrixWorldInverse,w.matrixWorld);const k=e.update(w),H=w.material;if(Array.isArray(H)){const X=k.groups;for(let V=0,K=X.length;V<K;V++){const G=X[V],se=H[G.materialIndex];if(se&&se.visible){const me=y(w,se,S,b);w.onBeforeShadow(i,w,R,C,k,me,G),i.renderBufferDirect(C,null,k,me,w,G),w.onAfterShadow(i,w,R,C,k,me,G)}}}else if(H.visible){const X=y(w,H,S,b);w.onBeforeShadow(i,w,R,C,k,X,null),i.renderBufferDirect(C,null,k,X,w,null),w.onAfterShadow(i,w,R,C,k,X,null)}}const D=w.children;for(let k=0,H=D.length;k<H;k++)x(D[k],R,C,S,b)}function A(w){w.target.removeEventListener("dispose",A);for(const C in l){const S=l[C],b=w.target.uuid;b in S&&(S[b].dispose(),delete S[b])}}}const wS={[cl]:ll,[ul]:fl,[dl]:pl,[ts]:hl,[ll]:cl,[fl]:ul,[pl]:dl,[hl]:ts};function ES(i,e){function t(){let N=!1;const oe=new ht;let he=null;const we=new ht(0,0,0,0);return{setMask:function(re){he!==re&&!N&&(i.colorMask(re,re,re,re),he=re)},setLocked:function(re){N=re},setClear:function(re,J,Ce,je,bt){bt===!0&&(re*=je,J*=je,Ce*=je),oe.set(re,J,Ce,je),we.equals(oe)===!1&&(i.clearColor(re,J,Ce,je),we.copy(oe))},reset:function(){N=!1,he=null,we.set(-1,0,0,0)}}}function n(){let N=!1,oe=!1,he=null,we=null,re=null;return{setReversed:function(J){if(oe!==J){const Ce=e.get("EXT_clip_control");J?Ce.clipControlEXT(Ce.LOWER_LEFT_EXT,Ce.ZERO_TO_ONE_EXT):Ce.clipControlEXT(Ce.LOWER_LEFT_EXT,Ce.NEGATIVE_ONE_TO_ONE_EXT),oe=J;const je=re;re=null,this.setClear(je)}},getReversed:function(){return oe},setTest:function(J){J?ee(i.DEPTH_TEST):Me(i.DEPTH_TEST)},setMask:function(J){he!==J&&!N&&(i.depthMask(J),he=J)},setFunc:function(J){if(oe&&(J=wS[J]),we!==J){switch(J){case cl:i.depthFunc(i.NEVER);break;case ll:i.depthFunc(i.ALWAYS);break;case ul:i.depthFunc(i.LESS);break;case ts:i.depthFunc(i.LEQUAL);break;case dl:i.depthFunc(i.EQUAL);break;case hl:i.depthFunc(i.GEQUAL);break;case fl:i.depthFunc(i.GREATER);break;case pl:i.depthFunc(i.NOTEQUAL);break;default:i.depthFunc(i.LEQUAL)}we=J}},setLocked:function(J){N=J},setClear:function(J){re!==J&&(oe&&(J=1-J),i.clearDepth(J),re=J)},reset:function(){N=!1,he=null,we=null,re=null,oe=!1}}}function r(){let N=!1,oe=null,he=null,we=null,re=null,J=null,Ce=null,je=null,bt=null;return{setTest:function(ft){N||(ft?ee(i.STENCIL_TEST):Me(i.STENCIL_TEST))},setMask:function(ft){oe!==ft&&!N&&(i.stencilMask(ft),oe=ft)},setFunc:function(ft,ui,Kn){(he!==ft||we!==ui||re!==Kn)&&(i.stencilFunc(ft,ui,Kn),he=ft,we=ui,re=Kn)},setOp:function(ft,ui,Kn){(J!==ft||Ce!==ui||je!==Kn)&&(i.stencilOp(ft,ui,Kn),J=ft,Ce=ui,je=Kn)},setLocked:function(ft){N=ft},setClear:function(ft){bt!==ft&&(i.clearStencil(ft),bt=ft)},reset:function(){N=!1,oe=null,he=null,we=null,re=null,J=null,Ce=null,je=null,bt=null}}}const s=new t,a=new n,o=new r,c=new WeakMap,l=new WeakMap;let u={},d={},f=new WeakMap,h=[],m=null,v=!1,g=null,p=null,_=null,y=null,x=null,A=null,w=null,R=new We(0,0,0),C=0,S=!1,b=null,L=null,D=null,k=null,H=null;const X=i.getParameter(i.MAX_COMBINED_TEXTURE_IMAGE_UNITS);let V=!1,K=0;const G=i.getParameter(i.VERSION);G.indexOf("WebGL")!==-1?(K=parseFloat(/^WebGL (\d)/.exec(G)[1]),V=K>=1):G.indexOf("OpenGL ES")!==-1&&(K=parseFloat(/^OpenGL ES (\d)/.exec(G)[1]),V=K>=2);let se=null,me={};const _e=i.getParameter(i.SCISSOR_BOX),Be=i.getParameter(i.VIEWPORT),lt=new ht().fromArray(_e),$e=new ht().fromArray(Be);function st(N,oe,he,we){const re=new Uint8Array(4),J=i.createTexture();i.bindTexture(N,J),i.texParameteri(N,i.TEXTURE_MIN_FILTER,i.NEAREST),i.texParameteri(N,i.TEXTURE_MAG_FILTER,i.NEAREST);for(let Ce=0;Ce<he;Ce++)N===i.TEXTURE_3D||N===i.TEXTURE_2D_ARRAY?i.texImage3D(oe,0,i.RGBA,1,1,we,0,i.RGBA,i.UNSIGNED_BYTE,re):i.texImage2D(oe+Ce,0,i.RGBA,1,1,0,i.RGBA,i.UNSIGNED_BYTE,re);return J}const Y={};Y[i.TEXTURE_2D]=st(i.TEXTURE_2D,i.TEXTURE_2D,1),Y[i.TEXTURE_CUBE_MAP]=st(i.TEXTURE_CUBE_MAP,i.TEXTURE_CUBE_MAP_POSITIVE_X,6),Y[i.TEXTURE_2D_ARRAY]=st(i.TEXTURE_2D_ARRAY,i.TEXTURE_2D_ARRAY,1,1),Y[i.TEXTURE_3D]=st(i.TEXTURE_3D,i.TEXTURE_3D,1,1),s.setClear(0,0,0,1),a.setClear(1),o.setClear(0),ee(i.DEPTH_TEST),a.setFunc(ts),ze(!1),Z(md),ee(i.CULL_FACE),St(Gi);function ee(N){u[N]!==!0&&(i.enable(N),u[N]=!0)}function Me(N){u[N]!==!1&&(i.disable(N),u[N]=!1)}function De(N,oe){return d[N]!==oe?(i.bindFramebuffer(N,oe),d[N]=oe,N===i.DRAW_FRAMEBUFFER&&(d[i.FRAMEBUFFER]=oe),N===i.FRAMEBUFFER&&(d[i.DRAW_FRAMEBUFFER]=oe),!0):!1}function be(N,oe){let he=h,we=!1;if(N){he=f.get(oe),he===void 0&&(he=[],f.set(oe,he));const re=N.textures;if(he.length!==re.length||he[0]!==i.COLOR_ATTACHMENT0){for(let J=0,Ce=re.length;J<Ce;J++)he[J]=i.COLOR_ATTACHMENT0+J;he.length=re.length,we=!0}}else he[0]!==i.BACK&&(he[0]=i.BACK,we=!0);we&&i.drawBuffers(he)}function Ze(N){return m!==N?(i.useProgram(N),m=N,!0):!1}const qt={[dr]:i.FUNC_ADD,[cg]:i.FUNC_SUBTRACT,[lg]:i.FUNC_REVERSE_SUBTRACT};qt[ug]=i.MIN,qt[dg]=i.MAX;const I={[hg]:i.ZERO,[fg]:i.ONE,[pg]:i.SRC_COLOR,[al]:i.SRC_ALPHA,[xg]:i.SRC_ALPHA_SATURATE,[_g]:i.DST_COLOR,[gg]:i.DST_ALPHA,[mg]:i.ONE_MINUS_SRC_COLOR,[ol]:i.ONE_MINUS_SRC_ALPHA,[yg]:i.ONE_MINUS_DST_COLOR,[vg]:i.ONE_MINUS_DST_ALPHA,[Mg]:i.CONSTANT_COLOR,[Sg]:i.ONE_MINUS_CONSTANT_COLOR,[bg]:i.CONSTANT_ALPHA,[wg]:i.ONE_MINUS_CONSTANT_ALPHA};function St(N,oe,he,we,re,J,Ce,je,bt,ft){if(N===Gi){v===!0&&(Me(i.BLEND),v=!1);return}if(v===!1&&(ee(i.BLEND),v=!0),N!==og){if(N!==g||ft!==S){if((p!==dr||x!==dr)&&(i.blendEquation(i.FUNC_ADD),p=dr,x=dr),ft)switch(N){case Zr:i.blendFuncSeparate(i.ONE,i.ONE_MINUS_SRC_ALPHA,i.ONE,i.ONE_MINUS_SRC_ALPHA);break;case gd:i.blendFunc(i.ONE,i.ONE);break;case vd:i.blendFuncSeparate(i.ZERO,i.ONE_MINUS_SRC_COLOR,i.ZERO,i.ONE);break;case _d:i.blendFuncSeparate(i.DST_COLOR,i.ONE_MINUS_SRC_ALPHA,i.ZERO,i.ONE);break;default:console.error("THREE.WebGLState: Invalid blending: ",N);break}else switch(N){case Zr:i.blendFuncSeparate(i.SRC_ALPHA,i.ONE_MINUS_SRC_ALPHA,i.ONE,i.ONE_MINUS_SRC_ALPHA);break;case gd:i.blendFuncSeparate(i.SRC_ALPHA,i.ONE,i.ONE,i.ONE);break;case vd:console.error("THREE.WebGLState: SubtractiveBlending requires material.premultipliedAlpha = true");break;case _d:console.error("THREE.WebGLState: MultiplyBlending requires material.premultipliedAlpha = true");break;default:console.error("THREE.WebGLState: Invalid blending: ",N);break}_=null,y=null,A=null,w=null,R.set(0,0,0),C=0,g=N,S=ft}return}re=re||oe,J=J||he,Ce=Ce||we,(oe!==p||re!==x)&&(i.blendEquationSeparate(qt[oe],qt[re]),p=oe,x=re),(he!==_||we!==y||J!==A||Ce!==w)&&(i.blendFuncSeparate(I[he],I[we],I[J],I[Ce]),_=he,y=we,A=J,w=Ce),(je.equals(R)===!1||bt!==C)&&(i.blendColor(je.r,je.g,je.b,bt),R.copy(je),C=bt),g=N,S=!1}function Pe(N,oe){N.side===In?Me(i.CULL_FACE):ee(i.CULL_FACE);let he=N.side===un;oe&&(he=!he),ze(he),N.blending===Zr&&N.transparent===!1?St(Gi):St(N.blending,N.blendEquation,N.blendSrc,N.blendDst,N.blendEquationAlpha,N.blendSrcAlpha,N.blendDstAlpha,N.blendColor,N.blendAlpha,N.premultipliedAlpha),a.setFunc(N.depthFunc),a.setTest(N.depthTest),a.setMask(N.depthWrite),s.setMask(N.colorWrite);const we=N.stencilWrite;o.setTest(we),we&&(o.setMask(N.stencilWriteMask),o.setFunc(N.stencilFunc,N.stencilRef,N.stencilFuncMask),o.setOp(N.stencilFail,N.stencilZFail,N.stencilZPass)),ne(N.polygonOffset,N.polygonOffsetFactor,N.polygonOffsetUnits),N.alphaToCoverage===!0?ee(i.SAMPLE_ALPHA_TO_COVERAGE):Me(i.SAMPLE_ALPHA_TO_COVERAGE)}function ze(N){b!==N&&(N?i.frontFace(i.CW):i.frontFace(i.CCW),b=N)}function Z(N){N!==rg?(ee(i.CULL_FACE),N!==L&&(N===md?i.cullFace(i.BACK):N===sg?i.cullFace(i.FRONT):i.cullFace(i.FRONT_AND_BACK))):Me(i.CULL_FACE),L=N}function le(N){N!==D&&(V&&i.lineWidth(N),D=N)}function ne(N,oe,he){N?(ee(i.POLYGON_OFFSET_FILL),(k!==oe||H!==he)&&(i.polygonOffset(oe,he),k=oe,H=he)):Me(i.POLYGON_OFFSET_FILL)}function te(N){N?ee(i.SCISSOR_TEST):Me(i.SCISSOR_TEST)}function xe(N){N===void 0&&(N=i.TEXTURE0+X-1),se!==N&&(i.activeTexture(N),se=N)}function Ue(N,oe,he){he===void 0&&(se===null?he=i.TEXTURE0+X-1:he=se);let we=me[he];we===void 0&&(we={type:void 0,texture:void 0},me[he]=we),(we.type!==N||we.texture!==oe)&&(se!==he&&(i.activeTexture(he),se=he),i.bindTexture(N,oe||Y[N]),we.type=N,we.texture=oe)}function T(){const N=me[se];N!==void 0&&N.type!==void 0&&(i.bindTexture(N.type,null),N.type=void 0,N.texture=void 0)}function M(){try{i.compressedTexImage2D(...arguments)}catch(N){console.error("THREE.WebGLState:",N)}}function U(){try{i.compressedTexImage3D(...arguments)}catch(N){console.error("THREE.WebGLState:",N)}}function q(){try{i.texSubImage2D(...arguments)}catch(N){console.error("THREE.WebGLState:",N)}}function Q(){try{i.texSubImage3D(...arguments)}catch(N){console.error("THREE.WebGLState:",N)}}function j(){try{i.compressedTexSubImage2D(...arguments)}catch(N){console.error("THREE.WebGLState:",N)}}function Le(){try{i.compressedTexSubImage3D(...arguments)}catch(N){console.error("THREE.WebGLState:",N)}}function ce(){try{i.texStorage2D(...arguments)}catch(N){console.error("THREE.WebGLState:",N)}}function Te(){try{i.texStorage3D(...arguments)}catch(N){console.error("THREE.WebGLState:",N)}}function Re(){try{i.texImage2D(...arguments)}catch(N){console.error("THREE.WebGLState:",N)}}function ie(){try{i.texImage3D(...arguments)}catch(N){console.error("THREE.WebGLState:",N)}}function de(N){lt.equals(N)===!1&&(i.scissor(N.x,N.y,N.z,N.w),lt.copy(N))}function He(N){$e.equals(N)===!1&&(i.viewport(N.x,N.y,N.z,N.w),$e.copy(N))}function Ie(N,oe){let he=l.get(oe);he===void 0&&(he=new WeakMap,l.set(oe,he));let we=he.get(N);we===void 0&&(we=i.getUniformBlockIndex(oe,N.name),he.set(N,we))}function ge(N,oe){const we=l.get(oe).get(N);c.get(oe)!==we&&(i.uniformBlockBinding(oe,we,N.__bindingPointIndex),c.set(oe,we))}function Je(){i.disable(i.BLEND),i.disable(i.CULL_FACE),i.disable(i.DEPTH_TEST),i.disable(i.POLYGON_OFFSET_FILL),i.disable(i.SCISSOR_TEST),i.disable(i.STENCIL_TEST),i.disable(i.SAMPLE_ALPHA_TO_COVERAGE),i.blendEquation(i.FUNC_ADD),i.blendFunc(i.ONE,i.ZERO),i.blendFuncSeparate(i.ONE,i.ZERO,i.ONE,i.ZERO),i.blendColor(0,0,0,0),i.colorMask(!0,!0,!0,!0),i.clearColor(0,0,0,0),i.depthMask(!0),i.depthFunc(i.LESS),a.setReversed(!1),i.clearDepth(1),i.stencilMask(4294967295),i.stencilFunc(i.ALWAYS,0,4294967295),i.stencilOp(i.KEEP,i.KEEP,i.KEEP),i.clearStencil(0),i.cullFace(i.BACK),i.frontFace(i.CCW),i.polygonOffset(0,0),i.activeTexture(i.TEXTURE0),i.bindFramebuffer(i.FRAMEBUFFER,null),i.bindFramebuffer(i.DRAW_FRAMEBUFFER,null),i.bindFramebuffer(i.READ_FRAMEBUFFER,null),i.useProgram(null),i.lineWidth(1),i.scissor(0,0,i.canvas.width,i.canvas.height),i.viewport(0,0,i.canvas.width,i.canvas.height),u={},se=null,me={},d={},f=new WeakMap,h=[],m=null,v=!1,g=null,p=null,_=null,y=null,x=null,A=null,w=null,R=new We(0,0,0),C=0,S=!1,b=null,L=null,D=null,k=null,H=null,lt.set(0,0,i.canvas.width,i.canvas.height),$e.set(0,0,i.canvas.width,i.canvas.height),s.reset(),a.reset(),o.reset()}return{buffers:{color:s,depth:a,stencil:o},enable:ee,disable:Me,bindFramebuffer:De,drawBuffers:be,useProgram:Ze,setBlending:St,setMaterial:Pe,setFlipSided:ze,setCullFace:Z,setLineWidth:le,setPolygonOffset:ne,setScissorTest:te,activeTexture:xe,bindTexture:Ue,unbindTexture:T,compressedTexImage2D:M,compressedTexImage3D:U,texImage2D:Re,texImage3D:ie,updateUBOMapping:Ie,uniformBlockBinding:ge,texStorage2D:ce,texStorage3D:Te,texSubImage2D:q,texSubImage3D:Q,compressedTexSubImage2D:j,compressedTexSubImage3D:Le,scissor:de,viewport:He,reset:Je}}function TS(i,e,t,n,r,s,a){const o=e.has("WEBGL_multisampled_render_to_texture")?e.get("WEBGL_multisampled_render_to_texture"):null,c=typeof navigator>"u"?!1:/OculusBrowser/g.test(navigator.userAgent),l=new ue,u=new WeakMap;let d;const f=new WeakMap;let h=!1;try{h=typeof OffscreenCanvas<"u"&&new OffscreenCanvas(1,1).getContext("2d")!==null}catch{}function m(T,M){return h?new OffscreenCanvas(T,M):ra("canvas")}function v(T,M,U){let q=1;const Q=Ue(T);if((Q.width>U||Q.height>U)&&(q=U/Math.max(Q.width,Q.height)),q<1)if(typeof HTMLImageElement<"u"&&T instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&T instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&T instanceof ImageBitmap||typeof VideoFrame<"u"&&T instanceof VideoFrame){const j=Math.floor(q*Q.width),Le=Math.floor(q*Q.height);d===void 0&&(d=m(j,Le));const ce=M?m(j,Le):d;return ce.width=j,ce.height=Le,ce.getContext("2d").drawImage(T,0,0,j,Le),console.warn("THREE.WebGLRenderer: Texture has been resized from ("+Q.width+"x"+Q.height+") to ("+j+"x"+Le+")."),ce}else return"data"in T&&console.warn("THREE.WebGLRenderer: Image in DataTexture is too big ("+Q.width+"x"+Q.height+")."),T;return T}function g(T){return T.generateMipmaps}function p(T){i.generateMipmap(T)}function _(T){return T.isWebGLCubeRenderTarget?i.TEXTURE_CUBE_MAP:T.isWebGL3DRenderTarget?i.TEXTURE_3D:T.isWebGLArrayRenderTarget||T.isCompressedArrayTexture?i.TEXTURE_2D_ARRAY:i.TEXTURE_2D}function y(T,M,U,q,Q=!1){if(T!==null){if(i[T]!==void 0)return i[T];console.warn("THREE.WebGLRenderer: Attempt to use non-existing WebGL internal format '"+T+"'")}let j=M;if(M===i.RED&&(U===i.FLOAT&&(j=i.R32F),U===i.HALF_FLOAT&&(j=i.R16F),U===i.UNSIGNED_BYTE&&(j=i.R8)),M===i.RED_INTEGER&&(U===i.UNSIGNED_BYTE&&(j=i.R8UI),U===i.UNSIGNED_SHORT&&(j=i.R16UI),U===i.UNSIGNED_INT&&(j=i.R32UI),U===i.BYTE&&(j=i.R8I),U===i.SHORT&&(j=i.R16I),U===i.INT&&(j=i.R32I)),M===i.RG&&(U===i.FLOAT&&(j=i.RG32F),U===i.HALF_FLOAT&&(j=i.RG16F),U===i.UNSIGNED_BYTE&&(j=i.RG8)),M===i.RG_INTEGER&&(U===i.UNSIGNED_BYTE&&(j=i.RG8UI),U===i.UNSIGNED_SHORT&&(j=i.RG16UI),U===i.UNSIGNED_INT&&(j=i.RG32UI),U===i.BYTE&&(j=i.RG8I),U===i.SHORT&&(j=i.RG16I),U===i.INT&&(j=i.RG32I)),M===i.RGB_INTEGER&&(U===i.UNSIGNED_BYTE&&(j=i.RGB8UI),U===i.UNSIGNED_SHORT&&(j=i.RGB16UI),U===i.UNSIGNED_INT&&(j=i.RGB32UI),U===i.BYTE&&(j=i.RGB8I),U===i.SHORT&&(j=i.RGB16I),U===i.INT&&(j=i.RGB32I)),M===i.RGBA_INTEGER&&(U===i.UNSIGNED_BYTE&&(j=i.RGBA8UI),U===i.UNSIGNED_SHORT&&(j=i.RGBA16UI),U===i.UNSIGNED_INT&&(j=i.RGBA32UI),U===i.BYTE&&(j=i.RGBA8I),U===i.SHORT&&(j=i.RGBA16I),U===i.INT&&(j=i.RGBA32I)),M===i.RGB&&(U===i.UNSIGNED_INT_5_9_9_9_REV&&(j=i.RGB9_E5),U===i.UNSIGNED_INT_10F_11F_11F_REV&&(j=i.R11F_G11F_B10F)),M===i.RGBA){const Le=Q?Mo:at.getTransfer(q);U===i.FLOAT&&(j=i.RGBA32F),U===i.HALF_FLOAT&&(j=i.RGBA16F),U===i.UNSIGNED_BYTE&&(j=Le===_t?i.SRGB8_ALPHA8:i.RGBA8),U===i.UNSIGNED_SHORT_4_4_4_4&&(j=i.RGBA4),U===i.UNSIGNED_SHORT_5_5_5_1&&(j=i.RGB5_A1)}return(j===i.R16F||j===i.R32F||j===i.RG16F||j===i.RG32F||j===i.RGBA16F||j===i.RGBA32F)&&e.get("EXT_color_buffer_float"),j}function x(T,M){let U;return T?M===null||M===vr||M===Qs?U=i.DEPTH24_STENCIL8:M===Gn?U=i.DEPTH32F_STENCIL8:M===Js&&(U=i.DEPTH24_STENCIL8,console.warn("DepthTexture: 16 bit depth attachment is not supported with stencil. Using 24-bit attachment.")):M===null||M===vr||M===Qs?U=i.DEPTH_COMPONENT24:M===Gn?U=i.DEPTH_COMPONENT32F:M===Js&&(U=i.DEPTH_COMPONENT16),U}function A(T,M){return g(T)===!0||T.isFramebufferTexture&&T.minFilter!==dn&&T.minFilter!==En?Math.log2(Math.max(M.width,M.height))+1:T.mipmaps!==void 0&&T.mipmaps.length>0?T.mipmaps.length:T.isCompressedTexture&&Array.isArray(T.image)?M.mipmaps.length:1}function w(T){const M=T.target;M.removeEventListener("dispose",w),C(M),M.isVideoTexture&&u.delete(M)}function R(T){const M=T.target;M.removeEventListener("dispose",R),b(M)}function C(T){const M=n.get(T);if(M.__webglInit===void 0)return;const U=T.source,q=f.get(U);if(q){const Q=q[M.__cacheKey];Q.usedTimes--,Q.usedTimes===0&&S(T),Object.keys(q).length===0&&f.delete(U)}n.remove(T)}function S(T){const M=n.get(T);i.deleteTexture(M.__webglTexture);const U=T.source,q=f.get(U);delete q[M.__cacheKey],a.memory.textures--}function b(T){const M=n.get(T);if(T.depthTexture&&(T.depthTexture.dispose(),n.remove(T.depthTexture)),T.isWebGLCubeRenderTarget)for(let q=0;q<6;q++){if(Array.isArray(M.__webglFramebuffer[q]))for(let Q=0;Q<M.__webglFramebuffer[q].length;Q++)i.deleteFramebuffer(M.__webglFramebuffer[q][Q]);else i.deleteFramebuffer(M.__webglFramebuffer[q]);M.__webglDepthbuffer&&i.deleteRenderbuffer(M.__webglDepthbuffer[q])}else{if(Array.isArray(M.__webglFramebuffer))for(let q=0;q<M.__webglFramebuffer.length;q++)i.deleteFramebuffer(M.__webglFramebuffer[q]);else i.deleteFramebuffer(M.__webglFramebuffer);if(M.__webglDepthbuffer&&i.deleteRenderbuffer(M.__webglDepthbuffer),M.__webglMultisampledFramebuffer&&i.deleteFramebuffer(M.__webglMultisampledFramebuffer),M.__webglColorRenderbuffer)for(let q=0;q<M.__webglColorRenderbuffer.length;q++)M.__webglColorRenderbuffer[q]&&i.deleteRenderbuffer(M.__webglColorRenderbuffer[q]);M.__webglDepthRenderbuffer&&i.deleteRenderbuffer(M.__webglDepthRenderbuffer)}const U=T.textures;for(let q=0,Q=U.length;q<Q;q++){const j=n.get(U[q]);j.__webglTexture&&(i.deleteTexture(j.__webglTexture),a.memory.textures--),n.remove(U[q])}n.remove(T)}let L=0;function D(){L=0}function k(){const T=L;return T>=r.maxTextures&&console.warn("THREE.WebGLTextures: Trying to use "+T+" texture units while this GPU supports only "+r.maxTextures),L+=1,T}function H(T){const M=[];return M.push(T.wrapS),M.push(T.wrapT),M.push(T.wrapR||0),M.push(T.magFilter),M.push(T.minFilter),M.push(T.anisotropy),M.push(T.internalFormat),M.push(T.format),M.push(T.type),M.push(T.generateMipmaps),M.push(T.premultiplyAlpha),M.push(T.flipY),M.push(T.unpackAlignment),M.push(T.colorSpace),M.join()}function X(T,M){const U=n.get(T);if(T.isVideoTexture&&te(T),T.isRenderTargetTexture===!1&&T.isExternalTexture!==!0&&T.version>0&&U.__version!==T.version){const q=T.image;if(q===null)console.warn("THREE.WebGLRenderer: Texture marked for update but no image data found.");else if(q.complete===!1)console.warn("THREE.WebGLRenderer: Texture marked for update but image is incomplete");else{Y(U,T,M);return}}else T.isExternalTexture&&(U.__webglTexture=T.sourceTexture?T.sourceTexture:null);t.bindTexture(i.TEXTURE_2D,U.__webglTexture,i.TEXTURE0+M)}function V(T,M){const U=n.get(T);if(T.isRenderTargetTexture===!1&&T.version>0&&U.__version!==T.version){Y(U,T,M);return}t.bindTexture(i.TEXTURE_2D_ARRAY,U.__webglTexture,i.TEXTURE0+M)}function K(T,M){const U=n.get(T);if(T.isRenderTargetTexture===!1&&T.version>0&&U.__version!==T.version){Y(U,T,M);return}t.bindTexture(i.TEXTURE_3D,U.__webglTexture,i.TEXTURE0+M)}function G(T,M){const U=n.get(T);if(T.version>0&&U.__version!==T.version){ee(U,T,M);return}t.bindTexture(i.TEXTURE_CUBE_MAP,U.__webglTexture,i.TEXTURE0+M)}const se={[rs]:i.REPEAT,[Hi]:i.CLAMP_TO_EDGE,[xo]:i.MIRRORED_REPEAT},me={[dn]:i.NEAREST,[bf]:i.NEAREST_MIPMAP_NEAREST,[Us]:i.NEAREST_MIPMAP_LINEAR,[En]:i.LINEAR,[lo]:i.LINEAR_MIPMAP_NEAREST,[Si]:i.LINEAR_MIPMAP_LINEAR},_e={[kg]:i.NEVER,[$g]:i.ALWAYS,[zg]:i.LESS,[If]:i.LEQUAL,[Hg]:i.EQUAL,[Wg]:i.GEQUAL,[Vg]:i.GREATER,[Gg]:i.NOTEQUAL};function Be(T,M){if(M.type===Gn&&e.has("OES_texture_float_linear")===!1&&(M.magFilter===En||M.magFilter===lo||M.magFilter===Us||M.magFilter===Si||M.minFilter===En||M.minFilter===lo||M.minFilter===Us||M.minFilter===Si)&&console.warn("THREE.WebGLRenderer: Unable to use linear filtering with floating point textures. OES_texture_float_linear not supported on this device."),i.texParameteri(T,i.TEXTURE_WRAP_S,se[M.wrapS]),i.texParameteri(T,i.TEXTURE_WRAP_T,se[M.wrapT]),(T===i.TEXTURE_3D||T===i.TEXTURE_2D_ARRAY)&&i.texParameteri(T,i.TEXTURE_WRAP_R,se[M.wrapR]),i.texParameteri(T,i.TEXTURE_MAG_FILTER,me[M.magFilter]),i.texParameteri(T,i.TEXTURE_MIN_FILTER,me[M.minFilter]),M.compareFunction&&(i.texParameteri(T,i.TEXTURE_COMPARE_MODE,i.COMPARE_REF_TO_TEXTURE),i.texParameteri(T,i.TEXTURE_COMPARE_FUNC,_e[M.compareFunction])),e.has("EXT_texture_filter_anisotropic")===!0){if(M.magFilter===dn||M.minFilter!==Us&&M.minFilter!==Si||M.type===Gn&&e.has("OES_texture_float_linear")===!1)return;if(M.anisotropy>1||n.get(M).__currentAnisotropy){const U=e.get("EXT_texture_filter_anisotropic");i.texParameterf(T,U.TEXTURE_MAX_ANISOTROPY_EXT,Math.min(M.anisotropy,r.getMaxAnisotropy())),n.get(M).__currentAnisotropy=M.anisotropy}}}function lt(T,M){let U=!1;T.__webglInit===void 0&&(T.__webglInit=!0,M.addEventListener("dispose",w));const q=M.source;let Q=f.get(q);Q===void 0&&(Q={},f.set(q,Q));const j=H(M);if(j!==T.__cacheKey){Q[j]===void 0&&(Q[j]={texture:i.createTexture(),usedTimes:0},a.memory.textures++,U=!0),Q[j].usedTimes++;const Le=Q[T.__cacheKey];Le!==void 0&&(Q[T.__cacheKey].usedTimes--,Le.usedTimes===0&&S(M)),T.__cacheKey=j,T.__webglTexture=Q[j].texture}return U}function $e(T,M,U){return Math.floor(Math.floor(T/U)/M)}function st(T,M,U,q){const j=T.updateRanges;if(j.length===0)t.texSubImage2D(i.TEXTURE_2D,0,0,0,M.width,M.height,U,q,M.data);else{j.sort((ie,de)=>ie.start-de.start);let Le=0;for(let ie=1;ie<j.length;ie++){const de=j[Le],He=j[ie],Ie=de.start+de.count,ge=$e(He.start,M.width,4),Je=$e(de.start,M.width,4);He.start<=Ie+1&&ge===Je&&$e(He.start+He.count-1,M.width,4)===ge?de.count=Math.max(de.count,He.start+He.count-de.start):(++Le,j[Le]=He)}j.length=Le+1;const ce=i.getParameter(i.UNPACK_ROW_LENGTH),Te=i.getParameter(i.UNPACK_SKIP_PIXELS),Re=i.getParameter(i.UNPACK_SKIP_ROWS);i.pixelStorei(i.UNPACK_ROW_LENGTH,M.width);for(let ie=0,de=j.length;ie<de;ie++){const He=j[ie],Ie=Math.floor(He.start/4),ge=Math.ceil(He.count/4),Je=Ie%M.width,N=Math.floor(Ie/M.width),oe=ge,he=1;i.pixelStorei(i.UNPACK_SKIP_PIXELS,Je),i.pixelStorei(i.UNPACK_SKIP_ROWS,N),t.texSubImage2D(i.TEXTURE_2D,0,Je,N,oe,he,U,q,M.data)}T.clearUpdateRanges(),i.pixelStorei(i.UNPACK_ROW_LENGTH,ce),i.pixelStorei(i.UNPACK_SKIP_PIXELS,Te),i.pixelStorei(i.UNPACK_SKIP_ROWS,Re)}}function Y(T,M,U){let q=i.TEXTURE_2D;(M.isDataArrayTexture||M.isCompressedArrayTexture)&&(q=i.TEXTURE_2D_ARRAY),M.isData3DTexture&&(q=i.TEXTURE_3D);const Q=lt(T,M),j=M.source;t.bindTexture(q,T.__webglTexture,i.TEXTURE0+U);const Le=n.get(j);if(j.version!==Le.__version||Q===!0){t.activeTexture(i.TEXTURE0+U);const ce=at.getPrimaries(at.workingColorSpace),Te=M.colorSpace===zi?null:at.getPrimaries(M.colorSpace),Re=M.colorSpace===zi||ce===Te?i.NONE:i.BROWSER_DEFAULT_WEBGL;i.pixelStorei(i.UNPACK_FLIP_Y_WEBGL,M.flipY),i.pixelStorei(i.UNPACK_PREMULTIPLY_ALPHA_WEBGL,M.premultiplyAlpha),i.pixelStorei(i.UNPACK_ALIGNMENT,M.unpackAlignment),i.pixelStorei(i.UNPACK_COLORSPACE_CONVERSION_WEBGL,Re);let ie=v(M.image,!1,r.maxTextureSize);ie=xe(M,ie);const de=s.convert(M.format,M.colorSpace),He=s.convert(M.type);let Ie=y(M.internalFormat,de,He,M.colorSpace,M.isVideoTexture);Be(q,M);let ge;const Je=M.mipmaps,N=M.isVideoTexture!==!0,oe=Le.__version===void 0||Q===!0,he=j.dataReady,we=A(M,ie);if(M.isDepthTexture)Ie=x(M.format===ta,M.type),oe&&(N?t.texStorage2D(i.TEXTURE_2D,1,Ie,ie.width,ie.height):t.texImage2D(i.TEXTURE_2D,0,Ie,ie.width,ie.height,0,de,He,null));else if(M.isDataTexture)if(Je.length>0){N&&oe&&t.texStorage2D(i.TEXTURE_2D,we,Ie,Je[0].width,Je[0].height);for(let re=0,J=Je.length;re<J;re++)ge=Je[re],N?he&&t.texSubImage2D(i.TEXTURE_2D,re,0,0,ge.width,ge.height,de,He,ge.data):t.texImage2D(i.TEXTURE_2D,re,Ie,ge.width,ge.height,0,de,He,ge.data);M.generateMipmaps=!1}else N?(oe&&t.texStorage2D(i.TEXTURE_2D,we,Ie,ie.width,ie.height),he&&st(M,ie,de,He)):t.texImage2D(i.TEXTURE_2D,0,Ie,ie.width,ie.height,0,de,He,ie.data);else if(M.isCompressedTexture)if(M.isCompressedArrayTexture){N&&oe&&t.texStorage3D(i.TEXTURE_2D_ARRAY,we,Ie,Je[0].width,Je[0].height,ie.depth);for(let re=0,J=Je.length;re<J;re++)if(ge=Je[re],M.format!==Un)if(de!==null)if(N){if(he)if(M.layerUpdates.size>0){const Ce=ph(ge.width,ge.height,M.format,M.type);for(const je of M.layerUpdates){const bt=ge.data.subarray(je*Ce/ge.data.BYTES_PER_ELEMENT,(je+1)*Ce/ge.data.BYTES_PER_ELEMENT);t.compressedTexSubImage3D(i.TEXTURE_2D_ARRAY,re,0,0,je,ge.width,ge.height,1,de,bt)}M.clearLayerUpdates()}else t.compressedTexSubImage3D(i.TEXTURE_2D_ARRAY,re,0,0,0,ge.width,ge.height,ie.depth,de,ge.data)}else t.compressedTexImage3D(i.TEXTURE_2D_ARRAY,re,Ie,ge.width,ge.height,ie.depth,0,ge.data,0,0);else console.warn("THREE.WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()");else N?he&&t.texSubImage3D(i.TEXTURE_2D_ARRAY,re,0,0,0,ge.width,ge.height,ie.depth,de,He,ge.data):t.texImage3D(i.TEXTURE_2D_ARRAY,re,Ie,ge.width,ge.height,ie.depth,0,de,He,ge.data)}else{N&&oe&&t.texStorage2D(i.TEXTURE_2D,we,Ie,Je[0].width,Je[0].height);for(let re=0,J=Je.length;re<J;re++)ge=Je[re],M.format!==Un?de!==null?N?he&&t.compressedTexSubImage2D(i.TEXTURE_2D,re,0,0,ge.width,ge.height,de,ge.data):t.compressedTexImage2D(i.TEXTURE_2D,re,Ie,ge.width,ge.height,0,ge.data):console.warn("THREE.WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()"):N?he&&t.texSubImage2D(i.TEXTURE_2D,re,0,0,ge.width,ge.height,de,He,ge.data):t.texImage2D(i.TEXTURE_2D,re,Ie,ge.width,ge.height,0,de,He,ge.data)}else if(M.isDataArrayTexture)if(N){if(oe&&t.texStorage3D(i.TEXTURE_2D_ARRAY,we,Ie,ie.width,ie.height,ie.depth),he)if(M.layerUpdates.size>0){const re=ph(ie.width,ie.height,M.format,M.type);for(const J of M.layerUpdates){const Ce=ie.data.subarray(J*re/ie.data.BYTES_PER_ELEMENT,(J+1)*re/ie.data.BYTES_PER_ELEMENT);t.texSubImage3D(i.TEXTURE_2D_ARRAY,0,0,0,J,ie.width,ie.height,1,de,He,Ce)}M.clearLayerUpdates()}else t.texSubImage3D(i.TEXTURE_2D_ARRAY,0,0,0,0,ie.width,ie.height,ie.depth,de,He,ie.data)}else t.texImage3D(i.TEXTURE_2D_ARRAY,0,Ie,ie.width,ie.height,ie.depth,0,de,He,ie.data);else if(M.isData3DTexture)N?(oe&&t.texStorage3D(i.TEXTURE_3D,we,Ie,ie.width,ie.height,ie.depth),he&&t.texSubImage3D(i.TEXTURE_3D,0,0,0,0,ie.width,ie.height,ie.depth,de,He,ie.data)):t.texImage3D(i.TEXTURE_3D,0,Ie,ie.width,ie.height,ie.depth,0,de,He,ie.data);else if(M.isFramebufferTexture){if(oe)if(N)t.texStorage2D(i.TEXTURE_2D,we,Ie,ie.width,ie.height);else{let re=ie.width,J=ie.height;for(let Ce=0;Ce<we;Ce++)t.texImage2D(i.TEXTURE_2D,Ce,Ie,re,J,0,de,He,null),re>>=1,J>>=1}}else if(Je.length>0){if(N&&oe){const re=Ue(Je[0]);t.texStorage2D(i.TEXTURE_2D,we,Ie,re.width,re.height)}for(let re=0,J=Je.length;re<J;re++)ge=Je[re],N?he&&t.texSubImage2D(i.TEXTURE_2D,re,0,0,de,He,ge):t.texImage2D(i.TEXTURE_2D,re,Ie,de,He,ge);M.generateMipmaps=!1}else if(N){if(oe){const re=Ue(ie);t.texStorage2D(i.TEXTURE_2D,we,Ie,re.width,re.height)}he&&t.texSubImage2D(i.TEXTURE_2D,0,0,0,de,He,ie)}else t.texImage2D(i.TEXTURE_2D,0,Ie,de,He,ie);g(M)&&p(q),Le.__version=j.version,M.onUpdate&&M.onUpdate(M)}T.__version=M.version}function ee(T,M,U){if(M.image.length!==6)return;const q=lt(T,M),Q=M.source;t.bindTexture(i.TEXTURE_CUBE_MAP,T.__webglTexture,i.TEXTURE0+U);const j=n.get(Q);if(Q.version!==j.__version||q===!0){t.activeTexture(i.TEXTURE0+U);const Le=at.getPrimaries(at.workingColorSpace),ce=M.colorSpace===zi?null:at.getPrimaries(M.colorSpace),Te=M.colorSpace===zi||Le===ce?i.NONE:i.BROWSER_DEFAULT_WEBGL;i.pixelStorei(i.UNPACK_FLIP_Y_WEBGL,M.flipY),i.pixelStorei(i.UNPACK_PREMULTIPLY_ALPHA_WEBGL,M.premultiplyAlpha),i.pixelStorei(i.UNPACK_ALIGNMENT,M.unpackAlignment),i.pixelStorei(i.UNPACK_COLORSPACE_CONVERSION_WEBGL,Te);const Re=M.isCompressedTexture||M.image[0].isCompressedTexture,ie=M.image[0]&&M.image[0].isDataTexture,de=[];for(let J=0;J<6;J++)!Re&&!ie?de[J]=v(M.image[J],!0,r.maxCubemapSize):de[J]=ie?M.image[J].image:M.image[J],de[J]=xe(M,de[J]);const He=de[0],Ie=s.convert(M.format,M.colorSpace),ge=s.convert(M.type),Je=y(M.internalFormat,Ie,ge,M.colorSpace),N=M.isVideoTexture!==!0,oe=j.__version===void 0||q===!0,he=Q.dataReady;let we=A(M,He);Be(i.TEXTURE_CUBE_MAP,M);let re;if(Re){N&&oe&&t.texStorage2D(i.TEXTURE_CUBE_MAP,we,Je,He.width,He.height);for(let J=0;J<6;J++){re=de[J].mipmaps;for(let Ce=0;Ce<re.length;Ce++){const je=re[Ce];M.format!==Un?Ie!==null?N?he&&t.compressedTexSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+J,Ce,0,0,je.width,je.height,Ie,je.data):t.compressedTexImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+J,Ce,Je,je.width,je.height,0,je.data):console.warn("THREE.WebGLRenderer: Attempt to load unsupported compressed texture format in .setTextureCube()"):N?he&&t.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+J,Ce,0,0,je.width,je.height,Ie,ge,je.data):t.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+J,Ce,Je,je.width,je.height,0,Ie,ge,je.data)}}}else{if(re=M.mipmaps,N&&oe){re.length>0&&we++;const J=Ue(de[0]);t.texStorage2D(i.TEXTURE_CUBE_MAP,we,Je,J.width,J.height)}for(let J=0;J<6;J++)if(ie){N?he&&t.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+J,0,0,0,de[J].width,de[J].height,Ie,ge,de[J].data):t.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+J,0,Je,de[J].width,de[J].height,0,Ie,ge,de[J].data);for(let Ce=0;Ce<re.length;Ce++){const bt=re[Ce].image[J].image;N?he&&t.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+J,Ce+1,0,0,bt.width,bt.height,Ie,ge,bt.data):t.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+J,Ce+1,Je,bt.width,bt.height,0,Ie,ge,bt.data)}}else{N?he&&t.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+J,0,0,0,Ie,ge,de[J]):t.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+J,0,Je,Ie,ge,de[J]);for(let Ce=0;Ce<re.length;Ce++){const je=re[Ce];N?he&&t.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+J,Ce+1,0,0,Ie,ge,je.image[J]):t.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+J,Ce+1,Je,Ie,ge,je.image[J])}}}g(M)&&p(i.TEXTURE_CUBE_MAP),j.__version=Q.version,M.onUpdate&&M.onUpdate(M)}T.__version=M.version}function Me(T,M,U,q,Q,j){const Le=s.convert(U.format,U.colorSpace),ce=s.convert(U.type),Te=y(U.internalFormat,Le,ce,U.colorSpace),Re=n.get(M),ie=n.get(U);if(ie.__renderTarget=M,!Re.__hasExternalTextures){const de=Math.max(1,M.width>>j),He=Math.max(1,M.height>>j);Q===i.TEXTURE_3D||Q===i.TEXTURE_2D_ARRAY?t.texImage3D(Q,j,Te,de,He,M.depth,0,Le,ce,null):t.texImage2D(Q,j,Te,de,He,0,Le,ce,null)}t.bindFramebuffer(i.FRAMEBUFFER,T),ne(M)?o.framebufferTexture2DMultisampleEXT(i.FRAMEBUFFER,q,Q,ie.__webglTexture,0,le(M)):(Q===i.TEXTURE_2D||Q>=i.TEXTURE_CUBE_MAP_POSITIVE_X&&Q<=i.TEXTURE_CUBE_MAP_NEGATIVE_Z)&&i.framebufferTexture2D(i.FRAMEBUFFER,q,Q,ie.__webglTexture,j),t.bindFramebuffer(i.FRAMEBUFFER,null)}function De(T,M,U){if(i.bindRenderbuffer(i.RENDERBUFFER,T),M.depthBuffer){const q=M.depthTexture,Q=q&&q.isDepthTexture?q.type:null,j=x(M.stencilBuffer,Q),Le=M.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT,ce=le(M);ne(M)?o.renderbufferStorageMultisampleEXT(i.RENDERBUFFER,ce,j,M.width,M.height):U?i.renderbufferStorageMultisample(i.RENDERBUFFER,ce,j,M.width,M.height):i.renderbufferStorage(i.RENDERBUFFER,j,M.width,M.height),i.framebufferRenderbuffer(i.FRAMEBUFFER,Le,i.RENDERBUFFER,T)}else{const q=M.textures;for(let Q=0;Q<q.length;Q++){const j=q[Q],Le=s.convert(j.format,j.colorSpace),ce=s.convert(j.type),Te=y(j.internalFormat,Le,ce,j.colorSpace),Re=le(M);U&&ne(M)===!1?i.renderbufferStorageMultisample(i.RENDERBUFFER,Re,Te,M.width,M.height):ne(M)?o.renderbufferStorageMultisampleEXT(i.RENDERBUFFER,Re,Te,M.width,M.height):i.renderbufferStorage(i.RENDERBUFFER,Te,M.width,M.height)}}i.bindRenderbuffer(i.RENDERBUFFER,null)}function be(T,M){if(M&&M.isWebGLCubeRenderTarget)throw new Error("Depth Texture with cube render targets is not supported");if(t.bindFramebuffer(i.FRAMEBUFFER,T),!(M.depthTexture&&M.depthTexture.isDepthTexture))throw new Error("renderTarget.depthTexture must be an instance of THREE.DepthTexture");const q=n.get(M.depthTexture);q.__renderTarget=M,(!q.__webglTexture||M.depthTexture.image.width!==M.width||M.depthTexture.image.height!==M.height)&&(M.depthTexture.image.width=M.width,M.depthTexture.image.height=M.height,M.depthTexture.needsUpdate=!0),X(M.depthTexture,0);const Q=q.__webglTexture,j=le(M);if(M.depthTexture.format===ea)ne(M)?o.framebufferTexture2DMultisampleEXT(i.FRAMEBUFFER,i.DEPTH_ATTACHMENT,i.TEXTURE_2D,Q,0,j):i.framebufferTexture2D(i.FRAMEBUFFER,i.DEPTH_ATTACHMENT,i.TEXTURE_2D,Q,0);else if(M.depthTexture.format===ta)ne(M)?o.framebufferTexture2DMultisampleEXT(i.FRAMEBUFFER,i.DEPTH_STENCIL_ATTACHMENT,i.TEXTURE_2D,Q,0,j):i.framebufferTexture2D(i.FRAMEBUFFER,i.DEPTH_STENCIL_ATTACHMENT,i.TEXTURE_2D,Q,0);else throw new Error("Unknown depthTexture format")}function Ze(T){const M=n.get(T),U=T.isWebGLCubeRenderTarget===!0;if(M.__boundDepthTexture!==T.depthTexture){const q=T.depthTexture;if(M.__depthDisposeCallback&&M.__depthDisposeCallback(),q){const Q=()=>{delete M.__boundDepthTexture,delete M.__depthDisposeCallback,q.removeEventListener("dispose",Q)};q.addEventListener("dispose",Q),M.__depthDisposeCallback=Q}M.__boundDepthTexture=q}if(T.depthTexture&&!M.__autoAllocateDepthBuffer){if(U)throw new Error("target.depthTexture not supported in Cube render targets");const q=T.texture.mipmaps;q&&q.length>0?be(M.__webglFramebuffer[0],T):be(M.__webglFramebuffer,T)}else if(U){M.__webglDepthbuffer=[];for(let q=0;q<6;q++)if(t.bindFramebuffer(i.FRAMEBUFFER,M.__webglFramebuffer[q]),M.__webglDepthbuffer[q]===void 0)M.__webglDepthbuffer[q]=i.createRenderbuffer(),De(M.__webglDepthbuffer[q],T,!1);else{const Q=T.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT,j=M.__webglDepthbuffer[q];i.bindRenderbuffer(i.RENDERBUFFER,j),i.framebufferRenderbuffer(i.FRAMEBUFFER,Q,i.RENDERBUFFER,j)}}else{const q=T.texture.mipmaps;if(q&&q.length>0?t.bindFramebuffer(i.FRAMEBUFFER,M.__webglFramebuffer[0]):t.bindFramebuffer(i.FRAMEBUFFER,M.__webglFramebuffer),M.__webglDepthbuffer===void 0)M.__webglDepthbuffer=i.createRenderbuffer(),De(M.__webglDepthbuffer,T,!1);else{const Q=T.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT,j=M.__webglDepthbuffer;i.bindRenderbuffer(i.RENDERBUFFER,j),i.framebufferRenderbuffer(i.FRAMEBUFFER,Q,i.RENDERBUFFER,j)}}t.bindFramebuffer(i.FRAMEBUFFER,null)}function qt(T,M,U){const q=n.get(T);M!==void 0&&Me(q.__webglFramebuffer,T,T.texture,i.COLOR_ATTACHMENT0,i.TEXTURE_2D,0),U!==void 0&&Ze(T)}function I(T){const M=T.texture,U=n.get(T),q=n.get(M);T.addEventListener("dispose",R);const Q=T.textures,j=T.isWebGLCubeRenderTarget===!0,Le=Q.length>1;if(Le||(q.__webglTexture===void 0&&(q.__webglTexture=i.createTexture()),q.__version=M.version,a.memory.textures++),j){U.__webglFramebuffer=[];for(let ce=0;ce<6;ce++)if(M.mipmaps&&M.mipmaps.length>0){U.__webglFramebuffer[ce]=[];for(let Te=0;Te<M.mipmaps.length;Te++)U.__webglFramebuffer[ce][Te]=i.createFramebuffer()}else U.__webglFramebuffer[ce]=i.createFramebuffer()}else{if(M.mipmaps&&M.mipmaps.length>0){U.__webglFramebuffer=[];for(let ce=0;ce<M.mipmaps.length;ce++)U.__webglFramebuffer[ce]=i.createFramebuffer()}else U.__webglFramebuffer=i.createFramebuffer();if(Le)for(let ce=0,Te=Q.length;ce<Te;ce++){const Re=n.get(Q[ce]);Re.__webglTexture===void 0&&(Re.__webglTexture=i.createTexture(),a.memory.textures++)}if(T.samples>0&&ne(T)===!1){U.__webglMultisampledFramebuffer=i.createFramebuffer(),U.__webglColorRenderbuffer=[],t.bindFramebuffer(i.FRAMEBUFFER,U.__webglMultisampledFramebuffer);for(let ce=0;ce<Q.length;ce++){const Te=Q[ce];U.__webglColorRenderbuffer[ce]=i.createRenderbuffer(),i.bindRenderbuffer(i.RENDERBUFFER,U.__webglColorRenderbuffer[ce]);const Re=s.convert(Te.format,Te.colorSpace),ie=s.convert(Te.type),de=y(Te.internalFormat,Re,ie,Te.colorSpace,T.isXRRenderTarget===!0),He=le(T);i.renderbufferStorageMultisample(i.RENDERBUFFER,He,de,T.width,T.height),i.framebufferRenderbuffer(i.FRAMEBUFFER,i.COLOR_ATTACHMENT0+ce,i.RENDERBUFFER,U.__webglColorRenderbuffer[ce])}i.bindRenderbuffer(i.RENDERBUFFER,null),T.depthBuffer&&(U.__webglDepthRenderbuffer=i.createRenderbuffer(),De(U.__webglDepthRenderbuffer,T,!0)),t.bindFramebuffer(i.FRAMEBUFFER,null)}}if(j){t.bindTexture(i.TEXTURE_CUBE_MAP,q.__webglTexture),Be(i.TEXTURE_CUBE_MAP,M);for(let ce=0;ce<6;ce++)if(M.mipmaps&&M.mipmaps.length>0)for(let Te=0;Te<M.mipmaps.length;Te++)Me(U.__webglFramebuffer[ce][Te],T,M,i.COLOR_ATTACHMENT0,i.TEXTURE_CUBE_MAP_POSITIVE_X+ce,Te);else Me(U.__webglFramebuffer[ce],T,M,i.COLOR_ATTACHMENT0,i.TEXTURE_CUBE_MAP_POSITIVE_X+ce,0);g(M)&&p(i.TEXTURE_CUBE_MAP),t.unbindTexture()}else if(Le){for(let ce=0,Te=Q.length;ce<Te;ce++){const Re=Q[ce],ie=n.get(Re);let de=i.TEXTURE_2D;(T.isWebGL3DRenderTarget||T.isWebGLArrayRenderTarget)&&(de=T.isWebGL3DRenderTarget?i.TEXTURE_3D:i.TEXTURE_2D_ARRAY),t.bindTexture(de,ie.__webglTexture),Be(de,Re),Me(U.__webglFramebuffer,T,Re,i.COLOR_ATTACHMENT0+ce,de,0),g(Re)&&p(de)}t.unbindTexture()}else{let ce=i.TEXTURE_2D;if((T.isWebGL3DRenderTarget||T.isWebGLArrayRenderTarget)&&(ce=T.isWebGL3DRenderTarget?i.TEXTURE_3D:i.TEXTURE_2D_ARRAY),t.bindTexture(ce,q.__webglTexture),Be(ce,M),M.mipmaps&&M.mipmaps.length>0)for(let Te=0;Te<M.mipmaps.length;Te++)Me(U.__webglFramebuffer[Te],T,M,i.COLOR_ATTACHMENT0,ce,Te);else Me(U.__webglFramebuffer,T,M,i.COLOR_ATTACHMENT0,ce,0);g(M)&&p(ce),t.unbindTexture()}T.depthBuffer&&Ze(T)}function St(T){const M=T.textures;for(let U=0,q=M.length;U<q;U++){const Q=M[U];if(g(Q)){const j=_(T),Le=n.get(Q).__webglTexture;t.bindTexture(j,Le),p(j),t.unbindTexture()}}}const Pe=[],ze=[];function Z(T){if(T.samples>0){if(ne(T)===!1){const M=T.textures,U=T.width,q=T.height;let Q=i.COLOR_BUFFER_BIT;const j=T.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT,Le=n.get(T),ce=M.length>1;if(ce)for(let Re=0;Re<M.length;Re++)t.bindFramebuffer(i.FRAMEBUFFER,Le.__webglMultisampledFramebuffer),i.framebufferRenderbuffer(i.FRAMEBUFFER,i.COLOR_ATTACHMENT0+Re,i.RENDERBUFFER,null),t.bindFramebuffer(i.FRAMEBUFFER,Le.__webglFramebuffer),i.framebufferTexture2D(i.DRAW_FRAMEBUFFER,i.COLOR_ATTACHMENT0+Re,i.TEXTURE_2D,null,0);t.bindFramebuffer(i.READ_FRAMEBUFFER,Le.__webglMultisampledFramebuffer);const Te=T.texture.mipmaps;Te&&Te.length>0?t.bindFramebuffer(i.DRAW_FRAMEBUFFER,Le.__webglFramebuffer[0]):t.bindFramebuffer(i.DRAW_FRAMEBUFFER,Le.__webglFramebuffer);for(let Re=0;Re<M.length;Re++){if(T.resolveDepthBuffer&&(T.depthBuffer&&(Q|=i.DEPTH_BUFFER_BIT),T.stencilBuffer&&T.resolveStencilBuffer&&(Q|=i.STENCIL_BUFFER_BIT)),ce){i.framebufferRenderbuffer(i.READ_FRAMEBUFFER,i.COLOR_ATTACHMENT0,i.RENDERBUFFER,Le.__webglColorRenderbuffer[Re]);const ie=n.get(M[Re]).__webglTexture;i.framebufferTexture2D(i.DRAW_FRAMEBUFFER,i.COLOR_ATTACHMENT0,i.TEXTURE_2D,ie,0)}i.blitFramebuffer(0,0,U,q,0,0,U,q,Q,i.NEAREST),c===!0&&(Pe.length=0,ze.length=0,Pe.push(i.COLOR_ATTACHMENT0+Re),T.depthBuffer&&T.resolveDepthBuffer===!1&&(Pe.push(j),ze.push(j),i.invalidateFramebuffer(i.DRAW_FRAMEBUFFER,ze)),i.invalidateFramebuffer(i.READ_FRAMEBUFFER,Pe))}if(t.bindFramebuffer(i.READ_FRAMEBUFFER,null),t.bindFramebuffer(i.DRAW_FRAMEBUFFER,null),ce)for(let Re=0;Re<M.length;Re++){t.bindFramebuffer(i.FRAMEBUFFER,Le.__webglMultisampledFramebuffer),i.framebufferRenderbuffer(i.FRAMEBUFFER,i.COLOR_ATTACHMENT0+Re,i.RENDERBUFFER,Le.__webglColorRenderbuffer[Re]);const ie=n.get(M[Re]).__webglTexture;t.bindFramebuffer(i.FRAMEBUFFER,Le.__webglFramebuffer),i.framebufferTexture2D(i.DRAW_FRAMEBUFFER,i.COLOR_ATTACHMENT0+Re,i.TEXTURE_2D,ie,0)}t.bindFramebuffer(i.DRAW_FRAMEBUFFER,Le.__webglMultisampledFramebuffer)}else if(T.depthBuffer&&T.resolveDepthBuffer===!1&&c){const M=T.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT;i.invalidateFramebuffer(i.DRAW_FRAMEBUFFER,[M])}}}function le(T){return Math.min(r.maxSamples,T.samples)}function ne(T){const M=n.get(T);return T.samples>0&&e.has("WEBGL_multisampled_render_to_texture")===!0&&M.__useRenderToTexture!==!1}function te(T){const M=a.render.frame;u.get(T)!==M&&(u.set(T,M),T.update())}function xe(T,M){const U=T.colorSpace,q=T.format,Q=T.type;return T.isCompressedTexture===!0||T.isVideoTexture===!0||U!==fn&&U!==zi&&(at.getTransfer(U)===_t?(q!==Un||Q!==ai)&&console.warn("THREE.WebGLTextures: sRGB encoded textures have to use RGBAFormat and UnsignedByteType."):console.error("THREE.WebGLTextures: Unsupported texture color space:",U)),M}function Ue(T){return typeof HTMLImageElement<"u"&&T instanceof HTMLImageElement?(l.width=T.naturalWidth||T.width,l.height=T.naturalHeight||T.height):typeof VideoFrame<"u"&&T instanceof VideoFrame?(l.width=T.displayWidth,l.height=T.displayHeight):(l.width=T.width,l.height=T.height),l}this.allocateTextureUnit=k,this.resetTextureUnits=D,this.setTexture2D=X,this.setTexture2DArray=V,this.setTexture3D=K,this.setTextureCube=G,this.rebindTextures=qt,this.setupRenderTarget=I,this.updateRenderTargetMipmap=St,this.updateMultisampleRenderTarget=Z,this.setupDepthRenderbuffer=Ze,this.setupFrameBufferTexture=Me,this.useMultisampledRTT=ne}function AS(i,e){function t(n,r=zi){let s;const a=at.getTransfer(r);if(n===ai)return i.UNSIGNED_BYTE;if(n===Mu)return i.UNSIGNED_SHORT_4_4_4_4;if(n===Su)return i.UNSIGNED_SHORT_5_5_5_1;if(n===Tf)return i.UNSIGNED_INT_5_9_9_9_REV;if(n===Af)return i.UNSIGNED_INT_10F_11F_11F_REV;if(n===wf)return i.BYTE;if(n===Ef)return i.SHORT;if(n===Js)return i.UNSIGNED_SHORT;if(n===xu)return i.INT;if(n===vr)return i.UNSIGNED_INT;if(n===Gn)return i.FLOAT;if(n===ma)return i.HALF_FLOAT;if(n===Rf)return i.ALPHA;if(n===Cf)return i.RGB;if(n===Un)return i.RGBA;if(n===ea)return i.DEPTH_COMPONENT;if(n===ta)return i.DEPTH_STENCIL;if(n===bu)return i.RED;if(n===wu)return i.RED_INTEGER;if(n===Lf)return i.RG;if(n===Eu)return i.RG_INTEGER;if(n===Tu)return i.RGBA_INTEGER;if(n===uo||n===ho||n===fo||n===po)if(a===_t)if(s=e.get("WEBGL_compressed_texture_s3tc_srgb"),s!==null){if(n===uo)return s.COMPRESSED_SRGB_S3TC_DXT1_EXT;if(n===ho)return s.COMPRESSED_SRGB_ALPHA_S3TC_DXT1_EXT;if(n===fo)return s.COMPRESSED_SRGB_ALPHA_S3TC_DXT3_EXT;if(n===po)return s.COMPRESSED_SRGB_ALPHA_S3TC_DXT5_EXT}else return null;else if(s=e.get("WEBGL_compressed_texture_s3tc"),s!==null){if(n===uo)return s.COMPRESSED_RGB_S3TC_DXT1_EXT;if(n===ho)return s.COMPRESSED_RGBA_S3TC_DXT1_EXT;if(n===fo)return s.COMPRESSED_RGBA_S3TC_DXT3_EXT;if(n===po)return s.COMPRESSED_RGBA_S3TC_DXT5_EXT}else return null;if(n===vl||n===_l||n===yl||n===xl)if(s=e.get("WEBGL_compressed_texture_pvrtc"),s!==null){if(n===vl)return s.COMPRESSED_RGB_PVRTC_4BPPV1_IMG;if(n===_l)return s.COMPRESSED_RGB_PVRTC_2BPPV1_IMG;if(n===yl)return s.COMPRESSED_RGBA_PVRTC_4BPPV1_IMG;if(n===xl)return s.COMPRESSED_RGBA_PVRTC_2BPPV1_IMG}else return null;if(n===Ml||n===Sl||n===bl)if(s=e.get("WEBGL_compressed_texture_etc"),s!==null){if(n===Ml||n===Sl)return a===_t?s.COMPRESSED_SRGB8_ETC2:s.COMPRESSED_RGB8_ETC2;if(n===bl)return a===_t?s.COMPRESSED_SRGB8_ALPHA8_ETC2_EAC:s.COMPRESSED_RGBA8_ETC2_EAC}else return null;if(n===wl||n===El||n===Tl||n===Al||n===Rl||n===Cl||n===Ll||n===Pl||n===Il||n===Dl||n===Nl||n===Ul||n===Fl||n===Ol)if(s=e.get("WEBGL_compressed_texture_astc"),s!==null){if(n===wl)return a===_t?s.COMPRESSED_SRGB8_ALPHA8_ASTC_4x4_KHR:s.COMPRESSED_RGBA_ASTC_4x4_KHR;if(n===El)return a===_t?s.COMPRESSED_SRGB8_ALPHA8_ASTC_5x4_KHR:s.COMPRESSED_RGBA_ASTC_5x4_KHR;if(n===Tl)return a===_t?s.COMPRESSED_SRGB8_ALPHA8_ASTC_5x5_KHR:s.COMPRESSED_RGBA_ASTC_5x5_KHR;if(n===Al)return a===_t?s.COMPRESSED_SRGB8_ALPHA8_ASTC_6x5_KHR:s.COMPRESSED_RGBA_ASTC_6x5_KHR;if(n===Rl)return a===_t?s.COMPRESSED_SRGB8_ALPHA8_ASTC_6x6_KHR:s.COMPRESSED_RGBA_ASTC_6x6_KHR;if(n===Cl)return a===_t?s.COMPRESSED_SRGB8_ALPHA8_ASTC_8x5_KHR:s.COMPRESSED_RGBA_ASTC_8x5_KHR;if(n===Ll)return a===_t?s.COMPRESSED_SRGB8_ALPHA8_ASTC_8x6_KHR:s.COMPRESSED_RGBA_ASTC_8x6_KHR;if(n===Pl)return a===_t?s.COMPRESSED_SRGB8_ALPHA8_ASTC_8x8_KHR:s.COMPRESSED_RGBA_ASTC_8x8_KHR;if(n===Il)return a===_t?s.COMPRESSED_SRGB8_ALPHA8_ASTC_10x5_KHR:s.COMPRESSED_RGBA_ASTC_10x5_KHR;if(n===Dl)return a===_t?s.COMPRESSED_SRGB8_ALPHA8_ASTC_10x6_KHR:s.COMPRESSED_RGBA_ASTC_10x6_KHR;if(n===Nl)return a===_t?s.COMPRESSED_SRGB8_ALPHA8_ASTC_10x8_KHR:s.COMPRESSED_RGBA_ASTC_10x8_KHR;if(n===Ul)return a===_t?s.COMPRESSED_SRGB8_ALPHA8_ASTC_10x10_KHR:s.COMPRESSED_RGBA_ASTC_10x10_KHR;if(n===Fl)return a===_t?s.COMPRESSED_SRGB8_ALPHA8_ASTC_12x10_KHR:s.COMPRESSED_RGBA_ASTC_12x10_KHR;if(n===Ol)return a===_t?s.COMPRESSED_SRGB8_ALPHA8_ASTC_12x12_KHR:s.COMPRESSED_RGBA_ASTC_12x12_KHR}else return null;if(n===Bl||n===kl||n===zl)if(s=e.get("EXT_texture_compression_bptc"),s!==null){if(n===Bl)return a===_t?s.COMPRESSED_SRGB_ALPHA_BPTC_UNORM_EXT:s.COMPRESSED_RGBA_BPTC_UNORM_EXT;if(n===kl)return s.COMPRESSED_RGB_BPTC_SIGNED_FLOAT_EXT;if(n===zl)return s.COMPRESSED_RGB_BPTC_UNSIGNED_FLOAT_EXT}else return null;if(n===Hl||n===Vl||n===Gl||n===Wl)if(s=e.get("EXT_texture_compression_rgtc"),s!==null){if(n===Hl)return s.COMPRESSED_RED_RGTC1_EXT;if(n===Vl)return s.COMPRESSED_SIGNED_RED_RGTC1_EXT;if(n===Gl)return s.COMPRESSED_RED_GREEN_RGTC2_EXT;if(n===Wl)return s.COMPRESSED_SIGNED_RED_GREEN_RGTC2_EXT}else return null;return n===Qs?i.UNSIGNED_INT_24_8:i[n]!==void 0?i[n]:null}return{convert:t}}const RS=`
void main() {

	gl_Position = vec4( position, 1.0 );

}`,CS=`
uniform sampler2DArray depthColor;
uniform float depthWidth;
uniform float depthHeight;

void main() {

	vec2 coord = vec2( gl_FragCoord.x / depthWidth, gl_FragCoord.y / depthHeight );

	if ( coord.x >= 1.0 ) {

		gl_FragDepth = texture( depthColor, vec3( coord.x - 1.0, coord.y, 1 ) ).r;

	} else {

		gl_FragDepth = texture( depthColor, vec3( coord.x, coord.y, 0 ) ).r;

	}

}`;class LS{constructor(){this.texture=null,this.mesh=null,this.depthNear=0,this.depthFar=0}init(e,t){if(this.texture===null){const n=new Zf(e.texture);(e.depthNear!==t.depthNear||e.depthFar!==t.depthFar)&&(this.depthNear=e.depthNear,this.depthFar=e.depthFar),this.texture=n}}getMesh(e){if(this.texture!==null&&this.mesh===null){const t=e.cameras[0].viewport,n=new ji({vertexShader:RS,fragmentShader:CS,uniforms:{depthColor:{value:this.texture},depthWidth:{value:t.z},depthHeight:{value:t.w}}});this.mesh=new Tt(new Bo(20,20),n)}return this.mesh}reset(){this.texture=null,this.mesh=null}getDepthTexture(){return this.texture}}class PS extends fs{constructor(e,t){super();const n=this;let r=null,s=1,a=null,o="local-floor",c=1,l=null,u=null,d=null,f=null,h=null,m=null;const v=typeof XRWebGLBinding<"u",g=new LS,p={},_=t.getContextAttributes();let y=null,x=null;const A=[],w=[],R=new ue;let C=null;const S=new nn;S.viewport=new ht;const b=new nn;b.viewport=new ht;const L=[S,b],D=new Gv;let k=null,H=null;this.cameraAutoUpdate=!0,this.enabled=!1,this.isPresenting=!1,this.getController=function(Y){let ee=A[Y];return ee===void 0&&(ee=new Ac,A[Y]=ee),ee.getTargetRaySpace()},this.getControllerGrip=function(Y){let ee=A[Y];return ee===void 0&&(ee=new Ac,A[Y]=ee),ee.getGripSpace()},this.getHand=function(Y){let ee=A[Y];return ee===void 0&&(ee=new Ac,A[Y]=ee),ee.getHandSpace()};function X(Y){const ee=w.indexOf(Y.inputSource);if(ee===-1)return;const Me=A[ee];Me!==void 0&&(Me.update(Y.inputSource,Y.frame,l||a),Me.dispatchEvent({type:Y.type,data:Y.inputSource}))}function V(){r.removeEventListener("select",X),r.removeEventListener("selectstart",X),r.removeEventListener("selectend",X),r.removeEventListener("squeeze",X),r.removeEventListener("squeezestart",X),r.removeEventListener("squeezeend",X),r.removeEventListener("end",V),r.removeEventListener("inputsourceschange",K);for(let Y=0;Y<A.length;Y++){const ee=w[Y];ee!==null&&(w[Y]=null,A[Y].disconnect(ee))}k=null,H=null,g.reset();for(const Y in p)delete p[Y];e.setRenderTarget(y),h=null,f=null,d=null,r=null,x=null,st.stop(),n.isPresenting=!1,e.setPixelRatio(C),e.setSize(R.width,R.height,!1),n.dispatchEvent({type:"sessionend"})}this.setFramebufferScaleFactor=function(Y){s=Y,n.isPresenting===!0&&console.warn("THREE.WebXRManager: Cannot change framebuffer scale while presenting.")},this.setReferenceSpaceType=function(Y){o=Y,n.isPresenting===!0&&console.warn("THREE.WebXRManager: Cannot change reference space type while presenting.")},this.getReferenceSpace=function(){return l||a},this.setReferenceSpace=function(Y){l=Y},this.getBaseLayer=function(){return f!==null?f:h},this.getBinding=function(){return d===null&&v&&(d=new XRWebGLBinding(r,t)),d},this.getFrame=function(){return m},this.getSession=function(){return r},this.setSession=async function(Y){if(r=Y,r!==null){if(y=e.getRenderTarget(),r.addEventListener("select",X),r.addEventListener("selectstart",X),r.addEventListener("selectend",X),r.addEventListener("squeeze",X),r.addEventListener("squeezestart",X),r.addEventListener("squeezeend",X),r.addEventListener("end",V),r.addEventListener("inputsourceschange",K),_.xrCompatible!==!0&&await t.makeXRCompatible(),C=e.getPixelRatio(),e.getSize(R),v&&"createProjectionLayer"in XRWebGLBinding.prototype){let Me=null,De=null,be=null;_.depth&&(be=_.stencil?t.DEPTH24_STENCIL8:t.DEPTH_COMPONENT24,Me=_.stencil?ta:ea,De=_.stencil?Qs:vr);const Ze={colorFormat:t.RGBA8,depthFormat:be,scaleFactor:s};d=this.getBinding(),f=d.createProjectionLayer(Ze),r.updateRenderState({layers:[f]}),e.setPixelRatio(1),e.setSize(f.textureWidth,f.textureHeight,!1),x=new _r(f.textureWidth,f.textureHeight,{format:Un,type:ai,depthTexture:new Kf(f.textureWidth,f.textureHeight,De,void 0,void 0,void 0,void 0,void 0,void 0,Me),stencilBuffer:_.stencil,colorSpace:e.outputColorSpace,samples:_.antialias?4:0,resolveDepthBuffer:f.ignoreDepthValues===!1,resolveStencilBuffer:f.ignoreDepthValues===!1})}else{const Me={antialias:_.antialias,alpha:!0,depth:_.depth,stencil:_.stencil,framebufferScaleFactor:s};h=new XRWebGLLayer(r,t,Me),r.updateRenderState({baseLayer:h}),e.setPixelRatio(1),e.setSize(h.framebufferWidth,h.framebufferHeight,!1),x=new _r(h.framebufferWidth,h.framebufferHeight,{format:Un,type:ai,colorSpace:e.outputColorSpace,stencilBuffer:_.stencil,resolveDepthBuffer:h.ignoreDepthValues===!1,resolveStencilBuffer:h.ignoreDepthValues===!1})}x.isXRRenderTarget=!0,this.setFoveation(c),l=null,a=await r.requestReferenceSpace(o),st.setContext(r),st.start(),n.isPresenting=!0,n.dispatchEvent({type:"sessionstart"})}},this.getEnvironmentBlendMode=function(){if(r!==null)return r.environmentBlendMode},this.getDepthTexture=function(){return g.getDepthTexture()};function K(Y){for(let ee=0;ee<Y.removed.length;ee++){const Me=Y.removed[ee],De=w.indexOf(Me);De>=0&&(w[De]=null,A[De].disconnect(Me))}for(let ee=0;ee<Y.added.length;ee++){const Me=Y.added[ee];let De=w.indexOf(Me);if(De===-1){for(let Ze=0;Ze<A.length;Ze++)if(Ze>=w.length){w.push(Me),De=Ze;break}else if(w[Ze]===null){w[Ze]=Me,De=Ze;break}if(De===-1)break}const be=A[De];be&&be.connect(Me)}}const G=new P,se=new P;function me(Y,ee,Me){G.setFromMatrixPosition(ee.matrixWorld),se.setFromMatrixPosition(Me.matrixWorld);const De=G.distanceTo(se),be=ee.projectionMatrix.elements,Ze=Me.projectionMatrix.elements,qt=be[14]/(be[10]-1),I=be[14]/(be[10]+1),St=(be[9]+1)/be[5],Pe=(be[9]-1)/be[5],ze=(be[8]-1)/be[0],Z=(Ze[8]+1)/Ze[0],le=qt*ze,ne=qt*Z,te=De/(-ze+Z),xe=te*-ze;if(ee.matrixWorld.decompose(Y.position,Y.quaternion,Y.scale),Y.translateX(xe),Y.translateZ(te),Y.matrixWorld.compose(Y.position,Y.quaternion,Y.scale),Y.matrixWorldInverse.copy(Y.matrixWorld).invert(),be[10]===-1)Y.projectionMatrix.copy(ee.projectionMatrix),Y.projectionMatrixInverse.copy(ee.projectionMatrixInverse);else{const Ue=qt+te,T=I+te,M=le-xe,U=ne+(De-xe),q=St*I/T*Ue,Q=Pe*I/T*Ue;Y.projectionMatrix.makePerspective(M,U,q,Q,Ue,T),Y.projectionMatrixInverse.copy(Y.projectionMatrix).invert()}}function _e(Y,ee){ee===null?Y.matrixWorld.copy(Y.matrix):Y.matrixWorld.multiplyMatrices(ee.matrixWorld,Y.matrix),Y.matrixWorldInverse.copy(Y.matrixWorld).invert()}this.updateCamera=function(Y){if(r===null)return;let ee=Y.near,Me=Y.far;g.texture!==null&&(g.depthNear>0&&(ee=g.depthNear),g.depthFar>0&&(Me=g.depthFar)),D.near=b.near=S.near=ee,D.far=b.far=S.far=Me,(k!==D.near||H!==D.far)&&(r.updateRenderState({depthNear:D.near,depthFar:D.far}),k=D.near,H=D.far),D.layers.mask=Y.layers.mask|6,S.layers.mask=D.layers.mask&3,b.layers.mask=D.layers.mask&5;const De=Y.parent,be=D.cameras;_e(D,De);for(let Ze=0;Ze<be.length;Ze++)_e(be[Ze],De);be.length===2?me(D,S,b):D.projectionMatrix.copy(S.projectionMatrix),Be(Y,D,De)};function Be(Y,ee,Me){Me===null?Y.matrix.copy(ee.matrixWorld):(Y.matrix.copy(Me.matrixWorld),Y.matrix.invert(),Y.matrix.multiply(ee.matrixWorld)),Y.matrix.decompose(Y.position,Y.quaternion,Y.scale),Y.updateMatrixWorld(!0),Y.projectionMatrix.copy(ee.projectionMatrix),Y.projectionMatrixInverse.copy(ee.projectionMatrixInverse),Y.isPerspectiveCamera&&(Y.fov=ss*2*Math.atan(1/Y.projectionMatrix.elements[5]),Y.zoom=1)}this.getCamera=function(){return D},this.getFoveation=function(){if(!(f===null&&h===null))return c},this.setFoveation=function(Y){c=Y,f!==null&&(f.fixedFoveation=Y),h!==null&&h.fixedFoveation!==void 0&&(h.fixedFoveation=Y)},this.hasDepthSensing=function(){return g.texture!==null},this.getDepthSensingMesh=function(){return g.getMesh(D)},this.getCameraTexture=function(Y){return p[Y]};let lt=null;function $e(Y,ee){if(u=ee.getViewerPose(l||a),m=ee,u!==null){const Me=u.views;h!==null&&(e.setRenderTargetFramebuffer(x,h.framebuffer),e.setRenderTarget(x));let De=!1;Me.length!==D.cameras.length&&(D.cameras.length=0,De=!0);for(let I=0;I<Me.length;I++){const St=Me[I];let Pe=null;if(h!==null)Pe=h.getViewport(St);else{const Z=d.getViewSubImage(f,St);Pe=Z.viewport,I===0&&(e.setRenderTargetTextures(x,Z.colorTexture,Z.depthStencilTexture),e.setRenderTarget(x))}let ze=L[I];ze===void 0&&(ze=new nn,ze.layers.enable(I),ze.viewport=new ht,L[I]=ze),ze.matrix.fromArray(St.transform.matrix),ze.matrix.decompose(ze.position,ze.quaternion,ze.scale),ze.projectionMatrix.fromArray(St.projectionMatrix),ze.projectionMatrixInverse.copy(ze.projectionMatrix).invert(),ze.viewport.set(Pe.x,Pe.y,Pe.width,Pe.height),I===0&&(D.matrix.copy(ze.matrix),D.matrix.decompose(D.position,D.quaternion,D.scale)),De===!0&&D.cameras.push(ze)}const be=r.enabledFeatures;if(be&&be.includes("depth-sensing")&&r.depthUsage=="gpu-optimized"&&v){d=n.getBinding();const I=d.getDepthInformation(Me[0]);I&&I.isValid&&I.texture&&g.init(I,r.renderState)}if(be&&be.includes("camera-access")&&v){e.state.unbindTexture(),d=n.getBinding();for(let I=0;I<Me.length;I++){const St=Me[I].camera;if(St){let Pe=p[St];Pe||(Pe=new Zf,p[St]=Pe);const ze=d.getCameraImage(St);Pe.sourceTexture=ze}}}}for(let Me=0;Me<A.length;Me++){const De=w[Me],be=A[Me];De!==null&&be!==void 0&&be.update(De,ee,l||a)}lt&&lt(Y,ee),ee.detectedPlanes&&n.dispatchEvent({type:"planesdetected",data:ee}),m=null}const st=new pp;st.setAnimationLoop($e),this.setAnimationLoop=function(Y){lt=Y},this.dispose=function(){}}}const or=new qn,IS=new Ke;function DS(i,e){function t(g,p){g.matrixAutoUpdate===!0&&g.updateMatrix(),p.value.copy(g.matrix)}function n(g,p){p.color.getRGB(g.fogColor.value,kf(i)),p.isFog?(g.fogNear.value=p.near,g.fogFar.value=p.far):p.isFogExp2&&(g.fogDensity.value=p.density)}function r(g,p,_,y,x){p.isMeshBasicMaterial||p.isMeshLambertMaterial?s(g,p):p.isMeshToonMaterial?(s(g,p),d(g,p)):p.isMeshPhongMaterial?(s(g,p),u(g,p)):p.isMeshStandardMaterial?(s(g,p),f(g,p),p.isMeshPhysicalMaterial&&h(g,p,x)):p.isMeshMatcapMaterial?(s(g,p),m(g,p)):p.isMeshDepthMaterial?s(g,p):p.isMeshDistanceMaterial?(s(g,p),v(g,p)):p.isMeshNormalMaterial?s(g,p):p.isLineBasicMaterial?(a(g,p),p.isLineDashedMaterial&&o(g,p)):p.isPointsMaterial?c(g,p,_,y):p.isSpriteMaterial?l(g,p):p.isShadowMaterial?(g.color.value.copy(p.color),g.opacity.value=p.opacity):p.isShaderMaterial&&(p.uniformsNeedUpdate=!1)}function s(g,p){g.opacity.value=p.opacity,p.color&&g.diffuse.value.copy(p.color),p.emissive&&g.emissive.value.copy(p.emissive).multiplyScalar(p.emissiveIntensity),p.map&&(g.map.value=p.map,t(p.map,g.mapTransform)),p.alphaMap&&(g.alphaMap.value=p.alphaMap,t(p.alphaMap,g.alphaMapTransform)),p.bumpMap&&(g.bumpMap.value=p.bumpMap,t(p.bumpMap,g.bumpMapTransform),g.bumpScale.value=p.bumpScale,p.side===un&&(g.bumpScale.value*=-1)),p.normalMap&&(g.normalMap.value=p.normalMap,t(p.normalMap,g.normalMapTransform),g.normalScale.value.copy(p.normalScale),p.side===un&&g.normalScale.value.negate()),p.displacementMap&&(g.displacementMap.value=p.displacementMap,t(p.displacementMap,g.displacementMapTransform),g.displacementScale.value=p.displacementScale,g.displacementBias.value=p.displacementBias),p.emissiveMap&&(g.emissiveMap.value=p.emissiveMap,t(p.emissiveMap,g.emissiveMapTransform)),p.specularMap&&(g.specularMap.value=p.specularMap,t(p.specularMap,g.specularMapTransform)),p.alphaTest>0&&(g.alphaTest.value=p.alphaTest);const _=e.get(p),y=_.envMap,x=_.envMapRotation;y&&(g.envMap.value=y,or.copy(x),or.x*=-1,or.y*=-1,or.z*=-1,y.isCubeTexture&&y.isRenderTargetTexture===!1&&(or.y*=-1,or.z*=-1),g.envMapRotation.value.setFromMatrix4(IS.makeRotationFromEuler(or)),g.flipEnvMap.value=y.isCubeTexture&&y.isRenderTargetTexture===!1?-1:1,g.reflectivity.value=p.reflectivity,g.ior.value=p.ior,g.refractionRatio.value=p.refractionRatio),p.lightMap&&(g.lightMap.value=p.lightMap,g.lightMapIntensity.value=p.lightMapIntensity,t(p.lightMap,g.lightMapTransform)),p.aoMap&&(g.aoMap.value=p.aoMap,g.aoMapIntensity.value=p.aoMapIntensity,t(p.aoMap,g.aoMapTransform))}function a(g,p){g.diffuse.value.copy(p.color),g.opacity.value=p.opacity,p.map&&(g.map.value=p.map,t(p.map,g.mapTransform))}function o(g,p){g.dashSize.value=p.dashSize,g.totalSize.value=p.dashSize+p.gapSize,g.scale.value=p.scale}function c(g,p,_,y){g.diffuse.value.copy(p.color),g.opacity.value=p.opacity,g.size.value=p.size*_,g.scale.value=y*.5,p.map&&(g.map.value=p.map,t(p.map,g.uvTransform)),p.alphaMap&&(g.alphaMap.value=p.alphaMap,t(p.alphaMap,g.alphaMapTransform)),p.alphaTest>0&&(g.alphaTest.value=p.alphaTest)}function l(g,p){g.diffuse.value.copy(p.color),g.opacity.value=p.opacity,g.rotation.value=p.rotation,p.map&&(g.map.value=p.map,t(p.map,g.mapTransform)),p.alphaMap&&(g.alphaMap.value=p.alphaMap,t(p.alphaMap,g.alphaMapTransform)),p.alphaTest>0&&(g.alphaTest.value=p.alphaTest)}function u(g,p){g.specular.value.copy(p.specular),g.shininess.value=Math.max(p.shininess,1e-4)}function d(g,p){p.gradientMap&&(g.gradientMap.value=p.gradientMap)}function f(g,p){g.metalness.value=p.metalness,p.metalnessMap&&(g.metalnessMap.value=p.metalnessMap,t(p.metalnessMap,g.metalnessMapTransform)),g.roughness.value=p.roughness,p.roughnessMap&&(g.roughnessMap.value=p.roughnessMap,t(p.roughnessMap,g.roughnessMapTransform)),p.envMap&&(g.envMapIntensity.value=p.envMapIntensity)}function h(g,p,_){g.ior.value=p.ior,p.sheen>0&&(g.sheenColor.value.copy(p.sheenColor).multiplyScalar(p.sheen),g.sheenRoughness.value=p.sheenRoughness,p.sheenColorMap&&(g.sheenColorMap.value=p.sheenColorMap,t(p.sheenColorMap,g.sheenColorMapTransform)),p.sheenRoughnessMap&&(g.sheenRoughnessMap.value=p.sheenRoughnessMap,t(p.sheenRoughnessMap,g.sheenRoughnessMapTransform))),p.clearcoat>0&&(g.clearcoat.value=p.clearcoat,g.clearcoatRoughness.value=p.clearcoatRoughness,p.clearcoatMap&&(g.clearcoatMap.value=p.clearcoatMap,t(p.clearcoatMap,g.clearcoatMapTransform)),p.clearcoatRoughnessMap&&(g.clearcoatRoughnessMap.value=p.clearcoatRoughnessMap,t(p.clearcoatRoughnessMap,g.clearcoatRoughnessMapTransform)),p.clearcoatNormalMap&&(g.clearcoatNormalMap.value=p.clearcoatNormalMap,t(p.clearcoatNormalMap,g.clearcoatNormalMapTransform),g.clearcoatNormalScale.value.copy(p.clearcoatNormalScale),p.side===un&&g.clearcoatNormalScale.value.negate())),p.dispersion>0&&(g.dispersion.value=p.dispersion),p.iridescence>0&&(g.iridescence.value=p.iridescence,g.iridescenceIOR.value=p.iridescenceIOR,g.iridescenceThicknessMinimum.value=p.iridescenceThicknessRange[0],g.iridescenceThicknessMaximum.value=p.iridescenceThicknessRange[1],p.iridescenceMap&&(g.iridescenceMap.value=p.iridescenceMap,t(p.iridescenceMap,g.iridescenceMapTransform)),p.iridescenceThicknessMap&&(g.iridescenceThicknessMap.value=p.iridescenceThicknessMap,t(p.iridescenceThicknessMap,g.iridescenceThicknessMapTransform))),p.transmission>0&&(g.transmission.value=p.transmission,g.transmissionSamplerMap.value=_.texture,g.transmissionSamplerSize.value.set(_.width,_.height),p.transmissionMap&&(g.transmissionMap.value=p.transmissionMap,t(p.transmissionMap,g.transmissionMapTransform)),g.thickness.value=p.thickness,p.thicknessMap&&(g.thicknessMap.value=p.thicknessMap,t(p.thicknessMap,g.thicknessMapTransform)),g.attenuationDistance.value=p.attenuationDistance,g.attenuationColor.value.copy(p.attenuationColor)),p.anisotropy>0&&(g.anisotropyVector.value.set(p.anisotropy*Math.cos(p.anisotropyRotation),p.anisotropy*Math.sin(p.anisotropyRotation)),p.anisotropyMap&&(g.anisotropyMap.value=p.anisotropyMap,t(p.anisotropyMap,g.anisotropyMapTransform))),g.specularIntensity.value=p.specularIntensity,g.specularColor.value.copy(p.specularColor),p.specularColorMap&&(g.specularColorMap.value=p.specularColorMap,t(p.specularColorMap,g.specularColorMapTransform)),p.specularIntensityMap&&(g.specularIntensityMap.value=p.specularIntensityMap,t(p.specularIntensityMap,g.specularIntensityMapTransform))}function m(g,p){p.matcap&&(g.matcap.value=p.matcap)}function v(g,p){const _=e.get(p).light;g.referencePosition.value.setFromMatrixPosition(_.matrixWorld),g.nearDistance.value=_.shadow.camera.near,g.farDistance.value=_.shadow.camera.far}return{refreshFogUniforms:n,refreshMaterialUniforms:r}}function NS(i,e,t,n){let r={},s={},a=[];const o=i.getParameter(i.MAX_UNIFORM_BUFFER_BINDINGS);function c(_,y){const x=y.program;n.uniformBlockBinding(_,x)}function l(_,y){let x=r[_.id];x===void 0&&(m(_),x=u(_),r[_.id]=x,_.addEventListener("dispose",g));const A=y.program;n.updateUBOMapping(_,A);const w=e.render.frame;s[_.id]!==w&&(f(_),s[_.id]=w)}function u(_){const y=d();_.__bindingPointIndex=y;const x=i.createBuffer(),A=_.__size,w=_.usage;return i.bindBuffer(i.UNIFORM_BUFFER,x),i.bufferData(i.UNIFORM_BUFFER,A,w),i.bindBuffer(i.UNIFORM_BUFFER,null),i.bindBufferBase(i.UNIFORM_BUFFER,y,x),x}function d(){for(let _=0;_<o;_++)if(a.indexOf(_)===-1)return a.push(_),_;return console.error("THREE.WebGLRenderer: Maximum number of simultaneously usable uniforms groups reached."),0}function f(_){const y=r[_.id],x=_.uniforms,A=_.__cache;i.bindBuffer(i.UNIFORM_BUFFER,y);for(let w=0,R=x.length;w<R;w++){const C=Array.isArray(x[w])?x[w]:[x[w]];for(let S=0,b=C.length;S<b;S++){const L=C[S];if(h(L,w,S,A)===!0){const D=L.__offset,k=Array.isArray(L.value)?L.value:[L.value];let H=0;for(let X=0;X<k.length;X++){const V=k[X],K=v(V);typeof V=="number"||typeof V=="boolean"?(L.__data[0]=V,i.bufferSubData(i.UNIFORM_BUFFER,D+H,L.__data)):V.isMatrix3?(L.__data[0]=V.elements[0],L.__data[1]=V.elements[1],L.__data[2]=V.elements[2],L.__data[3]=0,L.__data[4]=V.elements[3],L.__data[5]=V.elements[4],L.__data[6]=V.elements[5],L.__data[7]=0,L.__data[8]=V.elements[6],L.__data[9]=V.elements[7],L.__data[10]=V.elements[8],L.__data[11]=0):(V.toArray(L.__data,H),H+=K.storage/Float32Array.BYTES_PER_ELEMENT)}i.bufferSubData(i.UNIFORM_BUFFER,D,L.__data)}}}i.bindBuffer(i.UNIFORM_BUFFER,null)}function h(_,y,x,A){const w=_.value,R=y+"_"+x;if(A[R]===void 0)return typeof w=="number"||typeof w=="boolean"?A[R]=w:A[R]=w.clone(),!0;{const C=A[R];if(typeof w=="number"||typeof w=="boolean"){if(C!==w)return A[R]=w,!0}else if(C.equals(w)===!1)return C.copy(w),!0}return!1}function m(_){const y=_.uniforms;let x=0;const A=16;for(let R=0,C=y.length;R<C;R++){const S=Array.isArray(y[R])?y[R]:[y[R]];for(let b=0,L=S.length;b<L;b++){const D=S[b],k=Array.isArray(D.value)?D.value:[D.value];for(let H=0,X=k.length;H<X;H++){const V=k[H],K=v(V),G=x%A,se=G%K.boundary,me=G+se;x+=se,me!==0&&A-me<K.storage&&(x+=A-me),D.__data=new Float32Array(K.storage/Float32Array.BYTES_PER_ELEMENT),D.__offset=x,x+=K.storage}}}const w=x%A;return w>0&&(x+=A-w),_.__size=x,_.__cache={},this}function v(_){const y={boundary:0,storage:0};return typeof _=="number"||typeof _=="boolean"?(y.boundary=4,y.storage=4):_.isVector2?(y.boundary=8,y.storage=8):_.isVector3||_.isColor?(y.boundary=16,y.storage=12):_.isVector4?(y.boundary=16,y.storage=16):_.isMatrix3?(y.boundary=48,y.storage=48):_.isMatrix4?(y.boundary=64,y.storage=64):_.isTexture?console.warn("THREE.WebGLRenderer: Texture samplers can not be part of an uniforms group."):console.warn("THREE.WebGLRenderer: Unsupported uniform value type.",_),y}function g(_){const y=_.target;y.removeEventListener("dispose",g);const x=a.indexOf(y.__bindingPointIndex);a.splice(x,1),i.deleteBuffer(r[y.id]),delete r[y.id],delete s[y.id]}function p(){for(const _ in r)i.deleteBuffer(r[_]);a=[],r={},s={}}return{bind:c,update:l,dispose:p}}class yp{constructor(e={}){const{canvas:t=l0(),context:n=null,depth:r=!0,stencil:s=!1,alpha:a=!1,antialias:o=!1,premultipliedAlpha:c=!0,preserveDrawingBuffer:l=!1,powerPreference:u="default",failIfMajorPerformanceCaveat:d=!1,reversedDepthBuffer:f=!1}=e;this.isWebGLRenderer=!0;let h;if(n!==null){if(typeof WebGLRenderingContext<"u"&&n instanceof WebGLRenderingContext)throw new Error("THREE.WebGLRenderer: WebGL 1 is not supported since r163.");h=n.getContextAttributes().alpha}else h=a;const m=new Uint32Array(4),v=new Int32Array(4);let g=null,p=null;const _=[],y=[];this.domElement=t,this.debug={checkShaderErrors:!0,onShaderError:null},this.autoClear=!0,this.autoClearColor=!0,this.autoClearDepth=!0,this.autoClearStencil=!0,this.sortObjects=!0,this.clippingPlanes=[],this.localClippingEnabled=!1,this.toneMapping=Wi,this.toneMappingExposure=1,this.transmissionResolutionScale=1;const x=this;let A=!1;this._outputColorSpace=Bt;let w=0,R=0,C=null,S=-1,b=null;const L=new ht,D=new ht;let k=null;const H=new We(0);let X=0,V=t.width,K=t.height,G=1,se=null,me=null;const _e=new ht(0,0,V,K),Be=new ht(0,0,V,K);let lt=!1;const $e=new Iu;let st=!1,Y=!1;const ee=new Ke,Me=new P,De=new ht,be={background:null,fog:null,environment:null,overrideMaterial:null,isScene:!0};let Ze=!1;function qt(){return C===null?G:1}let I=n;function St(E,O){return t.getContext(E,O)}try{const E={alpha:!0,depth:r,stencil:s,antialias:o,premultipliedAlpha:c,preserveDrawingBuffer:l,powerPreference:u,failIfMajorPerformanceCaveat:d};if("setAttribute"in t&&t.setAttribute("data-engine",`three.js r${vu}`),t.addEventListener("webglcontextlost",he,!1),t.addEventListener("webglcontextrestored",we,!1),t.addEventListener("webglcontextcreationerror",re,!1),I===null){const O="webgl2";if(I=St(O,E),I===null)throw St(O)?new Error("Error creating WebGL context with your selected attributes."):new Error("Error creating WebGL context.")}}catch(E){throw console.error("THREE.WebGLRenderer: "+E.message),E}let Pe,ze,Z,le,ne,te,xe,Ue,T,M,U,q,Q,j,Le,ce,Te,Re,ie,de,He,Ie,ge,Je;function N(){Pe=new $x(I),Pe.init(),Ie=new AS(I,Pe),ze=new Bx(I,Pe,e,Ie),Z=new ES(I,Pe),ze.reversedDepthBuffer&&f&&Z.buffers.depth.setReversed(!0),le=new jx(I),ne=new hS,te=new TS(I,Pe,Z,ne,ze,Ie,le),xe=new zx(x),Ue=new Wx(x),T=new e_(I),ge=new Fx(I,T),M=new Xx(I,T,le,ge),U=new Kx(I,M,T,le),ie=new Yx(I,ze,te),ce=new kx(ne),q=new dS(x,xe,Ue,Pe,ze,ge,ce),Q=new DS(x,ne),j=new pS,Le=new xS(Pe),Re=new Ux(x,xe,Ue,Z,U,h,c),Te=new bS(x,U,ze),Je=new NS(I,le,ze,Z),de=new Ox(I,Pe,le),He=new qx(I,Pe,le),le.programs=q.programs,x.capabilities=ze,x.extensions=Pe,x.properties=ne,x.renderLists=j,x.shadowMap=Te,x.state=Z,x.info=le}N();const oe=new PS(x,I);this.xr=oe,this.getContext=function(){return I},this.getContextAttributes=function(){return I.getContextAttributes()},this.forceContextLoss=function(){const E=Pe.get("WEBGL_lose_context");E&&E.loseContext()},this.forceContextRestore=function(){const E=Pe.get("WEBGL_lose_context");E&&E.restoreContext()},this.getPixelRatio=function(){return G},this.setPixelRatio=function(E){E!==void 0&&(G=E,this.setSize(V,K,!1))},this.getSize=function(E){return E.set(V,K)},this.setSize=function(E,O,W=!0){if(oe.isPresenting){console.warn("THREE.WebGLRenderer: Can't change size while VR device is presenting.");return}V=E,K=O,t.width=Math.floor(E*G),t.height=Math.floor(O*G),W===!0&&(t.style.width=E+"px",t.style.height=O+"px"),this.setViewport(0,0,E,O)},this.getDrawingBufferSize=function(E){return E.set(V*G,K*G).floor()},this.setDrawingBufferSize=function(E,O,W){V=E,K=O,G=W,t.width=Math.floor(E*W),t.height=Math.floor(O*W),this.setViewport(0,0,E,O)},this.getCurrentViewport=function(E){return E.copy(L)},this.getViewport=function(E){return E.copy(_e)},this.setViewport=function(E,O,W,$){E.isVector4?_e.set(E.x,E.y,E.z,E.w):_e.set(E,O,W,$),Z.viewport(L.copy(_e).multiplyScalar(G).round())},this.getScissor=function(E){return E.copy(Be)},this.setScissor=function(E,O,W,$){E.isVector4?Be.set(E.x,E.y,E.z,E.w):Be.set(E,O,W,$),Z.scissor(D.copy(Be).multiplyScalar(G).round())},this.getScissorTest=function(){return lt},this.setScissorTest=function(E){Z.setScissorTest(lt=E)},this.setOpaqueSort=function(E){se=E},this.setTransparentSort=function(E){me=E},this.getClearColor=function(E){return E.copy(Re.getClearColor())},this.setClearColor=function(){Re.setClearColor(...arguments)},this.getClearAlpha=function(){return Re.getClearAlpha()},this.setClearAlpha=function(){Re.setClearAlpha(...arguments)},this.clear=function(E=!0,O=!0,W=!0){let $=0;if(E){let B=!1;if(C!==null){const ae=C.texture.format;B=ae===Tu||ae===Eu||ae===wu}if(B){const ae=C.texture.type,ve=ae===ai||ae===vr||ae===Js||ae===Qs||ae===Mu||ae===Su,Ae=Re.getClearColor(),Se=Re.getClearAlpha(),Ve=Ae.r,Ge=Ae.g,Oe=Ae.b;ve?(m[0]=Ve,m[1]=Ge,m[2]=Oe,m[3]=Se,I.clearBufferuiv(I.COLOR,0,m)):(v[0]=Ve,v[1]=Ge,v[2]=Oe,v[3]=Se,I.clearBufferiv(I.COLOR,0,v))}else $|=I.COLOR_BUFFER_BIT}O&&($|=I.DEPTH_BUFFER_BIT),W&&($|=I.STENCIL_BUFFER_BIT,this.state.buffers.stencil.setMask(4294967295)),I.clear($)},this.clearColor=function(){this.clear(!0,!1,!1)},this.clearDepth=function(){this.clear(!1,!0,!1)},this.clearStencil=function(){this.clear(!1,!1,!0)},this.dispose=function(){t.removeEventListener("webglcontextlost",he,!1),t.removeEventListener("webglcontextrestored",we,!1),t.removeEventListener("webglcontextcreationerror",re,!1),Re.dispose(),j.dispose(),Le.dispose(),ne.dispose(),xe.dispose(),Ue.dispose(),U.dispose(),ge.dispose(),Je.dispose(),q.dispose(),oe.dispose(),oe.removeEventListener("sessionstart",Kn),oe.removeEventListener("sessionend",Qu),Qi.stop()};function he(E){E.preventDefault(),console.log("THREE.WebGLRenderer: Context Lost."),A=!0}function we(){console.log("THREE.WebGLRenderer: Context Restored."),A=!1;const E=le.autoReset,O=Te.enabled,W=Te.autoUpdate,$=Te.needsUpdate,B=Te.type;N(),le.autoReset=E,Te.enabled=O,Te.autoUpdate=W,Te.needsUpdate=$,Te.type=B}function re(E){console.error("THREE.WebGLRenderer: A WebGL context could not be created. Reason: ",E.statusMessage)}function J(E){const O=E.target;O.removeEventListener("dispose",J),Ce(O)}function Ce(E){je(E),ne.remove(E)}function je(E){const O=ne.get(E).programs;O!==void 0&&(O.forEach(function(W){q.releaseProgram(W)}),E.isShaderMaterial&&q.releaseShaderCache(E))}this.renderBufferDirect=function(E,O,W,$,B,ae){O===null&&(O=be);const ve=B.isMesh&&B.matrixWorld.determinant()<0,Ae=Hp(E,O,W,$,B);Z.setMaterial($,ve);let Se=W.index,Ve=1;if($.wireframe===!0){if(Se=M.getWireframeAttribute(W),Se===void 0)return;Ve=2}const Ge=W.drawRange,Oe=W.attributes.position;let rt=Ge.start*Ve,vt=(Ge.start+Ge.count)*Ve;ae!==null&&(rt=Math.max(rt,ae.start*Ve),vt=Math.min(vt,(ae.start+ae.count)*Ve)),Se!==null?(rt=Math.max(rt,0),vt=Math.min(vt,Se.count)):Oe!=null&&(rt=Math.max(rt,0),vt=Math.min(vt,Oe.count));const Dt=vt-rt;if(Dt<0||Dt===1/0)return;ge.setup(B,$,Ae,W,Se);let Et,xt=de;if(Se!==null&&(Et=T.get(Se),xt=He,xt.setIndex(Et)),B.isMesh)$.wireframe===!0?(Z.setLineWidth($.wireframeLinewidth*qt()),xt.setMode(I.LINES)):xt.setMode(I.TRIANGLES);else if(B.isLine){let ke=$.linewidth;ke===void 0&&(ke=1),Z.setLineWidth(ke*qt()),B.isLineSegments?xt.setMode(I.LINES):B.isLineLoop?xt.setMode(I.LINE_LOOP):xt.setMode(I.LINE_STRIP)}else B.isPoints?xt.setMode(I.POINTS):B.isSprite&&xt.setMode(I.TRIANGLES);if(B.isBatchedMesh)if(B._multiDrawInstances!==null)sa("THREE.WebGLRenderer: renderMultiDrawInstances has been deprecated and will be removed in r184. Append to renderMultiDraw arguments and use indirection."),xt.renderMultiDrawInstances(B._multiDrawStarts,B._multiDrawCounts,B._multiDrawCount,B._multiDrawInstances);else if(Pe.get("WEBGL_multi_draw"))xt.renderMultiDraw(B._multiDrawStarts,B._multiDrawCounts,B._multiDrawCount);else{const ke=B._multiDrawStarts,Rt=B._multiDrawCounts,ut=B._multiDrawCount,yn=Se?T.get(Se).bytesPerElement:1,Mr=ne.get($).currentProgram.getUniforms();for(let xn=0;xn<ut;xn++)Mr.setValue(I,"_gl_DrawID",xn),xt.render(ke[xn]/yn,Rt[xn])}else if(B.isInstancedMesh)xt.renderInstances(rt,Dt,B.count);else if(W.isInstancedBufferGeometry){const ke=W._maxInstanceCount!==void 0?W._maxInstanceCount:1/0,Rt=Math.min(W.instanceCount,ke);xt.renderInstances(rt,Dt,Rt)}else xt.render(rt,Dt)};function bt(E,O,W){E.transparent===!0&&E.side===In&&E.forceSinglePass===!1?(E.side=un,E.needsUpdate=!0,xa(E,O,W),E.side=Ci,E.needsUpdate=!0,xa(E,O,W),E.side=In):xa(E,O,W)}this.compile=function(E,O,W=null){W===null&&(W=E),p=Le.get(W),p.init(O),y.push(p),W.traverseVisible(function(B){B.isLight&&B.layers.test(O.layers)&&(p.pushLight(B),B.castShadow&&p.pushShadow(B))}),E!==W&&E.traverseVisible(function(B){B.isLight&&B.layers.test(O.layers)&&(p.pushLight(B),B.castShadow&&p.pushShadow(B))}),p.setupLights();const $=new Set;return E.traverse(function(B){if(!(B.isMesh||B.isPoints||B.isLine||B.isSprite))return;const ae=B.material;if(ae)if(Array.isArray(ae))for(let ve=0;ve<ae.length;ve++){const Ae=ae[ve];bt(Ae,W,B),$.add(Ae)}else bt(ae,W,B),$.add(ae)}),p=y.pop(),$},this.compileAsync=function(E,O,W=null){const $=this.compile(E,O,W);return new Promise(B=>{function ae(){if($.forEach(function(ve){ne.get(ve).currentProgram.isReady()&&$.delete(ve)}),$.size===0){B(E);return}setTimeout(ae,10)}Pe.get("KHR_parallel_shader_compile")!==null?ae():setTimeout(ae,10)})};let ft=null;function ui(E){ft&&ft(E)}function Kn(){Qi.stop()}function Qu(){Qi.start()}const Qi=new pp;Qi.setAnimationLoop(ui),typeof self<"u"&&Qi.setContext(self),this.setAnimationLoop=function(E){ft=E,oe.setAnimationLoop(E),E===null?Qi.stop():Qi.start()},oe.addEventListener("sessionstart",Kn),oe.addEventListener("sessionend",Qu),this.render=function(E,O){if(O!==void 0&&O.isCamera!==!0){console.error("THREE.WebGLRenderer.render: camera is not an instance of THREE.Camera.");return}if(A===!0)return;if(E.matrixWorldAutoUpdate===!0&&E.updateMatrixWorld(),O.parent===null&&O.matrixWorldAutoUpdate===!0&&O.updateMatrixWorld(),oe.enabled===!0&&oe.isPresenting===!0&&(oe.cameraAutoUpdate===!0&&oe.updateCamera(O),O=oe.getCamera()),E.isScene===!0&&E.onBeforeRender(x,E,O,C),p=Le.get(E,y.length),p.init(O),y.push(p),ee.multiplyMatrices(O.projectionMatrix,O.matrixWorldInverse),$e.setFromProjectionMatrix(ee,ni,O.reversedDepth),Y=this.localClippingEnabled,st=ce.init(this.clippingPlanes,Y),g=j.get(E,_.length),g.init(),_.push(g),oe.enabled===!0&&oe.isPresenting===!0){const ae=x.xr.getDepthSensingMesh();ae!==null&&jo(ae,O,-1/0,x.sortObjects)}jo(E,O,0,x.sortObjects),g.finish(),x.sortObjects===!0&&g.sort(se,me),Ze=oe.enabled===!1||oe.isPresenting===!1||oe.hasDepthSensing()===!1,Ze&&Re.addToRenderList(g,E),this.info.render.frame++,st===!0&&ce.beginShadows();const W=p.state.shadowsArray;Te.render(W,E,O),st===!0&&ce.endShadows(),this.info.autoReset===!0&&this.info.reset();const $=g.opaque,B=g.transmissive;if(p.setupLights(),O.isArrayCamera){const ae=O.cameras;if(B.length>0)for(let ve=0,Ae=ae.length;ve<Ae;ve++){const Se=ae[ve];td($,B,E,Se)}Ze&&Re.render(E);for(let ve=0,Ae=ae.length;ve<Ae;ve++){const Se=ae[ve];ed(g,E,Se,Se.viewport)}}else B.length>0&&td($,B,E,O),Ze&&Re.render(E),ed(g,E,O);C!==null&&R===0&&(te.updateMultisampleRenderTarget(C),te.updateRenderTargetMipmap(C)),E.isScene===!0&&E.onAfterRender(x,E,O),ge.resetDefaultState(),S=-1,b=null,y.pop(),y.length>0?(p=y[y.length-1],st===!0&&ce.setGlobalState(x.clippingPlanes,p.state.camera)):p=null,_.pop(),_.length>0?g=_[_.length-1]:g=null};function jo(E,O,W,$){if(E.visible===!1)return;if(E.layers.test(O.layers)){if(E.isGroup)W=E.renderOrder;else if(E.isLOD)E.autoUpdate===!0&&E.update(O);else if(E.isLight)p.pushLight(E),E.castShadow&&p.pushShadow(E);else if(E.isSprite){if(!E.frustumCulled||$e.intersectsSprite(E)){$&&De.setFromMatrixPosition(E.matrixWorld).applyMatrix4(ee);const ve=U.update(E),Ae=E.material;Ae.visible&&g.push(E,ve,Ae,W,De.z,null)}}else if((E.isMesh||E.isLine||E.isPoints)&&(!E.frustumCulled||$e.intersectsObject(E))){const ve=U.update(E),Ae=E.material;if($&&(E.boundingSphere!==void 0?(E.boundingSphere===null&&E.computeBoundingSphere(),De.copy(E.boundingSphere.center)):(ve.boundingSphere===null&&ve.computeBoundingSphere(),De.copy(ve.boundingSphere.center)),De.applyMatrix4(E.matrixWorld).applyMatrix4(ee)),Array.isArray(Ae)){const Se=ve.groups;for(let Ve=0,Ge=Se.length;Ve<Ge;Ve++){const Oe=Se[Ve],rt=Ae[Oe.materialIndex];rt&&rt.visible&&g.push(E,ve,rt,W,De.z,Oe)}}else Ae.visible&&g.push(E,ve,Ae,W,De.z,null)}}const ae=E.children;for(let ve=0,Ae=ae.length;ve<Ae;ve++)jo(ae[ve],O,W,$)}function ed(E,O,W,$){const B=E.opaque,ae=E.transmissive,ve=E.transparent;p.setupLightsView(W),st===!0&&ce.setGlobalState(x.clippingPlanes,W),$&&Z.viewport(L.copy($)),B.length>0&&ya(B,O,W),ae.length>0&&ya(ae,O,W),ve.length>0&&ya(ve,O,W),Z.buffers.depth.setTest(!0),Z.buffers.depth.setMask(!0),Z.buffers.color.setMask(!0),Z.setPolygonOffset(!1)}function td(E,O,W,$){if((W.isScene===!0?W.overrideMaterial:null)!==null)return;p.state.transmissionRenderTarget[$.id]===void 0&&(p.state.transmissionRenderTarget[$.id]=new _r(1,1,{generateMipmaps:!0,type:Pe.has("EXT_color_buffer_half_float")||Pe.has("EXT_color_buffer_float")?ma:ai,minFilter:Si,samples:4,stencilBuffer:s,resolveDepthBuffer:!1,resolveStencilBuffer:!1,colorSpace:at.workingColorSpace}));const ae=p.state.transmissionRenderTarget[$.id],ve=$.viewport||L;ae.setSize(ve.z*x.transmissionResolutionScale,ve.w*x.transmissionResolutionScale);const Ae=x.getRenderTarget(),Se=x.getActiveCubeFace(),Ve=x.getActiveMipmapLevel();x.setRenderTarget(ae),x.getClearColor(H),X=x.getClearAlpha(),X<1&&x.setClearColor(16777215,.5),x.clear(),Ze&&Re.render(W);const Ge=x.toneMapping;x.toneMapping=Wi;const Oe=$.viewport;if($.viewport!==void 0&&($.viewport=void 0),p.setupLightsView($),st===!0&&ce.setGlobalState(x.clippingPlanes,$),ya(E,W,$),te.updateMultisampleRenderTarget(ae),te.updateRenderTargetMipmap(ae),Pe.has("WEBGL_multisampled_render_to_texture")===!1){let rt=!1;for(let vt=0,Dt=O.length;vt<Dt;vt++){const Et=O[vt],xt=Et.object,ke=Et.geometry,Rt=Et.material,ut=Et.group;if(Rt.side===In&&xt.layers.test($.layers)){const yn=Rt.side;Rt.side=un,Rt.needsUpdate=!0,nd(xt,W,$,ke,Rt,ut),Rt.side=yn,Rt.needsUpdate=!0,rt=!0}}rt===!0&&(te.updateMultisampleRenderTarget(ae),te.updateRenderTargetMipmap(ae))}x.setRenderTarget(Ae,Se,Ve),x.setClearColor(H,X),Oe!==void 0&&($.viewport=Oe),x.toneMapping=Ge}function ya(E,O,W){const $=O.isScene===!0?O.overrideMaterial:null;for(let B=0,ae=E.length;B<ae;B++){const ve=E[B],Ae=ve.object,Se=ve.geometry,Ve=ve.group;let Ge=ve.material;Ge.allowOverride===!0&&$!==null&&(Ge=$),Ae.layers.test(W.layers)&&nd(Ae,O,W,Se,Ge,Ve)}}function nd(E,O,W,$,B,ae){E.onBeforeRender(x,O,W,$,B,ae),E.modelViewMatrix.multiplyMatrices(W.matrixWorldInverse,E.matrixWorld),E.normalMatrix.getNormalMatrix(E.modelViewMatrix),B.onBeforeRender(x,O,W,$,E,ae),B.transparent===!0&&B.side===In&&B.forceSinglePass===!1?(B.side=un,B.needsUpdate=!0,x.renderBufferDirect(W,O,$,B,E,ae),B.side=Ci,B.needsUpdate=!0,x.renderBufferDirect(W,O,$,B,E,ae),B.side=In):x.renderBufferDirect(W,O,$,B,E,ae),E.onAfterRender(x,O,W,$,B,ae)}function xa(E,O,W){O.isScene!==!0&&(O=be);const $=ne.get(E),B=p.state.lights,ae=p.state.shadowsArray,ve=B.state.version,Ae=q.getParameters(E,B.state,ae,O,W),Se=q.getProgramCacheKey(Ae);let Ve=$.programs;$.environment=E.isMeshStandardMaterial?O.environment:null,$.fog=O.fog,$.envMap=(E.isMeshStandardMaterial?Ue:xe).get(E.envMap||$.environment),$.envMapRotation=$.environment!==null&&E.envMap===null?O.environmentRotation:E.envMapRotation,Ve===void 0&&(E.addEventListener("dispose",J),Ve=new Map,$.programs=Ve);let Ge=Ve.get(Se);if(Ge!==void 0){if($.currentProgram===Ge&&$.lightsStateVersion===ve)return rd(E,Ae),Ge}else Ae.uniforms=q.getUniforms(E),E.onBeforeCompile(Ae,x),Ge=q.acquireProgram(Ae,Se),Ve.set(Se,Ge),$.uniforms=Ae.uniforms;const Oe=$.uniforms;return(!E.isShaderMaterial&&!E.isRawShaderMaterial||E.clipping===!0)&&(Oe.clippingPlanes=ce.uniform),rd(E,Ae),$.needsLights=Gp(E),$.lightsStateVersion=ve,$.needsLights&&(Oe.ambientLightColor.value=B.state.ambient,Oe.lightProbe.value=B.state.probe,Oe.directionalLights.value=B.state.directional,Oe.directionalLightShadows.value=B.state.directionalShadow,Oe.spotLights.value=B.state.spot,Oe.spotLightShadows.value=B.state.spotShadow,Oe.rectAreaLights.value=B.state.rectArea,Oe.ltc_1.value=B.state.rectAreaLTC1,Oe.ltc_2.value=B.state.rectAreaLTC2,Oe.pointLights.value=B.state.point,Oe.pointLightShadows.value=B.state.pointShadow,Oe.hemisphereLights.value=B.state.hemi,Oe.directionalShadowMap.value=B.state.directionalShadowMap,Oe.directionalShadowMatrix.value=B.state.directionalShadowMatrix,Oe.spotShadowMap.value=B.state.spotShadowMap,Oe.spotLightMatrix.value=B.state.spotLightMatrix,Oe.spotLightMap.value=B.state.spotLightMap,Oe.pointShadowMap.value=B.state.pointShadowMap,Oe.pointShadowMatrix.value=B.state.pointShadowMatrix),$.currentProgram=Ge,$.uniformsList=null,Ge}function id(E){if(E.uniformsList===null){const O=E.currentProgram.getUniforms();E.uniformsList=mo.seqWithValue(O.seq,E.uniforms)}return E.uniformsList}function rd(E,O){const W=ne.get(E);W.outputColorSpace=O.outputColorSpace,W.batching=O.batching,W.batchingColor=O.batchingColor,W.instancing=O.instancing,W.instancingColor=O.instancingColor,W.instancingMorph=O.instancingMorph,W.skinning=O.skinning,W.morphTargets=O.morphTargets,W.morphNormals=O.morphNormals,W.morphColors=O.morphColors,W.morphTargetsCount=O.morphTargetsCount,W.numClippingPlanes=O.numClippingPlanes,W.numIntersection=O.numClipIntersection,W.vertexAlphas=O.vertexAlphas,W.vertexTangents=O.vertexTangents,W.toneMapping=O.toneMapping}function Hp(E,O,W,$,B){O.isScene!==!0&&(O=be),te.resetTextureUnits();const ae=O.fog,ve=$.isMeshStandardMaterial?O.environment:null,Ae=C===null?x.outputColorSpace:C.isXRRenderTarget===!0?C.texture.colorSpace:fn,Se=($.isMeshStandardMaterial?Ue:xe).get($.envMap||ve),Ve=$.vertexColors===!0&&!!W.attributes.color&&W.attributes.color.itemSize===4,Ge=!!W.attributes.tangent&&(!!$.normalMap||$.anisotropy>0),Oe=!!W.morphAttributes.position,rt=!!W.morphAttributes.normal,vt=!!W.morphAttributes.color;let Dt=Wi;$.toneMapped&&(C===null||C.isXRRenderTarget===!0)&&(Dt=x.toneMapping);const Et=W.morphAttributes.position||W.morphAttributes.normal||W.morphAttributes.color,xt=Et!==void 0?Et.length:0,ke=ne.get($),Rt=p.state.lights;if(st===!0&&(Y===!0||E!==b)){const rn=E===b&&$.id===S;ce.setState($,E,rn)}let ut=!1;$.version===ke.__version?(ke.needsLights&&ke.lightsStateVersion!==Rt.state.version||ke.outputColorSpace!==Ae||B.isBatchedMesh&&ke.batching===!1||!B.isBatchedMesh&&ke.batching===!0||B.isBatchedMesh&&ke.batchingColor===!0&&B.colorTexture===null||B.isBatchedMesh&&ke.batchingColor===!1&&B.colorTexture!==null||B.isInstancedMesh&&ke.instancing===!1||!B.isInstancedMesh&&ke.instancing===!0||B.isSkinnedMesh&&ke.skinning===!1||!B.isSkinnedMesh&&ke.skinning===!0||B.isInstancedMesh&&ke.instancingColor===!0&&B.instanceColor===null||B.isInstancedMesh&&ke.instancingColor===!1&&B.instanceColor!==null||B.isInstancedMesh&&ke.instancingMorph===!0&&B.morphTexture===null||B.isInstancedMesh&&ke.instancingMorph===!1&&B.morphTexture!==null||ke.envMap!==Se||$.fog===!0&&ke.fog!==ae||ke.numClippingPlanes!==void 0&&(ke.numClippingPlanes!==ce.numPlanes||ke.numIntersection!==ce.numIntersection)||ke.vertexAlphas!==Ve||ke.vertexTangents!==Ge||ke.morphTargets!==Oe||ke.morphNormals!==rt||ke.morphColors!==vt||ke.toneMapping!==Dt||ke.morphTargetsCount!==xt)&&(ut=!0):(ut=!0,ke.__version=$.version);let yn=ke.currentProgram;ut===!0&&(yn=xa($,O,B));let Mr=!1,xn=!1,_s=!1;const Ct=yn.getUniforms(),Tn=ke.uniforms;if(Z.useProgram(yn.program)&&(Mr=!0,xn=!0,_s=!0),$.id!==S&&(S=$.id,xn=!0),Mr||b!==E){Z.buffers.depth.getReversed()&&E.reversedDepth!==!0&&(E._reversedDepth=!0,E.updateProjectionMatrix()),Ct.setValue(I,"projectionMatrix",E.projectionMatrix),Ct.setValue(I,"viewMatrix",E.matrixWorldInverse);const pn=Ct.map.cameraPosition;pn!==void 0&&pn.setValue(I,Me.setFromMatrixPosition(E.matrixWorld)),ze.logarithmicDepthBuffer&&Ct.setValue(I,"logDepthBufFC",2/(Math.log(E.far+1)/Math.LN2)),($.isMeshPhongMaterial||$.isMeshToonMaterial||$.isMeshLambertMaterial||$.isMeshBasicMaterial||$.isMeshStandardMaterial||$.isShaderMaterial)&&Ct.setValue(I,"isOrthographic",E.isOrthographicCamera===!0),b!==E&&(b=E,xn=!0,_s=!0)}if(B.isSkinnedMesh){Ct.setOptional(I,B,"bindMatrix"),Ct.setOptional(I,B,"bindMatrixInverse");const rn=B.skeleton;rn&&(rn.boneTexture===null&&rn.computeBoneTexture(),Ct.setValue(I,"boneTexture",rn.boneTexture,te))}B.isBatchedMesh&&(Ct.setOptional(I,B,"batchingTexture"),Ct.setValue(I,"batchingTexture",B._matricesTexture,te),Ct.setOptional(I,B,"batchingIdTexture"),Ct.setValue(I,"batchingIdTexture",B._indirectTexture,te),Ct.setOptional(I,B,"batchingColorTexture"),B._colorsTexture!==null&&Ct.setValue(I,"batchingColorTexture",B._colorsTexture,te));const An=W.morphAttributes;if((An.position!==void 0||An.normal!==void 0||An.color!==void 0)&&ie.update(B,W,yn),(xn||ke.receiveShadow!==B.receiveShadow)&&(ke.receiveShadow=B.receiveShadow,Ct.setValue(I,"receiveShadow",B.receiveShadow)),$.isMeshGouraudMaterial&&$.envMap!==null&&(Tn.envMap.value=Se,Tn.flipEnvMap.value=Se.isCubeTexture&&Se.isRenderTargetTexture===!1?-1:1),$.isMeshStandardMaterial&&$.envMap===null&&O.environment!==null&&(Tn.envMapIntensity.value=O.environmentIntensity),xn&&(Ct.setValue(I,"toneMappingExposure",x.toneMappingExposure),ke.needsLights&&Vp(Tn,_s),ae&&$.fog===!0&&Q.refreshFogUniforms(Tn,ae),Q.refreshMaterialUniforms(Tn,$,G,K,p.state.transmissionRenderTarget[E.id]),mo.upload(I,id(ke),Tn,te)),$.isShaderMaterial&&$.uniformsNeedUpdate===!0&&(mo.upload(I,id(ke),Tn,te),$.uniformsNeedUpdate=!1),$.isSpriteMaterial&&Ct.setValue(I,"center",B.center),Ct.setValue(I,"modelViewMatrix",B.modelViewMatrix),Ct.setValue(I,"normalMatrix",B.normalMatrix),Ct.setValue(I,"modelMatrix",B.matrixWorld),$.isShaderMaterial||$.isRawShaderMaterial){const rn=$.uniformsGroups;for(let pn=0,Yo=rn.length;pn<Yo;pn++){const er=rn[pn];Je.update(er,yn),Je.bind(er,yn)}}return yn}function Vp(E,O){E.ambientLightColor.needsUpdate=O,E.lightProbe.needsUpdate=O,E.directionalLights.needsUpdate=O,E.directionalLightShadows.needsUpdate=O,E.pointLights.needsUpdate=O,E.pointLightShadows.needsUpdate=O,E.spotLights.needsUpdate=O,E.spotLightShadows.needsUpdate=O,E.rectAreaLights.needsUpdate=O,E.hemisphereLights.needsUpdate=O}function Gp(E){return E.isMeshLambertMaterial||E.isMeshToonMaterial||E.isMeshPhongMaterial||E.isMeshStandardMaterial||E.isShadowMaterial||E.isShaderMaterial&&E.lights===!0}this.getActiveCubeFace=function(){return w},this.getActiveMipmapLevel=function(){return R},this.getRenderTarget=function(){return C},this.setRenderTargetTextures=function(E,O,W){const $=ne.get(E);$.__autoAllocateDepthBuffer=E.resolveDepthBuffer===!1,$.__autoAllocateDepthBuffer===!1&&($.__useRenderToTexture=!1),ne.get(E.texture).__webglTexture=O,ne.get(E.depthTexture).__webglTexture=$.__autoAllocateDepthBuffer?void 0:W,$.__hasExternalTextures=!0},this.setRenderTargetFramebuffer=function(E,O){const W=ne.get(E);W.__webglFramebuffer=O,W.__useDefaultFramebuffer=O===void 0};const Wp=I.createFramebuffer();this.setRenderTarget=function(E,O=0,W=0){C=E,w=O,R=W;let $=!0,B=null,ae=!1,ve=!1;if(E){const Se=ne.get(E);if(Se.__useDefaultFramebuffer!==void 0)Z.bindFramebuffer(I.FRAMEBUFFER,null),$=!1;else if(Se.__webglFramebuffer===void 0)te.setupRenderTarget(E);else if(Se.__hasExternalTextures)te.rebindTextures(E,ne.get(E.texture).__webglTexture,ne.get(E.depthTexture).__webglTexture);else if(E.depthBuffer){const Oe=E.depthTexture;if(Se.__boundDepthTexture!==Oe){if(Oe!==null&&ne.has(Oe)&&(E.width!==Oe.image.width||E.height!==Oe.image.height))throw new Error("WebGLRenderTarget: Attached DepthTexture is initialized to the incorrect size.");te.setupDepthRenderbuffer(E)}}const Ve=E.texture;(Ve.isData3DTexture||Ve.isDataArrayTexture||Ve.isCompressedArrayTexture)&&(ve=!0);const Ge=ne.get(E).__webglFramebuffer;E.isWebGLCubeRenderTarget?(Array.isArray(Ge[O])?B=Ge[O][W]:B=Ge[O],ae=!0):E.samples>0&&te.useMultisampledRTT(E)===!1?B=ne.get(E).__webglMultisampledFramebuffer:Array.isArray(Ge)?B=Ge[W]:B=Ge,L.copy(E.viewport),D.copy(E.scissor),k=E.scissorTest}else L.copy(_e).multiplyScalar(G).floor(),D.copy(Be).multiplyScalar(G).floor(),k=lt;if(W!==0&&(B=Wp),Z.bindFramebuffer(I.FRAMEBUFFER,B)&&$&&Z.drawBuffers(E,B),Z.viewport(L),Z.scissor(D),Z.setScissorTest(k),ae){const Se=ne.get(E.texture);I.framebufferTexture2D(I.FRAMEBUFFER,I.COLOR_ATTACHMENT0,I.TEXTURE_CUBE_MAP_POSITIVE_X+O,Se.__webglTexture,W)}else if(ve){const Se=O;for(let Ve=0;Ve<E.textures.length;Ve++){const Ge=ne.get(E.textures[Ve]);I.framebufferTextureLayer(I.FRAMEBUFFER,I.COLOR_ATTACHMENT0+Ve,Ge.__webglTexture,W,Se)}}else if(E!==null&&W!==0){const Se=ne.get(E.texture);I.framebufferTexture2D(I.FRAMEBUFFER,I.COLOR_ATTACHMENT0,I.TEXTURE_2D,Se.__webglTexture,W)}S=-1},this.readRenderTargetPixels=function(E,O,W,$,B,ae,ve,Ae=0){if(!(E&&E.isWebGLRenderTarget)){console.error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");return}let Se=ne.get(E).__webglFramebuffer;if(E.isWebGLCubeRenderTarget&&ve!==void 0&&(Se=Se[ve]),Se){Z.bindFramebuffer(I.FRAMEBUFFER,Se);try{const Ve=E.textures[Ae],Ge=Ve.format,Oe=Ve.type;if(!ze.textureFormatReadable(Ge)){console.error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not in RGBA or implementation defined format.");return}if(!ze.textureTypeReadable(Oe)){console.error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not in UnsignedByteType or implementation defined type.");return}O>=0&&O<=E.width-$&&W>=0&&W<=E.height-B&&(E.textures.length>1&&I.readBuffer(I.COLOR_ATTACHMENT0+Ae),I.readPixels(O,W,$,B,Ie.convert(Ge),Ie.convert(Oe),ae))}finally{const Ve=C!==null?ne.get(C).__webglFramebuffer:null;Z.bindFramebuffer(I.FRAMEBUFFER,Ve)}}},this.readRenderTargetPixelsAsync=async function(E,O,W,$,B,ae,ve,Ae=0){if(!(E&&E.isWebGLRenderTarget))throw new Error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");let Se=ne.get(E).__webglFramebuffer;if(E.isWebGLCubeRenderTarget&&ve!==void 0&&(Se=Se[ve]),Se)if(O>=0&&O<=E.width-$&&W>=0&&W<=E.height-B){Z.bindFramebuffer(I.FRAMEBUFFER,Se);const Ve=E.textures[Ae],Ge=Ve.format,Oe=Ve.type;if(!ze.textureFormatReadable(Ge))throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in RGBA or implementation defined format.");if(!ze.textureTypeReadable(Oe))throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in UnsignedByteType or implementation defined type.");const rt=I.createBuffer();I.bindBuffer(I.PIXEL_PACK_BUFFER,rt),I.bufferData(I.PIXEL_PACK_BUFFER,ae.byteLength,I.STREAM_READ),E.textures.length>1&&I.readBuffer(I.COLOR_ATTACHMENT0+Ae),I.readPixels(O,W,$,B,Ie.convert(Ge),Ie.convert(Oe),0);const vt=C!==null?ne.get(C).__webglFramebuffer:null;Z.bindFramebuffer(I.FRAMEBUFFER,vt);const Dt=I.fenceSync(I.SYNC_GPU_COMMANDS_COMPLETE,0);return I.flush(),await u0(I,Dt,4),I.bindBuffer(I.PIXEL_PACK_BUFFER,rt),I.getBufferSubData(I.PIXEL_PACK_BUFFER,0,ae),I.deleteBuffer(rt),I.deleteSync(Dt),ae}else throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: requested read bounds are out of range.")},this.copyFramebufferToTexture=function(E,O=null,W=0){const $=Math.pow(2,-W),B=Math.floor(E.image.width*$),ae=Math.floor(E.image.height*$),ve=O!==null?O.x:0,Ae=O!==null?O.y:0;te.setTexture2D(E,0),I.copyTexSubImage2D(I.TEXTURE_2D,W,0,0,ve,Ae,B,ae),Z.unbindTexture()};const $p=I.createFramebuffer(),Xp=I.createFramebuffer();this.copyTextureToTexture=function(E,O,W=null,$=null,B=0,ae=null){ae===null&&(B!==0?(sa("WebGLRenderer: copyTextureToTexture function signature has changed to support src and dst mipmap levels."),ae=B,B=0):ae=0);let ve,Ae,Se,Ve,Ge,Oe,rt,vt,Dt;const Et=E.isCompressedTexture?E.mipmaps[ae]:E.image;if(W!==null)ve=W.max.x-W.min.x,Ae=W.max.y-W.min.y,Se=W.isBox3?W.max.z-W.min.z:1,Ve=W.min.x,Ge=W.min.y,Oe=W.isBox3?W.min.z:0;else{const An=Math.pow(2,-B);ve=Math.floor(Et.width*An),Ae=Math.floor(Et.height*An),E.isDataArrayTexture?Se=Et.depth:E.isData3DTexture?Se=Math.floor(Et.depth*An):Se=1,Ve=0,Ge=0,Oe=0}$!==null?(rt=$.x,vt=$.y,Dt=$.z):(rt=0,vt=0,Dt=0);const xt=Ie.convert(O.format),ke=Ie.convert(O.type);let Rt;O.isData3DTexture?(te.setTexture3D(O,0),Rt=I.TEXTURE_3D):O.isDataArrayTexture||O.isCompressedArrayTexture?(te.setTexture2DArray(O,0),Rt=I.TEXTURE_2D_ARRAY):(te.setTexture2D(O,0),Rt=I.TEXTURE_2D),I.pixelStorei(I.UNPACK_FLIP_Y_WEBGL,O.flipY),I.pixelStorei(I.UNPACK_PREMULTIPLY_ALPHA_WEBGL,O.premultiplyAlpha),I.pixelStorei(I.UNPACK_ALIGNMENT,O.unpackAlignment);const ut=I.getParameter(I.UNPACK_ROW_LENGTH),yn=I.getParameter(I.UNPACK_IMAGE_HEIGHT),Mr=I.getParameter(I.UNPACK_SKIP_PIXELS),xn=I.getParameter(I.UNPACK_SKIP_ROWS),_s=I.getParameter(I.UNPACK_SKIP_IMAGES);I.pixelStorei(I.UNPACK_ROW_LENGTH,Et.width),I.pixelStorei(I.UNPACK_IMAGE_HEIGHT,Et.height),I.pixelStorei(I.UNPACK_SKIP_PIXELS,Ve),I.pixelStorei(I.UNPACK_SKIP_ROWS,Ge),I.pixelStorei(I.UNPACK_SKIP_IMAGES,Oe);const Ct=E.isDataArrayTexture||E.isData3DTexture,Tn=O.isDataArrayTexture||O.isData3DTexture;if(E.isDepthTexture){const An=ne.get(E),rn=ne.get(O),pn=ne.get(An.__renderTarget),Yo=ne.get(rn.__renderTarget);Z.bindFramebuffer(I.READ_FRAMEBUFFER,pn.__webglFramebuffer),Z.bindFramebuffer(I.DRAW_FRAMEBUFFER,Yo.__webglFramebuffer);for(let er=0;er<Se;er++)Ct&&(I.framebufferTextureLayer(I.READ_FRAMEBUFFER,I.COLOR_ATTACHMENT0,ne.get(E).__webglTexture,B,Oe+er),I.framebufferTextureLayer(I.DRAW_FRAMEBUFFER,I.COLOR_ATTACHMENT0,ne.get(O).__webglTexture,ae,Dt+er)),I.blitFramebuffer(Ve,Ge,ve,Ae,rt,vt,ve,Ae,I.DEPTH_BUFFER_BIT,I.NEAREST);Z.bindFramebuffer(I.READ_FRAMEBUFFER,null),Z.bindFramebuffer(I.DRAW_FRAMEBUFFER,null)}else if(B!==0||E.isRenderTargetTexture||ne.has(E)){const An=ne.get(E),rn=ne.get(O);Z.bindFramebuffer(I.READ_FRAMEBUFFER,$p),Z.bindFramebuffer(I.DRAW_FRAMEBUFFER,Xp);for(let pn=0;pn<Se;pn++)Ct?I.framebufferTextureLayer(I.READ_FRAMEBUFFER,I.COLOR_ATTACHMENT0,An.__webglTexture,B,Oe+pn):I.framebufferTexture2D(I.READ_FRAMEBUFFER,I.COLOR_ATTACHMENT0,I.TEXTURE_2D,An.__webglTexture,B),Tn?I.framebufferTextureLayer(I.DRAW_FRAMEBUFFER,I.COLOR_ATTACHMENT0,rn.__webglTexture,ae,Dt+pn):I.framebufferTexture2D(I.DRAW_FRAMEBUFFER,I.COLOR_ATTACHMENT0,I.TEXTURE_2D,rn.__webglTexture,ae),B!==0?I.blitFramebuffer(Ve,Ge,ve,Ae,rt,vt,ve,Ae,I.COLOR_BUFFER_BIT,I.NEAREST):Tn?I.copyTexSubImage3D(Rt,ae,rt,vt,Dt+pn,Ve,Ge,ve,Ae):I.copyTexSubImage2D(Rt,ae,rt,vt,Ve,Ge,ve,Ae);Z.bindFramebuffer(I.READ_FRAMEBUFFER,null),Z.bindFramebuffer(I.DRAW_FRAMEBUFFER,null)}else Tn?E.isDataTexture||E.isData3DTexture?I.texSubImage3D(Rt,ae,rt,vt,Dt,ve,Ae,Se,xt,ke,Et.data):O.isCompressedArrayTexture?I.compressedTexSubImage3D(Rt,ae,rt,vt,Dt,ve,Ae,Se,xt,Et.data):I.texSubImage3D(Rt,ae,rt,vt,Dt,ve,Ae,Se,xt,ke,Et):E.isDataTexture?I.texSubImage2D(I.TEXTURE_2D,ae,rt,vt,ve,Ae,xt,ke,Et.data):E.isCompressedTexture?I.compressedTexSubImage2D(I.TEXTURE_2D,ae,rt,vt,Et.width,Et.height,xt,Et.data):I.texSubImage2D(I.TEXTURE_2D,ae,rt,vt,ve,Ae,xt,ke,Et);I.pixelStorei(I.UNPACK_ROW_LENGTH,ut),I.pixelStorei(I.UNPACK_IMAGE_HEIGHT,yn),I.pixelStorei(I.UNPACK_SKIP_PIXELS,Mr),I.pixelStorei(I.UNPACK_SKIP_ROWS,xn),I.pixelStorei(I.UNPACK_SKIP_IMAGES,_s),ae===0&&O.generateMipmaps&&I.generateMipmap(Rt),Z.unbindTexture()},this.initRenderTarget=function(E){ne.get(E).__webglFramebuffer===void 0&&te.setupRenderTarget(E)},this.initTexture=function(E){E.isCubeTexture?te.setTextureCube(E,0):E.isData3DTexture?te.setTexture3D(E,0):E.isDataArrayTexture||E.isCompressedArrayTexture?te.setTexture2DArray(E,0):te.setTexture2D(E,0),Z.unbindTexture()},this.resetState=function(){w=0,R=0,C=null,Z.reset(),ge.reset()},typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}get coordinateSystem(){return ni}get outputColorSpace(){return this._outputColorSpace}set outputColorSpace(e){this._outputColorSpace=e;const t=this.getContext();t.drawingBufferColorSpace=at._getDrawingBufferColorSpace(e),t.unpackColorSpace=at._getUnpackColorSpace()}}class US extends Uo{constructor(){super();const e=new xr;e.deleteAttribute("uv");const t=new $n({side:un}),n=new $n,r=new fp(16777215,900,28,2);r.position.set(.418,16.199,.3),this.add(r);const s=new Tt(e,t);s.position.set(-.757,13.219,.717),s.scale.set(31.713,28.305,28.591),this.add(s);const a=new qf(e,n,6),o=new wt;o.position.set(-10.906,2.009,1.846),o.rotation.set(0,-.195,0),o.scale.set(2.328,7.905,4.651),o.updateMatrix(),a.setMatrixAt(0,o.matrix),o.position.set(-5.607,-.754,-.758),o.rotation.set(0,.994,0),o.scale.set(1.97,1.534,3.955),o.updateMatrix(),a.setMatrixAt(1,o.matrix),o.position.set(6.167,.857,7.803),o.rotation.set(0,.561,0),o.scale.set(3.927,6.285,3.687),o.updateMatrix(),a.setMatrixAt(2,o.matrix),o.position.set(-2.017,.018,6.124),o.rotation.set(0,.333,0),o.scale.set(2.002,4.566,2.064),o.updateMatrix(),a.setMatrixAt(3,o.matrix),o.position.set(2.291,-.756,-2.621),o.rotation.set(0,-.286,0),o.scale.set(1.546,1.552,1.496),o.updateMatrix(),a.setMatrixAt(4,o.matrix),o.position.set(-2.193,-.369,-5.547),o.rotation.set(0,.516,0),o.scale.set(3.875,3.487,2.986),o.updateMatrix(),a.setMatrixAt(5,o.matrix),this.add(a);const c=new Tt(e,Vr(50));c.position.set(-16.116,14.37,8.208),c.scale.set(.1,2.428,2.739),this.add(c);const l=new Tt(e,Vr(50));l.position.set(-16.109,18.021,-8.207),l.scale.set(.1,2.425,2.751),this.add(l);const u=new Tt(e,Vr(17));u.position.set(14.904,12.198,-1.832),u.scale.set(.15,4.265,6.331),this.add(u);const d=new Tt(e,Vr(43));d.position.set(-.462,8.89,14.52),d.scale.set(4.38,5.441,.088),this.add(d);const f=new Tt(e,Vr(20));f.position.set(3.235,11.486,-12.541),f.scale.set(2.5,2,.1),this.add(f);const h=new Tt(e,Vr(100));h.position.set(0,20,0),h.scale.set(1,.1,1),this.add(h)}dispose(){const e=new Set;this.traverse(t=>{t.isMesh&&(e.add(t.geometry),e.add(t.material))});for(const t of e)t.dispose()}}function Vr(i){return new Sv({color:0,emissive:16777215,emissiveIntensity:i})}let vn,Vo,Ki=0,$c=0,Gr=0,Go=!1;const Ai=new Set,eu=matchMedia("(prefers-reduced-motion: reduce)");function FS(){if(vn)return vn;vn=new yp({alpha:!0,antialias:!0,powerPreference:"low-power"}),vn.setClearColor(0,0),vn.outputColorSpace=Bt,vn.toneMapping=yu,vn.toneMappingExposure=.95;const i=new Jl(vn),e=new US;return Vo=i.fromScene(e,.04),e.dispose(),i.dispose(),vn.domElement.addEventListener("webglcontextlost",t=>{t.preventDefault(),xp()}),vn}function xp(){Go=!0,cancelAnimationFrame(Ki),Ki=0;for(const i of Ai)i.canvas.remove(),i.host.classList.remove("art-3d"),i.host.dataset.renderError="true",i.dispose();Ai.clear()}function Nn(i,e,t,n=0,r=0,s=0){const a=new Tt(i,e);return a.position.set(n,r,s),t.add(a),a}function Ei(i,e={}){return new $n({color:i,roughness:.8,envMapIntensity:.2,...e})}function Bs(i,e,t=.024){return Nn(new Gu(new Jf(e.map(n=>new P(...n))),18,t,6,!1),Ei("#6b8650"),i)}function go(i,e,t,n,r,s){const a=new rp;a.moveTo(0,0);for(let u=0;u<=12;u++){const d=u/12;a.lineTo(Math.sin(d*Math.PI)*.38*(u%2?.87:1),d)}for(let u=12;u>=0;u--){const d=u/12;a.lineTo(-Math.sin(d*Math.PI)*.38*(u%2?.87:1),d)}a.closePath();const o=new Hu(a,10),c=o.attributes.position;for(let u=0;u<c.count;u++)c.setZ(u,Math.sin(c.getY(u)*Math.PI)*.14+Math.abs(c.getX(u))*.2);o.computeVertexNormals();const l=new Zt;l.position.set(e,t,n),l.rotation.set(-.75,.1,r),l.scale.setScalar(s),i.add(l),Nn(o,Ei("#416b3b",{side:In}),l),Bs(l,[[0,0,.01],[0,.45,.155],[0,.93,.035]],.009)}function Xc(i,e,t,n,r=.19){const s=new Zt;s.position.set(e,t,n),s.rotation.x=-.5,i.add(s);const a=Ei("#fff9e1",{side:In});for(let o=0;o<5;o++){const c=o*Math.PI*2/5,l=Nn(new Yi(r,12,8),a,s,Math.sin(c)*r*.85,Math.cos(c)*r*.85,0);l.scale.set(.66,1,.23),l.rotation.z=-c}Nn(new Yi(r*.43,12,8),Ei("#edbe4d"),s,0,0,.07)}function qc(i,e,t,n,r,s,a){const o=new Zt;o.position.set(n,r,s),o.scale.setScalar(a),i.add(o);const c=_=>e.includes(_),l=c("crystal")||c("frost")||c("dew"),u=c("jade"),d=c("rainbow")||c("prism")||c("nebula"),f=t?l?"#bdebf0":u?"#97d3ab":d?"#c5a4e5":c("golden")?"#efc458":c("purple")?"#a883cb":c("mint")?"#9ed7b5":c("amber")||c("honey")?"#e6ad55":c("coral")?"#ee947c":"#bd2447":"#91b559",h=new ln({color:f,roughness:l||u||d?.16:.55,metalness:c("golden")?.5:0,clearcoat:.45,transmission:t&&(l||u||d)?.82:0,thickness:.8,ior:1.45,iridescence:d?1:0,envMapIntensity:.85}),m=[];for(let _=0;_<=36;_++){const y=_/36;m.push(new ue(Math.pow(Math.sin(Math.PI*y),.72)*(.38+.4*y),y*1.7-.85))}const v=new ku(m,48);v.scale(1,1,.86),Nn(v,h,o);const g=new Yi(1,7,5),p=Ei("#f7d99d",{roughness:.5});for(let _=0;_<6;_++){const y=.15+_*.125,x=Math.pow(Math.sin(Math.PI*y),.72)*(.38+.4*y);for(let A=0;A<10;A++){const w=A/10*Math.PI*2+_%2*.23;Nn(g,p,o,Math.sin(w)*x*1.018,y*1.7-.85,Math.cos(w)*x*.876).scale.set(.022,.043,.021)}}for(let _=0;_<5;_++){const y=_*Math.PI*2/5;go(o,0,.72,0,y,.37)}return t&&(l||u||d)&&Nn(new Oo(.22,1),new $n({color:"#d4efff",emissive:"#7facd7",emissiveIntensity:.25,roughness:.2}),o,0,0,0),o}function OS(i,e,t,n){const r=new Uo;r.environment=Vo.texture,r.add(new Wu("#fff8df","#869b89",1.1));const s=new ds("#fff5e5",1.7);s.position.set(-3,6,5),r.add(s);const a=new ds("#cbeaf2",.7);a.position.set(3,3,-2),r.add(a);const o=new Zt;r.add(o);const c=[];if(i==="plant"||i==="soil"){Nn(new Yi(1,40,16),Ei("#805a38"),o,0,-.015,0).scale.set(1.08,.14,.73);for(let f=0;f<14;f++){const h=f*2.4,m=.35+f%4*.17,v=Nn(new Fo(.037+f%3*.014),Ei(f%2?"#caa579":"#886448"),o,Math.sin(h)*m,.115,Math.cos(h)*m*.64);v.scale.y=.5}}if(i==="plant"){const d=n||e>=.22,f=d?.8:.42,h=new Zt;o.add(h),c.push({node:h,type:"bush"});for(let m=0;m<(d?3:2);m++){const v=m*2.4,g=Math.sin(v)*.26,p=Math.cos(v)*.2,_=d?.48+m%2*.16:.3;Bs(h,[[0,.1,0],[g*.4,_*.6,p*.6],[g,_,p]]),go(h,g,_,p,v*.8,f),d&&(go(h,g,_,p,v*.8+.8,.57),go(h,g,_,p,v*.8-.8,.57))}if(d&&(Bs(h,[[0,.13,0],[.22,.85,-.06],[.48,1.05,.05]]),Xc(h,.48,1.06,.06,.14),e<.55&&(Bs(h,[[0,.13,0],[-.26,.75,.15],[-.42,.8,.23]]),Xc(h,-.42,.82,.23,.13)),e>=.55))for(let m=0;m<(t.includes("twin")?3:2);m++){const v=m===0?-.48:m===1?.46:0,g=m===0?.55:.44,p=.46+m*.055;Bs(h,[[0,.18,0],[v*.6,1.03,p*.6],[v,g+.3,p]]);const _=qc(h,t,e>=.8,v,g,p,(t.includes("giant")?.56:.39)*(e<.8?.75:1));_.rotation.z=m%2?-.16:.14}}else if(i==="fruit"){const d=qc(o,t,!0,0,.8,0,t.includes("giant")?1.04:.86);c.push({node:d,type:"fruit"}),t.includes("twin")&&(d.position.x=-.4,d.scale.multiplyScalar(.72),qc(o,t,!0,.43,.78,.04,.62))}if(i!=="soil"&&e>=.8){if(t.some(f=>["shiny","firefly","stardust","moon","halo","rainbow","prism","nebula","thunder"].includes(f)))for(let f=0;f<6;f++){const h=Nn(new zu(.035),new bi({color:f%2?"#ffe7a3":"#c9f5fc"}),o);c.push({node:h,type:"spark",index:f})}if(t.includes("classical")||t.includes("breezy")){const f=Nn(new Vu(.17,.035,8,24),Ei("#e7bb73"),o,0,.48,.76);f.scale.x=1.4}if(t.includes("punk"))for(let f=0;f<3;f++)Nn(new Fu(.04,.12,5),Ei("#cbbaca",{metalness:.5}),o,-.24+f*.24,.9,.66);if(t.includes("petals"))for(let f=0;f<3;f++)Xc(o,-.7+f*.65,.4+f%2*.5,.15,.08)}o.rotation.y=-.18;const u=new nn(34,1,.1,30);return u.position.set(0,2.5,4.8),u.lookAt(0,.62,0),{scene:r,camera:u,moving:c,dispose(){const d=new Set,f=new Set;r.traverse(h=>{h.geometry&&d.add(h.geometry),h.material&&f.add(h.material)}),d.forEach(h=>h.dispose()),f.forEach(h=>h.dispose()),r.clear()}}}function ua(){!Ki&&!Go&&!document.hidden&&(Ki=requestAnimationFrame(BS))}function BS(i){if(Ki=0,document.hidden||Go)return;if(i-$c<50){ua();return}const e=Math.min((i-$c)/1e3,.1);$c=i,eu.matches||(Gr+=e);for(const t of Ai){if(!t.host.isConnected){(t.mounted||i-t.created>1e3)&&(t.dispose(),Ai.delete(t));continue}t.mounted=!0;const n=t.canvas.getBoundingClientRect();if(!n.width||!n.height||n.bottom<0||n.top>innerHeight||n.right<0||n.left>innerWidth||eu.matches&&t.painted&&t.w===n.width&&t.h===n.height)continue;const r=Math.max(1,Math.ceil(n.width*Math.min(devicePixelRatio,1.5))),s=Math.max(1,Math.ceil(n.height*Math.min(devicePixelRatio,1.5)));(t.canvas.width!==r||t.canvas.height!==s)&&(t.canvas.width=r,t.canvas.height=s),vn.setSize(r,s,!1),t.camera.aspect=r/s,t.camera.position.z=t.camera.aspect<.8?4.8*.8/t.camera.aspect:4.8,t.camera.updateProjectionMatrix(),t.animate&&t.animate(Gr);for(const a of t.moving)if(a.type==="bush")a.node.rotation.z=Math.sin(Gr*1.3)*.018;else if(a.type==="fruit")a.node.rotation.y=Math.sin(Gr*.7)*.08;else{const o=Gr*.4+a.index*1.05;a.node.position.set(Math.cos(o)*.9,.8+Math.sin(Gr+a.index)*.4,Math.sin(o)*.6)}vn.render(t.scene,t.camera),t.ctx.clearRect(0,0,r,s),t.ctx.drawImage(vn.domElement,0,0),t.canvas.dataset.ready="true",t.painted=!0,t.w=n.width,t.h=n.height}Ai.size&&ua()}function Mp(i,{mode:e="fruit",ratio:t=1,traits:n=[],regrowing:r=!1}={}){const s=e==="soil"?"soil":e==="fruit"?"fruit":t<.22&&!r?"sprout":t<.55?"flower":t<.8?"green":"ripe";return Sp(i,()=>OS(e,t,n,r),s)}function Sp(i,e,t){if(Go)return!1;try{FS();const n=document.createElement("canvas");n.className="strawberry-canvas",n.setAttribute("aria-hidden","true");const r=n.getContext("2d");if(!r)throw Error("Canvas unavailable");const s={host:i,canvas:n,ctx:r,...e(Vo.texture),mounted:!1,created:performance.now()};return i.append(n),i.classList.add("art-3d"),i.dataset.stage=t,Ai.add(s),ua(),!0}catch(n){return console.warn("3D 草莓不可用，保留原画",n),xp(),!1}}document.addEventListener("visibilitychange",()=>{document.hidden?(cancelAnimationFrame(Ki),Ki=0):ua()});eu.addEventListener("change",()=>{for(const i of Ai)i.painted=!1;ua()});window.addEventListener("pagehide",()=>{cancelAnimationFrame(Ki);for(const i of Ai)i.dispose();Ai.clear(),Vo?.dispose(),vn?.dispose()},{once:!0});function Bh(i,e){if(e===Ug)return console.warn("THREE.BufferGeometryUtils.toTrianglesDrawMode(): Geometry already defined as triangles."),i;if(e===$l||e===Pf){let t=i.getIndex();if(t===null){const a=[],o=i.getAttribute("position");if(o!==void 0){for(let c=0;c<o.count;c++)a.push(c);i.setIndex(a),t=i.getIndex()}else return console.error("THREE.BufferGeometryUtils.toTrianglesDrawMode(): Undefined position attribute. Processing not possible."),i}const n=t.count-2,r=[];if(e===$l)for(let a=1;a<=n;a++)r.push(t.getX(0)),r.push(t.getX(a)),r.push(t.getX(a+1));else for(let a=0;a<n;a++)a%2===0?(r.push(t.getX(a)),r.push(t.getX(a+1)),r.push(t.getX(a+2))):(r.push(t.getX(a+2)),r.push(t.getX(a+1)),r.push(t.getX(a)));r.length/3!==n&&console.error("THREE.BufferGeometryUtils.toTrianglesDrawMode(): Unable to generate correct amount of triangles.");const s=i.clone();return s.setIndex(r),s.clearGroups(),s}else return console.error("THREE.BufferGeometryUtils.toTrianglesDrawMode(): Unknown draw mode:",e),i}class bp extends gs{constructor(e){super(e),this.dracoLoader=null,this.ktx2Loader=null,this.meshoptDecoder=null,this.pluginCallbacks=[],this.register(function(t){return new GS(t)}),this.register(function(t){return new WS(t)}),this.register(function(t){return new QS(t)}),this.register(function(t){return new eb(t)}),this.register(function(t){return new tb(t)}),this.register(function(t){return new XS(t)}),this.register(function(t){return new qS(t)}),this.register(function(t){return new jS(t)}),this.register(function(t){return new YS(t)}),this.register(function(t){return new VS(t)}),this.register(function(t){return new KS(t)}),this.register(function(t){return new $S(t)}),this.register(function(t){return new JS(t)}),this.register(function(t){return new ZS(t)}),this.register(function(t){return new zS(t)}),this.register(function(t){return new nb(t)}),this.register(function(t){return new ib(t)})}load(e,t,n,r){const s=this;let a;if(this.resourcePath!=="")a=this.resourcePath;else if(this.path!==""){const l=qs.extractUrlBase(e);a=qs.resolveURL(l,this.path)}else a=qs.extractUrlBase(e);this.manager.itemStart(e);const o=function(l){r?r(l):console.error(l),s.manager.itemError(e),s.manager.itemEnd(e)},c=new dp(this.manager);c.setPath(this.path),c.setResponseType("arraybuffer"),c.setRequestHeader(this.requestHeader),c.setWithCredentials(this.withCredentials),c.load(e,function(l){try{s.parse(l,a,function(u){t(u),s.manager.itemEnd(e)},o)}catch(u){o(u)}},n,o)}setDRACOLoader(e){return this.dracoLoader=e,this}setKTX2Loader(e){return this.ktx2Loader=e,this}setMeshoptDecoder(e){return this.meshoptDecoder=e,this}register(e){return this.pluginCallbacks.indexOf(e)===-1&&this.pluginCallbacks.push(e),this}unregister(e){return this.pluginCallbacks.indexOf(e)!==-1&&this.pluginCallbacks.splice(this.pluginCallbacks.indexOf(e),1),this}parse(e,t,n,r){let s;const a={},o={},c=new TextDecoder;if(typeof e=="string")s=JSON.parse(e);else if(e instanceof ArrayBuffer)if(c.decode(new Uint8Array(e,0,4))===wp){try{a[it.KHR_BINARY_GLTF]=new rb(e)}catch(d){r&&r(d);return}s=JSON.parse(a[it.KHR_BINARY_GLTF].content)}else s=JSON.parse(c.decode(e));else s=e;if(s.asset===void 0||s.asset.version[0]<2){r&&r(new Error("THREE.GLTFLoader: Unsupported asset. glTF versions >=2.0 are supported."));return}const l=new vb(s,{path:t||this.resourcePath||"",crossOrigin:this.crossOrigin,requestHeader:this.requestHeader,manager:this.manager,ktx2Loader:this.ktx2Loader,meshoptDecoder:this.meshoptDecoder});l.fileLoader.setRequestHeader(this.requestHeader);for(let u=0;u<this.pluginCallbacks.length;u++){const d=this.pluginCallbacks[u](l);d.name||console.error("THREE.GLTFLoader: Invalid plugin found: missing name"),o[d.name]=d,a[d.name]=!0}if(s.extensionsUsed)for(let u=0;u<s.extensionsUsed.length;++u){const d=s.extensionsUsed[u],f=s.extensionsRequired||[];switch(d){case it.KHR_MATERIALS_UNLIT:a[d]=new HS;break;case it.KHR_DRACO_MESH_COMPRESSION:a[d]=new sb(s,this.dracoLoader);break;case it.KHR_TEXTURE_TRANSFORM:a[d]=new ab;break;case it.KHR_MESH_QUANTIZATION:a[d]=new ob;break;default:f.indexOf(d)>=0&&o[d]===void 0&&console.warn('THREE.GLTFLoader: Unknown extension "'+d+'".')}}l.setExtensions(a),l.setPlugins(o),l.parse(n,r)}parseAsync(e,t){const n=this;return new Promise(function(r,s){n.parse(e,t,r,s)})}}function kS(){let i={};return{get:function(e){return i[e]},add:function(e,t){i[e]=t},remove:function(e){delete i[e]},removeAll:function(){i={}}}}const it={KHR_BINARY_GLTF:"KHR_binary_glTF",KHR_DRACO_MESH_COMPRESSION:"KHR_draco_mesh_compression",KHR_LIGHTS_PUNCTUAL:"KHR_lights_punctual",KHR_MATERIALS_CLEARCOAT:"KHR_materials_clearcoat",KHR_MATERIALS_DISPERSION:"KHR_materials_dispersion",KHR_MATERIALS_IOR:"KHR_materials_ior",KHR_MATERIALS_SHEEN:"KHR_materials_sheen",KHR_MATERIALS_SPECULAR:"KHR_materials_specular",KHR_MATERIALS_TRANSMISSION:"KHR_materials_transmission",KHR_MATERIALS_IRIDESCENCE:"KHR_materials_iridescence",KHR_MATERIALS_ANISOTROPY:"KHR_materials_anisotropy",KHR_MATERIALS_UNLIT:"KHR_materials_unlit",KHR_MATERIALS_VOLUME:"KHR_materials_volume",KHR_TEXTURE_BASISU:"KHR_texture_basisu",KHR_TEXTURE_TRANSFORM:"KHR_texture_transform",KHR_MESH_QUANTIZATION:"KHR_mesh_quantization",KHR_MATERIALS_EMISSIVE_STRENGTH:"KHR_materials_emissive_strength",EXT_MATERIALS_BUMP:"EXT_materials_bump",EXT_TEXTURE_WEBP:"EXT_texture_webp",EXT_TEXTURE_AVIF:"EXT_texture_avif",EXT_MESHOPT_COMPRESSION:"EXT_meshopt_compression",EXT_MESH_GPU_INSTANCING:"EXT_mesh_gpu_instancing"};class zS{constructor(e){this.parser=e,this.name=it.KHR_LIGHTS_PUNCTUAL,this.cache={refs:{},uses:{}}}_markDefs(){const e=this.parser,t=this.parser.json.nodes||[];for(let n=0,r=t.length;n<r;n++){const s=t[n];s.extensions&&s.extensions[this.name]&&s.extensions[this.name].light!==void 0&&e._addNodeRef(this.cache,s.extensions[this.name].light)}}_loadLight(e){const t=this.parser,n="light:"+e;let r=t.cache.get(n);if(r)return r;const s=t.json,c=((s.extensions&&s.extensions[this.name]||{}).lights||[])[e];let l;const u=new We(16777215);c.color!==void 0&&u.setRGB(c.color[0],c.color[1],c.color[2],fn);const d=c.range!==void 0?c.range:0;switch(c.type){case"directional":l=new ds(u),l.target.position.set(0,0,-1),l.add(l.target);break;case"point":l=new fp(u),l.distance=d;break;case"spot":l=new kv(u),l.distance=d,c.spot=c.spot||{},c.spot.innerConeAngle=c.spot.innerConeAngle!==void 0?c.spot.innerConeAngle:0,c.spot.outerConeAngle=c.spot.outerConeAngle!==void 0?c.spot.outerConeAngle:Math.PI/4,l.angle=c.spot.outerConeAngle,l.penumbra=1-c.spot.innerConeAngle/c.spot.outerConeAngle,l.target.position.set(0,0,-1),l.add(l.target);break;default:throw new Error("THREE.GLTFLoader: Unexpected light type: "+c.type)}return l.position.set(0,0,0),ei(l,c),c.intensity!==void 0&&(l.intensity=c.intensity),l.name=t.createUniqueName(c.name||"light_"+e),r=Promise.resolve(l),t.cache.add(n,r),r}getDependency(e,t){if(e==="light")return this._loadLight(t)}createNodeAttachment(e){const t=this,n=this.parser,s=n.json.nodes[e],o=(s.extensions&&s.extensions[this.name]||{}).light;return o===void 0?null:this._loadLight(o).then(function(c){return n._getNodeRef(t.cache,o,c)})}}class HS{constructor(){this.name=it.KHR_MATERIALS_UNLIT}getMaterialType(){return bi}extendParams(e,t,n){const r=[];e.color=new We(1,1,1),e.opacity=1;const s=t.pbrMetallicRoughness;if(s){if(Array.isArray(s.baseColorFactor)){const a=s.baseColorFactor;e.color.setRGB(a[0],a[1],a[2],fn),e.opacity=a[3]}s.baseColorTexture!==void 0&&r.push(n.assignTexture(e,"map",s.baseColorTexture,Bt))}return Promise.all(r)}}class VS{constructor(e){this.parser=e,this.name=it.KHR_MATERIALS_EMISSIVE_STRENGTH}extendMaterialParams(e,t){const r=this.parser.json.materials[e];if(!r.extensions||!r.extensions[this.name])return Promise.resolve();const s=r.extensions[this.name].emissiveStrength;return s!==void 0&&(t.emissiveIntensity=s),Promise.resolve()}}class GS{constructor(e){this.parser=e,this.name=it.KHR_MATERIALS_CLEARCOAT}getMaterialType(e){const n=this.parser.json.materials[e];return!n.extensions||!n.extensions[this.name]?null:ln}extendMaterialParams(e,t){const n=this.parser,r=n.json.materials[e];if(!r.extensions||!r.extensions[this.name])return Promise.resolve();const s=[],a=r.extensions[this.name];if(a.clearcoatFactor!==void 0&&(t.clearcoat=a.clearcoatFactor),a.clearcoatTexture!==void 0&&s.push(n.assignTexture(t,"clearcoatMap",a.clearcoatTexture)),a.clearcoatRoughnessFactor!==void 0&&(t.clearcoatRoughness=a.clearcoatRoughnessFactor),a.clearcoatRoughnessTexture!==void 0&&s.push(n.assignTexture(t,"clearcoatRoughnessMap",a.clearcoatRoughnessTexture)),a.clearcoatNormalTexture!==void 0&&(s.push(n.assignTexture(t,"clearcoatNormalMap",a.clearcoatNormalTexture)),a.clearcoatNormalTexture.scale!==void 0)){const o=a.clearcoatNormalTexture.scale;t.clearcoatNormalScale=new ue(o,o)}return Promise.all(s)}}class WS{constructor(e){this.parser=e,this.name=it.KHR_MATERIALS_DISPERSION}getMaterialType(e){const n=this.parser.json.materials[e];return!n.extensions||!n.extensions[this.name]?null:ln}extendMaterialParams(e,t){const r=this.parser.json.materials[e];if(!r.extensions||!r.extensions[this.name])return Promise.resolve();const s=r.extensions[this.name];return t.dispersion=s.dispersion!==void 0?s.dispersion:0,Promise.resolve()}}class $S{constructor(e){this.parser=e,this.name=it.KHR_MATERIALS_IRIDESCENCE}getMaterialType(e){const n=this.parser.json.materials[e];return!n.extensions||!n.extensions[this.name]?null:ln}extendMaterialParams(e,t){const n=this.parser,r=n.json.materials[e];if(!r.extensions||!r.extensions[this.name])return Promise.resolve();const s=[],a=r.extensions[this.name];return a.iridescenceFactor!==void 0&&(t.iridescence=a.iridescenceFactor),a.iridescenceTexture!==void 0&&s.push(n.assignTexture(t,"iridescenceMap",a.iridescenceTexture)),a.iridescenceIor!==void 0&&(t.iridescenceIOR=a.iridescenceIor),t.iridescenceThicknessRange===void 0&&(t.iridescenceThicknessRange=[100,400]),a.iridescenceThicknessMinimum!==void 0&&(t.iridescenceThicknessRange[0]=a.iridescenceThicknessMinimum),a.iridescenceThicknessMaximum!==void 0&&(t.iridescenceThicknessRange[1]=a.iridescenceThicknessMaximum),a.iridescenceThicknessTexture!==void 0&&s.push(n.assignTexture(t,"iridescenceThicknessMap",a.iridescenceThicknessTexture)),Promise.all(s)}}class XS{constructor(e){this.parser=e,this.name=it.KHR_MATERIALS_SHEEN}getMaterialType(e){const n=this.parser.json.materials[e];return!n.extensions||!n.extensions[this.name]?null:ln}extendMaterialParams(e,t){const n=this.parser,r=n.json.materials[e];if(!r.extensions||!r.extensions[this.name])return Promise.resolve();const s=[];t.sheenColor=new We(0,0,0),t.sheenRoughness=0,t.sheen=1;const a=r.extensions[this.name];if(a.sheenColorFactor!==void 0){const o=a.sheenColorFactor;t.sheenColor.setRGB(o[0],o[1],o[2],fn)}return a.sheenRoughnessFactor!==void 0&&(t.sheenRoughness=a.sheenRoughnessFactor),a.sheenColorTexture!==void 0&&s.push(n.assignTexture(t,"sheenColorMap",a.sheenColorTexture,Bt)),a.sheenRoughnessTexture!==void 0&&s.push(n.assignTexture(t,"sheenRoughnessMap",a.sheenRoughnessTexture)),Promise.all(s)}}class qS{constructor(e){this.parser=e,this.name=it.KHR_MATERIALS_TRANSMISSION}getMaterialType(e){const n=this.parser.json.materials[e];return!n.extensions||!n.extensions[this.name]?null:ln}extendMaterialParams(e,t){const n=this.parser,r=n.json.materials[e];if(!r.extensions||!r.extensions[this.name])return Promise.resolve();const s=[],a=r.extensions[this.name];return a.transmissionFactor!==void 0&&(t.transmission=a.transmissionFactor),a.transmissionTexture!==void 0&&s.push(n.assignTexture(t,"transmissionMap",a.transmissionTexture)),Promise.all(s)}}class jS{constructor(e){this.parser=e,this.name=it.KHR_MATERIALS_VOLUME}getMaterialType(e){const n=this.parser.json.materials[e];return!n.extensions||!n.extensions[this.name]?null:ln}extendMaterialParams(e,t){const n=this.parser,r=n.json.materials[e];if(!r.extensions||!r.extensions[this.name])return Promise.resolve();const s=[],a=r.extensions[this.name];t.thickness=a.thicknessFactor!==void 0?a.thicknessFactor:0,a.thicknessTexture!==void 0&&s.push(n.assignTexture(t,"thicknessMap",a.thicknessTexture)),t.attenuationDistance=a.attenuationDistance||1/0;const o=a.attenuationColor||[1,1,1];return t.attenuationColor=new We().setRGB(o[0],o[1],o[2],fn),Promise.all(s)}}class YS{constructor(e){this.parser=e,this.name=it.KHR_MATERIALS_IOR}getMaterialType(e){const n=this.parser.json.materials[e];return!n.extensions||!n.extensions[this.name]?null:ln}extendMaterialParams(e,t){const r=this.parser.json.materials[e];if(!r.extensions||!r.extensions[this.name])return Promise.resolve();const s=r.extensions[this.name];return t.ior=s.ior!==void 0?s.ior:1.5,Promise.resolve()}}class KS{constructor(e){this.parser=e,this.name=it.KHR_MATERIALS_SPECULAR}getMaterialType(e){const n=this.parser.json.materials[e];return!n.extensions||!n.extensions[this.name]?null:ln}extendMaterialParams(e,t){const n=this.parser,r=n.json.materials[e];if(!r.extensions||!r.extensions[this.name])return Promise.resolve();const s=[],a=r.extensions[this.name];t.specularIntensity=a.specularFactor!==void 0?a.specularFactor:1,a.specularTexture!==void 0&&s.push(n.assignTexture(t,"specularIntensityMap",a.specularTexture));const o=a.specularColorFactor||[1,1,1];return t.specularColor=new We().setRGB(o[0],o[1],o[2],fn),a.specularColorTexture!==void 0&&s.push(n.assignTexture(t,"specularColorMap",a.specularColorTexture,Bt)),Promise.all(s)}}class ZS{constructor(e){this.parser=e,this.name=it.EXT_MATERIALS_BUMP}getMaterialType(e){const n=this.parser.json.materials[e];return!n.extensions||!n.extensions[this.name]?null:ln}extendMaterialParams(e,t){const n=this.parser,r=n.json.materials[e];if(!r.extensions||!r.extensions[this.name])return Promise.resolve();const s=[],a=r.extensions[this.name];return t.bumpScale=a.bumpFactor!==void 0?a.bumpFactor:1,a.bumpTexture!==void 0&&s.push(n.assignTexture(t,"bumpMap",a.bumpTexture)),Promise.all(s)}}class JS{constructor(e){this.parser=e,this.name=it.KHR_MATERIALS_ANISOTROPY}getMaterialType(e){const n=this.parser.json.materials[e];return!n.extensions||!n.extensions[this.name]?null:ln}extendMaterialParams(e,t){const n=this.parser,r=n.json.materials[e];if(!r.extensions||!r.extensions[this.name])return Promise.resolve();const s=[],a=r.extensions[this.name];return a.anisotropyStrength!==void 0&&(t.anisotropy=a.anisotropyStrength),a.anisotropyRotation!==void 0&&(t.anisotropyRotation=a.anisotropyRotation),a.anisotropyTexture!==void 0&&s.push(n.assignTexture(t,"anisotropyMap",a.anisotropyTexture)),Promise.all(s)}}class QS{constructor(e){this.parser=e,this.name=it.KHR_TEXTURE_BASISU}loadTexture(e){const t=this.parser,n=t.json,r=n.textures[e];if(!r.extensions||!r.extensions[this.name])return null;const s=r.extensions[this.name],a=t.options.ktx2Loader;if(!a){if(n.extensionsRequired&&n.extensionsRequired.indexOf(this.name)>=0)throw new Error("THREE.GLTFLoader: setKTX2Loader must be called before loading KTX2 textures");return null}return t.loadTextureImage(e,s.source,a)}}class eb{constructor(e){this.parser=e,this.name=it.EXT_TEXTURE_WEBP}loadTexture(e){const t=this.name,n=this.parser,r=n.json,s=r.textures[e];if(!s.extensions||!s.extensions[t])return null;const a=s.extensions[t],o=r.images[a.source];let c=n.textureLoader;if(o.uri){const l=n.options.manager.getHandler(o.uri);l!==null&&(c=l)}return n.loadTextureImage(e,a.source,c)}}class tb{constructor(e){this.parser=e,this.name=it.EXT_TEXTURE_AVIF}loadTexture(e){const t=this.name,n=this.parser,r=n.json,s=r.textures[e];if(!s.extensions||!s.extensions[t])return null;const a=s.extensions[t],o=r.images[a.source];let c=n.textureLoader;if(o.uri){const l=n.options.manager.getHandler(o.uri);l!==null&&(c=l)}return n.loadTextureImage(e,a.source,c)}}class nb{constructor(e){this.name=it.EXT_MESHOPT_COMPRESSION,this.parser=e}loadBufferView(e){const t=this.parser.json,n=t.bufferViews[e];if(n.extensions&&n.extensions[this.name]){const r=n.extensions[this.name],s=this.parser.getDependency("buffer",r.buffer),a=this.parser.options.meshoptDecoder;if(!a||!a.supported){if(t.extensionsRequired&&t.extensionsRequired.indexOf(this.name)>=0)throw new Error("THREE.GLTFLoader: setMeshoptDecoder must be called before loading compressed files");return null}return s.then(function(o){const c=r.byteOffset||0,l=r.byteLength||0,u=r.count,d=r.byteStride,f=new Uint8Array(o,c,l);return a.decodeGltfBufferAsync?a.decodeGltfBufferAsync(u,d,f,r.mode,r.filter).then(function(h){return h.buffer}):a.ready.then(function(){const h=new ArrayBuffer(u*d);return a.decodeGltfBuffer(new Uint8Array(h),u,d,f,r.mode,r.filter),h})})}else return null}}class ib{constructor(e){this.name=it.EXT_MESH_GPU_INSTANCING,this.parser=e}createNodeMesh(e){const t=this.parser.json,n=t.nodes[e];if(!n.extensions||!n.extensions[this.name]||n.mesh===void 0)return null;const r=t.meshes[n.mesh];for(const l of r.primitives)if(l.mode!==Pn.TRIANGLES&&l.mode!==Pn.TRIANGLE_STRIP&&l.mode!==Pn.TRIANGLE_FAN&&l.mode!==void 0)return null;const a=n.extensions[this.name].attributes,o=[],c={};for(const l in a)o.push(this.parser.getDependency("accessor",a[l]).then(u=>(c[l]=u,c[l])));return o.length<1?null:(o.push(this.parser.createNodeMesh(e)),Promise.all(o).then(l=>{const u=l.pop(),d=u.isGroup?u.children:[u],f=l[0].count,h=[];for(const m of d){const v=new Ke,g=new P,p=new Ji,_=new P(1,1,1),y=new qf(m.geometry,m.material,f);for(let x=0;x<f;x++)c.TRANSLATION&&g.fromBufferAttribute(c.TRANSLATION,x),c.ROTATION&&p.fromBufferAttribute(c.ROTATION,x),c.SCALE&&_.fromBufferAttribute(c.SCALE,x),y.setMatrixAt(x,v.compose(g,p,_));for(const x in c)if(x==="_COLOR_0"){const A=c[x];y.instanceColor=new ql(A.array,A.itemSize,A.normalized)}else x!=="TRANSLATION"&&x!=="ROTATION"&&x!=="SCALE"&&m.geometry.setAttribute(x,c[x]);wt.prototype.copy.call(y,m),this.parser.assignFinalMaterial(y),h.push(y)}return u.isGroup?(u.clear(),u.add(...h),u):h[0]}))}}const wp="glTF",Ds=12,kh={JSON:1313821514,BIN:5130562};class rb{constructor(e){this.name=it.KHR_BINARY_GLTF,this.content=null,this.body=null;const t=new DataView(e,0,Ds),n=new TextDecoder;if(this.header={magic:n.decode(new Uint8Array(e.slice(0,4))),version:t.getUint32(4,!0),length:t.getUint32(8,!0)},this.header.magic!==wp)throw new Error("THREE.GLTFLoader: Unsupported glTF-Binary header.");if(this.header.version<2)throw new Error("THREE.GLTFLoader: Legacy binary file detected.");const r=this.header.length-Ds,s=new DataView(e,Ds);let a=0;for(;a<r;){const o=s.getUint32(a,!0);a+=4;const c=s.getUint32(a,!0);if(a+=4,c===kh.JSON){const l=new Uint8Array(e,Ds+a,o);this.content=n.decode(l)}else if(c===kh.BIN){const l=Ds+a;this.body=e.slice(l,l+o)}a+=o}if(this.content===null)throw new Error("THREE.GLTFLoader: JSON content not found.")}}class sb{constructor(e,t){if(!t)throw new Error("THREE.GLTFLoader: No DRACOLoader instance provided.");this.name=it.KHR_DRACO_MESH_COMPRESSION,this.json=e,this.dracoLoader=t,this.dracoLoader.preload()}decodePrimitive(e,t){const n=this.json,r=this.dracoLoader,s=e.extensions[this.name].bufferView,a=e.extensions[this.name].attributes,o={},c={},l={};for(const u in a){const d=tu[u]||u.toLowerCase();o[d]=a[u]}for(const u in e.attributes){const d=tu[u]||u.toLowerCase();if(a[u]!==void 0){const f=n.accessors[e.attributes[u]],h=Qr[f.componentType];l[d]=h.name,c[d]=f.normalized===!0}}return t.getDependency("bufferView",s).then(function(u){return new Promise(function(d,f){r.decodeDracoFile(u,function(h){for(const m in h.attributes){const v=h.attributes[m],g=c[m];g!==void 0&&(v.normalized=g)}d(h)},o,l,fn,f)})})}}class ab{constructor(){this.name=it.KHR_TEXTURE_TRANSFORM}extendTexture(e,t){return(t.texCoord===void 0||t.texCoord===e.channel)&&t.offset===void 0&&t.rotation===void 0&&t.scale===void 0||(e=e.clone(),t.texCoord!==void 0&&(e.channel=t.texCoord),t.offset!==void 0&&e.offset.fromArray(t.offset),t.rotation!==void 0&&(e.rotation=t.rotation),t.scale!==void 0&&e.repeat.fromArray(t.scale),e.needsUpdate=!0),e}}class ob{constructor(){this.name=it.KHR_MESH_QUANTIZATION}}class Ep extends va{constructor(e,t,n,r){super(e,t,n,r)}copySampleValue_(e){const t=this.resultBuffer,n=this.sampleValues,r=this.valueSize,s=e*r*3+r;for(let a=0;a!==r;a++)t[a]=n[s+a];return t}interpolate_(e,t,n,r){const s=this.resultBuffer,a=this.sampleValues,o=this.valueSize,c=o*2,l=o*3,u=r-t,d=(n-t)/u,f=d*d,h=f*d,m=e*l,v=m-l,g=-2*h+3*f,p=h-f,_=1-g,y=p-f+d;for(let x=0;x!==o;x++){const A=a[v+x+o],w=a[v+x+c]*u,R=a[m+x+o],C=a[m+x]*u;s[x]=_*A+y*w+g*R+p*C}return s}}const cb=new Ji;class lb extends Ep{interpolate_(e,t,n,r){const s=super.interpolate_(e,t,n,r);return cb.fromArray(s).normalize().toArray(s),s}}const Pn={POINTS:0,LINES:1,LINE_LOOP:2,LINE_STRIP:3,TRIANGLES:4,TRIANGLE_STRIP:5,TRIANGLE_FAN:6},Qr={5120:Int8Array,5121:Uint8Array,5122:Int16Array,5123:Uint16Array,5125:Uint32Array,5126:Float32Array},zh={9728:dn,9729:En,9984:bf,9985:lo,9986:Us,9987:Si},Hh={33071:Hi,33648:xo,10497:rs},jc={SCALAR:1,VEC2:2,VEC3:3,VEC4:4,MAT2:4,MAT3:9,MAT4:16},tu={POSITION:"position",NORMAL:"normal",TANGENT:"tangent",TEXCOORD_0:"uv",TEXCOORD_1:"uv1",TEXCOORD_2:"uv2",TEXCOORD_3:"uv3",COLOR_0:"color",WEIGHTS_0:"skinWeight",JOINTS_0:"skinIndex"},Fi={scale:"scale",translation:"position",rotation:"quaternion",weights:"morphTargetInfluences"},ub={CUBICSPLINE:void 0,LINEAR:ia,STEP:na},Yc={OPAQUE:"OPAQUE",MASK:"MASK",BLEND:"BLEND"};function db(i){return i.DefaultMaterial===void 0&&(i.DefaultMaterial=new $n({color:16777215,emissive:0,metalness:1,roughness:1,transparent:!1,depthTest:!0,side:Ci})),i.DefaultMaterial}function cr(i,e,t){for(const n in t.extensions)i[n]===void 0&&(e.userData.gltfExtensions=e.userData.gltfExtensions||{},e.userData.gltfExtensions[n]=t.extensions[n])}function ei(i,e){e.extras!==void 0&&(typeof e.extras=="object"?Object.assign(i.userData,e.extras):console.warn("THREE.GLTFLoader: Ignoring primitive type .extras, "+e.extras))}function hb(i,e,t){let n=!1,r=!1,s=!1;for(let l=0,u=e.length;l<u;l++){const d=e[l];if(d.POSITION!==void 0&&(n=!0),d.NORMAL!==void 0&&(r=!0),d.COLOR_0!==void 0&&(s=!0),n&&r&&s)break}if(!n&&!r&&!s)return Promise.resolve(i);const a=[],o=[],c=[];for(let l=0,u=e.length;l<u;l++){const d=e[l];if(n){const f=d.POSITION!==void 0?t.getDependency("accessor",d.POSITION):i.attributes.position;a.push(f)}if(r){const f=d.NORMAL!==void 0?t.getDependency("accessor",d.NORMAL):i.attributes.normal;o.push(f)}if(s){const f=d.COLOR_0!==void 0?t.getDependency("accessor",d.COLOR_0):i.attributes.color;c.push(f)}}return Promise.all([Promise.all(a),Promise.all(o),Promise.all(c)]).then(function(l){const u=l[0],d=l[1],f=l[2];return n&&(i.morphAttributes.position=u),r&&(i.morphAttributes.normal=d),s&&(i.morphAttributes.color=f),i.morphTargetsRelative=!0,i})}function fb(i,e){if(i.updateMorphTargets(),e.weights!==void 0)for(let t=0,n=e.weights.length;t<n;t++)i.morphTargetInfluences[t]=e.weights[t];if(e.extras&&Array.isArray(e.extras.targetNames)){const t=e.extras.targetNames;if(i.morphTargetInfluences.length===t.length){i.morphTargetDictionary={};for(let n=0,r=t.length;n<r;n++)i.morphTargetDictionary[t[n]]=n}else console.warn("THREE.GLTFLoader: Invalid extras.targetNames length. Ignoring names.")}}function pb(i){let e;const t=i.extensions&&i.extensions[it.KHR_DRACO_MESH_COMPRESSION];if(t?e="draco:"+t.bufferView+":"+t.indices+":"+Kc(t.attributes):e=i.indices+":"+Kc(i.attributes)+":"+i.mode,i.targets!==void 0)for(let n=0,r=i.targets.length;n<r;n++)e+=":"+Kc(i.targets[n]);return e}function Kc(i){let e="";const t=Object.keys(i).sort();for(let n=0,r=t.length;n<r;n++)e+=t[n]+":"+i[t[n]]+";";return e}function nu(i){switch(i){case Int8Array:return 1/127;case Uint8Array:return 1/255;case Int16Array:return 1/32767;case Uint16Array:return 1/65535;default:throw new Error("THREE.GLTFLoader: Unsupported normalized accessor component type.")}}function mb(i){return i.search(/\.jpe?g($|\?)/i)>0||i.search(/^data\:image\/jpeg/)===0?"image/jpeg":i.search(/\.webp($|\?)/i)>0||i.search(/^data\:image\/webp/)===0?"image/webp":i.search(/\.ktx2($|\?)/i)>0||i.search(/^data\:image\/ktx2/)===0?"image/ktx2":"image/png"}const gb=new Ke;class vb{constructor(e={},t={}){this.json=e,this.extensions={},this.plugins={},this.options=t,this.cache=new kS,this.associations=new Map,this.primitiveCache={},this.nodeCache={},this.meshCache={refs:{},uses:{}},this.cameraCache={refs:{},uses:{}},this.lightCache={refs:{},uses:{}},this.sourceCache={},this.textureCache={},this.nodeNamesUsed={};let n=!1,r=-1,s=!1,a=-1;if(typeof navigator<"u"){const o=navigator.userAgent;n=/^((?!chrome|android).)*safari/i.test(o)===!0;const c=o.match(/Version\/(\d+)/);r=n&&c?parseInt(c[1],10):-1,s=o.indexOf("Firefox")>-1,a=s?o.match(/Firefox\/([0-9]+)\./)[1]:-1}typeof createImageBitmap>"u"||n&&r<17||s&&a<98?this.textureLoader=new hp(this.options.manager):this.textureLoader=new Vv(this.options.manager),this.textureLoader.setCrossOrigin(this.options.crossOrigin),this.textureLoader.setRequestHeader(this.options.requestHeader),this.fileLoader=new dp(this.options.manager),this.fileLoader.setResponseType("arraybuffer"),this.options.crossOrigin==="use-credentials"&&this.fileLoader.setWithCredentials(!0)}setExtensions(e){this.extensions=e}setPlugins(e){this.plugins=e}parse(e,t){const n=this,r=this.json,s=this.extensions;this.cache.removeAll(),this.nodeCache={},this._invokeAll(function(a){return a._markDefs&&a._markDefs()}),Promise.all(this._invokeAll(function(a){return a.beforeRoot&&a.beforeRoot()})).then(function(){return Promise.all([n.getDependencies("scene"),n.getDependencies("animation"),n.getDependencies("camera")])}).then(function(a){const o={scene:a[0][r.scene||0],scenes:a[0],animations:a[1],cameras:a[2],asset:r.asset,parser:n,userData:{}};return cr(s,o,r),ei(o,r),Promise.all(n._invokeAll(function(c){return c.afterRoot&&c.afterRoot(o)})).then(function(){for(const c of o.scenes)c.updateMatrixWorld();e(o)})}).catch(t)}_markDefs(){const e=this.json.nodes||[],t=this.json.skins||[],n=this.json.meshes||[];for(let r=0,s=t.length;r<s;r++){const a=t[r].joints;for(let o=0,c=a.length;o<c;o++)e[a[o]].isBone=!0}for(let r=0,s=e.length;r<s;r++){const a=e[r];a.mesh!==void 0&&(this._addNodeRef(this.meshCache,a.mesh),a.skin!==void 0&&(n[a.mesh].isSkinnedMesh=!0)),a.camera!==void 0&&this._addNodeRef(this.cameraCache,a.camera)}}_addNodeRef(e,t){t!==void 0&&(e.refs[t]===void 0&&(e.refs[t]=e.uses[t]=0),e.refs[t]++)}_getNodeRef(e,t,n){if(e.refs[t]<=1)return n;const r=n.clone(),s=(a,o)=>{const c=this.associations.get(a);c!=null&&this.associations.set(o,c);for(const[l,u]of a.children.entries())s(u,o.children[l])};return s(n,r),r.name+="_instance_"+e.uses[t]++,r}_invokeOne(e){const t=Object.values(this.plugins);t.push(this);for(let n=0;n<t.length;n++){const r=e(t[n]);if(r)return r}return null}_invokeAll(e){const t=Object.values(this.plugins);t.unshift(this);const n=[];for(let r=0;r<t.length;r++){const s=e(t[r]);s&&n.push(s)}return n}getDependency(e,t){const n=e+":"+t;let r=this.cache.get(n);if(!r){switch(e){case"scene":r=this.loadScene(t);break;case"node":r=this._invokeOne(function(s){return s.loadNode&&s.loadNode(t)});break;case"mesh":r=this._invokeOne(function(s){return s.loadMesh&&s.loadMesh(t)});break;case"accessor":r=this.loadAccessor(t);break;case"bufferView":r=this._invokeOne(function(s){return s.loadBufferView&&s.loadBufferView(t)});break;case"buffer":r=this.loadBuffer(t);break;case"material":r=this._invokeOne(function(s){return s.loadMaterial&&s.loadMaterial(t)});break;case"texture":r=this._invokeOne(function(s){return s.loadTexture&&s.loadTexture(t)});break;case"skin":r=this.loadSkin(t);break;case"animation":r=this._invokeOne(function(s){return s.loadAnimation&&s.loadAnimation(t)});break;case"camera":r=this.loadCamera(t);break;default:if(r=this._invokeOne(function(s){return s!=this&&s.getDependency&&s.getDependency(e,t)}),!r)throw new Error("Unknown type: "+e);break}this.cache.add(n,r)}return r}getDependencies(e){let t=this.cache.get(e);if(!t){const n=this,r=this.json[e+(e==="mesh"?"es":"s")]||[];t=Promise.all(r.map(function(s,a){return n.getDependency(e,a)})),this.cache.add(e,t)}return t}loadBuffer(e){const t=this.json.buffers[e],n=this.fileLoader;if(t.type&&t.type!=="arraybuffer")throw new Error("THREE.GLTFLoader: "+t.type+" buffer type is not supported.");if(t.uri===void 0&&e===0)return Promise.resolve(this.extensions[it.KHR_BINARY_GLTF].body);const r=this.options;return new Promise(function(s,a){n.load(qs.resolveURL(t.uri,r.path),s,void 0,function(){a(new Error('THREE.GLTFLoader: Failed to load buffer "'+t.uri+'".'))})})}loadBufferView(e){const t=this.json.bufferViews[e];return this.getDependency("buffer",t.buffer).then(function(n){const r=t.byteLength||0,s=t.byteOffset||0;return n.slice(s,s+r)})}loadAccessor(e){const t=this,n=this.json,r=this.json.accessors[e];if(r.bufferView===void 0&&r.sparse===void 0){const a=jc[r.type],o=Qr[r.componentType],c=r.normalized===!0,l=new o(r.count*a);return Promise.resolve(new hn(l,a,c))}const s=[];return r.bufferView!==void 0?s.push(this.getDependency("bufferView",r.bufferView)):s.push(null),r.sparse!==void 0&&(s.push(this.getDependency("bufferView",r.sparse.indices.bufferView)),s.push(this.getDependency("bufferView",r.sparse.values.bufferView))),Promise.all(s).then(function(a){const o=a[0],c=jc[r.type],l=Qr[r.componentType],u=l.BYTES_PER_ELEMENT,d=u*c,f=r.byteOffset||0,h=r.bufferView!==void 0?n.bufferViews[r.bufferView].byteStride:void 0,m=r.normalized===!0;let v,g;if(h&&h!==d){const p=Math.floor(f/h),_="InterleavedBuffer:"+r.bufferView+":"+r.componentType+":"+p+":"+r.count;let y=t.cache.get(_);y||(v=new l(o,p*h,r.count*h/u),y=new Vf(v,h/u),t.cache.add(_,y)),g=new aa(y,c,f%h/u,m)}else o===null?v=new l(r.count*c):v=new l(o,f,r.count*c),g=new hn(v,c,m);if(r.sparse!==void 0){const p=jc.SCALAR,_=Qr[r.sparse.indices.componentType],y=r.sparse.indices.byteOffset||0,x=r.sparse.values.byteOffset||0,A=new _(a[1],y,r.sparse.count*p),w=new l(a[2],x,r.sparse.count*c);o!==null&&(g=new hn(g.array.slice(),g.itemSize,g.normalized)),g.normalized=!1;for(let R=0,C=A.length;R<C;R++){const S=A[R];if(g.setX(S,w[R*c]),c>=2&&g.setY(S,w[R*c+1]),c>=3&&g.setZ(S,w[R*c+2]),c>=4&&g.setW(S,w[R*c+3]),c>=5)throw new Error("THREE.GLTFLoader: Unsupported itemSize in sparse BufferAttribute.")}g.normalized=m}return g})}loadTexture(e){const t=this.json,n=this.options,s=t.textures[e].source,a=t.images[s];let o=this.textureLoader;if(a.uri){const c=n.manager.getHandler(a.uri);c!==null&&(o=c)}return this.loadTextureImage(e,s,o)}loadTextureImage(e,t,n){const r=this,s=this.json,a=s.textures[e],o=s.images[t],c=(o.uri||o.bufferView)+":"+a.sampler;if(this.textureCache[c])return this.textureCache[c];const l=this.loadImageSource(t,n).then(function(u){u.flipY=!1,u.name=a.name||o.name||"",u.name===""&&typeof o.uri=="string"&&o.uri.startsWith("data:image/")===!1&&(u.name=o.uri);const f=(s.samplers||{})[a.sampler]||{};return u.magFilter=zh[f.magFilter]||En,u.minFilter=zh[f.minFilter]||Si,u.wrapS=Hh[f.wrapS]||rs,u.wrapT=Hh[f.wrapT]||rs,u.generateMipmaps=!u.isCompressedTexture&&u.minFilter!==dn&&u.minFilter!==En,r.associations.set(u,{textures:e}),u}).catch(function(){return null});return this.textureCache[c]=l,l}loadImageSource(e,t){const n=this,r=this.json,s=this.options;if(this.sourceCache[e]!==void 0)return this.sourceCache[e].then(d=>d.clone());const a=r.images[e],o=self.URL||self.webkitURL;let c=a.uri||"",l=!1;if(a.bufferView!==void 0)c=n.getDependency("bufferView",a.bufferView).then(function(d){l=!0;const f=new Blob([d],{type:a.mimeType});return c=o.createObjectURL(f),c});else if(a.uri===void 0)throw new Error("THREE.GLTFLoader: Image "+e+" is missing URI and bufferView");const u=Promise.resolve(c).then(function(d){return new Promise(function(f,h){let m=f;t.isImageBitmapLoader===!0&&(m=function(v){const g=new Vt(v);g.needsUpdate=!0,f(g)}),t.load(qs.resolveURL(d,s.path),m,void 0,h)})}).then(function(d){return l===!0&&o.revokeObjectURL(c),ei(d,a),d.userData.mimeType=a.mimeType||mb(a.uri),d}).catch(function(d){throw console.error("THREE.GLTFLoader: Couldn't load texture",c),d});return this.sourceCache[e]=u,u}assignTexture(e,t,n,r){const s=this;return this.getDependency("texture",n.index).then(function(a){if(!a)return null;if(n.texCoord!==void 0&&n.texCoord>0&&(a=a.clone(),a.channel=n.texCoord),s.extensions[it.KHR_TEXTURE_TRANSFORM]){const o=n.extensions!==void 0?n.extensions[it.KHR_TEXTURE_TRANSFORM]:void 0;if(o){const c=s.associations.get(a);a=s.extensions[it.KHR_TEXTURE_TRANSFORM].extendTexture(a,o),s.associations.set(a,c)}}return r!==void 0&&(a.colorSpace=r),e[t]=a,a})}assignFinalMaterial(e){const t=e.geometry;let n=e.material;const r=t.attributes.tangent===void 0,s=t.attributes.color!==void 0,a=t.attributes.normal===void 0;if(e.isPoints){const o="PointsMaterial:"+n.uuid;let c=this.cache.get(o);c||(c=new Yf,On.prototype.copy.call(c,n),c.color.copy(n.color),c.map=n.map,c.sizeAttenuation=!1,this.cache.add(o,c)),n=c}else if(e.isLine){const o="LineBasicMaterial:"+n.uuid;let c=this.cache.get(o);c||(c=new jf,On.prototype.copy.call(c,n),c.color.copy(n.color),c.map=n.map,this.cache.add(o,c)),n=c}if(r||s||a){let o="ClonedMaterial:"+n.uuid+":";r&&(o+="derivative-tangents:"),s&&(o+="vertex-colors:"),a&&(o+="flat-shading:");let c=this.cache.get(o);c||(c=n.clone(),s&&(c.vertexColors=!0),a&&(c.flatShading=!0),r&&(c.normalScale&&(c.normalScale.y*=-1),c.clearcoatNormalScale&&(c.clearcoatNormalScale.y*=-1)),this.cache.add(o,c),this.associations.set(c,this.associations.get(n))),n=c}e.material=n}getMaterialType(){return $n}loadMaterial(e){const t=this,n=this.json,r=this.extensions,s=n.materials[e];let a;const o={},c=s.extensions||{},l=[];if(c[it.KHR_MATERIALS_UNLIT]){const d=r[it.KHR_MATERIALS_UNLIT];a=d.getMaterialType(),l.push(d.extendParams(o,s,t))}else{const d=s.pbrMetallicRoughness||{};if(o.color=new We(1,1,1),o.opacity=1,Array.isArray(d.baseColorFactor)){const f=d.baseColorFactor;o.color.setRGB(f[0],f[1],f[2],fn),o.opacity=f[3]}d.baseColorTexture!==void 0&&l.push(t.assignTexture(o,"map",d.baseColorTexture,Bt)),o.metalness=d.metallicFactor!==void 0?d.metallicFactor:1,o.roughness=d.roughnessFactor!==void 0?d.roughnessFactor:1,d.metallicRoughnessTexture!==void 0&&(l.push(t.assignTexture(o,"metalnessMap",d.metallicRoughnessTexture)),l.push(t.assignTexture(o,"roughnessMap",d.metallicRoughnessTexture))),a=this._invokeOne(function(f){return f.getMaterialType&&f.getMaterialType(e)}),l.push(Promise.all(this._invokeAll(function(f){return f.extendMaterialParams&&f.extendMaterialParams(e,o)})))}s.doubleSided===!0&&(o.side=In);const u=s.alphaMode||Yc.OPAQUE;if(u===Yc.BLEND?(o.transparent=!0,o.depthWrite=!1):(o.transparent=!1,u===Yc.MASK&&(o.alphaTest=s.alphaCutoff!==void 0?s.alphaCutoff:.5)),s.normalTexture!==void 0&&a!==bi&&(l.push(t.assignTexture(o,"normalMap",s.normalTexture)),o.normalScale=new ue(1,1),s.normalTexture.scale!==void 0)){const d=s.normalTexture.scale;o.normalScale.set(d,d)}if(s.occlusionTexture!==void 0&&a!==bi&&(l.push(t.assignTexture(o,"aoMap",s.occlusionTexture)),s.occlusionTexture.strength!==void 0&&(o.aoMapIntensity=s.occlusionTexture.strength)),s.emissiveFactor!==void 0&&a!==bi){const d=s.emissiveFactor;o.emissive=new We().setRGB(d[0],d[1],d[2],fn)}return s.emissiveTexture!==void 0&&a!==bi&&l.push(t.assignTexture(o,"emissiveMap",s.emissiveTexture,Bt)),Promise.all(l).then(function(){const d=new a(o);return s.name&&(d.name=s.name),ei(d,s),t.associations.set(d,{materials:e}),s.extensions&&cr(r,d,s),d})}createUniqueName(e){const t=gt.sanitizeNodeName(e||"");return t in this.nodeNamesUsed?t+"_"+ ++this.nodeNamesUsed[t]:(this.nodeNamesUsed[t]=0,t)}loadGeometries(e){const t=this,n=this.extensions,r=this.primitiveCache;function s(o){return n[it.KHR_DRACO_MESH_COMPRESSION].decodePrimitive(o,t).then(function(c){return Vh(c,o,t)})}const a=[];for(let o=0,c=e.length;o<c;o++){const l=e[o],u=pb(l),d=r[u];if(d)a.push(d.promise);else{let f;l.extensions&&l.extensions[it.KHR_DRACO_MESH_COMPRESSION]?f=s(l):f=Vh(new Xt,l,t),r[u]={primitive:l,promise:f},a.push(f)}}return Promise.all(a)}loadMesh(e){const t=this,n=this.json,r=this.extensions,s=n.meshes[e],a=s.primitives,o=[];for(let c=0,l=a.length;c<l;c++){const u=a[c].material===void 0?db(this.cache):this.getDependency("material",a[c].material);o.push(u)}return o.push(t.loadGeometries(a)),Promise.all(o).then(function(c){const l=c.slice(0,c.length-1),u=c[c.length-1],d=[];for(let h=0,m=u.length;h<m;h++){const v=u[h],g=a[h];let p;const _=l[h];if(g.mode===Pn.TRIANGLES||g.mode===Pn.TRIANGLE_STRIP||g.mode===Pn.TRIANGLE_FAN||g.mode===void 0)p=s.isSkinnedMesh===!0?new F0(v,_):new Tt(v,_),p.isSkinnedMesh===!0&&p.normalizeSkinWeights(),g.mode===Pn.TRIANGLE_STRIP?p.geometry=Bh(p.geometry,Pf):g.mode===Pn.TRIANGLE_FAN&&(p.geometry=Bh(p.geometry,$l));else if(g.mode===Pn.LINES)p=new V0(v,_);else if(g.mode===Pn.LINE_STRIP)p=new Du(v,_);else if(g.mode===Pn.LINE_LOOP)p=new G0(v,_);else if(g.mode===Pn.POINTS)p=new W0(v,_);else throw new Error("THREE.GLTFLoader: Primitive mode unsupported: "+g.mode);Object.keys(p.geometry.morphAttributes).length>0&&fb(p,s),p.name=t.createUniqueName(s.name||"mesh_"+e),ei(p,s),g.extensions&&cr(r,p,g),t.assignFinalMaterial(p),d.push(p)}for(let h=0,m=d.length;h<m;h++)t.associations.set(d[h],{meshes:e,primitives:h});if(d.length===1)return s.extensions&&cr(r,d[0],s),d[0];const f=new Zt;s.extensions&&cr(r,f,s),t.associations.set(f,{meshes:e});for(let h=0,m=d.length;h<m;h++)f.add(d[h]);return f})}loadCamera(e){let t;const n=this.json.cameras[e],r=n[n.type];if(!r){console.warn("THREE.GLTFLoader: Missing camera parameters.");return}return n.type==="perspective"?t=new nn(c0.radToDeg(r.yfov),r.aspectRatio||1,r.znear||1,r.zfar||2e6):n.type==="orthographic"&&(t=new zo(-r.xmag,r.xmag,r.ymag,-r.ymag,r.znear,r.zfar)),n.name&&(t.name=this.createUniqueName(n.name)),ei(t,n),Promise.resolve(t)}loadSkin(e){const t=this.json.skins[e],n=[];for(let r=0,s=t.joints.length;r<s;r++)n.push(this._loadNodeShallow(t.joints[r]));return t.inverseBindMatrices!==void 0?n.push(this.getDependency("accessor",t.inverseBindMatrices)):n.push(null),Promise.all(n).then(function(r){const s=r.pop(),a=r,o=[],c=[];for(let l=0,u=a.length;l<u;l++){const d=a[l];if(d){o.push(d);const f=new Ke;s!==null&&f.fromArray(s.array,l*16),c.push(f)}else console.warn('THREE.GLTFLoader: Joint "%s" could not be found.',t.joints[l])}return new Pu(o,c)})}loadAnimation(e){const t=this.json,n=this,r=t.animations[e],s=r.name?r.name:"animation_"+e,a=[],o=[],c=[],l=[],u=[];for(let d=0,f=r.channels.length;d<f;d++){const h=r.channels[d],m=r.samplers[h.sampler],v=h.target,g=v.node,p=r.parameters!==void 0?r.parameters[m.input]:m.input,_=r.parameters!==void 0?r.parameters[m.output]:m.output;v.node!==void 0&&(a.push(this.getDependency("node",g)),o.push(this.getDependency("accessor",p)),c.push(this.getDependency("accessor",_)),l.push(m),u.push(v))}return Promise.all([Promise.all(a),Promise.all(o),Promise.all(c),Promise.all(l),Promise.all(u)]).then(function(d){const f=d[0],h=d[1],m=d[2],v=d[3],g=d[4],p=[];for(let y=0,x=f.length;y<x;y++){const A=f[y],w=h[y],R=m[y],C=v[y],S=g[y];if(A===void 0)continue;A.updateMatrix&&A.updateMatrix();const b=n._createAnimationTracks(A,w,R,C,S);if(b)for(let L=0;L<b.length;L++)p.push(b[L])}const _=new Pv(s,void 0,p);return ei(_,r),_})}createNodeMesh(e){const t=this.json,n=this,r=t.nodes[e];return r.mesh===void 0?null:n.getDependency("mesh",r.mesh).then(function(s){const a=n._getNodeRef(n.meshCache,r.mesh,s);return r.weights!==void 0&&a.traverse(function(o){if(o.isMesh)for(let c=0,l=r.weights.length;c<l;c++)o.morphTargetInfluences[c]=r.weights[c]}),a})}loadNode(e){const t=this.json,n=this,r=t.nodes[e],s=n._loadNodeShallow(e),a=[],o=r.children||[];for(let l=0,u=o.length;l<u;l++)a.push(n.getDependency("node",o[l]));const c=r.skin===void 0?Promise.resolve(null):n.getDependency("skin",r.skin);return Promise.all([s,Promise.all(a),c]).then(function(l){const u=l[0],d=l[1],f=l[2];f!==null&&u.traverse(function(h){h.isSkinnedMesh&&h.bind(f,gb)});for(let h=0,m=d.length;h<m;h++)u.add(d[h]);return u})}_loadNodeShallow(e){const t=this.json,n=this.extensions,r=this;if(this.nodeCache[e]!==void 0)return this.nodeCache[e];const s=t.nodes[e],a=s.name?r.createUniqueName(s.name):"",o=[],c=r._invokeOne(function(l){return l.createNodeMesh&&l.createNodeMesh(e)});return c&&o.push(c),s.camera!==void 0&&o.push(r.getDependency("camera",s.camera).then(function(l){return r._getNodeRef(r.cameraCache,s.camera,l)})),r._invokeAll(function(l){return l.createNodeAttachment&&l.createNodeAttachment(e)}).forEach(function(l){o.push(l)}),this.nodeCache[e]=Promise.all(o).then(function(l){let u;if(s.isBone===!0?u=new $f:l.length>1?u=new Zt:l.length===1?u=l[0]:u=new wt,u!==l[0])for(let d=0,f=l.length;d<f;d++)u.add(l[d]);if(s.name&&(u.userData.name=s.name,u.name=a),ei(u,s),s.extensions&&cr(n,u,s),s.matrix!==void 0){const d=new Ke;d.fromArray(s.matrix),u.applyMatrix4(d)}else s.translation!==void 0&&u.position.fromArray(s.translation),s.rotation!==void 0&&u.quaternion.fromArray(s.rotation),s.scale!==void 0&&u.scale.fromArray(s.scale);if(!r.associations.has(u))r.associations.set(u,{});else if(s.mesh!==void 0&&r.meshCache.refs[s.mesh]>1){const d=r.associations.get(u);r.associations.set(u,{...d})}return r.associations.get(u).nodes=e,u}),this.nodeCache[e]}loadScene(e){const t=this.extensions,n=this.json.scenes[e],r=this,s=new Zt;n.name&&(s.name=r.createUniqueName(n.name)),ei(s,n),n.extensions&&cr(t,s,n);const a=n.nodes||[],o=[];for(let c=0,l=a.length;c<l;c++)o.push(r.getDependency("node",a[c]));return Promise.all(o).then(function(c){for(let u=0,d=c.length;u<d;u++)s.add(c[u]);const l=u=>{const d=new Map;for(const[f,h]of r.associations)(f instanceof On||f instanceof Vt)&&d.set(f,h);return u.traverse(f=>{const h=r.associations.get(f);h!=null&&d.set(f,h)}),d};return r.associations=l(s),s})}_createAnimationTracks(e,t,n,r,s){const a=[],o=e.name?e.name:e.uuid,c=[];Fi[s.path]===Fi.weights?e.traverse(function(f){f.morphTargetInfluences&&c.push(f.name?f.name:f.uuid)}):c.push(o);let l;switch(Fi[s.path]){case Fi.weights:l=cs;break;case Fi.rotation:l=ls;break;case Fi.translation:case Fi.scale:l=us;break;default:n.itemSize===1?l=cs:l=us;break}const u=r.interpolation!==void 0?ub[r.interpolation]:ia,d=this._getArrayFromAccessor(n);for(let f=0,h=c.length;f<h;f++){const m=new l(c[f]+"."+Fi[s.path],t.array,d,u);r.interpolation==="CUBICSPLINE"&&this._createCubicSplineTrackInterpolant(m),a.push(m)}return a}_getArrayFromAccessor(e){let t=e.array;if(e.normalized){const n=nu(t.constructor),r=new Float32Array(t.length);for(let s=0,a=t.length;s<a;s++)r[s]=t[s]*n;t=r}return t}_createCubicSplineTrackInterpolant(e){e.createInterpolant=function(n){const r=this instanceof ls?lb:Ep;return new r(this.times,this.values,this.getValueSize()/3,n)},e.createInterpolant.isInterpolantFactoryMethodGLTFCubicSpline=!0}}function _b(i,e,t){const n=e.attributes,r=new oi;if(n.POSITION!==void 0){const o=t.json.accessors[n.POSITION],c=o.min,l=o.max;if(c!==void 0&&l!==void 0){if(r.set(new P(c[0],c[1],c[2]),new P(l[0],l[1],l[2])),o.normalized){const u=nu(Qr[o.componentType]);r.min.multiplyScalar(u),r.max.multiplyScalar(u)}}else{console.warn("THREE.GLTFLoader: Missing min/max properties for accessor POSITION.");return}}else return;const s=e.targets;if(s!==void 0){const o=new P,c=new P;for(let l=0,u=s.length;l<u;l++){const d=s[l];if(d.POSITION!==void 0){const f=t.json.accessors[d.POSITION],h=f.min,m=f.max;if(h!==void 0&&m!==void 0){if(c.setX(Math.max(Math.abs(h[0]),Math.abs(m[0]))),c.setY(Math.max(Math.abs(h[1]),Math.abs(m[1]))),c.setZ(Math.max(Math.abs(h[2]),Math.abs(m[2]))),f.normalized){const v=nu(Qr[f.componentType]);c.multiplyScalar(v)}o.max(c)}else console.warn("THREE.GLTFLoader: Missing min/max properties for accessor POSITION.")}}r.expandByVector(o)}i.boundingBox=r;const a=new ci;r.getCenter(a.center),a.radius=r.min.distanceTo(r.max)/2,i.boundingSphere=a}function Vh(i,e,t){const n=e.attributes,r=[];function s(a,o){return t.getDependency("accessor",a).then(function(c){i.setAttribute(o,c)})}for(const a in n){const o=tu[a]||a.toLowerCase();o in i.attributes||r.push(s(n[a],o))}if(e.indices!==void 0&&!i.index){const a=t.getDependency("accessor",e.indices).then(function(o){i.setIndex(o)});r.push(a)}return at.workingColorSpace!==fn&&"COLOR_0"in n&&console.warn(`THREE.GLTFLoader: Converting vertex colors from "srgb-linear" to "${at.workingColorSpace}" not supported.`),ei(i,e),_b(i,e,t),Promise.all(r).then(function(){return e.targets!==void 0?hb(i,e.targets,t):i})}const yb=new URL(""+new URL("pineapple-TyOg6mi1.glb",import.meta.url).href,import.meta.url).href;let fr,io,Yu=!1,ks;const iu=new Set,ru=new Set;function xb(){return fr?Promise.resolve(fr):(io||(io=new bp().loadAsync(yb).then(i=>{if(fr=i.scene,fr.traverse(e=>{if(e.isMesh){iu.add(e.geometry);for(const t of Object.values(e.material))t?.isTexture&&ru.add(t)}}),Yu)throw Tp(),Error("Page closed");return fr}).catch(i=>{throw io=void 0,i})),io)}function Tp(){iu.forEach(i=>i.dispose()),ru.forEach(i=>i.dispose()),fr?.traverse(i=>{i.isMesh&&i.material.dispose()}),iu.clear(),ru.clear(),fr=void 0}function Mb(i,e){const t=s=>e.includes(s),n={normalMap:i.normalMap,normalScale:new ue(.22,.22),metalness:0,envMapIntensity:1.05,clearcoat:.8};if(t("crystal")||t("frost")||t("dew"))return new ln({...n,color:"#d9f8ff",roughness:.09,transmission:.94,thickness:.48,ior:1.48,attenuationColor:"#8ae1e5",attenuationDistance:.8,iridescence:.18});if(t("jade"))return new ln({...n,color:"#b8efb9",roughness:.2,transmission:.67,thickness:.52,ior:1.36,attenuationColor:"#32aa73",attenuationDistance:.42});if(t("rainbow")||t("prism")||t("nebula"))return new ln({...n,color:"#dbcefa",roughness:.1,metalness:.08,transmission:.8,thickness:.5,ior:1.65,iridescence:1,iridescenceIOR:1.6,iridescenceThicknessRange:[180,480]});if(t("amber")||t("honey"))return new ln({...n,color:"#f8cc7f",roughness:.18,transmission:.6,thickness:.5,ior:1.45,attenuationColor:"#c18124",attenuationDistance:.7});const r=i.clone();r.metalness=t("golden")?.65:0,r.metalnessMap=null,r.roughness=t("golden")?.3:.7,r.roughnessMap=null,r.envMapIntensity=.35;for(const[s,a]of[["purple","#b68ad6"],["mint","#a4d3b4"],["coral","#edacb1"],["golden","#efc45e"]])t(s)&&(r.map=null,r.color.set(a));return r}function Sb(){if(ks)return ks;const i=document.createElement("canvas");i.width=i.height=64;const e=i.getContext("2d"),t=e.createRadialGradient(32,32,0,32,32,30);return t.addColorStop(0,"#fffbe5"),t.addColorStop(.25,"#ffe6a766"),t.addColorStop(1,"#ffe6a700"),e.fillStyle=t,e.fillRect(0,0,64,64),e.beginPath(),e.moveTo(32,4),e.quadraticCurveTo(36,27,59,32),e.quadraticCurveTo(36,37,32,60),e.quadraticCurveTo(28,37,5,32),e.quadraticCurveTo(28,27,32,4),e.fillStyle="#fff3b7",e.fill(),ks=new $0(i),ks}function bb(i,e,t,n){const r=new Uo;r.environment=e,r.add(new Wu("#fff8df","#869b89",1.1));const s=new ds("#fff5e5",1.7);s.position.set(-3,6,5),r.add(s);const a=new ds("#cbeaf2",.7);a.position.set(3,3,-2),r.add(a);const o=new Set,c=new Set,l=new Zt;r.add(l);const u=(g,p,_=l)=>{o.add(g),c.add(p);const y=new Tt(g,p);return _.add(y),y};if(t==="plant"){const g=u(new Yi(1,32,12),new $n({color:"#805a38",roughness:1}));g.scale.set(.87,.11,.57),g.position.y=.015;for(let p=0;p<7;p++){const _=p*2.4,y=u(new Fo(.035,0),new $n({color:p%2?"#bf9970":"#876342",roughness:1}));y.position.set(Math.sin(_)*.75,.1,Math.cos(_)*.47),y.scale.y=.55}}const d=new Zt;d.position.y=t==="plant"?.1:0,l.add(d);function f(g,p,_){const y=i.clone(!0);y.scale.setScalar(p),y.position.x=g,y.rotation.z=_,d.add(y),y.traverse(x=>{if(!x.isMesh)return;const A=x.material;A.name==="pineapple-crown"?(x.material=A.clone(),x.material.metalness=0,x.material.metalnessMap=null,x.material.roughness=.85,x.material.roughnessMap=null,x.material.envMapIntensity=.25):x.material=Mb(A,n),c.add(x.material)})}if(n.includes("twin")?(f(-.4,1.45,-.1),f(.4,1.45,.1)):f(0,1.9,0),n.some(g=>["crystal","frost","dew","jade","rainbow","prism","nebula","amber","honey"].includes(g))&&!n.includes("twin")){const g=u(new Oo(.1,1),new $n({color:"#f4e7ae",emissive:"#b1d6cf",emissiveIntensity:.22,roughness:.35}),d);g.position.y=.52}const m=[];if(n.some(g=>["shiny","firefly","stardust","moon","halo","rainbow","prism","nebula","thunder"].includes(g)))for(let g=0;g<8;g++){const p=new Lu({map:Sb(),color:g%3?"#fff0b8":"#caf1ff",transparent:!0,depthWrite:!1});c.add(p);const _=new Wf(p);_.scale.setScalar(.085+g%3*.025),l.add(_),m.push(_)}l.rotation.y=-.12;const v=new nn(34,1,.1,30);return v.position.set(0,2.25,4.8),v.lookAt(0,.95,0),{scene:r,camera:v,moving:[],animate(g){d.rotation.y=Math.sin(g*.7)*.045,m.forEach((p,_)=>{const y=_*2.399+g*.2;p.position.set(Math.sin(y)*(.74+_%2*.13),.3+(_*.217+g*.13)%1.9,Math.cos(y)*.62),p.material.opacity=.3+.7*Math.sin(g*1.7+_)**2})},dispose(){o.forEach(g=>g.dispose()),c.forEach(g=>g.dispose()),r.clear()}}}function wb(i,{mode:e="fruit",ratio:t=1,traits:n=[]}={}){return e==="plant"&&t<.8?!1:(i.dataset.modelLoading="true",xb().then(r=>{Yu||!i.isConnected||(Sp(i,s=>bb(r,s,e,n),e==="plant"?"ripe":"fruit")&&(i.dataset.model="pineapple"),delete i.dataset.modelLoading)}).catch(r=>{delete i.dataset.modelLoading,i.dataset.modelError="true",console.warn("菠萝模型不可用，保留原画",r)}),!0)}window.addEventListener("pagehide",()=>{Yu=!0,Tp(),ks?.dispose()},{once:!0});function Wo(i){return i==="strawberry"||i==="pineapple"}const Ns=new P;function Cn(i,e,t,n,r,s){const a=2*Math.PI*r/4,o=Math.max(s-2*r,0),c=Math.PI/4;Ns.copy(e),Ns[n]=0,Ns.normalize();const l=.5*a/(a+o),u=1-Ns.angleTo(i)/c;return Math.sign(Ns[t])===1?u*l:o/(a+o)+l+l*(1-u)}class Ku extends xr{constructor(e=1,t=1,n=1,r=2,s=.1){const a=r*2+1;if(s=Math.min(e/2,t/2,n/2,s),super(1,1,1,a,a,a),this.type="RoundedBoxGeometry",this.parameters={width:e,height:t,depth:n,segments:r,radius:s},a===1)return;const o=this.toNonIndexed();this.index=null,this.attributes.position=o.attributes.position,this.attributes.normal=o.attributes.normal,this.attributes.uv=o.attributes.uv;const c=new P,l=new P,u=new P(e,t,n).divideScalar(2).subScalar(s),d=this.attributes.position.array,f=this.attributes.normal.array,h=this.attributes.uv.array,m=d.length/6,v=new P,g=.5/a;for(let p=0,_=0;p<d.length;p+=3,_+=2)switch(c.fromArray(d,p),l.copy(c),l.x-=Math.sign(l.x)*g,l.y-=Math.sign(l.y)*g,l.z-=Math.sign(l.z)*g,l.normalize(),d[p+0]=u.x*Math.sign(c.x)+l.x*s,d[p+1]=u.y*Math.sign(c.y)+l.y*s,d[p+2]=u.z*Math.sign(c.z)+l.z*s,f[p+0]=l.x,f[p+1]=l.y,f[p+2]=l.z,Math.floor(p/m)){case 0:v.set(1,0,0),h[_+0]=Cn(v,l,"z","y",s,n),h[_+1]=1-Cn(v,l,"y","z",s,t);break;case 1:v.set(-1,0,0),h[_+0]=1-Cn(v,l,"z","y",s,n),h[_+1]=1-Cn(v,l,"y","z",s,t);break;case 2:v.set(0,1,0),h[_+0]=1-Cn(v,l,"x","z",s,e),h[_+1]=Cn(v,l,"z","x",s,n);break;case 3:v.set(0,-1,0),h[_+0]=1-Cn(v,l,"x","z",s,e),h[_+1]=1-Cn(v,l,"z","x",s,n);break;case 4:v.set(0,0,1),h[_+0]=1-Cn(v,l,"x","y",s,e),h[_+1]=1-Cn(v,l,"y","x",s,t);break;case 5:v.set(0,0,-1),h[_+0]=Cn(v,l,"x","y",s,e),h[_+1]=1-Cn(v,l,"y","x",s,t);break}}static fromJSON(e){return new Ku(e.width,e.height,e.depth,e.segments,e.radius)}}function Gh(i){const e=Math.max(1,Math.ceil(i.length/4)),t=Math.min(3,Math.ceil(Math.sqrt(e))),n=Math.ceil(e/t),r=2.75,s=t*r+.25,a=n*r+.25,o=i.map((c,l)=>{const u=Math.floor(l/4),d=l%4;return{index:c,x:u%t*r+d%2*1.05-(t-1)*r/2-.525,z:Math.floor(u/t)*r+Math.floor(d/2)*1.05-(n-1)*r/2-.525}});return{width:s,depth:a,cells:o}}const Wh={pineapple:new URL(""+new URL("pineapple-TyOg6mi1.glb",import.meta.url).href,import.meta.url).href,strawberry:new URL(""+new URL("strawberry-tripo-BDdmB20f.glb",import.meta.url).href,import.meta.url).href,base:new URL(""+new URL("strawberry-base-Bxh9xmAR.glb",import.meta.url).href,import.meta.url).href};function Eb(i,e){const t=document.createElement("section");t.className="farm-scene",t.setAttribute("aria-label","立体花园");const n=new yp({alpha:!0,antialias:!0,powerPreference:"low-power"});n.setClearColor(0,0),n.setPixelRatio(Math.min(devicePixelRatio,1.5)),n.outputColorSpace=Bt,n.toneMapping=yu,n.toneMappingExposure=1.25,n.domElement.className="farm-canvas",t.append(n.domElement);const r=new Uo,s=new Zt;r.add(s),r.add(new Wu("#fffce5","#adc39b",2.1));const a=new ds("#fff3da",2.5);a.position.set(-3,9,6),r.add(a);const o=new zo(-5,5,5,-5,.1,100),c=new Map,l=new Map,u=new Map,d=new Set,f=new Set;let h=!1,m=0,v=0,g="",p=[],_=[],y=Gh([]),x=0,A=1,w=54,R=innerHeight-66,C=640,S=420,b=null;const L=new Map,D=Z=>(d.add(Z),Z),k=Z=>{const le=new $n({color:Z,roughness:1});return f.add(le),le},H=D(new Ku(1,1,1,2,.1)),X=D(new Yi(1,12,8)),V=D(new Nu(1,28));function K(Z,le,ne=s){const te=new Tt(Z,le);return ne.add(te),te}function G(Z,le,ne,te,xe,Ue,T,M=s){const U=K(H,T,M);return U.position.set(Z,le,ne),U.scale.set(te,xe,Ue),U}const se=k("#b8cf85"),me=k("#c5aa7d"),_e=k("#99704f"),Be=k("#f0dca5"),lt=[k("#91bf8c"),k("#b4d5a2"),k("#719e78")],$e=new bi({color:"#36452b",transparent:!0,opacity:.12,depthWrite:!1});f.add($e);function st(Z,le,ne){const te=K(V,$e);te.rotation.x=-Math.PI/2,te.position.set(Z,.145,le),te.scale.set(ne,ne*.68,1)}function Y(Z,le){const ne=le?6:2;for(let te=0;te<ne;te++){const xe=te*Math.PI*2/ne,Ue=K(X,lt[te%3],Z);Ue.scale.set(.12,le?.35:.21,.045),Ue.position.set(Math.sin(xe)*.15,le?.27:.19,Math.cos(xe)*.15),Ue.rotation.set(Math.cos(xe)*.65,xe,-Math.sin(xe)*.65)}}function ee(Z){return l.has(Z)||l.set(Z,new bp().loadAsync(Wh[Z]).then(le=>{if(h)throw Me(le.scene),Error("closed");le.scene.updateMatrixWorld(!0);const ne=new Zt,te=new Set;return le.scene.traverse(xe=>{if(!xe.isMesh)return;const Ue=xe.geometry.clone().applyMatrix4(xe.matrixWorld);ne.add(new Tt(Ue,xe.material)),te.add(xe.geometry)}),te.forEach(xe=>xe.dispose()),c.set(Z,ne),ne})),l.get(Z)}function Me(Z){const le=new Set,ne=new Set,te=new Set;Z.traverse(xe=>{if(xe.isMesh){le.add(xe.geometry);for(const Ue of Array.isArray(xe.material)?xe.material:[xe.material])ne.add(Ue),Object.values(Ue).forEach(T=>{T?.isTexture&&te.add(T)})}}),le.forEach(xe=>xe.dispose()),ne.forEach(xe=>xe.dispose()),te.forEach(xe=>xe.dispose())}const De=new Set;function be(Z,le,ne,te){const xe=Z.clone(!0);xe.traverse(q=>{if(q.isMesh&&(q.material=q.material.clone(),De.add(q.material),q.material.metalness=0,q.material.roughness=.85,q.material.metalnessMap=null,te==="pineapple"&&q.material.name!=="pineapple-crown")){const Q=ne.includes("purple")?"#b798da":ne.includes("golden")?"#edbd59":ne.includes("jade")?"#9dcca9":ne.some(j=>["crystal","frost","dew"].includes(j))?"#b6e2ed":ne.some(j=>["rainbow","prism","nebula"].includes(j))?"#c3b5eb":null;Q&&(q.material.map=null,q.material.color.set(Q))}});const Ue=new oi().setFromObject(xe),T=Ue.getCenter(new P),M=Ue.getSize(new P),U=Math.min(le/M.y,.86/Math.max(M.x,M.z));return xe.scale.multiplyScalar(U),xe.position.set(-T.x*U,-Ue.min.y*U,-T.z*U),t.dataset.modelBounds=JSON.stringify({species:te,size:le,dimensions:M.toArray(),factor:U,position:xe.position.toArray()}),xe}function Ze(Z,le,ne){if(!le.fallback)return;let te=u.get(le.fallback);te||(te=new hp().loadAsync(le.fallback).then(xe=>(xe.colorSpace=Bt,h&&xe.dispose(),xe)),u.set(le.fallback,te)),te.then(xe=>{if(h||ne!==v)return;const Ue=new Lu({map:xe,transparent:!0,depthWrite:!1});De.add(Ue);const T=new Wf(Ue);T.position.y=.43,T.scale.set(.86,.86,1),Z.add(T),Pe()}).catch(()=>{!h&&ne===v&&(Y(Z,!0),Pe())})}function qt(){const Z=++v;s.clear(),L.clear(),De.forEach(le=>le.dispose()),De.clear(),y=Gh(p.map(le=>le.index)),G(0,-.055,0,y.width,.15,y.depth,me),G(0,.025,0,y.width,.1,y.depth,se);for(let le=-y.width/2+2.75;le<y.width/2-.4;le+=2.75)G(le-.125,.084,0,.48,.02,y.depth-.25,Be);for(let le=-y.depth/2+2.75;le<y.depth/2-.4;le+=2.75)G(0,.084,le-.125,y.width-.25,.02,.48,Be);y.cells.forEach((le,ne)=>{const te=p[ne],xe=_e.clone();if(De.add(xe),L.set(te.index,xe),G(le.x,.1,le.z,.96,.07,.96,xe),te.stage==="empty"){for(let T=0;T<3;T++)G(le.x,.142,le.z+(T-1)*.22,.63,.018,.025,me);return}st(le.x,le.z,.4);const Ue=new Zt;if(Ue.position.set(le.x,.16,le.z),s.add(Ue),te.stage==="hidden"||!Wh[te.species]){Ze(Ue,te,Z);return}if(te.stage!=="ripe"){Y(Ue,te.stage==="young");return}Ue.userData.species=te.species,ee(te.species).then(T=>{if(h||Z!==v)return;const M=be(T,te.traits.includes("giant")?1.2:.98,te.traits,te.species);if(te.species==="strawberry"&&(M.scale.multiplyScalar(.65),M.position.y+=.3),Ue.add(M),t.dataset.models=String(s.children.filter(U=>U.userData.species&&U.children.length).length),te.species==="pineapple"){const U=new Zt;U.scale.set(.7,.45,.7),Y(U,!0),Ue.add(U)}Pe()}).catch(()=>{!h&&Z===v&&(t.dataset.assetFallback="true",Ze(Ue,te,Z))}),te.species==="strawberry"&&ee("base").then(T=>{h||Z!==v||(Ue.add(be(T,.48,[],"base")),Pe())}).catch(()=>{!h&&Z===v&&(Y(Ue,!0),Pe())})}),t.dataset.plots=String(p.length),Pe()}function I(Z,le,ne){const te=new P(Z,le,ne).project(o);return{x:(te.x+1)*C/2,y:(1-te.y)*S/2}}function St(){if(m=0,h||document.hidden||!t.isConnected)return;const Z=C,le=S,ne=Math.max(y.width,y.depth);C=Math.round(Math.min(innerWidth-24,Math.max(350,ne*85)*A)),S=Math.round(Math.min(innerHeight-100,C*.73)),C=Math.max(180,C),S=Math.max(140,S),t.style.width=C+"px",t.style.height=S+"px";const te=Math.max(8,Math.min(w,innerWidth-C-8)),xe=Math.max(8,Math.min(R-S,innerHeight-S-58));t.style.left=te+"px",t.style.top=xe+"px",(Z!==C||le!==S||!t.dataset.sceneReady)&&n.setSize(C,S,!1);const Ue=Math.hypot(y.width,y.depth)/2+.45;o.left=-Ue,o.right=Ue,o.top=Ue*S/C,o.bottom=-o.top,o.position.set(Math.sin(x)*8,14,Math.cos(x)*8),o.lookAt(0,.15,0),o.updateProjectionMatrix(),o.updateMatrixWorld();const T=[];y.cells.forEach((M,U)=>{const q=_[U];if(!q)return;const Q=[[-.48,-.48],[.48,-.48],[.48,.48],[-.48,.48]].map(([de,He])=>I(M.x+de,.15,M.z+He)),j=I(M.x,p[U].stage==="empty"?.15:1.15,M.z),Le=Math.min(...Q.map(de=>de.x)),ce=Math.max(...Q.map(de=>de.x)),Te=Math.min(j.y,...Q.map(de=>de.y)),Re=Math.max(...Q.map(de=>de.y));q.style.cssText=`left:${Le}px;top:${Te}px;width:${ce-Le}px;height:${Re-Te}px;z-index:${Math.round(Re)};`,q.classList.toggle("selected",p[U].index===b),L.get(p[U].index)?.color.set(p[U].index===b?"#bd9361":"#99704f");const ie=I(M.x+.63,.15,M.z+.4);T.push({index:p[U].index,x:Math.max(0,Math.min(innerWidth,te+ie.x)),y:Math.max(0,Math.min(innerHeight,xe+ie.y))})}),n.render(r,o),t.dataset.sceneReady="true",t.dataset.draws=String(Number(t.dataset.draws||0)+1),t.dataset.angle=String(x),t.dataset.scale=String(A),i({width:C,height:S,plots:T})}function Pe(){!h&&!m&&(m=requestAnimationFrame(St))}const ze=()=>{document.hidden||Pe()};return document.addEventListener("visibilitychange",ze),window.addEventListener("resize",Pe),n.domElement.addEventListener("webglcontextlost",Z=>{Z.preventDefault(),t.dataset.sceneReady="false",h||e("3D 画面暂时不可用，可切回手绘后重试。")}),n.domElement.addEventListener("webglcontextrestored",Pe),{element:t,update(Z,le,ne){p=Z,b=ne,_.forEach(xe=>xe.remove()),_=le,t.append(..._);const te=JSON.stringify(p);g!==te&&(g=te,qt()),Pe()},place(Z,le){w=Z,R=le,Pe()},rotate(Z){x+=Z*Math.PI/12,Pe()},zoom(Z){A=Math.max(.65,Math.min(1.5,A+Z*.15)),Pe()},reset(){x=0,A=1,Pe()},dispose(){h=!0,v++,cancelAnimationFrame(m),document.removeEventListener("visibilitychange",ze),window.removeEventListener("resize",Pe),c.forEach(Me),u.forEach(Z=>Z.then(le=>le.dispose()).catch(()=>{})),De.forEach(Z=>Z.dispose()),f.forEach(Z=>Z.dispose()),d.forEach(Z=>Z.dispose()),n.dispose(),n.forceContextLoss(),t.remove()}}}function Tb(i,e){if(i.done)return 1;const t=Object.values(i.members).reduce((n,r)=>n+Math.max(0,Math.min(e,r.seenAt+mn.leaseMs)-i.updatedAt)/1e3*mn.speed,0);return Math.max(0,Math.min(1,1-(i.remaining-t)/(i.workBudget??mn.work)))}function Ab(i,e,t,n,r){const s=Math.max(8,Math.min((i.left+i.right-e)/2,n-e-8)),a=i.top-t-8;return s>=8&&a>=8&&s+e<=n-8&&a+t<=r-8?{x:s,y:a}:null}const Rb=i=>Math.round(Math.min(i,180,Math.max(80,i*.65))),$h={interaction:60,cultivation:55,wish:50,speech:30,quest:10},Cb=(i,e)=>i===null||$h[e]>=$h[i],Ne=(i,e="",t="")=>{const n=document.createElement(i);return n.textContent=e,n.className=t,n},_n=(i,e,t=!1)=>{const n=Ne("button",i);return n.disabled=t,n.onclick=()=>{e()},n},da=i=>i.map(e=>dt[e].name).join("＋")||"原生",Zc={species:"lotus",traits:new Set};function Lb(i,e,t){const n=Ne("div","","factor-options");for(const r of e){const s=Ne("label","","tag "+dt[r].tier),a=Ne("input");a.type="checkbox",a.checked=t.has(r),a.onchange=()=>{a.checked?t.add(r):t.delete(r)},s.append(a,document.createTextNode(dt[r].name)),n.append(s)}i.append(n)}function Ap(i,e,t,n){if(!t.v3||e.growthVersion!==3||t.economy)return;const r=t.v3.appraisals[e.id];if(r&&!r.done){const s=Ne("div","","appraisal-card");s.append(Ne("h3",`重量探险 · 第 ${r.row+1}/${r.maxRows} 行`),Ne("p",`目前 ×${r.factor.toFixed(2)}。${r.row<3?"三格有两格增重，一格减重":"三格有一格增重，两格减重"}；减重会结束这一轮，果实仍然留下。`));for(let a=0;a<3;a++)s.append(_n("？",()=>n({type:"appraisePick",target:e.id,column:a})));s.append(_n("现在收手",()=>n({type:"appraiseStop",target:e.id}))),i.append(s);return}!e.appraised&&!e.locked&&!Pt(e)&&["gold","rainbow"].includes(Kh(e))&&i.append(_n(vo(t.xp[e.species])>=5?"重量鉴定 · 20币":"物种 Lv.5 开放重量鉴定",()=>n({type:"appraiseStart",target:e.id}),vo(t.xp[e.species])<5)),e.appraised&&r?.done&&i.append(Ne("small",`鉴定留念：走到第${r.row}行 · ×${r.factor.toFixed(2)}`))}function Rp(i,e){if(e.growthVersion===3&&i.append(Ne("small",`综合 ${hu(e).toFixed(1)} 分 · ${e.kg/Ye[e.species].kg>=1?"重量":"小巧"} ×${(e.kg/Ye[e.species].kg).toFixed(2)}`)),e.lineage){const t=Ne("details");t.append(Ne("summary","这颗果实的家谱"));for(const n of e.lineage.parents)t.append(Ne("p",`${Ye[n.species].name} · ${da(n.traits)}`));i.append(t)}}function Pb(i,e,t,n,r,s,a){const o=e.v3,c=Ne("aside","","breed-drawer");c.append(_n("× 取消",s),Ne("h2","金色亲本 · 随机繁育"),Ne("p",`本周 ${o.breeds}/90 · 连续未继承普通因子 ${o.geneMisses} 次`));const l=Ne("select");for(const[u,d]of Object.entries(Zp))l.append(new Option(`${d.name} ×${o.oils[u]} · 单方${d.single*100}% / 双方${d.double*100}% · 最多${d.pity}次随机保底`,u));o.oils.normal||(l.value="rich"),c.append(l),c.append(Ne("p","双方均需已揭晓的金色以上亲本。逐槽随机继承，不同因子各占一半；精油提高概率与随机保底，不指定保留因子。普通最多3因子，浓缩最多4因子。体型另抽，普通20%、浓缩30%，同样有10次/5次保底。每株一生可繁育一次，亲本保留。"));for(const u of n){const d=Ne("article","","card parent-row");d.append(a(u),Ne("strong",Ye[u.species].name+" · "+da(u.traits)),_n("留下它们的种子",()=>r({type:"breed",first:t.id,second:u.id,oil:l.value}),o.breeds>=90)),c.append(d)}n.length||c.append(Ne("p","需要一株地里的金色以上亲本，和一颗背包里的金色以上果实。新手礼物提供第一组亲本。")),i.append(c)}const Ib=[{name:"星空巨果 · 长期目标",species:"pineapple",traits:["abundant","redgold","stardust","halo","giant"]},{name:"晚风小夜灯",species:"blueberry",traits:["nightdye","firefly","moon"]},{name:"奶油草莓派",species:"strawberry",traits:["milky","pearl","flowerknot"]},{name:"金色菠萝夏天",species:"pineapple",traits:["honey","redgold","petals"]},{name:"星星的池塘",species:"lotus",traits:["celadon","stardust","moon"]},{name:"手心里的小苹果",species:"apple",traits:["sugar","mini"]}];function Db(i,e,t,n){const r=e.v3;if(!r)return;i.append(Ne("h2","慢慢收集，长成自己的花园"),Ne("p","可以选一个目标，也可以随手种。没上线的日子不欠作业，成熟果实不会枯萎。","muted"));const s=r.goal;if(s){const m=[...e.produce,...e.plots.filter(_=>!!_)],v=m.filter(_=>_.species===s.species).sort((_,y)=>s.traits.filter(x=>y.traits.includes(x)).length-s.traits.filter(x=>_.traits.includes(x)).length)[0],g=s.traits.filter(_=>v?.traits.includes(_)).length,p=Ne("article","","card goal-card");p.append(Ne("h3",`${g===s.traits.length?"✦ 收集到了！":"✧ 正在期待"} ${Ye[s.species].name} · ${da(s.traits)}`),Ne("p",`最接近的一颗：${g}/${s.traits.length}`));for(const _ of s.traits)p.append(Ne("small",`${v?.traits.includes(_)?"✓":"○"} ${dt[_].name}：${Xi(_)==="size"?"自然重量、增重肥或鉴定":tf(_)}`));p.append(_n("去花园看看",()=>n("plots")),_n("先放下这个目标",()=>t({type:"clearCollectionGoal"}))),i.append(p)}const a=Ne("div","","grid");for(const m of Ib){const v=Ne("article","","card");v.append(Ne("h3",m.name),Ne("p",Ye[m.species].name+" · "+da(m.traits)),_n("我想收集这个",()=>t({type:"collectionGoal",species:m.species,traits:m.traits}))),a.append(v)}i.append(a);const o=Ne("details");o.append(Ne("summary","自己挑一个组合"));const c=Ne("select");for(const m of Object.keys(Ye))c.append(new Option(Ye[m].name,m));c.value=Zc.species,c.onchange=()=>{Zc.species=c.value},o.append(c);const l=Zc.traits;Lb(o,Object.keys(dt),l),o.append(_n("记在收藏手册",()=>t({type:"collectionGoal",species:c.value,traits:[...l]}))),i.append(o);const u=Ne("article","","card");u.append(Ne("h3","种植小工具"),Ne("p",`普通精油 ${r.oils.normal} · 浓缩精油 ${r.oils.rich}`),_n("普通精油 · 35币",()=>t({type:"buyOil",kind:"normal"})),_n("浓缩精油 · 80币",()=>t({type:"buyOil",kind:"rich"}))),i.append(u);const d=Ne("details");d.append(Ne("summary","慢慢养好土地")),r.soil.forEach((m,v)=>v<pa(e)&&d.append(_n(`${v+1}号地 Lv.${m}${m<3?" · 升级 "+(m===1?300:700)+"币":" · 已养好"}`,()=>t({type:"upgradeSoil",plot:v}),m>=3))),d.append(Ne("p","升级对下一轮生长生效：Lv.2 重量倍率 +0.05～0.15，Lv.3 +0.15～0.25。")),e.economy||i.append(d),i.append(Ne("h3","最近的小故事"));for(const m of[...r.records].reverse().slice(0,25)){const v=Ne("p",`${new Date(m.at).toLocaleDateString("zh-CN")} · ${m.message}`);m.peer&&v.append(_n("回访",()=>n("visit:"+m.peer))),i.append(v)}r.records.length||i.append(Ne("p","第一粒种子，就是故事的开始。"));const f={question:"发现可培育果实",wishes:"角色每日心愿",welcome:"开始种植",settlement:"生长结算",rainbowPity:"彩色保底",choose:"选择模样",breed:"留下新种子",soil:"养好土地",appraise:"重量探险",shop:"小店采购",friendShop:"朋友家采购",spray:"喷雾惊喜",sprayAccept:"采用新模样",sprayKeep:"保留旧模样",feed:"完成心愿",reroll:"更换心愿",visit:"拜访",visitor:"朋友来访",share:"世界培育邀请",invite:"好友培育邀请",coopJoin:"参加培育",inviteJoin:"回应好友邀请",worldJoin:"参加公开任务",repeatCoop:"再次合作",helper:"朋友帮忙",soloComplete:"独自完成培育",coopComplete:"共同完成培育",coopReward:"助育礼物",sun:"向日葵伙伴",interaction:"一起互动",dailySeed:"基础种子补给"},h=Ne("details");h.append(Ne("summary","我的玩法记录（只在自己的存档里）"));for(const[m,v]of Object.entries(r.counters))h.append(Ne("p",`${f[m]??"花园活动"} · ${v}`));i.append(h)}function Nb(i,e,t){const n=Math.floor(Date.now()/36e5),r=sd(n,e.v3?.realm??"garden"),s=Wn[r];i.append(_n("← 回花园",()=>t("plots")),Ne("h2",`${s.icon} 现在是${s.name}`),Ne("p","每小时换天，离线照样记录。幼苗期占一轮的 80%，到时结算一次；成熟后不再追加天气词条。"),Ne("p",`花园彩因子保底 ${e.v3.rainbowMisses}/32 · 下一次合格传说天气结算若达到第33次，会获得彩色因子。`));const a=Ne("div","","grid");for(let c=1;c<=3;c++){const l=Wn[sd(n+c,e.v3?.realm??"garden")];a.append(Ne("article",`${new Date((n+c)*36e5).toLocaleTimeString("zh-CN",{hour:"2-digit",minute:"2-digit"})} ${l.icon} ${l.name}`,"card"))}i.append(a,Ne("p","普通/稀有天气抽取权重 140:10。连续12个非传说小时后，第13小时进入传说天气；天气日历不会因重启或拜访重抽。","muted"));const o=Ne("div","","grid");for(const[c,l]of Object.entries(Wn)){const u=Ne("article","","card");u.append(Ne("h3",l.icon+" "+l.name+" · "+l.grade),Ne("p",da([...l.pool])));const d=jp(c),f=d.reduce((h,m)=>h+m,0);u.append(Ne("small","抽中该天气后，蓝/紫/金/彩占比："+d.map(h=>(100*h/f).toFixed(2)+"%").join(" / "))),o.append(u)}i.append(o)}const Ub=new URL(""+new URL("sprout-9UfMEoKq.png",import.meta.url).href,import.meta.url).href,At=window.qbot.garden,yt=document.querySelector("#app"),Gt=new URLSearchParams(location.search).get("view")==="strip";window.qbot.overlays.onChanged(i=>{document.body.dataset.headOverlay=i.winner??"",Gt&&(qo(),requestAnimationFrame(gr))});let cn=!1,zt,su=!1,js={left:54,baseline:innerHeight-66},hs;function Cp(i){const e=i.gardenRenderMode==="3d";e!==cn&&(zt?.dispose(),zt=void 0,hs=void 0,su=!1,Gt&&At.scenePlacement(null),cn=e,document.body.classList.toggle("garden-3d",e),pt())}window.qbot.settings.onChanged(Cp);window.qbot.settings.get().then(Cp).catch(()=>{});let qe=new URLSearchParams(location.search).get("view")??"bag",pr,au=0,Jc=!1,Lp=-1;function Pp(i){Lm(yt,i),new URLSearchParams(location.search).get("view")!=="weather"&&yt.prepend(fe("← 返回花园",()=>Mt("plots"),"weather-back"))}async function Ip(){if(!(F?.v3||Jc||qe!=="weather")){Jc=!0;try{pr=await At.weather(),au=Date.now(),qe==="weather"&&!F?.v3&&Pp(pr)}catch{qe==="weather"&&!F?.v3&&(yt.textContent="天气暂时无法读取，稍后自动重试。")}finally{Jc=!1}}}let F,Jt=!1,Qc=!1,Eo="",Ht=null,Bi=!1,xi=!1,ou=[],ha=!1,mr=!1,Ys=0;async function Dp(){try{ou=await window.qbot.characters.list(),Gt||pt()}catch{}}async function Fb(i){if(Jt||mr)throw Error("请等待当前操作完成");Ys++,mr=!0,Jt=!0,pt();try{await window.qbot.characters.activate(i);const e=await At.get();F=e,Eo=JSON.stringify(e)}finally{mr=!1,Jt=!1,pt()}}function cu(i,e){if(!F||Jt)return;if(ha=!1,!e||e!==F.activeActor){Nt("角色已切换，请重新选择果实。");return}const t=F.produce.find(r=>r.id===i),n=t&&so(F,t);if(F.economy&&t&&!t.locked&&!Pt(t)){nt({type:"feed",wish:"social",produce:i,actor:e});return}if(!t||!n){Nt("这颗果实不符合今日心愿，或正在收藏、鉴定中。");return}nt({type:"feed",wish:n.id,produce:i,actor:e})}const kt=new Map,on=new Set;let Wr="lotus",Xn=null,ki={left:370,right:730,top:180,bottom:540},lu,Xh="left",gn=null;At.onSpeechBounds(i=>{gn=i,_a(),qo()});let tn=null,$i=null;const uu=new Map;document.body.classList.toggle("strip",Gt);function z(i,e,t){const n=document.createElement(i);return e&&(n.textContent=e),t&&(n.className=t),n}function fe(i,e,t="",n=!1){const r=z("button",i,t);return r.type="button",r.disabled=n||Jt,r.onclick=e,r}function Nt(i){const e=document.querySelector("#notice");e.textContent=i,e.classList.add("show"),setTimeout(()=>e.classList.remove("show"),4500)}function Zi(i){const e=z("div",void 0,"tags");i.length||e.append(z("span","原生","tag normal"));for(const t of["fruit","skin","accessory","size"]){const n=i.filter(s=>Xi(s)===t);if(!n.length)continue;const r=z("div",void 0,"trait-group");r.append(z("small",pu[t],"trait-label"));for(const s of n)r.append(z("span",dt[s].name,`tag ${dt[s].tier}`));e.append(r)}return e}function Ri(i,e=[],t=1,n="fruit",r=!1,s){const a=n==="plant"&&t<1?[]:e,o=z("div",void 0,`art ${a.join(" ")} quality-${t>=.8?s??Lo(a):"normal"}`);if(o.dataset.species=i,o.dataset.artMode=n,n==="plant"&&t<1&&(t>=.22||r))return o.append(Zm(i)),o;if(n==="seed"){o.className="art seed-art";const l=z("img");l.src=yo(i,"seed"),l.alt=Ye[i].name+"种子",l.draggable=!1;const u=Ri(i,e,1,"fruit");return u.classList.add("seed-emblem"),o.append(l,u),o}const c=z("img");if(c.src=n==="plant"&&t<.55&&!r?Ub:yo(i,n),c.alt=Ye[i].name,c.draggable=!1,o.append(c),a.includes("twin")){const l=c.cloneNode();l.className="twin-copy",o.append(l)}return ig(o,c.src,a,s==="gold"&&(n!=="plant"||t>=1)),cn&&i==="strawberry"&&(n!=="plant"||t>=1)&&Mp(o,{mode:n,ratio:t,traits:a,regrowing:r}),cn&&i==="pineapple"&&(n!=="plant"||t>=1)&&wb(o,{mode:n,ratio:t,traits:a}),o}function fa(i){return Ri(i.species,i.traits,1,"fruit",!1,ii(i.traits,i))}function To(i){return i.cultivation?.startedAt!==void 0||!!F?.cooperations?.some(e=>e.plant===i.id&&!e.done&&Object.values(e.members).some(t=>t.seenAt+15e3>Date.now()))}function $o(i){if(Pt(i)&&(i.readyAt<=Date.now()||Mi(i)>=.55))return xf(ii(i.traits,i),!0,To(i));const e=Ri(i.species,Pt(i)?[]:i.traits,Mi(i),"plant",!!i.harvestIndex,ii(i.traits,i));if(i.readyAt>Date.now()){const t=ii(i.traits,i);e.classList.remove("quality-normal"),e.classList.add("growing-quality",`quality-${t}`),e.dataset.growingQuality=t,e.setAttribute("aria-label",`${Ye[i.species].name}，${si[t]}品质，生长中`)}return i.readyAt>Date.now()||Pt(i)?e:uf(e,i)}function Np(i){const e=ii(i.traits,i);return z("span",si[e]+"果实","tag "+e)}function Up(i,e,t){if(i.append(Np(e)),Pt(e)){i.append(z("p","？ ？ ？ · 培育完成后揭晓","muted"));const n=z("progress");n.max=e.growthVersion===3?18e4:fu,n.value=n.max-zs(e,Date.now()),n.dataset.cultivation=e.id,i.append(n);const r=z("small",Math.ceil(zs(e,Date.now())/1e3)+" 秒");if(r.dataset.cultivationLabel=e.id,i.append(r),F?.online&&i.append(fe("邀请好友培育",()=>{Im(F.life.owner,t,Nt).catch(a=>Nt(String(a)))})),F?.online){i.append(z("p",`大家一起培育会更快，好奖励的概率也更高。今日还可领取 ${F.cooperationRewardsLeft??5} 次物资${F.cooperationRewardsLeft===0?"；仍可加速和留共同记录":""}。`),fe("培育 · 单人约 3 分钟",()=>{nt({type:"cultivate",plot:t})},"primary"),fe("暂停培育",()=>{nt({type:"pauseCultivation",plot:t})}),fe("查看共同培育",()=>Mt("visit:"+F.life.owner)),fe(F.rehearsal?"邀请所有测试伙伴":"分享到世界",()=>{At.cooperate(F.life.owner,t,"share").then(()=>Nt(F.rehearsal?"测试伙伴已加入待培育名单":"已分享到世界频道")).catch(a=>Nt(String(a)))}));return}i.append(z("p","彩色惊喜尚未揭晓 · 陪它完成培育","muted"));const s=e.cultivation?.startedAt!==void 0;i.append(fe(s?"暂停培育":e.cultivation?"继续培育":(e.growthVersion===3,"培育 · 约 3 分钟"),()=>{nt({type:s?"pauseCultivation":"cultivate",plot:t})},"primary"))}else{i.append(Zi(e.traits),z("small",e.kg.toFixed(3)+" kg · ◉ "+e.value,"muted"),fe("收获 ✦",()=>{nt({type:"harvest",plot:t})},"primary"),fe(e.bred?"已经繁育过":"与背包果实繁育 ♡",()=>{Ht=e.id,pt()},"",!qi(e))),!qi(e)&&!e.bred&&i.append(z("small","金色及以上品质可以繁育","muted")),Rp(i,e),Ap(i,e,F,nt);const n=z("details",void 0,"plot-sprays");n.open=F.life?.pending?.target===e.id,n.append(z("summary","🧴 使用喷雾")),hf(n,{state:F,act:nt,go:Mt,refresh:()=>jn(!0),notice:Nt,busy:Jt,plantArt:$o},e.id),i.append(n)}}function du(){const i=F.plots.some(e=>e?.id===Ht);return Fp().filter(e=>e.id!==Ht&&(F.economy||(i?F.produce.some(t=>t.id===e.id):F.plots.some(t=>t?.id===e.id))))}function Mt(i){if(Gt){At.open(i);return}document.querySelectorAll(".result-popup").forEach(e=>e.remove()),qe=i,Ht=null,Bi=xi=!1,kt.clear(),on.clear(),pt()}function Fp(){return[...F.produce,...F.plots.filter(i=>!!i&&i.readyAt<=Date.now())].filter(i=>qi(i)&&!("batch"in i&&i.batch?.candidates.length)&&(!F.v3?.appraisals[i.id]||F.v3.appraisals[i.id].done))}async function nt(i,e){if(cn&&(i.type==="plant"||i.type==="plantMany")&&!Wo(F?.seeds.find(t=>t.id===i.seed)?.species)){Nt("3D 模式支持草莓和菠萝；其他植物可切回 2D 后播种。");return}if(!Jt){Jt=!0,pt();try{const t=await At.act(i);if(!t.ok){Nt(t.error==="不支持的花园操作"?"花园版本已更新，请重启桌宠后再试":t.error),await jn(!0);return}F=t.state,e?.(),i.type==="travelExperience"&&yf(i.city,i.project,i.step),Eo=JSON.stringify(F),i.type==="buyMany"&&(kt.clear(),Bi=!1),i.type==="sellMany"&&(on.clear(),xi=!1),i.type==="breed"&&(Ht=null),Gt&&i.type==="harvest"&&t.reveal?.produce&&($i=t.reveal.produce.id,uu.set(i.plot,t.reveal.produce.id),Xn=i.plot),Gt&&i.type==="plant"&&($i=null,uu.delete(i.plot)),(i.type==="sell"||i.type==="sellMany")&&Nt("已出售，花园币已到账"),(i.type==="buy"||i.type==="buyMany")&&Nt("已放进背包"),i.type==="travelNext"&&Nt("到达新的目的地"),i.type==="fertilize"&&Nt("施肥成功"),t.reveal&&i.type!=="feed"&&(Gt&&(t.reveal.seed||t.reveal.produce)?(tn=t.reveal,Xn===null&&(Xn=0)):kp(t.reveal))}catch(t){Nt(t instanceof Error?t.message:String(t))}finally{Jt=!1,pt()}}}async function jn(i=!1){if(Qc||mr||ha)return;Qc=!0;const e=Ys;try{const t=await At.get();if(e!==Ys||mr)return;const n=JSON.stringify(t),r=F?.plots.find(s=>s&&Pt(s)&&t.plots.some(a=>a?.id===s.id&&a.revealed));if(F=t,r){const s=t.plots.find(o=>o?.id===r.id),a={title:"惊喜揭晓！",produce:s,message:"果实仍在地里，选择收获或繁育。"};Gt?(tn=a,Xn=t.plots.indexOf(s)):kp(a)}(i||n!==Eo)&&(Eo=n,pt())}catch(t){Nt(t instanceof Error?t.message:String(t))}finally{Qc=!1,e!==Ys&&!mr&&jn(!0)}}function Ob(){if(cn&&!zt&&!su)try{zt=Eb(m=>{At.scenePlacement(m),hs=zt?.element.getBoundingClientRect(),_a(),qo()},Nt)}catch{su=!0,Nt("3D 画面暂时不可用，已保留手绘土地。")}const i=!!zt;let e;const t=[z("section",void 0,"soil-side single")],n=[],r=[];t[0].style.gridTemplateColumns=`repeat(${lm}, minmax(0, 1fr))`,F.plots.forEach((m,v)=>{if(!F.cultivationVisit&&!sf(F,v))return;const g=fe("",()=>{Xn=v,Ht=null,tn=null,$i=uu.get(v)??null,pt()},"plot");if(g.disabled=!!F.cultivationVisit,g.setAttribute("aria-label",`${v+1}号土地${m?` ${Ye[m.species].name}`:" 种植"}`),i){g.className="plot farm-plot",g.dataset.plot=String(v),g.title=g.getAttribute("aria-label");const _=m?Pt(m)&&(m.readyAt<=Date.now()||Mi(m)>=.55)?"hidden":m.readyAt<=Date.now()?"ripe":Mi(m)<.22&&!m.harvestIndex?"sprout":"young":"empty";if(n.push({index:v,species:m?.species,stage:_,traits:m&&!Pt(m)&&_==="ripe"?m.traits:[],fallback:m?_==="hidden"?void 0:yo(m.species,"plant"):void 0,label:g.title}),_==="hidden"&&m){const x=xf(ii(m.traits,m),!0,To(m));x.classList.add("farm-mystery"),g.append(x)}const y=z("span",void 0,"plot-mark");y.innerHTML=co("ready"),y.hidden=!m||m.readyAt>Date.now(),g.append(y),r.push(g);return}if(g.dataset.plot=String(v),g.style.gridColumn=String(v+1),m){const _=$o(m);_.dataset.plant=m.id,_.addEventListener("click",y=>{y.stopPropagation(),!(Jt||F.cultivationVisit)&&(Xn=v,Ht=null,tn=null,$i=null,pt())}),g.append(_),Pt(m)&&To(m)&&g.append(z("span","🔎","research-mark"))}else if(g.append(z("span","+","empty-plot")),cn){const _=z("div",void 0,"art soil-3d");Mp(_,{mode:"soil"}),g.prepend(_)}g.classList.toggle("plot-3d",cn&&(!m||Wo(m.species)));const p=z("span",void 0,"plot-mark");p.innerHTML=co("ready"),p.setAttribute("aria-hidden","true"),g.append(z("span",void 0,"soil"),p),t[0].append(g)});const s=F.plots.findIndex(m=>m&&Pt(m)&&m.cultivation?.startedAt!==void 0);if(F.cultivationVisit||s>=0){const m=F.cultivationVisit,v=F.plots[m?.plot??s],g=yt.querySelector(".cultivation-hint"),p=g&&g.dataset.plant===v?.id?g:z("div",void 0,"cultivation-hint");p.dataset.plant=v?.id??"";const _=p.querySelector("progress")??z("progress");_.max=1,_.className="cultivation-hint-progress",_.setAttribute("aria-label","培育进度"),_.hasAttribute("value")||(_.value=0),p.dataset.cultivationPlot=String(m?.plot??s),_.parentElement!==p&&p.append(_),e=p}const a=z("nav",void 0,"garden-tools");for(const[m,v]of[["bag","背包"],["shop","商店"],["book","图鉴"]]){const g=fe("",()=>At.open(m),"garden-icon");g.innerHTML=co(m),g.title=v,g.setAttribute("aria-label",v),a.append(g)}const o=Bp(),c=fe(`采摘 ${F.plots.filter(m=>m&&m.readyAt<=Date.now()&&!m.keep&&!Pt(m)).length}`,()=>{nt({type:"harvestMany"})},"strip-harvest",!F.plots.some(m=>m&&m.readyAt<=Date.now()&&!m.keep&&!Pt(m))),l=fe("批量播种",()=>At.open("sow"),"strip-sow"),u=z("div",void 0,"garden-controls");u.setAttribute("aria-label","花园工具栏");const d=fe("⠿",()=>{},"strip-drag");d.title="拖动农场",d.setAttribute("aria-label","拖动农场");const f=fe("×",()=>At.collapse(),"strip-collapse");f.title="收起农场",f.setAttribute("aria-label","收起农场"),u.append(d,a,c,l,f);const h=fe(cn?"2D":"3D",()=>{window.qbot.settings.set({gardenRenderMode:cn?"2d":"3d"}).catch(()=>Nt("画面切换失败，请重试"))},"strip-mode");if(h.title=cn?"切回手绘花园":"切换立体花园",h.setAttribute("aria-label","切换种植画面"),u.insertBefore(h,f),i)for(const[m,v,g]of[["↶","向左旋转",()=>zt?.rotate(-1)],["↷","向右旋转",()=>zt?.rotate(1)],["⌂","视角回正",()=>zt?.reset()],["−","缩小花园",()=>zt?.zoom(-1)],["＋","放大花园",()=>zt?.zoom(1)]]){const p=fe(m,g,"farm-camera");p.title=v,p.setAttribute("aria-label",v),u.insertBefore(p,f)}for(const m of[...yt.childNodes])m!==e&&m!==zt?.element&&m.remove();zt?(zt.element.isConnected||yt.append(zt.element),zt.update(n,r,Xn),zt.place(js.left,js.baseline)):yt.append(...t),yt.append(u,o),e&&!e.isConnected&&yt.append(e),Xo(!1),Bb(),requestAnimationFrame(gr)}function es(){Xn=null,Ht=null,tn=null,$i=null,yt.querySelectorAll(".quick-menu").forEach(i=>i.remove()),requestAnimationFrame(gr)}function Bb(){if(yt.querySelectorAll(".quick-menu").forEach(s=>s.remove()),Xn===null||!F)return;const i=Xn,e=F.plots[i],t=z("aside",void 0,`quick-menu${tn?" result-card":""}`);t.setAttribute("aria-label",`${i+1}号土地操作`);const n=z("div",void 0,"quick-heading");n.append(z("strong",tn?tn.title:`${i+1}号地${e?` · ${Ye[e.species].name}`:""}`),fe("×",es,"quick-close")),t.append(n),!tn&&e&&t.append(z("small",`剩余 ${e.harvestsLeft??1} 次采摘${e.fertilizers.length?" · "+Kt[e.fertilizers[0]].name:""}`,"muted"));const r=z("div",void 0,"quick-list");if(tn)zp(r,tn);else if(Ht){const s=du();F.v3&&r.append(fe("查看概率、精油与完整配对",()=>At.open("bag")));for(const a of s){const o=F.produce.some(l=>l.id===a.id)?"背包":"土地",c=fe("",()=>{nt({type:"breed",first:Ht,second:a.id})},"quick-row");c.append(z("strong",`${Ye[a.species].name} · ${o}`),Zi(a.traits)),r.append(c)}s.length||r.append(z("small","暂无其他可繁育的成熟植物")),r.append(fe("返回",()=>{Ht=null,pt()}))}else if($i&&!e){const s=F.produce.find(a=>a.id===$i);s&&r.append(fe(s.bred?"已繁育":"繁育 ♡",()=>{Ht=s.id,pt()},"quick-row",!qi(s))),r.append(fe("播种",()=>{$i=null,pt()},"primary"))}else if(e)if(e.readyAt<=Date.now())Up(r,e,i);else{const s=z("small");s.dataset.ready=String(e.readyAt),r.append(s);for(const a of Object.keys(Kt)){const o=e.fertilizers.length>0||!!e.batch?.settled;if(!F.fertilizers[a])continue;const c=fe("",()=>{nt({type:"fertilize",plot:i,fertilizer:a})},"quick-row",o||!F.fertilizers[a]);c.append(sl("fertilizer",a),z("strong",`${Kt[a].name.replace("肥料","")} ×${F.fertilizers[a]}`),...o?[z("small","✓")]:[]),c.title=F.v3?Ro(a):Kt[a].description,r.append(c)}!F.online||F.rehearsal?r.append(fe("测试：立即成熟",()=>{nt({type:"mature"})},"test-button")):r.append(z("small","联机作物按实际时间生长，立即成熟仅限本地花园或试演。","muted"))}else{r.append(fe("批量播种",()=>At.open("sow"),"primary"));for(const{seed:s,count:a}of Io(F.seeds.filter(o=>!cn||Wo(o.species)))){const o=fe("",()=>{nt({type:"plant",plot:i,seed:s.id})},"quick-row");o.append(sl("seed",s.species),z("strong",`${Ye[s.species].name} ×${a}`),z("small",Co(s.species,F),"growth-duration")),s.genes.length&&o.append(Zi(s.genes)),r.append(o)}F.seeds.length||r.append(z("small","种子用完了"),fe("去商店补货",()=>At.open("shop")))}e&&!tn&&!Ht&&r.append(fe(e.keep?"✓ 留养中":"留养",()=>{nt({type:"keep",plot:i})},"keep-button")),t.append(r),tn&&Ju(t,tn,es),yt.append(t),_a(),requestAnimationFrame(gr)}function _a(){const i=yt.querySelector(".quick-menu"),e=yt.querySelector(`[data-plot="${Xn}"]`);if(!i||!e)return;const t=e.getBoundingClientRect();e.parentElement.getBoundingClientRect();const n=tn?230:220;i.style.width=`${n}px`,i.style.maxHeight="350px";const r=[...yt.querySelectorAll(".plot .art")].map(a=>{const o=a.getBoundingClientRect();return{left:o.left,right:o.right,bottom:o.bottom,top:Math.min(o.top,o.bottom-(parseFloat(a.style.height)||o.height))-10}});hs&&r.push(hs);const s=Gm(innerWidth,innerHeight,n,i.offsetHeight,t.x+t.width/2,[ki,...r,...gn?[gn]:[]],!!tn);i.style.maxHeight=`${s.maxHeight}px`,i.style.left=`${s.left}px`,i.style.top=`${s.top}px`}function pt(){if(ha||jr!==null)return;if(qe==="feeding"&&(qe="bag"),document.body.classList.toggle("weather-mode",qe==="weather"),qe==="weather"&&F?.v3){Lp=Math.floor(Date.now()/36e5),yt.replaceChildren(),F.economy?(yt.append(fe("← 回花园",()=>Mt("plots"))),Am(yt,F,nt)):Nb(yt,F,()=>Mt("plots"));return}if(qe==="weather"){pr?Pp(pr):yt.textContent="正在读取天气…",Ip();return}if(document.body.classList.toggle("travel-mode",!Gt&&(qe==="travel"||qe==="moments")),!F){yt.textContent="正在打开花园…";return}if(Gt){Ob();return}if(qe==="travel"||qe==="moments"){const a=z("section");F.economy&&qe==="travel"?Tm(a,F,ou,nt,Mt):Hm(a,F,qe,nt,Mt,Jt,pt),yt.replaceChildren(a);return}const i=um({state:F,characters:ou,busy:Jt,act:nt,switchActor:Fb,feed:cu,notice:Nt}),e=z("nav",void 0,"tabs");for(const[a,o]of[["bag","背包"],["shop","商店"],["book","植物图鉴"]]){const c=fe("",()=>Mt(a),qe===a||a==="shop"&&qe==="daily"?"active":"");c.innerHTML=co(a),c.append(z("span",o)),e.append(c)}e.append(fe("天气",()=>Mt("weather")),fe("世界旅行",()=>Mt("travel")),fe("朋友圈",()=>Mt("moments"))),e.prepend(fe("土地",()=>Mt("plots"),qe==="plots"||qe.startsWith("plot:")?"active":"")),e.append(fe("朋友花园",()=>Mt("friends")),fe("家具扭蛋",()=>Mt("capsule"))),F.v3&&e.append(fe("花园手册",()=>Mt("notebook")));const t=z("section",void 0,`content page-${qe.split(":")[0]}`),n={state:F,act:nt,go:Mt,refresh:()=>jn(!0),notice:Nt,busy:Jt,plantArt:$o};if(F.life?.pending&&qe!=="sprays"&&t.append(fe("继续处理喷雾结果",()=>Mt("sprays"),"primary")),F.economy&&(qe==="plots"||qe==="bag")&&wm(t,F,nt,Mt),qe==="capsule")bm(t,F,nt);else if(qe==="notebook"&&F.v3)Db(t,F,nt,Mt);else if(qe==="daily"||qe==="shop"){const a=z("nav",void 0,"tabs shop-tabs");a.setAttribute("aria-label","商店分类"),a.append(fe("今日小店",()=>Mt("daily"),qe==="daily"?"active":""),fe("种植补给",()=>Mt("shop"),qe==="shop"?"active":"")),t.append(a),qe==="daily"?df(t,n):Vb(t)}else qe==="sprays"?hf(t,n):qe==="friends"?Pm(t,n):qe.startsWith("visit:")?Nm(t,n,qe.slice(6)):qe==="sow"?kb(t):qe==="book"?Gb(t):qe==="plots"||qe.startsWith("plot:")?zb(t):Hb(t);const r=z("footer"),s=fe(cn?"3D · 切回手绘":"手绘 · 试试3D",()=>{window.qbot.settings.set({gardenRenderMode:cn?"2d":"3d"}).catch(()=>Nt("画面切换失败，请重试"))},"garden-render-toggle");s.setAttribute("aria-label","切换种植画面"),r.append(s),r.append(z("span",F.rehearsal?"本地试演 · 全部为模拟资产 · 退出试演后恢复正式花园":F.online?"联机花园 · 由服务器保存":"本地花园 · 离线继续生长 · 成熟不枯萎")),(!F.online||F.rehearsal)&&r.append(fe("测试：立即成熟",()=>{nt({type:"mature"})},"test-button")),yt.replaceChildren(i,Bp(),e,t,r),Ht&&Wb(t),Xo(!1)}function Zu(i,e,t=1){const n=z("article",void 0,"card seed-card");if(n.append(Ri(i.species,i.genes,1,"seed"),z("h3",`${Ye[i.species].name}${i.genes.length||i.massGene?" · 神秘种子":i.bred?" · 繁育种子":"种子"} ×${t}`),z("p",Co(i.species,F),"muted")),(i.genes.length||i.bred)&&(n.append(Zi(i.genes)),i.parents&&n.append(z("small",i.parents.map(s=>Ye[s].name).join(" × ")))),cn&&!Wo(i.species))return n.append(z("small","切回 2D 后可播种","muted")),n;e!==void 0&&n.append(fe("种在这里",()=>{nt({type:"plant",plot:e,seed:i.id})},"primary"));const r=Math.min(t,af(F));return n.append(fe(`批量播种 · ${r} 块`,()=>{nt({type:"plantMany",seed:i.id})},"primary batch-sow",!r)),n}function kb(i){const e=af(F),t=z("div",void 0,"batch-toolbar");t.append(z("h2","批量播种"),z("small",`空地 ${e} 块`,"muted")),i.append(t),e||i.append(z("p","土地已种满","muted"));const n=z("div",void 0,"grid");Io(F.seeds).forEach(({seed:r,count:s})=>n.append(Zu(r,void 0,s))),i.append(n),F.seeds.length||i.append(fe("去商店",()=>Mt("shop"),"primary"))}function zb(i){i.append(fe("批量播种",()=>Mt("sow"),"primary"));const e=z("div",void 0,"plot-picker");for(let l=0;l<F.plots.length;l++)sf(F,l)&&e.append(fe(`${l+1}号 ${F.plots[l]?Ye[F.plots[l].species].name:"空地"}`,()=>Mt(`plot:${l}`),qe===`plot:${l}`?"active":""));i.append(e,fe(`一键采摘 · ${F.plots.filter(l=>l&&l.readyAt<=Date.now()&&!l.keep&&!Pt(l)).length}`,()=>{nt({type:"harvestMany"})},"primary",!F.plots.some(l=>l&&l.readyAt<=Date.now()&&!l.keep&&!Pt(l))));const t=qe.startsWith("plot:")?Number(qe.split(":")[1]):0,n=F.plots[t];if(!n&&t>=pa(F)){i.append(z("p","新版花园使用四块土地，已有作物可以继续收获。"));return}if(!n){i.append(z("h2",`给 ${t+1} 号土地选一粒种子`),z("p",F.v3?"每轮幼苗期可施肥一次，再生后重新选择。":"每株只施肥一次，覆盖全部采摘。","muted"));const l=z("div",void 0,"grid");Io(F.seeds).forEach(({seed:u,count:d})=>l.append(Zu(u,t,d))),i.append(l),F.seeds.length||i.append(z("p","背包里还没有种子。去商店领取今日补给。"),fe("逛商店",()=>Mt("shop"),"primary"));return}const r=z("article",void 0,"plant-detail"),s=$o(n);s.dataset.detailPlant=n.id;const a=z("div");a.append(z("div",`${t+1} 号土地 / ${n.bred?"已繁育":Pt(n)?"待培育揭晓":qi(n)?"可繁育一次":"金色起可繁育"}`,"eyebrow"),z("h2",Ye[n.species].name));const o=z("p","","grow-status");o.dataset.ready=String(n.readyAt),a.append(o,z("small",`剩余 ${n.harvestsLeft??1} 次采摘`,"muted"),fe(n.keep?"✓ 留养中":"留养",()=>{nt({type:"keep",plot:t})}));const c=z("progress");if(c.max=1,c.dataset.growth=n.id,a.append(c),n.readyAt<=Date.now())Up(a,n,t);else{a.append(z("p","临近成熟时，稀有植株会泛起光芒。","muted"));for(const l of Object.keys(Kt)){const u=n.fertilizers.length>0||!!n.batch?.settled;F.fertilizers[l]&&a.append(fe(`${Kt[l].name} · ${u?"本轮不能施肥":`剩 ${F.fertilizers[l]}`} — ${F.v3?Ro(l):Kt[l].description}`,()=>{nt({type:"fertilize",plot:t,fertilizer:l})},"fert-button",u||!F.fertilizers[l]))}}r.append(s,a),i.append(r)}function Hb(i){for(const s of on)F.produce.some(a=>a.id===s&&!a.locked)||on.delete(s);const e=z("div",void 0,"batch-toolbar");e.append(z("h2",`收获篮 · ${F.produce.length}`),fe(xi?"取消":"批量售出",()=>{xi=!xi,on.clear(),pt()})),xi&&e.append(fe("全选",()=>{F.produce.filter(s=>!s.locked).forEach(s=>on.add(s.id)),pt()})),i.append(e);const t=z("div",void 0,"grid");for(const s of F.produce){const a=z("article",void 0,`card produce-card border-${Lo(s.traits)}${on.has(s.id)?" selected":""}`);if(a.append(uf(fa(s),s),z("h3",Ye[s.species].name),Np(s),Zi(s.traits),z("p",`${s.kg.toFixed(3)} kg · ◉ ${s.value}`)),a.dataset.produce=s.id,a.draggable=!Jt&&!!so(F,s),a.ondragstart=o=>{if(Jt||!o.dataTransfer||!so(F,s)){o.preventDefault();return}ha=!0,a.classList.add("dragging"),o.dataTransfer.effectAllowed="move",o.dataTransfer.setData(ao,JSON.stringify({id:s.id,actor:F.activeActor}))},a.ondragend=()=>{ha=!1,document.querySelector(".feeding-over")?.classList.remove("feeding-over"),pt()},Rp(a,s),Ap(a,s,F,nt),!xi&&so(F,s)){const o=F.activeActor;a.append(fe("投喂",()=>cu(s.id,o),"primary"))}a.append(fe(s.locked?"★ 已收藏":"☆ 收藏",()=>{nt({type:"lock",id:s.id})},"collection")),xi?a.append(fe(on.has(s.id)?"✓ 已选":"选择",()=>{on.has(s.id)?on.delete(s.id):on.add(s.id),pt()},"select-check",!!s.locked)):a.append(...F.economy?[fe("分享水果",()=>cu(s.id,F.activeActor),"",!!s.locked||!F.activeActor)]:[],fe("繁育 ♡",()=>{Ht=s.id,pt()},"",!qi(s)),fe(`出售 · ${s.value}`,()=>{nt({type:"sell",id:s.id})},"",!!s.locked)),t.append(a)}if(F.produce.length||t.append(z("p","还没有收获","empty")),i.append(t),F.produce.length&&i.append(z("small","把符合心愿的果实拖到上方角色处投喂。","muted")),xi){const s=F.produce.filter(o=>on.has(o.id)).reduce((o,c)=>o+c.value,0),a=z("div",void 0,"batch-bar");a.append(fe(`售出 ${on.size} 份 · ◉ ${s}`,()=>{nt({type:"sellMany",ids:[...on]})},"primary",!on.size)),i.append(a)}i.append(z("h2",`种子口袋 · ${F.seeds.length}`));const n=z("div",void 0,"grid");Io(F.seeds).forEach(({seed:s,count:a})=>n.append(Zu(s,void 0,a))),i.append(n),i.append(z("h2","肥料"));const r=z("div",void 0,"grid");for(const s of Object.keys(Kt)){if(!F.fertilizers[s])continue;const a=z("article",void 0,"card");a.append(Op(s),z("h3",`${Kt[s].name} ×${F.fertilizers[s]}`),z("small",F.v3?Ro(s):Kt[s].description)),r.append(a)}i.append(r)}function Op(i){const e=sl("fertilizer",i);return e.classList.add("fert-art"),e}function Bp(){const i=im(F);return fe(`✿  ${i.text}`,()=>Gt?At.open(i.page):Mt(i.page),"quest-pill")}function Vb(i){for(const[r,s]of kt){const a=F.shop.offers.find(o=>o.id===r);!a||!a.stock?kt.delete(r):s>a.stock&&kt.set(r,a.stock)}const e=z("div",void 0,"batch-toolbar"),t=z("strong");t.id="refresh-clock",e.append(t,fe(Bi?"取消":"批量购买",()=>{Bi=!Bi,kt.clear(),pt()})),Bi&&e.append(fe("全选",()=>{F.shop.offers.filter(r=>r.stock).forEach(r=>kt.set(r.id,r.stock)),pt()})),i.append(e);const n=z("div",void 0,"grid shop-grid");for(const r of F.shop.offers){const s=r.kind==="seed"?Ye[r.item].rarity:Kt[r.item].grade===4?"rainbow":Kt[r.item].grade===3?"gold":Kt[r.item].grade===2?"blue":"normal",a=z("article",void 0,`card shop-card border-${s}${kt.has(r.id)?" selected":""}${r.stock?"":" sold-out"}`),o=r.kind==="seed"?Ye[r.item].name:Kt[r.item].name;if(a.append(r.kind==="seed"?Ri(r.item,[],1,"seed"):Op(r.item),z("h3",o),z("span",si[s],`tag ${s}`),z("small",r.stock?`剩余 ${r.stock}`:"缺货","stock")),r.kind==="seed"&&a.append(z("small",Co(r.item,F),"growth-duration")),Bi){const c=kt.has(r.id);if(a.append(fe(c?"✓":"选择",()=>{c?kt.delete(r.id):kt.set(r.id,r.stock),pt()},"select-check",!r.stock)),c){const l=z("div",void 0,"quantity");l.append(fe("−",()=>{kt.set(r.id,Math.max(1,kt.get(r.id)-1)),pt()}),z("span",String(kt.get(r.id))),fe("+",()=>{kt.set(r.id,Math.min(r.stock,kt.get(r.id)+1)),pt()})),a.append(l)}a.append(z("span",`◉ ${r.price}`,"unit-price"))}else a.append(fe(r.stock?`◉ ${r.price}`:"缺货",()=>{nt({type:"buy",offer:r.id})},"buy-price",!r.stock||F.coins<r.price));r.kind==="fertilizer"&&(a.title=F.v3?Ro(r.item):Kt[r.item].description),n.append(a)}if(i.append(n),Bi){const r=F.shop.offers.reduce((o,c)=>o+c.price*(kt.get(c.id)??0),0),s=[...kt.values()].reduce((o,c)=>o+c,0),a=z("div",void 0,"batch-bar");a.append(z("strong",`◉ ${r.toLocaleString()}`,r>F.coins?"insufficient":""),fe(`购买 ${s} 份`,()=>{nt({type:"buyMany",items:[...kt].map(([o,c])=>({offer:o,count:c}))})},"primary",!s||r>F.coins)),i.append(a)}}function Gb(i){const e=z("div",void 0,"plot-picker");for(const u of Object.keys(Ye))e.append(fe(Ye[u].name,()=>{Wr=u,pt()},Wr===u?"active":""));if(i.append(e),F.economy){i.append(z("h2",Ye[Wr].name+" · 收藏图鉴"),z("p","在不同天气下发现因子，用金色亲本随机繁育组合。发现奖励每项 5 花园币。"));const u=z("div",void 0,"factor-grid");for(const f of["base",...Object.keys(dt)]){const h=Wr+":"+f,m=F.discovered.includes(h),v=z("article",void 0,"factor "+(m?"unlocked":""));v.append(Ri(Wr,f==="base"?[]:[f]),z("strong",f==="base"?"原生":dt[f].name),z("p",m?F.claimed.includes(h)?"已收录":"发现奖励待领取":"尚未发现")),u.append(v)}const d=F.discovered.filter(f=>!F.claimed.includes(f)).length;i.append(u,fe("领取发现奖励 · "+d*5+" 币",()=>{nt({type:"claim"})},"primary",!d));return}const t=Wr,n=F.v3?vo(F.xp[t]):ef(F.xp[t]),r=F.v3?Yh:Qh,s=z("div",void 0,"book-heading");s.append(Ri(t),z("h2",`${Ye[t].name} · Lv.${n}`),z("p",`${F.xp[t]} 经验${n<r.length?` / 下一级 ${r[n]}`:" · 已达最高等级"}`));const a=z("progress");a.max=n<r.length?r[n]-r[n-1]:1,a.value=n<r.length?F.xp[t]-r[n-1]:1,s.append(a);const o=Object.entries(dt).filter(([u,d])=>d.level===n+1&&(!F.v3||Zh[t].includes(u))).map(([,u])=>u.name);o.length&&s.append(z("small","下一级解锁："+o.join("、"),"muted")),i.append(s),i.append(z("p",F.v3?"长作物收获经验更多，每物种每日首次 +8，收获经验每天最多60。每级新批次生长缩短1%，亲和因子概率随等级提升；图鉴首次发现另有奖励。":"每次收获 +10 经验；首次图鉴奖励另加 20 经验和积分。每级生长时间缩短 3%、天气因子概率提高 6%；升级解锁新因子。","muted"));const c=z("div",void 0,"factor-grid");for(const u of["base",...Object.keys(dt)]){const d=`${t}:${u}`,f=F.discovered.includes(d),h=u==="base"?1:dt[u].level,m=z("article",void 0,`factor ${f?"unlocked":""}`);m.append(Ri(t,u==="base"?[]:[u]),z("strong",u==="base"?"原生":dt[u].name,u==="base"?"tag normal":`tag ${dt[u].tier}`),z("span",f?F.claimed.includes(d)?"✓ 已领取":"+20 待领取":n<h?`Lv.${h} 开放`:"尚未发现")),u!=="base"&&m.append(z("small",`${pu[Xi(u)]} · ${si[dt[u].tier]}`),z("small",tf(u),"muted")),c.append(m)}const l=F.discovered.filter(u=>!F.claimed.includes(u)).length;i.append(c,fe(`一键领取${F.online?"花园币":"本次积分"} · ${l*20}`,()=>{nt({type:"claim"})},"primary claim",l===0))}function Wb(i){if(F.v3){const n=Fp().find(r=>r.id===Ht);n&&Pb(i,F,n,du(),nt,()=>{Ht=null,pt()},r=>fa(r));return}const e=z("aside",void 0,"breed-drawer");e.append(fe("× 取消",()=>{Ht=null,pt()},"close-drawer"),z("h2","选另一株亲本"),z("p","可以跨物种。子代随一方，每个词条 50% 概率继承；亲本保留但各消耗一次繁育资格。","muted"));const t=du();for(const n of t){const r=z("div",void 0,"parent-row"),s=F.produce.some(a=>a.id===n.id)?"背包":"土地";r.append(fa(n),z("strong",`${Ye[n.species].name} · ${s}`),Zi(n.traits),fe("与它繁育",()=>{nt({type:"breed",first:Ht,second:n.id})},"primary")),e.append(r)}t.length||e.append(z("p","还需要一株未繁育过的成熟植物。")),i.append(e)}function kp(i){document.querySelectorAll(".result-popup").forEach(a=>a.remove());const e=z("aside",void 0,"result-popup result-card");e.setAttribute("role","status");const t=()=>e.remove(),n=z("div",void 0,"quick-heading"),r=fe("×",t,"quick-close");r.disabled=!1,r.setAttribute("aria-label","关闭"),n.append(z("strong",i.title),r),e.append(n);const s=z("div",void 0,"quick-list result-body");zp(s,i),e.append(s),Ju(e,i,t),document.body.append(e)}function Ju(i,e,t){const n=F?.produce.find(m=>m.id===e.produce?.id);if(!n||(e.harvests?.length??0)>1){const m=z("div",void 0,"result-action-area"),v=fe("收好",t,"primary");v.disabled=!1,m.append(v),i.append(m);return}const r=z("div",void 0,"result-action-area"),s=z("div",void 0,"result-actions"),a=F.life?.pending?.target===n.id||!!F.v3?.appraisals[n.id]&&!F.v3.appraisals[n.id].done,o=!!n.locked||a,c=F.activeActor,l=c?F.life?.characters[c]:void 0,u=F.economy?{id:"social",species:n.species,traits:[],xp:0}:l?.wishes.filter(m=>nf(m,n)).sort((m,v)=>v.xp-m.xp)[0],d=async m=>{Jt||(s.querySelectorAll("button").forEach(v=>v.disabled=!0),await nt(m,t),r.isConnected&&(r.remove(),Ju(i,e,t)))},f=fe("出售",()=>{d({type:"sell",id:n.id})});f.disabled=o||Gt&&Jt,f.title="出售这颗果实，获得 "+n.value+" 花园币";const h=fe("投喂",()=>{u&&d({type:"feed",wish:u.id,produce:n.id})},"primary");h.disabled=o||!u||Gt&&Jt,h.title=u?tl(u)+" · +"+u.xp+" 角色经验":"不符合当前角色的食物心愿",s.append(f,h),r.append(s),o?r.append(z("small",n.locked?"已收藏，取消收藏后可出售或投喂":"请先完成这颗果实的待处理操作","muted")):u||r.append(z("small",c?"不符合当前角色的食物心愿":"选择角色后可投喂","muted")),i.append(r)}function zp(i,e){if(e.produce){const t=e.produce;i.classList.add("harvest-reveal",`quality-${Lo(t.traits)}`),i.append(fa(t),z("strong",Ye[t.species].name),Zi(t.traits),z("div",`${t.kg.toFixed(3)} kg · ◉ ${t.value}`,"result-stats")),i.querySelectorAll(".tag").forEach((n,r)=>n.style.setProperty("--reveal-i",String(r))),t.traits.length&&i.append(z("div",t.growthVersion===3?`综合 ${hu(t).toFixed(1)} 分 · ${si[ii(t.traits,t)]}品质`:`${t.traits.length} 重变异 · 词条售价 ×${(t.growthVersion===2?nm(t.traits):t.traits.reduce((n,r)=>n*dt[r].multiplier,1)).toFixed(2)}`,"harvest-multiplier"))}if(e.seed&&i.append(Ri(e.seed.species,e.seed.genes,1,"seed"),z("strong",`${Ye[e.seed.species].name} · 繁育种子 ×1`),Zi(e.seed.genes),z("small","重量待成熟后揭晓")),e.harvests&&e.harvests.length>1){const t=z("div",void 0,"harvest-summary");for(const n of e.harvests){const r=z("div");r.append(fa(n),z("small",Ye[n.species].name)),t.append(r)}i.append(t)}e.message&&i.append(z("p",e.message))}function qh(i){const e=Math.max(0,Math.ceil(i/1e3));return`${Math.floor(e/60)}:${String(e%60).padStart(2,"0")}`}let ro="";function Xo(i=!0){if(!F)return;const e=Date.now(),t=F.plots.map(s=>s?`${s.id}:${Mi(s,e)>=.22}:${Mi(s,e)>=.55}:${Mi(s,e)>=.8}:${s.readyAt<=e}`:"-").join("|");if(i&&ro&&t!==ro){ro=t,pt();return}ro=t,document.querySelectorAll("[data-plot]").forEach(s=>{const a=F.plots[Number(s.dataset.plot)],o=s.querySelector(".plot-mark");if(o.hidden=!a||a.readyAt>e,!s.classList.contains("farm-plot")&&a){const c=Mi(a,e),l=c>=1&&!Pt(a)&&a.traits.includes("giant"),u=a.harvestIndex?.8+c*.2:c,d=s.querySelector(".art");d.style.height=`${u<.55?35+u*60:(90+u*55)*(l?1.8:1)}px`;const f=s.parentElement,h=l?200:70,m=Math.max(h/2,Math.min(s.offsetLeft+s.clientWidth/2,f.clientWidth-h/2));d.style.width=`${h}px`,d.style.left=`${m-s.offsetLeft}px`,d.classList.contains("art-3d")&&(d.style.width=`${l?150:112}px`,d.style.height=`${l?172:135}px`,d.style.left="50%")}}),document.querySelectorAll("[data-ready]").forEach(s=>s.textContent=Number(s.dataset.ready)<=e?"成熟了！":`距离成熟 ${qh(Number(s.dataset.ready)-e)}`),document.querySelectorAll("[data-growth]").forEach(s=>{const a=F.plots.find(o=>o?.id===s.dataset.growth);a&&(s.value=Mi(a))}),document.querySelectorAll("[data-cultivation]").forEach(s=>{const a=F.plots.find(o=>o?.id===s.dataset.cultivation);a&&(s.value=s.max-zs(a,e))}),document.querySelectorAll("[data-cultivation-label]").forEach(s=>{const a=F.plots.find(o=>o?.id===s.dataset.cultivationLabel);a&&(s.textContent=(To(a)?"正在培育 · ":"待培育 · ")+Math.ceil(zs(a,e)/1e3)+" 秒")});const n=yt.querySelector(".cultivation-hint");if(n){const s=F.plots[Number(n.dataset.cultivationPlot)],a=n.querySelector("progress"),o=F.cooperations?.find(l=>l.plant===s?.id),c=o?Tb(o,e):s?Math.max(0,Math.min(1,1-zs(s,e)/(s.growthVersion===3?18e4:fu))):0;a.value=Math.max(a.value,c),a.setAttribute("aria-valuetext",`${Math.round(a.value*100)}%`)}const r=document.querySelector("#refresh-clock");Gt&&(_a(),qo()),r&&(r.textContent=`下一批 ${qh(F.shop.refreshAt-e)}`)}At.onAnchor(({left:i,right:e,bottom:t,top:n,side:r,performer:s,farm:a})=>{lu=s,Xh=r??(i>=innerWidth-e?"left":"right"),ki={left:i,right:e,top:n??t+25-(e-i),bottom:t+25},document.documentElement.style.setProperty("--pet-left",`${i}px`),document.documentElement.style.setProperty("--pet-right",`${e}px`),document.documentElement.style.setProperty("--baseline",`${a?.baseline??t}px`);const o=a?{left:a.left,width:455,toolsLeft:a.left}:Wm(i,e,innerWidth,Xh);js={left:o.left,baseline:a?.baseline??t},zt?.place(js.left,js.baseline),document.documentElement.style.setProperty("--garden-left",`${o.left}px`),document.documentElement.style.setProperty("--garden-width",`${o.width}px`),document.documentElement.style.setProperty("--tools-left",`${o.toolsLeft}px`),Xo(!1),_a()});At.onChanged(()=>{jn()});window.qbot.characters.onActivated(()=>{Ys++,mr||jn(!0),Dp()});Dp();At.onPage(i=>{Mt(i),jn()});let jr=null;if(Gt){document.addEventListener("pointerdown",e=>{e.button!==0||!e.target.closest(".strip-drag")||(e.preventDefault(),jr=e.pointerId,e.target.setPointerCapture(e.pointerId),At.ignoreMouse(!1),At.drag("start",e.screenX,e.screenY))}),document.addEventListener("pointermove",e=>{jr===e.pointerId&&At.drag("move",e.screenX,e.screenY)});const i=()=>{jr!==null&&(jr=null,At.drag("end",0,0),pt(),gr())};document.addEventListener("pointerup",i),document.addEventListener("pointercancel",i),document.addEventListener("lostpointercapture",i),window.addEventListener("blur",i),document.addEventListener("mousemove",e=>{Ao={x:e.clientX,y:e.clientY},gr()}),document.addEventListener("mouseleave",()=>{Ao={x:-1,y:-1},gr()}),document.addEventListener("pointerdown",e=>{e.target.closest(".quick-menu,.plot,dialog")||es()}),document.addEventListener("keydown",e=>{e.key==="Escape"&&!document.querySelector("dialog[open]")&&es()}),window.addEventListener("blur",()=>{document.querySelector("dialog[open]")||es()})}let jh=!0,Ao={x:-1,y:-1};function gr(){if(!Gt)return;const i=document.elementFromPoint(Ao.x,Ao.y),e=jr===null&&!document.querySelector("dialog[open]")&&!i?.closest("button,.quick-menu");e!==jh&&(jh=e,At.ignoreMouse(e))}document.addEventListener("visibilitychange",()=>{document.hidden?Gt&&(es(),window.qbot.overlays.report("cultivation",!1)):jn(!0)});setInterval(()=>{if(!document.hidden){if(qe==="weather"&&F?.v3){Lp!==Math.floor(Date.now()/36e5)&&jn(!0);return}if(qe==="weather"){pr&&cf(yt,pr,pr.now+Date.now()-au),Date.now()-au>=5e3&&Ip();return}Xo(),F&&!qe.startsWith("visit:")&&(Date.now()>=F.shop.refreshAt||F.plots.some(i=>i?.batch&&!i.batch.settled&&Date.now()>=i.batch.seedlingEnd)||F.plots.some(i=>i?.cultivation?.startedAt!==void 0)||F.online&&F.plots.some(i=>i?.cultivation))&&jn()}},1e3);jn(!0);function qo(){const i=yt.querySelector(".quest-pill"),e=yt.querySelector(".garden-controls"),t=yt.querySelector(".cultivation-hint");if(Gt&&window.qbot.overlays.report("cultivation",!!t&&!document.hidden),t){const c=lu??ki;t.style.width=`${Rb(c.right-c.left)}px`;const l=Ab(lu??ki,t.offsetWidth,t.offsetHeight,innerWidth,innerHeight),u=Cb(document.body.dataset.headOverlay||null,"cultivation"),d=l&&gn&&l.x<gn.right&&l.x+t.offsetWidth>gn.left&&l.y<gn.bottom&&l.y+t.offsetHeight>gn.top;t.style.visibility=l&&u&&!d?"visible":"hidden",l&&(t.style.left=`${l.x}px`,t.style.top=`${l.y}px`)}if(!i||!e)return;const n=parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--garden-left"))||12,r=(ki.left+ki.right)/2,s=Math.max(8,Math.min(r-i.offsetWidth/2,innerWidth-i.offsetWidth-8));let a=ki.top-i.offsetHeight-10;gn&&s<gn.right&&s+i.offsetWidth>gn.left&&a+i.offsetHeight>gn.top&&a<gn.bottom&&(a=gn.top-i.offsetHeight-8),i.style.left=`${s}px`,i.style.top=`${Math.max(8,a)}px`;const o=parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--baseline"))||ki.bottom-25;e.style.left=`${Math.max(8,Math.min(hs?.left??n,innerWidth-e.offsetWidth-8))}px`,e.style.top=`${Math.max(8,Math.min(innerHeight-e.offsetHeight-8,(hs?.bottom??o)+12))}px`}window.addEventListener("pagehide",()=>zt?.dispose(),{once:!0});
