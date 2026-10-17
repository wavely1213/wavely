"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { FitImage } from "@/components/ui/FitImage";
import { NEWS_CATEGORY_LABEL } from "@/data/news";
import { formatPostDate } from "@/lib/format";
import type { NewsPost } from "@/types";
import { newsHref } from "./NewsCard";
import styles from "./NewsBanner.module.css";

/** 자동으로 넘어가는 간격 */
const INTERVAL_MS = 5000;

/**
 * 구단소식 맨 위 메인 소식 슬라이드 배너 (D-035) — 몇 초마다 옆으로 넘어간다.
 * 마우스를 올리거나 키보드 초점이 있으면 멈추고, 멈춤 버튼·움직임 줄이기 설정으로도 멈춘다.
 */
export function NewsBanner({ posts }: { posts: NewsPost[] }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false); // 사용자가 멈춤 버튼으로 멈춤
  const [hold, setHold] = useState(false); // 마우스·초점이 배너 안에 있음
  const [reduced, setReduced] = useState(false);
  const count = posts.length;

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  const go = useCallback((i: number) => setIndex(((i % count) + count) % count), [count]);

  useEffect(() => {
    if (count < 2 || paused || hold || reduced) return;
    const t = window.setTimeout(() => go(index + 1), INTERVAL_MS);
    return () => window.clearTimeout(t);
  }, [index, count, paused, hold, reduced, go]);

  if (count === 0) return null;
  const autoplay = count > 1 && !paused && !reduced;

  return (
    <section
      className={styles.banner}
      aria-roledescription="carousel"
      aria-label="메인 소식"
      onMouseEnter={() => setHold(true)}
      onMouseLeave={() => setHold(false)}
      onFocus={() => setHold(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setHold(false);
      }}
    >
      <div className={styles.viewport}>
        <div className={styles.track} style={{ transform: `translateX(-${index * 100}%)` }} aria-live={autoplay ? "off" : "polite"}>
          {posts.map((p, i) => (
            <div
              key={p.id}
              className={styles.slide}
              role="group"
              aria-roledescription="slide"
              aria-label={`${i + 1} / ${count}`}
              aria-hidden={i !== index}
            >
              <Link href={newsHref(p)} className={styles.link} tabIndex={i === index ? undefined : -1}>
                <div className={styles.media}>
                  {/* 세로 포스터도 머리·제목이 잘리지 않게 전체를 보인다 */}
                  {p.thumbnail && <FitImage src={p.thumbnail} sizes="(max-width: 900px) 100vw, 720px" priority={i === 0} />}
                </div>
                <div className={styles.text}>
                  <span className={styles.category}>{NEWS_CATEGORY_LABEL[p.category]}</span>
                  <strong className={styles.title}>{p.title}</strong>
                  {p.summary && <p className={styles.summary}>{p.summary}</p>}
                  {p.date && <span className={styles.date}>{formatPostDate(p.date)}</span>}
                </div>
              </Link>
            </div>
          ))}
        </div>
      </div>
      {count > 1 && (
        <div className={styles.controls}>
          <button type="button" className={styles.arrow} onClick={() => go(index - 1)} aria-label="이전 소식">
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
              <path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" strokeWidth="2.4" />
            </svg>
          </button>
          <div className={styles.dots}>
            {posts.map((p, i) => (
              <button
                key={p.id}
                type="button"
                className={`${styles.dot} ${i === index ? styles.dotActive : ""}`}
                onClick={() => go(i)}
                aria-label={`${i + 1}번째 소식`}
                aria-current={i === index}
              />
            ))}
          </div>
          <button type="button" className={styles.arrow} onClick={() => go(index + 1)} aria-label="다음 소식">
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
              <path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" strokeWidth="2.4" />
            </svg>
          </button>
          <button type="button" className={styles.arrow} onClick={() => setPaused((v) => !v)} aria-label={paused ? "자동 넘김 다시 시작" : "자동 넘김 멈춤"}>
            {paused ? (
              <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
                <path d="M8 5v14l11-7z" fill="currentColor" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
                <path d="M7 5h4v14H7zM13 5h4v14h-4z" fill="currentColor" />
              </svg>
            )}
          </button>
        </div>
      )}
    </section>
  );
}
