"""Training and workout persistence models."""

from __future__ import annotations

import uuid
from datetime import datetime
from decimal import Decimal

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    ForeignKey,
    ForeignKeyConstraint,
    Index,
    Numeric,
    String,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import ARRAY, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base
from app.models.common import TimestampMixin, user_id_col, uuid_pk


class MuscleGroup(Base):
    """Canonical muscle group used for weekly volume accounting."""

    __tablename__ = "muscle_groups"
    __table_args__ = (
        CheckConstraint("body_region IN ('upper_body', 'lower_body', 'core')", name="ck_muscle_groups_region"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    code: Mapped[str] = mapped_column(String(40), unique=True, nullable=False)
    body_region: Mapped[str] = mapped_column(String(24), nullable=False)


class Exercise(Base):
    """Canonical exercise catalog entry."""

    __tablename__ = "exercises"
    __table_args__ = (
        CheckConstraint("joint_complexity IS NULL OR joint_complexity BETWEEN 1 AND 3", name="ck_exercises_joint_complexity"),
    )

    id: Mapped[uuid.UUID] = uuid_pk()
    canonical_name: Mapped[str] = mapped_column(String(160), unique=True, nullable=False)
    equipment_type: Mapped[str | None] = mapped_column(String(32))
    movement_pattern: Mapped[str | None] = mapped_column(String(32))
    primary_muscle_group: Mapped[int | None] = mapped_column(ForeignKey("muscle_groups.id"))
    joint_complexity: Mapped[int | None]
    allows_quad_focus: Mapped[bool] = mapped_column(nullable=False, default=False)
    allows_glute_focus: Mapped[bool] = mapped_column(nullable=False, default=False)
    is_bilateral: Mapped[bool] = mapped_column(nullable=False, default=True)
    requires_spotter: Mapped[bool] = mapped_column(nullable=False, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)


class ExerciseVariant(Base):
    """Biomechanical variant for an exercise."""

    __tablename__ = "exercise_variants"
    __table_args__ = (
        UniqueConstraint("exercise_id", "variant_key", name="exercise_variants_exercise_variant_key"),
    )

    id: Mapped[uuid.UUID] = uuid_pk()
    exercise_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("exercises.id", ondelete="CASCADE"), nullable=False
    )
    variant_key: Mapped[str] = mapped_column(String(80), nullable=False)
    knee_travel_past_toe: Mapped[bool | None]
    shin_angle_target_deg: Mapped[Decimal | None] = mapped_column(Numeric(4, 1))
    hip_hinge_depth_desc: Mapped[str | None] = mapped_column(String(24))
    torso_lean_target_deg: Mapped[Decimal | None] = mapped_column(Numeric(4, 1))
    stance_width_modifier: Mapped[str | None] = mapped_column(String(24))
    foot_elevation_mm: Mapped[int] = mapped_column(nullable=False, default=0)


class ExerciseTranslation(Base):
    """Localized exercise copy."""

    __tablename__ = "exercise_translations"
    __table_args__ = (
        UniqueConstraint("exercise_id", "locale", name="exercise_translations_exercise_locale_key"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    exercise_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("exercises.id", ondelete="CASCADE"), nullable=False
    )
    locale: Mapped[str] = mapped_column(String(12), nullable=False)
    display_name: Mapped[str] = mapped_column(String(160), nullable=False)
    description: Mapped[str | None] = mapped_column(String(1000))
    execution_cues: Mapped[list[str] | None] = mapped_column(ARRAY(String))


class ExerciseVariantTranslation(Base):
    """Localized exercise variant setup copy."""

    __tablename__ = "exercise_variant_translations"
    __table_args__ = (
        UniqueConstraint("variant_id", "locale", name="exercise_variant_translations_variant_locale_key"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    variant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("exercise_variants.id", ondelete="CASCADE"), nullable=False
    )
    locale: Mapped[str] = mapped_column(String(12), nullable=False)
    display_name: Mapped[str] = mapped_column(String(160), nullable=False)
    setup_cues: Mapped[list[str] | None] = mapped_column(ARRAY(String))


class MuscleGroupTranslation(Base):
    """Localized muscle group display copy."""

    __tablename__ = "muscle_group_translations"
    __table_args__ = (
        UniqueConstraint("muscle_group_id", "locale", name="muscle_group_translations_group_locale_key"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    muscle_group_id: Mapped[int] = mapped_column(ForeignKey("muscle_groups.id", ondelete="CASCADE"), nullable=False)
    locale: Mapped[str] = mapped_column(String(12), nullable=False)
    display_name: Mapped[str] = mapped_column(String(120), nullable=False)


class TrainingPlan(TimestampMixin, Base):
    """Generated hypertrophy routine for a user."""

    __tablename__ = "training_plans"
    __table_args__ = (
        CheckConstraint("frequency_days BETWEEN 3 AND 6", name="ck_training_plans_frequency"),
        CheckConstraint("duration_weeks BETWEEN 4 AND 24", name="ck_training_plans_duration"),
        UniqueConstraint("user_id", "id", name="training_plans_user_id_id_key"),
        Index("ix_training_plans_user_active", "user_id", "is_active"),
    )

    id: Mapped[uuid.UUID] = uuid_pk()
    user_id: Mapped[uuid.UUID] = user_id_col()
    plan_name: Mapped[str] = mapped_column(String(140), nullable=False)
    frequency_days: Mapped[int] = mapped_column(nullable=False)
    duration_weeks: Mapped[int] = mapped_column(nullable=False, default=8)
    is_active: Mapped[bool] = mapped_column(nullable=False, default=True)

    sessions: Mapped[list[TrainingSession]] = relationship(
        back_populates="plan", cascade="all, delete-orphan"
    )


class TrainingSession(TimestampMixin, Base):
    """Day-level training session within a plan."""

    __tablename__ = "training_sessions"
    __table_args__ = (
        CheckConstraint("day_number BETWEEN 1 AND 7", name="ck_training_sessions_day_number"),
        CheckConstraint("prescribed_sets BETWEEN 1 AND 8", name="ck_training_sessions_prescribed_sets"),
        CheckConstraint("rir_target BETWEEN 0 AND 4", name="ck_training_sessions_rir_target"),
        UniqueConstraint("user_id", "plan_id", "day_number", name="uq_training_sessions_user_plan_day"),
        UniqueConstraint("user_id", "id", name="training_sessions_user_id_id_key"),
        ForeignKeyConstraint(
            ["user_id", "plan_id"],
            ["training_plans.user_id", "training_plans.id"],
            ondelete="CASCADE",
            name="training_sessions_user_plan_fk",
        ),
        Index("ix_training_sessions_user_day", "user_id", "day_number"),
        Index("ix_training_sessions_plan_day", "plan_id", "day_number"),
    )

    id: Mapped[uuid.UUID] = uuid_pk()
    user_id: Mapped[uuid.UUID] = user_id_col()
    plan_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    day_number: Mapped[int] = mapped_column(nullable=False)
    session_label: Mapped[str | None] = mapped_column(String(80))
    muscle_group_id: Mapped[int] = mapped_column(ForeignKey("muscle_groups.id"), nullable=False)
    prescribed_sets: Mapped[int] = mapped_column(nullable=False)
    rir_target: Mapped[int] = mapped_column(nullable=False)

    plan: Mapped[TrainingPlan] = relationship(back_populates="sessions")


class SessionExercise(Base):
    """Prescribed exercise slot inside a training session."""

    __tablename__ = "session_exercises"
    __table_args__ = (
        CheckConstraint("prescribed_sets BETWEEN 1 AND 8", name="ck_session_exercises_prescribed_sets"),
        CheckConstraint("rir_target IS NULL OR rir_target BETWEEN 0 AND 4", name="ck_session_exercises_rir_target"),
        ForeignKeyConstraint(
            ["user_id", "session_id"],
            ["training_sessions.user_id", "training_sessions.id"],
            ondelete="CASCADE",
            name="session_exercises_user_session_fk",
        ),
        Index("idx_session_exercises_user_session", "user_id", "session_id"),
    )

    id: Mapped[uuid.UUID] = uuid_pk()
    user_id: Mapped[uuid.UUID] = user_id_col()
    session_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    exercise_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("exercises.id"))
    variant_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("exercise_variants.id"))
    exercise_order: Mapped[int] = mapped_column(nullable=False)
    prescribed_sets: Mapped[int] = mapped_column(nullable=False)
    rep_range_min: Mapped[int | None]
    rep_range_max: Mapped[int | None]
    rir_target: Mapped[int | None]
    rest_seconds: Mapped[int] = mapped_column(nullable=False, default=120)
    weekly_set_contribution: Mapped[int] = mapped_column(nullable=False, default=1)


class WeeklyVolumeCap(Base):
    """User-scoped weekly set cap per muscle group."""

    __tablename__ = "weekly_volume_caps"
    __table_args__ = (
        CheckConstraint("total_sets <= cap_sets", name="weekly_volume_cap_check"),
        UniqueConstraint(
            "user_id",
            "plan_id",
            "muscle_group_id",
            "week_number",
            name="weekly_volume_caps_user_plan_muscle_week_key",
        ),
        ForeignKeyConstraint(
            ["user_id", "plan_id"],
            ["training_plans.user_id", "training_plans.id"],
            ondelete="CASCADE",
            name="weekly_volume_caps_user_plan_fk",
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[uuid.UUID] = user_id_col()
    plan_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    muscle_group_id: Mapped[int] = mapped_column(ForeignKey("muscle_groups.id"), nullable=False)
    week_number: Mapped[int] = mapped_column(nullable=False)
    total_sets: Mapped[int] = mapped_column(nullable=False, default=0)
    cap_sets: Mapped[int] = mapped_column(nullable=False, default=20)


class WorkoutLogSession(TimestampMixin, Base):
    """Executed workout session header."""

    __tablename__ = "workout_log_sessions"
    __table_args__ = (
        CheckConstraint("duration_seconds IS NULL OR duration_seconds BETWEEN 60 AND 21600", name="ck_workout_duration"),
        UniqueConstraint("user_id", "id", name="workout_log_sessions_user_id_id_key"),
        ForeignKeyConstraint(
            ["user_id", "training_session_id"],
            ["training_sessions.user_id", "training_sessions.id"],
            name="workout_log_sessions_user_training_session_fk",
        ),
        Index("ix_workout_log_sessions_user_started", "user_id", "started_at"),
    )

    id: Mapped[uuid.UUID] = uuid_pk()
    user_id: Mapped[uuid.UUID] = user_id_col()
    training_session_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True))
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    duration_seconds: Mapped[int | None]
    notes: Mapped[str | None] = mapped_column(String(1000))
    client_id: Mapped[str | None] = mapped_column(String(120))
    synced_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    local_version: Mapped[int] = mapped_column(nullable=False, default=1)

    sets: Mapped[list[WorkoutLogSet]] = relationship(
        back_populates="session", cascade="all, delete-orphan"
    )


class WorkoutLogSet(TimestampMixin, Base):
    """Executed set used for progression and effective volume analysis."""

    __tablename__ = "workout_log_sets"
    __table_args__ = (
        CheckConstraint("set_number BETWEEN 1 AND 20", name="ck_workout_sets_set_number"),
        CheckConstraint("reps_performed BETWEEN 1 AND 100", name="ck_workout_sets_reps"),
        CheckConstraint("weight_kg BETWEEN 0 AND 700", name="ck_workout_sets_weight"),
        CheckConstraint("rir_actual BETWEEN 0 AND 10", name="ck_workout_sets_rir"),
        ForeignKeyConstraint(
            ["user_id", "log_session_id"],
            ["workout_log_sessions.user_id", "workout_log_sessions.id"],
            ondelete="CASCADE",
            name="workout_log_sets_user_session_fk",
        ),
        Index("ix_workout_log_sets_user_session", "user_id", "log_session_id"),
        Index("ix_workout_log_sets_session", "log_session_id"),
    )

    id: Mapped[uuid.UUID] = uuid_pk()
    user_id: Mapped[uuid.UUID] = user_id_col()
    log_session_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    set_number: Mapped[int] = mapped_column(nullable=False)
    reps_performed: Mapped[int] = mapped_column(nullable=False)
    weight_kg: Mapped[Decimal] = mapped_column(Numeric(6, 2), nullable=False)
    rir_actual: Mapped[int] = mapped_column(nullable=False)
    rpe_actual: Mapped[Decimal | None] = mapped_column(Numeric(3, 1))
    technique_rating: Mapped[int | None]
    pain_flag: Mapped[bool] = mapped_column(nullable=False, default=False)
    client_id: Mapped[str | None] = mapped_column(String(120))
    synced_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    local_version: Mapped[int] = mapped_column(nullable=False, default=1)

    session: Mapped[WorkoutLogSession] = relationship(back_populates="sets")
