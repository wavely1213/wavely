# App Store 판매자명 변경 요청 — 박현준 → 와벨리

## 어디에 넣나

**developer.apple.com/contact/** → *Membership and Account* → *Change your legal entity name or D-U-N-S Number*
(로그인 필요. 웹폼이 안 보이면 *Contact Us* → *Membership, Account & Organization* → *Account Management*)

전화 문의도 됩니다: Apple Developer Support 한국 **080-330-8877** (평일 09:00~18:00)

## 붙일 서류

| 서류 | 왜 |
|---|---|
| **사업자등록증** | 상호 '와벨리'와 대표자 '박현준'이 같은 주체임을 증명 |
| **통신판매업 신고증** | 실제 영업 중인 사업체라는 보강 (2026-강원춘천-0191) |

영문 번역본을 요구할 수 있습니다. 요구하면 그때 준비하면 됩니다 — 미리 만들 필요 없습니다.

## 본문 (그대로 붙여넣기)

```
Subject: Request to display registered trade name as seller name (Individual account)

Team ID: Q4WDQP6Z6A
Account holder: Hyeonjun Park (Individual)
Bundle ID: kr.mulgyeol.app

Hello,

I am enrolled as an individual, and my App Store seller name currently shows my
personal legal name. I would like it to display my registered business trade name
instead.

I operate a registered sole proprietorship in South Korea:

  Trade name (상호)              : 와벨리 (Wavely)
  Representative (대표자)        : Hyeonjun Park
  Business registration number   : 694-09-03009
  Mail-order business report no. : 2026-강원춘천-0191
  Country                        : Republic of Korea

The business is registered with the Korean National Tax Service, and the trade
name "와벨리" is the name recorded on the business registration certificate — it is
not an unregistered DBA. I am attaching the business registration certificate.

My question:

1. Can the seller name displayed on the App Store be changed to "와벨리" (Wavely)
   while remaining on an individual account, given the attached registration?

2. If not, is converting to an Organization account possible for a Korean sole
   proprietorship, or does Apple require an incorporated legal entity
   (주식회사 / 유한회사)?

I would like to confirm this before submitting my first app, so that the correct
seller name appears from launch.

Thank you,
Hyeonjun Park
mulgyeoli2@gmail.com
```

## 답에 따라

- **된다** → 서류 심사 후 반영. D-U-N-S 불필요, 며칠이면 끝
- **법인 필요** → 법인 설립 → 법인 사업자등록 → D-U-N-S(무료, 5~14일) → Organization 전환

## 그동안

빌드는 다시 안 만들어도 됩니다 — 계정 설정이라 지금 만든 `.ipa`를 그대로 씁니다.
**단, 판매자명이 확정되기 전에는 App Store에 제출하지 않는 게 낫습니다.** 출시 후 바꾸면
이미 노출된 뒤라 의미가 줄어듭니다.

플레이스토어는 별개입니다 — 개인 계정에서도 개발자명을 직접 정할 수 있을 가능성이 높아,
안드로이드를 먼저 내보내는 선택지가 있습니다.
