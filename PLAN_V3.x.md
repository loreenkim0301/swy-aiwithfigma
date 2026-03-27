# V3.x 계획서 — Figma MCP 트랙

> **상태**: 설계 중 (2026-03-27)
> V2.x에서 Plugin API로 검증한 것을 MCP로 재현할 수 있는지,
> 그리고 MCP이기 때문에 가능한 것이 무엇인지를 탐색한다.

---

## 1. 왜 V3.x인가 — V2.x와의 근본적 차이

V2.x는 "무엇을 만들어야 하는지 코드로 명시"해야 했다.
V3.x는 "결과물을 보여주거나 의도를 말하면 AI가 판단"한다.

```
V2.x 흐름
개발자가 JS 코드 작성 → 플러그인 실행 → Figma에 노드 생성
(결정권: 개발자)

V3.x 흐름
디자이너/기획자가 프롬프트 작성 → Claude + MCP → Figma에 반영
(결정권: AI + 사람)
```

---

## 2. Plugin API vs MCP — 능력 비교

### 할 수 있는 것

| 항목 | Plugin API (V2.x) | MCP (V3.x) |
|---|---|---|
| 노드 생성 | ✅ 정확한 w/h/x/y 지정 | ✅ (use_figma) |
| Auto Layout 설정 | ✅ padding/gap 정밀 제어 | △ AI가 판단, 정밀도 낮음 |
| Design Token 연결 | ✅ styleId 직접 지정 | △ AI가 색상 매핑 추론 |
| 컴포넌트 생성 | ✅ createComponent() | △ (현재 MCP 도구 미지원) |
| HTML → Figma 변환 | ❌ (코드로 직접 구현 필요) | ✅ generate_figma_design |
| 브라우저 렌더링 캡처 | ❌ | ✅ 100% 시각 충실도 |
| 기존 디자인 읽기·분석 | △ (선택 노드 한정) | ✅ get_design_context |
| 자연어로 수정 지시 | ❌ | ✅ 프롬프트로 가능 |
| 오프라인 실행 | ✅ | ❌ (Claude API 필요) |
| 결과 재현성 | ✅ 동일 입력 → 동일 출력 | △ AI 판단이므로 가변 |

### 결론

```
Plugin API = 정밀한 구조 제어, 핸드오프 품질 보장
MCP        = 빠른 시각화, 자연어 수정, 탐색·발산 단계에 강점

경쟁 관계가 아닌 단계별 역할 분담
  아이디에이션 → MCP (빠른 시각화)
  구조화·핸드오프 → Plugin API (정밀 제어)
```

---

## 3. 현재 MCP 도구 목록 및 실현 가능성 판단

| MCP 도구 | 용도 | V3.x 활용 가능성 |
|---|---|---|
| `generate_figma_design` | HTML → Figma 캡처 | ✅ V3.0 핵심 |
| `get_design_context` | 노드 구조·스타일 읽기 | ✅ V3.1 분석 기반 |
| `use_figma` | Figma에 쓰기 작업 | ✅ V3.1 스타일 주입 |
| `get_screenshot` | 현재 뷰 캡처 | △ 검토·확인용 |
| `get_variable_defs` | Variable(토큰) 읽기 | △ V3.1 토큰 매핑 참고 |
| `search_design_system` | 디자인 시스템 검색 | △ 향후 활용 검토 |

---

## 4. 버전별 목표

### V3.0 — 프롬프트 → HTML → Figma 즉시 변환 ✅ 완료

**검증한 것**: `generate_figma_design`으로 HTML 렌더링을 Figma에 그대로 캡처
**확인된 한계**: 레이어 flat, Design Token 없음, Auto Layout 없음 → 핸드오프 불가

---

### V3.1 — 캡처 결과물 후처리: Design Token + Auto Layout 자동 적용

**디자이너 페인포인트**
> "MCP로 가져왔는데 레이어가 flat하고 스타일 이름이 없다.
> 핸드오프를 하려면 결국 또 손으로 정리해야 한다."

**목표**
V3.0 캡처 결과물에 V2.x 수준의 핸드오프 품질을 자동으로 부여한다.

**기술 설계 — 2가지 접근**

**방법 A: Plugin Mode B 활용 (단기, 현실적)**
```
MCP 캡처 (V3.0) → 전체 선택 → Plugin 실행 (Mode B)
                              → 색상·폰트 값으로 가장 가까운 Token 자동 매핑
```
- 이미 구현된 Mode B(`findClosestColorStyle`, `findMatchingTextStyle`) 재사용
- AL 적용은 불가 (flat 구조를 분석해 그룹화하는 것은 Plugin으로 한계)
- **빠르게 검증 가능**

**방법 B: MCP 분석 + use_figma 주입 (중기, AI 활용)**
```
get_design_context → Claude가 색상/폰트 분석
                   → STYLE_MAP과 대조해 Token 이름 추론
                   → use_figma로 fillStyleId / textStyleId 주입
```
- AL 구조 재편: Claude가 좌표 기반으로 레이아웃 그룹 추론 후 AL 설정
- 정밀도는 Plugin API보다 낮으나, 코드 없이 가능

**검증 순서**
1. 방법 A로 Token 자동 매핑이 실용적인지 확인
2. AL 적용 범위 결정 (전체 vs 주요 컨테이너만)
3. 방법 B의 AI 분석 정확도 측정

---

### V3.2 — 컴포넌트 자동 감지 및 생성

**디자이너 페인포인트**
> "반복되는 카드 UI가 보이는데 컴포넌트로 만들려면 하나하나 수동이다.
> AI가 반복 패턴을 감지해서 자동으로 컴포넌트로 만들어줬으면 한다."

**목표**
캡처된 flat 레이어에서 반복 패턴을 감지해 컴포넌트로 자동 생성.

**기술 설계**
```
get_design_context → Claude가 레이어 구조 분석
                   → 동일 패턴(크기·구조·폰트)을 가진 그룹 감지
                   → 첫 번째를 마스터 컴포넌트로, 나머지를 인스턴스로 변환
```

**불확실성**
- MCP `use_figma`가 `createComponent()` 수준의 제어를 지원하는지 미확인
- Figma Config 2025 발표의 AI 컴포넌트 자동 제안 기능과 연계 가능성 탐색 필요

---

## 5. V3.x 전체 파이프라인 목표

```
[목표 상태]

프롬프트
  → Claude가 HTML 생성
    → generate_figma_design (캡처, V3.0)
      → get_design_context + use_figma (Token + AL 주입, V3.1)
        → 반복 패턴 감지 + 컴포넌트 변환 (V3.2)
          → 핸드오프 가능 상태

[V2.x와 비교]
V2.x: 코드로 설계한 구조를 Figma에 구현
V3.x: 브라우저에서 렌더링된 결과를 Figma로 가져와 후처리

최종 품질 목표: 두 방식 모두 동일한 핸드오프 품질 도달
```

---

## 6. 시작점 — V3.1 첫 번째 실험

**진입 조건**: V3.0에서 캡처한 Figma 파일이 있을 것 (이미 존재)

**첫 실험 계획**
1. V3.0 캡처 결과물을 Figma에서 전체 선택
2. Plugin Mode B 실행 → Token 자동 매핑 결과 확인
3. 매핑 성공률 측정 (몇 개 노드 중 몇 개에 Token이 연결됐는가)
4. AL 적용 가능 범위 결정

**성공 기준**
- Token 매핑 성공률 70% 이상 → 방법 A 유효
- AL 주요 컨테이너(Header, Hero, Card, Footer) 적용 가능 여부 확인
