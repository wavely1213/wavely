"use client";

import { useEffect, useRef, useState, type HTMLAttributes } from "react";
import { edgeFades, revealScrollLeft } from "@/lib/scroll-row";
import styles from "./ScrollRow.module.css";

/** 양 끝 흐림 폭 — ScrollRow.module.css 의 --fade 와 같게 */
const FADE_PX = 32;

/** 고른 탭 — 메뉴 링크(aria-current) 또는 탭 버튼(aria-selected) */
const ACTIVE_SELECTOR = '[aria-current="page"], [aria-selected="true"]';

/**
 * 가로로 넘치는 탭 줄 — 휴대폰에서 고른 탭이 화면 밖에 있으면 처음 열 때 옆으로만 옮겨 보이게 하고
 * (페이지는 위아래로 움직이지 않는다), 가려진 탭이 있는 쪽 끝을 살짝 흐리게 한다.
 * 서버에서는 흐림 없이 그대로 그려진다. activeKey 가 바뀌면(탭을 누르면) 고른 탭을 다시 보이게 한다.
 */
export function ScrollRow({
  activeKey,
  className,
  children,
  ...rest
}: HTMLAttributes<HTMLDivElement> & { activeKey?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [fadeStart, setFadeStart] = useState(false);
  const [fadeEnd, setFadeEnd] = useState(false);
  const moved = useRef(false);

  // 흐림: 옆으로 밀 때, 줄이나 탭 폭이 바뀔 때(화면 회전, 글꼴 로드) — ResizeObserver 는 붙일 때도 한 번 불린다
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => {
      const f = edgeFades(el.scrollLeft, el.scrollWidth, el.clientWidth);
      setFadeStart(f.start);
      setFadeEnd(f.end);
    };
    el.addEventListener("scroll", update, { passive: true });
    const observer = new ResizeObserver(update);
    observer.observe(el);
    for (const child of el.children) observer.observe(child);
    return () => {
      el.removeEventListener("scroll", update);
      observer.disconnect();
    };
  }, []);

  // 고른 탭 보이기 — scrollIntoView 는 페이지까지 위아래로 움직여서 줄의 scrollLeft 만 바꾼다
  useEffect(() => {
    const el = ref.current;
    const active = el?.querySelector<HTMLElement>(ACTIVE_SELECTOR);
    if (!el || !active) return;
    const row = el.getBoundingClientRect();
    const tab = active.getBoundingClientRect();
    const start = tab.left - row.left + el.scrollLeft;
    const left = revealScrollLeft({
      start,
      end: start + tab.width,
      scrollLeft: el.scrollLeft,
      clientWidth: el.clientWidth,
      scrollWidth: el.scrollWidth,
      margin: FADE_PX,
    });
    if (left !== el.scrollLeft) {
      // 처음 열 때는 바로, 탭을 눌러 바뀔 때는 부드럽게 (움직임 줄이기 설정이면 바로)
      const smooth = moved.current && !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      el.scrollTo({ left, behavior: smooth ? "smooth" : "instant" });
    }
    moved.current = true;
  }, [activeKey]);

  return (
    <div
      ref={ref}
      className={`${className ?? ""} ${fadeStart ? styles.fadeStart : ""} ${fadeEnd ? styles.fadeEnd : ""}`}
      {...rest}
    >
      {children}
    </div>
  );
}
