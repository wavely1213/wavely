import Image from "next/image";
import Link from "next/link";
import { getContentList, getSiteContent } from "@/lib/repo";
import type { NewsPost } from "@/types";
import styles from "./emblem.module.css";

/**
 * 유니폼 탭 — 제목 / 모눈 패널(홈·어웨이 사진) / '유니폼 공개 소식 보기' 버튼(그 글이 있을 때만).
 * 시즌·사진은 관리자 › 홈페이지 내용 › 엠블럼/유니폼
 */
export async function UniformPanel({ reveal }: { reveal?: NewsPost }) {
  const [content, items] = await Promise.all([getSiteContent(), getContentList("kit.images")]);
  const season = content["kit.season"];
  const kits = items.flatMap((k) => (k.image ? [{ id: k.id, src: k.image, caption: k.title, alt: k.body || `${season} ${k.title} 유니폼` }] : []));
  return (
    <section className={styles.section} aria-labelledby="uniform-title">
      <h2 id="uniform-title" className={styles.title}>
        {season} 시즌 유니폼
      </h2>

      {kits.length > 0 && (
        <div className={`${styles.board} ${styles.kitBoard}`}>
          <div className={styles.kits}>
            {kits.map((k) => (
              <figure key={k.id} className={styles.kit}>
                <div className={styles.kitImage}>
                  <Image src={k.src} alt={k.alt} fill sizes="(max-width: 760px) 45vw, 360px" />
                </div>
                <figcaption className={styles.caption}>{k.caption}</figcaption>
              </figure>
            ))}
          </div>
        </div>
      )}

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
