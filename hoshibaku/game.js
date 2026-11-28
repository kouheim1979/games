(() => {
  "use strict";
  const {Flight, DURATION, PERFECT_WINDOW, randomGenerator, encodeChallenge, parseChallenge} = HoshiEngine;
  const {Scene, graphic, paintIcon, sparkle} = HoshiArt;
  const $ = id => document.getElementById(id);
  const format = n => n.toLocaleString("ja-JP");
  const dateInJapan = () => new Date(Date.now() + 9 * 3600000).toISOString().slice(0,10);
  const store = {
    get(k, fallback) { try { return localStorage.getItem("hoshibaku.v1."+k) ?? fallback; } catch { return fallback; } },
    set(k,v) { try { localStorage.setItem("hoshibaku.v1."+k, String(v)); } catch { /* Storage may be unavailable in private or file mode. */ } }
  };
  const write = (el, content) => { content=String(content);if(el.textContent!==content)el.textContent=content; };

  class Sound {
    constructor(){
      this.enabled=store.get("sound","1")==="1";
      this.ac=null;this.master=null;this.beat=-1;this.warning="";this.lastSecond=-1;
    }
    unlock(){
      if(!this.enabled)return;
      try{
        if(!this.ac){
          const Audio=window.AudioContext||window.webkitAudioContext;
          if(!Audio)return;
          this.ac=new Audio();
          this.master=this.ac.createGain();this.master.gain.value=.52;this.master.connect(this.ac.destination);
        }
        if(this.ac.state!=="running")this.ac.resume().catch(()=>{});
      }catch{ /* Silent play is available. */ }
    }
    toggle(){
      this.enabled=!this.enabled;store.set("sound",this.enabled?1:0);
      if(this.enabled)this.unlock();
      if(this.master)this.master.gain.setTargetAtTime(this.enabled?.52:0,this.ac.currentTime,.012);
      if(this.enabled)this.tone(660,.09,"sine",.13);
    }
    tone(hz,length=.1,wave="triangle",volume=.14,delay=0,end=0){
      if(!this.enabled || !this.ac || this.ac.state!=="running")return;
      const a=this.ac, start=a.currentTime+delay,osc=a.createOscillator(),env=a.createGain();
      osc.type=wave;osc.frequency.setValueAtTime(hz,start);
      if(end)osc.frequency.exponentialRampToValueAtTime(Math.max(20,end),start+length);
      env.gain.setValueAtTime(.0001,start);env.gain.exponentialRampToValueAtTime(volume,start+.008);
      env.gain.exponentialRampToValueAtTime(.0001,start+length);
      osc.connect(env);env.connect(this.master);osc.start(start);osc.stop(start+length+.025);
      osc.onended=()=>{osc.disconnect();env.disconnect();};
    }
    melody(notes,step=.065,wave="square",vol=.09){
      notes.forEach((n,i)=>{if(n)this.tone(n,step*1.6,wave,vol,i*step);});
    }
    start(){this.beat=-1;this.warning="";this.lastSecond=-1;this.melody([262,392,523],.074,"triangle",.13);}
    event(e){
      if(e.type==="eat"){
        const tones=[330,392,494,587,659,784,880,988,1175];
        this.tone(tones[Math.min(e.count-1,tones.length-1)],.1,"triangle",.19,0,tones[Math.min(e.count-1,8)]*1.15);
      } else if(e.type==="bank"){
        this.tone(250,.13,"sine",.23,0,95);this.melody([440,660],.05,"triangle",.12);
      } else if(e.type==="perfect"){
        this.tone(110,.21,"sine",.22,0,50);this.melody([494,622,740,988,1245],.042,"square",.082);
      } else if(e.type==="hit"){
        this.tone(160,.3,"sawtooth",.13,0,35);this.tone(85,.2,"square",.07,.05,33);
      } else if(e.type==="fever"){this.melody([659,830,988,1319,988,1319],.083,"square",.095);}
      else if(e.type==="end"){this.melody([523,659,784,1046],.115,"triangle",.19);}
    }
    tick(f){
      const beat=Math.floor(f.time/(f.fever?.193:.32));
      if(beat!==this.beat){
        this.beat=beat;
        const bass=[130.81,0,196,0,146.83,0,164.81,98];
        const note=bass[beat%8];if(note)this.tone(note,.12,"triangle",f.fever?.13:.085);
        if(f.fever)this.tone([523,659,784,988,1046,784,659,587][beat%8],.09,"square",.05);
      }
      const d=f.danger;
      if(d && !f.fever && d.at-f.time<=1.03){
        const phase=d.at-f.time<=PERFECT_WINDOW?2:1,key=d.id+"-"+phase;
        if(this.warning!==key){this.warning=key;this.tone(phase===2?882:510,.12,"square",.065,0,phase===2?1080:420);}
      }
      const second=Math.ceil(DURATION-f.time);
      if(second<=3&&second>0&&this.lastSecond!==second){this.lastSecond=second;this.tone(1046,.06,"sine",.15);}
    }
  }

  const sound=new Sound();
  const scene=new Scene($("sky"),$("mascot"));
  document.querySelectorAll("canvas[data-icon]").forEach(el=>paintIcon(el));
  let mode="home",flight=null,origin=0,source=null,activePointer=null;
  let best=Math.max(0,Number(store.get("best","0"))||0),previousBest=best;
  let drawnCharge="",callUntil=0,toastTimer=0,cardUrl="",cardBlob=null,cardVersion=0;
  let lastPaint=performance.now(),prevFever=false,route=dateInJapan();
  let challenge=parseChallenge(location.hash);
  function showRoute(day){
    route=day;write($("routeDay"),day.slice(5).replace("-","."));
    write($("routeLabel"),challenge?"対戦の航路":"今日の航路");
    write($("routeNote"),challenge?"目標 "+format(challenge.score)+"点":"対戦コード");
  }
  function showBest(){
    const el=$("best");el.replaceChildren(document.createTextNode(String(best)+" "));
    const unit=document.createElement("small");unit.textContent="PT";el.append(unit);
  }
  function soundUI(){
    const b=$("audioBtn");b.setAttribute("aria-pressed",String(sound.enabled));
    b.setAttribute("aria-label",sound.enabled?"音をオフにする":"音をオンにする");
    b.title=sound.enabled?"サウンド ON":"サウンド OFF";
    paintIcon(b.querySelector("canvas"),sound.enabled?"sound":"mute");
  }
  function switchMode(next){
    mode=next;
    $("routeBtn").disabled=!["home","end"].includes(next);
    $("cabinet").dataset.mode=next;
    $("titleScreen").hidden=next!=="home";
    const active=["play","ready","paused"].includes(next);
    $("liveTop").hidden=!active;$("flightHint").hidden=!active;
    $("endScreen").hidden=next!=="end";
    if(next!=="play")$("callout").hidden=true;
    if(next==="home"||next==="end")$("actionBtn").classList.remove("holding");
  }
  function announce(v){write($("announcer"),v);}
  function toast(v){write($("toast"),v);$("toast").hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$("toast").hidden=true,2350);}
  function call(title,sub,tone,life=.86){
    const el=$("callout");write($("callTitle"),title);write($("callSub"),sub);
    el.dataset.tone=tone;el.hidden=false;el.classList.remove("pop");void el.offsetWidth;el.classList.add("pop");
    callUntil=flight.time+life;
  }
  function setHint(tone,message){
    const el=$("flightHint");if(el.dataset.tone!==tone)el.dataset.tone=tone;write(el.lastElementChild,message);
  }
  function newRun(){
    const day=challenge?.day||dateInJapan();showRoute(day);flight=new Flight(day);previousBest=best;
    drawnCharge="";callUntil=0;prevFever=false;scene.clear();sound.start();
    switchMode("ready");
  }
  function showAction(symbol,message,isHeld){
    write($("actionSymbol"),symbol);write($("actionText"),message);
    $("actionBtn").classList.toggle("holding",!!isHeld);
    $("actionBtn").setAttribute("aria-pressed",String(!!isHeld));
  }
  function drawHUD(){
    const f=flight, held=mode==="play"&&f?.held;
    const score=f?.score??0,time=f?.time??0;
    write($("score"),String(score).padStart(6,"0"));write($("clock"),(Math.ceil((DURATION-time)*10)/10).toFixed(1));
    $("clock").parentElement.classList.toggle("urgent",DURATION-time<=5 && mode!=="end");
    const key=(f?.fever?"F":"C")+(f?.charge??0);
    if(key!==drawnCharge){
      drawnCharge=key;
      [...$("feverIcons").children].forEach((c,i)=>paintIcon(c,f?.fever||i<(f?.charge??0)?"gem":"empty"));
      $("feverIcons").setAttribute("aria-label",f?.fever?"フィーバー中":"フィーバーゲージ "+(f?.charge??0)+" / 3");
    }
    if(mode==="home")return;
    if(mode==="end"){
      showAction("▶","もう一度プレイ",false);
      write($("deckMain"),"同じ航路でリトライ");write($("deckSub"),"長押しで、もう一度この航路に挑戦");
      return;
    }
    write($("pot"),format(f.pot));write($("multi"),"×"+f.multiplier);
    showAction(held?"●":"▶",held?"離して飲みこむ":"長押しで吸いこむ",held);
    write($("deckMain"),f.fever?"爆弾もごちそう！":challenge?"対戦目標　"+format(challenge.score)+" 点":"ワンボタンで遊べる");
    write($("deckSub"),f.fever?"5秒の食べ放題！ そのまま長押し":"長押しで吸いこみ、離して飲みこむ");
    if(mode==="ready"){setHint("good",f.time===0?"長押しで、最初のひと口！":"長押しでプレイ再開");return;}
    const delta=f.danger?f.danger.at-f.time:10;
    if(f.stunned)setHint("warn","爆弾をパクリ！ すぐに復帰");
    else if(f.fever)setHint("good","フィーバー！ 食べ放題　"+Math.ceil(f.feverEnd-f.time)+"秒");
    else if(delta<=PERFECT_WINDOW && held && f.count)setHint("warn","いま離せ！　"+(Math.max(0,delta)).toFixed(2)+" 秒");
    else if(delta<=1.05)setHint("warn",held?"爆弾接近！　輪が縮んだら離す":"爆弾接近！　通り過ぎるまで待とう");
    else if(held)setHint("good",f.count?"吸いこみ中　"+f.count+" 個":"吸いこみ中…");
    else setHint("idle","長押しで星をキャッチ");
    if(!$("callout").hidden&&f.time>=callUntil)$("callout").hidden=true;
  }
  function handleEvents(){
    const events=flight.drain();
    for(const e of events){
      sound.event(e);
      if(e.type!=="end")scene.effect(e);
      if(e.type==="perfect"){
        call("ギリ飲み！ ×3","あと "+(e.ms/1000).toFixed(3)+" 秒　＋"+format(e.points)+" 点","perfect",1.08);
        announce("ギリ飲み。"+e.points+"点");if(navigator.vibrate)navigator.vibrate([22,26,38]);
      }else if(e.type==="bank"&&!e.auto){
        call("ごくん！","＋"+format(e.points)+" 点","bank",.68);
      }else if(e.type==="hit"){
        call("爆弾をパクリ！",e.lost?"口の中の "+format(e.lost)+" 点がはじけた":"次の星で取り返せ！","hit",.94);
        announce("爆弾。次の星で取り返せます");if(navigator.vibrate)navigator.vibrate(40);
      }else if(e.type==="fever"){
        call("フィーバー！","5秒間、爆弾も食べ放題！","fever",1.4);
        announce("フィーバー。5秒間、爆弾も食べられます");
      }else if(e.type==="end")finish();
    }
  }
  function sync(now){
    if(mode!=="play")return;
    flight.advance((now-origin)/1000);handleEvents();
    if(mode==="play"){
      if(prevFever&&!flight.fever)call("食べ放題おしまい","ここから赤い爆弾に注意！","bank",.8);
      prevFever=flight.fever;sound.tick(flight);
    }
  }
  function press(kind){
    if(mode==="paused"||document.querySelector("dialog[open]")||source!==null)return;
    sound.unlock();
    if(mode==="home"||mode==="end")newRun();
    const now=performance.now();
    if(mode==="ready"){origin=now-flight.time*1000;switchMode("play");}
    sync(now);
    if(mode!=="play")return;
    source=kind;flight.press();drawHUD();
  }
  function release(kind){
    if(source!==kind)return;
    source=null;
    if(mode!=="play")return;
    sync(performance.now());
    if(mode!=="play")return;
    flight.release();handleEvents();
    if(flight.time<.33 && flight.cursor===0){
      flight.time=0;switchMode("ready");
    }
    drawHUD();
  }
  function freeze(){
    if(mode!=="play"&&mode!=="ready")return false;
    sync(performance.now());if(mode==="end")return false;
    source=activePointer=null;flight.held=false;switchMode("paused");drawHUD();return true;
  }
  function resume(){
    if(mode==="paused"){switchMode("ready");drawHUD();}
  }
  function openPause(){
    if(document.querySelector("dialog[open]"))return;
    if(freeze())$("pauseDialog").showModal();
  }
  function endName(f){
    if(f.score===0)return "宇宙のお味見係";
    if(f.feverCount>=2||f.score>=34000)return "銀河まるのみ王";
    if(f.feverCount)return "爆弾のグルメ王";
    if(f.perfects>=1)return "ギリ飲みの達人";
    return f.score>=1800?"惑星の大食い名人":"星くずのつまみ食い";
  }
  function finish(){
    const f=flight;source=activePointer=null;
    switchMode("end");write($("rankName"),endName(f));
    write($("endCode"),"対戦コード　"+encodeChallenge(f.day,f.score));
    if(challenge){const difference=f.score-challenge.score;write($("rankName"),difference>0?"記録更新！ ＋"+format(difference)+"点":difference===0?"ぴったり同点！":"相手の記録まで "+format(-difference)+"点");}
    write($("endScore"),format(f.score));write($("endPerfect"),f.perfects+" 回");
    write($("endGap"),f.closest===null?"—":(f.closest/1000).toFixed(3)+" 秒");
    write($("endBite"),format(f.biggest)+" 点");
    if(f.score>best){best=f.score;store.set("best",best);showBest();}
    $("endScreen").querySelector(".result-en").textContent=f.score>previousBest?"NEW BEST!":"RESULT";
    drawHUD();announce("終了。"+format(f.score)+"点。"+endName(f));
    prepareCard(f);
  }
  function resultText(){
    const f=flight;
    const line=f.closest===null?"":" ／ 最接近 "+(f.closest/1000).toFixed(3)+"秒";
    return "ホシバク！ "+f.day+" の航路\n"+endName(f)+"　"+format(f.score)+"点\nギリ飲み "+f.perfects+"回"+line+"\n対戦コード "+encodeChallenge(f.day,f.score)+"\n#ホシバク";
  }
  function drawCard(f){
    const card=document.createElement("canvas");card.width=900;card.height=720;
    const c=card.getContext("2d");c.imageSmoothingEnabled=false;
    const g=c.createLinearGradient(0,0,900,720);g.addColorStop(0,"#181127");g.addColorStop(1,"#3b2451");c.fillStyle=g;c.fillRect(0,0,900,720);
    const r=randomGenerator(80834);
    for(let i=0;i<125;i++)sparkle(c,Math.floor(r()*900),Math.floor(r()*720),i%13?1:3,"#705779");
    c.strokeStyle="#9a76ac";c.lineWidth=3;c.strokeRect(20,20,860,680);
    c.fillStyle="#d1b2ef";c.font="24px OrbitPixel, monospace";c.fillText("ORBIT ARCADE",55,77);
    c.font="bold 22px sans-serif";c.fillStyle="#fff2fa";c.textAlign="right";c.fillText(f.day+" の航路",842,76);c.textAlign="left";
    c.fillStyle="#fff3f5";c.font="66px OrbitPixel, monospace";c.fillText("HOSHI",56,202);
    c.fillStyle="#d3ff63";c.fillText("BAKU!",56,268);
    const mascot=$("mascot");
    if(mascot.complete&&mascot.naturalWidth)c.drawImage(mascot,591,109,205,200);
    c.drawImage(graphic("planet"),500,176,66,66);c.drawImage(graphic("mine"),804,235,46,46);
    c.fillStyle="#efb1da";c.font="bold 30px sans-serif";c.fillText(endName(f),59,334);
    c.fillStyle="#d3ff63";c.font="77px OrbitPixel, monospace";const s=String(f.score);c.fillText(s,55,454);
    const extent=c.measureText(s).width;c.font="24px OrbitPixel, monospace";c.fillText("PT",65+extent,454);
    c.strokeStyle="#7e628c";c.lineWidth=2;c.setLineDash([6,6]);c.beginPath();c.moveTo(55,490);c.lineTo(845,490);c.stroke();c.setLineDash([]);
    const lines=[["ギリ飲み",f.perfects+" 回"],["最接近",f.closest===null?"—":(f.closest/1000).toFixed(3)+" 秒"],["最大のひと口",format(f.biggest)+" 点"]];
    lines.forEach(([a,b],i)=>{const x=58+i*267;c.fillStyle="#cebad6";c.font="bold 23px sans-serif";c.fillText(a,x,548);c.fillStyle="#fff3ee";c.font="bold 37px sans-serif";c.fillText(b,x,601);});
    c.fillStyle="#f0a6ce";c.font="bold 22px sans-serif";c.fillText("#ホシバク",56,664);
    c.textAlign="right";c.fillStyle="#b6a0c5";c.font="18px OrbitPixel, monospace";c.fillText(encodeChallenge(f.day,f.score),843,663);
    return card;
  }
  function prepareCard(f){
    const version=++cardVersion;cardBlob=null;
    if(cardUrl){URL.revokeObjectURL(cardUrl);cardUrl="";}
    drawCard(f).toBlob(blob=>{
      if(!blob||version!==cardVersion)return;
      cardBlob=blob;cardUrl=URL.createObjectURL(blob);
    },"image/png");
  }
  async function share(){
    const text=resultText();
    try{
      if(navigator.share){
        const options={title:"ホシバク！",text};
        if(cardBlob&&typeof File==="function"){
          const file=new File([cardBlob],"hoshibaku-"+flight.day+".png",{type:"image/png"});
          if(navigator.canShare?.({files:[file]}))options.files=[file];
        }
        await navigator.share(options);return;
      }
    }catch(e){if(e.name==="AbortError")return;}
    try{await navigator.clipboard.writeText(text);toast("結果をコピーしました");}
    catch{$("shareText").value=text;$("textDialog").showModal();$("shareText").select();}
  }

  $("audioBtn").addEventListener("click",()=>{sound.toggle();soundUI();});
  $("helpBtn").addEventListener("click",()=>{freeze();$("guide").showModal();});
  $("pauseBtn").addEventListener("click",openPause);
  $("resumeBtn").addEventListener("click",()=>$("pauseDialog").close());
  for(const id of ["pauseDialog","guide"])$(id).addEventListener("close",resume);
  document.querySelectorAll("[data-dismiss]").forEach(b=>b.addEventListener("click",()=>$(b.dataset.dismiss).close()));
  document.querySelectorAll("dialog").forEach(dialog=>dialog.addEventListener("click",e=>{
    if(e.target!==dialog)return;
    const r=dialog.getBoundingClientRect();
    if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();
  }));
  function pickRoute(next){
    challenge=next;flight=null;drawnCharge="";scene.clear();switchMode("home");
    showRoute(challenge?.day||dateInJapan());drawHUD();
    showAction("▶","長押しでスタート",false);
    write($("deckMain"),challenge?"対戦目標　"+format(challenge.score)+" 点":"ワンボタンで遊べる");
    write($("deckSub"),challenge?"目標 "+format(challenge.score)+" 点の航路に挑戦":"長押しで吸いこみ、離して飲みこむ");
    try{history.replaceState(null,"",location.pathname+location.search+(challenge?"#"+encodeChallenge(challenge.day,challenge.score):""));}catch{}
    $("routeDialog").close();toast(challenge?"対戦の航路をセットしました":"今日の航路に戻りました");
  }
  $("routeBtn").addEventListener("click",()=>{
    $("routeInput").value="";$("routeError").hidden=true;$("routeDialog").showModal();
  });
  $("routeForm").addEventListener("submit",e=>{
    e.preventDefault();const opponent=parseChallenge($("routeInput").value);
    if(opponent){pickRoute(opponent);return;}
    write($("routeError"),"HB- から始まる対戦コードを確認してください。");$("routeError").hidden=false;$("routeInput").focus();
  });
  $("dailyBtn").addEventListener("click",()=>pickRoute(null));
  $("shareBtn").addEventListener("click",share);
  $("cardBtn").addEventListener("click",()=>{
    const url=cardUrl||drawCard(flight).toDataURL("image/png");
    $("cardImage").src=url;$("downloadCard").href=url;
    $("downloadCard").download="hoshibaku-"+flight.day+"-"+flight.score+".png";$("cardDialog").showModal();
  });
  const down=e=>{
    if(e.button!==0||!e.isPrimary||source!==null)return;
    if(e.currentTarget===$("arena")&&(mode==="end"||e.target.closest("button,a")))return;
    e.preventDefault();const el=e.currentTarget;activePointer=e.pointerId;
    try{el.setPointerCapture(e.pointerId);}catch{}
    press("pointer");
  };
  [$("actionBtn"),$("arena")].forEach(el=>{
    el.addEventListener("pointerdown",down);
    el.addEventListener("contextmenu",e=>e.preventDefault());
    el.addEventListener("lostpointercapture",e=>{
      if(e.pointerId===activePointer&&source==="pointer")openPause();
    });
  });
  window.addEventListener("pointerup",e=>{if(e.pointerId===activePointer){activePointer=null;release("pointer");}});
  window.addEventListener("pointercancel",e=>{if(e.pointerId===activePointer)openPause();});
  function toggleAccessible(){if(source==="toggle")release("toggle");else press("toggle");}
  $("actionBtn").addEventListener("click",e=>{if(e.detail===0)toggleAccessible();});
  window.addEventListener("keydown",e=>{
    if(document.querySelector("dialog[open]")||e.metaKey||e.ctrlKey||e.altKey)return;
    if(e.key==="Escape"){if(mode==="play"||mode==="ready"){e.preventDefault();openPause();}return;}
    if(e.target.closest?.("button,a,input,textarea")&&e.target!==$("actionBtn"))return;
    if(e.code==="Space"||e.key===" "){
      e.preventDefault();if(!e.repeat)press("space");
    }else if(e.key==="Enter"){
      e.preventDefault();if(!e.repeat)toggleAccessible();
    }
  });
  window.addEventListener("keyup",e=>{if(e.code==="Space"||e.key===" "){if(source==="space")e.preventDefault();release("space");}});
  document.addEventListener("visibilitychange",()=>{if(document.hidden)openPause();});
  window.addEventListener("blur",openPause);

  function frame(ts){
    const dt=Math.max(0,Math.min(.05,(ts-lastPaint)/1000));lastPaint=ts;
    if(mode==="play"){sync(ts);drawHUD();}
    scene.draw(mode,flight,mode==="home"||mode==="end" ? ts/1000 : flight.time,mode==="paused"||mode==="ready"?0:dt);
    requestAnimationFrame(frame);
  }
  showRoute(challenge?.day||route);showBest();soundUI();drawHUD();
  if(challenge){write($("deckMain"),"対戦目標　"+format(challenge.score)+" 点");write($("deckSub"),"目標 "+format(challenge.score)+" 点の航路に挑戦");}
  requestAnimationFrame(frame);
})();
