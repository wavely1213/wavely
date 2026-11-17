// 관리자 › 연맹 기록 수집 (D-082, 명세 4장) — 표시 문구와 순수 규칙. 순수 (테스트: kfl-admin.test.ts)
// 서버 함수 kfl-sync 의 순수 파일(plan.ts, fetcher.ts)을 상대경로로 같이 쓴다 (명세 2.6, allowImportingTsExtensions).
import { HOST, sheetPath } from "../../../supabase/functions/kfl-sync/fetcher.ts";

export { diffClubRoster, scorersText } from "../../../supabase/functions/kfl-sync/plan.ts";

/** 연맹 하루 요청 상한 — fetcher.ts MAX_PER_DAY 와 같다 */
export { MAX_PER_DAY as KFL_MAX_PER_DAY } from "../../../supabase/functions/kfl-sync/fetcher.ts";

const STATE_LABEL: Record<string, string> = { waiting: "대기", recorded: "반영", review: "확인 필요", reviewed: "확인함", error: "오류" };

export function kflStateLabel(state: string): string {
  return STATE_LABEL[state] ?? state;
}

/** 노란 배지 */
export function kflStateNeedsLook(state: string): boolean {
  return state === "review" || state === "error";
}

export type KflGameLite = { league_seq: number; game_number: number; home_club: string; away_club: string };

/** 연맹 결과기록지 주소 (http, 연맹 HTTPS 인증서가 깨져 있음). 모양이 다르면 null */
export function kflSheetUrl(g: KflGameLite, leagueType: number): string | null {
  try {
    return `${HOST}${sheetPath(g.home_club, g.away_club, g.league_seq, leagueType, g.game_number)}`;
  } catch {
    return null;
  }
}

/** 선수 고르기 표시: "6 김대현 (no-8)" — 번호 없으면 이름부터, 떠난 선수는 끝에 (비활동) */
export function kflPlayerLabel(p: { name: string; number: number | null; slug: string; is_active?: boolean }): string {
  return `${p.number ?? ""} ${p.name} (${p.slug})${p.is_active === false ? " (비활동)" : ""}`.trim();
}

export type GoLiveInput = { recordedGames: number; reviewRows: number };

/**
 * 기록 공개를 켤 수 있는지 (명세 1.6) — 기록지를 반영해 사이트 경기에 연결된 우리 경기가 1개 이상이고,
 * 그 리그 경기의 확인할 출전 줄이 0개. 안 되면 이유 한 줄
 */
export function canGoLive(i: GoLiveInput): { ok: true } | { ok: false; reason: string } {
  if (i.recordedGames < 1) return { ok: false, reason: "아직 반영된 우리 경기 기록지가 없습니다." };
  if (i.reviewRows > 0) return { ok: false, reason: `확인할 출전 줄 ${i.reviewRows}개를 먼저 확인해 주세요.` };
  return { ok: true };
}

/** 득점자 줄을 다시 만들 수 있는지 — 우리 골이 있는 줄이 모두 연결(auto/confirmed)됨 (명세 2.6) */
export function goalRowsAllLinked(rows: Array<{ link: string; goal_minutes: Array<number | null> }>): boolean {
  return rows.every((r) => r.goal_minutes.length === 0 || r.link === "auto" || r.link === "confirmed");
}

/* ───────── 골키퍼 실점 (D-098) ───────── */

export type GkRow = { playerId: string; conceded: number };

/** 경기 폼 '골키퍼 실점' 줄 검사 — 같은 선수 두 번, 합계 > 상대 득점. 문제 없으면 null */
export function gkConcededProblem(rows: GkRow[], scoreThem: number | null): string | null {
  if (rows.length === 0) return null;
  if (scoreThem === null) return "골키퍼 실점은 끝난 경기(스코어 있음)에만 넣을 수 있습니다.";
  if (new Set(rows.map((r) => r.playerId)).size !== rows.length) return "같은 골키퍼가 두 줄에 있습니다. 한 줄로 합쳐 주세요.";
  const sum = rows.reduce((n, r) => n + r.conceded, 0);
  if (sum > scoreThem) return `골키퍼 실점 합계(${sum})가 상대 득점(${scoreThem})보다 많습니다.`;
  return null;
}

/** DB 트리거 거절 문구 → 화면 문구 (마이그레이션 20261117100000) */
export function gkDbMessage(error: { message?: string; details?: string } | null): string | null {
  if (!error?.message?.startsWith("gk_conceded_")) return null;
  return error.details ?? "골키퍼 실점을 저장하지 못했습니다.";
}

/** 서버 동작이 ?error= 로 돌려주는 이유 */
export const KFL_ACTION_ERRORS: Record<string, string> = {
  save: "저장하지 못했습니다. 잠시 후 다시 시도해 주세요.",
  live: "공개를 켤 조건이 아직 아닙니다. 아래 상자의 이유를 확인해 주세요.",
  rows: "이 경기에 확인할 출전 줄이 남아 있어 '확인함'으로 바꾸지 않았습니다.",
  pick: "연결할 선수를 골라 주세요.",
  gone: "그 줄은 이미 확인됐습니다. 화면을 새로 고쳐 확인해 주세요.",
  number: "연결은 저장했지만 번호표에는 넣지 못했습니다(그 번호에 이미 다른 선수가 있을 수 있음). 시즌 번호표에서 확인해 주세요.",
};

/** 우리 쪽 / 상대 쪽 — 연맹 club id 대소문자는 무시 */
export function kflSides(g: { home_club: string; away_club: string; home_score: number | null; away_score: number | null }, usId: string) {
  const usHome = g.home_club.toLowerCase() === usId;
  return {
    opponentId: (usHome ? g.away_club : g.home_club).toLowerCase(),
    score: g.home_score === null || g.away_score === null ? null : usHome ? `${g.home_score} : ${g.away_score}` : `${g.away_score} : ${g.home_score}`,
  };
}

/** 시즌 번호표 서버 동작의 ?error= 이유 */
export const NUMBER_ACTION_ERRORS: Record<string, string> = {
  save: "저장하지 못했습니다. 잠시 후 다시 시도해 주세요.",
  number: "번호는 0부터 99까지 숫자로 넣어 주세요.",
  pick: "선수를 골라 주세요.",
  dup: "이 시즌에 그 번호가 이미 있습니다. 표에서 그 번호의 선수를 바꿔 주세요.",
};

/**
 * 경기 폼 골키퍼 줄 읽기 (D-098) — gk_player[], gk_conceded[] 같은 순서. 둘 다 빈 줄은 건너뛴다.
 * 골레이로가 아닌 선수는 force 에 있어야 한다. 위치를 모르는 선수(지워짐)는 오류
 */
export function parseGkForm(input: {
  players: string[];
  conceded: string[];
  force: string[];
  positions: Map<string, { name: string; position: string }>;
}): { rows: GkRow[] } | { error: string } {
  const rows: GkRow[] = [];
  const n = Math.max(input.players.length, input.conceded.length);
  for (let i = 0; i < n; i++) {
    const playerId = (input.players[i] ?? "").trim();
    const raw = (input.conceded[i] ?? "").trim();
    if (!playerId && !raw) continue;
    if (!playerId) return { error: "골키퍼 줄의 선수를 골라 주세요(빈 줄은 '빼기')." };
    if (!/^\d{1,2}$/.test(raw)) return { error: "골키퍼 실점은 0부터 99까지 숫자로 넣어 주세요." };
    const p = input.positions.get(playerId);
    if (!p) return { error: "고른 선수를 찾을 수 없습니다. 새로고침한 뒤 다시 골라 주세요." };
    if (p.position !== "GK" && !input.force.includes(playerId)) return { error: `${p.name} 선수는 골레이로가 아닙니다. 맞으면 '그래도 넣기'를 체크해 주세요.` };
    rows.push({ playerId, conceded: Number(raw) });
  }
  return { rows };
}
