const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const {langs, games, ui} = require('../portal/catalog.js');

test('the published collection has 14 distinct games and none of the three exclusions', () => {
  assert.equal(games.length, 14);
  assert.equal(new Set(games.map(g => g.id)).size, 14);
  for (const id of ['kokon-tozai', 'golden-week', 'lunch-roulette']) {
    assert.ok(!games.some(g => g.id === id), id);
  }
  for (const game of games) {
    const url = new URL(game.url);
    assert.equal(url.origin, 'https://kouheim1979.github.io');
    assert.equal(url.pathname, '/games/' + game.id + '/');
    assert.ok(game.groups.length > 0);
    assert.ok(game.groups.every(g => ['puzzle','party','learn','casual'].includes(g)));
  }
});
test('all four language dictionaries and all game descriptions are complete', () => {
  assert.deepEqual(langs, ['ja','en','zh','es']);
  const keys = Object.keys(ui.ja).sort();
  for (const lang of langs) {
    assert.deepEqual(Object.keys(ui[lang]).sort(), keys);
    assert.ok(Object.values(ui[lang]).every(text => typeof text === 'string' && text.trim()));
    for (const game of games) {
      assert.ok(game.title[lang].trim());
      assert.ok(game.description[lang].trim());
    }
  }
});
test('static fallback links, card count and keys match the curated catalog', () => {
  const html = fs.readFileSync(path.join(root,'portal/portal.html'),'utf8');
  assert.equal((html.match(/class="mt-game" /g) || []).length, 14);
  for (const game of games) assert.ok(html.includes('href="' + game.url + '"'));
  for (const id of ['kokon-tozai','golden-week','lunch-roulette']) assert.ok(!html.includes('/' + id + '/'));
  for (const match of html.matchAll(/data-mt-i18n="([^"]+)"/g)) assert.ok(match[1] in ui.ja, match[1]);
  assert.ok(html.includes('aria-labelledby="mt-player-title"'));
  assert.ok(html.includes('id="mt-search"'));
});
test('Blogger bundle retains the live calculators and replaces the old landing mount', () => {
  const widget = fs.readFileSync(path.join(root,'deployment/blogger-widget.html'),'utf8');
  assert.ok(widget.includes('function heatPump(x)'));
  assert.ok(widget.includes('function stockpile(x)'));
  assert.ok(widget.includes('function readiness(x)'));
  assert.ok(widget.includes('id="mt-portal-template"'));
  assert.ok(!widget.includes('id="ejl-front-template"'));
  assert.ok(!widget.includes('Small details.'));
  const scripts = [...widget.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)];
  assert.equal(scripts.length, 1);
  assert.ok(!/[^\x00-\x7f]/.test(scripts[0][1]), 'Blogger-safe raw text must be ASCII');
  assert.doesNotThrow(() => new vm.Script(scripts[0][1]));
});
