import type { Metadata } from "next";
import Link from "next/link";
import styles from "@/components/admin/admin.module.css";
import { SITE } from "@/config/site";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "로그인" };

export default function LoginPage() {
  return (
    <div className={styles.loginWrap}>
      <div className={styles.loginBox}>
        <h1>관리자 로그인</h1>
        <p className={styles.pageDesc}>{SITE.name} 홈페이지 관리</p>
        {isSupabaseConfigured() ? (
          <LoginForm />
        ) : (
          <p className={styles.formMessage} style={{ marginTop: 24 }}>
            Supabase 가 아직 연결되지 않았습니다. docs/SUPABASE_SETUP.md 의 순서대로 설정한 뒤 다시 배포해 주세요.
          </p>
        )}
        <p className={styles.pageDesc} style={{ marginTop: 20 }}>
          <Link href="/">← 홈페이지로</Link>
        </p>
      </div>
    </div>
  );
}
