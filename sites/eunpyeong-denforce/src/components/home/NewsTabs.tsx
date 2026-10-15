"use client";

import { useState } from "react";
import { NewsGrid } from "@/components/news/NewsCard";
import { NEWS_CATEGORY_LABEL } from "@/data/news";
import type { NewsCategory, NewsPost } from "@/types";
import styles from "./Tabs.module.css";

const TABS: Array<NewsCategory | "all"> = ["all", "notice", "news", "photo", "video"];

export function NewsTabs({ posts, limit = 6 }: { posts: NewsPost[]; limit?: number }) {
  const [tab, setTab] = useState<NewsCategory | "all">("all");
  const visible = (tab === "all" ? posts : posts.filter((p) => p.category === tab)).slice(0, limit);

  return (
    <>
      <div className={styles.tabs} role="tablist">
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
      </div>
      {visible.length > 0 ? <NewsGrid posts={visible} /> : <p className={styles.empty}>게시물이 없습니다.</p>}
    </>
  );
}
