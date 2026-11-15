/* Mirai Town - living isometric city, no libraries or remote assets */
(function(){
'use strict';
var canvas=document.getElementById('cityCanvas'),context=canvas&&canvas.getContext('2d');
if(!context)return;
var hint=document.getElementById('cityHint'), ticker=document.getElementById('cityTicker');
var chip=document.getElementById('cityCashChip'), shopChip=document.getElementById('cityShopChip');
var levelText=document.getElementById('cityLevelText'), growthText=document.getElementById('cityGrowthText');
var splash=document.getElementById('citySplash');
var state={month:0,cash:1200,shop:0,fund:0,total:1200,news:null,started:false,ended:false,cityTickets:0,cityBuilds:{}};
try { var old=JSON.parse(localStorage.getItem('mirai-town-invest-v1')||'null'); if(old){state=Object.assign({},state,old);state.total=(old.cash||0)+(old.shop||0)+(old.fund||0);} }catch(_){}
var w=900,h=540,dpr=1,scale=1,zoom=1,panX=0,panY=0;
var frame=0,last=0,lastPaint=0,animated=true,particles=[],constructionStart=0,constructionUntil=0,rippleUntil=0;
var lastLevel=-1,lastFund=-1,lastMonth=-1,lastShop=-1;
var selected='shop',shopLevels=['空き地','キャンディ屋台','おかしショップ','スイーツカフェ','スイーツビル'];
var fullMap=9,tileW=86,tileH=43;
var buildPlots=[{x:3,y:3},{x:6,y:2},{x:3,y:7},{x:8,y:6}],buildMoments={},activeLot=-1;
var colors={sky:'#a9e1ff',road:'#abb9bb',street:'#677e89',leaf:'#67bc8a',soil:'#b6a27a'};
function clamp(n,min,max){return Math.max(min,Math.min(max,n));}
function level(v){return v>=1200?4:v>=700?3:v>=300?2:v>=100?1:0;}
function fundLevel(v){return v>=700?3:v>=300?2:v>=100?1:0;}
function format(v){return Math.round(v).toLocaleString('ja-JP');}
function resize(){
 var rect=canvas.getBoundingClientRect(),nw=Math.round(rect.width),nh=Math.round(rect.height);
 if(!nw||!nh)return;
 w=nw;h=nh;dpr=Math.min(2,window.devicePixelRatio||1);
 canvas.width=Math.round(nw*dpr);canvas.height=Math.round(nh*dpr);
 scale=clamp(w/820,.7,1.35);
 if(w<550)scale=clamp(w/390,.90,1.12);
}
function iso(a,b){return{x:(a-b)*tileW/2,y:(a+b)*tileH/2};}
function rect(x,y,width,height,color){context.fillStyle=color;context.fillRect(x,y,width,height);}
function poly(points,color,stroke,line){
 context.beginPath();context.moveTo(points[0][0],points[0][1]);
 for(var i=1;i<points.length;i++)context.lineTo(points[i][0],points[i][1]);
 context.closePath();context.fillStyle=color;context.fill();
 if(stroke){context.lineWidth=line||1;context.strokeStyle=stroke;context.stroke();}
}
function roundRect(x,y,width,height,r,color,stroke){
 var q=Math.min(r,width/2,height/2);
 context.beginPath();context.moveTo(x+q,y);context.arcTo(x+width,y,x+width,y+height,q);
 context.arcTo(x+width,y+height,x,y+height,q);context.arcTo(x,y+height,x,y,q);
 context.arcTo(x,y,x+width,y,q);context.closePath();context.fillStyle=color;context.fill();
 if(stroke){context.strokeStyle=stroke;context.lineWidth=2;context.stroke();}
}
function circle(x,y,r,color){context.beginPath();context.arc(x,y,r,0,Math.PI*2);context.fillStyle=color;context.fill();}
function line(x1,y1,x2,y2,color,width){context.beginPath();context.moveTo(x1,y1);context.lineTo(x2,y2);context.strokeStyle=color;context.lineWidth=width||2;context.lineCap='round';context.stroke();}
function label(text,x,y,size,color,weight){
 context.textAlign='center';context.textBaseline='middle';context.font=(weight||900)+' '+size+'px system-ui, sans-serif';
 context.fillStyle=color||'#fff';context.fillText(text,x,y);
}
function balloon(text,x,y,bg){
 var wide=Math.min(190,text.length*9+24);
 roundRect(x-wide/2,y-13,wide,27,10,bg||'#ffffffee','#ffffff');
 label(text,x,y+1,11,'#37526b',900);
}
function prism(p,wide,deep,height,top,left,right){
 var x=p.x,y=p.y,w2=wide/2,d2=deep/2;
 poly([[x-w2,y],[x,y+d2],[x,y+d2-height],[x-w2,y-height]],left);
 poly([[x,y+d2],[x+w2,y],[x+w2,y-height],[x,y+d2-height]],right);
 poly([[x-w2,y-height],[x,y-d2-height],[x+w2,y-height],[x,y+d2-height]],top,'#ffffff48',1);
 return {x:x,y:y,top:y-height};
}
function windows(p,wide,deep,height,rows,cols){
 var left=p.x-wide/2,top=p.y-height+6;
 for(var row=0;row<rows;row++){
   for(var col=0;col<cols;col++){
     var xx=left+12+col*(wide-23)/Math.max(1,cols-1);
     var yy=top+11+row*(height-24)/Math.max(1,rows);
     poly([[xx,yy+6],[xx+9,yy+10],[xx+9,yy+25],[xx,yy+21]],'#a2e7f7','#ffffff91');
   }
 }
}
function tree(x,y,t,small){
 var r=small?12:18;
 circle(x+3,y+4,small?9:12,'#294d5445');
 line(x,y-6,x,y-29,'#947452',5);
 circle(x,y-30,r,'#53b783');
 circle(x-10,y-26,r*.76,'#78ca8b');
 circle(x+11,y-23,r*.72,'#389f77');
 circle(x-4,y-34,4,'#b1e5a4');
}
function drawTile(a,b,t){
 var p=iso(a,b),road=a===4||b===4,park=(a===2&&b===5)||(a===1&&b===6);
 var c=road?((a+b)%2?'#9eafb1':'#a8babd'):park?'#69c99b':((a+b)%3?'#9cda93':'#a9df98');
 poly([[p.x,p.y-tileH/2],[p.x+tileW/2,p.y],[p.x,p.y+tileH/2],[p.x-tileW/2,p.y]],c,'#ffffff4d',1);
 if(road){
   if(a===4&&b===4){circle(p.x,p.y,4,'#d7e5cb');}
   else if(a===4){line(p.x+8,p.y-4,p.x-8,p.y+4,'#f4e9b9',2);}
   else if(b===4){line(p.x-8,p.y-4,p.x+8,p.y+4,'#f4e9b9',2);}
   else{line(p.x-5,p.y-5,p.x+5,p.y+5,'#ffffff8f',1);}
 }
 if(!road&&!park&&((a*7+b*3)%5===1)){
  circle(p.x-22,p.y-7,2,'#e5ba6e');circle(p.x+16,p.y+6,2,'#d4f2a2');
 }
}
function car(a,b,t,color,dir){
 var p=iso(a,b),progress=(t*.11+dir)%8,aa=dir%2?4:progress,bb=dir%2?progress:4;
 p=iso(aa,bb);
 context.save();context.translate(p.x,p.y-6);context.rotate(dir%2?2.64:.5);
 circle(-10,9,4,'#273e54');circle(10,9,4,'#273e54');
 roundRect(-17,-7,34,15,5,color,'#36536b');
 roundRect(-6,-11,16,13,4,'#bce8f3');
 circle(-14,-2,2,'#ffebae');
 context.restore();
}
function person(x,y,time,tint,phase){
 var bounce=Math.sin(time*6+phase)*1.7;
 context.save();context.translate(x,y+bounce);
 circle(0,-14,5.5,'#d9956e');
 line(-3,-2,-5,4+Math.sin(time*7+phase)*3,'#4a5970',2.7);
 line(3,-2,5,4-Math.sin(time*7+phase)*3,'#4a5970',2.7);
 roundRect(-6,-9,12,12,4,tint);
 circle(2,-16,1,'#563b39');
 context.restore();
}
function drawStall(p,t){
 circle(p.x,p.y+6,37,'#315f4840');
 prism(p,61,35,20,'#fff0c9','#f8b26d','#e99470');
 poly([[p.x-40,p.y-21],[p.x,p.y-39],[p.x+40,p.y-21],[p.x,p.y-5]],'#ff8cae','#e36b91',2);
 for(var j=0;j<5;j++){var xx=p.x-34+j*17;line(xx,p.y-19-j%2*3,xx+6,p.y-3-j%2*3,j%2?'#fff4b1':'#ffffff',4);}
 roundRect(p.x-28,p.y-10,56,20,7,'#ffefdb');
 label('🍬 おかし',p.x,p.y,11,'#a34d73',900);
 line(p.x+26,p.y-40,p.x+26,p.y-62,'#a35c75',3);
 circle(p.x+26,p.y-68,8,'#ffdc73');
}
function drawShop(p,t){
 var lev=level(state.shop),hasConstruction=performance.now()<constructionUntil;
 context.save();
 circle(p.x+3,p.y+10,46+lev*2,'#2b785442');
 if(lev===0){
   poly([[p.x-43,p.y-13],[p.x,p.y-31],[p.x+43,p.y-13],[p.x,p.y+7]],'#e5d4a6','#c5a772',2);
   for(var i=0;i<5;i++){var dx=p.x-31+i*14;circle(dx,p.y-10+Math.sin(i)*6,2.5,'#91795e');}
   tree(p.x,p.y-7,t,true);
   balloon('ここにおかし屋をつくろう！',p.x,p.y-68,'#fff0ce');
 }else if(lev===1){
   drawStall(p,t);
   balloon('🍬 キャンディ屋台',p.x,p.y-82,'#fff9df');
 }else{
   var fullHeight=lev===2?60:lev===3?105:157;
   var buildProgress=hasConstruction?clamp((performance.now()-constructionStart)/1700,.2,1):1;
   var height=fullHeight*buildProgress;
   var wide=lev===2?76:lev===3?93:103;
   prism(p,wide,50,height,lev===4?'#ffc5c6':'#ffe9c2','#ffa1af','#ed839e');
   if(buildProgress>.52)windows(p,wide,50,height,lev===2?1:lev===3?2:3,2);
   poly([[p.x-wide/2-6,p.y-height+28],[p.x,p.y-height+39],[p.x+wide/2+6,p.y-height+28],[p.x,p.y-height+17]],'#e9558f','#cb4a7d',2);
   var sign=lev===2?'SWEETS':lev===3?'SWEETS CAFE':'SWEET PALACE';
   balloon(sign,p.x,p.y-height-20,'#fff3dc');
   if(lev>=3){
     circle(p.x+wide/2+10,p.y+2,11,'#ffdfab');
     circle(p.x+wide/2+10,p.y+2,4,'#fb8eae');
   }
   if(lev===4){
     line(p.x,p.y-height-15,p.x,p.y-height-54,'#d04b75',3);
     poly([[p.x,p.y-height-55],[p.x+22,p.y-height-48],[p.x,p.y-height-40]],'#ffda6d');
     circle(p.x+wide/2-14,p.y-height-13,5+Math.sin(t*2)*1.6,'#fff9b6');
   }
 }
 if(hasConstruction){
   var top=p.y-170;
   line(p.x+90,p.y-9,p.x+90,top,'#e5a72b',6);
   line(p.x+24,top+9,p.x+131,top+9,'#f9d268',6);
   line(p.x+90,top-2,p.x+90,top+25,'#f5dc94',4);
   line(p.x+30,top+12,p.x+30,top+53+Math.sin(t*5)*13,'#65778a',2);
   poly([[p.x+22,top+54],[p.x+38,top+54],[p.x+34,top+70],[p.x+26,top+70]],'#ffbd53');
   person(p.x+64,p.y+10,t,'#ffc64d',.7);
 }
 if(selected==='shop'){
  var sz=42;line(p.x-sz,p.y+10,p.x-sz,p.y+2,'#f2b851',4);line(p.x+sz,p.y+10,p.x+sz,p.y+2,'#f2b851',4);
 }
 context.restore();
}
function drawFund(p,t){
 var v=fundLevel(state.fund);
 if(!v){
   tree(p.x,p.y-3,t,false);
   return;
 }
 var H=[0,29,70,116][v];
 circle(p.x,p.y+5,39,'#336a5e48');
 prism(p,72,43,H,v===1?'#c8eeea':'#d8e3f8','#79acc3','#5489ab');
 if(v>1)windows(p,69,43,H,v===3?3:2,2);
 balloon(v===1?'本屋さん':v===2?'本とカフェ':'いろいろビル',p.x,p.y-H-15,'#e0f8ff');
 if(v===1){
   roundRect(p.x-18,p.y-22,36,14,4,'#f8da9d');
   label('BOOK',p.x,p.y-15,9,'#497995',900);
 }
}
function drawHouse(p,variant,t){
 var body=variant%2?'#b3c6f0':'#ffe2b9',roof=variant%2?'#6c95c2':'#eab0a1';
 prism(p,55,33,38,roof,body,variant%2?'#8caedc':'#f7c59b');
 poly([[p.x-33,p.y-39],[p.x,p.y-70],[p.x+33,p.y-39],[p.x,p.y-18]],roof);
 rect(p.x-8,p.y-28,11,17,'#c4ecf2');
 circle(p.x+19,p.y-7,3,'#f6faac');
}
function drawPark(p,t){
 circle(p.x,p.y+8,33,'#71b877');
 tree(p.x-14,p.y+2,t,false);
 circle(p.x+19,p.y-5,9,'#ffb6b0');
 circle(p.x+17,p.y-5,3,'#fff6e1');
}
function drawSchool(p,t){
 prism(p,83,49,73,'#e7aa78','#ffc789','#e79b7f');
 windows(p,81,49,73,2,2);
 balloon('🏫 まなびの学校',p.x,p.y-97,'#fff9e3');
}
function ferris(p,t){
 context.save();context.translate(p.x,p.y-41);
 line(-29,44,0,-3,'#d78d77',5);line(29,44,0,-3,'#d78d77',5);
 context.rotate(t*.13);
 context.beginPath();context.arc(0,-17,42,0,Math.PI*2);context.strokeStyle='#ed7597';context.lineWidth=6;context.stroke();
 for(var i=0;i<8;i++){
  var ang=i*Math.PI/4;
  line(0,-17,Math.cos(ang)*42,-17+Math.sin(ang)*42,'#ffe2a5',3);
  circle(Math.cos(ang)*42,-17+Math.sin(ang)*42,8,i%2?'#f7ca6d':'#8bd1b4');
 }
 context.restore();
}

/* Four developable city blocks. All buildings are cosmetic and do not modify investments. */
function buildingSite(p,t,lot){
 var chosen=state.cityBuilds&&state.cityBuilds[String(lot)];
 var since=buildMoments[lot],elapsed=since===undefined?99:(performance.now()-since)/1000;
 var grow=clamp(elapsed/1.6,.08,1);
 var hover=activeLot===lot;
 if(!chosen){
  var pulse=.65+Math.sin(t*3+lot)*.25;
  context.save();context.globalAlpha=hover?1:pulse;
  poly([[p.x,p.y-14],[p.x+37,p.y+4],[p.x,p.y+23],[p.x-37,p.y+4]],'#ffe4a0','#e49d64',2.5);
  poly([[p.x,p.y-23],[p.x+23,p.y-12],[p.x,p.y+1],[p.x-23,p.y-12]],'#fffbe8','#efa972',1);
  circle(p.x,p.y-17,13,'#ff8d9a');
  label('+',p.x,p.y-18,24,'#fff',900);
  context.restore();
  return;
 }
 circle(p.x+3,p.y+12,35,'#2a6d6453');
 if(chosen==='park'){
  poly([[p.x,p.y-15],[p.x+43,p.y+5],[p.x,p.y+26],[p.x-43,p.y+5]],'#6cc796','#358c74',2);
  tree(p.x-11,p.y-3,t,false);
  tree(p.x+16,p.y+7,t,true);
  if(grow>.5){circle(p.x+4,p.y+12,7,'#b5eafb');circle(p.x+4,p.y+12,3,'#fff');}
  if(elapsed<2){circle(p.x+12,p.y-36-Math.sin(t*4)*5,5,'#fff3a3');}
 }else if(chosen==='house'){
  prism(p,61,42,52*grow,'#e3c3a9','#cbe1ef','#91bfda');
  poly([[p.x-37,p.y-52*grow],[p.x,p.y-52*grow-26],[p.x+37,p.y-52*grow],[p.x,p.y-52*grow+18]],'#e38ba3','#bf6589',2);
  roundRect(p.x-17,p.y-25*grow,18,17*grow,3,'#fff1bf');
  circle(p.x+19,p.y-10,5,'#fff1b1');
 }else if(chosen==='library'){
  var ht=76*grow;
  prism(p,78,48,ht,'#e8e0fa','#b9b4ee','#7a9ed7');
  if(grow>.6){windows(p,74,48,ht,2,2);}
  poly([[p.x-42,p.y-ht+15],[p.x,p.y-ht+32],[p.x+42,p.y-ht+15],[p.x,p.y-ht-3]],'#ffcf82','#e8aa64',2);
  if(grow>.8)balloon('📚 としょかん',p.x,p.y-ht-34,'#f7f0ff');
 }else if(chosen==='bakery'){
  var hh=59*grow;
  prism(p,76,47,hh,'#ffe8bf','#f3ad8a','#d8788e');
  poly([[p.x-42,p.y-hh+18],[p.x,p.y-hh-7],[p.x+42,p.y-hh+18],[p.x,p.y-hh+42]],'#d9759a','#ae527d',2);
  if(grow>.65){roundRect(p.x-25,p.y-24,42,17,4,'#fff4ce');label('🥐',p.x-4,p.y-16,16,'#ab6a53');}
  if(grow>.8)balloon('🥐 パンやさん',p.x,p.y-hh-40,'#fff6d9');
 }
 if(elapsed<2){
   for(var i=0;i<4;i++){
    var off=Math.sin(t*4+i*1.8)*21;
    circle(p.x+off,p.y-39-i*16-(1-grow)*22,2+i%2,'#ffe08b');
   }
 }
}

function drawDetail(a,b,t){
 var p=iso(a,b);
 for(var pl=0;pl<buildPlots.length;pl++){
   if(a===buildPlots[pl].x&&b===buildPlots[pl].y){buildingSite(p,t,pl);return;}
 }
 if(a===5&&b===5){drawShop(p,t);return;}
 if(a===7&&b===5){drawFund(p,t);return;}
 if(a===1&&b===2||a===2&&b===1||a===7&&b===8||a===8&&b===2){drawHouse(p,(a+b)%3,t);return;}
 if(a===2&&b===5||a===1&&b===6){drawPark(p,t);return;}
 if(a===6&&b===1&&state.total>=2100){drawPark(p,t);return;}
 if(a===3&&b===6&&state.total>=3200){drawSchool(p,t);return;}
 if(a===7&&b===7&&state.total>=4200){ferris(p,t);return;}
 if(a===2&&b===7&&state.total>=2100){drawHouse(p,2,t);return;}
 if(a===8&&b===7&&state.total>=3600){drawHouse(p,1,t);return;}
 if((a+b*3)%8===1&&a!==4&&b!==4&&a!==7){tree(p.x+2,p.y-2,t,true);}
}
function background(t){
 var g=context.createLinearGradient(0,0,0,h);
 var night=state.month%12>=8&&state.month%12<=10;
 g.addColorStop(0,night?'#759dc6':'#88c7ed');g.addColorStop(.7,night?'#c8daed':'#caecf8');g.addColorStop(1,'#eff6cf');
 rect(0,0,w,h,g);
 circle(w*.82,h*.12,night?17:32,night?'#fff4d6':'#fff0a2');
 for(var i=0;i<5;i++){
  var cx=(w*(i*.29)+(t*9*(i%2?-1:1)))%(w+170); if(cx<-100)cx+=w+170;
  var cy=27+i*23;
  circle(cx,cy,19,'#ffffffb8');circle(cx+19,cy+5,15,'#ffffffb8');circle(cx-18,cy+7,12,'#ffffffb8');
 }
 poly([[0,h*.55],[w*.1,h*.48],[w*.26,h*.54],[w*.39,h*.45],[w*.53,h*.53],[w*.68,h*.46],[w*.85,h*.53],[w,h*.45],[w,h],[0,h]],'#a0ccaa');
 poly([[0,h*.7],[w*.12,h*.61],[w*.32,h*.68],[w*.49,h*.59],[w*.64,h*.7],[w*.83,h*.61],[w,h*.7],[w,h],[0,h]],'#7abd9b');
}
function vehicleAndPeople(t){
 var p=iso(4,(t*.66)%8);
 car(4,(t*.66)%8,t,'#fa926c',1);
 car((t*.55+5)%8,4,t,'#f5d86f',0);
 car(4,(t*.39+3)%8,t,'#6cb7df',3);
 var a=iso(4.38,(t*.20+2)%8),b=iso((t*.22+1)%8,4.33),c=iso(4.36,(t*.17+5)%8);
 person(a.x,a.y-2,t,'#ff78a0',0);
 person(b.x,b.y-3,t,'#ffe28b',1.9);
 person(c.x,c.y-3,t,'#90cde5',4.1);
}
function rain(t){
 var name=state.news&&state.news.title||'';
 if(!/雨|🌧|☔/.test(name))return;
 context.save();context.lineWidth=1.6;context.strokeStyle='#ffffffa5';
 for(var i=0;i<66;i++){
  var x=(i*137.6+t*170)%w,y=(i*71.2+t*230)%h;
  line(x,y,x-9,y+18,'#d8f3ff9e',1.4);
 }
 context.restore();
}
function addCoins(amount){
 var origin=iso(5,5);
 for(var i=0;i<Math.min(26,7+Math.round(amount/40));i++){
  particles.push({x:origin.x+(Math.random()-.5)*80,y:origin.y-40-Math.random()*80,vx:(Math.random()-.5)*110,vy:-80-Math.random()*75,life:1+Math.random()*.6,color:i%2?'#fce28c':'#ffd26e'});
 }
 if(particles.length>80)particles.splice(0,particles.length-80);
}
function effects(dt){
 for(var i=particles.length-1;i>=0;i--){
  var p=particles[i];p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=110*dt;p.life-=dt;
  if(p.life<=0){particles.splice(i,1);continue;}
  context.globalAlpha=clamp(p.life,0,1);
  circle(p.x,p.y,4+Math.sin(p.life*13)*1.7,p.color);
  context.globalAlpha=1;
 }
}
function paint(now){
 if(now-lastPaint<(w<600?30:16)){frame=requestAnimationFrame(paint);return;}
 lastPaint=now;
 if(!document.hidden){
  var t=now/1000,dt=clamp((now-last)/1000,0,.08);last=now;
  context.setTransform(dpr,0,0,dpr,0,0);context.clearRect(0,0,w,h);
  background(t);context.save();
  context.translate(w*.52+panX,h*.17+panY);context.scale(scale*zoom,scale*zoom);
  poly([[-424,0],[0,-215],[425,0],[0,465]],'#4e987b41');
  for(var depth=0;depth<=2*(fullMap-1);depth++){
    for(var x=0;x<fullMap;x++){
      var y=depth-x;if(y<0||y>=fullMap)continue;
      drawTile(x,y,t);
      drawDetail(x,y,t);
    }
  }
  vehicleAndPeople(t);
  effects(dt);
  context.restore();
  rain(t);
 }
 frame=requestAnimationFrame(paint);
}
function showSplash(title,subtitle){
 if(!splash)return;
 splash.querySelector('span').textContent=title;
 splash.querySelector('small').textContent=subtitle||'';
 splash.classList.add('show');
 clearTimeout(splash._timer);
 splash._timer=setTimeout(function(){splash.classList.remove('show');},1700);
}
function refreshHUD(){
 var lv=level(state.shop);
 if(chip)chip.textContent=format(state.total)+' コイン';
 if(shopChip)shopChip.textContent=format(state.shop)+' コイン';
 if(levelText)levelText.textContent='🏪 Lv.'+(lv+1)+' '+shopLevels[lv];
 var limits=[100,300,700,1200];
 if(growthText)growthText.textContent=lv>=4?'🏆 最高レベルのスイーツビル！':'次の進化まで あと'+format(Math.max(0,limits[lv]-state.shop))+'コイン';
 if(ticker)ticker.textContent=state.news?(state.news.icon+' '+state.news.title):'🚗 車や住人が行き交う街。株を買ってお店を育てよう！';
}
function nextState(next){
 var beforeLevel=level(state.shop),beforeFund=fundLevel(state.fund);
 var beforeMonth=state.month,shopBefore=state.shop;
 state=Object.assign({},state,next);
 if(!Number.isFinite(state.total))state.total=state.cash+state.shop+state.fund;
 var afterLevel=level(state.shop);
 if(lastLevel<0){lastLevel=afterLevel;lastFund=fundLevel(state.fund);}
 else{
  if(afterLevel>beforeLevel){
    constructionStart=performance.now();constructionUntil=constructionStart+2200;
    addCoins(Math.max(100,state.shop-shopBefore));
    showSplash('🎉 おみせが進化！','Lv.'+(afterLevel+1)+' '+shopLevels[afterLevel]);
  }else if(state.shop>shopBefore){
    addCoins(state.shop-shopBefore);
  }
  if(fundLevel(state.fund)>beforeFund){
    showSplash('🌍 新しい建物ができた！','いろいろな会社も応援しよう');
  }
  if(state.month>beforeMonth&&state.news&&(/祭り|ヒット|人気|支店/.test(state.news.title))){
    addCoins(50);
  }
 }
 refreshHUD();
}
function selectAt(px,py){
 var center={x:w*.52+panX,y:h*.17+panY},factor=scale*zoom;
 var x=(px-center.x)/factor,y=(py-center.y)/factor;
 var keys=[{name:'shop',x:5,y:5},{name:'fund',x:7,y:5},{name:'park',x:2,y:5},{name:'school',x:3,y:6},{name:'wheel',x:7,y:7}];
 buildPlots.forEach(function(z,i){keys.push({name:'lot',x:z.x,y:z.y,lot:i});});
 var best=null,dist=1e10;
 keys.forEach(function(z){var p=iso(z.x,z.y),dx=x-p.x,dy=y-(p.y-(z.name==='lot'?12:40));var d=dx*dx+dy*dy;if(d<dist){best=z;dist=d;}});
 if(!best||dist>(best.name==='lot'?56*56:75*75))return;
 selected=best.name;
 if(best.name==='lot'){
   activeLot=best.lot;
   var type=state.cityBuilds&&state.cityBuilds[String(best.lot)];
   if(type){
     var types={park:'🌳 公園',house:'🏠 おうち',library:'📚 図書館',bakery:'🥐 パン屋'};
     hint.textContent='🏡 '+(best.lot+1)+'番の土地：'+(types[type]||type)+'が完成！';
   }else{
     hint.textContent='🏗️ '+(best.lot+1)+'番の土地を選択！下から建てたい施設を選んでね。';
   }
   window.dispatchEvent(new CustomEvent('mirai:lot-selected',{detail:{lot:best.lot}}));
   return;
 }
 var messages={
  shop:'🍭 おかし屋さん：株の評価額に応じて屋台 → ショップ → カフェ → ビルに進化します！',
  fund:'🌍 分散投資エリア：本屋から大きなビルまで育ちます。分けて投資する効果を学ぼう。',
  park:'🌳 公園：まちの人が集まる場所。街全体の成長で施設も増えます。',
  school:'🏫 学校：まちが成長すると登場します。未来をつくる施設だよ。',
  wheel:'🎡 遊園地：大きな目標を達成すると姿をあらわします。'
 };
 if(hint)hint.textContent=messages[best.name];
}
var pointer=null;
canvas.addEventListener('pointerdown',function(e){
 pointer={id:e.pointerId,x:e.clientX,y:e.clientY,lastX:e.clientX,lastY:e.clientY,move:0};
 if(e.pointerType==='mouse'&&canvas.setPointerCapture)canvas.setPointerCapture(e.pointerId);
});
canvas.addEventListener('pointermove',function(e){
 if(!pointer||e.pointerId!==pointer.id)return;
 var dx=e.clientX-pointer.lastX,dy=e.clientY-pointer.lastY;
 pointer.move+=Math.abs(dx)+Math.abs(dy);
 if(e.pointerType==='mouse'||Math.abs(e.clientX-pointer.x)>10){
  panX=clamp(panX+dx,-260,260);panY=clamp(panY+dy,-160,160);
 }
 pointer.lastX=e.clientX;pointer.lastY=e.clientY;
});
canvas.addEventListener('pointerup',function(e){
 if(!pointer||e.pointerId!==pointer.id)return;
 if(pointer.move<14){
  var r=canvas.getBoundingClientRect();
  selectAt(e.clientX-r.left,e.clientY-r.top);
 }
 pointer=null;
});
canvas.addEventListener('pointercancel',function(){pointer=null;});
canvas.addEventListener('keydown',function(e){
 var amount=18;
 if(e.key==='ArrowLeft'){panX=clamp(panX-amount,-260,260);e.preventDefault();}
 if(e.key==='ArrowRight'){panX=clamp(panX+amount,-260,260);e.preventDefault();}
 if(e.key==='ArrowUp'){panY=clamp(panY-amount,-160,160);e.preventDefault();}
 if(e.key==='ArrowDown'){panY=clamp(panY+amount,-160,160);e.preventDefault();}
 if(e.key==='Enter'||e.key===' '){selectAt(w*.52,h*.52);e.preventDefault();}
});
document.querySelectorAll('[data-city-zoom]').forEach(function(b){
 b.addEventListener('click',function(){
   if(b.dataset.cityZoom==='reset'){zoom=1;panX=0;panY=0;}
   else zoom=clamp(zoom+(b.dataset.cityZoom==='in'?.15:-.15),.67,1.85);
 });
});
window.addEventListener('mirai:state',function(e){if(e&&e.detail)nextState(e.detail);});
window.addEventListener('mirai:city-built',function(e){
  var id=Number(e&&e.detail&&e.detail.lot);
  if(!Number.isInteger(id)||id<0||id>=buildPlots.length)return;
  buildMoments[id]=performance.now();
  var z=buildPlots[id],p=iso(z.x,z.y);
  for(var j=0;j<20;j++){
    particles.push({x:p.x+(Math.random()-.5)*52,y:p.y-35-Math.random()*50,vx:(Math.random()-.5)*120,vy:-45-Math.random()*110,life:1+Math.random(),color:j%2?'#fff5ae':'#ff99bd'});
  }
  showSplash('🏗️ まちに新しい建物！','建設チケットで街がにぎやかに！');
});
document.addEventListener('visibilitychange',function(){last=performance.now();});
window.addEventListener('resize',resize);
if(window.ResizeObserver)new ResizeObserver(resize).observe(canvas);
resize();refreshHUD();
lastLevel=level(state.shop);lastFund=fundLevel(state.fund);last=performance.now();
requestAnimationFrame(paint);
})();