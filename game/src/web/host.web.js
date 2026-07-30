/* ═══════════════════════════════════════════════
   호스트 연결 (웹)
   코어가 바깥 세계에 닿는 7개 지점을 브라우저 구현에 꽂는다.
   전부 지연 호출(화살표 래퍼)이라 아직 정의되지 않은 아래쪽 심볼도 안전하다.
   ═══════════════════════════════════════════════ */
const REDUCED = matchMedia("(prefers-reduced-motion: reduce)").matches;

setHost({
  color: k => C[k],
  sound: new Proxy({}, { get: (_, k) => (...a) => Snd[k] && Snd[k](...a) }),
  notify: (...a) => toast(...a),
  tip: (...a) => tip(...a),
  hudChanged: () => paintHud(),
  runEnded: () => endRun(),
  stageCleared: () => nextStage(),
  reduced: REDUCED,
  storage: {
    get: k => localStorage.getItem(k),
    set: (k, v) => localStorage.setItem(k, v)
  }
});

/* 저장 데이터 검증은 게임 데이터 목록(MAXLV·PILOTS·FRAMES·SKINS·TRAILS)에 의존한다 */
loadSave();
