"""
Chat API router for PasarPintar AI.
Handles AI chat interactions for UMKM merchants.
"""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from database.connection import get_db
from services.price_service import get_price_context_for_ai
from services.ai_service import get_ai_response
from sqlalchemy import select
from database.models import ChatHistory, LocalProduct, LocalShop
from sqlalchemy.orm import selectinload
from typing import List, Optional

router = APIRouter(prefix="/api/chat", tags=["Chat"])


class ChatRequest(BaseModel):
    message: str
    session_id: str = "default"
    vision_context: Optional[str] = None

class LocalShopResponse(BaseModel):
    id: int
    name: str
    whatsapp: str
    address: str
    district: str
    distance_km: float = 0.0

    class Config:
        from_attributes = True

class LocalProductResponse(BaseModel):
    id: int
    name: str
    category: str
    price: float
    shop: LocalShopResponse

    class Config:
        from_attributes = True

class ChatResponse(BaseModel):
    response: str
    session_id: str
    products: Optional[List[LocalProductResponse]] = None


@router.post("/send", response_model=ChatResponse)
async def send_message(request: ChatRequest, db: AsyncSession = Depends(get_db)):
    """
    Send a message to the AI Chat Assistant.
    The AI uses current market price data as context for responses.
    """
    if not request.message.strip() and not request.vision_context:
        raise HTTPException(status_code=400, detail="Pesan atau gambar tidak boleh kosong")

    # Get price context for AI
    price_context = await get_price_context_for_ai(db)

    # Process YOLO image scanning if context is provided
    if request.vision_context:
        # Inject YOLO result to context
        price_context += f"\n\n[SISTEM YOLO VISUAL]: {request.vision_context}\nBerdasarkan hasil deteksi ini, berikan penjelasan kepada pengguna."



    # Get recent chat history for context
    history_result = await db.execute(
        select(ChatHistory)
        .where(ChatHistory.session_id == request.session_id)
        .order_by(ChatHistory.created_at.desc())
        .limit(6)
    )
    history_rows = history_result.scalars().all()

    chat_history = []
    for h in reversed(history_rows):
        chat_history.append({"role": "user", "content": h.user_message})
        chat_history.append({"role": "assistant", "content": h.ai_response})

    # Matchmaker Intent Detection
    msg_lower = request.message.lower()
    search_keywords = ["cari", "butuh", "pesan", "beli", "ready"]
    products_payload = None
    
    if any(k in msg_lower for k in search_keywords) and len(request.message) > 5:
        # We find products in the database
        result = await db.execute(
            select(LocalProduct)
            .join(LocalShop)
            .options(selectinload(LocalProduct.shop))
            .limit(50)  # get up to 50 products
        )
        products = result.scalars().all()
        
        # Filter products
        matched = []
        is_general_search = "produk lokal" in msg_lower or request.message.strip() == "Cari produk lokal terdekat"
        
        for p in products:
            if is_general_search:
                matched.append(p)
            else:
                # Simple semantic search simulation for specific queries
                if any(word in p.name.lower() or word in p.category.lower() or word in p.shop.district.lower() for word in msg_lower.split()):
                    matched.append(p)
                
        # If no strict match, just return some to ensure demo works
        if not matched and products:
            matched = products[:5]
            
        if matched:
            products_payload = []
            import random
            for p in matched:
                # Mock distance for Hackathon demo
                dist = round(random.uniform(0.5, 5.0), 1)
                products_payload.append({
                    "id": p.id,
                    "name": p.name,
                    "category": p.category,
                    "price": p.price,
                    "shop": {
                        "id": p.shop.id,
                        "name": p.shop.name,
                        "whatsapp": p.shop.whatsapp,
                        "address": p.shop.address,
                        "district": p.shop.district,
                        "distance_km": dist
                    }
                })
            
            # Inject matchmaker context to AI (limit to top 10 to avoid huge prompts)
            price_context += "\n\n[SISTEM MATCHMAKER]: Anda menemukan UMKM lokal berikut. Beritahu pengguna bahwa Anda menemukan penjual yang relevan (sebutkan beberapa) dan tampilkan daftarnya secara singkat.\n"
            for p in products_payload[:10]:
                price_context += f"- {p['name']} di {p['shop']['name']} ({p['shop']['district']}), Jarak: {p['shop']['distance_km']} km\n"

    # Get AI response
    ai_response = await get_ai_response(
        user_message=request.message,
        price_context=price_context,
        chat_history=chat_history,
    )

    # Save to history
    chat_entry = ChatHistory(
        session_id=request.session_id,
        user_message=request.message,
        ai_response=ai_response,
    )
    db.add(chat_entry)
    await db.commit()

    return ChatResponse(
        response=ai_response, 
        session_id=request.session_id,
        products=products_payload
    )


@router.get("/history/{session_id}")
async def get_chat_history(session_id: str, limit: int = 20, db: AsyncSession = Depends(get_db)):
    """Get chat history for a session."""
    result = await db.execute(
        select(ChatHistory)
        .where(ChatHistory.session_id == session_id)
        .order_by(ChatHistory.created_at.desc())
        .limit(limit)
    )
    messages = result.scalars().all()

    return [
        {
            "id": msg.id,
            "user_message": msg.user_message,
            "ai_response": msg.ai_response,
            "created_at": msg.created_at.isoformat(),
        }
        for msg in reversed(messages)
    ]


@router.get("/suggested-questions")
async def get_suggested_questions():
    """Get suggested questions for the chat UI."""
    return [
        "Berapa harga wajar kain batik cap minggu ini?",
        "Bagaimana tren harga gula jawa bulan ini?",
        "Kapan waktu terbaik untuk menjual batik tulis?",
        "Produk apa yang paling laku di Solo saat ini?",
        "Bagaimana cara bersaing dengan toko online?",
        "Berapa harga beras rojolele di Pasar Gede?",
    ]
