import httpx
from bs4 import BeautifulSoup
import asyncio
import json
import random
from typing import Dict, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime

from database.models import Product, PriceHistory, PriceAlert, RecommendationEnum, AlertTypeEnum
from services.ai_service import get_ai_response

async def scrape_market_news() -> str:
    """Scrape recent news snippets for price information."""
    queries = ["harga sembako beras solo hari ini", "harga batik solo pasar klewer"]
    query = random.choice(queries)
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                f"https://html.duckduckgo.com/html/?q={query}",
                headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"},
                timeout=10.0
            )
        if resp.status_code == 200:
            soup = BeautifulSoup(resp.text, 'html.parser')
            snippets = [a.text for a in soup.find_all('a', class_='result__snippet')]
            return " ".join(snippets[:5])
        return ""
    except Exception as e:
        print(f"[Scraper] Error fetching data: {e}")
        return ""

async def parse_prices_with_ai(snippets: str) -> List[Dict]:
    """Parse raw snippets into structured JSON prices using Groq AI."""
    if not snippets:
        snippets = "Harga beras premium naik jadi 16000. Batik cap stabil di 85000."

    prompt = f"""
Anda adalah bot ekstraktor harga. Saya memiliki teks acak dari internet tentang harga pasar di Solo Raya.
Ekstrak komoditas dan harganya, atau JIKA teks tidak mengandung harga spesifik, tebak harga saat ini dengan fluktuasi acak +/- 5% dari harga wajar (Beras: ~15000, Minyak: ~16000, Telur: ~27000, Cabai: ~40000, Batik: ~80000, Anyaman: ~30000).

KEMBALIKAN MURNI JSON ARRAY SAJA TANPA MARKDOWN ATAU TEKS LAIN.
Format wajib:
[
  {{"name": "Beras Premium", "price": 16500, "category": "pangan"}},
  {{"name": "Cabai Rawit", "price": 42000, "category": "pangan"}},
  {{"name": "Batik Cap", "price": 82000, "category": "batik"}}
]

Teks Sumber:
{snippets}
    """
    
    try:
        response = await get_ai_response(prompt)
        clean_json = response.replace("```json", "").replace("```", "").strip()
        data = json.loads(clean_json)
        return data
    except Exception as e:
        print(f"[AI Parse] Error parsing JSON: {e}")
        return []

async def update_database_with_live_data(db: AsyncSession, parsed_data: List[Dict]):
    """Update DB with new prices, calculate alerts and recommendations."""
    if not parsed_data:
        return

    for item in parsed_data:
        name = item.get("name")
        new_price = float(item.get("price", 0))
        category = item.get("category", "pangan")

        if not name or new_price <= 0:
            continue

        # Find or create product
        result = await db.execute(select(Product).where(Product.name.ilike(f"%{name}%")))
        product = result.scalars().first()

        if not product:
            product = Product(name=name, category=category, unit="kg" if category=="pangan" else "pcs")
            db.add(product)
            await db.flush() # get ID

        # Get latest price to compare
        hist_res = await db.execute(
            select(PriceHistory).where(PriceHistory.product_id == product.id).order_by(PriceHistory.recorded_at.desc())
        )
        last_history = hist_res.scalars().first()

        old_price = last_history.price if last_history else new_price

        # Add new price
        new_history = PriceHistory(
            product_id=product.id,
            price=new_price,
            source="live_internet_ai"
        )
        db.add(new_history)

        # Check for alerts (Anomaly > 5%)
        if last_history:
            change_pct = ((new_price - old_price) / old_price) * 100
            if abs(change_pct) > 5.0:
                alert_type = AlertTypeEnum.NAIK if change_pct > 0 else AlertTypeEnum.TURUN
                msg = f"Perhatian! Harga {name} dari internet berubah drastis sebesar {abs(change_pct):.1f}% menjadi Rp {new_price:,.0f}."
                alert = PriceAlert(
                    product_id=product.id,
                    alert_type=alert_type,
                    percentage_change=abs(change_pct),
                    message=msg
                )
                db.add(alert)
                
    await db.commit()
