from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from datetime import date
from typing import List, Optional
import os
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="BioAxis Nutrition Engine")

# --- 1. CONFIGURACIÓN DE SEGURIDAD (CORS) ---
# Añadimos 127.0.0.1 por si el navegador resuelve localhost de esa forma
origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- 2. CONEXIÓN A SUPABASE ---
url: str = os.environ.get("SUPABASE_URL")
key: str = os.environ.get("SUPABASE_ANON_KEY")
supabase: Client = create_client(url, key)

# --- 3. MODELOS DE DATOS ---
class SyncRequest(BaseModel):
    user_id: str
    source_date: date
    target_date: date

class MealLog(BaseModel):
    user_id: str
    food_id: str
    meal_slot: str
    quantity_g: float
    target_date: date

# --- 4. ENDPOINTS ---

@app.get("/nutrition/search")
async def search_food(query: str):
    print(f"🔍 Buscando en Bio-Base: {query}")
    result = supabase.table("catalog_foods") \
        .select("*") \
        .ilike("name_es", f"%{query}%") \
        .execute()
    return result.data

@app.post("/nutrition/sync-day")
async def sync_nutrition_day(request: SyncRequest):
    query = supabase.table("nutrition_logs") \
        .select("*") \
        .eq("user_id", request.user_id) \
        .eq("consumed_at", str(request.source_date)) \
        .execute()

    if not query.data:
        raise HTTPException(status_code=404, detail="No hay comidas para copiar en esa fecha.")

    new_entries = []
    for item in query.data:
        new_entry = {
            "user_id": item["user_id"],
            "food_id": item["food_id"],
            "meal_slot": item["meal_slot"],
            "quantity_g": item["quantity_g"],
            "consumed_at": str(request.target_date)
        }
        new_entries.append(new_entry)

    result = supabase.table("nutrition_logs").insert(new_entries).execute()
    return {"status": "success", "copied_items": len(result.data)}

@app.post("/nutrition/add-log")
async def add_meal_log(log: MealLog):
    print(f"🚀 Registrando Bio-Alimento: {log.food_id} ({log.quantity_g}g)")
    
    data = {
        "user_id": log.user_id,
        "food_id": log.food_id,
        "meal_slot": log.meal_slot,
        "quantity_g": log.quantity_g,
        "consumed_at": str(log.target_date)
    }
    
    result = supabase.table("nutrition_logs").insert(data).execute()
    
    if hasattr(result, 'data') and len(result.data) > 0:
        print("✅ Guardado con éxito en Supabase")
        return result.data[0]
    else:
        print("❌ Error en la inserción")
        raise HTTPException(status_code=500, detail="Error al insertar en la base de datos")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)