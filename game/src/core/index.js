/* 공유 코어의 단일 진입점.
   웹(Canvas)·앱(Skia)은 여기서 가져다 쓰고, 바깥 세계는 setHost()로 꽂는다.

   부팅 순서
     1) setHost({...})      — 색·소리·알림·저장을 타깃 구현으로 채운다
     2) loadSave()          — 저장 데이터 로드·검증 (데이터 목록에 의존하므로 반드시 이 순서)
     3) startRun() / update(dt) — 게임 루프는 타깃이 돌린다
*/
export { host, setHost } from "./host.js";
export * from "./util.js";
export * from "./color.js";
export * from "./data.js";
export * from "./save.js";
export * from "./state.js";
export * from "./input.js";
export * from "./wave.js";
export * from "./entity.js";
export * from "./run.js";
export * from "./shop.js";
export * from "./update.js";
export * from "./draw.js";
