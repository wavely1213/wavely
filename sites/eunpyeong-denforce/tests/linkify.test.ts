// 본문 주소 링크 단위 테스트 — 실행: npm test
import assert from "node:assert/strict";
import { test } from "node:test";
import { linkify, ownSiteLink } from "../src/lib/linkify.ts";

const links = (s: string) => linkify(s).filter((p) => p.type === "link");

test("linkify: 도메인/경로를 https 링크로, 뒤 괄호/문장부호는 뺀다", () => {
  const parts = linkify("구매: denforce.co.kr/proshop (덴포스 홈페이지 상단 메뉴 '서울은평덴포스')");
  assert.deepEqual(parts[0], { type: "text", value: "구매: " });
  assert.deepEqual(parts[1], { type: "link", value: "denforce.co.kr/proshop", href: "https://denforce.co.kr/proshop" });
  assert.equal(parts[2].value, " (덴포스 홈페이지 상단 메뉴 '서울은평덴포스')");
  assert.deepEqual(links("자세한 내용은 https://example.com/a?b=1."), [
    { type: "link", value: "https://example.com/a?b=1", href: "https://example.com/a?b=1" },
  ]);
  assert.deepEqual(links("(www.futsal.or.kr)"), [{ type: "link", value: "www.futsal.or.kr", href: "https://www.futsal.or.kr" }]);
});

test("linkify: 이메일/인스타그램 핸들/일반 문장은 링크로 만들지 않는다", () => {
  assert.equal(links("문의 futbol10@naver.com").length, 0);
  assert.equal(links("스폰서: 덴포스 스포츠(@denforce_sports), 피크폼(@peakform.tr)").length, 0);
  assert.equal(links("2025-26 시즌 각 35,000원. 결제 후 취소 불가.").length, 0);
});

test("linkify: 링크가 없으면 원문 그대로 한 조각", () => {
  assert.deepEqual(linkify("안녕하세요"), [{ type: "text", value: "안녕하세요" }]);
  assert.deepEqual(linkify(""), []);
});

const SITE_URL = "https://eunpyeong-fs.com";
const own = (text: string) => {
  const link = links(text)[0];
  assert.ok(link && link.type === "link", `링크가 있어야 한다: ${text}`);
  return ownSiteLink(link.href, link.value, SITE_URL);
};

test("ownSiteLink: 우리 홈페이지 선수 주소는 같은 창 경로 + '선수 소개 보기' (www/https 유무 상관없이)", () => {
  const expected = { path: "/team/players/kang-minwon", label: "선수 소개 보기" };
  assert.deepEqual(own("선수 소개: https://eunpyeong-fs.com/team/players/kang-minwon"), expected);
  assert.deepEqual(own("선수 소개: eunpyeong-fs.com/team/players/kang-minwon"), expected);
  assert.deepEqual(own("선수 소개: www.eunpyeong-fs.com/team/players/kang-minwon/"), expected, "끝 / 는 뗀다");
  assert.deepEqual(own("http://WWW.EUNPYEONG-FS.COM/team/players/no-7"), { path: "/team/players/no-7", label: "선수 소개 보기" });
});

test("ownSiteLink: 구단소식은 '소식 보기', 그 밖은 도메인을 뺀 경로, 첫 화면 주소는 원래 글자", () => {
  assert.deepEqual(own("https://eunpyeong-fs.com/news/news/3307136d"), { path: "/news/news/3307136d", label: "소식 보기" });
  assert.deepEqual(own("eunpyeong-fs.com/news"), { path: "/news", label: "소식 보기" });
  assert.deepEqual(own("https://eunpyeong-fs.com/club/location"), { path: "/club/location", label: "/club/location" });
  assert.deepEqual(own("https://eunpyeong-fs.com/team/players"), { path: "/team/players", label: "/team/players" }, "선수 목록은 선수 소개가 아니다");
  assert.deepEqual(own("https://eunpyeong-fs.com/club/emblem#uniform"), { path: "/club/emblem#uniform", label: "/club/emblem#uniform" });
  assert.deepEqual(own("홈페이지 eunpyeong-fs.com 에서"), { path: "/", label: "eunpyeong-fs.com" });
});

test("ownSiteLink: 바깥 주소/비슷한 다른 도메인은 null (새 창 링크 그대로)", () => {
  assert.equal(own("사진: denforce.co.kr"), null);
  assert.equal(own("https://eunpyeong-fs.com.example.com/team/players/no-7"), null, "뒤에 다른 도메인이 붙은 주소");
  assert.equal(own("https://admin.eunpyeong-fs.com/news"), null, "www 가 아닌 하위 도메인");
  assert.equal(own("https://my-eunpyeong-fs.com/news"), null);
  assert.equal(ownSiteLink("not a url", "not a url", SITE_URL), null);
});
