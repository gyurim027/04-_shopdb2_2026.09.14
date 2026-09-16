"""Pydantic schemas for seller_info (S-INFO-01~03 + S-SALES-05 정산계좌)."""

from pydantic import BaseModel, Field


class SellerProfileOut(BaseModel):
    seller_id: int
    user_id: int
    company_name: str
    business_number: str | None
    representative_name: str | None
    seller_status: str
    user_name: str
    email: str | None
    phone: str | None


class SellerProfileUpdate(BaseModel):
    company_name: str | None = Field(None, max_length=200)
    business_number: str | None = Field(None, max_length=30)
    representative_name: str | None = Field(None, max_length=100)


class SellerStatusOut(BaseModel):
    seller_status: str


class SellerSettlementAccountOut(BaseModel):
    settlement_bank: str | None
    settlement_account: str | None


class SellerSettlementAccountUpdate(BaseModel):
    settlement_bank: str = Field(..., max_length=100)
    settlement_account: str = Field(..., max_length=100)
