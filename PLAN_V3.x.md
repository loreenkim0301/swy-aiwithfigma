# V3.x 계획서 — Figma MCP 트랙

> **상태**: 설계 확정 (2026-03-27)
> **비교 대상**: V2.x (Plugin API) vs V3.x (MCP)
> **핵심 질문**: 동일한 결과물을 MCP로 만들 수 있는가? 만든다면 무엇이 다른가?

---

## 1. 비교 구조

V2.x와 V3.x는 **같은 목표를 다른 방법으로** 달성하는 평행 트랙이다.

```
목표: 디자이너가 프롬프트에서 핸드오프 가능한 Figma 파일을 얻는다

V2.x — 코드 중심
  사람이 JS 코드로 모든 것을 정의한다
  → 플러그인이 Figma에서 실행된다
  → 결과물: 정밀하지만 코드를 알아야 쓸 수 있다

V3.x — AI 중심
  사람이 의도만 말한다
  → Claude + MCP가 Figma에서 직접 실행한다
  → 결과물: 덜 정밀할 수 있지만 누구나 쓸 수 있다
```

같은 단계를 병렬로 쌓는다:

| 단계 | V2.x (Plugin API) | V3.x (MCP) |
|---|---|---|
| 1단계 | V2.0 — Design Token 등록 | V3.0 — MCP로 Design Token 등록 시도 |
| 2단계 | V2.1 — Auto Layout 전면 적용 | V3.1 — MCP로 Auto Layout 적용 시도 |
| 3단계 | V2.2 — 컴포넌트 생성·인스턴스 | V3.2 — MCP로 컴포넌트 생성 시도 |

---

## 2. V2.x vs V3.x — 방법론 차이

### 코드를 누가 쓰는가

```
V2.x
  사람(개발자)이 figma.createFrame(), figma.createComponent() 등을 직접 코딩
  → 코드 = 설계도. 코드가 없으면 아무것도 안 됨

V3.x
  Claude가 use_figma, generate_figma_design 등 MCP 도구를 자율 실행
  → 프롬프트 = 설계도. 코드 없이도 Figma가 바뀜
```

### 실행 주체가 누구인가

```
V2.x
  사람이 Figma Desktop에서 플러그인을 직접 실행
  진입장벽: manifest.json 설치 + Figma Desktop 필요

V3.x
  Claude Code / Claude Desktop에서 대화하면 Figma가 바뀜
  진입장벽: Claude + Figma MCP 1회 연결
```

### 결과물의 성격

```
V2.x: 재현 가능 (같은 코드 → 항상 같은 결과)
V3.x: 가변적 (Claude의 판단이 개입 → 실행마다 다를 수 있음)
```

---

## 3. 현재 MCP에서 가능한 것

Figma MCP 서버가 제공하는 도구 중 V3.x에 실제로 쓸 수 있는 것:

| 도구 | 하는 일 | V3.x 사용 단계 |
|---|---|---|
| `generate_figma_design` | HTML 페이지를 Figma에 캡처 | V3.0 시작점 |
| `get_design_context` | Figma 파일의 노드 구조·스타일을 읽음 | V3.1 분석 |
| `use_figma` | Figma에 노드 생성·수정·삭제 | V3.1 적용 |
| `get_variable_defs` | 파일에 등록된 Variables(토큰) 읽기 | V3.1 참고 |
| `get_screenshot` | 현재 뷰 이미지 캡처 | 검토·확인 |

**현재 MCP로 불확실한 것 (Plugin API는 확실히 가능)**
- `figma.createComponent()` 수준의 컴포넌트 생성
- `fillStyleId`, `textStyleId` 직접 지정 (Design Token 정밀 연결)
- Auto Layout `layoutSizingHorizontal = "FILL"` 등 세밀한 sizing 제어

---

## 4. 버전 정의

### V3.0 — HTML → Figma 캡처, V2.0과 품질 비교

**목표**
`generate_figma_design`으로 blog-prototype을 Figma에 캡처하고,
V2.0 결과물과 나란히 놓고 품질 차이를 정확히 측정한다.

**실험 방법**
```
1. blog-prototype 로컬 서버 실행 (python3 -m http.server 9876)
2. generate_figma_design 실행 → Figma 캡처
3. V2.0 결과물 옆에 배치, 항목별 측정
```

**측정 항목**

| 항목 | V2.0 | V3.0 예상 |
|---|---|---|
| Design Token 연결 | ✅ 37개 | ❌ 없음 |
| Auto Layout | ❌ | ❌ flat |
| 레이어 구조 | 설계된 계층 | flat (절대좌표) |
| 시각 충실도 | 코드 정의 수준 | 브라우저 렌더링 100% |
| 핸드오프 가능 여부 | 부분 | 불가 |

**V3.0이 답해야 하는 질문**
- MCP 캡처 결과물이 디자이너에게 얼마나 유용한가?
- 어떤 항목이 자동 후처리로 보완 가능한가?

---

### V3.1 — MCP로 Design Token + Auto Layout 적용, V2.1과 품질 비교

**목표**
V3.0 캡처 결과물에 V2.1 수준의 품질을 MCP로 자동 부여할 수 있는지 검증한다.

**접근 방법**
```
get_design_context
  → Claude가 색상값·폰트를 읽음
  → V2.x STYLE_MAP과 대조해 Token 이름 추론
  → use_figma로 스타일 주입 시도

Auto Layout:
  → Claude가 좌표 기반으로 레이아웃 그룹 추론
  → use_figma로 AL 설정 시도
```

**V3.1이 답해야 하는 질문**
- `use_figma`가 Design Token을 V2.x 수준으로 정밀하게 연결할 수 있는가?
- Auto Layout을 MCP로 설정하면 V2.1과 같은 품질이 나오는가?
- 불가능하다면 → "V2.x Plugin + V3.x MCP 하이브리드"를 정식으로 정의한다.

---

### V3.2 — MCP로 컴포넌트 생성, V2.2와 품질 비교

**목표**
V2.2에서 Plugin API로 만든 컴포넌트 10개를 MCP로 생성할 수 있는지 검증한다.

**불확실성**
- Figma MCP `use_figma`가 `createComponent()` 수준을 지원하는지 현재 미확인
- 지원하지 않는다면 → V3.2의 결론 자체가 "MCP 한계 확인"

**V3.2가 답해야 하는 질문**
- MCP만으로 V2.2와 동일한 컴포넌트 구조를 만들 수 있는가?
- 불가능하다면, V2.x와 V3.x의 역할 분담을 어떻게 최종 정의할 것인가?

---

## 5. 최종 비교 목표

V3.x 전체가 끝났을 때 이 표를 완성하는 것이 목표다.

| 항목 | V2.x (Plugin) | V3.x (MCP) | 비고 |
|---|---|---|---|
| Design Token | ✅ | ? | V3.1에서 측정 |
| Auto Layout | ✅ | ? | V3.1에서 측정 |
| 컴포넌트 | ✅ | ? | V3.2에서 측정 |
| 진입장벽 | 높음 (설치 필요) | 낮음 (프롬프트) | |
| 시각 충실도 | 코드 정의 수준 | 브라우저 100% | V3.0에서 확인 |
| 결과 재현성 | 100% | ? | |
| 핸드오프 가능 | ✅ | ? | |

**검증할 가설**
> MCP는 탐색·발산(빠른 시각화)에 강하고,
> Plugin API는 수렴·핸드오프(정밀 구조화)에 강하다.
> 두 방식은 경쟁이 아닌 워크플로우 단계별 역할 분담이다.
>
> — 이 가설이 맞는지 V3.x 실험으로 검증한다.
