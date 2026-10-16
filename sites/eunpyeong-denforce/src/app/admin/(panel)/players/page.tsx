import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "@/components/admin/AdminLink";
import { DeleteButton } from "@/components/admin/DeleteButton";
import { AdminLoading, PageTitle } from "@/components/admin/PageTitle";
import styles from "@/components/admin/admin.module.css";
import { POSITION_LABEL, POSITION_ORDER } from "@/data/people";
import { requireAdminPage } from "@/lib/admin/auth";
import type { PlayerRow } from "@/lib/data/rows";
import { deletePlayer } from "./actions";

export const metadata: Metadata = { title: "선수" };

/** 등번호 없는 선수는 같은 포지션 안에서 맨 뒤 (공개 사이트 정렬과 같음: lib/repo.ts) */
const NO_NUMBER_LAST = 999;

/** 공개 사이트와 같은 순서: 포지션(골레이로→픽소→아라→피보) → 등번호 */
function byPositionThenNumber(a: PlayerRow, b: PlayerRow) {
  return (
    POSITION_ORDER.indexOf(a.position) - POSITION_ORDER.indexOf(b.position) ||
    (a.number ?? NO_NUMBER_LAST) - (b.number ?? NO_NUMBER_LAST) ||
    a.name.localeCompare(b.name, "ko")
  );
}

export default function PlayersAdminPage() {
  return (
    <>
      <PageTitle
        title="선수"
        description="활동 중인 선수만 홈페이지 선수 페이지·메인 선수단에 포지션·등번호 순으로 보입니다."
      >
        <Link href="/admin/players/new" className={styles.button}>
          + 선수 추가
        </Link>
      </PageTitle>
      <Suspense fallback={<AdminLoading />}>
        <PlayerList />
      </Suspense>
    </>
  );
}

async function PlayerList() {
  const { supabase } = await requireAdminPage();
  const { data, error } = await supabase.from("players").select("*").returns<PlayerRow[]>();

  if (error) {
    return <p className={`${styles.panel} ${styles.empty}`}>목록을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.</p>;
  }
  const rows = [...(data ?? [])].sort(byPositionThenNumber);
  if (rows.length === 0) return <p className={`${styles.panel} ${styles.empty}`}>등록된 선수가 없습니다.</p>;

  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>사진</th>
            <th>번호</th>
            <th>이름</th>
            <th>포지션</th>
            <th>출전</th>
            <th>득점</th>
            <th>도움</th>
            <th>상태</th>
            <th>
              <span className="sr-only">수정·삭제</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((p) => (
            <tr key={p.id}>
              <td>
                {p.photo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.photo_url} alt="" className={styles.thumb} />
                ) : (
                  <span className={styles.badge}>없음</span>
                )}
              </td>
              <td>{p.number ?? "-"}</td>
              <td>
                <Link href={`/admin/players/${p.id}`} className={styles.rowLink}>
                  {p.name}
                </Link>
              </td>
              <td>{POSITION_LABEL[p.position]}</td>
              <td>{p.apps}</td>
              <td>{p.goals}</td>
              <td>{p.assists}</td>
              <td>
                {p.is_active ? (
                  <span className={`${styles.badge} ${styles.badgeBlue}`}>활동</span>
                ) : (
                  <span className={styles.badge}>비활동</span>
                )}
              </td>
              <td>
                <div className={styles.rowActions}>
                  <Link href={`/admin/players/${p.id}`} className={`${styles.buttonGhost} ${styles.buttonSmall}`}>
                    수정
                  </Link>
                  <DeleteButton
                    action={deletePlayer.bind(null, p.id)}
                    label="삭제"
                    small
                    confirmText={`${p.number != null ? `No.${p.number} ` : ""}${p.name} 선수를 명단에서 삭제할까요?\n기록·사진도 함께 지워지고 되돌릴 수 없습니다.\n(잠시 빼 두려면 수정 화면에서 '활동 중'을 끄면 홈페이지에서만 숨겨집니다)`}
                  />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
