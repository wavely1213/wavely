"use client";

import { useState } from "react";
import { NewsGrid } from "@/components/news/NewsCard";
import { ScrollRow } from "@/components/ui/ScrollRow";
import { NEWS_CATEGORY_LABEL } from "@/data/news";
import type { NewsCategory, NewsPost } from "@/types";
import styles from "./Tabs.module.css";

const TABS: Array<NewsCategory | "all"> = ["all", "notice", "news", "photo", "video"];

export function NewsTabs({ posts, limit = 4, columns = 4 }: { posts: NewsPost[]; limit?: number; columns?: 3 | 4 }) {
  const [tab, setTab] = useState<NewsCategory | "all">("all");
  const visible = (tab === "all" ? posts : posts.filter((p) => p.category === tab)).slice(0, limit);

  return (
    <>
      <ScrollRow className={styles.tabs} role="tablist" activeKey={tab}>
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
      {visible.length > 0 ? <NewsGrid posts={visible} columns={columns} scroll /> : <p className={styles.empty}>게시물이 없습니다.</p>}
    </>
  );
}
