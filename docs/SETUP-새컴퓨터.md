# 새 컴퓨터에서 와벨리 개발 시작하기

프로젝트는 2개. 둘 다 **같은 Supabase(클라우드)**에 붙으므로 데이터는 자동 공유됩니다.
- **앱** `workmate` (Expo/React Native) — GitHub: `wavely1213/wavely`
- **수집기** `place_collector` (Python, 네이버 크롤+분석) — GitHub: 비공개 레포(직접 생성)

---

## 1. 앱 (workmate)
```bash
git clone https://github.com/wavely1213/wavely.git
cd wavely
npm install
cp .env.example .env        # 그리고 .env 에 실제 공개키 채우기(아래)
npx expo start              # 웹: w / 안드: a
```
`.env` 값(공개키만): `.env.example` 참고. 실제 값은 기존 PC의 `.env`에서 복사하거나 각 콘솔에서:
- Supabase: Dashboard > Project Settings > API
- 네이버/PortOne: 각 개발자 콘솔의 공개 client/store/channel id

> ⚠️ `.env`는 git에 안 올라갑니다(.gitignore). 새 PC마다 직접 채워야 함.

## 2. 수집기 (place_collector)
```bash
git clone https://github.com/wavely1213/<수집기-레포>.git
cd <수집기-레포>
pip install -r requirements.txt
playwright install            # 크롬 브라우저 바이너리
# 시크릿 3개 파일을 기존 PC에서 안전하게 복사(USB/암호화) — git엔 없음:
#   secret_supabase.txt   (Supabase service_role)
#   searchad_secret.txt   (네이버 검색광고 API 키)
#   secret_key.txt
```
실행:
- 온디맨드 워커: `run_worker.bat` (무한루프 자동재생성) 또는 작업 스케줄러 등록
- API 서버(선택): `uvicorn api_server:app --port 8000` → `/api/n-index`, `/api/rank`, `/api/keyword-bulk`

> ⚠️ **크롤러 워커는 "집 PC(한국 가정 IP)"에서만** 안정적으로 돕니다. 네이버 크롤은 IP에 민감 — 회사망/클라우드/해외 IP는 차단 위험. **다른 컴퓨터는 코드 편집·앱 개발용**, 실제 수집 워커는 집 PC 유지.

---

## 3. 서버측 "비밀" (Edge Function 환경변수)
앱 `.env`에 두면 안 되는 비밀은 **Supabase Dashboard > Edge Functions > Secrets**에 설정:
- `SUPABASE_SERVICE_ROLE_KEY`
- `PORTONE_API_SECRET` (PortOne 결제 검증용)
- (네이버 인증/검색 함수가 쓰는 키들)

## 4. DB 마이그레이션 (supabase/*.sql)
SQL Editor 또는 Management API로 순서대로 적용. 최신 추가:
- `15_place_paywall.sql` — 플레이스 분석 요금제(무료 7일1회 / 월구독 basic / 프리미엄 premium) + `grant_place_pass()`

## 5. Edge Function 배포
```bash
supabase functions deploy verify-place-pass   # 결제검증→이용권 지급
# 배포 후 Secrets에 PORTONE_API_SECRET 있는지 확인
```

## 6. 결제 흐름(요약)
앱 결제 버튼 → PortOne(`requestAdPayment`) → `verify-place-pass`(서버에서 PAID·금액 대조) → `grant_place_pass(user, plan, 30)` → `place_pass_until`/`place_plan` 설정 → 앱 즉시 반영(`refreshProfile`).

## 워크플로
한 PC에서 `commit → push`, 다른 PC에서 `pull`. 같은 파일 동시 수정만 피하면 됨.
