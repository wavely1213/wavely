// 링크 미리보기(카카오톡·문자·SNS) 이미지 고르기 — 관리자가 올린 이미지가 있으면 그것, 없으면 기본 이미지 (D-025·D-037)
// 순수 함수 (테스트: og.test.ts)

export type PreviewKind = "site" | "admin";

export type PreviewImage = { url: string; alt: string; width?: number; height?: number };

/**
 * 기본 이미지 버전 — public/og/*.jpg 를 바꾸면 올린다.
 * 카카오톡은 미리보기 이미지를 이미지 주소 기준으로 오래 저장해 두므로, 주소가 바뀌어야 새 이미지를 쓴다.
 * (관리자가 올린 이미지는 올릴 때마다 새 파일 이름이라 따로 필요 없다)
 */
export const DEFAULT_PREVIEW_VERSION = "20261016";

/** 기본 이미지 — 사이트: 홈 히어로 구성(D-025·D-036), 관리자: 엠블럼 + '관리자'(사이트와 구분) */
export const DEFAULT_PREVIEW: Record<PreviewKind, Required<PreviewImage>> = {
  site: {
    url: `/og/site.jpg?v=${DEFAULT_PREVIEW_VERSION}`,
    alt: "대한민국 풋살의 중심, 서울은평 덴포스 — 2018-19 FK 드림리그 우승 단체 사진",
    width: 1200,
    height: 630,
  },
  admin: {
    url: `/og/admin.jpg?v=${DEFAULT_PREVIEW_VERSION}`,
    alt: "서울은평 덴포스 관리자",
    width: 1200,
    height: 630,
  },
};

/**
 * 미리보기 이미지. customUrl(관리자가 올린 이미지)이 있으면 그것 — 크기는 모르므로 넣지 않는다.
 * siteName 은 올린 이미지의 대체 텍스트에 쓴다 (예: '서울은평 덴포스', '서울은평 덴포스 관리자').
 */
export function previewImage(kind: PreviewKind, customUrl: string | null | undefined, siteName: string): PreviewImage {
  const url = customUrl?.trim();
  if (!url) return DEFAULT_PREVIEW[kind];
  return { url, alt: kind === "admin" ? `${siteName} 관리자` : siteName };
}
