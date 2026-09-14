<<<<<<< HEAD
# 04-_shopdb2_2026.09.14-

쇼핑몰 어드민/대고객 서비스 백엔드 프로젝트 (FastAPI + MySQL + React)

## 폴더 구조

- `backup/` — DB 백업 SQL (`shopdb2` 스키마 원본, 절대 수정하지 않음)
- `01_공통규칙/` — 3인 공통 문서 (테이블 정의서, 서비스 방향성, 기능 정의서, 권한 매트릭스, 파일명 고정 규칙, 작업자별 착수 프롬프트)
  - 가장 먼저 읽어야 할 문서: `01_공통규칙/shopdb2_백엔드_파일명_고정규칙_v0.4_2026.09.14.md`

## 작업자

| 담당자 | 담당 도메인 | 브랜치 |
|---|---|---|
| 명현 | 사용자/조직 + 주문/결제 | `dev/명현` |
| 규림 | 상품/카테고리/재고 + 환불 | `dev/규림` |
| 현수 | 파일/미디어 + 고객문의/정책 + AI/RAG | `dev/현수` |

## 브랜치 전략

- `main`: 공통 문서/DB 백업 등 공유 자산만 관리, 직접 push 금지 (PR로만 병합)
- `dev/명현`, `dev/규림`, `dev/현수`: 담당자별 작업 브랜치 (담당 도메인은 `01_공통규칙` 문서 참고)

## 시작하기 전에

각 작업자는 `01_공통규칙/작업자별_착수프롬프트_0.2v_260914_16.08.md`에서 본인 담당 섹션의 프롬프트를 복사해 AI 세션 첫 메시지로 사용하세요.
=======
# shopdb2 Admin Backend — Main Branch Common Skeleton

이 폴더는 A/B/C 작업자가 동일한 구조와 import 경로를 사용하기 위한 **공통 뼈대**입니다.
`main` 브랜치에는 이 공통 구조를 유지하고, 각 작업자는 자신의 `dev/...` 브랜치에서 담당 파일만 구현합니다.

## 1. 처음 실행

PowerShell에서 `backend` 폴더로 이동한 뒤:

```powershell
Copy-Item .env.example .env
uv sync
uv run uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

브라우저:

- Swagger: http://127.0.0.1:8000/docs
- FastAPI 상태: http://127.0.0.1:8000/health
- MySQL 상태: http://127.0.0.1:8000/health/db

`/health/db`가 실패하면 `.env`의 DB 접속정보와 MySQL 실행 여부를 확인합니다.

> `uv.lock`은 최초 `uv sync` 실행 시 생성됩니다. 생성된 `uv.lock`도 main 브랜치에 함께 커밋하세요.

## 2. 고정 구조

```text
backend/
├─ pyproject.toml
├─ uv.lock
├─ .env.example
└─ app/
   ├─ main.py
   ├─ core/
   │  ├─ config.py
   │  ├─ database.py
   │  └─ security.py
   ├─ dependencies/
   │  └─ auth.py
   ├─ routers/
   │  ├─ admin_users.py
   │  ├─ admin_products.py
   │  ├─ admin_orders.py
   │  ├─ admin_refunds.py
   │  ├─ admin_files.py
   │  ├─ admin_support.py
   │  └─ admin_ai.py
   ├─ schemas/
   │  ├─ admin_users.py
   │  ├─ admin_products.py
   │  ├─ admin_orders.py
   │  ├─ admin_refunds.py
   │  ├─ admin_files.py
   │  ├─ admin_support.py
   │  └─ admin_ai.py
   ├─ services/
   │  ├─ admin_users.py
   │  ├─ admin_products.py
   │  ├─ admin_orders.py
   │  ├─ admin_refunds.py
   │  ├─ admin_files.py
   │  ├─ admin_support.py
   │  └─ admin_ai.py
   └─ models/
      ├─ users.py
      ├─ products.py
      ├─ orders.py
      ├─ refunds.py
      ├─ files.py
      ├─ support.py
      └─ ai.py
```

## 3. 팀 개발 규칙

- 파일명/폴더명을 임의로 바꾸지 않습니다.
- `shopdb2` DB 테이블/컬럼을 코드 편의 때문에 변경하지 않습니다.
- 각자 담당 Router/Schema/Service/Model만 수정합니다.
- `main.py`, `core/*`, `dependencies/auth.py`, `pyproject.toml`은 공통 파일이므로 팀 합의 없이 수정하지 않습니다.
- 모든 SQLAlchemy 모델은 `from app.core.database import Base`를 사용합니다.
- 모든 DB 세션 dependency는 `from app.core.database import get_db`를 사용합니다.

## 4. 담당 영역

| 영역 | Router | Schema | Service | Model |
|---|---|---|---|---|
| 사용자/조직 | `admin_users.py` | `admin_users.py` | `admin_users.py` | `users.py` |
| 상품/재고 | `admin_products.py` | `admin_products.py` | `admin_products.py` | `products.py` |
| 주문/결제 | `admin_orders.py` | `admin_orders.py` | `admin_orders.py` | `orders.py` |
| 환불 | `admin_refunds.py` | `admin_refunds.py` | `admin_refunds.py` | `refunds.py` |
| 파일/미디어 | `admin_files.py` | `admin_files.py` | `admin_files.py` | `files.py` |
| 고객문의/정책 | `admin_support.py` | `admin_support.py` | `admin_support.py` | `support.py` |
| AI/RAG | `admin_ai.py` | `admin_ai.py` | `admin_ai.py` | `ai.py` |

## 5. 브랜치 작업 기본 흐름

공통 뼈대가 `main`에 Push된 뒤 각 작업자는 자신의 브랜치에서 `main`의 최신 내용을 먼저 반영하고 담당 파일만 구현합니다.
>>>>>>> 72f32de (feat: 사용자 및 조직 관리 백엔드 API 구현 완료)
