import NextLink from "next/link";
import type { ComponentProps } from "react";

/**
 * 관리자 화면 전용 링크 — 미리 불러오기(prefetch) 끔.
 * 로그인이 필요한 동적 관리자 페이지를 prefetch 하면 응답이 끝나지 않고 열린 채로 남아
 * 브라우저 연결(호스트당 6개)을 다 쓰고 다음 이동이 멈춘다 (KNOWN_ISSUES I-012).
 */
export default function AdminLink(props: ComponentProps<typeof NextLink>) {
  return <NextLink prefetch={false} {...props} />;
}
