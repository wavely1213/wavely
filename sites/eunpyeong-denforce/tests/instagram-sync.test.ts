// 인스타그램 자동 반영 규칙 (D-065, BR-029) — 게시물 → 포스팅/구단소식/선수/경기. 실행: npm test
import assert from "node:assert/strict";
import { test } from "node:test";
import { LEAGUE } from "../src/config/league.ts";
import type { IgPost } from "../supabase/functions/instagram-sync/embed.ts";
import { hasBatchim, josa, nameSlug } from "../supabase/functions/instagram-sync/korean.ts";
import {
  captionLines,
  competitionOf,
  farewellNews,
  LEAGUE_COMPETITION,
  parseFarewell,
  parseWelcome,
  planFarewell,
  planMatchday,
  planResult,
  planWelcome,
  plainText,
  postingDraft,
  reelNews,
  scorersText,
  seasonOf,
  welcomeNews,
  type MatchLite,
  type RosterPlayer,
} from "../supabase/functions/instagram-sync/plan.ts";

/** 2026-10-19 19:10 KST */
const T = 1792404641;
const post = (caption: string, extra: Partial<IgPost> = {}): IgPost => ({ code: "DerArQ-TWEJ", id: "1", typename: "GraphImage", isVideo: false, takenAt: T, caption, displayUrl: "", ...extra });
const IMG = "https://x.supabase.co/storage/v1/object/public/media/news/ig-DerArQ-TWEJ-1.jpg";

test("리그 대회 이름이 사이트 설정과 같다", () => {
  assert.equal(LEAGUE_COMPETITION, LEAGUE.currentCompetition);
});

test("korean: 받침/조사/선수 주소", () => {
  assert.equal(hasBatchim("김남석"), true);
  assert.equal(hasBatchim("김종호"), false);
  assert.equal(josa("김남석", "을를"), "김남석을");
  assert.equal(josa("김종호", "을를"), "김종호를");
  assert.equal(josa("박영완", "이가"), "박영완이");
  assert.equal(josa("장성호 감독", "과와"), "장성호 감독과");
  assert.equal(josa("김기범 코치", "과와"), "김기범 코치와");
  assert.equal(nameSlug("김종호"), "kim-jongho");
  assert.equal(nameSlug("박재희"), "park-jaehui");
  assert.equal(nameSlug("임우성"), "lim-useong");
  assert.equal(nameSlug("곽ABC"), "", "한글 두 글자 미만이면 빈 값");
  assert.match(nameSlug("뷁뛟"), /^[a-z]+-[a-z]+$/, "흔하지 않은 성도 로마자로");
});

test("seasonOf: 5월부터 다음 시즌", () => {
  assert.equal(seasonOf("2026-10-19"), "2026-27");
  assert.equal(seasonOf("2026-04-30"), "2025-26");
  assert.equal(seasonOf("2026-05-01"), "2026-27");
  assert.equal(seasonOf("2099-12-01"), "2099-00");
});

test("captionLines/plainText: 해시태그 줄 빼기, 꾸밈 글자/이모지 빼기", () => {
  assert.deepEqual(captionLines("𝑾𝑬𝑳𝑪𝑶𝑴𝑬 🤝\n\n본문\n\n#서울은평덴포스 #fk리그"), ["𝑾𝑬𝑳𝑪𝑶𝑴𝑬 🤝", "본문"]);
  assert.equal(plainText("𝑾𝑬𝑳𝑪𝑶𝑴𝑬 🤝"), "WELCOME");
  assert.equal(plainText("No.77 김영록의 추가골🔥"), "No.77 김영록의 추가골");
  assert.equal(plainText("⚽️ 김영록"), "김영록");
});

test("postingDraft: 머리말 글은 둘째 줄까지, 나머지는 첫 줄", () => {
  const w = postingDraft(post("𝑾𝑬𝑳𝑪𝑶𝑴𝑬 🤝\n\n서울은평덴포스가 확실한 존재감 김종호 선수를 영입했습니다.\n\n#서울은평덴포스"), "welcome");
  assert.equal(w.title, "𝑾𝑬𝑳𝑪𝑶𝑴𝑬 🤝 서울은평덴포스가 확실한 존재감 김종호 선수를 영입했습니다.");
  assert.equal(w.url, "https://www.instagram.com/p/DerArQ-TWEJ/");
  assert.equal(w.posted_on, "2026-10-19");
  assert.equal(w.author, "@eunpyeong_denforce");
  const r = postingDraft(post("No.77 김영록의 추가골🔥\n\n⚽️ 김영록\n📦 백승하\n\n#덴포스"), "reel");
  assert.equal(r.title, "No.77 김영록의 추가골🔥");
  assert.equal(r.excerpt, "No.77 김영록의 추가골🔥 ⚽️ 김영록 📦 백승하");
  assert.equal(postingDraft(post("#해시태그만"), "other").title, "구단 인스타그램 게시물");
  assert.equal([...postingDraft(post("가".repeat(400)), "other").excerpt].length, 300);
});

test("reelNews: 구단영상 — 제목/득점/도움", () => {
  const n = reelNews(post("No.77 경기를 끝내는 김영록의 추가골🔥\n\n⚽️ 김영록\n📦 백승하\n\n#서울은평덴포스", { code: "DWlRVxrjznK", isVideo: true }), "https://x/reel.jpg");
  assert.equal(n.category, "video");
  assert.equal(n.title, "No.77 경기를 끝내는 김영록의 추가골");
  assert.equal(n.summary, "득점 김영록 / 도움 백승하");
  assert.equal(n.body, "득점 김영록 / 도움 백승하\n\n구단 공식 인스타그램(@eunpyeong_denforce) 릴스 (2026-10-19)");
  assert.equal(n.video_url, "https://www.instagram.com/reel/DWlRVxrjznK/");
  assert.equal(n.thumbnail_url, "https://x/reel.jpg");
  assert.equal(reelNews(post("", { isVideo: true }), "u").title, "구단 릴스 (2026-10-19)");
});

const WELCOME_PIVO = "𝑾𝑬𝑳𝑪𝑶𝑴𝑬 🤝\n\n서울은평덴포스가 지치지 않는 피보 박재희 선수를 영입했습니다.\n\n박재희 선수의 합류로 더욱 강해질 서울은평덴포스에 많은 관심과 응원 부탁드립니다. 💙";

test("parseWelcome: 이름/수식어/포지션/등번호/인사말", () => {
  assert.deepEqual(parseWelcome(WELCOME_PIVO), {
    name: "박재희",
    epithet: "지치지 않는 피보",
    number: null,
    position: "PIVO",
    quote: "박재희 선수의 합류로 더욱 강해질 서울은평 덴포스에 많은 관심과 응원 부탁드린다",
  });
  const no1 = parseWelcome("𝑾𝑬𝑳𝑪𝑶𝑴𝑬 🤝\n\n서울은평덴포스가 No.1 임우성 선수를 영입했습니다.");
  assert.equal(no1?.name, "임우성");
  assert.equal(no1?.epithet, "");
  assert.equal(no1?.number, 1);
  assert.equal(no1?.position, null);
  assert.equal(parseWelcome("𝑾𝑬𝑳𝑪𝑶𝑴𝑬\n서울은평덴포스가 거침없는 질주 강민원 선수를 영입했습니다.")?.epithet, "거침없는 질주");
  assert.equal(parseWelcome("𝑾𝑬𝑳𝑪𝑶𝑴𝑬\n서울은평덴포스가 김기범 수석코치를 영입했습니다."), null, "스태프는 읽지 않음");
});

test("welcomeNews: 영입 기사 (기존 기사와 같은 틀)", () => {
  const w = parseWelcome(WELCOME_PIVO)!;
  const n = welcomeNews(post(WELCOME_PIVO), w, IMG, "park-jaehui");
  assert.equal(n.title, "서울은평 덴포스, '지치지 않는 피보' 박재희 영입");
  assert.equal(n.summary, "피보(PIVO), 2026-27 시즌 FK리그 1부(FK1)에서 함께한다");
  assert.equal(
    n.body,
    [
      "서울은평 덴포스가 피보 박재희를 영입했다.",
      "서울은평 덴포스는 19일 구단 공식 SNS를 통해 '지치지 않는 피보' 박재희의 합류 소식을 전했다.",
      '구단은 "박재희 선수의 합류로 더욱 강해질 서울은평 덴포스에 많은 관심과 응원 부탁드린다"고 밝혔다.',
      "서울은평 덴포스는 2026-27 시즌 FK리그 1부(FK1)에 나선다.",
      "박재희 프로필\n포지션: 피보(PIVO)\nhttps://eunpyeong-fs.com/team/players/park-jaehui",
    ].join("\n\n"),
  );
  assert.deepEqual(n.images, [IMG]);
  assert.equal(n.category, "news");
  assert.ok(!/·/.test(n.title + n.summary + n.body), "중간점 없음 (BR-024)");

  const no1 = parseWelcome("WELCOME\n서울은평덴포스가 No.1 임우성 선수를 영입했습니다.")!;
  const m = welcomeNews(post(""), no1, IMG, null);
  assert.equal(m.title, "서울은평 덴포스, 임우성 영입");
  assert.equal(m.summary, "등번호 1번, 2026-27 시즌 FK리그 1부(FK1)에서 함께한다");
  assert.match(m.body, /임우성은 2026-27 시즌 등번호 1번을 단다\./);
  assert.match(m.body, /임우성 프로필\n등번호: 1$/, "선수를 추가하지 않았으면 주소 없음");
});

const roster: RosterPlayer[] = [
  { id: "a", name: "김종호", is_active: true, position: "PIVO", slug: "no-22" },
  { id: "b", name: "박영완", is_active: true, position: "GK", slug: "no-25" },
  { id: "c", name: "김대현", is_active: true, position: "FIXO", slug: "no-8" },
  { id: "d", name: "김대현", is_active: true, position: "FIXO", slug: "no-18" },
  { id: "e", name: "송민혁", is_active: false, position: "PIVO", slug: "no-5" },
  { id: "f", name: "다른", is_active: true, position: "ALA", slug: "park-jaehui" },
];

test("planWelcome: 포지션 있고 같은 이름 없을 때만 선수 추가 (주소 겹치면 -2)", () => {
  const w = parseWelcome(WELCOME_PIVO)!;
  assert.deepEqual(planWelcome(w, roster), { add: { slug: "park-jaehui-2", name: "박재희", position: "PIVO" }, note: null });
  assert.match(planWelcome({ ...w, position: null }, roster).note!, /포지션이 없어/);
  assert.match(planWelcome({ ...w, name: "김종호" }, roster).note!, /활동 중인 같은 이름 선수\(김종호\)/);
  assert.match(planWelcome({ ...w, name: "송민혁" }, roster).note!, /활동이 꺼진 같은 이름/);
  assert.equal(planWelcome({ ...w, name: "김종호" }, roster).add, null);
});

test("parseFarewell / planFarewell / farewellNews: 이적 선수 활동 끄기 + 작별 기사", () => {
  const f = parseFarewell("GOOD LUCK\n박영완 선수가 이적을 하며 은평과의 동행을 마무리하게 됐습니다.\n한 시즌동안 …🍀")!;
  assert.deepEqual(f, { name: "박영완", role: "선수", transfer: true });
  const plan = planFarewell(f, roster);
  assert.equal(plan.deactivate?.id, "b");
  assert.match(plan.note!, /자동으로 껐음/, "자동으로 끈 것은 확인 메모");
  const n = farewellNews(post(""), f, IMG, "GK");
  assert.equal(n.title, "박영완, 이적으로 서울은평 덴포스와 동행 마무리");
  assert.equal(n.summary, "골레이로 박영완, 새 팀에서 새로운 도전");
  assert.equal(n.body, "서울은평 덴포스 골레이로 박영완이 이적하며 팀과의 동행을 마무리했다.\n\n서울은평 덴포스는 19일 구단 공식 SNS를 통해 박영완의 이적 소식을 전하며 그의 앞날을 응원했다.");

  assert.match(planFarewell({ ...f, name: "김대현" }, roster).note!, /같은 이름 활동 선수 2명/);
  assert.match(planFarewell({ ...f, name: "없음" }, roster).note!, /찾지 못해/);

  const staff = parseFarewell("THANK YOU\n\n장성호 감독과의 동행을 마무리합니다.\n\n어려운 상황 속에서도 …")!;
  assert.deepEqual(staff, { name: "장성호", role: "감독", transfer: false });
  assert.equal(planFarewell(staff, roster).deactivate, null);
  assert.match(planFarewell(staff, roster).note!, /코칭스태프에서 정리/);
  assert.equal(farewellNews(post(""), staff, IMG, null).title, "서울은평 덴포스, 장성호 감독과 동행 마무리");
  assert.equal(parseFarewell("GOOD LUCK\n앞날을 응원합니다"), null);
});

test("competitionOf: 리그/컵/플레이오프", () => {
  assert.deepEqual(competitionOf("15라운드", "2026-11-07"), { competition: "2026-27 FK1리그", round: "15R" });
  assert.deepEqual(competitionOf("FK1 3R", "2026-11-07"), { competition: "2026-27 FK1리그", round: "3R" });
  assert.deepEqual(competitionOf("2026 FK CUP 3R", "2026-08-25"), { competition: "2026 FK CUP", round: "3R" });
  assert.deepEqual(competitionOf("PLAYOFF", "2026-04-04"), { competition: "2025-26 승강 플레이오프", round: "" });
  assert.deepEqual(competitionOf("FA컵 3라운드", "2026-08-25"), { competition: "2026 FA컵", round: "3R" });
  assert.deepEqual(competitionOf("친선경기", "2026-08-25"), { competition: "친선경기", round: "" });
  assert.deepEqual(competitionOf("", "2026-08-25"), { competition: "경기", round: "" });
});

const MATCHDAY = "🔵MATCH DAY⚪️\n\n15라운드\n🆚 서울은평덴포스 vs 전주시민풋살구단\n🕑 13:00\n📍 은평다목적체육관\n📺 YouTube 생중계\n\n#서울은평덴포스";

test("planMatchday: 경기 일정 넣기 (홈 경기장 = 은평), 같은 날 같은 상대는 넣지 않음", () => {
  const p = post(MATCHDAY);
  assert.deepEqual(planMatchday(p, []), {
    insert: { competition: "2026-27 FK1리그", round: "15R", kickoff: "2026-10-19T13:00:00+09:00", venue: "은평다목적체육관", is_home: true, opponent: "전주시민풋살구단", status: "scheduled" },
    note: null,
  });
  const away = planMatchday(post(MATCHDAY.replace("은평다목적체육관", "단양국민체육센터")), []);
  assert.equal(away.insert?.is_home, false);
  assert.match(away.note!, /원정 경기로 넣음 \(경기장: 단양국민체육센터\)/);
  const existing: MatchLite[] = [{ id: "m", kickoff: "2026-10-19T04:00:00Z", opponent: "전주시민 풋살구단", status: "scheduled", score_us: null, score_them: null }];
  assert.deepEqual(planMatchday(p, existing), { insert: null, note: null });
  const other: MatchLite[] = [{ ...existing[0], opponent: "화성FS" }];
  assert.match(planMatchday(p, other).note!, /다른 상대\(화성FS\)/);
  assert.match(planMatchday(post("🔵MATCH DAY⚪️\n오늘 응원해 주세요"), []).note!, /읽지 못함/);
});

test("scorersText: 득점 줄 → '이름 골수' (자책골 제외)", () => {
  assert.equal(scorersText(["백승하 전반 5, 후반 6, 14", "윤창욱 전반 11", "김영록 전반 13, 후반 15, 19"]), "백승하 3, 윤창욱, 김영록 3");
  assert.equal(scorersText(["백승하 전반 '18", "김영록 후반 '6", "O.G 후반 '6"]), "백승하, 김영록");
  assert.equal(scorersText(["O.G 후반 6"]), null);
  assert.equal(scorersText([]), null);
});

const RESULT = "⚪15라운드 경기결과🔵\n\n서울은평덴포스 7 : 5 전주시민풋살구단\n\n백승하 전반 5, 후반 6, 14\n윤창욱 전반 11\n\n#서울은평덴포스";

test("planResult: 최근 7일 같은 상대 '예정' 경기에 결과, 이미 결과가 있으면 그대로", () => {
  const sched: MatchLite = { id: "m1", kickoff: "2026-10-17T04:00:00Z", opponent: "전주시민풋살구단", status: "scheduled", score_us: null, score_them: null };
  assert.deepEqual(planResult(post(RESULT), [sched]), { update: { id: "m1", status: "finished", score_us: 7, score_them: 5, scorers: "백승하 3, 윤창욱" }, note: null });
  assert.deepEqual(planResult(post(RESULT), [{ ...sched, status: "finished", score_us: 7, score_them: 5 }]), { update: null, note: null });
  assert.match(planResult(post(RESULT), [{ ...sched, status: "finished", score_us: 6, score_them: 5 }]).note!, /이미 입력된 결과\(6:5\)/);
  assert.match(planResult(post(RESULT), [{ ...sched, kickoff: "2026-10-01T04:00:00Z" }]).note!, /찾지 못함 \(결과 7:5\)/, "7일보다 오래된 경기는 아님");
  assert.match(planResult(post("⚪경기결과🔵\n아쉽게 졌습니다"), [sched]).note!, /읽지 못함/);
});

test("자동 기사 제목을 대시보드 인사 알림이 읽는다 (선수 추가/빼기 필요)", async () => {
  const { parseRosterNews } = await import("../src/lib/admin/alerts.ts");
  const w = parseWelcome(WELCOME_PIVO)!;
  assert.deepEqual(parseRosterNews(welcomeNews(post(WELCOME_PIVO), w, IMG, null).title), { kind: "join", name: "박재희", staff: false });
  const no1 = parseWelcome("WELCOME\n서울은평덴포스가 No.1 임우성 선수를 영입했습니다.")!;
  assert.deepEqual(parseRosterNews(welcomeNews(post(""), no1, IMG, null).title), { kind: "join", name: "임우성", staff: false });
  const f = { name: "박영완", role: "선수", transfer: true };
  assert.deepEqual(parseRosterNews(farewellNews(post(""), f, IMG, null).title), { kind: "leave", name: "박영완", staff: false });
  assert.deepEqual(parseRosterNews(farewellNews(post(""), { ...f, transfer: false }, IMG, null).title), { kind: "leave", name: "박영완", staff: false });
  assert.deepEqual(parseRosterNews(farewellNews(post(""), { name: "장성호", role: "감독", transfer: false }, IMG, null).title), { kind: "leave", name: "장성호", staff: true });
});

test("instagramAlerts: 1시간 넘게 성공 없음 / 실패 / 확인할 것", async () => {
  const { instagramAlerts } = await import("../src/lib/admin/alerts.ts");
  const now = new Date("2026-10-23T10:00:00Z");
  assert.deepEqual(instagramAlerts({ lastOkAt: "2026-10-23T09:30:00Z", lastError: null, review: 0, errors: 0, now }), []);
  const stale = instagramAlerts({ lastOkAt: "2026-10-23T08:59:00Z", lastError: "인스타그램 임베드 429", review: 0, errors: 0, now });
  assert.equal(stale.length, 1);
  assert.equal(stale[0].level, "warn");
  assert.equal(stale[0].detail, "인스타그램 임베드 429");
  assert.equal(stale[0].href, "/admin/instagram");
  assert.match(instagramAlerts({ lastOkAt: null, lastError: null, review: 0, errors: 0, now })[0].detail!, /한 번도/);
  const both = instagramAlerts({ lastOkAt: "2026-10-23T09:59:00Z", lastError: null, review: 2, errors: 1, now });
  assert.deepEqual(both.map((a) => [a.level, a.title]), [
    ["warn", "인스타그램 게시물 1개를 넣지 못했습니다"],
    ["check", "인스타그램에서 들어온 것 중 확인할 것 2개"],
  ]);
});

// ── 독립 검토(D-065)에서 나온 경우들 ──

test("작별: 떠난다는 말이 분명할 때만, 한 사람만", () => {
  assert.equal(parseFarewell("GOOD LUCK 🍀\n\n최진규 선수가 국가대표팀 소집으로 잠시 팀을 떠나게 되었습니다."), null, "잠시 떠남은 작별 아님");
  assert.equal(parseFarewell("THANK YOU 💙\n\n최진규 선수가 2026-27 시즌에도 서울은평덴포스와 동행합니다."), null, "재계약");
  assert.equal(parseFarewell("THANK YOU\n끝까지 싸워준 선수 여러분 모두와의 동행에 감사드립니다."), null, "시즌 인사");
  assert.equal(parseFarewell("GOOD LUCK\n박종현, 김성국, 김경모 선수가 이적을 하며 은평과의 동행을 마무리하게 됐습니다."), null, "여러 명");
  assert.deepEqual(parseFarewell("GOOD LUCK\n김경모 선수가 이적을 하며 은평과의 동행을 마무리하게 됐습니다."), { name: "김경모", role: "선수", transfer: true });
});

test("planFarewell: 활동 끔은 확인 메모, 선수를 못 찾으면 기사도 넣지 않음", () => {
  const f = { name: "박영완", role: "선수", transfer: true };
  const on = planFarewell(f, roster);
  assert.equal(on.deactivate?.id, "b");
  assert.equal(on.publish, true);
  assert.match(on.note!, /자동으로 껐음/);
  assert.equal(planFarewell({ ...f, name: "없음" }, roster).publish, false);
  assert.equal(planFarewell({ ...f, name: "김대현" }, roster).publish, false);
  assert.equal(planFarewell({ name: "장성호", role: "감독", transfer: false }, roster).publish, true);
});

test("영입: 여러 명/이름 아닌 말은 읽지 않고, 포지션은 이름 바로 앞 낱말만", () => {
  assert.equal(parseWelcome("WELCOME\n서울은평덴포스가 2026-27 시즌을 함께할 신규 선수를 영입했습니다."), null);
  assert.equal(parseWelcome("WELCOME\n서울은평덴포스가 아라 김종호, 피보 박재희 선수를 영입했습니다."), null);
  assert.equal(parseWelcome("WELCOME\n서울은평덴포스가 피보 출신 아라 박재희 선수를 영입했습니다."), null, "포지션 낱말이 둘");
  assert.equal(parseWelcome("WELCOME\n서울은평덴포스가 피보를 꿈꾸던 박재희 선수를 영입했습니다.")?.position, null);
});

test("릴스: 제목 줄의 ⚽ 는 득점자가 아니고, 요약은 300자 안", () => {
  const n = reelNews(post("⚽️ 오늘의 훈련 현장 스케치\n\n#덴포스", { isVideo: true }), "u");
  assert.equal(n.summary, "");
  assert.equal(n.title, "오늘의 훈련 현장 스케치");
  const long = reelNews(post(`제목\n⚽️ ${"가".repeat(400)}\n📦 ${"나".repeat(400)}`, { isVideo: true }), "u");
  assert.ok([...long.summary].length <= 300);
});

test("captionLines: 붙은 해시태그도 빨리 판단 (되돌아가며 느려지지 않음)", () => {
  const line = Array.from({ length: 40 }, (_, i) => `#태그${i}`).join("") + " 오늘";
  const t = performance.now();
  assert.deepEqual(captionLines(line), [line]);
  assert.ok(performance.now() - t < 200, "40개여도 금방");
  assert.deepEqual(captionLines("#a#b #c"), []);
});

test("siteCaption: 중간점 → 슬래시 (BR-024)", async () => {
  const { siteCaption } = await import("../supabase/functions/instagram-sync/plan.ts");
  assert.equal(siteCaption("백승하·김영록 합작골"), "백승하/김영록 합작골");
  assert.equal(siteCaption("A · B"), "A / B");
});

test("planMatchday: 이미 있는 경기와 시간/경기장이 다르면 알림", () => {
  const existing: MatchLite[] = [{ id: "m", kickoff: "2026-10-19T05:00:00Z", opponent: "전주시민풋살구단", status: "scheduled", score_us: null, score_them: null, venue: "은평다목적체육관" }];
  assert.match(planMatchday(post(MATCHDAY), existing).note!, /시간 14:00 → 글 13:00/);
  assert.equal(planMatchday(post(MATCHDAY), existing).insert, null);
});

test("canMarkReviewed: 다시 시도할 실패 글에는 확인함 버튼 없음", async () => {
  const { canMarkReviewed } = await import("../src/lib/admin/instagram.ts");
  assert.equal(canMarkReviewed("review", 1), true);
  assert.equal(canMarkReviewed("error", 1), false);
  assert.equal(canMarkReviewed("error", 3), true);
  assert.equal(canMarkReviewed("done", 1), false);
});
