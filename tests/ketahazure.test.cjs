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
  const { G, L, UI, CARDS, api } = window.KETA;
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
  function tap(id) {
    const button = UI.regs.find(region => region.id === id);
    assert.ok(button, id);
    const rect = canvas.getBoundingClientRect();
    const event = {
      isPrimary: true, button: 0, pointerType: 'touch', pointerId: 1, preventDefault() {},
      clientX: (button.x + button.w / 2) * rect.width / 540,
      clientY: (button.y + button.h / 2) * rect.height / (L.trayY + L.trayH),
    };
    events.pointerdown(event);
    events.pointerup(event);
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
  return { G, api, drop, settle, render, collect, labels };
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
