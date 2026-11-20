// 연맹 결과기록지 수동 점검 (D-082, 명세 2.9) — 읽기만 한다. DB 를 쓰지 않고 키도 없다.
// 실행 (sites/eunpyeong-denforce 에서):
//   node --experimental-strip-types --no-warnings scripts/kfl/check.ts --league 116 --game 1
// 일정표(tab03)에서 그 경기의 club id 를 찾고, 결과기록지를 읽어 파싱 결과, 검산, 해시, 우리 팀 줄(번호만)을 JSON 으로 보인다.
// 서버 함수와 같은 예의: GET 만, 요청 사이 1.5초, 사이트를 밝힌 User-Agent, HTTP(연맹 HTTPS 인증서가 깨져 있음, TLS 검증을 끄지 않음).
import { createHash } from "node:crypto";
import { decodeUtf8 } from "../../supabase/functions/kfl-sync/html.ts";
import { parseSchedulePage, type KflListGame } from "../../supabase/functions/kfl-sync/schedule.ts";
import { applySubset, checkSheet, isFinished, parseSheet, type Side } from "../../supabase/functions/kfl-sync/sheet.ts";

const HOST = "http://www.futsal.or.kr";
const HEADERS = {
  "User-Agent": "eunpyeong-fs.com record sync (+https://eunpyeong-fs.com/contact)",
  Referer: `${HOST}/`,
  "Accept-Language": "ko",
};
const GAP_MS = 1500;
const MAX_PAGES = 10;
const OUR_CLUB = "eunpyeongfs";
const OUR_FED_NAME = "서울은평덴포스";
/** 리그 → 시즌 (검산 2번). 다른 리그는 --season 으로 */
const SEASONS: Record<number, string> = { 108: "2025-26", 116: "2026-27" };

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

const league = Number(arg("league"));
const gameNo = Number(arg("game"));
const leagueType = Number(arg("type") ?? 10);
const season = arg("season") ?? SEASONS[league];
if (!Number.isInteger(league) || league <= 0 || !Number.isInteger(gameNo) || gameNo <= 0 || !season) {
  console.error("사용: --league <번호> --game <경기번호> [--season YYYY-YY] [--type 10]");
  process.exit(2);
}

let last = 0;
let requests = 0;
async function get(path: string): Promise<string> {
  const wait = last + GAP_MS - Date.now();
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  last = Date.now();
  requests++;
  const res = await fetch(`${HOST}${path}`, { headers: HEADERS, redirect: "manual", signal: AbortSignal.timeout(20_000) });
  if (res.status !== 200) throw new Error(`${res.status} ${path}`);
  return decodeUtf8(new Uint8Array(await res.arrayBuffer()), res.headers.get("content-type"));
}

let game: KflListGame | undefined;
for (let page = 1; page <= MAX_PAGES && !game; page++) {
  const p = parseSchedulePage(await get(`/game_leagueTab03.action?league_seq=${league}&league_type=${leagueType}&divisionPage=mainPage&pageNum=${page}`), page);
  game = p.games.find((g) => g.gameNumber === gameNo);
  if (!p.hasNext) break;
}
if (!game) {
  console.error(`일정표에서 경기 ${gameNo} 을 찾지 못함 (요청 ${requests}건)`);
  process.exit(1);
}

const q = new URLSearchParams({ club1_id: game.homeClub, club2_id: game.awayClub, league_seq: String(league), league_type: String(leagueType), game_number: String(gameNo) });
const sheet = parseSheet(await get(`/gameLeagueRecord.action?${q}`));
const us: Side | null = game.homeClub.toLowerCase() === OUR_CLUB ? "home" : game.awayClub.toLowerCase() === OUR_CLUB ? "away" : null;
const subset = us ? applySubset(sheet, us) : null;

console.log(
  JSON.stringify(
    {
      list: { gameNumber: game.gameNumber, kickoff: game.kickoff, venue: game.venue, home: game.homeClub, away: game.awayClub, score: game.score, page: game.page },
      sheet: {
        title: sheet.title,
        gameNumber: sheet.gameNumber,
        total: [sheet.home.total, sheet.away.total],
        periods: sheet.periods,
        teams: [sheet.home.fedName, sheet.away.fedName],
        forfeit: sheet.forfeit,
        hasPlayers: sheet.hasPlayers,
        players: [sheet.home.players.length, sheet.away.players.length],
      },
      finished: isFinished(game, sheet),
      ours: us,
      check: us ? checkSheet(sheet, { gameNumber: gameNo, season, ourFedName: OUR_FED_NAME, opponentFedName: null, listScore: game.score, us }) : "우리 경기 아님",
      hash: subset ? createHash("sha256").update(subset).digest("hex") : null,
      // 선수 연결 없이 번호만 (이름은 출력하지 않음)
      ourRows: us
        ? sheet[us].players.map((p) => ({ no: p.no, P: p.starter, S: p.bench, yellows: p.yellows, reds: p.reds, goals: p.goals, ownGoals: p.ownGoals }))
        : [],
      requests,
    },
    null,
    1,
  ),
);
