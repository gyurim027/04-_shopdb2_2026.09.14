# 어드민 백엔드 Python 파일명 고정 규칙

## 0. 목적

이 문서는 3명의 작업자가 AI 바이브코딩으로 백엔드를 병렬 개발할 때 **Python 파일명이 서로 달라지는 것을 방지하기 위한 공통 규칙**입니다.

### 전제
- Python 패키지/가상환경 관리: `uv`
- 백엔드 프레임워크: FastAPI
- DB: MySQL `shopdb2`
- 현재 DB 스키마는 임의로 변경하지 않음
- 어드민 관련 기능 29개를 기준으로 파일명을 고정함
- AI는 아래 파일명을 임의로 변경하거나 비슷한 이름의 중복 파일을 새로 만들지 않음

---

# 1. 고정 폴더 구조

```text
backend/
├─ pyproject.toml
├─ uv.lock
├─ .env
├─ .env.example
│
└─ app/
   ├─ main.py
   │
   ├─ core/
   │  ├─ config.py
   │  ├─ database.py
   │  └─ security.py
   │
   ├─ dependencies/
   │  └─ auth.py
   │
   ├─ routers/
   │  ├─ admin_users.py
   │  ├─ admin_products.py
   │  ├─ admin_orders.py
   │  ├─ admin_refunds.py
   │  ├─ admin_files.py
   │  ├─ admin_support.py
   │  └─ admin_ai.py
   │
   ├─ schemas/
   │  ├─ admin_users.py
   │  ├─ admin_products.py
   │  ├─ admin_orders.py
   │  ├─ admin_refunds.py
   │  ├─ admin_files.py
   │  ├─ admin_support.py
   │  └─ admin_ai.py
   │
   ├─ services/
   │  ├─ admin_users.py
   │  ├─ admin_products.py
   │  ├─ admin_orders.py
   │  ├─ admin_refunds.py
   │  ├─ admin_files.py
   │  ├─ admin_support.py
   │  └─ admin_ai.py
   │
   └─ models/
      ├─ users.py
      ├─ products.py
      ├─ orders.py
      ├─ refunds.py
      ├─ files.py
      ├─ support.py
      └─ ai.py
```

> `__init__.py`는 Python 패키지 구성을 위해 필요한 폴더에 추가할 수 있으나, 도메인 파일명은 위 이름을 그대로 사용합니다.

---

# 2. 공통 파일명

| 파일 | 역할 | 수정 원칙 |
|---|---|---|
| `app/main.py` | FastAPI 앱 생성, 전체 Router 등록 | **통합 담당자 중심으로 수정** |
| `app/core/config.py` | `.env` 환경변수 로딩 및 설정 | 공통 |
| `app/core/database.py` | MySQL 연결, Session 관리 | 공통 |
| `app/core/security.py` | 비밀번호/JWT 등 인증 공통 로직 | 공통 |
| `app/dependencies/auth.py` | 로그인 사용자 및 ADMIN 권한 확인, org 범위 확인 | 공통 |

### 공통 파일 주의

3명의 AI가 `main.py`, `database.py`, `auth.py`를 동시에 수정하지 않도록 합니다.

도메인 작업 중 공통 파일 수정이 필요하면 먼저 팀에 공유한 뒤 반영합니다.

---

# 3. 어드민 기능별 고정 파일

## A. 사용자 / 조직 관리 — 7개 기능

### 고정 파일

```text
routers/admin_users.py
schemas/admin_users.py
services/admin_users.py
models/users.py
```

### 포함 기능

1. 내 정보 조회/수정
2. 회원 목록/상세 조회
3. 회원 상태 변경(정지/탈퇴)
4. 역할(role) 부여/회수
5. 조직(지사/매장/창고) 등록/수정
6. 조직 계층 조회
7. 판매자 프로필 등록/수정(어드민 승인 포함)

### 주요 테이블

```text
users
roles
user_roles
user_addresses
seller_profiles
org_units
```

---

## B. 상품 / 카테고리 / 재고 — 8개 기능

### 고정 파일

```text
routers/admin_products.py
schemas/admin_products.py
services/admin_products.py
models/products.py
```

### 포함 기능

1. 카테고리 등록/수정/삭제
2. 상품 등록/수정/삭제
3. 상품 옵션(SKU) 관리
4. 상품 이미지 등록/관리
5. 상품 첨부파일 관리
6. 재고 조회
7. 재고 수량/안전재고 조정
8. 재고 부족 알림

### 주요 테이블

```text
categories
products
product_variants
product_images
product_files
inventories
file_assets
```

---

## C. 주문 / 결제 — 3개 기능

### 고정 파일

```text
routers/admin_orders.py
schemas/admin_orders.py
services/admin_orders.py
models/orders.py
```

### 포함 기능

1. 주문 전체 조회/관리
2. 주문 상태 변경
3. 결제/정산 내역 조회

### 주요 테이블

```text
orders
order_items
payments
payment_transactions
payment_webhook_events
```

> 결제 웹훅 수신 자체는 백엔드 공통 처리 기능이지만, 어드민에서는 결제/트랜잭션 조회에 활용합니다.

---

## D. 환불 — 2개 기능

### 고정 파일

```text
routers/admin_refunds.py
schemas/admin_refunds.py
services/admin_refunds.py
models/refunds.py
```

### 포함 기능

1. 환불 요청 목록/처리(승인/거절)
2. 환불 정책 등록/버전관리

### 주요 테이블

```text
refund_requests
refund_items
refund_policies
orders
order_items
```

---

## E. 파일 / 미디어 — 3개 기능

### 고정 파일

```text
routers/admin_files.py
schemas/admin_files.py
services/admin_files.py
models/files.py
```

### 포함 기능

1. 파일 업로드
2. 파일-도메인 연결 관리
3. 파일 목록/삭제(비활성화)

### 주요 테이블

```text
file_assets
product_files
product_images
policy_files
inquiry_files
rag_document_files
```

---

## F. 고객문의 / 정책 — 2개 기능

### 고정 파일

```text
routers/admin_support.py
schemas/admin_support.py
services/admin_support.py
models/support.py
```

### 포함 기능

1. 문의 목록/답변 등록
2. 회사 정책(이용약관 등) 등록/버전관리

### 주요 테이블

```text
buyer_inquiries
company_policies
inquiry_files
policy_files
```

---

## G. AI / RAG — 4개 기능

> 방향 A(AI 상담 기능)를 구현할 경우 사용합니다.

### 고정 파일

```text
routers/admin_ai.py
schemas/admin_ai.py
services/admin_ai.py
models/ai.py
```

### 포함 기능

1. AI 프로바이더 등록/설정
2. RAG 문서 등록
3. 질의응답 로그/품질 모니터링
4. 답변 실패 시 문의 전환 관리

### 주요 테이블

```text
ai_providers
rag_documents
rag_document_files
rag_chunks
rag_embeddings
rag_query_logs
buyer_inquiries
```

---

# 4. 파일별 역할 규칙

각 도메인은 항상 아래 역할을 지킵니다.

| 종류 | 역할 |
|---|---|
| `routers/*.py` | API URL과 HTTP Method 정의 |
| `schemas/*.py` | Request / Response Pydantic Schema 정의 |
| `services/*.py` | 조회, 등록, 수정, 권한 체크 등 실제 비즈니스 로직 |
| `models/*.py` | DB 테이블 ORM Model 정의 |

예:

```text
admin_products.py를 작업할 때

routers/admin_products.py
→ GET / POST / PATCH 등 API Endpoint

schemas/admin_products.py
→ ProductCreate, ProductUpdate, ProductOut 등

services/admin_products.py
→ 상품 조회/등록/수정 및 재고 처리

models/products.py
→ products, product_variants, inventories 등 ORM Model
```

---

# 5. AI에게 반드시 지시할 규칙

아래 내용을 각 작업자의 AI에게 그대로 전달합니다.

```text
이 프로젝트는 3명이 병렬로 개발하고 있으므로 파일명과 폴더 구조를 임의로 변경하면 안 됩니다.

1. 첨부된 '어드민 백엔드 Python 파일명 고정 규칙'을 먼저 읽습니다.
2. 해당 기능은 문서에 지정된 Python 파일에서만 구현합니다.
3. 비슷한 이름의 새 파일을 임의로 만들지 않습니다.
   예:
   admin_user.py
   users_admin.py
   user_router.py
   product_admin_router.py
   등의 별도 파일 생성 금지
4. DB 테이블명과 컬럼명을 임의로 변경하지 않습니다.
5. 기존 코드가 있으면 새로 만들기 전에 반드시 기존 코드를 먼저 확인합니다.
6. 담당 도메인 외 파일은 임의로 수정하지 않습니다.
7. main.py, database.py, auth.py 등 공통 파일 수정이 필요하면 바로 수정하지 말고 필요한 변경사항을 먼저 설명합니다.
8. 구현 완료 후 반드시 아래 내용을 보고합니다.
   - 수정한 파일
   - 추가한 API
   - 주요 변경사항
   - 테스트 방법
   - 다른 담당자에게 영향을 주는 변경사항
```

---

# 6. 최종 고정 파일명 요약

| 대분류 | Router | Schema | Service | Model | 기능 수 |
|---|---|---|---|---|---:|
| 사용자/조직 | `admin_users.py` | `admin_users.py` | `admin_users.py` | `users.py` | 7 |
| 상품/재고 | `admin_products.py` | `admin_products.py` | `admin_products.py` | `products.py` | 8 |
| 주문/결제 | `admin_orders.py` | `admin_orders.py` | `admin_orders.py` | `orders.py` | 3 |
| 환불 | `admin_refunds.py` | `admin_refunds.py` | `admin_refunds.py` | `refunds.py` | 2 |
| 파일/미디어 | `admin_files.py` | `admin_files.py` | `admin_files.py` | `files.py` | 3 |
| 고객문의/정책 | `admin_support.py` | `admin_support.py` | `admin_support.py` | `support.py` | 2 |
| AI/RAG | `admin_ai.py` | `admin_ai.py` | `admin_ai.py` | `ai.py` | 4 |
| **합계** |  |  |  |  | **29** |

---

# 7. 가장 중요한 원칙

```text
같은 기능 = 같은 파일명

AI가 파일명을 정하지 않는다.
팀이 먼저 정한 파일명에 AI가 맞춘다.

DB 구조를 AI 편의에 맞춰 바꾸지 않는다.
기존 shopdb2 구조에 코드를 맞춘다.
```
