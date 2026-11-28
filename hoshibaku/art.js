(() => {
  "use strict";
  const {randomGenerator, PERFECT_WINDOW} = HoshiEngine;
  const TAU = Math.PI * 2;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  function tile(w, h = w) {
    const el = document.createElement("canvas");
    el.width = w;
    el.height = h;
    return el;
  }
  function poly(c, points, color) {
    c.fillStyle = color;
    c.beginPath();
    points.forEach(([x,y], i) => i ? c.lineTo(x,y) : c.moveTo(x,y));
    c.closePath();
    c.fill();
  }
  function box(c, x, y, w, h, color) {
    c.fillStyle = color;
    c.fillRect(Math.round(x), Math.round(y), Math.max(1,Math.round(w)), Math.max(1,Math.round(h)));
  }
  function sprite(name) {
    const el = tile(32), c = el.getContext("2d");
    const dark = "#271631", cream = "#fff5d5", yellow = "#ffde64", lime = "#bdff69", lavender = "#c7a1ff";
    const rect = (x,y,w,h,col) => box(c,x,y,w,h,col);
    const p = (pts,col) => poly(c,pts,col);
    const disk = (x,y,r,col) => {
      for (let dy=-r; dy<=r; dy++) {
        const dx=Math.floor(Math.sqrt(r*r-dy*dy));
        rect(x-dx,y+dy,dx*2+1,1,col);
      }
    };
    const starShape = [[15,1],[18,1],[20,10],[29,11],[31,14],[24,19],[26,29],[22,29],[16,25],[7,30],[5,27],[8,19],[1,14],[2,11],[12,10]];
    if (name === "star" || name === "gem" || name === "empty") {
      const off = name === "empty", pink = name === "gem";
      p(starShape,off?"#725981":dark);
      p([[16,4],[19,12],[28,13],[21,18],[23,26],[16,22],[8,26],[11,18],[4,13],[13,12]],off?"#2f2441":pink?"#ff8fd9":yellow);
      if (!off) {
        p([[16,6],[16,16],[6,14],[13,13]],pink?"#ffe6ef":"#ffffba");
        p([[16,17],[26,14],[21,18],[23,25],[16,21],[9,25]],pink?"#df61c4":"#f89b41");
        rect(13,10,2,3,cream);
      }
    } else if (name === "planet" || name === "brand") {
      const b = name === "brand";
      const ring=[[1,20],[4,16],[13,12],[22,8],[29,7],[31,8],[31,12],[26,17],[16,22],[5,25],[1,24]];
      p(ring,dark);p([[2,20],[9,15],[22,10],[29,8],[30,10],[27,13],[11,21],[3,23]],b?"#dfc0ff":"#fff19a");
      disk(16,15,10,dark);disk(16,15,8,b?"#a880ee":"#85d777");
      rect(12,9,6,2,b?"#f1d1ff":"#ecffac");rect(10,12,5,2,b?"#d5aaff":"#c9ff8b");
      rect(17,17,6,3,b?"#7850b4":"#38998b");rect(13,21,5,1,b?"#7952b2":"#349086");
      p([[1,21],[5,21],[12,19],[22,15],[29,11],[30,9],[31,12],[27,16],[18,21],[7,25],[2,25]],dark);
      p([[2,21],[5,22],[12,20],[23,15],[30,11],[29,14],[23,18],[12,23],[5,24],[2,23]],b?"#c5ff7c":"#fbe57f");
      rect(23,16,3,1,cream);
    } else if (name === "comet") {
      p([[2,30],[4,16],[9,7],[15,3],[25,2],[29,6],[30,15],[25,22],[14,26]],dark);
      p([[3,28],[8,16],[12,12],[13,7],[25,4],[19,17],[12,22]],"#5977de");
      p([[7,26],[12,15],[17,12],[19,12],[13,21]],"#9cefff");
      disk(21,11,8,"#387db7");disk(22,10,6,"#77dcf1");rect(20,6,5,2,cream);rect(23,12,4,2,"#51b3da");
    } else if (name === "moon") {
      disk(16,16,12,dark);disk(16,16,10,"#9985d3");disk(14,14,8,"#c7c6eb");
      rect(12,8,5,2,"#e8e5ff");rect(9,15,4,3,"#9991d1");rect(18,13,3,2,"#a499d7");rect(17,20,4,2,"#a298d6");
    } else if (name === "mine") {
      const spikes=[];
      for(let i=0;i<16;i++){const a=i*Math.PI/8-Math.PI/2,r=i%2?10:15;spikes.push([Math.round(16+Math.cos(a)*r),Math.round(16+Math.sin(a)*r)]);}
      p(spikes,dark);c.save();c.translate(2,2);c.scale(.87,.87);p(spikes,"#ff6d79");c.restore();
      disk(16,17,9,"#9e315a");disk(15,15,8,"#e84a68");
      rect(9,12,3,2,cream);rect(12,14,2,2,cream);rect(19,12,3,2,cream);rect(17,14,2,2,cream);
      rect(11,17,3,2,dark);rect(18,17,3,2,dark);rect(14,20,4,2,"#64224b");
    } else if (name === "trophy") {
      rect(6,4,20,4,"#ffef9a");rect(8,8,16,8,"#ffce58");rect(10,16,12,3,"#f3a642");rect(13,19,6,4,"#ef9e43");
      rect(14,22,4,4,"#ffdb64");rect(10,26,12,2,"#ffe37a");rect(8,28,16,2,"#c88652");
      [[2,7,5,2],[2,8,2,6],[4,13,4,3],[25,7,5,2],[28,8,2,6],[24,13,4,3]].forEach(a=>rect(...a,"#f4b455"));rect(10,8,2,5,cream);
    } else if (name === "calendar") {
      rect(3,6,26,23,"#a77dd4");rect(6,12,20,14,"#352341");rect(6,4,4,6,"#ead7ff");rect(22,4,4,6,"#ead7ff");
      [[8,15],[14,15],[20,15],[8,21],[14,21]].forEach(([x,y])=>rect(x,y,3,3,lavender));
    } else if (name === "sound" || name === "mute") {
      p([[3,12],[8,12],[15,6],[17,6],[17,26],[15,26],[8,20],[3,20]],"#e4c7ff");
      if(name==="sound") {[[20,11,2,10],[22,13,2,6],[25,6,2,4],[27,9,2,14],[25,22,2,4]].forEach(a=>rect(...a,"#d1a8f5"));}
      else {p([[21,12],[23,11],[30,19],[28,21]],"#e987b9");p([[28,11],[30,13],[23,21],[21,19]],"#e987b9");}
    } else if (name === "help") {
      [[8,3,16,3],[5,6,3,20],[25,6,3,20],[8,26,16,3],[11,9,9,3],[18,12,3,4],[14,15,5,3],[14,18,3,2],[14,22,3,2]].forEach(a=>rect(...a,"#dfc3f4"));
    } else if (name === "finger") {
      const hand=[[5,17],[8,15],[13,18],[13,5],[15,3],[18,4],[18,13],[21,12],[23,14],[26,14],[28,17],[28,23],[24,29],[12,29],[10,26],[5,21]];
      p(hand,"#a07ab9");p([[7,18],[9,17],[15,22],[15,6],[17,6],[17,16],[21,15],[23,17],[26,17],[26,22],[22,27],[13,27]],"#f0d8eb");
      rect(8,6,2,4,"#ff99d5");rect(3,10,4,2,"#ff99d5");rect(21,5,2,4,"#ff99d5");
    } else if (name === "share") {
      [[5,15],[21,6],[21,24]].forEach(([x,y])=>disk(x,y,4,"#e4c5fc"));
      p([[6,14],[21,6],[22,8],[7,17]],"#e4c5fc");p([[6,15],[22,23],[21,26],[6,18]],"#e4c5fc");
    } else if(name === "card") {
      rect(3,5,26,23,lavender);rect(6,8,20,17,"#392942");rect(8,11,4,4,"#f9e899");p([[7,23],[13,17],[16,19],[21,13],[25,20],[25,24]],"#cb9de8");
    }
    return el;
  }

  const cache = new Map();
  function graphic(name) {
    if (!cache.has(name)) cache.set(name, sprite(name));
    return cache.get(name);
  }
  function paintIcon(canvas, type = canvas.dataset.icon) {
    const c=canvas.getContext("2d");
    c.clearRect(0,0,canvas.width,canvas.height);
    c.imageSmoothingEnabled=false;
    const size=Math.min(canvas.width,canvas.height);
    c.drawImage(graphic(type),(canvas.width-size)/2,(canvas.height-size)/2,size,size);
  }
  function blit(c, img, x, y, size, ratio = 1) {
    const w = Math.round(size), h=Math.round(size*ratio);
    c.drawImage(img,Math.round(x-w/2),Math.round(y-h/2),w,h);
  }
  function sparkle(c, x,y,size,color) {
    box(c,x-size,y,size*2+1,1,color);
    box(c,x,y-size,1,size*2+1,color);
    if(size>=4){box(c,x-1,y-1,3,3,color);}
  }
  function orbit(c,x,y,rx,ry,rotation,color,dashes,from=0,to=TAU) {
    c.save();c.strokeStyle=color;c.lineWidth=1;c.setLineDash(dashes||[]);
    c.beginPath();c.ellipse(x,y,rx,ry,rotation,from,to);c.stroke();c.restore();
  }

  class Scene {
    constructor(canvas,mascot) {
      this.canvas=canvas;this.c=canvas.getContext("2d",{alpha:false});
      this.mascot=mascot;this.parts=[];this.pulses=[];this.kick=0;this.bite=0;this.stretch=0;this.shock=0;
      this.reduced=matchMedia("(prefers-reduced-motion: reduce)").matches;
      this.resize();new ResizeObserver(()=>this.resize()).observe(canvas);
    }
    resize() {
      const b=this.canvas.getBoundingClientRect();
      if (!b.width || !b.height) return;
      const scale=b.width<570?1.25:1.75;
      this.w=this.canvas.width=Math.round(b.width/scale);
      this.h=this.canvas.height=Math.round(b.height/scale);
      this.mobile=matchMedia("(max-width: 570px) and (orientation: portrait)").matches;
      this.bg=tile(this.w,this.h);
      this.background();this.c.drawImage(this.bg,0,0);
    }
    background(){
      const c=this.bg.getContext("2d"),w=this.w,h=this.h,rand=randomGenerator(14189);
      const g=c.createRadialGradient(w*.72,h*.55,0,w*.66,h*.5,w*.78);
      g.addColorStop(0,"#402656");g.addColorStop(.46,"#291c40");g.addColorStop(1,"#151021");
      c.fillStyle=g;c.fillRect(0,0,w,h);
      const stars=["#615077","#746188","#a68eaf","#cbb1d3","#9682a9","#6a587e"];
      for(let i=0;i<w*h/450;i++){
        const x=rand()*w,y=rand()*h,col=stars[Math.floor(rand()*stars.length)];
        if(i%26===0)sparkle(c,x,y,2,col);else box(c,x,y,i%8===0?2:1,1,col);
      }
      for(let layer=0;layer<3;layer++){
        const colors=["#382349","#432852","#2d203e"], step=layer===0?5:layer===1?3:4;
        const anchors=[];let yy=.96;
        for(let i=0;i<14;i++){yy=clamp(yy+(rand()-.48)*.25,.73,1);anchors.push(yy);}
        for(let x=0;x<w;x+=step){
          const idx=x/w*(anchors.length-1),k=Math.floor(idx),f=idx-k;
          const top=(anchors[k]*(1-f)+(anchors[Math.min(k+1,anchors.length-1)])*f)*h+(layer===2?h*.09:layer*h*.015);
          const y=Math.min(h,Math.round(top/2)*2+Math.floor(rand()*2));
          if(y<h)box(c,x,y,step,h-y,colors[layer]);
          if(layer===1 && rand()>.58 && y<h)box(c,x,y,step,1,"#63406b");
        }
      }
    }
    metrics(home) {
      const {w,h,mobile:m}=this;
      const size=home?(m?Math.min(w*(w<262?.51:.56),h*(w<262?.46:.53)):Math.min(w*.316,h*.74)):(m?Math.min(w*.48,h*.48):Math.min(w*.272,h*.66));
      const x=w*(home?(m?.68:.717):(m?.73:.727));
      const y=h*(home?(m?(w<262?.65:.625):.49):.56);
      return {x,y,size,mx:x-size*.085,my:y+size*.13};
    }
    trajectory(o,remaining,geom,held){
      const {mx,my}=geom;
      const p=clamp(remaining/2.02,0,1.2);
      if(remaining<0){
        const q=clamp(-remaining/.49,0,1);
        return {x:mx+q*this.w*.21,y:my-Math.sin(q*1.65)*this.h*.31,s:1-q*.36};
      }
      const distance=(mx+16)*p;
      const bend=this.h*(o.bend+Math.sin(o.phase*TAU)*.12);
      const y=my+Math.sin(p*Math.PI)*bend+Math.sin(p*5.7)*this.h*.10+(held?0:Math.sin(p*Math.PI)*this.h*.06);
      return {x:mx-distance,y,s:.8+.30*p};
    }
    clear(){this.parts.length=0;this.pulses.length=0;this.kick=this.bite=this.stretch=this.shock=0;}
    effect(e){
      const {mx,my,size}=this.metrics(false);
      const colors=e.type==="hit"?["#ffa3a2","#ff5a7a","#e78b4a"]:e.type==="perfect"||e.type==="fever"?["#fff3ae","#d2ff63","#ff98e5","#85eaff"]:["#ff91ce","#fbecab","#bdf68c"];
      const count=e.type==="eat"?5:e.type==="hit"?30:e.type==="fever"?48:24;
      const strength=e.type==="eat"?.33:1;
      if(e.type==="eat")this.bite=.2;
      if(e.type==="hit"){this.kick=1;this.shock=.55;}
      if(e.type==="perfect"||e.type==="fever")this.kick=.65;
      if(e.type==="bank"||e.type==="perfect")this.stretch=.25;
      const total=this.reduced?Math.min(6,count):count;
      for(let i=0;i<total;i++){
        const a=Math.random()*TAU,v=(.22+Math.random()*.9)*size*strength;
        this.parts.push({x:mx,y:my,vx:Math.cos(a)*v,vy:Math.sin(a)*v,life:.26+Math.random()*.43,max:.72,s:1+Math.random()*2,col:colors[i%colors.length]});
      }
      if(e.type!=="eat")this.pulses.push({x:mx,y:my,age:0,r:size*.7,col:colors[0]});
    }
    hero(c,t,geom,home,flight){
      const {x,y,size}=geom;
      const bob=this.reduced?0:Math.sin(t*(home?2.2:4.4))*size*(home?.026:.015);
      const bite=this.bite/.2, gulp=this.stretch/.25;
      const squash=this.reduced?0:(Math.sin(t*2.4)*.014+bite*.09-gulp*.19);
      const shake=this.reduced?0:this.shock*Math.sin(t*29)*.18;
      c.save();c.translate(Math.round(x),Math.round(y+bob));c.rotate(shake);
      c.scale(1+squash,1-squash);
      if(this.mascot.complete && this.mascot.naturalWidth){
        blit(c,this.mascot,0,0,size,this.mascot.naturalHeight/this.mascot.naturalWidth);
      } else {
        c.fillStyle="#ef4eab";c.beginPath();c.arc(0,0,size*.4,0,TAU);c.fill();
        c.fillStyle="#29172f";c.beginPath();c.ellipse(-size*.05,size*.12,size*.27,size*.19,0,0,TAU);c.fill();
        box(c,-size*.24,-size*.18,size*.11,size*.1,"#fff1dc");box(c,size*.04,-size*.22,size*.13,size*.13,"#fff1dc");
      }
      c.restore();
      if(flight?.stunned)for(let i=0;i<3;i++)sparkle(c,x+Math.cos(t*4+i*2.1)*size*.3,y-size*.46+Math.sin(t*4+i*2.1)*3,2,"#fff583");
    }
    gallery(c,t,geo){
      const {x,y,size:s}=geo, m=this.mobile;
      const rx=s*(m?.73:.85),ry=s*.37,rot=-.28;
      orbit(c,x,y,rx*1.12,ry*1.25,rot,"#765480",[3,6]);
      orbit(c,x,y,rx,ry,rot,"#a078a1",[],Math.PI*1.06,Math.PI*1.86);
      orbit(c,x,y,rx*1.27,ry*.85,-.52,"#63496f",[2,7],.03,4.7);
      const ball=(name,dx,dy,frac,phase)=>{
        const wob=this.reduced?0:Math.sin(t*1.5+phase)*s*.016;
        blit(c,graphic(name),x+dx*s,y+dy*s+wob,s*frac);
      };
      ball("planet",m?-.69:-.70,m?-.12:-.34,.28,0);
      ball("comet",m?.26:.59,m?-.66:-.48,m?.16:.18,2);
      ball("star",m?-.61:-.56,m?.35:.43,.15,3);
      ball("mine",m?.43:.72,m?.41:.33,m?.175:.2,1);
      [[-.63,-.51,.04,"#e5badc"],[.66,-.21,.035,"#d3f7c9"],[-.89,.20,.027,"#cbb4ed"],[.40,.56,.026,"#fed9a6"],[.12,-.61,.029,"#fddaae"]].forEach(([dx,dy,k,co])=>sparkle(c,x+dx*s,y+dy*s,Math.max(2,Math.round(s*k*(.83+.17*Math.sin(t*2+dx)))),co));
      this.hero(c,t,geo,true);
      orbit(c,x,y,rx,ry,rot,"#bf8cb4",[4,5],.48,1.53);
    }
    draw(mode,flight,now,dt){
      const c=this.c,w=this.w,h=this.h;
      if(!w||!h)return;
      c.imageSmoothingEnabled=false;c.globalAlpha=1;c.drawImage(this.bg,0,0);
      const home=mode==="home"||mode==="end", g=this.metrics(home);
      const t=this.reduced&&home?0:now;
      if(home){this.gallery(c,t,g);return;}
      c.save();
      if(this.kick>.02&&!this.reduced)c.translate(Math.round(Math.sin(now*64)*this.kick*3),Math.round(Math.cos(now*49)*this.kick*2));
      const f=flight, held=f.held&&!f.stunned;
      if(f.fever){
        const bloom=c.createRadialGradient(g.mx,g.my,2,g.mx,g.my,g.size*1.4);
        bloom.addColorStop(0,"rgba(246,126,219,.20)");bloom.addColorStop(1,"rgba(246,126,219,0)");c.fillStyle=bloom;c.fillRect(0,0,w,h);
      }
      const ringColor=f.fever?"#e3a6e6":held?"#a17db7":"#715677";
      orbit(c,g.mx,g.my,g.size*.92,g.size*.45,-.24,ringColor,[3,7],1.92,5.98);
      const danger=f.danger,delta=danger?danger.at-f.time:10;
      const hitZone=delta<=PERFECT_WINDOW&&!f.fever;
      if(delta<1.25&&!f.fever){
        const k=clamp(delta/1.25,0,1),r=g.size*(.18+.35*k);
        orbit(c,g.mx,g.my,r,r,0,hitZone?"#ffe79b":"#ff829a",[3,3]);
        if(hitZone)orbit(c,g.mx,g.my,r+2,r+2,0,"#de738e",[],0,TAU*(1-k));
      }
      if(held){
        for(let i=0;i<15;i++){
          const p=((t*(this.reduced?.22:.83)+i*.183)%1+1)%1;
          const u=1-p, x=g.mx-u*(g.mx+9), y=g.my+Math.sin(u*3.4+(i%5)*.24)*h*(i%2?.16:-.14)*u;
          box(c,x,y,2+u*5,1,i%3===0?"#d0b7d5":"#886c9e");
        }
      }
      this.hero(c,t,g,false,f);
      for(let i=Math.max(0,f.cursor-4);i<f.chart.length;i++){
        const o=f.chart[i],remaining=o.at-f.time;
        if(remaining>2.17)break;
        if(remaining<-.49||f.eliminated.has(o.id))continue;
        const p=this.trajectory(o,remaining,g,held);
        const type=o.kind==="mine"&&f.fever?"gem":o.kind;
        const sz=Math.max(13,g.size*(o.kind==="mine"?.205:.157))*p.s;
        c.globalAlpha=remaining<0?Math.max(0,1+remaining/.49):1;
        if(type==="mine" && remaining<1.05 && remaining>0){
          orbit(c,p.x,p.y,sz*.6,sz*.6,0,hitZone?"#ffd48d":"#e9819c",[2,2]);
        }
        blit(c,graphic(type),p.x,p.y,sz);
      }
      c.globalAlpha=1;
      for(const p of this.parts){
        p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=dt*g.size*.8;p.life-=dt;
        if(p.life<=0)continue;
        c.globalAlpha=Math.min(1,p.life*3);box(c,p.x,p.y,p.s,p.s,p.col);
      }
      this.parts=this.parts.filter(p=>p.life>0);
      for(const p of this.pulses){
        p.age+=dt;const q=p.age/.43;if(q>=1)continue;
        c.globalAlpha=(1-q)*.75;const r=Math.max(1,p.r*(.14+q));orbit(c,p.x,p.y,r,r*.83,0,p.col,[3,4]);
      }
      this.pulses=this.pulses.filter(p=>p.age<.43);c.globalAlpha=1;
      this.bite=Math.max(0,this.bite-dt);this.stretch=Math.max(0,this.stretch-dt);
      this.kick=Math.max(0,this.kick-dt*2.9);this.shock=Math.max(0,this.shock-dt);
      c.restore();
    }
  }
  globalThis.HoshiArt={Scene,graphic,paintIcon,sparkle};
})();
