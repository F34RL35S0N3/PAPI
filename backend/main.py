"""
PasarPintar AI - Backend API Server
====================================
FastAPI backend for UMKM Solo Raya market intelligence platform.
Provides AI chat, price analytics, recommendations, and more.

Hackathon BYTESFEST 2026 — SDG 8: Decent Work and Economic Growth
"""

import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

load_dotenv()

# Import database
from database.connection import init_db, async_session
from database.seed_data import seed_database
import asyncio
from worker import background_market_worker

# Import routers
from routers.chat import router as chat_router
from routers.prices import router as prices_router
from routers.recommendations import router as recommendations_router
from routers.descriptions import router as descriptions_router
from routers.alerts import router as alerts_router
from routers.auth import router as auth_router
from routers.routes import router as routes_router
from routers.marketplace import router as marketplace_router
from routers.health_score import router as health_score_router
from routers.pricing_advisor import router as pricing_advisor_router
from routers.simulator import router as simulator_router
from routers.copilot import router as copilot_router
from routers.activity_log import router as activity_log_router
from routers.impact_dashboard import router as impact_dashboard_router
from fastapi.staticfiles import StaticFiles

# Create static directory if it doesn't exist
os.makedirs(os.path.join(os.getcwd(), "static", "profiles"), exist_ok=True)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager - handles startup and shutdown."""
    # === STARTUP ===
    print("[START] Starting PasarPintar AI Backend...")
    print("[DB] Initializing database...")
    await init_db()

    # Seed database with market data
    async with async_session() as session:
        await seed_database(session)

    # Start the Live Data Background Worker
    worker_task = asyncio.create_task(background_market_worker())
    app.state.worker_task = worker_task

    print("[OK] PasarPintar AI Backend is ready!")
    print("[DOCS] API docs available at: http://localhost:8000/docs")
    
    yield

    # === SHUTDOWN ===
    print("[STOP] Shutting down PasarPintar AI Backend...")
    app.state.worker_task.cancel()


# Create FastAPI app
app = FastAPI(
    title="PasarPintar AI API",
    description=(
        "API Backend untuk PasarPintar AI - Asisten Kecerdasan Buatan & "
        "Dashboard Analitik untuk Pedagang UMKM Solo Raya.\n\n"
        "**Fitur:**\n"
        "- AI Chat Assistant (Groq/Llama 3.1)\n"
        "- Dashboard Harga Pasar\n"
        "- Rekomendasi Waktu Jual\n"
        "- Generator Deskripsi Produk\n"
        "- Alert Harga Anomali\n\n"
        "Hackathon BYTESFEST 2026 | SDG 8: Decent Work and Economic Growth"
    ),
    version="1.0.0",
    lifespan=lifespan,
)

# CORS middleware for frontend
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_URL, "http://localhost:3000", "http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(chat_router)
app.include_router(prices_router)
app.include_router(recommendations_router)
app.include_router(descriptions_router)
app.include_router(alerts_router)
app.include_router(auth_router)
app.include_router(routes_router)
app.include_router(marketplace_router)
app.include_router(health_score_router)
app.include_router(pricing_advisor_router)
app.include_router(simulator_router)
app.include_router(copilot_router)
app.include_router(activity_log_router)
app.include_router(impact_dashboard_router)

# Mount static files
app.mount("/static", StaticFiles(directory="static"), name="static")


@app.get("/", tags=["Root"])
async def root():
    """Root endpoint - API health check and info."""
    return {
        "name": "PasarPintar AI API",
        "version": "1.0.0",
        "status": "running",
        "description": "Asisten Kecerdasan Buatan untuk UMKM Solo Raya",
        "hackathon": "BYTESFEST 2026",
        "sdg": "SDG 8 - Decent Work and Economic Growth",
        "docs": "/docs",
        "endpoints": {
            "chat": "/api/chat/send",
            "prices": "/api/prices/summary",
            "recommendations": "/api/recommendations/",
            "descriptions": "/api/descriptions/generate",
            "alerts": "/api/alerts/",
        },
    }


@app.get("/health", tags=["Root"])
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "service": "pasarpintar-ai-backend"}
