# AI × Figma — 디자이너 워크플로우 자동화 실험실

> 디자이너와 기획자가 **프롬프트에서 디자인을 시작**할 수 있도록,
> 코드 생성 → Figma 변환 → 스타일·레이아웃·컴포넌트 자동화를 단계별로 실험한 오픈소스 프로젝트입니다.

---

## 왜 이 프로젝트를 만들었나

기존 워크플로우의 병목:
- 기획자가 기획서를 쓰면 → 디자이너가 Figma에서 **처음부터** 그린다
- "머릿속 아이디어 → 시각 결과물"까지 수 일이 걸린다
- 개발자 핸드오프 시 스타일 이름, padding, gap 값을 다시 측정해야 한다

이 프로젝트의 목표:
- 프롬프트 한 줄 → Figma 시각 결과물 (수 분)
- Auto Layout + Design Token이 자동 적용된 핸드오프 준비 완료 상태
- 디자이너는 **수정·브랜딩·판단**에만 집중

---

## 버전 구조

두 트랙으로 나뉩니다.

| 트랙 | 방식 | 버전 |
|---|---|---|
| **V2.x** | Figma Plugin API (코드 기반 자동화) | V2.1 ~ V2.3 |
| **V3.x** | Figma MCP (프롬프트 기반 자동화) | V3.0 ~ V3.2 |

V2.x는 "무엇이 필요한가"를 직접 구현하며 검증한 트랙,
V3.x는 동일한 결과를 MCP + AI로 대체할 수 있는지 검증하는 트랙입니다.

---

## V2.x — Figma Plugin API 트랙

### V2.1 — 코드 → Figma 프레임 + Design Token 자동 적용

**디자이너 페인포인트**
> "개발자가 준 코드를 보고 Figma에서 다시 그려야 한다.
> 색상과 폰트 이름이 없어서 인스펙터가 무의미하다."

**해결한 것**
- Claude가 생성한 블로그 HTML/CSS 구조를 Figma 프레임으로 변환
- Color Styles 13개, Text Styles 18개, Effect Styles 2개 자동 등록
- 인스펙터에서 `Accent/Primary`, `Heading/Card` 등 스타일 이름 바로 확인 가능
- PC 1440px + Mobile 375px 프레임 동시 생성

**사용법**
1. Figma Desktop → Plugins → Development → Import plugin from manifest
2. `manifest.json` 선택
3. 캔버스에서 아무것도 선택하지 않고 플러그인 실행
4. V2.1 페이지에 PC / Mobile 프레임 자동 생성

**결과물**
- Design Token이 적용된 Figma 프레임
- 개발자가 스타일 이름을 인스펙터에서 바로 읽을 수 있는 핸드오프 상태

---

### V2.2 — 컴포넌트 생성 및 Assets 패널 등록 ✅

**디자이너 페인포인트**
> "Post Card가 5개 있는데 각각 개별 프레임이다.
> 하나를 수정하면 나머지를 수동으로 다 바꿔야 한다.
> Assets 패널이 텅 비어 있어서 디자인 시스템처럼 쓸 수 없다."

**해결한 것**
- `figma.createComponent()`로 반복 요소 10개를 마스터 컴포넌트로 자동 생성
- 전용 페이지 🧩 Components에 모든 마스터 컴포넌트 정렬
- V2.2 디자인 페이지의 모든 반복 요소는 인스턴스(instance)로 배치
- Assets 패널에서 드래그·드롭 재사용 가능

**생성되는 컴포넌트 10개**

| 컴포넌트 | 사용처 |
|---|---|
| Tag / Default | Sidebar Tags |
| Badge / Count | Category Item 내부 |
| Button / Pill — Active | Filter Tabs 활성 |
| Button / Pill — Inactive | Filter Tabs 비활성 |
| Category / Item | Sidebar Categories |
| Post Card / Regular | Posts Grid |
| Post Card / Featured | 상단 Featured 영역 |
| Nav Link / Active | Header "홈" |
| Nav Link / Default | Header "카테고리", "소개" |
| Sidebar Widget | Categories, Tags, Newsletter 외관 |

**결과물**
- 🧩 Components 페이지: 마스터 컴포넌트 10개
- V2.2 페이지: PC 1440px + Mobile 375px (모든 반복 요소가 인스턴스)

---

### V2.3 — Variants 적용 (예정)

**디자이너 페인포인트**
> "버튼이 기본 상태만 있고 hover, active 상태가 없다.
> 프로토타이핑을 하려면 상태별 프레임을 수동으로 다시 만들어야 한다."

**해결할 것**
- Button / Pill, Nav Link, Post Card를 Component Set(Variants)으로 변환
- 상태별(Default / Active / Hover) 자동 생성
- Figma 프로토타이핑에서 상태 전환 바로 연결 가능

**예정 버전**: V2.3

---

## V3.x — Figma MCP 트랙

> V2.x와 **동일한 결과물**을 목표로 하되,
> 플러그인 코드 없이 **프롬프트 → MCP → Figma** 파이프라인으로 구현합니다.

### V3.0 — 프롬프트 → HTML → Figma 즉시 변환

**디자이너 페인포인트**
> "아이디어가 있는데 Figma에서 그리려면 최소 반나절이다.
> 기획자가 말로 설명한 걸 내가 시각화해줘야 한다."

**해결한 것**
- 기획자가 요구사항을 프롬프트로 작성
- Claude가 HTML/CSS 생성
- Figma MCP가 브라우저 렌더링을 100% 그대로 Figma 프레임으로 변환
- 수 분 안에 시각 결과물 확보

**사용법**
1. Claude에게 원하는 페이지 구조를 설명 (한국어 가능)
2. Claude가 생성한 HTML을 로컬 서버로 실행
3. Figma MCP `generate_figma_design` 도구로 캡처
4. 현재 Figma 파일에 즉시 추가

**V2.x와의 차이**
| | V2.x (Plugin) | V3.0 (MCP) |
|---|---|---|
| 진입 장벽 | JS 코드 작성 필요 | 프롬프트만으로 가능 |
| 시각 충실도 | 코드가 정의한 구조 | 브라우저 렌더링 100% |
| 레이어 구조 | 설계된 구조 | flat (수동 정리 필요) |
| 속도 | 수 분 (플러그인 실행) | 수 분 (캡처) |

---

### V3.1 — 캡처 결과물에 Design Token + Auto Layout 자동 적용 (예정)

**디자이너 페인포인트**
> "MCP로 가져왔는데 레이어가 flat하고 스타일 이름이 없다.
> 개발자 핸드오프를 하려면 또 손으로 정리해야 한다."

**해결할 것**
- MCP 캡처 결과물을 분석해 색상·폰트를 Design Token에 자동 매핑
- 레이아웃 구조를 감지해 Auto Layout 적용
- V2.2와 동일한 핸드오프 품질을 MCP 방식으로 달성

**예정 버전**: V3.1

---

### V3.2 — 컴포넌트 자동 감지 및 생성 (예정)

**디자이너 페인포인트**
> "반복되는 카드 UI가 보이는데 컴포넌트로 만들려면 하나하나 수동이다.
> AI가 반복 패턴을 감지해서 자동으로 컴포넌트로 만들어줬으면 한다."

**해결할 것**
- Figma AI가 캡처된 프레임에서 반복 패턴을 자동 감지
- 컴포넌트 생성 및 Assets 패널 등록 (Figma Config 2025 발표 기능)
- V2.3과 동일한 결과를 플러그인 코드 없이 달성

**예정 버전**: V3.2

---

## 전체 파이프라인 비교

```
[V2.x 파이프라인]
프롬프트 → Claude가 HTML 작성 → 플러그인 실행
→ 스타일 자동 적용 (V2.1)
→ Auto Layout 자동 적용 (V2.2)
→ 컴포넌트 자동 생성 (V2.3)

[V3.x 파이프라인]
프롬프트 → Claude가 HTML 작성 → MCP 캡처 → Figma 변환 (V3.0)
→ 스타일 + AL 자동 적용 (V3.1)
→ 컴포넌트 자동 감지·생성 (V3.2)
```

---

## 설치 방법 (V2.x Plugin)

```bash
git clone https://github.com/your-repo/blog-figma-plugin.git
```

1. Figma Desktop 앱 실행
2. 메뉴 → Plugins → Development → Import plugin from manifest
3. 클론한 폴더의 `manifest.json` 선택
4. 플러그인 실행

**요구사항**
- Figma Desktop (Web 버전 불가)
- Node.js 불필요 (순수 Figma Plugin API)

---

## 설치 방법 (V3.x MCP)

```bash
claude mcp add --transport http figma https://mcp.figma.com/mcp
```

1. Claude Desktop 또는 Claude Code 실행
2. `/mcp` 명령어로 Figma MCP 인증 (OAuth)
3. Claude에게 원하는 디자인 요청

---

## 레포지토리 구조 — OSS vs Commercial

이 프로젝트는 두 트랙으로 관리됩니다.

```
blog-figma-plugin          ← 이 레포 (Public, MIT)
blog-figma-plugin-pro      ← 별도 Private 레포 (Commercial)
```

### OSS 버전 (이 레포)

- **대상**: 로컬에서 직접 테스트하고 싶은 디자이너·개발자
- **방식**: headless 플러그인 — 실행 즉시 프레임 생성, 완료 후 자동 닫힘
- **라이선스**: MIT — 자유롭게 수정·배포 가능
- UI 없음, `figma.notify()`로 진행 상황 표시

### Commercial 버전 (Private)

- **대상**: 팀 단위 사용, 결과 리포트 확인이 필요한 워크플로우
- **추가 기능**: Plugin UI 패널 — 생성 완료 후 컴포넌트·스타일·페이지 구조 리포트 표시
- OSS 코어(`src/code.js`)를 그대로 사용, `src/ui.html`만 추가

```
OSS 레포                     Commercial 레포
src/code.js ──────────────▶  src/code.js  (동일 코어)
manifest.json                src/ui.html  (추가)
                             manifest.json (ui 필드 추가)
```

**OSS에서 Commercial로 코어 업데이트하는 방법**
```bash
# Commercial 레포에서
git remote add oss https://github.com/your-repo/blog-figma-plugin.git
git fetch oss
git checkout oss/main -- src/code.js   # 코어만 가져오기
```

---

## 기여 방법

각 버전은 독립적인 실험 단위입니다.
V2.x 개선 또는 V3.x 파이프라인 구현에 기여할 수 있습니다.

- Issue: 페인포인트 또는 개선 아이디어 제안
- PR: 특정 버전 기능 구현

---

## 라이선스

MIT
