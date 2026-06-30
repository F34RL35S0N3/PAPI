"""
Price analytics service for PasarPintar AI.
Handles price trend analysis, moving averages, and anomaly detection.
"""

from datetime import datetime, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from database.models import Product, PriceHistory, PriceAlert
import statistics


async def get_all_products(session: AsyncSession) -> list[dict]:
    """Get all products with their latest prices."""
    result = await session.execute(
        select(Product).order_by(Product.category, Product.name)
    )
    products = result.scalars().all()

    product_list = []
    for product in products:
        latest_price = await get_latest_price(session, product.id)
        product_list.append({
            "id": product.id,
            "name": product.name,
            "category": product.category,
            "unit": product.unit,
            "description": product.description,
            "latest_price": latest_price,
        })

    return product_list


async def get_latest_price(session: AsyncSession, product_id: int) -> float | None:
    """Get the most recent price for a product (average across sources)."""
    result = await session.execute(
        select(func.avg(PriceHistory.price))
        .where(PriceHistory.product_id == product_id)
        .where(PriceHistory.recorded_at >= datetime.utcnow() - timedelta(weeks=1))
    )
    avg_price = result.scalar()
    return round(avg_price, 0) if avg_price else None


async def get_price_history(
    session: AsyncSession,
    product_id: int = None,
    category: str = None,
    weeks: int = 12,
    source: str = None,
) -> list[dict]:
    """
    Get price history for chart visualization.
    
    Args:
        session: Database session
        product_id: Filter by specific product
        category: Filter by category (batik/kerajinan/pangan)
        weeks: Number of weeks to look back
        source: Filter by price source
    
    Returns:
        List of price data points for charts
    """
    query = (
        select(PriceHistory, Product)
        .join(Product, PriceHistory.product_id == Product.id)
        .where(PriceHistory.recorded_at >= datetime.utcnow() - timedelta(weeks=weeks))
        .order_by(PriceHistory.recorded_at)
    )

    if product_id:
        query = query.where(PriceHistory.product_id == product_id)
    if category:
        query = query.where(Product.category == category)
    if source:
        query = query.where(PriceHistory.source == source)

    result = await session.execute(query)
    rows = result.all()

    price_data = []
    for price_history, product in rows:
        price_data.append({
            "id": price_history.id,
            "product_id": product.id,
            "product_name": product.name,
            "category": product.category,
            "unit": product.unit,
            "price": price_history.price,
            "source": price_history.source,
            "recorded_at": price_history.recorded_at.isoformat(),
        })

    return price_data


async def get_price_summary(session: AsyncSession, category: str = None) -> list[dict]:
    """
    Get price summary statistics per product.
    Includes current price, change %, trend direction, min, max, average.
    """
    query = select(Product).order_by(Product.category, Product.name)
    if category:
        query = query.where(Product.category == category)

    result = await session.execute(query)
    products = result.scalars().all()

    summaries = []
    for product in products:
        # Get all prices for this product in the last 12 weeks
        prices_result = await session.execute(
            select(PriceHistory.price, PriceHistory.recorded_at)
            .where(PriceHistory.product_id == product.id)
            .order_by(PriceHistory.recorded_at)
        )
        price_rows = prices_result.all()

        if not price_rows:
            continue

        all_prices = [row[0] for row in price_rows]
        
        # Recent prices (last 2 weeks) vs older prices (2-4 weeks ago)
        midpoint = len(all_prices) // 2
        recent_avg = statistics.mean(all_prices[midpoint:]) if all_prices[midpoint:] else 0
        older_avg = statistics.mean(all_prices[:midpoint]) if all_prices[:midpoint] else 0

        # Calculate change percentage
        if older_avg > 0:
            change_pct = ((recent_avg - older_avg) / older_avg) * 100
        else:
            change_pct = 0

        # Determine trend
        if change_pct > 3:
            trend = "naik"
        elif change_pct < -3:
            trend = "turun"
        else:
            trend = "stabil"

        # Moving averages
        ma_7 = statistics.mean(all_prices[-3:]) if len(all_prices) >= 3 else recent_avg  # ~3 entries for 7-day
        ma_14 = statistics.mean(all_prices[-6:]) if len(all_prices) >= 6 else recent_avg  # ~6 entries for 14-day

        summaries.append({
            "product_id": product.id,
            "product_name": product.name,
            "category": product.category,
            "unit": product.unit,
            "current_price": round(recent_avg, 0),
            "previous_price": round(older_avg, 0),
            "change_percentage": round(change_pct, 1),
            "trend": trend,
            "min_price": round(min(all_prices), 0),
            "max_price": round(max(all_prices), 0),
            "avg_price": round(statistics.mean(all_prices), 0),
            "ma_7": round(ma_7, 0),
            "ma_14": round(ma_14, 0),
        })

    return summaries


async def get_price_context_for_ai(session: AsyncSession) -> str:
    """
    Generate a text summary of current market prices for AI context injection.
    """
    summaries = await get_price_summary(session)

    if not summaries:
        return "Data harga belum tersedia."

    lines = ["Berikut data harga pasar Solo Raya terkini:\n"]

    current_category = ""
    for s in summaries:
        if s["category"] != current_category:
            current_category = s["category"]
            category_name = {"batik": "🧵 BATIK", "kerajinan": "🎭 KERAJINAN", "pangan": "🌾 PANGAN"}.get(current_category, current_category.upper())
            lines.append(f"\n{category_name}:")

        trend_emoji = {"naik": "📈", "turun": "📉", "stabil": "➡️"}.get(s["trend"], "")
        lines.append(
            f"- {s['product_name']}: Rp {s['current_price']:,.0f}/{s['unit']} "
            f"({trend_emoji} {s['trend']}, {s['change_percentage']:+.1f}%) "
            f"[Range: Rp {s['min_price']:,.0f} - Rp {s['max_price']:,.0f}]"
        )

    return "\n".join(lines)


async def detect_anomalies(session: AsyncSession, threshold: float = 15.0) -> list[dict]:
    """
    Detect price anomalies where change exceeds threshold percentage.
    """
    summaries = await get_price_summary(session)
    anomalies = []

    for s in summaries:
        if abs(s["change_percentage"]) >= threshold:
            anomalies.append({
                "product_id": s["product_id"],
                "product_name": s["product_name"],
                "category": s["category"],
                "alert_type": "naik" if s["change_percentage"] > 0 else "turun",
                "percentage_change": s["change_percentage"],
                "current_price": s["current_price"],
                "previous_price": s["previous_price"],
                "message": (
                    f"Harga {s['product_name']} {'naik' if s['change_percentage'] > 0 else 'turun'} "
                    f"{abs(s['change_percentage']):.1f}% dari Rp {s['previous_price']:,.0f} "
                    f"ke Rp {s['current_price']:,.0f}/{s['unit']}"
                ),
            })

    return anomalies


async def get_alerts(session: AsyncSession, unread_only: bool = False) -> list[dict]:
    """Get price alerts from database."""
    query = (
        select(PriceAlert, Product)
        .join(Product, PriceAlert.product_id == Product.id)
        .order_by(PriceAlert.created_at.desc())
    )

    if unread_only:
        query = query.where(PriceAlert.is_read == 0)

    result = await session.execute(query)
    rows = result.all()

    alerts = []
    for alert, product in rows:
        alerts.append({
            "id": alert.id,
            "product_id": product.id,
            "product_name": product.name,
            "category": product.category,
            "alert_type": alert.alert_type,
            "percentage_change": alert.percentage_change,
            "message": alert.message,
            "is_read": alert.is_read,
            "created_at": alert.created_at.isoformat(),
        })

    return alerts
