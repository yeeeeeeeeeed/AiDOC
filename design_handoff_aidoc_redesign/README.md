# Handoff: AiDoc Redesign

## Overview
AiDoc(사내 AI 문서 도우미)의 전체 UI 리프레시입니다. 기존 Next.js(App Router) 기반 코드베이스의 기능/라우팅 구조는 유지한 채, **비주얼 언어와 정보 구조만 리디자인**했습니다. 기업용 톤은 그대로 두고(과한 SF 스타일·네온 제거), 여백·타이포·컬러를 모던하게 다듬었습니다.

리디자인 대상 화면:
1. 홈 / 대시보드
2. 문서 요약
3. PDF 비교
4. 표 추출
5. 번역
6. **(신규)** 관리자 · 토큰 사용량
7. **(신규)** 관리자 · 방문자 로그
8. **(신규)** 관리자 · 사용 한도

## About the Design Files
이 번들에 포함된 파일들은 **디자인 레퍼런스(HTML/JSX 프로토타입)** 입니다. 실제 동작하는 코드가 아니라, 의도한 룩앤필·레이아웃·상호작용을 보여주는 정적 목업입니다.

작업은 **이 프로토타입을 기존 Next.js 코드베이스(`frontend/`)에 재현**하는 것입니다. 새 라이브러리를 도입하지 말고, 현재 쓰고 있는 패턴(App Router + 인라인 스타일 + 기존 `components/ui`·`components/layout`)을 그대로 유지한 채 스타일링과 레이아웃만 업데이트하세요. `aidoc-screens.jsx`는 React 참고용 JSX이므로 각 스크린별로 TypeScript(.tsx)로 옮기면서 타입을 붙이면 됩니다.

## Fidelity
**High-fidelity (hifi)** — 색상, 타이포, 간격, 그림자, 인터랙션 상태까지 최종 수치로 지정되어 있습니다. 가능한 한 픽셀-퍼펙트하게 재현해주세요. 수치는 아래 "Design Tokens" 및 `aidoc-screens.jsx` 내의 인라인 스타일에서 직접 가져올 수 있습니다.

---

## Design Tokens

모두 `aidoc-screens.jsx` 상단의 `COLORS` / `FONT` / `MONO` 상수에 정의되어 있습니다. 기존 코드베이스에 `design-tokens.ts` 같은 중앙 파일이 없다면 이번 리디자인에서 하나 만들어 주세요.

### Colors
| 토큰 | Hex | 용도 |
|---|---|---|
| `bg` | `#FAFAF7` | 앱 배경 (warm neutral) |
| `panel` | `#FFFFFF` | 카드 / 패널 배경 |
| `ink` | `#0F1419` | 본문 텍스트 (최고 대비) |
| `ink2` | `#4A5259` | 보조 텍스트 |
| `ink3` | `#8A9199` | 메타/플레이스홀더 텍스트 |
| `line` | `#EBE8E0` | 기본 보더 |
| `lineSoft` | `#F1EEE6` | 약한 구분선 / 테이블 행 |
| `side` | `#17181C` | 사이드바 배경 (거의-검정) |
| `sideInk` | `#E5E5E0` | 사이드바 텍스트 |
| `sideMuted` | `#797C82` | 사이드바 보조 텍스트 |
| `accent` | `#3B5BFF` | 주요 액션 / 링크 / 강조 (인디고) |
| `accentSoft` | `#EEF1FF` | 액센트 배경 (칩/뱃지) |
| `accentInk` | `#2740C7` | 액센트 위 텍스트 |
| `ok` / `okSoft` | `#0E8F5C` / `#E6F6EE` | 성공 상태 |
| `warn` / `warnSoft` | `#B26A00` / `#FFF2DE` | 경고 상태 |
| `danger` / `dangerSoft` | `#C8321E` / `#FDEBE7` | 에러/차단 상태 |

### Typography
- **Primary**: `"Pretendard", "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`
  - Pretendard CDN: `https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css`
- **Mono**: `"JetBrains Mono", "IBM Plex Mono", ui-monospace, monospace` (숫자/키보드 단축키/아이콘 글리프)
- 본문 기본 크기: **13–14px** · `letter-spacing: -0.1 ~ -0.3px`
- H1 (페이지 타이틀): **26–28px / weight 600 / ls -0.5**
- H2 (섹션 타이틀): **15–16px / weight 600 / ls -0.2**
- 캡션/메타: **11–12px / color ink3**
- KPI 숫자: **28–32px / weight 600 / ls -0.8** (Pretendard)
- 수치·모노스페이스 값: JetBrains Mono

### Spacing / Radii / Shadows
- 레이아웃 패딩: 페이지 컨텐츠 `28px 40px 48px`
- 카드 패딩: `24px` (기본), `16–20px` (조밀한 테이블 헤더/푸터)
- 카드 간 간격: `16–24px`
- Border radius: **8** (버튼/입력), **10–12** (작은 카드), **14** (메인 카드), **50%** (아바타)
- 기본 카드 보더: `1px solid #EBE8E0` — **그림자는 최소화** (떠있는 느낌만 필요할 때 `0 1px 2px rgba(15,20,25,0.04)`)
- 사이드바 폭: **240px** 고정
- 탑바 높이: **56px**

### Buttons (from `aidoc-screens.jsx`)
```js
btnPrimary = { padding:"8px 14px", background:"#0F1419", color:"#fff",
               border:"none", borderRadius:8, fontSize:13, fontWeight:500 }
btnGhost   = { padding:"8px 12px", background:"transparent", color:"#4A5259",
               border:"1px solid #EBE8E0", borderRadius:8, fontSize:13 }
btnAccent  = { padding:"10px 18px", background:"#3B5BFF", color:"#fff",
               border:"none", borderRadius:10, fontSize:14, fontWeight:500 }
```

---

## Global Layout (Shell)

### Sidebar — `components/layout/Sidebar.tsx`
기존 파일을 **리라이트**합니다. 기존의 `MENU` 배열·`adminOnly` 필터링·`useAuth` 훅은 그대로 두고 스타일만 바꿉니다.

- 폭 240px, 배경 `#17181C`, 패딩 `20px 14px`
- 상단 브랜드 블록: 28×28 라운드 스퀘어 로고(그라디언트 `#3B5BFF → #7B8EFF`) + "AiDoc" / "AI 문서 도우미"
- `WORKSPACE` 섹션 레이블 (11px · uppercase · letter-spacing 0.8 · `#797C82`)
- 메뉴 아이템:
  - 높이 36px, 패딩 `9px 12px`, 라운드 8
  - 활성 시 배경 `rgba(255,255,255,0.08)` + 왼쪽에 2.5px 인디고 액센트 바 (top/bottom 10, radius 2)
  - 아이콘 글리프는 JetBrains Mono, 18px 폭, 활성 시 `#3B5BFF` / 비활성 시 `#797C82`
- 관리자 메뉴 앞에 1px divider(`rgba(255,255,255,0.08)`), 우측에 `ADMIN` 뱃지(9.5px, 3px radius, `rgba(255,255,255,0.1)`)
- 하단에 유저 카드: 반투명 카드(radius 10, 패딩 12) + 26px 원형 이니셜 아바타 + 이름 / "관리자 · POSCO ENC"

### Topbar
- 높이 56px, 하단 1px 보더 `#EBE8E0`, 배경 흰색, 패딩 `0 40px`
- 좌측: breadcrumb (`Workspace / PDF 문서`) — 12.5px, `/` 구분자는 opacity 0.5
- 우측 전역 검색 박스: 260px min-width, 패딩 `7px 12px`, 배경 `#FAFAF7`, 1px 보더, radius 8 — 우측에 ⌘K 키캡 (10.5px, Mono)
- 오른쪽 끝: `도움말` ghost 버튼 + `+ 새 작업` primary 버튼

---

## Screens

각 스크린의 기존 페이지 파일 위치와 리디자인 내용입니다. 레이아웃 수치·색상은 모두 `aidoc-screens.jsx` 내 해당 `~Screen` 컴포넌트를 참조하세요.

### 1. 홈 — `app/(main)/home/page.tsx`
**목적**: 앱 진입 화면. 업로드 CTA + 빠른 기능 진입 + 최근 작업.

**레이아웃**
- H1 "안녕하세요, 예은님 👋" (인사말) + 서브카피
- **히어로 카드**(radius 14, 패딩 32): 좌측 업로드 드롭존(점선 보더, radius 12, 48px 아이콘) / 우측 4개 기능 선택 그리드 (2×2)
- **통계 행**: 3개 KPI 카드 (이번 달 처리 문서 수 / 절약 시간 / 활성 사용자) — 각 카드 패딩 20px, KPI 숫자 28–32px, 미니 추이 표시(선택)
- **최근 작업** 섹션: 행당 높이 약 60px, 좌측 파일 아이콘 + 이름 + 기능 태그 칩 + 시간 + 우측 액션 아이콘

### 2. 문서 요약 — `app/(main)/summary/page.tsx`
**목적**: PDF 업로드 → 페이지 범위 선택 → 요약 실행 → 결과 확인.

**레이아웃(3 컬럼)**
- 좌측(패널 260px): 업로드된 파일 카드 + `PageSelector`(썸네일 그리드, 기존 컴포넌트 재사용 — 스타일만 업데이트)
- 중앙(flex 1): 요약 결과(마크다운 렌더, `MarkdownView` 재사용). 스트리밍 중이면 상단에 ProgressStream 표시
- 우측(280px): 프리셋 카드(요약 길이 · 어조 · 포함할 섹션 체크박스) + `요약 실행` accent 버튼

### 3. PDF 비교 — `app/(main)/compare/page.tsx`
**목적**: 원본 vs 수정본 diff 확인.

**레이아웃**
- 상단: 2개 업로드 슬롯(좌: Before / 우: After) — 각각 파일 이름 + 제거 버튼
- 중앙 **Side-by-side** 뷰어 (flex 1, 1:1 분할). 각 패널 상단에 페이지 네비게이션(페이지 N/total · 이전/다음)
- diff 하이라이트: 추가 `#E6F6EE` 배경, 삭제 `#FDEBE7` 배경
- 우측 슬라이드 인 카드(폭 320px): **AI 변경 요약** — 카테고리별로 "추가 N건 / 삭제 N건 / 변경 N건" 칩, 아래에 bullet 목록

### 4. 표 추출 — `app/(main)/extract/table/page.tsx` (기존 `extract/table`)
**목적**: PDF에서 표를 추출해서 편집 가능한 형태로 제공.

**레이아웃**
- 상단 **Stepper** (3 단계: 업로드 · 페이지 선택 · 추출) — 완료 단계는 accent, 현재 단계는 진한 외곽선, 미완료는 회색
- 메인 영역: 탭(`표 1` `표 2` ... `전체`), 각 탭에 `TableEditor`(기존 컴포넌트) 렌더
- 우상단: `CSV 다운로드` ghost · `Excel 다운로드` primary
- 하단 안내 배너(연한 인디고 배경): 추출 정확도 안내 + 셀 수정 방법

### 5. 번역 — `app/(main)/translate/page.tsx`
**목적**: PDF 원문을 다른 언어로 번역.

**레이아웃(2 컬럼)**
- 상단 툴바: 언어 선택 dropdown 2개(원문 ↔ 번역본, 가운데 swap 버튼) + 번역 엔진 선택 칩
- 좌측: 원문 뷰어(페이지 단위 스크롤)
- 우측: 번역본 뷰어 — 스트리밍 중이면 문단별로 로딩 쉐이드
- 상단 진행률 바(ProgressStream 재사용) — 문단 단위로 퍼센트

### 6. 관리자 · 토큰 사용량 — `app/(main)/admin/tokens/page.tsx` **(신규)**
**목적**: 월별/YTD 토큰 사용량 및 추정 비용 관리.

**레이아웃**
- 상단 KPI 4개 카드: 총 요청 수 · 입력 토큰 · 출력 토큰 · **추정 비용(다크 카드 `#17181C`, 텍스트 흰색, 액센트 강조)**
- **월별 사용량 테이블**: 월 / 요청 수 / 입력 / 출력 / 비용 / 미니 바차트 셀(인라인 SVG 또는 flex bar)
- **상세 조회 테이블**: 필터(기간 · 사용자 · 기능) + 사용자별 로그 행

### 7. 관리자 · 방문자 로그 — `app/(main)/admin/visitors/page.tsx` **(신규)**
**목적**: 접속 통계 및 상세 로그.

**레이아웃**
- 상단 기간 필터(오늘 · 7일 · 30일 · 커스텀 범위 picker)
- KPI 2개(총 방문 수 · 고유 사용자 수)
- **일별 방문 바차트**: 인라인 SVG, 바에 위→아래 그라데이션(`#3B5BFF → #7B8EFF`, radius 3)
- **최다 방문 사용자 랭킹**: 순위(모노스페이스) + 아바타 + 이름/부서 + 방문 수 막대
- **상세 로그 테이블**: 시간 · 사용자 · IP · User-Agent(줄임) · 경로

### 8. 관리자 · 사용 한도 — `app/(main)/admin/limits/page.tsx` **(신규)**
**목적**: 사용자별 월/일 토큰 한도 설정 및 차단 해제.

**레이아웃**
- 상단 KPI: 한도 초과 사용자 수 · 차단된 사용자 수 · 평균 사용률
- **한도 관리 테이블**: 사용자 · 부서 · 이번 달 사용량 / 한도(진행률 바) · 상태 뱃지(정상/경고/차단) · 액션 드롭다운(한도 수정 · 차단 해제 · 이력)
- **상세 편집 모달**: 월 한도(입력) · 일 한도(입력) · 자동 차단 스위치 · 메모

백엔드 계약(예시):
- `GET /api/admin/limits` → `{ users: [{ id, name, dept, monthly_used, monthly_limit, daily_used, daily_limit, status }] }`
- `PATCH /api/admin/limits/:userId` → `{ monthly_limit, daily_limit, auto_block }`
- `POST /api/admin/limits/:userId/unblock`
- DB: `user_limits(user_id PK, monthly_limit int, daily_limit int, status enum('normal','warn','blocked'), auto_block bool, updated_at)`

---

## Reused Components
기존 컴포넌트는 **컴포넌트 구조·props·시그니처를 그대로 두고** 스타일만 위 디자인 토큰에 맞게 업데이트합니다.
- `components/ui/PdfUploader.tsx` — 점선 드롭존 스타일만 업데이트 (radius 12, accent hover)
- `components/ui/PageSelector.tsx` — 썸네일 라운드 8, 선택 시 2px accent 외곽선
- `components/ui/MarkdownView.tsx` — Pretendard 폰트, 인디고 링크, `<code>`는 JetBrains Mono · 배경 `#F1EEE6`
- `components/ui/ProgressStream.tsx` — 높이 4px, radius 2, 트랙 `#EBE8E0`, 채움 `#3B5BFF`
- `components/ui/TableEditor.tsx` — 헤더 배경 `#FAFAF7`, 행 hover `#F1EEE6`, 편집 셀 focus 시 accent ring 2px

---

## Interactions & Behavior
- **라우팅**: Next.js App Router. 새 관리자 페이지는 `app/(main)/admin/` 아래에 추가. 기존 `admin/history`는 유지하고 사이드바 `관리자` 메뉴를 **서브메뉴(4개: 이용 기록 · 토큰 사용량 · 방문자 로그 · 사용 한도)** 또는 **`/admin` 대시보드 랜딩 페이지 + 탭**으로 확장하세요. (권장: 랜딩 + 탭 — 기존 단일 엔트리 구조와 호환)
- **권한 가드**: 모든 `/admin/*` 경로에 기존 `is_admin` 체크 미들웨어를 적용. `MENU` 배열의 `adminOnly: true` 패턴 유지.
- **호버 상태**: 카드 hover 시 보더만 살짝 진하게(`#EBE8E0 → #D9D5CA`). 그림자 추가 금지.
- **버튼 active**: primary/accent는 `filter: brightness(0.95)`, ghost는 배경 `#F1EEE6`.
- **포커스 링**: `outline: 2px solid #3B5BFF; outline-offset: 2px;` — 모든 인터랙티브 요소에 일관되게.
- **로딩**: 스트리밍 중에는 해당 영역만 문단 단위로 스켈레톤 또는 투명도 애니메이션. 전체-화면 스피너 금지.
- **애니메이션**: 모달/드로어 200ms ease-out, 탭 전환 150ms, 이 외에는 거의 정적.

## Responsive Behavior
데스크톱 전용입니다(최소 1280px 가정). 사이드바는 고정 240px, 컨텐츠는 flex:1. 모바일 대응은 이번 스코프 밖 — 단, 컨텐츠 max-width는 설정하지 않고 flex로 확장시킵니다.

---

## Assets
- **폰트**: Pretendard(CDN) — `<link>` 태그 유지. JetBrains Mono는 Google Fonts.
- **아이콘**: 별도 아이콘 라이브러리 없음. 기존처럼 **유니코드 글리프**(`□ ⊞ ⊟ ≡ ⊜ ⇄ ⚙`)를 사용하되 JetBrains Mono로 렌더. 후속으로 Lucide/Phosphor 도입이 필요하면 별도 이슈로 분리.
- **로고**: 사이드바 상단 "A" 그라디언트 스퀘어(28×28, radius 8) — SVG 없이 CSS `linear-gradient(135deg, #3B5BFF, #7B8EFF)`.
- **이미지**: 현재 디자인에 사진/일러스트 에셋 없음. 빈 상태/에러 화면은 별도 요청 시 추가 예정.

---

## Files in this Bundle
| 파일 | 설명 |
|---|---|
| `README.md` | 본 문서 |
| `AiDoc Redesign.html` | 디자인 캔버스 엔트리 (모든 스크린을 한 화면에 배치) |
| `aidoc-screens.jsx` | 8개 스크린의 React(JSX) 구현 — 토큰, Shell/Sidebar/Topbar, 각 `~Screen` 컴포넌트. 모든 수치가 인라인 스타일에 기록됨 |
| `design-canvas.jsx` | 프로토타입 전용 캔버스 래퍼 (실제 앱에는 이식 불필요) |

---

## Suggested Implementation Order
1. **디자인 토큰 파일 생성** (`src/lib/design-tokens.ts`) — 위 Colors/Typography/Spacing을 export
2. **전역 스타일 업데이트** (`app/globals.css`) — Pretendard + JetBrains Mono 로드, body `background: #FAFAF7`, `color: #0F1419`
3. **`components/layout/Sidebar.tsx` 리라이트** — 위 스펙 반영
4. **Topbar 추가** (신규 `components/layout/Topbar.tsx`) — `app/(main)/layout.tsx`에 삽입
5. **기존 5개 페이지 리디자인** (home → summary → compare → extract/table → translate 순서로 권장)
6. **공유 UI 컴포넌트 스타일 업데이트** (`PdfUploader`, `PageSelector`, `MarkdownView`, `ProgressStream`, `TableEditor`)
7. **관리자 섹션 확장** (`app/(main)/admin/` 하위에 tokens/visitors/limits 추가 + 권한 가드)
8. **백엔드 `/api/admin/limits` 엔드포인트 및 `user_limits` 테이블 추가**
9. **접근성 패스** — 포커스 링, aria-label, 키보드 네비게이션 일관성 확인

개발 중 의문사항은 `aidoc-screens.jsx`의 해당 `~Screen` 컴포넌트를 펼쳐서 인라인 스타일 수치를 직접 참조하면 됩니다.
