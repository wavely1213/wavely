/* DOM 헬퍼와 공용 렌더 함수 */
(function (KFL) {
  /* 원본 경로 → 새 사이트 페이지 이름 (tools/sitelib.py slug_for 와 같은 규칙) */
  KFL.slug = function (href) {
    if (!href || /^https?:/.test(href)) return null;
    var m = href.match(/^brd_boardLoad\.action\?board_id=(\d+)/);
    return m ? 'board-' + m[1] : href.split('?')[0].replace('.action', '');
  };

  /* 배포본(KFL.LOCAL)은 만들어 둔 페이지로, 한 장짜리 미리보기는 원본으로 연결 */
  KFL.url = function (href) {
    if (/^https?:/.test(href)) return href;
    if (KFL.LOCAL) {
      var post = href.match(/^brd_boardRead\.action\?seq=(\d+)&board_id=(\d+)/);
      if (post) return 'board-' + post[2] + '.html?id=' + post[1];
      var news = href.match(/^mng_newsView\.action\?b_seq=(\d+)/);
      if (news) return 'mng_newsList.html?id=' + news[1];
      if (/^photoView\.action/.test(href)) return 'photo.html';
      var slug = KFL.slug(href);
      if (KFL.PAGES && KFL.PAGES[slug]) return slug + '.html';
    }
    return KFL.ORIGIN + href;
  };

  /* 첫 화면용 이미지: 빌드가 KFL.IMG(경로 → data URI 또는 배포 경로)를 넣어 준다 */
  KFL.img = function (path) {
    return (KFL.IMG && KFL.IMG[path]) || '../assets/img/' + path;
  };

  /* 아이콘 한 벌(선 2px, 24 격자). CSS 쪽 장식 자리는 tokens.css 의 --ico-* 를 쓴다 */
  var ICONS = {
    prev: 'M15 6l-6 6 6 6',
    next: 'M9 6l6 6-6 6',
    close: 'M6 6l12 12M18 6L6 18',
    play: 'M8 5.5v13l10-6.5z'
  };
  KFL.icon = function (name) {
    return '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="' + ICONS[name] + '"' +
      (name === 'play' ? ' fill="currentColor"' : '') + '/></svg>';
  };

  KFL.esc = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };

  KFL.$ = function (sel, root) { return (root || document).querySelector(sel); };
  KFL.$$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

  KFL.link = function (href, text, cls, external) {
    var url = KFL.url(href);
    var ext = external || /^https?:/.test(url);
    return '<a href="' + KFL.esc(url) + '"' + (cls ? ' class="' + cls + '"' : '') +
      (ext ? ' target="_blank" rel="noopener"' : '') + '>' + KFL.esc(text) +
      (ext ? '<span class="sr-only"> (새 창)</span>' : '') + '</a>';
  };

  KFL.findMenuItem = function (label) {
    for (var i = 0; i < KFL.MENU.length; i++) {
      var g = KFL.MENU[i];
      if (g.label === label && g.href) return g;
      var hit = (g.items || []).filter(function (it) { return it.label === label; })[0];
      if (hit) return hit;
    }
    return null;
  };

  /* 표: 접근성 있는 caption/scope, 많은 행은 "더 보기"로 나눠 표시 */
  KFL.table = function (opts) {
    var cols = opts.columns, rows = opts.rows, limit = opts.limit || rows.length;
    var numeric = function (c) { return c !== '이름' && c !== '팀명'; };
    var head = cols.map(function (c) {
      return '<th scope="col"' + (numeric(c) ? ' class="num"' : '') + '>' + KFL.esc(c) + '</th>';
    }).join('');
    var body = rows.map(function (r, i) {
      return '<tr' + (i >= limit ? ' hidden data-more' : '') + '>' + cols.map(function (c) {
        var v = r[c];
        if (c === '순위') return '<td class="num rank' + (v <= 3 ? ' top' : '') + '">' + KFL.esc(v) + '</td>';
        if (c === '이름') return '<th scope="row">' + KFL.esc(v) + '</th>';
        if (typeof v === 'number' && c.indexOf('경기당') === 0) v = v.toFixed(2);
        return '<td' + (numeric(c) ? ' class="num"' : '') + '>' + KFL.esc(v) + '</td>';
      }).join('') + '</tr>';
    }).join('');
    var empty = rows.length ? '' : '<p class="empty">기록이 없습니다.</p>';
    var more = rows.length > limit
      ? '<button type="button" class="btn-more" data-more-btn aria-expanded="false">전체 ' + rows.length + (cols.indexOf('이름') === -1 ? '팀' : '명') + ' 보기</button>'
      : '';
    return '<div class="table-wrap" tabindex="0" role="region" aria-label="' + KFL.esc(opts.caption) + '">' +
      '<table class="data"><caption class="sr-only">' + KFL.esc(opts.caption) + '</caption>' +
      '<thead><tr>' + head + '</tr></thead><tbody>' + body + '</tbody></table></div>' + empty + more;
  };

  /* "더 보기" 버튼: 같은 부모 안의 숨긴 행을 펼치고 접는다 */
  document.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-more-btn]');
    if (!btn) return;
    var open = btn.getAttribute('aria-expanded') !== 'true';
    KFL.$$('[data-more]', btn.parentNode).forEach(function (tr) { tr.hidden = !open; });
    btn.setAttribute('aria-expanded', String(open));
    if (!btn.dataset.label) btn.dataset.label = btn.textContent;
    btn.textContent = open ? '접기' : btn.dataset.label;
  });
})(window.KFL);
