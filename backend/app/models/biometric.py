"""Biometric and anthropometric persistence models."""

from __future__ import annotations

import uuid
from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import CheckConstraint, Date, DateTime, ForeignKey, Index, Numeric, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base
from app.models.common import TimestampMixin, user_id_col, uuid_pk


class UserProfile(TimestampMixin, Base):
    """Long-lived user profile with anthropometric baselines and preferences."""

    __tablename__ = "user_profiles"
    __table_args__ = (
        CheckConstraint("height_cm BETWEEN 90 AND 250", name="ck_user_profiles_height_cm"),
        CheckConstraint("weight_kg BETWEEN 25 AND 350", name="ck_user_profiles_weight_kg"),
        CheckConstraint("body_fat_pct IS NULL OR body_fat_pct BETWEEN 3 AND 70", name="ck_user_profiles_body_fat_pct"),
        CheckConstraint("age_years BETWEEN 13 AND 100", name="ck_user_profiles_age_years"),
        CheckConstraint(
            "biological_sex IN ('male', 'female', 'other')",
            name="ck_user_profiles_biological_sex",
        ),
        CheckConstraint(
            "fitness_level IN ('beginner', 'intermediate', 'advanced', 'elite')",
            name="ck_user_profiles_fitness_level",
        ),
        CheckConstraint(
            "primary_goal IN ('hypertrophy', 'strength', 'fat_loss', 'maintenance')",
            name="ck_user_profiles_primary_goal",
        ),
        CheckConstraint("training_days_per_week BETWEEN 1 AND 7", name="ck_user_profiles_training_days"),
        CheckConstraint(
            "gender_focus IS NULL OR gender_focus IN ('upper_body', 'lower_body', 'balanced')",
            name="ck_user_profiles_gender_focus",
        ),
        CheckConstraint(
            "subscription_tier IN ('free', 'premium', 'elite')",
            name="ck_user_profiles_subscription_tier",
        ),
        UniqueConstraint("user_id", name="uq_user_profiles_user_id"),
        Index("ix_user_profiles_user_goal", "user_id", "primary_goal"),
    )

    id: Mapped[uuid.UUID] = uuid_pk()
    user_id: Mapped[uuid.UUID] = user_id_col()
    display_name: Mapped[str] = mapped_column(String(120), nullable=False)
    birth_date: Mapped[date | None] = mapped_column(Date)
    biological_sex: Mapped[str] = mapped_column(String(16), nullable=False)
    age_years: Mapped[int] = mapped_column(nullable=False)
    preferred_locale: Mapped[str] = mapped_column(String(12), nullable=False, default="es")
    height_cm: Mapped[Decimal] = mapped_column(Numeric(5, 2), nullable=False)
    weight_kg: Mapped[Decimal] = mapped_column(Numeric(6, 2), nullable=False)
    body_fat_pct: Mapped[Decimal | None] = mapped_column(Numeric(4, 2))
    femur_length_cm: Mapped[Decimal | None] = mapped_column(Numeric(5, 2))
    torso_length_cm: Mapped[Decimal | None] = mapped_column(Numeric(5, 2))
    arm_span_cm: Mapped[Decimal | None] = mapped_column(Numeric(5, 2))
    fitness_level: Mapped[str] = mapped_column(String(24), nullable=False)
    primary_goal: Mapped[str] = mapped_column(String(24), nullable=False)
    training_days_per_week: Mapped[int] = mapped_column(nullable=False, default=3)
    gender_focus: Mapped[str | None] = mapped_column(String(24))
    subscription_tier: Mapped[str] = mapped_column(String(16), nullable=False, default="free")
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    measurements: Mapped[list[AnthropometricMeasurement]] = relationship(
        back_populates="profile", cascade="all, delete-orphan"
    )


class AnthropometricMeasurement(TimestampMixin, Base):
    """Point-in-time body metrics used by progress and target calculations."""

    __tablename__ = "anthropometric_measurements"
    __table_args__ = (
        CheckConstraint("weight_kg BETWEEN 25 AND 350", name="ck_anthro_weight_kg"),
        CheckConstraint("body_fat_pct IS NULL OR body_fat_pct BETWEEN 3 AND 70", name="ck_anthro_body_fat_pct"),
        CheckConstraint("waist_cm IS NULL OR waist_cm BETWEEN 35 AND 220", name="ck_anthro_waist_cm"),
        CheckConstraint("hip_cm IS NULL OR hip_cm BETWEEN 45 AND 220", name="ck_anthro_hip_cm"),
        CheckConstraint("chest_cm IS NULL OR chest_cm BETWEEN 45 AND 220", name="ck_anthro_chest_cm"),
        CheckConstraint("arm_cm IS NULL OR arm_cm BETWEEN 15 AND 80", name="ck_anthro_arm_cm"),
        CheckConstraint("thigh_cm IS NULL OR thigh_cm BETWEEN 25 AND 120", name="ck_anthro_thigh_cm"),
        UniqueConstraint("user_id", "measured_on", name="uq_anthro_user_measured_on"),
        Index("ix_anthro_user_date", "user_id", "measured_on"),
    )

    id: Mapped[uuid.UUID] = uuid_pk()
    user_id: Mapped[uuid.UUID] = user_id_col()
    profile_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("user_profiles.id", ondelete="SET NULL")
    )
    measured_on: Mapped[date] = mapped_column(Date, nullable=False)
    weight_kg: Mapped[Decimal] = mapped_column(Numeric(6, 2), nullable=False)
    body_fat_pct: Mapped[Decimal | None] = mapped_column(Numeric(4, 2))
    waist_cm: Mapped[Decimal | None] = mapped_column(Numeric(5, 2))
    hip_cm: Mapped[Decimal | None] = mapped_column(Numeric(5, 2))
    chest_cm: Mapped[Decimal | None] = mapped_column(Numeric(5, 2))
    arm_cm: Mapped[Decimal | None] = mapped_column(Numeric(5, 2))
    thigh_cm: Mapped[Decimal | None] = mapped_column(Numeric(5, 2))

    profile: Mapped[UserProfile | None] = relationship(back_populates="measurements")
