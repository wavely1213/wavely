/* FK CUP 현황: 부문(남자부·여자1부·여자2부) × 탭(경기일정·득점·경고·퇴장·경기순위) */
(function (KFL) {
  var VIEWS = [
    { label: '경기일정', key: 'plan' },
    { label: '득점', key: 'goal' },
    { label: '경고', key: 'foul' },
    { label: '퇴장', key: 'red' },
    { label: '경기순위', key: 'rank' },
  ];

  function divisionName(full) {
    var m = full.match(/\(([^)]+)\)\s*$/);
    return m ? m[1] : full;
  }

  function schedule(plan) {
    if (!plan.length) return '<p class="empty">경기일정이 없습니다.</p>';
    var byDate = {};
    var dates = [];
    plan.forEach(function (g) {
      if (!byDate[g.date]) { byDate[g.date] = []; dates.push(g.date); }
      byDate[g.date].push(g);
    });
    return dates.map(function (d) {
      return '<section class="match-day"><h4><time datetime="' + d + '">' + d + '</time></h4><ul class="matches">' +
        byDate[d].map(function (g) {
          var s = g.score.split(':').map(function (x) { return parseInt(x, 10); });
          var win = s[0] > s[1] ? 'home' : s[1] > s[0] ? 'away' : '';
          return '<li class="match">' +
            '<span class="team home' + (win === 'home' ? ' win' : '') + '">' + KFL.esc(g.home) + '</span>' +
            '<a class="score" href="' + KFL.esc(KFL.url(g.record)) + '" target="_blank" rel="noopener"' +
            ' aria-label="' + KFL.esc(g.home + ' ' + s[0] + ', ' + g.away + ' ' + s[1] + ', 경기기록 새 창') + '">' +
            KFL.esc(g.score) + '</a>' +
            '<span class="team away' + (win === 'away' ? ' win' : '') + '">' + KFL.esc(g.away) + '</span></li>';
        }).join('') + '</ul></section>';
    }).join('');
  }

  KFL.renderFkCup = function (leagues) {
    var root = KFL.$('#fkcup');
    var title = KFL.$('#fkcup-title');
    var league = leagues[0];
    var view = 0;

    root.innerHTML =
      '<div class="division" role="group" aria-label="부문 선택">' + leagues.map(function (l, i) {
        return '<button type="button" class="chip" aria-pressed="' + (i === 0) + '" data-i="' + i + '">' + KFL.esc(divisionName(l.name)) + '</button>';
      }).join('') + '</div>' +
      '<div id="fk-views">' + KFL.tabs({ id: 'fk', label: '기록 종류', tabs: VIEWS.map(function (v) { return v.label; }), variant: 'underline' }) + '</div>';

    function paint(panel) {
      var v = VIEWS[view];
      title.textContent = league.name;
      if (v.key === 'plan') { panel.innerHTML = schedule(league.plan); return; }
      var t = league[v.key];
      // 선수 기록의 팀명은 리그 등록 소속과 다를 수 있어(원본 데이터 기준) 기준을 밝혀 둔다.
      var note = t.columns.indexOf('이름') !== -1 ? '<p class="scope-note">팀명은 FK CUP 출전 기준 소속입니다.</p>' : '';
      panel.innerHTML = note + KFL.table({ caption: league.name + ' ' + v.label, columns: t.columns, rows: t.rows, limit: 10 });
    }

    var views = KFL.$('#fk-views');
    KFL.bindTabs(views, function (i, panel) { view = i; paint(panel); });

    KFL.$$('.division .chip', root).forEach(function (b) {
      b.addEventListener('click', function () {
        KFL.$$('.division .chip', root).forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
        league = leagues[+b.dataset.i];
        paint(KFL.$('[role=tabpanel]', views));
      });
    });
  };
})(window.KFL);
