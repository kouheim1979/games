const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const html = fs.readFileSync(path.join(__dirname, '../ketahazure/index.html'), 'utf8');
const gameScript = new vm.Script(html.match(/<script>([\s\S]*?)<\/script>/)[1]);

function bootGame() {
  const labels = [], events = {};
  const gradient = { addColorStop() {} };
  const context = new Proxy({
    fillText: text => labels.push(text),
    measureText: text => ({ width: [...text].length * 18 }),
    createLinearGradient: () => gradient,
    createRadialGradient: () => gradient,
  }, {
    get: (target, prop) => target[prop] ?? (() => {}),
  });
  const canvas = {
    style: {}, dataset: {}, content: { firstElementChild: {} },
    getContext: () => context,
    getBoundingClientRect() {
      return { left: 0, top: 0, width: parseFloat(this.style.width), height: parseFloat(this.style.height) };
    },
    querySelector() { return this; },
    querySelectorAll: () => [],
    addEventListener: (event, fn) => { events[event] = fn; },
  };
  const window = {
    innerWidth: 390, innerHeight: 844, devicePixelRatio: 2, performance,
    document: { getElementById: () => canvas, createElement: () => canvas, addEventListener() {} },
    addEventListener() {}, requestAnimationFrame() {},
    localStorage: { getItem: () => null, setItem() {} },
  };
  window.window = window;
  gameScript.runInNewContext(window);
  const { G, L, UI, CARDS, SAVE, api } = window.KETA;
  api.startRun();

  function drop(x = 119) {
    G.dropCd = 0;
    assert.ok(api.dropBall(x));
    return G.balls.at(-1);
  }
  function settle(balls, values, x = 119) {
    balls.forEach((ball, i) => Object.assign(ball, { x, y: L.pocketTop + 28, vx: 0, vy: 0, v: values[i] }));
    api.update(1 / 60);
    assert.ok(balls.every(ball => ball.dead), 'each test ball lands via the physics update');
  }
  function render() {
    labels.length = 0;
    api.render();
  }
  function pointer(eventType, x, y, pointerId = 1) {
    const rect = canvas.getBoundingClientRect();
    const event = {
      isPrimary: true, button: 0, pointerType: 'touch', pointerId, preventDefault() {},
      clientX: x * rect.width / 540,
      clientY: y * rect.height / (L.trayY + L.trayH),
    };
    events[eventType](event);
  }
  function tap(id) {
    const button = UI.regs.find(region => region.id === id);
    assert.ok(button, id);
    const x = button.x + button.w / 2, y = button.y + button.h / 2;
    pointer('pointerdown', x, y);
    pointer('pointerup', x, y);
  }
  function collect(cards, nextStage) {
    render();
    assert.ok(labels.some(text => text.startsWith('次へすすむ') && text.includes('札 ' + cards + '枚')));
    tap('next');
    assert.equal(G.clearInfo.cards, cards);
    api.afterClear();
    if (G.phase === 'ending') {
      G.clearT = 2;
      render();
      tap('more');
    }
    const card = CARDS.find(entry => entry.id === 'reroll');
    for (let left = cards; left > 0; left--) {
      assert.equal(G.phase, 'reward');
      G.offer = [{ c: card, name: card.name, desc: card.desc, g: card.g }];
      render();
      assert.ok(labels.some(text => text.includes('札 あと ' + left + '枚')));
      tap('card0');
    }
    assert.equal(G.phase, 'play');
    assert.equal(G.stage, nextStage);
  }
  return { G, L, CARDS, SAVE, api, drop, settle, render, pointer, tap, collect, labels };
}

test('a landing just below the quota displays a lower score and awards no extra card', () => {
  const { G, api, drop, settle, render, collect, labels } = bootGame();
  api.startStage(10);
  settle([drop()], [249999]);
  render();
  assert.ok(labels.includes('+24万9千'));
  assert.ok(labels.includes('25万'));
  assert.equal(G.cleared, false);
  settle([drop()], [1]);
  assert.equal(G.cleared, true);
  collect(1, 11);
});

test('the displayed quota and mathematically equal pocket scores qualify at the boundary', () => {
  const { G, api, drop, settle, render, collect, labels } = bootGame();
  api.startStage(36);
  settle([drop()], [2e98 * (1 - 1e-12)]);
  render();
  assert.ok(labels.includes('+1.99×10の98乗'));
  assert.equal(G.cleared, false);

  api.startStage(32);
  settle([drop()], [1e72]);
  assert.equal(G.cleared, true);
  render();
  assert.ok(labels.includes('一発突破　札 +1枚'));
  collect(2, 33);

  api.startStage(1);
  G.rate = 1 - Number.EPSILON;
  assert.ok(G.quota / 3 * 3 * G.rate < G.quota);
  settle([drop()], [G.quota / 3], 43);
  collect(2, 2);
});

test('a second drop never earns the one-shot bonus, including when it lands first', () => {
  const { G, drop, settle, render, collect, labels } = bootGame();
  settle([drop()], [100]);
  settle([drop()], [G.quota]);
  render();
  assert.ok(labels.includes('1投目の合計 100'));
  assert.ok(!labels.includes('一発突破　札 +1枚'));
  collect(1, 2);

  const first = drop(), second = drop();
  settle([second], [G.quota]);
  assert.equal(G.cleared, true);
  render();
  assert.ok(!labels.includes('一発突破　札 +1枚'));
  settle([first], [100]);
  collect(1, 3);

  const firstOfStage3 = drop(), secondOfStage3 = drop();
  settle([secondOfStage3], [G.quota]);
  settle([firstOfStage3], [G.quota]);
  collect(2, 4);
});

test('a single launch counts its split balls and all of its twin balls', () => {
  const { G, api, drop, settle, render, labels, collect } = bootGame();
  const peg = G.grid[1][3], ball = drop(peg.x);
  assert.equal(peg.type, 's');
  Object.assign(ball, { y: peg.y - 22, vx: 0, vy: 380 });
  api.update(1 / 60);
  assert.equal(G.balls.length, 2);
  const splitBall = G.balls.find(other => other !== ball);
  settle([ball], [190]);
  assert.equal(G.firstShotScore, 190);
  settle([splitBall], [(7406 - G.score) / G.rate]);
  assert.equal(G.ballsLeft, 4);
  assert.equal(G.firstShotScore, 7406);
  render();
  assert.ok(labels.includes('一発突破　札 +1枚'));
  collect(2, 2);

  G.rel.twin = 1;
  const twin = drop(), original = G.balls[0];
  assert.equal(G.balls.length, 2);
  settle([twin, original], [G.quota * 0.49, G.quota * 0.49]);
  collect(2, 3);
});

test('festival balls count when the first launch filled the gauge on its own', () => {
  const { G, api, drop, settle, collect } = bootGame();
  function charge(ball) {
    const peg = G.grid[0][0];
    // 玉が釘を打ったときに残り1目盛りをため、通常の更新処理で祭りを始める。
    G.fever.gauge = G.fever.need - 1;
    Object.assign(ball, { x: peg.x, y: peg.y - 22, vx: 0, vy: 380 });
    api.update(1 / 60);
    assert.ok(G.fever.on);
    Object.assign(G.fever, { total: 1, spawnT: 0 });
    api.update(1 / 60);
    return G.balls.find(other => other.fever);
  }

  const first = drop();
  const festivalBall = charge(first);
  assert.ok(festivalBall);
  settle([first, festivalBall], [G.quota * 0.49, G.quota * 0.49]);
  collect(2, 2);

  const early = drop(), late = drop();
  const laterFestivalBall = charge(late);
  assert.ok(laterFestivalBall);
  settle([early, late, laterFestivalBall], [100, 100, G.quota]);
  assert.equal(G.firstShotScore, 100);
  collect(1, 3);
});

test('each stage awards its first ball and the flyover bonus independently', () => {
  const { G, api, drop, settle, collect } = bootGame();
  settle([drop(), drop()], [G.quota, G.quota]);
  collect(2, 2);

  settle([drop()], [G.quota]);
  collect(2, 3);

  settle([drop()], [api.quotaFor(4) * 100]);
  collect(3, 5);

  settle([drop(), drop()], [G.quota * 0.49, G.quota * 0.49]);
  collect(1, 6);
  assert.equal(G.picks.length, 8);
});

test('a charm is confirmed and applied by a single tap', () => {
  const { G, CARDS, api, render, tap } = bootGame();
  api.stageClear();
  api.afterClear();
  const charm = CARDS.find(card => card.id === 'ball');
  G.offer = [{ c: charm, name: charm.name, desc: charm.desc, g: charm.g }];
  render();
  tap('card0');
  assert.equal(G.rel.ball, 1);
  assert.equal(G.stage, 2);
  assert.deepEqual(Array.from(G.picks), ['ball']);
});

test('dragging into the lower cancel area keeps the ball and its first-shot eligibility', () => {
  const { G, L, pointer, render, labels } = bootGame();
  const y = L.row0 + 100, cancelY = L.trayY + L.trayH - 24;
  G.dropCd = 0;
  pointer('pointerdown', 270, y);
  render();
  assert.ok(labels.includes('キャンセル'));
  assert.ok(labels.includes('指をここまで動かしてはなす'));
  pointer('pointermove', 275, cancelY);
  render();
  assert.ok(labels.includes('ここで指をはなすと玉を落とさない'));
  pointer('pointerup', 275, cancelY);
  assert.equal(G.ballsLeft, G.ballsMax);
  assert.equal(G.balls.length, 0);
  render();
  assert.ok(!labels.includes('キャンセル'));

  pointer('pointerdown', 270, y);
  pointer('pointerup', 270, y);
  assert.equal(G.ballsLeft, G.ballsMax - 1);
  assert.equal(G.balls.length, 1);
  assert.ok(G.balls[0].firstShot);
});

test('moving from the cancel area back to the board allows a normal drop', () => {
  const { G, L, pointer } = bootGame();
  const y = L.row0 + 100;
  G.dropCd = 0;
  pointer('pointerdown', 100, y);
  pointer('pointermove', 100, L.trayY + L.trayH - 24);
  pointer('pointermove', 270, y);
  pointer('pointerup', 270, y);
  assert.equal(G.ballsLeft, G.ballsMax - 1);
  assert.equal(G.balls[0].x, G.grid[1][3].x);
});

test('releasing outside the board or cancelling pointer capture preserves the ball', () => {
  const { G, L, pointer } = bootGame();
  const y = L.row0 + 100;
  G.dropCd = 0;
  for (const [eventType, x] of [['pointerup', -10], ['pointercancel', 100], ['lostpointercapture', 100]]) {
    pointer('pointerdown', 100, y);
    assert.ok(G.aim.on);
    pointer(eventType, x, y);
    assert.equal(G.aim.on, false);
    assert.equal(G.ballsLeft, G.ballsMax);
  }
});

test('manual and automatic placement cap split lanterns at four while allowing upgrades', () => {
  const { G, CARDS, api, render, tap, labels } = bootGame();
  const [second, third, fourth, blocked] = G.pegs.filter(peg => peg.type === 'n');
  second.type = third.type = 's';
  api.stageClear();
  api.afterClear();
  const card = CARDS.find(entry => entry.id === 's2');
  G.offer = [{ c: card, name: '分裂ちょうちん', desc: '', lv: 1, n: 2 }];
  render();
  tap('card0');
  assert.equal(G.phase, 'place');
  assert.deepEqual(Array.from(G.picks), ['s2']);
  api.placeAt(fourth);
  api.placeAt(blocked);
  assert.equal(api.countType('s'), 4);
  assert.equal(blocked.type, 'n');
  assert.equal(G.placing.left, 1);
  assert.equal(api.suggestPeg('s').type, 's');
  render();
  assert.ok(labels.includes('盤面の分裂 4 / 4個'));
  tap('auto');
  assert.equal(G.stage, 2);
  assert.equal(api.countType('s'), 4);
  assert.ok(G.pegs.some(peg => peg.type === 's' && peg.lv === 2));
  for (const peg of G.pegs) if (peg.type === 's') peg.lv = 3;
  assert.equal(api.suggestPeg('s'), null);
  assert.ok(api.makeOffer(CARDS.length).every(o => o.c.t !== 's'));
});

test('every board has distinct peg positions and detects collisions at those positions', () => {
  const { G, SAVE, api, drop } = bootGame();
  const layouts = new Set();
  for (const board of ['classic', 'hourglass', 'river', 'fork']) {
    SAVE.board = board;
    api.startRun();
    assert.equal(G.board.id, board);
    assert.equal(G.pegs.length, 75);
    layouts.add(G.pegs.map(peg => peg.x).join(','));
    const peg = G.grid[7][3], ball = drop(peg.x);
    Object.assign(ball, { x: peg.x, y: peg.y - 22, vx: 0, vy: 380 });
    api.update(1 / 60);
    assert.equal(ball.lastPeg, peg.i);
  }
  assert.equal(layouts.size, 4);
  SAVE.board = 'unknown';
  api.startRun();
  assert.equal(G.board.id, 'classic');
});
