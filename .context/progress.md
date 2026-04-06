# Progress: jp-legal-tech

## 완료 (2026-04-03~04)

### Google File Search 기반 유사 판례 검색
- Google File Search API 연동 (google-genai SDK)
- 배치 병렬 업로드: 30,566건 → 577파일 (50건/파일), ~8분
- 하이브리드 검색: File Search (시맨틱) + SQLite (키워드) → 14건+ 결과
- 5개 API 엔드포인트: similar, analyze(SSE), timeline, filters, store-status
- 프론트엔드 검색 페이지: 검색 + 필터 + 결과 카드 + AI 분석 스트리밍 + 타임라인 차트

### 야간 자율 개선 작업 (2026-04-04)
- **검색 SSE 수정**: 문장 단위 스트리밍, 에러 JSON 구조화
- **타임라인 개선**: 날짜 없는 케이스 필터링, 폴백 개선, Invalid Date 방어
- **검색 페이지 UX**: 스켈레톤 로딩, 빈 상태 안내, 에러 리트라이, 모바일 반응형
- **규제 페이지 일본어화**: 모든 한국어 → 일본어 (에이전트 작업)
- **에러 처리 개선**: 케이스 상세(404/500 구분, 스켈레톤), 판사(NaN 방어), 대시보드(빈 상태) (에이전트 작업)
- **네비게이션 개선**: 활성 상태 표시, 모바일 햄버거 메뉴, 규제 트래킹 링크 추가
- **랜딩 페이지**: FeatureRegulation 섹션 추가, 번호 정리 (01~04)
- **Skeleton 컴포넌트**: 공통 재사용 가능한 스켈레톤 (`frontend/src/components/Skeleton.tsx`)
- **관련 판례 API**: `GET /api/cases/{id}/related` + 케이스 상세 UI
- **배포 준비**: CORS 환경변수화, .dockerignore, Dockerfile HEALTHCHECK
- **모바일 반응형**: 케이스 상세 메타 그리드, 검색 필터바

## Store 정보
- Store ID: `jplegalcases-iuozyrp24ykx`
- Active: 577 파일 (약 28,850건)
- Size: 30.5MB

## 완료 (2026-04-06)

### 판례 사실관계 AI 시각화 기능
일본 법인 팀원 피드백 반영: 판결문의 복잡한 사실관계를 차트로 시각화
- **백엔드**: `fact_viz_service.py` — Claude AI로 판결문에서 시계열 타임라인 + 당사자 관계도 추출
  - 사실 섹션 regex 추출 (fallback: gist+case_gist+전문 앞 8000자)
  - asyncio.gather 병렬 생성 (5-15초)
  - DB 캐시 (`Case.fact_viz_json` 컬럼)
  - source_text 근거 추적 (각 이벤트/관계에 원문 인용 포함)
- **API**: `POST /api/cases/{id}/visualize` SSE 엔드포인트
- **프론트엔드**: 3개 새 컴포넌트
  - `FactTimeline.tsx` — 수직 타임라인, 카테고리별 색상, 클릭 시 원문 인용 표시
  - `RelationshipDiagram.tsx` — SVG 적응형 레이아웃 (2-3노드 좌우, 4+ 원형)
  - `FactVisualizationPanel.tsx` — 오케스트레이터 (SSE, 탭, 진행 상태, 에러/재���도)
- **테스트**: `test_fact_viz.py` — extract_fact_section 순수 함수 테스트 6개 (all pass)
- **Eng Review**: gstack /plan-eng-review + Codex outside voice 완료

### 추가 개선 (2026-04-06)
- **Codex 리뷰 버그 수정 3건**: 검색 필터 미적용, 판례 수 계산 오류, 배지 enum 불일치
- **i18n 케이스 상세 페이지**: 모든 라벨/섹션 제목/에러 메시지 ja/ko/en 번역 대응
- **시각화 패널 i18n**: 버튼, 탭, 진행 메시지 번역 대응
- **courts.go.jp 링크 수정**: 구 URL(404) → 새 검색 페이지 링크로 변경

## K8s 배포 준비 (2026-04-06)

### 코드 변경 — 완료
- [x] pyproject.toml: authlib, itsdangerous, httpx 추가 + uv.lock 생성
- [x] ops/Dockerfile: Multi-stage (Next.js standalone + Python + Node.js)
- [x] scripts/entrypoint.sh: FastAPI(8000) + Next.js(3000) 동시 실행
- [x] frontend/next.config.ts: `output: 'standalone'` + API rewrites
- [x] OIDC 인증: oidc_client.py, api/auth.py, OIDCAuthMiddleware, SessionMiddleware
- [x] Frontend: AuthContext, LoginPage, ConditionalShell에 사용자 표시/로그아웃
- [x] CORS: wildcard → frontend_url 제한
- [x] CI/CD: _docker-build.yaml, deploy-staging.yaml
- [x] 커밋: `3ce4273`

### saas-helm-charts PR — 리뷰 대기
- [x] PR: https://github.com/allganize/saas-helm-charts/pull/496
  - Chart.yaml dependency, values(서비스/secrets/configmap), 자동배포 등록
  - 도메인: jp-legal-tech.allganize.dev

### 수동 작업 — 완료
- [x] GitHub repo transfer: `allganize/jp-legal-tech` 완료
- [x] Alli OIDC 클라이언트 등록 → CLIENT_ID `caa158f8b811a78b2058670c` → PR configmap 반영
- [x] AWS Secrets Manager `dev/jp-legal-tech` 5개 키 등록 완료 (Vault OIDC → aws-ops)

## 다음 할 일
1. saas-helm-charts PR #496 Platform 팀 리뷰 + 머지 대기
2. main push → CI/CD → 배포 검증
3. 팀 공유 (Slack 공지)
