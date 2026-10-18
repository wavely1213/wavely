"use client";

import { useState } from "react";
import { MoreButton } from "@/components/ui/MoreButton";
import { POSTING_KIND_LABEL, POSTING_PLATFORM_LABEL } from "@/data/postings";
import { countByKind, filterPostings, platformCounts, POSTING_KINDS, POSTINGS_PAGE_SIZE } from "@/lib/postings";
import type { Posting, PostingKind, PostingPlatform } from "@/types";
import { PostingCard } from "./PostingCard";
import styles from "./PostingBoard.module.css";

/** 포스팅 목록 — 왼쪽 분류 탭(전체·구단·뉴스·팬·FK리그, 전체에는 FK리그 제외) + 오른쪽 출처 칩 + 카드 격자, '더 보기'로 늘린다 */
export function PostingBoard({ postings }: { postings: Posting[] }) {
  const [kind, setKind] = useState<PostingKind | null>(null);
  const [platform, setPlatform] = useState<PostingPlatform | null>(null);
  const [limit, setLimit] = useState(POSTINGS_PAGE_SIZE);

  const kindCounts = countByKind(postings);
  const platforms = platformCounts(postings, kind);
  const scopedTotal = kind ? kindCounts[kind] : kindCounts.all;
  const list = filterPostings(postings, { kind, platform });
  const shown = list.slice(0, limit);

  const pickKind = (k: PostingKind | null) => {
    setKind(k);
    setPlatform(null); // 분류마다 출처 목록이 달라 출처 선택은 풀어 준다
    setLimit(POSTINGS_PAGE_SIZE);
  };
  const pickPlatform = (p: PostingPlatform | null) => {
    setPlatform(p);
    setLimit(POSTINGS_PAGE_SIZE);
  };

  return (
    <>
      <div className={styles.filters}>
        <div className={styles.tabs} role="group" aria-label="분류">
          {[null, ...POSTING_KINDS].map((k) => (
            <button
              key={k ?? "all"}
              type="button"
              className={`${styles.tab} ${k === kind ? styles.tabActive : ""}`}
              aria-pressed={k === kind}
              onClick={() => pickKind(k)}
            >
              {k ? POSTING_KIND_LABEL[k] : "전체"}
              <span className={styles.count}>{k ? kindCounts[k] : kindCounts.all}</span>
            </button>
          ))}
        </div>
        <div className={styles.chips} role="group" aria-label="출처">
          {[{ platform: null, count: scopedTotal }, ...platforms].map((c) => (
            <button
              key={c.platform ?? "all"}
              type="button"
              className={`${styles.chip} ${c.platform === platform ? styles.chipActive : ""}`}
              aria-pressed={c.platform === platform}
              onClick={() => pickPlatform(c.platform)}
            >
              {c.platform ? POSTING_PLATFORM_LABEL[c.platform] : "전체"} {c.count}
            </button>
          ))}
        </div>
      </div>

      {shown.length > 0 ? (
        <div className={styles.grid}>
          {shown.map((p) => (
            <PostingCard key={p.id} posting={p} />
          ))}
        </div>
      ) : (
        <p className={styles.empty}>아직 모은 글이 없습니다.</p>
      )}

      {list.length > shown.length && (
        <MoreButton remaining={list.length - shown.length} onClick={() => setLimit((n) => n + POSTINGS_PAGE_SIZE)} />
      )}
    </>
  );
}
