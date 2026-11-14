import { NotFoundBody } from "@/components/layout/NotFoundBody";

// 없는 구단소식 글 — [구단소식 목록] [메인으로] (리디자인 3차 158:19896, 총괄 승인 [변경])
export default function NewsPostNotFound() {
  return <NotFoundBody back={{ href: "/news", label: "구단소식 목록" }} />;
}
