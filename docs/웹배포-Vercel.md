# 🚀 웹 배포 (Vercel) — 무료

준비 완료 상태예요. 빌드는 검증됐고(`expo export` → 35개 라우트 OK), `vercel.json`도 있어요.

## 1) GitHub에 코드 올리기 (무료)
```bash
# workmate 폴더에서
git add -A
git commit -m "deploy ready"
# GitHub에 새 비공개 저장소 만들고 (github.com/new)
git remote add origin https://github.com/<내아이디>/wavely.git
git push -u origin main
```
> `.env`는 `.gitignore`에 있어 안 올라가요(정상). 키는 아래 4)에서 Vercel에 따로 넣어요.

## 2) Vercel 가입 + 프로젝트 연결 (무료)
1. https://vercel.com → **GitHub로 가입**
2. **Add New → Project** → 방금 올린 `wavely` 저장소 선택
3. 설정은 `vercel.json`이 자동 적용 (빌드: `npx expo export --platform web`, 출력: `dist`)

## 3) Root Directory
- 저장소를 **workmate 폴더에서 직접** 올렸으므로 repo 루트가 곧 프로젝트 루트예요 → **Root Directory는 기본값(`./`) 그대로** 두면 돼요. (vercel.json이 루트에 있어 자동 인식)

## 4) 환경변수 등록 (중요!)
Vercel → Project → **Settings → Environment Variables** 에 `.env`의 값들을 그대로 추가:
```
EXPO_PUBLIC_SUPABASE_URL
EXPO_PUBLIC_SUPABASE_ANON_KEY
EXPO_PUBLIC_PORTONE_STORE_ID
EXPO_PUBLIC_PORTONE_CHANNEL_KEY
EXPO_PUBLIC_NAVER_MAP_CLIENT_ID
EXPO_PUBLIC_NAVER_LOGIN_CLIENT_ID
```
> 이 값들은 공개돼도 안전한 키예요(anon·public). 비밀키(service_role 등)는 절대 넣지 않아요 — 서버(Supabase)에만 있어요.

## 5) 배포
- **Deploy** 클릭 → 1~2분 후 `https://wavely-xxx.vercel.app` 주소 발급 → 누구나 접속! 🎉
- 이후 `git push` 할 때마다 자동 재배포돼요.

## 도메인 (유료 — 나중에 한 번에)
- `wavely.kr` 같은 주소 구매 후 Vercel에 연결하면 HTTPS까지 자동. (체크리스트: `유료셋업-체크리스트.md`)

## 배포 후 확인
- 비로그인으로 접속해 **글 목록·미리보기**가 보이는지 (✅ 절충안 적용됨)
- 글 클릭 → 로그인 게이트
- 로그인/가입 → 전체 글·댓글·작성

## 🔒 배포 보안 (해킹·접근 문제 방지) — 꼭!

배포로 새로 생기는 공격면을 막는 단계예요. 일부는 **배포 주소가 나온 뒤** 설정해요.

### 이미 적용된 것 (코드/서버)
- ✅ **보안 HTTP 헤더** (`vercel.json`): HTTPS 강제(HSTS), 클릭재킹 차단(X-Frame-Options), MIME 스니핑 차단, 리퍼러 최소화, 권한정책
- ✅ **빌드에 비밀키 없음** (anon 키만 — 공개 안전). service_role·API Secret은 서버(Supabase)에만
- ✅ **RLS·권한 하드닝** 완료 (self-admin·공짜광고·클릭조작·본문무단열람 차단)
- ✅ **이메일 인증 필수**, 닉네임 유니크

### 배포 주소 나오면 (중요!)
1. **Supabase 인증 리다이렉트 잠그기** — 이메일 인증 링크가 실사용자에게 작동하고, 토큰 탈취(오픈 리다이렉트)를 막아요.
   - Supabase 대시보드 → Authentication → **URL Configuration**
   - **Site URL**: `https://<배포주소>` 로 변경
   - **Redirect URLs**에 `https://<배포주소>/**` 추가 (localhost는 개발용으로 둬도 됨)
   - 👉 배포 주소만 알려주면 **내가 API로 바로 설정**해줄게요.
2. **네이버 로그인/지도 도메인 등록** — NCP 콘솔에서 배포 주소를 **서비스 URL·Callback·지도 Referer**에 추가. (등록 안 하면 동작 안 하고, 키 도용도 막혀요)
3. **(권장) 봇 가입 차단 CAPTCHA** — Supabase Auth에 Cloudflare Turnstile(무료) 연결하면 자동가입 봇을 막아요. Turnstile 키만 발급하면 내가 붙여줄게요.

### 운영 중 주의
- `.env`·service_role 키는 **절대 git/프론트에 넣지 않기** (이미 분리됨)
- 의심 트래픽 시 Supabase → Auth 로그, Vercel → Analytics 확인
- 비밀번호 유출 차단(HIBP)은 Supabase **Pro** 전환 시 켜기 (유료 체크리스트)

## ⚠️ 네이버 로그인/지도 도메인 등록
- 배포 주소(`*.vercel.app` 또는 도메인)를 **NCP 콘솔의 서비스 URL/Callback/지도 Referer**에 추가해야 네이버 로그인·지도가 동작하고, 다른 도메인의 키 도용도 막혀요.
