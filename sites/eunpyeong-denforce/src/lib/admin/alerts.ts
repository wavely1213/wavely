// 관리자 대시보드 '할 일/알림' — 순수 함수만 (테스트: alerts.test.ts, D-048).
// 구단 소식 제목(영입·이적)과 선수/스태프 명단을 맞춰 보고, 홈페이지에 '준비 중'으로 보이는 빈 칸을 찾는다.
// 같은 이름 선수가 있다는 것 자체는 알리지 않는다 — 김대현(옛 8·18번)처럼 동명이인이 실제로 있다 (BR-025). 인사 소식이 동명이인을 가리키면 직접 확인을 부탁한다.

export type AlertLevel = "warn" | "check" | "info";

export type AdminAlert = {
  level: AlertLevel;
  title: string;
  detail?: string;
  href: string;
  action: string;
};

/** 소식 제목에서 읽은 인사 소식 — 들어옴(영입·입단·선임) / 나감(이적·동행 마무리 등) */
export type RosterEvent = { kind: "join" | "leave"; name: string; staff: boolean };

/** 이름 자리에 올 수 없는 낱말 (구단 이름·일반 명사) */
const STOP = new Set(["서울은평", "은평", "덴포스", "구단", "선수단", "선수", "신규", "신인", "외국인", "새", "공식", "시즌", "팀", "추가", "깜짝"]);
/** 스태프 직책 — 이름 바로 뒤에 붙는다 ('김기범 수석코치 영입', '장성호 감독과 동행 마무리') */
const ROLE = /^(감독|수석코치|코치|골키퍼코치|피지컬코치|전력분석관|분석관|트레이너|단장|부단장|사무국장|매니저|팀매니저)$/;
const NAME = /^[가-힣]{2,4}$/;
const LEAVE = /동행\s*마무리|계약\s*(만료|종료|해지)|은퇴|작별|방출/;
/** '이적으로'·'이적하며' 처럼 떠나는 글귀일 때만 — '이적 후 첫 골'·'…에서 이적한 OOO 영입' 은 나감이 아니다 */
const LEAVE_TRANSFER = /이적(으로|하며|을\s*하며)/;

function isName(w: string | undefined): w is string {
  return Boolean(w && NAME.test(w) && !STOP.has(w));
}

/** 제목 → 낱말 (따옴표·쉼표·괄호는 구분자) */
function words(title: string): string[] {
  return title
    .replace(/['"‘’“”「」『』]/g, " ")
    .split(/[\s,/()[\]!?.…]+/)
    .filter(Boolean);
}

/** 낱말 앞쪽(i-1, i-2 …)에서 이름 찾기 — '선수'는 건너뛰고, 직책이면 스태프 */
function nameBefore(ws: string[], i: number): { name: string; staff: boolean } | null {
  let j = i - 1;
  if (ws[j] === "선수") j--;
  const w = ws[j];
  if (w && ROLE.test(w)) return isName(ws[j - 1]) ? { name: ws[j - 1], staff: true } : null;
  return isName(w) ? { name: w, staff: false } : null;
}

/**
 * 소식 제목 하나 → 인사 소식. 아니면 null.
 * 들어옴: '… 아라 김선빈 영입', '… 김기범 수석코치 영입', '… 정상현 감독 선임'
 * 나감: '박종현, 이적으로 … 동행 마무리', '… 장성호 감독과 동행 마무리'
 */
export function parseRosterNews(title: string): RosterEvent | null {
  const ws = words(title);
  // 나감 — '동행 마무리' 등이 있으면 나감. 들어옴 낱말(영입·입단)이 없을 때만 '이적으로'·'이적하며'도 나감
  const joinWord = /영입|입단/.test(title);
  if (LEAVE.test(title) || (!joinWord && LEAVE_TRANSFER.test(title))) {
    const lead = /^\s*([가-힣]{2,4})\s*(선수|감독|수석코치|코치)?\s*,/.exec(title);
    if (lead && isName(lead[1])) return { kind: "leave", name: lead[1], staff: Boolean(lead[2] && lead[2] !== "선수") };
    const k = ws.findIndex((w) => w.startsWith("동행"));
    if (k > 0) {
      const before = ws[k - 1].replace(/(과|와)$/, "");
      if (ROLE.test(before)) return isName(ws[k - 2]) ? { kind: "leave", name: ws[k - 2], staff: true } : null;
      if (isName(before) && before !== ws[k - 1]) return { kind: "leave", name: before, staff: false };
    }
    return null;
  }
  const i = ws.findIndex((w) => /^(영입|입단)/.test(w));
  if (i > 0) {
    const n = nameBefore(ws, i);
    return n ? { kind: "join", ...n } : null;
  }
  const s = ws.findIndex((w) => w.startsWith("선임"));
  if (s > 1 && ROLE.test(ws[s - 1]) && isName(ws[s - 2])) return { kind: "join", name: ws[s - 2], staff: true };
  return null;
}

export type NewsLite = { title: string; date: string; category: string; published: boolean };
export type PlayerLite = { id: string; name: string; number: number | null; isActive: boolean; hasPhoto: boolean };
export type StaffLite = { id: string; name: string; role: string };

/** YYYY-MM-DD 에서 days 일 전 (UTC 기준 — 날짜만 비교한다) */
export function daysBefore(today: string, days: number): string {
  const d = new Date(`${today}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

/** 인사 소식을 볼 기간 — 오래된 소식(예전 영입 후 이미 떠난 선수)까지 알리지 않게 */
export const ROSTER_NEWS_DAYS = 180;

/**
 * 로스터 알림 — 최근 소식의 영입/이적과 지금 명단이 다르면 알린다.
 * 한 사람에게 소식이 여럿이면 가장 최근 소식만 본다 (떠났다가 돌아온 경우).
 */
export function rosterAlerts(input: { news: NewsLite[]; players: PlayerLite[]; staff: StaffLite[]; today: string }): AdminAlert[] {
  const since = daysBefore(input.today, ROSTER_NEWS_DAYS);
  const latest = new Map<string, RosterEvent & { title: string; date: string }>();
  for (const n of input.news) {
    if (n.category !== "news" || !n.published || !/^\d{4}-\d{2}-\d{2}$/.test(n.date) || n.date < since) continue;
    const e = parseRosterNews(n.title);
    if (!e) continue;
    const key = `${e.staff ? "s" : "p"}:${e.name}`;
    const prev = latest.get(key);
    if (!prev || n.date >= prev.date) latest.set(key, { ...e, title: n.title, date: n.date });
  }

  const out: AdminAlert[] = [];
  for (const e of latest.values()) {
    const from = `'${e.title}' (${e.date})`;
    if (e.staff) {
      const has = input.staff.some((s) => s.name.trim() === e.name);
      if (e.kind === "join" && !has)
        out.push({ level: "warn", title: `코칭스태프 추가 필요: ${e.name}`, detail: `${from} 소식이 있는데 스태프 명단에 없습니다.`, href: "/admin/staff/new", action: "스태프 추가" });
      if (e.kind === "leave" && has)
        out.push({ level: "warn", title: `코칭스태프에서 빼기 필요: ${e.name}`, detail: `${from} 소식이 있는데 아직 스태프 명단에 있습니다.`, href: "/admin/staff", action: "스태프 명단" });
      continue;
    }
    const same = input.players.filter((p) => p.name.trim() === e.name);
    const active = same.filter((p) => p.isActive);
    if (e.kind === "join" && same.length === 0)
      out.push({ level: "warn", title: `선수 추가 필요: ${e.name}`, detail: `${from} 소식이 있는데 선수 명단에 없습니다.`, href: "/admin/players/new", action: "선수 추가" });
    else if (e.kind === "join" && active.length === 0)
      out.push({ level: "check", title: `활동 선수로 바꾸기: ${e.name}`, detail: `${from} 소식이 있는데 '비활동' 선수입니다.`, href: `/admin/players/${same[0].id}`, action: "선수 정보" });
    if (e.kind === "leave" && active.length > 0) {
      if (same.length === 1)
        out.push({ level: "warn", title: `선수단에서 빼기 필요: ${e.name}`, detail: `${from} 소식이 있는데 아직 '활동' 선수입니다. 선수 정보에서 '활동'을 끄면 선수단에서 빠집니다.`, href: `/admin/players/${active[0].id}`, action: "선수 정보" });
      // 동명이인(BR-025): 이름만으로는 누가 떠났는지 모른다 — 한 명이라도 이미 비활동이면 처리된 것으로 보고, 모두 활동이면 직접 확인을 부탁한다
      else if (active.length === same.length)
        out.push({ level: "check", title: `선수단 확인 필요: ${e.name}`, detail: `${from} 소식이 있는데 같은 이름 선수가 ${same.length}명입니다. 떠난 선수의 '활동'을 꺼 주세요.`, href: "/admin/players", action: "선수 명단" });
    }
  }
  return out;
}

/** 활동 선수끼리 등번호가 겹치면 알린다 */
export function numberAlerts(players: PlayerLite[]): AdminAlert[] {
  const byNo = new Map<number, string[]>();
  for (const p of players) {
    if (!p.isActive || p.number === null) continue;
    byNo.set(p.number, [...(byNo.get(p.number) ?? []), p.name]);
  }
  return [...byNo.entries()]
    .filter(([, names]) => names.length > 1)
    .sort(([a], [b]) => a - b)
    .map(([no, names]) => ({ level: "warn" as const, title: `등번호 ${no}번이 겹칩니다`, detail: names.join(", "), href: "/admin/players", action: "선수 명단" }));
}

export type SiteGaps = {
  /** 상태 '예정' 경기 수 — 공개 경기 일정 페이지와 같은 기준(BR-003) */
  upcomingMatches: number;
  /** 상태는 '예정'인데 경기 시간이 지난 경기 수 — 결과 입력 필요 */
  pastScheduled: number;
  venueTransit: boolean;
  venueParking: boolean;
  contactEmail: boolean;
  contactPhone: boolean;
  draftNews: number;
  activeWithoutPhoto: number;
  /** 개인정보처리방침 본문을 관리자에서 저장했는지 (아니면 '준비 중'으로 보인다) */
  privacyWritten: boolean;
};

/** 홈페이지에 비어 보이는 곳 ('준비 중' 등) */
export function siteGapAlerts(g: SiteGaps): AdminAlert[] {
  const out: AdminAlert[] = [];
  const missing = [!g.venueTransit && "대중교통", !g.venueParking && "주차"].filter(Boolean);
  if (missing.length)
    out.push({ level: "check", title: `오시는 길 '${missing.join("/")}' 안내가 '준비 중'으로 보입니다`, href: "/admin/club", action: "구단정보" });
  const contact = [!g.contactEmail && "이메일", !g.contactPhone && "전화"].filter(Boolean);
  if (contact.length) out.push({ level: "check", title: `문의 ${contact.join("/")}이(가) 비어 '준비 중'으로 보입니다`, href: "/admin/club", action: "구단정보" });
  if (g.pastScheduled > 0)
    out.push({ level: "check", title: `결과 입력이 필요한 경기 ${g.pastScheduled}개`, detail: "경기 시간이 지났는데 아직 '예정' 상태입니다.", href: "/admin/matches", action: "경기" });
  if (g.upcomingMatches === 0)
    out.push({ level: "info", title: "예정된 경기가 없습니다", detail: "경기 일정 페이지에 '발표 후 업데이트' 안내가 보입니다.", href: "/admin/matches/new", action: "경기 추가" });
  // 등번호 없는 선수는 알리지 않는다 — 시즌 번호 확정 전까지 일부러 비워 둔다 (BR-025)
  if (g.activeWithoutPhoto > 0)
    out.push({ level: "info", title: `사진이 없는 활동 선수 ${g.activeWithoutPhoto}명`, detail: "사진이 없으면 엠블럼과 등번호 카드로 보입니다.", href: "/admin/players", action: "선수 명단" });
  if (g.draftNews > 0) out.push({ level: "info", title: `비공개 소식 ${g.draftNews}개`, detail: "홈페이지에 보이지 않는 글입니다.", href: "/admin/news", action: "구단소식" });
  if (!g.privacyWritten)
    out.push({
      level: "info",
      title: "개인정보처리방침이 '준비 중'입니다",
      detail: "홈페이지 내용 › 개인정보처리방침에서 본문을 쓰면 바로 보입니다.",
      href: "/admin/content/privacy",
      action: "본문 쓰기",
    });
  return out;
}

/** 미디어 계정이 올려 검토를 기다리는 글 (D-057) — 확인하고 '홈페이지에 공개'를 켜면 공개된다 */
export function reviewAlerts(pending: { news: number; postings: number }): AdminAlert[] {
  const detail = "미디어 계정이 올린 글입니다. 열어서 확인한 뒤 '홈페이지에 공개'를 켜고 저장하면 공개됩니다.";
  const out: AdminAlert[] = [];
  if (pending.news > 0) out.push({ level: "warn", title: `검토 대기 구단소식 ${pending.news}개`, detail, href: "/admin/news", action: "구단소식" });
  if (pending.postings > 0) out.push({ level: "warn", title: `검토 대기 포스팅 ${pending.postings}개`, detail, href: "/admin/postings", action: "포스팅" });
  return out;
}

const ORDER: Record<AlertLevel, number> = { warn: 0, check: 1, info: 2 };

/** 중요한 것부터 */
export function sortAlerts(alerts: AdminAlert[]): AdminAlert[] {
  return [...alerts].sort((a, b) => ORDER[a.level] - ORDER[b.level]);
}
