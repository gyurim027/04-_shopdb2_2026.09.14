# Customer API Map

기준 backend: `main` commit `9a02909` (2026-09-16 확인 기준)

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

## 주문
- `POST /api/customer/orders`
- `GET /api/customer/orders`
- `GET /api/customer/orders/{order_id}`
- `GET /api/customer/orders/{order_id}/status`

## 결제
- `POST /api/customer/payments/request`
- `POST /api/customer/payments/{payment_id}/approve`
- `GET /api/customer/payments/{payment_id}`
- `GET /api/customer/payments/{payment_id}/status`

## 환불
- `GET /api/customer/refunds/policy?order_id=...`
- `POST /api/customer/refunds`
- `GET /api/customer/refunds`
- `GET /api/customer/refunds/{refund_request_id}`
- `GET /api/customer/refunds/{refund_request_id}/status`

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

## 프론트 정책
- 장바구니는 현재 백엔드에서 사용하지 않으므로 미구현
- 상품 상세에서 배송지 + 옵션 + 수량을 선택해 바로 주문
- 결제는 현재 백엔드 Mock 승인 흐름에 맞춤
