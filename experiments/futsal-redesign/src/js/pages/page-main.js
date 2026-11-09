/* 하위 페이지 진입점: 메뉴·하위 탭을 그리고 data/site/<slug>.json 을 불러와 종류별 화면으로 넘긴다 */
(function (KFL) {
  var page = KFL.PAGE;
  KFL.renderMenu();
  KFL.renderSponsors();
  KFL.renderSitemap();
  KFL.renderFooter();
  KFL.renderSubnav(page);

  var root = KFL.$('#page');
  KFL.getJSON('data/site/' + page.slug + '.json').then(function (data) {
    var view = KFL.views[data.type] || KFL.views.html;
    view(data, root);
  }, function () {
    root.innerHTML = '<p class="empty">페이지를 불러오지 못했습니다. <a href="' + KFL.esc(page.origin) + '">원본 사이트에서 보기</a></p>';
  });
})(window.KFL);
