// instagram-sync 경기결과 글 (D-096, 총괄 4차 검토 2026-11-15) — '확실할 때만 쓰고, 아니면 빈 칸 + 메모'
// 틀린 쓰기 0: 아래 반례는 어떤 값도 쓰면 안 된다(점수 null 또는 득점 null).
import assert from "node:assert/strict";
import { test } from "node:test";
import { classifyPost, parseResult, type IgPost } from "../supabase/functions/instagram-sync/embed.ts";
import { planResult, resultScorers, type MatchLite, type ScorerRoster } from "../supabase/functions/instagram-sync/plan.ts";

const T = 1792404641; // 2026-10-19 19:10 KST
const post = (caption: string): IgPost => ({ code: "X", id: "1", typename: "GraphImage", isVideo: false, takenAt: T, caption, displayUrl: "" });
const m: MatchLite = { id: "m", kickoff: "2026-10-19T04:00:00Z", opponent: "노원제너FS", status: "scheduled", score_us: null, score_them: null };
const ROSTER: ScorerRoster = [
  { name: "김영록", number: 10, is_active: true },
  { name: "윤창욱", number: 8, is_active: true },
  { name: "김대현", number: 6, is_active: true },
  { name: "김대현", number: 18, is_active: true },
  { name: "떠난선수", number: 9, is_active: false },
];
const plan = (caption: string) => planResult(post(caption), [m], ROSTER);

test("쓰는 경우: 점수 꼴 1개 + 팀 이름만 + 득점자 모두 활동 선수 + 합 = 점수", () => {
  const ok = plan("𝑭𝑼𝑳𝑳 𝑻𝑰𝑴𝑬 🔵⚪️\n\n🔵 서울은평 덴포스 4 : 2 노원제너FS ⚪️\n\n⚽ 김영록 2, 윤창욱\n⚽ 자책골\n\n#서울은평덴포스");
  assert.deepEqual(ok, { update: { id: "m", status: "finished", score_us: 4, score_them: 2, scorers: "김영록 2, 윤창욱" }, note: null });
  // 상대가 앞, 2골 표기, 동명이인 번호, OG
  const ok2 = plan("FULL TIME\n노원제너FS 1 : 4 덴포스\n⚽ 김대현(No.18) 2골, 김영록\n⚽ OG");
  assert.deepEqual(ok2.update, { id: "m", status: "finished", score_us: 4, score_them: 1, scorers: "김대현 2, 김영록" });
  // 2025-26 분 표기 모양
  const old = plan("⚪15라운드 경기결과🔵\n\n서울은평덴포스 3 : 2 노원제너FS\n\n김영록 전반 5, 후반 6\n윤창욱 후반 11");
  assert.deepEqual(old.update?.scorers, "김영록 2, 윤창욱");
  // 'D:DD' 점수 (2025-26 실제 1:15) 는 시각이 아니다
  assert.deepEqual([parseResult("경기결과\n서울은평 덴포스 1:15 경기LBFS").scoreUs, parseResult("경기결과\n서울은평 덴포스 1:15 경기LBFS").scoreThem], [1, 15]);
  // 시계/날짜 줄은 세지 않는다
  assert.equal(parseResult("FULL TIME\n⏰ 11.15 (일) 14:00\n서울은평 덴포스 3 : 2 노원제너FS").scoreUs, 3);
});

test("반례: 점수를 쓰지 않는다 (점수 꼴 2개 이상, 표시가 붙은 줄, 팀 이름 없음)", () => {
  for (const caption of [
    "FULL TIME\n전반 서울은평 덴포스 1 : 2 노원제너FS\n후반 서울은평 덴포스 2 : 0 노원제너FS",
    "FULL TIME\nHalf-time 서울은평 덴포스 1 : 2 노원제너FS\n최종 3-2",
    "FULL TIME\n🆚 노원제너FS\n🔵 3 : 2 ⚪️\n\n전반 종료 서울은평 덴포스 1 : 2 노원제너FS",
    "FULL TIME\n최종 서울은평 덴포스 3 : 2 노원제너FS",
    "FULL TIME\n🆚 노원제너FS\n3 : 2\n⚽ 김영록",
    "FULL TIME\n14:00\n노원제너FS 1 : 4 덴포스",
    "FULL TIME\n서울은평 덴포스 3 : 2 노원제너FS\n(전반 1 : 0)",
  ]) {
    const p = plan(caption);
    assert.equal(p.update, null, caption);
    assert.match(p.note!, /점수를 쓰지 않음/, caption);
  }
});

test("반례: 득점자를 쓰지 않는다 (명단에 없는 이름, 괄호 숫자, 문장)", () => {
  for (const caption of [
    "FULL TIME\n서울은평 덴포스 2 : 1 노원제너FS\n⚽ 덴포스 / 김영록, 윤창욱",
    "FULL TIME\n서울은평 덴포스 2 : 1 노원제너FS\n⚽ 김영록(1), 윤창욱(1)",
    "FULL TIME\n서울은평 덴포스 1 : 0 노원제너FS\n전반 7분 선제골",
    "경기결과\n서울은평 덴포스 1 : 0 노원제너FS\n후반 12분 김영록 선수의 결승골로 승리",
    "FULL TIME\n서울은평 덴포스 1 : 0 노원제너FS\n⚽ 떠난선수",
    "FULL TIME\n서울은평 덴포스 1 : 0 노원제너FS",
  ]) {
    const p = plan(caption);
    assert.equal(p.update?.scorers ?? null, null, caption);
    if (p.update) assert.match(p.note!, /득점 줄을 다 읽지 못함/, caption);
  }
});

test("반례: 득점 줄을 다 읽었는데 합 ≠ 점수면 점수도 쓰지 않는다", () => {
  const p = plan("FULL TIME\n서울은평 덴포스 3 : 1 노원제너FS\n⚽ 김영록, 윤창욱");
  assert.equal(p.update, null);
  assert.match(p.note!, /득점 합이 점수\(3:1\)와 다름/);
});

test("0 : N 패배, 득점 줄 없음 → 점수만, 메모 없음", () => {
  assert.deepEqual(plan("FULL TIME\n서울은평 덴포스 0 : 2 노원제너FS"), { update: { id: "m", status: "finished", score_us: 0, score_them: 2, scorers: null }, note: null });
});

test("이미 같은 점수로 종료: 득점자 비었고 득점 줄을 못 읽으면 메모 다시, 다른 점수면 확인 필요", () => {
  const done = { ...m, status: "finished", score_us: 2, score_them: 1 };
  assert.match(planResult(post("FULL TIME\n서울은평 덴포스 2 : 1 노원제너FS\n⚽ 김영록(1), 윤창욱"), [done], ROSTER).note!, /득점 줄을 다 읽지 못함/);
  assert.match(planResult(post("FULL TIME\n서울은평 덴포스 3 : 1 노원제너FS\n⚽ 김영록 2, 윤창욱"), [done], ROSTER).note!, /이미 입력된 결과\(2:1\)/);
});

test("resultScorers: 동명이인 번호가 명단과 다르면 못 읽음, 비활동 선수는 아님", () => {
  assert.equal(resultScorers([["김대현(No.7)", 1]], 1, ROSTER).problem, "unreadable");
  assert.equal(resultScorers([["떠난선수", 1]], 1, ROSTER).problem, "unreadable");
  assert.equal(resultScorers([["상대 자책골", 1]], 1, ROSTER).scorers, null);
});

test("classifyPost: FULL TIME 은 첫 줄 전체일 때만, 경기결과도 첫 줄만, 둘 다 다른 종류보다 먼저", () => {
  const c = (caption: string) => classifyPost({ caption, isVideo: false });
  assert.equal(c("𝑭𝑼𝑳𝑳 𝑻𝑰𝑴𝑬 🔵⚪️\n응원 감사합니다 THANK YOU"), "result");
  assert.equal(c("𝟭𝗥 𝗙𝗨𝗟𝗟 𝗧𝗜𝗠𝗘\nWELCOME"), "result");
  assert.equal(c("🔵 𝑭𝑼𝑳𝑳-𝑻𝑰𝑴𝑬 ⚪️\n..."), "result");
  assert.equal(c("FULL TIME 까지 함께 뛰겠습니다"), "other");
  assert.equal(c("FULL TIME까지 응원해 주세요!"), "other");
  assert.equal(c("⚪15라운드 경기결과🔵\n..."), "result");
  assert.equal(c("오늘도 응원 감사합니다\n경기결과는 곧"), "other");
  assert.equal(c("𝑴𝑨𝑻𝑪𝑯 𝑫𝑨𝒀 🔵⚪️\nFULL TIME 까지 응원해 주세요"), "matchday");
});
