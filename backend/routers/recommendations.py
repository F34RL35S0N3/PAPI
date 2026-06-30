"""
Recommendations API router for PasarPintar AI.
Provides sell-time recommendations based on price trend analysis.
"""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from database.connection import get_db
from services.recommendation_service import get_recommendations

router = APIRouter(prefix="/api/recommendations", tags=["Recommendations"])


@router.get("/")
async def list_recommendations(
    category: str = Query(None, description="Filter by category: batik, kerajinan, pangan"),
    db: AsyncSession = Depends(get_db),
):
    """
    Get sell-time recommendations for all products.
    
    Each recommendation includes:
    - action: jual_sekarang / tahan / beli_stok
    - confidence: 0-100 score
    - reason: Detailed explanation in Bahasa Indonesia
    - price data: current price, change %, trend
    """
    return await get_recommendations(db, category)


@router.get("/summary")
async def recommendations_summary(db: AsyncSession = Depends(get_db)):
    """
    Get a summary count of recommendations by action type.
    Useful for dashboard summary cards.
    """
    recs = await get_recommendations(db)

    summary = {
        "jual_sekarang": {"count": 0, "products": []},
        "tahan": {"count": 0, "products": []},
        "beli_stok": {"count": 0, "products": []},
    }

    for rec in recs:
        action = rec["action"]
        if action in summary:
            summary[action]["count"] += 1
            summary[action]["products"].append(rec["product_name"])

    return summary
