"""Pydantic schemas for seller inventory."""

from datetime import datetime

from pydantic import BaseModel, Field, computed_field


class SellerInventoryOut(BaseModel):
    """셀러 재고 조회 응답."""

    inventory_id: int

    product_id: int
    product_name: str

    variant_id: int
    sku_code: str

    # 실제로 보유하고 있는 전체 재고입니다.
    stock_quantity: int

    # 주문 접수 등으로 이미 사용이 예정된 재고입니다.
    # 셀러가 직접 수정하지 않고 주문 시스템에서 관리합니다.
    reserved_quantity: int

    # 재고 부족 여부를 판단할 기준 수량입니다.
    safety_stock: int

    updated_at: datetime

    @computed_field
    @property
    def available_quantity(self) -> int:
        """현재 판매 가능한 재고를 계산한다."""

        return max(
            self.stock_quantity - self.reserved_quantity,
            0,
        )

    @computed_field
    @property
    def is_low_stock(self) -> bool:
        """판매 가능 재고가 안전 재고 이하인지 확인한다."""

        return self.available_quantity <= self.safety_stock


class SellerInventoryUpdate(BaseModel):
    """셀러 재고 수정 요청.

    reserved_quantity는 주문 처리 과정에서 관리하므로
    셀러 수정 요청에는 포함하지 않는다.
    """

    stock_quantity: int | None = Field(
        default=None,
        ge=0,
        description="현재 보유 재고",
    )

    safety_stock: int | None = Field(
        default=None,
        ge=0,
        description="재고 부족 판단 기준 수량",
    )


class SellerReservedInventoryOut(BaseModel):
    """예약 재고 조회 응답."""

    variant_id: int

    product_id: int
    product_name: str

    sku_code: str

    stock_quantity: int
    reserved_quantity: int

    @computed_field
    @property
    def available_quantity(self) -> int:
        """현재 판매 가능한 재고를 계산한다."""

        return max(
            self.stock_quantity - self.reserved_quantity,
            0,
        )