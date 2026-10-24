/* 하위 페이지 종류별 화면: 글(html) · 게시판(board) · 뉴스(news) · 포토(photo) · 동영상(video) · 표(table) */
(function (KFL) {
  KFL.views = {};

  KFL.views.html = function (page, root) {
    root.innerHTML = '<article class="prose">' + page.html + '</article>';
  };

  /* ---------- 게시판·뉴스: 목록 + 글 보기 ---------- */
  function postView(page, root, id, listLabel) {
    root.innerHTML = '<p class="loading">불러오는 중…</p>';
    KFL.getJSON('data/site/posts/' + page.slug + '/' + id + '.json').then(function (p) {
      var list = page.posts;
      var i = list.map(function (x) { return x.id; }).indexOf(id);
      var newer = i > 0 ? list[i - 1] : null;
      var older = i >= 0 && i < list.length - 1 ? list[i + 1] : null;
      document.title = p.title + ' | ' + page.title + ' | 한국풋살연맹';
      root.innerHTML =
        '<article class="post">' +
        '<header class="post-head"><h2>' + KFL.esc(p.title) + '</h2>' +
        '<dl class="post-meta">' +
        (p.author ? '<div><dt>글쓴이</dt><dd>' + KFL.esc(p.author) + '</dd></div>' : '') +
        (p.date ? '<div><dt>작성일</dt><dd><time datetime="' + KFL.esc(p.date) + '">' + KFL.esc(p.date) + '</time></dd></div>' : '') +
        (p.views ? '<div><dt>조회</dt><dd>' + KFL.esc(p.views) + '</dd></div>' : '') +
        '</dl></header>' +
        (p.files.length ? '<section class="files" aria-label="첨부파일"><h3>첨부파일 ' + p.files.length + '</h3><ul>' + p.files.map(function (f) {
          return '<li><a href="' + KFL.esc(f.href) + '" target="_blank" rel="noopener">' + KFL.esc(f.name) + '<span class="sr-only"> (원본 사이트에서 내려받기)</span></a></li>';
        }).join('') + '</ul></section>' : '') +
        '<div class="prose post-body">' + (p.html || '<p class="empty">본문이 없습니다.</p>') + '</div>' +
        '</article>' +
        '<nav class="post-nav" aria-label="이전·다음 글">' +
        (newer ? '<a href="?id=' + newer.id + '"><span>다음 글</span>' + KFL.esc(newer.title) + '</a>' : '') +
        (older ? '<a href="?id=' + older.id + '"><span>이전 글</span>' + KFL.esc(older.title) + '</a>' : '') +
        '</nav><p class="back-row"><a class="btn" href="' + page.slug + '.html">' + listLabel + '</a></p>';
      var h = KFL.$('.post-head h2', root);
      h.setAttribute('tabindex', '-1');
      h.focus({ preventScroll: true });
    }, function () {
      root.innerHTML = '<p class="empty">글을 찾을 수 없습니다.</p><p class="back-row"><a class="btn" href="' + page.slug + '.html">' + listLabel + '</a></p>';
    });
  }

  KFL.views.board = function (page, root) {
    var id = KFL.query().id;
    if (id) return postView(page, root, id, '목록으로');
    var pinned = page.posts.filter(function (p) { return p.pinned; });
    var normal = page.posts.filter(function (p) { return !p.pinned; });
    KFL.listView({
      root: root, id: 'board', per: 15, unit: '건', searchLabel: '제목 검색', placeholder: '제목으로 검색',
      filter: function (s) {
        var hit = function (p) { return KFL.has(p.title, s.q); };
        return (s.q ? [] : pinned).concat(normal.filter(hit)).concat(s.q ? pinned.filter(hit) : []);
      },
      render: function (rows) {
        return '<ul class="board-list">' + rows.map(function (p) {
          return '<li' + (p.pinned ? ' class="pinned"' : '') + '>' +
            '<span class="no">' + (p.pinned ? '<span class="tag">상시</span>' : KFL.esc(p.no)) + '</span>' +
            '<a class="title" href="?id=' + p.id + '">' + KFL.esc(p.title) + '</a>' +
            '<span class="meta"><time datetime="' + p.date + '">' + p.date + '</time>' +
            (p.views != null ? '<span>조회 ' + p.views.toLocaleString() + '</span>' : '') + '</span></li>';
        }).join('') + '</ul>';
      }
    });
  };

  KFL.views.news = function (page, root) {
    var id = KFL.query().id;
    if (id) return postView(page, root, id, '뉴스 목록으로');
    KFL.listView({
      root: root, id: 'news', per: 10, unit: '건', searchLabel: '뉴스 검색', placeholder: '제목·요약으로 검색',
      filter: function (s) { return page.posts.filter(function (p) { return KFL.has(p.title + ' ' + p.summary, s.q); }); },
      render: function (rows) {
        return '<ul class="news-list">' + rows.map(function (p) {
          return '<li class="news-item">' +
            (p.img ? '<img src="' + p.img + '" alt="" loading="lazy">' : '<span class="noimg" aria-hidden="true"></span>') +
            '<div><h3><a href="?id=' + p.id + '">' + KFL.esc(p.title) + '</a></h3>' +
            (p.summary ? '<p>' + KFL.esc(p.summary) + '</p>' : '') +
            '<time datetime="' + p.date + '">' + p.date + '</time></div></li>';
        }).join('') + '</ul>';
      }
    });
  };

  /* ---------- 포토: 갤러리 + 크게 보기 ---------- */
  KFL.views.photo = function (page, root) {
    var shown = [];
    KFL.listView({
      root: root, id: 'photo', per: 24, unit: '장', searchLabel: '사진 제목 검색', placeholder: '제목으로 검색',
      filter: function (s) { return page.posts.filter(function (p) { return KFL.has(p.title, s.q); }); },
      render: function (rows) {
        shown = rows;
        return '<ul class="gallery">' + rows.map(function (p, i) {
          return '<li><button type="button" data-photo="' + i + '"><img src="' + p.img + '" alt="" loading="lazy">' +
            '<span class="cap">' + KFL.esc(p.title) + '</span></button></li>';
        }).join('') + '</ul>';
      }
    });
    var dlg = document.createElement('dialog');
    dlg.className = 'lightbox';
    dlg.setAttribute('aria-label', '사진 크게 보기');
    document.body.appendChild(dlg);
    var at = 0;
    function show(i) {
      at = (i + shown.length) % shown.length;
      var p = shown[at];
      dlg.innerHTML = '<figure><img src="' + p.img + '" alt="' + KFL.esc(p.title) + '"><figcaption>' + KFL.esc(p.title) +
        ' <span>(' + (at + 1) + ' / ' + shown.length + ')</span></figcaption></figure>' +
        '<button type="button" class="lb-prev" data-step="-1" aria-label="이전 사진">‹</button>' +
        '<button type="button" class="lb-next" data-step="1" aria-label="다음 사진">›</button>' +
        '<button type="button" class="lb-close" data-close aria-label="닫기">×</button>';
    }
    root.addEventListener('click', function (e) {
      var b = e.target.closest('[data-photo]');
      if (!b) return;
      show(+b.dataset.photo);
      dlg.showModal();
      KFL.$('.lb-close', dlg).focus();
    });
    dlg.addEventListener('click', function (e) {
      var b = e.target.closest('button');
      if (e.target === dlg || (b && b.hasAttribute('data-close'))) return dlg.close();
      if (b && b.dataset.step) { show(at + +b.dataset.step); KFL.$('[data-step="' + b.dataset.step + '"]', dlg).focus(); }
    });
    dlg.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { show(at + (e.key === 'ArrowRight' ? 1 : -1)); KFL.$('.lb-close', dlg).focus(); }
    });
  };

  KFL.views.video = function (page, root) {
    root.innerHTML = '<p class="note">동영상은 원본 사이트에서 재생됩니다.</p><ul class="video-list">' + page.posts.map(function (v) {
      return '<li><a href="' + KFL.esc(v.href) + '" target="_blank" rel="noopener">' +
        (v.img ? '<img src="' + v.img + '" alt="" loading="lazy">' : '') +
        '<span class="play" aria-hidden="true">▶</span><strong>' + KFL.esc(v.title) + '</strong>' +
        (v.sub && v.sub !== v.title ? '<span>' + KFL.esc(v.sub) + '</span>' : '') +
        '<time datetime="' + v.date + '">' + v.date + '</time><span class="sr-only"> (원본 사이트, 새 창)</span></a></li>';
    }).join('') + '</ul>';
  };

  /* ---------- 표: 검색 + 첫 열(지역) 필터 + 쪽 나눔 ---------- */
  var FILTER_COL = { '시도': 1, '지역': 1, '소속시도': 1 };
  KFL.views.table = function (page, root) {
    var cols = page.columns;
    var fi = cols.map(function (c) { return !!FILTER_COL[c]; }).indexOf(true);
    var options = fi < 0 ? [] : page.rows.map(function (r) { return r[fi]; })
      .filter(function (v, i, a) { return v && a.indexOf(v) === i; });
    KFL.listView({
      root: root, id: 'tbl', per: 20, unit: '건', searchLabel: page.title + ' 검색', placeholder: '이름·지역 등으로 검색',
      tools: fi < 0 ? null : function (s) {
        return '<label class="filter"><span>' + KFL.esc(cols[fi]) + '</span><select data-filter><option value="">전체</option>' +
          options.map(function (o) { return '<option' + (o === s.filter ? ' selected' : '') + '>' + KFL.esc(o) + '</option>'; }).join('') +
          '</select></label>';
      },
      filter: function (s) {
        return page.rows.filter(function (r) {
          return (!s.filter || r[fi] === s.filter) && KFL.has(r.join(' '), s.q);
        });
      },
      render: function (rows) {
        return '<div class="table-wrap" tabindex="0" role="region" aria-label="' + KFL.esc(page.title) + '">' +
          '<table class="data stack"><thead><tr>' + cols.map(function (c) { return '<th scope="col">' + KFL.esc(c) + '</th>'; }).join('') +
          '</tr></thead><tbody>' + rows.map(function (r) {
            return '<tr>' + r.map(function (v, i) { return '<td data-label="' + KFL.esc(cols[i]) + '">' + KFL.esc(v) + '</td>'; }).join('') + '</tr>';
          }).join('') + '</tbody></table></div>';
      }
    });
  };

  KFL.getJSON = function (url) {
    return fetch(url).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); });
  };
})(window.KFL);
