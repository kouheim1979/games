/* games/i18n/i18n.js — 画面の日本語UIを英語・簡体字中国語・スペイン語に置き換える共通スクリプト。
 * 使い方: <script src="../i18n/dict/<game>.js"></script><script src="../i18n/i18n.js"></script> を <head> の先頭に置く。
 * 言語の決め方: ?lang= → まいにち道具箱の保存値(mainichi:language) → ブラウザ言語 → 日本語。
 * 辞書: window.I18N_DICT = { "日本語": ["English", "中文", "Español"], ... }  ({0} などは差し込み値)
 * 問題文・お題などの中身は辞書にないので日本語のまま残る。 */
(function () {
  'use strict';
  var LANGS = ['ja', 'en', 'zh', 'es'];
  var NAMES = { ja: '日本語', en: 'English', zh: '中文', es: 'Español' };
  var KEY = 'mainichi:language';
  var JP = /[぀-ヿ㐀-鿿]/;

  function store(get, v) { try { return get ? localStorage.getItem(KEY) : localStorage.setItem(KEY, v); } catch (e) { return null; } }
  function pickLang() {
    var q = null;
    try { q = new URLSearchParams(location.search).get('lang'); } catch (e) {}
    if (q && LANGS.indexOf(q) >= 0) { store(false, q); return q; }
    var s = store(true);
    if (s && LANGS.indexOf(s) >= 0) return s;
    var n = ((navigator.languages && navigator.languages[0]) || navigator.language || 'ja').toLowerCase();
    if (n.indexOf('ja') === 0) return 'ja';
    if (n.indexOf('zh') === 0) return 'zh';
    if (n.indexOf('es') === 0) return 'es';
    return 'en';
  }
  var lang = pickLang();
  window.I18N_LANG = lang;
  document.documentElement.setAttribute('lang', lang === 'zh' ? 'zh-CN' : lang);

  function setLang(l) {
    store(false, l);
    try { var u = new URL(location.href); u.searchParams.set('lang', l); location.href = u.toString(); }
    catch (e) { location.reload(); }
  }
  window.I18N_SET_LANG = setLang;

  /* ---- 言語切り替え（ポータルの iframe 内では出さない） ---- */
  function addSwitcher() {
    var inFrame = false;
    try { inFrame = window.top !== window.self; } catch (e) { inFrame = true; }
    if (inFrame || document.getElementById('i18n-switch')) return;
    var wrap = document.createElement('label');
    wrap.id = 'i18n-switch';
    wrap.setAttribute('data-i18n-skip', '');
    wrap.title = 'Language / 言語';
    // 小さな丸ボタン（🌐）。上に透明な select を重ねて、タップで言語一覧を出す
    wrap.style.cssText = 'position:fixed;left:4px;bottom:calc(4px + env(safe-area-inset-bottom,0px));z-index:2147483000;' +
      'width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;' +
      'background:rgba(20,20,30,.45);font:15px/1 system-ui,sans-serif;opacity:.6;cursor:pointer';
    var sel = document.createElement('select');
    sel.setAttribute('aria-label', 'Language / 言語');
    sel.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;opacity:0;cursor:pointer;font-size:16px';
    LANGS.forEach(function (l) {
      var o = document.createElement('option'); o.value = l; o.textContent = NAMES[l];
      if (l === lang) o.selected = true; sel.appendChild(o);
    });
    sel.addEventListener('change', function () { setLang(sel.value); });
    wrap.appendChild(document.createTextNode('🌐'));
    wrap.appendChild(sel);
    (document.body || document.documentElement).appendChild(wrap);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', addSwitcher); else addSwitcher();

  if (lang === 'ja') return;
  var col = LANGS.indexOf(lang) - 1;

  /* ---- 辞書 ---- */
  var exact = new Map(), patterns = [], frags = [];
  function norm(s) { return s.replace(/\s+/g, ' ').trim(); }
  function esc(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
  function load(dict) {
    Object.keys(dict || {}).forEach(function (k) {
      var v = dict[k]; if (!v) return;
      var t = typeof v === 'string' ? v : v[col];
      if (t == null) return;
      var nk = norm(k);
      if (/\{\d+\}/.test(nk)) {
        var idx = [];
        var re = '^' + nk.split(/(\{\d+\})/).map(function (p) {
          var m = /^\{(\d+)\}$/.exec(p); if (m) { idx.push(+m[1]); return '([\\s\\S]+?)'; } return esc(p);
        }).join('') + '$';
        patterns.push({ re: new RegExp(re), idx: idx, t: t, len: nk.replace(/\{\d+\}/g, '').length });
      } else {
        exact.set(nk, t);
        if (nk.length >= 2) frags.push(nk);
      }
    });
  }
  load(window.I18N_COMMON);
  load(window.I18N_DICT);
  patterns.sort(function (a, b) { return b.len - a.len; });
  frags.sort(function (a, b) { return b.length - a.length; });
  var fragRe = frags.length ? new RegExp(frags.map(esc).join('|'), 'g') : null;

  var cache = new Map();
  // 先頭・末尾の絵文字や記号（「🎮 」「 →」など）を外して本体だけ辞書を引く
  var LEADC = /[^\p{L}\p{N}「（(【『]/u, TRAILC = /[^\p{L}\p{N}」）)】』]/u;
  function edges(s) {
    var cs = Array.from(s), a = 0, b = cs.length;
    while (a < b && LEADC.test(cs[a])) a++;
    while (b > a && TRAILC.test(cs[b - 1])) b--;
    return [cs.slice(0, a).join(''), cs.slice(a, b).join(''), cs.slice(b).join('')];
  }

  function core(s, depth) {
    if (exact.has(s)) return exact.get(s);
    for (var i = 0; i < patterns.length; i++) {
      var p = patterns[i], m = p.re.exec(s);
      if (!m) continue;
      var out = p.t, ok = true;
      for (var j = 0; j < p.idx.length; j++) {
        var val = m[j + 1], tv = depth < 3 ? tr(val, depth + 1) : val;
        // 「{0}問」のように手がかりが短い型は、差し込み部分が訳せない日本語なら当てはめない
        if (p.len <= 2 && JP.test(tv)) { ok = false; break; }
        out = out.split('{' + p.idx[j] + '}').join(tv);
      }
      if (ok) return out;
    }
    return null;
  }
  function tr(s, depth) {
    depth = depth || 0;
    if (!s || !JP.test(s)) return s;
    if (cache.has(s)) return cache.get(s);
    var lead = s.match(/^\s*/)[0], trail = s.match(/\s*$/)[0];
    var n = norm(s), r = core(n, depth);
    if (r == null) {
      var m = edges(n);
      if (m[1] && (m[0] || m[2])) {
        var c = core(m[1], depth);
        if (c != null) r = m[0] + c + m[2];
      }
    }
    if (r == null && fragRe) {
      var f = n.replace(fragRe, function (x) { var t = exact.get(x); return t == null ? x : t; });
      if (!JP.test(f)) r = f;
    }
    var res = r == null ? s : lead + r + trail;
    if (cache.size > 20000) cache.clear();
    cache.set(s, res);
    return res;
  }
  window.I18N_T = function (s) { return tr(String(s)); };

  /* ---- DOM ---- */
  var SKIP = { SCRIPT: 1, STYLE: 1, TEXTAREA: 1, NOSCRIPT: 1, CODE: 1, PRE: 0 };
  var ATTRS = ['placeholder', 'title', 'aria-label', 'alt', 'data-tip', 'data-title', 'data-label'];
  function skipped(el) {
    for (; el && el.nodeType === 1; el = el.parentElement) {
      if (SKIP[el.tagName]) return true;
      if (el.hasAttribute('data-i18n-skip') || el.getAttribute('translate') === 'no' || el.isContentEditable) return true;
    }
    return false;
  }
  var doneText = new WeakMap(), doneAttr = new WeakMap(); // 自分で書き換えた値は再処理しない（無限ループ防止）
  function doText(t) {
    var v = t.nodeValue;
    if (!v || !JP.test(v) || doneText.get(t) === v) return;
    if (skipped(t.parentElement)) return;
    var r = tr(v);
    doneText.set(t, r);
    if (r !== v) t.nodeValue = r;
  }
  function doEl(el) {
    if (el.nodeType !== 1 || skipped(el)) return;
    for (var i = 0; i < ATTRS.length; i++) {
      var a = el.getAttribute(ATTRS[i]);
      if (a && JP.test(a)) {
        var d = doneAttr.get(el) || {}; if (d[ATTRS[i]] === a) continue;
        var r = tr(a); d[ATTRS[i]] = r; doneAttr.set(el, d); if (r !== a) el.setAttribute(ATTRS[i], r);
      }
    }
    if (el.tagName === 'INPUT' && /^(button|submit|reset)$/i.test(el.type) && JP.test(el.value)) { var tv = tr(el.value); if (tv !== el.value) el.value = tv; }
    if (el.tagName === 'META' && /^(description|apple-mobile-web-app-title|application-name)$/i.test(el.getAttribute('name') || '')) {
      var c = el.getAttribute('content'); if (c && JP.test(c)) { var tc = tr(c); if (tc !== c) el.setAttribute('content', tc); }
    }
  }
  function walkTree(root) {
    if (!root) return;
    if (root.nodeType === 3) { doText(root); return; }
    if (root.nodeType !== 1 && root.nodeType !== 9 && root.nodeType !== 11) return;
    if (root.nodeType === 1) { if (skipped(root)) return; doEl(root); }
    var w = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, null), n;
    while ((n = w.nextNode())) {
      if (n.nodeType === 3) doText(n); else doEl(n);
    }
  }
  function walkShadow(root) { // 開いた shadowRoot にも対応
    if (!root || !root.querySelectorAll) return;
    var all = root.querySelectorAll('*');
    for (var i = 0; i < all.length; i++) if (all[i].shadowRoot) { walkTree(all[i].shadowRoot); observe(all[i].shadowRoot); }
  }
  var mo = new MutationObserver(function (list) {
    for (var i = 0; i < list.length; i++) {
      var m = list[i];
      if (m.type === 'characterData') doText(m.target);
      else if (m.type === 'attributes') doEl(m.target);
      else for (var j = 0; j < m.addedNodes.length; j++) walkTree(m.addedNodes[j]);
    }
  });
  function observe(root) {
    mo.observe(root, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTRS.concat(['value', 'content']) });
  }
  observe(document.documentElement);
  walkTree(document.documentElement);
  function full() { walkTree(document.documentElement); walkShadow(document); if (JP.test(document.title)) document.title = tr(document.title); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', full);
  window.addEventListener('load', full);

  /* ---- ダイアログ・キャンバス ---- */
  ['alert', 'confirm', 'prompt'].forEach(function (f) {
    var o = window[f]; if (!o) return;
    window[f] = function (msg) { var a = Array.prototype.slice.call(arguments); if (typeof msg === 'string') a[0] = tr(msg); return o.apply(window, a); };
  });
  var C = window.CanvasRenderingContext2D && CanvasRenderingContext2D.prototype;
  if (C) ['fillText', 'strokeText', 'measureText'].forEach(function (f) {
    var o = C[f];
    C[f] = function (t) { var a = Array.prototype.slice.call(arguments); if (typeof t === 'string' && JP.test(t)) a[0] = tr(t); return o.apply(this, a); };
  });
})();
