/* DOM 헬퍼와 공용 렌더 함수 */
(function (KFL) {
  KFL.url = function (href) {
    return /^https?:/.test(href) ? href : KFL.ORIGIN + href;
  };

  KFL.esc = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };

  KFL.$ = function (sel, root) { return (root || document).querySelector(sel); };
  KFL.$$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

  KFL.link = function (href, text, cls, external) {
    var ext = external || /^https?:/.test(href);
    return '<a href="' + KFL.esc(KFL.url(href)) + '"' + (cls ? ' class="' + cls + '"' : '') +
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
