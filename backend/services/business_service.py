"""
Business Logic Service for PasarPintar AI.
Handles Health Score, Pricing Advisor, What-if Simulator, and Business Copilot.
"""

from typing import Dict, Any, List

def calculate_health_score(
    product_name: str,
    category: str,
    location: str,
    capital_price: float,
    selling_price: float,
    stock: int,
    target_margin: float,
    competitor_price: float,
    trend: str,
    promotion_text: str
) -> Dict[str, Any]:
    """Calculate Smart Business Health Score using 5 weighted parameters."""
    
    # 1. Kesesuaian Target Margin (Bobot 30%)
    actual_margin = ((selling_price - capital_price) / capital_price) * 100 if capital_price > 0 else 0
    if actual_margin <= 0:
        score_margin = 0
    elif actual_margin >= target_margin:
        score_margin = 100
    else:
        score_margin = (actual_margin / target_margin) * 100
        
    # 2. Kesesuaian Harga Pasar (Bobot 25%)
    if competitor_price <= 0:
        score_harga = 100
    elif selling_price <= competitor_price:
        score_harga = 100
    else:
        diff_pct = ((selling_price - competitor_price) / competitor_price) * 100
        score_harga = max(0, 100 - (diff_pct * 2))
        
    # 3. Tren Produk Lokal (Bobot 20%)
    trend_lower = trend.lower()
    if trend_lower == "naik":
        score_tren = 100
    elif trend_lower == "stabil":
        score_tren = 70
    else:
        score_tren = 40
        
    # 4. Kualitas Promosi Digital (Bobot 15%)
    promo_len = len(promotion_text.strip())
    if promo_len > 100:
        score_promo = 100
    elif promo_len > 50:
        score_promo = 80
    elif promo_len > 20:
        score_promo = 60
    elif promo_len > 0:
        score_promo = 40
    else:
        score_promo = 10
        
    # 5. Risiko Ketersediaan Stok (Bobot 10%)
    if stock > 30:
        score_stok = 100
    elif stock > 15:
        score_stok = 80
    elif stock > 5:
        score_stok = 50
    elif stock > 0:
        score_stok = 20
    else:
        score_stok = 0
        
    # Calculate Total
    total_score = (score_margin * 0.3) + (score_harga * 0.25) + (score_tren * 0.2) + (score_promo * 0.15) + (score_stok * 0.1)
    
    status = "Sehat & Kompetitif" if total_score >= 80 else "Perlu Optimasi" if total_score >= 50 else "Kritis, Segera Evaluasi"
    
    return {
        "score": int(total_score),
        "status": status,
        "actual_margin": round(actual_margin, 2),
        "breakdown": {
            "margin_score": int(score_margin),
            "price_score": int(score_harga),
            "trend_score": int(score_tren),
            "promo_score": int(score_promo),
            "stock_score": int(score_stok)
        },
        "inputs": {
            "product_name": product_name,
            "category": category,
            "location": location,
            "capital_price": capital_price,
            "selling_price": selling_price,
            "stock": stock,
            "target_margin": target_margin,
            "competitor_price": competitor_price,
            "trend": trend,
            "promotion_text": promotion_text
        }
    }

def get_pricing_advice(capital_price: float, target_margin: float, competitor_price: float, trend: str) -> Dict[str, Any]:
    """AI Pricing Advisor logic."""
    ideal_price = capital_price * (1 + target_margin / 100)
    
    max_safe_price = ideal_price
    if competitor_price > 0:
        if trend == "naik":
            max_safe_price = competitor_price * 1.05  # can be 5% higher if trend is up
        else:
            max_safe_price = competitor_price * 0.95  # should be lower if not up
            
    if max_safe_price < ideal_price and competitor_price > 0:
        max_safe_price = ideal_price # don't suggest losing margin entirely, but warn them
        
    # Estimated profit increase if they adopt ideal price (assuming they currently sell at capital)
    # This is just a simulation metric
    profit_per_item = ideal_price - capital_price
    
    explanation = f"Harga ideal dihitung berdasarkan target margin {target_margin}%. "
    if ideal_price > competitor_price > 0:
        explanation += "Perhatian: Harga ini lebih tinggi dari kompetitor, pastikan kualitas/layanan Anda lebih baik."
    elif competitor_price > ideal_price:
        explanation += "Harga ini sangat kompetitif dan masih di bawah harga pasar."
        
    return {
        "ideal_price": round(ideal_price, 0),
        "maximum_safe_price": round(max_safe_price, 0),
        "estimated_profit": round(profit_per_item, 0),
        "explanation": explanation
    }

def run_simulation(scenario: str, percentage: float, capital_price: float, selling_price: float, sales_volume: int = 100) -> Dict[str, Any]:
    """What-if Business Simulator."""
    old_profit = (selling_price - capital_price) * sales_volume
    old_margin = ((selling_price - capital_price) / capital_price) * 100 if capital_price > 0 else 0
    
    new_capital = capital_price
    new_selling = selling_price
    new_volume = sales_volume
    
    if scenario == "modal_naik":
        new_capital = capital_price * (1 + percentage / 100)
    elif scenario == "modal_turun":
        new_capital = capital_price * (1 - percentage / 100)
    elif scenario == "harga_naik":
        new_selling = selling_price * (1 + percentage / 100)
        # assuming elasticity: volume drops half of price hike %
        new_volume = sales_volume * (1 - (percentage / 2) / 100)
    elif scenario == "harga_turun":
        new_selling = selling_price * (1 - percentage / 100)
        # assuming elasticity: volume goes up half of price drop %
        new_volume = sales_volume * (1 + (percentage / 2) / 100)
    elif scenario == "diskon":
        new_selling = selling_price * (1 - percentage / 100)
        new_volume = sales_volume * (1 + percentage / 100) # discount brings more volume
        
    new_profit = (new_selling - new_capital) * new_volume
    new_margin = ((new_selling - new_capital) / new_capital) * 100 if new_capital > 0 else 0
    
    profit_change = ((new_profit - old_profit) / old_profit) * 100 if old_profit > 0 else 0
    
    recommendation = "Skenario ini menguntungkan, pertimbangkan untuk dieksekusi." if profit_change > 0 else "Skenario ini menurunkan profitabilitas, sebaiknya hindari atau sesuaikan efisiensi."
    
    return {
        "old_profit": round(old_profit, 0),
        "new_profit": round(new_profit, 0),
        "profit_change_pct": round(profit_change, 2),
        "old_margin": round(old_margin, 2),
        "new_margin": round(new_margin, 2),
        "recommendation": recommendation,
        "new_ideal_price": round(new_capital * (1 + (old_margin/100)), 0) if scenario in ["modal_naik", "modal_turun"] else round(new_selling, 0)
    }

async def generate_copilot_plan(products: List[Dict[str, Any]]) -> List[Dict[str, str]]:
    """Business Copilot: Generates daily action plan."""
    # Mocking AI analysis for action plan based on products input
    actions = []
    
    if not products:
        return [{"priority": "High", "title": "Tambah Produk", "description": "Anda belum memiliki data produk. Tambahkan produk untuk mendapatkan analisis."}]
        
    for p in products:
        margin = ((p.get('selling_price', 0) - p.get('capital_price', 0)) / p.get('capital_price', 1)) * 100
        target = p.get('target_margin', 20)
        
        if margin < target:
            actions.append({
                "priority": "High",
                "title": f"Evaluasi Harga: {p.get('name', 'Produk')}",
                "description": f"Margin saat ini ({margin:.1f}%) di bawah target. Cek AI Pricing Advisor untuk harga ideal."
            })
        elif p.get('trend') == 'naik':
            actions.append({
                "priority": "Medium",
                "title": f"Promosikan: {p.get('name', 'Produk')}",
                "description": "Tren pasar sedang naik. Segera buat konten promosi untuk meningkatkan penjualan."
            })
            
    if not actions:
        actions.append({
            "priority": "Low",
            "title": "Bisnis Stabil",
            "description": "Semua indikator terlihat baik. Pertahankan kualitas pelayanan Anda."
        })
        
    return actions
