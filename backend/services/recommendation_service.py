"""
Recommendation service for PasarPintar AI.
Analyzes historical price patterns to recommend optimal sell/buy/hold timing.
"""

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from database.models import Product, PriceHistory
from services.price_service import get_price_summary
import statistics


async def get_recommendations(session: AsyncSession, category: str = None) -> list[dict]:
    """
    Generate sell-time recommendations for all products.
    
    Uses price trend analysis, moving averages, and volatility
    to determine whether to SELL NOW, HOLD, or BUY STOCK.
    
    Returns:
        List of recommendation objects with action, confidence, and reasoning.
    """
    summaries = await get_price_summary(session, category)
    recommendations = []

    for product_summary in summaries:
        recommendation = _analyze_product(product_summary)
        recommendations.append(recommendation)

    # Sort by confidence (highest first)
    recommendations.sort(key=lambda x: x["confidence"], reverse=True)
    return recommendations


def _analyze_product(summary: dict) -> dict:
    """
    Analyze a single product and generate a recommendation.
    
    Logic:
    - JUAL SEKARANG: Price trending up + current price > MA + high confidence
    - TAHAN: Price stable or slight fluctuation
    - BELI STOK: Price trending down + current price < MA (good time to stock up)
    """
    trend = summary["trend"]
    change_pct = summary["change_percentage"]
    current = summary["current_price"]
    ma_7 = summary["ma_7"]
    ma_14 = summary["ma_14"]
    min_price = summary["min_price"]
    max_price = summary["max_price"]
    avg_price = summary["avg_price"]

    # Price position in range (0 = at minimum, 1 = at maximum)
    price_range = max_price - min_price if max_price > min_price else 1
    price_position = (current - min_price) / price_range

    # Determine action
    if trend == "naik" and current >= ma_7:
        action = "jual_sekarang"
        confidence = min(95, 60 + abs(change_pct) * 2 + price_position * 20)
        
        if price_position > 0.8:
            reason = (
                f"Harga {summary['product_name']} sedang di posisi TINGGI "
                f"(Rp {current:,.0f}/{summary['unit']}), naik {change_pct:+.1f}% "
                f"dan sudah mendekati harga tertinggi. "
                f"Momentum jual sangat baik sekarang sebelum potensi koreksi harga."
            )
        else:
            reason = (
                f"Tren harga {summary['product_name']} sedang NAIK {change_pct:+.1f}%. "
                f"Harga saat ini Rp {current:,.0f}/{summary['unit']} "
                f"di atas rata-rata Rp {avg_price:,.0f}. "
                f"Manfaatkan momentum kenaikan untuk menjual dengan margin lebih baik."
            )

    elif trend == "turun" and current <= ma_14:
        action = "beli_stok"
        confidence = min(90, 55 + abs(change_pct) * 2 + (1 - price_position) * 20)
        
        reason = (
            f"Harga {summary['product_name']} sedang TURUN {change_pct:+.1f}%. "
            f"Harga Rp {current:,.0f}/{summary['unit']} mendekati titik rendah "
            f"(minimum Rp {min_price:,.0f}). "
            f"Waktu yang tepat untuk menambah stok karena potensi rebound harga."
        )

    elif trend == "turun" and current > ma_14:
        action = "tahan"
        confidence = min(75, 50 + abs(change_pct))
        
        reason = (
            f"Harga {summary['product_name']} menunjukkan tren menurun ({change_pct:+.1f}%) "
            f"tapi masih di atas rata-rata. "
            f"Tahan stok, pantau apakah harga stabil atau lanjut turun "
            f"sebelum mengambil keputusan."
        )

    elif trend == "stabil":
        action = "tahan"
        confidence = min(80, 60 + (1 - abs(change_pct)) * 5)
        
        reason = (
            f"Harga {summary['product_name']} relatif STABIL di kisaran "
            f"Rp {current:,.0f}/{summary['unit']} (variasi {change_pct:+.1f}%). "
            f"Tidak ada urgensi untuk menjual atau membeli. "
            f"Pantau perkembangan pasar untuk peluang berikutnya."
        )

    else:
        # Default: naik tapi belum cukup kuat
        action = "tahan"
        confidence = 50
        reason = (
            f"Harga {summary['product_name']} bergerak {trend} ({change_pct:+.1f}%). "
            f"Sinyal belum cukup kuat. Pantau 1-2 minggu ke depan."
        )

    return {
        "product_id": summary["product_id"],
        "product_name": summary["product_name"],
        "category": summary["category"],
        "unit": summary["unit"],
        "action": action,
        "confidence": round(confidence),
        "reason": reason,
        "current_price": current,
        "change_percentage": change_pct,
        "trend": trend,
        "price_position": round(price_position * 100),
        "ma_7": ma_7,
        "ma_14": ma_14,
    }
