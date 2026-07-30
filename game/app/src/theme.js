/* 색표 — 웹의 CSS 변수(game/src/index.template.html)와 같은 값이다.
   여기와 저기가 어긋나면 두 화면이 다른 제품처럼 보인다. 값을 고칠 때는 양쪽을 같이 고친다.

   토큰의 의미는 코어(core/color.js)가 정한다:
     signal 플레이어·아군 탄 / drift 적·적 탄 / moss 획득물 / dust 계기 / bad 경고 */

export const LIGHT = {
  ground: "#efece3", field: "#faf9f5", fg: "#141413", dim: "#6f6d64", line: "#d9d5c8",
  signal: "#d97757", drift: "#5d8fc2", moss: "#788c5d", dust: "#b0aea5", bad: "#b3402c",
  /* 소형 텍스트용 — 면 색 그대로 쓰면 라이트에서 대비가 모자란다 */
  signalT: "#a9482a", driftT: "#38658f", mossT: "#56663f",
};

export const DARK = {
  ground: "#0d0d0c", field: "#141413", fg: "#faf9f5", dim: "#97948a", line: "#302e29",
  signal: "#d97757", drift: "#6a9bcc", moss: "#94ab72", dust: "#b0aea5", bad: "#e0674a",
  signalT: "#e08e70", driftT: "#8bb4d9", mossT: "#94ab72",
};

export const themeFor = scheme => (scheme === "light" ? LIGHT : DARK);
