import os
from functools import lru_cache
from pathlib import Path

from dotenv import load_dotenv
from fastapi import Depends, FastAPI, Header, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from supabase import Client, create_client

from app.schemas.nutrition_api import (
    FoodSearchItem,
    MealLogRequest,
    MealLogResponse,
    NutritionTargetsResponse,
    SyncNutritionDayRequest,
    SyncNutritionDayResponse,
)
from app.schemas.kalos_training import (
    KalosAnthropometricBuckets,
    KalosExerciseSubstitutionRequest,
    KalosExerciseSubstitutionResponse,
    KalosTrainingPlanRequest,
    KalosTrainingPlanResponse,
)
from app.services.hypertrophy_engine import HypertrophyEngineService, UserBiometrics
from app.services.kalos_training_engine import (
    KalosTrainingEngine,
    KalosTrainingEngineError,
    load_kalos_catalog_csv,
)


load_dotenv(Path(__file__).resolve().parents[1] / ".env")

app = FastAPI(title="BioAxis Nutrition Engine")

origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:4173",
    "http://127.0.0.1:4173",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
if not url or not key:
    raise RuntimeError("Supabase backend credentials are not configured")
supabase: Client = create_client(url, key)


KALOS_CATALOG_PATH = (
    Path(__file__).resolve().parents[2]
    / "docs"
    / "training-data"
    / "kalos_exercise_taxonomy_seed.csv"
)


@lru_cache(maxsize=1)
def get_kalos_training_engine() -> KalosTrainingEngine:
    return KalosTrainingEngine(load_kalos_catalog_csv(KALOS_CATALOG_PATH))


def get_current_athlete_biometrics(current_user_id: str) -> dict | None:
    result = (
        supabase.table("dim_atleta")
        .select("genero, peso, altura, hombros, cintura, cadera, gluteo")
        .eq("user_id", current_user_id)
        .eq("is_current", True)
        .execute()
    )
    if not result.data:
        return None
    return result.data[0]


def derive_kalos_biometric_context(row: dict) -> tuple[str, KalosAnthropometricBuckets]:
    genero = str(row.get("genero") or "").lower()
    sex_reference = "male" if genero == "hombre" else "female" if genero == "mujer" else "neutral"
    height = _optional_float(row.get("altura"))
    weight = _optional_float(row.get("peso"))
    waist = _optional_float(row.get("cintura"))
    shoulders = _optional_float(row.get("hombros"))
    hips = _optional_float(row.get("cadera"))
    glutes = _optional_float(row.get("gluteo"))
    bmi = weight / ((height / 100) ** 2) if height and weight else None

    ratio_type = "none"
    ratio_gap_bucket = "unknown"
    if sex_reference == "male" and shoulders and waist:
        ratio_type = "golden_ratio"
        ratio_gap_bucket = _ratio_gap_bucket((shoulders / waist), target=1.55)
    elif sex_reference == "female" and waist and (hips or glutes):
        ratio_type = "hourglass_ratio"
        ratio_gap_bucket = _female_ratio_gap_bucket(
            hip_to_waist=(hips / waist) if hips else None,
            glute_to_waist=(glutes / waist) if glutes else None,
        )
    elif sex_reference != "neutral":
        ratio_gap_bucket = "unknown"

    return sex_reference, KalosAnthropometricBuckets(
        height_bucket_cm=_height_bucket(height),
        weight_bucket_kg=_weight_bucket(weight),
        bmi_bucket=_bmi_bucket(bmi),
        ratio_type=ratio_type,
        ratio_gap_bucket=ratio_gap_bucket,
    )


def apply_db_biometric_context(
    request: KalosTrainingPlanRequest,
    current_user_id: str,
) -> KalosTrainingPlanRequest:
    biometrics = get_current_athlete_biometrics(current_user_id)
    if not biometrics:
        return request
    sex_reference, buckets = derive_kalos_biometric_context(biometrics)
    return request.model_copy(
        update={
            "sex_reference": sex_reference,
            "anthropometric_buckets": buckets,
        }
    )


def _optional_float(value) -> float | None:
    if value is None:
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _ratio_gap_bucket(actual_ratio: float, *, target: float) -> str:
    gap = max(0.0, target - actual_ratio)
    if gap < 0.05:
        return "low"
    if gap < 0.12:
        return "moderate"
    if gap < 0.2:
        return "high"
    return "very_high"


def _female_ratio_gap_bucket(
    *,
    hip_to_waist: float | None,
    glute_to_waist: float | None,
) -> str:
    buckets = []
    if hip_to_waist is not None:
        buckets.append(_ratio_gap_bucket(hip_to_waist, target=1.35))
    if glute_to_waist is not None:
        buckets.append(_ratio_gap_bucket(glute_to_waist, target=1.45))
    if not buckets:
        return "unknown"
    severity = {"unknown": 0, "low": 1, "moderate": 2, "high": 3, "very_high": 4}
    return max(buckets, key=lambda bucket: severity[bucket])


def _height_bucket(height: float | None) -> str | None:
    if height is None:
        return None
    if height < 160:
        return "short"
    if height <= 185:
        return "average"
    return "tall"


def _weight_bucket(weight: float | None) -> str | None:
    if weight is None:
        return None
    if weight < 60:
        return "light"
    if weight <= 90:
        return "average"
    return "heavy"


def _bmi_bucket(bmi: float | None) -> str | None:
    if bmi is None:
        return None
    if bmi < 18.5:
        return "underweight"
    if bmi < 25:
        return "normal"
    if bmi < 30:
        return "overweight"
    return "obese"


def get_current_user_id(authorization: str | None = Header(default=None)) -> str:
    """Resolve the caller from Supabase Auth before using service-role queries."""

    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing bearer token",
        )
    scheme, _, token = authorization.partition(" ")
    if scheme.lower() != "bearer" or not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid bearer token",
        )

    try:
        auth_response = supabase.auth.get_user(token)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid bearer token",
        ) from exc

    user = getattr(auth_response, "user", None)
    user_id = getattr(user, "id", None)
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid bearer token",
        )
    return str(user_id)


@app.get("/nutrition/search", response_model=list[FoodSearchItem])
async def search_food(
    query: str,
    current_user_id: str = Depends(get_current_user_id),
):
    _ = current_user_id
    result = (
        supabase.table("catalog_foods")
        .select("*")
        .ilike("name_es", f"%{query}%")
        .execute()
    )
    return result.data


@app.post("/nutrition/sync-day", response_model=SyncNutritionDayResponse)
async def sync_nutrition_day(
    request: SyncNutritionDayRequest,
    current_user_id: str = Depends(get_current_user_id),
):
    query = (
        supabase.table("nutrition_logs")
        .select("*")
        .eq("user_id", current_user_id)
        .eq("consumed_at", str(request.source_date))
        .execute()
    )

    if not query.data:
        raise HTTPException(status_code=404, detail="No hay comidas para copiar en esa fecha.")

    new_entries = []
    for item in query.data:
        new_entries.append(
            {
                "user_id": current_user_id,
                "food_id": item["food_id"],
                "meal_slot": item["meal_slot"],
                "quantity_g": item["quantity_g"],
                "consumed_at": str(request.target_date),
            }
        )

    result = supabase.table("nutrition_logs").insert(new_entries).execute()
    return {"status": "success", "copied_items": len(result.data)}


@app.post("/nutrition/add-log", response_model=MealLogResponse)
async def add_meal_log(
    log: MealLogRequest,
    current_user_id: str = Depends(get_current_user_id),
):
    data = {
        "user_id": current_user_id,
        "food_id": log.food_id,
        "meal_slot": log.meal_slot,
        "quantity_g": log.quantity_g,
        "consumed_at": str(log.target_date),
    }

    result = supabase.table("nutrition_logs").insert(data).execute()

    if hasattr(result, "data") and len(result.data) > 0:
        return result.data[0]
    raise HTTPException(status_code=500, detail="Error al insertar en la base de datos")


@app.get("/nutrition/targets/{user_id}", response_model=NutritionTargetsResponse)
async def get_bio_targets(
    user_id: str,
    current_user_id: str = Depends(get_current_user_id),
):
    if user_id != current_user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Authenticated user cannot access another user's nutrition targets",
        )

    query = (
        supabase.table("dim_atleta")
        .select("genero, edad, peso, altura, objetivo_metabolico, dias_entrenamiento_semana")
        .eq("user_id", current_user_id)
        .eq("is_current", True)
        .execute()
    )

    if not query.data:
        return {"kcal": 2100, "protein": 160, "carbs": 220, "fat": 70}

    biometria = query.data[0]
    genero = biometria["genero"].lower()
    biological_sex = "male" if genero == "hombre" else "female"
    target = HypertrophyEngineService().calculate_macro_targets(
        UserBiometrics(
            weight_kg=float(biometria["peso"]),
            height_cm=float(biometria["altura"]),
            age_years=int(biometria["edad"]),
            biological_sex=biological_sex,
            metabolic_goal=biometria.get("objetivo_metabolico", "maintenance"),
            training_days_per_week=int(biometria.get("dias_entrenamiento_semana", 3)),
        )
    )

    return {
        "kcal": target.calories,
        "protein": target.protein_g,
        "carbs": target.carbs_g,
        "fat": target.fat_g,
    }


@app.post("/training/kalos/preview", response_model=KalosTrainingPlanResponse)
async def preview_kalos_training_plan(
    request: KalosTrainingPlanRequest,
    current_user_id: str = Depends(get_current_user_id),
    engine: KalosTrainingEngine = Depends(get_kalos_training_engine),
):
    request = apply_db_biometric_context(request, current_user_id)
    try:
        return engine.generate(request)
    except KalosTrainingEngineError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={
                "code": exc.code,
                "message": exc.message,
                "validation_errors": list(exc.validation_errors),
            },
        ) from exc


@app.post("/training/kalos/substitute", response_model=KalosExerciseSubstitutionResponse)
async def substitute_kalos_training_exercise(
    request: KalosExerciseSubstitutionRequest,
    current_user_id: str = Depends(get_current_user_id),
    engine: KalosTrainingEngine = Depends(get_kalos_training_engine),
):
    _ = current_user_id
    try:
        return engine.substitute_exercise(request)
    except KalosTrainingEngineError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={
                "code": exc.code,
                "message": exc.message,
                "validation_errors": list(exc.validation_errors),
            },
        ) from exc


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
