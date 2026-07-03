from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional

from database.connection import get_db
from database.models import User, LocalShop, LocalProduct
from routers.auth import get_current_user

router = APIRouter(prefix="/api/marketplace", tags=["Marketplace"])

# --- Models ---
class ShopCreate(BaseModel):
    name: str
    whatsapp: str
    address: str
    district: str

class ShopResponse(ShopCreate):
    id: int
    lat: Optional[float] = None
    lng: Optional[float] = None

    class Config:
        from_attributes = True

class ProductCreate(BaseModel):
    name: str
    category: str
    price: float
    stock: int
    description: Optional[str] = None

class ProductResponse(ProductCreate):
    id: int
    shop_id: int

    class Config:
        from_attributes = True

# Mock District Coordinates (from routes.py logic)
DISTRICT_COORDS = {
    "Laweyan": {"lat": -7.568, "lng": 110.796},
    "Serengan": {"lat": -7.581, "lng": 110.817},
    "Pasar Kliwon": {"lat": -7.579, "lng": 110.832},
    "Jebres": {"lat": -7.558, "lng": 110.844},
    "Banjarsari": {"lat": -7.545, "lng": 110.817},
}

# --- Endpoints ---

@router.get("/shop", response_model=Optional[ShopResponse])
async def get_my_shop(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get the current user's shop profile."""
    result = await db.execute(
        select(LocalShop).where(LocalShop.user_id == current_user.id)
    )
    return result.scalars().first()

@router.post("/shop", response_model=ShopResponse)
async def update_my_shop(
    shop_data: ShopCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create or update the current user's shop."""
    result = await db.execute(
        select(LocalShop).where(LocalShop.user_id == current_user.id)
    )
    shop = result.scalars().first()

    coords = DISTRICT_COORDS.get(shop_data.district, {"lat": -7.5756, "lng": 110.8253}) # Default fallback

    if not shop:
        shop = LocalShop(
            user_id=current_user.id,
            name=shop_data.name,
            whatsapp=shop_data.whatsapp,
            address=shop_data.address,
            district=shop_data.district,
            lat=coords["lat"],
            lng=coords["lng"]
        )
        db.add(shop)
    else:
        shop.name = shop_data.name
        shop.whatsapp = shop_data.whatsapp
        shop.address = shop_data.address
        shop.district = shop_data.district
        shop.lat = coords["lat"]
        shop.lng = coords["lng"]

    await db.commit()
    await db.refresh(shop)
    return shop

@router.get("/products", response_model=List[ProductResponse])
async def get_my_products(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all products belonging to the user's shop."""
    shop_result = await db.execute(
        select(LocalShop).where(LocalShop.user_id == current_user.id)
    )
    shop = shop_result.scalars().first()

    if not shop:
        return []

    prod_result = await db.execute(
        select(LocalProduct).where(LocalProduct.shop_id == shop.id)
    )
    return prod_result.scalars().all()

@router.post("/products", response_model=ProductResponse)
async def add_product(
    prod_data: ProductCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Add a new product to the user's shop."""
    shop_result = await db.execute(
        select(LocalShop).where(LocalShop.user_id == current_user.id)
    )
    shop = shop_result.scalars().first()

    if not shop:
        raise HTTPException(status_code=400, detail="Anda belum membuat profil toko.")

    new_prod = LocalProduct(
        shop_id=shop.id,
        name=prod_data.name,
        category=prod_data.category,
        price=prod_data.price,
        stock=prod_data.stock,
        description=prod_data.description
    )
    db.add(new_prod)
    await db.commit()
    await db.refresh(new_prod)
    return new_prod

@router.put("/products/{product_id}", response_model=ProductResponse)
async def update_product(
    product_id: int,
    prod_data: ProductCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update an existing product."""
    shop_result = await db.execute(
        select(LocalShop).where(LocalShop.user_id == current_user.id)
    )
    shop = shop_result.scalars().first()

    if not shop:
        raise HTTPException(status_code=400, detail="Anda belum membuat profil toko.")

    prod_result = await db.execute(
        select(LocalProduct).where(LocalProduct.id == product_id, LocalProduct.shop_id == shop.id)
    )
    product = prod_result.scalars().first()

    if not product:
        raise HTTPException(status_code=404, detail="Produk tidak ditemukan.")

    product.name = prod_data.name
    product.category = prod_data.category
    product.price = prod_data.price
    product.stock = prod_data.stock
    product.description = prod_data.description

    await db.commit()
    await db.refresh(product)
    return product

@router.delete("/products/{product_id}")
async def delete_product(
    product_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a product."""
    shop_result = await db.execute(
        select(LocalShop).where(LocalShop.user_id == current_user.id)
    )
    shop = shop_result.scalars().first()

    if not shop:
        raise HTTPException(status_code=400, detail="Anda belum membuat profil toko.")

    prod_result = await db.execute(
        select(LocalProduct).where(LocalProduct.id == product_id, LocalProduct.shop_id == shop.id)
    )
    product = prod_result.scalars().first()

    if not product:
        raise HTTPException(status_code=404, detail="Produk tidak ditemukan.")

    await db.delete(product)
    await db.commit()
    return {"message": "Produk berhasil dihapus"}
