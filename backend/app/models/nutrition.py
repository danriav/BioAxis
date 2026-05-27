"""Nutrition persistence models."""

from __future__ import annotations

import uuid
from datetime import date, datetime, time
from decimal import Decimal

from sqlalchemy import (
    CheckConstraint,
    Date,
    DateTime,
    ForeignKey,
    ForeignKeyConstraint,
    Index,
    Numeric,
    String,
    Time,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base
from app.models.common import TimestampMixin, user_id_col, uuid_pk


class FoodItem(TimestampMixin, Base):
    """User or catalog food with normalized nutrient values per 100g."""

    __tablename__ = "food_items"
    __table_args__ = (
        CheckConstraint("calories_per_100g BETWEEN 0 AND 1000", name="ck_food_calories"),
        CheckConstraint("protein_g BETWEEN 0 AND 100", name="ck_food_protein"),
        CheckConstraint("carbs_g BETWEEN 0 AND 100", name="ck_food_carbs"),
        CheckConstraint("fat_g BETWEEN 0 AND 100", name="ck_food_fat"),
        Index("ix_food_items_user_name", "user_id", "name_es"),
    )

    id: Mapped[uuid.UUID] = uuid_pk()
    user_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), index=True)
    source: Mapped[str] = mapped_column(String(32), nullable=False, default="custom")
    external_id: Mapped[str | None] = mapped_column(String(120))
    name_es: Mapped[str] = mapped_column(String(180), nullable=False)
    name_en: Mapped[str | None] = mapped_column(String(180))
    brand: Mapped[str | None] = mapped_column(String(120))
    calories_per_100g: Mapped[Decimal] = mapped_column(Numeric(7, 2), nullable=False)
    protein_g: Mapped[Decimal] = mapped_column(Numeric(6, 2), nullable=False)
    carbs_g: Mapped[Decimal] = mapped_column(Numeric(6, 2), nullable=False)
    fat_g: Mapped[Decimal] = mapped_column(Numeric(6, 2), nullable=False)
    fiber_g: Mapped[Decimal | None] = mapped_column(Numeric(6, 2))
    sugar_g: Mapped[Decimal | None] = mapped_column(Numeric(6, 2))
    sodium_mg: Mapped[Decimal | None] = mapped_column(Numeric(7, 2))
    saturated_fat_g: Mapped[Decimal | None] = mapped_column(Numeric(6, 2))
    trans_fat_g: Mapped[Decimal | None] = mapped_column(Numeric(6, 2))
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class BaseMeal(Base):
    """Reusable user-owned meal template."""

    __tablename__ = "base_meals"
    __table_args__ = (
        CheckConstraint(
            "meal_slot IS NULL OR meal_slot IN ('breakfast', 'mid_morning', 'lunch', 'snack', 'dinner', 'post_workout', 'pre_workout')",
            name="ck_base_meals_slot",
        ),
        UniqueConstraint("user_id", "id", name="base_meals_user_id_id_key"),
        Index("idx_base_meals_user_slot", "user_id", "meal_slot"),
    )

    id: Mapped[uuid.UUID] = uuid_pk()
    user_id: Mapped[uuid.UUID] = user_id_col()
    meal_name: Mapped[str] = mapped_column(String(120), nullable=False)
    meal_slot: Mapped[str | None] = mapped_column(String(32))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    items: Mapped[list[BaseMealItem]] = relationship(
        back_populates="base_meal", cascade="all, delete-orphan"
    )


class BaseMealItem(Base):
    """Food item inside a reusable meal template."""

    __tablename__ = "base_meal_items"
    __table_args__ = (
        ForeignKeyConstraint(
            ["user_id", "base_meal_id"],
            ["base_meals.user_id", "base_meals.id"],
            ondelete="CASCADE",
            name="base_meal_items_user_meal_fk",
        ),
        Index("idx_base_meal_items_user_meal", "user_id", "base_meal_id"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[uuid.UUID] = user_id_col()
    base_meal_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    food_item_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("food_items.id"))
    amount_g: Mapped[Decimal] = mapped_column(Numeric(7, 2), nullable=False)

    base_meal: Mapped[BaseMeal] = relationship(back_populates="items")


class NutritionLog(TimestampMixin, Base):
    """Daily nutrition aggregate header."""

    __tablename__ = "nutrition_logs"
    __table_args__ = (
        UniqueConstraint("user_id", "log_date", name="uq_nutrition_logs_user_date"),
        UniqueConstraint("user_id", "id", name="nutrition_logs_user_id_id_key"),
        ForeignKeyConstraint(
            ["user_id", "cloned_from_log_id"],
            ["nutrition_logs.user_id", "nutrition_logs.id"],
            name="nutrition_logs_user_cloned_from_fk",
        ),
        Index("ix_nutrition_logs_user_date", "user_id", "log_date"),
    )

    id: Mapped[uuid.UUID] = uuid_pk()
    user_id: Mapped[uuid.UUID] = user_id_col()
    log_date: Mapped[date] = mapped_column(Date, nullable=False)
    cloned_from_log_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True))
    notes: Mapped[str | None] = mapped_column(String(500))
    client_id: Mapped[str | None] = mapped_column(String(120))
    synced_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    local_version: Mapped[int] = mapped_column(nullable=False, default=1)

    entries: Mapped[list[NutritionLogEntry]] = relationship(
        back_populates="log", cascade="all, delete-orphan"
    )


class NutritionLogEntry(TimestampMixin, Base):
    """Food line item with denormalized nutrients for immutable daily logging."""

    __tablename__ = "nutrition_log_entries"
    __table_args__ = (
        CheckConstraint("amount_g BETWEEN 0.1 AND 10000", name="ck_nutrition_entry_amount_g"),
        CheckConstraint("calories >= 0", name="ck_nutrition_entry_calories"),
        CheckConstraint("protein_g >= 0", name="ck_nutrition_entry_protein"),
        CheckConstraint("carbs_g >= 0", name="ck_nutrition_entry_carbs"),
        CheckConstraint("fat_g >= 0", name="ck_nutrition_entry_fat"),
        ForeignKeyConstraint(
            ["user_id", "log_id"],
            ["nutrition_logs.user_id", "nutrition_logs.id"],
            ondelete="CASCADE",
            name="nutrition_log_entries_user_log_fk",
        ),
        ForeignKeyConstraint(
            ["user_id", "base_meal_id"],
            ["base_meals.user_id", "base_meals.id"],
            name="nutrition_log_entries_user_base_meal_fk",
        ),
        Index("ix_nutrition_entries_user_log", "user_id", "log_id"),
        Index("ix_nutrition_entries_log_slot", "log_id", "meal_slot"),
    )

    id: Mapped[uuid.UUID] = uuid_pk()
    user_id: Mapped[uuid.UUID] = user_id_col()
    log_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    food_item_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("food_items.id"))
    base_meal_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True))
    meal_slot: Mapped[str] = mapped_column(String(32), nullable=False)
    amount_g: Mapped[Decimal] = mapped_column(Numeric(8, 2), nullable=False)
    entry_time: Mapped[time | None] = mapped_column(Time)
    calories: Mapped[Decimal] = mapped_column(Numeric(8, 2), nullable=False)
    protein_g: Mapped[Decimal] = mapped_column(Numeric(7, 2), nullable=False)
    carbs_g: Mapped[Decimal] = mapped_column(Numeric(7, 2), nullable=False)
    fat_g: Mapped[Decimal] = mapped_column(Numeric(7, 2), nullable=False)
    fiber_g: Mapped[Decimal | None] = mapped_column(Numeric(6, 2))
    sugar_g: Mapped[Decimal | None] = mapped_column(Numeric(6, 2))
    sodium_mg: Mapped[Decimal | None] = mapped_column(Numeric(7, 2))
    saturated_fat_g: Mapped[Decimal | None] = mapped_column(Numeric(6, 2))
    trans_fat_g: Mapped[Decimal | None] = mapped_column(Numeric(6, 2))
    client_id: Mapped[str | None] = mapped_column(String(120))
    synced_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    local_version: Mapped[int] = mapped_column(nullable=False, default=1)

    log: Mapped[NutritionLog] = relationship(back_populates="entries")


class NutritionTarget(TimestampMixin, Base):
    """Daily macro target generated by the hypertrophy service."""

    __tablename__ = "nutrition_targets"
    __table_args__ = (
        CheckConstraint("calories_target BETWEEN 900 AND 7000", name="ck_nutrition_target_calories"),
        CheckConstraint("protein_g_target BETWEEN 20 AND 400", name="ck_nutrition_target_protein"),
        CheckConstraint("carbs_g_target BETWEEN 0 AND 900", name="ck_nutrition_target_carbs"),
        CheckConstraint("fat_g_target BETWEEN 20 AND 250", name="ck_nutrition_target_fat"),
        UniqueConstraint("user_id", "effective_date", name="uq_nutrition_targets_user_date"),
        Index("ix_nutrition_targets_user_date", "user_id", "effective_date"),
    )

    id: Mapped[uuid.UUID] = uuid_pk()
    user_id: Mapped[uuid.UUID] = user_id_col()
    effective_date: Mapped[date] = mapped_column(Date, nullable=False)
    calories_target: Mapped[int] = mapped_column(nullable=False)
    protein_g_target: Mapped[Decimal] = mapped_column(Numeric(6, 2), nullable=False)
    carbs_g_target: Mapped[Decimal] = mapped_column(Numeric(6, 2), nullable=False)
    fat_g_target: Mapped[Decimal] = mapped_column(Numeric(6, 2), nullable=False)
    fiber_g_min: Mapped[Decimal | None] = mapped_column(Numeric(6, 2))
    sugar_g_max: Mapped[Decimal | None] = mapped_column(Numeric(6, 2))
    sodium_mg_max: Mapped[Decimal | None] = mapped_column(Numeric(7, 2))
    saturated_fat_g_max: Mapped[Decimal | None] = mapped_column(Numeric(6, 2))
    trans_fat_g_max: Mapped[Decimal] = mapped_column(Numeric(6, 2), nullable=False, default=2.0)
