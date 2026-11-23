"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * 가로로 넘칠 수 있는 칸(표 등) — 실제로 넘칠 때만 키보드 초점(tabIndex 0)과 '(옆으로 넘겨 보기)' 이름을 붙인다.
 * 넘길 것이 없으면 Tab 이 멈추지 않고 낭독도 하지 않는다 (검토 #6). 처음(자바스크립트 전)은 넘치지 않는 것으로 본다.
 */
export function ScrollRegion({
  label,
  className,
  hint,
  hintClassName,
  children,
}: {
  label: string;
  className?: string;
  /** 넘칠 때만 칸 아래에 보이는 안내(예: '가로로 밀어 더 보기 →'). 낭독은 칸 이름이 하므로 숨긴다 */
  hint?: string;
  hintClassName?: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [scrolls, setScrolls] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setScrolls(el.scrollWidth > el.clientWidth + 1);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return (
    <>
      <div
        ref={ref}
        className={className}
        role={scrolls ? "region" : undefined}
        aria-label={scrolls ? `${label} (옆으로 넘겨 보기)` : undefined}
        tabIndex={scrolls ? 0 : undefined}
      >
        {children}
      </div>
      {hint && scrolls && (
        <p className={hintClassName} aria-hidden="true">
          {hint}
        </p>
      )}
    </>
  );
}
