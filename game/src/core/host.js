/* 코어가 바깥 세계에 닿는 유일한 통로.
   웹은 Canvas·WebAudio·localStorage를, 앱은 Skia·expo-audio·AsyncStorage를 꽂는다.
   기본값은 전부 무동작이라 host 없이도 코어만 돌려 테스트할 수 있다. */
export const host = {
  sound: new Proxy({}, { get: () => () => {} }),
  notify: () => {},            // 화면 상단 알림(토스트)
  tip: () => {},               // 첫 안내
  hudChanged: () => {},        // HUD 수치가 바뀌었다
  runEnded: () => {},          // 런 종료(사망·중단) — 정산과 화면 전환은 타깃이 한다
  stageCleared: () => {},      // 구역 클리어 — 보너스 정산·다음 구역 진입
  Path2D: null,                // 경로 캐시 — 웹은 브라우저 것, 앱은 Skia 어댑터가 준다
  fontFamily: "sans-serif",   // 계기·라벨에 쓰는 서체
  reduced: false,              // prefers-reduced-motion
  storage: { get: () => null, set: () => {} }
};

/* 어느 지점을 실제로 꽂았는지 기록해 둔다.
   한 곳만 빠뜨려도 화면은 멀쩡히 돌면서 기본값(무동작·sans-serif)으로 흘러가
   눈으로는 안 잡힌다. 검사가 이 목록을 본다. */
export const wired = new Set();

export function setHost(h) {
  Object.assign(host, h);
  for (const k of Object.keys(h)) wired.add(k);
}

/* 아직 안 꽂힌 지점 — 비어 있어야 한다 */
export const unwired = () => Object.keys(host).filter(k => !wired.has(k));
