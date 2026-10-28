import Link from "next/link";
import type { ReactNode } from "react";
import styles from "./Section.module.css";

type Props = {
  title: string;
  more?: { href: string; label?: string };
  /** false 면 바깥 container 없이 — 이미 container 안(메인 두 칸 배치 등)에 둘 때 */
  contained?: boolean;
  children: ReactNode;
};

export function Section({ title, more, contained = true, children }: Props) {
  const body = (
    <>
      <div className={styles.head}>
        <h2 className={styles.title}>{title}</h2>
        {more && (
          <Link href={more.href} className={styles.more}>
            {more.label ?? "전체보기"}
          </Link>
        )}
      </div>
      {children}
    </>
  );
  return <section className={styles.section}>{contained ? <div className="container">{body}</div> : body}</section>;
}
