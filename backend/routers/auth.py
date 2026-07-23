import os
import shutil
from datetime import datetime, timedelta
from typing import Annotated

from database.connection import get_db
from database.models import User
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from pydantic import BaseModel
from services.auth_service import (
    ACCESS_TOKEN_EXPIRE_MINUTES,
    create_access_token,
    decode_access_token,
    get_password_hash,
    verify_password,
)
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter(prefix="/api/auth", tags=["auth"])

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


# Pydantic models for request/response
class UserCreate(BaseModel):
    username: str
    full_name: str = ""
    email: str
    password: str
    role: str = "merchant"  # merchant | buyer | admin
    address: str | None = None
    district: str | None = None


class UserResponse(BaseModel):
    id: int
    username: str
    full_name: str | None = ""
    email: str
    role: str = "merchant"
    profile_picture: str | None = None
    address: str | None = None
    district: str | None = None

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str


# Dependency to get current user
async def get_current_user(
    token: Annotated[str, Depends(oauth2_scheme)], db: AsyncSession = Depends(get_db)
):
    payload = decode_access_token(token)
    username: str = payload.get("sub")
    if username is None:
        raise HTTPException(status_code=401, detail="Could not validate credentials")

    result = await db.execute(select(User).where(User.username == username))
    user = result.scalars().first()
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")
    return user


@router.post("/register", response_model=UserResponse)
async def register(user_data: UserCreate, db: AsyncSession = Depends(get_db)):
    # Check if username or email exists
    result = await db.execute(
        select(User).where(
            or_(User.username == user_data.username, User.email == user_data.email)
        )
    )
    db_user = result.scalars().first()
    if db_user:
        raise HTTPException(
            status_code=400, detail="Username or email already registered"
        )

    if user_data.role not in ("merchant", "buyer", "admin"):
        raise HTTPException(
            status_code=400, detail="Role harus merchant, buyer, atau admin"
        )
    hashed_password = get_password_hash(user_data.password)
    new_user = User(
        username=user_data.username,
        full_name=user_data.full_name,
        email=user_data.email,
        password_hash=hashed_password,
        role=user_data.role,
    )
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)
    return new_user


@router.post("/login", response_model=Token)
async def login(
    form_data: Annotated[OAuth2PasswordRequestForm, Depends()],
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(User).where(User.username == form_data.username))
    user = result.scalars().first()
    if not user or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username, "role": user.role},
        expires_delta=access_token_expires,
    )
    return {"access_token": access_token, "token_type": "bearer"}


@router.get("/profile", response_model=UserResponse)
async def get_profile(current_user: Annotated[User, Depends(get_current_user)]):
    return current_user


@router.put("/profile", response_model=UserResponse)
async def update_profile(
    full_name: str = Form(None),
    email: str = Form(None),
    password: str = Form(None),
    address: str = Form(None),
    district: str = Form(None),
    profile_picture: UploadFile = File(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if full_name is not None:
        current_user.full_name = full_name

    if address is not None:
        current_user.address = address

    if district is not None:
        current_user.district = district

    if email:
        # Check if email is taken by someone else
        result = await db.execute(
            select(User).where(User.email == email, User.id != current_user.id)
        )
        existing = result.scalars().first()
        if existing:
            raise HTTPException(status_code=400, detail="Email already in use")
        current_user.email = email

    if password:
        current_user.password_hash = get_password_hash(password)

    if profile_picture and profile_picture.filename:
        # Validate file extension
        ALLOWED_EXT = {"jpg", "jpeg", "png", "gif", "webp"}
        ext = profile_picture.filename.rsplit(".", 1)[-1].lower()
        if ext not in ALLOWED_EXT:
            raise HTTPException(
                status_code=400,
                detail="Format file tidak didukung. Gunakan JPG, PNG, GIF, atau WEBP.",
            )

        # Save file to static/profiles (path absolute so CWD doesn't matter)
        import pathlib

        upload_dir = (
            pathlib.Path(__file__).resolve().parent.parent / "static" / "profiles"
        )
        upload_dir.mkdir(parents=True, exist_ok=True)

        # Create safe filename
        filename = (
            f"user_{current_user.id}_{datetime.now().strftime('%Y%m%d%H%M%S')}.{ext}"
        )
        filepath = os.path.join(upload_dir, filename)

        with open(filepath, "wb") as buffer:
            shutil.copyfileobj(profile_picture.file, buffer)

        current_user.profile_picture = f"/static/profiles/{filename}"

    await db.commit()
    await db.refresh(current_user)
    return current_user
