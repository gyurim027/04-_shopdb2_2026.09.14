"""Reserved router for Admin Support domain.

Do not rename this file. The assigned developer replaces/extends only this
module for the domain implementation.
"""

from fastapi import APIRouter


router = APIRouter(prefix="/admin/support", tags=["Admin Support"])
