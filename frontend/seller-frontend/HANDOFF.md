# 셀러 프론트엔드 작업 인수인계

이 문서는 다른 채팅창에서 셀러 콘솔 프론트엔드 작업을 시작할 때 맥락을 빠르게 넘겨받기 위한 문서다. 세부 내용은 여기 나열한 원본 문서 경로에서 직접 읽는다.

## 1. 저장소 / 브랜치

- GitHub: `https://github.com/gyurim027/04-_shopdb2_2026.09.14.git`
- 프론트 작업은 새 브랜치에서 진행한다. 브랜치명이 아직 정해지지 않았다면 작업 시작 전 사용자에게 확인할 것.
- `main`에 직접 커밋 금지, PR 기반 병합.

## 2. 작업 착수 전 읽을 문서 (이 순서로)

1. `01_공통규칙/작업자별_착수프롬프트_0.2v_260914_16.08.md`
2. `01_공통규칙/shopdb2_백엔드_파일명_고정규칙_v0.5_2026.09.14.md` — 프론트에도 적용되는 공통 규칙이 있는지 확인 겸 일독
3. `01_공통규칙/02_사용자구조및서비스방향성_0.1v_260914_11.42.md`
4. `01_공통규칙/03_기능정의서_0.1v_260914_11.42.md`
5. `01_공통규칙/04_관리자권한매트릭스_0.1v_260914_11.42.md`
6. `docx/` — 셀러 기획서(기능정의서, 메뉴구조도)가 들어갈 폴더. 아직 비어 있으면 사용자에게 재업로드 요청.

## 3. 지금까지 끝난 일

- 셀러 콘솔 백엔드 MVP 7개 도메인(dashboard, products, inventory, orders, refunds, sales, info) 구현 완료, PR #6으로 `main` 병합됨.
- 로그인(`POST /api/auth/login`) 포함 3인 공통 인증 시스템 통합 완료, 실제 DB로 end-to-end 검증까지 마침.
- `SellerProfile` 모델 중복 문제 정리 완료 (`fix/seller-profile-dedupe` 브랜치, 커밋 `9b826a2`, **PR은 아직 미생성**).
- FastAPI 타이틀 `team4_shopdb2 Backend`로 변경됨.
- 루트 폴더 구조: `backend/`(백엔드, 이름 그대로), `shopdb2_seller_frontend/`(이 폴더), `docx/`(기획서), `01_공통규칙/`, `README.md`, `.gitignore`는 그대로 유지.

## 4. 백엔드 API 계약 확인 경로

- 라우터: `backend/app/routers/seller_dashboard.py`, `seller_products.py`, `seller_inventory.py`, `seller_orders.py`, `seller_refunds.py`, `seller_sales.py`, `seller_info.py`
- 요청/응답 스키마: `backend/app/schemas/seller_*.py` (라우터와 1:1 대응)
- 로그인: `POST /api/auth/login` → JWT 발급 (`roles`, `org_id`, `org_type` 클레임 포함). 이후 모든 요청은 `Authorization: Bearer <token>` 헤더 필요.
- 인증 의존성: `backend/app/dependencies/auth.py`의 `AuthContext`, `require_seller` 등 참고.
- 로컬 서버 기동 방법은 `backend/README.md` 참고 (uv 사용).

## 5. 팀 작업 규칙

3인이 동시에 작업 중이다: 명현(admin), 현수(customer), 규림(seller).

- 공통 파일(전역 스타일, 공통 API 클라이언트, 라우팅 설정 등)을 건드릴 때는 먼저 자세히 설명하고 사용자 승인을 받은 뒤 진행한다.
- `main` 브랜치나 공용 구조를 바꿔야 할 때도 동일하게 사전 설명 + 승인이 필수다.
- 헷갈리는 점은 추측하지 말고 `01_공통규칙/` 문서를 먼저 확인하고, 그래도 불명확하면 사용자에게 질문한다.

## 6. 아직 남은 일 / 확인 필요 사항

- `fix/seller-profile-dedupe`의 PR이 아직 열리지 않았다. 필요하면 사용자에게 열어도 되는지 물어볼 것.
- S-REF-03(환불 승인/거절)의 셀러 권한 여부가 팀 차원에서 최종 확정되지 않았다. 현재 백엔드는 조회만 제공하고(S-REF-01~02), 승인/거절은 관리자 전용으로 제외되어 있다.
- `admin_orders` 라우터에 스키마/인증 버그가 있다고(PR #5, `main` 병합됨) 보고했으나 아직 팀 차원에서 수정되지 않았다. 프론트에서 해당 엔드포인트를 연동할 때 주의할 것.
- 프론트엔드 실제 작업은 아직 시작 전이다.
