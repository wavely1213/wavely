// 링크 미리보기(카카오톡·문자·SNS) — 이미지 고르기(관리자가 올린 이미지 → 기본 이미지)와 openGraph·twitter 메타 만들기
// (D-025·D-037·D-038). 순수 함수 (테스트: og.test.ts)
import type { Metadata } from "next";

export type PreviewKind = "site" | "admin";

export type PreviewImage = { url: string; alt: string; width?: number; height?: number };

/**
 * 기본 이미지 버전 — public/og/*.jpg 를 바꾸면 올린다.
 * 카카오톡은 미리보기 이미지를 이미지 주소 기준으로 오래 저장해 두므로, 주소가 바뀌어야 새 이미지를 쓴다.
 * (관리자가 올린 이미지는 올릴 때마다 새 파일 이름이라 따로 필요 없다)
 */
export const DEFAULT_PREVIEW_VERSION = "20261017";

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

export type PreviewMetaInput = {
  siteName: string;
  image: PreviewImage;
  /** 비우면 넣지 않는다 — Next 가 페이지 제목·설명으로 채운다 */
  title?: string | null;
  description?: string | null;
  type?: "website" | "article";
  /** 글 날짜 (YYYY-MM-DD 만, 그 밖은 무시) */
  publishedTime?: string | null;
};

/**
 * openGraph·twitter 메타. 페이지가 openGraph 를 정하면 상위 layout 값을 통째로 덮으므로
 * 공통 항목(사이트 이름·언어·이미지)을 늘 같이 넣는다.
 */
export function previewMeta(o: PreviewMetaInput): Pick<Metadata, "openGraph" | "twitter"> {
  const title = o.title?.trim() || undefined;
  const description = o.description?.trim() || undefined;
  const text = { ...(title ? { title } : {}), ...(description ? { description } : {}) };
  const common = { siteName: o.siteName, locale: "ko_KR", ...text, images: [o.image] };
  const day = o.publishedTime && /^\d{4}-\d{2}-\d{2}$/.test(o.publishedTime) ? o.publishedTime : undefined;
  return {
    openGraph:
      o.type === "article"
        ? { type: "article", ...common, ...(day ? { publishedTime: day } : {}) }
        : { type: "website", ...common },
    twitter: { card: "summary_large_image", ...text, images: [o.image] },
  };
}

/** 구단소식 글의 미리보기 사진 — 대표 사진, 없으면 상세 첫 사진, 그것도 없으면 null(사이트 이미지) */
export function articleImage(post: { thumbnail: string | null; images: readonly string[] }): string | null {
  return post.thumbnail || post.images[0] || null;
}
