"use client";

import { Children, useEffect, useRef, useState, type CSSProperties, type FocusEvent, type ReactNode } from "react";
import { swipeMetrics } from "@/lib/swipe";
import styles from "./SwipeRow.module.css";

function measure(el: HTMLElement): { step: number; count: number } {
  const cs = getComputedStyle(el);
  const pad = parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight);
  const gap = parseFloat(cs.columnGap) || 0;
  const cells = el.children;
  const first = cells[0] as HTMLElement | undefined;
  const second = cells[1] as HTMLElement | undefined;
  const itemStep = first && second ? second.offsetLeft - first.offsetLeft : (first?.offsetWidth ?? 0) + gap;
  return swipeMetrics({ clientWidth: el.clientWidth, pad, gap, itemStep, items: cells.length, scrolls: cs.overflowX !== "visible" });
}

/**
 * 옆으로 넘기는 카드 줄 (리디자인 D-067) — 스와이프(scroll-snap) + 점(+ 화살표).
 * - perView: 한 화면 칸 수 (PC). 휴대폰(720 이하)은 1칸 + 옆 카드, 줄은 화면 오른쪽 끝까지, 칸이 1개면 전폭.
 * - fixedOnDesktop: PC(901 이상)에서는 넘기지 않고 칸이 폭을 나눈다 (경기 띠). 721~900 은 2칸 + 스와이프.
 * - 점은 넘길 것이 있을 때만, 누르는 영역 44. 화살표는 arrows 일 때만(휴대폰은 스와이프).
 *   끝에서 화살표는 disabled 대신 aria-disabled — 초점이 사라지지 않게 (G5).
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
      setPage(Math.min(count - 1, atEnd ? count - 1 : Math.round(el.scrollLeft / step)));
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

  // 키보드 초점이 다 안 보이는 칸으로 가면 그 칸이 보이게 줄을 민다 (검토 #3, 마우스/터치 초점은 그대로)
  const onFocus = (e: FocusEvent<HTMLDivElement>) => {
    const el = ref.current;
    const target = e.target as HTMLElement;
    if (!el || !target.matches(":focus-visible")) return;
    const cell = target.closest<HTMLElement>(`.${styles.cell}`);
    if (!cell || cell.parentElement !== el) return;
    const pad = parseFloat(getComputedStyle(el).paddingLeft) || 0;
    const left = cell.offsetLeft - el.offsetLeft;
    const visible = left >= el.scrollLeft && left + cell.offsetWidth <= el.scrollLeft + el.clientWidth;
    if (visible) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollTo({ left: Math.max(0, left - pad), behavior: reduce ? "instant" : "smooth" });
  };

  const go = (p: number) => {
    const el = ref.current;
    if (!el || p < 0 || p > pages - 1) return;
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
        onFocus={onFocus}
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
              <button type="button" className={styles.arrow} aria-label="이전" aria-disabled={page === 0 ? "true" : undefined} onClick={() => go(page - 1)}>
                <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" strokeWidth="2" />
                </svg>
              </button>
              <button type="button" className={styles.arrow} aria-label="다음" aria-disabled={page >= pages - 1 ? "true" : undefined} onClick={() => go(page + 1)}>
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
