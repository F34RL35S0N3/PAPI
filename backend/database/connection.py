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
    """Create all tables in the database."""
    async with engine.begin() as conn:
        from database.models import Product, PriceHistory, ChatHistory, PriceAlert, User, LocalShop, LocalProduct
        await conn.run_sync(Base.metadata.create_all)
