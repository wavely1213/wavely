/** 팀 색상 표시용 — '#RRGGBB' 를 RGB 숫자로. 형식이 틀리면 null */
export function hexToRgb(hex: string): [number, number, number] | null {
  const m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex.trim());
  return m ? [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)] : null;
}

/** 색 칸 위 글씨 — 밝은 색이면 어두운 글씨(dark), 어두운 색이면 흰 글씨(light). 상대 휘도 기준 */
export function inkOn(rgb: [number, number, number]): "dark" | "light" {
  const [r, g, b] = rgb.map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  // 흰 글씨 대비와 검은 글씨 대비 중 큰 쪽 (교차점 ≈ 0.179)
  return luminance > 0.179 ? "dark" : "light";
}
