"""
Price Alerts API router for PasarPintar AI.
Handles price anomaly detection and alert management.
"""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import update
from database.connection import get_db
from database.models import PriceAlert
from services.price_service import get_alerts, detect_anomalies

router = APIRouter(prefix="/api/alerts", tags=["Alerts"])


@router.get("/")
async def list_alerts(
    unread_only: bool = Query(False, description="Only show unread alerts"),
    db: AsyncSession = Depends(get_db),
):
    """Get all price alerts, optionally filtered to unread only."""
    return await get_alerts(db, unread_only)


@router.get("/anomalies")
async def check_anomalies(
    threshold: float = Query(15.0, description="Percentage threshold for anomaly detection"),
    db: AsyncSession = Depends(get_db),
):
    """
    Detect current price anomalies.
    Returns products where price change exceeds the threshold.
    """
    return await detect_anomalies(db, threshold)


@router.put("/{alert_id}/read")
async def mark_alert_read(alert_id: int, db: AsyncSession = Depends(get_db)):
    """Mark an alert as read."""
    await db.execute(
        update(PriceAlert).where(PriceAlert.id == alert_id).values(is_read=1)
    )
    await db.commit()
    return {"status": "ok", "message": "Alert ditandai sudah dibaca"}


@router.get("/count")
async def alert_count(db: AsyncSession = Depends(get_db)):
    """Get count of unread alerts."""
    alerts = await get_alerts(db, unread_only=True)
    return {"unread_count": len(alerts)}
