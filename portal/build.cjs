const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const {games, ui} = require('./catalog.js');
const e = value => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const tx = (key, tag = 'span', extra = '') => `<${tag} data-mt-i18n="${key}"${extra}>${e(ui.ja[key].replace('{total}', String(games.length)))}</${tag}>`;
const categories = ['all', 'puzzle', 'party', 'learn', 'casual'];
const html = `<div class="mt-portal" id="mt-portal" lang="ja">
  <div class="mt-indexline"><span>MAINICHI TOOLBOX / PLAY &amp; LEARN</span>${tx('total')}</div>
  <section class="mt-hero" aria-labelledby="mt-hero-title">
    <div class="mt-hero-copy">
      ${tx('kicker','p',' class="mt-eyebrow"')}
      <h2 id="mt-hero-title">${tx('heroFirst')}${tx('heroLast')}</h2>
      ${tx('intro','p',' class="mt-intro"')}
      <a class="mt-primary" href="#games">${tx('browse')}<span aria-hidden="true">↘</span></a>
      <div class="mt-facts">${tx('free')}${tx('browser')}</div>
    </div>
    <a class="mt-feature" data-mt-game="WaterSortPuzzle" href="https://kouheim1979.github.io/games/WaterSortPuzzle/">
      <div class="mt-feature-top">${tx('featured')}<span aria-hidden="true">PICK / 01</span></div>
      <div class="mt-feature-visual" aria-hidden="true">
        <div class="mt-bottle"><i class="mt-purple"></i><i class="mt-orange"></i><i class="mt-lime"></i><i class="mt-purple"></i></div>
        <div class="mt-bottle"><i class="mt-lime"></i><i class="mt-lime"></i><i class="mt-lime"></i></div>
        <div class="mt-bottle"><i class="mt-orange"></i><i class="mt-purple"></i><i class="mt-orange"></i></div>
      </div>
      ${tx('featureDetail','h3')}${tx('featureCopy','p')}
      <div class="mt-feature-bottom">${tx('featurePlay')}<span aria-hidden="true">↗</span></div>
    </a>
  </section>
  <section class="mt-library" id="games" aria-labelledby="mt-library-title">
    <div class="mt-section-heading"><div>${tx('library','h2',' id="mt-library-title"')}${tx('libraryIntro','p')}</div><span id="mt-results" class="mt-result" role="status" aria-live="polite">${games.length}本のゲーム</span></div>
    <div class="mt-controls">
      <div class="mt-filters" role="group" aria-label="Categories">${categories.map((cat, i) => `<button type="button" data-mt-category="${cat}" aria-pressed="${i===0}">${tx(cat)}<span class="mt-count">${cat==='all'?games.length:games.filter(g=>g.groups.includes(cat)).length}</span></button>`).join('')}</div>
      <div class="mt-searchbox"><label for="mt-search" class="mt-sr" data-mt-i18n="search">${e(ui.ja.search)}</label><input type="search" id="mt-search" autocomplete="off" placeholder="${e(ui.ja.search)}" aria-label="${e(ui.ja.search)}"><button id="mt-clear" type="button" aria-label="${e(ui.ja.clear)}" hidden>×</button></div>
    </div>
    <div class="mt-gamegrid">${games.map((g, i) => `<article class="mt-game" data-mt-card="${g.id}">
      <a class="mt-card-art mt-${g.color}" href="${g.url}" data-mt-game="${g.id}" aria-label="${e(g.title.ja)}"><span aria-hidden="true">${e(g.icon)}</span><small aria-hidden="true">${String(i+1).padStart(2,'0')} / PLAY</small></a>
      <div class="mt-card-body"><div class="mt-card-tag">${tx(g.groups[0])}</div><h3><a data-mt-game="${g.id}" href="${g.url}" data-mt-title="${g.id}">${e(g.title.ja)}</a></h3><div class="mt-original-title" data-mt-original-title="${g.id}" lang="ja" hidden>${e(g.title.ja)}</div><p class="mt-card-description" data-mt-description="${g.id}">${e(g.description.ja)}</p><div class="mt-card-bottom">${tx('original','span',' class="mt-card-language"')}<a class="mt-playlink" href="${g.url}" data-mt-game="${g.id}">${tx('play')}<span aria-hidden="true">↗</span></a></div></div>
    </article>`).join('')}</div>
    <div id="mt-empty" class="mt-empty" hidden>${tx('empty','p')}<button id="mt-reset" type="button" data-mt-i18n="reset">${e(ui.ja.reset)}</button></div>
    ${tx('originalNote','p',' class="mt-language-note"')}
  </section>
  <section class="mt-help" aria-labelledby="mt-help-title">${tx('helpTitle','h2',' id="mt-help-title"')}<div class="mt-helpgrid">${[1,2,3].map(n=>`<div><div class="mt-step">0${n}</div>${tx('help'+n,'h3')}${tx('help'+n+'p','p')}</div>`).join('')}</div></section>
  <footer class="mt-footer"><div>${tx('brand','div',' class="mt-footer-brand"')}${tx('footer','p')}</div><nav class="mt-footer-links" aria-label="Site information">${[['about','about'],['contact','contact'],['privacy','privacy'],['advertising','advertising']].map(([key,slug])=>`<a data-mt-i18n="${key}" href="https://everydayjapanlab.blogspot.com/p/${slug}.html">${e(ui.ja[key].replace('{total}', String(games.length)))}</a>`).join('')}</nav></footer>
  ${tx('made','p',' class="mt-made"')}
  <dialog id="mt-player" aria-labelledby="mt-player-title" aria-describedby="mt-frame-hint">
    <div class="mt-player-header"><div><h2 id="mt-player-title"></h2><p id="mt-player-description"></p></div><button id="mt-close" type="button" aria-label="${e(ui.ja.close)}">×</button></div>
    <div class="mt-player-tools"><a id="mt-new-tab" target="_blank" rel="noopener noreferrer" data-mt-i18n="newTab">${e(ui.ja.newTab)}</a><button id="mt-fullscreen" type="button" data-mt-i18n="fullscreen">${e(ui.ja.fullscreen)}</button>${tx('original')}</div>
    <p id="mt-road-note" data-mt-i18n="road" hidden></p>
    <div id="mt-frame-wrap"><div id="mt-loading" role="status" data-mt-i18n="loading"></div></div>
    <p id="mt-frame-hint" data-mt-i18n="frameHint">${e(ui.ja.frameHint)}</p>
  </dialog>
</div>`;
fs.writeFileSync(path.join(__dirname, 'portal.html'), html+'\n');
const css = fs.readFileSync(path.join(__dirname,'portal.css'),'utf8');
const catalog = fs.readFileSync(path.join(__dirname,'catalog.js'),'utf8');
const script = fs.readFileSync(path.join(__dirname,'portal.js'),'utf8');
const standalone = `<!doctype html>
<html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#f8f6ef"><meta name="description" content="まいにち道具箱。パズル・家族ゲーム・学びのクイズなど、${games.length}本の無料ブラウザーゲーム。日本語・English・中文・Españolでゲームを探せます。"><title>まいにち道具箱 | 暮らしと学びの無料アプリ</title><link rel="stylesheet" href="./portal/portal.css?v=20261104.1"><script src="./portal/catalog.js?v=20261104.1" defer></script><script src="./portal/portal.js?v=20261104.1" defer></script></head>
<body class="mt-standalone"><header id="mt-site-header"><h1>まいにち道具箱</h1><p>暮らしと学びの無料アプリ</p></header>${html}<noscript><p style="padding:20px;text-align:center">ゲーム名のリンクから直接開けます。言語切り替えと検索にはJavaScriptが必要です。</p></noscript></body></html>`;
fs.writeFileSync(path.join(root,'index.html'), standalone);
const oldWidgetPath = path.join(root,'deployment/blogger-widget-before-20261104.html');
if (fs.existsSync(oldWidgetPath)) {
  const before = fs.readFileSync(oldWidgetPath,'utf8');
  const styleEnd = before.indexOf('</style>');
  if (styleEnd<0) throw new Error('Original widget stylesheet not found');
  const originalStyles = before.slice(0,styleEnd+8);
  const scripts = [...before.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)];
  if (scripts.length!==1) throw new Error('Unexpected original widget script layout');
  const marker = '// The homepage markup is inert on article/tool pages;';
  const split = scripts[0][1].indexOf(marker);
  if (split<0) throw new Error('Original homepage mount marker not found');
  const toolsScript = scripts[0][1].slice(0,split);
  // Blogger rewrites raw Unicode punctuation in raw-text nodes as HTML entities.
  // JS/CSS escapes keep the source ASCII while retaining the intended Unicode UI.
  const asciiJS = source => source.replace(/[^\x00-\x7f]/gu, char => {
    const cp = char.codePointAt(0);
    if (cp <= 0xffff) return '\\u' + cp.toString(16).padStart(4,'0');
    const n = cp - 0x10000;
    return '\\u' + (0xd800 + (n >> 10)).toString(16) + '\\u' + (0xdc00 + (n & 0x3ff)).toString(16);
  });
  const asciiCSS = css.replace(/[^\x00-\x7f]/gu, char => '\\' + char.codePointAt(0).toString(16) + ' ');
  const widget = originalStyles + '\n<style>\n' + asciiCSS + '\n</style>\n<template id="mt-portal-template">'+html+'</template>\n<script>\n'+asciiJS(toolsScript+'\n'+catalog+'\n'+script)+'\n</script>\n';
  fs.writeFileSync(path.join(root,'deployment/blogger-widget.html'),widget);
}
console.log(JSON.stringify({games:games.length,languages:Object.keys(ui),htmlBytes:Buffer.byteLength(html),indexBytes:Buffer.byteLength(standalone),bloggerWidget:fs.existsSync(path.join(root,'deployment/blogger-widget.html'))}));
