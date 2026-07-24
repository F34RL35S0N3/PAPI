"""
Database connection setup for PasarPintar AI.
Uses SQLAlchemy async engine with SQLite.
"""

import os
import shutil
import pathlib
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import DeclarativeBase
from dotenv import load_dotenv

load_dotenv()

# Detect Vercel Serverless environment
IS_VERCEL = os.getenv("VERCEL") == "1" or os.getenv("VERCEL_ENV") is not None

if IS_VERCEL or not os.access(os.getcwd(), os.W_OK):
    tmp_db_path = "/tmp/pasarpintar.db"
    source_db = pathlib.Path(__file__).resolve().parent.parent / "pasarpintar.db"
    
    if not os.path.exists(tmp_db_path) and os.path.exists(source_db):
        try:
            shutil.copyfile(source_db, tmp_db_path)
            print(f"[DB] Successfully copied database to {tmp_db_path}")
        except Exception as e:
            print(f"[DB] Failed to copy database to /tmp: {e}")
            
    DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite+aiosqlite:///{tmp_db_path}")
else:
    DATABASE_URL = os.getenv("DATABASE_URL", "sqlite+aiosqlite:///./pasarpintar.db")

engine = create_async_engine(DATABASE_URL, echo=False)
async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


async def get_db():
    """Dependency for FastAPI endpoints to get a database session."""
    async with async_session() as session:
        try:
            yield session
        finally:
            await session.close()


async def init_db():
    """Create all tables in the database and handle schema updates."""
    try:
        async with engine.begin() as conn:
            from database.models import Product, PriceHistory, ChatHistory, PriceAlert, User, LocalShop, LocalProduct, ActivityLog
            await conn.run_sync(Base.metadata.create_all)

            # Migration: Add 'role' column to users if it doesn't exist
            try:
                from sqlalchemy import text
                await conn.execute(text("ALTER TABLE users ADD COLUMN role VARCHAR(20) DEFAULT 'merchant'"))
                print("[DB] Added 'role' column to users table.")
            except Exception:
                pass  # Column already exists or table freshly created
    except Exception as e:
        print(f"[DB] Error initializing DB: {e}")
