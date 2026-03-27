# V2.1 Auto Layout 전면 적용 계획서

> **계획서 관리 전략**
> 각 버전의 주요 계획서는 완료 후에도 보존한다.
> 계획 당시의 의도·판단 근거가 미래 버전 설계 시 참고 자료가 되기 때문이다.
> 실제 결과와 시행착오는 `DEVLOG.md`에 기록한다.
> 새 버전 계획서 파일명 규칙: `PLAN_V{major}.{minor}.md`
>
> **상태**: ✅ 완료 (2026-03-26) — 실제 결과는 DEVLOG.md V2.1 섹션 참고

## 목표

CSS `display: flex / grid`에 해당하는 모든 레이아웃 컨테이너에 Auto Layout을 적용하여,
개발자가 Figma 인스펙터에서 padding / gap / direction 값을 정확히 읽을 수 있게 한다.

---

## 시행착오 기록 (2026-03-26)

### 1차 시도 — 하향식 후처리 (실패)

**방식:** Phase 1에서 절대좌표로 모든 노드 생성 → Phase 3에서 상위 프레임부터 AL 적용

**문제:**
- 부모에 `layoutMode`를 설정하는 순간, 자식의 sizing mode가 `"HUG"`로 리셋됨
- `body.resize(CW, CH-TH)`로 지정한 크기가 AL 적용 후 붕괴 (24×538 등)
- 이모지 텍스트(opacity 0.2)가 카드 직접 자식으로 존재해 AL flow에 끼어들어 [썸네일 → 이모지 → Card Body] 3단 구조가 됨
- Newsletter Form에서 placeholder 텍스트가 Form 직접 자식이어서 [input rect → 텍스트 → 버튼] 3개가 쌓임
- 사후에 `layoutSizingHorizontal = "FILL"` 을 재지정해도 부모-자식 관계 오류가 연쇄 발생

**근본 원인:**
```
만들고 나서 AL을 끼워 넣으려 했기 때문.
Figma의 AL 엔진은 노드 생성 시점부터 sizing 관계를 추적한다.
이미 만들어진 노드에 AL을 사후 적용하면 엔진이 sizing을 재계산하고,
개발자가 직접 지정한 크기와 충돌한다.
```

---

## 올바른 전략 — 상향식 (Bottom-Up) 구성

CSS가 동작하는 방식과 동일하다.

```
CSS 렌더링 순서
  텍스트 크기 확정
    → 요소 크기 확정 (padding + content)
      → 부모 크기 확정 (gap + children)
        → 페이지 레이아웃 확정
```

```
Figma 상향식 구성 순서
  텍스트 노드 (leaf)
    → Card Body (VERTICAL AL, padding 20, gap 10)
      → Thumbnail Frame (FIXED 크기)
        → Post Card (VERTICAL or HORIZONTAL AL)
          → Posts Grid (VERTICAL AL)
            → Section Header (HORIZONTAL SPACE_BETWEEN)
              → Posts Column (VERTICAL AL)
                → Header / Hero / Footer (각자 AL)
                  → Page Root Frame
```

**핵심 규칙:**
- 자식이 먼저 완성된 뒤 부모에 `appendChild`
- 부모에 AL 설정 시 자식 sizing이 이미 확정되어 있으므로 충돌 없음
- `x, y` 절대 좌표 지정 불필요 — 부모 AL이 배치를 담당

---

## CSS → Figma Auto Layout 매핑표

| CSS 속성 | Figma 속성 |
|---|---|
| `display: flex` (row) | `layoutMode = "HORIZONTAL"` |
| `display: flex` (column) | `layoutMode = "VERTICAL"` |
| `flex-wrap: wrap` | `layoutWrap = "WRAP"` |
| `gap: Npx` | `itemSpacing = N` |
| `padding: T R B L` | `paddingTop/Right/Bottom/Left` |
| `justify-content: space-between` | `primaryAxisAlignItems = "SPACE_BETWEEN"` |
| `justify-content: center` | `primaryAxisAlignItems = "CENTER"` |
| `align-items: center` | `counterAxisAlignItems = "CENTER"` |
| `width: fit-content` | `primaryAxisSizingMode = "AUTO"` |
| `height: fit-content` | `counterAxisSizingMode = "AUTO"` |
| `width: 100%` | `layoutSizingHorizontal = "FILL"` |
| `flex: 1` | `layoutGrow = 1` |
| `width: Npx` (고정) | `primaryAxisSizingMode = "FIXED"` |

---

## 14개 레이아웃 존 정의

### Tier 1 — 페이지 레벨

| # | 이름 | CSS 원본 | AL 방향 | 주요 속성 |
|---|---|---|---|---|
| 1 | Header | `flex; space-between; h:60px` | HORIZONTAL | SPACE_BETWEEN, padH:170, centerAxis |
| 2 | Hero | `flex-col; pad:36px 170px 48px` | VERTICAL | padH:170, padTop:36, padBot:48, gap:16 |
| 3 | Main Layout | `grid; 1fr 280px; gap:44px` | HORIZONTAL | gap:44, padH:170, padTop:48 |
| 4 | Footer | `flex; space-between` | HORIZONTAL | SPACE_BETWEEN, padH:170, centerAxis |

### Tier 2 — 컨텐츠 영역

| # | 이름 | CSS 원본 | AL 방향 | 주요 속성 |
|---|---|---|---|---|
| 5 | Posts Column | `flex-col; gap:28px` | VERTICAL | gap:28, FILL width |
| 6 | Section Header Row | `flex; space-between` | HORIZONTAL | SPACE_BETWEEN, centerAxis |
| 7 | Posts Grid | `grid; repeat(2,1fr); gap:20px` | HORIZONTAL WRAP | itemSpacing:20, counterAxisSpacing:20 |

### Tier 3 — 카드 컴포넌트

| # | 이름 | CSS 원본 | AL 방향 | 주요 속성 |
|---|---|---|---|---|
| 8 | Post Card (일반) | `flex-col; overflow:hidden` | VERTICAL | FIXED, itemSpacing:0 |
| 9 | Featured Card | `grid; 1fr 1fr` | HORIZONTAL | FIXED height:280, itemSpacing:0 |
| 10 | Card Body | `flex-col; pad:20px; gap:10px` | VERTICAL | pad:20, gap:10, FILL width |

### Tier 4 — 사이드바

| # | 이름 | CSS 원본 | AL 방향 | 주요 속성 |
|---|---|---|---|---|
| 11 | Sidebar | `flex-col; gap:28px` | VERTICAL | gap:28, FIXED width:300 |
| 12 | Sidebar Widget | `padding:22px` | VERTICAL | padAll:22, AUTO height |
| 13 | Category Item | `flex; space-between; pad:8px 10px` | HORIZONTAL | SPACE_BETWEEN, pad:8 10 |
| 14 | Tags Container | `flex; flex-wrap:wrap; gap:8px` | HORIZONTAL WRAP | itemSpacing:8, counterAxisSpacing:8 |
| 15 | Newsletter Form | `flex-col; gap:8px` | VERTICAL | gap:8, FILL width |

---

## 상향식 구현 순서

```
Step 1   텍스트 노드 헬퍼 정의 (mkFlexText — x,y 없이 부모에 append)
Step 2   Card Body 구성 (VERTICAL, pad:20, gap:10) + 텍스트 자식 추가
Step 3   Thumbnail Frame 구성 (FIXED 크기, 색상)
Step 4   Post Card 구성 — thumb + body를 VERTICAL AL로 묶기
Step 5   Featured Card 구성 — thumb + body를 HORIZONTAL AL로 묶기
Step 6   Posts Grid 구성 — 카드들을 VERTICAL AL로 묶기
Step 7   Filter Tabs Row 구성 (이미 완성)
Step 8   Section Header Row 구성 — 제목 + filter를 SPACE_BETWEEN으로 묶기
Step 9   Posts Column 구성 — Section Header + Posts Grid를 VERTICAL로 묶기
Step 10  Sidebar Widget들 구성 (각각 VERTICAL + padding)
Step 11  Category Items 구성 (HORIZONTAL SPACE_BETWEEN)
Step 12  Tags Container 구성 (HORIZONTAL WRAP)
Step 13  Newsletter Form 구성 (VERTICAL: input frame + button)
Step 14  Sidebar 구성 — 3개 위젯을 VERTICAL로 묶기
Step 15  Main Layout 구성 — Posts Column + Sidebar를 HORIZONTAL으로 묶기
Step 16  Header 구성 (HORIZONTAL SPACE_BETWEEN)
Step 17  Hero 구성 (VERTICAL + padding)
Step 18  Footer 구성 (HORIZONTAL SPACE_BETWEEN)
Step 19  Root Frame 구성 — Header + Hero + Main Layout + Footer를 VERTICAL로 묶기
Step 20  Mobile 동일하게 반복 (PAD:20, 단일 컬럼)
```

---

## 헬퍼 함수 재설계

```javascript
// 기존 (절대좌표 — V1.0/V2.0 방식, Phase 1에서 계속 사용)
mkRect(parent, x, y, w, h, colorKey, opts)
mkText(parent, x, y, content, colorKey, opts)
mkFrame(parent, x, y, w, h, colorKey, opts)

// V2.1 신규 — 상향식 AL 구성용 (x,y 없음)
mkAutoFrame(parent, name, direction, opts)
  // direction: "HORIZONTAL" | "VERTICAL"
  // opts: { pad, padH, padV, padTop, padBot, gap, w, h, fill, radius, stroke, spaceBetween, centerAxis }

mkFlexText(parent, content, colorKey, opts)
  // opts: { textStyle, fillStyle, fill: "FILL" | "HUG" }
  // 부모 AL 컨테이너 안에서 x,y 없이 쌓이는 텍스트

mkSpacer(parent)
  // layoutGrow = 1 인 투명 빈 프레임 — CSS의 flex: 1 역할
  // Card Body에서 Excerpt와 Meta 사이의 남은 공간을 채울 때 사용
```

---

## Phase 구조 (알림 흐름 유지)

상향식으로 구현해도 3-Phase 알림 흐름은 유지한다.

```
Phase 1 — buildPC() / buildMobile()
  내부적으로 상향식(leaf → root)으로 구성
  AL이 빌드 시점에 적용됨
  "코드를 피그마로 옮기는 중..." → "PC 완료" → "Mobile 완료"

Phase 2 — 스타일 등록 확인 메시지
  "스타일 37개 분석 완료"

Phase 3 — applyAL_tierN() 함수들
  Phase 1에서 이미 AL이 적용되었으므로
  Phase 3는 "검증 및 보정" 역할로 전환
  또는 Phase 1/3를 통합하여 단순화 가능
```

---

## 버전 관리

| 버전 | 위치 | 설명 |
|---|---|---|
| V1.0 | `releases/v1.0/code.js` | 절대 위치, 스타일 없음 |
| V2.0 | `releases/v2.0/code.js` | 스타일 등록 + 버튼만 AL |
| V2.1 | `code.js` (진행 중) | 상향식 AL 전면 적용 |
