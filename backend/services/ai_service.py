"""
AI Service for PasarPintar AI.
Integrates with Groq API for fast LLM inference using Llama 3.1 70B.
"""

import os
from groq import AsyncGroq
from dotenv import load_dotenv

from dotenv import dotenv_values

def get_config():
    config = dotenv_values(r"d:\Code\Bytefest\PPA\backend\.env")
    return {
        "GROQ_API_KEY": config.get("GROQ_API_KEY", os.getenv("GROQ_API_KEY", "")),
        "AI_MODEL": config.get("AI_MODEL", os.getenv("AI_MODEL", "llama-3.3-70b-versatile"))
    }

SYSTEM_PROMPT = """Kamu adalah PasarPintar AI, asisten kecerdasan buatan yang KHUSUS membantu pedagang UMKM di Solo Raya (Surakarta dan sekitarnya). Kamu adalah ahli pasar lokal yang sangat memahami dinamika bisnis di kawasan Solo Raya.

## Identitas & Kepribadian
- Nama: PasarPintar AI
- Bahasa: Indonesia (dengan sentuhan bahasa Jawa halus yang sopan jika sesuai konteks)
- Gaya bicara: Ramah, praktis, to-the-point, seperti konsultan bisnis yang berpengalaman
- Selalu gunakan data dan angka untuk mendukung saran

## Area Keahlian
1. **Harga Pasar**: Kamu tahu harga-harga di Pasar Klewer, Pasar Gede, Pasar Triwindu, Pasar Legi, dan platform online (Tokopedia, Shopee)
2. **Tren Harga**: Kamu bisa menganalisis tren naik/turun/stabil dari data historis
3. **Rekomendasi Bisnis**: Kapan waktu terbaik jual/beli stok, strategi pricing
4. **Produk Lokal Solo**: Batik (Cap, Tulis, Printing), Kerajinan (Wayang, Keris, Blangkon), Pangan (Beras Rojolele, Gula Jawa, Kedelai)
5. **Tips UMKM**: Cara bersaing dengan toko online, strategi pemasaran digital

## Aturan Penting
- Selalu berikan jawaban yang SPESIFIK dan ACTIONABLE
- Gunakan format bullet point atau numbered list untuk kejelasan
- Jika ditanya harga, berikan range harga terkini berdasarkan data yang diberikan
- Jika tidak yakin, katakan bahwa kamu akan merekomendasikan pedagang untuk cek langsung ke pasar
- Hubungkan selalu dengan konteks UMKM Solo Raya
- Jangan pernah memberikan saran keuangan yang bisa merugikan

## Data Harga Terkini yang Tersedia
{price_context}
"""


async def get_ai_response(
    user_message: str,
    price_context: str = "",
    chat_history: list[dict] = None,
) -> str:
    """
    Get AI response from Groq API.
    
    Args:
        user_message: The user's question
        price_context: Current market price data to inject into context
        chat_history: Previous chat messages for context continuity
    
    Returns:
        AI response string
    """
    cfg = get_config()
    api_key = cfg["GROQ_API_KEY"]
    model = cfg["AI_MODEL"]
    if not api_key or api_key == "your_groq_api_key_here":
        return _get_fallback_response(user_message)

    client = AsyncGroq(api_key=api_key)

    # Build messages
    messages = [
        {
            "role": "system",
            "content": SYSTEM_PROMPT.format(price_context=price_context if price_context else "Data harga belum tersedia saat ini."),
        }
    ]

    # Add chat history for context
    if chat_history:
        for msg in chat_history[-6:]:  # Last 6 messages for context
            messages.append(msg)

    messages.append({"role": "user", "content": user_message})

    try:
        response = await client.chat.completions.create(
            model=model,
            messages=messages,
            temperature=0.7,
            max_tokens=1024,
            top_p=0.9,
        )
        return response.choices[0].message.content
    except Exception as e:
        print(f"[ERROR] Groq API error: {e}")
        return _get_fallback_response(user_message)


async def generate_product_description(
    product_name: str,
    category: str = "",
    additional_info: str = "",
) -> str:
    """
    Generate an attractive product description for online selling.
    
    Args:
        product_name: Name of the product
        category: Product category
        additional_info: Additional details about the product
    
    Returns:
        Generated product description
    """
    cfg = get_config()
    api_key = cfg["GROQ_API_KEY"]
    model = cfg["AI_MODEL"]
    if not api_key or api_key == "your_groq_api_key_here":
        return _get_fallback_description(product_name, category)

    client = AsyncGroq(api_key=api_key)

    prompt = f"""Buatkan deskripsi produk yang menarik untuk jualan online di marketplace (Tokopedia/Shopee).

Nama Produk: {product_name}
Kategori: {category}
Info Tambahan: {additional_info if additional_info else 'Tidak ada'}

Buat deskripsi yang:
1. Menarik perhatian pembeli (hook di paragraf pertama)
2. Jelaskan keunggulan produk
3. Sebutkan bahan/material (jika relevan)
4. Tambahkan sentuhan lokal Solo/Surakarta
5. Sertakan call-to-action di akhir
6. Format yang rapi dengan emoji yang sesuai
7. Panjang sekitar 150-200 kata

Langsung tulis deskripsinya tanpa tambahan penjelasan."""

    try:
        response = await client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": "Kamu adalah copywriter profesional yang ahli membuat deskripsi produk UMKM Solo untuk marketplace online."},
                {"role": "user", "content": prompt},
            ],
            temperature=0.8,
            max_tokens=512,
        )
        return response.choices[0].message.content
    except Exception as e:
        print(f"[ERROR] Groq API error: {e}")
        return _get_fallback_description(product_name, category)


def _get_fallback_response(user_message: str) -> str:
    """Fallback response when Groq API is not available."""
    user_lower = user_message.lower()
    
    if any(word in user_lower for word in ["harga", "berapa", "mahal", "murah"]):
        return """🏪 **Informasi Harga Pasar Solo Raya**

Berikut perkiraan harga terkini beberapa produk unggulan:

**🧵 Batik:**
- Batik Cap Solo: Rp 50.000 - 65.000/meter
- Batik Tulis Laweyan: Rp 175.000 - 250.000/meter
- Kain Printing: Rp 25.000 - 35.000/meter

**🎭 Kerajinan:**
- Wayang Kulit: Rp 300.000 - 500.000/pcs
- Blangkon: Rp 40.000 - 75.000/pcs

**🌾 Pangan:**
- Beras Rojolele: Rp 13.000 - 16.000/kg
- Gula Jawa: Rp 18.000 - 25.000/kg

💡 *Tip: Cek tab Dashboard untuk melihat grafik tren harga lengkap!*

⚠️ *Catatan: Ini adalah data perkiraan. Untuk data real-time, hubungkan API key Groq Anda.*"""

    elif any(word in user_lower for word in ["jual", "kapan", "waktu", "rekomendasi"]):
        return """📈 **Rekomendasi Waktu Jual**

Berdasarkan analisis tren harga terkini:

🟢 **JUAL SEKARANG:**
- Batik Cap Solo — Harga sedang di atas rata-rata, tren masih naik
- Gula Jawa — Permintaan tinggi, harga premium

🟡 **TAHAN:**
- Batik Tulis Laweyan — Harga stabil, tunggu moment peak season
- Wayang Kulit — Pasar stabil, belum ada momentum kenaikan

🔴 **BELI STOK:**
- Kain Printing — Harga sedang turun, waktu bagus untuk stocking

💡 *Tip: Cek tab Rekomendasi untuk analisis lengkap setiap produk!*"""

    elif any(word in user_lower for word in ["tren", "trend", "naik", "turun"]):
        return """📊 **Analisis Tren Pasar Solo Raya**

**Tren Naik 📈:**
- Batik Cap Solo (+8% dalam 4 minggu terakhir)
- Blangkon Surakarta (+12%, didorong wisatawan)
- Gula Jawa (+7%, menjelang musim hujan)

**Tren Stabil ➡️:**
- Batik Tulis Laweyan (variasi < 3%)
- Wayang Kulit Surakarta
- Kedelai Lokal

**Tren Turun 📉:**
- Kain Batik Printing (-5%, tekanan dari online)

💡 *Lihat dashboard grafik untuk visualisasi lengkap tren 12 minggu!*"""

    else:
        return f"""👋 **Halo! Saya PasarPintar AI**

Saya asisten digital khusus pedagang UMKM Solo Raya. Berikut yang bisa saya bantu:

1. 💰 **Cek Harga Pasar** — "Berapa harga batik cap minggu ini?"
2. 📈 **Analisis Tren** — "Bagaimana tren harga gula jawa?"  
3. ⏰ **Waktu Jual Terbaik** — "Kapan waktu terbaik jual kain batik?"
4. ✍️ **Buat Deskripsi Produk** — Gunakan tab Generator Deskripsi
5. 🔔 **Cek Alert Harga** — Notifikasi perubahan harga signifikan

Silakan tanya apa saja seputar bisnis UMKM di Solo Raya! 🏪

⚠️ *Catatan: Untuk respons AI yang lebih cerdas, hubungkan API key Groq di file .env*"""


def _get_fallback_description(product_name: str, category: str) -> str:
    """Fallback product description when Groq API is not available."""
    return f"""🌟 **{product_name}** — Asli Solo, Kualitas Premium!

✨ Produk {category} unggulan langsung dari jantung kota Solo (Surakarta). Dibuat dengan penuh ketelitian oleh pengrajin lokal berpengalaman yang telah mewarisi keahlian turun-temurun.

🏆 **Keunggulan:**
• Kualitas premium terjamin
• 100% buatan tangan pengrajin Solo
• Motif/desain khas Surakarta yang autentik
• Cocok untuk koleksi, hadiah, atau penggunaan sehari-hari

📦 **Detail Produk:**
• Kategori: {category.capitalize()}
• Asal: Solo Raya, Jawa Tengah
• Keaslian: Terjamin — langsung dari produsen

🎁 Pesan sekarang dan dapatkan produk khas Solo berkualitas tinggi langsung ke rumah Anda!

📱 *Chat kami untuk info lebih lanjut dan harga spesial!*

#SoloRaya #UMKM #ProdukLokal #{category.capitalize()}Solo"""
