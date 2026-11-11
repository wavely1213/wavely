"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { shouldFill } from "@/lib/fit-image";
import styles from "./FitImage.module.css";

/**
 * 칸에 맞춰 보여 주는 사진 — 세로 포스터처럼 칸과 비율이 크게 다른 사진은 자르지 않고 전체를 보이고,
 * 남는 곳은 같은 사진을 흐리게 깔아 채운다. 비율이 비슷한 사진(가로 사진 등)은 칸을 꽉 채운다.
 * 칸 비율이 폭에 따라 바뀌면(휴대폰 회전, 반응형 aspect-ratio) 다시 판정한다 (재검증 #6).
 * contain: 늘 전체 보기(채움 판정 끔) — 기사 사진 한 장 칸처럼 잘리면 안 되는 곳 (재검증 #5).
 * 부모 칸은 position: relative + 크기(aspect-ratio 등)를 가져야 한다. 처음(불러오기 전·자바스크립트 없이)은 전체 보기.
 */
export function FitImage({
  src,
  alt = "",
  sizes,
  priority,
  unoptimized,
  contain = false,
  className,
}: {
  src: string;
  alt?: string;
  sizes: string;
  priority?: boolean;
  unoptimized?: boolean;
  contain?: boolean;
  /** 감싸는 칸에 더할 클래스 (예: 마우스를 올리면 살짝 커지는 효과) */
  className?: string;
}) {
  const [fill, setFill] = useState(false);
  const [natural, setNatural] = useState<[number, number] | null>(null);
  const wrap = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = wrap.current;
    if (contain || !natural || !el) return;
    const judge = () => setFill(shouldFill(natural[0], natural[1], el.clientWidth, el.clientHeight));
    judge();
    const ro = new ResizeObserver(judge);
    ro.observe(el);
    return () => ro.disconnect();
  }, [contain, natural]);

  return (
    <span ref={wrap} className={`${styles.wrap} ${fill && !contain ? styles.fill : ""} ${className ?? ""}`}>
      <Image src={src} alt="" aria-hidden fill sizes={sizes} unoptimized={unoptimized} className={styles.backdrop} />
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        priority={priority}
        unoptimized={unoptimized}
        className={styles.main}
        onLoad={(e) => {
          const img = e.currentTarget;
          if (img.naturalWidth && img.naturalHeight) setNatural([img.naturalWidth, img.naturalHeight]);
        }}
      />
    </span>
  );
}
