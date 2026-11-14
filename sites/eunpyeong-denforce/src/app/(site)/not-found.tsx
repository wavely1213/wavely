import { NotFoundBody } from "@/components/layout/NotFoundBody";

// 사이트 페이지 안에서 notFound() 가 불리면(없는 선수·없는 글 등) 이 파일이 (site) 레이아웃 안에 그려진다.
// 레이아웃이 이미 상단 띠·헤더·푸터·<main> 을 붙이므로 본문만 — 루트 not-found 를 쓰면 헤더가 두 번 보였다
export default function SiteNotFound() {
  return <NotFoundBody />;
}
