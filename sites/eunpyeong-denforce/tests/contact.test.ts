// 연락처 링크 도우미 단위 테스트 — 실행: npm test
import assert from "node:assert/strict";
import { test } from "node:test";
import { CONTACT_TOPICS, SPONSOR_TOPIC, mailDraftHref, snsHandle, telHref, topicSubject } from "../src/lib/contact.ts";

test("telHref: 띄어쓰기/하이픈을 빼고 숫자만, 맨 앞 '+' 는 남긴다", () => {
  assert.equal(telHref("010-5135-0309"), "tel:01051350309");
  assert.equal(telHref(" 02 6368 2308 "), "tel:0263682308");
  assert.equal(telHref("+82-10-5135-0309"), "tel:+821051350309");
  assert.equal(telHref("1588-1234"), "tel:15881234");
  assert.equal(telHref("(02) 123.4567"), "tel:021234567");
});

test("telHref: 번호가 아닌 글이 섞이거나 자리 수가 맞지 않으면 null (글자만 보인다)", () => {
  assert.equal(telHref("02-123-4567 (내선 2)"), null);
  assert.equal(telHref("010-1234-5678 / 02-123-4567"), null);
  assert.equal(telHref("준비 중"), null);
  assert.equal(telHref(""), null);
  assert.equal(telHref("12"), null);
  assert.equal(telHref("1234567890123456"), null);
  assert.equal(telHref("010+1234"), null);
});

test("mailDraftHref: 제목을 주소 글자로 바꿔 채운다", () => {
  const href = mailDraftHref("jonghbae@naver.com", topicSubject("스폰서십/제휴"));
  assert.equal(href, `mailto:jonghbae@naver.com?subject=${encodeURIComponent("[스폰서십/제휴]")}`);
  assert.equal(href, "mailto:jonghbae@naver.com?subject=%5B%EC%8A%A4%ED%8F%B0%EC%84%9C%EC%8B%AD%2F%EC%A0%9C%ED%9C%B4%5D");
  assert.equal(new URL(href).searchParams.get("subject"), "[스폰서십/제휴]");
  // 띄어쓰기, & 같은 글자도 제목 안에 그대로 남는다
  assert.equal(new URL(mailDraftHref(" a@b.kr ", "[언론 & 취재]")).searchParams.get("subject"), "[언론 & 취재]");
});

test("문의 분야: 입단/테스트는 받지 않는다 (BR-026), 스폰서 문의 분야는 목록 안에", () => {
  assert.deepEqual(CONTACT_TOPICS, ["스폰서십/제휴", "아카데미/유소년", "언론/취재", "기타"]);
  assert.ok(CONTACT_TOPICS.includes(SPONSOR_TOPIC));
  assert.ok(CONTACT_TOPICS.every((t) => !/입단|테스트/.test(t)));
  assert.ok(CONTACT_TOPICS.every((t) => !t.includes("·"))); // 중간점 없음 (BR-024)
});

test("snsHandle: 인스타그램 프로필 주소 → '@계정'", () => {
  assert.equal(snsHandle("https://www.instagram.com/eunpyeong_denforce"), "@eunpyeong_denforce");
  assert.equal(snsHandle("https://instagram.com/eunpyeong_denforce/"), "@eunpyeong_denforce");
  assert.equal(snsHandle("https://m.instagram.com/eunpyeong_denforce?hl=ko"), "@eunpyeong_denforce");
  assert.equal(snsHandle("http://www.instagram.com/club.name_1"), "@club.name_1");
});

test("snsHandle: '@'로 시작하는 주소(유튜브 등)는 그 이름 그대로", () => {
  assert.equal(snsHandle("https://www.youtube.com/@kkongbyungji"), "@kkongbyungji");
  assert.equal(snsHandle("https://youtube.com/@ZD-Sports.Studio/"), "@ZD-Sports.Studio");
});

test("snsHandle: 계정 하나를 가리키지 않는 주소/잘못된 주소는 null (주소를 그대로 보인다)", () => {
  assert.equal(snsHandle("https://www.youtube.com/channel/UCRYziLOw2T6BF6fXtpUby-g"), null);
  assert.equal(snsHandle("https://www.instagram.com/p/DPabc123/"), null);
  assert.equal(snsHandle("https://www.instagram.com/"), null);
  assert.equal(snsHandle("https://www.youtube.com/watch?v=abc"), null);
  assert.equal(snsHandle("https://example.com/eunpyeong_denforce"), null);
  assert.equal(snsHandle("instagram.com/eunpyeong_denforce"), null);
  assert.equal(snsHandle(""), null);
});
