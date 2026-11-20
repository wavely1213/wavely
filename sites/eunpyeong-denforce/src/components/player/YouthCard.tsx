import Image from "next/image";
import type { YouthTeam } from "@/config/youth";
import styles from "./PlayerCard.module.css";

/** 유스 팀 카드 — 코칭스태프 카드와 같은 모양(사진 칸 black-soft + 엠블럼, 아래 이름). 상세 페이지가 없어 링크 아님 */
export function YouthCard({ team }: { team: YouthTeam }) {
  return (
    <div className={`${styles.card} ${styles.plain}`}>
      <div className={styles.photo}>
        <div className={styles.brand}>
          <Image src={team.emblem} alt={`${team.name} 엠블럼`} width={team.pixels[0]} height={team.pixels[1]} className={styles.youthEmblem} />
        </div>
      </div>
      <strong className={styles.name}>{team.name}</strong>
    </div>
  );
}

/** 유스 팀 격자 — 코칭스태프와 같은 4열(휴대폰 2열) */
export function YouthGrid({ teams }: { teams: YouthTeam[] }) {
  return (
    <div className={`${styles.grid} ${styles.staffGrid}`}>
      {teams.map((t) => (
        <YouthCard key={t.name} team={t} />
      ))}
    </div>
  );
}
