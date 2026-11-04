(function () {
  'use strict';
  const boot = () => {
    const data = window.MainichiCatalog;
    if (!data || document.documentElement.dataset.mainichiReady) return;
    document.documentElement.dataset.mainichiReady = '1';
    const {langs, games, ui} = data;
    const query = new URLSearchParams(location.search);
    let saved = '';
    try { saved = localStorage.getItem('mainichi:language') || ''; } catch (_) {}
    let lang = langs.includes(query.get('lang')) ? query.get('lang') : langs.includes(saved) ? saved : 'ja';
    let category = 'all';
    let search = '';
    let activeGame = null;
    let returnFocus = null;
    let loadTimer = 0;
    const $ = (s, root = document) => root.querySelector(s);
    const $$ = (s, root = document) => [...root.querySelectorAll(s)];
    const t = (key) => (ui[lang][key] || ui.ja[key] || key).replace('{total}', String(games.length));
    const portalTemplate = $('#mt-portal-template');
    const landing = !$('#mt-portal') && portalTemplate &&
      (location.pathname === '/' || /\/p\/(home|games)\.html$/.test(location.pathname));
    if (landing) {
      const main = $('main.centered-bottom');
      if (main) {
        const previous = $('#ejl-front-page');
        if (previous) previous.remove();
        main.prepend(portalTemplate.content.cloneNode(true));
        document.body.classList.add('ejl-front', 'mt-front');
      }
    }
    const portal = $('#mt-portal');
    const header = $('#mt-site-header') || $('.Header .header-widget') || $('.Header');
    if (header && !$('.mt-languagebar')) {
      const bar = document.createElement('div');
      bar.className = 'mt-languagebar';
      bar.setAttribute('role', 'group');
      bar.setAttribute('aria-label', 'Language');
      const label = document.createElement('span');
      label.className = 'mt-sr';
      label.dataset.mtI18n = 'language';
      bar.append(label);
      for (const [code, name] of [['ja', '日本語'], ['en', 'English'], ['zh', '中文'], ['es', 'Español']]) {
        const button = document.createElement('button');
        button.type = 'button';
        button.dataset.mtLang = code;
        button.lang = code === 'zh' ? 'zh-Hans' : code;
        button.textContent = name;
        bar.append(button);
      }
      header.append(bar);
    }
    // Blogger clones its header while scrolling; cloned buttons lose direct listeners.
    document.addEventListener('click', event => {
      const button = event.target.closest?.('.mt-languagebar [data-mt-lang]');
      if (button && langs.includes(button.dataset.mtLang)) changeLanguage(button.dataset.mtLang, true);
    });
    const pageMenu = $('#PageList1 ul');
    if (pageMenu && !$('.mt-game-nav', pageMenu)) {
      const li = document.createElement('li');
      li.className = 'mt-game-nav';
      const a = document.createElement('a');
      a.href = 'https://everydayjapanlab.blogspot.com/#games';
      a.dataset.mtI18n = 'games';
      li.append(a);
      const homeItem = $('li', pageMenu);
      if (homeItem) homeItem.after(li); else pageMenu.append(li);
    }
    const navKeys = {
      '/p/home.html': 'home', '/p/topics.html': 'guides', '/p/tools.html': 'tools',
      '/p/contact.html': 'contact', '/p/about.html': 'about', '/p/privacy.html': 'privacy',
      '/p/methodology.html': 'methodology', '/p/advertising.html': 'advertising'
    };
    $$('#PageList1 a, .ejl-menu a').forEach(a => {
      const key = navKeys[new URL(a.href, location.href).pathname];
      if (key) a.dataset.mtI18n = key;
    });
    const infoPage = $('[data-mt-info]');
    if (!portal && !infoPage) {
      const article = $('.post-body');
      if (article && !$('#mt-edition-note')) {
        const note = document.createElement('aside');
        note.id = 'mt-edition-note';
        note.className = 'mt-edition-note';
        const p = document.createElement('p');
        p.dataset.mtI18n = 'legacyNotice';
        const a = document.createElement('a');
        a.href = 'https://everydayjapanlab.blogspot.com/#games';
        a.dataset.mtI18n = 'backGames';
        note.append(p, a);
        article.prepend(note);
      }
    }
    const dialog = $('#mt-player');
    const cards = portal ? $$('.mt-game', portal) : [];
    const field = $('#mt-search');
    function gameURL(game) {
      // ゲーム側の i18n.js が ?lang= を読んで画面を切り替える
      try { const u = new URL(game.url); u.searchParams.set('lang', lang); return u.href; } catch (_) { return game.url; }
    }
    function filteredGames() {
      const normalized = search.normalize('NFKC').trim().toLocaleLowerCase();
      return games.filter(g => (category === 'all' || g.groups.includes(category)) &&
        (!normalized || [g.id, ...Object.values(g.title), ...Object.values(g.description), ...g.groups.map(k => t(k))]
          .join(' ').normalize('NFKC').toLocaleLowerCase().includes(normalized)));
    }
    function filterCards() {
      const visible = new Set(filteredGames().map(g => g.id));
      cards.forEach(card => { card.hidden = !visible.has(card.dataset.mtCard); });
      const results = $('#mt-results');
      if (results) results.textContent = t('results').replace('{count}', visible.size);
      const empty = $('#mt-empty');
      if (empty) empty.hidden = visible.size !== 0;
      const clear = $('#mt-clear');
      if (clear) clear.hidden = !search;
      $$('[data-mt-category]').forEach(button => {
        button.setAttribute('aria-pressed', String(button.dataset.mtCategory === category));
      });
    }
    function updateActiveGame() {
      if (!activeGame || !dialog) return;
      $('#mt-player-title').textContent = activeGame.title[lang];
      $('#mt-player-description').textContent = activeGame.description[lang];
      const newTab = $('#mt-new-tab'); if (newTab) newTab.href = gameURL(activeGame);
      $('#mt-game-frame')?.setAttribute('title', t('playing') + ': ' + activeGame.title[lang]);
      $('#mt-road-note').hidden = activeGame.id !== 'golden-week';
    }
    function changeLanguage(next, persist) {
      if (!langs.includes(next)) return;
      lang = next;
      document.documentElement.lang = next === 'zh' ? 'zh-Hans' : next;
      if (persist) {
        try { localStorage.setItem('mainichi:language', lang); } catch (_) {}
        const url = new URL(location.href);
        url.searchParams.set('lang', lang);
        try { history.replaceState(null, '', url); } catch (_) {}
      }
      $$('[data-mt-i18n]').forEach(el => { el.textContent = t(el.dataset.mtI18n); });
      $$('[data-mt-title]').forEach(el => {
        const game = games.find(g => g.id === el.dataset.mtTitle);
        if (game) el.textContent = game.title[lang];
      });
      $$('[data-mt-description]').forEach(el => {
        const game = games.find(g => g.id === el.dataset.mtDescription);
        if (game) el.textContent = game.description[lang];
      });
      for (const kind of ['steps', 'tip']) {
        $$('[data-mt-' + kind + ']').forEach(el => {
          const id = el.getAttribute('data-mt-' + kind);
          const guide = window.MainichiGuides?.[id]?.[lang];
          if (guide) el.textContent = guide[kind];
        });
      }
      if (infoPage) {
        $$('[data-mt-info-lang]', infoPage).forEach(section => {
          section.hidden = section.dataset.mtInfoLang !== lang;
          if (!section.hidden) {
            const title = section.dataset.mtPageTitle;
            const heading = $('.post-title');
            if (heading) heading.textContent = title;
            document.title = title + ' | ' + t('brand');
          }
        });
      }
      $$('[data-mt-original-title]').forEach(el => {
        const game = games.find(g => g.id === el.dataset.mtOriginalTitle);
        el.hidden = lang === 'ja' || game.title.ja === game.title[lang];
      });
      $$('.mt-card-art[data-mt-game]').forEach(link => {
        const game = games.find(g => g.id === link.dataset.mtGame);
        if (game) link.setAttribute('aria-label', game.title[lang]);
      });
      $('.mt-filters')?.setAttribute('aria-label', t('games'));
      $('.mt-footer-links')?.setAttribute('aria-label', t('about'));
      $$('[data-mt-lang]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.mtLang === lang)));
      $$('.mt-languagebar').forEach(bar => bar.setAttribute('aria-label', t('language')));
      $$('#mt-site-header h1, .Header h1, .Header h2').forEach(heading => {
        const title = $('a', heading) || heading;
        title.textContent = t('brand');
      });
      $$('#mt-site-header > p, .Header .header-widget > p, .Header .description').forEach(description => {
        description.textContent = t('subtitle');
      });
      if (portal) portal.lang = next === 'zh' ? 'zh-Hans' : next;
      if (portal) document.title = t('brand') + ' | ' + t('subtitle');
      if (field) {
        field.placeholder = t('search');
        field.setAttribute('aria-label', t('search'));
      }
      const clear = $('#mt-clear');
      if (clear) clear.setAttribute('aria-label', t('clear'));
      for (const a of $$('a[data-mt-i18n], #mt-portal .mt-tool-card a, #mt-portal .mt-footer a')) {
        const url = new URL(a.getAttribute('href'), location.href);
        if (url.hostname === 'everydayjapanlab.blogspot.com') {
          url.searchParams.set('lang', lang);
          a.href = url.href;
        }
      }
      const close = $('#mt-close');
      if (close) close.setAttribute('aria-label', t('close'));
      filterCards();
      updateActiveGame();
    }
    if (field) field.addEventListener('input', () => { search = field.value; filterCards(); });
    $('#mt-clear')?.addEventListener('click', () => { search = ''; field.value = ''; filterCards(); field.focus(); });
    $$('[data-mt-category]').forEach(button => button.addEventListener('click', () => {
      category = button.dataset.mtCategory;
      filterCards();
    }));
    $('#mt-reset')?.addEventListener('click', () => {
      category = 'all'; search = ''; field.value = ''; filterCards(); field.focus();
    });
    function closePlayer() {
      if (!dialog) return;
      if (document.fullscreenElement === dialog && document.exitFullscreen) document.exitFullscreen().catch(() => {});
      if (dialog.open) dialog.close();
      const frame = $('#mt-game-frame');
      if (frame) frame.remove();
      clearTimeout(loadTimer);
      document.body.classList.remove('mt-playing');
      activeGame = null;
      if (returnFocus && returnFocus.isConnected) returnFocus.focus();
      returnFocus = null;
    }
    function openGame(id, trigger) {
      const game = games.find(g => g.id === id);
      if (!game) return;
      if (!dialog || !dialog.showModal) { location.href = gameURL(game); return; }
      clearTimeout(loadTimer);
      $('#mt-game-frame')?.remove();
      activeGame = game;
      returnFocus = trigger || document.activeElement;
      $('#mt-new-tab').href = gameURL(game);
      const status = $('#mt-loading');
      status.hidden = false;
      status.textContent = t('loading');
      $('#mt-frame-hint').textContent = t('frameHint');
      updateActiveGame();
      const frame = document.createElement('iframe');
      frame.id = 'mt-game-frame';
      frame.title = t('playing') + ': ' + game.title[lang];
      frame.allow = 'fullscreen; autoplay';
      frame.allowFullscreen = true;
      frame.referrerPolicy = 'strict-origin-when-cross-origin';
      frame.addEventListener('load', () => { clearTimeout(loadTimer); status.hidden = true; });
      frame.src = gameURL(game);
      $('#mt-frame-wrap').append(frame);
      if (!dialog.open) dialog.showModal();
      document.body.classList.add('mt-playing');
      $('#mt-close').focus();
      loadTimer = setTimeout(() => { status.textContent = t('frameHint'); }, 12000);
    }
    $$('[data-mt-game]').forEach(link => link.addEventListener('click', event => {
      if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      openGame(link.dataset.mtGame, link);
    }));
    $('#mt-close')?.addEventListener('click', closePlayer);
    dialog?.addEventListener('cancel', event => { event.preventDefault(); closePlayer(); });
    dialog?.addEventListener('close', () => { if (activeGame) closePlayer(); });
    $('#mt-fullscreen')?.addEventListener('click', async () => {
      const frame = $('#mt-game-frame');
      if (!frame) return;
      try {
        if (dialog.requestFullscreen) await dialog.requestFullscreen();
        else throw new Error('Unsupported');
      } catch (_) { $('#mt-frame-hint').textContent = t('fullscreenError'); }
    });
    changeLanguage(lang, false);
    if (portal && games.some(g => g.id === query.get('game'))) openGame(query.get('game'), null);
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, {once:true});
  else boot();
}());

