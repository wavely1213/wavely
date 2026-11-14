import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { imageSize } from "../src/lib/admin/image-size.ts";

// 상대팀 엠블럼 업로드 크기 읽기 (D-094) — 저장소의 실제 파일로

test("PNG (public/crests)", () => {
  assert.deepEqual(imageSize(readFileSync("public/crests/cheongju.png")), { width: 371, height: 475, type: "png" });
  assert.deepEqual(imageSize(readFileSync("public/crests/gangwon.png")), { width: 256, height: 264, type: "png" });
});

test("WebP VP8 (public/photos)", () => {
  assert.deepEqual(imageSize(readFileSync("public/photos/kit.webp")), { width: 1200, height: 1200, type: "webp" });
});

test("WebP VP8X / VP8L 머리 (만든 바이트)", () => {
  const vp8x = new Uint8Array(30);
  vp8x.set([..."RIFF"].map((c) => c.charCodeAt(0)), 0);
  vp8x.set([..."WEBPVP8X"].map((c) => c.charCodeAt(0)), 8);
  vp8x.set([0xff, 0x01, 0x00], 24); // 512 - 1 = 511
  vp8x.set([0x2b, 0x01, 0x00], 27); // 300 - 1 = 299
  assert.deepEqual(imageSize(vp8x), { width: 512, height: 300, type: "webp" });
  const vp8l = new Uint8Array(30);
  vp8l.set([..."RIFF"].map((c) => c.charCodeAt(0)), 0);
  vp8l.set([..."WEBPVP8L"].map((c) => c.charCodeAt(0)), 8);
  vp8l[20] = 0x2f;
  const bits = (100 - 1) | ((50 - 1) << 14);
  vp8l.set([bits & 0xff, (bits >> 8) & 0xff, (bits >> 16) & 0xff, (bits >>> 24) & 0xff], 21);
  assert.deepEqual(imageSize(vp8l), { width: 100, height: 50, type: "webp" });
});

test("모르는 형식, 짧은 파일은 null", () => {
  assert.equal(imageSize(new Uint8Array([0xff, 0xd8, 0xff, 0xe0])), null);
  assert.equal(imageSize(new Uint8Array(0)), null);
});
