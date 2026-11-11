import Image from "next/image";
import { isPreshrunkThumbnail, plainText } from "@/lib/postings";
import type { Posting } from "@/types";
import styles from "./InstagramGrid.module.css";

/**
 * 메인 INSTAGRAM (리디자인 D-067, D-002 변경: 섹션 추가) — 자동 반영으로 저장된 구단 인스타그램 표지 6칸 정사각, 누르면 게시물(새 창).
 * 섹션 제목은 코드 고정 'INSTAGRAM' (새 관리자 칸 없음). 게시물이 없으면 섹션째 숨긴다(page.tsx).
 */
export function InstagramGrid({ posts }: { posts: Posting[] }) {
  return (
    <ul className={styles.grid}>
      {posts.map((p) => (
        <li key={p.id}>
          <a href={p.url} target="_blank" rel="noopener noreferrer" className={styles.tile}>
            {/* 표지는 정사각 칸을 채운다 — 인스타그램 피드와 같은 잘림 */}
            <Image
              src={p.thumbnail!}
              alt={plainText(p.title)}
              fill
              sizes="(max-width: 720px) 33vw, 184px"
              unoptimized={isPreshrunkThumbnail(p.thumbnail!)}
              className={styles.image}
            />
            <span className="sr-only">(새 창)</span>
          </a>
        </li>
      ))}
    </ul>
  );
}
