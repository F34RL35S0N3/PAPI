"""
Database connection setup for PasarPintar AI.
Uses SQLAlchemy async engine with SQLite.
"""

import os
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import DeclarativeBase
from dotenv import load_dotenv

load_dotenv()

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
