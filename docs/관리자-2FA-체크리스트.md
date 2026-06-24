# 관리자 계정 2FA 체크리스트 (와벨리)

관리자(개발자) 계정 1개가 모든 권한을 쥠 → 이 계정 체인이 뚫리면 끝.
**제가 대신 못 켭니다**(비번·인증 입력 필요). 아래 순서대로 직접 진행. 5~15분.

> 원칙
> - **인증앱(Authenticator) 우선**, SMS는 차선(유심스왑 위험). 앱: Google Authenticator / Authy / 1Password 등.
> - 각 서비스에서 주는 **백업/복구 코드는 반드시 저장**(인쇄 or 비번관리자). ❌ 절대 이 프로젝트 폴더/깃에 저장 금지.
> - 휴대폰 분실 대비 복구코드가 생명줄.

---

## 0. 우선순위 (위험 큰 순)
1. 🔴 **구글** (mulgyeoli2@gmail.com) — 다른 서비스 SSO 루트일 가능성 大. 제일 먼저.
2. 🔴 **GitHub** (wavely1213) — 소스코드
3. 🔴 **Supabase** — DB 전권
4. 🟠 **Vercel** (wavely1213) — 배포/호스팅
5. 🟡 **PortOne** — 결제 (라이브 전환 시점에)

---

## 1. 구글 계정 🔴
1. https://myaccount.google.com/security 접속
2. **2단계 인증(2-Step Verification)** → 사용 설정
3. **인증 앱(Authenticator)** 등록 (SMS만 말고 앱 추가 권장)
4. **백업 코드** 다운로드/저장
- 효과: 구글로 로그인하는 모든 서비스가 한 번에 보호됨.

## 2. GitHub 🔴
1. https://github.com/settings/security
2. **Two-factor authentication** → Enable
3. **Authenticator app** 방식 선택 + **recovery codes 저장**
4. (권장) Settings → 비번을 고유·강력하게
- 참고: GitHub는 코드 호스팅이라 2FA 필수급.

## 3. Supabase 🔴
1. https://supabase.com/dashboard/account/security 접속 (로그인 → 우상단 Account → Security)
2. **Multi-Factor Authentication (MFA)** → Add factor → **Authenticator app**
3. 백업 코드 저장
- 효과: 대시보드/DB 설정 변경 보호.
- ➕ **Management API 토큰**(개발용 `sbp_...`)은 출시 후 Account → Access Tokens에서 **폐기/재발급** 권장.

## 4. Vercel 🟠
1. https://vercel.com/account 접속 → **Settings → Security (Authentication)**
2. **Two-Factor Authentication** 활성화 (Authenticator app)
3. 복구 코드 저장
- 구글 SSO로 가입했어도, Vercel 자체 2FA가 별도로 있으면 켜두기(방어 중첩).

## 5. PortOne 🟡 (결제 라이브 전환 시)
1. https://admin.portone.io 로그인 → 계정/보안 설정
2. 2단계 인증 있으면 활성화
3. 정산 계좌·API secret 접근은 이 계정에 묶이므로 라이브 전 필수.

---

## 끝나고 확인
- [ ] 5개 서비스 각각 로그아웃 후 재로그인 → 2FA 코드 요구되는지 확인
- [ ] 백업/복구 코드 5세트 안전한 곳에 보관 (폴더/깃 ❌)
- [ ] (선택) 휴대폰 외 보조 기기/방법 1개 더 등록

이거 끝나면 "관리자 계정 탈취" 위험(전체의 절반 이상)이 거의 사라짐 → 종합 위험 10% 이하.
