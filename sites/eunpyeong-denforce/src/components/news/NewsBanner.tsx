"use client";

import { useCallback, useEffect, useState } from "react";
import { FitImage } from "@/components/ui/FitImage";
import { NEWS_CATEGORY_LABEL } from "@/data/news";
import { formatPostDate } from "@/lib/format";
import type { NewsPost } from "@/types";
import { NewsLink } from "./NewsLink";
import styles from "./NewsBanner.module.css";

/** 자동으로 넘어가는 간격 */
const INTERVAL_MS = 5000;

/**
 * 구단소식 맨 위 메인 소식 슬라이드 배너 (D-035, 리디자인 3차 NewsBanner 145:782) — 몇 초마다 옆으로 넘어간다.
 * PC: 왼쪽 글 칸 400(분류, 제목, 요약, 날짜 + 아래 넘김), 오른쪽 사진 16:9. 휴대폰: 사진 위, 글 아래.
 * 넘김: 이전/다음 44, 점(보기용 — 위치는 '1 / 5' 글자로도 알림), 멈춤 44(이름 고정 + aria-pressed). 1장이면 넘김 숨김.
 * 마우스를 올리거나 키보드 초점이 있으면 멈추고, 멈춤 버튼/움직임 줄이기 설정으로도 멈춘다.
 */
export function NewsBanner({ posts }: { posts: NewsPost[] }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false); // 사용자가 멈춤 버튼으로 멈춤
  // 마우스가 배너 위 / 초점이 배너 안 — 따로 둔다: 마우스가 나가도 초점이 있으면 계속 멈춤 (검토 #10)
  const [hoverHold, setHoverHold] = useState(false);
  const [focusHold, setFocusHold] = useState(false);
  const hold = hoverHold || focusHold;
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
  // 실제로 흐르는 중일 때만 알림을 끈다 — 멈춰 있으면(마우스/초점/멈춤/움직임 줄이기) 넘길 때 '현재 3 / 5' 를 읽는다 (검토 #9)
  const autoplay = count > 1 && !paused && !reduced && !hold;

  return (
    <section
      data-surface="dark"
      className={`${styles.banner} ${count > 1 ? styles.multi : ""}`}
      aria-roledescription="carousel"
      aria-label="메인 소식"
      // 마우스만 올려 둔 동안 멈춤 — 터치 탭의 흉내 mouseenter 로 멈춘 채 남지 않게 (재검증 2차 #2)
      onPointerEnter={(e) => {
        if (e.pointerType === "mouse") setHoverHold(true);
      }}
      onPointerLeave={(e) => {
        if (e.pointerType === "mouse") setHoverHold(false);
      }}
      // 키보드 초점일 때만 멈춘다 — 마우스로 버튼을 누르면 초점이 남아 자동 넘김이 영영 멈추던 것 (재검증 #2, SwipeRow 와 같게)
      onFocus={(e) => {
        if ((e.target as HTMLElement).matches(":focus-visible")) setFocusHold(true);
      }}
      // 입력 방식이 섞일 때: 마우스로 누른 버튼을 키보드로 이어 쓰면 멈추고, 키보드로 온 뒤 마우스/터치로 누르면(onClick) 풀린다 (재검증 2차 #3)
      onKeyDown={(e) => {
        const active = document.activeElement;
        if (active instanceof HTMLElement && e.currentTarget.contains(active) && active.matches(":focus-visible")) setFocusHold(true);
      }}
      // 실제로 눌렀을 때만 푼다 — 손가락으로 밀어 스크롤만 할 때는 그대로(초점이 숨은 슬라이드에 남지 않게).
      // 키보드 Enter/Space 로 생긴 click 은 detail 0 이라 풀지 않는다 (배포 전 확인 #2)
      onClick={(e) => {
        if (e.detail > 0) setFocusHold(false);
      }}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setFocusHold(false);
      }}
    >
      <div className={styles.viewport}>
        <div className={styles.track} style={{ transform: `translateX(-${index * 100}%)` }}>
          {posts.map((p, i) => (
            <div
              key={p.id}
              className={styles.slide}
              role="group"
              aria-roledescription="slide"
              aria-label={`${i + 1} / ${count}`}
              aria-hidden={i !== index}
            >
              <NewsLink post={p} className={styles.link} tabIndex={i === index ? undefined : -1}>
                <div className={styles.text}>
                  <span className={styles.category}>{NEWS_CATEGORY_LABEL[p.category]}</span>
                  <strong className={styles.title}>{p.title}</strong>
                  {p.summary && <p className={styles.summary}>{p.summary}</p>}
                  {p.date && <span className={styles.date}>{formatPostDate(p.date)}</span>}
                </div>
                <div className={styles.media}>
                  {/* 세로 포스터도 머리/제목이 잘리지 않게 전체를 보인다 */}
                  {p.thumbnail && <FitImage src={p.thumbnail} sizes="(max-width: 900px) 100vw, 800px" priority={i === 0} />}
                </div>
              </NewsLink>
            </div>
          ))}
        </div>
      </div>
      {count > 1 && (
        <div className={styles.controls}>
          <button type="button" className={styles.arrow} onClick={() => go(index - 1)} aria-label="이전 소식">
            <span aria-hidden="true">←</span>
          </button>
          <button type="button" className={styles.arrow} onClick={() => go(index + 1)} aria-label="다음 소식">
            <span aria-hidden="true">→</span>
          </button>
          <span className={styles.dots} aria-hidden="true">
            {posts.map((p, i) => (
              <span key={p.id} className={`${styles.dot} ${i === index ? styles.dotActive : ""}`} />
            ))}
          </span>
          <span className={styles.counter} aria-live={autoplay ? "off" : "polite"} aria-atomic="true">
            <span className="sr-only">현재 </span>
            {index + 1} / {count}
          </span>
          {/* 움직임 줄이기면 흐르지 않으므로 멈춤 버튼을 숨긴다 (SponsorMarquee 와 같게, 검토 #11) */}
          {!reduced && (
            <button type="button" className={styles.arrow} onClick={() => setPaused((v) => !v)} aria-pressed={paused}>
              <span className="sr-only">자동 넘김 멈춤</span>
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
          )}
        </div>
      )}
    </section>
  );
}
