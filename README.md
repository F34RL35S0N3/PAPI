# 🏪 PasarPintar AI

> **Asisten Kecerdasan Buatan untuk Pedagang UMKM Solo Raya**  
> Hackathon BYTESFEST 2026 · SDG 8: Decent Work and Economic Growth

PasarPintar AI adalah platform berbasis web yang membantu pedagang UMKM di Solo Raya (Surakarta dan sekitarnya) dalam mengambil keputusan bisnis yang lebih cerdas melalui analitik harga pasar real-time, asisten AI, dan berbagai alat manajemen usaha.

---

## 📋 Daftar Isi

- [Fitur Lengkap](#-fitur-lengkap)
- [Tech Stack](#-tech-stack)
- [Akun Demo](#-akun-demo)
- [Cara Instalasi](#-cara-instalasi)
- [Konfigurasi API Key](#-konfigurasi-api-key)
- [Menjalankan Aplikasi](#-menjalankan-aplikasi)
- [Panduan Penggunaan](#-panduan-penggunaan)
- [Struktur Proyek](#-struktur-proyek)
- [API Documentation](#-api-documentation)

---

## ✨ Fitur Lengkap

### 👘 Untuk Pedagang (Merchant)

| Fitur | Deskripsi |
|---|---|
| **Dashboard Utama** | Grafik tren harga 12 minggu, ringkasan pasar, dan rekomendasi cepat |
| **Ruang Tanya AI** | Chat AI berbasis Gemini + scanner batik otomatis via Vision AI (20 jenis motif) |
| **Rekomendasi Waktu Jual** | Analisis DSS kapan waktu terbaik jual atau tahan stok |
| **Generator Deskripsi** | Buat deskripsi produk marketplace otomatis dengan AI, bisa upload foto |
| **Alert Harga Anomali** | Notifikasi otomatis saat terjadi lonjakan/penurunan harga signifikan |
| **Smart Health Score** | Diagnosis kesehatan bisnis 5 parameter (margin, harga, tren, promosi, stok) |
| **AI Pricing Advisor** | Rekomendasi harga jual ilmiah berbasis HPP + kondisi pasar |
| **What-if Simulator** | Simulasi skenario bisnis dengan slider interaktif (HPP, harga, diskon) |
| **Business Copilot** | Rencana aksi prioritas harian yang dihasilkan AI |
| **Rute Pintar** | Optimasi rute pengantaran via Google Maps untuk hemat bensin |
| **Kelola Toko** | Manajemen toko dan produk di marketplace lokal |

### 🛍️ Untuk Pembeli (Buyer)

| Fitur | Deskripsi |
|---|---|
| **Katalog & AI Matchmaker** | Cari produk UMKM lokal dengan pencarian semantik berbasis AI |
| **Estimasi Jarak** | Kalkulasi jarak otomatis dari kecamatan pembeli ke toko penjual |
| **Order via WhatsApp** | Redirect langsung ke WhatsApp penjual dengan pesan otomatis |

### 🔑 Untuk Admin

| Fitur | Deskripsi |
|---|---|
| **Dashboard Monitoring** | Monitoring aktivitas pengguna real-time dan statistik RBAC |
| **Impact Dashboard** | Visualisasi wawasan pasar Solo Raya (health score, volatilitas, aksi terealisasi) |
| **Kelola Pengguna** | CRUD akun pedagang dan pembeli beserta manajemen password |

---

## 🛠️ Tech Stack

### Backend
- **[FastAPI](https://fastapi.tiangolo.com/)** — Framework API Python yang cepat dan modern
- **SQLAlchemy 2.0** + **SQLite** — ORM async dengan database ringan
- **Google Gemini AI** — LLM untuk chat, deskripsi produk, dan analitik bisnis
- **Passlib + JWT** — Autentikasi dan otorisasi berbasis token

### Frontend
- **[Next.js 16](https://nextjs.org/)** — Framework React dengan App Router
- **TypeScript** — Type safety di seluruh codebase
- **Tailwind CSS 4** — Utility-first CSS framework
- **Recharts** — Library grafik untuk visualisasi data
- **@teachablemachine/image** + **TensorFlow.js** — Model Vision AI untuk deteksi motif batik
- **@react-google-maps/api** — Integrasi Google Maps untuk fitur rute

---

## 🔑 Akun Demo

Tiga akun demo sudah tersedia dan akan dibuat otomatis saat backend pertama kali dijalankan:

| Peran | Username | Password | Akses |
|---|---|---|---|
| 🏪 **Pedagang** | `pedagang1` | `demo123` | Dashboard, AI Chat, Health Score, Simulator, Rute, Toko |
| 🛍️ **Pembeli** | `pembeli1` | `demo123` | Katalog, AI Matchmaker, Chat AI |
| 🔑 **Admin** | `admin1` | `demo123` | Semua fitur + Monitoring + Kelola Pengguna |

> Akun dapat dibuat sendiri melalui halaman `/register`. Pedagang baru mendapat akses penuh fitur merchant.

---

## 🚀 Cara Instalasi

### Prasyarat

Pastikan sudah terinstall di komputer Anda:

- **Python 3.10+** — [python.org](https://www.python.org/downloads/)
- **Node.js 18+** — [nodejs.org](https://nodejs.org/)
- **npm** (biasanya sudah bersama Node.js)

### 1. Clone / Download Proyek

```bash
# Jika menggunakan git
git clone <url-repository>
cd PPA

# Atau extract zip dan masuk ke folder PPA
```

---

### 2. Setup Backend (Python / FastAPI)

```bash
# Masuk ke folder backend
cd backend

# Buat virtual environment
python -m venv venv

# Aktifkan virtual environment
# Windows:
venv\Scripts\activate
# macOS / Linux:
source venv/bin/activate

# Install semua dependency
pip install -r requirements.txt
```

---

### 3. Setup Frontend (Next.js)

```bash
# Masuk ke folder frontend (buka terminal baru)
cd frontend

# Install dependency Node.js
npm install
```

---

## 🔐 Konfigurasi API Key

> ⚠️ **Langkah ini wajib** agar fitur AI (chat, deskripsi produk, health score, dll.) dapat berjalan.

### A. Google Gemini AI (Wajib untuk semua fitur AI)

1. Buka [Google AI Studio](https://aistudio.google.com/apikey)
2. Login dengan akun Google Anda
3. Klik **"Create API Key"**
4. Salin API key yang dihasilkan

Buat file **`backend/.env`** dan isi dengan:

```env
# ============================================================
# PasarPintar AI — Konfigurasi Backend
# ============================================================

# Google Gemini AI — WAJIB untuk fitur AI
# Dapatkan di: https://aistudio.google.com/apikey
GEMINI_API_KEY=masukkan_api_key_gemini_anda_di_sini

# Model yang digunakan (default sudah diisi, tidak perlu diubah)
AI_MODEL=gemini-2.0-flash-exp

# URL Frontend (tidak perlu diubah untuk development lokal)
FRONTEND_URL=http://localhost:3000

# Secret untuk JWT token (ganti dengan string acak yang panjang di production)
SECRET_KEY=pasarpintar-secret-key-bytesfest-2026-ganti-di-production
```

### B. Google Maps API (Untuk fitur Rute Pintar)

> Fitur ini opsional. Tanpa API key, tampilan peta tidak akan muncul tetapi fitur lain tetap berjalan normal.

1. Buka [Google Cloud Console](https://console.cloud.google.com/)
2. Buat project baru atau pilih yang sudah ada
3. Aktifkan **Maps JavaScript API** dan **Directions API**
4. Buat API Key di **APIs & Services → Credentials**

Buat file **`frontend/.env.local`** dan isi dengan:

```env
# ============================================================
# PasarPintar AI — Konfigurasi Frontend
# ============================================================

# URL Backend API (tidak perlu diubah untuk development lokal)
NEXT_PUBLIC_API_URL=http://localhost:8000

# Google Maps API Key — Untuk fitur Rute Pintar
# Dapatkan di: https://console.cloud.google.com/
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=masukkan_api_key_google_maps_anda_di_sini
```

---

## ▶️ Menjalankan Aplikasi

Anda memerlukan **2 terminal** yang berjalan bersamaan.

### Terminal 1 — Backend

```bash
cd backend

# Pastikan virtual environment aktif
# Windows: venv\Scripts\activate
# macOS/Linux: source venv/bin/activate

# Jalankan server backend
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Saat berhasil, Anda akan melihat:
```
[START] Starting PasarPintar AI Backend...
[DB] Initializing database...
[SEED] Creating demo users for BYTESFEST demo...
[OK] PasarPintar AI Backend is ready!
[DOCS] API docs available at: http://localhost:8000/docs
```

### Terminal 2 — Frontend

```bash
cd frontend

# Jalankan server frontend
npm run dev
```

Saat berhasil, Anda akan melihat:
```
▲ Next.js 16.x.x
- Local: http://localhost:3000
```

### Akses Aplikasi

| URL | Keterangan |
|---|---|
| `http://localhost:3000` | Aplikasi web utama |
| `http://localhost:3000/login` | Halaman login |
| `http://localhost:3000/register` | Registrasi akun baru |
| `http://localhost:8000/docs` | API Documentation (Swagger UI) |
| `http://localhost:8000/health` | Health check backend |

---

## 📖 Panduan Penggunaan

### Login dan Navigasi

1. Buka `http://localhost:3000` — Anda akan diarahkan ke halaman login
2. Masukkan username dan password (gunakan akun demo di atas)
3. Setelah login, tampilan sidebar akan menyesuaikan dengan peran (role) akun

---

### 📊 Dashboard Utama (Pedagang)

- **Grafik Tren Harga** — Pilih produk dari dropdown untuk melihat pergerakan harga 12 minggu
- **Rekomendasi Cepat** — Kartu berisi saran jual/tahan berdasarkan algoritma DSS
- **Alert Terbaru** — Notifikasi harga anomali yang perlu segera ditindaklanjuti
- **Tombol "Tanya AI"** — Shortcut ke Ruang Tanya AI

---

### 🤖 Ruang Tanya AI

Fitur utama platform dengan dua mode interaksi:

**Mode Chat Teks:**
1. Ketik pertanyaan di kolom input bawah
2. Contoh: *"Berapa harga wajar batik cap minggu ini?"* atau *"Kapan waktu terbaik jual Gula Jawa?"*
3. Tekan Enter atau klik tombol kirim
4. AI akan merespons berdasarkan data pasar real-time Solo Raya

**Mode Scan Gambar Batik (Vision AI):**
1. Klik ikon **📎** di sebelah kolom chat
2. Pilih foto batik dari perangkat Anda
3. Preview gambar akan muncul di atas input
4. Klik kirim (tombol akan aktif begitu gambar dipilih)
5. Model Vision AI akan mendeteksi jenis motif batik secara otomatis
6. AI merespons dengan: **nama motif, asal daerah, kisaran harga, dan tips penjualan**

**20 Motif Batik yang Dapat Dideteksi:**
Keraton, Bali, Betawi, Celup, Cendrawasih, Ceplok, Ciamis, Garutan, Gentongan, Kawung, Lasem, Megamendung, Parang, Pekalongan, Priangan, Sekar, Sidoluhur, Sidomukti, Sogan, Tambal

**Quick Actions:**
- 🔍 **Cari Produk Lokal** — Temukan UMKM penjual di sekitar Solo Raya
- 🗺️ **Rute Antar Hemat** — Buka fitur optimasi rute pengantaran

---

### 💊 Smart Health Score

1. Buka menu **Smart Health Score** dari sidebar
2. Isi form data usaha: nama produk, lokasi, harga modal (HPP), harga jual, stok, harga kompetitor, tren, dan teks promosi
3. Klik **"Mulai Diagnosis DSS"**
4. Lihat skor 0–100 dengan penjelasan 5 parameter:
   - 🟣 Kesesuaian Target Margin
   - 🔵 Kesesuaian Harga Pasar
   - 🩵 Tren Produk Lokal
   - 💜 Kualitas Promosi Digital
   - 🟠 Risiko Ketersediaan Stok
5. AI memberikan penjelasan diagnosis dalam bahasa Jawa/Indonesia yang mudah dipahami

---

### 💰 AI Pricing Advisor

1. Buka menu **AI Pricing Advisor**
2. Ubah nilai di panel kiri: Total Modal (HPP), Harga Kompetitor, Tren Pasar
3. Klik **"Hitung Harga Ideal"**
4. Hasil menampilkan:
   - **Harga Ideal Ilmiah** — rekomendasi harga jual optimal
   - **Batas Maksimum Aman** — harga tertinggi sebelum pelanggan lari
   - **Proyeksi Laba Bersih** — perkiraan keuntungan
   - Penjelasan singkat bergaya konsultan Solo (bahasa Jawa halus)

---

### 📈 What-if Business Simulator

1. Buka menu **What-if Simulator**
2. Geser slider untuk mengubah variabel:
   - **Perubahan HPP** (-50% sampai +100%)
   - **Harga Jual Baru** (Rp 10.000 – Rp 150.000)
   - **Persentase Diskon** (0% – 50%)
3. Grafik bar dan angka profit berubah secara real-time
4. Baca rekomendasi otomatis di bagian bawah

---

### 🤝 Business Copilot

1. Buka menu **Business Copilot**
2. AI menganalisis produk di toko Anda dan membuat daftar prioritas tindakan
3. Setiap kartu berisi: **kategori tindakan** (Harga/Stok/Promosi), **judul**, dan **penjelasan**
4. Klik tombol aksi (mis. "Sesuaikan Harga") untuk menyelesaikan tugas
5. Health Score naik setiap kali tugas diselesaikan

---

### 🗺️ Rute Pintar

1. Buka menu **Rute Pintar** dari sidebar
2. Pilih maksimal **5 kecamatan** tujuan pengantaran di Solo Raya
3. Klik **"Mulai Kalkulasi Rute"**
4. Sistem akan menampilkan:
   - Urutan rute optimal
   - Total jarak (km)
   - Estimasi penghematan bensin
5. Rute divisualisasikan di Google Maps (memerlukan Maps API Key)

---

### 🏪 Kelola Toko (Marketplace)

1. Buka menu **Kelola Toko**
2. **Setup Toko:** Isi nama toko, nomor WhatsApp, kecamatan, dan alamat
3. **Tambah Produk:** Klik "Tambah Produk", isi nama, kategori, harga, stok, deskripsi, dan foto
4. Produk yang ditambahkan akan muncul di **Katalog AI Matchmaker** untuk pembeli
5. Deskripsi produk bisa digenerate otomatis via menu **Generator Deskripsi**

---

### 🛍️ Katalog & AI Matchmaker (Pembeli)

1. Login sebagai pembeli (`pembeli1/demo123`)
2. Buka menu **Katalog & AI Matchmaker**
3. Gunakan kolom pencarian — ketik dalam bahasa alami, contoh: *"batik parang motif Jawa untuk kondangan"*
4. Filter berdasarkan kategori (Batik, Kerajinan, Pangan)
5. Lihat estimasi jarak dari kecamatan Anda ke toko penjual
6. Klik **"Order via WA"** untuk menghubungi penjual langsung di WhatsApp

---

### 🔑 Admin Panel

**Dashboard Monitoring:**
- Lihat jumlah pengguna aktif hari ini
- Total aktivitas real-time (log transaksi dan simulasi)
- Distribusi aktivitas per peran (Pedagang/Pembeli/Admin) dalam grafik pie
- Tabel log aktivitas terbaru

**Impact Dashboard:**
- Filter berdasarkan kecamatan dan sektor usaha
- 4 metrik utama: Rata-rata Health Score, Proyeksi Profit, Volatilitas Bahan Baku, Aksi Terealisasi
- Tabel aksi strategis produk yang memerlukan intervensi
- Klik "Sesuaikan Harga" atau "Simulasikan Diskon" untuk redirect ke fitur terkait

**Kelola Pengguna:**
- Lihat semua akun pedagang dan pembeli
- Edit nama, email, alamat toko, dan password
- Hapus akun yang tidak diperlukan

---

## 📁 Struktur Proyek

```
PPA/
├── backend/                    # FastAPI Backend
│   ├── main.py                 # Entry point server
│   ├── worker.py               # Background job pengambil data pasar
│   ├── requirements.txt        # Dependency Python
│   ├── pasarpintar.db          # Database SQLite (auto-generated)
│   ├── database/
│   │   ├── connection.py       # Koneksi database async
│   │   ├── models.py           # ORM models (User, Product, dll.)
│   │   └── seed_data.py        # Data awal + akun demo
│   ├── routers/                # Endpoint API per fitur
│   │   ├── auth.py             # Login, register, profil
│   │   ├── chat.py             # AI Chat + Vision context
│   │   ├── prices.py           # Data harga pasar
│   │   ├── recommendations.py  # Rekomendasi waktu jual
│   │   ├── descriptions.py     # Generator deskripsi produk
│   │   ├── alerts.py           # Alert harga anomali
│   │   ├── health_score.py     # Smart Health Score DSS
│   │   ├── pricing_advisor.py  # AI Pricing Advisor
│   │   ├── simulator.py        # What-if Business Simulator
│   │   ├── copilot.py          # Business Copilot Action Plan
│   │   ├── marketplace.py      # Kelola Toko & Produk
│   │   ├── routes.py           # Rute Pintar (optimasi)
│   │   ├── activity_log.py     # Log aktivitas pengguna
│   │   ├── impact_dashboard.py # Dashboard dampak & wawasan
│   │   └── admin_users.py      # Manajemen pengguna admin
│   ├── services/               # Business logic
│   │   ├── ai_service.py       # Integrasi Gemini AI
│   │   ├── auth_service.py     # JWT & password hashing
│   │   ├── price_service.py    # Analitik harga pasar
│   │   ├── business_service.py # Logika health score & simulator
│   │   ├── recommendation_service.py # Logika rekomendasi DSS
│   │   └── scraper_service.py  # Pengambil data pasar otomatis
│   └── static/
│       └── profiles/           # Foto profil pengguna
│
├── frontend/                   # Next.js Frontend
│   ├── app/
│   │   ├── page.tsx            # Halaman utama (semua fitur dashboard)
│   │   ├── layout.tsx          # Root layout
│   │   ├── globals.css         # Global styles
│   │   ├── login/page.tsx      # Halaman login
│   │   ├── register/page.tsx   # Halaman registrasi
│   │   └── profile/page.tsx    # Halaman profil pengguna
│   ├── lib/
│   │   ├── api.ts              # Client API (semua fetch ke backend)
│   │   ├── types.ts            # TypeScript type definitions
│   │   └── vision.ts           # Integrasi Teachable Machine / TF.js
│   └── public/
│       └── model/              # Model Vision AI (offline)
│           ├── model.json      # Arsitektur model
│           ├── metadata.json   # Label 20 jenis batik
│           └── weights.bin     # Bobot model terlatih
│
└── .gitignore
```

---

## 📡 API Documentation

Setelah backend berjalan, dokumentasi API interaktif tersedia di:

**Swagger UI:** `http://localhost:8000/docs`  
**ReDoc:** `http://localhost:8000/redoc`

### Endpoint Utama

| Method | Endpoint | Deskripsi |
|---|---|---|
| `POST` | `/api/auth/login` | Login dan dapatkan JWT token |
| `POST` | `/api/auth/register` | Registrasi akun baru |
| `GET` | `/api/auth/profile` | Profil pengguna yang login |
| `POST` | `/api/chat/send` | Kirim pesan ke AI (+ vision context) |
| `GET` | `/api/prices/summary` | Ringkasan harga semua produk |
| `GET` | `/api/prices/history` | Histori harga 12 minggu |
| `GET` | `/api/recommendations/` | Rekomendasi waktu jual DSS |
| `POST` | `/api/descriptions/generate` | Generate deskripsi produk |
| `GET` | `/api/alerts/` | Daftar alert harga anomali |
| `POST` | `/api/business/health-score` | Kalkulasi health score bisnis |
| `POST` | `/api/business/pricing-advisor` | Rekomendasi harga optimal |
| `POST` | `/api/business/simulator` | Simulasi skenario bisnis |
| `POST` | `/api/business/copilot` | Generate action plan prioritas |
| `GET` | `/api/marketplace/all-products` | Semua produk UMKM lokal |
| `POST` | `/api/routes/optimize` | Optimasi rute pengantaran |
| `GET` | `/api/activity/logs` | Log aktivitas pengguna |
| `GET` | `/api/impact/metrics` | Metrik dampak ekosistem UMKM |

---

## ⚙️ Variabel Lingkungan (Environment Variables)

### `backend/.env`

```env
GEMINI_API_KEY=        # API key Google Gemini (WAJIB)
AI_MODEL=              # Nama model Gemini (default: gemini-2.0-flash-exp)
FRONTEND_URL=          # URL frontend (default: http://localhost:3000)
SECRET_KEY=            # Secret JWT (wajib diganti di production)
```

### `frontend/.env.local`

```env
NEXT_PUBLIC_API_URL=               # URL backend (default: http://localhost:8000)
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=   # API key Google Maps (opsional)
```

---

## 🔧 Troubleshooting

### Backend tidak mau jalan
```bash
# Pastikan virtual environment aktif
# Windows:
venv\Scripts\activate

# Cek apakah semua package terinstall
pip install -r requirements.txt

# Cek Python version (minimal 3.10)
python --version
```

### Fitur AI memberikan respons generic / tidak akurat
- Pastikan `GEMINI_API_KEY` sudah diisi dengan benar di `backend/.env`
- Cek apakah API key masih aktif di [Google AI Studio](https://aistudio.google.com/apikey)
- Restart backend setelah mengubah file `.env`

### Scanner batik tidak bekerja
- Pastikan browser mengizinkan akses kamera/file
- Coba gunakan gambar yang lebih jelas dengan pencahayaan baik
- Model bekerja offline — tidak memerlukan koneksi internet khusus
- Buka browser console (F12) untuk melihat pesan error

### Peta tidak muncul di Rute Pintar
- Pastikan `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` sudah diisi di `frontend/.env.local`
- Aktifkan **Maps JavaScript API** dan **Directions API** di Google Cloud Console
- Restart frontend setelah mengubah `.env.local`

### Frontend tidak bisa terhubung ke backend
- Pastikan backend berjalan di port 8000: `http://localhost:8000/health`
- Pastikan tidak ada firewall yang memblokir port 8000 atau 3000

---

## 🏆 Tentang Proyek

**PasarPintar AI** dikembangkan untuk Hackathon **BYTESFEST 2026** dengan fokus pada **SDG 8: Decent Work and Economic Growth** — membantu pedagang UMKM di Solo Raya untuk bertahan dan berkembang di era digital melalui pemanfaatan kecerdasan buatan yang praktis dan mudah diakses.

### Dampak yang Diharapkan
- 📈 Meningkatkan margin keuntungan pedagang UMKM melalui penetapan harga berbasis data
- 🧠 Memberdayakan pedagang kecil dengan wawasan pasar yang sebelumnya hanya dimiliki perusahaan besar
- 🤝 Menghubungkan pembeli dengan UMKM lokal melalui AI Matchmaker
- 🏛️ Membantu pemerintah daerah memantau kesehatan ekosistem UMKM

---

*Built with ❤️ for UMKM Solo Raya — BYTESFEST 2026*
