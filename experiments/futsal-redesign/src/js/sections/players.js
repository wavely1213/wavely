/* 선수기록: 남자부/여자부 탭 + 이름·팀명 검색 */
(function (KFL) {
  KFL.renderPlayers = function (players) {
    var root = KFL.$('#players');
    var groups = Object.keys(players);
    var current = groups[0];

    root.innerHTML =
      '<div class="search"><label for="player-q">이름 또는 팀명 검색</label>' +
      '<input id="player-q" type="search" autocomplete="off" placeholder="예: 강원FS"></div>' +
      KFL.tabs({ id: 'pl', label: '부문', tabs: groups });

    var input = KFL.$('#player-q');
    var panel = KFL.$('[role=tabpanel]', root);

    function paint() {
      var t = players[current];
      var q = input.value.trim();
      var rows = q ? t.rows.filter(function (r) { return (r['이름'] + ' ' + r['팀명']).indexOf(q) !== -1; }) : t.rows;
      panel.innerHTML =
        '<p class="count" role="status">' + (q ? '“' + KFL.esc(q) + '” 검색 결과 ' : '') + rows.length + '명</p>' +
        KFL.table({ caption: '선수기록 ' + current, columns: t.columns, rows: rows, limit: q ? rows.length : 10 });
    }

    KFL.bindTabs(root, function (i) { current = groups[i]; paint(); });
    input.addEventListener('input', paint);
  };
})(window.KFL);
