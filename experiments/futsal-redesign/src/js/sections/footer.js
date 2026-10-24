/* 푸터: 후원사 띠, 사이트맵(원본 메뉴 전체), 연락처 바, 저작권 */
(function (KFL) {
  KFL.renderSponsors = function () {
    KFL.$('#sponsor-list').innerHTML = KFL.SPONSORS.map(function (s) {
      return '<li><a href="' + KFL.esc(s.href) + '" target="_blank" rel="noopener">' +
        '<img src="' + KFL.img('spon/' + s.img) + '" alt="' + KFL.esc(s.name) + ' (새 창)" width="166" height="52"></a></li>';
    }).join('');
  };

  KFL.renderSitemap = function () {
    KFL.$('#sitemap').innerHTML = KFL.MENU.map(function (g) {
      if (g.href) return '<div><h3>' + KFL.link(g.href, g.label, '', g.external) + '</h3></div>';
      return '<div><h3>' + KFL.esc(g.label) + '</h3><ul>' + g.items.map(function (it) {
        return '<li>' + KFL.link(it.href, it.label, '', it.external) + '</li>';
      }).join('') + '</ul></div>';
    }).join('');
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
