/* 하위 페이지 공용: 하위 메뉴 탭, 주소창 상태(?page=·?q=·?id=), 쪽 번호, 검색 상자 */
(function (KFL) {
  KFL.renderSubnav = function (page) {
    var group = KFL.MENU.filter(function (g) { return g.label === page.cat; })[0];
    var list = KFL.$('#subnav-list');
    if (!group || !group.items) { list.parentNode.parentNode.hidden = true; return; }
    var current = page.parent || page.slug;
    // 주 메뉴에서도 지금 있는 분류를 표시
    KFL.$$('.gnb-btn').forEach(function (btn) { if (btn.textContent.trim() === page.cat) btn.setAttribute('data-current', ''); });
    list.innerHTML = group.items.map(function (it) {
      var on = KFL.slug(it.href) === current;
      return '<li>' + (on
        ? '<a href="' + KFL.esc(KFL.url(it.href)) + '" aria-current="page">' + KFL.esc(it.label) + '</a>'
        : KFL.link(it.href, it.label, '', it.external)) + '</li>';
    }).join('');
    var cur = KFL.$('[aria-current="page"]', list);
    // 현재 탭이 보이도록 탭 띠만 가로로 옮긴다(페이지 전체는 움직이지 않게)
    if (cur) list.scrollLeft = cur.offsetLeft - (list.clientWidth - cur.offsetWidth) / 2;
  };

  /* 주소창 쿼리 읽기·쓰기 */
  KFL.query = function () {
    var out = {};
    location.search.replace(/^\?/, '').split('&').forEach(function (kv) {
      if (!kv) return;
      var p = kv.split('=');
      out[decodeURIComponent(p[0])] = decodeURIComponent((p[1] || '').replace(/\+/g, ' '));
    });
    return out;
  };
  KFL.setQuery = function (q, push) {
    var s = Object.keys(q).filter(function (k) { return q[k] !== '' && q[k] != null && !(k === 'page' && +q[k] === 1); })
      .map(function (k) { return encodeURIComponent(k) + '=' + encodeURIComponent(q[k]); }).join('&');
    var url = location.pathname + (s ? '?' + s : '');
    try { history[push ? 'pushState' : 'replaceState'](null, '', url); } catch (e) { /* 미리보기 등 */ }
  };

  /* 쪽 번호: 현재 앞뒤 2쪽 + 처음·끝 */
  KFL.pager = function (page, pages) {
    if (pages <= 1) return '';
    var nums = [];
    for (var i = 1; i <= pages; i++) {
      if (i === 1 || i === pages || Math.abs(i - page) <= 2) nums.push(i);
      else if (nums[nums.length - 1] !== '…') nums.push('…');
    }
    return '<nav class="pager" aria-label="쪽 이동">' +
      '<button type="button" data-page="' + (page - 1) + '"' + (page === 1 ? ' disabled' : '') + ' aria-label="이전 쪽">' + KFL.icon('prev') + '</button>' +
      nums.map(function (n) {
        if (n === '…') return '<span class="gap" aria-hidden="true">…</span>';
        return '<button type="button" data-page="' + n + '"' + (n === page ? ' aria-current="page"' : '') + ' aria-label="' + n + '쪽">' + n + '</button>';
      }).join('') +
      '<button type="button" data-page="' + (page + 1) + '"' + (page === pages ? ' disabled' : '') + ' aria-label="다음 쪽">' + KFL.icon('next') + '</button></nav>';
  };

  KFL.searchBox = function (id, label, value, placeholder) {
    return '<form class="list-search" role="search" data-search>' +
      '<label for="' + id + '" class="sr-only">' + KFL.esc(label) + '</label>' +
      '<input id="' + id + '" type="search" name="q" value="' + KFL.esc(value || '') + '" placeholder="' + KFL.esc(placeholder || label) + '" autocomplete="off">' +
      '<button type="submit">검색</button></form>';
  };

  /* 목록 화면 공통 흐름: 검색어·쪽 상태를 주소창에 두고 다시 그린다 */
  KFL.listView = function (opts) {
    var root = opts.root;
    var q = KFL.query();
    var state = { q: q.q || '', page: Math.max(1, parseInt(q.page, 10) || 1), filter: q.f || '' };

    function draw(focusTop) {
      var items = opts.filter(state);
      var pages = Math.max(1, Math.ceil(items.length / opts.per));
      state.page = Math.min(state.page, pages);
      var slice = items.slice((state.page - 1) * opts.per, state.page * opts.per);
      root.innerHTML =
        '<div class="list-tools">' + (opts.tools ? opts.tools(state) : '') +
        KFL.searchBox(opts.id + '-q', opts.searchLabel, state.q, opts.placeholder) + '</div>' +
        '<p class="list-count" role="status">' + (state.q ? '“' + KFL.esc(state.q) + '” 검색 결과 ' : '전체 ') +
        '<b>' + items.length.toLocaleString() + '</b>' + opts.unit + (pages > 1 ? ' · ' + state.page + ' / ' + pages + '쪽' : '') + '</p>' +
        (slice.length ? opts.render(slice, state) : '<p class="empty">검색 결과가 없습니다.</p>') +
        KFL.pager(state.page, pages);
      KFL.setQuery({ q: state.q, page: state.page, f: state.filter });
      if (focusTop) {
        var c = KFL.$('.list-count', root);
        c.setAttribute('tabindex', '-1');
        c.focus({ preventScroll: true });
        window.scrollTo({ top: root.getBoundingClientRect().top + window.scrollY - 16 });
      }
    }

    root.addEventListener('submit', function (e) {
      if (!e.target.matches('[data-search]')) return;
      e.preventDefault();
      state.q = e.target.q.value.trim();
      state.page = 1;
      draw();
      var input = KFL.$('#' + opts.id + '-q');
      if (input) input.focus();
    });
    root.addEventListener('click', function (e) {
      var b = e.target.closest('[data-page]');
      if (b && !b.disabled) { state.page = +b.dataset.page; draw(true); }
    });
    root.addEventListener('change', function (e) {
      if (!e.target.matches('[data-filter]')) return;
      state.filter = e.target.value;
      state.page = 1;
      draw();
      var sel = KFL.$('[data-filter]', root);
      if (sel) sel.focus();
    });
    draw();
  };

  /* 제목·본문 검색용 정규화 */
  KFL.has = function (hay, q) {
    return !q || String(hay).toLowerCase().indexOf(q.toLowerCase()) !== -1;
  };
})(window.KFL);
