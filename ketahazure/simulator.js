const STORAGE_KEY = 'ketahazure.balance.v1';
const VERSION = '2026-11-28 / 高解像度版 9';
const MAX_STAGE = 99;
const MAX_LEVEL = 99;
const MAX_SHOTS = 20;
const MAX_SEED = 0xffffffff;
const TRIALS = 30;
const TICK = 1 / 60;
const THROW_LIMIT = 120 / TICK;
const boardNames = ['A', 'B'];
const scoreNumbers = new Intl.NumberFormat('ja-JP', { maximumFractionDigits: 2 });

function scoreText(value) {
  return value < 1e9 ? scoreNumbers.format(value) : value.toExponential(5);
}

function boundedInt(value, fallback, min, max) {
  if (value == null || value === '' || !Number.isFinite(Number(value))) return fallback;
  return Math.min(max, Math.max(min, Math.round(Number(value))));
}

// 各試行で独立した乱数列を作る。描画や実時間には依存しない。
function seededRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let n = Math.imul(state ^ (state >>> 15), state | 1);
    n ^= n + Math.imul(n ^ (n >>> 7), n | 61);
    return ((n ^ (n >>> 14)) >>> 0) / 4294967296;
  };
}

const markup = `
<header class="lab-header">
  <div class="lab-brand">
    <span class="lab-emblem" aria-hidden="true">桁</span>
    <div><p>桁外れ ・ ${VERSION}</p><h1>開発者用シミュレーター</h1></div>
  </div>
  <a class="game-link" href="./">ゲーム本編 <span aria-hidden="true">↗</span></a>
</header>
<main class="lab-grid">
  <section class="lab-card editor" aria-labelledby="editor-title">
    <h2 id="editor-title">盤面編成</h2>
    <div class="switcher" role="group" aria-label="編集する盤面">
      <button type="button" data-board="0" data-lock aria-pressed="true">盤面 A</button>
      <button type="button" data-board="1" data-lock aria-pressed="false">盤面 B</button>
    </div>
    <p class="hint">種類と Lv を選び、盤面の釘をタップして配置します。</p>
    <div class="palette" role="group" aria-label="ちょうちんの種類"></div>
    <label class="level-control" for="peg-level"><span>配置する Lv</span><input id="peg-level" type="number" inputmode="numeric" min="1" max="${MAX_LEVEL}" value="1" data-lock></label>
    <p class="effect" id="peg-effect"></p>
    <div class="edit-actions">
      <button id="fill-board" class="outline fill-board" type="button" data-lock>全部このちょうちんにする</button>
      <button id="undo" type="button" data-lock>元に戻す</button>
      <button id="copy-board" type="button" data-lock></button>
      <button id="empty-board" type="button" data-lock>釘だけにする</button>
      <button id="starter-board" type="button" data-lock>本編の初期配置</button>
    </div>
    <p class="edit-note" id="edit-note" role="status"></p>
  </section>

  <section class="lab-card board-card" aria-labelledby="board-title">
    <div class="section-title">
      <h2 id="board-title">盤面 A</h2><span class="board-count" id="board-count"></span>
    </div>
    <div class="launch-controls">
      <label for="drop-position">落下位置 <output id="drop-position-label" for="drop-position"></output></label>
      <button id="suggest-position" type="button" data-lock>おすすめ位置</button>
      <input id="drop-position" type="range" step="1" data-lock>
    </div>
    <div id="festival-panel" class="festival-panel" data-active="false"><div class="festival-line"><strong id="festival-state">祭ゲージ</strong><output id="festival-gauge">0 / 100</output></div><progress id="festival-progress" max="100" value="0" aria-label="祭ゲージ"></progress><div id="festival-detail" class="festival-detail">通常の命中で +1、祭ちょうちんで追加加算</div><button id="prime-festival" type="button" data-lock>検証用：ゲージを満タン直前にする</button></div>
    <div class="board-plate" id="board-plate">
      <div class="drop-track" aria-hidden="true"></div>
      <div class="aim-marker" aria-hidden="true"></div>
      <div class="pins" role="group" aria-label="盤面の釘"></div><div id="festival-banner" class="festival-banner" hidden>お祭りだ！</div>
    </div>
    <div class="play-actions">
      <button id="drop-one" class="primary" type="button">1玉落とす</button>
      <button id="drop-all" type="button">全玉を試す</button>
      <button id="extra-drop" type="button" disabled>投下中に追加投下</button>
      <button id="next-stage" type="button" disabled>札を獲得して次へ</button>
    </div>
    <section class="infinite-panel"><div class="festival-line"><strong>無限投下モード</strong><output id="infinite-count">0 投</output></div><div class="infinite-actions"><label for="infinite-interval">投下間隔<select id="infinite-interval"><option value="0.5">0.5秒</option><option value="1" selected>1秒</option><option value="2">2秒</option><option value="3">3秒</option></select></label><button id="infinite-toggle" type="button" class="primary">▶ 無限投下開始</button></div><p id="infinite-status" class="hint">持ち玉を消費せず、同じステージで連続投下します。</p></section>
    <section id="reward-panel" class="reward-panel" hidden><h2 id="reward-title">札を選ぶ</h2><p id="reward-detail"></p><div id="reward-offers"></div><div class="reward-actions"><button id="reward-reroll" type="button">選び直し</button><button id="reward-auto" type="button">おまかせ配置</button></div></section>
    <div class="play-options">
      <label for="speed">再生速度</label>
      <select id="speed">
        <option value="1">×1</option><option value="2" selected>×2</option><option value="4">×4</option><option value="8">×8</option>
      </select>
      <button id="reset-trial" type="button">初期配置に戻す</button>
    </div>
  </section>

  <div class="report">
    <section class="lab-card results" aria-labelledby="results-title">
      <div class="section-title"><h2 id="results-title">試行結果</h2><span id="trial-status" class="trial-status" role="status"></span></div>
      <dl class="score-block">
        <div><dt>得点（ステージ <span id="live-stage">1</span>）</dt><dd id="score">0</dd></div>
        <div><dt>ノルマ</dt><dd id="quota"></dd></div>
      </dl>
      <progress id="quota-progress" max="1" value="0" aria-label="ノルマ達成率"></progress>
      <dl class="stat-grid">
        <div><dt>1投目の合計</dt><dd id="first-score">0</dd></div>
        <div><dt>一発突破</dt><dd id="one-shot">—</dd></div>
        <div><dt>残りの持ち玉</dt><dd id="remaining-shots"></dd></div>
        <div><dt>札の枚数</dt><dd id="reward">—</dd></div>
        <div><dt>当たり・連動</dt><dd id="hits">0</dd></div>
        <div><dt>祭りの発生</dt><dd id="fevers">0</dd></div>
        <div><dt>選び直し券</dt><dd id="rerolls">0</dd></div>
        <div><dt>獲得した札</dt><dd id="picked-count">0</dd></div>
      </dl>
    </section>
    <section class="lab-card conditions" aria-labelledby="conditions-title">
      <h2 id="conditions-title">試行条件</h2>
      <div class="condition-grid">
        <label for="board-shape">盤面の形<select id="board-shape" data-lock></select></label>
        <label for="difficulty">難易度<select id="difficulty" data-lock></select></label>
        <label for="stage">ステージ<input id="stage" type="number" inputmode="numeric" min="1" max="${MAX_STAGE}" data-lock></label>
        <label for="shots">持ち玉<input id="shots" type="number" inputmode="numeric" min="1" max="${MAX_SHOTS}" data-lock></label>
        <label for="seed">乱数シード<input id="seed" type="number" inputmode="numeric" min="0" max="${MAX_SEED}" data-lock></label>
      </div>
      <label class="hint"><input id="auto-shots" type="checkbox" data-lock> 本編と同じ持ち玉数（難易度・お守り反映）</label>
      <p class="hint">全玉試行は落ち切ってから次を投入。追加投下は本編と同じクールダウンで可能。設定・配置の編集や初期化は初期条件に戻ります。札を獲得して進むと育ち・お守り・配置を引き継ぎます。A/B比較は初期条件からの独立試行です。</p>
      <p id="live-relics" class="hint"></p><details><summary>初期のお守りの所持枚数を設定</summary><div id="relics" class="condition-grid"></div></details>
    </section>
    <section class="lab-card"><h2>育ちちょうちん・実測倍率</h2><p class="hint">現在の倍率を表示（次に直接命中した時の基本倍率）。</p><p id="grow-summary" role="status"></p><div id="grow-list" class="grow-list"></div><button id="regression" type="button" data-lock>本編処理の自己診断</button><p id="regression-result" role="status"></p></section>
    <section class="lab-card compare" aria-labelledby="compare-title">
      <h2 id="compare-title">盤面 A/B の比較</h2>
      <p class="hint">同じ条件で各盤面を ${TRIALS} 回ずつ試します。すべての玉を現在の落下位置から投入します。</p>
      <div class="compare-actions">
        <button id="compare" class="outline" type="button">A / B を比較</button>
        <button id="cancel-comparison" type="button" hidden>中止</button>
      </div>
      <div id="compare-progress" hidden>
        <progress id="batch-progress" max="${TRIALS * 2}" value="0" aria-label="比較の進捗"></progress>
        <p class="hint" id="progress-label"></p>
      </div>
      <div id="comparison" hidden>
        <table aria-label="盤面ごとの比較結果">
          <thead><tr><th scope="col">指標</th><th scope="col">盤面 A</th><th scope="col">盤面 B</th></tr></thead>
          <tbody id="comparison-rows"></tbody>
        </table>
      </div>
      <p class="compare-note" id="compare-note" role="status"></p>
    </section>
  </div>
</main>
`;

export async function mountSimulator(engine) {
  const { G, PT, BAL, canvas, width, top, height, launchY, minX, maxX } = engine;
  const style = document.createElement('link');
  style.rel = 'stylesheet';
  style.href = new URL('./simulator.css', import.meta.url);
  await new Promise((resolve, reject) => {
    style.onload = resolve;
    style.onerror = () => reject(new Error('simulator.css failed to load'));
    document.head.append(style);
  });
  document.title = '桁外れ｜開発者用シミュレーター';
  document.body.classList.add('balance-mode');
  document.body.innerHTML = markup;

  const byId = id => document.getElementById(id);
  const plate = byId('board-plate'), palette = document.querySelector('.palette');
  const range = byId('drop-position'), level = byId('peg-level');
  const fillBoard = byId('fill-board');
  const dropOne = byId('drop-one'), dropAll = byId('drop-all'), reset = byId('reset-trial');
  const compare = byId('compare'), cancel = byId('cancel-comparison');
  plate.style.aspectRatio = width + ' / ' + height;
  plate.style.setProperty('--launch-y', (launchY - top) / height * 100 + '%');
  canvas.removeAttribute('tabindex');
  canvas.setAttribute('aria-hidden', 'true');
  canvas.removeAttribute('aria-label');
  // 本編 resize() のインライン寸法をテスト盤面に持ち込まない。
  Object.assign(canvas.style, { position: 'absolute', inset: '0', width: '100%', height: '100%', maxWidth: 'none', maxHeight: 'none', display: 'block' });
  plate.style.height = 'auto';
  plate.prepend(canvas);
  range.min = minX;
  range.max = maxX;

  engine.buildBoard();
  const slots = G.pegs.map(({ r, c, x, y }) => ({ r, c, x, y }));
  function starterLayout() {
    engine.buildBoard();
    engine.withRandom(seededRandom(24680), engine.starterBoard);
    return G.pegs.map(p => p.type === 'n' ? null : { type: p.type, lv: p.lv });
  }

  let initial = starterLayout();
  const defaults = { boards: [initial, initial.slice()], active: 0, stage: 1, shots: BAL.balls, x: width / 2, seed: 12345 };
  let stored = {};
  try { stored = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; } catch (_) { /* 保存できない環境でも使える */ }
  function readBoard(board, fallback) {
    if (!Array.isArray(board) || board.length !== slots.length) return fallback;
    return board.map(p => p && p.type !== 'n' && Object.hasOwn(PT, p.type)
      ? { type: p.type, lv: boundedInt(p.lv, 1, 1, MAX_LEVEL) }
      : null);
  }
  const setup = {
    ...defaults,
    active: stored.active === 1 ? 1 : 0,
    shape: engine.boards.some(b => b.id === stored.shape) ? stored.shape : 'classic',
    difficulty: engine.difficulties.some(d => d.id === stored.difficulty) ? stored.difficulty : 'normal',
    autoShots: stored.autoShots !== false,
    relics: Object.fromEntries(engine.relics.map(c => [c.id,boundedInt(stored.relics?.[c.id],0,0,c.max)])),
    boards: defaults.boards.map((board, i) => readBoard(stored.boards?.[i], board)),
    stage: boundedInt(stored.stage, defaults.stage, 1, MAX_STAGE),
    shots: boundedInt(stored.shots, defaults.shots, 1, MAX_SHOTS),
    x: boundedInt(stored.x, defaults.x, minX, maxX),
    seed: boundedInt(stored.seed, defaults.seed, 0, MAX_SEED)
  };
  engine.setBoard(setup.shape);
  engine.setDifficulty(setup.difficulty);
  initial = starterLayout();
  slots.splice(0, slots.length, ...G.pegs.map(({r,c,x,y}) => ({r,c,x,y})));
  const histories = [[], []];
  let brush = 'x', brushLevel = 1, lastPeg = -1;
  let trial, playback, batch, frameId = 0;
  const pins = [];
  const lockable = [...document.querySelectorAll('[data-lock]')];
  const extraDrop=byId('extra-drop'), nextStage=byId('next-stage'), autoShots=byId('auto-shots');
  const infiniteToggle=byId('infinite-toggle'), infiniteInterval=byId('infinite-interval');
  autoShots.checked=setup.autoShots;
  for(const c of engine.relics){const label=document.createElement('label');label.textContent=c.name;label.title=c.desc;const input=document.createElement('input');input.type='number';input.min=0;input.max=c.max;input.value=setup.relics[c.id];input.inputMode='numeric';label.append(input);byId('relics').append(label);lockable.push(input);input.addEventListener('change',()=>{setup.relics[c.id]=boundedInt(input.value,0,0,c.max);input.value=setup.relics[c.id];invalidateComparison();readyTrial();saveSetup();});}
  autoShots.addEventListener('change',()=>{setup.autoShots=autoShots.checked;invalidateComparison();readyTrial();saveSetup();});

  function saveSetup() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(setup)); } catch (_) { /* 保存できない環境でも使える */ }
  }

  function invalidateComparison() {
    byId('comparison').hidden = true;
    byId('compare-note').textContent = '';
  }

  function setStatus(text, tone = '') {
    const status = byId('trial-status');
    status.textContent = text;
    status.dataset.tone = tone;
  }

  function display(id, value) {
    const field = byId(id);
    if (field.textContent !== value) field.textContent = value;
  }

  function renderMetrics() {
    const { oneShot, jump, cards } = engine.clearReward();
    display('live-stage',String(G.stage));display('rerolls',String(G.rerolls));display('picked-count',String(G.picks.length));display('live-relics','現在のお守り：'+(engine.relics.filter(c=>G.rel[c.id]).map(c=>c.name+'×'+G.rel[c.id]).join('、')||'なし'));
    display('score', engine.fmtMagnitude(G.score,G.scoreLog));
    display('quota', engine.fmtQ(G.quota));
    display('first-score', engine.fmtMagnitude(G.firstShotScore,G.firstShotScoreLog));
    const firstShot = trial.firstSettled ? '未達' : playback ? '計測中' : '—';
    display('one-shot', oneShot ? '達成' : firstShot);
    byId('score').title = scoreText(G.score);
    byId('first-score').title = scoreText(G.firstShotScore);
    display('reward', G.cleared ? cards + '枚' + (jump ? '・飛び級' : '') : '—');
    display('remaining-shots', playback?.infinite ? '∞（残 '+G.ballsLeft+'）' : G.ballsLeft + ' / ' + G.ballsMax);
    display('infinite-count',(trial.infiniteCount||0).toLocaleString('ja-JP')+' 投');
    if(playback?.infinite)display('infinite-status',playback.stopping?'追加投下停止・残った玉を処理中':'連続投下中・盤面上 '+G.balls.length+' 玉');
    display('hits', G.stats.hits.toLocaleString('ja-JP') + ' 回');
    display('fevers', G.stats.fevers + ' 回');
    const f=G.fever;const active=Boolean(f.on);const meter=byId('festival-progress');meter.max=f.need;meter.value=f.gauge;
    byId('festival-panel').dataset.active=String(active);plate.dataset.festival=String(active);byId('festival-banner').hidden=!active;
    display('festival-state',active?'お祭りだ！':'祭ゲージ');display('festival-gauge',Math.round(f.gauge)+' / '+f.need);
    display('festival-detail',active?'追加玉 '+f.count+' / '+f.total+' ・落下中 '+G.balls.filter(b=>b.fever).length+' 個':'次回の祭り：'+(BAL.feverBalls+6*(G.rel.omatsuri||0))+'玉 ・発生 '+G.stats.fevers+' 回');
    byId('prime-festival').disabled=Boolean(batch||playback||active||G.balls.length||G.ballsLeft===0||G.phase!=='play');
    const bar = byId('quota-progress');
    const progress = Math.min(1, G.score / G.quota);
    if (bar.value !== progress) bar.value = progress;
    const grown=G.pegs.filter(p=>p.type==='g');
    const max=grown.length?Math.max(...grown.map(engine.growMultiplier)):0;
    display('grow-summary',grown.length?'育ち '+grown.length+'本 / 最大 ×'+max.toFixed(2):'育ちちょうちん未配置');
    const list=byId('grow-list');
    const values=grown.map(p=>`${p.r+1}段 ${p.c+1}列　Lv${p.lv}　×${engine.growMultiplier(p).toFixed(2)}（+${p.grow.toFixed(2)}）`).join('\n');
    if(list.textContent!==values)list.textContent=values;
    extraDrop.disabled=!playback||playback.all||playback.infinite||G.ballsLeft===0||G.dropCd>0;
  }

  function renderBoard() {
    const density = Math.min(window.devicePixelRatio || 1, 3);
    const w = Math.round(plate.clientWidth * density), h = Math.round(plate.clientHeight * density);
    if (!w || !h) return;
    engine.resizeCanvas(w, h);
    if (trial) engine.withRandom(trial.random,()=>engine.drawBoard()); else engine.drawBoard();
    G.pegs.forEach((p,i)=>{if(!pins[i])return;const label=p.type==='g'?`現在 ×${engine.growMultiplier(p).toFixed(2)}・Lv${p.lv}`:'';pins[i].dataset.growth=label;pins[i].title=label||pins[i].getAttribute('aria-label');});
  }

  function setAim(x) {
    if (setup.x === x) return;
    setup.x = x;
    refreshAim();
    invalidateComparison();
    saveSetup();
  }

  function refreshAim() {
    range.value = setup.x;
    const position = Math.round(setup.x / width * 100);
    display('drop-position-label', position + '%');
    range.setAttribute('aria-valuetext', '左端から ' + position + '%');
    plate.style.setProperty('--aim-x', setup.x / width * 100 + '%');
  }

  function newTrial(board, seed) {
    engine.resetEffects();
    engine.buildBoard();
    board.forEach((lantern, i) => {
      if (!lantern) return;
      engine.setPeg(G.pegs[i], lantern.type, lantern.lv);
      G.pegs[i].flash = 0;
    });
    Object.assign(G, {
      t: 0, nextStage: 0, unitIdx: 0, reachedStage: null, runBest: 0, runBestLog: -Infinity, ended:false, picks:[], picksLeft:0, rerolls:engine.initialRerolls(), relOrder:[], rel: Object.fromEntries(Object.entries(setup.relics).filter(([,n])=>n>0)), pockets: [],
      balls: [], spawn: [], aim: { x: setup.x, on: false, snap: false },
      stats: { bestHit: 0, bestHitLog: -Infinity, hits: 0, fevers: 0 },
      fever: { gauge: 0, need: BAL.feverNeed, on: false, count: 0, total: 0, spawnT: 0, inStage: 0, firstShot: true }
    });
    const random=seededRandom(seed);
    engine.withRandom(random,()=>engine.startStage(setup.stage));
    if(!setup.autoShots)G.ballsLeft=G.ballsMax=setup.shots;
    return {random,ticks:0,timedOut:false,firstSettled:false};
  }

  function readyTrial() {
    playback = null;
    display('infinite-status','持ち玉を消費せず、同じステージで連続投下します。');
    trial = newTrial(setup.boards[setup.active], setup.seed);
    renderMetrics();
    renderBoard();
    renderEditor();
    renderReward();
    setStatus('待機中');
    updateControls();
  }

  function updateControls() {
    const busy = Boolean(playback || batch);
    const rewarding=G.phase==='reward'||G.phase==='place';
    for (const control of lockable) control.disabled = busy||rewarding;
    if(playback?.infinite&&!playback.stopping){range.disabled=false;byId('suggest-position').disabled=false;}
    infiniteToggle.disabled=Boolean(batch||rewarding||(!playback?.infinite&&(busy||G.phase!=='play'||G.ballsLeft===0||trial.timedOut))||playback?.stopping);
    infiniteToggle.textContent=playback?.infinite?(playback.stopping?'停止処理中…':'■ 無限投下停止'):'▶ 無限投下開始';
    level.disabled = fillBoard.disabled = busy || rewarding || brush === 'n';
    byId('undo').disabled = busy || rewarding || histories[setup.active].length === 0;
    plate.dataset.busy = String(busy&&!playback?.infinite);
    for (const pin of pins) pin.setAttribute('aria-disabled', String(busy||G.phase==='reward'));
    dropOne.disabled = dropAll.disabled = busy || G.phase!=='play' || G.ballsLeft === 0 || trial.timedOut;
    dropAll.textContent = G.ballsLeft >= G.ballsMax ? '全玉を試す' : '残りの玉を試す';
    reset.disabled = Boolean(batch);
    byId('shots').disabled=busy||rewarding||setup.autoShots;
    nextStage.disabled=busy||rewarding||!G.cleared||trial.timedOut||G.stage>=MAX_STAGE;
    extraDrop.disabled=!playback||playback.all||playback.infinite||G.ballsLeft===0||G.dropCd>0;
    compare.disabled = busy||rewarding;
    cancel.hidden = !batch;
    byId('compare-progress').hidden = !batch;
  }

  function renderEditor() {
    const board = G.pegs, activeName = boardNames[setup.active];
    for (const button of document.querySelectorAll('[data-board]')) {
      button.setAttribute('aria-pressed', String(Number(button.dataset.board) === setup.active));
    }
    byId('board-title').textContent = '盤面 ' + activeName;
    byId('board-count').textContent = 'ちょうちん ' + board.filter(p=>p.type!=='n').length + ' / ' + slots.length;
    byId('copy-board').textContent = '盤面 ' + boardNames[1 - setup.active] + ' に複製';
    pins.forEach((pin, i) => {
      const p = slots[i], lantern = board[i];
      const item = lantern && lantern.type!=='n' ? PT[lantern.type].name + ' Lv' + lantern.lv : '釘';
      pin.setAttribute('aria-label', (p.r + 1) + '段目 ' + (p.c + 1) + '列目 ' + item);
      pin.title = pin.getAttribute('aria-label');
      pin.classList.toggle('last-peg', i === lastPeg);
    });
  }

  function updateBrush() {
    for (const button of palette.children) button.setAttribute('aria-pressed', String(button.dataset.type === brush));
    level.disabled = fillBoard.disabled = brush === 'n';
    byId('peg-effect').textContent = brush === 'n' ? 'タップした場所を通常の釘に戻します。' : engine.pegDesc(brush, brushLevel);
  }

  function replaceBoard(board, note, target = setup.active, editedIndex = -1) {
    const history = histories[target];
    history.push(setup.boards[target]);
    if (history.length > 40) history.shift();
    setup.boards[target] = board;
    setup.active = target;
    lastPeg = editedIndex;
    refreshAfterEdit(note);
  }

  function refreshAfterEdit(note) {
    display('edit-note', note);
    invalidateComparison();
    renderEditor();
    readyTrial();
    saveSetup();
  }

  function editPeg(i) {
    if (batch || playback) return;
    if(G.phase==='place'){const before=G.stage;engine.withRandom(trial.random,()=>engine.rewardActions.placeAt(G.pegs[i]));afterRewardAction(before);return;}
    if(G.phase==='reward')return;
    const board = setup.boards[setup.active].slice();
    const p = slots[i], placed = brush === 'n' ? null : { type: brush, lv: brushLevel };
    if (board[i]?.type === placed?.type && board[i]?.lv === placed?.lv) return;
    board[i] = placed;
    const name = placed ? PT[placed.type].name + ' Lv' + placed.lv : '釘';
    replaceBoard(board, (p.r + 1) + '段目 ' + (p.c + 1) + '列目を「' + name + '」に変更。', setup.active, i);
  }

  for (const type of [...Object.keys(PT).filter(key => key !== 'n'), 'n']) {
    const info = PT[type];
    const button = document.createElement('button');
    const glyph = document.createElement('span');
    glyph.className = 'palette-glyph';
    glyph.style.setProperty('--peg', info.col);
    glyph.style.setProperty('--peg-ink', info.ink);
    glyph.setAttribute('aria-hidden', 'true');
    glyph.textContent = info.glyph || '・';
    button.type = 'button';
    button.dataset.type = type;
    button.setAttribute('aria-label', type === 'n' ? '釘に戻す' : info.name);
    button.append(glyph, type === 'n' ? '釘に戻す' : info.name.replace('ちょうちん', ''));
    button.addEventListener('click', () => { brush = type; updateBrush(); });
    palette.append(button);
    lockable.push(button);
  }

  const pinLayer = plate.querySelector('.pins');
  slots.forEach((p, i) => {
    const pin = document.createElement('button');
    pin.type = 'button';
    pin.className = 'pin';
    pin.style.left = p.x / width * 100 + '%';
    pin.style.top = (p.y - top) / height * 100 + '%';
    pin.addEventListener('click', () => editPeg(i));
    pinLayer.append(pin);
    pins.push(pin);
  });

  for (const button of document.querySelectorAll('[data-board]')) {
    button.addEventListener('click', () => {
      const active = Number(button.dataset.board);
      if (setup.active === active) return;
      setup.active = active;
      lastPeg = -1;
      display('edit-note', '');
      renderEditor();
      readyTrial();
      saveSetup();
    });
  }
  level.addEventListener('input', () => {
    brushLevel = boundedInt(level.value, brushLevel, 1, MAX_LEVEL);
    updateBrush();
  });
  level.addEventListener('change', () => { level.value = brushLevel; });
  fillBoard.addEventListener('click', () => {
    const board = setup.boards[setup.active];
    if (board.every(peg => peg?.type === brush && peg.lv === brushLevel)) return;
    const name = PT[brush].name + ' Lv' + brushLevel;
    replaceBoard(slots.map(() => ({ type: brush, lv: brushLevel })),
      '盤面 ' + boardNames[setup.active] + ' を「' + name + '」で埋めました。');
  });
  byId('undo').addEventListener('click', () => {
    setup.boards[setup.active] = histories[setup.active].pop();
    lastPeg = -1;
    refreshAfterEdit('ひとつ前の配置に戻しました。');
  });
  byId('copy-board').addEventListener('click', () => {
    const target = 1 - setup.active;
    replaceBoard(setup.boards[setup.active].slice(), '盤面 ' + boardNames[target] + ' に複製しました。', target);
  });
  byId('starter-board').addEventListener('click', () => replaceBoard(initial.slice(), '本編の初期配置に切り替えました。'));
  byId('empty-board').addEventListener('click', () => replaceBoard(slots.map(() => null), 'ちょうちんをすべて釘に戻しました。'));
  range.addEventListener('input', () => setAim(range.valueAsNumber));
  byId('suggest-position').addEventListener('click', () => setAim(boundedInt(engine.dropSpot().x, setup.x, minX, maxX)));
  const track = plate.querySelector('.drop-track');
  function seek(event) {
    const rect = plate.getBoundingClientRect();
    const x = (event.clientX - rect.left - plate.clientLeft) / plate.clientWidth * width;
    setAim(boundedInt(x, setup.x, minX, maxX));
  }
  track.addEventListener('pointerdown', event => {
    if (batch || (playback && (!playback.infinite||playback.stopping)) || !event.isPrimary || event.button !== 0) return;
    track.setPointerCapture(event.pointerId);
    seek(event);
  });
  track.addEventListener('pointermove', event => {
    if (track.hasPointerCapture(event.pointerId) && !batch && (!playback||playback.infinite&&!playback.stopping)) seek(event);
  });

  const shapeSelect = byId('board-shape'), difficultySelect = byId('difficulty');
  for (const b of engine.boards) shapeSelect.add(new Option(b.name, b.id));
  for (const d of engine.difficulties) difficultySelect.add(new Option(d.label,d.id));
  shapeSelect.value = setup.shape; difficultySelect.value = setup.difficulty;
  shapeSelect.addEventListener('change', () => {
    setup.shape = shapeSelect.value; engine.setBoard(setup.shape);
    initial = starterLayout();
    slots.splice(0, slots.length, ...G.pegs.map(({r,c,x,y}) => ({r,c,x,y})));
    pins.forEach((pin,i) => { pin.style.left = slots[i].x / width * 100 + '%'; pin.style.top = (slots[i].y-top)/height*100 + '%'; });
    invalidateComparison(); readyTrial(); renderEditor(); saveSetup();
  });
  difficultySelect.addEventListener('change', () => {
    setup.difficulty = difficultySelect.value; engine.setDifficulty(setup.difficulty);
    invalidateComparison(); readyTrial(); updateBrush(); saveSetup();
  });
  for (const [key, min, max] of [['stage', 1, MAX_STAGE], ['shots', 1, MAX_SHOTS], ['seed', 0, MAX_SEED]]) {
    const input = byId(key);
    input.value = setup[key];
    input.addEventListener('change', () => {
      const value = boundedInt(input.value, setup[key], min, max);
      input.value = value;
      if (value === setup[key]) return;
      setup[key] = value;
      invalidateComparison();
      readyTrial();
      saveSetup();
    });
  }

  const step = () => engine.update(TICK);
  function throwBall(run) {
    run.ticks = 0;
    G.dropCd = 0;
    engine.withRandom(run.random, () => engine.dropBall(setup.x));
  }

  function advance(run, dt = TICK) {
    engine.withRandom(run.random, () => { engine.frameStep(dt,1); engine.drawBoard(); });
    if (!G.balls.length && !G.spawn.length && !G.fever.on) return true;
    if ((run.ticks += dt / TICK) < THROW_LIMIT) return false;
    run.timedOut = true;
    return true;
  }

  function scheduleFrame() {
    if (!frameId) frameId = requestAnimationFrame(frame);
  }

  function startPlayback(all) {
    engine.initAudio();
    playback = { all, last: performance.now(), carry: 0 };
    throwBall(trial);
    setStatus('投下中', 'busy');
    updateControls();
    scheduleFrame();
  }

  function showTrialStatus() {
    if(G.phase==='reward')setStatus('札を選択','pass');
    else if(G.phase==='place')setStatus('ちょうちんを配置','pass');
    else if (trial.timedOut) setStatus('時間上限', 'warn');
    else if (G.cleared) setStatus('ノルマ達成', 'pass');
    else if (!G.ballsLeft) setStatus('ノルマ未達', 'warn');
    else if (G.ballsLeft === G.ballsMax) setStatus('待機中');
    else setStatus('次の投下を待機');
  }

  function playFrame(now) {
    if(playback.infinite){infiniteFrame(now);return;}
    const speed = Number(byId('speed').value);
    const rdt = Math.min(0.05, Math.max(0.001, (now - playback.last) / 1000 || 0.016));
    playback.last = now;
    do {
      engine.withRandom(trial.random,()=>engine.frameStep(rdt,speed));
      trial.ticks += rdt * speed / TICK;
      const settled=(!G.balls.length&&!G.spawn.length&&!G.fever.on)||(trial.ticks>=THROW_LIMIT&&(trial.timedOut=true));
      if(!settled)break;
      if (!trial.timedOut) trial.firstSettled = true;
      if (playback.all && G.ballsLeft > 0 && !trial.timedOut) {
        throwBall(trial);
        continue;
      }
      playback = null;
      if(G.cleared&&G.ballsLeft===0&&!trial.timedOut&&G.stage<MAX_STAGE)openCards();
      showTrialStatus();
      updateControls();
      break;
    } while(false);
    renderBoard();
    renderMetrics();
  }

  function infiniteFrame(now){
    const p=playback;const speed=Number(byId('speed').value);
    const rdt=Math.min(0.05,Math.max(0.001,(now-p.last)/1000||0.016)),dt=rdt*speed;p.last=now;
    do {
      if(!p.stopping){p.untilDrop-=dt;if(p.untilDrop<=0&&engine.withRandom(trial.random,()=>engine.dropUnlimited(setup.x))){trial.infiniteCount=(trial.infiniteCount||0)+1;p.untilDrop=Number(infiniteInterval.value);}}
      engine.withRandom(trial.random,()=>engine.frameStep(rdt,speed));
      if(p.stopping){p.drain+=dt;if(!G.balls.length&&!G.spawn.length&&!G.fever.on||p.drain>=120){playback=null;if(G.balls.length||G.spawn.length||G.fever.on){trial.timedOut=true;display('infinite-status','停止：残玉の処理が時間上限に到達。初期化してください。');}else{display('infinite-status','停止済み：得点・育ち・祭ゲージを保持');}showTrialStatus();updateControls();break;}}
    } while(false);
    renderBoard();renderMetrics();
  }
  infiniteToggle.addEventListener('click',()=>{
    if(playback?.infinite){playback.stopping=true;playback.drain=0;setStatus('停止処理中','busy');updateControls();return;}
    if(batch||playback||G.phase!=='play'||G.ballsLeft===0||trial.timedOut)return;
    engine.initAudio();
    playback={infinite:true,last:performance.now(),carry:0,untilDrop:0,stopping:false,drain:0};invalidateComparison();setStatus('無限投下中','busy');updateControls();scheduleFrame();
  });

  function startComparison() {
    batch = { total: 0, run: null, completed: [[], []], preview: { ...G } };
    byId('batch-progress').value = 0;
    display('progress-label', '0 / ' + TRIALS * 2 + ' 試行');
    invalidateComparison();
    setStatus('比較中', 'busy');
    updateControls();
    scheduleFrame();
  }

  function stopComparison() {
    restorePreview();
    display('compare-note', '比較を中止しました。');
  }

  function restorePreview() {
    Object.assign(G, batch.preview);
    batch = null;
    showTrialStatus();
    updateControls();
    renderBoard();
    renderMetrics();
  }

  function comparisonFrame() {
    const deadline = performance.now() + 10;
    do {
      const side = batch.total % 2;
      if (!batch.run) {
        const seed = (setup.seed + Math.floor(batch.total / 2)) >>> 0;
        batch.run = newTrial(setup.boards[side], seed);
        throwBall(batch.run);
      }
      if (!advance(batch.run)) continue;
      if (G.ballsLeft > 0 && !batch.run.timedOut) { throwBall(batch.run); continue; }
      if (!batch.run.timedOut) {
        batch.completed[side].push({ score: G.score, clear: G.cleared, oneShot: engine.clearReward().oneShot });
      }
      batch.total++;
      batch.run = null;
      if (batch.total === TRIALS * 2) {
        const completed = batch.completed;
        restorePreview();
        showComparison(completed);
        return;
      }
    } while (performance.now() < deadline);
    byId('batch-progress').value = batch.total;
    display('progress-label', batch.total + ' / ' + TRIALS * 2 + ' 試行');
  }

  function showComparison(completed) {
    const summary = completed.map(runs => {
      const scores = runs.map(row => row.score).sort((a, b) => a - b);
      const mid = Math.floor(scores.length / 2);
      const median = scores.length % 2 ? scores[mid] : (scores[mid - 1] + scores[mid]) / 2;
      const rate = key => Math.round(runs.filter(row => row[key]).length / runs.length * 100) + '%';
      const values = runs.length
        ? [rate('clear'), rate('oneShot'), ...[median, scores[0], scores.at(-1)].map(scoreText)]
        : ['—', '—', '—', '—', '—'];
      return [runs.length + ' / ' + TRIALS, ...values];
    });
    const labels = ['完了した試行', 'クリア率', '一発突破率', '得点中央値', '最低点', '最高点'];
    const rows = labels.map((label, i) => {
      const row = document.createElement('tr');
      const heading = document.createElement('th');
      heading.scope = 'row';
      heading.textContent = label;
      row.append(heading);
      for (const values of summary) row.insertCell().textContent = values[i];
      return row;
    });
    byId('comparison-rows').replaceChildren(...rows);
    byId('comparison').hidden = false;
    display('compare-note', completed.some(runs => runs.length < TRIALS)
      ? '時間上限に達した試行を除いて集計しました。' : '比較が完了しました。');
  }

  function frame(now) {
    frameId = 0;
    if (batch) comparisonFrame();
    else if (playback) playFrame(now);
    if (batch || playback) scheduleFrame();
  }

  byId('prime-festival').addEventListener('click',()=>{if(batch||playback)return;if(engine.primeFestival()){invalidateComparison();renderMetrics();setStatus('祭り検証：次の命中で発動','warn');}});
  extraDrop.addEventListener('click',()=>{if(playback&&!playback.all&&G.dropCd<=0&&G.ballsLeft>0){engine.withRandom(trial.random,()=>engine.dropBall(setup.x));extraDrop.disabled=true;}});
  function renderReward(){
    const panel=byId('reward-panel'),offers=byId('reward-offers'),placing=G.phase==='place',reward=G.phase==='reward';
    panel.hidden=!placing&&!reward;offers.replaceChildren();
    if(panel.hidden)return;
    display('reward-title',placing?'ちょうちんを配置':'札を選ぶ');
    display('reward-detail',placing?PT[G.placing.type].name+' Lv'+G.placing.lv+'：残り'+G.placing.left+'個。盤面をタップして配置。':'残り'+G.picksLeft+'枚／選び直し '+G.rerolls+'回');
    byId('reward-reroll').hidden=!reward;byId('reward-reroll').disabled=G.rerolls<=0;byId('reward-auto').hidden=!placing;
    if(reward)for(const o of G.offer||[]){const button=document.createElement('button');button.type='button';button.className='reward-card';const heading=document.createElement('strong');heading.textContent='【'+engine.rewardRarity[o.c.rar]+'】'+o.name;const detail=document.createElement('span');detail.textContent=o.desc;button.append(heading,detail);button.addEventListener('click',()=>{const before=G.stage;engine.withRandom(trial.random,()=>engine.rewardActions.takeCard(o));afterRewardAction(before);});offers.append(button);}
  }
  function afterRewardAction(before){
    if(G.stage!==before){if(!setup.autoShots)G.ballsLeft=G.ballsMax=setup.shots;trial.ticks=0;trial.firstSettled=false;trial.timedOut=false;}
    invalidateComparison();renderEditor();renderBoard();renderMetrics();renderReward();showTrialStatus();updateControls();
  }
  function openCards(){if(playback||batch||!G.cleared||G.stage>=MAX_STAGE)return;
    const before=G.stage;engine.withRandom(trial.random,()=>{engine.rewardActions.stageClear();engine.rewardActions.afterClear();if(G.phase==='ending')engine.rewardActions.openReward();});afterRewardAction(before);
  }
  nextStage.addEventListener('click',openCards);
  byId('reward-reroll').addEventListener('click',()=>{const before=G.stage;engine.withRandom(trial.random,engine.rewardActions.reroll);afterRewardAction(before);});
  byId('reward-auto').addEventListener('click',()=>{const before=G.stage;engine.withRandom(trial.random,engine.rewardActions.autoPlace);afterRewardAction(before);});
  byId('regression').addEventListener('click',()=>{if(playback||batch)return;const checks=engine.selfTest();display('regression-result',checks.map(c=>(c.ok?'✓ ':'✗ ')+c.name).join('\n'));renderBoard();});
  dropOne.addEventListener('click', () => startPlayback(false));
  dropAll.addEventListener('click', () => startPlayback(true));
  reset.addEventListener('click', readyTrial);
  compare.addEventListener('click', startComparison);
  cancel.addEventListener('click', stopComparison);
  new ResizeObserver(() => { if (!batch) renderBoard(); }).observe(plate);

  updateBrush();
  refreshAim();
  renderEditor();
  readyTrial();
}
