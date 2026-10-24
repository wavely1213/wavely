/* 헤더 내비게이션: 데스크톱은 클릭으로 여는 드롭다운, 모바일은 전체 메뉴 + 아코디언.
   마우스 hover에만 의존하지 않아 키보드·터치 모두 사용 가능. */
(function (KFL) {
  KFL.renderMenu = function () {
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
