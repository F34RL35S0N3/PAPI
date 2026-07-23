from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import List
from services.business_service import calculate_health_score

router = APIRouter(prefix="/api/business/health-score", tags=["Business"])

class HealthScoreRequest(BaseModel):
    product_name: str
    category: str
    location: str
    capital_price: float
    selling_price: float
    stock: int
    target_margin: float
    competitor_price: float
    trend: str = "stabil"
    promotion_text: str = ""

from services.ai_service import generate_health_diagnosis_explanation

@router.post("/")
async def get_health_score(request: HealthScoreRequest):
    """
    Calculate Smart Business Health Score based on product metrics and get AI diagnosis.
    """
    if request.capital_price <= 0:
        raise HTTPException(status_code=400, detail="Modal harus lebih besar dari 0")
        
    result = calculate_health_score(
        product_name=request.product_name,
        category=request.category,
        location=request.location,
        capital_price=request.capital_price,
        selling_price=request.selling_price,
        stock=request.stock,
        target_margin=request.target_margin,
        competitor_price=request.competitor_price,
        trend=request.trend,
        promotion_text=request.promotion_text
    )
    
    # Generate explanation layer in local language
    explanation = await generate_health_diagnosis_explanation(result)
    result["ai_explanation"] = explanation
    
    return result
