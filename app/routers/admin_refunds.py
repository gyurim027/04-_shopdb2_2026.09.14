"""Reserved router for Admin Refunds domain.

Do not rename this file. The assigned developer replaces/extends only this
module for the domain implementation.
"""

from fastapi import APIRouter


router = APIRouter(prefix="/admin/refunds", tags=["Admin Refunds"])
