// 연맹 결과기록지(gameLeagueRecord) 읽기, 끝난 경기 판정, 검산, 해시 대상 (D-082, 명세 2.2). 순수 함수 (테스트: kfl-sheet.test.ts)
import { allTables, cleanText, hasClass, KflShapeError, parseTables, type Cell, type Row, type Table } from "./html.ts";
import type { KflListGame } from "./schedule.ts";

export { KflShapeError };

/** 분을 읽을 수 없으면 null (예: 골 칸에 'og' 만) */
export type Minute = number | null;
export type SheetPlayer = {
  no: number;
  /** 기록지 이름 — 비어 있는 경우가 많다(연맹 개인정보 표시) */
  name: string;
  /** P (선발 5명) */
  starter: boolean;
  /** S (교체 명단) */
  bench: boolean;
  yellows: Minute[];
  reds: Minute[];
  goals: Minute[];
  /** 자책골 — 상대 득점 */
  ownGoals: Minute[];
};
export type SheetTeam = { fedName: string; total: number; players: SheetPlayer[]; remark: string };
export type KflSheet = {
  title: string;
  gameNumber: number | null;
  date: string | null;
  time: string | null;
  periods: { first: [number, number]; second: [number, number]; extra: [number, number] | null; pk: [number, number] | null };
  home: SheetTeam;
  away: SheetTeam;
  forfeit: boolean;
  hasPlayers: boolean;
};

const PERIOD_LABELS = { 전반: "first", 후반: "second", 연장: "extra", PK: "pk" } as const;
const OWN_GOAL = /og|자책/i;

/** 칸 값 → 분. 숫자가 있으면 첫 숫자, 비어 있지 않은데 숫자가 없으면 null */
function minute(text: string): Minute {
  const m = text.match(/\d+/);
  return m ? Number(m[0]) : null;
}

const filled = (c: Cell | undefined) => Boolean(c && c.text !== "");
const num = (c: Cell | undefined) => {
  const n = Number((c?.text ?? "").replace(/\D/g, "") || NaN);
  return Number.isFinite(n) ? n : 0;
};

function parsePlayer(row: Row): SheetPlayer {
  const c = row.cells;
  const yellows: Minute[] = [];
  const reds: Minute[] = [];
  const goals: Minute[] = [];
  const ownGoals: Minute[] = [];
  for (const i of [4, 5]) if (filled(c[i])) yellows.push(minute(c[i].text));
  if (filled(c[6])) reds.push(minute(c[6].text));
  for (let i = 7; i <= 19; i++) {
    if (!filled(c[i])) continue;
    (OWN_GOAL.test(c[i].text) ? ownGoals : goals).push(minute(c[i].text));
  }
  const no = Number(c[0].text.replace(/\D/g, ""));
  if (!c[0].text.trim() || !Number.isInteger(no)) throw new KflShapeError(`선수 줄 등번호를 읽지 못함 '${c[0].text}'`);
  return {
    no,
    name: c[1].text.replace(/\s/g, ""),
    starter: /^o$/i.test(c[2].text),
    bench: /^o$/i.test(c[3].text),
    yellows,
    reds,
    goals,
    ownGoals,
  };
}

/** 팀 표(table[width=499]) — 선수 줄(정확히 20칸, td[1] colspan=3), 비고 */
function parseTeamTable(t: Table): { players: SheetPlayer[]; remark: string } {
  const players: SheetPlayer[] = [];
  let remark = "";
  for (const row of t.rows) {
    const c = row.cells;
    if (c[0] && hasClass(c[0].attrs, "record_title_bg4") && c[0].text.replace(/\s/g, "") === "비고") {
      remark = c[1]?.text ?? "";
      continue;
    }
    // 선수 줄 = 값 칸(record_text_bg2)으로 시작하고 둘째 칸이 colspan=3 (머리 줄은 record_title_bg* 칸)
    if (c[1]?.attrs.colspan === "3" && hasClass(c[0].attrs, "record_text_bg2")) {
      if (c.length !== 20) throw new KflShapeError(`선수 줄 칸 수가 20 이 아님 (${c.length})`);
      players.push(parsePlayer(row));
    }
  }
  return { players, remark };
}

function headerValue(cells: Cell[], label: string): string | null {
  const i = cells.findIndex((c) => hasClass(c.attrs, "record_title_bg") && c.text.replace(/\s/g, "") === label);
  return i >= 0 && cells[i + 1] ? cells[i + 1].text : null;
}

/** 결과기록지 HTML → 기록. 모양이 다르면 KflShapeError (일부만 반영하지 않는다) */
export function parseSheet(html: string): KflSheet {
  const tables = allTables(parseTables(html));
  const cells = tables.flatMap((t) => t.rows.flatMap((r) => r.cells));

  const totals = [...html.matchAll(/<span[^>]*class\s*=\s*["']?record_20["']?[^>]*>([\s\S]*?)<\/span>/gi)].map((m) => Number(cleanText(m[1]).replace(/\D/g, "") || NaN));
  if (totals.length !== 2 || totals.some((n) => !Number.isFinite(n))) throw new KflShapeError(`합계(span.record_20)가 2개가 아님 (${totals.length})`);

  const periods: Record<string, [number, number] | null> = { first: [0, 0], second: [0, 0], extra: null, pk: null };
  for (const t of tables) {
    for (const r of t.rows) {
      r.cells.forEach((c, i) => {
        const key = PERIOD_LABELS[c.text as keyof typeof PERIOD_LABELS];
        if (!key || !hasClass(c.attrs, "record_title_bg2")) return;
        const v: [number, number] = [num(r.cells[i - 1]), num(r.cells[i + 1])];
        periods[key] = (key === "extra" || key === "pk") && v[0] === 0 && v[1] === 0 ? null : v;
      });
    }
  }

  const names = cells.filter((c) => hasClass(c.attrs, "record_text_bg") && c.attrs.rowspan === "2").map((c) => c.text);
  const teamTables = tables.filter((t) => t.attrs.width === "499");
  if (teamTables.length !== 2) throw new KflShapeError(`팀 표(table[width=499])가 2개가 아님 (${teamTables.length})`);
  const [home, away] = teamTables.map(parseTeamTable);

  const gameNo = headerValue(cells, "경기번호");
  const hasPlayers = home.players.length + away.players.length > 0;
  const forfeit = !hasPlayers && /몰수/.test(`${home.remark} ${away.remark}`);
  return {
    title: headerValue(cells, "대회명") ?? "",
    gameNumber: gameNo && /^\d+$/.test(gameNo) ? Number(gameNo) : null,
    date: headerValue(cells, "일자") || null,
    time: headerValue(cells, "시간") || null,
    periods: periods as KflSheet["periods"],
    home: { fedName: names[0] ?? "", total: totals[0], players: home.players, remark: home.remark },
    away: { fedName: names[1] ?? "", total: totals[1], players: away.players, remark: away.remark },
    forfeit,
    hasPlayers,
  };
}

/** 끝난 경기: 일정표 앵커에 스코어가 있다 그리고 (선수 줄이 있음 또는 몰수) */
export function isFinished(game: Pick<KflListGame, "score">, sheet: Pick<KflSheet, "hasPlayers" | "forfeit">): boolean {
  return game.score !== null && (sheet.hasPlayers || sheet.forfeit);
}

export type Side = "home" | "away";
export type SheetCheckContext = {
  /** 요청한 경기번호 */
  gameNumber: number;
  /** 리그 시즌 'YYYY-YY' (예 2026-27) */
  season: string;
  ourFedName: string;
  /** 상대 kfl_clubs.fed_name (없으면 검사 안 함) */
  opponentFedName: string | null;
  /** 일정표 스코어 [홈, 원정] */
  listScore: [number, number] | null;
  us: Side;
};
export type SheetCheck = { failures: string[]; notes: string[] };

const other = (s: Side): Side => (s === "home" ? "away" : "home");
const count = (players: SheetPlayer[], key: "goals" | "ownGoals") => players.reduce((n, p) => n + p[key].length, 0);

/** 검산 14개 규칙 (명세 2.2 표). failures 가 하나라도 있으면 반영하지 않고 review */
export function checkSheet(sheet: KflSheet, ctx: SheetCheckContext): SheetCheck {
  const failures: string[] = [];
  const notes: string[] = [];
  const us = sheet[ctx.us];
  const them = sheet[other(ctx.us)];
  const norm = (s: string) => s.replace(/\s/g, "");

  // 1 경기번호
  if (sheet.gameNumber !== ctx.gameNumber) failures.push(`경기번호가 다름 (요청 ${ctx.gameNumber}, 기록지 ${sheet.gameNumber ?? "없음"})`);
  // 2 대회명: 시즌 + (FK1)
  if (!sheet.title.includes(ctx.season) || !/\(FK1\)/.test(sheet.title)) failures.push(`대회명이 다름 '${sheet.title}'`);
  // 3 우리 팀 이름
  if (norm(sheet.home.fedName) !== norm(ctx.ourFedName) && norm(sheet.away.fedName) !== norm(ctx.ourFedName)) failures.push("두 팀 중 우리 팀 이름이 없음");
  else if (norm(us.fedName) !== norm(ctx.ourFedName)) failures.push(`우리 팀 위치가 다름 (${ctx.us})`);
  // 4 상대 이름 (경고만)
  if (ctx.opponentFedName && norm(them.fedName) !== norm(ctx.opponentFedName)) notes.push(`상대 팀 이름이 다름 (연맹 '${them.fedName}', 저장 '${ctx.opponentFedName}') — 이름 변경 확인`);
  // 5 합계 = 골 + 상대 자책골 (몰수 예외)
  if (!sheet.forfeit) {
    const homeCalc = count(sheet.home.players, "goals") + count(sheet.away.players, "ownGoals");
    const awayCalc = count(sheet.away.players, "goals") + count(sheet.home.players, "ownGoals");
    if (homeCalc !== sheet.home.total || awayCalc !== sheet.away.total) failures.push(`합계와 골 수가 다름 (합계 ${sheet.home.total}:${sheet.away.total}, 골 ${homeCalc}:${awayCalc})`);
  }
  // 6 전반 + 후반 (+ 연장) = 합계
  const p = sheet.periods;
  const sum = [0, 1].map((i) => p.first[i] + p.second[i] + (p.extra?.[i] ?? 0));
  if (sum[0] !== sheet.home.total || sum[1] !== sheet.away.total) failures.push(`전후반 합이 합계와 다름 (${sum[0]}:${sum[1]})`);
  // 7 일정표 스코어 = 합계
  if (ctx.listScore && (ctx.listScore[0] !== sheet.home.total || ctx.listScore[1] !== sheet.away.total))
    failures.push(`일정표 스코어와 다름 (일정표 ${ctx.listScore[0]}:${ctx.listScore[1]}, 기록지 ${sheet.home.total}:${sheet.away.total})`);
  // 8 우리 팀 줄 5개 이상 (몰수 예외)
  if (!sheet.forfeit && us.players.length < 5) failures.push(`우리 팀 명단이 5명보다 적음 (${us.players.length})`);
  // 9 등번호 겹침
  const nos = us.players.map((x) => x.no);
  if (new Set(nos).size !== nos.length) failures.push("우리 팀 등번호가 겹침");
  // 10 P/S 없는 줄에 골이나 카드
  for (const side of [sheet.home, sheet.away]) {
    for (const x of side.players) {
      if (!x.starter && !x.bench && x.goals.length + x.ownGoals.length + x.yellows.length + x.reds.length > 0)
        failures.push(`P/S 없는 줄에 기록이 있음 (${side.fedName} ${x.no}번)`);
    }
  }
  // 11 우리 팀 P 0개
  if (!sheet.forfeit && us.players.length > 0 && !us.players.some((x) => x.starter)) notes.push("우리 팀 선발(P) 표시가 없음");
  // 12 골 분 40 초과
  const allMinutes = [sheet.home, sheet.away].flatMap((t) => t.players.flatMap((x) => [...x.goals, ...x.ownGoals]));
  if (allMinutes.some((m) => m !== null && m > 40)) notes.push("연장 분 표기 확인 (골 분이 40 을 넘음)");
  // 13 PK
  if (p.pk) notes.push("승부차기 기록 있음, 사이트에 칸 없음(I-015)");
  // 14 분을 읽지 못한 칸
  const anyNull = [sheet.home, sheet.away].some((t) => t.players.some((x) => [...x.goals, ...x.ownGoals, ...x.yellows, ...x.reds].includes(null)));
  if (anyNull) notes.push("분을 읽지 못한 칸이 있음");
  return { failures, notes };
}

/** 정렬된 키로 JSON (해시가 키 순서에 흔들리지 않게) */
export function stableJson(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(stableJson).join(",")}]`;
  if (v && typeof v === "object") {
    return `{${Object.keys(v as Record<string, unknown>)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${stableJson((v as Record<string, unknown>)[k])}`)
      .join(",")}}`;
  }
  return JSON.stringify(v);
}

/**
 * 반영에 쓰는 값만 (해시 대상): 합계, 전후반/연장, 몰수, 우리 팀 줄(번호, 이름, P, S, 경고, 퇴장, 골, 자책골), 상대 자책골 수.
 * 심판, 관중, 파울, 지도자, 비고 글, 상대 선수 줄은 넣지 않는다 — 경기 뒤에 채워져도 가짜 '정정'이 생기지 않게.
 */
export function applySubset(sheet: KflSheet, us: Side): string {
  const them = sheet[other(us)];
  return stableJson({
    total: [sheet.home.total, sheet.away.total],
    periods: { first: sheet.periods.first, second: sheet.periods.second, extra: sheet.periods.extra },
    forfeit: sheet.forfeit,
    us: [...sheet[us].players]
      .sort((a, b) => a.no - b.no)
      .map((x) => ({ no: x.no, name: x.name, starter: x.starter, bench: x.bench, yellows: x.yellows, reds: x.reds, goals: x.goals, ownGoals: x.ownGoals })),
    opponentOwnGoals: count(them.players, "ownGoals"),
  });
}
