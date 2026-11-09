/* 헤더 내비게이션: 데스크톱은 클릭으로 여는 드롭다운, 모바일은 전체 메뉴 + 아코디언.
   마우스 hover에만 의존하지 않아 키보드·터치 모두 사용 가능. */
(function (KFL) {
  KFL.renderMenu = function () {
    // 한 장짜리 미리보기에는 다른 페이지가 없으므로 로고는 원본 첫 화면으로
    var home = KFL.$('[data-home]');
    if (home && !KFL.LOCAL) home.href = KFL.ORIGIN + 'home.action';
    // 정적 HTML 안의 원본 링크(data-href)도 배포본에서는 만들어 둔 페이지로
    KFL.$$('a[data-href]').forEach(function (a) { a.href = KFL.url(a.dataset.href); });
    var nav = KFL.$('#gnb-list');
    nav.innerHTML = KFL.MENU.map(function (g, i) {
      if (g.href) return '<li class="gnb-item">' + KFL.link(g.href, g.label, 'gnb-link', g.external) + '</li>';
      return '<li class="gnb-item">' +
        '<button type="button" class="gnb-btn" aria-expanded="false" aria-controls="sub-' + i + '">' +
        KFL.esc(g.label) + '<span class="chev" aria-hidden="true"></span></button>' +
        '<ul class="sub" id="sub-' + i + '" hidden>' + g.items.map(function (it) {
          return '<li>' + KFL.link(it.href, it.label, '', it.external) + '</li>';
        }).join('') + '</ul></li>';
    }).join('');

    var btns = KFL.$$('.gnb-btn', nav);
    function closeAll(except) {
      btns.forEach(function (b) {
        if (b === except) return;
        b.setAttribute('aria-expanded', 'false');
        KFL.$('#' + b.getAttribute('aria-controls')).hidden = true;
      });
    }
    btns.forEach(function (b) {
      b.addEventListener('click', function () {
        var open = b.getAttribute('aria-expanded') !== 'true';
        closeAll(b);
        b.setAttribute('aria-expanded', String(open));
        KFL.$('#' + b.getAttribute('aria-controls')).hidden = !open;
      });
    });
    document.addEventListener('click', function (e) {
      if (!e.target.closest('#gnb') && window.matchMedia('(min-width: 960px)').matches) closeAll();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape') return;
      var open = btns.filter(function (b) { return b.getAttribute('aria-expanded') === 'true'; })[0];
      closeAll();
      if (open) open.focus();
    });

    var toggle = KFL.$('#menu-toggle');
    toggle.addEventListener('click', function () {
      var open = toggle.getAttribute('aria-expanded') !== 'true';
      toggle.setAttribute('aria-expanded', String(open));
      toggle.querySelector('.label').textContent = open ? '메뉴 닫기' : '전체 메뉴';
      KFL.$('#gnb').classList.toggle('open', open);
      document.body.classList.toggle('menu-open', open);
    });
  };
})(window.KFL);
