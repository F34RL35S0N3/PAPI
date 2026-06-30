"""
Price API router for PasarPintar AI.
Handles market price data queries and chart data.
"""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from database.connection import get_db
from services.price_service import (
    get_all_products,
    get_price_history,
    get_price_summary,
)

router = APIRouter(prefix="/api/prices", tags=["Prices"])


@router.get("/products")
async def list_products(
    category: str = Query(None, description="Filter by category: batik, kerajinan, pangan"),
    db: AsyncSession = Depends(get_db),
):
    """Get all products with their latest prices."""
    products = await get_all_products(db)
    if category:
        products = [p for p in products if p["category"] == category]
    return products


@router.get("/history")
async def price_history(
    product_id: int = Query(None, description="Filter by product ID"),
    category: str = Query(None, description="Filter by category"),
    weeks: int = Query(12, description="Number of weeks to look back"),
    source: str = Query(None, description="Filter by price source"),
    db: AsyncSession = Depends(get_db),
):
    """
    Get price history data for chart visualization.
    Can be filtered by product, category, time range, and source.
    """
    return await get_price_history(db, product_id, category, weeks, source)


@router.get("/summary")
async def price_summary(
    category: str = Query(None, description="Filter by category"),
    db: AsyncSession = Depends(get_db),
):
    """
    Get price summary statistics per product.
    Includes current price, trend, change %, min, max, average, moving averages.
    """
    return await get_price_summary(db, category)


@router.get("/categories")
async def get_categories():
    """Get available product categories."""
    return [
        {"id": "batik", "name": "Batik", "icon": "🧵", "description": "Kain & produk batik Solo"},
        {"id": "kerajinan", "name": "Kerajinan", "icon": "🎭", "description": "Kerajinan tangan tradisional"},
        {"id": "pangan", "name": "Pangan", "icon": "🌾", "description": "Bahan pangan & rempah lokal"},
    ]


@router.get("/sources")
async def get_sources():
    """Get available price data sources."""
    return [
        {"id": "pasar_klewer", "name": "Pasar Klewer", "type": "offline"},
        {"id": "pasar_gede", "name": "Pasar Gede", "type": "offline"},
        {"id": "pasar_triwindu", "name": "Pasar Triwindu", "type": "offline"},
        {"id": "pasar_legi", "name": "Pasar Legi", "type": "offline"},
        {"id": "tokopedia", "name": "Tokopedia", "type": "online"},
        {"id": "shopee", "name": "Shopee", "type": "online"},
    ]
