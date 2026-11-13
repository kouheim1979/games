export const PRICES = Object.freeze({ 1: 100, 10: 900, 50: 4250 });
export const PITY = 50;
export const FEVER_HEAT = 30;
export const FEVER_SECONDS = 15;
export const FEVER_FACTOR = 3;
export const FEVER_CORES = 650;
export const OFFLINE_HOURS = 8;
export const MAX_REACTOR = 12;
const BALANCE_CAP = 1e15;
const SAVE_VERSION = 1;

export const RARITIES = [
  { name: 'N', odds: 52, rebate: 8, shards: 1, exchange: 18 },
  { name: 'R', odds: 30, rebate: 14, shards: 2, exchange: 35 },
  { name: 'SR', odds: 13, rebate: 32, shards: 4, exchange: 70 },
  { name: 'SSR', odds: 4.2, rebate: 85, shards: 12, exchange: 150 },
  { name: 'Ω', odds: 0.8, rebate: 250, shards: 35, exchange: 380 },
];

export const UNITS = [
  { id: 'nemesis', name: 'ネメシス', rarity: 4, power: 88 },
  { id: 'astra', name: '天竜アストラ', rarity: 3, power: 23 },
  { id: 'kurogane', name: '鬼面クロガネ', rarity: 3, power: 21 },
  { id: 'phoenix', name: '焔翼フェニクス', rarity: 3, power: 19 },
  { id: 'leviathan', name: 'リヴァイア', rarity: 2, power: 8 },
  { id: 'kraken', name: '幻菌クラーケン', rarity: 2, power: 7 },
  { id: 'fox', name: '金狐コガネ', rarity: 2, power: 6 },
  { id: 'wolf', name: '晶狼ヴォルト', rarity: 1, power: 3.5 },
  { id: 'beetle', name: '鋼甲ビートル', rarity: 1, power: 3 },
  { id: 'drone', name: 'パルスドローン', rarity: 1, power: 2.5 },
  { id: 'bat', name: 'グリッチバット', rarity: 0, power: 1.4 },
  { id: 'ghost', name: 'ゼロゴースト', rarity: 0, power: 1 },
];

export const UNIT_BY_ID = Object.fromEntries(UNITS.map(unit => [unit.id, unit]));
const POOLS = RARITIES.map((_, rank) => UNITS.filter(unit => unit.rarity === rank));

export const GOALS = [
  { id: 'first-ten', name: 'はじめての10回', reward: 300, target: 10, progress: state => state.pulls },
  { id: 'fifty', name: '召喚50回', reward: 750, target: 50, progress: state => state.pulls },
  { id: 'hundred-fifty', name: '召喚150回', reward: 1800, target: 150, progress: state => state.pulls },
  { id: 'five-hundred', name: '召喚500回', reward: 5000, target: 500, progress: state => state.pulls },
  { id: 'omega', name: 'ネメシス解放', reward: 2500, target: 1, progress: state => state.copies.nemesis },
  { id: 'complete', name: '図鑑コンプリート', reward: 4250, target: UNITS.length, progress: state => ownedCount(state) },
];

export function createState(now = Date.now()) {
  return {
    version: SAVE_VERSION,
    balance: 5200,
    shards: 0,
    copies: Object.fromEntries(UNITS.map(unit => [unit.id, 0])),
    pulls: 0,
    pity: 0,
    heat: 0,
    feverUntil: 0,
    reactor: 0,
    claimed: [],
    lastDraw: null,
    history: [],
    lastTick: now,
    sound: true,
    quiet: false,
  };
}

function bounded(value, max = BALANCE_CAP) {
  return Number.isFinite(value) ? Math.min(max, Math.max(0, value)) : 0;
}

function integer(value, max = BALANCE_CAP) {
  return Math.floor(bounded(value, max));
}

function restoreDraw(draw) {
  if (!draw || !Object.hasOwn(PRICES, draw.count) || !Object.hasOwn(UNIT_BY_ID, draw.best)) return null;
  return {
    count: Number(draw.count),
    best: draw.best,
    at: integer(draw.at),
    returned: integer(draw.returned),
    shards: integer(draw.shards),
    fever: integer(draw.fever, 2),
    pityHits: integer(draw.pityHits, 50),
    goals: Array.isArray(draw.goals)
      ? draw.goals.filter(id => GOALS.some(goal => goal.id === id))
      : [],
  };
}

export function restoreState(value, now = Date.now()) {
  if (value?.version !== SAVE_VERSION) return createState(now);

  const state = createState(now);
  state.balance = bounded(value.balance);
  state.shards = integer(value.shards);
  state.pulls = integer(value.pulls);
  state.pity = integer(value.pity, PITY - 1);
  state.heat = integer(value.heat, FEVER_HEAT - 1);
  state.feverUntil = integer(value.feverUntil);
  state.lastTick = integer(value.lastTick) || now;
  state.reactor = integer(value.reactor, MAX_REACTOR);
  state.sound = value.sound !== false;
  state.quiet = value.quiet === true;
  for (const unit of UNITS) state.copies[unit.id] = integer(value.copies?.[unit.id]);
  if (Array.isArray(value.claimed)) {
    state.claimed = GOALS.filter(goal => value.claimed.includes(goal.id)).map(goal => goal.id);
  }
  if (Array.isArray(value.history)) {
    state.history = value.history.slice(0, 8).map(restoreDraw).filter(Boolean);
  }
  const last = restoreDraw(value.lastDraw);
  if (last && Array.isArray(value.lastDraw.entries) && value.lastDraw.entries.length === last.count) {
    const entries = value.lastDraw.entries.filter(entry => Object.hasOwn(UNIT_BY_ID, entry?.id))
      .map(entry => ({ id: entry.id, fresh: entry.fresh === true, level: integer(entry.level, 50) }));
    if (entries.length === last.count) state.lastDraw = { ...last, entries };
  }
  return state;
}

export function level(copies) {
  return copies > 0 ? 1 + Math.floor(Math.log2(copies)) : 0;
}

export function ownedCount(state) {
  return UNITS.filter(unit => state.copies[unit.id] > 0).length;
}

export function unitPower(unit, copies) {
  const rank = level(copies);
  return rank ? unit.power * (1 + (rank - 1) * 0.68) : 0;
}

export function production(state) {
  const base = UNITS.reduce((sum, unit) => sum + unitPower(unit, state.copies[unit.id]), 6);
  return base * 1.35 ** state.reactor;
}

export function effectiveNow(state, now) {
  return Math.max(state.lastTick, now);
}

export function feverLeft(state, now) {
  return Math.max(0, state.feverUntil - effectiveNow(state, now));
}

export function accruedCores(state, now, rate = production(state)) {
  const elapsed = Math.min(OFFLINE_HOURS * 3600000, Math.max(0, now - state.lastTick));
  const fever = Math.min(elapsed, Math.max(0, state.feverUntil - state.lastTick));
  return rate * (elapsed + fever * (FEVER_FACTOR - 1)) / 1000;
}

export function projectedBalance(state, now) {
  return Math.min(BALANCE_CAP, state.balance + accruedCores(state, now));
}

export function settle(state, now) {
  const balance = projectedBalance(state, now);
  const gained = balance - state.balance;
  state.balance = balance;
  state.lastTick = effectiveNow(state, now);
  return gained;
}

function addCores(state, amount) {
  state.balance = Math.min(BALANCE_CAP, state.balance + amount);
}

export function pulseValue(state) {
  return Math.ceil(114 + production(state) * 2);
}

export function pulse(state) {
  const value = pulseValue(state);
  addCores(state, value);
  return value;
}

export function reactorCost(state) {
  return state.reactor < MAX_REACTOR ? Math.round(40 * 1.65 ** state.reactor) : null;
}

export function upgradeReactor(state) {
  const cost = reactorCost(state);
  if (cost === null || state.shards < cost) return false;
  state.shards -= cost;
  state.reactor += 1;
  return true;
}

function claimGoals(state) {
  const reached = GOALS.filter(goal => !state.claimed.includes(goal.id) && goal.progress(state) >= goal.target);
  for (const goal of reached) {
    state.claimed.push(goal.id);
    addCores(state, goal.reward);
  }
  return reached.map(goal => goal.id);
}

export function exchange(state, id) {
  if (!Object.hasOwn(UNIT_BY_ID, id)) return null;
  const unit = UNIT_BY_ID[id];
  const cost = RARITIES[unit.rarity].exchange;
  if (state.copies[id] || state.shards < cost) return null;

  state.shards -= cost;
  state.copies[id] = 1;
  return { unit, goals: claimGoals(state) };
}

function rollUnit(minimum, random) {
  const pool = RARITIES.slice(minimum);
  let target = random() * pool.reduce((sum, rarity) => sum + rarity.odds, 0);
  for (let i = 0; i < pool.length; i += 1) {
    target -= pool[i].odds;
    if (target < 0 || i === pool.length - 1) {
      const units = POOLS[minimum + i];
      return units[Math.floor(random() * units.length)];
    }
  }
}

export function summon(state, count, now = Date.now(), random = Math.random) {
  const price = PRICES[count];
  if (!Object.hasOwn(PRICES, count) || !Number.isInteger(count) || state.balance < price) return null;

  state.balance -= price;
  let returned = 0;
  let shards = 0;
  let pityHits = 0;
  let hasSR = false;
  let best = null;
  const entries = [];

  for (let i = 0; i < count; i += 1) {
    const endOfTen = (i + 1) % 10 === 0;
    const guaranteed = state.pity === PITY - 1;
    const minimum = guaranteed ? 3 : endOfTen && !hasSR ? 2 : 0;
    const unit = rollUnit(minimum, random);
    const rank = unit.rarity;
    const rarity = RARITIES[rank];
    const previous = state.copies[unit.id];
    state.copies[unit.id] = Math.min(BALANCE_CAP, previous + 1);
    const nextLevel = level(state.copies[unit.id]);
    entries.push({ id: unit.id, fresh: previous === 0, level: nextLevel > level(previous) ? nextLevel : 0 });

    if (previous > 0) shards += rarity.shards;
    if (guaranteed) pityHits += 1;
    state.pity = rank >= 3 ? 0 : state.pity + 1;
    returned += rarity.rebate;
    if (!best || rank > best.rarity) best = unit;
    hasSR = !endOfTen && (hasSR || rank >= 2);
  }

  state.pulls = Math.min(BALANCE_CAP, state.pulls + count);
  state.shards = Math.min(BALANCE_CAP, state.shards + shards);
  const fever = Math.floor((state.heat + count) / FEVER_HEAT);
  state.heat = (state.heat + count) % FEVER_HEAT;
  if (fever) {
    state.feverUntil = Math.max(state.feverUntil, now) + fever * FEVER_SECONDS * 1000;
    returned += fever * FEVER_CORES;
  }
  addCores(state, returned);
  const goals = claimGoals(state);
  const summary = { count, best: best.id, at: now, returned, shards, fever, pityHits, goals };
  state.history = [summary, ...state.history].slice(0, 8);
  state.lastDraw = { ...summary, entries };
  return state.lastDraw;
}
