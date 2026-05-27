import os
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
from app.services.hypertrophy_engine import HypertrophyEngineService, UserBiometrics


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


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
