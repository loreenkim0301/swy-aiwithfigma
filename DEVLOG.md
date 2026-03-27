# DEVLOG — figma-aiwithfigma

> 디자이너와 기획자의 페인포인트를 중심으로,
> 버전별 목표 · 시도 · 성공/실패 · 다음 단계를 기록합니다.

---

## 트랙 구조

| 트랙 | 방식 | 목표 |
|---|---|---|
| **V2.x** | Figma Plugin API | 코드 기반으로 "무엇이 필요한가" 직접 구현·검증 |
| **V3.x** | Figma MCP | 동일한 결과를 프롬프트 기반으로 대체 가능한지 검증 |

---

## V2.x — Figma Plugin API 트랙

---

### V1.0 — 2026-03-25

#### 디자이너 페인포인트
> "개발자가 만든 HTML을 보고 Figma에서 처음부터 다시 그려야 한다."

#### 목표
HTML/CSS 블로그 프로토타입을 Figma 플러그인으로 자동 변환.
디자이너가 수작업으로 그리지 않아도 되는 첫 번째 버전.

#### 접근 방식
- 모든 요소를 절대좌표(x, y, w, h)로 배치
- `mkRect`, `mkText`, `mkFrame` 헬퍼로 CSS 좌표값을 그대로 변환
- 스타일 없이 색상값만 직접 지정

#### 결과 ✅
- PC 1440px / Mobile 375px 프레임 생성 성공
- Featured Card + 2열 그리드 + Sidebar(Categories, Tags, Newsletter) 구조 재현

#### 해결 못한 것 → V2.0으로 이어진 이유
- **인스펙터에 스타일 이름이 없음**: 개발자가 색상·폰트 이름을 알 수 없어 핸드오프 불가
- **Auto Layout 없음**: 모든 수치가 절대값 → 반응형 구조 Figma에서 확인 불가
- **폰트 로딩 순서 오류**: 간헐적 플러그인 크래시 발생

---

### V2.0 — 2026-03-25

#### 디자이너 페인포인트
> "Figma 인스펙터를 개발자에게 보여줘도 색상·폰트 이름이 없어서 의미가 없다.
> 개발자가 수치를 다시 측정하고 색상 코드를 직접 써야 한다."

#### 목표
Design Token 시스템 도입 → 인스펙터에서 스타일 이름을 읽을 수 있는 핸드오프 완성.

#### 추가된 것

**Design Token 37개 자동 등록**
- Color Styles 13개: `Background/Primary`, `Text/Muted`, `Accent/Primary` 등
- Text Styles 18개: `Display/Hero-PC`, `Heading/Card`, `Label/Category` 등
- Effect Styles 2개: `Shadow/Card-Default`, `Shadow/Card-Hover`
- Grid Styles 2개: `Grid/PC-1440`, `Grid/Mobile-375`

**Mode B (기존 노드에 스타일 연결)**
- 이미 만들어진 Figma 노드를 선택한 뒤 플러그인 실행 시
  색상/텍스트를 가장 가까운 등록 스타일에 자동 연결

#### 결과 ✅
- Figma 인스펙터에서 `Accent/Primary`, `Heading/Card` 등 이름 확인 가능
- 스타일 재사용으로 디자인 일관성 확보

#### 해결 못한 것 → V2.1로 이어진 이유
- **Auto Layout 미적용**: 버튼(`mkPillButton`)에만 AL 있고 나머지는 절대좌표
- **padding / gap 인스펙터 확인 불가**: 개발자가 레이아웃 수치를 여전히 직접 측정해야 함
- 핸드오프 품질이 절반 수준

---

### V2.1 — 2026-03-26

#### 디자이너 페인포인트
> "Figma 인스펙터에서 padding, gap을 읽을 수 없다.
> 개발자가 '이 여백이 몇 픽셀이에요?'라고 물어보면 Figma를 열고 직접 재야 한다."

#### 목표
CSS의 `display: flex / grid`에 해당하는 **모든 레이아웃 컨테이너에 Auto Layout 전면 적용**.
개발자가 인스펙터에서 `padding: 20px`, `gap: 16px` 값을 직접 읽을 수 있게 한다.

적용 대상 레이아웃 존 14개:
- Tier 1: Header, Hero, Main Layout, Footer
- Tier 2: Posts Column, Section Header Row, Posts Grid
- Tier 3: Post Card, Featured Card, Card Body
- Tier 4: Sidebar, Sidebar Widget, Category Item, Tags Container, Newsletter Form

---

#### 1차 시도 — 하향식(Top-Down) 후처리 ❌ 실패

**방식**: Phase 1에서 절대좌표로 모든 노드 생성 → Phase 3에서 상위 프레임부터 AL 후처리 적용

**발생한 문제들**

1. **Card Body 높이 붕괴**
   - 카드에 `layoutMode = "VERTICAL"` 설정 순간, Card Body sizing이 `"HUG"`로 리셋
   - `layoutSizingHorizontal = "FILL"` 재지정해도 부모-자식 sizing 충돌 연쇄 발생

2. **의도치 않은 자식 노드가 AL flow에 끼어드는 문제**
   - 썸네일 위의 이모지 TEXT 노드가 카드 직접 자식이어서
     `[썸네일 → 이모지 → Card Body]` 3단 구조로 쌓임 (설계 의도: 2단)

3. **Newsletter Form 자식 구조 오염**
   - placeholder 텍스트가 Form 직접 자식이어서
     `[input rect, 텍스트, button]` 3개가 세로로 쌓임 (설계 의도: 2개)

4. **Hero 텍스트 너비 수축**
   - VERTICAL AL 적용 후 텍스트가 HUG로 수축

**근본 원인**
```
만들고 나서 AL을 끼워 넣으려 했기 때문.

Figma AL 엔진은 노드 생성 시점부터 sizing 관계를 추적한다.
이미 만들어진 노드에 AL을 사후 적용하면 엔진이 sizing을 재계산하고
개발자가 지정한 크기와 충돌한다.
```

---

#### 2차 시도 — 상향식(Bottom-Up) 구성 ✅ 성공

**핵심 통찰**: CSS 렌더링 순서와 동일하게 빌드하면 충돌이 없다.

```
텍스트 (leaf)
  → Card Body (VERTICAL, pad:20, gap:10)
    → Post Card (VERTICAL, thumb + body)
      → Card Row (HORIZONTAL, gap:20)
        → Posts Grid (VERTICAL, gap:20)
          → Posts Column (VERTICAL, gap:28)
            → Main Layout (HORIZONTAL, pad:170, gap:44)
              → Root Frame (VERTICAL)
```

**핵심 규칙**
- 자식이 완성된 뒤 부모에 `appendChild`
- 부모에 AL 설정 시 자식 sizing이 이미 확정 → 충돌 없음
- x, y 절대좌표 불필요

**신규 헬퍼**
```javascript
mkAutoFrame(parent, name, direction, opts)
// direction: "HORIZONTAL" | "VERTICAL"
// opts: { w, h, pad, padH, gap, spaceBetween, centerCross, wrap, rowGap, ... }

mkFlexText(parent, content, colorKey, opts)
// x, y 없음. opts.hFill = true 시 layoutSizingHorizontal = "FILL"
```

---

#### 3차 버그 — resize()와 AUTO 높이 충돌 ❌ → 수정 ✅

**증상**: 루트 프레임 높이가 `1440×10`, `375×10`으로 고정. 콘텐츠는 보이지만 바운딩 박스 오류.

**원인**
```javascript
// 버그: AUTO 설정 이후 resize()가 덮어씀
f.primaryAxisSizingMode = "AUTO";  // ① AUTO 설정
f.resize(width, 10);               // ② resize()가 ①을 FIXED로 되돌림
```

**수정**
```javascript
// 올바른 순서: resize 먼저, AUTO는 이후에
f.resize(width, f.height);         // ① resize 먼저
f.primaryAxisSizingMode = "AUTO";  // ② AUTO는 resize 이후 설정
```

---

#### 4차 이슈 — Manifest 리로드 시 "object is not extensible" ❌ → 수정 ✅

**증상**: 플러그인을 manifest에서 재로드하면 `오류: object is not extensible` 발생

**원인 분석**
- `figma.notify({ timeout: Infinity })`: 최신 Figma API에서 Infinity 값 처리 오류
- `style.grids = JSON.parse(JSON.stringify(...))`: Grid Style 객체 할당 방식이
  일부 Figma 런타임 버전에서 non-extensible 오류 유발

**수정**
```javascript
// timeout: Infinity → 유한한 값으로 교체
figma.notify(msg, { timeout: 60000 });

// JSON.parse/stringify → 명시적 객체 생성으로 교체
style.grids = token.grids.map(function(g) {
  return { pattern: g.pattern, alignment: g.alignment,
           gutterSize: g.gutterSize, count: g.count,
           offset: g.offset, sectionSize: g.sectionSize };
});

// Grid Style 생성 전체를 try-catch로 감싸 실패 시 무시
try { ... createGridStyle ... } catch(e) { console.warn(e.message); }
```

---

#### 최종 결과

| 항목 | V1.0 | V2.0 | V2.1 |
|---|---|---|---|
| 프레임 자동 생성 | ✅ | ✅ | ✅ |
| Design Token (스타일 이름) | ❌ | ✅ 37개 | ✅ 동일 |
| Auto Layout | ❌ | 버튼만 | ✅ 14개 존 전체 |
| 인스펙터 padding / gap 확인 | ❌ | ❌ | ✅ |
| 개발자 핸드오프 품질 | 불가 | 절반 | ✅ 완전 |

#### 해결 못한 것 → V2.2로 이어질 이유
- **반복 요소가 컴포넌트가 아님**: Post Card가 5개 있어도 각각 개별 프레임
  - 하나를 수정하면 나머지를 수동으로 다 바꿔야 함
  - Assets 패널에 등록되지 않아 재사용 불가

---

### V2.2 — 2026-03-27

#### 디자이너 페인포인트
> "Post Card, Button, Badge가 반복되는데 컴포넌트가 아니어서
> 하나 바꾸면 나머지를 수동으로 다 수정해야 한다.
> Assets 패널이 텅 비어 있어서 디자인 시스템처럼 쓸 수 없다."

#### 목표
반복 요소를 `figma.createComponent()`로 자동 변환 → Assets 패널 등록 및 인스턴스로 재사용.

---

#### 핵심 설계 결정 — 컴포넌트 범위

> "모든 레이어를 컴포넌트로 만들어야 하나?"

컴포넌트화 기준을 세 가지로 정의:
1. **반복 사용** — 같은 구조가 2회 이상 등장
2. **상태 변화** — active / inactive / hover 등 variant가 필요
3. **독립 구현 단위** — 개발자가 별도 컴포넌트로 구현해야 하는 UI 단위

이 기준으로 10개 선정. Header, Hero, Footer는 1회 사용 섹션이므로 제외.

---

#### 1차 시도 — ComponentNode 중첩 오류 ❌

**증상**: `Post Card / Regular` 빌드 시 "Cannot move node. Reparenting would create a component inside a component" 오류

**원인**
```javascript
// 잘못된 방식 — Component 안에 Component 불가
var cardBody = mkAutoComponent("Card Body", ...); // ← ComponentNode
cardComp.appendChild(cardBody);                   // ← 오류 발생
```

**Figma 규칙 확인**
```
ComponentNode의 직접 자식 = FrameNode | InstanceNode | RectangleNode | TextNode
ComponentNode 안에 ComponentNode = 불가
```

**수정**
```javascript
// Card Body는 FrameNode로 생성 (mkAutoFrame, parent=null)
var cardBody = mkAutoFrame(null, "Card Body", "VERTICAL", { ... });
cardComp.appendChild(cardBody); // ✅ FrameNode는 가능
```

---

#### 2차 시도 — 컴포넌트 노드가 잘못된 페이지에 누수 ❌

**증상**: 컴포넌트 5개까지 생성 후 멈춤. Post Card 2개가 🧩 Components가 아닌 Page 3에 생성됨.

**원인**
```javascript
function buildAllComponents() {
  var savedPage = figma.currentPage;
  figma.currentPage = compPage;
  try {
    // ... 컴포넌트 빌드 ...
    figma.currentPage = savedPage; // ← try 본문 안에 있어서
                                   //    오류 발생 시 실행되지 않음
  }
  // finally 없음 → 에러 시 currentPage 복원 안 됨
}
```

**수정**
```javascript
try {
  // ... 컴포넌트 빌드 ...
} finally {
  figma.currentPage = savedPage; // ← 에러 여부와 무관하게 항상 실행
}
```

---

#### 3차 시도 — PC/Mobile 프레임이 🧩 Components 페이지에 생성 ❌

**증상**: V2.2 페이지가 비어있고, PC·Mobile 프레임이 🧩 Components 페이지에 배치됨.

**원인**
```javascript
// buildPC/buildMobile 내부
var root = mkAutoFrame(figma.currentPage, "PC — 1440px", ...);
//                     ↑ buildAllComponents()의 finally가 복원한
//                       savedPage = 초기 페이지 (🧩 Components가 됨)
//                       getOrMakePage("V2.2")가 설정한 V2.2 페이지가 아님
```

**수정**: `figma.currentPage`에 의존하지 않고 페이지를 명시적 인자로 전달

```javascript
var designPage = getOrMakePage("V" + PLUGIN_VERSION);
buildPC(designPage);
buildMobile(designPage);

function buildPC(page) {
  var root = mkAutoFrame(page, "PC — 1440px", ...); // ← 명시적 page 사용
}
```

---

#### 컴포넌트 커버리지 확정 — 10개

처음 7개에서 "핸드오프에 필수적인가?" 검토 후 3개 추가.

| # | 컴포넌트 | 추가 이유 |
|---|---|---|
| 1 | Tag / Default | Tags widget에 7회 반복 |
| 2 | Badge / Count | Category Item 내부 재사용 |
| 3 | Button / Pill — Active | Filter Tabs active 상태 |
| 4 | Button / Pill — Inactive | Filter Tabs inactive 상태 |
| 5 | Category / Item | Sidebar 4회 반복 |
| 6 | Post Card / Regular | Posts Grid 5회 반복 |
| 7 | Post Card / Featured | Featured 영역 핵심 컴포넌트 |
| 8 | Nav Link / Active | Header nav — 상태 포함, 개발자 router active class 참조 |
| 9 | Nav Link / Default | Header nav — 기본 상태 |
| 10 | Sidebar Widget | 동일 outer shell이 3회 (Categories, Tags, Newsletter) |

**Sidebar Widget 구현 방식**
```
Sidebar Widget (Component)
  └── 위젯 제목 (TEXT, overridable)
  └── Content (FRAME, slot — appendChild로 내용 주입)

// 인스턴스 생성 후 Content slot에 content 주입
var inst = COMPONENTS.sidebarWidget.createInstance();
var slot = inst.findOne(n => n.name === "Content");
slot.appendChild(catList); // ← Figma API에서 instance 내 FrameNode에 appendChild 가능
```

---

#### 최종 결과

| 항목 | V2.1 | V2.2 |
|---|---|---|
| Design Token | ✅ 37개 | ✅ 동일 |
| Auto Layout | ✅ 14개 존 | ✅ 동일 |
| 컴포넌트 | ❌ 없음 | ✅ 10개 |
| Assets 패널 등록 | ❌ | ✅ |
| 인스턴스 사용 | ❌ | ✅ (모든 반복 요소) |
| 개발자 핸드오프 품질 | 스타일·AL 완전 | 스타일·AL·컴포넌트 완전 |

#### 남은 것 → V2.3으로 이어질 이유
- 컴포넌트가 단일 상태만 있음 (active/inactive는 별도 컴포넌트, Variants 아님)
- Variants로 묶으면 프로토타이핑에서 상태 전환 가능

---

### V2.3 — Variants (후순위 보류)

#### 결정 배경

Variants가 실제로 필요한지 재검토한 결과, **개발자 핸드오프 목적에서는 필수가 아니라는 결론**에 도달했다.

| 관점 | 판단 |
|---|---|
| 개발자 핸드오프 | V2.2의 Active/Inactive 별도 컴포넌트로 스타일 차이 확인 가능. Variants 없어도 무관. |
| 디자이너 프로토타이핑 | Figma 인터랙션에서 상태 전환을 설정할 때 Variants가 유용. 단, 이 프로젝트의 1차 목적이 아님. |
| 디자인 시스템 라이브러리 | Variants가 중요하지만, 팀 공유 라이브러리 구축 단계에서 다룰 주제. |

**V2.x는 V2.2에서 핸드오프 자동화 목적 완성.**
V2.3은 필요 시 별도 추진하며, 현재는 V3.x (MCP 트랙)으로 이동한다.

---

## V3.x — Figma MCP 트랙

> V2.x와 동일한 결과를 목표로 하되,
> **플러그인 코드 없이** 프롬프트 → MCP → Figma 파이프라인으로 구현.

---

### V3.0 — 2026-03-26

#### 디자이너 페인포인트
> "기획자가 원하는 걸 말로 설명하면 내가 Figma에서 그려줘야 한다.
> 방향을 보여주는 것만으로도 반나절 이상 걸린다."

#### 목표
프롬프트 → HTML → Figma 즉시 변환.
기획자와 디자이너가 **수 분 안에** 시각 결과물을 공유할 수 있는 파이프라인 검증.

#### 테스트한 것

**A/B 비교 실험 (2026-03-26)**
- 좌측: V2.1 플러그인으로 생성한 구조화 결과물
- 우측: `blog-prototype/index.html`을 Figma MCP로 캡처한 결과물

**MCP 캡처 방법**
```bash
# 1. 로컬 서버 실행
cd blog-prototype && python3 -m http.server 9876

# 2. HTML에 캡처 스크립트 추가
<script src="https://mcp.figma.com/mcp/html-to-design/capture.js" async></script>

# 3. Claude Code에서 MCP 도구 실행
# mcp__figma__generate_figma_design → outputMode: existingFile → fileKey
```

#### 결과 ✅

| 항목 | V2.1 (Plugin) | V3.0 (MCP 캡처) |
|---|---|---|
| 시각 충실도 | 코드가 정의한 구조 | 브라우저 렌더링 100% |
| 레이어 구조 | AL + 토큰 적용 | flat (절대좌표) |
| Design Token | ✅ 자동 등록 | ❌ 없음 |
| Auto Layout | ✅ 14개 존 | ❌ 없음 |
| 소요 시간 | 수 분 (플러그인 실행) | 수 분 (캡처) |
| 진입 장벽 | JS 코드 필요 | 프롬프트만으로 가능 |

#### 핵심 발견
- MCP 캡처는 **탐색·발산** 단계에 적합 (빠른 시각화, 방향 검토)
- Plugin은 **수렴·핸드오프** 단계에 적합 (구조화, 토큰, AL)
- 두 방식은 경쟁이 아닌 **단계별 역할 분담**

#### 해결 못한 것 → V3.1로 이어질 이유
- MCP 캡처 결과물이 flat 구조여서 개발자 핸드오프 불가
- Design Token, Auto Layout을 별도로 적용해야 함

---

### V3.1 — 예정

#### 디자이너 페인포인트
> "MCP로 가져왔는데 레이어가 flat하고 스타일 이름이 없다.
> 결국 핸드오프를 위해 또 손으로 정리해야 한다."

#### 목표
MCP 캡처 결과물에 Design Token + Auto Layout 자동 적용.
V2.1과 동일한 핸드오프 품질을 MCP 방식으로 달성.

---

### V3.2 — 예정

#### 디자이너 페인포인트
> "반복되는 카드 UI가 보이는데 컴포넌트로 만들려면 하나하나 수동이다.
> AI가 반복 패턴을 보고 자동으로 컴포넌트로 만들어줬으면 한다."

#### 목표
Figma AI가 캡처된 프레임에서 반복 패턴 자동 감지 → 컴포넌트 생성.
(Figma Config 2025 발표 기능 활용)
V2.3과 동일한 결과를 플러그인 코드 없이 달성.

---

## CSS → Figma Auto Layout 매핑 참고

| CSS | Figma API |
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
