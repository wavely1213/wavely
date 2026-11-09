/* 라이트/다크 전환. <head>에서 먼저 실행해 저장된 선택을 바로 적용하고(깜빡임 방지),
   버튼은 DOM 준비 후 연결한다. 저장소를 못 쓰는 환경에서도 전환은 동작한다. */
(function () {
  var KEY = 'kfl-theme';
  var root = document.documentElement;
  var dark = window.matchMedia('(prefers-color-scheme: dark)');

  function saved() { try { return localStorage.getItem(KEY); } catch (e) { return null; } }
  function save(v) { try { localStorage.setItem(KEY, v); } catch (e) { /* 저장 불가: 이번 방문에만 적용 */ } }
  function isDark() {
    var t = root.getAttribute('data-theme');
    return t ? t === 'dark' : dark.matches;
  }

  var initial = saved();
  if (initial === 'light' || initial === 'dark') root.setAttribute('data-theme', initial);

  function paint(btn) {
    var on = isDark();
    btn.querySelector('.label').textContent = on ? '다크 모드 끄기' : '다크 모드 켜기';
  }

  document.addEventListener('DOMContentLoaded', function () {
    var btn = document.getElementById('theme-toggle');
    if (!btn) return;
    paint(btn);
    btn.addEventListener('click', function () {
      var next = isDark() ? 'light' : 'dark';
      root.setAttribute('data-theme', next);
      save(next);
      paint(btn);
    });
    // 직접 고른 적이 없으면 시스템 설정 변경을 따라간다
    dark.addEventListener('change', function () { if (!saved()) paint(btn); });
  });
})();
