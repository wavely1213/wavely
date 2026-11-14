// 연맹 기록 수집 계획 (D-082, 명세 1.5, 2.3, 2.4, 2.6) — 무엇을 어디에 쓸지 정하는 순수 함수. I/O 는 index.ts (C5)
// 테스트: kfl-plan.test.ts. src/ (관리자 화면)에서도 scorersText, diffClubRoster 를 상대경로 .ts 로 쓴다.
import type { ClubRosterRow, KflListGame } from "./schedule.ts";
import type { KflSheet, Minute, SheetCheck, SheetPlayer, Side } from "./sheet.ts";

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

/** 결과가 나올 때까지 기다리는 시간 (kickoff 뒤) */
export const FIRST_CHECK_AFTER_MS = 2 * HOUR;
/** 대기 중 확인 간격 */
export const WAIT_INTERVAL_MS = 3 * HOUR;
/** 이만큼 지나도 기록지가 없으면 하루 1번 + 확인 필요 */
export const WAIT_SLOW_AFTER_MS = 7 * DAY;
/** 반영 뒤 정정을 확인하는 횟수 (하루 1번) */
export const RECHECKS = 7;
/** 연속 실패 이 횟수에서 확인 필요 */
export const FAILS_REVIEW = 5;
export const SCORERS_MAX = 300;
export const NOTE_MAX = 2000;

export const NOTE = {
  waiting7d: "결과기록지가 7일째 없음",
  fails: `연맹 기록을 ${FAILS_REVIEW}번 연속 가져오지 못함`,
  corrected: "기록지가 바뀜(정정)",
  scorersLater: "득점자 줄은 명단 확인 뒤 만듦",
  forfeit: "몰수: 연맹 기준 출전 기록 없음",
  noMatch: "사이트 경기 연결 없음",
  rowBeforeLive: "명단 확인 전",
  rowCorrection: "기록지 정정으로 바뀐 줄",
  rowNotInNumbers: "번호표에 없는 번호",
  rowTwice: "같은 선수에 두 줄",
} as const;

export type PlayerLite = { id: string; name: string; slug: string };
export type Link = "auto" | "confirmed" | "review" | "ignored";

/** match_appearances 한 줄 (match_id 제외) */
export type Appearance = {
  shirtNumber: number;
  sheetName: string;
  link: Link;
  playerId: string | null;
  suggestedPlayerId: string | null;
  started: boolean;
  bench: boolean;
  yellowMinutes: Minute[];
  redMinutes: Minute[];
  goalMinutes: Minute[];
  ownGoalMinutes: Minute[];
  note: string | null;
};

/** 이름 비교: NFC, 공백 제거 */
export const sameName = (a: string, b: string) => a.normalize("NFC").replace(/\s/g, "") === b.normalize("NFC").replace(/\s/g, "");

/** 경기 메모 앞에 붙이고 상한에서 자른다 */
export function prependNote(note: string | null, add: string[]): string | null {
  const parts = [...add, ...(note ? [note] : [])].filter(Boolean);
  return parts.length ? parts.join("\n").slice(0, NOTE_MAX) : null;
}

/* ───────── 선수 연결 (1.5) ───────── */

export type MatchPlayersInput = {
  sheetPlayers: SheetPlayer[];
  /** 리그 stats_live */
  live: boolean;
  /** 시즌 번호표 (번호 → 선수) */
  numbers: Map<number, PlayerLite>;
  /** 전체 선수 (비활동 포함) */
  players: PlayerLite[];
  previous: Appearance[];
  /** 이 경기에 이미 반영한 기록지가 있었음 (applied_hash 있음) */
  correction: boolean;
};
export type MatchPlayersResult = { rows: Appearance[]; removed: number[]; notes: string[] };

export function matchPlayers(input: MatchPlayersInput): MatchPlayersResult {
  const { live, numbers, players, previous, correction } = input;
  const byId = new Map(players.map((p) => [p.id, p]));
  const prevByNo = new Map(previous.map((r) => [r.shirtNumber, r]));
  const fromNumbers = new Set<number>(); // 4번 규칙으로 연결된 줄

  // 출전 = P 또는 S 줄만 저장
  const listed = input.sheetPlayers.filter((p) => p.starter || p.bench);
  const rows = listed.map((sp): Appearance => {
    const base = {
      shirtNumber: sp.no,
      sheetName: sp.name,
      started: sp.starter,
      bench: sp.bench,
      yellowMinutes: sp.yellows,
      redMinutes: sp.reds,
      goalMinutes: sp.goals,
      ownGoalMinutes: sp.ownGoals,
    };
    const review = (suggested: string | null, note: string): Appearance => ({ ...base, link: "review", playerId: null, suggestedPlayerId: suggested, note });
    const prev = prevByNo.get(sp.no);
    // 1. 같은 번호 줄이 있고 이름이 같음 (또는 이전 빈칸 + 새 이름 = 연결 선수 이름)
    if (prev) {
      const linked = prev.playerId ? byId.get(prev.playerId) : undefined;
      const same = sameName(prev.sheetName, sp.name) || (prev.sheetName.trim() === "" && linked !== undefined && sameName(linked.name, sp.name));
      if (same) return { ...base, link: prev.link, playerId: prev.playerId, suggestedPlayerId: prev.suggestedPlayerId, note: prev.note };
    }
    const listedPlayer = numbers.get(sp.no) ?? null;
    const byName = sp.name.trim() ? players.filter((p) => sameName(p.name, sp.name)) : [];
    const nameGuess = byName.length === 1 ? byName[0].id : null;
    // 2. 시즌 첫 경기 확인 전
    if (!live) return review(listedPlayer?.id ?? nameGuess, NOTE.rowBeforeLive);
    // 3. 정정으로 새로 생기거나 바뀐 줄
    if (correction) return review(listedPlayer?.id ?? null, NOTE.rowCorrection);
    if (listedPlayer) {
      // 4. 번호표, 이름 빈칸 또는 같음
      if (!sp.name.trim() || sameName(sp.name, listedPlayer.name)) {
        fromNumbers.add(sp.no);
        return { ...base, link: "auto", playerId: listedPlayer.id, suggestedPlayerId: null, note: null };
      }
      // 5. 이름 다름
      return review(listedPlayer.id, `기록지 ${sp.no}번 '${sp.name}', 번호표 '${listedPlayer.name}'`);
    }
    // 6, 7. 번호표에 없는 번호
    return review(nameGuess, NOTE.rowNotInNumbers);
  });

  // 8. 한 경기에서 두 줄이 같은 선수 → 4번 규칙 줄을 review 로 (unique (match_id, player_id) 도 지킨다)
  const linkedCount = new Map<string, number>();
  for (const r of rows) if (r.playerId) linkedCount.set(r.playerId, (linkedCount.get(r.playerId) ?? 0) + 1);
  for (const [i, r] of rows.entries()) {
    if (r.playerId && fromNumbers.has(r.shirtNumber) && (linkedCount.get(r.playerId) ?? 0) > 1) {
      rows[i] = { ...r, link: "review", suggestedPlayerId: r.playerId, playerId: null, note: NOTE.rowTwice };
    }
  }

  // 사라진 줄
  const kept = new Set(rows.map((r) => r.shirtNumber));
  const removed: number[] = [];
  const notes: string[] = [];
  for (const p of previous) {
    if (kept.has(p.shirtNumber)) continue;
    removed.push(p.shirtNumber);
    const who = p.playerId ? (byId.get(p.playerId)?.name ?? "연결 선수") : "확인 필요";
    notes.push(`${p.shirtNumber}번 줄이 기록지에서 사라짐(이전: ${who})`);
  }
  return { rows, removed, notes };
}

/* ───────── 득점자 글 (2.6, 소유자 결정 6) ───────── */

const firstMinute = (ms: Minute[]) => {
  const known = ms.filter((m): m is number => m !== null);
  return known.length ? Math.min(...known) : Infinity;
};

/** "김영록 2, 부성인, 상대 자책골" — 연결된 골 줄만. 같은 이름 선수가 둘 이상이면 "김대현(6)". 비면 null */
export function scorersText(
  rows: Array<Pick<Appearance, "shirtNumber" | "playerId" | "goalMinutes">>,
  oppOwnGoals: number,
  players: Array<Pick<PlayerLite, "id" | "name">>,
): string | null {
  const byId = new Map(players.map((p) => [p.id, p]));
  const nameCount = new Map<string, number>();
  for (const p of players) {
    const k = p.name.replace(/\s/g, "");
    nameCount.set(k, (nameCount.get(k) ?? 0) + 1);
  }
  const parts = rows
    .filter((r) => r.playerId && r.goalMinutes.length > 0 && byId.has(r.playerId))
    .sort((a, b) => firstMinute(a.goalMinutes) - firstMinute(b.goalMinutes) || a.shirtNumber - b.shirtNumber)
    .map((r) => {
      const name = byId.get(r.playerId!)!.name;
      const label = (nameCount.get(name.replace(/\s/g, "")) ?? 0) > 1 ? `${name}(${r.shirtNumber})` : name;
      return r.goalMinutes.length > 1 ? `${label} ${r.goalMinutes.length}` : label;
    });
  if (oppOwnGoals > 0) parts.push(oppOwnGoals > 1 ? `상대 자책골 ${oppOwnGoals}` : "상대 자책골");
  const text = parts.join(", ").slice(0, SCORERS_MAX).trim();
  return text || null;
}

/* ───────── 경기 연결 (2.3) ───────── */

export type SiteMatch = {
  id: string;
  competition: string;
  opponent: string;
  kickoff: string;
  status: "scheduled" | "finished";
  scoreUs: number | null;
  scoreThem: number | null;
  scorers: string | null;
};

/** KST 날짜 'YYYY-MM-DD' */
export const kstDate = (iso: string) => new Date(new Date(iso).getTime() + 9 * HOUR).toISOString().slice(0, 10);

export type LinkResult = { matchId: string } | { note: string };

/**
 * 같은 대회 + 상대(kfl_clubs.name) + KST 날짜가 같은 사이트 경기가 정확히 1개면 연결.
 * is_home 으로는 찾지 않는다(연맹은 중립 경기장 5번/20번에서 은평을 홈으로 둠, BR-030).
 */
export function linkMatch(
  game: Pick<KflListGame, "kickoff" | "homeClub" | "awayClub">,
  ourClubId: string,
  clubNames: Map<string, string>,
  competition: string,
  matches: SiteMatch[],
): LinkResult {
  const opp = game.homeClub.toLowerCase() === ourClubId ? game.awayClub : game.homeClub;
  const oppName = clubNames.get(opp.toLowerCase());
  if (!oppName) return { note: `연맹 구단 '${opp}' 이 구단 표에 없음` };
  const day = kstDate(game.kickoff);
  const found = matches.filter((m) => m.competition === competition && m.opponent === oppName && kstDate(m.kickoff) === day);
  if (found.length === 1) return { matchId: found[0].id };
  return { note: found.length === 0 ? "사이트에 같은 날 이 상대 경기가 없음" : "같은 날 후보 여러 개" };
}

/** 연맹 kickoff 가 바뀌었고 사이트 경기와 1분 넘게 다르면 메모 (자동으로 고치지 않음) */
export function kickoffChangeNote(storedFed: string | null, newFed: string, site: string | null): string | null {
  if (!site || storedFed === null || Date.parse(storedFed) === Date.parse(newFed)) return null;
  if (Math.abs(Date.parse(newFed) - Date.parse(site)) <= 60_000) return null;
  const fmt = (iso: string) => new Date(Date.parse(iso) + 9 * HOUR).toISOString().slice(0, 16).replace("T", " ");
  return `연맹 일정 변경: 사이트 ${fmt(site)}, 연맹 ${fmt(newFed)}`;
}

/* ───────── 결과 반영 계획 (2.2, 2.6) ───────── */

export type GameRow = {
  matchId: string | null;
  seenHash: string | null;
  appliedHash: string | null;
  note: string | null;
};

export type PlanResultInput = {
  game: GameRow;
  match: SiteMatch | null;
  sheet: KflSheet;
  us: Side;
  hash: string;
  check: SheetCheck;
  live: boolean;
  numbers: Map<number, PlayerLite>;
  players: PlayerLite[];
  previous: Appearance[];
};

export type ResultPlan =
  /** 같은 값을 이미 반영했음, 또는 검산에 실패한 같은 값을 이미 봤음 */
  | { action: "none"; seenHash: string }
  /** 반영하지 않고 확인 필요 */
  | { action: "hold"; seenHash: string; notes: string[] }
  | {
      action: "apply";
      seenHash: string;
      appliedHash: string;
      notes: string[];
      state: "recorded" | "review";
      oppOwnGoals: number;
      appearances: { upsert: Appearance[]; remove: number[] };
      match: { status: "finished"; scoreUs: number; scoreThem: number; scorers?: string | null };
    };

export function planResult(input: PlanResultInput): ResultPlan {
  const { game, match, sheet, us, hash, check } = input;
  if (hash === game.appliedHash) return { action: "none", seenHash: hash };
  if (check.failures.length > 0) {
    // 검산 실패 값은 seen_hash 에만 — 값이 바뀌기 전까지 같은 메모를 다시 남기지 않는다
    if (hash === game.seenHash) return { action: "none", seenHash: hash };
    return { action: "hold", seenHash: hash, notes: check.failures.map((f) => `검산 실패: ${f}`) };
  }
  if (!match) return { action: "hold", seenHash: hash, notes: hash === game.seenHash ? [] : [NOTE.noMatch] };

  const them: Side = us === "home" ? "away" : "home";
  const correction = game.appliedHash !== null;
  const notes: string[] = [...check.notes];
  if (correction) notes.unshift(NOTE.corrected);
  const oppOwnGoals = sheet[them].players.reduce((n, p) => n + p.ownGoals.length, 0);
  const scoreUs = sheet[us].total;
  const scoreThem = sheet[them].total;
  if (match.status === "finished" && match.scoreUs !== null && match.scoreThem !== null && (match.scoreUs !== scoreUs || match.scoreThem !== scoreThem)) {
    notes.push(`기존 ${match.scoreUs}:${match.scoreThem} → 연맹 ${scoreUs}:${scoreThem}`);
  }

  let upsert: Appearance[] = [];
  let remove: number[] = [];
  let scorers: { scorers?: string | null } = {};
  if (sheet.forfeit) {
    notes.push(NOTE.forfeit);
    remove = input.previous.map((p) => p.shirtNumber);
  } else {
    const mp = matchPlayers({ sheetPlayers: sheet[us].players, live: input.live, numbers: input.numbers, players: input.players, previous: input.previous, correction });
    upsert = mp.rows;
    remove = mp.removed;
    notes.push(...mp.notes);
    const goalRows = upsert.filter((r) => r.goalMinutes.length > 0);
    if (goalRows.every((r) => r.link === "auto" || r.link === "confirmed")) scorers = { scorers: scorersText(upsert, oppOwnGoals, input.players) };
    else notes.push(NOTE.scorersLater);
  }
  return {
    action: "apply",
    seenHash: hash,
    appliedHash: hash,
    notes,
    state: notes.length ? "review" : "recorded",
    oppOwnGoals,
    appearances: { upsert, remove },
    match: { status: "finished", scoreUs, scoreThem, ...scorers },
  };
}

/* ───────── 다음 확인 (2.4) ───────── */

export type CheckTiming = { kickoff: string; appliedHash: string | null; rechecksLeft: number; fails: number; note: string | null };
export type NextCheck = { nextCheckAt: string | null; rechecksLeft: number; note?: string; review?: true };

/** 확인 주기는 applied_hash 와 fails 로만 정한다 (state 는 관리자 표시) */
export function nextCheckAt(g: CheckTiming, now: Date): NextCheck {
  const t = now.getTime();
  const iso = (ms: number) => new Date(ms).toISOString();
  if (g.fails > 0) {
    const wait = Math.min(DAY, HOUR * 2 ** (g.fails - 1));
    const out: NextCheck = { nextCheckAt: iso(t + wait), rechecksLeft: g.rechecksLeft };
    if (g.fails === FAILS_REVIEW) return { ...out, note: NOTE.fails, review: true };
    return out;
  }
  if (g.appliedHash !== null) {
    if (g.rechecksLeft <= 0) return { nextCheckAt: null, rechecksLeft: 0 };
    return { nextCheckAt: iso(t + DAY), rechecksLeft: g.rechecksLeft - 1 };
  }
  const kick = Date.parse(g.kickoff);
  if (t < kick + FIRST_CHECK_AFTER_MS) return { nextCheckAt: iso(kick + FIRST_CHECK_AFTER_MS), rechecksLeft: g.rechecksLeft };
  if (t >= kick + WAIT_SLOW_AFTER_MS) {
    const out: NextCheck = { nextCheckAt: iso(t + DAY), rechecksLeft: g.rechecksLeft };
    return g.note?.includes(NOTE.waiting7d) ? out : { ...out, note: NOTE.waiting7d, review: true };
  }
  return { nextCheckAt: iso(t + WAIT_INTERVAL_MS), rechecksLeft: g.rechecksLeft };
}

/* ───────── 리그순위 (BR-034) ───────── */

export type TeamRecord = { win: number; draw: number; loss: number; goalsFor: number; goalsAgainst: number };
export type StandingDb = TeamRecord & { id: string; team: string };

/** 스코어가 있는 경기로 팀별 기록 (몰수도 스코어대로). clubNames: 소문자 club id → 사이트 이름 */
export function standingsFromGames(
  games: Array<Pick<KflListGame, "homeClub" | "awayClub" | "score">>,
  clubNames: Map<string, string>,
): { records: Map<string, TeamRecord>; unknown: string[] } {
  const records = new Map<string, TeamRecord>();
  for (const name of clubNames.values()) records.set(name, { win: 0, draw: 0, loss: 0, goalsFor: 0, goalsAgainst: 0 });
  const unknown = new Set<string>();
  for (const g of games) {
    if (!g.score) continue;
    const h = clubNames.get(g.homeClub.toLowerCase());
    const a = clubNames.get(g.awayClub.toLowerCase());
    if (!h) unknown.add(g.homeClub);
    if (!a) unknown.add(g.awayClub);
    if (!h || !a) continue;
    const [hs, as] = g.score;
    const H = records.get(h)!;
    const A = records.get(a)!;
    H.goalsFor += hs;
    H.goalsAgainst += as;
    A.goalsFor += as;
    A.goalsAgainst += hs;
    if (hs > as) (H.win++, A.loss++);
    else if (hs < as) (H.loss++, A.win++);
    else (H.draw++, A.draw++);
  }
  return { records, unknown: [...unknown] };
}

/** 순위표 행과 맞춰 다른 행만. 팀마다 정확히 1행이 아니면 아무것도 쓰지 않고 경고 */
export function planStandings(records: Map<string, TeamRecord>, unknown: string[], rows: StandingDb[]): { updates: Array<{ id: string } & TeamRecord>; warning: string | null } {
  const problems: string[] = unknown.map((c) => `구단 표에 없는 연맹 구단 ${c}`);
  const updates: Array<{ id: string } & TeamRecord> = [];
  for (const [team, rec] of records) {
    const found = rows.filter((r) => r.team === team);
    if (found.length !== 1) {
      problems.push(found.length === 0 ? `'${team}' 행 없음` : `'${team}' 행 ${found.length}개`);
      continue;
    }
    const r = found[0];
    if (r.win !== rec.win || r.draw !== rec.draw || r.loss !== rec.loss || r.goalsFor !== rec.goalsFor || r.goalsAgainst !== rec.goalsAgainst) updates.push({ id: r.id, ...rec });
  }
  if (problems.length) return { updates: [], warning: `리그순위 팀 이름이 맞지 않음: ${problems.join(", ")}` };
  return { updates, warning: null };
}

/* ───────── 연맹 구단 페이지 비교 (4.2) ───────── */

export type RosterDiff = {
  onlyFed: ClubRosterRow[];
  onlyNumbers: Array<{ number: number; name: string }>;
  nameDiff: Array<{ number: number; fed: string; site: string }>;
};

export function diffClubRoster(roster: ClubRosterRow[], numbers: Array<{ number: number; name: string }>): RosterDiff {
  const fed = new Map(roster.map((r) => [r.no, r]));
  const site = new Map(numbers.map((n) => [n.number, n]));
  return {
    onlyFed: roster.filter((r) => !site.has(r.no)).sort((a, b) => a.no - b.no),
    onlyNumbers: numbers.filter((n) => !fed.has(n.number)).sort((a, b) => a.number - b.number),
    nameDiff: roster
      .filter((r) => site.has(r.no) && !sameName(r.name, site.get(r.no)!.name))
      .map((r) => ({ number: r.no, fed: r.name, site: site.get(r.no)!.name }))
      .sort((a, b) => a.number - b.number),
  };
}
