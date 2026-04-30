from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from datetime import date
from typing import List, Optional
import os
from supabase import create_client, Client
from dotenv import load_dotenv


# --- BLOQUE DE DIAGNÓSTICO ---
# Buscamos la ruta absoluta al archivo .env en la misma carpeta que este script
env_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), '.env')

print(f"🔍 Intentando cargar configuración desde: {env_path}")

# Cargamos el archivo y guardamos si tuvo éxito
success = load_dotenv(env_path, override=True)

if success:
    print("✅ ¡Archivo .env cargado exitosamente!")
else:
    print("❌ ERROR: No se encontró el archivo .env o está vacío en esa ruta.")

# Verificamos las variables una por una
url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

print(f"📡 SUPABASE_URL detectada: {'SÍ' if url else 'NO (None)'}")
print(f"🔑 SERVICE_ROLE_KEY detectada: {'SÍ' if key else 'NO (None)'}")

if not url or not key:
    raise ValueError(f"Error crítico: Faltan variables en {env_path}. Revisa el contenido del archivo.")


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
key: str = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
if not key:
    raise ValueError("Falta la variable SUPABASE_SERVICE_ROLE_KEY en el archivo .env")
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

# --- 5. BIO-MOTOR MATEMÁTICO (V2.0 - Termodinámica Dinámica) ---

@app.get("/nutrition/targets/{user_id}")
async def get_bio_targets(user_id: str):
    
    print(f"⚙️ Sintetizando targets para Bio-ID: {user_id}")
    
    # 1. Recuperar biometría y directrices activas
    query = supabase.table("dim_atleta") \
        .select("genero, edad, peso, altura, objetivo_metabolico, dias_entrenamiento_semana") \
        .eq("user_id", user_id) \
        .eq("is_current", True) \
        .execute()

    if not query.data:
        # Fallback seguro
        return {"kcal": 2100, "protein": 160, "carbs": 220, "fat": 70}

    biometria = query.data[0]
    peso = float(biometria["peso"])
    altura = float(biometria["altura"])
    edad = int(biometria["edad"])
    genero = biometria["genero"].lower()
    
    # Nuevas variables extraídas de la DB
    objetivo = biometria.get("objetivo_metabolico", "mantenimiento")
    dias_entreno = int(biometria.get("dias_entrenamiento_semana", 3))

    # 2. Tasa Metabólica Basal (TMB) - Mifflin-St Jeor
    if genero == "hombre":
        tmb = (10 * peso) + (6.25 * altura) - (5 * edad) + 5
    else: # mujer
        tmb = (10 * peso) + (6.25 * altura) - (5 * edad) - 161

    # 3. Factor de Actividad Dinámico (Multiplicador de Harris-Benedict adaptado)
    factor_actividad = 1.2 # Sedentario por defecto
    if 1 <= dias_entreno <= 3:
        factor_actividad = 1.375 # Ligero
    elif 4 <= dias_entreno <= 5:
        factor_actividad = 1.55  # Moderado
    elif dias_entreno >= 6:
        factor_actividad = 1.725 # Intenso

    tdee = tmb * factor_actividad 

    # 4. Ajuste por Objetivo Metabólico (Termodinámica)
    delta_kcal = 0
    if objetivo == "deficit":
        delta_kcal = -500 # Oxidación lipídica segura (~0.5kg menos por semana)
        prot_multiplier = 2.4 # Aumentamos proteína para proteger músculo en déficit
    elif objetivo == "superavit":
        delta_kcal = 300  # Entorno anabólico limpio para hipertrofia
        prot_multiplier = 2.0 # En superávit, los carbos protegen el músculo, se necesita menos proteína
    else: # mantenimiento
        delta_kcal = 0
        prot_multiplier = 2.2 # Balance perfecto

    calorias_objetivo = tdee + delta_kcal

    # 5. Distribución de Macronutrientes (Bio-Sintetización)
    prot_target = peso * prot_multiplier
    fat_target = peso * 1.0 # 1g por kg asegura un perfil hormonal saludable
    
    # El resto de las calorías se asignan a los carbohidratos (Combustible)
    # Proteínas=4 kcal/g, Grasas=9 kcal/g, Carbos=4 kcal/g
    calorias_restantes = calorias_objetivo - (prot_target * 4) - (fat_target * 9)
    
    # Evitar carbos negativos en déficits extremos o errores de tipeo en peso
    carb_target = max(0, calorias_restantes / 4)

    return {
        "kcal": round(calorias_objetivo),
        "protein": round(prot_target),
        "carbs": round(carb_target),
        "fat": round(fat_target)
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)