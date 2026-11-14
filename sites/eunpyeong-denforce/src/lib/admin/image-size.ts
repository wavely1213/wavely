// 그림 파일 머리에서 픽셀 크기 읽기 (D-094 상대팀 엠블럼) — PNG, WebP(VP8 / VP8L / VP8X). 순수 함수 (테스트: image-size.test.ts)
// 새 의존성 없이 필요한 형식만. 모르는 형식이면 null.

export type ImageSize = { width: number; height: number; type: "png" | "webp" };

export function imageSize(bytes: Uint8Array): ImageSize | null {
  const b = bytes;
  const u32be = (o: number) => ((b[o] << 24) | (b[o + 1] << 16) | (b[o + 2] << 8) | b[o + 3]) >>> 0;
  const u24le = (o: number) => b[o] | (b[o + 1] << 8) | (b[o + 2] << 16);
  const u16le = (o: number) => b[o] | (b[o + 1] << 8);
  const ascii = (o: number, n: number) => String.fromCharCode(...b.subarray(o, o + n));

  // PNG: 8바이트 표지 + IHDR(너비, 높이 big-endian)
  if (b.length >= 24 && b[0] === 0x89 && ascii(1, 3) === "PNG" && ascii(12, 4) === "IHDR") {
    const width = u32be(16);
    const height = u32be(20);
    return width > 0 && height > 0 ? { width, height, type: "png" } : null;
  }
  // WebP: RIFF....WEBP + 덩어리
  if (b.length >= 30 && ascii(0, 4) === "RIFF" && ascii(8, 4) === "WEBP") {
    const chunk = ascii(12, 4);
    if (chunk === "VP8X") return { width: u24le(24) + 1, height: u24le(27) + 1, type: "webp" };
    if (chunk === "VP8 ") return { width: u16le(26) & 0x3fff, height: u16le(28) & 0x3fff, type: "webp" };
    if (chunk === "VP8L" && b[20] === 0x2f) {
      const bits = b[21] | (b[22] << 8) | (b[23] << 16) | (b[24] << 24);
      return { width: (bits & 0x3fff) + 1, height: ((bits >>> 14) & 0x3fff) + 1, type: "webp" };
    }
  }
  return null;
}
