import Image from "next/image";
import { EmblemFallback } from "@/components/ui/EmblemFallback";
import type { Staff } from "@/types";
import styles from "./PlayerCard.module.css";

/** 코칭스태프 카드 — 선수 카드와 같은 모양 (상세 페이지가 없어 링크 아님) */
export function StaffCard({ staff }: { staff: Staff }) {
  return (
    <div className={`${styles.card} ${styles.plain}`}>
      <div className={styles.photo}>
        {staff.photo ? (
          <Image src={staff.photo} alt="" fill sizes="(max-width: 720px) 45vw, 220px" />
        ) : (
          <EmblemFallback />
        )}
      </div>
      <strong className={styles.name}>{staff.name}</strong>
      <span className={styles.position}>{staff.role}</span>
    </div>
  );
}

export function StaffGrid({ staff }: { staff: Staff[] }) {
  return (
    <div className={styles.grid}>
      {staff.map((s) => (
        <StaffCard key={s.id} staff={s} />
      ))}
    </div>
  );
}
