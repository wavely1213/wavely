/** 쇼핑백 모양 (24×24, 글자색을 따른다) — 상단 띠·모바일 메뉴의 MD스토어 (D-047) */
export function StoreIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <g fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 8h14l-1 12H6L5 8Z" />
        <path d="M9 10V7a3 3 0 0 1 6 0v3" />
      </g>
    </svg>
  );
}
