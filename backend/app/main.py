import os
from datetime import date as date_type
from functools import lru_cache
from pathlib import Path

from dotenv import load_dotenv
from fastapi import Depends, FastAPI, Header, HTTPException, Query, Request, status
from fastapi.middleware.cors import CORSMiddleware
from supabase import Client, create_client

from app.schemas.biometric import (
    MobileAthleteProfile,
    MobileMeasurementCreateRequest,
    MobileProfileMeResponse,
    MobileProfileMutationResponse,
    MobileProfileSetupRequest,
)
from app.schemas.nutrition_api import (
    FoodSearchItem,
    JsonDate,
    MealLogRequest,
    MealLogResponse,
    NutritionDayLogsResponse,
    NutritionDayTotals,
    NutritionLogDeleteResponse,
    NutritionLogFoodItem,
    NutritionLogMutationResponse,
    NutritionLogUpdateRequest,
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


async def reject_client_user_id(request: Request) -> None:
    """Reject mobile contracts that try to provide ownership from the client."""

    if "user_id" in request.query_params:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="user_id is not accepted on this endpoint",
        )

    body = await request.body()
    if body and b"user_id" in body:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="user_id is not accepted on this endpoint",
        )


def _age_from_birth_date(birth_date: date_type) -> int:
    today = date_type.today()
    age = today.year - birth_date.year
    if (today.month, today.day) < (birth_date.month, birth_date.day):
        age -= 1
    return age


def _profile_float(row: dict, field: str) -> float | None:
    value = _optional_float(row.get(field))
    return value if value is not None else None


def build_mobile_athlete_profile(row: dict, *, display_name: str | None = None) -> MobileAthleteProfile:
    return MobileAthleteProfile(
        biometria_id=str(row.get("biometria_id")) if row.get("biometria_id") is not None else None,
        display_name=display_name,
        genero=row.get("genero"),
        edad=int(row["edad"]) if row.get("edad") is not None else None,
        peso=_profile_float(row, "peso"),
        altura=_profile_float(row, "altura"),
        hombros=_profile_float(row, "hombros"),
        pecho=_profile_float(row, "pecho"),
        brazo=_profile_float(row, "brazo"),
        antebrazo=_profile_float(row, "antebrazo"),
        cintura=_profile_float(row, "cintura"),
        cadera=_profile_float(row, "cadera"),
        gluteo=_profile_float(row, "gluteo"),
        pierna=_profile_float(row, "pierna"),
        pantorrilla=_profile_float(row, "pantorrilla"),
        objetivo_metabolico=row.get("objetivo_metabolico"),
        dias_entrenamiento_semana=(
            int(row["dias_entrenamiento_semana"])
            if row.get("dias_entrenamiento_semana") is not None
            else None
        ),
        is_current=bool(row.get("is_current", False)),
    )


def get_current_mobile_profile_row(current_user_id: str) -> dict | None:
    result = (
        supabase.table("dim_atleta")
        .select("*")
        .eq("user_id", current_user_id)
        .eq("is_current", True)
        .execute()
    )
    if not result.data:
        return None
    return result.data[0]


def get_profile_display_name(current_user_id: str) -> str | None:
    try:
        result = (
            supabase.table("user_profiles")
            .select("display_name")
            .eq("user_id", current_user_id)
            .execute()
        )
    except Exception:
        return None
    if not result.data:
        return None
    display_name = result.data[0].get("display_name")
    return str(display_name) if display_name else None


def replace_current_dim_atleta_profile(payload: dict, *, display_name: str | None = None) -> MobileAthleteProfile:
    try:
        rpc_payload = {
            key: value
            for key, value in payload.items()
            if key not in {"user_id", "is_current", "biometria_id", "valid_from", "valid_to", "created_at"}
        }
        result = (
            supabase.rpc(
                "replace_current_dim_atleta",
                {
                    "p_user_id": str(payload["user_id"]),
                    "p_profile": rpc_payload,
                },
            )
            .execute()
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not safely replace biometric profile",
        ) from exc

    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not safely replace biometric profile",
        )
    row = result.data[0] if isinstance(result.data, list) else result.data
    return build_mobile_athlete_profile(row, display_name=display_name)


def setup_payload_for_dim_atleta(
    *,
    request: MobileProfileSetupRequest,
    current_user_id: str,
) -> dict:
    payload = request.model_dump(exclude={"display_name", "fecha_nacimiento"}, exclude_none=True)
    payload["user_id"] = current_user_id
    payload["edad"] = request.edad if request.edad is not None else _age_from_birth_date(request.fecha_nacimiento)
    payload["is_current"] = True
    return payload


def measurement_payload_for_dim_atleta(
    *,
    current_row: dict,
    request: MobileMeasurementCreateRequest,
    current_user_id: str,
) -> dict:
    payload = {
        key: current_row.get(key)
        for key in (
            "genero",
            "edad",
            "altura",
            "hombros",
            "pecho",
            "brazo",
            "antebrazo",
            "cintura",
            "cadera",
            "gluteo",
            "pierna",
            "pantorrilla",
            "objetivo_metabolico",
            "dias_entrenamiento_semana",
        )
    }
    payload["peso"] = request.peso
    payload.update(request.model_dump(exclude_none=True))
    payload["user_id"] = current_user_id
    payload["is_current"] = True
    return payload


def calculate_nutrition_targets_for_user(current_user_id: str) -> NutritionTargetsResponse:
    query = (
        supabase.table("dim_atleta")
        .select("genero, edad, peso, altura, objetivo_metabolico, dias_entrenamiento_semana")
        .eq("user_id", current_user_id)
        .eq("is_current", True)
        .execute()
    )

    if not query.data:
        return NutritionTargetsResponse(kcal=2100, protein=160, carbs=220, fat=70)

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

    return NutritionTargetsResponse(
        kcal=target.calories,
        protein=target.protein_g,
        carbs=target.carbs_g,
        fat=target.fat_g,
    )


def _nutrition_float(value) -> float:
    parsed = _optional_float(value)
    return parsed if parsed is not None else 0.0


def _nutrition_meal_group(meal_slot: str) -> str:
    normalized = meal_slot.strip().lower()
    mapping = {
        "breakfast": "desayuno",
        "desayuno": "desayuno",
        "lunch": "comida",
        "comida": "comida",
        "dinner": "cena",
        "cena": "cena",
        "snack": "snacks",
        "snacks": "snacks",
    }
    return mapping.get(normalized, normalized or "snacks")


def build_nutrition_day_logs_response(
    *,
    log_date: JsonDate,
    rows: list[dict],
) -> NutritionDayLogsResponse:
    items: list[NutritionLogFoodItem] = []
    meals: dict[str, list[NutritionLogFoodItem]] = {
        "desayuno": [],
        "comida": [],
        "cena": [],
        "snacks": [],
    }
    totals = {"kcal": 0.0, "protein": 0.0, "carbs": 0.0, "fat": 0.0}

    for row in rows:
        food = row.get("catalog_foods") or {}
        quantity_g = _nutrition_float(row.get("quantity_g"))
        item = NutritionLogFoodItem(
            id=str(row.get("id")),
            food_id=str(row["food_id"]) if row.get("food_id") is not None else None,
            food_name=food.get("name_es"),
            meal_slot=str(row.get("meal_slot") or ""),
            quantity_g=quantity_g,
            consumed_at=row.get("consumed_at") or log_date,
            kcal=round(_nutrition_float(food.get("calories_per_g")) * quantity_g, 2),
            protein=round(_nutrition_float(food.get("protein_per_g")) * quantity_g, 2),
            carbs=round(_nutrition_float(food.get("carbs_per_g")) * quantity_g, 2),
            fat=round(_nutrition_float(food.get("fat_per_g")) * quantity_g, 2),
        )
        items.append(item)
        meals.setdefault(_nutrition_meal_group(item.meal_slot), []).append(item)
        totals["kcal"] += item.kcal
        totals["protein"] += item.protein
        totals["carbs"] += item.carbs
        totals["fat"] += item.fat

    return NutritionDayLogsResponse(
        date=log_date,
        items=items,
        totals=NutritionDayTotals(
            kcal=round(totals["kcal"], 2),
            protein=round(totals["protein"], 2),
            carbs=round(totals["carbs"], 2),
            fat=round(totals["fat"], 2),
        ),
        meals=meals,
    )


def build_nutrition_log_mutation_response(row: dict) -> NutritionLogMutationResponse:
    return NutritionLogMutationResponse(
        id=str(row.get("id")),
        food_id=str(row["food_id"]) if row.get("food_id") is not None else None,
        meal_slot=str(row.get("meal_slot") or ""),
        quantity_g=_nutrition_float(row.get("quantity_g")),
        consumed_at=row.get("consumed_at"),
    )


@app.get("/profile/me", response_model=MobileProfileMeResponse)
async def get_mobile_profile(
    current_user_id: str = Depends(get_current_user_id),
    _: None = Depends(reject_client_user_id),
):
    row = get_current_mobile_profile_row(current_user_id)
    if row is None:
        return MobileProfileMeResponse(status="empty", has_profile=False, profile=None)
    return MobileProfileMeResponse(
        status="ready",
        has_profile=True,
        profile=build_mobile_athlete_profile(
            row,
            display_name=get_profile_display_name(current_user_id),
        ),
    )


@app.post("/profile/setup", response_model=MobileProfileMutationResponse)
async def setup_mobile_profile(
    request: MobileProfileSetupRequest,
    current_user_id: str = Depends(get_current_user_id),
    _: None = Depends(reject_client_user_id),
):
    payload = setup_payload_for_dim_atleta(request=request, current_user_id=current_user_id)
    profile = replace_current_dim_atleta_profile(payload, display_name=request.display_name)
    return MobileProfileMutationResponse(status="success", profile=profile)


@app.post("/profile/measurements", response_model=MobileProfileMutationResponse)
async def create_mobile_measurement(
    request: MobileMeasurementCreateRequest,
    current_user_id: str = Depends(get_current_user_id),
    _: None = Depends(reject_client_user_id),
):
    current_row = get_current_mobile_profile_row(current_user_id)
    if current_row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Current biometric profile not found")
    payload = measurement_payload_for_dim_atleta(
        current_row=current_row,
        request=request,
        current_user_id=current_user_id,
    )
    profile = replace_current_dim_atleta_profile(payload)
    return MobileProfileMutationResponse(status="success", profile=profile)


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


@app.get("/nutrition/logs", response_model=NutritionDayLogsResponse)
async def get_nutrition_logs_for_day(
    date: JsonDate = Query(...),
    current_user_id: str = Depends(get_current_user_id),
    _: None = Depends(reject_client_user_id),
):
    result = (
        supabase.table("nutrition_logs")
        .select(
            """
            id,
            food_id,
            meal_slot,
            quantity_g,
            consumed_at,
            catalog_foods (
                name_es,
                calories_per_g,
                protein_per_g,
                carbs_per_g,
                fat_per_g
            )
            """
        )
        .eq("user_id", current_user_id)
        .eq("consumed_at", str(date))
        .execute()
    )
    return build_nutrition_day_logs_response(log_date=date, rows=result.data or [])


@app.patch("/nutrition/logs/{log_id}", response_model=NutritionLogMutationResponse)
async def update_nutrition_log(
    log_id: str,
    request: NutritionLogUpdateRequest,
    current_user_id: str = Depends(get_current_user_id),
    _: None = Depends(reject_client_user_id),
):
    update_data = {}
    if request.meal_slot is not None:
        update_data["meal_slot"] = request.meal_slot
    if request.quantity_g is not None:
        update_data["quantity_g"] = request.quantity_g
    next_date = request.consumed_at or request.target_date
    if next_date is not None:
        update_data["consumed_at"] = str(next_date)

    result = (
        supabase.table("nutrition_logs")
        .update(update_data)
        .eq("id", log_id)
        .eq("user_id", current_user_id)
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Nutrition log not found")
    return build_nutrition_log_mutation_response(result.data[0])


@app.delete("/nutrition/logs/{log_id}", response_model=NutritionLogDeleteResponse)
async def delete_nutrition_log(
    log_id: str,
    current_user_id: str = Depends(get_current_user_id),
    _: None = Depends(reject_client_user_id),
):
    result = (
        supabase.table("nutrition_logs")
        .delete()
        .eq("id", log_id)
        .eq("user_id", current_user_id)
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Nutrition log not found")
    return NutritionLogDeleteResponse(status="success", deleted_id=log_id)


@app.get("/nutrition/targets/me", response_model=NutritionTargetsResponse)
async def get_my_bio_targets(
    current_user_id: str = Depends(get_current_user_id),
    _: None = Depends(reject_client_user_id),
):
    return calculate_nutrition_targets_for_user(current_user_id)


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

    return calculate_nutrition_targets_for_user(current_user_id)


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
