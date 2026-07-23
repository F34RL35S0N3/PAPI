"""
AI Service for PasarPintar AI.
Integrates with Google Gemini API for fast LLM inference.
"""

import os

import google.generativeai as genai
from dotenv import dotenv_values


def get_config():
    config = dotenv_values(r"d:\Code\Bytefest\PPA\backend\.env")
    return {
        "GEMINI_API_KEY": config.get("GEMINI_API_KEY", os.getenv("GEMINI_API_KEY", "")),
        "AI_MODEL": config.get(
            "AI_MODEL", os.getenv("AI_MODEL", "gemini-flash-latest")
        ),
    }


# ---------------------------------------------------------------------------
# Kamus info batik untuk fallback response saat Gemini tidak tersedia
# ---------------------------------------------------------------------------
BATIK_INFO: dict[str, dict[str, str]] = {
    "Batik Keraton": {
        "asal": "Solo / Yogyakarta",
        "ciri": "Motif eksklusif lingkungan istana, warna sogan (coklat-hitam), bermakna filosofis mendalam.",
        "harga_cap": "Rp 75.000 – 150.000/meter",
        "harga_tulis": "Rp 500.000 – 2.000.000/meter",
        "tips": "Permintaan stabil dari kolektor dan wisatawan budaya. Batik tulis Keraton asli bernilai investasi tinggi.",
    },
    "Batik Parang": {
        "asal": "Solo",
        "ciri": "Motif garis diagonal menyerupai ombak laut, simbol kekuatan dan kesinambungan. Salah satu motif tertua Jawa.",
        "harga_cap": "Rp 55.000 – 85.000/meter",
        "harga_tulis": "Rp 250.000 – 800.000/meter",
        "tips": "Salah satu motif paling laris di Pasar Klewer. Permintaan naik signifikan menjelang Lebaran dan wisuda.",
    },
    "Batik Kawung": {
        "asal": "Solo / Yogyakarta",
        "ciri": "Motif lingkaran oval berulang menyerupai buah kawung (kolang-kaling), simbol kesempurnaan dan kebijaksanaan.",
        "harga_cap": "Rp 50.000 – 80.000/meter",
        "harga_tulis": "Rp 200.000 – 600.000/meter",
        "tips": "Motif klasik dengan permintaan konsisten. Populer untuk seragam instansi pemerintah dan perusahaan.",
    },
    "Batik Sogan": {
        "asal": "Solo",
        "ciri": "Warna khas coklat-krem dari pewarna alami kayu sogan. Motif halus dan elegan, identitas batik Solo.",
        "harga_cap": "Rp 60.000 – 100.000/meter",
        "harga_tulis": "Rp 300.000 – 1.200.000/meter",
        "tips": "Batik Sogan Solo sangat dicari kolektor dalam dan luar negeri. Harga premium dan stabil.",
    },
    "Batik Megamendung": {
        "asal": "Cirebon",
        "ciri": "Motif awan berlapis warna-warni dengan 7 gradasi warna, pengaruh budaya China-Sunda yang kuat.",
        "harga_cap": "Rp 45.000 – 75.000/meter",
        "harga_tulis": "Rp 200.000 – 700.000/meter",
        "tips": "Populer untuk baju modern dan casual. Permintaan tinggi dari kalangan muda dan pasar online.",
    },
    "Batik Pekalongan": {
        "asal": "Pekalongan",
        "ciri": "Warna cerah dan beragam, motif bunga dan fauna, pengaruh kuat batik pesisir dan budaya asing.",
        "harga_cap": "Rp 35.000 – 65.000/meter",
        "harga_tulis": "Rp 150.000 – 500.000/meter",
        "tips": "Harga kompetitif, permintaan tinggi untuk baju sehari-hari dan seragam sekolah. Cocok untuk volume besar.",
    },
    "Batik Lasem": {
        "asal": "Lasem, Rembang",
        "ciri": "Warna merah darah ayam khas (abang getih pithik), motif perpaduan Cina-Jawa. Sangat dihargai kolektor.",
        "harga_cap": "Rp 80.000 – 150.000/meter",
        "harga_tulis": "Rp 500.000 – 3.000.000/meter",
        "tips": "Batik langka bernilai seni tinggi. Cocok untuk investasi jangka panjang dan target pasar premium.",
    },
    "Batik Bali": {
        "asal": "Bali",
        "ciri": "Warna kontras dan cerah, motif flora-fauna khas Bali. Sangat digemari wisatawan domestik dan mancanegara.",
        "harga_cap": "Rp 50.000 – 90.000/meter",
        "harga_tulis": "Rp 200.000 – 800.000/meter",
        "tips": "Musim liburan adalah waktu emas untuk berjualan. Permintaan meningkat pesat saat high season pariwisata.",
    },
    "Batik Betawi": {
        "asal": "Jakarta",
        "ciri": "Motif ondel-ondel, kembang kelapa, gambang kromong. Warna cerah dan berani, khas budaya Betawi.",
        "harga_cap": "Rp 40.000 – 70.000/meter",
        "harga_tulis": "Rp 150.000 – 500.000/meter",
        "tips": "Populer untuk souvenir dan pakaian acara budaya Betawi. Permintaan naik saat HUT Jakarta dan event budaya.",
    },
    "Batik Ceplok": {
        "asal": "Solo / Yogyakarta",
        "ciri": "Motif geometris berulang (kotak, lingkaran, bintang), pola simetris dan teratur. Salah satu motif dasar batik Jawa.",
        "harga_cap": "Rp 45.000 – 80.000/meter",
        "harga_tulis": "Rp 200.000 – 600.000/meter",
        "tips": "Motif klasik populer untuk seragam. Permintaan stabil dan aman untuk stok reguler.",
    },
    "Batik Sidomukti": {
        "asal": "Solo",
        "ciri": "Motif 'sido mukti' berarti semoga sejahtera, biasa dipakai pengantin wanita dalam prosesi adat Jawa.",
        "harga_cap": "Rp 70.000 – 120.000/meter",
        "harga_tulis": "Rp 400.000 – 1.500.000/meter",
        "tips": "Permintaan melonjak di musim pernikahan (April–Juni, September–November). Stok sebelum puncak musim!",
    },
    "Batik Sidoluhur": {
        "asal": "Solo",
        "ciri": "Motif 'sido luhur' berarti semoga mulia, pasangan dari Sidomukti untuk prosesi pengantin adat Jawa.",
        "harga_cap": "Rp 70.000 – 120.000/meter",
        "harga_tulis": "Rp 400.000 – 1.500.000/meter",
        "tips": "Permintaan tinggi bersamaan dengan Sidomukti di musim pernikahan. Jual dalam paket sering lebih menguntungkan.",
    },
    "Batik Sekar": {
        "asal": "Solo / Jawa Tengah",
        "ciri": "Motif bunga (sekar = bunga dalam bahasa Jawa), beragam variasi flora dengan warna elegan.",
        "harga_cap": "Rp 45.000 – 80.000/meter",
        "harga_tulis": "Rp 180.000 – 550.000/meter",
        "tips": "Motif yang disukai berbagai kalangan usia. Stabil sepanjang tahun dan mudah dijual.",
    },
    "Batik Tambal": {
        "asal": "Solo / Yogyakarta",
        "ciri": "Motif tambal sulam dari berbagai corak kecil, dipercaya memiliki khasiat penyembuhan dan pelindung.",
        "harga_cap": "Rp 55.000 – 90.000/meter",
        "harga_tulis": "Rp 250.000 – 800.000/meter",
        "tips": "Motif unik dengan nilai budaya tinggi. Diminati kolektor dan pecinta batik tradisional.",
    },
    "Batik Celup": {
        "asal": "Berbagai daerah",
        "ciri": "Teknik ikat dan celup warna, menghasilkan pola abstrak dari lipatan kain. Bukan teknik cap/tulis.",
        "harga_cap": "Rp 25.000 – 50.000/meter",
        "harga_tulis": "Teknik ikat celup (bukan tulis)",
        "tips": "Harga terjangkau, permintaan tinggi untuk pakaian casual. Kompetisi harga cukup ketat di pasaran.",
    },
    "Batik Gentongan": {
        "asal": "Madura",
        "ciri": "Direndam dalam gentong berbulan-bulan menggunakan zat alami, warna unik dan tahan lama. Proses sangat panjang.",
        "harga_cap": "–",
        "harga_tulis": "Rp 500.000 – 5.000.000/meter",
        "tips": "Batik langka dan mahal karena proses produksi panjang. Target segmen kolektor dan pembeli premium.",
    },
    "Batik Garutan": {
        "asal": "Garut, Jawa Barat",
        "ciri": "Warna cerah-pastel khas, motif flora khas Sunda, latar putih bersih. Dikenal dengan kualitas kain tinggi.",
        "harga_cap": "Rp 50.000 – 85.000/meter",
        "harga_tulis": "Rp 200.000 – 700.000/meter",
        "tips": "Permintaan baik dari luar Jawa dan pasar ekspor. Kualitas premium yang diakui internasional.",
    },
    "Batik Ciamis": {
        "asal": "Ciamis, Jawa Barat",
        "ciri": "Dominasi warna hitam-putih, motif geometris dan flora sederhana namun elegan.",
        "harga_cap": "Rp 40.000 – 70.000/meter",
        "harga_tulis": "Rp 150.000 – 450.000/meter",
        "tips": "Harga bersaing, cocok untuk pasar menengah. Permintaan lokal Jawa Barat cukup stabil.",
    },
    "Batik Priangan": {
        "asal": "Jawa Barat (Priangan)",
        "ciri": "Warna terang dan cerah, motif alam dan fauna khas Sunda, dipengaruhi batik pesisir.",
        "harga_cap": "Rp 45.000 – 75.000/meter",
        "harga_tulis": "Rp 180.000 – 550.000/meter",
        "tips": "Pasar Jawa Barat dan ekspor terbuka lebar. Motif yang disukai kalangan muda kreatif.",
    },
    "Batik Cendrawasih": {
        "asal": "Papua",
        "ciri": "Motif burung Cendrawasih dan flora Papua, warna cerah mencolok. Sangat khas dan eksklusif.",
        "harga_cap": "Rp 60.000 – 100.000/meter",
        "harga_tulis": "Rp 300.000 – 1.000.000/meter",
        "tips": "Motif eksklusif Papua, diminati sebagai souvenir premium dan busana adat. Nilai eksotis tinggi.",
    },
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
6. **Identifikasi Batik**: Kamu ahli mengidentifikasi jenis batik dari foto, menjelaskan motif, asal-usul, dan nilai pasar

## Aturan Penting
- Selalu berikan jawaban yang SPESIFIK dan ACTIONABLE
- Gunakan format bullet point atau numbered list untuk kejelasan
- Jika ditanya harga, berikan range harga terkini berdasarkan data yang diberikan
- Jika tidak yakin, katakan bahwa kamu akan merekomendasikan pedagang untuk cek langsung ke pasar
- Hubungkan selalu dengan konteks UMKM Solo Raya
- Jangan pernah memberikan saran keuangan yang bisa merugikan
- Jika ada hasil deteksi batik dari sistem YOLO ([SISTEM YOLO VISUAL]), WAJIB gunakan informasi tersebut sebagai dasar utama responmu

## Data Harga Terkini yang Tersedia
{price_context}
"""


# ---------------------------------------------------------------------------
# Helper: ekstrak hasil deteksi YOLO dari price_context
# ---------------------------------------------------------------------------
def _extract_vision_context(price_context: str) -> str:
    """Ambil teks hasil deteksi YOLO dari price_context."""
    for line in price_context.split("\n"):
        if "[SISTEM YOLO VISUAL]:" in line:
            return line.replace("[SISTEM YOLO VISUAL]:", "").strip()
    return ""


def _generate_batik_vision_response(vision_text: str) -> str:
    """
    Buat response identifikasi batik berdasarkan hasil YOLO scan.
    Digunakan ketika Gemini tidak tersedia.
    """
    # Cari nama batik yang cocok dalam kamus
    detected_type: str | None = None
    for batik_name in BATIK_INFO:
        if batik_name.lower() in vision_text.lower():
            detected_type = batik_name
            break

    if detected_type and detected_type in BATIK_INFO:
        info = BATIK_INFO[detected_type]
        return (
            f"🔍 **Hasil Identifikasi Batik — Sistem Vision AI**\n\n"
            f"{vision_text}\n\n"
            f"---\n\n"
            f"👘 **{detected_type}**\n\n"
            f"📍 **Asal Daerah**: {info['asal']}\n"
            f"✨ **Ciri Khas**: {info['ciri']}\n\n"
            f"💰 **Kisaran Harga di Pasar Solo Raya:**\n"
            f"- Batik Cap: {info['harga_cap']}\n"
            f"- Batik Tulis: {info['harga_tulis']}\n\n"
            f"💡 **Tips Strategi Pedagang**: {info['tips']}\n\n"
            f"---\n"
            f"📊 Untuk analisis harga real-time dan rekomendasi waktu jual terbaik, "
            f"cek tab **Rekomendasi** dan **Dashboard**!"
        )
    else:
        # Hasil scan ada tapi nama batik tidak ada di kamus
        return (
            f"🔍 **Hasil Pemindaian Visual Batik**\n\n"
            f"{vision_text}\n\n"
            f"💡 Untuk keterangan harga dan rekomendasi penjualan, silakan tanyakan lebih spesifik:\n"
            f'- "Berapa harga batik ini di Pasar Klewer?"\n'
            f'- "Kapan waktu terbaik menjual batik ini?"\n'
            f'- "Bagaimana tren harga batik ini bulan ini?"\n\n'
            f"📊 Atau gunakan tab **Rekomendasi** untuk analisis lengkap pasar Solo Raya!"
        )


async def get_ai_response(
    user_message: str,
    price_context: str = "",
    chat_history: list[dict] = None,
) -> str:
    """
    Get AI response from Gemini API.

    Args:
        user_message: The user's question
        price_context: Current market price data (may include YOLO vision context)
        chat_history: Previous chat messages for context continuity

    Returns:
        AI response string
    """
    cfg = get_config()
    api_key = cfg["GEMINI_API_KEY"]
    model_name = cfg["AI_MODEL"]

    # Jika API key tidak tersedia, gunakan fallback cerdas yang tetap bisa
    # memanfaatkan hasil deteksi YOLO dari price_context
    if not api_key or api_key == "your_groq_api_key_here":
        return _get_fallback_response(user_message, price_context)

    genai.configure(api_key=api_key)

    system_instruction = SYSTEM_PROMPT.format(
        price_context=price_context
        if price_context
        else "Data harga belum tersedia saat ini."
    )
    model = genai.GenerativeModel(
        model_name=model_name, system_instruction=system_instruction
    )

    # Build history
    history = []
    if chat_history:
        for msg in chat_history[-6:]:  # Last 6 messages for context
            role = "model" if msg["role"] == "assistant" else "user"
            history.append({"role": role, "parts": [msg["content"]]})

    try:
        chat = model.start_chat(history=history)
        response = await chat.send_message_async(user_message)
        return response.text
    except Exception as e:
        print(f"[ERROR] Gemini API error: {e}")
        # Tetap teruskan price_context agar hasil YOLO tidak hilang
        return _get_fallback_response(user_message, price_context)


async def generate_product_description(
    product_name: str, category: str = "", additional_info: str = "", image: str = None
) -> str:
    """
    Generate an attractive product description for online selling.

    Args:
        product_name: Name of the product
        category: Product category
        additional_info: Additional details about the product
        image: Optional base64 encoded image string (e.g. "data:image/jpeg;base64,...")

    Returns:
        Generated product description
    """
    cfg = get_config()
    api_key = cfg["GEMINI_API_KEY"]
    model_name = cfg["AI_MODEL"]

    if not api_key or api_key == "your_groq_api_key_here":
        return _get_fallback_description(product_name, category)

    genai.configure(api_key=api_key)

    system_instruction = "Kamu adalah copywriter profesional yang ahli membuat deskripsi produk UMKM Solo untuk marketplace online."
    model = genai.GenerativeModel(
        model_name=model_name, system_instruction=system_instruction
    )

    prompt = f"""Buatkan deskripsi produk yang menarik untuk jualan online di marketplace (Tokopedia/Shopee).

Nama Produk: {product_name}
Kategori: {category}
Info Tambahan: {additional_info if additional_info else "Tidak ada"}

Buat deskripsi yang:
1. Menarik perhatian pembeli (hook di paragraf pertama)
2. Jelaskan keunggulan produk
3. Sebutkan bahan/material (jika relevan)
4. Tambahkan sentuhan lokal Solo/Surakarta
5. Sertakan call-to-action di akhir
6. Format yang rapi dengan emoji yang sesuai
7. Panjang sekitar 150-200 kata

Langsung tulis deskripsinya tanpa tambahan penjelasan."""

    user_content = [prompt]

    # Process image if available
    if image:
        import base64
        import io

        from PIL import Image

        try:
            if "base64," in image:
                base64_data = image.split("base64,")[1]
            else:
                base64_data = image
            image_bytes = base64.b64decode(base64_data)
            img = Image.open(io.BytesIO(image_bytes))
            user_content.append(img)
        except Exception as e:
            print(f"[ERROR] processing image for Gemini: {e}")

    try:
        response = await model.generate_content_async(user_content)
        return response.text
    except Exception as e:
        import traceback

        print(f"[ERROR] Gemini API error: {e}")
        traceback.print_exc()
        return _get_fallback_description(product_name, category)


def _get_fallback_response(user_message: str, price_context: str = "") -> str:
    """
    Fallback response ketika Gemini API tidak tersedia.
    Tetap memanfaatkan hasil deteksi YOLO dari price_context jika ada.
    """
    user_lower = user_message.lower()

    # --- Prioritas 1: Cek apakah ada hasil YOLO dari pemindaian gambar ---
    if price_context and "[SISTEM YOLO VISUAL]:" in price_context:
        vision_text = _extract_vision_context(price_context)
        if vision_text:
            return _generate_batik_vision_response(vision_text)

    # --- Prioritas 2: Pertanyaan identifikasi batik tanpa gambar ---
    batik_id_keywords = [
        "identifikasi",
        "jenis batik",
        "motif batik",
        "pola batik",
        "nama batik",
    ]
    if any(kw in user_lower for kw in batik_id_keywords):
        return (
            "🔍 **Identifikasi Batik dengan Vision AI**\n\n"
            "Untuk mengidentifikasi jenis batik secara otomatis, silakan **unggah foto batik** "
            "menggunakan tombol 📎 di kolom chat!\n\n"
            "Sistem Vision AI kami akan mendeteksi:\n"
            "- 🏷️ Jenis/nama motif batik\n"
            "- 📍 Asal daerah\n"
            "- 💰 Kisaran harga di Pasar Solo Raya\n"
            "- 💡 Tips strategi penjualan\n\n"
            "**20 jenis batik yang didukung**: Parang, Kawung, Sogan, Keraton, Megamendung, "
            "Pekalongan, Lasem, Sidomukti, Sidoluhur, Ceplok, dan lainnya!"
        )

    # --- Prioritas 3: Pertanyaan harga ---
    if any(word in user_lower for word in ["harga", "berapa", "mahal", "murah"]):
        return (
            "🏪 **Informasi Harga Pasar Solo Raya**\n\n"
            "Berikut perkiraan harga terkini beberapa produk unggulan:\n\n"
            "**🧵 Batik:**\n"
            "- Batik Cap Solo: Rp 50.000 – 65.000/meter\n"
            "- Batik Tulis Laweyan: Rp 175.000 – 250.000/meter\n"
            "- Kain Printing: Rp 25.000 – 35.000/meter\n\n"
            "**🎭 Kerajinan:**\n"
            "- Wayang Kulit: Rp 300.000 – 500.000/pcs\n"
            "- Blangkon: Rp 40.000 – 75.000/pcs\n\n"
            "**🌾 Pangan:**\n"
            "- Beras Rojolele: Rp 13.000 – 16.000/kg\n"
            "- Gula Jawa: Rp 18.000 – 25.000/kg\n\n"
            "💡 *Tip: Cek tab Dashboard untuk melihat grafik tren harga lengkap!*\n\n"
            "⚠️ *Data perkiraan. Untuk data real-time, pastikan API key Gemini terhubung.*"
        )

    # --- Prioritas 4: Pertanyaan waktu jual ---
    elif any(word in user_lower for word in ["jual", "kapan", "waktu", "rekomendasi"]):
        return (
            "📈 **Rekomendasi Waktu Jual**\n\n"
            "Berdasarkan analisis tren harga terkini:\n\n"
            "🟢 **JUAL SEKARANG:**\n"
            "- Batik Cap Solo — Harga sedang di atas rata-rata, tren masih naik\n"
            "- Gula Jawa — Permintaan tinggi, harga premium\n\n"
            "🟡 **TAHAN:**\n"
            "- Batik Tulis Laweyan — Harga stabil, tunggu moment peak season\n"
            "- Wayang Kulit — Pasar stabil, belum ada momentum kenaikan\n\n"
            "🔴 **BELI STOK:**\n"
            "- Kain Printing — Harga sedang turun, waktu bagus untuk stocking\n\n"
            "💡 *Cek tab Rekomendasi untuk analisis lengkap setiap produk!*"
        )

    # --- Prioritas 5: Pertanyaan tren ---
    elif any(word in user_lower for word in ["tren", "trend", "naik", "turun"]):
        return (
            "📊 **Analisis Tren Pasar Solo Raya**\n\n"
            "**Tren Naik 📈:**\n"
            "- Batik Cap Solo (+8% dalam 4 minggu terakhir)\n"
            "- Blangkon Surakarta (+12%, didorong wisatawan)\n"
            "- Gula Jawa (+7%, menjelang musim hujan)\n\n"
            "**Tren Stabil ➡️:**\n"
            "- Batik Tulis Laweyan (variasi < 3%)\n"
            "- Wayang Kulit Surakarta\n"
            "- Kedelai Lokal\n\n"
            "**Tren Turun 📉:**\n"
            "- Kain Batik Printing (-5%, tekanan dari toko online)\n\n"
            "💡 *Lihat dashboard grafik untuk visualisasi lengkap tren 12 minggu!*"
        )

    # --- Default: sambutan umum ---
    else:
        return (
            "👋 **Halo! Saya PasarPintar AI**\n\n"
            "Saya asisten digital khusus pedagang UMKM Solo Raya. Berikut yang bisa saya bantu:\n\n"
            "1. 📷 **Identifikasi Batik** — Unggah foto batik, AI akan mendeteksi jenisnya!\n"
            '2. 💰 **Cek Harga Pasar** — "Berapa harga batik cap minggu ini?"\n'
            '3. 📈 **Analisis Tren** — "Bagaimana tren harga gula jawa?"\n'
            '4. ⏰ **Waktu Jual Terbaik** — "Kapan waktu terbaik jual kain batik?"\n'
            "5. ✍️ **Buat Deskripsi Produk** — Gunakan tab Generator Deskripsi\n"
            "6. 🔔 **Cek Alert Harga** — Notifikasi perubahan harga signifikan\n\n"
            "Silakan tanya apa saja seputar bisnis UMKM di Solo Raya! 🏪\n\n"
            "⚠️ *Untuk respons AI yang lebih cerdas dan personal, pastikan API key Gemini terhubung.*"
        )


def _get_fallback_description(product_name: str, category: str) -> str:
    """Fallback product description when API is not available."""
    return (
        f"🌟 **{product_name}** — Asli Solo, Kualitas Premium!\n\n"
        f"✨ Produk {category} unggulan langsung dari jantung kota Solo (Surakarta). "
        f"Dibuat dengan penuh ketelitian oleh pengrajin lokal berpengalaman yang telah mewarisi keahlian turun-temurun.\n\n"
        f"🏆 **Keunggulan:**\n"
        f"• Kualitas premium terjamin\n"
        f"• 100% buatan tangan pengrajin Solo\n"
        f"• Motif/desain khas Surakarta yang autentik\n"
        f"• Cocok untuk koleksi, hadiah, atau penggunaan sehari-hari\n\n"
        f"📦 **Detail Produk:**\n"
        f"• Kategori: {category.capitalize()}\n"
        f"• Asal: Solo Raya, Jawa Tengah\n"
        f"• Keaslian: Terjamin — langsung dari produsen\n\n"
        f"🎁 Pesan sekarang dan dapatkan produk khas Solo berkualitas tinggi langsung ke rumah Anda!\n\n"
        f"📱 *Chat kami untuk info lebih lanjut dan harga spesial!*\n\n"
        f"#SoloRaya #UMKM #ProdukLokal #{category.capitalize()}Solo"
    )


async def generate_health_diagnosis_explanation(health_result: dict) -> str:
    """Generate localized explanation for Smart Business Health Score."""
    cfg = get_config()
    api_key = cfg["GEMINI_API_KEY"]
    model_name = cfg["AI_MODEL"]

    if not api_key or api_key == "your_groq_api_key_here":
        return "Sistem AI sedang offline. Mohon periksa API Key Anda."

    genai.configure(api_key=api_key)
    model = genai.GenerativeModel(model_name=model_name)

    inputs = health_result.get("inputs", {})
    breakdown = health_result.get("breakdown", {})
    score = health_result.get("score", 0)

    prompt = f"""Kamu adalah konsultan bisnis UMKM berpengalaman dari Solo yang ramah. Berikan diagnosis mendalam namun mudah dipahami oleh pedagang kecil menggunakan gaya bahasa campuran Indonesia dan dialek lokal Solo/Jawa yang sopan (seperti menyapa dengan 'Nggih', 'Pripun', 'Monggo').

DATA PEDAGANG:
- Produk: {inputs.get("product_name")}
- Lokasi: {inputs.get("location")}
- Target Margin: {inputs.get("target_margin")}%
- Harga Modal: Rp{inputs.get("capital_price")}
- Harga Jual: Rp{inputs.get("selling_price")}
- Harga Kompetitor: Rp{inputs.get("competitor_price")}
- Stok: {inputs.get("stock")}

HASIL ANALISIS SISTEM (Skor Total: {score}/100):
- Margin Score: {breakdown.get("margin_score")}/100 (Margin aktual: {health_result.get("actual_margin")}%)
- Harga Pasar Score: {breakdown.get("price_score")}/100
- Tren Score: {breakdown.get("trend_score")}/100 (Tren: {inputs.get("trend")})
- Promosi Score: {breakdown.get("promo_score")}/100
- Stok Score: {breakdown.get("stock_score")}/100

TUGAS:
Berikan penjelasan sekitar 3-4 paragraf.
1. Sapa pedagang dan sampaikan gambaran besar skor kesehatan bisnisnya saat ini.
2. Jelaskan metrik mana yang paling kritis (misal margin menyusut karena harga modal naik, atau harga jual terlalu murah dibanding kompetitor).
3. Berikan saran praktis (actionable) apa yang harus mereka lakukan hari ini.

Catatan: Jangan jelaskan detail angka satu per satu secara kaku, tapi rangkum intisari masalahnya (contoh: "Modal panjenengan naik, jadinya untungnya mepet banget cuma x% padahal targetnya y%")."""

    try:
        response = await model.generate_content_async(prompt)
        return response.text
    except Exception as e:
        print(f"[ERROR] Gemini API error: {e}")
        return "Maaf, AI sedang sibuk. Mohon coba beberapa saat lagi."
