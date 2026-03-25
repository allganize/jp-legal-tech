# Machu Picchu Design System Guide

랜딩 페이지 디자인과 앱 페이지의 일관성을 맞추기 위한 마이그레이션 가이드.

---

## 1. 컬러 마이그레이션

### Before (Slate + Blue)
```
배경: slate-50 (#f8fafc)
텍스트: slate-800
서브텍스트: slate-500
보더: slate-200
액센트: blue-600
```

### After (Stone + Emerald)
```
배경: stone-50 (#fafaf9) — 따뜻한 뉴트럴
텍스트: stone-900 (#1c1917) — 순수 검정 대신
서브텍스트: stone-500 (#78716c)
보더: stone-200 (#e7e5e4)
액센트: emerald-600 (#059669)
```

### 전환 매핑표

| 기존 (Slate/Blue) | 변경 (Stone/Emerald) | 용도 |
|---|---|---|
| `text-slate-800` | `text-stone-900` | 제목, 주요 텍스트 |
| `text-slate-500` | `text-stone-500` | 부가 설명 |
| `text-slate-400` | `text-stone-400` | 보조 정보, 라벨 |
| `bg-slate-50` | `bg-stone-50` | 섹션 배경 |
| `bg-slate-100` | `bg-stone-100` | 카드 내부 배경 |
| `border-slate-200` | `border-stone-200` | 카드/구분선 보더 |
| `hover:bg-slate-50` | `hover:bg-stone-50` | 호버 상태 |
| `hover:bg-slate-100` | `hover:bg-stone-100` | 호버 상태 (진함) |
| `bg-blue-600` | `bg-emerald-600` | Primary 버튼 |
| `hover:bg-blue-700` | `hover:bg-emerald-700` | Primary 호버 |
| `text-blue-600` | `text-emerald-600` | 링크, 활성 상태 |
| `border-blue-500` | `border-emerald-500` | 포커스, 활성 탭 |
| `focus:border-blue-500` | `focus:border-emerald-500` | 인풋 포커스 |
| `bg-blue-100 text-blue-700` | `bg-emerald-100 text-emerald-700` | 액션 버튼 (수집 등) |

### 시맨틱 컬러 (유지)
이것들은 의미를 전달하므로 그대로 유지:
- 성공/승소: `emerald-600` (기존과 동일)
- 경고: `amber-500` / `amber-600`
- 위험/패소: `red-500` / `red-600`
- 정보: 차트 컬러 등

### 차트 컬러 팔레트 변경
```tsx
// Before
const COLORS = ["#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6"];

// After — emerald 기반, 보라색 제거
const COLORS = ["#059669", "#ef4444", "#f59e0b", "#0891b2", "#78716c"];
//              emerald   red       amber     cyan      stone
```

---

## 2. 타이포그래피

### 폰트
- **본문**: Geist Sans (`font-sans`, 이미 globals.css에 설정됨)
- **숫자/코드**: Geist Mono (`font-mono`)
- 모든 숫자 데이터 (통계, 퍼센트, 날짜)에 `font-mono` 적용

### 제목 계층

| 레벨 | 클래스 | 용도 |
|---|---|---|
| H1 (페이지 제목) | `text-3xl font-semibold tracking-tight text-stone-900` | 각 페이지 최상단 |
| H2 (섹션 제목) | `text-xl font-semibold text-stone-900` | 섹션 구분 |
| H3 (카드 제목) | `text-base font-semibold text-stone-900` | 카드 내부 |
| 라벨 | `text-xs font-medium text-stone-500 uppercase tracking-wider` | 섹션 라벨, 카테고리 |
| 본문 | `text-base text-stone-600 leading-relaxed` | 설명 텍스트 |
| 보조 | `text-sm text-stone-500` | 부가 정보 |
| 캡션 | `text-xs text-stone-400` | 날짜, 메타데이터 |

### 변경 포인트
```
font-bold → font-semibold  (전체적으로 한 단계 가볍게)
tracking 기본 → tracking-tight  (H1, H2에만)
```

---

## 3. 카드 스타일

### Before
```html
<div class="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
```

### After
```html
<!-- 기본 카드 -->
<div class="bg-white rounded-2xl border border-stone-200 p-6 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.04)]">

<!-- 강조 카드 (프로필, 비교 결과 등) -->
<div class="bg-white rounded-2xl border border-stone-200 p-8 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)]">

<!-- 호버 가능한 카드 -->
<div class="bg-white rounded-2xl border border-stone-200 p-6 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_30px_-8px_rgba(0,0,0,0.08)] hover:border-stone-300 transition-all">
```

### 변경 포인트
- `rounded-xl` → `rounded-2xl` (더 부드러운 곡선)
- `shadow-sm` → 커스텀 tinted shadow (더 자연스러운 깊이)
- `p-5` → `p-6` 또는 `p-8` (여유로운 패딩)
- `border-slate-200` → `border-stone-200`

---

## 4. 버튼 스타일

### Primary 버튼
```html
<!-- Before -->
<button class="bg-blue-600 text-white rounded-lg px-6 py-2.5 font-medium hover:bg-blue-700 transition">

<!-- After -->
<button class="bg-emerald-600 text-white rounded-lg px-6 py-3 font-medium hover:bg-emerald-700 transition active:scale-[0.98]">
```

### Secondary 버튼
```html
<button class="border border-stone-300 text-stone-600 rounded-lg px-6 py-3 font-medium hover:bg-stone-50 transition">
```

### Small / Filter 버튼
```html
<!-- Before -->
<button class="px-3 py-1.5 text-sm bg-blue-100 text-blue-700 rounded-lg">

<!-- After -->
<button class="px-3 py-1.5 text-sm bg-emerald-50 text-emerald-700 rounded-lg hover:bg-emerald-100 transition-colors">
```

### Ghost 링크 버튼
```html
<a class="text-sm font-medium text-emerald-600 hover:text-emerald-700 transition-colors">
  링크 텍스트 &rarr;
</a>
```

### 공통 변경
- `active:scale-[0.98]` 추가 (눌림 피드백)
- `py-2.5` → `py-3` (높이 통일)
- Blue → Emerald 계열

---

## 5. 인풋/폼

### 검색 인풋
```html
<!-- Before -->
<input class="border-2 border-slate-200 rounded-xl focus:border-blue-500 bg-white text-slate-800 placeholder-slate-400">

<!-- After -->
<input class="border-2 border-stone-200 rounded-xl focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 bg-white text-stone-800 placeholder-stone-400 transition-colors">
```

### Select / Textarea
```html
<select class="border border-stone-200 rounded-lg px-4 py-2.5 text-stone-700 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 transition-colors">
```

---

## 6. 탭 네비게이션 (규제 에이전트 레이아웃)

### Before
```html
<a class="border-b-2 border-blue-500 text-blue-600">  <!-- active -->
<a class="border-transparent text-slate-500 hover:text-slate-700">  <!-- inactive -->
```

### After
```html
<a class="border-b-2 border-emerald-600 text-emerald-600 font-medium">  <!-- active -->
<a class="border-b-2 border-transparent text-stone-500 hover:text-stone-700 transition-colors">  <!-- inactive -->
```

---

## 7. 배지/태그

### 영향도 배지
```html
<!-- 높음 -->
<span class="px-2.5 py-1 text-xs font-medium rounded-full bg-red-50 text-red-700">높음</span>

<!-- 중간 -->
<span class="px-2.5 py-1 text-xs font-medium rounded-full bg-amber-50 text-amber-700">중간</span>

<!-- 낮음 -->
<span class="px-2.5 py-1 text-xs font-medium rounded-full bg-emerald-50 text-emerald-700">낮음</span>
```

### 카테고리 배지
```html
<!-- 공통 기본 스타일 -->
<span class="px-2.5 py-1 text-xs font-medium rounded-full bg-stone-100 text-stone-600">카테고리</span>

<!-- 특수 (대법관 등) -->
<span class="px-2.5 py-1 text-xs font-medium rounded-full bg-amber-50 text-amber-700">대법관</span>
```

### 변경 포인트
- `py-0.5` → `py-1` (높이 여유)
- `bg-*-100` → `bg-*-50` (더 연한 배경)

---

## 8. 레이아웃 & 스페이싱

### 페이지 컨테이너 (layout.tsx의 main)
```html
<main class="mx-auto max-w-[1440px] px-6 md:px-12 py-8">
```
- `px-4` → `px-6 md:px-12` (랜딩 페이지와 동일한 좌우 여백)

### 페이지 헤더 패턴
```html
<div class="mb-8">
  <span class="text-xs font-medium text-stone-500 uppercase tracking-wider">카테고리</span>
  <h1 class="text-3xl font-semibold tracking-tight text-stone-900 mt-1">페이지 제목</h1>
  <p class="text-stone-500 mt-2 max-w-lg">페이지 설명...</p>
</div>
```

### 섹션 간격
```
페이지 내 주요 섹션: space-y-10 (기존 space-y-8에서 증가)
카드 그리드 간격: gap-6 (기존 gap-4에서 증가)
카드 내부 항목: space-y-4
```

### 그리드 패턴
```html
<!-- 통계 카드 (4열) -->
<div class="grid grid-cols-2 md:grid-cols-4 gap-6">

<!-- 콘텐츠 카드 (3열) -->
<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

<!-- 비대칭 2열 (메인 + 사이드) -->
<div class="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-6">
```

---

## 9. 헤더 네비게이션

### After
```html
<header class="border-b border-stone-200 bg-white/80 backdrop-blur-sm">
  <div class="mx-auto max-w-6xl px-6 md:px-12 py-4 flex items-center justify-between">
    <div class="flex items-center gap-8">
      <a href="/" class="text-lg font-semibold tracking-tight text-stone-900">
        Machu Picchu
      </a>
      <nav class="flex gap-1">
        <a href="/dashboard" class="px-3 py-1.5 text-sm rounded-lg text-stone-600 hover:bg-stone-100 hover:text-stone-900 transition-colors">
          판사 분석
        </a>
        <!-- ... -->
      </nav>
    </div>
  </div>
</header>
```

### 변경 포인트
- 로고: "Legal Tech" → "Machu Picchu"
- `bg-white` → `bg-white/80 backdrop-blur-sm` (스크롤 시 반투명)
- 네비 아이콘 (&#9878; 등) 제거 → 텍스트만 사용
- `border-slate-200` → `border-stone-200`

---

## 10. 통계 카드 패턴

### Before
```html
<div class="bg-slate-50 rounded-lg p-3">
  <div class="text-slate-500 text-xs">라벨</div>
  <div class="text-xl font-bold text-slate-800">1,234</div>
</div>
```

### After
```html
<div class="bg-stone-50 rounded-xl p-4">
  <p class="text-xs font-medium text-stone-500 uppercase tracking-wider">라벨</p>
  <p class="text-2xl font-semibold font-mono text-stone-900 mt-1">1,234</p>
</div>
```

### 변경 포인트
- `rounded-lg` → `rounded-xl`
- `p-3` → `p-4`
- 숫자에 `font-mono` 추가
- `font-bold` → `font-semibold`
- 라벨에 `uppercase tracking-wider` 추가

---

## 11. 마이그레이션 체크리스트

### 전체 찾아바꾸기 (안전한 변경)
```
slate → stone  (전체 파일)
```

### 파일별 수정
- [ ] `components/ConditionalShell.tsx` — 헤더 로고명, backdrop-blur, 아이콘 제거
- [ ] `dashboard/page.tsx` — slate→stone, blue→emerald, 카드 rounded-2xl
- [ ] `venue/page.tsx` — slate→stone, blue→emerald, 카드 rounded-2xl
- [ ] `venue/compare/page.tsx` — slate→stone, blue→emerald, 차트 컬러
- [ ] `regulation/layout.tsx` — 탭 blue→emerald, slate→stone
- [ ] `regulation/page.tsx` — slate→stone, 배지 스타일
- [ ] `regulation/[id]/page.tsx` — slate→stone, blue→emerald
- [ ] `regulation/clients/page.tsx` — slate→stone, 히트맵 컬러
- [ ] `regulation/weekly/page.tsx` — slate→stone, blue→emerald
- [ ] `judge/[id]/page.tsx` — slate→stone, 차트 컬러
- [ ] `judge/[id]/review/page.tsx` — slate→stone, blue→emerald

---

## 12. 프롬프트 (Claude에게 주는 지시)

아래 프롬프트를 그대로 사용하면 됩니다:

```
다음 디자인 시스템에 맞춰 앱 페이지들의 스타일을 마이그레이션해줘:

1. 컬러: slate → stone, blue → emerald (시맨틱 컬러인 red/amber/emerald은 유지)
2. 카드: rounded-xl → rounded-2xl, shadow-sm → shadow-[0_4px_20px_-4px_rgba(0,0,0,0.04)]
3. 버튼: blue-600 → emerald-600, active:scale-[0.98] 추가
4. 타이포: font-bold → font-semibold, 숫자에 font-mono, 라벨에 uppercase tracking-wider
5. 인풋: focus:border-blue → focus:border-emerald, focus:ring-2 focus:ring-emerald-500/10 추가
6. 탭: border-blue-500 text-blue-600 → border-emerald-600 text-emerald-600
7. 간격: p-5 → p-6, gap-4 → gap-6, space-y-8 → space-y-10
8. 헤더: "Legal Tech" → "Machu Picchu", bg-white → bg-white/80 backdrop-blur-sm, 아이콘 제거
9. 차트 컬러: ["#059669", "#ef4444", "#f59e0b", "#0891b2", "#78716c"]
10. 배지: bg-*-100 → bg-*-50, py-0.5 → py-1

대상 파일: dashboard/page.tsx, venue/page.tsx, venue/compare/page.tsx,
regulation/layout.tsx, regulation/page.tsx, regulation/clients/page.tsx,
regulation/weekly/page.tsx, judge/[id]/page.tsx, judge/[id]/review/page.tsx,
case/[id]/page.tsx, components/ConditionalShell.tsx
```
