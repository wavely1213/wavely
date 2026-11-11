"use client";

import { useEffect, useRef, useState, type CSSProperties, type FocusEvent, type HTMLAttributes } from "react";
import { edgeFades, revealScrollLeft } from "@/lib/scroll-row";
import styles from "./ScrollRow.module.css";

/** 양 끝 흐림 폭 기본값 — ScrollRow.module.css 의 --fade 와 같게 (fade prop 으로 바꾸면 style 로 --fade 를 덮는다) */
const FADE_PX = 32;

/** 고른 탭 — 메뉴 링크(aria-current), 탭 버튼(aria-selected) 또는 토글 버튼(aria-pressed, 포스팅 분류) */
const ACTIVE_SELECTOR = '[aria-current="page"], [aria-selected="true"], [aria-pressed="true"]';

/**
 * 가로로 넘치는 탭 줄 — 휴대폰에서 고른 탭이 화면 밖에 있으면 처음 열 때 옆으로만 옮겨 보이게 하고
 * (페이지는 위아래로 움직이지 않는다), 가려진 탭이 있는 쪽 끝을 살짝 흐리게 한다.
 * 서버에서는 흐림 없이 그대로 그려진다. activeKey 가 바뀌면(탭을 누르면) 고른 탭을 다시 보이게 한다.
 */
export function ScrollRow({
  activeKey,
  fade = FADE_PX,
  className,
  children,
  style,
  ...rest
}: HTMLAttributes<HTMLDivElement> & {
  activeKey?: string;
  /** 끝 흐림 폭(px) — 가려진 탭이 흐림 안에 충분히 들어오게 줄마다 넓힐 수 있다 (포스팅 분류 48) */
  fade?: number;
}) {
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
      margin: fade,
    });
    if (left !== el.scrollLeft) {
      // 처음 열 때는 바로, 탭을 눌러 바뀔 때는 부드럽게 (움직임 줄이기 설정이면 바로)
      const smooth = moved.current && !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      el.scrollTo({ left, behavior: smooth ? "smooth" : "instant" });
    }
    moved.current = true;
  }, [activeKey, fade]);

  // 키보드로 줄 안의 탭에 초점이 오면 그 탭이 다 보이게 옆으로만 옮긴다 (화면 밖에 반쯤 걸리지 않게).
  // 마우스/터치로 누를 때 생긴 초점에는 옮기지 않는다 — 누르는 사이 줄이 움직이면 click 이 빗나간다
  const onFocus = (e: FocusEvent<HTMLDivElement>) => {
    rest.onFocus?.(e);
    const el = ref.current;
    const item = e.target instanceof HTMLElement ? e.target : null;
    if (!el || !item || item === el || !item.matches(":focus-visible")) return;
    const row = el.getBoundingClientRect();
    const tab = item.getBoundingClientRect();
    const start = tab.left - row.left + el.scrollLeft;
    const left = revealScrollLeft({ start, end: start + tab.width, scrollLeft: el.scrollLeft, clientWidth: el.clientWidth, scrollWidth: el.scrollWidth, margin: fade });
    if (left !== el.scrollLeft) el.scrollTo({ left, behavior: "instant" });
  };

  return (
    <div
      ref={ref}
      className={`${className ?? ""} ${fadeStart ? styles.fadeStart : ""} ${fadeEnd ? styles.fadeEnd : ""}`}
      style={fade === FADE_PX ? style : ({ ...style, "--fade": `${fade}px` } as CSSProperties)}
      {...rest}
      onFocus={onFocus}
    >
      {children}
    </div>
  );
}
