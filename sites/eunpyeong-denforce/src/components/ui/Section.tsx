import Link from "next/link";
import type { ReactNode } from "react";
import styles from "./Section.module.css";

type Props = {
  title: string;
  more?: { href: string; label?: string };
  tone?: "plain" | "soft" | "dark";
  children: ReactNode;
};

export function Section({ title, more, tone = "plain", children }: Props) {
  return (
    <section className={`${styles.section} ${styles[tone]}`}>
      <div className="container">
        <div className={styles.head}>
          <h2 className={styles.title}>{title}</h2>
          {more && (
            <Link href={more.href} className={styles.more}>
              {more.label ?? "더보기"} →
            </Link>
          )}
        </div>
        {children}
      </div>
    </section>
  );
}
