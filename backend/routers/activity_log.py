"""
Activity Log Router for PasarPintar AI.
Handles logging user actions and providing admin analytics.
"""

from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from pydantic import BaseModel
from typing import Optional

from database.connection import get_db
from database.models import ActivityLog, User
from routers.auth import get_current_user

router = APIRouter(prefix="/api/activity", tags=["Activity"])


class LogRequest(BaseModel):
    activity_type: str
    detail: str = ""
    status: str = "success"


class LogResponse(BaseModel):
    id: int
    user_id: int
    user_role: str
    activity_type: str
    detail: str | None
    status: str
    created_at: datetime
    username: str | None = None

    class Config:
        from_attributes = True


@router.post("/log")
async def create_log(
    req: LogRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Record a user activity."""
    log = ActivityLog(
        user_id=current_user.id,
        user_role=current_user.role,
        activity_type=req.activity_type,
        detail=req.detail,
        status=req.status,
    )
    db.add(log)
    await db.commit()
    return {"ok": True}


@router.get("/logs")
async def get_logs(
    limit: int = 30,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get recent activity logs (admin only shows all, others see own)."""
    query = (
        select(ActivityLog, User.username)
        .join(User, ActivityLog.user_id == User.id)
        .order_by(ActivityLog.created_at.desc())
        .limit(limit)
    )
    if current_user.role != "admin":
        query = query.where(ActivityLog.user_id == current_user.id)

    result = await db.execute(query)
    rows = result.all()
    return [
        {
            "id": log.id,
            "user_id": log.user_id,
            "user_role": log.user_role,
            "activity_type": log.activity_type,
            "detail": log.detail,
            "status": log.status,
            "created_at": log.created_at.isoformat(),
            "username": username,
        }
        for log, username in rows
    ]


@router.get("/stats")
async def get_stats(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get activity statistics for admin dashboard."""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Hanya admin yang dapat mengakses statistik")

    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)

    # Active users today
    active_users_q = await db.execute(
        select(func.count(func.distinct(ActivityLog.user_id)))
        .where(ActivityLog.created_at >= today_start)
    )
    active_users = active_users_q.scalar() or 0

    # Total activities today
    total_activities_q = await db.execute(
        select(func.count(ActivityLog.id))
        .where(ActivityLog.created_at >= today_start)
    )
    total_activities = total_activities_q.scalar() or 0

    # Total users
    total_users_q = await db.execute(select(func.count(User.id)))
    total_users = total_users_q.scalar() or 0

    # Distribution by role
    role_dist_q = await db.execute(
        select(ActivityLog.user_role, func.count(ActivityLog.id))
        .where(ActivityLog.created_at >= today_start)
        .group_by(ActivityLog.user_role)
    )
    role_distribution = [
        {"role": role, "count": count}
        for role, count in role_dist_q.all()
    ]

    return {
        "active_users_today": active_users,
        "total_activities_today": total_activities,
        "total_users": total_users,
        "role_distribution": role_distribution,
    }
