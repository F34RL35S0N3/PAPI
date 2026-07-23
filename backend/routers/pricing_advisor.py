from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from services.business_service import get_pricing_advice

router = APIRouter(prefix="/api/business/pricing-advisor", tags=["Business"])

class PricingAdvisorRequest(BaseModel):
    capital_price: float
    target_margin: float
    competitor_price: float
    trend: str = "stabil"

@router.post("/")
async def pricing_advisor(request: PricingAdvisorRequest):
    """
    Get AI Pricing Advice based on capital, target margin, competitor price, and market trend.
    """
    if request.capital_price <= 0:
        raise HTTPException(status_code=400, detail="Modal harus lebih besar dari 0")
        
    result = get_pricing_advice(
        capital_price=request.capital_price,
        target_margin=request.target_margin,
        competitor_price=request.competitor_price,
        trend=request.trend
    )
    return result
