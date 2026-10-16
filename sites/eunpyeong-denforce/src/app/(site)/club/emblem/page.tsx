import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { PageHeader } from "@/components/layout/PageHeader";
import { SITE } from "@/config/site";
import { EMBLEM_TEXT, KIT } from "@/data/club";
import { kitLinks } from "@/lib/news";
import { getNews } from "@/lib/repo";
import styles from "@/styles/prose.module.css";
import local from "./emblem.module.css";

export const metadata: Metadata = { title: "엠블럼·유니폼" };

export default async function EmblemPage() {
  const { reveal } = kitLinks(await getNews());
  return (
    <>
      <PageHeader title="엠블럼·유니폼" current="/club/emblem" />
      <div className={`container ${styles.body}`}>
        <section className={styles.split}>
          <Image src={SITE.emblem} alt={`${SITE.name} 엠블럼`} width={134} height={185} />
          <div className={styles.lead}>
            <h2 className={styles.h2}>엠블럼</h2>
            {EMBLEM_TEXT.map((p) => (
              <p key={p}>{p}</p>
            ))}
          </div>
        </section>
        <section className={styles.split}>
          <div className={local.kits}>
            {KIT.images.map((k) => (
              <figure key={k.src} className={local.kit}>
                <div className={local.kitImage}>
                  <Image src={k.src} alt={k.alt} fill sizes="(max-width: 760px) 50vw, 25vw" />
                </div>
                <figcaption className={local.caption}>{k.caption}</figcaption>
              </figure>
            ))}
          </div>
          <div className={styles.lead}>
            <h2 className={styles.h2}>유니폼</h2>
            {/* 설명 문구 대신 바로가기 버튼 (소유자 지시 — D-041). '유니폼 구매 안내' 버튼은 소유자 지시로 내림 */}
            {reveal && (
              <div className={local.actions}>
                <Link href={`/news/${reveal.category}/${reveal.id}`} className={`${styles.button} ${local.action}`}>
                  유니폼 공개 소식 보기
                  <span aria-hidden="true">→</span>
                </Link>
              </div>
            )}
          </div>
        </section>
      </div>
    </>
  );
}
