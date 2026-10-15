import type { Metadata } from "next";
import Image from "next/image";
import { PageHeader } from "@/components/layout/PageHeader";
import { SITE } from "@/config/site";
import { EMBLEM_TEXT } from "@/data/club";
import styles from "@/styles/prose.module.css";

export const metadata: Metadata = { title: "엠블럼·유니폼" };

export default function EmblemPage() {
  return (
    <>
      <PageHeader title="엠블럼·유니폼" current="/club/emblem" />
      <div className={`container ${styles.body}`}>
        <section className={styles.split}>
          <Image src={SITE.emblem} alt={`${SITE.name} 엠블럼`} width={171} height={195} />
          <div className={styles.lead}>
            <h2 className={styles.h2}>엠블럼</h2>
            {EMBLEM_TEXT.map((p) => (
              <p key={p}>{p}</p>
            ))}
          </div>
        </section>
        <section className={styles.split}>
          <div className={styles.figure}>
            <Image src="/photos/kit.jpg" alt="유니폼 디자인" fill sizes="(max-width: 760px) 100vw, 50vw" />
          </div>
          <div className={styles.lead}>
            <h2 className={styles.h2}>유니폼</h2>
            <p>로열블루와 화이트를 기본 컬러로 사용합니다.</p>
            <p className={styles.note}>시즌 유니폼 이미지는 확정 후 교체 예정입니다.</p>
          </div>
        </section>
      </div>
    </>
  );
}
