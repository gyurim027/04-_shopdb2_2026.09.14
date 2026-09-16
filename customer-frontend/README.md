# ShopDB2 Customer Frontend

고객(Customer/BUYER) 전용 React 프론트엔드입니다. 쇼핑몰형 UI를 중심으로 상품 탐색 → 바로주문 → Mock 결제 → 주문/환불/문의/AI 고객지원까지 연결합니다.

## 기준 백엔드

- Repository: `04-_shopdb2_2026.09.14`
- 기준: 2026-09-16 최신 `main` 구조
- API prefix: `/api`
- 기본 백엔드 주소: `http://127.0.0.1:8000`
- 프론트 기본 포트: `5173`

## 주요 화면

- 홈 / 상품 검색 / 카테고리
- 상품 상세 / 옵션 / 수량 / 배송지 / 바로구매
- 고객 공용 로그인 / 고객 회원가입
- 마이페이지 / 회원정보 수정
- 배송지 관리
- 주문 목록 / 주문 상세
- Mock 결제 요청 / 승인
- 환불 요청 / 환불 내역
- 1:1 고객 문의 / 첨부파일
- 회사 정책
- 고객 AI 챗봇 / 실패 답변 문의 전환

> 현재 백엔드 정책에 따라 장바구니는 포함하지 않았습니다.

## 실행

```powershell
cd customer-frontend
npm install
npm run dev
```

브라우저에서 `http://localhost:5173` 접속.

백엔드는 별도 터미널에서 먼저 실행하세요.

```powershell
.\backend\.venv\Scripts\python.exe -m uvicorn app.main:app --app-dir backend --reload
```

## 환경변수

필요하면 `.env.example`을 `.env`로 복사해 API 주소를 변경하세요.

```env
VITE_API_BASE_URL=http://127.0.0.1:8000/api
VITE_BACKEND_ORIGIN=http://127.0.0.1:8000
```
