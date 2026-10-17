// 관리자 대시보드 할 일/알림 단위 테스트 — 실행: npm test
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  daysBefore,
  numberAlerts,
  parseRosterNews,
  rosterAlerts,
  siteGapAlerts,
  sortAlerts,
  type NewsLite,
  type PlayerLite,
} from "../src/lib/admin/alerts.ts";

test("parseRosterNews: 실제 구단 소식 제목", () => {
  const cases: Array<[string, ReturnType<typeof parseRosterNews>]> = [
    ["서울은평 덴포스, '피치 위의 살림꾼' 아라 김선빈 영입", { kind: "join", name: "김선빈", staff: false }],
    ["서울은평 덴포스, '날카로운 왼발의 피보' 한견희 영입", { kind: "join", name: "한견희", staff: false }],
    ["서울은평 덴포스, '웅조머' 골레이로 조현웅 영입", { kind: "join", name: "조현웅", staff: false }],
    ["서울은평 덴포스, '젊은 지략가' 김기범 수석코치 영입", { kind: "join", name: "김기범", staff: true }],
    ["서울은평 덴포스, 정상현 감독 선임", { kind: "join", name: "정상현", staff: true }],
    ["박종현, 이적으로 서울은평 덴포스와 동행 마무리", { kind: "leave", name: "박종현", staff: false }],
    ["서울은평 덴포스, 장성호 감독과 동행 마무리", { kind: "leave", name: "장성호", staff: true }],
    ["서울은평 덴포스, 박결과 동행 마무리", { kind: "leave", name: "박결", staff: false }],
    ["서울은평 덴포스, FS서울에서 이적한 아라 강민원 영입", { kind: "join", name: "강민원", staff: false }],
    ["서울은평 덴포스, No.1 골레이로 임우성 선수 입단", { kind: "join", name: "임우성", staff: false }],
  ];
  for (const [title, want] of cases) assert.deepEqual(parseRosterNews(title), want, title);
});

test("parseRosterNews: 인사 소식이 아니거나 이름을 못 찾으면 null", () => {
  for (const t of [
    "덴포스(Denforce)와 네이밍 스폰서 계약 체결",
    "26-27 서울은평덴포스 HOME & AWAY KIT 공개",
    "서울은평 덴포스 공식 홈페이지 오픈 안내",
    "2026 신규 영입",
    "서울은평 덴포스와 동행 마무리",
    // 영입한 선수의 다음 기사 — '이적'이 있어도 떠나는 글귀가 아니다
    "강민원, 이적 후 첫 경기서 결승골",
    "임우성, 이적 첫 시즌 각오",
  ])
    assert.equal(parseRosterNews(t), null, t);
});

const today = "2026-10-17";
const news = (title: string, date: string, extra: Partial<NewsLite> = {}): NewsLite => ({ title, date, category: "news", published: true, ...extra });
const n = (title: string, date: string): NewsLite => ({ title, date, category: "news", published: true });
const player = (id: string, name: string, number: number | null, isActive = true, hasPhoto = true): PlayerLite => ({ id, name, number, isActive, hasPhoto });

test("rosterAlerts: 영입했는데 명단에 없음 / 이적했는데 활동 중 / 비활동", () => {
  const alerts = rosterAlerts({
    today,
    news: [
      news("서울은평 덴포스, '피치 위의 살림꾼' 아라 김선빈 영입", "2026-10-08"),
      news("서울은평 덴포스, 아라 강민원 영입", "2026-10-16"),
      news("박종현, 이적으로 서울은평 덴포스와 동행 마무리", "2026-10-13"),
      news("박영완, 이적으로 서울은평 덴포스와 동행 마무리", "2026-10-16"),
      news("서울은평 덴포스, 골레이로 임우성 영입", "2026-10-16"),
      news("서울은평 덴포스, 정상현 감독 선임", "2026-08-24"),
      news("서울은평 덴포스, '젊은 지략가' 김기범 수석코치 영입", "2026-10-07"),
      news("서울은평 덴포스, 장성호 감독과 동행 마무리", "2026-05-07"),
    ],
    players: [player("a", "김선빈", 23), player("b", "박종현", 3), player("c", "박영완", 25, false), player("d", "임우성", 1, false)],
    staff: [{ id: "s1", name: "정상현", role: "감독" }, { id: "s2", name: "장성호", role: "감독" }],
  });
  const titles = alerts.map((a) => a.title).sort();
  assert.deepEqual(titles, ["선수 추가 필요: 강민원", "선수단에서 빼기 필요: 박종현", "코칭스태프 추가 필요: 김기범", "코칭스태프에서 빼기 필요: 장성호", "활동 선수로 바꾸기: 임우성"].sort());
  assert.equal(alerts.find((a) => a.title.endsWith("박종현"))?.href, "/admin/players/b");
});

test("rosterAlerts: 가장 최근 소식만 / 기간 밖·비공개·다른 분류는 보지 않는다", () => {
  const alerts = rosterAlerts({
    today,
    news: [
      news("서울은평 덴포스, 아라 홍길동 영입", "2026-01-01"),
      news("홍길동, 이적으로 서울은평 덴포스와 동행 마무리", "2026-06-01"),
      news("서울은평 덴포스, 아라 옛선수 영입", "2019-01-01"),
      news("서울은평 덴포스, 아라 비공개 영입", "2026-10-01", { published: false }),
      news("서울은평 덴포스, 아라 공지사항 영입", "2026-10-01", { category: "notice" }),
      news("서울은평 덴포스, 아라 날짜없음 영입", "2026"),
    ],
    players: [],
    staff: [],
  });
  assert.deepEqual(alerts, []);
});

test("rosterAlerts: 영입 뒤 '이적 후 첫 골' 기사가 와도 들어옴 그대로", () => {
  const news = [n("서울은평 덴포스, FS서울에서 이적한 아라 강민원 영입", "2026-10-16"), n("강민원, 이적 후 첫 경기서 결승골", "2026-10-27")];
  assert.deepEqual(rosterAlerts({ today: "2026-10-30", news, players: [player("k", "강민원", null)], staff: [] }), []);
  assert.deepEqual(rosterAlerts({ today: "2026-10-30", news, players: [], staff: [] }).map((a) => a.title), ["선수 추가 필요: 강민원"]);
});

test("rosterAlerts: 동명이인 — 한 명이 이미 비활동이면 처리됨, 모두 활동이면 직접 확인 (특정 선수로 보내지 않음)", () => {
  const news = [n("김대현, 이적으로 서울은평 덴포스와 동행 마무리", "2026-10-16")];
  const done = rosterAlerts({ today, news, players: [player("a", "김대현", null, false), player("b", "김대현", null)], staff: [] });
  assert.deepEqual(done, []);
  const both = rosterAlerts({ today, news, players: [player("a", "김대현", null), player("b", "김대현", null)], staff: [] });
  assert.deepEqual(both.map((a) => [a.level, a.title, a.href]), [["check", "선수단 확인 필요: 김대현", "/admin/players"]]);
});

test("numberAlerts: 활동 선수끼리만, 동명이인은 알리지 않음", () => {
  const alerts = numberAlerts([
    player("1", "송민혁", 5),
    player("2", "강민원", 5),
    player("3", "김대현", 8),
    player("4", "김대현", 18),
    player("5", "박영완", 25, false),
    player("6", "새선수", 25),
    player("7", "번호없음", null),
    player("8", "번호없음2", null),
  ]);
  assert.deepEqual(alerts.map((a) => [a.title, a.detail]), [["등번호 5번이 겹칩니다", "송민혁, 강민원"]]);
});

test("siteGapAlerts / sortAlerts", () => {
  const base = { upcomingMatches: 1, pastScheduled: 0, venueTransit: true, venueParking: true, contactEmail: true, contactPhone: true, draftNews: 0, activeWithoutPhoto: 0 };
  // 개인정보처리방침 안내는 4단계 전까지 늘 나온다
  assert.deepEqual(siteGapAlerts(base).map((a) => a.href), ["/privacy"]);
  const all = siteGapAlerts({ ...base, upcomingMatches: 0, venueTransit: false, venueParking: false, contactPhone: false, draftNews: 2, activeWithoutPhoto: 3 });
  assert.ok(all.some((a) => a.title.includes("'대중교통/주차'")));
  assert.ok(all.some((a) => a.title.includes("문의 전화")));
  assert.ok(all.some((a) => a.title === "예정된 경기가 없습니다"));
  assert.ok(siteGapAlerts({ ...base, pastScheduled: 2 }).some((a) => a.level === "check" && a.title === "결과 입력이 필요한 경기 2개"));
  const sorted = sortAlerts([...all, { level: "warn", title: "w", href: "/", action: "" }]);
  assert.equal(sorted[0].level, "warn");
  assert.ok(sorted.findIndex((a) => a.level === "info") > sorted.findIndex((a) => a.level === "check"));
});

test("daysBefore", () => {
  assert.equal(daysBefore("2026-10-17", 180), "2026-04-20");
  assert.equal(daysBefore("2026-03-01", 1), "2026-02-28");
});
