import assert from "node:assert/strict";
import { test } from "node:test";
import { homeReels } from "../src/lib/reels.ts";

// 홈 INSTAGRAM 릴스 줄 (D-095)

const P = (id: string, over: Record<string, unknown> = {}) => ({
  id,
  category: "video" as const,
  title: `릴스 ${id}`,
  thumbnail: `https://x/${id}.jpg`,
  videoUrl: `https://www.instagram.com/reel/${id}abcde/`,
  ...over,
});

test("구단영상 중 인스타 릴스 + 표지 있는 것만, 순서 그대로 최대 6개, 원본 주소", () => {
  const list = homeReels([
    P("a1"),
    P("n1", { category: "news" }),
    P("y1", { videoUrl: "https://www.youtube.com/watch?v=AAAAAAAAAAA" }),
    P("t1", { thumbnail: null }),
    P("a2"),
    P("a3"),
    P("a4"),
    P("a5"),
    P("a6"),
    P("a7"),
  ] as never);
  assert.deepEqual(list.map((r) => r.id), ["a1", "a2", "a3", "a4", "a5", "a6"]);
  assert.equal(list[0].href, "https://www.instagram.com/p/a1abcde/");
});
