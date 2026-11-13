import {
  FEVER_FACTOR, FEVER_HEAT, FEVER_SECONDS, GOALS, PITY, PRICES, RARITIES, UNITS, UNIT_BY_ID,
  createState, effectiveNow, exchange, feverLeft, level, ownedCount, production, projectedBalance,
  pulse, pulseValue, reactorCost, restoreState, settle, summon, unitPower, upgradeReactor,
} from './engine.js';

const SAVE_KEY = 'dopamine-overdrive/save-v1';
const get = id => document.getElementById(id);
const infoDialog = get('info-dialog');
const revealDialog = get('reveal-dialog');
const systemMotion = matchMedia('(prefers-reduced-motion: reduce)');
const drawButtons = [...document.querySelectorAll('[data-draw]')];
const tabs = [...document.querySelectorAll('[role="tab"]')];
const numberFormat = new Intl.NumberFormat('ja-JP', { maximumFractionDigits: 0 });
const rateFormat = new Intl.NumberFormat('ja-JP', { maximumFractionDigits: 1 });
const compactFormat = new Intl.NumberFormat('ja-JP', { notation: 'compact', maximumFractionDigits: 1 });
const integerText = number => numberFormat.format(Math.floor(number));
const shortNumber = number => number >= 10000 ? compactFormat.format(number) : integerText(number);
const rateText = number => number < 1000 ? rateFormat.format(number) : shortNumber(number);
const rarityClass = unit => 'tier-' + unit.rarity;
const copiesOf = unit => state.copies[unit.id];
const art = unit => './assets/' + unit.id + '.webp';

let storageAvailable = true;
let state = readSave() ?? createState();
let activePanel = 'summon';
let filter = 'all';
let infoMode = null;
let selectedUnit = null;
let activeDraw = null;
let requestPending = false;
let charging = false;
let revealEpoch = 0;
let animationTimer = 0;
let particlesTimer = 0;
let noticeTimer = 0;
let chain = 0;
let lastAction = 0;
let audio = null;

function readSave() {
  if (!storageAvailable) return null;
  let raw;
  try {
    raw = localStorage.getItem(SAVE_KEY);
  } catch {
    storageAvailable = false;
    return null;
  }
  if (!raw) return null;
  try {
    return restoreState(JSON.parse(raw));
  } catch {
    return null;
  }
}

function saveState() {
  if (storageAvailable) {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(state));
    } catch {
      storageAvailable = false;
    }
  }
  if (!storageAvailable) setText('save-status', 'このタブで記録中');
}

function transact(action) {
  const apply = () => {
    state = readSave() ?? state;
    const now = effectiveNow(state, Date.now());
    const gained = settle(state, now);
    const result = action(state, now, gained);
    if (result) saveState();
    return result;
  };
  // Keep simultaneous actions in tabs on this origin from spending the same saved balance.
  return navigator.locks?.request && storageAvailable
    ? navigator.locks.request(SAVE_KEY, apply)
    : Promise.resolve(apply());
}

function setText(id, value) {
  const element = get(id);
  const text = String(value);
  if (element.textContent !== text) element.textContent = text;
}

function setMeter(id, value, max, label) {
  const track = get(id + '-track');
  const fill = get(id + '-fill');
  track.setAttribute('aria-valuemax', max);
  track.setAttribute('aria-valuenow', value);
  track.setAttribute('aria-valuetext', label);
  fill.style.width = Math.min(100, value / max * 100) + '%';
}

function renderLive(now = Date.now()) {
  const balance = projectedBalance(state, now);
  const seconds = Math.ceil(feverLeft(state, now) / 1000);
  const rate = production(state);
  setText('balance', shortNumber(balance));
  setText('balance-exact', integerText(balance));
  setText('reveal-balance', shortNumber(balance));
  setText('production', rateText(rate * (seconds ? FEVER_FACTOR : 1)));
  const pulseLabel = '+' + shortNumber(pulseValue(state));
  setText('pulse-value', pulseLabel);
  setText('reveal-pulse-value', pulseLabel);
  get('reveal-pulse').hidden = balance >= PRICES[10];
  for (const button of drawButtons) {
    button.disabled = requestPending || charging || balance < PRICES[button.dataset.draw];
  }

  get('fever-card').classList.toggle('active', seconds > 0);
  get('fever-live').hidden = seconds === 0;
  setText('fever-value', seconds || state.heat);
  setText('fever-unit', seconds ? ' 秒' : ' / ' + FEVER_HEAT);
  setText('fever-message', seconds ? '発電3倍 · 次の発動まで ' + (FEVER_HEAT - state.heat) + '回' : '30回引くたびに発電3倍＋650コア');
  setMeter('fever', seconds || state.heat, seconds ? Math.max(FEVER_SECONDS, seconds) : FEVER_HEAT,
    seconds ? '残り' + seconds + '秒' : '次の発動まで' + (FEVER_HEAT - state.heat) + '回');
}

function cardMarkup(unit, { interactive = false, locked = false, detail = '', tag = '', delay = 0 } = {}) {
  const element = interactive ? 'button' : 'article';
  const buttonAttributes = interactive ? ' type="button" data-unit="' + unit.id + '"' : '';
  const badge = tag ? '<span class="card-tag">' + tag + '</span>' : '';
  const caption = detail ? '<small>' + detail + '</small>' : '';
  return '<' + element + buttonAttributes + ' class="unit-card ' + rarityClass(unit) + (locked ? ' locked' : '') + '" style="--delay:' + delay + 'ms">' +
    '<span class="unit-art"><img src="' + art(unit) + '" alt="" width="336" height="336" decoding="async">' +
    '<span class="rarity">' + RARITIES[unit.rarity].name + '</span>' + badge + '</span>' +
    '<span class="unit-caption"><strong>' + unit.name + '</strong>' + caption + '</span></' + element + '>';
}

function renderLatest() {
  const draw = state.lastDraw;
  setText('latest-heading', draw ? '直近の召喚' : 'ピックアップ');
  setText('latest-count', draw ? draw.count + '回' : 'Ω・SSR');
  get('latest-button').innerHTML = draw ? '結果を見る <span aria-hidden="true">↗</span>' : '図鑑を見る <span aria-hidden="true">↗</span>';
  if (draw) {
    const unique = new Map();
    for (const entry of highlighted(draw.entries)) {
      if (!unique.has(entry.id)) unique.set(entry.id, entry);
    }
    get('latest-grid').innerHTML = [...unique.values()].slice(0, 4).map(entry => {
      const unit = UNIT_BY_ID[entry.id];
      return cardMarkup(unit, { interactive: true, tag: entry.fresh ? 'NEW' : '', detail: 'Lv.' + level(copiesOf(unit)) });
    }).join('');
  } else {
    get('latest-grid').innerHTML = UNITS.slice(0, 4).map(unit => cardMarkup(unit, { interactive: true })).join('');
  }

  get('history-empty').hidden = state.history.length > 0;
  get('history-list').innerHTML = state.history.slice(0, 5).map(draw => {
    const unit = UNIT_BY_ID[draw.best];
    return '<li class="' + rarityClass(unit) + '"><span class="log-rank">' + RARITIES[unit.rarity].name +
      '</span><span>' + unit.name + '</span><span class="log-count">' + draw.count + '回</span></li>';
  }).join('');
}

function renderCollection() {
  const shown = UNITS.filter(unit => filter === 'all' || (filter === 'owned' ? copiesOf(unit) > 0 : copiesOf(unit) === 0));
  get('collection-grid').innerHTML = shown.map(unit => {
    const count = copiesOf(unit);
    return cardMarkup(unit, {
      interactive: true, locked: !count,
      detail: count ? 'Lv.' + level(count) + ' · ' + shortNumber(count) + '体' : '未入手',
    });
  }).join('');
  get('collection-empty').hidden = shown.length > 0;
}

function renderLab() {
  const cost = reactorCost(state);
  const rate = production(state);
  setText('reactor-level', 'Lv.' + (state.reactor + 1));
  setText('upgrade-current', rateText(rate));
  setText('upgrade-next', cost === null ? '最大' : rateText(rate * 1.35));
  setText('upgrade-price', cost === null ? '最大Lv.' : integerText(cost) + ' 欠片');
  get('upgrade-button').disabled = cost === null || state.shards < cost;
  setText('goals-count', state.claimed.length + ' / ' + GOALS.length);
  get('goals-list').innerHTML = GOALS.map(goal => {
    const done = state.claimed.includes(goal.id);
    const progress = Math.min(goal.target, goal.progress(state));
    return '<li' + (done ? ' class="done"' : '') + '><strong>' + goal.name + '</strong><small>' +
      (done ? '受取済み' : integerText(progress) + ' / ' + integerText(goal.target)) +
      '</small><span class="goal-reward">+' + integerText(goal.reward) + ' コア</span></li>';
  }).join('');
}

function render() {
  const count = ownedCount(state);
  setText('shards', shortNumber(state.shards));
  setText('shards-exact', integerText(state.shards));
  setText('tab-count', count + '/' + UNITS.length);
  setText('collection-count', count);
  setText('pull-count', shortNumber(state.pulls));
  setText('pity-value', state.pity);
  const untilPity = 'あと' + (PITY - state.pity) + '回以内にSSR以上確定';
  setText('pity-message', untilPity);
  setMeter('pity', state.pity, PITY, untilPity);
  document.body.classList.toggle('quiet', state.quiet);
  if (!storageAvailable) setText('save-status', 'このタブで記録中');
  if (activePanel === 'summon') renderLatest();
  if (activePanel === 'collection') renderCollection();
  if (activePanel === 'lab') renderLab();
  if (infoDialog.open && infoMode === 'unit') renderUnitDetail();
  renderLive();
}

function activateTab(name, focus = false) {
  activePanel = name;
  for (const tab of tabs) {
    const selected = tab.id === 'tab-' + name;
    tab.setAttribute('aria-selected', String(selected));
    tab.tabIndex = selected ? 0 : -1;
    get(tab.getAttribute('aria-controls')).hidden = !selected;
    if (selected && focus) tab.focus();
  }
  render();
}

function showInfo(mode, unit = null) {
  infoMode = mode;
  selectedUnit = unit;
  for (const view of ['help', 'rates', 'unit']) get(view + '-view').hidden = view !== mode;
  if (mode === 'help') {
    setText('info-title', '遊び方と設定');
    get('sound-option').checked = state.sound;
    get('quiet-option').checked = state.quiet;
  } else if (mode === 'rates') {
    setText('info-title', 'ガチャの排出率');
  } else {
    renderUnitDetail();
  }
  if (!infoDialog.open) infoDialog.showModal();
  infoDialog.querySelector('.close-button').focus();
}

function renderUnitDetail() {
  const unit = selectedUnit;
  const count = copiesOf(unit);
  const rarity = RARITIES[unit.rarity];
  const exchangeButton = count ? '' : '<button type="button" class="primary-button" id="exchange-button"' +
    (state.shards < rarity.exchange ? ' disabled' : '') + '><span>欠片で交換</span><strong>' +
    integerText(rarity.exchange) + '</strong></button>';
  const next = count ? 2 ** level(count) - count : 0;
  setText('info-title', unit.name);
  get('unit-view').innerHTML = '<div class="unit-detail ' + rarityClass(unit) + '">' +
    '<div class="detail-art"><img src="' + art(unit) + '" alt="" width="336" height="336"></div>' +
    '<div class="detail-stats"><span>' + rarity.name + '</span><p><strong>' +
    (count ? 'Lv.' + level(count) + ' · ' + shortNumber(count) + '体' : '未入手') +
    '</strong></p><p>' + (count ? '現在の発電 ' : '初期発電 ') +
    '<strong>+' + rateText(count ? unitPower(unit, count) : unit.power) + '</strong> コア / 秒</p>' +
    (count ? '<p>次のレベルまで ' + shortNumber(next) + '体</p>' : '<p>所持欠片 ' + shortNumber(state.shards) + '</p>') +
    exchangeButton + '</div></div>';
}

function announce(message) {
  const notice = get('notice');
  clearTimeout(noticeTimer);
  notice.textContent = message;
  noticeTimer = setTimeout(() => { notice.textContent = ''; }, 2600);
}

function prepareAudio(enabled = state.sound) {
  if (!enabled) return;
  const Audio = window.AudioContext || window.webkitAudioContext;
  if (!Audio) return;
  try {
    audio ??= new Audio();
    if (audio.state === 'suspended') audio.resume().catch(() => {});
  } catch {
    audio = null;
  }
}

function tone(hz, delay, length, volume, waveform = 'sine') {
  const start = audio.currentTime + delay;
  const oscillator = audio.createOscillator();
  const gain = audio.createGain();
  oscillator.type = waveform;
  oscillator.frequency.setValueAtTime(hz, start);
  gain.gain.setValueAtTime(.0001, start);
  gain.gain.exponentialRampToValueAtTime(volume, start + .012);
  gain.gain.exponentialRampToValueAtTime(.0001, start + length);
  oscillator.connect(gain).connect(audio.destination);
  oscillator.start(start);
  oscillator.stop(start + length + .01);
}

function sound(kind, rank = 0) {
  if (!state.sound || audio?.state !== 'running') return;
  if (kind === 'charge') {
    tone(110, 0, .23, .12, 'triangle');
    tone(164.81, .06, .24, .075, 'triangle');
    return;
  }
  if (kind === 'pulse') {
    tone(330, 0, .11, .078, 'triangle');
    tone(660, .045, .13, .046);
    return;
  }
  const notes = rank >= 3 ? [261.63, 329.63, 392, 523.25, 659.25, 783.99] : [392, 523.25, 659.25];
  notes.forEach((note, i) => tone(note, i * .045, .2 + rank * .035, .064, 'triangle'));
  if (rank >= 3) tone(rank === 4 ? 98 : 130.81, 0, .44, .12);
}

function lowMotion() {
  return state.quiet || systemMotion.matches;
}

function highlighted(entries, count) {
  return [...entries].sort((a, b) => UNIT_BY_ID[b.id].rarity - UNIT_BY_ID[a.id].rarity ||
    Number(b.fresh) - Number(a.fresh) || b.level - a.level).slice(0, count);
}

function renderRevealCards(draw, showAll, animate) {
  const shortened = draw.count === 50 && !showAll;
  const shown = shortened ? highlighted(draw.entries, 10) : draw.entries;
  const grid = get('reveal-grid');
  grid.classList.toggle('single', draw.count === 1);
  grid.classList.toggle('animate', animate);
  grid.innerHTML = shown.map((entry, i) => {
    const unit = UNIT_BY_ID[entry.id];
    const detail = entry.level > 1 ? 'Lv.' + entry.level + ' に強化' : '';
    return cardMarkup(unit, { tag: entry.fresh ? 'NEW' : '', detail, delay: animate ? Math.min(i, 12) * 19 : 0 });
  }).join('');
  const toggle = get('show-all');
  toggle.hidden = draw.count !== 50;
  toggle.textContent = shortened ? '全50枚を見る' : '上位10枚に戻す';
  toggle.setAttribute('aria-expanded', String(!shortened));
  toggle.setAttribute('aria-controls', 'reveal-grid');
}

function burst(rank, fever) {
  clearTimeout(particlesTimer);
  const field = get('particle-field');
  const count = 12 + rank * 8 + (fever ? 12 : 0);
  const fragments = document.createDocumentFragment();
  for (let i = 0; i < count; i += 1) {
    const particle = document.createElement('i');
    const angle = (i / count + Math.random() * .06) * Math.PI * 2;
    const radius = Math.min(innerWidth, innerHeight) * (.22 + Math.random() * .64);
    particle.style.setProperty('--x', Math.round(Math.cos(angle) * radius) + 'px');
    particle.style.setProperty('--y', Math.round(Math.sin(angle) * radius) + 'px');
    particle.style.setProperty('--size', (3 + Math.random() * 6) + 'px');
    particle.style.setProperty('--spin', (Math.random() * 700 - 350) + 'deg');
    if (i % 4 === 0) particle.style.setProperty('--particle-color', '#fff1ce');
    fragments.append(particle);
  }
  field.replaceChildren(fragments);
  particlesTimer = setTimeout(() => field.replaceChildren(), 720);
}

function finishReveal(animate = true) {
  if (!activeDraw || !revealDialog.open) return;
  clearTimeout(animationTimer);
  charging = false;
  const draw = activeDraw;
  const unit = UNIT_BY_ID[draw.best];
  const useMotion = animate && !lowMotion();
  setText('reveal-kicker', draw.count + '回 · ' + RARITIES[unit.rarity].name);
  setText('reveal-title', unit.name + ' 獲得');
  get('charge-scene').hidden = true;
  get('reveal-results').hidden = false;
  const rewards = ['+' + integerText(draw.returned) + ' コア回収'];
  if (draw.shards) rewards.push('+' + integerText(draw.shards) + ' 欠片');
  if (draw.pityHits) rewards.push('天井発動');
  if (draw.fever) rewards.push('フィーバー +' + (draw.fever * FEVER_SECONDS) + '秒');
  for (const goal of GOALS.filter(goal => draw.goals.includes(goal.id))) {
    rewards.push(goal.name + ' +' + integerText(goal.reward));
  }
  get('rewards').innerHTML = rewards.map((text, i) => '<span class="reward-tag' +
    (i > 1 || text.startsWith('フィーバー') ? ' hot' : '') + '">' + text + '</span>').join('');
  const counts = RARITIES.map(() => 0);
  for (const entry of draw.entries) counts[UNIT_BY_ID[entry.id].rarity] += 1;
  const summary = get('rarity-summary');
  summary.hidden = draw.count === 1;
  summary.innerHTML = RARITIES.map((rarity, rank) => counts[rank]
    ? '<span class="tier-' + rank + '"><b>' + rarity.name + '</b> ×' + counts[rank] + '</span>'
    : '').reverse().join('');
  renderRevealCards(draw, false, useMotion);
  revealDialog.scrollTop = 0;
  const heading = get('reveal-title');
  heading.tabIndex = -1;
  heading.focus({ preventScroll: true });
  if (useMotion) burst(unit.rarity, draw.fever);
  if (animate) sound('reveal', unit.rarity);
  renderLive();
}

function presentDraw(draw, animate) {
  activeDraw = draw;
  get('particle-field').replaceChildren();
  const rank = UNIT_BY_ID[draw.best].rarity;
  revealDialog.dataset.rank = rank;
  if (!revealDialog.open) revealDialog.showModal();
  revealDialog.scrollTop = 0;
  if (!animate || lowMotion()) {
    finishReveal(animate);
    return;
  }
  charging = true;
  setText('reveal-kicker', draw.count + '回' + (chain > 1 ? ' · 連続 ×' + chain : ''));
  setText('reveal-title', '召喚炉、起動');
  get('charge-scene').hidden = false;
  get('reveal-results').hidden = true;
  get('skip-button').focus({ preventScroll: true });
  renderLive();
  sound('charge');
  const duration = Math.max(rank >= 3 ? 440 : 260, 540 + rank * 112 - (chain - 1) * 112);
  animationTimer = setTimeout(finishReveal, duration);
}

async function draw(count) {
  if (requestPending || charging || infoDialog.open) return;
  prepareAudio();
  requestPending = true;
  const epoch = revealEpoch;
  const now = performance.now();
  renderLive();
  try {
    const result = await transact((current, time) => summon(current, count, time));
    requestPending = false;
    render();
    if (!result) {
      announce('コアが足りません。手動チャージで補充できます。');
      return;
    }
    chain = lastAction > 0 && now - lastAction < 12000 ? Math.min(6, chain + 1) : 1;
    lastAction = now;
    if (epoch === revealEpoch) presentDraw(result, true);
  } catch {
    requestPending = false;
    renderLive();
    announce('召喚できませんでした。もう一度試せます。');
  }
}

async function applyAction(action, success) {
  try {
    const result = await transact(action);
    render();
    if (result) success?.(result);
  } catch {
    announce('操作を完了できませんでした。もう一度試せます。');
  }
}

function chargeManually() {
  prepareAudio();
  applyAction(pulse, amount => {
    sound('pulse');
    if (!revealDialog.open) announce('手動チャージ +' + shortNumber(amount) + ' コア');
  });
}

get('rates-body').innerHTML = RARITIES.map((rarity, rank) =>
  '<tr class="tier-' + rank + '"><th scope="row">' + rarity.name + '</th><td>' + rarity.odds +
  '%</td><td>' + UNITS.filter(unit => unit.rarity === rank).length + '種</td></tr>').reverse().join('');

for (const tab of tabs) {
  tab.addEventListener('click', () => activateTab(tab.id.slice(4)));
  tab.addEventListener('keydown', event => {
    const index = tabs.indexOf(tab);
    const destinations = { ArrowLeft: (index + tabs.length - 1) % tabs.length, ArrowRight: (index + 1) % tabs.length, Home: 0, End: tabs.length - 1 };
    if (!Object.hasOwn(destinations, event.key)) return;
    event.preventDefault();
    activateTab(tabs[destinations[event.key]].id.slice(4), true);
  });
}
for (const button of document.querySelectorAll('[data-filter]')) {
  button.addEventListener('click', () => {
    filter = button.dataset.filter;
    for (const other of document.querySelectorAll('[data-filter]')) other.setAttribute('aria-pressed', String(other === button));
    renderCollection();
  });
}
for (const button of drawButtons) button.addEventListener('click', () => draw(Number(button.dataset.draw)));
for (const button of document.querySelectorAll('[data-close]')) button.addEventListener('click', () => button.closest('dialog').close());
document.querySelector('main').addEventListener('click', event => {
  const unit = event.target.closest('[data-unit]');
  if (unit) showInfo('unit', UNIT_BY_ID[unit.dataset.unit]);
});
document.addEventListener('keydown', event => {
  if (event.repeat || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || infoDialog.open ||
    activePanel !== 'summon' || event.target.matches('input, textarea, [contenteditable]')) return;
  const hotkeys = { '1': 1, '2': 10, '3': 50 };
  const count = hotkeys[event.key];
  if (count) {
    event.preventDefault();
    draw(count);
  }
});
get('help-button').addEventListener('click', () => showInfo('help'));
get('rates-button').addEventListener('click', () => showInfo('rates'));
get('pulse-button').addEventListener('click', chargeManually);
get('reveal-pulse').addEventListener('click', chargeManually);
get('latest-button').addEventListener('click', () => {
  if (state.lastDraw) presentDraw(state.lastDraw, false);
  else activateTab('collection', true);
});
get('skip-button').addEventListener('click', () => finishReveal(false));
get('show-all').addEventListener('click', () => {
  const showAll = get('show-all').getAttribute('aria-expanded') === 'false';
  if (activeDraw) renderRevealCards(activeDraw, showAll, false);
});
get('upgrade-button').addEventListener('click', () => {
  prepareAudio();
  applyAction(upgradeReactor, () => {
    sound('reveal', 2);
    announce('コア発電炉 Lv.' + (state.reactor + 1) + ' に強化');
  });
});
get('unit-view').addEventListener('click', event => {
  if (!event.target.closest('#exchange-button') || !selectedUnit) return;
  prepareAudio();
  const id = selectedUnit.id;
  applyAction(current => exchange(current, id), result => {
    infoDialog.querySelector('.close-button').focus();
    sound('reveal', result.unit.rarity);
  });
});
for (const [id, setting] of [['sound-option', 'sound'], ['quiet-option', 'quiet']]) {
  get(id).addEventListener('change', event => {
    const enabled = event.target.checked;
    if (setting === 'sound') prepareAudio(enabled);
    applyAction(current => { current[setting] = enabled; return true; });
  });
}
revealDialog.addEventListener('close', () => {
  if (revealDialog.open) return;
  clearTimeout(animationTimer);
  clearTimeout(particlesTimer);
  revealEpoch += 1;
  charging = false;
  activeDraw = null;
  get('particle-field').replaceChildren();
  renderLive();
  if (document.activeElement === document.body && activePanel === 'summon') {
    const next = get('summon-panel').querySelector('[data-draw]:not(:disabled)');
    (next ?? get('pulse-button')).focus({ preventScroll: true });
  }
});
window.addEventListener('storage', event => {
  if (event.key !== SAVE_KEY && event.key !== null) return;
  state = readSave() ?? state;
  render();
});
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) renderLive();
});

render();
transact((current, now, gained) => gained > 0 || current.pulls === 0)
  .then(() => render()).catch(() => render());
setInterval(() => {
  if (!document.hidden) renderLive();
}, 160);
