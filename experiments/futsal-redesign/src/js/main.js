/* 진입점: 데이터를 받아 각 섹션을 그린다 */
(function (KFL) {
  function start(data) {
    KFL.renderMenu();
    KFL.renderHero(data.news);
    KFL.renderSidebar(data.leagues);
    KFL.renderBoards(data);
    KFL.renderCompetitions(data.competitions);
    KFL.renderPlayers(data.players);
    KFL.renderPhotos(data.photos);
    KFL.renderQuick();
    KFL.renderSponsors();
    KFL.renderSitemap();
    KFL.renderFooter();
  }

  // 빌드본은 데이터를 인라인(KFL.DATA)으로 갖고, 개발 중에는 data.json을 불러온다.
  if (KFL.DATA) start(KFL.DATA);
  else fetch('../data/data.json').then(function (r) { return r.json(); }).then(start);
})(window.KFL);
