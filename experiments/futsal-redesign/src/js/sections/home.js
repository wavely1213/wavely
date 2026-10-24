/* 첫 화면 상단: 바로가기, 주요 뉴스, 공지사항·대회소식, 대회일정 */
(function (KFL) {
  KFL.img = function (path) {
    return (KFL.IMG && KFL.IMG[path]) || '../assets/img/' + path;
  };

  KFL.renderQuick = function () {
    KFL.$('#quick-list').innerHTML = KFL.QUICK.map(function (label) {
      var it = KFL.findMenuItem(label);
      return it ? '<li>' + KFL.link(it.href, it.label, 'quick-link', it.external) + '</li>' : '';
    }).join('');
  };

  KFL.renderNews = function (news) {
    KFL.$('#news-list').innerHTML = news.map(function (n, i) {
      return '<li class="news-card' + (i === 0 ? ' lead' : '') + '">' +
        '<img src="' + KFL.img('news/' + n.b_seq + '.jpg') + '" alt="" loading="lazy">' +
        '<div class="news-body"><h3>' + KFL.link('mng_newsView.action?b_seq=' + n.b_seq, n.b_title, 'stretched') + '</h3>' +
        '<p class="meta"><span>' + KFL.esc(n.b_name) + '</span><time datetime="' + n.b_date + '">' + n.b_date + '</time></p></div></li>';
    }).join('');
  };

  function boardList(items) {
    return '<ul class="post-list">' + items.map(function (p) {
      return '<li>' + KFL.link('brd_boardRead.action?seq=' + p.seq + '&board_id=' + p.board, p.title) +
        '<time datetime="' + p.date + '">' + p.date + '</time></li>';
    }).join('') + '</ul>';
  }

  KFL.renderBoards = function (data) {
    var boards = [
      { label: '공지사항', items: data.notices, more: 'brd_boardLoad.action?board_id=00' },
      { label: '대회소식', items: data.contestNews, more: 'brd_boardLoad.action?board_id=03' },
    ];
    var root = KFL.$('#boards');
    root.innerHTML = KFL.tabs({ id: 'board', label: '게시판', tabs: boards.map(function (b) { return b.label; }) });
    KFL.bindTabs(root, function (i, panel) {
      var b = boards[i];
      panel.innerHTML = boardList(b.items) +
        '<p class="more-row">' + KFL.link(b.more, b.label + ' 더보기', 'more-link') + '</p>';
    });
  };

  KFL.renderCompetitions = function (list) {
    KFL.$('#comp-list').innerHTML = list.map(function (c) {
      return '<li class="comp-card"><h3>' + KFL.link('leagueRead.action?league_seq=' + c.seq + '&menu_sub_id=1', c.title, 'stretched') + '</h3>' +
        '<dl><div><dt>대회기간</dt><dd>' + KFL.esc(c.period) + '</dd></div>' +
        '<div><dt>대회장소</dt><dd>' + KFL.esc(c.place) + '</dd></div></dl></li>';
    }).join('');
  };
})(window.KFL);
