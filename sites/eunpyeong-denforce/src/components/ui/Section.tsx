import Link from "next/link";
import type { ReactNode } from "react";
import styles from "./Section.module.css";

type Props = {
  title: string;
  /** 제목 오른쪽 링크. external 이면 새 창 */
  more?: { href: string; label?: string; external?: boolean };
  /** false 면 바깥 container 없이 — 이미 container 안(메인 두 칸 배치 등)에 둘 때 */
  contained?: boolean;
  /** 전폭 색 면 (리디자인 D-067): 검정(선수단) / black-soft(경기 띠). 위아래 section-gap, 글자는 on-dark */
  band?: "black" | "black-soft";
  children: ReactNode;
};

/** 섹션 제목(노란 마크 + kfa/h2) + 오른쪽 '전체보기 →' 링크 + 내용 */
export function Section({ title, more, contained = true, band, children }: Props) {
  const moreText = (
    <>
      {more?.label ?? "전체보기"} <span aria-hidden="true">{more?.external ? "↗" : "→"}</span>
    </>
  );
  const body = (
    <>
      <div className={styles.head}>
        <h2 className={styles.title}>{title}</h2>
        {more &&
          (more.external ? (
            <a href={more.href} target="_blank" rel="noopener noreferrer" className={styles.more}>
              {moreText}
              <span className="sr-only">(새 창)</span>
            </a>
          ) : (
            <Link href={more.href} className={styles.more}>
              {moreText}
            </Link>
          ))}
      </div>
      {children}
    </>
  );
  const bandClass = band === "black" ? styles.black : band === "black-soft" ? styles.blackSoft : "";
  return (
    <section className={`${styles.section} ${bandClass}`} data-surface={band ? "dark" : undefined}>
      {contained ? <div className="container">{body}</div> : body}
    </section>
  );
}
