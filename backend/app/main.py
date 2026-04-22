from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware # Fundamental para conectar con Next.js
from pydantic import BaseModel
from datetime import date
from typing import List, Optional
import os
from supabase import create_client, Client
from dotenv import load_dotenv

# Cargar variables de entorno
load_dotenv()

app = FastAPI(title="BioAxis Nutrition Engine")

# --- 1. CONFIGURACIÓN DE SEGURIDAD (CORS) ---
# Esto permite que tu Frontend (puerto 3000) hable con tu Backend (puerto 8000)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- 2. CONEXIÓN A SUPABASE ---
url: str = os.environ.get("SUPABASE_URL")
key: str = os.environ.get("SUPABASE_ANON_KEY")
supabase: Client = create_client(url, key)

# --- 3. MODELOS DE DATOS (DEFINICIÓN DE CLASES) ---
# Definimos las clases AQUÍ ARRIBA para que las funciones de abajo las conozcan
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

# --- 4. ENDPOINTS (RUTAS) ---

@app.get("/nutrition/search")
async def search_food(query: str):
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
    print(f"🚀 Recibida petición para guardar: {log.food_id}") # Log para ver en terminal
    
    data = {
        "user_id": log.user_id,
        "food_id": log.food_id,
        "meal_slot": log.meal_slot,
        "quantity_g": log.quantity_g,
        "consumed_at": str(log.target_date)
    }
    
    # Intentamos la inserción
    result = supabase.table("nutrition_logs").insert(data).execute()
    
    # Verificamos si realmente se guardó algo
    if hasattr(result, 'data') and len(result.data) > 0:
        print("✅ Guardado con éxito en Supabase")
        return result.data[0]
    else:
        print("❌ Error: Supabase no devolvió datos del insert")
        raise HTTPException(status_code=500, detail="Error al insertar en la base de datos")

if __name__ == "__main__":
    import uvicorn
    # Iniciamos el servidor en el puerto 8000
    uvicorn.run(app, host="0.0.0.0", port=8000)