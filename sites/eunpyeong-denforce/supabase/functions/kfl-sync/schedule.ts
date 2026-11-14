// 연맹 일정표(game_leagueTab03)와 구단 페이지 명단 읽기 (D-082, 명세 2.2). 순수 함수 (테스트: kfl-schedule.test.ts)
import { allTables, hasClass, KflShapeError, parseTables, type Table } from "./html.ts";

export type KflListGame = {
  gameNumber: number;
  /** ISO, +09:00 */
  kickoff: string;
  venue: string;
  /** 연맹 club id — 대소문자 그대로 (fsseoul / FSSeoul 처럼 다를 수 있다) */
  homeClub: string;
  awayClub: string;
  /** 연맹 표기 (저장하지 않음, 이름 변경 경고용) */
  homeName: string;
  awayName: string;
  leagueSeq: number;
  leagueType: number;
  /** 결과가 들어오면 [홈, 원정]. 앵커가 비어 있으면 null */
  score: [number, number] | null;
  page: number;
};

export type SchedulePage = { games: KflListGame[]; hasNext: boolean };

const CLUB_ID = /^[A-Za-z0-9_]{2,30}$/;
const GETRECORD = /getrecord\(\s*'([^']*)'\s*,\s*'([^']*)'\s*,\s*'(\d+)'\s*,\s*'(\d+)'\s*,\s*'(\d+)'\s*\)/;
const SCORE = /^\s*(\d+)\s*:\s*(\d+)\s*$/;

function scheduleTable(tables: Table[]): Table {
  const t = allTables(tables).find((x) => hasClass(x.attrs, "table_type3") && x.rows[0]?.cells.some((c) => c.text.replace(/\s/g, "") === "경기번호"));
  if (!t) throw new KflShapeError("일정표(table_type3, 경기번호 머리)를 찾지 못함");
  return t;
}

/**
 * 일정표 한 쪽 — 10줄, 날짜순(경기번호순 아님). hasNext: 다음 쪽 링크(gameLeaguePlanListPaging('tab','N+1'))가 있음.
 * 열: td[0] 경기번호, td[1] 'YYYY-MM-DD HH:MM'(KST), td[2] 안쪽 표(홈 / vs / 원정), td[3] 장소, td[4] a getrecord(...)
 */
export function parseSchedulePage(html: string, page: number): SchedulePage {
  const table = scheduleTable(parseTables(html));
  const games: KflListGame[] = [];
  for (const row of table.rows.slice(1)) {
    const c = row.cells;
    if (c.length < 5) continue;
    const gameNumber = Number(c[0].text);
    if (!Number.isInteger(gameNumber) || gameNumber <= 0) continue;
    const when = c[1].text.match(/^(\d{4}-\d{2}-\d{2})\s+(\d{1,2}):(\d{2})$/);
    if (!when) throw new KflShapeError(`경기 ${gameNumber}: 일시 모양이 다름 '${c[1].text}'`);
    const inner = c[2].tables[0]?.rows[0]?.cells ?? [];
    if (inner.length < 3) throw new KflShapeError(`경기 ${gameNumber}: 대진 안쪽 표가 없음`);
    const link = c[4].html.match(GETRECORD);
    if (!link) throw new KflShapeError(`경기 ${gameNumber}: getrecord 링크가 없음`);
    const [, homeClub, awayClub, seq, type, no] = link;
    if (!CLUB_ID.test(homeClub) || !CLUB_ID.test(awayClub)) throw new KflShapeError(`경기 ${gameNumber}: club id 모양이 다름`);
    if (Number(no) !== gameNumber) throw new KflShapeError(`경기 ${gameNumber}: 링크 경기번호 ${no} 가 다름`);
    const s = c[4].text.match(SCORE);
    games.push({
      gameNumber,
      kickoff: `${when[1]}T${when[2].padStart(2, "0")}:${when[3]}:00+09:00`,
      venue: c[3].text,
      homeClub,
      awayClub,
      homeName: inner[0].text,
      awayName: inner[2].text,
      leagueSeq: Number(seq),
      leagueType: Number(type),
      score: s ? [Number(s[1]), Number(s[2])] : null,
      page,
    });
  }
  const hasNext = new RegExp(`gameLeaguePlanListPaging\\(\\s*'tab'\\s*,\\s*'${page + 1}'\\s*\\)`).test(html);
  return { games, hasNext };
}

export type ClubRosterRow = { no: number; name: string; position: string };

/**
 * 구단 페이지(mng_EunPyeong.action) 명단 — '이 름 / 배 번 / 포지션' 머리 표에서 세 칸씩. 이름은 공백 제거, 배번은 숫자만.
 * 시즌 표시가 없어(2026-11-13 기준 2025-26 명단) 비교 경고에만 쓴다.
 */
export function parseClubRoster(html: string): ClubRosterRow[] {
  const table = allTables(parseTables(html)).find((t) => {
    const head = t.rows[0]?.cells.map((c) => c.text.replace(/\s/g, "")) ?? [];
    return head[0] === "이름" && head[1] === "배번" && head[2] === "포지션";
  });
  if (!table) throw new KflShapeError("구단 명단 표(이 름 / 배 번 / 포지션)를 찾지 못함");
  const out: ClubRosterRow[] = [];
  for (const row of table.rows.slice(1)) {
    for (let i = 0; i + 2 < row.cells.length; i += 3) {
      const name = row.cells[i].text.replace(/\s/g, "");
      const no = Number(row.cells[i + 1].text.replace(/\D/g, ""));
      if (!name || !row.cells[i + 1].text.trim() || !Number.isInteger(no)) continue;
      out.push({ no, name, position: row.cells[i + 2].text });
    }
  }
  return out;
}
