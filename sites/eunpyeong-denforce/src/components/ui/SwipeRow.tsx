"use client";

import { Children, useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import styles from "./SwipeRow.module.css";

/** 한 페이지(보이는 칸 폭 + 칸 사이)만큼 넘긴다 — 줄 안쪽 여백(초점 링 자리)은 빼고 잰다 */
function measure(el: HTMLElement): { step: number; count: number } {
  const cs = getComputedStyle(el);
  const pad = parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight);
  const gap = parseFloat(cs.columnGap) || 0;
  const step = Math.max(1, el.clientWidth - pad + gap);
  const count = Math.max(1, Math.ceil((el.scrollWidth - pad + gap - 2) / step));
  return { step, count };
}

/**
 * 옆으로 넘기는 카드 줄 (리디자인 D-067) — 스와이프(scroll-snap) + 점(+ 화살표).
 * - perView: 한 화면 칸 수 (PC). 휴대폰(720 이하)은 1칸 + 옆 카드 24px 보임, 칸이 1개면 전폭.
 * - fixedOnDesktop: PC 에서는 넘기지 않고 칸이 폭을 나눈다 (경기 띠). 점/화살표는 넘길 것이 있을 때만.
 * - 점은 '페이지'(한 화면) 단위. 화살표는 arrows 일 때만(휴대폰은 스와이프).
 */
export function SwipeRow({
  children,
  label,
  perView = 1,
  fixedOnDesktop = false,
  arrows = false,
  tone = "light",
  className,
}: {
  children: ReactNode;
  label: string;
  perView?: number;
  fixedOnDesktop?: boolean;
  arrows?: boolean;
  tone?: "light" | "dark";
  className?: string;
}) {
  const items = Children.toArray(children);
  const ref = useRef<HTMLDivElement>(null);
  const [page, setPage] = useState(0);
  const [pages, setPages] = useState(1);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => {
      const { step, count } = measure(el);
      setPages(count);
      // 끝까지 밀었으면 마지막 페이지
      const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 2;
      setPage(atEnd ? count - 1 : Math.round(el.scrollLeft / step));
    };
    update();
    el.addEventListener("scroll", update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", update);
      ro.disconnect();
    };
  }, [items.length]);

  const go = (p: number) => {
    const el = ref.current;
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollTo({ left: Math.max(0, p) * measure(el).step, behavior: reduce ? "instant" : "smooth" });
  };

  return (
    <div className={`${styles.wrap} ${tone === "dark" ? styles.dark : ""} ${className ?? ""}`}>
      <div
        ref={ref}
        className={`${styles.row} ${fixedOnDesktop ? styles.fixed : ""} ${items.length === 1 ? styles.single : ""}`}
        style={{ "--per-view": perView } as CSSProperties}
        role="group"
        aria-label={label}
      >
        {items.map((item, i) => (
          <div key={i} className={styles.cell}>
            {item}
          </div>
        ))}
      </div>
      {pages > 1 && (
        <div className={styles.controls}>
          <div className={styles.dots}>
            {Array.from({ length: pages }, (_, i) => (
              <button
                key={i}
                type="button"
                className={`${styles.dot} ${i === page ? styles.dotActive : ""}`}
                aria-label={`${label} ${i + 1}/${pages}`}
                aria-current={i === page ? "true" : undefined}
                onClick={() => go(i)}
              />
            ))}
          </div>
          {arrows && (
            <div className={styles.arrows}>
              <button type="button" className={styles.arrow} aria-label="이전" disabled={page === 0} onClick={() => go(page - 1)}>
                <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" strokeWidth="2" />
                </svg>
              </button>
              <button type="button" className={styles.arrow} aria-label="다음" disabled={page >= pages - 1} onClick={() => go(page + 1)}>
                <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" strokeWidth="2" />
                </svg>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
