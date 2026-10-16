import Image from "next/image";
import Link from "next/link";
import { KIT } from "@/data/club";
import type { NewsPost } from "@/types";
import styles from "./emblem.module.css";

/** 유니폼 탭 — 제목 / 모눈 패널(홈·어웨이 사진) / '유니폼 공개 소식 보기' 버튼(그 글이 있을 때만) */
export function UniformPanel({ reveal }: { reveal?: NewsPost }) {
  return (
    <section className={styles.section} aria-labelledby="uniform-title">
      <h2 id="uniform-title" className={styles.title}>
        {KIT.season} 시즌 유니폼
      </h2>

      <div className={`${styles.board} ${styles.kitBoard}`}>
        <div className={styles.kits}>
          {KIT.images.map((k) => (
            <figure key={k.src} className={styles.kit}>
              <div className={styles.kitImage}>
                <Image src={k.src} alt={k.alt} fill sizes="(max-width: 760px) 45vw, 360px" />
              </div>
              <figcaption className={styles.caption}>{k.caption}</figcaption>
            </figure>
          ))}
        </div>
      </div>

      {reveal && (
        <div className={styles.actions}>
          <Link href={`/news/${reveal.category}/${reveal.id}`} className={styles.action}>
            유니폼 공개 소식 보기<span aria-hidden="true">→</span>
          </Link>
        </div>
      )}
    </section>
  );
}
