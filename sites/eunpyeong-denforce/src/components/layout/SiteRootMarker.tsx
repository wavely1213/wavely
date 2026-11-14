"use client";

import { useEffect } from "react";

/**
 * 공개 화면 레이아웃이 화면에 있는 동안만 html 에 'site-html' 을 붙인다 (globals.css 의 scroll-padding-top).
 * 공개 화면에서 관리자로 클라이언트 이동하면 숨겨진 공개 레이아웃이 DOM 에 남을 수 있어(:has 로는 못 가림) 효과로 붙였다 뗀다.
 */
export function SiteRootMarker() {
  useEffect(() => {
    const html = document.documentElement;
    html.classList.add("site-html");
    return () => html.classList.remove("site-html");
  }, []);
  return null;
}
