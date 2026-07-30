/* 코어가 바깥 세계에 닿는 유일한 통로.
   웹은 Canvas·WebAudio·localStorage를, 앱은 Skia·expo-audio·AsyncStorage를 꽂는다.
   기본값은 전부 무동작이라 host 없이도 코어만 돌려 테스트할 수 있다. */
export const host = {
  color: () => "#888888",      // 'signal'|'drift'|'moss'|'dust'|'fg'|'field'|'line'|'ground'|'bad'
  sound: new Proxy({}, { get: () => () => {} }),
  notify: () => {},            // 화면 상단 알림(토스트)
  tip: () => {},               // 첫 안내
  hudChanged: () => {},        // HUD 수치가 바뀌었다
  runEnded: () => {},          // 런 종료(사망·중단) — 정산과 화면 전환은 타깃이 한다
  stageCleared: () => {},      // 구역 클리어 — 보너스 정산·다음 구역 진입
  reduced: false,              // prefers-reduced-motion
  storage: { get: () => null, set: () => {} }
};

export function setHost(h) { Object.assign(host, h); }
