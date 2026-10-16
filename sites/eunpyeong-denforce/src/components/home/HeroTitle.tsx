"use client";

import { useLayoutEffect, useRef } from "react";

/**
 * 메인 큰 제목 — 윗줄 슬로건 폭을 아래 구단 이름 폭에 딱 맞춘다 (D-036 "'스'까지 딱 떨어지게").
 * 슬로건·구단 이름을 관리자 화면에서 바꿀 수 있으므로(D-046) 글자 수에 맞춰 크기를 다시 잰다.
 * 처음 그림(서버)은 CSS 기본 비율 0.7625em — 기본 슬로건은 그대로 맞고, 바뀐 슬로건은 화면에 뜬 뒤 한 번 맞춰진다.
 */
export function HeroTitle({
  slogan,
  name,
  className,
  leadClassName,
}: {
  slogan: string;
  name: string;
  className: string;
  leadClassName: string;
}) {
  const titleRef = useRef<HTMLHeadingElement>(null);
  const leadRef = useRef<HTMLSpanElement>(null);
  const nameRef = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    const title = titleRef.current;
    const lead = leadRef.current;
    const nameEl = nameRef.current;
    if (!title || !lead || !nameEl) return;

    const fit = () => {
      lead.style.fontSize = ""; // CSS 기본(0.7625em)에서 다시 잰다
      const target = nameEl.getBoundingClientRect().width;
      const width = lead.getBoundingClientRect().width;
      const titleSize = parseFloat(getComputedStyle(title).fontSize);
      const leadSize = parseFloat(getComputedStyle(lead).fontSize);
      if (!target || !width || !titleSize || !leadSize) return;
      // em 으로 두면 화면 폭에 따라 제목 크기가 바뀌어도 비율이 그대로 유지된다
      lead.style.fontSize = `${((leadSize / titleSize) * target) / width}em`;
    };

    fit();
    let alive = true;
    // 글꼴(KFA고딕)이 늦게 오면 폭이 달라지므로 다 받은 뒤 한 번 더
    document.fonts?.ready.then(() => alive && fit());
    const ro = new ResizeObserver(fit);
    ro.observe(title);
    return () => {
      alive = false;
      ro.disconnect();
    };
  }, [slogan, name]);

  return (
    <h1 ref={titleRef} className={className}>
      <span ref={leadRef} className={leadClassName}>
        {slogan}
      </span>{" "}
      <span ref={nameRef}>{name}</span>
    </h1>
  );
}
