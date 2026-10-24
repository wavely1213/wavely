/* 좌측 사이드바: FK CUP 최근 경기 결과 · 팀 순위 · 득점/경고 TOP5.
   카드마다 부문(남자부·여자1부·여자2부) 탭을 따로 둔다. */
(function (KFL) {
  function divisionName(full) {
    var m = full.match(/\(([^)]+)\)\s*$/);
    return m ? m[1] : full;
  }

  // 카드 하나에 부문 탭을 붙이고, 탭이 바뀌면 render(league, panel)로 다시 그린다
  function divisionCard(id, leagues, render) {
    var root = KFL.$('#' + id);
    root.innerHTML = KFL.tabs({ id: id + '-div', label: '부문', tabs: leagues.map(function (l) { return divisionName(l.name); }) });
    KFL.bindTabs(root, function (i, panel) {
      panel.innerHTML = '<p class="league-name">' + KFL.esc(leagues[i].name) + '</p>' + render(leagues[i]);
    });
  }

  function results(league) {
    var plan = league.plan.slice().reverse(); // 최근 경기부터
    if (!plan.length) return '<p class="empty">경기 결과가 없습니다.</p>';
    var LIMIT = 3;
    var days = [];
    plan.forEach(function (g, i) {
      var last = days[days.length - 1];
      if (!last || last.date !== g.date) days.push(last = { date: g.date, games: [] });
      last.games.push({ g: g, i: i });
    });
    var html = days.map(function (d) {
      var hidden = d.games.every(function (x) { return x.i >= LIMIT; });
      return '<section class="match-day"' + (hidden ? ' hidden data-more' : '') + '><h4><time datetime="' + d.date + '">' + d.date + '</time></h4>' +
        d.games.map(function (x) {
          var g = x.g;
          var s = g.score.split(':').map(function (v) { return parseInt(v, 10); });
          var win = s[0] > s[1] ? 'home' : s[1] > s[0] ? 'away' : '';
          return '<div class="match"' + (x.i >= LIMIT && !hidden ? ' hidden data-more' : '') + '>' +
            '<div class="match-row">' +
            '<span class="team' + (win === 'home' ? ' win' : '') + '">' + KFL.esc(g.home) + '</span>' +
            '<span class="score-box"><span class="score" aria-label="' + KFL.esc(g.home + ' ' + s[0] + ' 대 ' + g.away + ' ' + s[1]) + '">' + s[0] + ' - ' + s[1] + '</span>' +
            '<span class="badge">경기종료</span></span>' +
            '<span class="team' + (win === 'away' ? ' win' : '') + '">' + KFL.esc(g.away) + '</span></div>' +
            '<a class="match-center" href="' + KFL.esc(KFL.url(g.record)) + '" target="_blank" rel="noopener">경기기록' +
            '<span class="sr-only"> ' + KFL.esc(g.home + ' 대 ' + g.away) + ' (새 창)</span></a></div>';
        }).join('') + '</section>';
    }).join('');
    var more = plan.length > LIMIT
      ? '<button type="button" class="btn-more" data-more-btn aria-expanded="false">전체 ' + plan.length + '경기 보기</button>' : '';
    return html + more;
  }

  function standings(league) {
    var rows = league.rank.rows;
    if (!rows.length) return '<p class="empty">순위가 없습니다.</p>';
    var LIMIT = 6;
    return '<table class="mini"><caption class="sr-only">' + KFL.esc(league.name) + ' 팀 순위</caption>' +
      '<thead><tr><th scope="col">순위</th><th scope="col">팀명</th><th scope="col">경기</th><th scope="col">승점</th><th scope="col">득점</th></tr></thead><tbody>' +
      rows.map(function (r, i) {
        return '<tr' + (i >= LIMIT ? ' hidden data-more' : '') + '><td>' + r['순위'] + '</td><td class="team-cell">' + KFL.esc(r['팀명']) + '</td>' +
          '<td>' + r['경기수'] + '</td><td>' + r['승점'] + '</td><td>' + r['득점'] + '</td></tr>';
      }).join('') + '</tbody></table>' +
      (rows.length > LIMIT ? '<button type="button" class="btn-more" data-more-btn aria-expanded="false">전체 ' + rows.length + '팀 보기</button>' : '');
  }

  // 원본 기록의 팀명은 리그 등록 소속과 다를 수 있어 기준을 밝혀 둔다
  var NOTE = '<p class="scope-note">팀명은 FK CUP 출전 기준 소속입니다.</p>';

  function top5(key, unit, tone) {
    return function (league) {
      var rows = league[key].rows.slice(0, 5);
      if (!rows.length) return '<p class="empty">기록이 없습니다.</p>';
      var head = league[key].columns;
      var stat = head[head.indexOf('경기') + 1]; // 득점 또는 경고
      var first = rows[0];
      return NOTE +
        '<div class="top1' + (tone === 'red' ? ' red' : '') + '"><p class="nth">1st</p>' +
        '<p class="name">' + KFL.esc(first['이름']) + '</p>' +
        '<p class="stat">' + first[stat] + unit + ' · ' + first['경기'] + '경기</p>' +
        '<p class="club">' + KFL.esc(first['팀명']) + '</p></div>' +
        '<ol class="top-rest" start="2">' + rows.slice(1).map(function (r, i) {
          return '<li><span class="n" aria-hidden="true">' + (i + 2) + '</span>' +
            '<span class="who">' + KFL.esc(r['이름']) + '<small>' + KFL.esc(r['팀명']) + '</small></span>' +
            '<span class="v">' + r[stat] + unit + '</span></li>';
        }).join('') + '</ol>';
    };
  }

  KFL.renderSidebar = function (leagues) {
    divisionCard('results', leagues, results);
    divisionCard('standings', leagues, standings);
    divisionCard('top-goal', leagues, top5('goal', '득점', 'navy'));
    divisionCard('top-foul', leagues, top5('foul', '경고', 'red'));
  };
})(window.KFL);
