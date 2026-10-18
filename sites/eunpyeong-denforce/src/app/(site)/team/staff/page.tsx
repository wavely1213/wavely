import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/PageHeader";
import { StaffGrid } from "@/components/player/StaffCard";
import { getStaff } from "@/lib/repo";
import { splitStaff } from "@/lib/staff";
import styles from "@/styles/prose.module.css";
import { pageMetadata } from "@/lib/page-meta";

export function generateMetadata(): Promise<Metadata> {
  return pageMetadata("코칭스태프", "/team/staff");
}

// 코칭스태프(감독·코치)는 사진 카드, 프런트(단장·사무국 등)는 직책·이름 목록
export default async function StaffPage() {
  const { coaching, front } = splitStaff(await getStaff());
  return (
    <>
      <PageHeader title="코칭스태프" current="/team/staff" />
      <div className={`container ${styles.body}`}>
        {coaching.length > 0 && (
          <section>
            <h2 className={styles.h2}>코칭스태프</h2>
            <StaffGrid staff={coaching} />
          </section>
        )}
        {front.length > 0 && (
          <section>
            <h2 className={styles.h2}>프런트</h2>
            <ul className={`${styles.list} ${styles.listWide}`}>
              {front.map((s) => (
                <li key={s.id}>
                  <span>{s.role}</span>
                  <span>{s.name}</span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </>
  );
}
