import Link from "next/link";
import type { ReactNode } from "react";
import styles from "./Section.module.css";

type Props = {
  title: string;
  more?: { href: string; label?: string };
  children: ReactNode;
};

export function Section({ title, more, children }: Props) {
  return (
    <section className={styles.section}>
      <div className="container">
        <div className={styles.head}>
          <h2 className={styles.title}>{title}</h2>
          {more && (
            <Link href={more.href} className={styles.more}>
              {more.label ?? "전체보기"}
            </Link>
          )}
        </div>
        {children}
      </div>
    </section>
  );
}
