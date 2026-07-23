from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import List, Optional
from services.business_service import generate_copilot_plan

router = APIRouter(prefix="/api/business/copilot", tags=["Business"])

class CopilotProduct(BaseModel):
    name: str
    capital_price: float
    selling_price: float
    target_margin: float
    trend: str = "stabil"

class CopilotRequest(BaseModel):
    products: List[CopilotProduct]

@router.post("/")
async def copilot_plan(request: CopilotRequest):
    """
    Generate Business Copilot Daily Action Plan based on products health.
    """
    products_dict = [p.dict() for p in request.products]
    result = await generate_copilot_plan(products_dict)
    return result
