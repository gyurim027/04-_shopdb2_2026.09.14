# 2026-09-18 장바구니 + 반품 프론트 연동

## 추가/수정 기능

### 장바구니
- 헤더 장바구니 아이콘과 상품 건수 배지
- 상품 상세 판매사 선택
- 상품 상세 `장바구니 담기`
- 상품 상세 바로구매 시 선택 판매사의 `org_id` 전달
- `/cart` 장바구니 화면
  - 판매사별 그룹
  - 상품 선택/해제
  - 판매사 전체 선택/해제
  - 수량 변경
  - 상품 삭제
  - 배송지 선택
  - 선택상품 판매사별 주문 생성
- `/cart/checkout` 판매사별 주문 결제 화면
  - 개별 Mock 결제
  - 미결제 주문 순차 Mock 결제

### 반품
- 기존 `/returns`, `/returns/:returnRequestId` 유지
- `POST /customer/returns`의 새 복수 응답 `requests[]` 지원
- 단일 판매사 반품은 생성된 반품 상세로 바로 이동
- 복수 판매사 반품은 판매사별로 생성된 반품 요청 링크를 표시

## 주요 수정 파일
- `src/api/customer.js`
- `src/App.jsx`
- `src/components/Layout.jsx`
- `src/pages/ProductDetailPage.jsx`
- `src/pages/MyPage.jsx`
- `src/pages/ReturnsPage.jsx`
- `src/utils/status.js`
- `src/styles.css`

## 신규 파일
- `src/pages/CartPage.jsx`
- `src/pages/CartCheckoutPage.jsx`

## 백엔드 전제
- 상품 상세 variant에 `sellers[]`가 포함되어야 함
- 장바구니 API가 `/api/customer/cart` 하위에 등록되어 있어야 함
- 주문 생성 요청에서 `org_id`를 받을 수 있어야 함
- 반품 생성 응답이 `{ requests: [...], total: n }` 형식이어야 함

## 상품 상세 판매자 정보 표시 보강
- 상품명/설명과 가격 영역 사이에 현재 선택된 옵션의 판매자 정보를 표시합니다.
- 판매사명, 조직명, 판매사별 재고를 확인할 수 있습니다.
- 동일 옵션에 판매사가 여러 곳이면 판매자 버튼으로 바로 판매사를 바꿀 수 있습니다.
- 하단의 기존 `판매사 선택` 셀렉트와 상태가 동기화됩니다.
