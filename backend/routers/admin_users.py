from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from passlib.context import CryptContext
from typing import List, Optional
from pydantic import BaseModel
import logging

from database.connection import get_db
from database.models import User, LocalShop

router = APIRouter(
    prefix="/api/admin/users",
    tags=["Admin Users"],
)

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

class AdminUserUpdateReq(BaseModel):
    full_name: Optional[str] = None
    email: Optional[str] = None
    password: Optional[str] = None
    role: Optional[str] = None
    address: Optional[str] = None  # for LocalShop update if merchant

@router.get("/")
async def get_all_users(db: AsyncSession = Depends(get_db)):
    """Get all users along with their LocalShop data if they are a merchant."""
    try:
        query = select(User)
        result = await db.execute(query)
        users = result.scalars().all()

        user_list = []
        for user in users:
            user_data = {
                "id": user.id,
                "username": user.username,
                "full_name": user.full_name,
                "email": user.email,
                "role": user.role,
                "address": None
            }

            if user.role == "pedagang" or user.role == "merchant":
                shop_query = select(LocalShop).where(LocalShop.user_id == user.id)
                shop_result = await db.execute(shop_query)
                shop = shop_result.scalar_one_or_none()
                if shop:
                    user_data["address"] = shop.address

            user_list.append(user_data)
        
        return user_list
    except Exception as e:
        logging.error(f"Error fetching admin users: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/{user_id}")
async def update_user(user_id: int, req: AdminUserUpdateReq, db: AsyncSession = Depends(get_db)):
    """Update user information including password and merchant address."""
    try:
        # Get User
        query = select(User).where(User.id == user_id)
        result = await db.execute(query)
        user = result.scalar_one_or_none()

        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Update basic info
        if req.full_name is not None:
            user.full_name = req.full_name
        if req.email is not None:
            user.email = req.email
        if req.role is not None:
            user.role = req.role
        
        # Hash new password if provided
        if req.password:
            user.password_hash = pwd_context.hash(req.password)
        
        # Update shop address if user is a merchant
        if req.address and (user.role == "pedagang" or user.role == "merchant"):
            shop_query = select(LocalShop).where(LocalShop.user_id == user.id)
            shop_result = await db.execute(shop_query)
            shop = shop_result.scalar_one_or_none()
            if shop:
                shop.address = req.address
            else:
                # If shop doesn't exist but role is merchant, create one
                new_shop = LocalShop(
                    user_id=user.id,
                    name=f"Toko {user.full_name or user.username}",
                    whatsapp="080000000000",
                    address=req.address,
                    district="Solo"
                )
                db.add(new_shop)

        await db.commit()
        return {"status": "success", "message": "User updated successfully"}
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        logging.error(f"Error updating admin user: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{user_id}")
async def delete_user(user_id: int, db: AsyncSession = Depends(get_db)):
    """Delete a user."""
    try:
        # Delete user's shop if any
        shop_query = select(LocalShop).where(LocalShop.user_id == user_id)
        shop_result = await db.execute(shop_query)
        shop = shop_result.scalar_one_or_none()
        if shop:
            await db.delete(shop)
            
        # Delete user
        query = select(User).where(User.id == user_id)
        result = await db.execute(query)
        user = result.scalar_one_or_none()

        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        await db.delete(user)
        await db.commit()
        
        return {"status": "success", "message": "User deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        logging.error(f"Error deleting admin user: {e}")
        raise HTTPException(status_code=500, detail=str(e))
