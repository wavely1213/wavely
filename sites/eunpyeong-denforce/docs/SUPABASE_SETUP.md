# SUPABASE_SETUP.md — 관리자 기능 켜기 (처음 1회)

> 관리자 대시보드(`/admin`)는 Supabase(DB·로그인·이미지 저장소)가 연결돼야 동작한다.
> 연결 전에는 홈페이지가 `src/data` 의 자리표시 데이터로 그대로 보이고, `/admin/login` 은 "연결되지 않음" 안내만 보인다.
> 아래 순서대로 한 번만 하면 된다. 비밀값(키)은 문서·코드·채팅에 붙여넣지 말고 Vercel 환경변수에만 넣는다.

## 1. 프로젝트 만들기
1. https://supabase.com 로그인 → **New project**
2. 이름 예: `eunpyeong-denforce`, 지역 **Northeast Asia (Seoul)**, DB 비밀번호는 비밀번호 관리자에 저장
3. 무료(Free) 플랜으로 충분 (DB 500MB · 저장소 1GB)

## 2. 테이블·권한 만들기 (SQL 순서대로 실행)
대시보드 왼쪽 **SQL Editor** → New query 에 아래 파일 내용을 **순서대로** 붙여넣고 Run.
1. `supabase/migrations/20261015000000_init.sql` — 테이블, 접근 권한(RLS), 이미지 버킷 `media`
2. `supabase/migrations/20261015120000_news_images.sql` — 구단소식 상세 사진 여러 장 칸 (D-017)
3. `supabase/migrations/20261016000000_standings_season.sql` — 리그순위 시즌 칸 (D-020)
4. `supabase/migrations/20261016120000_postings.sql` — 포스팅(바깥 글 모음) 테이블 (D-022)
   - `20261016130000_news_images_max20.sql` — 구단소식 사진 상한 20장 (D-031)
   - `20261016140000_postings_league.sql` — 포스팅 분류 'FK리그' (D-032)
   - `20261016150000_news_video_featured.sql` — 구단소식 영상 주소·메인 배너 고정 칸 (D-035)
   - `20261016160000_club_og_images.sql` — 링크 미리보기 이미지 칸 (사이트용·관리자용, D-037)
   - `20261016170000_club_og_text.sql` — 링크 미리보기 제목·설명 칸 (D-038)
   - `20261016180000_national_team_alumni.sql` — 배출 풋살 국가대표 표 (D-043, 지금 11명 포함)
   - `20261016190000_site_content.sql` — 홈페이지 내용(총괄 관리자) 표 site_content·content_items (D-046, 메인 바로가기 5개 포함)
5. `supabase/seed.sql` — 지금 홈페이지와 같은 초기 데이터 (선수·경기는 자리표시이므로 나중에 관리자 화면에서 교체)

6. (실데이터) `supabase/data/2025-26_kfl.sql` — 한국풋살연맹 자료 + 26-27 선수단 변동으로 선수·스태프·경기·순위·연혁·연락처를 교체 (D-010)
7. (실데이터) `supabase/data/2026-27_club_news.sql` — 구단 인스타그램 공지를 옮긴 구단소식 5건 (추가만 하므로 1번만 실행)
8. (실데이터) `supabase/data/2026-27_denforce_news.sql` — 덴포스 공식 홈페이지 자료를 옮긴 구단소식 2건 (D-018, 추가만 하므로 1번만 실행 · 사진은 관리자 화면에서)
9. (실데이터) `supabase/data/2026-27_fk1_standings.sql` — 2026-27 FK1 참가 6팀 0점 순위 (D-020·D-030, 이 시즌 행만 지우고 다시 넣음)
10. (실데이터) `supabase/data/2026-10_postings.sql` — 2026-10-16 수집한 포스팅 (D-022, 같은 원문 주소는 건너뜀 · 대표 사진은 운영 프로젝트 Storage 주소 · 끝에서 연맹 유튜브를 FK리그로 — D-032)

> 6·7·8 은 관리자 화면에서 고친 내용을 덮어쓰거나 중복을 만들므로 새 프로젝트에서 처음 1번만 실행한다.

> CLI 를 쓴다면: `npx supabase link --project-ref <ref>` 후 `npx supabase db push`, seed 는 SQL Editor 로.

## 3. 로그인 설정
**Authentication → Sign In / Providers**
- **Email** 켜기, **Allow new users to sign up** 은 **끄기** (관리자 계정은 직접 만든다)
- **Confirm email** 켜기 (기본값)

**Authentication → URL Configuration**
- Site URL: 실제 홈페이지 주소 (예: `https://<도메인>`)

## 4. 관리자 계정 만들기
1. **Authentication → Users → Add user → Create new user**
   - 이메일·비밀번호 입력, **Auto Confirm User** 체크
2. **SQL Editor** 에서 허용 목록에 추가 (이메일은 소문자로):
   ```sql
   insert into public.admins (email) values ('관리자이메일@example.com');
   ```
3. 관리자를 빼려면: `delete from public.admins where email = '...';`

> 권한 판단은 `public.is_admin()` 한 곳: 로그인 + 이메일 인증 완료 + `admins` 목록에 있음. 셋 중 하나라도 아니면 읽기만 가능하다.

## 5. 홈페이지에 연결 (Vercel 환경변수)
**Project Settings → API Keys** 에서 두 값을 복사한다.

| 변수 | 값 | 비고 |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://<ref>.supabase.co` | Project Settings → Data API 의 URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | `sb_publishable_...` | **Publishable key** (공개용). `service_role`/secret 키는 절대 넣지 않는다 |

Vercel → 이 사이트 프로젝트 → Settings → Environment Variables 에 Production·Preview 모두 추가 → **Redeploy**.
(`NEXT_PUBLIC_` 값은 빌드 때 고정되므로 값을 바꾸면 반드시 다시 배포)

로컬 개발: 프로젝트 폴더에 `.env.local` 을 만들고 같은 두 줄을 넣는다 (`.env*` 는 git 에 올라가지 않음).

## 6. 확인
1. `https://<도메인>/admin/login` 에서 4번 계정으로 로그인 → 대시보드가 보이면 성공
2. 스폰서 하나를 추가하고 홈페이지 `/sponsors` 에 바로 보이는지 확인 → 삭제

## 운영 메모
- 저장 즉시 홈페이지에 반영된다. 서버가 여러 대로 나뉘어 있어도 늦어도 1분 안에 반영 (캐시 수명 `minutes`).
- 이미지는 5MB 이하 JPG·PNG·WEBP·GIF. 교체·삭제하면 저장소의 옛 파일도 지운다.
- 비밀번호 분실: 사이트에는 아직 비밀번호 재설정 화면이 없다 (KNOWN_ISSUES I-009). Supabase 대시보드 → Authentication → Users 에서 해당 사용자를 삭제하고 같은 이메일로 다시 만들면 된다 (`admins` 목록은 이메일 기준이라 그대로 유지).
- 백업: Free 플랜은 자동 백업이 없다. 중요 시점에 Database → Backups 또는 `pg_dump` 로 보관 (KNOWN_ISSUES 참고).
