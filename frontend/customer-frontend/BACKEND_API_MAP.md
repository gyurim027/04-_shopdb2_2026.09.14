# Customer API Map

기준: 2026-09-18 고객 장바구니 + 반품 연동 백엔드

## 인증
- `POST /api/auth/login` — BUYER/SELLER/ADMIN 공용 로그인
- `POST /api/customer/auth/register` — 고객 회원가입

## 프로필
- `GET /api/customer/profile/me`
- `PATCH /api/customer/profile/me`

## 배송지
- `GET /api/customer/addresses`
- `POST /api/customer/addresses`
- `PATCH /api/customer/addresses/{address_id}`
- `DELETE /api/customer/addresses/{address_id}`

## 상품
- `GET /api/customer/products/categories`
- `GET /api/customer/products`
- `GET /api/customer/products/{product_id}`

상품 상세의 각 variant는 `sellers` 목록을 포함한다.
프론트는 `org_id`, `seller_name`, `org_name`, `available_quantity`를 사용해 판매사를 선택한다.

## 장바구니
- `GET /api/customer/cart`
- `POST /api/customer/cart/items`
- `PATCH /api/customer/cart/items/{cart_item_id}`
- `PATCH /api/customer/cart/items/{cart_item_id}/selected`
- `DELETE /api/customer/cart/items/{cart_item_id}`

장바구니 상품은 `org_id + variant_id` 기준으로 판매사별 분리된다.

## 주문
- `POST /api/customer/orders`
- `GET /api/customer/orders`
- `GET /api/customer/orders/{order_id}`
- `GET /api/customer/orders/{order_id}/status`

장바구니 주문은 판매사별로 나눠 `org_id`를 포함해 생성한다.
바로 구매도 상품 상세에서 선택한 판매사의 `org_id`를 전달한다.

## 결제
- `POST /api/customer/payments/request`
- `POST /api/customer/payments/{payment_id}/approve`
- `GET /api/customer/payments/{payment_id}`
- `GET /api/customer/payments/{payment_id}/status`

현재 프로젝트의 Mock 카드 승인 흐름을 사용한다.
판매사가 여러 곳이면 주문/결제도 판매사별로 각각 처리한다.

## 환불
- `GET /api/customer/refunds/policy?order_id=...`
- `POST /api/customer/refunds`
- `GET /api/customer/refunds`
- `GET /api/customer/refunds/{refund_request_id}`
- `GET /api/customer/refunds/{refund_request_id}/status`

## 반품
- `POST /api/customer/returns`
- `GET /api/customer/returns`
- `GET /api/customer/returns/{return_request_id}`
- `GET /api/customer/returns/{return_request_id}/status`

반품 생성 POST 응답은 다음처럼 복수 요청 구조다.

```json
{
  "requests": [
    { "return_request_id": 1 },
    { "return_request_id": 2 }
  ],
  "total": 2
}
```

단일 판매사 반품이면 `requests` 길이는 1이고, 여러 판매사 상품이 포함된 경우 판매사별로 여러 요청이 반환된다.

## 고객지원
- `POST /api/customer/support/inquiries`
- `GET /api/customer/support/inquiries`
- `POST /api/customer/support/inquiries/{inquiry_id}/files`
- `GET /api/customer/support/inquiries/{inquiry_id}`
- `GET /api/customer/support/inquiries/{inquiry_id}/status`
- `GET /api/customer/support/policies`
- `GET /api/customer/support/policies/{policy_id}`

## AI
- `POST /api/customer/ai/chat`
- `GET /api/customer/ai/query-logs`
- `POST /api/customer/ai/query-logs/{query_log_id}/convert-to-inquiry`

## 프론트 흐름
- 상품 상세: 옵션 선택 → 판매사 선택 → 장바구니 또는 바로 구매
- 장바구니: 판매사별 그룹 → 선택/수량/삭제 → 배송지 선택 → 판매사별 주문 생성
- 장바구니 결제: 생성된 판매사별 주문을 개별 또는 순차 Mock 결제
- 반품: 배송완료/구매완료 주문 선택 → 상품/수량 선택 → 반품 신청 → 판매사별 요청 결과 처리
