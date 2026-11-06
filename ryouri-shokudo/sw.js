// おりょうり食堂 v3 — 新しいイラストをオフラインでも利用
const CACHE = "ryouri-shokudo-v3";
const ASSETS = [
  "./",
  "index.html",
  "manifest.webmanifest",
  "icon.svg",
  "icon-192.png",
  "icon-512.png",
  "assets/asset-map.json",
  "assets/kids/dishes/onigiri.png",
  "assets/kids/dishes/medamayaki.png",
  "assets/kids/dishes/misoshiru.png",
  "assets/kids/dishes/pancake.png",
  "assets/kids/dishes/omurice.png",
  "assets/kids/dishes/curry.png",
  "assets/kids/dishes/hamburg.png",
  "assets/kids/dishes/ramen.png",
  "assets/kids/ingredients/ごはん.png",
  "assets/kids/ingredients/しお.png",
  "assets/kids/ingredients/のり.png",
  "assets/kids/ingredients/たまご.png",
  "assets/kids/ingredients/あぶら.png",
  "assets/kids/ingredients/しょうゆ.png",
  "assets/kids/ingredients/とうふ.png",
  "assets/kids/ingredients/ねぎ.png",
  "assets/kids/ingredients/みそ.png",
  "assets/kids/ingredients/だし.png",
  "assets/kids/ingredients/たまねぎ.png",
  "assets/kids/ingredients/ケチャップ.png",
  "assets/kids/ingredients/じゃがいも.png",
  "assets/kids/ingredients/にんじん.png",
  "assets/kids/ingredients/おにく.png",
  "assets/kids/ingredients/カレールウ.png",
  "assets/kids/ingredients/ひきにく.png",
  "assets/kids/ingredients/パンこ.png",
  "assets/kids/ingredients/こむぎこ.png",
  "assets/kids/ingredients/ぎゅうにゅう.png",
  "assets/kids/ingredients/バター.png",
  "assets/kids/ingredients/めん.png",
  "assets/kids/ingredients/スープ.png",
  "assets/kids/ingredients/チャーシュー.png",
  "assets/kids/ingredients/シロップ.png",
  "assets/kids/ingredients/いちご.png",
  "assets/kids/ingredients/バナナ.png",
  "assets/kids/ingredients/ぶどう.png",
  "assets/kids/ingredients/ピーマン.png",
  "assets/kids/ingredients/きのこ.png",
  "assets/kids/ingredients/チーズ.png",
  "assets/kids/ingredients/ブロッコリー.png",
  "assets/kids/ingredients/りんご.png",
  "assets/kids/ingredients/とうもろこし.png",
  "assets/glossy/05_fried_egg_pan.png",
  "assets/glossy/02_curry_rice.png",
  "assets/glossy/09_ramen_bowl.png"
];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const req=e.request;
  if(req.method!=="GET")return;
  const sameOrigin=new URL(req.url).origin===location.origin;
  if(sameOrigin){
    e.respondWith(fetch(req).then(res=>{
      if(res.ok){const copy=res.clone();caches.open(CACHE).then(c=>c.put(req,copy));}
      return res;
    }).catch(()=>caches.match(req).then(r=>r||caches.match("index.html"))));
  }else{
    e.respondWith(caches.match(req).then(hit=>hit||fetch(req).then(res=>{
      if(res.ok||res.type==="opaque"){const copy=res.clone();caches.open(CACHE).then(c=>c.put(req,copy));}
      return res;
    })));
  }
});
