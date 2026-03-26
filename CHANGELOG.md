# Changelog

All notable changes to this project will be documented in this file.

---

## [v2.1.0] - 2026-03-26

### Added
- `mkAutoFrame` helper: AL이 설정된 채로 프레임 생성 (x,y 없음)
- `mkFlexText` helper: AL 컨테이너 전용 텍스트 노드 생성
- `applyBorderStroke` helper: 방향별 stroke 적용

### Changed
- **빌드 전략 전환**: 절대좌표 + Phase3 후처리 → 상향식(Bottom-Up) 구성
  - 빌드 순서: 텍스트 → Card Body → Card → Grid → Column → Page
  - AL이 빌드 시점에 즉시 적용되어 레이아웃 붕괴 없음
- `resize()` 이후 `primaryAxisSizingMode = "AUTO"` 설정 순서 수정
  - 기존: AUTO 설정 → resize() → AUTO가 FIXED로 덮어써짐 (버그)
  - 수정: resize() → AUTO 설정 → 정상 작동
- PC Posts Grid 구조 변경: 2열 카드를 `Card Row` HORIZONTAL 컨테이너로 묶음
- Sidebar Category Widget: `Category List` 중첩 컨테이너로 gap 분리 (title:16, items:2)

### Removed
- `applyAL_tier1/2/3/4` 후처리 함수 전체 제거
- `releases/` 폴더 기반 버전 관리 → Git tag 방식으로 전환

---

## [v2.0.0] - 2026-03-25

### Added
- Design Token 시스템: Color / Text / Effect / Grid 스타일 37개 등록
- Mode B: 기존 선택 노드에 스타일 연결 기능
- 단계별 progress 알림 (코드 변환 → PC 완료 → Mobile 완료 → 스타일 분석 → AL 1-4단계)
- `mkPillButton` 헬퍼: AL 기반 버튼 컴포넌트 (버튼에만 AL 적용)

### Changed
- v1.0 대비 스타일 시스템 전면 도입

---

## [v1.0.0] - 2026-03-25

### Added
- 최초 릴리즈
- PC 1440px / Mobile 375px 블로그 프로토타입 Figma 자동 생성
- 절대좌표 기반 빌드 (mkRect, mkText, mkFrame)
- Featured Card + 2열 그리드 + Sidebar (Categories, Tags, Newsletter)
