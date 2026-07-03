"""
Seed data for PasarPintar AI.
Contains realistic market price data for Solo Raya UMKM products
across 12 weeks, covering batik, kerajinan, and pangan categories.
"""

import random
from datetime import datetime, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from database.models import Product, PriceHistory, PriceAlert, LocalShop, LocalProduct

# ============================================================
# PRODUCT DEFINITIONS
# ============================================================

PRODUCTS = [
    # === BATIK ===
    {
        "name": "Batik Cap Solo",
        "category": "batik",
        "unit": "meter",
        "description": "Kain batik cap khas Solo dengan motif tradisional seperti Parang, Kawung, dan Truntum. Diproduksi oleh pengrajin di kawasan Laweyan dan Kauman.",
    },
    {
        "name": "Batik Tulis Laweyan",
        "category": "batik",
        "unit": "meter",
        "description": "Batik tulis premium dari kampung batik Laweyan, Solo. Proses pembuatan memakan waktu berminggu-minggu dengan detail motif yang sangat halus.",
    },
    {
        "name": "Kain Batik Printing",
        "category": "batik",
        "unit": "meter",
        "description": "Batik printing modern dengan harga terjangkau, cocok untuk kebutuhan sehari-hari dan produksi massal.",
    },
    {
        "name": "Kemeja Batik Solo",
        "category": "batik",
        "unit": "pcs",
        "description": "Kemeja batik siap pakai dari Solo dengan berbagai motif khas Surakarta.",
    },

    # === KERAJINAN ===
    {
        "name": "Wayang Kulit Surakarta",
        "category": "kerajinan",
        "unit": "pcs",
        "description": "Wayang kulit tradisional gaya Surakarta, dibuat oleh dalang dan pengrajin lokal dengan kulit kerbau pilihan.",
    },
    {
        "name": "Keris Solo",
        "category": "kerajinan",
        "unit": "pcs",
        "description": "Keris tradisional Jawa buatan empu Solo dengan pamor dan dapur yang beragam.",
    },
    {
        "name": "Blangkon Surakarta",
        "category": "kerajinan",
        "unit": "pcs",
        "description": "Blangkon gaya Surakarta (model mondolan) yang merupakan penutup kepala tradisional pria Jawa.",
    },
    {
        "name": "Payung Juwiring",
        "category": "kerajinan",
        "unit": "pcs",
        "description": "Payung hias tradisional dari Juwiring, Klaten yang sering digunakan untuk dekorasi pernikahan dan acara adat.",
    },

    # === PANGAN ===
    {
        "name": "Beras Rojolele",
        "category": "pangan",
        "unit": "kg",
        "description": "Beras premium Rojolele khas Solo Raya, dikenal dengan butiran panjang dan aroma wangi alami.",
    },
    {
        "name": "Gula Jawa Solo",
        "category": "pangan",
        "unit": "kg",
        "description": "Gula merah dari nira kelapa atau aren, diproduksi oleh petani di kawasan Solo Raya.",
    },
    {
        "name": "Kedelai Lokal",
        "category": "pangan",
        "unit": "kg",
        "description": "Kedelai lokal berkualitas tinggi, bahan utama pembuatan tempe dan tahu khas Solo.",
    },
    {
        "name": "Jamu Tradisional",
        "category": "pangan",
        "unit": "botol",
        "description": "Jamu tradisional racikan dari rempah-rempah pilihan, warisan budaya Solo yang telah turun-temurun.",
    },
]

# ============================================================
# PRICE PATTERNS (12 weeks of realistic price data)
# ============================================================

def generate_price_series(base_price: float, trend: str, volatility: float = 0.05, weeks: int = 12) -> list[float]:
    """
    Generate a realistic price series.
    
    Args:
        base_price: Starting price
        trend: 'naik', 'turun', 'stabil', 'fluktuatif'
        volatility: Price variation factor (0.0 - 1.0)
        weeks: Number of weeks
    
    Returns:
        List of prices for each week
    """
    prices = []
    current_price = base_price

    for week in range(weeks):
        # Apply trend
        if trend == "naik":
            trend_factor = 1 + random.uniform(0.01, 0.04)
        elif trend == "turun":
            trend_factor = 1 - random.uniform(0.01, 0.03)
        elif trend == "fluktuatif":
            trend_factor = 1 + random.uniform(-0.05, 0.05)
        else:  # stabil
            trend_factor = 1 + random.uniform(-0.01, 0.01)

        # Apply random volatility
        noise = random.uniform(-volatility, volatility)
        current_price = current_price * trend_factor * (1 + noise)

        # Round to reasonable price points
        if current_price >= 10000:
            current_price = round(current_price / 500) * 500
        elif current_price >= 1000:
            current_price = round(current_price / 100) * 100
        else:
            current_price = round(current_price, 0)

        prices.append(current_price)

    return prices


# Price configurations per product (Based on scraped data 2026)
PRICE_CONFIGS = {
    "Batik Cap Solo": {"base": 150000, "trend": "naik", "volatility": 0.04},
    "Batik Tulis Laweyan": {"base": 500000, "trend": "stabil", "volatility": 0.03},
    "Kain Batik Printing": {"base": 40000, "trend": "turun", "volatility": 0.05},
    "Kemeja Batik Solo": {"base": 250000, "trend": "naik", "volatility": 0.04},
    "Wayang Kulit Surakarta": {"base": 600000, "trend": "stabil", "volatility": 0.03},
    "Keris Solo": {"base": 1500000, "trend": "stabil", "volatility": 0.02},
    "Blangkon Surakarta": {"base": 75000, "trend": "naik", "volatility": 0.06},
    "Payung Juwiring": {"base": 100000, "trend": "stabil", "volatility": 0.04},
    "Beras Rojolele": {"base": 17000, "trend": "fluktuatif", "volatility": 0.06},
    "Gula Jawa Solo": {"base": 17500, "trend": "naik", "volatility": 0.05},
    "Kedelai Lokal": {"base": 14000, "trend": "stabil", "volatility": 0.04},
    "Jamu Tradisional": {"base": 20000, "trend": "naik", "volatility": 0.03},
}

# Price sources
SOURCES = ["Pasar Klewer", "Pasar Gede", "Tokopedia", "Shopee", "Pasar Triwindu"]

SOURCE_MAP = {
    "batik": ["Pasar Klewer", "Tokopedia", "Shopee"],
    "kerajinan": ["Pasar Triwindu", "Tokopedia", "Shopee"],
    "pangan": ["Pasar Gede", "Pasar Legi", "Tokopedia"],
}


async def seed_database(session: AsyncSession):
    """
    Seed the database with products, price history, and local shop mock data.
    Only seeds if the database is empty.
    """
    # Check if data already exists
    result = await session.execute(select(Product).limit(1))
    if result.scalars().first() is not None:
        print("[DB] Database already seeded. Skipping...")
        return

    print("[SEED] Seeding database with Solo Raya market data...")

    # Set random seed for reproducible data
    random.seed(42)

    now = datetime.utcnow()
    products_created = []

    for product_data in PRODUCTS:
        # Create product
        product = Product(
            name=product_data["name"],
            category=product_data["category"],
            unit=product_data["unit"],
            description=product_data["description"],
        )
        session.add(product)
        await session.flush()  # Get the ID
        products_created.append(product)

        # Generate price history
        config = PRICE_CONFIGS.get(product_data["name"], {"base": 50000, "trend": "stabil", "volatility": 0.05})
        sources = SOURCE_MAP.get(product_data["category"], ["Pasar Lokal"])

        for source in sources:
            # Slight price variation per source
            source_modifier = {
                "Pasar Klewer": 1.0,
                "Pasar Gede": 0.98,
                "Pasar Triwindu": 1.02,
                "Pasar Legi": 0.97,
                "Tokopedia": 1.08,  # Online biasanya lebih mahal (ongkir)
                "Shopee": 1.05,
            }
            modifier = source_modifier.get(source, 1.0)
            base_price = config["base"] * modifier

            prices = generate_price_series(
                base_price=base_price,
                trend=config["trend"],
                volatility=config["volatility"],
                weeks=12,
            )

            for week_idx, price in enumerate(prices):
                recorded_at = now - timedelta(weeks=11 - week_idx)
                price_entry = PriceHistory(
                    product_id=product.id,
                    price=price,
                    source=source,
                    recorded_at=recorded_at,
                )
                session.add(price_entry)

    # Generate some price alerts based on recent data
    for product in products_created:
        config = PRICE_CONFIGS.get(product.name, {"trend": "stabil"})
        if config["trend"] in ("naik", "fluktuatif"):
            alert = PriceAlert(
                product_id=product.id,
                alert_type="naik" if config["trend"] == "naik" else random.choice(["naik", "turun"]),
                percentage_change=round(random.uniform(5.0, 18.0), 1),
                message=f"Harga {product.name} mengalami {'kenaikan' if config['trend'] == 'naik' else 'perubahan'} signifikan dalam 7 hari terakhir.",
                created_at=now - timedelta(days=random.randint(1, 7)),
            )
            session.add(alert)

    await session.commit()
    print(f"[OK] Seeded {len(products_created)} products with price history across multiple sources!")
    print(f"[DATA] Total price entries: {len(products_created) * 3 * 12}")

    # Seed Local Shops & Local Products (Fitur 1) - DISABLED for Hackathon demo so user data is isolated
    # shop_result = await session.execute(select(LocalShop).limit(1))
    # if shop_result.scalars().first() is None:
    #    pass
    print("[OK] Skipped Seeding Local Shops and Products to preserve user data!")
