# PortOne 결제 연동 — 사장님 셋업 가이드 (키만 넣으면 켜짐)

코드는 **다 됐습니다.** 아래 환경변수 4개만 넣고 엣지함수 배포하면 카드 결제가 켜집니다.
키가 없는 동안은 자동으로 **무통장 입금**으로 폴백되므로 지금도 정상 작동합니다.

---

## 1. PortOne 가입 + PG 계약 (리드타임 있음, 먼저 시작)
1. https://portone.io 가입 → 사업자 인증
2. PortOne 콘솔에서 **PG사 계약/심사** 신청 (KG이니시스 / 나이스페이 / 토스페이먼츠 등). 사업자등록증 필요, **심사 2~5영업일**
3. 정산 계좌 등록 (지금 코드의 무통장 placeholder `3333-01-1234567` 도 실계좌로 교체 필요 — main.jsx 검색)
4. **채널** 생성(카드) 후 아래 값 확보:
   - **Store ID** (상점 아이디, `store-xxxx`)
   - **Channel Key** (채널 키, 공개값)
   - **V2 API Secret** (서버 시크릿 — 절대 클라이언트/깃 노출 금지)

## 2. 환경변수 입력

### 관리자웹 (Vercel · wavely-admin 프로젝트 → Settings → Environment Variables)
| 이름 | 값 | 공개여부 |
|---|---|---|
| `VITE_PORTONE_STORE_ID` | store-xxxx | 공개(클라) |
| `VITE_PORTONE_CHANNEL_KEY` | channel-key-xxxx | 공개(클라) |

→ 입력 후 관리자웹 재배포 (`bash scripts/ship.sh prod admin`)

### 엣지함수 시크릿 (Supabase → Edge Functions → Secrets, 또는 `supabase secrets set`)
| 이름 | 값 |
|---|---|
| `PORTONE_API_SECRET` | V2 API Secret (서버 전용) |
| `PORTONE_STORE_ID` | store-xxxx |

## 3. 엣지함수 배포
```
supabase functions deploy charge-balance
supabase functions deploy register-billing-key
supabase functions deploy verify-payment
```
(이미 배포돼 있으면 재배포 불필요. 시크릿만 넣으면 됨.)

---

## 동작 흐름 (구현 완료)
- **광고비 충전(정산·충전 탭):** 금액 선택 → 카드 결제. 등록 카드 없으면 카드 등록창(빌링키) 자동 → 등록 후 결제 → `charge-balance`가 PortOne API로 실제 결제 + 잔액 적립 + 원장 기록.
- **위변조 방지:** 결제 검증·리플레이 가드는 서버(엣지함수)에서. 클라이언트 금액 조작 불가.
- **폴백:** `VITE_PORTONE_*` 없으면 무통장 입금 안내로 자동 전환.

## 남은 것 (다음 단계)
- 무통장 placeholder 계좌 → 실계좌 (main.jsx `3333-01-1234567`, ProUpgrade 모달도)
- Pro 월 구독 정기결제(빌링키 자동청구) — 지금은 월 단건. `register-billing-key`로 카드 저장돼 있어 확장 쉬움
- 앱(RN) 네이티브 결제(현 스텁)
