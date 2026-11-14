import { adjacent, findMove, Round, ROUND_MS, SIZE, tokyoDay, UPGRADES } from './engine.js';
import { Effects, Sound } from './effects.js';
import { language, locale, read, setupLanguage, tr, write } from './language.js';

const $ = (id) => document.getElementById(id);
const elements = Object.fromEntries([
  'grid', 'board-art', 'board-shell', 'stage', 'board-mode', 'board-toast', 'overlay', 'path-count',
  'sound', 'sound-label', 'open-help', 'help', 'close-help', 'low-effects', 'language', 'announcement',
  'menu-panel', 'pause-panel', 'upgrade-panel', 'result-panel', 'mode-intro', 'daily-date',
  'start', 'pause', 'resume', 'quit', 'retry', 'copy', 'upgrades', 'result-grade', 'result-title', 'result-score',
  'result-detail', 'score', 'best', 'clock', 'clock-icon', 'clock-stat', 'combo-multiplier', 'combo-bar',
  'longest', 'cleared', 'drive-panel', 'drive-meter', 'charge-bar', 'charge-label', 'activate',
].map((id) => [id, $(id)]));

const MODE = ['sprint', 'daily', 'practice'];
const DIRECTIONS = {
  ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0],
  q: [-1, -1], e: [1, -1], z: [-1, 1], c: [1, 1],
};
const PREFIX = 'neon-cascade:v1:';
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const compactViewport = matchMedia('(max-width: 660px) and (min-height: 395px)');
const playArea = document.querySelector('.play-area');
const modeButtons = [...document.querySelectorAll('[data-mode]')];
const number = new Intl.NumberFormat(locale);
const colorNames = tr('colors');

let mode = new URLSearchParams(location.search).get('mode');
if (!MODE.includes(mode)) mode = 'sprint';
let day = tokyoDay();
let phase = 'menu';
let round = new Round(`preview/${day}`);
let best = 0;
let elapsed = 0;
let runningFrom = 0;
let cursor = 0;
let path = [];
let pointer = null;
let keyboardPath = false;
let hint = [];
let lastAction = 0;
let toastUntil = 0;
let lastHud = {};
let soundOn = read(`${PREFIX}sound`) !== 'off';
let reduced = false;
let lockedScroll = null;

setupLanguage(elements.language);

const cells = Array.from({ length: SIZE ** 2 }, (_, index) => {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'cell';
  button.dataset.index = index;
  button.tabIndex = index === cursor ? 0 : -1;
  const gem = document.createElement('span');
  gem.className = 'gem';
  gem.setAttribute('aria-hidden', 'true');
  const core = document.createElement('span');
  core.className = 'gem-core';
  core.textContent = '✦';
  gem.append(core);
  button.append(gem);
  return button;
});
elements.grid.append(...cells);
const fx = new Effects(elements['board-art'], cells);
const sound = new Sound(soundOn);

function updateSound() {
  elements.sound.setAttribute('aria-pressed', String(soundOn));
  elements['sound-label'].textContent = tr('sound');
}

function updateEffects() {
  reduced = reducedMotion.matches || elements['low-effects'].checked;
  document.documentElement.toggleAttribute('data-low-effects', reduced);
  fx.setReduced(reduced);
}

function recordKey() {
  return `${PREFIX}best:${mode === 'daily' ? day : mode}`;
}

function updateMode() {
  best = mode === 'practice' ? 0 : Math.max(0, Number(read(recordKey())) || 0);
  elements['board-mode'].textContent = tr(mode);
  elements['mode-intro'].textContent = tr(`${mode}Intro`);
  elements['daily-date'].textContent = tr('dailyDetail', { date: day });
  for (const button of modeButtons) button.setAttribute('aria-pressed', String(button.dataset.mode === mode));
}

function gameTime(now) {
  return elapsed + (phase === 'playing' ? now - runningFrom : 0);
}

function syncPageLock() {
  const root = document.documentElement;
  const shouldLock = compactViewport.matches && ['playing', 'pause', 'upgrade'].includes(phase);
  if (shouldLock && lockedScroll === null) {
    const bounds = playArea.getBoundingClientRect();
    // Bring the full play area into view if the round was started partway down the page.
    lockedScroll = bounds.top < 0 || bounds.bottom > root.clientHeight
      ? Math.max(0, window.scrollY + bounds.top)
      : window.scrollY;
    root.style.setProperty('--locked-page-top', `${-lockedScroll}px`);
    root.setAttribute('data-round-lock', '');
  } else if (!shouldLock && lockedScroll !== null) {
    root.removeAttribute('data-round-lock');
    root.style.removeProperty('--locked-page-top');
    window.scrollTo(0, lockedScroll);
    lockedScroll = null;
  }
}

function changePhase(next, now) {
  if (phase === 'playing') elapsed += now - runningFrom;
  if (next === 'playing') runningFrom = now;
  phase = next;
  elements.stage.dataset.phase = next;
  elements.overlay.hidden = next === 'playing';
  elements.grid.inert = next !== 'playing';
  elements.pause.disabled = next !== 'playing';
  for (const name of ['menu', 'pause', 'upgrade', 'result']) {
    elements[`${name}-panel`].hidden = next !== name;
  }
  for (const button of modeButtons) button.disabled = next !== 'menu' && next !== 'result';
  syncPageLock();
}

function updateBoard(result) {
  round.board.forEach((piece, index) => {
    const cell = cells[index];
    if (cell.dataset.piece === String(piece.id)) return;
    cell.dataset.piece = piece.id;
    cell.dataset.kind = piece.color;
    cell.toggleAttribute('data-core', Boolean(piece.core));
    const color = colorNames[piece.color];
    cell.setAttribute('aria-label', tr('cell', {
      row: Math.floor(index / SIZE) + 1, col: index % SIZE + 1,
      color: piece.core ? tr('core', { color }) : color,
    }));
    const gem = cell.firstElementChild;
    for (const animation of gem.getAnimations()) animation.cancel();
    if (!result || reduced) return;
    if (result.reshuffled) {
      gem.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 230 + (index % SIZE) * 18 });
      return;
    }
    const fall = result.falls.get(piece.id) || 0;
    if (fall || piece.id === result.coreId) {
      gem.animate([
        { transform: `translateY(${-Math.min(2.6, fall) * 84}%) scale(${piece.id === result.coreId ? 0.55 : 0.92})`, opacity: 0.4 },
        { transform: 'translateY(0) scale(1)', opacity: 1 },
      ], { duration: 175 + fall * 20, easing: 'cubic-bezier(.17,.74,.37,1.18)' });
    }
  });
}

function updateSelection() {
  for (const cell of cells) cell.removeAttribute('data-selected');
  for (const index of path) cells[index].setAttribute('data-selected', '');
  const counter = elements['path-count'];
  counter.hidden = path.length < 2;
  if (path.length >= 2) counter.textContent = tr('selected', { n: path.length });
  fx.select(path, round.board[path[0]]?.color ?? 0);
}

function showHint(indices) {
  for (const index of hint) cells[index].removeAttribute('data-hint');
  hint = indices;
  for (const index of hint) cells[index].setAttribute('data-hint', '');
}

function moveCursor(index, focus = false) {
  cells[cursor].tabIndex = -1;
  cursor = index;
  cells[cursor].tabIndex = 0;
  if (focus) cells[cursor].focus({ preventScroll: true });
}

function clearPath() {
  if (pointer && elements.grid.hasPointerCapture(pointer.id)) elements.grid.releasePointerCapture(pointer.id);
  pointer = null;
  keyboardPath = false;
  path = [];
  updateSelection();
}

function beginRound(event) {
  if (phase !== 'menu' && phase !== 'result') return;
  sound.unlock();
  const now = performance.now();
  day = tokyoDay();
  const seed = mode === 'daily' ? `daily/${day}` : `${mode}/${Date.now()}/${Math.random()}`;
  round = new Round(seed);
  for (const cell of cells) delete cell.dataset.piece;
  clearPath();
  fx.reset();
  elements['board-toast'].hidden = true;
  lastAction = 0;
  elapsed = 0;
  updateMode();
  updateBoard();
  const starter = findMove(round.board, 5) || findMove(round.board);
  showHint(starter);
  changePhase('playing', now);
  moveCursor(starter[0], event.detail === 0);
  updateHud(now);
  sound.cue('start');
}

function enterMenu(nextMode) {
  if (phase !== 'menu' && phase !== 'result') return;
  mode = nextMode;
  day = tokyoDay();
  round = new Round(`preview/${day}/${mode}`);
  for (const cell of cells) delete cell.dataset.piece;
  elapsed = 0;
  fx.reset();
  showHint([]);
  elements['board-toast'].hidden = true;
  updateMode();
  updateBoard();
  changePhase('menu', performance.now());
  updateHud(performance.now());
}

function pauseRound(focus = true) {
  if (phase !== 'playing') return;
  const now = performance.now();
  if (mode !== 'practice' && gameTime(now) >= ROUND_MS) {
    finishRound(true, now);
    return;
  }
  clearPath();
  changePhase('pause', now);
  updateHud(now);
  if (focus) elements.resume.focus({ preventScroll: true });
}

function resumeRound(event) {
  if (phase !== 'pause') return;
  sound.unlock();
  changePhase('playing', performance.now());
  if (event.detail === 0) moveCursor(cursor, true);
  else elements.resume.blur();
}

function updateHud(now) {
  const time = gameTime(now);
  const remaining = Math.max(0, ROUND_MS - time);
  const seconds = Math.ceil(remaining / 1000);
  const combo = round.multiplier(time);
  const driving = round.isDriving(time) && phase !== 'result';
  const ready = round.charge >= 100;
  const driveLeft = driving ? Math.max(0, round.driveUntil - time) : 0;
  const clock = mode === 'practice' ? '∞' : `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
  const view = {
    score: number.format(round.score), best: best ? number.format(best) : '—', clock,
    'combo-multiplier': `×${(driving ? combo * 2 : combo).toFixed(2).replace(/0$/, '')}`,
    longest: round.longest ? number.format(round.longest) : '—', cleared: number.format(round.cleared),
    'charge-label': driving ? `${tr('active')} ${Math.ceil(driveLeft / 1000)}s` : `${round.charge}%`,
  };
  for (const [key, value] of Object.entries(view)) {
    if (lastHud[key] !== value) elements[key].textContent = value;
  }
  lastHud = view;
  elements['clock-icon'].style.setProperty('--clock', `${mode === 'practice' ? 100 : Math.round(remaining / ROUND_MS * 100)}%`);
  elements['clock-stat'].toggleAttribute('data-urgent', mode !== 'practice' && seconds > 0 && seconds <= 10);
  elements['combo-bar'].style.transform = `scaleX(${phase === 'result' ? 0 : Math.max(0, 1 - (time - round.lastClear) / round.comboWindow)})`;
  const chargePercent = driving ? driveLeft / round.driveDuration : round.charge / 100;
  elements['charge-bar'].style.transform = `scaleX(${chargePercent})`;
  elements['drive-meter'].setAttribute('aria-valuenow', Math.round(chargePercent * 100));
  elements['drive-panel'].toggleAttribute('data-ready', ready && phase !== 'result');
  elements['drive-panel'].toggleAttribute('data-active', driving);
  elements['board-shell'].toggleAttribute('data-drive', driving);
  elements.activate.disabled = phase !== 'playing' || !ready || driving;
}

function announce(message) {
  elements.announcement.textContent = message;
}

function toast(message, now) {
  elements['board-toast'].textContent = message;
  elements['board-toast'].hidden = false;
  toastUntil = now + 1150;
  announce(message);
}

function present(result, now, index, beforeCharge) {
  updateBoard(result);
  fx.burst(result.removed, result.blasts, index, `+${number.format(result.points)}`, now);
  const time = gameTime(now);
  sound.clear(result.chainLength, result.blasts.length, round.isDriving(time));
  if (result.reshuffled) toast(tr('shuffle'), now);
  else if (result.blasts.length === 1) toast(tr('coreBlast'), now);
  else if (result.blasts.length > 1) toast(tr('blasts', { n: result.blasts.length }), now);
  else if (result.coreId >= 0) toast(tr('madeCore'), now);
  else announce(`+${number.format(result.points)}`);
  if (round.charge >= 100 && beforeCharge < 100) {
    toast(tr('ready'), now);
    sound.cue('ready');
  }
  if (!reduced && (result.blasts.length || result.coreId >= 0)) {
    elements.stage.animate([{ borderColor: '#d4fb79' }, { borderColor: '#2e3449' }], { duration: 420 });
  }
  if (result.upgrade) showUpgrades(now);
  updateHud(now);
}

function playPath(focusBoard = false) {
  if (phase !== 'playing' || !path.length) return;
  const now = performance.now();
  if (!stillPlaying(now)) return;
  const picked = path;
  clearPath();
  showHint([]);
  const beforeCharge = round.charge;
  const result = round.play(picked, gameTime(now));
  lastAction = gameTime(now);
  if (result) present(result, now, picked.at(-1), beforeCharge);
  else toast(tr('needThree'), now);
  if (focusBoard && phase === 'playing') moveCursor(cursor, true);
}

function showUpgrades(now) {
  elements.upgrades.replaceChildren();
  for (const id of round.choices()) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'upgrade-choice';
    button.dataset.upgrade = id;
    const icon = document.createElement('i');
    icon.textContent = UPGRADES[id];
    icon.setAttribute('aria-hidden', 'true');
    const copy = document.createElement('span');
    const title = document.createElement('strong');
    title.textContent = tr(`${id}Name`);
    const description = document.createElement('small');
    description.textContent = tr(`${id}Detail`);
    copy.append(title, description);
    button.append(icon, copy);
    elements.upgrades.append(button);
  }
  changePhase('upgrade', now);
  elements.upgrades.firstElementChild.focus({ preventScroll: true });
  sound.cue('upgrade');
}

function activate(event) {
  const now = performance.now();
  if (!stillPlaying(now) || round.charge < 100 || round.isDriving(gameTime(now))) return;
  sound.unlock();
  clearPath();
  showHint([]);
  const time = gameTime(now);
  lastAction = time;
  const result = round.activate(time);
  sound.cue('drive');
  if (result) present(result, now, result.blasts[0].index, 100);
  else updateHud(now);
  if (event.detail === 0 && phase === 'playing') moveCursor(cursor, true);
}

function stillPlaying(now) {
  if (phase !== 'playing') return false;
  if (mode !== 'practice' && gameTime(now) >= ROUND_MS) {
    finishRound(true, now);
    return false;
  }
  return true;
}

function finishRound(timeout, now) {
  clearPath();
  showHint([]);
  elements['board-toast'].hidden = true;
  changePhase('result', now);
  if (timeout) elapsed = ROUND_MS;
  const record = mode !== 'practice' && round.score > best;
  if (record) {
    best = round.score;
    write(recordKey(), String(best));
  }
  const grade = [[32_000, 'S+'], [17_000, 'S'], [8_500, 'A'], [3_500, 'B'], [1_000, 'C'], [0, 'D']];
  elements['result-grade'].hidden = mode === 'practice';
  elements['result-grade'].textContent = grade.find(([threshold]) => round.score >= threshold)[1];
  elements['result-title'].textContent = tr(record ? 'record' : timeout ? 'result' : 'finished');
  elements['result-score'].textContent = number.format(round.score);
  elements['result-detail'].textContent = tr('stats', { chain: round.longest, clear: round.cleared });
  elements.copy.textContent = tr('copy');
  elements.retry.focus({ preventScroll: true });
  announce(`${elements['result-title'].textContent} ${number.format(round.score)}`);
  sound.cue(record ? 'record' : 'end');
  updateHud(now);
}

function pick(index) {
  if (index < 0 || index === path.at(-1)) return false;
  if (!path.length && hint.length && !hint.includes(index)) showHint([]);
  if (path.length > 1 && index === path.at(-2)) {
    path.pop();
  } else {
    if (path.length && (!adjacent(path.at(-1), index) || path.includes(index) || round.board[index].color !== round.board[path[0]].color)) {
      return false;
    }
    path.push(index);
    sound.pick(path.length);
  }
  updateSelection();
  return true;
}

function samplePoint(x, y, rect) {
  const col = (x - rect.left) / rect.width * SIZE;
  const row = (y - rect.top) / rect.height * SIZE;
  if (col < 0 || row < 0 || col >= SIZE || row >= SIZE) return;
  if (Math.abs(col % 1 - 0.5) > 0.37 || Math.abs(row % 1 - 0.5) > 0.37) return;
  const index = Math.floor(row) * SIZE + Math.floor(col);
  if (pick(index)) moveCursor(index);
}

function tracePointer(event) {
  const rect = elements.grid.getBoundingClientRect();
  const samples = event.getCoalescedEvents?.() || [];
  for (const point of [...samples, event]) {
    const dx = point.clientX - pointer.x;
    const dy = point.clientY - pointer.y;
    const step = Math.max(2, Math.min(rect.width, rect.height) / (SIZE * 4));
    const count = Math.min(100, Math.ceil(Math.hypot(dx, dy) / step));
    for (let i = 1; i <= count; i++) samplePoint(pointer.x + dx * i / count, pointer.y + dy * i / count, rect);
    pointer.x = point.clientX;
    pointer.y = point.clientY;
  }
}

elements.grid.addEventListener('pointerdown', (event) => {
  const cell = event.target.closest('.cell');
  const now = performance.now();
  if (!cell || event.button !== 0 || pointer || !stillPlaying(now)) return;
  event.preventDefault();
  sound.unlock();
  clearPath();
  lastAction = gameTime(now);
  const index = Number(cell.dataset.index);
  moveCursor(index);
  pointer = { id: event.pointerId, x: event.clientX, y: event.clientY };
  elements.grid.setPointerCapture(event.pointerId);
  pick(index);
});

elements.grid.addEventListener('pointermove', (event) => {
  if (pointer?.id === event.pointerId && stillPlaying(performance.now())) tracePointer(event);
});

elements.grid.addEventListener('pointerup', (event) => {
  if (pointer?.id !== event.pointerId || !stillPlaying(performance.now())) return;
  tracePointer(event);
  playPath();
});

for (const name of ['pointercancel', 'lostpointercapture']) {
  elements.grid.addEventListener(name, (event) => {
    if (pointer?.id === event.pointerId) clearPath();
  });
}

elements.grid.addEventListener('focusin', (event) => {
  if (event.target.matches('.cell')) moveCursor(Number(event.target.dataset.index));
});

elements.grid.addEventListener('focusout', (event) => {
  if (keyboardPath && !elements.grid.contains(event.relatedTarget)) clearPath();
});

elements.grid.addEventListener('click', (event) => {
  const cell = event.target.closest('.cell');
  if (!cell || event.detail !== 0 || !stillPlaying(performance.now())) return;
  const index = Number(cell.dataset.index);
  if (path.length) playPath(true);
  else {
    keyboardPath = true;
    pick(index);
  }
});

document.addEventListener('keydown', (event) => {
  if (event.ctrlKey || event.altKey || event.metaKey || phase !== 'playing') return;
  if (event.key === 'Escape') {
    event.preventDefault();
    if (path.length) clearPath();
    else pauseRound();
    return;
  }
  const onBoard = elements.grid.contains(event.target);
  if (event.code === 'Space' && (onBoard || event.target === document.body) && !elements.activate.disabled) {
    event.preventDefault();
    activate(event);
    return;
  }
  if (!onBoard || pointer || !stillPlaying(performance.now())) return;
  if (event.key === 'Enter' || event.code === 'Space') {
    event.preventDefault();
    if (!event.repeat) cells[cursor].click();
    return;
  }
  const delta = DIRECTIONS[event.key] || DIRECTIONS[event.key.toLowerCase()];
  if (!delta) return;
  event.preventDefault();
  const x = cursor % SIZE + delta[0];
  const y = Math.floor(cursor / SIZE) + delta[1];
  if (x < 0 || x >= SIZE || y < 0 || y >= SIZE) return;
  const next = y * SIZE + x;
  if (!keyboardPath || pick(next)) moveCursor(next, true);
});

elements.start.addEventListener('click', beginRound);
elements.retry.addEventListener('click', beginRound);
elements.pause.addEventListener('click', () => pauseRound());
elements.resume.addEventListener('click', resumeRound);
elements.quit.addEventListener('click', () => finishRound(false, performance.now()));
elements.activate.addEventListener('click', activate);

elements.upgrades.addEventListener('click', (event) => {
  const option = event.target.closest('[data-upgrade]');
  if (!option || phase !== 'upgrade') return;
  round.upgrades.add(option.dataset.upgrade);
  changePhase('playing', performance.now());
  if (event.detail === 0) moveCursor(cursor, true);
  updateHud(performance.now());
  sound.cue('ready');
});

for (const button of modeButtons) {
  button.addEventListener('click', () => enterMenu(button.dataset.mode));
}

elements.sound.addEventListener('click', () => {
  soundOn = !soundOn;
  sound.toggle(soundOn);
  write(`${PREFIX}sound`, soundOn ? 'on' : 'off');
  updateSound();
});

elements['open-help'].addEventListener('click', () => {
  pauseRound(false);
  if (!elements.help.open) elements.help.showModal();
});
elements['close-help'].addEventListener('click', () => elements.help.close());
elements.help.addEventListener('close', () => {
  if (phase === 'pause') elements.resume.focus({ preventScroll: true });
});
elements['low-effects'].checked = read(`${PREFIX}low-effects`) === 'on';
elements['low-effects'].addEventListener('change', () => {
  write(`${PREFIX}low-effects`, elements['low-effects'].checked ? 'on' : 'off');
  updateEffects();
});
reducedMotion.addEventListener('change', updateEffects);
compactViewport.addEventListener('change', syncPageLock);
document.addEventListener('visibilitychange', () => { if (document.hidden) pauseRound(false); });

elements.copy.addEventListener('click', async () => {
  const url = new URL(location.href);
  url.search = '';
  url.searchParams.set('mode', mode);
  url.searchParams.set('lang', language);
  const label = mode === 'daily' ? `${tr(mode)} ${day}` : tr(mode);
  const text = `NEON CASCADE · ${label}\n${tr('score')} ${number.format(round.score)}\n${elements['result-detail'].textContent}\n${url}`;
  try {
    await navigator.clipboard.writeText(text);
    elements.copy.textContent = tr('copied');
  } catch {
    elements.copy.textContent = tr('copyFailed');
  }
});

function frame() {
  const now = performance.now();
  if (stillPlaying(now)) {
    const time = gameTime(now);
    if (!path.length && !hint.length && time - lastAction >= 4200) {
      showHint(findMove(round.board, round.coreLength) || findMove(round.board));
    }
    updateHud(now);
  }
  if (now > toastUntil) elements['board-toast'].hidden = true;
  fx.draw(now);
  requestAnimationFrame(frame);
}

updateSound();
updateEffects();
updateMode();
updateBoard();
updateHud(performance.now());
requestAnimationFrame(frame);
