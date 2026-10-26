/* 원본 배치용 표를 풀어 다시 짠 화면(tools/structure.py 가 만든 데이터):
   구단 목록(teams) · 구단 상세(team) · 대회 목록(events) · 중계(broadcasts) · 풋살장(stadiums)
   · 산하단체(unions) · 찾아오시는길(facts) · 기부금(ledger) · 후원사(logos) · 규정·정관(law) */
(function (KFL) {
  var esc = KFL.esc;

  // 데이터의 주소는 이미 새 사이트 경로(xxx.html) 또는 바깥 주소다
  function a(href, inner, cls) {
    var ext = /^https?:/.test(href);
    return '<a href="' + esc(href) + '"' + (cls ? ' class="' + cls + '"' : '') +
      (ext ? ' target="_blank" rel="noopener"' : '') + '>' + inner + (ext ? '<span class="sr-only"> (새 창)</span>' : '') + '</a>';
  }
  function dl(rows, cls) {
    return '<dl class="' + (cls || 'kv') + '">' + rows.map(function (r) {
      return '<div><dt>' + esc(r[0]) + '</dt><dd>' + r[1] + '</dd></div>';
    }).join('') + '</dl>';
  }
  // "2026-09-19 ~ 2026-09-20" → 날짜 중간에서 줄이 끊기지 않게
  function range(s) {
    return esc(s || '').replace(/(\d{4}[.-]\d{2}[.-]\d{2}\.?)/g, '<span class="nw">$1</span>');
  }
  function section(title, body, cls) {
    return '<section class="st-section' + (cls ? ' ' + cls : '') + '"><h2 class="st-title">' + esc(title) + '</h2>' + body + '</section>';
  }

  /* ---------- FK리그구단소개: 같은 크기 카드 그리드 ---------- */
  KFL.views.teams = function (page, root) {
    root.innerHTML = '<ul class="team-grid">' + page.items.map(function (t) {
      return '<li>' + a(t.href, '<span class="team-logo"><img src="' + esc(t.logo) + '" alt="" loading="lazy"></span>' +
        '<span class="team-name">' + esc(t.name) + '</span>', 'team-card') + '</li>';
    }).join('') + '</ul>';
  };

  /* ---------- 구단 상세 ---------- */
  var POS = ['GOLEIRO', 'FIXO', 'ALA', 'PIVO'];
  KFL.views.team = function (page, root) {
    var t = page.team;
    var info = t.info.map(function (r) { return [r[0], esc(r[1])]; });
    var history = t.history.length ? section('연혁', '<ol class="timeline">' + t.history.map(function (line) {
      var m = line.match(/^((?:\D{0,6}\s)?\d{4}(?:[-~]\d{2,4})?(?:년(?:\s*\d{1,2}월(?:\s*\d{1,2}일)?)?)?)\s*(.*)$/);
      return m && m[2] ? '<li><span class="when">' + esc(m[1]) + '</span><span>' + esc(m[2]) + '</span></li>'
        : '<li><span class="when"></span><span>' + esc(line) + '</span></li>';
    }).join('') + '</ol>') : '';
    var staff = t.staff.length ? section('임원진', dl(t.staff.map(function (r) { return [r[0], esc(r[1])]; }), 'staff-grid') +
      t.messages.map(function (m) {
        return '<figure class="quote"><blockquote>' + esc(m.text) + '</blockquote><figcaption>' + esc(m.role) + ' ' + esc(m.name) + '</figcaption></figure>';
      }).join('')) : '';
    // 선수단: 포지션별로 묶고 배번 순(원본 순서)
    var groups = POS.concat(t.roster.map(function (p) { return p.pos; }).filter(function (p, i, all) {
      return POS.indexOf(p) < 0 && all.indexOf(p) === i;
    }));
    var head = t.rosterHead;
    var roster = t.roster.length ? section('선수단 ' + t.roster.length + '명', groups.map(function (g) {
      var ps = t.roster.filter(function (p) { return p.pos === g; });
      if (!ps.length) return '';
      return '<h3 class="pos-title">' + esc(g) + ' <span>' + ps.length + '</span></h3><ul class="roster">' + ps.map(function (p) {
        return '<li><span class="no" aria-label="' + esc(head[1] || '배번') + ' ' + esc(p.no) + '">' + esc(p.no) + '</span>' +
          '<span class="pname">' + esc(p.name) + '</span></li>';
      }).join('') + '</ul>';
    }).join('')) : '';
    root.innerHTML =
      '<div class="team-head">' +
      (t.photo ? '<img class="team-photo" src="' + esc(t.photo) + '" alt="' + esc(t.name) + ' 단체 사진" loading="lazy">' : '') +
      '<div class="team-info"><h2 class="team-title">' + esc(t.name) + '</h2>' + dl(info) + '</div></div>' +
      history + staff + roster +
      '<p class="back-row"><a class="btn" href="mng_FKLeagueTeam.html">구단리스트</a></p>';
  };

  /* ---------- 대회 목록 ---------- */
  var STATUS_TONE = { '접수기간': 'open', '진행기간': 'live', '준비기간': 'soon', '공람기간': 'soon', '접수마감': 'closed', '대회종료': 'closed' };
  KFL.views.events = function (page, root) {
    var has = function (k) { return page.rows.some(function (r) { return r[k]; }); };
    var cols = page.columns;
    var label = function (key, fallback) {
      var map = { status: /상태/, entry: /참가/, place: /장소/, period: /대회기간/, receipt: /접수/ };
      return cols.filter(function (c) { return map[key].test(c); })[0] || fallback;
    };
    root.innerHTML = (page.note ? '<p class="note">' + esc(page.note) + '</p>' : '') +
      '<ol class="event-list">' + page.rows.map(function (r) {
        var meta = [[label('place', '대회장소'), esc(r.place)], [label('period', '대회기간'), range(r.period)]];
        if (r.receipt) meta.push([label('receipt', '접수기간'), range(r.receipt)]);
        return '<li class="event">' +
          '<span class="status ' + (STATUS_TONE[r.status] || 'soon') + '">' + esc(r.status) + '</span>' +
          '<div class="event-main"><h3>' + (r.href ? a(r.href, esc(r.name)) : esc(r.name)) + '</h3>' +
          '<p class="event-sub">' + [r.entry, r.region].filter(Boolean).map(esc).join(' <span aria-hidden="true">|</span> ') + '</p></div>' +
          dl(meta, 'event-meta') + '</li>';
      }).join('') + '</ol>' +
      (has('href') ? '<p class="note">대회명을 누르면 원본 사이트의 대회 상세가 새 창으로 열립니다.</p>' : '');
  };

  /* ---------- 중계 ---------- */
  KFL.views.broadcasts = function (page, root) {
    KFL.listView({
      root: root, id: 'bc', per: 20, unit: '경기', searchLabel: '팀 이름·대회로 검색', placeholder: '예: 구미FS',
      filter: function (s) {
        return page.items.filter(function (b) { return KFL.has(b.match + ' ' + b.comp + ' ' + b.when, s.q); });
      },
      render: function (items) {
        return '<ul class="bc-list">' + items.map(function (b) {
          return '<li><div class="bc-main"><h3>' + esc(b.match) + '</h3><p>' + esc(b.comp) + ' <span aria-hidden="true">|</span> ' + esc(b.when) + '</p></div>' +
            '<div class="bc-links">' + b.links.map(function (l) {
              return '<a class="bc-link" href="' + esc(l.href) + '" target="_blank" rel="noopener">' + KFL.icon('play') +
                esc(l.label) + '<span class="sr-only"> (유튜브, 새 창)</span></a>';
            }).join('') + '</div></li>';
        }).join('') + '</ul>';
      }
    });
  };

  /* ---------- 풋살장현황: 구장 카드 ---------- */
  KFL.views.stadiums = function (page, root) {
    KFL.listView({
      root: root, id: 'std', per: 24, unit: '곳', searchLabel: '구장 이름·주소로 검색', placeholder: '예: 송파구',
      filter: function (s) {
        return page.items.filter(function (x) { return KFL.has(x.name + ' ' + (x.addr || ''), s.q); });
      },
      render: function (items) {
        return '<ul class="stadium-grid">' + items.map(function (x) {
          var rows = [['주소', esc(x.addr || '')], ['면수', esc(x.courts || '')], ['연락처', esc(x.tel || '')]];
          if (x.home) rows.push(['홈페이지', a(x.home, '바로가기')]);
          return '<li class="stadium"><img src="' + esc(x.photo) + '" alt="" loading="lazy">' +
            '<h3>' + esc(x.name) + '</h3>' + dl(rows.filter(function (r) { return r[1]; }), 'kv compact') + '</li>';
        }).join('') + '</ul>';
      }
    });
  };

  /* ---------- 산하단체현황 ---------- */
  KFL.views.unions = function (page, root) {
    var withSubs = page.groups.filter(function (g) { return g.items.length; });
    var plain = page.groups.filter(function (g) { return !g.items.length; });
    root.innerHTML = withSubs.map(function (g) {
      return '<section class="st-section"><h2 class="st-title">' + (g.href ? a(g.href, esc(g.name)) : esc(g.name)) + '</h2>' +
        '<ul class="link-grid">' + g.items.map(function (x) { return '<li>' + a(x.href, esc(x.name)) + '</li>'; }).join('') + '</ul></section>';
    }).join('') +
      (plain.length ? '<section class="st-section"><ul class="link-grid wide">' + plain.map(function (g) {
        return '<li>' + (g.href ? a(g.href, esc(g.name)) : esc(g.name)) + '</li>';
      }).join('') + '</ul></section>' : '');
  };

  /* ---------- 찾아오시는길 ---------- */
  KFL.views.facts = function (page, root) {
    root.innerHTML = '<div class="facts">' +
      (page.map ? a(page.map.href, '<img src="' + esc(page.map.img) + '" alt="' + esc(page.map.alt) + '" loading="lazy">', 'facts-map') : '') +
      dl(page.rows.map(function (r) { return [r[0], esc(r[1])]; })) + '</div>';
  };

  /* ---------- 지정기부금: 전체 · 기부내역 · 사용내역 ---------- */
  KFL.views.ledger = function (page, root) {
    var tabs = page.tabs;
    var total = page.rows.filter(function (r) { return r.length < page.columns.length; });
    var body = page.rows.filter(function (r) { return r.length === page.columns.length; });
    var amountAt = page.columns.indexOf('금액(원)');
    function rows(i) {
      return body.filter(function (r) {
        var used = /^\(-\)/.test(r[amountAt] || '');
        return i === 0 || (i === 1 ? !used : used);
      });
    }
    root.innerHTML = KFL.tabs({ id: 'ledger', label: '내역 종류', tabs: tabs });
    KFL.bindTabs(root, function (i, panel) {
      var list = rows(i).concat(i === 0 ? total : []);
      panel.innerHTML = '<div class="table-wrap" tabindex="0" role="region" aria-label="' + esc(page.title + ' ' + tabs[i]) + '">' +
        '<table class="data stack"><thead><tr>' + page.columns.map(function (c) {
          return '<th scope="col">' + (c ? esc(c) : '<span class="sr-only">번호</span>') + '</th>';
        }).join('') + '</tr></thead><tbody>' + list.map(function (r) {
          return '<tr>' + r.map(function (v, k) {
            return '<td data-label="' + esc(page.columns[k] || '') + '"' + (k === amountAt ? ' class="num"' : '') +
              (r.length < page.columns.length && k === r.length - 1 ? ' colspan="' + (page.columns.length - r.length + 1) + '"' : '') + '>' + esc(v) + '</td>';
          }).join('') + '</tr>';
        }).join('') + '</tbody></table></div>';
    });
  };
  /* ---------- 후원사: 같은 크기 로고 칸 ---------- */
  KFL.views.logos = function (page, root) {
    root.innerHTML = '<ul class="logo-grid">' + page.items.map(function (x) {
      return '<li>' + a(x.href, '<span class="logo-box"><img src="' + esc(x.logo) + '" alt="" loading="lazy"></span>' +
        '<span class="logo-name">' + esc(x.name) + '</span>', 'logo-card') + '</li>';
    }).join('') + '</ul>';
  };

  /* ---------- 규정·정관: 목차(장·조) + 본문 ---------- */
  KFL.views.law = function (page, root) {
    var n = 0;
    var toc = [], body = [];
    page.blocks.forEach(function (b) {
      if (b.t === 'chapter') {
        var id = 'c' + (++n);
        toc.push('<li class="toc-ch"><a href="#' + id + '">' + esc(b.text) + '</a></li>');
        body.push('<h2 id="' + id + '" class="law-ch">' + esc(b.text) + '</h2>');
      } else if (b.t === 'article') {
        var aid = 'a' + (++n);
        toc.push('<li><a href="#' + aid + '">' + esc(b.text) + '</a></li>');
        body.push('<h3 id="' + aid + '" class="law-art">' + esc(b.text) + '</h3>');
      } else {
        body.push('<p' + (b.item ? ' class="item"' : '') + '>' + esc(b.text) + '</p>');
      }
    });
    root.innerHTML = '<div class="law">' +
      '<details class="law-toc" open><summary>목차</summary><ol>' + toc.join('') + '</ol></details>' +
      '<article class="law-body">' +
      (page.heading.length ? '<header class="law-head">' + page.heading.map(function (h, i) {
        return i ? '<p>' + esc(h) + '</p>' : '<p class="law-name">' + esc(h) + '</p>';
      }).join('') + '</header>' : '') + body.join('') + '</article></div>';
    // 좁은 화면은 목차를 접어 둔다
    if (window.matchMedia('(max-width: 899px)').matches) KFL.$('.law-toc', root).open = false;
  };
})(window.KFL);
