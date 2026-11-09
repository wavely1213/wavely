/* WAI-ARIA 탭: 클릭·좌우 화살표·Home/End 지원 */
(function (KFL) {
  KFL.tabs = function (opts) {
    var id = opts.id;
    var list = opts.tabs.map(function (t, i) {
      return '<button type="button" role="tab" id="' + id + '-tab-' + i + '" aria-controls="' + id + '-panel"' +
        ' aria-selected="' + (i === 0) + '" tabindex="' + (i === 0 ? 0 : -1) + '" data-i="' + i + '">' +
        KFL.esc(t) + '</button>';
    }).join('');
    return '<div class="tablist ' + (opts.variant || '') + '" role="tablist" aria-label="' + KFL.esc(opts.label) + '">' + list + '</div>' +
      '<div class="tabpanel" role="tabpanel" id="' + id + '-panel" aria-labelledby="' + id + '-tab-0" tabindex="0"></div>';
  };

  KFL.bindTabs = function (root, onSelect) {
    var tabs = KFL.$$('[role=tab]', root);
    var panel = KFL.$('[role=tabpanel]', root);
    function select(i, focus) {
      tabs.forEach(function (t, j) {
        t.setAttribute('aria-selected', String(i === j));
        t.tabIndex = i === j ? 0 : -1;
      });
      panel.setAttribute('aria-labelledby', tabs[i].id);
      if (focus) tabs[i].focus();
      onSelect(i, panel);
    }
    tabs.forEach(function (t, i) {
      t.addEventListener('click', function () { select(i); });
      t.addEventListener('keydown', function (e) {
        var n = tabs.length, k = { ArrowRight: i + 1, ArrowLeft: i - 1 + n, Home: 0, End: n - 1 }[e.key];
        if (k === undefined) return;
        e.preventDefault();
        select(k % n, true);
      });
    });
    select(0);
    return select;
  };
})(window.KFL);
