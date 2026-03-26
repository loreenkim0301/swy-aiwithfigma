# Development Log — Blog Prototype Figma Plugin

Figma 플러그인을 통해 블로그 UI 코드를 Figma 프레임으로 자동 변환하는 과정의
버전별 개발 히스토리, 시행착오, 성공/실패 기록.

---

## V1.0 — 2026-03-25

### 목표
HTML/CSS 블로그 프로토타입(`blog-prototype/`)을 Figma에서 수작업 없이
자동 생성할 수 있는 플러그인 첫 버전 구축.

### 접근 방식
- 모든 요소를 절대좌표(x, y, w, h)로 배치
- `mkRect`, `mkText`, `mkFrame` 헬퍼로 CSS 좌표값을 그대로 변환
- 스타일 없이 색상값만 직접 지정

### 결과
- PC 1440px / Mobile 375px 프레임 생성 성공
- Featured Card + 2열 그리드 + Sidebar(Categories, Tags, Newsletter) 구조 재현

### 한계 (→ V2.0으로 이어진 이유)
- Figma 인스펙터에서 스타일 이름이 전혀 안 보임
  - 개발자가 색상 토큰, 텍스트 스타일 이름을 알 수 없음
  - handoff 불가 수준
- Auto Layout 없음 → 모든 수치가 절대값 → 반응형 구조 확인 불가
- 폰트 로딩 순서 오류로 간헐적 플러그인 크래시 발생

---

## V2.0 — 2026-03-25

### 목표
개발자 handoff를 위해 Design Token 시스템 도입.
Figma 인스펙터에서 스타일 이름을 읽을 수 있게 한다.

### 추가된 것

#### Design Token 시스템 (37개)
- Color Styles 13개: `Background/Primary`, `Text/Muted`, `Accent/Primary` 등
- Text Styles 18개: `Display/Hero-PC`, `Heading/Card`, `Label/Category` 등
- Effect Styles 2개: `Shadow/Card-Default`, `Shadow/Card-Hover`
- Grid Styles 2개: `Grid/PC-1440`, `Grid/Mobile-375`

#### Mode B
- 이미 만들어진 Figma 노드를 선택한 뒤 플러그인 실행 시
  색상/텍스트를 가장 가까운 등록 스타일에 자동 연결

#### 단계별 progress 알림
- "코드를 피그마로 옮기는 중" → "PC 완료" → "Mobile 완료"
  → "스타일 분석 중" → "완료"

### 성공
- Figma 인스펙터에서 `Accent/Primary`, `Heading/Card` 등 스타일 이름 확인 가능
- 스타일 재사용으로 일관성 확보

### 한계 (→ V2.1로 이어진 이유)
- Auto Layout은 버튼(`mkPillButton`)에만 적용됨
- 나머지 모든 요소는 여전히 절대좌표
- 개발자가 Figma 인스펙터에서 `padding: 20px`, `gap: 16px` 같은
  레이아웃 값을 읽을 수 없음 → handoff 절반짜리

---

## V2.1 — 2026-03-26

### 목표
CSS의 `display: flex / grid`에 해당하는 모든 레이아웃 컨테이너에
Auto Layout 적용 → 개발자가 padding / gap / direction 값을 정확히 읽을 수 있게 한다.

대상 레이아웃 존 14개:
- Tier 1: Header, Hero, Main Layout, Footer
- Tier 2: Posts Column, Section Header Row, Posts Grid
- Tier 3: Post Card, Featured Card, Card Body
- Tier 4: Sidebar, Sidebar Widget, Category Item, Tags Container, Newsletter Form

---

### 1차 시도 — 하향식(Top-Down) 후처리 ❌ 실패

**방식:**
Phase 1에서 절대좌표로 모든 노드를 생성한 뒤,
Phase 3에서 상위 프레임부터 `layoutMode`를 적용하는 후처리.

```
Phase 1: 모든 노드 절대좌표로 생성
Phase 3: applyAL_tier1() → applyAL_tier2() → applyAL_tier3() → applyAL_tier4()
```

**발생한 문제들:**

1. **Card Body 높이 붕괴 (24×538, 70×178)**
   - 카드에 `layoutMode = "VERTICAL"` 설정 순간, Card Body의 sizing이 `"HUG"`로 리셋
   - `layoutSizingHorizontal = "FILL"`을 재지정해도 부모-자식 관계 오류 연쇄 발생

2. **이모지 텍스트가 AL flow에 끼어드는 문제**
   - 썸네일 위에 opacity 0.2의 이모지 TEXT 노드가 카드 직접 자식으로 존재
   - 카드에 VERTICAL AL 적용 시 `[썸네일 → 이모지 → Card Body]` 3단 구조로 쌓임
   - 설계 의도: `[썸네일 / Card Body]` 2단

3. **Newsletter Form 3개 자식 쌓임**
   - placeholder 텍스트가 Form 직접 자식이어서 `[input rect, 텍스트, button]` 3개가 세로로 쌓임
   - 설계 의도: `[Email Input Frame, Button]` 2개

4. **Hero 텍스트 너비 수축**
   - VERTICAL AL 적용 후 텍스트가 HUG로 수축해 좁아짐

**근본 원인:**
```
만들고 나서 AL을 끼워 넣으려 했기 때문.

Figma의 AL 엔진은 노드 생성 시점부터 sizing 관계를 추적한다.
이미 만들어진 노드에 AL을 사후 적용하면 엔진이 sizing을 재계산하고,
개발자가 직접 지정한 크기와 충돌한다.
```

---

### 2차 시도 — 상향식(Bottom-Up) 구성 ✅ 성공

**통찰:** CSS 렌더링 순서와 동일하게 빌드하면 된다.

```
CSS 렌더링 순서:
  텍스트 크기 확정
    → 요소 크기 확정 (padding + content)
      → 부모 크기 확정 (gap + children)
        → 페이지 레이아웃 확정

Figma 상향식 구성:
  텍스트 (leaf)
    → Card Body (VERTICAL, pad:20, gap:10)
      → Post Card (VERTICAL, thumb + body)
        → Card Row (HORIZONTAL, gap:20)
          → Posts Grid (VERTICAL, gap:20)
            → Posts Column (VERTICAL, gap:28)
              → Main Layout (HORIZONTAL, pad:170, gap:44)
                → Root Frame (VERTICAL)
```

**핵심 규칙:**
- 자식이 완성된 뒤 부모에 `appendChild`
- 부모에 AL 설정 시 자식 sizing이 이미 확정되어 있으므로 충돌 없음
- x, y 절대좌표 불필요

**신규 헬퍼 설계:**
```javascript
mkAutoFrame(parent, name, direction, opts)
// direction: "HORIZONTAL" | "VERTICAL"
// opts: { w, h, pad, padH, gap, spaceBetween, centerCross, wrap, ... }
// w만 주면 반대 축이 AUTO(hug), 둘 다 주면 FIXED×FIXED

mkFlexText(parent, content, colorKey, opts)
// x,y 없음. opts.hFill = true 시 layoutSizingHorizontal = "FILL"
```

---

### 3차 버그 — resize()와 AUTO 높이 충돌 ❌ → 수정 ✅

**증상:** 생성된 PC/Mobile 루트 프레임 높이가 `1440×10`, `375×10`으로 고정됨.
콘텐츠는 `clipsContent = false`라 보이지만 프레임 바운딩 박스가 잘못됨.

**원인 분석:**
```javascript
// 버그 코드 순서
f.primaryAxisSizingMode = "AUTO";  // ① AUTO 설정
f.counterAxisSizingMode = "FIXED";
f.resize(width, 10);               // ② resize()가 ①을 FIXED로 덮어씀
// 결과: 높이 10px로 고정, 자식 추가해도 확장 안 됨
```

Figma API에서 `resize()`는 내부적으로 `primaryAxisSizingMode`를 `"FIXED"`로
변경할 수 있다. AUTO 설정이 resize() 이후에 위치해야 올바르게 적용된다.

**수정:**
```javascript
// 수정된 순서
f.resize(width, f.height);         // ① resize 먼저
f.counterAxisSizingMode = "FIXED";
f.primaryAxisSizingMode = "AUTO";  // ② AUTO는 resize 이후에 설정
// 결과: 자식 추가 시 높이 자동 확장 정상 작동
```

---

### 최종 결과

| 항목 | V2.0 | V2.1 |
|---|---|---|
| 스타일 토큰 | ✅ 37개 | ✅ 동일 |
| Auto Layout | 버튼만 | ✅ 전체 14개 존 |
| padding 인스펙터 확인 | ❌ | ✅ |
| gap 인스펙터 확인 | ❌ | ✅ |
| 개발자 handoff | 절반 | ✅ 완전 |
| 후처리(Phase 3) | 필요 | 불필요 (빌드 시 적용) |

---

## CSS → Figma Auto Layout 매핑 참고

| CSS | Figma |
|---|---|
| `display: flex` (row) | `layoutMode = "HORIZONTAL"` |
| `display: flex` (column) | `layoutMode = "VERTICAL"` |
| `flex-wrap: wrap` | `layoutWrap = "WRAP"` |
| `gap: Npx` | `itemSpacing = N` |
| `justify-content: space-between` | `primaryAxisAlignItems = "SPACE_BETWEEN"` |
| `align-items: center` | `counterAxisAlignItems = "CENTER"` |
| `width: 100%` | `layoutSizingHorizontal = "FILL"` |
| `flex: 1` | `layoutGrow = 1` |
| `width: fit-content` | `primaryAxisSizingMode = "AUTO"` |
