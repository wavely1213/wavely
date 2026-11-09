/* 본문 열: 공지사항·대회소식, 대회일정, 포토, 바로가기 */
(function (KFL) {
  KFL.renderBoards = function (data) {
    var boards = [
      { label: '공지사항', items: data.notices, more: 'brd_boardLoad.action?board_id=00' },
      { label: '대회소식', items: data.contestNews, more: 'brd_boardLoad.action?board_id=03' },
    ];
    var root = KFL.$('#boards');
    // 제목 옆 텍스트 탭(K리그 뉴스 카테고리 모양)
    var tabs = KFL.tabs({ id: 'board', label: '게시판 종류', tabs: boards.map(function (b) { return b.label; }), variant: 'text' });
    var split = tabs.indexOf('<div class="tabpanel"');
    root.innerHTML = '<div class="boards-head"><h2 id="boards-h">소식</h2>' + tabs.slice(0, split) + '</div>' + tabs.slice(split);
    KFL.bindTabs(root, function (i, panel) {
      var b = boards[i];
      panel.innerHTML = '<ul class="post-list">' + b.items.map(function (p) {
        return '<li>' + KFL.link('brd_boardRead.action?seq=' + p.seq + '&board_id=' + p.board, p.title) +
          '<time datetime="' + p.date + '">' + p.date + '</time></li>';
      }).join('') + '</ul>' +
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

  KFL.renderPhotos = function (photos) {
    KFL.$('#photo-list').innerHTML = photos.map(function (p, i) {
      return '<li><a href="' + KFL.esc(KFL.url('photoView.action?b_seq=' + p[0])) + '" target="_blank" rel="noopener">' +
        '<img src="' + KFL.img('photo/' + p[0] + '.jpg') + '" alt="포토 ' + (i + 1) + ' (새 창에서 크게 보기)"></a></li>';
    }).join('');
  };

  // 원본 메뉴 항목 중 자주 찾는 것. 이름·링크는 원본 메뉴와 같다.
  KFL.renderQuick = function () {
    KFL.$('#quick-list').innerHTML = KFL.QUICK.map(function (label) {
      var it = KFL.findMenuItem(label);
      return it ? '<li>' + KFL.link(it.href, it.label, 'quick-link', it.external) + '</li>' : '';
    }).join('');
  };
})(window.KFL);
