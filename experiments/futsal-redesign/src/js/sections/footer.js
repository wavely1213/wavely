/* 푸터: 후원사 띠, 사이트맵(원본 메뉴 전체), 연락처 바, 저작권 */
(function (KFL) {
  KFL.renderSponsors = function () {
    KFL.$('#sponsor-list').innerHTML = KFL.SPONSORS.map(function (s) {
      return '<li><a href="' + KFL.esc(s.href) + '" target="_blank" rel="noopener">' +
        '<img src="' + KFL.img('spon/' + s.img) + '" alt="' + KFL.esc(s.name) + ' (새 창)" width="166" height="52"></a></li>';
    }).join('');
  };

  KFL.renderSitemap = function () {
    // 하위 메뉴가 없는 항목(등록 및 참가신청·후원사)은 한 칸에 모아 한 줄에 맞춘다
    var groups = KFL.MENU.filter(function (g) { return !g.href; });
    var links = KFL.MENU.filter(function (g) { return g.href; });
    KFL.$('#sitemap').innerHTML = groups.map(function (g) {
      return '<div><h3>' + KFL.esc(g.label) + '</h3><ul>' + g.items.map(function (it) {
        return '<li>' + KFL.link(it.href, it.label, '', it.external) + '</li>';
      }).join('') + '</ul></div>';
    }).join('') + (links.length ? '<div class="links-only">' + links.map(function (g) {
      return '<h3>' + KFL.link(g.href, g.label, '', g.external) + '</h3>';
    }).join('') + '</div>' : '');
  };

  KFL.renderFooter = function () {
    var f = KFL.FOOTER;
    KFL.$('#footer-info').innerHTML =
      '<p class="footer-brand"><img src="' + KFL.img('brand/logo.png') + '" alt="">' + KFL.esc(KFL.SITE.name) + '</p>' +
      '<address>' +
      '<span><b>A</b>' + KFL.esc(f.address) + '</span>' +
      '<span><b>T</b><a href="tel:' + f.telHref + '">' + KFL.esc(f.tel) + '</a></span>' +
      '<span><b>F</b>' + KFL.esc(f.fax) + '</span>' +
      '<span><b>E</b><a href="mailto:' + f.email + '">' + KFL.esc(f.email) + '</a></span>' +
      '</address>' +
      '<ul class="social-list">' + f.social.map(function (s) {
        return '<li>' + KFL.link(s.href, s.label, 'social') + '</li>';
      }).join('') + '</ul>';
    KFL.$('#footer-copy').textContent = f.copyright;
  };
})(window.KFL);
