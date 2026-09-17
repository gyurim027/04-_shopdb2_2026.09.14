# ShopDB2 Customer Frontend

고객(Customer/BUYER) 전용 React 프론트엔드입니다. 쇼핑몰형 UI를 중심으로 상품 탐색 → 배송지 선택 → 바로주문 → Mock 결제 → 주문/환불/문의/AI 고객지원까지 연결합니다.

## 기준 백엔드

- Repository: `04-_shopdb2_2026.09.14`
- 기준: 2026-09-17 Customer 프론트 UX/디자인 보강본
- API prefix: `/api`
- 기본 백엔드 주소: `http://127.0.0.1:8000`
- 프론트 기본 포트: `5173`

## 보강된 주요 기능

- BUYER 역할 확인 후 고객몰 보호 페이지 접근
- 401 인증 만료 시 저장 토큰/사용자 정보 정리
- 전역 Error Boundary로 렌더링 오류 시 흰 화면 방지
- API 네트워크/401/403/404/500 사용자 메시지 정리
- 종합 쇼핑몰형 헤더 + 카테고리 메뉴 + 프로모션 배너 + 오늘의 발견/쇼핑 제안/할인 상품 섹션
- 상품 검색/카테고리/가격·할인 정렬/페이지네이션 + 상품 옵션 재고/품절 처리
- 배송지가 없을 때 등록 화면으로 자연스럽게 연결
- 배송지 등록/수정/삭제
- 주문 생성 → 주문 상세 → Mock 결제 + 주문 상태 필터/진행 단계 표시
- 마이페이지 주문/환불/문의 건수 요약
- 1:1 문의 상세/첨부파일/한글 상태 + 상태/유형/제목 필터
- AI 추천 질문 + typing UI + 답변 실패 문의 전환
- 성공/오류 Toast 메시지

> 현재 백엔드 정책에 따라 장바구니는 포함하지 않았습니다.

## 실행

프로젝트 루트에서 백엔드를 먼저 실행합니다.

```powershell
.\backend\.venv\Scripts\python.exe -m uvicorn app.main:app --app-dir backend --reload
```

다른 PowerShell에서 프론트를 실행합니다.

```powershell
cd customer-frontend
npm install
npm run dev
```

브라우저에서 `http://localhost:5173` 접속.

## 환경변수

필요하면 `.env.example`을 `.env`로 복사해 API 주소를 변경하세요.

```env
VITE_API_BASE_URL=http://127.0.0.1:8000/api
VITE_BACKEND_ORIGIN=http://127.0.0.1:8000
```
