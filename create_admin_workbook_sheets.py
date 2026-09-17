"""Add administrator definition and MVP menu sheets to a shopdb workbook.

Usage:
    python create_admin_workbook_sheets.py path/to/[AX]shopdb구축_2026.09.15_16.53.xlsx

The workbook is kept intact except for the two generated sheets.  Styles are
copied from an existing customer or seller sheet so the generated sheets use
the workbook's own fonts, fills, borders, widths, and page settings.
"""

from __future__ import annotations

import argparse
import copy
import re
from pathlib import Path

from openpyxl import load_workbook
from openpyxl.worksheet.worksheet import Worksheet


FUNCTION_SHEET = "40_관리자기능정의서_v0.1"
MENU_SHEET = "41_관리자MVP메뉴구조_v0.1"

FUNCTION_HEADERS = ("기능 ID", "기능", "화면", "구현 구분", "근거 테이블", "간략 쿼리")

FUNCTION_ROWS = (
    ("ADM-ORG-001", "조직/사용자", "조직 관리", "조직 목록 조회", "관리자가 접근 가능한 조직 목록을 조회한다.", "GET /api/admin/organizations", "ADMIN; 최고관리자는 전체, 그 외 자기 조직+직접 하위 조직", "skip, limit", "org_units 목록", "Y", "admin_users.py"),
    ("ADM-ORG-002", "조직/사용자", "조직 관리", "조직 등록", "본사 최고관리자만 조직을 등록한다.", "POST /api/admin/organizations", "ADMIN + HEADQUARTER만 가능", "조직 코드, 조직 유형, 상위 조직", "201 Created; 중복 시 409", "Y", "admin_users.py"),
    ("ADM-ORG-003", "조직/사용자", "조직 관리", "조직 정보 수정", "본사 최고관리자만 조직 정보를 수정한다.", "PATCH /api/admin/organizations/{org_id}", "ADMIN + HEADQUARTER만 가능", "org_id, 변경 필드", "수정된 조직 정보", "Y", "admin_users.py"),
    ("ADM-USR-001", "조직/사용자", "회원 관리", "회원 목록 조회", "조직 스코프 안의 회원을 페이지 단위로 조회한다.", "GET /api/admin/users", "ADMIN; 자기 조직+직접 하위 조직 또는 전체", "skip, limit", "users 목록", "Y", "admin_users.py"),
    ("ADM-USR-002", "조직/사용자", "회원 관리", "회원 등록", "본사 최고관리자가 관리자/회원 계정을 등록한다.", "POST /api/admin/users", "ADMIN + HEADQUARTER만 가능", "login_id, password, org_id 등", "201 Created; 중복 시 409", "Y", "admin_users.py"),
    ("ADM-USR-003", "조직/사용자", "회원 관리", "회원 상세 조회", "조직 스코프 안의 회원 상세 정보를 조회한다.", "GET /api/admin/users/{user_id}", "ADMIN + 대상 회원 조직 스코프", "user_id", "회원 상세 정보", "Y", "admin_users.py"),
    ("ADM-USR-004", "조직/사용자", "회원 관리", "회원 상태 변경", "ACTIVE/INACTIVE/SUSPENDED/WITHDRAWN 상태를 변경한다.", "PATCH /api/admin/users/{user_id}/status", "ADMIN + 대상 회원 조직 스코프", "user_id, user_status", "회원 상태 반영", "Y", "admin_users.py"),
    ("ADM-USR-005", "조직/사용자", "권한 관리", "사용자 역할 변경", "사용자 역할을 일괄 교체한다.", "PATCH /api/admin/users/{user_id}/roles", "본사 최고관리자만 가능", "user_id, role_ids", "user_roles 갱신", "Y", "admin_users.py"),
    ("ADM-USR-006", "조직/사용자", "판매자 관리", "판매자 프로필 관리", "판매자 프로필을 조회·등록·수정한다.", "GET/POST/PATCH /api/admin/users/{user_id}/seller-profile", "ADMIN + 대상 회원 조직 스코프", "판매자 프로필 필드", "seller_profiles 반영", "Y", "admin_users.py"),
    ("ADM-USR-007", "조직/사용자", "내 정보", "관리자 내 정보 관리", "현재 로그인한 관리자의 연락처와 비밀번호를 조회·수정한다.", "GET/PATCH /api/admin/me", "ADMIN; 본인만", "phone, password", "본인 정보 반영", "Y", "admin_users.py"),
    ("ADM-PRD-001", "상품", "카테고리", "카테고리 관리", "카테고리를 조회·등록·수정·비활성화한다.", "GET/POST/PATCH/DELETE /api/admin/products/categories", "조회 ADMIN; 변경 본사 최고관리자", "카테고리 필드", "카테고리 상태 반영", "Y", "admin_products.py"),
    ("ADM-PRD-002", "상품", "상품", "상품 목록/상세 조회", "상품을 상태·카테고리·키워드로 조회한다.", "GET /api/admin/products/products", "ADMIN; seller_user_id의 조직 스코프", "page, size, category_id, product_status, keyword", "페이지 결과와 total", "Y", "admin_products.py"),
    ("ADM-PRD-003", "상품", "상품", "상품 등록/수정", "상품을 등록하거나 상품 상태 및 정보를 수정한다.", "POST/PATCH /api/admin/products/products", "본사 최고관리자만 등록·수정", "상품 필드", "상품 정보 반영", "Y", "admin_products.py"),
    ("ADM-PRD-004", "상품", "SKU/이미지/파일", "상품 부속정보 관리", "옵션, 이미지, 파일을 조회·등록·수정·비활성화한다.", "GET/POST/PATCH/DELETE /api/admin/products/products/{product_id}/...", "조회 ADMIN; 쓰기 본사 최고관리자", "product_id 및 부속정보", "variants/images/files 반영", "Y", "admin_products.py"),
    ("ADM-PRD-005", "상품", "재고", "재고 관리", "재고를 조회·등록·수정·비활성화한다.", "GET/POST/PATCH/DELETE /api/admin/products/inventories", "조회 ADMIN; 쓰기 본사 최고관리자", "inventory_id 및 수량 필드", "재고 수량/상태 반영", "Y", "admin_products.py"),
    ("ADM-ORD-001", "주문/결제", "주문", "주문 목록 조회", "조직 스코프 내 주문을 상태 필터와 페이지로 조회한다.", "GET /api/admin/orders", "ADMIN; 최고관리자는 전체, 그 외 자기 조직+하위 조직", "skip, limit, status", "주문 목록", "Y", "admin_orders.py"),
    ("ADM-ORD-002", "주문/결제", "주문", "주문 상태 변경", "조직 스코프 내 주문의 상태를 변경한다.", "PATCH /api/admin/orders/{order_id}/status", "ADMIN + 주문 조직 스코프", "order_id, status", "주문 상태 반영", "Y", "admin_orders.py"),
    ("ADM-ORD-003", "주문/결제", "결제/정산", "결제·정산 내역 조회", "주문 조직 스코프에 맞는 결제 내역을 조회한다.", "GET /api/admin/orders/settlements", "ADMIN + 주문 조직 스코프", "skip, limit", "결제/정산 목록", "Y", "admin_orders.py"),
    ("ADM-REF-001", "환불", "환불 정책", "환불 정책 관리", "환불 정책을 조회·등록·수정·비활성화한다.", "GET/POST/PATCH/DELETE /api/admin/refunds/policies", "조회 ADMIN; 등록·수정·삭제 본사 최고관리자", "정책 및 적용일", "환불 정책 반영", "Y", "admin_refunds.py"),
    ("ADM-REF-002", "환불", "환불 요청", "환불 요청 처리", "환불 요청을 조회하고 승인 또는 거절한다.", "GET/PATCH /api/admin/refunds/requests", "ADMIN; 자기 조직+하위 조직 및 전사 공통 정책", "request_id, 승인/거절 사유", "REQUESTED~COMPLETED 상태 반영", "Y", "admin_refunds.py"),
    ("ADM-FIL-001", "파일", "파일 관리", "파일 조회·연결·삭제", "관리자 파일을 조회하고 도메인에 연결하거나 삭제한다.", "GET/POST/DELETE /api/admin/files", "ADMIN; 파일 org_id 스코프", "파일 및 도메인 연결 정보", "파일 메타데이터 반영", "Y", "admin_files.py"),
    ("ADM-SUP-001", "고객지원", "문의", "문의 조회·상세", "조직 스코프에 맞는 고객 문의를 조회한다.", "GET /api/admin/support/inquiries", "ADMIN; 문의 org_id 스코프", "상태, 페이지, 문의 ID", "문의 목록/상세", "Y", "admin_support.py"),
    ("ADM-SUP-002", "고객지원", "문의", "문의 답변·상태 관리", "문의에 답변하고 처리 상태를 변경한다.", "POST /api/admin/support/...", "ADMIN + 문의 조직 스코프", "답변 및 상태", "문의 처리 이력 반영", "Y", "admin_support.py"),
    ("ADM-AI-001", "AI/지식", "문서·RAG", "AI 문서 관리", "AI 문서와 청크를 조회·등록·수정한다.", "GET/POST/PATCH /api/admin/ai/...", "ADMIN; 문서 org_id 스코프", "문서, 조직, 검색 조건", "문서/RAG 데이터 반영", "Y", "admin_ai.py"),
)

MENU_HEADERS = (
    "1차 메뉴",
    "2차 화면/항목",
    "정보구조(IA)",
    "기능 ID",
    "매핑 기능",
    "구현 구분",
)

MENU_ROWS = (
    ("M01", "대시보드", "현황", "", "관리자 대시보드", "주문·문의·재고·환불 현황을 한눈에 확인", "핵심 지표 및 바로가기", "도메인별 목록 API", "ADMIN; 조직 스코프", "Y", "후속 화면 집계 API 확장"),
    ("M02", "조직/사용자", "조직 관리", "조직 목록", "조직 관리", "조직 계층과 상태 관리", "조회·등록·수정", "/admin/organizations", "최고관리자 쓰기; 조회는 스코프", "Y", ""),
    ("M03", "조직/사용자", "회원 관리", "회원 목록", "회원 관리", "회원 검색·상세·상태 관리", "조회·등록·상태 변경", "/admin/users", "최고관리자 등록; 변경은 조직 스코프", "Y", ""),
    ("M04", "조직/사용자", "회원 관리", "역할 관리", "역할/권한 관리", "사용자 역할 부여 및 회수", "역할 변경", "/admin/users/{user_id}/roles", "최고관리자 전용", "Y", ""),
    ("M05", "조직/사용자", "판매자 관리", "판매자 프로필", "판매자 프로필", "판매자 정보 및 승인 대상 관리", "조회·등록·수정", "/admin/users/{user_id}/seller-profile", "회원 조직 스코프", "Y", ""),
    ("M06", "상품", "카테고리", "", "카테고리 관리", "상품 분류 체계 관리", "조회·등록·수정·비활성화", "/admin/products/categories", "최고관리자 쓰기", "Y", ""),
    ("M07", "상품", "상품", "상품 목록", "상품 관리", "상품 정보와 판매 상태 관리", "검색·조회·등록·수정", "/admin/products/products", "최고관리자 쓰기; seller 조직 스코프 조회", "Y", ""),
    ("M08", "상품", "상품", "옵션/미디어", "상품 부속정보", "SKU·이미지·파일 관리", "조회·등록·수정·비활성화", "/admin/products/products/{id}/...", "최고관리자 쓰기", "Y", ""),
    ("M09", "상품", "재고", "", "재고 관리", "재고 수량과 상태 관리", "조회·등록·수정·비활성화", "/admin/products/inventories", "최고관리자 쓰기", "Y", ""),
    ("M10", "주문/결제", "주문 관리", "주문 목록", "주문 관리", "주문 조회와 상태 처리", "검색·상태 필터·상태 변경", "/admin/orders", "주문 조직 스코프", "Y", ""),
    ("M11", "주문/결제", "결제/정산", "", "결제·정산", "결제 및 정산 내역 확인", "목록 조회", "/admin/orders/settlements", "주문 조직 스코프", "Y", ""),
    ("M12", "환불", "환불 정책", "", "환불 정책", "환불 기준과 적용일 관리", "조회·등록·수정·비활성화", "/admin/refunds/policies", "최고관리자 쓰기", "Y", "전사 공통 정책 지원"),
    ("M13", "환불", "환불 요청", "", "환불 요청 처리", "환불 요청 검토 및 승인·거절", "목록·상세·승인·거절", "/admin/refunds/requests", "조직 스코프", "Y", ""),
    ("M14", "고객지원", "문의 관리", "", "고객 문의", "문의 접수 건의 답변과 상태 처리", "목록·상세·답변·상태 변경", "/admin/support/inquiries", "문의 조직 스코프", "Y", ""),
    ("M15", "파일", "파일 관리", "", "파일 관리", "업로드 파일과 도메인 연결 관리", "조회·연결·삭제", "/admin/files", "파일 조직 스코프", "Y", ""),
    ("M16", "AI/지식", "문서 관리", "RAG 문서", "AI 지식 관리", "AI 검색용 문서와 청크 관리", "조회·등록·수정", "/admin/ai/...", "문서 조직 스코프", "Y", ""),
    ("M17", "내 계정", "내 정보", "", "내 정보", "로그인 관리자 본인 정보 관리", "조회·연락처·비밀번호 수정", "/admin/me", "본인만", "Y", ""),
)

FUNCTION_METADATA = (
    ("버전", "0.1v (초안)"),
    ("작성일시", "2026-09-15"),
    ("참고 문서", "01_테이블정의서_v0.1, 03_기능정의서_v0.1, 04_관리자권한매트릭스_v0.1, backend/app/routers 및 services/admin_*.py"),
    ("범위", "관리자 콘솔 기능을 현재 shopdb2 백엔드에서 구현된 기능과 DB 확장 필요 기능으로 구분한다. 현재 구현된 API, 조직 스코프, 최고관리자 권한 규칙을 기준으로 작성한다."),
    ("쿼리 표기", ":org_id, :user_id, :order_id 등은 로그인 세션/API에서 주입되는 바인딩 변수. SQL/API는 기능 이해용 간략 예시이며 실제 구현 시 권한·트랜잭션·인덱스를 보완한다."),
)

MENU_METADATA = (
    ("버전", "0.1v (초안)"),
    ("작성일시", "2026-09-15"),
    ("범위", "현재 shopdb2 기반 관리자 콘솔 MVP의 메뉴 계층과 각 화면의 정보구조(IA)를 정의한다. 기능 구현 상세는 40_관리자기능정의서_v0.1을 참조한다."),
    ("연결 방식", "D열 기능 ID와 E열 매핑 기능은 40_관리자기능정의서_v0.1의 해당 기능으로 연결한다. C열은 화면을 구성하는 정보요소를 정의한다."),
)

MENU_FUNCTION_IDS = {
    "M01": "ADM-ORD-001",
    "M02": "ADM-ORG-001",
    "M03": "ADM-USR-001",
    "M04": "ADM-USR-005",
    "M05": "ADM-USR-006",
    "M06": "ADM-PRD-001",
    "M07": "ADM-PRD-002",
    "M08": "ADM-PRD-004",
    "M09": "ADM-PRD-005",
    "M10": "ADM-ORD-001",
    "M11": "ADM-ORD-003",
    "M12": "ADM-REF-001",
    "M13": "ADM-REF-002",
    "M14": "ADM-SUP-001",
    "M15": "ADM-FIL-001",
    "M16": "ADM-AI-001",
    "M17": "ADM-USR-007",
}

MENU_IA_ITEMS = {
    "M01": ("요약 카드: 주문 건수", "처리대기 주문", "최근 주문 요약", "주문 상태별 건수", "주문 상세 진입"),
    "M02": ("조직 코드", "조직명/조직 유형", "상위 조직", "조직 상태", "조직 등록·수정"),
    "M03": ("회원 검색", "로그인 ID/이름", "소속 조직", "회원 상태", "회원 상세 진입", "상태 변경"),
    "M04": ("현재 역할", "부여 가능한 역할", "역할 부여·회수", "변경 이력"),
    "M05": ("판매자명/사업자 정보", "정산 계좌 정보", "판매자 상태", "프로필 등록·수정"),
    "M06": ("카테고리 트리", "카테고리명/코드", "상위 카테고리", "사용 상태", "카테고리 등록·수정"),
    "M07": ("검색어", "상품명/상품코드", "카테고리 필터", "상품 상태", "판매자 조직", "상품 상세 진입"),
    "M08": ("SKU/옵션 목록", "상품 이미지", "상품 파일", "노출 순서", "활성 상태"),
    "M09": ("상품/SKU", "현재고", "예약 재고", "안전 재고", "재고 상태", "재고 수정"),
    "M10": ("주문번호/주문일", "주문자", "주문 상품", "주문 금액", "주문 상태", "상태 변경"),
    "M11": ("결제번호", "주문번호", "결제수단", "결제금액", "결제 상태", "정산 조회"),
    "M12": ("정책명", "적용 조직", "미개봉 환불 여부", "개봉 환불 여부", "불량 환불 여부", "적용 시작일"),
    "M13": ("환불 요청번호", "주문번호/상품", "요청 사유", "요청 금액", "환불 상태", "승인·거절"),
    "M14": ("문의번호", "문의 유형", "문의 제목/내용", "문의 상태", "답변 작성", "처리 이력"),
    "M15": ("파일명", "파일 유형/크기", "소속 조직", "연결 도메인", "다운로드·삭제"),
    "M16": ("문서 제목", "문서 유형", "소속 조직", "RAG 청크", "검색·재색인 상태"),
    "M17": ("관리자 이름", "연락처", "소속 조직", "비밀번호 변경"),
}


def copy_sheet_base(source: Worksheet, target: Worksheet, columns: int) -> None:
    """Copy the visual base of a seller sheet without copying its content."""
    target.sheet_format = copy.copy(source.sheet_format)
    target.sheet_properties = copy.copy(source.sheet_properties)
    target.page_margins = copy.copy(source.page_margins)
    target.page_setup = copy.copy(source.page_setup)
    target.print_options = copy.copy(source.print_options)
    target.sheet_view.showGridLines = source.sheet_view.showGridLines
    target.freeze_panes = source.freeze_panes

    for key, dimension in source.column_dimensions.items():
        if source[key + "1"].column <= columns:
            target.column_dimensions[key] = copy.copy(dimension)
    for key, dimension in source.row_dimensions.items():
        target.row_dimensions[key] = copy.copy(dimension)

    for row in range(1, source.max_row + 1):
        for column in range(1, columns + 1):
            source_cell = source.cell(row, column)
            target_cell = target.cell(row, column)
            copy_cell_style(source_cell, target_cell)


def copy_cell_style(source_cell, target_cell) -> None:
    """Copy the visible Excel style components explicitly from the template."""
    target_cell.fill = copy.copy(source_cell.fill)
    target_cell.font = copy.copy(source_cell.font)
    target_cell.border = copy.copy(source_cell.border)
    target_cell.alignment = copy.copy(source_cell.alignment)
    target_cell.number_format = source_cell.number_format
    target_cell.protection = copy.copy(source_cell.protection)
    # Preserve any composite style details that Excel stores beyond the public
    # style components, especially on merged cells with edge borders.
    target_cell._style = copy.copy(source_cell._style)


def copy_row_style(source: Worksheet, target: Worksheet, source_row: int, target_row: int, columns: int) -> None:
    target.row_dimensions[target_row].height = source.row_dimensions[source_row].height
    for column in range(1, columns + 1):
        source_cell = source.cell(source_row, column)
        target_cell = target.cell(target_row, column)
        copy_cell_style(source_cell, target_cell)


def merge_metadata(sheet: Worksheet, end_column: int, metadata_rows: int) -> None:
    sheet.merge_cells(start_row=1, start_column=1, end_row=1, end_column=end_column)
    for row in range(2, metadata_rows + 2):
        sheet.merge_cells(start_row=row, start_column=2, end_row=row, end_column=end_column)


def write_metadata(sheet: Worksheet, title: str, metadata: tuple[tuple[str, str], ...]) -> None:
    sheet.cell(1, 1, title)
    for row, (label, value) in enumerate(metadata, start=2):
        sheet.cell(row, 1, label)
        sheet.cell(row, 2, value)


def function_rows() -> tuple[tuple[str, ...], ...]:
    rows = []
    for function_id, category, subcategory, feature, description, endpoint, scope, inputs, result, _, source in FUNCTION_ROWS:
        if category == "조직/사용자":
            table = "org_units, users, seller_profiles, user_roles"
        elif category == "상품":
            table = "categories, products, product_variants, product_images, product_files, inventories"
        elif category == "주문/결제":
            table = "orders, order_items, payments"
        elif category == "환불":
            table = "refund_policies, refund_requests, refund_items"
        elif category == "파일":
            table = "files"
        elif category == "고객지원":
            table = "buyer_inquiries, inquiry_answers"
        else:
            table = "rag_documents, rag_chunks"
        if category == "AI/지식":
            implementation = "현재 DB 가능(조건부)"
        else:
            implementation = "현재 DB 가능"
        query = f"{endpoint}; {scope}; {description}"
        rows.append((function_id, feature, f"관리자 > {category} > {subcategory}", implementation, table, query))
    return tuple(rows)


def copy_conditional_formatting(source: Worksheet, target: Worksheet, target_range: str) -> None:
    """Copy seller status-color rules to the administrator implementation column."""
    for conditional_range in source.conditional_formatting:
        for rule in source.conditional_formatting[conditional_range]:
            target.conditional_formatting.add(target_range, copy.copy(rule))


def write_function_sheet(workbook, template: Worksheet, replace: bool) -> dict[str, int]:
    if FUNCTION_SHEET in workbook.sheetnames:
        if not replace:
            raise ValueError(f"시트가 이미 존재합니다: {FUNCTION_SHEET} (덮어쓰려면 --replace 사용)")
        del workbook[FUNCTION_SHEET]
    sheet = workbook.create_sheet(FUNCTION_SHEET)
    copy_sheet_base(template, sheet, 6)
    merge_metadata(sheet, 6, len(FUNCTION_METADATA))
    for coordinate in ("A1", "A2", "A3", "A4", "A5", "A6", "B2", "B3", "B4", "B5", "B6"):
        copy_cell_style(template[coordinate], sheet[coordinate])
    write_metadata(sheet, "관리자_기능 정의서", FUNCTION_METADATA)

    current_row = 8
    id_to_row = {}
    previous_category = None
    for function_id, category, subcategory, feature, description, endpoint, scope, inputs, result, _, source in FUNCTION_ROWS:
        if category != previous_category:
            if current_row != 8:
                current_row += 1
            sheet.merge_cells(start_row=current_row, start_column=1, end_row=current_row, end_column=6)
            copy_row_style(template, sheet, 8, current_row, 6)
            copy_cell_style(template["A8"], sheet.cell(current_row, 1))
            sheet.cell(current_row, 1, f"{category} > {subcategory}")
            previous_category = category
            current_row += 1
            for column, header in enumerate(FUNCTION_HEADERS, start=1):
                sheet.cell(current_row, column, header)
            copy_row_style(template, sheet, 9, current_row, 6)
            current_row += 1
        copy_row_style(template, sheet, 10, current_row, 6)
        values = next(row for row in function_rows() if row[0] == function_id)
        for column, value in enumerate(values, start=1):
            sheet.cell(current_row, column, value)
        id_to_row[function_id] = current_row
        current_row += 1

    sheet.freeze_panes = "A10"
    copy_conditional_formatting(template, sheet, f"D9:D{current_row - 1}")
    return id_to_row


def write_menu_sheet(workbook, template: Worksheet, function_locations: dict[str, int], replace: bool) -> None:
    if MENU_SHEET in workbook.sheetnames:
        if not replace:
            raise ValueError(f"시트가 이미 존재합니다: {MENU_SHEET} (덮어쓰려면 --replace 사용)")
        del workbook[MENU_SHEET]
    sheet = workbook.create_sheet(MENU_SHEET)
    copy_sheet_base(template, sheet, 6)
    merge_metadata(sheet, 6, len(MENU_METADATA))
    for coordinate in ("A1", "A2", "A3", "A4", "A5", "B2", "B3", "B4", "B5"):
        copy_cell_style(template[coordinate], sheet[coordinate])
    write_metadata(sheet, "관리자_MVP 메뉴·정보구조", MENU_METADATA)
    header_row = 7
    for column, header in enumerate(MENU_HEADERS, start=1):
        sheet.cell(header_row, column, header)
    copy_row_style(template, sheet, 7, header_row, 6)

    current_row = 8
    menu_ranges: dict[str, list[int]] = {}
    screen_ranges: list[list[int]] = []
    function_rows_by_id = {row[0]: row for row in function_rows()}
    for menu_id, first, second, third, name, purpose, features, api, scope, _, note in MENU_ROWS:
        function_id = MENU_FUNCTION_IDS.get(menu_id, "")
        function = function_rows_by_id.get(function_id)
        feature_name = function[1] if function else name
        implementation = ("DB 확장 필요" if menu_id == "M01" else function[3]) if function else "현재 DB 가능(조건부)"
        mapping = f'=HYPERLINK("#\'40_관리자기능정의서_v0.1\'!B{function_locations[function_id]}","{feature_name}")' if function_id else name
        ia_items = MENU_IA_ITEMS[menu_id]
        rows_for_menu = []
        for ia_index, ia in enumerate(ia_items):
            copy_row_style(template, sheet, 8, current_row, 6)
            values = (
                first if ia_index == 0 else None,
                (second or third) if ia_index == 0 else None,
                ia,
                function_id if ia_index == 0 else None,
                mapping if ia_index == 0 else None,
                implementation if ia_index == 0 else None,
            )
            for column, value in enumerate(values, start=1):
                sheet.cell(current_row, column, value)
            rows_for_menu.append(current_row)
            current_row += 1
        menu_ranges.setdefault(first, []).extend(rows_for_menu)
        screen_ranges.append(rows_for_menu)

    for rows in menu_ranges.values():
        if len(rows) > 1:
            sheet.merge_cells(start_row=rows[0], start_column=1, end_row=rows[-1], end_column=1)
    for rows in screen_ranges:
        if len(rows) > 1:
            sheet.merge_cells(start_row=rows[0], start_column=2, end_row=rows[-1], end_column=2)
    sheet.freeze_panes = "A8"
    copy_conditional_formatting(template, sheet, f"F8:F{current_row - 1}")


def build_workbook(input_path: Path, output_path: Path, replace: bool = False) -> None:
    workbook = load_workbook(input_path)
    try:
        function_template = workbook["50_셀러기능정의서_v0.1"]
        menu_template = workbook["51_셀러MVP메뉴구조_v0.1"]
    except KeyError as exc:
        raise ValueError("50_셀러기능정의서_v0.1 또는 51_셀러MVP메뉴구조_v0.1 시트를 찾을 수 없습니다.") from exc
    function_locations = write_function_sheet(workbook, function_template, replace)
    write_menu_sheet(workbook, menu_template, function_locations, replace)
    workbook.save(output_path)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("input", type=Path, help="기존 shopdb xlsx 파일")
    parser.add_argument("-o", "--output", type=Path, help="출력 xlsx 파일. 기본값은 입력 파일 덮어쓰기")
    parser.add_argument("--replace", action="store_true", help="같은 이름의 기존 생성 시트를 교체")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    input_path = args.input.resolve()
    output_path = (args.output or input_path).resolve()
    if not input_path.is_file():
        raise SystemExit(f"입력 파일을 찾을 수 없습니다: {input_path}")
    build_workbook(input_path, output_path, replace=args.replace)
    print(f"생성 완료: {output_path}")
    print(f"추가 시트: {FUNCTION_SHEET}, {MENU_SHEET}")


if __name__ == "__main__":
    main()