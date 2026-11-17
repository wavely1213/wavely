import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "@/components/admin/AdminLink";
import { AdminLoading, PageTitle } from "@/components/admin/PageTitle";
import styles from "@/components/admin/admin.module.css";
import { formatKstDateTime } from "@/lib/admin/accounts";
import { requireAdminPage } from "@/lib/admin/auth";
import {
  canGoLive,
  KFL_ACTION_ERRORS,
  KFL_MAX_PER_DAY,
  kflPlayerLabel,
  kflSheetUrl,
  kflSides,
  kflStateLabel,
  kflStateNeedsLook,
} from "@/lib/admin/kfl";
import { ignoreAppearance, linkAllSuggested, linkAppearance, markGameReviewed, recheckGame, setStatsLive, unpauseKfl } from "./actions";
import local from "./kfl.module.css";

export const metadata: Metadata = { title: "연맹 기록 수집" };

// 관리자 › 연맹 기록 수집 (D-082, 명세 4.1) — 서버 함수 kfl-sync 가 30분마다 넣은 기록. 여기서는 출전 줄 연결, 기록 공개, 멈춤 풀기만.

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

type StateRow = {
  last_run_at: string | null;
  last_ok_at: string | null;
  last_error: string | null;
  last_warning: string | null;
  last_list_at: string | null;
  req_day: string | null;
  req_count: number;
  paused_until: string | null;
  fail_streak: number;
};
type LeagueRow = { league_seq: number; league_type: number; season: string; competition: string; stats_live: boolean };
type GameRow = {
  league_seq: number;
  game_number: number;
  home_club: string;
  away_club: string;
  kickoff: string;
  home_score: number | null;
  away_score: number | null;
  match_id: string | null;
  state: string;
  applied_hash: string | null;
  checked_at: string | null;
  note: string | null;
};
type MatchLite = { id: string; round: string | null; opponent: string; kickoff: string };
type ReviewRow = { id: string; match_id: string; shirt_number: number; sheet_name: string; note: string | null; suggested_player_id: string | null };
type PlayerOpt = { id: string; name: string; number: number | null; slug: string; is_active: boolean };

export default function KflAdminPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <>
      <PageTitle
        title="연맹 기록 수집"
        description="한국풋살연맹 일정표와 결과기록지를 30분마다 읽어 스코어, 득점자, 출전 기록, 리그 순위를 넣습니다. 확인할 것이 있으면 여기에 표시됩니다."
      >
        <Link href="/admin/kfl/numbers" className={styles.buttonGhost}>
          시즌 번호표
        </Link>
      </PageTitle>
      <Suspense fallback={<AdminLoading />}>
        <KflBody searchParams={searchParams} />
      </Suspense>
    </>
  );
}

/** 오늘(서울) 'YYYY-MM-DD' — 요청 수 칸(req_day)과 같은 기준 */
const seoulDay = (ms: number) => new Date(ms + 9 * 3_600_000).toISOString().slice(0, 10);

async function KflBody({ searchParams }: { searchParams: SearchParams }) {
  const { supabase } = await requireAdminPage();
  const errorKey = (await searchParams).error;
  const errorText = typeof errorKey === "string" ? KFL_ACTION_ERRORS[errorKey] : undefined;

  const [state, leagues, clubs, players] = await Promise.all([
    supabase
      .from("kfl_sync_state")
      .select("last_run_at, last_ok_at, last_error, last_warning, last_list_at, req_day, req_count, paused_until, fail_streak")
      .eq("id", 1)
      .maybeSingle<StateRow>(),
    supabase.from("kfl_leagues").select("league_seq, league_type, season, competition, stats_live").eq("active", true).order("season", { ascending: false }).returns<LeagueRow[]>(),
    supabase.from("kfl_clubs").select("club_id, name, is_us"),
    supabase.from("players").select("id, name, number, slug, is_active").order("name").returns<PlayerOpt[]>(),
  ]);
  if (state.error || leagues.error || clubs.error || players.error)
    return <p className={`${styles.panel} ${styles.empty}`}>기록을 불러오지 못했습니다(마이그레이션 적용 전일 수 있음). 잠시 후 다시 시도해 주세요.</p>;

  const leagueRows = leagues.data ?? [];
  const seqs = leagueRows.map((l) => l.league_seq);
  const games = seqs.length
    ? await supabase
        .from("kfl_games")
        .select("league_seq, game_number, home_club, away_club, kickoff, home_score, away_score, match_id, state, applied_hash, checked_at, note")
        .in("league_seq", seqs)
        .eq("is_ours", true)
        .order("game_number")
        .returns<GameRow[]>()
    : { data: [] as GameRow[], error: null };
  const gameRows = games.data ?? [];
  const matchIds = gameRows.map((g) => g.match_id).filter((id): id is string => Boolean(id));
  const [matches, reviews, numbers] = await Promise.all([
    matchIds.length ? supabase.from("matches").select("id, round, opponent, kickoff").in("id", matchIds).returns<MatchLite[]>() : { data: [] as MatchLite[], error: null },
    matchIds.length
      ? supabase.from("match_appearances").select("id, match_id, shirt_number, sheet_name, note, suggested_player_id").in("match_id", matchIds).eq("link", "review").order("shirt_number").returns<ReviewRow[]>()
      : { data: [] as ReviewRow[], error: null },
    supabase.from("player_season_numbers").select("season, number").in("season", leagueRows.map((l) => l.season)),
  ]);
  if (games.error || matches.error || reviews.error || numbers.error)
    return <p className={`${styles.panel} ${styles.empty}`}>기록을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.</p>;

  const s = state.data;
  const usId = (clubs.data ?? []).find((c) => c.is_us)?.club_id ?? "";
  const clubName = new Map((clubs.data ?? []).map((c) => [c.club_id as string, c.name as string]));
  const matchById = new Map((matches.data ?? []).map((m) => [m.id, m]));
  const reviewRows = reviews.data ?? [];
  const reviewByMatch = new Map<string, ReviewRow[]>();
  for (const r of reviewRows) reviewByMatch.set(r.match_id, [...(reviewByMatch.get(r.match_id) ?? []), r]);
  const playerList = players.data ?? [];
  const playerById = new Map(playerList.map((p) => [p.id, p]));
  const numberSet = new Set((numbers.data ?? []).map((n) => `${n.season}:${n.number}`));
  // 대시보드와 같이 요청 시각 기준 (서버 컴포넌트, 요청마다 한 번)
  const now = new Date().getTime();
  const paused = Boolean(s?.paused_until && Date.parse(s.paused_until) > now);
  const reqToday = s?.req_day === seoulDay(now) ? s.req_count : 0;

  return (
    <div className={local.stack}>
      {errorText && (
        <p className={styles.formMessage} role="alert">
          {errorText}
        </p>
      )}

      <section className={styles.panel} aria-labelledby="kfl-state">
        <h2 className={styles.panelTitle} id="kfl-state">
          자동 수집 상태
        </h2>
        <ul className={styles.hint}>
          <li>마지막 실행: {s?.last_run_at ? formatKstDateTime(s.last_run_at) : "아직 없음"}</li>
          <li>마지막 성공: {s?.last_ok_at ? formatKstDateTime(s.last_ok_at) : "아직 없음"}</li>
          <li>일정표 읽은 시각: {s?.last_list_at ? formatKstDateTime(s.last_list_at) : "아직 없음"}</li>
          <li>
            오늘 연맹 요청: {reqToday} / {KFL_MAX_PER_DAY}
          </li>
          {s?.last_error && (
            <li>
              <span className={`${styles.badge} ${styles.badgeYellow}`}>오류</span> {s.last_error}
            </li>
          )}
          {s?.last_warning && (
            <li>
              <span className={`${styles.badge} ${styles.badgeYellow}`}>확인</span> {s.last_warning}
            </li>
          )}
          {paused && (
            <li>
              <span className={`${styles.badge} ${styles.badgeYellow}`}>멈춤</span> {formatKstDateTime(s!.paused_until!)}까지 연맹 요청을 멈췄습니다 (연속 실패 {s!.fail_streak}번)
            </li>
          )}
        </ul>
        {paused && (
          <form action={unpauseKfl} className={local.boxAction}>
            <button type="submit" className={`${styles.buttonGhost} ${styles.buttonSmall}`}>
              멈춤 풀기
            </button>
          </form>
        )}
      </section>

      {leagueRows.length === 0 ? (
        <p className={`${styles.panel} ${styles.empty}`}>활성 리그가 없습니다. 시드 SQL 로 리그를 넣으면 여기에 보입니다.</p>
      ) : (
        leagueRows.map((l) => {
          const mine = gameRows.filter((g) => g.league_seq === l.league_seq);
          const recorded = mine.filter((g) => g.applied_hash && g.match_id).length;
          const rows = mine.reduce((n, g) => n + (g.match_id ? (reviewByMatch.get(g.match_id)?.length ?? 0) : 0), 0);
          const live = canGoLive({ recordedGames: recorded, reviewRows: rows });
          return (
            <section key={l.league_seq} className={styles.panel} aria-labelledby={`live-${l.league_seq}`}>
              <h2 className={styles.panelTitle} id={`live-${l.league_seq}`}>
                {l.season} 선수 기록 공개: {l.stats_live ? "켜짐" : "꺼짐"}
              </h2>
              <ul className={styles.hint}>
                <li>{l.competition}</li>
                <li>
                  켤 수 있는 조건: 기록지가 반영된 우리 경기가 1개 이상이고, 확인할 출전 줄이 0개 (지금 반영 {recorded}경기, 확인할 줄 {rows}개)
                </li>
                <li>켜면 선수 카드와 상세의 기록이 {l.season} 기준으로 바뀝니다. 끄기는 언제든 됩니다.</li>
              </ul>
              <form action={setStatsLive.bind(null, l.league_seq, !l.stats_live)} className={local.boxAction}>
                <button
                  type="submit"
                  className={l.stats_live ? `${styles.buttonGhost} ${styles.buttonSmall}` : `${styles.button} ${styles.buttonSmall}`}
                  disabled={!l.stats_live && !live.ok}
                >
                  {l.stats_live ? "공개 끄기" : "공개 켜기"}
                </button>
                {!l.stats_live && !live.ok && <span className={styles.hint}>{live.reason}</span>}
              </form>
            </section>
          );
        })
      )}

      {reviewRows.length > 0 && (
        <section className={styles.panel} aria-labelledby="kfl-review">
          <h2 className={styles.panelTitle} id="kfl-review">
            확인할 출전 줄 {reviewRows.length}개
          </h2>
          <p className={styles.hint}>
            결과기록지의 번호와 이름을 우리 선수와 맞춰 주세요. 골, 카드, 선발/교체는 연맹 기록 그대로이며 고치지 않습니다.
          </p>
          {[...reviewByMatch.entries()].map(([matchId, list]) => {
            const g = gameRows.find((x) => x.match_id === matchId);
            const m = matchById.get(matchId);
            const league = leagueRows.find((x) => x.league_seq === g?.league_seq);
            const suggested = list.filter((r) => r.suggested_player_id).length;
            return (
              <div key={matchId} className={local.group}>
                <div className={local.groupHead}>
                  <strong>
                    {m?.round ? `${m.round} ` : ""}
                    {m?.opponent ?? "경기"} ({m ? formatKstDateTime(m.kickoff).slice(0, 10) : "-"})
                  </strong>
                  {suggested > 0 && (
                    <form action={linkAllSuggested.bind(null, matchId)}>
                      <button type="submit" className={`${styles.button} ${styles.buttonSmall}`}>
                        제안대로 모두 연결 ({suggested})
                      </button>
                    </form>
                  )}
                </div>
                <ul className={local.rows}>
                  {list.map((r) => {
                    const sug = r.suggested_player_id ? playerById.get(r.suggested_player_id) : undefined;
                    const hasNumber = league ? numberSet.has(`${league.season}:${r.shirt_number}`) : true;
                    return (
                      <li key={r.id} className={local.row}>
                        <p className={local.rowHead}>
                          <span className={local.no}>{r.shirt_number}</span> {r.sheet_name || "(이름 없음)"}
                        </p>
                        {r.note && <p className={styles.hint}>{r.note}</p>}
                        <p className={styles.hint}>제안: {sug ? kflPlayerLabel(sug) : "없음"}</p>
                        <form action={linkAppearance.bind(null, r.id)} className={local.rowForm}>
                          <label className={local.pick}>
                            <span className="sr-only">연결할 선수</span>
                            <select name="player_id" defaultValue={r.suggested_player_id ?? ""} className={styles.select}>
                              <option value="">선수 고르기</option>
                              {playerList.map((p) => (
                                <option key={p.id} value={p.id}>
                                  {kflPlayerLabel(p)}
                                </option>
                              ))}
                            </select>
                          </label>
                          {league && (
                            <label className={styles.check}>
                              <input type="checkbox" name="add_number" defaultChecked={!hasNumber} />
                              {league.season} 번호표에도 추가
                            </label>
                          )}
                          <div className={local.buttons}>
                            <button type="submit" className={`${styles.button} ${styles.buttonSmall}`}>
                              연결
                            </button>
                            <button type="submit" formAction={ignoreAppearance.bind(null, r.id)} className={`${styles.buttonGhost} ${styles.buttonSmall}`}>
                              우리 선수 아님
                            </button>
                          </div>
                        </form>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </section>
      )}

      {gameRows.length > 0 && (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>라운드</th>
                <th>경기번호</th>
                <th>연맹 일시</th>
                <th>상대</th>
                <th>상태</th>
                <th>스코어</th>
                <th>사이트 경기</th>
                <th>기록지</th>
                <th>마지막 확인</th>
                <th>메모</th>
                <th>
                  <span className="sr-only">동작</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {gameRows.map((g) => {
                const m = g.match_id ? matchById.get(g.match_id) : undefined;
                const league = leagueRows.find((x) => x.league_seq === g.league_seq)!;
                const sides = kflSides(g, usId);
                const url = kflSheetUrl(g, league.league_type);
                const leftRows = g.match_id ? (reviewByMatch.get(g.match_id)?.length ?? 0) : 0;
                return (
                  <tr key={`${g.league_seq}-${g.game_number}`}>
                    <td>{m?.round ?? "-"}</td>
                    <td>{g.game_number}</td>
                    <td>{formatKstDateTime(g.kickoff)}</td>
                    <td>{clubName.get(sides.opponentId) ?? sides.opponentId}</td>
                    <td>
                      <span className={`${styles.badge} ${kflStateNeedsLook(g.state) ? styles.badgeYellow : g.state === "recorded" ? styles.badgeBlue : ""}`}>
                        {kflStateLabel(g.state)}
                      </span>
                    </td>
                    <td>{sides.score ?? "-"}</td>
                    <td>
                      {m ? (
                        <Link href={`/admin/matches/${m.id}`} className={styles.rowLink}>
                          {m.opponent}
                        </Link>
                      ) : (
                        "연결 안 됨"
                      )}
                    </td>
                    <td>
                      {url ? (
                        <a href={url} target="_blank" rel="noopener noreferrer" className={styles.rowLink}>
                          연맹 기록지
                        </a>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td>{g.checked_at ? formatKstDateTime(g.checked_at) : "-"}</td>
                    <td className={styles.wrap} style={{ whiteSpace: "pre-line" }}>
                      {g.note ?? "-"}
                    </td>
                    <td>
                      <div className={styles.rowActions}>
                        <form action={recheckGame.bind(null, g.league_seq, g.game_number)}>
                          <button type="submit" className={`${styles.buttonGhost} ${styles.buttonSmall}`}>
                            다시 확인
                          </button>
                        </form>
                        {g.state === "review" && (
                          <form action={markGameReviewed.bind(null, g.league_seq, g.game_number)}>
                            <button
                              type="submit"
                              className={`${styles.buttonGhost} ${styles.buttonSmall}`}
                              disabled={leftRows > 0}
                              title={leftRows > 0 ? `확인할 출전 줄 ${leftRows}개가 남아 있습니다` : undefined}
                            >
                              확인함
                            </button>
                          </form>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {leagueRows.length > 0 && gameRows.length === 0 && (
        <p className={`${styles.panel} ${styles.empty}`}>아직 읽은 우리 경기가 없습니다. 자동 수집이 일정표를 읽으면 여기에 보입니다.</p>
      )}
    </div>
  );
}
