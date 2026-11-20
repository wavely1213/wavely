import Link from "next/link";
import type { ComponentProps } from "react";
import styles from "./Button.module.css";

/** 버튼 모양 (리디자인 D-067) — 놓인 면에 맞춰 고른다 (Button.module.css) */
export type ButtonVariant = "primary" | "secondary" | "onBlue" | "onBlueOutline" | "onDarkOutline";

/** 버튼 모양의 class — <a>, <button>, next/link 어디에나 붙인다 */
export function buttonClass(variant: ButtonVariant = "primary", extra?: string): string {
  return [styles.button, styles[variant], extra].filter(Boolean).join(" ");
}

/** 페이지 이동 버튼 (next/link) */
export function ButtonLink({ variant, className, ...props }: ComponentProps<typeof Link> & { variant?: ButtonVariant }) {
  return <Link {...props} className={buttonClass(variant, className)} />;
}
