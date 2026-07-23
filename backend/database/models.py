"""
SQLAlchemy models for PasarPintar AI database.
"""

from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text, Enum as SQLEnum
from sqlalchemy.orm import relationship
from database.connection import Base
import enum


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, autoincrement=True)
    username = Column(String(50), unique=True, nullable=False)
    full_name = Column(String(150), nullable=True, default="")
    email = Column(String(100), unique=True, nullable=False)
    password_hash = Column(String(200), nullable=False)
    role = Column(String(20), nullable=False, default="merchant")  # merchant | buyer | admin
    profile_picture = Column(String(500), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    def __repr__(self):
        return f"<User(id={self.id}, username='{self.username}', role='{self.role}')>"


class ActivityLog(Base):
    __tablename__ = "activity_logs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    user_role = Column(String(20), nullable=False)
    activity_type = Column(String(100), nullable=False)
    detail = Column(Text, nullable=True)
    status = Column(String(20), nullable=False, default="success")  # success | failed
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User")

    def __repr__(self):
        return f"<ActivityLog(user_id={self.user_id}, type='{self.activity_type}')>"


class CategoryEnum(str, enum.Enum):
    BATIK = "batik"
    KERAJINAN = "kerajinan"
    PANGAN = "pangan"


class AlertTypeEnum(str, enum.Enum):
    NAIK = "naik"
    TURUN = "turun"


class RecommendationEnum(str, enum.Enum):
    JUAL = "jual_sekarang"
    TAHAN = "tahan"
    BELI = "beli_stok"


class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(200), nullable=False)
    category = Column(String(50), nullable=False)
    unit = Column(String(50), nullable=False, default="pcs")
    description = Column(Text, nullable=True)
    image_url = Column(String(500), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    prices = relationship("PriceHistory", back_populates="product", cascade="all, delete-orphan")
    alerts = relationship("PriceAlert", back_populates="product", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Product(id={self.id}, name='{self.name}', category='{self.category}')>"


class PriceHistory(Base):
    __tablename__ = "price_history"

    id = Column(Integer, primary_key=True, autoincrement=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    price = Column(Float, nullable=False)
    source = Column(String(100), nullable=False, default="pasar_lokal")
    recorded_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    product = relationship("Product", back_populates="prices")

    def __repr__(self):
        return f"<PriceHistory(product_id={self.product_id}, price={self.price}, date={self.recorded_at})>"


class ChatHistory(Base):
    __tablename__ = "chat_history"

    id = Column(Integer, primary_key=True, autoincrement=True)
    session_id = Column(String(100), nullable=False, default="default")
    user_message = Column(Text, nullable=False)
    ai_response = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    def __repr__(self):
        return f"<ChatHistory(id={self.id}, session='{self.session_id}')>"


class PriceAlert(Base):
    __tablename__ = "price_alerts"

    id = Column(Integer, primary_key=True, autoincrement=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    alert_type = Column(String(20), nullable=False)  # naik / turun
    percentage_change = Column(Float, nullable=False)
    message = Column(Text, nullable=True)
    is_read = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    product = relationship("Product", back_populates="alerts")

    def __repr__(self):
        return f"<PriceAlert(product='{self.product_id}', type='{self.alert_type}', change={self.percentage_change}%)>"

# Fitur 1: AI Matchmaker & Catalog Local Supabase Mock
class LocalShop(Base):
    __tablename__ = "local_shops"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True) # Optional for seed data, required for real users
    name = Column(String(100), nullable=False)
    whatsapp = Column(String(20), nullable=False)
    address = Column(String(255), nullable=False)
    district = Column(String(50), nullable=False) # e.g. "Serengan", "Laweyan"
    lat = Column(Float, nullable=True)
    lng = Column(Float, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    local_products = relationship("LocalProduct", back_populates="shop", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<LocalShop(id={self.id}, name='{self.name}')>"

class LocalProduct(Base):
    __tablename__ = "local_products"

    id = Column(Integer, primary_key=True, autoincrement=True)
    shop_id = Column(Integer, ForeignKey("local_shops.id"), nullable=False)
    name = Column(String(200), nullable=False)
    category = Column(String(50), nullable=False)
    price = Column(Float, nullable=False)
    stock = Column(Integer, default=10)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    shop = relationship("LocalShop", back_populates="local_products")

    def __repr__(self):
        return f"<LocalProduct(id={self.id}, name='{self.name}', shop_id={self.shop_id})>"
