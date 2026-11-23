"use client";

import { AdminForm } from "@/components/admin/AdminForm";
import { TextField } from "@/components/admin/fields";
import { signIn } from "../actions";

export function LoginForm() {
  return (
    <AdminForm action={signIn} submitLabel="로그인">
      <TextField name="email" label="이메일" type="email" required />
      <TextField name="password" label="비밀번호" type="password" required />
    </AdminForm>
  );
}
