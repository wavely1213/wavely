"use client";

import Link from "next/link";
import { useState } from "react";
import { NewsLink } from "@/components/news/NewsLink";
import { buttonClass } from "@/components/ui/Button";
import { FitImage } from "@/components/ui/FitImage";
import { ScrollRow } from "@/components/ui/ScrollRow";
import { NEWS_CATEGORY_LABEL } from "@/data/news";
import { formatPostDate } from "@/lib/format";
import type { NewsCategory, NewsPost } from "@/types";
import news from "./HomeNews.module.css";
import styles from "./Tabs.module.css";

const TABS: Array<NewsCategory | "all"> = ["all", "notice", "news", "photo", "video"];
/** 큰 카드 1 + 목록 행 4 (리디자인 D-067, D-034 변경) */
const SHOWN = 5;

/** 메인 '구단 소식' — 분류 탭 + PC 큰 카드 1 + 목록 행 4 / 휴대폰 목록 행 4 + '더 보기'(그 분류 목록) */
export function NewsTabs({ posts }: { posts: NewsPost[] }) {
  const [tab, setTab] = useState<NewsCategory | "all">("all");
  const visible = (tab === "all" ? posts : posts.filter((p) => p.category === tab)).slice(0, SHOWN);
  const [lead, ...rows] = visible;

  return (
    <>
      <ScrollRow className={styles.tabs} role="tablist" aria-label="구단 소식 분류" activeKey={tab}>
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            className={`${styles.tab} ${tab === t ? styles.active : ""}`}
            onClick={() => setTab(t)}
          >
            {t === "all" ? "전체" : NEWS_CATEGORY_LABEL[t]}
          </button>
        ))}
      </ScrollRow>
      {lead ? (
        <div className={news.body} role="tabpanel">
          <NewsLink post={lead} className={`${news.lead} ${news.desktopOnly}`}>
            <span className={news.leadThumb}>{lead.thumbnail && <FitImage src={lead.thumbnail} sizes="520px" />}</span>
            <span className={news.text}>
              <span className={news.category}>{NEWS_CATEGORY_LABEL[lead.category]}</span>
              <strong className={news.leadTitle}>{lead.title}</strong>
              <span className={news.date}>{formatPostDate(lead.date)}</span>
            </span>
          </NewsLink>
          <ul className={news.rows}>
            {/* 휴대폰은 큰 카드 없이 목록 행 4 (첫 글 포함) */}
            {[lead, ...rows].map((p, i) => (
              <li key={p.id} className={i === 0 ? news.mobileOnly : i === SHOWN - 1 ? news.desktopOnly : undefined}>
                <NewsLink post={p} className={news.row}>
                  <span className={news.rowThumb}>{p.thumbnail && <FitImage src={p.thumbnail} sizes="120px" />}</span>
                  <span className={news.text}>
                    <span className={news.category}>{NEWS_CATEGORY_LABEL[p.category]}</span>
                    <strong className={news.rowTitle}>{p.title}</strong>
                    <span className={news.date}>{formatPostDate(p.date)}</span>
                  </span>
                </NewsLink>
              </li>
            ))}
          </ul>
          <Link href={tab === "all" ? "/news" : `/news/${tab}`} className={buttonClass("secondary", `${news.more} ${news.mobileOnly}`)}>
            더 보기
          </Link>
        </div>
      ) : (
        <p className={styles.empty}>게시물이 없습니다.</p>
      )}
    </>
  );
}
