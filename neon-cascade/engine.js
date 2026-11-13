export const SIZE = 7;
export const ROUND_MS = 60_000;
export const COLORS = ['#61f1c9', '#fa70bd', '#a28cff', '#65baff', '#ffd572'];
export const UPGRADES = {
  wide: '✦', surge: 'ϟ', chain: '↗', combo: '≋', drive: '◴', core: '◆',
};

const NEIGHBORS = Array.from({ length: SIZE ** 2 }, (_, index) => {
  const row = Math.floor(index / SIZE);
  const col = index % SIZE;
  const neighbors = [];
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const y = row + dy;
      const x = col + dx;
      if ((dy || dx) && y >= 0 && y < SIZE && x >= 0 && x < SIZE) {
        neighbors.push(y * SIZE + x);
      }
    }
  }
  return neighbors;
});

const OPENERS = [
  [[0, 1], [1, 0], [2, 1], [3, 1], [4, 0]],
  [[0, 0], [1, 1], [2, 1], [3, 2], [4, 1]],
  [[0, 1], [1, 2], [2, 2], [3, 1], [4, 0]],
];

export function seededRandom(key) {
  let state = 2166136261;
  for (const char of key) state = Math.imul(state ^ char.codePointAt(0), 16777619);
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let n = Math.imul(state ^ (state >>> 15), state | 1);
    n ^= n + Math.imul(n ^ (n >>> 7), n | 61);
    return ((n ^ (n >>> 14)) >>> 0) / 4294967296;
  };
}

export function tokyoDay(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en', {
    timeZone: 'Asia/Tokyo', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(date);
  const value = (type) => parts.find((part) => part.type === type).value;
  return [value('year'), value('month'), value('day')].join('-');
}

export function adjacent(first, second) {
  return NEIGHBORS[first]?.includes(second) ?? false;
}

export function findMove(board, target = 3) {
  function extend(path, color) {
    if (path.length === target) return path;
    for (const next of NEIGHBORS[path.at(-1)]) {
      if (board[next].color !== color || path.includes(next)) continue;
      const found = extend([...path, next], color);
      if (found) return found;
    }
    return null;
  }

  for (let index = 0; index < board.length; index++) {
    const found = extend([index], board[index].color);
    if (found) return found;
  }
  if (target === 3) {
    const core = board.findIndex((piece) => piece.core);
    if (core >= 0) return [core];
  }
  return null;
}

export class Round {
  constructor(seed) {
    this.seed = seed;
    this.random = seededRandom(seed);
    this.nextId = 0;
    this.score = 0;
    this.longest = 0;
    this.cleared = 0;
    this.moves = 0;
    this.charge = 0;
    this.combo = 0;
    this.lastClear = -Infinity;
    this.driveUntil = -Infinity;
    this.upgrades = new Set();
    this.board = this.newBoard();
  }

  piece(color = Math.floor(this.random() * COLORS.length), core = 0) {
    return { id: this.nextId++, color, core };
  }

  newBoard() {
    const board = Array.from({ length: SIZE ** 2 }, () => this.piece());
    const pattern = OPENERS[Math.floor(this.random() * OPENERS.length)];
    const transpose = this.random() < 0.5;
    const offsetX = 1 + Math.floor(this.random() * 2);
    const offsetY = 1 + Math.floor(this.random() * 3);
    const color = Math.floor(this.random() * COLORS.length);
    for (const [x, y] of pattern) {
      const col = offsetX + x;
      const row = offsetY + y;
      board[transpose ? col * SIZE + row : row * SIZE + col].color = color;
    }
    return board;
  }

  get coreLength() { return this.upgrades.has('core') ? 4 : 5; }
  get comboWindow() { return this.upgrades.has('combo') ? 6300 : 4300; }
  get driveDuration() { return this.upgrades.has('drive') ? 8000 : 6000; }

  isDriving(now) { return now < this.driveUntil; }

  comboAt(now) {
    return now - this.lastClear < this.comboWindow ? this.combo : 0;
  }

  multiplier(now) {
    return 1 + Math.max(0, this.comboAt(now) - 1) * 0.25;
  }

  choices() {
    const random = seededRandom(`${this.seed}/upgrade/${this.moves}`);
    const remaining = Object.keys(UPGRADES).filter((id) => !this.upgrades.has(id));
    return Array.from({ length: 3 }, () => remaining.splice(Math.floor(random() * remaining.length), 1)[0]);
  }

  play(path, now) {
    const start = this.board[path[0]];
    if (!start || new Set(path).size !== path.length) return null;
    if (path.length < 3 && !(path.length === 1 && start.core)) return null;
    if (path.some((index, position) => this.board[index]?.color !== start.color || (position && !adjacent(path[position - 1], index)))) {
      return null;
    }
    const last = path.at(-1);
    const makeCore = path.length >= this.coreLength && !this.board[last].core;
    const anchor = makeCore ? last : -1;
    this.moves++;
    this.longest = Math.max(this.longest, path.length >= 3 ? path.length : 0);
    const result = this.resolve(path, anchor, now, path.length);
    result.upgrade = this.moves === 5 || this.moves === 12;
    return result;
  }

  activate(now) {
    if (this.charge < 100 || this.isDriving(now)) return null;
    this.charge = 0;
    this.driveUntil = now + this.driveDuration;
    const cores = this.board.flatMap((piece, index) => piece.core ? [index] : []);
    return cores.length ? this.resolve(cores, -1, now, 0) : null;
  }

  resolve(path, anchor, now, chainLength) {
    const targets = new Set(path);
    targets.delete(anchor);
    const blasts = [];

    // A Set iterator also visits positions appended by a blast, allowing cores to chain.
    for (const index of targets) {
      const piece = this.board[index];
      if (!piece.core) continue;
      const radius = piece.core + Number(this.upgrades.has('wide'));
      const row = Math.floor(index / SIZE);
      const col = index % SIZE;
      blasts.push({ index, radius, color: piece.color });
      for (let y = Math.max(0, row - radius); y <= Math.min(SIZE - 1, row + radius); y++) {
        for (let x = Math.max(0, col - radius); x <= Math.min(SIZE - 1, col + radius); x++) {
          if (y * SIZE + x !== anchor) targets.add(y * SIZE + x);
        }
      }
    }

    const removed = Array.from(targets, (index) => ({ index, color: this.board[index].color }));
    const chainPoints = chainLength * 24 + Math.max(0, chainLength - 3) ** 2 * 22;
    const chainBonus = chainLength >= 5 && this.upgrades.has('chain') ? Math.round(chainPoints * 0.5) : 0;
    const blastPoints = Math.max(0, removed.length - path.length + Number(anchor >= 0)) * 19 + blasts.length * 38;
    this.combo = Math.min(9, this.comboAt(now) + 1);
    this.lastClear = now;
    const multiplier = this.multiplier(now) * (this.isDriving(now) ? 2 : 1);
    const points = Math.round((chainPoints + chainBonus + blastPoints) * multiplier);
    this.score += points;
    this.cleared += removed.length;
    if (!this.isDriving(now)) {
      const gain = removed.length * 3 + Number(anchor >= 0) * 8 + blasts.length * 5;
      this.charge = Math.min(100, this.charge + Math.ceil(gain * (this.upgrades.has('surge') ? 1.5 : 1)));
    }

    for (const index of targets) this.board[index] = null;
    const core = anchor >= 0 ? this.piece(this.board[anchor].color, chainLength >= 8 ? 2 : 1) : null;
    if (core) this.board[anchor] = core;
    const falls = this.collapse();
    const reshuffled = !findMove(this.board);
    if (reshuffled) this.board = this.newBoard();
    return { removed, blasts, falls, coreId: core?.id ?? -1, points, multiplier, chainLength, reshuffled };
  }

  collapse() {
    const falls = new Map();
    for (let col = 0; col < SIZE; col++) {
      let dest = SIZE - 1;
      for (let row = SIZE - 1; row >= 0; row--) {
        const piece = this.board[row * SIZE + col];
        if (!piece) continue;
        this.board[dest * SIZE + col] = piece;
        if (dest !== row) falls.set(piece.id, dest - row);
        dest--;
      }
      const missing = dest + 1;
      for (; dest >= 0; dest--) {
        const piece = this.piece();
        this.board[dest * SIZE + col] = piece;
        falls.set(piece.id, missing);
      }
    }
    return falls;
  }
}
