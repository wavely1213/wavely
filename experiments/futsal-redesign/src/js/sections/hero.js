/* 히어로: 원본 첫 화면의 NEWS 슬라이드 3건. 코트 위에 제목(왼쪽)과 사진(오른쪽). 자동으로 넘기지 않고 이전/다음·점 버튼으로 넘긴다. */
(function (KFL) {
  KFL.renderHero = function (news) {
    var root = KFL.$('#hero');
    var n = news.length;
    root.innerHTML = '<div class="container hero-viewport">' + news.map(function (it, i) {
      return '<article class="slide" id="slide-' + i + '" role="group" aria-roledescription="slide" aria-label="' + (i + 1) + ' / ' + n + '"' + (i ? ' hidden' : '') + '>' +
        '<div class="slide-body"><h3>' + KFL.link('mng_newsView.action?b_seq=' + it.b_seq, it.b_title) + '</h3>' +
        '<p class="slide-meta"><span>' + KFL.esc(it.b_name) + '</span><time datetime="' + it.b_date + '">' + it.b_date + '</time></p></div>' +
        '<div class="slide-media"><img src="' + KFL.img('news/' + it.b_seq + '.jpg') + '" alt=""></div></article>';
    }).join('') +
      '<div class="hero-controls">' +
      '<button type="button" class="hero-btn" data-step="-1" aria-label="이전 뉴스">' + KFL.icon('prev') + '</button>' +
      '<div class="dots">' + news.map(function (_, i) {
        return '<button type="button" class="dot" data-go="' + i + '" aria-controls="slide-' + i + '" aria-label="' + (i + 1) + '번째 뉴스"' + (i ? '' : ' aria-current="true"') + '></button>';
      }).join('') + '</div>' +
      '<button type="button" class="hero-btn" data-step="1" aria-label="다음 뉴스">' + KFL.icon('next') + '</button>' +
      '</div></div>';

    var current = 0;
    function show(i) {
      current = (i + n) % n;
      KFL.$$('.slide', root).forEach(function (s, j) { s.hidden = j !== current; });
      KFL.$$('.dot', root).forEach(function (d, j) {
        if (j === current) d.setAttribute('aria-current', 'true'); else d.removeAttribute('aria-current');
      });
    }
    root.addEventListener('click', function (e) {
      var b = e.target.closest('button');
      if (!b) return;
      if (b.dataset.step) show(current + Number(b.dataset.step));
      if (b.dataset.go) show(Number(b.dataset.go));
    });
  };
})(window.KFL);
