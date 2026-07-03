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


@router.get("/stream")
async def live_prices_stream(
    category: str = Query(None, description="Filter by category")
):
    """
    Server-Sent Events (SSE) endpoint to push live price updates.
    Checks the background worker state and broadcasts new data.
    """
    from fastapi.responses import StreamingResponse
    import asyncio
    import worker
    import json
    from services.price_service import get_price_summary, get_price_history, get_alerts
    from services.recommendation_service import get_recommendations

    from database.connection import async_session
    import json
    from fastapi.encoders import jsonable_encoder

    async def get_all_dashboard_data(session: AsyncSession):
        summaries = await get_price_summary(session, category)
        recs = await get_recommendations(session, category)
        alerts = await get_alerts(session, False)
        history = await get_price_history(session, None, category, 12, None)
        
        return {
            "summaries": jsonable_encoder(summaries),
            "recs": jsonable_encoder(recs),
            "alerts": jsonable_encoder(alerts),
            "history": jsonable_encoder(history)
        }

    async def event_generator():
        try:
            print(f"[SSE] Starting stream for category: {category}")
            # Fetch and send initial data
            async with async_session() as db_session:
                initial_data = await get_all_dashboard_data(db_session)
                yield f"data: {json.dumps(initial_data)}\n\n"
            
            # Loop for updates
            while True:
                await asyncio.sleep(2)
                if worker.has_new_data:
                    print(f"[SSE] Broadcasting new live data for {category or 'all'}...")
                    async with async_session() as db_session:
                        new_data = await get_all_dashboard_data(db_session)
                    yield f"data: {json.dumps(new_data)}\n\n"
                    worker.has_new_data = False # reset flag
        except asyncio.CancelledError:
            print("[SSE] Client disconnected")
            raise
        except Exception as e:
            print(f"[SSE] Error in generator: {e}")
            yield f"event: error\ndata: {str(e)}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")


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
