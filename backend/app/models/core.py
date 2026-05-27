"""Core persistence models shared by domain modules."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import CheckConstraint, DateTime, Index, JSON, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base
from app.models.common import TimestampMixin, user_id_col, uuid_pk


class User(TimestampMixin, Base):
    """Application user mirrored from Supabase Auth in hosted deployments."""

    __tablename__ = "users"

    id: Mapped[uuid.UUID] = uuid_pk()
    email: Mapped[str] = mapped_column(String(320), unique=True, nullable=False)
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class SyncQueue(Base):
    """User-scoped offline synchronization queue."""

    __tablename__ = "sync_queue"
    __table_args__ = (
        CheckConstraint("operation IN ('create', 'update', 'delete')", name="ck_sync_queue_operation"),
        CheckConstraint(
            "status IN ('pending', 'processing', 'synced', 'conflict', 'failed')",
            name="ck_sync_queue_status",
        ),
        Index("idx_sync_queue_user_status", "user_id", "status"),
        Index("idx_sync_queue_entity", "entity_type", "entity_id"),
    )

    id: Mapped[uuid.UUID] = uuid_pk()
    user_id: Mapped[uuid.UUID] = user_id_col()
    client_id: Mapped[str] = mapped_column(String(120), nullable=False)
    entity_type: Mapped[str] = mapped_column(String(80), nullable=False)
    entity_id: Mapped[uuid.UUID] = mapped_column(nullable=False)
    operation: Mapped[str] = mapped_column(String(16), nullable=False)
    payload: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False)
    status: Mapped[str] = mapped_column(String(24), nullable=False, default="pending")
    conflict_data: Mapped[dict[str, Any] | None] = mapped_column(JSON)
    retry_count: Mapped[int] = mapped_column(nullable=False, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    processed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
