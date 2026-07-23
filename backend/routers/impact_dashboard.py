"""
Impact Dashboard Router for PasarPintar AI.
Provides 4 key metrics + action log table for Constraint 2.
"""

from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import Optional

from database.connection import get_db
from database.models import PriceHistory, Product, ActivityLog
from routers.auth import get_current_user

router = APIRouter(prefix="/api/impact", tags=["Impact Dashboard"])


@router.get("/metrics")
async def get_impact_metrics(
    district: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    """
    Return 4 key impact metrics for Smart Impact Dashboard (Constraint 2).
    """
    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    week_ago = datetime.utcnow() - timedelta(days=7)

    # 1. Average Health Score (simulated aggregate based on price data)
    # We compute a proxy from actual price movements
    price_query = select(Product.id, Product.name, Product.category)
    if category:
        price_query = price_query.where(Product.category == category)
    products_result = await db.execute(price_query)
    products = products_result.all()

    avg_health_score = 72  # baseline
    total_volatility = 0.0
    volatility_count = 0

    for prod_id, prod_name, prod_cat in products:
        # Get recent prices for this product
        recent_prices_q = await db.execute(
            select(PriceHistory.price)
            .where(PriceHistory.product_id == prod_id)
            .order_by(PriceHistory.recorded_at.desc())
            .limit(14)
        )
        prices = [r[0] for r in recent_prices_q.all()]
        if len(prices) >= 2:
            change_pct = abs((prices[0] - prices[-1]) / prices[-1]) * 100
            total_volatility += change_pct
            volatility_count += 1

    raw_material_volatility = round(total_volatility / max(volatility_count, 1), 1)

    # Adjust health score based on volatility
    if raw_material_volatility > 15:
        avg_health_score = 55
    elif raw_material_volatility > 10:
        avg_health_score = 65
    elif raw_material_volatility > 5:
        avg_health_score = 72

    # 2. Estimated Profit Optimization %
    profit_optimization = round(max(5, 25 - raw_material_volatility), 1)

    # 3. Raw Material Volatility Index
    # Already computed above

    # 4. Active Business Actions Executed (from activity logs today)
    actions_q = await db.execute(
        select(func.count(ActivityLog.id))
        .where(ActivityLog.created_at >= today_start)
        .where(ActivityLog.status == "success")
    )
    actions_executed = actions_q.scalar() or 0

    return {
        "avg_health_score": avg_health_score,
        "profit_optimization_pct": profit_optimization,
        "raw_material_volatility_pct": raw_material_volatility,
        "actions_executed": actions_executed,
        "filters_applied": {
            "district": district,
            "category": category,
        }
    }


@router.get("/action-items")
async def get_action_items(
    district: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    """
    Return Action Log Table items — products/commodities needing intervention.
    """
    week_ago = datetime.utcnow() - timedelta(days=7)

    price_query = select(Product.id, Product.name, Product.category)
    if category:
        price_query = price_query.where(Product.category == category)
    products_result = await db.execute(price_query)
    products = products_result.all()

    action_items = []
    for prod_id, prod_name, prod_cat in products:
        recent_q = await db.execute(
            select(PriceHistory.price, PriceHistory.recorded_at)
            .where(PriceHistory.product_id == prod_id)
            .order_by(PriceHistory.recorded_at.desc())
            .limit(14)
        )
        rows = recent_q.all()
        if len(rows) < 2:
            continue

        latest_price = rows[0][0]
        oldest_price = rows[-1][0]
        change_pct = round(((latest_price - oldest_price) / oldest_price) * 100, 1)
        last_updated = rows[0][1]

        # Determine condition and priority
        if change_pct > 10:
            condition = f"Harga Melonjak {change_pct}%"
            priority = "high"
            action_type = "pricing"
        elif change_pct > 5:
            condition = f"Harga Naik {change_pct}%"
            priority = "medium"
            action_type = "descriptions"
        elif change_pct < -5:
            condition = f"Harga Turun {abs(change_pct)}%"
            priority = "medium"
            action_type = "simulator"
        else:
            condition = "Harga Stabil"
            priority = "low"
            action_type = "simulator"

        # Map category to Indonesian
        cat_map = {
            "pangan": "Pangan / Sembako",
            "batik": "Batik & Fesyen",
            "kerajinan": "Kriya",
        }

        action_items.append({
            "name": prod_name,
            "category": cat_map.get(prod_cat, prod_cat),
            "condition": condition,
            "priority": priority,
            "change_pct": change_pct,
            "last_updated": last_updated.isoformat() if last_updated else None,
            "action_type": action_type,
        })

    # Sort by priority
    priority_order = {"high": 0, "medium": 1, "low": 2}
    action_items.sort(key=lambda x: priority_order.get(x["priority"], 3))

    return action_items
