"""
Product Description Generator API router for PasarPintar AI.
AI-powered copywriting for online marketplace listings.
"""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from database.connection import get_db
from services.ai_service import generate_product_description

router = APIRouter(prefix="/api/descriptions", tags=["Descriptions"])


class DescriptionRequest(BaseModel):
    product_name: str
    category: str = ""
    additional_info: str = ""
    image: Optional[str] = None


class DescriptionResponse(BaseModel):
    description: str
    product_name: str


@router.post("/generate", response_model=DescriptionResponse)
async def generate_description(request: DescriptionRequest, db: AsyncSession = Depends(get_db)):
    """
    Generate an attractive product description for online selling.
    Uses AI to create compelling marketplace-ready copywriting.
    """
    if not request.product_name.strip():
        raise HTTPException(status_code=400, detail="Nama produk tidak boleh kosong")

    description = await generate_product_description(
        product_name=request.product_name,
        category=request.category,
        additional_info=request.additional_info,
        image=request.image
    )

    return DescriptionResponse(
        description=description,
        product_name=request.product_name,
    )
