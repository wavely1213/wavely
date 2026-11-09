/* 글 페이지(article)와 조직도(org).
   글: 읽는 칸(왼쪽, 제목과 같은 선) + 사진 칸(오른쪽). 원본 그림 속 글자는 tools/structure.py 가 옮겨 적은 것을 그린다. */
(function (KFL) {
  var esc = KFL.esc;

  function block(b) {
    switch (b.t) {
      case 'lead': return '<p class="lead">' + esc(b.text) + '</p>';
      case 'h': return '<h2 class="art-h">' + esc(b.text) + '</h2>';
      case 'list': return '<ul class="art-list">' + b.items.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>';
      case 'figure': return '<figure class="art-figure"><img src="' + esc(b.img) + '" alt="' + esc(b.alt) + '" loading="lazy"></figure>';
      case 'pyramids': return pyramids(b.items);
      case 'effects': return effects(b);
      case 'table': return '<div class="table-wrap art-table" tabindex="0" role="region" aria-label="' + esc(b.caption || '표') + '"><table class="data"><thead><tr>' +
        b.head.map(function (h) { return '<th scope="col">' + esc(h) + '</th>'; }).join('') + '</tr></thead><tbody>' +
        b.rows.map(function (r) { return '<tr>' + r.map(function (v) { return '<td>' + esc(v) + '</td>'; }).join('') + '</tr>'; }).join('') +
        '</tbody></table></div>';
      case 'steps': return '<ol class="steps">' + b.items.map(function (x, i) {
        return '<li><span class="step-n">Step' + (i + 1) + '</span><span>' + esc(x) + '</span></li>';
      }).join('') + '</ol>';
      case 'link': return '<p><a class="btn" href="' + esc(b.href) + '" target="_blank" rel="noopener">' + esc(b.text) + '<span class="sr-only"> (새 창)</span></a></p>';
      default: return '<p>' + esc(b.text) + '</p>';
    }
  }

  // 연령대 분포도: 층마다 폭이 다른 막대(위가 넓으면 역삼각형)
  function pyramids(items) {
    return '<div class="pyramids">' + items.map(function (p) {
      var n = p.levels.length;
      return '<figure class="pyramid shape-' + p.shape + '"><ol>' + p.levels.map(function (lv, i) {
        var step = p.shape === 'inverted' ? n - i : i + 1;
        return '<li style="--w:' + Math.round(100 * step / n) + '%"><span>' + esc(lv) + '</span></li>';
      }).join('') + '</ol><figcaption>' + esc(p.title) + '</figcaption></figure>';
    }).join('') + '</div>';
  }

  // 기대효과: 가운데 문장 + 네 가지
  function effects(b) {
    return '<div class="effects"><p class="effects-center">' + esc(b.center) + '</p><ul>' +
      b.items.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul></div>';
  }

  KFL.views.article = function (page, root) {
    var a = page.aside;
    // 표는 바로 앞 소제목을 이름으로
    page.blocks.forEach(function (b, i) { if (b.t === 'table' && i && page.blocks[i - 1].t === 'h') b.caption = page.blocks[i - 1].text; });
    root.innerHTML = '<div class="article' + (a ? ' has-aside' : '') + '">' +
      '<div class="art-body">' + page.blocks.map(block).join('') +
      (page.sign ? '<p class="art-sign"><span>' + esc(page.sign.role) + '</span> <strong>' + esc(page.sign.name) + '</strong></p>' : '') +
      '</div>' +
      (a ? '<figure class="art-aside"><img src="' + esc(a.img) + '" alt="' + esc(a.alt) + '"></figure>' : '') +
      '</div>';
  };

  /* ---------- 조직도: 넓은 화면은 그림(SVG, 화면낭독기는 목록을 읽음), 좁은 화면은 들여쓴 목록 ---------- */
  // 좌표는 원본 그림의 배치를 따른다(가로 720 기준)
  function chart(o) {
    var W = 128, H = 44;
    var nodes = [], lines = [];
    function node(x, y, label, kind, w) { nodes.push({ x: x, y: y, label: label, kind: kind || '', w: w || W }); }
    function line(pts) { lines.push(pts.map(function (p) { return p.join(','); }).join(' ')); }
    // 대의원총회
    node(150, 50, o.assembly.name, 'assembly', 150);
    o.assembly.children.forEach(function (c, i) { node(80 + i * 150, 140, c, 'assembly'); });
    line([[150, 72], [150, 104], [80, 104], [80, 118]]); line([[150, 104], [230, 104], [230, 118]]);
    // 회장 · 감사/고문
    node(430, 50, o.head, 'head', 160);
    o.audit.forEach(function (c, i) { node(640, 30 + i * 52, c, 'side'); });
    line([[510, 50], [550, 50]]); line([[550, 30], [550, 82]]); line([[550, 30], [576, 30]]); line([[550, 82], [576, 82]]);
    // 집행: 부회장단 → (이사회) → 전무이사 → 사무총장
    var y = 140;
    var spineTop = 72;
    o.chain.forEach(function (c) {
      node(430, y, c, 'exec');
      if (c === o.board.after) {
        y += 80;
        node(200, y, o.board.name, 'exec');
        line([[264, y], [430, y]]);
        o.board.children.forEach(function (k) { node(200, y + 80, k, 'exec'); line([[200, y + 22], [200, y + 58]]); });
      }
      y += 80;
    });
    var last = y - 80;
    line([[430, spineTop], [430, last - 22]]);
    // 사무국: 사업팀(FK리그·생활체육) · 총무팀
    var ty = last + 100, bx = [300, 580];
    line([[430, last + 22], [430, ty - 40], [bx[0], ty - 40], [bx[0], ty - 22]]); line([[430, ty - 40], [bx[1], ty - 40], [bx[1], ty - 22]]);
    o.teams.forEach(function (t, i) {
      node(bx[i], ty, t.name, 'team');
      if (t.children.length) {
        var cy = ty + 90, cx = [bx[i] - 80, bx[i] + 80];
        line([[bx[i], ty + 22], [bx[i], cy - 40], [cx[0], cy - 40], [cx[0], cy - 22]]); line([[bx[i], cy - 40], [cx[1], cy - 40], [cx[1], cy - 22]]);
        t.children.forEach(function (k, j) { node(cx[j], cy, k, 'team'); });
      }
    });
    var height = Math.max.apply(null, nodes.map(function (n) { return n.y; })) + 40;
    return '<svg class="org-chart" viewBox="0 0 720 ' + height + '" aria-hidden="true" focusable="false">' +
      lines.map(function (p) { return '<polyline points="' + p + '"/>'; }).join('') +
      nodes.map(function (n) {
        return '<g class="org-node ' + n.kind + '"><rect x="' + (n.x - n.w / 2) + '" y="' + (n.y - H / 2) + '" width="' + n.w + '" height="' + H + '" rx="4"/>' +
          '<text x="' + n.x + '" y="' + (n.y + 6) + '">' + esc(n.label) + '</text></g>';
      }).join('') + '</svg>';
  }

  function tree(o) {
    function li(label, kids, cls) {
      return '<li' + (cls ? ' class="' + cls + '"' : '') + '><span>' + esc(label) + '</span>' + (kids && kids.length ? '<ul>' + kids.join('') + '</ul>' : '') + '</li>';
    }
    var chain = o.chain.slice().reverse().reduce(function (inner, c) {
      var kids = inner ? [inner] : o.teams.map(function (t) { return li(t.name, t.children.map(function (k) { return li(k); })); });
      if (c === o.board.after) kids.unshift(li(o.board.name, o.board.children.map(function (k) { return li(k); })));
      return li(c, kids);
    }, null);
    return '<ul class="org-tree">' +
      li(o.head, o.audit.map(function (a) { return li(a, null, 'side'); }).concat([chain]), 'head') +
      li(o.assembly.name, o.assembly.children.map(function (k) { return li(k, null, 'assembly'); }), 'assembly') + '</ul>';
  }

  KFL.views.org = function (page, root) {
    root.innerHTML = '<div class="org">' + chart(page.org) + tree(page.org) + '</div>';
  };
})(window.KFL);
