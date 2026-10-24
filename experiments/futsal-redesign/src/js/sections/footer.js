/* 포토, 후원사, 푸터 */
(function (KFL) {
  KFL.renderPhotos = function (photos) {
    KFL.$('#photo-list').innerHTML = photos.map(function (p, i) {
      return '<li><a href="' + KFL.esc(KFL.url('photoView.action?b_seq=' + p[0])) + '" target="_blank" rel="noopener">' +
        '<img src="' + KFL.img('photo/' + p[0] + '.jpg') + '" alt="포토 ' + (i + 1) + ' (새 창에서 크게 보기)"></a></li>';
    }).join('');
  };

  KFL.renderSponsors = function () {
    KFL.$('#sponsor-list').innerHTML = KFL.SPONSORS.map(function (s) {
      return '<li><a href="' + KFL.esc(s.href) + '" target="_blank" rel="noopener">' +
        '<img src="' + KFL.img('spon/' + s.img) + '" alt="' + KFL.esc(s.name) + ' (새 창)" width="166" height="52"></a></li>';
    }).join('');
  };

  KFL.renderFooter = function () {
    var f = KFL.FOOTER;
    KFL.$('#footer-info').innerHTML =
      '<p class="footer-name">' + KFL.esc(KFL.SITE.name) + '</p>' +
      '<address><p>' + KFL.esc(f.address) + '</p>' +
      '<p>TEL <a href="tel:' + f.telHref + '">' + KFL.esc(f.tel) + '</a> · FAX ' + KFL.esc(f.fax) + '</p>' +
      '<p>E-mail <a href="mailto:' + f.email + '">' + KFL.esc(f.email) + '</a></p></address>' +
      '<p class="copy">' + KFL.esc(f.copyright) + '</p>';
    KFL.$('#social-list').innerHTML = f.social.map(function (s) {
      return '<li>' + KFL.link(s.href, s.label, 'social') + '</li>';
    }).join('');
  };
})(window.KFL);
