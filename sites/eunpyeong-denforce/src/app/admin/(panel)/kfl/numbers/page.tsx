import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "@/components/admin/AdminLink";
import { DeleteButton } from "@/components/admin/DeleteButton";
import { AdminLoading, PageTitle } from "@/components/admin/PageTitle";
import styles from "@/components/admin/admin.module.css";
import { formatKstDateTime } from "@/lib/admin/accounts";
import { requireAdminPage } from "@/lib/admin/auth";
import { diffClubRoster, kflPlayerLabel, NUMBER_ACTION_ERRORS } from "@/lib/admin/kfl";
import local from "../kfl.module.css";
import { ackClubRoster, addSeasonNumber, deleteSeasonNumber, updateSeasonNumber } from "./actions";

export const metadata: Metadata = { title: "시즌 번호표" };

// 관리자 › 연맹 기록 수집 › 시즌 번호표 (명세 4.2) — 결과기록지 번호를 우리 선수로 잇는 표 + 연맹 구단 페이지 비교

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
type PlayerOpt = { id: string; name: string; number: number | null; slug: string; is_active: boolean };
type NumberRow = { number: number; player_id: string };
type RosterState = { club_roster: Array<{ no: number; name: string; position: string }> | null; club_roster_changed_at: string | null; club_roster_ack_at: string | null };

export default function SeasonNumbersPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <>
      <PageTitle title="시즌 번호표" description="연맹 결과기록지의 등번호를 우리 선수와 잇는 표입니다. 자동 수집은 이 표로 출전 줄을 연결합니다.">
        <Link href="/admin/kfl" className={styles.buttonGhost}>
          연맹 기록 수집
        </Link>
      </PageTitle>
      <Suspense fallback={<AdminLoading />}>
        <NumbersBody searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function NumbersBody({ searchParams }: { searchParams: SearchParams }) {
  const { supabase } = await requireAdminPage();
  const sp = await searchParams;
  const errorText = typeof sp.error === "string" ? NUMBER_ACTION_ERRORS[sp.error] : undefined;

  const [leagues, players, state] = await Promise.all([
    supabase.from("kfl_leagues").select("season, active").order("season", { ascending: false }),
    supabase.from("players").select("id, name, number, slug, is_active").order("name").returns<PlayerOpt[]>(),
    supabase.from("kfl_sync_state").select("club_roster, club_roster_changed_at, club_roster_ack_at").eq("id", 1).maybeSingle<RosterState>(),
  ]);
  if (leagues.error || players.error || state.error)
    return <p className={`${styles.panel} ${styles.empty}`}>기록을 불러오지 못했습니다(마이그레이션 적용 전일 수 있음). 잠시 후 다시 시도해 주세요.</p>;

  const seasons = [...new Set((leagues.data ?? []).map((l) => l.season as string))];
  const fallback = (leagues.data ?? []).find((l) => l.active)?.season ?? seasons[0];
  const season = typeof sp.season === "string" && seasons.includes(sp.season) ? sp.season : fallback;
  if (!season) return <p className={`${styles.panel} ${styles.empty}`}>리그가 없습니다. 시드 SQL 로 리그를 넣으면 여기에 보입니다.</p>;

  const numbers = await supabase.from("player_season_numbers").select("number, player_id").eq("season", season).order("number").returns<NumberRow[]>();
  if (numbers.error) return <p className={`${styles.panel} ${styles.empty}`}>번호표를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.</p>;

  const playerList = players.data ?? [];
  const byId = new Map(playerList.map((p) => [p.id, p]));
  const rows = numbers.data ?? [];
  const roster = state.data?.club_roster ?? [];
  const fedByNo = new Map(roster.map((r) => [r.no, r.name]));
  const diff = diffClubRoster(
    roster,
    rows.map((r) => ({ number: r.number, name: byId.get(r.player_id)?.name ?? "" })),
  );
  const diffCount = diff.onlyFed.length + diff.onlyNumbers.length + diff.nameDiff.length;
  const changed = state.data?.club_roster_changed_at;
  const unacked = Boolean(changed && Date.parse(changed) > (state.data?.club_roster_ack_at ? Date.parse(state.data.club_roster_ack_at) : 0));

  const playerSelect = (name: string, value?: string) => (
    <select name={name} defaultValue={value ?? ""} className={styles.select} aria-label="선수">
      <option value="">선수 고르기</option>
      {playerList.map((p) => (
        <option key={p.id} value={p.id}>
          {kflPlayerLabel(p)}
        </option>
      ))}
    </select>
  );

  return (
    <div className={local.stack}>
      {errorText && (
        <p className={styles.formMessage} role="alert">
          {errorText}
        </p>
      )}

      {seasons.length > 1 && (
        <nav aria-label="시즌" className={local.boxAction} style={{ marginTop: 0 }}>
          {seasons.map((s) => (
            <Link key={s} href={`/admin/kfl/numbers?season=${s}`} className={`${s === season ? styles.button : styles.buttonGhost} ${styles.buttonSmall}`} aria-current={s === season ? "page" : undefined}>
              {s}
            </Link>
          ))}
        </nav>
      )}

      <section className={styles.panel} aria-labelledby="fed-compare">
        <h2 className={styles.panelTitle} id="fed-compare">
          연맹 구단 페이지와 비교 {roster.length > 0 && `(다른 번호 ${diffCount}개)`}
        </h2>
        <p className={styles.hint}>연맹 구단 페이지는 시즌을 늦게 바꿉니다(지금은 지난 시즌 명단일 수 있음). 자동으로 반영하지 않습니다.</p>
        {roster.length === 0 ? (
          <p className={styles.hint}>아직 연맹 구단 페이지를 읽지 않았습니다.</p>
        ) : diffCount === 0 ? (
          <p className={styles.hint}>번호표와 연맹 구단 페이지가 같습니다.</p>
        ) : (
          <ul className={local.rows}>
            {diff.onlyFed.map((r) => (
              <li key={`f${r.no}`} className={local.row}>
                <span>
                  <span className={local.no}>{r.no}</span> {r.name} <span className={styles.badge}>연맹에만 있음</span>
                </span>
              </li>
            ))}
            {diff.onlyNumbers.map((r) => (
              <li key={`n${r.number}`} className={local.row}>
                <span>
                  <span className={local.no}>{r.number}</span> {r.name} <span className={styles.badge}>번호표에만 있음</span>
                </span>
              </li>
            ))}
            {diff.nameDiff.map((r) => (
              <li key={`d${r.number}`} className={local.row}>
                <span>
                  <span className={local.no}>{r.number}</span> 연맹 {r.fed}, 번호표 {r.site} <span className={`${styles.badge} ${styles.badgeYellow}`}>이름 다름</span>
                </span>
              </li>
            ))}
          </ul>
        )}
        {unacked && (
          <form action={ackClubRoster.bind(null, season)} className={local.boxAction}>
            <span className={styles.hint}>연맹 명단이 {formatKstDateTime(changed!)}에 바뀌었습니다.</span>
            <button type="submit" className={`${styles.buttonGhost} ${styles.buttonSmall}`}>
              비교 확인함
            </button>
          </form>
        )}
      </section>

      <section className={styles.panel} aria-labelledby="add-number">
        <h2 className={styles.panelTitle} id="add-number">
          {season} 번호 추가
        </h2>
        <form action={addSeasonNumber.bind(null, season)} className={local.rowForm}>
          <label className={styles.check}>
            번호
            <input name="number" inputMode="numeric" pattern="\d{1,2}" maxLength={2} required className={styles.input} style={{ width: "5em" }} />
          </label>
          <span className={local.pick}>{playerSelect("player_id")}</span>
          <button type="submit" className={`${styles.button} ${styles.buttonSmall}`}>
            추가
          </button>
        </form>
        <p className={styles.hint}>번호를 바꿔도 이미 연결된 출전 기록은 그대로입니다. 그 뒤에 읽는 기록지부터 적용됩니다.</p>
      </section>

      {rows.length === 0 ? (
        <p className={`${styles.panel} ${styles.empty}`}>{season} 번호표가 비어 있습니다.</p>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>번호</th>
                <th>선수</th>
                <th>연맹 구단 페이지</th>
                <th>일치</th>
                <th>
                  <span className="sr-only">동작</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const p = byId.get(r.player_id);
                const fed = fedByNo.get(r.number);
                const same = fed !== undefined && p && fed.replace(/\s/g, "") === p.name.replace(/\s/g, "");
                return (
                  <tr key={r.number}>
                    <td>{r.number}</td>
                    <td>
                      <form action={updateSeasonNumber.bind(null, season, r.number)} className={local.cellForm}>
                        <span className={local.pick}>{playerSelect("player_id", r.player_id)}</span>
                        <button type="submit" className={`${styles.buttonGhost} ${styles.buttonSmall}`}>
                          저장
                        </button>
                      </form>
                    </td>
                    <td>{fed ?? "-"}</td>
                    <td>{fed === undefined ? "-" : same ? "같음" : <span className={`${styles.badge} ${styles.badgeYellow}`}>다름</span>}</td>
                    <td>
                      <DeleteButton action={deleteSeasonNumber.bind(null, season, r.number)} confirmText={`${season} 번호표에서 ${r.number}번을 지울까요?`} small />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
